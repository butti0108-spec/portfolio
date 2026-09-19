/**
 * Apply meaning brush-up (2026-09-15-v01) to all 30 sushi sample drafts.
 * Run: node tools/apply-meaning-bu-2026-09-15.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "sample-1man", "sushi-samples");

const ALL = [
  "hero",
  "values",
  "photos",
  "works",
  "accordions",
  "hours",
  "access",
  "address",
  "contact"
];

/** @type {Record<string, { folder: string, face: string, invite: string, memory: string, absent: string[], order: string[], blockOff?: string[], extrasOff?: string[], heroImageOff?: boolean }>} */
const PLANS = {
  "01": {
    folder: "01-cafe-warm-a",
    face: "catch",
    invite: "end",
    memory: "朝の静かな一杯",
    absent: [],
    order: ["hero", "values", "photos", "works", "accordions", "hours", "access", "address", "contact"]
  },
  "02": {
    folder: "02-cafe-split-b",
    face: "photo",
    invite: "after-works",
    memory: "今日の花は店先",
    absent: ["values", "accordions"],
    order: ["photos", "works", "hero", "hours", "access", "address", "contact"],
    blockOff: ["values", "accordions"]
  },
  "03": {
    folder: "03-cafe-mix-ink-c",
    face: "catch",
    invite: "after-catch",
    memory: "夜のカウンター",
    absent: ["access", "address"],
    order: ["hero", "contact", "photos", "works", "values", "hours", "accordions"],
    extrasOff: ["access", "address"]
  },
  "04": {
    folder: "04-salon-clinic-a",
    face: "booking",
    invite: "after-hours",
    memory: "落ち着いて相談できる",
    absent: ["photos"],
    order: ["hours", "contact", "hero", "values", "works", "access", "address", "accordions"],
    blockOff: ["photos"]
  },
  "05": {
    folder: "05-salon-sakura-b",
    face: "catch",
    invite: "end",
    memory: "淡い午後の一口",
    absent: ["accordions"],
    order: ["hero", "values", "photos", "works", "hours", "access", "contact", "address"],
    blockOff: ["accordions"]
  },
  "06": {
    folder: "06-bakery-brick-a",
    face: "menu",
    invite: "after-photos",
    memory: "ケースのパンが欲しい",
    absent: ["values", "accordions"],
    order: ["works", "photos", "hero", "hours", "access", "contact", "address"],
    blockOff: ["values", "accordions"]
  },
  "07": {
    folder: "07-bakery-cafe-c",
    face: "catch",
    invite: "end",
    memory: "湯気の一杯",
    absent: ["access", "address", "accordions"],
    order: ["hero", "works", "photos", "values", "hours", "contact"],
    blockOff: ["accordions"],
    extrasOff: ["access", "address"]
  },
  "08": {
    folder: "08-bar-ink-b",
    face: "photo",
    invite: "after-photos",
    memory: "この客室に泊まりたい",
    absent: ["values", "accordions"],
    order: ["photos", "works", "contact", "hours", "access", "address", "hero"],
    blockOff: ["values", "accordions"]
  },
  "09": {
    folder: "09-bar-brick-a",
    face: "photo",
    invite: "after-hours",
    memory: "光で呼吸がそろう",
    absent: ["works"],
    order: ["photos", "values", "hours", "contact", "hero", "access", "address", "accordions"],
    blockOff: ["works"]
  },
  "10": {
    folder: "10-clinic-green-a",
    face: "menu",
    invite: "mid",
    memory: "提灯の路地一杯",
    absent: ["values", "accordions"],
    order: ["works", "photos", "hero", "hours", "access", "contact", "address"],
    blockOff: ["values", "accordions"]
  },
  "11": {
    folder: "11-clinic-clinic-b",
    face: "booking",
    invite: "after-hours-access",
    memory: "ゆっくり診てもらえる",
    absent: ["photos", "works"],
    order: ["hours", "access", "contact", "hero", "values", "accordions", "address"],
    blockOff: ["photos", "works"]
  },
  "12": {
    folder: "12-florist-sakura-a",
    face: "catch",
    invite: "after-catch",
    memory: "散歩を任せられる",
    absent: ["photos", "hours", "access", "address"],
    order: ["hero", "contact", "works", "values", "accordions"],
    blockOff: ["photos"],
    extrasOff: ["hours", "access", "address"]
  },
  "13": {
    folder: "13-florist-green-c",
    face: "service",
    invite: "after-values",
    memory: "席の使い方が分かる",
    absent: ["hero"],
    order: ["values", "works", "photos", "contact", "hours", "access", "address", "accordions"],
    blockOff: ["hero"]
  },
  "14": {
    folder: "14-ramen-brick-b",
    face: "works",
    invite: "none",
    memory: "白い壁に作品だけ",
    absent: ["contact", "hours", "values", "accordions"],
    order: ["works", "photos", "access", "address", "hero"],
    blockOff: ["contact", "values", "accordions"],
    extrasOff: ["hours"]
  },
  "15": {
    folder: "15-ramen-ink-a",
    face: "catch",
    invite: "mid",
    memory: "焼きたての朝",
    absent: ["accordions"],
    order: ["hero", "values", "photos", "works", "hours", "access", "contact", "address"],
    blockOff: ["accordions"]
  },
  "16": {
    folder: "16-yoga-green-a",
    face: "booking",
    invite: "after-hours",
    memory: "予約しやすいサロン",
    absent: ["photos"],
    order: ["hours", "contact", "hero", "values", "works", "access", "address", "accordions"],
    blockOff: ["photos"]
  },
  "17": {
    folder: "17-yoga-sakura-b",
    face: "catch",
    invite: "after-catch",
    memory: "貸切したくなる夜",
    absent: ["access", "address", "values"],
    order: ["hero", "contact", "photos", "works", "hours", "accordions"],
    blockOff: ["values"],
    extrasOff: ["access", "address"]
  },
  "18": {
    folder: "18-studio-clinic-c",
    face: "works",
    invite: "after-works",
    memory: "この人に撮ってほしい",
    absent: ["hero", "values", "accordions"],
    order: ["works", "photos", "contact", "hours", "access", "address"],
    blockOff: ["hero", "values", "accordions"]
  },
  "19": {
    folder: "19-studio-ink-a",
    face: "menu",
    invite: "end",
    memory: "暖簾の湯気",
    absent: ["values", "accordions"],
    order: ["works", "photos", "hero", "hours", "access", "contact", "address"],
    blockOff: ["values", "accordions"]
  },
  "20": {
    folder: "20-pet-cafe-b",
    face: "catch",
    invite: "after-works",
    memory: "午後のご褒美",
    absent: ["access", "accordions"],
    order: ["hero", "works", "photos", "values", "contact", "hours", "address"],
    blockOff: ["accordions"],
    extrasOff: ["access"]
  },
  "21": {
    folder: "21-pet-sakura-a",
    face: "catch-text",
    invite: "end",
    memory: "静かな緑の一杯",
    absent: ["heroImg"],
    order: ["hero", "values", "photos", "works", "hours", "access", "address", "contact"],
    heroImageOff: true
  },
  "22": {
    folder: "22-cowork-clinic-b",
    face: "menu",
    invite: "end",
    memory: "暖簾の向こうの一献",
    absent: ["values", "accordions"],
    order: ["works", "photos", "hero", "hours", "access", "contact", "address"],
    blockOff: ["values", "accordions"]
  },
  "23": {
    folder: "23-cowork-green-a",
    face: "service",
    invite: "mid",
    memory: "共に座れる場所",
    absent: [],
    order: ["values", "photos", "works", "hero", "hours", "access", "contact", "address"]
  },
  "24": {
    folder: "24-sweets-sakura-c",
    face: "booking",
    invite: "after-hours",
    memory: "不安が短い診療",
    absent: ["photos", "works"],
    order: ["hours", "contact", "hero", "values", "access", "address", "accordions"],
    blockOff: ["photos", "works"]
  },
  "25": {
    folder: "25-sweets-cafe-a",
    face: "menu",
    invite: "mid",
    memory: "焼き立てが欲しい",
    absent: ["values", "accordions"],
    order: ["works", "photos", "hero", "hours", "access", "address", "contact"],
    blockOff: ["values", "accordions"]
  },
  "26": {
    folder: "26-izakaya-brick-c",
    face: "works",
    invite: "none",
    memory: "墨と白の切り取り",
    absent: ["contact", "hours", "values", "accordions"],
    order: ["works", "photos", "access", "address", "hero"],
    blockOff: ["contact", "values", "accordions"],
    extrasOff: ["hours"]
  },
  "27": {
    folder: "27-izakaya-ink-b",
    face: "photo",
    invite: "after-photos",
    memory: "一晩だけの旅",
    absent: ["values", "accordions"],
    order: ["photos", "works", "contact", "hours", "access", "hero", "address"],
    blockOff: ["values", "accordions"]
  },
  "28": {
    folder: "28-gallery-ink-a",
    face: "photo",
    invite: "none",
    memory: "葉音のなかの呼吸",
    absent: ["contact", "hero", "accordions"],
    order: ["photos", "works", "values", "hours", "access", "address"],
    blockOff: ["contact", "hero", "accordions"]
  },
  "29": {
    folder: "29-gallery-clinic-c",
    face: "place",
    invite: "after-access-hours",
    memory: "近くで束ねて持ち帰れる",
    absent: ["values", "accordions"],
    order: ["access", "hours", "contact", "photos", "works", "hero", "address"],
    blockOff: ["values", "accordions"]
  },
  "30": {
    folder: "30-hotel-cafe-b",
    face: "works",
    invite: "end",
    memory: "額の灯りと作品",
    absent: ["hours"],
    order: ["works", "photos", "accordions", "hero", "values", "address", "contact", "access"],
    extrasOff: ["hours"]
  }
};

