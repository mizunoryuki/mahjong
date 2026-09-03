import { Link } from "react-router-dom";

export function AboutPage() {
  return (
    <article className="content-page">
      <h1>このサービスについて</h1>
      <p>
        「この手、何点？」は、5問だけで麻雀の点数計算を確かめるためのWebアプリです。
      </p>
      <p>
        結果は今回の5問に限った見直し候補で、恒久的な能力を判定するものではありません。
      </p>
      <Link className="text-button" to="/">
        問題へ戻る
      </Link>
    </article>
  );
}
