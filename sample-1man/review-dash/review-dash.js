(() => {
  "use strict";

  const MANIFEST_URL = "../sushi-samples/manifest.json?v=review-1";
  const STATUS_URL = "../sushi-samples/_materials/STATUS.md";

  const el = {
    frame: document.getElementById("preview-frame"),
    wrap: document.getElementById("frame-wrap"),
    stage: document.getElementById("stage"),
    progress: document.getElementById("progress"),
    label: document.getElementById("current-label"),
    status: document.getElementById("status-line"),
    prev: document.getElementById("btn-prev"),
    next: document.getElementById("btn-next"),
    reload: document.getElementById("btn-reload"),
    approve: document.getElementById("btn-approve"),
    reject: document.getElementById("btn-reject"),
    modeRead: document.getElementById("btn-mode-read"),
    modeCapture: document.getElementById("btn-mode-capture"),
    ngModal: document.getElementById("ng-modal"),
    ngNote: document.getElementById("ng-note"),
    ngCancel: document.getElementById("ng-cancel"),
    ngSubmit: document.getElementById("ng-submit")
  };

  let samples = [];
  let index = 0;
  let frameReady = false;
  let busy = false;
  /** "read" = 文字確認（実寸） / "capture" = 全体撮影用縮小 */
  let viewMode = "read";
  let lastPreviewHeight = 2400;
  const approved = new Set();
  const rejected = new Set();
  const needsFix = new Set();

  const REASON_LABELS = {
    contrast: "文字が溶けて読めない（色）",
    photo: "写真が業種・世界観と合わない",
    layout: "レイアウト／隙間が気持ち悪い",
    copy: "文章が薄い／業種ずれ",
    other: "その他"
  };
  function setStatus(msg) {
    el.status.textContent = msg || "";
  }

  function folderOf(sample) {
    return (sample.draftPath || "").split("/")[0];
  }

  function syncModeButtons() {
    if (el.modeRead) el.modeRead.classList.toggle("is-on", viewMode === "read");
    if (el.modeCapture) el.modeCapture.classList.toggle("is-on", viewMode === "capture");
    document.body.classList.toggle("view-read", viewMode === "read");
    document.body.classList.toggle("view-capture", viewMode === "capture");
  }

  function setViewMode(mode) {
    viewMode = mode === "capture" ? "capture" : "read";
    syncModeButtons();
    scaleFrame(lastPreviewHeight, { force: true });
    if (viewMode === "read") {
      setStatus("確認モード: 文字が読める実寸。横・縦にスクロールしてください。");
    } else {
      setStatus("撮影モード: 全体が画面に収まる縮小表示（承認スクショ用）。");
    }
  }

  function updateChrome() {
    const s = samples[index];
    const done = approved.size;
    el.progress.textContent = "承認 " + done + " / 候補 " + samples.length;
    if (!s) {
      el.label.textContent = "候補なし";
      el.label.removeAttribute("title");
      return;
    }
    const folder = folderOf(s);
    const mark = approved.has(folder)
      ? " [承認済]"
      : needsFix.has(folder)
        ? " [要修正]"
        : rejected.has(folder)
          ? " [本NG]"
          : "";
    const labelText =
      "No." +
      s.id +
      " " +
      folder +
      " / " +
      (s.blurb || "") +
      mark;
    el.label.textContent = labelText;
    el.label.title = labelText;
    el.prev.disabled = index <= 0 || busy;
    el.next.disabled = index >= samples.length - 1 || busy;
    el.approve.disabled = busy || !frameReady;
    el.reject.disabled = busy || !frameReady;
    el.reload.disabled = busy || !frameReady;
  }

  function stageSizeKey(stage) {
    return Math.round(stage.clientWidth) + "x" + Math.round(stage.clientHeight);
  }

  function scaleFrame(previewHeight, opts) {
    const force = !!(opts && opts.force);
    /* フッター下に空きを作らない。内容高さぴったり */
    const h = Math.max(1, Math.ceil(Number(previewHeight) || 0));
    const stage = el.stage || el.wrap.parentElement;

    if (viewMode === "read") {
      lastPreviewHeight = h;
      el.wrap.style.transform = "none";
      el.wrap.style.height = "";
      el.wrap.style.width = "1200px";
      el.wrap.style.marginLeft = "";
      el.wrap.style.marginRight = "";
      /* +8px: 端数で内側に棒が出て外と奪い合いになるのを防ぐ */
      el.frame.style.height = h + 8 + "px";
      delete el.wrap.dataset.scaledFor;
      delete el.wrap.dataset.scaledStage;
      delete el.wrap.dataset.scaledScale;
      return;
    }

    /* 撮影モード: 縮尺の微小再計算がプルプルの主因。整数px＋閾値で止める */
    el.frame.style.height = h + "px";
    const availW = Math.max(320, stage.clientWidth - 24);
    const availH = Math.max(320, stage.clientHeight - 16);
    let scale = Math.min(1, availW / 1200, availH / h);
    /* 0.001刻みに丸める（長い小数の張り直しを防ぐ） */
    scale = Math.floor(scale * 1000 + 1e-9) / 1000;
    if (scale < 0.05) scale = 0.05;

    const wrapH = Math.max(1, Math.round(h * scale));
    const wrapW = Math.max(1, Math.round(1200 * scale));
    const prevScale = Number(el.wrap.dataset.scaledScale || 0);
    const prevH = Number(el.wrap.dataset.scaledFor || 0);
    const prevStage = el.wrap.dataset.scaledStage || "";
    const stageKey = stageSizeKey(stage);

    if (
      !force &&
      el.frame.style.height &&
      Math.abs(h - prevH) < 4 &&
      Math.abs(scale - prevScale) < 0.002 &&
      prevStage === stageKey
    ) {
      lastPreviewHeight = h;
      return;
    }

    lastPreviewHeight = h;
    el.wrap.style.transform = "scale(" + scale + ")";
    el.wrap.style.height = wrapH + "px";
    el.wrap.style.width = wrapW + "px";
    el.wrap.dataset.scaledFor = String(h);
    el.wrap.dataset.scaledStage = stageKey;
    el.wrap.dataset.scaledScale = String(scale);
  }

  function waitMessage(type, timeoutMs) {
    return new Promise(function (resolve, reject) {
      const t = setTimeout(function () {
        window.removeEventListener("message", onMsg);
        reject(new Error("timeout:" + type));
      }, timeoutMs || 20000);
      function onMsg(ev) {
        if (!ev.data || ev.data.type !== type) return;
        clearTimeout(t);
        window.removeEventListener("message", onMsg);
        resolve(ev.data);
      }
      window.addEventListener("message", onMsg);
    });
  }

  function pingFrame() {
    return new Promise(function (resolve) {
      const onMsg = function (ev) {
        if (ev.data && ev.data.type === "sample1man-pong") {
          window.removeEventListener("message", onMsg);
          resolve(true);
        }
      };
      window.addEventListener("message", onMsg);
      try {
        el.frame.contentWindow.postMessage({ type: "sample1man-ping" }, "*");
      } catch (e) {
        window.removeEventListener("message", onMsg);
        resolve(false);
      }
      setTimeout(function () {
        window.removeEventListener("message", onMsg);
        resolve(false);
      }, 800);
    });
  }

  async function ensureFrameReady() {
    for (let i = 0; i < 40; i++) {
      if (await pingFrame()) {
        frameReady = true;
        return true;
      }
      await new Promise(function (r) {
        setTimeout(r, 150);
      });
    }
    frameReady = false;
    return false;
  }

  async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error("fetch-fail " + url + " " + res.status);
    return res.json();
  }

  async function buildDraft(sample) {
    const folder = folderOf(sample);
    const draft = await fetchJson("../sushi-samples/" + folder + "/draft.json?v=" + Date.now());
    let meta = null;
    let copy = null;
    try {
      meta = await fetchJson("../sushi-samples/_materials/" + folder + "/meta.json?v=" + Date.now());
    } catch (e) {
      /* optional */
    }
    try {
      copy = await fetchJson("../sushi-samples/_materials/" + folder + "/copy.json?v=" + Date.now());
    } catch (e) {
      /* optional */
    }
    if (meta) {
      /* draft が正（密化後）。meta は欠け補完のみ。上書きしない */
      if (!draft.layoutPattern && meta.layoutPattern) draft.layoutPattern = meta.layoutPattern;
      if (!(Array.isArray(draft.layoutOrder) && draft.layoutOrder.length) && meta.layoutOrder) {
        draft.layoutOrder = meta.layoutOrder;
      }
      if (!draft.draftCounts && meta.counts) draft.draftCounts = meta.counts;
      if (meta.fonts && !draft.fonts) draft.fonts = meta.fonts;
      else if (meta.fonts && draft.fonts) {
        draft.fonts = Object.assign({}, meta.fonts, draft.fonts);
      }
      if (meta.colorKey && !draft.chosenPresetKey) draft.chosenPresetKey = meta.colorKey;
      if (meta.extras) {
        draft.draftExtras = Object.assign(
          { hours: false, access: false, address: false },
          meta.extras,
          draft.draftExtras || {}
        );
      }
      draft.sushiSampleId = meta.id || draft.sushiSampleId;
      draft.sushiSampleKey = (folder.split("-").slice(1).join("-")) || draft.sushiSampleKey;
    }
    if (copy && typeof copy === "object") {
      draft.fields = draft.fields || {};
      Object.keys(copy).forEach(function (k) {
        if (k === "note") return;
        if (copy[k] == null || String(copy[k]).trim() === "") return;
        const cur = draft.fields[k];
        /* draft 優先。copy は空欄補完のみ */
        if (cur == null || String(cur).trim() === "") draft.fields[k] = copy[k];
      });
      if (copy.brand_name && (!draft.fields.brand_name || !String(draft.fields.brand_name).trim())) {
        draft.fields.brand_name = copy.brand_name;
        if (!draft.fields.hero_title) draft.fields.hero_title = copy.brand_name;
      }
    }
    const slots = (meta && meta.imageSlots) || [];
    const pathMap = {
      "hero.jpg": "hero_image",
      "about-01.jpg": "about_image_1",
      "about-02.jpg": "about_image_2",
      "about-03.jpg": "about_image_3",
      "about-04.jpg": "about_image_4",
      "work-01.jpg": "work_1_image",
      "work-02.jpg": "work_2_image",
      "work-03.jpg": "work_3_image"
    };
    draft.imagePaths = draft.imagePaths || {};
    slots.forEach(function (slot) {
      const field = pathMap[slot];
      if (!field) return;
      draft.imagePaths[field] =
        "sushi-samples/" + folder + "/images/" + slot + "?v=" + Date.now();
    });
    return { folder: folder, draft: draft, meta: meta };
  }

  async function applyCurrent() {
    if (busy) return;
    const sample = samples[index];
    if (!sample) return;
    busy = true;
    updateChrome();
    setStatus("読み込み中…");
    try {
      if (!(await ensureFrameReady())) {
        throw new Error("プレビュー枠の準備ができていません。再読込してください。");
      }
      const packed = await buildDraft(sample);
      const appliedWait = waitMessage("sample1man-applied", 15000);
      /* 再計測は apply 直後に来るので、先に待ち受けを張る */
      const resizedWait = waitMessage("sample1man-resized", 2000);
      el.frame.contentWindow.postMessage(
        { type: "sample1man-apply", draft: packed.draft },
        "*"
      );
      const msg = await appliedWait;
      const result = msg.result || {};
      if (!result.ok) throw new Error(result.reason || "apply-failed");
      let h = result.height || 1;
      try {
        const resized = await resizedWait;
        if (resized.result && resized.result.ok && resized.result.height) {
          const h2 = resized.result.height;
          /* 画像読み込み後の数px差は無視。大きい差だけ採用して二重フィットを防ぐ */
          if (Math.abs(h2 - h) >= 8) h = h2;
        }
      } catch (e) {
        /* 再計測なしでも初回高さで続行 */
      }
      scaleFrame(h, { force: true });
      setStatus(
        "表示中: " +
          packed.folder +
          (packed.meta && packed.meta.band ? " / 帯" + packed.meta.band : "") +
          " — 確認モードで文字・写真を確認"
      );
    } catch (err) {
      setStatus("エラー: " + (err && err.message ? err.message : err));
    } finally {
      busy = false;
      updateChrome();
    }
  }

  async function postDecision(folder, action, payload) {
    const res = await fetch(
      "../sushi-samples/__review-decision?key=" +
        encodeURIComponent(folder) +
        "&action=" +
        encodeURIComponent(action),
      {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: payload ? JSON.stringify(payload) : "{}"
      }
    );
    const raw = await res.text();
    let json = null;
    try {
      json = raw ? JSON.parse(raw) : null;
    } catch (_) {
      json = null;
    }
    if (!json || typeof json !== "object") {
      throw new Error(
        "decision-failed http" + res.status + " body=" + String(raw || "").slice(0, 80)
      );
    }
    if (!res.ok || !json.ok) {
      throw new Error(
        json.reason ||
          json.detail ||
          "decision-failed http" + res.status
      );
    }
    return json;
  }

  function openNgModal() {
    if (!el.ngModal) return;
    el.ngModal.hidden = false;
    if (el.ngNote) el.ngNote.value = "";
    document.querySelectorAll('input[name="ng-reason"]').forEach(function (c) {
      c.checked = false;
    });
    const fix = document.querySelector('input[name="ng-severity"][value="fix"]');
    if (fix) fix.checked = true;
  }

  function closeNgModal() {
    if (el.ngModal) el.ngModal.hidden = true;
  }

  function readNgForm() {
    const sevEl = document.querySelector('input[name="ng-severity"]:checked');
    const severity = sevEl && sevEl.value === "drop" ? "drop" : "fix";
    const reasons = [];
    document.querySelectorAll('input[name="ng-reason"]:checked').forEach(function (c) {
      reasons.push(c.value);
    });
    const note = el.ngNote ? String(el.ngNote.value || "").trim() : "";
    return { severity: severity, reasons: reasons, note: note };
  }

  async function onApprove() {
    if (busy) return;
    const sample = samples[index];
    if (!sample) return;
    const folder = folderOf(sample);
    busy = true;
    updateChrome();
    setStatus("承認中（全体スクショ保存）…");
    try {
      if (!(await ensureFrameReady())) throw new Error("frame-not-ready");
      const savedWait = waitMessage("sample1man-saved", 60000);
      el.frame.contentWindow.postMessage({ type: "sample1man-save", folderKey: folder }, "*");
      const savedMsg = await savedWait;
      const saved = savedMsg.result || {};
      if (!saved.ok) throw new Error(saved.reason || "save-failed");
      const decided = await postDecision(folder, "approve", {});
      approved.add(folder);
      rejected.delete(folder);
      needsFix.delete(folder);
      const statusHint =
        decided && decided.status && decided.status !== "ok"
          ? "（STATUS: " + decided.status + "）"
          : "";
      setStatus("承認した: " + folder + " → _sales/packs と preview.png" + statusHint);
      if (index < samples.length - 1) {
        index += 1;
        busy = false;
        updateChrome();
        await applyCurrent();
        return;
      }
    } catch (err) {
      setStatus("承認エラー: " + (err && err.message ? err.message : err));
    } finally {
      busy = false;
      updateChrome();
    }
  }

  function onReject() {
    if (busy) return;
    const sample = samples[index];
    if (!sample) return;
    openNgModal();
  }

  async function submitNg() {
    if (busy) return;
    const sample = samples[index];
    if (!sample) return;
    const form = readNgForm();
    if (!form.reasons.length) {
      setStatus("NG理由を1つ以上選んでください。");
      return;
    }
    const folder = folderOf(sample);
    const labels = form.reasons.map(function (id) {
      return REASON_LABELS[id] || id;
    });
    closeNgModal();
    busy = true;
    updateChrome();
    setStatus("NG処理中…");
    try {
      await postDecision(folder, "reject", {
        severity: form.severity,
        reasons: form.reasons,
        reasonLabels: labels,
        note: form.note
      });
      approved.delete(folder);
      if (form.severity === "fix") {
        needsFix.add(folder);
        rejected.delete(folder);
        setStatus(
          "要修正: " + folder + " — " + labels.join(" / ") + (form.note ? "｜" + form.note : "")
        );
      } else {
        rejected.add(folder);
        needsFix.delete(folder);
        setStatus(
          "本NG: " + folder + " — " + labels.join(" / ") + (form.note ? "｜" + form.note : "")
        );
      }
      if (index < samples.length - 1) {
        index += 1;
        busy = false;
        updateChrome();
        await applyCurrent();
        return;
      }
    } catch (err) {
      setStatus("NGエラー: " + (err && err.message ? err.message : err));
    } finally {
      busy = false;
      updateChrome();
    }
  }
  async function boot() {
    setStatus("manifest 読み込み…");
    const manifest = await fetchJson(MANIFEST_URL);
    samples = Array.isArray(manifest.samples) ? manifest.samples.slice() : [];
    try {
      const statusText = await fetch(STATUS_URL + "?v=" + Date.now()).then(function (r) {
        return r.text();
      });
      samples.forEach(function (s) {
        const folder = folderOf(s);
        const re = new RegExp("\\|\\s*" + folder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\|[^|]*\\|\\s*([^|]+)\\s*\\|");
        const m = statusText.match(re);
        if (!m) return;
        const st = m[1].trim();
        if (st.indexOf("採用") >= 0 || st.indexOf("営業") >= 0) approved.add(folder);
        if (st.indexOf("要修正") >= 0) needsFix.add(folder);
        if (st === "NG" || st.indexOf("本NG") >= 0 || st.indexOf("拒否") >= 0) rejected.add(folder);
      });
    } catch (e) {
      /* STATUS optional */
    }
    index = 0;
    for (let i = 0; i < samples.length; i++) {
      const f = folderOf(samples[i]);
      if (!approved.has(f) && !rejected.has(f) && !needsFix.has(f)) {
        index = i;
        break;
      }
    }
    updateChrome();
    el.frame.addEventListener("load", function () {
      frameReady = false;
      applyCurrent();
    });
    if (el.frame.contentDocument && el.frame.contentDocument.readyState === "complete") {
      applyCurrent();
    }
  }

  el.prev.addEventListener("click", function () {
    if (index <= 0 || busy) return;
    index -= 1;
    applyCurrent();
  });
  el.next.addEventListener("click", function () {
    if (index >= samples.length - 1 || busy) return;
    index += 1;
    applyCurrent();
  });
  el.reload.addEventListener("click", function () {
    applyCurrent();
  });
  el.approve.addEventListener("click", onApprove);
  el.reject.addEventListener("click", onReject);
  if (el.ngCancel) el.ngCancel.addEventListener("click", closeNgModal);
  if (el.ngSubmit) el.ngSubmit.addEventListener("click", submitNg);
  if (el.ngModal) {
    el.ngModal.addEventListener("click", function (ev) {
      if (ev.target === el.ngModal) closeNgModal();
    });
  }
  if (el.modeRead) {
    el.modeRead.addEventListener("click", function () {
      setViewMode("read");
    });
  }
  if (el.modeCapture) {
    el.modeCapture.addEventListener("click", function () {
      setViewMode("capture");
    });
  }
  let resizeTimer = null;
  let lastResizeStageKey = "";
  window.addEventListener("resize", function () {
    /* スクロールバー出現などの細かいレイアウト揺れで連打しない */
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      resizeTimer = null;
      if (viewMode !== "capture") return;
      const stage = el.stage || el.wrap.parentElement;
      const key = Math.round(stage.clientWidth) + "x" + Math.round(stage.clientHeight);
      const prev = lastResizeStageKey || el.wrap.dataset.scaledStage || "";
      if (prev) {
        const p = prev.split("x").map(Number);
        const n = key.split("x").map(Number);
        if (
          p.length === 2 &&
          n.length === 2 &&
          Math.abs(p[0] - n[0]) < 12 &&
          Math.abs(p[1] - n[1]) < 12
        ) {
          return;
        }
      }
      lastResizeStageKey = key;
      scaleFrame(lastPreviewHeight, { force: true });
    }, 200);
  });

  syncModeButtons();
  boot().catch(function (err) {
    setStatus("起動エラー: " + (err && err.message ? err.message : err));
  });
})();
