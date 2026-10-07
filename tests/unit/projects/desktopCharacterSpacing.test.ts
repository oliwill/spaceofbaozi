import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { transform } from "@astrojs/compiler";
import postcss, { AtRule, type Node, type Rule } from "postcss";

const filename = join(process.cwd(), "src/components/layout/shell.css");
const source = await readFile(filename, "utf8");
const compiled = await transform(`<style is:global>${source}</style>`, { filename: "ShellCharacterSpacing.astro" });

function matchesWidth(rule: Rule, width: number): boolean {
  for (let parent: Node | undefined = rule.parent; parent; parent = parent.parent) {
    if (!(parent instanceof AtRule) || parent.name !== "media") continue;
    const conditions = [...parent.params.matchAll(/\((min|max)-width:\s*(\d+)px\)/g)];
    if (!conditions.length) throw new Error(`Unsupported character media query: ${parent.params}`);
    if (!conditions.every(([, boundary, value]) => boundary === "min" ? width >= Number(value) : width <= Number(value))) return false;
  }
  return true;
}

function marginsAt(css: string, width: number, reading = false) {
  const margins: Record<string, string> = {};
  const selectors = [".site-characters", ...(reading ? [".site-characters--reading"] : [])];
  postcss.parse(css).walkRules((rule) => {
    if (!rule.selectors.some((selector) => selectors.includes(selector)) || !matchesWidth(rule, width)) return;
    rule.walkDecls((declaration) => {
      if (declaration.prop === "margin") {
        const [top, right = top, bottom = top, left = right] = declaration.value.split(/\s+/);
        Object.assign(margins, { top, right, bottom, left });
      } else if (declaration.prop.startsWith("margin-")) {
        margins[declaration.prop.slice(7)] = declaration.value;
      }
    });
  });
  return Object.fromEntries(Object.entries(margins).map(([side, value]) => [side, parseFloat(value)]));
}

// Reverting the desktop 42px gap to 18px must fail authored and compiled checks.
for (const [stage, css] of [["authored", source], ["Astro-compiled", compiled.css.join("\n")]]) {
  describe(`${stage} navigation-to-character spacing`, () => {
    for (const width of [768, 1024, 1440]) {
      it(`${width}px adds 24px vertical space without moving characters horizontally`, () => {
        expect(marginsAt(css, width)).toEqual({ top: 42, right: -25, bottom: 0, left: width <= 1050 ? -33 : -38 });
      });

      it(`${width}px keeps the reading character's dedicated 26px margin`, () => {
        expect(marginsAt(css, width, true)).toEqual({ top: 26, right: 0, bottom: 0, left: 0 });
      });
    }

    for (const width of [360, 390, 720, 767]) {
      it(`${width}px keeps the mobile character margin and reading override`, () => {
        expect(marginsAt(css, width)).toEqual({ top: 25, right: -14, bottom: 0, left: 0 });
        expect(marginsAt(css, width, true)).toEqual({ top: 30, right: 0, bottom: 0, left: 0 });
      });
    }
  });
}
