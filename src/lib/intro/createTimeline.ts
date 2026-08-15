import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { HOME_ORBIT_CONTRACT } from "@/lib/home-orbit/contract";
import type { HomeOrbitController } from "@/lib/home-orbit/createHomeOrbit";
import type { IntroAsset, IntroManifest } from "@/lib/intro/assetManifest";
import { frameAtProgress } from "@/lib/intro/frameAtProgress";
import { leashPath } from "@/lib/intro/leashPath";

gsap.registerPlugin(ScrollTrigger);

export const INTRO_CHECKPOINTS = [0, 0.08, 0.25, 0.45, 0.65, 0.82, 0.94, 1] as const;

type IntroTimelineOptions = {
  root: HTMLElement;
  manifest: IntroManifest;
  onComplete: () => void;
  debug?: boolean;
};

type ActorState = { x: number; y: number; rotation: number; visible: boolean };
type HomeOrbitRoot = HTMLElement & { __homeOrbit?: HomeOrbitController };
type OrbitActorTarget = { left: number; top: number; width: number; aspectRatio: number };

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const range = (progress: number, start: number, end: number) => clamp((progress - start) / (end - start));
const mix = (from: number, to: number, amount: number) => from + (to - from) * amount;

const ORBIT_HANDOFF_START_ANGLE_RAD = (HOME_ORBIT_CONTRACT.orbit.startAngleDeg * Math.PI) / 180;
const ORBIT_HANDOFF_HALF_TURN_RAD = Math.PI;

