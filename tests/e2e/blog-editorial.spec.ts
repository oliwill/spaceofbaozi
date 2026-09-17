import { expect, test } from "@playwright/test";

test("blog editorial index shows the latest approved story", async ({ page }, testInfo) => {
  await page.goto("/blog");
  await expect(page.locator(".editorial-hero h1")).toHaveText("文章");
  const featured = page.locator(".editorial-feature h2 a");
  await expect(featured).toHaveText("料亭菜单 NO.5——将心注入");
  await expect(featured).toHaveAttribute("href", "/blog/ryoutei-menu-05");
  await expect(page.locator(".editorial-feature__summary")).toContainText("漫才、爵士鼓");
  await expect(page.locator(".editorial-empty")).toContainText("更多文章正在整理");
  await page.screenshot({ path: testInfo.outputPath("blog-index-desktop.png"), fullPage: true });
});

test("blog article uses a single readable editorial column", async ({ page }, testInfo) => {
  await page.goto("/blog/ryoutei-menu-05");
  await expect(page.locator(".article-page__header h1")).toHaveText("料亭菜单 NO.5——将心注入");
  await expect(page.locator(".article-page__back")).toHaveAttribute("href", "/blog");
  await expect(page.locator(".editorial-meta time")).toContainText("2024");
  await expect(page.locator(".editorial-prose > blockquote")).toContainText("努力就会有回报");
  await expect(page.locator(".editorial-prose h2").first()).toBeVisible();
  const proseWidth = await page.locator(".editorial-prose").evaluate((element) => element.getBoundingClientRect().width);
  expect(proseWidth).toBeLessThanOrEqual(720);
  await page.screenshot({ path: testInfo.outputPath("blog-article-desktop.png"), fullPage: true });
});

test("blog article keeps return navigation available while reading", async ({ page }) => {
  await page.goto("/blog/ryoutei-menu-05");
  const floatingBack = page.locator("[data-editorial-back]");
  await expect(floatingBack).toHaveAttribute("href", "/blog");
  await expect(floatingBack).toHaveAttribute("data-visible", "false");
  await page.evaluate(() => window.scrollTo({ top: 1200, behavior: "instant" }));
  await expect(floatingBack).toHaveAttribute("data-visible", "true");
  await expect(page.locator(".article-page__nav > a").first()).toHaveText("返回文章");
});

test("blog editorial pages fit the mobile viewport", async ({ browser }, testInfo) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto("/blog");
  await expect(page.locator(".editorial-feature h2 a")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath("blog-index-mobile.png"), fullPage: true });

  await page.goto("/blog/ryoutei-menu-05");
  await expect(page.locator(".article-page__header h1")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath("blog-article-mobile.png"), fullPage: true });
  await context.close();
});

test("blog editorial remains readable with reduced motion", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/blog");
  await expect(page.locator(".editorial-feature h2 a")).toBeVisible();
  await page.goto("/blog/ryoutei-menu-05");
  await expect(page.locator(".editorial-prose > blockquote")).toBeVisible();
  await context.close();
});
