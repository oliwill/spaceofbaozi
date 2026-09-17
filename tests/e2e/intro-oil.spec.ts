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

test("intro completes into the live home scene without a detached handoff", async ({ page }, testInfo) => {
  await page.goto("/");
  await scrollIntro(page, 0.9);
  expect((await actorState(page, "person")).live).toBe(true);

  await scrollIntro(page, 1);
  await expect(page.locator("[data-home-orbit-root]"))
    .toHaveAttribute("data-orbit-active", "true", { timeout: 5000 });
  await expect(page.locator("[data-home-orbit-root]"))
    .toHaveAttribute("data-controls-enabled", "true", { timeout: 1000 });
  await expect(page.locator("#home .home-v2__identity")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("intro-home-handoff.png") });
});
