import { expect, test, type Page, type TestInfo } from "@playwright/test";
import type { V2Manifest } from "@/lib/intro-oil/v2";

// These checks read the rendered atlas, frame and geometry, without importing
// the timeline/runtime under test or adding a product-only observation hook.
// Keep Playwright's existing 30s test / 5s expect budgets and real wheel input.
async function moveToProgress(page: Page, progress: number) {
  const { target, current } = await page.locator("[data-io-scroll]").evaluate((track, value) => ({
    // Request an integer CSS pixel; retain the original strict <0.5px check.
    target: Math.round((track as HTMLElement).offsetTop + (track.scrollHeight - innerHeight) * value),
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

async function start(page: Page) {
  await page.goto("/");
  await expect(page.locator("[data-intro-oil-stage]")).toHaveAttribute("data-intro-state", "ready");
  const viewport = page.viewportSize()!;
  await page.mouse.move(viewport.width * 0.75, viewport.height * 0.5);
  return page.evaluate(async () => await (await fetch("/manifest/asset-manifest.v2.json")).json() as V2Manifest);
}

async function renderedActors(page: Page, manifest: V2Manifest) {
  return page.evaluate(manifest => {
    const desktop = matchMedia("(min-width: 768px)").matches;
    const track = document.querySelector<HTMLElement>("[data-io-scroll]")!;
    const read = (actor: "person" | "dog") => {
      const element = document.querySelector<HTMLElement>(`[data-io="${actor}"]`)!;
      const style = getComputedStyle(element), rect = element.getBoundingClientRect();
      const matrix = new DOMMatrixReadOnly(style.transform === "none" ? undefined : style.transform);
      const sequenceIds = actor === "dog" ? ["dog-chase-right", "dog-look-up-settle"]
        : ["person-pulled-run-right", "person-stumble-fall-exit-right", "person-slide-in-rise-stand"];
      const sequence = sequenceIds.find(id => style.backgroundImage.includes(manifest.sequences[id].src));
      if (!sequence) throw new Error(`Unknown actual ${actor} background: ${style.backgroundImage}`);
      const seq = manifest.sequences[sequence];
      const cell = style.backgroundSize.split(" ").map(Number.parseFloat);
      const position = style.backgroundPosition.split(" ").map(Number.parseFloat);
      const column = Math.round(-position[0] / (cell[0] / seq.columns));
      const row = Math.round(-position[1] / (cell[1] / seq.rows));
      // Normalize -0 only; malformed negative atlas indices still fail below.
      const frame = row * seq.columns + column + 0;
      const anchor = seq.frames[frame]?.anchors.ground;
      if (!anchor) throw new Error(`Invalid actual atlas cell: ${sequence} frame ${frame}`);
      // BCR is post-transform; mirrored anchors are read from the opposite edge.
      const groundX = rect.left + rect.width * (matrix.a < 0 ? 1 - anchor[0] : anchor[0]);
      const groundY = rect.top + rect.height * anchor[1];
      const destinationSelector = actor === "dog"
        ? desktop ? "[data-dog-visual]" : "[data-home-dog]"
        : desktop ? "[data-orbit-person]" : "[data-home-person]";
      const destination = document.querySelector(destinationSelector)!.getBoundingClientRect();
      const finalSequence = actor === "dog" ? "dog-look-up-settle" : "person-slide-in-rise-stand";
      const finalAnchor = manifest.sequences[finalSequence].frames.at(-1)!.anchors.ground;
      return {
        sequence, frame, frameId: seq.frames[frame].id, backgroundImage: style.backgroundImage,
        backgroundPosition: style.backgroundPosition, transform: style.transform, transformOrigin: style.transformOrigin,
        horizontalScale: matrix.a, verticalScale: matrix.d, groundX, groundY,
        left: rect.left, top: rect.top, width: rect.width, height: rect.height,
        opacity: Number(style.opacity), visibility: style.visibility, live: element.classList.contains("is-live"),
        targetX: destination.left + destination.width * finalAnchor[0], targetY: destination.bottom,
        targetWidth: destination.width, viewportWidth: innerWidth,
        progress: (scrollY - track.offsetTop) / (track.scrollHeight - innerHeight),
        held: document.querySelector("#home")?.getAttribute("data-intro-pose-owner"),
        inHandoffLayer: !!element.closest("[data-intro-handoff]"),
        horizontalOverflow: document.documentElement.scrollWidth - innerWidth,
      };
    };
    // Both actors come from the same browser evaluation, not different RAFs.
    return { person: read("person"), dog: read("dog"),
      paperOpacity: Number(getComputedStyle(document.querySelector("[data-intro-oil-stage]")!).getPropertyValue("--intro-paper-opacity")) };
  }, manifest);
}

async function renderedDog(page: Page, manifest: V2Manifest) {
  return (await renderedActors(page, manifest)).dog;
}

type ActorSample = Awaited<ReturnType<typeof renderedDog>>;
type PairSample = Awaited<ReturnType<typeof renderedActors>>;
async function saveSamples(testInfo: TestInfo, samples: unknown[]) {
  await testInfo.attach("rendered-dog-return-samples", {
    body: Buffer.from(JSON.stringify(samples, null, 2)), contentType: "application/json",
  });
}

function atFinalAnchor(dog: ActorSample) {
  expect(Math.abs(dog.groundX - dog.targetX), "actual ground X reaches the Home dog anchor").toBeLessThan(1);
  expect(Math.abs(dog.groundY - dog.targetY), "actual ground Y reaches the Home dog anchor").toBeLessThan(1);
  expect(Math.abs(dog.width - dog.targetWidth), "actual size matches the Home dog").toBeLessThan(1);
}

test("desktop three-beat ending advances both actors together and restores the approach on reverse", async ({ page }, testInfo) => {
  const samples: unknown[] = [];
  try {
    const manifest = await start(page);
    const poses: PairSample[] = [];
    // Expected frames are the approved choreography, not the runtime helper.
    const beats = [[0.920, 4, null], [0.934, 5, 0], [0.940, 5, 0],
      [0.946, 6, 1], [0.952, 6, 2], [0.9555, 6, 2], [0.9565, 7, 3]] as const;
    for (const [progress, personFrame, dogFrame] of beats) {
      await moveToProgress(page, progress);
      const pair = await renderedActors(page, manifest);
      samples.push({ requestedProgress: progress, ...pair }); poses.push(pair);
      expect(pair.person.sequence).toBe("person-slide-in-rise-stand");
      expect(pair.person.frame, `person frame at ${progress}`).toBe(personFrame);
      expect(pair.person.live).toBe(true);
      expect(pair.person.opacity).toBe(1);
      expect(pair.person.horizontalScale).toBeGreaterThan(0);
      atFinalAnchor(pair.person);
      if (dogFrame === null) {
        await expect(page.locator('[data-io="dog"]'), "dog waits during the first beat").toBeHidden();
        continue;
      }
      expect(pair.dog.sequence).toBe("dog-look-up-settle");
      expect(pair.dog.frame, `dog frame at ${progress}`).toBe(dogFrame);
      expect(pair.dog.live).toBe(true);
      expect(pair.dog.horizontalScale).toBeGreaterThan(0);
      expect(pair.dog.verticalScale).toBeGreaterThan(0);
      expect(Math.abs(pair.dog.groundY - pair.dog.targetY)).toBeLessThan(1);
      expect(Math.abs(pair.dog.width - pair.dog.targetWidth)).toBeLessThan(1);
      if (progress < 0.938) {
        expect(pair.dog.opacity).toBeGreaterThan(0);
        expect(pair.dog.opacity).toBeLessThan(1);
      } else expect(pair.dog.opacity).toBe(1);
      if (progress < 0.956) {
        expect(pair.dog.groundX).toBeLessThan(pair.dog.targetX);
        expect(pair.dog.targetX - pair.dog.groundX).toBeLessThan(pair.dog.width * 0.25);
      } else atFinalAnchor(pair.dog);
    }
    const approach = poses.slice(1);
    for (let i = 1; i < approach.length; i++) {
      expect(approach[i].dog.groundX).toBeGreaterThan(approach[i - 1].dog.groundX);
    }
    expect(approach.at(-1)!.dog.groundX - approach[0].dog.groundX).toBeLessThan(approach[0].dog.width * 0.25);
    expect(poses[5].person.progress).toBeLessThan(0.956);
    expect(poses[6].person.progress).toBeGreaterThan(0.956);
    expect([poses[5].person.frame, poses[5].dog.frame]).toEqual([6, 2]);
    expect([poses[6].person.frame, poses[6].dog.frame]).toEqual([7, 3]);
    await page.screenshot({ path: testInfo.outputPath("desktop-three-beat-standing-and-looking.png") });
    for (const [progress, originalIndex] of [[0.946, 3], [0.934, 1]] as const) {
      await moveToProgress(page, progress);
      const reversed = await renderedActors(page, manifest);
      samples.push({ reversedTo: progress, ...reversed });
      for (const actor of ["person", "dog"] as const) {
        const original = poses[originalIndex][actor], current = reversed[actor];
        expect(current.sequence).toBe(original.sequence);
        expect(current.frame).toBe(original.frame);
        expect(current.horizontalScale).toBeGreaterThan(0);
        expect(current.opacity).toBe(original.opacity);
        for (const key of ["groundX", "groundY", "width", "height"] as const) {
          expect(Math.abs(current[key] - original[key]), `${actor} ${key} restores on reverse`).toBeLessThan(1);
        }
      }
    }
    await expect(page.locator("#home")).toHaveAttribute("inert", "");
  } finally { await saveSamples(testInfo, samples); }
});

test("desktop three-beat ending sits once, waits for a fresh downward wheel and keeps both original sprites through handoff", async ({ page }, testInfo) => {
  const samples: unknown[] = [];
  try {
    const manifest = await start(page);
    const poses: PairSample[] = [];
    for (const [progress, dogFrame] of [[0.9565, 3], [0.964, 6], [0.970, 6], [0.972, 7]] as const) {
      if (progress === .972) await reachDesktopTerminal(page);
      else await moveToProgress(page, progress);
      const pair = await renderedActors(page, manifest);
      samples.push({ requestedProgress: progress, ...pair }); poses.push(pair);
      expect(pair.person.sequence).toBe("person-slide-in-rise-stand");
      expect(pair.dog.sequence).toBe("dog-look-up-settle");
      expect(pair.person.frame).toBe(7);
      expect(pair.dog.frame, "look, sit, then hold without the former extra stepping poses").toBe(dogFrame);
      for (const actor of ["person", "dog"] as const) {
        expect(pair[actor].opacity).toBe(1);
        expect(pair[actor].horizontalScale).toBeGreaterThan(0);
        atFinalAnchor(pair[actor]);
        for (const key of ["groundX", "groundY", "width", "height"] as const) {
          expect(Math.abs(pair[actor][key] - poses[0][actor][key]), `${actor} ${key} stays fixed while sitting and holding`).toBeLessThan(1);
        }
      }
      await expect(page.locator("#home")).toHaveAttribute("inert", "");
      expect(pair.dog.held).toBe("intro");
      expect(pair.paperOpacity, "the completed desktop pose waits on fully opaque paper").toBe(1);
    }
    // The settled pair stays visible until the next independent downward input.
    await page.waitForTimeout(350);
    const waiting = await renderedActors(page, manifest); poses.push(waiting);
    samples.push({ phase: "terminal-wait-after-350ms", ...waiting });
    await expect(page.locator("[data-io-scroll]")).toBeVisible();
    await expect(page.locator("#home")).toHaveAttribute("inert", "");
    expect(waiting.paperOpacity).toBe(1);
    expect(waiting.dog.held).toBe("intro");
    for (const actor of ["person", "dog"] as const) {
      expect(waiting[actor].opacity).toBe(1);
      expect(waiting[actor].horizontalScale).toBeGreaterThan(0);
      atFinalAnchor(waiting[actor]);
      for (const key of ["groundX", "groundY", "width", "height"] as const) {
        expect(Math.abs(waiting[actor][key] - poses[0][actor][key]), `${actor} ${key} stays fixed while awaiting a new pull`).toBeLessThan(1);
      }
    }
    expect([poses[3].person.frame, poses[3].dog.frame]).toEqual([7, 7]);
    expect([poses[4].person.frame, poses[4].dog.frame]).toEqual([7, 7]);
    const terminal = poses.at(-1)!;
    expect(terminal.dog.frame).toBe(manifest.sequences["dog-look-up-settle"].frameCount - 1);
    expect(terminal.person.frame).toBe(manifest.sequences["person-slide-in-rise-stand"].frameCount - 1);
    const originals = {
      person: await page.locator('[data-io="person"]').elementHandle(),
      dog: await page.locator('[data-io="dog"]').elementHandle(),
    };
    await page.screenshot({ path: testInfo.outputPath("desktop-three-beat-terminal-before-handoff.png") });
    await page.mouse.wheel(0, 4);
    await expect(page.locator("[data-io-scroll]")).toBeHidden();
    await expect(page.locator("#home")).toHaveAttribute("data-intro-pose-owner", "held");
    const held = await renderedActors(page, manifest); samples.push({ phase: "held", ...held });
    for (const actor of ["person", "dog"] as const) {
      expect(await page.evaluate(({ node, actor }) => node === document.querySelector(`[data-intro-handoff] [data-io="${actor}"]`),
        { node: originals[actor], actor })).toBe(true);
      expect(held[actor].backgroundImage).toBe(terminal[actor].backgroundImage);
      expect(held[actor].backgroundPosition).toBe(terminal[actor].backgroundPosition);
      for (const key of ["groundX", "groundY", "width", "height"] as const) {
        expect(Math.abs(held[actor][key] - terminal[actor][key])).toBeLessThan(1);
      }
      await originals[actor]?.dispose();
    }
    await expect(page.locator("[data-home-dog], [data-dog-visual]")).toHaveCount(2);
    for (const selector of ["[data-home-person]", "[data-home-dog]", "[data-orbit-person]", "[data-dog-visual]"]) {
      await expect(page.locator(selector)).toBeHidden();
    }
    expect(held.dog.horizontalOverflow).toBeLessThanOrEqual(0);
    await page.screenshot({ path: testInfo.outputPath("desktop-three-beat-terminal-held.png") });
  } finally { await saveSamples(testInfo, samples); }
});

test("390px keeps the existing unmirrored settle return and original mobile timing", async ({ page }, testInfo) => {
  const samples: unknown[] = [];
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    const manifest = await start(page);
    for (const progress of [0.945, 0.955, 0.965, 0.971, 0.991, 0.997]) {
      await moveToProgress(page, progress);
      const dog = await renderedDog(page, manifest); samples.push({ requestedProgress: progress, ...dog });
      expect(dog.sequence, "desktop-only repair must not substitute a running atlas on mobile").toBe("dog-look-up-settle");
      expect(dog.horizontalScale).toBeGreaterThan(0);
      const sequence = manifest.sequences["dog-look-up-settle"];
      // The prior mobile contract is .94–1 settle frames, .94–.97 travel.
      // This expected value uses measured browser progress and fixed old
      // contract bounds, not the implementation's timeline helper.
      const expectedFrame = Math.min(sequence.frameCount - 1, Math.floor((dog.progress - 0.94) / 0.06 * sequence.frameCount));
      const travel = Math.min(1, Math.max(0, (dog.progress - 0.94) / 0.03));
      const expectedX = dog.viewportWidth * 1.12 + (dog.targetX - dog.viewportWidth * 1.12) * travel;
      expect(dog.frame).toBe(expectedFrame);
      expect(Math.abs(dog.groundX - expectedX)).toBeLessThan(1);
      expect(Math.abs(dog.groundY - dog.targetY)).toBeLessThan(1);
      expect(dog.opacity).toBe(1);
      expect(dog.horizontalOverflow).toBeLessThanOrEqual(0);
    }
    await page.screenshot({ path: testInfo.outputPath("mobile-original-terminal-path.png") });
    await page.mouse.wheel(0, 844);
    await expect(page.locator("#home")).toHaveAttribute("data-intro-pose-owner", "held");
    await expect(page.locator("[data-intro-handoff] > .io-sprite")).toHaveCount(2);
    await expect(page.locator("#main h1")).toBeInViewport();
  } finally { await saveSamples(testInfo, samples); }
});
