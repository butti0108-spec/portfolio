(() => {
  const TAG_ORDER = [
    "cafe",
    "salon",
    "bakery",
    "sweets",
    "ramen",
    "izakaya",
    "bar",
    "florist",
    "pet",
    "clinic",
    "yoga",
    "studio",
    "gallery",
    "cowork",
    "hotel",
    "person",
    "hand",
    "food",
    "drink",
    "indoor",
    "scenery",
    "nature",
    "animal"
  ];

  function orderedTagKeys(catalog) {
    const labels = (catalog && catalog.tagLabels) || {};
    const keys = Object.keys(labels);
    const seen = {};
    const out = [];
    TAG_ORDER.forEach((k) => {
      if (labels[k] && !seen[k]) {
        seen[k] = 1;
        out.push(k);
      }
    });
    keys.sort().forEach((k) => {
      if (!seen[k]) {
        seen[k] = 1;
        out.push(k);
      }
    });
    return out;
  }

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
    let askingId = null;
    const tagSet = new Set();
    let trimOnly = false;

    root.classList.add("fpg");
    root.innerHTML = [
      '<div class="fpg-shell">',
      '  <header class="fpg-head">',
      mode === "standalone"
        ? '    <h1 class="fpg-title">写真ギャラリー</h1>'
        : '    <p class="fpg-title" role="heading" aria-level="2">写真ギャラリー</p>',
      '    <p class="fpg-lead">お好みの写真はありますか。</p>',
      "  </header>",
      '  <div class="fpg-filters" hidden>',
      '    <section class="fpg-filter-block">',
      '      <h2 class="fpg-filter-label">題材</h2>',
      '      <div class="fpg-filter-grid" data-fpg-tags></div>',
      "    </section>",
      '    <section class="fpg-filter-block" data-fpg-trim-block hidden>',
      '      <h2 class="fpg-filter-label">カード</h2>',
      '      <p class="fpg-filter-note">縦の高さが半分です。上半分だけの写真で、カードにはめやすいです。</p>',
      '      <div class="fpg-filter-grid" data-fpg-trim></div>',
      "    </section>",
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
    const elTrimBlock = root.querySelector("[data-fpg-trim-block]");
    const elTrim = root.querySelector("[data-fpg-trim]");
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

    function itemHasTrim(item) {
      return !!(item && item.trimCardPath);
    }

    function filteredItems() {
      const items = (catalog && catalog.items) || [];
      return items.filter((item) => {
        if (trimOnly && !itemHasTrim(item)) return false;
        if (tagSet.size) {
          const tags = Array.isArray(item.tags) ? item.tags : [];
          let hit = false;
          tagSet.forEach((t) => {
            if (tags.indexOf(t) >= 0) hit = true;
          });
          if (!hit) return false;
        }
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
      elStatus.textContent = "この写真を選んでいます。枠にはめ込めます。";
    }

    function renderFilters() {
      elTags.innerHTML = orderedTagKeys(catalog)
        .filter((key) => key !== "card-upper")
        .map((key) => {
          const on = tagSet.has(key);
          return (
            '<button type="button" class="fpg-chip' +
            (on ? " is-on" : "") +
            '" data-fpg-tag="' +
            esc(key) +
            '" aria-pressed="' +
            (on ? "true" : "false") +
            '">' +
            esc(tagLabel(key)) +
            "</button>"
          );
        })
        .join("");

      const hasAnyTrim = ((catalog && catalog.items) || []).some(itemHasTrim);
      if (elTrimBlock && elTrim) {
        if (hasAnyTrim) {
          elTrim.innerHTML =
            '<button type="button" class="fpg-chip' +
            (trimOnly ? " is-on" : "") +
            '" data-fpg-trim-only aria-pressed="' +
            (trimOnly ? "true" : "false") +
            '">上半分だけ</button>';
          elTrimBlock.hidden = false;
        } else {
          elTrim.innerHTML = "";
          elTrimBlock.hidden = true;
        }
      }

      elFilters.hidden = false;
    }

    function renderGrid() {
      const items = filteredItems();
      const total = ((catalog && catalog.items) || []).length;
      elCount.textContent =
        items.length === total
          ? total + "枚あります"
          : items.length + " / " + total + "枚（絞り込み中）";
      elClear.hidden = !(tagSet.size || trimOnly);
      elEmpty.hidden = items.length > 0;
      elGrid.hidden = items.length === 0;

      elGrid.innerHTML = items
        .map((item) => {
          const src = joinUrl(imageBase, item.path);
          const asking = mode === "picker" && item.id === askingId;
          const selected = mode !== "picker" && item.id === selectedId ? " is-selected" : "";
          const wide = item.shape === "wide" ? " is-wide" : "";
          const ask =
            asking
              ? '<span class="fpg-ask">' +
                '<button type="button" class="fpg-ask-yes" data-fpg-yes>この画像にしますか</button>' +
                '<button type="button" class="fpg-ask-no" data-fpg-no>やめますか</button>' +
                "</span>"
              : "";
          const mark = mode === "picker" ? "" : '<span class="fpg-selected-mark" aria-hidden="true"></span>';
          return (
            '<li>' +
            '<div class="fpg-card' +
            (asking ? " is-asking" : "") +
            selected +
            wide +
            '" data-fpg-id="' +
            esc(item.id) +
            '" role="button" tabindex="0">' +
            mark +
            '<span class="fpg-card-media"><img src="' +
            esc(src) +
            '" alt="" loading="lazy" decoding="async"></span>' +
            ask +
            "</div>" +
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

    elTags.addEventListener("click", (ev) => {
      const btn = ev.target.closest("button[data-fpg-tag]");
      if (!btn) return;
      const key = btn.getAttribute("data-fpg-tag");
      if (tagSet.has(key)) tagSet.delete(key);
      else tagSet.add(key);
      renderFilters();
      renderGrid();
    });

    if (elTrim) {
      elTrim.addEventListener("click", (ev) => {
        const btn = ev.target.closest("button[data-fpg-trim-only]");
        if (!btn) return;
        trimOnly = !trimOnly;
        renderFilters();
        renderGrid();
      });
    }

    elClear.addEventListener("click", () => {
      tagSet.clear();
      trimOnly = false;
      renderFilters();
      renderGrid();
    });

    elGrid.addEventListener("keydown", (ev) => {
      if (ev.key !== "Enter" && ev.key !== " ") return;
      const card = ev.target.closest("[data-fpg-id]");
      if (!card || ev.target !== card) return;
      ev.preventDefault();
      card.click();
    });

    elGrid.addEventListener("click", (ev) => {
      const card = ev.target.closest("[data-fpg-id]");
      if (!card) return;
      if (ev.target.closest("[data-fpg-no]")) {
        ev.preventDefault();
        askingId = null;
        renderGrid();
        return;
      }
      if (ev.target.closest("[data-fpg-yes]")) {
        ev.preventDefault();
        const item = findItem(card.getAttribute("data-fpg-id"));
        if (!item) return;
        selectedId = item.id;
        selectedItem = item;
        if (onConfirm) onConfirm(item);
        else if (onSelect) onSelect(item);
        return;
      }
      if (mode === "picker") {
        askingId = card.getAttribute("data-fpg-id");
        renderGrid();
        const yes = elGrid.querySelector(".fpg-ask-yes");
        if (yes) yes.focus();
        return;
      }
      selectById(card.getAttribute("data-fpg-id"));
    });

    const api = {
      getSelected() {
        return selectedItem;
      },
      selectById,
      clearFilters() {
        tagSet.clear();
        trimOnly = false;
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
