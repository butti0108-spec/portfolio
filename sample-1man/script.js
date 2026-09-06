(() => {
  const root = document.getElementById("preview-root");
  const viewport = document.getElementById("preview-viewport");
  const form = document.getElementById("order-form");
  if (!root || !form) return;

  const STORAGE_KEY = "sample-1man-order-v22";

  /* A=横長だけ／B=左右分割だけ／C=混合（旧: A小さい B混合 C横長） */
  const LAYOUT_META = {
    a: { code: "A", name: "横長", blurb: "横いっぱいの枠だけ" },
    b: { code: "B", name: "左右分割", blurb: "左右に割る枠だけ" },
    c: { code: "C", name: "混合", blurb: "横長と左右分割を混ぜる" }
  };
  const LAYOUT_IDS = Object.keys(LAYOUT_META);
  const LAYOUT_LEGACY = { e: "a", d: "a", f: "a" };

  const LAYOUT_BLOCKS = [
    { id: "hero", label: "キャッチ", selector: "#hero" },
    { id: "values", label: "下の枠", selector: "#hero-values-block" },
    { id: "about", label: "見本枠1", selector: "#about" },
    { id: "works", label: "見本枠2", selector: "#works" },
    { id: "address", label: "住所", selector: "#address" },
    { id: "contact", label: "ご連絡", selector: "#contact" }
  ];
  const LAYOUT_BLOCK_IDS = LAYOUT_BLOCKS.map((b) => b.id);
  const LAYOUT_DEFAULT_ORDER = LAYOUT_BLOCK_IDS.slice();
  const LAYOUT_SIZE_BY_SET = {
    a: { hero: "L", values: "L", about: "L", works: "L", address: "L", contact: "L" },
    b: { hero: "H", values: "H", about: "H", works: "H", address: "H", contact: "H" },
    c: { hero: "L", values: "H", about: "L", works: "H", address: "H", contact: "L" }
  };

  function normalizeLayoutId(id) {
    if (LAYOUT_IDS.indexOf(id) >= 0) return id;
    if (LAYOUT_LEGACY[id]) return LAYOUT_LEGACY[id];
    return "a";
  }

  /* 旧スキーマ（A小さい/B混合/C横長）→ 新スキーマ */
  function migrateLayoutPattern(id, schema) {
    const raw = String(id || "a");
    if (schema === 2) return normalizeLayoutId(raw);
    const fromV1 = { a: "a", b: "c", c: "a", e: "a", d: "a", f: "a" };
    return normalizeLayoutId(fromV1[raw] || "a");
  }

  function normalizeLayoutOrder(order) {
    const src = Array.isArray(order) ? order.map(String) : [];
    const out = [];
    src.forEach((id) => {
      if (LAYOUT_BLOCK_IDS.indexOf(id) >= 0 && out.indexOf(id) < 0) out.push(id);
    });
    LAYOUT_BLOCK_IDS.forEach((id) => {
      if (out.indexOf(id) < 0) out.push(id);
    });
    return out;
  }

  function layoutSizeFor(blockId, setId) {
    const set = LAYOUT_SIZE_BY_SET[normalizeLayoutId(setId)] || LAYOUT_SIZE_BY_SET.a;
    return set[blockId] || "S";
  }

  /** カード用ミニワイヤーHTML（並び＝layoutOrder、形＝セットA/B/C） */
  function buildLayoutWireInnerHtml(setId, order, opts) {
    const ghost = opts && opts.ghost ? " lw-ghost" : "";
    const ids = normalizeLayoutOrder(order);
    let html = "";
    let pending = null;

    function cellHtml(id, size) {
      const meta = LAYOUT_BLOCKS.find((b) => b.id === id);
      const label = meta ? meta.label : id;
      const sizeClass = size === "L" ? " lw-L lw-wide" : " lw-H";
      return (
        '<span class="lw' +
        sizeClass +
        ghost +
        '">' +
        escapeHtml(label) +
        "</span>"
      );
    }

    function flushPending() {
      if (!pending) return;
      html +=
        '<span class="lw-row lw-row--grow">' + cellHtml(pending, "H") + "</span>";
      pending = null;
    }

    ids.forEach((id) => {
      const size = layoutSizeFor(id, setId);
      if (size === "L") {
        flushPending();
        html += cellHtml(id, "L");
        return;
      }
      if (pending) {
        html +=
          '<span class="lw-row lw-row--grow">' +
          cellHtml(pending, "H") +
          cellHtml(id, "H") +
          "</span>";
        pending = null;
      } else {
        pending = id;
      }
    });
    flushPending();
    return html;
  }

  function renderLayoutCardWires() {
    const order = normalizeLayoutOrder(store.layoutOrder);
    document.querySelectorAll("[data-layout-wire]").forEach((host) => {
      const setId = normalizeLayoutId(host.getAttribute("data-layout-wire") || "a");
      const ghost = host.hasAttribute("data-layout-wire-ghost");
      host.innerHTML = buildLayoutWireInnerHtml(setId, order, { ghost: ghost });
    });
  }

  /** 各入力欄の最大文字数（ぴったりまで可） */
  const FIELD_MAX = {
    brand_name: 20,
    font_wish_name: 80,
    hero_title: 24,
    hero_lead_1: 40,
    hero_lead_2: 40,
    hero_lead_3: 40,
    value_1_title: 20,
    value_1_text: 40,
    value_2_title: 20,
    value_2_text: 40,
    value_3_title: 20,
    value_3_text: 40,
    about_section_name: 30,
    about_heading: 30,
    about_name: 20,
    about_lead: 200,
    acc_1_title: 20,
    acc_1_body: 160,
    acc_2_title: 20,
    acc_2_body: 160,
    acc_3_title: 20,
    acc_3_body: 160,
    works_section_name: 30,
    works_heading: 30,
    works_lead: 40,
    work_1_title: 20,
    work_1_text: 40,
    work_2_title: 20,
    work_2_text: 40,
    work_3_title: 20,
    work_3_text: 40,
    contact_section_name: 30,
    contact_label: 20,
    contact_email: 80,
    contact_note_1: 40,
    contact_note_2: 40,
    hours_text: 60,
    access_text: 60,
    address_text: 80,
    extra_notes: 200,
    work_1_url: 200,
    work_1_link_label: 30,
    work_2_url: 200,
    work_2_link_label: 30,
    work_3_url: 200,
    work_3_link_label: 30
  };

  const IMAGE_EDGE = {
    hero_image: 1920,
    logo_image: 800,
    default: 1600
  };

  /* 色番号は見本サイトの上→下・左→右（ヘッダー／フッターは背景→文字の2工程）。0は章の注意（注文画面のみ） */
  const STEPS = [
    { id: "purpose", label: "用途", needsConfirm: true, num: 0 },
    { id: "layout", label: "レイアウト", needsConfirm: true, num: 0 },
    { id: "guide", label: "進め方", needsConfirm: true, num: 0 },
    { id: "global-preset", label: "プリセット", needsConfirm: true, num: 1 },
    { id: "global-chrome-bg", label: "ヘッダー背景", needsConfirm: true, num: 2 },
    { id: "global-chrome-ink", label: "ヘッダー文字", needsConfirm: true, num: 3 },
    { id: "global-bg", label: "背景", needsConfirm: true, num: 4 },
    { id: "hero-color", label: "キャッチ色", needsConfirm: true, num: 5 },
    { id: "values-color", label: "下の枠色", needsConfirm: true, num: 6 },
    { id: "global-body", label: "本文", needsConfirm: true, num: 7 },
    { id: "global-accent", label: "アクセント", needsConfirm: true, num: 8 },
    { id: "global-card", label: "カード・角", needsConfirm: true, num: 9 },
    { id: "contact-color", label: "ご連絡色", needsConfirm: true, num: 10 },
    { id: "hero-image", label: "キャッチ画像", needsConfirm: true, num: 11 },
    { id: "about-images", label: "枠1の写真", needsConfirm: true, num: 12 },
    { id: "works-images", label: "枠2の画像", needsConfirm: true, num: 13 },
    { id: "logo-text", label: "ロゴ", needsConfirm: true, num: 14 },
    { id: "heading-font", label: "見出し書体", needsConfirm: true, num: 15 },
    { id: "catch-font", label: "キャッチ書体", needsConfirm: true, num: 16 },
    { id: "hero-text", label: "キャッチ文", needsConfirm: true, num: 17 },
    { id: "values-text", label: "下の枠", needsConfirm: true, num: 18 },
    { id: "body-font", label: "本文書体", needsConfirm: true, num: 19 },
    { id: "about-text", label: "枠1", needsConfirm: true, num: 20 },
    { id: "works-text", label: "枠2", needsConfirm: true, num: 21 },
    { id: "extra-content", label: "追加", needsConfirm: true, num: 22 },
    { id: "contact-text", label: "ご連絡文", needsConfirm: true, num: 23 },
    { id: "finish", label: "提出", needsConfirm: true, num: 24 }
  ];

  const IMAGE_STEP_IDS = new Set([
    "hero-image",
    "about-images",
    "works-images"
  ]);

  const TEXT_STEP_IDS = new Set([
    "logo-text",
    "heading-font",
    "catch-font",
    "hero-text",
    "values-text",
    "body-font",
    "about-text",
    "works-text",
    "extra-content",
    "contact-text",
    "finish"
  ]);

  const LAST_COLOR_STEP_ID = "contact-color";
  const LAST_IMAGE_STEP_ID = "works-images";

  const BADGE_META = {
    "global-preset": { kind: "color", displayNum: 1, label: "プリセット" },
    "global-chrome-bg": { kind: "color", displayNum: 2, label: "ヘッダー背景" },
    "global-chrome-ink": { kind: "color", displayNum: 3, label: "ヘッダー文字" },
    "global-bg": { kind: "color", displayNum: 4, label: "背景" },
    "hero-color": { kind: "color", displayNum: 5, label: "キャッチ色" },
    "values-color": { kind: "color", displayNum: 6, label: "下の枠色" },
    "global-body": { kind: "color", displayNum: 7, label: "本文色" },
    "global-accent": { kind: "color", displayNum: 8, label: "アクセント" },
    "global-card": { kind: "color", displayNum: 9, label: "カード" },
    "contact-color": { kind: "color", displayNum: 10, label: "ご連絡色" },
    "hero-image": { kind: "image", displayNum: 1, label: "キャッチ画像" },
    "about-images": { kind: "image", displayNum: 2, label: "枠1の写真" },
    "works-images": { kind: "image", displayNum: 3, label: "枠2の画像" },
    "logo-text": { kind: "text", displayNum: 1, label: "ロゴ" },
    "heading-font": { kind: "text", displayNum: 2, label: "見出し書体" },
    "catch-font": { kind: "text", displayNum: 3, label: "キャッチ書体" },
    "hero-text": { kind: "text", displayNum: 4, label: "キャッチ文" },
    "values-text": { kind: "text", displayNum: 5, label: "下の枠文" },
    "body-font": { kind: "text", displayNum: 6, label: "本文書体" },
    "about-text": { kind: "text", displayNum: 7, label: "枠1" },
    "works-text": { kind: "text", displayNum: 8, label: "枠2" },
    "extra-content": { kind: "text", displayNum: 9, label: "追加" },
    "contact-text": { kind: "text", displayNum: 10, label: "ご連絡文" },
    "finish": { kind: "text", displayNum: 11, label: "提出" }
  };

  /** 用途パック：テンプレではなく「何を書くか／埋まった見栄え」用の仮文 */
  const PURPOSE_PACKS = {
    personal: {
      counts: { "hero-leads": 2, "hero-values": 3, "about-accordions": 1, "works-list": 2 },
      fields: {
        brand_name: "お名前（仮）",
        hero_title: "お名前（仮）",
        hero_lead_1: "肩書きや得意分野を書く",
        hero_lead_2: "誰向けの一ページかを書く",
        value_1_title: "強み1",
        value_1_text: "短い説明を書く",
        value_2_title: "強み2",
        value_2_text: "短い説明を書く",
        value_3_title: "方針",
        value_3_text: "短い説明を書く",
        about_section_name: "紹介",
        about_heading: "〇〇について",
        about_name: "氏名を書く",
        about_lead: "経歴・得意なこと・方針を2〜3行で書く",
        acc_1_title: "経歴など",
        acc_1_body: "【項目】具体を書く／【項目】具体を書く",
        works_section_name: "仕事",
        works_heading: "これまでの仕事",
        works_lead: "代表例の見出しを並べる",
        work_1_title: "案件名（仮）",
        work_1_text: "何をしたかを短く",
        work_2_title: "案件名（仮）",
        work_2_text: "何をしたかを短く",
        contact_section_name: "ご連絡",
        contact_label: "ご連絡",
        contact_note_1: "返信目安や受付時間を書く",
        contact_note_2: "問い合わせ方法の補足"
      }
    },
    company: {
      counts: { "hero-leads": 2, "hero-values": 3, "about-accordions": 1, "works-list": 2 },
      fields: {
        brand_name: "会社名（仮）",
        hero_title: "会社名（仮）",
        hero_lead_1: "事業内容を一文で書く",
        hero_lead_2: "誰のための会社かを書く",
        value_1_title: "強み1",
        value_1_text: "短い説明を書く",
        value_2_title: "強み2",
        value_2_text: "短い説明を書く",
        value_3_title: "方針",
        value_3_text: "短い説明を書く",
        about_section_name: "会社",
        about_heading: "会社案内",
        about_name: "屋号や代表名",
        about_lead: "設立・事業・大切にしていることを書く",
        acc_1_title: "事業内容など",
        acc_1_body: "【項目】具体を書く／【項目】具体を書く",
        works_section_name: "サービス",
        works_heading: "主なサービス",
        works_lead: "提供内容の見出しを並べる",
        work_1_title: "サービス名（仮）",
        work_1_text: "内容を短く書く",
        work_2_title: "サービス名（仮）",
        work_2_text: "内容を短く書く",
        contact_section_name: "ご連絡",
        contact_label: "ご連絡",
        contact_note_1: "受付時間や担当を書く",
        contact_note_2: "所在地の補足など"
      }
    },
    shop: {
      counts: { "hero-leads": 2, "hero-values": 3, "about-accordions": 1, "works-list": 2 },
      fields: {
        brand_name: "店名（仮）",
        hero_title: "店名（仮）",
        hero_lead_1: "お店の雰囲気を一文で書く",
        hero_lead_2: "どんな人向けかを書く",
        value_1_title: "こだわり1",
        value_1_text: "短い説明を書く",
        value_2_title: "こだわり2",
        value_2_text: "短い説明を書く",
        value_3_title: "雰囲気",
        value_3_text: "短い説明を書く",
        about_section_name: "お店",
        about_heading: "お店案内",
        about_name: "店名や店主名",
        about_lead: "開業・こだわり・おすすめを書く",
        acc_1_title: "こだわりなど",
        acc_1_body: "【項目】具体を書く／【項目】具体を書く",
        works_section_name: "メニュー",
        works_heading: "おすすめ",
        works_lead: "メニューやコースの見出しを並べる",
        work_1_title: "メニュー名（仮）",
        work_1_text: "内容を短く書く",
        work_2_title: "メニュー名（仮）",
        work_2_text: "内容を短く書く",
        contact_section_name: "ご連絡",
        contact_label: "ご連絡",
        contact_note_1: "営業時間や定休日を書く",
        contact_note_2: "予約方法の補足など"
      }
    },
    works: {
      counts: { "hero-leads": 2, "hero-values": 3, "about-accordions": 1, "works-list": 3 },
      fields: {
        brand_name: "屋号（仮）",
        hero_title: "屋号（仮）",
        hero_lead_1: "どんな仕事かを一文で書く",
        hero_lead_2: "事例を見せる一ページだと書く",
        value_1_title: "分野1",
        value_1_text: "短い説明を書く",
        value_2_title: "分野2",
        value_2_text: "短い説明を書く",
        value_3_title: "進め方",
        value_3_text: "短い説明を書く",
        about_section_name: "方針",
        about_heading: "方針・体制",
        about_name: "屋号や担当名",
        about_lead: "得意分野や進め方を書く",
        acc_1_title: "得意分野など",
        acc_1_body: "【項目】具体を書く／【項目】具体を書く",
        works_section_name: "事例",
        works_heading: "これまでの事例",
        works_lead: "事例の見出しを並べる",
        work_1_title: "事例名（仮）",
        work_1_text: "何をしたかを短く",
        work_2_title: "事例名（仮）",
        work_2_text: "何をしたかを短く",
        work_3_title: "事例名（仮）",
        work_3_text: "何をしたかを短く",
        contact_section_name: "ご連絡",
        contact_label: "ご連絡",
        contact_note_1: "相談の受け方を書く",
        contact_note_2: "返信目安などの補足"
      }
    },
    service: {
      counts: { "hero-leads": 2, "hero-values": 3, "about-accordions": 1, "works-list": 3 },
      fields: {
        brand_name: "サービス名（仮）",
        hero_title: "サービス名（仮）",
        hero_lead_1: "何のサービスかを一文で書く",
        hero_lead_2: "誰向けかを書く",
        value_1_title: "特徴1",
        value_1_text: "短い説明を書く",
        value_2_title: "特徴2",
        value_2_text: "短い説明を書く",
        value_3_title: "流れ",
        value_3_text: "短い説明を書く",
        about_section_name: "概要",
        about_heading: "サービスの概要",
        about_name: "屋号や担当名",
        about_lead: "対象・期間・進め方を書く",
        acc_1_title: "含まれる内容など",
        acc_1_body: "【項目】具体を書く／【項目】具体を書く",
        works_section_name: "メニュー",
        works_heading: "コース・料金",
        works_lead: "プランの見出しを並べる",
        work_1_title: "プラン名（仮）",
        work_1_text: "内容や目安料金を短く",
        work_2_title: "プラン名（仮）",
        work_2_text: "内容や目安料金を短く",
        work_3_title: "プラン名（仮）",
        work_3_text: "内容や目安料金を短く",
        contact_section_name: "ご連絡",
        contact_label: "ご連絡",
        contact_note_1: "申し込み・相談方法を書く",
        contact_note_2: "返信目安などの補足"
      }
    }
  };

  const PURPOSE_TEXT_STEPS = ["hero-text", "values-text", "about-text", "works-text", "contact-text", "logo-text"];

  function kindLabelJa(kind) {
    if (kind === "color") return "色";
    if (kind === "image") return "画像";
    return "文字";
  }

  function badgeDisplayName(stepId) {
    const meta = BADGE_META[stepId];
    if (!meta) {
      if (stepId === "purpose") return "0・用途";
      if (stepId === "layout") return "0・レイアウト";
      if (stepId === "guide") return "0・進め方";
      return stepId;
    }
    return kindLabelJa(meta.kind) + meta.displayNum + "・" + meta.label;
  }

  function formatMissingStepList(stepIds, max) {
    const limit = max == null ? 2 : max;
    if (!stepIds.length) return "";
    const labels = stepIds.slice(0, limit).map((id) => badgeDisplayName(id));
    const extra = stepIds.length - labels.length;
    let text = labels.map((label) => "「" + label + "」").join("");
    if (extra > 0) text += "ほか" + extra + "件";
    return text;
  }

  function stepHoverTip(stepId) {
    if (stepId === "purpose") {
      return store.confirmed.purpose ? "0・用途（完了）" : "0・用途";
    }
    if (stepId === "layout") {
      return store.confirmed.layout ? "0・レイアウト（完了）" : "0・レイアウト";
    }
    if (stepId === "guide") {
      return store.confirmed.guide ? "0・進め方（完了）" : "0・進め方";
    }
    let tip = badgeDisplayName(stepId);
    if (store.confirmed[stepId]) tip += "（完了）";
    else if (!canOpenStep(stepId)) {
      const hint = unlockHintForStep(stepId);
      if (hint) tip += " — " + hint;
    }
    return tip;
  }

  function setStepHoverTip(el, stepId) {
    if (!el || !stepId) return;
    const tip = stepHoverTip(stepId);
    el.setAttribute("data-tip", tip);
    el.removeAttribute("title");
    el.classList.add("has-step-tip");
  }

  function missingImageStepTip(item) {
    const name = item.name || "";
    if (name === "hero_image") return badgeDisplayName("hero-image");
    if (name.indexOf("about_image_") === 0) return badgeDisplayName("about-images");
    if (name.indexOf("work_") === 0) return badgeDisplayName("works-images");
    if (name === "logo_image") return badgeDisplayName("logo-text") + "（ロゴ画像）";
    return item.label || name;
  }

  function badgeKindClass(kind) {
    if (kind === "color") return "badge-kind-color";
    if (kind === "image") return "badge-kind-image";
    return "badge-kind-text";
  }

  function syncBadgeLabels() {
    root.querySelectorAll(".zone-badge[data-open-step]").forEach((btn) => {
      const stepId = btn.getAttribute("data-open-step");
      const meta = BADGE_META[stepId];
      if (!meta) return;
      btn.textContent = String(meta.displayNum);
      btn.classList.remove("badge-kind-color", "badge-kind-text", "badge-kind-image");
      btn.classList.add(badgeKindClass(meta.kind));
      btn.setAttribute("aria-label", badgeDisplayName(stepId) + "を開く");
    });
  }

  const COLOR_STEP_IDS_ORDERED = Object.keys(BADGE_META)
    .filter((id) => BADGE_META[id].kind === "color")
    .sort((a, b) => BADGE_META[a].displayNum - BADGE_META[b].displayNum);

  const IMAGE_STEP_IDS_ORDERED = Object.keys(BADGE_META)
    .filter((id) => BADGE_META[id].kind === "image")
    .sort((a, b) => BADGE_META[a].displayNum - BADGE_META[b].displayNum);

  const TEXT_STEP_IDS_ORDERED = Object.keys(BADGE_META)
    .filter((id) => BADGE_META[id].kind === "text")
    .sort((a, b) => BADGE_META[a].displayNum - BADGE_META[b].displayNum);

  const INTRO_STEP_IDS = new Set(["purpose", "layout", "guide"]);
  const EASY_PRESET_KEYS = ["clinic", "green", "cafe", "ink", "brick", "sakura"];
  const EASY_PRESET_LABELS = {
    clinic: "紺・きれいめ",
    green: "緑",
    cafe: "ベージュ",
    ink: "墨",
    brick: "オレンジ",
    sakura: "ピンク"
  };
  const DETAIL_PRESET_LABELS = {
    clinic: "紺・きれいめ",
    green: "緑",
    cafe: "ベージュ",
    ink: "墨",
    brick: "オレンジ",
    sakura: "ピンク",
    random: "ランダム"
  };
  const BLANK_CANVAS_COLORS = {
    pageBg: "#ffffff",
    pageBgSoft: "#f7f7f7",
    heroInk: "#111111",
    bodyInk: "#222222",
    bodyMuted: "#666666",
    chromeBg: "#ffffff",
    chromeInk: "#111111",
    accent: "#333333",
    cardBg: "#ffffff",
    valuesBg: "#f4f4f4",
    contactBg: "#ffffff",
    contactInk: "#111111"
  };
  const GRADIENT_DIRS = [
    { id: "to top", label: "上", arrow: "↑" },
    { id: "to top right", label: "右上", arrow: "↗" },
    { id: "to right", label: "右", arrow: "→" },
    { id: "to bottom right", label: "右下", arrow: "↘" },
    { id: "to bottom", label: "下", arrow: "↓" },
    { id: "to bottom left", label: "左下", arrow: "↙" },
    { id: "to left", label: "左", arrow: "←" },
    { id: "to top left", label: "左上", arrow: "↖" }
  ];
  const GRADIENT_BG_KEYS = new Set(["chromeBg", "pageBg", "accent", "cardBg", "valuesBg", "contactBg"]);

  const GUIDED_STEP_IDS = [].concat(
    COLOR_STEP_IDS_ORDERED,
    IMAGE_STEP_IDS_ORDERED,
    TEXT_STEP_IDS_ORDERED
  );

  const PROGRESS_BAR_STEP_IDS = COLOR_STEP_IDS_ORDERED.concat(
    IMAGE_STEP_IDS_ORDERED,
    TEXT_STEP_IDS_ORDERED
  );
  const PROGRESS_BAR_TOTAL = PROGRESS_BAR_STEP_IDS.length;

  const COLOR_STEP_FIELDS = {
    "global-preset": ["pageBg", "heroInk", "bodyInk", "chromeBg", "chromeInk", "accent", "cardBg", "valuesBg", "contactBg", "contactInk"],
    "global-chrome-bg": ["chromeBg"],
    "global-chrome-ink": ["chromeInk"],
    "global-bg": ["pageBg"],
    "global-body": ["bodyInk"],
    "global-accent": ["accent"],
    "global-card": ["cardBg"],
    "hero-color": ["heroInk"],
    "values-color": ["valuesBg"],
    "contact-color": ["contactBg", "contactInk"]
  };

  const STEP_IDS = STEPS.map((s) => s.id);
  const CONFIRM_STEPS = STEPS.filter((s) => s.needsConfirm);

  const STEP_IMAGE_KEYS = {
    "logo-text": ["logo_image"],
    "hero-image": ["hero_image"],
    "about-images": ["about_image_1", "about_image_2", "about_image_3", "about_image_4"],
    "works-images": ["work_1_image", "work_2_image", "work_3_image"]
  };

  const COUNT_IDS = ["hero-leads", "hero-values", "about-accordions", "about-photos", "works-list"];

  const COUNT_META = {};
  COUNT_IDS.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    COUNT_META[id] = {
      min: Number(el.getAttribute("data-min") || "1"),
      max: Number(el.getAttribute("data-max") || "1"),
      defaultCount: Number(el.getAttribute("data-count") || "1")
    };
  });

  const VAR_MAP = {
    pageBg: "--page-bg",
    pageBgSoft: "--page-bg-soft",
    heroInk: "--hero-ink",
    bodyInk: "--body-ink",
    bodyMuted: "--body-muted",
    chromeBg: "--chrome-bg",
    chromeInk: "--chrome-ink",
    accent: "--accent",
    cardBg: "--card-bg",
    valuesBg: "--values-bg",
    contactBg: "--contact-bg",
    contactInk: "--contact-ink"
  };

  const COLOR_HUES = [
    { id: "white", label: "白", light: "#ffffff", base: "#f5f5f5", dark: "#bdbdbd" },
    { id: "cream", label: "クリーム", light: "#fffaf0", base: "#f5efe4", dark: "#d4c4a8" },
    { id: "yellow", label: "黄", light: "#fff9c4", base: "#fdd835", dark: "#f9a825" },
    { id: "orange", label: "橙", light: "#ffe0b2", base: "#fb8c00", dark: "#e65100" },
    { id: "red", label: "赤", light: "#ffcdd2", base: "#e53935", dark: "#b71c1c" },
    { id: "pink", label: "桃", light: "#f8bbd0", base: "#ec407a", dark: "#880e4f" },
    { id: "purple", label: "紫", light: "#e1bee7", base: "#8e24aa", dark: "#4a148c" },
    { id: "blue", label: "青", light: "#bbdefb", base: "#1a4d8c", dark: "#0b2c4a" },
    { id: "sky", label: "水色", light: "#e0f7fa", base: "#26c6da", dark: "#006064" },
    { id: "green", label: "緑", light: "#e8f2e6", base: "#3d8a48", dark: "#1f3d18" },
    { id: "brown", label: "茶", light: "#efebe9", base: "#5c4033", dark: "#3e2723" },
    { id: "black", label: "黒", light: "#9e9e9e", base: "#212121", dark: "#111111" },
    { id: "smoke-rose", label: "くすみ桃", light: "#f3e6e8", base: "#c9a0a6", dark: "#7a555c" },
    { id: "smoke-sage", label: "くすみ緑", light: "#e8eee8", base: "#8fa08f", dark: "#4f5c4f" },
    { id: "smoke-blue", label: "くすみ青", light: "#e6ebf0", base: "#7f92a6", dark: "#445566" },
    { id: "smoke-sand", label: "くすみ砂", light: "#f2ebe3", base: "#c4b09a", dark: "#7a6a56" },
    { id: "smoke-mauve", label: "くすみ紫", light: "#eee8ef", base: "#a090a8", dark: "#5c5064" },
    { id: "smoke-olive", label: "くすみオリーブ", light: "#eceee4", base: "#9aa07a", dark: "#55583f" }
  ];

  const hueSelectByKey = {}; // { hueId, t } t in 0..1 (0=light, 0.5=base, 1=dark)

  const SWATCH_KEYS = [
    "pageBg", "heroInk", "bodyInk", "chromeBg", "chromeInk",
    "accent", "cardBg", "valuesBg", "contactBg", "contactInk"
  ];

  /** random用：各色相の base */
  const SWATCHES_FLAT = COLOR_HUES.map((h) => h.base);

  /** 見本デフォルト（旧クリニック白）＝ PRESETS.clinic と同値 */
  const DEFAULTS = {
    pageBg: "#ffffff",
    pageBgSoft: "#f3f6f8",
    heroInk: "#1a4d8c",
    bodyInk: "#212121",
    bodyMuted: "#555555",
    chromeBg: "#1a4d8c",
    chromeInk: "#ffffff",
    accent: "#1a4d8c",
    cardBg: "#ffffff",
    valuesBg: "#ffffff",
    contactBg: "#1a4d8c",
    contactInk: "#ffffff",
    radius: "0.6rem",
    headingScale: "1"
  };

  const PRESETS = {
    green: {
      pageBg: "#e8f2e6",
      pageBgSoft: "#d2e6ce",
      heroInk: "#111111",
      bodyInk: "#212121",
      bodyMuted: "#555555",
      chromeBg: "#1f3d18",
      chromeInk: "#f4fff6",
      accent: "#3d8a48",
      cardBg: "#ffffff",
      valuesBg: "#ffffff",
      contactBg: "#2d6a36",
      contactInk: "#f4fff6"
    },
    clinic: {
      pageBg: "#ffffff",
      pageBgSoft: "#f3f6f8",
      heroInk: "#1a4d8c",
      bodyInk: "#212121",
      bodyMuted: "#555555",
      chromeBg: "#1a4d8c",
      chromeInk: "#ffffff",
      accent: "#1a4d8c",
      cardBg: "#ffffff",
      valuesBg: "#ffffff",
      contactBg: "#1a4d8c",
      contactInk: "#ffffff"
    },
    cafe: {
      pageBg: "#f5efe4",
      pageBgSoft: "#ebe1d0",
      heroInk: "#fff6e8",
      bodyInk: "#3e2723",
      bodyMuted: "#6a5340",
      chromeBg: "#5c4033",
      chromeInk: "#fff6e8",
      accent: "#c45c26",
      cardBg: "#fff8ee",
      valuesBg: "#fff8ee",
      contactBg: "#5c4033",
      contactInk: "#fff6e8"
    },
    ink: {
      pageBg: "#2e3333",
      pageBgSoft: "#3a4040",
      heroInk: "#ffffff",
      bodyInk: "#f5f5f5",
      bodyMuted: "#c8c8c8",
      chromeBg: "#111111",
      chromeInk: "#f5f5f5",
      accent: "#c9a227",
      cardBg: "#1f2424",
      valuesBg: "#1f2424",
      contactBg: "#111111",
      contactInk: "#f5f5f5"
    },
    ocean: {
      pageBg: "#e0f7fa",
      pageBgSoft: "#b2ebf2",
      heroInk: "#006064",
      bodyInk: "#004d56",
      bodyMuted: "#4f7a80",
      chromeBg: "#00838f",
      chromeInk: "#e0f7fa",
      accent: "#26c6da",
      cardBg: "#ffffff",
      valuesBg: "#ffffff",
      contactBg: "#006064",
      contactInk: "#e0f7fa"
    },
    sakura: {
      pageBg: "#fdf5f6",
      pageBgSoft: "#f5e4e8",
      heroInk: "#5c2434",
      bodyInk: "#3d2228",
      bodyMuted: "#6a454d",
      chromeBg: "#8f4a5a",
      chromeInk: "#fff8fa",
      accent: "#c95d7a",
      cardBg: "#ffffff",
      valuesBg: "#ffffff",
      contactBg: "#8f4a5a",
      contactInk: "#fff8fa"
    },
    plum: {
      pageBg: "#f3eef8",
      pageBgSoft: "#e4d9f0",
      heroInk: "#2e1a4a",
      bodyInk: "#2a2038",
      bodyMuted: "#5a4d6a",
      chromeBg: "#4a2d6a",
      chromeInk: "#f8f2ff",
      accent: "#7a52a8",
      cardBg: "#ffffff",
      valuesBg: "#ffffff",
      contactBg: "#4a2d6a",
      contactInk: "#f8f2ff"
    },
    brick: {
      pageBg: "#fff6ee",
      pageBgSoft: "#ffe4cc",
      heroInk: "#8a3a10",
      bodyInk: "#3a2418",
      bodyMuted: "#6a4a38",
      chromeBg: "#e07020",
      chromeInk: "#fff8f0",
      accent: "#f08a28",
      cardBg: "#ffffff",
      valuesBg: "#fffaf5",
      contactBg: "#d46818",
      contactInk: "#fff8f0"
    }
  };

  const FONT_OPTIONS = [
    "Zen Kaku Gothic New",
    "Noto Sans JP",
    "Sawarabi Gothic",
    "Shippori Mincho",
    "Noto Serif JP",
    "Sawarabi Mincho",
    "Zen Maru Gothic",
    "M PLUS Rounded 1c",
    "Kosugi Maru",
    "Kiwi Maru",
    "Yuji Syuku",
    "Dela Gothic One"
  ];

  const FONT_LABELS = {
    "Zen Kaku Gothic New": "角ゴシック（すっきり）",
    "Noto Sans JP": "ゴシック（標準）",
    "Sawarabi Gothic": "ゴシック（やわらか）",
    "Shippori Mincho": "明朝（上品）",
    "Noto Serif JP": "明朝（標準）",
    "Sawarabi Mincho": "明朝（やわらか）",
    "Zen Maru Gothic": "丸ゴシック",
    "M PLUS Rounded 1c": "丸文字",
    "Kosugi Maru": "丸ゴシック（軽め）",
    "Kiwi Maru": "丸文字（かわいい）",
    "Yuji Syuku": "筆文字風",
    "Dela Gothic One": "太ゴシック（見出し）"
  };

  const SCOPE_NAMES = [
    "scope_layout_fixed",
    "scope_no_copy",
    "scope_no_form",
    "scope_update",
    "scope_revision_once"
  ];

  const STEP_FIELD_RESET = {
    "hero-image": {
      files: ["hero_image"]
    },
    "about-images": {
      counts: {
        "about-photos": COUNT_META["about-photos"] ? COUNT_META["about-photos"].defaultCount : 2
      },
      files: ["about_image_1", "about_image_2", "about_image_3", "about_image_4"]
    },
    "works-images": {
      counts: { "works-list": COUNT_META["works-list"] ? COUNT_META["works-list"].defaultCount : 2 },
      files: ["work_1_image", "work_2_image", "work_3_image"]
    },
    "logo-text": {
      texts: ["brand_name"],
      files: ["logo_image"],
      logoModeReset: true
    },
    "heading-font": {
      fonts: { font_display: "Shippori Mincho" }
    },
    "catch-font": {
      fonts: { font_catch: "Shippori Mincho" }
    },
    "body-font": {
      fonts: { font_body: "Zen Kaku Gothic New" }
    },
    "hero-text": {
      texts: ["hero_title", "hero_lead_1", "hero_lead_2", "hero_lead_3"],
      counts: { "hero-leads": COUNT_META["hero-leads"] ? COUNT_META["hero-leads"].defaultCount : 2 }
    },
    "values-text": {
      texts: ["value_1_title", "value_1_text", "value_2_title", "value_2_text", "value_3_title", "value_3_text"],
      counts: { "hero-values": COUNT_META["hero-values"] ? COUNT_META["hero-values"].defaultCount : 3 }
    },
    "about-text": {
      texts: [
        "about_section_name",
        "about_heading",
        "about_name",
        "about_lead",
        "acc_1_title",
        "acc_1_body",
        "acc_2_title",
        "acc_2_body",
        "acc_3_title",
        "acc_3_body"
      ],
      counts: {
        "about-accordions": COUNT_META["about-accordions"] ? COUNT_META["about-accordions"].defaultCount : 1
      }
    },
    "works-text": {
      texts: [
        "works_section_name",
        "works_heading",
        "works_lead",
        "work_1_title",
        "work_1_text",
        "work_2_title",
        "work_2_text",
        "work_3_title",
        "work_3_text",
        "work_1_url",
        "work_1_link_label",
        "work_2_url",
        "work_2_link_label",
        "work_3_url",
        "work_3_link_label"
      ]
    },
    "contact-text": {
      texts: ["contact_section_name", "contact_label", "contact_email", "contact_note_1", "contact_note_2"]
    },
    "extra-content": {
      texts: ["hours_text", "access_text", "address_text"],
      extrasReset: true
    },
    finish: {
      texts: ["extra_notes", "font_wish_name"],
      uncheck: SCOPE_NAMES,
      fontWishReset: true
    },
    purpose: {},
    guide: {}
  };

  const imageUrls = {};
  const IMAGE_DEFAULTS = {};

  const previewDefaults = capturePreviewDefaults();

  const store = {
    draftColors: { ...DEFAULTS },
    colorCodes: Object.fromEntries(SWATCH_KEYS.map((k) => [k, ""])),
    colorModes: Object.fromEntries(SWATCH_KEYS.map((k) => [k, "pick"])),
    draftCounts: Object.fromEntries(
      COUNT_IDS.map((id) => [id, COUNT_META[id] ? COUNT_META[id].defaultCount : 1])
    ),
    draftExtras: { hours: false, access: false, address: true },
    draftContact: { label: true, note1: true, note2: true },
    confirmed: Object.fromEntries(STEP_IDS.map((id) => [id, false])),
    snapshots: {},
    wizardStepIndex: 0,
    uiMode: null,
    presetChosen: false,
    chosenPresetKey: "clinic",
    randomHistory: [],
    guidedImageUnlocked: false,
    guidedTextUnlocked: false,
    guidedColorPhase: null,
    guidedColorReturnPreset: false,
    guidedColorEditStepId: null,
    guidedColorDeck: [],
    guidedColorDeckIdx: 0,
    guidedColorTrial: {
      prevHex: null,
      slotHistory: [],
      slotHistoryIdx: -1
    },
    chapterCoachMsg: "",
    zipHighlightStepId: null,
    selfEditingStepId: null,
    pendingPreviewScroll: null,
    sitePurpose: null,
    layoutPattern: "a",
    layoutOrder: LAYOUT_DEFAULT_ORDER.slice(),
    layoutSwapFrom: null,
    layoutDragId: null,
    layoutDragSize: null,
    layoutDragMoved: false,
    layoutSelected: false,
    finishLockedOnce: false,
    vibeColors: null,
    vibeReasons: [],
    vibeText: "",
    intakeDone: false,
    siteColorMode: "easy",
    slotGradients: {},
    slotGradientPartners: {},
    partnerPickMode: false
  };

  let saveTimer = null;
  let suppressSave = false;

  const GUIDED_COLOR_TUNE_IDS = COLOR_STEP_IDS_ORDERED.slice(1);

  function isGuidedColorStepId(stepId) {
    return COLOR_STEP_IDS_ORDERED.indexOf(stepId) >= 0;
  }

  function primaryColorKeyForStep(stepId) {
    const keys = COLOR_STEP_FIELDS[stepId];
    return keys && keys.length ? keys[0] : null;
  }

  function colorStepDisplayName(stepId) {
    const meta = BADGE_META[stepId];
    if (!meta || meta.kind !== "color") return "";
    return "色" + meta.displayNum + "・" + meta.label;
  }

  function activeGctEditStepId() {
    return store.guidedColorEditStepId || null;
  }

  function gctPresetBlock() {
    return form.querySelector('.dash-block[data-step-id="global-preset"]');
  }

  function scrollPreviewForColorStep(stepId) {
    const block = form.querySelector('.dash-block[data-step-id="' + stepId + '"]');
    const sel = block ? block.getAttribute("data-preview-target") : null;
    if (sel) window.setTimeout(() => scrollPreviewTo(sel), 50);
    const hit =
      root.querySelector('[data-open-step="' + stepId + '"].preview-hit') ||
      root.querySelector('.preview-hit[data-open-step="' + stepId + '"]') ||
      root.querySelector('.zone-badge[data-open-step="' + stepId + '"]');
    if (hit) {
      hit.classList.add("is-target-flash");
      window.setTimeout(() => hit.classList.remove("is-target-flash"), 600);
    }
  }

  function gctPanel() {
    return document.getElementById("guided-color-trial");
  }

  function shuffleDeck(arr) {
    const list = arr.slice();
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = list[i];
      list[i] = list[j];
      list[j] = t;
    }
    return list;
  }

  function buildGuidedColorDeck() {
    const deck = [];
    COLOR_HUES.forEach((hue) => {
      for (let i = 0; i <= 16; i++) {
        deck.push(hexAtLightness(hue.id, i / 16));
      }
    });
    store.guidedColorDeck = shuffleDeck(deck);
    store.guidedColorDeckIdx = 0;
  }

  function nextGuidedDeckColor() {
    if (!store.guidedColorDeck.length || store.guidedColorDeckIdx >= store.guidedColorDeck.length) {
      buildGuidedColorDeck();
    }
    return store.guidedColorDeck[store.guidedColorDeckIdx++];
  }

  function resetGuidedSlotHistory(stepId) {
    const key = primaryColorKeyForStep(stepId);
    if (!key) return;
    const snap = {
      stepId: stepId,
      key: key,
      colors: copyColorDraft(),
      prevHex: null
    };
    store.guidedColorTrial = {
      prevHex: null,
      slotHistory: [snap],
      slotHistoryIdx: 0
    };
  }

  function pushGuidedSlotHistory(stepId) {
    const key = primaryColorKeyForStep(stepId);
    if (!key) return;
    const trial = store.guidedColorTrial;
    const snap = {
      stepId: stepId,
      key: key,
      colors: copyColorDraft(),
      prevHex: trial.prevHex
    };
    trial.slotHistory = trial.slotHistory.slice(0, trial.slotHistoryIdx + 1);
    trial.slotHistory.push(snap);
    trial.slotHistoryIdx = trial.slotHistory.length - 1;
  }

  function restoreGuidedSlotHistory(idx) {
    const trial = store.guidedColorTrial;
    const snap = trial.slotHistory[idx];
    if (!snap) return;
    Object.assign(store.draftColors, snap.colors);
    store.draftColors.pageBgSoft = softFrom(store.draftColors.pageBg);
    store.draftColors.bodyMuted = softMuted(store.draftColors.bodyInk);
    trial.slotHistoryIdx = idx;
    trial.prevHex = snap.prevHex;
    syncHueSelectFromDraft();
    refreshColorUi();
    applyLiveColors(true);
  }

  function gctPaletteSlots() {
    return GUIDED_COLOR_TUNE_IDS.map((stepId) => {
      const meta = BADGE_META[stepId];
      const key = primaryColorKeyForStep(stepId) || "pageBg";
      return {
        stepId: stepId,
        num: meta.displayNum,
        label: meta.label,
        hex: store.draftColors[key]
      };
    });
  }

  function syncGctReturnPresetUi() {
    const fromPreset = !!store.guidedColorReturnPreset;
    document.querySelectorAll("[data-gct-prev-step]").forEach((btn) => {
      btn.textContent = fromPreset ? "色一覧に戻る" : "前の項目に戻る";
    });
    const shadeOk = document.getElementById("gct-shade-ok");
    if (shadeOk) shadeOk.textContent = fromPreset ? "一覧に戻る" : "この濃さで次へ";
  }

  function gctReturnToPresetOverview(restorePick) {
    const trial = store.guidedColorTrial;
    const editId = activeGctEditStepId();
    if (restorePick && editId && trial) {
      const key = primaryColorKeyForStep(editId);
      if (trial._pickEntryHex != null && key) setDraftColor(key, trial._pickEntryHex);
      if (trial._pickEntryPartner != null && GRADIENT_BG_KEYS.has(key)) {
        if (!store.slotGradientPartners) store.slotGradientPartners = {};
        store.slotGradientPartners[editId] = trial._pickEntryPartner;
        applyLiveColors(true);
      }
    }
    if (trial) {
      delete trial._pickEntryHex;
      delete trial._pickEntryPartner;
      delete trial._shadeEntryHex;
      delete trial._pickHistory;
    }
    store.partnerPickMode = false;
    store.guidedColorReturnPreset = false;
    store.guidedColorEditStepId = null;
    store.guidedColorPhase = "preset";
    const flow = getFlowSteps();
    const idx = flow.findIndex((s) => s.id === "global-preset");
    if (idx >= 0) showWizardStep(idx);
    else syncGuidedColorTrial();
    scheduleSave();
  }

  function partnerHexForSlot(stepId) {
    if (!store.slotGradientPartners) store.slotGradientPartners = {};
    if (store.slotGradientPartners[stepId]) return store.slotGradientPartners[stepId];
    return "#ffffff";
  }

  function gctOpenPaletteColor(stepId) {
    if (store.siteColorMode !== "detail") return;
    if (!GUIDED_COLOR_TUNE_IDS.includes(stepId)) return;
    if (!store.presetChosen) {
      markPresetChosen(store.chosenPresetKey || "clinic");
    }
    store.partnerPickMode = false;
    store.guidedColorReturnPreset = true;
    store.guidedColorEditStepId = stepId;
    store.guidedColorPhase = "pick";
    const key = primaryColorKeyForStep(stepId);
    const startHex = key ? store.draftColors[key] : "#ffffff";
    if (store.guidedColorTrial) {
      store.guidedColorTrial._pickEntryHex = startHex;
      store.guidedColorTrial._pickEntryPartner = partnerHexForSlot(stepId);
      store.guidedColorTrial._pickHistory = [];
    }
    const flow = getFlowSteps();
    const idx = flow.findIndex((s) => s.id === "global-preset");
    if (idx >= 0) showWizardStep(idx);
    else syncGuidedColorTrial();
    scheduleSave();
  }

  function gctOpenPartnerPick(stepId) {
    if (store.siteColorMode !== "detail") return;
    if (!GUIDED_COLOR_TUNE_IDS.includes(stepId)) return;
    const key = primaryColorKeyForStep(stepId);
    if (!GRADIENT_BG_KEYS.has(key)) return;
    store.partnerPickMode = true;
    store.guidedColorReturnPreset = true;
    store.guidedColorEditStepId = stepId;
    store.guidedColorPhase = "pick";
    const startHex = partnerHexForSlot(stepId);
    if (store.guidedColorTrial) {
      if (store.guidedColorTrial._pickEntryHex == null) {
        const mainKey = primaryColorKeyForStep(stepId);
        store.guidedColorTrial._pickEntryHex = mainKey ? store.draftColors[mainKey] : "#ffffff";
      }
      if (store.guidedColorTrial._pickEntryPartner == null) {
        store.guidedColorTrial._pickEntryPartner = startHex;
      }
      store.guidedColorTrial._pickHistory = [];
    }
    syncGuidedColorTrial();
    scheduleSave();
  }

  function gctSetPickTarget(isPartner) {
    const stepId = activeGctEditStepId();
    if (!stepId) return;
    const key = primaryColorKeyForStep(stepId);
    if (isPartner && !GRADIENT_BG_KEYS.has(key)) return;
    store.partnerPickMode = !!isPartner;
    if (store.guidedColorTrial) store.guidedColorTrial._pickHistory = [];
    renderGctPickUi(stepId);
    scheduleSave();
  }

  function setSlotGradient(stepId, dirId) {
    if (!store.slotGradients) store.slotGradients = {};
    const key = primaryColorKeyForStep(stepId);
    if (!GRADIENT_BG_KEYS.has(key)) return;
    if (!dirId || store.slotGradients[stepId] === dirId) {
      delete store.slotGradients[stepId];
    } else {
      store.slotGradients[stepId] = dirId;
      if (!store.slotGradientPartners) store.slotGradientPartners = {};
      if (!store.slotGradientPartners[stepId]) store.slotGradientPartners[stepId] = "#ffffff";
    }
    renderGctPalette();
    if (store.guidedColorPhase === "pick" && activeGctEditStepId() === stepId) {
      renderPickGradCompass(stepId);
      updatePickMainSwatch(stepId);
      updatePickPartnerSwatch(stepId);
    }
    applyLiveColors(true);
    scheduleSave();
  }

  function swatchBackgroundForSlot(stepId, hex) {
    const dir = store.slotGradients && store.slotGradients[stepId];
    const partner = partnerHexForSlot(stepId);
    if (dir) return "linear-gradient(" + dir + ", " + hex + ", " + partner + ")";
    return hex;
  }

  function renderGctPalette() {
    const host = document.getElementById("gct-palette");
    if (!host) return;
    host.innerHTML = "";
    const detail = store.siteColorMode === "detail";
    gctPaletteSlots().forEach((slot) => {
      const key = primaryColorKeyForStep(slot.stepId);
      const canGrad = detail && GRADIENT_BG_KEYS.has(key);
      const cell = document.createElement("div");
      cell.className = "gct-palette-cell gct-palette-cell--slot" + (canGrad ? " has-grad" : "");
      cell.setAttribute("data-gct-palette-step", slot.stepId);

      const title = document.createElement("span");
      title.className = "gct-palette-title";
      title.textContent = colorStepDisplayName(slot.stepId);
      cell.appendChild(title);

      const inkFrame = document.createElement("button");
      inkFrame.type = "button";
      inkFrame.className = "gct-ink-frame";
      inkFrame.setAttribute("aria-label", colorStepDisplayName(slot.stepId) + "を直す");
      inkFrame.title = "色を選ぶ";
      const bg = canGrad ? swatchBackgroundForSlot(slot.stepId, slot.hex) : slot.hex;
      inkFrame.innerHTML = '<span class="gct-ink-swatch" style="background:' + bg + '"></span>';
      if (detail) inkFrame.addEventListener("click", () => gctOpenPaletteColor(slot.stepId));
      else inkFrame.disabled = true;
      cell.appendChild(inkFrame);
      host.appendChild(cell);
    });
    const keep = document.getElementById("gct-keep-preset");
    if (keep && !keep.dataset.bound) {
      keep.dataset.bound = "1";
      keep.addEventListener("click", gctBulkConfirmColors);
    }
  }

  function updatePickPartnerSwatch(stepId) {
    const el = document.getElementById("gct-pick-partner-swatch");
    if (el) el.style.background = partnerHexForSlot(stepId);
  }

  function updatePickMainSwatch(stepId) {
    const el = document.getElementById("gct-pick-main-swatch");
    if (!el) return;
    const key = primaryColorKeyForStep(stepId);
    const hex = key ? store.draftColors[key] : "#ffffff";
    el.style.background = GRADIENT_BG_KEYS.has(key) ? swatchBackgroundForSlot(stepId, hex) : hex;
  }

  function renderPickGradCompass(stepId) {
    const compass = document.getElementById("gct-pick-compass");
    if (!compass) return;
    const compassSlots = [
      { dirId: "to top left", col: 1, row: 1 },
      { dirId: "to top", col: 2, row: 1 },
      { dirId: "to top right", col: 3, row: 1 },
      { dirId: "to left", col: 1, row: 2 },
      { spacer: true, col: 2, row: 2 },
      { dirId: "to right", col: 3, row: 2 },
      { dirId: "to bottom left", col: 1, row: 3 },
      { dirId: "to bottom", col: 2, row: 3 },
      { dirId: "to bottom right", col: 3, row: 3 }
    ];
    compass.innerHTML = "";
    compassSlots.forEach((pos) => {
      if (pos.spacer) {
        const center = document.createElement("span");
        center.className = "gct-grad-center gct-grad-center--empty";
        center.style.gridColumn = String(pos.col);
        center.style.gridRow = String(pos.row);
        center.setAttribute("aria-hidden", "true");
        compass.appendChild(center);
        return;
      }
      const d = GRADIENT_DIRS.find((x) => x.id === pos.dirId);
      if (!d) return;
      const b = document.createElement("button");
      b.type = "button";
      b.className = "gct-grad-arrow" + ((store.slotGradients || {})[stepId] === d.id ? " is-active" : "");
      b.style.gridColumn = String(pos.col);
      b.style.gridRow = String(pos.row);
      b.title = d.label + "（もう一度で解除）";
      b.setAttribute("aria-label", d.label + "へグラデ。選択中なら解除");
      b.textContent = d.arrow;
      b.addEventListener("click", () => setSlotGradient(stepId, d.id));
      compass.appendChild(b);
    });
  }

  function renderGctTuneUi(stepId) {
    const key = primaryColorKeyForStep(stepId);
    const trial = store.guidedColorTrial;
    const slotName = colorStepDisplayName(stepId);
    const tryTag = document.getElementById("gct-try-tag");
    const trySw = document.getElementById("gct-try-swatch");
    const prevCol = document.getElementById("gct-prev-col");
    const prevSw = document.getElementById("gct-prev-swatch");
    const slotBack = document.getElementById("gct-slot-back");

    if (tryTag) tryTag.textContent = slotName;
    const trying = store.draftColors[key];
    if (trySw) trySw.style.background = trying;

    if (prevCol && prevSw) {
      if (trial.prevHex) {
        prevCol.classList.remove("is-empty");
        prevSw.disabled = false;
        prevSw.style.background = trial.prevHex;
      } else {
        prevCol.classList.add("is-empty");
        prevSw.disabled = true;
        prevSw.style.background = "transparent";
      }
    }
    if (slotBack) slotBack.disabled = !trial.prevHex;
  }

  function gctUpdatePickSwatch(hex) {
    const sw = document.getElementById("gct-pick-swatch");
    if (sw) sw.style.background = hex;
  }

  function gctUpdateShadeSwatch(hex) {
    const sw = document.getElementById("gct-shade-swatch");
    if (sw) sw.style.background = hex;
  }

  function gctRefreshHueSelected(host, hueId) {
    if (!host) return;
    host.querySelectorAll("[data-hue-id]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.getAttribute("data-hue-id") === hueId);
    });
  }

  function appendHuePalette(container, key, onHuePick) {
    const state = hueSelectByKey[key] || findNearestHueState(store.draftColors[key]);
    const hueRow = document.createElement("div");
    hueRow.className = "swatch-hues swatch-hues-round";
    hueRow.setAttribute("role", "group");
    hueRow.setAttribute("aria-label", "色の種類");
    COLOR_HUES.forEach((hue) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "swatch swatch-round";
      btn.setAttribute("data-hue-id", hue.id);
      btn.title = hue.label;
      btn.setAttribute("aria-label", hue.label);
      btn.style.setProperty("--sw", hue.base);
      if (hue.id === state.hueId) btn.classList.add("is-active");
      btn.addEventListener("click", () => {
        const t = hueSelectByKey[key] && hueSelectByKey[key].t != null ? hueSelectByKey[key].t : 0.5;
        hueSelectByKey[key] = { hueId: hue.id, t };
        container.querySelectorAll("[data-hue-id]").forEach((b) => {
          b.classList.toggle("is-active", b.getAttribute("data-hue-id") === hue.id);
        });
        if (onHuePick) onHuePick(hue.id, t);
      });
      hueRow.appendChild(btn);
    });
    container.appendChild(hueRow);
    return hueRow;
  }

  function appendShadeSlider(container, key, rangeAttr, onInput) {
    const nearest = hueSelectByKey[key] || findNearestHueState(store.draftColors[key]);
    const shade = document.createElement("div");
    shade.className = "color-shade";
    shade.innerHTML =
      '<label class="shade-slider-label">濃さ' +
      '<input type="range" min="0" max="100" value="50" ' +
      rangeAttr +
      ">" +
      "</label>" +
      '<p class="dash-note dash-note-sm shade-hint">左が薄め、右が濃いめです。</p>';
    container.appendChild(shade);
    const range = shade.querySelector("input[type=range]");
    if (range) {
      range.value = String(Math.round((nearest.t == null ? 0.5 : nearest.t) * 100));
      range.addEventListener("input", onInput);
    }
    return shade;
  }

  function updatePickNowSwatch(hex) {
    const stepId = activeGctEditStepId();
    if (!stepId) return;
    updatePickMainSwatch(stepId);
    updatePickPartnerSwatch(stepId);
    void hex;
  }

  function syncPickUndoButton() {
    const btn = document.getElementById("gct-pick-undo");
    if (!btn) return;
    const hist = store.guidedColorTrial && store.guidedColorTrial._pickHistory;
    btn.disabled = !(hist && hist.length);
  }

  function currentPickHex() {
    if (store.partnerPickMode) {
      return partnerHexForSlot(activeGctEditStepId());
    }
    const key = primaryColorKeyForStep(activeGctEditStepId());
    return key ? store.draftColors[key] : "#ffffff";
  }

  function applyHoneyPick(hex) {
    const trial = store.guidedColorTrial || (store.guidedColorTrial = {});
    if (!Array.isArray(trial._pickHistory)) trial._pickHistory = [];
    const prev = currentPickHex();
    if (prev && String(prev).toLowerCase() !== String(hex).toLowerCase()) {
      trial._pickHistory.push(prev);
      if (trial._pickHistory.length > 40) trial._pickHistory.shift();
    }
    const stepId = activeGctEditStepId();
    if (store.partnerPickMode) {
      if (!store.slotGradientPartners) store.slotGradientPartners = {};
      store.slotGradientPartners[stepId] = hex;
      applyLiveColors(true);
    } else {
      const key = primaryColorKeyForStep(stepId);
      if (!key) return;
      setDraftColor(key, hex);
    }
    updatePickMainSwatch(stepId);
    updatePickPartnerSwatch(stepId);
    if (GRADIENT_BG_KEYS.has(primaryColorKeyForStep(stepId))) renderPickGradCompass(stepId);
    syncPickUndoButton();
  }

  function gctUndoPick() {
    const trial = store.guidedColorTrial;
    if (!trial || !trial._pickHistory || !trial._pickHistory.length) return;
    const hex = trial._pickHistory.pop();
    const stepId = activeGctEditStepId();
    if (store.partnerPickMode) {
      if (!store.slotGradientPartners) store.slotGradientPartners = {};
      store.slotGradientPartners[stepId] = hex;
      applyLiveColors(true);
    } else {
      const key = primaryColorKeyForStep(stepId);
      if (key) setDraftColor(key, hex);
    }
    updatePickMainSwatch(stepId);
    updatePickPartnerSwatch(stepId);
    if (GRADIENT_BG_KEYS.has(primaryColorKeyForStep(stepId))) renderPickGradCompass(stepId);
    syncPickUndoButton();
    scheduleSave();
  }

  const HONEY_RINGS = 11;
  const HONEY_GRAY_STEPS = 19;

  function honeyCellSizeForHost(host) {
    const rings = HONEY_RINGS;
    const avail = Math.max(220, Math.min((host && host.clientWidth) || 280, 420));
    // 六角の横幅 ≈ 2 * rings * size * √3
    return Math.max(6.5, Math.min(11, avail / (rings * 2 * Math.sqrt(3) + 2)));
  }

  function hsvToHex(h, s, v) {
    const hh = ((h % 360) + 360) % 360;
    const c = v * s;
    const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
    const m = v - c;
    let r = 0;
    let g = 0;
    let b = 0;
    if (hh < 60) {
      r = c;
      g = x;
    } else if (hh < 120) {
      r = x;
      g = c;
    } else if (hh < 180) {
      g = c;
      b = x;
    } else if (hh < 240) {
      g = x;
      b = c;
    } else if (hh < 300) {
      r = x;
      b = c;
    } else {
      r = c;
      b = x;
    }
    const to = (n) => Math.round((n + m) * 255).toString(16).padStart(2, "0");
    return "#" + to(r) + to(g) + to(b);
  }

  function axialToPixel(q, r, size) {
    return {
      x: size * Math.sqrt(3) * (q + r / 2),
      y: size * (3 / 2) * r
    };
  }

  function honeyColorAt(q, r, rings) {
    const dist = Math.max(Math.abs(q), Math.abs(r), Math.abs(-q - r));
    if (dist === 0) return "#ffffff";
    const { x, y } = axialToPixel(q, r, 1);
    let hue = (Math.atan2(y, x) * 180) / Math.PI;
    if (hue < 0) hue += 360;
    // 画面上方が青〜紫寄りになるよう回転
    hue = (hue + 240) % 360;
    const sat = dist / rings;
    return hsvToHex(hue, sat, 1);
  }

  function parseHexRgb(hex) {
    const n = toColorInput(hex).slice(1);
    return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
  }

  function hexDist(a, b) {
    const A = parseHexRgb(a);
    const B = parseHexRgb(b);
    return Math.abs(A[0] - B[0]) + Math.abs(A[1] - B[1]) + Math.abs(A[2] - B[2]);
  }

  function appendHoneycomb(container, currentHex, onPick) {
    container.classList.remove("gct-honeycomb");
    container.classList.add("gct-honey-board");
    container.innerHTML = "";

    const rings = HONEY_RINGS;
    const size = honeyCellSizeForHost(container);
    const cells = [];
    for (let q = -rings; q <= rings; q++) {
      for (let r = -rings; r <= rings; r++) {
        const s = -q - r;
        if (Math.max(Math.abs(q), Math.abs(r), Math.abs(s)) > rings) continue;
        const hex = honeyColorAt(q, r, rings);
        const pos = axialToPixel(q, r, size);
        cells.push({ q, r, hex, x: pos.x, y: pos.y });
      }
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    cells.forEach((c) => {
      minX = Math.min(minX, c.x);
      maxX = Math.max(maxX, c.x);
      minY = Math.min(minY, c.y);
      maxY = Math.max(maxY, c.y);
    });
    const pad = size + 2;
    const width = maxX - minX + pad * 2;
    const height = maxY - minY + pad * 2;

    const map = document.createElement("div");
    map.className = "gct-honey-map";
    map.style.width = width + "px";
    map.style.height = height + "px";
    map.setAttribute("role", "group");
    map.setAttribute("aria-label", "色選択");

    let best = null;
    let bestDist = Infinity;
    const cur = String(currentHex || "#ffffff");
    cells.forEach((c) => {
      const d = hexDist(c.hex, cur);
      if (d < bestDist) {
        bestDist = d;
        best = c;
      }
    });

    const buttons = [];
    function markActive(btn) {
      buttons.forEach((b) => b.classList.remove("is-active"));
      if (btn) btn.classList.add("is-active");
    }

    cells.forEach((c) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "gct-honey-cell";
      btn.style.setProperty("--sw", c.hex);
      btn.style.left = c.x - minX + pad - size + "px";
      btn.style.top = c.y - minY + pad - size + "px";
      btn.style.width = size * 2 + "px";
      btn.style.height = size * 2 + "px";
      btn.title = c.hex;
      btn.setAttribute("aria-label", c.hex);
      btn.dataset.hex = c.hex;
      if (best && best.q === c.q && best.r === c.r) btn.classList.add("is-active");
      const pick = () => {
        markActive(btn);
        onPick(c.hex);
      };
      btn.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        btn.setPointerCapture(e.pointerId);
        pick();
      });
      btn.addEventListener("pointerenter", (e) => {
        if (e.buttons === 1) pick();
      });
      map.appendChild(btn);
      buttons.push(btn);
    });

    const grayRow = document.createElement("div");
    grayRow.className = "gct-honey-gray";
    grayRow.setAttribute("role", "group");
    grayRow.setAttribute("aria-label", "白から黒");
    for (let i = 0; i < HONEY_GRAY_STEPS; i++) {
      const t = i / (HONEY_GRAY_STEPS - 1);
      const v = Math.round(255 * (1 - t));
      const hx = "#" + v.toString(16).padStart(2, "0").repeat(3);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "gct-honey-cell gct-honey-cell--gray";
      btn.style.setProperty("--sw", hx);
      btn.title = hx;
      btn.setAttribute("aria-label", hx);
      btn.dataset.hex = hx;
      if (hexDist(hx, cur) <= 8 && bestDist > 8) btn.classList.add("is-active");
      const pick = () => {
        map.querySelectorAll(".gct-honey-cell").forEach((b) => b.classList.remove("is-active"));
        grayRow.querySelectorAll(".gct-honey-cell").forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        onPick(hx);
      };
      btn.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        pick();
      });
      btn.addEventListener("pointerenter", (e) => {
        if (e.buttons === 1) pick();
      });
      grayRow.appendChild(btn);
      buttons.push(btn);
    }

    const foot = document.createElement("div");
    foot.className = "gct-honey-foot";
    foot.appendChild(grayRow);

    container.appendChild(map);
    container.appendChild(foot);
  }

  function renderGctPickUi(stepId) {
    const key = primaryColorKeyForStep(stepId);
    const canGrad = GRADIENT_BG_KEYS.has(key);
    if (!canGrad) store.partnerPickMode = false;
    const partnerMode = !!store.partnerPickMode;
    const pickTag = document.getElementById("gct-pick-tag");
    const pickLead = document.getElementById("gct-pick-lead");
    const host = document.getElementById("gct-pick-host");
    const shadeHost = document.getElementById("gct-pick-shade-host");
    const gradBox = document.getElementById("gct-pick-grad");
    const inkNote = document.getElementById("gct-pick-ink-note");
    const targetMain = document.getElementById("gct-pick-target-main");
    const targetPartner = document.getElementById("gct-pick-target-partner");
    if (!host) return;
    if (pickTag) {
      pickTag.textContent = partnerMode
        ? colorStepDisplayName(stepId) + "（相手色）"
        : colorStepDisplayName(stepId);
    }
    if (pickLead) {
      pickLead.textContent = canGrad
        ? partnerMode
          ? "右の色選択で相手色を選びます。左の矢印でグラデの向きも変えられます。"
          : "右の色選択で現在色を選びます。左でグラデと相手色も選べます。"
        : "右の色選択で色を選びます。";
    }
    if (shadeHost) {
      shadeHost.innerHTML = "";
      shadeHost.hidden = true;
    }
    if (gradBox) gradBox.hidden = !canGrad;
    if (inkNote) inkNote.hidden = canGrad;
    if (targetPartner) targetPartner.hidden = !canGrad;
    if (targetMain) targetMain.classList.toggle("is-active", !partnerMode);
    if (targetPartner) targetPartner.classList.toggle("is-active", partnerMode);
    if (canGrad) {
      renderPickGradCompass(stepId);
    }
    updatePickMainSwatch(stepId);
    updatePickPartnerSwatch(stepId);

    const current = partnerMode
      ? partnerHexForSlot(stepId)
      : store.draftColors[key] || "#ffffff";

    syncPickUndoButton();
    host.innerHTML = "";
    appendHoneycomb(host, current, (hex) => {
      applyHoneyPick(hex);
    });
  }

  /** 作業の出口：レイアウト拠点（メニュー）へ戻す。入り口は多く、出口はここ一本。 */
  function returnToLayoutHub() {
    store.partnerPickMode = false;
    store.guidedColorEditStepId = null;
    store.guidedColorReturnPreset = false;
    if (store.guidedColorPhase === "pick" || store.guidedColorPhase === "shade") {
      store.guidedColorPhase = "preset";
    }
    try {
      syncGuidedColorTrial();
    } catch (err) {
      /* ignore */
    }
    updateWizardUi();
    if (typeof window.openAtelierMenu === "function") {
      window.openAtelierMenu("layout");
      return;
    }
    const block = form.querySelector('.dash-block[data-step-id="layout"]');
    if (block) {
      switchToDashTab();
      store.selfEditingStepId = "layout";
      form.querySelectorAll(":scope > details.dash-block").forEach((d) => {
        const on = d === block;
        d.open = on;
        d.hidden = false;
        d.classList.toggle("is-wizard-active", on);
        d.classList.toggle("is-active-step", on);
      });
      renderLayoutArrangeWire();
      updateWizardUi();
    }
  }

  function gctConfirmPick() {
    if (store.guidedColorPhase !== "pick") return;
    const trial = store.guidedColorTrial;
    if (trial) {
      delete trial._pickEntryHex;
      delete trial._pickEntryPartner;
      delete trial._pickHistory;
    }
    store.partnerPickMode = false;
    store.guidedColorEditStepId = null;
    store.guidedColorPhase = "preset";
    store.guidedColorReturnPreset = false;
    /* 出口は一つ：色確定 → レイアウト拠点 */
    returnToLayoutHub();
    scheduleSave();
  }

  function gctCancelPick() {
    // 一覧に戻るは廃止。互換のため確定と同じ（変更を残して戻る）
    gctConfirmPick();
  }

  function showGctPhase(name) {
    const panel = gctPanel();
    if (!panel) return;
    panel.querySelectorAll("[data-gct-phase]").forEach((el) => {
      el.hidden = el.getAttribute("data-gct-phase") !== name;
    });
  }

  function mountGctPanel() {
    const panel = gctPanel();
    const block = gctPresetBlock();
    if (!panel || !block) return;
    if (panel.parentElement !== block) block.appendChild(panel);
    panel.hidden = false;
  }

  function isGuidedColorTrialFootHidden() {
    if (store.uiMode !== "guided") return false;
    const step = getCurrentFlowStep();
    return !!(step && step.id === "global-preset");
  }

  function prepareGuidedColorPhaseForStep(prevStepId, nextStepId) {
    if (store.uiMode !== "guided") return;
    if (nextStepId === "global-preset") {
      if (store.guidedColorPhase === "preset" || !store.guidedColorPhase) {
        store.guidedColorReturnPreset = false;
        store.guidedColorEditStepId = null;
      }
    }
  }

  function syncGuidedColorTrial() {
    const panel = gctPanel();
    document.body.classList.remove(
      "gct-active",
      "gct-preset-phase",
      "gct-tune-phase",
      "gct-pick-phase",
      "gct-shade-phase",
      "gct-full-phase"
    );

    if (!panel || store.uiMode !== "guided") {
      if (panel) panel.hidden = true;
      return;
    }

    const step = getCurrentFlowStep();
    if (!step || step.id !== "global-preset") {
      panel.hidden = true;
      updateWizardUi();
      return;
    }

    mountGctPanel();
    document.body.classList.add("gct-active");

    const editId = activeGctEditStepId();
    const phase = store.guidedColorPhase || "preset";

    if (phase === "pick" && editId) {
      document.body.classList.add("gct-pick-phase");
      showGctPhase("pick");
      renderGctPickUi(editId);
      if (editId !== "__partner__") scrollPreviewForColorStep(editId);
      updateWizardUi();
      return;
    }

    store.guidedColorPhase = "preset";
    store.guidedColorEditStepId = null;
    store.partnerPickMode = false;
    document.body.classList.add("gct-preset-phase");
    showGctPhase("preset");
    renderGctPalette();
    panel.hidden = false;
    updateWizardUi();
  }

  function syncGctPrevStepButtons() {
    const disabled = store.guidedColorReturnPreset ? false : store.wizardStepIndex <= 0;
    document.querySelectorAll("[data-gct-prev-step]").forEach((btn) => {
      btn.disabled = disabled;
    });
  }

  function gctBulkConfirmColors() {
    if (!store.presetChosen) {
      markPresetChosen(store.chosenPresetKey || "clinic");
    }
    store.guidedColorReturnPreset = false;
    store.guidedColorEditStepId = null;
    COLOR_STEP_IDS_ORDERED.forEach((stepId) => {
      store.snapshots[stepId] = captureStepSnapshot(stepId);
      store.confirmed[stepId] = true;
    });
    store.guidedColorPhase = null;
    store.guidedImageUnlocked = true;
    store.chapterCoachMsg = "色の選択が完了しました。レイアウトから画像・文字へ進めます。";
    applyAllConfirmed();
    updateConfirmUi();
    updateZoneBadgeDoneState();
    scheduleSave();
    returnToLayoutHub();
    window.setTimeout(() => {
      store.chapterCoachMsg = "";
      updateWizardUi();
    }, 6000);
  }

  function gctNextCandidate() {
    const stepId = activeGctEditStepId();
    if (!stepId || store.guidedColorPhase !== "tune") return;
    const key = primaryColorKeyForStep(stepId);
    if (!key) return;
    const trial = store.guidedColorTrial;
    trial.prevHex = store.draftColors[key];
    const nextHex = nextGuidedDeckColor();
    setDraftColor(key, nextHex);
    pushGuidedSlotHistory(stepId);
    renderGctTuneUi(stepId);
  }

  function gctSlotBack() {
    const stepId = activeGctEditStepId();
    if (!stepId || store.guidedColorPhase !== "tune") return;
    const key = primaryColorKeyForStep(stepId);
    const trial = store.guidedColorTrial;
    if (trial.prevHex && key) {
      const current = store.draftColors[key];
      setDraftColor(key, trial.prevHex);
      trial.prevHex = current;
      pushGuidedSlotHistory(stepId);
      renderGctTuneUi(stepId);
    }
  }

  function gctRestorePrevTap() {
    gctSlotBack();
  }

  function gctAdvanceAfterShade() {
    const step = getCurrentFlowStep();
    if (!step) return;
    if (!wizardConfirmCurrentStep()) return;
    const flow = getFlowSteps();
    const tuneIdx = GUIDED_COLOR_TUNE_IDS.indexOf(step.id);
    if (tuneIdx >= 0 && tuneIdx < GUIDED_COLOR_TUNE_IDS.length - 1) {
      const nextId = GUIDED_COLOR_TUNE_IDS[tuneIdx + 1];
      const nextFlowIdx = flow.findIndex((s) => s.id === nextId);
      store.guidedColorPhase = "tune";
      resetGuidedSlotHistory(nextId);
      showWizardStep(nextFlowIdx);
      return;
    }
    if (step.id === LAST_COLOR_STEP_ID) {
      store.guidedColorPhase = null;
      if (!store.guidedImageUnlocked) {
        store.guidedImageUnlocked = true;
        store.chapterCoachMsg = "色の選択が完了しました。画像の選択ができます。";
        scheduleSave();
        window.setTimeout(() => {
          store.chapterCoachMsg = "";
          updateWizardUi();
        }, 6000);
      }
    }
    if (store.wizardStepIndex < flow.length - 1) {
      showWizardStep(store.wizardStepIndex + 1);
    } else {
      syncGuidedColorTrial();
      updateWizardUi();
    }
  }

  function gctLockCurrentStep() {
    const stepId = activeGctEditStepId();
    if (!stepId || store.guidedColorPhase !== "tune") return;
    const key = primaryColorKeyForStep(stepId);
    if (key) {
      store.guidedColorTrial._shadeEntryHex = store.draftColors[key];
    }
    store.guidedColorPhase = "shade";
    syncGuidedColorTrial();
    scheduleSave();
  }

  function gctShadeBack() {
    const stepId = activeGctEditStepId();
    const trial = store.guidedColorTrial;
    if (stepId && trial && trial._shadeEntryHex != null) {
      const key = primaryColorKeyForStep(stepId);
      if (key) setDraftColor(key, trial._shadeEntryHex);
    }
    if (trial) delete trial._shadeEntryHex;
    store.guidedColorPhase = "tune";
    syncGuidedColorTrial();
    scheduleSave();
  }

  function gctShadeOk() {
    const trial = store.guidedColorTrial;
    if (trial) delete trial._shadeEntryHex;
    if (store.guidedColorReturnPreset) {
      gctReturnToPresetOverview(false);
      return;
    }
    gctAdvanceAfterShade();
  }

  function setupGuidedColorTrial() {
    const nextCand = document.getElementById("gct-next-candidate");
    const lock = document.getElementById("gct-lock-color");
    const slotBack = document.getElementById("gct-slot-back");
    const prevSw = document.getElementById("gct-prev-swatch");
    const fullUi = document.getElementById("gct-full-ui");
    const pickOk = document.getElementById("gct-pick-ok");
    const shadeBack = document.getElementById("gct-shade-back");
    const shadeOk = document.getElementById("gct-shade-ok");

    if (nextCand) nextCand.addEventListener("click", gctNextCandidate);
    if (lock) lock.addEventListener("click", gctLockCurrentStep);
    if (slotBack) slotBack.addEventListener("click", gctSlotBack);
    if (prevSw) prevSw.addEventListener("click", gctRestorePrevTap);
    if (fullUi) {
      fullUi.addEventListener("click", () => {
        const stepId = activeGctEditStepId();
        const key = stepId ? primaryColorKeyForStep(stepId) : null;
        store.guidedColorPhase = "pick";
        if (store.guidedColorTrial && key) {
          store.guidedColorTrial._pickEntryHex = store.draftColors[key];
        }
        syncGuidedColorTrial();
        scheduleSave();
      });
    }
    if (pickOk) pickOk.addEventListener("click", gctConfirmPick);
    const pickUndo = document.getElementById("gct-pick-undo");
    if (pickUndo) pickUndo.addEventListener("click", gctUndoPick);
    const targetMain = document.getElementById("gct-pick-target-main");
    const targetPartner = document.getElementById("gct-pick-target-partner");
    if (targetMain && !targetMain.dataset.bound) {
      targetMain.dataset.bound = "1";
      targetMain.addEventListener("click", () => gctSetPickTarget(false));
    }
    if (targetPartner && !targetPartner.dataset.bound) {
      targetPartner.dataset.bound = "1";
      targetPartner.addEventListener("click", () => gctSetPickTarget(true));
    }
    if (shadeBack) shadeBack.addEventListener("click", gctShadeBack);
    if (shadeOk) shadeOk.addEventListener("click", gctShadeOk);
    document.querySelectorAll("[data-gct-prev-step]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (store.guidedColorReturnPreset) {
          if (store.guidedColorPhase === "pick") {
            gctConfirmPick();
            return;
          }
          if (store.guidedColorPhase === "shade") {
            gctShadeBack();
          }
          gctReturnToPresetOverview(false);
          return;
        }
        if (
          store.guidedColorPhase === "shade" ||
          store.guidedColorPhase === "pick"
        ) {
          store.guidedColorPhase = "tune";
        }
        wizardBack();
      });
    });
  }

  function filterFlowIds(ids) {
    let out = ids.filter((id) => !INTRO_STEP_IDS.has(id));
    if (store.siteColorMode === "easy") {
      out = out.filter((id) => !COLOR_STEP_IDS_ORDERED.includes(id) || id === "global-preset");
    }
    return out;
  }

  function getFlowSteps() {
    if (store.uiMode === "guided") {
      return filterFlowIds(GUIDED_STEP_IDS)
        .map((id) => STEPS.find((s) => s.id === id))
        .filter(Boolean);
    }
    if (store.uiMode === "self") {
      return filterFlowIds(STEPS.map((s) => s.id))
        .map((id) => STEPS.find((s) => s.id === id))
        .filter(Boolean);
    }
    return [];
  }

  function getCurrentFlowStep() {
    if (store.uiMode === "self") {
      if (!store.selfEditingStepId) return null;
      return STEPS.find((s) => s.id === store.selfEditingStepId) || null;
    }
    const flow = getFlowSteps();
    return flow[store.wizardStepIndex] || null;
  }

  function wizardPrimaryLabel() {
    if (store.uiMode === "self") {
      const step = getCurrentFlowStep();
      if (step && (step.id === "guide" || step.id === "purpose")) return "次へ";
      if (store.finishLockedOnce) return "修正";
      return "確定";
    }
    return "次へ";
  }

  function isSelfListView() {
    return store.uiMode === "self" && !store.selfEditingStepId;
  }

  function isColorChapterComplete() {
    if (store.siteColorMode === "easy") return !!store.confirmed["global-preset"];
    return COLOR_STEP_IDS_ORDERED.every((id) => !!store.confirmed[id]);
  }

  function isImageChapterComplete() {
    return IMAGE_STEP_IDS_ORDERED.every((id) => !!store.confirmed[id]);
  }

  function getGuidedChapter() {
    if (!isColorChapterComplete()) return "color";
    if (!isImageChapterComplete()) return "image";
    return "text";
  }

  function canOpenStep(stepId) {
    if (INTRO_STEP_IDS.has(stepId)) return !!store.intakeDone;
    if (!store.uiMode) return false;
    if (store.siteColorMode === "easy" && COLOR_STEP_IDS_ORDERED.includes(stepId) && stepId !== "global-preset") {
      return false;
    }
    if (store.uiMode === "self") return true;
    const meta = BADGE_META[stepId];
    if (!meta) return true;
    if ((meta.kind === "image" || meta.kind === "text") && !isColorChapterComplete()) return false;
    if (meta.kind === "text" && !isImageChapterComplete()) return false;
    return true;
  }

  function unlockHintForStep(stepId) {
    if (canOpenStep(stepId)) return "";
    if (!store.intakeDone || !store.uiMode) return "はじめにの選択を終えてから進めてください";
    if (store.siteColorMode === "easy" && COLOR_STEP_IDS_ORDERED.includes(stepId) && stepId !== "global-preset") {
      return "簡単モードでは色1の雰囲気選択だけです。細かく直すときは色モードをこだわり（全色解放）へ";
    }
    if (store.uiMode === "self") return "";
    const meta = BADGE_META[stepId];
    if (!meta) return "";
    if ((meta.kind === "image" || meta.kind === "text") && !isColorChapterComplete()) {
      return "色1で「これでOK（レイアウトへ）」を押すと、画像の選択ができます";
    }
    if (meta.kind === "text" && !isImageChapterComplete()) {
      return "画像をすべて選び終えると、文字の入力ができます";
    }
    return "";
  }

  function showUnlockHint(stepId) {
    const hint = unlockHintForStep(stepId);
    const status = document.getElementById("wizard-status");
    if (status && hint) status.textContent = hint;
    return !!hint;
  }

  function inferGuidedUnlocks() {
    if (isColorChapterComplete()) store.guidedImageUnlocked = true;
    if (isImageChapterComplete()) store.guidedTextUnlocked = true;
  }

  function progressColorStepIds() {
    if (store.siteColorMode === "easy") return ["global-preset"];
    return COLOR_STEP_IDS_ORDERED.slice();
  }

  function progressBarStepIds() {
    return progressColorStepIds().concat(IMAGE_STEP_IDS_ORDERED, TEXT_STEP_IDS_ORDERED);
  }

  function countUnconfirmedBarSteps() {
    return progressBarStepIds().filter((id) => !store.confirmed[id]);
  }

  function syncWizardNavVisibility() {
    const nav = document.getElementById("wizard-nav");
    if (!nav) return;
    nav.hidden = false;
  }

  function buildProgressBar() {
    const bar = document.getElementById("wizard-progress-bar");
    if (!bar) return;
    bar.innerHTML = "";
    bar.classList.add("is-chapter-rows");
    delete bar.dataset.layout;

    function appendChapterRow(kind, ids) {
      const row = document.createElement("div");
      row.className = "wizard-progress-row";
      row.setAttribute("data-chapter", kind);
      const lab = document.createElement("span");
      lab.className = "wizard-progress-row-label";
      lab.textContent = kindLabelJa(kind);
      row.appendChild(lab);
      const segs = document.createElement("div");
      segs.className = "wizard-progress-row-segs";
      ids.forEach((stepId) => {
        segs.appendChild(createProgressSegButton(stepId));
      });
      row.appendChild(segs);
      bar.appendChild(row);
    }

    appendChapterRow("color", progressColorStepIds());
    appendChapterRow("image", IMAGE_STEP_IDS_ORDERED);
    appendChapterRow("text", TEXT_STEP_IDS_ORDERED);
    bar.dataset.layout = "chapters-v1";
  }

  function createProgressSegButton(stepId) {
    const meta = BADGE_META[stepId];
    const wrap = document.createElement("span");
    wrap.className = "wizard-progress-bar-segment";
    if (meta && meta.intro) wrap.classList.add("is-intro");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "wizard-progress-seg";
    if (meta && meta.intro) btn.classList.add("is-intro");
    btn.setAttribute("data-progress-step", stepId);
    btn.textContent = meta ? String(meta.displayNum) : "?";
    btn.addEventListener("click", () => {
      if (!canOpenStep(stepId)) {
        showUnlockHint(stepId);
        return;
      }
      const status = document.getElementById("wizard-status");
      if (status) status.textContent = "";
      openStep(stepId);
    });
    wrap.appendChild(btn);
    return wrap;
  }

  function updateProgressBar() {
    buildProgressBar();
    const bar = document.getElementById("wizard-progress-bar");
    if (!bar) return;
    const current = getCurrentFlowStep();
    const gctEdit =
      store.guidedColorPhase === "pick" || store.guidedColorPhase === "shade"
        ? store.guidedColorEditStepId
        : null;
    bar.querySelectorAll("[data-progress-step]").forEach((btn) => {
      const stepId = btn.getAttribute("data-progress-step");
      const meta = BADGE_META[stepId];
      if (!meta) return;
      const confirmed = !!store.confirmed[stepId];
      const isCurrent = gctEdit ? stepId === gctEdit : !!(current && current.id === stepId);
      const locked = !canOpenStep(stepId);
      btn.classList.toggle("is-kind-color", meta.kind === "color");
      btn.classList.toggle("is-kind-image", meta.kind === "image");
      btn.classList.toggle("is-kind-text", meta.kind === "text");
      btn.classList.toggle("is-intro", !!meta.intro);
      btn.classList.toggle("is-done", confirmed);
      btn.classList.toggle("is-current", isCurrent);
      btn.classList.toggle("is-locked", locked);
      btn.classList.toggle("is-zip-target", store.zipHighlightStepId === stepId);
      btn.disabled = locked;
      btn.setAttribute("aria-disabled", locked ? "true" : "false");
      btn.setAttribute("aria-current", isCurrent ? "step" : "false");
      setStepHoverTip(btn, stepId);
      const unlockHint = locked ? unlockHintForStep(stepId) : "";
      btn.setAttribute(
        "aria-label",
        badgeDisplayName(stepId) +
          (unlockHint ? "。" + unlockHint : "") +
          (confirmed ? "。確定済み" : locked ? "" : "。未確定")
      );
    });
  }

  const HEADER_LOGO_HINT = {
    main: "サイトタイトル",
    sub: "納品後は押すと一番上へ"
  };
  const HEADER_NAV_HINT = {
    main: "各セクション名",
    sub: "納品後は押すとその場所へ"
  };

  function renderHeaderLogoHint(logo) {
    if (!logo) return;
    logo.classList.add("is-hint");
    logo.innerHTML =
      '<span class="logo-hint-main">' +
      HEADER_LOGO_HINT.main +
      '</span><span class="logo-hint-sub">' +
      HEADER_LOGO_HINT.sub +
      "</span>";
  }

  function renderHeaderNavHint(hint) {
    if (!hint) return;
    hint.innerHTML =
      '<span class="nav-hint-main">' +
      HEADER_NAV_HINT.main +
      '</span><span class="nav-hint-sub">' +
      HEADER_NAV_HINT.sub +
      "</span>";
  }

  function progressCheer(remaining) {
    if (remaining >= 1 && remaining <= 5) return "あと少しです";
    if (remaining >= 6 && remaining <= 10) return "もう少しです";
    if (remaining >= 11 && remaining <= 15) return "半分を過ぎました";
    return "";
  }

  function formatProgressParts(step, remaining) {
    if (store.uiMode === "self" && !step) {
      if (remaining === 0) {
        return { line: "一覧から「提出」を開いてください", cheer: "" };
      }
      return {
        line: "あと " + remaining + " 項目で完了",
        cheer: progressCheer(remaining)
      };
    }
    if (!step || step.id === "purpose" || step.id === "layout" || step.id === "guide") {
      return {
        line: "あと " + PROGRESS_BAR_TOTAL + " 項目で完了",
        cheer: ""
      };
    }
    const meta = BADGE_META[step.id];
    if (!meta) {
      if (remaining === 0) return { line: "完成です。文字11. 提出へ", cheer: "" };
      return {
        line: "あと " + remaining + " 項目で完了",
        cheer: progressCheer(remaining)
      };
    }
    if (remaining === 0) return { line: "完了です", cheer: "" };
    return {
      line: "あと " + remaining + " 項目で完了",
      cheer: progressCheer(remaining)
    };
  }

  function setProgressLine(el, step, remaining) {
    if (!el) return;
    const parts = formatProgressParts(step, remaining);
    const cheerHtml = parts.cheer
      ? '<span class="wizard-progress-cheer">' + parts.cheer + "</span>"
      : "";
    el.innerHTML =
      '<span class="wizard-progress-line">' + parts.line + "</span>" + cheerHtml;
  }

  function getCoachMessage() {
    if (store.chapterCoachMsg) return store.chapterCoachMsg;
    const introStep = getCurrentFlowStep();
    if (!store.uiMode) {
      if (introStep && introStep.id === "purpose") {
        return "用途を選んでから、下の「次へ」を押してください。";
      }
      return "ガイドかセルフを選ぶと、すぐに進みます。";
    }
    if (isSelfListView()) {
      const remaining = countUnconfirmedBarSteps().length;
      if (remaining === 0) {
        return "一覧の「提出」を開いて、同意のチェックと依頼ファイルへ進んでください。";
      }
      return "一覧から、まだ緑になっていない項目を選んで入力してください。";
    }
    const step = getCurrentFlowStep();
    const missingBar = countUnconfirmedBarSteps();
    const remaining = missingBar.length;
    if (store.uiMode === "self" && step && step.id !== "guide" && step.id !== "purpose" && step.id !== "finish") {
      return "入力が終わったら下の「確定」を押してください。";
    }
    if (step && step.id === "finish") {
      if (!validateFinish()) {
        return "チェックをしてから「この内容でOK・ZIPを保存する」を押してください。";
      }
      if (!store.confirmed.finish) {
        return "「この内容でOK・ZIPを保存する」を押してください。";
      }
      if (remaining > 0) {
        return (
          "まだ " +
          formatMissingStepList(missingBar, 2) +
          " が未完了です。上の進捗バーの番号をタップするか、見本サイトの番号（PCではマウスを乗せる）で、どの項目か分かります。"
        );
      }
      return "下の大きなボタンで依頼ファイルを保存できます。";
    }
    if (remaining === 0 && step && step.id !== "guide" && step.id !== "purpose") {
      return "進捗はすべて緑です。文字11. 提出へ進めます。";
    }
    return "";
  }

  function setZipHighlightStep(stepId) {
    store.zipHighlightStepId = stepId || null;
    updateProgressBar();
    if (!stepId) return;
    window.clearTimeout(setZipHighlightStep._timer);
    setZipHighlightStep._timer = window.setTimeout(() => {
      store.zipHighlightStepId = null;
      updateProgressBar();
    }, 4500);
  }

  function stackFor(value) {
    if (!value) return "'Zen Kaku Gothic New', sans-serif";
    return "'" + value + "', sans-serif";
  }

  function fillFontPickers() {
    document.querySelectorAll("[data-font-picker]").forEach((picker) => {
      const grid = picker.querySelector(".font-card-grid");
      const input = picker.querySelector('input[type="hidden"]');
      if (!grid || !input) return;
      const def = picker.getAttribute("data-font-default") || FONT_OPTIONS[0];
      if (!input.value) input.value = def;
      const current = FONT_OPTIONS.includes(input.value) ? input.value : def;
      input.value = current;
      grid.innerHTML = "";
      FONT_OPTIONS.forEach((name) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "font-card" + (name === current ? " is-selected" : "");
        btn.setAttribute("role", "radio");
        btn.setAttribute("aria-checked", name === current ? "true" : "false");
        btn.setAttribute("data-font", name);
        const label = FONT_LABELS[name] || name;
        btn.setAttribute("aria-label", label + "を選ぶ");
        btn.style.fontFamily = stackFor(name);
        btn.textContent = label;
        grid.appendChild(btn);
      });
    });
  }

  function syncFontPickers() {
    document.querySelectorAll("[data-font-picker]").forEach((picker) => {
      const input = picker.querySelector('input[type="hidden"]');
      if (!input) return;
      const current = input.value;
      picker.querySelectorAll(".font-card").forEach((btn) => {
        const on = btn.getAttribute("data-font") === current;
        btn.classList.toggle("is-selected", on);
        btn.setAttribute("aria-checked", on ? "true" : "false");
      });
    });
  }

  function setupFontPickers() {
    document.querySelectorAll("[data-font-picker]").forEach((picker) => {
      const input = picker.querySelector('input[type="hidden"]');
      const grid = picker.querySelector(".font-card-grid");
      if (!input || !grid) return;
      grid.addEventListener("click", (ev) => {
        const btn = ev.target.closest(".font-card");
        if (!btn || !grid.contains(btn)) return;
        const name = btn.getAttribute("data-font");
        if (!name) return;
        input.value = name;
        syncFontPickers();
        applyAllConfirmed();
        scheduleSave();
        updateWizardUi();
      });
    });
  }

  function rememberImageDefaults() {
    const hero = root.querySelector(".hero-photo");
    if (hero) IMAGE_DEFAULTS.hero_image = hero.getAttribute("data-default-src") || hero.getAttribute("src");
    root.querySelectorAll("#about-photos .skill-card-img").forEach((img, i) => {
      IMAGE_DEFAULTS["about_image_" + (i + 1)] = img.getAttribute("data-default-src") || img.getAttribute("src");
    });
    root.querySelectorAll("#works-list .work-thumb").forEach((img, i) => {
      IMAGE_DEFAULTS["work_" + (i + 1) + "_image"] = img.getAttribute("data-default-src") || img.getAttribute("src");
    });
  }

  function setImageUrl(key, file) {
    if (imageUrls[key]) URL.revokeObjectURL(imageUrls[key]);
    if (!file) {
      delete imageUrls[key];
      return null;
    }
    const url = URL.createObjectURL(file);
    imageUrls[key] = url;
    return url;
  }

  function readFileInput(name) {
    const input = form.elements.namedItem(name);
    return input && input.files && input.files[0] ? input.files[0] : null;
  }

  function captureImages(names) {
    const out = {};
    names.forEach((name) => {
      const file = readFileInput(name);
      if (file) {
        setImageUrl(name, file);
        out[name] = true;
      } else {
        if (imageUrls[name]) {
          URL.revokeObjectURL(imageUrls[name]);
          delete imageUrls[name];
        }
        out[name] = false;
      }
    });
    return out;
  }

  function markUserUpload(el, on) {
    if (!el) return;
    let target = null;
    if (el.classList.contains("hero-photo")) target = el.closest(".hero-stage");
    else if (el.classList.contains("skill-card-img")) target = el.closest(".skill-card");
    else if (el.classList.contains("work-thumb")) target = el.closest(".work-item-link, .work-item");
    else if (el.id === "preview-logo-img") target = el.closest(".logo-wrap");
    if (target) target.classList.toggle("is-user-upload", !!on);
  }

  function applyImageSlot(name, selectorOrFn, active) {
    const el = typeof selectorOrFn === "string" ? root.querySelector(selectorOrFn) : selectorOrFn();
    if (!el) return;
    if (active && imageUrls[name]) {
      el.src = imageUrls[name];
      markUserUpload(el, true);
      if (name === "logo_image") el.hidden = false;
    } else {
      markUserUpload(el, false);
      if (name === "logo_image") {
        el.hidden = true;
        el.removeAttribute("src");
      } else if (IMAGE_DEFAULTS[name]) {
        el.src = IMAGE_DEFAULTS[name];
      }
    }
    if (name === "logo_image") syncLogoPresentation();
  }

  function getLogoMode() {
    return fieldValue("logo_mode") || "text";
  }

  function getLogoOrder() {
    return fieldValue("logo_order") || "image-first";
  }

  function syncLogoModePanels() {
    const mode = getLogoMode();
    document.querySelectorAll("[data-logo-panel]").forEach((panel) => {
      const key = panel.getAttribute("data-logo-panel");
      if (key === "text") panel.hidden = mode === "image";
      else if (key === "image") panel.hidden = mode === "text";
      else if (key === "order") panel.hidden = mode !== "both";
      syncPanelFieldLock(panel, panel.hidden);
    });
  }

  function setupLogoModeUi() {
    form.querySelectorAll('input[name="logo_mode"], input[name="logo_order"]').forEach((input) => {
      input.addEventListener("change", () => {
        syncLogoModePanels();
        syncLogoPresentation();
        scheduleSave();
      });
    });
    syncLogoModePanels();
  }

  function syncLogoPresentation() {
    const mode = getLogoMode();
    const order = getLogoOrder();
    const wrap = root.querySelector(".logo-wrap");
    const img = document.getElementById("preview-logo-img");
    const text = document.getElementById("preview-logo-text");
    const brand = fieldValue("brand_name");
    const hasImg = !!(img && img.getAttribute("src") && imageUrls.logo_image);

    if (wrap) {
      wrap.dataset.logoMode = mode;
      wrap.classList.toggle("is-text-first", mode === "both" && order === "text-first");
      wrap.classList.toggle("is-image-first", !(mode === "both" && order === "text-first"));
    }

    if (img) {
      if (mode === "text" || !hasImg) {
        img.hidden = true;
      } else {
        img.hidden = false;
        img.src = imageUrls.logo_image;
      }
    }

    if (text) {
      if (mode === "image") {
        if (hasImg) {
          text.hidden = true;
        } else {
          text.hidden = false;
          text.classList.add("is-hint");
          text.innerHTML =
            '<span class="logo-hint-main">ロゴ画像</span><span class="logo-hint-sub">選ぶとここに出ます</span>';
        }
      } else if (brand) {
        text.hidden = false;
        text.classList.remove("is-hint");
        text.textContent = brand;
      } else {
        const purposeBrand = purposeField("brand_name");
        if (purposeBrand) {
          text.hidden = false;
          text.classList.remove("is-hint");
          text.textContent = purposeBrand;
        } else {
          text.hidden = false;
          renderHeaderLogoHint(text);
        }
      }
    }
  }

  function syncFooterBrand() {
    const el = document.getElementById("footer-brand");
    if (!el) return;
    const name = String(fieldValue("brand_name") || "").trim();
    el.textContent = name || purposeField("brand_name") || "店名";
  }

  function syncContactPanels() {
    store.draftContact.label = !!(form.elements.namedItem("contact_show_label") || {}).checked;
    store.draftContact.note1 = !!(form.elements.namedItem("contact_show_note_1") || {}).checked;
    store.draftContact.note2 = !!(form.elements.namedItem("contact_show_note_2") || {}).checked;
    document.querySelectorAll("[data-contact-panel]").forEach((panel) => {
      const key = panel.getAttribute("data-contact-panel");
      if (key === "label") panel.hidden = !store.draftContact.label;
      if (key === "note1") panel.hidden = !store.draftContact.note1;
      if (key === "note2") panel.hidden = !store.draftContact.note2;
    });
  }

  function syncExtraPanels() {
    ["hours", "access", "address"].forEach((key) => {
      const toggle = document.querySelector('[data-extra-toggle="' + key + '"]');
      if (toggle) store.draftExtras[key] = !!toggle.checked;
    });
    const anyOn = ["hours", "access", "address"].some((key) => !!store.draftExtras[key]);
    const emptyNote = document.getElementById("extra-fill-empty");
    const fieldset = document.getElementById("extra-fill-block");
    if (emptyNote) emptyNote.hidden = anyOn;
    if (fieldset) {
      const legend = fieldset.querySelector(":scope > legend");
      if (legend) legend.hidden = !anyOn;
    }
    document.querySelectorAll("[data-extra-panel]").forEach((panel) => {
      const key = panel.getAttribute("data-extra-panel");
      panel.hidden = !store.draftExtras[key];
    });
  }

  function syncFontWishPanel() {
    const select = form.elements.namedItem("font_wish_target");
    const target = select && select.value ? String(select.value).trim() : "";
    const panel = document.querySelector("[data-font-wish-panel]");
    if (panel) panel.hidden = !target;
  }

  function setupFontWishDraft() {
    const select = form.elements.namedItem("font_wish_target");
    if (select) {
      select.addEventListener("change", () => {
        syncFontWishPanel();
        scheduleSave();
      });
    }
    syncFontWishPanel();
  }

  function setupContactDraft() {
    document.querySelectorAll("[data-contact-toggle]").forEach((input) => {
      input.addEventListener("change", () => {
        syncContactPanels();
        applyAllConfirmed();
        scheduleSave();
      });
    });
    syncContactPanels();
  }

  function syncPreviewHeaderChrome() {
    syncLogoPresentation();
    syncFooterBrand();

    const about = resolvePreviewText(fieldValue("about_section_name"), "about_section_name", "");
    const works = resolvePreviewText(fieldValue("works_section_name"), "works_section_name", "");
    const contact = resolvePreviewText(fieldValue("contact_section_name"), "contact_section_name", "");
    const hasNav = !!(about || works || contact);
    const hint = document.getElementById("preview-nav-hint");
    const live = document.getElementById("preview-nav-live");
    if (hint) {
      hint.hidden = hasNav;
      if (!hasNav) renderHeaderNavHint(hint);
    }
    if (live) live.hidden = !hasNav;
    if (hasNav) {
      const t = previewDefaults.text;
      applyFilledText(document.getElementById("nav-about"), about, t.aboutLabel);
      applyFilledText(document.getElementById("nav-works"), works, t.worksLabel);
      applyFilledText(document.getElementById("nav-contact"), contact, t.contactHeading);
    }
  }

  function clearStepImages(stepId) {
    const keys = STEP_IMAGE_KEYS[stepId];
    if (!keys) return;
    keys.forEach((name) => {
      if (imageUrls[name]) {
        URL.revokeObjectURL(imageUrls[name]);
        delete imageUrls[name];
      }
    });
  }

  function applyImageSlotByName(name, active) {
    if (name === "logo_image") {
      applyImageSlot(name, "#preview-logo-img", active);
      return;
    }
    if (name === "hero_image") {
      applyImageSlot(name, ".hero-photo", active);
      return;
    }
    if (name.startsWith("about_image_")) {
      const n = Number(name.replace("about_image_", ""));
      applyImageSlot(name, () => root.querySelectorAll("#about-photos .skill-card-img")[n - 1], active);
      return;
    }
    if (/^work_\d+_image$/.test(name)) {
      const n = Number(name.match(/^work_(\d+)_image$/)[1]);
      applyImageSlot(name, () => root.querySelectorAll("#works-list .work-thumb")[n - 1], active);
    }
  }

  const LIVE_IMAGE_INPUT_NAMES = [
    "hero_image",
    "about_image_1",
    "about_image_2",
    "about_image_3",
    "about_image_4",
    "work_1_image",
    "work_2_image",
    "work_3_image",
    "logo_image"
  ];

  function applyDraftImagesFromInputs() {
    LIVE_IMAGE_INPUT_NAMES.forEach((name) => {
      const file = readFileInput(name);
      if (!file) return;
      setImageUrl(name, file);
      applyImageSlotByName(name, true);
    });
    syncLogoPresentation();
  }

  function scrollPreviewForImageInput(inputName) {
    const stepByImage = {
      hero_image: "hero-image",
      logo_image: "logo-text",
      about_image_1: "about-images",
      about_image_2: "about-images",
      about_image_3: "about-images",
      about_image_4: "about-images",
      work_1_image: "works-images",
      work_2_image: "works-images",
      work_3_image: "works-images"
    };
    const stepId = stepByImage[inputName];
    if (!stepId) return;
    const block = form.querySelector('.dash-block[data-step-id="' + stepId + '"]');
    const sel = block && block.getAttribute("data-preview-target");
    if (sel) window.setTimeout(() => scrollPreviewTo(sel), 50);
  }

  function applyAllImages() {
    applyImageSlot("logo_image", "#preview-logo-img", false);
    applyImageSlot("hero_image", ".hero-photo", false);
    for (let i = 1; i <= 4; i += 1) {
      const idx = i;
      applyImageSlot("about_image_" + i, () => root.querySelectorAll("#about-photos .skill-card-img")[idx - 1], false);
    }
    for (let i = 1; i <= 3; i += 1) {
      const idx = i;
      applyImageSlot("work_" + i + "_image", () => root.querySelectorAll("#works-list .work-thumb")[idx - 1], false);
    }

    Object.keys(STEP_IMAGE_KEYS).forEach((stepId) => {
      if (!store.confirmed[stepId]) return;
      const snap = store.snapshots[stepId];
      if (!snap || !snap.images) return;
      Object.keys(snap.images).forEach((name) => {
        if (!snap.images[name]) return;
        applyImageSlotByName(name, true);
      });
    });

    applyDraftImagesFromInputs();
  }

  function softFrom(hex) {
    try {
      const n = hex.replace("#", "");
      const full = n.length === 3 ? n.split("").map((c) => c + c).join("") : n;
      const r = parseInt(full.slice(0, 2), 16);
      const g = parseInt(full.slice(2, 4), 16);
      const b = parseInt(full.slice(4, 6), 16);
      const mix = (c) => Math.round(c + (255 - c) * 0.35);
      const h = (c) => mix(c).toString(16).padStart(2, "0");
      return "#" + h(r) + h(g) + h(b);
    } catch (e) {
      return hex;
    }
  }

  function softMuted(hex) {
    try {
      const n = hex.replace("#", "");
      const full = n.length === 3 ? n.split("").map((c) => c + c).join("") : n;
      let r = parseInt(full.slice(0, 2), 16);
      let g = parseInt(full.slice(2, 4), 16);
      let b = parseInt(full.slice(4, 6), 16);
      const bright = (r + g + b) / 3 > 140;
      if (bright) {
        r = Math.max(0, r - 40);
        g = Math.max(0, g - 40);
        b = Math.max(0, b - 40);
      } else {
        r = Math.min(255, r + 40);
        g = Math.min(255, g + 40);
        b = Math.min(255, b + 40);
      }
      const h = (c) => c.toString(16).padStart(2, "0");
      return "#" + h(r) + h(g) + h(b);
    } catch (e) {
      return hex;
    }
  }

  function norm(hex) {
    return (hex || "").toLowerCase();
  }

  function toColorInput(hex) {
    const n = String(hex || "").replace("#", "");
    if (n.length === 3) return "#" + n.split("").map((c) => c + c).join("");
    return "#" + n.slice(0, 6);
  }

  function mixHex(a, b, amount) {
    const parse = (hex) => {
      const n = toColorInput(hex).slice(1);
      return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
    };
    const A = parse(a);
    const B = parse(b);
    const t = Math.max(0, Math.min(1, amount));
    const m = (i) => Math.round(A[i] * (1 - t) + B[i] * t);
    const h = (c) => c.toString(16).padStart(2, "0");
    return "#" + h(m(0)) + h(m(1)) + h(m(2));
  }

  function hexAtLightness(hueId, t) {
    const hue = COLOR_HUES.find((h) => h.id === hueId);
    if (!hue) return "#888888";
    const x = Math.max(0, Math.min(1, t));
    if (x <= 0.5) return mixHex(hue.light, hue.base, x * 2);
    return mixHex(hue.base, hue.dark, (x - 0.5) * 2);
  }

  function findNearestHueState(hex) {
    const n = String(hex || "").toLowerCase();
    let best = { hueId: "green", t: 0.5, dist: Infinity };
    COLOR_HUES.forEach((hue) => {
      for (let i = 0; i <= 20; i++) {
        const t = i / 20;
        const h = hexAtLightness(hue.id, t).toLowerCase();
        const parse = (x) => {
          const s = toColorInput(x).slice(1);
          return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
        };
        const A = parse(n);
        const B = parse(h);
        const dist = Math.abs(A[0] - B[0]) + Math.abs(A[1] - B[1]) + Math.abs(A[2] - B[2]);
        if (dist < best.dist) best = { hueId: hue.id, t, dist };
      }
    });
    return { hueId: best.hueId, t: best.t };
  }

  function isColorCodeMode(key) {
    return store.colorModes[key] === "code";
  }

  function draftColorForPreview(key) {
    if (isColorCodeMode(key)) return "#ffffff";
    return store.draftColors[key];
  }

  function applyColorCodePreviewMask(colors) {
    SWATCH_KEYS.forEach((key) => {
      if (isColorCodeMode(key)) colors[key] = "#ffffff";
    });
    if (colors.pageBg) colors.pageBgSoft = softFrom(colors.pageBg);
    if (colors.bodyInk) colors.bodyMuted = softMuted(colors.bodyInk);
    return colors;
  }

  function syncHueSelectFromDraft() {
    SWATCH_KEYS.forEach((key) => {
      hueSelectByKey[key] = findNearestHueState(store.draftColors[key]);
    });
  }

  function clearAllColorCodes() {
    SWATCH_KEYS.forEach((key) => {
      store.colorCodes[key] = "";
      store.colorModes[key] = "pick";
    });
  }

  function setColorMode(key, mode) {
    store.colorModes[key] = mode === "code" ? "code" : "pick";
    if (store.colorModes[key] === "pick") {
      store.colorCodes[key] = "";
    }
    refreshColorUi();
    applyLiveColors(true);
    scheduleSave();
  }

  function fieldValue(name) {
    const el = form.elements.namedItem(name);
    if (!el) return "";
    if (el instanceof RadioNodeList || (el.length && el[0] && el[0].type === "radio")) {
      const checked = form.querySelector('input[name="' + name + '"]:checked');
      return checked ? checked.value : "";
    }
    if (el.type === "checkbox") return el.checked ? el.value || "1" : "";
    return el.value || "";
  }

  function purposeField(name) {
    const pack = store.sitePurpose && PURPOSE_PACKS[store.sitePurpose];
    if (!pack || !pack.fields) return "";
    return String(pack.fields[name] || "");
  }

  /** 入力があれば入力、空なら用途の例文、それもなければハードフォールバック */
  function resolvePreviewText(raw, fieldName, hardFallback) {
    if (raw != null && String(raw).trim() !== "") return String(raw).trim();
    const purpose = purposeField(fieldName);
    if (purpose) return purpose;
    if (hardFallback != null && String(hardFallback).trim() !== "") return String(hardFallback).trim();
    return "";
  }

  function googleMapsSearchUrl(query) {
    const q = String(query || "").trim();
    if (!q) return "";
    return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q);
  }

  function applyAddressLink(fields, hardFallback) {
    const addressLead = document.getElementById("address-lead");
    if (!addressLead) return;
    const raw = fields && typeof fields === "object" ? fields.address_text : fields;
    const display = resolvePreviewText(raw, "address_text", hardFallback != null ? hardFallback : "");
    if (!display) {
      addressLead.textContent = "";
      addressLead.removeAttribute("href");
      addressLead.classList.add("is-no-link");
      return;
    }
    addressLead.textContent = display;
    const url = googleMapsSearchUrl(display);
    if (url) {
      addressLead.href = url;
      addressLead.setAttribute("target", "_blank");
      addressLead.setAttribute("rel", "noopener noreferrer");
      addressLead.classList.remove("is-no-link");
    }
  }

  function setFieldValue(name, value) {
    const el = form.elements.namedItem(name);
    if (!el) return;
    if (el instanceof RadioNodeList || (el.length && el[0] && el[0].type === "radio")) {
      Array.from(form.querySelectorAll('input[name="' + name + '"]')).forEach((input) => {
        input.checked = input.value === value;
      });
      return;
    }
    if (el.type === "checkbox") {
      el.checked = !!value && value !== "0" && value !== "false";
      return;
    }
    if (el.type === "file") return;
    el.value = value == null ? "" : String(value);
  }

  function formToObject() {
    const data = {};
    Array.from(form.querySelectorAll("input, textarea, select")).forEach((el) => {
      if (!el.name || el.type === "file") return;
      if (!isFieldVisible(el)) return;
      if (el.type === "checkbox") {
        data[el.name] = el.checked ? el.value || "1" : "";
        return;
      }
      if (el.type === "radio") {
        if (el.checked) data[el.name] = el.value;
        return;
      }
      data[el.name] = el.value;
    });
    return data;
  }

  function applyFormObject(fields) {
    if (!fields) return;
    Object.keys(fields).forEach((name) => setFieldValue(name, fields[name]));
  }

  function capturePreviewDefaults() {
    const leads = Array.from(document.querySelectorAll("#hero-leads [data-sample-item]")).map((el) => el.textContent || "");
    const values = Array.from(document.querySelectorAll("#hero-values [data-sample-item]")).map((li) => ({
      title: (li.querySelector(".hero-value-title") || {}).textContent || "",
      text: (li.querySelector("p:last-child") || {}).textContent || ""
    }));
    const aboutName = (document.querySelector("#about .profile-name") || {}).textContent || "";
    const aboutLead = (document.querySelector("#about .section-lead") || {}).textContent || "";
    const accs = Array.from(document.querySelectorAll("#about-accordions [data-sample-item]")).map((el) => ({
      title: (el.querySelector("summary") || {}).textContent || "",
      body: (el.querySelector(".accordion-body") || {}).textContent || ""
    }));
    const works = Array.from(document.querySelectorAll("#works-list [data-sample-item]")).map((li) => ({
      title: (li.querySelector("h3") || {}).textContent || "",
      text: (li.querySelector(".work-item-copy p") || {}).textContent || ""
    }));
    const hoursLead = (document.querySelector("#hours .section-lead") || {}).textContent || "";
    const accessLead = (document.querySelector("#access .section-lead") || {}).textContent || "";
    const contactLeads = Array.from(document.querySelectorAll("#contact .contact-band-lead")).map((el) => el.textContent || "");
    const contactMail = (document.querySelector("#contact .sample-mail") || {}).textContent || "";
    const logo = (document.getElementById("preview-logo-text") || {}).textContent || "";
    const heroTitle = (document.getElementById("hero-title") || {}).textContent || "";
    return {
      colors: { ...DEFAULTS },
      counts: Object.fromEntries(
        COUNT_IDS.map((id) => [id, COUNT_META[id] ? COUNT_META[id].defaultCount : 1])
      ),
      fonts: {
        display: "Shippori Mincho",
        catch: "Shippori Mincho",
        body: "Zen Kaku Gothic New"
      },
      extras: { hours: false, access: false, address: true },
      text: {
        logo,
        heroTitle,
        leads,
        values,
        aboutName,
        aboutLead,
        accs,
        works,
        hoursLead,
        accessLead,
        contactLeads,
        contactMail,
        aboutLabel: (document.getElementById("about-label") || {}).textContent || "見本枠1",
        aboutHeading: (document.getElementById("about-heading") || {}).textContent || "ここに大見出し",
        worksLabel: (document.getElementById("works-label") || {}).textContent || "見本枠2",
        worksHeading: (document.getElementById("works-heading") || {}).textContent || "ここに大見出し",
        worksLead: (document.getElementById("works-lead") || {}).textContent || "",
        contactLabel: (document.getElementById("contact-label") || {}).textContent || "ご連絡",
        contactHeading: (document.getElementById("contact-heading") || {}).textContent || "ご連絡"
      }
    };
  }

  function updateFontPreview() {
    syncFontPickers();
    applyAllConfirmed();
  }

  function readDraftFonts() {
    return {
      display: fieldValue("font_display") || "Shippori Mincho",
      catch: fieldValue("font_catch") || "Shippori Mincho",
      body: fieldValue("font_body") || "Zen Kaku Gothic New"
    };
  }

  function applyDraftTextsFromForm() {
    [
      "logo-text",
      "hero-text",
      "values-text",
      "about-text",
      "works-text",
      "extra-content",
      "contact-text"
    ].forEach((stepId) => {
      const snap = captureStepSnapshot(stepId);
      if (snap && snap.fields) applySnapshot(stepId, { fields: snap.fields });
    });
    syncPreviewHeaderChrome();
  }

  function copyColorDraft() {
    return JSON.parse(JSON.stringify(store.draftColors));
  }

  function captureColorSnapshot(stepId) {
    const keys = COLOR_STEP_FIELDS[stepId];
    if (!keys) return null;
    const colors = {};
    keys.forEach((key) => {
      colors[key] = store.draftColors[key];
    });
    if (keys.includes("pageBg")) colors.pageBgSoft = softFrom(store.draftColors.pageBg);
    if (keys.includes("bodyInk")) colors.bodyMuted = softMuted(store.draftColors.bodyInk);
    const snap = {
      colors: colors,
      colorCodes: Object.fromEntries(keys.map((k) => [k, store.colorCodes[k] || ""])),
      colorModes: Object.fromEntries(keys.map((k) => [k, store.colorModes[k] || "pick"]))
    };
    if (stepId === "global-preset") {
      snap.presetKey = store.chosenPresetKey;
    }
    if (stepId === "global-card") {
      snap.radius = fieldValue("radius") || DEFAULTS.radius;
    }
    if (stepId === "hero-color") {
      snap.headingScale = fieldValue("headingScale") || DEFAULTS.headingScale;
    }
    return snap;
  }

  function getEffectiveColors() {
    const colors = { ...DEFAULTS };
    STEPS.forEach((step) => {
      if (!store.confirmed[step.id]) return;
      const snap = store.snapshots[step.id];
      if (snap && snap.colors) Object.assign(colors, snap.colors);
      if (snap && snap.radius) colors.radius = snap.radius;
    });

    const current = getCurrentFlowStep();
    if (current && COLOR_STEP_FIELDS[current.id]) {
      COLOR_STEP_FIELDS[current.id].forEach((key) => {
        if (store.draftColors[key] != null) colors[key] = draftColorForPreview(key);
      });
      if (COLOR_STEP_FIELDS[current.id].includes("pageBg")) {
        colors.pageBgSoft = softFrom(colors.pageBg);
      }
      if (COLOR_STEP_FIELDS[current.id].includes("bodyInk")) {
        colors.bodyMuted = softMuted(colors.bodyInk);
      }
    }
    if (current && current.id === "global-card") {
      colors.radius = fieldValue("radius") || colors.radius || DEFAULTS.radius;
    }
    return applyColorCodePreviewMask(colors);
  }

  function markPresetChosen(key) {
    store.presetChosen = true;
    store.chosenPresetKey = key;
    document.querySelectorAll("[data-preset]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.getAttribute("data-preset") === key);
    });
    const randomBtn = document.getElementById("btn-random");
    if (randomBtn) randomBtn.classList.remove("is-active");
    renderGctPalette();
    scheduleSave();
  }

  function updateRandomUndoUi() {
    const u1 = document.getElementById("btn-random-undo-1");
    const u2 = document.getElementById("btn-random-undo-2");
    if (u1) u1.disabled = store.randomHistory.length < 1;
    if (u2) u2.disabled = store.randomHistory.length < 2;
  }

  function pushRandomHistory() {
    store.randomHistory.unshift(copyColorDraft());
    if (store.randomHistory.length > 2) store.randomHistory.length = 2;
    updateRandomUndoUi();
  }

  function restoreRandomHistory(index) {
    const snap = store.randomHistory[index];
    if (!snap) return;
    Object.assign(store.draftColors, snap);
    store.draftColors.pageBgSoft = softFrom(store.draftColors.pageBg);
    store.draftColors.bodyMuted = softMuted(store.draftColors.bodyInk);
    clearAllColorCodes();
    syncHueSelectFromDraft();
    markPresetChosen("random");
    refreshColorUi();
    applyLiveColors(true);
    scheduleSave();
  }

  function validateWizardStep(stepId) {
    return !getStepValidationError(stepId);
  }

  function getStepValidationError(stepId) {
    const action = wizardPrimaryLabel();
    if (stepId === "purpose" && !readSitePurposeFromForm()) {
      return "用途を選んでから、「" + action + "」を押してください。";
    }
    if (stepId === "layout" && !store.layoutSelected) {
      return "レイアウト（A／B／C）を選んでから、「" + action + "」を押してください。";
    }
    if (stepId === "guide" && !readUiModeFromForm()) {
      return "ガイドかセルフを選んでから進めてください。";
    }
    if (stepId === "finish" && !validateFinish()) {
      return "5項目にチェックをしてから進めてください。";
    }
    const over = getOverLimitFieldsInStep(stepId);
    if (over.length) {
      return "制限内の文字数で入力してください。";
    }
    const miss = getMissingImagesForStep(stepId);
    if (miss.length) {
      if (stepId === "hero-image") {
        return "キャッチ画像が選ばれていないと、「" + action + "」は押せません。";
      }
      if (stepId === "about-images" || stepId === "works-images") {
        return "選んだ枚数ぶんの写真がないと、「" + action + "」は押せません。";
      }
      return "必要な写真が選ばれていないと、「" + action + "」は押せません。";
    }
    if (stepId === "logo-text") {
      const mode = getLogoMode();
      if ((mode === "image" || mode === "both") && !inputHasFile("logo_image")) {
        return "ロゴ画像が選ばれていないと、「" + action + "」は押せません。";
      }
    }
    return "";
  }

  function fieldMaxFor(name) {
    return FIELD_MAX[name] || 0;
  }

  function isFieldVisible(el) {
    if (!el) return false;
    const wrap = el.closest("[data-fill-for], [data-logo-panel], label, fieldset");
    let node = el;
    while (node && node !== form) {
      if (node.hidden) return false;
      if (node.getAttribute && node.getAttribute("hidden") != null && node.hidden !== false) {
        /* continue */
      }
      node = node.parentElement;
    }
    if (wrap && wrap.hidden) return false;
    const fill = el.closest("[data-fill-for]");
    if (fill && fill.hidden) return false;
    const logoPanel = el.closest("[data-logo-panel]");
    if (logoPanel && logoPanel.hidden) return false;
    return true;
  }

  function getOverLimitFieldsInStep(stepId) {
    const block = form.querySelector('.dash-block[data-step-id="' + stepId + '"]');
    if (!block) return [];
    const over = [];
    block.querySelectorAll("input[name], textarea[name]").forEach((el) => {
      const name = el.getAttribute("name");
      const max = fieldMaxFor(name);
      if (!max || el.type === "file" || el.type === "checkbox" || el.type === "radio" || el.type === "hidden") return;
      if (!isFieldVisible(el)) return;
      if ((el.value || "").length > max) over.push(name);
    });
    return over;
  }

  function inputHasFile(name) {
    const input = form.elements.namedItem(name);
    return !!(input && input.files && input.files[0]);
  }

  function requiredImageInputs() {
    const list = [{ name: "hero_image", label: "キャッチ画像" }];
    const aboutN = Number(store.draftCounts["about-photos"] || 1);
    for (let i = 1; i <= aboutN; i += 1) {
      list.push({ name: "about_image_" + i, label: "枠1の写真" + i });
    }
    const worksN = Number(store.draftCounts["works-list"] || 1);
    for (let i = 1; i <= worksN; i += 1) {
      list.push({ name: "work_" + i + "_image", label: "枠2の画像" + i });
    }
    const mode = getLogoMode();
    if (mode === "image" || mode === "both") {
      list.push({ name: "logo_image", label: "ロゴ画像" });
    }
    return list;
  }

  function missingRequiredImages() {
    return requiredImageInputs().filter((item) => !inputHasFile(item.name));
  }

  function getMissingImagesForStep(stepId) {
    if (stepId === "hero-image") {
      return inputHasFile("hero_image") ? [] : ["hero_image"];
    }
    if (stepId === "about-images") {
      const n = Number(store.draftCounts["about-photos"] || 1);
      const miss = [];
      for (let i = 1; i <= n; i += 1) {
        if (!inputHasFile("about_image_" + i)) miss.push("about_image_" + i);
      }
      return miss;
    }
    if (stepId === "works-images") {
      const n = Number(store.draftCounts["works-list"] || 1);
      const miss = [];
      for (let i = 1; i <= n; i += 1) {
        if (!inputHasFile("work_" + i + "_image")) miss.push("work_" + i + "_image");
      }
      return miss;
    }
    return [];
  }

  function showValidationNotice(msg) {
    hideWizardFootPanel();
    const status = document.getElementById("wizard-status");
    if (status) status.textContent = msg;
  }

  function syncCharCounter(el) {
    if (!el || !el.name) return;
    const max = fieldMaxFor(el.name);
    if (!max) return;
    const counter = form.querySelector('[data-char-for="' + el.name + '"]');
    if (!counter) return;
    const n = (el.value || "").length;
    counter.textContent = n + " / " + max;
    counter.classList.toggle("is-max", n >= max);
  }

  function setupCharLimits() {
    Object.keys(FIELD_MAX).forEach((name) => {
      const el = form.elements.namedItem(name);
      if (!el || !el.setAttribute) return;
      if (el instanceof RadioNodeList) return;
      const max = FIELD_MAX[name];
      el.setAttribute("maxlength", String(max));
      let counter = form.querySelector('[data-char-for="' + name + '"]');
      if (!counter) {
        counter = document.createElement("span");
        counter.className = "char-count";
        counter.setAttribute("data-char-for", name);
        counter.setAttribute("aria-live", "polite");
        if (el.parentNode) el.parentNode.appendChild(counter);
      }
      syncCharCounter(el);
    });
  }

  function imageMaxEdgeForName(name) {
    if (IMAGE_EDGE[name]) return IMAGE_EDGE[name];
    return IMAGE_EDGE.default;
  }

  function assignFileToInput(input, file) {
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
  }

  async function resizeImageFile(file, maxEdge) {
    if (!file || !/^image\//.test(file.type || "")) return file;
    if (file.type === "image/svg+xml") return file;
    let bitmap;
    try {
      bitmap = await createImageBitmap(file);
    } catch (e) {
      return file;
    }
    const long = Math.max(bitmap.width, bitmap.height);
    const needResize = long > maxEdge;
    const needReencode = needResize || file.size > 1.2 * 1024 * 1024 || file.type !== "image/jpeg";
    if (!needReencode) {
      bitmap.close();
      return file;
    }
    const scale = needResize ? maxEdge / long : 1;
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    if (!blob) return file;
    const base = String(file.name || "image").replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], base, { type: "image/jpeg", lastModified: Date.now() });
  }

  function setupImageResize() {
    form.querySelectorAll('input[type="file"]').forEach((input) => {
      input.addEventListener("change", async () => {
        const file = input.files && input.files[0];
        if (!file) {
          setImageUrl(input.name, null);
          applyAllImages();
          scheduleSave();
          return;
        }
        input.disabled = true;
        try {
          const resized = await resizeImageFile(file, imageMaxEdgeForName(input.name));
          if (resized && resized !== file) assignFileToInput(input, resized);
        } catch (e) {
          /* keep original */
        }
        input.disabled = false;
        applyAllImages();
        scrollPreviewForImageInput(input.name);
        scheduleSave();
      });
    });
  }

  function stepDisplayLabel(step) {
    if (!step) return "";
    return step.num + ". " + step.label;
  }

  function showSelfList(anchorStepId) {
    store.selfEditingStepId = null;
    form.querySelectorAll(":scope > details.dash-block").forEach((d) => {
      d.open = false;
      d.classList.remove("is-active-step", "is-wizard-active");
    });
    switchToDashTab();
    const dashBody = document.querySelector(".dash-body");
    if (dashBody && anchorStepId) {
      const block = form.querySelector('.dash-block[data-step-id="' + anchorStepId + '"]');
      if (block) {
        window.requestAnimationFrame(() => {
          dashBody.scrollTo({ top: Math.max(0, block.offsetTop - 12), behavior: "smooth" });
        });
      }
    }
    hideWizardFootPanel();
    updateWizardUi();
    applyLiveColors(false);
    applyAllConfirmed();
    scheduleSave();
  }

  function openSelfStep(stepId) {
    if (!canOpenStep(stepId)) {
      showUnlockHint(stepId);
      return;
    }
    const step = STEPS.find((s) => s.id === stepId);
    if (!step) return;
    const block = form.querySelector('.dash-block[data-step-id="' + stepId + '"]');
    if (!block) return;

    if (store.confirmed.finish && stepId !== "finish") {
      unconfirmFinishSoft();
      store.finishLockedOnce = true;
    }

    store.selfEditingStepId = stepId;
    const flow = getFlowSteps();
    const idx = flow.findIndex((s) => s.id === stepId);
    if (idx >= 0) store.wizardStepIndex = idx;

    switchToDashTab();
    form.querySelectorAll(":scope > details.dash-block").forEach((d) => {
      const active = d === block;
      d.classList.toggle("is-active-step", active);
      d.classList.remove("is-wizard-active");
      if (active) d.open = true;
      else d.open = false;
    });

    const dashBody = document.querySelector(".dash-body");
    if (dashBody) {
      window.requestAnimationFrame(() => {
        dashBody.scrollTo({ top: Math.max(0, block.offsetTop - 12), behavior: "smooth" });
      });
    }

    updateWizardUi();
    applyLiveColors(false);
    applyAllConfirmed();

    if (stepId !== "guide" && stepId !== "purpose" && stepId !== "layout") {
      const sel = block.getAttribute("data-preview-target");
      if (sel) window.setTimeout(() => scrollPreviewTo(sel), 50);
      const hit = root.querySelector('[data-open-step="' + stepId + '"].preview-hit') ||
        root.querySelector('.preview-hit[data-open-step="' + stepId + '"]');
      if (hit) {
        hit.classList.add("is-target-flash");
        window.setTimeout(() => hit.classList.remove("is-target-flash"), 600);
      }
    }
    scheduleSave();
  }

  function restoreViewAfterMode() {
    if (store.uiMode === "self") {
      if (store.confirmed.guide) {
        if (store.selfEditingStepId) openSelfStep(store.selfEditingStepId);
        else showSelfList();
      } else if (store.confirmed.layout) {
        openSelfStep("guide");
      } else if (store.confirmed.purpose) {
        openSelfStep("layout");
      } else {
        openSelfStep("purpose");
      }
      return;
    }
    if (store.uiMode === "guided") {
      store.selfEditingStepId = null;
      showWizardStep(resolveWizardStepIndex());
      return;
    }
    store.selfEditingStepId = null;
    if (store.confirmed.purpose && !store.confirmed.layout) {
      const flow = getFlowSteps();
      const layoutIdx = flow.findIndex((s) => s.id === "layout");
      showWizardStep(layoutIdx >= 0 ? layoutIdx : 1);
      return;
    }
    if (store.confirmed.layout && !store.confirmed.guide) {
      const flow = getFlowSteps();
      const guideIdx = flow.findIndex((s) => s.id === "guide");
      showWizardStep(guideIdx >= 0 ? guideIdx : 2);
      return;
    }
    showWizardStep(0);
  }

  function showWizardStep(index) {
    if (store.uiMode === "self") {
      const flow = getFlowSteps();
      const idx = Math.max(0, Math.min(flow.length - 1, index));
      const step = flow[idx];
      if (step) openSelfStep(step.id);
      return;
    }
    const flow = getFlowSteps();
    const idx = Math.max(0, Math.min(flow.length - 1, index));
    const prevStep = flow[store.wizardStepIndex];
    let step = flow[idx];
    if (!step) return;
    if (GUIDED_COLOR_TUNE_IDS.includes(step.id)) {
      /* こだわり色はプリセット画面のハニカム編集へ。見本スクロールは gctOpen 側で行う */
      if (store.siteColorMode === "detail") {
        gctOpenPaletteColor(step.id);
        return;
      }
      const presetIdx = flow.findIndex((s) => s.id === "global-preset");
      if (presetIdx >= 0) {
        scrollPreviewForColorStep(step.id);
        showWizardStep(presetIdx);
        return;
      }
    }
    prepareGuidedColorPhaseForStep(prevStep ? prevStep.id : null, step.id);
    store.wizardStepIndex = idx;
    const block = form.querySelector('.dash-block[data-step-id="' + step.id + '"]');
    if (!block) return;

    switchToDashTab();
    form.querySelectorAll(":scope > details.dash-block").forEach((d) => {
      const active = d === block;
      d.open = active;
      d.classList.toggle("is-wizard-active", active);
      d.classList.toggle("is-active-step", active);
    });

    updateWizardUi();
    applyLiveColors(false);
    applyAllConfirmed();

    if (step.id !== "guide" && step.id !== "purpose") {
      const skipPresetScroll =
        step.id === "global-preset" &&
        store.guidedColorPhase === "pick" &&
        !!store.guidedColorEditStepId;
      if (!skipPresetScroll) {
        const sel = block.getAttribute("data-preview-target");
        if (sel) window.setTimeout(() => scrollPreviewTo(sel), 50);
        const hit = root.querySelector('[data-open-step="' + step.id + '"].preview-hit') ||
          root.querySelector('.preview-hit[data-open-step="' + step.id + '"]');
        if (hit) {
          hit.classList.add("is-target-flash");
          window.setTimeout(() => hit.classList.remove("is-target-flash"), 600);
        }
      }
    }
    scheduleSave();
    syncGuidedColorTrial();
  }

  function normalizeWizardStepIndex() {
    const flow = getFlowSteps();
    if (store.wizardStepIndex >= 0 && store.wizardStepIndex < flow.length) {
      return;
    }
    const legacy = STEPS[store.wizardStepIndex];
    if (legacy) {
      const fi = flow.findIndex((s) => s.id === legacy.id);
      if (fi >= 0) {
        store.wizardStepIndex = fi;
        return;
      }
    }
    store.wizardStepIndex = resolveWizardStepIndex();
  }

  function applyUiMode() {
    const wizardNav = document.getElementById("wizard-nav");
    const wizardTop = document.getElementById("wizard-top");

    document.body.classList.remove("mode-guided", "mode-self", "wizard-mode");

    if (store.uiMode === "guided") {
      document.body.classList.add("mode-guided", "wizard-mode");
      if (wizardNav) wizardNav.hidden = false;
      if (wizardTop) wizardTop.hidden = false;
    } else if (store.uiMode === "self") {
      document.body.classList.add("mode-self");
      if (wizardNav) wizardNav.hidden = false;
      if (wizardTop) wizardTop.hidden = false;
      form.querySelectorAll(":scope > details.dash-block").forEach((d) => {
        d.classList.remove("is-wizard-active");
      });
    } else {
      document.body.classList.add("wizard-mode");
      if (wizardNav) wizardNav.hidden = false;
      if (wizardTop) wizardTop.hidden = false;
    }

    form.querySelectorAll(":scope > details.dash-block[data-step-id]").forEach((d) => {
      const id = d.getAttribute("data-step-id");
      d.classList.toggle("is-image-chapter", IMAGE_STEP_IDS.has(id));
      d.classList.toggle("is-text-chapter", TEXT_STEP_IDS.has(id));
    });

    syncBadgeLabels();
    updateZoneBadgeDoneState();
    inferGuidedUnlocks();
    normalizeWizardStepIndex();
    syncWizardNavVisibility();
    buildProgressBar();
  }

  function readUiModeFromForm() {
    const picked = form.querySelector('input[name="ui_mode"]:checked');
    return picked ? picked.value : null;
  }

  function readSitePurposeFromForm() {
    const picked = form.querySelector('input[name="site_purpose"]:checked');
    return picked ? picked.value : null;
  }

  function applySitePurpose(purposeKey) {
    const pack = PURPOSE_PACKS[purposeKey];
    if (!pack) return;
    store.sitePurpose = purposeKey;
    Object.keys(pack.fields).forEach((name) => {
      const el = form.elements.namedItem(name);
      if (!el || el.type === "file" || el.type === "checkbox" || el.type === "radio") return;
      el.value = "";
      el.setAttribute("placeholder", String(pack.fields[name] || ""));
    });
    if (pack.counts) {
      Object.keys(pack.counts).forEach((id) => {
        if (COUNT_META[id]) store.draftCounts[id] = pack.counts[id];
      });
      syncCountLabels();
    }
    PURPOSE_TEXT_STEPS.forEach((stepId) => {
      if (store.confirmed[stepId]) {
        store.snapshots[stepId] = captureStepSnapshot(stepId);
      }
    });
    applyAllConfirmed();
    syncPreviewHeaderChrome();
    scheduleSave();
  }

  function restartFromModeSelection() {
    hideWizardFootPanel();
    hideResetDraftModal();
    store.uiMode = null;
    store.selfEditingStepId = null;
    store.guidedImageUnlocked = false;
    store.guidedTextUnlocked = false;
    store.guidedColorPhase = null;
    store.guidedColorReturnPreset = false;
    store.guidedColorEditStepId = null;
    store.guidedColorDeck = [];
    store.guidedColorDeckIdx = 0;
    store.guidedColorTrial = {
      prevHex: null,
      slotHistory: [],
      slotHistoryIdx: -1
    };
    store.chapterCoachMsg = "";
    store.zipHighlightStepId = null;
    form.querySelectorAll('input[name="ui_mode"]').forEach((r) => {
      r.checked = false;
    });
    if (store.confirmed.guide) {
      unconfirmStep("guide");
    }
    applyUiMode();
    const flow = getFlowSteps();
    const guideIdx = flow.findIndex((s) => s.id === "guide");
    showWizardStep(guideIdx >= 0 ? guideIdx : (store.confirmed.purpose ? 1 : 0));
    const status = document.getElementById("wizard-status");
    if (status) status.textContent = "作り方を選び直してください。";
    scheduleSave();
  }

  function placeWizardFootDock() {
    const dock = document.getElementById("wizard-foot-dock");
    const body = document.querySelector(".dash-body");
    if (!dock || !body) return;
    if (dock.parentElement !== body) {
      body.appendChild(dock);
    }
  }

  function updateWizardUi() {
    const step = getCurrentFlowStep();
    const progress = document.getElementById("wizard-progress");
    const coach = document.getElementById("wizard-coach");
    const backBtn = document.getElementById("wizard-back");
    const nextBtn = document.getElementById("wizard-next");
    const foot = document.getElementById("wizard-nav");
    const missingBar = countUnconfirmedBarSteps();
    const coachMsg = getCoachMessage();
    const statusEl = document.getElementById("wizard-status");
    const statusCard = document.getElementById("wizard-status-card");
    const statusText = statusEl ? statusEl.textContent.trim() : "";
    if (statusCard) {
      statusCard.classList.toggle("is-compact", !coachMsg && !statusText);
    }
    const isSelf = store.uiMode === "self";
    const selfList = isSelfListView();
    const selfGuide = isSelf && step && (step.id === "guide" || step.id === "purpose" || step.id === "layout");
    const selfEdit = isSelf && step && step.id !== "guide" && step.id !== "purpose" && step.id !== "layout";
    const onModePick = !!(step && step.id === "guide");
    const onPurpose = !!(step && step.id === "purpose");
    const onLayout = !!(step && step.id === "layout");
    const hideFootNav = selfList || isGuidedColorTrialFootHidden();

    if (progress) {
      setProgressLine(progress, step, missingBar.length);
      progress.style.textAlign = "center";
    }
    if (coach) {
      coach.textContent = coachMsg;
      coach.hidden = !coachMsg;
    }
    if (foot) {
      foot.hidden = hideFootNav;
      foot.classList.toggle("is-self-list", selfList);
      foot.classList.toggle("is-self-edit", !!(selfEdit && step && step.id !== "finish"));
      foot.classList.toggle("is-self-guide", !!selfGuide);
      foot.classList.toggle("is-guide-step", onModePick);
      foot.classList.toggle("is-purpose-step", onPurpose);
    }
    const footDock = document.getElementById("wizard-foot-dock");
    if (footDock) {
      const panel = document.getElementById("wizard-foot-panel");
      const guideEl = document.getElementById("wizard-foot-guide");
      const panelOpen = !!(panel && !panel.hidden);
      const guideOpen = !!(guideEl && !guideEl.hidden);
      footDock.classList.toggle("is-guide-pick", false);
      footDock.classList.toggle(
        "is-foot-hidden",
        hideFootNav && !panelOpen && !guideOpen && !footDock.classList.contains("is-chapter-boundary")
      );
    }
    if (backBtn) {
      backBtn.disabled = onPurpose || (store.wizardStepIndex <= 0 && !onModePick);
      backBtn.hidden = isSelf || onPurpose || isGuidedColorTrialFootHidden();
    }
    if (nextBtn) {
      nextBtn.hidden =
        selfList ||
        !!(step && step.id === "finish") ||
        onModePick ||
        isGuidedColorTrialFootHidden();
      if (selfGuide || onPurpose || onLayout || !isSelf) {
        nextBtn.textContent = "次へ";
      } else if (selfEdit) {
        nextBtn.textContent = wizardPrimaryLabel();
      }
    }
    if (foot && !selfList) {
      foot.classList.toggle("is-guide-step", onModePick);
    }
    placeWizardFootDock();
    updateProgressBar();
    updatePreviewGuideBtn();
    updateZoneBadgeDoneState();
    updateFinishFootUi();
  }

  function updateFinishFootUi() {
    const step = getCurrentFlowStep();
    const foot = document.getElementById("wizard-nav");
    const guide = document.getElementById("wizard-foot-guide");
    const zipBtn = document.getElementById("btn-zip");
    const isFinish = !!(step && step.id === "finish");
    if (foot) foot.classList.toggle("is-finish-step", isFinish);

    if (!isFinish) {
      if (guide) {
        guide.hidden = true;
        guide.textContent = "";
      }
      if (foot) foot.classList.remove("is-finish-ready");
      if (zipBtn) {
        zipBtn.hidden = true;
        zipBtn.disabled = true;
      }
      return;
    }

    const barReady = countUnconfirmedBarSteps().length === 0;
    const finishReady = !!store.confirmed.finish && validateFinish() && barReady;

    if (guide) {
      guide.hidden = true;
      guide.textContent = "";
    }

    if (zipBtn) {
      zipBtn.hidden = !finishReady;
      zipBtn.disabled = !finishReady;
    }
    if (foot) foot.classList.toggle("is-finish-ready", finishReady);
  }

  function updatePreviewGuideBtn() {
    const btn = document.getElementById("preview-guide-btn");
    if (!btn) return;
    const step = getCurrentFlowStep();
    const onIntro = !!(step && (step.id === "purpose" || step.id === "layout" || step.id === "guide"));
    btn.classList.toggle("is-step-current", onIntro);
    btn.classList.toggle(
      "is-step-done",
      !!(store.confirmed.purpose && store.confirmed.layout && store.confirmed.guide)
    );
    let openId = "purpose";
    if (store.confirmed.purpose && !store.confirmed.layout) openId = "layout";
    else if (store.confirmed.layout && !store.confirmed.guide) openId = "guide";
    else if (store.confirmed.guide) openId = "purpose";
    btn.setAttribute("data-open-step", openId);
  }

  function updateZoneBadgeDoneState() {
    const current = getCurrentFlowStep();
    root.querySelectorAll(".zone-badge[data-open-step]").forEach((btn) => {
      const stepId = btn.getAttribute("data-open-step");
      const locked = !canOpenStep(stepId);
      btn.classList.toggle("is-step-done", !!store.confirmed[stepId]);
      btn.classList.toggle("is-step-current", current && current.id === stepId);
      btn.classList.toggle("is-chapter-locked", locked);
    });
    syncBadgeLabels();
  }

  function closeDraftNotice() {}

  function openDraftNotice() {}

  function shouldShowEntryGate() {
    if (store.intakeDone) return false;
    if (store.confirmed.purpose || store.confirmed.layout || store.confirmed.guide) return false;
    if (store.sitePurpose) return false;
    if (store.layoutSelected) return false;
    if (store.presetChosen) return false;
    return true;
  }

  function hideEntryGate() {
    const gate = document.getElementById("entry-gate");
    if (gate) gate.hidden = true;
    document.body.classList.remove("entry-gate-open");
  }

  function setEntryGateStep(step) {
    const gate = document.getElementById("entry-gate");
    if (!gate) return;
    const n = Math.max(1, Math.min(3, Number(step) || 1));
    gate.dataset.entryStep = String(n);
    gate.querySelectorAll("[data-entry-step]").forEach((el) => {
      const on = Number(el.getAttribute("data-entry-step")) === n;
      el.hidden = !on;
    });
    const meta = document.getElementById("entry-step-meta");
    if (meta) meta.textContent = n + " / 3";
    const lead = document.getElementById("entry-gate-lead");
    if (lead) {
      lead.textContent =
        n === 1
          ? "まず用途を選びます。"
          : n === 2
            ? "次にレイアウトを選びます。"
            : "最後に雰囲気（色）を選ぶと始まります。";
    }
  }

  function showEntryGate() {
    const gate = document.getElementById("entry-gate");
    if (!gate) return;
    gate.hidden = false;
    document.body.classList.add("entry-gate-open");
    gate.querySelectorAll('input[name="entry_purpose"], input[name="entry_layout"], input[name="entry_mood"]').forEach((r) => {
      r.checked = false;
    });
    setEntryGateStep(1);
  }

  function syncSiteColorModeUi() {
    const mode = store.siteColorMode === "detail" ? "detail" : "easy";
    store.siteColorMode = mode;
    document.body.classList.toggle("color-mode-easy", mode === "easy");
    document.body.classList.toggle("color-mode-detail", mode === "detail");
    document.querySelectorAll('input[name="site_color_mode"]').forEach((r) => {
      r.checked = r.value === mode;
    });
    document.querySelectorAll("#preset-row [data-preset]").forEach((btn) => {
      const key = btn.getAttribute("data-preset");
      const labels = mode === "easy" ? EASY_PRESET_LABELS : DETAIL_PRESET_LABELS;
      if (labels[key] && key !== "vibe") btn.textContent = labels[key];
    });
    const easyNote = document.getElementById("easy-color-note");
    if (easyNote) easyNote.hidden = mode !== "easy";
    const detailNote = document.getElementById("detail-color-note");
    if (detailNote) detailNote.hidden = mode !== "detail";
    const randomBtn = document.getElementById("preset-random-btn");
    if (randomBtn) randomBtn.hidden = mode !== "detail";
    const bar = document.getElementById("wizard-progress-bar");
    if (bar) {
      delete bar.dataset.layout;
      buildProgressBar();
      updateWizardUi();
    }
  }

  function confirmAllColorStepsFromPreset() {
    COLOR_STEP_IDS_ORDERED.forEach((id) => {
      store.confirmed[id] = true;
      store.snapshots[id] = captureStepSnapshot(id);
    });
  }

  function applyBlankCanvasColors() {
    Object.assign(store.draftColors, BLANK_CANVAS_COLORS);
    store.draftColors.pageBgSoft = softFrom(store.draftColors.pageBg);
    store.draftColors.bodyMuted = softMuted(store.draftColors.bodyInk);
    store.slotGradients = {};
    store.slotGradientPartners = {};
    clearAllColorCodes();
    syncHueSelectFromDraft();
    markPresetChosen("blank");
    refreshColorUi();
    applyLiveColors(true);
  }

  function applyIntakeSelections(purposeKey, moodKey, layoutKey) {
    const purpose = PURPOSE_PACKS[purposeKey] ? purposeKey : "personal";
    const isCustom = moodKey === "custom";
    const moodRaw = String(moodKey || "undecided");
    const mood = !isCustom && moodRaw !== "undecided" && PRESETS[moodRaw] ? moodRaw : "clinic";
    const layoutRaw = String(layoutKey || "undecided");
    const layout = layoutRaw === "b" || layoutRaw === "c" ? layoutRaw : "a";
    const purposeRadio =
      form.querySelector('input[name="site_purpose"][value="' + purpose + '"]') ||
      document.querySelector('input[name="site_purpose"][value="' + purpose + '"]');
    if (purposeRadio) purposeRadio.checked = true;
    applySitePurpose(purpose);
    store.confirmed.purpose = true;
    store.snapshots.purpose = captureStepSnapshot("purpose");

    applyLayoutPattern(layout, { silent: true });
    store.confirmed.layout = true;
    store.snapshots.layout = captureStepSnapshot("layout");
    store.layoutSelected = true;

    store.uiMode = "guided";
    const guidedRadio = form.querySelector('input[name="ui_mode"][value="guided"]');
    if (guidedRadio) guidedRadio.checked = true;
    applyUiMode();
    store.confirmed.guide = true;
    store.snapshots.guide = captureStepSnapshot("guide");

    store.siteColorMode = isCustom ? "detail" : "easy";
    syncSiteColorModeUi();
    if (isCustom) {
      applyBlankCanvasColors();
      store.guidedColorPhase = "preset";
      store.guidedImageUnlocked = false;
      COLOR_STEP_IDS_ORDERED.forEach((id) => {
        store.confirmed[id] = false;
        delete store.snapshots[id];
      });
    } else {
      applyPresetByKey(mood);
      confirmAllColorStepsFromPreset();
      store.guidedImageUnlocked = true;
    }

    store.intakeDone = true;
    const reasons = [
      {
        label: "用途",
        detail: purposeKey === "undecided" || !PURPOSE_PACKS[purposeKey]
          ? "まだ決まっていないため、個人紹介にしました"
          : purposeLabel(purpose) + " にしました"
      },
      {
        label: "レイアウト",
        detail:
          layoutRaw === "undecided" || (layoutRaw !== "a" && layoutRaw !== "b" && layoutRaw !== "c")
            ? "まだ決まっていないため、A（横長）にしました"
            : layoutLabel(layout) + " にしました"
      },
      {
        label: "雰囲気",
        detail: isCustom
          ? "自分で色を決める（こだわり）で始めます"
          : moodRaw === "undecided"
            ? "まだ決まっていないため、紺・きれいめにしました"
            : "「" + (EASY_PRESET_LABELS[mood] || mood) + "」を選びました"
      },
      {
        label: "進め方",
        detail: isCustom
          ? "こだわりモードで色から始めます"
          : "簡単モードで画像から始めます。メニューから変えられます"
      }
    ];
    store.vibeReasons = reasons;
    fillVibeReasonLists(reasons);

    applyAllConfirmed();
    updateConfirmUi();
    updateZoneBadgeDoneState();
    updateFinishSummary();

    const flow = getFlowSteps();
    if (isCustom) {
      const presetIdx = flow.findIndex((x) => x.id === "global-preset");
      showWizardStep(presetIdx >= 0 ? presetIdx : 0);
      window.setTimeout(() => scrollPreviewTo("#preview-root"), 40);
    } else {
      if (typeof window.setPreviewWidthStepById === "function") {
        window.setPreviewWidthStepById("tablet");
      }
      const imageIdx = flow.findIndex((x) => x.id === "hero-image");
      showWizardStep(imageIdx >= 0 ? imageIdx : 0);
      window.setTimeout(() => scrollPreviewTo("#hero"), 40);
    }
    scheduleSave();
    return reasons;
  }

  function hideEntryRefModal() {
    const modal = document.getElementById("entry-ref-modal");
    if (modal) modal.hidden = true;
  }

  function fillVibeReasonLists(reasons) {
    const list = Array.isArray(reasons) ? reasons : [];
    const modalList = document.getElementById("entry-ref-reasons");
    const box = document.getElementById("vibe-reason-box");
    const boxList = document.getElementById("vibe-reason-list");
    if (modalList) {
      modalList.innerHTML = list
        .map((r) => "<li><strong>" + escapeHtml(r.label) + "</strong> … " + escapeHtml(r.detail) + "</li>")
        .join("");
    }
    if (box && boxList) {
      boxList.innerHTML = "";
      box.hidden = true;
    }
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function showEntryRefModal(reasons) {
    const modal = document.getElementById("entry-ref-modal");
    if (!modal) return;
    fillVibeReasonLists(reasons);
    modal.hidden = false;
    const ok = modal.querySelector(".entry-ref-modal-ok");
    if (ok) window.requestAnimationFrame(() => ok.focus());
  }

  function hueHex(hueId, tone) {
    const hue = COLOR_HUES.find((h) => h.id === hueId) || COLOR_HUES.find((h) => h.id === "blue");
    if (!hue) return DEFAULTS.pageBg;
    if (tone === "light") return hue.light;
    if (tone === "dark") return hue.dark;
    return hue.base;
  }

  function buildColorsFromHuePlan(plan) {
    const main = plan.mainHue || "blue";
    const colors = {
      pageBg: hueHex(plan.pageBg || main, plan.pageTone || "light"),
      heroInk: hueHex(plan.heroInk || main, plan.heroTone || "dark"),
      bodyInk: plan.bodyInk === "black" ? "#212121" : hueHex(plan.bodyInk || "black", "base"),
      chromeBg: hueHex(plan.chromeBg || main, plan.chromeTone || "dark"),
      chromeInk: "#ffffff",
      accent: hueHex(plan.accent || main, plan.accentTone || "base"),
      cardBg: "#ffffff",
      valuesBg: "#ffffff",
      contactBg: hueHex(plan.contactBg || plan.chromeBg || main, "dark"),
      contactInk: "#ffffff"
    };
    if (main === "cream" || main === "yellow" || main === "white") {
      colors.heroInk = hueHex(plan.heroInk || "brown", "dark");
      colors.bodyInk = "#3e2723";
      colors.chromeInk = hueHex("cream", "light");
      colors.contactInk = colors.chromeInk;
    }
    if (main === "black") {
      colors.pageBg = hueHex("black", "light");
      colors.cardBg = "#1f2424";
      colors.valuesBg = "#1f2424";
      colors.heroInk = "#ffffff";
      colors.bodyInk = "#f5f5f5";
      colors.chromeInk = "#f5f5f5";
      colors.contactInk = "#f5f5f5";
      colors.accent = hueHex(plan.accent || "yellow", "base");
    }
    colors.pageBgSoft = softFrom(colors.pageBg);
    colors.bodyMuted = softMuted(colors.bodyInk);
    return colors;
  }

  function buildPaletteFromHue(mainHue, placeSlot) {
    const plan = {
      mainHue: mainHue || "blue",
      pageBg: mainHue || "blue",
      pageTone: "light",
      chromeBg: mainHue || "blue",
      chromeTone: "dark",
      accent: mainHue || "blue",
      accentTone: "base",
      contactBg: mainHue || "blue",
      heroInk: mainHue || "blue",
      heroTone: "dark",
      bodyInk: "black"
    };
    // 近い系統の2色目（表紙として破綻しにくい）
    const pair = {
      pink: "cream",
      yellow: "orange",
      orange: "red",
      red: "orange",
      purple: "blue",
      sky: "blue",
      blue: "sky",
      green: "cream",
      brown: "cream",
      cream: "brown",
      white: "blue",
      black: "yellow"
    };
    const second = pair[mainHue] || "blue";
    if (placeSlot === "chromeBg") {
      plan.chromeBg = mainHue;
      plan.accent = second;
      plan.pageBg = mainHue === "black" ? "black" : second;
      plan.pageTone = "light";
    } else if (placeSlot === "pageBg") {
      plan.pageBg = mainHue;
      plan.chromeBg = second;
      plan.accent = mainHue;
    } else if (placeSlot === "accent") {
      plan.accent = mainHue;
      plan.chromeBg = second;
    } else if (placeSlot === "heroInk") {
      plan.heroInk = mainHue;
      plan.chromeBg = second;
    } else if (placeSlot === "bodyInk") {
      plan.bodyInk = mainHue;
    } else if (placeSlot === "contactBg") {
      plan.contactBg = mainHue;
      plan.chromeBg = second;
    } else {
      // 全体の雰囲気色：主色＋近い系統
      plan.pageBg = mainHue;
      plan.pageTone = "light";
      plan.chromeBg = mainHue;
      plan.chromeTone = "dark";
      plan.accent = second;
      plan.contactBg = mainHue;
    }
    const colors = buildColorsFromHuePlan(plan);
    colors.pageBgSoft = softFrom(colors.pageBg);
    colors.bodyMuted = softMuted(colors.bodyInk);
    return colors;
  }

  function collectHits(text, wordList) {
    const hits = [];
    (wordList || []).forEach((w) => {
      if (w && text.indexOf(String(w).toLowerCase()) >= 0) hits.push(w);
    });
    // 「ヘッダー」と「ヘッダ」など、短い方が長い語に含まれる場合は短い方を捨てる
    return hits.filter((w) => !hits.some((o) => o !== w && String(o).indexOf(String(w)) >= 0));
  }

  function isNegatedHit(text, word) {
    const i = text.indexOf(String(word).toLowerCase());
    if (i < 0) return false;
    const after = text.slice(i, i + String(word).length + 10);
    return (
      after.indexOf("使わない") >= 0 ||
      after.indexOf("しない") >= 0 ||
      after.indexOf("ではなく") >= 0 ||
      after.indexOf("じゃなく") >= 0
    );
  }

  function bestOf(map, fallback) {
    let id = fallback;
    let top = -1;
    Object.keys(map || {}).forEach((k) => {
      if (map[k] > top) {
        top = map[k];
        id = k;
      }
    });
    return { id, score: top };
  }

  function presetLabel(key) {
    return (
      {
        clinic: "見本デフォルト",
        green: "落ち着き緑",
        cafe: "暖色カフェ",
        ink: "墨モダン",
        ocean: "海青",
        plum: "紫・上品",
        brick: "赤・元気",
        vibe: "自分で全部選ぶ（イメージ）"
      }[key] || key
    );
  }

  /** 3軸仮当て：用途・レイアウト・色。明示の場所色だけ細かく */
  function matchVibe(raw) {
    const dict = window.Sample1manVibeDict || {};
    const t = String(raw || "")
      .normalize("NFKC")
      .toLowerCase();
    const reasons = [];

    const purposeScores = {};
    const purposeHits = {};
    Object.keys(dict.purpose || {}).forEach((id) => {
      const hits = collectHits(t, dict.purpose[id]);
      if (hits.length) {
        purposeScores[id] = hits.length;
        purposeHits[id] = hits;
      }
    });

    const layoutScores = {};
    const layoutHits = {};
    Object.keys(dict.layout || {}).forEach((id) => {
      const hits = collectHits(t, dict.layout[id]);
      if (hits.length) {
        layoutScores[id] = hits.length;
        layoutHits[id] = hits;
      }
    });

    const presetScores = {};
    const presetHits = {};
    Object.keys(dict.preset || {}).forEach((id) => {
      const hits = collectHits(t, dict.preset[id]).filter((w) => !isNegatedHit(t, w));
      if (hits.length) {
        presetScores[id] = hits.length;
        presetHits[id] = hits;
      }
    });

    // 明示色
    const explicitHits = [];
    Object.keys(dict.explicitColor || {}).forEach((word) => {
      if (t.indexOf(String(word).toLowerCase()) < 0) return;
      if (isNegatedHit(t, word)) return;
      explicitHits.push({ word, meta: dict.explicitColor[word] });
    });

    // 置き場
    let placeSlot = null;
    let placeHitWords = [];
    Object.keys(dict.placeWords || {}).forEach((slot) => {
      const hits = collectHits(t, dict.placeWords[slot]);
      if (hits.length && hits.length >= placeHitWords.length) {
        placeSlot = slot;
        placeHitWords = hits;
      }
    });

    let purpose = "personal";
    let purposeDefault = true;
    const purposeBest = bestOf(purposeScores, "personal");
    if (purposeBest.score > 0) {
      purpose = purposeBest.id;
      purposeDefault = false;
    }

    let layout = "a";
    let layoutDefault = true;
    const layoutBest = bestOf(layoutScores, "a");
    if (layoutBest.score > 0) {
      layout = layoutBest.id;
      layoutDefault = false;
    }

    let preset = "clinic";
    let colorDefault = true;
    let colorHitWords = [];
    let mainHue = "blue";
    let useCustomPalette = false;

    const presetBest = bestOf(presetScores, "clinic");
    const hueGuess = {
      clinic: "blue",
      green: "green",
      cafe: "brown",
      ink: "black",
      ocean: "sky",
      plum: "purple",
      brick: "red"
    };

    // 場所指定があるときだけ、明示色でカスタムパレット
    if (placeSlot && explicitHits.length) {
      const last = explicitHits[explicitHits.length - 1];
      preset = "vibe";
      mainHue = last.meta.hue || "blue";
      colorDefault = false;
      colorHitWords = explicitHits.map((e) => e.word);
      useCustomPalette = true;
    } else if (presetBest.score > 0 && (!explicitHits.length || presetBest.score >= explicitHits.length)) {
      // 色・印象語のプリセットを優先（「清潔＋青」→見本デフォルト など）
      preset = presetBest.id;
      colorDefault = false;
      colorHitWords = presetHits[preset] || [];
      mainHue = hueGuess[preset] || "blue";
      if (placeSlot) useCustomPalette = true;
    } else if (explicitHits.length) {
      const last = explicitHits[explicitHits.length - 1];
      preset = last.meta.preset || "vibe";
      mainHue = last.meta.hue || "blue";
      colorDefault = false;
      colorHitWords = explicitHits.map((e) => e.word);
      useCustomPalette = preset === "vibe";
    }

    // 理由は最大4行・ざっくり
    if (purposeDefault) {
      reasons.push({
        label: "用途",
        detail: "例文に用途の言葉がなかったので、個人紹介で仮設定しました"
      });
    } else {
      reasons.push({
        label: "用途",
        detail:
          "「" +
          (purposeHits[purpose] || []).slice(0, 3).join("・") +
          "」などの言葉から、" +
          purposeLabel(purpose) +
          " にしました"
      });
    }

    if (layoutDefault) {
      reasons.push({
        label: "レイアウト",
        detail: "該当がなかったので、A（横長）を仮設定しました"
      });
    } else {
      reasons.push({
        label: "レイアウト",
        detail:
          "「" +
          (layoutHits[layout] || []).slice(0, 3).join("・") +
          "」から " +
          layoutLabel(layout) +
          " にしました"
      });
    }

    if (colorDefault) {
      reasons.push({
        label: "色プリセット",
        detail: "色の言葉がなかったので、見本デフォルトを選びました"
      });
    } else if (placeSlot && placeHitWords.length) {
      const SLOT_LABEL = {
        pageBg: "背景",
        chromeBg: "ヘッダー",
        accent: "アクセント",
        heroInk: "キャッチ",
        bodyInk: "本文",
        contactBg: "ご連絡帯"
      };
      reasons.push({
        label: "色",
        detail:
          "「" +
          colorHitWords.slice(0, 3).join("・") +
          "」と「" +
          placeHitWords.slice(0, 2).join("・") +
          "」から、" +
          (SLOT_LABEL[placeSlot] || placeSlot) +
          "付近を中心に色を組みました"
      });
      useCustomPalette = true;
    } else {
      reasons.push({
        label: "色プリセット",
        detail:
          "「" +
          colorHitWords.slice(0, 3).join("・") +
          "」から「" +
          presetLabel(preset) +
          "」を選びました"
      });
    }

    let colors = null;
    if (useCustomPalette || preset === "vibe") {
      colors = buildPaletteFromHue(mainHue, placeSlot);
      preset = "vibe";
    } else if (!colorDefault && PRESETS[preset]) {
      colors = { ...PRESETS[preset] };
      colors.pageBgSoft = softFrom(colors.pageBg);
      colors.bodyMuted = softMuted(colors.bodyInk);
    } else {
      colors = { ...PRESETS.clinic };
      colors.pageBgSoft = softFrom(colors.pageBg);
      colors.bodyMuted = softMuted(colors.bodyInk);
      preset = "clinic";
    }

    return {
      purpose,
      layout,
      preset,
      colors,
      reasons: reasons.slice(0, 4),
      purposeDefault,
      layoutDefault,
      colorDefault,
      vibeText: String(raw || "").trim()
    };
  }

  function syncVibePresetButton() {
    const btn = document.getElementById("preset-vibe-btn");
    if (!btn) return;
    const has = !!(store.vibeColors && Object.keys(store.vibeColors).length);
    btn.hidden = !has;
    if (has) btn.textContent = "自分で全部選ぶ（イメージ）";
  }

  function applyVibeColorsToDraft(colors) {
    if (!colors) return;
    store.vibeColors = { ...colors };
    Object.assign(store.draftColors, colors);
    store.draftColors.pageBgSoft = softFrom(store.draftColors.pageBg);
    store.draftColors.bodyMuted = softMuted(store.draftColors.bodyInk);
    clearAllColorCodes();
    syncHueSelectFromDraft();
    markPresetChosen("vibe");
    syncVibePresetButton();
    store.snapshots["global-preset"] = {
      colors: { ...store.draftColors },
      chosenPresetKey: "vibe"
    };
    store.confirmed["global-preset"] = true;
    refreshColorUi();
    applyLiveColors(true);
  }

  function applyVibeMatch(match) {
    if (!match) return;
    const purposeRadio = form.querySelector('input[name="site_purpose"][value="' + match.purpose + '"]');
    if (purposeRadio) purposeRadio.checked = true;
    applySitePurpose(match.purpose);
    store.confirmed.purpose = true;
    store.snapshots.purpose = captureStepSnapshot("purpose");

    applyLayoutPattern(match.layout, { silent: true });
    store.confirmed.layout = true;
    store.snapshots.layout = captureStepSnapshot("layout");

    store.vibeText = match.vibeText || "";
    store.vibeReasons = match.reasons || [];
    if (match.preset === "vibe" && match.colors) {
      applyVibeColorsToDraft(match.colors);
    } else {
      applyPresetByKey(match.preset || "clinic");
      syncVibePresetButton();
    }
    fillVibeReasonLists(store.vibeReasons);

    applyAllConfirmed();
    updateConfirmUi();
    updateZoneBadgeDoneState();
    updateFinishSummary();

    const flow = getFlowSteps();
    const guideIdx = flow.findIndex((s) => s.id === "guide");
    if (guideIdx >= 0) showWizardStep(guideIdx);
    else showWizardStep(0);

    window.setTimeout(() => scrollPreviewTo("#preview-root"), 40);
    scheduleSave();
  }

  // 検証用（本番UIからは使わない）
  window.__sample1manMatchVibe = matchVibe;

  function finishEntryIntakeFromGate() {
    const gate = document.getElementById("entry-gate");
    if (!gate) return;
    const purposeEl = gate.querySelector('input[name="entry_purpose"]:checked');
    const moodEl = gate.querySelector('input[name="entry_mood"]:checked');
    const layoutEl = gate.querySelector('input[name="entry_layout"]:checked');
    const purposeRaw = purposeEl ? purposeEl.value : "undecided";
    const moodRaw = moodEl ? moodEl.value : "undecided";
    const layoutRaw = layoutEl ? layoutEl.value : "undecided";
    const purpose = purposeRaw === "undecided" ? "personal" : purposeRaw;
    hideEntryGate();
    const reasons = applyIntakeSelections(
      purposeRaw === "undecided" ? "undecided" : purpose,
      moodRaw,
      layoutRaw
    );
    showEntryRefModal(reasons);
  }

  function setupEntryGate() {
    const gate = document.getElementById("entry-gate");
    if (!gate) return;
    gate.querySelectorAll('input[name="entry_purpose"]').forEach((input) => {
      input.addEventListener("change", () => {
        if (input.checked) setEntryGateStep(2);
      });
    });
    gate.querySelectorAll('input[name="entry_layout"]').forEach((input) => {
      input.addEventListener("change", () => {
        if (input.checked) setEntryGateStep(3);
      });
    });
    gate.querySelectorAll('input[name="entry_mood"]').forEach((input) => {
      input.addEventListener("change", () => {
        if (input.checked) finishEntryIntakeFromGate();
      });
    });
    gate.querySelectorAll("[data-entry-step-back]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const cur = Number(gate.dataset.entryStep || "1");
        setEntryGateStep(Math.max(1, cur - 1));
      });
    });
    document.querySelectorAll("[data-entry-ref-ok]").forEach((btn) => {
      btn.addEventListener("click", hideEntryRefModal);
    });
    if (shouldShowEntryGate()) showEntryGate();
    else {
      hideEntryGate();
      syncSiteColorModeUi();
    }
  }

  function openColorModeMenu() {
    if (typeof window.openAtelierMenu === "function") {
      window.openAtelierMenu("color-mode");
      return;
    }
    const menu = document.getElementById("atelier-menu");
    const openBtn = document.getElementById("atelier-menu-btn");
    if (!menu || !openBtn) return;
    menu.hidden = false;
    window.requestAnimationFrame(() => menu.classList.add("is-open"));
    menu.querySelectorAll("[data-menu-stage]").forEach((stage) => {
      const on = stage.getAttribute("data-menu-stage") === "color-mode";
      stage.hidden = !on;
      stage.classList.toggle("is-active", on);
    });
    openBtn.setAttribute("aria-expanded", "true");
  }

  function resetColorsForEasyMode() {
    clearAllColorCodes();
    const key = EASY_PRESET_KEYS.indexOf(store.chosenPresetKey) >= 0 ? store.chosenPresetKey : "clinic";
    applyPresetByKey(key);
    confirmAllColorStepsFromPreset();
    store.guidedColorPhase = "preset";
    store.guidedColorEditStepId = null;
    applyAllConfirmed();
    updateConfirmUi();
    updateZoneBadgeDoneState();
    const flow = getFlowSteps();
    const idx = flow.findIndex((x) => x.id === "global-preset");
    if (idx >= 0) showWizardStep(idx);
    scheduleSave();
  }

  function setSiteColorMode(nextMode, { force } = {}) {
    const mode = nextMode === "detail" ? "detail" : "easy";
    if (mode === store.siteColorMode && !force) return;
    if (mode === "easy" && store.siteColorMode === "detail" && !force) {
      const modal = document.getElementById("color-mode-reset-modal");
      if (modal) modal.hidden = false;
      if (typeof window.closeAtelierMenu === "function") window.closeAtelierMenu();
      return;
    }
    store.siteColorMode = mode;
    syncSiteColorModeUi();
    if (mode === "easy") resetColorsForEasyMode();
    if (typeof window.closeAtelierMenu === "function") window.closeAtelierMenu();
    scheduleSave();
  }

  function setupColorModeControls() {
    document.querySelectorAll('input[name="site_color_mode"]').forEach((input) => {
      input.addEventListener("change", () => {
        if (!input.checked) return;
        setSiteColorMode(input.value);
      });
    });
    document.querySelectorAll("[data-open-color-mode]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        openColorModeMenu();
      });
    });
    const modal = document.getElementById("color-mode-reset-modal");
    if (modal) {
      modal.querySelectorAll("[data-color-mode-reset-cancel]").forEach((btn) => {
        btn.addEventListener("click", () => {
          modal.hidden = true;
          syncSiteColorModeUi();
        });
      });
      modal.querySelectorAll("[data-color-mode-reset-ok]").forEach((btn) => {
        btn.addEventListener("click", () => {
          modal.hidden = true;
          store.siteColorMode = "detail";
          setSiteColorMode("easy", { force: true });
        });
      });
    }
    syncSiteColorModeUi();
  }

  function wizardConfirmCurrentStep() {
    const step = getCurrentFlowStep();
    if (!step) return false;
    if (!validateWizardStep(step.id)) return false;

    if (step.id === "purpose") {
      const purpose = readSitePurposeFromForm();
      if (!purpose) return false;
      applySitePurpose(purpose);
    }

    if (step.id === "guide") {
      const mode = readUiModeFromForm();
      if (!mode) return false;
      store.uiMode = mode;
      applyUiMode();
    }

    if (step.id === "global-preset" && store.siteColorMode === "easy") {
      confirmAllColorStepsFromPreset();
    }

    if (step.id === "finish" && !validateFinish()) return false;

    store.snapshots[step.id] = captureStepSnapshot(step.id);
    store.confirmed[step.id] = true;
    applyAllConfirmed();
    updateConfirmUi();
    updateZoneBadgeDoneState();
    hideWizardFootPanel();
    return true;
  }

  function wizardNext() {
    const flow = getFlowSteps();
    const step = getCurrentFlowStep();
    if (!step) return;
    const err = getStepValidationError(step.id);
    if (err) {
      showValidationNotice(err);
      return;
    }
    const revisingAfterLock =
      store.uiMode === "self" &&
      store.finishLockedOnce &&
      step.id !== "guide" &&
      step.id !== "purpose" &&
      step.id !== "layout" &&
      step.id !== "finish";

    if (!wizardConfirmCurrentStep()) return;
    closeDraftNotice();
    if (store.uiMode === "self") {
      if (step.id === "guide") {
        showSelfList();
        return;
      }
      if (revisingAfterLock) {
        const barReady = countUnconfirmedBarSteps().length === 0;
        if (barReady) {
          if (!validateFinish()) {
            openStep("finish");
            const status = document.getElementById("wizard-status");
            if (status) {
              status.textContent =
                "チェックを入れてから「この修正でOK・ZIPを保存する」を押してください。";
            }
            return;
          }
          showContentConfirmPanel({
            title: "この修正でよろしいですか？",
            lead:
              "確定を押すと、依頼ファイル（ZIP）がパソコンに保存されます。保存＝送信ではありません。案内された連絡先に自分で添付して送ってください。",
            okLabel: "この修正でOK・ZIPを保存する"
          }).then((ok) => {
            if (!ok) {
              showSelfList(step.id);
              return;
            }
            confirmStep("finish");
            store.finishLockedOnce = true;
            updateWizardUi();
            openStep("finish");
            runZipDownload();
          });
          return;
        }
      }
      showSelfList(step.id);
      return;
    }
    if (store.wizardStepIndex >= flow.length - 1) {
      updateWizardUi();
      return;
    }
    const nextIndex = store.wizardStepIndex + 1;
    if (store.uiMode === "guided") {
      if (step.id === LAST_COLOR_STEP_ID && !store.guidedImageUnlocked) {
        store.guidedImageUnlocked = true;
        store.chapterCoachMsg = "色の選択が完了しました。画像の選択ができます。";
        scheduleSave();
        window.setTimeout(() => {
          store.chapterCoachMsg = "";
          updateWizardUi();
        }, 6000);
      } else if (step.id === LAST_IMAGE_STEP_ID && !store.guidedTextUnlocked) {
        store.guidedTextUnlocked = true;
        store.chapterCoachMsg = "画像の選択が完了しました。文字の入力ができます。";
        scheduleSave();
        window.setTimeout(() => {
          store.chapterCoachMsg = "";
          updateWizardUi();
        }, 6000);
      }
    }
    showWizardStep(nextIndex);
  }

  function wizardBack() {
    const step = getCurrentFlowStep();
    if (!step || store.wizardStepIndex <= 0) return;
    if (store.confirmed[step.id]) {
      unconfirmStep(step.id);
    }
    showWizardStep(store.wizardStepIndex - 1);
    const status = document.getElementById("wizard-status");
    if (status) status.textContent = "";
  }

  function hideWizardFootPanel() {
    const dock = document.getElementById("wizard-foot-dock");
    if (dock) dock.classList.remove("is-chapter-boundary");
    const panel = document.getElementById("wizard-foot-panel");
    if (panel) {
      panel.hidden = true;
      panel.innerHTML = "";
    }
    placeWizardFootDock();
  }

  function showWizardFootPanel(html) {
    const panel = document.getElementById("wizard-foot-panel");
    if (!panel) return;
    panel.innerHTML = html;
    panel.hidden = false;
    const dock = document.getElementById("wizard-foot-dock");
    if (dock) dock.classList.remove("is-foot-hidden", "is-guide-pick");
    placeWizardFootDock();
  }

  function clearAllDraftStorage() {
    try {
      Object.keys(localStorage).forEach((key) => {
        if (key === STORAGE_KEY || /^sample-1man-order-v\d+$/.test(key)) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {
      /* ignore */
    }
  }

  function hideResetDraftModal() {
    const modal = document.getElementById("reset-draft-modal");
    if (modal) {
      modal.hidden = true;
      modal.innerHTML = "";
    }
    document.body.classList.remove("reset-draft-open");
  }

  function resetAllDraft() {
    hideWizardFootPanel();
    if (typeof window.closeAtelierMenu === "function") {
      window.closeAtelierMenu();
    }
    let modal = document.getElementById("reset-draft-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "reset-draft-modal";
      document.body.appendChild(modal);
    }
    modal.className = "reset-draft-modal";
    modal.hidden = false;
    modal.setAttribute("role", "presentation");
    modal.innerHTML =
      '<div class="reset-draft-modal-backdrop" data-reset-cancel tabindex="-1"></div>' +
      '<div class="reset-draft-modal-card" role="alertdialog" aria-modal="true" aria-labelledby="reset-draft-title">' +
      '<p class="reset-draft-modal-title" id="reset-draft-title">最初に戻しますか？</p>' +
      '<p class="reset-draft-modal-text">入力した内容はすべて消え、元に戻せません。</p>' +
      '<div class="reset-draft-modal-actions">' +
      '<button type="button" class="wizard-btn" data-reset-cancel>キャンセル</button>' +
      '<button type="button" class="wizard-btn" data-reset-ok>最初に戻す</button>' +
      "</div>" +
      "</div>";
    document.body.classList.add("reset-draft-open");
    const cancelBtns = modal.querySelectorAll("[data-reset-cancel]");
    const ok = modal.querySelector("[data-reset-ok]");
    cancelBtns.forEach((btn) => {
      btn.addEventListener("click", hideResetDraftModal, { once: true });
    });
    if (ok) {
      ok.addEventListener(
        "click",
        () => {
          clearAllDraftStorage();
          location.reload();
        },
        { once: true }
      );
      ok.focus();
    }
  }

  function setupWizard() {
    const backBtn = document.getElementById("wizard-back");
    const nextBtn = document.getElementById("wizard-next");
    if (backBtn) backBtn.addEventListener("click", wizardBack);
    if (nextBtn) nextBtn.addEventListener("click", wizardNext);
    document.querySelectorAll("[data-reset-draft]").forEach((btn) => {
      btn.addEventListener("click", resetAllDraft);
    });
    const finishConfirmBtn = document.getElementById("btn-finish-confirm");
    if (finishConfirmBtn) {
      finishConfirmBtn.addEventListener("click", () => {
        if (!validateFinish()) {
          updateFinishSubmitUi();
          return;
        }
        requestFinishConfirmThenZip().catch(() => {
          const status = document.getElementById("zip-status");
          if (status) status.textContent = "確定またはZIPの作成に失敗しました。";
        });
      });
    }
    const finishChangeBtn = document.getElementById("btn-finish-change");
    if (finishChangeBtn) {
      finishChangeBtn.addEventListener("click", () => {
        unconfirmFinishSoft();
        store.finishLockedOnce = true;
        updateFinishSubmitUi();
        updateWizardUi();
        const status = document.getElementById("wizard-status");
        if (status) {
          status.textContent =
            "変更モードです。直したい項目を開き、直したら「" +
            (store.uiMode === "self" ? "修正" : "次へ") +
            "」→確認→ZIPへ進めます。";
        }
        if (store.uiMode === "self") showSelfList("finish");
      });
    }
    form.querySelectorAll('input[name="ui_mode"]').forEach((radio) => {
      radio.addEventListener("change", () => {
        const mode = readUiModeFromForm();
        if (!mode) return;
        const needsGuideAdvance = !store.confirmed.guide;
        store.uiMode = mode;
        applyUiMode();
        if (needsGuideAdvance) {
          if (mode === "self") {
            store.selfEditingStepId = "guide";
          }
          wizardNext();
          return;
        }
        restoreViewAfterMode();
        updateProgressBar();
        updateZoneBadgeDoneState();
        scheduleSave();
      });
    });
    form.querySelectorAll('input[name="site_purpose"]').forEach((radio) => {
      radio.addEventListener("change", () => {
        const purpose = readSitePurposeFromForm();
        if (!purpose) return;
        applySitePurpose(purpose);
      });
    });
    updateRandomUndoUi();
  }

  function resolveWizardStepIndex() {
    const flow = getFlowSteps();
    if (Number.isInteger(store.wizardStepIndex) && store.wizardStepIndex >= 0) {
      return Math.min(store.wizardStepIndex, flow.length - 1);
    }
    const firstOpen = flow.findIndex((s) => !store.confirmed[s.id]);
    return firstOpen >= 0 ? firstOpen : flow.length - 1;
  }

  function setDraftColor(key, value) {
    store.draftColors[key] = value;
    if (key === "pageBg") store.draftColors.pageBgSoft = softFrom(value);
    if (key === "bodyInk") store.draftColors.bodyMuted = softMuted(value);
    if (Object.prototype.hasOwnProperty.call(store.colorCodes, key)) {
      store.colorCodes[key] = "";
      store.colorModes[key] = "pick";
    }
    refreshColorUi();
    applyLiveColors(true);
    scheduleSave();
  }

  function applySlotGradientsToPreview(colors) {
    const imageVars = {
      chromeBg: "--chrome-bg-image",
      pageBg: "--page-bg-image",
      accent: "--accent-image",
      cardBg: "--card-bg-image",
      valuesBg: "--values-bg-image",
      contactBg: "--contact-bg-image"
    };
    Object.keys(imageVars).forEach((key) => {
      root.style.setProperty(imageVars[key], "none");
    });
    GUIDED_COLOR_TUNE_IDS.forEach((stepId) => {
      const key = primaryColorKeyForStep(stepId);
      if (!GRADIENT_BG_KEYS.has(key)) return;
      const dir = store.slotGradients && store.slotGradients[stepId];
      const varName = imageVars[key];
      if (!dir || !varName) return;
      const partner = partnerHexForSlot(stepId);
      root.style.setProperty(
        varName,
        "linear-gradient(" + dir + ", " + colors[key] + ", " + partner + ")"
      );
    });
  }

  function applyLiveColors(flash) {
    const colors = getEffectiveColors();
    colors.radius = fieldValue("radius") || colors.radius || DEFAULTS.radius;
    applyColorsToRoot(colors);
    applySlotGradientsToPreview(colors);
    let headingScale = DEFAULTS.headingScale;
    if (store.confirmed["hero-color"] && store.snapshots["hero-color"] && store.snapshots["hero-color"].headingScale) {
      headingScale = store.snapshots["hero-color"].headingScale;
    }
    const current = getCurrentFlowStep();
    if (current && current.id === "hero-color") {
      headingScale = fieldValue("headingScale") || headingScale;
    }
    root.style.setProperty("--heading-scale", headingScale);
    root.style.setProperty("--radius", colors.radius);
    if (flash) {
      root.classList.remove("is-color-flash");
      void root.offsetWidth;
      root.classList.add("is-color-flash");
      window.setTimeout(() => root.classList.remove("is-color-flash"), 350);
    }
  }

  function refreshColorUi() {
    document.querySelectorAll(".color-field[data-color-key]").forEach((field) => {
      const key = field.getAttribute("data-color-key");
      if (!key) return;
      if (!hueSelectByKey[key]) {
        hueSelectByKey[key] = findNearestHueState(store.draftColors[key]);
      }
      const state = hueSelectByKey[key];
      const mode = store.colorModes[key] === "code" ? "code" : "pick";
      const code = store.colorCodes[key] || "";
      field.classList.toggle("has-color-code", mode === "code");
      field.setAttribute("data-color-mode", mode);

      field.querySelectorAll("[data-color-mode-tab]").forEach((btn) => {
        btn.classList.toggle("is-active", btn.getAttribute("data-color-mode-tab") === mode);
        btn.setAttribute("aria-selected", btn.getAttribute("data-color-mode-tab") === mode ? "true" : "false");
      });

      field.querySelectorAll("[data-color-panel]").forEach((panel) => {
        const show = panel.getAttribute("data-color-panel") === mode;
        panel.hidden = !show;
      });

      field.querySelectorAll("[data-hue-id]").forEach((btn) => {
        btn.classList.toggle("is-active", btn.getAttribute("data-hue-id") === state.hueId);
      });

      const range = field.querySelector("[data-shade-range]");
      if (range && document.activeElement !== range) {
        range.value = String(Math.round((state.t == null ? 0.5 : state.t) * 100));
      }

      const codeInput = field.querySelector("[data-color-code]");
      if (codeInput && document.activeElement !== codeInput) {
        codeInput.value = code;
      }
    });
  }

  function buildSwatches() {
    const fields = Array.from(document.querySelectorAll(".color-field[data-color-key]"));
    const list = fields.length
      ? fields
      : Array.from(document.querySelectorAll("[data-swatches]")).map((row) => {
          let field = row.closest(".color-field");
          if (!field) {
            field = document.createElement("div");
            field.className = "color-field";
            field.setAttribute("data-color-key", row.getAttribute("data-swatches"));
            row.parentNode.insertBefore(field, row);
            field.appendChild(row);
          } else if (!field.getAttribute("data-color-key")) {
            field.setAttribute("data-color-key", row.getAttribute("data-swatches"));
          }
          return field;
        });

    list.forEach((field) => {
      const key = field.getAttribute("data-color-key");
      if (!key) return;

      field.querySelectorAll(".swatch-shades").forEach((el) => el.remove());
      field.querySelectorAll(".color-mode-tabs, .color-mode-panel, .color-shade, details.color-advanced").forEach((el) => el.remove());

      let row = field.querySelector('.swatch-row[data-swatches="' + key + '"]') || field.querySelector("[data-swatches]");
      if (!row) {
        row = document.createElement("div");
        row.className = "swatch-row";
        field.appendChild(row);
      }
      row.setAttribute("data-swatches", key);
      row.className = "swatch-row swatch-picker";
      row.innerHTML = "";

      const nearest = findNearestHueState(store.draftColors[key]);
      hueSelectByKey[key] = { hueId: nearest.hueId, t: nearest.t };

      const tabs = document.createElement("div");
      tabs.className = "color-mode-tabs";
      tabs.setAttribute("role", "tablist");
      tabs.setAttribute("aria-label", "色の指定方法");
      tabs.innerHTML =
        '<button type="button" class="color-mode-tab" role="tab" data-color-mode-tab="pick" aria-selected="true">色を選ぶ</button>' +
        '<button type="button" class="color-mode-tab" role="tab" data-color-mode-tab="code" aria-selected="false">カラーコードで指定</button>';
      field.insertBefore(tabs, row);

      tabs.querySelectorAll("[data-color-mode-tab]").forEach((btn) => {
        btn.addEventListener("click", () => {
          setColorMode(key, btn.getAttribute("data-color-mode-tab"));
        });
      });

      const pickPanel = document.createElement("div");
      pickPanel.className = "color-mode-panel";
      pickPanel.setAttribute("data-color-panel", "pick");
      pickPanel.setAttribute("role", "tabpanel");

      appendHuePalette(pickPanel, key, (hueId, t) => {
        setDraftColor(key, hexAtLightness(hueId, t));
      });

      appendShadeSlider(pickPanel, key, "data-shade-range", () => {
        const range = pickPanel.querySelector("[data-shade-range]");
        const t = range ? Number(range.value) / 100 : 0.5;
        const hueId = (hueSelectByKey[key] && hueSelectByKey[key].hueId) || "green";
        hueSelectByKey[key] = { hueId, t };
        setDraftColor(key, hexAtLightness(hueId, t));
      });

      const nativeRow = document.createElement("div");
      nativeRow.className = "color-native-row";
      nativeRow.innerHTML =
        '<label>カラーピッカー <input type="color" data-native-color></label>' +
        '<span class="dash-note dash-note-sm">好きな色をそのまま指定できます</span>';
      const nativeInput = nativeRow.querySelector("[data-native-color]");
      if (nativeInput) {
        try {
          nativeInput.value = store.draftColors[key] || "#ffffff";
        } catch (e) {
          nativeInput.value = "#ffffff";
        }
        nativeInput.addEventListener("input", () => {
          setDraftColor(key, nativeInput.value);
        });
      }
      pickPanel.appendChild(nativeRow);

      const codePanel = document.createElement("div");
      codePanel.className = "color-mode-panel";
      codePanel.setAttribute("data-color-panel", "code");
      codePanel.setAttribute("role", "tabpanel");
      codePanel.hidden = true;
      codePanel.innerHTML =
        '<label class="color-code-label">カラーコード（そのまま貼り付け）' +
        '<input type="text" data-color-code placeholder="例: #bada55 / #bada5572 / rgb(…) など" inputmode="text" autocomplete="off">' +
        "</label>" +
        '<div class="dash-note-block">' +
        "<p>このタブでは、見本サイトの色は白になります。</p>" +
        "<p>形式は問いません。納品のときに、入力どおりの色へ反映します。</p>" +
        '<p><a href="https://developer.mozilla.org/ja/docs/Web/CSS/CSS_colors/Color_picker_tool" target="_blank" rel="noopener noreferrer">カラーコードを調べる（MDN）</a></p>' +
        "</div>";

      const codeInput = codePanel.querySelector("[data-color-code]");
      if (codeInput) {
        codeInput.setAttribute("maxlength", "120");
        const onCode = () => {
          store.colorModes[key] = "code";
          store.colorCodes[key] = String(codeInput.value || "").trim();
          applyLiveColors(true);
          refreshColorUi();
          scheduleSave();
        };
        codeInput.addEventListener("input", onCode);
        codeInput.addEventListener("change", onCode);
      }

      // Keep data-swatches row as empty host for legacy selectors; panels hold UI
      row.appendChild(pickPanel);
      row.appendChild(codePanel);
    });
    refreshColorUi();
  }

  function syncPanelFieldLock(panel, locked) {
    if (!panel) return;
    panel.querySelectorAll("input, textarea, select, button").forEach((field) => {
      if (field.type === "hidden") return;
      field.disabled = locked;
    });
  }

  function syncFillFields() {
    document.querySelectorAll("[data-fill-for]").forEach((el) => {
      const id = el.getAttribute("data-fill-for");
      const at = Number(el.getAttribute("data-fill-at") || "1");
      const count = Number(store.draftCounts[id] || 0);
      const show = count >= at;
      el.hidden = !show;
      syncPanelFieldLock(el, !show);
    });
  }

  function syncCountLabels() {
    COUNT_IDS.forEach((id) => {
      const meta = COUNT_META[id];
      if (!meta) return;
      const count = Number(store.draftCounts[id]);
      const panel = document.querySelector('[data-count-for="' + id + '"]');
      if (!panel) return;
      const label = panel.querySelector("[data-count-label]");
      const minus = panel.querySelector('[data-step="-1"]');
      const plus = panel.querySelector('[data-step="1"]');
      if (label) label.textContent = count + " / " + meta.max;
      if (minus) minus.disabled = count <= meta.min;
      if (plus) plus.disabled = count >= meta.max;
    });
    syncFillFields();
    COUNT_IDS.forEach((id) => {
      applyCountToPreview(id, store.draftCounts[id]);
    });
    applyAllConfirmed();
    updateZipGate();
  }

  function setupCounts() {
    COUNT_IDS.forEach((id) => {
      const meta = COUNT_META[id];
      const panel = document.querySelector('[data-count-for="' + id + '"]');
      if (!meta || !panel) return;
      const minus = panel.querySelector('[data-step="-1"]');
      const plus = panel.querySelector('[data-step="1"]');
      if (minus) {
        minus.addEventListener("click", () => {
          store.draftCounts[id] = Math.max(meta.min, Number(store.draftCounts[id]) - 1);
          syncCountLabels();
          scheduleSave();
        });
      }
      if (plus) {
        plus.addEventListener("click", () => {
          store.draftCounts[id] = Math.min(meta.max, Number(store.draftCounts[id]) + 1);
          syncCountLabels();
          scheduleSave();
        });
      }
    });
    syncCountLabels();
  }

  function setupExtrasDraft() {
    document.querySelectorAll("[data-extra-toggle]").forEach((input) => {
      const key = input.getAttribute("data-extra-toggle");
      if (key) store.draftExtras[key] = !!input.checked;
      input.addEventListener("change", () => {
        const k = input.getAttribute("data-extra-toggle");
        store.draftExtras[k] = !!input.checked;
        syncExtraPanels();
        const block = form.querySelector('.dash-block[data-step-id="extra-content"]');
        if (block) {
          const firstOn = ["address", "hours", "access"].find((id) => store.draftExtras[id]);
          block.setAttribute("data-preview-target", firstOn ? "#" + firstOn : "#preview-footer");
        }
        applyAllConfirmed();
        scheduleSave();
      });
    });
    syncExtraPanels();
    const block = form.querySelector('.dash-block[data-step-id="extra-content"]');
    if (block) {
      const firstOn = ["address", "hours", "access"].find((id) => store.draftExtras[id]);
      block.setAttribute("data-preview-target", firstOn ? "#" + firstOn : "#preview-footer");
    }
  }

  function applyRandomPalette() {
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    SWATCH_KEYS.forEach((key) => {
      store.draftColors[key] = pick(SWATCHES_FLAT);
      store.colorCodes[key] = "";
      store.colorModes[key] = "pick";
    });
    store.draftColors.pageBgSoft = softFrom(store.draftColors.pageBg);
    store.draftColors.bodyMuted = softMuted(store.draftColors.bodyInk);
    store.slotGradients = {};
    store.slotGradientPartners = {};
    syncHueSelectFromDraft();
    markPresetChosen("random");
    renderGctPalette();
    refreshColorUi();
    applyLiveColors(true);
    scheduleSave();
  }

  function applyPresetByKey(key) {
    if (key === "random") {
      applyRandomPalette();
      return true;
    }
    if (key === "blank") {
      applyBlankCanvasColors();
      scheduleSave();
      return true;
    }
    if (key === "vibe") {
      if (!store.vibeColors) return false;
      Object.assign(store.draftColors, store.vibeColors);
      store.draftColors.pageBgSoft = softFrom(store.draftColors.pageBg);
      store.draftColors.bodyMuted = softMuted(store.draftColors.bodyInk);
      clearAllColorCodes();
      syncHueSelectFromDraft();
      markPresetChosen("vibe");
      syncVibePresetButton();
      refreshColorUi();
      applyLiveColors(true);
      scheduleSave();
      return true;
    }
    const preset = PRESETS[key];
    if (!preset) return false;
    Object.assign(store.draftColors, preset);
    store.draftColors.pageBgSoft = softFrom(store.draftColors.pageBg);
    store.draftColors.bodyMuted = softMuted(store.draftColors.bodyInk);
    store.slotGradients = {};
    store.slotGradientPartners = {};
    clearAllColorCodes();
    syncHueSelectFromDraft();
    markPresetChosen(key);
    refreshColorUi();
    applyLiveColors(true);
    scheduleSave();
    return true;
  }

  function setupPresets() {
    document.querySelectorAll("[data-preset]").forEach((btn) => {
      btn.addEventListener("click", () => {
        applyPresetByKey(btn.getAttribute("data-preset"));
      });
    });
    const randomBtn = document.getElementById("btn-random");
    if (randomBtn) {
      randomBtn.addEventListener("click", () => {
        applyRandomPalette();
      });
    }
    const undo1 = document.getElementById("btn-random-undo-1");
    const undo2 = document.getElementById("btn-random-undo-2");
    if (undo1) undo1.addEventListener("click", () => restoreRandomHistory(0));
    if (undo2) undo2.addEventListener("click", () => restoreRandomHistory(1));
    document.querySelectorAll('input[name="radius"], input[name="headingScale"]').forEach((input) => {
      input.addEventListener("change", () => {
        applyLiveColors(true);
        scheduleSave();
      });
    });
  }

  function applyColorsToRoot(colors) {
    const c = { ...DEFAULTS, ...colors };
    c.pageBgSoft = softFrom(c.pageBg);
    c.bodyMuted = softMuted(c.bodyInk);
    Object.keys(VAR_MAP).forEach((key) => {
      if (c[key]) root.style.setProperty(VAR_MAP[key], c[key]);
    });
    root.style.setProperty("--radius", c.radius || DEFAULTS.radius);
    root.style.setProperty("--heading-scale", c.headingScale || DEFAULTS.headingScale);
  }

  function applyCountToPreview(id, count) {
    const block = document.getElementById(id);
    if (!block) return;
    const meta = COUNT_META[id];
    const items = Array.from(block.querySelectorAll(":scope > [data-sample-item]"));
    let n = Number(count);
    if (meta) n = Math.min(meta.max, Math.max(meta.min, n));
    block.setAttribute("data-count", String(n));
    items.forEach((item, i) => {
      item.hidden = i >= n;
    });
  }

  function applyFontsToRoot(fonts) {
    const f = fonts || {};
    const display = stackFor(f.display || "Shippori Mincho");
    const catchFont = stackFor(f.catch || f.display || "Shippori Mincho");
    const body = stackFor(f.body || "Zen Kaku Gothic New");
    root.style.setProperty("--font-display", display);
    root.style.setProperty("--font-catch", catchFont);
    root.style.setProperty("--font-body", body);
  }

  function setAccordionBody(details, text) {
    const body = details.querySelector(".accordion-body");
    if (!body) return;
    const parts = String(text || "")
      .split("／")
      .map((s) => s.trim())
      .filter(Boolean);
    const ul = document.createElement("ul");
    ul.className = "value-list";
    if (!parts.length) {
      const li = document.createElement("li");
      li.textContent = "";
      ul.appendChild(li);
    } else {
      parts.forEach((part) => {
        const li = document.createElement("li");
        const m = part.match(/^【([^】]+)】(.*)$/);
        if (m) {
          const mark = document.createElement("span");
          mark.className = "value-mark";
          mark.textContent = "【" + m[1] + "】";
          li.appendChild(mark);
          li.appendChild(document.createTextNode(m[2]));
        } else {
          li.textContent = part;
        }
        ul.appendChild(li);
      });
    }
    body.innerHTML = "";
    body.appendChild(ul);
  }

  function applyFilledText(el, value, fallback) {
    if (!el) return;
    const v = value != null && String(value).trim() !== "" ? String(value).trim() : fallback;
    el.textContent = v == null ? "" : v;
  }

  function applyTextDefaults() {
    const t = previewDefaults.text;
    document.querySelectorAll("#hero-leads [data-sample-item]").forEach((el, i) => {
      el.textContent = t.leads[i] || "";
    });
    const heroTitle = document.getElementById("hero-title");
    if (heroTitle) heroTitle.textContent = t.heroTitle;
    document.querySelectorAll("#hero-values [data-sample-item]").forEach((li, i) => {
      const title = li.querySelector(".hero-value-title");
      const text = li.querySelector("p:last-child");
      if (title) title.textContent = (t.values[i] || {}).title || "";
      if (text) text.textContent = (t.values[i] || {}).text || "";
    });
    applyFilledText(document.getElementById("about-label"), "", t.aboutLabel);
    applyFilledText(document.getElementById("about-heading"), "", t.aboutHeading);
    const aboutName = document.querySelector("#about .profile-name");
    const aboutLead = document.querySelector("#about .section-lead");
    if (aboutName) aboutName.textContent = t.aboutName;
    if (aboutLead) aboutLead.textContent = t.aboutLead;
    document.querySelectorAll("#about-accordions [data-sample-item]").forEach((el, i) => {
      const summary = el.querySelector("summary");
      if (summary) summary.textContent = (t.accs[i] || {}).title || "";
      setAccordionBody(el, (t.accs[i] || {}).body || "");
    });
    applyFilledText(document.getElementById("works-label"), "", t.worksLabel);
    applyFilledText(document.getElementById("works-heading"), "", t.worksHeading);
    applyFilledText(document.getElementById("works-lead"), "", t.worksLead);
    document.querySelectorAll("#works-list [data-sample-item]").forEach((li, i) => {
      const title = li.querySelector("h3");
      const text = li.querySelector(".work-item-copy p");
      if (title) title.textContent = (t.works[i] || {}).title || "";
      if (text) text.textContent = (t.works[i] || {}).text || "";
    });
    const hoursLead = document.querySelector("#hours .section-lead");
    const accessLead = document.querySelector("#access .section-lead");
    if (hoursLead) hoursLead.textContent = t.hoursLead;
    if (accessLead) accessLead.textContent = t.accessLead;
    applyFilledText(document.getElementById("contact-label"), "", t.contactLabel);
    applyFilledText(document.getElementById("contact-heading"), "", t.contactHeading);
    const contactLeads = document.querySelectorAll("#contact .contact-band-lead");
    contactLeads.forEach((el, i) => {
      el.textContent = t.contactLeads[i] || "";
    });
    const mail = document.querySelector("#contact .sample-mail");
    if (mail) mail.textContent = t.contactMail;
    syncPreviewHeaderChrome();
  }

  function applyExtrasToPreview(extras) {
    const e = extras || { hours: false, access: false, address: true };
    ["hours", "access", "address"].forEach((key) => {
      const section = document.querySelector('[data-extra="' + key + '"]');
      if (section) section.hidden = !e[key];
    });
  }

  function applyWorkCardLinks(fields) {
    const source = fields || formToObject();
    document.querySelectorAll("#works-list [data-sample-item]").forEach((li, i) => {
      const n = i + 1;
      const url = String(source["work_" + n + "_url"] || "").trim();
      const label = String(source["work_" + n + "_link_label"] || "").trim() || "リンク先を見る";
      const link = li.querySelector("[data-work-link]");
      const labelEl = li.querySelector("[data-work-link-label]");
      if (!link) return;
      if (url) {
        link.href = url;
        link.setAttribute("target", "_blank");
        link.setAttribute("rel", "noopener noreferrer");
        link.classList.remove("is-no-link");
        if (labelEl) {
          labelEl.textContent = label;
          labelEl.hidden = false;
        }
      } else {
        link.href = "#";
        link.removeAttribute("target");
        link.removeAttribute("rel");
        link.classList.add("is-no-link");
        if (labelEl) labelEl.hidden = true;
      }
    });
  }

  function applySnapshot(stepId, snap) {
    if (!snap) return;
    if (stepId === "logo-text" && snap.fields) {
      if (snap.fields.logo_mode) setFieldValue("logo_mode", snap.fields.logo_mode);
      if (snap.fields.logo_order) setFieldValue("logo_order", snap.fields.logo_order);
      syncLogoModePanels();
      syncPreviewHeaderChrome();
    }
    if (stepId === "hero-text" && snap.fields) {
      const t = previewDefaults.text;
      const heroTitle = document.getElementById("hero-title");
      if (heroTitle) {
        heroTitle.textContent = resolvePreviewText(snap.fields.hero_title, "hero_title", t.heroTitle);
      }
      document.querySelectorAll("#hero-leads [data-sample-item]").forEach((el, i) => {
        const key = "hero_lead_" + (i + 1);
        el.textContent = resolvePreviewText(snap.fields[key], key, t.leads[i] || "");
      });
    }
    if (stepId === "values-text" && snap.fields) {
      const t = previewDefaults.text;
      document.querySelectorAll("#hero-values [data-sample-item]").forEach((li, i) => {
        const n = i + 1;
        const title = li.querySelector(".hero-value-title");
        const text = li.querySelector("p:last-child");
        const titleKey = "value_" + n + "_title";
        const textKey = "value_" + n + "_text";
        const def = t.values[i] || {};
        if (title) title.textContent = resolvePreviewText(snap.fields[titleKey], titleKey, def.title || "");
        if (text) text.textContent = resolvePreviewText(snap.fields[textKey], textKey, def.text || "");
      });
    }
    if (stepId === "about-text" && snap.fields) {
      const t = previewDefaults.text;
      applyFilledText(
        document.getElementById("about-label"),
        snap.fields.about_section_name,
        purposeField("about_section_name") || t.aboutLabel
      );
      applyFilledText(
        document.getElementById("about-heading"),
        snap.fields.about_heading,
        purposeField("about_heading") || t.aboutHeading
      );
      const aboutName = document.querySelector("#about .profile-name");
      const aboutLead = document.querySelector("#about .section-lead");
      if (aboutName) {
        aboutName.textContent = resolvePreviewText(snap.fields.about_name, "about_name", t.aboutName);
      }
      if (aboutLead) {
        aboutLead.textContent = resolvePreviewText(snap.fields.about_lead, "about_lead", t.aboutLead);
      }
      document.querySelectorAll("#about-accordions [data-sample-item]").forEach((el, i) => {
        const n = i + 1;
        const summary = el.querySelector("summary");
        const titleKey = "acc_" + n + "_title";
        const bodyKey = "acc_" + n + "_body";
        const def = t.accs[i] || {};
        if (summary) {
          summary.textContent = resolvePreviewText(snap.fields[titleKey], titleKey, def.title || "");
        }
        setAccordionBody(el, resolvePreviewText(snap.fields[bodyKey], bodyKey, def.body || ""));
      });
      syncPreviewHeaderChrome();
    }
    if (stepId === "works-text" && snap.fields) {
      const t = previewDefaults.text;
      applyFilledText(
        document.getElementById("works-label"),
        snap.fields.works_section_name,
        purposeField("works_section_name") || t.worksLabel
      );
      applyFilledText(
        document.getElementById("works-heading"),
        snap.fields.works_heading,
        purposeField("works_heading") || t.worksHeading
      );
      applyFilledText(
        document.getElementById("works-lead"),
        snap.fields.works_lead,
        purposeField("works_lead") || t.worksLead
      );
      document.querySelectorAll("#works-list [data-sample-item]").forEach((li, i) => {
        const n = i + 1;
        const title = li.querySelector("h3");
        const text = li.querySelector(".work-item-copy p");
        const titleKey = "work_" + n + "_title";
        const textKey = "work_" + n + "_text";
        const def = t.works[i] || {};
        if (title) title.textContent = resolvePreviewText(snap.fields[titleKey], titleKey, def.title || "");
        if (text) text.textContent = resolvePreviewText(snap.fields[textKey], textKey, def.text || "");
      });
      applyWorkCardLinks(snap.fields);
      syncPreviewHeaderChrome();
    }
    if (stepId === "extra-content" && snap.fields) {
      const t = previewDefaults.text;
      const hoursLead = document.getElementById("hours-lead") || document.querySelector("#hours .section-lead");
      const accessLead = document.getElementById("access-lead") || document.querySelector("#access .section-lead");
      if (hoursLead) {
        hoursLead.textContent = resolvePreviewText(snap.fields.hours_text, "hours_text", t.hoursLead);
      }
      if (accessLead) {
        accessLead.textContent = resolvePreviewText(snap.fields.access_text, "access_text", t.accessLead);
      }
      applyAddressLink(snap.fields, "");
    }
    if (stepId === "contact-text" && snap.fields) {
      const t = previewDefaults.text;
      const flags = snap.contactFlags || store.draftContact || { label: true, note1: true, note2: true };
      const labelEl = document.getElementById("contact-label");
      if (labelEl) {
        labelEl.hidden = !flags.label;
        if (flags.label) {
          applyFilledText(
            labelEl,
            snap.fields.contact_label,
            purposeField("contact_label") || t.contactLabel
          );
        }
      }
      applyFilledText(
        document.getElementById("contact-heading"),
        snap.fields.contact_section_name,
        purposeField("contact_section_name") || t.contactHeading
      );
      syncPreviewHeaderChrome();
      const note1 = document.querySelector('#contact [data-contact-note="1"]');
      const note2 = document.querySelector('#contact [data-contact-note="2"]');
      if (note1) {
        note1.hidden = !flags.note1;
        if (flags.note1) {
          note1.textContent = resolvePreviewText(
            snap.fields.contact_note_1,
            "contact_note_1",
            t.contactLeads[0] || ""
          );
        }
      }
      if (note2) {
        note2.hidden = !flags.note2;
        if (flags.note2) {
          note2.textContent = resolvePreviewText(
            snap.fields.contact_note_2,
            "contact_note_2",
            t.contactLeads[1] || ""
          );
        }
      }
      const mail = document.querySelector("#contact .sample-mail");
      if (mail) {
        mail.textContent = resolvePreviewText(
          snap.fields.contact_email,
          "contact_email",
          t.contactMail
        );
      }
    }
    if (stepId === "logo-text") {
      syncFooterBrand();
    }
  }

  const COUNT_OWNER_STEP = {
    "hero-leads": "hero-text",
    "hero-values": "values-text",
    "about-accordions": "about-text",
    "about-photos": "about-images",
    "works-list": "works-images"
  };

  function applyAllConfirmed() {
    const counts = { ...previewDefaults.counts };
    const fonts = { ...previewDefaults.fonts };
    let extras = { ...previewDefaults.extras };

    applyTextDefaults();
    Object.keys(counts).forEach((id) => applyCountToPreview(id, counts[id]));
    applyExtrasToPreview(extras);

    CONFIRM_STEPS.forEach((step) => {
      const stepId = step.id;
      if (!store.confirmed[stepId]) return;
      const snap = store.snapshots[stepId];
      if (!snap) return;
      if (snap.counts) Object.assign(counts, snap.counts);
      if (snap.fonts) Object.assign(fonts, snap.fonts);
      if (snap.extras) extras = { ...extras, ...snap.extras };
      Object.keys(counts).forEach((id) => {
        if (snap.counts && snap.counts[id] != null) applyCountToPreview(id, snap.counts[id]);
      });
      applySnapshot(stepId, snap);
      if (snap.extras) applyExtrasToPreview(extras);
    });

    COUNT_IDS.forEach((id) => {
      const owner = COUNT_OWNER_STEP[id];
      if (owner && !store.confirmed[owner] && store.draftCounts[id] != null) {
        applyCountToPreview(id, store.draftCounts[id]);
      }
    });

    applyFontsToRoot(Object.assign({}, fonts, readDraftFonts()));
    applyLiveColors(false);
    applyAllImages();

    if (store.confirmed["extra-content"] && store.snapshots["extra-content"]) {
      const extraSnap = store.snapshots["extra-content"];
      extras = {
        ...extras,
        hours: !!(extraSnap.extras || {}).hours,
        access: !!(extraSnap.extras || {}).access,
        address: !!(extraSnap.extras || {}).address
      };
    }
    extras = {
      ...extras,
      hours: !!(store.draftExtras && store.draftExtras.hours),
      access: !!(store.draftExtras && store.draftExtras.access),
      address: store.draftExtras && store.draftExtras.address != null ? !!store.draftExtras.address : true
    };
    applyExtrasToPreview(extras);
    applyDraftTextsFromForm();
    applyWorkCardLinks();
    applyContactFlagsToPreview();
    syncFooterBrand();
  }

  function applyContactFlagsToPreview() {
    const flags = store.draftContact || { label: true, note1: true, note2: true };
    const labelEl = document.getElementById("contact-label");
    if (labelEl) labelEl.hidden = !flags.label;
    const note1 = document.querySelector('#contact [data-contact-note="1"]');
    const note2 = document.querySelector('#contact [data-contact-note="2"]');
    if (note1) note1.hidden = !flags.note1;
    if (note2) note2.hidden = !flags.note2;
  }

  function captureStepSnapshot(stepId) {
    const snap = { stepId: stepId, at: new Date().toISOString() };
    const fields = formToObject();

    if (stepId === "purpose") {
      snap.sitePurpose = store.sitePurpose || readSitePurposeFromForm();
      snap.ack = true;
    }
    if (stepId === "guide") {
      snap.ack = true;
      snap.uiMode = store.uiMode || readUiModeFromForm();
      snap.draftColors = { ...store.draftColors };
    }
    if (stepId === "hero-image") {
      snap.images = captureImages(["hero_image"]);
    }
    if (stepId === "about-images") {
      snap.counts = {
        "about-photos": Number(store.draftCounts["about-photos"])
      };
      snap.images = captureImages(["about_image_1", "about_image_2", "about_image_3", "about_image_4"]);
    }
    if (stepId === "works-images") {
      snap.counts = { "works-list": Number(store.draftCounts["works-list"]) };
      snap.images = captureImages(["work_1_image", "work_2_image", "work_3_image"]);
    }
    if (stepId === "logo-text") {
      snap.fields = {
        logo_mode: getLogoMode(),
        logo_order: getLogoOrder(),
        brand_name: fields.brand_name || ""
      };
      snap.images = captureImages(["logo_image"]);
    }
    if (stepId === "heading-font") {
      snap.fonts = {
        display: fieldValue("font_display") || "Shippori Mincho"
      };
    }
    if (stepId === "catch-font") {
      snap.fonts = {
        catch: fieldValue("font_catch") || "Shippori Mincho"
      };
    }
    if (stepId === "body-font") {
      snap.fonts = {
        body: fieldValue("font_body") || "Zen Kaku Gothic New"
      };
    }
    if (stepId === "hero-text") {
      snap.counts = { "hero-leads": Number(store.draftCounts["hero-leads"]) };
      snap.fields = {
        hero_title: fields.hero_title || "",
        hero_lead_1: fields.hero_lead_1 || "",
        hero_lead_2: fields.hero_lead_2 || "",
        hero_lead_3: fields.hero_lead_3 || ""
      };
    }
    if (stepId === "values-text") {
      snap.counts = { "hero-values": Number(store.draftCounts["hero-values"]) };
      snap.fields = {
        value_1_title: fields.value_1_title || "",
        value_1_text: fields.value_1_text || "",
        value_2_title: fields.value_2_title || "",
        value_2_text: fields.value_2_text || "",
        value_3_title: fields.value_3_title || "",
        value_3_text: fields.value_3_text || ""
      };
    }
    if (stepId === "about-text") {
      snap.counts = {
        "about-accordions": Number(store.draftCounts["about-accordions"])
      };
      snap.fields = {
        about_section_name: fields.about_section_name || "",
        about_heading: fields.about_heading || "",
        about_name: fields.about_name || "",
        about_lead: fields.about_lead || "",
        acc_1_title: fields.acc_1_title || "",
        acc_1_body: fields.acc_1_body || "",
        acc_2_title: fields.acc_2_title || "",
        acc_2_body: fields.acc_2_body || "",
        acc_3_title: fields.acc_3_title || "",
        acc_3_body: fields.acc_3_body || ""
      };
    }
    if (stepId === "works-text") {
      snap.fields = {
        works_section_name: fields.works_section_name || "",
        works_heading: fields.works_heading || "",
        works_lead: fields.works_lead || "",
        work_1_title: fields.work_1_title || "",
        work_1_text: fields.work_1_text || "",
        work_2_title: fields.work_2_title || "",
        work_2_text: fields.work_2_text || "",
        work_3_title: fields.work_3_title || "",
        work_3_text: fields.work_3_text || "",
        work_1_url: fields.work_1_url || "",
        work_1_link_label: fields.work_1_link_label || "",
        work_2_url: fields.work_2_url || "",
        work_2_link_label: fields.work_2_link_label || "",
        work_3_url: fields.work_3_url || "",
        work_3_link_label: fields.work_3_link_label || ""
      };
    }
    if (stepId === "extra-content") {
      snap.extras = {
        hours: !!(document.querySelector('[data-extra-toggle="hours"]') || {}).checked,
        access: !!(document.querySelector('[data-extra-toggle="access"]') || {}).checked,
        address: !!(document.querySelector('[data-extra-toggle="address"]') || {}).checked
      };
      snap.fields = {
        hours_text: fields.hours_text || "",
        access_text: fields.access_text || "",
        address_text: fields.address_text || ""
      };
    }
    if (stepId === "contact-text") {
      snap.fields = {
        contact_section_name: fields.contact_section_name || "",
        contact_label: fields.contact_label || "",
        contact_email: fields.contact_email || "",
        contact_note_1: fields.contact_note_1 || "",
        contact_note_2: fields.contact_note_2 || "",
        contact_show_label: fields.contact_show_label || "",
        contact_show_note_1: fields.contact_show_note_1 || "",
        contact_show_note_2: fields.contact_show_note_2 || ""
      };
      snap.contactFlags = {
        label: !!store.draftContact.label,
        note1: !!store.draftContact.note1,
        note2: !!store.draftContact.note2
      };
    }
    if (stepId === "finish") {
      snap.fields = {
        extra_notes: fields.extra_notes || "",
        font_wish_target: fields.font_wish_target || "",
        font_wish_name: fields.font_wish_name || "",
        scope_layout_fixed: fields.scope_layout_fixed || "",
        scope_no_copy: fields.scope_no_copy || "",
        scope_no_form: fields.scope_no_form || "",
        scope_update: fields.scope_update || "",
        scope_revision_once: fields.scope_revision_once || ""
      };
    }
    const colorPart = captureColorSnapshot(stepId);
    if (colorPart) Object.assign(snap, colorPart);
    return snap;
  }

  function validateFinish() {
    return SCOPE_NAMES.every((name) => {
      const el = form.elements.namedItem(name);
      return el && el.checked;
    });
  }

  function layoutLabel(id) {
    const meta = LAYOUT_META[id] || LAYOUT_META.a;
    return meta.code + " " + meta.name + "（" + meta.blurb + "）";
  }

  function purposeLabel(id) {
    const map = {
      personal: "個人紹介",
      company: "会社・教室案内",
      shop: "お店案内",
      works: "実績・事例中心",
      service: "サービス・メニュー案内"
    };
    return map[id] || "未選択";
  }

  function applyLayoutPattern(id, opts) {
    const next = normalizeLayoutId(id);
    const prev = store.layoutPattern;
    store.layoutPattern = next;
    if (!opts || !opts.keepUnselected) {
      store.layoutSelected = true;
    }
    root.setAttribute("data-layout", next);
    document.querySelectorAll(".layout-card[data-layout]").forEach((btn) => {
      const on = store.layoutSelected && btn.getAttribute("data-layout") === next;
      btn.classList.toggle("is-selected", on);
      btn.setAttribute("aria-checked", on ? "true" : "false");
    });
    applyLayoutOrderToPreview();
    renderLayoutArrangeWire();
    if (prev !== next && store.confirmed.finish) {
      unconfirmFinishSoft();
    }
    updateFinishSummary();
    if (!opts || !opts.silent) {
      window.setTimeout(() => scrollPreviewTo("#hero"), 40);
      scheduleSave();
    }
  }

  function applyLayoutOrderToPreview() {
    const main = root.querySelector("main");
    if (!main) return;
    store.layoutOrder = normalizeLayoutOrder(store.layoutOrder);
    const setId = store.layoutPattern || "a";
    const nodes = [];
    store.layoutOrder.forEach((id) => {
      const meta = LAYOUT_BLOCKS.find((b) => b.id === id);
      if (!meta) return;
      const el = root.querySelector(meta.selector);
      if (!el) return;
      el.setAttribute("data-layout-size", layoutSizeFor(id, setId));
      nodes.push(el);
    });
    const extras = Array.from(main.children).filter(
      (el) => !el.getAttribute("data-layout-block")
    );
    nodes.forEach((el) => main.appendChild(el));
    extras.forEach((el) => {
      if (el.id === "hours" || el.id === "access") {
        const contact = root.querySelector("#contact");
        if (contact && contact.parentElement === main) main.insertBefore(el, contact);
        else main.appendChild(el);
      } else {
        main.appendChild(el);
      }
    });
  }

  function swapLayoutBlocks(aId, bId) {
    if (!aId || !bId || aId === bId) return;
    const order = normalizeLayoutOrder(store.layoutOrder).slice();
    const ia = order.indexOf(aId);
    const ib = order.indexOf(bId);
    if (ia < 0 || ib < 0) return;
    if (layoutSizeFor(aId, store.layoutPattern) !== layoutSizeFor(bId, store.layoutPattern)) return;
    const tmp = order[ia];
    order[ia] = order[ib];
    order[ib] = tmp;
    store.layoutOrder = order;
    store.layoutSwapFrom = null;
    applyLayoutOrderToPreview();
    renderLayoutArrangeWire();
    const meta = LAYOUT_BLOCKS.find((b) => b.id === bId);
    if (meta) scrollPreviewTo(meta.selector);
    if (store.confirmed.finish) unconfirmFinishSoft();
    updateFinishSummary();
    scheduleSave();
  }

  function layoutArrangeHosts() {
    return [
      document.getElementById("layout-arrange-wire"),
      document.getElementById("layout-arrange-wire-menu")
    ].filter(Boolean);
  }

  function renderLayoutArrangeWire() {
    const hosts = layoutArrangeHosts();
    const order = normalizeLayoutOrder(store.layoutOrder);
    const setId = store.layoutPattern || "a";
    if (hosts.length) {
      hosts.forEach((host) => {
        host.innerHTML = "";
        host.classList.toggle("layout-arrange-wire--split", setId === "b");
        host.classList.toggle("layout-arrange-wire--mix", setId === "c");
        host.classList.toggle("layout-arrange-wire--wide", setId === "a");
        order.forEach((id) => {
          const meta = LAYOUT_BLOCKS.find((b) => b.id === id);
          if (!meta) return;
          const size = layoutSizeFor(id, setId);
          const cell = document.createElement("button");
          cell.type = "button";
          cell.className = "layout-arrange-cell size-" + size;
          cell.setAttribute("data-layout-block", id);
          cell.setAttribute("draggable", "true");
          cell.setAttribute("role", "listitem");
          cell.setAttribute(
            "aria-label",
            meta.label + "（ドラッグして同じ大きさの枠と入れ替え）"
          );
          cell.innerHTML =
            '<span class="layout-arrange-size">' +
            (size === "L" ? "横" : "左右") +
            '</span><span class="layout-arrange-name">' +
            meta.label +
            "</span>";
          bindLayoutArrangeDrag(cell, id, size);
          host.appendChild(cell);
        });
      });
      document.querySelectorAll(".layout-arrange-hint").forEach((hint) => {
        hint.textContent =
          "枠をドラッグして、同じ大きさの枠の上で離すと入れ替わります（スマホは枠を順にタップでも可）。";
      });
    }
    renderLayoutCardWires();
  }

  function bindLayoutArrangeDrag(cell, id, size) {
    cell.addEventListener("dragstart", (ev) => {
      store.layoutDragId = id;
      store.layoutDragSize = size;
      store.layoutDragMoved = false;
      cell.classList.add("is-dragging");
      try {
        ev.dataTransfer.setData("text/plain", id);
        ev.dataTransfer.effectAllowed = "move";
      } catch (err) {
        /* ignore */
      }
    });
    cell.addEventListener("drag", () => {
      store.layoutDragMoved = true;
    });
    cell.addEventListener("dragend", () => {
      store.layoutDragId = null;
      store.layoutDragSize = null;
      document.querySelectorAll(".layout-arrange-cell").forEach((el) => {
        el.classList.remove("is-dragging", "is-drop-target", "is-drop-deny");
      });
    });
    cell.addEventListener("dragover", (ev) => {
      const from = store.layoutDragId;
      const fromSize = store.layoutDragSize;
      if (!from || from === id) return;
      const ok = fromSize === size;
      if (ok) {
        ev.preventDefault();
        cell.classList.add("is-drop-target");
        cell.classList.remove("is-drop-deny");
      } else {
        cell.classList.add("is-drop-deny");
        cell.classList.remove("is-drop-target");
      }
    });
    cell.addEventListener("dragleave", () => {
      cell.classList.remove("is-drop-target", "is-drop-deny");
    });
    cell.addEventListener("drop", (ev) => {
      ev.preventDefault();
      const from = store.layoutDragId;
      cell.classList.remove("is-drop-target", "is-drop-deny");
      if (!from || from === id) return;
      if (layoutSizeFor(from, store.layoutPattern) !== size) return;
      swapLayoutBlocks(from, id);
    });
    /* スマホ／キーボード向け：タップ2回で入れ替え */
    cell.addEventListener("click", () => {
      if (store.layoutDragMoved) {
        store.layoutDragMoved = false;
        return;
      }
      if (!store.layoutSwapFrom) {
        store.layoutSwapFrom = id;
        document.querySelectorAll(".layout-arrange-cell").forEach((el) => {
          const otherId = el.getAttribute("data-layout-block");
          const otherSize = layoutSizeFor(otherId, store.layoutPattern);
          el.classList.toggle("is-selected", otherId === id);
          el.classList.toggle("is-drop-target", otherId !== id && otherSize === size);
          el.classList.toggle("is-drop-deny", otherId !== id && otherSize !== size);
        });
        document.querySelectorAll(".layout-arrange-hint").forEach((hint) => {
          hint.textContent = "光っている枠をタップすると入れ替わります。";
        });
        return;
      }
      if (store.layoutSwapFrom === id) {
        store.layoutSwapFrom = null;
        renderLayoutArrangeWire();
        return;
      }
      const from = store.layoutSwapFrom;
      store.layoutSwapFrom = null;
      swapLayoutBlocks(from, id);
    });
  }

  function setupLayoutArrange() {
    renderLayoutArrangeWire();
    document.querySelectorAll("[data-layout-arrange-reset]").forEach((reset) => {
      if (reset.dataset.bound) return;
      reset.dataset.bound = "1";
      reset.addEventListener("click", () => {
        store.layoutOrder = LAYOUT_DEFAULT_ORDER.slice();
        store.layoutSwapFrom = null;
        applyLayoutOrderToPreview();
        renderLayoutArrangeWire();
        document.querySelectorAll(".layout-arrange-hint").forEach((hint) => {
          hint.textContent = "並びを最初に戻しました。";
        });
        scheduleSave();
      });
    });
    document.querySelectorAll("[data-layout-arrange-done]").forEach((done) => {
      if (done.dataset.bound) return;
      done.dataset.bound = "1";
      done.addEventListener("click", () => {
        store.layoutSwapFrom = null;
        store.confirmed.layout = true;
        store.snapshots.layout = captureStepSnapshot("layout");
        renderLayoutArrangeWire();
        const block = form.querySelector('.dash-block[data-step-id="layout"]');
        if (block) block.open = false;
        if (typeof window.closeAtelierMenu === "function") window.closeAtelierMenu();
        /* 出口ひとつ：レイアウトOK → 提出（最終確認） */
        openStep("finish");
        scheduleSave();
      });
    });
  }

  function cloneLayoutCardsInto(target) {
    const source = document.getElementById("layout-picker-row");
    if (!source || !target) return;
    target.innerHTML = source.innerHTML;
    target.dataset.filled = "1";
  }

  function setupLayoutPicker() {
    renderLayoutCardWires();
    cloneLayoutCardsInto(document.getElementById("layout-picker-row-menu"));
    renderLayoutCardWires();

    document.querySelectorAll(".layout-picker-row .layout-card[data-layout]").forEach((btn) => {
      btn.addEventListener("click", () => {
        applyLayoutPattern(btn.getAttribute("data-layout"));
      });
    });

    if (store.layoutSelected) {
      applyLayoutPattern(store.layoutPattern || "a", { silent: true });
    } else {
      applyLayoutPattern(store.layoutPattern || "a", { silent: true, keepUnselected: true });
    }
    setupLayoutArrange();
  }

  function buildFinishSummaryLines() {
    const presetName = store.chosenPresetKey
      ? ({
          clinic: "見本デフォルト",
          green: "落ち着き緑",
          cafe: "暖色カフェ",
          ink: "墨モダン",
          ocean: "海青",
          plum: "紫・上品",
          brick: "赤・元気",
          vibe: "自分で全部選ぶ（イメージ）",
          sakura: "桜・やわらか"
        }[store.chosenPresetKey] || store.chosenPresetKey)
      : "（色を選択中）";
    const brand = (fieldValue("brand_name") || fieldValue("hero_title") || "").trim();
    return [
      "レイアウト: " + layoutLabel(store.layoutPattern) + "／並び " + normalizeLayoutOrder(store.layoutOrder).join("-"),
      "用途: " + purposeLabel(store.sitePurpose),
      "雰囲気色: " + presetName,
      brand ? "サイト名（仮）: " + brand : null
    ].filter(Boolean);
  }

  function updateFinishSummary() {
    const list = document.getElementById("finish-summary-list");
    if (!list) return;
    list.innerHTML = buildFinishSummaryLines()
      .map((line) => "<li>" + line.replace(/</g, "&lt;") + "</li>")
      .join("");
  }

  function showContentConfirmPanel(opts) {
    const lines = buildFinishSummaryLines();
    const title = (opts && opts.title) || "この内容でよろしいですか？";
    const okLabel = (opts && opts.okLabel) || "この内容でOK・ZIPを保存する";
    const lead =
      (opts && opts.lead) ||
      "確定を押すと、依頼ファイル（ZIP）がパソコンに保存されます。保存＝送信ではありません。案内された連絡先に自分で添付して送ってください。";
    showWizardFootPanel(
      "<p class=\"wizard-foot-panel-text\"><strong>" +
        title +
        "</strong></p>" +
        "<p class=\"wizard-foot-panel-text\">" +
        lead +
        "</p>" +
        "<ul class=\"wizard-foot-panel-list\">" +
        lines.map((line) => "<li>" + line.replace(/</g, "&lt;") + "</li>").join("") +
        "</ul>" +
        "<div class=\"wizard-foot-panel-actions\">" +
        "<button type=\"button\" class=\"wizard-btn\" data-confirm-cancel>やめる</button>" +
        "<button type=\"button\" class=\"wizard-btn wizard-btn-zip-jackpot\" data-confirm-ok>" +
        okLabel +
        "</button>" +
        "</div>"
    );
    return new Promise((resolve) => {
      const panel = document.getElementById("wizard-foot-panel");
      if (!panel) {
        resolve(false);
        return;
      }
      const cancel = panel.querySelector("[data-confirm-cancel]");
      const ok = panel.querySelector("[data-confirm-ok]");
      if (cancel) {
        cancel.addEventListener(
          "click",
          () => {
            hideWizardFootPanel();
            resolve(false);
          },
          { once: true }
        );
      }
      if (ok) {
        ok.addEventListener(
          "click",
          () => {
            hideWizardFootPanel();
            resolve(true);
          },
          { once: true }
        );
      }
    });
  }

  function requestFinishConfirmThenZip() {
    if (!validateFinish()) {
      updateFinishSubmitUi();
      openStep("finish");
      return Promise.resolve(false);
    }
    return showContentConfirmPanel({
      title: store.finishLockedOnce ? "この修正でよろしいですか？" : "この内容でよろしいですか？",
      lead:
        "確定を押すと、依頼ファイル（ZIP）がパソコンに保存されます。保存＝送信ではありません。案内された連絡先に自分で添付して送ってください。",
      okLabel: store.finishLockedOnce
        ? "この修正でOK・ZIPを保存する"
        : "この内容でOK・ZIPを保存する"
    }).then((ok) => {
      if (!ok) return false;
      confirmStep("finish");
      store.finishLockedOnce = true;
      updateWizardUi();
      updateFinishSummary();
      return runZipDownload();
    });
  }

  function updateFinishSubmitUi() {
    const btn = document.getElementById("btn-finish-confirm");
    const changeBtn = document.getElementById("btn-finish-change");
    const hint = document.getElementById("finish-submit-hint");
    const zipNote = document.getElementById("finish-zip-note");
    const scopesOk = validateFinish();
    const done = !!store.confirmed.finish && scopesOk;
    updateFinishSummary();
    if (btn) {
      btn.textContent = done
        ? "ZIP保存済み"
        : store.finishLockedOnce
          ? "この修正でOK・ZIPを保存する"
          : "この内容でOK・ZIPを保存する";
      btn.disabled = done || !scopesOk;
      btn.classList.toggle("is-done", done);
      btn.hidden = done;
    }
    if (changeBtn) {
      changeBtn.hidden = !done;
    }
    if (zipNote) {
      zipNote.hidden = done;
    }
    if (hint) {
      if (done) {
        hint.textContent =
          "ZIPを保存済みです。直すときは「変更する」を押してください。もう一度保存するときは下のZIPボタンも使えます。";
      } else {
        hint.textContent = scopesOk ? "" : "5項目すべてにチェックを入れてください。";
      }
    }
  }

  function unconfirmFinishSoft() {
    if (!store.confirmed.finish) return;
    store.confirmed.finish = false;
    delete store.snapshots.finish;
    applyAllConfirmed();
    updateConfirmUi();
    updateFinishFootUi();
    scheduleSave();
  }

  function setupScopeChecks() {
    SCOPE_NAMES.forEach((name) => {
      const el = form.elements.namedItem(name);
      if (!el) return;
      el.addEventListener("change", () => {
        if (store.confirmed.finish && !validateFinish()) {
          unconfirmFinishSoft();
          return;
        }
        updateFinishSubmitUi();
        updateZipGate();
        scheduleSave();
      });
    });
  }

  function updateConfirmUi() {
    document.querySelectorAll(".dash-block[data-step-id]").forEach((block) => {
      const id = block.getAttribute("data-step-id");
      const meta = STEPS.find((s) => s.id === id);
      if (!meta || !meta.needsConfirm) {
        block.classList.remove("is-confirmed");
        return;
      }
      const done = !!store.confirmed[id];
      block.classList.toggle("is-confirmed", done);
      const status = block.querySelector("[data-confirm-status]");
      if (status) {
        if (id === "finish") {
          status.hidden = true;
        } else {
          status.textContent = done ? "確定済み" : "未確定";
        }
      }
    });

    updateFinishSubmitUi();
    updateZipGate();
    updateZoneBadgeDoneState();
    updateProgressBar();
  }

  function updateZipGate() {
    const zipBtn = document.getElementById("btn-zip");
    const missingEl = document.getElementById("zip-missing");
    const missing = STEPS.filter((s) => !store.confirmed[s.id]);
    const missingBar = countUnconfirmedBarSteps();
    const missingImgs = missingRequiredImages();
    const ready = missing.length === 0 && missingImgs.length === 0;
    if (zipBtn) {
      zipBtn.disabled = !ready;
      zipBtn.classList.toggle("is-disabled", !ready);
    }
    if (missingEl) {
      if (ready) {
        missingEl.textContent = "";
      } else if (missingImgs.length) {
        const tips = missingImgs.slice(0, 2).map(missingImageStepTip);
        const extra = missingImgs.length - tips.length;
        let label = tips.map((t) => "「" + t + "」").join("");
        if (extra > 0) label += "ほか" + extra + "件";
        missingEl.textContent =
          "写真が足りません（" + label + "）。進捗バーの番号をタップするか、見本サイトの番号（PCではマウスを乗せる）で、どの画像か分かります。";
      } else if (missingBar.length) {
        missingEl.textContent =
          "まだ " +
          formatMissingStepList(missingBar, 2) +
          " が未完了です（あと " +
          missingBar.length +
          " 件）。進捗バーの番号をタップするか、見本サイトの番号（PCではマウスを乗せる）で内容が分かります。";
      } else if (!store.confirmed.finish) {
        missingEl.textContent = "「この内容でOK・ZIPを保存する」がまだです。";
      } else {
        missingEl.textContent = "";
      }
    }
    updateFinishFootUi();
  }

  function confirmStep(stepId) {
    if (stepId === "finish" && !validateFinish()) {
      updateFinishSubmitUi();
      return;
    }
    store.snapshots[stepId] = captureStepSnapshot(stepId);
    store.confirmed[stepId] = true;
    applyAllConfirmed();
    updateConfirmUi();
    scheduleSave();
  }

  function unconfirmStep(stepId) {
    clearStepImages(stepId);
    resetStepForm(stepId);
    store.confirmed[stepId] = false;
    delete store.snapshots[stepId];
    if (stepId === "global-preset") {
      store.presetChosen = false;
      store.chosenPresetKey = null;
      store.randomHistory = [];
      document.querySelectorAll("[data-preset]").forEach((btn) => btn.classList.remove("is-active"));
      const randomBtn = document.getElementById("btn-random");
      if (randomBtn) randomBtn.classList.remove("is-active");
      updateRandomUndoUi();
    }
    applyAllConfirmed();
    applyLiveColors(false);
    updateConfirmUi();
    updateZoneBadgeDoneState();
    scheduleSave();
  }

  function clearFileInput(name) {
    const input = form.elements.namedItem(name);
    if (input && input.type === "file") input.value = "";
  }

  function resetStepForm(stepId) {
    const cfg = STEP_FIELD_RESET[stepId];
    if (!cfg) return;
    (cfg.texts || []).forEach((name) => setFieldValue(name, ""));
    if (cfg.fonts) {
      Object.keys(cfg.fonts).forEach((name) => setFieldValue(name, cfg.fonts[name]));
      syncFontPickers();
    }
    if (cfg.counts) Object.keys(cfg.counts).forEach((id) => {
      store.draftCounts[id] = cfg.counts[id];
    });
    (cfg.files || []).forEach(clearFileInput);
    if (cfg.extrasReset) {
      ["hours", "access", "address"].forEach((key) => {
        const input = document.querySelector('[data-extra-toggle="' + key + '"]');
        if (input) input.checked = key === "address";
        store.draftExtras[key] = key === "address";
      });
      syncExtraPanels();
    }
    if (cfg.logoModeReset) {
      setFieldValue("logo_mode", "text");
      setFieldValue("logo_order", "image-first");
      syncLogoModePanels();
      syncLogoPresentation();
    }
    if (cfg.uncheck) cfg.uncheck.forEach((name) => setFieldValue(name, ""));
    if (cfg.fontWishReset) {
      setFieldValue("font_wish_target", "");
      syncFontWishPanel();
    }
    syncCountLabels();
    updateFontPreview();
  }

  function setupConfirmButtons() {
    document.querySelectorAll(".dash-block[data-step-id]").forEach((block) => {
      const stepId = block.getAttribute("data-step-id");
      const confirmBtn = block.querySelector("[data-confirm-step]");
      const unconfirmBtn = block.querySelector("[data-unconfirm-step]");
      if (confirmBtn) {
        confirmBtn.addEventListener("click", () => confirmStep(stepId));
      }
      if (unconfirmBtn) {
        unconfirmBtn.addEventListener("click", () => unconfirmStep(stepId));
      }
    });
  }

  function scrollPreviewTo(selector) {
    if (selector) store.pendingPreviewScroll = selector;
    const scroll = document.querySelector(".preview-scroll");
    const pane = document.querySelector(".preview-pane");
    if (!scroll || !selector) return;

    let didTempShow = false;
    let restoredPaneStyle = null;
    if (pane && getComputedStyle(pane).display === "none") {
      /* 注文タブ中でも見本の scrollTop を先に合わせておく（サンプル切替ですぐ該当位置） */
      didTempShow = true;
      restoredPaneStyle = pane.getAttribute("style");
      pane.style.setProperty("display", "flex", "important");
      pane.style.setProperty("position", "fixed");
      pane.style.setProperty("left", "-12000px");
      pane.style.setProperty("top", "0");
      pane.style.setProperty("width", "390px");
      pane.style.setProperty("height", "720px");
      pane.style.setProperty("visibility", "hidden");
      pane.style.setProperty("pointer-events", "none");
      void pane.offsetHeight;
    }

    try {
      if (selector === "#preview-root") {
        scroll.scrollTo({ top: 0, behavior: "auto" });
        store.pendingPreviewScroll = null;
        return;
      }
      let target = root.querySelector(selector);
      if (!target) target = document.getElementById(selector.replace(/^#/, ""));
      if (!target) return;
      if (target.hidden) {
        const fallback =
          root.querySelector('[data-extra]:not([hidden])') ||
          root.querySelector("#preview-footer") ||
          root.querySelector("#contact");
        if (fallback) target = fallback;
        else return;
      }
      const scrollRect = scroll.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const next = scroll.scrollTop + (targetRect.top - scrollRect.top) - 10;
      scroll.scrollTo({
        top: Math.max(0, next),
        behavior: didTempShow ? "auto" : "smooth"
      });
      store.pendingPreviewScroll = null;
    } finally {
      if (didTempShow && pane) {
        if (restoredPaneStyle == null) pane.removeAttribute("style");
        else pane.setAttribute("style", restoredPaneStyle);
      }
    }
  }

  function applyPendingPreviewScroll() {
    if (!store.pendingPreviewScroll) return;
    const sel = store.pendingPreviewScroll;
    window.requestAnimationFrame(() => {
      window.setTimeout(() => scrollPreviewTo(sel), 30);
    });
  }

  function switchToDashTab() {
    document.body.classList.add("show-dash");
    document.body.classList.remove("show-preview");
    document.querySelectorAll(".atelier-tab").forEach((tab) => {
      tab.classList.toggle("is-active", tab.getAttribute("data-tab") === "dash");
    });
  }

  function openStep(stepId) {
    if (!canOpenStep(stepId)) {
      showUnlockHint(stepId);
      return;
    }
    if (store.confirmed.finish && stepId !== "finish") {
      unconfirmFinishSoft();
      store.finishLockedOnce = true;
    }
    if (store.uiMode === "self") {
      openSelfStep(stepId);
      return;
    }
    const flow = getFlowSteps();
    const idx = flow.findIndex((s) => s.id === stepId);
    if (idx < 0) return;
    showWizardStep(idx);
  }

  function setupExclusiveAccordions() {
    form.addEventListener("toggle", (e) => {
      const t = e.target;
      if (!(t instanceof HTMLDetailsElement)) return;
      if (!t.classList.contains("dash-block")) return;

      const stepId = t.getAttribute("data-step-id");

      if (store.uiMode === "self") {
        if (!t.open) {
          if (store.selfEditingStepId === stepId) {
            showSelfList();
          }
          return;
        }
        if (stepId && !canOpenStep(stepId)) {
          t.open = false;
          showUnlockHint(stepId);
          return;
        }
        if (store.selfEditingStepId !== stepId) {
          openSelfStep(stepId);
        }
        return;
      }

      if (!t.open) return;
      if (stepId && !canOpenStep(stepId)) {
        t.open = false;
        showUnlockHint(stepId);
        return;
      }
      form.querySelectorAll(":scope > details.dash-block").forEach((d) => {
        if (d !== t) d.open = false;
      });
    }, true);
  }

  function setupPreviewHits() {
    document.querySelectorAll("[data-open-step]").forEach((el) => {
      el.addEventListener("click", (e) => {
        const hit = e.target.closest("a[href], button, input, select, textarea, label");
        if (hit && hit !== el) return;
        e.preventDefault();
        e.stopPropagation();
        openStep(el.getAttribute("data-open-step"));
      });
    });
  }

  function setupPreviewSync() {
    document.querySelectorAll(".dash-block[data-preview-target]").forEach((block) => {
      const sel = block.getAttribute("data-preview-target");
      const summary = block.querySelector(":scope > summary");
      if (!summary) return;
      summary.addEventListener("click", () => {
        document.querySelectorAll(".dash-block").forEach((b) => b.classList.remove("is-active-step"));
        block.classList.add("is-active-step");
        window.setTimeout(() => scrollPreviewTo(sel), 30);
      });
    });
  }

  function setupViewport() {
    const minusBtn = document.getElementById("preview-width-minus");
    const plusBtn = document.getElementById("preview-width-plus");
    const deviceEl = document.getElementById("preview-width-device");
    const pxEl = document.getElementById("preview-width-px");
    if (!viewport || !minusBtn || !plusBtn) return;

    const WIDTH_STEPS = [
      { id: "phone", label: "スマホ", width: 390 },
      { id: "tablet", label: "タブレット", width: 768 },
      { id: "desktop", label: "PC", width: 1200 }
    ];
    let stepIndex = 1;

    function labelForWidth(w) {
      if (w <= 500) return "スマホ";
      if (w <= 900) return "タブレット";
      return "PC";
    }

    function apply() {
      const step = WIDTH_STEPS[stepIndex] || WIDTH_STEPS[WIDTH_STEPS.length - 1];
      const w = step.width;
      viewport.style.width = w + "px";
      viewport.style.maxWidth = w + "px";
      viewport.classList.toggle("is-phone", step.id === "phone");
      viewport.classList.toggle("is-mobile", step.id === "phone");
      viewport.classList.toggle("is-tablet", step.id === "tablet");
      viewport.classList.toggle("is-desktop", step.id === "desktop");
      if (deviceEl) deviceEl.textContent = labelForWidth(w);
      if (pxEl) pxEl.textContent = w + "px";
      minusBtn.disabled = stepIndex <= 0;
      plusBtn.disabled = stepIndex >= WIDTH_STEPS.length - 1;
    }

    function bump(delta) {
      const next = stepIndex + delta;
      if (next < 0 || next >= WIDTH_STEPS.length) return;
      stepIndex = next;
      apply();
    }

    minusBtn.addEventListener("click", () => bump(-1));
    plusBtn.addEventListener("click", () => bump(1));
    window.addEventListener("resize", apply);
    window.applyPreviewWidthFromPane = apply;
    window.setPreviewWidthStepById = function (id) {
      const idx = WIDTH_STEPS.findIndex((s) => s.id === id);
      if (idx < 0) return;
      stepIndex = idx;
      apply();
    };
    apply();
  }

  function setupSplitPane() {
    const split = document.getElementById("atelier-split");
    const handle = document.getElementById("split-handle");
    const shell = document.querySelector(".atelier-shell");
    if (!split || !handle) return;

    const KEY = "sample-1man-split-pct";
    const MIN = 28;
    const MAX = 72;
    let pct = 52;
    try {
      const saved = Number(localStorage.getItem(KEY));
      if (Number.isFinite(saved) && saved >= MIN && saved <= MAX) pct = saved;
    } catch (err) {
      /* ignore */
    }

    function setPct(next) {
      pct = Math.max(MIN, Math.min(MAX, next));
      const value = pct + "%";
      if (shell) shell.style.setProperty("--preview-pct", value);
      split.style.setProperty("--preview-pct", value);
      if (typeof window.applyPreviewWidthFromPane === "function") {
        window.applyPreviewWidthFromPane();
      }
    }

    function persist() {
      try {
        localStorage.setItem(KEY, String(Math.round(pct)));
      } catch (err) {
        /* ignore */
      }
    }

    setPct(pct);

    function clientToPct(clientX) {
      const rect = split.getBoundingClientRect();
      if (!rect.width) return pct;
      return ((clientX - rect.left) / rect.width) * 100;
    }

    function onMove(ev) {
      const point = ev.touches && ev.touches[0] ? ev.touches[0] : ev;
      setPct(clientToPct(point.clientX));
    }

    function onUp() {
      document.body.classList.remove("is-splitting");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
      persist();
      if (typeof window.applyPreviewWidthFromPane === "function") {
        window.applyPreviewWidthFromPane();
      }
    }

    function startDrag(ev) {
      if (window.matchMedia && window.matchMedia("(max-width: 860px)").matches) return;
      ev.preventDefault();
      document.body.classList.add("is-splitting");
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
      window.addEventListener("touchmove", onMove, { passive: false });
      window.addEventListener("touchend", onUp);
    }

    handle.addEventListener("pointerdown", startDrag);
    handle.addEventListener("keydown", (ev) => {
      if (ev.key === "ArrowLeft") {
        ev.preventDefault();
        setPct(pct - 2);
        persist();
      } else if (ev.key === "ArrowRight") {
        ev.preventDefault();
        setPct(pct + 2);
        persist();
      }
    });
  }

  function setupChromeCollapse() {
    const dash = document.getElementById("dash-pane");
    const progressBtn = document.getElementById("progress-toggle");
    const PROG_KEY = "sample-1man-progress-collapsed";

    function syncProgress(collapsed) {
      if (!dash || !progressBtn) return;
      dash.classList.toggle("is-progress-collapsed", collapsed);
      progressBtn.setAttribute("aria-expanded", collapsed ? "false" : "true");
      progressBtn.querySelectorAll("[data-progress-open]").forEach((el) => {
        el.hidden = collapsed;
      });
      progressBtn.querySelectorAll("[data-progress-closed]").forEach((el) => {
        el.hidden = !collapsed;
      });
    }

    let progressCollapsed = false;
    try {
      progressCollapsed = localStorage.getItem(PROG_KEY) === "1";
    } catch (err) {
      /* ignore */
    }

    syncProgress(progressCollapsed);

    if (progressBtn) {
      progressBtn.addEventListener("click", () => {
        progressCollapsed = !progressCollapsed;
        syncProgress(progressCollapsed);
        try {
          localStorage.setItem(PROG_KEY, progressCollapsed ? "1" : "0");
        } catch (err) {
          /* ignore */
        }
      });
    }
  }

  function setupAtelierMenu() {
    const menu = document.getElementById("atelier-menu");
    const openBtn = document.getElementById("atelier-menu-btn");
    const backdrop = document.getElementById("atelier-menu-backdrop");
    if (!menu || !openBtn) return;

    const purposeHost = document.getElementById("menu-purpose-host");
    const guideHost = document.getElementById("menu-guide-host");
    const layoutHost = document.getElementById("menu-layout-host");

    function fillMenuPurposeHost() {
      if (!purposeHost || purposeHost.dataset.filled) return;
      const options = [
        { value: "personal", label: "個人紹介", note: "講師・士業・フリーランスなど" },
        { value: "company", label: "会社・教室案内", note: "法人・教室・事務所など" },
        { value: "shop", label: "お店案内", note: "店舗・サロン・カフェなど" },
        { value: "works", label: "実績・事例中心", note: "施工例・制作物など" },
        { value: "service", label: "サービス・メニュー案内", note: "料金・コース・プラン" }
      ];
      const cur = store.sitePurpose || "";
      purposeHost.innerHTML =
        '<div class="mode-picker menu-inline-picker" role="radiogroup" aria-label="用途">' +
        options
          .map((opt) => {
            const on = opt.value === cur ? " is-selected" : "";
            return (
              '<button type="button" class="mode-option menu-direct-option' +
              on +
              '" data-set-purpose="' +
              opt.value +
              '"><span class="mode-option-body"><strong>' +
              opt.label +
              '</strong><span class="mode-option-note">' +
              opt.note +
              "</span></span></button>"
            );
          })
          .join("") +
        "</div>";
      purposeHost.dataset.filled = "1";
      purposeHost.querySelectorAll("[data-set-purpose]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const value = btn.getAttribute("data-set-purpose");
          const radio = form.querySelector('input[name="site_purpose"][value="' + value + '"]');
          if (radio) {
            radio.checked = true;
            radio.dispatchEvent(new Event("change", { bubbles: true }));
          } else {
            applySitePurpose(value);
            store.confirmed.purpose = true;
            store.snapshots.purpose = captureStepSnapshot("purpose");
            scheduleSave();
          }
          purposeHost.querySelectorAll("[data-set-purpose]").forEach((b) => {
            b.classList.toggle("is-selected", b === btn);
          });
          returnToLayoutHub();
        });
      });
    }

    function fillMenuGuideHost() {
      if (!guideHost || guideHost.dataset.filled) return;
      const options = [
        { value: "guided", label: "順番どおり（ガイド）", note: "色 → 画像 → 文字" },
        { value: "self", label: "自分のペース（セルフ）", note: "一覧から選ぶ" }
      ];
      const cur = store.uiMode || "guided";
      guideHost.innerHTML =
        '<div class="mode-picker menu-inline-picker" role="radiogroup" aria-label="進め方">' +
        options
          .map((opt) => {
            const on = opt.value === cur ? " is-selected" : "";
            return (
              '<button type="button" class="mode-option menu-direct-option' +
              on +
              '" data-set-guide="' +
              opt.value +
              '"><span class="mode-option-body"><strong>' +
              opt.label +
              '</strong><span class="mode-option-note">' +
              opt.note +
              "</span></span></button>"
            );
          })
          .join("") +
        "</div>";
      guideHost.dataset.filled = "1";
      guideHost.querySelectorAll("[data-set-guide]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const value = btn.getAttribute("data-set-guide");
          const radio = form.querySelector('input[name="ui_mode"][value="' + value + '"]');
          if (radio) {
            radio.checked = true;
            radio.dispatchEvent(new Event("change", { bubbles: true }));
          } else {
            store.uiMode = value;
            applyUiMode();
            store.confirmed.guide = true;
            store.snapshots.guide = captureStepSnapshot("guide");
            scheduleSave();
          }
          guideHost.querySelectorAll("[data-set-guide]").forEach((b) => {
            b.classList.toggle("is-selected", b === btn);
          });
          returnToLayoutHub();
        });
      });
    }

    function syncMenuPurposeSelected() {
      if (!purposeHost) return;
      const cur = store.sitePurpose || "";
      purposeHost.querySelectorAll("[data-set-purpose]").forEach((b) => {
        b.classList.toggle("is-selected", b.getAttribute("data-set-purpose") === cur);
      });
    }

    function syncMenuGuideSelected() {
      if (!guideHost) return;
      const cur = store.uiMode || "guided";
      guideHost.querySelectorAll("[data-set-guide]").forEach((b) => {
        b.classList.toggle("is-selected", b.getAttribute("data-set-guide") === cur);
      });
    }

    fillMenuPurposeHost();
    fillMenuGuideHost();
    if (layoutHost) {
      layoutHost.hidden = true;
    }

    function showStage(id) {
      menu.querySelectorAll("[data-menu-stage]").forEach((stage) => {
        const on = stage.getAttribute("data-menu-stage") === id;
        stage.hidden = !on;
        stage.classList.toggle("is-active", on);
      });
      if (id === "layout") renderLayoutArrangeWire();
      if (id === "purpose") syncMenuPurposeSelected();
      if (id === "guide") syncMenuGuideSelected();
    }

    function openMenu(stageId) {
      menu.hidden = false;
      window.requestAnimationFrame(() => menu.classList.add("is-open"));
      showStage(stageId || "root");
      openBtn.setAttribute("aria-expanded", "true");
    }

    function closeMenu() {
      menu.classList.remove("is-open");
      openBtn.setAttribute("aria-expanded", "false");
      window.setTimeout(() => {
        if (!menu.classList.contains("is-open")) menu.hidden = true;
        showStage("root");
      }, 220);
    }

    window.openAtelierMenu = openMenu;
    window.closeAtelierMenu = closeMenu;

    openBtn.addEventListener("click", () => openMenu("root"));
    if (backdrop) backdrop.addEventListener("click", closeMenu);
    menu.querySelectorAll("[data-menu-close]").forEach((btn) => {
      btn.addEventListener("click", closeMenu);
    });
    menu.querySelectorAll("[data-menu-back]").forEach((btn) => {
      btn.addEventListener("click", () => showStage("root"));
    });
    menu.querySelectorAll("[data-menu-open]").forEach((btn) => {
      btn.addEventListener("click", () => showStage(btn.getAttribute("data-menu-open")));
    });
    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape" && menu.classList.contains("is-open")) closeMenu();
    });

    form.querySelectorAll('input[name="site_purpose"]').forEach((input) => {
      input.addEventListener("change", () => {
        if (!input.checked) return;
        applySitePurpose(input.value);
        store.confirmed.purpose = true;
        store.snapshots.purpose = captureStepSnapshot("purpose");
        scheduleSave();
      });
    });
    form.querySelectorAll('input[name="ui_mode"]').forEach((input) => {
      input.addEventListener("change", () => {
        if (!input.checked) return;
        store.uiMode = input.value;
        applyUiMode();
        store.confirmed.guide = true;
        store.snapshots.guide = captureStepSnapshot("guide");
        const flow = getFlowSteps();
        showWizardStep(Math.min(store.wizardStepIndex, Math.max(flow.length - 1, 0)));
        scheduleSave();
      });
    });
  }

  function setupMobileTabs() {
    document.querySelectorAll(".atelier-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        const name = tab.getAttribute("data-tab");
        document.body.classList.toggle("show-preview", name === "preview");
        document.body.classList.toggle("show-dash", name === "dash");
        document.querySelectorAll(".atelier-tab").forEach((t) => t.classList.remove("is-active"));
        tab.classList.add("is-active");
        if (name === "preview") applyPendingPreviewScroll();
      });
    });
    document.body.classList.add("show-preview");
  }

  function collectAppliedColors() {
    const colors = { ...store.draftColors };
    colors.radius = fieldValue("radius") || colors.radius || DEFAULTS.radius;
    colors.headingScale = fieldValue("headingScale") || DEFAULTS.headingScale;
    colors.pageBgSoft = softFrom(colors.pageBg);
    colors.bodyMuted = softMuted(colors.bodyInk);
    return colors;
  }

  function collectSettings() {
    return {
      createdAt: new Date().toISOString(),
      plan: "1man-sample-atelier-confirm-v4",
      layoutPattern: store.layoutPattern,
      layoutOrder: normalizeLayoutOrder(store.layoutOrder),
      layoutLabel: layoutLabel(store.layoutPattern),
      sitePurpose: store.sitePurpose,
      draftColors: { ...store.draftColors },
      colorCodes: { ...store.colorCodes },
      colorModes: { ...store.colorModes },
      colors: collectAppliedColors(),
      counts: { ...store.draftCounts },
      confirmed: { ...store.confirmed },
      snapshots: store.snapshots,
      fonts: {
        display: fieldValue("font_display"),
        catch: fieldValue("font_catch"),
        body: fieldValue("font_body"),
        wishTarget: fieldValue("font_wish_target"),
        wishName: fieldValue("font_wish_name")
      },
      extras: {
        hours: !!(document.querySelector('[data-extra-toggle="hours"]') || {}).checked,
        access: !!(document.querySelector('[data-extra-toggle="access"]') || {}).checked,
        address: !!(document.querySelector('[data-extra-toggle="address"]') || {}).checked
      },
      fields: formToObject(),
      note: "画像ファイルはZIPに含みますが、ブラウザ下書きには保存されません。"
    };
  }

  function scheduleSave() {
    if (suppressSave) return;
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(saveDraft, 300);
  }

  function saveDraft() {
    try {
      const payload = {
        version: 15,
        savedAt: new Date().toISOString(),
        wizardStepIndex: store.wizardStepIndex,
        selfEditingStepId: store.selfEditingStepId,
        uiMode: store.uiMode,
        sitePurpose: store.sitePurpose,
        layoutPattern: store.layoutPattern,
        layoutOrder: normalizeLayoutOrder(store.layoutOrder),
        layoutSelected: !!store.layoutSelected,
        layoutSchema: 2,
        finishLockedOnce: store.finishLockedOnce,
        guidedImageUnlocked: store.guidedImageUnlocked,
        guidedTextUnlocked: store.guidedTextUnlocked,
        presetChosen: store.presetChosen,
        chosenPresetKey: store.chosenPresetKey,
        vibeColors: store.vibeColors,
        vibeReasons: store.vibeReasons,
        vibeText: store.vibeText,
        intakeDone: store.intakeDone,
        siteColorMode: store.siteColorMode,
        slotGradients: store.slotGradients || {},
        slotGradientPartners: store.slotGradientPartners || {},
        randomHistory: store.randomHistory,
        guidedColorPhase: store.guidedColorPhase,
        guidedColorReturnPreset: store.guidedColorReturnPreset,
        guidedColorEditStepId: store.guidedColorEditStepId,
        guidedColorDeckIdx: store.guidedColorDeckIdx,
        guidedColorDeck: store.guidedColorDeck.slice(-40),
        guidedColorTrial: store.guidedColorTrial,
        draftColors: store.draftColors,
        colorCodes: store.colorCodes,
        colorModes: store.colorModes,
        draftCounts: store.draftCounts,
        draftExtras: {
          hours: !!(document.querySelector('[data-extra-toggle="hours"]') || {}).checked,
          access: !!(document.querySelector('[data-extra-toggle="access"]') || {}).checked,
          address: !!(document.querySelector('[data-extra-toggle="address"]') || {}).checked
        },
        draftContact: { ...store.draftContact },
        confirmed: store.confirmed,
        snapshots: store.snapshots,
        fields: formToObject()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      /* ignore quota */
    }
  }

  function loadDraft() {
    try {
      let raw = localStorage.getItem(STORAGE_KEY);
      let fromLegacyKey = false;
      if (!raw) {
        raw = localStorage.getItem("sample-1man-order-v21");
        fromLegacyKey = !!raw;
      }
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (!data || (data.version !== 10 && data.version !== 11 && data.version !== 12 && data.version !== 13 && data.version !== 14 && data.version !== 15)) return false;
      suppressSave = true;
      if (data.layoutPattern) {
        store.layoutPattern = migrateLayoutPattern(
          data.layoutPattern,
          fromLegacyKey ? 1 : data.layoutSchema
        );
      }
      if (data.layoutOrder) {
        store.layoutOrder = normalizeLayoutOrder(data.layoutOrder);
      }
      if (data.layoutSelected != null) {
        store.layoutSelected = !!data.layoutSelected;
      } else if (data.layoutPattern) {
        store.layoutSelected = true;
      }
      if (data.finishLockedOnce != null) store.finishLockedOnce = !!data.finishLockedOnce;
      if (data.draftColors) Object.assign(store.draftColors, data.draftColors);
      if (data.colorCodes) {
        SWATCH_KEYS.forEach((key) => {
          if (data.colorCodes[key] != null) store.colorCodes[key] = String(data.colorCodes[key]);
        });
      }
      if (data.colorModes) {
        SWATCH_KEYS.forEach((key) => {
          store.colorModes[key] = data.colorModes[key] === "code" ? "code" : "pick";
        });
      } else if (data.colorCodes) {
        SWATCH_KEYS.forEach((key) => {
          if (String(data.colorCodes[key] || "").trim()) store.colorModes[key] = "code";
        });
      }
      if (data.wizardStepIndex != null) store.wizardStepIndex = data.wizardStepIndex;
      if (data.uiMode) {
        store.uiMode = data.uiMode;
        const radio = form.querySelector('input[name="ui_mode"][value="' + data.uiMode + '"]');
        if (radio) radio.checked = true;
      }
      if (data.intakeDone != null) store.intakeDone = !!data.intakeDone;
      else if (data.uiMode || data.sitePurpose) store.intakeDone = true;
      if (data.siteColorMode === "detail" || data.siteColorMode === "easy") {
        store.siteColorMode = data.siteColorMode;
      }
      if (data.slotGradients && typeof data.slotGradients === "object") {
        store.slotGradients = data.slotGradients;
      }
      if (data.slotGradientPartners && typeof data.slotGradientPartners === "object") {
        store.slotGradientPartners = data.slotGradientPartners;
      } else if (data.gradientPartnerHex) {
        // 旧・全体1色の相手色 → 各枠へ仮コピー
        store.slotGradientPartners = {};
        GUIDED_COLOR_TUNE_IDS.forEach((id) => {
          const key = primaryColorKeyForStep(id);
          if (GRADIENT_BG_KEYS.has(key)) store.slotGradientPartners[id] = String(data.gradientPartnerHex);
        });
      }
      syncSiteColorModeUi();
      if (data.sitePurpose && PURPOSE_PACKS[data.sitePurpose]) {
        store.sitePurpose = data.sitePurpose;
        const purposeRadio = form.querySelector('input[name="site_purpose"][value="' + data.sitePurpose + '"]');
        if (purposeRadio) purposeRadio.checked = true;
      } else if (data.fields && data.fields.site_purpose && PURPOSE_PACKS[data.fields.site_purpose]) {
        store.sitePurpose = data.fields.site_purpose;
        const purposeRadio = form.querySelector(
          'input[name="site_purpose"][value="' + data.fields.site_purpose + '"]'
        );
        if (purposeRadio) purposeRadio.checked = true;
      }
      if (data.guidedImageUnlocked != null) store.guidedImageUnlocked = !!data.guidedImageUnlocked;
      if (data.guidedTextUnlocked != null) store.guidedTextUnlocked = !!data.guidedTextUnlocked;
      if (store.guidedTextUnlocked && !store.guidedImageUnlocked) {
        store.guidedImageUnlocked = true;
      }
      if (data.presetChosen != null) store.presetChosen = !!data.presetChosen;
      if (data.chosenPresetKey != null) store.chosenPresetKey = data.chosenPresetKey;
      if (data.vibeColors) store.vibeColors = data.vibeColors;
      if (Array.isArray(data.vibeReasons)) store.vibeReasons = data.vibeReasons;
      if (data.vibeText != null) store.vibeText = String(data.vibeText);
      if (Array.isArray(data.randomHistory)) store.randomHistory = data.randomHistory.slice(0, 2);
      if (data.guidedColorPhase != null) store.guidedColorPhase = data.guidedColorPhase;
      if (data.guidedColorReturnPreset != null) {
        store.guidedColorReturnPreset = !!data.guidedColorReturnPreset;
      }
      if (data.guidedColorEditStepId != null) {
        store.guidedColorEditStepId = data.guidedColorEditStepId;
      }
      if (Array.isArray(data.guidedColorDeck)) store.guidedColorDeck = data.guidedColorDeck;
      if (data.guidedColorDeckIdx != null) store.guidedColorDeckIdx = data.guidedColorDeckIdx;
      if (data.guidedColorTrial) {
        store.guidedColorTrial = Object.assign(
          {
            prevHex: null,
            slotHistory: [],
            slotHistoryIdx: -1
          },
          data.guidedColorTrial
        );
      }
      if (data.draftCounts) Object.assign(store.draftCounts, data.draftCounts);
      if (data.confirmed) {
        Object.assign(store.confirmed, data.confirmed);
        if (data.confirmed["global-chrome"]) {
          store.confirmed["global-chrome-bg"] = true;
          store.confirmed["global-chrome-ink"] = true;
          delete store.confirmed["global-chrome"];
        }
        if (store.confirmed.guide && !store.confirmed.purpose) {
          const hasPurpose =
            !!(data.sitePurpose && PURPOSE_PACKS[data.sitePurpose]) ||
            !!(data.fields && data.fields.site_purpose && PURPOSE_PACKS[data.fields.site_purpose]);
          if (hasPurpose) store.confirmed.purpose = true;
        }
        if (!store.confirmed.layout && (store.confirmed.guide || store.layoutSelected)) {
          store.confirmed.layout = true;
          store.layoutSelected = true;
        }
      }
      if (data.selfEditingStepId != null) {
        store.selfEditingStepId = data.selfEditingStepId;
      } else if (data.uiMode === "self") {
        if (!store.confirmed.purpose) store.selfEditingStepId = "purpose";
        else if (!store.confirmed.layout) store.selfEditingStepId = "layout";
        else if (!store.confirmed.guide) store.selfEditingStepId = "guide";
        else store.selfEditingStepId = null;
      }
      if (data.snapshots) store.snapshots = data.snapshots;
      if (data.fields) applyFormObject(data.fields);
      if (data.draftExtras) {
        const migrated = { ...data.draftExtras };
        if (migrated.address == null && migrated.map != null) migrated.address = !!migrated.map;
        delete migrated.map;
        store.draftExtras = { hours: false, access: false, address: true, ...migrated };
        ["hours", "access", "address"].forEach((key) => {
          const input = document.querySelector('[data-extra-toggle="' + key + '"]');
          if (input) input.checked = !!store.draftExtras[key];
        });
        syncExtraPanels();
      }
      if (data.draftContact) {
        store.draftContact = { label: true, note1: true, note2: true, ...data.draftContact };
        const labelCb = form.elements.namedItem("contact_show_label");
        const n1 = form.elements.namedItem("contact_show_note_1");
        const n2 = form.elements.namedItem("contact_show_note_2");
        if (labelCb) labelCb.checked = !!store.draftContact.label;
        if (n1) n1.checked = !!store.draftContact.note1;
        if (n2) n2.checked = !!store.draftContact.note2;
        syncContactPanels();
      }
      if (data.fields) {
        if (data.fields.headingScale) setFieldValue("headingScale", data.fields.headingScale);
        if (data.fields.radius) setFieldValue("radius", data.fields.radius);
        if (data.fields.font_display) setFieldValue("font_display", data.fields.font_display);
        if (data.fields.font_catch) setFieldValue("font_catch", data.fields.font_catch);
        if (data.fields.font_body) setFieldValue("font_body", data.fields.font_body);
        if (data.fields.brand_name) setFieldValue("brand_name", data.fields.brand_name);
      }
      fillFontPickers();
      syncFontPickers();
      syncHueSelectFromDraft();
      syncLogoModePanels();
      syncLogoPresentation();
      suppressSave = false;
      return true;
    } catch (e) {
      suppressSave = false;
      return false;
    }
  }

  async function runZipDownload() {
    const status = document.getElementById("zip-status");
    if (!window.JSZip) {
      if (status) status.textContent = "ZIP用ライブラリの読み込みに失敗しました。";
      return false;
    }
    const missingImgs = missingRequiredImages();
    if (missingImgs.length) {
      const tips = missingImgs.slice(0, 2).map(missingImageStepTip);
      const extra = missingImgs.length - tips.length;
      let label = tips.map((t) => "「" + t + "」").join("");
      if (extra > 0) label += "ほか" + extra + "件";
      if (status) {
        status.textContent =
          "写真が足りません（" + label + "）。進捗バーか見本サイトの番号から、該当の画像項目を開いてください。";
      }
      updateZipGate();
      return false;
    }

    const meta = collectSettings();
    meta.colorFinalAck = true;
    meta.freeRevisionNote = "作成後の無料修正は1回のみ";
    const zip = new JSZip();
    zip.file("order.json", JSON.stringify(meta, null, 2));

    const lines = [
      "1万円プラン 依頼内容（確定フロー試作）",
      "作成: " + meta.createdAt,
      "レイアウト: " + meta.layoutLabel,
      "用途: " + purposeLabel(meta.sitePurpose),
      "色（ライブ／ZIP時確認済み）: " + JSON.stringify(meta.draftColors),
      "指定カラーコード: " + JSON.stringify(meta.colorCodes),
      "色の指定モード: " + JSON.stringify(meta.colorModes),
      "件数: " + JSON.stringify(meta.counts),
      "書体: " + JSON.stringify(meta.fonts),
      "追加: " + JSON.stringify(meta.extras),
      "画像・文字の確定: " + JSON.stringify(meta.confirmed),
      "色最終確認: はい",
      "無料修正: 作成後1回のみ",
      "",
      "—— 入力欄 ——",
      ""
    ];
    Object.keys(meta.fields).forEach((key) => {
      lines.push(key + ": " + meta.fields[key]);
    });
    zip.file("order.txt", lines.join("\n"));

    const fileInputs = form.querySelectorAll('input[type="file"]');
    for (let i = 0; i < fileInputs.length; i += 1) {
      const input = fileInputs[i];
      const wrap = input.closest("[data-fill-for]");
      if (wrap && wrap.hidden) continue;
      const file = input.files && input.files[0];
      if (!file) continue;
      const buf = await file.arrayBuffer();
      zip.file("images/" + (input.name || "image") + "_" + file.name, buf);
    }

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "1man-order.zip";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    if (status) status.textContent = "保存しました。";
    showWizardFootPanel(
      "<p class=\"wizard-foot-panel-text\">保存しました。<strong>ご依頼の連絡先</strong>に ZIP を添付して送ってください。</p>" +
      "<button type=\"button\" class=\"wizard-btn\" data-panel-close>OK</button>"
    );
    const donePanel = document.getElementById("wizard-foot-panel");
    const doneClose = donePanel && donePanel.querySelector("[data-panel-close]");
    if (doneClose) doneClose.addEventListener("click", hideWizardFootPanel, { once: true });
    return true;
  }

  async function buildZip() {
    const status = document.getElementById("zip-status");
    const missingImgs = missingRequiredImages();
    if (missingImgs.length) {
      const tips = missingImgs.slice(0, 2).map(missingImageStepTip);
      const extra = missingImgs.length - tips.length;
      let label = tips.map((t) => "「" + t + "」").join("");
      if (extra > 0) label += "ほか" + extra + "件";
      if (status) {
        status.textContent =
          "写真が足りません（" + label + "）。進捗バーか見本サイトの番号から、該当の画像項目を開いてください。";
      }
      updateZipGate();
      return;
    }
    const missing = STEPS.filter((s) => !store.confirmed[s.id]);
    const missingBar = countUnconfirmedBarSteps();
    if (missing.length) {
      const zipStatus = document.getElementById("zip-status");
      if (missingBar.length) {
        const targetId = missingBar[0];
        if (zipStatus) zipStatus.textContent = "";
        setZipHighlightStep(targetId);
        showWizardFootPanel(
          "<p class=\"wizard-foot-panel-text\">まだ " +
            formatMissingStepList(missingBar, 3) +
            " が未完了です。上の進捗バーか一覧の項目を開き、「" +
            wizardPrimaryLabel() +
            "」で完了（緑）にしてください。</p>" +
          "<button type=\"button\" class=\"wizard-btn\" data-panel-close>OK</button>"
        );
        const panel = document.getElementById("wizard-foot-panel");
        const close = panel && panel.querySelector("[data-panel-close]");
        if (close) close.addEventListener("click", hideWizardFootPanel, { once: true });
        openStep(targetId);
        return;
      }
      if (!store.confirmed.finish || !validateFinish()) {
        if (zipStatus) zipStatus.textContent = "";
        showWizardFootPanel(
          "<p class=\"wizard-foot-panel-text\">先にチェックと「この内容でOK・ZIPを保存する」をしてください。</p>" +
          "<button type=\"button\" class=\"wizard-btn\" data-panel-close>OK</button>"
        );
        const panel = document.getElementById("wizard-foot-panel");
        const close = panel && panel.querySelector("[data-panel-close]");
        if (close) close.addEventListener("click", hideWizardFootPanel, { once: true });
        openStep("finish");
        return;
      }
      if (status) status.textContent = "";
      openStep(missing[0].id);
      return;
    }

    const proceed = await showContentConfirmPanel({
      title: "もう一度ZIPを保存しますか？",
      lead:
        "いまの見本どおりで、依頼ファイル（ZIP）をパソコンに保存します。保存＝送信ではありません。",
      okLabel: "ZIPを保存する"
    });
    if (!proceed) {
      if (status) status.textContent = "保存をやめました。";
      return;
    }
    await runZipDownload();
  }

  const zipBtn = document.getElementById("btn-zip");
  if (zipBtn) {
    zipBtn.addEventListener("click", () => {
      buildZip().catch(() => {
        const status = document.getElementById("zip-status");
        if (status) status.textContent = "依頼ファイルの作成に失敗しました。";
      });
    });
  }

  form.addEventListener("input", (e) => {
    if (e.target && !isFieldVisible(e.target)) return;
    if (e.target && e.target.name) syncCharCounter(e.target);
    updateFontPreview();
    scheduleSave();
  });
  form.addEventListener("change", () => {
    updateFontPreview();
    updateWizardUi();
    updateZipGate();
    scheduleSave();
  });

  function setupBadgeToggle() {
    const buttons = document.querySelectorAll("[data-badge-vis]");
    if (!buttons.length) return;
    const apply = (show) => {
      document.body.classList.toggle("hide-zone-badges", !show);
      buttons.forEach((b) => {
        const on = (b.getAttribute("data-badge-vis") === "on") === show;
        b.classList.toggle("is-on", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });
    };
    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        apply(btn.getAttribute("data-badge-vis") === "on");
      });
    });
    apply(false);
  }

  rememberImageDefaults();
  fillFontPickers();
  setupFontPickers();
  setupLogoModeUi();
  setupCharLimits();
  setupImageResize();
  buildSwatches();
  setupPresets();
  setupCounts();
  setupExtrasDraft();
  setupContactDraft();
  setupFontWishDraft();
  setupScopeChecks();
  setupConfirmButtons();
  setupPreviewSync();
  setupViewport();
  setupSplitPane();
  setupChromeCollapse();
  setupAtelierMenu();
  setupMobileTabs();
  setupExclusiveAccordions();
  setupPreviewHits();
  setupBadgeToggle();
  setupWizard();
  setupGuidedColorTrial();
  setupLayoutPicker();

  form.querySelectorAll(":scope > details.dash-block").forEach((d) => {
    d.open = false;
  });

  loadDraft();
  applyLayoutPattern(store.layoutPattern || "a", {
    silent: true,
    keepUnselected: !store.layoutSelected
  });
  updateFinishSummary();
  syncFontWishPanel();
  setupCharLimits();
  refreshColorUi();
  syncCountLabels();
  updateFontPreview();
  applyAllConfirmed();
  applyLiveColors(false);
  updateConfirmUi();
  updateRandomUndoUi();
  if (store.chosenPresetKey) {
    document.querySelectorAll("[data-preset]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.getAttribute("data-preset") === store.chosenPresetKey);
    });
  } else {
    document.querySelectorAll("[data-preset]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.getAttribute("data-preset") === "clinic");
    });
  }
  syncVibePresetButton();
  fillVibeReasonLists(store.vibeReasons);
  applyUiMode();
  restoreViewAfterMode();
  setupColorModeControls();
  setupEntryGate();
  openDraftNotice();
})();
