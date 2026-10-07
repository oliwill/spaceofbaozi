import { expect, type Locator, type Page, type TestInfo } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { projectsForCase, type ProjectFixtureCase } from "../fixtures/projects/projects";
import { collectProjectTextGeometry, projectTextGeometryIssues } from "../support/project-text-geometry";
import { collectProjectFocus, projectFocusPresentationIssues, projectFocusReadinessIssues } from "../support/project-focus-readiness";

const selected = process.env.PROJECTS_FIXTURE_CASE
  ?? JSON.parse(readFileSync(join(process.cwd(), "projects-evidence/fixture-manifest.json"), "utf8")).caseName;
const cases: ProjectFixtureCase[] = ["empty", "one", "mixed", "work-only", "personal-only"];
if (!cases.includes(selected)) throw new Error(`Unknown Projects fixture case: ${String(selected)}`);
export const caseName = selected as ProjectFixtureCase;
export const projects = projectsForCase(caseName).filter(({ draft, approved }) => !draft && approved)
  .map((project) => {
    if (!project.role || !project.kind) throw new Error(`Incomplete public fixture: ${project.slug}`);
    return { ...project, role: project.role, kind: project.kind };
  }).sort((a, b) => b.date.getTime() - a.date.getTime() || a.slug.localeCompare(b.slug));
export const widths = [360, 390, 767, 768, 1024, 1440] as const;
// images is an asset registry, not an instruction to render a gallery (the gate fixture has only a cover).
export const bodyImages = (project: typeof projects[number]) => project.images.filter(({ src }) => project.body.includes(`src="${src}"`));
export const listLink = (page: Page, slug: string) => page.locator(`[data-project-list] a[data-project-id="${slug}"]`);
export const projectItem = (page: Page, slug: string) => page.locator("[data-project-list] .project-item").filter({ has: page.locator(`a[data-project-id="${slug}"]`) });

export async function ready(page: Page) {
  await expect(page.locator("main#main")).toHaveCount(1);
  await expect(page.locator("main h1")).toBeVisible();
  await expect(page.locator("[data-turn-mask]")).toHaveAttribute("data-phase", "idle");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator("body")).not.toContainText("PRIVATE-PROJECT");
}

export async function assertPageGeometry(page: Page, width: number) {
  await expect.poll(() => page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth))
    .toBeLessThanOrEqual(1);
  const navigation = page.getByRole("navigation", { name: "主要栏目", exact: true });
  await expect(navigation.getByRole("link")).toHaveCount(4);
  const links = navigation.locator("a, .shell-links__inactive");
  await expect(links).toHaveCount(5);
  const rectangles = await links.evaluateAll((elements) => elements.map((element) => {
    const bounds = element.getBoundingClientRect();
    return { x: bounds.x, y: bounds.y, right: bounds.right, width: bounds.width, height: bounds.height };
  }));
  for (const bounds of rectangles) {
    expect(bounds.width).toBeGreaterThanOrEqual(43.99);
    expect(bounds.height).toBeGreaterThanOrEqual(43.99);
    expect(bounds.x).toBeGreaterThanOrEqual(-1);
    expect(bounds.right).toBeLessThanOrEqual(width + 1);
  }
  if (width <= 767) {
    expect(Math.max(...rectangles.map(({ y }) => y)) - Math.min(...rectangles.map(({ y }) => y))).toBeLessThanOrEqual(1);
    for (let index = 1; index < rectangles.length; index++) expect(rectangles[index].x).toBeGreaterThanOrEqual(rectangles[index - 1].right - 1);
  } else {
    const rail = await page.locator(".shell-nav").boundingBox();
    expect(rail!.width).toBeCloseTo(width > 1050 ? 300 : 242, 1);
  }
  // Measure the allocated character region. Transparent sprite-sheet spans deliberately
  // extend outside it, so their full rectangular boxes are not painted silhouettes.
  // Pixel overlap remains part of the Mac screenshot review.
  const overlaps = await page.locator(".site-characters").evaluateAll((elements) => {
    const targets = [...document.querySelectorAll("main#main, .shell-links a, .shell-links__inactive")];
    return elements.flatMap((element) => {
      const a = element.getBoundingClientRect();
      return targets.filter((target) => {
        const b = target.getBoundingClientRect();
        return Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1
          && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
      }).map((target) => `${element.className} overlaps ${target.tagName}.${target.className}`);
    });
  });
  expect(overlaps).toEqual([]);
}

