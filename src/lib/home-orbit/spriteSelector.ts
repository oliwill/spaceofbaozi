import { HOME_ORBIT_CONTRACT } from "@/lib/home-orbit/contract";
import { normalizeAngle, shortestArc } from "@/lib/home-orbit/orbitIntegrator";

const TAU = Math.PI * 2;
const toRadians = (degrees: number) => degrees * Math.PI / 180;

function quantizeDirection(
  angle: number,
  count: number,
  previous: number,
  hysteresisDegrees: number,
): number {
  const step = TAU / count;
  const candidate = Math.round(normalizeAngle(angle) / step) % count;
  if (candidate === previous) return previous;
  return Math.abs(shortestArc(previous * step, angle)) < step / 2 + toRadians(hysteresisDegrees)
    ? previous
    : candidate;
}

export function selectDogSprite(input: {
  angle: number;
  angularVelocity: number;
  radiusX: number;
  radiusY: number;
  elapsedMovingSeconds: number;
  lastDirection: number;
}) {
  const moving = Math.abs(input.angularVelocity)
    >= HOME_ORBIT_CONTRACT.orbit.stopAngularVelocityRadPerSec;
  if (!moving) {
    return {
      direction: input.lastDirection,
      gaitFrame: HOME_ORBIT_CONTRACT.dog.contactFrame,
      moving: false,
    };
  }

  const velocityX = -input.radiusX * Math.sin(input.angle) * input.angularVelocity;
  const velocityY = input.radiusY * Math.cos(input.angle) * input.angularVelocity;
  return {
    direction: quantizeDirection(
      Math.atan2(velocityY, velocityX),
      8,
      input.lastDirection,
      HOME_ORBIT_CONTRACT.dog.directionHysteresisDeg,
    ),
    gaitFrame: Math.floor(
      input.elapsedMovingSeconds * HOME_ORBIT_CONTRACT.dog.gaitFps,
    ) % HOME_ORBIT_CONTRACT.dog.gaitFrames,
    moving: true,
  };
}

export function selectPersonGaze(input: {
  dogX: number;
  dogY: number;
  filteredAngle: number;
  dtSeconds: number;
  lastDirection: number;
}) {
  const renderedAngle = Math.atan2(input.dogY, input.dogX);
  const alpha = 1 - Math.exp(
    -Math.max(0, input.dtSeconds) / (HOME_ORBIT_CONTRACT.person.lookLagMs / 1000),
  );
  const filteredAngle = normalizeAngle(
    input.filteredAngle + shortestArc(input.filteredAngle, renderedAngle) * alpha,
  );
  return {
    direction: quantizeDirection(
      filteredAngle,
      12,
      input.lastDirection,
      HOME_ORBIT_CONTRACT.person.directionHysteresisDeg,
    ),
    filteredAngle,
  };
}
