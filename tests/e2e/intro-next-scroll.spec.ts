import { expect, test, type Page } from "@playwright/test";
import { retainIntroBurstInputs } from "../support/intro-burst-input-evidence";

// Observe real rendered sprites and browser-delivered input, without importing
// the gate implementation. The 300ms burst rule is a heuristic, not evidence
// of physical Mac trackpad gesture/momentum boundaries.
async function start(page: Page) {
  await page.addInitScript(() => {
    const records: unknown[] = [];
    (window as any).__nextScrollInput = records;
    window.addEventListener("wheel", event => records.push({ at: performance.now(),
      type: "wheel", trusted: event.isTrusted, cancelable: event.cancelable,
      dy: event.deltaY, dx: event.deltaX, mode: event.deltaMode }), { capture: true });
    for (const type of ["baozi:intro-orbit-handoff", "baozi:intro-person-stood"])
      window.addEventListener(type, () => records.push({ at: performance.now(), type }));
  });
  await page.goto("/");
  await expect(page.locator("[data-intro-oil-stage]")).toHaveAttribute("data-intro-state", "ready");
  await page.mouse.move(900, 450);
}

async function pose(page: Page) {
  return page.evaluate(() => {
    const stage = document.querySelector<HTMLElement>("[data-intro-oil-stage]")!;
    const track = document.querySelector<HTMLElement>("[data-io-scroll]")!;
    const home = document.querySelector<HTMLElement>("#home")!;
    const actor = (name: string) => {
      const el = document.querySelector<HTMLElement>(`[data-io="${name}"]`)!;
      const s = getComputedStyle(el), r = el.getBoundingClientRect();
      const pos = s.backgroundPosition.split(" ").map(Number.parseFloat);
      const size = s.backgroundSize.split(" ").map(Number.parseFloat);
      // Both terminal atlases are 4 columns by 2 rows (asset contract).
      return { frame: Math.round(-pos[1] / (size[1] / 2)) * 4 + Math.round(-pos[0] / (size[0] / 4)),
        image: s.backgroundImage, opacity: Number(s.opacity), live: el.classList.contains("is-live"),
        x: r.x, y: r.y, width: r.width, height: r.height };
    };
    return { person: actor("person"), dog: actor("dog"), hidden: track.hidden,
      paper: Number(getComputedStyle(stage).getPropertyValue("--intro-paper-opacity")),
      inert: home.inert, owner: home.dataset.introPoseOwner,
      notified: home.hasAttribute("data-intro-controls-ready-at"), y: scrollY,
      expectedGateY: Math.ceil(track.offsetTop + (track.scrollHeight - innerHeight) * .972),
      state: stage.dataset.introState };
  });
}

async function assertWaiting(page: Page) {
  await expect.poll(async () => {
    const p = await pose(page);
    return { frames: [p.person.frame, p.dog.frame],
      finalAtlases: p.person.image.includes("person-slide-in-rise-stand-8f.webp") && p.dog.image.includes("dog-look-up-settle-8f.webp"),
      paper: p.paper, hidden: p.hidden,
      inert: p.inert, owner: p.owner, notified: p.notified };
  }).toEqual({ frames: [7, 7], finalAtlases: true, paper: 1, hidden: false, inert: true, owner: "intro", notified: false });
  const p = await pose(page);
  expect(Math.abs(p.y - p.expectedGateY)).toBeLessThanOrEqual(1);
  expect(p.person.opacity).toBe(1); expect(p.dog.opacity).toBe(1);
}

async function reachGate(page: Page) {
  await page.mouse.wheel(0, 9000);
  await assertWaiting(page);
}

async function freshDown(page: Page) {
  // Deliberate user pause, not a product completion timer.
  await page.waitForTimeout(360);
  await page.mouse.wheel(0, 4);
  await expect(page.locator("[data-io-scroll]")).toBeHidden();
  await expect(page.locator("#home")).toHaveAttribute("data-intro-pose-owner", "held");
  await expect(page.locator("#home")).not.toHaveAttribute("inert", "");
}

