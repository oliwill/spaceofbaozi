import { expect, test, type Page } from "@playwright/test";
import { INTRO_CHECKPOINTS } from "@/lib/intro/createTimeline";

async function setProgress(page: Page, progress: number) {
  await page.evaluate((value) => {
    const root = document.querySelector<HTMLElement>("[data-intro-root]");
    if (!root) throw new Error("intro root missing");
    scrollTo(0, root.offsetTop + (root.scrollHeight - innerHeight) * value);
  }, progress);
  await page.waitForFunction((expected) => document.querySelector<HTMLElement>("[data-intro-root]")?.dataset.introProgress === expected, progress.toFixed(3));
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

test("grass hands off continuously to the home sheet", async ({ page }) => {
  const grass = page.locator("[data-intro-scene='grass']");
  const home = page.locator("[data-intro-scene='home']");
  await setProgress(page, 0.65);
  await expect(grass).toHaveAttribute("data-active", "true");
  await expect(home).toHaveAttribute("data-active", "false");
  const grassBox = await grass.boundingBox();
  expect(grassBox).not.toBeNull();
  expect(Math.abs((grassBox?.y ?? 0) + (grassBox?.height ?? 0) - 900)).toBeLessThan(2);

  await setProgress(page, 0.8);
  await expect(grass).toHaveAttribute("data-active", "true");
  await expect(home).toHaveAttribute("data-active", "true");
  expect(Number(await home.evaluate((element) => getComputedStyle(element).opacity))).toBeGreaterThan(0);

  await setProgress(page, 0.82);
  await expect(grass).toHaveAttribute("data-active", "false");
  await expect(home).toHaveAttribute("data-active", "true");
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

test("dog completes a perspective half-lap around the person", async ({ page }) => {
  const points = [];
  for (const progress of [0.9, 0.925, 0.95, 0.975, 1]) {
    await setProgress(page, progress);
    points.push(await page.locator("[data-home-orbit-root]").evaluate((element) => ({
      angle: Number((element as HTMLElement).dataset.orbitAngle),
      scale: Number((element as HTMLElement).dataset.dogScale),
      layer: (element as HTMLElement).dataset.orbitLayer,
    })));
  }
  expect(Math.max(...points.map(({ angle }) => angle)) - Math.min(...points.map(({ angle }) => angle))).toBeGreaterThan(2);
  expect(Math.max(...points.map(({ scale }) => scale)) - Math.min(...points.map(({ scale }) => scale))).toBeGreaterThan(0.1);
  expect(new Set(points.map(({ layer }) => layer))).toEqual(new Set(["behind", "front"]));
});

test("final actors settle in the left identity region and remain still", async ({ page }) => {
  await setProgress(page, 1);
  const orbit = page.locator("[data-home-orbit-root]");
  const person = page.locator("[data-orbit-person]");
  const firstAngle = await orbit.getAttribute("data-orbit-angle");
  const personBox = await person.boundingBox();
  expect(personBox).not.toBeNull();
  expect((personBox?.x ?? 1440) + (personBox?.width ?? 0) / 2).toBeLessThan(1440 * 0.5);
  await page.waitForTimeout(2_000);
  await expect(orbit).toHaveAttribute("data-orbit-angle", firstAngle ?? "");
  await expect(page.getByRole("button", { name: "跳过动画" })).toBeHidden();
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

test("leash follows rotated person anchors across the trip interval", async ({ browser }) => {
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
  ]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    await page.goto("/lab/intro");
    for (const progress of [0.65, 0.7, 0.72, 0.75, 0.78, 0.8, 0.819]) {
      await setProgress(page, progress);
      const endpointErrors = await page.evaluate(async () => {
        const manifest = await fetch("/assets/intro/production/intro-manifest.json").then((response) => response.json());
        const stage = document.querySelector<HTMLElement>("[data-intro-stage]")!;
        const path = document.querySelector<SVGPathElement>("[data-intro-leash]")!;
        const stageRect = stage.getBoundingClientRect();
        const project = (wrapperSelector: string, spriteSelector: string, anchor: readonly [number, number]) => {
          const wrapper = document.querySelector<HTMLElement>(wrapperSelector)!;
          const sprite = document.querySelector<HTMLElement>(spriteSelector)!;
          const matrix = new DOMMatrix(getComputedStyle(wrapper).transform);
          const originX = sprite.offsetWidth * 0.5;
          const originY = sprite.offsetHeight;
          const localX = sprite.offsetWidth * anchor[0];
          const localY = sprite.offsetHeight * anchor[1];
          const relativeX = localX - originX;
          const relativeY = localY - originY;
          return {
            x: wrapper.offsetLeft + originX + matrix.a * relativeX + matrix.c * relativeY + matrix.e - stageRect.left,
            y: wrapper.offsetTop + originY + matrix.b * relativeX + matrix.d * relativeY + matrix.f - stageRect.top,
          };
        };
        const personFrame = Number(document.querySelector<HTMLElement>("[data-intro-sprite='person']")!.dataset.frame);
        const dogFrame = Number(document.querySelector<HTMLElement>("[data-intro-sprite='dog']")!.dataset.frame);
        const person = project("[data-intro-person]", "[data-intro-sprite='person']", manifest.assets.personTrip.anchors[personFrame].hand);
        const collar = project("[data-intro-dog]", "[data-intro-sprite='dog']", manifest.assets.dogRun.anchors[dogFrame].collar);
        const start = path.getPointAtLength(0);
        const end = path.getPointAtLength(path.getTotalLength());
        return {
          hand: Math.hypot(start.x - person.x, start.y - person.y),
          collar: Math.hypot(end.x - collar.x, end.y - collar.y),
        };
      });
      expect(endpointErrors.hand, `${viewport.width}x${viewport.height} @ ${progress}`).toBeLessThan(2);
      expect(endpointErrors.collar, `${viewport.width}x${viewport.height} @ ${progress}`).toBeLessThan(2);
    }
    for (const progress of [0.819, 0.8, 0.75, 0.7, 0.65]) {
      await setProgress(page, progress);
      await expect(page.locator("[data-intro-leash]")).toHaveAttribute("opacity", "1");
    }
    await context.close();
  }
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
  await expect(page.getByRole("button", { name: "跳过动画" })).toBeHidden();
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
    const identity = await page.locator(".intro__identity > *").evaluateAll((elements) => {
      const boxes = elements.map((element) => element.getBoundingClientRect());
      return {
        x: Math.min(...boxes.map((box) => box.x)),
        y: Math.min(...boxes.map((box) => box.y)),
        right: Math.max(...boxes.map((box) => box.right)),
        bottom: Math.max(...boxes.map((box) => box.bottom)),
      };
    });
    const finalArt = await page.locator("[data-intro-final-art]").boundingBox();
    expect(finalArt).not.toBeNull();
    const overlaps = finalArt !== null
      && identity.x < finalArt.x + finalArt.width
      && identity.right > finalArt.x
      && identity.y < finalArt.y + finalArt.height
      && identity.bottom > finalArt.y;
    expect(overlaps).toBe(false);
    await page.screenshot({ path: testInfo.outputPath(`production-final-${viewport.width}x${viewport.height}.png`) });
    await context.close();
  });
}
