import { expect, test, type Page } from "@playwright/test";

async function scrollIntro(page: Page, progress: number) {
  await page.evaluate((value) => {
    const track = document.querySelector<HTMLElement>("[data-io-scroll]");
    if (!track) throw new Error("intro track missing");
    window.scrollTo({
      top: track.offsetTop + (track.scrollHeight - window.innerHeight) * value,
      behavior: "instant",
    });
  }, progress);
  await page.waitForTimeout(350);
}

async function actorState(page: Page, name: "ball" | "dog" | "person") {
  return page.locator(`[data-io="${name}"]`).evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      live: element.classList.contains("is-live"),
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
    };
  });
}

test("intro actors stay visible inside the stage through the main sequence", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.locator("[data-intro-oil-stage]")).toHaveAttribute("data-intro-state", "ready");

  for (const [progress, expected] of [
    [0.15, { ball: true, dog: true, person: null }],
    [0.35, { ball: null, dog: true, person: true }],
    [0.8, { ball: false, dog: false, person: true }],
    [0.9, { ball: false, dog: false, person: true }],
    [0.96, { ball: false, dog: true, person: true }],
  ] as const) {
    await scrollIntro(page, progress);
    for (const name of ["ball", "dog", "person"] as const) {
      const expectedLive = expected[name];
      if (expectedLive === null) continue;
      const state = await actorState(page, name);
      expect(state.live, `${name} visibility at ${progress}`).toBe(expectedLive);
      if (expectedLive) {
        expect(state.width).toBeGreaterThan(20);
        expect(state.height).toBeGreaterThan(20);
        expect(state.right).toBeGreaterThan(0);
        expect(state.left).toBeLessThan(1440);
        expect(state.bottom).toBeGreaterThan(0);
        expect(state.top).toBeLessThan(900);
      }
    }
    await page.screenshot({
      path: testInfo.outputPath(`intro-checkpoint-${Math.round(progress * 100)}.png`),
    });
  }
});

test("intro completes into the shared home and does not replay on return", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.locator("[data-intro-oil-stage]")).toHaveAttribute("data-intro-state", "ready");
  await scrollIntro(page, 0.96);
  const person = await actorState(page, "person");
  expect(person.live).toBe(true);
  expect(person.right).toBeLessThan(400);

  await scrollIntro(page, 1);
  await expect(page.locator("[data-io-scroll]")).toBeHidden();
  await expect(page.locator("#home #main h1")).toBeInViewport();
  await page.getByRole("navigation", { name: "主要栏目" }).getByRole("link", { name: "文章", exact: true }).click();
  await expect(page.locator(".blog-page h1")).toBeVisible();
  await page.locator(".shell-brand").click();
  await expect(page).toHaveURL(/\/#home$/);
  await expect(page.locator("[data-io-scroll]")).toBeHidden();
  await expect(page.locator("#home #main h1")).toBeVisible();
  await expect(page.locator("html")).not.toHaveAttribute("data-nav-direction");
  await page.screenshot({ path: testInfo.outputPath("intro-home-handoff.png") });
  await page.goto("/");
  await expect(page.locator("[data-io-scroll]")).toBeHidden();
  await expect(page.locator("#home main h1")).toBeInViewport();
});

for (const width of [360, 390, 1440]) {
  test.describe(`intro access at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });

    test("skip reaches content and survives back/forward without replay", async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.goto("/");
      await page.getByRole("link", { name: "跳过开场" }).click();
      await expect(page.locator("[data-io-scroll]")).toBeHidden();
      await expect(page.locator("#home main h1")).toBeInViewport();
      await page.getByRole("navigation", { name: "主要栏目" }).getByRole("link", { name: "文章", exact: true }).click();
      await expect(page.locator(".blog-page h1")).toBeVisible();
      await page.goBack();
      await expect(page.locator("#home main h1")).toBeVisible();
      await expect(page.locator("[data-io-scroll]")).toBeHidden();
      await page.goForward();
      await expect(page.locator(".blog-page h1")).toBeVisible();
      await page.locator(".shell-brand").click();
      await expect(page.locator("#home main h1")).toBeVisible();
      await page.waitForTimeout(200);
      expect(errors).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });

    test("direct home and reduced motion omit the intro", async ({ page }) => {
      await page.goto("/#home");
      await expect(page.locator("[data-io-scroll]")).toBeHidden();
      await expect(page.locator("#home main h1")).toBeInViewport();
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/");
      await expect(page.locator("[data-io-scroll]")).toBeHidden();
      await expect(page.locator("#home main h1")).toBeInViewport();
    });

    test("failed manifest or sprite never leaves an empty scroll track", async ({ page }) => {
      await page.route("**/manifest/asset-manifest.v2.json", route => route.abort());
      await page.goto("/");
      await expect(page.locator("[data-io-scroll]")).toBeHidden();
      await expect(page.locator("#home main h1")).toBeInViewport();
      await page.unroute("**/manifest/asset-manifest.v2.json");
      await page.evaluate(() => sessionStorage.clear());
      await page.route("**/assets/intro/runtime/*", route => route.abort());
      await page.reload();
      await expect(page.locator("[data-io-scroll]")).toBeHidden();
      await expect(page.locator("#home main h1")).toBeInViewport();
    });
  });
}

test("pending assets cannot revive an intro after navigation", async ({ page }) => {
  await page.route("**/manifest/asset-manifest.v2.json", async route => {
    await new Promise(resolve => setTimeout(resolve, 500));
    await route.continue();
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("link", { name: "跳过开场" }).click();
  await page.getByRole("navigation", { name: "主要栏目" }).getByRole("link", { name: "文章", exact: true }).click();
  await page.waitForTimeout(700);
  await expect(page.locator(".blog-page h1")).toBeVisible();
  await expect(page.locator("[data-io-scroll]")).toHaveCount(0);
  await page.locator(".shell-brand").click();
  await expect(page.locator("[data-io-scroll]")).toBeHidden();
  await expect(page.locator("#home main h1")).toBeInViewport();
});

test("without JavaScript the homepage remains accessible", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(baseURL!);
  await expect(page.locator("[data-io-scroll]")).toBeHidden();
  await expect(page.locator("#home main h1")).toBeInViewport();
  await page.getByRole("navigation", { name: "主要栏目" }).getByRole("link", { name: "文章", exact: true }).click();
  await expect(page.locator(".blog-page h1")).toBeVisible();
  await context.close();
});

test("slow assets time out into content instead of trapping the reader", async ({ page }) => {
  await page.route("**/manifest/asset-manifest.v2.json", async route => {
    await new Promise(resolve => setTimeout(resolve, 7000));
    await route.abort();
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-intro-oil-stage]")).toHaveAttribute("data-intro-state", "loading");
  await expect(page.locator("[data-io-scroll]")).toBeHidden({ timeout: 8000 });
  await expect(page.locator("#home main h1")).toBeInViewport();
});

test("changing reduced motion during the intro reaches the home immediately", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-intro-oil-stage]")).toHaveAttribute("data-intro-state", "ready");
  await scrollIntro(page, 0.35);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("[data-io-scroll]")).toBeHidden();
  await expect(page.locator("#home main h1")).toBeInViewport();
});

test("invalid manifest resolves to the same stable home", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/manifest/asset-manifest.v2.json", route => route.fulfill({ json: { version: 2, sequences: {} } }));
  await page.goto("/");
  await expect(page.locator("[data-io-scroll]")).toBeHidden();
  await expect(page.locator("#home main h1")).toBeInViewport();
  expect(errors).toEqual([]);
});
