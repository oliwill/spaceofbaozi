import { describe, expect, it } from "vitest";
import { selectPublicProjects, type ProjectSource } from "@/lib/projects/projects";
import type { ProjectData } from "@/lib/projects/schema";

const image = {
  src: "/assets/projects/fixture/overview.webp",
  width: 1200,
  height: 800,
  alt: "合成测试页面的导航和正文区域",
  credit: "合成测试材料",
  variants: [{ src: "/assets/projects/fixture/overview-small.webp", width: 600, height: 400 }],
};
const entry = (id: string, changes: Partial<ProjectData> = {}) => ({
  id,
  data: {
    title: `测试项目 ${id}`,
    intro: "测试内容契约的合成条目。",
    date: new Date("2026-09-01"),
    draft: false,
    approved: true,
    role: "我负责说明测试范围。",
    kind: "personal" as const,
    images: [],
    ...changes,
  },
  body: "只供构建期详情渲染的正文",
});

describe("Projects schema and projection", () => {
  it("keeps only the false/true publication-gate combination", () => {
    const entries = [
      entry("draft-approved", { draft: true, approved: true }),
      entry("draft-unapproved", { draft: true, approved: false }),
      entry("public", { draft: false, approved: true }),
      entry("unapproved", { draft: false, approved: false }),
    ];
    expect(selectPublicProjects(entries).map(({ project }) => project.id)).toEqual(["public"]);
  });

  it.each(["ongoing", "completed", undefined] as const)("does not let status %s change the gate", (status) => {
    const entries = [
      entry("draft", { status, draft: true }),
      entry("unapproved", { status, approved: false }),
      entry("public", { status }),
    ];
    expect(selectPublicProjects(entries).map(({ project }) => project.id)).toEqual(["public"]);
  });

  it("sorts by record date then id without mutating source order", () => {
    const entries = [
      entry("z-same-date"),
      entry("older", { date: new Date("2026-08-01"), status: "ongoing" }),
      entry("a-same-date"),
      entry("newest", { date: new Date("2026-10-01"), updated: new Date("2026-10-02") }),
    ];
    const original = [...entries];
    expect(selectPublicProjects(entries).map(({ project }) => project.id)).toEqual([
      "newest", "a-same-date", "z-same-date", "older",
    ]);
    expect(entries).toEqual(original);
  });

  it("keeps the existing id-based href when a title changes", () => {
    const [before] = selectPublicProjects([entry("existing-slug")]);
    const [after] = selectPublicProjects([entry("existing-slug", { title: "新的项目名称" })]);
    expect(before.project.href).toBe("/projects/existing-slug");
    expect(after.project.href).toBe(before.project.href);
    expect(after.project.title).toBe("新的项目名称");
  });

  it("does not infer a period or other absent optional blocks", () => {
    const [result] = selectPublicProjects([entry("minimal")]);
    for (const field of ["periodLabel", "status", "link", "linkLabel", "cover"]) {
      expect(result.project).not.toHaveProperty(field);
    }
    expect(result.project.images).toEqual([]);
  });

  it("preserves an explicitly confirmed period and optional status", () => {
    const [result] = selectPublicProjects([entry("period", { periodLabel: "2025–2026", status: "completed" })]);
    expect(result.project).toMatchObject({ periodLabel: "2025–2026", status: "completed" });
  });

  it("uses the existing external-link fallback only when a link exists", () => {
    const [result] = selectPublicProjects([entry("linked", { link: "https://example.com/project" })]);
    expect(result.project).toMatchObject({ link: "https://example.com/project", linkLabel: "访问项目" });
    expect(selectPublicProjects([entry("unlinked", { linkLabel: "查看代码" })])[0].project).not.toHaveProperty("linkLabel");
  });

  it("preserves an explicit code-link label", () => {
    expect(selectPublicProjects([entry("code", { link: "https://example.com/code", linkLabel: "查看代码" })])[0].project.linkLabel).toBe("查看代码");
  });

  it("projects only the public contract while pairing the original entry for render", () => {
    const source = entry("minimal");
    const [result] = selectPublicProjects([source]);
    expect(result.entry).toBe(source);
    expect(result.entry.body).toBe("只供构建期详情渲染的正文");
    expect(Object.keys(result.project).sort()).toEqual([
      "id", "href", "title", "intro", "role", "kind", "date", "images",
    ].sort());
    expect(JSON.stringify(result.project)).not.toMatch(/body|approved|draft|updated|只供构建期/);
  });

  it("copies image metadata and uses explicit cover text overrides", () => {
    const source = entry("covered", {
      images: [image], cover: image.src,
      coverAlt: "经过确认的合成封面说明", coverCredit: "经过确认的来源",
    });
    const [result] = selectPublicProjects([source]);
    expect(result.project.cover).toEqual({ ...image, alt: "经过确认的合成封面说明", credit: "经过确认的来源" });
    expect(result.project.images).toEqual([image]);
    expect(result.project.images).not.toBe(source.data.images);
    expect(result.project.images[0]).not.toBe(image);
    expect(result.project.images[0].variants).not.toBe(image.variants);
    expect(source.data.images[0].alt).toBe(image.alt);
  });

  it.each([
    { role: undefined }, { kind: undefined }, { role: " " },
    { intro: " " }, { kind: "unknown" },
    { cover: image.src }, { link: "javascript:alert(1)" },
  ])("throws for an invalid public contract instead of silently skipping it: %j", (change) => {
    const source = entry("invalid", change as Partial<ProjectData>);
    expect(() => selectPublicProjects([source])).toThrow();
  });

  it("filters private records before validating their public contract", () => {
    const source = { id: "private", data: { draft: true, approved: false } } as ProjectSource;
    expect(selectPublicProjects([source])).toEqual([]);
  });
});
