# A2 材料確認チェック（前半一括ゲート）

ルール: **copy.json の文言だけ**見る。レビューダッシュの見た目はまだ見ない（前提 2-C）。

判定: `OK` / `直して` / `この号だけ差し替え`

## cafe（01–03）— 着手ブロック

| No | brand | 世界観 | 判定 | メモ |
|----|-------|--------|------|------|
| 01 | 木漏れ日カフェ | カフェ・朝・木目 | （合格例・提出済） | exemplar |
| 02 | 花便り 店先 | 花屋・店先 | | |
| 03 | グラスサイド | バー・グラス | | |

**止める**: 上表が人で埋まるまで B1（draft反映）に進まない。※01のみ合格例として draft 反映済み可。

## 他ブロック（A1下書き提出済・A2待ち）

salon 04–05 / bakery 06–07 / bar 08–09 / clinic 10–11 / florist 12–13 / ramen 14–15 / yoga 16–17 / studio 18–19 / pet 20–21 / cowork 22–23 / sweets 24–25 / izakaya 26–27 / gallery 28–29 / hotel 30

各 `_materials/NN/copy.json` の `note` が `A1下書き` のもの。ブロック単位で同じ表を複製して判定する。

## 反映手順（A2 OK後・後半個別）

```powershell
cd sample-1man/sushi-samples
powershell -NoProfile -File _materials\_tools\apply-copy-to-draft.ps1 -Folder 02-cafe-split-b
```

続けて review-dash で B2 再判定。
