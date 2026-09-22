import { expect, test } from "@playwright/test";

const POST_LINK = "a[href*='/blog/ryoutei-menu-05']";

test("desktop forward nav sets forward direction and swaps routes", async ({ page }) => {
  await page.goto("/blog");
  await page.locator(POST_LINK).first().click();
  await expect(page).toHaveURL(/\/blog\/ryoutei-menu-05/);
  expect(await page.locator("html").getAttribute("data-nav-direction")).toBe("forward");
  await expect(page.locator("article.editorial-page")).toBeVisible();
});

test("desktop return link sets back direction", async ({ page }) => {
  await page.goto("/blog/ryoutei-menu-05");
  await page.locator("a.article-page__back").click();
  await expect(page).toHaveURL(/\/blog\/?$/);
  expect(await page.locator("html").getAttribute("data-nav-direction")).toBe("back");
  const exitAnimation = await page.locator("[data-turn-exit]").evaluate((el) => getComputedStyle(el).animationName);
  expect(exitAnimation).toContain("paper-exit-move");
});

test("mobile covers with the mask before swapping routes", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto("/blog");
  await page.locator(POST_LINK).first().click();
  expect(page.url()).not.toContain("ryoutei-menu-05");
  expect(await page.locator("[data-turn-mask]").getAttribute("data-phase")).not.toBe("idle");
  await expect(page).toHaveURL(/\/blog\/ryoutei-menu-05/, { timeout: 3000 });
  await context.close();
});

test("reduced motion swaps instantly without direction attribute", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/blog");
  await page.locator(POST_LINK).first().click();
  expect(await page.locator("html").getAttribute("data-nav-direction")).toBeNull();
  await expect(page).toHaveURL(/\/blog\/ryoutei-menu-05/);
  await context.close();
});

test("page keeps scrolling normally after an SPA navigation", async ({ page }) => {
  await page.goto("/blog");
  await page.locator(POST_LINK).first().click();
  await expect(page).toHaveURL(/\/blog\/ryoutei-menu-05/);
  await page.evaluate(() => window.scrollTo({ top: 400 }));
  await page.waitForTimeout(200);
  const scrolled = await page.evaluate(() => window.scrollY);
  expect(scrolled).toBeGreaterThan(0);
});
