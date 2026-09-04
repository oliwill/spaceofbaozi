import { describe, expect, it } from "vitest";
import { stateAtProgress } from "@/lib/intro-oil/timeline";

describe("stateAtProgress（CP5 主时间线）", () => {
  it("进度钳制在 0..1", () => {
    expect(stateAtProgress(-0.5).maskOpacity).toBe(0);
    expect(stateAtProgress(2).maskOpacity).toBe(1);
  });

  it("0% 时全部角色隐藏、遮罩关闭", () => {
    const s = stateAtProgress(0);
    expect(s.ball.visible).toBe(false);
    expect(s.jiale.visible).toBe(false);
    expect(s.person.visible).toBe(false);
    expect(s.leashVisible).toBe(false);
    expect(s.maskOpacity).toBe(0);
  });

  it("横向位移单调不减（左进右出，不从右侧回进）", () => {
    let prev = stateAtProgress(0);
    for (let i = 1; i <= 200; i++) {
      const cur = stateAtProgress(i / 200);
      expect(cur.ball.xVw).toBeGreaterThanOrEqual(prev.ball.xVw);
      expect(cur.jiale.xVw).toBeGreaterThanOrEqual(prev.jiale.xVw);
      expect(cur.person.xVw).toBeGreaterThanOrEqual(prev.person.xVw);
      prev = cur;
    }
  });

  it("退出顺序：球 → 嘉乐 → 人物（D-122 / motionContract.exitOrder）", () => {
    expect(stateAtProgress(0.81).ball.visible).toBe(false);
    expect(stateAtProgress(0.83).jiale.visible).toBe(true);
    expect(stateAtProgress(0.87).jiale.visible).toBe(false);
    expect(stateAtProgress(0.9).person.visible).toBe(true);
    expect(stateAtProgress(0.96).person.visible).toBe(false);
  });

  it("人物帧序：neutral → run → pulled-lean → fall-slide-right", () => {
    expect(stateAtProgress(0.34).person.frameId).toBe("neutral");
    expect(stateAtProgress(0.45).person.frameId).toBe("run");
    expect(stateAtProgress(0.65).person.frameId).toBe("pulled-lean");
    expect(stateAtProgress(0.9).person.frameId).toBe("fall-slide-right");
  });

  it("嘉乐跑循环帧索引始终在 0..3", () => {
    for (let i = 0; i <= 100; i++) {
      const f = stateAtProgress(i / 100).jiale.frameIndex;
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThanOrEqual(3);
    }
  });

  it("遮罩只在 95% 之后进入，100% 时完全不透明", () => {
    expect(stateAtProgress(0.94).maskOpacity).toBe(0);
    expect(stateAtProgress(0.975).maskOpacity).toBeCloseTo(0.5, 1);
    expect(stateAtProgress(1).maskOpacity).toBe(1);
  });

  it("牵引绳在人物摔倒完全退出后隐藏", () => {
    expect(stateAtProgress(0.5).leashVisible).toBe(true);
    expect(stateAtProgress(0.96).leashVisible).toBe(false);
  });
});
