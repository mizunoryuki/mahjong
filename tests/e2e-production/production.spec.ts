import { expect, test } from "@playwright/test";

test("serves the verified question bank in a production build", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "この手、何点？" }),
  ).toBeVisible();
  await expect(page.getByRole("button")).toHaveCount(4);
  await expect(page.getByText("現在 1問目 / 全5問")).toBeVisible();

  await page.getByRole("link", { name: "ルール" }).click();
  await expect(page.getByRole("heading", { name: "採用ルール" })).toBeVisible();
});
