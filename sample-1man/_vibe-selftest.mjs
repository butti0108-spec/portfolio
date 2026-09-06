/**
 * matchVibe 3軸ロジックの自己検証（ブラウザなし）
 * vibe-dict.js を読み、script.js と同型の照合だけを走らせる。
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dictSrc = fs.readFileSync(path.join(__dirname, "vibe-dict.js"), "utf8");
const sandbox = { window: {}, console };
vm.runInNewContext(dictSrc, sandbox);
const dict = sandbox.window.Sample1manVibeDict;

const PRESETS = {
  clinic: { pageBg: "#eef3f8" },
  green: { pageBg: "#e8f0e8" },
  cafe: { pageBg: "#f3ebe3" },
  ink: { pageBg: "#1a1a1a" },
  ocean: { pageBg: "#e8f2f8" },
  plum: { pageBg: "#f0e8f4" },
  brick: { pageBg: "#f8e8e8" }
};

function purposeLabel(id) {
  return (
    { personal: "個人紹介", company: "会社・教室", shop: "お店", works: "実績中心", service: "サービス・メニュー" }[id] ||
    id
  );
}
function layoutLabel(id) {
  return ({ a: "A（横長）", b: "B（左右分割）", c: "C（混合）" }[id] || id);
}
function collectHits(text, wordList) {
  const hits = [];
  (wordList || []).forEach((w) => {
    if (w && text.indexOf(String(w).toLowerCase()) >= 0) hits.push(w);
  });
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

function matchVibe(raw) {
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
  const explicitHits = [];
  Object.keys(dict.explicitColor || {}).forEach((word) => {
    if (t.indexOf(String(word).toLowerCase()) < 0) return;
    if (isNegatedHit(t, word)) return;
    explicitHits.push({ word, meta: dict.explicitColor[word] });
  });
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

  if (placeSlot && explicitHits.length) {
    const last = explicitHits[explicitHits.length - 1];
    preset = "vibe";
    mainHue = last.meta.hue || "blue";
    colorDefault = false;
    colorHitWords = explicitHits.map((e) => e.word);
    useCustomPalette = true;
  } else if (presetBest.score > 0 && (!explicitHits.length || presetBest.score >= explicitHits.length)) {
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

  if (purposeDefault) {
    reasons.push({ label: "用途", detail: "default personal" });
  } else {
    reasons.push({
      label: "用途",
      detail: (purposeHits[purpose] || []).slice(0, 3).join("・") + " → " + purposeLabel(purpose)
    });
  }
  if (layoutDefault) {
    reasons.push({ label: "レイアウト", detail: "default A" });
  } else {
    reasons.push({
      label: "レイアウト",
      detail: (layoutHits[layout] || []).slice(0, 3).join("・") + " → " + layoutLabel(layout)
    });
  }
  if (colorDefault) {
    reasons.push({ label: "色", detail: "default clinic" });
  } else if (placeSlot && placeHitWords.length) {
    reasons.push({
      label: "色",
      detail: colorHitWords.slice(0, 3).join("・") + " @ " + placeSlot + " → vibe"
    });
    useCustomPalette = true;
  } else {
    reasons.push({
      label: "色",
      detail: colorHitWords.slice(0, 3).join("・") + " → " + presetLabel(preset)
    });
  }

  if (useCustomPalette || preset === "vibe") {
    preset = "vibe";
  } else if (colorDefault || !PRESETS[preset]) {
    preset = "clinic";
  }

  return { purpose, layout, preset, placeSlot, mainHue, reasons, purposeDefault, layoutDefault, colorDefault };
}

const cases = [
  {
    name: "普通1: カフェだけ（色はデフォルト）",
    text: "近所のカフェ向けのサイト",
    expect: { purpose: "shop", layout: "a", preset: "clinic" }
  },
  {
    name: "普通2: モノトーンの落ち着いたカフェ",
    text: "モノトーンの落ち着いたカフェ",
    expect: { purpose: "shop", preset: "ink" }
  },
  {
    name: "普通3: 茶色の温かいパン屋",
    text: "茶色の温かいパン屋。シンプルで実直。",
    expect: { purpose: "shop", layout: "a", preset: "cafe" }
  },
  {
    name: "普通4: 個人紹介・青・清潔",
    text: "個人の紹介ページ。青系で清潔に。実直で仕事ができそう。",
    expect: { purpose: "personal", layout: "a", preset: "clinic" }
  },
  {
    name: "普通5: 会社案内・左右",
    text: "会社案内。左右に分けた構成でスマートに。",
    expect: { purpose: "company", layout: "b" }
  },
  {
    name: "普通6: 大きな写真の美容室",
    text: "美容室。大きな写真多め。上品な紫。",
    expect: { purpose: "shop", layout: "c", preset: "plum" }
  },
  {
    name: "普通7: サービス料金ページ",
    text: "サービスと料金表を目立たせたい",
    expect: { purpose: "service" }
  },
  {
    name: "変わった1: ヘッダーは青・全体はベージュ",
    text: "用途はサロン。ヘッダーは青、全体はベージュ。",
    expect: { purpose: "shop", preset: "vibe", placeSlot: "pageBg" }
  },
  {
    name: "変わった2: 雰囲気は緑（全体）",
    text: "フリーランスのサイト。雰囲気は緑。",
    expect: { purpose: "personal", preset: "green" }
  },
  {
    name: "変わった3: ピンクは使わない・茶色カフェ",
    text: "カフェ。茶色。大きな写真。ピンクは使わない。",
    expect: { purpose: "shop", layout: "c", preset: "cafe" }
  },
  {
    name: "変わった4: 墨モダンな実績ギャラリー",
    text: "実績とポートフォリオ。墨モダン。写真で見せる。",
    expect: { purpose: "works", layout: "c", preset: "ink" }
  },
  {
    name: "特殊1: 空文に近い",
    text: "よろしくお願いします",
    expect: { purpose: "personal", layout: "a", preset: "clinic" }
  },
  {
    name: "特殊2: アクセントは赤",
    text: "個人サイト。アクセントは赤。",
    expect: { purpose: "personal", preset: "vibe", placeSlot: "accent" }
  },
  {
    name: "特殊3: クリニック医院・白",
    text: "歯科クリニック。白く清潔な感じ。",
    expect: { purpose: "company", preset: "clinic" }
  },
  {
    name: "特殊4: オレンジ元気な居酒屋",
    text: "居酒屋。オレンジで元気に。",
    expect: { purpose: "shop", preset: "brick" }
  }
];

let fail = 0;
const report = [];
for (const c of cases) {
  const r = matchVibe(c.text);
  const miss = [];
  Object.keys(c.expect).forEach((k) => {
    if (r[k] !== c.expect[k]) miss.push(`${k}: got ${r[k]} want ${c.expect[k]}`);
  });
  const ok = miss.length === 0;
  if (!ok) fail += 1;
  report.push({
    name: c.name,
    ok,
    miss,
    got: { purpose: r.purpose, layout: r.layout, preset: r.preset, placeSlot: r.placeSlot, mainHue: r.mainHue },
    reasons: r.reasons.map((x) => x.label + ": " + x.detail)
  });
}

console.log(JSON.stringify({ fail, total: cases.length, report }, null, 2));
process.exit(fail ? 1 : 0);
