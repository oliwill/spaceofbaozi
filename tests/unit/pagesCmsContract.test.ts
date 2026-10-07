import { existsSync, readFileSync, mkdtempSync, writeFileSync, rmSync, readdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { glob, type LoaderContext } from "astro/loaders";
import { entrySchema } from "@/lib/content/entrySchema";
import { isPublishable } from "@/lib/content/gates";
import { markdownContentEntryType } from "../../node_modules/astro/dist/vite-plugin-markdown/content-entry-type.js";
import { MutableDataStore } from "../../node_modules/astro/dist/content/mutable-data-store.js";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

type Field = { name: string; type: string; required?: boolean; default?: unknown; list?: boolean; readonly?: boolean; options?: Record<string, unknown> };
type CmsConfig = {
  content: { name: string; type: string; path: string; format: string; filename: unknown; operations: unknown; fields: Field[] }[];
  media: { name: string; input: string; output: string; extensions: string[] }[];
  settings: { content: { merge: boolean } };
};
const root = new URL("../../", import.meta.url);
const configFile = new URL(".pages.yml", root);
const config: CmsConfig | undefined = existsSync(configFile) ? parse(readFileSync(configFile, "utf8")) : undefined;
const blog = config?.content[0];
const field = (name: string) => blog?.fields.find((item) => item.name === name);

describe("local Pages CMS configuration contract", () => {
  it("exposes only the Blog collection in its editor", () => {
    expect(config?.content).toHaveLength(1);
    expect(blog).toMatchObject({ name: "blog", type: "collection", path: "src/content/blog", format: "yaml-frontmatter" });
  });
  it("uses a creation-only filename input and disables article rename/delete", () => {
    expect(blog?.filename).toEqual({ template: "{primary}.md", field: "create" });
    expect(blog?.operations).toEqual({ rename: false, delete: false });
    expect(field("slug")).toBeUndefined();
  });
  it("defaults new submissions to real unapproved draft booleans", () => {
    expect(field("draft")).toMatchObject({ type: "boolean", default: true });
    expect(field("approved")).toMatchObject({ type: "boolean", default: false });
  });
  it("requires title and explicit first date without silently seeding today", () => {
    expect(field("title")).toMatchObject({ type: "string", required: true });
    expect(field("date")).toMatchObject({ type: "date", required: true, default: "", options: { format: "yyyy-MM-dd" } });
    expect(field("date")?.readonly).not.toBe(true);
  });
  it("keeps optional updated initially empty with a supported date format", () => {
    expect(field("updated")).toMatchObject({ type: "date", default: "", options: { format: "yyyy-MM-dd" } });
    expect(field("updated")?.required).not.toBe(true);
  });
  it("writes a single cover string and Markdown body from the named image source", () => {
    expect(config?.media).toEqual([{ name: "blog_images", input: "public/assets/blog", output: "/assets/blog", extensions: ["jpg", "jpeg", "png", "webp"] }]);
    expect(field("cover")).toMatchObject({ type: "image", options: { media: "blog_images" } });
    expect(field("cover")?.options?.multiple).toBeUndefined();
    expect(field("body")).toMatchObject({ type: "rich-text", options: { format: "markdown", switcher: true, media: "blog_images" } });
    expect(field("coverAlt")?.type).toBe("string");
    expect(field("coverCredit")?.type).toBe("string");
    expect(existsSync(new URL("public/assets/blog/.gitkeep", root))).toBe(true);
  });
  it("uses top-level list for tags and explicitly preserves known optional metadata", () => {
    expect(field("tags")).toMatchObject({ type: "string", list: true });
    expect(field("featured")?.type).toBe("boolean");
    expect(field("status")?.type).toBe("string");
    expect(field("link")?.type).toBe("string");
    expect(config?.settings).toEqual({ content: { merge: false } });
  });
  it("shares the unchanged real Astro schema with collection definitions", () => {
    expect(existsSync(new URL("src/lib/content/entrySchema.ts", root))).toBe(true);
    const source = readFileSync(new URL("src/content.config.ts", root), "utf8");
    expect(source).toContain('import { entrySchema } from "@/lib/content/entrySchema"');
    expect(source).toContain("schema: entrySchema");
    expect(source).not.toContain("const entrySchema");
  });
  it("replaces automatic publish and old image-host instructions in the Blog template", () => {
    const template = readFileSync(new URL("src/content/_templates/blog-post.md", root), "utf8");
    expect(template).not.toMatch(/PicGo|Cloudflare|bun run publish|<figure|<div/);
    expect(template).toContain("Pages CMS");
    expect(template).toContain("/assets/blog/");
    expect(template).toContain("updated");
    expect(template).toContain("同一次保存");
  });
});

const fixtureDir = new URL("tests/fixtures/publishing/", root);
async function frontmatter(name: string) {
  return (await markdownContentEntryType.getEntryInfo({ contents: readFileSync(new URL(name, fixtureDir), "utf8"), fileUrl: new URL(name, fixtureDir) })).data;
}

// Astro 5.18.2 internal entryTypes is absent from public LoaderContext; the parser and store are real.
async function loadFixtureAtStablePath(contents: string) {
  const directory = mkdtempSync(join(tmpdir(), "pages-cms-contract-"));
  const store = new MutableDataStore().scopedStore("blog");
  const messages: string[] = [];
  try {
    writeFileSync(join(directory, "stable-entry.md"), contents);
    await glob({ pattern: "*.md", base: "./" }).load({
      collection: "blog",
      config: { root: pathToFileURL(`${directory}/`), srcDir: pathToFileURL(`${directory}/src/`), legacy: { collections: false }, markdown: {}, image: {} },
      entryTypes: new Map([[".md", markdownContentEntryType]]),
      logger: { warn: (message: string) => messages.push(message), error: (message: string) => messages.push(message) },
      store,
      parseData: async ({ data }: { data: unknown }) => entrySchema.parse(data),
      generateDigest: (content: string) => createHash("sha256").update(content).digest("hex"),
    } as unknown as LoaderContext);
    expect(messages).toEqual([]);
    return store.values();
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

describe("actual Astro frontmatter schema and glob loader", () => {
  it("accepts the desired draft wire fixture and keeps omitted updated absent", async () => {
    const raw = await frontmatter("new-draft.md");
    expect(raw).toMatchObject({ date: new Date("2026-10-01"), draft: true, approved: false });
    const data = entrySchema.parse(raw);
    expect(isPublishable(data)).toBe(false);
    expect(raw).not.toHaveProperty("updated");
    expect(data).not.toHaveProperty("updated");
    expect(data.tags).toEqual(["test", "cms"]);
  });
  it.each(["missing-title.md", "missing-date.md", "string-false.md", "string-approved.md", "empty-updated.md", "cover-array.md", "cover-object.md"])("rejects incompatible %s through the shared schema", async (name) => {
    expect(entrySchema.safeParse(await frontmatter(name)).success).toBe(false);
  });
  it("documents the existing coerce.date null boundary rather than pretending it rejects null", async () => {
    const raw = await frontmatter("null-updated.md");
    expect(raw.updated).toBeNull();
    expect(entrySchema.parse(raw).updated).toEqual(new Date(0));
  });
  it("keeps default approval false and strips unknown metadata without making it required", async () => {
    const raw = await frontmatter("unknown-field.md");
    const data = entrySchema.parse(raw);
    expect(data).not.toHaveProperty("internalNote");
    const { approved: _approved, ...withoutApproval } = raw;
    expect(entrySchema.parse(withoutApproval).approved).toBe(false);
    expect(field("internalNote")).toBeUndefined();
    expect(blog?.fields.map((item) => item.name).sort()).toEqual([...Object.keys(entrySchema.shape), "body"].sort());
  });
  it("preserves all explicitly supported metadata in the desired revision wire fixture", async () => {
    const before = entrySchema.parse(await frontmatter("approved-before.md"));
    const after = entrySchema.parse(await frontmatter("approved-after.md"));
    for (const key of ["date", "featured", "status", "link", "cover", "coverAlt", "coverCredit", "tags", "draft", "approved"] as const) {
      expect(after[key]).toEqual(before[key]);
      expect(field(key)).toBeDefined();
    }
    expect(after.title).not.toBe(before.title);
    expect(after.updated).toEqual(new Date("2026-10-06"));
    expect(isPublishable(after)).toBe(true);
  });
  it("loads a changed title at the same file path with the same Astro id", async () => {
    const before = await loadFixtureAtStablePath(readFileSync(new URL("approved-before.md", fixtureDir), "utf8"));
    const after = await loadFixtureAtStablePath(readFileSync(new URL("approved-after.md", fixtureDir), "utf8"));
    expect(before).toHaveLength(1);
    expect(after).toHaveLength(1);
    expect(before[0].id).toBe("stable-entry");
    expect(after[0].id).toBe(before[0].id);
    expect(after[0].data.title).toBe("Revised synthetic title");
    expect(after[0].rendered?.html).toContain("Synthetic fixture");
  });
  it("shows why raw slug must stay outside the CMS form: Astro honors it before schema stripping", async () => {
    const raw = await frontmatter("raw-slug.md");
    expect(entrySchema.parse(raw)).not.toHaveProperty("slug");
    const loaded = await loadFixtureAtStablePath(readFileSync(new URL("raw-slug.md", fixtureDir), "utf8"));
    expect(loaded[0].id).toBe("unwanted-route");
    expect(field("slug")).toBeUndefined();
  });
  it("has form definitions for every existing Blog frontmatter key", async () => {
    const files = readdirSync(new URL("src/content/blog/", root)).filter((name) => name.endsWith(".md"));
    expect(files).toHaveLength(17);
    for (const name of files) {
      const fileUrl = new URL(`src/content/blog/${name}`, root);
      const { data } = await markdownContentEntryType.getEntryInfo({ contents: readFileSync(fileUrl, "utf8"), fileUrl });
      for (const key of Object.keys(data)) expect(field(key), `${name}: ${key}`).toBeDefined();
      expect(entrySchema.safeParse(data).success, name).toBe(true);
    }
  });
});
