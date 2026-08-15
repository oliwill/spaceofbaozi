import { expect, test, type Page } from "@playwright/test";
import { selectDogSprite } from "@/lib/home-orbit/spriteSelector";

async function scrollToIntroEnd(page: Page) {
  await page.evaluate(() => {
    const root = document.querySelector<HTMLElement>("[data-intro-root]");
    if (!root) throw new Error("intro root missing");
    scrollTo(0, root.offsetTop + root.scrollHeight - innerHeight);
  });
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

test.beforeEach(async ({ page }) => {
  await page.goto("/lab/intro?assetMode=placeholder");
  await expect(page.locator("[data-intro-root]")).toHaveAttribute("data-intro-complete", "false");
  await scrollToIntroEnd(page);
});

test("home orbit root mounts at the intro end and starts not ready", async ({ page }) => {
  const response = await page.request.get("/lab/intro?assetMode=placeholder");
  expect(response.ok()).toBe(true);
  const html = await response.text();
  const roots = html.match(/<section[^>]*data-home-orbit-root[^>]*>/g) ?? [];
  expect(roots).toHaveLength(1);
  expect(roots[0]).toContain('data-orbit-ready="false"');
});

test("home orbit root carries the planned control, asset, and reduced-motion dataset", async ({ page }) => {
  const root = page.locator("[data-home-orbit-root]");
  await expect(root).toHaveAttribute("data-controls-enabled", "false");
  await expect(root).toHaveAttribute("data-reduced-motion", "false");
  await expect(root).toHaveAttribute("data-asset-error", "false");
  await expect(root).toHaveAttribute("data-person-orbit-src", "/assets/orbit/runtime/person-look-12dir.webp");
  await expect(root).toHaveAttribute("data-dog-orbit-src", "/assets/orbit/runtime/dog-orbit-run-8dir-4f.webp");
});

test("home orbit exposes person, translation anchor, dog visual, and shadow surfaces", async ({ page }) => {
  await expect(page.locator("[data-orbit-person]")).toHaveCount(1);
  await expect(page.locator("[data-orbit-anchor]")).toHaveCount(1);
  await expect(page.locator("[data-dog-visual]")).toHaveCount(1);
  await expect(page.locator("[data-dog-shadow]")).toHaveCount(1);
});

test("translation anchor and scale visual are separate DOM nodes", async ({ page }) => {
  const anchor = page.locator("[data-orbit-anchor]");
  const visual = page.locator("[data-dog-visual]");
  await expect(anchor).toHaveCount(1);
  await expect(visual).toHaveCount(1);
  expect(await page.evaluate(() => {
    const anchor = document.querySelector("[data-orbit-anchor]");
    const visual = document.querySelector("[data-dog-visual]");
    return Boolean(anchor && visual && anchor !== visual);
  })).toBe(true);
});

test("anchor and dog visual pivot at the foot ground line", async ({ page }) => {
  const pivots = await page.evaluate(() => {
    const read = (element: HTMLElement) => {
      const style = getComputedStyle(element);
      const parts = style.transformOrigin.split(/\s+/).map((part) => parseFloat(part));
      return {
        originX: parts[0],
        originY: parts[1],
        width: parseFloat(style.width),
        height: parseFloat(style.height),
      };
    };
    const anchor = document.querySelector<HTMLElement>("[data-orbit-anchor]");
    const visual = document.querySelector<HTMLElement>("[data-dog-visual]");
    if (!anchor || !visual) return null;
    return { anchor: read(anchor), visual: read(visual) };
  });
  expect(pivots).not.toBeNull();
  for (const { originX, originY, width, height } of [pivots?.anchor!, pivots?.visual!]) {
    expect(Math.abs(originX - width / 2)).toBeLessThanOrEqual(1);
    expect(Math.abs(originY - height)).toBeLessThanOrEqual(1);
  }
});

test("home orbit root declares the planned pose CSS custom properties", async ({ page }) => {
  const vars = await page.evaluate(() => {
    const root = document.querySelector<HTMLElement>("[data-home-orbit-root]");
    if (!root) return null;
    const style = getComputedStyle(root);
    const value = (name: string) => style.getPropertyValue(name).trim();
    return {
      orbitX: value("--orbit-x"),
      orbitY: value("--orbit-y"),
      dogScale: value("--dog-scale"),
      dogZ: value("--dog-z"),
      shadowOpacity: value("--shadow-opacity"),
    };
  });
  expect(vars).not.toBeNull();
  const finite = (value: string | undefined) => {
    expect(value).toBeTruthy();
    return Number.parseFloat(value ?? "");
  };
  expect(Number.isFinite(finite(vars?.orbitX))).toBe(true);
  expect(vars?.orbitX?.endsWith("px")).toBe(true);
  expect(Number.isFinite(finite(vars?.orbitY))).toBe(true);
  expect(vars?.orbitY?.endsWith("px")).toBe(true);
  const dogScale = finite(vars?.dogScale);
  expect(dogScale).toBeGreaterThanOrEqual(0.86);
  expect(dogScale).toBeLessThanOrEqual(1.08);
  expect(["1", "3"]).toContain(vars?.dogZ);
  const shadowOpacity = finite(vars?.shadowOpacity);
  expect(shadowOpacity).toBeGreaterThanOrEqual(0.05);
  expect(shadowOpacity).toBeLessThanOrEqual(0.1);
});

test("person and dog anchor keep their planned display sizes", async ({ page }) => {
  const sizes = await page.evaluate(() => {
    const person = document.querySelector<HTMLElement>("[data-orbit-person]");
    const anchor = document.querySelector<HTMLElement>("[data-orbit-anchor]");
    if (!person || !anchor) return null;
    const personBox = person.getBoundingClientRect();
    const anchorBox = anchor.getBoundingClientRect();
    return { personWidth: personBox.width, personHeight: personBox.height, anchorWidth: anchorBox.width };
  });
  expect(sizes).not.toBeNull();
  expect(sizes?.personWidth).toBeGreaterThanOrEqual(250);
  expect(sizes?.personWidth).toBeLessThanOrEqual(360);
  expect(Math.abs((sizes?.personWidth ?? 0) / (sizes?.personHeight ?? 1) - 384 / 342)).toBeLessThan(0.01);
  expect(sizes?.anchorWidth).toBeGreaterThanOrEqual(76);
  expect(sizes?.anchorWidth).toBeLessThanOrEqual(116);
});

test("asset-error state hides the dog but keeps the person and shows the fallback", async ({ page }) => {
  await page.evaluate(() => {
    const root = document.querySelector<HTMLElement>("[data-home-orbit-root]");
    const fallback = document.querySelector<HTMLElement>("[data-orbit-fallback]");
    if (!root || !fallback) throw new Error("home orbit surfaces missing");
    root.dataset.orbitActive = "true";
    root.dataset.assetError = "true";
  });
  await expect(page.locator("[data-orbit-person]")).toBeVisible();
  await expect(page.locator("[data-orbit-anchor]")).toBeHidden();
  await expect(page.locator("[data-orbit-fallback]")).toBeVisible();
});

test("controls-enabled overlay stays click-through for the home link", async ({ page }) => {
  await page.evaluate(() => {
    const root = document.querySelector<HTMLElement>("[data-home-orbit-root]");
    if (!root) throw new Error("home orbit root missing");
    root.dataset.orbitActive = "true";
    root.dataset.controlsEnabled = "true";
  });
  await expect(page.locator("[data-home-orbit-root]")).toHaveCSS("pointer-events", "none");
  const hit = await page.evaluate(() => {
    const link = document.querySelector<HTMLElement>(".intro__home-link");
    if (!link) return null;
    const box = link.getBoundingClientRect();
    const element = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
    return element ? { hitLink: element === link || link.contains(element), tag: element.tagName } : null;
  });
  expect(hit?.hitLink).toBe(true);
});

test("person holds the middle depth z-index layer", async ({ page }) => {
  await expect(page.locator("[data-orbit-person]")).toHaveCSS("z-index", "2");
});

test("home orbit root is keyboard accessible with a descriptive label", async ({ page }) => {
  const root = page.locator("[data-home-orbit-root]");
  await expect(root).toHaveAttribute("tabindex", "0");
  await expect(root).toHaveAttribute("aria-label", /.+/);
});

// ── Task 5: perspective controller (red until createHomeOrbit lands) ──────────

async function waitForOrbitReady(page: Page) {
  await page.waitForFunction(() => {
    const root = document.querySelector("[data-home-orbit-root]");
    return root?.getAttribute("data-orbit-ready") === "true";
  }, undefined, { timeout: 5000 });
}

async function setOrbitAngle(page: Page, degrees: number, velocity = 1) {
  await waitForOrbitReady(page);
  await page.evaluate(() => {
    const root = document.querySelector<HTMLElement>("[data-home-orbit-root]");
    if (!root) throw new Error("home orbit root missing");
    root.dataset.orbitActive = "true";
  });
  await page.evaluate(({ degrees, velocity }) => {
    window.dispatchEvent(
      new CustomEvent("baozi:orbit-debug-set", {
        detail: { angle: (degrees * Math.PI) / 180, angularVelocity: velocity },
      }),
    );
  }, { degrees, velocity });
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

for (const [degrees, scale, layer] of [
  [0, 0.97, "front"],
  [90, 1.08, "front"],
  [180, 0.97, "front"],
  [270, 0.86, "behind"],
] as const) {
  test(`perspective checkpoint ${degrees}`, async ({ page }) => {
    await setOrbitAngle(page, degrees);
    const root = page.locator("[data-home-orbit-root]");
    await expect(root).toHaveAttribute("data-orbit-layer", layer);
    expect(Number(await root.getAttribute("data-dog-scale"))).toBeCloseTo(scale, 2);
    await expect(page.locator("[data-orbit-anchor]")).toHaveCSS("z-index", layer === "front" ? "3" : "1");
  });
}

test("dog feet stay on the same anchor while scale changes", async ({ page }) => {
  for (const degrees of [270, 90]) {
    await setOrbitAngle(page, degrees);
    const delta = await page.evaluate(() => {
      const dog = document.querySelector("[data-dog-visual]")!.getBoundingClientRect();
      const anchor = document.querySelector("[data-orbit-anchor]")!.getBoundingClientRect();
      return Math.abs(dog.bottom - anchor.bottom);
    });
    expect(delta).toBeLessThanOrEqual(1);
  }
});

test("person direction follows rendered dog position", async ({ page }) => {
  await setOrbitAngle(page, 90);
  await expect(page.locator("[data-home-orbit-root]")).toHaveAttribute("data-person-direction", "3");
});

test("debug orbit set writes the exact dataset attributes", async ({ page }) => {
  await setOrbitAngle(page, 90);
  const attrs = await page.evaluate(() => {
    const root = document.querySelector("[data-home-orbit-root]");
    if (!root) return null;
    const value = (name: string) => root.getAttribute(name);
    return {
      orbitReady: value("data-orbit-ready"),
      orbitLayer: value("data-orbit-layer"),
      orbitAngle: value("data-orbit-angle"),
      dogScale: value("data-dog-scale"),
      dogDirection: value("data-dog-direction"),
      dogFrame: value("data-dog-frame"),
      personDirection: value("data-person-direction"),
    };
  });
  expect(attrs).not.toBeNull();
  expect(attrs?.orbitReady).toBe("true");
  expect(attrs?.orbitLayer).toBe("front");
  expect(Number(attrs?.orbitAngle)).toBeCloseTo(Math.PI / 2, 1);
  expect(Number(attrs?.dogScale)).toBeCloseTo(1.08, 2);
  expect(attrs?.dogDirection).toBe("4");
  expect(attrs?.dogFrame).toBe("0");
  expect(attrs?.personDirection).toBe("3");
});

test("orbit controller renders the planned CSS variables", async ({ page }) => {
  for (const [degrees, dogScale, dogZ, shadowOpacity] of [
    [90, 1.08, "3", 0.1],
    [270, 0.86, "1", 0.05],
  ] as const) {
    await setOrbitAngle(page, degrees);
    const vars = await page.evaluate(() => {
      const root = document.querySelector<HTMLElement>("[data-home-orbit-root]");
      if (!root) return null;
      const style = getComputedStyle(root);
      const value = (name: string) => style.getPropertyValue(name).trim();
      return {
        dogScale: value("--dog-scale"),
        dogZ: value("--dog-z"),
        shadowOpacity: value("--shadow-opacity"),
      };
    });
    expect(vars).not.toBeNull();
    expect(Number(vars?.dogScale)).toBeCloseTo(dogScale, 2);
    expect(vars?.dogZ).toBe(dogZ);
    expect(Number(vars?.shadowOpacity)).toBeCloseTo(shadowOpacity, 3);
  }
});

test("home orbit boots exactly one controller and reports ready", async ({ page }) => {
  const controller = await page.evaluate(() => {
    const root = document.querySelector<HTMLElement & { __homeOrbit?: Record<string, unknown> }>("[data-home-orbit-root]");
    if (!root) return null;
    const api = root.__homeOrbit;
    return {
      hasController: Boolean(api),
      methods: api ? Object.keys(api).sort() : [],
      callable: api ? Object.values(api).every((value) => typeof value === "function") : false,
    };
  });
  expect(controller?.hasController).toBe(true);
  expect(controller?.methods).toEqual(["destroy", "disable", "enable", "handoff"]);
  expect(controller?.callable).toBe(true);
  await waitForOrbitReady(page);
  await expect(page.locator("[data-home-orbit-root]")).toHaveAttribute("data-orbit-ready", "true");
});

async function enableOrbitController(page: Page) {
  await page.evaluate(() => {
    const root = document.querySelector<HTMLElement & { __homeOrbit?: { enable: () => void } }>("[data-home-orbit-root]");
    if (!root?.__homeOrbit) throw new Error("home orbit controller missing");
    root.__homeOrbit.enable();
  });
}

async function readOrbitTargetAngle(page: Page) {
  return page.evaluate(() => {
    const root = document.querySelector<HTMLElement>("[data-home-orbit-root]");
    return root ? Number(root.getAttribute("data-orbit-target-angle")) : NaN;
  });
}

test("controller enable() flips controls-enabled synchronously", async ({ page }) => {
  await waitForOrbitReady(page);
  const enabled = await page.evaluate(() => {
    const root = document.querySelector<HTMLElement & { __homeOrbit?: { enable: () => void } }>("[data-home-orbit-root]");
    if (!root?.__homeOrbit) throw new Error("home orbit controller missing");
    root.__homeOrbit.enable();
    return root.getAttribute("data-controls-enabled");
  });
  expect(enabled).toBe("true");
});

test("controller reaches ready without the delayed-control window", async ({ page }) => {
  await page.goto("/lab/intro?assetMode=placeholder");
  const latency = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const start = performance.now();
        const ready = () => {
          const root = document.querySelector("[data-home-orbit-root]");
          return root?.getAttribute("data-orbit-ready") === "true";
        };
        if (ready()) {
          resolve(0);
          return;
        }
        let observer: MutationObserver | null = null;
        observer = new MutationObserver(() => {
          if (ready() && observer) {
            observer.disconnect();
            resolve(performance.now() - start);
          }
        });
        observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ["data-orbit-ready"],
        });
        const intro = document.querySelector<HTMLElement>("[data-intro-root]");
        if (!intro) {
          observer.disconnect();
          resolve(performance.now() - start);
          return;
        }
        scrollTo(0, intro.offsetTop + intro.scrollHeight - innerHeight);
      }),
  );
  expect(latency).toBeLessThan(250);
});

