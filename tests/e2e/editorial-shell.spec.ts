import { expect, test, type Page } from "@playwright/test";

async function expectSharedNavigation(page: Page) {
  const nav = page.getByRole("navigation", { name: "主要栏目" });
  await expect(nav.getByRole("link")).toHaveCount(4);
  await expect(nav.locator(".shell-links__inactive")).toHaveAttribute("aria-disabled", "true");
  await expect(nav.getByRole("link", { name: "简历", exact: true })).toHaveCount(0);
  await expect(page.locator(".shell-brand")).toHaveAttribute("href", "/#home");
  await expect(page.locator("#main h1")).toBeVisible();
  const boxes = await nav.locator("a, .shell-links__inactive").evaluateAll((links) => links.map((link) => {
    const rect = link.getBoundingClientRect();
    return { top: rect.top, width: rect.width, height: rect.height };
  }));
  boxes.forEach((box) => {
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  });
  return boxes;
}

test("home and columns share left dot-paper navigation and characters", async ({ page }, testInfo) => {
  for (const path of ["/#home", "/blog", "/photos", "/projects"]) {
    await page.goto(path);
    await expectSharedNavigation(page);
    const layout = await page.evaluate(() => {
      const main = document.querySelector("#main")!.getBoundingClientRect();
      const nav = document.querySelector(".shell-nav")!.getBoundingClientRect();
      const character = document.querySelector(".site-characters")?.getBoundingClientRect();
      return {
        navRight: nav.right, characterRight: character?.right ?? null, mainLeft: main.left,
        paper: getComputedStyle(document.querySelector("#main")!).backgroundColor,
        ink: getComputedStyle(document.body).color,
        width: document.documentElement.scrollWidth,
        viewport: innerWidth,
      };
    });
    expect(layout.navRight).toBeLessThanOrEqual(layout.mainLeft);
    if (path === "/photos") {
      expect(layout.characterRight).toBeNull();
      await expect(page.locator("[data-album-character]")).toHaveCount(0);
    } else {
      expect(layout.characterRight).not.toBeNull();
      expect(layout.characterRight!).toBeLessThanOrEqual(layout.mainLeft);
    }
    expect(layout.paper).toBe("rgb(250, 249, 246)");
    expect(layout.ink).toBe("rgb(41, 40, 37)");
    expect(layout.width).toBeLessThanOrEqual(layout.viewport);
  }
  await page.goto("/#home");
  await page.screenshot({ path: testInfo.outputPath("home-left-rail-desktop.png") });
});

for (const width of [360, 390]) {
  test(`${width}px home and reading keep four navigation links on one row`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    for (const path of ["/#home", "/blog/ryoutei-menu-05"]) {
      await page.goto(path);
      const boxes = await expectSharedNavigation(page);
      expect(Math.max(...boxes.map(({ top }) => top)) - Math.min(...boxes.map(({ top }) => top))).toBeLessThan(1);
      const measure = await page.evaluate(() => ({
        width: document.documentElement.scrollWidth,
        viewport: innerWidth,
        nav: document.querySelector(".shell-links")!.getBoundingClientRect().toJSON(),
        cast: document.querySelector(".site-characters")!.getBoundingClientRect().toJSON(),
      }));
      expect(measure.width).toBeLessThanOrEqual(measure.viewport);
      expect(measure.cast.bottom).toBeLessThanOrEqual(measure.nav.top);
      if (path.startsWith("/blog/")) {
        const character = page.locator(".shell-nav .site-characters__crouching-person");
        await expect(character).toBeVisible();
        await expect.poll(() => character.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
        await expect(page.locator(".shell-nav .site-characters__dog")).toHaveCount(0);
        await expect(page.locator(".shell-nav [data-article-rail], .shell-nav [data-reading-progress]")).toHaveCount(0);
        await expect(page.locator("#main [data-article-rail]")).toHaveCount(1);
        const characterBox = await character.boundingBox();
        expect(characterBox!.width).toBeLessThanOrEqual(100);
        expect(characterBox!.y+characterBox!.height).toBeLessThanOrEqual(measure.nav.top);
      }
      await page.screenshot({ path: testInfo.outputPath(`${path === "/#home" ? "home" : "article"}-${width}.png`) });
    }
  });
}

test("document brand returns to visible home without replaying intro", async ({ page }) => {
  await page.goto("/blog");
  await page.locator(".shell-brand").click();
  await page.waitForURL(/#home$/);
  await expect(page.locator("#home h1")).toBeVisible();
  await expect(page.locator("[data-io-scroll]")).toBeHidden();
  expect(await page.locator("#home").evaluate((element) => Math.abs(element.getBoundingClientRect().top))).toBeLessThanOrEqual(48);
});

test("short desktop keeps reading controls inside the paper and crouching character in the navigation", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/blog/ryoutei-menu-05");
  await expectSharedNavigation(page);
  await expect(page.locator(".shell-nav [data-article-rail], .shell-nav .reading-contents, .shell-nav [data-reading-progress]")).toHaveCount(0);
  await expect(page.locator(".shell-nav .site-characters__dog")).toHaveCount(0);
  const character = page.locator(".shell-nav .site-characters__crouching-person");
  await expect(character).toBeVisible();
  await expect.poll(() => character.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  const before = await page.locator(".shell-brand").evaluate((element) => element.getBoundingClientRect().top);
  await page.mouse.move(1100, 550);
  await page.mouse.wheel(0, 600);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(300);
  const controls = page.locator("#main [data-article-rail]");
  await expect(controls.locator("[data-reading-progress]")).toBeVisible();
  await expect(controls.locator(".reading-contents")).toBeVisible();
  const geometry = await page.evaluate(() => {
    const main = document.querySelector("#main")!.getBoundingClientRect();
    const controls = document.querySelector("#main [data-article-rail]")!;
    const progress = controls.querySelector("[data-reading-progress]")!.getBoundingClientRect();
    const contents = controls.querySelector(".reading-contents")!.getBoundingClientRect();
    return { progressBottom: progress.bottom, progressLeft: progress.left, progressRight: progress.right, contentsLeft: contents.left, contentsRight: contents.right, contentsHeight: contents.height, mainLeft: main.left, mainRight: main.right, overflow: document.documentElement.scrollWidth - innerWidth };
  });
  expect(geometry.progressBottom).toBeLessThanOrEqual(720);
  expect(geometry.contentsHeight).toBeGreaterThan(44);
  expect(geometry.progressLeft).toBeGreaterThanOrEqual(geometry.mainLeft);
  expect(geometry.contentsLeft).toBeGreaterThanOrEqual(geometry.mainLeft);
  expect(geometry.progressRight).toBeLessThanOrEqual(geometry.mainRight);
  expect(geometry.contentsRight).toBeLessThanOrEqual(geometry.mainRight);
  expect(geometry.overflow).toBeLessThanOrEqual(0);
  const brandTop = await page.locator(".shell-brand").evaluate((element) => element.getBoundingClientRect().top);
  expect(Math.abs(brandTop - before)).toBeLessThanOrEqual(13);
  await page.screenshot({ path: testInfo.outputPath("article-short-desktop.png") });
});
