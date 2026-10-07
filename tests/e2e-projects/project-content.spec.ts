import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { projectsForCase, type ProjectFixtureCase } from "../fixtures/projects/projects";

// 云端浏览器受阻；这些真实浏览器断言待在线 Mac 对冻结源码运行。
const caseName = (process.env.PROJECTS_FIXTURE_CASE ?? JSON.parse(readFileSync(join(process.cwd(), "projects-evidence/fixture-manifest.json"), "utf8")).caseName) as ProjectFixtureCase;
const projects = projectsForCase(caseName).filter(({ draft, approved }) => !draft && approved)
  .map((project) => {
    if (!project.role || !project.kind) throw new Error("公开夹具缺少角色或类型");
    return { ...project, role: project.role, kind: project.kind };
  })
  .sort((a, b) => b.date.getTime() - a.date.getTime() || a.slug.localeCompare(b.slug));

test("empty keeps only the concise message and normal navigation", async ({ page }) => {
  test.skip(projects.length !== 0, "empty fixture only");
  await page.goto("/projects");
  await expect(page.locator("#project-list-title")).toHaveText("项目");
  await expect(page.locator(".projects-empty")).toHaveText("项目正在整理。");
  await expect(page.locator("[data-project-list]")).toHaveText("项目 项目正在整理。");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
  await expect(page.locator("[data-project-list] ul, [data-project-id], #main img")).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "主要栏目" }).getByRole("link")).toHaveCount(4);
  await expect(page.locator("body")).not.toContainText("PRIVATE-PROJECT");
});

test.describe("public text-first projects", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(projects.length === 0, "public fixture required");
    await page.goto("/projects");
  });

  test("uses title, intro, role and confirmed metadata in DOM order", async ({ page }) => {
    await expect(page.locator("#project-list-title")).toHaveText("项目");
    const items = page.locator("[data-project-list] > ul > li");
    await expect(items).toHaveCount(projects.length);
    const first = items.first();
    await expect(first.getByRole("link", { name: projects[0].title, exact: true })).toHaveAttribute("data-project-id", projects[0].slug);
    expect(await first.locator("h2, .project-item__intro, .project-item__role, .project-meta").allTextContents())
      .toEqual([projects[0].title, projects[0].intro, projects[0].role, expect.stringContaining(projects[0].kind === "work" ? "工作" : "个人")]);
    await expect(page.getByRole("link", { name: "查看项目 →", exact: true })).toHaveCount(0);
    for (const project of projects) {
      const item = items.filter({ has: page.locator(`[data-project-id="${project.slug}"]`) });
      await expect(item.locator(".project-item__role")).toBeVisible();
      await expect(item.getByRole("link")).toHaveCount(1);
      if (!project.cover) await expect(item.locator("img, .project-image, .project-item__image")).toHaveCount(0);
    }
    await expect(page.locator("[data-project-list] time")).toHaveCount(0);
  });

  test("keeps direct detail SEO and personal responsibility before real Markdown", async ({ page }) => {
    for (const project of projects) {
      await page.goto(`/projects/${project.slug}`);
      await expect(page).toHaveTitle(`${project.title} · 项目 · baozi.space`);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", project.intro);
      await expect(page.locator('meta[property="og:description"]')).toHaveAttribute("content", project.intro);
      const article = page.locator(`[data-project-detail][data-project-id="${project.slug}"]`);
      await expect(article.locator(".project-header__role")).toHaveText(project.role);
      expect(await article.evaluate((element) => {
        const role = element.querySelector(".project-header__role");
        const body = element.querySelector(".editorial-prose");
        return !!role && !!body && !!(role.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_FOLLOWING);
      })).toBe(true);
      await expect(article.locator(".editorial-prose h2").filter({ hasText: "问题" })).toHaveCount(1);
      await expect(article.locator(".editorial-prose h2").filter({ hasText: "我的贡献" })).toHaveCount(1);
      await expect(article.locator("[data-project-return]")).toHaveCount(2);
      for (const link of await article.locator("[data-project-return]").all()) await expect(link).toHaveAttribute("href", "/projects");
      await expect(page.locator("[data-reading-progress], [data-reading-toc], .article-comments, .home-orbit, [data-album-characters]")).toHaveCount(0);
      await expect(article.locator(".project-header img")).toHaveCount(0);
      if (!project.images.length) await expect(article.locator("img")).toHaveCount(0);
      if (!project.link) await expect(article.locator(".project-footer__external")).toHaveCount(0);
      else await expect(article.locator(".project-footer__external")).toHaveText(project.linkLabel ?? "访问项目");
      for (const heading of ["结果", "反思"]) {
        if (!project.body.includes(`## ${heading}`)) await expect(article.getByRole("heading", { name: heading, exact: true })).toHaveCount(0);
      }
      await expect(page.locator("body")).not.toContainText("PRIVATE-PROJECT");
    }
  });

  for (const width of [1440, 390]) {
    test(`records list and detail review pictures at ${width}px`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.screenshot({ path: testInfo.outputPath(`projects-list-${caseName}-${width}.png`), fullPage: true });
      await page.goto(`/projects/${projects[0].slug}`);
      await page.screenshot({ path: testInfo.outputPath(`projects-detail-${caseName}-${width}.png`), fullPage: true });
    });
  }
});