test("mousemove outside the bounded hero region keeps the orbit target", async ({ page }) => {
  await waitForOrbitReady(page);
  await enableOrbitController(page);
  await setOrbitAngle(page, 90);
  const before = await readOrbitTargetAngle(page);
  await page.evaluate(() => {
    const root = document.querySelector<HTMLElement>("[data-home-orbit-root]");
    if (!root) throw new Error("home orbit root missing");
    const rect = root.getBoundingClientRect();
    root.dispatchEvent(new MouseEvent("mousemove", { clientX: rect.right - 20, clientY: rect.top + 20, bubbles: true }));
  });
  expect(await readOrbitTargetAngle(page)).toBeCloseTo(before, 5);
});

test("pointer leaving the bounded rect returns the target to rest after 900ms", async ({ page }) => {
  await setOrbitAngle(page, 90);
  await enableOrbitController(page);
  await page.clock.install();
  await page.evaluate(() => {
    const root = document.querySelector<HTMLElement>("[data-home-orbit-root]");
    const feet = document.querySelector<HTMLElement>("[data-person-feet-anchor]") ?? document.querySelector<HTMLElement>("[data-orbit-person]");
    if (!root || !feet) throw new Error("orbit surfaces missing");
    const box = feet.getBoundingClientRect();
    root.dispatchEvent(
      new MouseEvent("mousemove", { clientX: box.left + box.width / 2, clientY: box.top + box.height / 2, bubbles: true }),
    );
  });
  const entered = await readOrbitTargetAngle(page);
  await page.evaluate(() => {
    const root = document.querySelector<HTMLElement>("[data-home-orbit-root]");
    if (!root) throw new Error("home orbit root missing");
    const rect = root.getBoundingClientRect();
    root.dispatchEvent(new MouseEvent("mousemove", { clientX: rect.right - 20, clientY: rect.top + 20, bubbles: true }));
  });
  await page.clock.fastForward(800);
  expect(await readOrbitTargetAngle(page)).toBeCloseTo(entered, 5);
  await page.clock.fastForward(100);
  expect(await readOrbitTargetAngle(page)).toBeCloseTo((Math.PI * 35) / 180, 5);
});

