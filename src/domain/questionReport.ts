import type { Question } from "../content/schema";

export function reportQuestionUrl(question: Question): string {
  const title = `[問題報告] ${question.id}`;
  const body = [
    `問題ID: ${question.id}`,
    `revision: ${question.revision}`,
    `ruleset: ${question.rulesetVersion}`,
    "",
    "誤りと思われる箇所:",
    "",
    "期待する内容・根拠:",
  ].join("\n");
  const params = new URLSearchParams({
    title,
    body,
    labels: "question-report",
  });
  return `https://github.com/mizunoryuki/mahjong/issues/new?${params.toString()}`;
}
