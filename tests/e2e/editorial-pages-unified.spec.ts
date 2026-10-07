import { expect, test } from "@playwright/test";

for (const width of [360, 390, 1440]) {
  test(`editorial routes share the approved paper and keep content at ${width}px`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    for (const [path, heading] of [["/blog", "文章"], ["/photos", "摄影"], ["/projects", "项目"], ["/blog/tag/漫才", "#漫才"]]) {
      await page.goto(path);
      await expect(page.locator("main")).toHaveCount(1);
      await expect(page.locator("main h1")).toHaveText(heading);
      await expect(page.locator(".paper-page")).toHaveCount(0);
      await expect(page.locator(".shell-links a")).toHaveCount(4);
      await expect(page.locator("main")).toHaveCSS("background-color", "rgb(250, 249, 246)");
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    }
    for (const path of ["/photos", "/projects"]) {
      await page.goto(path);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
    }
    const resume = await page.goto("/resume");
    if (process.env.PLAYWRIGHT_PREVIEW) expect(resume?.status()).toBe(404);
    else {
      await expect(page.locator("main h1")).toHaveText("简历");
      await expect(page.locator("main")).toContainText("这一页暂时没有可展示的内容。");
    }
    await expect(page.locator("body")).not.toContainText("你好，我是包子。");
    await context.close();
  });
}

test("floating article return works after every client-side arrival", async ({ page }) => {
  await page.goto("/blog");
  for (let i = 0; i < 2; i += 1) {
    await page.getByRole("link", { name: "阅读全文 →", exact: true }).click();
    await expect(page.locator(".editorial-prose")).toContainText("努力不一定有回报");
    await page.evaluate(() => window.scrollTo({ top: 1400, behavior: "instant" }));
    await expect(page.locator("[data-editorial-back]")).toBeVisible();
    await page.locator("[data-editorial-back]").click();
    await expect(page.locator("main h1")).toHaveText("文章");
  }
});

test("approved content and four navigation links remain usable without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 360, height: 844 } });
  const page = await context.newPage();
  await page.goto("/blog");
  await page.getByRole("link", { name: "阅读全文 →", exact: true }).click();
  await expect(page.locator("main h1")).toHaveText("料亭菜单 NO.5——将心注入");
  await expect(page.locator(".editorial-prose")).toContainText("努力不一定有回报");
  await expect(page.locator(".shell-links a")).toHaveCount(4);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await context.close();
});
