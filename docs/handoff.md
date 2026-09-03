# 開発引き継ぎ書

最終更新: 2026-09-03

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
- 作業ブランチ: `feature/production-foundation`
- 未マージPR: [#20 本番向け問題検証と5問セッションの基盤を追加](https://github.com/mizunoryuki/mahjong/pull/20)
- PR #20のCI: `quality`、`e2e`ともに成功

本番URLは`main`の内容を配信している。PR #20の変更はまだ本番へ出ていない。次の担当者は、まずPR #20の状態と差分を確認し、承認後にsquash mergeする。監修前の仮問題を`published`へ変更してはならない。

作業開始時の確認コマンド:

```sh
git status
git branch --show-current
git log --oneline --decorate -10
npm ci
npm run check
npm run test:e2e -- --project=chromium
```

## 3. 実装済み

### `main`にあるもの

- React 19、TypeScript、Vite、Cloudflare Workers Static Assetsの基盤
- `/`、`/rules`、`/privacy`、`/settings`、`/about`のルーティング
- 仮問題1問の4択、正誤フィードバック、フォーカス移動
- 飜・符から基本点を求め、親子・ロンツモの支払いへ変換する純粋関数
- format、lint、typecheck、Vitest、buildをまとめた`npm run check`
- Playwright Chromium E2Eとaxeによる重大アクセシビリティ違反検査
- PR／`main`用CIと、`main`からCloudflareへ配信するCD
- Dependabot設定、PRテンプレート、運用・テスト・CI/CD文書

### PR #20にあるもの

- `Question`／`QuestionBank`のZodスキーマ
- 牌枚数、正解数、回答重複、Payment種別、支払い計算、診断適格性の整合性検査
- probeの件数・重複・有効値・正解包含の検査
- 3問の校正問題から開始し、観測後に4〜5問目を追加できるセッション状態機械
- seed付きの決定的な問題選定
- 二重transition、古い問題への回答、存在しない選択肢の拒否
- 特殊和了、副露、全ドラ・裏ドラを表示できる問題表示
- 構造化データから生成するスクリーンリーダー向け牌姿説明
- 診断対象外の問題では、誤答プローブを出さず直接解説へ進む分岐
- ローカル検証49テスト成功、Chromium E2E 3件成功

## 4. まだ実装されていないもの

重要: 現在の点数関数は「正しい飜数・符数が既に与えられた後」の支払いを計算する。牌姿から面子・待ち・役・飜・符を判定するエンジンではない。

| Issue                                                            | 状態                     | 残作業                                                                                               |
| ---------------------------------------------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------- |
| [#6 PROD-001](https://github.com/mizunoryuki/mahjong/issues/6)   | 未着手・外部blocker      | Rule owner、作者と別人のRule reviewer、承認方法、緊急連絡先を決める                                  |
| [#7 PROD-002](https://github.com/mizunoryuki/mahjong/issues/7)   | PR #20で部分実装         | 手牌分解、役一覧、符内訳、実問題bankとloaderを契約へ追加し、完了条件を再確認する                     |
| [#8 PROD-003](https://github.com/mizunoryuki/mahjong/issues/8)   | 基本点・支払いのみ実装   | 牌姿から役・飜・符・ドラを導出する契約、満貫以上・役満の採用範囲、監修済みgolden fixtureを完成させる |
| [#9 PROD-004](https://github.com/mizunoryuki/mahjong/issues/9)   | 未着手                   | `npm run validate:questions`を実装し、問題データと監修証跡をCIで検査する                             |
| [#10 PROD-005](https://github.com/mizunoryuki/mahjong/issues/10) | PR #20でdomainを部分実装 | 状態機械を実際の問題bank・UIへ接続し、5問完遂を確認する                                              |
| [#11 PROD-006](https://github.com/mizunoryuki/mahjong/issues/11) | 未着手                   | `sessionStorage`保存、24時間復元、schema version不一致・破損・保存失敗時の縮退を実装する             |
| [#12 PROD-007](https://github.com/mizunoryuki/mahjong/issues/12) | 表示契約のみ部分実装     | 本番用牌SVG、赤牌・副露・槓の見た目、ライセンス証跡、200%拡大・実機・読み上げ確認を行う              |
| [#13 PROD-008](https://github.com/mizunoryuki/mahjong/issues/13) | 1問画面のみ部分実装      | 次問、進捗、内訳、5問結果、再挑戦、補助ページからの復帰を完成させる                                  |
| [#14 PROD-009](https://github.com/mizunoryuki/mahjong/issues/14) | 未着手                   | 飜・符probeと`clear/candidate/repaired/confirmed/unknown`の決定表、適応出題を実装する                |
| [#15 PROD-010](https://github.com/mizunoryuki/mahjong/issues/15) | 未着手・監修待ち         | α用15〜20問を作成し、作者以外が全問を独立再計算して承認する                                          |
| [#16 PROD-011](https://github.com/mizunoryuki/mahjong/issues/16) | 未着手                   | 固定シナリオと1,000 seedの決定性・診断不変条件検査を追加する                                         |
| [#17 PROD-012](https://github.com/mizunoryuki/mahjong/issues/17) | 未着手                   | 対象者5〜8人でユーザーテストを実施し、設計書のゲートを評価する                                       |
| [#18 PROD-013](https://github.com/mizunoryuki/mahjong/issues/18) | α合格まで開始禁止        | 二重監修済み問題を64問へ拡張する                                                                     |
| [#19 PROD-014](https://github.com/mizunoryuki/mahjong/issues/19) | 未着手                   | Privacy、問題報告、匿名計測、エラー監視、問題retire、監視、rollback、runbookを運用可能にする         |

## 5. 推奨する次の実装順

### Step 0: PR #20を取り込む

1. PRの差分とCIを確認する。
2. 監修前のfixtureが`draft`のままであることを確認する。
3. squash mergeする。
4. 本番デプロイ後に`/`、`/rules`、`/privacy`、`/settings`、`/about`をsmoke testする。

### Step 1: 正確性の土台を閉じる

1. #6でRule ownerと独立reviewerを決める。
2. #7の残りとして、役・符内訳・手牌分解を表現できるQuestion契約と問題bank loaderを作る。
3. #8で採用ルールを明文化し、牌姿からの役・飜・符計算を純粋関数として実装する。
4. #9で問題検証CLIを作り、CIの必須jobへ追加する。

### Step 2: 操作可能な5問α版を作る

1. #10の状態機械をReact画面へ接続する。
2. #11の保存・復元を追加する。
3. #12の牌SVGとアクセシビリティを完成させる。
4. #13の5問結果までのE2Eを完成させる。

この時点で「5問を解くアプリ」になるが、診断プロダクトとしては未完成である。

### Step 3: 診断α版を作り検証する

1. #14の誤答probe、診断決定表、4〜5問目の適応選定を実装する。
2. #15の監修済み15〜20問を投入する。
3. #16の固定scenarioと1,000 seed検査をCIへ追加する。
4. #17の対象利用者テストを実施する。

### Step 4: 公開βへ進む

利用者テストの全ゲートに合格した場合だけ、#18の64問制作と#19の公開運用を進める。未達なら、問題文・診断ロジック・画面導線を先に修正する。

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
