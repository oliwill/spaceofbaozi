// 契约来源：baozi-space-orbit-interaction-handoff-v1.0 spec/interaction-contract.json
// 坐标正方向：x 向右、y 向下、角度从右侧起顺时针；depth = sin(angle)，正值为前、负值为后。
// 层级迟滞：depth < backThreshold → behind（dog zIndex=1），depth > frontThreshold → front（dog zIndex=3），
// 带内（含边界）保持 previousLayer；person zIndex 恒为 2。
// 缩放公式：dogScale = scaleBase + depth * scaleDepth；非法角度回退 fallbackScale。

export type OrbitLayer = "behind" | "front";

export type OrbitState = {
  angle: number;
  angularVelocity: number;
  targetAngle: number;
};

export type ShadowPose = {
  opacity: number;
  scaleX: number;
  scaleY: number;
};

export type PerspectivePose = {
  x: number;
  y: number;
  depth: number;
  dogScale: number;
  shadow: ShadowPose;
  layer: OrbitLayer;
  zIndex: number;
};

export const HOME_ORBIT_CONTRACT = {
  orbit: {
    radiusXCss: "clamp(150px, 17vw, 230px)",
    radiusYRatio: 0.45,
    startAngleDeg: 35,
    restAngleDeg: 35,
    pointerDeadZonePx: 90,
    spring: 22,
    damping: 9.5,
    maxAngularSpeedRadPerSec: 3,
    stopErrorDeg: 3.5,
    stopAngularVelocityRadPerSec: 0.06,
    maxDtSeconds: 0.05,
    pointerLeaveDelayMs: 900,
  },
  perspective: {
    scaleBase: 0.97,
    scaleDepth: 0.11,
    fallbackScale: 0.97,
    backThreshold: -0.08,
    frontThreshold: 0.08,
    backZIndex: 1,
    personZIndex: 2,
    frontZIndex: 3,
  },
  dog: {
    gaitFps: 9,
    gaitFrames: 4,
    contactFrame: 0,
    directionHysteresisDeg: 9,
  },
  person: {
    lookLagMs: 110,
    directionHysteresisDeg: 7,
  },
  transition: {
    controlEnableDelayMs: 300,
  },
  reducedMotion: {
    positionsDeg: [35, 145, 215, 325],
    crossfadeMs: 180,
  },
} as const;
