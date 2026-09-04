import { describe, expect, it } from "vitest";
import { leashPath, leashSag } from "@/lib/intro-oil/leash";

describe("leashPath（D-121 SVG 牵引绳）", () => {
  it("端点精确落在 from / to", () => {
    const d = leashPath({ x: 10, y: 20 }, { x: 110, y: 30 }, 15);
    expect(d.startsWith("M 10 20")).toBe(true);
    expect(d.endsWith("110 30")).toBe(true);
  });

  it("下垂量为 0 时控制点不越出端点连线下方", () => {
    const d = leashPath({ x: 0, y: 50 }, { x: 100, y: 50 }, 0);
    expect(d).toContain("C 33.33");
    expect(d).not.toMatch(/C [\d.]+ 5[1-9]/);
  });

  it("leashSag 绷紧时下垂更小，输入越界被钳制", () => {
    expect(leashSag(1, 200)).toBeLessThan(leashSag(0, 200));
    expect(leashSag(2, 200)).toBe(leashSag(1, 200));
    expect(leashSag(-1, 200)).toBe(leashSag(0, 200));
  });
});
