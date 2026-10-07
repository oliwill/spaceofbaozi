import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";

type Bounds = { x: number; y: number; width: number; height: number };
type NamedBounds = { name: string; bounds: Bounds };
const widths = [360, 390, 767, 768, 1024, 1440] as const;
const labels = ["文章", "照片", "简历", "项目", "书影音"];
const destinations = ["/blog", "/photos", undefined, "/projects", "/media"];

function overlaps(a: Bounds, b: Bounds) {
  return Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 1
    && Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 1;
}

export function identityClearanceTargets(): NamedBounds[] {
  const brand = document.querySelector(".shell-brand");
  const subtitle = document.querySelector(".shell-brand-meta");
  if (!brand || !subtitle) throw new Error("Missing visible shell identity content");
  const boundsOf = ({ x, y, width, height }: DOMRect): Bounds => ({ x, y, width, height });
  const brandBounds = boundsOf(brand.getBoundingClientRect());
  if (brandBounds.width <= 0 || brandBounds.height <= 0) throw new Error("Brand link has no clickable bounds");
  const text = document.createRange();
  text.selectNodeContents(subtitle);
  const lines = [...text.getClientRects()].filter(({ width, height }) => width > 0 && height > 0);
  if (!lines.length) throw new Error("Subtitle has no visible text lines");
  return [{ name: "brand link", bounds: brandBounds },
    ...lines.map((line, index) => ({ name: `subtitle line ${index + 1}`, bounds: boundsOf(line) }))];
}

export function assertCharacterClearance(characters: NamedBounds[], targets: NamedBounds[]) {
  for (const character of characters) {
    for (const target of targets) {
      if (overlaps(character.bounds, target.bounds)) throw new Error(`${character.name} painted content overlaps ${target.name}`);
    }
  }
}

async function ready(page: Page, title: string) {
  await expect(page.locator("main#main")).toHaveCount(1);
  await expect(page.locator("main h1")).toHaveText(title);
  await expect(page.locator("main h1")).toBeVisible();
  await expect(page.locator("[data-turn-mask]")).toHaveAttribute("data-phase", "idle");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator("astro-error-overlay, vite-error-overlay")).toHaveCount(0);
}

async function navigationGeometry(page: Page, width: number) {
  const navigation = page.getByRole("navigation", { name: "主要栏目", exact: true });
  await expect(navigation.getByRole("link")).toHaveCount(4);
  const links = navigation.locator("a, .shell-links__inactive");
  await expect(links).toHaveCount(5);
  for (let index = 0; index < labels.length; index++) {
    const link = links.nth(index);
    if (destinations[index]) {
      await expect(link).toHaveAccessibleName(labels[index]);
      await expect(link).toHaveAttribute("href", destinations[index]!);
    } else {
      await expect(link).toContainText(labels[index]);
      await expect(link).toHaveAttribute("aria-disabled", "true");
      await expect(link).not.toHaveAttribute("href");
    }
    await expect(link).toBeVisible();
    await expect(link).toHaveCSS("font-size", width <= 767 ? "12px" : "16px");
    await expect(link.locator("span")).toHaveCSS("font-size", width <= 767 ? "9px" : "12px");
  }
  const bounds = await links.evaluateAll((elements) => elements.map((element) => {
    const { x, y, width, height } = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const text = document.createRange();
    text.selectNodeContents(element);
    const textBounds = text.getBoundingClientRect();
    return { x, y, width, height, textOverflow: style.textOverflow,
      textX: textBounds.x, textRight: textBounds.right, textY: textBounds.y, textBottom: textBounds.bottom,
      overflowX: element.scrollWidth - element.clientWidth, overflowY: element.scrollHeight - element.clientHeight };
  }));
  for (const rectangle of bounds) {
    expect(rectangle.width).toBeGreaterThanOrEqual(43.99);
    expect(rectangle.height).toBeGreaterThanOrEqual(43.99);
    expect(rectangle.x).toBeGreaterThanOrEqual(-1);
    expect(rectangle.x + rectangle.width).toBeLessThanOrEqual(width + 1);
    expect(rectangle.textX).toBeGreaterThanOrEqual(rectangle.x - 1);
    expect(rectangle.textRight).toBeLessThanOrEqual(rectangle.x + rectangle.width + 1);
    expect(rectangle.textY).toBeGreaterThanOrEqual(rectangle.y - 1);
    expect(rectangle.textBottom).toBeLessThanOrEqual(rectangle.y + rectangle.height + 1);
    expect(rectangle.textOverflow).not.toBe("ellipsis");
    expect(rectangle.overflowX).toBeLessThanOrEqual(1);
    expect(rectangle.overflowY).toBeLessThanOrEqual(1);
  }
  for (let index = 1; index < bounds.length; index++) expect(overlaps(bounds[index - 1], bounds[index])).toBe(false);
  if (width <= 767) {
    expect(Math.max(...bounds.map(({ y }) => y)) - Math.min(...bounds.map(({ y }) => y))).toBeLessThanOrEqual(1);
  } else {
    const rail = await page.locator(".shell-nav").boundingBox();
    expect(rail!.width).toBeCloseTo(width > 1050 ? 300 : 242, 1);
  }
  await expect.poll(() => page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth))
    .toBeLessThanOrEqual(1);
  return bounds;
}

