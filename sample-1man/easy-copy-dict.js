/**
 * かんたん導線・お店パイロット用 疑似文章辞書
 * 相性: 選択 → 表現群 → 文章型。無作為全組合せはしない。
 */
(function (global) {
  "use strict";

  const QUESTIONS = [
    {
      id: "mood",
      title: "お店の雰囲気は？",
      options: [
        { id: "calm", label: "落ち着いた" },
        { id: "bright", label: "明るい・にぎやか" },
        { id: "refined", label: "上品・きれいめ" },
        { id: "casual", label: "カジュアル・気軽" },
        { id: "craft", label: "こだわり・専門店らしい" }
      ]
    },
    {
      id: "focus",
      title: "いちばん伝えたいことは？",
      options: [
        { id: "quality", label: "味・品質" },
        { id: "space", label: "雰囲気・空間" },
        { id: "care", label: "接客・人柄" },
        { id: "access", label: "通いやすさ・立地" },
        { id: "menu", label: "メニュー・品揃え" }
      ]
    },
    {
      id: "guest",
      title: "どんなお客さま向け？",
      options: [
        { id: "local", label: "近所の人" },
        { id: "first", label: "初めての人にも" },
        { id: "picky", label: "こだわりたい人" },
        { id: "with", label: "家族・友人と" },
        { id: "solo", label: "一人でも気軽に" }
      ]
    }
  ];

  /** 文頭パーツ（表現群）※5案分のユニークIDが必要なので各群5以上 */
  const OPENINGS = {
    calm: [
      { id: "op_calm_1", text: "静かな時間を楽しめる" },
      { id: "op_calm_2", text: "落ち着いて過ごせる" },
      { id: "op_calm_3", text: "ゆったりとした空気の" },
      { id: "op_calm_4", text: "穏やかな雰囲気の" },
      { id: "op_calm_5", text: "ほっと一息つける" },
      { id: "op_calm_6", text: "やさしい時間を届ける" },
      { id: "op_calm_7", text: "からだをほどく" },
      { id: "op_calm_8", text: "朝の光が差し込む" },
      { id: "op_calm_9", text: "木枠の窓辺で迎える" }
    ],
    bright: [
      { id: "op_bright_1", text: "明るい空気が広がる" },
      { id: "op_bright_2", text: "にぎやかなひとときを" },
      { id: "op_bright_3", text: "活気のある" },
      { id: "op_bright_4", text: "笑顔が集まる" },
      { id: "op_bright_5", text: "開放感のある" }
    ],
    refined: [
      { id: "op_ref_1", text: "上品な空間で迎える" },
      { id: "op_ref_2", text: "きれいめな雰囲気の" },
      { id: "op_ref_3", text: "洗練された" },
      { id: "op_ref_4", text: "上質なくつろぎの" },
      { id: "op_ref_5", text: "丁寧な設えの" }
    ],
    casual: [
      { id: "op_cas_1", text: "気軽に立ち寄れる" },
      { id: "op_cas_2", text: "カジュアルに楽しむ" },
      { id: "op_cas_3", text: "肩の力が抜ける" },
      { id: "op_cas_4", text: "親しみやすい" },
      { id: "op_cas_5", text: "ふらっと寄れる" }
    ],
    craft: [
      { id: "op_craft_1", text: "こだわりを大切にする" },
      { id: "op_craft_2", text: "専門店らしい一軒" },
      { id: "op_craft_3", text: "丁寧な仕事が光る" },
      { id: "op_craft_4", text: "作り手の思いが伝わる" },
      { id: "op_craft_5", text: "一点もの感のある" },
      { id: "op_craft_6", text: "焼きたてを毎日届ける" },
      { id: "op_craft_7", text: "炭火と会話を楽しむ" },
      { id: "op_craft_8", text: "店先に並ぶ切り花の" },
      { id: "op_craft_9", text: "余白を活かしたポートレートの" }
    ]
  };

  /** 中盤パーツ */
  const MIDDLES = {
    quality: [
      { id: "md_qual_1", text: "丁寧に仕上げた味を届けます" },
      { id: "md_qual_2", text: "品質にこだわった一品を揃えています" },
      { id: "md_qual_3", text: "素材と仕込みに時間をかけています" },
      { id: "md_qual_4", text: "確かな味を大切にしています" },
      { id: "md_qual_5", text: "満足できる一皿を目指しています" },
      { id: "md_qual_6", text: "挽きたての香りを大切にしています" }
    ],
    space: [
      { id: "md_sp_1", text: "居心地のよい空間づくりを大切にしています" },
      { id: "md_sp_2", text: "店内の雰囲気をゆっくり味わえます" },
      { id: "md_sp_3", text: "過ごしやすい店内を心がけています" },
      { id: "md_sp_4", text: "空間の心地よさを大切にしています" },
      { id: "md_sp_5", text: "落ち着ける席づくりをしています" },
      { id: "md_sp_6", text: "席数を抑えて落ち着ける空間にしています" }
    ],
    care: [
      { id: "md_care_1", text: "あたたかい接客を心がけています" },
      { id: "md_care_2", text: "人柄が伝わるおもてなしをします" },
      { id: "md_care_3", text: "気配りの行き届いた対応を大切にしています" },
      { id: "md_care_4", text: "お客様との会話を大切にしています" },
      { id: "md_care_5", text: "安心してお過ごしいただけるよう努めています" }
    ],
    access: [
      { id: "md_acc_1", text: "通いやすい立地でお待ちしています" },
      { id: "md_acc_2", text: "気軽に寄れる場所にあります" },
      { id: "md_acc_3", text: "アクセスのよさも魅力です" },
      { id: "md_acc_4", text: "日常の動線にちょうどよい場所です" },
      { id: "md_acc_5", text: "立ち寄りやすい場所で営業しています" }
    ],
    menu: [
      { id: "md_menu_1", text: "選びやすいメニューをそろえています" },
      { id: "md_menu_2", text: "季節や定番の品揃えを楽しんでください" },
      { id: "md_menu_3", text: "幅広いラインナップをご用意しています" },
      { id: "md_menu_4", text: "おすすめの品をわかりやすく並べています" },
      { id: "md_menu_5", text: "欲しいものが見つけやすい構成です" }
    ]
  };

  /** 締めパーツ */
  const CLOSINGS = {
    local: [
      { id: "cl_loc_1", text: "近所の日常に寄り添います。" },
      { id: "cl_loc_2", text: "近くに住む方の味方でありたいです。" },
      { id: "cl_loc_3", text: "地域の方の習慣になる場所を目指します。" },
      { id: "cl_loc_4", text: "ご近所の方に親しまれる店でありたいです。" },
      { id: "cl_loc_5", text: "近くて便利な一軒としてお待ちしています。" },
      { id: "cl_loc_6", text: "近所の朝の習慣に寄り添います。" }
    ],
    first: [
      { id: "cl_first_1", text: "初めての方にもわかりやすくご案内します。" },
      { id: "cl_first_2", text: "はじめてでも入りやすいお店です。" },
      { id: "cl_first_3", text: "初めての来店でも安心してお過ごしください。" },
      { id: "cl_first_4", text: "初めての方へのご案内を大切にしています。" },
      { id: "cl_first_5", text: "はじめての方にも選ばれやすい店づくりです。" }
    ],
    picky: [
      { id: "cl_pick_1", text: "こだわりたい方にも応えます。" },
      { id: "cl_pick_2", text: "細かな好みにも向き合います。" },
      { id: "cl_pick_3", text: "こだわり派の方にも納得いただける内容です。" },
      { id: "cl_pick_4", text: "基準の高い方にもご満足いただけるよう努めています。" },
      { id: "cl_pick_5", text: "こだわりの視点を大切にする方へ。" }
    ],
    with: [
      { id: "cl_with_1", text: "家族や友人との時間にもどうぞ。" },
      { id: "cl_with_2", text: "みんなで過ごすひとときに。" },
      { id: "cl_with_3", text: "連れ立っての来店にも向いています。" },
      { id: "cl_with_4", text: "一緒に来る方との時間を大切にできます。" },
      { id: "cl_with_5", text: "複数人でのご利用にもおすすめです。" }
    ],
    solo: [
      { id: "cl_solo_1", text: "一人でも気軽にお越しください。" },
      { id: "cl_solo_2", text: "ひとり時間にもぴったりです。" },
      { id: "cl_solo_3", text: "一人の来店でも居心地よく過ごせます。" },
      { id: "cl_solo_4", text: "ソロ利用しやすいお店です。" },
      { id: "cl_solo_5", text: "一人でも入りやすい空気感です。" }
    ]
  };

  /**
   * 文章型：どの選択と相性があるか、どの表現群を使うか
   * moodIds / focusIds / guestIds が空配列なら全許可
   */
  const SKELETONS = [
    {
      id: "sk_welcome",
      moodIds: [],
      focusIds: [],
      guestIds: [],
      build: (ctx) =>
        ctx.brand + "へようこそ。" + ctx.open + "お店です。" + ctx.mid + "。" + ctx.close
    },
    {
      id: "sk_place",
      moodIds: [],
      focusIds: [],
      guestIds: [],
      build: (ctx) => ctx.open + ctx.brand + "。" + ctx.mid + "。" + ctx.close
    },
    {
      id: "sk_focus",
      moodIds: [],
      focusIds: [],
      guestIds: [],
      build: (ctx) =>
        ctx.brand + "は、" + ctx.mid + "。" + ctx.open + "空気感のなかで、" + ctx.close
    },
    {
      id: "sk_guest",
      moodIds: [],
      focusIds: [],
      guestIds: [],
      build: (ctx) =>
        ctx.open + "場所で、" + ctx.mid + "。" + ctx.brand + "は" + ctx.close
    },
    {
      id: "sk_short",
      moodIds: [],
      focusIds: [],
      guestIds: [],
      build: (ctx) =>
        ctx.brand + "。" + ctx.open + "店です。" + ctx.mid + "。" + ctx.close
    },
    {
      id: "sk_story",
      moodIds: ["calm", "craft", "refined", "casual", "bright"],
      focusIds: ["quality", "space", "care", "menu", "access"],
      guestIds: ["picky", "first", "local", "with", "solo"],
      build: (ctx) =>
        "「" + ctx.brand + "」は、" + ctx.open + "お店。" + ctx.mid + "。" + ctx.close
    },
    {
      id: "sk_invite",
      moodIds: ["bright", "casual", "calm", "refined", "craft"],
      focusIds: ["menu", "access", "space", "quality", "care"],
      guestIds: ["with", "solo", "first", "local", "picky"],
      build: (ctx) =>
        ctx.open + "なら" + ctx.brand + "へ。" + ctx.mid + "。" + ctx.close
    }
  ];

  function optionLabel(questionId, optionId) {
    const q = QUESTIONS.find((x) => x.id === questionId);
    const opt = q && q.options.find((o) => o.id === optionId);
    return opt ? opt.label : optionId;
  }

  function pickCompatible(list, usedIds) {
    const unused = (list || []).filter((p) => usedIds.indexOf(p.id) < 0);
    const pool = unused.length ? unused : list || [];
    if (!pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function skeletonOk(sk, mood, focus, guest) {
    if (sk.moodIds.length && sk.moodIds.indexOf(mood) < 0) return false;
    if (sk.focusIds.length && sk.focusIds.indexOf(focus) < 0) return false;
    if (sk.guestIds.length && sk.guestIds.indexOf(guest) < 0) return false;
    return true;
  }

  function normalizeBrand(name) {
    const t = String(name || "").trim();
    return t || "当店";
  }

  /**
   * @param {{ mood: string, focus: string, guest: string, brandName: string }} sel
   * @returns {Array<{ skeletonId: string, openId: string, closeId: string, midId: string, text: string }>}
   */
  function generateFive(sel) {
    const mood = sel.mood;
    const focus = sel.focus;
    const guest = sel.guest;
    const brand = normalizeBrand(sel.brandName);
    const eligible = SKELETONS.filter((sk) => skeletonOk(sk, mood, focus, guest));
    const skPool = eligible.length ? eligible.slice() : SKELETONS.slice();
    // shuffle
    for (let i = skPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = skPool[i];
      skPool[i] = skPool[j];
      skPool[j] = tmp;
    }

    const usedSk = [];
    const usedOpen = [];
    const usedClose = [];
    const usedText = [];
    const out = [];
    let guard = 0;

    while (out.length < 5 && guard < 80) {
      guard += 1;
      const remainSk = skPool.filter((sk) => usedSk.indexOf(sk.id) < 0);
      if (!remainSk.length) break;
      const sk = remainSk[0];
      const open = pickCompatible(OPENINGS[mood], usedOpen);
      const mid = pickCompatible(MIDDLES[focus], []);
      const close = pickCompatible(CLOSINGS[guest], usedClose);
      if (!open || !mid || !close) break;

      const text = sk
        .build({
          brand: brand,
          open: open.text,
          mid: mid.text,
          close: close.text
        })
        .replace(/。。/g, "。")
        .replace(/\s+/g, "");

      if (usedText.indexOf(text) >= 0) continue;

      usedSk.push(sk.id);
      usedOpen.push(open.id);
      usedClose.push(close.id);
      usedText.push(text);
      out.push({
        skeletonId: sk.id,
        openId: open.id,
        closeId: close.id,
        midId: mid.id,
        text: text
      });
    }

    return out.slice(0, 5);
  }

  /** セクションごと文章5択（サンプル本線） */
  const SECTIONS = [
    {
      id: "hero",
      label: "キャッチ",
      apply: (text, brand) => ({
        hero_lead_1: text.slice(0, 40),
        hero_lead_2: text.length > 40 ? text.slice(40, 80) : "",
        hero_title: brand
      })
    },
    {
      id: "about",
      label: "紹介",
      apply: (text, brand) => ({
        about_lead: text.slice(0, 200),
        about_heading: brand ? brand + "案内" : "ご案内",
        about_name: brand
      })
    },
    {
      id: "works",
      label: "おすすめ",
      apply: (text) => ({
        works_heading: "おすすめ",
        works_lead: text.slice(0, 80),
        work_1_title: "おすすめ",
        work_1_text: text.slice(0, 80)
      })
    },
    {
      id: "contact",
      label: "ご連絡",
      apply: (text) => ({
        contact_label: "ご連絡",
        contact_note_1: text.slice(0, 40)
      })
    }
  ];

  /**
   * 内部タグ（見本世界観）→ 既存3問への既定マップ。UIには出さない。
   * 正本メモ: _plot/copy-harvest-and-affinity.md
   */
  const SCENE_AFFINITY = {
    cafe: { mood: "calm", focus: "quality", guest: "local" },
    bakery: { mood: "bright", focus: "menu", guest: "local" },
    sweets: { mood: "bright", focus: "menu", guest: "with" },
    bar: { mood: "craft", focus: "space", guest: "solo" },
    izakaya: { mood: "craft", focus: "menu", guest: "with" },
    ramen: { mood: "craft", focus: "quality", guest: "local" },
    salon: { mood: "refined", focus: "care", guest: "first" },
    yoga: { mood: "calm", focus: "space", guest: "first" },
    studio: { mood: "refined", focus: "care", guest: "picky" },
    florist: { mood: "bright", focus: "menu", guest: "first" },
    gallery: { mood: "craft", focus: "space", guest: "picky" },
    clinic: { mood: "calm", focus: "care", guest: "first" },
    cowork: { mood: "casual", focus: "space", guest: "solo" },
    inn: { mood: "calm", focus: "space", guest: "first" },
    pet: { mood: "casual", focus: "care", guest: "with" }
  };

  function affinityForScene(sceneTag) {
    const key = String(sceneTag || "").trim();
    return SCENE_AFFINITY[key] || null;
  }

  /**
   * セクション用5案。ラジオ3は省略時に既定相性を使う。
   * @param {{ sectionId: string, brandName?: string, mood?: string, focus?: string, guest?: string, sceneTag?: string }} sel
   */
  function generateSectionFive(sel) {
    const section = SECTIONS.find((s) => s.id === sel.sectionId) || SECTIONS[0];
    const fromScene = affinityForScene(sel.sceneTag);
    const base = generateFive({
      mood: sel.mood || (fromScene && fromScene.mood) || "calm",
      focus: sel.focus || (fromScene && fromScene.focus) || "quality",
      guest: sel.guest || (fromScene && fromScene.guest) || "first",
      brandName: sel.brandName
    });
    return base.map((c, i) => {
      let text = c.text;
      if (section.id === "hero") {
        text = text.replace(/へようこそ。/, "。").slice(0, 60);
      } else if (section.id === "contact") {
        text = (c.closeId ? CLOSINGS.first[i % 5].text : text).replace(/。$/, "") + " お気軽にご連絡ください。";
      }
      return Object.assign({}, c, { sectionId: section.id, text: text });
    });
  }

  global.Sample1manEasyCopy = {
    QUESTIONS: QUESTIONS,
    SECTIONS: SECTIONS,
    SCENE_AFFINITY: SCENE_AFFINITY,
    affinityForScene: affinityForScene,
    generateFive: generateFive,
    generateSectionFive: generateSectionFive,
    optionLabel: optionLabel
  };
})(typeof window !== "undefined" ? window : globalThis);
