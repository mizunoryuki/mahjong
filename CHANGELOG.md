# Changelog

このプロジェクトの利用者向け変更を記録します。バージョンはSemantic Versioningに従います。

## Unreleased

### Added

- React、TypeScript、Vite、Cloudflare Workers Static Assetsの開発・配信基盤
- 仮問題1問の回答・フィードバック画面
- 親子・ロンツモ・満貫以上を扱う点数支払いの純粋関数と技術fixture
- Question・QuestionBankのZod契約と基本的な整合性検査
- seed付き問題選定と二重回答を防ぐ5問セッション状態機械
- CI、CD、単体・UI・E2E・アクセシビリティ検査
- 初期チケット、リポジトリ運用、テスト、CI/CD方針
- profile別の問題バンク検証CLIと、本番ビルド専用E2E

### Changed

- 本番実行時は`published`問題だけを出題し、監修済み問題が15問未満なら準備中画面を表示
- 保存セッションを問題バンクのversion・ruleset・問題revisionに結び付け、不一致時は新規開始

### Security

- 保存された正誤・診断・集計値を正規の問題データから再計算し、改変・破損した状態の復元を拒否