test("one oversized wheel paints the full final pose and never completes on elapsed time", async ({ page }, info) => {
  await start(page); await reachGate(page);
  const terminal = await pose(page);
  await page.waitForTimeout(1000);
  await assertWaiting(page);
  const originals = await page.locator('[data-io="person"], [data-io="dog"]').elementHandles();
  await freshDown(page);
  const held = await pose(page);
  expect([held.person.frame, held.dog.frame]).toEqual([7, 7]);
  for (const actor of ["person", "dog"] as const) {
    expect(held[actor].image).toBe(terminal[actor].image);
    for (const key of ["x", "y", "width", "height"] as const)
      expect(Math.abs(held[actor][key] - terminal[actor][key])).toBeLessThan(1);
  }
  for (const el of originals) expect(await el.evaluate(el => !!(el as Element).closest("[data-intro-handoff]"))).toBe(true);
  const inputs = await page.evaluate(() => (window as any).__nextScrollInput);
  expect(inputs.filter((x: any) => x.type === "wheel").every((x: any) => x.trusted)).toBe(true);
  expect(inputs.filter((x: any) => x.type === "baozi:intro-orbit-handoff")).toHaveLength(1);
  await info.attach("actual-inputs", { body: Buffer.from(JSON.stringify(inputs, null, 2)), contentType: "application/json" });
});

test("a continuous wheel burst is drained until a fresh downward burst", async ({ page }, info) => {
  await retainIntroBurstInputs(page, info, async () => {
    await start(page);
    // Wheel commands within 80ms continue even after the terminal pose appears.
    await page.mouse.wheel(0, 9000);
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(80);
      await page.mouse.wheel(0, 4);
      expect((await pose(page)).hidden).toBe(false);
    }
    await assertWaiting(page);
    await freshDown(page);
    const inputs = await page.evaluate(() => (window as any).__nextScrollInput);
    const wheels = inputs.filter((x: any) => x.type === "wheel");
    expect(wheels).toHaveLength(12);
    for (let i = 1; i < wheels.length - 1; i++) expect(wheels[i].at - wheels[i - 1].at).toBeLessThan(300);
    expect(wheels.at(-1).at - wheels.at(-2).at).toBeGreaterThanOrEqual(300);
    const notified = inputs.find((x: any) => x.type === "baozi:intro-orbit-handoff");
    expect(notified.at - wheels.at(-1).at).toBeLessThan(80);
  });
});

test("upward wheel immediately returns to the choreography and can reach the gate again", async ({ page }) => {
  await start(page); await reachGate(page);
  const gate = await pose(page);
  await page.mouse.wheel(0, -100);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeCloseTo(gate.y - 100, 0);
  const reversed = await pose(page);
  expect(reversed.dog.frame).toBeLessThan(7);
  expect(reversed.hidden).toBe(false); expect(reversed.notified).toBe(false);
  await page.mouse.wheel(0, 1000);
  await assertWaiting(page); await freshDown(page);
});

test("keyboard End while waiting resumes the existing keyboard completion path", async ({ page }) => {
  await start(page); await reachGate(page);
  await page.keyboard.press("End");
  await expect(page.locator("[data-io-scroll]")).toBeHidden();
  await expect(page.locator("#home")).not.toHaveAttribute("inert", "");
});

test("desktop resize redraws a waiting pose before the next wheel hands it over", async ({ page }) => {
  await start(page); await reachGate(page);
  await page.setViewportSize({ width: 1024, height: 860 });
  await assertWaiting(page);
  const before = await pose(page);
  await freshDown(page);
  const after = await pose(page);
  for (const actor of ["person", "dog"] as const)
    for (const key of ["x", "y", "width", "height"] as const)
      expect(Math.abs(after[actor][key] - before[actor][key])).toBeLessThan(1);
});

test("changing to mobile releases the desktop wheel gate", async ({ page }) => {
  await start(page); await reachGate(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.mouse.wheel(0, 9000);
  await expect(page.locator("[data-io-scroll]")).toBeHidden();
  await expect(page.locator("#home")).not.toHaveAttribute("inert", "");
});

for (const escape of ["skip", "reduced-motion", "home-failure"] as const) {
  test(`${escape} releases the waiting gate and its wheel listeners`, async ({ page }) => {
    await start(page); await reachGate(page);
    if (escape === "skip") await page.locator('[data-io="skip"]').click();
    else if (escape === "reduced-motion") await page.emulateMedia({ reducedMotion: "reduce" });
    else await page.evaluate(() => window.dispatchEvent(new CustomEvent("baozi:home-assets-failed", {
      detail: { home: document.querySelector("#home") },
    })));
    await expect(page.locator("[data-io-scroll]")).toBeHidden();
    await expect(page.locator("#home")).not.toHaveAttribute("inert", "");
    const before = await page.evaluate(() => scrollY);
    await page.mouse.wheel(0, 24);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before);
  });
}
