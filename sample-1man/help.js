(() => {
  const params = new URLSearchParams(window.location.search);
  const fromOrder = params.get("return") === "order";
  const hash = (window.location.hash || "").replace(/^#/, "");

  const stickyBack = document.getElementById("help-back-sticky");
  const footBack = document.getElementById("help-back-foot");

  if (stickyBack) {
    stickyBack.hidden = fromOrder;
  }
  if (footBack) {
    footBack.hidden = fromOrder;
  }

  document.querySelectorAll(".help-back-local").forEach((link) => {
    link.hidden = !fromOrder;
  });

  function openSection(id) {
    if (!id) return null;
    const section = document.getElementById(id);
    if (!section) return null;
    if (section.classList.contains("help-section")) {
      section.open = true;
      return section;
    }
    const parent = section.closest(".help-section");
    if (parent) parent.open = true;
    return section;
  }

  function scrollToId(id) {
    const target = openSection(id);
    if (!target) return;
    requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  if (hash) scrollToId(hash);

  window.addEventListener("hashchange", () => {
    const next = (window.location.hash || "").replace(/^#/, "");
    scrollToId(next);
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
      (el.querySelector(".help-chunk-title") || el.querySelector("summary") || {}).textContent || "";
    const keywords = el.getAttribute("data-help-keywords") || "";
    const body = el.textContent || "";
    return normalize(title + " " + keywords + " " + body);
  }

  const entries = [];
  document.querySelectorAll(".help-section").forEach((section) => {
    const summary = section.querySelector("summary");
    entries.push({
      id: section.id,
      label: summary ? summary.textContent.trim() : section.id,
      kind: "section",
      hay: entryText(section)
    });
    section.querySelectorAll(".help-chunk[id], .help-chunk[data-help-keywords]").forEach((chunk, idx) => {
      const titleEl = chunk.querySelector(".help-chunk-title");
      const label = titleEl ? titleEl.textContent.trim() : "項目";
      const id = chunk.id || section.id + "-chunk-" + idx;
      if (!chunk.id) chunk.id = id;
      entries.push({
        id,
        label: (summary ? summary.textContent.trim() + " ／ " : "") + label,
        kind: "chunk",
        hay: entryText(chunk) + " " + normalize(summary ? summary.textContent : "")
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
        history.pushState(null, "", "#" + item.id);
        scrollToId(item.id);
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
