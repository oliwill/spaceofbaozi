import { expect, test } from "@playwright/test";

test("photos index uses the editorial empty state without publishing placeholders", async ({ page }, testInfo) => {
  await page.goto("/photos");
  await expect(page.locator(".editorial-hero h1")).toHaveText("摄影");
  await expect(page.locator(".photos-empty strong")).toHaveText("摄影正在整理。");
  await expect(page.locator(".photo-feature")).toHaveCount(0);
  await expect(page.locator("meta[name='robots']")).toHaveAttribute("content", "noindex");
  await expect(page.locator(".shell-links")).toHaveCSS("flex-direction", "column");
  await page.screenshot({ path: testInfo.outputPath("photos-empty-desktop.png") });
});

test("photos editorial empty state fits mobile without horizontal overflow", async ({ browser }, testInfo) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto("/photos");
  await expect(page.locator(".photos-empty strong")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath("photos-empty-mobile.png") });
  await context.close();
});
