import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { auditPublicProjectAssets } from "@/lib/projects/assetAudit.server";
import type { PublicProject, ProjectImage } from "@/lib/projects/projects";

const roots: string[] = [];
const image: ProjectImage = { src: "/assets/projects/example.png", width: 12, height: 8, alt: "合成几何图中的红色矩形" };
const project = (images: ProjectImage[] = [image]): PublicProject => ({
  id: "synthetic", href: "/projects/synthetic", title: "合成项目", intro: "资源测试", role: "我负责测试。",
  kind: "personal", date: new Date("2026-10-01"), images,
});
async function directory() {
  const root = await mkdtemp(join(tmpdir(), "projects-asset-test-"));
  roots.push(root);
  await mkdir(join(root, "assets/projects"), { recursive: true });
  return root;
}
async function createImage(root: string, asset: Pick<ProjectImage, "src" | "width" | "height"> = image) {
  const target = join(root, asset.src);
  await mkdir(join(target, ".."), { recursive: true });
  await sharp({ create: { width: asset.width, height: asset.height, channels: 3, background: "red" } }).png().toFile(target);
}
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

describe("public project asset allowlist", () => {
  it("allows zero public projects when the asset directory does not exist", async () => {
    const root = await directory();
    await rm(join(root, "assets"), { recursive: true });
    await expect(auditPublicProjectAssets([], root)).resolves.toBeUndefined();
  });
  it("allows a small exact image and same-ratio variant", async () => {
    const root = await directory();
    const variant = { src: "/assets/projects/nested/example-small.png", width: 6, height: 4 };
    await createImage(root);
    await createImage(root, variant);
    await expect(auditPublicProjectAssets([project([{ ...image, variants: [variant] }])], root)).resolves.toBeUndefined();
  });
  it("rejects a missing registered image", async () => {
    await expect(auditPublicProjectAssets([project()], await directory())).rejects.toThrow(/缺失.*example/);
  });
  it("rejects a missing variant", async () => {
    const root = await directory();
    await createImage(root);
    await expect(auditPublicProjectAssets([project([{ ...image, variants: [{ ...image, src: "/assets/projects/missing.png" }] }])], root)).rejects.toThrow(/缺失.*missing/);
  });
  it("rejects actual dimensions that differ from the declaration", async () => {
    const root = await directory();
    await createImage(root);
    await expect(auditPublicProjectAssets([project([{ ...image, width: 24 }])], root)).rejects.toThrow(/尺寸不符.*example/);
  });
  it("rejects an orphan nested asset even when there are no public projects", async () => {
    const root = await directory();
    await createImage(root, { ...image, src: "/assets/projects/nested/orphan.png" });
    await expect(auditPublicProjectAssets([], root)).rejects.toThrow(/未登记.*orphan/);
  });
  it("does not exempt a hidden file from the allowlist", async () => {
    const root = await directory();
    await writeFile(join(root, "assets/projects/.gitkeep"), "");
    await expect(auditPublicProjectAssets([], root)).rejects.toThrow(/未登记.*gitkeep/);
  });
  it("rejects duplicate sources with conflicting dimensions", async () => {
    const root = await directory();
    await createImage(root);
    await expect(auditPublicProjectAssets([project(), project([{ ...image, height: 9 }])], root)).rejects.toThrow(/尺寸声明冲突.*example/);
  });
  it("allows repeated matching declarations", async () => {
    const root = await directory();
    await createImage(root);
    await expect(auditPublicProjectAssets([project(), project()], root)).resolves.toBeUndefined();
  });
  it("rejects a symlink even when its URL is registered", async () => {
    const root = await directory();
    await createImage(root, { ...image, src: "/actual.png" });
    await symlink(join(root, "actual.png"), join(root, "assets/projects/example.png"));
    await expect(auditPublicProjectAssets([project()], root)).rejects.toThrow(/符号链接/);
  });
  it("rejects a symlinked directory inside projects", async () => {
    const root = await directory();
    await mkdir(join(root, "secret"));
    await symlink(join(root, "secret"), join(root, "assets/projects/private"));
    await expect(auditPublicProjectAssets([], root)).rejects.toThrow(/符号链接/);
  });
  it("rejects a symlinked projects root", async () => {
    const root = await directory();
    await rm(join(root, "assets/projects"), { recursive: true });
    await mkdir(join(root, "secret"));
    await symlink(join(root, "secret"), join(root, "assets/projects"));
    await expect(auditPublicProjectAssets([], root)).rejects.toThrow(/符号链接/);
  });
  it("rejects a symlinked assets ancestor", async () => {
    const root = await directory();
    await rm(join(root, "assets"), { recursive: true });
    await mkdir(join(root, "secret/projects"), { recursive: true });
    await symlink(join(root, "secret"), join(root, "assets"));
    await expect(auditPublicProjectAssets([], root)).rejects.toThrow(/符号链接/);
  });
  it.each([
    "https://example.com/a.png", "/assets/projects/../a.png", "/assets/projects/%2e%2e/a.png",
    "/assets/projects/a.png?private=1", "/assets/projects/a.png#private", "/assets/projects/a.svg",
    "/assets/projects/./a.png", "/assets/projects//a.png", "/assets/projects/a\\b.png", "/assets/photos/a.png",
  ])("rejects an illegal path: %s", async (src) => {
    await expect(auditPublicProjectAssets([project([{ ...image, src }])], await directory())).rejects.toThrow(/路径/);
  });
  it.each([{ width: 0 }, { height: 1.5 }, { alt: " " }])("rejects malformed registered metadata: %j", async (changes) => {
    await expect(auditPublicProjectAssets([project([{ ...image, ...changes }])], await directory())).rejects.toThrow(/登记/);
  });
  it("rejects a variant with a different aspect ratio", async () => {
    await expect(auditPublicProjectAssets([project([{ ...image, variants: [{ ...image, width: 5, height: 4 }] }])], await directory())).rejects.toThrow(/比例/);
  });
  it.each(["svg", "gif", "tiff"] as const)("rejects a same-size %s disguised as PNG", async (format) => {
    const root = await directory();
    const target = join(root, image.src);
    if (format === "svg") await writeFile(target, '<svg width="12" height="8" xmlns="http://www.w3.org/2000/svg"><rect width="12" height="8" fill="red"/></svg>');
    else await sharp({ create: { width: 12, height: 8, channels: 3, background: "red" } }).toFormat(format).toFile(target);
    await expect(auditPublicProjectAssets([project()], root)).rejects.toThrow(/格式/);
  });
  it.each([
    ["png", "png"], ["jpg", "jpeg"], ["jpeg", "jpeg"], ["webp", "webp"], ["avif", "avif"],
  ] as const)("allows real %s encoded as %s", async (extension, format) => {
    const root = await directory();
    const asset = { ...image, src: `/assets/projects/actual.${extension}` };
    await sharp({ create: { width: 12, height: 8, channels: 3, background: "red" } }).toFormat(format).toFile(join(root, asset.src));
    await expect(auditPublicProjectAssets([project([asset])], root)).resolves.toBeUndefined();
  });
  it.each([
    ["jpg", "png"], ["webp", "jpeg"], ["avif", "webp"],
  ] as const)("rejects extension %s containing actual %s bytes", async (extension, format) => {
    const root = await directory();
    const asset = { ...image, src: `/assets/projects/mismatch.${extension}` };
    await sharp({ create: { width: 12, height: 8, channels: 3, background: "red" } }).toFormat(format).toFile(join(root, asset.src));
    await expect(auditPublicProjectAssets([project([asset])], root)).rejects.toThrow(/格式/);
  });
  it("rejects corrupt bytes even if the filename is registered", async () => {
    const root = await directory();
    await writeFile(join(root, "assets/projects/example.png"), "synthetic-invalid-image");
    await expect(auditPublicProjectAssets([project()], root)).rejects.toThrow();
  });
});
