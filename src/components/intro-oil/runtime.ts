// v2 运行时（/lab/intro-oil；D-132：素材接口 v2，Manifest 驱动）。
// 数据流：Lenis / 原生滚动 → ScrollTrigger → stateAtProgress（D-126：不叠加第二层平滑）
// → DOM。几何（columns/rows/frameSize/anchors/displayWidthVh）全部读 v2 Manifest，不复制数值。
import gsap from "gsap";
import { scrollDocumentTo } from "@/lib/scroll/lenis";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { frameAtDistance, frameAtLocal, frameCell, loadManifestV2, type V2Manifest, type V2Sequence } from "@/lib/intro-oil/v2";
import { HOME_ANCHORS, SEG, stateAtProgress, type V2State, type V2AnchorsVw } from "@/lib/intro-oil/timeline";
import { desktopEndingAtProgress } from "@/lib/intro-oil/desktopEnding";
import { createDesktopWheelGate } from "@/lib/intro-oil/desktopWheelGate";
import { leashPath, leashSag } from "@/lib/intro-oil/leash";
import { holdIntroPose, homeActor as findHomeActor } from "@/lib/home-orbit/introPoseHandoff";
import { HOME_ORBIT_CONTRACT } from "@/lib/home-orbit/contract";

gsap.registerPlugin(ScrollTrigger);

const BREAKPOINT = "(min-width: 768px)";
/** 草地地面线 = 草地可见顶边下 8vh；首页地面线（D-120 冻结 y698.8/900、736.2/844） */
const GRASS_GROUND_DROP_VH = 8;
const HOME_GROUND_VH = { desktop: 77.65, mobile: 87.23 };
const BALL_BOUNCE_AMP_VH = 7;
const SESSION_KEY = "baozi:intro-complete";

interface SpriteLayer {
  el: HTMLElement;
  seq: V2Sequence | null;
  seqId: string;
  dispW: number;
  dispH: number;
  lastFrame: number;
}

