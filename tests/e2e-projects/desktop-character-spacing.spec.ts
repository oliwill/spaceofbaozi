import { expect, test, type Page, type TestInfo } from "@playwright/test";
import sharp from "sharp";

type Bounds = { x: number; y: number; width: number; height: number };

async function ready(page: Page, title = "项目") {
  await expect(page.locator("main#main")).toHaveCount(1);
  await expect(page.locator("main h1")).toHaveText(title);
  await expect(page.locator("main h1")).toBeVisible();
  await expect(page.locator("[data-turn-mask]")).toHaveAttribute("data-phase", "idle");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator("astro-error-overlay, vite-error-overlay")).toHaveCount(0);
}

async function paintedCharacters(page: Page) {
  const sprites = page.locator(".site-characters__person, .site-characters__dog");
  await expect(sprites).toHaveCount(2);
  const characters: Array<{ name: string; bounds: Bounds }> = [];
  for (const sprite of await sprites.all()) {
    await expect(sprite).toBeVisible();
    const actual = await sprite.evaluate((element) => {
      const style = getComputedStyle(element), { x, y, width, height } = element.getBoundingClientRect();
      return { name: element.className, image: style.backgroundImage, size: style.backgroundSize,
        positionX: style.backgroundPositionX, positionY: style.backgroundPositionY, bounds: { x, y, width, height } };
    });
    const url = actual.image.match(/^url\(["']?(.+?)["']?\)$/)?.[1];
    expect(url).toBeTruthy();
    expect(new URL(url!).origin).toBe(new URL(page.url()).origin);
    const response = await page.request.get(url!);
    expect(response.ok()).toBe(true);
    const { data, info } = await sharp(await response.body()).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const size = actual.size.split(/\s+/);
    expect(size).toHaveLength(2);
    for (const value of size) expect(value).toMatch(/^[\d.]+%$/);
    for (const value of [actual.positionX, actual.positionY]) expect(value).toMatch(/^-?[\d.]+(?:%|px)$/);
    const renderedWidth = actual.bounds.width * parseFloat(size[0]) / 100;
    const renderedHeight = actual.bounds.height * parseFloat(size[1]) / 100;
    const scaleX = renderedWidth / info.width, scaleY = renderedHeight / info.height;
    const offsetX = actual.positionX.endsWith("%")
      ? (actual.bounds.width - renderedWidth) * parseFloat(actual.positionX) / 100 : parseFloat(actual.positionX);
    const offsetY = actual.positionY.endsWith("%")
      ? (actual.bounds.height - renderedHeight) * parseFloat(actual.positionY) / 100 : parseFloat(actual.positionY);
    let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
    for (let y = 0; y < info.height; y++) {
      const pixelTop = offsetY + y * scaleY, pixelBottom = pixelTop + scaleY;
      if (pixelBottom <= 0 || pixelTop >= actual.bounds.height) continue;
      for (let x = 0; x < info.width; x++) {
        if (data[(y * info.width + x) * info.channels + info.channels - 1] === 0) continue;
        const pixelLeft = offsetX + x * scaleX, pixelRight = pixelLeft + scaleX;
        if (pixelRight <= 0 || pixelLeft >= actual.bounds.width) continue;
        left = Math.min(left, Math.max(0, pixelLeft));
        top = Math.min(top, Math.max(0, pixelTop));
        right = Math.max(right, Math.min(actual.bounds.width, pixelRight));
        bottom = Math.max(bottom, Math.min(actual.bounds.height, pixelBottom));
      }
    }
    expect(Number.isFinite(left) && right > left && bottom > top).toBe(true);
    characters.push({ name: actual.name, bounds: { x: actual.bounds.x + left, y: actual.bounds.y + top, width: right - left, height: bottom - top } });
  }
  return characters;
}

async function record(page: Page, testInfo: TestInfo, label: string, geometry: unknown) {
  await testInfo.attach(`${label}-geometry`, { body: JSON.stringify(geometry, null, 2), contentType: "application/json" });
  const screenshot = testInfo.outputPath(`${label}.png`);
  await page.screenshot({ path: screenshot, fullPage: false });
  await testInfo.attach(`${label}: visual approval still required`, { path: screenshot, contentType: "image/png" });
}

// --list proves loading only. These assertions and screenshots require the Mac browser.
for (const width of [768, 1024, 1440]) {
  for (const height of [720, 900]) {
    test(`desktop character spacing ${width}×${height} gives navigation breathing room and keeps silhouettes in view`, async ({ page }, testInfo) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
      await page.setViewportSize({ width, height });
      await page.goto("/projects");
      await expect(page).toHaveURL(/\/projects\/?$/);
      await expect(page).toHaveTitle(/项目/);
      await ready(page);
      await expect(page.locator(".site-characters")).toHaveCSS("margin-top", "42px");
      const navigation = page.getByRole("navigation", { name: "主要栏目", exact: true });
      await expect(navigation.getByRole("link")).toHaveCount(4);
      const links = navigation.locator("a, .shell-links__inactive");
      await expect(links).toHaveCount(5);
      for (const link of await links.all()) {
        await expect(link).toBeInViewport({ ratio: 1 });
        await expect(link).toHaveCSS("font-size", "16px");
        await expect(link.locator("span")).toHaveCSS("font-size", "12px");
      }
      const lastLink = await links.last().boundingBox();
      expect(lastLink).not.toBeNull();
      const characters = await paintedCharacters(page);
      const gap = Math.min(...characters.map(({ bounds }) => bounds.y)) - (lastLink!.y + lastLink!.height);
      await record(page, testInfo, `character-spacing-${width}x${height}`, { width, height, lastLink, gap, characters });
      // About 50px of actual painted clearance, rather than merely a non-overlap assertion.
      expect(gap).toBeGreaterThanOrEqual(44);
      expect(gap).toBeLessThanOrEqual(56);
      const main = await page.locator("main#main").boundingBox();
      const rail = await page.locator(".shell-nav").boundingBox();
      expect(rail!.width).toBeCloseTo(width <= 1050 ? 242 : 300, 1);
      expect(main!.x).toBeCloseTo(rail!.width, 1);
      for (const { bounds } of characters) {
        expect(bounds.x).toBeGreaterThanOrEqual(0);
        expect(bounds.x + bounds.width).toBeLessThan(main!.x);
        expect(bounds.y).toBeGreaterThanOrEqual(0);
        expect(bounds.y + bounds.height).toBeLessThanOrEqual(height);
      }
      await expect(page.locator(".shell-nav")).toHaveCSS("overflow-y", "visible");
      await expect(page.locator(".site-characters")).toHaveCSS("overflow-y", "visible");
      expect(await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth)).toBeLessThanOrEqual(1);
      await expect(page.locator(".shell-links__inactive")).toHaveAttribute("aria-disabled", "true");
      await expect(navigation.getByRole("link", { name: "简历", exact: true })).toHaveCount(0);
      await links.filter({ hasText: "文章" }).click();
      await ready(page, "文章");
      await page.getByRole("navigation", { name: "主要栏目", exact: true }).getByRole("link", { name: "项目", exact: true }).click();
      await expect(page).toHaveURL(/\/projects\/?$/);
      await ready(page);
      await expect(page.locator(".site-characters")).toHaveCSS("margin-top", "42px");
      expect(errors).toEqual([]);
    });
  }
}

test("character spacing reflow keeps 390/720/767px mobile layout and restores 768px desktop spacing", async ({ page }, testInfo) => {
  await page.goto("/projects");
  await ready(page);
  for (const [step, width] of [768, 767, 720, 390, 768].entries()) {
    await page.setViewportSize({ width, height: 720 });
    const mobile = width <= 767;
    await expect(page.locator(".site-characters")).toHaveCSS("margin-top", mobile ? "25px" : "42px");
    const links = page.getByRole("navigation", { name: "主要栏目", exact: true }).getByRole("link");
    for (const link of await links.all()) {
      await expect(link).toBeInViewport({ ratio: 1 });
      await expect(link).toHaveCSS("font-size", mobile ? "12px" : "16px");
      await expect(link.locator("span")).toHaveCSS("font-size", mobile ? "9px" : "12px");
    }
    const tops = await links.evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().top));
    if (mobile) expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(1);
    const characters = await paintedCharacters(page);
    for (const { bounds } of characters) {
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
      expect(bounds.y).toBeGreaterThanOrEqual(0);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(720);
    }
    expect(await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth)).toBeLessThanOrEqual(1);
    await record(page, testInfo, `character-spacing-reflow-${step}-${width}`, { width, mobile, characters });
  }
});

// 720px is only a responsive breakpoint check. Native 200% zoom remains a separate Mac UI
// acceptance: fixed window, browser zoom 200%, CSS zoom 1, visualViewport.scale 1.
