import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { renderAstro } from "../../support/astro-component";
import type { ProjectImage } from "@/lib/projects/projects";

const componentPath = join(process.cwd(), "src/components/projects/ProjectImage.astro");
const image: ProjectImage = {
  src: "/assets/projects/example.png", width: 1200, height: 800,
  alt: "合成界面的导航与正文区域", credit: "合成测试材料",
  variants: [{ src: "/assets/projects/example-small.png", width: 600, height: 400 }],
};
async function render(props: { image: ProjectImage; loading?: "eager" | "lazy" }) {
  return renderAstro('src/components/projects/ProjectImage.astro', props);
}

describe("ProjectImage server-rendered contract", () => {
  it("has a project image component", () => { expect(existsSync(componentPath)).toBe(true); });
  it("renders accurate dimensions, alt, srcset, sizes and lazy loading", async () => {
    const { html } = await render({ image });
    for (const expected of ['width="1200"', 'height="800"', `alt="${image.alt}"`, 'loading="lazy"', `src="${image.src}"`, 'srcset="/assets/projects/example-small.png 600w, /assets/projects/example.png 1200w"', 'sizes="']) expect(html).toContain(expected);
    expect(html).toMatch(new RegExp(`<figcaption[^>]*>${image.credit}</figcaption>`));
  });
  it("supports eager loading without adding an interaction script", async () => {
    const { html } = await render({ image, loading: "eager" });
    expect(html).toContain('loading="eager"');
    expect(html).not.toMatch(/<script|onerror|onclick/);
  });
  it("omits an absent credit and a srcset with no variants", async () => {
    const { html } = await render({ image: { src: image.src, width: image.width, height: image.height, alt: image.alt } });
    expect(html).not.toContain("figcaption");
    expect(html).not.toContain("srcset=");
    expect(html).not.toContain("sizes=");
    expect(html).toContain(`alt="${image.alt}"`);
  });
  it("keeps image content contained without a frame, shadow or fixed-height slot", async () => {
    const { css } = await render({ image });
    expect(css).toMatch(/object-fit:\s*contain/);
    expect(css).toMatch(/height:\s*auto/);
    expect(css).not.toMatch(/box-shadow|border:|aspect-ratio:|min-height:/);
  });
});
