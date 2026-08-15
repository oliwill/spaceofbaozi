import { expect, test, type Page } from "@playwright/test";

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
  const root = page.locator("[data-home-orbit-root]");
  await expect(root).toHaveCount(1);
  expect(await root.getAttribute("data-orbit-ready")).toBe("false");
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
  expect(vars).toEqual({
    orbitX: "0px",
    orbitY: "0px",
    dogScale: "0.97",
    dogZ: "3",
    shadowOpacity: "0.075",
  });
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
