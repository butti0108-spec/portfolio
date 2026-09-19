/**
 * 見本30: 連絡小さめラベルOFF + 数号をそのまま表示(flat)
 * 実行: node sushi-samples/_tools/patch-contact-flat-washout.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

/** アコーディオンではなく「そのまま表示」にする号（業種・色を散らす） */
const FLAT_IDS = new Set(["01", "06", "12", "18", "23", "29"]);

const dirs = fs
  .readdirSync(root, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^\d{2}-/.test(d.name))
  .map((d) => d.name)
  .sort();

let nContact = 0;
let nFlat = 0;

for (const dir of dirs) {
  const id = dir.slice(0, 2);
  const draftPath = path.join(root, dir, "draft.json");
  if (!fs.existsSync(draftPath)) continue;
  const raw = fs.readFileSync(draftPath, "utf8");
  const draft = JSON.parse(raw);

  draft.draftContact = {
    label: false,
    note1: true,
    note2: true,
    ...(draft.draftContact && typeof draft.draftContact === "object" ? draft.draftContact : {}),
    label: false
  };
  nContact += 1;

  if (FLAT_IDS.has(id)) {
    draft.aboutItemsDisplay = "flat";
    nFlat += 1;
  } else if (draft.aboutItemsDisplay == null) {
    draft.aboutItemsDisplay = "accordion";
  }

  draft.brushUpUiFix = "2026-09-19-washout-contact-flat";
  fs.writeFileSync(draftPath, JSON.stringify(draft, null, 2) + "\n", "utf8");
  console.log(
    id,
    "contact.label=off",
    draft.aboutItemsDisplay === "flat" ? "flat" : "accordion"
  );
}

console.log("done: contact", nContact, "flat", nFlat);
