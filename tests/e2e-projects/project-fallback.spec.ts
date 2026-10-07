import { expect, test, type Locator } from "@playwright/test";
import { assertList, assertPageGeometry, assertUnclipped, assertVisibleFocus, bodyImages, caseName, listLink, projectItem, projects, ready, reviewPicture, tabTo } from "./project-test-helpers";

const escaped = (text: string) => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const imageProjects = projects.filter(({ cover }) => cover);
const navPaths = ["/blog", "/photos", "/projects", "/media"];

// These request-only tests can run without launching Chromium. They prove SSR, not rendered geometry or no-JS browser behavior.
test(`[SSR] ${caseName}: public list supplies real ordinary anchors, full roles and no empty controls`, async ({ request }) => {
  const response = await request.get("/projects");
  expect(response.status()).toBe(200);
  const html = await response.text();
  const list = html.match(/<section\b[^>]*\bdata-project-list\b[^>]*>([\s\S]*?)<\/section>/)?.[1];
  expect(list).toBeDefined();
  expect(html).not.toContain("PRIVATE-PROJECT");
  expect(list).not.toMatch(/<(?:button|input|select)\b/);
  expect((list!.match(/data-project-id="/g) ?? []).length).toBe(projects.length);
  for (const path of navPaths) expect(html).toContain(`href="${path}"`);
  if (!projects.length) {
    expect(list!.replace(/<[^>]*>/g, "").trim().replace(/\s+/g, " ")).toBe("项目 项目正在整理。");
    expect(list).not.toMatch(/<(?:ul|li|img|a)\b/);
    expect(html).toMatch(/<meta\b[^>]*name="robots"[^>]*content="noindex"/);
  } else {
    let previousIndex = -1;
    for (const project of projects) {
      const index = list!.indexOf(`data-project-id="${project.slug}"`);
      expect(index).toBeGreaterThan(previousIndex);
      previousIndex = index;
      expect(list).toContain(`href="/projects/${project.slug}"`);
      expect(list).toContain(escaped(project.title));
      expect(list).toContain(escaped(project.intro));
      expect(list).toContain(escaped(project.role));
      if (project.cover) {
        const image = project.images.find(({ src }) => src === project.cover)!;
        const tag = list!.match(new RegExp(`<img\\b[^>]*src="${image.src}"[^>]*>`))?.[0];
        expect(tag).toBeDefined();
        expect(tag).toContain(`width="${image.width}"`);
        expect(tag).toContain(`height="${image.height}"`);
        expect(tag).toContain(`alt="${escaped(project.coverAlt ?? image.alt)}"`);
      }
    }
  }
});

for (const project of projects) {
  test(`[SSR] ${caseName}: ${project.slug} detail has two return anchors and meaningful declared images`, async ({ request }) => {
    const response = await request.get(`/projects/${project.slug}`);
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).not.toContain("PRIVATE-PROJECT");
    const article = html.match(/<article\b[^>]*\bdata-project-detail\b[^>]*>([\s\S]*?)<\/article>/)?.[1];
    expect(article).toBeDefined();
    expect(article).toContain(escaped(project.title));
    expect(article).toContain(escaped(project.role));
    const returns = article!.match(/<a\b[^>]*\bdata-project-return\b[^>]*>[\s\S]*?<\/a>/g) ?? [];
    expect(returns).toHaveLength(2);
    for (const link of returns) expect(link).toContain('href="/projects"');
    expect((article!.match(/<img\b/g) ?? []).length).toBe(bodyImages(project).length);
    for (const image of bodyImages(project)) {
      const tag = article!.match(new RegExp(`<img\\b[^>]*src="${image.src}"[^>]*>`))?.[0];
      expect(tag).toContain(`width="${image.width}"`);
      expect(tag).toContain(`height="${image.height}"`);
      expect(tag).toContain(`alt="${escaped(image.alt)}"`);
    }
    if (!project.link) expect(article).not.toContain('class="project-footer__external"');
  });

  test(`${caseName}: no JavaScript traverses ${project.slug} and both return anchors`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, baseURL, viewport: { width: 390, height: 900 } });
    const page = await context.newPage();
    try {
      for (const end of ["first", "last"] as const) {
        await page.goto("/projects");
        await listLink(page, project.slug).click();
        await expect(page).toHaveURL(new RegExp(`/projects/${project.slug}/?$`));
        await expect(page.locator(".project-header h1")).toHaveText(project.title);
        await expect(page.locator(".project-header__role")).toHaveText(project.role);
        await expect(page.locator(".editorial-prose")).toContainText(project.slug.startsWith("synthetic-gate-") ? "BODY-CONTRIBUTION" : "我的贡献");
        await page.locator("[data-project-return]")[end]().click();
        await expect(page).toHaveURL(/\/projects\/?$/);
        await assertList(page, 390);
        await assertPageGeometry(page, 390);
      }
    } finally { await context.close(); }
  });
}

