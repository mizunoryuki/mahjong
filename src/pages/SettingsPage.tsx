import { Link } from "react-router-dom";

export function SettingsPage() {
  return (
    <article className="content-page">
      <h1>記録と設定</h1>
      <p>保存された完了記録はまだありません。</p>
      <button type="button" className="danger-button" disabled>
        保存した記録を削除
      </button>
      <Link className="text-button" to="/">
        問題へ戻る
      </Link>
    </article>
  );
}
