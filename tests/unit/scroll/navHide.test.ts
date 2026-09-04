import { describe, expect, it } from "vitest";
import { decideNavHidden } from "@/lib/scroll/navHide";

describe("decideNavHidden", () => {
  it("keeps state inside the direction threshold", () => {
    expect(decideNavHidden(100, 105)).toBeNull();
    expect(decideNavHidden(100, 95)).toBeNull();
  });

  it("hides after scrolling down past the threshold", () => {
    expect(decideNavHidden(100, 106)).toBe(true);
  });

  it("shows after scrolling up past the threshold", () => {
    expect(decideNavHidden(100, 94)).toBe(false);
  });

  it("always shows near the page top", () => {
    expect(decideNavHidden(120, 80)).toBe(false);
    expect(decideNavHidden(20, 0)).toBe(false);
  });

  it("does not flip repeatedly while continuing in one direction", () => {
    const positions = [100, 107, 114, 121];
    const states = positions.slice(1).map((next, index) => decideNavHidden(positions[index], next));
    expect(states).toEqual([true, true, true]);
  });
  it("does not accumulate sub-threshold scroll steps", () => {
    const positions = [100, 103, 106, 109];
    const states = positions.slice(1).map((next, index) => decideNavHidden(positions[index], next));
    expect(states).toEqual([null, null, null]);
  });
});