export function initIntroOilRuntime(stage: HTMLElement): () => void {
  const lifetime = new AbortController();
  let disposed = false;
  let trigger: ScrollTrigger | undefined;
  let loadTimeout = 0;
  let rafId = 0;
  let completionFrame = 0;
  let wheelGate: ReturnType<typeof createDesktopWheelGate> | undefined;
  let homeResizeObserver: ResizeObserver | undefined;
  let homeMutationObserver: MutationObserver | undefined;
  let running = false;
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
    skip: stage.querySelector<HTMLAnchorElement>('[data-io="skip"]')!,
    debug: stage.querySelector<HTMLElement>('[data-io="debug"]'),
  };
  const track = stage.closest<HTMLElement>("[data-io-scroll]")!;

  const production = !layers.plate;
  const home = () => document.getElementById("home");
  const destination = production ? home() : null;
  const previousInert = destination?.inert ?? false;
  const rememberCompletion = () => {
    try { sessionStorage.setItem(SESSION_KEY, "true"); } catch { /* 私密浏览仍可直接访问正文。 */ }
  };
  function dispose(): void {
    if (disposed) return;
    disposed = true;
    lifetime.abort();
    window.clearTimeout(loadTimeout);
    if (rafId) cancelAnimationFrame(rafId);
    if (completionFrame) cancelAnimationFrame(completionFrame);
    running = false;
    trigger?.kill();
    homeResizeObserver?.disconnect();
    homeMutationObserver?.disconnect();
    if (destination) {
      destination.inert = previousInert;
      delete destination.dataset.introHomeActive;
      if (destination.dataset.introPoseOwner === "intro") delete destination.dataset.introPoseOwner;
    }
    stage.style.opacity = "";
    stage.style.removeProperty("--intro-paper-opacity");
    stage.dataset.introState = "disposed";
  }
  function enterHome(reason: string, navigate = true): void {
    if (disposed) return;
    if (production) handoffHomeOrbit();
    dispose();
    if (production) {
      rememberCompletion();
      track.hidden = true;
      const destination = home();
      if (destination && navigate) {
        history.replaceState(history.state, "", `${location.pathname}${location.search}#home`);
        scrollDocumentTo(destination, { immediate: true });
      }
      if (reason === "skipped") destination?.querySelector<HTMLElement>("#main")?.focus({ preventScroll: true });
    } else {
      track.style.height = "100svh";
      if (layers.plate) layers.plate.style.opacity = "1";
    }
    stage.dataset.introState = reason;
  }
  let seen = false;
  try { seen = sessionStorage.getItem(SESSION_KEY) === "true"; } catch { /* 存储禁用不影响开场降级。 */ }
  const homeAssetsFailed = destination?.querySelector<HTMLElement>("[data-home-orbit-root]")?.dataset.homeAssetFailure === "true";
  if (production && (reduceMotion || location.hash || seen || homeAssetsFailed)) {
    track.hidden = true;
    stage.dataset.introState = "bypassed";
    return dispose;
  }
  track.hidden = false;
  if (destination) {
    destination.inert = true;
    destination.dataset.introHomeActive = "true";
    destination.dataset.introPoseOwner = "intro";
  }
  stage.style.opacity = "1";
  stage.dataset.introState = "loading";
  if (reduceMotion) {
    enterHome("reduced-motion", false);
    return dispose;
  }
  layers.skip.addEventListener("click", (event) => {
    if (production) event.preventDefault();
    enterHome("skipped");
  }, { signal: lifetime.signal });
  if (production) {
    document.querySelector<HTMLAnchorElement>('.skip-link[href="#main"]')?.addEventListener("click", (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const main = document.getElementById("main");
      if (!main) return;
      event.preventDefault();
      enterHome("skipped", false);
      history.replaceState(history.state, "", `${location.pathname}${location.search}#main`);
      scrollDocumentTo(main, { immediate: true });
      main.focus({ preventScroll: true });
    }, { signal: lifetime.signal });
  }
  window.addEventListener("hashchange", () => {
    if (!production) return;
    let id: string;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    const target = document.getElementById(id);
    if (!target || !destination?.contains(target)) return;
    enterHome("skipped", false);
    scrollDocumentTo(target, { immediate: true });
    target.focus({ preventScroll: true });
  }, { signal: lifetime.signal });
  window.addEventListener("baozi:home-assets-failed", (event) => {
    if (production && (event as CustomEvent).detail?.home === destination) enterHome("home-assets-failed");
  }, { signal: lifetime.signal });
  window.addEventListener("pagehide", dispose, { signal: lifetime.signal });
  window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", (event) => {
    if (event.matches) enterHome("reduced-motion");
  }, { signal: lifetime.signal });
  layers.grass.addEventListener("error", () => enterHome("grass-failed"), { signal: lifetime.signal });
  loadTimeout = window.setTimeout(() => enterHome("asset-timeout"), 6000);

  let manifest: V2Manifest;
  let viewportKind: "desktop" | "mobile";
  let ball: SpriteLayer;
  let dog: SpriteLayer;
  let person: SpriteLayer;
  let grassVisibleTopPx = 0;
  let target = 0;
  let homeHandoffSent = false;
  let renderedProgress = 0;
  let syncHomeOrbit: ((progress: number) => void) | undefined;

  function handoffHomeOrbit(): void {
    if (homeHandoffSent) return;
    homeHandoffSent = true;
    if (destination) destination.dataset.introControlsReadyAt = String(performance.now() + HOME_ORBIT_CONTRACT.transition.controlEnableDelayMs);
    window.dispatchEvent(new CustomEvent("baozi:intro-orbit-handoff", {
      detail: { angle: 35 * Math.PI / 180, angularVelocity: 0 },
    }));
    window.dispatchEvent(new CustomEvent("baozi:intro-person-stood"));
  }

  function resetHomeOrbit(): void {
    homeHandoffSent = false;
    if (destination) delete destination.dataset.introControlsReadyAt;
    window.dispatchEvent(new CustomEvent("baozi:intro-orbit-reset"));
  }

  const vh = () => window.innerHeight / 100;
  const vw = () => window.innerWidth / 100;
  let homeAnchors: V2AnchorsVw;
  const homeGround: Partial<Record<"person" | "dog", number>> = {};
  const homeGroundPx = (actor: "person" | "dog") => homeGround[actor] ?? HOME_GROUND_VH[viewportKind] * vh();
  const homeActor = (actor: "person" | "dog") => findHomeActor(home(), actor);
  function measureHome(): void {
    homeAnchors = HOME_ANCHORS[viewportKind];
    const destination = home();
    const personEl = homeActor("person");
    const dogEl = homeActor("dog");
    if (!destination || !personEl || !dogEl) return;
    const origin = destination.getBoundingClientRect();
    const personRect = personEl.getBoundingClientRect();
    const dogRect = dogEl.getBoundingClientRect();
    const personSeq = manifest.sequences["person-slide-in-rise-stand"];
    const dogSeq = manifest.sequences["dog-look-up-settle"];
    const personAnchor = personSeq.frames.at(-1)!.anchors.ground;
    const dogAnchor = dogSeq.frames.at(-1)!.anchors.ground;
    homeAnchors = {
      personHomeVw: (personRect.left + personAnchor[0] * personRect.width) / vw(),
      dogHomeVw: (dogRect.left + dogAnchor[0] * dogRect.width) / vw(),
    };
    homeGround.person = personRect.bottom - origin.top;
    homeGround.dog = dogRect.bottom - origin.top;
  }
  const groundPx = (grassOut: number, actor: "person" | "dog" = "person") => {
    const grassGround = grassVisibleTopPx + GRASS_GROUND_DROP_VH * vh();
    return grassGround + (homeGroundPx(actor) - grassGround) * grassOut;
  };

  function setSequence(layer: SpriteLayer, seq: V2Sequence, seqId: string): void {
    const destination = production && seqId === "person-slide-in-rise-stand"
      ? homeActor("person")
      : production && seqId === "dog-look-up-settle"
        ? homeActor("dog") : null;
    const displayWidth = destination?.getBoundingClientRect().width || (seq.displayWidthVh / 100) * window.innerHeight;
    if (layer.seqId === seqId && layer.dispW === displayWidth) return;
    layer.seq = seq;
    layer.seqId = seqId;
    layer.lastFrame = -1;
    layer.dispW = displayWidth;
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
    const dogGround = groundPx(state.grassOut, "dog");
    if (production) stage.style.setProperty("--intro-paper-opacity", String(1 - state.plateOpacity));

    // 草地退出（manifest transitionOut 0.78–0.82）
    layers.grass.style.transform = `translateX(-50%) translateY(${state.grassOut * 60}%)`;
    layers.grass.style.opacity = String(1 - state.grassOut);

    // 球：弹跳空翻 + 旋转感（squash/stretch 帧由行进距离驱动）
    const ballSeq = manifest.sequences["ball-bounce"];
    setSequence(ball, ballSeq, "ball-bounce");
    const ballFrame = frameAtDistance(ballSeq, state.ball.xVw + 10, 10 / ballSeq.frameCount);
    const bounceY = -Math.abs(Math.sin(Math.PI * state.ball.bounceT)) * BALL_BOUNCE_AMP_VH * vh();
    placeSprite(ball, state.ball.xVw, ballFrame, state.ball.visible, ground, bounceY);

    const ending = production && viewportKind === "desktop" ? desktopEndingAtProgress(renderedProgress) : null;
    const dogSeqId = ending ? "dog-look-up-settle" : state.dog.seqId;
    const dogSeq = manifest.sequences[dogSeqId];
    setSequence(dog, dogSeq, dogSeqId);
    const dogX = ending
      ? homeAnchors.dogHomeVw - dog.dispW * ending.dogOffsetWidths / vw()
      : state.dog.xVw;
    const dogFrame = ending?.dogFrame ?? (dogSeqId === "dog-chase-right"
      ? frameAtDistance(dogSeq, dogX + 12, 4.5)
      : frameAtLocal(dogSeq, state.dog.local));
    dog.el.style.transformOrigin = "";
    dog.el.style.opacity = ending ? String(ending.dogOpacity) : "";
    placeSprite(dog, dogX, dogFrame, ending?.dogVisible ?? state.dog.visible, dogGround);

    // 人物：三段序列（被拽跑 → 摔倒滑出 → 滑入起身站定）
    const personSeq = manifest.sequences[state.person.seqId];
    setSequence(person, personSeq, state.person.seqId);
    const personFrame = ending?.personFrame ?? (state.person.seqId === "person-pulled-run-right"
      ? state.person.local < 0.125
        ? 0 // pulled-lean 首帧只在进场窗口播放一次，之后跑循环只用帧 1..7
        : 1 + (frameAtDistance(personSeq, state.person.xVw + 15, 6) % (personSeq.frameCount - 1))
      : frameAtLocal(personSeq, state.person.local));
    placeSprite(person, state.person.xVw, personFrame, state.person.visible, ground);

    // 牵引绳：逐帧 hand / collar 锚点（Manifest 真值）
    const hand = state.leash.visible ? anchorPx(person, state.person.xVw, personFrame, "hand", ground) : null;
    const collar = state.leash.visible ? anchorPx(dog, state.dog.xVw, dogFrame, "collar", dogGround) : null;
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
      layers.debug.textContent = `p=${renderedProgress.toFixed(3)} person=${state.person.seqId}#${personFrame}:${fid} dog=${dogSeqId}#${dogFrame} ball#${ballFrame} grass=${state.grassOut.toFixed(2)}`;
    }
  }

  function cancelCompletion(): void {
    if (completionFrame) cancelAnimationFrame(completionFrame);
    completionFrame = 0;
  }

  function tick(): void {
    if (disposed) return;
    running = false;
    rafId = 0;
    renderedProgress = target;
    if (production && renderedProgress >= SEG.personRise[0]) measureHome();
    render(stateAtProgress(renderedProgress, homeAnchors));
    wheelGate?.rendered(renderedProgress);
    syncHomeOrbit?.(renderedProgress);
    if (production && renderedProgress === 1) {
      completionFrame ||= requestAnimationFrame(() => {
        completionFrame = 0;
        if (!disposed && target === 1) {
          if (destination) holdIntroPose(destination, { person: layers.person, dog: layers.dog }, manifest);
          enterHome("completed");
        }
      });
    }
  }

  function wake(): void {
    if (!disposed && !running) {
      running = true;
      rafId = requestAnimationFrame(tick);
    }
  }

  function measureGrass(): void {
    const rect = layers.grass.getBoundingClientRect();
    const vb = manifest.environment["intro-grass"].visibleBounds;
    const imageHeight = layers.grass.naturalHeight || vb.y + vb.height;
    grassVisibleTopPx = stage.getBoundingClientRect().height - rect.height + rect.height * (vb.y / imageHeight);
  }

  function preloadSprites(): Promise<void> {
    const introSeqs = Object.values(manifest.sequences).filter((s) => s.scope === "intro");
    return Promise.all(
      introSeqs.map((s) => new Promise<void>((resolve, reject) => {
        const img = new Image();
        const release = () => { img.onload = null; img.onerror = null; };
        img.onload = () => { release(); resolve(); };
        img.onerror = () => { release(); reject(new Error(`sprite load failed: ${s.src}`)); };
        lifetime.signal.addEventListener("abort", () => { release(); reject(new Error("intro disposed")); }, { once: true });
        img.src = s.src;
      })),
    ).then(() => undefined);
  }

  async function setup(): Promise<void> {
    try {
      manifest = await loadManifestV2();
      const required = ["ball-bounce", "dog-chase-right", "dog-look-up-settle", "person-pulled-run-right", "person-stumble-fall-exit-right", "person-slide-in-rise-stand"];
      if (manifest.version !== 2 || required.some(id => !manifest.sequences?.[id]?.frames?.length)) {
        throw new Error("intro manifest invalid");
      }
    } catch {
      enterHome("manifest-failed");
      return;
    }
    if (disposed) return;
    try {
      await preloadSprites();
    } catch {
      enterHome("sprite-failed");
      return;
    }
    if (disposed) return;
    window.clearTimeout(loadTimeout);
    if (layers.grass.complete && layers.grass.naturalWidth === 0) {
      enterHome("grass-failed");
      return;
    }
    stage.dataset.introState = "ready";
    viewportKind = window.matchMedia(BREAKPOINT).matches ? "desktop" : "mobile";
    measureHome();
    ball = { el: layers.ball, seq: null, seqId: "", dispW: 0, dispH: 0, lastFrame: -1 };
    dog = { el: layers.dog, seq: null, seqId: "", dispW: 0, dispH: 0, lastFrame: -1 };
    person = { el: layers.person, seq: null, seqId: "", dispW: 0, dispH: 0, lastFrame: -1 };
    wheelGate = createDesktopWheelGate({
      enabled: () => !disposed && production && viewportKind === "desktop",
      progress: () => target,
      pin: () => {
        target = 0.972;
        cancelCompletion();
        if (!trigger) return target;
        const range = trigger.end - trigger.start;
        const position = Math.ceil(trigger.start + 0.972 * range);
        scrollDocumentTo(position, { immediate: true });
        return range > 0 ? (position - trigger.start) / range : target;
      },
      complete: () => {
        if (destination) holdIntroPose(destination, { person: layers.person, dog: layers.dog }, manifest);
        enterHome("completed");
      },
      signal: lifetime.signal,
    });
    if (destination) {
      const refreshTail = () => {
        if (target >= SEG.personRise[0]) { cancelCompletion(); wheelGate?.layoutChanged(); wake(); }
      };
      homeResizeObserver = new ResizeObserver(refreshTail);
      homeResizeObserver.observe(destination);
      const rail = destination.querySelector<HTMLElement>(".shell-nav");
      if (rail) homeResizeObserver.observe(rail);
      homeMutationObserver = new MutationObserver(refreshTail);
      homeMutationObserver.observe(destination, {
        subtree: true,
        attributes: true,
        attributeFilter: ["data-orbit-active", "data-person-orbit-error", "data-asset-error"],
      });
    }
    if (layers.grass.complete) measureGrass();
    else layers.grass.addEventListener("load", measureGrass, { once: true, signal: lifetime.signal });
    syncHomeOrbit = (progress: number) => {
      if (disposed) return;
      if (progress >= 0.995 && !homeHandoffSent) {
        handoffHomeOrbit();
      } else if (progress < 0.98 && homeHandoffSent) {
        resetHomeOrbit();
      }
    };


    trigger = ScrollTrigger.create({
      id: "baozi-intro",
      trigger: track,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        if (disposed) return;
        target = wheelGate?.constrain(self.progress) ?? self.progress;
        if (completionFrame && target < 1) cancelCompletion();
        wake();
      },
    });

    window.addEventListener("resize", () => {
      cancelCompletion();
      viewportKind = window.matchMedia(BREAKPOINT).matches ? "desktop" : "mobile";
      measureHome();
      for (const layer of [ball, dog, person]) layer.seqId = ""; // 强制重算尺寸
      measureGrass();
      ScrollTrigger.refresh();
      wheelGate?.layoutChanged();
      target = wheelGate?.constrain(trigger?.progress ?? target) ?? target;
      wake();
    }, { signal: lifetime.signal });

    render(stateAtProgress(0, homeAnchors));
    ScrollTrigger.refresh();
  }

  if (production) resetHomeOrbit();
  void setup();
  return dispose;
}
