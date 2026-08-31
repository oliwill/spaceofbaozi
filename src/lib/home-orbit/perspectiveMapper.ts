import {
  HOME_ORBIT_CONTRACT,
  type OrbitLayer,
  type PerspectivePose,
} from "@/lib/home-orbit/contract";

const { perspective } = HOME_ORBIT_CONTRACT;
const round = (value: number) => {
  const result = Math.round(value * 1e12) / 1e12;
  return Object.is(result, -0) ? 0 : result;
};

export function resolveOrbitLayer(depth: number, previousLayer: OrbitLayer): OrbitLayer {
  if (previousLayer === "behind") {
    return depth > perspective.frontThreshold ? "front" : "behind";
  }
  return depth < perspective.backThreshold ? "behind" : "front";
}

export function mapPerspective(input: {
  angle: number;
  radiusX: number;
  radiusY: number;
  previousLayer: OrbitLayer;
}): PerspectivePose {
  const valid = Number.isFinite(input.angle)
    && Number.isFinite(input.radiusX)
    && Number.isFinite(input.radiusY);
  const angle = Number.isFinite(input.angle) ? input.angle : 0;
  const radiusX = Number.isFinite(input.radiusX) ? input.radiusX : 0;
  const radiusY = Number.isFinite(input.radiusY) ? input.radiusY : 0;
  const depth = valid ? Math.sin(angle) : 0;
  const layer = resolveOrbitLayer(depth, input.previousLayer);

  return {
    x: round(Math.cos(angle) * radiusX),
    y: round(depth * radiusY),
    depth: round(depth),
    dogScale: valid
      ? round(perspective.scaleBase + depth * perspective.scaleDepth)
      : perspective.fallbackScale,
    layer,
    zIndex: layer === "behind" ? perspective.backZIndex : perspective.frontZIndex,
    shadow: {
      opacity: round(0.075 + depth * 0.025),
      scaleX: round(0.97 + depth * 0.08),
      scaleY: round(0.98 + depth * 0.02),
    },
  };
}
