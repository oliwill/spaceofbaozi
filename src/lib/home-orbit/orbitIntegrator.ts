// 契约来源：baozi-space-orbit-interaction-handoff-v1.0 spec/implementation-notes.md §1-2
// 坐标系：x 向右、y 向下、角度从右侧起顺时针；轨道角与目标角均为弧度，angularVelocity 为 rad/s。
// 死区：指针偏移半径 < pointerDeadZonePx(90) 时保留上次 targetAngle；≥ 90px 时
// target = normalizeAngle(atan2(dy, dx))，结果回绕进 [0, TAU)。
// 停稳：|shortestArc(angle, target)| < stopErrorDeg(3.5°) 且弹簧更新后的 |angularVelocity| <
// stopAngularVelocityRadPerSec(0.06) 时 angularVelocity 归零、angle 直接贴到 targetAngle。
// 积分：dt 夹到 maxDtSeconds(0.05s)，spring/damping 驱动、速度按 maxAngularSpeedRadPerSec 封顶。

import { HOME_ORBIT_CONTRACT } from "./contract";
import type { OrbitState } from "./contract";

const TAU = Math.PI * 2;

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function normalizeAngle(angle: number): number {
  // 先取模再按符号回绕，避免 (x % TAU + TAU) % TAU 的中间加法丢失精度（ULP 偏差）
  const result = angle % TAU;
  return result < 0 ? result + TAU : result;
}

export function shortestArc(from: number, to: number): number {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

export function targetAngleFromPointer(
  state: OrbitState,
  pointerX: number,
  pointerY: number
): number {
  const { pointerDeadZonePx } = HOME_ORBIT_CONTRACT.orbit;
  if (Math.hypot(pointerX, pointerY) < pointerDeadZonePx) {
    return state.targetAngle;
  }
  return normalizeAngle(Math.atan2(pointerY, pointerX));
}

export function stepOrbit(state: OrbitState, dt: number): OrbitState {
  const {
    spring,
    damping,
    maxAngularSpeedRadPerSec,
    stopErrorDeg,
    stopAngularVelocityRadPerSec,
    maxDtSeconds,
  } = HOME_ORBIT_CONTRACT.orbit;

  const dtClamped = clamp(dt, 0, maxDtSeconds);
  const target = normalizeAngle(state.targetAngle);
  const error = shortestArc(state.angle, target);

  // 先按弹簧/阻尼更新并夹取速度，再用更新后的速度判断停稳
  const angularVelocity = clamp(
    state.angularVelocity + (error * spring - state.angularVelocity * damping) * dtClamped,
    -maxAngularSpeedRadPerSec,
    maxAngularSpeedRadPerSec
  );

  if (
    Math.abs(error) < toRad(stopErrorDeg) &&
    Math.abs(angularVelocity) < stopAngularVelocityRadPerSec
  ) {
    return { angle: target, angularVelocity: 0, targetAngle: state.targetAngle };
  }

  const angle = normalizeAngle(state.angle + angularVelocity * dtClamped);

  return { angle, angularVelocity, targetAngle: state.targetAngle };
}