test("mouseleave from the hero falls back to rest after 900ms", async ({ page }) => {
  await setOrbitAngle(page, 90);
  await enableOrbitController(page);
  await page.clock.install();
  await page.evaluate(() => {
    const root = document.querySelector<HTMLElement>("[data-home-orbit-root]");
    const feet = document.querySelector<HTMLElement>("[data-person-feet-anchor]") ?? document.querySelector<HTMLElement>("[data-orbit-person]");
    if (!root || !feet) throw new Error("orbit surfaces missing");
    const box = feet.getBoundingClientRect();
    root.dispatchEvent(
      new MouseEvent("mousemove", { clientX: box.left + box.width / 2, clientY: box.top + box.height / 2, bubbles: true }),
    );
    window.dispatchEvent(new MouseEvent("mouseleave"));
  });
  await page.clock.fastForward(800);
  expect(await readOrbitTargetAngle(page)).toBeCloseTo(Math.PI / 2, 2);
  await page.clock.fastForward(100);
  expect(await readOrbitTargetAngle(page)).toBeCloseTo((Math.PI * 35) / 180, 5);
});

test("handoff ignores non-finite state without contaminating the orbit", async ({ page }) => {
  await setOrbitAngle(page, 90);
  const readState = () =>
    page.evaluate(() => {
      const root = document.querySelector<HTMLElement>("[data-home-orbit-root]");
      if (!root) return null;
      const number = (name: string) => Number(root.getAttribute(name));
      return {
        angle: number("data-orbit-angle"),
        velocity: number("data-orbit-angular-velocity"),
        target: number("data-orbit-target-angle"),
      };
    });
  const before = await readState();
  expect(before).not.toBeNull();
  expect(before?.angle).toBeCloseTo(Math.PI / 2, 5);
  expect(before?.velocity).toBeCloseTo(1, 5);
  for (const state of [
    { angle: NaN, angularVelocity: 1 },
    { angle: Infinity, angularVelocity: Infinity },
  ]) {
    await page.evaluate((state) => {
      const root = document.querySelector<HTMLElement & { __homeOrbit?: { handoff: (state: { angle: number; angularVelocity: number }) => void } }>("[data-home-orbit-root]");
      if (!root?.__homeOrbit) throw new Error("home orbit controller missing");
      root.__homeOrbit.handoff(state);
    }, state);
  }
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  const after = await readState();
  expect(after).not.toBeNull();
  expect(after?.angle).toBeCloseTo(before!.angle, 5);
  expect(after?.velocity).toBeCloseTo(before!.velocity, 5);
  expect(after?.target).toBeCloseTo(before!.target, 5);
  expect(Number.isFinite(after!.angle)).toBe(true);
  expect(Number.isFinite(after!.velocity)).toBe(true);
  expect(Number.isFinite(after!.target)).toBe(true);
});

