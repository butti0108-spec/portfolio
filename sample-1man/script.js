(() => {
  let openLayoutOmakaseNotice = function () {};
  const root = document.getElementById("preview-root");
  const viewport = document.getElementById("preview-viewport");
  const form = document.getElementById("order-form");
  if (!root || !form) return;

  const STORAGE_KEY = "sample-1man-order-v23";

  /* A=横長だけ／B=左右分割だけ／C=混合（旧: A小さい B混合 C横長） */
  const LAYOUT_META = {
    a: { code: "A", name: "横長", blurb: "横いっぱいの枠だけ" },
    b: { code: "B", name: "左右分割", blurb: "左右に割る枠だけ" },
    c: { code: "C", name: "混合", blurb: "横長と左右分割を混ぜる" }
  };
  const LAYOUT_IDS = Object.keys(LAYOUT_META);
  const LAYOUT_LEGACY = { e: "a", d: "a", f: "a" };

  const LAYOUT_BLOCKS = [
    {
      id: "hero",
      label: "キャッチ",
      selector: "#hero",
      links: [
        { step: "global-bg", kind: "color", label: "色" },
        { step: "hero-image", kind: "image", label: "画像" },
        { step: "hero-text", kind: "text", label: "文字" }
      ],
      counts: null
    },
    {
      id: "values",
      label: "メッセージ枠",
      selector: "#hero-values-block",
      links: [
        { step: "values-color", kind: "color", label: "色" },
        { step: "values-text", kind: "text", label: "文字" }
      ],
      counts: [{ id: "hero-values", label: "枚数" }]
    },
    {
      id: "accordions",
      label: "開く項目",
      selector: "#about",
      links: [
        { step: "about-text", kind: "text", label: "文字" }
      ],
      counts: [{ id: "about-accordions", label: "開く項目" }]
    },
    {
      id: "photos",
      label: "写真",
      selector: "#about-photos-block",
      links: [
        { step: "about-images", kind: "image", label: "画像" }
      ],
      counts: [{ id: "about-photos", label: "枚数" }]
    },
    {
      id: "works",
      label: "カード",
      selector: "#works",
      links: [
        { step: "works-images", kind: "image", label: "画像" },
        { step: "works-text", kind: "text", label: "文字" }
      ],
      counts: [{ id: "works-list", label: "枚数" }]
    },
    {
      id: "hours",
      label: "営業時間",
      selector: "#hours",
      links: [{ step: "hours-text", kind: "text", label: "文字" }],
      counts: null,
      extraKey: "hours"
    },
    {
      id: "access",
      label: "アクセス",
      selector: "#access",
      links: [{ step: "access-text", kind: "text", label: "文字" }],
      counts: null,
      extraKey: "access"
    },
    {
      id: "address",
      label: "住所",
      selector: "#address",
      links: [{ step: "address-text", kind: "text", label: "文字" }],
      counts: null,
      extraKey: "address"
    },
    {
      id: "announce",
      label: "案内",
      selector: "#announce",
      links: [
        { step: "announce-color", kind: "color", label: "色" },
        { step: "announce-text", kind: "text", label: "文字" }
      ],
      counts: null,
      extraKey: "announce"
    },
    {
      id: "contact",
      label: "ご連絡",
      selector: "#contact",
      links: [
        { step: "contact-color", kind: "color", label: "色" },
        { step: "contact-text", kind: "text", label: "文字" }
      ],
      counts: null
    }
  ];
  const LAYOUT_BLOCK_IDS = LAYOUT_BLOCKS.map((b) => b.id);

  /* やりたいことから：固定カタログ（意味検索ではない・文字一致の絞り込みのみ） */
  const HUB_TASKS = [
    {
      id: "color",
      kind: "color",
      label: "色を変える",
      note: "背景・枠などの色"
    },
    {
      id: "image",
      kind: "image",
      label: "画像を入れる・変える",
      note: "写真やカードの画像"
    },
    {
      id: "text",
      kind: "text",
      label: "文字を直す",
      note: "見出しや本文"
    }
  ];
  const LAYOUT_DEFAULT_ORDER = LAYOUT_BLOCK_IDS.slice();
  /* A=全部横長 / B=全部半幅 / C=キャッチ・ご連絡は長、真ん中は半幅 */
  const LAYOUT_SIZE_BY_SET = {
    a: {
      hero: "L",
      values: "L",
      accordions: "L",
      photos: "L",
      works: "L",
      hours: "L",
      access: "L",
      address: "L",
      announce: "L",
      contact: "L"
    },
    b: {
      hero: "H",
      values: "H",
      accordions: "H",
      photos: "H",
      works: "H",
      hours: "H",
      access: "H",
      address: "H",
      announce: "H",
      contact: "H"
    },
    c: {
      hero: "L",
      values: "H",
      accordions: "H",
      photos: "H",
      works: "H",
      hours: "H",
      access: "H",
      address: "H",
      announce: "H",
      contact: "L"
    }
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
      /* 旧「見本枠1」一体 → 開く項目＋写真 */
      if (id === "about") {
        ["accordions", "photos"].forEach((nid) => {
          if (LAYOUT_BLOCK_IDS.indexOf(nid) >= 0 && out.indexOf(nid) < 0) out.push(nid);
        });
        return;
      }
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

  /** 並び／ABCワイヤー用：実際に出ている枠だけ（追加OFFは除外） */
  function activeLayoutOrder(order) {
    return normalizeLayoutOrder(order).filter((id) => {
      const meta = LAYOUT_BLOCKS.find((b) => b.id === id);
      return isLayoutBlockActive(meta);
    });
  }

  /** カード用ミニワイヤーHTML（並び＝layoutOrder、形＝セットA/B/C） */
  function buildLayoutWireInnerHtml(setId, order, opts) {
    const ghost = opts && opts.ghost ? " lw-ghost" : "";
    const ids = activeLayoutOrder(order);
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
      /* 余り1個は半幅のまま（空マス付き）。ワイヤーだけ横長に見せない＝プレビューと一致 */
      html +=
        '<span class="lw-row lw-row--grow">' +
        cellHtml(pending, "H") +
        '<span class="lw lw-H lw-spacer" aria-hidden="true"></span>' +
        "</span>";
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
    const order = store.layoutOrder;
    document.querySelectorAll("[data-layout-wire]").forEach((host) => {
      const setId = normalizeLayoutId(host.getAttribute("data-layout-wire") || "a");
      const ghost = host.hasAttribute("data-layout-wire-ghost");
      host.innerHTML = buildLayoutWireInnerHtml(setId, order, { ghost: ghost });
    });
  }

  /** 各入力欄の最大文字数。100字か200字だけ */
  const FIELD_MAX = {
    brand_name: 100,
    font_wish_name: 100,
    hero_title: 100,
    hero_lead_1: 100,
    hero_lead_2: 100,
    hero_lead_3: 100,
    value_1_title: 100,
    value_1_text: 100,
    value_2_title: 100,
    value_2_text: 100,
    value_3_title: 100,
    value_3_text: 100,
    about_section_name: 100,
    about_heading: 100,
    about_name: 100,
    about_lead: 200,
    acc_1_title: 100,
    acc_1_body: 200,
    acc_2_title: 100,
    acc_2_body: 200,
    acc_3_title: 100,
    acc_3_body: 200,
    works_section_name: 100,
    works_heading: 100,
    works_lead: 100,
    work_1_title: 100,
    work_1_text: 100,
    work_2_title: 100,
    work_2_text: 100,
    work_3_title: 100,
    work_3_text: 100,
    contact_section_name: 100,
    contact_label: 100,
    contact_email: 100,
    contact_note_1: 100,
    contact_note_2: 100,
    hours_text: 100,
    announce_text: 100,
    announce_label: 100,
    announce_url: 200,
    access_text: 100,
    address_text: 100,
    extra_notes: 200,
    url_slug_wish: 100,
    work_1_url: 200,
    work_1_link_label: 100,
    work_2_url: 200,
    work_2_link_label: 100,
    work_3_url: 200,
    work_3_link_label: 100
  };

  const IMAGE_EDGE = {
    hero_image: 1920,
    logo_image: 800,
    default: 1600
  };

  /* 色番号は見本サイトの上→下・左→右（ヘッダー／フッターは背景→文字の2工程）。0は章の注意（注文画面のみ） */
  const STEPS = [
    { id: "easy-basics", label: "記載項目", needsConfirm: true, num: 0 },
    { id: "easy-site-name", label: "名前", needsConfirm: true, num: 0 },
    { id: "easy-color", label: "配色", needsConfirm: true, num: 0 },
    { id: "easy-catch", label: "キャッチ", needsConfirm: true, num: 0 },
    { id: "easy-color-stage", label: "色調整", needsConfirm: true, num: 0 },
    { id: "easy-copy-path", label: "文章の決め方", needsConfirm: true, num: 0 },
    { id: "easy-copy-dirs", label: "どの言葉を使いますか", needsConfirm: true, num: 0 },
    { id: "easy-copy-omakase", label: "文章", needsConfirm: true, num: 0 },
    { id: "easy-copy-frame", label: "枠の文章", needsConfirm: true, num: 0 },
    { id: "easy-sec-hero", label: "キャッチ文", needsConfirm: true, num: 0 },
    { id: "easy-sec-about", label: "紹介文", needsConfirm: true, num: 0 },
    { id: "easy-sec-works", label: "おすすめ文", needsConfirm: true, num: 0 },
    { id: "easy-sec-contact", label: "連絡文", needsConfirm: true, num: 0 },
    { id: "easy-img-path", label: "画像の決め方", needsConfirm: true, num: 0 },
    { id: "easy-img-omakase", label: "ランダム選択", needsConfirm: true, num: 0 },
    { id: "easy-img-wire", label: "画像", needsConfirm: true, num: 0 },
    { id: "easy-loading", label: "作成中", needsConfirm: false, num: 0 },
    { id: "easy-done", label: "完成", needsConfirm: false, num: 0 },
    { id: "purpose", label: "用途", needsConfirm: true, num: 0 },
    { id: "layout", label: "レイアウト", needsConfirm: true, num: 0 },
    { id: "guide", label: "進め方", needsConfirm: true, num: 0 },
    { id: "global-preset", label: "プリセット", needsConfirm: true, num: 1 },
    { id: "global-chrome-bg", label: "ヘッダー背景", needsConfirm: true, num: 2 },
    { id: "global-chrome-ink", label: "ヘッダー文字", needsConfirm: true, num: 3 },
    { id: "global-bg", label: "背景", needsConfirm: true, num: 4 },
    { id: "hero-color", label: "キャッチ色", needsConfirm: true, num: 5 },
    { id: "values-color", label: "メッセージ枠色", needsConfirm: true, num: 6 },
    { id: "global-body", label: "本文", needsConfirm: true, num: 7 },
    { id: "global-accent", label: "アクセント", needsConfirm: true, num: 8 },
    { id: "global-card", label: "カード・角", needsConfirm: true, num: 9 },
    { id: "contact-color", label: "ご連絡色", needsConfirm: true, num: 10 },
    { id: "hero-image", label: "キャッチ画像", needsConfirm: true, num: 11 },
    { id: "about-images", label: "写真", needsConfirm: true, num: 12 },
    { id: "works-images", label: "カード画像", needsConfirm: true, num: 13 },
    { id: "logo-text", label: "ロゴ", needsConfirm: true, num: 14 },
    { id: "site-fonts", label: "書体", needsConfirm: true, num: 15 },
    { id: "hero-text", label: "キャッチ文", needsConfirm: true, num: 17 },
    { id: "values-text", label: "メッセージ枠", needsConfirm: true, num: 18 },
    { id: "about-text", label: "開く項目", needsConfirm: true, num: 20 },
    { id: "works-text", label: "カード", needsConfirm: true, num: 21 },
    { id: "hours-text", label: "営業時間", needsConfirm: true, num: 22 },
    { id: "access-text", label: "アクセス", needsConfirm: true, num: 22 },
    { id: "address-text", label: "住所", needsConfirm: true, num: 22 },
    { id: "contact-text", label: "ご連絡文", needsConfirm: true, num: 23 },
    { id: "finish", label: "提出", needsConfirm: true, num: 24 }
  ];

  const IMAGE_STEP_IDS = new Set([
    "hero-image",
    "about-images",
    "works-images"
  ]);

  const FONT_STEP_ID = "site-fonts";
  const LEGACY_FONT_STEP_IDS = ["heading-font", "catch-font", "body-font"];
  const EASY_FIXED_FONTS = {
    font_display: "Shippori Mincho",
    font_catch: "Shippori Mincho",
    font_body: "Zen Kaku Gothic New"
  };

  const TEXT_STEP_IDS = new Set([
    "logo-text",
    "site-fonts",
    "hero-text",
    "values-text",
    "about-text",
    "works-text",
    "hours-text",
    "access-text",
    "address-text",
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
    "values-color": { kind: "color", displayNum: 6, label: "メッセージ枠色" },
    "global-body": { kind: "color", displayNum: 7, label: "本文色" },
    "global-accent": { kind: "color", displayNum: 8, label: "アクセント" },
    "global-card": { kind: "color", displayNum: 9, label: "カード" },
    "contact-color": { kind: "color", displayNum: 10, label: "ご連絡色" },
    "hero-image": { kind: "image", displayNum: 1, label: "キャッチ画像" },
    "about-images": { kind: "image", displayNum: 2, label: "写真" },
    "works-images": { kind: "image", displayNum: 3, label: "カード画像" },
    "logo-text": { kind: "text", displayNum: 1, label: "ロゴ" },
    "site-fonts": { kind: "text", displayNum: 2, label: "書体" },
    "hero-text": { kind: "text", displayNum: 4, label: "キャッチ文" },
    "values-text": { kind: "text", displayNum: 5, label: "メッセージ枠文" },
    "about-text": { kind: "text", displayNum: 7, label: "開く項目" },
    "works-text": { kind: "text", displayNum: 8, label: "カード" },
    "hours-text": { kind: "text", displayNum: 9, label: "営業時間" },
    "access-text": { kind: "text", displayNum: 9, label: "アクセス" },
    "address-text": { kind: "text", displayNum: 9, label: "住所" },
    "contact-text": { kind: "text", displayNum: 10, label: "ご連絡文" },
    "finish": { kind: "text", displayNum: 11, label: "提出" }
  };

  /** 用途パック：テンプレではなく「何を書くか／埋まった見栄え」用の仮文 */
  const PURPOSE_PACKS = {
    personal: {
      counts: { "hero-leads": 1, "hero-values": 1, "about-accordions": 1, "works-list": 1 },
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
      counts: { "hero-leads": 1, "hero-values": 1, "about-accordions": 1, "works-list": 1 },
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
      counts: { "hero-leads": 1, "hero-values": 1, "about-accordions": 1, "works-list": 1 },
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
      counts: { "hero-leads": 1, "hero-values": 1, "about-accordions": 1, "works-list": 1 },
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
      counts: { "hero-leads": 1, "hero-values": 1, "about-accordions": 1, "works-list": 1 },
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
      if (stepId === "purpose") return "用途";
      if (stepId === "layout") return "レイアウト";
      if (stepId === "guide") return "進め方";
      return stepId;
    }
    return meta.label;
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
      return store.confirmed.purpose ? "用途（完了）" : "用途";
    }
    if (stepId === "layout") {
      return store.confirmed.layout ? "レイアウト（完了）" : "レイアウト";
    }
    if (stepId === "guide") {
      return store.confirmed.guide ? "進め方（完了）" : "進め方";
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

  function setHoverTip(el, text) {
    if (!el) return;
    if (!text) {
      el.removeAttribute("data-tip");
      el.removeAttribute("title");
      el.classList.remove("has-hover-tip");
      return;
    }
    el.setAttribute("data-tip", text);
    el.removeAttribute("title");
    el.classList.add("has-hover-tip");
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
      const short =
        meta.kind === "color" ? "色" : meta.kind === "image" ? "画" : "文";
      btn.textContent = short;
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
    clinic: "紺",
    green: "緑",
    cafe: "ベージュ",
    ink: "墨",
    brick: "オレンジ",
    sakura: "ピンク"
  };
  const DETAIL_PRESET_LABELS = {
    clinic: "紺",
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

  const EASY_FLOW_STEP_IDS = [
    "easy-basics",
    "easy-color",
    "easy-catch",
    "easy-site-name",
    "easy-img-path",
    "easy-img-omakase",
    "easy-img-wire",
    "easy-copy-path",
    "easy-copy-dirs",
    "easy-copy-omakase",
    "easy-copy-frame",
    "easy-color-stage",
    "easy-loading",
    "easy-done"
  ];
  const EASY_FLOW_STEP_SET = new Set([
    "easy-basics",
    "easy-site-name",
    "easy-color",
    "easy-catch",
    "easy-color-stage",
    "easy-copy-path",
    "easy-copy-dirs",
    "easy-copy-omakase",
    "easy-copy-frame",
    "easy-sec-hero",
    "easy-sec-about",
    "easy-sec-works",
    "easy-sec-contact",
    "easy-img-path",
    "easy-img-omakase",
    "easy-img-wire",
    "easy-loading",
    "easy-done"
  ]);
  const SAMPLE_SEC_STEP_IDS = ["easy-sec-hero", "easy-sec-about", "easy-sec-works", "easy-sec-contact"];
  const SAMPLE_SEC_ID_FROM_STEP = {
    "easy-sec-hero": "hero",
    "easy-sec-about": "about",
    "easy-sec-works": "works",
    "easy-sec-contact": "contact"
  };
  const COPY_FRAME_ORDER = ["hero", "about", "works", "contact"];
  const COPY_FRAME_LABEL = {
    hero: "キャッチ",
    about: "紹介",
    works: "おすすめ",
    contact: "ご連絡"
  };
  const IMG_OMAKASE_SLOTS = [
    { key: "hero", input: "hero_image", label: "キャッチ", prefer: "wide" },
    { key: "about", input: "about_image_1", label: "写真", prefer: "square" },
    { key: "works", input: "work_1_image", label: "カード", prefer: "square" }
  ];
  const HUB_IMG_STEP_IDS = ["hero-image", "about-images", "works-images"];
  let photoCatalogCache = null;
  const COPY_FRAME_PREVIEW = {
    hero: "#hero",
    about: "#about",
    works: "#works",
    contact: "#contact"
  };
  const COPY_DIR_GROUPS = [
    {
      id: "taste",
      label: "お好み",
      options: [
        { id: "calm", label: "落ち着き" },
        { id: "bright", label: "明るさ" },
        { id: "refined", label: "きれいめ" },
        { id: "casual", label: "気軽さ" },
        { id: "craft", label: "こだわり" },
        { id: "warm", label: "あたたかさ" }
      ]
    },
    {
      id: "message",
      label: "伝えたいこと",
      options: [
        { id: "quality", label: "品質" },
        { id: "space", label: "空間" },
        { id: "care", label: "接客" },
        { id: "access", label: "通いやすさ" },
        { id: "menu", label: "品揃え" },
        { id: "story", label: "ストーリー" }
      ]
    },
    {
      id: "value",
      label: "大事にしたいこと",
      options: [
        { id: "local", label: "近所の人" },
        { id: "first", label: "初めての人" },
        { id: "picky", label: "こだわる人" },
        { id: "with", label: "だれかと" },
        { id: "solo", label: "ひとりで" },
        { id: "repeat", label: "通い続け" }
      ]
    }
  ];
  /* COPY_STUB_POOL は辞典接続後に撤去。フォールバックは fallbackStubThree */
  const EASY_IMG_FIELD = {
    "easy-img-wire": "hero_image"
  };
  const EASY_IMG_FOCUS = {
    "easy-img-wire": "hero"
  };
  let easyLoadingTimer = null;
  let easyLoadingMsgTimer = null;
  let placeMarkOn = true;

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
    "contact-color": ["contactBg", "contactInk"],
    "announce-color": ["announceBg"]
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

  const ITEM_LAYOUT_IDS = ["about-photos", "works-list"];
  const ITEM_SLOT_IDS = {
    "about-photos": ["about_image_1", "about_image_2", "about_image_3", "about_image_4"],
    "works-list": ["work_1", "work_2", "work_3"]
  };
  const ITEM_GAP_STEPS = ["tight", "normal", "loose"];
  const ITEM_GAP_LABELS = { tight: "狭い", normal: "ふつう", loose: "広い" };
  const ITEM_FOCAL_STEP = 5;
  const ITEM_FOCAL_DEFAULT = 50;
  const IMAGE_SCALE_MIN = 100;
  const IMAGE_SCALE_MAX = 200;
  const IMAGE_SCALE_STEP = 1;
  const IMAGE_SCALE_DEFAULT = 100;
  /** キャッチ写真の既定＝従来 CSS の center top に合わせる */
  const HERO_FOCAL_X_DEFAULT = 50;
  const HERO_FOCAL_Y_DEFAULT = 0;
  const LAYOUT_UNDO_MAX = 40;

  function normalizeItemSizeToken(s) {
    return s === "H" || s === "h" || s === "half" || s === "row" ? "H" : "L";
  }

  function normalizeFocalPercent(v, fallback) {
    const fb = Number.isFinite(Number(fallback)) ? Number(fallback) : ITEM_FOCAL_DEFAULT;
    const n = Number(v);
    if (!Number.isFinite(n)) return fb;
    const stepped = Math.round(n / ITEM_FOCAL_STEP) * ITEM_FOCAL_STEP;
    return Math.max(0, Math.min(100, stepped));
  }

  function normalizeFocalY(v) {
    return normalizeFocalPercent(v, ITEM_FOCAL_DEFAULT);
  }

  function normalizeFocalX(v) {
    return normalizeFocalPercent(v, ITEM_FOCAL_DEFAULT);
  }

  function normalizeFocalYsArray(focalYs, count) {
    const n = Math.max(0, Number(count) || 0);
    const out = Array.isArray(focalYs) ? focalYs.map(normalizeFocalY) : [];
    while (out.length < n) out.push(ITEM_FOCAL_DEFAULT);
    if (out.length > n) out.length = n;
    return out;
  }

  function normalizeFocalXsArray(focalXs, count) {
    const n = Math.max(0, Number(count) || 0);
    const out = Array.isArray(focalXs) ? focalXs.map(normalizeFocalX) : [];
    while (out.length < n) out.push(ITEM_FOCAL_DEFAULT);
    if (out.length > n) out.length = n;
    return out;
  }

  function normalizeGrowDirsArray(growDirs) {
    if (!Array.isArray(growDirs)) return [];
    return growDirs.map((d) => (d === "down" ? "down" : "row"));
  }

  /** 末尾が一段に1つだけの H なら L へ */
  function fixOrphanTrailingH(sizes) {
    const out = (sizes || []).map(normalizeItemSizeToken);
    if (!out.length) return out;
    let pendingH = 0;
    out.forEach((sz) => {
      if (sz === "L") pendingH = 0;
      else pendingH = pendingH === 1 ? 0 : 1;
    });
    if (pendingH === 1 && out[out.length - 1] === "H") {
      out[out.length - 1] = "L";
    }
    return out;
  }

  function sizesFromLegacyGrowDirs(growDirs, count) {
    const n = Math.max(0, Number(count) || 0);
    if (n <= 0) return [];
    if (n === 1) return ["L"];
    const dirs = normalizeGrowDirsArray(growDirs);
    if (!dirs.length || dirs.every((d) => d === "down")) {
      return Array.from({ length: n }, () => "L");
    }
    return fixOrphanTrailingH(Array.from({ length: n }, () => "H"));
  }

  function normalizeSizesArray(sizes, count, growDirs) {
    const n = Math.max(0, Number(count) || 0);
    let out = Array.isArray(sizes) ? sizes.map(normalizeItemSizeToken) : [];
    if ((!out.length || out.every((s) => s == null)) && growDirs && growDirs.length) {
      out = sizesFromLegacyGrowDirs(growDirs, n);
    }
    while (out.length < n) out.push("L");
    if (out.length > n) out.length = n;
    if (n === 1) out[0] = "L";
    return fixOrphanTrailingH(out);
  }

  function itemSlotImageName(slotId) {
    const work = /^work_(\d+)$/.exec(String(slotId || ""));
    if (work) return "work_" + work[1] + "_image";
    return String(slotId || "");
  }

  function layoutByIdFromSource(countId, src) {
    const slots = ITEM_SLOT_IDS[countId] || [];
    const sizeById = {};
    const focalXById = {};
    const focalYById = {};
    const scaleById = {};
    slots.forEach((slot) => {
      sizeById[slot] = "L";
      focalXById[slot] = ITEM_FOCAL_DEFAULT;
      focalYById[slot] = ITEM_FOCAL_DEFAULT;
      scaleById[slot] = IMAGE_SCALE_DEFAULT;
    });
    const gap = src && ITEM_GAP_STEPS.indexOf(src.gap) >= 0 ? src.gap : "normal";
    const hasIdMap = src && src.sizeById && typeof src.sizeById === "object" && !Array.isArray(src.sizeById);
    if (hasIdMap) {
      slots.forEach((slot) => {
        if (src.sizeById[slot] != null) sizeById[slot] = normalizeItemSizeToken(src.sizeById[slot]);
        if (src.focalXById && src.focalXById[slot] != null) {
          focalXById[slot] = normalizeFocalX(src.focalXById[slot]);
        }
        if (src.focalYById && src.focalYById[slot] != null) {
          focalYById[slot] = normalizeFocalY(src.focalYById[slot]);
        }
        if (src.scaleById && src.scaleById[slot] != null) {
          scaleById[slot] = normalizeImageScale(src.scaleById[slot]);
        }
      });
    } else if (src) {
      const rawSizes = Array.isArray(src.sizes) ? src.sizes : [];
      const rawX = Array.isArray(src.focalXs) ? src.focalXs : [];
      const rawY = Array.isArray(src.focalYs) ? src.focalYs : [];
      const growDirs = normalizeGrowDirsArray(src.growDirs);
      let legacySizes = rawSizes.map(normalizeItemSizeToken);
      if ((!legacySizes.length || legacySizes.every((s) => s == null)) && growDirs.length) {
        legacySizes = sizesFromLegacyGrowDirs(growDirs, Math.max(legacySizes.length, Number(store.draftCounts[countId] || 1)));
      }
      slots.forEach((slot, i) => {
        if (legacySizes[i] != null) sizeById[slot] = normalizeItemSizeToken(legacySizes[i]);
        if (rawX[i] != null) focalXById[slot] = normalizeFocalX(rawX[i]);
        if (rawY[i] != null) focalYById[slot] = normalizeFocalY(rawY[i]);
      });
    }
    return {
      gap: gap,
      growDirs: [],
      sizeById: sizeById,
      focalXById: focalXById,
      focalYById: focalYById,
      scaleById: scaleById
    };
  }

  function parseItemLayoutSource(countId, src) {
    return layoutByIdFromSource(countId, src);
  }

  function defaultItemLayouts() {
    return Object.fromEntries(
      ITEM_LAYOUT_IDS.map((id) => [id, layoutByIdFromSource(id, null)])
    );
  }

  function normalizeItemLayout(id) {
    if (ITEM_LAYOUT_IDS.indexOf(id) < 0) return null;
    if (!store.itemLayouts || typeof store.itemLayouts !== "object") {
      store.itemLayouts = defaultItemLayouts();
    }
    const current = store.itemLayouts[id];
    const already =
      current && current.sizeById && typeof current.sizeById === "object" && !Array.isArray(current.sizeById);
    store.itemLayouts[id] = layoutByIdFromSource(id, already ? current : current || null);
    return store.itemLayouts[id];
  }

  function smallestUnusedSlot(countId) {
    const slots = ITEM_SLOT_IDS[countId] || [];
    const used = {};
    const order = (store.itemOrders && store.itemOrders[countId]) || [];
    const parked = (store.itemOrderParked && store.itemOrderParked[countId]) || [];
    order.forEach((slot) => {
      used[slot] = 1;
    });
    parked.forEach((slot) => {
      used[slot] = 1;
    });
    for (let i = 0; i < slots.length; i += 1) {
      if (!used[slots[i]]) return slots[i];
    }
    return null;
  }

  function seedItemOrder(countId) {
    if (!ITEM_SLOT_IDS[countId]) return;
    if (!store.itemOrders || typeof store.itemOrders !== "object") store.itemOrders = {};
    if (!store.itemOrderParked || typeof store.itemOrderParked !== "object") store.itemOrderParked = {};
    const slots = ITEM_SLOT_IDS[countId];
    const meta = COUNT_META[countId] || { min: 1, max: slots.length, defaultCount: 1 };
    const known = {};
    slots.forEach((slot) => {
      known[slot] = 1;
    });
    if (!Array.isArray(store.itemOrders[countId])) {
      const n = Math.max(
        meta.min,
        Math.min(meta.max, Number(store.draftCounts[countId] || meta.defaultCount || 1))
      );
      store.itemOrders[countId] = slots.slice(0, n);
      store.itemOrderParked[countId] = [];
      store.draftCounts[countId] = store.itemOrders[countId].length;
      return;
    }
    const seen = {};
    store.itemOrders[countId] = store.itemOrders[countId].filter((slot) => {
      if (!known[slot] || seen[slot]) return false;
      seen[slot] = 1;
      return true;
    });
    const parkedSrc = Array.isArray(store.itemOrderParked[countId]) ? store.itemOrderParked[countId] : [];
    store.itemOrderParked[countId] = parkedSrc.filter((slot) => {
      if (!known[slot] || seen[slot]) return false;
      seen[slot] = 1;
      return true;
    });
    while (store.itemOrders[countId].length < meta.min) {
      const slot = smallestUnusedSlot(countId);
      if (!slot) break;
      store.itemOrders[countId].push(slot);
    }
    while (store.itemOrders[countId].length > meta.max) {
      store.itemOrderParked[countId].push(store.itemOrders[countId].pop());
    }
  }

  function seedAllItemOrders() {
    ITEM_LAYOUT_IDS.forEach((id) => seedItemOrder(id));
  }

  function adoptItemOrders(srcOrders, srcParked) {
    store.itemOrders = {};
    store.itemOrderParked = {};
    if (srcOrders && typeof srcOrders === "object") {
      ITEM_LAYOUT_IDS.forEach((id) => {
        if (Array.isArray(srcOrders[id])) store.itemOrders[id] = srcOrders[id].slice();
      });
    }
    if (srcParked && typeof srcParked === "object") {
      ITEM_LAYOUT_IDS.forEach((id) => {
        if (Array.isArray(srcParked[id])) store.itemOrderParked[id] = srcParked[id].slice();
      });
    }
    seedAllItemOrders();
    if (srcOrders && typeof srcOrders === "object") {
      ITEM_LAYOUT_IDS.forEach((id) => {
        if (Array.isArray(srcOrders[id]) && store.itemOrders[id]) {
          store.draftCounts[id] = store.itemOrders[id].length;
        }
      });
    }
  }

  function previewItemEl(countId, slotId) {
    const block = document.getElementById(countId);
    if (!block || !slotId) return null;
    return block.querySelector(':scope > [data-item-id="' + slotId + '"]');
  }

  function applyItemOrderToPreview(countId) {
    const block = document.getElementById(countId);
    if (!block || !ITEM_SLOT_IDS[countId]) return;
    seedItemOrder(countId);
    const order = store.itemOrders[countId];
    const parked = store.itemOrderParked[countId];
    order.forEach((slot) => {
      const el = previewItemEl(countId, slot);
      if (!el) return;
      el.hidden = false;
      block.appendChild(el);
    });
    parked.forEach((slot) => {
      const el = previewItemEl(countId, slot);
      if (!el) return;
      el.hidden = true;
      block.appendChild(el);
    });
    ITEM_SLOT_IDS[countId].forEach((slot) => {
      if (order.indexOf(slot) >= 0 || parked.indexOf(slot) >= 0) return;
      const el = previewItemEl(countId, slot);
      if (!el) return;
      el.hidden = true;
      block.appendChild(el);
    });
  }

  function alignItemOrderToCount(countId) {
    if (!ITEM_SLOT_IDS[countId]) return;
    seedItemOrder(countId);
    const meta = COUNT_META[countId];
    if (!meta) return;
    let target = Number(store.draftCounts[countId]);
    if (!Number.isFinite(target)) target = meta.defaultCount || 1;
    target = Math.max(meta.min, Math.min(meta.max, target));
    const order = store.itemOrders[countId];
    const parked = store.itemOrderParked[countId];
    const layout = normalizeItemLayout(countId);
    while (order.length > target) parked.push(order.pop());
    while (order.length < target) {
      if (parked.length) {
        order.push(parked.pop());
      } else {
        const slot = smallestUnusedSlot(countId);
        if (!slot) break;
        if (layout) {
          if (!layout.sizeById[slot]) layout.sizeById[slot] = "L";
          if (layout.focalXById[slot] == null) layout.focalXById[slot] = ITEM_FOCAL_DEFAULT;
          if (layout.focalYById[slot] == null) layout.focalYById[slot] = ITEM_FOCAL_DEFAULT;
        }
        order.push(slot);
      }
    }
    store.draftCounts[countId] = order.length;
  }

  function syncItemGapButtons() {
    ITEM_LAYOUT_IDS.forEach((id) => {
      const layout = normalizeItemLayout(id);
      if (!layout) return;
      document.querySelectorAll('[data-gap-for="' + id + '"] [data-gap]').forEach((btn) => {
        btn.classList.toggle("is-active", btn.getAttribute("data-gap") === layout.gap);
      });
      document.querySelectorAll('.layout-gap-row[data-gap-for="' + id + '"] .layout-gap-btn').forEach((btn) => {
        btn.classList.toggle("is-active", btn.getAttribute("data-gap") === layout.gap);
      });
    });
  }

  function setItemGap(id, gap) {
    if (ITEM_LAYOUT_IDS.indexOf(id) < 0) return;
    const layout = normalizeItemLayout(id);
    if (!layout) return;
    if (ITEM_GAP_STEPS.indexOf(gap) < 0) return;
    if (layout.gap === gap) return;
    pushLayoutUndo();
    layout.gap = gap;
    const block = document.getElementById(id);
    if (block) block.setAttribute("data-item-gap", layout.gap);
    syncItemGapButtons();
    if (store.confirmed.finish) unconfirmFinishSoft();
    scheduleSave();
  }

  function applyItemLayoutToPreview(id) {
    if (ITEM_LAYOUT_IDS.indexOf(id) < 0) return;
    const block = document.getElementById(id);
    if (!block) return;
    const layout = normalizeItemLayout(id);
    if (!layout) return;
    seedItemOrder(id);
    applyItemOrderToPreview(id);
    const order = store.itemOrders[id] || [];
    block.setAttribute("data-item-gap", layout.gap);
    const visibleSizes = order.map((slot) => layout.sizeById[slot] || "L");
    let fixed = visibleSizes.slice();
    if (fixed.length === 1) fixed[0] = "L";
    else fixed = fixOrphanTrailingH(fixed);
    fixed.forEach((sz, i) => {
      layout.sizeById[order[i]] = sz;
    });
    const useManual = order.length >= 1;
    block.classList.toggle("is-item-layout-manual", useManual);
    if (!useManual) {
      block.style.removeProperty("--item-layout-cols");
      return;
    }
    block.style.setProperty("--item-layout-cols", "2");
    order.forEach((slot, i) => {
      const item = previewItemEl(id, slot);
      if (!item) return;
      const size = fixed[i] || "L";
      item.hidden = false;
      item.setAttribute("data-item-size", size);
      applyItemFocalToItem(
        id,
        item,
        slot,
        size,
        layout.focalXById[slot],
        layout.focalYById[slot],
        layout.scaleById && layout.scaleById[slot]
      );
    });
    (store.itemOrderParked[id] || []).forEach((slot) => {
      const item = previewItemEl(id, slot);
      if (!item) return;
      item.hidden = true;
      item.removeAttribute("data-item-size");
      clearItemFocalOnItem(item);
    });
  }

  function itemFocalImage(item) {
    if (!item) return null;
    return (
      item.querySelector(":scope > .skill-card-img") ||
      item.querySelector(":scope .work-thumb") ||
      item.querySelector("img.skill-card-img, img.work-thumb")
    );
  }

  function clearItemFocalOnItem(item) {
    if (!item) return;
    const img = itemFocalImage(item);
    if (img) {
      img.style.removeProperty("object-position");
      img.style.removeProperty("transform");
      img.style.removeProperty("transform-origin");
    }
    const nudge = item.querySelector(":scope > .item-focal-nudge");
    if (nudge) nudge.remove();
  }

  function focalNudgeMarkup() {
    return (
      '<button type="button" class="item-focal-btn" data-focal-nudge="up" aria-label="上へ">↑</button>' +
      '<div class="item-focal-mid">' +
      '<button type="button" class="item-focal-btn" data-focal-nudge="left" aria-label="左へ">←</button>' +
      '<span class="item-focal-label">位置</span>' +
      '<button type="button" class="item-focal-btn" data-focal-nudge="right" aria-label="右へ">→</button>' +
      "</div>" +
      '<button type="button" class="item-focal-btn" data-focal-nudge="down" aria-label="下へ">↓</button>'
    );
  }

  function syncFocalNudgeButtons(nudge, focalX, focalY) {
    if (!nudge) return;
    const x = normalizeFocalX(focalX);
    const y = normalizeFocalY(focalY);
    const label = nudge.querySelector(".item-focal-label");
    if (label) {
      label.textContent = "位置";
      setHoverTip(label, "左右 " + x + "%・上下 " + y + "%（左上0／右下100）");
    }
    const up = nudge.querySelector('[data-focal-nudge="up"]');
    const down = nudge.querySelector('[data-focal-nudge="down"]');
    const left = nudge.querySelector('[data-focal-nudge="left"]');
    const right = nudge.querySelector('[data-focal-nudge="right"]');
    if (up) up.disabled = y <= 0;
    if (down) down.disabled = y >= 100;
    if (left) left.disabled = x <= 0;
    if (right) right.disabled = x >= 100;
  }

  function normalizeImageScale(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return IMAGE_SCALE_DEFAULT;
    const stepped = Math.round(n / IMAGE_SCALE_STEP) * IMAGE_SCALE_STEP;
    return Math.max(IMAGE_SCALE_MIN, Math.min(IMAGE_SCALE_MAX, stepped));
  }

  function imageScaleLabel(scale) {
    return normalizeImageScale(scale) + "%";
  }

  function applyImageScaleToImg(img, scale, focalX, focalY) {
    if (!img) return;
    const x = normalizeFocalX(focalX);
    const y = normalizeFocalY(focalY);
    const s = normalizeImageScale(scale);
    img.style.objectFit = "cover";
    img.style.objectPosition = x + "% " + y + "%";
    img.style.transformOrigin = x + "% " + y + "%";
    if (s === IMAGE_SCALE_DEFAULT) img.style.removeProperty("transform");
    else img.style.transform = "scale(" + s / 100 + ")";
    if (img.classList.contains("skill-card-img") && img.parentElement) {
      img.parentElement.style.overflow = "hidden";
    }
    if (img.classList.contains("work-thumb") && img.parentElement && !img.parentElement.classList.contains("work-thumb-clip")) {
      const clip = document.createElement("span");
      clip.className = "work-thumb-clip";
      img.parentElement.insertBefore(clip, img);
      clip.appendChild(img);
    }
  }

  function applyItemFocalToItem(countId, item, index, size, focalX, focalY, scale) {
    const img = itemFocalImage(item);
    const x = normalizeFocalX(focalX);
    const y = normalizeFocalY(focalY);
    if (img) applyImageScaleToImg(img, scale, x, y);
    syncItemFocalNudge(countId, item, index, true, x, y);
  }

  function syncItemFocalNudge(countId, item) {
    if (!item) return;
    const nudge = item.querySelector(":scope > .item-focal-nudge");
    if (nudge) nudge.remove();
  }

  function nudgeItemFocal(countId, index, dir) {
    if (ITEM_LAYOUT_IDS.indexOf(countId) < 0) return;
    const layout = normalizeItemLayout(countId);
    if (!layout) return;
    seedItemOrder(countId);
    const order = store.itemOrders[countId] || [];
    let slot = String(index == null ? "" : index);
    if (/^\d+$/.test(slot)) slot = order[Number(slot)] || "";
    if (!slot || order.indexOf(slot) < 0) return;
    let changed = false;
    if (dir === "up" || dir === "down") {
      const delta = dir === "up" ? -ITEM_FOCAL_STEP : ITEM_FOCAL_STEP;
      const next = normalizeFocalY(Number(layout.focalYById[slot]) + delta);
      if (next !== layout.focalYById[slot]) {
        layout.focalYById[slot] = next;
        changed = true;
      }
    }
    if (!changed) return;
    pushLayoutUndo();
    applyItemLayoutToPreview(countId);
    if (store.confirmed.finish) unconfirmFinishSoft();
    scheduleSave();
    syncOpenLayoutFocalButtons();
  }

  function ensureHeroFocalDefaults() {
    store.heroFocalX = normalizeFocalPercent(store.heroFocalX, HERO_FOCAL_X_DEFAULT);
    store.heroFocalY = normalizeFocalPercent(store.heroFocalY, HERO_FOCAL_Y_DEFAULT);
    store.heroImageScale = normalizeImageScale(store.heroImageScale);
  }

  function applyHeroFocalToPreview() {
    ensureHeroFocalDefaults();
    const stage = root && root.querySelector(".hero-stage");
    const photo = root && root.querySelector(".hero-photo");
    const x = store.heroFocalX;
    const y = store.heroFocalY;
    if (photo && !store.heroImageOff) applyImageScaleToImg(photo, store.heroImageScale, x, y);
    syncHeroFocalNudge(stage, x, y);
  }

  function syncHeroFocalNudge(stage) {
    if (!stage) return;
    const nudge = stage.querySelector(":scope > .item-focal-nudge");
    if (nudge) nudge.remove();
  }

  function bodyIsDetailEditMode() {
    return !!(document.body && document.body.classList.contains("atelier") && document.body.classList.contains("mode-detail"));
  }

  function nudgeHeroFocal(dir) {
    ensureHeroFocalDefaults();
    let changed = false;
    if (dir === "up" || dir === "down") {
      const delta = dir === "up" ? -ITEM_FOCAL_STEP : ITEM_FOCAL_STEP;
      const next = normalizeFocalPercent(store.heroFocalY + delta, HERO_FOCAL_Y_DEFAULT);
      if (next !== store.heroFocalY) {
        store.heroFocalY = next;
        changed = true;
      }
    }
    if (!changed) return;
    applyHeroFocalToPreview();
    if (store.confirmed.finish) unconfirmFinishSoft();
    scheduleSave();
    syncOpenLayoutFocalButtons();
  }

  function setupItemFocalNudgeClicks() {
    if (!root || root.dataset.focalNudgeBound === "1") return;
    root.dataset.focalNudgeBound = "1";
    root.addEventListener(
      "click",
      function (ev) {
        const btn = ev.target && ev.target.closest && ev.target.closest("[data-focal-nudge]");
        if (!btn || !root.contains(btn)) return;
        ev.preventDefault();
        ev.stopPropagation();
        const countId = btn.getAttribute("data-focal-for");
        const index = btn.getAttribute("data-focal-index");
        const dir = btn.getAttribute("data-focal-nudge");
        if (countId === "hero") {
          nudgeHeroFocal(dir);
          return;
        }
        nudgeItemFocal(countId, index, dir);
      },
      true
    );
  }

  function applyAllItemLayoutsToPreview() {
    ITEM_LAYOUT_IDS.forEach((id) => applyItemLayoutToPreview(id));
    syncItemGapButtons();
    applyHeroFocalToPreview();
  }

  function trimItemLayoutForCount() {}

  function padItemLayoutBeforeAdd() {}

  let pendingItemGrow = null;

  function positionItemGrowNear(anchorEl) {
    const tabs = document.getElementById("item-grow-tabs");
    if (!tabs) return;
    let cx = window.innerWidth / 2;
    let cy = window.innerHeight / 2;
    if (anchorEl && typeof anchorEl.getBoundingClientRect === "function") {
      const r = anchorEl.getBoundingClientRect();
      cx = r.left + r.width / 2;
      cy = r.top + r.height / 2;
    }
    const pad = 8;
    const approxW = 148;
    const approxH = 120;
    cx = Math.max(approxW / 2 + pad, Math.min(window.innerWidth - approxW / 2 - pad, cx));
    cy = Math.max(approxH / 2 + pad, Math.min(window.innerHeight - approxH / 2 - pad, cy));
    tabs.style.left = Math.round(cx) + "px";
    tabs.style.top = Math.round(cy) + "px";
  }

  function closeItemGrowModal() {
    const modal = document.getElementById("item-grow-modal");
    if (modal) {
      modal.hidden = true;
      modal.setAttribute("hidden", "");
    }
    pendingItemGrow = null;
    document.body.classList.remove("is-item-grow-open");
  }

  function openItemGrowModal(countId, scrollSel, anchorEl) {
    pendingItemGrow = {
      countId: countId,
      scrollSel: scrollSel || null,
      anchorEl: anchorEl || null
    };
    const modal = document.getElementById("item-grow-modal");
    if (!modal) {
      commitItemSize("L");
      return;
    }
    const label =
      countId === "works-list" ? "カード" : countId === "about-photos" ? "写真" : "枠";
    const title = document.getElementById("item-grow-title");
    const text = document.getElementById("item-grow-text");
    if (title) title.textContent = label + "の大きさ";
    if (text) {
      text.textContent =
        "横幅いっぱい＝一段で広く。半分＝横に2つ並べる幅。";
    }
    positionItemGrowNear(anchorEl);
    modal.hidden = false;
    modal.removeAttribute("hidden");
    document.body.classList.add("is-item-grow-open");
  }

  function commitItemSize(sizeRaw) {
    if (!pendingItemGrow) return;
    const countId = pendingItemGrow.countId;
    const scrollSel = pendingItemGrow.scrollSel;
    const meta = COUNT_META[countId];
    seedItemOrder(countId);
    const order = store.itemOrders[countId];
    const cur = order.length;
    if (meta && cur >= meta.max) {
      closeItemGrowModal();
      return;
    }
    const size = normalizeItemSizeToken(sizeRaw);
    const layout = normalizeItemLayout(countId);
    const plan = [];
    if (layout && size === "H") {
      if (cur === 1) {
        layout.sizeById[order[0]] = "H";
        plan.push("H");
      } else if (
        order.every((slot) => (layout.sizeById[slot] || "L") === "L") &&
        meta &&
        cur + 2 <= meta.max
      ) {
        plan.push("H");
        plan.push("H");
      } else {
        plan.push("H");
      }
    } else {
      plan.push("L");
    }
    const room = meta ? meta.max - cur : plan.length;
    if (plan.length > room) plan.length = Math.max(0, room);
    closeItemGrowModal();
    if (!plan.length || !layout) return;
    pushLayoutUndo();
    plan.forEach((sz) => {
      const slot = smallestUnusedSlot(countId);
      if (!slot) return;
      layout.sizeById[slot] = sz;
      layout.focalXById[slot] = ITEM_FOCAL_DEFAULT;
      layout.focalYById[slot] = ITEM_FOCAL_DEFAULT;
      order.push(slot);
    });
    store.draftCounts[countId] = order.length;
    patchOwnerSnapshotCount(countId);
    syncCountLabels();
    applyAllItemLayoutsToPreview();
    renderLayoutArrangeWire();
    if (scrollSel) scrollPreviewTo(scrollSel);
    if (store.confirmed.finish) unconfirmFinishSoft();
    scheduleSave();
    showLayoutArrangeHint(
      "追加しました。写真やカードは、あとからワイヤーで場所を変えられます。"
    );
  }

  function commitItemGrowDir(dir) {
    commitItemSize(dir === "row" || dir === "H" ? "H" : "L");
  }

  function requestAddDraftCount(countId, scrollSel, anchorEl) {
    const meta = COUNT_META[countId];
    if (!meta) return;
    seedItemOrder(countId);
    const cur = ITEM_SLOT_IDS[countId]
      ? store.itemOrders[countId].length
      : Number(store.draftCounts[countId] || meta.defaultCount || 1);
    if (cur >= meta.max) return;
    if (ITEM_LAYOUT_IDS.indexOf(countId) >= 0 && (store.itemOrderParked[countId] || []).length) {
      adjustDraftCount(countId, 1, scrollSel, { skipGrowPrompt: true });
      return;
    }
    if (ITEM_LAYOUT_IDS.indexOf(countId) >= 0) {
      /* 最終枠は余りH→Lになるため、ポップなしで横幅いっぱい固定 */
      if (cur + 1 >= meta.max) {
        pendingItemGrow = { countId: countId, scrollSel: scrollSel || null };
        commitItemSize("L");
        return;
      }
      openItemGrowModal(countId, scrollSel, anchorEl || null);
      return;
    }
    adjustDraftCount(countId, 1, scrollSel, { skipGrowPrompt: true });
  }

  function setupUrlSlugWish() {
    const input = document.getElementById("url_slug_wish");
    const warn = document.getElementById("url-slug-wish-warn");
    if (!input || input.dataset.bound === "1") return;
    input.dataset.bound = "1";
    const okRe = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/;
    const sync = () => {
      const v = String(input.value || "").trim();
      const bad = v.length > 0 && !okRe.test(v);
      if (warn) warn.hidden = !bad;
      input.classList.toggle("is-invalid", bad);
    };
    input.addEventListener("input", sync);
    input.addEventListener("change", sync);
    sync();
  }

  function setupItemGapControls() {
    document.querySelectorAll(".item-gap-row[data-gap-for]").forEach((row) => {
      const id = row.getAttribute("data-gap-for");
      if (ITEM_LAYOUT_IDS.indexOf(id) < 0) return;
      row.querySelectorAll("[data-gap]").forEach((btn) => {
        btn.addEventListener("click", () => {
          setItemGap(id, btn.getAttribute("data-gap"));
        });
      });
    });
  }

  function setupItemGrowModal() {
    const modal = document.getElementById("item-grow-modal");
    if (!modal || modal.dataset.bound === "1") return;
    modal.dataset.bound = "1";
    modal.querySelectorAll("[data-item-size], [data-item-grow-dir]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const sz = btn.getAttribute("data-item-size");
        if (sz) commitItemSize(sz);
        else commitItemGrowDir(btn.getAttribute("data-item-grow-dir"));
      });
    });
    modal.querySelectorAll("[data-item-grow-cancel]").forEach((btn) => {
      btn.addEventListener("click", () => closeItemGrowModal());
    });
    document.addEventListener("keydown", (ev) => {
      if (ev.key !== "Escape") return;
      if (modal.hidden && !document.body.classList.contains("is-item-grow-open")) return;
      closeItemGrowModal();
    });
  }

  function snapshotLayoutUndoState() {
    return {
      layoutPattern: store.layoutPattern || "a",
      layoutOrder: normalizeLayoutOrder(store.layoutOrder).slice(),
      draftExtras: {
        hours: !!(store.draftExtras && store.draftExtras.hours),
        access: !!(store.draftExtras && store.draftExtras.access),
        address: !!(store.draftExtras && store.draftExtras.address),
        announce: !!(store.draftExtras && store.draftExtras.announce)
      },
      layoutBlockOff: Object.assign({}, store.layoutBlockOff || {}),
      draftCounts: Object.fromEntries(
        COUNT_IDS.map((id) => [id, Number(store.draftCounts[id] || 1)])
      ),
      itemLayouts: store.itemLayouts
        ? JSON.parse(JSON.stringify(store.itemLayouts))
        : defaultItemLayouts(),
      itemOrders: JSON.parse(JSON.stringify(store.itemOrders || {})),
      itemOrderParked: JSON.parse(JSON.stringify(store.itemOrderParked || {}))
    };
  }

  function pushLayoutUndo() {
    if (store.layoutUndoRestoring) return;
    if (!Array.isArray(store.layoutUndoStack)) store.layoutUndoStack = [];
    store.layoutUndoStack.push(snapshotLayoutUndoState());
    if (store.layoutUndoStack.length > LAYOUT_UNDO_MAX) {
      store.layoutUndoStack.splice(0, store.layoutUndoStack.length - LAYOUT_UNDO_MAX);
    }
    syncLayoutUndoButton();
  }

  function syncLayoutUndoButton() {
    const btn = document.getElementById("layout-undo-btn");
    if (!btn) return;
    const n = (store.layoutUndoStack && store.layoutUndoStack.length) || 0;
    btn.disabled = n < 1;
    btn.textContent = "一つ前の作業に戻す";
  }

  function restoreLayoutUndoState(snap) {
    if (!snap) return;
    store.layoutUndoRestoring = true;
    try {
      store.layoutPattern = normalizeLayoutId(snap.layoutPattern || "a");
      store.layoutOrder = normalizeLayoutOrder(snap.layoutOrder || LAYOUT_DEFAULT_ORDER);
      store.layoutSelected = true;
      if (snap.draftExtras) {
        store.draftExtras = Object.assign(
          { hours: false, access: false, address: false, announce: false },
          snap.draftExtras
        );
      }
      store.layoutBlockOff =
        snap.layoutBlockOff && typeof snap.layoutBlockOff === "object"
          ? Object.assign({}, snap.layoutBlockOff)
          : {};
      if (snap.draftCounts) {
        Object.keys(snap.draftCounts).forEach((id) => {
          if (!COUNT_META[id]) return;
          const n = Number(snap.draftCounts[id]);
          if (!Number.isFinite(n)) return;
          store.draftCounts[id] = Math.max(COUNT_META[id].min, Math.min(COUNT_META[id].max, n));
        });
      }
      if (snap.itemLayouts) {
        store.itemLayouts = defaultItemLayouts();
        ITEM_LAYOUT_IDS.forEach((id) => {
          const src = snap.itemLayouts[id];
          if (!src || typeof src !== "object") return;
          store.itemLayouts[id] = parseItemLayoutSource(id, src);
        });
      }
      adoptItemOrders(snap.itemOrders, snap.itemOrderParked);
      root.setAttribute("data-layout", store.layoutPattern);
      document.querySelectorAll(".layout-card[data-layout]").forEach((btn) => {
        const on = btn.getAttribute("data-layout") === store.layoutPattern;
        btn.classList.toggle("is-selected", on);
        btn.setAttribute("aria-checked", on ? "true" : "false");
      });
      applyLayoutOrderToPreview();
      syncCountLabels();
      applyAllItemLayoutsToPreview();
      renderLayoutArrangeWire();
      updateFinishSummary();
      scheduleSave();
    } finally {
      store.layoutUndoRestoring = false;
      syncLayoutUndoButton();
    }
  }

  function undoLayoutOnce() {
    if (!store.layoutUndoStack || !store.layoutUndoStack.length) return;
    const snap = store.layoutUndoStack.pop();
    restoreLayoutUndoState(snap);
    showLayoutArrangeHint("一つ前の作業に戻しました。", 1800);
  }

  function removeLayoutDragGhost() {
    const ghost = document.getElementById("layout-arrange-ghost");
    if (ghost) ghost.remove();
    store._layoutGhostOffsetX = null;
    store._layoutGhostOffsetY = null;
  }

  function placeLayoutDragGhost(clientX, clientY) {
    const ghost = document.getElementById("layout-arrange-ghost");
    if (!ghost) return;
    const ox = store._layoutGhostOffsetX != null ? store._layoutGhostOffsetX : 24;
    const oy = store._layoutGhostOffsetY != null ? store._layoutGhostOffsetY : 16;
    ghost.style.left = Math.round(clientX - ox) + "px";
    ghost.style.top = Math.round(clientY - oy) + "px";
    ghost.hidden = false;
  }

  function ensureLayoutDragGhost(source, clientX, clientY) {
    const faceSource =
      source && source.querySelector(":scope > .layout-closed-line")
        ? source.querySelector(":scope > .layout-closed-line")
        : source && source.tagName === "DETAILS"
          ? source.querySelector(":scope > summary") || source
          : source;
    const key =
      (source && (source.getAttribute("data-layout-block") || source.getAttribute("data-item-id"))) ||
      "frame";
    let ghost = document.getElementById("layout-arrange-ghost");
    if (ghost && ghost.getAttribute("data-ghost-key") !== key) {
      ghost.remove();
      ghost = null;
    }
    if (!ghost && faceSource) {
      ghost = document.createElement("div");
      ghost.id = "layout-arrange-ghost";
      ghost.className = "layout-arrange-ghost";
      ghost.setAttribute("aria-hidden", "true");
      ghost.setAttribute("data-ghost-key", key);
      const face = faceSource.cloneNode(true);
      face.querySelectorAll("button, input, .layout-open-btn, .layout-arrange-handle, .layout-inner-handle").forEach((el) => {
        el.remove();
      });
      face.querySelectorAll("img").forEach((img) => {
        img.draggable = false;
      });
      ghost.appendChild(face);
      const rect = faceSource.getBoundingClientRect();
      ghost.style.width = Math.max(160, Math.round(rect.width)) + "px";
      document.body.appendChild(ghost);
    }
    placeLayoutDragGhost(clientX, clientY);
  }

  function clearLayoutDragUi() {
    store.layoutDragId = null;
    store.layoutDragOverId = null;
    store.layoutDragOverKey = null;
    store.layoutDragOverPlace = null;
    store.layoutOrderBeforeDrag = null;
    store.layoutDragDropped = false;
    store.layoutDragMoved = false;
    store.previewLayoutDragging = false;
    store.layoutSwapFrom = null;
    store._layoutPointerId = null;
    store._previewPointerId = null;
    store._previewPointerStart = null;
    removeLayoutDragGhost();
    const host = document.getElementById("layout-arrange-wire");
    if (host) host.classList.remove("is-dragging-layout");
    document.querySelectorAll(".layout-arrange-cell, .layout-photo-row, .easy-copy-list-row").forEach((el) => {
      el.style.transform = "";
      el.classList.remove("is-dragging", "is-drop-target", "is-drop-deny", "is-selected", "is-touch", "is-holding");
    });
    document.querySelectorAll("#preview-root [data-layout-block]").forEach((el) => {
      el.classList.remove("is-preview-dragging", "is-preview-drop-target");
      el.removeAttribute("draggable");
    });
    const main = root.querySelector("main");
    if (main) main.classList.remove("is-preview-layout-dragging");
    document.body.classList.remove("is-layout-dragging");
    closeItemGrowModal();
  }


  function forceClearLayoutDragUi() {
    /* 並びは巻き戻さない：drop 済みの正当な順序を安全弁が潰すのが本丸だった */
    clearLayoutDragUi();
  }


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
    contactInk: "--contact-ink",
    announceBg: "--announce-bg"
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
    "accent", "cardBg", "valuesBg", "contactBg", "contactInk", "announceBg"
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
    announceBg: "#fff6e8",
    radius: "0.6rem",
    headingScale: "1.15",
    accentBar: "mid"
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
    "site-fonts": {
      fonts: {
        font_display: "Shippori Mincho",
        font_catch: "Shippori Mincho",
        font_body: "Zen Kaku Gothic New"
      }
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
    "hours-text": { texts: ["hours_text"] },
    "access-text": { texts: ["access_text"] },
    "address-text": { texts: ["address_text"] },
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
    draftExtras: { hours: false, access: false, address: false, announce: false },
    layoutBlockOff: {},
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
    pendingFontRoleFocus: null,
    sitePurpose: null,
    layoutPattern: "a",
    layoutOrder: LAYOUT_DEFAULT_ORDER.slice(),
    layoutSwapFrom: null,
    layoutDragId: null,
    layoutDragSize: null,
    layoutDragMoved: false,
    layoutDragDropped: false,
    layoutDragOverId: null,
    layoutOrderBeforeDrag: null,
    previewLayoutDragging: false,
    layoutSelected: false,
    finishLockedOnce: false,
    vibeColors: null,
    vibeReasons: [],
    vibeText: "",
    intakeDone: false,
    saveMode: null,
    entryBranch: null,
    blankCanvas: false,
    hubEntrySource: null,
    easyFlowActive: false,
    easyDirectOpen: false,
    easyKusudamaPlayed: false,
    announceLinkOn: false,
    workLinkOn: {},
    colorPickMode: {},
    sampleFinishNoBack: false,
    pendingSushi: null,
    sampleFlowEntered: false,
    sampleFlowAppliedId: null,
    sampleOriginalPreset: null,
    sushiSampleId: null,
    sushiSampleKey: null,
    sushiSampleBrand: null,
    sampleSectionCandidates: {},
    sampleSectionSelected: {},
    sampleWireSlot: "hero",
    copyPathMode: null,
    imgPathMode: null,
    /* 完成から戻った作成中は、自動で先へ進まない */
    easyLoadingPaused: false,
    hubImgPathMode: {},
    imgOmakaseLocks: {},
    imgOmakaseSkipConfirm: false,
    layoutLockNoticeSkip: false,
    imgOmakasePicks: {},
    imgOmakaseSalt: 0,
    sampleKeptImagePaths: null,
    copyDirIds: [],
    copyDirForbid: [],
    copyFieldSource: {},
    copyHeroOnPhoto: null,
    copyScreenReturn: null,
    copyPresetId: null,
    copyOmakaseAxes: null,
    copyOmakaseLocks: {},
    copyOmakaseSalt: 0,
    copyFrameIndex: 0,
    copyFramePoolIndex: {},
    copyFrameCandidates: {},
    copyFrameSelected: {},
    copyFrameNow: {},
    sampleCopySlots: null,
    sampleCopyBaseline: null,
    easyBasicsHints: null,
    easyBasicsApplied: false,
    siteNameConfirmed: false,
    easyAnswers: { mood: "calm", focus: "quality", guest: "first" },
    easyCopyCandidates: [],
    easyCopySelected: null,
    siteColorMode: "easy",
    heroTextOnPhoto: false,
    heroImageOff: false,
    catchPage: "imageAsk",
    catchInline: false,
    catchImageOn: null,
    catchWordsOn: null,
    heroTextPlate: "round",
    heroTextPlateLast: "round",
    heroTextPlateTone: "white",
    heroTextPos: "center",
    heroFocalX: HERO_FOCAL_X_DEFAULT,
    heroFocalY: HERO_FOCAL_Y_DEFAULT,
    heroImageScale: IMAGE_SCALE_DEFAULT,
    slotGradients: {},
    slotGradientPartners: {},
    partnerPickMode: false,
    itemLayouts: null,
    itemOrders: null,
    itemOrderParked: null,
    layoutUndoStack: [],
    layoutUndoRestoring: false,
    layoutDragOverKey: null,
    layoutDragOverPlace: null,
    hubPlacePickMode: false,
    hubPlaceSelectedBlockId: null,
    hubPlaceFitScale: 1,
    hubUiMode: "home",
    studioImagePaths: null,
    zipImageFiles: null,
    galleryPicks: null,
    folderDirHandle: null,
    projectFileHandle: null,
    folderDisplayName: "",
    projectFolderName: "",
    projectNameAuto: "",
    pendingResumeFolderFiles: null,
    hubReturnBlockId: null,
    hubEntryRoute: null,
    hubTaskId: null,
    /* flat=そのまま表示 / accordion=初期全閉じ。見本の開閉は見るためだけで保存しない */
    aboutItemsDisplay: "accordion",
    previewAccordionLookOpen: false,
    previewDesignWidth: 1280,
    previewFrameScale: 1
  };
  store.itemLayouts = defaultItemLayouts();
  seedAllItemOrders();

  function isLayoutBlockActive(meta) {
    if (!meta) return false;
    if (meta.extraKey) {
      return !!(store.draftExtras && store.draftExtras[meta.extraKey]);
    }
    return !(store.layoutBlockOff && store.layoutBlockOff[meta.id]);
  }

  function countVisibleLayoutBlocks() {
    return LAYOUT_BLOCKS.filter((meta) => isLayoutBlockActive(meta)).length;
  }

  function setLayoutBlockVisible(blockId, visible) {
    const meta = LAYOUT_BLOCKS.find((b) => b.id === blockId);
    if (!meta) return false;
    const next = !!visible;
    const currentlyOn = isLayoutBlockActive(meta);
    if (!next && currentlyOn && countVisibleLayoutBlocks() <= 1) {
      showLayoutArrangeHint("最低1つは表示してください。", 2200);
      return false;
    }
    if (meta.extraKey) {
      if (!store.draftExtras) {
        store.draftExtras = { hours: false, access: false, address: false, announce: false };
      }
      store.draftExtras[meta.extraKey] = next;
    } else {
      if (!store.layoutBlockOff) store.layoutBlockOff = {};
      if (next) delete store.layoutBlockOff[meta.id];
      else store.layoutBlockOff[meta.id] = true;
    }
    return true;
  }

  function syncLayoutBlockVisibilityRow(blockId) {
    const meta = LAYOUT_BLOCKS.find((b) => b.id === blockId);
    const cell = document.querySelector(
      '#layout-arrange-wire .layout-arrange-cell[data-layout-block="' + blockId + '"]'
    );
    if (!meta || !cell) return;
    const on = isLayoutBlockActive(meta);
    const label = layoutBlockDisplayLabel(meta);
    cell.classList.toggle("is-layout-off", !on);
    cell.setAttribute(
      "aria-label",
      label + (on ? "（表示中・ドラッグで並び替え）" : "（非表示・ドラッグで並び替え）")
    );
    const check = cell.querySelector(".layout-arrange-vis");
    if (check && check.checked !== on) check.checked = on;
  }

  function commitLayoutBlockVisibility(blockId, visible) {
    const meta = LAYOUT_BLOCKS.find((b) => b.id === blockId);
    if (!meta) return false;
    const currentlyOn = isLayoutBlockActive(meta);
    const want = !!visible;
    if (want === currentlyOn) {
      syncLayoutBlockVisibilityRow(blockId);
      return true;
    }
    if (!want && currentlyOn && countVisibleLayoutBlocks() <= 1) {
      syncLayoutBlockVisibilityRow(blockId);
      showLayoutArrangeHint("最低1つは表示してください。", 2200);
      return false;
    }
    if (!store.layoutUndoRestoring) pushLayoutUndo();
    if (!setLayoutBlockVisible(blockId, want)) {
      syncLayoutBlockVisibilityRow(blockId);
      return false;
    }
    applyLayoutOrderToPreview();
    applyAllConfirmed();
    applyLayoutOrderToPreview();
    syncLayoutBlockVisibilityRow(blockId);
    renderLayoutCardWires();
    updateConfirmUi();
    if (store.confirmed.finish) unconfirmFinishSoft();
    updateFinishSummary();
    if (blockId === "hero") syncCatchRemovalNotice();
    scheduleSave();
    return true;
  }

  let saveTimer = null;
  let suppressSave = false;
  let laneQueryHold = false;

  const GUIDED_COLOR_TUNE_IDS = COLOR_STEP_IDS_ORDERED.slice(1);

  function isGuidedColorStepId(stepId) {
    return COLOR_STEP_IDS_ORDERED.indexOf(stepId) >= 0;
  }

  function primaryColorKeyForStep(stepId) {
    if (store.layoutColorKey && store.guidedColorEditStepId === stepId) return store.layoutColorKey;
    const keys = COLOR_STEP_FIELDS[stepId];
    return keys && keys.length ? keys[0] : null;
  }

  function colorStepDisplayName(stepId) {
    const meta = BADGE_META[stepId];
    if (!meta || meta.kind !== "color") return layoutColorRowName(stepId);
    return meta.label;
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
    store.uiMode = "self";
    applyUiMode();
    openSelfStep("global-preset");
    scrollPreviewForColorStep(stepId);
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
    if (store.gradDirHintOpen && !store.gradDirHintSkip) return;
    const stepId = activeGctEditStepId();
    if (!stepId) return;
    const key = primaryColorKeyForStep(stepId);
    if (isPartner && !GRADIENT_BG_KEYS.has(key)) return;
    store.partnerPickMode = !!isPartner;
    if (store.guidedColorTrial) store.guidedColorTrial._pickHistory = [];
    renderGctPickUi(stepId, { forceHoney: true });
    const nextHex = isPartner
      ? partnerHexForSlot(stepId)
      : (key && store.draftColors[key]) || "#ffffff";
    syncHoneyShadeSlider(nextHex);
    scheduleSave();
  }

  function slotGradStarted(stepId) {
    return !!((store.slotGradOpen && store.slotGradOpen[stepId]) || slotHasGradient(stepId));
  }

  function startSlotSecondColor(stepId) {
    const key = primaryColorKeyForStep(stepId);
    if (!GRADIENT_BG_KEYS.has(key)) return;
    if (!store.slotGradOpen) store.slotGradOpen = {};
    store.slotGradOpen[stepId] = true;
    if (!store.slotGradientPartners) store.slotGradientPartners = {};
    const main = (key && store.draftColors[key]) || "#ffffff";
    if (!store.slotGradientPartners[stepId]) store.slotGradientPartners[stepId] = main;
    if (!store.slotGradients) store.slotGradients = {};
    if (!store.slotGradients[stepId]) store.slotGradients[stepId] = "to bottom";
    store.partnerPickMode = true;
    if (store.guidedColorTrial) store.guidedColorTrial._pickHistory = [];
    store.gradDirHintOpen = !store.gradDirHintSkip;
    const skipBox = document.getElementById("gct-grad-dir-skip");
    if (store.gradDirHintOpen && skipBox) skipBox.checked = false;
    renderGctPickUi(stepId, { forceHoney: true });
    syncHoneyShadeSlider(partnerHexForSlot(stepId));
    scheduleSave();
  }

  function setSlotGradient(stepId, dirId, opts) {
    if (!store.slotGradients) store.slotGradients = {};
    const key = primaryColorKeyForStep(stepId);
    if (!GRADIENT_BG_KEYS.has(key)) return;
    if (store.gradDirHintOpen && !store.gradDirHintSkip) return;
    const keep = !!(opts && opts.keep);
    if (!keep && (!dirId || store.slotGradients[stepId] === dirId)) {
      delete store.slotGradients[stepId];
    } else if (dirId) {
      store.slotGradients[stepId] = dirId;
      if (!store.slotGradientPartners) store.slotGradientPartners = {};
      if (!store.slotGradientPartners[stepId]) store.slotGradientPartners[stepId] = "#ffffff";
    }
    if (keep) {
      if (!store.slotGradHintOff) store.slotGradHintOff = {};
      store.slotGradHintOff[stepId] = true;
    }
    renderGctPalette();
    const inColorRow = !!document.querySelector(".layout-color-body #gct-pick-compass");
    if ((store.guidedColorPhase === "pick" && activeGctEditStepId() === stepId) || inColorRow) {
      renderPickGradCompass(stepId);
      updatePickMainSwatch(stepId);
      updatePickPartnerSwatch(stepId);
    }
    applyLiveColors(true);
    scheduleSave();
  }

  function clearSlotGradient(stepId) {
    if (store.gradDirHintOpen && !store.gradDirHintSkip) return;
    if (store.slotGradients) delete store.slotGradients[stepId];
    if (store.slotGradOpen) delete store.slotGradOpen[stepId];
    if (store.slotGradHintOff) delete store.slotGradHintOff[stepId];
    if (store.slotGradientPartners) delete store.slotGradientPartners[stepId];
    store.gradDirHintOpen = false;
    store.partnerPickMode = false;
    renderGctPickUi(stepId);
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
      setHoverTip(inkFrame, "色を選ぶ");
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

  function slotHasGradient(stepId) {
    return !!(store.slotGradients && store.slotGradients[stepId]);
  }

  function syncPickPartnerUnused(stepId) {
    const targetPartner = document.getElementById("gct-pick-target-partner");
    const partnerLabel = document.getElementById("gct-pick-partner-label");
    const help = document.getElementById("gct-pick-grad-help");
    const key = primaryColorKeyForStep(stepId);
    const canGrad = GRADIENT_BG_KEYS.has(key);
    const hasGrad = canGrad && slotHasGradient(stepId);
    const inColorRow = !!(targetPartner && targetPartner.closest(".layout-color-body"));
    const mainLabel = document.querySelector("#gct-pick-target-main .gct-pick-target-label");
    const liveNote = document.getElementById("gct-pick-live-note");
    if (liveNote) liveNote.hidden = true;
    if (mainLabel) {
      mainLabel.textContent = inColorRow
        ? (slotGradStarted(stepId) ? "1色目" : "単色")
        : "現在色";
    }
    if (targetPartner) {
      targetPartner.classList.toggle("is-unused", !inColorRow && canGrad && !hasGrad);
    }
    if (partnerLabel) {
      partnerLabel.textContent = inColorRow
        ? slotGradStarted(stepId) ? "2色目" : "グラデーション"
        : hasGrad || !!store.partnerPickMode ? "2色目" : "未使用";
    }
    if (targetPartner) targetPartner.classList.toggle("is-grad-gate", inColorRow && canGrad && !slotGradStarted(stepId));
    if (help) {
      if (inColorRow) {
        help.hidden = true;
      } else {
        help.textContent = "矢印を押すと、2色のグラデーションにできます。";
        help.hidden = !canGrad || hasGrad;
      }
    }
  }

  function pickLabelInk(hex) {
    try {
      const n = String(hex || "").replace("#", "");
      const full = n.length === 3 ? n.split("").map((c) => c + c).join("") : n;
      const r = parseInt(full.slice(0, 2), 16);
      const g = parseInt(full.slice(2, 4), 16);
      const b = parseInt(full.slice(4, 6), 16);
      if ([r, g, b].some((v) => Number.isNaN(v))) return "";
      const y = (r * 299 + g * 587 + b * 114) / 1000;
      return y > 160 ? "#14202a" : "#ffffff";
    } catch (e) {
      return "";
    }
  }

  function syncPickLabelInk(swatchEl, hex) {
    const btn = swatchEl && swatchEl.closest(".gct-pick-target");
    if (!btn || !btn.closest(".layout-color-body")) return;
    const label = btn.querySelector(".gct-pick-target-label");
    if (!label) return;
    label.style.color = hex ? pickLabelInk(hex) : "";
  }

  function updatePickPartnerSwatch(stepId) {
    const el = document.getElementById("gct-pick-partner-swatch");
    const hasGrad = slotHasGradient(stepId);
    if (el) {
      if (hasGrad) {
        el.style.background = partnerHexForSlot(stepId);
        el.style.backgroundImage = "";
        syncPickLabelInk(el, partnerHexForSlot(stepId));
      } else {
        el.style.background = "";
        el.style.backgroundImage = "";
        syncPickLabelInk(el, "");
      }
    }
    syncPickPartnerUnused(stepId);
  }

  function updatePickMainSwatch(stepId) {
    const el = document.getElementById("gct-pick-main-swatch");
    if (!el) return;
    const key = primaryColorKeyForStep(stepId);
    const hex = key ? store.draftColors[key] : "#ffffff";
    const inRow = !!(el.closest && el.closest(".layout-color-body"));
    if (inRow) {
      el.style.background = hex;
      el.style.backgroundImage = "none";
    } else {
      el.style.background = GRADIENT_BG_KEYS.has(key) ? swatchBackgroundForSlot(stepId, hex) : hex;
    }
    syncPickLabelInk(el, hex);
  }

  function renderPickGradCompass(stepId) {
    const compass = document.getElementById("gct-pick-compass");
    if (!compass) return;
    const inRow = !!compass.closest(".layout-color-body");
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
        if (inRow) {
          const clearBtn = document.createElement("button");
          clearBtn.type = "button";
          clearBtn.className = "gct-grad-clear";
          clearBtn.style.gridColumn = String(pos.col);
          clearBtn.style.gridRow = String(pos.row);
          clearBtn.textContent = "解除";
          clearBtn.setAttribute("aria-label", "グラデーションを解除");
          clearBtn.addEventListener("click", () => clearSlotGradient(stepId));
          compass.appendChild(clearBtn);
        } else {
          const center = document.createElement("span");
          center.className = "gct-grad-center gct-grad-center--empty";
          center.style.gridColumn = String(pos.col);
          center.style.gridRow = String(pos.row);
          center.setAttribute("aria-hidden", "true");
          compass.appendChild(center);
        }
        return;
      }
      const d = GRADIENT_DIRS.find((x) => x.id === pos.dirId);
      if (!d) return;
      const b = document.createElement("button");
      b.type = "button";
      const chosen = !!(store.slotGradHintOff && store.slotGradHintOff[stepId]);
      const on = inRow
        ? chosen && (store.slotGradients || {})[stepId] === d.id
        : (store.slotGradients || {})[stepId] === d.id;
      b.className = "gct-grad-arrow" + (on ? " is-active" : "");
      b.style.gridColumn = String(pos.col);
      b.style.gridRow = String(pos.row);
      b.setAttribute("aria-label", inRow ? d.label + "へグラデ" : d.label + "へグラデ。選択中なら解除");
      if (inRow) setHoverTip(b, d.label);
      else setHoverTip(b, d.label + "（もう一度で解除）");
      b.textContent = d.arrow;
      b.addEventListener("click", () => setSlotGradient(stepId, d.id, inRow ? { keep: true } : undefined));
      compass.appendChild(b);
    });
    syncGradDirHint();
  }

  function syncGradDirHint() {
    const pop = document.getElementById("gct-grad-dir-pop");
    const compass = document.getElementById("gct-pick-compass");
    const layout = document.querySelector(".gct-pick-layout");
    if (!pop) return;
    const inRow = !!(layout && layout.closest(".layout-color-body"));
    const show = !!(inRow && store.gradDirHintOpen && !store.gradDirHintSkip);
    pop.hidden = !show;
    if (layout) layout.classList.toggle("is-grad-dir-blocked", show);
    if (compass) {
      compass.classList.toggle("is-dir-locked", show);
      compass.querySelectorAll(".gct-grad-arrow, .gct-grad-clear").forEach((btn) => {
        btn.disabled = show;
      });
    }
    ["gct-pick-target-main", "gct-pick-target-partner", "gct-pick-ok"].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (show) el.disabled = true;
      else if (id !== "gct-pick-undo") el.disabled = false;
    });
    if (show) window.requestAnimationFrame(placeGradDirCard);
    else {
      const card = pop.querySelector(".gct-grad-dir-pop-card");
      if (card) card.style.left = card.style.top = card.style.width = "";
    }
  }

  function placeGradDirCard() {
    const pop = document.getElementById("gct-grad-dir-pop");
    const card = pop && pop.querySelector(".gct-grad-dir-pop-card");
    const compass = document.getElementById("gct-pick-compass");
    if (!pop || !card || !compass || pop.hidden) return;
    const popR = pop.getBoundingClientRect();
    const compR = compass.getBoundingClientRect();
    const side = compass.closest(".gct-pick-side");
    const sideR = side ? side.getBoundingClientRect() : compR;
    const gap = 10;
    card.style.position = "absolute";
    card.style.width = Math.max(160, Math.min(sideR.width - 8, 352)) + "px";
    const cardW = card.offsetWidth;
    const cardH = card.offsetHeight;
    let left = compR.left + compR.width / 2 - cardW / 2 - popR.left;
    const minLeft = sideR.left - popR.left;
    const maxLeft = sideR.right - popR.left - cardW;
    if (left < minLeft) left = minLeft;
    if (left > maxLeft) left = Math.max(minLeft, maxLeft);
    const compassTop = compR.top - popR.top;
    let top = compassTop - cardH - gap;
    if (top < 8) top = 8;
    card.style.left = Math.round(left) + "px";
    card.style.top = Math.round(top) + "px";
  }

  function dismissGradDirHint() {
    const skip = document.getElementById("gct-grad-dir-skip");
    if (skip && skip.checked) store.gradDirHintSkip = true;
    store.gradDirHintOpen = false;
    if (skip) skip.checked = false;
    const stepId = activeGctEditStepId();
    if (stepId) renderPickGradCompass(stepId);
    else syncGradDirHint();
    syncPickUndoButton();
    scheduleSave();
  }

  function currentPickHex() {
    const stepId = activeGctEditStepId();
    if (!stepId) return null;
    if (store.partnerPickMode) return partnerHexForSlot(stepId);
    const key = primaryColorKeyForStep(stepId);
    return key ? store.draftColors[key] || null : null;
  }

  function applyHoneyPick(hex) {
    if (store.gradDirHintOpen && !store.gradDirHintSkip) return;
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
    syncHoneyShadeSlider(hex);
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
    syncHoneyShadeSlider(hex);
    scheduleSave();
  }

  function syncPickUndoButton() {
    const pickUndo = document.getElementById("gct-pick-undo");
    if (!pickUndo) return;
    const trial = store.guidedColorTrial;
    const has = !!(trial && Array.isArray(trial._pickHistory) && trial._pickHistory.length);
    pickUndo.disabled = !has || !!(store.gradDirHintOpen && !store.gradDirHintSkip);
  }

  const HONEY_RINGS = 11;
  const HONEY_GRAY_STEPS = 19;

  function honeyMapWidthForSize(size) {
    const rings = HONEY_RINGS;
    /* appendHoneycomb の width = size*(2*√3*rings+2)+4 と一致させる */
    return size * (2 * Math.sqrt(3) * rings + 2) + 4;
  }

  let honeyShadeHsv = null;

  function hexToHsv(hex) {
    const rgb = parseHexRgb(hex);
    const r = rgb[0] / 255;
    const g = rgb[1] / 255;
    const b = rgb[2] / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    if (d !== 0) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    return { h: h, s: max === 0 ? 0 : d / max, v: max };
  }

  let honeyShadeCenter = "#ffffff";

  function syncHoneyShadeSlider(hex) {
    if (!hex) return;
    honeyShadeCenter = toColorInput(hex);
    honeyShadeHsv = hexToHsv(honeyShadeCenter);
    const input = document.getElementById("gct-honey-shade");
    if (!input) return;
    if (document.activeElement === input) input.blur();
    input.value = "0.5";
  }

  function shadeHexFromSlider(t) {
    const center = honeyShadeCenter || "#ffffff";
    const x = Math.max(0, Math.min(1, Number(t) || 0));
    /* 左が薄い、右が濃い。端は真っ白・真っ黒にしない */
    const dark = mixHex("#000000", center, 0.18);
    const light = mixHex(center, "#ffffff", 0.9);
    if (x <= 0.5) return mixHex(light, center, x / 0.5);
    return mixHex(center, dark, (x - 0.5) / 0.5);
  }

  function honeyShadeReserve() {
    const layout = document.querySelector(".gct-pick-layout");
    if (layout && layout.classList.contains("is-mode-all")) return 28;
    const shade = document.getElementById("gct-honey-shade");
    const shadeH = shade ? Math.max(shade.offsetHeight || 0, 22) : 0;
    return 20 + shadeH + 12;
  }

  function paintHoneyShade(v) {
    if (!honeyShadeCenter) {
      const cur = currentPickHex();
      honeyShadeCenter = cur ? toColorInput(cur) : "#ffffff";
    }
    const hex = shadeHexFromSlider(v);
    const stepId = activeGctEditStepId();
    if (!stepId) return;
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
  }

  function bindHoneyShade() {
    const input = document.getElementById("gct-honey-shade");
    if (!input || input.dataset.bound) return;
    input.dataset.bound = "1";
    let gesture = false;
    const pushOnce = () => {
      if (gesture) return;
      gesture = true;
      const prev = currentPickHex();
      const trial = store.guidedColorTrial || (store.guidedColorTrial = {});
      if (!Array.isArray(trial._pickHistory)) trial._pickHistory = [];
      if (prev) {
        trial._pickHistory.push(prev);
        if (trial._pickHistory.length > 40) trial._pickHistory.shift();
      }
      if (!honeyShadeCenter && prev) honeyShadeCenter = toColorInput(prev);
      syncPickUndoButton();
    };
    const shadeBox = input.closest(".gct-honey-shade");
    const grabOn = () => {
      document.documentElement.classList.add("is-shade-grab");
      if (shadeBox) shadeBox.style.cursor = "grabbing";
      input.style.cursor = "grabbing";
    };
    const grabOff = () => {
      document.documentElement.classList.remove("is-shade-grab");
      if (shadeBox) shadeBox.style.cursor = "";
      input.style.cursor = "";
    };
    if (shadeBox) shadeBox.addEventListener("pointerdown", grabOn, true);
    input.addEventListener("pointerdown", () => {
      pushOnce();
      grabOn();
    });
    input.addEventListener("input", () => {
      pushOnce();
      paintHoneyShade(Number(input.value));
    });
    const end = () => {
      gesture = false;
      grabOff();
    };
    document.addEventListener("pointerup", end);
    document.addEventListener("pointercancel", end);
    input.addEventListener("pointerup", end);
    input.addEventListener("pointercancel", end);
    input.addEventListener("change", end);
  }

  function honeyCellSizeForHost(host, forceAvail) {
    const rings = HONEY_RINGS;
    const wrap = host && host.closest ? host.closest(".gct-honey-wrap") : null;
    const inColorRow = !!(wrap && wrap.closest(".layout-color-body"));
    const denom = 2 * (Math.sqrt(3) * rings + 1);
    /* 色調整のハニカムは残り幅で縮めない。表示を拡大すると文字と同じく大きくなる */
    if (inColorRow && !(typeof forceAvail === "number" && forceAvail > 0)) {
      const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      return Math.max(3.2, (15.5 * rootPx) / denom);
    }
    const hostW = Math.max(
      0,
      (typeof forceAvail === "number" && forceAvail > 0
        ? forceAvail
        : (wrap && wrap.clientWidth) || (host && host.clientWidth) || 0)
    );
    /* 列の幅いっぱい。高さは画面の残りで頭打ち */
    let size;
    if (hostW > 8) {
      size = Math.max(3.2, (hostW - 4) / denom);
    } else {
      const avail = Math.max(120, Math.min(272, 420));
      size = Math.max(4.5, avail / denom);
    }
    const form = document.querySelector(".dash-body > .fill-form");
    if (form && wrap && wrap.getClientRects().length) {
      const padB = parseFloat(getComputedStyle(form).paddingBottom) || 0;
      const room = form.getBoundingClientRect().bottom - wrap.getBoundingClientRect().top - padB - honeyShadeReserve();
      if (room > 80) {
        const byH = (room - 4) / (3 * rings + 2);
        size = Math.min(size, Math.max(3.2, byH));
      }
    }
    return size;
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

  function appendHoneycomb(container, currentHex, onPick, forceAvail) {
    container.classList.remove("gct-honeycomb");
    container.classList.add("gct-honey-board");
    container.innerHTML = "";

    const rings = HONEY_RINGS;
    const size = honeyCellSizeForHost(container, forceAvail);
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
      btn.setAttribute("aria-label", c.hex);
      setHoverTip(btn, c.hex);
      btn.dataset.hex = c.hex;
      if (best && best.q === c.q && best.r === c.r) btn.classList.add("is-active");
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
      btn.setAttribute("aria-label", hx);
      setHoverTip(btn, hx);
      btn.dataset.hex = hx;
      if (hexDist(hx, cur) <= 8 && bestDist > 8) btn.classList.add("is-active");
      grayRow.appendChild(btn);
      buttons.push(btn);
    }

    const foot = document.createElement("div");
    foot.className = "gct-honey-foot";
    foot.appendChild(grayRow);

    container.appendChild(map);
    container.appendChild(foot);

    /* 押しながらドラッグで色が流れる。セル単位 capture だと隣マスに渡らないので board で取る */
    let scrubbing = false;
    let lastScrubHex = null;
    function pickAtPoint(clientX, clientY) {
      const el = document.elementFromPoint(clientX, clientY);
      const cell = el && el.closest ? el.closest(".gct-honey-cell") : null;
      if (!cell || !container.contains(cell)) return;
      const hex = cell.dataset.hex;
      if (!hex || hex === lastScrubHex) return;
      lastScrubHex = hex;
      markActive(cell);
      onPick(hex);
    }
    function endScrub() {
      scrubbing = false;
      lastScrubHex = null;
    }
    container.addEventListener("pointerdown", (e) => {
      const cell = e.target && e.target.closest ? e.target.closest(".gct-honey-cell") : null;
      if (!cell || !container.contains(cell)) return;
      e.preventDefault();
      scrubbing = true;
      lastScrubHex = null;
      try {
        container.setPointerCapture(e.pointerId);
      } catch (_err) {
        /* ignore */
      }
      pickAtPoint(e.clientX, e.clientY);
    });
    container.addEventListener("pointermove", (e) => {
      if (!scrubbing && e.buttons !== 1) return;
      if (!scrubbing && e.buttons === 1) scrubbing = true;
      pickAtPoint(e.clientX, e.clientY);
    });
    container.addEventListener("pointerup", endScrub);
    container.addEventListener("pointercancel", endScrub);
    container.addEventListener("lostpointercapture", endScrub);

    /* 描画後にまだはみ出す場合は1回だけ縮小し直す。色調整のハニカムは拡大で縮めない */
    const inColorRow = !!(container.closest && container.closest(".layout-color-body"));
    if (!inColorRow && forceAvail == null && container.clientWidth > 0 && map.offsetWidth > container.clientWidth + 1) {
      appendHoneycomb(container, currentHex, onPick, Math.max(120, container.clientWidth - 8));
    }
  }

  /** 分割幅・ウィンドウ変更で host 幅が変わっても、古い map サイズのまま横クリップしない */
  function ensureHoneySizeWatch(host, getCurrentHex, onPick) {
    const wrap = (host && host.closest && host.closest(".gct-honey-wrap")) || host;
    if (!host || !wrap) return;
    if (wrap._honeyRo) {
      wrap._honeyGetHex = getCurrentHex;
      wrap._honeyOnPick = onPick;
      return;
    }
    let lastW = wrap.clientWidth;
    const ro = new ResizeObserver(() => {
      const w = wrap.clientWidth;
      if (w <= 0) return;
      const inColorRow = !!(host.closest && host.closest(".layout-color-body"));
      if (store.guidedColorPhase !== "pick" && !inColorRow) return;
      const map = host.querySelector(".gct-honey-map");
      if (!map || host.clientWidth <= 0) return;
      const formNow = document.querySelector(".dash-body > .fill-form");
      let tooTall = false;
      let tooShort = false;
      if (inColorRow) {
        const expected = honeyMapWidthForSize(honeyCellSizeForHost(host));
        if (Math.abs(map.offsetWidth - expected) > 8) {
          lastW = w;
          const hex =
            typeof wrap._honeyGetHex === "function" ? wrap._honeyGetHex() : currentPickHex();
          const pick = typeof wrap._honeyOnPick === "function" ? wrap._honeyOnPick : onPick;
          appendHoneycomb(host, hex, pick);
        }
        return;
      }
      if (formNow) {
        const padB = parseFloat(getComputedStyle(formNow).paddingBottom) || 0;
        const room = formNow.getBoundingClientRect().bottom - wrap.getBoundingClientRect().top - padB - honeyShadeReserve();
        tooTall = map.offsetHeight > room + 8;
        tooShort = room > 80 && map.offsetHeight < room - 28;
      }
      if (Math.abs(w - lastW) < 6 && !tooTall && !tooShort) return;
      lastW = w;
      const hostW = host.clientWidth;
      const mapW = map.offsetWidth;
      const overflows = mapW > hostW + 1;
      const expected = honeyMapWidthForSize(honeyCellSizeForHost(host));
      const undersized = hostW > mapW + 20 && expected > mapW + 8;
      if (!overflows && !undersized && !tooTall && !tooShort) return;
      const hex =
        typeof wrap._honeyGetHex === "function" ? wrap._honeyGetHex() : currentPickHex();
      const pick = typeof wrap._honeyOnPick === "function" ? wrap._honeyOnPick : onPick;
      appendHoneycomb(host, hex, pick);
    });
    wrap._honeyGetHex = getCurrentHex;
    wrap._honeyOnPick = onPick;
    wrap._honeyRo = ro;
    ro.observe(wrap);
    const form = document.querySelector(".dash-body > .fill-form");
    if (form) ro.observe(form);
  }

  function colorPickModeKey() {
    const stepId = store.guidedColorEditStepId || "";
    const key = store.layoutColorKey || primaryColorKeyForStep(stepId) || "";
    return stepId + ":" + key;
  }

  function colorPickModeNow() {
    if (!store.colorPickMode || typeof store.colorPickMode !== "object") store.colorPickMode = {};
    return store.colorPickMode[colorPickModeKey()] || "";
  }

  function fewColorChoices() {
    const rings = HONEY_RINGS;
    const verts = [
      [rings, 0],
      [0, rings],
      [-rings, rings],
      [-rings, 0],
      [0, -rings],
      [rings, -rings]
    ];
    const corners = verts.map(function (qr) {
      return toColorInput(honeyColorAt(qr[0], qr[1], rings)).toLowerCase();
    });
    return corners.concat(["#ffffff", "#000000"]);
  }

  function renderFewColors(stepId) {
    const box = document.getElementById("color-few");
    if (!box) return;
    const key = primaryColorKeyForStep(stepId);
    const current = store.partnerPickMode
      ? partnerHexForSlot(stepId)
      : (key && store.draftColors[key]) || "#ffffff";
    const colors = fewColorChoices();
    const now = toColorInput(current).toLowerCase();
    box.innerHTML = "";
    colors.forEach(function (hex) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "color-few-swatch" + (hex === now ? " is-now" : "");
      btn.style.background = hex;
      btn.setAttribute("aria-label", hex);
      btn.addEventListener("click", function () {
        applyHoneyPick(hex);
        renderFewColors(stepId);
      });
      box.appendChild(btn);
    });
  }

  function syncColorPickModeUi(stepId) {
    const layout = document.querySelector(".gct-pick-layout");
    const few = document.getElementById("color-few");
    if (!layout) return;
    const mode = colorPickModeNow();
    layout.classList.toggle("is-mode-none", !mode);
    layout.classList.toggle("is-mode-few", mode === "few");
    layout.classList.toggle("is-mode-all", mode === "all");
    document.querySelectorAll("[data-color-pick-mode]").forEach(function (btn) {
      btn.classList.toggle("is-now", btn.getAttribute("data-color-pick-mode") === mode);
    });
    if (few) few.hidden = mode !== "few";
    if (mode === "few" && stepId) renderFewColors(stepId);
  }

  function bindColorPickMode() {
    const box = document.getElementById("color-pick-mode");
    if (!box || box.dataset.bound) return;
    box.dataset.bound = "1";
    box.addEventListener("click", function (ev) {
      const btn = ev.target.closest("[data-color-pick-mode]");
      if (!btn) return;
      if (!store.colorPickMode || typeof store.colorPickMode !== "object") store.colorPickMode = {};
      const mode = btn.getAttribute("data-color-pick-mode") || "";
      store.colorPickMode[colorPickModeKey()] = mode;
      const stepId = store.guidedColorEditStepId;
      if (stepId) renderGctPickUi(stepId, { forceHoney: true });
      if (mode === "all") {
        const hex = currentPickHex();
        if (hex) syncHoneyShadeSlider(hex);
      }
    });
  }

  function renderGctPickUi(stepId, opts) {
    opts = opts || {};
    const forceHoney = opts.forceHoney !== false;
    const key = primaryColorKeyForStep(stepId);
    const canGrad = GRADIENT_BG_KEYS.has(key);
    if (!canGrad) store.partnerPickMode = false;
    const partnerMode = !!store.partnerPickMode;
    const pickTag = document.getElementById("gct-pick-tag");
    const pickLead = document.getElementById("gct-pick-lead");
    const host = document.getElementById("gct-pick-host");
    const shadeHost = document.getElementById("gct-pick-shade-host");
    const gradBox = document.getElementById("gct-pick-grad");
    const targetMain = document.getElementById("gct-pick-target-main");
    const targetPartner = document.getElementById("gct-pick-target-partner");
    if (!host) return;
    syncColorPickModeUi(stepId);
    if (colorPickModeNow() !== "all") {
      store.partnerPickMode = false;
      if (colorPickModeNow() === "few") syncPickUndoButton();
      return;
    }
    if (pickTag) {
      pickTag.textContent = partnerMode
        ? colorStepDisplayName(stepId) + "（2色目）"
        : colorStepDisplayName(stepId);
    }
    if (pickLead) {
      pickLead.textContent = canGrad
        ? partnerMode
          ? "色選択で2色目を選びます。クリックしたままドラッグで連続確認。矢印でグラデの向きも変えられます。"
          : "色選択で現在色を選びます。クリックしたままドラッグで連続確認。グラデと2色目も選べます。"
        : "色選択で色を選びます。クリックしたままドラッグすると、連続で色を確かめられます。";
    }
    if (shadeHost) {
      shadeHost.innerHTML = "";
      shadeHost.hidden = true;
    }
    const inColorRow = !!(host.closest && host.closest(".layout-color-body"));
    if (gradBox) gradBox.hidden = inColorRow ? !(canGrad && slotGradStarted(stepId)) : !canGrad;
    if (targetPartner) targetPartner.hidden = !canGrad;
    if (targetMain) targetMain.classList.toggle("is-active", !partnerMode);
    if (targetPartner) targetPartner.classList.toggle("is-active", partnerMode);
    if (canGrad) {
      renderPickGradCompass(stepId);
    }
    updatePickMainSwatch(stepId);
    updatePickPartnerSwatch(stepId);
    syncPickUndoButton();

    const sig = String(stepId) + "|" + (partnerMode ? "p" : "m");
    const existingMap = host.querySelector(".gct-honey-map");
    const honeyReady =
      !!existingMap && host.getAttribute("data-gct-sig") === sig;
    /* 幅0で作られた／はみ出した map は skip せず作り直す（見えない・右切れの残留） */
    const inColorRowHost = !!(host.closest && host.closest(".layout-color-body"));
    const honeyLayoutBad =
      !!existingMap &&
      (existingMap.offsetWidth < 40 ||
        (!inColorRowHost && host.clientWidth > 0 && existingMap.offsetWidth > host.clientWidth + 1) ||
        honeyMapWidthForSize(honeyCellSizeForHost(host)) >
          existingMap.offsetWidth + 24);
    if (!forceHoney && honeyReady && !honeyLayoutBad) {
      return;
    }

    const current = partnerMode
      ? partnerHexForSlot(stepId)
      : store.draftColors[key] || "#ffffff";

    const onHoneyPick = (hex) => {
      applyHoneyPick(hex);
    };
    host.setAttribute("data-gct-sig", sig);
    host.innerHTML = "";
    const hostWBefore = host.clientWidth;
    appendHoneycomb(host, current, onHoneyPick);
    ensureHoneySizeWatch(
      host,
      () =>
        store.partnerPickMode
          ? partnerHexForSlot(stepId)
          : store.draftColors[key] || "#ffffff",
      onHoneyPick
    );

    const form = document.getElementById("order-form");
    const wrap = host.closest(".gct-honey-wrap") || host;
    /* 現在色・グラデが上だとハニカムが #order-form の折りたたみ外に出る → 開いた直後に見える位置へ */
    wrap.scrollIntoView({ block: "nearest", inline: "nearest" });
    if (form) {
      const fr = form.getBoundingClientRect();
      const wr = wrap.getBoundingClientRect();
      if (wr.top < fr.top + 8 || wr.top > fr.bottom - 120) {
        form.scrollTop += wr.top - fr.top - 12;
      }
    }

    /* 幅0初回／レイアウト確定後のはみ出し・過小を直し */
    const refitIfNeeded = () => {
      const map = host.querySelector(".gct-honey-map");
      if (!map) return false;
      const hostW = host.clientWidth;
      const mapW = map.offsetWidth;
      const need =
        hostWBefore < 40 ||
        mapW < 40 ||
        hostW > hostWBefore + 16 ||
        mapW > hostW + 1 ||
        (hostW > 0 && honeyMapWidthForSize(honeyCellSizeForHost(host)) > mapW + 24);
      if (!need) return false;
      appendHoneycomb(host, current, onHoneyPick);
      host.setAttribute("data-gct-sig", sig);
      return true;
    };
    window.requestAnimationFrame(() => {
      refitIfNeeded();
      window.requestAnimationFrame(() => {
        refitIfNeeded();
      });
    });
  }

  function syncDetailDashVisibility(activeId) {
    if (store.siteColorMode !== "detail") {
      form.querySelectorAll(":scope > details.dash-block").forEach((d) => {
        const sid = d.getAttribute("data-step-id");
        if (!sid) return;
        if (sid === FONT_STEP_ID) {
          d.hidden = true;
          d.open = false;
          d.classList.remove("is-active-step", "is-wizard-active");
          return;
        }
        if (INTRO_STEP_IDS.has(sid) || sid === "layout") {
          d.hidden = true;
          d.open = false;
          d.classList.remove("is-active-step", "is-wizard-active");
          return;
        }
        d.hidden = false;
      });
      return;
    }
    const active = activeId || store.selfEditingStepId || "layout";
    store.selfEditingStepId = active;
    form.querySelectorAll(":scope > details.dash-block").forEach((d) => {
      const sid = d.getAttribute("data-step-id");
      if (sid === FONT_STEP_ID) {
        d.hidden = true;
        d.open = false;
        d.classList.remove("is-active-step", "is-wizard-active");
        return;
      }
      const on = sid === active;
      d.hidden = !on;
      d.open = on;
      d.classList.toggle("is-active-step", on);
      d.classList.toggle("is-wizard-active", on);
    });
  }

  /** 作業の出口：1段上へ戻る（場所＝できること／やりたいこと＝どこを？または一覧） */
  function returnToLayoutHub() {
    closeItemGrowModal();
    forceClearLayoutDragUi();
    store.partnerPickMode = false;
    store.guidedColorEditStepId = null;
    store.guidedColorReturnPreset = false;
    if (store.guidedColorPhase === "pick") {
      store.guidedColorPhase = "preset";
    }
    try {
      syncGuidedColorTrial();
    } catch (err) {
      /* ignore */
    }
    if (store.siteColorMode !== "detail") {
      openDetailLayoutHub();
      return;
    }
    /* やりたいことルート：編集の1段上は「どこを？」または一覧 */
    if (store.hubEntryRoute === "task" && store.hubTaskId) {
      const task = HUB_TASKS.find((t) => t.id === store.hubTaskId);
      const targets = task ? getHubTaskTargets(task.kind) : [];
      if (targets.length > 1) {
        store.hubUiMode = "task-where";
        store.selfEditingStepId = "layout";
        store.hubPlacePickMode = false;
        syncDetailDashVisibility("layout");
        renderHubTaskWhereNames(targets);
        syncHubEntryPanels();
        updateWizardUi();
        return;
      }
      enterHubTaskPick();
      return;
    }
    /* 場所ルート：編集の1段上は「できること」 */
    const blockId = store.hubReturnBlockId || store.hubPlaceSelectedBlockId;
    if (blockId) {
      pickHubPlaceBlock(blockId);
      return;
    }
    openDetailLayoutHub();
  }

  function showSelfList(anchorStepId) {
    /* セルフ一覧は廃止。場所ルート中はできることへ、それ以外はハブホーム */
    if (store.siteColorMode === "detail") {
      returnToLayoutHub();
      return;
    }
    if (canOpenStep("finish")) {
      openSelfStep("finish");
      return;
    }
    store.selfEditingStepId = "finish";
    switchToDashTab();
    hideWizardFootPanel();
    updateWizardUi();
    applyLiveColors(false);
    applyAllConfirmed();
    scheduleSave();
  }

  function ensureHubStepActionBars() {
    /* 「並び替えに戻る」は確定と二重になるため出さない。出口は確定のみ */
    form.querySelectorAll(".hub-step-actions").forEach((bar) => {
      bar.hidden = true;
    });
  }

  function focusFontRole(role) {
    if (!role) return;
    window.setTimeout(() => {
      const target = document.querySelector(
        '.font-picker-block[data-font-role="' + role + '"]'
      );
      if (!target || target.hidden) return;
      document.querySelectorAll(".font-picker-block[data-font-role]").forEach((other) => {
        setFontPickerOpen(other, other === target);
      });
      target.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 80);
  }

  const FONT_ROLE_BY_STEP = {
    "logo-text": "display",
    "hero-text": "catch",
    "values-text": "body",
    "about-text": "body",
    "works-text": "body",
    "contact-text": "body"
  };
  const STEP_FOR_FONT_ROLE = {
    display: "logo-text",
    catch: "hero-text",
    body: "about-text"
  };

  function parkFontPickersInReservoir() {
    const reservoir = document.getElementById("site-fonts-reservoir");
    if (!reservoir) return;
    document.querySelectorAll(".font-picker-block[data-font-role]").forEach((block) => {
      if (block.parentElement !== reservoir) reservoir.appendChild(block);
      block.hidden = true;
      setFontPickerOpen(block, false);
    });
  }

  function placeFontPickersForStep(stepId) {
    const role = FONT_ROLE_BY_STEP[stepId];
    const reservoir = document.getElementById("site-fonts-reservoir");
    document.querySelectorAll(".font-picker-block[data-font-role]").forEach((block) => {
      const blockRole = block.getAttribute("data-font-role");
      if (role && blockRole === role) {
        const host = form.querySelector(
          '.dash-block[data-step-id="' + stepId + '"] [data-font-host="' + role + '"]'
        );
        if (host && block.parentElement !== host) host.appendChild(block);
        block.hidden = false;
        setFontPickerOpen(block, false);
      } else {
        if (reservoir && block.parentElement !== reservoir) reservoir.appendChild(block);
        block.hidden = true;
        setFontPickerOpen(block, false);
      }
    });
    syncFontPickerCurrentLabels();
  }

  function focusFontRoleFromBlock(block) {
    const pending = store.pendingFontRoleFocus;
    store.pendingFontRoleFocus = null;
    /* 書体ジャンプだけ開く。通常入場は閉じたまま（下地の発見性・縦の圧迫を避ける） */
    if (pending) {
      focusFontRole(pending);
      return;
    }
    if (!block) return;
    const stepId = block.getAttribute("data-step-id");
    if (!FONT_ROLE_BY_STEP[stepId]) return;
    document.querySelectorAll(".font-picker-block[data-font-role]").forEach((other) => {
      setFontPickerOpen(other, false);
    });
  }

  function setupFontJumpButtons() {
    if (window.__fontJumpBound) return;
    window.__fontJumpBound = true;
    document.addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-font-jump]");
      if (!btn) return;
      ev.preventDefault();
      ev.stopPropagation();
      const role = btn.getAttribute("data-font-jump");
      const targetStep = STEP_FOR_FONT_ROLE[role] || "about-text";
      store.pendingFontRoleFocus = role;
      openSelfStep(targetStep);
    });
  }

  function openDetailLayoutHub() {
    if (typeof window.closeAtelierMenu === "function") window.closeAtelierMenu();
    switchToDashTab();
    store.selfEditingStepId = "layout";
    store.partnerPickMode = false;
    store.guidedColorReturnPreset = false;
    store.guidedColorEditStepId = null;
    if (store.guidedColorPhase === "pick") {
      store.guidedColorPhase = "preset";
    }
    if (store.siteColorMode === "detail") {
      store.uiMode = "self";
      applyUiMode();
    }
    resetHubPlaceUi({ keepHub: true, mode: "home" });
    parkFontPickersInReservoir();
    mountSharedImageUi(false);
    placeLookControls();
    syncDetailDashVisibility("layout");
    syncGuidedColorTrial();
    renderLayoutArrangeWire();
    syncHubEntryPanels();
    syncDashResumeNotice();
    updateWizardUi();
    if (typeof window.setPreviewWidthStepById === "function") {
      window.setPreviewWidthStepById("desktop");
    } else if (typeof window.applyPreviewWidthFromPane === "function") {
      window.applyPreviewWidthFromPane();
    }
    syncHubShellFocus();
    placePreviewWidthControl();
    const block = form.querySelector('.dash-block[data-step-id="layout"]');
    const dashBody = document.querySelector(".dash-body");
    if (dashBody && block) {
      window.requestAnimationFrame(() => {
        dashBody.scrollTo({ top: Math.max(0, block.offsetTop - 8), behavior: "smooth" });
      });
    }
  }

  /** 編集ハブ：場所／レイアウト入口。Fitは共通俯瞰演出 */
  function clearHubPlaceFit(opts) {
    const keepMode = !!(opts && opts.keepMode);
    const scroll = document.querySelector(".preview-scroll");
    if (!keepMode) document.body.classList.remove("hub-place-pick");
    if (scroll) scroll.classList.remove("is-hub-place-fit");
    root.querySelectorAll("[data-layout-block].is-hub-place-hot").forEach((el) => {
      el.classList.remove("is-hub-place-hot");
    });
    if (!keepMode) {
      root.querySelectorAll("[data-layout-block].is-hub-place-chosen").forEach((el) => {
        el.classList.remove("is-hub-place-chosen");
      });
    }
    store.hubPlaceFitScale = 1;
    if (!keepMode && typeof window.applyPreviewWidthFromPane === "function") {
      window.applyPreviewWidthFromPane();
    } else if (typeof window.applyPreviewFrameScale === "function") {
      window.applyPreviewFrameScale({
        placeFit: !!store.hubPlacePickMode || store.hubUiMode === "layout"
      });
    }
  }

  function applyHubPlaceFit() {
    const scroll = document.querySelector(".preview-scroll");
    if (!scroll || !viewport || !root) return;
    const mode = store.hubUiMode || "home";
    const fitModes = mode === "place-list" || mode === "task-list" || mode === "layout";
    if (!fitModes) return;
    /* 場所一覧だけ薄い／ホット。レイアウトはズームのみ（濃さはそのまま） */
    if (mode === "layout") {
      document.body.classList.remove("hub-place-pick");
    } else {
      document.body.classList.add("hub-place-pick");
    }
    scroll.classList.add("is-hub-place-fit");
    scroll.scrollTop = 0;
    scroll.scrollLeft = 0;
    window.requestAnimationFrame(() => {
      const still =
        store.hubUiMode === "place-list" ||
        store.hubUiMode === "task-list" ||
        store.hubUiMode === "layout";
      if (!still) return;
      const scale =
        typeof window.applyPreviewFrameScale === "function"
          ? window.applyPreviewFrameScale({ placeFit: true })
          : 1;
      store.hubPlaceFitScale = scale;
      if (store.hubUiMode === "layout") {
        root.querySelectorAll("[data-layout-block].is-hub-place-hot").forEach((el) => {
          el.classList.remove("is-hub-place-hot");
        });
        return;
      }
      root.querySelectorAll("[data-layout-block]").forEach((el) => {
        const id = el.getAttribute("data-layout-block");
        const meta = LAYOUT_BLOCKS.find((b) => b.id === id);
        if (!meta || !isLayoutBlockActive(meta) || el.hidden) {
          el.classList.remove("is-hub-place-hot");
          return;
        }
        el.classList.add("is-hub-place-hot");
      });
    });
  }

  function syncHubShellFocus() {
    const editingHubStep =
      store.siteColorMode === "detail" &&
      store.intakeDone &&
      store.uiMode === "self" &&
      store.selfEditingStepId &&
      store.selfEditingStepId !== "finish" &&
      store.selfEditingStepId !== "purpose" &&
      store.selfEditingStepId !== "guide";
    /* レイアウト殻（入口・一覧）以外の個別編集中＝戻る｜OK を出す */
    const hubContentEdit =
      !!editingHubStep && store.selfEditingStepId !== "layout";
    document.body.classList.toggle("hub-shell-focus", !!editingHubStep);
    document.body.classList.toggle("hub-place-editing", hubContentEdit);

    const title = document.querySelector(".dash-title");
    if (!title) return;
    if (!editingHubStep) {
      title.textContent = "注文画面";
      return;
    }
    const mode = store.hubUiMode || "home";
    if (mode === "home" && store.selfEditingStepId === "layout") {
      title.textContent = "編集ハブ";
      return;
    }
    if (mode === "place-list") {
      title.textContent = "場所を選ぶ";
      return;
    }
    if (mode === "place-actions") {
      title.textContent = "できること";
      return;
    }
    if (mode === "task-list") {
      title.textContent = "やりたいこと";
      return;
    }
    if (mode === "task-where") {
      title.textContent = "どこを？";
      return;
    }
    if (mode === "layout") {
      title.textContent = "レイアウト変更";
      return;
    }
    if (mode === "studio-review") {
      title.textContent = "レビュー";
      return;
    }
    const step = STEPS.find((s) => s.id === store.selfEditingStepId);
    title.textContent = step ? step.label : "編集";
  }

  function syncHubEntryPanels() {
    const entry = document.getElementById("hub-entry");
    const pick = document.getElementById("hub-place-pick");
    const section = document.getElementById("hub-place-section");
    const taskPick = document.getElementById("hub-task-pick");
    const taskWhere = document.getElementById("hub-task-where");
    const stack = document.getElementById("hub-layout-stack");
    const studio = document.getElementById("hub-studio-stack");
    const onLayout =
      store.siteColorMode === "detail" && store.selfEditingStepId === "layout";
    const mode = store.hubUiMode || "home";
    const atHome = onLayout && mode === "home";
    const atPlaceList = onLayout && mode === "place-list";
    const atPlaceActions = onLayout && mode === "place-actions";
    const atTaskList = onLayout && mode === "task-list";
    const atTaskWhere = onLayout && mode === "task-where";
    const atLayout = onLayout && mode === "layout";
    const atStudio = onLayout && mode === "studio-review";

    const setPanel = (el, show) => {
      if (!el) return;
      el.hidden = !show;
      el.setAttribute("aria-hidden", show ? "false" : "true");
      if (show) {
        el.removeAttribute("hidden");
      } else {
        el.setAttribute("hidden", "");
      }
    };
    setPanel(entry, atHome);
    setPanel(pick, atPlaceList);
    setPanel(section, atPlaceActions);
    setPanel(taskPick, atTaskList);
    setPanel(taskWhere, atTaskWhere);
    setPanel(stack, atLayout);
    setPanel(studio, atStudio);
    document.body.classList.toggle("hub-place-section-open", atPlaceActions);
    document.body.classList.toggle("hub-ui-layout", atLayout);
    document.body.classList.toggle("hub-ui-studio", atStudio);
    store.hubPlacePickMode = atPlaceList || atTaskList;
    syncHubShellFocus();
    placeLookControls();
    placePreviewWidthControl();
    if (!atLayout && typeof restoreLayoutSectionInputs === "function") {
      restoreLayoutSectionInputs();
    }
    if (atLayout || atPlaceList || atTaskList) {
      applyHubPlaceFit();
    } else if (!atPlaceActions && !atStudio) {
      clearHubPlaceFit({ keepMode: atPlaceActions });
    }
  }

  function resetHubPlaceUi(opts) {
    const keepHub = !!(opts && opts.keepHub);
    const mode = (opts && opts.mode) || "home";
    store.hubUiMode = mode;
    store.hubPlacePickMode = mode === "place-list" || mode === "task-list";
    store.hubPlaceSelectedBlockId = null;
    store.hubTaskId = null;
    if (mode === "home" || mode === "layout" || mode === "place-list" || mode === "task-list") {
      store.hubReturnBlockId = null;
    }
    if (mode === "home" || mode === "layout") {
      store.hubEntryRoute = null;
    }
    clearHubPlaceFit();
    document.body.classList.remove("hub-place-section-open", "hub-ui-layout");
    const actions = document.getElementById("hub-place-section-actions");
    if (actions) actions.innerHTML = "";
    const names = document.getElementById("hub-place-names");
    if (names) names.innerHTML = "";
    const taskNames = document.getElementById("hub-task-names");
    if (taskNames) taskNames.innerHTML = "";
    const whereNames = document.getElementById("hub-task-where-names");
    if (whereNames) whereNames.innerHTML = "";
    if (keepHub) syncHubEntryPanels();
  }

  function renderHubPlaceNames() {
    const host = document.getElementById("hub-place-names");
    if (!host) return;
    host.innerHTML = "";
    LAYOUT_BLOCKS.forEach((meta) => {
      if (!isLayoutBlockActive(meta)) return;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "hub-place-name-btn";
      btn.setAttribute("data-hub-place-block", meta.id);
      btn.setAttribute("role", "listitem");
      btn.textContent = layoutBlockDisplayLabel(meta);
      host.appendChild(btn);
    });
  }

  function enterHubPlacePick() {
    if (store.siteColorMode !== "detail") return;
    store.hubUiMode = "place-list";
    store.hubEntryRoute = "place";
    store.hubPlacePickMode = true;
    store.hubPlaceSelectedBlockId = null;
    store.hubReturnBlockId = null;
    store.hubTaskId = null;
    store.selfEditingStepId = "layout";
    syncDetailDashVisibility("layout");
    renderHubPlaceNames();
    syncHubEntryPanels();
    applyHubPlaceFit();
    updateWizardUi();
  }

  function isLocalStudioHost() {
    const h = location.hostname;
    return h === "127.0.0.1" || h === "localhost" || h === "[::1]";
  }

  function enterHubStudioReview() {
    if (!isLocalStudioHost()) {
      window.alert("レビューはローカル（localhost）専用です。");
      return;
    }
    const url = new URL(location.href);
    url.searchParams.set("review", "1");
    location.assign(url.pathname + "?" + url.searchParams.toString() + url.hash);
  }

  function exitHubStudioReview() {
    document.documentElement.classList.remove("is-review-mode");
    document.body.classList.remove("is-review-mode", "review-view-fit", "hub-ui-studio", "is-review-editing");
    const chrome = document.getElementById("review-chrome");
    if (chrome) chrome.hidden = true;
    const editBar = document.getElementById("review-edit-bar");
    if (editBar) editBar.hidden = true;
    returnHubHome();
    placePreviewWidthControl();
  }

  function setStudioStatus(msg) {
    const status = document.getElementById("studio-import-status");
    if (status) status.textContent = msg || "";
    const reviewStatus = document.getElementById("review-json-status");
    if (reviewStatus) reviewStatus.textContent = msg || "";
  }

  function buildDraftPayload() {
    return {
      version: 17,
      savedAt: new Date().toISOString(),
      wizardStepIndex: store.wizardStepIndex,
      selfEditingStepId: store.selfEditingStepId,
      uiMode: store.uiMode,
      sitePurpose: store.sitePurpose,
      layoutPattern: store.layoutPattern,
      layoutOrder: normalizeLayoutOrder(store.layoutOrder),
      layoutSelected: !!store.layoutSelected,
      layoutSchema: 2,
      itemLayouts: store.itemLayouts
        ? JSON.parse(JSON.stringify(store.itemLayouts))
        : defaultItemLayouts(),
      itemOrders: JSON.parse(JSON.stringify(store.itemOrders || {})),
      itemOrderParked: JSON.parse(JSON.stringify(store.itemOrderParked || {})),
      heroTextOnPhoto: !!store.heroTextOnPhoto,
      heroImageOff: !!store.heroImageOff,
      heroFocalX: normalizeFocalPercent(store.heroFocalX, HERO_FOCAL_X_DEFAULT),
      heroFocalY: normalizeFocalPercent(store.heroFocalY, HERO_FOCAL_Y_DEFAULT),
      heroImageScale: normalizeImageScale(store.heroImageScale),
      aboutItemsDisplay: normalizeAboutItemsDisplay(store.aboutItemsDisplay),
      heroTextPlate: normalizeHeroPlate(store.heroTextPlate),
      heroTextPlateLast: heroPlateLastShape(),
      heroTextPlateTone: normalizeHeroPlateTone(store.heroTextPlateTone),
      heroTextPos: normalizeHeroTextPos(store.heroTextPos),
      finishLockedOnce: store.finishLockedOnce,
      guidedImageUnlocked: store.guidedImageUnlocked,
      guidedTextUnlocked: store.guidedTextUnlocked,
      presetChosen: store.presetChosen,
      colorListOrder: Array.isArray(store.colorListOrder) ? store.colorListOrder.slice() : null,
      chosenPresetKey: store.chosenPresetKey,
      vibeColors: store.vibeColors,
      vibeReasons: store.vibeReasons,
      vibeText: store.vibeText,
      intakeDone: store.intakeDone,
      saveMode: store.saveMode === "folder" || store.saveMode === "browser" ? store.saveMode : null,
      projectFolderName: store.projectFolderName || "",
      entryBranch: store.entryBranch,
      blankCanvas: !!store.blankCanvas,
      hubEntrySource: store.hubEntrySource,
      easyFlowActive: !!store.easyFlowActive,
      easyDirectOpen: !!store.easyDirectOpen,
      easyKusudamaPlayed: !!store.easyKusudamaPlayed,
      announceLinkOn: !!store.announceLinkOn,
      workLinkOn: Object.assign({}, store.workLinkOn || {}),
      sampleFinishNoBack: !!store.sampleFinishNoBack,
      easyBasicsApplied: !!store.easyBasicsApplied,
      siteNameConfirmed: !!store.siteNameConfirmed,
      easyBasicsHints: store.easyBasicsHints
        ? {
            brand: String(store.easyBasicsHints.brand || ""),
            intro: String(store.easyBasicsHints.intro || ""),
            email: String(store.easyBasicsHints.email || ""),
            phone: String(store.easyBasicsHints.phone || ""),
            hours: String(store.easyBasicsHints.hours || ""),
            address: String(store.easyBasicsHints.address || "")
          }
        : null,
      sampleFlowEntered: !!store.sampleFlowEntered,
      sampleFlowAppliedId: store.sampleFlowAppliedId || null,
      sampleOriginalPreset: store.sampleOriginalPreset || null,
      sushiSampleId: store.sushiSampleId,
      sushiSampleKey: store.sushiSampleKey,
      sampleSectionCandidates: store.sampleSectionCandidates || {},
      sampleSectionSelected: store.sampleSectionSelected || {},
      easyAnswers: store.easyAnswers || { mood: "calm", focus: "quality", guest: "first" },
      easyCopyCandidates: store.easyCopyCandidates || [],
      easyCopySelected: store.easyCopySelected,
      siteColorMode: store.siteColorMode,
      slotGradients: store.slotGradients || {},
      slotGradientPartners: store.slotGradientPartners || {},
      gradDirHintSkip: !!store.gradDirHintSkip,
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
        hours: !!(store.draftExtras && store.draftExtras.hours),
        access: !!(store.draftExtras && store.draftExtras.access),
        address: !!(store.draftExtras && store.draftExtras.address),
        announce: !!(store.draftExtras && store.draftExtras.announce)
      },
      layoutBlockOff: Object.assign({}, store.layoutBlockOff || {}),
      draftContact: { ...store.draftContact },
      confirmed: store.confirmed,
      snapshots: store.snapshots,
      fields: formToObject({ includeHidden: true }),
      fonts: {
        display: fieldValue("font_display"),
        catch: fieldValue("font_catch"),
        body: fieldValue("font_body")
      },
      imagePaths: store.studioImagePaths ? Object.assign({}, store.studioImagePaths) : undefined
    };
  }

  const SAMPLE_DRAFT_KEEP_KEYS = [
    "blurb",
    "scene",
    "layoutRecipeNote",
    "brushUpHero",
    "brushUpStructure",
    "brushUpMeaning",
    "brushUpFocal",
    "brushUpPhoto",
    "brushUpColor",
    "structureRole",
    "structureFace",
    "structureInvite",
    "structureMemory",
    "structureAbsent"
  ];

  function isRelativeSushiImagePath(v) {
    return typeof v === "string" && v.indexOf("sushi-samples/") === 0 && v.indexOf("blob:") < 0;
  }

  /** 見本フォルダへ書く正本。studio-pack 包み・客 order 形は含めない */
  function buildCanonicalSampleDraft(baseDraft) {
    const payload = buildDraftPayload();
    delete payload.wizardStepIndex;
    delete payload.selfEditingStepId;
    delete payload.finishLockedOnce;
    delete payload.vibeColors;
    delete payload.vibeReasons;
    delete payload.vibeText;
    delete payload.sampleSectionCandidates;
    delete payload.sampleSectionSelected;
    delete payload.easyAnswers;
    delete payload.easyCopyCandidates;
    delete payload.easyCopySelected;
    delete payload.randomHistory;
    delete payload.guidedColorPhase;
    delete payload.guidedColorReturnPreset;
    delete payload.guidedColorEditStepId;
    delete payload.guidedColorDeckIdx;
    delete payload.guidedColorDeck;
    delete payload.guidedColorTrial;
    delete payload.colorCodes;
    delete payload.colorModes;
    delete payload.draftContact;
    delete payload.snapshots;
    SAMPLE_DRAFT_KEEP_KEYS.forEach(function (k) {
      if (baseDraft && baseDraft[k] !== undefined) payload[k] = baseDraft[k];
    });
    const paths = {};
    function takePaths(src) {
      if (!src || typeof src !== "object") return;
      Object.keys(src).forEach(function (k) {
        if (isRelativeSushiImagePath(src[k])) paths[k] = src[k];
      });
    }
    takePaths(baseDraft && baseDraft.imagePaths);
    takePaths(store.studioImagePaths);
    takePaths(payload.imagePaths);
    if (Object.keys(paths).length) payload.imagePaths = paths;
    else delete payload.imagePaths;
    payload.savedAt = new Date().toISOString();
    return payload;
  }

  function buildStudioPack(note) {
    const draft = buildDraftPayload();
    if (!draft.imagePaths) delete draft.imagePaths;
    return {
      packVersion: 1,
      kind: "sample1man-studio-pack",
      exportedAt: new Date().toISOString(),
      sampleId: store.sushiSampleId || null,
      sampleKey: store.sushiSampleKey || null,
      note: note || "",
      draft: draft
    };
  }

  function looksLikeCustomerOrder(obj) {
    if (!obj || typeof obj !== "object") return false;
    if (obj.kind === "sample1man-order") return true;
    if (obj.freeRevisionNote != null || obj.colorFinalAck != null) return true;
    return false;
  }

  function parseStudioJson(obj) {
    if (!obj || typeof obj !== "object") {
      throw new Error("JSON is invalid");
    }
    if (looksLikeCustomerOrder(obj)) {
      const draft =
        obj.kind === "sample1man-order" && obj.draft && typeof obj.draft === "object"
          ? obj.draft
          : obj;
      return {
        role: "order",
        draft: draft,
        note: obj.note || "",
        sampleId: null,
        sampleKey: null
      };
    }
    if (obj.kind === "sample1man-studio-pack" && obj.draft && typeof obj.draft === "object") {
      return {
        role: "pack",
        draft: obj.draft,
        note: obj.note || "",
        sampleId: obj.sampleId || obj.draft.sushiSampleId || null,
        sampleKey: obj.sampleKey || obj.draft.sushiSampleKey || null
      };
    }
    if (obj.fields || obj.draftColors || obj.version || obj.layoutPattern) {
      return {
        role: "draft",
        draft: obj,
        note: "",
        sampleId: obj.sushiSampleId || null,
        sampleKey: obj.sushiSampleKey || null
      };
    }
    throw new Error("not studio-pack or draft.json");
  }

  function applyStudioDraft(draft) {
    if (!draft || typeof draft !== "object") {
      throw new Error("draftが空です");
    }
    hideEntryGate();
    setSampleFlowPreviewHidden(false);
    document.body.classList.remove("sample-flow-hide-preview");
    store.intakeDone = true;
    store.easyFlowActive = false;
    store.uiMode = "self";
    store.siteColorMode = draft.siteColorMode === "easy" ? "easy" : "detail";
    if (draft.sitePurpose) store.sitePurpose = draft.sitePurpose;
    if (draft.confirmed && typeof draft.confirmed === "object") {
      Object.keys(draft.confirmed).forEach(function (k) {
        store.confirmed[k] = !!draft.confirmed[k];
      });
    }
    applySushiSampleDraft(draft);
    if (draft.imagePaths && typeof draft.imagePaths === "object") {
      store.studioImagePaths = Object.assign({}, draft.imagePaths);
      applyDraftImagePaths(draft.imagePaths);
    }
    applyLiveColors(true);
    applyAllConfirmed();
    applyHeroImageOffState();
    syncPreviewHeaderChrome();
    scheduleSave();
  }

  function normalizeResumeDraft(raw) {
    if (!raw || typeof raw !== "object") {
      throw new Error("order.json が空です");
    }
    const draft = Object.assign({}, raw);
    if (draft.draft && typeof draft.draft === "object" && draft.kind === "sample1man-order") {
      return normalizeResumeDraft(draft.draft);
    }
    if (draft.extras && typeof draft.extras === "object" && !draft.draftExtras) {
      draft.draftExtras = {
        hours: !!draft.extras.hours,
        access: !!draft.extras.access,
        address: !!draft.extras.address,
        announce: !!draft.extras.announce
      };
    }
    if (draft.counts && typeof draft.counts === "object" && !draft.draftCounts) {
      draft.draftCounts = draft.counts;
    }
    if (!draft.siteColorMode) draft.siteColorMode = "detail";
    if (!draft.sitePurpose) draft.sitePurpose = "shop";
    return draft;
  }

  function listOrderFileInputNames() {
    const names = [];
    form.querySelectorAll('input[type="file"]').forEach(function (input) {
      if (!input || !input.name) return;
      if (input.id === "entry-resume-zip" || input.id === "review-json-import-input") return;
      names.push(input.name);
    });
    names.sort(function (a, b) {
      return b.length - a.length;
    });
    return names;
  }

  function matchZipImageToInputName(entryName, inputNames) {
    const base = String(entryName || "")
      .replace(/\\/g, "/")
      .replace(/^images\//i, "")
      .replace(/^.*\//, "");
    if (!base) return null;
    for (let i = 0; i < inputNames.length; i += 1) {
      const name = inputNames[i];
      if (base === name) return name;
      if (base.indexOf(name + "_") === 0) return name;
      if (base.indexOf(name + ".") === 0) return name;
    }
    return null;
  }

  function assignResumeImageFile(inputName, file) {
    if (!inputName || !file) return;
    if (!store.zipImageFiles) store.zipImageFiles = {};
    store.zipImageFiles[inputName] = file;
    const input = form.elements.namedItem(inputName);
    if (input && input.tagName === "INPUT" && input.type === "file") {
      try {
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
      } catch (e) {
        /* file input へ戻せなくてもプレビュー用に保持 */
      }
    }
    setImageUrl(inputName, file);
    applyImageSlotByName(inputName, true);
  }

  async function applyResumeZipImages(zip) {
    const inputNames = listOrderFileInputNames();
    const paths = Object.keys(zip.files || {});
    let applied = 0;
    for (let i = 0; i < paths.length; i += 1) {
      const path = paths[i];
      const entry = zip.files[path];
      if (!entry || entry.dir) continue;
      const norm = String(path).replace(/\\/g, "/");
      if (!/^images\//i.test(norm)) continue;
      const inputName = matchZipImageToInputName(norm, inputNames);
      if (!inputName) continue;
      const blob = await entry.async("blob");
      const leaf = norm.replace(/^.*\//, "") || inputName + ".img";
      const fileName = leaf.indexOf(inputName + "_") === 0 ? leaf.slice(inputName.length + 1) : leaf;
      const type = blob.type || guessImageMime(fileName);
      const file = new File([blob], fileName || leaf, { type: type });
      assignResumeImageFile(inputName, file);
      applied += 1;
    }
    syncLogoPresentation();
    return applied;
  }

  function guessImageMime(name) {
    const lower = String(name || "").toLowerCase();
    if (lower.endsWith(".png")) return "image/png";
    if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
    if (lower.endsWith(".webp")) return "image/webp";
    if (lower.endsWith(".gif")) return "image/gif";
    if (lower.endsWith(".svg")) return "image/svg+xml";
    return "application/octet-stream";
  }

  function setEntryResumeStatus(msg) {
    const el = document.getElementById("entry-resume-status");
    if (el) el.textContent = msg || "";
  }

  async function loadResumeZipFile(file) {
    if (!file) {
      throw new Error("ZIPファイルを選んでください。");
    }
    if (!window.JSZip) {
      throw new Error("ZIP用ライブラリの読み込みに失敗しました。");
    }
    let zip;
    try {
      zip = await window.JSZip.loadAsync(file);
    } catch (e) {
      throw new Error("ZIPを開けません。ファイルが違うか、壊れている可能性があります。");
    }
    const orderEntry =
      zip.file("order.json") ||
      zip.file("Order.json") ||
      Object.keys(zip.files || {})
        .filter(function (p) {
          return /(^|\/)order\.json$/i.test(p) && !zip.files[p].dir;
        })
        .map(function (p) {
          return zip.file(p);
        })[0];
    if (!orderEntry) {
      throw new Error("order.json がありません。制作データのZIPか確認してください。");
    }
    let rawText;
    try {
      rawText = await orderEntry.async("string");
    } catch (e) {
      throw new Error("order.json を読めません。");
    }
    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch (e) {
      throw new Error("order.json が壊れているようです。");
    }
    let parsedPack;
    try {
      parsedPack = parseStudioJson(parsed);
    } catch (e) {
      throw new Error("このファイルは制作データとして読めません。");
    }
    const draft = normalizeResumeDraft(parsedPack.draft || parsed);
    if (!draft.fields && !draft.draftColors && !draft.layoutPattern) {
      throw new Error("このZIPには復元できる設定がありません。");
    }
    store.zipImageFiles = {};
    applyStudioDraft(draft);
    await applyResumeZipImages(zip);
    store.hubEntrySource = "detail-entry";
    store.entryBranch = "detail";
    store.layoutSelected = true;
    if (!store.saveMode) store.saveMode = "browser";
    syncDashResumeNotice();
    openDetailLayoutHub();
    scheduleSave();
    return true;
  }

  const FOLDER_HANDLE_DB = "sample-1man-fs";
  const FOLDER_HANDLE_STORE = "handles";
  const FOLDER_HANDLE_KEY = "projectDir";
  let folderWriteTimer = null;
  let folderWriteInFlight = false;
  let folderWriteQueued = false;

  function supportsDirectoryPicker() {
    return typeof window.showDirectoryPicker === "function";
  }

  function openFolderHandleDb() {
    return new Promise(function (resolve, reject) {
      const req = indexedDB.open(FOLDER_HANDLE_DB, 1);
      req.onupgradeneeded = function () {
        const db = req.result;
        if (!db.objectStoreNames.contains(FOLDER_HANDLE_STORE)) {
          db.createObjectStore(FOLDER_HANDLE_STORE);
        }
      };
      req.onsuccess = function () {
        resolve(req.result);
      };
      req.onerror = function () {
        reject(req.error || new Error("IndexedDBを開けません"));
      };
    });
  }

  async function idbSetFolderHandle(handle) {
    const db = await openFolderHandleDb();
    return new Promise(function (resolve, reject) {
      const tx = db.transaction(FOLDER_HANDLE_STORE, "readwrite");
      tx.objectStore(FOLDER_HANDLE_STORE).put(handle, FOLDER_HANDLE_KEY);
      tx.oncomplete = function () {
        db.close();
        resolve();
      };
      tx.onerror = function () {
        db.close();
        reject(tx.error || new Error("フォルダ権限の保存に失敗"));
      };
    });
  }

  async function idbGetFolderHandle() {
    const db = await openFolderHandleDb();
    return new Promise(function (resolve, reject) {
      const tx = db.transaction(FOLDER_HANDLE_STORE, "readonly");
      const req = tx.objectStore(FOLDER_HANDLE_STORE).get(FOLDER_HANDLE_KEY);
      req.onsuccess = function () {
        db.close();
        resolve(req.result || null);
      };
      req.onerror = function () {
        db.close();
        reject(req.error || new Error("フォルダ権限の読込に失敗"));
      };
    });
  }

  async function idbClearFolderHandle() {
    try {
      const db = await openFolderHandleDb();
      await new Promise(function (resolve, reject) {
        const tx = db.transaction(FOLDER_HANDLE_STORE, "readwrite");
        tx.objectStore(FOLDER_HANDLE_STORE).delete(FOLDER_HANDLE_KEY);
        tx.oncomplete = function () {
          db.close();
          resolve();
        };
        tx.onerror = function () {
          db.close();
          reject(tx.error);
        };
      });
    } catch (e) {
      /* ignore */
    }
  }

  async function ensureFolderPermission(handle, mode) {
    if (!handle) return false;
    const want = mode === "readwrite" ? "readwrite" : "read";
    try {
      const q = await handle.queryPermission({ mode: want });
      if (q === "granted") return true;
      const r = await handle.requestPermission({ mode: want });
      return r === "granted";
    } catch (e) {
      return false;
    }
  }

  async function setProjectFolderHandle(handle, opts) {
    const options = opts || {};
    if (!handle) {
      store.folderDirHandle = null;
      store.folderDisplayName = "";
      if (!options.keepIdb) await idbClearFolderHandle();
      return false;
    }
    const mode = options.mode === "read" ? "read" : "readwrite";
    const ok = await ensureFolderPermission(handle, mode);
    if (!ok) {
      throw new Error("フォルダへのアクセスが許可されませんでした。");
    }
    store.folderDirHandle = handle;
    store.projectFileHandle = null;
    store.folderDisplayName = handle.name || "選択したフォルダ";
    if (options.persist !== false) {
      try {
        await idbSetFolderHandle(handle);
      } catch (e) {
        /* 権限はメモリ上で継続 */
      }
    }
    return true;
  }

  async function setProjectFileHandle(handle, opts) {
    const options = opts || {};
    if (!handle) {
      store.projectFileHandle = null;
      if (!options.keepIdb && !store.folderDirHandle) await idbClearFolderHandle();
      return false;
    }
    const ok = await ensureFolderPermission(handle, "readwrite");
    if (!ok) {
      throw new Error("ファイルへの保存が許可されませんでした。");
    }
    store.projectFileHandle = handle;
    store.folderDirHandle = null;
    store.folderDisplayName = handle.name || "";
    if (options.persist !== false) {
      try {
        await idbSetFolderHandle(handle);
      } catch (e) {
        /* 権限はメモリ上で継続 */
      }
    }
    return true;
  }

  function projectStamp(date) {
    const d = date || new Date();
    const p = function (n) { return String(n).padStart(2, "0"); };
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + "-" + p(d.getHours()) + "-" + p(d.getMinutes()) + "-" + p(d.getSeconds());
  }

  function defaultProjectFolderName(date) {
    return "かんたんホームページ工房-" + projectStamp(date);
  }

  function sanitizeProjectFolderName(raw) {
    let name = String(raw || "").replace(/[\\/:*?"<>|]/g, "").replace(/[\u0000-\u001f]/g, "").trim();
    name = name.replace(/[. ]+$/g, "").trim();
    if (!name) name = defaultProjectFolderName(new Date());
    return name;
  }

  function zipDownloadName() {
    if (store.saveMode === "folder") {
      const fromFile = store.projectFileHandle && store.projectFileHandle.name;
      if (fromFile && /\.zip$/i.test(fromFile)) return fromFile;
      const named = sanitizeProjectFolderName(store.projectFolderName || store.folderDisplayName || "");
      if (named) return named.replace(/\.zip$/i, "") + ".zip";
    }
    return defaultProjectFolderName(new Date()) + ".zip";
  }

  async function directoryNameTaken(parent, name) {
    try {
      await parent.getDirectoryHandle(name);
      return true;
    } catch (e) {
      return false;
    }
  }

  async function createFreshChildDir(parent, baseName) {
    const base = sanitizeProjectFolderName(baseName);
    let name = base;
    let n = 2;
    while (await directoryNameTaken(parent, name)) {
      name = base + "-" + n;
      n += 1;
      if (n > 100) throw new Error("同じ名前のフォルダが続いています。名前を変えてください。");
    }
    const handle = await parent.getDirectoryHandle(name, { create: true });
    return { handle: handle, name: name };
  }

  function syncEntryFolderNamePanel() {
    const panel = document.getElementById("entry-save-folder-name");
    const input = document.getElementById("entry-project-folder-name");
    if (!panel || !input) return;
    const folder = document.querySelector('input[name="entry_save_mode"][value="folder"]');
    const on = !!(folder && folder.checked);
    panel.hidden = !on;
    if (!on) return;
    if (!input.value.trim()) {
      const name = store.projectFolderName || defaultProjectFolderName(new Date());
      input.value = name;
      if (!store.projectFolderName) store.projectNameAuto = name;
    }
  }

  function fillProjectFolderNameForCreate() {
    const input = document.getElementById("entry-project-folder-name");
    let name = input ? String(input.value || "").trim() : "";
    if (!name || name === store.projectNameAuto) {
      name = defaultProjectFolderName(new Date());
      store.projectNameAuto = name;
      if (input) input.value = name;
    }
    return sanitizeProjectFolderName(name);
  }

  async function pickProjectFolderForSave() {
    if (typeof window.showSaveFilePicker !== "function") {
      throw new Error(
        "このブラウザでは保存画面に対応していません。残さず進むか、あとでZIPで残してください。"
      );
    }
    const wanted = fillProjectFolderNameForCreate();
    const handle = await window.showSaveFilePicker({
      id: "sample-1man-project-file",
      startIn: "documents",
      suggestedName: wanted + ".zip",
      types: [
        {
          description: "かんたんホームページ工房",
          accept: { "application/zip": [".zip"] }
        }
      ]
    });
    const rawName = String((handle && handle.name) || wanted + ".zip");
    const named = sanitizeProjectFolderName(rawName.replace(/\.zip$/i, ""));
    store.projectFolderName = named;
    store.projectNameAuto = "";
    const input = document.getElementById("entry-project-folder-name");
    if (input) input.value = named;
    await setProjectFileHandle(handle, { persist: true });
    store.saveMode = "folder";
    const wrote = await writeProjectFileNow();
    if (!wrote || !wrote.ok) {
      throw new Error("ファイルへ書き込めませんでした。");
    }
    return handle;
  }

  async function pickProjectFolderForResume() {
    if (supportsDirectoryPicker()) {
      const handle = await window.showDirectoryPicker({
        id: "sample-1man-project-resume",
        mode: "readwrite",
        startIn: "documents"
      });
      await setProjectFolderHandle(handle, { mode: "readwrite", persist: true });
      store.pendingResumeFolderFiles = null;
      return { kind: "handle", handle: handle };
    }
    const fallback = document.getElementById("entry-resume-folder-fallback");
    if (!fallback) {
      throw new Error("このブラウザではフォルダ選択に対応していません。ZIPを選んでください。");
    }
    return new Promise(function (resolve, reject) {
      const onChange = function () {
        fallback.removeEventListener("change", onChange);
        const files = fallback.files ? Array.from(fallback.files) : [];
        if (!files.length) {
          reject(new Error("フォルダが選ばれていません。"));
          return;
        }
        store.pendingResumeFolderFiles = files;
        store.folderDirHandle = null;
        const top = files[0] && files[0].webkitRelativePath
          ? String(files[0].webkitRelativePath).split("/")[0]
          : "選択したフォルダ";
        store.folderDisplayName = top;
        resolve({ kind: "files", files: files });
      };
      fallback.addEventListener("change", onChange);
      fallback.value = "";
      fallback.click();
    });
  }

  function guessExtFromFile(file, fallback) {
    const name = (file && file.name) || "";
    const m = name.match(/\.([a-z0-9]+)$/i);
    if (m) return m[1].toLowerCase();
    const type = (file && file.type) || "";
    if (type.indexOf("png") >= 0) return "png";
    if (type.indexOf("jpeg") >= 0 || type.indexOf("jpg") >= 0) return "jpg";
    if (type.indexOf("webp") >= 0) return "webp";
    if (type.indexOf("gif") >= 0) return "gif";
    return fallback || "png";
  }

  async function ensureChildDir(parent, name) {
    return parent.getDirectoryHandle(name, { create: true });
  }

  async function writeFileToDir(dirHandle, fileName, data) {
    const fh = await dirHandle.getFileHandle(fileName, { create: true });
    const writable = await fh.createWritable();
    await writable.write(data);
    await writable.close();
  }

  async function clearDirectoryFiles(dirHandle) {
    const names = [];
    try {
      for await (const entry of dirHandle.values()) {
        names.push({ name: entry.name, kind: entry.kind });
      }
    } catch (e) {
      return;
    }
    for (let i = 0; i < names.length; i += 1) {
      try {
        await dirHandle.removeEntry(names[i].name, { recursive: names[i].kind === "directory" });
      } catch (e) {
        /* 個別削除失敗は無視して上書きへ */
      }
    }
  }

  function collectResumeImageFilesMap() {
    const map = {};
    listOrderFileInputNames().forEach(function (name) {
      const fromInput = readFileInput(name);
      const fromStore = store.zipImageFiles && store.zipImageFiles[name];
      const file = fromInput || fromStore || null;
      if (file) map[name] = file;
    });
    return map;
  }

  function buildFolderOrderPayload() {
    const draft = buildDraftPayload();
    draft.colorFinalAck = true;
    draft.freeRevisionNote = "作成後の無料修正は1回のみ";
    draft.kind = "sample1man-order";
    draft.saveMode = "folder";
    return draft;
  }

  async function writeProjectFolderNow() {
    if (store.saveMode !== "folder" || !store.folderDirHandle) return { ok: false, reason: "no-folder" };
    const handle = store.folderDirHandle;
    const allowed = await ensureFolderPermission(handle, "readwrite");
    if (!allowed) return { ok: false, reason: "denied" };
    const payload = buildFolderOrderPayload();
    const images = collectResumeImageFilesMap();
    await writeFileToDir(
      handle,
      "order.json",
      new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" })
    );
    let imgDir;
    try {
      imgDir = await ensureChildDir(handle, "images");
    } catch (e) {
      return { ok: false, reason: "images-dir" };
    }
    const names = Object.keys(images);
    /* 画像が取れているときだけ差し替え。空のときに images/ を消さない */
    for (let i = 0; i < names.length; i += 1) {
      const key = names[i];
      const file = images[key];
      try {
        const ext = guessExtFromFile(file, "png");
        const outName = key + "." + ext;
        const buf = await file.arrayBuffer();
        await writeFileToDir(imgDir, outName, buf);
        await writeFileToDir(imgDir, key + "_" + (file.name || outName), buf);
      } catch (e) {
        /* 1枚失敗しても他は続ける */
      }
    }
    return { ok: true, imageCount: names.length };
  }

  async function buildContinuingZipBlob() {
    if (!window.JSZip) {
      throw new Error("ZIP用ライブラリの読み込みに失敗しました。");
    }
    const zip = new JSZip();
    zip.file("order.json", JSON.stringify(buildFolderOrderPayload(), null, 2));
    const images = collectResumeImageFilesMap();
    const names = Object.keys(images);
    for (let i = 0; i < names.length; i += 1) {
      const key = names[i];
      const file = images[key];
      try {
        const ext = guessExtFromFile(file, "png");
        const outName = key + "." + ext;
        const buf = await file.arrayBuffer();
        zip.file("images/" + outName, buf);
        zip.file("images/" + key + "_" + (file.name || outName), buf);
      } catch (e) {
        /* 1枚失敗しても他は続ける */
      }
    }
    return zip.generateAsync({ type: "blob" });
  }

  async function writeProjectFileNow() {
    const handle = store.projectFileHandle;
    if (store.saveMode !== "folder" || !handle) return { ok: false, reason: "no-file" };
    const allowed = await ensureFolderPermission(handle, "readwrite");
    if (!allowed) return { ok: false, reason: "denied" };
    const blob = await buildContinuingZipBlob();
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
    return { ok: true };
  }

  function scheduleFolderWrite() {
    if (store.saveMode !== "folder" || (!store.projectFileHandle && !store.folderDirHandle)) return;
    window.clearTimeout(folderWriteTimer);
    folderWriteTimer = window.setTimeout(function () {
      flushFolderWrite().catch(function () {
        /* 次回の保存で再試行 */
      });
    }, 700);
  }

  async function flushFolderWrite() {
    if (store.saveMode !== "folder" || (!store.projectFileHandle && !store.folderDirHandle)) return;
    if (folderWriteInFlight) {
      folderWriteQueued = true;
      return;
    }
    folderWriteInFlight = true;
    try {
      if (store.projectFileHandle) await writeProjectFileNow();
      else await writeProjectFolderNow();
    } finally {
      folderWriteInFlight = false;
      if (folderWriteQueued) {
        folderWriteQueued = false;
        scheduleFolderWrite();
      }
    }
  }

  function parseOrderTextToDraft(rawText) {
    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch (e) {
      throw new Error("order.json が壊れているようです。");
    }
    let parsedPack;
    try {
      parsedPack = parseStudioJson(parsed);
    } catch (e) {
      throw new Error("このフォルダは制作データとして読めません。");
    }
    const draft = normalizeResumeDraft(parsedPack.draft || parsed);
    if (!draft.fields && !draft.draftColors && !draft.layoutPattern) {
      throw new Error("このフォルダには復元できる設定がありません。");
    }
    return draft;
  }

  async function readOrderJsonFromDirHandle(dirHandle) {
    try {
      const fh = await dirHandle.getFileHandle("order.json");
      const file = await fh.getFile();
      return await file.text();
    } catch (e) {
      throw new Error("order.json がありません。制作データのフォルダか確認してください。");
    }
  }

  async function applyResumeImagesFromDirHandle(dirHandle) {
    let imgDir;
    try {
      imgDir = await dirHandle.getDirectoryHandle("images");
    } catch (e) {
      return 0;
    }
    const inputNames = listOrderFileInputNames();
    let applied = 0;
    for await (const entry of imgDir.values()) {
      if (entry.kind !== "file") continue;
      const inputName = matchZipImageToInputName("images/" + entry.name, inputNames);
      if (!inputName) continue;
      const fileHandle = await imgDir.getFileHandle(entry.name);
      const file = await fileHandle.getFile();
      assignResumeImageFile(inputName, file);
      applied += 1;
    }
    syncLogoPresentation();
    return applied;
  }

  async function applyResumeImagesFromFileList(files) {
    const inputNames = listOrderFileInputNames();
    let applied = 0;
    let orderText = null;
    files.forEach(function (file) {
      const rel = String(file.webkitRelativePath || file.name || "").replace(/\\/g, "/");
      if (/(^|\/)order\.json$/i.test(rel)) orderText = file;
    });
    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      const rel = String(file.webkitRelativePath || file.name || "").replace(/\\/g, "/");
      if (!/\/images\//i.test("/" + rel) && !/^images\//i.test(rel)) continue;
      const inputName = matchZipImageToInputName(rel, inputNames);
      if (!inputName) continue;
      assignResumeImageFile(inputName, file);
      applied += 1;
    }
    syncLogoPresentation();
    return { applied: applied, orderFile: orderText };
  }

  async function loadResumeFromFolderHandle(dirHandle) {
    const rawText = await readOrderJsonFromDirHandle(dirHandle);
    const draft = parseOrderTextToDraft(rawText);
    store.zipImageFiles = {};
    applyStudioDraft(draft);
    await applyResumeImagesFromDirHandle(dirHandle);
    store.saveMode = "folder";
    if (dirHandle && dirHandle.name) store.projectFolderName = dirHandle.name;
    store.hubEntrySource = "detail-entry";
    store.entryBranch = "detail";
    store.layoutSelected = true;
    syncDashResumeNotice();
    openDetailLayoutHub();
    scheduleSave();
    scheduleFolderWrite();
    return true;
  }

  async function loadResumeFromFolderFiles(files) {
    const listed = Array.from(files || []);
    if (!listed.length) throw new Error("フォルダが空です。");
    let orderFile = null;
    for (let i = 0; i < listed.length; i += 1) {
      const rel = String(listed[i].webkitRelativePath || listed[i].name || "").replace(/\\/g, "/");
      if (/(^|\/)order\.json$/i.test(rel)) {
        orderFile = listed[i];
        break;
      }
    }
    if (!orderFile) {
      throw new Error("order.json がありません。制作データのフォルダか確認してください。");
    }
    const rawText = await orderFile.text();
    const draft = parseOrderTextToDraft(rawText);
    store.zipImageFiles = {};
    applyStudioDraft(draft);
    await applyResumeImagesFromFileList(listed);
    store.saveMode = supportsDirectoryPicker() ? store.saveMode || "browser" : "browser";
    /* webkitdirectory のみの場合は以後の自動上書き不可→browser扱い＋注意表示 */
    if (!store.folderDirHandle) {
      store.saveMode = "browser";
    } else {
      store.saveMode = "folder";
    }
    store.hubEntrySource = "detail-entry";
    store.entryBranch = "detail";
    store.layoutSelected = true;
    syncDashResumeNotice();
    openDetailLayoutHub();
    scheduleSave();
    if (store.folderDirHandle) scheduleFolderWrite();
    return true;
  }

  async function loadResumeProject() {
    const zipInput = document.getElementById("entry-resume-zip");
    const zipFile = zipInput && zipInput.files && zipInput.files[0];
    if (zipFile) {
      store.pendingResumeFolderFiles = null;
      return loadResumeZipFile(zipFile);
    }
    if (store.folderDirHandle && !store.pendingResumeFolderFiles) {
      return loadResumeFromFolderHandle(store.folderDirHandle);
    }
    if (store.pendingResumeFolderFiles && store.pendingResumeFolderFiles.length) {
      return loadResumeFromFolderFiles(store.pendingResumeFolderFiles);
    }
    throw new Error("ZIPまたはフォルダを選んでください。");
  }

  function syncEntryResumeLoadButton() {
    const input = document.getElementById("entry-resume-zip");
    const btn = document.getElementById("entry-resume-load");
    const nameEl = document.getElementById("entry-resume-folder-name");
    if (nameEl) {
      if (store.folderDisplayName && (store.folderDirHandle || store.pendingResumeFolderFiles)) {
        nameEl.hidden = false;
        nameEl.textContent = "選択中: " + store.folderDisplayName;
      } else {
        nameEl.hidden = true;
        nameEl.textContent = "";
      }
    }
    if (!btn) return;
    const hasZip = !!(input && input.files && input.files[0]);
    const hasFolder = !!(
      store.folderDirHandle ||
      (store.pendingResumeFolderFiles && store.pendingResumeFolderFiles.length)
    );
    btn.disabled = !(hasZip || hasFolder);
  }

  async function tryRestoreFolderHandleOnBoot() {
    if (store.saveMode !== "folder") return;
    if (!supportsDirectoryPicker()) return;
    try {
      const handle = await idbGetFolderHandle();
      if (!handle) return;
      const ok = await ensureFolderPermission(handle, "readwrite");
      if (!ok) return;
      if (handle.kind === "file") {
        store.projectFileHandle = handle;
        store.folderDirHandle = null;
        store.folderDisplayName = handle.name || "";
        const base = String(handle.name || "").replace(/\.zip$/i, "");
        if (base) store.projectFolderName = sanitizeProjectFolderName(base);
      } else {
        store.folderDirHandle = handle;
        store.projectFileHandle = null;
        store.folderDisplayName = handle.name || "保存フォルダ";
      }
    } catch (e) {
      /* ignore */
    }
  }

  window.__sample1manSupportsFolderSave = supportsDirectoryPicker;
  window.__sample1manWriteProjectFolder = writeProjectFolderNow;
  window.__sample1manSetFolderHandle = setProjectFolderHandle;
  window.__sample1manLoadResumeFromFolderHandle = loadResumeFromFolderHandle;

  function downloadStudioPackJson() {
    const pack = buildStudioPack("");
    const key =
      pack.sampleKey ||
      pack.sampleId ||
      "draft";
    const stamp = (pack.exportedAt || "").slice(0, 10).replace(/-/g, "") || "export";
    const name = "studio-pack-" + key + "-" + stamp + ".json";
    const blob = new Blob([JSON.stringify(pack, null, 2)], {
      type: "application/json;charset=utf-8"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
    return name;
  }

  function gotoHubEditAfterStudio() {
    store.hubUiMode = "home";
    store.selfEditingStepId = "layout";
    store.siteColorMode = "detail";
    syncDetailDashVisibility("layout");
    syncHubEntryPanels();
    placeLookControls();
    placePreviewWidthControl();
    updateWizardUi();
    setStudioStatus("");
  }

  async function saveSampleDraftToDisk(folderKey, baseDraft) {
    if (!isLocalStudioHost()) {
      return { ok: false, reason: "local-only" };
    }
    if (!folderKey || /[\\/:*?"<>|]/.test(folderKey) || folderKey.indexOf("..") >= 0) {
      return { ok: false, reason: "bad-key" };
    }
    const draft = buildCanonicalSampleDraft(baseDraft || null);
    const res = await fetch(
      "sushi-samples/__draft-save?key=" + encodeURIComponent(folderKey),
      {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(draft)
      }
    );
    const raw = await res.text();
    let json = null;
    try {
      json = raw ? JSON.parse(raw) : null;
    } catch (_) {
      json = null;
    }
    if (!json || typeof json !== "object") {
      return {
        ok: false,
        reason: "save-failed http" + res.status + " body=" + String(raw || "").slice(0, 80)
      };
    }
    if (!res.ok || !json.ok) {
      return { ok: false, reason: json.reason || json.detail || "save-failed" };
    }
    return { ok: true, draft: draft, meta: json };
  }

  window.__sample1manBuildCanonicalDraft = function (baseDraft) {
    return buildCanonicalSampleDraft(baseDraft || null);
  };

  window.__sample1manSaveSampleDraft = function (folderKey, baseDraft) {
    return saveSampleDraftToDisk(folderKey, baseDraft);
  };

  window.__sample1manDownloadStudioPack = function () {
    return downloadStudioPackJson();
  };

  window.__sample1manParseStudioJson = function (obj) {
    return parseStudioJson(obj);
  };

  window.__sample1manApplyStudioDraft = function (draft) {
    applyStudioDraft(draft);
    return { ok: true };
  };

  window.__sample1manReviewEnterEdit = function (session) {
    if (!session || !session.folder) {
      return { ok: false, reason: "no-session" };
    }
    window.__sample1manReviewSession = {
      folder: session.folder,
      index: typeof session.index === "number" ? session.index : 0,
      viewMode: session.viewMode === "fit" ? "fit" : "read",
      baseDraft: session.baseDraft || null,
      guestOrder: !!session.guestOrder
    };
    document.documentElement.classList.remove("is-review-mode");
    document.body.classList.remove("is-review-mode", "review-view-fit");
    document.body.classList.add("is-review-editing");
    const chrome = document.getElementById("review-chrome");
    if (chrome) chrome.hidden = true;
    const editBar = document.getElementById("review-edit-bar");
    if (editBar) {
      editBar.hidden = false;
      editBar.removeAttribute("hidden");
    }
    const folderLabel = document.getElementById("review-edit-folder");
    if (folderLabel) folderLabel.textContent = session.folder;
    store.intakeDone = true;
    store.easyFlowActive = false;
    store.siteColorMode = "detail";
    store.uiMode = "self";
    store.selfEditingStepId = "layout";
    store.hubUiMode = "home";
    store.hubEntryRoute = null;
    store.hubPlacePickMode = false;
    store.hubPlaceSelectedBlockId = null;
    store.hubReturnBlockId = null;
    store.hubTaskId = null;
    syncSiteColorModeUi();
    clearHubPlaceFit();
    syncDetailDashVisibility("layout");
    syncHubEntryPanels();
    placeLookControls();
    placePreviewWidthControl();
    updateWizardUi();
    return { ok: true };
  };

  window.__sample1manReviewResume = function () {
    const session = window.__sample1manReviewSession || null;
    document.body.classList.remove("is-review-editing");
    document.documentElement.classList.add("is-review-mode");
    document.body.classList.add("is-review-mode");
    if (session && session.viewMode === "fit") {
      document.body.classList.add("review-view-fit");
    }
    const editBar = document.getElementById("review-edit-bar");
    if (editBar) editBar.hidden = true;
    const chrome = document.getElementById("review-chrome");
    if (chrome) {
      chrome.hidden = false;
      chrome.removeAttribute("hidden");
    }
    hideEntryGate();
    setSampleFlowPreviewHidden(false);
    document.body.classList.remove("sample-flow-hide-preview");
    placePreviewWidthControl();
    return session;
  };

  function enterHubLayoutMode() {
    if (store.siteColorMode !== "detail") return;
    store.hubUiMode = "layout";
    store.hubEntryRoute = null;
    store.hubPlacePickMode = false;
    store.hubPlaceSelectedBlockId = null;
    store.hubReturnBlockId = null;
    store.hubTaskId = null;
    store.selfEditingStepId = "layout";
    clearHubPlaceFit();
    syncDetailDashVisibility("layout");
    renderLayoutArrangeWire();
    syncHubEntryPanels();
    placeLookControls();
    updateWizardUi();
    if (typeof window.applyPreviewWidthFromPane === "function") {
      window.applyPreviewWidthFromPane();
    }
  }

  function returnHubHome() {
    store.hubUiMode = "home";
    store.hubEntryRoute = null;
    store.hubPlacePickMode = false;
    store.hubPlaceSelectedBlockId = null;
    store.hubReturnBlockId = null;
    store.hubTaskId = null;
    clearHubPlaceFit();
    syncHubEntryPanels();
    placeLookControls();
    updateWizardUi();
    if (typeof window.applyPreviewWidthFromPane === "function") {
      window.applyPreviewWidthFromPane();
    }
  }

  function cancelHubPlacePick() {
    returnHubHome();
  }

  function renderHubPlaceSectionActions(blockId) {
    const meta = LAYOUT_BLOCKS.find((b) => b.id === blockId);
    const title = document.getElementById("hub-place-section-title");
    const actions = document.getElementById("hub-place-section-actions");
    if (!meta || !actions) return;
    if (title) title.textContent = layoutBlockDisplayLabel(meta);
    actions.innerHTML = "";
    (meta.links || []).forEach((link) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "hub-place-action-btn";
      btn.setAttribute("data-hub-place-step", link.step);
      btn.textContent = link.label;
      actions.appendChild(btn);
    });
  }

  function highlightHubPlaceBlock(blockId, lasting) {
    root.querySelectorAll("[data-layout-block].is-hub-place-hot").forEach((el) => {
      el.classList.remove("is-hub-place-hot");
    });
    root.querySelectorAll("[data-layout-block].is-hub-place-chosen").forEach((el) => {
      el.classList.remove("is-hub-place-chosen");
    });
    const el = root.querySelector('[data-layout-block="' + blockId + '"]');
    if (!el) return;
    el.classList.add(lasting ? "is-hub-place-chosen" : "is-hub-place-hot");
    if (!lasting) {
      window.setTimeout(() => el.classList.remove("is-hub-place-hot"), 900);
    }
  }

  function pickHubPlaceBlock(blockId) {
    const meta = LAYOUT_BLOCKS.find((b) => b.id === blockId);
    if (!meta || !isLayoutBlockActive(meta)) return;
    store.hubUiMode = "place-actions";
    store.hubPlacePickMode = false;
    store.hubPlaceSelectedBlockId = blockId;
    store.hubReturnBlockId = blockId;
    store.selfEditingStepId = "layout";
    syncDetailDashVisibility("layout");
    document.body.classList.remove("hub-place-pick");
    const scroll = document.querySelector(".preview-scroll");
    if (scroll) scroll.classList.remove("is-hub-place-fit");
    if (typeof window.applyPreviewWidthFromPane === "function") {
      window.applyPreviewWidthFromPane();
    }
    renderHubPlaceSectionActions(blockId);
    syncHubEntryPanels();
    highlightHubPlaceBlock(blockId, true);
    if (meta.selector) {
      window.setTimeout(() => scrollPreviewTo(meta.selector), 40);
    }
    updateWizardUi();
    syncHubColorOkLabel();
  }

  function openCopyFrameFromHub(secId) {
    store.copyScreenReturn = "hub";
    store.uiMode = "guided";
    store.easyFlowActive = true;
    store.siteColorMode = "easy";
    const order = activeCopyFrameOrder();
    const at = order.indexOf(secId);
    store.copyFrameIndex = at >= 0 ? at : 0;
    applyUiMode();
    const flow = getFlowSteps();
    const idx = flow.findIndex(function (s) { return s.id === "easy-copy-frame"; });
    if (idx >= 0) showWizardStep(idx);
    scheduleSave();
  }

  function closeCopyFrameToHub() {
    store.copyScreenReturn = null;
    store.easyFlowActive = false;
    store.uiMode = "self";
    store.siteColorMode = "detail";
    store.hubEntrySource = "sample-done";
    applyUiMode();
    returnToLayoutHub();
    scheduleSave();
  }

  function openHubPlaceStep(stepId) {
    if (!stepId) return;
    const hubTextFrame = {
      "hero-text": "hero",
      "about-text": "about",
      "works-text": "works",
      "contact-text": "contact"
    };
    if (hubTextFrame[stepId] && store.sampleFlowEntered) {
      openCopyFrameFromHub(hubTextFrame[stepId]);
      return;
    }
    const blockId = store.hubPlaceSelectedBlockId || store.hubReturnBlockId;
    const meta = LAYOUT_BLOCKS.find((b) => b.id === blockId);
    if (blockId) {
      store.hubReturnBlockId = blockId;
      store.hubPlaceSelectedBlockId = blockId;
    }
    store.hubUiMode = "place-edit";
    store.hubPlacePickMode = false;
    document.body.classList.remove("hub-place-pick", "hub-place-section-open");
    syncHubEntryPanels();
    if (meta && meta.selector) {
      window.setTimeout(() => scrollPreviewTo(meta.selector), 30);
    }
    syncHubColorOkLabel();
    openSelfStep(stepId);
  }

  function getHubTaskTargets(kind) {
    const out = [];
    LAYOUT_BLOCKS.forEach((meta) => {
      if (!isLayoutBlockActive(meta)) return;
      const link = (meta.links || []).find((l) => l.kind === kind);
      if (!link) return;
      out.push({
        blockId: meta.id,
        blockLabel: layoutBlockDisplayLabel(meta),
        step: link.step,
        actionLabel: link.label
      });
    });
    return out;
  }

  function renderHubTaskNames() {
    const host = document.getElementById("hub-task-names");
    if (!host) return;
    host.innerHTML = "";
    HUB_TASKS.forEach((task) => {
      const targets = getHubTaskTargets(task.kind);
      if (!targets.length) return;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "hub-task-name-btn";
      btn.setAttribute("data-hub-task", task.id);
      btn.setAttribute("role", "listitem");
      const title = document.createElement("span");
      title.className = "hub-task-name-title";
      title.textContent = task.label;
      const note = document.createElement("span");
      note.className = "hub-task-name-note";
      note.textContent = task.note;
      btn.appendChild(title);
      btn.appendChild(note);
      host.appendChild(btn);
    });
  }

  function renderHubTaskWhereNames(targets) {
    const host = document.getElementById("hub-task-where-names");
    const title = document.getElementById("hub-task-where-title");
    const task = HUB_TASKS.find((t) => t.id === store.hubTaskId);
    if (title) {
      title.textContent = task ? task.label + " — どこを？" : "どこを？";
    }
    if (!host) return;
    host.innerHTML = "";
    (targets || []).forEach((t) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "hub-task-where-btn";
      btn.setAttribute("data-hub-task-block", t.blockId);
      btn.setAttribute("data-hub-task-step", t.step);
      btn.setAttribute("role", "listitem");
      const name = document.createElement("span");
      name.className = "hub-task-name-title";
      name.textContent = t.blockLabel;
      btn.appendChild(name);
      host.appendChild(btn);
    });
  }

  function enterHubTaskPick() {
    if (store.siteColorMode !== "detail") return;
    store.hubUiMode = "task-list";
    store.hubEntryRoute = "task";
    store.hubPlacePickMode = true;
    store.hubPlaceSelectedBlockId = null;
    store.hubReturnBlockId = null;
    store.hubTaskId = null;
    store.selfEditingStepId = "layout";
    syncDetailDashVisibility("layout");
    renderHubTaskNames();
    syncHubEntryPanels();
    applyHubPlaceFit();
    updateWizardUi();
  }

  function openHubTaskTarget(target) {
    if (!target) return;
    store.hubPlaceSelectedBlockId = target.blockId;
    store.hubReturnBlockId = target.blockId;
    clearHubPlaceFit();
    highlightHubPlaceBlock(target.blockId, true);
    const meta = LAYOUT_BLOCKS.find((b) => b.id === target.blockId);
    if (meta && meta.selector) {
      window.setTimeout(() => scrollPreviewTo(meta.selector), 40);
    }
    openHubPlaceStep(target.step);
  }

  function pickHubTask(taskId) {
    const task = HUB_TASKS.find((t) => t.id === taskId);
    if (!task) return;
    const targets = getHubTaskTargets(task.kind);
    if (!targets.length) return;
    store.hubTaskId = task.id;
    store.hubEntryRoute = "task";
    if (targets.length === 1) {
      openHubTaskTarget(targets[0]);
      return;
    }
    store.hubUiMode = "task-where";
    store.hubPlacePickMode = false;
    clearHubPlaceFit();
    renderHubTaskWhereNames(targets);
    syncHubEntryPanels();
    updateWizardUi();
  }

  function pickHubTaskWhere(blockId, stepId) {
    if (!blockId || !stepId) return;
    openHubTaskTarget({ blockId: blockId, step: stepId });
  }

  function backFromHubPlaceActions() {
    if (store.hubEntryRoute === "task") {
      enterHubTaskPick();
      return;
    }
    enterHubPlacePick();
  }

  function syncHubColorOkLabel() {
    const keep = document.getElementById("gct-keep-preset");
    if (!keep) return;
    keep.textContent = store.hubReturnBlockId ? "これでOK" : "これでOK（編集ハブへ）";
  }

  function setupHubPlaceEntry() {
    const placeBtn = document.getElementById("hub-entry-place");
    if (placeBtn) {
      placeBtn.addEventListener("click", () => enterHubPlacePick());
    }
    const taskBtn = document.getElementById("hub-entry-task");
    if (taskBtn) {
      taskBtn.addEventListener("click", () => enterHubTaskPick());
    }
    const layoutBtn = document.getElementById("hub-entry-layout");
    if (layoutBtn) {
      layoutBtn.addEventListener("click", () => enterHubLayoutMode());
    }
    const studioBtn = document.getElementById("hub-entry-studio");
    if (studioBtn) {
      if (isLocalStudioHost()) {
        studioBtn.hidden = false;
        studioBtn.removeAttribute("hidden");
      }
      studioBtn.addEventListener("click", () => enterHubStudioReview());
    }
    const studioBack = document.getElementById("hub-studio-back");
    if (studioBack) {
      studioBack.addEventListener("click", () => exitHubStudioReview());
    }

    const reviewEditConfirm = document.getElementById("review-edit-confirm");
    if (reviewEditConfirm) {
      reviewEditConfirm.addEventListener("click", async () => {
        if (!isLocalStudioHost()) {
          setStudioStatus("local-only");
          return;
        }
        const session = window.__sample1manReviewSession;
        if (!session || !session.folder) {
          setStudioStatus("no review sample");
          return;
        }
        if (session.guestOrder) {
          setStudioStatus("order.json is not saved into sample draft");
          return;
        }
        reviewEditConfirm.disabled = true;
        try {
          const saved = await saveSampleDraftToDisk(session.folder, session.baseDraft || null);
          if (!saved || !saved.ok) {
            throw new Error((saved && saved.reason) || "save-failed");
          }
          session.baseDraft = saved.draft;
          window.__sample1manReviewResume();
          window.dispatchEvent(
            new CustomEvent("sample1man-review-after-confirm", {
              detail: { folder: session.folder, index: session.index }
            })
          );
        } catch (err) {
          setStudioStatus("confirm failed: " + (err && err.message ? err.message : String(err)));
        } finally {
          reviewEditConfirm.disabled = false;
        }
      });
    }
    const reviewEditCancel = document.getElementById("review-edit-cancel");
    if (reviewEditCancel) {
      reviewEditCancel.addEventListener("click", () => {
        window.__sample1manReviewResume();
        window.dispatchEvent(
          new CustomEvent("sample1man-review-resume", {
            detail: window.__sample1manReviewSession || {}
          })
        );
      });
    }

    const layoutBack = document.getElementById("hub-layout-back");
    if (layoutBack) {
      layoutBack.addEventListener("click", () => returnHubHome());
    }
    const layoutOk = document.getElementById("hub-layout-ok");
    if (layoutOk) {
      layoutOk.addEventListener("click", () => returnHubHome());
    }
    const placeOk = document.getElementById("hub-place-section-ok");
    if (placeOk) {
      placeOk.addEventListener("click", () => returnHubHome());
    }
    const cancelBtn = document.getElementById("hub-place-cancel");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => cancelHubPlacePick());
    }
    const backBtn = document.getElementById("hub-place-section-back");
    if (backBtn) {
      backBtn.addEventListener("click", () => backFromHubPlaceActions());
    }
    const taskCancel = document.getElementById("hub-task-cancel");
    if (taskCancel) {
      taskCancel.addEventListener("click", () => returnHubHome());
    }
    const taskWhereBack = document.getElementById("hub-task-where-back");
    if (taskWhereBack) {
      taskWhereBack.addEventListener("click", () => enterHubTaskPick());
    }
    const taskNames = document.getElementById("hub-task-names");
    if (taskNames) {
      taskNames.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-hub-task]");
        if (!btn) return;
        pickHubTask(btn.getAttribute("data-hub-task"));
      });
    }
    const whereNames = document.getElementById("hub-task-where-names");
    if (whereNames) {
      whereNames.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-hub-task-block]");
        if (!btn) return;
        pickHubTaskWhere(
          btn.getAttribute("data-hub-task-block"),
          btn.getAttribute("data-hub-task-step")
        );
      });
    }
    const names = document.getElementById("hub-place-names");
    if (names) {
      names.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-hub-place-block]");
        if (!btn) return;
        pickHubPlaceBlock(btn.getAttribute("data-hub-place-block"));
      });
    }
    const actions = document.getElementById("hub-place-section-actions");
    if (actions) {
      actions.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-hub-place-step]");
        if (!btn) return;
        openHubPlaceStep(btn.getAttribute("data-hub-place-step"));
      });
    }
    root.addEventListener(
      "click",
      (e) => {
        if (store.hubUiMode !== "place-list") return;
        const block = e.target.closest("#preview-root [data-layout-block]");
        if (!block) return;
        e.preventDefault();
        e.stopPropagation();
        pickHubPlaceBlock(block.getAttribute("data-layout-block"));
      },
      true
    );
    window.addEventListener("resize", () => {
      if (store.hubUiMode === "place-list" || store.hubUiMode === "task-list") {
        applyHubPlaceFit();
      }
    });
    setupHubLayoutTip();
  }

  function setupHubLayoutTip() {
    const btn = document.getElementById("hub-layout-drag-tip");
    const pop = document.getElementById("hub-layout-drag-tip-pop");
    if (!btn || !pop || btn.dataset.bound === "1") return;
    btn.dataset.bound = "1";
    const close = () => {
      pop.hidden = true;
      btn.setAttribute("aria-expanded", "false");
    };
    const open = () => {
      pop.hidden = false;
      btn.setAttribute("aria-expanded", "true");
    };
    btn.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      if (pop.hidden) open();
      else close();
    });
    btn.addEventListener("mouseenter", () => open());
    btn.addEventListener("mouseleave", () => {
      window.setTimeout(() => {
        if (!btn.matches(":hover") && !pop.matches(":hover")) close();
      }, 120);
    });
    pop.addEventListener("mouseleave", () => close());
    document.addEventListener("click", (ev) => {
      if (ev.target === btn || btn.contains(ev.target) || pop.contains(ev.target)) return;
      close();
    });
  }

  function syncDetailNoticeCopy() {
    const title = document.getElementById("detail-notice-title");
    const text = document.getElementById("detail-notice-text");
    const fromEasy = store.hubEntrySource === "easy-done";
    if (title) {
      title.textContent = fromEasy ? "さらに修正する" : "細かく自分で作る";
    }
    if (text) {
      text.textContent = fromEasy
        ? "このあとは並び替えから、色・文字・画像の枚数・増減などを直せます。右の見本で確認しながら進めてください。"
        : "このあとは並び替えから、色・文字・画像・枚数の増減を触れます。右の見本で確認しながら進めてください。";
    }
  }

  function showDetailNoticeModal() {
    syncDetailNoticeCopy();
    const modal = document.getElementById("detail-notice-modal");
    if (modal) modal.hidden = false;
  }

  function hideDetailNoticeModal() {
    const modal = document.getElementById("detail-notice-modal");
    if (modal) modal.hidden = true;
  }

  function enterDetailModeFromSwitch() {
    /* 途中のモード切替は廃止。入口2択／さらに修正／最初に戻すのみ */
    return;
  }

  function gctConfirmPick() {
    if (store.guidedColorPhase !== "pick") return;
    const editId = store.guidedColorEditStepId;
    if (editId && COLOR_STEP_FIELDS[editId]) {
      store.snapshots[editId] = captureStepSnapshot(editId);
      store.confirmed[editId] = true;
    }
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
    /* 出口：色確定 → 場所のできること（またはハブホーム） */
    returnToLayoutHub();
    applyLiveColors(true);
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

    const detailColor = store.siteColorMode === "detail";
    const guidedOk = store.uiMode === "guided";
    if (!panel || (!guidedOk && !detailColor)) {
      if (panel) panel.hidden = true;
      return;
    }

    const step = getCurrentFlowStep();
    const onPreset = !!(step && step.id === "global-preset");
    const editId = activeGctEditStepId();
    const phase = store.guidedColorPhase || "preset";
    const picking = phase === "pick" && !!editId;

    if (!onPreset && !(detailColor && picking)) {
      panel.hidden = true;
      if (guidedOk) updateWizardUi();
      return;
    }

    mountGctPanel();
    document.body.classList.add("gct-active");

    if (picking) {
      document.body.classList.add("gct-pick-phase");
      showGctPhase("pick");
      /* 同じ色ステップならハニカムを作り直さない（連続 sync で消えたように見えるのを防ぐ） */
      renderGctPickUi(editId, { forceHoney: false });
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

  function setupGuidedColorTrial() {
    const pickOk = document.getElementById("gct-pick-ok");
    if (pickOk) {
      pickOk.addEventListener("click", () => {
        const row = pickOk.closest(".layout-color-row");
        if (row) {
          const stepId = row.getAttribute("data-color-step") || "";
          const snap = stepId && captureColorSnapshot(stepId);
          if (snap) {
            store.snapshots[stepId] = snap;
            store.confirmed[stepId] = true;
          }
          applyLiveColors(true);
          scheduleSave();
          if (row.closest("#easy-catch-color") && (store.catchPage || "") === "color") {
            wizardNext();
            return;
          }
          closeLayoutColorRow(row);
          return;
        }
        gctConfirmPick();
      });
    }
    const pickUndo = document.getElementById("gct-pick-undo");
    if (pickUndo) pickUndo.addEventListener("click", gctUndoPick);
    bindHoneyShade();
    bindColorPickMode();
    const dirOk = document.getElementById("gct-grad-dir-ok");
    if (dirOk && !dirOk.dataset.bound) {
      dirOk.dataset.bound = "1";
      dirOk.addEventListener("click", dismissGradDirHint);
      window.addEventListener("resize", () => {
        if (store.gradDirHintOpen && !store.gradDirHintSkip) placeGradDirCard();
      });
    }
    const targetMain = document.getElementById("gct-pick-target-main");
    const targetPartner = document.getElementById("gct-pick-target-partner");
    if (targetMain && !targetMain.dataset.bound) {
      targetMain.dataset.bound = "1";
      targetMain.addEventListener("click", () => gctSetPickTarget(false));
    }
    if (targetPartner && !targetPartner.dataset.bound) {
      targetPartner.dataset.bound = "1";
      targetPartner.addEventListener("click", () => {
        const stepId = activeGctEditStepId();
        if (stepId && targetPartner.closest(".layout-color-body") && !slotGradStarted(stepId)) {
          startSlotSecondColor(stepId);
          return;
        }
        gctSetPickTarget(true);
      });
    }
    document.querySelectorAll("[data-gct-prev-step]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (store.guidedColorReturnPreset) {
          if (store.guidedColorPhase === "pick") {
            gctConfirmPick();
            return;
          }
          gctReturnToPresetOverview(false);
          return;
        }
        if (store.guidedColorPhase === "pick") {
          store.guidedColorPhase = "preset";
        }
        wizardBack();
        scrollBackDestinationToTop();
      });
    });
  }
  function filterFlowIds(ids) {
    let out = ids.filter((id) => !INTRO_STEP_IDS.has(id));
    if (store.siteColorMode === "easy") {
      out = out.filter((id) => !COLOR_STEP_IDS_ORDERED.includes(id) || id === "global-preset");
      out = out.filter((id) => id !== FONT_STEP_ID && LEGACY_FONT_STEP_IDS.indexOf(id) < 0);
    }
    const extraStepOn = {
      "hours-text": !!(store.draftExtras && store.draftExtras.hours),
      "access-text": !!(store.draftExtras && store.draftExtras.access),
      "address-text": !!(store.draftExtras && store.draftExtras.address),
      "announce-text": !!(store.draftExtras && store.draftExtras.announce)
    };
    out = out.filter((id) => extraStepOn[id] == null || extraStepOn[id]);
    return out;
  }

  function resolveStepId(stepId) {
    if (!stepId) return stepId;
    if (stepId === "heading-font") return "logo-text";
    if (stepId === "catch-font") return "hero-text";
    if (stepId === "body-font") return "about-text";
    if (stepId === FONT_STEP_ID) {
      const role = store.pendingFontRoleFocus;
      if (role === "display") return "logo-text";
      if (role === "catch") return "hero-text";
      return "about-text";
    }
    return stepId;
  }

  function applyEasyFixedFonts() {
    Object.keys(EASY_FIXED_FONTS).forEach((name) => {
      setFieldValue(name, EASY_FIXED_FONTS[name]);
    });
    syncFontPickers();
    store.confirmed[FONT_STEP_ID] = true;
    store.snapshots[FONT_STEP_ID] = captureStepSnapshot(FONT_STEP_ID);
    LEGACY_FONT_STEP_IDS.forEach((id) => {
      delete store.confirmed[id];
      delete store.snapshots[id];
    });
  }

  function ensureFontsConfirmedForMode() {
    if (store.siteColorMode === "easy") {
      if (!store.keepLoadedFonts) applyEasyFixedFonts();
      return;
    }
    if (!store.confirmed[FONT_STEP_ID]) {
      store.snapshots[FONT_STEP_ID] = captureStepSnapshot(FONT_STEP_ID);
      store.confirmed[FONT_STEP_ID] = true;
    }
    LEGACY_FONT_STEP_IDS.forEach((id) => {
      if (store.snapshots[id] && store.snapshots[id].fonts) {
        const f = store.snapshots[id].fonts;
        if (f.display) setFieldValue("font_display", f.display);
        if (f.catch) setFieldValue("font_catch", f.catch);
        if (f.body) setFieldValue("font_body", f.body);
      }
      delete store.confirmed[id];
      delete store.snapshots[id];
    });
    store.snapshots[FONT_STEP_ID] = captureStepSnapshot(FONT_STEP_ID);
    store.confirmed[FONT_STEP_ID] = true;
    syncFontPickers();
  }

  function getEasyImageFlowMid() {
    return ["easy-img-wire"];
  }

  function getEasyCopyFlowTail() {
    /* 一覧が本線。一括おまかせ画面は出さない。キーワード時だけ言葉選びを挟む */
    if (store.copyPathMode === "keyword") {
      return ["easy-copy-dirs", "easy-copy-omakase"];
    }
    return ["easy-copy-omakase"];
  }

  function easyCatchOn() {
    const meta = LAYOUT_BLOCKS.find(function (b) { return b.id === "hero"; });
    return isLayoutBlockActive(meta);
  }

  function getEasyFlowStepIds() {
    let ids = ["easy-basics", "easy-color", "easy-site-name"];
    if (easyCatchOn()) ids.push("easy-catch");
    ids = ids
      .concat(getEasyImageFlowMid())
      .concat(getEasyCopyFlowTail());
    ids.push("easy-color-stage", "easy-done");
    if (store.copyScreenReturn === "hub" && ids.indexOf("easy-copy-frame") < 0) {
      const at = ids.indexOf("easy-copy-path");
      if (at >= 0) ids.splice(at + 1, 0, "easy-copy-frame");
      else ids.push("easy-copy-frame");
    }
    return ids;
  }

  function getFlowSteps() {
    if (store.uiMode === "guided" && store.easyFlowActive) {
      return getEasyFlowStepIds()
        .map((id) => STEPS.find((s) => s.id === id))
        .filter(Boolean);
    }
    if (store.uiMode === "guided") {
      return filterFlowIds(GUIDED_STEP_IDS)
        .map((id) => STEPS.find((s) => s.id === id))
        .filter(Boolean);
    }
    if (store.uiMode === "self") {
      return filterFlowIds(STEPS.map((s) => s.id).filter((id) => !EASY_FLOW_STEP_SET.has(id)))
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
    const step = getCurrentFlowStep();
    if (step && step.id === "easy-done") return "確認へ";
    if (step && step.id === "easy-loading") return "お待ちください";
    if (step && step.id === "easy-img-omakase") return "これで進む";
    if (step && HUB_IMG_STEP_IDS.indexOf(step.id) >= 0) {
      const mode = store.hubImgPathMode && store.hubImgPathMode[step.id];
      if (mode === "omakase") return "これで進む";
    }
    if (step && step.id === "easy-copy-omakase") return "これで進む";
    if (step && step.id === "easy-copy-frame") {
      const order = activeCopyFrameOrder();
      const idx = store.copyFrameIndex || 0;
      if (store.copyScreenReturn === "hub" && (!order.length || idx >= order.length - 1)) return "編集へ戻る";
      if (!order.length || idx >= order.length - 1) return "これで進む";
      return "これで次の文言へ";
    }
    if (step && EASY_FLOW_STEP_SET.has(step.id)) return "次へ";
    if (store.uiMode === "self") {
      if (step && (step.id === "guide" || step.id === "purpose")) return "次へ";
      if (store.finishLockedOnce) return "修正";
      if (store.hubReturnBlockId) return "これでOK";
      return "確定";
    }
    return "次へ";
  }

  function isSelfListView() {
    /* 一覧表示パスは廃止 */
    return false;
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
    stepId = resolveStepId(stepId);
    if (stepId === "layout" && store.siteColorMode === "detail" && store.intakeDone) return true;
    if (INTRO_STEP_IDS.has(stepId)) return !!store.intakeDone;
    if (!store.uiMode) return false;
    if (stepId === "hours-text" && !(store.draftExtras && store.draftExtras.hours)) return false;
    if (stepId === "access-text" && !(store.draftExtras && store.draftExtras.access)) return false;
    if (stepId === "address-text" && !(store.draftExtras && store.draftExtras.address)) return false;
    if (store.siteColorMode === "easy" && COLOR_STEP_IDS_ORDERED.includes(stepId) && stepId !== "global-preset") {
      return false;
    }
    if (store.siteColorMode === "easy" && stepId === FONT_STEP_ID) {
      return false;
    }
    if (store.uiMode === "self" || store.siteColorMode === "detail") return true;
    const meta = BADGE_META[stepId];
    if (!meta) return true;
    if ((meta.kind === "image" || meta.kind === "text") && !isColorChapterComplete()) return false;
    if (meta.kind === "text" && !isImageChapterComplete()) return false;
    return true;
  }

  function unlockHintForStep(stepId) {
    stepId = resolveStepId(stepId);
    if (canOpenStep(stepId)) return "";
    if (!store.intakeDone || !store.uiMode) return "はじめにの選択を終えてから進めてください";
    if (store.siteColorMode === "easy" && COLOR_STEP_IDS_ORDERED.includes(stepId) && stepId !== "global-preset") {
      return "簡単モードでは雰囲気色の選択だけです。細かく直すときはモードをこだわりへ";
    }
    if (store.siteColorMode === "easy" && stepId === FONT_STEP_ID) {
      return "簡単モードでは書体は決まっています。変えたいときはモードをこだわりへ";
    }
    if (store.uiMode === "self") return "";
    const meta = BADGE_META[stepId];
    if (!meta) return "";
    if ((meta.kind === "image" || meta.kind === "text") && !isColorChapterComplete()) {
      return "色で「これでOK（レイアウトへ）」を押すと、画像の選択ができます";
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
    return filterFlowIds(
      progressColorStepIds().concat(IMAGE_STEP_IDS_ORDERED, TEXT_STEP_IDS_ORDERED)
    );
  }

  function countUnconfirmedBarSteps() {
    return progressBarStepIds().filter((id) => !store.confirmed[id]);
  }

  function syncWizardNavVisibility() {
    const nav = document.getElementById("wizard-nav");
    if (!nav) return;
    nav.hidden = false;
  }

  /* 進捗バーは廃止（残骸が出ないよう常に空） */
  function buildProgressBar() {
    const bar = document.getElementById("wizard-progress-bar");
    if (!bar) return;
    bar.innerHTML = "";
    bar.hidden = true;
  }

  function easyFlowStageLabels() {
    const labels = ["見本", "利用用途", "記載項目", "配色"];
    if (easyCatchOn()) labels.push("キャッチ");
    labels.push("画像", "文章", "色調整", "確定");
    return labels;
  }

  function easyFlowStageIndex() {
    const gate = document.getElementById("entry-gate");
    const gateOpen = document.body.classList.contains("entry-gate-open");
    if (gateOpen) {
      const step = gate && gate.dataset.entryStep;
      if (store.entryBranch === "sample") {
        if (step === "sushi") return 1;
        if (step === "purpose") return 2;
        return 0;
      }
      if (store.entryBranch === "detail" && step === "purpose") {
        return easyFlowStageLabels().indexOf("利用用途") + 1;
      }
      return 0;
    }
    if (store.sampleFinishNoBack && store.entryBranch === "sample") {
      const finishStep = getCurrentFlowStep();
      if (finishStep && finishStep.id === "finish") return easyFlowStageLabels().length;
    }
    if (!store.easyFlowActive || (store.entryBranch !== "sample" && !store.blankCanvas)) return 0;
    const step = getCurrentFlowStep();
    const id = step && step.id;
    if (!id) return 0;
    const at = function (name) {
      return easyFlowStageLabels().indexOf(name) + 1;
    };
    if (id === "easy-basics") return at("記載項目");
    if (id === "easy-color" || id === "easy-site-name") return at("配色");
    if (id === "easy-catch") return at("キャッチ");
    if (id === "easy-color-stage") return at("色調整");
    if (id === "easy-img-path" || id === "easy-img-wire" || id === "easy-img-omakase") return at("画像");
    if (
      id === "easy-copy-path" ||
      id === "easy-copy-dirs" ||
      id === "easy-copy-omakase" ||
      id === "easy-copy-frame" ||
      id.indexOf("easy-sec-") === 0
    ) {
      return at("文章");
    }
    if (id === "easy-loading" || id === "easy-done") return at("確定");
    return 0;
  }

  function easyStageTargetId(name) {
    if (name === "記載項目") return "easy-basics";
    if (name === "配色") return "easy-color";
    if (name === "キャッチ") return "easy-catch";
    if (name === "画像") return "easy-img-wire";
    if (name === "文章") return "easy-copy-omakase";
    if (name === "色調整") return "easy-color-stage";
    if (name === "確定") return "easy-done";
    return "";
  }

  function resumeSampleEasyFlow() {
    if (store.entryBranch !== "sample") return false;
    store.easyFlowActive = true;
    store.easyDirectOpen = true;
    store.uiMode = "guided";
    store.siteColorMode = "easy";
    return true;
  }

  function openEasyStage(name, opts) {
    if (!(opts && opts.keepGapReturn)) store.easyGapReturn = "";
    const cur = getCurrentFlowStep();
    const fromSampleFinish = !!(
      cur &&
      cur.id === "finish" &&
      store.entryBranch === "sample" &&
      store.sampleFinishNoBack
    );
    if (name === "見本") {
      if (store.entryBranch === "detail") return;
      showEntryGate("sushi");
      return;
    }
    if (name === "利用用途") {
      showEntryGate("purpose");
      return;
    }
    if (fromSampleFinish) resumeSampleEasyFlow();
    if (!store.easyDirectOpen) return;
    if (document.body.classList.contains("entry-gate-open")) hideEntryGate();
    const id = easyStageTargetId(name);
    const flow = getFlowSteps();
    const idx = flow.findIndex(function (s) { return s.id === id; });
    if (idx < 0) return;
    showWizardStep(idx);
  }

  function dismissEasyDoneUnlockNote() {
    const note = document.querySelector(".easy-done-unlock");
    if (note) note.remove();
  }

  function mountEasyDoneUnlockNote() {
    if (document.querySelector(".easy-done-unlock")) return;
    const congrats = document.querySelector('details[data-step-id="easy-done"] .easy-done-congrats');
    if (!congrats) return;
    const note = document.createElement("p");
    note.className = "easy-done-unlock";
    note.setAttribute("role", "status");
    note.textContent = "進捗バーの編集が解除されました。修正があれば、進捗バーの該当箇所を押せます。";
    congrats.insertAdjacentElement("afterend", note);
  }

  function placeEasyDoneArrow() {
    const before = document.querySelector("details.is-wizard-active .easy-done-before");
    const actions = document.querySelector("details.is-wizard-active .easy-done-actions");
    [before, actions].forEach(function (el) {
      if (!el) return;
      el.style.transform = "";
      el.style.marginTop = "";
    });
  }

  function easyDoneImageStillSample(name) {
    if (inputHasFile(name)) {
      const url = imageUrls[name] || "";
      const def = sampleDefaultSrc(name);
      if (def && url === def) return true;
      if (store.sampleKeptImagePaths && store.sampleKeptImagePaths[name]) {
        const kept = store.sampleKeptImagePaths[name];
        if (!def || url === def || url === kept) return true;
      }
      return false;
    }
    return !!sampleDefaultSrc(name);
  }

  function easyDoneImageLoc(name) {
    if (name === "logo_image") return { kind: "logo" };
    if (name === "hero_image") {
      if (typeof easyCatchOn === "function" && easyCatchOn()) return { kind: "catch" };
      return { kind: "image", blockId: "hero", slot: "hero", openKey: "hero" };
    }
    if (String(name).indexOf("about_image_") === 0) {
      return { kind: "image", blockId: "photos", slot: name, openKey: "about-photos" };
    }
    const work = /^work_(\d+)_image$/.exec(String(name || ""));
    if (work) return { kind: "image", blockId: "works", slot: "work_" + work[1], openKey: "works-list" };
    return null;
  }

  function openEasyGapImage(name) {
    const loc = easyDoneImageLoc(name);
    if (!loc) return;
    store.easyDirectOpen = true;
    if (loc.kind === "logo") {
      setCopyListOpen({ kind: "item", sectionId: "logo", itemIndex: null });
      openEasyStage("文章", { keepGapReturn: true });
      store.easyGapReturn = "easy-done";
      return;
    }
    if (loc.kind === "catch") {
      store.catchPage = "image";
      store.layoutAccordionId = "hero";
      setOnlyLayoutFrameOpen("hero", "hero");
      openEasyStage("キャッチ", { keepGapReturn: true });
      store.easyGapReturn = "easy-done";
      return;
    }
    store.layoutAccordionId = loc.blockId;
    setOnlyLayoutFrameOpen(loc.openKey, loc.slot);
    openEasyStage("画像", { keepGapReturn: true });
    store.easyGapReturn = "easy-done";
    store.layoutAccordionId = loc.blockId;
    setOnlyLayoutFrameOpen(loc.openKey, loc.slot);
    renderLayoutArrangeWire();
    openEasyGapPhotoEditor(loc.blockId, loc.slot);
  }

  function openEasyGapPhotoEditor(blockId, slot) {
    if (!blockId || !slot) return;
    const findRow = function () {
      return document.querySelector(
        '#easy-img-layout-host [data-layout-photo="' + blockId + ":" + slot + '"]'
      );
    };
    let row = findRow();
    if (!row) return;
    const cell = row.closest("details.layout-arrange-cell");
    if (cell && !cell.open) cell.open = true;
    row = findRow();
    if (!row) return;
    applyLayoutPhotoRowOpen(row, blockId, slot, true);
    focusPreviewLayoutFrame(blockId, slot);
    const scroller = document.querySelector(".dash-body > .fill-form");
    if (scroller) scroller.scrollTop = 0;
  }

  function openEasyGapCopy(gap) {
    store.easyDirectOpen = true;
    if (!gap || gap.sectionId === "name") {
      setCopyListOpen(null);
      store.copyListFocusField = null;
      openEasyStage("文章", { keepGapReturn: true });
      store.easyGapReturn = "easy-done";
      return;
    }
    if (gap.sectionId === "hero") {
      store.catchPage = catchWordsAreOn() ? "write" : "ask";
      openEasyStage("キャッチ", { keepGapReturn: true });
      store.easyGapReturn = "easy-done";
      return;
    }
    const sec = copyListSectionById(gap.sectionId);
    const itemIndex = gap.itemIndex == null ? null : gap.itemIndex;
    setCopyListOpen({ kind: "item", sectionId: gap.sectionId, itemIndex: itemIndex });
    store.copyListFocusField = gap.focus || (sec ? copyListDefaultFocus(sec, itemIndex) : null);
    openEasyStage("文章", { keepGapReturn: true });
    store.easyGapReturn = "easy-done";
  }

  function easyDoneCopyVisible(key) {
    const node = copyPreviewNodeForField(key);
    if (node && String(node.textContent || "").replace(/\s+/g, "").length) return true;
    return !!String(resolvePreviewText(fieldValue(key), key, "") || "").trim();
  }

  function easyDoneCopyGaps() {
    const gaps = [];
    if (!homepageName()) {
      gaps.push({ label: "ホームページタイトルがありません", sectionId: "name" });
    }
    ensureCopyListOrder().forEach(function (id) {
      const sec = copyListSectionById(id);
      if (!sec || !copySectionIsListed(sec)) return;
      if (sec.id === "hero") {
        if (!easyCatchOn() || store.catchWordsOn === false) return;
        const keys = ["hero_title", "hero_lead_1", "hero_lead_2", "hero_lead_3"];
        if (keys.every(function (key) { return !easyDoneCopyVisible(key); })) {
          gaps.push({ label: "キャッチの文章がありません", sectionId: "hero", focus: "hero_title" });
        }
        return;
      }
      if (sec.singleKey) {
        if (!easyDoneCopyVisible(sec.singleKey)) {
          gaps.push({
            label: sec.label + "の文章がありません",
            sectionId: sec.id,
            itemIndex: null,
            focus: sec.singleKey
          });
        }
        return;
      }
      if (sec.kind !== "pair") return;
      copyListItemIndices(sec).forEach(function (itemIndex) {
        const fields = copyListItemFields(sec, itemIndex).filter(function (field) {
          return field.label === "見出し" || field.label === "文";
        });
        const empty = fields.filter(function (field) {
          return !easyDoneCopyVisible(field.key);
        });
        if (!fields.length || empty.length !== fields.length) return;
        gaps.push({
          label: sec.label + itemIndex + "の文章がありません",
          sectionId: sec.id,
          itemIndex: itemIndex,
          focus: empty[0].key
        });
      });
    });
    return gaps;
  }

  function easyDoneCopyStillSample(keys) {
    const base = store.sampleCopyBaseline;
    if (!base || typeof base !== "object" || !keys.length) return false;
    let visible = false;
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      const saved = String(base[key] == null ? "" : base[key]).trim();
      const now = String(fieldValue(key) || "").trim();
      if (saved !== now) return false;
      if (easyDoneCopyVisible(key)) visible = true;
    }
    return visible;
  }

  function easyDoneSampleCopyItems() {
    const items = [];
    if (store.entryBranch !== "sample") return items;
    if (!store.sampleCopyBaseline || typeof store.sampleCopyBaseline !== "object") return items;
    ensureCopyListOrder().forEach(function (id) {
      const sec = copyListSectionById(id);
      if (!sec || !copySectionIsListed(sec)) return;
      if (sec.id === "hero") {
        if (store.catchWordsOn === false) return;
        const keys = ["hero_title", "hero_lead_1", "hero_lead_2", "hero_lead_3"];
        if (!easyDoneCopyStillSample(keys)) return;
        items.push({
          label: "キャッチは、サンプルの文章のままです。よろしいですか",
          sectionId: "hero",
          focus: "hero_title"
        });
        return;
      }
      if (sec.singleKey) {
        if (!easyDoneCopyStillSample([sec.singleKey])) return;
        items.push({
          label: sec.label + "は、サンプルの文章のままです。よろしいですか",
          sectionId: sec.id,
          itemIndex: null,
          focus: sec.singleKey
        });
        return;
      }
      if (sec.kind !== "pair") return;
      copyListItemIndices(sec).forEach(function (itemIndex) {
        const fields = copyListItemFields(sec, itemIndex).filter(function (field) {
          return field.label === "見出し" || field.label === "文";
        });
        const keys = fields.map(function (field) {
          return field.key;
        });
        if (!easyDoneCopyStillSample(keys)) return;
        items.push({
          label: sec.label + itemIndex + "は、サンプルの文章のままです。よろしいですか",
          sectionId: sec.id,
          itemIndex: itemIndex,
          focus: fields[0] ? fields[0].key : null
        });
      });
    });
    return items;
  }

  function renderEasyDoneCheck() {
    const missTitle = document.getElementById("easy-done-miss-title");
    const missList = document.getElementById("easy-done-miss-list");
    const sampleList = document.getElementById("easy-done-sample-list");
    if (!missList || !sampleList) return;
    const reds = [];
    const samples = [];
    requiredImageInputs().forEach(function (item) {
      const name = item.name;
      if (name === "hero_image" && (!easyCatchOn() || store.catchImageOn === false || store.heroImageOff)) return;
      if (easyDoneImageStillSample(name)) {
        samples.push({
          name: name,
          label: (item.label || name) + "は、サンプルの写真のままです。よろしいですか"
        });
        return;
      }
      if (!inputHasFile(name)) {
        reds.push({ name: name, label: (item.label || name) + "がありません" });
      }
    });
    easyDoneCopyGaps().forEach(function (gap) {
      reds.push(gap);
    });
    ensureSampleCopyBaseline();
    easyDoneSampleCopyItems().forEach(function (item) {
      samples.push(item);
    });
    if (missTitle) missTitle.hidden = !reds.length;
    missList.innerHTML = "";
    reds.forEach(function (item) {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "finish-missing-link";
      btn.textContent = item.label;
      btn.addEventListener("click", function () {
        if (item.name) openEasyGapImage(item.name);
        else openEasyGapCopy(item);
      });
      li.appendChild(btn);
      missList.appendChild(li);
    });
    sampleList.innerHTML = "";
    samples.forEach(function (item) {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "easy-done-sample-link";
      btn.textContent = item.label;
      btn.addEventListener("click", function () {
        if (item.name) openEasyGapImage(item.name);
        else openEasyGapCopy(item);
      });
      li.appendChild(btn);
      sampleList.appendChild(li);
    });
  }

  function ensureEasyDirectAfterTitle() {
    if (!store.easyFlowActive || store.uiMode !== "guided") return;
    if (store.copyScreenReturn === "hub") return;
    if (store.easyDirectOpen) return;
    const flow = getFlowSteps();
    const nameAt = flow.findIndex(function (s) { return s.id === "easy-site-name"; });
    if (nameAt >= 0 && store.wizardStepIndex > nameAt) store.easyDirectOpen = true;
  }

  function syncEasyFlowMeter() {
    ensureEasyDirectAfterTitle();
    const n = easyFlowStageIndex();
    document.querySelectorAll("[data-easy-flow-meter]").forEach(function (meter) {
      const label = meter.querySelector("[data-easy-flow-meter-label]");
      const fill = meter.querySelector("[data-easy-flow-meter-fill]");
      if (!n) {
        meter.hidden = true;
        return;
      }
      meter.hidden = false;
      const labels = easyFlowStageLabels();
      const stageCount = labels.length;
      meter.classList.toggle("is-wide", stageCount > 8);
      meter.classList.toggle("is-direct", !!store.easyDirectOpen);
      if (label) label.textContent = labels[n - 1] + "\u3000" + n + " / " + stageCount;
      if (fill) fill.style.width = (n / stageCount) * 100 + "%";
      const names = meter.querySelector("[data-easy-flow-meter-names]");
      if (names) {
        names.textContent = "";
        names.style.gridTemplateColumns = "repeat(" + stageCount + ", minmax(0, 1fr))";
        labels.forEach(function (name, i) {
          const locked = store.entryBranch === "detail" && name === "見本";
          const clickable = !!store.easyDirectOpen && !locked;
          const el = document.createElement(clickable ? "button" : "span");
          el.className = "easy-flow-meter-name" + (i + 1 === n ? " is-now" : "") + (locked ? " is-locked" : "");
          el.textContent = name;
          if (locked) el.setAttribute("aria-disabled", "true");
          if (clickable) {
            el.type = "button";
            el.addEventListener("click", function () {
              openEasyStage(name);
            });
          }
          names.appendChild(el);
        });
      }
    });
  }

  function updateProgressBar() {
    buildProgressBar();
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
      if (remaining === 0) return { line: "完成です。提出へ", cheer: "" };
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
          " が未完了です。並び替え・確認画面から該当項目を開いてください。"
        );
      }
      return "下の大きなボタンで依頼ファイルを保存できます。";
    }
    if (remaining === 0 && step && step.id !== "guide" && step.id !== "purpose") {
      return "進捗はすべて緑です。提出へ進めます。";
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

  function syncFontPickerCurrentLabels() {
    document.querySelectorAll(".font-picker-block[data-font-role]").forEach((block) => {
      const picker = block.querySelector("[data-font-picker]");
      const cur = block.querySelector("[data-font-current]");
      if (!picker || !cur) return;
      const input = picker.querySelector('input[type="hidden"]');
      const name = (input && input.value) || picker.getAttribute("data-font-default") || "";
      const label = FONT_LABELS[name] || name || "未選択";
      cur.textContent = "現在：" + label;
    });
  }

  function setFontPickerOpen(block, open) {
    if (!block) return;
    const picker = block.querySelector("[data-font-picker]");
    const toggle = block.querySelector("[data-font-toggle]");
    if (!picker || !toggle) return;
    if (open) {
      picker.hidden = false;
      toggle.setAttribute("aria-expanded", "true");
      block.classList.add("is-open");
    } else {
      picker.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
      block.classList.remove("is-open");
    }
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
    syncFontPickerCurrentLabels();
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
    syncFontPickerCurrentLabels();
  }

  function setupFontPickers() {
    document.querySelectorAll(".font-picker-block[data-font-role]").forEach((block) => {
      if (block.dataset.fontToggleBound === "1") return;
      block.dataset.fontToggleBound = "1";
      const toggle = block.querySelector("[data-font-toggle]");
      if (!toggle) return;
      toggle.addEventListener("click", () => {
        const willOpen = toggle.getAttribute("aria-expanded") !== "true";
        document.querySelectorAll(".font-picker-block[data-font-role]").forEach((other) => {
          setFontPickerOpen(other, other === block && willOpen);
        });
        /* 開閉で左プレビューを動かさない（キャッチ位置が上下に振れるのを防ぐ） */
      });
    });
    document.querySelectorAll("[data-font-picker]").forEach((picker) => {
      const input = picker.querySelector('input[type="hidden"]');
      const grid = picker.querySelector(".font-card-grid");
      if (!input || !grid) return;
      if (grid.dataset.fontGridBound === "1") return;
      grid.dataset.fontGridBound = "1";
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
        /* 連続で試せるよう、選択後もアコーディオンは開いたまま */
      });
    });
  }

  function rememberImageDefaults() {
    const hero = root.querySelector(".hero-photo");
    if (hero) IMAGE_DEFAULTS.hero_image = hero.getAttribute("data-default-src") || hero.getAttribute("src");
    root.querySelectorAll("#about-photos > [data-item-id]").forEach((li) => {
      const slot = li.getAttribute("data-item-id");
      const img = li.querySelector(".skill-card-img");
      if (!slot || !img) return;
      IMAGE_DEFAULTS[slot] = img.getAttribute("data-default-src") || img.getAttribute("src");
    });
    root.querySelectorAll("#works-list > [data-item-id]").forEach((li) => {
      const slot = li.getAttribute("data-item-id") || "";
      const img = li.querySelector(".work-thumb");
      const m = /^work_(\d+)$/.exec(slot);
      if (!m || !img) return;
      IMAGE_DEFAULTS["work_" + m[1] + "_image"] = img.getAttribute("data-default-src") || img.getAttribute("src");
    });
  }

  function imageUrlHeldForUndo(key, url) {
    try {
      const snap = layoutReplaceBefore && layoutReplaceBefore[key];
      return !!(url && snap && snap.url === url);
    } catch (e) {
      return false;
    }
  }

  function releaseReplacedImageUrl(key, url) {
    if (!url || String(url).indexOf("blob:") !== 0) return;
    if (imageUrlHeldForUndo(key, url)) return;
    try {
      URL.revokeObjectURL(url);
    } catch (e) {
      /* ignore */
    }
  }

  function setImageUrl(key, file) {
    const prev = imageUrls[key];
    if (prev) releaseReplacedImageUrl(key, prev);
    if (!file) {
      delete imageUrls[key];
      return null;
    }
    const url = URL.createObjectURL(file);
    imageUrls[key] = url;
    return url;
  }

  function setRemoteImageUrl(key, url) {
    const prev = imageUrls[key];
    const next = url == null ? "" : String(url).trim();
    if (prev && prev !== next) releaseReplacedImageUrl(key, prev);
    if (!next) {
      delete imageUrls[key];
      return null;
    }
    imageUrls[key] = next;
    return next;
  }

  function applyDraftImagePaths(paths) {
    if (!paths || typeof paths !== "object") return;
    Object.keys(paths).forEach(function (name) {
      const path = paths[name];
      if (path == null || String(path).trim() === "") return;
      setRemoteImageUrl(name, path);
      applyImageSlotByName(name, true);
    });
    syncLogoPresentation();
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
        return;
      }
      /* ギャラリー／見本の remote URL は消さない（旧実装はここで revoke→削除してプレビューが戻っていた） */
      if (imageUrls[name] || (store.galleryPicks && store.galleryPicks[name])) {
        out[name] = true;
        return;
      }
      if (store.zipImageFiles && store.zipImageFiles[name]) {
        out[name] = true;
        return;
      }
      out[name] = false;
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
    if (target) {
      target.classList.toggle("is-user-upload", !!on);
      if (target.classList.contains("hero-stage")) applyHeroTextOverlay();
    }
  }

  function normalizeHeroPlate(shape) {
    if (shape === "rect" || shape === "oval" || shape === "round" || shape === "none") return shape;
    return "round";
  }

  function heroPlateLastShape() {
    const v = normalizeHeroPlate(store.heroTextPlateLast || "round");
    return v === "none" ? "round" : v;
  }

  function setHeroPlatePresence(on) {
    if (on) {
      store.heroTextPlate = heroPlateLastShape();
    } else {
      if (store.heroTextPlate && store.heroTextPlate !== "none") {
        store.heroTextPlateLast = store.heroTextPlate;
      }
      store.heroTextPlate = "none";
    }
    if (heroPlateIsOn() && (store.catchPage || "") === "color") store.catchPage = "write";
    syncCatchColorAvailability();
  }

  function heroPlateIsOn() {
    return normalizeHeroPlate(store.heroTextPlate) !== "none";
  }

  function syncCatchColorAvailability() {
    const hide = heroPlateIsOn();
    syncLayoutColorRows();
    const unit = document.querySelector('[data-color-step="hero-color"]');
    if (unit && hide) unit.hidden = true;
    if (!hide && unit && unit.getAttribute("data-copy-borrowed") === "1") unit.hidden = false;
  }

  function normalizeHeroPlateTone(tone) {
    return tone === "dark" ? "dark" : "white";
  }

  /* キャッチ文字の九位置（ハニカム八矢印＋中央） */
  const HERO_TEXT_POS_IDS = [
    "center",
    "top",
    "top-right",
    "right",
    "bottom-right",
    "bottom",
    "bottom-left",
    "left",
    "top-left"
  ];
  const HERO_TEXT_POS_COMPASS = [
    { id: "top-left", label: "左上", arrow: "↖", col: 1, row: 1 },
    { id: "top", label: "上", arrow: "↑", col: 2, row: 1 },
    { id: "top-right", label: "右上", arrow: "↗", col: 3, row: 1 },
    { id: "left", label: "左", arrow: "←", col: 1, row: 2 },
    { id: "center", label: "中央", arrow: "", col: 2, row: 2, center: true },
    { id: "right", label: "右", arrow: "→", col: 3, row: 2 },
    { id: "bottom-left", label: "左下", arrow: "↙", col: 1, row: 3 },
    { id: "bottom", label: "下", arrow: "↓", col: 2, row: 3 },
    { id: "bottom-right", label: "右下", arrow: "↘", col: 3, row: 3 }
  ];

  function normalizeHeroTextPos(pos) {
    return HERO_TEXT_POS_IDS.indexOf(pos) >= 0 ? pos : "center";
  }

  function applyHeroTextPos() {
    const stage = root.querySelector(".hero-stage");
    if (!stage) return;
    const pos = normalizeHeroTextPos(store.heroTextPos);
    store.heroTextPos = pos;
    HERO_TEXT_POS_IDS.forEach(function (id) {
      stage.classList.remove("hero-text-pos-" + id);
    });
    stage.classList.add("hero-text-pos-" + pos);
  }

  /** 編集ハブで載せる／載せないを触れられるか（サンプル本線では操作しない） */
  function heroTextOverlayAllowed() {
    if (store.easyFlowActive) return false;
    return store.siteColorMode === "detail";
  }

  let heroCopyFitFrame = 0;
  let copyListRenderKeepScroll = false;

  function scheduleHeroCopyFitCheck() {
    if (heroCopyFitFrame) window.cancelAnimationFrame(heroCopyFitFrame);
    heroCopyFitFrame = window.requestAnimationFrame(function () {
      heroCopyFitFrame = window.requestAnimationFrame(function () {
        heroCopyFitFrame = 0;
        syncHeroCopyFitNotice();
      });
    });
  }

  function syncHeroCopyFitNotice() {
    const note = document.getElementById("easy-copy-hero-fit-note");
    const stage = root && root.querySelector(".hero-stage.is-hero-text-on");
    const copy = stage && stage.querySelector(".hero-copy");
    const plate = stage && stage.querySelector(".hero-copy-plate");
    if (!note) return;
    if (!copy || !plate || copy.clientWidth < 8 || copy.clientHeight < 8) {
      note.hidden = true;
      return;
    }
    const cs = window.getComputedStyle(copy);
    const padT = parseFloat(cs.paddingTop) || 0;
    const padR = parseFloat(cs.paddingRight) || 0;
    const padB = parseFloat(cs.paddingBottom) || 0;
    const padL = parseFloat(cs.paddingLeft) || 0;
    const cr = copy.getBoundingClientRect();
    const pr = plate.getBoundingClientRect();
    const overflows = pr.top < cr.top + padT - 1
      || pr.bottom > cr.bottom - padB + 1
      || pr.left < cr.left + padL - 1
      || pr.right > cr.right - padR + 1;
    note.hidden = !overflows;
  }

  function bindHeroCopyFitWatch() {
    const stage = root && root.querySelector(".hero-stage");
    if (!stage || stage.dataset.fitWatch === "1" || typeof ResizeObserver !== "function") return;
    stage.dataset.fitWatch = "1";
    const watch = new ResizeObserver(function () {
      scheduleHeroCopyFitCheck();
    });
    watch.observe(stage);
  }

  function applyHeroTextOverlay() {
    const stage = root.querySelector(".hero-stage");
    if (!stage) return;
    /* 見本draftのオンは本線プレビューでも表示（操作UIはハブのみ） */
    const on = !!store.heroTextOnPhoto;
    const plate = normalizeHeroPlate(store.heroTextPlate);
    const tone = normalizeHeroPlateTone(store.heroTextPlateTone);
    store.heroTextPlate = plate;
    store.heroTextPlateTone = tone;

    stage.classList.toggle("is-hero-text-on", on);
    stage.classList.toggle("is-hero-text-off", !on);
    stage.classList.remove("hero-plate-none", "hero-plate-rect", "hero-plate-round", "hero-plate-oval");
    stage.classList.remove("hero-plate-tone-white", "hero-plate-tone-dark");
    if (on) {
      stage.classList.add("hero-plate-" + plate);
      stage.classList.add("hero-plate-tone-" + tone);
    }
    applyHeroTextPos();
    syncHeroTextOverlayUi();
    bindHeroCopyFitWatch();
    scheduleHeroCopyFitCheck();
  }

  function syncHeroTextOverlayUi() {
    const allowed = heroTextOverlayAllowed();
    const panel = document.getElementById("hero-text-overlay-panel");
    if (panel) panel.hidden = !allowed;
    const on = !!store.heroTextOnPhoto;
    document.querySelectorAll("[data-hero-text-on]").forEach((btn) => {
      const v = btn.getAttribute("data-hero-text-on") === "1";
      btn.classList.toggle("is-active", on === v);
      btn.setAttribute("aria-pressed", on === v ? "true" : "false");
    });
    const fields = document.getElementById("hero-text-fields");
    if (fields) {
      /* 編集ハブ（detail）では「載せる」のときだけ入力を出す。サンプル本線は従来どおり常時 */
      fields.hidden = allowed && !on;
    }
    const gateNote = document.getElementById("hero-text-gate-note");
    if (gateNote) gateNote.hidden = !allowed || on;
    const opts = document.getElementById("hero-text-plate-options");
    if (opts) opts.hidden = !on;
    const plate = normalizeHeroPlate(store.heroTextPlate);
    document.querySelectorAll("[data-hero-plate]").forEach((btn) => {
      const v = btn.getAttribute("data-hero-plate");
      btn.classList.toggle("is-active", plate === v);
      btn.setAttribute("aria-pressed", plate === v ? "true" : "false");
    });
    const tone = normalizeHeroPlateTone(store.heroTextPlateTone);
    document.querySelectorAll("[data-hero-plate-tone]").forEach((btn) => {
      const v = btn.getAttribute("data-hero-plate-tone");
      btn.classList.toggle("is-active", tone === v);
      btn.setAttribute("aria-pressed", tone === v ? "true" : "false");
    });
  }

  function setupHeroTextOverlayUi() {
    document.querySelectorAll("[data-hero-text-on]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!heroTextOverlayAllowed()) return;
        const wantOn = btn.getAttribute("data-hero-text-on") === "1";
        store.heroTextOnPhoto = wantOn;
        applyHeroTextOverlay();
        /* 載せる：見本写真でもタイトル／リードをすぐ反映 */
        if (wantOn) applyAllConfirmed();
        scheduleSave();
        /* 載せない＝この設定は終わり。できること／ハブへ戻る */
        if (!wantOn) {
          window.setTimeout(() => returnToLayoutHub(), 0);
        }
      });
    });
    document.querySelectorAll("[data-hero-plate]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!heroTextOverlayAllowed() || !store.heroTextOnPhoto) return;
        store.heroTextPlate = normalizeHeroPlate(btn.getAttribute("data-hero-plate"));
        applyHeroTextOverlay();
        scheduleSave();
      });
    });
    document.querySelectorAll("[data-hero-plate-tone]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!heroTextOverlayAllowed() || !store.heroTextOnPhoto) return;
        store.heroTextPlateTone = normalizeHeroPlateTone(btn.getAttribute("data-hero-plate-tone"));
        applyHeroTextOverlay();
        scheduleSave();
      });
    });
  }

  function applyImageSlot(name, selectorOrFn, active) {
    const el = typeof selectorOrFn === "string" ? root.querySelector(selectorOrFn) : selectorOrFn();
    if (!el) return;
    if (name === "hero_image" && store.heroImageOff && !(active && imageUrls[name])) {
      el.removeAttribute("src");
      el.alt = "";
      return;
    }
    if (name === "hero_image" && active && imageUrls[name]) {
      const wasOff = store.heroImageOff;
      store.heroImageOff = false;
      if (wasOff) {
        applyHeroImageOffState();
        const step = getCurrentFlowStep();
        if (step && step.id === "easy-catch") renderEasyCatchRest();
      }
    }
    if (imageUrls[name]) {
      el.src = imageUrls[name];
      markUserUpload(el, true);
      if (name === "logo_image") el.hidden = false;
    } else {
      markUserUpload(el, false);
      if (name === "logo_image") {
        el.hidden = true;
        el.removeAttribute("src");
      } else if (store.blankCanvas) {
        el.removeAttribute("src");
        el.alt = "";
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
      } else if (samplePreviewBrand()) {
        text.hidden = false;
        text.classList.remove("is-hint");
        text.textContent = samplePreviewBrand();
      } else if (store.blankCanvas) {
        text.hidden = false;
        text.classList.remove("is-hint");
        text.textContent = "";
      } else {
        text.hidden = false;
        renderHeaderLogoHint(text);
      }
    }
  }

  function syncFooterBrand() {
    const el = document.getElementById("footer-brand");
    if (!el) return;
    el.textContent = samplePreviewBrand();
  }

  /** サンプル屋号をロゴ／フッターへ揃える（draftに brand_name が無い見本対策） */
  function isPlaceholderBrand(name) {
    const s = String(name || "").trim();
    if (!s) return true;
    if (s === "店名" || s === "サイトタイトル") return true;
    if (/（仮）$/.test(s)) return true;
    return false;
  }

  function applySampleBrandName(name) {
    const brand = String(name || "").trim();
    if (!brand) return false;
    store.sushiSampleBrand = brand;
    syncPreviewHeaderChrome();
    return true;
  }

  function ensureSampleBrandName(draft) {
    const current = String(fieldValue("brand_name") || "").trim();
    if (!isPlaceholderBrand(current)) {
      store.sushiSampleBrand = current;
      syncFooterBrand();
      return Promise.resolve(current);
    }
    const fromDraftField =
      draft && draft.fields && String(draft.fields.brand_name || "").trim();
    const fromDraftMeta = draft && String(draft.brand || "").trim();
    const fromQuery = String(
      new URLSearchParams(location.search).get("brand") || ""
    ).trim();
    const immediate = fromDraftField || fromDraftMeta || fromQuery;
    if (immediate && !isPlaceholderBrand(immediate)) {
      applySampleBrandName(immediate);
      return Promise.resolve(immediate);
    }
    const sid = draft && String(draft.sushiSampleId || "").trim();
    if (!sid) return Promise.resolve("");
    return fetch("sushi-samples/manifest.json?v=" + Date.now())
      .then(function (r) {
        return r.json();
      })
      .then(function (man) {
        const list = (man && man.samples) || [];
        const hit = list.find(function (s) {
          return String(s.id) === sid || String(s.id) === String(Number(sid));
        });
        const brand = hit && String(hit.brand || "").trim();
        if (brand) applySampleBrandName(brand);
        return brand || "";
      })
      .catch(function () {
        return "";
      });
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
    /* 表示ON/OFFは store.draftExtras が正。旧トグルUIがあれば同期するだけ */
    ["hours", "access", "address", "announce"].forEach((key) => {
      const toggle = document.querySelector('[data-extra-toggle="' + key + '"]');
      if (toggle) store.draftExtras[key] = !!toggle.checked;
    });
  }

  function extraStepIdForKey(key) {
    if (key === "hours") return "hours-text";
    if (key === "access") return "access-text";
    if (key === "address") return "address-text";
    if (key === "announce") return "announce-text";
    return null;
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
    refreshLayoutArrangeWireLabels();
    if (store.hubUiMode === "place-list") renderHubPlaceNames();
    if (store.hubUiMode === "place-actions" && store.hubPlaceSelectedBlockId) {
      renderHubPlaceSectionActions(store.hubPlaceSelectedBlockId);
    }
    if (store.hubUiMode === "task-where" && store.hubTaskId) {
      const task = HUB_TASKS.find((t) => t.id === store.hubTaskId);
      if (task) renderHubTaskWhereNames(getHubTaskTargets(task.kind));
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
      applyImageSlot(name, () => {
        const li = root.querySelector('#about-photos > [data-item-id="' + name + '"]');
        return li ? li.querySelector(".skill-card-img") : null;
      }, active);
      return;
    }
    if (/^work_\d+_image$/.test(name)) {
      const n = Number(name.match(/^work_(\d+)_image$/)[1]);
      applyImageSlot(name, () => {
        const li = root.querySelector('#works-list > [data-item-id="work_' + n + '"]');
        return li ? li.querySelector(".work-thumb") : null;
      }, active);
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
      const name = "about_image_" + i;
      applyImageSlot(name, () => {
        const li = root.querySelector('#about-photos > [data-item-id="' + name + '"]');
        return li ? li.querySelector(".skill-card-img") : null;
      }, false);
    }
    for (let i = 1; i <= 3; i += 1) {
      const slot = "work_" + i;
      applyImageSlot("work_" + i + "_image", () => {
        const li = root.querySelector('#works-list > [data-item-id="' + slot + '"]');
        return li ? li.querySelector(".work-thumb") : null;
      }, false);
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
    LIVE_IMAGE_INPUT_NAMES.forEach(function (name) {
      if (imageUrls[name]) applyImageSlotByName(name, true);
    });
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

  function normalizeHeadingScale(raw) {
    const v = String(raw || "").trim();
    if (v === "0.8" || v === "1") return "1";
    if (v === "1.15" || v === "1.35") return "1.15";
    if (v === "2.5") return "2.5";
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return DEFAULTS.headingScale;
    if (n < 1.08) return "1";
    if (n < 1.8) return "1.15";
    return "2.5";
  }

  function normalizeAccentBar(raw) {
    const v = String(raw || "").trim();
    if (v === "short" || v === "mid" || v === "long") return v;
    return DEFAULTS.accentBar;
  }

  function accentBarIsOn() {
    return fieldValue("accentBarOn") !== "off";
  }

  function applyAccentBarToRoot() {
    if (!root) return;
    const on = accentBarIsOn();
    const bar = on ? normalizeAccentBar(fieldValue("accentBar") || DEFAULTS.accentBar) : "none";
    root.setAttribute("data-accent-bar", bar);
    const field = document.querySelector(".accent-bar-field");
    if (field) field.classList.toggle("is-off", !on);
  }

  function purposeField(name) {
    if (store.blankCanvas) return "";
    const pack = store.sitePurpose && PURPOSE_PACKS[store.sitePurpose];
    if (!pack || !pack.fields) return "";
    return String(pack.fields[name] || "");
  }

  const BLANK_SECTION_TITLES = {
    about_section_name: true,
    works_section_name: true,
    contact_section_name: true,
    contact_label: true
  };

  /** 入力があれば入力、空なら用途の例文、それもなければハードフォールバック */
  function resolvePreviewText(raw, fieldName, hardFallback) {
    if (raw != null && String(raw).trim() !== "") return String(raw).trim();
    if (store.blankCanvas) {
      if (BLANK_SECTION_TITLES[fieldName] && hardFallback != null && String(hardFallback).trim() !== "") {
        return String(hardFallback).trim();
      }
      return "";
    }
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

  function formToObject(opts) {
    const includeHidden = !!(opts && opts.includeHidden);
    const data = {};
    Array.from(form.querySelectorAll("input, textarea, select")).forEach((el) => {
      if (!el.name || el.type === "file") return;
      if (!includeHidden && !isFieldVisible(el)) return;
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
    const parked = (store.itemOrderParked && store.itemOrderParked["works-list"]) || [];
    parked.forEach((slot) => {
      const m = /^work_(\d+)$/.exec(String(slot || ""));
      if (!m) return;
      ["title", "text", "url", "link_label"].forEach((suffix) => {
        const name = "work_" + m[1] + "_" + suffix;
        const el = form.elements.namedItem(name);
        if (!el || el.type === "file") return;
        data[name] = el.value;
      });
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
      extras: { hours: false, access: false, address: false, announce: false },
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
        aboutLabel: (document.getElementById("about-label") || {}).textContent || "開く項目",
        aboutHeading: (document.getElementById("about-heading") || {}).textContent || "ここに大見出し",
        worksLabel: (document.getElementById("works-label") || {}).textContent || "カード",
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
    /* 撮影／他ステップ非表示でも、フォームに入っている文を全部プレビューへ載せる */
    const fields = formToObject({ includeHidden: true });
    [
      "logo-text",
      "hero-text",
      "values-text",
      "about-text",
      "works-text",
      "hours-text",
      "access-text",
      "address-text",
      "contact-text"
    ].forEach((stepId) => {
      const snap = captureStepSnapshot(stepId, fields);
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
    if (stepId === "global-accent") {
      snap.accentBar = normalizeAccentBar(fieldValue("accentBar") || DEFAULTS.accentBar);
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
    /* 決めた色は、段を移っても次に変えるまで見本に残す */
    const keepDraftColors = store.siteColorMode === "detail" || (store.siteColorMode === "easy" && store.presetChosen);
    if (keepDraftColors) {
      SWATCH_KEYS.forEach((key) => {
        if (store.draftColors[key] != null) colors[key] = draftColorForPreview(key);
      });
      colors.pageBgSoft = softFrom(colors.pageBg);
      colors.bodyMuted = softMuted(colors.bodyInk);
    } else if (current && current.id === "easy-catch") {
      if (store.draftColors.heroInk != null) colors.heroInk = draftColorForPreview("heroInk");
    } else if (current && (COLOR_STEP_FIELDS[current.id] || current.id === "easy-color-stage")) {
      const keys = current.id === "easy-color-stage" ? SWATCH_KEYS : COLOR_STEP_FIELDS[current.id];
      keys.forEach((key) => {
        if (store.draftColors[key] != null) colors[key] = draftColorForPreview(key);
      });
      if (keys.includes("pageBg")) {
        colors.pageBgSoft = softFrom(colors.pageBg);
      }
      if (keys.includes("bodyInk")) {
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
    if (stepId === "easy-copy-path") {
      if (store.copyPathMode !== "keyword" && store.copyPathMode !== "omakase") {
        return "決め方を選んでください。";
      }
      return "";
    }
    if (stepId === "easy-img-path") {
      if (store.imgPathMode !== "self" && store.imgPathMode !== "omakase") {
        return "写真の決め方を選んでください。";
      }
      return "";
    }
    if (stepId === "easy-img-omakase") {
      const miss = IMG_OMAKASE_SLOTS.filter(function (slot) {
        return !inputHasFile(slot.input);
      });
      if (miss.length) {
        return "写真の候補がそろってから、「これで進む」を押せます。";
      }
      return "";
    }
    if (HUB_IMG_STEP_IDS.indexOf(stepId) >= 0) {
      const mode = store.hubImgPathMode && store.hubImgPathMode[stepId];
      if (!mode) {
        return "写真の決め方を選んでください。";
      }
      if (mode === "omakase") {
        const slots = getImgSlotsForStep(stepId);
        const miss = slots.filter(function (slot) {
          return !inputHasFile(slot.input);
        });
        if (miss.length) {
          return "写真の候補がそろってから、「これで進む」を押せます。";
        }
      }
      return "";
    }
    if (stepId === "easy-copy-dirs") {
      if (!Array.isArray(store.copyDirIds) || store.copyDirIds.length < 1) {
        return "方向を1つ以上選んでから、「" + action + "」を押してください。";
      }
      return "";
    }
    if (stepId === "easy-basics" || stepId === "easy-site-name") {
      return "";
    }
    if (stepId === "easy-color") {
      const colorEl = document.querySelector('input[name="entry_sample_color"]:checked');
      if (!colorEl) return "配色を選んでください。";
      return "";
    }
    if (stepId === "easy-copy-omakase") {
      if (!homepageName()) return "ホームページタイトルをご記入ください。入力しないと、先へ進めません。";
      return "";
    }
    if (stepId === "easy-copy-frame") {
      if (currentCopyFrameId() === "hero" && store.copyHeroOnPhoto == null) {
        return "写真の上に言葉を出すか、出さないか、選んでから進んでください。";
      }
      return "";
    }
    if (SAMPLE_SEC_STEP_IDS.indexOf(stepId) >= 0) {
      const sec = SAMPLE_SEC_ID_FROM_STEP[stepId];
      if (store.sampleSectionSelected[sec] == null) {
        return "文章を1〜5から選んでください。";
      }
      return "";
    }
    if (stepId === "easy-img-wire") {
      const miss = collectVisibleImageSlots().filter(function (slot) {
        return !inputHasFile(slot.input);
      });
      if (miss.length) return "見えている枠に写真があると、次へ進めます。";
      return "";
    }
    if (stepId === "easy-loading" || stepId === "easy-done") return "";
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
    /* 編集ハブからの個別編集では未選択のまま確定／戻り可（サンプル本線は従来どおり必須） */
    if (miss.length && store.siteColorMode !== "detail") {
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
      if (
        store.siteColorMode !== "detail" &&
        (mode === "image" || mode === "both") &&
        !inputHasFile("logo_image")
      ) {
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
    if (input && input.files && input.files[0]) return true;
    if (store.zipImageFiles && store.zipImageFiles[name]) return true;
    if (imageUrls[name]) return true;
    return false;
  }

  function sampleDefaultSrc(name) {
    if (store.blankCanvas) return "";
    const src = IMAGE_DEFAULTS[name];
    if (src == null) return "";
    const text = String(src).trim();
    if (!text || text.indexOf("blob:") === 0) return "";
    return text;
  }

  function visibleUnfilledImageSlots() {
    return collectVisibleImageSlots().filter(function (slot) {
      return !inputHasFile(slot.input);
    });
  }

  function adoptVisibleSampleImages(slots) {
    if (!store.sampleKeptImagePaths || typeof store.sampleKeptImagePaths !== "object") {
      store.sampleKeptImagePaths = {};
    }
    (slots || []).forEach(function (slot) {
      const name = slot.input;
      if (inputHasFile(name)) return;
      const src = sampleDefaultSrc(name);
      if (!src) return;
      setRemoteImageUrl(name, src);
      applyImageSlotByName(name, true);
      store.sampleKeptImagePaths[name] = src;
    });
    scheduleSave();
  }

  function restoreKeptSampleImages() {
    const paths = store.sampleKeptImagePaths;
    if (!paths || typeof paths !== "object") return;
    Object.keys(paths).forEach(function (name) {
      const src = paths[name];
      if (src == null || String(src).trim() === "") return;
      if (inputHasFile(name)) return;
      setRemoteImageUrl(name, String(src).trim());
      applyImageSlotByName(name, true);
    });
  }

  function catchBothDeclined() {
    return store.catchImageOn === false && store.catchWordsOn === false;
  }

  function catchRemovalBlocksNext() {
    return !!easyCatchOn() && catchBothDeclined();
  }

  function syncCatchRemovalNotice() {
    if (catchRemovalBlocksNext()) {
      showValidationNotice("記載項目から、キャッチを外してください。");
      return;
    }
    const panel = document.getElementById("wizard-foot-panel");
    if (panel && panel.textContent.indexOf("記載項目から、") === 0) clearPlainFootNotice();
  }

  function requiredImageInputs() {
    const list = [];
    if (easyCatchOn() && store.catchImageOn !== false && !store.heroImageOff) {
      list.push({ name: "hero_image", label: "キャッチ画像" });
    }
    seedItemOrder("about-photos");
    (store.itemOrders["about-photos"] || []).forEach((slot) => {
      const n = String(slot).replace("about_image_", "");
      list.push({ name: slot, label: "写真" + n });
    });
    seedItemOrder("works-list");
    (store.itemOrders["works-list"] || []).forEach((slot) => {
      const n = String(slot).replace("work_", "");
      list.push({ name: "work_" + n + "_image", label: "カード画像" + n });
    });
    const mode = getLogoMode();
    if (mode === "image" || mode === "both") {
      list.push({ name: "logo_image", label: "ロゴ画像" });
    }
    return list;
  }

  function missingRequiredImages() {
    return requiredImageInputs().filter((item) => !inputHasFile(item.name));
  }

  function zipImageGaps() {
    const gaps = missingRequiredImages();
    if (!isSampleZipScreen()) return gaps;
    return gaps.filter(function (item) {
      return !easyDoneImageStillSample(item.name);
    });
  }

  function getMissingImagesForStep(stepId) {
    if (stepId === "hero-image") {
      return inputHasFile("hero_image") ? [] : ["hero_image"];
    }
    if (stepId === "about-images") {
      seedItemOrder("about-photos");
      const miss = [];
      (store.itemOrders["about-photos"] || []).forEach((slot) => {
        if (!inputHasFile(slot)) miss.push(slot);
      });
      return miss;
    }
    if (stepId === "works-images") {
      seedItemOrder("works-list");
      const miss = [];
      (store.itemOrders["works-list"] || []).forEach((slot) => {
        const name = itemSlotImageName(slot);
        if (!inputHasFile(name)) miss.push(name);
      });
      return miss;
    }
    return [];
  }

  function showValidationNotice(msg) {
    const status = document.getElementById("wizard-status");
    if (status) status.textContent = msg;
    const panel = document.getElementById("wizard-foot-panel");
    if (!panel) return;
    panel.textContent = msg;
    panel.hidden = false;
    const dock = document.getElementById("wizard-foot-dock");
    if (dock) dock.classList.remove("is-foot-hidden");
    const nextBtn = document.getElementById("wizard-next");
    if (nextBtn) nextBtn.disabled = msg === "記載項目から、キャッチを外してください。";
  }

  function clearPlainFootNotice() {
    const panel = document.getElementById("wizard-foot-panel");
    const nextBtn = document.getElementById("wizard-next");
    if (nextBtn && nextBtn.disabled && panel && panel.textContent.indexOf("記載項目から、") === 0) {
      nextBtn.disabled = false;
    }
    if (!panel || panel.querySelector("button, a")) return;
    if (!panel.textContent.trim()) return;
    const status = document.getElementById("wizard-status");
    if (status && status.textContent.trim() === panel.textContent.trim()) status.textContent = "";
    panel.textContent = "";
    panel.hidden = true;
  }

  function flagEasyBrandRequired() {
    const brand = document.getElementById("easy-brand-name");
    const wrap = brand && brand.closest(".easy-field");
    const errEl = document.getElementById("easy-brand-error");
    if (wrap) wrap.classList.add("is-invalid");
    if (errEl) errEl.hidden = false;
    if (brand) {
      try {
        brand.focus({ preventScroll: false });
      } catch (e) {
        brand.focus();
      }
      brand.addEventListener(
        "input",
        function clearInvalid() {
          if (wrap) wrap.classList.remove("is-invalid");
          if (errEl) errEl.hidden = true;
        },
        { once: true }
      );
    }
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

  function growCopyField(el) {
    if (!el || !el.classList || !el.classList.contains("is-copy-frame")) return;
    if (!el.offsetWidth) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }

  function applyCopyFrame(el, key) {
    if (!el || String(el.tagName || "").toLowerCase() !== "textarea") return;
    if (key === "extra_notes" || el.id === "review-ng-note") return;
    el.classList.add("is-copy-frame");
    el.classList.remove("is-copy-half");
    el.style.removeProperty("--copy-lines");
    el.rows = 1;
    growCopyField(el);
  }

  function setupCharLimits() {
    Object.keys(FIELD_MAX).forEach((name) => {
      const el = form.elements.namedItem(name);
      if (!el || !el.setAttribute) return;
      if (el instanceof RadioNodeList) return;
      const max = FIELD_MAX[name];
      el.setAttribute("maxlength", String(max));
      applyCopyFrame(el, name, max);
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
    const intro = document.getElementById("easy-intro");
    if (intro) applyCopyFrame(intro, "about_lead", 200);
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
          if (store.galleryPicks && store.galleryPicks[input.name]) {
            delete store.galleryPicks[input.name];
          }
          applyAllImages();
          scheduleSave();
          return;
        }
        rememberLayoutReplaceBefore(input.name);
        if (store.galleryPicks && store.galleryPicks[input.name]) {
          delete store.galleryPicks[input.name];
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
        syncEasyImageStatuses();
        if (document.getElementById("layout-arrange-wire")) renderLayoutArrangeWire();
        const cur = getCurrentFlowStep();
        if (cur && cur.id === "easy-img-wire" && inputHasFile(input.name)) {
          const slots = collectVisibleImageSlots();
          const at = slots.findIndex(function (slot) { return slot.input === input.name; });
          if (at >= 0 && at < slots.length - 1) {
            const nextSlot = slots[at + 1].key;
            store.sampleWireSlot = nextSlot;
            document.querySelectorAll("[data-wire-slot]").forEach((b) => {
              b.classList.toggle("is-active", b.getAttribute("data-wire-slot") === nextSlot);
            });
            document.querySelectorAll("[data-easy-slot]").forEach((p) => {
              p.classList.toggle("is-current", p.getAttribute("data-easy-slot") === nextSlot);
            });
          }
        } else if (cur && EASY_IMG_FIELD[cur.id] === input.name && inputHasFile(input.name)) {
          store.confirmed[cur.id] = true;
          const flow = getFlowSteps();
          const next = store.wizardStepIndex + 1;
          if (next < flow.length) showWizardStep(next);
        }
        scheduleSave();
      });
    });
  }

  function stepDisplayLabel(step) {
    if (!step) return "";
    return step.num + ". " + step.label;
  }

  function openSelfStep(stepId) {
    stepId = resolveStepId(stepId);
    if (
      store.intakeDone &&
      (stepId === "purpose" || stepId === "guide") &&
      (store.siteColorMode === "detail" || store.hubEntrySource)
    ) {
      return;
    }
    if (!canOpenStep(stepId)) {
      showUnlockHint(stepId);
      return;
    }
    if (
      store.siteColorMode === "detail" &&
      GUIDED_COLOR_TUNE_IDS.includes(stepId)
    ) {
      gctOpenPaletteColor(stepId);
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

    if (stepId !== "layout") {
      if (store.hubReturnBlockId) {
        store.hubUiMode = "place-edit";
        store.hubPlacePickMode = false;
        store.hubPlaceSelectedBlockId = store.hubReturnBlockId;
        document.body.classList.remove("hub-place-pick", "hub-place-section-open", "hub-ui-layout");
        const entry = document.getElementById("hub-entry");
        const pick = document.getElementById("hub-place-pick");
        const section = document.getElementById("hub-place-section");
        const stack = document.getElementById("hub-layout-stack");
        if (entry) entry.hidden = true;
        if (pick) pick.hidden = true;
        if (section) section.hidden = true;
        if (stack) stack.hidden = true;
      } else if (store.hubPlacePickMode || store.hubPlaceSelectedBlockId || store.hubUiMode !== "home") {
        store.hubUiMode = "home";
        store.hubPlacePickMode = false;
        store.hubPlaceSelectedBlockId = null;
        clearHubPlaceFit();
        document.body.classList.remove("hub-place-section-open", "hub-ui-layout");
      }
    }

    switchToDashTab();
    form.querySelectorAll(":scope > details.dash-block").forEach((d) => {
      const active = d === block;
      d.classList.toggle("is-active-step", active);
      d.classList.remove("is-wizard-active");
      if (active) d.open = true;
      else d.open = false;
    });
    if (store.siteColorMode === "detail") {
      syncDetailDashVisibility(stepId);
    }
    if (FONT_ROLE_BY_STEP[stepId]) placeFontPickersForStep(stepId);
    else parkFontPickersInReservoir();
    ensureHubStepActionBars();
    focusFontRoleFromBlock(block);

    const dashBody = document.querySelector(".dash-body");
    if (dashBody) {
      window.requestAnimationFrame(() => {
        dashBody.scrollTo({ top: Math.max(0, block.offsetTop - 12), behavior: "smooth" });
      });
    }

    const pickingColor =
      store.guidedColorPhase === "pick" && !!store.guidedColorEditStepId;

    updateWizardUi();
    /* 色選択中に applyAllConfirmed するとハニカム再同期・プレビュー再適用でチラつく */
    if (pickingColor) {
      applyLiveColors(false);
    } else {
      applyLiveColors(false);
      applyAllConfirmed();
    }
    syncHubShellFocus();
    placePreviewWidthControl();

    if (
      stepId !== "guide" &&
      stepId !== "purpose" &&
      stepId !== "layout" &&
      !pickingColor
    ) {
      const sel = block.getAttribute("data-preview-target");
      if (sel) window.setTimeout(() => scrollPreviewTo(sel), 50);
      const hit = root.querySelector('[data-open-step="' + stepId + '"].preview-hit') ||
        root.querySelector('.preview-hit[data-open-step="' + stepId + '"]');
      if (hit) {
        hit.classList.add("is-target-flash");
        window.setTimeout(() => hit.classList.remove("is-target-flash"), 600);
      }
    }
    if (store.siteColorMode === "detail") {
      syncGuidedColorTrial();
    }
    if (HUB_IMG_STEP_IDS.indexOf(stepId) >= 0) {
      setupHubImagePathUi();
      syncHubImagePathPanels(stepId);
    }
    syncDashResumeNotice();
    scheduleSave();
  }

  function restoreViewAfterMode() {
    if (store.sampleFinishNoBack && store.entryBranch === "sample") {
      store.siteColorMode = "easy";
      store.uiMode = "guided";
      store.intakeDone = true;
      applyUiMode();
      openStep("finish");
      return;
    }
    if (store.easyFlowActive && store.uiMode === "guided") {
      store.siteColorMode = "easy";
      if (store.copyHeroOnPhoto === true || store.copyHeroOnPhoto === false) {
        store.heroTextOnPhoto = store.copyHeroOnPhoto === true;
      }
      showWizardStep(resolveWizardStepIndex());
      return;
    }
    /* サンプル入口途中（色など）へ戻っていた／リロードした */
    if (
      store.entryBranch === "sample" &&
      !store.easyFlowActive &&
      store.hubEntrySource !== "sample-done" &&
      store.siteColorMode !== "detail" &&
      !store.intakeDone
    ) {
      store.siteColorMode = "easy";
      store.uiMode = "guided";
      const gate = document.getElementById("entry-gate");
      if (gate) {
        const purposeRadio = gate.querySelector(
          'input[name="entry_purpose"][value="' + (store.sitePurpose || "shop") + '"]'
        );
        if (purposeRadio) purposeRadio.checked = true;
        const branchRadio = gate.querySelector('input[name="entry_branch"][value="sample"]');
        if (branchRadio) branchRadio.checked = true;
        gate.querySelectorAll('input[name="entry_sample_color"]').forEach(function (r) {
          r.checked = false;
        });
      }
      showEntryGate(store.sushiSampleId ? "color" : "sushi");
      return;
    }
    if (store.siteColorMode === "detail") {
      store.uiMode = "self";
      applyUiMode();
      if (store.selfEditingStepId && store.selfEditingStepId !== "layout") {
        openSelfStep(store.selfEditingStepId);
      } else {
        openDetailLayoutHub();
      }
      return;
    }
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

  let catchQuietReturnTo = "";
  let catchSavedAccordionId = null;
  let catchSavedHeroInner = null;

  function showWizardStep(index) {
    if (store.catchInline) {
      store.catchInline = false;
      store.layoutCatchReturn = "";
      document.body.classList.remove("is-catch-inline");
    }
    if (afterColorGuideOpen) closeAfterColorGuide();
    const quietReturnTo = catchQuietReturnTo;
    catchQuietReturnTo = "";
    let quietImageReturn = false;
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

    if (SAMPLE_SEC_STEP_IDS.indexOf(step.id) >= 0) {
      const sec = SAMPLE_SEC_ID_FROM_STEP[step.id];
      if (!store.sampleSectionCandidates[sec] || !store.sampleSectionCandidates[sec].length) {
        rebuildSampleSectionCandidates(sec);
      } else {
        renderSampleSectionList(sec);
      }
    }
    setupCopyFlowUi();
    if (step.id === "easy-copy-path") {
      form.querySelectorAll('input[name="easy_copy_path"]').forEach(function (r) {
        r.checked = r.value === store.copyPathMode;
      });
    }
    if (step.id === "easy-img-path") {
      form.querySelectorAll('input[name="easy_img_path"]').forEach(function (r) {
        r.checked = r.value === store.imgPathMode;
      });
    }
    if (step.id === "easy-img-omakase") {
      prepareEasyFixedImageCounts();
      ensureImgOmakaseReady().then(function () {
        renderImgOmakaseUi();
      });
    }
    if (step.id === "easy-copy-dirs") {
      renderCopyDirsUi();
    }
    if (step.id === "easy-basics") {
      renderEasyListingUi();
    }
    if (step.id === "easy-site-name") {
      bindSiteNameStep();
    } else {
      clearSiteNameBack();
    }
    const keepCatchHoney = step.id === "easy-catch";
    if (step.id !== "easy-copy-omakase") parkLogoCopyControls();
    if (step.id !== "easy-copy-omakase" && !keepCatchHoney) restoreCopyBorrowedControls();
    if (step.id !== "easy-color-stage") {
      document.querySelectorAll("#layout-color-rows .layout-color-row.is-open").forEach(closeLayoutColorRow);
    }
    if (step.id === "easy-color") {
      const chosen = store.chosenPresetKey;
      const keep = !chosen || chosen === store.sampleOriginalPreset;
      const val = keep ? "keep" : chosen;
      document.querySelectorAll('input[name="entry_sample_color"]').forEach(function (r) {
        r.checked = r.value === val;
      });
      paintEasyColorBars();
    }
    if (step.id === "easy-color-stage") {
      syncLayoutColorRows();
    }
    if (step.id === "easy-copy-omakase") {
      renderCopyListUi();
    }
    if (step.id === "easy-copy-frame") {
      if (store.copyFrameIndex == null) store.copyFrameIndex = 0;
      clampCopyFrameIndex();
      renderCopyFrameUi();
    }
    if (step.id === "easy-img-wire" || step.id === "easy-catch") {
      quietImageReturn = quietReturnTo === "easy-img-wire" && step.id === "easy-img-wire";
      if (quietImageReturn && catchSavedAccordionId != null) {
        store.layoutAccordionId = catchSavedAccordionId;
        if (!store.layoutInnerByBlock) store.layoutInnerByBlock = {};
        store.layoutInnerByBlock.hero = catchSavedHeroInner || "";
        catchSavedAccordionId = null;
        catchSavedHeroInner = null;
      }
      parkEasyImageHost(step.id);
      if (step.id === "easy-img-wire") {
        setSampleFlowPreviewHidden(false);
        renderEasyImageWireList();
      }
      if (step.id === "easy-catch") {
        if (prevStep && prevStep.id === "easy-img-wire") {
          catchSavedAccordionId = store.layoutAccordionId || "";
          catchSavedHeroInner = (store.layoutInnerByBlock && store.layoutInnerByBlock.hero) || "";
        }
        store.layoutAccordionId = "hero";
      }
      if (step.id === "easy-catch" && store.catchPage === "image") {
        if (!store.layoutInnerByBlock) store.layoutInnerByBlock = {};
        store.layoutInnerByBlock.hero = "hero";
      }
      mountSharedImageUi(true);
      if (step.id === "easy-catch") renderEasyCatchRest();
    } else {
      parkEasyImageHost("");
      mountSharedImageUi(false);
      if (step.id !== "easy-copy-omakase") clearPreviewPlaceMark();
    }
    if (step.id === "easy-img-wire") {
      syncEasyImageStatuses();
      if (!quietImageReturn) {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            const openRow = document.querySelector("#easy-img-layout-host .layout-photo-row.is-open");
            const key = openRow ? (openRow.getAttribute("data-layout-photo") || "") : "";
            const sep = key.indexOf(":");
            const blockId = sep >= 0 ? key.slice(0, sep) : (store.layoutAccordionId || "");
            if (blockId) parkSectionTop(blockId);
            else scrollPreviewFrameIntoView(currentImageFrameSelector());
            if (!openRow || !blockId) return;
            alignOpenPhotoWithPreview();
          });
        });
      }
    } else if (step.id === "easy-img-omakase") {
      setEasyPreviewFocus("easy-img-wire");
    } else {
      setEasyPreviewFocus(null);
    }
    if (HUB_IMG_STEP_IDS.indexOf(step.id) >= 0) {
      setupHubImagePathUi();
      syncHubImagePathPanels(step.id);
    }
    if (step.id === "easy-loading") {
      if (store.easyLoadingPaused) clearEasyLoadingTimers();
      else startEasyLoadingSequence();
    } else {
      clearEasyLoadingTimers();
    }
    document.body.classList.toggle("is-easy-done-step", step.id === "easy-done");
    document.body.classList.toggle(
      "is-sample-zip-step",
      step.id === "finish" && store.sampleFinishNoBack && store.entryBranch === "sample"
    );
    renderSampleZipBranch();
    if (step.id === "easy-done") {
      revealSamplePreview();
      if (!store.easyDirectOpen) {
        store.easyDirectOpen = true;
      }
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
          placeEasyDoneArrow();
          renderEasyDoneCheck();
        });
      });
    } else {
      dismissEasyDoneUnlockNote();
    }
    if (step.id === "finish" && store.sampleFinishNoBack) {
      const congrats = document.querySelector(".easy-finish-congrats");
      if (congrats) congrats.remove();
    }
    document.body.classList.toggle("is-site-name-dawn", step.id === "easy-site-name");
    if (step.id === "easy-site-name") {
      placeSiteNameBack();
      window.requestAnimationFrame(placeSiteNameBack);
    } else clearSiteNameBack();
    syncSampleFlowPreviewVisibility(step.id);
    syncEasyCopyLaterHint(step.id);
    syncDashResumeNotice();

    switchToDashTab();
    form.querySelectorAll(":scope > details.dash-block").forEach((d) => {
      const active = d === block;
      d.hidden = !active;
      d.open = active;
      d.classList.toggle("is-wizard-active", active);
      d.classList.toggle("is-active-step", active);
    });
    if (step.id === "easy-img-wire") mountSharedImageUi(true);

    updateWizardUi();
    applyLiveColors(false);
    applyAllConfirmed(quietImageReturn ? { skipImages: true } : undefined);

    if (step.id !== "guide" && step.id !== "purpose") {
      const skipPresetScroll =
        step.id === "global-preset" &&
        store.guidedColorPhase === "pick" &&
        !!store.guidedColorEditStepId;
      if (!skipPresetScroll) {
        const sel = block.getAttribute("data-preview-target");
        const keepPreviewTop = step.id === "finish" && store.sampleFinishNoBack;
        if (keepPreviewTop) {
          window.setTimeout(() => scrollPreviewTo("#preview-root"), 50);
          window.requestAnimationFrame(() => {
            block.scrollTop = 0;
            const dashBody = document.querySelector(".dash-body");
            if (dashBody) dashBody.scrollTop = 0;
          });
        } else if (sel) window.setTimeout(() => scrollPreviewTo(sel), 50);
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
    const wizardDock = document.getElementById("wizard-head-dock");

    document.body.classList.remove("mode-guided", "mode-self", "wizard-mode", "mode-detail", "mode-easy");
    document.body.classList.add(store.siteColorMode === "detail" ? "mode-detail" : "mode-easy");
    document.body.classList.toggle("is-blank-canvas", !!store.blankCanvas);
    document.body.classList.add("hide-zone-badges");
    if (typeof applyHeroFocalToPreview === "function") applyHeroFocalToPreview();

    if (wizardDock) wizardDock.hidden = true;
    if (wizardTop) wizardTop.hidden = true;

    if (store.uiMode === "guided") {
      document.body.classList.add("mode-guided", "wizard-mode");
      if (wizardNav) wizardNav.hidden = false;
    } else if (store.uiMode === "self") {
      document.body.classList.add("mode-self");
      if (wizardNav) wizardNav.hidden = false;
      form.querySelectorAll(":scope > details.dash-block").forEach((d) => {
        d.classList.remove("is-wizard-active");
      });
    } else {
      document.body.classList.add("wizard-mode");
      if (wizardNav) wizardNav.hidden = false;
    }

    const layoutBlock = form.querySelector('.dash-block[data-step-id="layout"]');
    if (layoutBlock && store.siteColorMode !== "detail") {
      layoutBlock.hidden = store.selfEditingStepId !== "layout";
    }

    form.querySelectorAll(":scope > details.dash-block[data-step-id]").forEach((d) => {
      const id = d.getAttribute("data-step-id");
      d.classList.toggle("is-image-chapter", IMAGE_STEP_IDS.has(id));
      d.classList.toggle("is-text-chapter", TEXT_STEP_IDS.has(id));
    });

    if (store.siteColorMode === "detail") {
      syncDetailDashVisibility(store.selfEditingStepId || "layout");
    } else {
      syncDetailDashVisibility(null);
    }

    placeLookControls();
    placePreviewWidthControl();
    ensureHubStepActionBars();

    syncBadgeLabels();
    updateZoneBadgeDoneState();
    inferGuidedUnlocks();
    normalizeWizardStepIndex();
    syncWizardNavVisibility();
    buildProgressBar();
    const laterFlow = getFlowSteps();
    const laterStep = laterFlow[store.wizardStepIndex];
    syncEasyCopyLaterHint(laterStep && laterStep.id);
    syncDashResumeNotice();
  }

  function previewPaneOnScreen(previewPane) {
    if (document.body.classList.contains("entry-gate-open")) return false;
    if (document.body.classList.contains("sample-flow-hide-preview")) return false;
    if (document.documentElement.classList.contains("is-capture-mode")) return false;
    if (document.documentElement.classList.contains("is-embed-preview")) return false;
    if (!previewPane) return false;
    const cs = window.getComputedStyle(previewPane);
    return cs.display !== "none" && cs.visibility !== "hidden";
  }

  function placePreviewWidthControl() {
    const control = document.getElementById("chrome-preview-width");
    const previewRail = document.getElementById("preview-width-rail");
    const dashSlot = document.getElementById("dash-preview-width-slot");
    const dashRail = document.getElementById("dash-width-rail");
    const previewPane = document.querySelector(".preview-pane");
    if (!control || !previewPane) return;
    const scroll = previewPane.querySelector(":scope > .preview-scroll");
    if (scroll) {
      if (control.nextElementSibling !== scroll) scroll.before(control);
    } else if (control.parentElement !== previewPane) {
      previewPane.prepend(control);
    }
    control.classList.remove("chrome-control--in-hub");
    bindPlaceMarkSwitch();

    const mode = store.hubUiMode || "home";
    const previewOn = previewPaneOnScreen(previewPane);
    const reviewChrome =
      document.documentElement.classList.contains("is-review-mode") ||
      mode === "studio-review";
    const showWidth =
      previewOn ||
      reviewChrome ||
      document.body.classList.contains("is-review-editing");
    if (!showWidth) {
      control.hidden = true;
      control.setAttribute("hidden", "");
      if (previewRail) previewRail.hidden = true;
      if (dashRail) dashRail.hidden = true;
      if (dashSlot) dashSlot.hidden = true;
      if (typeof window.syncPreviewLookControl === "function") {
        window.syncPreviewLookControl();
      }
      return;
    }
    control.hidden = false;
    control.removeAttribute("hidden");
    if (previewRail) previewRail.hidden = true;
    if (dashRail) dashRail.hidden = true;
    if (dashSlot) dashSlot.hidden = true;
    if (typeof window.syncPreviewLookControl === "function") {
      window.syncPreviewLookControl();
    }
    if (typeof window.applyPreviewWidthFromPane === "function") {
      window.applyPreviewWidthFromPane();
    }
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
    /* 用途が変わったら辞典の寄せ先も変わるので候補を作り直す */
    store.copyFrameCandidates = {};
    store.copyFrameSelected = {};
    store.copyFrameNow = {};
    store.copyOmakaseAxes = null;
    store.copyOmakaseLocks = {};
    store.copyOmakaseSalt = 0;
    Object.keys(pack.fields).forEach((name) => {
      const el = form.elements.namedItem(name);
      if (!el || el.type === "file" || el.type === "checkbox" || el.type === "radio") return;
      el.value = "";
      el.setAttribute("placeholder", store.blankCanvas ? "" : String(pack.fields[name] || ""));
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
    document.querySelectorAll("textarea.is-copy-frame").forEach(growCopyField);
    syncEasyFlowMeter();
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
    const onCopyPath = !!(step && step.id === "easy-copy-path");
    const onImgPath = !!(step && step.id === "easy-img-path");
    const hubShellBack =
      onLayout &&
      (store.hubUiMode === "home" || !store.hubUiMode) &&
      (store.hubEntrySource === "sample-done" || store.hubEntrySource === "detail-entry");
    document.body.classList.toggle("hub-shell-back", !!hubShellBack);
    const hideFootNav =
      selfList ||
      isGuidedColorTrialFootHidden() ||
      store.guidedColorPhase === "pick" ||
      (onLayout && !hubShellBack);

    if (progress) {
      /* 進捗バー廃止に合わせ、件数カウント文言も出さない */
      progress.textContent = "";
      progress.hidden = true;
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
      const onEasyFlow = !!(step && EASY_FLOW_STEP_SET.has(step.id));
      /* ハブ個別編集（キャッチ文など）：場所ルート以外でも戻る｜OK を出す */
      const hubPlaceEdit =
        store.siteColorMode === "detail" &&
        isSelf &&
        !!step &&
        step.id !== "layout" &&
        step.id !== "finish" &&
        step.id !== "purpose" &&
        step.id !== "guide";
      /* 編集ハブの殻ホーム等：フッタ自体は出さない想定。個別編集以外で戻るを隠す */
      const hubDetailEdit =
        store.siteColorMode === "detail" && isSelf && !hubPlaceEdit;
      backBtn.disabled =
        onPurpose ||
        (!onEasyFlow && !hubPlaceEdit && !hubShellBack && store.wizardStepIndex <= 0 && !onModePick);
      backBtn.hidden =
        (hubDetailEdit && !hubShellBack) ||
        (isSelf && !hubPlaceEdit && !hubShellBack) ||
        onPurpose ||
        isGuidedColorTrialFootHidden();
      if (hubPlaceEdit) {
        backBtn.hidden = false;
        backBtn.disabled = false;
        backBtn.textContent = "戻る";
      } else if (!onEasyFlow) {
        backBtn.textContent = "ひとつ戻る";
      }
      if (store.sampleFinishNoBack && step && step.id === "finish" && store.entryBranch === "sample") {
        backBtn.hidden = false;
        backBtn.disabled = false;
        backBtn.textContent = "ひとつ戻る";
      }
    }
    if (nextBtn) {
      nextBtn.hidden =
        selfList ||
        !!(step && step.id === "finish") ||
        onModePick ||
        onLayout ||
        onCopyPath ||
        onImgPath ||
        isGuidedColorTrialFootHidden() ||
        store.guidedColorPhase === "pick";
      if (step && EASY_FLOW_STEP_SET.has(step.id)) {
        nextBtn.textContent = wizardPrimaryLabel();
        if (step.id === "easy-loading" && store.easyLoadingPaused) {
          nextBtn.hidden = false;
          nextBtn.textContent = "次へ";
          if (backBtn) backBtn.hidden = false;
        } else if (step.id === "easy-loading" || step.id === "easy-done") {
          nextBtn.hidden = true;
          if (backBtn) backBtn.hidden = step.id === "easy-loading";
        }
      } else if (selfGuide || onPurpose || onLayout || !isSelf) {
        nextBtn.textContent = "次へ";
      } else if (selfEdit) {
        nextBtn.textContent = wizardPrimaryLabel();
      }
    }
    if (foot && !selfList) {
      foot.classList.toggle("is-guide-step", onModePick);
    }
    syncCatchRemovalNotice();
    placeWizardFootDock();
    updateProgressBar();
    updatePreviewGuideBtn();
    updateZoneBadgeDoneState();
    updateFinishFootUi();
    syncHubShellFocus();
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
      if (isSampleZipScreen()) {
        zipBtn.hidden = true;
        zipBtn.disabled = true;
      } else {
        zipBtn.hidden = !finishReady;
        zipBtn.disabled = !finishReady;
      }
    }
    if (foot) foot.classList.toggle("is-finish-ready", finishReady);
  }

  function updatePreviewGuideBtn() {
    const btn = document.getElementById("preview-guide-btn");
    if (!btn) return;
    /* 途中の簡単⇄こだわり切替は廃止（入口2択＋完成後の編集するのみ） */
    btn.hidden = true;
  }

  function openColorModeMenu() {
    /* 廃止。誤クリック用に閉じるだけ */
    if (typeof window.closeAtelierMenu === "function") window.closeAtelierMenu();
  }

  function setSiteColorMode(nextMode, opts) {
    opts = opts || {};
    const mode = nextMode === "detail" ? "detail" : "easy";
    const prev = store.siteColorMode === "detail" ? "detail" : "easy";
    if (mode === prev && !opts.force) {
      syncSiteColorModeUi();
      if (typeof window.closeAtelierMenu === "function") window.closeAtelierMenu();
      return;
    }
    store.siteColorMode = mode;
    if (mode === "easy" && prev === "detail") {
      resetColorsForEasyMode();
    }
    syncSiteColorModeUi();
    applyUiMode();
    updatePreviewGuideBtn();
    applyHeroTextOverlay();
    if (typeof window.closeAtelierMenu === "function") window.closeAtelierMenu();
    scheduleSave();
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
    if (store.easyFlowActive) return false;
    /* サンプル入口へ戻った／途中リロード：確定フラグが残っていてもゲートを出す */
    if (
      store.entryBranch === "sample" &&
      !store.intakeDone &&
      store.hubEntrySource !== "sample-done" &&
      store.siteColorMode !== "detail"
    ) {
      return true;
    }
    if (store.intakeDone) return false;
    if (store.confirmed.purpose || store.confirmed.layout || store.confirmed.guide) return false;
    if (store.sitePurpose) return false;
    if (store.layoutSelected) return false;
    if (store.presetChosen) return false;
    return true;
  }

  function syncEasyCopyLaterHint(stepId) {
    const on =
      stepId === "easy-copy-path" ||
      stepId === "easy-copy-dirs" ||
      stepId === "easy-basics" ||
      stepId === "easy-copy-omakase" ||
      stepId === "easy-copy-frame";
    const hint = document.getElementById("easy-copy-later-hint");
    if (hint) hint.hidden = !on;
    document.body.classList.toggle("copy-later-fixed", on);
  }

  function photoResumeNoticeStep(stepId) {
    if (!stepId) return false;
    if (
      stepId === "easy-img-wire" ||
      stepId === "easy-img-omakase" ||
      stepId === "easy-loading" ||
      stepId === "easy-done"
    ) {
      return true;
    }
    return HUB_IMG_STEP_IDS.indexOf(stepId) >= 0;
  }

  function syncDashResumeNotice() {
    const notice = document.querySelector(".dash-resume-notice");
    if (!notice) return;
    if (store.saveMode === "folder") {
      notice.hidden = true;
      return;
    }
    const step = getCurrentFlowStep();
    notice.hidden = !photoResumeNoticeStep(step && step.id);
  }

  function hideEntryGate() {
    const gate = document.getElementById("entry-gate");
    if (gate) gate.hidden = true;
    document.body.classList.remove("entry-gate-open");
  }

  function entryGateCopy(step) {
    if (step === "save") {
      return {
        title: "はじめに",
        lead: "続きから作りたいときのために、このパソコン内へ制作データを残すかどうかを選んでください。当社のサーバーには保存しません。"
      };
    }
    if (step === "branch") {
      return {
        title: "ホームページをつくる",
        lead: "進め方をひとつ選んでください。"
      };
    }
    if (step === "resume") {
      return {
        title: "保存したデータから再開する",
        lead: ""
      };
    }
    if (step === "sushi") {
      return {
        title: "見本を選ぶ",
        lead: ""
      };
    }
    if (step === "purpose") {
      return {
        title: "用途を選ぶ",
        lead: "用途を選ぶと、次に記載項目へ進みます。"
      };
    }
    return {
      title: "色合いを変える",
      lead: "選んだ見本のまま使うか、色合いだけ変えられます。"
    };
  }

  function entryGateAllowedSteps() {
    if (!store.saveMode) return ["save"];
    if (store.entryBranch === "detail") return ["save", "branch", "purpose"];
    if (store.entryBranch === "sample") return ["save", "branch", "sushi", "purpose"];
    if (store.entryBranch === "resume") return ["save", "branch", "resume"];
    return ["save", "branch"];
  }

  function setEntryGateStep(step) {
    const gate = document.getElementById("entry-gate");
    if (!gate) return;
    const allowed = entryGateAllowedSteps();
    const fallback = store.saveMode ? "branch" : "save";
    const next = allowed.indexOf(step) >= 0 ? step : fallback;
    gate.dataset.entryStep = next;
    gate.dataset.entryPath =
      store.entryBranch === "detail"
        ? "detail"
        : store.entryBranch === "resume"
          ? "resume"
          : store.entryBranch === "sample"
            ? "sample"
            : "";
    gate.querySelectorAll("[data-entry-step]").forEach((el) => {
      el.hidden = el.getAttribute("data-entry-step") !== next;
    });
    const copy = entryGateCopy(next);
    const title = document.getElementById("entry-gate-title");
    const lead = document.getElementById("entry-gate-lead");
    if (title) title.textContent = copy.title;
    if (lead) {
      lead.textContent = copy.lead;
      lead.hidden = !copy.lead;
    }
    if (next === "sushi") {
      if (window.SushiBelt) {
        window.SushiBelt.setup();
        window.SushiBelt.mount({
          onConfirm: function (payload) {
            laneQueryHold = false;
            store.pendingSushi = payload;
            store.sushiSampleId = payload.sample && payload.sample.id;
            store.sushiSampleKey = payload.sample && payload.sample.key;
            playSampleColorShutter(function () { setEntryGateStep("purpose"); });
          }
        });
      }
    } else if (window.SushiBelt) {
      window.SushiBelt.unmount();
    }
    syncEasyFlowMeter();
    if (next === "save") syncEntryFolderNamePanel();
  }

  function showEntryGate(startStep) {
    const gate = document.getElementById("entry-gate");
    if (!gate) return;
    gate.hidden = false;
    document.body.classList.add("entry-gate-open");
    if (!startStep) {
      store.entryBranch = null;
      store.pendingSushi = null;
      gate
        .querySelectorAll(
          'input[name="entry_save_mode"], input[name="entry_branch"], input[name="entry_purpose"], input[name="entry_layout"], input[name="entry_color"], input[name="entry_sample_color"]'
        )
        .forEach((r) => {
          r.checked = false;
        });
      if (store.saveMode) {
        const saveRadio = gate.querySelector(
          'input[name="entry_save_mode"][value="' + store.saveMode + '"]'
        );
        if (saveRadio) saveRadio.checked = true;
        setEntryGateStep("branch");
      } else {
        setEntryGateStep("save");
      }
      return;
    }
    setEntryGateStep(startStep);
  }

  function reopenSampleEntryAtColor() {
    store.easyFlowActive = false;
    store.intakeDone = false;
    store.guidedImageUnlocked = false;
    store.siteColorMode = "easy";
    store.uiMode = "guided";
    /* ゲート再表示のため、intake 確定フラグをいったん外す（中身のプレビューは残す） */
    store.confirmed.purpose = false;
    store.confirmed.layout = false;
    store.confirmed.guide = false;
    setSampleFlowPreviewHidden(false);
    const gate = document.getElementById("entry-gate");
    if (gate) {
      const purposeRadio = gate.querySelector(
        'input[name="entry_purpose"][value="' + (store.sitePurpose || "shop") + '"]'
      );
      if (purposeRadio) purposeRadio.checked = true;
      const branchRadio = gate.querySelector('input[name="entry_branch"][value="sample"]');
      if (branchRadio) branchRadio.checked = true;
    }
    store.entryBranch = "sample";
    if (store.hubEntrySource !== "sample-done") {
      store.hubEntrySource = "sample";
    }
    applyUiMode();
    showEntryGate("purpose");
    scheduleSave();
  }

  function reopenEntryAtColor() {
    reopenSampleEntryAtColor();
  }

  function startEasyFlowAfterColor() {
    store.easyFlowActive = true;
    store.wizardStepIndex = 0;
    prepareEasyFixedImageCounts();
    hideEntryGate();
    if (typeof window.setPreviewWidthStepById === "function") {
      window.setPreviewWidthStepById("desktop");
    }
    renderEasyQuestionLists();
    showWizardStep(0);
    window.setTimeout(() => scrollPreviewTo("#preview-root"), 40);
    const status = document.getElementById("wizard-status");
    if (status) status.textContent = "載せる項目を選べます。";
    scheduleSave();
  }

  function readEasyBasicsFromUi() {
    return {
      brand: String((document.getElementById("easy-brand-name") || {}).value || "").trim(),
      intro: String((document.getElementById("easy-intro") || {}).value || "").trim(),
      email: String((document.getElementById("easy-email") || {}).value || "").trim(),
      phone: String((document.getElementById("easy-phone") || {}).value || "").trim(),
      hours: String((document.getElementById("easy-hours") || {}).value || "").trim(),
      address: String((document.getElementById("easy-address") || {}).value || "").trim()
    };
  }

  function homepageName() {
    if (!store.siteNameConfirmed) return "";
    const name = String(fieldValue("brand_name") || "").trim();
    if (!name || isPlaceholderBrand(name)) return "";
    return name;
  }

  /** 見本の画面に出す店名。自分のタイトル確定前は、見本の屋号を出す */
  function samplePreviewBrand() {
    const own = homepageName();
    if (own) return own;
    if (store.blankCanvas) return "";
    const brand = String(store.sushiSampleBrand || "").trim();
    if (!brand || isPlaceholderBrand(brand)) return "";
    return brand;
  }

  function renderEasyListingUi() {
    const host = document.getElementById("easy-listing-host");
    if (!host) return;
    host.innerHTML = "";
    LAYOUT_BLOCKS.forEach(function (meta) {
      const on = isLayoutBlockActive(meta);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "easy-listing-btn" + (on ? " is-on" : "");
      btn.textContent = meta.label;
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.addEventListener("click", function () {
        commitLayoutBlockVisibility(meta.id, !isLayoutBlockActive(meta));
        renderEasyListingUi();
        syncLayoutColorRows();
        syncEasyFlowMeter();
      });
      host.appendChild(btn);
    });
  }

  function placeSiteNameBack() {
    const pane = document.querySelector(".dash-pane");
    const back = document.getElementById("wizard-back");
    if (!pane || !back || !document.body.classList.contains("is-site-name-dawn")) return;
    const box = pane.getBoundingClientRect();
    const gap = 14;
    const height = back.offsetHeight || 45;
    const visibleBottom = Math.min(box.bottom, window.innerHeight);
    const center = box.left + box.width / 2;
    back.style.position = "fixed";
    back.style.left = Math.round(center) + "px";
    back.style.top = Math.round(visibleBottom - gap - height) + "px";
    back.style.right = "auto";
    back.style.bottom = "auto";
    back.style.transform = "translateX(-50%)";
    back.style.zIndex = "41";
    back.style.margin = "0";
  }

  function clearSiteNameBack() {
    const back = document.getElementById("wizard-back");
    if (!back || back.style.position !== "fixed") return;
    back.style.position = "";
    back.style.left = "";
    back.style.top = "";
    back.style.right = "";
    back.style.bottom = "";
    back.style.transform = "";
    back.style.zIndex = "";
    back.style.margin = "";
  }

  function bindSiteNameStep() {
    const input = document.getElementById("easy-site-name-input");
    const ask = document.getElementById("easy-site-name-ask");
    const ok = document.getElementById("easy-site-name-ok");
    if (!input || !ask || !ok) return;
    const syncAsk = function () {
      ask.classList.toggle("is-ready", !!String(input.value || "").trim());
    };
    if (!input.dataset.bound) {
      input.dataset.bound = "1";
      input.addEventListener("input", syncAsk);
      window.addEventListener("resize", placeSiteNameBack);
      ok.addEventListener("click", function () {
        const name = String(input.value || "").trim();
        if (!name) return;
        setFieldValue("brand_name", name);
        store.siteNameConfirmed = true;
        syncPreviewHeaderChrome();
        scheduleSave();
        wizardNext();
      });
    }
    const existing = homepageName();
    input.value = existing;
    syncAsk();
    window.setTimeout(function () {
      try { input.focus(); } catch (e) { /* ignore */ }
    }, 40);
  }

  function setEasyExtraPublished(key, on, fieldName, text) {
    store.draftExtras = store.draftExtras || { hours: false, access: false, address: false, announce: false };
    store.draftExtras[key] = !!on;
    const toggle = document.querySelector('[data-extra-toggle="' + key + '"]');
    if (toggle) toggle.checked = !!on;
    setFieldValue(fieldName, on ? text : "");
  }

  function applyEasyBasicsToForm(basics) {
    const b = basics || readEasyBasicsFromUi();
    store.easyBasicsApplied = true;
    if (b.brand) setFieldValue("brand_name", b.brand);
    setFieldValue("about_lead", b.intro || "");
    setFieldValue("contact_email", b.email || "");
    setEasyExtraPublished("hours", !!b.hours, "hours_text", b.hours);
    setEasyExtraPublished("address", !!b.address, "address_text", b.address);
    applyAllConfirmed();
    syncPreviewHeaderChrome();
  }

  function syncEasyBasicsPublish() {
    if (!store.easyBasicsApplied) return;
    const aboutLead = document.querySelector("#about .section-lead");
    const intro = String(fieldValue("about_lead") || "").trim();
    if (aboutLead) aboutLead.hidden = !intro;
    const mail = document.querySelector("#contact .sample-mail");
    const email = String(fieldValue("contact_email") || "").trim();
    if (mail) mail.hidden = !email;
    const phoneEl = document.querySelector("#contact .sample-phone");
    const phone = String((document.getElementById("easy-phone") || {}).value || "").trim();
    if (phoneEl) {
      phoneEl.hidden = !phone;
      phoneEl.textContent = phone;
    }
  }

  function renderEasyQuestionLists() {
    const dict = window.Sample1manEasyCopy;
    if (!dict || !dict.QUESTIONS) return;
    dict.QUESTIONS.forEach((q, idx) => {
      const n = idx + 1;
      const title = document.getElementById("easy-q" + n + "-title");
      const list = document.getElementById("easy-q" + n + "-list");
      if (title) title.textContent = q.title;
      if (!list) return;
      list.innerHTML = q.options
        .map(
          (opt) =>
            '<label class="easy-choice"><input type="radio" name="easy_' +
            q.id +
            '" value="' +
            opt.id +
            '"><span>' +
            escapeHtml(opt.label) +
            "</span></label>"
        )
        .join("");
      list.querySelectorAll("input").forEach((input) => {
        bindChoiceReselect(input, function () {
          store.easyAnswers[q.id] = input.value;
          store.confirmed["easy-q" + n] = true;
          scheduleSave();
          const flow = getFlowSteps();
          const cur = flow.findIndex((s) => s.id === "easy-q" + n);
          if (cur >= 0 && cur < flow.length - 1) {
            runWithCrossShutter(function () { showWizardStep(cur + 1); });
          }
        });
      });
      const saved = store.easyAnswers[q.id];
      if (saved) {
        const radio = list.querySelector('input[value="' + saved + '"]');
        if (radio) radio.checked = true;
      }
    });
  }

  function rebuildEasyCopyCandidates() {
    const dict = window.Sample1manEasyCopy;
    if (!dict || typeof dict.generateFive !== "function") {
      store.easyCopyCandidates = [];
      return;
    }
    const basics = readEasyBasicsFromUi();
    store.easyCopyCandidates = dict.generateFive({
      mood: store.easyAnswers.mood,
      focus: store.easyAnswers.focus,
      guest: store.easyAnswers.guest,
      brandName: basics.brand
    });
    store.easyCopySelected = null;
    store.confirmed["easy-copy"] = false;
    renderEasyCopyList();
  }

  function renderEasyCopyList() {
    const host = document.getElementById("easy-copy-list");
    if (!host) return;
    const list = store.easyCopyCandidates || [];
    host.innerHTML = list
      .map(
        (c, i) =>
          '<label class="easy-copy-card"><input type="radio" name="easy_copy" value="' +
          i +
          '"><span class="easy-copy-card-inner"><span class="easy-copy-num">' +
          (i + 1) +
          '</span><span class="easy-copy-text">' +
          escapeHtml(c.text) +
          "</span></span></label>"
      )
      .join("");
    host.querySelectorAll('input[name="easy_copy"]').forEach((input) => {
      bindChoiceReselect(input, function () {
        const idx = Number(input.value);
        const cand = store.easyCopyCandidates[idx];
        if (!cand) return;
        store.easyCopySelected = idx;
        applyEasyCopyCandidate(cand);
        store.confirmed["easy-copy"] = true;
        scheduleSave();
        const flow = getFlowSteps();
        const holdIdx = flow.findIndex((s) => s.id === "easy-img-1");
        if (holdIdx >= 0) showWizardStep(holdIdx);
      });
    });
    if (store.easyCopySelected != null) {
      const radio = host.querySelector('input[value="' + store.easyCopySelected + '"]');
      if (radio) radio.checked = true;
    }
  }

  function applyEasyCopyCandidate(cand) {
    if (!cand) return;
    applyEasyBasicsToForm();
    const basics = readEasyBasicsFromUi();
    const brand = basics.brand || "店名";
    setFieldValue("brand_name", brand);
    const hero = String(fieldValue("hero_title") || "").trim();
    if (!hero || isPlaceholderBrand(hero)) {
      setFieldValue("hero_title", brand);
    }
    setFieldValue("hero_lead_1", cand.text.slice(0, 100));
    if (cand.text.length > 100) {
      setFieldValue("hero_lead_2", cand.text.slice(100, 200));
    }
    setFieldValue("about_lead", cand.text.slice(0, 200));
    setFieldValue("about_heading", brand + "案内");
    setFieldValue("works_heading", "おすすめ");
    setFieldValue("value_1_title", "こだわり");
    setFieldValue("value_1_text", cand.text.slice(0, 100));
    applyAllConfirmed();
    syncPreviewHeaderChrome();
  }

  function syncEasyImageStatuses() {
    collectVisibleImageSlots().forEach(function (slot) {
      const el = document.getElementById("easy-img-status-" + slot.key);
      if (!el) return;
      const ready = inputHasFile(slot.input);
      const fromGallery = !!(store.galleryPicks && store.galleryPicks[slot.input]);
      if (!ready) {
        el.textContent = "まだ選んでいません";
      } else if (fromGallery) {
        el.textContent = "ギャラリーから選びました（選び直しもできます）";
      } else {
        el.textContent = "選択済み（選び直しもできます）";
      }
      el.classList.toggle("is-ready", ready);
    });
  }

  function closeFreePhotoGalleryModal() {
    const modal = document.getElementById("fpg-modal");
    if (!modal) return;
    const mount = modal.querySelector("[data-fpg-mount]");
    if (mount && mount._fpgApi && typeof mount._fpgApi.destroy === "function") {
      try {
        mount._fpgApi.destroy();
      } catch (e) {
        /* ignore */
      }
      mount._fpgApi = null;
    }
    modal.hidden = true;
    modal.removeAttribute("data-fpg-slot");
    const prev = modal._fpgPrevFocus;
    modal._fpgPrevFocus = null;
    if (prev && typeof prev.focus === "function") {
      try {
        prev.focus();
      } catch (e) {
        /* ignore */
      }
    }
  }

  function ensureFreePhotoGalleryModal() {
    let modal = document.getElementById("fpg-modal");
    if (modal) return modal;
    modal = document.createElement("div");
    modal.id = "fpg-modal";
    modal.className = "fpg-modal";
    modal.hidden = true;
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "fpg-modal-title");
    modal.innerHTML =
      '<div class="fpg-modal-panel">' +
      '  <div class="fpg-modal-bar">' +
      '    <strong id="fpg-modal-title">ギャラリーから選ぶ</strong>' +
      '    <button type="button" class="fpg-modal-close" data-fpg-close>閉じる</button>' +
      "  </div>" +
      '  <div class="fpg-modal-body"><div data-fpg-mount></div></div>' +
      "</div>";
    document.body.appendChild(modal);

    modal.addEventListener("click", (ev) => {
      if (ev.target === modal) closeFreePhotoGalleryModal();
    });
    modal.querySelector("[data-fpg-close]").addEventListener("click", () => closeFreePhotoGalleryModal());
    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape" && modal && !modal.hidden) {
        ev.preventDefault();
        closeFreePhotoGalleryModal();
      }
    });
    return modal;
  }

  function applyGalleryPickToSlot(inputName, item) {
    if (!inputName || !item || !item.path) return;
    rememberLayoutReplaceBefore(inputName);
    const isWorkSlot = /^work_\d+_image$/.test(inputName);
    const relPath =
      isWorkSlot && item.trimCardPath
        ? String(item.trimCardPath).replace(/^\/+/, "")
        : String(item.path).replace(/^\/+/, "");
    const url = "free-photo-gallery/" + relPath;
    const input = form.elements.namedItem(inputName);
    if (input && input.type === "file") {
      try {
        input.value = "";
      } catch (e) {
        /* ignore */
      }
    }
    if (store.zipImageFiles && store.zipImageFiles[inputName]) {
      delete store.zipImageFiles[inputName];
    }
    if (!store.galleryPicks) store.galleryPicks = {};
    store.galleryPicks[inputName] = {
      id: item.id,
      path: item.path,
      trimCardPath: item.trimCardPath || null,
      usedPath: relPath,
      shape: item.shape || "",
      scene: item.scene || ""
    };
    setRemoteImageUrl(inputName, url);
    applyImageSlotByName(inputName, true);
    if (isWorkSlot) {
      applyWorkThumbFit(inputName);
    }
    syncEasyImageStatuses();
    if (document.getElementById("layout-arrange-wire")) refreshLayoutPhotoFace(inputName);
    const modalOpen = (function () {
      const modal = document.getElementById("fpg-modal");
      return !!(modal && !modal.hidden);
    })();
    if (modalOpen || isEasyImgSharedMount()) {
      scheduleSave();
      return;
    }
    const cur = getCurrentFlowStep();
    if (cur && cur.id === "easy-img-wire") {
      const slots = collectVisibleImageSlots();
      const at = slots.findIndex(function (slot) { return slot.input === inputName; });
      if (at >= 0 && at < slots.length - 1) {
        const nextSlot = slots[at + 1].key;
        store.sampleWireSlot = nextSlot;
        document.querySelectorAll("[data-wire-slot]").forEach((b) => {
          b.classList.toggle("is-active", b.getAttribute("data-wire-slot") === nextSlot);
        });
        document.querySelectorAll("[data-easy-slot]").forEach((p) => {
          p.classList.toggle("is-current", p.getAttribute("data-easy-slot") === nextSlot);
        });
      }
    }
    scheduleSave();
  }

  function applyWorkThumbFit(inputName) {
    const m = String(inputName || "").match(/^work_(\d+)_image$/);
    if (!m) return;
    const n = Number(m[1]);
    const el = root.querySelector('#works-list > [data-item-id="work_' + n + '"] .work-thumb');
    if (!el) return;
    el.style.objectFit = "cover";
    el.style.objectPosition = "center top";
  }

  const SAMPLE_GALLERY_GENRES = [
    { key: "outdoor", label: "屋外", tags: ["scenery", "nature", "tatemono"] },
    { key: "shop", label: "店内", tags: ["indoor", "hotel", "cowork"] },
    { key: "food", label: "飲食", tags: ["food", "drink", "sweets", "cafe", "bakery", "bar", "izakaya", "ramen"] },
    { key: "people", label: "人物", tags: ["person", "hand"] },
    { key: "work", label: "仕事", tags: ["salon", "yoga", "studio", "clinic"] },
    { key: "nature", label: "自然", tags: ["florist", "animal", "nature"] }
  ];

  function sampleGenreByKey(genreKey) {
    for (let i = 0; i < SAMPLE_GALLERY_GENRES.length; i += 1) {
      if (SAMPLE_GALLERY_GENRES[i].key === genreKey) return SAMPLE_GALLERY_GENRES[i];
    }
    return null;
  }

  function galleryPickUrl(item, inputName) {
    if (!item || !item.path) return "";
    const isWorkSlot = /^work_\d+_image$/.test(inputName);
    const relPath =
      isWorkSlot && item.trimCardPath
        ? String(item.trimCardPath).replace(/^\/+/, "")
        : String(item.path).replace(/^\/+/, "");
    return "free-photo-gallery/" + relPath;
  }

  function paintSampleOmakasePick(strip, item, inputName) {
    const fig = strip && strip.querySelector("[data-fpg-sample-pick]");
    const img = fig && fig.querySelector("img");
    const ok = strip && strip.querySelector("[data-fpg-sample-ok]");
    if (!fig || !img) return;
    const url = galleryPickUrl(item, inputName);
    if (!url) {
      img.removeAttribute("src");
      img.hidden = true;
      if (ok) ok.disabled = true;
      return;
    }
    img.hidden = false;
    img.src = url;
    if (ok) ok.disabled = false;
  }

  function ensureSampleGalleryOmakase(modal, inputName) {
    const body = modal.querySelector(".fpg-modal-body");
    if (!body) return;
    let strip = modal.querySelector("[data-fpg-sample-omakase]");
    if (strip && !strip.querySelector("[data-fpg-sample-ok]")) {
      strip.remove();
      strip = null;
    }
    if (!strip) {
      strip = document.createElement("div");
      strip.className = "fpg-sample-omakase";
      strip.setAttribute("data-fpg-sample-omakase", "");
      strip.innerHTML =
        '<div class="fpg-sample-omakase-lead">' +
        '<p class="fpg-sample-omakase-title">ランダムに選ぶ</p>' +
        '<p class="fpg-sample-omakase-note">ジャンルを選ぶと、参考の写真が1枚入ります。</p>' +
        "</div>" +
        '<div class="fpg-sample-genres" data-fpg-sample-genres role="group" aria-label="ランダムに選ぶ"></div>' +
        '<button type="button" class="fpg-sample-omakase-ok" data-fpg-sample-ok disabled>この画像にする</button>' +
        '<figure class="fpg-sample-omakase-pick" data-fpg-sample-pick><img alt="" hidden></figure>';
      const mount = body.querySelector("[data-fpg-mount]");
      if (mount) body.insertBefore(strip, mount);
      else body.appendChild(strip);
      const genresHost = strip.querySelector("[data-fpg-sample-genres]");
      SAMPLE_GALLERY_GENRES.forEach(function (g) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "fpg-sample-genre";
        btn.setAttribute("data-fpg-sample-genre", g.key);
        btn.textContent = g.label;
        genresHost.appendChild(btn);
      });
      strip.addEventListener("click", function (ev) {
        const okBtn = ev.target.closest("[data-fpg-sample-ok]");
        if (okBtn && strip.contains(okBtn)) {
          if (okBtn.disabled) return;
          closeFreePhotoGalleryModal();
          return;
        }
        const btn = ev.target.closest("[data-fpg-sample-genre]");
        if (!btn || !strip.contains(btn)) return;
        const genre = btn.getAttribute("data-fpg-sample-genre");
        const slot = modal.getAttribute("data-fpg-slot");
        if (!genre || !slot) return;
        pickSampleGenrePhoto(slot, genre, btn, strip);
      });
    }
    strip.hidden = false;
    modal.setAttribute("data-fpg-slot", inputName);
    const prevId =
      store.galleryPicks && store.galleryPicks[inputName] ? store.galleryPicks[inputName].id : "";
    if (prevId) {
      loadPhotoCatalog().then(function (catalog) {
        const items = (catalog && catalog.items) || [];
        const found = items.filter(function (it) {
          return it && it.id === prevId;
        })[0];
        if (found) paintSampleOmakasePick(strip, found, inputName);
      });
    } else {
      paintSampleOmakasePick(strip, null, inputName);
    }
  }

  function hideSampleGalleryOmakase(modal) {
    const strip = modal && modal.querySelector("[data-fpg-sample-omakase]");
    if (strip) strip.hidden = true;
  }

  function pickSampleGenrePhoto(inputName, genreKey, button, strip) {
    if (!inputName || !genreKey) return;
    const genre = sampleGenreByKey(genreKey);
    const tags = genre && genre.tags ? genre.tags : [];
    if (!tags.length) return;
    if (button) button.disabled = true;
    loadPhotoCatalog()
      .then(function (catalog) {
        const items = (catalog && catalog.items) || [];
        const tagged = items.filter(function (it) {
          if (!it || !Array.isArray(it.tags)) return false;
          for (let i = 0; i < tags.length; i += 1) {
            if (it.tags.indexOf(tags[i]) >= 0) return true;
          }
          return false;
        });
        if (!store.sampleGenreLastId || typeof store.sampleGenreLastId !== "object") {
          store.sampleGenreLastId = {};
        }
        const memKey = inputName + "|" + genreKey;
        const lastId = store.sampleGenreLastId[memKey] || "";
        const prefer = /^work_\d+_image$/.test(inputName);
        let pool = tagged.filter(function (it) {
          return it && it.id !== lastId;
        });
        if (!pool.length) pool = tagged.slice();
        if (prefer) {
          const withTrim = pool.filter(function (it) {
            return it && it.trimCardPath;
          });
          if (withTrim.length) pool = withTrim;
        }
        if (!pool.length) {
          window.alert("このジャンルの写真は、いま見つかりませんでした。");
          return;
        }
        const item = pool[Math.floor(Math.random() * pool.length)];
        store.sampleGenreLastId[memKey] = item.id;
        applyGalleryPickToSlot(inputName, item);
        paintSampleOmakasePick(strip || (button && button.closest("[data-fpg-sample-omakase]")), item, inputName);
        const host = strip || (button && button.closest("[data-fpg-sample-omakase]"));
        if (host) {
          host.querySelectorAll("[data-fpg-sample-genre]").forEach(function (el) {
            el.classList.toggle("is-on", el.getAttribute("data-fpg-sample-genre") === genreKey);
          });
        }
        alignOpenPhotoWithPreview();
        scheduleSave();
      })
      .then(
        function () {
          if (button) button.disabled = false;
        },
        function () {
          if (button) button.disabled = false;
          window.alert("ギャラリーを読み込めませんでした。");
        }
      );
  }

  function openFreePhotoGalleryModal(inputName, opts) {
    if (!window.FreePhotoGallery || typeof window.FreePhotoGallery.mount !== "function") {
      window.alert("ギャラリーを読み込めませんでした。ページを更新してもう一度開けますか。");
      return;
    }
    const options = opts || {};
    const modal = ensureFreePhotoGalleryModal();
    const mount = modal.querySelector("[data-fpg-mount]");
    modal._fpgPrevFocus = document.activeElement;
    modal.setAttribute("data-fpg-slot", inputName);
    modal.hidden = false;
    if (options.sampleGenreOmakase) ensureSampleGalleryOmakase(modal, inputName);
    else hideSampleGalleryOmakase(modal);
    if (mount._fpgApi && typeof mount._fpgApi.destroy === "function") {
      try {
        mount._fpgApi.destroy();
      } catch (e) {
        /* ignore */
      }
    }
    mount.innerHTML = "";
    const prevId =
      store.galleryPicks && store.galleryPicks[inputName] ? store.galleryPicks[inputName].id : null;
    window.FreePhotoGallery.mount(mount, {
      catalogUrl: "free-photo-gallery/catalog.json",
      imageBase: "free-photo-gallery",
      mode: "picker",
      selectedId: prevId,
      onConfirm(item) {
        applyGalleryPickToSlot(inputName, item);
        closeFreePhotoGalleryModal();
      }
    }).then((api) => {
      mount._fpgApi = api;
      const closeBtn = modal.querySelector("[data-fpg-close]");
      if (closeBtn) closeBtn.focus();
    });
  }

  function setupEasyImagePickers() {
    document.querySelectorAll("[data-easy-pick]").forEach((btn) => {
      if (btn.dataset.easyPickBound) return;
      btn.dataset.easyPickBound = "1";
      btn.addEventListener("click", () => {
        const name = btn.getAttribute("data-easy-pick");
        scrollPreviewFrameIntoView(previewSelectorForImageName(name));
        const input = form.elements.namedItem(name);
        if (input && input.type === "file") input.click();
      });
    });
    document.querySelectorAll("[data-easy-gallery]").forEach((btn) => {
      if (btn.dataset.easyGalleryBound) return;
      btn.dataset.easyGalleryBound = "1";
      btn.addEventListener("click", () => {
        const name = btn.getAttribute("data-easy-gallery");
        if (name) openFreePhotoGalleryModal(name, { sampleGenreOmakase: true });
      });
    });
    setupHubImagePathUi();
    document.querySelectorAll("[data-easy-done-ok]").forEach((btn) => {
      btn.addEventListener("click", () => leaveEasyFlowToFinish());
    });
    document.querySelectorAll("[data-easy-done-edit]").forEach((btn) => {
      btn.addEventListener("click", () => leaveEasyFlowToEditHub());
    });
  }

  function setEasyPreviewFocus(stepId) {
    const focus = EASY_IMG_FOCUS[stepId] || null;
    root.classList.remove("easy-focus-hero", "easy-focus-about", "easy-focus-works");
    if (focus) root.classList.add("easy-focus-" + focus);
  }

  function clearEasyLoadingTimers() {
    if (easyLoadingTimer) {
      window.clearTimeout(easyLoadingTimer);
      easyLoadingTimer = null;
    }
    if (easyLoadingMsgTimer) {
      window.clearTimeout(easyLoadingMsgTimer);
      easyLoadingMsgTimer = null;
    }
  }

  function startEasyLoadingSequence() {
    clearEasyLoadingTimers();
    revealSamplePreview();
    const title = document.getElementById("easy-loading-title");
    const fill = document.querySelector(".easy-loading-bar-fill");
    if (title) title.textContent = "奥へ吸い込んでいます";
    if (fill) {
      fill.style.animation = "none";
      void fill.offsetWidth;
      fill.style.animation = "";
    }
    const msgs = [
      "奥へ吸い込んでいます",
      "ページを組み立てています",
      "本番プレビューを出します"
    ];
    let i = 0;
    easyLoadingMsgTimer = window.setInterval(() => {
      i += 1;
      if (title && msgs[i]) title.textContent = msgs[i];
      if (i >= msgs.length - 1 && easyLoadingMsgTimer) {
        window.clearInterval(easyLoadingMsgTimer);
        easyLoadingMsgTimer = null;
      }
    }, 650);
    easyLoadingTimer = window.setTimeout(() => {
      clearEasyLoadingTimers();
      store.confirmed["easy-loading"] = true;
      const flow = getFlowSteps();
      const doneIdx = flow.findIndex((s) => s.id === "easy-done");
      if (doneIdx >= 0) showWizardStep(doneIdx);
      scheduleSave();
    }, 2200);
  }

  function prepareEasyFixedImageCounts() {
    /* 見本の枚数と itemOrders は維持する */
  }

  function parkEasyImageHost(stepId) {
    const host = document.getElementById("easy-img-layout-host");
    if (!host) return;
    if (!host._imgHome) host._imgHome = { parent: host.parentElement, next: host.nextSibling };
    if (stepId === "easy-catch") {
      const slot = document.getElementById("easy-catch-img");
      if (slot && host.parentElement !== slot) slot.appendChild(host);
      return;
    }
    if (host._imgHome && host._imgHome.parent && host.parentElement !== host._imgHome.parent) {
      host._imgHome.parent.insertBefore(host, host._imgHome.next);
    }
  }

  function catchFaceHasText() {
    if (String(fieldValue("hero_title") || "").trim()) return true;
    const leads = countForCopy("hero-leads", 1);
    for (let i = 1; i <= leads; i += 1) {
      if (String(fieldValue("hero_lead_" + i) || "").trim()) return true;
    }
    return false;
  }

  function catchFaceHasImage() {
    if (store.heroImageOff) return false;
    const photo = root.querySelector(".hero-photo");
    return !!(photo && String(photo.getAttribute("src") || "").trim());
  }

  function setCatchImageChoice(on) {
    const stage = root.querySelector(".hero-stage");
    const photo = root.querySelector(".hero-photo");
    store.catchImageOn = !!on;
    if (on) {
      store.heroImageOff = false;
      if (stage) stage.classList.remove("is-hero-image-off");
      const held = store.catchImageHeldSrc || "";
      if (held) {
        setRemoteImageUrl("hero_image", held);
        if (photo) photo.src = held;
        store.catchImageHeldSrc = "";
      }
      applyHeroFocalToPreview();
      return;
    }
    if (!store.heroImageOff && photo) {
      store.catchImageHeldSrc = photo.getAttribute("src") || photo.getAttribute("data-default-src") || "";
    }
    store.heroImageOff = true;
    applyHeroImageOffState();
  }

  function renderEasyCatchRest() {
    const colorHost = document.getElementById("easy-catch-color");
    const copyHost = document.getElementById("easy-catch-copy");
    if (colorHost) {
      const parked = colorHost.querySelector('[data-color-step="hero-color"]');
      const keepOpen = parked && parked.classList.contains("is-open");
      if (!keepOpen) restoreCopyColorRows();
      if (!keepOpen) mountLayoutColorSection();
      const unit = keepOpen ? parked : document.querySelector('[data-color-step="hero-color"]');
      if (unit && !keepOpen) {
        if (!unit._copyColorHome) {
          unit._copyColorHome = { parent: unit.parentElement, next: unit.nextSibling };
        }
        unit.hidden = false;
        unit.setAttribute("data-copy-borrowed", "1");
        colorHost.appendChild(unit);
      }
    }
    if (copyHost) {
      const reservoir = document.getElementById("site-fonts-reservoir");
      copyHost.querySelectorAll(".font-picker-block").forEach(function (block) {
        if (reservoir) reservoir.appendChild(block);
      });
      copyHost.innerHTML = "";
      const settingsHost = document.getElementById("easy-catch-settings");
      if (settingsHost) {
        const reservoir = document.getElementById("site-fonts-reservoir");
        settingsHost.querySelectorAll(".font-picker-block").forEach(function (block) {
          if (reservoir) reservoir.appendChild(block);
        });
        settingsHost.innerHTML = "";
      }
      const sec = copyListSectionById("hero");
      const editor = sec ? buildCopyListEditor(sec, null) : null;
      if (editor && settingsHost) {
        const board = editor.querySelector(".easy-copy-hero-board");
        const extras = editor.querySelector(".easy-copy-hub-extras");
        if (board) {
          const catchCell = board.querySelector(".easy-copy-hero-catch");
          if (catchCell) catchCell.remove();
          settingsHost.appendChild(board);
        }
        if (extras) extras.remove();
        while (editor.firstChild) copyHost.appendChild(editor.firstChild);
      }
      copyHost.querySelectorAll(".easy-copy-field").forEach(function (field) {
        const existing = field.querySelector(".easy-copy-field-foot");
        if (existing) {
          existing.classList.add("easy-catch-field-foot");
          return;
        }
        const box = field.querySelector(".easy-copy-field-box");
        const reset = field.querySelector(".easy-copy-reset-btn");
        const count = field.querySelector(".easy-copy-field-count");
        if (!box || !reset) return;
        const row = document.createElement("div");
        row.className = "easy-catch-field-foot";
        box.insertAdjacentElement("afterend", row);
        row.appendChild(reset);
        if (count) row.appendChild(count);
      });
      placeCopyFonts();
    }
    renderCatchPages();
  }

  function catchPageList() {
    const pages = ["imageAsk"];
    if (store.catchImageOn === true) pages.push("image");
    pages.push("ask");
    if (store.catchWordsOn === true) pages.push("settings", "write");
    if (store.catchWordsOn === true && !heroPlateIsOn()) pages.push("color");
    return pages;
  }

  function renderCatchPages() {
    if (heroPlateIsOn() && (store.catchPage || "") === "color") store.catchPage = "write";
    clearPlainFootNotice();
    const page = store.catchPage || "imageAsk";
    if (page === "image") {
      store.layoutAccordionId = "hero";
      if (!store.layoutInnerByBlock) store.layoutInnerByBlock = {};
      store.layoutInnerByBlock.hero = "hero";
    }
    const host = document.getElementById("easy-catch-host");
    if (host) {
      host.classList.toggle("is-catch-settings", page === "settings");
      host.classList.toggle("is-catch-write", page === "write");
    }
    document.querySelectorAll("#easy-catch-host [data-catch-page]").forEach(function (el) {
      el.hidden = el.getAttribute("data-catch-page") !== page;
    });
    const tags = document.getElementById("easy-catch-tags");
    if (tags) {
      tags.innerHTML = "";
      const names = heroPlateIsOn() ? ["画像", "文章"] : ["画像", "文章", "色"];
      const now =
        page === "imageAsk" || page === "image"
          ? "画像"
          : page === "ask" || page === "settings" || page === "write"
            ? "文章"
            : page === "color"
              ? "色"
              : "画像";
      const nowAt = names.indexOf(now);
      names.forEach(function (name, i) {
        const span = document.createElement("span");
        span.textContent = name;
        if (i === nowAt) span.className = "is-now";
        else if (i < nowAt) span.className = "is-done";
        tags.appendChild(span);
      });
    }
    const imageOnBtn = document.getElementById("easy-catch-image-on");
    const imageNoBtn = document.getElementById("easy-catch-image-no");
    if (imageOnBtn && !imageOnBtn.dataset.bound) {
      imageOnBtn.dataset.bound = "1";
      imageOnBtn.addEventListener("click", function () {
        setCatchImageChoice(true);
        store.catchPage = "image";
        scheduleSave();
        renderEasyCatchRest();
      });
    }
    if (imageNoBtn && !imageNoBtn.dataset.bound) {
      imageNoBtn.dataset.bound = "1";
      imageNoBtn.addEventListener("click", function () {
        setCatchImageChoice(false);
        store.catchPage = "ask";
        scheduleSave();
        renderEasyCatchRest();
      });
    }
    const onBtn = document.getElementById("easy-catch-words-on");
    const offBtn = document.getElementById("easy-catch-words-off");
    if (onBtn && !onBtn.dataset.bound) {
      onBtn.dataset.bound = "1";
      onBtn.addEventListener("click", function () {
        store.catchWordsOn = true;
        store.heroTextOnPhoto = true;
        store.copyHeroOnPhoto = true;
        applyHeroTextOverlay();
        store.catchPage = "settings";
        scheduleSave();
        renderEasyCatchRest();
      });
    }
    if (offBtn && !offBtn.dataset.bound) {
      offBtn.dataset.bound = "1";
      offBtn.addEventListener("click", function () {
        store.catchWordsOn = false;
        store.heroTextOnPhoto = false;
        store.copyHeroOnPhoto = false;
        applyHeroTextOverlay();
        store.catchPage = "ask";
        scheduleSave();
        wizardNext();
      });
    }
    if (imageOnBtn) imageOnBtn.classList.toggle("is-active", store.catchImageOn === true);
    if (imageNoBtn) imageNoBtn.classList.toggle("is-active", store.catchImageOn === false);
    if (onBtn) onBtn.classList.toggle("is-active", store.catchWordsOn === true);
    if (offBtn) offBtn.classList.toggle("is-active", store.catchWordsOn === false);
    if (page === "image") {
      renderLayoutArrangeWire();
      window.setTimeout(function () {
        if ((store.catchPage || "imageAsk") !== "image") return;
        const cell = document.querySelector("#easy-catch-img details.layout-arrange-cell");
        if (cell && !cell.open) cell.open = true;
      }, 0);
    }
    if (page === "write") {
      document.querySelectorAll("#easy-catch-copy textarea.is-copy-frame").forEach(growCopyField);
    }
    if (page === "color" && !heroPlateIsOn()) {
      const unit = document.querySelector('#easy-catch-color [data-color-step="hero-color"]');
      if (unit && !unit.classList.contains("is-open")) openLayoutColorHoney(unit);
    }
    syncCatchColorAvailability();
  }

  function advanceCatchPage() {
    const page = store.catchPage || "imageAsk";
    if (page === "imageAsk" && store.catchImageOn == null) return true;
    if (page === "ask") {
      if (store.catchWordsOn == null) return true;
      if (store.catchWordsOn !== true) return false;
    }
    const pages = catchPageList();
    const at = pages.indexOf(page);
    if (at >= 0 && at < pages.length - 1) {
      store.catchPage = pages[at + 1];
      if (store.catchPage === "image") {
        if (!store.layoutInnerByBlock) store.layoutInnerByBlock = {};
        store.layoutInnerByBlock.hero = "hero";
      }
      renderEasyCatchRest();
      if (store.catchPage === "image") renderLayoutArrangeWire();
      return true;
    }
    return false;
  }

  function catchSectionBefore(page) {
    const pages = catchPageList();
    let at = pages.indexOf(page || "imageAsk");
    if (at < 0) at = 0;
    for (let i = at - 1; i >= 0; i -= 1) {
      if (pages[i] !== "imageAsk" && pages[i] !== "ask") return pages[i];
    }
    return "";
  }

  function retreatCatchPage() {
    const target = catchSectionBefore(store.catchPage || "imageAsk");
    if (!target) return false;
    store.catchPage = target;
    if (store.catchPage === "image") {
      if (!store.layoutInnerByBlock) store.layoutInnerByBlock = {};
      store.layoutInnerByBlock.hero = "hero";
    }
    renderEasyCatchRest();
    if (store.catchPage === "image") renderLayoutArrangeWire();
    return true;
  }

  function mountSharedImageUi(intoSampleStep) {
    const panel = document.getElementById("layout-arrange");
    const wire = form.querySelector('.dash-block[data-step-id="easy-img-wire"]');
    const stack = document.getElementById("hub-layout-stack");
    if (!panel) return;
    if (intoSampleStep) {
      const host = document.getElementById("easy-img-layout-host");
      if (host) host.appendChild(panel);
      if (wire) wire.classList.add("is-shared-image-ui");
    } else if (stack) {
      const nav = stack.querySelector(".hub-nav-row--layout");
      if (nav) stack.insertBefore(panel, nav);
      else stack.appendChild(panel);
      if (wire) wire.classList.remove("is-shared-image-ui");
    } else if (wire) {
      wire.classList.remove("is-shared-image-ui");
    }
    if (intoSampleStep || (stack && !stack.hidden)) renderLayoutArrangeWire();
  }

  function confirmEasyImagesForFinish() {
    prepareEasyFixedImageCounts();
    ["hero-image", "about-images", "works-images"].forEach((id) => {
      store.confirmed[id] = true;
      store.snapshots[id] = captureStepSnapshot(id);
    });
    store.guidedImageUnlocked = true;
    store.guidedTextUnlocked = true;
  }

  function leaveEasyFlowToFinish() {
    confirmEasyImagesForFinish();
    store.sampleFinishNoBack = true;
    store.easyFlowActive = false;
    setSampleFlowPreviewHidden(false);
    /* 提出面を出す。detail のままだと syncDetailDashVisibility が finish を隠す */
    store.siteColorMode = "easy";
    syncSiteColorModeUi();
    store.uiMode = "guided";
    applyUiMode();
    const flow = getFlowSteps();
    const finishIdx = flow.findIndex((s) => s.id === "finish");
    if (finishIdx >= 0) showWizardStep(finishIdx);
    else openStep("finish");
    scheduleSave();
  }

  function leaveEasyFlowToEditHub() {
    confirmEasyImagesForFinish();
    store.easyFlowActive = false;
    setSampleFlowPreviewHidden(false);
    store.hubEntrySource = "sample-done";
    store.siteColorMode = "detail";
    store.uiMode = "self";
    store.guidedImageUnlocked = true;
    store.guidedTextUnlocked = true;
    store.layoutSelected = true;
    store.confirmed.layout = true;
    store.snapshots.layout = captureStepSnapshot("layout");
    if (!store.presetChosen) {
      markPresetChosen(store.chosenPresetKey || "clinic");
    }
    confirmAllColorStepsFromPreset();
    ensureFontsConfirmedForMode();
    syncSiteColorModeUi();
    applyUiMode();
    /* モーダルより先にハブ殻へ。右側の縦位置を通常の編集ハブと揃える */
    openDetailLayoutHub();
    showDetailNoticeModal();
    scheduleSave();
  }

  function applyIntakeSelections(purposeKey, modeKey, moodKey, layoutKey) {
    const purpose = PURPOSE_PACKS[purposeKey] ? purposeKey : "shop";
    const isDetail = modeKey === "detail";
    const isSample = modeKey === "sample";
    const moodRaw = String(moodKey || "clinic");
    const mood = !isDetail && PRESETS[moodRaw] ? moodRaw : "clinic";
    const layoutRaw = String(layoutKey || "a");
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

    store.uiMode = isDetail ? "self" : "guided";
    const modeRadio = form.querySelector(
      'input[name="ui_mode"][value="' + (isDetail ? "self" : "guided") + '"]'
    );
    if (modeRadio) modeRadio.checked = true;
    store.siteColorMode = isDetail ? "detail" : "easy";
    applyUiMode();
    store.confirmed.guide = true;
    store.snapshots.guide = captureStepSnapshot("guide");

    syncSiteColorModeUi();
    if (isDetail) {
      applyBlankCanvasColors();
      store.guidedColorPhase = "preset";
      store.guidedImageUnlocked = false;
      store.easyFlowActive = false;
      if (!store.hubEntrySource) store.hubEntrySource = "detail-entry";
      store.layoutPattern = "a";
      store.layoutOrder = LAYOUT_DEFAULT_ORDER.slice();
      applyLayoutPattern("a", { silent: true });
      COLOR_STEP_IDS_ORDERED.forEach((id) => {
        store.confirmed[id] = false;
        delete store.snapshots[id];
      });
    } else {
      applyPresetByKey(mood);
      confirmAllColorStepsFromPreset();
      store.guidedImageUnlocked = false;
      store.easyFlowActive = true;
      store.easyAnswers = { mood: "calm", focus: "quality", guest: "first" };
      store.easyCopyCandidates = [];
      store.easyCopySelected = null;
      store.sampleSectionCandidates = {};
      store.sampleSectionSelected = {};
      store.keepLoadedFonts = false;
      EASY_FLOW_STEP_IDS.forEach((id) => {
        store.confirmed[id] = false;
        delete store.snapshots[id];
      });
    }
    ensureFontsConfirmedForMode();

    store.intakeDone = true;
    const reasons = [
      {
        label: "用途",
        detail: purposeLabel(purpose) + " にしました"
      },
      {
        label: "進め方",
        detail: isDetail ? "自分で作る" : "見本から選ぶ"
      },
      {
        label: "配色",
        detail: isDetail
          ? "編集ハブで色を選びます"
          : "「" + (EASY_PRESET_LABELS[mood] || mood) + "」を選びました"
      },
      {
        label: "レイアウト",
        detail: isDetail
          ? "編集ハブで枠を整えます（仮で横長）"
          : layoutLabel(layout) + " にしました"
      }
    ];
    store.vibeReasons = reasons;
    fillVibeReasonLists(reasons);

    applyAllConfirmed();
    updateConfirmUi();
    updateZoneBadgeDoneState();
    updateFinishSummary();

    if (isDetail) {
      window.setTimeout(() => scrollPreviewTo("#preview-root"), 40);
    } else if (!isSample) {
      startEasyFlowAfterColor();
    }
    scheduleSave();
    return reasons;
  }

  function buildEntryColorWireGrid() {
    const host = document.getElementById("entry-color-wire-grid");
    if (!host) return;
    const layoutEl = document.querySelector('#entry-gate input[name="entry_layout"]:checked');
    const layout = layoutEl && (layoutEl.value === "b" || layoutEl.value === "c") ? layoutEl.value : "a";
    const order = store.layoutOrder && store.layoutOrder.length ? store.layoutOrder : LAYOUT_DEFAULT_ORDER;
    host.innerHTML = EASY_PRESET_KEYS.map((key) => {
      const colors = PRESETS[key] || PRESETS.clinic;
      const label = EASY_PRESET_LABELS[key] || key;
      const wire = buildLayoutWireInnerHtml(layout, order, {});
      return (
        '<label class="entry-color-wire-card">' +
        '<input type="radio" name="entry_color" value="' +
        key +
        '">' +
        '<span class="entry-color-wire-card-inner" style="--wire-page:' +
        colors.pageBg +
        ";--wire-chrome:" +
        colors.chromeBg +
        ";--wire-card:" +
        colors.cardBg +
        ";--wire-block:" +
        colors.pageBgSoft +
        '">' +
        '<span class="entry-color-wire-label">' +
        escapeHtml(label) +
        "</span>" +
        '<span class="layout-card-wire" aria-hidden="true">' +
        wire +
        "</span>" +
        "</span></label>"
      );
    }).join("");
    host.querySelectorAll('input[name="entry_color"]').forEach((input) => {
      input.addEventListener("change", () => {
        if (input.checked) finishEasyEntryFromGate();
      });
    });
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
      if (btn.hasAttribute("data-easy-preset")) {
        btn.hidden = mode === "detail";
      }
    });
    const presetSub = document.getElementById("preset-subhead");
    if (presetSub) {
      presetSub.textContent = mode === "detail" ? "場所の色" : "雰囲気（色）";
    }
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

  window.__sample1manCaptureReady = function () {
    if (!document.documentElement.classList.contains("is-capture-mode")) return false;
    const root = document.getElementById("preview-root");
    if (!root || root.offsetHeight < 200) return false;
    if (document.fonts && document.fonts.status === "loading") return false;
    return true;
  };

  /** ヘッダー〜フッター下端までの高さ（フッターより下の空きを含めない） */
  function measureCaptureContentHeight() {
    const root = document.getElementById("preview-root");
    if (!root) return 0;
    const footer = root.querySelector("#preview-footer, .site-footer");
    const rootRect = root.getBoundingClientRect();
    const endRect = footer ? footer.getBoundingClientRect() : rootRect;
    return Math.max(1, Math.ceil(endRect.bottom - rootRect.top));
  }

  function clipPreviewToFooter() {
    const root = document.getElementById("preview-root");
    const viewport = document.getElementById("preview-viewport");
    if (!root) return;
    const footer = root.querySelector("#preview-footer, .site-footer");
    if (!footer || !footer.getClientRects().length) {
      if (root.style.height) root.style.height = "";
      if (root.style.overflow === "hidden") root.style.overflow = "";
      return;
    }
    const next = Math.max(1, footer.offsetTop + footer.offsetHeight) + "px";
    if (root.style.height !== next) root.style.height = next;
    root.style.overflow = "hidden";
    if (!viewport) return;
    const laid = viewport.offsetHeight;
    const seen = Math.round(viewport.getBoundingClientRect().height);
    const mb = laid > seen + 2 ? (seen - laid) + "px" : "";
    if (viewport.style.marginBottom !== mb) viewport.style.marginBottom = mb;
  }

  window.__sample1manCaptureMeasureHeight = function () {
    return measureCaptureContentHeight();
  };

  function clearCaptureLayoutLocks() {
    document.documentElement.classList.remove("is-capture-mode");
    ["height", "minHeight", "maxHeight", "overflow"].forEach(function (prop) {
      document.documentElement.style[prop] = "";
      document.body.style[prop] = "";
    });
    document.body.style.margin = "";
    document.body.style.padding = "";
  }

  /** レビュー／通常確認用: draft を本体プレビューへ流す（高さロック・iframe用 capture レイアウトなし） */
  window.__sample1manReviewApply = function (draft, opts) {
    if (!draft || typeof draft !== "object") {
      return { ok: false, reason: "bad-draft" };
    }
    const widthId = (opts && opts.widthId) || "desktop";
    clearCaptureLayoutLocks();
    hideEntryGate();
    setSampleFlowPreviewHidden(false);
    document.body.classList.remove("sample-flow-hide-preview");
    applySushiSampleDraft(draft);
    if (typeof window.setPreviewWidthStepById === "function") {
      window.setPreviewWidthStepById(widthId);
    } else if (typeof window.applyPreviewWidthFromPane === "function") {
      window.applyPreviewWidthFromPane();
    }
    applyLiveColors(true);
    applyAllConfirmed();
    if (draft.imagePaths) applyDraftImagePaths(draft.imagePaths);
    applyHeroImageOffState();
    syncPreviewHeaderChrome();
    const root = document.getElementById("preview-root");
    const scrollEl = document.querySelector(".preview-scroll");
    if (scrollEl) scrollEl.scrollTop = 0;
    return {
      ok: true,
      height: root ? root.offsetHeight : 0,
      width: root ? root.offsetWidth : 0,
      sampleKey: draft.sushiSampleKey || null
    };
  };

  window.__sample1manCaptureApply = function (draft) {
    if (!draft || typeof draft !== "object") {
      return { ok: false, reason: "bad-draft" };
    }
    document.documentElement.classList.add("is-capture-mode");
    hideEntryGate();
    setSampleFlowPreviewHidden(false);
    document.body.classList.remove("sample-flow-hide-preview");
    applySushiSampleDraft(draft);
    if (typeof window.setPreviewWidthStepById === "function") {
      window.setPreviewWidthStepById("desktop");
    }
    applyLiveColors(true);
    applyAllConfirmed();
    if (draft.imagePaths) applyDraftImagePaths(draft.imagePaths);
    applyHeroImageOffState();
    syncPreviewHeaderChrome();
    const root = document.getElementById("preview-root");
    const vp = document.getElementById("preview-viewport");
    if (vp) {
      /* 幅は CSS。ここでのstyle書き直しはresize連鎖の種になるので避ける */
      store.previewDesignWidth = 1200;
      store.previewFrameScale = 1;
      vp.classList.remove("is-phone", "is-mobile", "is-tablet");
      vp.classList.add("is-desktop");
      vp.classList.remove("is-scroll-x");
    }
    document.documentElement.style.height = "auto";
    document.documentElement.style.minHeight = "0";
    document.documentElement.style.overflow = "hidden";
    document.body.style.height = "auto";
    document.body.style.minHeight = "0";
    document.body.style.overflow = "hidden";
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    /* レイアウト確定後、フッター下端で切る */
    void (root && root.offsetHeight);
    const h = measureCaptureContentHeight();
    document.documentElement.style.height = h + "px";
    document.documentElement.style.minHeight = h + "px";
    document.documentElement.style.maxHeight = h + "px";
    document.body.style.height = h + "px";
    document.body.style.minHeight = h + "px";
    document.body.style.maxHeight = h + "px";
    window.scrollTo(0, 0);
    return {
      ok: true,
      height: h,
      width: root ? root.offsetWidth : 0,
      sampleKey: draft.sushiSampleKey || null
    };
  };

  window.__sample1manCaptureEnsureHtml2Canvas = function () {
    if (window.modernScreenshot && typeof window.modernScreenshot.domToBlob === "function") {
      return Promise.resolve(true);
    }
    if (window.__msLoaded && typeof window.domToBlob === "function") {
      return Promise.resolve(true);
    }
    return new Promise(function (resolve, reject) {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/modern-screenshot@4.5.5/dist/index.js";
      s.onload = function () {
        window.__msLoaded = true;
        resolve(true);
      };
      s.onerror = function () {
        reject(new Error("modern-screenshot-load-failed"));
      };
      document.head.appendChild(s);
    });
  };

  window.__sample1manCaptureSave = function (folderKey) {
    return (async function () {
      if (!folderKey) return { ok: false, reason: "no-key" };
      await window.__sample1manCaptureEnsureHtml2Canvas();
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      await new Promise(function (r) { setTimeout(r, 250); });
      const root = document.getElementById("preview-root");
      if (!root) return { ok: false, reason: "no-root" };
      const h = measureCaptureContentHeight();
      if (h > 0) {
        document.documentElement.style.height = h + "px";
        document.documentElement.style.minHeight = h + "px";
        document.documentElement.style.maxHeight = h + "px";
        document.body.style.height = h + "px";
        document.body.style.minHeight = h + "px";
        document.body.style.maxHeight = h + "px";
      }
      const toBlob =
        (window.modernScreenshot && window.modernScreenshot.domToBlob) ||
        window.domToBlob;
      if (typeof toBlob !== "function") {
        return { ok: false, reason: "no-domToBlob" };
      }
      const blob = await toBlob(root, {
        scale: 2,
        width: 1200,
        height: h > 0 ? h : undefined,
        backgroundColor: "#ffffff"
      });
      if (!blob) return { ok: false, reason: "blob-failed" };
      const res = await fetch(
        "sushi-samples/__capture-save?key=" + encodeURIComponent(folderKey),
        {
          method: "POST",
          headers: { "Content-Type": "application/octet-stream" },
          body: blob
        }
      );
      const json = await res.json().catch(function () { return { ok: false, reason: "bad-json" }; });
      return Object.assign(
        { httpStatus: res.status, width: root.offsetWidth, height: h || root.offsetHeight },
        json
      );
    })();
  };

  /* 見本レビューダッシュ（iframe親）との橋渡し */
  window.addEventListener("message", function (ev) {
    const data = ev.data;
    if (!data || typeof data !== "object" || !data.type) return;
    const replyTo = ev.source || window.parent;
    function reply(payload) {
      try {
        replyTo.postMessage(payload, "*");
      } catch (e) {
        /* ignore */
      }
    }
    if (data.type === "sample1man-ping") {
      reply({ type: "sample1man-pong" });
      return;
    }
    if (data.type === "sample1man-apply") {
      let result;
      try {
        result = window.__sample1manCaptureApply(data.draft);
        /* 画像読み込み後にフッター下端で再計測 */
        window.setTimeout(function () {
          try {
            const h =
              typeof window.__sample1manCaptureMeasureHeight === "function"
                ? window.__sample1manCaptureMeasureHeight()
                : 0;
            if (h > 0) {
              document.documentElement.style.height = h + "px";
              document.documentElement.style.minHeight = h + "px";
              document.documentElement.style.maxHeight = h + "px";
              document.body.style.height = h + "px";
              document.body.style.minHeight = h + "px";
              document.body.style.maxHeight = h + "px";
              reply({ type: "sample1man-resized", result: { ok: true, height: h } });
            }
          } catch (e2) {
            /* ignore */
          }
        }, 400);
      } catch (e) {
        result = { ok: false, reason: String((e && e.message) || e) };
      }
      reply({ type: "sample1man-applied", result: result });
      return;
    }
    if (data.type === "sample1man-save") {
      Promise.resolve()
        .then(function () {
          return window.__sample1manCaptureSave(data.folderKey);
        })
        .then(function (result) {
          reply({ type: "sample1man-saved", result: result || { ok: false, reason: "empty" } });
        })
        .catch(function (e) {
          reply({
            type: "sample1man-saved",
            result: { ok: false, reason: String((e && e.message) || e) }
          });
        });
    }
  });

    function setSampleFlowPreviewHidden(on) {
    document.documentElement.classList.toggle("sample-flow-hide-preview", !!on);
    document.body.classList.toggle("sample-flow-hide-preview", !!on);
    placePreviewWidthControl();
    if (typeof window.applyDashCollapse === "function") window.applyDashCollapse();
  }

  function syncSampleFlowPreviewVisibility(stepId) {
    setSampleFlowPreviewHidden(false);
  }

  function revealSamplePreview() {
    setSampleFlowPreviewHidden(false);
  }

  function applySushiSampleDraft(draft) {
    if (!draft || typeof draft !== "object") return;
    if (draft.sitePurpose && PURPOSE_PACKS[draft.sitePurpose]) {
      store.sitePurpose = draft.sitePurpose;
    }
    store.sushiSampleId = draft.sushiSampleId || null;
    store.sushiSampleKey = draft.sushiSampleKey || null;
    if (draft.layoutPattern) {
      applyLayoutPattern(migrateLayoutPattern(draft.layoutPattern, draft.layoutSchema || 2), { silent: true });
      store.layoutSelected = true;
      store.confirmed.layout = true;
    }
    /* 見本の色は draftColors／confirmed で載せる。
       サンプル本線では draft の detail を持ち込まない（finish が 1ブロック隠しで消えるため） */
    const sampleMainline =
      store.entryBranch === "sample" ||
      store.easyFlowActive ||
      store.hubEntrySource === "sample";
    if (sampleMainline) {
      store.siteColorMode = "easy";
    } else if (draft.siteColorMode === "detail" || draft.siteColorMode === "easy") {
      store.siteColorMode = draft.siteColorMode;
    } else {
      store.siteColorMode = "detail";
    }
    if (draft.draftColors) Object.assign(store.draftColors, draft.draftColors);
    if (draft.draftColors && draft.draftColors.pageBg) {
      store.draftColors.pageBgSoft =
        draft.draftColors.pageBgSoft || softFrom(draft.draftColors.pageBg);
    }
    if (draft.draftColors && draft.draftColors.bodyInk) {
      store.draftColors.bodyMuted =
        draft.draftColors.bodyMuted || softMuted(draft.draftColors.bodyInk);
    }
    if (draft.slotGradients && typeof draft.slotGradients === "object") {
      store.slotGradients = Object.assign({}, draft.slotGradients);
    } else {
      store.slotGradients = {};
    }
    store.gradDirHintSkip = !!draft.gradDirHintSkip;
    if (draft.slotGradientPartners && typeof draft.slotGradientPartners === "object") {
      store.slotGradientPartners = Object.assign({}, draft.slotGradientPartners);
    } else {
      store.slotGradientPartners = {};
    }
    if (draft.fonts) {
      if (draft.fonts.display) setFieldValue("font_display", draft.fonts.display);
      if (draft.fonts.catch) setFieldValue("font_catch", draft.fonts.catch);
      if (draft.fonts.body) setFieldValue("font_body", draft.fonts.body);
    }
    if (draft.fields) applyFormObject(draft.fields);
    if (!store.siteNameConfirmed) setFieldValue("brand_name", "");
    captureSampleCopyBaseline(draft.fields);
    /* サンプルは見出し下線の既定を短い（未指定時）。新規白紙は mid */
    if (!(draft.fields && draft.fields.accentBar)) {
      setFieldValue("accentBar", "short");
    } else {
      setFieldValue("accentBar", normalizeAccentBar(draft.fields.accentBar));
    }
    /* 見本のキャッチはプレビューでも出す。操作欄は本線では出さない */
    store.heroTextOnPhoto = draft.heroTextOnPhoto === true;
    store.heroFocalX = normalizeFocalPercent(
      draft.heroFocalX != null ? draft.heroFocalX : HERO_FOCAL_X_DEFAULT,
      HERO_FOCAL_X_DEFAULT
    );
    store.heroFocalY = normalizeFocalPercent(
      draft.heroFocalY != null ? draft.heroFocalY : HERO_FOCAL_Y_DEFAULT,
      HERO_FOCAL_Y_DEFAULT
    );
    store.heroImageScale = normalizeImageScale(
      draft.heroImageScale != null ? draft.heroImageScale : IMAGE_SCALE_DEFAULT
    );
    store.aboutItemsDisplay = normalizeAboutItemsDisplay(draft.aboutItemsDisplay);
    store.heroTextPlate = normalizeHeroPlate(draft.heroTextPlate || "round");
    const loadedPlateLast = draft.heroTextPlateLast
      ? normalizeHeroPlate(draft.heroTextPlateLast)
      : store.heroTextPlate;
    store.heroTextPlateLast = loadedPlateLast === "none" ? "round" : loadedPlateLast;
    store.heroTextPlateTone = normalizeHeroPlateTone(draft.heroTextPlateTone || "white");
    store.heroTextPos = normalizeHeroTextPos(draft.heroTextPos || "center");
    /* 見本の連絡ラベルON/OFF（無いときは小さめラベルOFF＝見出し重複を避ける） */
    if (draft.draftContact && typeof draft.draftContact === "object") {
      store.draftContact = {
        label: true,
        note1: true,
        note2: true,
        ...draft.draftContact
      };
    } else if (draft.sushiSampleId || draft.sushiSampleKey) {
      store.draftContact = { label: false, note1: true, note2: true };
    }
    {
      const labelCb = form.elements.namedItem("contact_show_label");
      const n1 = form.elements.namedItem("contact_show_note_1");
      const n2 = form.elements.namedItem("contact_show_note_2");
      if (labelCb) labelCb.checked = !!store.draftContact.label;
      if (n1) n1.checked = !!store.draftContact.note1;
      if (n2) n2.checked = !!store.draftContact.note2;
      syncContactPanels();
    }
    if (draft.chosenPresetKey) {
      store.chosenPresetKey = draft.chosenPresetKey;
      store.presetChosen = true;
    }
    confirmAllColorStepsFromPreset();
    syncSiteColorModeUi();
    markPresetChosen(store.chosenPresetKey || draft.chosenPresetKey || "clinic");
    if (draft.draftExtras) {
      store.draftExtras = Object.assign(
        { hours: false, access: false, address: false, announce: false },
        draft.draftExtras
      );
      ["hours", "access", "address", "announce"].forEach(function (key) {
        document.querySelectorAll('[data-extra-toggle="' + key + '"]').forEach(function (input) {
          input.checked = !!store.draftExtras[key];
        });
      });
      syncExtraPanels();
    }
    if (draft.layoutOrder) {
      store.layoutOrder = normalizeLayoutOrder(draft.layoutOrder);
    }
    /* 見本の枠オン／オフ（無いキーは全表示に戻す） */
    if (draft.layoutBlockOff && typeof draft.layoutBlockOff === "object") {
      store.layoutBlockOff = Object.assign({}, draft.layoutBlockOff);
    } else {
      store.layoutBlockOff = {};
    }
    captureSampleCopySlots(draft);
    /* キャッチ枠あり・画像なし（色＋文字）— 本線でも文字オンが必要な例外 */
    store.heroImageOff = draft.heroImageOff === true;
    if (store.heroImageOff && draft.heroTextOnPhoto !== false) {
      store.heroTextOnPhoto = true;
    }
    /* 見本JSONは draftCounts。旧キー counts も受け付ける */
    const countSrc = draft.draftCounts || draft.counts;
    if (countSrc) {
      Object.keys(countSrc).forEach(function (id) {
        if (!COUNT_META[id]) return;
        const n = Number(countSrc[id]);
        if (!Number.isFinite(n)) return;
        store.draftCounts[id] = Math.max(COUNT_META[id].min, Math.min(COUNT_META[id].max, n));
      });
    }
    if (draft.itemLayouts) {
      store.itemLayouts = defaultItemLayouts();
      ITEM_LAYOUT_IDS.forEach(function (id) {
        const src = draft.itemLayouts[id];
        if (!src) return;
        store.itemLayouts[id] = parseItemLayoutSource(id, src);
      });
    } else if (!store.itemLayouts) {
      store.itemLayouts = defaultItemLayouts();
    }
    adoptItemOrders(draft.itemOrders, draft.itemOrderParked);
    syncCountLabels();
    applyAllItemLayoutsToPreview();
    applyLayoutOrderToPreview();
    renderLayoutArrangeWire();
    applyHeroTextOverlay();
    applyLiveColors(true);
    applyAllConfirmed();
    store.sampleFlowImagePaths =
      draft.imagePaths && typeof draft.imagePaths === "object"
        ? Object.assign({}, draft.imagePaths)
        : null;
    if (store.sampleFlowImagePaths) applyDraftImagePaths(store.sampleFlowImagePaths);
    applyHeroImageOffState();
    applyHeroFocalToPreview();
    syncPreviewHeaderChrome();
    return ensureSampleBrandName(draft);
  }

  function applyHeroImageOffState() {
    const stage = root.querySelector(".hero-stage");
    const photo = root.querySelector(".hero-photo");
    const on = !!store.heroImageOff;
    if (stage) stage.classList.toggle("is-hero-image-off", on);
    if (!on) return;
    setRemoteImageUrl("hero_image", null);
    if (photo) {
      photo.removeAttribute("src");
      photo.alt = "";
      photo.style.removeProperty("object-position");
    }
    applyHeroTextOverlay();
  }

  const EASY_BASICS_INPUTS = {
    brand: "easy-brand-name",
    intro: "easy-intro",
    email: "easy-email",
    phone: "easy-phone",
    hours: "easy-hours",
    address: "easy-address"
  };

  function samplePhoneFromNote(note) {
    const m = String(note || "").match(/0\d{1,4}(?:[-\u2010-\u2015])\d{1,4}(?:[-\u2010-\u2015]\d{1,4})?/);
    return m ? m[0] : "";
  }

  function captureEasyBasicsHintsFromSample() {
    const hints = {
      brand: homepageName(),
      intro: String(fieldValue("about_lead") || "").trim(),
      email: String(fieldValue("contact_email") || "").trim(),
      phone: samplePhoneFromNote(fieldValue("contact_note_1")),
      hours: String(fieldValue("hours_text") || "").trim(),
      address: String(fieldValue("address_text") || "").trim()
    };
    store.easyBasicsHints = hints;
    store.easyBrandHint = hints.brand;
    store.easyBasicsSeed = { brand: "", intro: "", email: "", phone: "", hours: "", address: "" };
    return hints;
  }

  function paintEasyBasicsPlaceholders() {
    const hints = store.easyBasicsHints || {};
    Object.keys(EASY_BASICS_INPUTS).forEach(function (key) {
      const el = document.getElementById(EASY_BASICS_INPUTS[key]);
      if (!el) return;
      const sample = String(hints[key] || "").trim();
      el.setAttribute("placeholder", sample);
      const current = String(el.value || "").trim();
      if (!store.easyBasicsApplied && sample && current === sample) el.value = "";
    });
    store.easyBasicsSeed = { brand: "", intro: "", email: "", phone: "", hours: "", address: "" };
  }

  function fillEasyBasicsFromFields() {
    captureEasyBasicsHintsFromSample();
    Object.keys(EASY_BASICS_INPUTS).forEach(function (key) {
      const el = document.getElementById(EASY_BASICS_INPUTS[key]);
      if (el) el.value = "";
    });
    paintEasyBasicsPlaceholders();
  }

  function paintCopyPreviewFieldText(key, text) {
    if (key === "announce_url") {
      paintAnnounceFromForm();
      return;
    }
    const node = copyPreviewNodeForField(key);
    if (!node) return;
    const raw = String(text == null ? "" : text);
    if (/^acc_\d+_body$/.test(key)) {
      const item = node.closest("[data-sample-item]") || node;
      setAccordionBody(item, raw);
      return;
    }
    node.textContent = raw;
  }

  function applyCopyTextToField(key, text) {
    if (!key) return;
    setFieldValue(key, text);
    if (!store.copyFieldNow || typeof store.copyFieldNow !== "object") store.copyFieldNow = {};
    store.copyFieldNow[key] = String(text || "");
    applyAllConfirmed();
    paintCopyPreviewFieldText(key, text);
    paintCopyFieldRing(key);
    syncPreviewHeaderChrome();
  }

  function applyCopyTextToSection(secId, text) {
    const fields = visibleCopyFields(secId);
    if (!fields.length) return;
    applyCopyTextToField(fields[0].key, text);
    store.copyFrameNow[secId] = String(text || "");
  }

  const COPY_FRAME_BLOCK = {
    hero: "hero",
    about: "accordions",
    works: "works",
    contact: "contact"
  };
  const COPY_FRAME_TEXT_KEYS = {
    hero: ["hero_title", "hero_lead_1", "hero_lead_2", "hero_lead_3"],
    about: ["about_section_name", "about_heading", "about_name", "about_lead"],
    works: ["works_heading", "works_lead", "work_1_title", "work_1_text"],
    contact: ["contact_note_1"]
  };

  function captureSampleCopySlots(draft) {
    const fields = (draft && draft.fields) || {};
    const off = (draft && draft.layoutBlockOff) || {};
    const order = Array.isArray(draft && draft.layoutOrder) ? draft.layoutOrder.map(String) : null;
    function blockListed(id) {
      if (off[id]) return false;
      if (!order || !order.length) return true;
      if (id === "accordions") {
        return order.indexOf("accordions") >= 0 || order.indexOf("about") >= 0;
      }
      return order.indexOf(id) >= 0;
    }
    function hasText(keys) {
      return keys.some(function (k) {
        return String(fields[k] == null ? "" : fields[k]).trim().length > 0;
      });
    }
    const slots = {};
    COPY_FRAME_ORDER.forEach(function (secId) {
      let on = blockListed(COPY_FRAME_BLOCK[secId]);
      if (secId === "contact" && draft && draft.draftContact && draft.draftContact.note1 === false) {
        on = false;
      }
      slots[secId] = !!(on && hasText(COPY_FRAME_TEXT_KEYS[secId]));
    });
    store.sampleCopySlots = slots;
  }

  function captureSampleCopyBaseline(fields) {
    const out = {};
    if (fields && typeof fields === "object") {
      Object.keys(fields).forEach(function (key) {
        const value = fields[key];
        if (value == null || typeof value === "string" || typeof value === "number") {
          out[key] = value == null ? "" : String(value);
        }
      });
    }
    store.sampleCopyBaseline = out;
  }

  let sampleCopyBaselineLoading = false;

  function ensureSampleCopyBaseline() {
    if (store.sampleCopyBaseline && typeof store.sampleCopyBaseline === "object") return;
    if (store.entryBranch !== "sample" || !store.sushiSampleId) {
      store.sampleCopyBaseline = {};
      return;
    }
    if (sampleCopyBaselineLoading || !window.SushiBelt || !window.SushiBelt.loadManifest) return;
    sampleCopyBaselineLoading = true;
    window.SushiBelt.loadManifest()
      .then(function (man) {
        const sample = ((man && man.samples) || []).find(function (item) {
          return String(item.id) === String(store.sushiSampleId);
        });
        if (!sample || !sample.draftPath) {
          store.sampleCopyBaseline = {};
          return null;
        }
        return fetch("sushi-samples/" + sample.draftPath + "?v=copy-base-20261003").then(function (res) {
          return res.json();
        });
      })
      .then(function (draft) {
        if (!store.sampleCopyBaseline) captureSampleCopyBaseline(draft && draft.fields);
      })
      .catch(function () {
        if (!store.sampleCopyBaseline) store.sampleCopyBaseline = {};
      })
      .then(function () {
        sampleCopyBaselineLoading = false;
        const step = getCurrentFlowStep();
        if (step && step.id === "easy-done") renderEasyDoneCheck();
      });
  }

  function copyFrameIsPresent(secId) {
    if (store.sampleCopySlots && typeof store.sampleCopySlots === "object") {
      return !!store.sampleCopySlots[secId];
    }
    const blockId = COPY_FRAME_BLOCK[secId];
    const meta = LAYOUT_BLOCKS.find(function (b) { return b.id === blockId; });
    if (!isLayoutBlockActive(meta)) return false;
    if (secId === "contact" && store.draftContact && store.draftContact.note1 === false) {
      return false;
    }
    const keys = COPY_FRAME_TEXT_KEYS[secId] || [];
    return keys.some(function (k) {
      return String(fieldValue(k) || "").trim().length > 0;
    });
  }

  function activeCopyFrameOrder() {
    return COPY_FRAME_ORDER.filter(copyFrameIsPresent);
  }

  function clampCopyFrameIndex() {
    const order = activeCopyFrameOrder();
    if (!order.length) {
      store.copyFrameIndex = 0;
      return order;
    }
    let idx = Number(store.copyFrameIndex) || 0;
    if (idx < 0) idx = 0;
    if (idx > order.length - 1) idx = order.length - 1;
    store.copyFrameIndex = idx;
    return order;
  }

  function currentCopyFrameId() {
    const order = clampCopyFrameIndex();
    return order[store.copyFrameIndex || 0] || "";
  }

  function scrollCopyFramePreview(secId) {
    const sel = COPY_FRAME_PREVIEW[secId];
    if (!sel) return;
    const scope = document.getElementById("preview-root");
    if (!scope) return;
    const target = scope.querySelector(sel);
    if (!target || target.hidden) return;
    scrollPreviewTo(sel);
  }

  function fallbackStubThree(secId) {
    var lines = {
      hero: [
        { label: "やすらぎ", text: "静かな時間を、ここから。" },
        { label: "明るさ", text: "明るい空気が、まず迎えます。" },
        { label: "こだわり", text: "丁寧な仕事を、わかりやすく伝えます。" }
      ],
      about: [
        { label: "やすらぎ", text: "落ち着いて過ごせる空間づくりを大切にしています。" },
        { label: "明るさ", text: "にぎわいと笑顔が自然と集まる場所を目指しています。" },
        { label: "こだわり", text: "こだわりの一点を、わかりやすくお伝えします。" }
      ],
      works: [
        { label: "誘い", text: "いちばんのおすすめを、まずご覧ください。" },
        { label: "わかりやすさ", text: "初めての方にも分かりやすいおすすめです。" },
        { label: "こだわり", text: "店主おすすめの内容をご案内します。" }
      ],
      contact: [
        { label: "わかりやすさ", text: "ご質問は、お気軽にご連絡ください。" },
        { label: "あたたかさ", text: "内容を確認のうえ、丁寧にご案内します。" },
        { label: "誘い", text: "小さなことでも相談できます。" }
      ]
    };
    return lines[secId] || lines.hero;
  }

  function countForCopy(id, fallback) {
    const n = Number(store.draftCounts[id]);
    if (!Number.isFinite(n)) return fallback;
    if (id === "hero-leads" && n === 0) return 0;
    if (n < 1) return fallback;
    return n;
  }

  function visibleCopyFields(secId) {
    if (secId === "hero") {
      const fields = [];
      if (store.copyHeroOnPhoto !== false) {
        fields.push({ key: "hero_title", label: "見出し" });
        const leads = countForCopy("hero-leads", 1);
        for (let i = 1; i <= leads; i += 1) {
          fields.push({ key: "hero_lead_" + i, label: i + "行目" });
        }
      }
      const values = countForCopy("hero-values", 1);
      for (let i = 1; i <= values; i += 1) {
        fields.push({ key: "value_" + i + "_title", label: "枠" + i + "の見出し" });
        fields.push({ key: "value_" + i + "_text", label: "枠" + i + "の文" });
      }
      return fields;
    }
    if (secId === "about") {
      const n = countForCopy("about-accordions", 1);
      const fields = [
        { key: "about_heading", label: "見出し" },
        { key: "about_lead", label: "紹介" }
      ];
      for (let i = 1; i <= n; i += 1) {
        fields.push({ key: "acc_" + i + "_title", label: "項目" + i + "の見出し" });
        fields.push({ key: "acc_" + i + "_body", label: "項目" + i + "の文" });
      }
      return fields;
    }
    if (secId === "works") {
      seedItemOrder("works-list");
      const order = (store.itemOrders && store.itemOrders["works-list"]) || [];
      const n = order.length || countForCopy("works-list", 1);
      const fields = [
        { key: "works_heading", label: "見出し" },
        { key: "works_lead", label: "リード" }
      ];
      for (let i = 1; i <= n; i += 1) {
        fields.push({ key: "work_" + i + "_title", label: "カード" + i + "の見出し" });
        fields.push({ key: "work_" + i + "_text", label: "カード" + i + "の文" });
      }
      return fields;
    }
    if (secId === "contact") {
      return [
        { key: "contact_label", label: "見出し" },
        { key: "contact_note_1", label: "補足1" },
        { key: "contact_note_2", label: "補足2" }
      ];
    }
    return [];
  }

  function generateFrameCandidates(secId, reroll, fieldKey) {
    var dict = window.Sample1manCopyDict;
    if (!dict || typeof dict.generateThree !== "function") {
      return Promise.resolve(fallbackStubThree(secId));
    }
    if (reroll) {
      store.copyFramePoolIndex[fieldKey || secId] = (Number(store.copyFramePoolIndex[fieldKey || secId]) || 0) + 1;
    }
    var salt =
      String(store.copyFramePoolIndex[fieldKey || secId] || 0) +
      "|" +
      (fieldKey || secId) +
      "|" +
      (store.copyPathMode || "") +
      "|" +
      Date.now();
    return dict
      .generateThree({
        sampleKey: store.sushiSampleKey || "",
        sitePurpose: store.sitePurpose || null,
        sceneTag: null,
        sectionId: secId,
        keywordIds: store.copyPathMode === "keyword" ? store.copyDirIds || [] : [],
        forbidKeywordIds: store.copyPathMode === "keyword" ? store.copyDirForbid || [] : [],
        presetAxes: store.copyPathMode === "omakase" ? store.copyOmakaseAxes : null,
        maxChars: fieldKey ? fieldMaxLen(fieldKey) : 0,
        salt: salt
      })
      .then(function (res) {
        const max = fieldKey ? fieldMaxLen(fieldKey) : 0;
        return (res.candidates || [])
          .map(function (c) {
            return { label: c.label, text: c.text, axisId: c.axisId };
          })
          .filter(function (c) {
            if (!max) return true;
            return String(c.text || "").length <= max;
          });
      })
      .catch(function () {
        return (store.copyDirForbid || []).length ? [] : fallbackStubThree(secId);
      });
  }

  function ensureCopyFieldCandidates(secId, fieldKey, reroll) {
    if (!store.copyFrameCandidates || typeof store.copyFrameCandidates !== "object") {
      store.copyFrameCandidates = {};
    }
    if (!reroll && store.copyFrameCandidates[fieldKey] && store.copyFrameCandidates[fieldKey].length) {
      return Promise.resolve(store.copyFrameCandidates[fieldKey]);
    }
    return generateFrameCandidates(secId, !!reroll, fieldKey).then(function (list) {
      store.copyFrameCandidates[fieldKey] = list || [];
      return store.copyFrameCandidates[fieldKey];
    });
  }

  function renderCopyFrameUi() {
    const secId = currentCopyFrameId();
    const title = document.getElementById("easy-copy-frame-title");
    const host = document.getElementById("easy-copy-frame-fields");
    const ask = document.getElementById("easy-copy-hero-ask");
    const rerollWrap = document.getElementById("easy-copy-frame-reroll-wrap");
    if (!secId) {
      if (title) title.textContent = "";
      if (host) host.innerHTML = "";
      return;
    }
    if (title) title.textContent = COPY_FRAME_LABEL[secId] || secId;
    const showAsk = secId === "hero" && store.copyHeroOnPhoto == null;
    if (ask) ask.hidden = !showAsk;
    if (showAsk && ask) {
      ask.hidden = false;
      ask.innerHTML =
        '<p class="step-help">写真の上に言葉を出しますか</p>' +
        '<div class="easy-copy-hero-ask">' +
        '<button type="button" class="gct-btn" data-hero-copy="1">出す</button>' +
        '<button type="button" class="gct-btn" data-hero-copy="0">出さない</button>' +
        "</div>";
      ask.querySelectorAll("[data-hero-copy]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          const on = btn.getAttribute("data-hero-copy") === "1";
          store.copyHeroOnPhoto = on;
          store.heroTextOnPhoto = on;
          applyHeroTextOverlay();
          renderCopyFrameUi();
          scheduleSave();
          updateWizardUi();
        });
      });
    }
    if (showAsk || (secId === "hero" && store.copyHeroOnPhoto === false)) {
      if (host) host.innerHTML = "";
      if (rerollWrap) rerollWrap.hidden = true;
      updateWizardUi();
      return;
    }
    if (rerollWrap) rerollWrap.hidden = false;
    if (!host) return;
    const fields = visibleCopyFields(secId);
    host.innerHTML = fields
      .map(function (field) {
        return (
          '<section class="easy-copy-field" data-copy-field="' +
          field.key +
          '"><p class="easy-copy-field-label">' +
          escapeHtml(field.label) +
          '</p><div class="easy-copy-field-cands" data-copy-cands="' +
          field.key +
          '"></div><div class="easy-copy-field-own"><button type="button" class="gct-btn" data-copy-own="' +
          field.key +
          '">自分で入力する</button><textarea class="easy-copy-field-input" data-copy-input="' +
          field.key +
          '" rows="2" hidden></textarea></div></section>'
        );
      })
      .join("");
    fields.forEach(function (field) {
      const box = host.querySelector('[data-copy-cands="' + field.key + '"]');
      const ownBtn = host.querySelector('[data-copy-own="' + field.key + '"]');
      const input = host.querySelector('[data-copy-input="' + field.key + '"]');
      const paint = function (list) {
        if (!box || currentCopyFrameId() !== secId) return;
        const three = (list || []).slice(0, 3);
        const forbidNote =
          (store.copyDirForbid || []).length && three.length < 3
            ? "赤枠の言葉は、候補に入りません。"
            : !three.length
              ? "この条件では、候補を出せませんでした。"
              : "";
        if (!three.length) {
          box.innerHTML = '<p class="easy-copy-frame-hint">' + escapeHtml(forbidNote) + "</p>";
          return;
        }
        box.innerHTML = three
          .map(function (c, i) {
            return (
              '<button type="button" class="easy-copy-frame-cand" data-copy-pick="' +
              i +
              '"><span class="easy-copy-frame-cand-label">' +
              escapeHtml(c.label) +
              '</span><span class="easy-copy-frame-cand-text">' +
              escapeHtml(c.text) +
              "</span></button>"
            );
          })
          .join("");
        if (forbidNote) {
          box.insertAdjacentHTML(
            "beforeend",
            '<p class="easy-copy-frame-hint">' + escapeHtml(forbidNote) + "</p>"
          );
        }
        box.querySelectorAll("[data-copy-pick]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            const cand = three[Number(btn.getAttribute("data-copy-pick"))];
            if (!cand) return;
            if (!store.copyFieldSource || typeof store.copyFieldSource !== "object") store.copyFieldSource = {};
            store.copyFieldSource[field.key] = "cand";
            applyCopyTextToField(field.key, cand.text);
            if (input) input.hidden = true;
            scheduleSave();
          });
        });
      };
      ensureCopyFieldCandidates(secId, field.key, false).then(paint);
      if (ownBtn && input) {
        ownBtn.addEventListener("click", function () {
          input.hidden = false;
          input.value = fieldValue(field.key) || "";
          input.focus();
        });
        input.addEventListener("input", function () {
          if (!store.copyFieldSource || typeof store.copyFieldSource !== "object") store.copyFieldSource = {};
          store.copyFieldSource[field.key] = "custom";
          applyCopyTextToField(field.key, input.value);
          scheduleSave();
        });
      }
    });
    const block = form.querySelector('.dash-block[data-step-id="easy-copy-frame"]');
    const sel = COPY_FRAME_PREVIEW[secId];
    if (block && sel) block.setAttribute("data-preview-target", sel);
    scrollCopyFramePreview(secId);
    updateWizardUi();
  }

  function readCurrentSectionText(secId) {
    if (store.copyFrameNow[secId]) return store.copyFrameNow[secId];
    if (secId === "hero") return fieldValue("hero_lead_1") || "";
    if (secId === "about") return fieldValue("about_lead") || "";
    if (secId === "works") return fieldValue("works_lead") || fieldValue("work_1_text") || "";
    if (secId === "contact") return fieldValue("contact_note_1") || "";
    return "";
  }

  function renderCopyDirsUi() {
    const root = document.getElementById("easy-copy-dirs-root");
    if (!root) return;
    const selected = new Set(store.copyDirIds || []);
    const forbidden = new Set(store.copyDirForbid || []);
    root.innerHTML = COPY_DIR_GROUPS.map(function (g) {
      const chips = g.options
        .map(function (o) {
          const want = selected.has(o.id);
          const ban = forbidden.has(o.id);
          const cls = want ? " is-on" : ban ? " is-forbid" : "";
          const mark = ban ? '<span class="easy-copy-dir-x" aria-hidden="true">×</span>' : "";
          return (
            '<button type="button" class="easy-copy-dir-chip' +
            cls +
            '" data-copy-dir="' +
            o.id +
            '" aria-pressed="' +
            (want ? "true" : "false") +
            (ban ? ' aria-label="' + escapeHtml(o.label) + '、入れない"' : "") +
            '"><span class="easy-copy-dir-chip-label">' +
            escapeHtml(o.label) +
            "</span>" +
            mark +
            "</button>"
          );
        })
        .join("");
      return (
        '<div class="easy-copy-dir-group"><p class="easy-copy-dir-heading">' +
        escapeHtml(g.label) +
        '</p><div class="easy-copy-dir-chips">' +
        chips +
        "</div></div>"
      );
    }).join("");
    root.querySelectorAll("[data-copy-dir]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const id = btn.getAttribute("data-copy-dir");
        const want = new Set(store.copyDirIds || []);
        const ban = new Set(store.copyDirForbid || []);
        if (ban.has(id)) {
          ban.delete(id);
        } else if (want.has(id)) {
          want.delete(id);
          ban.add(id);
        } else {
          want.add(id);
          ban.delete(id);
        }
        store.copyDirIds = Array.from(want);
        store.copyDirForbid = Array.from(ban);
        store.copyOmakaseAxes = null;
        store.copyFrameCandidates = {};
        store.copyFrameSelected = {};
        renderCopyDirsUi();
        scheduleSave();
      });
    });
  }

  const OMAKASE_AXIS_IDS = ["ease", "bright", "craft", "warm", "clear", "invite"];

  function pickOmakaseAxis(exceptId) {
    const pool = OMAKASE_AXIS_IDS.filter(function (id) {
      return id !== exceptId;
    });
    const list = pool.length ? pool : OMAKASE_AXIS_IDS.slice();
    return list[Math.floor(Math.random() * list.length)];
  }

  function applyOmakaseFromDict(opts) {
    const options = opts || {};
    const onlyUnlocked = !!options.onlyUnlocked;
    const dict = window.Sample1manCopyDict;
    if (!store.copyOmakaseLocks || typeof store.copyOmakaseLocks !== "object") {
      store.copyOmakaseLocks = {};
    }
    if (!store.copyOmakaseAxes || typeof store.copyOmakaseAxes !== "object") {
      store.copyOmakaseAxes = {};
    }
    if (!store.copyFieldSource || typeof store.copyFieldSource !== "object") {
      store.copyFieldSource = {};
    }
    if (!store.copyFieldAxis || typeof store.copyFieldAxis !== "object") {
      store.copyFieldAxis = {};
    }
    store.copyOmakaseSalt = (Number(store.copyOmakaseSalt) || 0) + 1;
    const saltBase =
      "omakase|" +
      store.copyOmakaseSalt +
      "|" +
      Date.now() +
      "|" +
      Math.random().toString(36).slice(2, 10);

    if (options.onlySec) {
      if (!store.copyOmakaseLocks[options.onlySec]) {
        store.copyOmakaseAxes[options.onlySec] = pickOmakaseAxis(store.copyOmakaseAxes[options.onlySec]);
      }
    } else if (options.rerollUnlocked) {
      COPY_FRAME_ORDER.forEach(function (secId) {
        if (store.copyOmakaseLocks[secId]) return;
        if (secId === "hero" && store.copyHeroOnPhoto !== true) return;
        store.copyOmakaseAxes[secId] = pickOmakaseAxis(store.copyOmakaseAxes[secId]);
      });
    } else if (!onlyUnlocked) {
      const axis = pickOmakaseAxis(null);
      COPY_FRAME_ORDER.forEach(function (secId) {
        store.copyOmakaseAxes[secId] = axis;
      });
      store.copyPresetId = "single-" + axis;
    }

    function sectionFields(secId) {
      return visibleCopyFields(secId).filter(function (field) {
        /* 基本情報で決めた紹介は、おまかせが上書きしない */
        if (field.key === "about_lead" && store.easyBasicsApplied) return false;
        return store.copyFieldSource[field.key] !== "custom";
      });
    }

    function writeField(field, text, axisId) {
      applyCopyTextToField(field.key, text);
      store.copyFieldSource[field.key] = "cand";
      store.copyFieldAxis[field.key] = axisId;
      const el = form.elements[field.key];
      if (el) el.setAttribute("data-copy-axis", axisId);
    }

    if (!dict || typeof dict.generateThree !== "function") {
      COPY_FRAME_ORDER.forEach(function (secId) {
        if (options.onlySec && secId !== options.onlySec) return;
        if (onlyUnlocked && store.copyOmakaseLocks[secId]) return;
        if (secId === "hero" && store.copyHeroOnPhoto !== true) return;
        const axisId = store.copyOmakaseAxes[secId];
        const axisLabel = {
          ease: "やすらぎ",
          bright: "明るさ",
          craft: "こだわり",
          warm: "あたたかさ",
          clear: "わかりやすさ",
          invite: "誘い"
        }[axisId];
        const line = (fallbackStubThree(secId) || []).find(function (item) {
          return item && item.label === axisLabel;
        });
        const fields = sectionFields(secId);
        fields.forEach(function (field) {
          if (line && line.text) writeField(field, line.text, axisId);
        });
        if (line && line.text) store.copyFrameNow[secId] = line.text;
      });
      return Promise.resolve();
    }

    let chain = Promise.resolve();
    COPY_FRAME_ORDER.forEach(function (secId) {
      if (options.onlySec && secId !== options.onlySec) return;
      if (onlyUnlocked && store.copyOmakaseLocks[secId]) return;
      if (secId === "hero" && store.copyHeroOnPhoto !== true) return;
      chain = chain.then(function () {
        const axisId = store.copyOmakaseAxes[secId];
        const fields = sectionFields(secId);
        if (!fields.length || !axisId) return;
        const keptIntro =
          secId === "about" && store.easyBasicsApplied ? String(fieldValue("about_lead") || "") : "";
        let fieldChain = Promise.resolve();
        fields.forEach(function (field, index) {
          fieldChain = fieldChain.then(function () {
            const axes = {};
            axes[secId] = axisId;
            let tries = 0;
            function once() {
              tries += 1;
              return dict
                .generateThree({
                  sampleKey: store.sushiSampleKey || "",
                  sitePurpose: store.sitePurpose || null,
                  sceneTag: null,
                  sectionId: secId,
                  keywordIds: [],
                  forbidKeywordIds: [],
                  presetAxes: axes,
                  maxChars: fieldMaxLen(field.key),
                  salt: saltBase + "|" + secId + "|" + field.key + "|" + index + "|" + tries
                })
                .then(function (res) {
                  const max = fieldMaxLen(field.key);
                  const hit = ((res && res.candidates) || []).find(function (c) {
                    return c && c.text && c.axisId === axisId && String(c.text).length <= max;
                  });
                  if (hit) return hit;
                  if (tries < 3) return once();
                  return null;
                });
            }
            return once().then(function (hit) {
              if (!hit) return;
              writeField(field, hit.text, axisId);
              if (!store.copyFrameNow[secId] || index === 0) store.copyFrameNow[secId] = hit.text;
            });
          });
        });
        return fieldChain.then(function () {
          if (keptIntro) store.copyFrameNow[secId] = keptIntro;
        });
      });
    });
    return chain;
  }

  function ensureOmakaseCopyReady() {
    const hasAny = COPY_FRAME_ORDER.some(function (secId) {
      return !!(store.copyFrameNow[secId] || readCurrentSectionText(secId));
    });
    if (hasAny && store.copyOmakaseAxes) return Promise.resolve();
    const anyLock = COPY_FRAME_ORDER.some(function (secId) {
      return !!(store.copyOmakaseLocks && store.copyOmakaseLocks[secId]);
    });
    return applyOmakaseFromDict({ onlyUnlocked: anyLock });
  }

  const COPY_LIST_SECTIONS = [
    { id: "logo", label: "ロゴ" },
    { id: "hero", label: "キャッチ", countId: null, layoutId: "hero" },
    { id: "values", label: "メッセージ枠", countId: "hero-values", layoutId: "values", kind: "pair", titleKey: "value_", textKey: "value_", titleSuffix: "_title", textSuffix: "_text", titleLabel: "見出し", textLabel: "文" },
    { id: "accordions", label: "開く項目", countId: "about-accordions", layoutId: "accordions", kind: "pair", titleKey: "acc_", textKey: "acc_", titleSuffix: "_title", textSuffix: "_body", titleLabel: "見出し", textLabel: "文" },
    { id: "works", label: "カード", countId: "works-list", layoutId: "works", kind: "pair", titleKey: "work_", textKey: "work_", titleSuffix: "_title", textSuffix: "_text", titleLabel: "見出し", textLabel: "文" },
    { id: "hours", label: "営業時間", layoutId: "hours", singleKey: "hours_text", singleLabel: "文" },
    { id: "access", label: "アクセス", layoutId: "access", singleKey: "access_text", singleLabel: "文" },
    { id: "address", label: "住所", layoutId: "address", singleKey: "address_text", singleLabel: "文" },
    { id: "announce", label: "案内", layoutId: "announce", singleKey: "announce_text", singleLabel: "文" },
    { id: "contact", label: "ご連絡", countId: null, layoutId: "contact" }
  ];

  function copySectionIsListed(sec) {
    if (!sec) return false;
    if (sec.id === "hero") return !!easyCatchOn();
    const blockId = sec.layoutId || sec.id;
    const meta = LAYOUT_BLOCKS.find(function (b) { return b.id === blockId; });
    if (!meta) return true;
    return isLayoutBlockActive(meta);
  }

  function copyListSectionById(id) {
    return COPY_LIST_SECTIONS.find(function (s) {
      return s.id === id;
    });
  }

  function ensureCopyListOrder() {
    const allowed = COPY_LIST_SECTIONS.map(function (s) {
      return s.id;
    });
    if (!Array.isArray(store.copyListOrder)) store.copyListOrder = allowed.slice();
    const seen = {};
    store.copyListOrder = store.copyListOrder.filter(function (id) {
      if (seen[id] || allowed.indexOf(id) < 0) return false;
      seen[id] = 1;
      return true;
    });
    allowed.forEach(function (id, index) {
      if (seen[id]) return;
      let at = store.copyListOrder.length;
      for (let j = index + 1; j < allowed.length; j += 1) {
        const pos = store.copyListOrder.indexOf(allowed[j]);
        if (pos >= 0) {
          at = pos;
          break;
        }
      }
      store.copyListOrder.splice(at, 0, id);
      seen[id] = 1;
    });
    const logoAt = store.copyListOrder.indexOf("logo");
    if (logoAt > 0) {
      store.copyListOrder.splice(logoAt, 1);
      store.copyListOrder.unshift("logo");
    }
    return store.copyListOrder;
  }

  function copyListCount(sec) {
    if (!sec || !sec.countId) return 1;
    if (sec.countId === "works-list") {
      seedItemOrder("works-list");
      const order = (store.itemOrders && store.itemOrders["works-list"]) || [];
      return order.length || countForCopy("works-list", 1);
    }
    return countForCopy(sec.countId, 1);
  }

  function copyListItemIndices(sec) {
    if (!sec || sec.kind !== "pair") return [];
    if (sec.countId === "works-list") {
      seedItemOrder("works-list");
      return ((store.itemOrders && store.itemOrders["works-list"]) || []).map(function (slot) {
        const m = /(\d+)/.exec(String(slot || ""));
        return m ? Number(m[1]) : 1;
      });
    }
    const n = copyListCount(sec);
    const out = [];
    for (let i = 1; i <= n; i += 1) out.push(i);
    return out;
  }

  function copyListItemFields(sec, index) {
    if (!sec || sec.kind !== "pair") return [];
    const n = index;
    const fields = [
      { key: sec.titleKey + n + sec.titleSuffix, label: sec.titleLabel },
      { key: sec.textKey + n + sec.textSuffix, label: sec.textLabel }
    ];
    if (sec.id === "works") {
      fields.push({ key: "work_" + n + "_url", label: "URLリンク", placeholder: "http://..." });
      fields.push({ key: "work_" + n + "_link_label", label: "リンクの文字" });
    }
    return fields;
  }

  function copySectionSettingFields(sec) {
    if (!sec) return [];
    if (sec.id === "accordions") {
      return [
        { key: "about_section_name", label: "メニューに出す名前" },
        { key: "about_heading", label: "大見出し" },
        { key: "about_name", label: "名前" },
        { key: "about_lead", label: "紹介文" }
      ];
    }
    if (sec.id === "works") {
      return [
        { key: "works_section_name", label: "メニューに出す名前" },
        { key: "works_heading", label: "大見出し" },
        { key: "works_lead", label: "リード文" }
      ];
    }
    return [];
  }

  function appendAccordionModeChoice(parent) {
    const mode = normalizeAboutItemsDisplay(store.aboutItemsDisplay);
    const panel = document.createElement("div");
    panel.className = "easy-copy-acc-choices";

    const modeCol = document.createElement("div");
    modeCol.className = "easy-copy-acc-col";
    const lead = document.createElement("p");
    lead.className = "dash-note dash-field-label";
    lead.textContent = "表示方法";
    modeCol.appendChild(lead);
    const row = document.createElement("div");
    row.className = "hero-overlay-row";
    row.setAttribute("role", "group");
    row.setAttribute("aria-label", "開く形にするか");
    [
      ["accordion", "アコーディオン表示"],
      ["flat", "そのまま表示"]
    ].forEach(function (pair) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "gct-btn";
      const on = mode === pair[0];
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.textContent = pair[1];
      row.appendChild(btn);
      if (pair[0] === "accordion") {
        const tipWrap = document.createElement("span");
        tipWrap.className = "hub-tip-wrap";
        const tipBtn = document.createElement("button");
        tipBtn.type = "button";
        tipBtn.className = "hub-tip-btn";
        tipBtn.setAttribute("data-hub-tip", "");
        tipBtn.setAttribute("aria-label", "アコーディオンとは");
        tipBtn.textContent = "?";
        const pop = document.createElement("span");
        pop.className = "hub-tip-pop";
        pop.hidden = true;
        pop.textContent = "内容を最初は閉じて表示し、見たい人が項目を押すと内容が開く表示方法です。";
        tipWrap.appendChild(tipBtn);
        tipWrap.appendChild(pop);
        row.appendChild(tipWrap);
      }
      btn.addEventListener("click", function (ev) {
        ev.stopPropagation();
        setAboutItemsDisplay(pair[0]);
        renderCopyListUi({ keepScroll: true });
      });
    });
    modeCol.appendChild(row);
    panel.appendChild(modeCol);

    const lookCol = document.createElement("div");
    lookCol.className = "easy-copy-acc-col";
    if (mode === "accordion") {
      const lookLead = document.createElement("p");
      lookLead.className = "dash-note dash-field-label";
      lookLead.textContent = "見本の開閉";
      lookCol.appendChild(lookLead);
      const lookRow = document.createElement("div");
      lookRow.className = "hero-overlay-row";
      lookRow.setAttribute("role", "group");
      lookRow.setAttribute("aria-label", "見本の開閉");
      [
        [true, "オン"],
        [false, "オフ"]
      ].forEach(function (pair) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "gct-btn";
        const on = !!store.previewAccordionLookOpen === pair[0];
        btn.classList.toggle("is-active", on);
        btn.setAttribute("aria-pressed", on ? "true" : "false");
        btn.textContent = pair[1];
        btn.addEventListener("click", function (ev) {
          ev.stopPropagation();
          store.previewAccordionLookOpen = pair[0];
          applyAboutItemsDisplay();
          if (pair[0]) scrollPreviewTo("#about");
          renderCopyListUi({ keepScroll: true });
        });
        lookRow.appendChild(btn);
      });
      lookCol.appendChild(lookRow);
      const closedNote = document.createElement("p");
      closedNote.className = "dash-note";
      closedNote.textContent = "最初は閉じています。オンにすると、見本で中を見られます。";
      lookCol.appendChild(closedNote);
    } else {
      const flatNote = document.createElement("p");
      flatNote.className = "dash-note dash-field-label";
      flatNote.textContent = "そのまま表示";
      lookCol.appendChild(flatNote);
      const flatBody = document.createElement("p");
      flatBody.className = "dash-note";
      flatBody.textContent = "中は開いたままです。";
      lookCol.appendChild(flatBody);
    }
    panel.appendChild(lookCol);
    parent.appendChild(panel);

    const note = document.createElement("p");
    note.className = "dash-note easy-copy-acc-format";
    note.textContent =
      "内容は、1つならそのまま。分けたいときは全角の「／」で区切れます。【見出し】のあとに本文を書くと、見本でラベル付きになります。";
    parent.appendChild(note);
    setupHubTips(panel);
  }

  function appendCopyShowToggle(parent, formName, storeKey, label) {
    const row = document.createElement("label");
    row.className = "check";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = !!(store.draftContact && store.draftContact[storeKey]);
    input.addEventListener("change", function (ev) {
      ev.stopPropagation();
      const formInput = form.elements.namedItem(formName);
      if (formInput) formInput.checked = input.checked;
      if (!store.draftContact) store.draftContact = { label: true, note1: true, note2: true };
      store.draftContact[storeKey] = input.checked;
      syncContactPanels();
      applyAllConfirmed();
      renderCopyListUi({ keepScroll: true });
      scheduleSave();
    });
    row.appendChild(input);
    row.appendChild(document.createTextNode(" " + label));
    parent.appendChild(row);
  }

  function workLinkShown(n) {
    return !!(store.workLinkOn && store.workLinkOn[String(n)]);
  }

  function appendLinkShowToggle(parent, which) {
    const row = document.createElement("label");
    row.className = "check";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = which === "announce" ? !!store.announceLinkOn : workLinkShown(which);
    input.addEventListener("change", function (ev) {
      ev.stopPropagation();
      if (which === "announce") store.announceLinkOn = input.checked;
      else {
        if (!store.workLinkOn || typeof store.workLinkOn !== "object") store.workLinkOn = {};
        store.workLinkOn[String(which)] = input.checked;
      }
      paintAnnounceFromForm();
      applyWorkCardLinks();
      renderCopyListUi({ keepScroll: true });
      scheduleSave();
    });
    row.appendChild(input);
    row.appendChild(document.createTextNode(" リンクを出す"));
    parent.appendChild(row);
  }

  function swapCopyPairItems(sec, fromIndex, toIndex) {
    if (!sec || sec.kind !== "pair") return false;
    if (!fromIndex || !toIndex || fromIndex === toIndex) return false;
    const a = copyListItemFields(sec, fromIndex);
    const b = copyListItemFields(sec, toIndex);
    if (!a.length || a.length !== b.length) return false;
    a.forEach(function (fa, i) {
      const va = String(
        (store.copyFieldNow && store.copyFieldNow[fa.key]) || fieldValue(fa.key) || ""
      );
      const vb = String(
        (store.copyFieldNow && store.copyFieldNow[b[i].key]) || fieldValue(b[i].key) || ""
      );
      applyCopyTextToField(fa.key, vb);
      applyCopyTextToField(b[i].key, va);
      if (store.copyFieldSource && typeof store.copyFieldSource === "object") {
        const sa = store.copyFieldSource[fa.key];
        const sb = store.copyFieldSource[b[i].key];
        store.copyFieldSource[fa.key] = sb;
        store.copyFieldSource[b[i].key] = sa;
      }
    });
    if (sec.id === "works") {
      if (!store.workLinkOn || typeof store.workLinkOn !== "object") store.workLinkOn = {};
      const onA = !!store.workLinkOn[String(fromIndex)];
      const onB = !!store.workLinkOn[String(toIndex)];
      store.workLinkOn[String(fromIndex)] = onB;
      store.workLinkOn[String(toIndex)] = onA;
    }
    return true;
  }

  function bindCopyListItemDrag(row, sec, itemIndex) {
    const handle = row.querySelector(".layout-inner-handle");
    if (!handle || !sec) return;
    handle.addEventListener("pointerdown", function (ev) {
      if (ev.button != null && ev.button !== 0) return;
      ev.preventDefault();
      ev.stopPropagation();
      const list = row.parentElement;
      if (!list) return;
      const originY = ev.clientY;
      let startY = ev.clientY;
      let changed = false;
      row.classList.add("is-dragging");
      function onMove(ev2) {
        if (Math.abs(ev2.clientY - originY) <= 4) return;
        const y = clampDragClientY(row, ev2.clientY, startY);
        row.style.transform = "translateY(" + (y - startY) + "px)";
        for (let n = 0; n < 6; n += 1) {
          const hit = thirdSwapHit(row, "easy-copy-list-row");
          if (!hit) break;
          const beforeTop = row.getBoundingClientRect().top;
          const fromIndex = Number(row.getAttribute("data-copy-item"));
          const toIndex = Number(hit.other.getAttribute("data-copy-item"));
          let moved = false;
          if (sec.countId === "works-list") {
            const fromId = "work_" + fromIndex;
            const toId = "work_" + toIndex;
            moved = moveItemOrderNear("works-list", fromId, toId, hit.place);
            if (moved) applyItemLayoutToPreview("works-list");
          } else {
            moved = swapCopyPairItems(sec, fromIndex, toIndex);
          }
          if (!moved) break;
          if (hit.place === "after") hit.other.after(row);
          else hit.other.before(row);
          if (sec.countId !== "works-list") {
            const swapped = row.getAttribute("data-copy-item");
            row.setAttribute("data-copy-item", hit.other.getAttribute("data-copy-item"));
            hit.other.setAttribute("data-copy-item", swapped);
          }
          startY = keepDragUnderPointer(row, y, beforeTop, startY);
          changed = true;
        }
      }
      function onUp() {
        window.removeEventListener("pointermove", onMove, true);
        window.removeEventListener("pointerup", onUp, true);
        window.removeEventListener("pointercancel", onUp, true);
        row.style.transform = "";
        row.classList.remove("is-dragging");
        releasePreviewDragFollow();
        if (!changed) return;
        renderCopyListUi({ keepScroll: true });
        scheduleSave();
      }
      window.addEventListener("pointermove", onMove, true);
      window.addEventListener("pointerup", onUp, true);
      window.addEventListener("pointercancel", onUp, true);
    });
  }

  function copyListOpenState() {
    if (!store.copyListOpen || typeof store.copyListOpen !== "object") return null;
    return store.copyListOpen;
  }

  function setCopyListOpen(next) {
    store.copyListOpen = next || null;
    if (!next || next.kind !== "item") store.copyListFocusField = null;
  }

  let easyCopySoloHistory = false;

  function syncEasyCopyListSolo() {
    const host = document.getElementById("easy-copy-list-host");
    const block = document.querySelector('[data-step-id="easy-copy-omakase"]');
    const open = copyListOpenState();
    const sectionSolo = !!(open && open.kind === "section");
    const itemSolo = !!(open && open.kind === "item");
    const drilling = !!(sectionSolo || itemSolo);
    if (host) {
      host.classList.toggle("is-copy-section-solo", sectionSolo);
      host.classList.toggle("is-copy-item-solo", itemSolo);
      host.classList.toggle("is-copy-solo", drilling);
    }
    if (block) {
      block.classList.toggle("is-copy-section-solo", sectionSolo);
      block.classList.toggle("is-copy-item-solo", itemSolo);
      block.classList.toggle("is-copy-solo", drilling);
      block.classList.toggle("is-easy-drill", drilling);
    }
    syncCopyPlaceMark();
  }

  function closeEasyCopyListSolo() {
    if (!copyListOpenState()) {
      syncEasyCopyListSolo();
      return;
    }
    setCopyListOpen(null);
    clearCopyFieldRing();
    renderCopyListUi({ keepScroll: true });
    scheduleSave();
  }

  function truncateCopyLead(text, maxChars) {
    const raw = String(text || "").replace(/\s+/g, " ").trim();
    if (!raw) return "";
    const max = maxChars || 16;
    if (raw.length <= max) return raw;
    return raw.slice(0, max) + "…";
  }

  function copyListFieldDisplayText(key) {
    if (!key) return "";
    if (key === "hero_title" || /^hero_lead_\d+$/.test(key)) {
      if (store.copyFieldNow && Object.prototype.hasOwnProperty.call(store.copyFieldNow, key)) {
        return String(store.copyFieldNow[key] || "").trim();
      }
      return String(fieldValue(key) || "").trim();
    }
    if (store.copyFieldNow && Object.prototype.hasOwnProperty.call(store.copyFieldNow, key)) {
      const now = store.copyFieldNow[key];
      if (now != null && String(now).trim() !== "") return String(now).trim();
      /* 明示的に空にした欄は、用途の例文に戻さない */
      if (store.copyFieldSource && store.copyFieldSource[key] === "custom") return "";
    }
    return resolvePreviewText(fieldValue(key), key, "");
  }

  function fillEmptyHeroLead() {
    /* 空のキャッチ欄へ、見本の文は書き込まない */
  }

  function copyListItemLeadText(sec, itemIndex) {
    if (!sec) return "";
    if (sec.id === "hero") {
      if (store.copyHeroOnPhoto === false || store.heroTextOnPhoto === false) return "";
      return copyListFieldDisplayText("hero_title");
    }
    if (sec.id === "contact") {
      return (
        copyListFieldDisplayText("contact_label") ||
        copyListFieldDisplayText("contact_note_1") ||
        ""
      );
    }
    const fields = copyListItemFields(sec, itemIndex);
    if (!fields.length) return "";
    const title = copyListFieldDisplayText(fields[0].key);
    if (title) return title;
    if (fields[1]) return copyListFieldDisplayText(fields[1].key);
    return "";
  }

  function copyListItemRowLabel(sec, itemIndex) {
    const lead = truncateCopyLead(copyListItemLeadText(sec, itemIndex), 16);
    return lead || "まだ書いていません";
  }

  function copyListSectionRowLabel(sec) {
    if (!sec) return "";
    if (sec.id === "logo") return sec.label;
    if (sec.kind === "pair") {
      const headKey =
        sec.id === "accordions" ? "about_heading" : sec.id === "works" ? "works_heading" : "";
      if (headKey) {
        const lead = truncateCopyLead(copyListFieldDisplayText(headKey), 16);
        if (lead) return lead;
      }
      return sec.label;
    }
    const lead = truncateCopyLead(copyListItemLeadText(sec, null), 16);
    if (lead) return lead;
    return sec.label;
  }

  function bindEasyCopySoloPop() {
    if (bindEasyCopySoloPop.done) return;
    bindEasyCopySoloPop.done = true;
    window.addEventListener("popstate", function () {
      if (!easyCopySoloHistory) return;
      easyCopySoloHistory = false;
      closeEasyCopyListSolo();
    });
  }

  function rememberEasyCopySoloOpen() {
    bindEasyCopySoloPop();
    if (easyCopySoloHistory) return;
    history.pushState({ easyCopySolo: 1 }, "", location.href);
    easyCopySoloHistory = true;
  }

  function clearEasyCopySoloHistory() {
    if (!easyCopySoloHistory) return;
    easyCopySoloHistory = false;
    if (history.state && history.state.easyCopySolo) {
      try {
        history.back();
      } catch (e) { /* ignore */ }
    }
  }

  function copyListDashScrollEl() {
    return (
      document.querySelector(".dash-body") ||
      document.querySelector("#dash") ||
      document.getElementById("easy-copy-list-host")
    );
  }

  function clearCopyFieldRing() {
    document.querySelectorAll("#preview-root .is-copy-field-ring").forEach(function (el) {
      el.classList.remove("is-copy-field-ring");
    });
  }

  function copyPreviewNodeForField(fieldKey) {
    const rootEl = document.getElementById("preview-root");
    if (!rootEl || !fieldKey) return null;
    if (fieldKey === "hero_title") return rootEl.querySelector("#hero-title");
    let m = /^hero_lead_(\d+)$/.exec(fieldKey);
    if (m) {
      const nodes = rootEl.querySelectorAll("#hero-leads [data-sample-item]");
      return nodes[Number(m[1]) - 1] || null;
    }
    m = /^value_(\d+)_(title|text)$/.exec(fieldKey);
    if (m) {
      const li = rootEl.querySelectorAll("#hero-values [data-sample-item]")[Number(m[1]) - 1];
      if (!li) return null;
      if (m[2] === "title") return li.querySelector(".hero-value-title");
      return li.querySelector("p:last-child") || li.querySelector("p");
    }
    m = /^acc_(\d+)_(title|body)$/.exec(fieldKey);
    if (m) {
      const item = rootEl.querySelectorAll("#about-accordions [data-sample-item]")[Number(m[1]) - 1];
      if (!item) return null;
      if (m[2] === "title") return item.querySelector("summary");
      return item.querySelector(".accordion-body") || item;
    }
    m = /^work_(\d+)_(title|text)$/.exec(fieldKey);
    if (m) {
      const item =
        rootEl.querySelector('#works-list > [data-item-id="work_' + m[1] + '"]') ||
        rootEl.querySelectorAll("#works-list [data-sample-item]")[Number(m[1]) - 1];
      if (!item) return null;
      if (m[2] === "title") return item.querySelector("h3");
      return item.querySelector(".work-item-copy p") || item.querySelector("p");
    }
    if (fieldKey === "about_section_name") return rootEl.querySelector("#about-label");
    if (fieldKey === "about_heading") return rootEl.querySelector("#about-heading");
    if (fieldKey === "about_name") return rootEl.querySelector("#about .profile-name");
    if (fieldKey === "about_lead") return rootEl.querySelector("#about .section-lead");
    if (fieldKey === "works_section_name") return rootEl.querySelector("#works-label");
    if (fieldKey === "works_heading") return rootEl.querySelector("#works-heading");
    if (fieldKey === "works_lead") return rootEl.querySelector("#works-lead");
    if (fieldKey === "hours_text") return rootEl.querySelector("#hours-lead");
    if (fieldKey === "access_text") return rootEl.querySelector("#access-lead");
    if (fieldKey === "address_text") return rootEl.querySelector("#address-lead");
    if (fieldKey === "announce_text") return rootEl.querySelector("#announce-lead");
    if (fieldKey === "announce_label") return rootEl.querySelector("#announce-go");
    if (fieldKey === "contact_email") return rootEl.querySelector("#contact .sample-mail");
    if (fieldKey === "contact_label") return rootEl.querySelector("#contact-label");
    if (fieldKey === "contact_note_1") return rootEl.querySelector('[data-contact-note="1"]');
    if (fieldKey === "contact_note_2") return rootEl.querySelector('[data-contact-note="2"]');
    return null;
  }

  function paintCopyFieldRing(fieldKey) {
    clearCopyFieldRing();
    if (fieldKey === "hero_title" || /^hero_lead_\d+$/.test(String(fieldKey || ""))) return;
    const node = copyPreviewNodeForField(fieldKey);
    if (node) node.classList.add("is-copy-field-ring");
  }

  function scrollCopyListPreview(sectionId, fieldKey) {
    if (fieldKey) paintCopyFieldRing(fieldKey);
    else clearCopyFieldRing();
    const sectionTarget = copySectionPreviewEl(sectionId);
    if (sectionTarget && parkOpenCopyPreview._held === sectionId) {
      focusPreviewTarget(sectionTarget);
      return;
    }
    if (sectionTarget) return;
    if (sectionId === "logo") {
      scrollPreviewTo("#preview-header");
      return;
    }
    const sec = copyListSectionById(sectionId);
    const meta = sec && LAYOUT_BLOCKS.find(function (b) {
      return b.id === sec.layoutId;
    });
    if (meta && meta.selector) scrollPreviewTo(meta.selector);
  }

  function applyCopyListOrderToLayout() {
    const list = ensureCopyListOrder();
    const layoutIds = list
      .map(function (id) {
        const sec = copyListSectionById(id);
        return sec && sec.layoutId;
      })
      .filter(Boolean);
    const set = {};
    layoutIds.forEach(function (id) {
      set[id] = 1;
    });
    const order = normalizeLayoutOrder(store.layoutOrder);
    let at = order.findIndex(function (id) {
      return set[id];
    });
    if (at < 0) at = 0;
    const kept = order.filter(function (id) {
      return !set[id];
    });
    kept.splice(at, 0, ...layoutIds);
    store.layoutOrder = normalizeLayoutOrder(kept);
    applyLayoutOrderToPreview();
  }

  function copyListDefaultFocus(sec, itemIndex) {
    if (!sec) return null;
    if (sec.id === "hero") {
      if (store.copyHeroOnPhoto === false || store.heroTextOnPhoto === false) return null;
      return "hero_title";
    }
    if (sec.id === "contact") return "contact_label";
    if (sec.singleKey) return sec.singleKey;
    const fields = copyListItemFields(sec, itemIndex);
    return fields[0] ? fields[0].key : null;
  }

  function fieldMaxLen(key) {
    const n = Number(FIELD_MAX[key]);
    return Number.isFinite(n) && n > 0 ? n : 100;
  }

  function renderCopyListCandidates(box, fieldKey, sectionId) {
    if (!box || !fieldKey) return;
    const forbidNote =
      store.copyPathMode === "keyword" && (store.copyDirForbid || []).length
        ? "赤枠の言葉は、候補に入りません。"
        : "";
    const paint = function (list) {
      if (!box) return;
      const three = (list || []).slice(0, 3);
      if (!three.length) {
        box.innerHTML =
          '<p class="easy-copy-frame-hint">' +
          escapeHtml(forbidNote || "この条件では、候補を出せませんでした。") +
          "</p>";
        return;
      }
      const now = String((store.copyFieldNow && store.copyFieldNow[fieldKey]) || fieldValue(fieldKey) || "");
      box.innerHTML = three
        .map(function (c, i) {
          const on = now && String(c.text || "") === now;
          return (
            '<button type="button" class="easy-copy-frame-cand' +
            (on ? " is-picked" : "") +
            '" data-copy-pick="' +
            i +
            '"><span class="easy-copy-frame-cand-label">' +
            escapeHtml(c.label) +
            '</span><span class="easy-copy-frame-cand-text">' +
            escapeHtml(c.text) +
            "</span></button>"
          );
        })
        .join("");
      box.querySelectorAll("[data-copy-pick]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          const cand = three[Number(btn.getAttribute("data-copy-pick"))];
          if (!cand) return;
          if (!store.copyFieldSource || typeof store.copyFieldSource !== "object") store.copyFieldSource = {};
          store.copyFieldSource[fieldKey] = "cand";
          applyCopyTextToField(fieldKey, cand.text);
          box.querySelectorAll(".easy-copy-frame-cand").forEach(function (el) {
            el.classList.toggle("is-picked", el === btn);
          });
          const ownInput = box.parentElement && box.parentElement.querySelector(".easy-copy-field-input");
          if (ownInput) {
            ownInput.hidden = true;
            ownInput.value = "";
          }
          const countEl = box.parentElement && box.parentElement.querySelector(".easy-copy-field-count");
          if (countEl) countEl.hidden = true;
          scheduleSave();
        });
      });
    };
    const dictSec =
      sectionId === "values" || sectionId === "hero"
        ? "hero"
        : sectionId === "accordions"
          ? "about"
          : sectionId === "works"
            ? "works"
            : "contact";
    ensureCopyFieldCandidates(dictSec, fieldKey, false).then(paint);
  }

  function copyListDictSec(sectionId) {
    return sectionId === "values" || sectionId === "hero"
      ? "hero"
      : sectionId === "accordions"
        ? "about"
        : sectionId === "works"
          ? "works"
          : "contact";
  }

  function appendCopyListOkBtn(wrap, closeFn) {
    const ok = document.createElement("button");
    ok.type = "button";
    ok.className = "layout-open-btn is-ok easy-copy-list-ok";
    ok.textContent = "これでOK";
    ok.addEventListener("click", function (ev) {
      ev.stopPropagation();
      closeFn();
    });
    wrap.appendChild(ok);
    return ok;
  }

  function appendCopyListOkFoot(wrap, closeFn) {
    const foot = document.createElement("div");
    foot.className = "easy-copy-list-ok-foot";
    appendCopyListOkBtn(foot, closeFn);
    wrap.appendChild(foot);
  }

  function rememberCopyOmakaseEdge(fieldKey, text) {
    if (!store.copyOmakaseEdges || typeof store.copyOmakaseEdges !== "object") store.copyOmakaseEdges = {};
    const t = String(text || "").trim();
    store.copyOmakaseEdges[fieldKey] = {
      head: t.slice(0, 8),
      tail: t.slice(-8)
    };
  }

  function copyOmakaseEdgeBlocked(fieldKey, text) {
    const prev = store.copyOmakaseEdges && store.copyOmakaseEdges[fieldKey];
    if (!prev) return false;
    const t = String(text || "").trim();
    if (!t) return false;
    const head = t.slice(0, 8);
    const tail = t.slice(-8);
    return (prev.head && head === prev.head) || (prev.tail && tail === prev.tail);
  }

  function runCopyFieldOmakase(fieldKey, sectionId, onDone) {
    const dictSec = copyListDictSec(sectionId);
    let tries = 0;
    function pull() {
      tries += 1;
      ensureCopyFieldCandidates(dictSec, fieldKey, true).then(function (list) {
        const three = (list || []).slice(0, 3);
        let pick = three[0];
        for (let i = 0; i < three.length; i += 1) {
          if (!copyOmakaseEdgeBlocked(fieldKey, three[i].text)) {
            pick = three[i];
            break;
          }
        }
        if ((!pick || copyOmakaseEdgeBlocked(fieldKey, pick.text)) && tries < 4) {
          pull();
          return;
        }
        if (!pick) {
          if (onDone) onDone();
          return;
        }
        const max = fieldMaxLen(fieldKey);
        if (max && String(pick.text || "").length > max) {
          if (tries < 6) {
            pull();
            return;
          }
          if (onDone) onDone();
          return;
        }
        if (!store.copyFieldSource || typeof store.copyFieldSource !== "object") store.copyFieldSource = {};
        store.copyFieldSource[fieldKey] = "cand";
        applyCopyTextToField(fieldKey, pick.text);
        rememberCopyOmakaseEdge(fieldKey, pick.text);
        scheduleSave();
        if (onDone) onDone();
      });
    }
    pull();
  }

  function copyColorLinksForSection(secId) {
    if (secId === "values") return [{ id: "values-color", label: "メッセージ枠色" }];
    if (secId === "accordions") {
      return [
        { id: "global-body", label: "本文色" },
        { id: "global-accent", label: "アクセント" },
        { id: "global-card", label: "カード" }
      ];
    }
    if (secId === "works") {
      return [
        { id: "global-accent", label: "アクセント" },
        { id: "global-card", label: "カード" }
      ];
    }
    if (secId === "contact") return [{ id: "contact", label: "ご連絡色" }];
    if (secId === "name") {
      return [
        { id: "global-chrome-bg", label: "ヘッダー背景" },
        { id: "global-chrome-ink", label: "ヘッダー文字" }
      ];
    }
    return [];
  }

  function restoreCopyColorRows() {
    document.querySelectorAll("[data-copy-borrowed]").forEach(function (unit) {
      if (unit.classList.contains("is-open")) {
        if (unit.classList.contains("layout-color-group")) closeColorGroup(unit);
        else closeLayoutColorRow(unit);
      }
      const home = unit._copyColorHome;
      if (home && home.parent) home.parent.insertBefore(unit, home.next);
      unit.removeAttribute("data-copy-borrowed");
    });
  }

  function restoreCopyBorrowedControls() {
    restoreCopyColorRows();
    parkFontPickersInReservoir();
  }

  function copyColorUnit(id) {
    mountLayoutColorSection();
    if (id === "contact") return document.querySelector('#layout-color-rows [data-color-move="contact"]');
    return document.querySelector('[data-color-step="' + id + '"]');
  }

  function openCopyInlineColor(id, box) {
    restoreCopyColorRows();
    const unit = copyColorUnit(id);
    const host = box && box.querySelector(".easy-copy-color-host");
    if (!unit || !host) return;
    if (!unit._copyColorHome) {
      unit._copyColorHome = { parent: unit.parentElement, next: unit.nextSibling };
    }
    unit.hidden = false;
    unit.setAttribute("data-copy-borrowed", "1");
    host.appendChild(unit);
    if (unit.classList.contains("layout-color-group")) openColorGroup(unit);
    else openLayoutColorHoney(unit);
  }

  function placeCopyFonts() {
    const onCopy = getCurrentFlowStep() && getCurrentFlowStep().id === "easy-copy-omakase";
    const group = onCopy ? document.querySelector("#easy-copy-list-host [data-copy-font-group]") : null;
    const reservoir = document.getElementById("site-fonts-reservoir");
    if (group) {
      document.querySelectorAll(".font-picker-block[data-font-role]").forEach(function (block) {
        const role = block.getAttribute("data-font-role");
        const host = group.querySelector('[data-copy-font-host="' + role + '"]');
        if (host) {
          host.appendChild(block);
          block.hidden = false;
        } else if (reservoir) {
          reservoir.appendChild(block);
          block.hidden = true;
          setFontPickerOpen(block, false);
        }
      });
      syncFontPickerCurrentLabels();
      return;
    }
    const host = document.querySelector(
      "#easy-catch-settings [data-copy-font-host], #easy-catch-copy [data-copy-font-host]"
    );
    const role = host ? host.getAttribute("data-copy-font-host") : "";
    document.querySelectorAll(".font-picker-block[data-font-role]").forEach(function (block) {
      const blockRole = block.getAttribute("data-font-role");
      if (role && blockRole === role && host) {
        host.appendChild(block);
        block.hidden = false;
      } else {
        if (reservoir) reservoir.appendChild(block);
        block.hidden = true;
        setFontPickerOpen(block, false);
      }
    });
    syncFontPickerCurrentLabels();
  }

  let copyFontFrameOpen = false;

  function appendCopyFontFrame(parent) {
    const frame = document.createElement("div");
    frame.className = "easy-copy-font-frame";
    frame.setAttribute("data-copy-font-group", "");
    const head = document.createElement("div");
    head.className = "easy-copy-list-head layout-closed-head--list";
    const name = document.createElement("p");
    name.className = "easy-copy-list-name layout-arrange-name";
    name.textContent = "書体";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "layout-open-btn";
    const syncOpen = function () {
      const body = frame.querySelector(".easy-copy-font-frame-body");
      if (body) body.hidden = !copyFontFrameOpen;
      btn.textContent = copyFontFrameOpen ? "これでOK" : "開く";
      btn.setAttribute("aria-expanded", copyFontFrameOpen ? "true" : "false");
    };
    btn.addEventListener("click", function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      copyFontFrameOpen = !copyFontFrameOpen;
      if (!copyFontFrameOpen) {
        frame.querySelectorAll(".font-picker-block").forEach(function (block) {
          setFontPickerOpen(block, false);
        });
      }
      syncOpen();
    });
    head.appendChild(name);
    head.appendChild(btn);
    frame.appendChild(head);
    const body = document.createElement("div");
    body.className = "easy-copy-font-frame-body";
    ["display", "body"].forEach(function (role) {
      const host = document.createElement("div");
      host.className = "easy-copy-font-slot";
      host.setAttribute("data-copy-font-host", role);
      body.appendChild(host);
    });
    frame.appendChild(body);
    syncOpen();
    parent.appendChild(frame);
  }

  function appendCopyHubExtras(parent, secId) {
    if (!store.easyDirectOpen) return;
    const links = copyColorLinksForSection(secId);
    if (!links.length) return;
    const box = document.createElement("div");
    box.className = "easy-copy-hub-extras";
    if (links.length) {
      const note = document.createElement("p");
      note.className = "dash-note easy-copy-color-links";
      note.appendChild(document.createTextNode("色へ："));
      links.forEach(function (item, i) {
        if (i) note.appendChild(document.createTextNode(" ／ "));
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "step-cross-link";
        btn.textContent = item.label;
        btn.addEventListener("click", function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          openCopyInlineColor(item.id, box);
        });
        note.appendChild(btn);
      });
      box.appendChild(note);
      const colorHost = document.createElement("div");
      colorHost.className = "easy-copy-color-host";
      box.appendChild(colorHost);
    }
    parent.appendChild(box);
  }

  function buildCopyListEditor(sec, itemIndex) {
    const wrap = document.createElement("div");
    wrap.className = "easy-copy-list-editor";
    const closeToSectionOrList = function () {
      clearEasyCopySoloHistory();
      if (sec.kind === "pair") {
        setCopyListOpen({ kind: "section", sectionId: sec.id });
      } else {
        setCopyListOpen(null);
        clearCopyFieldRing();
      }
      renderCopyListUi({ keepScroll: true });
      scheduleSave();
    };

    const head = document.createElement("div");
    head.className = "easy-copy-item-head";
    const title = document.createElement("p");
    title.className = "easy-copy-item-title";
    title.textContent =
      sec.kind === "pair"
        ? copyListItemRowLabel(sec, itemIndex) === "まだ書いていません"
          ? sec.label
          : copyListItemRowLabel(sec, itemIndex)
        : sec.label;
    head.appendChild(title);
    if (sec.id !== "hero") wrap.appendChild(head);

    if (sec.id === "hero") {
      const board = document.createElement("div");
      board.className = "easy-copy-hero-board";
      const catchCell = document.createElement("div");
      catchCell.className = "easy-copy-hero-catch";
      catchCell.appendChild(title);

      const overlay = document.createElement("div");
      overlay.className = "hero-overlay-row easy-copy-hero-ask-row";
      overlay.setAttribute("role", "group");
      overlay.setAttribute("aria-label", "写真に文字を載せるか");
      [["1", "載せる"], ["0", "載せない"]].forEach(function (pair) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "gct-btn";
        const on = pair[0] === "1";
        const now = store.copyHeroOnPhoto !== false && store.heroTextOnPhoto !== false;
        btn.classList.toggle("is-active", on ? now : !now);
        btn.setAttribute("aria-pressed", on ? (now ? "true" : "false") : (!now ? "true" : "false"));
        btn.textContent = pair[1];
        btn.addEventListener("click", function () {
          store.copyHeroOnPhoto = on;
          store.heroTextOnPhoto = on;
          applyHeroTextOverlay();
          if (on) applyAllConfirmed();
          store.copyListFocusField = on ? "hero_title" : null;
          renderCopyListUi({ keepScroll: true });
          scheduleSave();
        });
        overlay.appendChild(btn);
      });
      catchCell.appendChild(overlay);
      board.appendChild(catchCell);

      const showText = store.copyHeroOnPhoto !== false && store.heroTextOnPhoto !== false;
      const onCatchFace = getCurrentFlowStep() && getCurrentFlowStep().id === "easy-catch";
      if (!showText && !onCatchFace) {
        wrap.appendChild(board);
        const note = document.createElement("p");
        note.className = "dash-note";
        note.textContent = "載せないあいだは、キャッチ用の文章例は出ません。";
        wrap.appendChild(note);
        appendCopyHubExtras(wrap, "hero");
        appendCopyListOkFoot(wrap, closeToSectionOrList);
        return wrap;
      }

      const leadRow = document.createElement("div");
      leadRow.className = "hero-overlay-options easy-copy-hero-leads";
      leadRow.innerHTML = '<p class="dash-note dash-field-label">サブキャッチ</p>';
      const countCluster = document.createElement("span");
      countCluster.className = "layout-count-cluster";
      const leadMax = (COUNT_META["hero-leads"] && COUNT_META["hero-leads"].max) || 3;
      const leadNow = countForCopy("hero-leads", 0);
      const minus = document.createElement("button");
      minus.type = "button";
      minus.className = "layout-count-btn";
      minus.textContent = "−";
      minus.setAttribute("aria-label", "サブキャッチを減らす");
      minus.disabled = leadNow <= 0;
      const num = document.createElement("span");
      num.className = "layout-image-count-num";
      num.textContent = leadNow <= 0 ? "出さない" : leadNow + " / " + leadMax;
      const plus = document.createElement("button");
      plus.type = "button";
      plus.className = "layout-count-btn";
      plus.textContent = "＋";
      plus.setAttribute("aria-label", "サブキャッチを増やす");
      plus.disabled = leadNow >= leadMax;
      function setHeroLeads(next) {
        const n = Math.max(0, Math.min(leadMax, next));
        store.draftCounts["hero-leads"] = n;
        applyCountToPreview("hero-leads", n);
        syncCountLabels();
        renderCopyListUi({ keepScroll: true });
        scheduleSave();
      }
      minus.addEventListener("click", function () { setHeroLeads(leadNow - 1); });
      plus.addEventListener("click", function () { setHeroLeads(leadNow + 1); });
      countCluster.appendChild(minus);
      countCluster.appendChild(num);
      countCluster.appendChild(plus);
      leadRow.appendChild(countCluster);
      board.appendChild(leadRow);

      const size = document.createElement("fieldset");
      size.className = "inline-fieldset easy-copy-hero-size";
      size.innerHTML = "<legend>文字の大きさ</legend>";
      [
        ["1", "小さめ"],
        ["1.15", "標準"],
        ["2.5", "大きめ"]
      ].forEach(function (pair) {
        const lab = document.createElement("label");
        const input = document.createElement("input");
        input.type = "radio";
        input.name = "copy_list_headingScale";
        input.value = pair[0];
        const cur = normalizeHeadingScale(fieldValue("headingScale") || DEFAULTS.headingScale);
        input.checked = cur === pair[0];
        input.addEventListener("change", function () {
          setFieldValue("headingScale", pair[0]);
          applyAllConfirmed();
          scheduleSave();
        });
        lab.appendChild(input);
        lab.appendChild(document.createTextNode(" " + pair[1]));
        size.appendChild(lab);
      });
      board.appendChild(size);

      const plate = document.createElement("div");
      plate.className = "hero-overlay-options easy-copy-hero-plate-span";
      const presenceLabel = document.createElement("p");
      presenceLabel.className = "dash-note dash-field-label";
      presenceLabel.textContent = "文字の下地";
      plate.appendChild(presenceLabel);
      const presenceRow = document.createElement("div");
      presenceRow.className = "hero-overlay-row easy-copy-hero-plate-line";
      const plateOn = normalizeHeroPlate(store.heroTextPlate) !== "none";
      [["0", "なし"], ["1", "あり"]].forEach(function (pair) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "gct-btn";
        const on = pair[0] === "1";
        btn.classList.toggle("is-active", on ? plateOn : !plateOn);
        btn.setAttribute("aria-pressed", (on ? plateOn : !plateOn) ? "true" : "false");
        btn.textContent = pair[1];
        btn.addEventListener("click", function () {
          const inCatch = !!btn.closest("#easy-catch-host");
          setHeroPlatePresence(on);
          applyHeroTextOverlay();
          if (inCatch) renderEasyCatchRest();
          else renderCopyListUi({ keepScroll: true });
          scheduleSave();
        });
        presenceRow.appendChild(btn);
      });
      if (plateOn) {
        [["white", "白"], ["dark", "黒"]].forEach(function (pair) {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "gct-btn easy-copy-hero-tone";
          const cur = normalizeHeroPlateTone(store.heroTextPlateTone);
          btn.classList.toggle("is-active", cur === pair[0]);
          btn.setAttribute("aria-pressed", cur === pair[0] ? "true" : "false");
          btn.textContent = pair[1];
          btn.addEventListener("click", function () {
            store.heroTextPlateTone = normalizeHeroPlateTone(pair[0]);
            applyHeroTextOverlay();
            renderCopyListUi({ keepScroll: true });
            scheduleSave();
          });
          presenceRow.appendChild(btn);
        });
      }
      plate.appendChild(presenceRow);
      if (plateOn) {
        const plateRow = document.createElement("div");
        plateRow.className = "hero-overlay-row hero-overlay-row--shapes";
        [
          ["rect", "四角"],
          ["round", "角まる"],
          ["oval", "楕円"]
        ].forEach(function (pair) {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "gct-btn";
          const cur = normalizeHeroPlate(store.heroTextPlate);
          btn.classList.toggle("is-active", cur === pair[0]);
          btn.setAttribute("aria-pressed", cur === pair[0] ? "true" : "false");
          btn.textContent = pair[1];
          btn.addEventListener("click", function () {
            store.heroTextPlate = normalizeHeroPlate(pair[0]);
            store.heroTextPlateLast = store.heroTextPlate;
            applyHeroTextOverlay();
            renderCopyListUi({ keepScroll: true });
            scheduleSave();
          });
          plateRow.appendChild(btn);
        });
        plate.appendChild(plateRow);
      }
      const posBox = document.createElement("div");
      posBox.className = "hero-overlay-options easy-copy-hero-pos";
      posBox.innerHTML = '<p class="dash-note dash-field-label">文字の位置</p>';
      const compass = document.createElement("div");
      compass.className = "gct-grad-compass hero-text-pos-compass";
      compass.setAttribute("role", "group");
      compass.setAttribute("aria-label", "キャッチ文字の位置");
      const curPos = normalizeHeroTextPos(store.heroTextPos);
      HERO_TEXT_POS_COMPASS.forEach(function (slot) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.style.gridColumn = String(slot.col);
        btn.style.gridRow = String(slot.row);
        if (slot.center) {
          btn.className = "gct-grad-clear" + (curPos === slot.id ? " is-active" : "");
          btn.textContent = "中央";
          btn.setAttribute("aria-label", "中央");
        } else {
          btn.className = "gct-grad-arrow" + (curPos === slot.id ? " is-active" : "");
          btn.textContent = slot.arrow;
          btn.setAttribute("aria-label", slot.label);
          setHoverTip(btn, slot.label);
        }
        btn.setAttribute("aria-pressed", curPos === slot.id ? "true" : "false");
        btn.addEventListener("click", function () {
          store.heroTextPos = normalizeHeroTextPos(slot.id);
          applyHeroTextPos();
          compass.querySelectorAll("button").forEach(function (el) {
            const onBtn = el === btn;
            el.classList.toggle("is-active", onBtn);
            el.setAttribute("aria-pressed", onBtn ? "true" : "false");
          });
          scheduleSave();
        });
        compass.appendChild(btn);
      });
      posBox.appendChild(compass);
      board.appendChild(plate);
      board.appendChild(posBox);
      wrap.appendChild(board);

      const fields = [{ key: "hero_title", label: "見出し" }];
      const leads = countForCopy("hero-leads", 1);
      for (let i = 1; i <= leads; i += 1) {
        fillEmptyHeroLead(i);
        fields.push({ key: "hero_lead_" + i, label: "サブキャッチ" + i });
      }
      appendCopyListFieldUi(wrap, fields, store.copyListFocusField || "hero_title", "hero");
      const catchFont = document.createElement("div");
      catchFont.className = "easy-catch-font";
      catchFont.setAttribute("data-copy-font-host", "catch");
      wrap.appendChild(catchFont);
      appendCopyHubExtras(wrap, "hero");
      if (!onCatchFace) appendCopyListOkFoot(wrap, closeToSectionOrList);
      return wrap;
    }

    if (sec.id === "contact") {
      appendCopyShowToggle(wrap, "contact_show_label", "label", "小さめのラベルを出す");
      const contactFields = [];
      if (!store.draftContact || store.draftContact.label !== false) {
        contactFields.push({ key: "contact_label", label: "小さめのラベル" });
      }
      contactFields.push({ key: "contact_section_name", label: "メニューに出す名前" });
      contactFields.push({ key: "contact_email", label: "掲載メール" });
      appendCopyListFieldUi(
        wrap,
        contactFields,
        store.copyListFocusField || contactFields[0].key,
        "contact"
      );
      appendCopyShowToggle(wrap, "contact_show_note_1", "note1", "補足1を出す");
      if (!store.draftContact || store.draftContact.note1 !== false) {
        appendCopyListFieldUi(
          wrap,
          [{ key: "contact_note_1", label: "補足1" }],
          store.copyListFocusField || "contact_note_1",
          "contact"
        );
      }
      appendCopyShowToggle(wrap, "contact_show_note_2", "note2", "補足2を出す");
      if (!store.draftContact || store.draftContact.note2 !== false) {
        appendCopyListFieldUi(
          wrap,
          [{ key: "contact_note_2", label: "補足2" }],
          store.copyListFocusField || "contact_note_2",
          "contact"
        );
      }
      appendCopyHubExtras(wrap, "contact");
      appendCopyListOkFoot(wrap, closeToSectionOrList);
      return wrap;
    }

    if (sec.singleKey) {
      appendCopyListFieldUi(
        wrap,
        [{ key: sec.singleKey, label: sec.singleLabel || "文" }],
        store.copyListFocusField || sec.singleKey,
        sec.id
      );
      if (sec.id === "announce") {
        appendLinkShowToggle(wrap, "announce");
        if (store.announceLinkOn) {
          appendCopyListFieldUi(
            wrap,
            [
              { key: "announce_label", label: "ボタン" },
              { key: "announce_url", label: "URLリンク", placeholder: "http://..." }
            ],
            store.copyListFocusField || "announce_label",
            sec.id
          );
        }
      }
      appendCopyListOkFoot(wrap, closeToSectionOrList);
      return wrap;
    }

    const itemFields = copyListItemFields(sec, itemIndex);
    const bodyFields =
      sec.id === "works"
        ? itemFields.filter(function (f) {
            return !/_url$/.test(f.key) && !/_link_label$/.test(f.key);
          })
        : itemFields;
    appendCopyListFieldUi(
      wrap,
      bodyFields,
      store.copyListFocusField || copyListDefaultFocus(sec, itemIndex),
      sec.id
    );
    if (sec.id === "works") {
      appendLinkShowToggle(wrap, itemIndex);
      if (workLinkShown(itemIndex)) {
        appendCopyListFieldUi(
          wrap,
          itemFields.filter(function (f) {
            return /_url$/.test(f.key) || /_link_label$/.test(f.key);
          }),
          store.copyListFocusField || "work_" + itemIndex + "_url",
          sec.id
        );
      }
    }
    if (sec.id === "values" || sec.id === "accordions" || sec.id === "works") {
      appendCopyHubExtras(wrap, sec.id);
    }
    appendCopyListOkFoot(wrap, closeToSectionOrList);
    return wrap;
  }

  function copyFieldSkipsOmakase(key) {
    if (store.blankCanvas) return true;
    if (key === "contact_email" || key === "address_text" || key === "access_text" || key === "about_name") return true;
    if (key === "announce_label" || key === "announce_url") return true;
    if (/^work_\d+_url$/.test(key) || /^work_\d+_link_label$/.test(key)) return true;
    return false;
  }

  function appendCopyListFieldUi(wrap, fields, focusKey, sectionId) {
    if (!store.copyFieldSource || typeof store.copyFieldSource !== "object") store.copyFieldSource = {};
    const active =
      focusKey && fields.some(function (f) {
        return f.key === focusKey;
      })
        ? focusKey
        : fields[0] && fields[0].key;
    store.copyListFocusField = active || null;

    fields.forEach(function (field) {
      const skipOmakase = copyFieldSkipsOmakase(field.key);
      const sec = document.createElement("section");
      sec.className = "easy-copy-field" + (field.key === active ? " is-copy-field-active" : "") + (skipOmakase ? " is-no-omakase" : "");
      sec.setAttribute("data-copy-field", field.key);

      const label = document.createElement("p");
      label.className = "easy-copy-field-label";
      label.textContent = field.label;
      sec.appendChild(label);

      const max = fieldMaxLen(field.key);
      const input = document.createElement("textarea");
      input.className = "easy-copy-field-input easy-copy-field-input--solo";
      input.setAttribute("placeholder", store.blankCanvas ? "" : (field.placeholder || "ここに書けます"));
      input.setAttribute("maxlength", String(max));
      applyCopyFrame(input, field.key, max);
      input.value = copyListFieldDisplayText(field.key);
      growCopyField(input);

      const box = document.createElement("div");
      box.className = "easy-copy-field-box";
      const counter = document.createElement("p");
      counter.className = "easy-copy-field-count";
      function paintCount() {
        counter.textContent = String(input.value || "").length + " / " + max;
      }
      paintCount();

      const resetBtn = document.createElement("button");
      resetBtn.type = "button";
      resetBtn.className = "layout-img-source easy-copy-reset-btn";
      resetBtn.textContent = "リセット";

      resetBtn.addEventListener("click", function (ev) {
        ev.stopPropagation();
        store.copyFieldSource[field.key] = "custom";
        applyCopyTextToField(field.key, "");
        input.value = "";
        growCopyField(input);
        paintCount();
        paintCopyFieldRing(field.key);
        scheduleSave();
      });

      input.addEventListener("focus", function () {
        store.copyListFocusField = field.key;
        paintCopyFieldRing(field.key);
        wrap.querySelectorAll(".easy-copy-field").forEach(function (el) {
          el.classList.toggle("is-copy-field-active", el.getAttribute("data-copy-field") === field.key);
        });
      });
      input.addEventListener("input", function () {
        let v = String(input.value || "");
        if (v.length > max) {
          v = v.slice(0, max);
          input.value = v;
        }
        store.copyFieldSource[field.key] = "custom";
        applyCopyTextToField(field.key, v);
        growCopyField(input);
        paintCount();
        scheduleSave();
      });

      if (!skipOmakase) {
        const actions = document.createElement("div");
        actions.className = "easy-copy-field-actions";
        const omakaseBtn = document.createElement("button");
        omakaseBtn.type = "button";
        omakaseBtn.className = "layout-img-source easy-copy-omakase-btn";
        omakaseBtn.textContent = "文章例を出す";
        omakaseBtn.addEventListener("click", function (ev) {
          ev.stopPropagation();
          store.copyListFocusField = field.key;
          omakaseBtn.disabled = true;
          runCopyFieldOmakase(field.key, sectionId, function () {
            omakaseBtn.disabled = false;
            input.value = copyListFieldDisplayText(field.key);
            growCopyField(input);
            paintCount();
            paintCopyFieldRing(field.key);
            scrollCopyListPreview(sectionId, field.key);
          });
        });
        const omakaseTip = document.createElement("span");
        omakaseTip.className = "hub-tip-wrap";
        const omakaseTipBtn = document.createElement("button");
        omakaseTipBtn.type = "button";
        omakaseTipBtn.className = "hub-tip-btn";
        omakaseTipBtn.setAttribute("data-hub-tip", "");
        omakaseTipBtn.setAttribute("aria-label", "文章例とは");
        omakaseTipBtn.textContent = "?";
        const omakasePop = document.createElement("span");
        omakasePop.className = "hub-tip-pop";
        omakasePop.hidden = true;
        omakasePop.textContent = "文章例は、何度でも出せます。こちらを参考にして、文章をご記入ください。";
        omakaseTip.appendChild(omakaseTipBtn);
        omakaseTip.appendChild(omakasePop);
        actions.appendChild(omakaseTip);
        actions.appendChild(omakaseBtn);
        sec.appendChild(actions);
      }
      const foot = document.createElement("div");
      foot.className = "easy-copy-field-foot";
      foot.appendChild(resetBtn);
      foot.appendChild(counter);
      box.appendChild(input);
      sec.appendChild(box);
      sec.appendChild(foot);

      wrap.appendChild(sec);
      growCopyField(input);
    });
    setupHubTips(wrap);

    if (active) {
      if (!copyListRenderKeepScroll) scrollCopyListPreview(sectionId, active);
      paintCopyFieldRing(active);
    }
  }

  function parkLogoCopyControls() {
    const home = document.querySelector('details.dash-block[data-step-id="logo-text"]');
    if (!home) return;
    document.querySelectorAll("[data-logo-copy-borrowed]").forEach(function (el) {
      home.appendChild(el);
    });
  }

  function mountLogoCopyControls(parent) {
    const home = document.querySelector('details.dash-block[data-step-id="logo-text"]');
    if (!home || !parent) return;
    const mode = home.querySelector(".logo-mode-fieldset");
    const text = home.querySelector('[data-logo-panel="text"]');
    const order = home.querySelector('[data-logo-panel="order"]');
    const image = home.querySelector('[data-logo-panel="image"]');
    [mode, text, image, order].forEach(function (el) {
      if (!el) return;
      el.setAttribute("data-logo-copy-borrowed", "1");
      parent.appendChild(el);
    });
    syncLogoModePanels();
  }

  function renderCopyListUi(opts) {
    const stepNow = getCurrentFlowStep();
    if (stepNow && stepNow.id === "easy-catch") {
      renderEasyCatchRest();
      return;
    }
    const host = document.getElementById("easy-copy-list-host");
    if (!host) return;
    const keepScroll = !!(opts && opts.keepScroll);
    copyListRenderKeepScroll = keepScroll;
    const scrollEl = keepScroll ? copyListDashScrollEl() : null;
    const savedY = scrollEl ? scrollEl.scrollTop : 0;
    ensureCopyListOrder();
    if (!store.copyFieldSource || typeof store.copyFieldSource !== "object") store.copyFieldSource = {};
    if (!store.copyFrameCandidates || typeof store.copyFrameCandidates !== "object") {
      store.copyFrameCandidates = {};
    }
    let open = copyListOpenState();
    /* 旧形式の open を新形式へ */
    if (open && !open.kind) {
      if (open.itemIndex != null) {
        open.kind = "item";
      } else {
        const sec0 = copyListSectionById(open.sectionId);
        open.kind = sec0 && sec0.kind === "pair" ? "section" : "item";
      }
      store.copyListOpen = open;
    }
    if (open && open.sectionId && !copySectionIsListed(copyListSectionById(open.sectionId))) {
      store.copyListOpen = null;
      open = null;
    }
    restoreCopyBorrowedControls();
    parkLogoCopyControls();
    host.innerHTML = "";
    if (store.blankCanvas && !(stepNow && stepNow.id === "easy-catch")) {
      const freeNote = document.createElement("p");
      freeNote.className = "easy-copy-free-note";
      freeNote.textContent = "基本のページをもとに、文章を書けます。";
      host.appendChild(freeNote);
    }
    const nameLine = document.createElement("label");
    nameLine.className = "easy-copy-name-line";
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.className = "easy-copy-name-input";
    nameInput.maxLength = 100;
    nameInput.setAttribute("aria-label", "ホームページタイトル");
    nameInput.value = homepageName();
    const nameWarn = document.createElement("p");
    nameWarn.className = "easy-copy-name-warn";
    nameWarn.textContent = "ホームページタイトルをご記入ください。入力しないと、先へ進めません。";
    const syncNameWarn = function () {
      nameWarn.hidden = !!String(nameInput.value || "").trim();
    };
    nameInput.addEventListener("input", function () {
      const next = String(nameInput.value || "").trim();
      setFieldValue("brand_name", nameInput.value);
      store.siteNameConfirmed = !!next && !isPlaceholderBrand(next);
      syncNameWarn();
      if (next) {
        const status = document.getElementById("wizard-status");
        if (status) status.textContent = "";
      }
      syncPreviewHeaderChrome();
      scheduleSave();
    });
    syncNameWarn();
    nameLine.appendChild(nameInput);
    host.appendChild(nameLine);
    host.appendChild(nameWarn);
    if (!open) appendCopyHubExtras(host, "name");
    const list = document.createElement("div");
    list.className = "easy-copy-list-wire";
    list.setAttribute("role", "list");

    ensureCopyListOrder().forEach(function (secId) {
      const sec = copyListSectionById(secId);
      if (!sec || !copySectionIsListed(sec)) return;
      const cell = document.createElement("div");
      cell.className = "easy-copy-list-cell layout-arrange-cell--structure";
      cell.setAttribute("data-copy-sec", sec.id);
      cell.setAttribute("role", "listitem");

      const sectionOpen = !!(open && open.sectionId === sec.id && open.kind === "section");
      const itemOpenHere = !!(open && open.sectionId === sec.id && open.kind === "item");
      if (open && open.sectionId !== sec.id) cell.hidden = true;

      /* —— 一覧の細い行 —— */
      const head = document.createElement("div");
      head.className = "easy-copy-list-head layout-closed-head--list";
      let handle = null;
      if (sec.id !== "logo") {
        handle = document.createElement("span");
        handle.className = "layout-arrange-handle";
        handle.textContent = "⋮⋮";
        handle.setAttribute("aria-label", "この段の順番を変えられます");
        setHoverTip(handle, "つかんだまま上下に動かすと、順番を変えられます");
        if (!open) bindCopyListDrag(handle, cell, sec.id);
        head.appendChild(handle);
      }
      const name = document.createElement("p");
      name.className = "easy-copy-list-name layout-arrange-name";
      name.textContent = copyListSectionRowLabel(sec);
      const secOpenBtn = document.createElement("button");
      secOpenBtn.type = "button";
      secOpenBtn.className = "layout-open-btn layout-section-open";
      secOpenBtn.textContent = "開く";
      secOpenBtn.hidden = !!(sectionOpen || itemOpenHere);
      secOpenBtn.setAttribute("aria-expanded", sectionOpen || itemOpenHere ? "true" : "false");
      secOpenBtn.addEventListener("click", function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        if (sec.id === "hero") {
          openCatchFromLayout(catchWordsAreOn() ? "write" : "ask");
          return;
        }
        if (sectionOpen || itemOpenHere) {
          if (itemOpenHere && sec.kind === "pair") {
            setCopyListOpen({ kind: "section", sectionId: sec.id });
            clearCopyFieldRing();
            renderCopyListUi({ keepScroll: true });
            scheduleSave();
            return;
          }
          clearEasyCopySoloHistory();
          setCopyListOpen(null);
          clearCopyFieldRing();
          renderCopyListUi({ keepScroll: true });
          scheduleSave();
          return;
        }
        if (sec.kind === "pair") {
          setCopyListOpen({ kind: "section", sectionId: sec.id });
          rememberEasyCopySoloOpen();
          scrollCopyListPreview(sec.id, null);
        } else {
          setCopyListOpen({ kind: "item", sectionId: sec.id, itemIndex: null });
          store.copyListFocusField = copyListDefaultFocus(sec, null);
          rememberEasyCopySoloOpen();
          scrollCopyListPreview(sec.id, store.copyListFocusField);
        }
        renderCopyListUi({ keepScroll: false });
        scheduleSave();
      });
      head.appendChild(name);
      head.appendChild(secOpenBtn);
      if (handle && (sectionOpen || itemOpenHere)) {
        /* ソロ時は掴みを出さない */
        handle.hidden = true;
      }
      cell.appendChild(head);

      const body = document.createElement("div");
      body.className = "easy-copy-list-body";

      if (sectionOpen && sec.kind === "pair") {
        /* —— 2階層：段の設定、その下に 1,2,3 —— */
        const settingFields = copySectionSettingFields(sec);
        if (sec.id === "accordions" || settingFields.length) {
          const settings = document.createElement("div");
          settings.className = "easy-copy-section-settings";
          if (sec.id === "accordions") appendAccordionModeChoice(settings);
          if (settingFields.length) {
            appendCopyListFieldUi(
              settings,
              settingFields,
              store.copyListFocusField || settingFields[0].key,
              sec.id
            );
          }
          body.appendChild(settings);
        }
        const tools = document.createElement("div");
        tools.className = "layout-frames-tools easy-copy-section-tools";
        const countCluster = document.createElement("span");
        countCluster.className = "layout-count-cluster";
        const countLead = document.createElement("span");
        countLead.className = "layout-count-lead";
        countLead.textContent = "枚数";
        const indices = copyListItemIndices(sec);
        const n = indices.length;
        const meta = COUNT_META[sec.countId] || { min: 1, max: 3 };
        const minus = document.createElement("button");
        minus.type = "button";
        minus.className = "layout-count-btn";
        minus.textContent = "−";
        minus.setAttribute("aria-label", "枚数を減らす");
        minus.disabled = n <= meta.min;
        const num = document.createElement("span");
        num.className = "layout-image-count-num";
        num.textContent = n + " / " + meta.max;
        const plus = document.createElement("button");
        plus.type = "button";
        plus.className = "layout-count-btn";
        plus.textContent = "＋";
        plus.setAttribute("aria-label", "枚数を増やす");
        plus.disabled = n >= meta.max;
        minus.addEventListener("click", function (ev) {
          ev.stopPropagation();
          adjustDraftCount(sec.countId, -1, null);
          const after = copyListCount(sec);
          if (after < 1) {
            setCopyListOpen(null);
            clearCopyFieldRing();
          }
          renderCopyListUi({ keepScroll: true });
          scheduleSave();
        });
        plus.addEventListener("click", function (ev) {
          ev.stopPropagation();
          if (sec.countId === "works-list") requestAddDraftCount(sec.countId, null, plus);
          else adjustDraftCount(sec.countId, 1, null);
          renderCopyListUi({ keepScroll: true });
          scheduleSave();
        });
        countCluster.appendChild(countLead);
        countCluster.appendChild(minus);
        countCluster.appendChild(num);
        countCluster.appendChild(plus);
        tools.appendChild(countCluster);

        if (ITEM_LAYOUT_IDS.indexOf(sec.countId) >= 0) {
          const layout = normalizeItemLayout(sec.countId);
          const gapNow = (layout && layout.gap) || "normal";
          const gapCluster = document.createElement("span");
          gapCluster.className = "layout-gap-cluster";
          const gapLead = document.createElement("span");
          gapLead.className = "layout-gap-lead";
          gapLead.textContent = "すき間";
          gapCluster.appendChild(gapLead);
          ITEM_GAP_STEPS.forEach(function (gap) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "layout-gap-btn" + (gap === gapNow ? " is-active" : "");
            btn.textContent = ITEM_GAP_LABELS[gap];
            btn.addEventListener("click", function (ev) {
              ev.stopPropagation();
              setItemGap(sec.countId, gap);
              renderCopyListUi({ keepScroll: true });
              scheduleSave();
            });
            gapCluster.appendChild(btn);
          });
          tools.appendChild(gapCluster);
        }
        body.appendChild(tools);

        indices.forEach(function (itemIndex) {
          const row = document.createElement("div");
          row.className = "easy-copy-list-row layout-photo-row layout-inner";
          row.setAttribute("data-copy-item", String(itemIndex));
          if (sec.countId === "works-list") row.setAttribute("data-item-id", "work_" + itemIndex);
          const line = document.createElement("div");
          line.className = "layout-closed-line";
          if (n >= 2) {
            const ih = document.createElement("span");
            ih.className = "layout-inner-handle";
            ih.textContent = "⋮⋮";
            ih.setAttribute("aria-label", "この枠の順番を変えられます");
            setHoverTip(ih, "押したまま上下に動かすと、順番を変えられます");
            line.appendChild(ih);
          }
          const label = document.createElement("p");
          label.className = "easy-copy-list-item-label layout-frame-name";
          label.textContent = copyListItemRowLabel(sec, itemIndex);
          const openBtn = document.createElement("button");
          openBtn.type = "button";
          openBtn.className = "layout-open-btn";
          openBtn.textContent = "開く";
          openBtn.addEventListener("click", function (ev) {
            ev.stopPropagation();
            setCopyListOpen({ kind: "item", sectionId: sec.id, itemIndex: itemIndex });
            store.copyListFocusField = copyListDefaultFocus(sec, itemIndex);
            rememberEasyCopySoloOpen();
            scrollCopyListPreview(sec.id, store.copyListFocusField);
            renderCopyListUi({ keepScroll: false });
            scheduleSave();
          });
          line.appendChild(label);
          line.appendChild(openBtn);
          row.appendChild(line);
          if (n >= 2) bindCopyListItemDrag(row, sec, itemIndex);
          body.appendChild(row);
        });
      } else if (itemOpenHere && sec.id === "logo") {
        head.hidden = true;
        const editor = document.createElement("div");
        editor.className = "easy-copy-list-editor-host";
        const wrap = document.createElement("div");
        wrap.className = "easy-copy-list-editor";
        const itemHead = document.createElement("div");
        itemHead.className = "easy-copy-item-head";
        const itemTitle = document.createElement("p");
        itemTitle.className = "easy-copy-item-title";
        itemTitle.textContent = "ロゴ";
        itemHead.appendChild(itemTitle);
        wrap.appendChild(itemHead);
        mountLogoCopyControls(wrap);
        appendCopyListOkFoot(wrap, function () {
          clearEasyCopySoloHistory();
          setCopyListOpen(null);
          clearCopyFieldRing();
          renderCopyListUi({ keepScroll: true });
          scheduleSave();
        });
        editor.appendChild(wrap);
        body.appendChild(editor);
      } else if (itemOpenHere) {
        /* —— 3階層：入力 —— */
        head.hidden = true;
        const editor = document.createElement("div");
        editor.className = "easy-copy-list-editor-host";
        editor.appendChild(buildCopyListEditor(sec, open.itemIndex));
        body.appendChild(editor);
      } else {
        /* 一覧時は body 空（開くは head 側） */
        body.hidden = true;
      }

      if (sectionOpen && sec.kind === "pair" && (sec.id === "values" || sec.id === "accordions" || sec.id === "works")) {
        appendCopyHubExtras(body, sec.id);
      }
      if (sectionOpen) {
        appendCopyListOkFoot(body, function () {
          clearEasyCopySoloHistory();
          setCopyListOpen(null);
          clearCopyFieldRing();
          renderCopyListUi({ keepScroll: true });
          scheduleSave();
        });
      }

      cell.appendChild(body);
      list.appendChild(cell);
    });

    if (!open) appendCopyFontFrame(host);
    host.appendChild(list);
    placeCopyFonts();
    syncEasyCopyListSolo();
    if (!open || open.kind !== "item") clearCopyFieldRing();
    updateWizardUi();
    if (keepScroll && scrollEl) {
      window.requestAnimationFrame(function () {
        scrollEl.scrollTop = savedY;
      });
    } else if (open) {
      const scroller = document.querySelector(".dash-body > .fill-form");
      if (scroller) scroller.scrollTop = 0;
    }
    scheduleHeroCopyFitCheck();
    if (!open) parkOpenCopyPreview._held = "";
    if (open) {
      window.requestAnimationFrame(function () {
        parkOpenCopyPreview();
      });
    }
  }

  let copyListDrag = null;

  function moveCopySectionNear(fromId, toId, place) {
    if (!fromId || !toId || fromId === toId || fromId === "logo" || toId === "logo") return false;
    const order = ensureCopyListOrder().slice();
    const from = order.indexOf(fromId);
    if (from < 0 || order.indexOf(toId) < 0) return false;
    order.splice(from, 1);
    let insert = order.indexOf(toId);
    if (place === "after") insert += 1;
    order.splice(insert, 0, fromId);
    const logoAt = order.indexOf("logo");
    if (logoAt > 0) {
      order.splice(logoAt, 1);
      order.unshift("logo");
    }
    store.copyListOrder = order;
    applyCopyListOrderToLayout();
    return true;
  }

  function bindCopyListDrag(handle, cell, secId) {
    handle.addEventListener("pointerdown", function (ev) {
      if (ev.button != null && ev.button !== 0) return;
      if (secId === "logo" || copyListOpenState()) return;
      ev.preventDefault();
      const host = document.getElementById("easy-copy-list-host");
      const list = host && host.querySelector(".easy-copy-list-wire");
      if (!host || !list) return;
      const originY = ev.clientY;
      let startY = ev.clientY;
      let changed = false;
      copyListDrag = { id: secId };
      cell.classList.add("is-dragging");
      const target = copySectionPreviewEl(secId);
      const edgeRows = Array.prototype.slice.call(list.querySelectorAll(":scope > .easy-copy-list-cell"));
      if (target) {
        centerPreviewBlock(target, rowListEdge(cell, edgeRows));
        markPreviewStick(target);
      }
      function onMove(ev2) {
        if (Math.abs(ev2.clientY - originY) <= 4) return;
        const y = clampDragClientY(cell, ev2.clientY, startY);
        cell.style.transform = "translateY(" + (y - startY) + "px)";
        for (let n = 0; n < 6; n += 1) {
          const hit = thirdSwapHit(cell, "easy-copy-list-cell");
          if (!hit || hit.other.getAttribute("data-copy-sec") === "logo") break;
          const beforeTop = cell.getBoundingClientRect().top;
          const toId = hit.other.getAttribute("data-copy-sec");
          if (!moveCopySectionNear(secId, toId, hit.place)) break;
          if (hit.place === "after") hit.other.after(cell);
          else hit.other.before(cell);
          startY = keepDragUnderPointer(cell, y, beforeTop, startY);
          changed = true;
        }
        if (target) slideAndFollowPreview(target, cell, ev2.clientY >= originY);
      }
      function onUp() {
        window.removeEventListener("pointermove", onMove, true);
        window.removeEventListener("pointerup", onUp, true);
        window.removeEventListener("pointercancel", onUp, true);
        cell.style.transform = "";
        cell.classList.remove("is-dragging");
        releasePreviewDragFollow();
        copyListDrag = null;
        if (changed) {
          renderCopyListUi();
          scheduleSave();
        }
      }
      window.addEventListener("pointermove", onMove, true);
      window.addEventListener("pointerup", onUp, true);
      window.addEventListener("pointercancel", onUp, true);
    });
  }

  function renderCopyOmakaseUi() {
    renderCopyListUi();
  }

  function loadPhotoCatalog() {
    if (photoCatalogCache && Array.isArray(photoCatalogCache.items)) {
      return Promise.resolve(photoCatalogCache);
    }
    return fetch("free-photo-gallery/catalog.json", { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("catalog " + res.status);
        return res.json();
      })
      .then(function (data) {
        photoCatalogCache = data || { items: [] };
        return photoCatalogCache;
      });
  }

  function collectImgOmakaseUsedIds(slots, exceptKey) {
    const used = [];
    const picks = store.imgOmakasePicks || {};
    const list = Array.isArray(slots) ? slots : IMG_OMAKASE_SLOTS;
    list.forEach(function (slot) {
      if (exceptKey && slot.key === exceptKey) return;
      const pick = picks[slot.key];
      if (pick && pick.id) used.push(pick.id);
    });
    return used;
  }

  function pickCatalogPhoto(items, preferShape, usedIds, opts) {
    const options = opts || {};
    const preferTrim = !!options.preferTrim;
    const list = Array.isArray(items) ? items.slice() : [];
    if (!list.length) return null;
    const unusedPrefer = list.filter(function (it) {
      return it && it.shape === preferShape && usedIds.indexOf(it.id) < 0;
    });
    const unusedAny = list.filter(function (it) {
      return it && usedIds.indexOf(it.id) < 0;
    });
    let pool = unusedPrefer.length
      ? unusedPrefer
      : unusedAny.length
        ? unusedAny
        : list.filter(function (it) {
            return it && it.shape === preferShape;
          });
    if (!pool.length) pool = list;
    if (preferTrim) {
      const withTrim = pool.filter(function (it) {
        return it && it.trimCardPath;
      });
      if (withTrim.length) pool = withTrim;
    }
    const finalPool = pool.length ? pool : list;
    return finalPool[Math.floor(Math.random() * finalPool.length)] || null;
  }

  function applyImgOmakasePickToPreview(slot, item) {
    if (!slot || !item) return;
    if (!store.imgOmakasePicks || typeof store.imgOmakasePicks !== "object") {
      store.imgOmakasePicks = {};
    }
    store.imgOmakasePicks[slot.key] = {
      id: item.id,
      path: item.path,
      trimCardPath: item.trimCardPath || null,
      shape: item.shape || "",
      scene: item.scene || "",
      sceneLabel: item.sceneLabel || ""
    };
    applyGalleryPickToSlot(slot.input, item);
  }

  function getImgSlotsForStep(stepId) {
    if (stepId === "hero-image") {
      return [{ key: "hero_image", input: "hero_image", label: "キャッチ", prefer: "wide" }];
    }
    if (stepId === "about-images") {
      seedItemOrder("about-photos");
      return (store.itemOrders["about-photos"] || []).map((slot) => ({
        key: slot,
        input: slot,
        label: "写真" + String(slot).replace("about_image_", ""),
        prefer: "square"
      }));
    }
    if (stepId === "works-images") {
      seedItemOrder("works-list");
      return (store.itemOrders["works-list"] || []).map((slot) => {
        const name = itemSlotImageName(slot);
        return {
          key: name,
          input: name,
          label: "カード" + String(slot).replace("work_", ""),
          prefer: "square"
        };
      });
    }
    return IMG_OMAKASE_SLOTS.slice();
  }

  function applyImgOmakaseFromCatalog(opts) {
    const options = opts || {};
    const onlyUnlocked = !!options.onlyUnlocked;
    const slots = Array.isArray(options.slots) ? options.slots : IMG_OMAKASE_SLOTS;
    if (!store.imgOmakaseLocks || typeof store.imgOmakaseLocks !== "object") {
      store.imgOmakaseLocks = {};
    }
    if (!store.imgOmakasePicks || typeof store.imgOmakasePicks !== "object") {
      store.imgOmakasePicks = {};
    }
    store.imgOmakaseSalt = (Number(store.imgOmakaseSalt) || 0) + 1;
    return loadPhotoCatalog().then(function (catalog) {
      const items = (catalog && catalog.items) || [];
      slots.forEach(function (slot) {
        if (onlyUnlocked && store.imgOmakaseLocks[slot.key]) return;
        const used = collectImgOmakaseUsedIds(slots, slot.key);
        const preferTrim = /^work_\d+_image$/.test(slot.input) || slot.key === "works";
        const pick = pickCatalogPhoto(items, slot.prefer, used, { preferTrim: preferTrim });
        if (pick) applyImgOmakasePickToPreview(slot, pick);
      });
    });
  }

  function ensureImgOmakaseReady(opts) {
    const options = opts || {};
    const slots = Array.isArray(options.slots) ? options.slots : IMG_OMAKASE_SLOTS;
    const hasAll = slots.every(function (slot) {
      return !!(store.imgOmakasePicks && store.imgOmakasePicks[slot.key] && store.imgOmakasePicks[slot.key].id);
    });
    if (hasAll) {
      slots.forEach(function (slot) {
        const pick = store.imgOmakasePicks[slot.key];
        if (pick) applyGalleryPickToSlot(slot.input, pick);
      });
      return Promise.resolve();
    }
    return applyImgOmakaseFromCatalog({ onlyUnlocked: false, slots: slots });
  }

  function renderImgOmakaseUi(opts) {
    const options = opts || {};
    const host =
      options.host ||
      document.getElementById("easy-img-omakase-list");
    const slots = Array.isArray(options.slots) ? options.slots : IMG_OMAKASE_SLOTS;
    if (!host) return;
    if (!store.imgOmakaseLocks || typeof store.imgOmakaseLocks !== "object") {
      store.imgOmakaseLocks = {};
    }
    if (!store.imgOmakasePicks || typeof store.imgOmakasePicks !== "object") {
      store.imgOmakasePicks = {};
    }
    host.innerHTML = slots
      .map(function (slot) {
        const locked = !!store.imgOmakaseLocks[slot.key];
        const pick = store.imgOmakasePicks[slot.key];
        const thumb = pick && pick.path ? "free-photo-gallery/" + String(pick.path).replace(/^\/+/, "") : "";
        const meta = pick
          ? (pick.sceneLabel || pick.scene || "写真") + (pick.shape === "wide" ? "・全幅寄り" : "")
          : "候補を用意しています";
        return (
          '<div class="easy-img-omakase-row' +
          (locked ? " is-locked" : "") +
          '" data-img-omakase-slot="' +
          slot.key +
          '">' +
          '<div class="easy-img-omakase-thumb">' +
          (thumb
            ? '<img src="' +
              escapeHtml(thumb) +
              '" alt="" loading="lazy" decoding="async">'
            : "") +
          "</div>" +
          '<div class="easy-img-omakase-main">' +
          '<p class="easy-img-omakase-label">' +
          escapeHtml(slot.label) +
          "</p>" +
          '<p class="easy-img-omakase-text">' +
          escapeHtml(meta) +
          "</p>" +
          "</div>" +
          '<button type="button" class="easy-img-omakase-lock has-hover-tip' +
          (locked ? " is-on" : "") +
          '" data-img-omakase-lock="' +
          slot.key +
          '" aria-pressed="' +
          (locked ? "true" : "false") +
          '" data-tip="' +
          (locked ? "固定をはずす" : "この写真を残す（もう一度では変わらない）") +
          '">' +
          (locked ? "はずす" : "残す") +
          "</button>" +
          "</div>"
        );
      })
      .join("");
    host.querySelectorAll("[data-img-omakase-lock]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const key = btn.getAttribute("data-img-omakase-lock");
        if (!key) return;
        store.imgOmakaseLocks[key] = !store.imgOmakaseLocks[key];
        renderImgOmakaseUi(options);
        scheduleSave();
      });
    });
    updateWizardUi();
  }

  function syncHubImagePathPanels(stepId) {
    if (HUB_IMG_STEP_IDS.indexOf(stepId) < 0) return;
    if (!store.hubImgPathMode || typeof store.hubImgPathMode !== "object") {
      store.hubImgPathMode = {};
    }
    const mode = store.hubImgPathMode[stepId] || null;
    const pathRoot = document.querySelector('[data-hub-img-path="' + stepId + '"]');
    const omaRoot = document.querySelector('[data-hub-img-omakase="' + stepId + '"]');
    const selfRoot = document.querySelector('[data-hub-img-self="' + stepId + '"]');
    if (pathRoot) {
      pathRoot.querySelectorAll('input[type="radio"]').forEach(function (r) {
        r.checked = !!(mode && r.value === mode);
      });
    }
    if (omaRoot) omaRoot.hidden = mode !== "omakase";
    if (selfRoot) selfRoot.hidden = mode !== "self";
    if (mode === "omakase") {
      const slots = getImgSlotsForStep(stepId);
      const list = document.querySelector('[data-hub-img-omakase-list="' + stepId + '"]');
      ensureImgOmakaseReady({ slots: slots }).then(function () {
        renderImgOmakaseUi({ host: list, slots: slots });
      });
    }
    updateWizardUi();
  }

  function setupHubImagePathUi() {
    HUB_IMG_STEP_IDS.forEach(function (stepId) {
      const pathRoot = document.querySelector('[data-hub-img-path="' + stepId + '"]');
      if (pathRoot && !pathRoot.dataset.hubImgPathBound) {
        pathRoot.dataset.hubImgPathBound = "1";
        pathRoot.querySelectorAll('input[type="radio"]').forEach(function (input) {
          bindChoiceReselect(input, function () {
            if (!store.hubImgPathMode || typeof store.hubImgPathMode !== "object") {
              store.hubImgPathMode = {};
            }
            store.hubImgPathMode[stepId] = input.value === "omakase" ? "omakase" : "self";
            scheduleSave();
            syncHubImagePathPanels(stepId);
          });
        });
      }
      const reroll = document.querySelector('[data-hub-img-omakase-reroll="' + stepId + '"]');
      if (reroll && !reroll.dataset.bound) {
        reroll.dataset.bound = "1";
        reroll.addEventListener("click", function () {
          const slots = getImgSlotsForStep(stepId);
          const list = document.querySelector('[data-hub-img-omakase-list="' + stepId + '"]');
          reroll.disabled = true;
          applyImgOmakaseFromCatalog({ onlyUnlocked: true, slots: slots })
            .then(function () {
              renderImgOmakaseUi({ host: list, slots: slots });
              scheduleSave();
            })
            .then(
              function () {
                reroll.disabled = false;
              },
              function () {
                reroll.disabled = false;
              }
            );
        });
      }
    });
  }

  /** 同じ側をもう一度押しても進む。change だけだと印が残っていると無視される */
  function bindChoiceReselect(input, apply) {
    let busy = false;
    function go() {
      if (busy || !input.checked) return;
      busy = true;
      apply();
      window.setTimeout(function () {
        busy = false;
      }, 0);
    }
    input.addEventListener("click", go);
    input.addEventListener("change", go);
    const label = input.closest("label");
    if (label) {
      label.addEventListener("click", function () {
        if (input.checked) go();
      });
    }
  }

  function setupCopyFlowUi() {
    const pathRoot = document.querySelector('.dash-block[data-step-id="easy-copy-path"]');
    if (pathRoot && !pathRoot.dataset.copyPathBound) {
      pathRoot.dataset.copyPathBound = "1";
      pathRoot.querySelectorAll('input[name="easy_copy_path"]').forEach(function (input) {
        bindChoiceReselect(input, function () {
          store.copyPathMode = input.value === "omakase" ? "omakase" : "keyword";
          if (store.copyPathMode === "omakase" && !store.copyPresetId) store.copyPresetId = "omakase-flow-v1";
          store.confirmed["easy-copy-path"] = true;
          scheduleSave();
          const flow = getFlowSteps();
          const next = flow.findIndex(function (s) { return s.id === "easy-copy-path"; });
          if (next >= 0 && next < flow.length - 1) runWithCrossShutter(function () { showWizardStep(next + 1); });
          else showWizardStep(0);
        });
      });
    }
    const imgPathRoot = document.querySelector('.dash-block[data-step-id="easy-img-path"]');
    if (imgPathRoot && !imgPathRoot.dataset.imgPathBound) {
      imgPathRoot.dataset.imgPathBound = "1";
      imgPathRoot.querySelectorAll('input[name="easy_img_path"]').forEach(function (input) {
        bindChoiceReselect(input, function () {
          const omakase = input.value === "omakase";
          store.imgPathMode = omakase ? "omakase" : "self";
          store.confirmed["easy-img-path"] = true;
          const goNext = function () {
            scheduleSave();
            const flow = getFlowSteps();
            const at = flow.findIndex(function (s) { return s.id === "easy-img-path"; });
            if (at >= 0 && at < flow.length - 1) runWithCrossShutter(function () { showWizardStep(at + 1); });
            else showWizardStep(Math.max(0, at));
          };
          if (!omakase) {
            goNext();
            return;
          }
          applyImgOmakaseFromCatalog({ onlyUnlocked: false, slots: collectVisibleImageSlots() }).then(goNext, goNext);
        });
      });
    }
    const imgOmakaseReroll = document.getElementById("easy-img-omakase-reroll");
    if (imgOmakaseReroll && !imgOmakaseReroll.dataset.bound) {
      imgOmakaseReroll.dataset.bound = "1";
      imgOmakaseReroll.addEventListener("click", function () {
        imgOmakaseReroll.disabled = true;
        applyImgOmakaseFromCatalog({ onlyUnlocked: true })
          .then(function () {
            renderImgOmakaseUi();
            scheduleSave();
          })
          .then(
            function () {
              imgOmakaseReroll.disabled = false;
            },
            function () {
              imgOmakaseReroll.disabled = false;
            }
          );
      });
    }
    const reroll = document.getElementById("easy-copy-frame-reroll");
    if (reroll && !reroll.dataset.bound) {
      reroll.dataset.bound = "1";
      reroll.addEventListener("click", function () {
        const secId = currentCopyFrameId();
        const fields = visibleCopyFields(secId);
        if (!store.copyFieldSource || typeof store.copyFieldSource !== "object") store.copyFieldSource = {};
        const jobs = fields.filter(function (field) {
          return store.copyFieldSource[field.key] !== "custom";
        });
        jobs.forEach(function (field) {
          store.copyFrameCandidates[field.key] = null;
        });
        Promise.all(
          jobs.map(function (field) {
            return ensureCopyFieldCandidates(secId, field.key, true).then(function (list) {
              if (store.copyFieldSource[field.key] === "cand" && list && list[0]) {
                applyCopyTextToField(field.key, list[0].text);
              }
            });
          })
        ).then(function () {
          renderCopyFrameUi();
          scheduleSave();
        });
      });
    }
  }

  function rebuildSampleSectionCandidates(secId) {
    const dict = window.Sample1manEasyCopy;
    if (!dict || typeof dict.generateSectionFive !== "function") {
      store.sampleSectionCandidates[secId] = [];
      return;
    }
    const basics = readEasyBasicsFromUi();
    store.sampleSectionCandidates[secId] = dict.generateSectionFive({
      sectionId: secId,
      brandName: basics.brand,
      mood: (store.easyAnswers && store.easyAnswers.mood) || "calm",
      focus: (store.easyAnswers && store.easyAnswers.focus) || "quality",
      guest: (store.easyAnswers && store.easyAnswers.guest) || "first"
    });
    store.sampleSectionSelected[secId] = null;
    const stepId = Object.keys(SAMPLE_SEC_ID_FROM_STEP).find(function (k) {
      return SAMPLE_SEC_ID_FROM_STEP[k] === secId;
    });
    if (stepId) store.confirmed[stepId] = false;
    renderSampleSectionList(secId);
  }

  function applySampleSectionCandidate(secId, cand) {
    if (!cand) return;
    applyEasyBasicsToForm();
    const brand = readEasyBasicsFromUi().brand || fieldValue("brand_name") || "店名";
    const dict = window.Sample1manEasyCopy;
    const section = dict && dict.SECTIONS ? dict.SECTIONS.find(function (s) { return s.id === secId; }) : null;
    const map = section && typeof section.apply === "function" ? section.apply(cand.text, brand) : null;
    if (map) {
      Object.keys(map).forEach(function (k) {
        if (map[k] != null && map[k] !== "") setFieldValue(k, map[k]);
      });
    }
    applyAllConfirmed();
    syncPreviewHeaderChrome();
  }

  function renderSampleSectionList(secId) {
    const host = document.getElementById("easy-sec-" + secId + "-list");
    if (!host) return;
    const list = store.sampleSectionCandidates[secId] || [];
    host.innerHTML = list
      .map(function (c, i) {
        return (
          '<label class="easy-copy-card"><input type="radio" name="easy_sec_' +
          secId +
          '" value="' +
          i +
          '"><span class="easy-copy-card-inner"><span class="easy-copy-num">' +
          (i + 1) +
          '</span><span class="easy-copy-text">' +
          escapeHtml(c.text) +
          "</span></span></label>"
        );
      })
      .join("");
    host.querySelectorAll('input[name="easy_sec_' + secId + '"]').forEach(function (input) {
      bindChoiceReselect(input, function () {
        const idx = Number(input.value);
        const cand = store.sampleSectionCandidates[secId][idx];
        if (!cand) return;
        store.sampleSectionSelected[secId] = idx;
        applySampleSectionCandidate(secId, cand);
        const stepId = Object.keys(SAMPLE_SEC_ID_FROM_STEP).find(function (k) {
          return SAMPLE_SEC_ID_FROM_STEP[k] === secId;
        });
        if (stepId) store.confirmed[stepId] = true;
        scheduleSave();
        const flow = getFlowSteps();
        const cur = flow.findIndex(function (s) { return s.id === stepId; });
        if (cur >= 0 && cur < flow.length - 1) runWithCrossShutter(function () { showWizardStep(cur + 1); });
      });
    });
    if (store.sampleSectionSelected[secId] != null) {
      const radio = host.querySelector('input[value="' + store.sampleSectionSelected[secId] + '"]');
      if (radio) radio.checked = true;
    }
  }

  function renderEasyImageWireList() {
    const stage = document.querySelector(".sample-img-wire-stage");
    const list = document.querySelector(".sample-img-wire-list");
    if (!stage || !list) return;
    const slots = collectVisibleImageSlots();
    stage.innerHTML = slots
      .map(function (slot, i) {
        return (
          '<button type="button" class="sample-wire-slot' +
          (i === 0 ? " is-active" : "") +
          '" data-wire-slot="' +
          slot.key +
          '">' +
          escapeHtml(slot.label) +
          "</button>"
        );
      })
      .join("");
    list.innerHTML = slots
      .map(function (slot, i) {
        return (
          '<div class="easy-img-panel' +
          (i === 0 ? " is-current" : "") +
          '" data-easy-slot="' +
          slot.key +
          '"><p class="easy-img-status" id="easy-img-status-' +
          slot.key +
          '">まだ選んでいません</p><button type="button" class="gct-btn gct-btn-primary" data-easy-pick="' +
          slot.input +
          '">' +
          escapeHtml(slot.label) +
          'を選ぶ</button><button type="button" class="gct-btn" data-easy-gallery="' +
          slot.input +
          '">ギャラリーから選ぶ</button></div>'
        );
      })
      .join("");
    if (slots[0]) store.sampleWireSlot = slots[0].key;
    setupEasyImagePickers();
    setupSampleWireSlots();
    syncEasyImageStatuses();
    const photo1Slot = document.getElementById("easy-img-photo1-slot");
    if (photo1Slot) photo1Slot.remove();
  }

  function setupSampleWireSlots() {
    const rootWire = document.querySelector(".sample-img-wire-layout");
    if (!rootWire || rootWire.dataset.bound) return;
    rootWire.dataset.bound = "1";
    rootWire.addEventListener("click", function (ev) {
      const btn = ev.target.closest("[data-wire-slot]");
      if (!btn || !rootWire.contains(btn)) return;
      const slot = btn.getAttribute("data-wire-slot");
      store.sampleWireSlot = slot;
      rootWire.querySelectorAll("[data-wire-slot]").forEach(function (b) {
        b.classList.toggle("is-active", b === btn);
      });
      document.querySelectorAll('.dash-block[data-step-id="easy-img-wire"] [data-easy-slot]').forEach(function (p) {
        p.classList.toggle("is-current", p.getAttribute("data-easy-slot") === slot);
      });
      const mapped = wireSlotBlockAndItem(slot);
      if (mapped && (mapped.blockId === "photos" || mapped.blockId === "works")) {
        shiftPhotoListToAnchor(mapped.blockId, mapped.slot);
      } else if (mapped && mapped.blockId === "hero") {
        focusPreviewBlock("hero");
      }
    });
  }

  function startSampleFlowAfterEntry() {
    store.blankCanvas = false;
    document.body.classList.remove("is-blank-canvas");
    store.easyFlowActive = true;
    store.entryBranch = "sample";
    store.wizardStepIndex = 0;
    store.sampleSectionCandidates = {};
    store.sampleSectionSelected = {};
    store.copyPathMode = null;
    store.imgPathMode = null;
    store.hubImgPathMode = {};
    store.imgOmakaseLocks = {};
    store.imgOmakaseSkipConfirm = false;
    store.imgOmakasePicks = {};
    store.imgOmakaseSalt = 0;
    store.copyDirIds = [];
    store.copyDirForbid = [];
    store.copyFieldSource = {};
    store.copyFieldNow = {};
    store.copyHeroOnPhoto = null;
    store.copyScreenReturn = null;
    store.easyBasicsSeed = null;
    store.easyBasicsHints = null;
    store.easyBasicsApplied = false;
    store.easyBrandHint = "";
    store.copyPresetId = null;
    store.copyOmakaseAxes = null;
    store.copyOmakaseLocks = {};
    store.copyOmakaseSalt = 0;
    store.copyFrameIndex = 0;
    store.copyFramePoolIndex = {};
    store.copyFrameCandidates = {};
    store.copyFrameSelected = {};
    store.copyFrameNow = {};
    store.easyAnswers = { mood: "calm", focus: "quality", guest: "first" };
    if (window.Sample1manCopyDict && typeof window.Sample1manCopyDict.resetSessionUsedParts === "function") {
      window.Sample1manCopyDict.resetSessionUsedParts();
    }
    prepareEasyFixedImageCounts();
    fillEasyBasicsFromFields();
    setSampleFlowPreviewHidden(false);
    hideEntryGate();
    if (typeof window.setPreviewWidthStepById === "function") {
      window.setPreviewWidthStepById("desktop");
    }
    showWizardStep(0);
    if (store.sampleFlowImagePaths) applyDraftImagePaths(store.sampleFlowImagePaths);
    applyHeroTextOverlay();
    const status = document.getElementById("wizard-status");
    if (status) status.textContent = "文章の決め方を選んでください。";
    scheduleSave();
  }

  function incomingSushiId() {
    if (store.pendingSushi && store.pendingSushi.sample && store.pendingSushi.sample.id) {
      return String(store.pendingSushi.sample.id);
    }
    return String(store.sushiSampleId || "");
  }

  function shouldResumeSampleFlow() {
    return !!(
      store.sampleFlowEntered &&
      store.sampleFlowAppliedId &&
      incomingSushiId() &&
      incomingSushiId() === String(store.sampleFlowAppliedId)
    );
  }

  function resumeSampleFlowAfterColor(colorVal) {
    let mood = store.chosenPresetKey;
    if (colorVal === "keep") mood = store.sampleOriginalPreset || store.chosenPresetKey;
    else if (colorVal && PRESETS[colorVal]) mood = colorVal;
    if (mood && PRESETS[mood]) {
      applyPresetByKey(mood);
      confirmAllColorStepsFromPreset();
      store.chosenPresetKey = mood;
    }
    store.pendingSushi = null;
    store.entryBranch = "sample";
    store.easyFlowActive = true;
    store.intakeDone = true;
    store.confirmed.purpose = true;
    store.confirmed.layout = true;
    store.confirmed.guide = true;
    store.siteColorMode = "easy";
    store.uiMode = "guided";
    if (store.hubEntrySource !== "sample-done") store.hubEntrySource = "sample";
    applyUiMode();
    syncSiteColorModeUi();
    hideEntryGate();
    const flow = getFlowSteps();
    let idx = store.wizardStepIndex || 0;
    if (idx < 0) idx = 0;
    if (flow.length && idx > flow.length - 1) idx = flow.length - 1;
    showWizardStep(flow.length ? idx : 0);
    scheduleSave();
  }

  function entryPurposeKey(gate) {
    if (!gate) return "";
    const purposeEl = gate.querySelector('input[name="entry_purpose"]:checked');
    if (!purposeEl || !PURPOSE_PACKS[purposeEl.value]) return "";
    return purposeEl.value;
  }

  async function warmSampleEntryDraft() {
    const gate = document.getElementById("entry-gate");
    if (!gate) return false;
    if (!entryPurposeKey(gate)) return false;
    if (shouldResumeSampleFlow()) return true;
    if (store.pendingSushi && store.pendingSushi.draft) return true;
    if (!(store.sushiSampleId && window.SushiBelt && window.SushiBelt.loadManifest)) return false;
    try {
      const man = await window.SushiBelt.loadManifest();
      const sample = (man.samples || []).find(function (s) {
        return String(s.id) === String(store.sushiSampleId);
      });
      if (sample) {
        const res = await fetch("sushi-samples/" + sample.draftPath + "?v=color-apply-v3");
        const draft = await res.json();
        store.pendingSushi = { sample: sample, draft: draft };
      }
    } catch (e) {
      return false;
    }
    return !!(store.pendingSushi && store.pendingSushi.draft);
  }

  function paintEasyColorBars() {
    const row = document.getElementById("entry-sample-color-row");
    if (!row) return;
    row.querySelectorAll(".entry-color-bars").forEach(function (bars) {
      const label = bars.closest("label");
      const input = label && label.querySelector('input[name="entry_sample_color"]');
      const preset = input && PRESETS[input.value];
      if (!preset) return;
      const keys = ["pageBg", "chromeBg", "accent"];
      const marks = bars.querySelectorAll("i");
      keys.forEach(function (key, i) {
        if (marks[i] && preset[key]) marks[i].style.background = preset[key];
      });
    });
  }

  function applyEasyColorChoice() {
    const colorEl = document.querySelector('input[name="entry_sample_color"]:checked');
    const colorVal = colorEl ? colorEl.value : "keep";
    let mood = store.sampleOriginalPreset || store.chosenPresetKey || "clinic";
    if (colorVal !== "keep" && PRESETS[colorVal]) mood = colorVal;
    if (mood && PRESETS[mood]) {
      applyPresetByKey(mood);
      confirmAllColorStepsFromPreset();
      store.chosenPresetKey = mood;
    }
  }

  function applyPurposeSectionNames(purposeKey) {
    const pack = PURPOSE_PACKS[purposeKey];
    if (!pack || !pack.fields) return;
    store.sitePurpose = purposeKey;
    const purposeRadio =
      form.querySelector('input[name="site_purpose"][value="' + purposeKey + '"]') ||
      document.querySelector('input[name="site_purpose"][value="' + purposeKey + '"]');
    if (purposeRadio) purposeRadio.checked = true;
    ["about_section_name", "works_section_name"].forEach(function (name) {
      if (String(fieldValue(name) || "").trim()) return;
      if (pack.fields[name]) setFieldValue(name, pack.fields[name]);
    });
    ["about-text", "works-text"].forEach(function (stepId) {
      if (store.confirmed[stepId] || store.snapshots[stepId]) {
        store.snapshots[stepId] = captureStepSnapshot(stepId, formToObject({ includeHidden: true }));
      }
    });
    applyAllConfirmed();
    syncPreviewHeaderChrome();
  }

  async function enterSampleAfterPurpose() {
    store.blankCanvas = false;
    document.body.classList.remove("is-blank-canvas");
    const gate = document.getElementById("entry-gate");
    if (!gate) return;
    const purposeKey = entryPurposeKey(gate);
    if (!purposeKey) return;
    if (shouldResumeSampleFlow()) {
      applyPurposeSectionNames(purposeKey);
      if (window.SushiBelt) window.SushiBelt.unmount();
      resumeSampleFlowAfterColor("keep");
      return;
    }
    if (!(await warmSampleEntryDraft())) return;
    const draft = store.pendingSushi.draft;
    const layout = draft.layoutPattern === "b" || draft.layoutPattern === "c" ? draft.layoutPattern : "a";
    const moodFromDraft = draft.chosenPresetKey && PRESETS[draft.chosenPresetKey] ? draft.chosenPresetKey : "clinic";
    applyIntakeSelections(purposeKey, "sample", moodFromDraft, layout);
    store.entryBranch = "sample";
    store.easyFlowActive = true;
    store.hubEntrySource = "sample";
    applySushiSampleDraft(draft);
    applyPurposeSectionNames(purposeKey);
    if (store.pendingSushi && store.pendingSushi.sample && store.pendingSushi.sample.brand) {
      store.sushiSampleBrand = store.pendingSushi.sample.brand;
    }
    store.pendingSushi = null;
    if (window.SushiBelt) window.SushiBelt.unmount();
    store.sampleOriginalPreset = moodFromDraft;
    store.sampleFlowAppliedId = String(store.sushiSampleId || "");
    store.sampleFlowEntered = true;
    const keep = document.querySelector('input[name="entry_sample_color"][value="keep"]');
    if (keep) keep.checked = true;
    startSampleFlowAfterEntry();
  }

  async function finishSampleEntryFromGate() {
    const gate = document.getElementById("entry-gate");
    if (!gate) return;
    const purposeKey = entryPurposeKey(gate);
    if (!purposeKey) return;
    const colorElEarly = gate.querySelector('input[name="entry_sample_color"]:checked');
    const colorValEarly = colorElEarly ? colorElEarly.value : "keep";
    if (shouldResumeSampleFlow()) {
      if (window.SushiBelt) window.SushiBelt.unmount();
      resumeSampleFlowAfterColor(colorValEarly);
      return;
    }
    if (!(await warmSampleEntryDraft())) return;
    const colorEl = gate.querySelector('input[name="entry_sample_color"]:checked');
    const colorVal = colorEl ? colorEl.value : "keep";
    const draft = store.pendingSushi.draft;
    const layout = draft.layoutPattern === "b" || draft.layoutPattern === "c" ? draft.layoutPattern : "a";
    const moodFromDraft = draft.chosenPresetKey && PRESETS[draft.chosenPresetKey] ? draft.chosenPresetKey : "clinic";
    const mood = colorVal === "keep" ? moodFromDraft : colorVal;

    applyIntakeSelections(purposeKey, "sample", mood, layout);
    /* draft 適用前に本線フラグを立て、siteColorMode:detail の持ち越しを防ぐ */
    store.entryBranch = "sample";
    store.easyFlowActive = true;
    store.hubEntrySource = "sample";
    applySushiSampleDraft(draft);
    applyPurposeSectionNames(purposeKey);
    if (colorVal !== "keep" && PRESETS[colorVal]) {
      applyPresetByKey(colorVal);
      confirmAllColorStepsFromPreset();
    }
    store.pendingSushi = null;
    if (window.SushiBelt) window.SushiBelt.unmount();
    store.sampleOriginalPreset = moodFromDraft;
    store.sampleFlowAppliedId = String(store.sushiSampleId || "");
    store.sampleFlowEntered = true;
    startSampleFlowAfterEntry();
  }


  function clearBlankCanvasFields() {
    [
      "brand_name", "hero_title", "hero_lead_1", "hero_lead_2", "hero_lead_3",
      "value_1_title", "value_1_text", "value_2_title", "value_2_text", "value_3_title", "value_3_text",
      "about_section_name", "about_heading", "about_name", "about_lead",
      "acc_1_title", "acc_1_body", "acc_2_title", "acc_2_body", "acc_3_title", "acc_3_body",
      "works_section_name", "works_heading", "works_lead",
      "work_1_title", "work_1_text", "work_2_title", "work_2_text", "work_3_title", "work_3_text",
      "work_1_url", "work_1_link_label", "work_2_url", "work_2_link_label", "work_3_url", "work_3_link_label",
      "hours_text", "access_text", "address_text",
      "contact_label", "contact_section_name", "contact_note_1", "contact_note_2", "contact_email",
      "announce_text", "announce_label", "announce_url", "extra_notes"
    ].forEach(function (name) {
      setFieldValue(name, "");
      const el = form.elements.namedItem(name);
      if (el && el.setAttribute) el.setAttribute("placeholder", "");
    });
  }

  function startBlankEasyFlow(purposeKey) {
    store.blankCanvas = true;
    store.entryBranch = "detail";
    store.hubEntrySource = null;
    store.sampleFlowEntered = false;
    store.sampleFlowAppliedId = null;
    store.sushiSampleId = null;
    store.sushiSampleKey = null;
    store.sushiSampleBrand = "";
    store.sushiSampleBrandLookup = false;
    store.sushiSampleBrand = "";
    store.pendingSushi = null;
    store.sampleFinishNoBack = false;
    store.sampleKeptImagePaths = {};
    store.sampleCopyBaseline = null;
    store.layoutBlockOff = {};
    store.siteNameConfirmed = false;
    store.copyPathMode = null;
    store.heroTextOnPhoto = false;
    store.announceLinkOn = false;
    store.workLinkOn = {};
    store.draftExtras = { hours: false, access: false, address: false, announce: false };

    const purpose = PURPOSE_PACKS[purposeKey] ? purposeKey : "shop";
    const purposeRadio =
      form.querySelector('input[name="site_purpose"][value="' + purpose + '"]') ||
      document.querySelector('input[name="site_purpose"][value="' + purpose + '"]');
    if (purposeRadio) purposeRadio.checked = true;
    applySitePurpose(purpose);
    store.confirmed.purpose = true;
    store.snapshots.purpose = captureStepSnapshot("purpose");

    store.layoutPattern = "a";
    store.layoutOrder = LAYOUT_DEFAULT_ORDER.slice();
    applyLayoutPattern("a", { silent: true });
    store.confirmed.layout = true;
    store.snapshots.layout = captureStepSnapshot("layout");
    store.layoutSelected = true;

    store.uiMode = "guided";
    const modeRadio = form.querySelector('input[name="ui_mode"][value="guided"]');
    if (modeRadio) modeRadio.checked = true;
    store.siteColorMode = "easy";
    store.easyFlowActive = true;
    applyUiMode();
    syncSiteColorModeUi();
    store.confirmed.guide = true;
    store.snapshots.guide = captureStepSnapshot("guide");

    applyBlankCanvasColors();
    store.sampleOriginalPreset = "blank";
    store.chosenPresetKey = "blank";
    const keep = document.querySelector('input[name="entry_sample_color"][value="keep"]');
    if (keep) keep.checked = true;

    clearBlankCanvasFields();
    LIVE_IMAGE_INPUT_NAMES.forEach(function (name) {
      if (imageUrls[name]) {
        try { URL.revokeObjectURL(imageUrls[name]); } catch (e) { /* ignore */ }
        delete imageUrls[name];
      }
      const input = form.elements.namedItem(name);
      if (input) input.value = "";
    });
    store.heroImageOff = true;
    ["hero-text", "values-text", "about-text", "works-text", "hours-text", "access-text", "address-text", "contact-text", "hero-image", "about-images", "works-images", "logo-text", "announce-text"].concat(EASY_FLOW_STEP_IDS).forEach(function (id) {
      store.confirmed[id] = false;
      delete store.snapshots[id];
    });

    store.wizardStepIndex = 0;
    store.sampleSectionCandidates = {};
    store.sampleSectionSelected = {};
    store.imgPathMode = null;
    store.hubImgPathMode = {};
    store.imgOmakaseLocks = {};
    store.imgOmakaseSkipConfirm = false;
    store.imgOmakasePicks = {};
    store.imgOmakaseSalt = 0;
    store.copyDirIds = [];
    store.copyDirForbid = [];
    store.copyFieldSource = {};
    store.copyFieldNow = {};
    store.copyHeroOnPhoto = null;
    store.copyScreenReturn = null;
    store.easyBasicsSeed = null;
    store.easyBasicsHints = null;
    store.easyBasicsApplied = false;
    store.easyBrandHint = "";
    store.copyPresetId = null;
    store.copyOmakaseAxes = null;
    store.copyOmakaseLocks = {};
    store.copyOmakaseSalt = 0;
    store.copyFrameIndex = 0;
    store.copyFramePoolIndex = {};
    store.copyFrameCandidates = {};
    store.copyFrameSelected = {};
    store.copyFrameNow = {};
    store.easyAnswers = { mood: "calm", focus: "quality", guest: "first" };
    if (window.Sample1manCopyDict && typeof window.Sample1manCopyDict.resetSessionUsedParts === "function") {
      window.Sample1manCopyDict.resetSessionUsedParts();
    }
    prepareEasyFixedImageCounts();
    applyHeroImageOffState();
    setSampleFlowPreviewHidden(false);
    hideEntryGate();
    if (typeof window.setPreviewWidthStepById === "function") {
      window.setPreviewWidthStepById("desktop");
    }
    showWizardStep(0);
    applyAllConfirmed();
    const status = document.getElementById("wizard-status");
    if (status) status.textContent = "";
    scheduleSave();
  }

  function finishDetailEntryFromGate() {
    const gate = document.getElementById("entry-gate");
    if (!gate) return;
    const purposeKey = entryPurposeKey(gate);
    if (!purposeKey) return;
    if (window.SushiBelt) window.SushiBelt.unmount();
    startBlankEasyFlow(purposeKey);
  }

  function finishEasyEntryFromGate() {
    const gate = document.getElementById("entry-gate");
    if (!gate) return;
    const purposeKey = entryPurposeKey(gate);
    const layoutEl = gate.querySelector('input[name="entry_layout"]:checked');
    const colorEl = gate.querySelector('input[name="entry_color"]:checked');
    if (!purposeKey) return;
    if (!layoutEl || (layoutEl.value !== "a" && layoutEl.value !== "b" && layoutEl.value !== "c")) return;
    if (!colorEl || EASY_PRESET_KEYS.indexOf(colorEl.value) < 0) return;
    hideEntryGate();
    applyIntakeSelections(purposeKey, "easy", colorEl.value, layoutEl.value);
  }

  function restoreSaveChoiceAfterFolderCancel(gate, prevMode) {
    if (!gate) return;
    if (prevMode === "folder" && store.folderDirHandle) {
      store.saveMode = "folder";
      const folder = gate.querySelector('input[name="entry_save_mode"][value="folder"]');
      if (folder) folder.checked = true;
      return;
    }
    if (prevMode === "browser") {
      store.saveMode = "browser";
      const browser = gate.querySelector('input[name="entry_save_mode"][value="browser"]');
      if (browser) browser.checked = true;
      return;
    }
    store.saveMode = null;
    gate.querySelectorAll('input[name="entry_save_mode"]').forEach(function (r) {
      r.checked = false;
    });
  }

  function setupEntryGate() {
    const gate = document.getElementById("entry-gate");
    if (!gate) return;
    gate.querySelectorAll('input[name="entry_save_mode"]').forEach((input) => {
      bindChoiceReselect(input, () => {
        if (input.value === "folder") {
          const nameInput = document.getElementById("entry-project-folder-name");
          if (nameInput && !String(nameInput.value || "").trim() && !store.projectFolderName) {
            const name = defaultProjectFolderName(new Date());
            nameInput.value = name;
            store.projectNameAuto = name;
          }
          syncEntryFolderNamePanel();
          return;
        }
        store.saveMode = "browser";
        store.folderDirHandle = null;
        store.projectFileHandle = null;
        store.folderDisplayName = "";
        store.projectFolderName = "";
        store.projectNameAuto = "";
        idbClearFolderHandle();
        syncEntryFolderNamePanel();
        syncDashResumeNotice();
        scheduleSave();
        enterBranchAfterSaveChoice();
      });
    });
    const pickFolderBtn = document.getElementById("entry-pick-folder");
    if (pickFolderBtn) {
      pickFolderBtn.addEventListener("click", () => {
        const prevMode = store.saveMode;
        pickProjectFolderForSave()
          .then(function () {
            store.saveMode = "folder";
            syncDashResumeNotice();
            scheduleSave();
            scheduleFolderWrite();
            enterBranchAfterSaveChoice();
          })
          .catch(function (err) {
            if (!(err && err.name === "AbortError")) {
              restoreSaveChoiceAfterFolderCancel(gate, prevMode);
            }
            syncEntryFolderNamePanel();
            const msg =
              err && err.name === "AbortError"
                ? "保存をやめました。もう一度保存するか、「残さず、そのまま作る」を選んでください。"
                : err && err.message
                  ? String(err.message)
                  : "フォルダを選べませんでした。";
            window.alert(msg);
          });
      });
    }
    const resumeZipInput = document.getElementById("entry-resume-zip");
    const resumeLoadBtn = document.getElementById("entry-resume-load");
    const resumeFolderPick = document.getElementById("entry-resume-folder-pick");
    if (resumeZipInput) {
      resumeZipInput.addEventListener("change", () => {
        store.pendingResumeFolderFiles = null;
        if (resumeZipInput.files && resumeZipInput.files[0]) {
          store.folderDirHandle = null;
          store.projectFileHandle = null;
          store.folderDisplayName = "";
        }
        setEntryResumeStatus("");
        syncEntryResumeLoadButton();
      });
    }
    if (resumeFolderPick) {
      resumeFolderPick.addEventListener("click", () => {
        setEntryResumeStatus("");
        pickProjectFolderForResume()
          .then(function () {
            if (resumeZipInput) resumeZipInput.value = "";
            setEntryResumeStatus("");
            syncEntryResumeLoadButton();
          })
          .catch(function (err) {
            if (err && err.name === "AbortError") {
              setEntryResumeStatus("フォルダ選択をキャンセルしました。");
            } else {
              setEntryResumeStatus(
                err && err.message
                  ? String(err.message)
                  : "フォルダを選べませんでした。"
              );
            }
            syncEntryResumeLoadButton();
          });
      });
    }
    if (resumeLoadBtn) {
      resumeLoadBtn.addEventListener("click", () => {
        resumeLoadBtn.disabled = true;
        setEntryResumeStatus("読み込み中…");
        loadResumeProject()
          .then(() => {
            setEntryResumeStatus("");
            store.pendingResumeFolderFiles = null;
          })
          .catch((err) => {
            const msg =
              err && err.message
                ? String(err.message)
                : "読み込みに失敗しました。ファイルが違うか、壊れている可能性があります。";
            setEntryResumeStatus(msg);
            syncEntryResumeLoadButton();
          });
      });
    }
    syncEntryResumeLoadButton();
    tryRestoreFolderHandleOnBoot().then(function () {
      syncDashResumeNotice();
      if (store.saveMode === "folder" && store.folderDirHandle) scheduleFolderWrite();
    });
    gate.querySelectorAll('input[name="entry_branch"]').forEach((input) => {
      bindChoiceReselect(input, () => {
        if (input.value === "resume") {
          store.entryBranch = "resume";
          setEntryResumeStatus("");
          syncEntryResumeLoadButton();
          runWithCrossShutter(function () { setEntryGateStep("resume"); });
          return;
        }
        store.entryBranch = input.value === "detail" ? "detail" : "sample";
        if (store.entryBranch === "sample") runWithCrossShutter(function () { setEntryGateStep("sushi"); });
        else runWithCrossShutter(function () { setEntryGateStep("purpose"); });
      });
    });
    gate.querySelectorAll('input[name="entry_purpose"]').forEach((input) => {
      bindChoiceReselect(input, () => {
        if (input.disabled) return;
        if (store.entryBranch === "detail") {
          runWithCrossShutter(function () { finishDetailEntryFromGate(); });
          return;
        }
        runWithCrossShutter(function () { return enterSampleAfterPurpose(); }, warmSampleEntryDraft);
      });
    });
    document.querySelectorAll('input[name="entry_sample_color"]').forEach((input) => {
      input.addEventListener("change", () => {
        if (!input.checked) return;
        applyEasyColorChoice();
        syncLayoutColorRows();
      });
    });
    gate.querySelectorAll("[data-entry-step-back]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const cur = gate.dataset.entryStep || "branch";
        if (cur === "color") setEntryGateStep("purpose");
        else if (cur === "purpose") {
          if (store.entryBranch === "sample") {
            setEntryGateStep("sushi");
            scrollBackDestinationToTop();
            return;
          }
          setEntryGateStep("branch");
        } else if (cur === "sushi" || cur === "resume" || cur === "branch") {
          setEntryGateStep(cur === "branch" ? "save" : "branch");
        }
        scrollBackDestinationToTop();
      });
    });
    document.querySelectorAll("[data-sec-regen]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const sec = btn.getAttribute("data-sec-regen");
        if (sec) rebuildSampleSectionCandidates(sec);
        scheduleSave();
      });
    });
    setupEasyImagePickers();
    syncDashResumeNotice();
    if (shouldShowEntryGate()) {
      const gateOpen =
        gate && !gate.hidden && document.body.classList.contains("entry-gate-open");
      const curStep = gate && gate.dataset.entryStep;
      /* restoreViewAfterMode が既に色／寿司へ戻しているときは上書きしない */
      if (gateOpen && curStep && curStep !== "save" && curStep !== "branch") {
        /* keep */
      } else if (
        store.entryBranch === "sample" &&
        !store.easyFlowActive &&
        store.hubEntrySource !== "sample-done" &&
        store.hubEntrySource !== "detail-entry"
      ) {
        const purposeRadio = gate.querySelector(
          'input[name="entry_purpose"][value="' + (store.sitePurpose || "shop") + '"]'
        );
        if (purposeRadio) purposeRadio.checked = true;
        const branchRadio = gate.querySelector('input[name="entry_branch"][value="sample"]');
        if (branchRadio) branchRadio.checked = true;
        showEntryGate(store.sushiSampleId ? "color" : "sushi");
      } else {
        showEntryGate();
      }
    } else {
      hideEntryGate();
      syncSiteColorModeUi();
      if (store.easyFlowActive && store.uiMode === "guided") {
        showWizardStep(resolveWizardStepIndex());
      }
    }
  }

  function resetColorsForEasyMode() {
    clearAllColorCodes();
    const key = EASY_PRESET_KEYS.indexOf(store.chosenPresetKey) >= 0 ? store.chosenPresetKey : "clinic";
    applyPresetByKey(key);
    confirmAllColorStepsFromPreset();
    applyEasyFixedFonts();
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
    document.querySelectorAll("[data-detail-notice-ok]").forEach((btn) => {
      btn.addEventListener("click", () => {
        hideDetailNoticeModal();
        /* ハブはモーダル表示前に開済。再同期だけ（二重入場の保険） */
        openDetailLayoutHub();
      });
    });
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

    if (step.id === "easy-color") {
      applyEasyColorChoice();
    }

    if (step.id === "easy-copy-frame") {
      const order = activeCopyFrameOrder();
      if ((store.copyFrameIndex || 0) < order.length - 1) {
        store.copyFrameIndex = (store.copyFrameIndex || 0) + 1;
        store.confirmed["easy-copy-frame"] = false;
        renderCopyFrameUi();
        updateWizardUi();
        scheduleSave();
        return "stay";
      }
      if (store.copyScreenReturn === "hub") {
        closeCopyFrameToHub();
        return "stay";
      }
    }
    if (step.id === "easy-img-omakase") {
      prepareEasyFixedImageCounts();
      confirmEasyImagesForFinish();
    }

    store.snapshots[step.id] = captureStepSnapshot(step.id);
    store.confirmed[step.id] = true;
    applyAllConfirmed();
    updateConfirmUi();
    updateZoneBadgeDoneState();
    hideWizardFootPanel();
    return true;
  }

  const COLOR_WAVE_ROWS = 4;
  const COLOR_WAVE_COLS = 8;
  const COLOR_WAVE_DUR = 340;
  const COLOR_WAVE_GAP = 32;
  const COLOR_WAVE_ROW_GAP = 18;
  const COLOR_WAVE_FIELD = {
    clinic: "chromeBg",
    green: "accent",
    cafe: "chromeBg",
    ink: "pageBg",
    brick: "chromeBg",
    sakura: "accent"
  };
  const COLOR_WAVE_PATTERNS = [
    [["clinic", "green"], ["sakura", "brick"], ["green", "clinic"], ["brick", "sakura"]],
    [["green", "sakura"], ["brick", "clinic"], ["cafe", "green"], ["sakura", "brick"]],
    [["clinic", "sakura"], ["green", "brick"], ["ink", "clinic"], ["sakura", "green"]],
    [["brick", "green"], ["clinic", "cafe"], ["sakura", "clinic"], ["green", "brick"]]
  ];
  let colorWaveBusy = false;
  let colorWavePattern = -1;

  function colorWaveHex(key) {
    const preset = PRESETS[key] || PRESETS.clinic;
    const field = COLOR_WAVE_FIELD[key] || "chromeBg";
    return preset[field] || preset.chromeBg;
  }

  function ensureColorWave() {
    let layer = document.getElementById("color-wave");
    if (layer) return layer;
    layer = document.createElement("div");
    layer.id = "color-wave";
    layer.hidden = true;
    layer.setAttribute("aria-hidden", "true");
    for (let r = 0; r < COLOR_WAVE_ROWS; r++) {
      const row = document.createElement("div");
      row.className = "color-wave-row";
      for (let c = 0; c < COLOR_WAVE_COLS; c++) {
        const cell = document.createElement("div");
        cell.className = "color-wave-cell";
        cell.dataset.row = String(r);
        cell.dataset.col = String(c);
        row.appendChild(cell);
      }
      layer.appendChild(row);
    }
    document.body.appendChild(layer);
    return layer;
  }

  function paintColorWave(layer) {
    let pick = Math.floor(Math.random() * COLOR_WAVE_PATTERNS.length);
    if (pick === colorWavePattern) pick = (pick + 1) % COLOR_WAVE_PATTERNS.length;
    colorWavePattern = pick;
    const pattern = COLOR_WAVE_PATTERNS[pick];
    const half = COLOR_WAVE_COLS / 2;
    layer.querySelectorAll(".color-wave-cell").forEach(function (cell) {
      const row = Number(cell.dataset.row) || 0;
      const col = Number(cell.dataset.col) || 0;
      const pair = pattern[row] || pattern[0];
      const key = col < half ? pair[0] : pair[1];
      cell.style.background = colorWaveHex(key);
      cell.style.transform = "scaleX(0)";
    });
  }

  function colorWaveDelay(row, col, opening) {
    const reverseCol = row % 2 === 0 ? col : COLOR_WAVE_COLS - 1 - col;
    const along = opening ? COLOR_WAVE_COLS - 1 - reverseCol : reverseCol;
    return along * COLOR_WAVE_GAP + row * COLOR_WAVE_ROW_GAP;
  }

  function colorWaveSpan() {
    return (COLOR_WAVE_COLS - 1) * COLOR_WAVE_GAP + (COLOR_WAVE_ROWS - 1) * COLOR_WAVE_ROW_GAP + COLOR_WAVE_DUR;
  }

  function playColorWave(onCovered) {
    if (colorWaveBusy) return false;
    const layer = ensureColorWave();
    paintColorWave(layer);
    const cells = layer.querySelectorAll(".color-wave-cell");
    colorWaveBusy = true;
    layer.hidden = false;
    const span = colorWaveSpan();
    cells.forEach(function (cell) {
      const row = Number(cell.dataset.row) || 0;
      const col = Number(cell.dataset.col) || 0;
      cell.style.transformOrigin = row % 2 === 0 ? "left center" : "right center";
      cell.animate(
        [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }],
        {
          duration: COLOR_WAVE_DUR,
          delay: colorWaveDelay(row, col, false),
          easing: "cubic-bezier(0.45, 0, 0.2, 1)",
          fill: "both"
        }
      );
    });
    window.setTimeout(function () {
      try {
        onCovered();
      } finally {
        cells.forEach(function (cell) {
          const row = Number(cell.dataset.row) || 0;
          const col = Number(cell.dataset.col) || 0;
          cell.getAnimations().forEach(function (anim) { anim.cancel(); });
          cell.style.transform = "scaleX(1)";
          cell.style.transformOrigin = row % 2 === 0 ? "right center" : "left center";
          cell.animate(
            [{ transform: "scaleX(1)" }, { transform: "scaleX(0)" }],
            {
              duration: COLOR_WAVE_DUR,
              delay: colorWaveDelay(row, col, true),
              easing: "cubic-bezier(0.45, 0, 0.2, 1)",
              fill: "both"
            }
          );
        });
        window.setTimeout(function () {
          cells.forEach(function (cell) {
            cell.getAnimations().forEach(function (anim) { anim.cancel(); });
            cell.style.transform = "scaleX(0)";
          });
          layer.hidden = true;
          colorWaveBusy = false;
        }, span + 40);
      }
    }, span + 30);
    return true;
  }

  /* 格子シャッター・左右帯は使わない。サンプル後は6色タイル波だけ */

  /** サンプル確定→用途だけ。6色タイルが順に埋まる波。それ以外の進みでは使わない */
  function playSampleColorShutter(onCross) {
    if (colorWaveBusy) return false;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      if (onCross) onCross();
      return true;
    }
    const started = playColorWave(function () {
      try {
        if (onCross) onCross();
      } catch (err) { /* 切替に失敗しても波は抜ける */ }
    });
    if (!started) {
      if (onCross) onCross();
      return false;
    }
    return true;
  }

  /** シャッターなしで進む（進捗バーのテンポを優先） */
  function runWithCrossShutter(next, prepare) {
    Promise.resolve(prepare && prepare()).then(
      function (ready) {
        if (ready === false) return;
        next();
      },
      function () {
        /* prepare 失敗時は進まない */
      }
    );
  }

  function enterBranchAfterSaveChoice() {
    setEntryGateStep("branch");
  }

  function catchImageIsOn() {
    if (store.catchImageOn === true) return true;
    if (store.catchImageOn === false) return false;
    return !store.heroImageOff;
  }

  function catchWordsAreOn() {
    if (store.catchWordsOn === true) return true;
    if (store.catchWordsOn === false) return false;
    return store.copyHeroOnPhoto === true;
  }

  function openCatchFromLayout(page) {
    const flow = getFlowSteps();
    const cur = getCurrentFlowStep();
    const idx = flow.findIndex(function (s) { return s.id === "easy-catch"; });
    if (!cur || idx < 0) return;
    if (page) store.catchPage = page === "color" && heroPlateIsOn() ? "write" : page;
    if (cur.id === "easy-catch") {
      renderEasyCatchRest();
      scheduleSave();
      return;
    }
    store.layoutCatchReturn = cur.id;
    store.catchInline = true;
    document.body.classList.add("is-catch-inline");
    const catchBlock = form.querySelector('.dash-block[data-step-id="easy-catch"]');
    if (!catchBlock) return;
    form.querySelectorAll(":scope > details.dash-block").forEach(function (d) {
      const active = d === catchBlock;
      d.open = active;
      d.hidden = !active;
      d.classList.toggle("is-wizard-active", active);
      d.classList.toggle("is-active-step", active);
    });
    parkEasyImageHost("easy-catch");
    if (store.catchPage === "image") {
      store.layoutAccordionId = "hero";
      if (!store.layoutInnerByBlock) store.layoutInnerByBlock = {};
      store.layoutInnerByBlock.hero = "hero";
    }
    mountSharedImageUi(true);
    renderEasyCatchRest();
    updateWizardUi();
    scheduleSave();
  }

  function closeCatchInline() {
    if (!store.catchInline) return;
    const backId = store.layoutCatchReturn || "";
    store.catchInline = false;
    store.layoutCatchReturn = "";
    document.body.classList.remove("is-catch-inline");
    const flow = getFlowSteps();
    const at = flow.findIndex(function (s) { return s.id === backId; });
    if (at >= 0) showWizardStep(at);
    else updateWizardUi();
  }

  let afterColorGuideOpen = false;
  let afterColorGuidePassing = false;

  function afterColorGuideItems() {
    const items = [
      {
        title: "そのまま順番に進む",
        body: "「次へ」を押すと、進捗の順に進めます。"
      },
      {
        title: "好きな項目から編集する",
        body: "上の進捗名を押すと、その項目の画像・文章・色を編集できます。"
      }
    ];
    if (easyCatchOn()) {
      items.push({
        title: "まずはキャッチで試してみる",
        body: "キャッチでは、画像・文章・色の操作を続けて体験できます。"
      });
    }
    return items;
  }

  function paintAfterColorGuide() {
    const copy = document.getElementById("after-color-guide-copy");
    if (!copy) return;
    copy.textContent = "";
    afterColorGuideItems().forEach(function (item) {
      const block = document.createElement("section");
      block.className = "after-color-guide-item";
      const heading = document.createElement("h3");
      heading.className = "after-color-guide-sub";
      heading.textContent = item.title;
      const p = document.createElement("p");
      p.textContent = item.body;
      block.appendChild(heading);
      block.appendChild(p);
      copy.appendChild(block);
    });
  }

  function setGuidePreviewHalf(on) {
    const split = document.getElementById("atelier-split");
    const shell = document.querySelector(".atelier-shell");
    if (!split) return;
    if (on) {
      split.dataset.guidePct = split.style.getPropertyValue("--preview-pct") || "";
      if (shell) shell.dataset.guidePct = shell.style.getPropertyValue("--preview-pct") || "";
      split.style.setProperty("--preview-pct", "50%");
      if (shell) shell.style.setProperty("--preview-pct", "50%");
    } else {
      const back = split.dataset.guidePct || "45%";
      split.style.setProperty("--preview-pct", back);
      if (shell) shell.style.setProperty("--preview-pct", shell.dataset.guidePct || back);
      delete split.dataset.guidePct;
      if (shell) delete shell.dataset.guidePct;
    }
    if (typeof window.applyPreviewWidthFromPane === "function") {
      window.applyPreviewWidthFromPane();
    }
  }

  function openAfterColorGuide() {
    afterColorGuideOpen = true;
    store.easyDirectOpen = true;
    scheduleSave();
    paintAfterColorGuide();
    const panel = document.getElementById("after-color-guide");
    if (panel) panel.hidden = false;
    document.body.classList.add("is-after-color-guide");
    const formEl = document.getElementById("order-form");
    if (formEl) formEl.hidden = true;
    setGuidePreviewHalf(true);
    updateWizardUi();
  }

  function closeAfterColorGuide() {
    afterColorGuideOpen = false;
    const panel = document.getElementById("after-color-guide");
    if (panel) panel.hidden = true;
    document.body.classList.remove("is-after-color-guide");
    const formEl = document.getElementById("order-form");
    if (formEl) formEl.hidden = false;
    setGuidePreviewHalf(false);
  }

  function wizardNext() {
    if (colorWaveBusy) return;
    if (store.catchInline) {
      closeCatchInline();
      return;
    }
    if (afterColorGuideOpen) {
      afterColorGuidePassing = true;
      closeAfterColorGuide();
      wizardNextAfterConfirm(getCurrentFlowStep(), false);
      afterColorGuidePassing = false;
      return;
    }
    const flow = getFlowSteps();
    const step = getCurrentFlowStep();
    if (!step) return;
    if (step.id === "easy-loading") {
      if (!store.easyLoadingPaused) return;
      store.easyLoadingPaused = false;
      store.confirmed["easy-loading"] = true;
      showWizardStep(Math.min(flow.length - 1, store.wizardStepIndex + 1));
      scheduleSave();
      return;
    }
    if (step.id === "easy-done") {
      return;
    }
    if (step.id !== "easy-catch" && catchRemovalBlocksNext()) {
      showValidationNotice("記載項目から、キャッチを外してください。");
      return;
    }
    if (!catchRemovalBlocksNext()) {
      const catchPanel = document.getElementById("wizard-foot-panel");
      if (catchPanel && catchPanel.textContent.indexOf("記載項目から、") === 0) clearPlainFootNotice();
    }
    if (step.id === "easy-catch") {
      if (store.layoutCatchReturn) {
        const backId = store.layoutCatchReturn;
        const backAt = flow.findIndex(function (s) { return s.id === backId; });
        if (backAt >= 0) {
          store.layoutCatchReturn = "";
          catchQuietReturnTo = backId;
          showWizardStep(backAt);
          scheduleSave();
          return;
        }
      }
      if (advanceCatchPage()) return;
      if (easyCatchOn() && store.catchImageOn !== true && store.catchWordsOn !== true) {
        showValidationNotice("記載項目から、キャッチを外してください。");
        return;
      }
      clearPlainFootNotice();
    }
    if (step.id === "easy-site-name") {
      const typed = document.getElementById("easy-site-name-input");
      const name = String((typed && typed.value) || "").trim();
      if (!name) return;
      setFieldValue("brand_name", name);
      store.siteNameConfirmed = true;
    }
    if (step.id === "easy-img-wire") {
      const miss = visibleUnfilledImageSlots();
      if (miss.length) {
        const bare = miss.filter(function (slot) {
          return !sampleDefaultSrc(slot.input);
        });
        if (bare.length) {
          showValidationNotice("見えている枠に写真があると、次へ進めます。");
          return;
        }
        openLayoutOmakaseNotice({
          title: "変更していない画像があります。",
          body: "このまま次へ進んでよろしいですか。",
          confirmLabel: "このまま次へ",
          allowSkip: false,
          onConfirm: function () {
            adoptVisibleSampleImages(miss);
            wizardNext();
          }
        });
        return;
      }
    }
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

    const confirmed = wizardConfirmCurrentStep();
    if (confirmed && typeof confirmed.then === "function") {
      confirmed.then(function (ok) {
        if (ok === "stay" || !ok) return;
        wizardNextAfterConfirm(step, revisingAfterLock);
      });
      return;
    }
    if (confirmed === "stay") return;
    if (!confirmed) return;
    wizardNextAfterConfirm(step, revisingAfterLock);
  }

  function wizardNextAfterConfirm(step, revisingAfterLock) {
    const flow = getFlowSteps();
    if (!step) return;
    if (step.id === "easy-site-name" && store.easyFlowActive && !afterColorGuidePassing) {
      openAfterColorGuide();
      return;
    }
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
    let nextIndex = store.wizardStepIndex + 1;
    runWithCrossShutter(function () {
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
      const upcoming = flow[nextIndex];
      if (upcoming && upcoming.id === "easy-catch") store.catchPage = "imageAsk";
      showWizardStep(nextIndex);
    });
  }

  function returnFromHubToEasyDone() {
    hideDetailNoticeModal();
    store.easyFlowActive = true;
    store.siteColorMode = "easy";
    store.uiMode = "guided";
    store.entryBranch = "sample";
    store.hubEntrySource = "sample";
    store.easyLoadingPaused = false;
    hideEntryGate();
    setSampleFlowPreviewHidden(false);
    syncSiteColorModeUi();
    applyUiMode();
    const flow = getFlowSteps();
    let doneIdx = flow.findIndex((s) => s.id === "easy-done");
    if (doneIdx < 0) doneIdx = Math.max(0, flow.length - 1);
    if (flow.length) showWizardStep(doneIdx);
    const status = document.getElementById("wizard-status");
    if (status) status.textContent = "";
    scheduleSave();
  }

  function returnFromHubToPurpose() {
    hideDetailNoticeModal();
    const gate = document.getElementById("entry-gate");
    if (gate) {
      const branchRadio = gate.querySelector('input[name="entry_branch"][value="detail"]');
      if (branchRadio) branchRadio.checked = true;
      gate.querySelectorAll('input[name="entry_purpose"]').forEach(function (r) {
        if (r.value === (store.sitePurpose || "shop")) r.checked = true;
      });
    }
    store.entryBranch = "detail";
    showEntryGate("purpose");
    scheduleSave();
  }

  function scrollBackDestinationToTop() {
    const apply = function () {
      const form = document.querySelector(".dash-body > .fill-form");
      if (form) form.scrollTop = 0;
      const gate = document.getElementById("entry-gate");
      if (gate && !gate.hidden) gate.scrollTop = 0;
    };
    apply();
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(apply);
      });
    });
  }

  function wizardBack() {
    if (store.catchInline) {
      closeCatchInline();
      return;
    }
    if (afterColorGuideOpen) {
      closeAfterColorGuide();
      return;
    }
    clearPlainFootNotice();
    const step = getCurrentFlowStep();
    if (store.easyGapReturn === "easy-done" && step && step.id !== "easy-done" && step.id !== "finish") {
      store.easyGapReturn = "";
      setCopyListOpen(null);
      store.copyListFocusField = null;
      store.layoutAccordionId = "";
      store.layoutInnerByBlock = {};
      store.easyDirectOpen = true;
      openEasyStage("確定");
      return;
    }
    if (store.sampleFinishNoBack && step && step.id === "finish" && store.entryBranch === "sample") {
      resumeSampleEasyFlow();
      store.easyGapReturn = "";
      const backFlow = getFlowSteps();
      const doneAt = backFlow.findIndex(function (s) { return s.id === "easy-done"; });
      if (doneAt >= 0) showWizardStep(doneAt);
      return;
    }
    if (
      step &&
      step.id === "layout" &&
      store.siteColorMode === "detail" &&
      store.uiMode === "self" &&
      (store.hubUiMode === "home" || !store.hubUiMode)
    ) {
      if (store.hubEntrySource === "sample-done") {
        returnFromHubToEasyDone();
        return;
      }
      if (store.hubEntrySource === "detail-entry") {
        returnFromHubToPurpose();
        return;
      }
    }
    if (
      store.siteColorMode === "detail" &&
      store.uiMode === "self" &&
      step &&
      step.id !== "layout" &&
      step.id !== "finish" &&
      step.id !== "guide" &&
      step.id !== "purpose"
    ) {
      returnToLayoutHub();
      return;
    }
    if (
      store.easyFlowActive &&
      store.entryBranch === "sample" &&
      step &&
      EASY_FLOW_STEP_SET.has(step.id) &&
      store.wizardStepIndex <= 0
    ) {
      reopenSampleEntryAtColor();
      return;
    }
    if (
      store.easyFlowActive &&
      store.blankCanvas &&
      store.entryBranch === "detail" &&
      step &&
      step.id === "easy-basics" &&
      store.wizardStepIndex <= 0
    ) {
      returnFromHubToPurpose();
      return;
    }
    if (step && step.id === "easy-copy-frame") {
      if ((store.copyFrameIndex || 0) > 0) {
        const order = activeCopyFrameOrder();
        if (order.length) {
          store.copyFrameIndex = Math.min((store.copyFrameIndex || 0) - 1, order.length - 1);
          store.confirmed["easy-copy-frame"] = false;
          renderCopyFrameUi();
          updateWizardUi();
          return;
        }
      }
      if (store.copyScreenReturn === "hub") {
        closeCopyFrameToHub();
        return;
      }
    }
    if (step && step.id === "easy-done") {
      clearEasyLoadingTimers();
      store.easyLoadingPaused = true;
      setSampleFlowPreviewHidden(false);
      showWizardStep(Math.max(0, store.wizardStepIndex - 1));
      return;
    }
    if (step && step.id === "easy-loading") {
      clearEasyLoadingTimers();
      store.easyLoadingPaused = false;
      setSampleFlowPreviewHidden(false);
      showWizardStep(Math.max(0, store.wizardStepIndex - 1));
      return;
    }
    if (step && step.id === "easy-catch" && store.layoutCatchReturn) {
      const backId = store.layoutCatchReturn;
      store.layoutCatchReturn = "";
      const backFlow = getFlowSteps();
      const backAt = backFlow.findIndex(function (s) { return s.id === backId; });
      if (backAt >= 0) {
        catchQuietReturnTo = backId;
        showWizardStep(backAt);
        scheduleSave();
        return;
      }
    }
    if (step && step.id === "easy-catch" && retreatCatchPage()) return;
    if (step && EASY_FLOW_STEP_SET.has(step.id)) {
      if (store.confirmed[step.id]) unconfirmStep(step.id);
      let backIndex = Math.max(0, store.wizardStepIndex - 1);
      const flow = getFlowSteps();
      let prev = flow[backIndex];
      if (prev && prev.id === "easy-catch") {
        const page = store.catchPage || "imageAsk";
        if (page === "imageAsk" || page === "ask") {
          const target = catchSectionBefore(page);
          if (target) store.catchPage = target;
          else backIndex = Math.max(0, backIndex - 1);
        }
      }
      showWizardStep(backIndex);
      const status = document.getElementById("wizard-status");
      if (status) status.textContent = "";
      return;
    }
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
    store.folderDirHandle = null;
    store.projectFileHandle = null;
    store.folderDisplayName = "";
    store.pendingResumeFolderFiles = null;
    store.zipImageFiles = null;
    idbClearFolderHandle();
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
      '<p class="reset-draft-modal-title" id="reset-draft-title">最初からやり直しますか。</p>' +
      '<p class="reset-draft-modal-text">入力した内容はすべて消え、元に戻せません。</p>' +
      '<div class="reset-draft-modal-actions">' +
      '<button type="button" class="wizard-btn" data-reset-cancel>キャンセル</button>' +
      '<button type="button" class="wizard-btn" data-reset-ok>最初からやり直す</button>' +
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
    if (backBtn) {
      backBtn.addEventListener("click", function () {
        wizardBack();
        scrollBackDestinationToTop();
      });
    }
    if (nextBtn) nextBtn.addEventListener("click", wizardNext);
    const guideNext = document.getElementById("after-color-guide-next");
    const guideBack = document.getElementById("after-color-guide-back");
    if (guideNext) guideNext.addEventListener("click", wizardNext);
    if (guideBack) {
      guideBack.addEventListener("click", function () {
        wizardBack();
        scrollBackDestinationToTop();
      });
    }
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
        if (store.siteColorMode === "detail") openDetailLayoutHub();
        else if (store.uiMode === "self") showSelfList("finish");
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
    rememberDraftColor(key);
    refreshColorUi();
    applyLiveColors(true);
    scheduleSave();
  }

  function rememberDraftColor(key) {
    if (!key) return;
    Object.keys(COLOR_STEP_FIELDS).forEach(function (stepId) {
      if (COLOR_STEP_FIELDS[stepId].indexOf(key) < 0) return;
      if (!store.confirmed[stepId]) return;
      const snap = store.snapshots[stepId];
      if (!snap) return;
      if (!snap.colors) snap.colors = {};
      snap.colors[key] = store.draftColors[key];
      if (key === "pageBg" && store.draftColors.pageBgSoft) snap.colors.pageBgSoft = store.draftColors.pageBgSoft;
      if (key === "bodyInk" && store.draftColors.bodyMuted) snap.colors.bodyMuted = store.draftColors.bodyMuted;
    });
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
    /* 見出し大きさは並び替えで編集。角は既定固定。常にフォーム値を正とする */
    const headingScale = normalizeHeadingScale(
      fieldValue("headingScale") || DEFAULTS.headingScale
    );
    if (store.confirmed["hero-color"] && store.snapshots["hero-color"]) {
      store.snapshots["hero-color"].headingScale = headingScale;
    }
    if (store.confirmed["global-card"] && store.snapshots["global-card"]) {
      store.snapshots["global-card"].radius = colors.radius;
    }
    root.style.setProperty("--heading-scale", headingScale);
    root.style.setProperty("--radius", colors.radius);
    applyAccentBarToRoot();
    paintLayoutColorChips();
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

  /* 旧四角スウォッチUIは廃止。色編集はハニカム（guided-color-trial）のみ */
  function buildSwatches() {}

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
      let show = false;
      if (ITEM_SLOT_IDS[id]) {
        seedItemOrder(id);
        const slot = ITEM_SLOT_IDS[id][at - 1];
        show = !!slot && (store.itemOrders[id] || []).indexOf(slot) >= 0;
      } else {
        const count = Number(store.draftCounts[id] || 0);
        show = count >= at;
      }
      el.hidden = !show;
      syncPanelFieldLock(el, !show);
    });
    document.querySelectorAll(".hub-img-slot-row").forEach((row) => {
      const input = row.querySelector('input[type="file"][name]');
      if (!input) return;
      const name = input.getAttribute("name") || "";
      let countId = "";
      let slot = "";
      if (name.indexOf("about_image_") === 0) {
        countId = "about-photos";
        slot = name;
      } else if (/^work_\d+_image$/.test(name)) {
        countId = "works-list";
        slot = name.replace(/_image$/, "");
      } else return;
      seedItemOrder(countId);
      const show = (store.itemOrders[countId] || []).indexOf(slot) >= 0;
      row.hidden = !show;
      syncPanelFieldLock(row, !show);
    });
    if (form) {
      seedItemOrder("works-list");
      const visibleWorks = store.itemOrders["works-list"] || [];
      ["title", "text", "url", "link_label"].forEach((suffix) => {
        for (let n = 1; n <= 3; n += 1) {
          const input = form.elements.namedItem("work_" + n + "_" + suffix);
          const label = input && input.closest ? input.closest("label") : null;
          if (!label) continue;
          const show = visibleWorks.indexOf("work_" + n) >= 0;
          label.hidden = !show;
          syncPanelFieldLock(label, !show);
        }
      });
    }
  }

  function syncCountLabels() {
    ITEM_LAYOUT_IDS.forEach((id) => alignItemOrderToCount(id));
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
    const curStep = getCurrentFlowStep();
    if (
      curStep &&
      HUB_IMG_STEP_IDS.indexOf(curStep.id) >= 0 &&
      store.hubImgPathMode &&
      store.hubImgPathMode[curStep.id] === "omakase"
    ) {
      syncHubImagePathPanels(curStep.id);
    }
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
          adjustDraftCount(id, -1, null);
        });
      }
      if (plus) {
        plus.addEventListener("click", () => {
          requestAddDraftCount(id, null, plus);
        });
      }
    });
    setupItemGapControls();
    setupItemGrowModal();
    setupItemFocalNudgeClicks();
    setupUrlSlugWish();
    if (!store.itemLayouts) store.itemLayouts = defaultItemLayouts();
    syncCountLabels();
    applyAllItemLayoutsToPreview();
  }

  function setupExtrasDraft() {
    document.querySelectorAll("[data-extra-toggle]").forEach((input) => {
      const key = input.getAttribute("data-extra-toggle");
      if (key) input.checked = !!(store.draftExtras && store.draftExtras[key]);
      input.addEventListener("change", () => {
        const k = input.getAttribute("data-extra-toggle");
        if (!k) return;
        const block = LAYOUT_BLOCKS.find((b) => b.extraKey === k);
        const want = !!input.checked;
        if (
          block &&
          !want &&
          isLayoutBlockActive(block) &&
          countVisibleLayoutBlocks() <= 1
        ) {
          input.checked = true;
          showLayoutArrangeHint("最低1つは表示してください。", 2200);
          return;
        }
        if (!store.layoutUndoRestoring) pushLayoutUndo();
        store.draftExtras[k] = want;
        document.querySelectorAll('[data-extra-toggle="' + k + '"]').forEach((el) => {
          el.checked = want;
        });
        /* 非表示でも色・画像・文字のデータは保持する */
        syncExtraPanels();
        applyAllConfirmed();
        applyLayoutOrderToPreview();
        renderLayoutArrangeWire();
        renderLayoutCardWires();
        updateConfirmUi();
        scheduleSave();
      });
    });
    syncExtraPanels();
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

  let layoutColorHoneyHome = null;

  function layoutColorRowName(stepId) {
    const names = {
      "global-chrome-bg": "ヘッダーの背景色",
      "global-chrome-ink": "ヘッダーの文字色",
      "global-bg": "背景の色",
      "hero-color": "キャッチの色",
      "values-color": "メッセージ枠の色",
      "global-body": "本文の色",
      "global-accent": "アクセントの色",
      "global-card": "カードの色",
      "contact-color": "ご連絡の色",
      "announce-color": "案内の色"
    };
    return names[stepId] || "";
  }

  function rememberLayoutColorHoneyHome() {
    if (layoutColorHoneyHome) return layoutColorHoneyHome;
    const layout = document.querySelector("#guided-color-trial .gct-pick-layout");
    if (!layout) return null;
    layoutColorHoneyHome = {
      layout: layout,
      parent: layout.parentElement,
      next: layout.nextSibling
    };
    return layoutColorHoneyHome;
  }

  function placeColorShade(inRow) {
    const shade = document.querySelector("label.gct-honey-shade");
    if (!shade) return;
    if (!shade._shadeHome) {
      shade._shadeHome = { parent: shade.parentElement, next: shade.nextSibling };
    }
    if (inRow) {
      const side = document.querySelector(".layout-color-body .gct-pick-side");
      if (side && shade.parentElement !== side) side.appendChild(shade);
    } else if (shade._shadeHome.parent && shade.parentElement !== shade._shadeHome.parent) {
      shade._shadeHome.parent.insertBefore(shade, shade._shadeHome.next);
    }
  }

  function restoreLayoutColorHoney() {
    placeColorShade(false);
    const home = layoutColorHoneyHome;
    if (!home || !home.layout || !home.parent) return;
    home.parent.insertBefore(home.layout, home.next);
    if (store.guidedColorEditStepId) syncPickPartnerUnused(store.guidedColorEditStepId);
  }

  function showLayoutColorHoney(stepId, colorKey) {
    if (!GUIDED_COLOR_TUNE_IDS.includes(stepId) && stepId !== "announce-color") return;
    if (!store.presetChosen) markPresetChosen(store.chosenPresetKey || "clinic");
    store.layoutColorKey = colorKey || null;
    store.partnerPickMode = false;
    store.gradDirHintOpen = false;
    store.guidedColorEditStepId = stepId;
    if (slotHasGradient(stepId)) {
      if (!store.slotGradOpen) store.slotGradOpen = {};
      store.slotGradOpen[stepId] = true;
      if (!store.slotGradHintOff) store.slotGradHintOff = {};
      store.slotGradHintOff[stepId] = true;
    }
    const key = primaryColorKeyForStep(stepId);
    const startHex = key ? store.draftColors[key] : "#ffffff";
    if (!store.guidedColorTrial || typeof store.guidedColorTrial !== "object") store.guidedColorTrial = {};
    store.guidedColorTrial._pickEntryHex = startHex;
    store.guidedColorTrial._pickEntryPartner = partnerHexForSlot(stepId);
    store.guidedColorTrial._pickHistory = [];
    syncHoneyShadeSlider(startHex);
    const paint = () => {
      renderGctPickUi(stepId, { forceHoney: true });
    };
    const host = document.getElementById("gct-pick-host");
    if (host && host.clientWidth < 40) window.requestAnimationFrame(paint);
    else paint();
  }

  const COLOR_LIST_WHOLE = [
    { stepId: "global-bg", name: "背景", chipKey: "pageBg" },
    { stepId: "global-body", name: "本文", chipKey: "bodyInk" },
    { stepId: "global-accent", name: "アクセント", chipKey: "accent" },
    { stepId: "global-card", name: "カード", chipKey: "cardBg" }
  ];
  const COLOR_LIST_BAND = {
    id: "band",
    name: "上と下の帯",
    chipKey: "chromeBg",
    chipStep: "global-chrome-bg",
    children: [
      { stepId: "global-chrome-bg", name: "背景" },
      { stepId: "global-chrome-ink", name: "文字" }
    ]
  };
  const COLOR_LIST_MOVES = [
    { id: "hero-color", name: "キャッチの文字", stepId: "hero-color", chipKey: "heroInk" },
    { id: "values-color", name: "メッセージ枠", stepId: "values-color", chipKey: "valuesBg" },
    { id: "announce-color", name: "案内", stepId: "announce-color", chipKey: "announceBg" },
    {
      id: "contact",
      name: "ご連絡",
      children: [
        { stepId: "contact-color", name: "背景", colorKey: "contactBg" },
        { stepId: "contact-color", name: "文字", colorKey: "contactInk" }
      ]
    }
  ];
  const COLOR_MOVE_BLOCK = {
    "hero-color": "hero",
    "values-color": "values",
    "announce-color": "announce",
    contact: "contact"
  };

  function placeAccentBarField(host) {
    const field = document.querySelector(".accent-bar-field");
    if (!field) return;
    if (!field._accentHome) {
      field._accentHome = { parent: field.parentElement, next: field.nextSibling };
    }
    if (host) host.appendChild(field);
    else if (field._accentHome && field._accentHome.parent) {
      field._accentHome.parent.insertBefore(field, field._accentHome.next);
    }
  }

  function closeLayoutColorRow(row) {
    if (!row) return;
    const stepId = row.getAttribute("data-color-step") || "";
    row.classList.remove("is-open");
    const body = row.querySelector(":scope > .layout-color-body");
    if (body) body.hidden = true;
    const btn = row.querySelector(":scope > .layout-color-line > .layout-color-open");
    if (btn) {
      btn.textContent = "開く";
      btn.setAttribute("aria-expanded", "false");
    }
    restoreLayoutColorHoney();
    placeAccentBarField(null);
    store.gradDirHintOpen = false;
    store.layoutColorKey = null;
    const dirPop = document.getElementById("gct-grad-dir-pop");
    if (dirPop) dirPop.hidden = true;
    if (stepId && store.guidedColorEditStepId === stepId) {
      store.guidedColorEditStepId = null;
      store.partnerPickMode = false;
    }
    const group = row.closest(".layout-color-group");
    if (group && group !== row) group.classList.remove("is-honey");
    syncOpenColorPreview();
  }

  function closeColorGroup(group) {
    if (!group) return;
    group.querySelectorAll(".layout-color-sub.is-open").forEach(closeLayoutColorRow);
    group.classList.remove("is-open", "is-honey");
    const body = group.querySelector(":scope > .layout-color-group-body");
    if (body) body.hidden = true;
    const btn = group.querySelector(":scope > .layout-color-line > .layout-color-open");
    if (btn) {
      btn.textContent = "開く";
      btn.setAttribute("aria-expanded", "false");
    }
    syncOpenColorPreview();
  }

  function closeOpenColorScreens() {
    const rows = document.getElementById("layout-color-rows");
    if (!rows) return;
    rows.querySelectorAll(":scope > .layout-color-group.is-open").forEach(closeColorGroup);
    rows.querySelectorAll(":scope > .layout-color-move.is-open").forEach(closeLayoutColorRow);
  }

  function openLayoutColorHoney(unit) {
    const stepId = unit.getAttribute("data-color-step") || "";
    const colorKey = unit.getAttribute("data-color-key") || "";
    const home = rememberLayoutColorHoneyHome();
    if (!stepId || !home) return;
    const group = unit.closest(".layout-color-group");
    if (group) {
      group.querySelectorAll(".layout-color-sub.is-open").forEach((openSub) => {
        if (openSub !== unit) closeLayoutColorRow(openSub);
      });
      group.classList.add("is-open", "is-honey");
    } else {
      closeOpenColorScreens();
    }
    const body = unit.querySelector(":scope > .layout-color-body");
    if (!body) return;
    body.hidden = false;
    body.appendChild(home.layout);
    placeColorShade(true);
    unit.classList.add("is-open");
    const btn = unit.querySelector(":scope > .layout-color-line > .layout-color-open");
    if (btn) btn.setAttribute("aria-expanded", "true");
    showLayoutColorHoney(stepId, colorKey || null);
    if (stepId === "global-accent") placeAccentBarField(body);
    syncOpenColorPreview();
  }

  function openColorGroup(group) {
    closeOpenColorScreens();
    group.classList.add("is-open");
    group.classList.remove("is-honey");
    const body = group.querySelector(":scope > .layout-color-group-body");
    if (body) body.hidden = false;
    const btn = group.querySelector(":scope > .layout-color-line > .layout-color-open");
    if (btn) {
      btn.textContent = "開く";
      btn.setAttribute("aria-expanded", "true");
    }
    syncOpenColorPreview();
  }

  function colorMoveOrder() {
    const blockToMove = { hero: "hero-color", values: "values-color", announce: "announce-color", contact: "contact" };
    const out = [];
    normalizeLayoutOrder(store.layoutOrder).forEach((id) => {
      const moveId = blockToMove[id];
      if (moveId && out.indexOf(moveId) < 0) out.push(moveId);
    });
    COLOR_LIST_MOVES.forEach((item) => {
      if (out.indexOf(item.id) < 0) out.push(item.id);
    });
    return out;
  }

  function colorMoveBlockId(moveId) {
    if (moveId === "catch-jump") return "hero";
    if (moveId === "hero-color") return "";
    return COLOR_MOVE_BLOCK[moveId] || "";
  }

  function syncColorMoveRowsFromPreview() {
    const rows = document.getElementById("layout-color-rows");
    if (!rows) return;
    const byId = {};
    rows.querySelectorAll(":scope > .layout-color-move").forEach((el) => {
      byId[el.getAttribute("data-color-move")] = el;
    });
    const ordered = [];
    colorMoveOrder().forEach((id) => {
      if (id === "hero-color" && byId["catch-jump"]) ordered.push("catch-jump");
      if (byId[id]) ordered.push(id);
    });
    if (byId["catch-jump"] && ordered.indexOf("catch-jump") < 0) ordered.push("catch-jump");
    ordered.forEach((id) => {
      if (byId[id]) rows.appendChild(byId[id]);
    });
  }

  function writeColorMoveOrder(list) {
    if (!list) return false;
    const moveIds = Array.from(list.querySelectorAll(":scope > .layout-color-move")).map((el) => el.getAttribute("data-color-move"));
    store.colorListOrder = moveIds;
    const hasCatch = moveIds.indexOf("catch-jump") >= 0;
    const wanted = [];
    moveIds.forEach((id) => {
      if (hasCatch && id === "hero-color") return;
      const block = colorMoveBlockId(id);
      if (!block || wanted.indexOf(block) >= 0) return;
      wanted.push(block);
    });
    const order = normalizeLayoutOrder(store.layoutOrder).slice();
    const slots = [];
    order.forEach((id, index) => {
      if (wanted.indexOf(id) >= 0) slots.push(index);
    });
    if (slots.length !== wanted.length) return false;
    let same = true;
    wanted.forEach((id, index) => {
      if (order[slots[index]] !== id) same = false;
      order[slots[index]] = id;
    });
    if (same) return false;
    store.layoutOrder = order;
    return true;
  }

  function saveColorMoveOrder() {
    const list = document.getElementById("layout-color-rows");
    if (!list) return;
    if (writeColorMoveOrder(list)) applyLayoutOrderToPreview({ skipColorSync: true });
    syncColorMoveRowsFromPreview();
    scheduleSave();
  }

  function colorChipSpec(item) {
    if (item.chipKey) {
      return [{ key: item.chipKey, stepId: item.chipStep || item.stepId, label: "表示色" }];
    }
    if (item.id === "contact" && item.children) {
      return item.children.map((child) => ({
        key: child.colorKey,
        stepId: child.stepId,
        label: child.name
      }));
    }
    return [];
  }

  function makeColorChips(item) {
    const specs = colorChipSpec(item);
    if (!specs.length) return null;
    const wrap = document.createElement("span");
    wrap.className = "layout-color-chips";
    specs.forEach((spec) => {
      if (!spec.key) return;
      const chip = document.createElement("span");
      chip.className = "layout-color-chip";
      const label = document.createElement("span");
      label.className = "layout-color-chip-label";
      label.textContent = spec.label;
      const swatch = document.createElement("span");
      swatch.className = "layout-color-chip-swatch";
      swatch.setAttribute("data-chip-key", spec.key);
      swatch.setAttribute("data-chip-step", spec.stepId || "");
      chip.appendChild(label);
      chip.appendChild(swatch);
      wrap.appendChild(chip);
    });
    return wrap;
  }

  function paintLayoutColorChips() {
    const rows = document.getElementById("layout-color-rows");
    if (!rows) return;
    const colors = getEffectiveColors();
    rows.querySelectorAll(".layout-color-chip-swatch").forEach((swatch) => {
      const key = swatch.getAttribute("data-chip-key");
      const stepId = swatch.getAttribute("data-chip-step");
      const hex = colors[key] || "#ffffff";
      const dir = stepId && store.slotGradients && store.slotGradients[stepId];
      if (dir && GRADIENT_BG_KEYS.has(key)) {
        swatch.style.backgroundImage = "linear-gradient(" + dir + ", " + hex + ", " + partnerHexForSlot(stepId) + ")";
      } else {
        swatch.style.backgroundImage = "none";
      }
      swatch.style.backgroundColor = hex;
    });
  }

  function makeColorLine(name, opts) {
    const line = document.createElement("div");
    line.className = "layout-color-line";
    if (opts && opts.handle) {
      const handle = document.createElement("span");
      handle.className = "layout-inner-handle";
      handle.textContent = "⋮⋮";
      handle.setAttribute("aria-label", "この枠の順番を変えられます");
      setHoverTip(handle, "押したまま上下に動かすと、順番を変えられます");
      line.appendChild(handle);
    } else if (opts && opts.spacer) {
      const spacer = document.createElement("span");
      spacer.className = "layout-color-grip-spacer";
      spacer.setAttribute("aria-hidden", "true");
      line.appendChild(spacer);
    }
    const label = document.createElement("p");
    label.className = "layout-color-name";
    label.textContent = name;
    line.appendChild(label);
    const ask = document.createElement("p");
    ask.className = "layout-color-ask";
    ask.textContent = "色の選び方は、どちらですか";
    line.appendChild(ask);
    return line;
  }

  function makeColorOpen(line, onOpen) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "layout-color-open";
    btn.textContent = "開く";
    btn.setAttribute("aria-expanded", "false");
    btn.addEventListener("click", onOpen);
    line.appendChild(btn);
    return btn;
  }

  function makeColorSub(item) {
    const sub = document.createElement("div");
    sub.className = "layout-color-row layout-color-sub";
    sub.setAttribute("data-color-step", item.stepId);
    if (item.colorKey) sub.setAttribute("data-color-key", item.colorKey);
    const line = makeColorLine(item.name);
    const chips = makeColorChips(item);
    if (chips) line.appendChild(chips);
    makeColorOpen(line, () => {
      if (sub.classList.contains("is-open")) closeLayoutColorRow(sub);
      else openLayoutColorHoney(sub);
    });
    const body = document.createElement("div");
    body.className = "layout-color-body";
    body.hidden = true;
    sub.appendChild(line);
    sub.appendChild(body);
    return sub;
  }

  function makeColorGroup(item, kind) {
    const movable = kind === "move";
    const group = document.createElement("div");
    group.className = "layout-color-row layout-color-group " + (movable ? "layout-color-move" : "layout-color-pin");
    if (!item.id) group.classList.add("layout-color-whole");
    if (movable) group.setAttribute("data-color-move", item.id);
    const line = makeColorLine(item.name, movable ? { handle: true } : { spacer: true });
    const chips = makeColorChips(item);
    if (chips) line.appendChild(chips);
    else if (!item.id && item.children) {
      const note = document.createElement("span");
      note.className = "layout-color-contents";
      note.textContent = item.children.map((child) => child.name).join("・");
      line.appendChild(note);
    } else {
      const gap = document.createElement("span");
      gap.className = "layout-color-chips";
      line.appendChild(gap);
    }
    makeColorOpen(line, () => {
      if (group.classList.contains("is-open")) closeColorGroup(group);
      else openColorGroup(group);
    });
    const body = document.createElement("div");
    body.className = "layout-color-group-body";
    body.hidden = true;
    const subs = document.createElement("div");
    subs.className = "layout-color-subs";
    item.children.forEach((child) => subs.appendChild(makeColorSub(child)));
    const done = document.createElement("button");
    done.type = "button";
    done.className = "gct-btn gct-btn-primary layout-color-done";
    done.textContent = "これでOK";
    done.addEventListener("click", () => closeColorGroup(group));
    body.appendChild(subs);
    body.appendChild(done);
    group.appendChild(line);
    group.appendChild(body);
    if (movable) bindLayoutColorMoveDrag(group);
    return group;
  }

  function makeColorDirect(item) {
    const row = document.createElement("div");
    row.className = "layout-color-row layout-color-move";
    row.setAttribute("data-color-move", item.id);
    row.setAttribute("data-color-step", item.stepId);
    const line = makeColorLine(item.name, { handle: true });
    line.appendChild(makeColorChips(item));
    makeColorOpen(line, () => {
      if (row.classList.contains("is-open")) closeLayoutColorRow(row);
      else openLayoutColorHoney(row);
    });
    const body = document.createElement("div");
    body.className = "layout-color-body";
    body.hidden = true;
    row.appendChild(line);
    row.appendChild(body);
    bindLayoutColorMoveDrag(row);
    return row;
  }

  function bindLayoutColorMoveDrag(row) {
    const handle = row.querySelector(":scope > .layout-color-line > .layout-inner-handle");
    if (!handle) return;
    handle.addEventListener("pointerdown", (ev) => {
      if (ev.button != null && ev.button !== 0) return;
      if (row.classList.contains("is-open")) return;
      ev.preventDefault();
      ev.stopPropagation();
      const list = row.parentElement;
      if (!list) return;
      const originY = ev.clientY;
      let startY = ev.clientY;
      let changed = false;
      row.classList.add("is-dragging");
      document.body.classList.add("is-color-move-dragging");
      const target = previewEl(colorRowPreviewSelector(row));
      const edgeRows = Array.prototype.slice.call(list.querySelectorAll(":scope > .layout-color-move"));
      if (target) {
        centerPreviewBlock(target, rowListEdge(row, edgeRows));
        markPreviewStick(target);
      }
      const onMove = (moveEv) => {
        if (Math.abs(moveEv.clientY - originY) <= 4) return;
        const y = clampDragClientY(row, moveEv.clientY, startY);
        const pins = list.querySelectorAll(":scope > .layout-color-pin");
        const pin = pins.length ? pins[pins.length - 1] : null;
        row.style.transform = "translateY(" + (y - startY) + "px)";
        for (let n = 0; n < 6; n += 1) {
          const hit = thirdSwapHit(row, "layout-color-move");
          if (!hit) break;
          const beforeTop = row.getBoundingClientRect().top;
          if (hit.place === "after") hit.other.after(row);
          else hit.other.before(row);
          startY = keepDragUnderPointer(row, y, beforeTop, startY);
          if (writeColorMoveOrder(list)) applyLayoutOrderToPreview({ skipColorSync: true });
          changed = true;
        }
        if (pin) {
          const over = pin.getBoundingClientRect().bottom - row.getBoundingClientRect().top;
          if (over > 0) {
            const match = /translateY\(([-\d.]+)px\)/.exec(row.style.transform || "");
            const applied = match ? parseFloat(match[1]) : 0;
            row.style.transform = "translateY(" + (applied + over) + "px)";
            startY -= over;
          }
        }
        if (target) slideAndFollowPreview(target, row, moveEv.clientY >= originY);
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove, true);
        window.removeEventListener("pointerup", onUp, true);
        window.removeEventListener("pointercancel", onUp, true);
        row.style.transform = "";
        row.classList.remove("is-dragging");
        document.body.classList.remove("is-color-move-dragging");
        releasePreviewDragFollow();
        if (changed) saveColorMoveOrder();
      };
      window.addEventListener("pointermove", onMove, true);
      window.addEventListener("pointerup", onUp, true);
      window.addEventListener("pointercancel", onUp, true);
    });
  }

  function mountLayoutColorSection() {
    const rows = document.getElementById("layout-color-rows");
    if (!rows || rows.childElementCount) return;
    rows.appendChild(makeColorGroup({ name: "全体色", children: COLOR_LIST_WHOLE }, "pin"));
    rows.appendChild(makeColorGroup(COLOR_LIST_BAND, "pin"));
    const byId = {};
    COLOR_LIST_MOVES.forEach((item) => {
      byId[item.id] = item.children ? makeColorGroup(item, "move") : makeColorDirect(item);
    });
    const catchRow = document.createElement("div");
    catchRow.className = "layout-color-row layout-color-move";
    catchRow.setAttribute("data-color-move", "catch-jump");
    const catchLine = makeColorLine("キャッチ", { handle: true });
    const catchSlot = document.createElement("span");
    catchSlot.className = "layout-color-chips";
    const catchChip = document.createElement("span");
    catchChip.className = "layout-color-chip";
    const catchChipLabel = document.createElement("span");
    catchChipLabel.className = "layout-color-chip-label";
    catchChipLabel.textContent = "文字";
    const catchSwatch = document.createElement("span");
    catchSwatch.className = "layout-color-chip-swatch";
    catchSwatch.setAttribute("data-chip-key", "heroInk");
    catchSwatch.setAttribute("data-chip-step", "hero-color");
    catchChip.appendChild(catchChipLabel);
    catchChip.appendChild(catchSwatch);
    catchSlot.appendChild(catchChip);
    catchLine.appendChild(catchSlot);
    makeColorOpen(catchLine, function () {
      openCatchFromLayout(catchWordsAreOn() ? "color" : "ask");
    });
    catchRow.appendChild(catchLine);
    bindLayoutColorMoveDrag(catchRow);
    byId["catch-jump"] = catchRow;
    colorMoveOrder().forEach((id) => {
      if (id === "hero-color") rows.appendChild(catchRow);
      if (byId[id]) rows.appendChild(byId[id]);
    });
    if (!catchRow.parentElement) rows.appendChild(catchRow);
    paintLayoutColorChips();
    syncLayoutColorRows();
    syncCatchColorAvailability();
  }

  function syncLayoutColorRows() {
    const section = document.getElementById("layout-color-section");
    if (!section) return;
    section.hidden = false;
    const rows = document.getElementById("layout-color-rows");
    if (!rows) return;
    rows.querySelectorAll(":scope > .layout-color-move").forEach(function (row) {
      const moveId = row.getAttribute("data-color-move");
      if (moveId === "catch-jump" && heroPlateIsOn()) {
        row.hidden = true;
        return;
      }
      const blockId = colorMoveBlockId(moveId);
      if (!blockId) return;
      const meta = LAYOUT_BLOCKS.find(function (b) { return b.id === blockId; });
      row.hidden = !isLayoutBlockActive(meta);
      if (moveId === "hero-color" && easyCatchOn() && !row.closest("#easy-catch-host")) row.hidden = true;
    });
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
    document.querySelectorAll('input[name="headingScale"]').forEach((input) => {
      input.addEventListener("change", () => {
        applyLiveColors(true);
        scheduleSave();
      });
    });
    document.querySelectorAll('input[name="accentBar"], input[name="accentBarOn"]').forEach((input) => {
      input.addEventListener("change", () => {
        applyAccentBarToRoot();
        scheduleSave();
      });
    });
  }

  function placeLookControls() {
    const controls = document.getElementById("look-controls");
    const finishHost = document.getElementById("look-controls-host-finish");
    const fontsBox = document.getElementById("look-controls-fonts");
    if (!controls || !finishHost) return;
    finishHost.appendChild(controls);
    if (fontsBox) fontsBox.hidden = true;
    /* レイアウト変更は構造のみ。見た目コントロールは出さない */
    const onLayoutStructure =
      store.siteColorMode === "detail" &&
      (store.selfEditingStepId === "layout" || store.hubUiMode === "layout");
    controls.hidden = !!onLayoutStructure;
  }

  function applyColorsToRoot(colors) {
    const c = { ...DEFAULTS, ...colors };
    c.pageBgSoft = softFrom(c.pageBg);
    c.bodyMuted = softMuted(c.bodyInk);
    Object.keys(VAR_MAP).forEach((key) => {
      if (c[key]) root.style.setProperty(VAR_MAP[key], c[key]);
    });
    const radius = fieldValue("radius") || c.radius || DEFAULTS.radius;
    const headingScale = normalizeHeadingScale(
      fieldValue("headingScale") || c.headingScale || DEFAULTS.headingScale
    );
    root.style.setProperty("--radius", radius);
    root.style.setProperty("--heading-scale", headingScale);
    applyAccentBarToRoot();
    scheduleHeroCopyFitCheck();
  }

  function applyCountToPreview(id, count) {
    const block = document.getElementById(id);
    if (!block) return;
    if (ITEM_SLOT_IDS[id]) {
      seedItemOrder(id);
      block.setAttribute("data-count", String((store.itemOrders[id] || []).length));
      applyItemLayoutToPreview(id);
      return;
    }
    const meta = COUNT_META[id];
    const items = Array.from(block.querySelectorAll(":scope > [data-sample-item]"));
    let n = Number(count);
    if (id === "hero-leads" && n === 0) {
      n = 0;
    } else if (meta) {
      n = Math.min(meta.max, Math.max(meta.min, n));
    }
    block.setAttribute("data-count", String(n));
    items.forEach((item, i) => {
      item.hidden = i >= n;
    });
    applyItemLayoutToPreview(id);
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
      if (store.blankCanvas) {
        body.innerHTML = "";
        return;
      }
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
    const typed = value != null && String(value).trim() !== "" ? String(value).trim() : "";
    if (store.blankCanvas) {
      const keep = typed || (["開く項目", "カード", "ご連絡"].indexOf(String(fallback || "").trim()) >= 0 ? String(fallback).trim() : "");
      el.textContent = keep;
      return;
    }
    const v = typed || fallback;
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
    document.querySelectorAll("#works-list > [data-item-id]").forEach((li) => {
      const m = /^work_(\d+)$/.exec(li.getAttribute("data-item-id") || "");
      if (!m) return;
      const i = Number(m[1]) - 1;
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

  function paintAnnounceFromForm() {
    const lead = document.getElementById("announce-lead");
    const go = document.getElementById("announce-go");
    const text = String(fieldValue("announce_text") || "");
    const label = String(fieldValue("announce_label") || "");
    const url = String(fieldValue("announce_url") || "").trim();
    if (lead) lead.textContent = text;
    if (!go) return;
    const action = go.closest(".announce-action") || go;
    action.hidden = !store.announceLinkOn;
    if (!go.dataset.bound) {
      go.dataset.bound = "1";
      go.addEventListener("click", function (ev) {
        const href = String(fieldValue("announce_url") || "").trim();
        if (!href) ev.preventDefault();
      });
    }
    if (label) go.textContent = label;
    if (url) {
      go.setAttribute("href", url);
      go.setAttribute("target", "_blank");
      go.setAttribute("rel", "noopener");
    } else {
      go.setAttribute("href", "#");
      go.removeAttribute("target");
    }
  }

  function applyExtrasToPreview(extras) {
    const e = extras || { hours: false, access: false, address: false, announce: false };
    ["hours", "access", "address", "announce"].forEach((key) => {
      const section = document.querySelector('[data-extra="' + key + '"]');
      if (section) section.hidden = !e[key];
    });
  }

  function applyWorkCardLinks(fields) {
    const source = fields || formToObject();
    document.querySelectorAll("#works-list > [data-item-id]").forEach((li) => {
      const m = /^work_(\d+)$/.exec(li.getAttribute("data-item-id") || "");
      if (!m) return;
      const n = Number(m[1]);
      const url = String(source["work_" + n + "_url"] || "").trim();
      const label = String(source["work_" + n + "_link_label"] || "").trim() || "リンク先を見る";
      const link = li.querySelector("[data-work-link]");
      const labelEl = li.querySelector("[data-work-link-label]");
      if (!link) return;
      if (workLinkShown(n) && url) {
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
      const heroTitle = document.getElementById("hero-title");
      if (heroTitle) heroTitle.textContent = snap.fields.hero_title || "";
      document.querySelectorAll("#hero-leads [data-sample-item]").forEach((el, i) => {
        const key = "hero_lead_" + (i + 1);
        el.textContent = snap.fields[key] || "";
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
      document.querySelectorAll("#works-list > [data-item-id]").forEach((li) => {
        const m = /^work_(\d+)$/.exec(li.getAttribute("data-item-id") || "");
        if (!m) return;
        const n = Number(m[1]);
        const i = n - 1;
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
    if (stepId === "hours-text" && snap.fields) {
      const t = previewDefaults.text;
      const hoursLead = document.getElementById("hours-lead") || document.querySelector("#hours .section-lead");
      if (hoursLead) {
        hoursLead.textContent = resolvePreviewText(snap.fields.hours_text, "hours_text", t.hoursLead);
      }
    }
    if (stepId === "access-text" && snap.fields) {
      const t = previewDefaults.text;
      const accessLead = document.getElementById("access-lead") || document.querySelector("#access .section-lead");
      if (accessLead) {
        accessLead.textContent = resolvePreviewText(snap.fields.access_text, "access_text", t.accessLead);
      }
    }
    if (stepId === "address-text" && snap.fields) {
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

  /**
   * キャッチ写真の枠は固定。文がはみ出すときだけ、文字を少しずつ小さくする。
   */
  function fitHeroCopyToFrame() {
    const stage = document.querySelector("#preview-root .hero-stage");
    const plate = stage && stage.querySelector(".hero-copy-plate");
    if (!stage || !plate) return;
    plate.style.transform = "none";
    const stageH = stage.clientHeight;
    const stageW = stage.clientWidth;
    if (!stageH || !stageW) return;
    const pad = 8;
    const availH = Math.max(0, stageH - pad * 2);
    const availW = Math.max(0, stageW - pad * 2);
    const boxH = plate.offsetHeight;
    const boxW = plate.offsetWidth;
    if (!boxH || !boxW || (boxH <= availH && boxW <= availW)) {
      plate.style.transform = "";
      return;
    }
    const scale = Math.max(0.28, Math.min(availH / boxH, availW / boxW));
    plate.style.transformOrigin = "center center";
    plate.style.transform = "scale(" + (Math.round(scale * 100) / 100) + ")";
  }

  function restoreLineFrame(el) {
    if (!el) return;
    el.style.fontSize = "";
    el.style.display = "";
    el.style.webkitLineClamp = "";
    el.style.lineClamp = "";
    el.style.webkitBoxOrient = "";
    el.style.overflow = "";
  }

  function openLineFrame(el) {
    el.style.display = "block";
    el.style.webkitLineClamp = "unset";
    el.style.lineClamp = "unset";
    el.style.webkitBoxOrient = "unset";
    el.style.overflow = "visible";
  }

  /**
   * 見出し・カード文の枠（行数）を保ったまま、はみ出すときだけその文字を小さくする。
   */
  function fitElToLineFrame(el, lines) {
    if (!el) return;
    const text = String(el.textContent || "").replace(/\s+/g, "");
    if (!text) {
      restoreLineFrame(el);
      return;
    }
    if (!el.getClientRects().length) return;
    restoreLineFrame(el);
    openLineFrame(el);
    const base = parseFloat(window.getComputedStyle(el).fontSize) || 16;
    let lh = parseFloat(window.getComputedStyle(el).lineHeight);
    if (!(lh > 0)) lh = base * 1.45;
    const budget = lh * lines + 1;
    if (el.scrollHeight <= budget) {
      restoreLineFrame(el);
      return;
    }
    const floor = Math.max(12, base * 0.46);
    let lo = floor;
    let hi = base;
    let best = floor;
    let i;
    for (i = 0; i < 12; i++) {
      const mid = (lo + hi) / 2;
      el.style.fontSize = mid + "px";
      if (el.scrollHeight <= budget) {
        best = mid;
        lo = mid;
      } else {
        hi = mid;
      }
    }
    el.style.fontSize = (Math.round(best * 10) / 10) + "px";
  }

  function fitLogoToHeader() {
    const logo = document.getElementById("preview-logo-text");
    const inner = document.querySelector("#preview-root .header-inner");
    if (!logo || !inner || !logo.getClientRects().length) return;
    logo.style.fontSize = "";
    logo.style.whiteSpace = "";
    const maxW = Math.max(80, inner.clientWidth * 0.62);
    logo.style.whiteSpace = "nowrap";
    if (logo.scrollWidth <= maxW) {
      logo.style.whiteSpace = "";
      return;
    }
    const base = parseFloat(window.getComputedStyle(logo).fontSize) || 18;
    const floor = Math.max(11, base * 0.46);
    let lo = floor;
    let hi = base;
    let best = floor;
    let i;
    for (i = 0; i < 12; i++) {
      const mid = (lo + hi) / 2;
      logo.style.fontSize = mid + "px";
      if (logo.scrollWidth <= maxW) {
        best = mid;
        lo = mid;
      } else {
        hi = mid;
      }
    }
    logo.style.fontSize = (Math.round(best * 10) / 10) + "px";
  }

  function fitPreviewTextFrames() {
    const rootEl = document.getElementById("preview-root");
    if (!rootEl) return;
    fitLogoToHeader();
    [
      ["#about-label", 1],
      ["#works-label", 1],
      ["#contact-label", 1],
      ["#about-heading", 2],
      ["#works-heading", 2],
      ["#contact-heading", 2],
      ["#hours h2", 2],
      ["#access h2", 2],
      ["#announce h2", 2]
    ].forEach(function (pair) {
      fitElToLineFrame(rootEl.querySelector(pair[0]), pair[1]);
    });
    rootEl.querySelectorAll(".hero-value-title").forEach(function (el) {
      fitElToLineFrame(el, 2);
    });
    rootEl.querySelectorAll("#hero-values > li > p:last-child").forEach(function (el) {
      fitElToLineFrame(el, 5);
    });
    rootEl.querySelectorAll("#works-list h3").forEach(function (el) {
      fitElToLineFrame(el, 2);
    });
    rootEl.querySelectorAll("#works-list .work-item-copy p").forEach(function (el) {
      fitElToLineFrame(el, 4);
    });
    rootEl.querySelectorAll("#about-accordions summary").forEach(function (el) {
      fitElToLineFrame(el, 2);
    });
    rootEl.querySelectorAll("#about .section-lead, #works-lead, #hours-lead, #access-lead, #announce-lead, #address-lead").forEach(function (el) {
      fitElToLineFrame(el, 6);
    });
    rootEl.querySelectorAll("#contact .contact-band-lead").forEach(function (el) {
      fitElToLineFrame(el, 4);
    });
    rootEl.querySelectorAll("#about-accordions .accordion-body").forEach(function (el) {
      fitElToLineFrame(el, 8);
    });
  }

  let heroFitQueued = false;
  function queueHeroCopyFit() {
    if (heroFitQueued) return;
    heroFitQueued = true;
    window.requestAnimationFrame(function () {
      heroFitQueued = false;
      fitPreviewTextFrames();
      fitHeroCopyToFrame();
      clipPreviewToFooter();
    });
  }

  function setupHeroCopyFit() {
    const stage = document.querySelector("#preview-root .hero-stage");
    if (!stage || stage.dataset.fitBound === "1") return;
    stage.dataset.fitBound = "1";
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(function () {
        queueHeroCopyFit();
      });
      ro.observe(stage);
    } else {
      window.addEventListener("resize", queueHeroCopyFit);
    }
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        queueHeroCopyFit();
      });
    }
    const preview = document.getElementById("preview-root");
    if (preview && preview.dataset.accFit !== "1") {
      preview.dataset.accFit = "1";
      preview.addEventListener("toggle", function (ev) {
        const t = ev.target;
        if (!t || !t.classList || !t.classList.contains("accordion")) return;
        queueHeroCopyFit();
      }, true);
    }
  }

  function applyAllConfirmed(opts) {
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

    /* 表紙±など: draftCounts を正とする（確定スナップより後で上書き） */
    COUNT_IDS.forEach((id) => {
      if (store.draftCounts[id] != null) {
        if (ITEM_SLOT_IDS[id]) alignItemOrderToCount(id);
        applyCountToPreview(id, store.draftCounts[id]);
      }
    });

    applyFontsToRoot(Object.assign({}, fonts, readDraftFonts()));
    applyLiveColors(false);
    if (!opts || !opts.skipImages) applyAllImages();

    extras = {
      ...extras,
      hours: !!(store.draftExtras && store.draftExtras.hours),
      access: !!(store.draftExtras && store.draftExtras.access),
      address: !!(store.draftExtras && store.draftExtras.address),
      announce: !!(store.draftExtras && store.draftExtras.announce)
    };
    applyExtrasToPreview(extras);
    applyDraftTextsFromForm();
    applyWorkCardLinks();
    applyContactFlagsToPreview();
    syncFooterBrand();
    applyAllItemLayoutsToPreview();
    applyAboutItemsDisplay();
    syncEasyBasicsPublish();
    setupHeroCopyFit();
    queueHeroCopyFit();
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

  function captureStepSnapshot(stepId, fieldsOverride) {
    const snap = { stepId: stepId, at: new Date().toISOString() };
    const fields = fieldsOverride || formToObject();

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
    if (stepId === "site-fonts") {
      snap.fonts = {
        display: fieldValue("font_display") || "Shippori Mincho",
        catch: fieldValue("font_catch") || "Shippori Mincho",
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
    if (stepId === "hours-text") {
      snap.fields = { hours_text: fields.hours_text || "" };
    }
    if (stepId === "access-text") {
      snap.fields = { access_text: fields.access_text || "" };
    }
    if (stepId === "address-text") {
      snap.fields = { address_text: fields.address_text || "" };
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
        url_slug_wish: fields.url_slug_wish || "",
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

  function applyLayoutOrderToPreview(opts) {
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
      const on = isLayoutBlockActive(meta);
      el.hidden = !on;
      if (!on) return;
      el.setAttribute("data-layout-size", layoutSizeFor(id, setId));
      nodes.push(el);
    });
    const orderedIds = new Set(nodes.map((el) => el.getAttribute("data-layout-block")));
    const extras = Array.from(main.children).filter((el) => {
      const bid = el.getAttribute("data-layout-block");
      if (bid && orderedIds.has(bid)) return false;
      return true;
    });
    nodes.forEach((el) => main.appendChild(el));
    extras.forEach((el) => main.appendChild(el));
    applyExtrasToPreview({
      hours: !!(store.draftExtras && store.draftExtras.hours),
      access: !!(store.draftExtras && store.draftExtras.access),
      address: !!(store.draftExtras && store.draftExtras.address),
      announce: !!(store.draftExtras && store.draftExtras.announce)
    });
    paintAnnounceFromForm();
    if (!opts || !opts.skipColorSync) syncColorMoveRowsFromPreview();
  }

  function swapLayoutBlocks(aId, bId) {
    if (!aId || !bId || aId === bId) return;
    const order = normalizeLayoutOrder(store.layoutOrder).slice();
    const ia = order.indexOf(aId);
    const ib = order.indexOf(bId);
    if (ia < 0 || ib < 0) return;
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

  function patchOwnerSnapshotCount(countId) {
    const owner = COUNT_OWNER_STEP[countId];
    if (!owner || !store.confirmed[owner]) return;
    const snap = store.snapshots[owner];
    if (!snap) return;
    if (!snap.counts) snap.counts = {};
    snap.counts[countId] = Number(store.draftCounts[countId]);
  }

  function adjustDraftCount(countId, delta, scrollSel, opts) {
    opts = opts || {};
    const meta = COUNT_META[countId];
    if (!meta) return;
    if (ITEM_SLOT_IDS[countId]) seedItemOrder(countId);
    const cur = ITEM_SLOT_IDS[countId]
      ? store.itemOrders[countId].length
      : Number(store.draftCounts[countId] || meta.defaultCount || 1);
    if (delta > 0 && !opts.skipGrowPrompt && ITEM_LAYOUT_IDS.indexOf(countId) >= 0) {
      requestAddDraftCount(countId, scrollSel);
      return;
    }
    const next = Math.max(meta.min, Math.min(meta.max, cur + delta));
    if (next === cur) return;
    if (!opts.skipUndo) pushLayoutUndo();
    if (ITEM_SLOT_IDS[countId]) {
      const order = store.itemOrders[countId];
      const parked = store.itemOrderParked[countId];
      const layout = normalizeItemLayout(countId);
      while (order.length > next) parked.push(order.pop());
      while (order.length < next) {
        if (parked.length) {
          order.push(parked.pop());
        } else {
          const slot = smallestUnusedSlot(countId);
          if (!slot) break;
          if (layout) {
            layout.sizeById[slot] = "L";
            layout.focalXById[slot] = ITEM_FOCAL_DEFAULT;
            layout.focalYById[slot] = ITEM_FOCAL_DEFAULT;
          }
          order.push(slot);
        }
      }
      store.draftCounts[countId] = order.length;
    } else {
      store.draftCounts[countId] = next;
    }
    patchOwnerSnapshotCount(countId);
    syncCountLabels();
    applyAllItemLayoutsToPreview();
    renderLayoutArrangeWire();
    if (scrollSel) scrollPreviewTo(scrollSel);
    if (store.confirmed.finish) unconfirmFinishSoft();
    scheduleSave();
  }

  function openLayoutLinkedStep(stepId) {
    stepId = resolveStepId(stepId);
    if (!stepId) return;
    if (!canOpenStep(stepId)) {
      showUnlockHint(stepId);
      return;
    }
    const blockMeta = LAYOUT_BLOCKS.find((b) =>
      (b.links || []).some((l) => resolveStepId(l.step) === stepId)
    );
    if (blockMeta) {
      window.setTimeout(() => scrollPreviewTo(blockMeta.selector), 40);
    }
    if (
      store.siteColorMode === "detail" &&
      GUIDED_COLOR_TUNE_IDS.includes(stepId)
    ) {
      gctOpenPaletteColor(stepId);
      return;
    }
    openStep(stepId);
  }

  function moveLayoutIdNear(fromId, toId, place) {
    if (!fromId || !toId || fromId === toId) return false;
    const order = normalizeLayoutOrder(store.layoutOrder).slice();
    const from = order.indexOf(fromId);
    const to = order.indexOf(toId);
    if (from < 0 || to < 0) return false;
    order.splice(from, 1);
    let insertAt = order.indexOf(toId);
    if (insertAt < 0) return false;
    if (place === "after") insertAt += 1;
    order.splice(insertAt, 0, fromId);
    const prev = (store.layoutOrder || []).join(",");
    const next = order.join(",");
    if (prev === next) return false;
    store.layoutOrder = order;
    return true;
  }

  function moveLayoutIdBefore(fromId, toId) {
    return moveLayoutIdNear(fromId, toId, "before");
  }

  /**
   * 上→下は after、下→上は before。
   * 常に before だと「次の枠の直前」＝動かない／もっと下まで行かないと確定しない。
   */
  function dragPlaceFor(fromId, toId, orderSnap) {
    const order = normalizeLayoutOrder(orderSnap || store.layoutOrderBeforeDrag || store.layoutOrder);
    const fromIndex = order.indexOf(fromId);
    const toIndex = order.indexOf(toId);
    if (fromIndex < 0 || toIndex < 0) return "before";
    return fromIndex < toIndex ? "after" : "before";
  }

  function dropPlaceFromPointer(ev, cell) {
    if (!ev || !cell) return "before";
    const rect = cell.getBoundingClientRect();
    if (!rect.height) return "before";
    return ev.clientY > rect.top + rect.height / 2 ? "after" : "before";
  }

  function syncArrangeWireOrderFromStore() {
    const host = document.getElementById("layout-arrange-wire");
    if (!host) return;
    normalizeLayoutOrder(store.layoutOrder).forEach((id) => {
      const cell = host.querySelector('.layout-arrange-cell[data-layout-block="' + id + '"]');
      if (cell) host.appendChild(cell);
    });
  }

  function scheduleApplyLayoutAfterDrag() {
    if (store._layoutWireRenderTimer) window.clearTimeout(store._layoutWireRenderTimer);
    store._layoutWireRenderTimer = window.setTimeout(() => {
      store._layoutWireRenderTimer = null;
      applyLayoutOrderToPreview();
      renderLayoutArrangeWire();
    }, 0);
  }

  /* 互換：旧名呼び出しは遅延適用に寄せる */
  function scheduleRenderLayoutArrangeWire() {
    scheduleApplyLayoutAfterDrag();
  }

  function flashPreviewBlock(selector) {
    if (!selector) return;
    const target = root.querySelector(selector);
    if (!target) return;
    target.classList.add("is-target-flash");
    window.setTimeout(() => target.classList.remove("is-target-flash"), 600);
  }

  function layoutArrangeHosts() {
    return [document.getElementById("layout-arrange-wire")].filter(Boolean);
  }

  function buildLayoutArrangeCountRow(axisLabel, countId, blockSelector) {
    const meta = COUNT_META[countId];
    if (!meta) return null;
    const row = document.createElement("div");
    row.className = "layout-count-row";
    const lab = document.createElement("span");
    lab.className = "layout-count-axis";
    lab.textContent = axisLabel;
    const minus = document.createElement("button");
    minus.type = "button";
    minus.className = "layout-count-btn";
    minus.textContent = "−";
    minus.setAttribute("aria-label", axisLabel + "を減らす");
    minus.disabled = Number(store.draftCounts[countId]) <= meta.min;
    minus.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      adjustDraftCount(countId, -1, blockSelector);
    });
    const plus = document.createElement("button");
    plus.type = "button";
    plus.className = "layout-count-btn";
    plus.textContent = "＋";
    plus.setAttribute("aria-label", axisLabel + "を増やす");
    plus.disabled = Number(store.draftCounts[countId]) >= meta.max;
    plus.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      requestAddDraftCount(countId, blockSelector, plus);
    });
    row.appendChild(lab);
    row.appendChild(minus);
    row.appendChild(plus);
    return row;
  }


  function buildLayoutGapRow(countId) {
    if (ITEM_LAYOUT_IDS.indexOf(countId) < 0) return null;
    const layout = normalizeItemLayout(countId);
    const row = document.createElement("div");
    row.className = "layout-gap-row";
    row.setAttribute("data-gap-for", countId);
    row.setAttribute("role", "group");
    const gapKind = countId === "works-list" ? "カード同士のすき間" : "写真同士のすき間";
    row.setAttribute("aria-label", gapKind);
    const lead = document.createElement("span");
    lead.className = "layout-gap-lead";
    lead.textContent = "すき間";
    row.appendChild(lead);
    ITEM_GAP_STEPS.forEach((gap) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "layout-gap-btn" + (layout && layout.gap === gap ? " is-active" : "");
      btn.setAttribute("data-gap", gap);
      btn.textContent = ITEM_GAP_LABELS[gap] || gap;
      btn.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        setItemGap(countId, gap);
      });
      row.appendChild(btn);
    });
    return row;
  }
  function textStepHasEmptyRequired(stepId) {
    const block = form.querySelector('.dash-block[data-step-id="' + stepId + '"]');
    if (!block) return false;
    let empty = false;
    block.querySelectorAll("input[name], textarea[name]").forEach((el) => {
      if (empty) return;
      const name = el.getAttribute("name") || "";
      if (!name) return;
      if (el.type === "file" || el.type === "checkbox" || el.type === "radio" || el.type === "hidden") return;
      if (/_url$|_link_label$/.test(name)) return;
      if (!isFieldVisible(el)) return;
      if (!String(el.value || "").trim()) empty = true;
    });
    return empty;
  }

  function layoutBlockGapHints(meta) {
    const parts = [];
    (meta.links || []).forEach((link) => {
      if (link.kind === "text" && textStepHasEmptyRequired(link.step)) {
        if (parts.indexOf("文字未入力") < 0) parts.push("文字未入力");
      }
    });
    return parts;
  }

  function layoutBlockDisplayLabel(meta) {
    if (!meta) return "";
    const fieldById = {
      accordions: ["about_heading", "about_section_name"],
      works: ["works_heading", "works_section_name"],
      contact: ["contact_section_name", "contact_label"]
    };
    const fields = fieldById[meta.id] || [];
    for (let i = 0; i < fields.length; i += 1) {
      const live = resolvePreviewText(fieldValue(fields[i]), fields[i], "");
      if (live) return live;
    }
    return meta.label;
  }

  function normalizeAboutItemsDisplay(v) {
    return v === "flat" ? "flat" : "accordion";
  }

  function syncAboutItemsDisplayUi() {
    const mode = normalizeAboutItemsDisplay(store.aboutItemsDisplay);
    form.querySelectorAll('input[name="about_items_display"]').forEach((input) => {
      input.checked = input.value === mode;
    });
  }

  function applyAboutItemsDisplay() {
    const mode = normalizeAboutItemsDisplay(store.aboutItemsDisplay);
    store.aboutItemsDisplay = mode;
    const list = document.getElementById("about-accordions");
    if (!list) return;
    list.setAttribute("data-items-display", mode);
    list.classList.toggle("is-flat-items", mode === "flat");
    list.classList.toggle("is-accordion-items", mode !== "flat");
    if (mode === "flat") {
      store.previewAccordionLookOpen = false;
      list.classList.remove("is-accordion-look");
      list.querySelectorAll("details.accordion").forEach((el) => {
        el.open = true;
      });
    } else {
      const look = !!store.previewAccordionLookOpen;
      list.classList.toggle("is-accordion-look", look);
      list.querySelectorAll("details.accordion").forEach((el) => {
        el.open = look;
      });
    }
    syncAboutItemsDisplayUi();
  }

  function setAboutItemsDisplay(mode) {
    store.aboutItemsDisplay = normalizeAboutItemsDisplay(mode);
    store.previewAccordionLookOpen = false;
    applyAboutItemsDisplay();
    scheduleSave();
  }

  function setupAboutItemsDisplay() {
    form.querySelectorAll('input[name="about_items_display"]').forEach((input) => {
      if (input.dataset.aboutDisplayBound === "1") return;
      input.dataset.aboutDisplayBound = "1";
      input.addEventListener("change", () => {
        if (!input.checked) return;
        setAboutItemsDisplay(input.value);
      });
    });
    syncAboutItemsDisplayUi();
  }

  function setupHubTips(scope) {
    const rootEl = scope || document;
    rootEl.querySelectorAll("[data-hub-tip]").forEach((btn) => {
      if (btn.dataset.tipBound === "1") return;
      btn.dataset.tipBound = "1";
      const wrap = btn.closest(".hub-tip-wrap");
      const pop = wrap ? wrap.querySelector(".hub-tip-pop") : null;
      if (!pop) return;
      pop.hidden = true;
      btn.setAttribute("aria-expanded", "false");
      btn.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const willShow = !!pop.hidden;
        document.querySelectorAll(".hub-tip-pop").forEach((p) => {
          p.hidden = true;
        });
        document.querySelectorAll("[data-hub-tip]").forEach((b) => {
          b.setAttribute("aria-expanded", "false");
        });
        pop.hidden = !willShow;
        btn.setAttribute("aria-expanded", willShow ? "true" : "false");
      });
    });
  }

  function refreshLayoutArrangeWireLabels() {
    document.querySelectorAll(".layout-arrange-cell[data-layout-block]").forEach((cell) => {
      const id = cell.getAttribute("data-layout-block");
      const meta = LAYOUT_BLOCKS.find((b) => b.id === id);
      if (!meta) return;
      const label = layoutBlockDisplayLabel(meta);
      const nameEl = cell.querySelector(".layout-arrange-name");
      if (nameEl) nameEl.textContent = label;
      const on = isLayoutBlockActive(meta);
      cell.classList.toggle("is-layout-off", !on);
      cell.setAttribute(
        "aria-label",
        label + (on ? "（表示中・ドラッグで並び替え）" : "（非表示・ドラッグで並び替え）")
      );
      const check = cell.querySelector(".layout-arrange-vis");
      if (check) check.checked = on;
    });
  }

  let layoutArrangeHintTimer = null;
  function clearLayoutArrangeToastPlace(hint) {
    if (!hint || !hint.style) return;
    hint.style.left = "";
    hint.style.top = "";
    hint.style.bottom = "";
    hint.style.maxWidth = "";
    hint.style.transform = "";
  }
  function placeLayoutArrangeToastInDashPane(hint) {
    if (!hint || !hint.classList.contains("is-toast") || hint.hidden) {
      clearLayoutArrangeToastPlace(hint);
      return;
    }
    const pane = document.querySelector(".dash-pane");
    if (!pane) {
      clearLayoutArrangeToastPlace(hint);
      return;
    }
    const r = pane.getBoundingClientRect();
    const pad = 16;
    hint.style.left = Math.round(r.left + r.width / 2) + "px";
    hint.style.top = Math.round(r.top + r.height / 2) + "px";
    hint.style.bottom = "auto";
    hint.style.maxWidth = Math.round(Math.min(22 * 16, Math.max(120, r.width - pad * 2))) + "px";
    hint.style.transform = "translate(-50%, -50%)";
  }
  function showLayoutArrangeHint(msg, durationMs) {
    document.querySelectorAll(".layout-arrange-hint").forEach((hint) => {
      const text = String(msg || "").trim();
      if (!text) {
        hint.hidden = true;
        hint.textContent = "";
        hint.classList.remove("is-toast");
        clearLayoutArrangeToastPlace(hint);
        return;
      }
      hint.hidden = false;
      hint.textContent = text;
      const ms =
        durationMs != null
          ? Number(durationMs)
          : /戻しました|最低1つ/.test(text)
            ? 1800
            : 0;
      hint.classList.toggle("is-toast", ms > 0);
      if (ms > 0) placeLayoutArrangeToastInDashPane(hint);
      else clearLayoutArrangeToastPlace(hint);
      if (layoutArrangeHintTimer) {
        window.clearTimeout(layoutArrangeHintTimer);
        layoutArrangeHintTimer = null;
      }
      if (ms > 0) {
        layoutArrangeHintTimer = window.setTimeout(() => {
          layoutArrangeHintTimer = null;
          showLayoutArrangeHint("");
        }, ms);
      }
    });
  }
  if (!window.__layoutArrangeToastPlaceBound) {
    window.__layoutArrangeToastPlaceBound = true;
    window.addEventListener(
      "resize",
      () => {
        document.querySelectorAll(".layout-arrange-hint.is-toast").forEach((hint) => {
          placeLayoutArrangeToastInDashPane(hint);
        });
      },
      { passive: true }
    );
  }

  function restoreLayoutSectionInputs() {
    document.querySelectorAll("[data-layout-input-home]").forEach((node) => {
      const stepId = node.getAttribute("data-layout-input-home");
      const home = stepId
        ? form.querySelector('.dash-block[data-step-id="' + stepId + '"]')
        : null;
      if (home) home.appendChild(node);
      node.removeAttribute("data-layout-input-home");
    });
  }

  const LAYOUT_SECTION_INPUTS = {
    values: ["values-text"],
    accordions: ["about-text"],
    hours: ["hours-text"],
    access: ["access-text"],
    address: ["address-text"],
    contact: ["contact-text"]
  };

  function mountLayoutSectionInputs(body, blockId) {
    const steps = LAYOUT_SECTION_INPUTS[blockId] || [];
    steps.forEach((stepId) => {
      const block = form.querySelector('.dash-block[data-step-id="' + stepId + '"]');
      if (!block) return;
      Array.from(block.children).forEach((child) => {
        if (!child || child.tagName === "SUMMARY") return;
        child.setAttribute("data-layout-input-home", stepId);
        body.appendChild(child);
      });
    });
  }

  function buildLayoutMiniDiagram(meta) {
    if (!meta) return null;
    if (meta.id === "hero") {
      const wrap = document.createElement("span");
      wrap.className = "layout-mini";
      wrap.setAttribute("aria-hidden", "true");
      const bar = document.createElement("span");
      bar.className = "layout-mini-bar layout-mini-bar--wide";
      wrap.appendChild(bar);
      return wrap;
    }
    if (meta.id !== "photos" && meta.id !== "works") return null;
    const countId = meta.id === "photos" ? "about-photos" : "works-list";
    seedItemOrder(countId);
    const order = (store.itemOrders && store.itemOrders[countId]) || [];
    const layout = normalizeItemLayout(countId);
    const wrap = document.createElement("span");
    wrap.className = "layout-mini";
    wrap.setAttribute("aria-hidden", "true");
    wrap.setAttribute("data-gap", (layout && layout.gap) || "normal");
    order.forEach((slot) => {
      const sz = layout && layout.sizeById ? layout.sizeById[slot] : "L";
      const bar = document.createElement("span");
      bar.className = "layout-mini-bar " + (sz === "H" ? "is-half" : "is-full");
      wrap.appendChild(bar);
    });
    return wrap;
  }

  function isLayoutImageBlock(blockId) {
    return blockId === "hero" || blockId === "photos" || blockId === "works";
  }

  function layoutImageCountId(blockId) {
    if (blockId === "photos") return "about-photos";
    if (blockId === "works") return "works-list";
    return "";
  }

  function layoutFrameLabel(blockId, slot) {
    if (blockId === "photos") return "写真" + String(slot).replace("about_image_", "");
    if (blockId === "works") return "カード" + String(slot).replace("work_", "");
    return "キャッチ";
  }

  function layoutFrameImageName(blockId, slot) {
    if (blockId === "hero") return "hero_image";
    return itemSlotImageName(slot);
  }

  function layoutFrameLockKey(blockId, slot) {
    return layoutFrameImageName(blockId, slot);
  }

  function collectVisibleImageSlots() {
    const slots = [];
    activeLayoutOrder(store.layoutOrder).forEach((blockId) => {
      const meta = LAYOUT_BLOCKS.find((b) => b.id === blockId);
      if (!isLayoutBlockActive(meta) || !isLayoutImageBlock(blockId)) return;
      if (blockId === "hero") return;
      const countId = layoutImageCountId(blockId);
      seedItemOrder(countId);
      (store.itemOrders[countId] || []).forEach((slot) => {
        const name = layoutFrameImageName(blockId, slot);
        slots.push({
          key: name,
          input: name,
          prefer: "square",
          label: layoutFrameLabel(blockId, slot)
        });
      });
    });
    return slots;
  }

  function collectBlockImageSlots(blockId) {
    return collectVisibleImageSlots().filter((slot) => {
      if (blockId === "hero") return slot.key === "hero_image";
      if (blockId === "photos") return String(slot.key).indexOf("about_image_") === 0;
      if (blockId === "works") return /^work_\d+_image$/.test(slot.key);
      return false;
    });
  }

  function runLayoutSectionOmakase(blockId, button) {
    const slots = collectBlockImageSlots(blockId);
    let locked = 0;
    slots.forEach((slot) => {
      if (store.imgOmakaseLocks && store.imgOmakaseLocks[slot.key]) locked += 1;
    });
    const openCount = slots.length - locked;
    if (!slots.length || openCount <= 0) {
      openLayoutOmakaseNotice({
        title: "この列の写真は固定中です",
        body: "固定を外すと、ランダムに選んで写真を替えられます。",
        confirmLabel: "",
        allowSkip: false
      });
      return;
    }
    const run = () => {
      if (button) button.disabled = true;
      applyImgOmakaseFromCatalog({ onlyUnlocked: true, slots: slots }).then(
        function () {
          if (button) button.disabled = false;
          renderLayoutArrangeWire();
          scheduleSave();
        },
        function () {
          if (button) button.disabled = false;
        }
      );
    };
    if (store.imgOmakaseSkipConfirm) {
      run();
      return;
    }
    openLayoutOmakaseNotice({
      title: "この列をランダムに選びますか",
      body:
        "固定していない写真が、ギャラリーの写真に替わります。固定中の写真は変わりません。\n替わる写真：" +
        openCount +
        "枚\n固定中：" +
        locked +
        "枚",
      confirmLabel: "この列をランダムに選ぶ",
      allowSkip: true,
      onConfirm: function (skipNext) {
        if (skipNext) {
          store.imgOmakaseSkipConfirm = true;
          scheduleSave();
        }
        run();
      }
    });
  }

  function layoutPhotoReplaceLocked(blockId, slot) {
    const key = layoutFrameLockKey(blockId, slot);
    return !!(store.imgOmakaseLocks && store.imgOmakaseLocks[key]);
  }

  function rememberLayoutLockNoticeSkip(skipNext) {
    if (!skipNext || store.layoutLockNoticeSkip) return;
    store.layoutLockNoticeSkip = true;
    scheduleSave();
  }

  function showLayoutPhotoLockedNotice() {
    if (store.layoutLockNoticeSkip) return;
    openLayoutOmakaseNotice({
      title: "ランダム選択を止めてください",
      body: "変更したい画像のロックを解除してから、もう一度「ランダムに選ぶ」を押してください。",
      confirmLabel: "",
      allowSkip: true,
      onClose: rememberLayoutLockNoticeSkip
    });
  }

  function runLayoutPhotoOmakase(blockId, slot, button) {
    if (layoutPhotoReplaceLocked(blockId, slot)) {
      showLayoutPhotoLockedNotice();
      return;
    }
    const imageName = layoutFrameImageName(blockId, slot);
    const one = {
      key: imageName,
      input: imageName,
      prefer: blockId === "hero" ? "wide" : "square",
      label: blockId === "hero" ? "キャッチ" : layoutFrameLabel(blockId, slot)
    };
    if (button) button.disabled = true;
    applyImgOmakaseFromCatalog({ onlyUnlocked: true, slots: [one] }).then(
      function () {
        if (button) button.disabled = false;
        setLayoutFrameLocked(blockId, slot, true);
      },
      function () {
        if (button) button.disabled = false;
      }
    );
  }

  function syncOpenLayoutScale(box, scale) {
    if (!box) return;
    const s = normalizeImageScale(scale);
    const label = box.querySelector(".layout-adjust-scale");
    if (label) label.textContent = imageScaleLabel(s);
    const range = box.querySelector(".layout-zoom-range-input");
    if (range && document.activeElement !== range) {
      range.value = String(s);
    }
    const back = box.querySelector("[data-scale-reset]");
    const out = box.querySelector('[data-scale-nudge="out"]');
    if (back) back.disabled = s <= IMAGE_SCALE_DEFAULT;
    if (out) out.disabled = s >= IMAGE_SCALE_MAX;
  }

  function layoutFrameIsHome(blockId, slot) {
    const center = ITEM_FOCAL_DEFAULT;
    if (blockId === "hero") {
      ensureHeroFocalDefaults();
      return normalizeImageScale(store.heroImageScale) === IMAGE_SCALE_DEFAULT
        && store.heroFocalX === center
        && store.heroFocalY === center;
    }
    const layout = normalizeItemLayout(layoutImageCountId(blockId));
    if (!layout || !slot) return false;
    return normalizeImageScale(layout.scaleById && layout.scaleById[slot]) === IMAGE_SCALE_DEFAULT
      && normalizeFocalX(layout.focalXById[slot]) === center
      && normalizeFocalY(layout.focalYById[slot]) === center;
  }

  function syncOpenLayoutFocalButtons() {
    document.querySelectorAll(".layout-adjust-zoom[data-scale-block]").forEach((zoom) => {
      const blockId = zoom.getAttribute("data-scale-block");
      const slot = zoom.getAttribute("data-scale-slot") || "";
      if (blockId === "hero") {
        ensureHeroFocalDefaults();
        syncOpenLayoutScale(zoom, store.heroImageScale);
        return;
      }
      const countId = layoutImageCountId(blockId);
      const layout = normalizeItemLayout(countId);
      if (!layout || !slot) return;
      syncOpenLayoutScale(zoom, layout.scaleById && layout.scaleById[slot]);
    });
    document.querySelectorAll("#easy-img-layout-host .layout-frame-home").forEach((btn) => {
      const step = btn.closest(".layout-source-step");
      const map = step && step.querySelector(".layout-source-map");
      const blockId = map && map.getAttribute("data-mirror-block");
      const slot = map && map.getAttribute("data-mirror-slot");
      if (!blockId) return;
      btn.disabled = layoutFrameIsHome(blockId, slot);
    });
    syncLayoutMirrors();
  }

  function nudgeFrameImageScale(blockId, slot, dir) {
    const delta = dir === "in" ? -IMAGE_SCALE_STEP : IMAGE_SCALE_STEP;
    if (blockId === "hero") {
      const current = normalizeImageScale(store.heroImageScale);
      const next = normalizeImageScale(current + delta);
      if (next === current) return;
      store.heroImageScale = next;
      applyHeroFocalToPreview();
    } else {
      const countId = layoutImageCountId(blockId);
      const layout = normalizeItemLayout(countId);
      if (!layout) return;
      const current = normalizeImageScale(layout.scaleById && layout.scaleById[slot]);
      const next = normalizeImageScale(current + delta);
      if (next === current) return;
      pushLayoutUndo();
      layout.scaleById[slot] = next;
      applyItemLayoutToPreview(countId);
    }
    if (store.confirmed.finish) unconfirmFinishSoft();
    scheduleSave();
    syncOpenLayoutFocalButtons();
  }

  function setFrameImageScale(blockId, slot, value, pushUndo) {
    const next = normalizeImageScale(value);
    if (blockId === "hero") {
      const current = normalizeImageScale(store.heroImageScale);
      if (next === current) return;
      store.heroImageScale = next;
      applyHeroFocalToPreview();
    } else {
      const countId = layoutImageCountId(blockId);
      const layout = normalizeItemLayout(countId);
      if (!layout) return;
      const current = normalizeImageScale(layout.scaleById && layout.scaleById[slot]);
      if (next === current) return;
      if (pushUndo) pushLayoutUndo();
      layout.scaleById[slot] = next;
      applyItemLayoutToPreview(countId);
    }
    if (store.confirmed.finish) unconfirmFinishSoft();
    scheduleSave();
    syncOpenLayoutFocalButtons();
  }

  function setLayoutFrameFocal(blockId, slot, x, y, pushUndo) {
    const nx = blockId === "hero"
      ? normalizeFocalPercent(x, HERO_FOCAL_X_DEFAULT)
      : normalizeFocalX(x);
    const ny = normalizeFocalY(y);
    if (blockId === "hero") {
      ensureHeroFocalDefaults();
      if (nx === store.heroFocalX && ny === store.heroFocalY) return false;
      if (pushUndo) pushLayoutUndo();
      store.heroFocalX = nx;
      store.heroFocalY = ny;
      applyHeroFocalToPreview();
    } else {
      const countId = layoutImageCountId(blockId);
      const layout = normalizeItemLayout(countId);
      if (!layout || !slot) return false;
      if (nx === layout.focalXById[slot] && ny === layout.focalYById[slot]) return false;
      if (pushUndo) pushLayoutUndo();
      layout.focalXById[slot] = nx;
      layout.focalYById[slot] = ny;
      applyItemLayoutToPreview(countId);
    }
    if (store.confirmed.finish) unconfirmFinishSoft();
    scheduleSave();
    syncOpenLayoutFocalButtons();
    return true;
  }

  function focalFromWindowRatios(map, blockId, slot, leftRatio, topRatio) {
    const img = map.querySelector("img");
    const view = layoutFrameViewState(blockId, slot);
    const nw = img ? img.naturalWidth : 0;
    const nh = img ? img.naturalHeight : 0;
    if (!nw || !nh) return { x: view.focalX, y: view.focalY };
    const measured = layoutPreviewFrameRatio(blockId, slot);
    const frameRatio = measured > 0 ? measured : 16 / 9;
    const frameH = 100;
    const frameW = frameH * frameRatio;
    const z = Math.max(1, normalizeImageScale(view.scale) / 100);
    const cover = Math.max(frameW / nw, frameH / nh);
    const denomX = nw * cover - frameW + frameW * (1 - 1 / z);
    const denomY = nh * cover - frameH + frameH * (1 - 1 / z);
    const x = denomX ? (leftRatio * cover * nw) / denomX : view.focalX / 100;
    const y = denomY ? (topRatio * cover * nh) / denomY : view.focalY / 100;
    return {
      x: Math.max(0, Math.min(100, x * 100)),
      y: Math.max(0, Math.min(100, y * 100))
    };
  }

  function applyLiveFrameFocal(blockId, slot, x, y, scale) {
    const img = layoutPreviewPhotoEl(blockId, slot);
    if (!img) return;
    const s = normalizeImageScale(scale);
    img.style.objectFit = "cover";
    img.style.objectPosition = x + "% " + y + "%";
    img.style.transformOrigin = x + "% " + y + "%";
    if (s === IMAGE_SCALE_DEFAULT) img.style.removeProperty("transform");
    else img.style.transform = "scale(" + s / 100 + ")";
  }

  function bindSoloFrameDrag(map, blockId, slot) {
    if (!map || map.dataset.frameDragBound === "1") return;
    map.dataset.frameDragBound = "1";
    map.addEventListener("pointerdown", (ev) => {
      if (ev.button !== 0) return;
      if (ev.target.closest("button, a, input, .hub-tip-wrap")) return;
      const win = map.querySelector(".layout-source-window");
      if (!win) return;
      const mapRect = map.getBoundingClientRect();
      const winRect = win.getBoundingClientRect();
      const grabX = ev.clientX - winRect.left;
      const grabY = ev.clientY - winRect.top;
      const start = layoutFrameViewState(blockId, slot);
      const scale = start.scale;
      const live = { x: start.focalX, y: start.focalY, px: ev.clientX, py: ev.clientY };
      let raf = 0;
      map.classList.add("is-grabbing");
      if (map.setPointerCapture) {
        try { map.setPointerCapture(ev.pointerId); } catch (err) { /* pointer already gone */ }
      }
      const place = () => {
        const rect = map.getBoundingClientRect();
        const maxL = Math.max(0, rect.width - winRect.width);
        const maxT = Math.max(0, rect.height - winRect.height);
        const left = Math.max(0, Math.min(maxL, live.px - rect.left - grabX));
        const top = Math.max(0, Math.min(maxT, live.py - rect.top - grabY));
        win.style.left = (left / Math.max(1, rect.width)) * 100 + "%";
        win.style.top = (top / Math.max(1, rect.height)) * 100 + "%";
        const focal = focalFromWindowRatios(
          map,
          blockId,
          slot,
          left / Math.max(1, rect.width),
          top / Math.max(1, rect.height)
        );
        live.x = focal.x;
        live.y = focal.y;
        applyLiveFrameFocal(blockId, slot, live.x, live.y, scale);
      };
      const move = (e) => {
        live.px = e.clientX;
        live.py = e.clientY;
        if (raf) return;
        raf = window.requestAnimationFrame(() => {
          raf = 0;
          place();
        });
      };
      const up = (e) => {
        if (raf) {
          window.cancelAnimationFrame(raf);
          raf = 0;
        }
        live.px = e.clientX;
        live.py = e.clientY;
        place();
        map.classList.remove("is-grabbing");
        if (map.releasePointerCapture) {
          try { map.releasePointerCapture(e.pointerId); } catch (err) { /* already released */ }
        }
        map.removeEventListener("pointermove", move);
        map.removeEventListener("pointerup", up);
        map.removeEventListener("pointercancel", up);
        setLayoutFrameFocal(blockId, slot, live.x, live.y, true);
        paintLayoutSourceMap(map);
      };
      map.addEventListener("pointermove", move);
      map.addEventListener("pointerup", up);
      map.addEventListener("pointercancel", up);
    });
  }

  function resetLayoutFrameHome(blockId, slot) {
    const center = ITEM_FOCAL_DEFAULT;
    if (layoutFrameIsHome(blockId, slot)) return false;
    if (blockId === "hero") {
      pushLayoutUndo();
      store.heroImageScale = IMAGE_SCALE_DEFAULT;
      store.heroFocalX = center;
      store.heroFocalY = center;
      applyHeroFocalToPreview();
    } else {
      const countId = layoutImageCountId(blockId);
      const layout = normalizeItemLayout(countId);
      if (!layout || !slot) return false;
      pushLayoutUndo();
      layout.scaleById[slot] = IMAGE_SCALE_DEFAULT;
      layout.focalXById[slot] = center;
      layout.focalYById[slot] = center;
      applyItemLayoutToPreview(countId);
    }
    if (store.confirmed.finish) unconfirmFinishSoft();
    scheduleSave();
    syncOpenLayoutFocalButtons();
    return true;
  }

  function resetLayoutFrameFocal(blockId, slot) {
    if (blockId === "hero") {
      store.heroFocalX = HERO_FOCAL_X_DEFAULT;
      store.heroFocalY = HERO_FOCAL_Y_DEFAULT;
      applyHeroFocalToPreview();
    } else {
      const countId = layoutImageCountId(blockId);
      const layout = normalizeItemLayout(countId);
      if (!layout || !slot) return;
      layout.focalXById[slot] = ITEM_FOCAL_DEFAULT;
      layout.focalYById[slot] = ITEM_FOCAL_DEFAULT;
      applyItemLayoutToPreview(countId);
    }
    if (store.confirmed.finish) unconfirmFinishSoft();
    scheduleSave();
    syncOpenLayoutFocalButtons();
  }

  function layoutBlockIdForCount(countId) {
    if (countId === "about-photos") return "photos";
    if (countId === "works-list") return "works";
    return "";
  }

  function paintLayoutSizeWords(countId) {
    const blockId = layoutBlockIdForCount(countId);
    const layout = normalizeItemLayout(countId);
    if (!blockId || !layout) return;
    document.querySelectorAll('#easy-img-layout-host [data-layout-photo^="' + blockId + ':"] .layout-size-word').forEach((word) => {
      const row = word.closest("[data-layout-photo]");
      const key = row ? row.getAttribute("data-layout-photo") || "" : "";
      const slot = key.slice(key.indexOf(":") + 1);
      const sz = layout.sizeById && layout.sizeById[slot] === "H" ? "H" : "L";
      word.textContent = layoutSizeWord(sz);
      word.classList.toggle("is-half-word", sz === "H");
      word.classList.toggle("is-full-word", sz !== "H");
    });
  }

  function paintLayoutSizeMirrors(countId) {
    const blockId = layoutBlockIdForCount(countId);
    if (!blockId) return;
    document.querySelectorAll('#easy-img-layout-host [data-layout-photo^="' + blockId + ':"] .layout-closed-thumb').forEach(paintLayoutMirror);
  }

  function setLayoutFrameWidth(countId, slot, size) {
    const layout = normalizeItemLayout(countId);
    if (!layout || !slot) return;
    const form = document.querySelector(".dash-body > .fill-form");
    const previewScroll = document.querySelector(".preview-scroll");
    const formTop = form ? form.scrollTop : 0;
    const previewTop = previewScroll ? previewScroll.scrollTop : 0;
    const holdScroll = () => {
      if (form) form.scrollTop = formTop;
      if (previewScroll) previewScroll.scrollTop = previewTop;
    };
    pushLayoutUndo();
    layout.sizeById[slot] = size === "H" ? "H" : "L";
    applyItemLayoutToPreview(countId);
    paintLayoutSizeWords(countId);
    paintLayoutSizeMirrors(countId);
    holdScroll();
    window.requestAnimationFrame(holdScroll);
    if (store.confirmed.finish) unconfirmFinishSoft();
    scheduleSave();
  }

  function moveItemOrderNear(countId, fromId, toId, place) {
    seedItemOrder(countId);
    const order = store.itemOrders[countId];
    const from = order.indexOf(fromId);
    if (from < 0 || !toId || fromId === toId) return false;
    const before = order.join("\0");
    order.splice(from, 1);
    let at = order.indexOf(toId);
    if (at < 0) {
      order.splice(from, 0, fromId);
      return false;
    }
    if (place === "after") at += 1;
    order.splice(at, 0, fromId);
    return order.join("\0") !== before;
  }

  function itemDragPlace(fromId, toId, orderSnap) {
    const order = orderSnap || [];
    const fromIndex = order.indexOf(fromId);
    const toIndex = order.indexOf(toId);
    if (fromIndex < 0 || toIndex < 0) return "before";
    return fromIndex < toIndex ? "after" : "before";
  }

  function crossedDragSibling(row, siblingClass) {
    const box = row.getBoundingClientRect();
    const mid = box.top + box.height / 2;
    let next = row.nextElementSibling;
    while (next && !next.classList.contains(siblingClass)) next = next.nextElementSibling;
    if (next && !next.hidden) {
      const rect = next.getBoundingClientRect();
      if (rect.height > 2 && mid > rect.top + rect.height / 2) return { other: next, place: "after" };
    }
    let prev = row.previousElementSibling;
    while (prev && !prev.classList.contains(siblingClass)) prev = prev.previousElementSibling;
    if (prev && !prev.hidden) {
      const rect = prev.getBoundingClientRect();
      if (rect.height > 2 && mid < rect.top + rect.height / 2) return { other: prev, place: "before" };
    }
    return null;
  }

  function keepDragUnderPointer(row, clientY, beforeTop, startY) {
    const afterTop = row.getBoundingClientRect().top;
    const nextStart = startY + (afterTop - beforeTop);
    row.style.transform = "translateY(" + (clientY - nextStart) + "px)";
    return nextStart;
  }

  function liveSwapImageSections(cell, clientY) {
    if (!cell.closest("#easy-img-layout-host")) return;
    for (let n = 0; n < 6; n += 1) {
      const hit = crossedDragSibling(cell, "layout-arrange-cell");
      if (!hit) break;
      const fromId = cell.getAttribute("data-layout-block");
      const toId = hit.other.getAttribute("data-layout-block");
      const beforeTop = cell.getBoundingClientRect().top;
      if (!moveLayoutIdNear(fromId, toId, hit.place)) break;
      if (hit.place === "after") hit.other.after(cell);
      else hit.other.before(cell);
      applyLayoutOrderToPreview();
      store._layoutPointerStartY = keepDragUnderPointer(
        cell,
        clientY,
        beforeTop,
        store._layoutPointerStartY || clientY
      );
    }
  }

  function bindLayoutInnerDrag(row, countId, slotId) {
    const handle = row.querySelector(".layout-inner-handle");
    if (!handle) return;
    handle.addEventListener("pointerdown", (ev) => {
      if (ev.button != null && ev.button !== 0) return;
      ev.preventDefault();
      ev.stopPropagation();
      const list = row.parentElement;
      if (!list) return;
      let startY = ev.clientY;
      let touched = null;
      const frameBlock = countId === "about-photos" ? "photos" : countId === "works-list" ? "works" : "";
      const livePhoto = !!row.closest("#easy-img-layout-host");
      row.classList.add("is-dragging");
      const liveState = { undo: false };
      if (!livePhoto) followInnerPhotoDrag(frameBlock, slotId, row);
      const onMove = (moveEv) => {
        const y = livePhoto ? clampDragClientY(row, moveEv.clientY, startY) : moveEv.clientY;
        row.style.transform = "translateY(" + (y - startY) + "px)";
        if (livePhoto) {
          for (let n = 0; n < 6; n += 1) {
            const hit = thirdSwapHit(row, "layout-inner");
            if (!hit) break;
            const fromId = row.getAttribute("data-item-id");
            const toId = hit.other.getAttribute("data-item-id");
            const beforeTop = row.getBoundingClientRect().top;
            if (!liveState.undo) {
              pushLayoutUndo();
              liveState.undo = true;
            }
            if (!moveItemOrderNear(countId, fromId, toId, hit.place)) break;
            if (hit.place === "after") hit.other.after(row);
            else hit.other.before(row);
            applyItemLayoutToPreview(countId);
            startY = keepDragUnderPointer(row, y, beforeTop, startY);
          }
        }
        const mine = row.getBoundingClientRect();
        let best = null;
        let bestArea = 0;
        list.querySelectorAll(".layout-inner").forEach((other) => {
          other.classList.remove("is-touch");
          if (other === row) return;
          const rect = other.getBoundingClientRect();
          const overlapW = Math.min(mine.right, rect.right) - Math.max(mine.left, rect.left);
          const overlapH = Math.min(mine.bottom, rect.bottom) - Math.max(mine.top, rect.top);
          const area = overlapW > 0 && overlapH > 0 ? overlapW * overlapH : 0;
          if (area > bestArea) {
            bestArea = area;
            best = other;
          }
        });
        if (best) best.classList.add("is-touch");
        touched = best;
        if (!livePhoto) followInnerPhotoDrag(frameBlock, slotId, row);
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove, true);
        window.removeEventListener("pointerup", onUp, true);
        window.removeEventListener("pointercancel", onUp, true);
        row.style.transform = "";
        row.classList.remove("is-dragging");
        list.querySelectorAll(".layout-inner.is-touch").forEach((el) => el.classList.remove("is-touch"));
        releasePreviewDragFollow();
        if (livePhoto) {
          if (liveState.undo) {
            if (store.confirmed.finish) unconfirmFinishSoft();
            scheduleSave();
          }
          touched = null;
          return;
        }
        if (touched && touched.parentElement === list) {
          const dropId = touched.getAttribute("data-item-id");
          seedItemOrder(countId);
          const order = store.itemOrders[countId] || [];
          const from = order.indexOf(slotId);
          const to = dropId ? order.indexOf(dropId) : -1;
          if (dropId && dropId !== slotId && from >= 0 && to >= 0) {
            pushLayoutUndo();
            if (moveItemOrderNear(countId, slotId, dropId, from < to ? "after" : "before")) {
              applyItemLayoutToPreview(countId);
              renderLayoutArrangeWire();
              if (store.confirmed.finish) unconfirmFinishSoft();
              scheduleSave();
            }
          }
        }
        touched = null;
      };
      window.addEventListener("pointermove", onMove, true);
      window.addEventListener("pointerup", onUp, true);
      window.addEventListener("pointercancel", onUp, true);
    });
  }

  const layoutReplaceBefore = {};
  let layoutPhotoToolsFor = "";
  let layoutScrollPhoto = null;

  function layoutBlockSlots(blockId) {
    if (blockId === "hero") return ["hero"];
    const countId = layoutImageCountId(blockId);
    if (!countId) return [];
    seedItemOrder(countId);
    return (store.itemOrders[countId] || []).slice();
  }

  function layoutFrameViewState(blockId, slot) {
    if (blockId === "hero") {
      ensureHeroFocalDefaults();
      return {
        scale: store.heroImageScale,
        focalX: store.heroFocalX,
        focalY: store.heroFocalY
      };
    }
    const countId = layoutImageCountId(blockId);
    const layout = normalizeItemLayout(countId);
    return {
      scale: layout && layout.scaleById ? layout.scaleById[slot] : IMAGE_SCALE_DEFAULT,
      focalX: layout ? layout.focalXById[slot] : ITEM_FOCAL_DEFAULT,
      focalY: layout ? layout.focalYById[slot] : ITEM_FOCAL_DEFAULT
    };
  }

  function layoutPreviewPhotoEl(blockId, slot) {
    if (!root) return null;
    if (blockId === "hero") return root.querySelector(".hero-photo");
    const sel = layoutFramePreviewSelector(blockId, slot);
    const item = sel ? root.querySelector(sel) : null;
    if (!item) return null;
    return item.querySelector("img") || item;
  }

  function layoutPreviewFrameRatio(blockId, slot) {
    const sel = layoutFramePreviewSelector(blockId, slot);
    const target = sel ? root.querySelector(sel) : null;
    if (!target) return 0;
    const img = target.querySelector("img") || (target.tagName === "IMG" ? target : null);
    const el = img || target;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    if (w < 8 || h < 8) return 0;
    return w / h;
  }

  function rememberLayoutPhotoCenter(blockId, slot) {
    if (!blockId || slot == null || slot === "") return;
    const row = document.querySelector('[data-layout-photo="' + blockId + ":" + slot + '"]');
    const y = row ? row.getBoundingClientRect().top : null;
    layoutScrollPhoto = { blockId: blockId, slot: slot, y: y };
  }

  function scrollLayoutPhotoIntoCenter(blockId, slot) {
    const row = document.querySelector('[data-layout-photo="' + blockId + ":" + slot + '"]');
    if (!row) return;
    let scroller = row.parentElement;
    while (scroller && scroller !== document.body) {
      const oy = getComputedStyle(scroller).overflowY;
      if ((oy === "auto" || oy === "scroll") && scroller.scrollHeight > scroller.clientHeight + 1) break;
      scroller = scroller.parentElement;
    }
    const inset = 10;
    if (!scroller || scroller === document.body) {
      row.scrollIntoView({ block: "start", behavior: "auto" });
      return;
    }
    const delta = row.getBoundingClientRect().top - scroller.getBoundingClientRect().top - inset;
    scroller.scrollTop += delta;
  }

  function setOnlyLayoutFrameOpen(openKey, slot) {
    store.layoutInnerByBlock = {};
    if (openKey && slot) store.layoutInnerByBlock[openKey] = slot;
  }

  function markLayoutMirror(el, blockId, slot, mode) {
    el.classList.add("layout-mirror");
    el.setAttribute("data-mirror-block", blockId);
    el.setAttribute("data-mirror-slot", slot);
    el.setAttribute("data-mirror-mode", mode);
  }

  function paintLayoutMirror(box) {
    if (!box) return;
    const blockId = box.getAttribute("data-mirror-block") || "";
    const slot = box.getAttribute("data-mirror-slot") || "";
    const mode = box.getAttribute("data-mirror-mode") || "current";
    const img = box.querySelector("img");
    const view = layoutFrameViewState(blockId, slot);
    const countId = blockId === "hero" ? "" : layoutImageCountId(blockId);
    const layout = countId ? normalizeItemLayout(countId) : null;
    const half = !!(layout && layout.sizeById && layout.sizeById[slot] === "H");
    const measured = layoutPreviewFrameRatio(blockId, slot);
    const ratio = measured || (half ? 8 / 9 : 16 / 9);
    if (mode === "thumb") {
      const maxW = 76;
      const maxH = 46;
      const useRatio = measured > 0 ? measured : ratio;
      let boxW = maxW;
      let boxH = Math.max(1, Math.round(maxW / useRatio));
      if (boxH > maxH) {
        boxH = maxH;
        boxW = Math.max(1, Math.round(maxH * useRatio));
      }
      box.style.width = boxW + "px";
      box.style.height = boxH + "px";
      box.style.padding = "0";
      box.classList.remove("is-half");
      const imageName = layoutFrameImageName(blockId, slot);
      const src = layoutFramePreviewSrc(imageName);
      let face = img;
      if (src) {
        if (!face) {
          face = document.createElement("img");
          face.alt = "";
          face.draggable = false;
          box.insertBefore(face, box.firstChild);
        }
        if (face.getAttribute("src") !== src) face.src = src;
        applyImageScaleToImg(face, view.scale, view.focalX, view.focalY);
        if (blockId === "hero") {
          face.style.objectFit = "contain";
          face.style.removeProperty("transform");
          box.style.overflow = "visible";
          box.style.height = "auto";
        }
      }
      return;
    }
    const baseH = 132;
    let boxW = Math.round(baseH * ratio);
    let boxH = baseH;
    const host = box.closest(".layout-photo-editor") || box.closest(".layout-arrange") || box.parentElement;
    const maxW = host ? Math.max(72, host.clientWidth - 24) : boxW;
    if (boxW > maxW) {
      const fit = maxW / boxW;
      boxW = Math.round(boxW * fit);
      boxH = Math.round(boxH * fit);
    }
    box.style.width = boxW + "px";
    box.style.height = boxH + "px";
    if (img) applyImageScaleToImg(img, view.scale, view.focalX, view.focalY);
  }

  function paintLayoutSourceMap(box) {
    if (!box) return;
    const img = box.querySelector("img");
    const win = box.querySelector(".layout-source-window");
    if (!img || !win) return;
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    if (!nw || !nh) return;
    const blockId = box.getAttribute("data-mirror-block") || "";
    const slot = box.getAttribute("data-mirror-slot") || "";
    const view = layoutFrameViewState(blockId, slot);
    const measured = layoutPreviewFrameRatio(blockId, slot);
    const frameRatio = measured > 0 ? measured : 16 / 9;
    const frameH = 100;
    const frameW = frameH * frameRatio;
    const z = Math.max(1, normalizeImageScale(view.scale) / 100);
    const x = normalizeFocalX(view.focalX) / 100;
    const y = normalizeFocalY(view.focalY) / 100;
    const cover = Math.max(frameW / nw, frameH / nh);
    const offsetX = (nw * cover - frameW) * x;
    const offsetY = (nh * cover - frameH) * y;
    const vx = x * frameW * (1 - 1 / z);
    const vy = y * frameH * (1 - 1 / z);
    let left = (offsetX + vx) / cover / nw;
    let top = (offsetY + vy) / cover / nh;
    let width = frameW / z / cover / nw;
    let height = frameH / z / cover / nh;
    if (left < 0) {
      width += left;
      left = 0;
    }
    if (top < 0) {
      height += top;
      top = 0;
    }
    if (left + width > 1) width = 1 - left;
    if (top + height > 1) height = 1 - top;
    width = Math.max(0.04, Math.min(1, width));
    height = Math.max(0.04, Math.min(1, height));
    win.style.left = left * 100 + "%";
    win.style.top = top * 100 + "%";
    win.style.width = width * 100 + "%";
    win.style.height = height * 100 + "%";
    window.requestAnimationFrame(() => alignOpenSourceMapToPad(box));
  }

  function alignOpenSourceMapToPad(box) {
    if (!box || !box.closest("#easy-img-layout-host")) return;
    const row = box.closest(".layout-photo-row");
    const scroller = document.querySelector(".dash-body > .fill-form");
    const img = box.querySelector("img");
    if (!row || !scroller || !img) return;
    if (box.closest("#easy-img-layout-host.is-photo-solo")) {
      const cell = box.closest(".layout-arrange-cell");
      const tools = box.closest(".layout-photo-tools--plain");
      const sources = tools ? tools.querySelector(".layout-img-sources") : null;
      const zoom = tools ? tools.querySelector(".layout-zoom-block") : null;
      const scroller = document.querySelector(".dash-body > .fill-form");
      const inner = tools ? tools.clientWidth : 0;
      const sideMin = 108;
      const maxW = Math.max(140, inner - sideMin * 2);
      const rowGap = tools ? parseFloat(getComputedStyle(tools).rowGap) || 0 : 0;
      const padB = cell ? parseFloat(getComputedStyle(cell).paddingBottom) || 0 : 0;
      const above = (sources ? sources.offsetHeight : 0) + (zoom ? zoom.offsetHeight : 0);
      const toolsTop = tools ? tools.getBoundingClientRect().top : 0;
      const limit = scroller ? scroller.getBoundingClientRect().bottom : toolsTop + 420;
      const avail = Math.max(180, Math.round(limit - toolsTop - above - rowGap * 2 - padB - 8));
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      let h = avail;
      let w = nw && nh ? Math.round(h * (nw / nh)) : maxW;
      if (w > maxW) {
        w = maxW;
        h = nw && nh ? Math.round(w * (nh / nw)) : h;
      }
      box.style.width = w + "px";
      box.style.height = h + "px";
      box.style.maxWidth = "none";
      box.style.marginLeft = "0";
      box.style.marginBottom = "0";
      box.style.visibility = "visible";
      if (sources) {
        sources.style.width = "100%";
        sources.style.maxWidth = "100%";
      }
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.maxHeight = "none";
      return;
    }
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    box.style.maxWidth = "100%";
    box.style.marginLeft = "0";
    box.style.height = "auto";
    img.style.height = "auto";
    img.style.maxHeight = "none";
    if (!nw || !nh) return;
    const spare = Math.round(
      scroller.getBoundingClientRect().bottom -
        row.getBoundingClientRect().top -
        (row.offsetHeight - box.offsetHeight) -
        16
    );
    const preferred = 168;
    const fullH = preferred * (nh / nw);
    const w = spare >= 80 && fullH > spare ? Math.max(72, Math.round(spare * (nw / nh))) : preferred;
    if (box.style.width !== w + "px") box.style.width = w + "px";
    img.style.width = "100%";
    box.style.visibility = "visible";
    box.style.marginLeft = "0";
  }

  function syncLayoutMirrors() {
    document.querySelectorAll(".layout-mirror").forEach(paintLayoutMirror);
    document.querySelectorAll(".layout-source-map").forEach(paintLayoutSourceMap);
  }

  function refreshLayoutPhotoFace(imageName) {
    const src = layoutFramePreviewSrc(imageName);
    document.querySelectorAll("#easy-img-layout-host .layout-photo-row").forEach((row) => {
      const key = row.getAttribute("data-layout-photo") || "";
      const cut = key.indexOf(":");
      if (cut < 0) return;
      if (layoutFrameImageName(key.slice(0, cut), key.slice(cut + 1)) !== imageName) return;
      row.querySelectorAll(".layout-closed-thumb, .layout-source-map").forEach((box) => {
        if (!src) return;
        let img = box.querySelector("img");
        if (!img) {
          img = document.createElement("img");
          img.alt = "";
          img.draggable = false;
          box.insertBefore(img, box.firstChild);
        }
        if (img.getAttribute("src") !== src) img.src = src;
      });
      const picked = !!(store.galleryPicks && store.galleryPicks[imageName]);
      const selfBtn = row.querySelector(".layout-img-source:not(.layout-img-source--gallery)");
      const galleryBtn = row.querySelector(".layout-img-source--gallery");
      if (selfBtn) selfBtn.classList.toggle("is-on", !picked);
      if (galleryBtn) galleryBtn.classList.toggle("is-on", picked);
      row.querySelectorAll(".layout-mirror").forEach(paintLayoutMirror);
      row.querySelectorAll(".layout-source-map").forEach(paintLayoutSourceMap);
    });
  }

  function layoutFramePreviewSrc(imageName) {
    if (imageUrls[imageName]) return imageUrls[imageName];
    let img = null;
    if (imageName === "hero_image") img = root.querySelector(".hero-photo");
    else if (String(imageName).indexOf("about_image_") === 0) {
      const li = root.querySelector('#about-photos > [data-item-id="' + imageName + '"]');
      img = li ? li.querySelector("img") : null;
    } else if (/^work_\d+_image$/.test(imageName)) {
      const n = imageName.match(/^work_(\d+)_image$/)[1];
      const li = root.querySelector('#works-list > [data-item-id="work_' + n + '"]');
      img = li ? li.querySelector("img") : null;
    }
    if (!img) return "";
    return img.getAttribute("src") || "";
  }

  function layoutFramePreviewSelector(blockId, slot) {
    if (blockId === "hero") return "#hero";
    if (blockId === "photos") return '#about-photos > [data-item-id="' + slot + '"]';
    if (blockId === "works") return '#works-list > [data-item-id="' + slot + '"]';
    return "";
  }

  function previewZoomFactor() {
    const viewport = document.getElementById("preview-viewport");
    const z = viewport ? parseFloat(viewport.style.zoom) : 1;
    return z > 0 ? z : 1;
  }

  function layoutSectionPreviewSelector(blockId) {
    const block = LAYOUT_BLOCKS.find(function (b) { return b.id === blockId; });
    if (block && block.selector) return block.selector;
    if (blockId === "hero") return "#hero";
    if (blockId === "photos") return "#about-photos-block";
    if (blockId === "works") return "#works";
    return "";
  }

  function currentImageFrameSelector() {
    const openId = store.layoutAccordionId || "";
    const inner = store.layoutInnerByBlock || {};
    if (openId === "photos" && inner["about-photos"]) {
      return layoutFramePreviewSelector("photos", inner["about-photos"]);
    }
    if (openId === "works" && inner["works-list"]) {
      return layoutFramePreviewSelector("works", inner["works-list"]);
    }
    const fromOpen = layoutSectionPreviewSelector(openId);
    if (fromOpen) return fromOpen;
    if (inner.hero) return "#hero";
    if (inner["about-photos"]) return "#about-photos-block";
    if (inner["works-list"]) return "#works";
    return "#hero";
  }

  function previewSelectorForImageName(name) {
    if (!name) return "";
    if (name === "hero_image") return "#hero";
    if (String(name).indexOf("about_image_") === 0) return "#about-photos-block";
    if (/^work_\d+_image$/.test(name)) return "#works";
    return "";
  }

  function wireSlotBlockAndItem(imageName) {
    if (imageName === "hero_image") return { blockId: "hero", slot: "hero" };
    if (String(imageName).indexOf("about_image_") === 0) return { blockId: "photos", slot: imageName };
    const work = String(imageName).match(/^work_(\d+)_image$/);
    if (work) return { blockId: "works", slot: "work_" + work[1] };
    return null;
  }

  /* 見本の下に足していた空っぽは置かない。上か下に寄せて中身が見えればよい */
  function ensurePreviewScrollTail(scroll) {
    if (!scroll) return;
    const tail = scroll.querySelector(".preview-scroll-tail");
    if (tail) tail.remove();
  }

  /* 見本が zoom で縮んでいても、スクロール量は縮んだあとの画面位置で出す */
  function scrollPreviewFrameIntoView(selector) {
    const scroll = document.querySelector(".preview-scroll");
    if (!scroll || !selector || !root) return;
    const target = root.querySelector(selector);
    if (!target) return;
    ensurePreviewScrollTail(scroll);
    const zoom = previewZoomFactor();
    const prev = scroll.style.scrollBehavior;
    scroll.style.scrollBehavior = "auto";
    let ratio = 1;
    for (let i = 0; i < 8; i++) {
      const pane = scroll.getBoundingClientRect();
      const box = target.getBoundingClientRect();
      const layoutH = target.offsetHeight || box.height;
      const rectIsLayout =
        zoom < 0.999 &&
        layoutH > 8 &&
        Math.abs(box.height - layoutH) <= Math.abs(box.height - layoutH * zoom) + 1;
      const scale = rectIsLayout ? zoom : 1;
      const visualTop = box.top * scale;
      const deltaScreen = visualTop - pane.top;
      if (Math.abs(deltaScreen) <= 4) break;
      const max = Math.max(0, scroll.scrollHeight - scroll.clientHeight);
      const beforeTop = scroll.scrollTop;
      const next = Math.max(0, Math.min(max, beforeTop + deltaScreen * ratio));
      if (Math.abs(next - beforeTop) < 1) break;
      scroll.scrollTop = next;
      const movedScroll = scroll.scrollTop - beforeTop;
      const movedScreen = visualTop - target.getBoundingClientRect().top * scale;
      if (Math.abs(movedScreen) > 1 && Math.abs(movedScroll) > 1) {
        ratio = movedScroll / movedScreen;
      }
    }
    scroll.style.scrollBehavior = prev;
  }

  function scrollDashChildToTop(el) {
    if (!el) return;
    const scroller = document.querySelector(".dash-body > .fill-form");
    if (!scroller) {
      el.scrollIntoView({ block: "start", behavior: "auto" });
      return;
    }
    const host = document.querySelector("#easy-img-layout-host");
    const tail = (host && host.closest("details")) || host;
    if (host) host.style.paddingBottom = "";
    if (tail && tail !== host) tail.style.paddingBottom = "";
    for (let i = 0; i < 6; i++) {
      const delta = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
      if (delta <= 1) break;
      const max = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
      const room = max - scroller.scrollTop;
      if (delta > room + 1 && tail) {
        const have = parseFloat(tail.style.paddingBottom) || 0;
        tail.style.paddingBottom = Math.ceil(have + delta - room) + "px";
      }
      scroller.scrollTop += el.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
    }
  }

  function wizardStepId() {
    const flow = typeof getFlowSteps === "function" ? getFlowSteps() : [];
    const step = flow[store.wizardStepIndex];
    return step ? step.id : "";
  }

  function previewEl(selector) {
    if (!selector || !root) return null;
    if (selector === "#preview-root") return root;
    try {
      return root.querySelector(selector);
    } catch (err) {
      return null;
    }
  }

  function clearLayoutFocusClass() {
    if (!root) return;
    root.classList.remove("is-layout-focus");
    root.querySelectorAll(".is-layout-focus").forEach((el) => el.classList.remove("is-layout-focus"));
  }

  function focusPreviewTarget(target) {
    clearLayoutFocusClass();
    if (target && !target.hidden) target.classList.add("is-layout-focus");
    syncPlaceMarkFrame();
  }

  function ensurePreviewAlignBar() {
    const pane = document.querySelector(".preview-pane");
    if (!pane) return null;
    let bar = document.getElementById("preview-align-bar");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "preview-align-bar";
      bar.hidden = true;
      bar.setAttribute("aria-hidden", "true");
      pane.appendChild(bar);
    }
    return bar;
  }

  function hidePreviewAlignBar() {
    const bar = document.getElementById("preview-align-bar");
    if (bar) bar.hidden = true;
  }

  function showPreviewAlignBar(anchorEl) {
    const bar = ensurePreviewAlignBar();
    const pane = document.querySelector(".preview-pane");
    if (!bar || !pane || !anchorEl) return;
    const top = anchorEl.getBoundingClientRect().top - pane.getBoundingClientRect().top;
    bar.hidden = false;
    bar.style.top = Math.round(top) + "px";
  }

  function clearPreviewBlockShift() {
    if (!root) return;
    root.querySelectorAll(".is-preview-block-shift").forEach((el) => {
      el.style.transform = "";
      el.classList.remove("is-preview-block-shift");
    });
  }

  function previewVisualMetrics(el) {
    const zoom = previewZoomFactor();
    const box = el.getBoundingClientRect();
    const layoutH = el.offsetHeight || box.height;
    const rectIsLayout =
      zoom < 0.999 &&
      layoutH > 8 &&
      Math.abs(box.height - layoutH) <= Math.abs(box.height - layoutH * zoom) + 1;
    const scale = rectIsLayout ? zoom : 1;
    return { top: box.top * scale, height: Math.max(box.height, layoutH) * scale };
  }

  function nudgePreviewScroll(scroll, target, deltaScreen) {
    const max = Math.max(0, scroll.scrollHeight - scroll.clientHeight);
    const ratio = scroll._previewRatio || 1;
    const before = scroll.scrollTop;
    const visBefore = previewVisualMetrics(target).top;
    const next = Math.max(0, Math.min(max, before + deltaScreen * ratio));
    if (Math.abs(next - before) < 0.25) return false;
    scroll.scrollTop = next;
    const movedScroll = scroll.scrollTop - before;
    const movedScreen = visBefore - previewVisualMetrics(target).top;
    if (Math.abs(movedScreen) > 1 && Math.abs(movedScroll) > 1) {
      const nextRatio = movedScroll / movedScreen;
      if (nextRatio > 0.2 && nextRatio < 8) scroll._previewRatio = nextRatio;
    }
    return true;
  }

  function grabPreviewEdge(target) {
    const host = document.getElementById("easy-img-layout-host");
    if (!host || !target) return "middle";
    const itemId = target.getAttribute && target.getAttribute("data-item-id");
    if (itemId) {
      const mine = Array.prototype.find.call(host.querySelectorAll(".layout-photo-row"), function (row) {
        return row.getAttribute("data-item-id") === itemId && row.offsetParent;
      });
      const list = mine && mine.parentElement;
      const siblings = list
        ? Array.prototype.filter.call(list.children, function (el) {
            return el.classList && el.classList.contains("layout-photo-row") && el.offsetParent;
          })
        : [];
      if (mine && siblings.length) {
        if (siblings[0] === mine) return "top";
        if (siblings[siblings.length - 1] === mine) return "bottom";
        return "middle";
      }
      return "middle";
    }
    const cells = Array.prototype.slice.call(host.querySelectorAll(".layout-arrange-cell"));
    if (!cells.length) return "middle";
    const first = previewEl(layoutSectionPreviewSelector(cells[0].getAttribute("data-layout-block")));
    const last = previewEl(layoutSectionPreviewSelector(cells[cells.length - 1].getAttribute("data-layout-block")));
    if (first === target) return "top";
    if (last === target) return "bottom";
    return "middle";
  }

  function rowListEdge(row, rows) {
    const visible = (rows || []).filter(function (el) { return el && el.offsetParent; });
    if (!row || !visible.length) return "middle";
    if (visible[0] === row) return "top";
    if (visible[visible.length - 1] === row) return "bottom";
    return "middle";
  }

  function centerPreviewBlock(target, forceEdge) {
    const scroll = document.querySelector(".preview-scroll");
    if (!scroll || !target) return;
    clearPreviewBlockShift();
    const tail = scroll.querySelector(".preview-scroll-tail");
    if (tail) tail.remove();
    const alignHead = scroll.querySelector(":scope > .preview-align-head");
    if (alignHead) {
      const headH = alignHead.offsetHeight || 0;
      alignHead.remove();
      scroll.scrollTop = Math.max(0, scroll.scrollTop - headH);
    }
    scroll._previewRatio = 1;
    const edge = forceEdge || grabPreviewEdge(target);
    const maxOf = function () { return Math.max(0, scroll.scrollHeight - scroll.clientHeight); };
    for (let n = 0; n < 4; n += 1) {
      focusPreviewTarget(target);
      const frame = document.getElementById("place-mark-frame");
      const view = scroll.getBoundingClientRect();
      if (!frame || frame.hidden || view.height < 40) break;
      const fb = frame.getBoundingClientRect();
      let delta = 0;
      const card = !!(target.getAttribute && target.getAttribute("data-item-id"));
      if (edge === "top") delta = fb.top - view.top;
      else if (edge === "bottom") delta = fb.bottom - view.bottom;
      else {
        delta = (fb.top + fb.height / 2) - (view.top + view.height / 2);
        if (fb.top - delta < view.top) delta = fb.top - view.top;
        else if (fb.bottom - delta > view.bottom) delta = fb.bottom - view.bottom;
        if (fb.height > view.height) delta = fb.top - view.top;
      }
      if (card && fb.height <= view.height) {
        if (fb.top - delta < view.top) delta = fb.top - view.top;
        else if (fb.bottom - delta > view.bottom) delta = fb.bottom - view.bottom;
      }
      if (Math.abs(delta) <= 2) break;
      const next = Math.max(0, Math.min(maxOf(), scroll.scrollTop + delta));
      if (Math.abs(next - scroll.scrollTop) < 0.25) break;
      scroll.scrollTop = next;
    }
    focusPreviewTarget(target);
  }

  function markPreviewStick(target) {
    const scroll = document.querySelector(".preview-scroll");
    const frame = document.getElementById("place-mark-frame");
    if (!scroll || !target || !frame || frame.hidden) return;
    const view = scroll.getBoundingClientRect();
    const fb = frame.getBoundingClientRect();
    target._stuckBottom = Math.max(0, fb.bottom - view.bottom);
    target._stuckTop = Math.max(0, view.top - fb.top);
  }

  function slideAndFollowPreview(target, row, goingDown) {
    if (!target || !row) return;
    const scroll = document.querySelector(".preview-scroll");
    const match = /translateY\(([-\d.]+)px\)/.exec(row.style.transform || "");
    const dy = match ? parseFloat(match[1]) : 0;
    target.classList.add("is-preview-block-shift");
    const zoom = previewZoomFactor();
    const layoutH = target.offsetHeight || 0;
    const rawH = target.getBoundingClientRect().height;
    const rectIsLayout =
      zoom < 0.999 &&
      layoutH > 8 &&
      Math.abs(rawH - layoutH) <= Math.abs(rawH - layoutH * zoom) + 1;
    target.style.transform = "translateY(" + (rectIsLayout ? dy / zoom : dy) + "px)";
    if (scroll) {
      const maxOf = function () { return Math.max(0, scroll.scrollHeight - scroll.clientHeight); };
      for (let i = 0; i < 4; i += 1) {
        syncPlaceMarkFrame();
        const frame = document.getElementById("place-mark-frame");
        const view = scroll.getBoundingClientRect();
        if (!frame || frame.hidden || view.height < 40) break;
        const fb = frame.getBoundingClientRect();
        const card = !!(target.getAttribute && target.getAttribute("data-item-id"));
        let delta = 0;
        if (card) {
          const topOut = view.top - fb.top;
          const bottomOut = fb.bottom - view.bottom;
          if (topOut > 0.5 && bottomOut > 0.5) delta = goingDown ? bottomOut : -topOut;
          else if (topOut > 0.5) delta = -topOut;
          else if (bottomOut > 0.5) delta = bottomOut;
        } else if (goingDown) {
          delta = fb.bottom - view.bottom - (target._stuckBottom || 0);
          if (delta < 0) delta = 0;
        } else {
          delta = fb.top - view.top;
          if (delta > 0) delta = 0;
        }
        if (Math.abs(delta) < 0.5) break;
        const next = Math.max(0, Math.min(maxOf(), scroll.scrollTop + delta));
        if (Math.abs(next - scroll.scrollTop) < 0.25) {
          const applied = /translateY\(([-\d.]+)px\)/.exec(target.style.transform || "");
          const cur = applied ? parseFloat(applied[1]) : 0;
          const unit = rectIsLayout && zoom > 0 ? 1 / zoom : 1;
          if (fb.top < view.top - 0.5 && (card || !goingDown)) {
            target.style.transform = "translateY(" + (cur + (view.top - fb.top) * unit) + "px)";
            continue;
          }
          if (card && fb.bottom > view.bottom + 0.5) {
            target.style.transform = "translateY(" + (cur - (fb.bottom - view.bottom) * unit) + "px)";
            continue;
          }
          break;
        }
        scroll.scrollTop = next;
      }
    }
    syncPlaceMarkFrame();
  }

  function isSwapSibling(el, siblingClass) {
    return !!(el && el.classList.contains(siblingClass) && !el.hidden && el.offsetParent);
  }

  function thirdSwapHit(row, siblingClass) {
    if (!row) return null;
    const box = row.getBoundingClientRect();
    let next = row.nextElementSibling;
    while (next && !isSwapSibling(next, siblingClass)) next = next.nextElementSibling;
    if (next) {
      const rect = next.getBoundingClientRect();
      if (rect.height > 2 && box.bottom > rect.top + rect.height / 2) return { other: next, place: "after" };
    }
    let prev = row.previousElementSibling;
    while (prev && !isSwapSibling(prev, siblingClass)) prev = prev.previousElementSibling;
    if (prev) {
      const rect = prev.getBoundingClientRect();
      if (rect.height > 2 && box.top < rect.bottom - rect.height / 2) return { other: prev, place: "before" };
    }
    return null;
  }

  function swapImageSectionByThird(cell, clientY) {
    if (!cell.closest("#easy-img-layout-host")) return;
    for (let n = 0; n < 6; n += 1) {
      const hit = thirdSwapHit(cell, "layout-arrange-cell");
      if (!hit) break;
      const fromId = cell.getAttribute("data-layout-block");
      const toId = hit.other.getAttribute("data-layout-block");
      const beforeTop = cell.getBoundingClientRect().top;
      if (!moveLayoutIdNear(fromId, toId, hit.place)) break;
      if (hit.place === "after") hit.other.after(cell);
      else hit.other.before(cell);
      applyLayoutOrderToPreview();
      store._layoutPointerStartY = keepDragUnderPointer(
        cell,
        clientY,
        beforeTop,
        store._layoutPointerStartY || clientY
      );
    }
  }

  function slideFramedWithRow(target, row) {
    if (!root || !target || !row) return;
    const scroll = document.querySelector(".preview-scroll");
    const keep = scroll ? scroll.scrollTop : 0;
    const match = /translateY\(([-\d.]+)px\)/.exec(row.style.transform || "");
    const dy = match ? parseFloat(match[1]) : 0;
    target.classList.add("is-preview-block-shift");
    const zoom = previewZoomFactor();
    const box = target.getBoundingClientRect();
    const layoutH = target.offsetHeight || box.height;
    const rectIsLayout =
      zoom < 0.999 &&
      layoutH > 8 &&
      Math.abs(box.height - layoutH) <= Math.abs(box.height - layoutH * zoom) + 1;
    target.style.transform = "translateY(" + (rectIsLayout ? dy / zoom : dy) + "px)";
    if (scroll) scroll.scrollTop = keep;
    syncPlaceMarkFrame();
  }

  function fullCrossTarget(row, siblingClass) {
    if (!row || !row.parentElement) return null;
    const match = /translateY\(([-\d.]+)px\)/.exec(row.style.transform || "");
    const applied = match ? parseFloat(match[1]) : 0;
    if (Math.abs(applied) < 8) return null;
    const all = Array.prototype.filter.call(row.parentElement.children, (el) => {
      return el.classList.contains(siblingClass) && !el.hidden && el.getBoundingClientRect().height > 2;
    });
    const index = all.indexOf(row);
    if (index < 0) return null;
    const mid = row.getBoundingClientRect().top + row.getBoundingClientRect().height / 2;
    if (applied > 0) {
      let after = null;
      for (let i = index + 1; i < all.length; i += 1) {
        const rect = all[i].getBoundingClientRect();
        if (mid > rect.bottom) after = all[i];
        else break;
      }
      return after ? { other: after, place: "after" } : null;
    }
    let before = null;
    for (let i = index - 1; i >= 0; i -= 1) {
      const rect = all[i].getBoundingClientRect();
      if (mid < rect.top) before = all[i];
      else break;
    }
    return before ? { other: before, place: "before" } : null;
  }

  function pinFramedPreviewBlock(target) {
    const scroll = document.querySelector(".preview-scroll");
    if (!root || !scroll || !target) return;
    const keep = scroll.scrollTop;
    root.querySelectorAll(".is-preview-block-shift").forEach((el) => {
      if (el === target) return;
      el.style.transform = "";
      el.classList.remove("is-preview-block-shift");
    });
    target.classList.add("is-preview-block-shift");
    target.style.transform = "";
    const view = scroll.getBoundingClientRect();
    const zoom = previewZoomFactor();
    const want = view.top + 8;
    let shift = 0;
    for (let i = 0; i < 6; i += 1) {
      const box = target.getBoundingClientRect();
      const layoutH = target.offsetHeight || box.height;
      const rectIsLayout =
        zoom < 0.999 &&
        layoutH > 8 &&
        Math.abs(box.height - layoutH) <= Math.abs(box.height - layoutH * zoom) + 1;
      const scale = rectIsLayout ? zoom : 1;
      const visualTop = box.top * scale;
      const delta = want - visualTop;
      if (Math.abs(delta) <= 4) break;
      shift += rectIsLayout ? delta / zoom : delta;
      target.style.transform = "translateY(" + shift + "px)";
    }
    scroll.scrollTop = keep;
    focusPreviewTarget(target);
  }

  function clampDragClientY(row, clientY, startY) {
    if (!row || !row.closest) return clientY;
    const host =
      row.closest("#easy-img-layout-host") ||
      row.closest("#easy-copy-list-host") ||
      row.closest("#layout-color-rows");
    if (!host) return clientY;
    const step = row.closest("[data-step-id]");
    let head = null;
    if (step) {
      const heads = step.querySelectorAll(".dash-subhead");
      for (let i = 0; i < heads.length; i += 1) {
        if (heads[i].offsetParent && heads[i].getBoundingClientRect().height > 8) {
          head = heads[i];
          break;
        }
      }
    }
    const pane = document.querySelector(".preview-pane");
    const box = row.getBoundingClientRect();
    const match = /translateY\(([-\d.]+)px\)/.exec(row.style.transform || "");
    const applied = match ? parseFloat(match[1]) : 0;
    const layoutTop = box.top - applied;
    let nextTop = layoutTop + (clientY - startY);
    const headBox = head ? head.getBoundingClientRect() : null;
    let minTop = headBox && headBox.height > 8 ? headBox.bottom + 6 : null;
    if (host.id === "easy-copy-list-host" && row.classList.contains("easy-copy-list-cell")) {
      const logo = host.querySelector('.easy-copy-list-cell[data-copy-sec="logo"]');
      const logoBox = logo && logo !== row && logo.offsetParent ? logo.getBoundingClientRect() : null;
      if (logoBox && logoBox.height > 8) {
        const logoStop = logoBox.bottom + 6;
        minTop = minTop == null ? logoStop : Math.max(minTop, logoStop);
      }
    }
    if (row.classList.contains("layout-photo-row") || row.classList.contains("easy-copy-list-row")) {
      const cell = row.closest(".layout-arrange-cell, .easy-copy-list-cell");
      const cluster = cell ? cell.querySelector(".layout-count-cluster") : null;
      const countBox = cluster ? cluster.getBoundingClientRect() : null;
      if (countBox && countBox.height > 8 && cluster.offsetParent) minTop = countBox.bottom + 6;
    }
    const hostBottom = host.getBoundingClientRect().bottom;
    const paneBottom = pane && pane.getBoundingClientRect().height > 40 ? pane.getBoundingClientRect().bottom : hostBottom;
    const dash = document.querySelector(".dash-pane");
    const dashBottom = dash && dash.getBoundingClientRect().height > 40 ? dash.getBoundingClientRect().bottom : hostBottom;
    const dock = document.getElementById("wizard-foot-dock");
    const dockBox = dock ? dock.getBoundingClientRect() : null;
    const dockTop = dockBox && dockBox.height > 8 ? dockBox.top : hostBottom;
    const limitBottom = Math.min(hostBottom, paneBottom, dashBottom, dockTop);
    let maxTop = limitBottom - box.height - 6;
    if (minTop != null && maxTop < minTop) maxTop = minTop;
    const delta = clientY - startY;
    if (delta >= 0 && layoutTop > maxTop) nextTop = layoutTop;
    else {
      nextTop = Math.min(maxTop, layoutTop + delta);
      if (minTop != null) nextTop = Math.max(minTop, nextTop);
    }
    return startY + (nextTop - layoutTop);
  }

  function ensurePreviewAlignHead(scroll) {
    clearPreviewAlignHead();
    if (scroll) {
      const head = scroll.querySelector(":scope > .preview-align-head");
      if (head) head.remove();
    }
    return null;
  }

  function clearPreviewAlignHead() {
    const scroll = document.querySelector(".preview-scroll");
    if (!scroll) return;
    const head = scroll.querySelector(":scope > .preview-align-head");
    if (!head) return;
    const h = head.offsetHeight || 0;
    head.remove();
    scroll.scrollTop = Math.max(0, scroll.scrollTop - h);
  }

  function alignPreviewToAnchor(selectorOrEl, anchorEl) {
    const scroll = document.querySelector(".preview-scroll");
    const target = typeof selectorOrEl === "string" ? previewEl(selectorOrEl) : selectorOrEl;
    if (!scroll || !target || !anchorEl) return;
    if (scroll.clientHeight < 40 || anchorEl.getBoundingClientRect().height < 2) return;
    ensurePreviewAlignHead(scroll);
    ensurePreviewScrollTail(scroll);
    const zoom = previewZoomFactor();
    const prev = scroll.style.scrollBehavior;
    scroll.style.scrollBehavior = "auto";
    const anchorTop = anchorEl.getBoundingClientRect().top;
    let ratio = 1;
    for (let i = 0; i < 8; i++) {
      const box = target.getBoundingClientRect();
      const layoutH = target.offsetHeight || box.height;
      const rectIsLayout =
        zoom < 0.999 &&
        layoutH > 8 &&
        Math.abs(box.height - layoutH) <= Math.abs(box.height - layoutH * zoom) + 1;
      const scale = rectIsLayout ? zoom : 1;
      const visualTop = box.top * scale;
      const deltaScreen = visualTop - anchorTop;
      if (Math.abs(deltaScreen) <= 4) break;
      const max = Math.max(0, scroll.scrollHeight - scroll.clientHeight);
      const beforeTop = scroll.scrollTop;
      const next = Math.max(0, Math.min(max, beforeTop + deltaScreen * ratio));
      if (Math.abs(next - beforeTop) < 1) break;
      scroll.scrollTop = next;
      const movedScroll = scroll.scrollTop - beforeTop;
      const movedScreen = visualTop - target.getBoundingClientRect().top * scale;
      if (Math.abs(movedScreen) > 1 && Math.abs(movedScroll) > 1) {
        const nextRatio = movedScroll / movedScreen;
        ratio = nextRatio > 0.2 && nextRatio < 8 ? nextRatio : 1;
      }
    }
    scroll.style.scrollBehavior = prev;
    syncPlaceMarkFrame();
  }

  function followPreviewDuringDrag(target, anchorEl) {
    if (!target || !anchorEl) return;
    focusPreviewTarget(target);
    alignPreviewToAnchor(target, anchorEl);
    showPreviewAlignBar(anchorEl);
  }

  function copySectionPreviewEl(secId) {
    if (secId === "logo") return previewEl("#preview-header");
    const sec = copyListSectionById(secId);
    if (!sec || !sec.layoutId) return null;
    return previewEl(layoutSectionPreviewSelector(sec.layoutId));
  }

  function copyItemPreviewEl(sec, itemIndex) {
    if (!root || !sec) return null;
    const n = Number(itemIndex);
    if (sec.id === "works") return root.querySelector('#works-list > [data-item-id="work_' + n + '"]');
    if (sec.id === "values") return root.querySelectorAll("#hero-values [data-sample-item]")[n - 1] || null;
    if (sec.id === "accordions") return root.querySelectorAll("#about-accordions [data-sample-item]")[n - 1] || null;
    return null;
  }

  function parkOpenCopyPreview() {
    if (wizardStepId() !== "easy-copy-omakase") return;
    const open = copyListOpenState();
    hidePreviewAlignBar();
    if (!open) {
      parkOpenCopyPreview._held = "";
      return;
    }
    const host = document.getElementById("easy-copy-list-host");
    const cell = host && host.querySelector('.easy-copy-list-cell[data-copy-sec="' + open.sectionId + '"]');
    const anchor =
      (cell && (cell.querySelector(".easy-copy-item-head") || cell.querySelector(".easy-copy-list-head"))) || cell;
    let target = copySectionPreviewEl(open.sectionId);
    if (!target || !anchor) return;
    const scroll = document.querySelector(".preview-scroll");
    const frame = document.getElementById("place-mark-frame");
    const view = scroll ? scroll.getBoundingClientRect() : null;
    const fb = frame && !frame.hidden ? frame.getBoundingClientRect() : null;
    const focus = document.querySelector("#preview-root .is-layout-focus");
    let settled = false;
    if (fb && view && view.height > 40 && focus === target) {
      if (fb.height > view.height) settled = Math.abs(fb.top - view.top) < 4 || Math.abs(fb.bottom - view.bottom) < 4;
      else {
        const mid = Math.abs((fb.top + fb.height / 2) - (view.top + view.height / 2));
        settled = mid < 8 || Math.abs(fb.top - view.top) < 4 || Math.abs(fb.bottom - view.bottom) < 4;
      }
    }
    if (parkOpenCopyPreview._held === open.sectionId && settled) {
      focusPreviewTarget(target);
      return;
    }
    parkOpenCopyPreview._held = open.sectionId;
    centerPreviewBlock(target, "middle");
  }

  function colorRowPreviewSelector(row) {
    if (!row) return "";
    const stepId = row.getAttribute("data-color-step") || "";
    if (stepId) {
      const block = form.querySelector('.dash-block[data-step-id="' + stepId + '"]');
      const sel = block && block.getAttribute("data-preview-target");
      if (sel) return sel;
    }
    const moveId = row.getAttribute("data-color-move") || "";
    const blockId = colorMoveBlockId(moveId) || COLOR_MOVE_BLOCK[moveId] || "";
    if (blockId) return layoutSectionPreviewSelector(blockId);
    if (row.classList.contains("layout-color-whole")) return "#preview-root";
    if (row.classList.contains("layout-color-pin")) return "#preview-header";
    return "";
  }

  function syncOpenColorPreview() {
    if (wizardStepId() !== "easy-color-stage") return;
    const rows = document.getElementById("layout-color-rows");
    hidePreviewAlignBar();
    if (!rows) return;
    const sub = rows.querySelector(".layout-color-sub.is-open");
    const unit = sub || rows.querySelector(":scope > .layout-color-row.is-open");
    if (!unit) {
      syncOpenColorPreview._held = "";
      clearPreviewPlaceMark();
      return;
    }
    const target = previewEl(colorRowPreviewSelector(unit));
    if (!target) return;
    const held = unit.getAttribute("data-color-move") || unit.getAttribute("data-color-step") || unit.getAttribute("data-color-key") || "";
    const scroll = document.querySelector(".preview-scroll");
    const frame = document.getElementById("place-mark-frame");
    const view = scroll ? scroll.getBoundingClientRect() : null;
    const fb = frame && !frame.hidden ? frame.getBoundingClientRect() : null;
    const focus = document.querySelector("#preview-root .is-layout-focus");
    let settled = false;
    if (fb && view && view.height > 40 && focus === target) {
      if (fb.height > view.height) settled = Math.abs(fb.top - view.top) < 4 || Math.abs(fb.bottom - view.bottom) < 4;
      else {
        const mid = Math.abs((fb.top + fb.height / 2) - (view.top + view.height / 2));
        settled = mid < 8 || Math.abs(fb.top - view.top) < 4 || Math.abs(fb.bottom - view.bottom) < 4;
      }
    }
    if (syncOpenColorPreview._held === held && held && settled) {
      focusPreviewTarget(target);
      return;
    }
    syncOpenColorPreview._held = held;
    centerPreviewBlock(target, "middle");
  }

  function releasePreviewDragFollow() {
    hidePreviewAlignBar();
    clearPreviewBlockShift();
    const stepId = wizardStepId();
    if (stepId === "easy-copy-omakase") {
      if (copyListOpenState()) parkOpenCopyPreview();
      else clearPreviewPlaceMark();
      return;
    }
    if (stepId === "easy-img-wire") {
      const photo = document.querySelector("#easy-img-layout-host .layout-photo-row.is-open");
      if (photo) {
        const map = photo.querySelector(".layout-source-map");
        const sel = map
          ? layoutFramePreviewSelector(map.getAttribute("data-mirror-block") || "", map.getAttribute("data-mirror-slot") || "")
          : "";
        const target = previewEl(sel);
        if (target) focusPreviewTarget(target);
        return;
      }
      const cell = document.querySelector("#easy-img-layout-host details.layout-arrange-cell[open]");
      if (cell) {
        const target = previewEl(layoutSectionPreviewSelector(cell.getAttribute("data-layout-block") || ""));
        if (target) focusPreviewTarget(target);
        return;
      }
      clearPreviewPlaceMark();
      return;
    }
    if (stepId === "easy-color-stage") syncOpenColorPreview();
  }

  function photoListEl(blockId) {
    if (blockId === "photos") return previewEl("#about-photos");
    if (blockId === "works") return previewEl("#works-list");
    return null;
  }

  function clearPhotoListShift() {
    if (!root) return;
    root.querySelectorAll(".is-photo-shift").forEach((el) => {
      el.style.transform = "";
      el.classList.remove("is-photo-shift");
    });
    root.querySelectorAll(".is-photo-hold").forEach((el) => el.classList.remove("is-photo-hold"));
  }

  function parkSectionTop(blockId) {
    clearPhotoListShift();
    const scroll = document.querySelector(".preview-scroll");
    const vp = document.getElementById("preview-viewport");
    const sectionEl = previewEl(layoutSectionPreviewSelector(blockId));
    if (!scroll || !vp || !sectionEl) {
      focusPreviewBlock(blockId);
      return;
    }
    const zoom = previewZoomFactor() || 1;
    vp.style.paddingBottom = Math.ceil(scroll.clientHeight / zoom) + "px";
    const prev = scroll.style.scrollBehavior;
    scroll.style.scrollBehavior = "auto";
    let ratio = zoom;
    for (let i = 0; i < 6; i++) {
      const delta = sectionEl.getBoundingClientRect().top - scroll.getBoundingClientRect().top;
      if (Math.abs(delta) <= 4) break;
      const before = scroll.scrollTop;
      const max = Math.max(0, scroll.scrollHeight - scroll.clientHeight);
      const next = Math.max(0, Math.min(max, before + delta * ratio));
      if (Math.abs(next - before) < 0.5) break;
      scroll.scrollTop = next;
      const movedLayout = delta - (sectionEl.getBoundingClientRect().top - scroll.getBoundingClientRect().top);
      const movedScroll = scroll.scrollTop - before;
      if (Math.abs(movedLayout) > 1 && Math.abs(movedScroll) > 0.5) {
        const nextRatio = movedScroll / movedLayout;
        if (nextRatio > 0.05 && nextRatio < 8) ratio = nextRatio;
      }
    }
    scroll.style.scrollBehavior = prev;
    focusPreviewBlock(blockId);
  }

  function shiftPhotoListToAnchor(blockId, slot) {
    const list = photoListEl(blockId);
    const item = previewEl(layoutFramePreviewSelector(blockId, slot));
    const shell = list && list.parentElement;
    if (!list || !item || !shell) return;
    clearPhotoListShift();
    const zoom = previewZoomFactor();
    const box = item.getBoundingClientRect();
    const listBox = list.getBoundingClientRect();
    const layoutH = item.offsetHeight || box.height;
    const rectIsLayout =
      zoom < 0.999 &&
      layoutH > 8 &&
      Math.abs(box.height - layoutH) <= Math.abs(box.height - layoutH * zoom) + 1;
    const scale = rectIsLayout ? zoom : 1;
    const delta = listBox.top * scale - box.top * scale;
    if (Math.abs(delta) <= 4) {
      focusPreviewBlock(blockId);
      return;
    }
    const shift = delta / scale;
    shell.classList.add("is-photo-hold");
    list.classList.add("is-photo-shift");
    list.style.transform = "translateY(" + shift + "px)";
    focusPreviewBlock(blockId);
  }

  function alignOpenPhotoWithPreview() {
    const map = document.querySelector("#easy-img-layout-host .layout-photo-row.is-open .layout-source-map");
    if (!map || !root) return;
    const blockId = map.getAttribute("data-mirror-block") || "";
    const slot = map.getAttribute("data-mirror-slot") || "";
    if (blockId === "photos" || blockId === "works") {
      shiftPhotoListToAnchor(blockId, slot);
      return;
    }
    if (blockId === "hero") {
      focusPreviewBlock("hero");
      return;
    }
    const sel = layoutFramePreviewSelector(blockId, slot);
    if (sel) alignPreviewToAnchor(sel, map);
  }

  function bindPlaceMarkSwitch() {
    const box = document.querySelector(".place-mark-switch");
    if (!box || box.dataset.bound) return;
    box.dataset.bound = "1";
    box.addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-place-mark]");
      if (!btn || !box.contains(btn)) return;
      placeMarkOn = btn.getAttribute("data-place-mark") === "on";
      syncPlaceMarkSwitch();
    });
    syncPlaceMarkSwitch();
  }

  function syncPlaceMarkSwitch() {
    document.body.classList.toggle("place-mark-off", !placeMarkOn);
    document.querySelectorAll("[data-place-mark]").forEach((btn) => {
      const lit = (btn.getAttribute("data-place-mark") === "on") === placeMarkOn;
      btn.classList.toggle("is-lit", lit);
      btn.setAttribute("aria-pressed", lit ? "true" : "false");
    });
    syncPlaceMarkFrame();
  }

  function placeMarkHost() {
    return document.getElementById("preview-viewport") || document.querySelector(".preview-pane");
  }

  let placeMarkMotionRaf = 0;
  function followPlaceMarkMotion() {
    if (placeMarkMotionRaf) cancelAnimationFrame(placeMarkMotionRaf);
    const started = performance.now();
    const step = function () {
      syncPlaceMarkFrame();
      if (performance.now() - started < 280) {
        placeMarkMotionRaf = requestAnimationFrame(step);
      } else {
        placeMarkMotionRaf = 0;
        syncPlaceMarkFrame();
      }
    };
    placeMarkMotionRaf = requestAnimationFrame(step);
  }

  function ensurePlaceMarkFrame() {
    const host = placeMarkHost();
    let frame = document.getElementById("place-mark-frame");
    if (!host) return frame;
    if (!frame) {
      frame = document.createElement("div");
      frame.id = "place-mark-frame";
      frame.hidden = true;
      frame.setAttribute("aria-hidden", "true");
    }
    if (frame.parentElement !== host) host.appendChild(frame);
    const pane = document.querySelector(".preview-pane");
    const scroll = pane && pane.querySelector(".preview-scroll");
    if (scroll && !scroll.dataset.placeMarkScroll) {
      scroll.dataset.placeMarkScroll = "1";
      scroll.addEventListener("scroll", () => syncPlaceMarkFrame(), { passive: true });
    }
    if (!window.__placeMarkResize) {
      window.__placeMarkResize = true;
      window.addEventListener("resize", () => syncPlaceMarkFrame());
    }
    return frame;
  }

  function syncPlaceMarkFrame() {
    const frame = ensurePlaceMarkFrame();
    const pane = document.querySelector(".preview-pane");
    const host = placeMarkHost();
    const target =
      root && (root.classList.contains("is-layout-focus") ? root : root.querySelector(".is-layout-focus"));
    const paneHidden = !pane || getComputedStyle(pane).display === "none";
    if (!frame || !host || !target || !placeMarkOn || paneHidden) {
      if (frame) frame.hidden = true;
      return;
    }
    const zoom = previewZoomFactor() || 1;
    const hb = host.getBoundingClientRect();
    const raw = target.getBoundingClientRect();
    const layoutW = target.offsetWidth || raw.width;
    const rectIsVisual =
      zoom < 0.999 &&
      Math.abs(raw.width - layoutW * zoom) + 1 < Math.abs(raw.width - layoutW);
    const unit = rectIsVisual ? zoom : 1;
    const tb = {
      left: (raw.left - hb.left) / unit,
      top: (raw.top - hb.top) / unit,
      width: raw.width / unit,
      height: raw.height / unit
    };
    if (tb.width < 2 || tb.height < 2) {
      frame.hidden = true;
      return;
    }
    const thick = 5;
    frame.hidden = false;
    frame.style.left = (tb.left - thick) + "px";
    frame.style.top = (tb.top - thick) + "px";
    frame.style.width = (tb.width + thick * 2) + "px";
    frame.style.height = (tb.height + thick * 2) + "px";
  }

  function clearPreviewPlaceMark() {
    if (!root) return;
    clearLayoutFocusClass();
    clearPhotoListShift();
    clearPreviewBlockShift();
    clearPreviewAlignHead();
    hidePreviewAlignBar();
    const vp = document.getElementById("preview-viewport");
    if (vp) vp.style.paddingBottom = "";
    syncPlaceMarkFrame();
  }

  function followInnerPhotoDrag(blockId, slot, anchorEl) {
    const target = previewEl(layoutFramePreviewSelector(blockId, slot));
    if (!target || !anchorEl) return;
    if (anchorEl.closest && anchorEl.closest("#easy-img-layout-host")) {
      focusPreviewTarget(target);
      return;
    }
    focusPreviewTarget(target);
    if (blockId === "photos" || blockId === "works") {
      shiftPhotoListToAnchor(blockId, slot, anchorEl);
      showPreviewAlignBar(anchorEl);
      return;
    }
    followPreviewDuringDrag(target, anchorEl);
  }

  function focusPreviewBlock(blockId) {
    const sel = layoutSectionPreviewSelector(blockId);
    clearLayoutFocusClass();
    if (!sel || !root) {
      syncPlaceMarkFrame();
      return;
    }
    const target = root.querySelector(sel);
    if (target && !target.hidden) target.classList.add("is-layout-focus");
    syncPlaceMarkFrame();
  }

  function focusOpenLayoutSection() {
    const cell = document.querySelector("#easy-img-layout-host details.layout-arrange-cell[open], #layout-arrange-wire details.layout-arrange-cell[open]");
    const id = cell && cell.getAttribute("data-layout-block");
    if (id) focusPreviewBlock(id);
    else clearPreviewPlaceMark();
  }

  function syncCopyPlaceMark() {
    const flow = typeof getFlowSteps === "function" ? getFlowSteps() : [];
    const step = flow[store.wizardStepIndex];
    if (!step || step.id !== "easy-copy-omakase") return;
    const open = copyListOpenState();
    if (!open || !open.sectionId) {
      clearPreviewPlaceMark();
      return;
    }
    const sec = copyListSectionById(open.sectionId);
    if (sec && sec.layoutId) focusPreviewBlock(sec.layoutId);
    else clearPreviewPlaceMark();
  }

  function focusPreviewLayoutFrame(blockId, slot) {
    const sel = layoutFramePreviewSelector(blockId, slot);
    clearLayoutFocusClass();
    if (!sel || !root) {
      syncPlaceMarkFrame();
      return;
    }
    const target = root.querySelector(sel);
    if (target) target.classList.add("is-layout-focus");
    syncPlaceMarkFrame();
  }

  function layoutSizeWord(size) {
    return size === "H" ? "ページ幅半分" : "ページ幅いっぱい";
  }

  function closeLayoutChoice() {
    const menu = document.getElementById("layout-choice-pop");
    if (menu) menu.remove();
  }

  function openLayoutChoice(anchor, options, onPick) {
    closeLayoutChoice();
    const menu = document.createElement("div");
    menu.id = "layout-choice-pop";
    menu.className = "layout-choice-pop";
    menu.setAttribute("role", "listbox");
    options.forEach((opt) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "layout-choice-opt" + (opt.bold ? " is-bold" : " is-plain");
      btn.textContent = opt.label;
      btn.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        closeLayoutChoice();
        onPick(opt.value);
      });
      menu.appendChild(btn);
    });
    document.body.appendChild(menu);
    const rect = anchor.getBoundingClientRect();
    menu.style.left = Math.round(rect.left) + "px";
    menu.style.top = Math.round(rect.bottom + 4) + "px";
    window.setTimeout(() => {
      const closer = (ev) => {
        if (menu.contains(ev.target)) return;
        closeLayoutChoice();
        document.removeEventListener("pointerdown", closer, true);
      };
      document.addEventListener("pointerdown", closer, true);
    }, 0);
  }

  function stopSummaryToggle(ev) {
    ev.preventDefault();
    ev.stopPropagation();
  }

  function appendLayoutHeadCountGap(head, blockId) {
    const countId = layoutImageCountId(blockId);
    const order = countId ? layoutBlockSlots(blockId) : [];
    const layout = countId ? normalizeItemLayout(countId) : null;
    const meta = countId ? (COUNT_META[countId] || { min: 1, max: order.length || 1 }) : null;
    const minus = document.createElement("button");
    minus.type = "button";
    minus.className = "layout-count-btn";
    minus.textContent = "−";
    minus.setAttribute("aria-label", "枚数を減らす");
    const num = document.createElement("span");
    num.className = "layout-image-count-num";
    const plus = document.createElement("button");
    plus.type = "button";
    plus.className = "layout-count-btn";
    plus.textContent = "＋";
    plus.setAttribute("aria-label", "枚数を増やす");
    if (!countId) {
      minus.disabled = true;
      plus.disabled = true;
      num.textContent = "1枚";
    } else {
      minus.disabled = order.length <= meta.min;
      plus.disabled = order.length >= meta.max;
      num.textContent = order.length + "枚";
      minus.addEventListener("click", (ev) => {
        stopSummaryToggle(ev);
        adjustDraftCount(countId, -1, null);
      });
      plus.addEventListener("click", (ev) => {
        stopSummaryToggle(ev);
        requestAddDraftCount(countId, null, plus);
      });
    }
    const countCluster = document.createElement("span");
    countCluster.className = "layout-count-cluster";
    const countLead = document.createElement("span");
    countLead.className = "layout-count-lead";
    countLead.textContent = "画像枚数";
    countCluster.appendChild(countLead);
    countCluster.appendChild(minus);
    countCluster.appendChild(num);
    countCluster.appendChild(plus);
    countCluster.addEventListener("click", (ev) => {
      if (ev.target.closest(".layout-count-btn:not(:disabled)")) return;
      ev.preventDefault();
      ev.stopPropagation();
    });
    const gapNow = (layout && layout.gap) || "normal";
    const gapCluster = document.createElement("span");
    gapCluster.className = "layout-gap-cluster";
    if (countId) gapCluster.setAttribute("data-gap-for", countId);
    const gapLead = document.createElement("span");
    gapLead.className = "layout-gap-lead";
    gapLead.textContent = "すき間調整";
    gapCluster.appendChild(gapLead);
    ITEM_GAP_STEPS.forEach((gap) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "layout-gap-btn" + (countId && gap === gapNow ? " is-active" : "");
      btn.setAttribute("data-gap", gap);
      btn.textContent = ITEM_GAP_LABELS[gap];
      if (!countId) {
        btn.disabled = true;
      } else {
        btn.addEventListener("click", (ev) => {
          stopSummaryToggle(ev);
          setItemGap(countId, gap);
        });
      }
      gapCluster.appendChild(btn);
    });
    gapCluster.addEventListener("click", (ev) => {
      if (ev.target.closest(".layout-gap-btn:not(:disabled)")) return;
      ev.preventDefault();
      ev.stopPropagation();
    });
    head.appendChild(countCluster);
    head.appendChild(gapCluster);
  }

  let easyImgHistoryDepth = 0;
  let easyImgMutePop = false;

  function easyImgPhotoHostRow(row) {
    return !!(row && row.closest && row.closest("#easy-img-layout-host"));
  }

  function isEasyImgSharedMount() {
    const panel = document.getElementById("layout-arrange");
    return !!(panel && panel.closest("#easy-img-layout-host"));
  }

  function layoutPhotoOpenWord(row, open) {
    if (!open) return "開く";
    return "これでOK";
  }

  function placePhotoOkFoot(editor, btn) {
    if (!editor || !btn) return;
    const side = editor.querySelector(".layout-photo-side");
    if (side) {
      btn.textContent = "これでOK";
      side.appendChild(btn);
      return;
    }
    let foot = editor.querySelector(":scope > .easy-ok-foot");
    if (!foot) {
      foot = document.createElement("div");
      foot.className = "easy-copy-list-ok-foot easy-ok-foot";
      editor.appendChild(foot);
    }
    btn.textContent = "これでOK";
    foot.appendChild(btn);
  }

  function syncLayoutSectionOk(cell) {
    if (!cell) return;
    const body = cell.querySelector(".layout-arrange-body");
    const secBtn = cell.querySelector(".layout-section-open");
    if (!body || !secBtn) return;
    const old = body.querySelector(":scope > .easy-ok-foot");
    const photoOpen = body.querySelector(".layout-photo-row.is-open");
    if (!cell.open || photoOpen) {
      if (old) old.remove();
      return;
    }
    if (old) {
      body.appendChild(old);
      return;
    }
    const foot = document.createElement("div");
    foot.className = "easy-copy-list-ok-foot easy-ok-foot";
    const ok = document.createElement("button");
    ok.type = "button";
    ok.className = "layout-open-btn is-ok easy-copy-list-ok";
    ok.textContent = "これでOK";
    ok.addEventListener("click", function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      secBtn.click();
    });
    foot.appendChild(ok);
    body.appendChild(foot);
  }

  function syncEasyImgLevels() {
    const host = document.getElementById("easy-img-layout-host");
    const block = document.querySelector('[data-step-id="easy-img-wire"]');
    if (!host) return;
    const inCatch = !!host.closest("#easy-catch-img");
    const photoOpen = !!host.querySelector(".layout-photo-row.is-open");
    const sectionOpen = !!host.querySelector("details.layout-arrange-cell[open]");
    host.classList.toggle("is-photo-solo", photoOpen);
    host.classList.toggle("is-section-solo", sectionOpen && !photoOpen);
    host.classList.toggle("is-easy-drill", sectionOpen || photoOpen);
    if (block) {
      const drill = !inCatch && (sectionOpen || photoOpen);
      block.classList.toggle("is-photo-solo", !inCatch && photoOpen);
      block.classList.toggle("is-section-solo", !inCatch && sectionOpen && !photoOpen);
      block.classList.toggle("is-easy-drill", drill);
    }
  }

  function syncEasyImgPhotoSolo() {
    syncEasyImgLevels();
  }

  function closeEasyImgSection(cell) {
    if (!cell) return;
    cell.open = false;
  }

  function closeEasyImgSoloPhoto() {
    const host = document.getElementById("easy-img-layout-host");
    if (!host) return;
    const row = host.querySelector(".layout-photo-row.is-open");
    if (!row) {
      syncEasyImgLevels();
      return;
    }
    const photoKey = row.getAttribute("data-layout-photo") || "";
    const sep = photoKey.indexOf(":");
    const blockId = sep >= 0 ? photoKey.slice(0, sep) : "";
    const slot = sep >= 0 ? photoKey.slice(sep + 1) : "";
    const countId = blockId ? layoutImageCountId(blockId) : "";
    const openKey = countId || blockId;
    if (!store.layoutInnerByBlock) store.layoutInnerByBlock = {};
    if (openKey) store.layoutInnerByBlock[openKey] = "";
    applyLayoutPhotoRowOpen(row, blockId, slot, false);
    if (blockId === "hero") {
      const cell = row.closest("details.layout-arrange-cell");
      if (cell) {
        closeEasyImgSection(cell);
        const secBtn = cell.querySelector(".layout-section-open");
        if (secBtn) {
          secBtn.textContent = "開く";
          secBtn.hidden = false;
          secBtn.classList.remove("is-ok");
          secBtn.setAttribute("aria-expanded", "false");
        }
        if (store.layoutAccordionId === "hero") store.layoutAccordionId = "";
        const body = cell.querySelector(".layout-arrange-body");
        if (body) body.innerHTML = "";
      }
    }
    syncEasyImgLevels();
  }

  function bindEasyImgPhotoPop() {
    if (bindEasyImgPhotoPop.done) return;
    bindEasyImgPhotoPop.done = true;
    window.addEventListener("popstate", () => {
      if (easyImgMutePop) {
        easyImgMutePop = false;
        return;
      }
      if (easyImgHistoryDepth <= 0) return;
      easyImgHistoryDepth -= 1;
      const host = document.getElementById("easy-img-layout-host");
      if (!host) return;
      const openRow = host.querySelector(".layout-photo-row.is-open");
      if (openRow) {
        closeEasyImgSoloPhoto();
        return;
      }
      const openCell = host.querySelector("details.layout-arrange-cell[open]");
      if (openCell) closeEasyImgSection(openCell);
      syncEasyImgLevels();
    });
  }

  function rememberEasyImgLevel() {
    bindEasyImgPhotoPop();
    history.pushState({ easyImgLevel: 1 }, "", location.href);
    easyImgHistoryDepth += 1;
  }

  function rememberEasyImgPhotoOpen() {
    rememberEasyImgLevel();
  }

  function popEasyImgHistoryQuiet() {
    if (easyImgHistoryDepth <= 0) return;
    easyImgHistoryDepth -= 1;
    easyImgMutePop = true;
    try {
      history.back();
    } catch (err) {
      easyImgMutePop = false;
    }
  }

  function applyLayoutPhotoRowOpen(row, blockId, slot, open) {
    if (!row) return;
    const line = row.querySelector(":scope > .layout-closed-line");
    const editor = row.querySelector(":scope > .layout-photo-editor");
    const btn = row.querySelector(".layout-open-btn");
    if (!line || !editor || !btn) return;
    row.classList.toggle("is-open", !!open);
    btn.classList.toggle("is-ok", !!open);
    btn.textContent = layoutPhotoOpenWord(row, open);
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    editor.innerHTML = "";
    if (open) {
      appendLayoutPhotoEditor(editor, blockId, slot);
      placePhotoOkFoot(editor, btn);
      const map = editor.querySelector(".layout-source-map");
      if (map) alignOpenSourceMapToPad(map);
      syncEasyImgLevels();
      if (blockId === "photos" || blockId === "works" || blockId === "hero") alignOpenPhotoWithPreview();
      else {
        focusPreviewLayoutFrame(blockId, slot);
        alignOpenPhotoWithPreview();
      }
      syncLayoutSectionOk(row.closest("details.layout-arrange-cell"));
      return;
    }
    line.appendChild(btn);
    syncLayoutSectionOk(row.closest("details.layout-arrange-cell"));
    clearPhotoListShift();
    syncEasyImgLevels();
    if (!document.querySelector(".layout-photo-row.is-open")) focusOpenLayoutSection();
  }

  function buildLayoutClosedFace(blockId) {
    const face = document.createElement("div");
    face.className = "layout-closed-face";
    const countId = layoutImageCountId(blockId);
    const order = layoutBlockSlots(blockId);
    const layout = countId ? normalizeItemLayout(countId) : null;

    if (!store.layoutInnerByBlock) store.layoutInnerByBlock = {};
    const openKey = countId || blockId;
    const openSlot = store.layoutInnerByBlock[openKey] || "";

    order.forEach((slot) => {
      const line = document.createElement("div");
      line.className = "layout-closed-line";
      const thumb = document.createElement("span");
      thumb.className = "layout-closed-thumb";
      markLayoutMirror(thumb, blockId, slot, "thumb");
      const imageName = layoutFrameImageName(blockId, slot);
      const src = layoutFramePreviewSrc(imageName);
      if (src) {
        const img = document.createElement("img");
        img.alt = "";
        img.src = src;
        img.draggable = false;
        thumb.appendChild(img);
      }
      const cluster = document.createElement("span");
      cluster.className = "layout-closed-id";
      if (countId && !(isEasyImgSharedMount() && order.length < 2)) {
        const handle = document.createElement("span");
        handle.className = "layout-inner-handle";
        handle.textContent = "⋮⋮";
        handle.setAttribute("aria-label", "この枠の順番を変えられます");
        setHoverTip(handle, "押したまま上下に動かすと、順番を変えられます");
        cluster.appendChild(handle);
      }
      const locked = !!(store.imgOmakaseLocks && store.imgOmakaseLocks[imageName]);
      const lockBtn = document.createElement("button");
      lockBtn.type = "button";
      lockBtn.className = "layout-lock-mark easy-img-omakase-lock" + (locked ? " is-on" : "");
      lockBtn.textContent = locked ? "はずす" : "残す";
      lockBtn.setAttribute("aria-label", locked ? "はずす" : "残す");
      lockBtn.setAttribute("aria-pressed", locked ? "true" : "false");
      lockBtn.addEventListener("click", (ev) => {
        stopSummaryToggle(ev);
        const key = layoutFrameLockKey(blockId, slot);
        const now = !!(store.imgOmakaseLocks && store.imgOmakaseLocks[key]);
        setLayoutFrameLocked(blockId, slot, !now);
      });
      if (!isEasyImgSharedMount()) cluster.appendChild(lockBtn);
      cluster.appendChild(thumb);
      const frameLabel = document.createElement("span");
      frameLabel.className = "layout-frame-name";
      frameLabel.textContent = layoutFrameLabel(blockId, slot);
      line.appendChild(cluster);
      line.appendChild(frameLabel);
      if (blockId === "hero") {
        const blank = document.createElement("span");
        blank.className = "layout-page-blank";
        blank.setAttribute("aria-hidden", "true");
        line.appendChild(blank);
      } else {
        const sz = layout && layout.sizeById ? layout.sizeById[slot] : "L";
        const word = document.createElement("button");
        word.type = "button";
        word.className = "layout-tap layout-size-word " + (sz === "H" ? "is-half-word" : "is-full-word");
        word.textContent = layoutSizeWord(sz);
        word.addEventListener("click", (ev) => {
          stopSummaryToggle(ev);
          openLayoutChoice(
            word,
            [
              { value: "L", label: layoutSizeWord("L"), bold: true },
              { value: "H", label: layoutSizeWord("H"), bold: false }
            ],
            (token) => setLayoutFrameWidth(countId, slot, token)
          );
        });
        line.appendChild(word);
      }
      const openNow = openSlot === slot;
      const openBtn = document.createElement("button");
      openBtn.type = "button";
      openBtn.className = "layout-open-btn" + (openNow ? " is-ok" : "");
      openBtn.textContent = openNow ? (isEasyImgSharedMount() ? "これでOK" : "OK") : "開く";
      openBtn.setAttribute("aria-expanded", openNow ? "true" : "false");
      openBtn.addEventListener("click", (ev) => {
        stopSummaryToggle(ev);
        if (!store.layoutInnerByBlock) store.layoutInnerByBlock = {};
        const inEasy = easyImgPhotoHostRow(row);
        if (row.classList.contains("is-open")) {
          if (row.closest("#easy-catch-img") && (store.catchPage || "") === "image") {
            wizardNext();
            return;
          }
          if (inEasy) {
            closeEasyImgSoloPhoto();
            popEasyImgHistoryQuiet();
          } else {
            store.layoutInnerByBlock[openKey] = "";
            applyLayoutPhotoRowOpen(row, blockId, slot, false);
          }
          return;
        }
        const face = row.parentElement;
        if (face) {
          face.querySelectorAll(".layout-photo-row.is-open").forEach((other) => {
            if (other === row) return;
            const photoKey = other.getAttribute("data-layout-photo") || "";
            const otherSlot = photoKey.slice(photoKey.indexOf(":") + 1);
            applyLayoutPhotoRowOpen(other, blockId, otherSlot, false);
          });
        }
        if (inEasy) {
          const host = row.closest("#easy-img-layout-host");
          if (host) {
            host.querySelectorAll(".layout-photo-row.is-open").forEach((other) => {
              if (other === row) return;
              const photoKey = other.getAttribute("data-layout-photo") || "";
              const sep = photoKey.indexOf(":");
              const otherBlock = sep >= 0 ? photoKey.slice(0, sep) : "";
              const otherSlot = sep >= 0 ? photoKey.slice(sep + 1) : "";
              applyLayoutPhotoRowOpen(other, otherBlock, otherSlot, false);
            });
          }
        }
        setOnlyLayoutFrameOpen(openKey, slot);
        applyLayoutPhotoRowOpen(row, blockId, slot, true);
        if (blockId !== "photos" && blockId !== "works" && blockId !== "hero") focusPreviewLayoutFrame(blockId, slot);
        if (inEasy) {
          rememberEasyImgPhotoOpen();
          const scroller = document.querySelector(".dash-body > .fill-form");
          if (scroller) scroller.scrollTop = 0;
          return;
        }
        window.requestAnimationFrame(() => {
          const panel = row.querySelector(".layout-photo-editor") || row;
          scrollDashChildToTop(panel);
          alignOpenPhotoWithPreview();
        });
      });
      const row = document.createElement("div");
      row.className = "layout-photo-row" + (countId ? " layout-inner" : "") + (openNow ? " is-open" : "");
      row.setAttribute("data-layout-photo", blockId + ":" + slot);
      if (countId) row.setAttribute("data-item-id", slot);
      row.appendChild(line);
      const editor = document.createElement("div");
      editor.className = "layout-photo-editor";
      if (openNow) appendLayoutPhotoEditor(editor, blockId, slot);
      row.appendChild(editor);
      if (openNow) placePhotoOkFoot(editor, openBtn);
      else line.appendChild(openBtn);
      if (countId) bindLayoutInnerDrag(row, countId, slot);
      face.appendChild(row);
    });
    return face;
  }

  function layoutClosedMetaLine(blockId) {
    if (blockId === "hero") return "写真1枚　並び：いっぱい";
    const countId = layoutImageCountId(blockId);
    const order = layoutBlockSlots(blockId);
    const layout = normalizeItemLayout(countId);
    const sizes = order.map((slot) => layoutSizeWord(layout && layout.sizeById ? layout.sizeById[slot] : "L"));
    const gap = ITEM_GAP_LABELS[(layout && layout.gap) || "normal"] || "ふつう";
    return "写真" + order.length + "枚　並び：" + (sizes.join("・") || "—") + "　すき間：" + gap;
  }

  function buildLayoutClosedThumbs(blockId) {
    const wrap = document.createElement("span");
    wrap.className = "layout-closed-thumbs";
    layoutBlockSlots(blockId).forEach((slot) => {
      const imageName = layoutFrameImageName(blockId, slot);
      const fig = document.createElement("span");
      fig.className = "layout-closed-thumb";
      const src = layoutFramePreviewSrc(imageName);
      if (src) {
        const img = document.createElement("img");
        img.alt = "";
        img.src = src;
        fig.appendChild(img);
      } else {
        fig.classList.add("is-empty");
      }
      const locked = !!(store.imgOmakaseLocks && store.imgOmakaseLocks[imageName]);
      const mark = document.createElement("span");
      mark.className = "layout-closed-lock" + (locked ? " is-locked" : "");
      mark.textContent = locked ? "はずす" : "残す";
      mark.setAttribute("aria-label", locked ? "はずす" : "残す");
      fig.appendChild(mark);
      wrap.appendChild(fig);
    });
    return wrap;
  }

  function rememberLayoutReplaceBefore(imageName) {
    const gallery = store.galleryPicks && store.galleryPicks[imageName];
    layoutReplaceBefore[imageName] = {
      src: layoutFramePreviewSrc(imageName) || "",
      url: imageUrls[imageName] || "",
      gallery: gallery ? Object.assign({}, gallery) : null
    };
  }

  function undoLayoutImageOnce(imageName) {
    const snap = layoutReplaceBefore[imageName];
    if (!snap) return;
    const input = form.elements.namedItem(imageName);
    if (input && input.type === "file") {
      try {
        input.value = "";
      } catch (e) {
        /* ignore */
      }
    }
    if (store.zipImageFiles && store.zipImageFiles[imageName]) delete store.zipImageFiles[imageName];
    if (snap.gallery) {
      if (!store.galleryPicks) store.galleryPicks = {};
      store.galleryPicks[imageName] = snap.gallery;
    } else if (store.galleryPicks) {
      delete store.galleryPicks[imageName];
    }
    if (snap.url) setRemoteImageUrl(imageName, snap.url);
    else setRemoteImageUrl(imageName, "");
    applyImageSlotByName(imageName, !!snap.url);
    delete layoutReplaceBefore[imageName];
    if (store.confirmed.finish) unconfirmFinishSoft();
    scheduleSave();
    renderLayoutArrangeWire();
  }

  function paintLayoutLockMark(blockId, slot, locked) {
    const on = !!locked;
    document.querySelectorAll('[data-layout-photo="' + blockId + ":" + slot + '"] .layout-lock-mark').forEach((btn) => {
      btn.classList.toggle("is-on", on);
      btn.textContent = on ? "はずす" : "残す";
      btn.setAttribute("aria-label", on ? "はずす" : "残す");
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function setLayoutFrameLocked(blockId, slot, locked) {
    const lockKey = layoutFrameLockKey(blockId, slot);
    if (!store.imgOmakaseLocks || typeof store.imgOmakaseLocks !== "object") store.imgOmakaseLocks = {};
    if (!!store.imgOmakaseLocks[lockKey] === !!locked) return;
    store.imgOmakaseLocks[lockKey] = !!locked;
    closeLayoutChoice();
    scheduleSave();
    paintLayoutLockMark(blockId, slot, locked);
  }

  function toggleLayoutFrameLock(blockId, slot) {
    const lockKey = layoutFrameLockKey(blockId, slot);
    if (!store.imgOmakaseLocks || typeof store.imgOmakaseLocks !== "object") store.imgOmakaseLocks = {};
    store.imgOmakaseLocks[lockKey] = !store.imgOmakaseLocks[lockKey];
    if (!store.layoutInnerByBlock) store.layoutInnerByBlock = {};
    if (blockId !== "hero") store.layoutInnerByBlock[layoutImageCountId(blockId)] = slot;
    scheduleSave();
    renderLayoutArrangeWire();
  }


  function appendLayoutAdjust(parent, blockId, slot) {
    const block = document.createElement("section");
    block.className = "layout-adjust";
    const row = document.createElement("div");
    row.className = "layout-adjust-row";
    const zoom = document.createElement("div");
    zoom.className = "layout-adjust-zoom";
    zoom.setAttribute("data-scale-block", blockId);
    zoom.setAttribute("data-scale-slot", slot || "");
    const view = layoutFrameViewState(blockId, slot);
    const scaleNow = normalizeImageScale(view && view.scale);
    const rangeValue = scaleNow;
    zoom.innerHTML =
      '<span class="layout-adjust-scale"></span>' +
      '<input class="layout-zoom-range-input" type="range" min="' +
      IMAGE_SCALE_MIN +
      '" max="' +
      IMAGE_SCALE_MAX +
      '" step="' +
      IMAGE_SCALE_STEP +
      '" value="' +
      rangeValue +
      '" aria-label="写真の大きさ">';
    const zoomBlock = document.createElement("div");
    zoomBlock.className = "layout-zoom-block";
    const zoomLabel = document.createElement("p");
    zoomLabel.className = "layout-zoom-label";
    zoomLabel.setAttribute("aria-hidden", "true");
    zoomBlock.appendChild(zoomLabel);
    zoomBlock.appendChild(zoom);
    const range = zoom.querySelector(".layout-zoom-range-input");
    let scaleUndoArmed = false;
    if (range) {
      range.addEventListener("pointerdown", () => {
        scaleUndoArmed = true;
      });
      range.addEventListener("input", () => {
        const raw = Number(range.value);
        setFrameImageScale(blockId, slot, raw, scaleUndoArmed);
        scaleUndoArmed = false;
      });
    }
    if (blockId === "hero") {
      ensureHeroFocalDefaults();
      syncOpenLayoutScale(zoom, store.heroImageScale);
    } else {
      const countId = layoutImageCountId(blockId);
      const layout = normalizeItemLayout(countId);
      syncOpenLayoutScale(zoom, layout && layout.scaleById ? layout.scaleById[slot] : IMAGE_SCALE_DEFAULT);
    }
    row.appendChild(zoomBlock);
    block.appendChild(row);
    parent.appendChild(block);
  }

  function appendLayoutPhotoEditor(parent, blockId, slot) {
    const imageName = layoutFrameImageName(blockId, slot);
    const nowSrc = layoutFramePreviewSrc(imageName);
    const inEasySample = isEasyImgSharedMount();
    const tools = document.createElement("div");
    tools.className = "layout-photo-tools layout-photo-tools--plain";
    const sources = document.createElement("div");
    sources.className = "layout-img-sources" + (inEasySample ? " is-sample-two" : "");
    const selfBtn = document.createElement("button");
    selfBtn.type = "button";
    selfBtn.className = "layout-img-source";
    if (inEasySample) {
      selfBtn.textContent = "ファイルから選ぶ";
    } else {
      selfBtn.appendChild(document.createTextNode("自分の画像"));
      selfBtn.appendChild(document.createElement("br"));
      selfBtn.appendChild(document.createTextNode("から選ぶ"));
    }
    selfBtn.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      if (!inEasySample && layoutPhotoReplaceLocked(blockId, slot)) {
        showLayoutPhotoLockedNotice();
        return;
      }
      const input = form.elements.namedItem(imageName);
      if (input && typeof input.click === "function") input.click();
    });
    const galleryBtn = document.createElement("button");
    galleryBtn.type = "button";
    galleryBtn.className = "layout-img-source layout-img-source--gallery";
    if (inEasySample) {
      galleryBtn.textContent = "ギャラリーから選ぶ";
    } else {
      galleryBtn.appendChild(document.createTextNode("ギャラリー"));
      galleryBtn.appendChild(document.createElement("br"));
      galleryBtn.appendChild(document.createTextNode("から選ぶ"));
    }
    galleryBtn.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      if (!inEasySample && layoutPhotoReplaceLocked(blockId, slot)) {
        showLayoutPhotoLockedNotice();
        return;
      }
      openFreePhotoGalleryModal(imageName, { sampleGenreOmakase: inEasySample });
    });
    const picked = !!(store.galleryPicks && store.galleryPicks[imageName]);
    if (picked) galleryBtn.classList.add("is-on");
    else selfBtn.classList.add("is-on");
    sources.appendChild(selfBtn);
    sources.appendChild(galleryBtn);
    if (!inEasySample) {
      const omakaseBtn = document.createElement("button");
      omakaseBtn.type = "button";
      omakaseBtn.className = "layout-img-source layout-photo-omakase";
      omakaseBtn.textContent = "ランダムに選ぶ";
      omakaseBtn.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        runLayoutPhotoOmakase(blockId, slot, omakaseBtn);
      });
      const underLock = document.createElement("button");
      underLock.type = "button";
      const underLocked = !!(store.imgOmakaseLocks && store.imgOmakaseLocks[imageName]);
      underLock.className = "layout-lock-mark layout-lock-under easy-img-omakase-lock" + (underLocked ? " is-on" : "");
      underLock.textContent = underLocked ? "はずす" : "残す";
      underLock.setAttribute("aria-label", underLocked ? "はずす" : "残す");
      underLock.setAttribute("aria-pressed", underLocked ? "true" : "false");
      underLock.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const now = !!(store.imgOmakaseLocks && store.imgOmakaseLocks[imageName]);
        setLayoutFrameLocked(blockId, slot, !now);
      });
      sources.appendChild(omakaseBtn);
      sources.appendChild(underLock);
    }
    const cluster = document.createElement("div");
    cluster.className = "layout-photo-cluster";
    tools.appendChild(sources);
    tools.appendChild(cluster);
    parent.appendChild(tools);
    appendLayoutAdjust(cluster, blockId, slot);
    const mapStep = document.createElement("section");
    mapStep.className = "layout-source-step";
    const map = document.createElement("div");
    map.className = "layout-source-map";
    map.setAttribute("data-mirror-block", blockId);
    map.setAttribute("data-mirror-slot", slot);
    const mapImg = document.createElement("img");
    mapImg.alt = "";
    mapImg.draggable = false;
    if (nowSrc) mapImg.src = nowSrc;
    mapImg.addEventListener("load", () => {
      paintLayoutSourceMap(map);
      alignOpenPhotoWithPreview();
    });
    const mapWin = document.createElement("div");
    mapWin.className = "layout-source-window";
    mapWin.setAttribute("aria-hidden", "true");
    map.appendChild(mapImg);
    map.appendChild(mapWin);
    if (parent.closest("#easy-img-layout-host")) {
      const tipWrap = document.createElement("span");
      tipWrap.className = "hub-tip-wrap layout-frame-tip";
      const tipBtn = document.createElement("button");
      tipBtn.type = "button";
      tipBtn.className = "hub-tip-btn";
      tipBtn.setAttribute("data-hub-tip", "");
      tipBtn.setAttribute("aria-label", "枠の動かし方");
      tipBtn.textContent = "?";
      const pop = document.createElement("p");
      pop.className = "hub-tip-pop";
      pop.textContent = "白い枠を動かすと、表示したい部分に合わせられます。";
      tipWrap.appendChild(tipBtn);
      tipWrap.appendChild(pop);
      map.appendChild(tipWrap);
      setupHubTips(map);
      bindSoloFrameDrag(map, blockId, slot);
    }
    mapStep.appendChild(map);
    if (parent.closest("#easy-img-layout-host")) {
      const side = document.createElement("div");
      side.className = "layout-photo-side";
      const home = document.createElement("button");
      home.type = "button";
      home.className = "layout-frame-home";
      home.textContent = "元に戻す";
      home.setAttribute("aria-label", "元に戻す");
      home.disabled = layoutFrameIsHome(blockId, slot);
      home.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        resetLayoutFrameHome(blockId, slot);
      });
      side.appendChild(home);
      mapStep.appendChild(side);
    }
    cluster.appendChild(mapStep);
    paintLayoutSourceMap(map);
  }

  function renderLayoutImageInner(body, blockId) {
    body.innerHTML = "";
    if (isEasyImgSharedMount() && blockId !== "hero") {
      const tools = document.createElement("div");
      tools.className = "layout-frames-tools";
      appendLayoutHeadCountGap(tools, blockId);
      body.appendChild(tools);
    }
    body.appendChild(buildLayoutClosedFace(blockId));
    body.querySelectorAll(".layout-photo-row").forEach((row) => {
      const btn = row.querySelector(".layout-open-btn");
      if (btn) btn.textContent = layoutPhotoOpenWord(row, row.classList.contains("is-open"));
    });
    body.querySelectorAll(".layout-closed-thumb").forEach(paintLayoutMirror);
    syncEasyImgLevels();
  }

  function renderLayoutArrangeWire() {
    const openHost = document.querySelector("#easy-img-layout-host");
    if (openHost) openHost.style.paddingBottom = "";
    restoreLayoutSectionInputs();
    const hosts = layoutArrangeHosts();
    const order = normalizeLayoutOrder(store.layoutOrder);
    const openId = store.layoutAccordionId || "";
    if (hosts.length) {
      store._layoutAccordionRendering = true;
      hosts.forEach((host) => {
        host.innerHTML = "";
        host.classList.remove(
          "layout-arrange-wire--split",
          "layout-arrange-wire--mix"
        );
        host.classList.add("layout-arrange-wire--wide");
        let openCell = null;
        const imageOnly = !!(
          document.getElementById("easy-img-layout-host") &&
          document.getElementById("easy-img-layout-host").contains(host)
        );
        const faceSlot = document.getElementById("easy-catch-img");
        const inCatchFace = !!(faceSlot && faceSlot.contains(host));
        order.forEach((id) => {
          const meta = LAYOUT_BLOCKS.find((b) => b.id === id);
          if (!meta) return;
          if (inCatchFace && id !== "hero") return;
          if (imageOnly && (!isLayoutImageBlock(id) || !isLayoutBlockActive(meta))) return;
          const displayLabel = layoutBlockDisplayLabel(meta);
          const on = isLayoutBlockActive(meta);
          const cell = document.createElement("details");
          cell.className = "layout-arrange-cell size-L layout-arrange-cell--structure" + (on ? "" : " is-layout-off");
          cell.setAttribute("data-layout-block", id);
          cell.setAttribute("data-preview-target", meta.selector);
          if (!inCatchFace) cell.setAttribute("name", "layout-arrange-section");
          cell.setAttribute("draggable", "false");
          cell.setAttribute("role", "listitem");
          cell.setAttribute(
            "aria-label",
            displayLabel + (on ? "（表示中・ドラッグで並び替え）" : "（非表示・ドラッグで並び替え）")
          );

          const summary = document.createElement("summary");
          summary.className = "layout-arrange-summary";
          const imageBlock = isLayoutImageBlock(id);
          if (imageBlock) summary.classList.add("layout-arrange-summary--image");

          const name = document.createElement("span");
          name.className = "layout-arrange-name";
          name.textContent = displayLabel;

          if (!imageBlock) {
            summary.appendChild(name);
            const diagram = buildLayoutMiniDiagram(meta);
            if (diagram) summary.appendChild(diagram);
          }

          const visLabel = document.createElement("label");
          visLabel.className = "layout-arrange-vis-label";
          const vis = document.createElement("input");
          vis.type = "checkbox";
          vis.className = "layout-arrange-vis";
          vis.checked = on;
          vis.setAttribute("aria-label", displayLabel + "を表示");
          setHoverTip(vis, "チェックを外すと、見本から外せます。");
          vis.addEventListener("click", (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            commitLayoutBlockVisibility(id, !isLayoutBlockActive(meta));
            vis.checked = isLayoutBlockActive(meta);
            window.setTimeout(() => syncLayoutBlockVisibilityRow(id), 0);
          });
          vis.addEventListener("change", (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            vis.checked = isLayoutBlockActive(meta);
          });
          vis.addEventListener("keydown", (ev) => {
            if (ev.key !== " " && ev.key !== "Enter") return;
            ev.preventDefault();
            ev.stopPropagation();
            commitLayoutBlockVisibility(id, !isLayoutBlockActive(meta));
            vis.checked = isLayoutBlockActive(meta);
            window.setTimeout(() => syncLayoutBlockVisibilityRow(id), 0);
          });
          visLabel.addEventListener("pointerdown", (ev) => {
            ev.stopPropagation();
          });
          visLabel.addEventListener("click", (ev) => {
            ev.stopPropagation();
          });
          visLabel.appendChild(vis);

          const handle = document.createElement("span");
          handle.className = "layout-arrange-handle";
          handle.textContent = "⋮⋮";
          handle.setAttribute("aria-label", "この段の順番を変えられます");
          setHoverTip(handle, "つかんだまま上下に動かすと、順番を変えられます");

          let head = null;
          if (imageBlock) {
            head = document.createElement("div");
            head.className = "layout-closed-head" + (imageOnly ? " layout-closed-head--list" : "");
            if (!imageOnly) head.appendChild(visLabel);
            head.appendChild(handle);
            head.appendChild(name);
            if (!imageOnly) appendLayoutHeadCountGap(head, id);
            const secOpen = document.createElement("button");
            secOpen.type = "button";
            secOpen.className = "layout-open-btn layout-section-open";
            secOpen.textContent = "開く";
            secOpen.hidden = id === openId;
            secOpen.setAttribute("aria-expanded", id === openId ? "true" : "false");
            secOpen.addEventListener("click", (ev) => {
              ev.preventDefault();
              ev.stopPropagation();
              if (imageOnly && !inCatchFace && id === "hero") {
                openCatchFromLayout(catchImageIsOn() ? "image" : "imageAsk");
                return;
              }
              if (imageOnly && cell.open) {
                const openRow = cell.querySelector(".layout-photo-row.is-open");
                if (openRow) return;
                cell.open = false;
                secOpen.textContent = "開く";
                secOpen.hidden = false;
                secOpen.classList.remove("is-ok");
                secOpen.setAttribute("aria-expanded", "false");
                if (isLayoutImageBlock(id)) {
                  const countId = layoutImageCountId(id);
                  const openKey = countId || id;
                  if (!store.layoutInnerByBlock) store.layoutInnerByBlock = {};
                  store.layoutInnerByBlock[openKey] = "";
                  body.innerHTML = "";
                }
                if (store.layoutAccordionId === id) store.layoutAccordionId = "";
                syncEasyImgLevels();
                popEasyImgHistoryQuiet();
                return;
              }
              const willOpen = !cell.open;
              cell.open = willOpen;
              if (willOpen) {
                syncLayoutAccordionOnce();
                if (imageOnly) rememberEasyImgLevel();
              }
            });
            head.appendChild(secOpen);
            summary.appendChild(head);
          } else {
            summary.appendChild(visLabel);
            summary.appendChild(handle);
          }

          const body = document.createElement("div");
          body.className = "layout-arrange-body";

          const syncLayoutAccordion = () => {
            if (!cell.isConnected) return;
            const secBtn = summary.querySelector(".layout-section-open");
            if (secBtn) {
              secBtn.textContent = "開く";
              secBtn.hidden = !!cell.open;
              secBtn.classList.remove("is-ok");
              secBtn.setAttribute("aria-expanded", cell.open ? "true" : "false");
            }
            const placeSectionOk = function () {
              syncLayoutSectionOk(cell);
            };
            if (!cell.open) {
              if (store.layoutAccordionId === id) store.layoutAccordionId = "";
              if (isLayoutImageBlock(id)) {
                const countId = layoutImageCountId(id);
                const openKey = countId || id;
                if (!store.layoutInnerByBlock) store.layoutInnerByBlock = {};
                store.layoutInnerByBlock[openKey] = "";
                body.innerHTML = "";
              }
              if (body.querySelector("[data-layout-input-home]")) restoreLayoutSectionInputs();
              syncEasyImgLevels();
              focusOpenLayoutSection();
              return;
            }
            store.layoutAccordionId = id;
            host.querySelectorAll("details.layout-arrange-cell").forEach((el) => {
              if (el !== cell && el.open) el.open = false;
            });
            restoreLayoutSectionInputs();
            if (isLayoutImageBlock(id)) renderLayoutImageInner(body, id);
            else if (LAYOUT_SECTION_INPUTS[id]) mountLayoutSectionInputs(body, id);
            if (imageOnly && isLayoutImageBlock(id)) {
              if (id === "hero") {
                const row = body.querySelector(".layout-photo-row");
                const slot =
                  (row && (row.getAttribute("data-item-id") || "").trim()) ||
                  (layoutBlockSlots("hero")[0] || "hero");
                const scroller = document.querySelector(".dash-body > .fill-form");
                if (scroller) scroller.scrollTop = 0;
                parkSectionTop("hero");
                if (row) {
                  setOnlyLayoutFrameOpen("hero", slot);
                  applyLayoutPhotoRowOpen(row, "hero", slot, true);
                }
              } else {
                const scroller = document.querySelector(".dash-body > .fill-form");
                if (scroller) scroller.scrollTop = 0;
                parkSectionTop(id);
                const countId = layoutImageCountId(id);
                const openKey = countId || id;
                const slot = (store.layoutInnerByBlock && store.layoutInnerByBlock[openKey]) || "";
                const row = slot
                  ? body.querySelector('[data-layout-photo="' + id + ":" + slot + '"]')
                  : null;
                if (row) applyLayoutPhotoRowOpen(row, id, slot, true);
              }
              placeSectionOk();
              syncEasyImgLevels();
              return;
            }
            if (!isLayoutImageBlock(id)) {
              const sel = cell.getAttribute("data-preview-target") || meta.selector;
              scrollPreviewTo(sel);
              focusPreviewBlock(id);
            } else {
              window.requestAnimationFrame(() => {
                const row = cell.querySelector(".layout-photo-row.is-open");
                if (row) {
                  if (!easyImgPhotoHostRow(row)) {
                    scrollDashChildToTop(row.querySelector(".layout-photo-editor") || row);
                    parkSectionTop(id);
                    alignOpenPhotoWithPreview();
                  }
                } else {
                  scrollDashChildToTop(cell);
                  parkSectionTop(id);
                }
                cell.querySelectorAll(".layout-photo-row.is-open .layout-source-map").forEach(alignOpenSourceMapToPad);
              });
            }
            placeSectionOk();
            syncEasyImgLevels();
          };
          let layoutAccordionSyncedAt = 0;
          const syncLayoutAccordionOnce = () => {
            const now = Date.now();
            if (now - layoutAccordionSyncedAt < 40) return;
            layoutAccordionSyncedAt = now;
            syncLayoutAccordion();
          };

          cell.appendChild(summary);
          cell.appendChild(body);
          summary.addEventListener("click", (ev) => {
            if (ev.target.closest && ev.target.closest(".layout-arrange-handle, .layout-arrange-vis-label, .layout-arrange-vis, .layout-section-open, .layout-section-tools")) {
              ev.preventDefault();
              return;
            }
            if (imageOnly) {
              ev.preventDefault();
              return;
            }
            if (imageBlock) {
              if (cell.open) {
                ev.preventDefault();
                if (cell.closest("#easy-img-layout-host.is-photo-solo")) return;
                cell.open = false;
              }
              return;
            }
            window.setTimeout(() => {
              if (cell._syncOpenLabel) cell._syncOpenLabel();
              syncLayoutAccordionOnce();
            }, 0);
          });
          cell.addEventListener("toggle", () => {
            if (!cell.isConnected) return;
            if (cell._syncOpenLabel) cell._syncOpenLabel();
            if (store._layoutAccordionRendering) return;
            syncLayoutAccordionOnce();
          });
          bindLayoutArrangeDrag(cell, id);
          host.appendChild(cell);
          if (id === openId) openCell = cell;
        });
        if (openCell) {
          openCell.open = true;
          const body = openCell.querySelector(".layout-arrange-body");
          const bid = openCell.getAttribute("data-layout-block");
          if (body && isLayoutImageBlock(bid)) {
            renderLayoutImageInner(body, bid);
            if (imageOnly && isLayoutImageBlock(bid)) {
              const countId = layoutImageCountId(bid);
              const openKey = countId || bid;
              const slot =
                (store.layoutInnerByBlock && store.layoutInnerByBlock[openKey]) ||
                (bid === "hero" ? layoutBlockSlots("hero")[0] || "hero" : "");
              const row = slot
                ? body.querySelector('[data-layout-photo="' + bid + ":" + slot + '"]')
                : null;
              if (row) {
                if (bid === "hero") setOnlyLayoutFrameOpen("hero", slot);
                applyLayoutPhotoRowOpen(row, bid, slot, true);
              }
            }
          } else if (body && LAYOUT_SECTION_INPUTS[bid]) mountLayoutSectionInputs(body, bid);
        }
      });
      store._layoutAccordionRendering = false;
      syncEasyImgLevels();
    }
    renderLayoutCardWires();
    syncLayoutMirrors();
    const pendingCenter = layoutScrollPhoto;
    layoutScrollPhoto = null;
    window.requestAnimationFrame(() => {
      syncLayoutMirrors();
      document.querySelectorAll("#easy-img-layout-host .layout-source-map").forEach(alignOpenSourceMapToPad);
      const openCell = document.querySelector("#easy-img-layout-host details.layout-arrange-cell[open]");
      if (openCell) {
        const openRow = openCell.querySelector(".layout-photo-row.is-open");
        if (openRow) {
          if (!easyImgPhotoHostRow(openRow)) {
            scrollDashChildToTop(openRow.querySelector(".layout-photo-editor") || openRow);
            const bid = openCell.getAttribute("data-layout-block") || "";
            if (bid) parkSectionTop(bid);
            alignOpenPhotoWithPreview();
          }
        } else {
          scrollDashChildToTop(openCell);
          const bid = openCell.getAttribute("data-layout-block") || "";
          if (bid) parkSectionTop(bid);
        }
      }
      if (!pendingCenter) return;
      const row = document.querySelector(
        '[data-layout-photo="' + pendingCenter.blockId + ":" + pendingCenter.slot + '"]'
      );
      if (row && !easyImgPhotoHostRow(row)) scrollDashChildToTop(row);
      const map = row && row.querySelector(".layout-source-map");
      if (map) alignOpenSourceMapToPad(map);
      if (row && !easyImgPhotoHostRow(row)) alignOpenPhotoWithPreview();
      window.requestAnimationFrame(() => {
        if (row && !easyImgPhotoHostRow(row)) scrollDashChildToTop(row);
        if (map) alignOpenSourceMapToPad(map);
        alignOpenPhotoWithPreview();
      });
    });
  }

  function bindLayoutArrangeDrag(cell, id) {
    const isVisControl = (target) =>
      !!(target && target.closest && target.closest(".layout-arrange-vis-label"));

    const commitDragIfChanged = () => {
      const beforeArr = store.layoutOrderBeforeDrag || [];
      const before = beforeArr.join(",");
      const after = normalizeLayoutOrder(store.layoutOrder).join(",");
      if (!before || before === after) return false;
      if (!store.layoutUndoRestoring) {
        const snap = snapshotLayoutUndoState();
        snap.layoutOrder = beforeArr.slice();
        if (!Array.isArray(store.layoutUndoStack)) store.layoutUndoStack = [];
        store.layoutUndoStack.push(snap);
        if (store.layoutUndoStack.length > LAYOUT_UNDO_MAX) {
          store.layoutUndoStack.splice(0, store.layoutUndoStack.length - LAYOUT_UNDO_MAX);
        }
        syncLayoutUndoButton();
      }
      if (store.confirmed.finish) unconfirmFinishSoft();
      updateFinishSummary();
      scheduleSave();
      scheduleApplyLayoutAfterDrag();
      return true;
    };

    const endDrag = () => {
      if (cell.closest("#easy-img-layout-host")) {
        cell.style.transform = "";
        commitDragIfChanged();
        store._layoutPointerId = null;
        clearLayoutDragUi();
        releasePreviewDragFollow();
        return;
      }
      if (!store.layoutDragId && !store.layoutDragDropped) {
        clearLayoutDragUi();
        releasePreviewDragFollow();
        return;
      }
      const from = store.layoutDragId;
      const to = store.layoutDragOverId;
      if (from && to && from !== to && store.layoutOrderBeforeDrag) {
        const place = dragPlaceFor(from, to, store.layoutOrderBeforeDrag);
        store.layoutDragOverPlace = place;
        store.layoutOrder = store.layoutOrderBeforeDrag.slice();
        moveLayoutIdNear(from, to, place);
      }
      if (!commitDragIfChanged() && store.layoutDragDropped) {
        if (store.confirmed.finish) unconfirmFinishSoft();
        updateFinishSummary();
        scheduleSave();
        scheduleApplyLayoutAfterDrag();
      } else if (from && to && from !== to) {
        scheduleApplyLayoutAfterDrag();
      }
      store._layoutPointerId = null;
      clearLayoutDragUi();
      releasePreviewDragFollow();
    };

    const updateOverFromPoint = (clientY) => {
      const host = document.getElementById("layout-arrange-wire");
      if (!host || !store.layoutDragId) return;
      const cells = Array.prototype.slice.call(
        host.querySelectorAll(".layout-arrange-cell")
      );
      let best = null;
      let bestDist = Infinity;
      cells.forEach((el) => {
        const bid = el.getAttribute("data-layout-block");
        if (!bid || bid === store.layoutDragId) return;
        const head = el.querySelector(".layout-arrange-summary") || el;
        const r = head.getBoundingClientRect();
        const mid = r.top + r.height / 2;
        const dist = Math.abs(clientY - mid);
        if (dist < bestDist) {
          bestDist = dist;
          best = el;
        }
      });
      if (!best) return;
      const toId = best.getAttribute("data-layout-block");
      const place = dragPlaceFor(
        store.layoutDragId,
        toId,
        store.layoutOrderBeforeDrag || store.layoutOrder
      );
      document.querySelectorAll(".layout-arrange-cell").forEach((el) => {
        el.classList.toggle("is-touch", el === best);
        el.classList.remove("is-drop-target", "is-drop-deny");
      });
      store.layoutDragOverId = toId;
      store.layoutDragOverKey = toId;
      store.layoutDragOverPlace = place;
      store.layoutDragMoved = true;
    };

    cell.setAttribute("draggable", "false");
    let finishOnce = false;
    const onWinMove = (ev) => {
      if (store.layoutDragId !== id) return;
      if (store._layoutPointerId != null && ev.pointerId !== store._layoutPointerId) return;
      if (Math.abs(ev.clientY - (store._layoutPointerStartY || ev.clientY)) > 4) {
        store.layoutDragMoved = true;
      }
      if (!store.layoutDragMoved) return;
      const y = cell.closest("#easy-img-layout-host")
        ? clampDragClientY(cell, ev.clientY, store._layoutPointerStartY || ev.clientY)
        : ev.clientY;
      const dy = y - (store._layoutPointerStartY || y);
      cell.style.transform = "translateY(" + dy + "px)";
      if (cell.closest("#easy-img-layout-host")) {
        swapImageSectionByThird(cell, y);
        const framed = previewEl(layoutSectionPreviewSelector(id));
        if (framed) slideAndFollowPreview(framed, cell, ev.clientY >= (store._layoutDragOriginY || ev.clientY));
      } else {
        updateOverFromPoint(ev.clientY);
        followPreviewDuringDrag(previewEl(layoutSectionPreviewSelector(id)), cell);
      }
    };
    const finishPointer = (ev) => {
      if (finishOnce) return;
      if (store.layoutDragId !== id) return;
      if (store._layoutPointerId != null && ev.pointerId !== store._layoutPointerId) return;
      finishOnce = true;
      window.removeEventListener("pointermove", onWinMove, true);
      window.removeEventListener("pointerup", finishPointer, true);
      window.removeEventListener("pointercancel", finishPointer, true);
      if (
        !store.layoutDragMoved &&
        typeof ev.clientY === "number" &&
        store._layoutPointerStartY != null &&
        Math.abs(ev.clientY - store._layoutPointerStartY) > 4
      ) {
        store.layoutDragMoved = true;
      }
      if (store.layoutDragMoved) {
        updateOverFromPoint(ev.clientY);
        if (store.layoutDragOverId && store.layoutDragOverId !== id) {
          store.layoutDragDropped = true;
        }
      }
      try {
        if (cell.hasPointerCapture && cell.hasPointerCapture(ev.pointerId)) {
          cell.releasePointerCapture(ev.pointerId);
        }
      } catch (errRel) {
        /* ignore */
      }
      endDrag();
    };
    cell.addEventListener("pointerdown", (ev) => {
      if (ev.button != null && ev.button !== 0) return;
      const onHandle = ev.target.closest && ev.target.closest(".layout-arrange-handle");
      if (!onHandle || isVisControl(ev.target)) return;
      ev.preventDefault();
      ev.stopPropagation();
      finishOnce = false;
      closeItemGrowModal();
      removeLayoutDragGhost();
      cell.style.transform = "";
      store.layoutDragId = id;
      store.layoutDragMoved = false;
      store.layoutDragDropped = false;
      store.layoutDragOverId = null;
      store.layoutDragOverKey = null;
      store.layoutDragOverPlace = null;
      store.layoutOrderBeforeDrag = normalizeLayoutOrder(store.layoutOrder).slice();
      store.layoutSwapFrom = null;
      store._layoutPointerId = ev.pointerId;
      store._layoutPointerStartY = ev.clientY;
      store._layoutDragOriginY = ev.clientY;
      const rect = cell.getBoundingClientRect();
      store._layoutGhostOffsetX = ev.clientX - rect.left;
      store._layoutGhostOffsetY = ev.clientY - rect.top;
      cell.classList.add("is-dragging");
      if (cell.closest("#easy-img-layout-host")) {
        const framed = previewEl(layoutSectionPreviewSelector(id));
        if (framed) {
          centerPreviewBlock(framed);
          markPreviewStick(framed);
        }
      } else {
        followPreviewDuringDrag(previewEl(layoutSectionPreviewSelector(id)), cell);
      }
      const host = document.getElementById("layout-arrange-wire");
      if (host) host.classList.add("is-dragging-layout");
      document.body.classList.add("is-layout-dragging");
      try {
        cell.setPointerCapture(ev.pointerId);
      } catch (errCap) {
        /* ignore */
      }
      window.addEventListener("pointermove", onWinMove, true);
      window.addEventListener("pointerup", finishPointer, true);
      window.addEventListener("pointercancel", finishPointer, true);
    });
    cell.addEventListener("pointermove", onWinMove);
    cell.addEventListener("pointerup", finishPointer);
    cell.addEventListener("pointercancel", finishPointer);
  }

  function setupLayoutArrange() {
    renderLayoutArrangeWire();
    if (!window.__layoutDragSafetyBound) {
      window.__layoutDragSafetyBound = true;
      const scrubDragChrome = () => {
        removeLayoutDragGhost();
        const host = document.getElementById("layout-arrange-wire");
        if (host) host.classList.remove("is-dragging-layout");
        document.body.classList.remove("is-layout-dragging");
        document.querySelectorAll(".layout-arrange-cell").forEach((el) => {
          el.classList.remove("is-dragging", "is-drop-target", "is-drop-deny");
        });
        document.querySelectorAll("#preview-root [data-layout-block]").forEach((el) => {
          el.classList.remove("is-preview-dragging", "is-preview-drop-target");
          el.removeAttribute("draggable");
        });
        const main = root.querySelector("main");
        if (main) main.classList.remove("is-preview-layout-dragging");
      };
      document.addEventListener("dragend", () => {
        window.setTimeout(() => {
          if (store.layoutDragId || store.previewLayoutDragging) {
            forceClearLayoutDragUi();
            return;
          }
          scrubDragChrome();
        }, 0);
      });
      window.addEventListener("pointerup", () => {
        window.setTimeout(() => {
          /* ポインタ並べ替え中（capture中）は触らない */
          if (store._layoutPointerId != null || store._previewPointerId != null) return;
          if (!store.layoutDragId && !store.previewLayoutDragging) {
            scrubDragChrome();
            return;
          }
          window.setTimeout(() => {
            if (store._layoutPointerId != null || store._previewPointerId != null) return;
            if (store.layoutDragId || store.previewLayoutDragging) {
              forceClearLayoutDragUi();
            }
          }, 250);
        }, 40);
      });
      window.addEventListener("pointercancel", () => forceClearLayoutDragUi());
      window.addEventListener("blur", () => forceClearLayoutDragUi());
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) forceClearLayoutDragUi();
      });
      document.addEventListener("keydown", (ev) => {
        if (ev.key === "Escape") forceClearLayoutDragUi();
      });
      document.addEventListener(
        "pointerdown",
        (ev) => {
          const host = document.getElementById("layout-arrange-wire");
          const growOpen =
            document.body.classList.contains("is-item-grow-open") ||
            (() => {
              const m = document.getElementById("item-grow-modal");
              return !!(m && !m.hidden);
            })();
          const stuck =
            document.body.classList.contains("is-layout-dragging") ||
            !!(host && host.classList.contains("is-dragging-layout")) ||
            !!store.layoutDragId ||
            !!store.previewLayoutDragging ||
            !!document.querySelector("#preview-root .is-preview-dragging");
          const onLayoutDragSurface =
            ev.target.closest &&
            ev.target.closest(".layout-arrange-cell") &&
            !ev.target.closest(".layout-arrange-vis-label");
          const onGrowTab =
            ev.target.closest &&
            (ev.target.closest(".item-grow-tab") || ev.target.closest("[data-item-size]"));
          if (growOpen && !onGrowTab) {
            closeItemGrowModal();
          }
          if (!stuck) return;
          if (onLayoutDragSurface) return;
          forceClearLayoutDragUi();
          scrubDragChrome();
        },
        true
      );
    }
    openLayoutOmakaseNotice = function (opts) {
      const options = opts || {};
      let modal = document.getElementById("layout-omakase-notice");
      if (!modal) {
        modal = document.createElement("div");
        modal.id = "layout-omakase-notice";
        modal.className = "layout-notice";
        modal.hidden = true;
        modal.setAttribute("role", "dialog");
        modal.setAttribute("aria-modal", "true");
        modal.innerHTML =
          '<div class="layout-notice-card">' +
          '<p class="layout-notice-title" data-notice-title></p>' +
          '<p class="layout-notice-body" data-notice-body></p>' +
          '<label class="layout-notice-skip" data-notice-skip><input type="checkbox" data-notice-skip-input> 次回からこの確認を表示しない</label>' +
          '<div class="layout-notice-actions">' +
          '<button type="button" class="gct-btn" data-notice-cancel>キャンセル</button>' +
          '<button type="button" class="gct-btn gct-btn-primary" data-notice-ok>実行</button>' +
          '<button type="button" class="gct-btn gct-btn-primary" data-notice-close>閉じる</button>' +
          "</div></div>";
        document.body.appendChild(modal);
        modal.addEventListener("click", (ev) => {
          if (ev.target !== modal) return;
          modal.hidden = true;
          const opts = modal._noticeOpts || {};
          const box = modal.querySelector("[data-notice-skip-input]");
          if (typeof opts.onClose === "function") opts.onClose(!!(box && box.checked));
        });
      }
      modal._noticeOpts = options;
      const title = modal.querySelector("[data-notice-title]");
      const body = modal.querySelector("[data-notice-body]");
      const skip = modal.querySelector("[data-notice-skip]");
      const skipInput = modal.querySelector("[data-notice-skip-input]");
      const cancel = modal.querySelector("[data-notice-cancel]");
      const ok = modal.querySelector("[data-notice-ok]");
      const close = modal.querySelector("[data-notice-close]");
      title.textContent = options.title || "";
      body.textContent = options.body || "";
      skip.hidden = !options.allowSkip;
      if (skipInput) skipInput.checked = false;
      const confirming = !!options.confirmLabel;
      cancel.hidden = !confirming;
      ok.hidden = !confirming;
      close.hidden = confirming;
      if (confirming) ok.textContent = options.confirmLabel;
      ok.onclick = () => {
        modal.hidden = true;
        if (typeof options.onConfirm === "function") options.onConfirm(!!(skipInput && skipInput.checked));
      };
      cancel.onclick = () => {
        modal.hidden = true;
      };
      close.onclick = () => {
        modal.hidden = true;
        if (typeof options.onClose === "function") options.onClose(!!(skipInput && skipInput.checked));
      };
      modal.hidden = false;
    }

    const omakaseBtn = document.getElementById("layout-omakase-btn");
    if (omakaseBtn && omakaseBtn.dataset.bound !== "1") {
      omakaseBtn.dataset.bound = "1";
      omakaseBtn.addEventListener("click", () => {
        const slots = collectVisibleImageSlots();
        let locked = 0;
        slots.forEach((slot) => {
          if (store.imgOmakaseLocks && store.imgOmakaseLocks[slot.key]) locked += 1;
        });
        const openCount = slots.length - locked;
        if (!slots.length || openCount <= 0) {
          openLayoutOmakaseNotice({
            title: "すべての画像がロックされています",
            body: "このままでは、ランダムに選んでも画像は変わりません。変更したい画像のロックを解除してから、もう一度「ランダムに選ぶ」を押してください。",
            confirmLabel: "",
            allowSkip: false
          });
          return;
        }
        const run = () => {
          omakaseBtn.disabled = true;
          applyImgOmakaseFromCatalog({ onlyUnlocked: true, slots: slots }).then(
            function () {
              omakaseBtn.disabled = false;
              renderLayoutArrangeWire();
              scheduleSave();
            },
            function () {
              omakaseBtn.disabled = false;
            }
          );
        };
        if (store.imgOmakaseSkipConfirm) {
          run();
          return;
        }
        openLayoutOmakaseNotice({
          title: "ランダムに選びますか？",
          body:
            "ロックしていない画像は、すべて新しい画像に変わります。ロック中の画像は変更されません。\n変更される画像：" +
            openCount +
            "枚\n固定中の画像：" +
            locked +
            "枚",
          confirmLabel: "実行",
          allowSkip: true,
          onConfirm: function (skipNext) {
            if (skipNext) {
              store.imgOmakaseSkipConfirm = true;
              scheduleSave();
            }
            run();
          }
        });
      });
    }
    const omakaseAgain = document.getElementById("layout-omakase-confirm-again");
    if (omakaseAgain && omakaseAgain.dataset.bound !== "1") {
      omakaseAgain.dataset.bound = "1";
      omakaseAgain.addEventListener("click", () => {
        store.imgOmakaseSkipConfirm = false;
        omakaseAgain.hidden = true;
        scheduleSave();
      });
    }
    if (omakaseAgain) omakaseAgain.hidden = !store.imgOmakaseSkipConfirm;
    document.querySelectorAll("[data-layout-arrange-reset]").forEach((reset) => {
      if (reset.dataset.bound) return;
      reset.dataset.bound = "1";
      reset.addEventListener("click", () => {
        pushLayoutUndo();
        store.layoutOrder = LAYOUT_DEFAULT_ORDER.slice();
        store.layoutSwapFrom = null;
        applyLayoutOrderToPreview();
        renderLayoutArrangeWire();
        showLayoutArrangeHint("並びを最初に戻しました。", 1800);
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
        placePreviewWidthControl();
        if (typeof window.closeAtelierMenu === "function") window.closeAtelierMenu();
        openStep("finish");
        scheduleSave();
      });
    });
    const layoutBlock = form.querySelector('.dash-block[data-step-id="layout"]');
    if (layoutBlock && layoutBlock.dataset.widthPlaceBound !== "1") {
      layoutBlock.dataset.widthPlaceBound = "1";
      layoutBlock.addEventListener("toggle", () => placePreviewWidthControl());
    }
    setupPreviewLayoutMirrorDrag();
  }

  function setupPreviewLayoutMirrorDrag() {
    /* 左プレビューは見るだけ。並び替えは右ワイヤーの行ドラッグ */
    return;
  }

  function cloneLayoutCardsInto(target) {
    const source = document.getElementById("layout-picker-row");
    if (!target || !source) return;
    if (!source || !target) return;
    target.innerHTML = source.innerHTML;
    target.dataset.filled = "1";
  }

  function setupLayoutPicker() {
    const undoBtn = document.getElementById("layout-undo-btn");
    if (undoBtn && undoBtn.dataset.bound !== "1") {
      undoBtn.dataset.bound = "1";
      undoBtn.addEventListener("click", () => undoLayoutOnce());
    }
    syncLayoutUndoButton();
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

  function isSampleZipScreen() {
    return !!(store.sampleFinishNoBack && store.entryBranch === "sample");
  }

  var SAMPLE_ORDER_CHECKS = ["sample_order_pages", "sample_order_form", "sample_order_keep", "sample_order_revision"];
  var SAMPLE_ORDER_MAIL = "atsushi.masubuchi.work@gmail.com";

  function sampleOrderChecksDone() {
    return SAMPLE_ORDER_CHECKS.every(function (name) {
      const el = form.elements.namedItem(name);
      return el && el.checked;
    });
  }

  function samplePriceState() {
    function picked(name, fallback) {
      const el = form.querySelector('input[name="' + name + '"]:checked');
      return el ? el.value : fallback;
    }
    return {
      domain: picked("sample_price_domain", "github"),
      custom: picked("sample_price_custom", "none"),
      wp: picked("sample_price_wp", "no") === "yes",
      support: picked("sample_price_support", "none")
    };
  }

  function samplePriceCalculate(state) {
    let total = state.support === "visit" ? 55000 : 11000;
    const notes = [];
    if (state.domain === "own") total += 5500;
    if (state.domain === "managed") {
      total += 11000;
      notes.push("ドメイン取得・管理の初年度11,000円を含みます。ドメイン実費は別途必要です。");
    }
    if (state.custom === "partial") {
      total += 22000;
      notes.push("一部カスタマイズは22,000円〜です。内容により金額が変わります。");
    }
    if (state.custom === "full") notes.push("全体の独自構成は個別見積もりです。その費用は上の金額に含まれていません。");
    if (state.wp) {
      total += 55000;
      notes.push("WordPress対応は55,000円〜です。別途サーバー実費が必要です。追加機能・プラグインは別途見積もりです。");
    }
    if (state.support === "online") {
      total += 11000;
      notes.push("オンラインサポートは1回・最大3時間。超過は30分ごとに1,100円追加です。");
    }
    if (state.support === "visit") notes.push("訪問サポートは55,000円〜です。基本プランを含みます。訪問先による追加料金は別途です。");
    const from = state.custom === "partial" || state.wp || state.support === "visit";
    return { total: total, notes: notes, from: from };
  }

  function samplePriceMailLabel(state) {
    const domain = { github: "GitHub Pages", own: "自分の独自ドメイン", managed: "独自ドメインの取得・管理も依頼" };
    const custom = { none: "なし", partial: "一部", full: "全体" };
    const support = { none: "自分で進める", online: "オンラインサポート", visit: "訪問サポート" };
    return {
      domain: domain[state.domain] || "GitHub Pages",
      custom: custom[state.custom] || "なし",
      wp: state.wp ? "あり" : "なし",
      support: support[state.support] || "自分で進める"
    };
  }

  function sampleOrderMailBody() {
    const state = samplePriceState();
    const price = samplePriceCalculate(state);
    const label = samplePriceMailLabel(state);
    const notesEl = document.getElementById("sample-order-notes");
    const wish = notesEl && notesEl.value.trim() ? notesEl.value.trim() : "なし";
    const lines = [
      "ホームページの制作・公開を希望します。",
      "【希望内容】",
      "URL：" + label.domain,
      "独自レイアウト：" + label.custom,
      "WordPress：" + label.wp,
      "サポート：" + label.support,
      "【シミュレーター表示額】",
      "最低見積もり金額：" + price.total.toLocaleString("ja-JP") + "円" + (price.from ? "から" : "")
    ];
    price.notes.forEach(function (note) {
      lines.push(note);
    });
    lines.push("【その他の希望】", wish, "依頼ファイル（ZIP）を添付します。");
    return lines.join("\n");
  }

  function openSampleOrderMail() {
    const href =
      "mailto:" +
      SAMPLE_ORDER_MAIL +
      "?subject=" +
      encodeURIComponent("ホームページの制作・公開の依頼") +
      "&body=" +
      encodeURIComponent(sampleOrderMailBody());
    window.location.href = href;
  }

  function paintSampleRouteStatus(text) {
    if (!isSampleZipScreen() || !store.sampleZipRoute) return;
    const id = store.sampleZipRoute === "order" ? "sample-order-zip-hint" : "sample-save-zip-status";
    const el = document.getElementById(id);
    if (el && text) el.textContent = text;
  }

  function renderSampleZipBranch() {
    const root = document.getElementById("sample-zip-branch");
    if (!root) return;
    const sample = isSampleZipScreen();
    root.hidden = !sample;
    if (!sample) return;
    const route = store.sampleZipRoute || "";
    const gate = document.getElementById("sample-zip-gate");
    const chosen = document.getElementById("sample-zip-chosen");
    const save = document.getElementById("sample-zip-save");
    const order = document.getElementById("sample-zip-order");
    if (gate) gate.hidden = !!route;
    if (chosen) chosen.hidden = !route;
    if (save) save.hidden = route !== "save";
    if (order) order.hidden = route !== "order";
    const checksOk = sampleOrderChecksDone();
    const orderBtn = document.getElementById("sample-order-zip");
    const zipWrap = document.getElementById("sample-order-zip-wrap");
    const hint = document.getElementById("sample-order-zip-hint");
    if (orderBtn) orderBtn.disabled = !checksOk;
    if (zipWrap) zipWrap.classList.toggle("is-locked", route === "order" && !checksOk);
    if (hint && route === "order" && !store.sampleOrderMailReady) {
      hint.textContent = checksOk ? "" : "全ての最終確認にチェックを入れてください。";
    }
    const mail = document.getElementById("sample-order-mail");
    if (mail) mail.hidden = !(route === "order" && store.sampleOrderMailReady);
    const total = document.getElementById("sample-price-total");
    const noteList = document.getElementById("sample-price-notes");
    if (total && noteList) {
      const price = samplePriceCalculate(samplePriceState());
      total.textContent = "最低見積もり金額　" + price.total.toLocaleString("ja-JP") + "円" + (price.from ? "から" : "") + "（税込）";
      noteList.innerHTML = price.notes
        .map(function (note) {
          return "<li>" + note.replace(/</g, "&lt;") + "</li>";
        })
        .join("");
    }
  }

  function setupSampleZipBranch() {
    const pickSave = document.getElementById("sample-zip-pick-save");
    const pickOrder = document.getElementById("sample-zip-pick-order");
    const rechoose = document.getElementById("sample-zip-rechoose");
    const saveBtn = document.getElementById("sample-save-zip");
    const orderBtn = document.getElementById("sample-order-zip");
    const mailOpen = document.getElementById("sample-order-mail-open");
    const mailCopy = document.getElementById("sample-order-mail-copy");
    const notes = document.getElementById("sample-order-notes");
    if (pickSave) {
      pickSave.addEventListener("click", function () {
        store.sampleZipRoute = "save";
        store.sampleOrderMailReady = false;
        renderSampleZipBranch();
      });
    }
    if (pickOrder) {
      pickOrder.addEventListener("click", function () {
        store.sampleZipRoute = "order";
        renderSampleZipBranch();
      });
    }
    if (rechoose) {
      rechoose.addEventListener("click", function () {
        store.sampleZipRoute = "";
        store.sampleOrderMailReady = false;
        const saveStatus = document.getElementById("sample-save-zip-status");
        const hint = document.getElementById("sample-order-zip-hint");
        const mailStatus = document.getElementById("sample-order-mail-status");
        if (saveStatus) saveStatus.textContent = "";
        if (hint) hint.textContent = "";
        if (mailStatus) mailStatus.textContent = "";
        renderSampleZipBranch();
      });
    }
    if (saveBtn) {
      saveBtn.addEventListener("click", function () {
        runZipDownload().catch(function () {
          paintSampleRouteStatus("保存に失敗しました。");
        });
      });
    }
    if (orderBtn) {
      orderBtn.addEventListener("click", function () {
        if (!sampleOrderChecksDone()) {
          renderSampleZipBranch();
          return;
        }
        const extra = form.elements.namedItem("extra_notes");
        if (extra && notes) extra.value = notes.value;
        runZipDownload().catch(function () {
          paintSampleRouteStatus("保存に失敗しました。");
        });
      });
    }
    SAMPLE_ORDER_CHECKS.forEach(function (name) {
      const el = form.elements.namedItem(name);
      if (!el) return;
      el.addEventListener("change", renderSampleZipBranch);
    });
    ["sample_price_domain", "sample_price_custom", "sample_price_wp", "sample_price_support"].forEach(function (name) {
      form.querySelectorAll('input[name="' + name + '"]').forEach(function (el) {
        el.addEventListener("change", renderSampleZipBranch);
      });
    });
    if (mailOpen) {
      mailOpen.addEventListener("click", function () {
        openSampleOrderMail();
      });
    }
    if (mailCopy) {
      mailCopy.addEventListener("click", function () {
        const body = sampleOrderMailBody();
        const status = document.getElementById("sample-order-mail-status");
        const done = function () {
          if (status) status.textContent = "コピーしました。";
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(body).then(done).catch(function () {
            if (status) status.textContent = body;
          });
          return;
        }
        if (status) status.textContent = body;
      });
    }
    const mailAddress = document.getElementById("sample-order-mail-address");
    if (mailAddress) {
      mailAddress.addEventListener("click", function () {
        const status = document.getElementById("sample-order-mail-status");
        const done = function () {
          if (status) status.textContent = "コピーしました。";
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(SAMPLE_ORDER_MAIL).then(done).catch(function () {
            if (status) status.textContent = SAMPLE_ORDER_MAIL;
          });
          return;
        }
        if (status) status.textContent = SAMPLE_ORDER_MAIL;
      });
    }
  }

  function easyPaletteLabel() {
    const names = {
      clinic: "紺",
      green: "緑",
      cafe: "ベージュ",
      ink: "墨",
      brick: "オレンジ",
      sakura: "ピンク"
    };
    const checked = document.querySelector('input[name="entry_sample_color"]:checked');
    if (checked && checked.value === "keep") return "このままでよい";
    if (checked && names[checked.value]) return names[checked.value];
    return names[store.chosenPresetKey] || "（色を選択中）";
  }

  function ensureSampleBrandForFinish() {
    if (store.sushiSampleBrand || !store.sushiSampleId) return;
    if (!window.SushiBelt || !window.SushiBelt.loadManifest) return;
    if (store.sushiSampleBrandLookup) return;
    store.sushiSampleBrandLookup = true;
    window.SushiBelt.loadManifest()
      .then(function (man) {
        const sample = (man.samples || []).find(function (s) {
          return String(s.id) === String(store.sushiSampleId);
        });
        store.sushiSampleBrand = sample && sample.brand ? sample.brand : "";
        updateFinishSummary();
      })
      .catch(function () {
        store.sushiSampleBrandLookup = false;
      });
  }

  function placeSampleZipBlocks() {
    const block = document.querySelector('details[data-step-id="finish"]');
    if (!block) return;
    const checks = block.querySelector(".scope-checks");
    const summary = block.querySelector("#finish-summary");
    const optional = block.querySelector(".finish-optional");
    const note = block.querySelector("#finish-zip-note");
    const submit = block.querySelector(".finish-submit-row");
    const actions = block.querySelector(".fill-actions-zip");
    if (!checks || !summary || !optional || !note || !submit || !actions) return;
    if (isSampleZipScreen()) {
      actions.parentNode.insertBefore(optional, actions);
      actions.parentNode.insertBefore(checks, actions);
      actions.parentNode.insertBefore(note, actions);
      actions.parentNode.insertBefore(submit, actions);
      return;
    }
    summary.parentNode.insertBefore(checks, summary);
    summary.parentNode.insertBefore(note, summary.nextSibling);
    note.parentNode.insertBefore(submit, note.nextSibling);
    submit.parentNode.insertBefore(optional, submit.nextSibling);
  }

  function syncSampleZipWording() {
    const sample = isSampleZipScreen();
    placeSampleZipBlocks();
    const delivery = document.querySelector('details[data-step-id="finish"] > .dash-note');
    if (delivery) {
      if (!delivery.dataset.defaultText) delivery.dataset.defaultText = delivery.textContent;
      delivery.textContent = sample
        ? "納品目安は、内容確認後3日以内です（日付の指定はできません）。"
        : delivery.dataset.defaultText;
    }
    const zipName = "依頼ファイル（ZIP）を保存する";
    const leadBtn = document.querySelector("[data-scope-lead-btn]");
    if (leadBtn) leadBtn.textContent = sample ? zipName : "確定ボタン";
    const layoutText = document.querySelector("[data-scope-layout-text]");
    if (layoutText) {
      if (!layoutText.dataset.defaultHtml) layoutText.dataset.defaultHtml = layoutText.innerHTML;
      if (sample) {
        layoutText.textContent =
          "見本で選んだページに、記載項目で選んだ枠を載せます。色と、書いた文字・選んだ画像を載せます。";
      } else {
        layoutText.innerHTML = layoutText.dataset.defaultHtml;
      }
    }
    const copyText = document.querySelector("[data-scope-copy-text]");
    if (copyText) {
      if (!copyText.dataset.defaultHtml) copyText.dataset.defaultHtml = copyText.innerHTML;
      if (sample) {
        copyText.textContent = "文章は、画面で書いたものを載せます。文章例は参考で、直して使えます。";
      } else {
        copyText.innerHTML = copyText.dataset.defaultHtml;
      }
    }
    const title = document.querySelector(".finish-summary-title");
    if (title) {
      if (!title.dataset.defaultText) title.dataset.defaultText = title.textContent;
      title.textContent = sample ? "いまの内容（右の見本と同じ）" : title.dataset.defaultText;
    }
    const zipLead = document.querySelector(".finish-zip-note-lead");
    if (zipLead) {
      if (!zipLead.dataset.defaultHtml) zipLead.dataset.defaultHtml = zipLead.innerHTML;
      if (sample) {
        zipLead.innerHTML =
          "<strong>" +
          zipName +
          "</strong>でパソコンに保存されます。<strong>保存＝送信ではありません。</strong>案内先に自分で添付して送ってください。";
      } else {
        zipLead.innerHTML = zipLead.dataset.defaultHtml;
      }
    }
    const notes = document.querySelector('textarea[name="extra_notes"]');
    if (notes) {
      if (!notes.dataset.defaultPlaceholder) notes.dataset.defaultPlaceholder = notes.getAttribute("placeholder") || "";
      notes.setAttribute("placeholder", sample ? "" : notes.dataset.defaultPlaceholder);
    }
    renderSampleZipBranch();
  }

  function buildFinishSummaryLines() {
    if (isSampleZipScreen()) {
      ensureSampleBrandForFinish();
      const titleName = (fieldValue("brand_name") || "").trim();
      return [
        "見本: " + (store.sushiSampleBrand || "選んだ見本"),
        "利用用途: " + purposeLabel(store.sitePurpose),
        "配色: " + easyPaletteLabel(),
        titleName ? "ホームページタイトル: " + titleName : null
      ].filter(Boolean);
    }
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
      "レイアウト: " + layoutLabel(store.layoutPattern) + "／並び " + activeLayoutOrder(store.layoutOrder).join("-"),
      "用途: " + purposeLabel(store.sitePurpose),
      "雰囲気色: " + presetName,
      brand ? "サイト名（仮）: " + brand : null
    ].filter(Boolean);
  }

  function updateFinishSummary() {
    const list = document.getElementById("finish-summary-list");
    if (list) {
      list.innerHTML = buildFinishSummaryLines()
        .map((line) => "<li>" + line.replace(/</g, "&lt;") + "</li>")
        .join("");
    }
    const missTitle = document.getElementById("finish-missing-title");
    const missList = document.getElementById("finish-missing-list");
    const finishLead = document.querySelector(".finish-summary-lead");
    syncSampleZipWording();
    if (store.sampleFinishNoBack) {
      if (missTitle) missTitle.hidden = true;
      if (missList) missList.innerHTML = "";
      if (finishLead) finishLead.hidden = true;
    } else if (finishLead) {
      finishLead.hidden = false;
    }
    if (!missList) return;
    if (store.sampleFinishNoBack) return;
    const missingBar = countUnconfirmedBarSteps();
    const missingImgs = zipImageGaps();
    const items = [];
    missingBar.forEach((id) => {
      const meta = BADGE_META[id] || STEPS.find((s) => s.id === id);
      const label = meta ? meta.label || id : id;
      items.push({ id, label });
    });
    missingImgs.forEach((item) => {
      let stepId = "hero-image";
      const name = item.name || "";
      if (name.indexOf("about_image_") === 0) stepId = "about-images";
      else if (name.indexOf("work_") === 0) stepId = "works-images";
      else if (name === "logo_image") stepId = "logo-text";
      else if (name === "hero_image") stepId = "hero-image";
      items.push({ id: stepId, label: missingImageStepTip(item) + "がありません" });
    });
    if (!items.length) {
      if (missTitle) missTitle.hidden = true;
      missList.innerHTML = "";
      return;
    }
    if (missTitle) missTitle.hidden = false;
    missList.innerHTML = items
      .map(
        (it) =>
          '<li><button type="button" class="finish-missing-link" data-open-step="' +
          it.id +
          '">' +
          String(it.label).replace(/</g, "&lt;") +
          "</button></li>"
      )
      .join("");
    missList.querySelectorAll("[data-open-step]").forEach((btn) => {
      btn.addEventListener("click", () => openStep(btn.getAttribute("data-open-step")));
    });
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
        : isSampleZipScreen()
          ? "依頼ファイル（ZIP）を保存する"
          : store.finishLockedOnce
            ? "この修正でOK・ZIPを保存する"
            : "この内容でOK・ZIPを保存する";
      btn.disabled = done || !scopesOk;
      btn.classList.toggle("is-done", done);
      btn.hidden = done;
    }
    if (changeBtn) {
      changeBtn.hidden = isSampleZipScreen() || !done;
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
    if (isSampleZipScreen()) {
      if (missingEl) missingEl.textContent = "";
      const status = document.getElementById("zip-status");
      if (status && status.textContent.indexOf("写真が足りません") === 0) status.textContent = "";
      if (zipBtn) {
        zipBtn.hidden = true;
        zipBtn.disabled = true;
        zipBtn.classList.add("is-disabled");
      }
      updateFinishFootUi();
      return;
    }
    const missing = STEPS.filter((s) => !store.confirmed[s.id]);
    const missingBar = countUnconfirmedBarSteps();
    const missingImgs = zipImageGaps();
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
          "写真が足りません（" + label + "）。並び替え・確認画面から該当の画像項目を開いてください。";
      } else if (missingBar.length) {
        missingEl.textContent =
          "まだ " +
          formatMissingStepList(missingBar, 2) +
          " が未完了です（あと " +
          missingBar.length +
          " 件）。並び替え・確認画面から内容を確認してください。";
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
    if (store.siteColorMode === "detail" && stepId !== "finish" && stepId !== "layout") {
      returnToLayoutHub();
    }
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
      ["hours", "access", "address", "announce"].forEach((key) => {
        document.querySelectorAll('[data-extra-toggle="' + key + '"]').forEach((input) => {
          input.checked = false;
        });
        store.draftExtras[key] = false;
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

    const run = (behavior) => {
      let didTempShow = false;
      let restoredPaneStyle = null;
      if (pane && getComputedStyle(pane).display === "none") {
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
          scroll.scrollTo({ top: 0, behavior: behavior || "auto" });
          store.pendingPreviewScroll = null;
          return;
        }
        let target = root.querySelector(selector);
        if (!target) target = document.getElementById(selector.replace(/^#/, ""));
        if (!target) return;
        if (target.hidden) {
          const fallback =
            root.querySelector("[data-extra]:not([hidden])") ||
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
          behavior: behavior || (didTempShow ? "auto" : "smooth")
        });
        store.pendingPreviewScroll = null;
      } finally {
        if (didTempShow && pane) {
          if (restoredPaneStyle == null) pane.removeAttribute("style");
          else pane.setAttribute("style", restoredPaneStyle);
        }
      }
    };

    run("smooth");
    window.requestAnimationFrame(() => {
      window.setTimeout(() => run("auto"), 80);
    });
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
    stepId = resolveStepId(stepId);
    if (
      store.intakeDone &&
      (stepId === "purpose" || stepId === "guide") &&
      (store.siteColorMode === "detail" || store.hubEntrySource)
    ) {
      /* 用途は入口のみ。ハブ内では変えない（変えるなら最初に戻す） */
      return;
    }
    if (!canOpenStep(stepId)) {
      showUnlockHint(stepId);
      return;
    }
    if (store.confirmed.finish && stepId !== "finish") {
      unconfirmFinishSoft();
      store.finishLockedOnce = true;
    }
    if (
      store.siteColorMode === "detail" &&
      GUIDED_COLOR_TUNE_IDS.includes(stepId)
    ) {
      store.uiMode = "self";
      gctOpenPaletteColor(stepId);
      return;
    }
    if (store.siteColorMode === "detail" || store.uiMode === "self") {
      store.uiMode = "self";
      openSelfStep(stepId);
      return;
    }
    const flow = getFlowSteps();
    const idx = flow.findIndex((s) => s.id === stepId);
    if (idx < 0) {
      showUnlockHint(stepId);
      return;
    }
    showWizardStep(idx);
  }

  function setupExclusiveAccordions() {
    form.addEventListener("toggle", (e) => {
      const t = e.target;
      if (!(t instanceof HTMLDetailsElement)) return;
      if (!t.classList.contains("dash-block")) return;

      const stepId = t.getAttribute("data-step-id");

      if (store.uiMode === "self") {
        if (store.siteColorMode === "detail") {
          if (!t.open) {
            /* 表紙は表紙表示中だけ閉じさせない。他ステップへ飛ぶときは閉じる */
            if (stepId === "layout" && store.selfEditingStepId === "layout") {
              t.open = true;
              return;
            }
            if (stepId !== "layout" && store.selfEditingStepId === stepId) {
              returnToLayoutHub();
            }
            return;
          }
          if (stepId && !canOpenStep(stepId)) {
            t.open = false;
            showUnlockHint(stepId);
            return;
          }
          if (stepId && store.selfEditingStepId !== stepId) {
            openSelfStep(stepId);
          }
          return;
        }
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
        const inPreview = !!el.closest("#preview-root");
        /* 見本の開閉は設定側のオンオフ。見本を押して開閉しない */
        if (inPreview && e.target.closest && e.target.closest("details.accordion")) {
          if (store.easyFlowActive) {
            e.preventDefault();
            e.stopPropagation();
          }
          return;
        }
        /* 編集ハブ：左プレビューだけ確認専用。右の「色へ」等は開く */
        if (inPreview && store.siteColorMode === "detail") return;
        if (store.layoutDragMoved || store.previewLayoutDragging) {
          store.layoutDragMoved = false;
          return;
        }
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
    const ruler = document.getElementById("preview-width-ruler");
    const deviceEl = document.getElementById("preview-width-device");
    const pxEl = document.getElementById("preview-width-px");
    if (!viewport || !ruler) return;

    const WIDTH_STEPS = [
      { id: "phone", label: "スマホ", width: 390 },
      { id: "tablet", label: "タブレット", width: 768 },
      { id: "desktop", label: "PC", width: 1280 }
    ];
    let stepIndex = 2;
    /* 100%は選んだ幅の実寸。開いた直後の見本は25%で固定する */
    const LOOK_MIN = 0.25;
    const LOOK_MAX = 2;
    let lookScale = LOOK_MIN;
    let lookTouched = true;

    function clampLook(n) {
      return Math.min(LOOK_MAX, Math.max(LOOK_MIN, n));
    }

    function shownLookPercent() {
      return Math.round(lookScale * 100);
    }

    function previewPaneVisible() {
      if (document.body.classList.contains("entry-gate-open")) return false;
      if (document.body.classList.contains("sample-flow-hide-preview")) return false;
      if (document.documentElement.classList.contains("is-capture-mode")) return false;
      if (document.documentElement.classList.contains("is-embed-preview")) return false;
      const previewPane = document.querySelector(".preview-pane");
      if (!previewPane) return false;
      const cs = window.getComputedStyle(previewPane);
      return cs.display !== "none" && cs.visibility !== "hidden";
    }

    function currentLook() {
      if (!previewPaneVisible()) return 1;
      return lookScale;
    }

    function syncPreviewLookControl() {
      const box = document.getElementById("preview-look");
      const widthControl = document.getElementById("chrome-preview-width");
      const minus = document.getElementById("preview-scale-minus");
      const plus = document.getElementById("preview-scale-plus");
      const pctEl = document.getElementById("preview-scale-pct");
      if (!box) return;
      const widthShown = !!(widthControl && !widthControl.hidden);
      const show = widthShown && previewPaneVisible();
      box.hidden = !show;
      if (show) box.removeAttribute("hidden");
      else box.setAttribute("hidden", "");
      const pct = shownLookPercent();
      if (pctEl) pctEl.textContent = pct + "%";
      if (minus) minus.disabled = pct <= 25;
      if (plus) plus.disabled = pct >= 200;
      if (typeof syncPlaceMarkFrame === "function") syncPlaceMarkFrame();
    }

    function applyLookZoom(viewportEl, forcedZoom) {
      if (!viewportEl) return;
      const scrollEl = document.querySelector(".preview-scroll");
      const look = forcedZoom != null ? Number(forcedZoom) : currentLook();
      if (look < 0.999 || look > 1.001) {
        viewportEl.style.zoom = String(look);
      } else {
        viewportEl.style.removeProperty("zoom");
      }
      viewportEl.style.removeProperty("transform");
      viewportEl.style.removeProperty("transform-origin");
      viewportEl.style.removeProperty("margin-bottom");
      viewportEl.style.removeProperty("margin-left");
      viewportEl.style.removeProperty("margin-right");
      viewportEl.classList.toggle("is-fit-narrow", window.innerWidth <= 860 && look < 0.98);
      clipPreviewToFooter();
      if (scrollEl) {
        const fit = store.previewFrameScale || 1;
        scrollEl.classList.toggle("is-look-enlarged", look > fit + 0.001);
      }
    }

    function bumpLook(dir) {
      lookTouched = true;
      const cur = shownLookPercent();
      let next = cur + dir * 10;
      if (dir > 0 && cur < 100 && next > 100) next = 100;
      if (dir < 0 && cur > 100 && next < 100) next = 100;
      lookScale = clampLook(next / 100);
      apply();
    }

    function applyPreviewFrameScale(opts) {
      const scrollEl = document.querySelector(".preview-scroll");
      if (!scrollEl || !viewport) return 1;
      /* レビュー／撮影iframe: styleを触ると親の高さ変更→resize→再適用でプルプルする。CSSに任せて何もしない */
      if (document.documentElement.classList.contains("is-capture-mode")) {
        store.previewFrameScale = 1;
        return 1;
      }
      /* 虫眼鏡embed: 縮小zoomしない（窮屈＋marker幽霊の元）。幅は apply() 側で実寸合わせ */
      if (document.documentElement.classList.contains("is-embed-preview")) {
        store.previewFrameScale = 1;
        viewport.style.removeProperty("zoom");
        viewport.style.removeProperty("transform");
        viewport.style.removeProperty("transform-origin");
        viewport.style.removeProperty("margin-bottom");
        viewport.style.removeProperty("--hub-place-fit-scale");
        scrollEl.scrollLeft = 0;
        return 1;
      }
      /* 同一文書レビュー: 自動zoomはスクロールバー↔幅の往復でプルプルする。実寸固定（俯瞰zoomは review-mode が一度だけ付ける） */
      if (document.documentElement.classList.contains("is-review-mode")) {
        if (!document.body.classList.contains("review-view-fit")) {
          store.previewFrameScale = 1;
          viewport.style.removeProperty("--hub-place-fit-scale");
          applyLookZoom(viewport, 1);
        }
        return store.previewFrameScale || 1;
      }
      const placeFit = !!(opts && opts.placeFit);
      const pad = placeFit ? 20 : (window.innerWidth <= 860 ? 28 : 16);
      const availW = Math.max(120, scrollEl.clientWidth - pad);
      const designW = Math.max(280, Number(store.previewDesignWidth) || 1280);
      let scale = Math.min(1, availW / designW);
      if (placeFit && root) {
        const availH = Math.max(120, scrollEl.clientHeight - pad);
        const fullH = Math.max(1, root.scrollHeight);
        scale = Math.min(scale, availH / fullH, 1);
      }
      store.previewFrameScale = scale;
      /* 100%は幅の実寸。開いた直後だけ、枠に収まる倍率を％にする */
      if (!lookTouched) lookScale = clampLook(scale);
      viewport.style.removeProperty("--hub-place-fit-scale");
      applyLookZoom(viewport);
      syncPreviewLookControl();
      scrollEl.scrollLeft = 0;
      if (placeFit) scrollEl.scrollTop = 0;
      return scale;
    }

    function apply() {
      /* レビューiframe: resizeのたびにstyleを書くとプルプルする。クラスだけ揃え、幅はCSS !important */
      if (document.documentElement.classList.contains("is-capture-mode")) {
        store.previewDesignWidth = 1200;
        store.previewFrameScale = 1;
        if (viewport) {
          if (!viewport.classList.contains("is-desktop")) {
            viewport.classList.remove("is-phone", "is-mobile", "is-tablet");
            viewport.classList.add("is-desktop");
            viewport.classList.remove("is-scroll-x");
          }
        }
        return;
      }
      /* 虫眼鏡: 親フレーム幅に合わせて実寸表示（1280固定＋縮小zoomはしない） */
      if (document.documentElement.classList.contains("is-embed-preview")) {
        const scrollEl = document.querySelector(".preview-scroll");
        const availW = scrollEl ? Math.max(320, scrollEl.clientWidth - 2) : 1280;
        const requested = Math.min(1280, availW);
        store.previewDesignWidth = requested;
        store.previewFrameScale = 1;
        if (viewport.style.width !== requested + "px") {
          viewport.style.width = requested + "px";
        }
        viewport.style.maxWidth = "none";
        viewport.classList.toggle("is-phone", requested <= 500);
        viewport.classList.toggle("is-mobile", requested <= 500);
        viewport.classList.toggle("is-tablet", requested > 500 && requested <= 900);
        viewport.classList.toggle("is-desktop", requested > 900);
        viewport.classList.remove("is-scroll-x");
        viewport.style.removeProperty("zoom");
        viewport.style.removeProperty("transform");
        viewport.style.removeProperty("transform-origin");
        viewport.style.removeProperty("margin-bottom");
        if (deviceEl) deviceEl.textContent = requested >= 1200 ? "PC" : requested > 900 ? "ノート" : requested > 500 ? "タブレット" : "スマホ";
        if (pxEl) pxEl.textContent = requested + "px";
        if (scrollEl) scrollEl.scrollLeft = 0;
        return;
      }
      syncPreviewLookControl();
      const step = WIDTH_STEPS[stepIndex] || WIDTH_STEPS[WIDTH_STEPS.length - 1];
      const scrollEl = document.querySelector(".preview-scroll");
      const requested = step.width;
      store.previewDesignWidth = requested;
      /* 同じ幅の再代入は transition を再発火させてプルプルに見えるので避ける */
      if (viewport.style.width !== requested + "px") {
        viewport.style.width = requested + "px";
      }
      followPlaceMarkMotion();
      viewport.style.maxWidth = "none";
      viewport.classList.toggle("is-phone", requested <= 500);
      viewport.classList.toggle("is-mobile", requested <= 500);
      viewport.classList.toggle("is-tablet", requested > 500 && requested <= 900);
      viewport.classList.toggle("is-desktop", requested > 900);
      /* 枠内に収めるので横スクロール前提は使わない */
      viewport.classList.remove("is-scroll-x");
      if (deviceEl) deviceEl.textContent = step.label;
      if (pxEl) pxEl.textContent = requested + "px";
      ruler.querySelectorAll("[data-width-step]").forEach((btn, i) => {
        const on = i === stepIndex;
        btn.classList.toggle("is-on", on);
        btn.setAttribute("aria-checked", on ? "true" : "false");
      });
      /* レビュー確認モードは実寸固定。rAF zoom も不要 */
      if (document.documentElement.classList.contains("is-review-mode") &&
          !document.body.classList.contains("review-view-fit")) {
        store.previewFrameScale = 1;
        applyLookZoom(viewport, 1);
        if (scrollEl) scrollEl.scrollLeft = 0;
        return;
      }
      window.requestAnimationFrame(() => {
        const placeFit =
          !!store.hubPlacePickMode || store.hubUiMode === "layout";
        applyPreviewFrameScale({ placeFit });
        syncLayoutMirrors();
        if (scrollEl && !placeFit) {
          scrollEl.scrollLeft = 0;
        }
      });
    }

    ruler.innerHTML = WIDTH_STEPS.map(
      (s, i) =>
        '<button type="button" class="preview-width-dot" role="radio" data-width-step="' +
        i +
        '" aria-label="' +
        s.label +
        "（" +
        s.width +
        'px）">' +
        s.label +
        "</button>"
    ).join("");

    ruler.querySelectorAll("[data-width-step]").forEach((btn) => {
      btn.addEventListener("click", () => {
        stepIndex = Number(btn.getAttribute("data-width-step")) || 0;
        apply();
      });
    });

    const scaleMinus = document.getElementById("preview-scale-minus");
    const scalePlus = document.getElementById("preview-scale-plus");
    if (scaleMinus) {
      scaleMinus.addEventListener("click", () => {
        bumpLook(-1);
      });
    }
    if (scalePlus) {
      scalePlus.addEventListener("click", () => {
        bumpLook(1);
      });
    }
    window.syncPreviewLookControl = syncPreviewLookControl;

    window.addEventListener("resize", function () {
      /* capture中は親のiframe高さ変更でresizeが連打される。完全無視 */
      if (document.documentElement.classList.contains("is-capture-mode")) return;
      /* 同一文書レビューも無視（スクロールバー出し入れ→resize→zoom の往復を断つ） */
      if (document.documentElement.classList.contains("is-review-mode")) return;
      apply();
    });
    window.applyPreviewWidthFromPane = apply;
    window.applyPreviewFrameScale = applyPreviewFrameScale;
    window.setPreviewWidthStepById = function (id) {
      const idx = WIDTH_STEPS.findIndex((s) => s.id === id);
      if (idx < 0) return;
      stepIndex = idx;
      /* capture中も幅ステップだけ覚え、DOMは触らない（CSSが1200固定） */
      if (document.documentElement.classList.contains("is-capture-mode")) {
        store.previewDesignWidth = 1200;
        store.previewFrameScale = 1;
        return;
      }
      apply();
      window.requestAnimationFrame(() => alignOpenPhotoWithPreview());
    };
    apply();
  }

  function setupSplitPane() {
    const split = document.getElementById("atelier-split");
    const handle = document.getElementById("split-handle");
    const shell = document.querySelector(".atelier-shell");
    if (!split || !handle) return;

    const pct = 45;

    function setPct(next) {
      const value = next + "%";
      if (shell) shell.style.setProperty("--preview-pct", value);
      split.style.setProperty("--preview-pct", value);
      if (typeof window.applyPreviewWidthFromPane === "function") {
        window.applyPreviewWidthFromPane();
      }
      syncLayoutMirrors();
      const openMap = document.querySelector("#easy-img-layout-host .layout-photo-row.is-open .layout-source-map");
      if (openMap) alignOpenSourceMapToPad(openMap);
      alignOpenPhotoWithPreview();
    }

    setPct(pct);

    function clientToPct(clientX) {
      const rect = split.getBoundingClientRect();
      if (!rect.width) return pct;
      /* 右端から見た見本の幅。左端からの割合は見本の幅にしない */
      return ((rect.right - clientX) / rect.width) * 100;
    }

    function onMove(ev) {
      const point = ev.touches && ev.touches[0] ? ev.touches[0] : ev;
      document.documentElement.classList.remove("dash-preview-locked");
      const preview = document.querySelector(".preview-pane");
      if (preview) {
        preview.style.position = "";
        preview.style.left = "";
        preview.style.width = "";
      }
      setPct(clientToPct(point.clientX));
    }

    function onUp() {
      document.body.classList.remove("is-splitting");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
      if (typeof window.applyPreviewWidthFromPane === "function") {
        window.applyPreviewWidthFromPane();
      }
    }

    let dashCollapseLevel = 0;
    let dashCollapseGen = 0;
    let dashWaveTimer = 0;
    let dashOpenWidthPx = 0;
    let dashSheetAnims = [];
    let dashSheetScaleToken = 0;

    function dashWaveMs(name, fallback) {
      const raw = getComputedStyle(document.documentElement).getPropertyValue(name);
      const n = parseFloat(raw);
      return Number.isFinite(n) ? n : fallback;
    }

    function dashCollapseBlocked() {
      const narrow = window.matchMedia && window.matchMedia("(max-width: 860px)").matches;
      const previewHidden = document.documentElement.classList.contains("sample-flow-hide-preview");
      return !!(narrow || previewHidden);
    }

    function clearDashWaveTimer() {
      if (dashWaveTimer) window.clearTimeout(dashWaveTimer);
      dashWaveTimer = 0;
    }

    function clearDashWaveMarks() {
      document.querySelectorAll("[data-wave-row]").forEach(function (el) {
        el.style.removeProperty("--wave-index");
        el.removeAttribute("data-wave-row");
      });
      document.querySelectorAll(".dash-shutter-band").forEach(function (el) {
        el.remove();
      });
      clearOpenMask();
    }

    function clearOpenMask() {
      document.querySelectorAll(".dash-open-mask-svg, .dash-open-sheet").forEach(function (el) {
        el.remove();
      });
      document.querySelectorAll("[data-open-mask]").forEach(function (el) {
        el.style.maskImage = "";
        el.style.webkitMaskImage = "";
        el.style.maskRepeat = "";
        el.style.webkitMaskRepeat = "";
        el.style.maskSize = "";
        el.style.webkitMaskSize = "";
        el.style.maskPosition = "";
        el.style.webkitMaskPosition = "";
        el.removeAttribute("data-open-mask");
      });
      const shut = document.getElementById("dash-collapse-shut");
      const pane = document.getElementById("dash-pane");
      if (shut && pane && shut.hasAttribute("data-open-parked")) {
        shut.removeAttribute("data-open-parked");
        shut.style.zIndex = "";
        pane.insertBefore(shut, pane.firstChild);
      }
    }

    function buildEqualOpenMask(pane) {
      clearOpenMask();
      if (!pane) return 0;
      const paneRect = pane.getBoundingClientRect();
      const fullW = paneRect.width;
      const fullH = paneRect.height;
      if (fullW < 8 || fullH < 8) return 0;
      const svgNS = "http://www.w3.org/2000/svg";
      const dur = dashWaveMs("--dash-wave-dur", 800);
      const gap = dashWaveMs("--dash-wave-gap", 40);
      const slice = 28;
      const count = Math.max(1, Math.ceil(fullH / slice));
      const k = dur > 0 ? (fullW * gap) / (dur * slice) : 0;
      const angle = Math.atan(k) * (180 / Math.PI);
      const svg = document.createElementNS(svgNS, "svg");
      svg.setAttribute("class", "dash-open-mask-svg");
      svg.setAttribute("aria-hidden", "true");
      svg.style.position = "absolute";
      svg.style.width = "0";
      svg.style.height = "0";
      const mask = document.createElementNS(svgNS, "mask");
      mask.setAttribute("id", "dash-open-mask");
      mask.setAttribute("maskUnits", "userSpaceOnUse");
      mask.setAttribute("maskContentUnits", "userSpaceOnUse");
      mask.setAttribute("x", "0");
      mask.setAttribute("y", "0");
      mask.setAttribute("width", String(fullW));
      mask.setAttribute("height", String(fullH));
      const rect = document.createElementNS(svgNS, "rect");
      rect.setAttribute("x", "0");
      rect.setAttribute("y", "0");
      rect.setAttribute("width", "0");
      rect.setAttribute("height", String(fullH + 2));
      rect.setAttribute("fill", "#fff");
      rect.setAttribute("transform", "skewX(" + (-angle) + ")");
      mask.appendChild(rect);
      if (dur > 0) {
        const total = Math.max(0, count - 1) * gap + dur;
        rect.animate(
          [{ width: "0px" }, { width: (fullW + k * fullH) + "px" }],
          { duration: total, easing: "ease", fill: "both" }
        );
      }
      svg.appendChild(mask);
      document.body.appendChild(svg);
      const sheet = document.createElement("div");
      sheet.className = "dash-open-sheet";
      sheet.setAttribute("aria-hidden", "true");
      pane.appendChild(sheet);
      const shut = document.getElementById("dash-collapse-shut");
      const split = document.getElementById("atelier-split");
      if (shut && split && shut.parentElement === pane) {
        shut.setAttribute("data-open-parked", "");
        shut.style.zIndex = "6";
        split.appendChild(shut);
      }
      const size = fullW + "px " + fullH + "px";
      pane.setAttribute("data-open-mask", "");
      pane.style.webkitMaskImage = "url(#dash-open-mask)";
      pane.style.maskImage = "url(#dash-open-mask)";
      pane.style.webkitMaskRepeat = "no-repeat";
      pane.style.maskRepeat = "no-repeat";
      pane.style.webkitMaskSize = size;
      pane.style.maskSize = size;
      pane.style.webkitMaskPosition = "0 0";
      pane.style.maskPosition = "0 0";
      return count;
    }

    function clearDashSqueezeVisuals() {
      const root = document.documentElement;
      const pane = document.getElementById("dash-pane");
      const header = document.querySelector("#dash-pane .dash-header");
      root.classList.remove("dash-wave-squeeze");
      if (header) {
        header.style.transition = "none";
        header.style.width = "";
        header.style.transition = "";
      }
      if (!pane) return;
      pane.style.transition = "none";
      pane.style.clipPath = "";
    }

    function releaseDashPaneWidth() {
      clearDashSqueezeVisuals();
      const pane = document.getElementById("dash-pane");
      if (!pane) return;
      pane.style.transition = "";
      pane.style.width = "";
      pane.style.flex = "";
      pane.style.minWidth = "";
    }

    function animateDashPaneWidth(targetPx) {
      const pane = document.getElementById("dash-pane");
      if (!pane) return;
      const from = pane.getBoundingClientRect().width;
      pane.style.flex = "0 0 auto";
      pane.style.minWidth = "0";
      pane.style.width = from + "px";
      void pane.offsetWidth;
      pane.style.transition = "width " + dashWaveMs("--dash-width-dur", 220) + "ms ease";
      pane.style.width = targetPx + "px";
    }

    function rememberedDashWidth() {
      const split = document.getElementById("atelier-split");
      const pane = document.getElementById("dash-pane");
      if (!split || !pane) return pane ? pane.getBoundingClientRect().width : 0;
      const rect = split.getBoundingClientRect();
      const pct = parseFloat(getComputedStyle(split).getPropertyValue("--preview-pct")) || 52;
      const handleW = handle.getBoundingClientRect().width || 10;
      return Math.max(280, rect.width - rect.width * (pct / 100) - handleW);
    }

    function waveRowVisible(el) {
      if (!el || el.hidden) return false;
      if (el.closest("summary")) return false;
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 8 && rect.height > 8;
    }

    /* 見えている行・塊だけ。ボタン内の文字や印は対象にしない */
    function collectDashWaveRows() {
      const pane = document.getElementById("dash-pane");
      if (!pane) return [];
      const active =
        pane.querySelector("details.dash-block.is-wizard-active") ||
        pane.querySelector("details.dash-block.is-active-step") ||
        Array.prototype.find.call(pane.querySelectorAll(".dash-body details.dash-block"), function (el) {
          return !el.hidden && el.open;
        });
      const rows = [];
      function push(el) {
        if (!waveRowVisible(el)) return;
        if (rows.some(function (row) { return row === el || row.contains(el); })) return;
        rows.push(el);
      }
      push(pane.querySelector(".dash-resume-notice"));
      if (active) {
        Array.prototype.forEach.call(active.children, function (child) {
          if (child.matches("summary")) return;
          if (child.matches(".entry-branch-grid, .easy-basics-fields")) {
            Array.prototype.forEach.call(child.children, push);
            return;
          }
          push(child);
        });
      }
      push(pane.querySelector(".wizard-foot-dock"));
      return rows;
    }

    function markDashShutter(direction, opts) {
      opts = opts || {};
      clearDashWaveMarks();
      const header = document.querySelector("#dash-pane .dash-header");
      let rows = [];
      if (opts.headerOnly) {
        if (header && waveRowVisible(header)) rows = [header];
      } else {
        rows = collectDashWaveRows();
        if (opts.includeHeader && header && waveRowVisible(header)) {
          rows = rows.filter(function (el) { return !header.contains(el); });
          rows.push(header);
        }
      }
      rows.sort(function (a, b) {
        return a.getBoundingClientRect().top - b.getBoundingClientRect().top;
      });
      const dock = document.querySelector("#dash-pane .wizard-foot-dock");
      if (dock && rows.indexOf(dock) >= 0) {
        rows.splice(rows.indexOf(dock), 1);
        rows.push(dock);
      }
      const last = rows.length - 1;
      rows.forEach(function (el, index) {
        const waveIndex = direction === "up" ? last - index : index;
        el.setAttribute("data-wave-row", direction);
        el.style.setProperty("--wave-index", String(waveIndex));
      });
      buildShutterBands(rows);
      return rows.length;
    }

    function buildShutterBands(rows) {
      const pane = document.getElementById("dash-pane");
      if (!pane || !rows.length) return;
      const paneRect = pane.getBoundingClientRect();
      const header = pane.querySelector(".dash-header");
      const sorted = rows.slice().sort(function (a, b) {
        return a.getBoundingClientRect().top - b.getBoundingClientRect().top;
      });
      sorted.forEach(function (row, i) {
        const rowRect = row.getBoundingClientRect();
        let top = rowRect.top;
        if (i === 0 && header && row !== header && !header.contains(row)) {
          const headerBottom = header.getBoundingClientRect().bottom;
          if (headerBottom <= rowRect.top + 1) top = headerBottom;
        }
        const nextTop = i < sorted.length - 1 ? sorted[i + 1].getBoundingClientRect().top : paneRect.bottom;
        const band = document.createElement("div");
        band.className = "dash-shutter-band";
        band.setAttribute("data-wave-row", row.getAttribute("data-wave-row") || "up");
        band.style.top = (top - paneRect.top) + "px";
        band.style.height = Math.max(0, nextTop - top) + "px";
        band.style.setProperty("--wave-index", row.style.getPropertyValue("--wave-index"));
        pane.appendChild(band);
      });
    }

    function shutterWait(count) {
      const dur = dashWaveMs("--dash-wave-dur", 180);
      const gap = dashWaveMs("--dash-wave-gap", 28);
      if (dur <= 0 || count <= 0) return 0;
      return Math.max(0, count - 1) * gap + dur;
    }

    function lockPreviewBox() {
      const preview = document.querySelector(".preview-pane");
      const split = document.getElementById("atelier-split");
      if (!preview || !split) return;
      const pr = preview.getBoundingClientRect();
      const sr = split.getBoundingClientRect();
      document.documentElement.classList.add("dash-preview-locked");
      preview.style.left = (pr.left - sr.left) + "px";
      preview.style.top = (pr.top - sr.top) + "px";
      preview.style.width = pr.width + "px";
      preview.style.height = pr.height + "px";
      preview.style.right = "auto";
    }

    function unlockPreviewBox() {
      const preview = document.querySelector(".preview-pane");
      document.documentElement.classList.remove("dash-preview-locked");
      if (!preview) return;
      preview.style.left = "";
      preview.style.top = "";
      preview.style.width = "";
      preview.style.height = "";
      preview.style.right = "";
      preview.style.transition = "";
    }

    function fitPreviewScaleToOpenWidth() {
      const preview = document.querySelector(".preview-pane");
      const split = document.getElementById("atelier-split");
      const pane = document.getElementById("dash-pane");
      if (!preview || !split || !pane || typeof window.applyPreviewFrameScale !== "function") return;
      const sr = split.getBoundingClientRect();
      const handleW = handle.getBoundingClientRect().width || 10;
      const left = pane.getBoundingClientRect().width + handleW;
      const saved = {
        left: preview.style.left,
        top: preview.style.top,
        width: preview.style.width,
        height: preview.style.height,
        transition: preview.style.transition
      };
      preview.style.transition = "none";
      preview.style.left = left + "px";
      preview.style.width = Math.max(0, sr.width - left) + "px";
      preview.style.top = "0px";
      preview.style.height = sr.height + "px";
      void preview.offsetWidth;
      try {
        window.applyPreviewFrameScale({
          placeFit: document.body.classList.contains("hub-ui-layout") || document.body.classList.contains("hub-place-pick")
        });
      } finally {
        preview.style.left = saved.left;
        preview.style.top = saved.top;
        preview.style.width = saved.width;
        preview.style.height = saved.height;
        preview.style.transition = saved.transition;
        void preview.offsetWidth;
      }
    }

    function shrinkPreviewWithWave(waitMs) {
      const preview = document.querySelector(".preview-pane");
      const split = document.getElementById("atelier-split");
      const pane = document.getElementById("dash-pane");
      if (!preview || !split || !pane || waitMs <= 0) return;
      const sr = split.getBoundingClientRect();
      const handleW = handle.getBoundingClientRect().width || 10;
      const left = pane.getBoundingClientRect().width + handleW;
      preview.style.transition = "none";
      void preview.offsetWidth;
      preview.style.transition = "left " + waitMs + "ms ease, width " + waitMs + "ms ease, top " + waitMs + "ms ease, height " + waitMs + "ms ease";
      preview.style.left = left + "px";
      preview.style.width = Math.max(0, sr.width - left) + "px";
      preview.style.top = "0px";
      preview.style.height = sr.height + "px";
    }

    function afterPaneWidth(targetPx, gen, level, next) {
      const pane = document.getElementById("dash-pane");
      const root = document.documentElement;
      const widthDur = dashWaveMs("--dash-width-dur", 220);
      root.classList.add("dash-pane-sizing");
      if (!pane || widthDur <= 0) {
        if (pane) {
          pane.style.flex = "0 0 auto";
          pane.style.minWidth = "0";
          pane.style.transition = "none";
          pane.style.width = targetPx + "px";
        }
        root.classList.remove("dash-pane-sizing");
        if (gen === dashCollapseGen && dashCollapseLevel === level) next();
        return;
      }
      animateDashPaneWidth(targetPx);
      dashWaveTimer = window.setTimeout(function () {
        root.classList.remove("dash-pane-sizing");
        if (gen !== dashCollapseGen || dashCollapseLevel !== level) return;
        next();
      }, widthDur + 40);
    }

    function syncDashCollapseChrome(level) {
      const shut = document.getElementById("dash-collapse-shut");
      const root = document.documentElement;
      const fullOn = root.classList.contains("dash-collapse-full") || root.classList.contains("dash-collapse-closing");
      if (shut) {
        const blocked = dashCollapseBlocked();
        shut.hidden = blocked;
        if (blocked) shut.setAttribute("aria-hidden", "true");
        else shut.removeAttribute("aria-hidden");
        shut.setAttribute("aria-label", level >= 2 || fullOn ? "操作パネルを元の幅に戻す" : "操作パネルをしまう");
      }
      if (level && !dashCollapseBlocked()) {
        handle.setAttribute("aria-hidden", "true");
        handle.tabIndex = -1;
      } else {
        handle.removeAttribute("aria-hidden");
        handle.tabIndex = 0;
      }
    }

    function settleHalf() {
      if (dashCollapseLevel !== 1) return;
      const root = document.documentElement;
      root.classList.add("dash-collapse-half", "dash-collapse-settled");
      root.classList.remove("dash-wave-out", "dash-pane-sizing", "dash-preview-fill", "dash-wave-reveal", "dash-wave-squeeze");
      clearDashWaveMarks();
      releaseDashPaneWidth();
      syncDashCollapseChrome(1);
      if (typeof window.applyPreviewWidthFromPane === "function") {
        window.applyPreviewWidthFromPane();
      }
    }

    function paintDashCollapseInstant(level) {
      clearDashWaveTimer();
      clearDashWaveMarks();
      unlockPreviewBox();
      releaseDashPaneWidth();
      const root = document.documentElement;
      root.classList.remove(
        "dash-wave-out",
        "dash-wave-in",
        "dash-wave-reveal",
        "dash-wave-squeeze",
        "dash-collapse-closing",
        "dash-title-tuck",
        "dash-collapse-half",
        "dash-collapse-full",
        "dash-collapse-settled",
        "dash-pane-sizing",
        "dash-preview-locked",
        "dash-preview-fill"
      );
      root.style.removeProperty("--dash-wave-lead");
      if (level === 1) {
        root.classList.add("dash-collapse-half", "dash-collapse-settled");
      } else if (level === 2) {
        root.classList.add("dash-collapse-full");
      }
      syncDashCollapseChrome(level);
      if (typeof window.applyPreviewWidthFromPane === "function") {
        window.applyPreviewWidthFromPane();
      }
    }

    function expandPreviewToHalf(gen, next) {
      const preview = document.querySelector(".preview-pane");
      const split = document.getElementById("atelier-split");
      const root = document.documentElement;
      if (!preview || !split) {
        if (gen === dashCollapseGen && dashCollapseLevel === 1) next();
        return;
      }
      lockPreviewBox();
      const sr = split.getBoundingClientRect();
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const finalLeft = 9 * rem;
      const finalWidth = Math.max(0, sr.width - finalLeft);
      const widthDur = dashWaveMs("--dash-width-dur", 220);
      root.classList.add("dash-pane-sizing");
      if (widthDur <= 0) {
        preview.style.transition = "none";
        preview.style.left = finalLeft + "px";
        preview.style.width = finalWidth + "px";
        preview.style.top = "0px";
        preview.style.height = sr.height + "px";
        root.classList.remove("dash-pane-sizing");
        if (gen === dashCollapseGen && dashCollapseLevel === 1) next();
        return;
      }
      preview.style.transition = "none";
      void preview.offsetWidth;
      preview.style.transition = "left " + widthDur + "ms ease, width " + widthDur + "ms ease, top " + widthDur + "ms ease, height " + widthDur + "ms ease";
      preview.style.left = finalLeft + "px";
      preview.style.width = finalWidth + "px";
      preview.style.top = "0px";
      preview.style.height = sr.height + "px";
      dashWaveTimer = window.setTimeout(function () {
        root.classList.remove("dash-pane-sizing");
        if (gen !== dashCollapseGen || dashCollapseLevel !== 1) return;
        next();
      }, widthDur + 40);
    }

    function finishHalfWidth(gen) {
      if (gen !== dashCollapseGen || dashCollapseLevel !== 1) return;
      const root = document.documentElement;
      const pane = document.getElementById("dash-pane");
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      if (pane) {
        pane.style.transition = "none";
        pane.style.flex = "0 0 auto";
        pane.style.minWidth = "0";
        pane.style.width = (9 * rem) + "px";
      }
      root.classList.add("dash-collapse-half", "dash-collapse-settled", "dash-preview-fill");
      root.classList.remove("dash-wave-out", "dash-wave-reveal", "dash-wave-squeeze");
      clearDashWaveMarks();
      clearDashSqueezeVisuals();
      unlockPreviewBox();
      settleHalf();
    }

    function startHalfSqueeze(gen, next) {
      const pane = document.getElementById("dash-pane");
      const root = document.documentElement;
      if (!pane || gen !== dashCollapseGen || dashCollapseLevel !== 1) return;
      const held = pane.getBoundingClientRect().width;
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const lead = 9 * rem;
      const squeezeDur = dashWaveMs("--dash-squeeze-dur", 80);
      const header = pane.querySelector(".dash-header");
      const rightInset = Math.max(0, held - lead);
      root.classList.add("dash-wave-squeeze");
      if (squeezeDur <= 0 || rightInset <= 0) {
        pane.style.transition = "none";
        pane.style.clipPath = "inset(0 " + rightInset + "px 0 0)";
        if (header) {
          header.style.transition = "none";
          header.style.width = lead + "px";
        }
        next();
        return;
      }
      pane.style.transition = "none";
      pane.style.clipPath = "inset(0 0 0 0)";
      if (header) {
        header.style.transition = "none";
        header.style.width = held + "px";
      }
      void pane.offsetWidth;
      pane.style.transition = "clip-path " + squeezeDur + "ms ease";
      pane.style.clipPath = "inset(0 " + rightInset + "px 0 0)";
      if (header) {
        header.style.transition = "width " + squeezeDur + "ms ease";
        header.style.width = lead + "px";
      }
      dashWaveTimer = window.setTimeout(function () {
        if (gen !== dashCollapseGen || dashCollapseLevel !== 1) return;
        next();
      }, squeezeDur + 30);
    }

    function beginHalfFromOpen() {
      dashCollapseLevel = 1;
      const gen = ++dashCollapseGen;
      const root = document.documentElement;
      const pane = document.getElementById("dash-pane");
      clearDashWaveTimer();
      clearDashWaveMarks();
      unlockPreviewBox();
      root.classList.remove(
        "dash-collapse-half",
        "dash-collapse-full",
        "dash-collapse-settled",
        "dash-wave-out",
        "dash-wave-in",
        "dash-wave-reveal",
        "dash-wave-squeeze",
        "dash-title-tuck",
        "dash-pane-sizing",
        "dash-preview-locked",
        "dash-preview-fill"
      );
      releaseDashPaneWidth();
      syncDashCollapseChrome(1);
      if (pane) {
        const held = pane.getBoundingClientRect().width;
        pane.style.flex = "0 0 auto";
        pane.style.width = held + "px";
      }
      expandPreviewToHalf(gen, function () {
        startHalfSqueeze(gen, function () {
          const dur = dashWaveMs("--dash-wave-dur", 180);
          const count = dur <= 0 ? 0 : markDashShutter("up");
          if (dur <= 0 || !count) {
            finishHalfWidth(gen);
            return;
          }
          root.classList.add("dash-wave-out", "dash-wave-reveal");
          syncDashCollapseChrome(1);
          dashWaveTimer = window.setTimeout(function () {
            if (gen !== dashCollapseGen || dashCollapseLevel !== 1) return;
            finishHalfWidth(gen);
          }, shutterWait(count) + 40);
        });
      });
    }

    function finishFull(gen) {
      if (gen !== dashCollapseGen || dashCollapseLevel !== 2) return;
      const root = document.documentElement;
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      afterPaneWidth(1.35 * rem, gen, 2, function () {
        clearDashWaveMarks();
        root.classList.remove("dash-wave-out", "dash-title-tuck", "dash-collapse-half", "dash-collapse-settled");
        root.classList.add("dash-collapse-full");
        releaseDashPaneWidth();
        syncDashCollapseChrome(2);
        if (typeof window.applyPreviewWidthFromPane === "function") {
          window.applyPreviewWidthFromPane();
        }
      });
    }

    function beginFullFromHalf() {
      dashCollapseLevel = 2;
      const gen = ++dashCollapseGen;
      const root = document.documentElement;
      clearDashWaveTimer();
      clearDashWaveMarks();
      root.classList.remove("dash-wave-out", "dash-wave-in", "dash-title-tuck", "dash-pane-sizing", "dash-preview-fill");
      const ready = root.classList.contains("dash-collapse-half") && root.classList.contains("dash-collapse-settled");
      if (!ready) {
        unlockPreviewBox();
        paintDashCollapseInstant(2);
        return;
      }
      syncDashCollapseChrome(2);
      const dur = dashWaveMs("--dash-wave-dur", 180);
      const count = dur <= 0 ? 0 : markDashShutter("up", { headerOnly: true });
      if (dur <= 0 || !count) {
        finishFull(gen);
        return;
      }
      root.classList.add("dash-wave-out");
      dashWaveTimer = window.setTimeout(function () {
        if (gen !== dashCollapseGen || dashCollapseLevel !== 2) return;
        finishFull(gen);
      }, shutterWait(count) + 40);
    }

    function beginOpen() {
      dashCollapseLevel = 0;
      const gen = ++dashCollapseGen;
      const root = document.documentElement;
      const pane = document.getElementById("dash-pane");
      clearDashWaveTimer();
      clearDashWaveMarks();
      root.classList.remove("dash-wave-out", "dash-wave-in", "dash-wave-reveal", "dash-wave-squeeze", "dash-collapse-closing", "dash-title-tuck", "dash-pane-sizing", "dash-preview-fill");
      clearDashSqueezeVisuals();
      lockPreviewBox();
      const target = rememberedDashWidth();
      if (pane) {
        pane.style.transition = "none";
        pane.style.flex = "0 0 auto";
        pane.style.minWidth = "0";
        pane.style.width = target + "px";
      }
      root.classList.remove("dash-collapse-half", "dash-collapse-full", "dash-collapse-settled");
      void (pane && pane.offsetWidth);
      const dur = dashWaveMs("--dash-wave-dur", 800);
      const count = dur <= 0 || !pane ? 0 : buildEqualOpenMask(pane);
      if (dur > 0 && count) {
        fitPreviewScaleToOpenWidth();
        root.classList.add("dash-wave-in", "dash-wave-reveal");
      }
      const wait = dur <= 0 || !count ? 0 : shutterWait(count);
      shrinkPreviewWithWave(wait);
      syncDashCollapseChrome(0);
      dashWaveTimer = window.setTimeout(function () {
        if (gen !== dashCollapseGen || dashCollapseLevel !== 0) return;
        root.classList.remove("dash-wave-in", "dash-wave-reveal");
        root.style.removeProperty("--dash-wave-lead");
        clearDashWaveMarks();
        unlockPreviewBox();
        releaseDashPaneWidth();
        if (typeof window.applyPreviewWidthFromPane === "function") {
          window.applyPreviewWidthFromPane();
        }
      }, (dur <= 0 ? 0 : shutterWait(count)) + 40);
    }

    function setupWaveTune() {
      const panel = document.getElementById("wave-tune");
      if (!panel) return;
      const root = document.documentElement;
      const fields = {
        dur: { prop: "--dash-wave-dur", unit: "ms", step: 20, min: 0, max: 2000, fallback: 800 },
        gap: { prop: "--dash-wave-gap", unit: "ms", step: 5, min: 0, max: 400, fallback: 40 }
      };
      const waveTunePark = {
        shift: { prop: "--dash-wave-shift", unit: "px", step: 1, min: 0, max: 48, fallback: 6 }
      };
      const shiftPark = document.getElementById("wave-shift-park");
      if (shiftPark) shiftPark.waveTunePark = waveTunePark;
      function read(spec) {
        const n = parseFloat(getComputedStyle(root).getPropertyValue(spec.prop));
        return Number.isFinite(n) ? n : spec.fallback;
      }
      function clamp(spec, value) {
        return Math.min(spec.max, Math.max(spec.min, value));
      }
      function write(key, value) {
        const spec = fields[key];
        const n = clamp(spec, value);
        root.style.setProperty(spec.prop, n + spec.unit);
        return n;
      }
      Object.keys(fields).forEach(function (key) {
        const input = panel.querySelector('[data-wave-value="' + key + '"]');
        if (input) input.value = String(read(fields[key]));
      });
      const edge = 28;
      function placePanel(left, top) {
        const maxL = Math.max(edge, window.innerWidth - panel.offsetWidth - edge);
        const maxT = Math.max(edge, window.innerHeight - panel.offsetHeight - edge);
        panel.style.left = Math.min(maxL, Math.max(edge, left)) + "px";
        panel.style.top = Math.min(maxT, Math.max(edge, top)) + "px";
        panel.style.right = "auto";
        panel.style.bottom = "auto";
      }
      placePanel(
        window.innerWidth - panel.offsetWidth > 160
          ? window.innerWidth - panel.offsetWidth - 96
          : (window.innerWidth - panel.offsetWidth) / 2,
        window.innerHeight - panel.offsetHeight - 140
      );
      function stepButton(btn) {
        const key = btn.getAttribute("data-wave-tune");
        const spec = fields[key];
        if (!spec) return;
        const input = panel.querySelector('[data-wave-value="' + key + '"]');
        const typed = input ? parseFloat(input.value) : NaN;
        const base = Number.isFinite(typed) ? typed : read(spec);
        const dir = parseFloat(btn.getAttribute("data-dir")) || 0;
        const next = write(key, base + dir * spec.step);
        if (input) input.value = String(next);
      }
      let fromPointer = false;
      let holdDelay = 0;
      let holdTick = 0;
      function stopHold() {
        window.clearTimeout(holdDelay);
        window.clearInterval(holdTick);
        holdDelay = 0;
        holdTick = 0;
        window.setTimeout(function () { fromPointer = false; }, 400);
      }
      panel.addEventListener("pointerdown", function (ev) {
        const btn = ev.target.closest("[data-wave-tune]");
        if (!btn || !panel.contains(btn) || ev.button !== 0) return;
        ev.preventDefault();
        fromPointer = true;
        stepButton(btn);
        try { btn.setPointerCapture(ev.pointerId); } catch (err) { /* 古い環境では離したときに止める */ }
        holdDelay = window.setTimeout(function () {
          holdTick = window.setInterval(function () { stepButton(btn); }, 90);
        }, 280);
      });
      panel.addEventListener("pointerup", stopHold);
      panel.addEventListener("pointercancel", stopHold);
      panel.addEventListener("click", function (ev) {
        const btn = ev.target.closest("[data-wave-tune]");
        if (!btn || !panel.contains(btn)) return;
        if (fromPointer) {
          fromPointer = false;
          return;
        }
        stepButton(btn);
      });
      const title = panel.querySelector(".wave-tune-title");
      let drag = null;
      if (title) {
        title.addEventListener("pointerdown", function (ev) {
          if (ev.button !== 0) return;
          const rect = panel.getBoundingClientRect();
          drag = { dx: ev.clientX - rect.left, dy: ev.clientY - rect.top, id: ev.pointerId };
          panel.classList.add("is-dragging");
          try { title.setPointerCapture(ev.pointerId); } catch (err) { drag = null; }
        });
        title.addEventListener("pointermove", function (ev) {
          if (!drag || ev.pointerId !== drag.id) return;
          placePanel(ev.clientX - drag.dx, ev.clientY - drag.dy);
        });
        function endDrag(ev) {
          if (!drag || ev.pointerId !== drag.id) return;
          drag = null;
          panel.classList.remove("is-dragging");
        }
        title.addEventListener("pointerup", endDrag);
        title.addEventListener("pointercancel", endDrag);
      }
      panel.addEventListener("input", function (ev) {
        const input = ev.target;
        const key = input && input.getAttribute && input.getAttribute("data-wave-value");
        const spec = key && fields[key];
        if (!spec) return;
        const n = parseFloat(input.value);
        if (!Number.isFinite(n)) return;
        write(key, n);
      });
      panel.addEventListener("change", function (ev) {
        const input = ev.target;
        const key = input && input.getAttribute && input.getAttribute("data-wave-value");
        const spec = key && fields[key];
        if (!spec) return;
        const n = parseFloat(input.value);
        input.value = String(write(key, Number.isFinite(n) ? n : read(spec)));
      });
    }

    function applyDashCollapse() {
      if (dashCollapseBlocked()) {
        const root = document.documentElement;
        clearDashWaveTimer();
        clearDashWaveMarks();
        unlockPreviewBox();
        releaseDashPaneWidth();
        root.classList.remove(
          "dash-wave-out",
          "dash-wave-in",
          "dash-wave-reveal",
          "dash-wave-squeeze",
          "dash-collapse-closing",
          "dash-title-tuck",
          "dash-collapse-half",
          "dash-collapse-full",
          "dash-collapse-settled",
          "dash-pane-sizing",
          "dash-preview-locked",
          "dash-preview-fill"
        );
        syncDashCollapseChrome(0);
        return;
      }
      paintDashCollapseInstant(dashCollapseLevel);
    }

    window.applyDashCollapse = applyDashCollapse;

    function beginShutAll() {
      dashCollapseLevel = 2;
      const gen = ++dashCollapseGen;
      const root = document.documentElement;
      const pane = document.getElementById("dash-pane");
      const preview = document.querySelector(".preview-pane");
      const split = document.getElementById("atelier-split");
      clearDashWaveTimer();
      clearDashWaveMarks();
      unlockPreviewBox();
      root.classList.remove(
        "dash-collapse-half",
        "dash-collapse-full",
        "dash-collapse-settled",
        "dash-wave-out",
        "dash-wave-in",
        "dash-wave-reveal",
        "dash-wave-squeeze",
        "dash-title-tuck",
        "dash-pane-sizing",
        "dash-preview-locked",
        "dash-preview-fill"
      );
      releaseDashPaneWidth();
      root.classList.add("dash-collapse-closing");
      syncDashCollapseChrome(2);
      if (!pane || !preview || !split) {
        paintDashCollapseInstant(2);
        return;
      }
      const held = pane.getBoundingClientRect().width;
      pane.style.flex = "0 0 auto";
      pane.style.width = held + "px";
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const tab = 1.35 * rem;
      const widthDur = dashWaveMs("--dash-width-dur", 220);
      lockPreviewBox();
      const sr = split.getBoundingClientRect();
      const rightInset = Math.max(0, held - tab);
      if (widthDur <= 0) {
        finishShutAll(gen);
        return;
      }
      root.classList.add("dash-pane-sizing");
      pane.style.transition = "none";
      pane.style.clipPath = "inset(0 0 0 0)";
      preview.style.transition = "none";
      void pane.offsetWidth;
      pane.style.transition = "clip-path " + widthDur + "ms ease";
      pane.style.clipPath = "inset(0 " + rightInset + "px 0 0)";
      preview.style.transition = "left " + widthDur + "ms ease, width " + widthDur + "ms ease, top " + widthDur + "ms ease, height " + widthDur + "ms ease";
      preview.style.left = "0px";
      preview.style.width = sr.width + "px";
      preview.style.top = "0px";
      preview.style.height = sr.height + "px";
      dashWaveTimer = window.setTimeout(function () {
        if (gen !== dashCollapseGen || dashCollapseLevel !== 2) return;
        finishShutAll(gen);
      }, widthDur + 40);
    }

    function finishShutAll(gen) {
      if (gen !== dashCollapseGen || dashCollapseLevel !== 2) return;
      const root = document.documentElement;
      const pane = document.getElementById("dash-pane");
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      if (pane) {
        pane.style.transition = "none";
        pane.style.flex = "0 0 auto";
        pane.style.minWidth = "0";
        pane.style.width = (1.35 * rem) + "px";
      }
      root.classList.add("dash-collapse-full");
      root.classList.remove("dash-collapse-closing", "dash-pane-sizing", "dash-wave-out", "dash-wave-reveal", "dash-wave-squeeze");
      clearDashWaveMarks();
      clearDashSqueezeVisuals();
      unlockPreviewBox();
      releaseDashPaneWidth();
      syncDashCollapseChrome(2);
      if (typeof window.applyPreviewWidthFromPane === "function") {
        window.applyPreviewWidthFromPane();
      }
    }

    function cancelDashSheetAnims() {
      dashSheetScaleToken += 1;
      dashSheetAnims.forEach(function (anim) {
        try { anim.cancel(); } catch (err) { /* ignore */ }
      });
      dashSheetAnims = [];
    }

    function commitDashSheetFrame() {
      const pane = document.getElementById("dash-pane");
      const preview = document.querySelector(".preview-pane");
      const splitEl = document.getElementById("atelier-split");
      const root = document.documentElement;
      if (!dashSheetAnims.length) return;
      if (pane) pane.style.width = pane.getBoundingClientRect().width + "px";
      if (preview && splitEl && root.classList.contains("dash-preview-locked")) {
        const sr = splitEl.getBoundingClientRect();
        const pr = preview.getBoundingClientRect();
        preview.style.left = (pr.left - sr.left) + "px";
        preview.style.width = pr.width + "px";
      }
      cancelDashSheetAnims();
    }

    function finishDashSheet(gen, opening) {
      if (gen !== dashCollapseGen) return;
      const root = document.documentElement;
      const preview = document.querySelector(".preview-pane");
      if (opening) {
        root.classList.remove(
          "dash-collapse-full",
          "dash-collapse-half",
          "dash-collapse-settled",
          "dash-collapse-closing",
          "dash-sheet-move"
        );
      } else {
        root.classList.add("dash-collapse-full");
        root.classList.remove("dash-collapse-closing", "dash-sheet-move");
      }
      cancelDashSheetAnims();
      root.style.removeProperty("--dash-sheet-w");
      if (preview) {
        preview.style.maxWidth = "";
        preview.style.minWidth = "";
      }
      unlockPreviewBox();
      releaseDashPaneWidth();
      unparkDashShut();
      syncDashCollapseChrome(opening ? 0 : 2);
      if (typeof window.applyPreviewWidthFromPane === "function") {
        window.applyPreviewWidthFromPane();
      }
    }

    function parkDashShut() {
      const shut = document.getElementById("dash-collapse-shut");
      const splitEl = document.getElementById("atelier-split");
      if (!shut || !splitEl || shut.hasAttribute("data-sheet-parked")) return;
      shut.setAttribute("data-sheet-parked", "");
      splitEl.appendChild(shut);
    }

    function unparkDashShut() {
      const shut = document.getElementById("dash-collapse-shut");
      const pane = document.getElementById("dash-pane");
      if (!shut || !pane || !shut.hasAttribute("data-sheet-parked")) return;
      shut.removeAttribute("data-sheet-parked");
      pane.insertBefore(shut, pane.firstChild);
    }

    function followPreviewScale(token) {
      function step() {
        if (token !== dashSheetScaleToken) return;
        if (typeof window.applyPreviewFrameScale === "function") window.applyPreviewFrameScale();
        if (dashSheetAnims.some(function (anim) { return anim.playState === "running"; })) {
          window.requestAnimationFrame(step);
        }
      }
      window.requestAnimationFrame(step);
    }

    function playDashSheet(opening) {
      const pane = document.getElementById("dash-pane");
      const preview = document.querySelector(".preview-pane");
      const splitEl = document.getElementById("atelier-split");
      const root = document.documentElement;
      const dur = dashWaveMs(opening ? "--dash-open-ms" : "--dash-shut-ms", opening ? 360 : 220);
      if (!pane || !preview || !splitEl || dur <= 0) {
        cancelDashSheetAnims();
        unparkDashShut();
        dashCollapseLevel = opening ? 0 : 2;
        paintDashCollapseInstant(opening ? 0 : 2);
        return;
      }
      const gen = ++dashCollapseGen;
      dashCollapseLevel = opening ? 0 : 2;
      clearDashWaveTimer();
      clearDashWaveMarks();
      commitDashSheetFrame();

      const splitRect = splitEl.getBoundingClientRect();
      const handleW = handle.getBoundingClientRect().width || 10;
      const face = 2.5 * (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16);
      const liveW = pane.getBoundingClientRect().width;
      if (!opening && liveW > face + 8) dashOpenWidthPx = liveW;
      let openW = dashOpenWidthPx || rememberedDashWidth();
      const maxPane = Math.max(280, splitRect.width - handleW - 280);
      openW = Math.max(280, Math.min(openW, maxPane));

      const easeClose = "cubic-bezier(0.16, 0.84, 0.3, 1)";
      const easeOpen = "cubic-bezier(0.45, 0.02, 0.18, 1)";
      root.style.setProperty("--dash-width-dur", dur + "ms");
      root.style.setProperty("--dash-shut-ease", opening ? "cubic-bezier(0.34, 0.06, 0.18, 1)" : easeClose);

      pane.style.transition = "none";
      pane.style.flex = "0 0 auto";
      pane.style.minWidth = "0";
      const fromW = opening ? (liveW > 4 ? liveW : 0) : liveW;
      pane.style.width = fromW + "px";
      lockPreviewBox();
      preview.style.maxWidth = "none";
      preview.style.minWidth = "0";
      preview.style.transition = "none";
      root.style.setProperty("--dash-sheet-w", (opening ? openW : Math.max(fromW, openW)) + "px");
      root.classList.add("dash-sheet-move");
      parkDashShut();
      if (opening) {
        root.classList.remove(
          "dash-collapse-full",
          "dash-collapse-half",
          "dash-collapse-settled",
          "dash-collapse-closing"
        );
      } else {
        root.classList.add("dash-collapse-closing");
      }
      syncDashCollapseChrome(opening ? 0 : 2);

      const toW = opening ? openW : 0;
      const previewFromLeft = preview.getBoundingClientRect().left - splitRect.left;
      const previewFromW = preview.getBoundingClientRect().width;
      const previewToLeft = opening ? toW + handleW : 0;
      const previewToW = opening ? Math.max(0, splitRect.width - previewToLeft) : splitRect.width;
      const travel = toW - fromW;
      const nudge = 14;
      const useNudge = opening && travel > nudge * 3;
      const nudgeAt = Math.min(0.14, 48 / dur);
      const nudgeFrac = useNudge ? nudge / travel : 0;
      void pane.offsetWidth;

      const paneFrames = useNudge
        ? [
            { width: fromW + "px", easing: "linear" },
            { width: (fromW + nudge) + "px", offset: nudgeAt, easing: easeOpen },
            { width: toW + "px", offset: 1 }
          ]
        : [
            { width: fromW + "px", easing: easeClose },
            { width: toW + "px", offset: 1 }
          ];
      const previewFrames = useNudge
        ? [
            { left: previewFromLeft + "px", width: previewFromW + "px", easing: "linear" },
            {
              left: (previewFromLeft + (previewToLeft - previewFromLeft) * nudgeFrac) + "px",
              width: (previewFromW + (previewToW - previewFromW) * nudgeFrac) + "px",
              offset: nudgeAt,
              easing: easeOpen
            },
            { left: previewToLeft + "px", width: previewToW + "px", offset: 1 }
          ]
        : [
            { left: previewFromLeft + "px", width: previewFromW + "px", easing: easeClose },
            { left: previewToLeft + "px", width: previewToW + "px", offset: 1 }
          ];

      const paneAnim = pane.animate(paneFrames, { duration: dur, fill: "forwards" });
      const previewAnim = preview.animate(previewFrames, { duration: dur, fill: "forwards" });
      dashSheetAnims = [paneAnim, previewAnim];
      followPreviewScale(++dashSheetScaleToken);
      paneAnim.onfinish = function () {
        finishDashSheet(gen, opening);
      };
    }

    const shutBtn = document.getElementById("dash-collapse-shut");
    if (shutBtn) {
      shutBtn.addEventListener("click", function () {
        if (dashCollapseBlocked()) return;
        clearDashWaveTimer();
        clearDashWaveMarks();
        playDashSheet(dashCollapseLevel !== 0);
      });
    }
    window.addEventListener("resize", function () {
      if (dashCollapseBlocked()) applyDashCollapse();
    });
    applyDashCollapse();
    setupWaveTune();

    function startDrag(ev) {
      if (window.matchMedia && window.matchMedia("(max-width: 860px)").matches) return;
      if (
        dashCollapseLevel !== 0 ||
        document.documentElement.classList.contains("dash-collapse-half") ||
        document.documentElement.classList.contains("dash-collapse-full") ||
        document.documentElement.classList.contains("dash-wave-out") ||
        document.documentElement.classList.contains("dash-wave-in") ||
        document.documentElement.classList.contains("dash-wave-squeeze") ||
        document.documentElement.classList.contains("dash-collapse-closing") ||
        document.documentElement.classList.contains("dash-pane-sizing") ||
        document.documentElement.classList.contains("dash-preview-locked")
      ) {
        return;
      }
      releaseDashPaneWidth();
      ev.preventDefault();
      document.body.classList.add("is-splitting");
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
      window.addEventListener("touchmove", onMove, { passive: false });
      window.addEventListener("touchend", onUp);
    }

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
    const backdrop = document.getElementById("atelier-menu-backdrop");
    if (!menu) return;

    function showStage(id) {
      menu.querySelectorAll("[data-menu-stage]").forEach((stage) => {
        const on = stage.getAttribute("data-menu-stage") === (id || "mode");
        stage.hidden = !on;
        stage.classList.toggle("is-active", on);
      });
      syncSiteColorModeUi();
    }

    function openMenu(stageId) {
      menu.hidden = false;
      window.requestAnimationFrame(() => menu.classList.add("is-open"));
      showStage(stageId || "mode");
    }

    function closeMenu() {
      menu.classList.remove("is-open");
      window.setTimeout(() => {
        if (!menu.classList.contains("is-open")) menu.hidden = true;
        showStage("mode");
      }, 220);
    }

    window.openAtelierMenu = openMenu;
    window.closeAtelierMenu = closeMenu;

    if (backdrop) backdrop.addEventListener("click", closeMenu);
    menu.querySelectorAll("[data-menu-close]").forEach((btn) => {
      btn.addEventListener("click", closeMenu);
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
        placePreviewWidthControl();
        window.requestAnimationFrame(() => syncPlaceMarkFrame());
      });
    });
    document.body.classList.add("show-preview");
  }

  function collectAppliedColors() {
    const colors = { ...store.draftColors };
    colors.radius = fieldValue("radius") || colors.radius || DEFAULTS.radius;
    colors.headingScale = fieldValue("headingScale") || DEFAULTS.headingScale;
    colors.accentBar = normalizeAccentBar(fieldValue("accentBar") || DEFAULTS.accentBar);
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
      itemLayouts: store.itemLayouts
        ? JSON.parse(JSON.stringify(store.itemLayouts))
        : defaultItemLayouts(),
      itemOrders: JSON.parse(JSON.stringify(store.itemOrders || {})),
      itemOrderParked: JSON.parse(JSON.stringify(store.itemOrderParked || {})),
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
        hours: !!(store.draftExtras && store.draftExtras.hours),
        access: !!(store.draftExtras && store.draftExtras.access),
        address: !!(store.draftExtras && store.draftExtras.address),
        announce: !!(store.draftExtras && store.draftExtras.announce)
      },
      layoutBlockOff: Object.assign({}, store.layoutBlockOff || {}),
      fields: formToObject({ includeHidden: true }),
      heroTextOnPhoto: !!store.heroTextOnPhoto,
      heroImageOff: !!store.heroImageOff,
      heroFocalX: normalizeFocalPercent(store.heroFocalX, HERO_FOCAL_X_DEFAULT),
      heroFocalY: normalizeFocalPercent(store.heroFocalY, HERO_FOCAL_Y_DEFAULT),
      heroImageScale: normalizeImageScale(store.heroImageScale),
      heroTextPlate: normalizeHeroPlate(store.heroTextPlate),
      heroTextPlateLast: heroPlateLastShape(),
      heroTextPlateTone: normalizeHeroPlateTone(store.heroTextPlateTone),
      heroTextPos: normalizeHeroTextPos(store.heroTextPos),
      note: "画像ファイルはZIPに含みますが、ブラウザ下書きには保存されません。"
    };
  }

  function scheduleSave() {
    if (suppressSave) return;
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(function () {
      saveDraft();
      scheduleFolderWrite();
    }, 300);
  }

  function saveDraft() {
    if (suppressSave || laneQueryHold) return;
    if (document.documentElement.classList.contains("is-embed-preview")) return;
    try {
      const payload = {
        version: 17,
        savedAt: new Date().toISOString(),
        wizardStepIndex: store.wizardStepIndex,
        selfEditingStepId: store.selfEditingStepId,
        uiMode: store.uiMode,
        sitePurpose: store.sitePurpose,
        layoutPattern: store.layoutPattern,
        layoutOrder: normalizeLayoutOrder(store.layoutOrder),
        layoutSelected: !!store.layoutSelected,
        layoutSchema: 2,
        itemLayouts: store.itemLayouts
          ? JSON.parse(JSON.stringify(store.itemLayouts))
          : defaultItemLayouts(),
        itemOrders: JSON.parse(JSON.stringify(store.itemOrders || {})),
        itemOrderParked: JSON.parse(JSON.stringify(store.itemOrderParked || {})),
        heroTextOnPhoto: !!store.heroTextOnPhoto,
      heroImageOff: !!store.heroImageOff,
        heroFocalX: normalizeFocalPercent(store.heroFocalX, HERO_FOCAL_X_DEFAULT),
        heroFocalY: normalizeFocalPercent(store.heroFocalY, HERO_FOCAL_Y_DEFAULT),
        heroImageScale: normalizeImageScale(store.heroImageScale),
        aboutItemsDisplay: normalizeAboutItemsDisplay(store.aboutItemsDisplay),
        heroTextPlate: normalizeHeroPlate(store.heroTextPlate),
        heroTextPlateLast: heroPlateLastShape(),
        heroTextPlateTone: normalizeHeroPlateTone(store.heroTextPlateTone),
        heroTextPos: normalizeHeroTextPos(store.heroTextPos),
        finishLockedOnce: store.finishLockedOnce,
        guidedImageUnlocked: store.guidedImageUnlocked,
        guidedTextUnlocked: store.guidedTextUnlocked,
        presetChosen: store.presetChosen,
        colorListOrder: Array.isArray(store.colorListOrder) ? store.colorListOrder.slice() : null,
        chosenPresetKey: store.chosenPresetKey,
        vibeColors: store.vibeColors,
        vibeReasons: store.vibeReasons,
        vibeText: store.vibeText,
        intakeDone: store.intakeDone,
        saveMode: store.saveMode === "folder" || store.saveMode === "browser" ? store.saveMode : null,
        projectFolderName: store.projectFolderName || "",
        entryBranch: store.entryBranch,
        blankCanvas: !!store.blankCanvas,
        hubEntrySource: store.hubEntrySource,
        easyFlowActive: !!store.easyFlowActive,
      easyDirectOpen: !!store.easyDirectOpen,
        easyKusudamaPlayed: !!store.easyKusudamaPlayed,
        announceLinkOn: !!store.announceLinkOn,
        workLinkOn: Object.assign({}, store.workLinkOn || {}),
        sampleFinishNoBack: !!store.sampleFinishNoBack,
        easyBasicsApplied: !!store.easyBasicsApplied,
        siteNameConfirmed: !!store.siteNameConfirmed,
        easyBasicsHints: store.easyBasicsHints
          ? {
              brand: String(store.easyBasicsHints.brand || ""),
              intro: String(store.easyBasicsHints.intro || ""),
              email: String(store.easyBasicsHints.email || ""),
              phone: String(store.easyBasicsHints.phone || ""),
              hours: String(store.easyBasicsHints.hours || ""),
              address: String(store.easyBasicsHints.address || "")
            }
          : null,
      sampleFlowEntered: !!store.sampleFlowEntered,
      sampleFlowAppliedId: store.sampleFlowAppliedId || null,
      sampleOriginalPreset: store.sampleOriginalPreset || null,
        copyPathMode: store.copyPathMode === "keyword" || store.copyPathMode === "omakase" ? store.copyPathMode : null,
        imgPathMode: store.imgPathMode === "self" || store.imgPathMode === "omakase" ? store.imgPathMode : null,
        copyFrameIndex: Number(store.copyFrameIndex) || 0,
        copyDirIds: Array.isArray(store.copyDirIds) ? store.copyDirIds.slice() : [],
        copyDirForbid: Array.isArray(store.copyDirForbid) ? store.copyDirForbid.slice() : [],
        copyFieldSource: store.copyFieldSource && typeof store.copyFieldSource === "object" ? store.copyFieldSource : {},
        copyHeroOnPhoto: store.copyHeroOnPhoto === true ? true : store.copyHeroOnPhoto === false ? false : null,
        hubImgPathMode: store.hubImgPathMode && typeof store.hubImgPathMode === "object" ? store.hubImgPathMode : {},
        imgOmakaseLocks: Object.assign({}, store.imgOmakaseLocks || {}),
        imgOmakaseSkipConfirm: !!store.imgOmakaseSkipConfirm,
        sampleKeptImagePaths:
          store.sampleKeptImagePaths && typeof store.sampleKeptImagePaths === "object"
            ? Object.assign({}, store.sampleKeptImagePaths)
            : null,
        layoutLockNoticeSkip: !!store.layoutLockNoticeSkip,
        sushiSampleId: store.sushiSampleId,
        sushiSampleKey: store.sushiSampleKey,
        sampleSectionCandidates: store.sampleSectionCandidates || {},
        sampleSectionSelected: store.sampleSectionSelected || {},
        easyAnswers: store.easyAnswers || { mood: "calm", focus: "quality", guest: "first" },
        easyCopyCandidates: store.easyCopyCandidates || [],
        easyCopySelected: store.easyCopySelected,
        siteColorMode: store.siteColorMode,
        slotGradients: store.slotGradients || {},
        slotGradientPartners: store.slotGradientPartners || {},
        gradDirHintSkip: !!store.gradDirHintSkip,
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
          hours: !!(store.draftExtras && store.draftExtras.hours),
          access: !!(store.draftExtras && store.draftExtras.access),
          address: !!(store.draftExtras && store.draftExtras.address),
          announce: !!(store.draftExtras && store.draftExtras.announce)
        },
        layoutBlockOff: Object.assign({}, store.layoutBlockOff || {}),
        draftContact: { ...store.draftContact },
        confirmed: store.confirmed,
        snapshots: store.snapshots,
        fields: formToObject({ includeHidden: true })
      };
      if (store.sampleCopySlots && typeof store.sampleCopySlots === "object") {
        payload.sampleCopySlots = {
          hero: !!store.sampleCopySlots.hero,
          about: !!store.sampleCopySlots.about,
          works: !!store.sampleCopySlots.works,
          contact: !!store.sampleCopySlots.contact
        };
      }
      if (store.sampleCopyBaseline && typeof store.sampleCopyBaseline === "object") {
        payload.sampleCopyBaseline = Object.assign({}, store.sampleCopyBaseline);
      }
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
      if (!data || (data.version !== 10 && data.version !== 11 && data.version !== 12 && data.version !== 13 && data.version !== 14 && data.version !== 15 && data.version !== 16 && data.version !== 17)) return false;
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
      if (!store.draftColors.announceBg) store.draftColors.announceBg = DEFAULTS.announceBg;
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
      if (data.saveMode === "folder" || data.saveMode === "browser") {
        store.saveMode = data.saveMode;
      }
      if (data.projectFolderName) store.projectFolderName = String(data.projectFolderName);
      if (data.entryBranch === "easy" || data.entryBranch === "detail" || data.entryBranch === "sample") {
        store.entryBranch = data.entryBranch === "easy" ? "sample" : data.entryBranch;
      }
      store.blankCanvas = !!data.blankCanvas;
      if (
        data.hubEntrySource === "detail-entry" ||
        data.hubEntrySource === "easy-done" ||
        data.hubEntrySource === "sample" ||
        data.hubEntrySource === "sample-done"
      ) {
        store.hubEntrySource = data.hubEntrySource === "easy-done" ? "sample-done" : data.hubEntrySource;
      } else if (data.siteColorMode === "detail") {
        store.hubEntrySource = data.entryBranch === "detail" ? "detail-entry" : "sample-done";
      }
      if (data.easyFlowActive != null) store.easyFlowActive = !!data.easyFlowActive;
      if (data.easyDirectOpen != null) store.easyDirectOpen = !!data.easyDirectOpen;
      if (data.easyKusudamaPlayed != null) store.easyKusudamaPlayed = !!data.easyKusudamaPlayed;
      if (data.announceLinkOn != null) store.announceLinkOn = !!data.announceLinkOn;
      else store.announceLinkOn = !!String((data.fields && data.fields.announce_url) || "").trim();
      store.workLinkOn = {};
      if (data.workLinkOn && typeof data.workLinkOn === "object") {
        Object.keys(data.workLinkOn).forEach(function (key) {
          store.workLinkOn[String(key)] = !!data.workLinkOn[key];
        });
      } else if (data.fields) {
        [1, 2, 3].forEach(function (n) {
          if (String(data.fields["work_" + n + "_url"] || "").trim()) store.workLinkOn[String(n)] = true;
        });
      }
      else if (data.easyP1Hold) store.easyFlowActive = !!data.easyP1Hold;
      store.sampleFinishNoBack = !!data.sampleFinishNoBack;
      store.easyBasicsApplied = !!data.easyBasicsApplied;
      store.siteNameConfirmed = !!data.siteNameConfirmed;
      if (data.easyBasicsHints && typeof data.easyBasicsHints === "object") {
        store.easyBasicsHints = {
          brand: String(data.easyBasicsHints.brand || "").trim(),
          intro: String(data.easyBasicsHints.intro || "").trim(),
          email: String(data.easyBasicsHints.email || "").trim(),
          phone: String(data.easyBasicsHints.phone || "").trim(),
          hours: String(data.easyBasicsHints.hours || "").trim(),
          address: String(data.easyBasicsHints.address || "").trim()
        };
        store.easyBrandHint = store.easyBasicsHints.brand;
      }
      if (data.sampleFlowEntered != null) store.sampleFlowEntered = !!data.sampleFlowEntered;
      if (data.sampleFlowAppliedId) store.sampleFlowAppliedId = String(data.sampleFlowAppliedId);
      if (data.sampleOriginalPreset && PRESETS[data.sampleOriginalPreset]) {
        store.sampleOriginalPreset = data.sampleOriginalPreset;
      }
      if (data.copyPathMode === "keyword" || data.copyPathMode === "omakase") {
        store.copyPathMode = data.copyPathMode;
      }
      if (!store.sampleFlowEntered && data.sushiSampleId && (store.easyFlowActive || store.intakeDone || store.copyPathMode)) {
        store.sampleFlowEntered = true;
        if (!store.sampleFlowAppliedId) store.sampleFlowAppliedId = String(data.sushiSampleId);
      }
      if (data.imgPathMode === "self" || data.imgPathMode === "omakase") {
        store.imgPathMode = data.imgPathMode;
      }
      if (data.copyFrameIndex != null) {
        store.copyFrameIndex = Math.max(0, Number(data.copyFrameIndex) || 0);
      }
      if (data.sampleCopySlots && typeof data.sampleCopySlots === "object") {
        store.sampleCopySlots = {
          hero: !!data.sampleCopySlots.hero,
          about: !!data.sampleCopySlots.about,
          works: !!data.sampleCopySlots.works,
          contact: !!data.sampleCopySlots.contact
        };
      }
      if (data.sampleCopyBaseline && typeof data.sampleCopyBaseline === "object") {
        store.sampleCopyBaseline = Object.assign({}, data.sampleCopyBaseline);
      }
      if (Array.isArray(data.copyDirIds)) store.copyDirIds = data.copyDirIds.slice();
      if (Array.isArray(data.copyDirForbid)) store.copyDirForbid = data.copyDirForbid.slice();
      if (data.copyFieldSource && typeof data.copyFieldSource === "object") {
        store.copyFieldSource = data.copyFieldSource;
      }
      if (data.copyHeroOnPhoto === true || data.copyHeroOnPhoto === false) {
        store.copyHeroOnPhoto = data.copyHeroOnPhoto;
      }
      if (data.hubImgPathMode && typeof data.hubImgPathMode === "object") {
        store.hubImgPathMode = data.hubImgPathMode;
      }
      store.imgOmakaseLocks =
        data.imgOmakaseLocks && typeof data.imgOmakaseLocks === "object"
          ? Object.assign({}, data.imgOmakaseLocks)
          : {};
      store.imgOmakaseSkipConfirm = !!data.imgOmakaseSkipConfirm;
      store.sampleKeptImagePaths =
        data.sampleKeptImagePaths && typeof data.sampleKeptImagePaths === "object"
          ? Object.assign({}, data.sampleKeptImagePaths)
          : null;
      store.layoutLockNoticeSkip = !!data.layoutLockNoticeSkip;
      if (data.sushiSampleId != null) store.sushiSampleId = data.sushiSampleId;
      if (data.sushiSampleKey != null) store.sushiSampleKey = data.sushiSampleKey;
      if (data.sampleSectionCandidates && typeof data.sampleSectionCandidates === "object") {
        store.sampleSectionCandidates = data.sampleSectionCandidates;
      }
      if (data.sampleSectionSelected && typeof data.sampleSectionSelected === "object") {
        store.sampleSectionSelected = data.sampleSectionSelected;
      }
      if (data.easyAnswers && typeof data.easyAnswers === "object") {
        store.easyAnswers = {
          mood: data.easyAnswers.mood || "calm",
          focus: data.easyAnswers.focus || "quality",
          guest: data.easyAnswers.guest || "first"
        };
      }
      if (Array.isArray(data.easyCopyCandidates)) store.easyCopyCandidates = data.easyCopyCandidates;
      if (data.easyCopySelected != null) store.easyCopySelected = data.easyCopySelected;
      if (data.siteColorMode === "detail" || data.siteColorMode === "easy") {
        store.siteColorMode = data.siteColorMode;
      }
      if (data.slotGradients && typeof data.slotGradients === "object") {
        store.slotGradients = data.slotGradients;
      }
      store.gradDirHintSkip = !!data.gradDirHintSkip;
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
      if (Array.isArray(data.colorListOrder)) store.colorListOrder = data.colorListOrder.slice();
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
      if (data.itemLayouts && typeof data.itemLayouts === "object") {
        store.itemLayouts = defaultItemLayouts();
        ITEM_LAYOUT_IDS.forEach((id) => {
          const src = data.itemLayouts[id];
          if (!src) return;
          store.itemLayouts[id] = parseItemLayoutSource(id, src);
        });
      }
      adoptItemOrders(data.itemOrders, data.itemOrderParked);
      if (data.heroTextOnPhoto != null) store.heroTextOnPhoto = !!data.heroTextOnPhoto;
      if (data.heroImageOff != null) {
        store.heroImageOff = !!data.heroImageOff;
        applyHeroImageOffState();
      }
      if (data.heroFocalX != null) {
        store.heroFocalX = normalizeFocalPercent(data.heroFocalX, HERO_FOCAL_X_DEFAULT);
      }
      if (data.heroFocalY != null) {
        store.heroFocalY = normalizeFocalPercent(data.heroFocalY, HERO_FOCAL_Y_DEFAULT);
      }
      if (data.heroImageScale != null) {
        store.heroImageScale = normalizeImageScale(data.heroImageScale);
      }
      if (data.aboutItemsDisplay != null) store.aboutItemsDisplay = normalizeAboutItemsDisplay(data.aboutItemsDisplay);
      if (data.heroTextPlate) store.heroTextPlate = normalizeHeroPlate(data.heroTextPlate);
      if (data.heroTextPlateLast) store.heroTextPlateLast = normalizeHeroPlate(data.heroTextPlateLast);
      if (store.heroTextPlateLast === "none") store.heroTextPlateLast = "round";
      if (data.heroTextPlateTone) store.heroTextPlateTone = normalizeHeroPlateTone(data.heroTextPlateTone);
      if (data.heroTextPos) store.heroTextPos = normalizeHeroTextPos(data.heroTextPos);
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
      /* サンプル本線の途中保存：detail／文字オンを持ち込まない（リロードでハブ飛ばし防止） */
      if (store.easyFlowActive && store.entryBranch === "sample") {
        store.siteColorMode = "easy";
        store.uiMode = "guided";
      } else if (
        store.entryBranch === "sample" &&
        !store.easyFlowActive &&
        store.hubEntrySource !== "sample-done" &&
        store.hubEntrySource !== "detail-entry"
      ) {
        store.siteColorMode = "easy";
        store.uiMode = "guided";
        if (store.intakeDone && !store.confirmed.finish && !store.sampleFinishNoBack) {
          store.intakeDone = false;
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
      if (data.confirmed && data.confirmed["extra-content"]) {
        const old = (data.snapshots && data.snapshots["extra-content"]) || {};
        const fields = old.fields || {};
        ["hours", "access", "address", "announce"].forEach((key) => {
          const sid = key + "-text";
          const on =
            data.draftExtras && data.draftExtras[key] != null
              ? !!data.draftExtras[key]
              : !!(old.extras && old.extras[key]);
          if (!on) return;
          store.confirmed[sid] = true;
          if (!store.snapshots[sid]) {
            const one = {};
            if (key === "hours") one.hours_text = fields.hours_text || "";
            if (key === "access") one.access_text = fields.access_text || "";
            if (key === "address") one.address_text = fields.address_text || "";
            store.snapshots[sid] = { fields: one };
          }
        });
        delete store.confirmed["extra-content"];
        if (store.snapshots["extra-content"]) delete store.snapshots["extra-content"];
      }
      if (store.selfEditingStepId === "extra-content") {
        store.selfEditingStepId = "layout";
      }
      if (data.fields) applyFormObject(data.fields);
      if (store.easyBasicsHints) paintEasyBasicsPlaceholders();
      if (data.draftExtras) {
        const migrated = { ...data.draftExtras };
        if (migrated.address == null && migrated.map != null) migrated.address = !!migrated.map;
        delete migrated.map;
        store.draftExtras = { hours: false, access: false, address: false, announce: false, ...migrated };
        syncExtraPanels();
        applyLayoutOrderToPreview();
        renderLayoutArrangeWire();
        renderLayoutCardWires();
      }
      if (data.layoutBlockOff && typeof data.layoutBlockOff === "object") {
        store.layoutBlockOff = Object.assign({}, data.layoutBlockOff);
        applyLayoutOrderToPreview();
        renderLayoutArrangeWire();
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
        if (data.fields.headingScale) setFieldValue("headingScale", normalizeHeadingScale(data.fields.headingScale));
        if (data.fields.accentBar) setFieldValue("accentBar", normalizeAccentBar(data.fields.accentBar));
        else if (data.sushiSampleId || data.sushiSampleKey) setFieldValue("accentBar", "short");
        if (data.fields.radius) setFieldValue("radius", data.fields.radius);
        if (data.fields.font_display) setFieldValue("font_display", data.fields.font_display);
        if (data.fields.font_catch) setFieldValue("font_catch", data.fields.font_catch);
        if (data.fields.font_body) setFieldValue("font_body", data.fields.font_body);
        if (data.fonts || data.fields.font_display || data.fields.font_catch || data.fields.font_body) {
          store.keepLoadedFonts = true;
        }
        if (data.fields.brand_name) setFieldValue("brand_name", data.fields.brand_name);
      }
      fillFontPickers();
      syncFontPickers();
      syncHueSelectFromDraft();
      syncLogoModePanels();
      if (!store.siteNameConfirmed && !store.blankCanvas && (store.sushiSampleId || store.sushiSampleKey)) {
        ensureSampleBrandName({
          sushiSampleId: store.sushiSampleId,
          fields: data.fields || {}
        });
      }
      syncLogoPresentation();
      restoreKeptSampleImages();
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
      paintSampleRouteStatus("ZIP用ライブラリの読み込みに失敗しました。");
      return false;
    }
    const missingImgs = zipImageGaps();
    if (missingImgs.length) {
      const tips = missingImgs.slice(0, 2).map(missingImageStepTip);
      const extra = missingImgs.length - tips.length;
      let label = tips.map((t) => "「" + t + "」").join("");
      if (extra > 0) label += "ほか" + extra + "件";
      const missingText =
        "写真が足りません（" + label + "）。並び替え・確認画面から該当の画像項目を開いてください。";
      if (status) status.textContent = missingText;
      paintSampleRouteStatus(missingText);
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
      "URLローマ字希望: " + ((meta.fields && meta.fields.url_slug_wish) || "(なし)"),
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
      if (input.id === "entry-resume-zip" || input.id === "review-json-import-input") continue;
      const wrap = input.closest("[data-fill-for]");
      if (wrap && wrap.hidden) continue;
      const file =
        (input.files && input.files[0]) ||
        (store.zipImageFiles && input.name && store.zipImageFiles[input.name]) ||
        null;
      if (!file) continue;
      const buf = await file.arrayBuffer();
      zip.file("images/" + (input.name || "image") + "_" + file.name, buf);
    }

    const blob = await zip.generateAsync({ type: "blob" });
    if (store.saveMode === "folder" && store.projectFileHandle) {
      try {
        const allowed = await ensureFolderPermission(store.projectFileHandle, "readwrite");
        if (allowed) {
          const writable = await store.projectFileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
        }
      } catch (e) {
        /* ダウンロードは続ける */
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = zipDownloadName();
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    if (isSampleZipScreen() && store.sampleZipRoute) {
      if (store.sampleZipRoute === "order") {
        store.sampleOrderMailReady = true;
        paintSampleRouteStatus("保存しました。続いて「依頼メールを作成する」を押してください。");
        renderSampleZipBranch();
        return true;
      }
      paintSampleRouteStatus("保存しました。");
      renderSampleZipBranch();
      return true;
    }
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
    const missingImgs = zipImageGaps();
    if (missingImgs.length) {
      const tips = missingImgs.slice(0, 2).map(missingImageStepTip);
      const extra = missingImgs.length - tips.length;
      let label = tips.map((t) => "「" + t + "」").join("");
      if (extra > 0) label += "ほか" + extra + "件";
      if (status) {
        status.textContent =
          "写真が足りません（" + label + "）。並び替え・確認画面から該当の画像項目を開いてください。";
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
            " が未完了です。並び替え・確認画面から該当項目を開き、「" +
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
    if (e.target && e.target.name && isFieldVisible(e.target)) syncCharCounter(e.target);
    if (e.target && e.target.classList && e.target.classList.contains("is-copy-frame")) growCopyField(e.target);
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
  setupFontJumpButtons();
  setupLogoModeUi();
  setupCharLimits();
  setupImageResize();
  buildSwatches();
  setupPresets();
  mountLayoutColorSection();
  setupCounts();
  setupHeroTextOverlayUi();
  applyHeroTextOverlay();
  setupExtrasDraft();
  setupContactDraft();
  setupFontWishDraft();
    setupScopeChecks();
    setupSampleZipBranch();
  setupConfirmButtons();
  setupPreviewSync();
  setupViewport();
  setupSplitPane();
  setupChromeCollapse();
  setupAtelierMenu();
  setupMobileTabs();
  setupExclusiveAccordions();
  setupPreviewHits();
  setupHubPlaceEntry();
  setupAboutItemsDisplay();
  setupHubTips(document);
  document.addEventListener(
    "click",
    (ev) => {
      if (ev.target && ev.target.closest && ev.target.closest("[data-hub-tip]")) return;
      document.querySelectorAll(".hub-tip-pop").forEach((p) => {
        p.hidden = true;
      });
      document.querySelectorAll("[data-hub-tip]").forEach((b) => {
        b.setAttribute("aria-expanded", "false");
      });
    },
    true
  );
  const aboutAccList = document.getElementById("about-accordions");
  if (aboutAccList) {
    aboutAccList.addEventListener("toggle", (ev) => {
      const t = ev.target;
      if (!(t instanceof HTMLDetailsElement)) return;
      if (!aboutAccList.contains(t)) return;
      if (normalizeAboutItemsDisplay(store.aboutItemsDisplay) !== "flat") return;
      if (!t.open) t.open = true;
    });
  }
  setupBadgeToggle();
  setupWizard();
  setupGuidedColorTrial();
  setupLayoutPicker();

  form.querySelectorAll(":scope > details.dash-block").forEach((d) => {
    d.open = false;
  });

  const bootParams = new URLSearchParams(location.search);
  const bootReview = bootParams.get("review") === "1";
  const bootCapture = bootParams.get("capture") === "1";
  const bootEmbed = bootParams.get("embedPreview") === "1";
  const bootSample = bootParams.get("sample") || "";

  /* —— サンプル閲覧専用回路（虫眼鏡）。編集ライン・保存・入口に入らない —— */
  if (bootEmbed) {
    suppressSave = true;
    document.documentElement.classList.add("is-embed-preview", "is-embed-pending", "dash-boot-ready");
    document.body.classList.add("is-embed-preview", "is-embed-pending");
    hideEntryGate();
    setSampleFlowPreviewHidden(false);
    document.body.classList.remove("sample-flow-hide-preview");
    applyLayoutPattern(store.layoutPattern || "a", {
      silent: true,
      keepUnselected: true
    });
    if (typeof window.setPreviewWidthStepById === "function") {
      /* 虫眼鏡: 親の広い枠に合わせ実寸。狭いときだけ幅を落とし、縮小zoomは使わない */
      window.setPreviewWidthStepById("desktop");
    }
    applyLiveColors(false);
    if (bootSample && /^[0-9]{2}-[A-Za-z0-9_-]+$/.test(bootSample)) {
      fetch("sushi-samples/" + bootSample + "/draft.json?v=" + Date.now())
        .then(function (r) { return r.json(); })
        .then(function (draft) {
          suppressSave = true;
          Promise.resolve(applySushiSampleDraft(draft))
            .then(function () {
              applyLiveColors(true);
              applyAllConfirmed();
              if (draft.imagePaths) applyDraftImagePaths(draft.imagePaths);
              applyHeroImageOffState();
              syncPreviewHeaderChrome();
              suppressSave = true;
              if (typeof window.applyPreviewWidthFromPane === "function") {
                window.applyPreviewWidthFromPane();
              }
              document.documentElement.classList.remove("is-embed-pending");
              document.body.classList.remove("is-embed-pending");
              try {
                if (window.parent && window.parent !== window) {
                  window.parent.postMessage({ type: "sushi-embed-ready" }, "*");
                }
              } catch (e) { /* ignore */ }
            });
        })
        .catch(function () {
          document.documentElement.classList.remove("is-embed-pending");
          document.body.classList.remove("is-embed-pending");
          try {
            if (window.parent && window.parent !== window) {
              window.parent.postMessage({ type: "sushi-embed-ready" }, "*");
            }
          } catch (e2) { /* ignore */ }
        });
    } else {
      document.documentElement.classList.remove("is-embed-pending");
      document.body.classList.remove("is-embed-pending");
      try {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: "sushi-embed-ready" }, "*");
        }
      } catch (e3) { /* ignore */ }
    }
    return;
  }

  document.querySelectorAll('a[href*="help.html"]').forEach(function (link) {
    link.addEventListener("click", function (ev) {
      if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey || ev.button !== 0) return;
      saveDraft();
    });
  });

  loadDraft();
  ensureFontsConfirmedForMode();
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
  placeLookControls();
  restoreViewAfterMode();
  setupColorModeControls();
  setupEntryGate();
  paintEasyColorBars();
  openDraftNotice();

  document.documentElement.classList.add("dash-boot-ready");

  if (bootParams.get("lane") === "1") {
    window.clearTimeout(saveTimer);
    laneQueryHold = true;
    store.entryBranch = "sample";
    if (!store.saveMode) store.saveMode = "browser";
    const laneGate = document.getElementById("entry-gate");
    if (laneGate) {
      const branchRadio = laneGate.querySelector('input[name="entry_branch"][value="sample"]');
      if (branchRadio) branchRadio.checked = true;
      const saveRadio = laneGate.querySelector(
        'input[name="entry_save_mode"][value="' + store.saveMode + '"]'
      );
      if (saveRadio) saveRadio.checked = true;
    }
    showEntryGate("sushi");
  }

  if (bootReview) {
    document.documentElement.classList.add("is-review-mode");
    document.body.classList.add("is-review-mode");
    hideEntryGate();
    setSampleFlowPreviewHidden(false);
    document.body.classList.remove("sample-flow-hide-preview");
    if (typeof window.setPreviewWidthStepById === "function") {
      window.setPreviewWidthStepById("desktop");
    }
  } else if (bootCapture) {
    /* 旧 iframe レビュー／単体撮影用。同一文書 review では使わない */
    document.documentElement.classList.add("is-capture-mode");
    hideEntryGate();
    setSampleFlowPreviewHidden(false);
    if (typeof window.setPreviewWidthStepById === "function") {
      window.setPreviewWidthStepById("desktop");
    }
  }
})();
