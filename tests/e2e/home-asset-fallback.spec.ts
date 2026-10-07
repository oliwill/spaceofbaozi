import { expect, test, type Page } from "@playwright/test";

const person = "**/assets/home/runtime/person-look-around-12dir.webp";
const dog = "**/assets/home/runtime/dog-orbit-run-8dir-4f.webp";
const fallback = "**/assets/intro/runtime/intro-final-still.webp";

async function expectFallback(page: Page, unavailable = false) {
  const characters = page.locator("#home .site-characters");
  const orbit = characters.locator("[data-home-orbit-root]");
  await expect(characters).toHaveAttribute("data-home-art-state", unavailable ? "unavailable" : "fallback");
  await expect(characters.locator(".site-characters__still")).toBeHidden();
  await expect(orbit).toBeHidden();
  await expect(orbit).toHaveAttribute("tabindex", "-1");
  await expect(orbit).toHaveAttribute("data-controls-enabled", "false");
  const still = characters.locator("[data-home-asset-fallback]");
  if (unavailable) await expect(still).toBeHidden();
  else {
    await expect(still).toBeVisible();
    await expect.poll(() => still.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBe(768);
    await expect(still).toHaveCSS("object-fit", "contain");
  }
  await expect(page.locator("#home")).not.toHaveAttribute("inert", "");
  await expect(page.locator("[data-io-scroll]")).toBeHidden();
  await expect(page.locator("#main h1")).toContainText("我是包子");
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test.describe(`home asset fallback ${viewport.width}px`, () => {
    test.use({ viewport });
    for (const failure of ["person", "dog", "both", "fallback"] as const) {
      test(`${failure} failure leaves one complete still or clean HTML`, async ({ page }, testInfo) => {
        const errors: string[] = [];
        page.on("pageerror", error => errors.push(error.message));
        if (failure !== "dog") await page.route(person, route => route.abort());
        if (failure !== "person") await page.route(dog, route => route.abort());
        if (failure === "fallback") await page.route(fallback, route => route.abort());
        await page.goto("/");
        await expectFallback(page, failure === "fallback");
        await page.screenshot({ path: testInfo.outputPath(`home-${failure}-failure.png`) });
        for (const width of [767, 768, viewport.width]) {
          await page.setViewportSize({ width, height: viewport.height });
          await expectFallback(page, failure === "fallback");
        }
        await page.emulateMedia({ reducedMotion: "reduce" });
        await expectFallback(page, failure === "fallback");
        await page.getByRole("navigation", { name: "主要栏目" }).getByRole("link", { name: "文章", exact: true }).click();
        await expect(page.locator("#main h1")).toHaveText("文章");
        await page.goBack();
        await expectFallback(page, failure === "fallback");
        expect(errors).toEqual([]);
      });
    }
  });
}

test("a failed Home atlas exits a pending Intro without waiting for its sibling", async ({ page }) => {
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/manifest/asset-manifest.v2.json", async route => { await pending; await route.continue(); });
  await page.route(dog, async route => { await pending; await route.continue(); });
  await page.route(person, route => route.abort());
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expectFallback(page);
  release();
  await page.waitForLoadState("networkidle");
  await expectFallback(page);
});

test("late asset failure moves keyboard focus out of the hidden interaction", async ({ page }) => {
  let fail!: () => void;
  const pending = new Promise<void>(resolve => { fail = resolve; });
  await page.route(person, async route => { await pending; await route.abort(); });
  await page.goto("/#home", { waitUntil: "domcontentloaded" });
  const orbit = page.locator("[data-home-orbit-root]");
  await expect(orbit).toHaveAttribute("data-controls-enabled", "true");
  await orbit.focus();
  await expect(orbit).toBeFocused();
  fail();
  await expectFallback(page);
  await expect(page.locator("#main")).toBeFocused();
});
