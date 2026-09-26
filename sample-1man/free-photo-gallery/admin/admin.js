(() => {
  const CATALOG_URL = "../catalog.json";
  const SAVE_CATALOG = "/sample-1man/free-photo-gallery/__catalog-save";
  const SAVE_IMAGE = "/sample-1man/free-photo-gallery/__image-save";

  const el = {
    status: document.getElementById("status"),
    filterTag: document.getElementById("filterTag"),
    filterText: document.getElementById("filterText"),
    count: document.getElementById("count"),
    btnMultiClear: document.getElementById("btnMultiClear"),
    multiHint: document.getElementById("multiHint"),
    tagHelp: document.getElementById("tagHelp"),
    thumbs: document.getElementById("thumbs"),
    emptyHint: document.getElementById("emptyHint"),
    detail: document.getElementById("detail"),
    preview: document.getElementById("preview"),
    itemId: document.getElementById("itemId"),
    itemPath: document.getElementById("itemPath"),
    itemScene: document.getElementById("itemScene"),
    tagChecks: document.getElementById("tagChecks"),
    newTagKey: document.getElementById("newTagKey"),
    newTagLabel: document.getElementById("newTagLabel"),
    btnAddTag: document.getElementById("btnAddTag"),
    btnSaveTags: document.getElementById("btnSaveTags"),
    btnCropPreview: document.getElementById("btnCropPreview"),
    btnCropSave: document.getElementById("btnCropSave"),
    btnCropCancel: document.getElementById("btnCropCancel"),
    cropCanvas: document.getElementById("cropCanvas")
  };

  let catalog = null;
  let selectedId = null;
  let cropBlob = null;
  let tagsDirty = false;
  /** チェックが入っている id */
  const multiIds = new Set();
  /** 複数のとき、保存で書き換えるタグ一式（前のタグは残さない） */
  const pendingAdd = new Set();
  /** path → cache-bust token（上書き後に左サムネも同じ切れ端を見せる） */
  const mediaBust = Object.create(null);

  function mediaSrc(path) {
    const bust = mediaBust[path] || 0;
    return "../" + path + (bust ? "?t=" + bust : "");
  }

  function bumpMedia(path) {
    mediaBust[path] = Date.now();
  }

  function setStatus(msg, isError) {
    el.status.textContent = msg || "";
    el.status.classList.toggle("is-error", !!isError);
  }

  function markTagsDirty() {
    tagsDirty = true;
  }

  function clearTagsDirty() {
    tagsDirty = false;
  }

  function confirmLeaveUnsaved() {
    if (!tagsDirty) return true;
    return window.confirm("タグの変更がまだ保存されていません。このまま別の写真に移りますか？");
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function selectedItem() {
    if (!catalog || !selectedId) return null;
    return (catalog.items || []).find((i) => i.id === selectedId) || null;
  }

  function findItem(id) {
    return (catalog.items || []).find((i) => i.id === id) || null;
  }

  function inGroupTagMode() {
    return multiIds.size >= 2;
  }

  function tagKeys() {
    return Object.keys((catalog && catalog.tagLabels) || {}).sort();
  }

  function fillFilter() {
    const cur = el.filterTag.value;
    const opts = ['<option value="">すべて</option>'];
    tagKeys().forEach((k) => {
      const label = catalog.tagLabels[k] || k;
      opts.push(
        '<option value="' +
          esc(k) +
          '"' +
          (k === cur ? " selected" : "") +
          ">" +
          esc(label) +
          " (" +
          esc(k) +
          ")</option>"
      );
    });
    el.filterTag.innerHTML = opts.join("");
  }

  function filtered() {
    const items = (catalog && catalog.items) || [];
    const tag = el.filterTag.value;
    const q = String(el.filterText.value || "")
      .trim()
      .toLowerCase();
    return items.filter((item) => {
      if (tag) {
        const tags = Array.isArray(item.tags) ? item.tags : [];
        if (tags.indexOf(tag) < 0) return false;
      }
      if (q) {
        const hay = (item.id + " " + item.path + " " + (item.sceneLabel || "")).toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });
  }

  function renderThumbs() {
    const side = el.thumbs.closest(".adm-side");
    const scrollTop = side ? side.scrollTop : 0;
    const items = filtered();
    const total = ((catalog && catalog.items) || []).length;
    const picked = multiIds.size;
    el.count.textContent =
      items.length + " / " + total + " 枚" + (picked ? " ・ 選択 " + picked + " 枚" : "");
    el.thumbs.innerHTML = items
      .map((item) => {
        const on = item.id === selectedId ? " is-on" : "";
        const pick = multiIds.has(item.id) ? " is-pick" : "";
        const checked = multiIds.has(item.id) ? " checked" : "";
        return (
          '<li class="' +
          (on + pick).trim() +
          '">' +
          '<label class="adm-check"><input type="checkbox" data-pick="' +
          esc(item.id) +
          '"' +
          checked +
          ' aria-label="選択"></label>' +
          '<button type="button" data-id="' +
          esc(item.id) +
          '">' +
          '<img src="' +
          esc(mediaSrc(item.path)) +
          '" alt="" loading="lazy">' +
          '<span class="cap">' +
          esc(item.id) +
          "</span></button></li>"
        );
      })
      .join("");
    if (side) side.scrollTop = scrollTop;
  }

  function renderTagChecks(item) {
    const tags = inGroupTagMode()
      ? Array.from(pendingAdd)
      : item && Array.isArray(item.tags)
        ? item.tags
        : [];
    el.tagChecks.innerHTML = tagKeys()
      .map((k) => {
        const label = catalog.tagLabels[k] || k;
        const on = tags.indexOf(k) >= 0;
        return (
          '<button type="button" class="adm-tag' +
          (on ? " is-on" : "") +
          '" data-tag="' +
          esc(k) +
          '" aria-pressed="' +
          (on ? "true" : "false") +
          '">' +
          esc(label) +
          "</button>"
        );
      })
      .join("");
  }

  function showDetail(item, opts) {
    const keepTags = !!(opts && opts.keepTags);
    selectedId = item.id;
    cropBlob = null;
    if (!keepTags) clearTagsDirty();
    el.btnCropSave.hidden = true;
    el.btnCropCancel.hidden = true;
    el.cropCanvas.hidden = true;
    el.preview.hidden = false;
    el.emptyHint.hidden = true;
    el.detail.hidden = false;
    el.itemId.textContent = item.id;
    el.itemPath.textContent = item.path;
    el.itemScene.textContent =
      (item.sceneLabel || "") + (item.scene ? " (" + item.scene + ")" : "");
    bumpMedia(item.path);
    el.preview.src = mediaSrc(item.path);
    renderTagChecks(item);
    renderThumbs();
    syncMultiChrome();
  }

  function syncMultiChrome() {
    const group = inGroupTagMode();
    el.btnMultiClear.hidden = multiIds.size === 0;
    if (group) {
      el.tagHelp.textContent =
        "緑のタグだけが、選んでいる " +
        multiIds.size +
        " 枚のタグになります。前のタグは残しません。";
      el.btnSaveTags.textContent = "選んだ " + multiIds.size + " 枚のタグを、緑のタグに書き換えて保存";
    } else {
      el.tagHelp.textContent = "緑が付いているタグです。押すと付き、もう一度押すと外れます。";
      el.btnSaveTags.textContent = "この写真のタグを保存";
    }
  }

  async function loadCatalog() {
    setStatus("catalog 読み込み中…");
    const res = await fetch(CATALOG_URL + "?t=" + Date.now(), { cache: "no-store" });
    if (!res.ok) throw new Error("catalog load " + res.status);
    catalog = await res.json();
    if (!catalog.tagLabels) catalog.tagLabels = {};
    fillFilter();
    renderThumbs();
    renderTagChecks(null);
    syncMultiChrome();
    setStatus("catalog 読み込み完了（" + (catalog.items || []).length + " 枚）");
  }

  async function saveCatalog() {
    const res = await fetch(SAVE_CATALOG, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(catalog)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      throw new Error((data && data.reason) || "catalog-save-failed " + res.status);
    }
  }

  function collectCheckedTags() {
    return Array.from(el.tagChecks.querySelectorAll('button[data-tag][aria-pressed="true"]')).map(
      (btn) => btn.getAttribute("data-tag")
    );
  }

  el.thumbs.addEventListener("click", (ev) => {
    if (ev.target.closest("input[data-pick], label.adm-check")) return;
    const btn = ev.target.closest("button[data-id]");
    if (!btn || !catalog) return;
    const id = btn.getAttribute("data-id");
    if (id === selectedId) return;
    if (!inGroupTagMode() && tagsDirty && !confirmLeaveUnsaved()) return;
    const item = findItem(id);
    if (item) showDetail(item, { keepTags: inGroupTagMode() });
  });

  el.thumbs.addEventListener("change", (ev) => {
    const input = ev.target.closest("input[data-pick]");
    if (!input || !catalog) return;
    const id = input.getAttribute("data-pick");
    const next = new Set(multiIds);
    if (input.checked) next.add(id);
    else next.delete(id);
    const enteringGroup = multiIds.size < 2 && next.size >= 2;
    const leavingGroup = multiIds.size >= 2 && next.size < 2;
    if (tagsDirty && (enteringGroup || leavingGroup) && !confirmLeaveUnsaved()) {
      renderThumbs();
      return;
    }
    multiIds.clear();
    next.forEach((picked) => multiIds.add(picked));
    if (enteringGroup || leavingGroup) {
      pendingAdd.clear();
      clearTagsDirty();
    }
    if (input.checked) {
      const item = findItem(id);
      if (item) showDetail(item, { keepTags: inGroupTagMode() });
      return;
    }
    renderThumbs();
    const current = selectedItem();
    if (current) renderTagChecks(current);
    syncMultiChrome();
  });

  el.btnMultiClear.addEventListener("click", () => {
    const wasGroup = inGroupTagMode();
    if (wasGroup && tagsDirty && !confirmLeaveUnsaved()) return;
    multiIds.clear();
    pendingAdd.clear();
    if (wasGroup) clearTagsDirty();
    renderThumbs();
    const item = selectedItem();
    if (item) renderTagChecks(item);
    else renderTagChecks(null);
    syncMultiChrome();
    setStatus("チェックを外しました。");
  });

  el.filterTag.addEventListener("change", renderThumbs);
  el.filterText.addEventListener("input", renderThumbs);

  el.tagChecks.addEventListener("click", (ev) => {
    const btn = ev.target.closest("button[data-tag]");
    if (!btn) return;
    const on = btn.getAttribute("aria-pressed") !== "true";
    const key = btn.getAttribute("data-tag");
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.classList.toggle("is-on", on);
    if (inGroupTagMode()) {
      if (on) pendingAdd.add(key);
      else pendingAdd.delete(key);
    }
    markTagsDirty();
  });

  el.btnAddTag.addEventListener("click", async () => {
    if (!catalog) return;
    const key = String(el.newTagKey.value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const label = String(el.newTagLabel.value || "").trim();
    if (!key || !label) {
      setStatus("キーと表示名の両方を入れてください。", true);
      return;
    }
    if (catalog.tagLabels[key]) {
      setStatus("そのキーはもうあります。", true);
      return;
    }
    catalog.tagLabels[key] = label;
    el.newTagKey.value = "";
    el.newTagLabel.value = "";
    const item = selectedItem();
    if (inGroupTagMode()) {
      pendingAdd.add(key);
      markTagsDirty();
      if (item) renderTagChecks(item);
    } else if (item) {
      if (!Array.isArray(item.tags)) item.tags = [];
      if (item.tags.indexOf(key) < 0) item.tags.push(key);
      markTagsDirty();
      renderTagChecks(item);
    }
    fillFilter();
    try {
      catalog.updated = new Date().toISOString().slice(0, 10);
      await saveCatalog();
      setStatus(
        "タグ「" +
          label +
          "」を catalog に追加しました。" +
          (item ? " この写真への付け外しは「この写真のタグを保存」で確定できます。" : "")
      );
    } catch (e) {
      setStatus(String(e && e.message ? e.message : e), true);
    }
  });

  el.btnSaveTags.addEventListener("click", async () => {
    if (inGroupTagMode()) {
      const nextTags = Array.from(pendingAdd);
      if (
        !nextTags.length &&
        !window.confirm("緑のタグがありません。選んだ写真のタグをすべて消して保存しますか？")
      ) {
        return;
      }
      try {
        let n = 0;
        multiIds.forEach((id) => {
          const picked = findItem(id);
          if (!picked) return;
          picked.tags = nextTags.slice();
          n += 1;
        });
        catalog.updated = new Date().toISOString().slice(0, 10);
        await saveCatalog();
        pendingAdd.clear();
        clearTagsDirty();
        multiIds.clear();
        const current = selectedItem();
        if (current) renderTagChecks(current);
        setStatus(n + " 枚のタグを書き換えました。チェックは外してあります。");
        fillFilter();
        renderThumbs();
        syncMultiChrome();
      } catch (e) {
        setStatus(String(e && e.message ? e.message : e), true);
      }
      return;
    }
    const item = selectedItem();
    if (!item) return;
    try {
      item.tags = collectCheckedTags();
      catalog.updated = new Date().toISOString().slice(0, 10);
      await saveCatalog();
      clearTagsDirty();
      multiIds.clear();
      setStatus("タグを保存しました: " + item.id + "。チェックは外してあります。");
      fillFilter();
      renderThumbs();
      syncMultiChrome();
    } catch (e) {
      setStatus(String(e && e.message ? e.message : e), true);
    }
  });

  el.btnCropPreview.addEventListener("click", () => {
    const item = selectedItem();
    if (!item) return;
    const img = el.preview;
    if (!img.complete || !img.naturalWidth) {
      setStatus("画像の読み込みを待ってください。", true);
      return;
    }
    const w = img.naturalWidth;
    const h = Math.floor(img.naturalHeight / 2);
    if (h < 8) {
      setStatus("高さが足りず切れません。", true);
      return;
    }
    const canvas = el.cropCanvas;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, w, h, 0, 0, w, h);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setStatus("切り出しに失敗しました。", true);
          return;
        }
        cropBlob = blob;
        el.preview.hidden = true;
        canvas.hidden = false;
        el.btnCropSave.hidden = false;
        el.btnCropCancel.hidden = false;
        setStatus("上半分のプレビューです。よければ「確定して上書き保存」を押してください。");
      },
      "image/jpeg",
      0.9
    );
  });

  el.btnCropCancel.addEventListener("click", () => {
    cropBlob = null;
    el.cropCanvas.hidden = true;
    el.preview.hidden = false;
    el.btnCropSave.hidden = true;
    el.btnCropCancel.hidden = true;
    setStatus("トリムをやめました。");
  });

  el.btnCropSave.addEventListener("click", async () => {
    const item = selectedItem();
    if (!item || !cropBlob) return;
    if (
      !window.confirm(
        "この写真ファイルを上半分だけに上書きします。よろしいですか？\n" + item.path
      )
    ) {
      return;
    }
    try {
      setStatus("上書き保存中…");
      const res = await fetch(SAVE_IMAGE + "?path=" + encodeURIComponent(item.path), {
        method: "POST",
        headers: { "Content-Type": "image/jpeg" },
        body: cropBlob
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error((data && data.reason) || "image-save-failed " + res.status);
      }
      cropBlob = null;
      el.cropCanvas.hidden = true;
      el.btnCropSave.hidden = true;
      el.btnCropCancel.hidden = true;
      el.preview.hidden = false;
      bumpMedia(item.path);
      el.preview.src = mediaSrc(item.path);
      renderThumbs();
      setStatus("下半分を切って上書きしました: " + item.path);
    } catch (e) {
      setStatus(String(e && e.message ? e.message : e), true);
    }
  });

  loadCatalog().catch((e) => setStatus(String(e && e.message ? e.message : e), true));
})();
