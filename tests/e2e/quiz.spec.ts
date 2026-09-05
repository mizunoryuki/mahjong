import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("the first question is answerable without onboarding", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "この手、何点？" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /1,300点/ }).click();
  await expect(page.getByRole("heading", { name: "正解です" })).toBeFocused();
});

test("the layout does not overflow at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/");

  const sizes = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    page: document.documentElement.scrollWidth,
    offenders: [...document.querySelectorAll<HTMLElement>("body *")]
      .filter(
        (element) =>
          element.getBoundingClientRect().right >
          document.documentElement.clientWidth,
      )
      .map((element) => ({
        element: element.tagName.toLowerCase(),
        className: element.className,
        right: element.getBoundingClientRect().right,
      })),
  }));

  expect(sizes, JSON.stringify(sizes.offenders)).toMatchObject({
    page: sizes.viewport,
  });
});

test("the first question has no serious accessibility violations", async ({
  page,
}) => {
  await page.goto("/");

  const results = await new AxeBuilder({ page }).analyze();
  const seriousViolations = results.violations.filter(({ impact }) =>
    ["serious", "critical"].includes(impact ?? ""),
  );

  expect(seriousViolations).toEqual([]);
});

test("completes a full 5-question session and displays summary screen", async ({
  page,
}) => {
  await page.goto("/");

  // 1問目: 1,300点
  await page.getByRole("button", { name: /1,300点/ }).click();
  await page.getByRole("button", { name: "次の問題へ" }).click();

  // 2問目: 1,000点
  await expect(page.getByText(/現在 2問目 \/ 全5問/)).toBeVisible();
  await page.getByRole("button", { name: /1,000点/ }).click();
  await page.getByRole("button", { name: "次の問題へ" }).click();

  // 3問目: 3,900点
  await expect(page.getByText(/現在 3問目 \/ 全5問/)).toBeVisible();
  await page.getByRole("button", { name: /3,900点/ }).click();
  await page.getByRole("button", { name: "次の問題へ" }).click();

  // 4問目: 2,900点
  await expect(page.getByText(/現在 4問目 \/ 全5問/)).toBeVisible();
  await page.getByRole("button", { name: /2,900点/ }).click();
  await page.getByRole("button", { name: "次の問題へ" }).click();

  // 5問目: 1,300・2,600点
  await expect(page.getByText(/現在 5問目 \/ 全5問/)).toBeVisible();
  await page.getByRole("button", { name: /1,300・2,600点/ }).click();
  await page.getByRole("button", { name: "結果を見る" }).click();

  // 結果画面
  await expect(page.getByRole("heading", { name: "5問完了！" })).toBeVisible();
  await expect(page.getByText(/5問中 5問 正解/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "もう一度挑戦する" }),
  ).toBeVisible();
});

test("persists session progress across auxiliary page navigation", async ({
  page,
}) => {
  await page.goto("/");

  // 1問目を回答
  await page.getByRole("button", { name: /1,300点/ }).click();
  await expect(page.getByRole("heading", { name: "正解です" })).toBeVisible();

  // ルールページへ遷移
  await page.getByRole("link", { name: "ルール" }).click();
  await expect(page.getByRole("heading", { name: "採用ルール" })).toBeVisible();

  // クイズページに戻る
  await page.getByRole("link", { name: "問題へ戻る" }).click();

  // 1問目の回答後状態（正解です）が保持されている
  await expect(page.getByRole("heading", { name: "正解です" })).toBeVisible();
  await expect(page.getByRole("button", { name: "次の問題へ" })).toBeVisible();

  // 再読み込み後も、遷移IDが衝突せず次の問題へ進める
  await page.reload();
  await page.getByRole("button", { name: "次の問題へ" }).click();
  await expect(page.getByText(/現在 2問目 \/ 全5問/)).toBeVisible();
});

test("navigates through diagnostic probe on wrong answer and displays diagnosis card", async ({
  page,
}) => {
  await page.goto("/");

  // 1問目: 誤答 (2,000点)
  await page.getByRole("button", { name: /2,000点/ }).click();

  // プローブ画面
  await expect(
    page.getByRole("heading", { name: "計算の途中を確認します" }),
  ).toBeVisible();

  // プローブ回答: 1飜、30符
  await page.getByRole("button", { name: "1飜" }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "1飜" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "30符" }).click();
  await page
    .getByRole("button", { name: "回答して正解と内訳を確認する" })
    .click();

  // 正解と内訳画面
  await expect(
    page.getByRole("heading", { name: "正解と内訳を確認します" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "次の問題へ" }).click();

  // 2問目: 正解
  await page.getByRole("button", { name: /1,000点/ }).click();
  await page.getByRole("button", { name: "次の問題へ" }).click();

  // 3問目: 正解
  await page.getByRole("button", { name: /3,900点/ }).click();
  await page.getByRole("button", { name: "次の問題へ" }).click();

  // 4問目: 正解
  await page.getByRole("button", { name: /2,900点/ }).click();
  await page.getByRole("button", { name: "次の問題へ" }).click();

  // 5問目: 正解
  await page.getByRole("button", { name: /1,300・2,600点/ }).click();
  await page.getByRole("button", { name: "結果を見る" }).click();

  // 結果画面と診断カード
  await expect(page.getByRole("heading", { name: "5問完了！" })).toBeVisible();
  await expect(page.getByRole("region", { name: "診断結果" })).toBeVisible();
  await expect(
    page.getByText(/「符計算」は別の問題で正解できました/),
  ).toBeVisible();
});
