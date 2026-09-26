/**
 * シーン名を tagLabels に足し、各 item.tags へ scene キーを追加する（既存タグは消さない）。
 * Usage: node _sync-scene-tags.js
 */
const fs = require("fs");
const path = require("path");

const catalogPath = path.join(__dirname, "catalog.json");
const SCENE_LABELS = {
  cafe: "カフェ",
  salon: "サロン",
  bakery: "ベーカリー",
  bar: "バー",
  clinic: "クリニック",
  cowork: "コワーキング",
  florist: "花屋",
  gallery: "ギャラリー",
  hotel: "宿",
  izakaya: "居酒屋",
  pet: "ペット",
  ramen: "ラーメン",
  studio: "スタジオ",
  sweets: "スイーツ",
  yoga: "ヨガ"
};

const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
if (!catalog.tagLabels || typeof catalog.tagLabels !== "object") catalog.tagLabels = {};

const beforeLabels = Object.keys(catalog.tagLabels).length;
let addedLabels = 0;
let taggedItems = 0;

Object.keys(SCENE_LABELS).forEach((key) => {
  if (!catalog.tagLabels[key]) {
    catalog.tagLabels[key] = SCENE_LABELS[key];
    addedLabels += 1;
  }
});

(catalog.items || []).forEach((item) => {
  const scene = item && item.scene;
  if (!scene) return;
  if (!catalog.tagLabels[scene] && item.sceneLabel) {
    catalog.tagLabels[scene] = String(item.sceneLabel);
    addedLabels += 1;
  }
  if (!Array.isArray(item.tags)) item.tags = [];
  if (item.tags.indexOf(scene) < 0) {
    item.tags = [scene].concat(item.tags);
    taggedItems += 1;
  }
});

catalog.updated = new Date().toISOString().slice(0, 10);
catalog.note =
  "シーンをタグに反映済み。内容タグの仕分け・下半分トリムは admin で人が直す。";

fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 4) + "\n", "utf8");
console.log(
  JSON.stringify(
    {
      ok: true,
      items: (catalog.items || []).length,
      tagLabelsBefore: beforeLabels,
      tagLabelsAfter: Object.keys(catalog.tagLabels).length,
      addedLabels,
      itemsGotSceneTag: taggedItems
    },
    null,
    2
  )
);
