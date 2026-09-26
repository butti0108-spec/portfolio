(() => {
  const params = new URLSearchParams(window.location.search);
  const fromOrder = params.get("return") === "order";
  const SECTION_IDS = ["start", "why", "scope", "faq", "zip", "hub", "copy", "images", "look"];

  const stickyBack = document.getElementById("help-back-sticky");
  const footBack = document.getElementById("help-back-foot");
  const home = document.getElementById("help-home");

  document.querySelectorAll(".help-back-local").forEach((link) => {
    link.hidden = !fromOrder;
  });

  /* 注文画面から開いた一覧には、見出しの「注文画面に戻る」を出す。項目の中では各項目のボタンを使う */
  function syncOrderBack() {
    if (!fromOrder) {
      if (stickyBack) stickyBack.hidden = false;
      if (footBack) footBack.hidden = false;
      return;
    }
    const onHome = !!(home && !home.hidden);
    if (stickyBack) stickyBack.hidden = !onHome;
    if (footBack) footBack.hidden = !onHome;
  }

  function resolveSectionId(id) {
    if (!id || id === "help-toc" || id === "help-home" || id === "help-search") return null;
    if (SECTION_IDS.indexOf(id) >= 0) return id;
    const el = document.getElementById(id);
    if (!el) return null;
    const section = el.closest(".help-section");
    return section && section.id ? section.id : null;
  }

  function showHome() {
    document.body.classList.remove("help-topic-open");
    if (home) home.hidden = false;
    document.querySelectorAll(".help-section").forEach((section) => {
      section.hidden = true;
    });
    document.querySelectorAll(".help-toc-card").forEach((card) => {
      card.classList.remove("is-active");
    });
    syncOrderBack();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showTopic(id) {
    const sectionId = resolveSectionId(id);
    if (!sectionId) {
      showHome();
      return null;
    }
    document.body.classList.add("help-topic-open");
    if (home) home.hidden = true;
    let target = null;
    document.querySelectorAll(".help-section").forEach((section) => {
      const on = section.id === sectionId;
      section.hidden = !on;
      if (on) target = section;
    });
    document.querySelectorAll(".help-toc-card").forEach((card) => {
      card.classList.toggle("is-active", card.getAttribute("data-help-nav") === sectionId);
    });
    syncOrderBack();
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
      if (id !== sectionId) {
        const chunk = document.getElementById(id);
        if (chunk) chunk.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
    return target;
  }

  function applyHash() {
    const raw = (window.location.hash || "").replace(/^#/, "");
    if (!raw || raw === "help-toc" || raw === "help-home") {
      showHome();
      return;
    }
    showTopic(raw);
  }

  if (window.PageShutter) window.PageShutter.resume();

  applyHash();
  function openForward(id) {
    function go() {
      history.pushState(null, "", "#" + id);
      showTopic(id);
    }
    if (!id) return;
    if (window.PageShutter && window.PageShutter.isBusy()) return;
    if (!window.PageShutter) {
      go();
      return;
    }
    window.PageShutter.play(go);
  }

  document.querySelectorAll(".help-toc-card").forEach((card) => {
    card.addEventListener("click", (ev) => {
      if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey || ev.button !== 0) return;
      ev.preventDefault();
      const id = card.getAttribute("data-help-nav") || String(card.getAttribute("href") || "").replace(/^#/, "");
      openForward(id);
    });
  });

  window.addEventListener("hashchange", applyHash);

  document.querySelectorAll(".help-back-toc").forEach((link) => {
    link.addEventListener("click", (ev) => {
      ev.preventDefault();
      history.pushState(null, "", "#help-toc");
      showHome();
    });
  });

  function normalize(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
      .replace(/[、。．，・\s　]+/g, " ")
      .trim();
  }

  function entryText(el) {
    const title =
      (el.querySelector(".help-chunk-title") || el.querySelector(".help-panel-title") || {}).textContent ||
      "";
    const keywords = el.getAttribute("data-help-keywords") || "";
    const body = el.textContent || "";
    return normalize(title + " " + keywords + " " + body);
  }

  const entries = [];
  document.querySelectorAll(".help-section").forEach((section) => {
    const titleEl = section.querySelector(".help-panel-title");
    entries.push({
      id: section.id,
      label: titleEl ? titleEl.textContent.trim() : section.id,
      kind: "section",
      hay: entryText(section)
    });
    section.querySelectorAll(".help-chunk[id], .help-chunk[data-help-keywords]").forEach((chunk, idx) => {
      const chunkTitle = chunk.querySelector(".help-chunk-title");
      const label = chunkTitle ? chunkTitle.textContent.trim() : "項目";
      const id = chunk.id || section.id + "-chunk-" + idx;
      if (!chunk.id) chunk.id = id;
      entries.push({
        id,
        label: (titleEl ? titleEl.textContent.trim() + " ／ " : "") + label,
        kind: "chunk",
        hay: entryText(chunk) + " " + normalize(titleEl ? titleEl.textContent : "")
      });
    });
  });

  const input = document.getElementById("help-search-input");
  const results = document.getElementById("help-search-results");
  const hint = document.getElementById("help-search-hint");
  if (!input || !results) return;

  function score(hay, tokens) {
    let s = 0;
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (!t) continue;
      if (hay.indexOf(t) >= 0) s += 2;
      else return 0;
    }
    return s;
  }

  function render(matches, query) {
    results.innerHTML = "";
    if (!query) {
      results.hidden = true;
      if (hint) hint.textContent = "キーワードを入れると、関係ありそうな項目が出ます。";
      return;
    }
    if (!matches.length) {
      results.hidden = false;
      const li = document.createElement("li");
      li.className = "help-search-empty";
      li.textContent = "見つかりませんでした。別の言葉で試すか、目次から探してください。";
      results.appendChild(li);
      if (hint) hint.textContent = "候補なし";
      return;
    }
    results.hidden = false;
    if (hint) hint.textContent = matches.length + "件ヒット";
    matches.slice(0, 12).forEach((item) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = "#" + item.id;
      a.textContent = item.label;
      a.addEventListener("click", (ev) => {
        ev.preventDefault();
        openForward(item.id);
      });
      li.appendChild(a);
      results.appendChild(li);
    });
  }

  function runSearch() {
    const q = normalize(input.value);
    if (!q) {
      render([], "");
      return;
    }
    const tokens = q.split(" ").filter(Boolean);
    const scored = entries
      .map((item) => ({ item, s: score(item.hay, tokens) }))
      .filter((row) => row.s > 0)
      .sort((a, b) => b.s - a.s || a.item.label.length - b.item.label.length)
      .map((row) => row.item);
    render(scored, q);
  }

  input.addEventListener("input", runSearch);
  input.addEventListener("search", runSearch);
})();
