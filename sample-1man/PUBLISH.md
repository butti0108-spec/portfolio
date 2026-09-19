# sample-1man 本番公開対象（マニフェスト）

ローカルではポートフォリオ＋メーカー＋開発レビューを一体管理する。  
**WordPress 本番へ載せるのは顧客向け一式だけ。** 開発・レビュー専用は載せない。

更新: 2026-09-16（レビュー統合）

---

## 本番に含める

| パス | 内容 |
|------|------|
| `sample-1man/index.html` | メーカー本体 |
| `sample-1man/help.html` / `help.js` / `help.css`（あれば） | 操作ヘルプ |
| `sample-1man/script.js` | 本体ロジック |
| `sample-1man/sample-overrides.css` | メーカー専用スタイル |
| `sample-1man/sushi-belt.js` / `vibe-dict.js` / `easy-copy-dict.js` | 寿司・辞書 |
| `sample-1man/brand/` | 屋号ロゴ等 |
| `sample-1man/images/` | メーカー用画像（顧客向け） |
| `sample-1man/sushi-samples/manifest.json` | 見本一覧 |
| `sample-1man/sushi-samples/NN-*/` | 各見本の `draft.json` / `images/` / `preview.png`（公開に使うもの） |
| リポジトリ根の `style.css` | メーカーが `../style.css` で参照。サイト根に配置すること |

あわせて本番テーマ ZIP（`wp-theme/masubuchi-portfolio/`）を反映する。  
テーマは `/sample-1man/` へリンクする前提。

---

## 本番に含めない（ローカル専用）

| パス | 理由 |
|------|------|
| `sample-1man/review-dash/` | 見本検品 UI（旧入口。リダイレクトのみ残しても本番不要） |
| `sample-1man/review-mode.js` / `review-mode.css` | 同一文書レビュー（`?review=1`） |
| 編集ハブ「レビュー」カード | `localhost` のときだけ表示。本番ホストでは非表示 |
| 共有パック JSON の入出力 | ローカル作業用。本番導線に載せない |
| `sample-1man/_dev-server.ps1` / `_static-server.js` | ローカルサーバ＋保存 API |
| `sushi-samples/__capture-save` / `__review-decision` / `__draft-save` | API はローカルサーバ実装のみ |
| `sushi-samples/_materials/` | 制作材料 |
| `sushi-samples/_plot/` | プロット正本 |
| `sushi-samples/_sales/`（運用方針による） | 営業格納。公開サイトに不要なら除外 |
| `sushi-samples/_capture-progress.json` 等 | 作業用 |
| `docs/share/` の監査ショット | 共有用・本番サイト外 |

認証は作らない。**載せないことが分離の本体。**

---

## ローカルでのレビュー入口

1. `_dev-server.ps1` または `_static-server.js` を起動（ポートフォリオ根を配信）
2. 本線: `http://127.0.0.1:PORT/sample-1man/index.html?review=1`  
   または編集ハブ → **レビュー**
3. 流れ: 見る → 編集 → **これで確定**（`draft.json` 更新）→ 次へ  
4. JSON読み込み／書き出しはレビュー内のサブ操作  
5. 旧 URL `…/review-dash/` は `?review=1` へ誘導

正本メモ: `docs/進行中/2026-09-16-検品調整パック-工程1.md`

---

## 確認チェック（アップロード前）

- [ ] 上記「含めない」パスが ZIP／FTP 対象に入っていない
- [ ] `/sample-1man/` でメーカーが開き、ポートフォリオからリンクできる
- [ ] 本番ホストでは「レビュー」カードが出ない
- [ ] `?review=1` を本番 URL で開いても API が無い（保存・STATUS 更新は失敗してよい。載せないのが正）
