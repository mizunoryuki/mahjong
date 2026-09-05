# 本番実装バックログ

本番実装は、正確性を担保したα版を先に完成させ、対象利用者テストの合格後に公開βへ進む。公開条件は[ADR-004](adr-004-automated-content-verification.md)に従う。

## Phase 1: ドメインとコンテンツ基盤

### PROD-001 Rule ownerと検証運用を決める

- Owner: PM
- Blocker: なし
- 完了条件: Rule owner、自動検証、外部照合、問題retire手順、緊急連絡方法が記録される。

### PROD-002 Question・QuestionBankスキーマ

- Owner: Engineering
- 依存: なし
- 完了条件: 型とZod検証、bank/ruleset/選定アルゴリズムのversion、4択・正解数・Payment重複・診断適格性の検査がある。

### PROD-003 点数計算契約を完成させる

- Owner: Engineering + Rule owner
- 依存: PROD-001
- 完了条件: 役カタログ、ドラ、符、親子、ロンツモ、満貫以上を純粋関数で計算し、公式表と外部資料2系統に由来するfixtureが一致する。

### PROD-004 問題検証CLI

- Owner: Engineering
- 依存: PROD-002、PROD-003
- 完了条件: `npm run validate:questions`がschema、牌枚数、計算、選択肢、類題、監修証跡を検査し、CIで必須になる。

## Phase 2: 5問の基本体験

### PROD-005 決定的な5問セッション

- Owner: Engineering
- 依存: PROD-002
- 完了条件: 5つの異なる問題、seed付き選定、回答の二重送信防止、answering/feedback/summary遷移を純粋関数で検証できる。

### PROD-006 端末内保存と復元

- Owner: Engineering
- 依存: PROD-005
- 完了条件: sessionStorageで進行中状態を24時間保持し、version不一致・破損・保存不可時も安全に新規開始またはmemory継続できる。

### PROD-007 牌SVGとアクセシブル表示

- Owner: Design + Engineering
- 依存: ライセンス確認
- 完了条件: 固定commitの牌SVG、第三者通知、牌姿全体の日本語説明、320px・200%拡大・キーボード完遂を確認する。

### PROD-008 5問UIを完成させる

- Owner: Engineering
- 依存: PROD-005〜007
- 完了条件: 1問目即時表示、4択、正誤、内訳、次問、5問結果、補助ページ復帰が全ブラウザE2Eで通る。

## Phase 3: α診断

### PROD-009 誤答プローブと診断決定表

- Owner: Product + Engineering
- 依存: PROD-005
- 完了条件: 誤答かつ診断適格な問題だけhan/fu probeを表示し、clear/candidate/repaired/confirmed/unknownを一意に返す。

### PROD-010 α用15〜20問を検証・外部照合する

- Owner: Content + Rule reviewer
- 依存: PROD-001、PROD-003、PROD-004
- 完了条件: han/fu/payout各分類に異なる牌姿の類題があり、全問がGate A〜Eを通る。

### PROD-011 固定scenarioと1,000 seed検査

- Owner: Engineering
- 依存: PROD-009、PROD-010
- 完了条件: 5結果、probe skip、複数原因を再現し、不正confirmed・結果なし・複数結果・非決定性が0件になる。

### PROD-012 対象利用者テスト

- Owner: PM
- 依存: PROD-008〜011
- 完了条件: 5〜8人でプロダクト設計書4.4の全ゲートを満たす。未達時は64問制作を開始しない。

## Phase 4: 公開β

### PROD-013 64問へ展開する

- Owner: Content + Rule reviewer
- 依存: PROD-012
- 完了条件: 64問すべてがGate A〜E、各タグ3問以上、各reviewGroup 2問以上、既知不一致0件を満たす。

### PROD-014 公開β運用を有効化する

- Owner: PM + Engineering
- 依存: PROD-013
- 完了条件: Privacy、問題報告、匿名計測、Sentry、監視、rollback、問題retire、runbookを実証し、Definition of Doneを満たす。

## 現在の着手範囲

PROD-002／004／005／006のリリース境界を補強し、profile別の問題検証、本番での`published`限定、問題バンクに結び付いた安全なセッション復元を実装済み。PROD-010の15問はADR-004の完全内訳・自動検証・外部照合を通過し、`published`として本番出題可能になった。
