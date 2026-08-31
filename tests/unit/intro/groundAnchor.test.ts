import { describe, expect, it } from "vitest";
import { groundAnchorOffset } from "@/lib/intro/groundAnchor";

describe("groundAnchorOffset", () => {
  it("keeps frames with the same ground anchor unchanged", () => {
    expect(groundAnchorOffset([
      { ground: [0.5, 0.92] },
      { ground: [0.5, 0.92] },
    ], 1, { width: 384, height: 384 })).toBe(0);
  });

  it("raises a frame whose ground anchor is lower in the sprite", () => {
    expect(groundAnchorOffset([
      { ground: [0.5, 0.92] },
      { ground: [0.5, 0.88] },
    ], 1, { width: 100, height: 300 })).toBeCloseTo(12);
  });

  it("compensates for rotation around the bottom-center origin", () => {
    expect(groundAnchorOffset([
      { ground: [0.5, 0.9] },
    ], 0, { width: 100, height: 100 }, 90)).toBeCloseTo(-10);
  });
});
