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
  await expect(page.getByTestId("move-stick")).toBeVisible();
  await expect(page.getByTestId("aim-stick")).toBeVisible();
  await expect(page.getByTestId("skill-1")).toBeVisible();
  await expect(page.getByTestId("skill-1")).toHaveCSS("border-radius", "50%");

  const moveStick = page.getByTestId("move-stick");
  const moveBox = await moveStick.boundingBox();
  if (!moveBox) throw new Error("Move stick did not have a layout box");
  await page.mouse.move(moveBox.x + moveBox.width / 2, moveBox.y + moveBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(moveBox.x + moveBox.width - 8, moveBox.y + moveBox.height / 2, { steps: 3 });
  await page.waitForTimeout(120);
  await page.mouse.up();

  const skill = page.getByTestId("skill-1");
  const skillBox = await skill.boundingBox();
  if (!skillBox) throw new Error("Skill control did not have a layout box");
  await page.mouse.move(skillBox.x + skillBox.width / 2, skillBox.y + skillBox.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(120);
  await page.mouse.up();
  await expect(page.locator(".event-log")).toContainText(/CAST START|INPUT ACCEPTED/i);

  const aimStick = page.getByTestId("aim-stick");
  const aimBox = await aimStick.boundingBox();
  if (!aimBox) throw new Error("Aim stick did not have a layout box");
  await page.mouse.move(aimBox.x + aimBox.width / 2, aimBox.y + aimBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(aimBox.x + 8, aimBox.y + aimBox.height / 2, { steps: 3 });
  await page.mouse.up();
  await expect(page.locator(".aim-readout")).toHaveText("AIM 180°");

  await page.getByRole("button", { name: "Pause match" }).click();
  await expect(page.getByRole("status")).toContainText("MATCH PAUSED");
  await page.getByRole("button", { name: "Resume match" }).click();
});

test("public universe pages keep separate routes", async ({ page }) => {
  await page.goto("/heroes");
  await expect(page).toHaveURL(/\/heroes$/);
  await expect(page.getByRole("heading", { name: /the starter roster/i })).toBeVisible();
  const publicMenu = page.getByRole("button", { name: /open public menu/i });
  if (await publicMenu.isVisible()) await publicMenu.click();
  await page.getByRole("link", { name: /elements/i }).click();
  await expect(page).toHaveURL(/\/elements$/);
  await expect(page.getByRole("heading", { name: /elemental grammar/i })).toBeVisible();
});
