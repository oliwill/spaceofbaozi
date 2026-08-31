import { expect, test, type Page } from "@playwright/test";

async function setProgress(page: Page, progress: number) {
  await page.evaluate((value) => {
    const root = document.querySelector<HTMLElement>("[data-intro-root]");
    if (!root) throw new Error("intro root missing");
    scrollTo(0, root.offsetTop + (root.scrollHeight - innerHeight) * value);
  }, progress);
  await page.waitForFunction((expected) => document.querySelector<HTMLElement>("[data-intro-root]")?.dataset.introProgress === expected, progress.toFixed(3));
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

async function setOrbitAngle(page: Page, degrees: number, angularVelocity = 1) {
  await page.evaluate(({ degrees: angleDegrees, angularVelocity: velocity }) => {
    window.dispatchEvent(new CustomEvent("baozi:orbit-debug-set", {
      detail: { angle: angleDegrees * Math.PI / 180, angularVelocity: velocity },
    }));
  }, { degrees, angularVelocity });
  await page.evaluate(() => new Promise<void>((resolve) => (
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  )));
}

test.beforeEach(async ({ page }) => {
  await page.goto("/lab/intro?assetMode=placeholder");
  await expect(page.locator("[data-home-orbit-root]"))
    .toHaveAttribute("data-orbit-ready", "true");
});

test("home orbit separates ground translation from visual scale", async ({ page }) => {
  await setProgress(page, 1);
  for (const selector of ["[data-orbit-anchor]", "[data-dog-visual]"]) {
    const originError = await page.locator(selector).evaluate((element) => {
      const [originX, originY] = getComputedStyle(element).transformOrigin
        .split(" ")
        .map(Number.parseFloat);
      const box = element as HTMLElement;
      return Math.max(Math.abs(originX - box.offsetWidth / 2), Math.abs(originY - box.offsetHeight));
    });
    expect(originError).toBeLessThanOrEqual(1);
  }
  await expect(page.locator("[data-dog-shadow]")).toBeVisible();
  await expect(page.locator("[data-orbit-person]")).toHaveCSS("z-index", "2");
});

for (const [degrees, scale, layer] of [
  [0, 0.97, "front"],
  [90, 1.08, "front"],
  [180, 0.97, "front"],
  [270, 0.86, "behind"],
] as const) {
  test(`perspective checkpoint ${degrees}`, async ({ page }, testInfo) => {
    await setProgress(page, 1);
    await setOrbitAngle(page, degrees);
    const root = page.locator("[data-home-orbit-root]");
    await expect(root).toHaveAttribute("data-orbit-layer", layer);
    expect(Number(await root.getAttribute("data-dog-scale"))).toBeCloseTo(scale, 2);
    await page.screenshot({ path: testInfo.outputPath(`home-orbit-${degrees}.png`) });
  });
}

test("dog feet remain grounded through depth scaling", async ({ page }) => {
  const errors = [];
  for (const degrees of [270, 0, 90, 180]) {
    await setOrbitAngle(page, degrees);
    errors.push(await page.evaluate(() => {
      const dog = document.querySelector("[data-dog-visual]")!.getBoundingClientRect();
      const anchor = document.querySelector("[data-orbit-anchor]")!.getBoundingClientRect();
      return Math.abs(dog.bottom - anchor.bottom);
    }));
  }
  expect(Math.max(...errors)).toBeLessThanOrEqual(1);
});

test("dog remains identifiable at the deepest rear checkpoint", async ({ page }) => {
  await setProgress(page, 1);
  await setOrbitAngle(page, 270, 1);
  const revealOffset = Number(
    await page.locator("[data-home-orbit-root]").getAttribute("data-orbit-reveal-x"),
  );
  expect(revealOffset).toBeGreaterThanOrEqual(40);
  expect(revealOffset).toBeLessThanOrEqual(48);
});

test("dog direction follows the ellipse tangent in both directions", async ({ page }) => {
  for (const [degrees, velocity, expectedDirection] of [
    [0, 1, "2"], [90, 1, "4"], [180, 1, "6"], [270, 1, "0"],
    [0, -1, "6"], [90, -1, "0"], [180, -1, "2"], [270, -1, "4"],
  ] as const) {
    await setOrbitAngle(page, degrees, velocity);
    await expect(page.locator("[data-home-orbit-root]"))
      .toHaveAttribute("data-dog-direction", expectedDirection);
  }
});

test("person gaze follows the rendered dog position", async ({ page }) => {
  await setOrbitAngle(page, 90);
  await expect(page.locator("[data-home-orbit-root]"))
    .toHaveAttribute("data-person-direction", "3");
});

test("direction changes crossfade sprite layers without rotating sheets", async ({ page }) => {
  await setProgress(page, 1);
  await setOrbitAngle(page, 0);
  const dogLayers = page.locator("[data-dog-sprite], [data-dog-sprite-crossfade]");
  await expect(dogLayers).toHaveCount(2);
  await setOrbitAngle(page, 90);
  const state = await dogLayers.evaluateAll((elements) => elements.map((element) => ({
    visible: element.getAttribute("data-sprite-visible"),
    transition: getComputedStyle(element).transitionDuration,
    transform: getComputedStyle(element).transform,
  })));
  expect(state.filter(({ visible }) => visible === "true")).toHaveLength(1);
  expect(state.every(({ transition }) => transition === "0.1s")).toBe(true);
  expect(state.every(({ transform }) => transform === "none")).toBe(true);
});

test("layer hysteresis prevents side flicker", async ({ page }) => {
  await setOrbitAngle(page, 0);
  for (const depth of [-0.079, 0.079, -0.079, 0.079]) {
    await setOrbitAngle(page, Math.asin(depth) * 180 / Math.PI);
    await expect(page.locator("[data-home-orbit-root]"))
      .toHaveAttribute("data-orbit-layer", "front");
  }
  await setOrbitAngle(page, Math.asin(-0.081) * 180 / Math.PI);
  await expect(page.locator("[data-home-orbit-root]"))
    .toHaveAttribute("data-orbit-layer", "behind");
});

test("intro final beat applies perspective and reverses without duplicate actors", async ({ page }) => {
  await setProgress(page, 0.9);
  await expect(page.locator("[data-home-orbit-root]"))
    .toHaveAttribute("data-orbit-active", "true");
  await expect(page.locator("[data-intro-dog]"))
    .toHaveAttribute("data-visible", "false");
  await expect(page.locator("[data-intro-person]"))
    .toHaveAttribute("data-visible", "false");
  const startScale = Number(await page.locator("[data-home-orbit-root]").getAttribute("data-dog-scale"));

  await setProgress(page, 1);
  const endScale = Number(await page.locator("[data-home-orbit-root]").getAttribute("data-dog-scale"));
  expect(Math.abs(endScale - startScale)).toBeGreaterThan(0.1);

  await setProgress(page, 0.89);
  await expect(page.locator("[data-home-orbit-root]"))
    .toHaveAttribute("data-orbit-active", "false");
  await expect(page.locator("[data-intro-person]"))
    .toHaveAttribute("data-visible", "true");
});

test("pointer controls enable after the standing handoff", async ({ page }) => {
  await setProgress(page, 0.99);
  await expect(page.locator("[data-home-orbit-root]"))
    .toHaveAttribute("data-controls-enabled", "false");
  await setProgress(page, 1);
  await expect(page.locator("[data-home-orbit-root]"))
    .toHaveAttribute("data-controls-enabled", "true", { timeout: 600 });
});

test("pointer keyboard and touch update only the orbit target", async ({ page }) => {
  await setProgress(page, 1);
  const root = page.locator("[data-home-orbit-root]");
  await expect(root).toHaveAttribute("data-controls-enabled", "true", { timeout: 600 });
  const box = await root.boundingBox();
  expect(box).not.toBeNull();

  const initialTarget = await root.getAttribute("data-orbit-target-angle");
  await page.mouse.move((box?.x ?? 0) + 240, (box?.y ?? 0) + 300);
  await expect.poll(() => root.getAttribute("data-orbit-target-angle")).not.toBe(initialTarget);

  const pointerTarget = await root.getAttribute("data-orbit-target-angle");
  await root.focus();
  await root.press("ArrowRight");
  await expect.poll(() => root.getAttribute("data-orbit-target-angle")).not.toBe(pointerTarget);

  const keyboardTarget = await root.getAttribute("data-orbit-target-angle");
  await root.dispatchEvent("pointerdown", {
    pointerId: 7, pointerType: "touch", clientX: 600, clientY: 500, isPrimary: true,
  });
  await root.dispatchEvent("pointermove", {
    pointerId: 7, pointerType: "touch", clientX: 680, clientY: 510, isPrimary: true,
  });
  await root.dispatchEvent("pointerup", {
    pointerId: 7, pointerType: "touch", clientX: 680, clientY: 510, isPrimary: true,
  });
  await expect.poll(() => root.getAttribute("data-orbit-target-angle")).not.toBe(keyboardTarget);
  await expect(root).toHaveCSS("touch-action", "pan-y");
});

test("resize preserves the rendered angle", async ({ page }) => {
  await setOrbitAngle(page, 145, 0);
  const root = page.locator("[data-home-orbit-root]");
  const before = Number(await root.getAttribute("data-orbit-angle"));
  await page.setViewportSize({ width: 1280, height: 720 });
  expect(Number(await root.getAttribute("data-orbit-angle"))).toBeCloseTo(before, 5);
});

test("dog asset failure keeps readable identity content", async ({ page }) => {
  await page.route("**/dog-orbit-run-8dir-4f.webp", (route) => route.abort());
  await page.reload();
  await expect(page.locator("[data-home-orbit-root]"))
    .toHaveAttribute("data-asset-error", "true");
  await expect(page.locator("[data-orbit-anchor]")).toBeHidden();
  await expect(page.locator(".intro__identity")).toBeVisible();
});

test("reduced motion uses fixed positions and contact frame", async ({ browser }) => {
  const context = await browser.newContext({
    reducedMotion: "reduce",
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  await page.goto("/lab/intro?assetMode=placeholder");
  const root = page.locator("[data-home-orbit-root]");
  await expect(root).toHaveAttribute("data-reduced-motion", "true");
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("baozi:orbit-debug-set", {
    detail: { angle: 35 * Math.PI / 180, angularVelocity: 0 },
  })));
  await root.press("ArrowRight");
  await expect(root).toHaveAttribute("data-dog-frame", "0");
  await expect(root).toHaveCSS("--orbit-crossfade-ms", "180ms");
  await context.close();
});

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
]) {
  test(`orbit perspective fits ${viewport.width}x${viewport.height}`, async ({ browser }, testInfo) => {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    await page.goto("/lab/intro?assetMode=placeholder");
    await expect(page.locator("[data-home-orbit-root]"))
      .toHaveAttribute("data-orbit-ready", "true");
    await setProgress(page, 1);
    await setOrbitAngle(page, 90, 1);
    const geometry = await page.evaluate(() => {
      const person = document.querySelector("[data-orbit-person]")!.getBoundingClientRect();
      const dog = document.querySelector("[data-dog-visual]")!.getBoundingClientRect();
      return {
        overflow: document.documentElement.scrollWidth - innerWidth,
        dogTop: dog.top,
        personKnee: person.top + person.height * 0.5,
        dogRight: dog.right,
        dogBottom: dog.bottom,
      };
    });
    expect(geometry.overflow).toBeLessThanOrEqual(1);
    expect(geometry.dogTop).toBeGreaterThan(geometry.personKnee);
    expect(geometry.dogRight).toBeLessThanOrEqual(viewport.width);
    expect(geometry.dogBottom).toBeLessThanOrEqual(viewport.height);
    await page.screenshot({
      path: testInfo.outputPath(`orbit-front-${viewport.width}x${viewport.height}.png`),
    });
    await context.close();
  });
}
