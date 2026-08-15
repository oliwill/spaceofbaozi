import { describe, expect, it } from "vitest";
import { mapPerspective, resolveOrbitLayer } from "@/lib/home-orbit/perspectiveMapper";
import { HOME_ORBIT_CONTRACT } from "@/lib/home-orbit/contract";

// 契约来源：baozi-space-orbit-interaction-handoff-v1.0 spec/interaction-contract.json
// 坐标正方向：x 向右、y 向下、角度从右侧起顺时针；depth = sin(angle)，正值为前、负值为后。
// 层级：depth < -0.08 → behind（dog zIndex=1），depth > +0.08 → front（dog zIndex=3），
// 带内（含 ±0.08 边界）保持 previousLayer；person zIndex 恒为 2。
const RADIUS_X = 200;
const RADIUS_Y = 90; // radiusY = radiusX * 0.45

type PerspectiveCase = {
  angle: number;
  previousLayer: "behind" | "front";
  x: number;
  y: number;
  depth: number;
  dogScale: number;
  opacity: number;
  scaleX: number;
  scaleY: number;
  layer: "behind" | "front";
  zIndex: number;
};

describe("mapPerspective", () => {
  // 四个角度 checkpoint：右侧 0°、前下方 90°、左侧 180°、后上方 270°，
  // 断言值 = 公式 x=cos(angle)*radiusX，y=sin(angle)*radiusY，depth=sin(angle)，
  // dogScale=0.97+depth*0.11，shadow opacity=0.075+depth*0.025 / scaleX=0.97+depth*0.08 / scaleY=0.98+depth*0.02，
  // 以及层级：两侧带内保持 previousLayer，前/后越过 ±0.08 阈值强制切换
  it("maps the four cardinal checkpoints with plan-exact values", () => {
    const cases: PerspectiveCase[] = [
      { angle: 0, previousLayer: "behind", x: 200, y: 0, depth: 0, dogScale: 0.97, opacity: 0.075, scaleX: 0.97, scaleY: 0.98, layer: "behind", zIndex: 1 },
      { angle: Math.PI / 2, previousLayer: "behind", x: 0, y: 90, depth: 1, dogScale: 1.08, opacity: 0.1, scaleX: 1.05, scaleY: 1, layer: "front", zIndex: 3 },
      { angle: Math.PI, previousLayer: "behind", x: -200, y: 0, depth: 0, dogScale: 0.97, opacity: 0.075, scaleX: 0.97, scaleY: 0.98, layer: "behind", zIndex: 1 },
      { angle: (3 * Math.PI) / 2, previousLayer: "front", x: 0, y: -90, depth: -1, dogScale: 0.86, opacity: 0.05, scaleX: 0.89, scaleY: 0.96, layer: "behind", zIndex: 1 },
    ];

    for (const { angle, previousLayer, x, y, depth, dogScale, opacity, scaleX, scaleY, layer, zIndex } of cases) {
      const map = mapPerspective({ angle, radiusX: RADIUS_X, radiusY: RADIUS_Y, previousLayer });
      expect(map.x).toBeCloseTo(x, 10);
      expect(map.y).toBeCloseTo(y, 10);
      expect(map.depth).toBeCloseTo(depth, 10);
      expect(map.dogScale).toBeCloseTo(dogScale, 10);
      expect(map.shadow.opacity).toBeCloseTo(opacity, 10);
      expect(map.shadow.scaleX).toBeCloseTo(scaleX, 10);
      expect(map.shadow.scaleY).toBeCloseTo(scaleY, 10);
      expect(map.layer).toBe(layer);
      expect(map.zIndex).toBe(zIndex);
    }
  });

  // 迟滞带（|depth| ≤ 0.08）内保持 previousLayer，不做切换
  it("keeps the previous layer inside the hysteresis band", () => {
    expect(mapPerspective({ angle: 0, radiusX: RADIUS_X, radiusY: RADIUS_Y, previousLayer: "front" }).layer).toBe("front");
    expect(mapPerspective({ angle: 0, radiusX: RADIUS_X, radiusY: RADIUS_Y, previousLayer: "behind" }).layer).toBe("behind");
    expect(mapPerspective({ angle: 0.05, radiusX: RADIUS_X, radiusY: RADIUS_Y, previousLayer: "front" }).layer).toBe("front");
    expect(mapPerspective({ angle: -0.05, radiusX: RADIUS_X, radiusY: RADIUS_Y, previousLayer: "behind" }).layer).toBe("behind");
  });

  // 一旦越过 ±0.08 阈值必须切换 layer 与 dog zIndex（1 behind / 3 front）
  it("switches layer and zIndex after crossing the threshold", () => {
    const front = mapPerspective({ angle: 0.1, radiusX: RADIUS_X, radiusY: RADIUS_Y, previousLayer: "behind" });
    expect(front.layer).toBe("front");
    expect(front.zIndex).toBe(3);

    const back = mapPerspective({ angle: -0.1, radiusX: RADIUS_X, radiusY: RADIUS_Y, previousLayer: "front" });
    expect(back.layer).toBe("behind");
    expect(back.zIndex).toBe(1);
  });

  // 分层必须使用未舍入 depth：sin(asin(0.0800000000004)) = 0.0800000000004 > 0.08 应切 front；
  // 若先量化到 1e-12 会变成 0.08 而错误留在迟滞带内
  it("crosses front near the threshold without pre-rounding depth", () => {
    const pose = mapPerspective({ angle: Math.asin(0.0800000000004), radiusX: RADIUS_X, radiusY: RADIUS_Y, previousLayer: "behind" });
    expect(pose.layer).toBe("front");
    expect(pose.zIndex).toBe(3);
  });

  it("crosses behind near the threshold without pre-rounding depth", () => {
    const pose = mapPerspective({ angle: Math.asin(-0.0800000000004), radiusX: RADIUS_X, radiusY: RADIUS_Y, previousLayer: "front" });
    expect(pose.layer).toBe("behind");
    expect(pose.zIndex).toBe(1);
  });

  // 非有限角度（NaN / ±Infinity）回退基准比例，避免出现 NaN 尺寸
  it("falls back to dogScale 0.97 for invalid angles", () => {
    expect(mapPerspective({ angle: Number.NaN, radiusX: RADIUS_X, radiusY: RADIUS_Y, previousLayer: "behind" }).dogScale).toBe(0.97);
    expect(mapPerspective({ angle: Number.POSITIVE_INFINITY, radiusX: RADIUS_X, radiusY: RADIUS_Y, previousLayer: "behind" }).dogScale).toBe(0.97);
    expect(mapPerspective({ angle: Number.NEGATIVE_INFINITY, radiusX: RADIUS_X, radiusY: RADIUS_Y, previousLayer: "behind" }).dogScale).toBe(0.97);
  });
});

