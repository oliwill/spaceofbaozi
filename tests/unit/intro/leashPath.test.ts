import { describe, expect, it } from "vitest";
import { leashPath } from "@/lib/intro/leashPath";

describe("leashPath", () => {
  it("connects exact endpoints", () => {
    expect(leashPath({ x: 10, y: 20 }, { x: 110, y: 40 }, 12)).toBe("M 10 20 C 45 32, 75 52, 110 40");
  });
});