test("touch drag below the horizontal threshold does not prevent the page scroll", async ({ page }) => {
  await waitForOrbitReady(page);
  await enableOrbitController(page);
  const prevented = await page.evaluate(
    () =>
      new Promise<boolean>((resolve) => {
        const root = document.querySelector<HTMLElement>("[data-home-orbit-root]");
        const feet = document.querySelector<HTMLElement>("[data-person-feet-anchor]") ?? document.querySelector<HTMLElement>("[data-orbit-person]");
        if (!root || !feet) throw new Error("orbit surfaces missing");
        const box = feet.getBoundingClientRect();
        const startX = box.left + box.width / 2;
        const startY = box.top + box.height / 2;
        const handler = (event: Event) => {
          window.removeEventListener("pointermove", handler);
          resolve(event.defaultPrevented);
        };
        window.addEventListener("pointermove", handler);
        root.dispatchEvent(
          new PointerEvent("pointerdown", {
            clientX: startX,
            clientY: startY,
            pointerId: 1,
            pointerType: "touch",
            isPrimary: true,
            bubbles: true,
            cancelable: true,
          }),
        );
        root.dispatchEvent(
          new PointerEvent("pointermove", {
            clientX: startX + 11,
            clientY: startY + 6,
            pointerId: 1,
            pointerType: "touch",
            isPrimary: true,
            bubbles: true,
            cancelable: true,
          }),
        );
      }),
  );
  expect(prevented).toBe(false);
});

