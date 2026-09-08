// CP5 运行时（仅 /lab/intro-oil；D-121/D-128 交付格式：alpha-atlas + DOM/CSS Sprite）。
// 数据流：ScrollTrigger → targetProgress → smoothDamp（唯一平滑层）→ currentProgress
// → stateAtProgress（纯函数）→ DOM。整数帧不变时不写 background-position；
// 输入稳定 / 舞台离屏 / 交接完成后停止 rAF。
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { stateAtProgress, type IntroTimelineState } from "@/lib/intro-oil/timeline";
import { smoothDampStep, isSettled, type DampState } from "@/lib/intro-oil/smoothDamp";
import { leashPath, leashSag } from "@/lib/intro-oil/leash";

gsap.registerPlugin(ScrollTrigger);

const MANIFEST_URL = "/assets/intro/oil-motion/manifest.json";
/** 草地资产顶部透明比例（intro-oil.css 草地规则同源） */
const GRASS_TRANSPARENT_TOP = 0.32;
const BREAKPOINT = "(min-width: 768px)";
/** 球比人物地面线再压低 2.5vh，压进草里滚动（评审修订：否则 reads as 悬浮） */
const BALL_GROUND_OFFSET_VH = 10.5;

interface VariantDisplay {
  src: string;
  display: { heightVh: number; groundOffsetVh?: number };
  imageSize?: { width: number; height: number };
}

interface RoleManifest {
  frameOrder: string[];
  cellSize: { width: number; height: number };
  frames: { id: string; anchors: { ground: [number, number]; hand?: [number, number]; collar?: [number, number] } }[];
  variants: Record<"desktop" | "mobile", VariantDisplay>;
}

interface Manifest {
  roles: {
    person: RoleManifest;
    jiale: RoleManifest;
    ball: { variants: Record<"desktop" | "mobile", VariantDisplay> };
  };
}

// 牵引绳锚点全部来自 manifest（pipeline 标定的逐帧 hand / 蓝点检测 collar），无目测估计值。

interface Layer {
  el: HTMLElement;
  dispW: number;
  dispH: number;
  groundOffsetVh: number;
  role: RoleManifest | null;
  lastFrame: number;
}

// 人物出场即被拽入：绳子从进场起绷紧，摔倒后逐渐松弛
function leashTaut(p: number): number {
  if (p < 0.72) return 1;
  return 1 - ((p - 0.72) / 0.23) * 0.5;
}

