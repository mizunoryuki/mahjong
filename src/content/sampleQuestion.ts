import type { Payment } from "../domain/payment";

export type SampleQuestion = {
  id: string;
  context: string[];
  hand: string[];
  handDescription: string;
  winningTile: string;
  doraIndicator: string;
  options: Array<{ id: string; payment: Payment; correct: boolean }>;
  explanation: string;
};

export const sampleQuestion: SampleQuestion = {
  id: "sample-001",
  context: ["東場", "南家", "門前", "ロン", "立直"],
  hand: [
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
  handDescription:
    "一萬、二萬、三萬、四萬、五萬、六萬、七筒、八筒、九筒、二索、三索、四索、白。白でロン。",
  winningTile: "5z",
  doraIndicator: "1z",
  options: [
    {
      id: "a",
      payment: { kind: "ron", winner: "nonDealer", points: 1300 },
      correct: true,
    },
    {
      id: "b",
      payment: { kind: "ron", winner: "nonDealer", points: 2000 },
      correct: false,
    },
    {
      id: "c",
      payment: { kind: "ron", winner: "nonDealer", points: 2600 },
      correct: false,
    },
    {
      id: "d",
      payment: { kind: "ron", winner: "nonDealer", points: 3900 },
      correct: false,
    },
  ],
  explanation:
    "白は雀頭なので役牌にはならず、立直1飜です。門前ロンと単騎待ちを含む40符の子ロンとして1,300点です。",
};
