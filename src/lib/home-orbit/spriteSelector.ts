// 契约来源：baozi-space-orbit-interaction-handoff-v1.0 spec/implementation-notes.md §3 与 interaction-contract.json
// 坐标系：x 向右、y 向下、角度从右侧起顺时针（弧度）；atan2(dy, dx) 输出同此约定。
// DOG：方向取自椭圆切线速度 atan2(vy, vx)，vx = -radiusX*sin(angle)*angularVelocity、
// vy = radiusY*cos(angle)*angularVelocity；|angularVelocity| < stopAngularVelocityRadPerSec(0.06)
// 视为停止（严格 <）：保留 lastDirection、gaitFrame 归零 contactFrame；否则步态 9fps 四帧。
// PERSON：gaze 目标 = atan2(renderedDogY, renderedDogX)——渲染后的狗偏移，而非轨道
// targetAngle / 指针；110ms 一阶低通 filteredAngle += shortestArc(prev, target) * (1 - exp(-dt/lag))，
// 结果回绕 [0, 2π)。共享私有 quantize：8/12 方向、9°/7° 迟滞（越过当前扇区边界 ±halfSector
// 再多 hysteresis 才切换，回落须回到边界以内 hysteresis）。

import { HOME_ORBIT_CONTRACT } from "./contract";
import { normalizeAngle, shortestArc } from "./orbitIntegrator";

const TAU = Math.PI * 2;

const DOG_DIRECTION_COUNT = 8; // 45° per direction
const PERSON_DIRECTION_COUNT = 12; // 30° per direction

/**
 * 方向量化 + 迟滞：角度处于以 lastDirection 扇区中心为基准、
 * 向两侧各扩展 halfSector + hysteresis 的范围内时保持 lastDirection，
 * 越界则切换到最近扇区 round(angle/sectorWidth) mod directionCount。
 */
function quantize(
  angle: number,
  directionCount: number,
  hysteresisDeg: number,
  lastDirection: number
): number {
  const sectorWidth = TAU / directionCount;
  const normalized = normalizeAngle(angle);
  const center = normalizeAngle(lastDirection * sectorWidth);
  const delta = shortestArc(center, normalized);
  if (Math.abs(delta) <= sectorWidth / 2 + (hysteresisDeg * Math.PI) / 180) {
    return lastDirection;
  }
  return Math.round(normalized / sectorWidth) % directionCount;
}

type DogSpriteInput = {
  angle: number;
  angularVelocity: number;
  radiusX: number;
  radiusY: number;
  elapsedMovingSeconds: number;
  lastDirection: number;
};

type DogSpriteResult = {
  direction: number;
  gaitFrame: number;
  moving: boolean;
};

export function selectDogSprite(input: DogSpriteInput): DogSpriteResult {
  const { dog, orbit } = HOME_ORBIT_CONTRACT;

  if (Math.abs(input.angularVelocity) < orbit.stopAngularVelocityRadPerSec) {
    return {
      direction: input.lastDirection,
      gaitFrame: dog.contactFrame,
      moving: false,
    };
  }

  const vx = -input.radiusX * Math.sin(input.angle) * input.angularVelocity;
  const vy = input.radiusY * Math.cos(input.angle) * input.angularVelocity;
  const velocityAngle = Math.atan2(vy, vx);

  const direction = quantize(
    velocityAngle,
    DOG_DIRECTION_COUNT,
    dog.directionHysteresisDeg,
    input.lastDirection
  );
  const gaitFrame =
    Math.floor(input.elapsedMovingSeconds * dog.gaitFps) % dog.gaitFrames;

  return { direction, gaitFrame, moving: true };
}

type PersonGazeInput = {
  dogX: number;
  dogY: number;
  filteredAngle: number;
  dtSeconds: number;
  lastDirection: number;
};

type PersonGazeResult = {
  direction: number;
  filteredAngle: number;
};

export function selectPersonGaze(input: PersonGazeInput): PersonGazeResult {
  const { person } = HOME_ORBIT_CONTRACT;

  const target = normalizeAngle(Math.atan2(input.dogY, input.dogX));
  const lagSeconds = person.lookLagMs / 1000;
  const alpha = 1 - Math.exp(-input.dtSeconds / lagSeconds);
  const filteredAngle = normalizeAngle(
    input.filteredAngle + shortestArc(input.filteredAngle, target) * alpha
  );

  const direction = quantize(
    filteredAngle,
    PERSON_DIRECTION_COUNT,
    person.directionHysteresisDeg,
    input.lastDirection
  );

  return { direction, filteredAngle };
}
