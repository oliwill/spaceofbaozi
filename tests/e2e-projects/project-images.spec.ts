import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { auditRenderedProjectImages } from "../support/project-output-audit";
import { bodyImages, caseName, projects, ready } from "./project-test-helpers";

for (const project of projects) {
  test(`[SSR images] ${caseName}: ${project.slug} audits actual final img/srcset, dimensions, alt and explanation position`, async ({ request }) => {
    const response = await request.get(`/projects/${project.slug}`);
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toBe(readFileSync(`dist/projects/${project.slug}/index.html`, "utf8"));
    const actual = auditRenderedProjectImages(html, project.images);
    expect(actual.map(({ src }) => src)).toEqual(bodyImages(project).map(({ src }) => src));
    for (const image of actual) {
      expect(() => auditRenderedProjectImages(html.replace(`src="${image.src}"`, 'src="https://example.com/private.png"'), project.images)).toThrow(/非法.*src/);
      expect(() => auditRenderedProjectImages(html.replace(`src="${image.src}"`, 'src="/assets/projects/unregistered.png"'), project.images)).toThrow(/未登记.*src/);
    }
  });
  if (bodyImages(project).length) {
    test(`${caseName}: ${project.slug} live DOM keeps registered image candidates after their explanation`, async ({ page }) => {
      await page.goto(`/projects/${project.slug}`);
      await ready(page);
      const offline = auditRenderedProjectImages(await page.content(), project.images);
      const actual = await page.locator("[data-project-detail] img").evaluateAll((nodes) => nodes.map((node) => {
        const image = node as HTMLImageElement, block = image.closest("figure") ?? image.parentElement!;
        return { src: image.getAttribute("src"), width: image.width, height: image.height, declaredWidth: image.getAttribute("width"), declaredHeight: image.getAttribute("height"), alt: image.alt, loading: image.loading, srcset: image.srcset, precedingParagraph: block.previousElementSibling?.textContent?.trim(), top: image.getBoundingClientRect().top, outsideFirstViewport: image.getBoundingClientRect().top >= innerHeight };
      }));
      expect(actual).toHaveLength(offline.length);
      for (const [index, image] of actual.entries()) {
        const expected = offline[index];
        expect(image.src).toBe(expected.src);
        expect(image.declaredWidth).toBe(String(expected.width));
        expect(image.declaredHeight).toBe(String(expected.height));
        expect(image.alt).toBe(expected.alt);
        expect(image.srcset).toBe(expected.srcset.map(({ src, width }) => `${src} ${width}w`).join(", "));
        expect(image.precedingParagraph).toBe(expected.precedingParagraph);
        if (image.outsideFirstViewport) expect(image.loading).toBe("lazy");
      }
      await expect(page.locator(".project-header img")).toHaveCount(0);
    });
  }
}
