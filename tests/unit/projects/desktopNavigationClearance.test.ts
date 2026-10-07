import { afterEach, describe, expect, it, vi } from "vitest";
import { assertCharacterClearance, identityClearanceTargets } from "../../e2e-projects/desktop-navigation.spec";

// Only disable Playwright registration; exercise the same collector and guard used by the e2e.
vi.mock("@playwright/test", () => ({ test: () => {}, expect: undefined }));

const wrapper = { x: 30, y: 28, width: 300, height: 74.390625 };
// Generic semantic-target fixtures; these are not claimed to be measured Mac text coordinates.
const brand = { x: 30, y: 28, width: 150, height: 44 };
const subtitle = { x: 30, y: 74, width: 120, height: 11 };

function documentWith(lines = [subtitle]) {
  const brandElement = { getBoundingClientRect: () => brand };
  const subtitleElement = { getBoundingClientRect: () => ({ ...wrapper, y: 72, height: 14.390625 }) };
  const elements = new Map([
    [".shell-identity", { getBoundingClientRect: () => wrapper }],
    [".shell-brand", brandElement],
    [".shell-brand-meta", subtitleElement],
  ]);
  vi.stubGlobal("document", {
    querySelector: (selector: string) => elements.get(selector) ?? null,
    createRange: () => ({
      selectNodeContents: (element: object) => { expect(element).toBe(subtitleElement); },
      getClientRects: () => lines,
    }),
  });
}

afterEach(() => vi.unstubAllGlobals());

describe("navigation clearance semantic targets", () => {
  it("collects the brand link hitbox and each subtitle text line instead of wrapper whitespace", () => {
    documentWith();
    expect(identityClearanceTargets()).toEqual([
      { name: "brand link", bounds: brand },
      { name: "subtitle line 1", bounds: subtitle },
    ]);
  });

  it("does not reject the measured v13 360px character merely for entering identity margin whitespace", () => {
    documentWith();
    // Exact alpha boundary and wrapper from mac-v13-inputs/report.md; semantic targets above are synthetic.
    const character = { name: "measured person", bounds: { x: 219.533854, y: 87.807292, width: 51.932292, height: 138.192708 } };
    expect(() => assertCharacterClearance([character], [{ name: "old identity wrapper", bounds: wrapper }])).toThrow("old identity wrapper");
    expect(() => assertCharacterClearance([character], identityClearanceTargets())).not.toThrow();
  });

  it("still rejects overlap with the brand link's clickable blank space", () => {
    documentWith();
    const character = { name: "injected person", bounds: { x: 170, y: 60, width: 8, height: 8 } };
    expect(() => assertCharacterClearance([character], identityClearanceTargets())).toThrow();
  });

  it("still rejects overlap with a second subtitle text line", () => {
    documentWith([subtitle, { x: 30, y: 90, width: 60, height: 11 }]);
    const character = { name: "injected person", bounds: { x: 55, y: 92, width: 10, height: 7 } };
    expect(() => assertCharacterClearance([character], identityClearanceTargets())).toThrow();
  });

  for (const name of ["navigation 文章", "navigation 照片", "navigation 简历", "navigation 项目", "main"]) {
    it(`still rejects actual painted content overlapping ${name}`, () => {
      const target = { name, bounds: { x: 30, y: 140, width: 44, height: 44 } };
      const character = { name: "injected person", bounds: { x: 40, y: 150, width: 10, height: 10 } };
      expect(() => assertCharacterClearance([character], [target])).toThrow(name);
    });
  }
});
