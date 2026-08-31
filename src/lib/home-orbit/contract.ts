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
  layer: OrbitLayer;
  zIndex: 1 | 3;
  shadow: ShadowPose;
};

export const HOME_ORBIT_CONTRACT = {
  orbit: {
    radiusXRatio: 0.17,
    radiusXMinPx: 150,
    radiusXMaxPx: 230,
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
    directionCrossfadeMs: 100,
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
    revealStartDepth: -0.65,
    revealRadiusRatio: 0.2,
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
