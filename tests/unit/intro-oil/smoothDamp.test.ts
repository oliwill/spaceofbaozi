import { describe, expect, it } from "vitest";
import { isSettled, smoothDampStep, type DampState } from "@/lib/intro-oil/smoothDamp";

describe("smoothDampStep（CP5 唯一平滑层）", () => {
  it("首帧保留向前的中间进度与速度，不直接吸到目标", () => {
    const next = smoothDampStep({ current: 0, velocity: 0 }, 1, 0.12, 1 / 60);
    expect(next.current).toBeGreaterThan(0);
    expect(next.current).toBeLessThan(1);
    expect(next.velocity).toBeGreaterThan(0);
  });

  it("反向首帧也保留中间进度", () => {
    const next = smoothDampStep({ current: 0.8, velocity: 0 }, 0.2, 0.12, 1 / 60);
    expect(next.current).toBeGreaterThan(0.2);
    expect(next.current).toBeLessThan(0.8);
    expect(next.velocity).toBeLessThan(0);
  });

  it.each([
    [{ current: 0, velocity: 100 }, 1],
    [{ current: 1, velocity: -100 }, 0],
  ])("真正跨过目标才钳制位置并清零速度", (state, target) => {
    expect(smoothDampStep(state, target, 0.12, 1 / 60)).toEqual({ current: target, velocity: 0 });
  });

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