// ── Task 6: intro handoff (red until events/ownership land) ────────────────

async function setIntroProgress(page: Page, value: number) {
  await page.evaluate((progress) => {
    const root = document.querySelector<HTMLElement>("[data-intro-root]");
    if (!root) throw new Error("intro root missing");
    scrollTo(0, root.offsetTop + (root.scrollHeight - innerHeight) * progress);
  }, value);
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

test("intro handoff keeps dog state continuous", async ({ page }) => {
  await setOrbitAngle(page, 90, 0.5);
  const readRect = () =>
    page.locator("[data-dog-visual]").evaluate((node) => {
      const rect = (node as HTMLElement).getBoundingClientRect();
      return { x: rect.x, y: rect.y, w: rect.width, h: rect.height };
    });
  const before = await readRect();
  await page.evaluate(() => {
    window.dispatchEvent(
      new CustomEvent("baozi:intro-orbit-handoff", {
        detail: { angle: Math.PI / 2, angularVelocity: 0.5 },
      }),
    );
  });
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
  const after = await readRect();
  expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(1);
  expect(Math.abs(after.w - before.w)).toBeLessThanOrEqual(1);
  expect(Math.abs(after.h - before.h)).toBeLessThanOrEqual(1);
});

test("pointer controls enable 300ms after stand", async ({ page }) => {
  const root = page.locator("[data-home-orbit-root]");
  await waitForOrbitReady(page);
  await page.clock.install();
  await page.evaluate(() => {
    const element = document.querySelector<HTMLElement & { __homeOrbit?: { disable: () => void } }>("[data-home-orbit-root]");
    if (!element?.__homeOrbit) throw new Error("home orbit controller missing");
    element.__homeOrbit.disable();
  });
  await expect(root).toHaveAttribute("data-controls-enabled", "false");
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent("baozi:intro-person-stood"));
  });
  await page.clock.fastForward(200);
  await expect(root).toHaveAttribute("data-controls-enabled", "false");
  await page.clock.fastForward(100);
  await expect(root).toHaveAttribute("data-controls-enabled", "true");
});

test("home orbit takes intro ownership at 0.94 and keeps it at 1", async ({ page }) => {
  await setIntroProgress(page, 0.94);
  await expect(page.locator("[data-intro-root]")).toHaveAttribute("data-intro-progress", "0.940");
  const root = page.locator("[data-home-orbit-root]");
  await expect(root).toHaveAttribute("data-orbit-active", "true");
  await expect(page.locator("[data-intro-person]")).toHaveAttribute("data-visible", "false");
  await expect(page.locator("[data-intro-dog]")).toHaveAttribute("data-visible", "false");
  const visibleCount = await page.evaluate(() => {
    const isVisible = (selector: string): boolean => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) return false;
      const orbitRoot = element.closest<HTMLElement>("[data-home-orbit-root]");
      return orbitRoot
        ? orbitRoot.getAttribute("data-orbit-active") === "true"
        : element.getAttribute("data-visible") === "true";
    };
    return {
      persons: ["[data-intro-person]", "[data-orbit-person]"].filter(isVisible).length,
      dogs: ["[data-intro-dog]", "[data-dog-visual]"].filter(isVisible).length,
    };
  });
  expect(visibleCount).toEqual({ persons: 1, dogs: 1 });
  const readDatasets = () =>
    page.evaluate(() => {
      const element = document.querySelector<HTMLElement>("[data-home-orbit-root]");
      if (!element) return null;
      return {
        angle: Number(element.getAttribute("data-orbit-angle")),
        velocity: Number(element.getAttribute("data-orbit-angular-velocity")),
      };
    });
  const datasets = await readDatasets();
  expect(datasets).not.toBeNull();
  expect(Number.isFinite(datasets?.angle)).toBe(true);
  expect(Number.isFinite(datasets?.velocity)).toBe(true);
  await setIntroProgress(page, 1);
  await expect(page.locator("[data-intro-root]")).toHaveAttribute("data-intro-progress", "1.000");
  await expect(root).toHaveAttribute("data-orbit-active", "true");
  const finalDatasets = await readDatasets();
  expect(finalDatasets).not.toBeNull();
  expect(Number.isFinite(finalDatasets?.angle)).toBe(true);
  expect(Number.isFinite(finalDatasets?.velocity)).toBe(true);
});

