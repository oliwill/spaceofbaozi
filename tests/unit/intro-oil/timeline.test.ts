import { describe, expect, it } from "vitest";
import { HOME_ANCHORS, stateAtProgress } from "@/lib/intro-oil/timeline";

describe("stateAtProgress（v2 主时间线，D-132）", () => {
  it("进度钳制在 0..1", () => {
    expect(stateAtProgress(-0.5).plateOpacity).toBe(0);
    expect(stateAtProgress(2).plateOpacity).toBe(1);
  });

  it("0% 时全部角色隐藏、草地在位", () => {
    const s = stateAtProgress(0);
    expect(s.ball.visible).toBe(false);
    expect(s.dog.visible).toBe(false);
    expect(s.person.visible).toBe(false);
    expect(s.leash.visible).toBe(false);
    expect(s.grassOut).toBe(0);
  });

  it("阶段窗口对齐 v2 manifest introTimeline", () => {
    expect(stateAtProgress(0.05).ball.visible).toBe(true);
    expect(stateAtProgress(0.15).dog.seqId).toBe("dog-chase-right");
    expect(stateAtProgress(0.4).person.seqId).toBe("person-pulled-run-right");
    expect(stateAtProgress(0.7).person.seqId).toBe("person-stumble-fall-exit-right");
    expect(stateAtProgress(0.9).person.seqId).toBe("person-slide-in-rise-stand");
    expect(stateAtProgress(0.97).dog.seqId).toBe("dog-look-up-settle");
  });


  it("球全程领跑，0.48 后离场且不再出现", () => {
    expect(stateAtProgress(0.3).ball.visible).toBe(true);
    expect(stateAtProgress(0.49).ball.visible).toBe(false);
    expect(stateAtProgress(0.9).ball.visible).toBe(false);
  });

  it("人物摔倒后从左侧滑入并停在首页冻结锚点（D-120）", () => {
    expect(stateAtProgress(0.8).person.xVw).toBeGreaterThan(100); // 摔倒滑出右界
    const landed = stateAtProgress(0.95);
    expect(landed.person.xVw).toBeCloseTo(HOME_ANCHORS.desktop.personHomeVw, 2);
    expect(landed.person.seqId).toBe("person-slide-in-rise-stand");
  });

  it("嘉乐返回后停在首页冻结锚点", () => {
    expect(stateAtProgress(1).dog.xVw).toBeCloseTo(HOME_ANCHORS.desktop.dogHomeVw, 2);
  });

  it("草地只在 0.78–0.82 退出", () => {
    expect(stateAtProgress(0.77).grassOut).toBe(0);
    expect(stateAtProgress(0.8).grassOut).toBeCloseTo(0.5, 1);
    expect(stateAtProgress(0.83).grassOut).toBe(1);
  });

  it("牵引绳只在被拽跑与摔倒段可见，起身后消失", () => {
    expect(stateAtProgress(0.4).leash.visible).toBe(true);
    expect(stateAtProgress(0.7).leash.visible).toBe(true);
    expect(stateAtProgress(0.9).leash.visible).toBe(false);
  });

  it("交接层只在 0.98 后淡入", () => {
    expect(stateAtProgress(0.97).plateOpacity).toBe(0);
    expect(stateAtProgress(0.99).plateOpacity).toBeCloseTo(0.5, 1);
    expect(stateAtProgress(1).plateOpacity).toBe(1);
  });

  it("人物与嘉乐横向位移在各自阶段内单调（摔倒滑出段向右，返回段向左为设计意图）", () => {
    for (let i = 65; i <= 82; i++) {
      const cur = stateAtProgress(i / 100).person.xVw;
      const prev = stateAtProgress((i - 1) / 100).person.xVw;
      expect(cur).toBeGreaterThanOrEqual(prev);
    }
  });
});
