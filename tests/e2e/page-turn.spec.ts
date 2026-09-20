import { expect, test } from "@playwright/test";

test("page-turn demo flies the card in from above on desktop forward nav", async ({ page }, testInfo) => {
  await page.goto("/lab/page-turn");
  const railBefore = await page.locator(".page-turn__rail").boundingBox();
  await page.locator(".turn-page__action[data-show-page='detail']").click();
  await expect(page.locator("[data-page-turn]")).toHaveAttribute("data-active-page", "detail");
  await expect(page.locator("[data-page='detail']")).toHaveClass(/is-entering-forward/);
  const animation = await page.locator("[data-page='detail'] .paper-card").evaluate((el) => getComputedStyle(el).animationName);
  expect(animation).toContain("card-in-forward");
  await page.waitForTimeout(150);
  await page.screenshot({ path: testInfo.outputPath("page-turn-forward-mid.png") });
  const railAfter = await page.locator(".page-turn__rail").boundingBox();
  expect(railAfter?.x).toBe(railBefore?.x);
  await page.waitForTimeout(900);
  await expect(page.locator("[data-page='detail']")).not.toHaveClass(/is-entering-forward/);
  await page.screenshot({ path: testInfo.outputPath("page-turn-detail-desktop.png") });
});

test("page-turn demo lifts the card from below on desktop back nav", async ({ page }) => {
  await page.goto("/lab/page-turn");
  await page.locator(".turn-page__action[data-show-page='detail']").click();
  await expect(page.locator("[data-page-turn]")).toHaveAttribute("data-active-page", "detail");
  await page.waitForTimeout(700);
  await page.locator(".turn-page__action[data-show-page='list']").click();
  await expect(page.locator("[data-page-turn]")).toHaveAttribute("data-active-page", "list");
  await expect(page.locator("[data-page='list']")).toHaveClass(/is-entering-back/);
  const animation = await page.locator("[data-page='list'] .paper-card").evaluate((el) => getComputedStyle(el).animationName);
  expect(animation).toContain("card-in-back");
});

test("page-turn demo replays section rows with stagger on TOC click", async ({ page }) => {
  await page.goto("/lab/page-turn");
  await page.locator(".turn-page__action[data-show-page='detail']").click();
  await page.waitForTimeout(900);
  await page.locator("[data-goto-section='impact']").click();
  await expect(page.locator("[data-section='impact']")).toHaveClass(/is-replaying/);
  await page.waitForTimeout(700);
  const scrolled = await page.locator("[data-page='detail'] .paper-card").evaluate((el) => el.scrollTop);
  expect(scrolled).toBeGreaterThan(0);
});

test("page-turn demo wipes the mask across before swapping on mobile", async ({ browser }, testInfo) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto("/lab/page-turn");
  await page.locator(".turn-page__action[data-show-page='detail']").click();
  expect(await page.locator("[data-page-turn]").getAttribute("data-active-page")).toBe("list");
  expect(await page.locator("[data-turn-mask]").getAttribute("data-phase")).not.toBe("idle");
  await expect(page.locator("[data-page-turn]")).toHaveAttribute("data-active-page", "detail", { timeout: 1000 });
  await page.screenshot({ path: testInfo.outputPath("page-turn-detail-mobile.png") });
  await context.close();
});

test("page-turn demo swaps instantly under reduced motion", async ({ browser }, testInfo) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/lab/page-turn");
  await page.locator(".turn-page__action[data-show-page='detail']").click();
  await expect(page.locator("[data-page-turn]")).toHaveAttribute("data-active-page", "detail");
  await expect(page.locator("[data-page='detail']")).not.toHaveClass(/is-entering-forward/);
  await page.locator(".turn-page__action[data-show-page='list']").click();
  await expect(page.locator("[data-page-turn]")).toHaveAttribute("data-active-page", "list");
  await page.screenshot({ path: testInfo.outputPath("page-turn-list-mobile-reduced.png") });
  await context.close();
});
