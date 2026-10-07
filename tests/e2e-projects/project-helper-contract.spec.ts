import { expect, test } from "@playwright/test";
import { assertUnclipped, listLink, projectItem } from "./project-test-helpers";
import { collectProjectTextGeometry, projectTextGeometryIssues } from "../support/project-text-geometry";

const shell = (content: string, styles = "") => `<!doctype html><html><head><style>
  * { box-sizing: border-box; } body { margin: 0; } main { width: 320px; padding: 20px; }
  p { margin: 0; font: 24px/30px sans-serif; } ${styles}
</style></head><body><main>${content}</main></body></html>`;
const role = "负责需求研究、信息架构、原型设计、实现验收与协作交付。".repeat(8) + "最后一句职责不得截断。";

test("helper contract: projectItem resolves relative has scopes and excludes outside-list lookalikes", async ({ page }) => {
  await page.setContent(shell(`<div class="project-item"><a data-project-id="alpha">外部同名链接</a><p class="project-item__role">错误职责</p></div>
    <section data-project-list><ul>
      <li class="project-item"><h2><a data-project-id="alpha" href="/projects/alpha">甲项目</a></h2><p class="project-item__intro">甲简介</p><p class="project-item__role">甲完整职责</p></li>
      <li class="project-item"><h2><a data-project-id="beta" href="/projects/beta">乙项目</a></h2><p class="project-item__intro">乙简介</p><p class="project-item__role">乙完整职责</p></li>
    </ul></section>`));
  for (const [slug, title, intro, fullRole] of [["alpha", "甲项目", "甲简介", "甲完整职责"], ["beta", "乙项目", "乙简介", "乙完整职责"]]) {
    const item = projectItem(page, slug);
    await expect(item).toHaveCount(1);
    await expect(listLink(page, slug)).toHaveText(title);
    await expect(listLink(page, slug)).toHaveAttribute("href", `/projects/${slug}`);
    await expect(item.locator(".project-item__intro")).toHaveText(intro);
    await expect(item.locator(".project-item__role")).toHaveText(fullRole);
  }
  await expect(projectItem(page, "missing")).toHaveCount(0);
});

test("helper contract: visible overflowing text is not rejected solely by scroll metrics", async ({ page }) => {
  await page.setContent(shell('<p id="subject">完整职责</p>', "#subject { height: 16px; overflow: visible; }"));
  const subject = page.locator("#subject");
  const actual = await subject.evaluate(collectProjectTextGeometry);
  expect(actual.scrollHeight - actual.clientHeight).toBeGreaterThan(5);
  expect(actual.fragments.flatMap(({ rects }) => rects).some((bounds) => bounds.bottom > actual.bounds.bottom + 1)).toBe(true);
  await assertUnclipped(subject);
});

test("helper contract: below-fold text stays reachable through the document scroller", async ({ page }) => {
  await page.setContent(shell('<div style="height: 1200px"></div><p id="subject">下方完整职责</p>', "html { height: 100%; overflow-y: scroll; }"));
  const subject = page.locator("#subject");
  const initial = await subject.evaluate(collectProjectTextGeometry);
  expect(initial.bounds.top).toBeGreaterThan(await page.evaluate(() => innerHeight));
  expect(initial.containers.some((container) => container.documentScroller && container.overflowY === "scroll")).toBe(true);
  await assertUnclipped(subject);
  await subject.scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => scrollY)).toBeGreaterThan(0);
  const reached = await subject.boundingBox();
  expect(reached!.y).toBeGreaterThanOrEqual(0);
  expect(reached!.y + reached!.height).toBeLessThanOrEqual(await page.evaluate(() => innerHeight));
  await expect(subject).toHaveText("下方完整职责");
  await assertUnclipped(subject);
});

const negativeCases = [
  { name: "hidden document scroller", markup: '<div style="height: 1200px"></div><p id="subject">下方完整职责</p>', css: "html { height: 100%; overflow: hidden; }", issue: "html: clipped-y", text: "下方完整职责" },
  { name: "self hidden", markup: '<p id="subject">完整职责</p>', css: "#subject { height: 14px; overflow: hidden; }", issue: "clipped-y", text: "完整职责" },
  { name: "self clip", markup: '<p id="subject">完整职责</p>', css: "#subject { height: 14px; overflow: clip; }", issue: "clipped-y", text: "完整职责" },
  { name: "ancestor hidden", markup: `<div id="wrapper"><p id="subject">${role}</p></div>`, css: "#wrapper { height: 36px; overflow: hidden; }", issue: "div#wrapper: clipped-y", text: role },
  { name: "ancestor clip", markup: `<div id="wrapper"><p id="subject">${role}</p></div>`, css: "#wrapper { height: 36px; overflow: clip; }", issue: "div#wrapper: clipped-y", text: role },
  { name: "horizontal clip", markup: '<p id="subject">UNBROKENRESPONSIBILITY</p>', css: "#subject { width: 30px; overflow: hidden; }", issue: "clipped-x", text: "UNBROKENRESPONSIBILITY" },
  { name: "line clamp", markup: `<p id="subject">${role}</p>`, css: "#subject { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 1; overflow: hidden; }", issue: "line-clamp", text: role },
  { name: "ellipsis", markup: `<p id="subject">${role}</p>`, css: "#subject { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }", issue: "ellipsis", text: role },
  { name: "text outside main", markup: '<p id="subject"><span>完整职责</span></p>', css: "#subject span { position: relative; left: 300px; }", issue: "text-outside-main", text: "完整职责" },
  { name: "long role final span", markup: `<div id="wrapper"><p id="subject">${role}<span>职责末尾必须完整呈现。</span></p></div>`, css: "#wrapper { max-height: 60px; overflow: hidden; }", issue: "div#wrapper: clipped-y: 职责末尾必须完整呈现。", text: role + "职责末尾必须完整呈现。" },
  { name: "hidden final span", markup: '<p id="subject">职责前半句<span>职责后半句</span></p>', css: "#subject span { display: none; }", issue: "hidden-text", text: "职责前半句职责后半句" },
];
for (const sample of negativeCases) {
  test(`helper contract: rejects ${sample.name} without dropping complete text assertions`, async ({ page }) => {
    await page.setContent(shell(sample.markup, sample.css));
    const subject = page.locator("#subject");
    const actual = await subject.evaluate(collectProjectTextGeometry);
    await expect(subject).toHaveText(sample.text);
    expect(projectTextGeometryIssues(actual).join("\n")).toContain(sample.issue);
    await expect(assertUnclipped(subject)).rejects.toThrow();
  });
}