describe("resolveOrbitLayer", () => {
  it("resolves front above +0.08 and behind below -0.08", () => {
    expect(resolveOrbitLayer(1, "behind")).toBe("front");
    expect(resolveOrbitLayer(0.09, "behind")).toBe("front");
    expect(resolveOrbitLayer(-1, "front")).toBe("behind");
    expect(resolveOrbitLayer(-0.09, "front")).toBe("behind");
  });

  // 阈值采用严格不等号：±0.08 落在迟滞区内，不切换层级
  it("keeps the previous layer inside the hysteresis band", () => {
    expect(resolveOrbitLayer(0, "front")).toBe("front");
    expect(resolveOrbitLayer(0, "behind")).toBe("behind");
    expect(resolveOrbitLayer(0.05, "front")).toBe("front");
    expect(resolveOrbitLayer(-0.05, "behind")).toBe("behind");
  });

  it("uses strict thresholds at the -0.08 / +0.08 boundaries", () => {
    expect(resolveOrbitLayer(-0.08, "front")).toBe("front");
    expect(resolveOrbitLayer(0.08, "behind")).toBe("behind");
  });

  // 迟滞只吸收带内抖动；一旦越过阈值必须切换，防止左右两侧反复切层
  it("switches layers only after crossing the threshold", () => {
    expect(resolveOrbitLayer(0.07, "behind")).toBe("behind");
    expect(resolveOrbitLayer(0.09, "behind")).toBe("front");
    expect(resolveOrbitLayer(-0.07, "front")).toBe("front");
    expect(resolveOrbitLayer(-0.09, "front")).toBe("behind");
  });
});

describe("HOME_ORBIT_CONTRACT", () => {
  // 六段 exact schema（Main 确认值，与计划 Task 1 Step 3 一致）；toEqual 递归校验全部 key/value，额外字段即失败
  it("matches the confirmed six-section exact schema with no extra fields", () => {
    expect(HOME_ORBIT_CONTRACT).toEqual({
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
      dog: { gaitFps: 9, gaitFrames: 4, contactFrame: 0, directionHysteresisDeg: 9 },
      person: { lookLagMs: 110, directionHysteresisDeg: 7 },
      transition: { controlEnableDelayMs: 300 },
      reducedMotion: { positionsDeg: [35, 145, 215, 325], crossfadeMs: 180 },
    });
  });
});
