/**
 * 回転寿司サンプル選択（S3）
 * manifest.json を読み、ストック最大3・確定で draft を親へ渡す
 */
(function (global) {
  "use strict";

  const SLIDE_MS = 2300;
  const MAX_STOCK = 3;

  let manifest = null;
  let index = 0;
  let paused = false;
  let timer = null;
  let stock = [];
  let onConfirm = null;

  async function loadManifest() {
    if (manifest) return manifest;
    const res = await fetch("sushi-samples/manifest.json?v=t30-shots-1");
    manifest = await res.json();
    return manifest;
  }

  function currentSample() {
    if (!manifest || !manifest.samples.length) return null;
    return manifest.samples[index % manifest.samples.length];
  }

  function previewUrl(sample) {
    return "sushi-samples/" + sample.previewPath;
  }

  function renderDish(host) {
    const s = currentSample();
    if (!host || !s) return;
    host.innerHTML =
      '<img class="sushi-dish-img" src="' +
      previewUrl(s) +
      '" alt="' +
      escapeAttr(s.brand) +
      '">' +
      '<p class="sushi-dish-meta"><strong>No.' +
      s.id +
      "</strong> " +
      escapeHtml(s.brand) +
      "</p>" +
      '<p class="sushi-dish-blurb">' +
      escapeHtml(s.blurb) +
      "</p>";
  }

  function renderStock(bar) {
    if (!bar) return;
    bar.innerHTML = stock
      .map(function (s, i) {
        return (
          '<button type="button" class="sushi-stock-item" data-stock-index="' +
          i +
          '" title="' +
          escapeAttr(s.brand) +
          '">' +
          '<img src="' +
          previewUrl(s) +
          '" alt="">' +
          "<span>" +
          escapeHtml(s.id) +
          "</span></button>"
        );
      })
      .join("");
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

  function next() {
    if (!manifest) return;
    index = (index + 1) % manifest.samples.length;
    renderDish(document.getElementById("sushi-dish"));
  }

  function prev() {
    if (!manifest) return;
    index = (index - 1 + manifest.samples.length) % manifest.samples.length;
    renderDish(document.getElementById("sushi-dish"));
  }

  function tick() {
    if (paused) return;
    next();
  }

  function startTimer() {
    stopTimer();
    timer = window.setInterval(tick, SLIDE_MS);
  }

  function stopTimer() {
    if (timer) window.clearInterval(timer);
    timer = null;
  }

  function addStock(sample) {
    if (stock.some(function (x) {
      return x.id === sample.id;
    })) {
      return { ok: true, replaced: false };
    }
    if (stock.length < MAX_STOCK) {
      stock.push(sample);
      return { ok: true, replaced: false };
    }
    return { ok: false, needReplace: true, sample: sample };
  }

  function replaceStock(at, sample) {
    if (at < 0 || at >= stock.length) return;
    stock[at] = sample;
  }

  function removeStock(at) {
    if (at < 0 || at >= stock.length) return;
    stock.splice(at, 1);
  }

  async function fetchDraft(sample) {
    const res = await fetch("sushi-samples/" + sample.draftPath + "?v=s2-1");
    return res.json();
  }

  async function mount(opts) {
    onConfirm = opts && opts.onConfirm;
    const root = document.getElementById("entry-sushi-field");
    if (!root) return;
    await loadManifest();
    index = 0;
    stock = [];
    paused = false;
    renderDish(document.getElementById("sushi-dish"));
    renderStock(document.getElementById("sushi-stock-bar"));
    startTimer();
  }

  function unmount() {
    stopTimer();
  }

  function setup() {
    const root = document.getElementById("entry-sushi-field");
    if (!root || root.dataset.sushiBound) return;
    root.dataset.sushiBound = "1";

    document.getElementById("sushi-pause")?.addEventListener("click", function () {
      paused = !paused;
      this.textContent = paused ? "再開" : "一時停止";
      this.setAttribute("aria-pressed", paused ? "true" : "false");
    });
    document.getElementById("sushi-prev")?.addEventListener("click", function () {
      prev();
    });
    document.getElementById("sushi-next")?.addEventListener("click", function () {
      next();
    });
    document.getElementById("sushi-stock")?.addEventListener("click", function () {
      const s = currentSample();
      if (!s) return;
      const r = addStock(s);
      const bar = document.getElementById("sushi-stock-bar");
      if (r.needReplace) {
        const pick = window.prompt(
          "ストックは3つまでです。入れ替える番号を選んでください（1〜" + stock.length + "）",
          "1"
        );
        const at = Number(pick) - 1;
        if (!Number.isFinite(at) || at < 0 || at >= stock.length) return;
        replaceStock(at, s);
      }
      renderStock(bar);
    });
    document.getElementById("sushi-pick")?.addEventListener("click", async function () {
      const s = currentSample();
      if (!s || !onConfirm) return;
      stopTimer();
      const draft = await fetchDraft(s);
      onConfirm({ sample: s, draft: draft });
    });
    document.getElementById("sushi-stock-bar")?.addEventListener("click", async function (ev) {
      const btn = ev.target.closest("[data-stock-index]");
      if (!btn) return;
      const at = Number(btn.getAttribute("data-stock-index"));
      const s = stock[at];
      if (!s) return;
      const action = window.prompt(
        "No." + s.id + " " + s.brand + "\n1=確定  2=候補から外す  3=今の皿と差し替え",
        "1"
      );
      if (action === "2") {
        removeStock(at);
        renderStock(document.getElementById("sushi-stock-bar"));
        return;
      }
      if (action === "3") {
        const cur = currentSample();
        if (cur) replaceStock(at, cur);
        renderStock(document.getElementById("sushi-stock-bar"));
        return;
      }
      if (action === "1" || action === "" || action == null) {
        stopTimer();
        const draft = await fetchDraft(s);
        if (onConfirm) onConfirm({ sample: s, draft: draft });
      }
    });
  }

  global.SushiBelt = {
    setup: setup,
    mount: mount,
    unmount: unmount,
    loadManifest: loadManifest
  };
})(window);
