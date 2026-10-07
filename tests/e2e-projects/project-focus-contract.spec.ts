import { expect, test, type Page } from "@playwright/test";
import { assertVisibleFocus } from "./project-test-helpers";
import { collectProjectFocus, projectFocusReadinessIssues } from "../support/project-focus-readiness";

async function mount(page: Page, styles = "") {
  await page.setContent(`<!doctype html><html><head><style>
    body { margin: 0; background: white; } main { padding: 40px; }
    a { display: inline-flex; align-items: center; height: 44px; padding: 0 12px; color: #202020; outline: none; }
    a:focus-visible { outline: 2px solid #202020; outline-offset: 2px; }
    #decoration { position: fixed; right: 10px; bottom: 10px; width: 10px; height: 10px; }
    @keyframes decorative { to { transform: rotate(360deg); } }
    ${styles}
    </style></head><body><main><header id="wrapper"><a id="subject" href="#return">返回项目</a></header>
    <a id="other" href="#other">其他链接</a></main><aside id="decoration"></aside></body></html>`);
  await page.keyboard.press("Tab");
  await expect(page.locator("#subject")).toBeFocused();
  return page.locator("#subject");
}

test("focus helper contract: accepts settled keyboard focus while unrelated decoration repeats forever", async ({ page }) => {
  const target = await mount(page, "#decoration { animation: decorative 1s linear infinite; }");
  const initial = await target.evaluate(collectProjectFocus);
  expect(initial.animations.some(({ relevant, endTime }) => !relevant && !Number.isFinite(endTime))).toBe(true);
  await assertVisibleFocus(target);
  expect(await page.locator("#decoration").evaluate((element) => element.getAnimations().some((animation) => animation.playState === "running"))).toBe(true);
});

test("focus helper contract: waits for native completion and the ancestor reveal started by its completion", async ({ page }) => {
  const target = await mount(page, `
    ::view-transition-group(root), ::view-transition-old(root), ::view-transition-new(root) { animation-duration: 0.4s; }
  `);
  await page.evaluate(async () => {
    const wrapper = document.querySelector<HTMLElement>("#wrapper")!;
    const transition = document.startViewTransition(() => { document.body.dataset.navigation = "changed"; });
    void transition.finished.then(async () => {
      document.body.dataset.nativeFinished = "true";
      const reveal = wrapper.animate([{ opacity: 0, filter: "blur(6px)" }, { opacity: 1, filter: "blur(0px)" }], { duration: 600 });
      await reveal.finished;
      document.body.dataset.revealFinished = "true";
    });
    await transition.ready;
  });
  expect(projectFocusReadinessIssues(await target.evaluate(collectProjectFocus)).length).toBeGreaterThan(0);
  await assertVisibleFocus(target);
  await expect(page.locator("body")).toHaveAttribute("data-native-finished", "true");
  await expect(page.locator("body")).toHaveAttribute("data-reveal-finished", "true");
  expect(projectFocusReadinessIssues(await target.evaluate(collectProjectFocus))).toEqual([]);
});

test("focus helper contract: waits for a delayed finite ancestor reveal without waiting for retained direction metadata", async ({ page }) => {
  const target = await mount(page);
  await page.evaluate(() => {
    document.documentElement.dataset.navDirection = "forward";
    document.documentElement.classList.add("lenis-scrolling");
    const reveal = document.querySelector("#wrapper")!.animate([
      { opacity: 0, filter: "blur(6px)" }, { opacity: 1, filter: "blur(0px)" },
    ], { delay: 150, duration: 400, fill: "backwards" });
    void reveal.finished.then(() => { document.body.dataset.revealFinished = "true"; });
  });
  const initial = await target.evaluate(collectProjectFocus);
  expect(initial.focused).toBe(true);
  expect(initial.focusVisible).toBe(true);
  expect(projectFocusReadinessIssues(initial).length).toBeGreaterThan(0);
  await assertVisibleFocus(target);
  await expect(page.locator("body")).toHaveAttribute("data-reveal-finished", "true");
  await expect(page.locator("html")).toHaveAttribute("data-nav-direction", "forward");
  await expect(page.locator("html")).toHaveClass("lenis-scrolling");
});

