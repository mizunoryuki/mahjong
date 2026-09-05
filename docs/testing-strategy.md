# テスト方針

## テストピラミッド

1. ドメイン単体テスト：点数、符、Payment、診断、selectorを純粋関数で高速に検証する。
2. schema・property test：問題バンクの構造と計算上の不変条件を検証する。
3. React統合テスト：利用者が見る文言、状態遷移、フォーカス、保存失敗時の縮退を検証する。
4. E2E：主要な5問導線、reload、戻る、二重操作、補助ページ復帰をブラウザで検証する。
5. 手動確認：実機、200%拡大、スクリーンリーダー、牌姿と監修内容を確認する。

## CIの段階

- すべてのPR：format、lint、typecheck、unit、build、Chromium E2E。
- `main`：同じCIに合格した後でproduction deploy。
- M2以降：WebKit、Firefox、mobile projectを追加する。
- M3a：固定seed全シナリオと1,000 seedの決定性検査を追加する。

## 合否基準

- flaky testを再実行で黙認しない。原因を直すか隔離理由と復帰条件をIssue化する。
- UIの実装詳細ではなく、role・accessible name・利用者操作を検証する。
- 外部分析SDK、storage、Web Shareが無効でも主要導線を完遂できることを検証する。
- 公開問題は自動テストだけで承認せず、Mリーグ公式資料と異なる外部資料2系統の照合証跡を必須とする。境界事例は必要に応じて専門家へ確認する。
