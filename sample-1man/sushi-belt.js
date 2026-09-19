/**
 * 回転寿司サンプル選択（監査指示 2026-09-16）
 * 連続レーン（右→左 36px/s）＋ストック最大3＋拡大／チュートリアル
 */
(function (global) {
  "use strict";

  /* 本番タイル寸法（監査モック目安に合わせ固定） */
  var TILE_W = 170;
  var TILE_H = 240;
  var TILE_GAP = 18;
  var SITE_DESIGN_W = 1200;
  var SPEED_PX_S = 36;
  var MS_STOCK_IN = 360;
  var MS_STOCK_OUT = 240;
  var MS_ZOOM = 680;
  var MAX_STOCK = 3;
  var TUTORIAL_KEY = "sample1man-sushi-tutorial-v1";
  /* 一軍24のみ（削除候補 17/20/22/24/25/27 はレーンに出さない） */
  var FIRST_TEAM = {
    "01": 1,
    "02": 1,
    "03": 1,
    "04": 1,
    "05": 1,
    "06": 1,
    "07": 1,
    "08": 1,
    "09": 1,
    "10": 1,
    "11": 1,
    "12": 1,
    "13": 1,
    "14": 1,
    "15": 1,
    "16": 1,
    "18": 1,
    "19": 1,
    "21": 1,
    "23": 1,
    "26": 1,
    "28": 1,
    "29": 1,
    "30": 1
  };

  var manifest = null;
  var stock = [null, null, null];
  var selectedStockSlot = -1;
  var onConfirm = null;

  var isPlaying = true;
  var isZoomed = false;
  var isDragging = false;
  var dragMoved = false;

  var offsetX = 0;
  var rafId = 0;
  var lastTs = 0;
  var laneSamples = [];
  var loopWidth = 0;

  var els = {};

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function escapeAttr(s) {
    return escapeHtml(s).replace(/"/g, "&quot;");
  }

  function previewUrl(sample) {
    var p = sample.previewPath || "";
    if (/\.svg$/i.test(p)) {
      p = p.replace(/\.svg$/i, ".png");
    }
    return "sushi-samples/" + p;
  }

  function stockIds() {
    var ids = {};
    stock.forEach(function (s) {
      if (s) ids[s.id] = true;
    });
    return ids;
  }

  function laneList() {
    if (!manifest || !manifest.samples) return [];
    var hid = stockIds();
    return manifest.samples.filter(function (s) {
      return FIRST_TEAM[s.id] && !hid[s.id];
    });
  }

  function firstEmptyStock() {
    for (var i = 0; i < MAX_STOCK; i++) {
      if (!stock[i]) return i;
    }
    return -1;
  }

  function stockCount() {
    var n = 0;
    for (var i = 0; i < MAX_STOCK; i++) if (stock[i]) n++;
    return n;
  }

  async function loadManifest() {
    if (manifest) return manifest;
    var res = await fetch("sushi-samples/manifest.json?v=sushi-belt-v3");
    manifest = await res.json();
    return manifest;
  }

  async function fetchDraft(sample) {
    var res = await fetch(
      "sushi-samples/" + sample.draftPath + "?v=color-apply-v3"
    );
    return res.json();
  }

  function bindEls() {
    els.root = $("entry-sushi-field");
    els.stockBar = $("sushi-stock-bar");
    els.lane = $("sushi-lane");
    els.track = $("sushi-lane-track");
    els.pause = $("sushi-pause");
    els.replace = $("sushi-replace-modal");
    els.zoomLayer = $("sushi-zoom-layer");
    els.zoomInner = $("sushi-zoom-inner");
    els.tutorial = $("sushi-tutorial");
    els.help = $("sushi-help-btn");
    els.helpRail = $("sushi-help-rail");
  }

  function tileHtml(sample, opts) {
    opts = opts || {};
    var scale = TILE_W / SITE_DESIGN_W;
    var visibleSiteH = Math.round(TILE_H / scale);
    return (
      '<article class="sushi-tile" data-sample-id="' +
      escapeAttr(sample.id) +
      '" style="width:' +
      TILE_W +
      "px;height:" +
      TILE_H +
      'px">' +
      '<div class="sushi-tile-clip">' +
      '<img class="sushi-tile-img" src="' +
      escapeAttr(previewUrl(sample)) +
      '" alt="' +
      escapeAttr(sample.brand || "") +
      '" width="' +
      TILE_W +
      '" decoding="async" loading="lazy">' +
      "</div>" +
      (opts.stock
        ? '<button type="button" class="sushi-tile-btn sushi-tile-btn--down" data-sushi-act="unstock" data-slot="' +
          opts.slot +
          '" title="レーンへ戻す" aria-label="ストック解除">↓</button>'
        : '<button type="button" class="sushi-tile-btn sushi-tile-btn--up" data-sushi-act="stock" data-id="' +
          escapeAttr(sample.id) +
          '" title="ストック" aria-label="ストック">↑</button>') +
      '<button type="button" class="sushi-tile-btn sushi-tile-btn--zoom" data-sushi-act="zoom" data-id="' +
      escapeAttr(sample.id) +
      '" title="拡大" aria-label="拡大">🔍</button>' +
      '<p class="sushi-tile-label"><strong>No.' +
      escapeHtml(sample.id) +
      "</strong> " +
      escapeHtml(sample.brand || "") +
      "</p>" +
      '<span class="sushi-tile-meta" hidden data-visible-site-h="' +
      visibleSiteH +
      '"></span>' +
      "</article>"
    );
  }

  function renderStock() {
    if (!els.stockBar) return;
    var html = "";
    for (var i = 0; i < MAX_STOCK; i++) {
      var s = stock[i];
      var sel = selectedStockSlot === i ? " is-selected" : "";
      if (s) {
        html +=
          '<div class="sushi-stock-slot is-filled' +
          sel +
          '" data-stock-slot="' +
          i +
          '">' +
          tileHtml(s, { stock: true, slot: i }) +
          '<button type="button" class="gct-btn gct-btn-primary sushi-stock-confirm" data-sushi-act="confirm" data-slot="' +
          i +
          '">これにします</button>' +
          "</div>";
      } else {
        html +=
          '<div class="sushi-stock-slot is-empty" data-stock-slot="' +
          i +
          '" aria-label="ストック枠' +
          (i + 1) +
          '（空）">' +
          '<span class="sushi-stock-empty-label">' +
          (i + 1) +
          "</span></div>";
      }
    }
    els.stockBar.innerHTML = html;
    els.stockBar.style.setProperty("--sushi-tile-w", TILE_W + "px");
    els.stockBar.style.setProperty("--sushi-tile-h", TILE_H + "px");
  }

  function rebuildLane(keepOffset) {
    laneSamples = laneList();
    if (!els.track) return;
    if (!laneSamples.length) {
      els.track.innerHTML =
        '<p class="sushi-lane-empty">ストック中のため、レーンに見本がありません</p>';
      loopWidth = 0;
      offsetX = 0;
      applyTrackTransform();
      return;
    }
    var copies = 2;
    var html = "";
    for (var c = 0; c < copies; c++) {
      laneSamples.forEach(function (s) {
        html += tileHtml(s, {});
      });
    }
    els.track.innerHTML = html;
    var oneSet = laneSamples.length * (TILE_W + TILE_GAP);
    loopWidth = oneSet;
    if (!keepOffset) offsetX = 0;
    if (loopWidth > 0) {
      offsetX = ((offsetX % loopWidth) + loopWidth) % loopWidth;
    }
    applyTrackTransform();
  }

  function applyTrackTransform() {
    if (!els.track) return;
    els.track.style.transform = "translate3d(" + -offsetX + "px,0,0)";
  }

  function tick(ts) {
    rafId = 0;
    if (!els.lane || !els.root || els.root.hidden) return;
    if (!lastTs) lastTs = ts;
    var dt = Math.min(64, ts - lastTs) / 1000;
    lastTs = ts;
    if (isPlaying && !isDragging && !isZoomed && loopWidth > 0) {
      offsetX += SPEED_PX_S * dt;
      if (offsetX >= loopWidth) offsetX -= loopWidth;
      applyTrackTransform();
    }
    rafId = window.requestAnimationFrame(tick);
  }

  function startRaf() {
    if (rafId) return;
    lastTs = 0;
    rafId = window.requestAnimationFrame(tick);
  }

  function stopRaf() {
    if (rafId) window.cancelAnimationFrame(rafId);
    rafId = 0;
    lastTs = 0;
  }

  function syncPlayButton() {
    if (!els.pause) return;
    els.pause.textContent = isPlaying ? "⏸" : "▶";
    els.pause.setAttribute("aria-pressed", isPlaying ? "false" : "true");
    els.pause.setAttribute(
      "aria-label",
      isPlaying ? "一時停止" : "再生"
    );
    els.pause.title = isPlaying ? "一時停止" : "再生";
  }

  function findSample(id) {
    if (!manifest) return null;
    for (var i = 0; i < manifest.samples.length; i++) {
      if (manifest.samples[i].id === id) return manifest.samples[i];
    }
    return null;
  }

  function addToStock(sample) {
    if (!sample) return;
    for (var i = 0; i < MAX_STOCK; i++) {
      if (stock[i] && stock[i].id === sample.id) return;
    }
    var slot = firstEmptyStock();
    if (slot >= 0) {
      stock[slot] = sample;
      selectedStockSlot = slot;
      animateStockFlash(slot);
      renderStock();
      rebuildLane(true);
      return;
    }
    openReplaceModal(sample);
  }

  function unstock(slot) {
    if (slot < 0 || slot >= MAX_STOCK || !stock[slot]) return;
    stock[slot] = null;
    if (selectedStockSlot === slot) selectedStockSlot = -1;
    renderStock();
    rebuildLane(true);
  }

  function animateStockFlash(slot) {
    window.setTimeout(function () {
      var el = els.stockBar && els.stockBar.querySelector('[data-stock-slot="' + slot + '"]');
      if (!el) return;
      el.classList.add("is-stock-in");
      window.setTimeout(function () {
        el.classList.remove("is-stock-in");
      }, MS_STOCK_IN);
    }, 0);
  }

  function openReplaceModal(sample) {
    if (!els.replace) return;
    els.replace.hidden = false;
    els.replace.dataset.pendingId = sample.id;
    var list = els.replace.querySelector(".sushi-replace-list");
    if (!list) return;
    list.innerHTML = "";
    for (var i = 0; i < MAX_STOCK; i++) {
      var s = stock[i];
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "sushi-replace-choice";
      btn.setAttribute("data-replace-slot", String(i));
      btn.textContent =
        i + 1 + "枠と入れ替え：No." + (s ? s.id + " " + (s.brand || "") : "（空）");
      list.appendChild(btn);
    }
  }

  function closeReplaceModal() {
    if (!els.replace) return;
    els.replace.hidden = true;
    delete els.replace.dataset.pendingId;
  }

  function sampleFolderKey(sample) {
    if (!sample) return "";
    if (sample.draftPath) return String(sample.draftPath).split("/")[0];
    if (sample.id && sample.key) return sample.id + "-" + sample.key;
    return "";
  }

  function fitEmbedIframeHeight(iframe) {
    if (!iframe) return;
    try {
      var doc = iframe.contentDocument;
      var win = iframe.contentWindow;
      if (!doc || !win) return;
      var root = doc.getElementById("preview-root");
      var footer =
        doc.getElementById("preview-footer") ||
        (root && root.querySelector(".site-footer"));
      var end = footer || root;
      if (!end) {
        iframe.style.height = "600px";
        iframe.style.minHeight = "0";
        return;
      }
      /* scrollHeightはviewport余白を拾うので、フッター下端で切る */
      var scrollY = win.pageYOffset || doc.documentElement.scrollTop || 0;
      var rect = end.getBoundingClientRect();
      var h = Math.ceil(rect.bottom + scrollY);
      var bodyStyle = win.getComputedStyle(doc.body);
      h += Math.ceil(parseFloat(bodyStyle.marginBottom) || 0);
      h = Math.max(h, 400);
      iframe.style.height = h + "px";
      iframe.style.minHeight = "0";
    } catch (err) {
      /* ignore */
    }
  }

  function scrollEmbedBy(iframe, deltaY) {
    if (!iframe) return;
    var frame = iframe.closest(".sushi-zoom-frame");
    if (frame) {
      frame.scrollTop += deltaY;
      return;
    }
    try {
      var win = iframe.contentWindow;
      if (win) win.scrollBy(0, deltaY);
    } catch (err) {
      /* ignore */
    }
  }

  function bindZoomWheel(frame, iframe) {
    if (!frame || !iframe) return;
    if (!frame.dataset.wheelBound) {
      frame.dataset.wheelBound = "1";
      frame.addEventListener(
        "wheel",
        function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          scrollEmbedBy(iframe, ev.deltaY);
        },
        { passive: false }
      );
    }
    function bindInner() {
      fitEmbedIframeHeight(iframe);
      try {
        var doc = iframe.contentDocument;
        if (!doc || doc.documentElement.dataset.sushiWheelBound) return;
        doc.documentElement.dataset.sushiWheelBound = "1";
        doc.addEventListener(
          "wheel",
          function (ev) {
            ev.preventDefault();
            ev.stopPropagation();
            scrollEmbedBy(iframe, ev.deltaY);
          },
          { passive: false, capture: true }
        );
      } catch (err2) {
        /* ignore */
      }
    }
    iframe.addEventListener("load", bindInner);
    bindInner();
  }

  function revealZoomIframe(iframe) {
    if (!iframe) return;
    fitEmbedIframeHeight(iframe);
    iframe.classList.add("is-ready");
    var frame = iframe.closest(".sushi-zoom-frame");
    if (frame) frame.classList.remove("is-pending");
    bindZoomWheel(frame, iframe);
    window.setTimeout(function () {
      fitEmbedIframeHeight(iframe);
    }, 400);
    window.setTimeout(function () {
      fitEmbedIframeHeight(iframe);
    }, 1200);
  }

  function openZoom(sample) {
    if (!sample || !els.zoomLayer || !els.zoomInner) return;
    /* 閲覧専用回路: embedPreview 専用ブート（編集・保存に入らない） */
    isZoomed = true;
    var folder = sampleFolderKey(sample);
    var src =
      "index.html?embedPreview=1&sample=" +
      encodeURIComponent(folder) +
      "&v=sushi-zoom-live-v5";
    els.zoomInner.innerHTML =
      '<div class="sushi-zoom-frame is-pending">' +
      '<p class="sushi-zoom-pending" aria-live="polite">見本を準備しています…</p>' +
      '<iframe class="sushi-zoom-iframe" title="見本プレビュー No.' +
      escapeAttr(sample.id) +
      '" src="' +
      escapeAttr(src) +
      '"></iframe>' +
      "</div>" +
      '<p class="sushi-zoom-cap">No.' +
      escapeHtml(sample.id) +
      " " +
      escapeHtml(sample.brand || "") +
      "</p>" +
      '<button type="button" class="gct-btn sushi-zoom-close" data-sushi-act="zoom-close">閉じる</button>';
    var iframe = els.zoomInner.querySelector(".sushi-zoom-iframe");
    var frame = els.zoomInner.querySelector(".sushi-zoom-frame");
    bindZoomWheel(frame, iframe);
    if (iframe) {
      var failSafe = window.setTimeout(function () {
        if (isZoomed) revealZoomIframe(iframe);
      }, 12000);
      iframe.addEventListener("load", function () {
        /* ready は postMessage。load だけだと初期キャンバスが見える */
        window.clearTimeout(failSafe);
        window.setTimeout(function () {
          if (isZoomed && iframe && !iframe.classList.contains("is-ready")) {
            revealZoomIframe(iframe);
          }
        }, 8000);
      });
    }
    els.zoomLayer.hidden = false;
    els.zoomLayer.classList.add("is-open");
  }

  function closeZoom() {
    if (!els.zoomLayer) return;
    isZoomed = false;
    els.zoomLayer.classList.remove("is-open");
    window.setTimeout(function () {
      if (!isZoomed && els.zoomLayer) {
        els.zoomLayer.hidden = true;
        if (els.zoomInner) els.zoomInner.innerHTML = "";
      }
    }, MS_ZOOM);
  }

  function onEmbedReadyMessage(ev) {
    if (!ev || !ev.data || ev.data.type !== "sushi-embed-ready") return;
    if (!isZoomed || !els.zoomInner) return;
    var iframe = els.zoomInner.querySelector(".sushi-zoom-iframe");
    if (!iframe) return;
    if (ev.source && iframe.contentWindow && ev.source !== iframe.contentWindow) return;
    revealZoomIframe(iframe);
  }

  var BOOT_MSGS = [
    "ただいまサンプルをレーンに流しています…",
    "並べ方を調整しています…",
    "まもなく表示します…"
  ];
  var bootMsgTimer = null;
  var bootMsgIndex = 0;

  function bootLoadingEl() {
    return $("sushi-boot-loading");
  }

  function bootMsgEl() {
    return $("sushi-boot-loading-msg");
  }

  function setBootMsg(i) {
    bootMsgIndex = Math.max(0, Math.min(i, BOOT_MSGS.length - 1));
    var el = bootMsgEl();
    if (el) el.textContent = BOOT_MSGS[bootMsgIndex];
  }

  function startBootMsgCycle() {
    stopBootMsgCycle();
    setBootMsg(0);
    bootMsgTimer = window.setInterval(function () {
      if (bootMsgIndex >= BOOT_MSGS.length - 1) return;
      setBootMsg(bootMsgIndex + 1);
    }, 1000);
  }

  function stopBootMsgCycle() {
    if (bootMsgTimer) {
      window.clearInterval(bootMsgTimer);
      bootMsgTimer = null;
    }
  }

  function showBootLoading() {
    var el = bootLoadingEl();
    if (!el) return;
    el.hidden = false;
    el.classList.add("is-open");
    startBootMsgCycle();
  }

  function hideBootLoading() {
    stopBootMsgCycle();
    var el = bootLoadingEl();
    if (!el) return;
    el.classList.remove("is-open");
    el.hidden = true;
  }

  function preloadLaneImages(samples) {
    samples = samples || [];
    var urls = samples.map(function (s) {
      return previewUrl(s);
    });
    if (!urls.length) return Promise.resolve();
    return Promise.all(
      urls.map(function (url) {
        return new Promise(function (resolve) {
          var img = new Image();
          var done = function () {
            resolve();
          };
          img.onload = done;
          img.onerror = done;
          img.src = url;
        });
      })
    );
  }

  function waitMinMs(ms) {
    return new Promise(function (resolve) {
      window.setTimeout(resolve, ms);
    });
  }

  function tutorialSeen() {
    try {
      return localStorage.getItem(TUTORIAL_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function setTutorialSeen() {
    try {
      localStorage.setItem(TUTORIAL_KEY, "1");
    } catch (e) {
      /* ignore */
    }
  }

  function showTutorial(force) {
    if (!els.tutorial) return;
    if (!force && tutorialSeen()) return;
    els.tutorial.hidden = false;
    els.tutorial.classList.add("is-open");
  }

  function hideTutorial(markSeen) {
    if (!els.tutorial) return;
    els.tutorial.classList.remove("is-open");
    els.tutorial.hidden = true;
    if (markSeen) setTutorialSeen();
  }

  function setupDrag() {
    if (!els.lane || els.lane.dataset.dragBound) return;
    els.lane.dataset.dragBound = "1";
    var startX = 0;
    var startOffset = 0;

    function onDown(clientX) {
      if (isZoomed) return;
      isDragging = true;
      dragMoved = false;
      startX = clientX;
      startOffset = offsetX;
      els.lane.classList.add("is-dragging");
    }

    function onMove(clientX) {
      if (!isDragging) return;
      var dx = clientX - startX;
      if (Math.abs(dx) > 4) dragMoved = true;
      offsetX = startOffset - dx;
      if (loopWidth > 0) {
        offsetX = ((offsetX % loopWidth) + loopWidth) % loopWidth;
      }
      applyTrackTransform();
    }

    function onUp() {
      if (!isDragging) return;
      isDragging = false;
      els.lane.classList.remove("is-dragging");
      /* 手動後の自動再開：一時停止中でなければ継続（既存「paused のまま」に相当＝isPlaying 維持） */
    }

    els.lane.addEventListener("pointerdown", function (ev) {
      if (ev.target.closest("button")) return;
      els.lane.setPointerCapture(ev.pointerId);
      onDown(ev.clientX);
    });
    els.lane.addEventListener("pointermove", function (ev) {
      onMove(ev.clientX);
    });
    els.lane.addEventListener("pointerup", onUp);
    els.lane.addEventListener("pointercancel", onUp);
    els.lane.addEventListener(
      "click",
      function (ev) {
        if (!dragMoved) return;
        ev.preventDefault();
        ev.stopPropagation();
        dragMoved = false;
      },
      true
    );
  }

  function onRootClick(ev) {
    var t = ev.target;
    if (!t || !t.closest) return;

    var actBtn = t.closest("[data-sushi-act]");
    if (actBtn) {
      var act = actBtn.getAttribute("data-sushi-act");
      if (act === "stock") {
        ev.preventDefault();
        addToStock(findSample(actBtn.getAttribute("data-id")));
        return;
      }
      if (act === "unstock") {
        ev.preventDefault();
        var slot = Number(actBtn.getAttribute("data-slot"));
        var slotEl = actBtn.closest(".sushi-stock-slot");
        if (slotEl) {
          slotEl.classList.add("is-stock-out");
          window.setTimeout(function () {
            unstock(slot);
          }, MS_STOCK_OUT);
        } else {
          unstock(slot);
        }
        return;
      }
      if (act === "zoom") {
        ev.preventDefault();
        openZoom(findSample(actBtn.getAttribute("data-id")));
        return;
      }
      if (act === "zoom-close") {
        ev.preventDefault();
        closeZoom();
        return;
      }
      if (act === "confirm") {
        ev.preventDefault();
        confirmPick(Number(actBtn.getAttribute("data-slot")));
        return;
      }
    }

    var replaceBtn = t.closest("[data-replace-slot]");
    if (replaceBtn && els.replace && !els.replace.hidden) {
      var at = Number(replaceBtn.getAttribute("data-replace-slot"));
      var pending = findSample(els.replace.dataset.pendingId);
      if (pending && at >= 0 && at < MAX_STOCK) {
        stock[at] = pending;
        selectedStockSlot = at;
        closeReplaceModal();
        renderStock();
        rebuildLane(true);
      }
      return;
    }

    if (t.closest("[data-sushi-replace-cancel]")) {
      closeReplaceModal();
      return;
    }

    if (t.closest("[data-sushi-tutorial-ok]")) {
      hideTutorial(true);
      return;
    }

    var stockSlot = t.closest(".sushi-stock-slot.is-filled");
    if (stockSlot && !t.closest("button")) {
      selectedStockSlot = Number(stockSlot.getAttribute("data-stock-slot"));
      renderStock();
    }
  }

  async function confirmPick(slot) {
    var sample = null;
    if (typeof slot === "number" && slot >= 0 && stock[slot]) {
      sample = stock[slot];
      selectedStockSlot = slot;
    } else if (selectedStockSlot >= 0 && stock[selectedStockSlot]) {
      sample = stock[selectedStockSlot];
    } else if (stockCount() === 1) {
      for (var i = 0; i < MAX_STOCK; i++) {
        if (stock[i]) {
          sample = stock[i];
          selectedStockSlot = i;
          break;
        }
      }
    }
    if (!sample) {
      window.alert("ストックに見本を入れてから、「これにします」を押してください。");
      return;
    }
    if (!onConfirm) return;
    stopRaf();
    closeZoom();
    var draft = await fetchDraft(sample);
    onConfirm({ sample: sample, draft: draft });
  }

  function setup() {
    bindEls();
    if (!window.__sushiEmbedReadyBound) {
      window.__sushiEmbedReadyBound = true;
      window.addEventListener("message", onEmbedReadyMessage);
    }
    if (!els.root || els.root.dataset.sushiBound === "2") return;
    els.root.dataset.sushiBound = "2";
    els.root.addEventListener("click", onRootClick);
    if (els.pause) {
      els.pause.addEventListener("click", function () {
        isPlaying = !isPlaying;
        syncPlayButton();
      });
    }

    if (els.help) {
      els.help.addEventListener("click", function () {
        showTutorial(true);
      });
    }
    if (els.zoomLayer) {
      els.zoomLayer.addEventListener("click", function (ev) {
        if (ev.target === els.zoomLayer) closeZoom();
      });
    }
    setupDrag();
  }

  async function mount(opts) {
    onConfirm = opts && opts.onConfirm;
    bindEls();
    setup();
    showBootLoading();
    var ready = false;
    var failSafe = window.setTimeout(function () {
      if (!ready) {
        ready = true;
        hideBootLoading();
      }
    }, 15000);
    try {
      var minShow = waitMinMs(900);
      await loadManifest();
      stock = [null, null, null];
      selectedStockSlot = -1;
      isPlaying = true;
      isZoomed = false;
      isDragging = false;
      offsetX = 0;
      syncPlayButton();
      renderStock();
      rebuildLane(false);
      await Promise.race([
        preloadLaneImages(laneSamples),
        waitMinMs(12000)
      ]);
      await minShow;
    } catch (e) {
      /* 失敗でもレーンは出す */
    }
    window.clearTimeout(failSafe);
    ready = true;
    if (els.root) {
      els.root.style.setProperty("--sushi-tile-w", TILE_W + "px");
      els.root.style.setProperty("--sushi-tile-h", TILE_H + "px");
      els.root.style.setProperty("--sushi-tile-gap", TILE_GAP + "px");
      els.root.style.setProperty("--sushi-zoom-ms", MS_ZOOM + "ms");
      els.root.style.setProperty("--sushi-stock-in-ms", MS_STOCK_IN + "ms");
      els.root.style.setProperty("--sushi-stock-out-ms", MS_STOCK_OUT + "ms");
    }
    hideBootLoading();
    startRaf();
    showTutorial(false);
    if (els.help) els.help.hidden = false;
    if (els.helpRail) els.helpRail.hidden = false;
  }

  function unmount() {
    hideBootLoading();
    stopRaf();
    closeZoom();
    closeReplaceModal();
    hideTutorial(false);
    isPlaying = false;
    if (els.help) els.help.hidden = true;
    if (els.helpRail) els.helpRail.hidden = true;
  }

  /** 監査報告用 */
  function getTileMetrics() {
    var scale = TILE_W / SITE_DESIGN_W;
    return {
      tileW: TILE_W,
      tileH: TILE_H,
      tileGap: TILE_GAP,
      siteDesignW: SITE_DESIGN_W,
      speedPxS: SPEED_PX_S,
      scale: scale,
      visibleSiteHeightPx: Math.round(TILE_H / scale),
      note:
        "タイル幅にサイト設計幅" +
        SITE_DESIGN_W +
        "pxを合わせた縮尺で、タイル高さ内にページ上端から約" +
        Math.round(TILE_H / scale) +
        "px相当が見える想定（preview.png 上部クリップ）"
    };
  }

  global.SushiBelt = {
    setup: setup,
    mount: mount,
    unmount: unmount,
    loadManifest: loadManifest,
    getTileMetrics: getTileMetrics
  };
})(window);