function phaseAt(progress: number): string {
  if (progress < 0.08) return "ball";
  if (progress < 0.25) return "dog";
  if (progress < 0.45) return "pulled";
  if (progress < 0.65) return "run";
  if (progress < 0.78) return "trip";
  if (progress < 0.82) return "transition";
  if (progress < 0.94) return "stand";
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

function measureOrbitTarget(stage: HTMLElement, element: HTMLElement | null): OrbitActorTarget | undefined {
  if (!element) return undefined;
  const stageRect = stage.getBoundingClientRect();
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return undefined;
  return {
    left: rect.left - stageRect.left,
    top: rect.top - stageRect.top,
    width: rect.width,
    aspectRatio: rect.width / rect.height,
  };
}

function morphSpriteToTarget(
  element: HTMLElement,
  asset: IntroAsset,
  progress: number,
  target: OrbitActorTarget | undefined,
): void {
  if (!target) return;
  const startWidth = (asset.displayWidthVh * window.innerHeight) / 100;
  const startAspectRatio = asset.frameSize.width / asset.frameSize.height;
  element.style.width = `${mix(startWidth, target.width, progress)}px`;
  element.style.aspectRatio = String(mix(startAspectRatio, target.aspectRatio, progress));
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
  const finalArt = root.querySelector<HTMLImageElement>("[data-intro-final-art]");
  if (!stage || !grass || !grassImage || !home || !ballWrapper || !dogWrapper || !personWrapper || !ballSprite || !dogSprite || !personSprite || !leash || !finalArt) {
    throw new Error("intro stage DOM is incomplete");
  }
  const grassAsset = manifest.environment?.grass;
  const [grassExitStart, grassExitEnd] = grassAsset?.transitionOut ?? [0.78, 0.82];
  grass.dataset.assetMode = manifest.mode;
  grassImage.hidden = !grassAsset;
  if (grassAsset) grassImage.src = grassAsset.src;

  const orbitRoot = stage.querySelector<HomeOrbitRoot>("[data-home-orbit-root]");
  const orbitPerson = orbitRoot?.querySelector<HTMLElement>("[data-orbit-person]") ?? null;
  const orbitDog = orbitRoot?.querySelector<HTMLElement>("[data-dog-visual]") ?? null;
  const state = { progress: 0 };
  let completed = false;
  let orbitOwnershipStarted = false;
  let settledHandoffDispatched = false;
  let introPreviewing = false;
  let cachedPersonTarget: OrbitActorTarget | undefined;
  let cachedDogTarget: OrbitActorTarget | undefined;
  let previousProgress = 0;
  let previewDirection = 1;
  const lifecycle = new AbortController();
  const render = () => {
    const progress = clamp(state.progress);
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    const phase = phaseAt(progress);
    const orbitController = orbitRoot?.__homeOrbit;
    const orbitCanOwnScene =
      orbitRoot !== null &&
      orbitController !== undefined &&
      orbitRoot.dataset.orbitReady === "true" &&
      orbitRoot.dataset.assetError !== "true";
    const orbitOwnsScene = progress >= 0.94 && orbitCanOwnScene;
    const personOrbitFailed = orbitRoot?.dataset.personOrbitError === "true";
    const isStableProductionState = progress === 1 && manifest.mode === "production" && !orbitOwnsScene;
    if (progress > previousProgress) previewDirection = 1;
    else if (progress < previousProgress) previewDirection = -1;

    // Reverse past the ownership threshold before measuring morph targets so the
    // controller's reset handler restores the canonical start pose first.
    if (progress < 0.94 && orbitOwnershipStarted) {
      orbitOwnershipStarted = false;
      settledHandoffDispatched = false;
      introPreviewing = false;
      window.dispatchEvent(new CustomEvent("baozi:intro-orbit-reset"));
    }

    root.style.setProperty("--intro-progress", String(progress));
    root.dataset.introProgress = progress.toFixed(3);
    root.dataset.introPhase = phase;
    root.dataset.introComplete = String(progress === 1);
    const grassExitPhase = range(progress, grassExitStart, grassExitEnd);
    grass.dataset.active = String(progress < grassExitEnd);
    grass.style.transform = `translate3d(0, ${grassExitPhase * 100}%, 0)`;
    home.dataset.active = String(progress >= grassExitEnd);
    finalArt.hidden = !isStableProductionState;
    if (isStableProductionState) finalArt.src = manifest.fallback;

    const ballPhase = range(progress, 0, 0.25);
    const runPhase = range(progress, 0.08, 0.82);
    const pulledPhase = range(progress, 0.25, 0.65);
    const tripPhase = range(progress, 0.65, 0.82);
    const standPhase = range(progress, 0.82, 0.94);
    const settlePhase = range(progress, 0.94, 1);
    const dogAsset = progress >= 0.94 ? manifest.assets.dogSettle : manifest.assets.dogRun;
    const personAsset = progress >= 0.82 ? manifest.assets.personStand : progress >= 0.65 ? manifest.assets.personTrip : manifest.assets.personRun;
    const ballFrame = applySprite(ballSprite, manifest.assets.ballBounce, ballPhase);
    const dogFrame = applySprite(dogSprite, dogAsset, progress >= 0.94 ? settlePhase : runPhase);
    const personFrame = applySprite(personSprite, personAsset, personAsset === manifest.assets.personRun ? pulledPhase : personAsset === manifest.assets.personTrip ? tripPhase : standPhase);
    // While the orbit owns the scene (progress >= 0.94) keep the morph targets
    // frozen at the canonical start pose measured before handoff; the live orbit
    // dog moves through the half-turn and must not drag the hidden intro actors.
    if (!orbitOwnsScene && orbitCanOwnScene) {
      cachedPersonTarget = measureOrbitTarget(stage, orbitPerson);
      cachedDogTarget = measureOrbitTarget(stage, orbitDog);
    }
    if (orbitCanOwnScene && (!cachedPersonTarget || !cachedDogTarget)) {
      cachedPersonTarget = measureOrbitTarget(stage, orbitPerson);
      cachedDogTarget = measureOrbitTarget(stage, orbitDog);
    }
    const personTarget = orbitCanOwnScene ? cachedPersonTarget : undefined;
    const dogTarget = orbitCanOwnScene ? cachedDogTarget : undefined;
    if (progress >= 0.82) {
      morphSpriteToTarget(personSprite, personAsset, standPhase, personTarget);
      morphSpriteToTarget(dogSprite, dogAsset, standPhase, dogTarget);
    }

    const ballState: ActorState = {
      x: mix(-width * 0.12, width * 0.88, ballPhase),
      y: -Math.sin(ballPhase * Math.PI * 4) * height * 0.035,
      rotation: ballPhase * 540,
      visible: progress < 0.45,
    };
    const dogTargetX = dogTarget ? dogTarget.left - dogWrapper.offsetLeft : width * 0.68;
    const dogTargetY = dogTarget ? dogTarget.top - dogWrapper.offsetTop : -height * 0.01;
    const dogState: ActorState = progress < 0.82
      ? { x: mix(-width * 0.25, width * 1.28, runPhase), y: 0, rotation: 0, visible: progress >= 0.08 }
      : {
          x: mix(width * 0.68, dogTargetX, standPhase),
          y: mix(-height * 0.01, dogTargetY, standPhase),
          rotation: 0,
          visible: !isStableProductionState && !orbitOwnsScene,
        };
    const personTargetX = personTarget ? personTarget.left - personWrapper.offsetLeft : width * 0.56;
    const personTargetY = personTarget ? personTarget.top - personWrapper.offsetTop : 0;
    const personState: ActorState = progress < 0.82
      ? { x: mix(-width * 0.38, width * 1.08, range(progress, 0.25, 0.82)), y: progress >= 0.65 ? height * range(progress, 0.65, 0.82) * 0.1 : 0, rotation: mix(0, 18, range(progress, 0.65, 0.82)), visible: progress >= 0.25 }
      : {
          x: mix(width * 0.42, personTargetX, standPhase),
          y: mix(height * 0.08, personTargetY, standPhase),
          rotation: mix(18, 0, standPhase),
          visible: !isStableProductionState && (!orbitOwnsScene || personOrbitFailed),
        };

    if (orbitOwnsScene && orbitRoot) {
      if (progress < 1 && settledHandoffDispatched && !introPreviewing) {
        introPreviewing = true;
        window.dispatchEvent(new CustomEvent("baozi:intro-orbit-preview"));
      }
      const orbitState = {
        angle: ORBIT_HANDOFF_START_ANGLE_RAD + settlePhase * ORBIT_HANDOFF_HALF_TURN_RAD,
        angularVelocity:
          progress < 1
            ? previewDirection * HOME_ORBIT_CONTRACT.orbit.maxAngularSpeedRadPerSec
            : 0,
      };
      orbitController.handoff(orbitState);
      orbitRoot.dataset.orbitActive = "true";
      if (!orbitOwnershipStarted) {
        orbitOwnershipStarted = true;
        window.dispatchEvent(new CustomEvent("baozi:intro-person-stood"));
      }
      if (progress === 1) {
        if (introPreviewing) {
          introPreviewing = false;
          window.dispatchEvent(new CustomEvent("baozi:intro-orbit-settle"));
        }
        if (!settledHandoffDispatched) {
          settledHandoffDispatched = true;
          window.dispatchEvent(new CustomEvent("baozi:intro-orbit-handoff", { detail: orbitState }));
        }
      }
    }

    leash.ownerSVGElement?.setAttribute("viewBox", `0 0 ${width} ${height}`);
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
      const hand = { x: personState.x + personSprite.offsetWidth * personAnchor[0], y: personWrapper.offsetTop + personState.y + personSprite.offsetHeight * personAnchor[1] };
      const collar = { x: dogState.x + dogSprite.offsetWidth * dogAnchor[0], y: dogWrapper.offsetTop + dogState.y + dogSprite.offsetHeight * dogAnchor[1] };
      leash.setAttribute("d", leashPath(hand, collar, mix(4, 28, range(progress, 0.25, 0.45))));
      leash.setAttribute("opacity", "1");
    } else {
      leash.setAttribute("opacity", "0");
    }
    if (orbitOwnsScene) finalArt.hidden = true;
    if (debug && debugOutput) debugOutput.textContent = `${phase} · ${progress.toFixed(3)} · frames ${ballFrame}/${dogFrame}/${personFrame}`;
    if (progress === 1 && !completed) {
      completed = true;
      onComplete();
    } else if (progress < 1) {
      completed = false;
    }
    previousProgress = progress;
  };
  window.addEventListener("baozi:orbit-person-asset-error", render, { signal: lifecycle.signal });
  window.addEventListener("baozi:orbit-ready", render, { signal: lifecycle.signal });

  const timeline = gsap.timeline({ paused: true });
  timeline.to(state, { progress: 1, duration: 1, ease: "none", onUpdate: render });
  ScrollTrigger.create({
    trigger: root,
    start: "top top",
    end: "bottom bottom",
    scrub: true,
    animation: timeline,
    onKill: () => lifecycle.abort(),
  });
  render();
  return timeline;
}