test("home orbit hands ownership back when reverse-scrolled below 0.94 and re-handoffs forward", async ({ page }) => {
  const root = page.locator("[data-home-orbit-root]");
  await setIntroProgress(page, 1);
  await expect(page.locator("[data-intro-root]")).toHaveAttribute("data-intro-progress", "1.000");
  await expect(root).toHaveAttribute("data-orbit-active", "true");
  await setIntroProgress(page, 0.93);
  await expect(page.locator("[data-intro-root]")).toHaveAttribute("data-intro-progress", "0.930");
  await expect(root).toHaveAttribute("data-orbit-active", "false");
  await expect(root).toHaveAttribute("data-controls-enabled", "false");
  await expect(page.locator("[data-intro-person]")).toHaveAttribute("data-visible", "true");
  await expect(page.locator("[data-intro-dog]")).toHaveAttribute("data-visible", "true");
  await setIntroProgress(page, 1);
  await expect(root).toHaveAttribute("data-orbit-active", "true");
});

type LifecycleWindow = Window & {
  __stoodCount?: number;
  __handoffCount?: number;
  __stoodTime?: number | null;
  __enableTime?: number | null;
  __handoffDetail?: { angle: number; angularVelocity: number } | null;
};

test("home orbit intro lifecycle dispatches handoff and stood exactly once with a 300ms enable", async ({ page }) => {
  await setIntroProgress(page, 0.93);
  await page.evaluate(() => {
    const windowAny = window as LifecycleWindow;
    const root = document.querySelector<HTMLElement>("[data-home-orbit-root]");
    if (!root) throw new Error("home orbit root missing");
    windowAny.__stoodCount = 0;
    windowAny.__handoffCount = 0;
    windowAny.__stoodTime = null;
    windowAny.__enableTime = null;
    windowAny.__handoffDetail = null;
    window.addEventListener("baozi:intro-person-stood", () => {
      windowAny.__stoodCount = (windowAny.__stoodCount ?? 0) + 1;
      windowAny.__stoodTime = performance.now();
      const observer = new MutationObserver(() => {
        if (root.getAttribute("data-controls-enabled") === "true") {
          observer.disconnect();
          windowAny.__enableTime = performance.now();
        }
      });
      observer.observe(root, { attributes: true, attributeFilter: ["data-controls-enabled"] });
    });
    window.addEventListener("baozi:intro-orbit-handoff", (event: Event) => {
      windowAny.__handoffCount = (windowAny.__handoffCount ?? 0) + 1;
      windowAny.__handoffDetail = (event as CustomEvent<{ angle: number; angularVelocity: number }>).detail;
    });
  });
  await setIntroProgress(page, 0.94);
  const root = page.locator("[data-home-orbit-root]");
  await expect(root).toHaveAttribute("data-controls-enabled", "false");
  await expect(root).toHaveAttribute("data-controls-enabled", "true");
  await page.waitForFunction(() => (window as LifecycleWindow).__enableTime !== null);
  const timing = await page.evaluate(() => {
    const windowAny = window as LifecycleWindow;
    return { stoodTime: windowAny.__stoodTime, enableTime: windowAny.__enableTime };
  });
  expect(timing.stoodTime).not.toBeNull();
  expect(timing.enableTime).not.toBeNull();
  const delay = (timing.enableTime ?? NaN) - (timing.stoodTime ?? NaN);
  expect(delay).toBeGreaterThanOrEqual(280);
  expect(delay).toBeLessThan(500);
  const angleAt94 = await page.evaluate(() => {
    const element = document.querySelector<HTMLElement>("[data-home-orbit-root]");
    return element ? Number(element.getAttribute("data-orbit-angle")) : NaN;
  });
  await setIntroProgress(page, 1);
  const angleAt1 = await page.evaluate(() => {
    const element = document.querySelector<HTMLElement>("[data-home-orbit-root]");
    return element ? Number(element.getAttribute("data-orbit-angle")) : NaN;
  });
  expect(Number.isFinite(angleAt94)).toBe(true);
  expect(Number.isFinite(angleAt1)).toBe(true);
  expect(Math.abs(angleAt1 - angleAt94)).toBeCloseTo(Math.PI, 2);
  const counts = await page.evaluate(() => {
    const windowAny = window as LifecycleWindow;
    return {
      stoodCount: windowAny.__stoodCount ?? 0,
      handoffCount: windowAny.__handoffCount ?? 0,
      handoffDetail: windowAny.__handoffDetail ?? null,
    };
  });
  expect(counts.stoodCount).toBe(1);
  expect(counts.handoffCount).toBe(1);
  expect(counts.handoffDetail).not.toBeNull();
  expect(Number.isFinite(counts.handoffDetail?.angle)).toBe(true);
  expect(Number.isFinite(counts.handoffDetail?.angularVelocity)).toBe(true);
  await setIntroProgress(page, 0.98);
  await setIntroProgress(page, 1);
  const countsAgain = await page.evaluate(() => {
    const windowAny = window as LifecycleWindow;
    return { stoodCount: windowAny.__stoodCount ?? 0, handoffCount: windowAny.__handoffCount ?? 0 };
  });
  expect(countsAgain.stoodCount).toBe(1);
  expect(countsAgain.handoffCount).toBe(1);
});

