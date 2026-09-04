import { describe, expect, it } from "vitest";
import { isSettled, smoothDampStep, type DampState } from "@/lib/intro-oil/smoothDamp";

describe("smoothDampStep（CP5 唯一平滑层）", () => {
  it("从静止收敛到目标", () => {
    let s: DampState = { current: 0, velocity: 0 };
    for (let i = 0; i < 600; i++) s = smoothDampStep(s, 1, 0.12, 1 / 60);
    expect(s.current).toBeCloseTo(1, 3);
    expect(isSettled(s, 1)).toBe(true);
  });

  it("从静止出发不过冲目标", () => {
    let s: DampState = { current: 0, velocity: 0 };
    for (let i = 0; i < 600; i++) {
      s = smoothDampStep(s, 1, 0.12, 1 / 60);
      expect(s.current).toBeLessThanOrEqual(1 + 1e-9);
    }
  });

  it("支持目标反向（反向滚动）", () => {
    let s: DampState = { current: 0.8, velocity: 0 };
    for (let i = 0; i < 600; i++) s = smoothDampStep(s, 0.2, 0.12, 1 / 60);
    expect(s.current).toBeCloseTo(0.2, 3);
  });
});
