# 実装チケット

最初のリリース目標は、監修済み15〜20問を使った診断プロトタイプ（Milestone 3a）とする。Milestone 3bの利用者テストに合格するまで、64問制作と公開βへ進まない。

## 実施順

1. `M0-1` React・TypeScript・Vite・Workers Static Assets基盤
2. `M0-2` lint・typecheck・unit・E2E・buildのCI
3. `M0-3` App Shell、デザイントークン、アクセシビリティ土台
4. `M1-1` Tile・Hand・Payment・Question型
5. `M1-2` 決定論的な点数計算
6. `M1-3` golden fixturesとproperty tests
7. `M2-1` 問題バンクschemaと仮問題15問
8. `M2-2` 5問セッション、正誤、内訳、結果
9. `M2-3` 牌SVGとアクセシブルな代替テキスト
10. `M2-4` sessionStorage・localStorageと復元
11. `M3A-1` 二重監修済み15〜20問
12. `M3A-2` 誤答プローブと適応出題
13. `M3A-3` 5種類の結果決定表
14. `M3A-4` 固定seedシナリオと1,000 seed検査

## 現在のチケット

### M0-1 デプロイ可能なscaffold

- React画面がローカルで起動する。
- `npm run build`が成功する。
- `npm run deploy:dry-run`でWorkers bundleを検証できる。
- `/`、`/rules`、`/privacy`、`/settings`、`/about`を直接開ける。

### M0-2 品質・CI基盤

- `npm run check`でformat、lint、typecheck、unit、buildを検証する。
- Playwrightで問題回答と320px表示を検証する。
- PRと`main`更新時にGitHub Actionsを実行する。

### M0-3 最初の縦切り

- 説明画面を挟まず仮問題を表示する。
- 支払い4択をnative buttonで操作できる。
- 正解は短いfeedback、誤答は中立的なprobe導入へ遷移する。
- タップ領域、フォーカス、色以外の状態表現を備える。

### M1-1a 点数支払いの純粋関数

- 1〜12飜、20・25・30〜110符、単一役満の基本点を決定的に計算する。
- 親子・ロンツモをPaymentへ変換し、100点単位に切り上げる。
- 設計書の代表値を技術fixtureとして固定する。
- Rule ownerとRule reviewerの承認前は公開問題の正として使用しない。

## 外部ブロッカー

- M1完了前にRule ownerと、作者とは別のRule reviewerを決める。
- M3a前にhan・fu・payoutの類題ペアを含む15〜20問を二重監修する。
- 本番CD前にGitHub Environment `production`へCloudflareのaccount IDと最小権限API tokenを登録する。

## PROD-010 Mリーグルール固定とα問題追加

- [x] ルールセットを`mleague-2026-v1`として版管理する。
- [x] 3翻60符・4翻30符の切り上げ満貫を計算機とgolden testへ反映する。
- [x] 連風牌の雀頭を2符とする契約を明文化する。
- [x] 開発用問題バンクを監修前draft 15問まで増やす。
- [ ] Rule ownerを任命し、採用範囲と対象外を承認する。
- [ ] 問題作者とは別のRule reviewerが10問を独立再計算する。
- [ ] 各draftへ完全な手牌分解とScoringBasisを記録する。
- [ ] 15問すべてを二重監修し、公開条件を満たしたものだけ`published`にする。
