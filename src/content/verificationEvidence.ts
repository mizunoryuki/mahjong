export function mLeagueVerificationEvidence() {
  return {
    method: "automated-cross-check" as const,
    verifiedAt: "2026-09-05T08:00:00Z",
    officialReference: "https://m-league.jp/about/" as const,
    automatedChecks: [
      "schema" as const,
      "tile-count" as const,
      "payment" as const,
      "options" as const,
    ],
    externalChecks: [
      {
        source: "雀カク",
        url: "https://jankaku.com/tools/score",
        checkedAt: "2026-09-05",
        scope: "han-fu-payment" as const,
        result: "matched" as const,
      },
      {
        source: "雀天",
        url: "https://janten.net/guide/score-table",
        checkedAt: "2026-09-05",
        scope: "han-fu-payment" as const,
        result: "matched" as const,
      },
    ],
  };
}
