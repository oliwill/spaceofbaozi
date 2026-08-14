import { expect, test, type Page } from "@playwright/test";
import { INTRO_CHECKPOINTS } from "@/lib/intro/createTimeline";

async function setProgress(page: Page, progress: number) {
  await page.evaluate((value) => {
    const root = document.querySelector<HTMLElement>("[data-intro-root]");
    if (!root) throw new Error("intro root missing");
    scrollTo(0, root.offsetTop + (root.scrollHeight - innerHeight) * value);
  }, progress);
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

test.beforeEach(async ({ page }) => {
  await page.goto("/lab/intro?assetMode=placeholder");
  await expect(page.locator("[data-intro-root]")).toHaveAttribute("data-intro-complete", "false");
});

test("intro lab exposes a sticky stage and skip control", async ({ page }) => {
  await expect(page.locator("[data-intro-stage]")).toHaveCSS("position", "sticky");
  await expect(page.getByRole("button", { name: "跳过动画" })).toBeVisible();
});

test("ball appears before dog and person", async ({ page }) => {
  await setProgress(page, 0.04);
  await expect(page.locator("[data-intro-ball]")).toHaveAttribute("data-visible", "true");
  await expect(page.locator("[data-intro-dog]")).toHaveAttribute("data-visible", "false");
  await expect(page.locator("[data-intro-person]")).toHaveAttribute("data-visible", "false");
  await setProgress(page, 0.12);
  await expect(page.locator("[data-intro-dog]")).toHaveAttribute("data-visible", "true");
});

test("grass stays at the bottom and scene states are exclusive", async ({ page }) => {
  await setProgress(page, 0.65);
  const grass = page.locator("[data-intro-scene='grass']");
  await expect(grass).toHaveAttribute("data-active", "true");
  await expect(page.locator("[data-intro-scene='home']")).toHaveAttribute("data-active", "false");
  const grassBox = await grass.boundingBox();
  expect(grassBox).not.toBeNull();
  expect(Math.abs((grassBox?.y ?? 0) + (grassBox?.height ?? 0) - 900)).toBeLessThan(2);

  await setProgress(page, 0.82);
  await expect(grass).toHaveAttribute("data-active", "false");
  await expect(page.locator("[data-intro-scene='home']")).toHaveAttribute("data-active", "true");
});

test("all narrative checkpoints are deterministic and reversible", async ({ page }, testInfo) => {
  for (const [index, checkpoint] of INTRO_CHECKPOINTS.entries()) {
    await setProgress(page, checkpoint);
    await expect(page.locator("[data-intro-root]")).toHaveAttribute("data-intro-progress", checkpoint.toFixed(3));
    await page.screenshot({ path: testInfo.outputPath(`checkpoint-${index}-${Math.round(checkpoint * 100)}.png`) });
  }
  for (const checkpoint of [...INTRO_CHECKPOINTS].reverse()) {
    await setProgress(page, checkpoint);
    await expect(page.locator("[data-intro-root]")).toHaveAttribute("data-intro-progress", checkpoint.toFixed(3));
  }
});

test("dog settles beside the person without orbiting", async ({ page }) => {
  const points = [];
  for (const progress of [0.94, 0.955, 0.97, 0.985, 1]) {
    await setProgress(page, progress);
    points.push(await page.locator("[data-intro-dog]").evaluate((element) => ({
      x: Number((element as HTMLElement).dataset.pathX),
      y: Number((element as HTMLElement).dataset.pathY),
      transform: getComputedStyle(element).transform,
    })));
  }
  expect(Math.max(...points.map(({ x }) => x)) - Math.min(...points.map(({ x }) => x))).toBeLessThan(2);
  expect(Math.max(...points.map(({ y }) => y)) - Math.min(...points.map(({ y }) => y))).toBeLessThan(2);
  expect(points.every(({ transform }) => transform === "none" || !transform.includes("rotate"))).toBe(true);
});

test("leash uses the live viewport coordinate system", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  await page.goto("/lab/intro");
  await setProgress(page, 0.45);
  const leash = page.locator("[data-intro-leash]");
  await expect(page.locator(".intro__leash")).toHaveAttribute("viewBox", "0 0 1280 720");
  await expect(leash).toHaveAttribute("opacity", "1");
  const endpointErrors = await page.evaluate(async () => {
    const manifest = await fetch("/assets/intro/production/intro-manifest.json").then((response) => response.json());
    const stage = document.querySelector<HTMLElement>("[data-intro-stage]")!;
    const path = document.querySelector<SVGPathElement>("[data-intro-leash]")!;
    const person = document.querySelector<HTMLElement>("[data-intro-sprite='person']")!;
    const dog = document.querySelector<HTMLElement>("[data-intro-sprite='dog']")!;
    const personFrame = Number(person.dataset.frame);
    const dogFrame = Number(dog.dataset.frame);
    const hand = manifest.assets.personRun.anchors[personFrame].hand;
    const collar = manifest.assets.dogRun.anchors[dogFrame].collar;
    const stageRect = stage.getBoundingClientRect();
    const personRect = person.getBoundingClientRect();
    const dogRect = dog.getBoundingClientRect();
    const start = path.getPointAtLength(0);
    const end = path.getPointAtLength(path.getTotalLength());
    return {
      hand: Math.hypot(start.x - (personRect.left - stageRect.left + personRect.width * hand[0]), start.y - (personRect.top - stageRect.top + personRect.height * hand[1])),
      collar: Math.hypot(end.x - (dogRect.left - stageRect.left + dogRect.width * collar[0]), end.y - (dogRect.top - stageRect.top + dogRect.height * collar[1])),
    };
  });
  expect(endpointErrors.hand).toBeLessThan(1);
  expect(endpointErrors.collar).toBeLessThan(1);
  await context.close();
});

