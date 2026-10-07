import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { transform } from "@astrojs/compiler";

const componentRoot = join(process.cwd(), "src/components/projects");
const styles = () => readFile(join(componentRoot, "projects.css"), "utf8");
const rule = (css: string, selector: string) => [...css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .find((match) => match[1].trim() === selector)?.[2] ?? "";

describe("Projects list-only typography contract", () => {
  it("lets list metadata inherit the existing body size without changing detail metadata", async () => {
    const css = await styles();
    expect(rule(css, ".project-item .project-meta")).toMatch(/font-size:\s*inherit\s*;/);
    expect(rule(css, ".project-meta")).toMatch(/font-size:\s*0\.82rem\s*;/);
  });

  it("compiles list caption inheritance with higher specificity than the shared Astro caption rule", async () => {
    const filename = join(componentRoot, "ProjectImage.astro");
    const compiled = await transform(await readFile(filename, "utf8"), { filename, scopedStyleStrategy: "attribute" });
    const css = compiled.css.join("\n");
    const shared = css.match(/\.project-image(\[data-astro-cid-[^\]]+\]) figcaption\1\{([^}]*)\}/);
    const list = css.match(/\.project-item \.project-image(\[data-astro-cid-[^\]]+\]) figcaption\1\{([^}]*)\}/);
    expect(shared?.[2] ?? "").toMatch(/font-size:0\.75rem(?:;|$)/);
    expect(list?.[2] ?? "").toMatch(/font-size:inherit(?:;|$)/);
    // The unscoped list ancestor adds one class above the unchanged shared rule.
    expect(list?.[0].startsWith(".project-item ")).toBe(true);
  });

  it("keeps page headings, project titles, detail text and the prior prose corrections unchanged", async () => {
    const css = await styles();
    expect(rule(css, ".projects-page__title,\n.project-header h1")).toMatch(/font-size:\s*clamp\(2rem, 4\.1vw, 3\.5rem\)/);
    expect(rule(css, ".project-item h2")).toMatch(/font-size:\s*clamp\(1\.4rem, 2\.5vw, 2rem\)/);
    expect(rule(css, ".project-header__intro")).toMatch(/font-size:\s*1\.05rem/);
    expect(rule(css, ".project-header > .project-return")).toMatch(/font-size:\s*0\.9rem/);
    expect(rule(css, ".project-footer")).toMatch(/font-size:\s*0\.95rem/);
    expect(rule(css, ".projects-detail .editorial-prose figure")).toMatch(/margin-inline:\s*0/);
    expect(rule(css, ".projects-detail .editorial-prose :is(th, td)")).toMatch(/min-width:\s*10rem/);
  });
});
