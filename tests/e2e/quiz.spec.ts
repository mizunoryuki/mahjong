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

  // ホームに戻る
  await page.getByRole("link", { name: "この手、何点？" }).click();

  // 1問目の回答後フィードバック状態が復元されている
  await expect(page.getByRole("heading", { name: "正解です" })).toBeVisible();
  await expect(page.getByRole("button", { name: "次の問題へ" })).toBeVisible();
});
