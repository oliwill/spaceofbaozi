import { expect, test, type Page } from "@playwright/test";
import type { V2Manifest } from "@/lib/intro-oil/v2";

async function complete(page: Page) {
  await expect(page.locator("[data-intro-oil-stage]")).toHaveAttribute("data-intro-state", "ready");
  if (page.viewportSize()!.width >= 768) {
    const { target, current } = await page.locator("[data-io-scroll]").evaluate(track => ({
      target: Math.ceil((track as HTMLElement).offsetTop + (track.scrollHeight - innerHeight) * .972),
      current: scrollY,
    }));
    await page.mouse.wheel(0, target - current);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeCloseTo(target, 0);
    const manifest = await page.evaluate(async () => await (await fetch("/manifest/asset-manifest.v2.json")).json() as V2Manifest);
    await expect.poll(() => page.evaluate(manifest => ["person", "dog"].map(actor => {
      const sequence = manifest.sequences[actor === "person" ? "person-slide-in-rise-stand" : "dog-look-up-settle"];
      const style = getComputedStyle(document.querySelector(`[data-io="${actor}"]`)!);
      if (!style.backgroundImage.includes(sequence.src)) return -1;
      const size = style.backgroundSize.split(" ").map(Number.parseFloat);
      const position = style.backgroundPosition.split(" ").map(Number.parseFloat);
      return Math.round(-position[1] / (size[1] / sequence.rows)) * sequence.columns
        + Math.round(-position[0] / (size[0] / sequence.columns)) + 0;
    }), manifest)).toEqual([7, 7]);
    await expect(page.locator("#home")).toHaveAttribute("inert", "");
    await expect.poll(() => page.locator("[data-intro-oil-stage]").evaluate(element =>
      Number(getComputedStyle(element, "::before").opacity))).toBe(1);
    await page.waitForTimeout(350);
    await expect(page.locator("[data-io-scroll]")).toBeVisible();
    await expect(page.locator("#home")).toHaveAttribute("inert", "");
    await page.mouse.wheel(0, 4);
  } else {
    const distance = await page.locator("[data-io-scroll]").evaluate(track => track.scrollHeight - innerHeight - scrollY);
    await page.mouse.wheel(0, distance + 20);
  }
  await expect(page.locator("#home")).toHaveAttribute("data-intro-pose-owner", "held");
  await expect(page.locator("[data-io-scroll]")).toBeHidden();
  await expect(page.locator("[data-intro-handoff] > .io-sprite")).toHaveCount(2);
}
async function ready(page: Page) {
  const root = page.locator("[data-home-orbit-root]");
  await expect(root).toHaveAttribute("data-orbit-ready", "true");
  await expect(root).toHaveAttribute("data-controls-enabled", "true");
  return root;
}
async function released(page: Page) {
  await expect(page.locator("#home")).not.toHaveAttribute("data-intro-pose-owner");
  await expect(page.locator("[data-intro-handoff]")).toHaveCount(0);
  await expect(page.locator("[data-orbit-person]")).toBeVisible();
  await expect(page.locator("[data-dog-visual]")).toBeVisible();
}

test("first real arrow releases once while focus, stationary events and wheel retain the pose", async ({ page }, testInfo) => {
  await page.goto("/"); await page.mouse.move(900, 450); await complete(page);
  const root = await ready(page);
  await root.focus(); await expect(root).toBeFocused();
  await root.dispatchEvent("pointermove", { pointerType: "mouse", clientX: 120, clientY: 450, movementX: 0, movementY: 0 });
  await root.dispatchEvent("keydown", { key: "ArrowRight" });
  await page.mouse.wheel(0, 100);
  await expect(page.locator("#home")).toHaveAttribute("data-intro-pose-owner", "held");
  const before = Number(await root.getAttribute("data-orbit-target-angle"));
  await page.keyboard.press("ArrowRight"); await released(page);
  await expect.poll(async () => (Number(await root.getAttribute("data-orbit-target-angle")) - before + Math.PI * 2) % (Math.PI * 2)).toBeCloseTo(Math.PI / 12, 5);
  await page.screenshot({ path: testInfo.outputPath("first-keyboard-interaction.png") });
});

test("the first real moving pointer releases and responds without a second gesture", async ({ page }, testInfo) => {
  await page.goto("/"); await page.mouse.move(900, 450); await complete(page);
  const root = await ready(page); const before = await root.getAttribute("data-orbit-target-angle");
  const box = (await root.boundingBox())!;
  await page.mouse.move(box.x + box.width * .8, box.y + box.height * .35);
  await released(page);
  await expect.poll(() => root.getAttribute("data-orbit-target-angle")).not.toBe(before);
  await page.screenshot({ path: testInfo.outputPath("first-pointer-interaction.png") });
});

test("a pointer already over the hidden interaction stays held until a real click", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-intro-oil-stage]")).toHaveAttribute("data-intro-state", "ready");
  const root = page.locator("[data-home-orbit-root]"); const box = (await root.boundingBox())!;
  const point = { x: box.x + box.width * .7, y: box.y + box.height * .4 };
  await page.mouse.move(point.x, point.y); await complete(page); await ready(page);
  await expect(page.locator("#home")).toHaveAttribute("data-intro-pose-owner", "held");
  await page.mouse.click(point.x, point.y); await released(page);
});

test("mobile and breakpoint or motion remounts retain the terminal pair until eligible input", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/"); await page.mouse.move(20, 400); await complete(page);
  await page.mouse.wheel(0, 160);
  for (const width of [767, 768, 1440, 390, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(page.locator("#home")).toHaveAttribute("data-intro-pose-owner", "held");
    await expect(page.locator('[data-intro-handoff] [data-io="person"]')).toBeVisible();
    await expect(page.locator('[data-intro-handoff] [data-io="dog"]')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  const root = await ready(page);
  await expect(page.locator("#home")).toHaveAttribute("data-intro-pose-owner", "held");
  await page.screenshot({ path: testInfo.outputPath("held-after-responsive-remount.png") });
  await root.focus(); await page.keyboard.press("ArrowRight"); await released(page);
});

for (const outcome of ["load", "fail"] as const) {
  test(`pending Home art stays held through first input, then ${outcome} resolves safely`, async ({ page }) => {
    let release!: () => void;
    const pending = new Promise<void>(resolve => { release = resolve; });
    await page.route("**/assets/home/runtime/person-look-around-12dir.webp", async route => { await pending; if (outcome === "load") await route.continue(); else await route.abort(); });
    await page.goto("/", { waitUntil: "domcontentloaded" }); await page.mouse.move(900, 450); await complete(page);
    const root = page.locator("[data-home-orbit-root]");
    await expect(root).toHaveAttribute("data-controls-enabled", "true");
    await root.focus(); await page.keyboard.press("ArrowRight");
    await expect(page.locator("#home")).toHaveAttribute("data-intro-pose-owner", "held");
    release();
    if (outcome === "load") {
      await ready(page);
      await expect(page.locator("#home")).toHaveAttribute("data-intro-pose-owner", "held");
      await page.keyboard.press("ArrowRight"); await released(page);
    } else {
      await expect(page.locator("#home .site-characters")).toHaveAttribute("data-home-art-state", "fallback");
      await expect(page.locator("[data-intro-handoff]")).toHaveCount(0);
      await expect(page.locator("[data-home-asset-fallback]")).toBeVisible();
      await expect(root).toBeHidden();
      await expect(page.locator("#main")).toBeFocused();
    }
  });
}
