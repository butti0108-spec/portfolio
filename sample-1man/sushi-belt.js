/**
 * 回転寿司サンプル選択（監査指示 2026-09-16）
 * 連続レーン（右→左 36px/s）＋ストック最大3＋拡大／チュートリアル
 */
(function (global) {
  "use strict";

  /* レーンは画面に約4〜5枚見える大きさ（CSS --sushi-tile-* と揃える） */
  var TILE_W = 210;
  var TILE_H = 296;
  var TILE_GAP = 18;
  var SITE_DESIGN_W = 1200;
  var SPEED_PX_S = 36;
  var MS_STOCK_IN = 360;
  var MS_STOCK_OUT = 240;
  var MS_ZOOM = 680;
  var MS_GUIDE_SUCK = 420;
  var MAX_STOCK = 3;
  var TOUCH_PAUSE_MS = 3000;
  var CLICK_DEAD_PX = 8;
  var GUIDE_LS_KEY = "sample1man-sushi-guide-v1";

  function isFineHoverPointer() {
    return (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches
    );
  }

  function isCoarsePointer() {
    return (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(pointer: coarse)").matches
    );
  }
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
  var hoverPaused = false;
  var touchPaused = false;
  var touchPauseTimer = null;

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
    els.replace = $("sushi-replace-modal");
    els.zoomLayer = $("sushi-zoom-layer");
    els.zoomInner = $("sushi-zoom-inner");
    els.slotPop = $("sushi-slot-pop");
    els.guideModal = $("sushi-guide-modal");
    els.hintOpen = $("sushi-hint-open");
  }

  function tileHtml(sample, opts) {
    opts = opts || {};
    var scale = TILE_W / SITE_DESIGN_W;
    var visibleSiteH = Math.round(TILE_H / scale);
    var sizeStyle = opts.stock
      ? ""
      : ' style="width:' + TILE_W + "px;height:" + TILE_H + 'px"';
    var labelHtml = opts.stock
      ? ""
      : '<p class="sushi-tile-label"><strong>No.' +
        escapeHtml(sample.id) +
        "</strong> " +
        escapeHtml(sample.brand || "") +
        "</p>";
    return (
      '<article class="sushi-tile' +
      (opts.stock ? " sushi-tile--stock" : "") +
      '" data-sample-id="' +
      escapeAttr(sample.id) +
      '"' +
      sizeStyle +
      ">" +
      '<div class="sushi-tile-clip">' +
      '<img class="sushi-tile-img" src="' +
      escapeAttr(previewUrl(sample)) +
      '" alt="' +
      escapeAttr(sample.brand || "") +
      '" width="' +
      TILE_W +
      '" decoding="async" loading="eager" fetchpriority="low">' +
      "</div>" +
      '<button type="button" class="sushi-tile-btn sushi-tile-btn--zoom" data-sushi-act="zoom" data-id="' +
      escapeAttr(sample.id) +
      '" title="大きく見てみる" aria-label="大きく見てみる">🔍</button>' +
      labelHtml +
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
          '<div class="sushi-stock-col' +
          sel +
          '" data-stock-slot="' +
          i +
          '">' +
          '<div class="sushi-stock-slot is-filled" aria-label="上の枠の見本">' +
          tileHtml(s, { stock: true, slot: i }) +
          "</div></div>";
      } else {
        html +=
          '<div class="sushi-stock-col" data-stock-slot="' +
          i +
          '">' +
          '<div class="sushi-stock-slot is-empty" aria-label="空き枠"></div></div>';
      }
    }
    els.stockBar.innerHTML = html;
    els.stockBar.style.setProperty("--sushi-tile-w", TILE_W + "px");
    els.stockBar.style.setProperty("--sushi-tile-h", TILE_H + "px");
  }

  function fallbackLoopWidth() {
    /* 1周＝タイルn個＋あいだのギャップn個（次コピー先頭までの距離） */
    return Math.max(1, laneSamples.length * (TILE_W + TILE_GAP));
  }

  function measureLoopWidth() {
    if (!els.track || !laneSamples.length) {
      loopWidth = 0;
      return;
    }
    var tiles = els.track.querySelectorAll(".sushi-tile");
    var n = laneSamples.length;
    if (tiles.length >= n * 2 && tiles[0] && tiles[n]) {
      var measured = tiles[n].offsetLeft - tiles[0].offsetLeft;
      if (measured > 0) {
        loopWidth = Math.round(measured);
        return;
      }
    }
    loopWidth = fallbackLoopWidth();
  }

  function rebuildLane(keepOffset) {
    laneSamples = laneList();
    if (!els.track) return;
    if (!laneSamples.length) {
      els.track.innerHTML =
        '<p class="sushi-lane-empty">選んだサンプルのため、いま流れるサンプルはありません</p>';
      loopWidth = 0;
      offsetX = 0;
      applyTrackTransform();
      return;
    }
    /* 3本分置くと一周つなぎ時も次コピーが常に先読み済み */
    var copies = 3;
    var html = "";
    for (var c = 0; c < copies; c++) {
      laneSamples.forEach(function (s) {
        html += tileHtml(s, {});
      });
    }
    els.track.innerHTML = html;
    measureLoopWidth();
    if (!keepOffset) {
      offsetX = loopWidth > 0 ? loopWidth : 0;
    } else if (loopWidth > 0) {
      offsetX = normalizeLoopOffset(offsetX);
    }
    applyTrackTransform();
    window.requestAnimationFrame(function () {
      var prev = loopWidth;
      var ratio = prev > 0 ? offsetX / prev : 1;
      measureLoopWidth();
      if (loopWidth > 0) {
        offsetX = keepOffset ? ratio * loopWidth : loopWidth;
        offsetX = normalizeLoopOffset(offsetX);
      }
      applyTrackTransform();
      warmVisibleLaneImages();
    });
  }

  function normalizeLoopOffset(x) {
    if (!(loopWidth > 0)) return 0;
    /* 中央コピー帯 [L, 2L) に保ち、一周つなぎを画面の端で飛ばしにくくする */
    while (x >= loopWidth * 2) x -= loopWidth;
    while (x < loopWidth) x += loopWidth;
    return x;
  }

  function applyTrackTransform() {
    if (!els.track) return;
    var x = Math.round(offsetX * 100) / 100;
    els.track.style.transform = "translate3d(" + -x + "px,0,0)";
  }

  function canAutoScroll() {
    return (
      isPlaying &&
      !hoverPaused &&
      !touchPaused &&
      !isDragging &&
      !isZoomed &&
      loopWidth > 0
    );
  }

  function clearTouchPause() {
    touchPaused = false;
    if (touchPauseTimer) {
      window.clearTimeout(touchPauseTimer);
      touchPauseTimer = null;
    }
  }

  function armTouchPause() {
    touchPaused = true;
    if (touchPauseTimer) window.clearTimeout(touchPauseTimer);
    touchPauseTimer = window.setTimeout(function () {
      touchPaused = false;
      touchPauseTimer = null;
    }, TOUCH_PAUSE_MS);
  }

  function shouldArmTouchPause(ev) {
    if (isFineHoverPointer()) return false;
    if (ev && ev.pointerType === "touch") return true;
    if (isCoarsePointer()) return true;
    return false;
  }

  function tick(ts) {
    rafId = 0;
    if (!els.lane || !els.root || els.root.hidden) return;
    if (!lastTs) lastTs = ts;
    var dt = Math.min(64, ts - lastTs) / 1000;
    lastTs = ts;
    if (canAutoScroll()) {
      offsetX += SPEED_PX_S * dt;
      offsetX = normalizeLoopOffset(offsetX);
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
        "上の枠" +
        (i + 1) +
        "と入れ替え：No." +
        (s ? s.id + " " + (s.brand || "") : "（空）");
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
      "&brand=" +
      encodeURIComponent(sample.brand || "") +
      "&v=sushi-zoom-live-v8";
    els.zoomInner.innerHTML =
      '<div class="sushi-zoom-frame is-pending">' +
      '<p class="sushi-zoom-pending" aria-live="polite">サンプルを準備しています…</p>' +
      '<iframe class="sushi-zoom-iframe" title="サンプルプレビュー No.' +
      escapeAttr(sample.id) +
      '" src="' +
      escapeAttr(src) +
      '"></iframe>' +
      "</div>" +
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
            if (img.decode) {
              img.decode().then(resolve, resolve);
            } else {
              resolve();
            }
          };
          img.onload = done;
          img.onerror = function () {
            resolve();
          };
          img.src = url;
        });
      })
    );
  }

  function warmVisibleLaneImages() {
    if (!els.track) return;
    var imgs = els.track.querySelectorAll(".sushi-tile-img");
    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i];
      if (img.decode && img.complete) {
        img.decode().catch(function () {});
      }
    }
  }

  function waitMinMs(ms) {
    return new Promise(function (resolve) {
      window.setTimeout(resolve, ms);
    });
  }

  function setupHoverPause() {
    if (!els.lane || els.lane.dataset.hoverBound) return;
    els.lane.dataset.hoverBound = "1";
    els.lane.addEventListener("pointerenter", function (ev) {
      if (!isFineHoverPointer()) return;
      if (ev.pointerType && ev.pointerType !== "mouse") return;
      hoverPaused = true;
    });
    els.lane.addEventListener("pointerleave", function () {
      hoverPaused = false;
    });
  }

  function setupResizeMeasure() {
    if (window.__sushiResizeBound) return;
    window.__sushiResizeBound = true;
    window.addEventListener("resize", function () {
      if (!els.root || els.root.hidden) return;
      var prev = loopWidth;
      var ratio = prev > 0 ? offsetX / prev : 0;
      measureLoopWidth();
      if (loopWidth > 0) {
        offsetX = ratio * loopWidth;
        offsetX = normalizeLoopOffset(offsetX);
      }
      applyTrackTransform();
    });
  }

  function setupDrag() {
    if (!els.lane || els.lane.dataset.dragBound) return;
    els.lane.dataset.dragBound = "1";
    var startX = 0;
    var startOffset = 0;
    var lastPointerEv = null;
    var downOnTile = null;

    function onDown(clientX, ev) {
      if (isZoomed) return;
      isDragging = true;
      dragMoved = false;
      startX = clientX;
      startOffset = offsetX;
      downOnTile = null;
      if (ev && ev.target && ev.target.closest) {
        var tile = ev.target.closest(".sushi-lane .sushi-tile");
        if (tile && !ev.target.closest("button")) {
          downOnTile = tile.getAttribute("data-sample-id");
        }
      }
      els.lane.classList.add("is-dragging");
      clearTouchPause();
    }

    function onMove(clientX) {
      if (!isDragging) return;
      var dx = clientX - startX;
      if (Math.abs(dx) > CLICK_DEAD_PX) dragMoved = true;
      offsetX = startOffset - dx;
      offsetX = normalizeLoopOffset(offsetX);
      applyTrackTransform();
    }

    function onUp(ev) {
      if (!isDragging) return;
      isDragging = false;
      els.lane.classList.remove("is-dragging");
      if (!dragMoved && downOnTile) {
        addToStock(findSample(downOnTile));
        downOnTile = null;
        return;
      }
      downOnTile = null;
      if (!dragMoved && shouldArmTouchPause(lastPointerEv || ev)) {
        armTouchPause();
      }
    }

    els.lane.addEventListener("pointerdown", function (ev) {
      if (ev.target.closest("button")) return;
      lastPointerEv = ev;
      try {
        els.lane.setPointerCapture(ev.pointerId);
      } catch (err) {
        /* synthetic / unsupported capture */
      }
      onDown(ev.clientX, ev);
    });
    els.lane.addEventListener("pointermove", function (ev) {
      lastPointerEv = ev;
      onMove(ev.clientX);
    });
    els.lane.addEventListener("pointerup", function (ev) {
      lastPointerEv = ev;
      onUp(ev);
    });
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

  function closeSlotPop() {
    if (!els.slotPop) return;
    els.slotPop.hidden = true;
    delete els.slotPop.dataset.slot;
  }

  function placeSlotPopOverStock(anchorEl) {
    var card = els.slotPop && els.slotPop.querySelector(".sushi-slot-pop-card");
    var bar = els.stockBar;
    if (!card || !bar) return;
    var barR = bar.getBoundingClientRect();
    var cw = card.offsetWidth || 256;
    var ch = card.offsetHeight || 180;
    /* 3枠バンドの中央にかぶせる（クリックした枠があればその列を優先） */
    var focusR = barR;
    if (anchorEl && anchorEl.getBoundingClientRect) {
      var aR = anchorEl.getBoundingClientRect();
      if (aR.width > 0 && aR.height > 0) focusR = aR;
    }
    var left = Math.round(focusR.left + (focusR.width - cw) / 2);
    var top = Math.round(barR.top + (barR.height - ch) / 2);
    left = Math.max(8, Math.min(left, window.innerWidth - cw - 8));
    top = Math.max(8, Math.min(top, window.innerHeight - ch - 8));
    card.style.left = left + "px";
    card.style.top = top + "px";
  }

  function openSlotPop(slot, anchorEl) {
    if (!els.slotPop || slot < 0 || !stock[slot]) return;
    selectedStockSlot = slot;
    els.slotPop.hidden = false;
    els.slotPop.dataset.slot = String(slot);
    els.slotPop.querySelectorAll("[data-slot]").forEach(function (btn) {
      btn.setAttribute("data-slot", String(slot));
    });
    renderStock();
    /* 視線を飛ばさない：上の3枠の上にかぶせる */
    placeSlotPopOverStock(anchorEl);
    requestAnimationFrame(function () {
      placeSlotPopOverStock(anchorEl);
    });
  }

  function guideSeen() {
    try {
      return localStorage.getItem(GUIDE_LS_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function markGuideSeen() {
    try {
      localStorage.setItem(GUIDE_LS_KEY, "1");
    } catch (e) {
      /* ignore */
    }
  }

  function resetGuideCardMotion() {
    if (!els.guideModal) return;
    var card = els.guideModal.querySelector(".sushi-guide-card");
    els.guideModal.classList.remove("is-sucking");
    if (!card) return;
    card.style.transition = "";
    card.style.transform = "";
    card.style.opacity = "";
  }

  function openGuideModal() {
    if (!els.guideModal) return;
    resetGuideCardMotion();
    els.guideModal.hidden = false;
  }

  function finishCloseGuide(persist) {
    resetGuideCardMotion();
    if (els.guideModal) els.guideModal.hidden = true;
    if (persist) markGuideSeen();
    if (persist && els.hintOpen) {
      els.hintOpen.classList.remove("is-hint-pulse");
      /* reflow so animation can replay */
      void els.hintOpen.offsetWidth;
      els.hintOpen.classList.add("is-hint-pulse");
      window.setTimeout(function () {
        if (els.hintOpen) els.hintOpen.classList.remove("is-hint-pulse");
      }, 700);
    }
  }

  function closeGuideModal(persist) {
    if (!els.guideModal || els.guideModal.hidden) return;
    if (els.guideModal.classList.contains("is-sucking")) return;

    /* 破棄時はアニメなし。OK閉じは「操作のヒント」へ吸い込む */
    if (!persist || !els.hintOpen) {
      finishCloseGuide(!!persist);
      return;
    }

    var card = els.guideModal.querySelector(".sushi-guide-card");
    if (!card) {
      finishCloseGuide(true);
      return;
    }

    var cR = card.getBoundingClientRect();
    var hR = els.hintOpen.getBoundingClientRect();
    if (cR.width < 8 || hR.width < 8) {
      finishCloseGuide(true);
      return;
    }

    var dx = hR.left + hR.width / 2 - (cR.left + cR.width / 2);
    var dy = hR.top + hR.height / 2 - (cR.top + cR.height / 2);
    var s = Math.min(hR.width / cR.width, hR.height / cR.height, 0.12);
    s = Math.max(0.06, s);

    els.guideModal.classList.add("is-sucking");
    card.style.transformOrigin = "center center";
    card.style.transition = "none";
    card.style.transform = "translate(0px, 0px) scale(1)";
    card.style.opacity = "1";
    /* 二重 rAF：初期状態を確定してから吸い込みを開始 */
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        card.style.transition =
          "transform " +
          MS_GUIDE_SUCK +
          "ms cubic-bezier(0.45, 0.05, 0.55, 0.95), opacity " +
          MS_GUIDE_SUCK +
          "ms ease";
        card.style.transform = "translate(" + dx + "px, " + dy + "px) scale(" + s + ")";
        card.style.opacity = "0";
      });
    });
    window.setTimeout(function () {
      finishCloseGuide(true);
    }, MS_GUIDE_SUCK + 40);
  }

  function maybeShowFirstGuide() {
    /* 「サンプルから選ぶ」で寿司に入ったら毎回強制表示（閉じたら操作のヒントへ吸い込む） */
    openGuideModal();
  }

  function onRootClick(ev) {
    var t = ev.target;
    if (!t || !t.closest) return;

    if (t.closest("[data-sushi-guide-close]")) {
      ev.preventDefault();
      closeGuideModal(true);
      return;
    }

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
        var slotU = Number(actBtn.getAttribute("data-slot"));
        closeSlotPop();
        var slotEl = actBtn.closest(".sushi-stock-slot") ||
          (els.stockBar && els.stockBar.querySelector('[data-stock-slot="' + slotU + '"] .sushi-stock-slot'));
        if (slotEl) {
          slotEl.classList.add("is-stock-out");
          window.setTimeout(function () {
            unstock(slotU);
          }, MS_STOCK_OUT);
        } else {
          unstock(slotU);
        }
        return;
      }
      if (act === "zoom") {
        ev.preventDefault();
        closeSlotPop();
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
        closeSlotPop();
        confirmPick(Number(actBtn.getAttribute("data-slot")));
        return;
      }
      if (act === "slot-pop-close") {
        ev.preventDefault();
        closeSlotPop();
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

    var stockCol = t.closest(".sushi-stock-col");
    if (
      stockCol &&
      stockCol.querySelector(".sushi-stock-slot.is-filled") &&
      !t.closest("button")
    ) {
      ev.preventDefault();
      openSlotPop(Number(stockCol.getAttribute("data-stock-slot")), stockCol);
      return;
    }

    if (els.slotPop && !els.slotPop.hidden && !t.closest(".sushi-slot-pop-card")) {
      closeSlotPop();
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
      window.alert(
        "まだ上の枠にサンプルがありません。下のサンプルを短くクリックすると、ここに入れられます。"
      );
      return;
    }
    if (!onConfirm) return;
    stopRaf();
    closeZoom();
    closeSlotPop();
    var draft = await fetchDraft(sample);
    onConfirm({ sample: sample, draft: draft });
  }

  function setup() {
    bindEls();
    if (!window.__sushiEmbedReadyBound) {
      window.__sushiEmbedReadyBound = true;
      window.addEventListener("message", onEmbedReadyMessage);
    }
    if (!els.root || els.root.dataset.sushiBound === "3") return;
    els.root.dataset.sushiBound = "3";
    els.root.addEventListener("click", onRootClick);

    if (els.zoomLayer) {
      els.zoomLayer.addEventListener("click", function (ev) {
        if (ev.target === els.zoomLayer) closeZoom();
      });
    }
    if (els.hintOpen && !els.hintOpen.dataset.bound) {
      els.hintOpen.dataset.bound = "1";
      els.hintOpen.addEventListener("click", function () {
        openGuideModal();
      });
    }
    setupDrag();
    setupHoverPause();
    setupResizeMeasure();
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
      hoverPaused = false;
      clearTouchPause();
      offsetX = 0;
      renderStock();
      rebuildLane(false);
      await Promise.race([
        preloadLaneImages(laneSamples),
        waitMinMs(12000)
      ]);
      await minShow;
      measureLoopWidth();
      offsetX = normalizeLoopOffset(offsetX || loopWidth);
      warmVisibleLaneImages();
      applyTrackTransform();
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
    maybeShowFirstGuide();
  }

  function unmount() {
    hideBootLoading();
    stopRaf();
    closeZoom();
    closeReplaceModal();
    closeSlotPop();
    closeGuideModal(false);
    isPlaying = false;
    hoverPaused = false;
    clearTouchPause();
    stock = [null, null, null];
    selectedStockSlot = -1;
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
