import { expect, test, type Locator, type Page } from "@playwright/test";

async function readyOrbit(page: Page) {
  const orbit = page.locator("[data-home-orbit-root]");
  await expect(orbit).toHaveAttribute("data-orbit-ready", "true");
  await expect(orbit).toHaveAttribute("data-orbit-active", "true");
  await expect(orbit).toHaveAttribute("data-controls-enabled", "true");
  return orbit;
}

async function targetAngle(orbit: Locator) {
  return Number(await orbit.getAttribute("data-orbit-target-angle"));
}

test("left-rail character responds to actual mouse and keyboard input", async ({ page }, testInfo) => {
  const { observeHomeInput } = await import("../support/real-input-observation");
  const observation = await observeHomeInput(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let failure: unknown, geometry: unknown;
  try {
    await page.goto("/#home");
    const orbit = await readyOrbit(page);
    const initial = await targetAngle(orbit);
    expect(Number.isFinite(initial)).toBe(true);
    const box = await orbit.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.move(box!.x + box!.width * 0.8, box!.y + box!.height * 0.35);
    await expect.poll(() => targetAngle(orbit)).not.toBe(initial);
    const baseline = await observation.baseline();
    const before = baseline.value;
    await orbit.focus();
    await expect(orbit).toBeFocused();
    await observation.check(before, false);
    await page.keyboard.press("ArrowRight");
    await expect.poll(async () => ((await targetAngle(orbit)) - before + Math.PI * 2) % (Math.PI * 2)).toBeCloseTo(Math.PI / 12, 4);
    const layout = await page.evaluate(() => {
      const person = document.querySelector("[data-orbit-person]")!.getBoundingClientRect();
      const dog = document.querySelector("[data-dog-visual]")!.getBoundingClientRect();
      const nav = document.querySelector(".shell-links")!.getBoundingClientRect();
      const main = document.querySelector("#main")!.getBoundingClientRect();
      const root = document.querySelector<HTMLElement>("[data-home-orbit-root]")!;
      return { dogTop: dog.top, personKnee: person.top + person.height * .5, dogRight: dog.right, paperLeft: main.left, navBottom: nav.bottom, personTop: person.top, overflow: document.documentElement.scrollWidth - innerWidth,
        orbitAngle: Number(root.dataset.orbitAngle), orbitTargetAngle: Number(root.dataset.orbitTargetAngle) };
    });
    geometry = layout;
    expect(layout.dogTop).toBeGreaterThan(layout.personKnee);
    expect(layout.dogRight).toBeLessThan(layout.paperLeft);
    expect(layout.personTop).toBeGreaterThanOrEqual(layout.navBottom - 1);
    expect(layout.overflow).toBeLessThanOrEqual(0);
    await observation.check(layout.orbitTargetAngle);
    expect(errors).toEqual([]);
  } catch (error) { failure = error; throw error; }
  finally {
    try { await observation.finish(testInfo, { geometry, errors, failure: failure ? String(failure) : undefined }); }
    catch (error) { if (!failure) throw error; }
  }
});

test("home return remounts one working orbit controller", async ({ page }) => {
  await page.goto("/#home");
  await readyOrbit(page);
  for (let visit = 0; visit < 2; visit += 1) {
    await page.getByRole("navigation", { name: "主要栏目" }).getByRole("link", { name: "文章", exact: true }).click();
    await expect(page.locator("#main h1")).toHaveText("文章");
    await page.locator(".shell-brand").click();
    await expect(page.locator("#main h1")).toContainText("我是包子");
    const orbit = await readyOrbit(page);
    await orbit.focus();
    const before = await targetAngle(orbit);
    await page.keyboard.press("ArrowRight");
    await expect.poll(async () => ((await targetAngle(orbit)) - before + Math.PI * 2) % (Math.PI * 2)).toBeCloseTo(Math.PI / 12, 4);
    await expect(page.locator("[data-io-scroll]")).toBeHidden();
  }
});

test("motion preference and narrow viewport retain a usable character fallback", async ({ page }) => {
  await page.goto("/#home");
  const orbit = await readyOrbit(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(orbit).toHaveAttribute("data-reduced-motion", "true");
  await orbit.focus();
  const initial = await targetAngle(orbit);
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => targetAngle(orbit)).not.toBe(initial);
  await expect(orbit).toHaveAttribute("data-dog-frame", "0");
  await page.setViewportSize({ width: 360, height: 844 });
  await expect(orbit).toBeHidden();
  await expect(page.locator(".site-characters__still")).toHaveCSS("opacity", "1");
  const links = page.getByRole("navigation", { name: "主要栏目" }).getByRole("link");
  await expect(links).toHaveCount(4);
  await links.filter({ hasText: "文章" }).click();
  await expect(page.locator("#main h1")).toHaveText("文章");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
});
