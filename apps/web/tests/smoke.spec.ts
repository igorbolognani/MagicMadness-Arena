import { expect, test } from "@playwright/test";

test("public homepage reaches the local bot match", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Position is your")).toBeVisible();
  await page.getByRole("button", { name: /enter the arena/i }).click();
  await page.getByRole("button", { name: /play now/i }).click();
  await expect(page.getByText("Choose your pressure.")).toBeVisible();
  await page.getByRole("button", { name: /start local match/i }).click();
  await expect(page.getByTestId("arena-canvas")).toBeVisible();
  await expect(page.getByText("LOCAL BOT MATCH")).toBeVisible();
});
