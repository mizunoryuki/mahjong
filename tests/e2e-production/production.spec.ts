import { expect, test } from "@playwright/test";

test("does not expose unreviewed draft questions in a production build", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "問題を準備しています" }),
  ).toBeVisible();
  await expect(page.getByRole("button")).toHaveCount(0);

  await page.getByRole("link", { name: "ルール" }).click();
  await expect(page.getByRole("heading", { name: "採用ルール" })).toBeVisible();
});