export function initIntroOilRuntime(stage: HTMLElement): void {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const layers = {
    ball: stage.querySelector<HTMLElement>('[data-io="ball"]')!,
    jiale: stage.querySelector<HTMLElement>('[data-io="jiale"]')!,
    person: stage.querySelector<HTMLElement>('[data-io="person"]')!,
    leash: stage.querySelector<SVGSVGElement>('[data-io="leash"]')!,
    leashPath: stage.querySelector<SVGPathElement>('[data-io="leash-path"]')!,
    mask: stage.querySelector<HTMLElement>('[data-io="mask"]')!,
    skip: stage.querySelector<HTMLButtonElement>('[data-io="skip"]')!,
    plate: stage.querySelector<HTMLIFrameElement>('[data-io="plate"]')!,
  };
  const grass = stage.querySelector<HTMLImageElement>(".intro-oil-stage__grass")!;
  const track = stage.closest<HTMLElement>("[data-io-scroll]")!;

  if (reduceMotion) {
    // CP6 降级：reduced motion 直接落终态（Home v2 定帧，不播滚动动画）
    layers.mask.style.opacity = "1";
    layers.plate.style.opacity = "1";
    layers.skip.style.display = "none";
    return;
  }

  let manifest: Manifest;
  let variant: "desktop" | "mobile";
  let ball: Layer;
  let jiale: Layer;
  let person: Layer;
  let groundYPx = 0;
  let rafId = 0;
  let running = false;
  let target = 0;
  const damp: DampState = { current: 0, velocity: 0 };
  let lastTime = 0;

  function makeLayer(el: HTMLElement, role: RoleManifest | null, v: VariantDisplay): Layer {
    const dispH = (v.display.heightVh / 100) * window.innerHeight;
    const dispW = role ? dispH * (role.cellSize.width / role.cellSize.height) : dispH;
    el.style.height = `${dispH}px`;
    el.style.width = `${dispW}px`;
    el.style.backgroundImage = `url(${v.src})`;
    if (role && v.imageSize) {
      el.style.backgroundSize = `${dispW * role.frameOrder.length}px ${dispH}px`;
    }
    return {
      el,
      dispW,
      dispH,
      groundOffsetVh: v.display.groundOffsetVh ?? 8,
      role,
      lastFrame: -1,
    };
  }

  function measureGround(): void {
    const rect = grass.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    groundYPx = rect.top - stageRect.top + rect.height * GRASS_TRANSPARENT_TOP;
  }

  function groundLinePx(layer: Layer): number {
    return groundYPx + (layer.groundOffsetVh / 100) * window.innerHeight;
  }

  function placeActor(layer: Layer, xVw: number, frameIndex: number, visible: boolean): void {
    const vw = window.innerWidth / 100;
    const frame = layer.role ? layer.role.frames[frameIndex] : null;
    const [ax, ay] = frame ? frame.anchors.ground : [0.5, 1];
    const x = xVw * vw - ax * layer.dispW;
    const y = groundLinePx(layer) - ay * layer.dispH;
    layer.el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    layer.el.classList.toggle("is-live", visible);
    if (layer.role && frameIndex !== layer.lastFrame) {
      layer.el.style.backgroundPosition = `${-frameIndex * layer.dispW}px 0`;
      layer.lastFrame = frameIndex;
    }
  }

  function actorAnchorPx(layer: Layer, xVw: number, frameIndex: number, anchor: [number, number]): { x: number; y: number } {
    const vw = window.innerWidth / 100;
    const frame = layer.role ? layer.role.frames[frameIndex] : null;
    const [gax, gay] = frame ? frame.anchors.ground : [0.5, 1];
    return {
      x: xVw * vw - gax * layer.dispW + anchor[0] * layer.dispW,
      y: groundLinePx(layer) - gay * layer.dispH + anchor[1] * layer.dispH,
    };
  }

  function render(state: IntroTimelineState, p: number): void {
    // 球：静态帧 + 程序旋转（滚动距离 / 半径）
    const ballRadius = ball.dispH / 2;
    const ballXPx = state.ball.xVw * (window.innerWidth / 100);
    const ballGroundY = groundLinePx(ball);
    const deg = (ballXPx / Math.max(1, ballRadius)) * (180 / Math.PI);
    ball.el.style.transform = `translate3d(${ballXPx - ballRadius}px, ${ballGroundY - ball.dispH}px, 0) rotate(${deg}deg)`;
    ball.el.classList.toggle("is-live", state.ball.visible);

    placeActor(jiale, state.jiale.xVw, state.jiale.frameIndex, state.jiale.visible);
    placeActor(person, state.person.xVw, state.person.frameIndex, state.person.visible);

    const handAnchor = manifest.roles.person.frames[state.person.frameIndex].anchors.hand;
    const collarAnchor = manifest.roles.jiale.frames[state.jiale.frameIndex].anchors.collar;
    if (state.leashVisible && state.person.visible && state.jiale.visible && handAnchor && collarAnchor) {
      const hand = actorAnchorPx(person, state.person.xVw, state.person.frameIndex, handAnchor);
      const collar = actorAnchorPx(jiale, state.jiale.xVw, state.jiale.frameIndex, collarAnchor);
      const dist = Math.max(0, hand.x - collar.x);
      layers.leashPath.setAttribute("d", leashPath(hand, collar, leashSag(leashTaut(p), dist)));
      layers.leash.classList.add("is-live");
    } else {
      layers.leash.classList.remove("is-live");
    }

    layers.mask.style.opacity = state.maskOpacity.toFixed(3);
    layers.plate.style.opacity = state.plateOpacity.toFixed(3);
  }

  function tick(now: number): void {
    const dt = Math.min(0.05, (now - lastTime) / 1000 || 0.016);
    lastTime = now;
    const next = smoothDampStep(damp, target, 0.12, dt);
    damp.current = next.current;
    damp.velocity = next.velocity;
    render(stateAtProgress(damp.current), damp.current);
    if (isSettled(damp, target)) {
      running = false;
      rafId = 0;
      return;
    }
    rafId = requestAnimationFrame(tick);
  }

  function wake(): void {
    if (!running) {
      running = true;
      lastTime = performance.now();
      rafId = requestAnimationFrame(tick);
    }
  }

  function buildLayers(): void {
    ball = makeLayer(layers.ball, null, manifest.roles.ball.variants[variant]);
    ball.groundOffsetVh = BALL_GROUND_OFFSET_VH;
    jiale = makeLayer(layers.jiale, manifest.roles.jiale, manifest.roles.jiale.variants[variant]);
    person = makeLayer(layers.person, manifest.roles.person, manifest.roles.person.variants[variant]);
  }

  async function setup(): Promise<void> {
    const res = await fetch(MANIFEST_URL);
    if (!res.ok) return; // 资源失败：保留静态舞台（CP6 降级路径）
    manifest = (await res.json()) as Manifest;
    variant = window.matchMedia(BREAKPOINT).matches ? "desktop" : "mobile";
    buildLayers();
    if (grass.complete) measureGround();
    else grass.addEventListener("load", measureGround, { once: true });

    ScrollTrigger.create({
      trigger: track,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        target = self.progress;
        wake();
      },
    });

    layers.skip.addEventListener("click", () => {
      const max = track.offsetHeight - window.innerHeight;
      window.scrollTo({ top: max, behavior: "smooth" });
    });

    window.addEventListener("resize", () => {
      const next = window.matchMedia(BREAKPOINT).matches ? "desktop" : "mobile";
      if (next !== variant) {
        variant = next;
        buildLayers();
      }
      measureGround();
      ScrollTrigger.refresh();
      wake();
    });

    render(stateAtProgress(0), 0);
  }

  void setup();
  // 页面卸载时停止循环（lab 页整页卸载，防御性）
  window.addEventListener("pagehide", () => {
    if (rafId) cancelAnimationFrame(rafId);
  }, { once: true });
}