export async function assertUnclipped(locator: Locator) {
  for (const element of await locator.all()) {
    await expect(element).toBeVisible();
    const actual = await element.evaluate(collectProjectTextGeometry);
    expect(projectTextGeometryIssues(actual), JSON.stringify(actual, null, 2)).toEqual([]);
  }
}

export async function assertTargets(locator: Locator) {
  for (const target of await locator.all()) {
    await expect(target).toBeVisible();
    const bounds = await target.boundingBox();
    expect(bounds!.height).toBeGreaterThanOrEqual(43.99);
  }
}

export async function assertList(page: Page, width: number) {
  await expect(page.locator("#project-list-title")).toHaveText("项目");
  await expect(page.locator(".project-item")).toHaveCount(projects.length);
  await expect(page.locator("[data-project-list] button, [data-project-list] input, [data-project-list] select")).toHaveCount(0);
  if (!projects.length) {
    await expect(page.locator(".projects-empty")).toHaveText("项目正在整理。");
    await expect(page.locator("[data-project-list] > *")).toHaveCount(2);
    await expect(page.locator("[data-project-list] ul, [data-project-list] img, [data-project-list] a")).toHaveCount(0);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
    return;
  }
  await expect(page.locator(".projects-empty")).toHaveCount(0);
  await expect(page.locator("[data-project-list] ul")).toHaveCount(1);
  expect(await page.locator("[data-project-list] a[data-project-id]").evaluateAll((elements) => elements.map((element) => element.getAttribute("data-project-id"))))
    .toEqual(projects.map(({ slug }) => slug));
  for (const project of projects) {
    const item = projectItem(page, project.slug);
    await expect(listLink(page, project.slug)).toHaveText(project.title);
    await expect(item.locator(".project-item__intro")).toHaveText(project.intro);
    await expect(item.locator(".project-item__role")).toHaveText(project.role);
    await expect(item.locator(".project-meta > span").first()).toHaveText(project.kind === "work" ? "工作" : "个人");
    await assertUnclipped(item.locator("h2 a, .project-item__intro, .project-item__role"));
    await assertTargets(listLink(page, project.slug));
    if (!project.cover) {
      await expect(item.locator(".project-item__image, .project-image, img")).toHaveCount(0);
      continue;
    }
    const image = item.locator("img");
    await expect(image).toHaveCount(1);
    const expectedImage = project.images.find(({ src }) => src === project.cover)!;
    await expect(image).toHaveAttribute("alt", project.coverAlt ?? expectedImage.alt);
    const bounds = await item.boundingBox(), imageBounds = await image.boundingBox(), textBounds = await item.locator(".project-item__text").boundingBox();
    expect(imageBounds!.width).toBeGreaterThan(0);
    expect(imageBounds!.height).toBeGreaterThan(0);
    expect(imageBounds!.width / imageBounds!.height).toBeCloseTo(expectedImage.width / expectedImage.height, 2);
    if (width >= 768) expect(imageBounds!.width).toBeLessThanOrEqual(bounds!.width / 3 + 1);
    else expect(imageBounds!.y).toBeGreaterThanOrEqual(textBounds!.y + textBounds!.height - 1);
  }
}

export async function assertListTypography(page: Page, width: number) {
  const sizes = await page.evaluate(() => {
    const size = (element: Element) => parseFloat(getComputedStyle(element).fontSize);
    const list = document.querySelector("[data-project-list]")!;
    return {
      root: size(document.documentElement), body: size(document.body), heading: size(list.querySelector("h1")!),
      navigation: [...document.querySelectorAll(".shell-links a, .shell-links__inactive")].map(size),
      navigationNumbers: [...document.querySelectorAll(".shell-links a span, .shell-links__inactive span")].map(size),
      titles: [...list.querySelectorAll(".project-item h2, .project-item h2 a")].map(size),
      descriptions: [...list.querySelectorAll(".project-item__intro, .project-item__role, .project-meta, .project-meta span, .project-image figcaption, .projects-empty")]
        .map((element) => ({ text: element.textContent, size: size(element) })),
      captions: list.querySelectorAll(".project-image figcaption").length,
    };
  });
  const titleSize = Math.min(sizes.root * 2, Math.max(sizes.root * 1.4, width * 0.025));
  const headingSize = Math.min(sizes.root * 3.5, Math.max(sizes.root * 2, width * 0.041));
  expect(sizes.root, "Mac v11 baseline root size").toBe(16);
  expect(sizes.body, "Mac v11 baseline body size").toBe(16);
  expect(sizes.heading, "keep the page h1's original responsive size").toBeCloseTo(headingSize, 2);
  expect(sizes.navigation).toEqual(Array(5).fill(width <= 767 ? 12 : 16));
  expect(sizes.navigationNumbers).toEqual(Array(5).fill(width <= 767 ? 9 : 12));
  expect(sizes.titles).toHaveLength(projects.length * 2);
  for (const size of sizes.titles) expect(size, "all project names use the original title role").toBeCloseTo(titleSize, 2);
  expect(sizes.descriptions.length).toBeGreaterThan(0);
  for (const description of sizes.descriptions) {
    expect(description.size, `body-size text: ${description.text}`).toBe(sizes.body);
  }
  const credits = projects.filter((project) => project.cover && (project.coverCredit ?? project.images.find(({ src }) => src === project.cover)?.credit));
  expect(sizes.captions).toBe(credits.length);
}