test("home orbit person asset failure returns the intro person", async ({ page }) => {
  await setIntroProgress(page, 1);
  await expect(page.locator("[data-home-orbit-root]")).toHaveAttribute("data-orbit-active", "true");
  await expect(page.locator("[data-intro-person]")).toHaveAttribute("data-visible", "false");
  await page.evaluate(() => {
    const root = document.querySelector<HTMLElement>("[data-home-orbit-root]");
    if (!root) throw new Error("home orbit root missing");
    root.dataset.personOrbitError = "true";
    window.dispatchEvent(new CustomEvent("baozi:orbit-person-asset-error"));
  });
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect(page.locator("[data-person-sprite]")).toBeHidden();
  await expect(page.locator("[data-orbit-person]")).toBeVisible();
  await expect(page.locator("[data-intro-person]")).toHaveAttribute("data-visible", "true");
  await expect(page.locator("[data-intro-person]")).toBeVisible();
});

test("home orbit readiness gates the intro handoff", async ({ page }) => {
  await setIntroProgress(page, 0.93);
  const root = page.locator("[data-home-orbit-root]");
  await page.evaluate(() => {
    const element = document.querySelector<HTMLElement>("[data-home-orbit-root]");
    if (!element) throw new Error("home orbit root missing");
    element.dataset.orbitReady = "false";
  });
  await setIntroProgress(page, 0.94);
  await expect(root).toHaveAttribute("data-orbit-active", "false");
  await expect(page.locator("[data-intro-person]")).toHaveAttribute("data-visible", "true");
  await expect(page.locator("[data-intro-dog]")).toHaveAttribute("data-visible", "true");
  await page.evaluate(() => {
    const element = document.querySelector<HTMLElement>("[data-home-orbit-root]");
    if (!element) throw new Error("home orbit root missing");
    element.dataset.orbitReady = "true";
    window.dispatchEvent(new CustomEvent("baozi:orbit-ready"));
  });
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect(root).toHaveAttribute("data-orbit-active", "true");
  await expect(page.locator("[data-intro-person]")).toHaveAttribute("data-visible", "false");
  await expect(page.locator("[data-intro-dog]")).toHaveAttribute("data-visible", "false");
});

test("home orbit and intro sprites share the same box across the ownership boundary", async ({ page }) => {
  await setIntroProgress(page, 0.94);
  const root = page.locator("[data-home-orbit-root]");
  await expect(root).toHaveAttribute("data-orbit-active", "true");
  const readRect = (selector: string) =>
    page.evaluate((selector) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return { centerX: rect.left + rect.width / 2, bottom: rect.bottom, width: rect.width, height: rect.height };
    }, selector);
  const orbitPerson = await readRect("[data-orbit-person]");
  const orbitDog = await readRect("[data-dog-visual]");
  await setIntroProgress(page, 0.9394);
  await expect(page.locator("[data-intro-person]")).toHaveAttribute("data-visible", "true");
  await expect(page.locator("[data-intro-dog]")).toHaveAttribute("data-visible", "true");
  const introPerson = await readRect("[data-intro-person]");
  const introDog = await readRect("[data-intro-dog]");
  expect(orbitPerson).not.toBeNull();
  expect(orbitDog).not.toBeNull();
  expect(introPerson).not.toBeNull();
  expect(introDog).not.toBeNull();
  for (const [orbit, intro] of [
    [orbitPerson!, introPerson!],
    [orbitDog!, introDog!],
  ] as const) {
    for (const key of ["centerX", "bottom", "width", "height"] as const) {
      expect(Math.abs(orbit[key] - intro[key])).toBeLessThanOrEqual(4);
    }
  }
});

