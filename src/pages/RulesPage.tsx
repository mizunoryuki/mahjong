import { Link } from "react-router-dom";

export function RulesPage() {
  return (
    <article className="content-page">
      <h1>採用ルール</h1>
      <p>四人打ちリーチ麻雀、本場・供託なしの固定ルールで出題します。</p>
      <h2>このプロトタイプで扱うこと</h2>
      <ul>
        <li>親・子、ロン・ツモ、門前・副露</li>
        <li>符の10符単位切り上げと満貫以上</li>
        <li>ドラ・裏ドラ・赤ドラ</li>
      </ul>
      <p>三人麻雀、責任払い、ローカル役などは出題しません。</p>
      <Link className="text-button" to="/">
        問題へ戻る
      </Link>
    </article>
  );
}
