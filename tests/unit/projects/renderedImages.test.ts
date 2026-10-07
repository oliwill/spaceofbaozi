import { describe, expect, it } from "vitest";
import { auditRenderedProjectImages } from "../../support/project-output-audit";
import type { ProjectImage } from "../../../src/lib/projects/schema";

const image: ProjectImage = { src: "/assets/projects/synthetic/one.png", width: 960, height: 640, alt: "SYNTHETIC 图中的圆 & 方块", variants: [{ src: "/assets/projects/synthetic/small.png", width: 480, height: 320 }] };
const img = `<img src="${image.src}" width="960" height="640" alt="SYNTHETIC 图中的圆 &amp; 方块" loading="lazy" srcset="${image.variants![0].src} 480w, ${image.src} 960w">`;
const wrap = (body: string) => `<article data-project-detail><header class="project-header"><h1>合成项目</h1></header><div class="editorial-prose">${body}</div></article>`;
const valid = wrap(`<h2>过程</h2><p>这段解释图中的信息。</p><figure>${img}<figcaption>合成材料</figcaption></figure>`);
// Each mutation models final generated HTML, rather than a frontmatter/list-only check.
describe("final detail HTML image allowlist", () => {
  it("extracts decoded attributes, registered srcset and the preceding explanation", () => {
    expect(auditRenderedProjectImages(valid, [image])).toEqual([{ src: image.src, width: 960, height: 640, alt: image.alt, loading: "lazy", srcset: [{ src: image.variants![0].src, width: 480 }, { src: image.src, width: 960 }], precedingParagraph: "这段解释图中的信息。" }]);
  });
  it("does not turn unused registered images into a gallery", () => { expect(auditRenderedProjectImages(wrap("<h2>问题</h2><p>无图片正文。</p>"), [image])).toEqual([]); });
  it.each([
    ["external src", valid.replace(image.src, "https://example.com/private.png"), /非法.*src/],
    ["unregistered src", valid.replace(image.src, "/assets/projects/orphan.png"), /未登记.*src/],
    ["external srcset", valid.replace(image.variants![0].src, "https://example.com/private.png"), /非法.*srcset/],
    ["unregistered srcset", valid.replace(image.variants![0].src, "/assets/projects/orphan.png"), /未登记.*srcset/],
    ["wrong srcset width", valid.replace("480w", "481w"), /srcset.*尺寸/],
    ["wrong width", valid.replace('width="960"', 'width="961"'), /尺寸/],
    ["wrong height", valid.replace('height="640"', 'height="641"'), /尺寸/],
    ["inaccurate alt", valid.replace("图中的圆 &amp; 方块", "无说明"), /alt/],
    ["eager body image", valid.replace('loading="lazy"', 'loading="eager"'), /lazy/],
    ["article-escaping image", valid + img, /正文.*位置/],
    ["header gallery", valid.replace('<h1>合成项目</h1>', `<h1>合成项目</h1>${img}`), /正文.*位置/],
    ["image before explanation", wrap(`<figure>${img}</figure><p>之后才解释。</p>`), /解释段落/],
  ])("rejects %s in the actual detail HTML", (_name, html, reason) => { expect(() => auditRenderedProjectImages(html, [image])).toThrow(reason); });
});


describe("project deployment boundary", () => {
 const base = '/spaceofbaozi';
 const served = valid.replaceAll('/assets/projects/', base + '/assets/projects/');
 it('normalizes only the exact deployed base before registry validation', () => {
  expect(auditRenderedProjectImages(served, [image], base)).toEqual(auditRenderedProjectImages(valid, [image]));
 });
 it.each(['/assets/projects/', '/spaceofbaoziness/assets/projects/', '/spaceofbaozi/spaceofbaozi/assets/projects/', '/spaceofbaozi/assets/projects/%2e%2e/', '//evil/assets/projects/'])('rejects malformed served namespace %s', path => {
  expect(() => auditRenderedProjectImages(served.replaceAll(base+'/assets/projects/', path), [image], base)).toThrow(/非法|未登记/);
 });
});