test("home orbit reverse preview freezes the handed-off angle and direction", async ({ page }) => {
  await setIntroProgress(page, 1);
  const root = page.locator("[data-home-orbit-root]");
  await expect(root).toHaveAttribute("data-orbit-active", "true");
  await setIntroProgress(page, 0.98);
  const readAngle = () =>
    page.evaluate(() => {
      const element = document.querySelector<HTMLElement>("[data-home-orbit-root]");
      return element ? Number(element.getAttribute("data-orbit-angle")) : NaN;
    });
  const angleAt98 = await readAngle();
  await page.evaluate(() => new Promise<void>((resolve) => {
    let remaining = 5;
    const next = () => {
      remaining -= 1;
      if (remaining > 0) requestAnimationFrame(next);
      else resolve();
    };
    requestAnimationFrame(next);
  }));
  const angleAfterRafs = await readAngle();
  expect(Number.isFinite(angleAt98)).toBe(true);
  expect(angleAfterRafs).toBeCloseTo(angleAt98, 6);
  const state = await page.evaluate(() => {
    const element = document.querySelector<HTMLElement>("[data-home-orbit-root]");
    if (!element) return null;
    return {
      angle: Number(element.getAttribute("data-orbit-angle")),
      direction: Number(element.getAttribute("data-dog-direction")),
    };
  });
  expect(state).not.toBeNull();
  const expectedDirection = selectDogSprite({
    angle: state!.angle,
    angularVelocity: -1,
    radiusX: 200,
    radiusY: 90,
    elapsedMovingSeconds: 0,
    lastDirection: state!.direction,
  }).direction;
  expect(state!.direction).toBe(expectedDirection);
});

test("home orbit intro skip after ownership hands back and finishes the intro", async ({ page }) => {
  await setIntroProgress(page, 0.95);
  const root = page.locator("[data-home-orbit-root]");
  await expect(root).toHaveAttribute("data-orbit-active", "true");
  await page.getByRole("button", { name: "跳过动画" }).click();
  await expect(root).toHaveAttribute("data-orbit-active", "false");
  await expect(root).toHaveAttribute("data-controls-enabled", "false");
  await expect(page.locator("[data-intro-final-art]")).toBeVisible();
  await expect(page.locator("[data-intro-root]")).toHaveAttribute("data-intro-complete", "true");
});

test("home orbit disposed person-error listener does not disturb the finished intro", async ({ page }) => {
  await setIntroProgress(page, 0.95);
  const root = page.locator("[data-home-orbit-root]");
  await expect(root).toHaveAttribute("data-orbit-active", "true");
  await page.getByRole("button", { name: "跳过动画" }).click();
  await page.evaluate(() => {
    const element = document.querySelector<HTMLElement>("[data-home-orbit-root]");
    if (!element) throw new Error("home orbit root missing");
    element.dataset.personOrbitError = "true";
    window.dispatchEvent(new CustomEvent("baozi:orbit-person-asset-error"));
  });
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect(page.locator("[data-intro-root]")).toHaveAttribute("data-intro-complete", "true");
  await expect(page.locator("[data-intro-final-art]")).toBeVisible();
  await expect(root).toHaveAttribute("data-orbit-active", "false");
});

test("home orbit person asset failure keeps the dog anchor grounded", async ({ page }) => {
  await setIntroProgress(page, 1);
  const root = page.locator("[data-home-orbit-root]");
  await expect(root).toHaveAttribute("data-orbit-active", "true");
  const readAnchor = () =>
    page.evaluate(() => {
      const element = document.querySelector<HTMLElement>("[data-orbit-anchor]");
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.bottom };
    });
  const before = await readAnchor();
  await page.evaluate(() => {
    const element = document.querySelector<HTMLElement>("[data-home-orbit-root]");
    if (!element) throw new Error("home orbit root missing");
    element.dataset.personOrbitError = "true";
    window.dispatchEvent(new CustomEvent("baozi:orbit-person-asset-error"));
  });
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect(page.locator("[data-orbit-anchor]")).toBeVisible();
  const after = await readAnchor();
  expect(before).not.toBeNull();
  expect(after).not.toBeNull();
  expect(Math.abs(after!.x - before!.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(after!.y - before!.y)).toBeLessThanOrEqual(1);
  await expect(page.locator("[data-intro-person]")).toBeVisible();
});

test("home orbit reverse cycle keeps canonical ownership geometry", async ({ page }) => {
  await setIntroProgress(page, 1);
  await setIntroProgress(page, 0.9394);
  const root = page.locator("[data-home-orbit-root]");
  await expect(page.locator("[data-intro-person]")).toHaveAttribute("data-visible", "true");
  await expect(page.locator("[data-intro-dog]")).toHaveAttribute("data-visible", "true");
  const readRect = (selector: string) =>
    page.evaluate((selector) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return { centerX: rect.left + rect.width / 2, bottom: rect.bottom, width: rect.width, height: rect.height };
    }, selector);
  const introPerson = await readRect("[data-intro-person]");
  const introDog = await readRect("[data-intro-dog]");
  await setIntroProgress(page, 0.94);
  await expect(root).toHaveAttribute("data-orbit-active", "true");
  const orbitPerson = await readRect("[data-orbit-person]");
  const orbitDog = await readRect("[data-dog-visual]");
  expect(introPerson).not.toBeNull();
  expect(introDog).not.toBeNull();
  expect(orbitPerson).not.toBeNull();
  expect(orbitDog).not.toBeNull();
  for (const [intro, orbit] of [
    [introPerson!, orbitPerson!],
    [introDog!, orbitDog!],
  ] as const) {
    for (const key of ["centerX", "bottom", "width", "height"] as const) {
      expect(Math.abs(intro[key] - orbit[key])).toBeLessThanOrEqual(4);
    }
  }
});
