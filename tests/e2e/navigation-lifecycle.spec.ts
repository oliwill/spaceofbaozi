import { expect, test, type Page } from "@playwright/test";

const POST = "a[href*='/blog/ryoutei-menu-05']";
const article = /\/blog\/ryoutei-menu-05\/?$/;

async function healthy(page: Page) {
  await expect(page.locator("main#main")).toHaveCount(1);
  await expect(page.locator("main h1")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "主要栏目", exact: true }).locator("a")).toHaveCount(4);
  await expect(page.locator("[data-turn-mask]")).toHaveAttribute("data-phase", "idle");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
}

for (const width of [360, 390, 1440]) {
  test(`${width}px repeated clicks and browser history preserve real content`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/blog");
    for (let index = 0; index < 3; index += 1) {
      await page.locator(POST).first().dblclick({ delay: 30 });
      await expect(page).toHaveURL(article);
      await page.waitForTimeout(650);
      await healthy(page);
      await page.goBack();
      await expect(page).toHaveURL(/\/blog\/?$/);
      await page.waitForTimeout(650);
      await healthy(page);
      await page.goForward();
      await expect(page).toHaveURL(article);
      await page.waitForTimeout(650);
      await healthy(page);
      await page.locator("a.article-page__back").click();
      await expect(page).toHaveURL(/\/blog\/?$/);
      await page.waitForTimeout(650);
      await healthy(page);
    }
    expect(errors).toEqual([]);
  });

  test(`${width}px later navigation cancels an in-flight transition`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/blog");
    await page.locator(POST).first().click();
    await page.getByRole("navigation", { name: "主要栏目", exact: true }).getByRole("link", { name: "照片", exact: true }).dispatchEvent("click");
    await expect(page).toHaveURL(/\/photos\/?$/);
    await page.waitForTimeout(1300);
    await healthy(page);
    await expect(page.locator("main h1")).toHaveText("摄影");
    await expect(page.locator("html")).not.toHaveAttribute("data-nav-direction");
  });

  test(`${width}px back and forward restore scroll without a stale Lenis target`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/blog/ryoutei-menu-05");
    await expect(page.locator("html")).toHaveClass(/lenis/);
    await page.mouse.move(width * 0.75, 550);
    await page.mouse.wheel(0, 1150);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(700);
    await page.waitForTimeout(600);
    const saved = await page.evaluate(() => window.scrollY);
    await page.locator("[data-editorial-back]").click();
    await expect(page).toHaveURL(/\/blog\/?$/);
    await page.goBack();
    await expect(page).toHaveURL(article);
    await page.waitForTimeout(1100);
    expect(Math.abs(await page.evaluate(() => window.scrollY) - saved)).toBeLessThan(30);
    await healthy(page);
    await page.goForward();
    await expect(page).toHaveURL(/\/blog\/?$/);
    await page.waitForTimeout(600);
    await healthy(page);
    expect(await page.evaluate(() => window.scrollY)).toBeLessThan(5);
  });
}

test("changing reduced motion while the mask covers releases it safely", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/blog");
  await page.locator(POST).first().click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page).toHaveURL(article);
  await page.waitForTimeout(500);
  await healthy(page);
  await expect(page.locator("html")).not.toHaveAttribute("data-nav-direction");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.locator("a.article-page__back").click();
  await expect(page).toHaveURL(/\/blog\/?$/);
  await page.waitForTimeout(600);
  await healthy(page);
});

test("a late failed fetch cannot clear or cover the succeeding destination", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let photosPreparationStarted = false;
  await page.exposeFunction("markPhotosPreparation", () => { photosPreparationStarted = true; });
  await page.addInitScript(() => {
    document.addEventListener("astro:before-preparation", (event) => {
      const preparation = event as Event & { to: URL };
      if (preparation.to.pathname === "/photos") {
        void (window as Window & { markPhotosPreparation?: () => Promise<void> }).markPhotosPreparation?.();
      }
    });
  });
  let releaseFailure!: () => void;
  const failureGate = new Promise<void>((resolve) => { releaseFailure = resolve; });
  await page.route("**/blog/ryoutei-menu-05", async (route) => {
    await failureGate;
    await route.abort("failed");
  });
  try {
    await page.goto("/blog");
    await page.locator(POST).first().click();
    await page.getByRole("navigation", { name: "主要栏目", exact: true }).getByRole("link", { name: "照片", exact: true }).click();
    await expect.poll(() => photosPreparationStarted).toBe(true);
    releaseFailure();
    await expect(page).toHaveURL(/\/photos\/?$/);
    await page.waitForTimeout(1000);
    await healthy(page);
    await expect(page.locator("main h1")).toHaveText("摄影");
  } finally {
    releaseFailure();
  }
});

test("a throwing loader removes the mask and leaves the current document readable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    document.addEventListener("astro:before-preparation", (event) => {
      const preparation = event as Event & { loader: () => Promise<void> };
      preparation.loader = () => Promise.reject(new Error("test:loader-failure"));
    }, { once: true });
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/blog");
  await page.locator(POST).first().click();
  await page.waitForTimeout(600);
  await healthy(page);
  await expect(page.locator("main h1")).toHaveText("文章");
  expect(errors).toEqual(["test:loader-failure"]);
});

test("a queued cancelled swap preserves the later navigation's pending stylesheet", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const startTransition = document.startViewTransition.bind(document);
    const swapGate = new Promise<void>((resolve) => {
      document.addEventListener("test:release-swap", () => resolve(), { once: true });
    });
    document.startViewTransition = (update) => startTransition(async () => {
      await swapGate;
      if (typeof update === "function") await update();
      else await update?.update?.();
    });
  });
  const photos = await page.request.get("/photos");
  const body = (await photos.text()).replace("</head>", '<link rel="stylesheet" href="/navigation-race.css"></head>');
  await page.route("**/photos", (route) => route.fulfill({ contentType: "text/html", body }));
  let stylesheetStarted!: () => void;
  const started = new Promise<void>((resolve) => { stylesheetStarted = resolve; });
  let releaseStylesheet!: () => void;
  const stylesheetGate = new Promise<void>((resolve) => { releaseStylesheet = resolve; });
  await page.route("**/navigation-race.css", async (route) => {
    stylesheetStarted();
    await stylesheetGate;
    await route.fulfill({ contentType: "text/css", body: ":root { --navigation-race-loaded: 1; }" });
  });
  await page.goto("/blog");
  await page.locator(POST).first().click();
  await expect(page.locator("html")).toHaveAttribute("data-astro-transition", "forward");
  await page.getByRole("navigation", { name: "主要栏目", exact: true }).getByRole("link", { name: "照片", exact: true }).dispatchEvent("click");
  await started;
  await page.evaluate(() => document.dispatchEvent(new Event("test:release-swap")));
  await expect(page).toHaveURL(article);
  releaseStylesheet();
  await expect(page).toHaveURL(/\/photos\/?$/);
  await healthy(page);
  await expect(page.locator("main h1")).toHaveText("摄影");
  await expect(page.locator('link[data-astro-transition-persist^="page-turn-preload-"]')).toHaveCount(0);
  expect(errors).toEqual([]);
});
