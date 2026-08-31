import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { IntroAsset, IntroManifest } from "@/lib/intro/assetManifest";
import { frameAtProgress } from "@/lib/intro/frameAtProgress";
import { leashPath } from "@/lib/intro/leashPath";
import { projectActorAnchor } from "@/lib/intro/projectActorAnchor";
import { groundAnchorOffset } from "@/lib/intro/groundAnchor";

type IntroMeasurements = {
  width: number;
  height: number;
  personOrigin: { x: number; y: number };
  dogOrigin: { x: number; y: number };
  personSize: { width: number; height: number };
  dogSize: { width: number; height: number };
};

gsap.registerPlugin(ScrollTrigger);

export const INTRO_ORBIT_START = 0.9;
export const INTRO_IDENTITY_X_RATIO = 0.28;
export const INTRO_CHECKPOINTS = [0, 0.08, 0.25, 0.45, 0.65, 0.82, INTRO_ORBIT_START, 1] as const;

type IntroTimelineOptions = {
  root: HTMLElement;
  manifest: IntroManifest;
  onComplete: () => void;
  debug?: boolean;
};

type ActorState = { x: number; y: number; rotation: number; visible: boolean };

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const range = (progress: number, start: number, end: number) => clamp((progress - start) / (end - start));
const mix = (from: number, to: number, amount: number) => from + (to - from) * amount;

function phaseAt(progress: number): string {
  if (progress < 0.08) return "ball";
  if (progress < 0.25) return "dog";
  if (progress < 0.45) return "pulled";
  if (progress < 0.65) return "run";
  if (progress < 0.78) return "trip";
  if (progress < 0.82) return "transition";
  if (progress < INTRO_ORBIT_START) return "stand";
  if (progress < 1) return "settle";
  return "complete";
}

function applySprite(element: HTMLElement, asset: IntroAsset, actionProgress: number): number {
  const frame = frameAtProgress(actionProgress, asset.frames, asset.loop);
  const column = frame % asset.columns;
  const row = Math.floor(frame / asset.columns);
  element.style.backgroundImage = `url("${asset.src}")`;
  element.style.width = `${asset.displayWidthVh}vh`;
  element.style.aspectRatio = `${asset.frameSize.width} / ${asset.frameSize.height}`;
  element.style.backgroundSize = `${asset.columns * 100}% ${asset.rows * 100}%`;
  element.style.backgroundPosition = `${column * (100 / (asset.columns - 1))}% ${row * (100 / (asset.rows - 1))}%`;
  element.dataset.frame = String(frame);
  return frame;
}

function applyActor(element: HTMLElement, state: ActorState): void {
  element.dataset.visible = String(state.visible);
  element.style.opacity = state.visible ? "1" : "0";
  element.style.transform = `translate3d(${state.x}px, ${state.y}px, 0) rotate(${state.rotation}deg)`;
}

