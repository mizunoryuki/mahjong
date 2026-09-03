import type { Payment } from "./payment";

export type HanFuBasis = {
  kind: "hanFu";
  han: number;
  fu: number;
};

export type YakumanBasis = {
  kind: "yakuman";
  units: 1;
};

export type PointBasis = HanFuBasis | YakumanBasis;

function assertIntegerInRange(
  value: number,
  min: number,
  max: number,
  label: string,
): void {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new RangeError(
      `${label} must be an integer between ${min} and ${max}`,
    );
  }
}

function validateFu(fu: number): void {
  const supported =
    fu === 20 || fu === 25 || (fu >= 30 && fu <= 110 && fu % 10 === 0);
  if (!supported) throw new RangeError("fu is outside the supported MVP range");
}

export function resolveBasicPoints(basis: PointBasis): number {
  if (basis.kind === "yakuman") return 8000;

  assertIntegerInRange(basis.han, 1, 12, "han");
  validateFu(basis.fu);

  if (basis.han >= 11) return 6000;
  if (basis.han >= 8) return 4000;
  if (basis.han >= 6) return 3000;

  const uncapped = basis.fu * 2 ** (basis.han + 2);
  return basis.han === 5 || uncapped >= 2000 ? 2000 : uncapped;
}

function ceilToHundred(points: number): number {
  return Math.ceil(points / 100) * 100;
}

export function calculatePayment(
  basis: PointBasis,
  winner: "dealer" | "nonDealer",
  method: "ron" | "tsumo",
): Payment {
  const basicPoints = resolveBasicPoints(basis);

  if (method === "ron") {
    return {
      kind: "ron",
      winner,
      points: ceilToHundred(basicPoints * (winner === "dealer" ? 6 : 4)),
    };
  }

  if (winner === "dealer") {
    return {
      kind: "dealerTsumo",
      winner,
      each: ceilToHundred(basicPoints * 2),
    };
  }

  return {
    kind: "nonDealerTsumo",
    winner,
    nonDealerEach: ceilToHundred(basicPoints),
    dealer: ceilToHundred(basicPoints * 2),
  };
}
