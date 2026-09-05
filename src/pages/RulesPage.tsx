import { Link } from "react-router-dom";

export function RulesPage() {
  return (
    <article className="content-page">
      <h1>採用ルール</h1>
      <p>
        Mリーグ公式戦ルールのうち、和了時の役・符・点数計算を基準に出題します。本場と供託は問題条件として0本・0点に固定します。
      </p>
      <h2>このプロトタイプで扱うこと</h2>
      <ul>
        <li>親・子、ロン・ツモ、門前・副露</li>
        <li>符の10符単位切り上げ、切り上げ満貫、満貫以上</li>
        <li>ドラ・裏ドラ・赤ドラ</li>
      </ul>
      <p>
        三人麻雀、責任払い、本場・供託を含む局収支、ローカル役などは現在出題しません。
      </p>
      <p>
        <a href="https://m-league.jp/about/" rel="noreferrer">
          Mリーグ公式戦ルールを確認する
        </a>
      </p>
      <Link className="text-button" to="/">
        問題へ戻る
      </Link>
    </article>
  );
}
