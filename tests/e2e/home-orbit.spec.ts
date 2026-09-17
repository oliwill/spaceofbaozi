import { expect, test, type Page } from "@playwright/test";

async function activateHomeOrbit(page: Page) {
  const root = page.locator("[data-home-orbit-root]");
  await expect(root).toHaveAttribute("data-orbit-ready", "true", { timeout: 10000 });
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent("baozi:intro-orbit-handoff", {
      detail: { angle: 35 * Math.PI / 180, angularVelocity: 0 },
    }));
    window.dispatchEvent(new CustomEvent("baozi:intro-person-stood"));
  });
  await expect(root).toHaveAttribute("data-orbit-active", "true");
  await expect(root).toHaveAttribute("data-controls-enabled", "true", { timeout: 1000 });
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
  await page.goto("/");
  await activateHomeOrbit(page);
});

test("scene handoff replaces the static portrait with the live orbit", async ({ page }) => {
  await expect(page.locator("[data-home-orbit-root]")).toBeVisible();
  await expect(page.locator(".home-v2__portrait")).toHaveCSS("opacity", "0");
});

test("home orbit separates ground translation from visual scale", async ({ page }) => {
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
  await setOrbitAngle(page, 270, 1);
  const revealOffset = Number(
    await page.locator("[data-home-orbit-root]").getAttribute("data-orbit-reveal-x"),
  );
  const rootWidth = await page.locator("[data-home-orbit-root]").evaluate((element) => element.getBoundingClientRect().width);
  const expectedOffset = Math.min(230, Math.max(150, rootWidth * 0.17)) * 0.2;
  expect(revealOffset).toBeCloseTo(expectedOffset, 0);
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

test("pointer keyboard and touch update only the orbit target", async ({ page }) => {
  const root = page.locator("[data-home-orbit-root]");
  await root.scrollIntoViewIfNeeded();
  const box = await root.boundingBox();
  expect(box).not.toBeNull();

  const initialTarget = await root.getAttribute("data-orbit-target-angle");
  await page.mouse.move((box?.x ?? 0) + (box?.width ?? 0) * 0.8, (box?.y ?? 0) + (box?.height ?? 0) * 0.35);
  await expect.poll(() => root.getAttribute("data-orbit-target-angle")).not.toBe(initialTarget);

  const pointerTarget = await root.getAttribute("data-orbit-target-angle");
  await root.focus();
  await root.press("ArrowRight");
  await expect.poll(() => root.getAttribute("data-orbit-target-angle")).not.toBe(pointerTarget);

  const keyboardTarget = await root.getAttribute("data-orbit-target-angle");
  await root.dispatchEvent("pointerdown", {
    pointerId: 7, pointerType: "touch", clientX: (box?.x ?? 0) + (box?.width ?? 0) * 0.3, clientY: (box?.y ?? 0) + (box?.height ?? 0) * 0.5, isPrimary: true,
  });
  await root.dispatchEvent("pointermove", {
    pointerId: 7, pointerType: "touch", clientX: (box?.x ?? 0) + (box?.width ?? 0) * 0.8, clientY: (box?.y ?? 0) + (box?.height ?? 0) * 0.55, isPrimary: true,
  });
  await root.dispatchEvent("pointerup", {
    pointerId: 7, pointerType: "touch", clientX: (box?.x ?? 0) + (box?.width ?? 0) * 0.8, clientY: (box?.y ?? 0) + (box?.height ?? 0) * 0.55, isPrimary: true,
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
  await expect(page.locator(".home-v2__identity")).toBeVisible();
});
test("production intro completion enables the scene orbit", async ({ page }) => {
  await page.goto("/");
  const root = page.locator("[data-home-orbit-root]");
  await expect(root).toHaveAttribute("data-orbit-ready", "true", { timeout: 10000 });
  await page.evaluate(() => {
    window.scrollTo({ top: document.documentElement.scrollHeight - window.innerHeight, behavior: "instant" });
  });
  await expect(root).toHaveAttribute("data-orbit-active", "true", { timeout: 5000 });
  await expect(root).toHaveAttribute("data-controls-enabled", "true", { timeout: 1000 });
});

test("reduced motion uses fixed positions and contact frame", async ({ browser }) => {
  const context = await browser.newContext({
    reducedMotion: "reduce",
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  await page.goto("/");
  const root = page.locator("[data-home-orbit-root]");
  await expect(root).toHaveAttribute("data-orbit-ready", "true");
  await expect(root).toHaveAttribute("data-reduced-motion", "true");
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("baozi:orbit-debug-set", {
    detail: { angle: 35 * Math.PI / 180, angularVelocity: 0 },
  })));
  await root.focus();
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
    await page.goto("/");
    await activateHomeOrbit(page);
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
    await page.screenshot({
      path: testInfo.outputPath(`orbit-front-${viewport.width}x${viewport.height}.png`),
    });
    await context.close();
  });
}
