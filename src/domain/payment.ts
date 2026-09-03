export type Payment =
  | { kind: "ron"; winner: "dealer" | "nonDealer"; points: number }
  | { kind: "dealerTsumo"; winner: "dealer"; each: number }
  | {
      kind: "nonDealerTsumo";
      winner: "nonDealer";
      nonDealerEach: number;
      dealer: number;
    };

export function paymentKey(payment: Payment): string {
  switch (payment.kind) {
    case "ron":
      return `ron:${payment.winner}:${payment.points}`;
    case "dealerTsumo":
      return `tsumo:dealer:${payment.each}:all`;
    case "nonDealerTsumo":
      return `tsumo:nonDealer:${payment.nonDealerEach}:${payment.dealer}`;
  }
}

export function formatPayment(payment: Payment): {
  primary: string;
  detail: string;
} {
  const format = new Intl.NumberFormat("ja-JP");

  switch (payment.kind) {
    case "ron":
      return {
        primary: `${format.format(payment.points)}点`,
        detail: "放銃者から",
      };
    case "dealerTsumo":
      return {
        primary: `${format.format(payment.each)}点オール`,
        detail: `3人から各${format.format(payment.each)}点`,
      };
    case "nonDealerTsumo":
      return {
        primary: `${format.format(payment.nonDealerEach)}・${format.format(payment.dealer)}点`,
        detail: `子2人：各${format.format(payment.nonDealerEach)}点 / 親：${format.format(payment.dealer)}点`,
      };
  }
}
