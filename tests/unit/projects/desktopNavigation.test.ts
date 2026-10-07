import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { transform } from "@astrojs/compiler";
import postcss, { AtRule, type ChildNode, type Node } from "postcss";

const filename = join(process.cwd(), "src/components/layout/shell.css");
const source = await readFile(filename, "utf8");
const compiled = await transform(`<style is:global>${source}</style>`, { filename: "ShellNavigationStyles.astro" });

function matchesViewport(node: ChildNode, width: number): boolean {
  for (let parent: Node | undefined = node.parent; parent; parent = parent.parent) {
    if (!(parent instanceof AtRule) || parent.name !== "media") continue;
    const conditions = [...parent.params.matchAll(/\((min|max)-width:\s*(\d+)px\)/g)];
    if (!conditions.length) throw new Error(`Unsupported navigation media query: ${parent.params}`);
    if (!conditions.every(([, boundary, value]) => boundary === "min" ? width >= Number(value) : width <= Number(value))) return false;
  }
  return true;
}

function declarationsAt(css: string, selector: string, width: number) {
  const declarations: Record<string, string> = {};
  postcss.parse(css).walkRules((rule) => {
    if (!rule.selectors.includes(selector) || !matchesViewport(rule, width)) return;
    rule.walkDecls((declaration) => {
      declarations[declaration.prop] = declaration.value;
      if (declaration.prop === "font") {
        const fontSize = declaration.value.match(/(?:^|\s)(\d+(?:\.\d+)?px)(?:\/|\s)/)?.[1];
        if (!fontSize) throw new Error(`Unsupported navigation font: ${declaration.value}`);
        declarations["font-size"] = fontSize;
      }
    });
  });
  return declarations;
}

// Reverting either desktop font declaration must fail both authored and compiled checks.
for (const [stage, css] of [["authored", source], ["Astro-compiled", compiled.css.join("\n")]]) {
  describe(`${stage} shared navigation typography`, () => {
    for (const width of [360, 390, 767, 768, 1024, 1440]) {
      it(`${width}px uses ${width <= 767 ? "unchanged mobile 12/9" : "desktop 16/12"} sizes and 44px targets`, () => {
        const links = declarationsAt(css, ".shell-links a", width);
        const numbers = declarationsAt(css, ".shell-links a span", width);
        expect.soft(links["font-size"]).toBe(width <= 767 ? "12px" : "16px");
        expect.soft(numbers["font-size"]).toBe(width <= 767 ? "9px" : "12px");
        expect(links["min-width"]).toBe("44px");
        expect(links["min-height"]).toBe("44px");
        expect(links["white-space"]).toBe("nowrap");
      });
    }
  });
}
