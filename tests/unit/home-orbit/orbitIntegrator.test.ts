import { describe, expect, it } from "vitest";
import { normalizeAngle, shortestArc, stepOrbit, targetAngleFromPointer } from "@/lib/home-orbit/orbitIntegrator";
import { HOME_ORBIT_CONTRACT, type OrbitState } from "@/lib/home-orbit/contract";

// 契约来源：baozi-space-orbit-interaction-handoff-v1.0 spec/implementation-notes.md §1-2 与 interaction-contract.json
// 坐标系：x 向右、y 向下、角度从右侧起顺时针；轨道角与目标角均为弧度，angularVelocity 为 rad/s。
// 死区：指针偏移半径 < pointerDeadZonePx(90) 时保留上次 targetAngle；≥ 90px 时
// target = normalizeAngle(atan2(dy, dx))，结果回绕进 [0, TAU)。
// 最短角：error = atan2(sin(to - from), cos(to - from))，跨 0° / 360° 走短弧，输出域 (-π, π]。
// 停稳：|shortestArc(angle, target)| < stopErrorDeg(3.5° ≈ 0.0611 rad) 且 |angularVelocity| <
// stopAngularVelocityRadPerSec(0.06) 时 angularVelocity 归零、angle 直接贴到 targetAngle；
// 判定在积分之后（先积分后检查）。速度 clamp 到 ±maxAngularSpeedRadPerSec(3)。
// 积分：dt 夹到 maxDtSeconds(0.05s)，500ms 输入必须与 50ms 输入产生完全相同的结果。

const TAU = Math.PI * 2;
const deg = (value: number): number => (value * Math.PI) / 180;

describe("shortestArc", () => {
  // 350° → 10° 的最短路径是 +20°（经 0° 顺向），不是 -340° 的长路径
  it("returns the shortest signed arc from 350° to 10° as +20°", () => {
    expect(shortestArc(deg(350), deg(10))).toBeCloseTo(deg(20), 10);
    expect(shortestArc(deg(10), deg(350))).toBeCloseTo(deg(-20), 10);
  });
});

describe("targetAngleFromPointer", () => {
  // 指针坐标以轨道圆心（人物脚底）为原点；半径 < 90px 属死区，targetAngle 原样保留
  it("keeps the current target inside the 90px dead zone", () => {
    const state: OrbitState = { angle: deg(35), angularVelocity: 0, targetAngle: deg(145) };
    expect(targetAngleFromPointer(state, 30, 40)).toBe(state.targetAngle); // 半径 50 < 90
    expect(targetAngleFromPointer(state, 89, 0)).toBe(state.targetAngle); // 半径 89，仍在死区内
  });

  // 死区外按 normalizeAngle(atan2(dy, dx)) 映射：右 0°、下 90°（顺时针为正）、左 180°、上 270°，
  // 结果一律回绕进 [0, TAU)；spec 用 >= 判边界，恰在 90px 时即映射
  it("maps the pointer at or beyond 90px via atan2 to a clockwise angle", () => {
    const state: OrbitState = { angle: deg(35), angularVelocity: 0, targetAngle: deg(145) };
    expect(targetAngleFromPointer(state, 90, 0)).toBeCloseTo(0, 10); // 恰在 90px 边界即映射
    expect(targetAngleFromPointer(state, 150, 0)).toBeCloseTo(0, 10);
    expect(targetAngleFromPointer(state, 0, 150)).toBeCloseTo(deg(90), 10);
    expect(targetAngleFromPointer(state, -150, 0)).toBeCloseTo(deg(180), 10);
    expect(targetAngleFromPointer(state, 0, -150)).toBeCloseTo(deg(270), 10);
  });
});

