(() => {
  "use strict";

  const params = new URLSearchParams(location.search);
  if (params.get("review") !== "1") return;

  const MANIFEST_URL = "sushi-samples/manifest.json?v=review-unify-1";
  const STATUS_URL = "sushi-samples/_materials/STATUS.md";

  const el = {
    progress: document.getElementById("review-progress"),
    label: document.getElementById("review-current-label"),
    status: document.getElementById("review-status-line"),
    prev: document.getElementById("review-btn-prev"),
    next: document.getElementById("review-btn-next"),
    reload: document.getElementById("review-btn-reload"),
    edit: document.getElementById("review-btn-edit"),
    confirm: document.getElementById("review-btn-confirm"),
    approve: document.getElementById("review-btn-approve"),
    reject: document.getElementById("review-btn-reject"),
    modeRead: document.getElementById("review-btn-mode-read"),
    modeFit: document.getElementById("review-btn-mode-fit"),
    jsonImportBtn: document.getElementById("review-json-import-btn"),
    jsonImportInput: document.getElementById("review-json-import-input"),
    jsonExportBtn: document.getElementById("review-json-export-btn"),
    jsonStatus: document.getElementById("review-json-status"),
    ngModal: document.getElementById("review-ng-modal"),
    ngNote: document.getElementById("review-ng-note"),
    ngCancel: document.getElementById("review-ng-cancel"),
    ngSubmit: document.getElementById("review-ng-submit")
  };

  let samples = [];
  let index = 0;
  let busy = false;
  let lastDraft = null;
  let lastFolder = "";
  let guestOrder = false;
  /** "read" = 本体幅で実寸確認 / "fit" = 全体を一度だけ縮小（resizeループなし） */
  let viewMode = "read";
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
    if (el.status) el.status.textContent = msg || "";
  }

  function setJsonStatus(msg) {
    if (el.jsonStatus) el.jsonStatus.textContent = msg || "";
  }

  function folderOf(sample) {
    return (sample.draftPath || "").split("/")[0];
  }

  function updateChrome() {
    const sample = samples[index];
    const folder = sample ? folderOf(sample) : "";
    if (el.progress) {
      el.progress.textContent =
        "承認 " +
        approved.size +
        " / 候補 " +
        (samples.length || "—") +
        (folder
          ? "｜" +
            (index + 1) +
            "/" +
            samples.length +
            (approved.has(folder) ? "・済" : "") +
            (needsFix.has(folder) ? "・要修正" : "") +
            (rejected.has(folder) ? "・NG" : "")
          : "");
    }
    if (el.label) {
      el.label.textContent = folder || "読み込み中…";
      el.label.title = folder || "";
    }
    if (el.modeRead) el.modeRead.classList.toggle("is-on", viewMode === "read");
    if (el.modeFit) el.modeFit.classList.toggle("is-on", viewMode === "fit");
    document.body.classList.toggle("review-view-fit", viewMode === "fit");
    if (el.prev) el.prev.disabled = busy || index <= 0;
    if (el.next) el.next.disabled = busy || index >= samples.length - 1;
    if (el.reload) el.reload.disabled = busy || !sample;
    if (el.edit) el.edit.disabled = busy || !sample;
    if (el.confirm) el.confirm.disabled = busy || !sample || guestOrder || !lastFolder;
    if (el.approve) el.approve.disabled = busy || !sample;
    if (el.reject) el.reject.disabled = busy || !sample;
  }

  function setViewMode(mode) {
    viewMode = mode === "fit" ? "fit" : "read";
    updateChrome();
    applyFitOrRead();
  }

  function applyFitOrRead() {
    const scrollEl = document.querySelector(".preview-scroll");
    const viewport = document.getElementById("preview-viewport");
    if (!scrollEl || !viewport) return;
    if (viewMode === "read") {
      viewport.style.removeProperty("zoom");
      if (typeof window.applyPreviewWidthFromPane === "function") {
        window.applyPreviewWidthFromPane();
      }
      return;
    }
    if (typeof window.setPreviewWidthStepById === "function") {
      window.setPreviewWidthStepById("desktop");
    }
    const designW = Math.max(
      280,
      Number(
        viewport.style.width && viewport.style.width.endsWith("px")
          ? parseFloat(viewport.style.width)
          : 1280
      ) || 1280
    );
    const root = document.getElementById("preview-root");
    const availW = Math.max(120, scrollEl.clientWidth - 16);
    const availH = Math.max(120, scrollEl.clientHeight - 16);
    const fullH = Math.max(1, root ? root.scrollHeight : 1);
    const scale = Math.min(1, availW / designW, availH / fullH);
    if (scale < 0.999) {
      viewport.style.zoom = String(scale);
    } else {
      viewport.style.removeProperty("zoom");
    }
    scrollEl.scrollTop = 0;
    scrollEl.scrollLeft = 0;
  }

  async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error("fetch-fail " + url + " " + res.status);
    return res.json();
  }

  async function buildDraft(sample) {
    const folder = folderOf(sample);
    const draft = await fetchJson("sushi-samples/" + folder + "/draft.json?v=" + Date.now());
    let meta = null;
    let copy = null;
    try {
      meta = await fetchJson("sushi-samples/_materials/" + folder + "/meta.json?v=" + Date.now());
    } catch (e) {
      /* optional */
    }
    try {
      copy = await fetchJson("sushi-samples/_materials/" + folder + "/copy.json?v=" + Date.now());
    } catch (e) {
      /* optional */
    }
    if (meta) {
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
      draft.sushiSampleKey = folder.split("-").slice(1).join("-") || draft.sushiSampleKey;
    }
    if (copy && typeof copy === "object") {
      draft.fields = draft.fields || {};
      Object.keys(copy).forEach(function (k) {
        if (k === "note") return;
        if (copy[k] == null || String(copy[k]).trim() === "") return;
        const cur = draft.fields[k];
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
      draft.imagePaths[field] = "sushi-samples/" + folder + "/images/" + slot + "?v=" + Date.now();
    });
    return { folder: folder, draft: draft, meta: meta };
  }

  function waitForReviewApi(tries) {
    return new Promise(function (resolve) {
      let n = 0;
      const max = tries || 80;
      function tick() {
        if (typeof window.__sample1manReviewApply === "function") {
          resolve(true);
          return;
        }
        n += 1;
        if (n >= max) {
          resolve(false);
          return;
        }
        setTimeout(tick, 50);
      }
      tick();
    });
  }

  async function applyCurrent() {
    if (busy) return;
    const sample = samples[index];
    if (!sample) return;
    busy = true;
    guestOrder = false;
    updateChrome();
    setStatus("読み込み中…");
    try {
      if (!(await waitForReviewApi())) {
        throw new Error("本体プレビューの準備ができていません。再読込してください。");
      }
      const packed = await buildDraft(sample);
      lastDraft = packed.draft;
      lastFolder = packed.folder;
      const widthId = viewMode === "fit" ? "desktop" : undefined;
      const result = window.__sample1manReviewApply(packed.draft, { widthId: widthId || "desktop" });
      if (!result || !result.ok) throw new Error((result && result.reason) || "apply-failed");
      window.requestAnimationFrame(function () {
        applyFitOrRead();
      });
      setStatus(
        "表示中: " +
          packed.folder +
          (packed.meta && packed.meta.band ? " / 帯" + packed.meta.band : "") +
          " — 編集→確定で draft.json を更新できます"
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
      "sushi-samples/__review-decision?key=" +
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
      throw new Error(json.reason || json.detail || "decision-failed http" + res.status);
    }
    return json;
  }

  function openNgModal() {
    if (!el.ngModal) return;
    el.ngModal.hidden = false;
    if (el.ngNote) el.ngNote.value = "";
    document.querySelectorAll('#review-ng-modal input[name="ng-reason"]').forEach(function (c) {
      c.checked = false;
    });
    const fix = document.querySelector('#review-ng-modal input[name="ng-severity"][value="fix"]');
    if (fix) fix.checked = true;
  }

  function closeNgModal() {
    if (el.ngModal) el.ngModal.hidden = true;
  }

  function readNgForm() {
    const sevEl = document.querySelector('#review-ng-modal input[name="ng-severity"]:checked');
    const severity = sevEl && sevEl.value === "drop" ? "drop" : "fix";
    const reasons = [];
    document.querySelectorAll('#review-ng-modal input[name="ng-reason"]:checked').forEach(function (c) {
      reasons.push(c.value);
    });
    const note = el.ngNote ? String(el.ngNote.value || "").trim() : "";
    return { severity: severity, reasons: reasons, note: note };
  }

  function onEdit() {
    if (busy) return;
    const sample = samples[index];
    if (!sample || !lastFolder) return;
    if (typeof window.__sample1manReviewEnterEdit !== "function") {
      setStatus("編集APIがありません。本体を再読込してください。");
      return;
    }
    const entered = window.__sample1manReviewEnterEdit({
      folder: lastFolder,
      index: index,
      viewMode: viewMode,
      baseDraft: lastDraft,
      guestOrder: guestOrder
    });
    if (!entered || !entered.ok) {
      setStatus("編集に入れません: " + ((entered && entered.reason) || "unknown"));
    }
  }

  async function onConfirm() {
    if (busy) return;
    if (guestOrder) {
      setStatus("客データ（order）は見本フォルダに保存しません。共有パック書き出しを使ってください。");
      return;
    }
    if (!lastFolder) {
      setStatus("保存先の見本がありません。");
      return;
    }
    if (typeof window.__sample1manSaveSampleDraft !== "function") {
      setStatus("保存APIがありません。本体を再読込してください。");
      return;
    }
    busy = true;
    updateChrome();
    setStatus("draft.json に保存中…");
    try {
      const saved = await window.__sample1manSaveSampleDraft(lastFolder, lastDraft);
      if (!saved || !saved.ok) {
        throw new Error((saved && saved.reason) || "save-failed");
      }
      lastDraft = saved.draft || lastDraft;
      setStatus("確定しました: sushi-samples/" + lastFolder + "/draft.json");
      busy = false;
      updateChrome();
      await applyCurrent();
    } catch (err) {
      setStatus("確定エラー: " + (err && err.message ? err.message : err));
      busy = false;
      updateChrome();
    }
  }

  function onJsonImport() {
    if (!el.jsonImportInput) return;
    el.jsonImportInput.click();
  }

  function onJsonImportFile() {
    const file = el.jsonImportInput && el.jsonImportInput.files && el.jsonImportInput.files[0];
    if (el.jsonImportInput) el.jsonImportInput.value = "";
    if (!file) return;
    setJsonStatus("読み込み中…");
    const reader = new FileReader();
    reader.onload = function () {
      try {
        if (typeof window.__sample1manParseStudioJson !== "function") {
          throw new Error("parse-api-missing");
        }
        const obj = JSON.parse(String(reader.result || ""));
        const parsed = window.__sample1manParseStudioJson(obj);
        window.__sample1manApplyStudioDraft(parsed.draft);
        lastDraft = parsed.draft;
        guestOrder = parsed.role === "order";
        if (guestOrder) {
          lastFolder = "";
          setJsonStatus("客データ（作業用）。見本フォルダには保存しません。");
          setStatus("客データを表示中（確定保存は無効）");
        } else {
          if (parsed.sampleKey) {
            const hit = samples.findIndex(function (s) {
              return folderOf(s).indexOf(parsed.sampleKey) >= 0;
            });
            if (hit >= 0) index = hit;
          }
          lastFolder = samples[index] ? folderOf(samples[index]) : lastFolder;
          setJsonStatus(
            "取り込み: " +
              (parsed.role || "draft") +
              " / " +
              (parsed.sampleKey || parsed.sampleId || file.name)
          );
          setStatus("JSONを反映しました。直し終わったら「これで確定」で draft.json へ。");
        }
        updateChrome();
      } catch (err) {
        setJsonStatus("失敗: " + (err && err.message ? err.message : err));
      }
    };
    reader.onerror = function () {
      setJsonStatus("失敗: ファイルを読めませんでした");
    };
    reader.readAsText(file, "UTF-8");
  }

  function onJsonExport() {
    try {
      if (typeof window.__sample1manDownloadStudioPack !== "function") {
        throw new Error("export-api-missing");
      }
      const name = window.__sample1manDownloadStudioPack();
      setJsonStatus("書き出しました: " + name + "（共有用・正本保存ではありません）");
    } catch (err) {
      setJsonStatus("書き出し失敗: " + (err && err.message ? err.message : err));
    }
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
      if (!lastDraft) throw new Error("draft-missing");
      if (typeof window.__sample1manCaptureApply !== "function") {
        throw new Error("capture-api-missing");
      }
      const applied = window.__sample1manCaptureApply(lastDraft);
      if (!applied || !applied.ok) throw new Error((applied && applied.reason) || "capture-apply-failed");
      await new Promise(function (r) {
        setTimeout(r, 200);
      });
      const saved = await window.__sample1manCaptureSave(folder);
      if (!saved || !saved.ok) throw new Error((saved && saved.reason) || "save-failed");
      const decided = await postDecision(folder, "approve", {});
      approved.add(folder);
      rejected.delete(folder);
      needsFix.delete(folder);
      window.__sample1manReviewApply(lastDraft, { widthId: "desktop" });
      applyFitOrRead();
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
      if (lastDraft && typeof window.__sample1manReviewApply === "function") {
        try {
          window.__sample1manReviewApply(lastDraft, { widthId: "desktop" });
          applyFitOrRead();
        } catch (_) {
          /* ignore */
        }
      }
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
    document.documentElement.classList.add("is-review-mode");
    document.body.classList.add("is-review-mode");
    const chrome = document.getElementById("review-chrome");
    if (chrome) {
      chrome.hidden = false;
      chrome.removeAttribute("hidden");
    }
    setStatus("manifest 読み込み…");
    const manifest = await fetchJson(MANIFEST_URL);
    samples = Array.isArray(manifest.samples) ? manifest.samples.slice() : [];
    try {
      const statusText = await fetch(STATUS_URL + "?v=" + Date.now()).then(function (r) {
        return r.text();
      });
      samples.forEach(function (s) {
        const folder = folderOf(s);
        const re = new RegExp(
          "\\|\\s*" +
            folder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
            "\\s*\\|[^|]*\\|\\s*([^|]+)\\s*\\|"
        );
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
    await applyCurrent();
  }

  if (el.prev) {
    el.prev.addEventListener("click", function () {
      if (index <= 0 || busy) return;
      index -= 1;
      applyCurrent();
    });
  }
  if (el.next) {
    el.next.addEventListener("click", function () {
      if (index >= samples.length - 1 || busy) return;
      index += 1;
      applyCurrent();
    });
  }
  if (el.reload) {
    el.reload.addEventListener("click", function () {
      applyCurrent();
    });
  }
  if (el.edit) el.edit.addEventListener("click", onEdit);
  if (el.confirm) el.confirm.addEventListener("click", onConfirm);
  if (el.approve) el.approve.addEventListener("click", onApprove);
  if (el.reject) el.reject.addEventListener("click", onReject);
  if (el.jsonImportBtn) el.jsonImportBtn.addEventListener("click", onJsonImport);
  if (el.jsonImportInput) el.jsonImportInput.addEventListener("change", onJsonImportFile);
  if (el.jsonExportBtn) el.jsonExportBtn.addEventListener("click", onJsonExport);
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
  if (el.modeFit) {
    el.modeFit.addEventListener("click", function () {
      setViewMode("fit");
    });
  }

  window.addEventListener("sample1man-review-after-confirm", function (ev) {
    const detail = (ev && ev.detail) || {};
    if (typeof detail.index === "number") index = detail.index;
    setStatus("確定反映を再読込中…");
    applyCurrent();
  });
  window.addEventListener("sample1man-review-resume", function () {
    setStatus("レビューに戻りました（未保存の編集は破棄）");
    applyCurrent();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      boot().catch(function (err) {
        setStatus("起動エラー: " + (err && err.message ? err.message : err));
      });
    });
  } else {
    boot().catch(function (err) {
      setStatus("起動エラー: " + (err && err.message ? err.message : err));
    });
  }
})();
