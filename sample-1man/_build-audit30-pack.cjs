/**
 * Build audit pack HTML + PDF + fulltext from shots/
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "docs", "share", "2026-09-19-sample30-audit");
const SHOTS = path.join(OUT, "shots");
const SUSHI = path.join(ROOT, "sample-1man", "sushi-samples");

fs.mkdirSync(OUT, { recursive: true });

// rename 01-01-foo.png -> 01-foo.png
for (const name of fs.readdirSync(SHOTS)) {
  const m = name.match(/^(\d{2})-\1-(.+)\.png$/);
  if (!m) continue;
  const dest = path.join(SHOTS, `${m[1]}-${m[2]}.png`);
  const src = path.join(SHOTS, name);
  if (!fs.existsSync(dest)) fs.renameSync(src, dest);
  else fs.unlinkSync(src);
}

const pngs = fs
  .readdirSync(SHOTS)
  .filter((n) => n.endsWith(".png"))
  .sort((a, b) => a.localeCompare(b, "en"));

function brandOf(id) {
  const dir = fs.readdirSync(SUSHI).find((d) => d.startsWith(id + "-"));
  if (!dir) return "";
  try {
    const j = JSON.parse(fs.readFileSync(path.join(SUSHI, dir, "draft.json"), "utf8"));
    return (j.fields && j.fields.brand_name) || "";
  } catch {
    return "";
  }
}

function folderOf(id) {
  return fs.readdirSync(SUSHI).find((d) => d.startsWith(id + "-")) || "";
}

let html = `<!DOCTYPE html>
<html lang="ja"><head><meta charset="utf-8">
<title>見本30・監査用スクショ一覧 1200x1694</title>
<style>
@page{size:A4;margin:10mm}
body{font-family:"Segoe UI","Hiragino Sans","Noto Sans JP",sans-serif;margin:0;padding:16px;color:#111;background:#f4f4f4}
h1{font-size:20px;margin:0 0 8px}
.meta{font-size:12px;color:#444;margin-bottom:20px;line-height:1.55}
.toc a{margin-right:8px;font-size:12px}
.card{background:#fff;border:1px solid #ccc;margin:0 0 18px;padding:12px;page-break-after:always;break-after:page}
.card:last-child{page-break-after:auto}
.card h2{font-size:15px;margin:0 0 8px}
.card img{display:block;width:100%;max-width:1200px;height:auto;border:1px solid #ddd}
.okng{margin-top:8px;font-size:13px}
.okng span{display:inline-block;margin-right:16px}
@media print{body{background:#fff;padding:0}.card{border:0;box-shadow:none;margin:0;padding:0}}
</style></head><body>
<h1>見本30・監査用スクショ一覧（1200×1694）</h1>
<div class="meta">日付: 2026-09-19<br>
用途: 観察官向け一括共有（画像20枚制限の回避）<br>
判定: 各ページ末尾の OK / NG に印<br>
注意: ファイルが極端に小さい号は白欠け・画像欠落の可能性あり</div>
<div class="toc"><strong>目次:</strong> `;

for (const p of pngs) {
  const id = p.slice(0, 2);
  html += `<a href="#${id}">${id}</a> `;
}
html += `</div>\n`;

for (const p of pngs) {
  const id = p.slice(0, 2);
  const brand = brandOf(id);
  const kb = Math.round(fs.statSync(path.join(SHOTS, p)).size / 1024);
  html += `<section class="card" id="${id}">
<h2>${id}　${brand}　<code>${p.replace(/\.png$/, "")}</code>　(${kb}KB)</h2>
<img src="shots/${encodeURIComponent(p)}" alt="${id}" width="1200" height="1694">
<div class="okng"><span>□ OK（例に流す）</span><span>□ NG（差し戻し）</span><span>メモ: _______________</span></div>
</section>\n`;
}
html += `</body></html>\n`;
const htmlPath = path.join(OUT, "index.html");
fs.writeFileSync(htmlPath, html, "utf8");
console.log("HTML", htmlPath);

// PDF via Edge
const edgeCandidates = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];
const edge = edgeCandidates.find((p) => fs.existsSync(p));
const pdfPath = path.join(OUT, "sample30-audit-1200x1694.pdf");
if (edge) {
  const fileUrl = "file:///" + htmlPath.replace(/\\/g, "/");
  spawnSync(
    edge,
    [
      "--headless=new",
      "--disable-gpu",
      "--allow-file-access-from-files",
      "--no-pdf-header-footer",
      `--print-to-pdf=${pdfPath}`,
      fileUrl,
    ],
    { stdio: "ignore" }
  );
  if (fs.existsSync(pdfPath)) {
    console.log("PDF", pdfPath, fs.statSync(pdfPath).size);
  } else {
    console.log("PDF FAIL");
  }
} else {
  console.log("Edge not found; skip PDF");
}

// Fulltext 30
const KEYS = [
  "brand_name",
  "hero_title",
  "hero_lead_1",
  "hero_lead_2",
  "hero_lead_3",
  "value_1_title",
  "value_1_text",
  "value_2_title",
  "value_2_text",
  "value_3_title",
  "value_3_text",
  "about_section_name",
  "about_heading",
  "about_name",
  "about_lead",
  "acc_1_title",
  "acc_1_body",
  "acc_2_title",
  "acc_2_body",
  "works_section_name",
  "works_heading",
  "works_lead",
  "work_1_title",
  "work_1_text",
  "work_2_title",
  "work_2_text",
  "work_3_title",
  "work_3_text",
  "hours_text",
  "address_text",
  "access_text",
  "contact_section_name",
  "contact_label",
  "contact_email",
  "contact_note_1",
  "contact_note_2",
];

let md = `# 見本30・掲載文言 全文一覧（監査提出）

- 日付: 2026-09-19
- 範囲: sushi-samples 01–30 / draft.json fields / 省略なし
- 対になるスクショ: [sample30-audit-1200x1694.pdf](./sample30-audit-1200x1694.pdf) / [index.html](./index.html)

## 索引

| No | 屋号 | folder |
|----|------|--------|
`;

let body = "\n## 全文\n";
for (let n = 1; n <= 30; n++) {
  const id = String(n).padStart(2, "0");
  const folder = folderOf(id);
  if (!folder) continue;
  const j = JSON.parse(fs.readFileSync(path.join(SUSHI, folder, "draft.json"), "utf8"));
  const f = j.fields || {};
  const brand = f.brand_name || "";
  md += `| ${id} | ${brand} | \`${folder}\` |\n`;
  body += `\n---\n\n## ${id}　${brand}\n\n`;
  body += `- folder: \`${folder}\`\n`;
  body += `- scene: ${j.scene || ""}\n`;
  if (j.layoutBlockOff) {
    const off = Object.entries(j.layoutBlockOff)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join(", ");
    body += `- layoutBlockOff: ${off}\n`;
  }
  body += `\n`;
  for (const k of KEYS) {
    let v = f[k];
    if (v == null || String(v).trim() === "") v = "（空）";
    body += `### ${k}\n\n${v}\n\n`;
  }
}
md += body;
const copyPath = path.join(OUT, "00-copy-fulltext-30.md");
fs.writeFileSync(copyPath, md, "utf8");
console.log("COPY", copyPath, md.length);

const readme = `# 見本30・監査パック（2026-09-19）

## 観察官への共有

| ファイル | 内容 |
|----------|------|
| **sample30-audit-1200x1694.pdf** | 30号スクショを1冊にまとめたPDF（推奨） |
| **index.html** | 同じ一覧のHTML（ブラウザでOK/NG記入） |
| **00-copy-fulltext-30.md** | 全号の掲載文言全文 |
| **shots/** | 個別PNG（1200×1694） |

## 規定サイズ

1200 × 1694（寿司タイル 170×240 と同比）

## 判定

1. PDF または index.html を開く
2. 各号に □ OK（例に流す） / □ NG（差し戻し）
3. NGは号＋一言メモを返す

## 注意

ファイルサイズが極端に小さい号は白欠け・画像欠落の可能性 → 要目視
`;
fs.writeFileSync(path.join(OUT, "README.md"), readme, "utf8");
console.log("DONE", OUT);