describe("stepOrbit", () => {
  // maxDtSeconds = 0.05：500ms 输入必须与 50ms 输入积分出完全相同的状态
  it("clamps a 500ms step to the 50ms max dt", () => {
    const state: OrbitState = { angle: deg(35), angularVelocity: 0, targetAngle: deg(215) };
    expect(stepOrbit(state, 0.5)).toEqual(stepOrbit(state, HOME_ORBIT_CONTRACT.orbit.maxDtSeconds));
  });

  // 未饱和输入（v 不会被 clamp）：v = error*spring*dt = 1*22*(1/60) = 0.3666667，
  // angle = v*dt = 0.3666667*(1/60) = 0.0061111；误差仍远大于 3.5°，不触发停稳
  it("integrates a normal unsaturated step with plan-exact spring/damping values", () => {
    const next = stepOrbit({ angle: 0, angularVelocity: 0, targetAngle: 1 }, 1 / 60);
    expect(next.angularVelocity).toBeCloseTo(0.36666666666666664, 10);
    expect(next.angle).toBeCloseTo(0.0061111111111111106, 10);
    expect(next.targetAngle).toBe(1);
  });

  // 大误差：v = π*22*0.05 = 3.4558 → clamp 到 maxAngularSpeedRadPerSec(3)
  it("clamps angular velocity to maxAngularSpeedRadPerSec for a large error", () => {
    const next = stepOrbit({ angle: 0, angularVelocity: 0, targetAngle: Math.PI }, 0.05);
    expect(next.angularVelocity).toBe(3);
    expect(next.angle).toBeCloseTo(0.15, 10);
  });

  // 误差 2° < stopErrorDeg(3.5°) 且速度 0.02 < stopAngularVelocityRadPerSec(0.06) → 归零并贴 target；
  // 越过 target 后反向回摆（速度指向 target）同样停稳
  it("settles: zeroes angularVelocity and snaps angle onto the target", () => {
    const target = deg(35);
    const next = stepOrbit({ angle: deg(33), angularVelocity: 0.02, targetAngle: target }, 1 / 60);
    expect(next.angle).toBe(target);
    expect(next.angularVelocity).toBe(0);
    expect(next.targetAngle).toBe(target);

    const overshoot = stepOrbit({ angle: deg(37), angularVelocity: -0.02, targetAngle: target }, 1 / 60);
    expect(overshoot.angle).toBe(target);
    expect(overshoot.angularVelocity).toBe(0);
  });

  // 顺序回归：入口 v=0.061 ≥ 0.06 不满足预检查，但积分后
  // v = 0.061 + (0.01*22 - 0.061*9.5)*0.05 = 0.043025 < 0.06 且误差 ≈ 0.00785 < 3.5°，
  // 因此按计划（先积分后判定）必须 snap 到 target 并归零；预检查实现会错误地不 snap
  it("snaps after integration drops velocity below the settle threshold", () => {
    const target = 0.01;
    const next = stepOrbit({ angle: 0, angularVelocity: 0.061, targetAngle: target }, 0.05);
    expect(next.angle).toBe(target);
    expect(next.angularVelocity).toBe(0);
    expect(next.targetAngle).toBe(target);
  });

  // 误差 5° > 3.5° 或速度 0.2 > 0.06：任一条件不满足就不停稳
  it("keeps integrating while error or speed exceed the settle thresholds", () => {
    const target = deg(35);
    const bigError = stepOrbit({ angle: deg(30), angularVelocity: 0, targetAngle: target }, 1 / 60);
    expect(bigError.angle).not.toBe(target);

    const fast = stepOrbit({ angle: deg(34), angularVelocity: 0.2, targetAngle: target }, 1 / 60);
    expect(fast.angle).not.toBe(target);
    expect(fast.angularVelocity).not.toBe(0);
  });

  // 严格阈值：|v| 恰为 0.06 或 |error| 恰为 3.5° 时都不停稳（dt=0 状态不变，纯边界判定）
  it("does not settle at the exact thresholds (velocity 0.06, error 3.5°)", () => {
    const vEdge = stepOrbit({ angle: 0, angularVelocity: 0.06, targetAngle: 0.01 }, 0);
    expect(vEdge.angle).toBe(0);
    expect(vEdge.angularVelocity).toBe(0.06);

    const eEdge = stepOrbit({ angle: 0, angularVelocity: 0, targetAngle: deg(3.5) }, 0);
    expect(eEdge.angle).toBe(0);
    expect(eEdge.angularVelocity).toBe(0);
  });
});

describe("normalizeAngle", () => {
  // 负角向上回绕进 [0, TAU)；-TAU 折叠整圈后回到 0
  it("wraps negative angles into [0, TAU)", () => {
    expect(normalizeAngle(-0.5)).toBeCloseTo(TAU - 0.5, 10);
    expect(normalizeAngle(-TAU)).toBeCloseTo(0, 10);
  });

  // TAU 边界：整数圈折叠回 0，余角保留，结果落在半开区间 [0, TAU)
  it("wraps full-turn (TAU) boundaries back to 0", () => {
    expect(normalizeAngle(0)).toBe(0);
    expect(normalizeAngle(TAU)).toBe(0);
    expect(normalizeAngle(2 * TAU)).toBe(0);
    expect(normalizeAngle(TAU + 0.25)).toBeCloseTo(0.25, 10);
    expect(normalizeAngle(TAU - 0.25)).toBeCloseTo(TAU - 0.25, 10);
  });
});
