import { expect, test } from "@playwright/test";

test("page-turn demo keeps the rail stable while the detail paper covers from the right", async ({ page }, testInfo) => {
  await page.goto("/lab/page-turn");
  const railBefore = await page.locator(".page-turn__rail").boundingBox();
  await page.locator(".turn-page__action[data-show-page='detail']").click();
  await expect(page.locator("[data-page-turn]")).toHaveAttribute("data-active-page", "detail");
  await expect(page.locator("[data-page='detail'] h1")).toBeVisible();
  const railAfter = await page.locator(".page-turn__rail").boundingBox();
  expect(railAfter?.x).toBe(railBefore?.x);
  expect(railAfter?.width).toBe(railBefore?.width);
  await page.screenshot({ path: testInfo.outputPath("page-turn-detail-desktop.png") });
});

test("page-turn demo returns to the list and supports reduced motion", async ({ browser }, testInfo) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/lab/page-turn");
  await page.locator(".turn-page__action[data-show-page='detail']").click();
  await expect(page.locator("[data-page-turn]")).toHaveAttribute("data-active-page", "detail");
  await page.locator(".turn-page__action[data-show-page='list']").click();
  await expect(page.locator("[data-page-turn]")).toHaveAttribute("data-active-page", "list");
  await expect(page.locator("[data-page='list'] h1")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("page-turn-list-mobile-reduced.png") });
  await context.close();
});
