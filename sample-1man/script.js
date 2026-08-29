(() => {
  const root = document.getElementById("preview-root");
  const viewport = document.getElementById("preview-viewport");
  const form = document.getElementById("order-form");
  if (!root || !form) return;

  const STORAGE_KEY = "sample-1man-order-v6";

  const STEPS = [
    { id: "guide", label: "はじめに", needsConfirm: true, num: 0 },
    { id: "global-preset", label: "プリセット", needsConfirm: true, num: 1 },
    { id: "global-bg", label: "背景", needsConfirm: true, num: 2 },
    { id: "global-chrome", label: "帯", needsConfirm: true, num: 3 },
    { id: "global-body", label: "本文", needsConfirm: true, num: 4 },
    { id: "global-accent", label: "アクセント", needsConfirm: true, num: 5 },
    { id: "global-card", label: "カード・角", needsConfirm: true, num: 6 },
    { id: "global-text", label: "ロゴ", needsConfirm: true, num: 7 },
    { id: "hero-color", label: "キャッチ色", needsConfirm: true, num: 8 },
    { id: "hero-content", label: "キャッチ文", needsConfirm: true, num: 9 },
    { id: "values-color", label: "下の枠色", needsConfirm: true, num: 10 },
    { id: "values-content", label: "下の枠", needsConfirm: true, num: 11 },
    { id: "about-content", label: "About", needsConfirm: true, num: 12 },
    { id: "works-content", label: "Works", needsConfirm: true, num: 13 },
    { id: "extra-content", label: "追加", needsConfirm: true, num: 14 },
    { id: "contact-color", label: "連絡色", needsConfirm: true, num: 15 },
    { id: "contact-content", label: "連絡文", needsConfirm: true, num: 16 },
    { id: "finish", label: "提出", needsConfirm: true, num: 17 }
  ];

  const TEXT_STEP_IDS = new Set([
    "global-text",
    "hero-content",
    "values-content",
    "about-content",
    "works-content",
    "extra-content",
    "contact-content",
    "finish"
  ]);

  const LAST_COLOR_STEP_ID = "contact-color";

  const BADGE_META = {
    "global-preset": { kind: "color", displayNum: 1, label: "プリセット" },
    "global-bg": { kind: "color", displayNum: 2, label: "背景" },
    "global-chrome": { kind: "color", displayNum: 3, label: "帯" },
    "global-body": { kind: "color", displayNum: 4, label: "本文色" },
    "global-accent": { kind: "color", displayNum: 5, label: "アクセント" },
    "global-card": { kind: "color", displayNum: 6, label: "カード" },
    "hero-color": { kind: "color", displayNum: 7, label: "キャッチ色" },
    "values-color": { kind: "color", displayNum: 8, label: "下の枠色" },
    "contact-color": { kind: "color", displayNum: 9, label: "連絡色" },
    "global-text": { kind: "text", displayNum: 1, label: "ロゴ" },
    "hero-content": { kind: "text", displayNum: 2, label: "キャッチ文" },
    "values-content": { kind: "text", displayNum: 3, label: "下の枠文" },
    "about-content": { kind: "text", displayNum: 4, label: "About" },
    "works-content": { kind: "text", displayNum: 5, label: "Works" },
    "extra-content": { kind: "text", displayNum: 6, label: "追加" },
    "contact-content": { kind: "text", displayNum: 7, label: "連絡文" },
    "finish": { kind: "text", displayNum: 8, label: "提出" }
  };

  function badgeDisplayName(stepId) {
    const meta = BADGE_META[stepId];
    if (!meta) return stepId;
    const prefix = meta.kind === "color" ? "色" : "文字";
    return prefix + meta.displayNum + "・" + meta.label;
  }

  function syncBadgeLabels() {
    root.querySelectorAll(".zone-badge[data-open-step]").forEach((btn) => {
      const stepId = btn.getAttribute("data-open-step");
      const meta = BADGE_META[stepId];
      if (!meta) return;
      btn.textContent = String(meta.displayNum);
      btn.classList.remove("badge-kind-color", "badge-kind-text");
      btn.classList.add(meta.kind === "color" ? "badge-kind-color" : "badge-kind-text");
      btn.setAttribute("aria-label", badgeDisplayName(stepId) + "を開く");
    });
  }

  const COLOR_STEP_FIELDS = {
    "global-preset": ["pageBg", "heroInk", "bodyInk", "chromeBg", "chromeInk", "accent", "cardBg", "valuesBg", "contactBg", "contactInk"],
    "global-bg": ["pageBg"],
    "global-chrome": ["chromeBg", "chromeInk"],
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
    "global-text": ["logo_image"],
    "hero-content": ["hero_image"],
    "about-content": ["about_image_1", "about_image_2", "about_image_3", "about_image_4"],
    "works-content": ["work_1_image", "work_2_image", "work_3_image"]
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

  const SWATCHES = {
    pageBg: ["#ffffff", "#f5efe4", "#e8f2e6", "#e2ecf4", "#f0dddd", "#2e3333"],
    heroInk: ["#ffffff", "#fff6e8", "#111111", "#1a4d8c", "#8b1e1e"],
    bodyInk: ["#ffffff", "#111111", "#1a4d8c", "#8b3a2a", "#c9a227"],
    chromeBg: ["#111111", "#2d6a36", "#1a4d8c", "#5c4033", "#ffffff"],
    chromeInk: ["#ffffff", "#f5f5f5", "#111111", "#fff6e8", "#c9a227"],
    accent: ["#3d8a48", "#1a4d8c", "#c45c26", "#8b1e1e", "#c9a227"],
    cardBg: ["#ffffff", "#f7f7f5", "#1f2424", "#eef5ec", "#fff8ee"],
    valuesBg: ["#ffffff", "#f7f7f5", "#e8f2e6", "#e2ecf4", "#fff8ee", "#1f2424"],
    contactBg: ["#2d6a36", "#1a4d8c", "#5c4033", "#111111", "#8b3a2a"],
    contactInk: ["#f4fff6", "#ffffff", "#fff6e8", "#111111"]
  };

  const DEFAULTS = {
    pageBg: "#e8f2e6",
    pageBgSoft: "#d2e6ce",
    heroInk: "#111111",
    bodyInk: "#333333",
    bodyMuted: "#555555",
    chromeBg: "#111111",
    chromeInk: "#f5f5f5",
    accent: "#3d8a48",
    cardBg: "#ffffff",
    valuesBg: "#ffffff",
    contactBg: "#2d6a36",
    contactInk: "#f4fff6",
    radius: "0.6rem",
    headingScale: "1"
  };

  const PRESETS = {
    green: {
      pageBg: "#e8f2e6",
      pageBgSoft: "#d2e6ce",
      heroInk: "#111111",
      bodyInk: "#333333",
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
      bodyInk: "#1a1a1a",
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
      bodyInk: "#3b2a1a",
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
      pageBg: "#e2ecf4",
      pageBgSoft: "#c8dceb",
      heroInk: "#0b2c4a",
      bodyInk: "#0b2c4a",
      bodyMuted: "#3a5a74",
      chromeBg: "#0b2c4a",
      chromeInk: "#e8f4ff",
      accent: "#2a7ab0",
      cardBg: "#ffffff",
      valuesBg: "#ffffff",
      contactBg: "#0b2c4a",
      contactInk: "#e8f4ff"
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
    "Yuji Syuku"
  ];

  const PAINT_BOARD = [
    "#ffffff", "#f5f5f5", "#e0e0e0", "#9e9e9e", "#616161", "#212121", "#000000",
    "#ffebee", "#ffcdd2", "#e53935", "#b71c1c", "#fce4ec", "#ec407a", "#880e4f",
    "#f3e5f5", "#ce93d8", "#8e24aa", "#4a148c", "#e8eaf6", "#5c6bc0", "#1a237e",
    "#e3f2fd", "#64b5f6", "#1e88e5", "#0d47a1", "#e0f7fa", "#26c6da", "#006064",
    "#e8f5e9", "#81c784", "#43a047", "#1b5e20", "#f1f8e9", "#aed581", "#33691e",
    "#fffde7", "#fff176", "#fdd835", "#f9a825", "#fff3e0", "#ffb74d", "#e65100",
    "#efebe9", "#a1887f", "#6d4c41", "#3e2723", "#eceff1", "#90a4ae", "#37474f",
    "#e8f2e6", "#cfe0ca", "#7cb87a", "#2d6a36", "#f5efe4", "#e8dcc8", "#5c4033",
    "#e2ecf4", "#6a9ec4", "#0b2c4a", "#f0dddd", "#c48a8a", "#8b3a2a", "#c9a227"
  ];

  const PAINT_POTS = [
    { hex: "#e53935", label: "赤" },
    { hex: "#1e88e5", label: "青" },
    { hex: "#fdd835", label: "黄" },
    { hex: "#ffffff", label: "白" },
    { hex: "#111111", label: "黒" }
  ];

  const SCOPE_NAMES = [
    "scope_layout_fixed",
    "scope_no_copy",
    "scope_no_form",
    "scope_update"
  ];

  const STEP_FIELD_RESET = {
    "global-text": {
      texts: ["brand_name", "font_other_note"],
      fonts: { font_display: "Shippori Mincho", font_body: "Zen Kaku Gothic New" },
      files: ["logo_image"]
    },
    "hero-content": {
      texts: ["hero_title", "hero_lead_1", "hero_lead_2", "hero_lead_3"],
      fonts: { font_catch: "Shippori Mincho" },
      counts: { "hero-leads": COUNT_META["hero-leads"] ? COUNT_META["hero-leads"].defaultCount : 2 },
      files: ["hero_image"]
    },
    "values-content": {
      texts: ["value_1_title", "value_1_text", "value_2_title", "value_2_text", "value_3_title", "value_3_text"],
      counts: { "hero-values": COUNT_META["hero-values"] ? COUNT_META["hero-values"].defaultCount : 3 }
    },
    "about-content": {
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
      fonts: { font_about: "Zen Kaku Gothic New" },
      counts: {
        "about-accordions": COUNT_META["about-accordions"] ? COUNT_META["about-accordions"].defaultCount : 1,
        "about-photos": COUNT_META["about-photos"] ? COUNT_META["about-photos"].defaultCount : 2
      },
      files: ["about_image_1", "about_image_2", "about_image_3", "about_image_4"]
    },
    "works-content": {
      texts: [
        "works_section_name",
        "works_heading",
        "works_lead",
        "work_1_title",
        "work_1_text",
        "work_2_title",
        "work_2_text",
        "work_3_title",
        "work_3_text"
      ],
      fonts: { font_works: "Zen Kaku Gothic New" },
      counts: { "works-list": COUNT_META["works-list"] ? COUNT_META["works-list"].defaultCount : 2 },
      files: ["work_1_image", "work_2_image", "work_3_image"]
    },
    "extra-content": {
      texts: ["hours_text", "access_text", "sns_1", "sns_2", "sns_3"],
      extrasReset: true
    },
    "contact-content": {
      texts: ["contact_section_name", "contact_label", "contact_email", "contact_note_1", "contact_note_2"]
    },
    finish: {
      texts: ["ref_url", "avoid_mood", "due_date", "contact_method"],
      uncheck: SCOPE_NAMES
    },
    guide: {}
  };

  const imageUrls = {};
  const IMAGE_DEFAULTS = {};

  const previewDefaults = capturePreviewDefaults();

  const store = {
    draftColors: { ...DEFAULTS },
    draftCounts: Object.fromEntries(
      COUNT_IDS.map((id) => [id, COUNT_META[id] ? COUNT_META[id].defaultCount : 1])
    ),
    draftExtras: { hours: false, access: false, map: false, snsCount: 0 },
    confirmed: Object.fromEntries(STEP_IDS.map((id) => [id, false])),
    snapshots: {},
    wizardStepIndex: 0,
    uiMode: null,
    presetChosen: false,
    chosenPresetKey: null,
    randomHistory: []
  };

  let saveTimer = null;
  let suppressSave = false;

  function stackFor(value) {
    if (!value) return "'Zen Kaku Gothic New', sans-serif";
    return "'" + value + "', sans-serif";
  }

  function fillFontSelects() {
    document.querySelectorAll("[data-font-select]").forEach((sel) => {
      const def = sel.getAttribute("data-font-default") || FONT_OPTIONS[0];
      const current = sel.value;
      sel.innerHTML = "";
      FONT_OPTIONS.forEach((name) => {
        const opt = document.createElement("option");
        opt.value = name;
        opt.textContent = name;
        sel.appendChild(opt);
      });
      sel.value = current && FONT_OPTIONS.includes(current) ? current : def;
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

  function applyImageSlot(name, selectorOrFn, active) {
    const el = typeof selectorOrFn === "string" ? root.querySelector(selectorOrFn) : selectorOrFn();
    if (!el) return;
    if (active && imageUrls[name]) {
      el.src = imageUrls[name];
      if (name === "logo_image") {
        el.hidden = false;
        const text = document.getElementById("preview-logo-text");
        if (text) text.hidden = true;
      }
    } else {
      if (name === "logo_image") {
        el.hidden = true;
        el.removeAttribute("src");
        const text = document.getElementById("preview-logo-text");
        if (text) text.hidden = false;
      } else if (IMAGE_DEFAULTS[name]) {
        el.src = IMAGE_DEFAULTS[name];
      }
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
        if (name === "logo_image") {
          applyImageSlot(name, "#preview-logo-img", true);
        } else if (name === "hero_image") {
          applyImageSlot(name, ".hero-photo", true);
        } else if (name.startsWith("about_image_")) {
          const n = Number(name.replace("about_image_", ""));
          applyImageSlot(name, () => root.querySelectorAll("#about-photos .skill-card-img")[n - 1], true);
        } else if (/^work_\d+_image$/.test(name)) {
          const n = Number(name.match(/^work_(\d+)_image$/)[1]);
          applyImageSlot(name, () => root.querySelectorAll("#works-list .work-thumb")[n - 1], true);
        }
      });
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

  function luminance(hex) {
    const n = hex.replace("#", "");
    const full = n.length === 3 ? n.split("").map((c) => c + c).join("") : n;
    const r = parseInt(full.slice(0, 2), 16) / 255;
    const g = parseInt(full.slice(2, 4), 16) / 255;
    const b = parseInt(full.slice(4, 6), 16) / 255;
    const f = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  }

  function contrastRatio(a, b) {
    const l1 = luminance(a);
    const l2 = luminance(b);
    const light = Math.max(l1, l2);
    const dark = Math.min(l1, l2);
    return (light + 0.05) / (dark + 0.05);
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
    const t = amount;
    const m = (i) => Math.round(A[i] * (1 - t) + B[i] * t);
    const h = (c) => c.toString(16).padStart(2, "0");
    return "#" + h(m(0)) + h(m(1)) + h(m(2));
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
        body: "Zen Kaku Gothic New",
        catch: "Shippori Mincho",
        about: "Zen Kaku Gothic New",
        works: "Zen Kaku Gothic New"
      },
      extras: { hours: false, access: false, map: false, snsCount: 0 },
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
        aboutLabel: (document.getElementById("about-label") || {}).textContent || "About",
        aboutHeading: (document.getElementById("about-heading") || {}).textContent || "Sample",
        worksLabel: (document.getElementById("works-label") || {}).textContent || "Works",
        worksHeading: (document.getElementById("works-heading") || {}).textContent || "見本カード",
        worksLead: (document.getElementById("works-lead") || {}).textContent || "",
        contactLabel: (document.getElementById("contact-label") || {}).textContent || "Contact",
        contactHeading: (document.getElementById("contact-heading") || {}).textContent || "ご連絡",
        snsLabels: []
      }
    };
  }

  function updateFontPreview() {
    const preview = document.getElementById("font-preview");
    if (!preview) return;
    const display = fieldValue("font_display") || fieldValue("font_catch") || FONT_OPTIONS[0];
    preview.style.fontFamily = stackFor(display);
    preview.textContent = "書体プレビュー：あいうえお サンプル工房";
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
    const snap = { colors: colors };
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

    const current = STEPS[store.wizardStepIndex];
    if (current && COLOR_STEP_FIELDS[current.id]) {
      COLOR_STEP_FIELDS[current.id].forEach((key) => {
        if (store.draftColors[key] != null) colors[key] = store.draftColors[key];
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
    return colors;
  }

  function markPresetChosen(key) {
    store.presetChosen = true;
    store.chosenPresetKey = key;
    document.querySelectorAll("[data-preset]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.getAttribute("data-preset") === key);
    });
    const randomBtn = document.getElementById("btn-random");
    if (randomBtn) randomBtn.classList.remove("is-active");
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
    markPresetChosen("random");
    refreshColorUi();
    applyLiveColors(true);
    scheduleSave();
  }

  function validateWizardStep(stepId) {
    if (stepId === "guide" && !readUiModeFromForm()) {
      const status = document.getElementById("wizard-status");
      if (status) status.textContent = "ガイドかセルフを選んでから「次へ」";
      return false;
    }
    if (stepId === "finish" && !validateFinish()) {
      const status = document.getElementById("wizard-status");
      if (status) status.textContent = "範囲の確認（4項目）にチェックしてください。";
      return false;
    }
    return true;
  }

  function stepDisplayLabel(step) {
    if (!step) return "";
    return step.num + ". " + step.label;
  }

  function showWizardStep(index) {
    const idx = Math.max(0, Math.min(STEPS.length - 1, index));
    store.wizardStepIndex = idx;
    const step = STEPS[idx];
    const block = form.querySelector('.dash-block[data-step-id="' + step.id + '"]');
    if (!block) return;

    switchToDashTab();

    if (store.uiMode === "self") {
      form.querySelectorAll(":scope > details.dash-block").forEach((d) => {
        const active = d === block;
        d.classList.toggle("is-active-step", active);
        d.classList.remove("is-wizard-active");
      });
      block.open = true;
      const dashBody = document.querySelector(".dash-body");
      if (dashBody) {
        const blockTop = block.offsetTop;
        dashBody.scrollTo({ top: Math.max(0, blockTop - 12), behavior: "smooth" });
      }
    } else {
      form.querySelectorAll(":scope > details.dash-block").forEach((d) => {
        const active = d === block;
        d.open = active;
        d.classList.toggle("is-wizard-active", active);
        d.classList.toggle("is-active-step", active);
      });
    }

    updateWizardUi();
    applyLiveColors(false);
    applyAllConfirmed();

    if (step.id !== "guide") {
      const sel = block.getAttribute("data-preview-target");
      if (sel) window.setTimeout(() => scrollPreviewTo(sel), 50);
      const hit = root.querySelector('[data-open-step="' + step.id + '"].preview-hit') ||
        root.querySelector('.preview-hit[data-open-step="' + step.id + '"]');
      if (hit) {
        hit.classList.add("is-target-flash");
        window.setTimeout(() => hit.classList.remove("is-target-flash"), 600);
      }
    }
    scheduleSave();
  }

  function applyUiMode() {
    const flow = document.getElementById("make-flow");
    const wizardNav = document.getElementById("wizard-nav");
    const wizardTop = document.getElementById("wizard-top");

    document.body.classList.remove("mode-guided", "mode-self", "wizard-mode");

    if (store.uiMode === "guided") {
      document.body.classList.add("mode-guided", "wizard-mode");
      if (flow) flow.hidden = true;
      if (wizardNav) wizardNav.hidden = false;
      if (wizardTop) wizardTop.hidden = false;
    } else if (store.uiMode === "self") {
      document.body.classList.add("mode-self");
      if (flow) flow.hidden = false;
      if (wizardNav) wizardNav.hidden = false;
      if (wizardTop) wizardTop.hidden = false;
      form.querySelectorAll(":scope > details.dash-block").forEach((d) => {
        d.classList.remove("is-wizard-active");
      });
    } else {
      document.body.classList.add("wizard-mode");
      if (flow) flow.hidden = true;
      if (wizardNav) wizardNav.hidden = false;
      if (wizardTop) wizardTop.hidden = false;
    }

    form.querySelectorAll(":scope > details.dash-block[data-step-id]").forEach((d) => {
      const id = d.getAttribute("data-step-id");
      d.classList.toggle("is-text-chapter", TEXT_STEP_IDS.has(id));
    });

    syncBadgeLabels();
    updateZoneBadgeDoneState();
  }

  function readUiModeFromForm() {
    const picked = form.querySelector('input[name="ui_mode"]:checked');
    return picked ? picked.value : null;
  }

  function restartFromModeSelection() {
    hideWizardFootPanel();
    store.uiMode = null;
    form.querySelectorAll('input[name="ui_mode"]').forEach((r) => {
      r.checked = false;
    });
    if (store.confirmed.guide) {
      unconfirmStep("guide");
    }
    applyUiMode();
    showWizardStep(0);
    const status = document.getElementById("wizard-status");
    if (status) status.textContent = "作り方を選び直してください。";
    scheduleSave();
  }

  function showChapterBoundaryPanel(onProceed) {
    const dock = document.getElementById("wizard-foot-dock");
    if (dock) dock.classList.add("is-chapter-boundary");
    showWizardFootPanel(
      "<p class=\"wizard-foot-panel-text\">色の章が終わりました。文字・画像の章に進みます。</p>" +
      "<p class=\"wizard-foot-panel-note\">内容はセルフと同じ項目を、1問ずつ大きめの文字で進めます。</p>" +
      "<div class=\"wizard-foot-panel-actions\">" +
      "<button type=\"button\" class=\"wizard-btn\" data-chapter-restart>モード選択からやり直す</button>" +
      "<button type=\"button\" class=\"wizard-btn\" data-chapter-go>進む</button>" +
      "</div>"
    );
    const panel = document.getElementById("wizard-foot-panel");
    if (!panel) return;
    const restart = panel.querySelector("[data-chapter-restart]");
    const go = panel.querySelector("[data-chapter-go]");
    if (restart) {
      restart.addEventListener("click", () => {
        restartFromModeSelection();
      }, { once: true });
    }
    if (go) {
      go.addEventListener("click", () => {
        hideWizardFootPanel();
        if (typeof onProceed === "function") onProceed();
      }, { once: true });
    }
  }

  function updateWizardUi() {
    const step = STEPS[store.wizardStepIndex];
    const progress = document.getElementById("wizard-progress");
    const backBtn = document.getElementById("wizard-back");
    const nextBtn = document.getElementById("wizard-next");
    const status = document.getElementById("wizard-status");
    if (progress && step) progress.textContent = step.num + " / 17 · " + step.label;
    if (backBtn) backBtn.disabled = store.wizardStepIndex <= 0;
    if (nextBtn) {
      nextBtn.textContent = step && step.id === "finish" ? "提出を確定" : "次へ";
      nextBtn.hidden = false;
    }
    if (status && step && step.id !== "global-preset") {
      /* keep validation message until next action */
    }
    updatePreviewGuideBtn();
    updateZoneBadgeDoneState();
  }

  function updatePreviewGuideBtn() {
    const btn = document.getElementById("preview-guide-btn");
    if (!btn) return;
    const step = STEPS[store.wizardStepIndex];
    btn.classList.toggle("is-step-current", !!(step && step.id === "guide"));
    btn.classList.toggle("is-step-done", !!store.confirmed.guide);
  }

  function updateZoneBadgeDoneState() {
    root.querySelectorAll(".zone-badge[data-open-step]").forEach((btn) => {
      const stepId = btn.getAttribute("data-open-step");
      btn.classList.toggle("is-step-done", !!store.confirmed[stepId]);
      btn.classList.toggle("is-step-current", STEPS[store.wizardStepIndex] && STEPS[store.wizardStepIndex].id === stepId);
    });
    syncBadgeLabels();
  }

  function wizardConfirmCurrentStep() {
    const step = STEPS[store.wizardStepIndex];
    if (!step) return false;
    if (!validateWizardStep(step.id)) return false;

    if (step.id === "guide") {
      const mode = readUiModeFromForm();
      if (!mode) return false;
      store.uiMode = mode;
      applyUiMode();
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
    const step = STEPS[store.wizardStepIndex];
    if (!step) return;
    if (!wizardConfirmCurrentStep()) return;
    if (store.wizardStepIndex >= STEPS.length - 1) {
      updateWizardUi();
      return;
    }
    const nextIndex = store.wizardStepIndex + 1;
    if (store.uiMode === "guided" && step.id === LAST_COLOR_STEP_ID) {
      showChapterBoundaryPanel(() => showWizardStep(nextIndex));
      return;
    }
    showWizardStep(nextIndex);
  }

  function wizardBack() {
    const step = STEPS[store.wizardStepIndex];
    if (!step || store.wizardStepIndex <= 0) return;
    if (store.confirmed[step.id]) {
      unconfirmStep(step.id);
    }
    showWizardStep(store.wizardStepIndex - 1);
    const status = document.getElementById("wizard-status");
    if (status) status.textContent = "前のステップに戻りました。";
  }

  function hideWizardFootPanel() {
    const dock = document.getElementById("wizard-foot-dock");
    if (dock) dock.classList.remove("is-chapter-boundary");
    const panel = document.getElementById("wizard-foot-panel");
    if (panel) {
      panel.hidden = true;
      panel.innerHTML = "";
    }
  }

  function showWizardFootPanel(html) {
    const panel = document.getElementById("wizard-foot-panel");
    if (!panel) return;
    panel.innerHTML = html;
    panel.hidden = false;
  }

  function resetAllDraft() {
    showWizardFootPanel(
      "<p class=\"wizard-foot-panel-text\">下書きを消して、はじめにからやり直します。元に戻せません。</p>" +
      "<div class=\"wizard-foot-panel-actions\">" +
      "<button type=\"button\" class=\"wizard-btn\" data-reset-cancel>キャンセル</button>" +
      "<button type=\"button\" class=\"wizard-btn\" data-reset-ok>消してやり直す</button>" +
      "</div>"
    );
    const panel = document.getElementById("wizard-foot-panel");
    if (!panel) return;
    const cancel = panel.querySelector("[data-reset-cancel]");
    const ok = panel.querySelector("[data-reset-ok]");
    if (cancel) cancel.addEventListener("click", hideWizardFootPanel, { once: true });
    if (ok) {
      ok.addEventListener("click", () => {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch (e) {
          /* ignore */
        }
        location.reload();
      }, { once: true });
    }
  }

  function setupWizard() {
    const backBtn = document.getElementById("wizard-back");
    const nextBtn = document.getElementById("wizard-next");
    if (backBtn) backBtn.addEventListener("click", wizardBack);
    if (nextBtn) nextBtn.addEventListener("click", wizardNext);
    const resetDraftBtn = document.getElementById("btn-reset-draft");
    if (resetDraftBtn) resetDraftBtn.addEventListener("click", resetAllDraft);
    form.querySelectorAll('input[name="ui_mode"]').forEach((radio) => {
      radio.addEventListener("change", () => {
        store.uiMode = readUiModeFromForm();
        scheduleSave();
      });
    });
    updateRandomUndoUi();
  }

  function resolveWizardStepIndex() {
    if (Number.isInteger(store.wizardStepIndex) && store.wizardStepIndex >= 0) {
      return Math.min(store.wizardStepIndex, STEPS.length - 1);
    }
    const firstOpen = STEPS.findIndex((s) => !store.confirmed[s.id]);
    return firstOpen >= 0 ? firstOpen : STEPS.length - 1;
  }

  function setDraftColor(key, value) {
    store.draftColors[key] = value;
    if (key === "pageBg") store.draftColors.pageBgSoft = softFrom(value);
    if (key === "bodyInk") store.draftColors.bodyMuted = softMuted(value);
    refreshColorUi();
    applyLiveColors(true);
    scheduleSave();
  }

  function applyLiveColors(flash) {
    const colors = getEffectiveColors();
    colors.radius = fieldValue("radius") || colors.radius || DEFAULTS.radius;
    applyColorsToRoot(colors);
    let headingScale = DEFAULTS.headingScale;
    if (store.confirmed["hero-color"] && store.snapshots["hero-color"] && store.snapshots["hero-color"].headingScale) {
      headingScale = store.snapshots["hero-color"].headingScale;
    }
    const current = STEPS[store.wizardStepIndex];
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
    document.querySelectorAll("[data-swatches]").forEach((row) => {
      const key = row.getAttribute("data-swatches");
      row.querySelectorAll(".swatch").forEach((btn) => {
        btn.classList.toggle("is-active", norm(btn.dataset.color) === norm(store.draftColors[key]));
      });
    });
    document.querySelectorAll("[data-picker]").forEach((input) => {
      const key = input.getAttribute("data-picker");
      if (store.draftColors[key]) input.value = toColorInput(store.draftColors[key]);
    });
    document.querySelectorAll(".color-field").forEach((field) => {
      const key = field.getAttribute("data-color-key");
      const chip = field.querySelector("[data-detail-current]");
      if (chip && store.draftColors[key]) chip.style.setProperty("--sw", store.draftColors[key]);
    });
  }

  function buildSwatches() {
    Object.keys(SWATCHES).forEach((key) => {
      const row = document.querySelector('[data-swatches="' + key + '"]');
      if (!row) return;
      row.innerHTML = "";
      SWATCHES[key].forEach((color) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "swatch";
        btn.dataset.color = color;
        btn.title = color;
        btn.style.setProperty("--sw", color);
        if (color.toLowerCase() === "#ffffff") btn.style.border = "1px solid #bbb";
        btn.addEventListener("click", () => setDraftColor(key, color));
        row.appendChild(btn);
      });
    });
  }

  function buildColorDetail(field) {
    const key = field.getAttribute("data-color-key");
    const detail = field.querySelector(".color-detail");
    if (!detail || detail.dataset.ready === "1") return;
    detail.dataset.ready = "1";

    const current = document.createElement("div");
    current.className = "detail-current";
    current.innerHTML = '<span class="dock-label">選択中</span><span class="current-paint" data-detail-current></span>';
    detail.appendChild(current);

    const board = document.createElement("div");
    board.className = "paint-board mini-paint-board";
    board.setAttribute("aria-label", "カラーボード");
    PAINT_BOARD.forEach((hex) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "paint-chip";
      btn.title = hex;
      btn.style.setProperty("--sw", hex);
      if (hex.toLowerCase() === "#ffffff") btn.style.border = "1px solid #bbb";
      btn.addEventListener("click", () => setDraftColor(key, hex));
      board.appendChild(btn);
    });
    detail.appendChild(board);

    const potsWrap = document.createElement("div");
    potsWrap.className = "paint-pots";
    let mixColor = null;
    let mixCount = 0;
    const mixRow = document.createElement("div");
    mixRow.className = "mix-row";
    const mixSwatch = document.createElement("div");
    mixSwatch.className = "mix-swatch";
    mixSwatch.style.setProperty("--sw", "#dddddd");
    const mixCaption = document.createElement("span");
    mixCaption.className = "mix-caption";
    mixCaption.textContent = "つぼを押して混ぜられます";
    const mixReset = document.createElement("button");
    mixReset.type = "button";
    mixReset.className = "btn-ghost-dash";
    mixReset.textContent = "混ぜ直し";
    mixReset.addEventListener("click", () => {
      mixColor = null;
      mixCount = 0;
      mixSwatch.style.setProperty("--sw", "#dddddd");
      mixCaption.textContent = "つぼを押して混ぜられます";
    });

    PAINT_POTS.forEach((pot) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "paint-pot";
      btn.style.setProperty("--sw", pot.hex);
      if (pot.hex.toLowerCase() === "#ffffff") btn.style.border = "1px solid #bbb";
      btn.innerHTML = "<span>" + pot.label + "</span>";
      btn.addEventListener("click", () => {
        if (!mixColor) {
          mixColor = pot.hex;
          mixCount = 1;
          mixCaption.textContent = pot.label + "から開始。別のつぼで混ぜます";
        } else {
          mixColor = mixHex(mixColor, pot.hex, 0.45);
          mixCount += 1;
          mixCaption.textContent = mixCount + "回混ぜた色";
        }
        mixSwatch.style.setProperty("--sw", mixColor);
        setDraftColor(key, mixColor);
      });
      potsWrap.appendChild(btn);
    });
    detail.appendChild(potsWrap);
    mixRow.appendChild(mixSwatch);
    mixRow.appendChild(mixCaption);
    mixRow.appendChild(mixReset);
    detail.appendChild(mixRow);

    const pickerLabel = document.createElement("label");
    pickerLabel.className = "other-color";
    pickerLabel.innerHTML = 'その他／スポイト <input type="color" data-picker="' + key + '" value="' + toColorInput(store.draftColors[key] || DEFAULTS[key]) + '">';
    const picker = pickerLabel.querySelector("input");
    picker.addEventListener("input", () => setDraftColor(key, picker.value));
    detail.appendChild(pickerLabel);

    const note = document.createElement("p");
    note.className = "dash-note";
    note.textContent = "ご利用環境によっては、スポイト（画面から色を吸う機能）が使えないことがあります。";
    detail.appendChild(note);

    const back = document.createElement("button");
    back.type = "button";
    back.className = "btn-ghost-dash";
    back.setAttribute("data-color-mode", "simple");
    back.textContent = "シンプルに戻す";
    detail.appendChild(back);
  }

  function setupColorModes() {
    document.querySelectorAll(".color-field").forEach((field) => {
      buildColorDetail(field);
      field.addEventListener("click", (ev) => {
        const btn = ev.target.closest("[data-color-mode]");
        if (!btn || !field.contains(btn)) return;
        const mode = btn.getAttribute("data-color-mode");
        const simple = field.querySelector(".color-simple");
        const detail = field.querySelector(".color-detail");
        if (!simple || !detail) return;
        if (mode === "detail") {
          simple.hidden = true;
          detail.hidden = false;
        } else {
          detail.hidden = true;
          simple.hidden = false;
        }
      });
    });
  }

  function syncFillFields() {
    document.querySelectorAll("[data-fill-for]").forEach((el) => {
      const id = el.getAttribute("data-fill-for");
      const at = Number(el.getAttribute("data-fill-at") || "1");
      const count = Number(store.draftCounts[id] || 0);
      el.hidden = !(count >= at);
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

  function syncSnsFields() {
    const n = Number((document.getElementById("sns-count") || {}).value || store.draftExtras.snsCount || 0);
    store.draftExtras.snsCount = n;
    document.querySelectorAll("[data-sns-for]").forEach((el) => {
      const at = Number(el.getAttribute("data-sns-for") || "0");
      el.hidden = !(n >= at);
    });
  }

  function setupExtrasDraft() {
    document.querySelectorAll("[data-extra-toggle]").forEach((input) => {
      input.addEventListener("change", () => {
        const key = input.getAttribute("data-extra-toggle");
        store.draftExtras[key] = !!input.checked;
        scheduleSave();
      });
    });
    const snsCount = document.getElementById("sns-count");
    if (snsCount) {
      snsCount.addEventListener("change", () => {
        syncSnsFields();
        scheduleSave();
      });
    }
    syncSnsFields();
  }

  function setupPresets() {
    document.querySelectorAll("[data-preset]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const preset = PRESETS[btn.getAttribute("data-preset")];
        if (!preset) return;
        Object.assign(store.draftColors, preset);
        store.draftColors.pageBgSoft = softFrom(store.draftColors.pageBg);
        store.draftColors.bodyMuted = softMuted(store.draftColors.bodyInk);
        markPresetChosen(btn.getAttribute("data-preset"));
        refreshColorUi();
        applyLiveColors(true);
        scheduleSave();
      });
    });
    const randomBtn = document.getElementById("btn-random");
    if (randomBtn) {
      randomBtn.addEventListener("click", () => {
        pushRandomHistory();
        const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
        Object.keys(SWATCHES).forEach((key) => {
          store.draftColors[key] = pick(SWATCHES[key]);
        });
        store.draftColors.pageBgSoft = softFrom(store.draftColors.pageBg);
        store.draftColors.bodyMuted = softMuted(store.draftColors.bodyInk);
        markPresetChosen("random");
        refreshColorUi();
        applyLiveColors(true);
        scheduleSave();
      });
    }
    const undo1 = document.getElementById("btn-random-undo-1");
    const undo2 = document.getElementById("btn-random-undo-2");
    if (undo1) undo1.addEventListener("click", () => restoreRandomHistory(0));
    if (undo2) undo2.addEventListener("click", () => restoreRandomHistory(1));
    const resetBtn = document.getElementById("btn-reset");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        Object.assign(store.draftColors, DEFAULTS);
        store.draftColors.pageBgSoft = softFrom(store.draftColors.pageBg);
        store.draftColors.bodyMuted = softMuted(store.draftColors.bodyInk);
        markPresetChosen("default");
        refreshColorUi();
        applyLiveColors(true);
        scheduleSave();
      });
    }
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
    const body = stackFor(f.body || "Zen Kaku Gothic New");
    const catchFont = stackFor(f.catch || f.display || "Shippori Mincho");
    const aboutFont = stackFor(f.about || f.body || "Zen Kaku Gothic New");
    const worksFont = stackFor(f.works || f.body || "Zen Kaku Gothic New");
    root.style.setProperty("--font-display", display);
    root.style.setProperty("--font-body", body);
    root.style.setProperty("--font-catch", catchFont);
    root.style.setProperty("--font-about", aboutFont);
    root.style.setProperty("--font-works", worksFont);
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
    const logo = document.getElementById("preview-logo-text");
    if (logo) logo.textContent = t.logo;
    const heroTitle = document.getElementById("hero-title");
    if (heroTitle) heroTitle.textContent = t.heroTitle;
    document.querySelectorAll("#hero-leads [data-sample-item]").forEach((el, i) => {
      el.textContent = t.leads[i] || "";
    });
    document.querySelectorAll("#hero-values [data-sample-item]").forEach((li, i) => {
      const title = li.querySelector(".hero-value-title");
      const text = li.querySelector("p:last-child");
      if (title) title.textContent = (t.values[i] || {}).title || "";
      if (text) text.textContent = (t.values[i] || {}).text || "";
    });
    applyFilledText(document.getElementById("about-label"), "", t.aboutLabel);
    applyFilledText(document.getElementById("nav-about"), "", t.aboutLabel);
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
    applyFilledText(document.getElementById("nav-works"), "", t.worksLabel);
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
    applyFilledText(document.getElementById("nav-contact"), "", t.contactHeading);
    const contactLeads = document.querySelectorAll("#contact .contact-band-lead");
    contactLeads.forEach((el, i) => {
      el.textContent = t.contactLeads[i] || "";
    });
    const mail = document.querySelector("#contact .sample-mail");
    if (mail) mail.textContent = t.contactMail;
  }

  function applyExtrasToPreview(extras) {
    const e = extras || { hours: false, access: false, map: false, snsCount: 0 };
    ["hours", "access", "map"].forEach((key) => {
      const section = document.querySelector('[data-extra="' + key + '"]');
      if (section) section.hidden = !e[key];
    });
    const n = Number(e.snsCount || 0);
    const snsSection = document.querySelector('[data-extra="sns"]');
    const snsList = document.getElementById("sns-list");
    if (snsSection) snsSection.hidden = n <= 0;
    if (snsList) {
      snsList.innerHTML = "";
      for (let i = 1; i <= n; i += 1) {
        const li = document.createElement("li");
        const url = fieldValue("sns_" + i);
        li.textContent = url || ("SNSリンク" + i + "（見本）");
        snsList.appendChild(li);
      }
    }
  }

  function applySnapshot(stepId, snap) {
    if (!snap) return;
    if (stepId === "global-text" && snap.fields) {
      const logo = document.getElementById("preview-logo-text");
      if (logo && snap.fields.brand_name != null && String(snap.fields.brand_name).trim() !== "") {
        logo.textContent = snap.fields.brand_name;
      }
    }
    if (stepId === "hero-content" && snap.fields) {
      const heroTitle = document.getElementById("hero-title");
      if (heroTitle && snap.fields.hero_title != null && String(snap.fields.hero_title).trim() !== "") {
        heroTitle.textContent = snap.fields.hero_title;
      }
      document.querySelectorAll("#hero-leads [data-sample-item]").forEach((el, i) => {
        const key = "hero_lead_" + (i + 1);
        if (snap.fields[key] != null && String(snap.fields[key]).trim() !== "") {
          el.textContent = snap.fields[key];
        }
      });
    }
    if (stepId === "values-content" && snap.fields) {
      document.querySelectorAll("#hero-values [data-sample-item]").forEach((li, i) => {
        const n = i + 1;
        const title = li.querySelector(".hero-value-title");
        const text = li.querySelector("p:last-child");
        const titleKey = "value_" + n + "_title";
        const textKey = "value_" + n + "_text";
        if (title && snap.fields[titleKey] != null && String(snap.fields[titleKey]).trim() !== "") {
          title.textContent = snap.fields[titleKey];
        }
        if (text && snap.fields[textKey] != null && String(snap.fields[textKey]).trim() !== "") {
          text.textContent = snap.fields[textKey];
        }
      });
    }
    if (stepId === "about-content" && snap.fields) {
      const t = previewDefaults.text;
      applyFilledText(document.getElementById("about-label"), snap.fields.about_section_name, t.aboutLabel);
      applyFilledText(document.getElementById("nav-about"), snap.fields.about_section_name, t.aboutLabel);
      applyFilledText(document.getElementById("about-heading"), snap.fields.about_heading, t.aboutHeading);
      const aboutName = document.querySelector("#about .profile-name");
      const aboutLead = document.querySelector("#about .section-lead");
      if (aboutName && snap.fields.about_name != null && String(snap.fields.about_name).trim() !== "") {
        aboutName.textContent = snap.fields.about_name;
      }
      if (aboutLead && snap.fields.about_lead != null && String(snap.fields.about_lead).trim() !== "") {
        aboutLead.textContent = snap.fields.about_lead;
      }
      document.querySelectorAll("#about-accordions [data-sample-item]").forEach((el, i) => {
        const n = i + 1;
        const summary = el.querySelector("summary");
        const titleKey = "acc_" + n + "_title";
        const bodyKey = "acc_" + n + "_body";
        if (summary && snap.fields[titleKey] != null && String(snap.fields[titleKey]).trim() !== "") {
          summary.textContent = snap.fields[titleKey];
        }
        if (snap.fields[bodyKey] != null && String(snap.fields[bodyKey]).trim() !== "") {
          setAccordionBody(el, snap.fields[bodyKey]);
        }
      });
    }
    if (stepId === "works-content" && snap.fields) {
      const t = previewDefaults.text;
      applyFilledText(document.getElementById("works-label"), snap.fields.works_section_name, t.worksLabel);
      applyFilledText(document.getElementById("nav-works"), snap.fields.works_section_name, t.worksLabel);
      applyFilledText(document.getElementById("works-heading"), snap.fields.works_heading, t.worksHeading);
      applyFilledText(document.getElementById("works-lead"), snap.fields.works_lead, t.worksLead);
      document.querySelectorAll("#works-list [data-sample-item]").forEach((li, i) => {
        const n = i + 1;
        const title = li.querySelector("h3");
        const text = li.querySelector(".work-item-copy p");
        const titleKey = "work_" + n + "_title";
        const textKey = "work_" + n + "_text";
        if (title && snap.fields[titleKey] != null && String(snap.fields[titleKey]).trim() !== "") {
          title.textContent = snap.fields[titleKey];
        }
        if (text && snap.fields[textKey] != null && String(snap.fields[textKey]).trim() !== "") {
          text.textContent = snap.fields[textKey];
        }
      });
    }
    if (stepId === "extra-content" && snap.fields) {
      const hoursLead = document.querySelector("#hours .section-lead");
      const accessLead = document.querySelector("#access .section-lead");
      if (hoursLead && snap.fields.hours_text != null && String(snap.fields.hours_text).trim() !== "") {
        hoursLead.textContent = snap.fields.hours_text;
      }
      if (accessLead && snap.fields.access_text != null && String(snap.fields.access_text).trim() !== "") {
        accessLead.textContent = snap.fields.access_text;
      }
    }
    if (stepId === "contact-content" && snap.fields) {
      const t = previewDefaults.text;
      applyFilledText(document.getElementById("contact-label"), snap.fields.contact_label, t.contactLabel);
      applyFilledText(document.getElementById("contact-heading"), snap.fields.contact_section_name, t.contactHeading);
      applyFilledText(document.getElementById("nav-contact"), snap.fields.contact_section_name, t.contactHeading);
      const leads = document.querySelectorAll("#contact .contact-band-lead");
      if (leads[0] && snap.fields.contact_note_1 != null && String(snap.fields.contact_note_1).trim() !== "") {
        leads[0].textContent = snap.fields.contact_note_1;
      }
      if (leads[1] && snap.fields.contact_note_2 != null && String(snap.fields.contact_note_2).trim() !== "") {
        leads[1].textContent = snap.fields.contact_note_2;
      }
      const mail = document.querySelector("#contact .sample-mail");
      if (mail && snap.fields.contact_email != null && String(snap.fields.contact_email).trim() !== "") {
        mail.textContent = snap.fields.contact_email;
      }
    }
  }

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

    applyFontsToRoot(fonts);
    applyLiveColors(false);
    applyAllImages();

    if (store.confirmed["extra-content"] && store.snapshots["extra-content"]) {
      applyExtrasToPreview(store.snapshots["extra-content"].extras || extras);
      const snsList = document.getElementById("sns-list");
      const n = Number((store.snapshots["extra-content"].extras || {}).snsCount || 0);
      if (snsList) {
        snsList.innerHTML = "";
        for (let i = 1; i <= n; i += 1) {
          const li = document.createElement("li");
          const fields = store.snapshots["extra-content"].fields || {};
          li.textContent = fields["sns_" + i] || ("SNSリンク" + i + "（見本）");
          snsList.appendChild(li);
        }
      }
    }
  }

  function captureStepSnapshot(stepId) {
    const snap = { stepId: stepId, at: new Date().toISOString() };
    const fields = formToObject();

    if (stepId === "guide") {
      snap.ack = true;
      snap.draftColors = { ...store.draftColors };
    }
    if (stepId === "global-text") {
      snap.fonts = {
        display: fieldValue("font_display") || "Shippori Mincho",
        body: fieldValue("font_body") || "Zen Kaku Gothic New",
        otherNote: fieldValue("font_other_note") || ""
      };
      snap.fields = {
        brand_name: fields.brand_name || "",
        font_other_note: fields.font_other_note || ""
      };
      snap.images = captureImages(["logo_image"]);
    }
    if (stepId === "hero-content") {
      snap.counts = { "hero-leads": Number(store.draftCounts["hero-leads"]) };
      snap.fonts = { catch: fieldValue("font_catch") || "Shippori Mincho" };
      snap.fields = {
        hero_title: fields.hero_title || "",
        hero_lead_1: fields.hero_lead_1 || "",
        hero_lead_2: fields.hero_lead_2 || "",
        hero_lead_3: fields.hero_lead_3 || ""
      };
      snap.images = captureImages(["hero_image"]);
    }
    if (stepId === "values-content") {
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
    if (stepId === "about-content") {
      snap.counts = {
        "about-accordions": Number(store.draftCounts["about-accordions"]),
        "about-photos": Number(store.draftCounts["about-photos"])
      };
      snap.fonts = { about: fieldValue("font_about") || "Zen Kaku Gothic New" };
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
      snap.images = captureImages(["about_image_1", "about_image_2", "about_image_3", "about_image_4"]);
    }
    if (stepId === "works-content") {
      snap.counts = { "works-list": Number(store.draftCounts["works-list"]) };
      snap.fonts = { works: fieldValue("font_works") || "Zen Kaku Gothic New" };
      snap.fields = {
        works_section_name: fields.works_section_name || "",
        works_heading: fields.works_heading || "",
        works_lead: fields.works_lead || "",
        work_1_title: fields.work_1_title || "",
        work_1_text: fields.work_1_text || "",
        work_2_title: fields.work_2_title || "",
        work_2_text: fields.work_2_text || "",
        work_3_title: fields.work_3_title || "",
        work_3_text: fields.work_3_text || ""
      };
      snap.images = captureImages(["work_1_image", "work_2_image", "work_3_image"]);
    }
    if (stepId === "extra-content") {
      snap.extras = {
        hours: !!(document.querySelector('[data-extra-toggle="hours"]') || {}).checked,
        access: !!(document.querySelector('[data-extra-toggle="access"]') || {}).checked,
        map: !!(document.querySelector('[data-extra-toggle="map"]') || {}).checked,
        snsCount: Number((document.getElementById("sns-count") || {}).value || 0)
      };
      snap.fields = {
        hours_text: fields.hours_text || "",
        access_text: fields.access_text || "",
        sns_1: fields.sns_1 || "",
        sns_2: fields.sns_2 || "",
        sns_3: fields.sns_3 || ""
      };
    }
    if (stepId === "contact-content") {
      snap.fields = {
        contact_section_name: fields.contact_section_name || "",
        contact_label: fields.contact_label || "",
        contact_email: fields.contact_email || "",
        contact_note_1: fields.contact_note_1 || "",
        contact_note_2: fields.contact_note_2 || ""
      };
    }
    if (stepId === "finish") {
      snap.fields = {
        ref_url: fields.ref_url || "",
        avoid_mood: fields.avoid_mood || "",
        due_date: fields.due_date || "",
        contact_method: fields.contact_method || "",
        scope_layout_fixed: fields.scope_layout_fixed || "",
        scope_no_copy: fields.scope_no_copy || "",
        scope_no_form: fields.scope_no_form || "",
        scope_update: fields.scope_update || ""
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
        status.textContent = done
          ? "確定済み（左に反映中）"
          : "未確定（次へで確定）";
      }
    });

    document.querySelectorAll("#make-flow [data-step]").forEach((li) => {
      const id = li.getAttribute("data-step");
      const meta = STEPS.find((s) => s.id === id);
      if (!meta) return;
      li.classList.remove("is-color-live");
      li.classList.remove("is-text-step");
      const done = !!store.confirmed[id];
      li.classList.toggle("is-done", done);
      li.classList.toggle("is-text-step", !done);
    });

    updateZipGate();
    updateZoneBadgeDoneState();
  }

  function updateZipGate() {
    const zipBtn = document.getElementById("btn-zip");
    const missingEl = document.getElementById("zip-missing");
    const missing = STEPS.filter((s) => !store.confirmed[s.id]);
    const ready = missing.length === 0;
    if (zipBtn) {
      zipBtn.disabled = !ready;
      zipBtn.classList.toggle("is-disabled", !ready);
    }
    if (missingEl) {
      if (ready) {
        missingEl.textContent = "すべて確定済み。ZIP前に最終確認があります。";
      } else {
        missingEl.textContent =
          "未確定: " + missing.map((s) => badgeDisplayName(s.id)).join("、");
      }
    }
  }

  function confirmStep(stepId) {
    if (stepId === "finish" && !validateFinish()) {
      const status = document.querySelector('.dash-block[data-step-id="finish"] [data-confirm-status]');
      if (status) status.textContent = "範囲の確認（4項目）にチェックしてください";
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
    if (cfg.fonts) Object.keys(cfg.fonts).forEach((name) => setFieldValue(name, cfg.fonts[name]));
    if (cfg.counts) Object.keys(cfg.counts).forEach((id) => {
      store.draftCounts[id] = cfg.counts[id];
    });
    (cfg.files || []).forEach(clearFileInput);
    if (cfg.extrasReset) {
      ["hours", "access", "map"].forEach((key) => {
        const input = document.querySelector('[data-extra-toggle="' + key + '"]');
        if (input) input.checked = false;
        store.draftExtras[key] = false;
      });
      const sns = document.getElementById("sns-count");
      if (sns) sns.value = "0";
      store.draftExtras.snsCount = 0;
      syncSnsFields();
    }
    if (cfg.uncheck) cfg.uncheck.forEach((name) => setFieldValue(name, ""));
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
    const scroll = document.querySelector(".preview-scroll");
    if (!scroll || !selector) return;
    if (selector === "#preview-root") {
      scroll.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    let target = root.querySelector(selector);
    if (!target) target = document.getElementById(selector.replace(/^#/, ""));
    if (!target) return;
    if (target.hidden) {
      const fallback = root.querySelector("#works") || root.querySelector("#about") || root.querySelector("#hero");
      if (fallback) target = fallback;
      else return;
    }
    const scrollRect = scroll.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const next = scroll.scrollTop + (targetRect.top - scrollRect.top) - 10;
    scroll.scrollTo({ top: Math.max(0, next), behavior: "smooth" });
  }

  function switchToDashTab() {
    document.body.classList.add("show-dash");
    document.body.classList.remove("show-preview");
    document.querySelectorAll(".atelier-tab").forEach((tab) => {
      tab.classList.toggle("is-active", tab.getAttribute("data-tab") === "dash");
    });
  }

  function openStep(stepId) {
    const idx = STEPS.findIndex((s) => s.id === stepId);
    if (idx < 0) return;
    showWizardStep(idx);
  }

  function setupExclusiveAccordions() {
    form.addEventListener("toggle", (e) => {
      const t = e.target;
      if (!(t instanceof HTMLDetailsElement)) return;
      if (!t.classList.contains("dash-block")) return;
      if (!t.open) return;
      form.querySelectorAll(":scope > details.dash-block").forEach((d) => {
        if (d !== t) d.open = false;
      });
    }, true);
  }

  function setupPreviewHits() {
    document.querySelectorAll("[data-open-step]").forEach((el) => {
      el.addEventListener("click", (e) => {
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
    document.querySelectorAll("[data-viewport]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const mode = btn.getAttribute("data-viewport");
        viewport.classList.toggle("is-desktop", mode === "desktop");
        viewport.classList.toggle("is-mobile", mode === "mobile");
        document.querySelectorAll("[data-viewport]").forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
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
      plan: "1man-sample-atelier-confirm-v3",
      draftColors: { ...store.draftColors },
      colors: collectAppliedColors(),
      counts: { ...store.draftCounts },
      confirmed: { ...store.confirmed },
      snapshots: store.snapshots,
      fonts: {
        display: fieldValue("font_display"),
        body: fieldValue("font_body"),
        catch: fieldValue("font_catch"),
        about: fieldValue("font_about"),
        works: fieldValue("font_works"),
        otherNote: fieldValue("font_other_note")
      },
      extras: {
        hours: !!(document.querySelector('[data-extra-toggle="hours"]') || {}).checked,
        access: !!(document.querySelector('[data-extra-toggle="access"]') || {}).checked,
        map: !!(document.querySelector('[data-extra-toggle="map"]') || {}).checked,
        snsCount: (document.getElementById("sns-count") || {}).value || "0"
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
        version: 6,
        savedAt: new Date().toISOString(),
        wizardStepIndex: store.wizardStepIndex,
        uiMode: store.uiMode,
        presetChosen: store.presetChosen,
        chosenPresetKey: store.chosenPresetKey,
        randomHistory: store.randomHistory,
        draftColors: store.draftColors,
        draftCounts: store.draftCounts,
        draftExtras: {
          hours: !!(document.querySelector('[data-extra-toggle="hours"]') || {}).checked,
          access: !!(document.querySelector('[data-extra-toggle="access"]') || {}).checked,
          map: !!(document.querySelector('[data-extra-toggle="map"]') || {}).checked,
          snsCount: Number((document.getElementById("sns-count") || {}).value || 0)
        },
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
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (!data || data.version !== 6) return false;
      suppressSave = true;
      if (data.draftColors) Object.assign(store.draftColors, data.draftColors);
      if (data.wizardStepIndex != null) store.wizardStepIndex = data.wizardStepIndex;
      if (data.uiMode) {
        store.uiMode = data.uiMode;
        const radio = form.querySelector('input[name="ui_mode"][value="' + data.uiMode + '"]');
        if (radio) radio.checked = true;
      }
      if (data.presetChosen != null) store.presetChosen = !!data.presetChosen;
      if (data.chosenPresetKey != null) store.chosenPresetKey = data.chosenPresetKey;
      if (Array.isArray(data.randomHistory)) store.randomHistory = data.randomHistory.slice(0, 2);
      if (data.draftCounts) Object.assign(store.draftCounts, data.draftCounts);
      if (data.confirmed) Object.assign(store.confirmed, data.confirmed);
      if (data.snapshots) store.snapshots = data.snapshots;
      if (data.fields) applyFormObject(data.fields);
      if (data.draftExtras) {
        store.draftExtras = { ...store.draftExtras, ...data.draftExtras };
        ["hours", "access", "map"].forEach((key) => {
          const input = document.querySelector('[data-extra-toggle="' + key + '"]');
          if (input) input.checked = !!data.draftExtras[key];
        });
        const sns = document.getElementById("sns-count");
        if (sns && data.draftExtras.snsCount != null) sns.value = String(data.draftExtras.snsCount);
      }
      if (data.fields) {
        if (data.fields.headingScale) setFieldValue("headingScale", data.fields.headingScale);
        if (data.fields.radius) setFieldValue("radius", data.fields.radius);
        if (data.fields.font_display) setFieldValue("font_display", data.fields.font_display);
        if (data.fields.font_body) setFieldValue("font_body", data.fields.font_body);
        if (data.fields.brand_name) setFieldValue("brand_name", data.fields.brand_name);
        if (data.fields.font_catch) setFieldValue("font_catch", data.fields.font_catch);
        if (data.fields.font_about) setFieldValue("font_about", data.fields.font_about);
        if (data.fields.font_works) setFieldValue("font_works", data.fields.font_works);
      }
      fillFontSelects();
      suppressSave = false;
      return true;
    } catch (e) {
      suppressSave = false;
      return false;
    }
  }

  async function buildZip() {
    const status = document.getElementById("zip-status");
    if (!window.JSZip) {
      if (status) status.textContent = "ZIP用ライブラリの読み込みに失敗しました。";
      return;
    }
    const missing = STEPS.filter((s) => !store.confirmed[s.id]);
    if (missing.length) {
      if (status) {
        status.textContent = "未確定: " + missing.map((s) => badgeDisplayName(s.id)).join("、");
      }
      showWizardFootPanel(
        "<p class=\"wizard-foot-panel-text\">未入力・未確定: " +
          missing.map((s) => badgeDisplayName(s.id)).join("、") +
          "。左の番号を押して入力してください。</p>" +
          "<button type=\"button\" class=\"wizard-btn\" data-panel-close>OK</button>"
      );
      const panel = document.getElementById("wizard-foot-panel");
      const close = panel && panel.querySelector("[data-panel-close]");
      if (close) close.addEventListener("click", hideWizardFootPanel, { once: true });
      openStep(missing[0].id);
      return;
    }

    showWizardFootPanel(
      "<p class=\"wizard-foot-panel-text\">左のプレビューが納品イメージです。この内容でZIPを保存しますか？</p>" +
      "<p class=\"wizard-foot-panel-note\">作成後の無料修正は1回のみです。</p>" +
      "<div class=\"wizard-foot-panel-actions\">" +
      "<button type=\"button\" class=\"wizard-btn\" data-zip-cancel>見直す</button>" +
      "<button type=\"button\" class=\"wizard-btn\" data-zip-ok>ZIPを保存</button>" +
      "</div>"
    );
    return new Promise((resolve) => {
      const panel = document.getElementById("wizard-foot-panel");
      if (!panel) {
        resolve(false);
        return;
      }
      const cancel = panel.querySelector("[data-zip-cancel]");
      const ok = panel.querySelector("[data-zip-ok]");
      if (cancel) {
        cancel.addEventListener("click", () => {
          hideWizardFootPanel();
          if (status) status.textContent = "ZIPをキャンセルしました。";
          resolve(false);
        }, { once: true });
      }
      if (ok) {
        ok.addEventListener("click", () => {
          hideWizardFootPanel();
          resolve(true);
        }, { once: true });
      }
    }).then(async (proceed) => {
      if (!proceed) return;

    const meta = collectSettings();
    meta.colorFinalAck = true;
    meta.freeRevisionNote = "作成後の無料修正は1回のみ";
    const zip = new JSZip();
    zip.file("order.json", JSON.stringify(meta, null, 2));

    const lines = [
      "1万円プラン 依頼内容（確定フロー試作）",
      "作成: " + meta.createdAt,
      "色（ライブ／ZIP時確認済み）: " + JSON.stringify(meta.draftColors),
      "件数: " + JSON.stringify(meta.counts),
      "書体: " + JSON.stringify(meta.fonts),
      "追加: " + JSON.stringify(meta.extras),
      "文字・画像の確定: " + JSON.stringify(meta.confirmed),
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
    if (status) status.textContent = "ZIPを保存しました。";
    });
  }

  const zipBtn = document.getElementById("btn-zip");
  if (zipBtn) {
    zipBtn.addEventListener("click", () => {
      buildZip().catch(() => {
        const status = document.getElementById("zip-status");
        if (status) status.textContent = "ZIP作成に失敗しました。";
      });
    });
  }

  const copyBtn = document.getElementById("btn-copy-settings");
  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      const text = JSON.stringify(collectSettings(), null, 2);
      const status = document.getElementById("zip-status");
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          if (status) status.textContent = "設定JSONをコピーしました。";
        }).catch(() => {
          if (status) status.textContent = "コピーに失敗しました。";
        });
      }
    });
  }

  form.addEventListener("input", () => {
    updateFontPreview();
    scheduleSave();
  });
  form.addEventListener("change", () => {
    syncSnsFields();
    updateFontPreview();
    scheduleSave();
  });

  function setupBadgeToggle() {
    const toggle = document.getElementById("toggle-zone-badges");
    const legend = document.getElementById("preview-legend");
    if (!toggle) return;
    const apply = () => {
      document.body.classList.toggle("hide-zone-badges", !toggle.checked);
      if (legend) legend.hidden = !toggle.checked;
    };
    toggle.addEventListener("change", apply);
    apply();
  }

  rememberImageDefaults();
  fillFontSelects();
  buildSwatches();
  setupColorModes();
  setupPresets();
  setupCounts();
  setupExtrasDraft();
  setupConfirmButtons();
  setupPreviewSync();
  setupViewport();
  setupMobileTabs();
  setupExclusiveAccordions();
  setupPreviewHits();
  setupBadgeToggle();
  setupWizard();

  form.querySelectorAll(":scope > details.dash-block").forEach((d) => {
    d.open = false;
  });

  const resumed = loadDraft();
  refreshColorUi();
  syncCountLabels();
  syncSnsFields();
  updateFontPreview();
  applyAllConfirmed();
  applyLiveColors(false);
  updateConfirmUi();
  updateRandomUndoUi();
  if (store.chosenPresetKey) {
    document.querySelectorAll("[data-preset]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.getAttribute("data-preset") === store.chosenPresetKey);
    });
  }
  applyUiMode();
  showWizardStep(resolveWizardStepIndex());

  if (resumed) {
    const banner = document.getElementById("resume-banner");
    if (banner) banner.hidden = false;
  }
})();
