# 無料写真ギャラリー

- 開始: 2026-09-19
- 目的: 写真が用意できない人向けに、「そのまま使ってよい」画像を渡す
- **見本本体（sushi-samples/*/images）は触らない**

## いまの区切り（2026-09-22）

| 区切り | 状態 | 内容 |
|--------|------|------|
| I-1 棚 | 済 | `catalog.json`＋ギャラリーUI。メーカーは「ギャラリーから選ぶ」 |
| I-2 二本立て | 済 | おまかせ／自分で選ぶ |
| I-3 おまかせ Coolors | 済 | 抽選・鍵・もう一度。本線はワイヤー飛ばし可 |
| I-4 編集ハブ合流 | 済 | ハブのキャッチ／写真／カードも同じ棚 |
| I-5 形・カード用 | 済 | `trim-card/`＋カード上寄せはめ込み |

## 置き場

| 場所 | 内容 |
|------|------|
| `catalog.json` | ギャラリー一覧（id / path / scene / tags / shape / 任意 `trimCardPath`） |
| `ai-or-original/` | 生成／オリジナル主戦力（`color-insert` 除外） |
| `trim-card/` | **カード枠向け**の上半分中心トリム種（少数）。見本本体は触らない |
| `_audit/` | 監査メモ |
| `approved/` | 再配布OK確定分（空寄り） |

## `trim-card/` の使い方

- **誰向け**: 半幅カードで「下半分が弱い／帯に隠れる」とき
- **中身**: 元写真の上側を残した JPEG。フォルダ構成は `ai-or-original` と同じ相対パス
- **catalog**: 種がある件だけ `trimCardPath`（例: `trim-card/01-cafe-warm-a/work-01.jpg`）とタグ `card-upper`
- **はめ込み**:
  - **カード枠（works）**: `trimCardPath` があればそれを優先。無ければ通常 `path` ＋ cover ＋ `object-position: center top`
  - **キャッチ／写真（about）**: 従来どおり（trim は当てない）
- **やらないこと**: 全215件の手トリム量産。sushi見本の差し替え

## メーカー入口

- サンプル本線: `easy-img-path` → おまかせ／自分で選ぶ（ワイヤー or Coolors）
- 編集ハブ: `hero-image`／`about-images`／`works-images` も同じ棚
- 単独閲覧: `index.html`
