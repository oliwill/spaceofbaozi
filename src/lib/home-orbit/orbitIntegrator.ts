import { HOME_ORBIT_CONTRACT, type OrbitState } from "@/lib/home-orbit/contract";

const TAU = Math.PI * 2;
const toRadians = (degrees: number) => degrees * Math.PI / 180;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const normalizeAngle = (angle: number) => ((angle % TAU) + TAU) % TAU;

export const shortestArc = (from: number, to: number) => (
  Math.atan2(Math.sin(to - from), Math.cos(to - from))
);

export function targetAngleFromPointer(input: {
  pointerX: number;
  pointerY: number;
  footX: number;
  footY: number;
  previousTarget: number;
}): number {
  const dx = input.pointerX - input.footX;
  const dy = input.pointerY - input.footY;
  if (Math.hypot(dx, dy) < HOME_ORBIT_CONTRACT.orbit.pointerDeadZonePx) {
    return input.previousTarget;
  }
  return normalizeAngle(Math.atan2(dy, dx));
}

export function stepOrbit(state: OrbitState, dtSeconds: number): OrbitState {
  const orbit = HOME_ORBIT_CONTRACT.orbit;
  const dt = clamp(Number.isFinite(dtSeconds) ? dtSeconds : 0, 0, orbit.maxDtSeconds);
  const error = shortestArc(state.angle, state.targetAngle);
  let angularVelocity = state.angularVelocity
    + (error * orbit.spring - state.angularVelocity * orbit.damping) * dt;
  angularVelocity = clamp(
    angularVelocity,
    -orbit.maxAngularSpeedRadPerSec,
    orbit.maxAngularSpeedRadPerSec,
  );

  if (
    Math.abs(error) < toRadians(orbit.stopErrorDeg)
    && Math.abs(angularVelocity) < orbit.stopAngularVelocityRadPerSec
  ) {
    const angle = normalizeAngle(state.targetAngle);
    return { angle, angularVelocity: 0, targetAngle: angle };
  }

  return {
    angle: normalizeAngle(state.angle + angularVelocity * dt),
    angularVelocity,
    targetAngle: normalizeAngle(state.targetAngle),
  };
}
