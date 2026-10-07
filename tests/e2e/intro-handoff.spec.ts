import { expect, test, type Page } from "@playwright/test";
import type { V2Manifest } from "@/lib/intro-oil/v2";

async function moveToProgress(page: Page, progress: number) {
  const { target, current } = await page.locator("[data-io-scroll]").evaluate((track, value) => ({
    target: (track as HTMLElement).offsetTop + (track.scrollHeight - innerHeight) * value,
    current: scrollY,
  }), progress);
  await page.mouse.wheel(0, target - current);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeCloseTo(target, 0);
}

async function reachDesktopTerminal(page: Page) {
  const { target, current } = await page.locator("[data-io-scroll]").evaluate(track => ({
    target: Math.ceil((track as HTMLElement).offsetTop + (track.scrollHeight - innerHeight) * .972),
    current: scrollY,
  }));
  await page.mouse.wheel(0, target - current);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeCloseTo(target, 0);
  await expect(page.locator("[data-io-scroll]")).toBeVisible();
  await expect.poll(() => page.locator("[data-intro-oil-stage]").evaluate(element =>
    Number(getComputedStyle(element, "::before").opacity))).toBe(1);
}

async function homeGeometry(page: Page) {
  return page.locator("#home").evaluate((home) => {
    const box = (selector: string) => {
      const rect = home.querySelector(selector)!.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    };
    const interactive = matchMedia("(min-width: 768px)").matches;
    return {
      paper: box("#main"),
      person: box(interactive ? "[data-orbit-person]" : "[data-home-person]"),
      dog: box(interactive ? "[data-dog-visual]" : "[data-home-dog]"),
    };
  });
}

