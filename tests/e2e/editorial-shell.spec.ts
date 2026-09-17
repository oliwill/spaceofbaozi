import { expect, test } from "@playwright/test";

test("document shell uses a sans left rail and home anchor", async ({ page }) => {
  await page.goto("/blog");
  const brand = page.locator(".shell-brand");
  await expect(brand).toHaveAttribute("href", "/#home");
  await expect(page.locator(".shell-links")).toHaveCSS("flex-direction", "column");
  const brandFamily = await brand.evaluate((element) => getComputedStyle(element).fontFamily);
  const linkFamily = await page.locator(".shell-links a").first().evaluate((element) => getComputedStyle(element).fontFamily);
  expect(brandFamily).not.toContain("BaoziHand");
  expect(linkFamily).not.toContain("Songti");
  expect(brandFamily).toBe(linkFamily);
});

test("home keeps the original composition with the paper aligned right", async ({ page }, testInfo) => {
  await page.goto("/#home");
  await expect(page.locator(".home-v2__rail")).toHaveCount(0);
  await expect(page.locator(".home-v2__nav")).toHaveCSS("flex-direction", "row");
  const geometry = await page.evaluate(() => {
    const paper = document.querySelector(".home-v2__paper")!.getBoundingClientRect();
    const title = document.querySelector(".home-v2__title")!.getBoundingClientRect();
    const portrait = document.querySelector(".home-v2__portrait")!.getBoundingClientRect();
    return { paper, title, portrait };
  });
  expect(geometry.paper.right).toBeGreaterThan(1430);
  expect(geometry.paper.left).toBeGreaterThan(100);
  expect(geometry.portrait.left).toBeGreaterThan(geometry.title.left);
  await page.screenshot({ path: testInfo.outputPath("home-right-aligned-desktop.png") });
});

test("document shell and home remain usable on mobile", async ({ browser }, testInfo) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto("/blog");
  await expect(page.locator(".shell-links")).toHaveCSS("flex-direction", "row");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);

  await page.goto("/#home");
  await expect(page.locator(".home-v2__rail")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath("home-right-aligned-mobile.png") });
  await context.close();
});

test("document brand returns to the home scene instead of replaying intro", async ({ page }) => {
  await page.goto("/blog/ryoutei-menu-05");
  await page.locator(".shell-brand").click();
  await page.waitForURL(/#home$/);
  await expect(page.locator("#home .home-v2__identity")).toBeVisible();
});