test("trip sequence starts from its first frame", async ({ page }) => {
  await setProgress(page, 0.65);
  await expect(page.locator("[data-intro-sprite='person']")).toHaveAttribute("data-frame", "0");
  await setProgress(page, 0.819);
  await expect(page.locator("[data-intro-sprite='person']")).toHaveAttribute("data-frame", "7");
});

test("skip stores session completion and reveals stable content", async ({ page }) => {
  await page.getByRole("button", { name: "跳过动画" }).click();
  await expect(page.locator("[data-intro-root]")).toHaveAttribute("data-intro-complete", "true");
  expect(await page.evaluate(() => sessionStorage.getItem("baozi-intro-complete"))).toBe("1");
  await expect(page.locator("[data-intro-scene='home']")).toHaveAttribute("data-active", "true");
  await expect(page.locator("[data-intro-final-art]")).toHaveAttribute("src", "/assets/intro/production/intro-final-still.webp");
});

test("production assets load by default", async ({ page }) => {
  await page.goto("/lab/intro");
  await expect(page.locator("[data-intro-root]")).toHaveAttribute("data-intro-complete", "false");
  await setProgress(page, 0.45);
  await expect(page.locator("[data-intro-sprite='person']")).toHaveCSS("background-image", /production\/person\/summer-pulled-run-right\.webp/);
  await expect(page.locator("[data-intro-sprite='person']")).not.toHaveCSS("background-image", /placeholders/);
});

test("production C2 grass preserves aspect ratio and exits reversibly", async ({ page }) => {
  await page.goto("/lab/intro");
  const grass = page.locator("[data-intro-scene='grass']");
  const grassImage = page.locator("[data-intro-grass-image]");
  await expect(grassImage).toHaveAttribute("src", "/assets/intro/production/environment/intro-grass.webp");
  await setProgress(page, 0.65);
  const imageBox = await grassImage.boundingBox();
  expect(imageBox).not.toBeNull();
  expect(imageBox?.width).toBeCloseTo(1440, 0);
  expect(imageBox?.height).toBeCloseTo(360, 0);
  expect((imageBox?.y ?? 0) + (imageBox?.height ?? 0)).toBeCloseTo(900, 0);
  const ballBox = await page.locator("[data-intro-ball]").boundingBox();
  expect(ballBox?.width).toBeCloseTo(45, 0);

  await setProgress(page, 0.8);
  expect(await grass.evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).m42)).toBeGreaterThan(0);
  await setProgress(page, 0.82);
  await expect(grass).toHaveAttribute("data-active", "false");
  await setProgress(page, 0.65);
  expect(await grass.evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).m42)).toBeCloseTo(0, 0);
  await expect(grass).toHaveAttribute("data-active", "true");
});

test("production assets render all eight narrative checkpoints", async ({ page }, testInfo) => {
  await page.goto("/lab/intro");
  await expect(page.locator("[data-intro-root]")).toHaveAttribute("data-intro-complete", "false");
  for (const [index, checkpoint] of INTRO_CHECKPOINTS.entries()) {
    await setProgress(page, checkpoint);
    await expect(page.locator("[data-intro-root]")).toHaveAttribute("data-intro-progress", checkpoint.toFixed(3));
    await page.screenshot({ path: testInfo.outputPath(`production-checkpoint-${index}-${Math.round(checkpoint * 100)}.png`) });
  }
});

test("production manifest failure renders the final still", async ({ page }) => {
  await page.route("**/assets/intro/production/intro-manifest.json", (route) => route.abort());
  await page.goto("/lab/intro");
  await expect(page.locator("[data-intro-root]")).toHaveAttribute("data-intro-complete", "true");
  await expect(page.locator("[data-intro-scene='home']")).toHaveAttribute("data-active", "true");
  await expect(page.locator("[data-intro-final-art]")).toBeVisible();
  await expect(page.locator("[data-intro-sprite='person']")).not.toHaveCSS("background-image", /placeholders/);
});

test("reduced motion renders stable HTML content", async ({ browser }, testInfo) => {
  const context = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto("/lab/intro?assetMode=placeholder");
  await expect(page.locator("[data-intro-root]")).toHaveAttribute("data-intro-complete", "true");
  await expect(page.locator("[data-intro-scene='home']")).toHaveAttribute("data-active", "true");
  await expect(page.locator("[data-intro-final-art]")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("reduced-motion.png") });
  await context.close();
});

for (const viewport of [{ width: 1280, height: 720 }, { width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
  test(`production final state does not overlap identity at ${viewport.width}x${viewport.height}`, async ({ browser }, testInfo) => {
    const context = await browser.newContext({ reducedMotion: "reduce", viewport });
    const page = await context.newPage();
    await page.goto("/lab/intro");
    const identity = await page.locator(".intro__identity").boundingBox();
    const finalArt = await page.locator("[data-intro-final-art]").boundingBox();
    expect(identity).not.toBeNull();
    expect(finalArt).not.toBeNull();
    const overlaps = identity !== null && finalArt !== null
      && identity.x < finalArt.x + finalArt.width
      && identity.x + identity.width > finalArt.x
      && identity.y < finalArt.y + finalArt.height
      && identity.y + identity.height > finalArt.y;
    expect(overlaps).toBe(false);
    await page.screenshot({ path: testInfo.outputPath(`production-final-${viewport.width}x${viewport.height}.png`) });
    await context.close();
  });
}