async function registrationError(page: Page) {
  return page.evaluate(async () => {
    const manifest = await (await fetch("/manifest/asset-manifest.v2.json")).json() as V2Manifest;
    const orbit = document.querySelector<HTMLElement>("[data-home-orbit-root]")!;
    const interactive = matchMedia("(min-width: 768px)").matches && orbit.dataset.orbitActive === "true" && orbit.dataset.personOrbitError !== "true";
    return ["person", "dog"].map(actor => {
      const intro = document.querySelector(`[data-io="${actor}"]`)!.getBoundingClientRect();
      const selector = interactive ? actor === "person" ? "[data-orbit-person]" : "[data-dog-visual]" : `[data-home-${actor}]`;
      const home = document.querySelector(selector)!.getBoundingClientRect();
      const sequence = manifest.sequences[actor === "person" ? "person-slide-in-rise-stand" : "dog-look-up-settle"];
      const anchor = sequence.frames.at(-1)!.anchors.ground;
      return Math.max(Math.abs(intro.left + intro.width * anchor[0] - (home.left + home.width * anchor[0])), Math.abs(intro.top + intro.height * anchor[1] - home.bottom), Math.abs(intro.width - home.width));
    });
  });
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test.describe(`real intro handoff ${viewport.width}px`, () => {
    test.use({ viewport });
    test(viewport.width >= 768 ? "a fresh downward wheel after the desktop terminal enters one real home and preserves geometry" : "actual wheel reveals one real home and release preserves its geometry", async ({ page }, testInfo) => {
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.goto("/");
      const stage = page.locator("[data-intro-oil-stage]");
      await expect(stage).toHaveAttribute("data-intro-state", "ready");
      await page.mouse.move(viewport.width * 0.6, viewport.height * 0.5);
      if (viewport.width >= 768) await reachDesktopTerminal(page);
      else await moveToProgress(page, 0.99);
      await expect(stage).toHaveCSS("opacity", "1");
      if (viewport.width >= 768) {
        await expect.poll(() => stage.evaluate(element => Number(getComputedStyle(element, "::before").opacity))).toBe(1);
        await expect(page.locator("[data-home-orbit-root]")).toHaveAttribute("data-controls-enabled", "false");
      } else await expect.poll(() => stage.evaluate(element => Number(getComputedStyle(element, "::before").opacity))).toBeCloseTo(0.5, 1);
      await expect(page.locator("[data-home-person], [data-home-dog], [data-orbit-person], [data-dog-visual]")).toHaveCount(4);
      for (const selector of ["[data-home-person]", "[data-home-dog]", "[data-orbit-person]", "[data-dog-visual]"]) await expect(page.locator(selector)).toBeHidden();
      await expect(page.locator("#home")).toHaveAttribute("inert", "");
      await expect(page.locator("#home")).toHaveCount(1);
      await expect.poll(async () => Math.max(...await registrationError(page))).toBeLessThan(1);
      const before = await homeGeometry(page);
      await page.screenshot({ path: testInfo.outputPath(viewport.width >= 768 ? "intro-desktop-terminal-wait.png" : "intro-crossfade-99.png") });
      if (viewport.width < 768) await moveToProgress(page, .997);
      const originalActors = await page.evaluateHandle(() => [document.querySelector('[data-io="person"]'), document.querySelector('[data-io="dog"]')]);
      const terminal = await page.locator('[data-io="person"], [data-io="dog"]').evaluateAll(elements => elements.map(element => {
        const rect = element.getBoundingClientRect(); const style = getComputedStyle(element);
        return { role: element.getAttribute("data-io"), x: rect.x, y: rect.y, width: rect.width, height: rect.height, image: style.backgroundImage, frame: style.backgroundPosition };
      }));
      await page.screenshot({ path: testInfo.outputPath("intro-terminal-before-transfer.png") });
      if (viewport.width >= 768) {
        // End the arriving wheel burst; elapsed time alone must not enter Home.
        await page.waitForTimeout(350);
        await expect(page.locator("[data-io-scroll]")).toBeVisible();
        await expect(page.locator("#home")).toHaveAttribute("inert", "");
        await expect(page.locator("[data-home-orbit-root]")).toHaveAttribute("data-controls-enabled", "false");
        await page.mouse.wheel(0, 4);
      } else await page.mouse.wheel(0, viewport.height);
      await expect(stage).toHaveAttribute("data-intro-state", "completed");
      await expect(page.locator("[data-io-scroll]")).toBeHidden();
      await expect(page.locator("#home")).not.toHaveAttribute("inert", "");
      await expect(page.locator("#home")).not.toHaveAttribute("data-intro-home-active", "true");
      await expect(page.locator("#home")).toHaveAttribute("data-intro-pose-owner", "held");
      await expect(page.locator("[data-intro-handoff] > .io-sprite")).toHaveCount(2);
      expect(await page.evaluate(nodes => nodes.every(node => node?.closest("[data-intro-handoff]")), originalActors)).toBe(true);
      const transferred = await page.locator('[data-intro-handoff] > .io-sprite').evaluateAll(elements => elements.map(element => {
        const rect = element.getBoundingClientRect(); const style = getComputedStyle(element);
        return { role: element.getAttribute("data-io"), x: rect.x, y: rect.y, width: rect.width, height: rect.height, image: style.backgroundImage, frame: style.backgroundPosition };
      }));
      for (const actor of terminal) {
        const result = transferred.find(value => value.role === actor.role)!;
        expect(result.image).toBe(actor.image); expect(result.frame).toBe(actor.frame);
        for (const key of ["x", "y", "width", "height"] as const) expect(Math.abs(result[key] - actor[key])).toBeLessThan(1);
      }
      await originalActors.dispose();
      const after = await homeGeometry(page);
      for (const actor of ["paper", "person", "dog"] as const) {
        for (const coordinate of ["x", "y", "width", "height"] as const) {
          expect(Math.abs(after[actor][coordinate] - before[actor][coordinate]), `${actor}.${coordinate}`).toBeLessThan(1);
        }
      }
      await expect(page.locator("#main h1")).toBeInViewport();
      await page.screenshot({ path: testInfo.outputPath("intro-final-home.png") });
      await page.getByRole("navigation", { name: "主要栏目" }).getByRole("link", { name: "文章", exact: true }).click();
      await expect(page.locator("#main h1")).toHaveText("文章");
      await page.goBack();
      await expect(page.locator("#main h1")).toContainText("我是包子");
      await expect(page.locator("[data-io-scroll]")).toBeHidden();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
      expect(errors).toEqual([]);
    });
  });
}