if (!projects.length) {
  test("empty: no JavaScript retains the concise page and all four usable navigation destinations", async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, baseURL, viewport: { width: 390, height: 900 } });
    const page = await context.newPage();
    try {
      await page.goto("/projects");
      await assertList(page, 390);
      await assertPageGeometry(page, 390);
      for (const path of navPaths) {
        await page.goto("/projects");
        await page.locator(`.shell-links a[href="${path}"]`).click();
        await expect(page).toHaveURL(new RegExp(`${path}/?$`));
        await expect(page.locator("main h1")).toBeVisible();
      }
    } finally { await context.close(); }
  });
  test("empty: no speculative project image request or empty image slot", async ({ page }) => {
    const requests: string[] = [];
    page.on("request", (request) => { if (new URL(request.url()).pathname.startsWith("/assets/projects/")) requests.push(request.url()); });
    await page.goto("/projects");
    await ready(page);
    await assertList(page, 1440);
    expect(requests).toEqual([]);
  });
}

async function loadedImageBounds(image: Locator) {
  await image.scrollIntoViewIfNeeded();
  await expect.poll(() => image.evaluate((element) => element instanceof HTMLImageElement && element.complete && element.naturalWidth > 0)).toBe(true);
  const bounds = await image.boundingBox();
  return { width: bounds!.width, height: bounds!.height };
}

async function assertBrokenImage(image: Locator, before: { width: number; height: number }, alt: string) {
  await image.scrollIntoViewIfNeeded();
  await expect.poll(() => image.evaluate((element) => element instanceof HTMLImageElement && element.complete && element.naturalWidth === 0)).toBe(true);
  await expect(image).toHaveAttribute("alt", alt);
  await expect(image).toHaveAccessibleName(alt);
  const bounds = await image.boundingBox();
  expect(bounds!.width).toBeGreaterThan(0);
  expect(bounds!.height).toBeGreaterThan(0);
  expect(Math.abs(bounds!.width - before.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(bounds!.height - before.height)).toBeLessThanOrEqual(1);
}

if (imageProjects.length) {
  for (const width of [390, 1440]) {
    test(`${caseName}: ${width}px broken list images reserve dimensions and retain text detail entry`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/projects");
      await ready(page);
      const before = new Map<string, { width: number; height: number }>();
      for (const project of imageProjects) before.set(project.slug, await loadedImageBounds(page.locator(`.project-item img[src="${project.cover}"]`)));
      const blocked: string[] = [];
      await page.route("**/assets/projects/**", (route) => { blocked.push(route.request().url()); return route.abort("failed"); });
      await page.reload();
      await ready(page);
      for (const project of imageProjects) {
        const image = project.images.find(({ src }) => src === project.cover)!;
        await assertBrokenImage(page.locator(`.project-item img[src="${project.cover}"]`), before.get(project.slug)!, project.coverAlt ?? image.alt);
        await expect(listLink(page, project.slug)).toHaveText(project.title);
        await expect(listLink(page, project.slug)).toHaveAttribute("href", `/projects/${project.slug}`);
        await expect(projectItem(page, project.slug).locator(".project-item__role")).toHaveText(project.role);
      }
      expect(blocked.length).toBeGreaterThanOrEqual(imageProjects.length);
      await assertPageGeometry(page, width);
      await assertList(page, width);
      await reviewPicture(page, testInfo, `broken-list-images-${width}`);
      await listLink(page, imageProjects[0].slug).click();
      await expect(page.locator(".project-header h1")).toHaveText(imageProjects[0].title);
    });
  }
}

for (const project of projects.filter((project) => bodyImages(project).length)) {
  test(`${caseName}: broken ${project.slug} body image keeps full reserved frame and return text`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto(`/projects/${project.slug}`);
    await ready(page);
    const before = new Map<string, { width: number; height: number }>();
    for (const image of bodyImages(project)) before.set(image.src, await loadedImageBounds(page.locator(`.editorial-prose img[src="${image.src}"]`)));
    const blocked: string[] = [];
    await page.route("**/assets/projects/**", (route) => { blocked.push(route.request().url()); return route.abort("failed"); });
    await page.reload();
    await ready(page);
    for (const image of bodyImages(project)) await assertBrokenImage(page.locator(`.editorial-prose img[src="${image.src}"]`), before.get(image.src)!, image.alt);
    expect(blocked.length).toBeGreaterThanOrEqual(bodyImages(project).length);
    await expect(page.locator(".project-header__role")).toHaveText(project.role);
    await expect(page.locator("[data-project-return]")).toHaveCount(2);
    await assertPageGeometry(page, 390);
    await reviewPicture(page, testInfo, `broken-detail-image-${project.slug}`);
    await page.locator("[data-project-return]").last().click();
    await expect(page).toHaveURL(/\/projects\/?$/);
    await assertList(page, 390);
  });
}

