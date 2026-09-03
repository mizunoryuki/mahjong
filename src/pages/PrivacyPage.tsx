import { Link } from "react-router-dom";

export function PrivacyPage() {
  return (
    <article className="content-page">
      <h1>プライバシー</h1>
      <p>
        進行中の5問はこのタブ内に一時保存し、完了結果はこの端末内だけに保存します。
      </p>
      <p>現在のプロトタイプは外部分析サービスへデータを送信しません。</p>
      <Link className="text-button" to="/">
        問題へ戻る
      </Link>
    </article>
  );
}