test("reversing the desktop terminal wait and resizing during grass exit retain intro ownership", async ({ page }) => {
  await page.goto("/");
  const stage = page.locator("[data-intro-oil-stage]");
  await expect(stage).toHaveAttribute("data-intro-state", "ready");
  await page.mouse.move(900, 450);
  await reachDesktopTerminal(page);
  await page.waitForTimeout(350);
  await expect(page.locator("[data-io-scroll]")).toBeVisible();
  await expect(page.locator("[data-home-orbit-root]")).toHaveAttribute("data-controls-enabled", "false");
  expect(await page.locator("#home").getAttribute("data-intro-controls-ready-at")).toBeNull();
  await moveToProgress(page, 0.97);
  await expect(stage).toHaveCSS("opacity", "1");
  await expect.poll(() => stage.evaluate(element => Number(getComputedStyle(element, "::before").opacity))).toBe(1);
  await expect(page.locator("[data-home-orbit-root]")).toHaveAttribute("data-controls-enabled", "false");
  await page.waitForTimeout(350);
  await expect(page.locator("[data-home-orbit-root]")).toHaveAttribute("data-controls-enabled", "false");
  await moveToProgress(page, 0.8);
  await page.setViewportSize({ width: 1024, height: 860 });
  await moveToProgress(page, 0.35);
  const ground = await page.evaluate(async () => {
    const manifest = await (await fetch("/manifest/asset-manifest.v2.json")).json() as V2Manifest;
    const stage = document.querySelector("[data-intro-oil-stage]")!.getBoundingClientRect();
    const grass = document.querySelector<HTMLImageElement>('[data-io="grass"]')!;
    const grassRect = grass.getBoundingClientRect();
    const person = document.querySelector('[data-io="person"]')!.getBoundingClientRect();
    return {
      actual: person.top + person.height * manifest.sequences["person-pulled-run-right"].frames[0].anchors.ground[1],
      expected: stage.height - grassRect.height + grassRect.height * manifest.environment["intro-grass"].visibleBounds.y / grass.naturalHeight + innerHeight * 0.08,
    };
  });
  expect(Math.abs(ground.actual - ground.expected)).toBeLessThan(1);
  await expect(page.locator("[data-io-scroll]")).toBeVisible();
  await expect(page.locator("#home")).toHaveAttribute("inert", "");
});

test("keyboard skip-to-main works while assets are pending and cannot revive the intro", async ({ page }) => {
  let release: (() => void) | undefined;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/manifest/asset-manifest.v2.json", async route => { await pending; await route.continue(); });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-intro-oil-stage]")).toHaveAttribute("data-intro-state", "loading");
  const skip = page.getByRole("link", { name: "跳到正文", exact: true });
  await skip.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main$/);
  await expect(page.locator("#main")).toBeFocused();
  await expect(page.locator("[data-io-scroll]")).toBeHidden();
  release!();
  await page.waitForLoadState("networkidle");
  await expect(page.locator("[data-intro-oil-stage]")).toHaveAttribute("data-intro-state", "skipped");
  await expect(page.locator("#home")).not.toHaveAttribute("data-intro-home-active", "true");
});

test("tail registration follows actual home actors across the 767/768 breakpoint", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-intro-oil-stage]")).toHaveAttribute("data-intro-state", "ready");
  await page.mouse.move(600, 450);
  await reachDesktopTerminal(page);
  for (const width of [767, 768, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    // Reverse first so a desktop resize is followed by an actual approach,
    // rather than treating the zero-distance wheel as a new downward pull.
    await moveToProgress(page, 0.96);
    if (width >= 768) await reachDesktopTerminal(page);
    else await moveToProgress(page, 0.98);
    await expect.poll(async () => Math.max(...await registrationError(page))).toBeLessThan(1);
    await expect(page.locator("[data-io-scroll]")).toBeVisible();
  }
});

test("a late home asset failure exits the paused tail into the complete fallback", async ({ page }) => {
  let release: (() => void) | undefined;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/assets/home/runtime/person-look-around-12dir.webp", async route => { await pending; await route.abort(); });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-intro-oil-stage]")).toHaveAttribute("data-intro-state", "ready");
  await page.mouse.move(800, 450);
  await reachDesktopTerminal(page);
  release!();
  await expect(page.locator("[data-home-orbit-root]")).toHaveAttribute("data-person-orbit-error", "true");
  await expect(page.locator("[data-io-scroll]")).toBeHidden();
  await expect(page.locator("#home")).not.toHaveAttribute("inert", "");
  await expect(page.locator("#home .site-characters")).toHaveAttribute("data-home-art-state", "fallback");
  await expect(page.locator("[data-home-asset-fallback]")).toBeVisible();
  await expect(page.locator("#home .site-characters__still")).toBeHidden();
  await expect(page.locator("[data-home-orbit-root]")).toBeHidden();
});
