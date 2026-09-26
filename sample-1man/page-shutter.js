/* 進む画面の移り。6色はメーカーの COLOR_WAVE_FIELD と同じ色。左右の置き方30通りを一巡するまで戻さない。 */
(function () {
  var KEYS = ["clinic", "green", "cafe", "ink", "brick", "sakura"];
  var HEX = {
    clinic: "#1a4d8c",
    green: "#3d8a48",
    cafe: "#5c4033",
    ink: "#2e3333",
    brick: "#e07020",
    sakura: "#c95d7a"
  };
  var DUR = 1200;
  var BANDS = 8;
  var DECK_KEY = "sample-1man-shutter-deck";
  var FLIGHT_KEY = "sample-1man-shutter-flight";
  var busy = false;
  var flying = null;

  function injectCss() {
    if (document.getElementById("page-shutter-css")) return;
    var style = document.createElement("style");
    style.id = "page-shutter-css";
    style.textContent =
      "#cross-shutter{position:fixed;inset:0;z-index:141;overflow:hidden;pointer-events:auto;background:transparent}" +
      "#cross-shutter[hidden]{display:none!important}" +
      ".cross-shutter-pane{position:absolute;left:0;transform:translateX(-100%)}";
    document.head.appendChild(style);
  }

  function shuffle(list) {
    for (var i = list.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = list[i];
      list[i] = list[j];
      list[j] = tmp;
    }
    return list;
  }

  function allPairs() {
    var list = [];
    var i, j;
    for (i = 0; i < KEYS.length; i++) {
      for (j = 0; j < KEYS.length; j++) {
        if (i !== j) list.push(KEYS[i] + "|" + KEYS[j]);
      }
    }
    return list;
  }

  function loadDeck() {
    try {
      var raw = sessionStorage.getItem(DECK_KEY);
      if (raw) {
        var data = JSON.parse(raw);
        if (data && data.order && data.order.length === 30 && data.cursor >= 0 && data.cursor <= 30) return data;
      }
    } catch (err) { /* 壊れていたら作り直す */ }
    return { order: shuffle(allPairs()), cursor: 0 };
  }

  function saveDeck(data) {
    try { sessionStorage.setItem(DECK_KEY, JSON.stringify(data)); } catch (err) { /* 記憶できなくてもその場の色は出す */ }
  }

  function nextPair() {
    var deck = loadDeck();
    if (deck.cursor >= deck.order.length) {
      var last = deck.order[deck.order.length - 1];
      var order = shuffle(allPairs());
      if (order[0] === last && order.length > 1) {
        var swap = order[0];
        order[0] = order[1];
        order[1] = swap;
      }
      deck = { order: order, cursor: 0 };
    }
    var id = deck.order[deck.cursor];
    deck.cursor += 1;
    saveDeck(deck);
    var parts = id.split("|");
    return [parts[0], parts[1]];
  }

  function ensureLayer() {
    injectCss();
    var layer = document.getElementById("cross-shutter");
    if (!layer) {
      layer = document.createElement("div");
      layer.id = "cross-shutter";
      layer.hidden = true;
      layer.setAttribute("aria-hidden", "true");
      document.body.appendChild(layer);
    }
    if (layer.childElementCount !== BANDS) {
      layer.textContent = "";
      for (var i = 0; i < BANDS; i++) {
        var pane = document.createElement("div");
        pane.className = "cross-shutter-pane";
        pane.dataset.side = i % 2 === 0 ? "left" : "right";
        layer.appendChild(pane);
      }
    }
    return layer;
  }

  function layout(layer, pair) {
    var viewW = layer.clientWidth;
    var viewH = layer.clientHeight;
    var bandH = Math.ceil(viewH / BANDS) + 1;
    var barW = Math.max(160, Math.round(viewW * 0.7));
    var panes = layer.querySelectorAll(".cross-shutter-pane");
    panes.forEach(function (pane, idx) {
      var fromLeft = idx % 2 === 0;
      pane.style.background = HEX[pair[fromLeft ? 0 : 1]] || HEX.clinic;
      pane.style.width = barW + "px";
      pane.style.height = bandH + "px";
      pane.style.top = (idx * viewH) / BANDS + "px";
      pane.style.left = "0";
      pane.dataset.from = String(fromLeft ? -barW : viewW);
      pane.dataset.to = String(fromLeft ? viewW : -barW);
    });
    return panes;
  }

  function reduced() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function play(onCross, onDone) {
    if (busy) return false;
    if (reduced()) {
      if (onCross) onCross();
      if (onDone) onDone();
      return true;
    }
    var pair = nextPair();
    flying = pair;
    var layer = ensureLayer();
    layer.hidden = false;
    void layer.offsetWidth;
    var panes = layout(layer, pair);
    busy = true;
    panes.forEach(function (pane) {
      pane.animate(
        [
          { transform: "translateX(" + pane.dataset.from + "px)" },
          { transform: "translateX(" + pane.dataset.to + "px)" }
        ],
        { duration: DUR, easing: "linear", fill: "both" }
      );
    });
    window.setTimeout(function () {
      try { if (onCross) onCross(); } catch (err) { /* 切替に失敗しても帯は抜ける */ }
    }, DUR / 2);
    window.setTimeout(function () {
      panes.forEach(function (pane) {
        pane.getAnimations().forEach(function (anim) { anim.cancel(); });
      });
      layer.hidden = true;
      busy = false;
      flying = null;
      if (onDone) onDone();
    }, DUR + 30);
    return true;
  }

  function go(href) {
    if (busy || !href) return false;
    if (reduced()) {
      window.location.href = href;
      return true;
    }
    return play(function () {
      try {
        sessionStorage.setItem(FLIGHT_KEY, JSON.stringify({ pair: flying }));
      } catch (err) { /* 次の画面では帯の抜けだけ省略 */ }
      window.location.href = href;
    });
  }

  function resume() {
    var raw = null;
    try { raw = sessionStorage.getItem(FLIGHT_KEY); } catch (err) { raw = null; }
    if (!raw) return;
    try { sessionStorage.removeItem(FLIGHT_KEY); } catch (err) { /* 次の読み込みで消える */ }
    if (reduced()) return;
    var flight = null;
    try { flight = JSON.parse(raw); } catch (err) { return; }
    if (!flight || !flight.pair) return;
    var layer = ensureLayer();
    layer.hidden = false;
    void layer.offsetWidth;
    var panes = layout(layer, flight.pair);
    busy = true;
    panes.forEach(function (pane) {
      var from = Number(pane.dataset.from);
      var to = Number(pane.dataset.to);
      var mid = (from + to) / 2;
      pane.animate(
        [
          { transform: "translateX(" + mid + "px)" },
          { transform: "translateX(" + to + "px)" }
        ],
        { duration: DUR / 2, easing: "linear", fill: "both" }
      );
    });
    window.setTimeout(function () {
      panes.forEach(function (pane) {
        pane.getAnimations().forEach(function (anim) { anim.cancel(); });
      });
      layer.hidden = true;
      busy = false;
    }, DUR / 2 + 30);
  }

  window.PageShutter = {
    play: play,
    go: go,
    resume: resume,
    isBusy: function () { return busy; }
  };
})();
