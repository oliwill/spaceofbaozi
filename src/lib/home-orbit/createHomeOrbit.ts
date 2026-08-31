import { gsap } from "gsap";

import {
  HOME_ORBIT_CONTRACT,
  type OrbitLayer,
  type OrbitState,
} from "@/lib/home-orbit/contract";
import {
  normalizeAngle,
  shortestArc,
  stepOrbit,
  targetAngleFromPointer,
} from "@/lib/home-orbit/orbitIntegrator";
import { mapPerspective } from "@/lib/home-orbit/perspectiveMapper";
import { selectDogSprite, selectPersonGaze } from "@/lib/home-orbit/spriteSelector";

export type HomeOrbitController = {
  handoff(state: Pick<OrbitState, "angle" | "angularVelocity">): void;
  enable(): void;
  disable(): void;
  destroy(): void;
};

type OrbitEventDetail = Pick<OrbitState, "angle" | "angularVelocity">;
type OrbitMeasurements = {
  footX: number;
  footY: number;
  radiusX: number;
  radiusY: number;
};
type SpriteLayerState = {
  active: HTMLElement;
  inactive: HTMLElement;
  direction: number | null;
};

function setSpritePose(element: HTMLElement, firstVariable: string, firstValue: number, secondVariable: string, secondValue: number): void {
  element.style.setProperty(firstVariable, String(firstValue));
  element.style.setProperty(secondVariable, String(secondValue));
}

function renderSpriteLayer(
  layer: SpriteLayerState,
  directionKey: number,
  firstValue: number,
  firstVariable: string,
  secondValue: number,
  secondVariable: string,
): void {
  if (layer.direction === null) {
    setSpritePose(layer.active, firstVariable, firstValue, secondVariable, secondValue);
    layer.active.dataset.spriteVisible = "true";
    layer.inactive.dataset.spriteVisible = "false";
    layer.direction = directionKey;
    return;
  }
  if (layer.direction !== directionKey) {
    setSpritePose(layer.inactive, firstVariable, firstValue, secondVariable, secondValue);
    layer.inactive.dataset.spriteVisible = "true";
    layer.active.dataset.spriteVisible = "false";
    [layer.active, layer.inactive] = [layer.inactive, layer.active];
    layer.direction = directionKey;
    return;
  }
  setSpritePose(layer.active, firstVariable, firstValue, secondVariable, secondValue);
}


const toRadians = (degrees: number) => degrees * Math.PI / 180;

function loadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => reject(new Error(`Unable to load orbit asset: ${src}`));
    image.src = src;
  });
}

