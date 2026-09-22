# 無料写真ギャラリー

- 開始: 2026-09-19
- 目的: 写真が用意できない人向けに、「そのまま使ってよい」画像を渡す
- **見本本体（sushi-samples/*/images）は触らない**

## I-1（2026-09-22）最小本番

- 主戦力: `ai-or-original/`（`color-insert` 除外）
- 機械可読一覧: `catalog.json`（id / path / scene / tags / shape）
- UI: `index.html` + `gallery.js` + `gallery.css`
- メーカー入口: サンプル本線 `easy-img-wire` の「ギャラリーから選ぶ」

## 進捗

- **01〜30** クル画像生成控えが `ai-or-original/` にあり
- タグは粗一次（迷いは `indoor` 等へ寄せた）
- おまかせ Coolors／二本立ては **未着手（I-2以降）**

| 場所 | 内容 |
|------|------|
| `catalog.json` | ギャラリー一覧 |
| `ai-or-original/` | 生成／オリジナル主戦力 |
| `_audit/` | 監査メモ |
| `approved/` | 再配布OK確定分（まだ空寄り） |
| `trim-card/` | カード上寄せ用（approved後） |
