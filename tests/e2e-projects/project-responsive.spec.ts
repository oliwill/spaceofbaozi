import { expect, test } from "@playwright/test";
import { assertList, assertListTypography, assertPageGeometry, assertTargets, assertTextContrast, assertUnclipped, assertVisibleFocus, bodyImages, caseName, listLink, projects, ready, reviewPicture, tabTo, widths } from "./project-test-helpers";

// Browser assertions are intentionally active. --list proves loading only; Mac execution is still required.
for (const width of widths) {
  test(`${caseName}: ${width}px list keeps text, navigation, image hierarchy and page bounds`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/projects");
    await ready(page);
    await assertPageGeometry(page, width);
    await assertList(page, width);
    await assertListTypography(page, width);
    await assertTextContrast(page);
    await reviewPicture(page, testInfo, `list-${width}`);
  });

  for (const project of projects) {
    test(`${caseName}: ${width}px detail ${project.slug} keeps full text and locally scrolling wide content`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/projects/${project.slug}`);
      await ready(page);
      await assertPageGeometry(page, width);
      await expect(page.locator(".project-header h1")).toHaveText(project.title);
      await expect(page.locator(".project-header__role")).toHaveText(project.role);
      await expect(page.locator(".project-header__intro")).toHaveText(project.intro);
      await expect(page.locator(".project-header .project-meta > span").first()).toHaveText(project.kind === "work" ? "工作" : "个人");
      await assertUnclipped(page.locator(".project-header h1, .project-header__intro, .project-header__role"));
      await assertTargets(page.locator("[data-project-return], .project-footer__external"));
      await expect(page.locator("[data-project-return]")).toHaveCount(2);
      if (project.link) {
        await expect(page.locator(".project-footer__external")).toHaveAttribute("href", project.link);
        await expect(page.locator(".project-footer__external")).toHaveAttribute("rel", "noopener noreferrer");
      } else await expect(page.locator(".project-footer__external")).toHaveCount(0);
      await expect(page.locator(".editorial-prose img")).toHaveCount(bodyImages(project).length);
      for (const image of bodyImages(project)) {
        const rendered = page.locator(`.editorial-prose img[src="${image.src}"]`);
        await expect(rendered).toHaveAttribute("alt", image.alt);
        const bounds = await rendered.boundingBox(), paper = await page.locator("main").boundingBox();
        expect(bounds!.width).toBeGreaterThan(0);
        expect(bounds!.width / bounds!.height).toBeCloseTo(image.width / image.height, 2);
        expect(bounds!.x).toBeGreaterThanOrEqual(paper!.x - 1);
        expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(paper!.x + paper!.width + 1);
        const figure = await rendered.evaluate((element) => {
          const container = element.closest("figure")!, prose = element.closest(".editorial-prose")!;
          const style = getComputedStyle(container), bounds = container.getBoundingClientRect(), parent = prose.getBoundingClientRect();
          return { left: parseFloat(style.marginLeft), right: parseFloat(style.marginRight), x: bounds.x, width: bounds.width, proseX: parent.x, proseWidth: parent.width };
        });
        expect(figure.left, "Mac v11 RED: default figure inset was 40px on each side").toBe(0);
        expect(figure.right).toBe(0);
        expect(Math.abs(figure.x - figure.proseX)).toBeLessThanOrEqual(1);
        expect(Math.abs(figure.width - figure.proseWidth)).toBeLessThanOrEqual(1);
        if (image.width >= figure.proseWidth) expect(Math.abs(bounds!.width - figure.proseWidth)).toBeLessThanOrEqual(1);
      }
      if (project.slug === "synthetic-personal-wide") {
        await expect(page.locator(".editorial-prose table")).toHaveCount(1);
        await expect(page.locator(".editorial-prose pre")).toHaveCount(1);
        await expect(page.locator(".editorial-prose table")).toContainText("SYNTHETIC-UNBROKEN-CELL".repeat(12));
        await expect(page.locator(".editorial-prose pre")).toContainText("SYNTHETIC-NO-WRAP-".repeat(25));
        const cells = await page.locator(".editorial-prose th, .editorial-prose td").evaluateAll((elements) => elements.map((element) => {
          const bounds = element.getBoundingClientRect(), style = getComputedStyle(element);
          return { width: bounds.width, header: element.tagName === "TH", height: bounds.height, lineHeight: parseFloat(style.lineHeight) };
        }));
        for (const cell of cells) {
          expect(cell.width, "Mac v11 RED: narrow columns forced Chinese headers into single-character rows").toBeGreaterThanOrEqual(127.99);
          if (cell.header) expect(cell.height).toBeLessThanOrEqual(cell.lineHeight * 2 + 1);
        }
        for (const scrollable of await page.locator(".editorial-prose table, .editorial-prose pre").all()) {
          const actual = await scrollable.evaluate((element) => {
            const style = getComputedStyle(element), bounds = element.getBoundingClientRect(), prose = element.closest(".editorial-prose")!.getBoundingClientRect();
            const maximum = element.scrollWidth - element.clientWidth;
            element.scrollLeft = maximum;
            return { overflow: style.overflowX, maximum, reached: element.scrollLeft, width: bounds.width, proseWidth: prose.width };
          });
          expect(["auto", "scroll"]).toContain(actual.overflow);
          expect(actual.maximum).toBeGreaterThan(1);
          expect(actual.reached).toBeGreaterThan(1);
          expect(Math.abs(actual.maximum - actual.reached)).toBeLessThanOrEqual(1);
          expect(actual.width).toBeLessThanOrEqual(actual.proseWidth + 1);
          await scrollable.evaluate((element) => { element.scrollLeft = 0; });
        }
        await assertUnclipped(page.locator('.editorial-prose p > a[href^="https://example.com/synthetic/"]'));
      }
      await assertTextContrast(page);
      await reviewPicture(page, testInfo, `detail-${project.slug}-${width}`);
    });
  }
}

test(`${caseName}: Tab reveals all four navigation focus outlines`, async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/projects");
  await ready(page);
  for (const link of await page.getByRole("navigation", { name: "主要栏目", exact: true }).getByRole("link").all()) {
    await tabTo(page, link);
    await assertVisibleFocus(link);
  }
});

if (projects.length) {
  const selected = projects.find(({ slug }) => slug === "synthetic-personal-long") ?? projects[0];
  test(`${caseName}: 767 ↔ 768 reflow retains the focused complete project and detail return`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 767, height: 900 });
    await page.goto("/projects");
    await ready(page);
    const link = listLink(page, selected.slug);
    await tabTo(page, link);
    for (const width of [767, 768, 767]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(link).toBeFocused();
      await assertPageGeometry(page, width);
      await assertList(page, width);
      await assertUnclipped(link);
      await assertVisibleFocus(link);
    }
    await reviewPicture(page, testInfo, "list-reflow-focus-767");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`/projects/${selected.slug}/?$`));
    await ready(page);
    await page.keyboard.press("Tab");
    await tabTo(page, page.locator("[data-project-return]").first());
    for (const width of [768, 767, 768]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.locator("[data-project-return]").first()).toBeFocused();
      await assertVisibleFocus(page.locator("[data-project-return]").first());
      await assertPageGeometry(page, width);
      await assertUnclipped(page.locator(".project-header h1, .project-header__role"));
    }
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/projects\/?$/);
    await ready(page);
    await expect(listLink(page, selected.slug)).toBeFocused();
  });
}

// Native 200% page zoom needs the Mac's browser UI and fixed-window measurements.
// No deviceScaleFactor, reduced viewport, or CSS zoom is accepted as evidence here.

// Independent Tab paths: the footer targets cannot borrow the top-return test's focus claim.
for (const project of projects) {
  for (const width of [390, 1440]) {
    test(`${caseName}: ${width}px ${project.slug} footer return is independently Tab reachable with visible focus from unknown source`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/projects/${project.slug}`);
      await ready(page);
      expect(await page.evaluate(() => history.state?.baoziProjects?.list ?? null)).toBeNull();
      const footerReturn = page.locator(".project-footer [data-project-return]");
      await tabTo(page, footerReturn);
      await assertVisibleFocus(footerReturn);
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(/\/projects\/?$/);
      await ready(page);
      await assertList(page, width);
    });
    if (project.link) {
      test(`${caseName}: ${width}px ${project.slug} footer external is independently Tab reachable with visible focus`, async ({ page }) => {
        const externalRequests: string[] = [];
        page.on("request", (request) => { if (new URL(request.url()).hostname === "example.com") externalRequests.push(request.url()); });
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`/projects/${project.slug}`);
        await ready(page);
        const external = page.locator(".project-footer__external");
        await expect(external).toHaveAttribute("href", project.link!);
        await expect(external).toHaveAttribute("target", "_blank");
        await expect(external).toHaveAttribute("rel", "noopener noreferrer");
        await tabTo(page, external);
        await assertVisibleFocus(external);
        // Do not press Enter or open the third-party site.
        expect(externalRequests).toEqual([]);
        await expect(page).toHaveURL(new RegExp(`/projects/${project.slug}/?$`));
      });
    }
  }
}
