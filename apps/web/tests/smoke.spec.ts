import { expect, test } from "@playwright/test";

test("public homepage reaches the local bot match", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /make the arena/i })).toBeVisible();
  await page.getByRole("button", { name: /enter the arena/i }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByRole("button", { name: /continue to development client|continue with chatgpt/i }).click();
  await expect(page).toHaveURL(/\/game$/);
  await expect(page.getByRole("heading", { name: /open the arena/i })).toBeVisible();
  await page.getByRole("button", { name: /choose a mode/i }).click();
  await expect(page.getByText("Choose your pressure.")).toBeVisible();
  await page.getByRole("button", { name: /start local match/i }).click();
  await expect(page).toHaveURL(/\/match\/local\//);
  await expect(page.getByTestId("game-boot")).toBeVisible({ timeout: 10000 });
  await expect(page.getByTestId("game-client")).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId("arena-canvas")).toBeVisible({ timeout: 15000 });
  await expect(page.getByText("LOCAL BOT MATCH")).toBeVisible();
});

test("public universe pages keep separate routes", async ({ page }) => {
  await page.goto("/heroes");
  await expect(page).toHaveURL(/\/heroes$/);
  await expect(page.getByRole("heading", { name: /the starter roster/i })).toBeVisible();
  await page.getByRole("link", { name: /elements/i }).click();
  await expect(page).toHaveURL(/\/elements$/);
  await expect(page.getByRole("heading", { name: /elemental grammar/i })).toBeVisible();
});
