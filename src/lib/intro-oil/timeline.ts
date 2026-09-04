// CP5 主时间线（oil-motion 计划 §CP5 建议主时间线 + D-122 球先于嘉乐出画）。
// 纯函数：同一个归一化进度同时决定球、嘉乐、人物、牵引绳、遮罩与 Home v2 交接层。

export interface TimelineConfig {
  /** 各角色横向位置的视口宽度百分比锚点 */
  ball: { enter: [number, number]; leadEnd: number; exitEnd: number };
  jiale: { enter: [number, number]; chaseEnd: number; exitEnd: number };
  person: { enter: [number, number]; dragEnd: number; pulledEnd: number; stumbleEnd: number; exitEnd: number };
  /** 嘉乐跑循环：每 strideVw 视口宽度换一帧 */
  jialeStrideVw: number;
}

export const TIMELINE: TimelineConfig = {
  ball: { enter: [-12, 28], leadEnd: 72, exitEnd: 112 },
  jiale: { enter: [-15, 45], chaseEnd: 68, exitEnd: 115 },
  person: { enter: [-15, 15], dragEnd: 40, pulledEnd: 52, stumbleEnd: 64, exitEnd: 118 },
  jialeStrideVw: 9,
};

export const P = {
  ballEnter: [0.08, 0.22],
  ballLead: [0.22, 0.7],
  ballExit: [0.7, 0.8],
  jialeEnter: [0.16, 0.52],
  jialeChase: [0.52, 0.72],
  jialeExit: [0.72, 0.86],
  personEnter: [0.3, 0.38],
  personDrag: [0.38, 0.55],
  personPulled: [0.55, 0.72],
  personStumble: [0.72, 0.8],
  personFall: [0.8, 0.95],
  mask: [0.95, 0.98],
  plate: [0.98, 1],
} as const;

export type PersonFrameId = "neutral" | "run" | "pulled-lean" | "fall-slide-right";

export interface ActorState {
  /** 角色 ground 锚点的视口宽度百分比横坐标（负值 / 超 100 表示屏外） */
  xVw: number;
  frameIndex: number;
  visible: boolean;
}

export interface IntroTimelineState {
  ball: { xVw: number; visible: boolean };
  jiale: ActorState;
  person: ActorState & { frameId: PersonFrameId };
  leashVisible: boolean;
  maskOpacity: number;
  /** Home v2 定帧交接层（CP6：遮罩盖满后才显现，避免角色瞬间重现） */
  plateOpacity: number;
}

function lerp(p: number, range: readonly [number, number], from: number, to: number): number {
  const t = Math.min(1, Math.max(0, (p - range[0]) / (range[1] - range[0])));
  return from + (to - from) * t;
}

function ballXVw(p: number, cfg: TimelineConfig): number {
  if (p <= P.ballEnter[0]) return cfg.ball.enter[0];
  if (p <= P.ballEnter[1]) return lerp(p, P.ballEnter, cfg.ball.enter[0], cfg.ball.enter[1]);
  if (p <= P.ballLead[1]) return lerp(p, P.ballLead, cfg.ball.enter[1], cfg.ball.leadEnd);
  if (p <= P.ballExit[1]) return lerp(p, P.ballExit, cfg.ball.leadEnd, cfg.ball.exitEnd);
  return cfg.ball.exitEnd;
}

function jialeXVw(p: number, cfg: TimelineConfig): number {
  if (p <= P.jialeEnter[0]) return cfg.jiale.enter[0];
  if (p <= P.jialeEnter[1]) return lerp(p, P.jialeEnter, cfg.jiale.enter[0], cfg.jiale.enter[1]);
  if (p <= P.jialeChase[1]) return lerp(p, P.jialeChase, cfg.jiale.enter[1], cfg.jiale.chaseEnd);
  if (p <= P.jialeExit[1]) return lerp(p, P.jialeExit, cfg.jiale.chaseEnd, cfg.jiale.exitEnd);
  return cfg.jiale.exitEnd;
}

function personXVw(p: number, cfg: TimelineConfig): number {
  if (p <= P.personEnter[0]) return cfg.person.enter[0];
  if (p <= P.personEnter[1]) return lerp(p, P.personEnter, cfg.person.enter[0], cfg.person.enter[1]);
  if (p <= P.personPulled[0]) return lerp(p, P.personDrag, cfg.person.enter[1], cfg.person.dragEnd);
  if (p <= P.personStumble[0]) return lerp(p, P.personPulled, cfg.person.dragEnd, cfg.person.pulledEnd);
  if (p <= P.personFall[0]) return lerp(p, P.personStumble, cfg.person.pulledEnd, cfg.person.stumbleEnd);
  if (p <= P.personFall[1]) return lerp(p, P.personFall, cfg.person.stumbleEnd, cfg.person.exitEnd);
  return cfg.person.exitEnd;
}

const PERSON_FRAME_ORDER: PersonFrameId[] = ["neutral", "run", "pulled-lean", "fall-slide-right"];

function personFrame(p: number): PersonFrameId {
  if (p < P.personDrag[0]) return "neutral";
  if (p < P.personPulled[0]) return "run";
  if (p < P.personFall[0]) return "pulled-lean";
  return "fall-slide-right";
}

/** p 归一化进度 0..1，输出全部场景元素的确定性状态。xVw 单调不减（左进右出，不从右侧回进）。 */
export function stateAtProgress(raw: number, cfg: TimelineConfig = TIMELINE): IntroTimelineState {
  const p = Math.min(1, Math.max(0, raw));
  const ballX = ballXVw(p, cfg);
  const jialeX = jialeXVw(p, cfg);
  const personX = personXVw(p, cfg);
  const frameId = personFrame(p);
  // 嘉乐跑循环帧由行进距离决定，反向滚动时帧序同步倒放
  const stride = Math.max(0, jialeX - cfg.jiale.enter[0]);
  const jialeFrame = Math.floor(stride / cfg.jialeStrideVw) % 4;
  return {
    ball: { xVw: ballX, visible: p > P.ballEnter[0] && p <= P.ballExit[1] },
    jiale: { xVw: jialeX, frameIndex: jialeFrame, visible: p > P.jialeEnter[0] && p <= P.jialeExit[1] },
    person: {
      xVw: personX,
      frameIndex: PERSON_FRAME_ORDER.indexOf(frameId),
      frameId,
      visible: p > P.personEnter[0] && p <= P.personFall[1],
    },
    // 牵引绳：人物进场时松、拉拽期绷紧、摔倒滑出后再隐藏（manifest leash.hiddenAfter）
    leashVisible: p > P.personEnter[0] && p <= P.personFall[1],
    maskOpacity: p <= P.mask[0] ? 0 : lerp(p, P.mask, 0, 1),
    plateOpacity: p <= P.plate[0] ? 0 : lerp(p, P.plate, 0, 1),
  };
}
