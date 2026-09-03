# リポジトリ運用

## ブランチとPR

- `main`を常にデプロイ可能に保つ。
- 作業は1チケット1ブランチを基本とし、`feature/M2-2-quiz-session`のように命名する。
- 短命ブランチからPRを作り、squash mergeする。
- コミットはConventional Commitsを使う。
- `main`へのforce pushと直接pushを禁止する。

GitHub remoteを作成したら、branch protectionでCIの`quality`と`e2e`を必須にし、会話解決と最新`main`への追従を要求する。

## レビュー

- 通常コードは1名の承認を必須とする。
- 点数、ルール、golden fixture、公開問題の変更はRule ownerと、作者とは別のRule reviewerを必須とする。
- 問題修正はコード変更と可能な限り分け、`revision`と監修証跡を更新する。
- 依存更新はCI合格後にまとめてmergeする。

## リリース

- SemVerと`CHANGELOG.md`を使用する。
- `main`へのmergeでproduction workflowを実行する。
- 本番環境はGitHub Environmentで保護し、Cloudflare credentialをrepositoryへ保存しない。
- 障害時は直前のWorkers versionへ戻す。採点誤りは対象問題を先にretireする。

## チケット

- 利用者価値または検証可能な技術成果を1チケットとする。
- 受け入れ条件、依存チケット、対象外を必ず記載する。
- 1つのPRで完了できない場合は、縦切りまたは純粋な基盤単位へ分割する。
- `docs/work-items.md`を初期backlogの正とし、GitHub remote作成後にIssueへ転記する。
