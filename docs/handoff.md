# 開発引き継ぎ書

最終更新: 2026-09-04

この文書は、会話履歴を持たない開発者やAIが、現在地を誤認せずに作業を再開するための入口である。詳細仕様は[プロダクト・技術設計書](product-design.md)、実装順は[本番実装バックログ](production-backlog.md)を参照する。

## 1. プロダクトの目的とリリース方針

「この手、何点？」は、四人打ちリーチ麻雀の点数計算について、利用者が現在つまずいている箇所を5問で確認するWebアプリである。

- まず、監修済み15〜20問によるα版を完成させる。
- 5〜8人の対象利用者テストに合格した後で、64問の公開βへ進む。
- ログインやサーバー保存はMVPに含めない。
- 点数・診断・公開問題の正確性は、自動テストだけでなく人間による独立監修を必須とする。

## 2. リポジトリと現在のGit状態

- Repository: <https://github.com/mizunoryuki/mahjong>
- Production: <https://kono-te-nanten.kt0442193.workers.dev/>
- Production branch: `main`
- 直近マージ済みPR:
  - [#24 feat(domain): 誤答プローブ・診断決定表・適応出題の実装 (PROD-009, PROD-011)](https://github.com/mizunoryuki/mahjong/pull/24)
  - [#23 feat(ui): 5問セッションUIと端末内保存・復元の実装 (PROD-005, PROD-006, PROD-008)](https://github.com/mizunoryuki/mahjong/pull/23)
  - [#21 feat(domain): 点数計算契約・問題スキーマ・問題検証CLIの完成 (PROD-002, PROD-003, PROD-004)](https://github.com/mizunoryuki/mahjong/pull/21)
  - [#20 本番向け問題検証と5問セッションの基盤を追加](https://github.com/mizunoryuki/mahjong/pull/20)
- 本番URL稼働状況: `main` の全コミットがCloudflare Workers Static Assetsへ正常デプロイ完了（`/`, `/rules`, `/privacy`, `/settings`, `/about` のHTTP 200疎通確認済み）。

作業開始時の確認コマンド:

```sh
git status
git branch --show-current
git log --oneline --decorate -10
npm ci
npm run check
npm run test:e2e -- --project=chromium
```

## 3. 実装済み（本番で動作するもの）

- **フロントエンド・共通基盤**:
  - React 19、TypeScript、Vite、Cloudflare Workers Static Assets
  - `/`、`/rules`、`/privacy`、`/settings`、`/about` のルーティング
  - 320px無はみ出し、axe重大違反ゼロ、キーボード操作可能な手牌表示（`tabindex="0"`）、スクリーンリーダー向け牌姿解説テキスト
- **点数計算契約（PROD-003）**:
  - 通常役30種・役満8種のカタログ、食い下がり判定、役置換・複合判定
  - 符計算（底符・ツモ/ロン・待ち・刻子/槓子・七対子固定25符・平和20/30符）
  - ドラ・裏ドラ・赤ドラ導出、満貫〜役満支払い計算（公式点数表準拠142テスト完備）
- **問題スキーマ・検証CLI（PROD-002, PROD-004）**:
  - `Question` / `QuestionBank` のZodスキーマ、手牌分解（標準形・七対子）、日本語エラーメッセージ
  - `npm run validate:questions`: 牌枚数・計算・選択肢・類題・監修証跡の厳格検査CLI（CI必須ジョブ）
- **5問セッション・端末内保存（PROD-005, PROD-006, PROD-008）**:
  - 決定的なセッション状態機械（answering / probe / feedback / selecting / summary）
  - `sessionStorage` 24時間保持、バージョン不一致破棄、破損耐性モジュール
  - 1問目即時表示、4択回答、正誤判定、役・符内訳表示、プログレスバー、5問結果画面、再挑戦機能
- **誤答プローブ・適応出題・診断決定表（PROD-009, PROD-011）**:
  - 誤答かつ診断適格な問題における飜・符プローブUI（「分からない」「スキップ」対応）
  - 1〜3問目の校正結果に基づく4問目・5問目の適応類題選定（`chooseFollowup` / `chooseFifthQuestion`）
  - 診断決定表（`clear | candidate | repaired | confirmed | unknown`）による客観的・前向きな日本語診断結果カード
  - 決定表全行テストおよび1,000 seed網羅シミュレーションによる不変条件検査（不正confirmed・例外・非決定性ゼロ件）
- **品質保証・自動テスト**:
  - Vitest 単体・結合テスト（204 tests 全件パス）
  - Playwright E2E（Chromium / Mobile Chrome 全件パス）

## 4. まだ実装されていないもの

重要: 現在の点数関数は「正しい飜数・符数が既に与えられた後」の支払いを計算する。牌姿から面子・待ち・役・飜・符を判定するエンジンではない。

| Issue                                                            | 状態                                       | 残作業                                                                                       |
| ---------------------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------- |
| [#6 PROD-001](https://github.com/mizunoryuki/mahjong/issues/6)   | 未着手・外部blocker                        | Rule owner、作者と別人のRule reviewer、承認方法、緊急連絡先を決める                          |
| [#7 PROD-002](https://github.com/mizunoryuki/mahjong/issues/7)   | 【完了・マージ済み (PR #21)】              | 手牌分解、役一覧、符内訳、Question契約・バンクローダー・日本語バリデーションを完了           |
| [#8 PROD-003](https://github.com/mizunoryuki/mahjong/issues/8)   | 【完了・マージ済み (PR #21)】              | 牌姿からの役・飜・符・ドラ導出契約、満貫以上・役満計算、公式表フィクスチャ全142テスト完了    |
| [#9 PROD-004](https://github.com/mizunoryuki/mahjong/issues/9)   | 【完了・マージ済み (PR #21)】              | `npm run validate:questions` CLIを実装し、CIに統合完了                                       |
| [#10 PROD-005](https://github.com/mizunoryuki/mahjong/issues/10) | 【完了・マージ済み (PR #23)】              | 5問セッション状態機械・決定論的選定・answering/feedback/summary遷移を接続完了                |
| [#11 PROD-006](https://github.com/mizunoryuki/mahjong/issues/11) | 【完了・マージ済み (PR #23)】              | `sessionStorage` 24時間保持・復元・破損耐性モジュールを実装しE2E検証完了                     |
| [#12 PROD-007](https://github.com/mizunoryuki/mahjong/issues/12) | 一部実装済み（表示契約・アクセシビリティ） | 固定commitの牌SVG差し替え、ライセンス通知、実機でのスクリーンリーダー最終確認                |
| [#13 PROD-008](https://github.com/mizunoryuki/mahjong/issues/13) | 【完了・マージ済み (PR #23)】              | 1問目即時表示、4択、正誤、内訳、次問、5問結果、補助ページ復帰E2Eを完了                       |
| [#14 PROD-009](https://github.com/mizunoryuki/mahjong/issues/14) | 【完了・マージ済み (PR #24)】              | 飜・符プローブUI、5結果診断決定表、4〜5問目の適応選定を実装・マージ完了                      |
| [#15 PROD-010](https://github.com/mizunoryuki/mahjong/issues/15) | 未着手・二重監修待ち                       | α用15〜20問を作成し、作者以外が全問を独立再計算して承認する（PROD-001確定後）                |
| [#16 PROD-011](https://github.com/mizunoryuki/mahjong/issues/16) | 【完了・マージ済み (PR #24)】              | 決定表全行テスト、1,000 seedの決定性・不正confirmedゼロ件の不変条件検査を完了                |
| [#17 PROD-012](https://github.com/mizunoryuki/mahjong/issues/17) | 未着手                                     | 対象者5〜8人でユーザーテストを実施し、設計書のゲートを評価する                               |
| [#18 PROD-013](https://github.com/mizunoryuki/mahjong/issues/18) | α合格まで開始禁止                          | 二重監修済み問題を64問へ拡張する                                                             |
| [#19 PROD-014](https://github.com/mizunoryuki/mahjong/issues/19) | 未着手                                     | Privacy、問題報告、匿名計測、エラー監視、問題retire、監視、rollback、runbookを運用可能にする |

## 5. 推奨する次の実装順

### 完了したステップ

- **Step 0〜Step 2**: PR #20、PR #21（ドメイン契約・スキーマ・問題検証CLI）、PR #23（5問UI・端末内保存）、PR #24（誤答プローブ・診断決定表・1,000 seed不変条件検査）をすべて本番マージ・デプロイ完了。

### 現在のフォーカスと次のステップ

1. **PROD-007 牌SVGとアクセシブル表示の仕上げ**:
   - 固定commitのオープンライセンス牌SVGアセット（例: FluffyStuff riichi-mahjong-tiles 等）の選定と取り込み。
   - ライセンス証跡・クレジット表示（`/about` または `/rules`）。
2. **PROD-001 & PROD-010（Phase 3: 監修体制とα用問題の二重監修）**:
   - Rule owner / reviewer の確定（人間による承認体制）。
   - α用15〜20問の二重監修とGate A〜E通過の検証（`npm run validate:questions`）。
3. **PROD-012 対象利用者テスト**:
   - 5〜8人によるプロトタイプ評価とゲート判定。

## 6. 開発体制

小規模チームでも、次の責務は分離する。1人が複数の役割を兼任してよいが、公開問題の作者とRule reviewerだけは同一人物にしない。

| 役割                        | 主な責務                                                            | 必須となる承認                  |
| --------------------------- | ------------------------------------------------------------------- | ------------------------------- |
| Product owner / PM          | 対象利用者、scope、優先順位、受け入れ条件、ユーザーテスト、公開判断 | α／βのゲート判定                |
| Engineering maintainer / EM | アーキテクチャ、Issue分割、PR品質、CI/CD、リリースとrollback        | 通常コード、インフラ変更        |
| Engineer                    | domain、UI、テスト、問題検証ツールの実装                            | CI合格とコードレビュー          |
| Content author              | 問題、誤答選択肢、解説、診断タグ、類題の作成                        | Rule reviewerへ監修依頼         |
| Rule owner                  | 採用ルール、例外、点数計算仕様、判定基準の最終責任                  | ルール・計算契約の変更          |
| Rule reviewer               | 作者と独立して牌姿・役・飜・符・支払いを再計算                      | golden fixtureと公開問題        |
| Design / Accessibility      | 情報設計、牌表示、文言、キーボード・拡大・読み上げ品質              | 主要導線と本番用牌表示          |
| Operations owner            | 監視、障害対応、問題停止、復旧確認                                  | 公開βの運用準備とincident close |

AIは、実装、テスト生成、schema検査、差分レビュー、ドキュメント更新を担当できる。ただし、麻雀ルールの最終承認、問題の`published`化、ユーザーテストの合否、公開判断をAIだけで完結させない。

## 7. 日常の開発フロー

1. GitHub Issueに利用者価値、受け入れ条件、依存、対象外を記載する。
2. 1 Issueにつき短命ブランチを作る。例: `feature/PROD-006-session-storage`。
3. Conventional Commitsで、設計・domain・UI・運用変更を意味のある単位に分ける。
4. PRを作り、`quality`と`e2e`を必ず通す。
5. 通常コードは1名、ルール・計算・fixture・公開問題はRule ownerと独立Rule reviewerが確認する。
6. 原則squash mergeし、`main`を常にデプロイ可能に保つ。
7. `main`へのmerge後、CloudflareへのCD、production smoke test、監視確認を行う。

並列開発する場合は、ファイル競合を避けるため、domain、UI、content/tooling、operationsの単位で担当を分ける。同じ問題データやschemaを複数担当が同時編集しない。

## 8. テストとDefinition of Done

通常のPRで最低限必要な確認:

```sh
npm run check
npm run test:e2e -- --project=chromium
npm run deploy:dry-run
```

- UIはrole・accessible name・利用者操作でテストする。
- 診断・選定・採点は純粋関数の単体テストを優先する。
- 問題データはschema、計算、選択肢、類題、監修証跡を検査する。
- storage、分析SDK、Web Shareが失敗しても主要導線を完遂できるようにする。
- 320px、200%拡大、キーボード、スクリーンリーダーを手動確認する。
- flaky testを再実行だけで黙認しない。
- 公開問題は自動テスト成功だけで完了にしない。

Issueを閉じるのは、コードが存在するときではなく、そのIssueの受け入れ条件をすべて満たしたときである。#7、#10、#12、#13は部分実装のため、PR #20をmergeしても直ちにcloseしない。

## 9. 本番運用体制

### 通常運用

- Cloudflare設定の正は`wrangler.jsonc`とする。
- `CLOUDFLARE_ACCOUNT_ID`と`CLOUDFLARE_API_TOKEN`はGitHub Environment `production`だけに保存する。
- tokenは対象accountのWorkers編集に限定し、コード、Issue、ログ、`.env`へ貼らない。
- `main`へのmergeを本番リリース単位とし、SemVerと`CHANGELOG.md`を更新する。
- リリース後はトップページ、回答、補助ページ直リンクをsmoke testする。

### 問題の誤りが疑われた場合

1. Operations ownerが報告を記録し、影響する問題IDとrevisionを特定する。
2. 採点誤りの可能性がある問題を先に`retired`へ変更し、新規出題を止める。
3. Rule ownerとRule reviewerが独立再計算する。
4. 修正時は問題の`revision`、解説、監修証跡を更新する。
5. 修正版をCI・監修後に再公開し、incident記録を閉じる。

現在は問題を即時retireする運用機構、問題報告、監視、エラー追跡が未実装である。公開β前に#19で実装と訓練を行う。

### アプリ障害時

1. Operations ownerがCloudflareとGitHub Actionsの状態を確認する。
2. 直前の正常なWorkers versionへrollbackする。
3. 復旧後に主要導線をsmoke testする。
4. 原因、影響、復旧時刻、再発防止をrunbook／incident記録へ残す。

## 10. 次の担当者が守るべき判断

- 監修されていない仮問題を公開問題として扱わない。
- 支払い計算関数があることを、牌姿からの完全な点数計算エンジン完成と解釈しない。
- 5問の状態機械があることを、5問UI完成と解釈しない。
- #17の利用者テスト合格前に64問制作を始めない。
- 点数・診断・公開問題の変更では、根拠fixture、独立レビュー、revision更新を同じPRの完了条件にする。
- 実装と文書が食い違った場合は、Issueの受け入れ条件とプロダクト設計書を確認し、決定をADRまたは文書更新として残す。
