import { describe, expect, it } from "vitest";
import { frameAtProgress } from "@/lib/intro/frameAtProgress";

describe("frameAtProgress", () => {
  it("clamps non-looping actions", () => {
    expect(frameAtProgress(-1, 8, false)).toBe(0);
    expect(frameAtProgress(0.5, 8, false)).toBe(4);
    expect(frameAtProgress(1, 8, false)).toBe(7);
  });

  it("loops exactly at one", () => {
    expect(frameAtProgress(1, 8, true)).toBe(0);
  });

  it("rejects invalid frame counts", () => {
    expect(() => frameAtProgress(0.5, 0, false)).toThrow(RangeError);
  });
});
