import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { projectsForCase, type ProjectFixtureCase } from "../fixtures/projects/projects";
import { hasBlogPreparation, type PreparationRecord } from "../support/navigation-event-records";

const caseName = (process.env.PROJECTS_FIXTURE_CASE ?? JSON.parse(readFileSync(join(process.cwd(), "projects-evidence/fixture-manifest.json"), "utf8")).caseName) as ProjectFixtureCase;
const projects = projectsForCase(caseName).filter(({ draft, approved }) => !draft && approved)
  .sort((a, b) => b.date.getTime() - a.date.getTime() || a.slug.localeCompare(b.slug));
const last = projects.at(-1);
const lastLink = `[data-project-list] a[data-project-id="${last?.slug}"]`;
const detailPath = `/projects/${last?.slug}`;

async function healthy(page: Page) {
  await expect(page.locator("main#main")).toHaveCount(1);
  await expect(page.locator("main h1")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "主要栏目", exact: true }).getByRole("link")).toHaveCount(4);
  await expect(page.locator("[data-turn-mask]")).toHaveAttribute("data-phase", "idle");
  await expect(page.locator("body")).not.toContainText("PRIVATE-PROJECT");
}

async function detail(page: Page) {
  await expect(page).toHaveURL(new RegExp(`${detailPath}/?$`));
  await expect(page.locator("[data-project-detail] h1")).toHaveText(last!.title);
  await expect(page.locator(".project-header__role")).toHaveText(last!.role!);
  await expect(page.locator(".editorial-prose")).toContainText("我的贡献");
  await healthy(page);
}

async function openLast(page: Page, keyboard = false) {
  await page.goto("/projects");
  await expect(page.locator(lastLink)).toBeVisible();
  await page.locator(lastLink).scrollIntoViewIfNeeded();
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(100);
  if (keyboard) {
    await page.locator(lastLink).focus();
    await page.keyboard.press("Enter");
  } else await page.locator(lastLink).click();
  await detail(page);
  const saved = await page.evaluate(() => history.state?.baoziProjects?.list);
  expect(saved).toMatchObject({ projectId: last!.slug, scrollY: expect.any(Number), key: expect.any(String) });
  expect(saved.scrollY).toBeGreaterThan(100);
  return saved as { key: string; projectId: string; scrollY: number };
}

async function restored(page: Page, saved: { scrollY: number }) {
  await expect(page).toHaveURL(/\/projects\/?$/);
  await expect(page.locator("#project-list-title")).toHaveText("项目");
  await expect(page.locator(lastLink)).toBeFocused();
  await expect.poll(() => page.evaluate((scrollY) => Math.abs(window.scrollY - Math.min(scrollY, Math.max(0, document.documentElement.scrollHeight - innerHeight))), saved.scrollY)).toBeLessThan(3);
  await healthy(page);
}