export function createIntroTimeline({ root, manifest, onComplete, debug = false }: IntroTimelineOptions): gsap.core.Timeline {
  const stage = root.querySelector<HTMLElement>("[data-intro-stage]");
  const grass = root.querySelector<HTMLElement>("[data-intro-scene='grass']");
  const grassImage = root.querySelector<HTMLImageElement>("[data-intro-grass-image]");
  const home = root.querySelector<HTMLElement>("[data-intro-scene='home']");
  const ballWrapper = root.querySelector<HTMLElement>("[data-intro-ball]");
  const dogWrapper = root.querySelector<HTMLElement>("[data-intro-dog]");
  const personWrapper = root.querySelector<HTMLElement>("[data-intro-person]");
  const ballSprite = root.querySelector<HTMLElement>("[data-intro-sprite='ball']");
  const dogSprite = root.querySelector<HTMLElement>("[data-intro-sprite='dog']");
  const personSprite = root.querySelector<HTMLElement>("[data-intro-sprite='person']");
  const leash = root.querySelector<SVGPathElement>("[data-intro-leash]");
  const debugOutput = root.querySelector<HTMLElement>("[data-intro-debug]");
  const scrollCue = root.querySelector<HTMLElement>("[data-intro-scroll-cue]");
  const finalArt = root.querySelector<HTMLImageElement>("[data-intro-final-art]");
  if (!stage || !grass || !grassImage || !home || !ballWrapper || !dogWrapper || !personWrapper || !ballSprite || !dogSprite || !personSprite || !leash || !finalArt) {
    throw new Error("intro stage DOM is incomplete");
  }
  const grassAsset = manifest.environment?.grass;
  const [grassExitStart, grassExitEnd] = grassAsset?.transitionOut ?? [0.78, 0.82];
  grass.dataset.assetMode = manifest.mode;
  grassImage.hidden = !grassAsset;
  if (grassAsset) grassImage.src = grassAsset.src;
  root.style.setProperty("--intro-identity-x", `${INTRO_IDENTITY_X_RATIO * 100}%`);

  const state = { progress: 0 };
  let measurements: IntroMeasurements | null = null;
  let completed = false;
  let orbitActive = false;
  let orbitHandoffSent = false;
  const readMeasurements = (): IntroMeasurements => ({
    width: stage.clientWidth,
    height: stage.clientHeight,
    personOrigin: { x: personWrapper.offsetLeft, y: personWrapper.offsetTop },
    dogOrigin: { x: dogWrapper.offsetLeft, y: dogWrapper.offsetTop },
    personSize: { width: personSprite.offsetWidth, height: personSprite.offsetHeight },
    dogSize: { width: dogSprite.offsetWidth, height: dogSprite.offsetHeight },
  });
  const getMeasurements = (): IntroMeasurements => {
    measurements ??= readMeasurements();
    return measurements;
  };
  const render = () => {
    const progress = clamp(state.progress);
    const phase = phaseAt(progress);
    const orbitPhase = range(progress, INTRO_ORBIT_START, 1);
    root.style.setProperty("--intro-progress", String(progress));
    root.dataset.introProgress = progress.toFixed(3);
    root.dataset.introPhase = phase;
    root.dataset.introComplete = String(progress === 1);
    if (scrollCue) scrollCue.hidden = progress > 0.01;
    const grassExitPhase = range(progress, grassExitStart, grassExitEnd);
    grass.dataset.active = String(progress < grassExitEnd);
    grass.style.transform = `translate3d(0, ${grassExitPhase * 100}%, 0)`;
    const homeEnterPhase = range(progress, 0.78, 0.84);
    home.dataset.active = String(progress >= 0.78);
    home.style.opacity = String(homeEnterPhase);
    home.style.transform = `translate3d(0, ${mix(24, 0, homeEnterPhase)}px, 0)`;
    finalArt.hidden = true;
    const ballPhase = range(progress, 0, 0.25);
    const runPhase = range(progress, 0.08, 0.82);
    const pulledPhase = range(progress, 0.25, 0.65);
    const tripPhase = range(progress, 0.65, 0.82);
    const standPhase = range(progress, 0.82, INTRO_ORBIT_START);
    const settlePhase = range(progress, INTRO_ORBIT_START, 1);
    const dogAsset = progress >= INTRO_ORBIT_START ? manifest.assets.dogSettle : manifest.assets.dogRun;
    const personAsset = progress >= 0.82 ? manifest.assets.personStand : progress >= 0.65 ? manifest.assets.personTrip : manifest.assets.personRun;
    const ballFrame = applySprite(ballSprite, manifest.assets.ballBounce, ballPhase);
    const dogFrame = applySprite(dogSprite, dogAsset, progress >= INTRO_ORBIT_START ? settlePhase : runPhase);
    const personFrame = applySprite(personSprite, personAsset, personAsset === manifest.assets.personRun ? pulledPhase : personAsset === manifest.assets.personTrip ? tripPhase : standPhase);
    const layout = getMeasurements();
    const dogGroundOffset = groundAnchorOffset(dogAsset.anchors, dogFrame, layout.dogSize);
    const personRotation = progress < 0.82
      ? mix(0, 18, range(progress, 0.65, 0.82))
      : mix(18, 0, standPhase);
    const personGroundOffset = groundAnchorOffset(personAsset.anchors, personFrame, layout.personSize, personRotation);
    const ballState: ActorState = {
      x: mix(-layout.width * 0.12, layout.width * 0.88, ballPhase),
      y: -Math.sin(ballPhase * Math.PI * 4) * layout.height * 0.035,
      rotation: ballPhase * 540,
      visible: progress < 0.45,
    };
    const dogState: ActorState = progress < 0.82
      ? { x: mix(-layout.width * 0.25, layout.width * 1.28, runPhase), y: dogGroundOffset, rotation: 0, visible: progress >= 0.08 }
      : {
          x: mix(-layout.width * 0.08, layout.width * 0.21, standPhase),
          y: -layout.height * 0.01 + dogGroundOffset,
          rotation: 0,
          visible: progress < INTRO_ORBIT_START,
        };
    const personState: ActorState = progress < 0.82
      ? { x: mix(-layout.width * 0.38, layout.width * 1.08, range(progress, 0.25, 0.82)), y: progress >= 0.65 ? layout.height * range(progress, 0.65, 0.82) * 0.1 + personGroundOffset : personGroundOffset, rotation: personRotation, visible: progress >= 0.25 }
      : { x: mix(-layout.width * 0.12, layout.width * INTRO_IDENTITY_X_RATIO, standPhase), y: mix(layout.height * 0.08, 0, standPhase) + personGroundOffset, rotation: personRotation, visible: progress < INTRO_ORBIT_START };

    leash.ownerSVGElement?.setAttribute("viewBox", `0 0 ${layout.width} ${layout.height}`);
    applyActor(ballWrapper, ballState);
    applyActor(dogWrapper, dogState);
    applyActor(personWrapper, personState);
    dogWrapper.dataset.pathX = dogState.x.toFixed(2);
    dogWrapper.dataset.pathY = dogState.y.toFixed(2);
    personWrapper.dataset.pathX = personState.x.toFixed(2);
    dogWrapper.style.zIndex = "3";

    const personAnchor = personAsset.anchors[personFrame]?.hand;
    const dogAnchor = dogAsset.anchors[dogFrame]?.collar;
    const leashVisible = personState.visible && dogState.visible && progress < 0.82 && personAnchor && dogAnchor;
    if (leashVisible) {
      const hand = projectActorAnchor({
        wrapperOrigin: layout.personOrigin,
        spriteSize: layout.personSize,
        anchor: personAnchor,
        translate: { x: personState.x, y: personState.y },
        rotationDeg: personState.rotation,
      });
      const collar = projectActorAnchor({
        wrapperOrigin: layout.dogOrigin,
        spriteSize: layout.dogSize,
        anchor: dogAnchor,
        translate: { x: dogState.x, y: dogState.y },
        rotationDeg: dogState.rotation,
      });
      personWrapper.dataset.handX = hand.x.toFixed(3);
      personWrapper.dataset.handY = hand.y.toFixed(3);
      dogWrapper.dataset.collarX = collar.x.toFixed(3);
      dogWrapper.dataset.collarY = collar.y.toFixed(3);
      leash.setAttribute("d", leashPath(hand, collar, mix(4, 28, range(progress, 0.25, 0.45))));
      leash.setAttribute("opacity", "1");
    }
    else {
      leash.setAttribute("opacity", "0");
    }
    if (progress >= INTRO_ORBIT_START) {
      const angle = (215 + orbitPhase * 180) * Math.PI / 180;
      window.dispatchEvent(new CustomEvent("baozi:intro-orbit-update", {
        detail: { angle, angularVelocity: progress < 1 ? Math.PI : 0 },
      }));
      orbitActive = true;
      if (progress === 1 && !orbitHandoffSent) {
        window.dispatchEvent(new CustomEvent("baozi:intro-orbit-handoff", {
          detail: { angle, angularVelocity: 0 },
        }));
        window.dispatchEvent(new CustomEvent("baozi:intro-person-stood"));
        orbitHandoffSent = true;
      }
    } else if (orbitActive) {
      window.dispatchEvent(new CustomEvent("baozi:intro-orbit-reset"));
      orbitActive = false;
      orbitHandoffSent = false;
    }
    if (debug && debugOutput) debugOutput.textContent = `${phase} · ${progress.toFixed(3)} · frames ${ballFrame}/${dogFrame}/${personFrame}`;
    if (progress === 1 && !completed) {
      completed = true;
      onComplete();
    } else if (progress < 1) {
      completed = false;
    }
  };

  const resizeObserver = new ResizeObserver(() => {
    measurements = null;
    render();
  });
  resizeObserver.observe(stage);
  resizeObserver.observe(personSprite);
  resizeObserver.observe(dogSprite);

  const timeline = gsap.timeline({ paused: true });
  timeline.to(state, { progress: 1, duration: 1, ease: "none", onUpdate: render });
  ScrollTrigger.create({ trigger: root, start: "top top", end: "bottom bottom", scrub: true, animation: timeline });
  render();
  return timeline;
}
