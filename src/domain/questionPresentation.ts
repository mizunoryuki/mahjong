import type { Question } from "../content/schema";

const windLabels = {
  east: "東",
  south: "南",
  west: "西",
  north: "北",
} as const;

const winSourceLabels = {
  haitei: "海底摸月",
  houtei: "河底撈魚",
  rinshan: "嶺上開花",
  chankan: "槍槓",
} as const;

export const meldLabels = {
  chi: "チー",
  pon: "ポン",
  openKan: "明槓",
  closedKan: "暗槓",
} as const;

export function contextLabels(question: Question) {
  const { context } = question;
  return [
    `${windLabels[context.roundWind]}場`,
    `${windLabels[context.seatWind]}家`,
    question.hand.melds.length === 0 ? "門前" : "副露",
    context.winSource.method === "ron" ? "ロン" : "ツモ",
    context.winSource.kind === "normal"
      ? null
      : winSourceLabels[context.winSource.kind],
    context.riichi === "doubleRiichi"
      ? "ダブル立直"
      : context.riichi === "riichi"
        ? "立直"
        : null,
    context.ippatsu ? "一発" : null,
  ].filter((label): label is string => label !== null);
}

const honorLabels = ["", "東", "南", "西", "北", "白", "發", "中"];
const numberLabels = [
  "赤五",
  "一",
  "二",
  "三",
  "四",
  "五",
  "六",
  "七",
  "八",
  "九",
];
const suitLabels = { m: "萬", p: "筒", s: "索" } as const;

function describeTile(code: string) {
  const rank = Number(code[0]);
  const suit = code[1];
  return suit === "z"
    ? honorLabels[rank]
    : `${numberLabels[rank]}${suitLabels[suit as keyof typeof suitLabels]}`;
}

export function describeHand(question: Question) {
  const { hand } = question;
  const parts = [
    `手牌 ${hand.concealed.map(describeTile).join("、")}`,
    `和了牌 ${describeTile(hand.winningTile)}`,
  ];
  for (const meld of hand.melds) {
    parts.push(
      `${meldLabels[meld.kind]} ${meld.tiles.map(describeTile).join("、")}`,
    );
  }
  parts.push(`ドラ表示牌 ${hand.doraIndicators.map(describeTile).join("、")}`);
  if (hand.uraDoraIndicators.length > 0) {
    parts.push(
      `裏ドラ表示牌 ${hand.uraDoraIndicators.map(describeTile).join("、")}`,
    );
  }
  return parts.join("。") + "。";
}