export async function assertTextContrast(page: Page) {
  const failures = await page.locator("main#main, .shell-links").evaluateAll((roots) => {
    const rgba = (value: string) => {
      const numbers = value.match(/[\d.]+/g)?.map(Number);
      if (!numbers || numbers.length < 3) throw new Error(`Unsupported computed color: ${value}`);
      return [numbers[0], numbers[1], numbers[2], numbers[3] ?? 1];
    };
    const composite = (front: number[], back: number[]) => front.slice(0, 3).map((value, index) => value * front[3] + back[index] * (1 - front[3])).concat(1);
    const luminance = (color: number[]) => color.slice(0, 3).map((value) => {
      const channel = value / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
    const result: Array<{ text: string; contrast: number; required: number }> = [];
    for (const root of roots) {
      for (const element of [root, ...root.querySelectorAll("*")]) {
        const text = [...element.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.textContent).join("").trim();
        if (!text || element.closest('[aria-hidden="true"], script, style') || !element.getClientRects().length) continue;
        const style = getComputedStyle(element);
        if (style.visibility !== "visible" || Number(style.opacity) === 0) continue;
        const ancestors: Element[] = [];
        for (let parent: Element | null = element; parent; parent = parent.parentElement) ancestors.unshift(parent);
        let background = [255, 255, 255, 1];
        for (const parent of ancestors) background = composite(rgba(getComputedStyle(parent).backgroundColor), background);
        const foreground = composite(rgba(style.color), background);
        const a = luminance(foreground), b = luminance(background), contrast = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        const size = parseFloat(style.fontSize), weight = Number(style.fontWeight);
        const required = size >= 24 || (size >= 18.6667 && weight >= 700) ? 3 : 4.5;
        if (contrast + 0.001 < required) result.push({ text: text.slice(0, 100), contrast, required });
      }
    }
    return result;
  });
  expect(failures, "visible ordinary text ≥4.5:1; large text ≥3:1").toEqual([]);
}

export async function tabTo(page: Page, target: Locator) {
  const limit = await page.locator('a[href], button, input, select, textarea, [tabindex="0"]').count() + 2;
  for (let index = 0; index < limit && !(await target.evaluate((element) => element === document.activeElement)); index++) await page.keyboard.press("Tab");
  await expect(target).toBeFocused();
}

export async function assertVisibleFocus(target: Locator) {
  await expect.poll(async () => projectFocusReadinessIssues(await target.evaluate(collectProjectFocus)), {
    message: "navigation and focus-related animations must settle before measuring focus",
  }).toEqual([]);
  const focus = await target.evaluate(collectProjectFocus);
  expect(projectFocusReadinessIssues(focus), "focus sample must still be settled").toEqual([]);
  expect(focus.focused, "target must retain actual focus").toBe(true);
  expect(focus.focusVisible, "target must retain keyboard-visible focus").toBe(true);
  expect(projectFocusPresentationIssues(focus.containers), "target and ancestors must be fully revealed").toEqual([]);
  expect(focus.style).not.toBe("none");
  expect(focus.width).toBeGreaterThanOrEqual(2);
  expect(focus.color).not.toBe("rgba(0, 0, 0, 0)");
  expect(focus.contrast, "focus outline contrast").toBeGreaterThanOrEqual(3);
  expect(focus.inViewport, "complete focus outline must be in the viewport").toBe(true);
  expect(focus.unobscured, "focused target must be unobscured").toBe(true);
}

export async function reviewPicture(page: Page, testInfo: TestInfo, name: string) {
  const path = testInfo.outputPath(`${caseName}-${name}.png`);
  await page.screenshot({ path, fullPage: true });
  await testInfo.attach(`SYNTHETIC ${caseName} ${name}`, { path, contentType: "image/png" });
}
