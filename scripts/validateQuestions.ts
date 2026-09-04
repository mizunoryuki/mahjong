import { defaultQuestionBank } from "../src/content/questionBank";
import { validateQuestionBank } from "../src/domain/questionValidator";

export function runQuestionValidation(): boolean {
  console.log("=========================================");
  console.log("🀄 麻雀問題バンク検証 (npm run validate:questions)");
  console.log("=========================================");
  console.log(`バージョン: ${defaultQuestionBank.bankVersion}`);
  console.log(`ルールセット: ${defaultQuestionBank.rulesetVersion}`);
  console.log(`総問題数: ${defaultQuestionBank.questions.length} 問\n`);

  const result = validateQuestionBank(defaultQuestionBank);

  console.log("--- ステータス内訳 ---");
  console.log(`  draft (下書き):     ${result.statusCounts.draft} 件`);
  console.log(`  reviewed (レビュー済): ${result.statusCounts.reviewed} 件`);
  console.log(`  published (公開中):   ${result.statusCounts.published} 件`);
  console.log(`  retired (公開停止):   ${result.statusCounts.retired} 件\n`);

  if (!result.valid) {
    console.error("❌ 問題データの検証に失敗しました:\n");
    for (const error of result.errors) {
      console.error(
        `  [問題ID: ${error.questionId}] ${error.field}: ${error.message}`,
      );
    }
    console.log("\n=========================================");
    return false;
  }

  console.log("✅ 全ての問題データ・スキーマ・監修証跡の検証に合格しました！");
  console.log("=========================================");
  return true;
}

// CLI 直接実行時
if (import.meta.url === `file://${process.argv[1]}`) {
  const success = runQuestionValidation();
  process.exit(success ? 0 : 1);
}
