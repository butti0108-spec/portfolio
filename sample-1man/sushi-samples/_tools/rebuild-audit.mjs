/**
 * 見本30 rebuild 通し監査（読み取り専用レポート）
 * Usage: node sample-1man/sushi-samples/_tools/rebuild-audit.mjs
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SOFT_NG = [
  "排便",
  "尿検査",
  "血液検査",
  "大便",
  "おしっこ",
  "ウンチ",
  "持ち帰る束",
  "スタンダード束",
];
const AWKWARD = ["持ち帰りやすい束", "靴を脱がずに"];

function listSampleDirs() {
  return fs
    .readdirSync(ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^\d{2}-/.test(d.name))
    .map((d) => d.name)
    .sort();
}

function checkDraft(folder) {
  const draftPath = path.join(ROOT, folder, "draft.json");
  const issues = [];
  if (!fs.existsSync(draftPath)) {
    return [`MISSING draft.json`];
  }
  let draft;
  try {
    draft = JSON.parse(fs.readFileSync(draftPath, "utf8"));
  } catch (e) {
    return [`INVALID JSON: ${e.message}`];
  }
  if (!draft.designBrief || !draft.designBrief.worldviewOneLiner) {
    issues.push("no designBrief.worldviewOneLiner");
  }
  const brush = String(draft.brushUpPhoto || "");
  if (!brush.includes("2026-09-19") && !brush.includes("rebuild") && !brush.includes("card-upper")) {
    // 01/02 may use rebuild-01 / card-upper; flag only if totally old
    if (!/^01-|^02-/.test(folder) && !brush.includes("rebuild")) {
      issues.push(`brushUpPhoto not rebuild-tagged: ${brush}`);
    }
  }
  const fields = draft.fields || {};
  const blob = JSON.stringify(fields);
  for (const w of SOFT_NG) {
    if (blob.includes(w)) issues.push(`SOFT_NG word: ${w}`);
  }
  for (const w of AWKWARD) {
    if (blob.includes(w)) issues.push(`AWKWARD: ${w}`);
  }
  const images = draft.imagePaths || {};
  for (const [k, v] of Object.entries(images)) {
    const p = String(v || "");
    if (!p || p.includes("=photo") || p.includes("/=")) {
      issues.push(`bad imagePath ${k}: ${p}`);
      continue;
    }
    const rel = p.split("?")[0].replace(/^sushi-samples\//, "");
    // path like 03-.../images/hero.jpg relative to sushi-samples
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) {
      // try folder/images from key
      const alt = path.join(ROOT, folder, "images", path.basename(rel));
      if (!fs.existsSync(alt)) issues.push(`missing file ${k}: ${p}`);
    }
  }
  const brand = fields.brand_name || "";
  return { folder, brand, issues, brushUpPhoto: brush };
}

function main() {
  const rows = listSampleDirs().map(checkDraft);
  let fail = 0;
  for (const r of rows) {
    if (typeof r === "string" || !r.issues) continue;
    if (r.issues.length) {
      fail++;
      console.log(`NG ${r.folder} (${r.brand})`);
      for (const i of r.issues) console.log(`  - ${i}`);
    } else {
      console.log(`OK ${r.folder} (${r.brand}) [${r.brushUpPhoto}]`);
    }
  }
  console.log(`\nDone. ${fail} sample(s) with issues.`);
  process.exit(fail ? 1 : 0);
}

main();