export function createHomeOrbit(
  root: HTMLElement,
  initial: Partial<OrbitState> = {},
): HomeOrbitController {
  const person = root.querySelector<HTMLElement>("[data-orbit-person]");
  const personFoot = root.querySelector<HTMLElement>("[data-person-feet-anchor]");
  const personSprite = root.querySelector<HTMLElement>("[data-person-sprite]");
  const personSpriteCrossfade = root.querySelector<HTMLElement>("[data-person-sprite-crossfade]");
  const dogVisual = root.querySelector<HTMLElement>("[data-dog-visual]");
  const dogSprite = root.querySelector<HTMLElement>("[data-dog-sprite]");
  const dogSpriteCrossfade = root.querySelector<HTMLElement>("[data-dog-sprite-crossfade]");
  const fallback = root.querySelector<HTMLElement>("[data-orbit-fallback]");
  if (!person || !personFoot || !personSprite || !personSpriteCrossfade || !dogVisual || !dogSprite || !dogSpriteCrossfade || !fallback) {
    throw new Error("home orbit DOM is incomplete");
  }

  const orbit = HOME_ORBIT_CONTRACT.orbit;
  const startAngle = toRadians(HOME_ORBIT_CONTRACT.orbit.startAngleDeg);
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const reducedAngles = HOME_ORBIT_CONTRACT.reducedMotion.positionsDeg.map(toRadians);
  let state: OrbitState = {
    angle: normalizeAngle(initial.angle ?? startAngle),
    angularVelocity: initial.angularVelocity ?? 0,
    targetAngle: normalizeAngle(initial.targetAngle ?? initial.angle ?? startAngle),
  };
  let layer: OrbitLayer = "front";
  let enabled = false;
  let destroyed = false;
  let tickerActive = false;
  let measurements: OrbitMeasurements | null = null;
  const personLayers: SpriteLayerState = { active: personSprite, inactive: personSpriteCrossfade, direction: null };
  const dogLayers: SpriteLayerState = { active: dogSprite, inactive: dogSpriteCrossfade, direction: null };
  let elapsedMovingSeconds = 0;
  let lastDogDirection = 0;
  let lastPersonDirection = 0;
  let filteredLookAngle = state.angle;
  let pointerLeaveTimer = 0;
  let enableTimer = 0;
  let activePointerId: number | null = null;
  let pointerStart: { x: number; y: number } | null = null;
  let pointerCaptured = false;
  let reducedIndex = reducedAngles.reduce((best, candidate, index) => (
    Math.abs(shortestArc(state.angle, candidate))
      < Math.abs(shortestArc(state.angle, reducedAngles[best])) ? index : best
  ), 0);

  root.dataset.reducedMotion = String(reduced);
  root.style.setProperty(
    "--orbit-crossfade-ms",
    `${HOME_ORBIT_CONTRACT.reducedMotion.crossfadeMs}ms`,
  );
  root.style.setProperty(
    "--orbit-direction-crossfade-ms",
    `${orbit.directionCrossfadeMs}ms`,
  );
  const readMeasurements = (): OrbitMeasurements => {
    const rootRect = root.getBoundingClientRect();
    const footRect = personFoot.getBoundingClientRect();
    const radiusX = Math.min(
      orbit.radiusXMaxPx,
      Math.max(orbit.radiusXMinPx, rootRect.width * orbit.radiusXRatio),
    );
    return {
      footX: footRect.left - rootRect.left,
      footY: footRect.top - rootRect.top,
      radiusX,
      radiusY: radiusX * orbit.radiusYRatio,
    };
  };
  const getMeasurements = (): OrbitMeasurements => {
    measurements ??= readMeasurements();
    return measurements;
  };
  const render = (dtSeconds: number) => {
    if (destroyed) return;
    const layout = getMeasurements();
    const pose = mapPerspective({
      angle: state.angle,
      radiusX: layout.radiusX,
      radiusY: layout.radiusY,
      previousLayer: layer,
    });
    layer = pose.layer;
    const dog = selectDogSprite({
      angle: state.angle,
      angularVelocity: reduced ? 0 : state.angularVelocity,
      radiusX: layout.radiusX,
      radiusY: layout.radiusY,
      elapsedMovingSeconds,
      lastDirection: lastDogDirection,
    });
    const revealLinear = Math.min(1, Math.max(0,
      (HOME_ORBIT_CONTRACT.perspective.revealStartDepth - pose.depth)
      / (1 + HOME_ORBIT_CONTRACT.perspective.revealStartDepth),
    ));
    const revealProgress = revealLinear * revealLinear * (3 - 2 * revealLinear);
    const tangentSign = [0, 1, 7].includes(dog.direction)
      ? 1
      : [3, 4, 5].includes(dog.direction) ? -1 : Math.sign(state.angularVelocity) || 1;
    const revealOffsetX = revealProgress
      * layout.radiusX
      * HOME_ORBIT_CONTRACT.perspective.revealRadiusRatio
      * tangentSign;
    const renderedDogX = pose.x + revealOffsetX;
    const gaze = selectPersonGaze({
      dogX: renderedDogX,
      dogY: pose.y,
      filteredAngle: filteredLookAngle,
      dtSeconds,
      lastDirection: lastPersonDirection,
    });
    lastDogDirection = dog.direction;
    lastPersonDirection = gaze.direction;
    filteredLookAngle = gaze.filteredAngle;
    elapsedMovingSeconds = dog.moving ? elapsedMovingSeconds + dtSeconds : 0;

    root.style.setProperty("--person-feet-x", `${layout.footX}px`);
    root.style.setProperty("--person-feet-y", `${layout.footY}px`);
    root.style.setProperty("--orbit-x", `${renderedDogX}px`);
    root.style.setProperty("--orbit-y", `${pose.y}px`);
    root.style.setProperty("--dog-scale", String(pose.dogScale));
    root.style.setProperty("--dog-z", String(pose.zIndex));
    root.style.setProperty("--shadow-opacity", String(pose.shadow.opacity));
    root.style.setProperty("--shadow-scale-x", String(pose.shadow.scaleX));
    root.style.setProperty("--shadow-scale-y", String(pose.shadow.scaleY));
    renderSpriteLayer(dogLayers, dog.direction, dog.gaitFrame, "--dog-frame", dog.direction, "--dog-direction");
    renderSpriteLayer(personLayers, gaze.direction, gaze.direction % 4, "--person-col", Math.floor(gaze.direction / 4), "--person-row");
    Object.assign(root.dataset, {
      orbitLayer: pose.layer,
      orbitAngle: String(state.angle),
      orbitTargetAngle: String(state.targetAngle),
      orbitDepth: String(pose.depth),
      orbitRenderedX: String(renderedDogX),
      orbitRevealX: String(revealOffsetX),
      dogScale: String(pose.dogScale),
      dogDirection: String(dog.direction),
      dogFrame: String(dog.gaitFrame),
      personDirection: String(gaze.direction),
    });
  };

  const handoff = (next: Pick<OrbitState, "angle" | "angularVelocity">) => {
    if (!Number.isFinite(next.angle) || !Number.isFinite(next.angularVelocity)) return;
    state = {
      angle: normalizeAngle(next.angle),
      angularVelocity: next.angularVelocity,
      targetAngle: normalizeAngle(next.angle),
    };
    filteredLookAngle = Math.atan2(Math.sin(state.angle) * orbit.radiusYRatio, Math.cos(state.angle));
    root.dataset.orbitActive = "true";
    render(0);
  };

  const stopTicker = () => {
    if (!tickerActive) return;
    gsap.ticker.remove(tick);
    tickerActive = false;
  };

  const startTicker = () => {
    if (destroyed || reduced || tickerActive) return;
    tickerActive = true;
    gsap.ticker.add(tick);
  };

  const enable = () => {
    enabled = true;
    root.dataset.controlsEnabled = "true";
  };

  const disable = () => {
    enabled = false;
    root.dataset.controlsEnabled = "false";
    stopTicker();
  };

  const tick = (_time: number, deltaTime: number) => {
    if (destroyed || !enabled || reduced) {
      stopTicker();
      return;
    }
    const dt = Math.min(Math.max(deltaTime / 1000, 0), orbit.maxDtSeconds);
    state = stepOrbit(state, dt);
    render(dt);
    if (
      Math.abs(shortestArc(state.angle, state.targetAngle)) < toRadians(orbit.stopErrorDeg)
      && Math.abs(state.angularVelocity) < orbit.stopAngularVelocityRadPerSec
    ) {
      stopTicker();
    }
  };

  const updateTargetFromPointer = (event: PointerEvent) => {
    const layout = getMeasurements();
    const rootRect = root.getBoundingClientRect();
    state.targetAngle = targetAngleFromPointer({
      pointerX: event.clientX - rootRect.left,
      pointerY: event.clientY - rootRect.top,
      footX: layout.footX,
      footY: layout.footY,
      previousTarget: state.targetAngle,
    });
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!enabled || reduced) return;
    if (event.pointerType === "touch" || event.pointerType === "pen") {
      if (event.pointerId !== activePointerId || !pointerStart) return;
      const deltaX = event.clientX - pointerStart.x;
      const deltaY = event.clientY - pointerStart.y;
      if (!pointerCaptured && Math.abs(deltaX) > 12 && Math.abs(deltaX) > Math.abs(deltaY)) {
        try {
          root.setPointerCapture(event.pointerId);
        } catch {
          // 合成事件没有原生 active pointer；仍验证拖动状态机。
        }
        pointerCaptured = true;
      }
      if (!pointerCaptured) return;
      event.preventDefault();
    }
    updateTargetFromPointer(event);
    startTicker();
  };

  const onPointerDown = (event: PointerEvent) => {
    if (!enabled || reduced || (event.pointerType !== "touch" && event.pointerType !== "pen")) return;
    activePointerId = event.pointerId;
    pointerStart = { x: event.clientX, y: event.clientY };
  };

  const releasePointer = (event: PointerEvent) => {
    if (event.pointerId !== activePointerId) return;
    if (pointerCaptured && root.hasPointerCapture(event.pointerId)) {
      root.releasePointerCapture(event.pointerId);
    }
    activePointerId = null;
    pointerStart = null;
    pointerCaptured = false;
  };

  const onPointerLeave = (event: PointerEvent) => {
    if (!enabled || reduced || event.pointerType !== "mouse") return;
    window.clearTimeout(pointerLeaveTimer);
    pointerLeaveTimer = window.setTimeout(() => {
      state.targetAngle = toRadians(orbit.restAngleDeg);
      startTicker();
    }, orbit.pointerLeaveDelayMs);
  };

  const stepReduced = (direction: number) => {
    reducedIndex = (reducedIndex + direction + reducedAngles.length) % reducedAngles.length;
    const angle = reducedAngles[reducedIndex];
    state = { angle, angularVelocity: 0, targetAngle: angle };
    filteredLookAngle = Math.atan2(Math.sin(angle) * orbit.radiusYRatio, Math.cos(angle));
    render(0);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    if (reduced) {
      stepReduced(event.key === "ArrowRight" ? 1 : -1);
      return;
    }
    state.targetAngle = normalizeAngle(
      state.targetAngle + toRadians(event.key === "ArrowRight" ? 15 : -15),
    );
    startTicker();
  };

  const readOrbitDetail = (event: Event): OrbitEventDetail | null => {
    const detail = (event as CustomEvent<OrbitEventDetail>).detail;
    return detail && Number.isFinite(detail.angle) && Number.isFinite(detail.angularVelocity)
      ? detail
      : null;
  };

  const onOrbitUpdate = (event: Event) => {
    const detail = readOrbitDetail(event);
    if (detail) handoff(detail);
  };
  const onPersonStood = () => {
    window.clearTimeout(enableTimer);
    enableTimer = window.setTimeout(enable, HOME_ORBIT_CONTRACT.transition.controlEnableDelayMs);
  };
  const onOrbitReset = () => {
    window.clearTimeout(enableTimer);
    disable();
    root.dataset.orbitActive = "false";
  };
  const onDebugSet = (event: Event) => {
    if (!import.meta.env.DEV) return;
    const detail = readOrbitDetail(event);
    if (detail) {
      disable();
      handoff(detail);
    }
  };

  root.addEventListener("pointermove", onPointerMove);
  root.addEventListener("pointerdown", onPointerDown);
  root.addEventListener("pointerup", releasePointer);
  root.addEventListener("pointercancel", releasePointer);
  root.addEventListener("pointerleave", onPointerLeave);
  root.addEventListener("keydown", onKeyDown);
  window.addEventListener("baozi:intro-orbit-update", onOrbitUpdate);
  window.addEventListener("baozi:intro-orbit-handoff", onOrbitUpdate);
  window.addEventListener("baozi:intro-person-stood", onPersonStood);
  window.addEventListener("baozi:intro-orbit-reset", onOrbitReset);
  window.addEventListener("baozi:orbit-debug-set", onDebugSet);

  const observer = new ResizeObserver(() => {
    measurements = null;
    render(0);
  });
  observer.observe(root);
  observer.observe(personFoot);

  const personSrc = root.dataset.personOrbitSrc ?? "";
  const dogSrc = root.dataset.dogOrbitSrc ?? "";
  Promise.allSettled([loadImage(personSrc), loadImage(dogSrc)]).then(([personResult, dogResult]) => {
    if (destroyed) return;
    if (personResult.status === "rejected") root.dataset.personOrbitError = "true";
    if (dogResult.status === "rejected") {
      root.dataset.assetError = "true";
      fallback.hidden = false;
    }
    root.dataset.orbitReady = "true";
  });

  render(0);

  return {
    handoff,
    enable,
    disable,
    destroy() {
      destroyed = true;
      disable();
      window.clearTimeout(pointerLeaveTimer);
      window.clearTimeout(enableTimer);
      if (activePointerId !== null && pointerCaptured && root.hasPointerCapture(activePointerId)) {
        root.releasePointerCapture(activePointerId);
      }
      observer.disconnect();
      root.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerdown", onPointerDown);
      root.removeEventListener("pointerup", releasePointer);
      root.removeEventListener("pointercancel", releasePointer);
      root.removeEventListener("pointerleave", onPointerLeave);
      root.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("baozi:intro-orbit-update", onOrbitUpdate);
      window.removeEventListener("baozi:intro-orbit-handoff", onOrbitUpdate);
      window.removeEventListener("baozi:intro-person-stood", onPersonStood);
      window.removeEventListener("baozi:intro-orbit-reset", onOrbitReset);
      window.removeEventListener("baozi:orbit-debug-set", onDebugSet);
    },
  };
}
