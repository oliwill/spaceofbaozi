// Offline generated-HTML and byte audit. This command never starts a browser or changes product output.
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import sharp from "sharp";
import { siteConfig } from "../../src/lib/site/config";
import { withBase } from "../../src/lib/site/paths";
const { base } = siteConfig(process.env);
import { selectPublicProjects } from "../../src/lib/projects/projects";
import { auditPublicProjectAssets } from "../../src/lib/projects/assetAudit.server";
import { auditRenderedProjectImages } from "../../tests/support/project-output-audit";
import { projectsForCase, type ProjectFixtureCase } from "../../tests/fixtures/projects/projects";

const root = resolve(process.argv[2] ?? process.cwd());
const manifest = JSON.parse(await readFile(join(root, "projects-evidence/fixture-manifest.json"), "utf8")) as { caseName: ProjectFixtureCase; assetManifest: Record<string, { width: number; height: number; sha256: string }> };
const fixtures = projectsForCase(manifest.caseName);
const selected = selectPublicProjects(fixtures.map(({ slug, body: _body, ...data }) => ({ id: slug, data })));
await auditPublicProjectAssets(selected.map(({ project }) => project), join(root, "public"));
const assets = [];
for (const [src, expected] of Object.entries(manifest.assetManifest)) {
  const bytes = await readFile(join(root, "dist", src)), metadata = await sharp(bytes).metadata();
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (metadata.width !== expected.width || metadata.height !== expected.height || sha256 !== expected.sha256) throw new Error(`最终产物图片字节或尺寸不符: ${src}`);
  assets.push({ src, width: metadata.width, height: metadata.height, sha256 });
}
const details = [];
const negativeProof: Array<{ id: string; mutation: string; rejection: string }> = [];
for (const { project } of selected) {
  const html = await readFile(join(root, `dist/projects/${project.id}/index.html`), "utf8");
  const images = auditRenderedProjectImages(html, project.images, base);
  const fixture = fixtures.find(({ slug }) => slug === project.id)!;
  const expected = fixture.images.filter(({ src }) => fixture.body.includes(`src="${src}"`));
  if (JSON.stringify(images.map(({ src }) => src)) !== JSON.stringify(expected.map(({ src }) => src))) throw new Error(`最终详情图片数量/顺序不符: ${project.id}`);
  details.push({ id: project.id, images });
  if (images.length) {
    const original = images[0];
    const mutations = [
      ["external-src", html.replace(`src="${withBase(original.src, base)}"`, 'src="https://example.com/PRIVATE-PROJECT.png"'), /非法.*src/],
      ["unregistered-src", html.replace(`src="${withBase(original.src, base)}"`, `src="${withBase("/assets/projects/PRIVATE-PROJECT-unregistered.png", base)}"`), /未登记.*src/],
    ] as const;
    for (const [mutation, altered, reason] of mutations) {
      let rejection = "";
      try { auditRenderedProjectImages(altered, project.images, base); } catch (error) { rejection = (error as Error).message; }
      if (!reason.test(rejection)) throw new Error(`审计没有按预期拒绝最终HTML负例: ${project.id}/${mutation}`);
      negativeProof.push({ id: project.id, mutation, rejection });
    }
    const variant = original.srcset.find(({ src }) => src !== original.src);
    if (variant) {
      for (const [mutation, src, reason] of [["external-srcset", "https://example.com/PRIVATE-PROJECT.png", /非法.*srcset/], ["unregistered-srcset", "/assets/projects/PRIVATE-PROJECT-unregistered.png", /未登记.*srcset/]] as const) {
        const altered = html.replace(`${withBase(variant.src, base)} ${variant.width}w`, `${withBase(src, base)} ${variant.width}w`);
        let rejection = "";
        try { auditRenderedProjectImages(altered, project.images, base); } catch (error) { rejection = (error as Error).message; }
        if (!reason.test(rejection)) throw new Error(`审计没有拒绝最终srcset负例: ${project.id}/${mutation}`);
        negativeProof.push({ id: project.id, mutation, rejection });
      }
    }
  }
}
const result = { kind: "offline-final-HTML-and-image-bytes-not-browser", root, caseName: manifest.caseName, publicCount: selected.length, assets, details, negativeProof };
await writeFile(join(root, "projects-evidence/detail-output-audit.json"), JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result, null, 2));
