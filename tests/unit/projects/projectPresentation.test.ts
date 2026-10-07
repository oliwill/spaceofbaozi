import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { compileAstro } from "../../support/astro-component";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import type { PublicProject } from "@/lib/projects/projects";

const project: PublicProject = {
  id: "approved-project", href: "/projects/approved-project", title: "已批准的项目名称",
  intro: "已批准的一句话简介。", role: "我负责信息结构与页面实现。", kind: "work",
  date: new Date("2026-09-25"), periodLabel: "2025–2026", status: "completed", images: [],
};
const componentRoot = join(process.cwd(), "src/components/projects");
async function render(name: string, props: Record<string, unknown>) {
  try {
    const compiled = await compileAstro(join(componentRoot, name));
    const component = await import(/* @vite-ignore */ compiled.url);
    const container = await AstroContainer.create();
    return container.renderToString(component.default, { props });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return "";
    throw error;
  }
}
const compact = (html: string) => html.replace(/\s+/g, " ");

describe("Projects real Astro server rendering", () => {
  it("renders a single primary title link with intro, role and metadata in order", async () => {
    const html = compact(await render("ProjectList.astro", { projects: [project] }));
    expect(html).toContain("data-project-list");
    expect(html).toContain('data-project-id="approved-project"');
    expect(html).toMatch(/<h2[^>]*>.*已批准的项目名称.*<\/h2>.*已批准的一句话简介。.*我负责信息结构与页面实现。.*工作.*2025–2026.*已完成/);
    expect(html.match(/href="\/projects\/approved-project"/g)).toHaveLength(1);
    expect(html).not.toMatch(/查看项目|2026\/9\/25|<time|<img|project-image/);
  });
  it("renders work and personal at the same list level without requiring optional metadata", async () => {
    const personal = { ...project, id: "personal", href: "/projects/personal", kind: "personal", periodLabel: undefined, status: undefined };
    const html = await render("ProjectList.astro", { projects: [project, personal] });
    expect(html.match(/<li\b/g)).toHaveLength(2);
    expect(html).toContain("工作");
    expect(html).toContain("个人");
    expect(html.match(/已完成/g)).toHaveLength(1);
    expect(html.match(/2025–2026/g)).toHaveLength(1);
    expect(html).not.toMatch(/undefined|<script/);
  });
  it("renders an approved cover after the text with real image dimensions and alt", async () => {
    const cover = { src: "/assets/projects/example.png", width: 960, height: 640, alt: "已批准的界面结构截图" };
    const html = await render("ProjectList.astro", { projects: [{ ...project, cover, images: [cover] }] });
    expect(html).toMatch(/我负责信息结构与页面实现。[^]*<img/);
    expect(html).toContain('width="960"');
    expect(html).toContain('height="640"');
    expect(html).toContain(`alt="${cover.alt}"`);
    expect(html).toContain('loading="lazy"');
  });
  it("keeps the semantic page title and concise empty message without list slots or instructions", async () => {
    const html = await render("ProjectList.astro", { projects: [] });
    expect(html).toMatch(/<h1[^>]*id="project-list-title"[^>]*tabindex="-1"[^>]*>项目<\/h1>/);
    expect(html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()).toBe("项目 项目正在整理。");
    expect(html).not.toMatch(/<ul|<li|<img|<h[2-6]|第一批|草稿|挑一个/);
  });
  it("puts return, name, intro and role before optional detail metadata", async () => {
    const html = compact(await render("ProjectHeader.astro", { project }));
    expect(html).toMatch(/data-project-return[^>]*>.*返回项目.*<h1[^>]*>已批准的项目名称<\/h1>.*已批准的一句话简介。.*我负责信息结构与页面实现。.*工作.*2025–2026.*已完成/);
    expect(html).toContain('href="/projects"');
    expect(html).not.toMatch(/<time|<img|<script|Projects ·|结果|反思/);
  });
  it("does not infer a delivery period or force a detail cover from date", async () => {
    const html = await render("ProjectHeader.astro", { project: { ...project, kind: "personal", status: "ongoing", periodLabel: undefined } });
    expect(html).toContain("个人");
    expect(html).toContain("进行中");
    expect(html).not.toMatch(/2026|<time|<img/);
  });
});
