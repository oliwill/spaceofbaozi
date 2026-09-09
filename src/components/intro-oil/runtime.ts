// v2 运行时（/lab/intro-oil；D-132：素材接口 v2，Manifest 驱动）。
// 数据流：ScrollTrigger → targetProgress → smoothDamp（唯一平滑层）→ stateAtProgress（纯函数）
// → DOM。几何（columns/rows/frameSize/anchors/displayWidthVh）全部读 v2 Manifest，不复制数值。
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { frameAtDistance, frameAtLocal, frameCell, loadManifestV2, type V2Manifest, type V2Sequence } from "@/lib/intro-oil/v2";
import { HOME_ANCHORS, stateAtProgress, type V2State } from "@/lib/intro-oil/timeline";
import { smoothDampStep, isSettled, type DampState } from "@/lib/intro-oil/smoothDamp";
import { leashPath, leashSag } from "@/lib/intro-oil/leash";

gsap.registerPlugin(ScrollTrigger);

const BREAKPOINT = "(min-width: 768px)";
/** 草地地面线 = 草地可见顶边下 8vh；首页地面线（D-120 冻结 y698.8/900、736.2/844） */
const GRASS_GROUND_DROP_VH = 8;
const HOME_GROUND_VH = { desktop: 77.65, mobile: 87.23 };
const BALL_BOUNCE_AMP_VH = 7;

interface SpriteLayer {
  el: HTMLElement;
  seq: V2Sequence | null;
  seqId: string;
  dispW: number;
  dispH: number;
  lastFrame: number;
}

