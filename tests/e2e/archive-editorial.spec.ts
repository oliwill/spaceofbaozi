import { expect, test } from "@playwright/test";

const archives = [
  ["/books", "书"],
  ["/music", "音乐"],
  ["/drinks", "酒"],
  ["/about", "关于"],
  ["/movies", "影剧"],
] as const;

for (const width of [360, 1440]) {
  test(`archive empty states share the editorial shell at ${width}px`, async ({ browser }, testInfo) => {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    for (const [path, heading] of archives) {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.locator("main")).toHaveCount(1);
      await expect(page.locator("main h1")).toHaveText(heading);
      await expect(page.locator(".shell-links a")).toHaveCount(4);
      await expect(page.locator(".editorial-empty")).toBeVisible();
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
      await expect(page.locator(".paper-page, .spread, .entry-card")).toHaveCount(0);
      await expect(page.locator("main")).not.toContainText("手账");
      await expect(page.locator("main")).not.toContainText("Markdown");
      await expect(page.locator("main")).toHaveCSS("background-color", "rgb(250, 249, 246)");
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      if (path === "/books") {
        await page.screenshot({ path: testInfo.outputPath(`books-${width}.png`), fullPage: true });
      }
    }
    await page.locator('.shell-links a[href="/blog"]').click();
    await expect(page.locator("main h1")).toHaveText("文章");
    await context.close();
  });
}

test("unapproved archive records have no generated detail route", async ({ request }) => {
  for (const path of ["/books/reading-stack", "/music/vinyl-corner", "/drinks/kitten-three"]) {
    const response = await request.get(path);
    expect(response.status()).toBe(404);
  }
  const about = await request.get("/about/me");
  if (process.env.PLAYWRIGHT_PREVIEW) {
    expect(about.status()).toBe(200);
    expect(await about.text()).toContain("这一页暂时没有可展示的内容。");
    expect(await about.text()).not.toContain("你好，我是包子。");
  } else expect(about.status()).toBe(404);
});

test("archive content and main navigation work without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto("/books");
  await expect(page.locator("main h1")).toHaveText("书");
  await expect(page.locator(".editorial-empty")).toBeVisible();
  await page.locator('.shell-links a[href="/blog"]').click();
  await expect(page.locator("main h1")).toHaveText("文章");
  await context.close();
});