test.describe("project visit position and focus", () => {
  test.beforeEach(() => { test.skip(projects.length < 3, "mixed or work-only long list required"); });

  for (const width of [390, 1440]) {
    for (const method of ["top", "footer", "browser"] as const) {
      test(`${width}px last project returns through ${method}, then forward/back preserves content and focus`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        const saved = await openLast(page, method === "top");
        const length = await page.evaluate(() => history.length);
        if (method === "browser") await page.goBack();
        else await page.locator("[data-project-return]")[method === "top" ? "first" : "last"]().click();
        await restored(page, saved);
        expect(await page.evaluate(() => history.length)).toBe(length);
        await page.goForward();
        await detail(page);
        await page.goBack();
        await restored(page, saved);
      });
    }
  }

  test("detail refresh retains a safe adjacent return", async ({ page }) => {
    const saved = await openLast(page);
    const before = await page.evaluate(() => history.state.baoziProjects);
    await page.reload();
    await detail(page);
    expect(await page.evaluate(() => history.state.baoziProjects)).toEqual(before);
    await page.locator("[data-project-return]").first().click();
    await restored(page, saved);
  });

  test("non-adjacent trusted history follows the ordinary onsite link and restores its snapshot", async ({ page }) => {
    const saved = await openLast(page);
    await page.evaluate(() => history.pushState({ ...history.state, index: history.state.index + 1 }, "", location.href));
    const length = await page.evaluate(() => history.length);
    await page.locator("[data-project-return]").first().click();
    await restored(page, saved);
    expect(await page.evaluate(() => history.length)).toBe(length + 1);
    expect(await page.evaluate(() => history.state.baoziProjects.detailId)).toBeUndefined();
  });

  test("a removed project falls back to the surviving list heading", async ({ page }) => {
    await openLast(page);
    const response = await page.request.get("/projects");
    const body = (await response.text()).replaceAll(`data-project-id="${last!.slug}"`, 'data-project-id="retired-project"');
    await page.route(/\/projects\/?$/, (route) => route.fulfill({ contentType: "text/html", body }));
    await page.locator("[data-project-return]").first().click();
    await expect(page.locator("#project-list-title")).toBeFocused();
    await expect(page.locator(lastLink)).toHaveCount(0);
    await healthy(page);
  });

  test("five round trips do not accumulate back handlers, restores, or extra swaps", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/projects");
    await page.evaluate(() => {
      const counts = { swaps: 0, focusedLinks: 0 };
      Object.assign(window, { projectTestCounts: counts });
      document.addEventListener("astro:after-swap", () => counts.swaps++);
      document.addEventListener("focusin", (event) => {
        if (event.target instanceof Element && event.target.matches("[data-project-list] a[data-project-id]")) counts.focusedLinks++;
      });
    });
    for (let index = 0; index < 5; index++) {
      await page.locator(lastLink).click();
      await detail(page);
      const saved = await page.evaluate(() => history.state.baoziProjects.list);
      await page.locator("[data-project-return]").last().dblclick({ delay: 20 });
      await restored(page, saved);
    }
    const counts = await page.evaluate(() => (window as Window & { projectTestCounts?: { swaps: number; focusedLinks: number } }).projectTestCounts!);
    expect(counts.swaps).toBe(10);
    expect(counts.focusedLinks).toBeLessThanOrEqual(10);
    expect(errors).toEqual([]);
  });

  test("a cancelled project request followed by Blog keeps one complete current page and an idle mask", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    await page.route(`**${detailPath}`, async (route) => { await gate; await route.abort("failed"); });
    try {
      await page.goto("/projects");
      const preparations: PreparationRecord[] = [];
      await page.exposeFunction("recordProjectPreparation", (record: PreparationRecord) => { preparations.push(record); });
      await page.evaluate(() => {
        const recordPreparation = (window as Window & { recordProjectPreparation?: (record: PreparationRecord) => Promise<void> }).recordProjectPreparation;
        if (!recordPreparation) throw new Error("The project preparation recorder must be installed before clicking");
        document.addEventListener("astro:before-preparation", (event) => {
          const preparation = event as Event & { to?: URL };
          void recordPreparation({
            type: event.type, pathname: preparation.to?.pathname ?? null,
          });
        });
      });
      await page.locator(lastLink).click();
      await page.getByRole("navigation", { name: "主要栏目", exact: true }).getByRole("link", { name: "文章", exact: true }).click();
      await expect.poll(() => hasBlogPreparation(preparations)
        ? { matched: true }
        : { matched: false, records: [...preparations] }, {
        message: "Blog preparation must be observed before releasing the failed project request",
      }).toEqual({ matched: true });
      release();
      await expect(page).toHaveURL(/\/blog\/?$/);
      await expect(page.locator("main h1")).toHaveText("文章");
      await expect(page.locator("main a[href*='/blog/ryoutei-menu-05']").first()).toBeVisible();
      await healthy(page);
      await expect(page.locator("html")).not.toHaveAttribute("data-nav-direction");
      expect(await page.evaluate(() => history.state.baoziProjects)).toBeUndefined();
      expect(errors).toEqual([]);
    } finally { release(); }
  });

  test("user keyboard input during a delayed return suppresses late project focus", async ({ page }) => {
    await openLast(page);
    let release!: () => void;
    let started!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const requested = new Promise<void>((resolve) => { started = resolve; });
    await page.route(/\/projects\/?$/, async (route) => { started(); await gate; await route.continue(); });
    try {
      await page.locator("[data-project-return]").first().click();
      await requested;
      await page.keyboard.press("Tab");
      release();
      await expect(page).toHaveURL(/\/projects\/?$/);
      await healthy(page);
      await expect(page.locator(lastLink)).not.toBeFocused();
    } finally { release(); }
  });

  test("album namespace survives list save and project traversal unchanged", async ({ page }) => {
    await page.goto("/projects");
    const album = { version: 1, listKey: "album-existing", albumId: "synthetic-album", photoId: "photo-b" };
    await page.evaluate((baoziAlbum) => history.replaceState({ ...history.state, baoziAlbum }, ""), album);
    await page.locator(lastLink).click();
    await detail(page);
    await page.goBack();
    await expect(page.locator(lastLink)).toBeFocused();
    expect(await page.evaluate(() => history.state.baoziAlbum)).toEqual(album);
  });
});

test.describe("ordinary project links", () => {
  test.beforeEach(() => { test.skip(!last, "public project required"); });

  test("external direct entry returns onsite without navigating back to the external origin", async ({ page, baseURL }) => {
    const url = new URL(detailPath, baseURL).href;
    await page.route("https://project-entry.invalid/", (route) => route.fulfill({ contentType: "text/html", body: `<a href="${url}">Open project</a>` }));
    await page.goto("https://project-entry.invalid/");
    await page.getByRole("link", { name: "Open project" }).click();
    await detail(page);
    await page.locator("[data-project-return]").first().click();
    await expect(page).toHaveURL(new RegExp(`${baseURL}/projects/?$`));
    await healthy(page);
    expect(await page.evaluate(() => scrollY)).toBeLessThan(5);
    await expect(page.locator(lastLink)).not.toBeFocused();
  });

  test("target blank keeps the source unchanged and the new tab returns normally", async ({ page }) => {
    await page.goto("/projects");
    await page.locator(lastLink).evaluate((link) => link.setAttribute("target", "_blank"));
    const before = await page.evaluate(() => history.state.baoziProjects);
    const popupPromise = page.waitForEvent("popup");
    await page.locator(lastLink).click();
    const popup = await popupPromise;
    await detail(popup);
    expect(await page.evaluate(() => history.state.baoziProjects)).toEqual(before);
    await popup.locator("[data-project-return]").last().click();
    await expect(popup).toHaveURL(/\/projects\/?$/);
    await healthy(popup);
    expect(await popup.evaluate(() => scrollY)).toBeLessThan(5);
    await popup.close();
  });

  test("no JavaScript retains ordinary project and return anchors", async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
    const page = await context.newPage();
    try {
      await page.goto("/projects");
      await page.locator(lastLink).click();
      await expect(page.locator("[data-project-detail] h1")).toHaveText(last!.title);
      await expect(page.locator(".editorial-prose")).toContainText("我的贡献");
      await page.locator("[data-project-return]").last().click();
      await expect(page.locator("#project-list-title")).toHaveText("项目");
      await expect(page.locator(lastLink)).toBeVisible();
    } finally { await context.close(); }
  });
});
