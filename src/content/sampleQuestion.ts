import { questionSchema } from "./schema";

export const sampleQuestion = questionSchema.parse({
  schemaVersion: 1,
  id: "sample-001",
  revision: 1,
  status: "draft",
  rulesetVersion: "jp-riichi-4p-v1",
  difficulty: "basic",
  calibrationAxis: "fu",
  context: {
    roundWind: "east",
    seatWind: "south",
    winSource: { kind: "normal", method: "ron" },
    riichi: "riichi",
    ippatsu: false,
  },
  hand: {
    concealed: [
      "1m",
      "2m",
      "3m",
      "4m",
      "5m",
      "6m",
      "7p",
      "8p",
      "9p",
      "2s",
      "3s",
      "4s",
      "5z",
    ],
    melds: [],
    winningTile: "5z",
    doraIndicators: ["1z"],
    uraDoraIndicators: [],
    accessibleDescription:
      "一萬、二萬、三萬、四萬、五萬、六萬、七筒、八筒、九筒、二索、三索、四索、白。白でロン。",
  },
  solution: {
    basis: { kind: "hanFu", han: 1, fu: 40 },
    payment: { kind: "ron", winner: "nonDealer", points: 1300 },
  },
  options: [
    {
      id: "a",
      payment: { kind: "ron", winner: "nonDealer", points: 1300 },
      correct: true,
      diagnosis: {
        assumedHan: 1,
        assumedFu: 40,
        coarseHypotheses: [],
        fineHypotheses: [],
      },
    },
    {
      id: "b",
      payment: { kind: "ron", winner: "nonDealer", points: 2000 },
      correct: false,
      diagnosis: {
        assumedHan: 2,
        assumedFu: 30,
        coarseHypotheses: ["han", "fu"],
        fineHypotheses: [],
      },
    },
    {
      id: "c",
      payment: { kind: "ron", winner: "nonDealer", points: 2600 },
      correct: false,
      diagnosis: {
        assumedHan: 2,
        assumedFu: 40,
        coarseHypotheses: ["han"],
        fineHypotheses: [],
      },
    },
    {
      id: "d",
      payment: { kind: "ron", winner: "nonDealer", points: 3900 },
      correct: false,
      diagnosis: {
        assumedHan: 3,
        assumedFu: 30,
        coarseHypotheses: ["han", "fu"],
        fineHypotheses: [],
      },
    },
  ],
  diagnosis: {
    eligible: true,
    primaryCoarseTarget: "fu",
    fineTargets: ["fu.wait", "fu.rounding"],
    probe: { hanOptions: [1, 2, 3], fuOptions: [30, 40, 50] },
  },
  reviewGroup: ["development-fu-tanki"],
  explanation: {
    summary:
      "白は雀頭なので役牌にはならず、立直1飜です。門前ロンと単騎待ちを含む40符の子ロンとして1,300点です。",
  },
  provenance: {
    author: "development-fixture",
    reviewer: "unreviewed",
    reviewedAt: "not-reviewed",
  },
});
