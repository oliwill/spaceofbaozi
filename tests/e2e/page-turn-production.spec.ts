import { expect, test, type Page } from "@playwright/test";
import { isBackPaperExitStart, type PaperExitAnimationRecord } from "../support/navigation-event-records";

const POST_LINK = "a[href*='/blog/ryoutei-menu-05']";
const ARTICLE = /\/blog\/ryoutei-menu-05\/?$/;

async function expectDocument(page: Page) {
  await expect(page.locator("main#main")).toBeVisible();
  await expect(page.locator("main#main")).toHaveCount(1);
  await expect(page.locator("main h1")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "主要栏目", exact: true })).toBeVisible();
  expect(await page.locator("body").innerText()).not.toBe("null");
}

test("desktop forward navigation swaps once and keeps a complete document", async ({ page }) => {
  await page.goto("/blog");
  await page.evaluate(() => {
    const observed = { directions: [] as string[], swaps: 0 };
    const save = () => sessionStorage.setItem("test:forward-transition", JSON.stringify(observed));
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        const direction = (record.target as Element).getAttribute("data-nav-direction") ?? record.oldValue;
        if (direction && observed.directions.at(-1) !== direction) observed.directions.push(direction);
      }
      save();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-nav-direction"],
      attributeOldValue: true,
    });
    document.addEventListener("astro:after-swap", () => { observed.swaps += 1; save(); });
    save();
  });
  await page.locator(POST_LINK).first().click();
  await expect(page).toHaveURL(ARTICLE);
  await expectDocument(page);
  await expect.poll(() => page.evaluate(() => JSON.parse(sessionStorage.getItem("test:forward-transition")!).directions)).toEqual(["forward"]);
  await page.waitForTimeout(1200);
  await expectDocument(page);
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem("test:forward-transition")!).swaps)).toBe(1);
  await expect(page.locator("html")).not.toHaveAttribute("data-nav-direction");
});

test("desktop return link lifts the paper away and preserves the destination", async ({ page }) => {
  await page.goto("/blog/ryoutei-menu-05");
  const exitStarts: PaperExitAnimationRecord[] = [];
  await page.exposeFunction("recordPaperExitStart", (record: PaperExitAnimationRecord) => { exitStarts.push(record); });
  await page.evaluate(() => {
    const exit = document.querySelector("[data-turn-exit]");
    if (!exit) throw new Error("The page-turn exit must exist before the return click");
    const recordExitStart = (window as Window & { recordPaperExitStart?: (record: PaperExitAnimationRecord) => Promise<void> }).recordPaperExitStart;
    if (!recordExitStart) throw new Error("The paper-exit recorder must be installed before the return click");
    document.addEventListener("animationstart", (event) => {
      if (!(event instanceof AnimationEvent) || !(event.target instanceof Element)) return;
      const style = getComputedStyle(event.target);
      const names = style.animationName.split(",").map((name) => name.trim());
      const durations = style.animationDuration.split(",").map((duration) => duration.trim());
      const index = names.indexOf(event.animationName);
      const duration = index < 0 ? "0s" : durations[index % durations.length]!;
      void recordExitStart({
        type: event.type, animationName: event.animationName, pseudoElement: event.pseudoElement,
        isTrusted: event.isTrusted, targetIsExit: event.target === exit && exit === document.querySelector("[data-turn-exit]"),
        direction: document.documentElement.getAttribute("data-nav-direction"), computedAnimationName: style.animationName,
        durationMs: parseFloat(duration) * (duration.endsWith("ms") ? 1 : 1000),
      });
    });
  });
  await page.locator("a.article-page__back").click();
  await expect(page).toHaveURL(/\/blog\/?$/);
  await expect.poll(() => exitStarts.some(isBackPaperExitStart)
    ? { matched: true }
    : { matched: false, records: [...exitStarts] }, {
    message: "The current exit must start a real paper-exit-move animation with back direction",
  }).toEqual({ matched: true });
  const exitStart = exitStarts.find(isBackPaperExitStart)!;
  expect(exitStart.direction).toBe("back");
  await expectDocument(page);
  const exitAnimation = exitStart.computedAnimationName;
  expect(exitAnimation).toContain("paper-exit-move");
  await page.waitForTimeout(1200);
  await expectDocument(page);
  await expect(page.locator("html")).not.toHaveAttribute("data-nav-direction");
});

for (const width of [360, 390]) {
  test(`mobile ${width}px completes the mask before one swap and retains content afterward`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.addInitScript(() => {
      let preparedAt = 0;
      document.addEventListener("astro:before-preparation", () => { preparedAt = performance.now(); });
      document.addEventListener("astro:after-swap", () => {
        sessionStorage.setItem("test:swaps", String(Number(sessionStorage.getItem("test:swaps")) + 1));
        sessionStorage.setItem("test:cover-duration", String(performance.now() - preparedAt));
      });
    });
    await page.goto("/blog");
    await page.locator(POST_LINK).first().click();
    await expect(page).toHaveURL(ARTICLE);
    await expectDocument(page);
    await page.waitForTimeout(1200);
    await expectDocument(page);
    expect(await page.evaluate(() => sessionStorage.getItem("test:swaps"))).toBe("1");
    expect(await page.evaluate(() => Number(sessionStorage.getItem("test:cover-duration")))).toBeGreaterThanOrEqual(350);
    await expect(page.locator("[data-turn-mask]")).toHaveAttribute("data-phase", "idle");
    await page.locator("a.article-page__back").click();
    await expect(page).toHaveURL(/\/blog\/?$/);
    await page.waitForTimeout(600);
    await expectDocument(page);
    expect(await page.evaluate(() => sessionStorage.getItem("test:swaps"))).toBe("2");
  });
}

test("reduced motion swaps without a mask or direction attribute", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/blog");
  await page.locator(POST_LINK).first().click();
  await expect(page).toHaveURL(ARTICLE);
  await expectDocument(page);
  await expect(page.locator("html")).not.toHaveAttribute("data-nav-direction");
  await expect(page.locator("[data-turn-mask]")).toHaveAttribute("data-phase", "idle");
  await page.waitForTimeout(600);
  await expectDocument(page);
});

test("page keeps scrolling normally after SPA navigation", async ({ page }) => {
  await page.goto("/blog");
  await page.locator(POST_LINK).first().click();
  await expect(page).toHaveURL(ARTICLE);
  await page.mouse.wheel(0, 650);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(200);
  await expectDocument(page);
});