async function characterPaintBounds(page: Page) {
  const sprites = page.locator(".site-characters__person, .site-characters__dog");
  await expect(sprites).toHaveCount(2);
  const result: Array<{ name: string; bounds: Bounds }> = [];
  for (const sprite of await sprites.all()) {
    await expect(sprite).toBeVisible();
    const actual = await sprite.evaluate((element) => {
      const style = getComputedStyle(element), bounds = element.getBoundingClientRect();
      return { name: element.className, image: style.backgroundImage, size: style.backgroundSize,
        positionX: style.backgroundPositionX, positionY: style.backgroundPositionY,
        bounds: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height } };
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
    // Decode the served image's alpha within the displayed frame, not its transparent DOM box.
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
    result.push({ name: actual.name, bounds: { x: actual.bounds.x + left, y: actual.bounds.y + top, width: right - left, height: bottom - top } });
  }
  return result;
}

// --list loads these tests only. Actual rendering, interaction and screenshots require the Mac browser.
for (const width of widths) {
  test(`shared navigation ${width}px preserves readable labels, targets and painted character clearance`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/projects");
    await expect(page).toHaveURL(/\/projects\/?$/);
    await expect(page).toHaveTitle(/项目/);
    await ready(page, "项目");
    const links = await navigationGeometry(page, width);
    const characters = await characterPaintBounds(page);
    const main = await page.locator("main#main").boundingBox();
    const identity = await page.evaluate(identityClearanceTargets);
    const targets = [...links.map((bounds, index) => ({ name: `navigation ${labels[index]}`, bounds })), { name: "main", bounds: main! }, ...identity];
    await testInfo.attach("navigation-and-alpha-bounds", { body: JSON.stringify({ width, links, characters, targets }, null, 2), contentType: "application/json" });
    const screenshot = testInfo.outputPath(`navigation-${width}.png`);
    await page.screenshot({ path: screenshot, fullPage: false });
    await testInfo.attach(`Navigation ${width}px: visual review still required`, { path: screenshot, contentType: "image/png" });
    assertCharacterClearance(characters, targets);
    const resume = page.locator(".shell-links__inactive");
    await expect(resume).toHaveAttribute("aria-disabled", "true");
    await expect(resume).not.toHaveAttribute("href");
    await expect(page.getByRole("link", { name: "简历", exact: true })).toHaveCount(0);
    await page.getByRole("navigation", { name: "主要栏目", exact: true }).getByRole("link", { name: "文章", exact: true }).click();
    await ready(page, "文章");
    await navigationGeometry(page, width);
    await page.getByRole("navigation", { name: "主要栏目", exact: true }).getByRole("link", { name: "项目", exact: true }).click();
    await expect(page).toHaveURL(/\/projects\/?$/);
    await ready(page, "项目");
    await navigationGeometry(page, width);
    expect(errors).toEqual([]);
  });
}
