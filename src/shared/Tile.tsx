export function Tile({
  code,
  winning = false,
}: {
  code: string;
  winning?: boolean;
}) {
  return (
    <span
      className={winning ? "tile tile--winning" : "tile"}
      aria-hidden="true"
    >
      <span className="tile-code">{code.slice(0, -1)}</span>
      <span className={`tile-suit tile-suit--${code.at(-1)}`}>
        {code.at(-1)}
      </span>
    </span>
  );
}
