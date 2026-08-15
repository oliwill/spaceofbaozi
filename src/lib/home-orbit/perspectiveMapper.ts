import { HOME_ORBIT_CONTRACT } from "./contract";
import type { OrbitLayer, PerspectivePose } from "./contract";

/**
 * 层级迟滞：depth 越过 ±0.08 才切换，带内（含边界）保持 previousLayer。
 */
export function resolveOrbitLayer(depth: number, previousLayer: OrbitLayer): OrbitLayer {
  const { backThreshold, frontThreshold } = HOME_ORBIT_CONTRACT.perspective;
  if (depth < backThreshold) {
    return "behind";
  }
  if (depth > frontThreshold) {
    return "front";
  }
  return previousLayer;
}

export function mapPerspective(input: {
  angle: number;
  radiusX: number;
  radiusY: number;
  previousLayer: OrbitLayer;
}): PerspectivePose {
  const { perspective } = HOME_ORBIT_CONTRACT;
  const angleValid = Number.isFinite(input.angle);

  // 未舍入的连续公式：x=cos(angle)*radiusX，y=sin(angle)*radiusY，depth=sin(angle)
  const depth = angleValid ? Math.sin(input.angle) : 0;
  const x = angleValid ? Math.cos(input.angle) * input.radiusX : 0;
  const y = angleValid ? Math.sin(input.angle) * input.radiusY : 0;
  const dogScale = angleValid
    ? perspective.scaleBase + depth * perspective.scaleDepth
    : perspective.fallbackScale;

  const layer = resolveOrbitLayer(depth, input.previousLayer);
  const zIndex = layer === "behind" ? perspective.backZIndex : perspective.frontZIndex;

  return {
    x,
    y,
    depth,
    dogScale,
    shadow: {
      opacity: 0.075 + depth * 0.025,
      scaleX: 0.97 + depth * 0.08,
      scaleY: 0.98 + depth * 0.02,
    },
    layer,
    zIndex,
  };
}
