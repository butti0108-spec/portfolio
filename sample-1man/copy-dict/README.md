# copy-dict（部品辞典）

工房内の文章部品倉庫。実行時は **同じ `sample-1man` オリジン**からだけ読む（外の GitHub Pages / 別リポは見ない）。

## ファイル

| パス | 役割 |
|------|------|
| `meta.json` | axis・section・keyword（方向チップ）対応 |
| `presets.json` | おまかせ用。完成文は持たない。枠ごとの `axisId` 並び |
| `scenes/_index.json` | scene → ファイル名。無い scene は `fallback` |
| `scenes/<scene>.json` | 部品配列 |

## 部品フィールド

```json
{
  "id": "cafe_open_calm_01",
  "text": "短いフレーズ",
  "slot": "open",
  "axisIds": ["ease"],
  "sectionIds": ["hero", "about"],
  "keywordIds": ["calm"],
  "weight": 1
}
```

- `slot`: `open` | `mid` | `close`
- 生成は **axis を先に3つ選ぶ** → 各1文（open+mid+close）
- キーワードはプール絞りに使う。おまかせは preset の axis 並び

## 見本・用途の寄せ先

優先: **人の選択・入力 ＞ 用途 ＞ 見本の初期ヒント**

1. `sitePurpose` → `meta.purposeScenes`（例: service→salon。`shop` は null＝見本ヒントを使う）
2. 無い／薄いとき `sushiSampleKey` 先頭トークン（例 `cafe-warm-a` → cafe）
3. さらに無ければ `fallbackScene`（cafe）

キーワードは scene 固定ではなく axis 絞り。店名は差し込み材料のみ。

## エンジン

`copy-dict-engine.js` → `window.Sample1manCopyDict`（`resolveScene` / `generateThree`）