export function initIntroOilRuntime(stage: HTMLElement): void {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const debug = new URLSearchParams(location.search).has("debug");
  const layers = {
    grass: stage.querySelector<HTMLImageElement>('[data-io="grass"]')!,
    ball: stage.querySelector<HTMLElement>('[data-io="ball"]')!,
    dog: stage.querySelector<HTMLElement>('[data-io="dog"]')!,
    person: stage.querySelector<HTMLElement>('[data-io="person"]')!,
    leash: stage.querySelector<SVGSVGElement>('[data-io="leash"]')!,
    leashPath: stage.querySelector<SVGPathElement>('[data-io="leash-path"]')!,
    plate: stage.querySelector<HTMLIFrameElement>('[data-io="plate"]'),
    still: stage.querySelector<HTMLImageElement>('[data-io="still"]')!,
    skip: stage.querySelector<HTMLButtonElement>('[data-io="skip"]')!,
    debug: stage.querySelector<HTMLElement>('[data-io="debug"]'),
  };
  const track = stage.closest<HTMLElement>("[data-io-scroll]")!;

  if (reduceMotion) {
    if (layers.plate) layers.plate.style.opacity = "1";
    layers.skip.style.display = "none";
    return;
  }

  let manifest: V2Manifest;
  let viewportKind: "desktop" | "mobile";
  let ball: SpriteLayer;
  let dog: SpriteLayer;
  let person: SpriteLayer;
  let grassVisibleTopPx = 0;
  let rafId = 0;
  let running = false;
  let target = 0;
  const damp: DampState = { current: 0, velocity: 0 };
  let lastTime = 0;

  const vh = () => window.innerHeight / 100;
  const vw = () => window.innerWidth / 100;
  const homeGroundPx = () => HOME_GROUND_VH[viewportKind] * vh();
  const groundPx = (grassOut: number) => {
    const grassGround = grassVisibleTopPx + GRASS_GROUND_DROP_VH * vh();
    return grassGround + (homeGroundPx() - grassGround) * grassOut;
  };

  function setSequence(layer: SpriteLayer, seq: V2Sequence, seqId: string): void {
    if (layer.seqId === seqId) return;
    layer.seq = seq;
    layer.seqId = seqId;
    layer.lastFrame = -1;
    layer.dispW = (seq.displayWidthVh / 100) * window.innerHeight;
    layer.dispH = layer.dispW * (seq.frameSize.height / seq.frameSize.width);
    layer.el.style.width = `${layer.dispW}px`;
    layer.el.style.height = `${layer.dispH}px`;
    layer.el.style.backgroundImage = `url(${seq.src})`;
    layer.el.style.backgroundSize = `${seq.columns * layer.dispW}px ${seq.rows * layer.dispH}px`;
  }

  function placeSprite(layer: SpriteLayer, xVw: number, frameIndex: number, visible: boolean, groundY: number, yOffsetPx = 0): void {
    const seq = layer.seq!;
    const anchors = seq.frames[Math.min(frameIndex, seq.frameCount - 1)].anchors;
    const x = xVw * vw() - anchors.ground[0] * layer.dispW;
    const y = groundY - anchors.ground[1] * layer.dispH + yOffsetPx;
    layer.el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    layer.el.classList.toggle("is-live", visible);
    if (frameIndex !== layer.lastFrame) {
      const { col, row } = frameCell(seq, frameIndex);
      layer.el.style.backgroundPosition = `${-col * layer.dispW}px ${-row * layer.dispH}px`;
      layer.lastFrame = frameIndex;
    }
  }

  function anchorPx(layer: SpriteLayer, xVw: number, frameIndex: number, key: "hand" | "collar", groundY: number): { x: number; y: number } | null {
    const seq = layer.seq!;
    const anchors = seq.frames[Math.min(frameIndex, seq.frameCount - 1)].anchors;
    const point = anchors[key];
    if (!point) return null;
    return {
      x: xVw * vw() + (point[0] - anchors.ground[0]) * layer.dispW,
      y: groundY + (point[1] - anchors.ground[1]) * layer.dispH,
    };
  }

  function render(state: V2State): void {
    const ground = groundPx(state.grassOut);

    // 草地退出（manifest transitionOut 0.78–0.82）
    layers.grass.style.transform = `translateX(-50%) translateY(${state.grassOut * 60}%)`;
    layers.grass.style.opacity = String(1 - state.grassOut);

    // 球：弹跳空翻 + 旋转感（squash/stretch 帧由行进距离驱动）
    const ballSeq = manifest.sequences["ball-bounce"];
    setSequence(ball, ballSeq, "ball-bounce");
    const ballFrame = frameAtDistance(ballSeq, state.ball.xVw + 10, 10 / ballSeq.frameCount);
    const bounceY = -Math.abs(Math.sin(Math.PI * state.ball.bounceT)) * BALL_BOUNCE_AMP_VH * vh();
    placeSprite(ball, state.ball.xVw, ballFrame, state.ball.visible, ground, bounceY);

    // 嘉乐：追逐（行进驱动循环帧）→ 返回坐下（局部进度非循环）
    const dogSeq = manifest.sequences[state.dog.seqId];
    setSequence(dog, dogSeq, state.dog.seqId);
    const dogFrame = state.dog.seqId === "dog-chase-right"
      ? frameAtDistance(dogSeq, state.dog.xVw + 12, 4.5)
      : frameAtLocal(dogSeq, state.dog.local);
    placeSprite(dog, state.dog.xVw, dogFrame, state.dog.visible, ground);

    // 人物：三段序列（被拽跑 → 摔倒滑出 → 滑入起身站定）
    const personSeq = manifest.sequences[state.person.seqId];
    setSequence(person, personSeq, state.person.seqId);
    const personFrame = state.person.seqId === "person-pulled-run-right"
      ? state.person.local < 0.125
        ? 0 // pulled-lean 首帧只在进场窗口播放一次，之后跑循环只用帧 1..7
        : 1 + (frameAtDistance(personSeq, state.person.xVw + 15, 6) % (personSeq.frameCount - 1))
      : frameAtLocal(personSeq, state.person.local);
    placeSprite(person, state.person.xVw, personFrame, state.person.visible, ground);

    // 牵引绳：逐帧 hand / collar 锚点（Manifest 真值）
    const hand = state.leash.visible ? anchorPx(person, state.person.xVw, personFrame, "hand", ground) : null;
    const collar = state.leash.visible ? anchorPx(dog, state.dog.xVw, dogFrame, "collar", ground) : null;
    if (hand && collar) {
      const dist = Math.max(0, hand.x - collar.x);
      layers.leashPath.setAttribute("d", leashPath(hand, collar, leashSag(state.leash.taut, dist)));
      layers.leash.classList.add("is-live");
    } else {
      layers.leash.classList.remove("is-live");
    }

    if (layers.plate) layers.plate.style.opacity = state.plateOpacity.toFixed(3);

    if (debug && layers.debug) {
      const fid = person.seq?.frameIds[Math.min(personFrame, person.seq.frameCount - 1)] ?? "-";
      layers.debug.textContent = `p=${damp.current.toFixed(3)} person=${state.person.seqId}#${personFrame}:${fid} dog=${state.dog.seqId}#${dogFrame} ball#${ballFrame} grass=${state.grassOut.toFixed(2)}`;
    }
  }

  function tick(now: number): void {
    const dt = Math.min(0.05, (now - lastTime) / 1000 || 0.016);
    lastTime = now;
    const next = smoothDampStep(damp, target, 0.12, dt);
    damp.current = next.current;
    damp.velocity = next.velocity;
    render(stateAtProgress(damp.current, HOME_ANCHORS[viewportKind]));
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

  function measureGrass(): void {
    const rect = layers.grass.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    const vb = manifest.environment["intro-grass"].visibleBounds;
    const imgMeta = { height: 640 }; // v2 草地 2560×640，visibleBounds.y 从顶部起算
    grassVisibleTopPx = rect.top - stageRect.top + rect.height * (vb.y / imgMeta.height);
  }

  function preloadSprites(): Promise<void> {
    const introSeqs = Object.values(manifest.sequences).filter((s) => s.scope === "intro");
    return Promise.all(
      introSeqs.map((s) => new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => reject(new Error(`sprite load failed: ${s.src}`));
        img.src = s.src;
      })),
    ).then(() => undefined);
  }

  async function setup(): Promise<void> {
    try {
      manifest = await loadManifestV2();
    } catch {
      // v2 Manifest 加载失败：直接显示 Home v2 内容层（integration §6）
      if (layers.plate) layers.plate.style.opacity = "1";
      return;
    }
    try {
      await preloadSprites();
    } catch {
      // 角色素材失败：显示 intro-final-still，不回退 v1（integration §6）
      layers.still.src = manifest.fallback.src;
      layers.still.classList.add("is-live");
      return;
    }
    viewportKind = window.matchMedia(BREAKPOINT).matches ? "desktop" : "mobile";
    ball = { el: layers.ball, seq: null, seqId: "", dispW: 0, dispH: 0, lastFrame: -1 };
    dog = { el: layers.dog, seq: null, seqId: "", dispW: 0, dispH: 0, lastFrame: -1 };
    person = { el: layers.person, seq: null, seqId: "", dispW: 0, dispH: 0, lastFrame: -1 };
    if (layers.grass.complete) measureGrass();
    else layers.grass.addEventListener("load", measureGrass, { once: true });

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
      window.scrollTo({ top: track.offsetHeight - window.innerHeight, behavior: "smooth" });
    });

    window.addEventListener("resize", () => {
      viewportKind = window.matchMedia(BREAKPOINT).matches ? "desktop" : "mobile";
      for (const layer of [ball, dog, person]) layer.seqId = ""; // 强制重算尺寸
      measureGrass();
      ScrollTrigger.refresh();
      wake();
    });

    render(stateAtProgress(0, HOME_ANCHORS[viewportKind]));
  }

  void setup();
  window.addEventListener("pagehide", () => {
    if (rafId) cancelAnimationFrame(rafId);
  }, { once: true });
}
