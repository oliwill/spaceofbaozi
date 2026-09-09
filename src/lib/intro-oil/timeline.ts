// v2 启动页主时间线（asset-manifest.v2.json introTimeline + D-132 新结尾）。
// 纯函数：同一归一化进度决定球、嘉乐、人物、牵引绳、草地退出与 Home v2 交接层。
// 帧数/锚点不在这里复制——frameIndex 由本模块按局部进度算出序号，
// 网格几何（columns/rows/frameSize）与锚点由运行时从 v2 Manifest 读取。

export type PersonSeq = "person-pulled-run-right" | "person-stumble-fall-exit-right" | "person-slide-in-rise-stand";
export type DogSeq = "dog-chase-right" | "dog-look-up-settle";

export interface V2AnchorsVw {
  /** 首页冻结锚点（D-120）：人物脚底与嘉乐接地点，视口宽百分比 */
  personHomeVw: number;
  dogHomeVw: number;
}

export const HOME_ANCHORS: Record<"desktop" | "mobile", V2AnchorsVw> = {
  desktop: { personHomeVw: 68.77, dogHomeVw: 81.85 }, // 1440×900: (991.06, 1178.61)
  mobile: { personHomeVw: 46.09, dogHomeVw: 76.48 }, // 390×844: (179.73, 298.28)
};

export const SEG = {
  ballEnter: [0.02, 0.08],
  ballExit: [0.08, 0.25],
  dogChase: [0.08, 0.9],
  personRun: [0.25, 0.65],
  personFall: [0.65, 0.82],
  personRise: [0.82, 1],
  personSlideEnd: 0.88, // 滑入到位（home 锚点）的进度点，之后原地起身
  dogSettle: [0.94, 1],
  dogSettleEnd: 0.97,
  grassOut: [0.78, 0.82], // manifest environment.transitionOut
  plate: [0.98, 1],
} as const;

export interface V2State {
  ball: { xVw: number; bounceT: number; visible: boolean };
  dog: { xVw: number; local: number; seqId: DogSeq; visible: boolean };
  person: { xVw: number; local: number; seqId: PersonSeq; visible: boolean };
  leash: { visible: boolean; taut: number };
  grassOut: number;
  plateOpacity: number;
}

function lerp(p: number, range: readonly [number, number], from: number, to: number): number {
  const t = Math.min(1, Math.max(0, (p - range[0]) / (range[1] - range[0])));
  return from + (to - from) * t;
}

function local(p: number, range: readonly [number, number]): number {
  return Math.min(1, Math.max(0, (p - range[0]) / (range[1] - range[0])));
}

/** 球的弹跳相位：行进 10vw 一个弹跳周期 */
export function ballBounceT(xVw: number): number {
  return (Math.max(0, xVw + 10) / 10) % 1;
}

export function stateAtProgress(raw: number, home: V2AnchorsVw = HOME_ANCHORS.desktop): V2State {
  const p = Math.min(1, Math.max(0, raw));

  // 球：左侧弹入 → 右弹出走，0.25 后离场
  const ballX = p <= SEG.ballEnter[0] ? -10
    : p <= SEG.ballEnter[1] ? lerp(p, SEG.ballEnter, -10, 22)
    : p <= SEG.ballExit[1] ? lerp(p, SEG.ballExit, 22, 115)
    : 115;

  // 嘉乐追逐：0.08 左进，0.90 右出；0.94 起从右侧返回坐下（overshoot 后回来）
  const dogChaseX = p <= SEG.dogChase[0] ? -12
    : p <= 0.5 ? lerp(p, [SEG.dogChase[0], 0.5], -12, 40)
    : p <= SEG.dogChase[1] ? lerp(p, [0.5, SEG.dogChase[1]], 40, 118)
    : 118;
  const dogSettling = p > SEG.dogSettle[0];
  const dogX = dogSettling ? lerp(p, [SEG.dogSettle[0], SEG.dogSettleEnd], 112, home.dogHomeVw) : dogChaseX;

  // 人物：被拽跑（左进右行）→ 摔倒滑出右界 → 从左侧高速滑入减速到首页锚点、原地起身站定
  const personRunX = p <= SEG.personRun[0] ? -15 : lerp(p, SEG.personRun, -15, 50);
  const personFallX = lerp(p, SEG.personFall, 50, 118);
  const personRiseX = p <= SEG.personSlideEnd ? lerp(p, [SEG.personRise[0], SEG.personSlideEnd], -18, home.personHomeVw) : home.personHomeVw;

  let personSeq: PersonSeq;
  let personLocal: number;
  let personX: number;
  let personVisible: boolean;
  if (p <= SEG.personRun[0]) {
    personSeq = "person-pulled-run-right"; personLocal = 0; personX = -15; personVisible = false;
  } else if (p <= SEG.personRun[1]) {
    personSeq = "person-pulled-run-right"; personLocal = local(p, SEG.personRun); personX = personRunX; personVisible = true;
  } else if (p <= SEG.personFall[1]) {
    personSeq = "person-stumble-fall-exit-right"; personLocal = local(p, SEG.personFall); personX = personFallX; personVisible = true;
  } else {
    personSeq = "person-slide-in-rise-stand"; personLocal = local(p, SEG.personRise); personX = personRiseX; personVisible = true;
  }

  const dogVisible = p > SEG.dogChase[0] && p <= SEG.dogChase[1] ? true : dogSettling;

  // 牵引绳：人物被拽跑与摔倒期间可见（绳子随摔倒消失），紧绷度摔倒段渐松
  const leashVisible = personVisible && personSeq !== "person-slide-in-rise-stand" && p > SEG.personRun[0] && p <= SEG.personFall[1];
  const taut = p <= SEG.personFall[0] ? 1 : 1 - local(p, SEG.personFall) * 0.7;

  return {
    ball: { xVw: ballX, bounceT: ballBounceT(ballX), visible: p > SEG.ballEnter[0] && p <= SEG.ballExit[1] },
    dog: {
      xVw: dogX,
      local: dogSettling ? local(p, SEG.dogSettle) : local(p, [SEG.dogChase[0], SEG.dogChase[1]]),
      seqId: dogSettling ? "dog-look-up-settle" : "dog-chase-right",
      visible: dogVisible,
    },
    person: { xVw: personX, local: personLocal, seqId: personSeq, visible: personVisible },
    leash: { visible: leashVisible, taut },
    grassOut: p <= SEG.grassOut[0] ? 0 : local(p, SEG.grassOut),
    plateOpacity: p <= SEG.plate[0] ? 0 : local(p, SEG.plate),
  };
}
