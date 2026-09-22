(() => {
  const TAG_ORDER = ["person", "hand", "food", "drink", "indoor", "scenery", "nature", "animal"];
  const SHAPE_ORDER = ["wide", "square"];

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function joinUrl(base, path) {
    const b = String(base || "").replace(/\/+$/, "");
    const p = String(path || "").replace(/^\/+/, "");
    if (!b) return p;
    return b + "/" + p;
  }

  function createGallery(root, options) {
    const opts = options || {};
    const catalogUrl = opts.catalogUrl || "catalog.json";
    const imageBase = opts.imageBase != null ? opts.imageBase : "";
    const mode = opts.mode === "picker" ? "picker" : "standalone";
    const onSelect = typeof opts.onSelect === "function" ? opts.onSelect : null;
    const onConfirm = typeof opts.onConfirm === "function" ? opts.onConfirm : null;

    let catalog = null;
    let selectedId = opts.selectedId || null;
    let selectedItem = null;
    const tagSet = new Set();
    const shapeSet = new Set();

    root.classList.add("fpg");
    root.innerHTML = [
      '<div class="fpg-shell">',
      '  <header class="fpg-head">',
      mode === "standalone"
        ? '    <h1 class="fpg-title">写真ギャラリー</h1>'
        : '    <p class="fpg-title" role="heading" aria-level="2">写真ギャラリー</p>',
      '    <p class="fpg-lead">お好みの写真はありますか。題材や形で絞り込めます。</p>',
      "  </header>",
      '  <div class="fpg-filters" hidden>',
      '    <div class="fpg-filter-row" data-fpg-tags></div>',
      '    <div class="fpg-filter-row" data-fpg-shapes></div>',
      "  </div>",
      '  <div class="fpg-toolbar">',
      '    <p class="fpg-count" data-fpg-count></p>',
      '    <button type="button" class="fpg-clear" data-fpg-clear hidden>絞り込みをはずす</button>',
      "  </div>",
      '  <p class="fpg-error" data-fpg-error hidden></p>',
      '  <p class="fpg-empty" data-fpg-empty hidden>この条件に合う写真は見つかりませんでした。条件をはずしてみられます。</p>',
      '  <ul class="fpg-grid" data-fpg-grid></ul>',
      '  <p class="fpg-status" data-fpg-status hidden></p>',
      "</div>"
    ].join("\n");

    const elFilters = root.querySelector(".fpg-filters");
    const elTags = root.querySelector("[data-fpg-tags]");
    const elShapes = root.querySelector("[data-fpg-shapes]");
    const elCount = root.querySelector("[data-fpg-count]");
    const elClear = root.querySelector("[data-fpg-clear]");
    const elError = root.querySelector("[data-fpg-error]");
    const elEmpty = root.querySelector("[data-fpg-empty]");
    const elGrid = root.querySelector("[data-fpg-grid]");
    const elStatus = root.querySelector("[data-fpg-status]");

    function tagLabel(key) {
      const map = (catalog && catalog.tagLabels) || {};
      return map[key] || key;
    }

    function shapeLabel(key) {
      const map = (catalog && catalog.shapeLabels) || {};
      return map[key] || key;
    }

    function filteredItems() {
      const items = (catalog && catalog.items) || [];
      return items.filter((item) => {
        if (tagSet.size) {
          const tags = Array.isArray(item.tags) ? item.tags : [];
          let hit = false;
          tagSet.forEach((t) => {
            if (tags.indexOf(t) >= 0) hit = true;
          });
          if (!hit) return false;
        }
        if (shapeSet.size && !shapeSet.has(item.shape)) return false;
        return true;
      });
    }

    function syncStatus() {
      if (!selectedItem) {
        elStatus.hidden = true;
        elStatus.textContent = "";
        elStatus.classList.remove("is-ready");
        return;
      }
      elStatus.hidden = false;
      elStatus.classList.add("is-ready");
      elStatus.textContent =
        "「" +
        (selectedItem.sceneLabel || selectedItem.scene || "写真") +
        "」を選んでいます。枠にはめ込めます。";
    }

    function renderFilters() {
      const labels = (catalog && catalog.tagLabels) || {};
      elTags.innerHTML =
        '<span class="fpg-filter-label">題材</span>' +
        TAG_ORDER.map((key) => {
          if (!labels[key] && key === "hand") {
            /* still show even if unused */
          }
          const checked = tagSet.has(key) ? " checked" : "";
          return (
            '<label class="fpg-chip"><input type="checkbox" data-fpg-tag="' +
            esc(key) +
            '"' +
            checked +
            "> " +
            esc(tagLabel(key)) +
            "</label>"
          );
        }).join("");

      elShapes.innerHTML =
        '<span class="fpg-filter-label">形</span>' +
        SHAPE_ORDER.map((key) => {
          const checked = shapeSet.has(key) ? " checked" : "";
          return (
            '<label class="fpg-chip"><input type="checkbox" data-fpg-shape="' +
            esc(key) +
            '"' +
            checked +
            "> " +
            esc(shapeLabel(key)) +
            "</label>"
          );
        }).join("");

      elFilters.hidden = false;
    }

    function renderGrid() {
      const items = filteredItems();
      const total = ((catalog && catalog.items) || []).length;
      elCount.textContent =
        items.length === total
          ? total + "枚あります"
          : items.length + " / " + total + "枚（絞り込み中）";
      elClear.hidden = !(tagSet.size || shapeSet.size);
      elEmpty.hidden = items.length > 0;
      elGrid.hidden = items.length === 0;

      elGrid.innerHTML = items
        .map((item) => {
          const src = joinUrl(imageBase, item.path);
          const selected = item.id === selectedId ? " is-selected" : "";
          const wide = item.shape === "wide" ? " is-wide" : "";
          const pills = []
            .concat(item.sceneLabel ? [item.sceneLabel] : [])
            .concat(item.shape === "wide" ? [shapeLabel("wide")] : [])
            .concat(
              (item.tags || [])
                .filter((t) => t !== "indoor")
                .slice(0, 2)
                .map(tagLabel)
            );
          return (
            '<li>' +
            '<button type="button" class="fpg-card' +
            selected +
            wide +
            '" data-fpg-id="' +
            esc(item.id) +
            '" aria-pressed="' +
            (item.id === selectedId ? "true" : "false") +
            '">' +
            '<span class="fpg-selected-mark">選んだ</span>' +
            '<span class="fpg-card-media"><img src="' +
            esc(src) +
            '" alt="" loading="lazy" decoding="async"></span>' +
            '<span class="fpg-card-meta">' +
            pills.map((p) => '<span class="fpg-pill">' + esc(p) + "</span>").join("") +
            "</span>" +
            "</button>" +
            "</li>"
          );
        })
        .join("");
      syncStatus();
    }

    function findItem(id) {
      const items = (catalog && catalog.items) || [];
      for (let i = 0; i < items.length; i += 1) {
        if (items[i].id === id) return items[i];
      }
      return null;
    }

    function selectById(id, { silent } = {}) {
      const item = findItem(id);
      selectedId = item ? item.id : null;
      selectedItem = item;
      renderGrid();
      if (item && onSelect && !silent) onSelect(item);
      if (item && mode === "standalone" && onConfirm && !silent) {
        /* standalone: selecting is enough to mark; confirm optional */
      }
      return item;
    }

    elTags.addEventListener("change", (ev) => {
      const input = ev.target.closest("input[data-fpg-tag]");
      if (!input) return;
      const key = input.getAttribute("data-fpg-tag");
      if (input.checked) tagSet.add(key);
      else tagSet.delete(key);
      renderGrid();
    });

    elShapes.addEventListener("change", (ev) => {
      const input = ev.target.closest("input[data-fpg-shape]");
      if (!input) return;
      const key = input.getAttribute("data-fpg-shape");
      if (input.checked) shapeSet.add(key);
      else shapeSet.delete(key);
      renderGrid();
    });

    elClear.addEventListener("click", () => {
      tagSet.clear();
      shapeSet.clear();
      renderFilters();
      renderGrid();
    });

    elGrid.addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-fpg-id]");
      if (!btn) return;
      selectById(btn.getAttribute("data-fpg-id"));
    });

    const api = {
      getSelected() {
        return selectedItem;
      },
      selectById,
      clearFilters() {
        tagSet.clear();
        shapeSet.clear();
        renderFilters();
        renderGrid();
      },
      destroy() {
        root.innerHTML = "";
      }
    };

    return fetch(catalogUrl, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("catalog " + res.status);
        return res.json();
      })
      .then((data) => {
        catalog = data;
        if (selectedId) selectedItem = findItem(selectedId);
        renderFilters();
        renderGrid();
        return api;
      })
      .catch((err) => {
        elError.hidden = false;
        elError.textContent = "写真一覧を読み込めませんでした。しばらくしてから、もう一度開けますか。";
        console.error(err);
        return api;
      });
  }

  window.FreePhotoGallery = {
    mount(root, options) {
      if (!root) return Promise.reject(new Error("root required"));
      return createGallery(root, options);
    }
  };
})();
