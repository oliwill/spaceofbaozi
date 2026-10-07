import { describe, expect, it } from "vitest";
import { projectImageSchema, projectSchema } from "@/lib/projects/schema";

const legacyDraft = {
  title: "旧项目草稿",
  intro: "作者仍在整理材料。",
  date: "2026-09-01",
  draft: true,
  approved: false,
};
const publicRecord = {
  ...legacyDraft,
  draft: false,
  approved: true,
  role: "我负责整理需求和界面实现。",
  kind: "personal",
};
const image = {
  src: "/assets/projects/fixture/overview.webp",
  width: 1200,
  height: 800,
  alt: "合成测试页面的导航和正文区域",
};

describe("Projects schema and projection", () => {
  it("accepts legacy drafts without inventing a role or kind", () => {
    expect(projectSchema.safeParse(legacyDraft).success).toBe(true);
    const data = projectSchema.parse(legacyDraft);
    expect(data).not.toHaveProperty("role");
    expect(data).not.toHaveProperty("kind");
    expect(data.images).toEqual([]);
  });

  it("preserves the original unapproved non-draft defaults", () => {
    const { draft: _draft, approved: _approved, ...record } = legacyDraft;
    expect(projectSchema.parse(record)).toMatchObject({ draft: false, approved: false });
  });

  it.each(["role", "kind"])("requires %s on public projects", (field) => {
    const record: Record<string, unknown> = { ...publicRecord };
    delete record[field];
    expect(projectSchema.safeParse(record).success).toBe(false);
  });

  it.each(["title", "intro", "role", "periodLabel"])("rejects blank %s", (field) => {
    expect(projectSchema.safeParse({ ...publicRecord, [field]: " \n " }).success).toBe(false);
  });

  it.each(["work", "personal"])("accepts the %s project kind", (kind) => {
    expect(projectSchema.safeParse({ ...publicRecord, kind }).success).toBe(true);
  });

  it("preserves the confirmed wording of non-empty text fields", () => {
    const record = {
      ...publicRecord,
      title: " 原有项目名称 ",
      intro: " 原有一句话说明 ",
      role: " 我负责已经确认的范围。 ",
      periodLabel: " 2025–2026 ",
    };
    const data = projectSchema.parse(record);
    for (const field of ["title", "intro", "role", "periodLabel"] as const) {
      expect(data[field]).toBe(record[field]);
    }
  });

  it("rejects unknown kinds and statuses", () => {
    expect(projectSchema.safeParse({ ...publicRecord, kind: "team" }).success).toBe(false);
    expect(projectSchema.safeParse({ ...publicRecord, status: "featured" }).success).toBe(false);
  });

  it.each(["ongoing", "completed", undefined])("accepts optional status %s", (status) => {
    expect(projectSchema.safeParse({ ...publicRecord, status }).success).toBe(true);
  });

  it.each(["javascript:alert(1)", "data:text/html,example", "ftp://example.com/project", "not a URL"])(
    "rejects unsafe or invalid link %s", (link) => {
      expect(projectSchema.safeParse({ ...publicRecord, link }).success).toBe(false);
    },
  );

  it.each(["https://example.com/project", "http://example.com/project"])("accepts web link %s", (link) => {
    expect(projectSchema.safeParse({ ...publicRecord, link }).success).toBe(true);
  });

  it.each(["访问项目", "查看代码"])("accepts approved external-link label %s", (linkLabel) => {
    expect(projectSchema.safeParse({ ...publicRecord, linkLabel }).success).toBe(true);
  });

  it("rejects an unsupported external-link label", () => {
    expect(projectSchema.safeParse({ ...publicRecord, linkLabel: "立即购买" }).success).toBe(false);
  });

  it.each([
    "/assets/projects/../private.png",
    "/assets/projects/%2e%2e/private.png",
    "/assets/projects/fixture/%2Fprivate.png",
    "/assets/projects/fixture/overview.webp?tracking=x",
    "/assets/projects/fixture/overview.webp#fragment",
    "https://example.com/overview.webp",
    "/assets/photos/overview.webp",
    "/assets/projects/overview.svg",
    "/assets/projects/fixture//overview.webp",
  ])("rejects unsafe project image path %s", (src) => {
    expect(projectImageSchema.safeParse({ ...image, src }).success).toBe(false);
  });

  it.each([{ width: 0 }, { height: -1 }, { width: 1.5 }, { height: Infinity }, { alt: " " }])(
    "rejects invalid image geometry or description %j", (change) => {
      expect(projectImageSchema.safeParse({ ...image, ...change }).success).toBe(false);
    },
  );

  it("accepts same-ratio variants with their own safe paths", () => {
    const variants = [{ src: "/assets/projects/fixture/overview-small.avif", width: 600, height: 400 }];
    expect(projectImageSchema.parse({ ...image, variants }).variants).toEqual(variants);
  });

  it("rejects variants with a different ratio or unsafe path", () => {
    for (const variant of [
      { src: "/assets/projects/fixture/portrait.webp", width: 400, height: 600 },
      { src: "https://example.com/overview.webp", width: 600, height: 400 },
    ]) {
      expect(projectImageSchema.safeParse({ ...image, variants: [variant] }).success).toBe(false);
    }
  });

  it("requires a public cover to reference a registered image", () => {
    expect(projectSchema.safeParse({ ...publicRecord, cover: image.src }).success).toBe(false);
    expect(projectSchema.safeParse({ ...publicRecord, cover: image.src, images: [image] }).success).toBe(true);
  });

  it("keeps unregistered legacy draft covers valid", () => {
    expect(projectSchema.safeParse({ ...legacyDraft, cover: "https://example.com/legacy.webp" }).success).toBe(true);
  });
});