const hiddenCases = [
  { name: "permanent ancestor opacity zero", css: "opacity: 0" },
  { name: "unfinished ancestor opacity", css: "opacity: 0.994276" },
  { name: "permanent ancestor blur", css: "filter: blur(6px)" },
];
for (const sample of hiddenCases) {
  test(`focus helper contract: rejects ${sample.name} despite retained focus`, async ({ page }) => {
    const target = await mount(page);
    await page.locator("#wrapper").evaluate((element, css) => element.setAttribute("style", css), sample.css);
    const actual = await target.evaluate(collectProjectFocus);
    expect(actual.focused).toBe(true);
    expect(actual.focusVisible).toBe(true);
    expect(projectFocusReadinessIssues(actual)).toEqual([]);
    await expect(assertVisibleFocus(target)).rejects.toThrow(/fully revealed/);
  });
}

for (const css of ["display: none", "visibility: hidden", "content-visibility: hidden"]) {
  test(`focus helper contract: rejects a permanently hidden ancestor (${css})`, async ({ page }) => {
    const target = await mount(page);
    await page.locator("#wrapper").evaluate((element, value) => element.setAttribute("style", value), css);
    expect(projectFocusReadinessIssues(await target.evaluate(collectProjectFocus))).toEqual([]);
    await expect(assertVisibleFocus(target)).rejects.toThrow();
  });
}

test("focus helper contract: rejects a permanent overlay instead of polling until a hit succeeds", async ({ page }) => {
  const target = await mount(page);
  await page.evaluate(() => {
    const overlay = document.createElement("div");
    overlay.style.cssText = "position: fixed; inset: 0; z-index: 99; background: white";
    document.body.append(overlay);
  });
  const actual = await target.evaluate(collectProjectFocus);
  expect(actual.focused).toBe(true);
  expect(actual.unobscured).toBe(false);
  expect(projectFocusReadinessIssues(actual)).toEqual([]);
  await expect(assertVisibleFocus(target)).rejects.toThrow(/unobscured/);
});

test("focus helper contract: rejects focus moved elsewhere by normal Tab", async ({ page }) => {
  const target = await mount(page);
  await page.keyboard.press("Tab");
  await expect(page.locator("#other")).toBeFocused();
  await expect(assertVisibleFocus(target)).rejects.toThrow(/retain actual focus/);
});

test("focus helper contract: rejects a focused target outside the viewport", async ({ page }) => {
  const target = await mount(page);
  await target.evaluate((element) => { (element as HTMLElement).style.transform = "translateX(200vw)"; });
  await expect(assertVisibleFocus(target)).rejects.toThrow(/in the viewport/);
});

test("focus helper contract: retains the 3:1 outline contrast floor", async ({ page }) => {
  const target = await mount(page, "#subject:focus-visible { outline-color: white; }");
  await expect(assertVisibleFocus(target)).rejects.toThrow(/outline contrast/);
});

test("focus helper contract: rejects a missing focus outline", async ({ page }) => {
  const target = await mount(page, "#subject:focus-visible { outline: none; }");
  await expect(assertVisibleFocus(target)).rejects.toThrow();
});

test("focus helper contract: does not pass on transient visibility before a finite animation ends transparent", async ({ page }) => {
  const target = await mount(page);
  await page.evaluate(() => {
    const fade = document.querySelector("#wrapper")!.animate([
      { opacity: 1, offset: 0 }, { opacity: 1, offset: 0.8 }, { opacity: 0, offset: 1 },
    ], { duration: 600, fill: "forwards" });
    void fade.finished.then(() => { document.body.dataset.animationFinished = "true"; });
  });
  await expect(assertVisibleFocus(target)).rejects.toThrow(/fully revealed/);
  await expect(page.locator("body")).toHaveAttribute("data-animation-finished", "true");
});

test("focus helper contract: does not pass on a transient clear hit before a finite exit layer ends covering focus", async ({ page }) => {
  const target = await mount(page);
  await page.evaluate(() => {
    const overlay = document.createElement("div");
    overlay.setAttribute("data-turn-exit", "");
    overlay.style.cssText = "position: fixed; inset: 0; z-index: 99; background: white";
    document.body.append(overlay);
    const cover = overlay.animate([
      { transform: "translateX(200vw)", offset: 0 }, { transform: "translateX(200vw)", offset: 0.8 }, { transform: "none", offset: 1 },
    ], { duration: 600, fill: "forwards" });
    void cover.finished.then(() => { document.body.dataset.animationFinished = "true"; });
  });
  await expect(assertVisibleFocus(target)).rejects.toThrow(/unobscured/);
  await expect(page.locator("body")).toHaveAttribute("data-animation-finished", "true");
});
