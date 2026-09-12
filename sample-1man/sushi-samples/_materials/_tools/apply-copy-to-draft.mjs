#!/usr/bin/env node
/**
 * Apply _materials/<folder>/copy.json (+ meta.json) into <folder>/draft.json
 * Usage: node apply-copy-to-draft.mjs 01-cafe-warm-a
 *        node apply-copy-to-draft.mjs --all-a2-ok   (only if STATUS says 材料OK — not used by default)
 */
const fs = require("fs");
const path = require("path");

const toolsDir = __dirname;
const materialsDir = path.dirname(toolsDir);
const sushiDir = path.dirname(materialsDir);

function applyFolder(folder) {
  const copyPath = path.join(materialsDir, folder, "copy.json");
  const metaPath = path.join(materialsDir, folder, "meta.json");
  const draftPath = path.join(sushiDir, folder, "draft.json");
  if (!fs.existsSync(copyPath)) throw new Error("missing " + copyPath);
  if (!fs.existsSync(draftPath)) throw new Error("missing " + draftPath);

  const copy = JSON.parse(fs.readFileSync(copyPath, "utf8"));
  const draft = JSON.parse(fs.readFileSync(draftPath, "utf8"));
  draft.fields = draft.fields || {};

  for (const [k, v] of Object.entries(copy)) {
    if (k === "note") continue;
    draft.fields[k] = v == null ? "" : String(v);
  }

  if (fs.existsSync(metaPath)) {
    const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
    if (meta.counts) {
      draft.draftCounts = Object.assign({}, draft.draftCounts || {}, meta.counts);
    }
    if (meta.extras) {
      draft.draftExtras = Object.assign({}, draft.draftExtras || {}, meta.extras);
    }
    if (meta.fonts) {
      draft.fonts = meta.fonts;
      if (meta.fonts.display) draft.fields.font_display = meta.fonts.display;
      if (meta.fonts.catch) draft.fields.font_catch = meta.fonts.catch;
      if (meta.fonts.body) draft.fields.font_body = meta.fonts.body;
    }
    if (meta.layoutPattern) draft.layoutPattern = meta.layoutPattern;
    if (Array.isArray(meta.layoutOrder)) draft.layoutOrder = meta.layoutOrder;
    if (meta.scene) draft.scene = meta.scene;
    if (meta.colorKey) draft.chosenPresetKey = meta.colorKey;
  }

  draft.savedAt = new Date().toISOString();
  fs.writeFileSync(draftPath, JSON.stringify(draft, null, 2) + "\n", "utf8");
  console.log("applied", folder);
}

const arg = process.argv[2];
if (!arg) {
  console.error("Usage: node apply-copy-to-draft.mjs <folder>");
  process.exit(1);
}
applyFolder(arg);