function patchDraft(plan) {
  const file = path.join(ROOT, plan.folder, "draft.json");
  const draft = JSON.parse(fs.readFileSync(file, "utf8"));

  const blockOff = {};
  (plan.blockOff || []).forEach((id) => {
    blockOff[id] = true;
  });

  const extras = Object.assign(
    { hours: true, access: true, address: true },
    draft.draftExtras || {}
  );
  (plan.extrasOff || []).forEach((id) => {
    extras[id] = false;
  });
  /* Ensure on for extras that appear in active order */
  ["hours", "access", "address"].forEach((id) => {
    if ((plan.extrasOff || []).indexOf(id) >= 0) return;
    if (plan.order.indexOf(id) >= 0) extras[id] = true;
  });

  draft.layoutOrder = plan.order.slice();
  draft.layoutBlockOff = blockOff;
  draft.draftExtras = extras;
  draft.brushUpMeaning = "2026-09-15-v01";
  draft.structureFace = plan.face;
  draft.structureInvite = plan.invite;
  draft.structureMemory = plan.memory;
  draft.structureAbsent = plan.absent.slice();
  draft.brushUpStructure = draft.brushUpStructure || "2026-09-14-v01";

  if (plan.heroImageOff) {
    draft.heroImageOff = true;
    draft.heroTextOnPhoto = true;
    if (draft.imagePaths && draft.imagePaths.hero_image) {
      delete draft.imagePaths.hero_image;
    }
  } else {
    delete draft.heroImageOff;
  }

  /* Keep normalize-friendly: append any missing ALL ids at end (hidden ones still in order for wire) */
  ALL.forEach((id) => {
    if (draft.layoutOrder.indexOf(id) < 0) draft.layoutOrder.push(id);
  });

  fs.writeFileSync(file, JSON.stringify(draft, null, 2) + "\n", "utf8");
  return plan.folder;
}

const keys = Object.keys(PLANS).sort();
const done = [];
keys.forEach((k) => {
  done.push(patchDraft(PLANS[k]));
});
console.log("patched", done.length, "drafts");
done.forEach((f) => console.log(" -", f));