for (const width of [390, 1440]) {
  test(`${caseName}: ${width}px failed decorative characters leave navigation and content usable`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const blocked: string[] = [];
    await page.route("**/assets/home/runtime/**", (route) => { blocked.push(route.request().url()); return route.abort("failed"); });
    await page.goto("/projects");
    await ready(page);
    await expect.poll(() => blocked.length).toBeGreaterThanOrEqual(2);
    await expect(page.locator(".site-characters__still")).toHaveAttribute("aria-hidden", "true");
    await expect(page.locator(".site-characters")).toHaveCSS("pointer-events", "none");
    await expect(page.locator(".site-characters [tabindex], .site-characters a, .site-characters button")).toHaveCount(0);
    await assertPageGeometry(page, width);
    await assertList(page, width);
    if (projects.length) {
      await listLink(page, projects[0].slug).click();
      await ready(page);
      await expect(page.locator(".project-header__role")).toHaveText(projects[0].role);
      await assertPageGeometry(page, width);
      await page.locator("[data-project-return]").first().click();
      await expect(page).toHaveURL(/\/projects\/?$/);
    }
  });

  test(`${caseName}: ${width}px reduced motion has no Projects looping animation or unstable text`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/projects");
    await ready(page);
    expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
    const paths = ["/projects", ...projects.map(({ slug }) => `/projects/${slug}`)];
    for (const path of paths) {
      await page.goto(path);
      await ready(page);
      const animated = await page.locator("[data-project-list], [data-project-detail]").evaluate((root) => {
        const elements = [root, ...root.querySelectorAll("*")];
        return elements.filter((element) => ["", "::before", "::after"].some((pseudo) => {
          const style = getComputedStyle(element, pseudo || null);
          return style.animationName !== "none" || style.animationIterationCount.split(",").some((value) => value.trim() === "infinite");
        })).map((element) => element.className);
      });
      expect(animated).toEqual([]);
      expect(await page.locator("[data-project-list], [data-project-detail]").evaluate((root) => root.getAnimations({ subtree: true }).filter((animation) => animation.effect?.getComputedTiming().iterations === Infinity).length)).toBe(0);
      const movement = await page.locator("[data-project-list], [data-project-detail]").evaluate(async (root) => {
        const elements = [...root.querySelectorAll("h1, h2, .project-item__role, .project-header__role, .projects-empty")];
        const sample = () => elements.flatMap((element) => {
          const bounds = element.getBoundingClientRect();
          return [bounds.x, bounds.y, bounds.width, bounds.height];
        });
        const initial = sample();
        let maximum = 0;
        for (let frame = 0; frame < 5; frame++) {
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          sample().forEach((value, index) => { maximum = Math.max(maximum, Math.abs(value - initial[index])); });
        }
        return maximum;
      });
      expect(movement).toBeLessThanOrEqual(0.1);
      await assertPageGeometry(page, width);
      await assertUnclipped(page.locator(".project-item__role, .project-header__role"));
    }
  });
}

if (projects.length) {
  for (const method of ["mouse", "keyboard", "touch"] as const) {
    test(`${caseName}: ${method} opens a text title and activates the normal return`, async ({ browser, baseURL }) => {
      const context = await browser.newContext({ baseURL, hasTouch: method === "touch", viewport: { width: 390, height: 900 } });
      const page = await context.newPage();
      const project = projects[0];
      try {
        await page.goto("/projects");
        await ready(page);
        const activate = async (target: Locator) => {
          if (method === "touch") await target.tap();
          else if (method === "mouse") await target.click();
          else { await tabTo(page, target); await assertVisibleFocus(target); await page.keyboard.press("Enter"); }
        };
        await activate(listLink(page, project.slug));
        await expect(page).toHaveURL(new RegExp(`/projects/${project.slug}/?$`));
        await ready(page);
        await expect(page.locator(".project-header__role")).toHaveText(project.role);
        await activate(page.locator("[data-project-return]").first());
        await expect(page).toHaveURL(/\/projects\/?$/);
        await ready(page);
        await expect(listLink(page, project.slug)).toBeFocused();
        await assertPageGeometry(page, 390);
      } finally { await context.close(); }
    });
  }
}
