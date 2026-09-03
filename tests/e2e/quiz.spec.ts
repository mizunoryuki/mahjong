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
