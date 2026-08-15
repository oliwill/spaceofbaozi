import { HOME_ORBIT_CONTRACT } from "./contract";
import type { OrbitLayer, OrbitState } from "./contract";
import { normalizeAngle, shortestArc, stepOrbit, targetAngleFromPointer } from "./orbitIntegrator";
import { mapPerspective } from "./perspectiveMapper";
import { selectDogSprite, selectPersonGaze } from "./spriteSelector";

export type HomeOrbitController = {
  handoff(state: Pick<OrbitState, "angle" | "angularVelocity">): void;
  enable(): void;
  disable(): void;
  destroy(): void;
};

type OrbitInitialState = Pick<OrbitState, "angle" | "angularVelocity">;
type CachedMeasure = {
  rootLeft: number;
  rootTop: number;
  personFeetX: number;
  personFeetY: number;
  radiusX: number;
  radiusY: number;
  interactionLeft: number;
  interactionTop: number;
  interactionRight: number;
  interactionBottom: number;
};
type PointerSession = { id: number; startX: number; startY: number; captured: boolean };
type AssetProbe = { promise: Promise<boolean>; cancel(): void };
type OrbitDebugDetail = { angle: number; angularVelocity: number };

const TAU = Math.PI * 2;
const PERSON_DIRECTION_COUNT = 12;
const POINTER_CAPTURE_THRESHOLD_PX = 12;
const INTERACTION_PADDING_PX = 24;
const DOG_MAX_SCALE = HOME_ORBIT_CONTRACT.perspective.scaleBase + HOME_ORBIT_CONTRACT.perspective.scaleDepth;
const KEYBOARD_STEP_RAD = (15 * Math.PI) / 180;
const START_ANGLE_RAD = (HOME_ORBIT_CONTRACT.orbit.startAngleDeg * Math.PI) / 180;
const REST_ANGLE_RAD = (HOME_ORBIT_CONTRACT.orbit.restAngleDeg * Math.PI) / 180;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function requireElement<T extends Element>(root: ParentNode, selector: string, label: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`createHomeOrbit: missing ${label} (${selector})`);
  return element;
}

function requireClosest<T extends Element>(root: Element, selector: string, label: string): T {
  const element = root.closest<T>(selector);
  if (!element) throw new Error(`createHomeOrbit: missing ${label} (${selector})`);
  return element;
}

function requireAssetSource(root: HTMLElement, key: "dogOrbitSrc" | "personOrbitSrc"): string {
  const source = root.dataset[key];
  if (source) return source;
  const attribute = key === "dogOrbitSrc" ? "data-dog-orbit-src" : "data-person-orbit-src";
  throw new Error(`createHomeOrbit: missing asset source (${attribute})`);
}

function createAssetProbe(source: string): AssetProbe {
  const image = new Image();
  let settled = false;
  let resolveProbe: ((success: boolean) => void) | undefined;
  const promise = new Promise<boolean>((resolve) => {
    resolveProbe = resolve;
  });
  const settle = (success: boolean): void => {
    if (settled) return;
    settled = true;
    image.onload = null;
    image.onerror = null;
    resolveProbe?.(success);
    resolveProbe = undefined;
  };
  image.decoding = "async";
  image.onload = () => settle(image.naturalWidth > 0 && image.naturalHeight > 0);
  image.onerror = () => settle(false);
  image.src = source;
  return { promise, cancel: () => settle(false) };
}

function isOrbitDebugDetail(value: unknown): value is OrbitDebugDetail {
  if (typeof value !== "object" || value === null) return false;
  const detail = value as { angle?: unknown; angularVelocity?: unknown };
  return (
    typeof detail.angle === "number" &&
    Number.isFinite(detail.angle) &&
    typeof detail.angularVelocity === "number" &&
    Number.isFinite(detail.angularVelocity)
  );
}

function nearestPersonDirection(angle: number): number {
  return Math.round(normalizeAngle(angle) / (TAU / PERSON_DIRECTION_COUNT)) % PERSON_DIRECTION_COUNT;
}

function formatNumber(value: number): string {
  return String(Object.is(value, -0) ? 0 : value);
}

export function createHomeOrbit(root: HTMLElement, initial?: OrbitInitialState): HomeOrbitController {
  if (!root.matches("[data-home-orbit-root]")) {
    throw new Error("createHomeOrbit: root must match [data-home-orbit-root]");
  }

  const stage = requireClosest<HTMLElement>(root, "[data-intro-stage]", "intro stage");
  const person = requireElement<HTMLElement>(root, "[data-orbit-person]", "person surface");
  requireElement<HTMLElement>(root, "[data-person-sprite]", "person sprite");
  const personFeet = requireElement<HTMLElement>(root, "[data-person-feet-anchor]", "person feet anchor");
  const dogAnchor = requireElement<HTMLElement>(root, "[data-orbit-anchor]", "dog translation anchor");
  const dogVisual = requireElement<HTMLElement>(root, "[data-dog-visual]", "dog scale surface");
  requireElement<HTMLElement>(root, "[data-dog-sprite]", "dog sprite");
  requireElement<HTMLElement>(root, "[data-dog-shadow]", "dog shadow");
  const fallback = requireElement<HTMLElement>(root, "[data-orbit-fallback]", "asset fallback");
  const dogSource = requireAssetSource(root, "dogOrbitSrc");
  const personSource = requireAssetSource(root, "personOrbitSrc");

  const requestedInitialAngle = initial?.angle;
  const requestedInitialVelocity = initial?.angularVelocity;
  const initialAngle = typeof requestedInitialAngle === "number" && Number.isFinite(requestedInitialAngle)
    ? normalizeAngle(requestedInitialAngle)
    : START_ANGLE_RAD;
  let state: OrbitState = {
    angle: initialAngle,
    angularVelocity:
      typeof requestedInitialVelocity === "number" && Number.isFinite(requestedInitialVelocity)
        ? requestedInitialVelocity
        : 0,
    targetAngle: initialAngle,
  };
  let measure: CachedMeasure;
  let previousLayer: OrbitLayer = "front";
  let lastDogDirection = 0;
  let lastPersonDirection = nearestPersonDirection(initialAngle);
  let filteredPersonAngle = initialAngle;
  let elapsedMovingSeconds = 0;
  let personAssetFailed = false;
  let enabled = false;
  let introPreviewActive = false;
  let ready = false;
  let destroyed = false;
  let lastTimestamp: number | null = null;
  let rafId = 0;
  let restTimer: number | undefined;
  let stoodTimer: number | undefined;
  let pointerSession: PointerSession | undefined;
  let reducedTap: { id: number; x: number; y: number } | undefined;
  let mouseInsideInteraction = false;

  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reducedMotion = reducedMotionQuery.matches;
  root.dataset.reducedMotion = String(reducedMotion);

  const measureOrbit = (): void => {
    const rootRect = root.getBoundingClientRect();
    const personRect = person.getBoundingClientRect();
    const feetRect = personFeet.getBoundingClientRect();
    const dogRect = dogAnchor.getBoundingClientRect();
    const radiusX = clamp(rootRect.width * 0.17, 150, 230);
    const radiusY = radiusX * HOME_ORBIT_CONTRACT.orbit.radiusYRatio;
    const feetClientX = feetRect.left + feetRect.width / 2;
    const feetClientY = feetRect.top + feetRect.height / 2;
    const dogMaxWidth = dogRect.width * DOG_MAX_SCALE;
    const dogMaxHeight = dogRect.height * DOG_MAX_SCALE;
    const orbitLeft = feetClientX - radiusX - dogMaxWidth / 2;
    const orbitRight = feetClientX + radiusX + dogMaxWidth / 2;
    const orbitTop = feetClientY - radiusY - dogMaxHeight;
    const orbitBottom = feetClientY + radiusY;
    measure = {
      rootLeft: rootRect.left,
      rootTop: rootRect.top,
      personFeetX: feetClientX - rootRect.left,
      personFeetY: feetClientY - rootRect.top,
      radiusX,
      radiusY,
      interactionLeft: clamp(Math.min(personRect.left, orbitLeft) - INTERACTION_PADDING_PX, rootRect.left, rootRect.right),
      interactionTop: clamp(Math.min(personRect.top, orbitTop) - INTERACTION_PADDING_PX, rootRect.top, rootRect.bottom),
      interactionRight: clamp(Math.max(personRect.right, orbitRight) + INTERACTION_PADDING_PX, rootRect.left, rootRect.right),
      interactionBottom: clamp(Math.max(personRect.bottom, orbitBottom) + INTERACTION_PADDING_PX, rootRect.top, rootRect.bottom),
    };
  };

  const render = (dtSeconds: number): void => {
    if (destroyed || !ready) return;
    const pose = mapPerspective({
      angle: state.angle,
      radiusX: measure.radiusX,
      radiusY: measure.radiusY,
      previousLayer,
    });
    if (Math.abs(state.angularVelocity) >= HOME_ORBIT_CONTRACT.orbit.stopAngularVelocityRadPerSec) {
      elapsedMovingSeconds += dtSeconds;
    } else {
      elapsedMovingSeconds = 0;
    }
    const dogSprite = selectDogSprite({
      angle: state.angle,
      angularVelocity: state.angularVelocity,
      radiusX: measure.radiusX,
      radiusY: measure.radiusY,
      elapsedMovingSeconds,
      lastDirection: lastDogDirection,
    });
    const personGaze = personAssetFailed
      ? undefined
      : selectPersonGaze({
          dogX: pose.x,
          dogY: pose.y,
          filteredAngle: filteredPersonAngle,
          dtSeconds,
          lastDirection: lastPersonDirection,
        });

    previousLayer = pose.layer;
    lastDogDirection = dogSprite.direction;
    if (personGaze) {
      filteredPersonAngle = personGaze.filteredAngle;
      lastPersonDirection = personGaze.direction;
    }

    // Reduced motion never shows gait: the contact frame stays at 0 and only
    // the opacity crossfade marks a position change.
    const dogGaitFrame = reducedMotion ? 0 : dogSprite.gaitFrame;

    const style = root.style;
    style.setProperty("--person-feet-x", `${formatNumber(measure.personFeetX)}px`);
    style.setProperty("--person-feet-y", `${formatNumber(measure.personFeetY)}px`);
    style.setProperty("--orbit-x", `${formatNumber(pose.x)}px`);
    style.setProperty("--orbit-y", `${formatNumber(pose.y)}px`);
    style.setProperty("--dog-scale", formatNumber(pose.dogScale));
    style.setProperty("--dog-z", String(pose.zIndex));
    style.setProperty("--shadow-opacity", formatNumber(pose.shadow.opacity));
    style.setProperty("--shadow-scale-x", formatNumber(pose.shadow.scaleX));
    style.setProperty("--shadow-scale-y", formatNumber(pose.shadow.scaleY));
    style.setProperty("--dog-frame", String(dogGaitFrame));
    style.setProperty("--dog-direction", String(dogSprite.direction));
    if (personGaze) {
      style.setProperty("--person-col", String(personGaze.direction % 4));
      style.setProperty("--person-row", String(Math.floor(personGaze.direction / 4)));
    }

    root.dataset.orbitReady = "true";
    root.dataset.orbitLayer = pose.layer;
    root.dataset.orbitAngle = formatNumber(state.angle);
    root.dataset.orbitAngularVelocity = formatNumber(state.angularVelocity);
    root.dataset.orbitTargetAngle = formatNumber(state.targetAngle);
    root.dataset.dogScale = formatNumber(pose.dogScale);
    root.dataset.dogDirection = String(dogSprite.direction);
    root.dataset.dogFrame = String(dogGaitFrame);
    if (personGaze) root.dataset.personDirection = String(personGaze.direction);
  };

  const resetGazeToRenderedAngle = (): void => {
    const pose = mapPerspective({
      angle: state.angle,
      radiusX: measure.radiusX,
      radiusY: measure.radiusY,
      previousLayer,
    });
    filteredPersonAngle = normalizeAngle(Math.atan2(pose.y, pose.x));
    lastPersonDirection = nearestPersonDirection(filteredPersonAngle);
  };

  const clearRestTimer = (): void => {
    if (restTimer === undefined) return;
    window.clearTimeout(restTimer);
    restTimer = undefined;
  };

  const clearStoodTimer = (): void => {
    if (stoodTimer === undefined) return;
    window.clearTimeout(stoodTimer);
    stoodTimer = undefined;
  };

  const scheduleRest = (): void => {
    clearRestTimer();
    restTimer = window.setTimeout(() => {
      restTimer = undefined;
      if (!destroyed && enabled && !reducedMotion) state.targetAngle = REST_ANGLE_RAD;
    }, HOME_ORBIT_CONTRACT.orbit.pointerLeaveDelayMs);
  };

  const releasePointerSession = (): void => {
    const session = pointerSession;
    pointerSession = undefined;
    if (session?.captured && stage.hasPointerCapture(session.id)) stage.releasePointerCapture(session.id);
  };

  const pointIsInsideOrbit = (clientX: number, clientY: number): boolean =>
    clientX >= measure.interactionLeft &&
    clientX <= measure.interactionRight &&
    clientY >= measure.interactionTop &&
    clientY <= measure.interactionBottom;

  const updateTargetFromPoint = (clientX: number, clientY: number): void => {
    clearRestTimer();
    state.targetAngle = targetAngleFromPointer(
      state,
      clientX - (measure.rootLeft + measure.personFeetX),
      clientY - (measure.rootTop + measure.personFeetY),
    );
  };

  const onMouseMove = (event: MouseEvent): void => {
    if (!enabled || reducedMotion || pointerSession) return;
    const inside = pointIsInsideOrbit(event.clientX, event.clientY);
    if (inside) {
      clearRestTimer();
      updateTargetFromPoint(event.clientX, event.clientY);
    } else if (mouseInsideInteraction) {
      scheduleRest();
    }
    mouseInsideInteraction = inside;
  };

  const onMouseLeave = (): void => {
    if (!enabled || reducedMotion || !mouseInsideInteraction) return;
    mouseInsideInteraction = false;
    scheduleRest();
  };

  const onPointerDown = (event: PointerEvent): void => {
    if (reducedMotion) {
      if (enabled && event.isPrimary && pointIsInsideOrbit(event.clientX, event.clientY)) {
        reducedTap = { id: event.pointerId, x: event.clientX, y: event.clientY };
      }
      return;
    }
    if (
      !enabled ||
      event.pointerType === "mouse" ||
      !event.isPrimary ||
      !pointIsInsideOrbit(event.clientX, event.clientY)
    ) return;
    clearRestTimer();
    releasePointerSession();
    pointerSession = { id: event.pointerId, startX: event.clientX, startY: event.clientY, captured: false };
  };

  const onPointerMove = (event: PointerEvent): void => {
    const tap = reducedTap;
    if (tap && event.pointerId === tap.id) {
      if (Math.abs(event.clientX - tap.x) > POINTER_CAPTURE_THRESHOLD_PX ||
          Math.abs(event.clientY - tap.y) > POINTER_CAPTURE_THRESHOLD_PX) {
        reducedTap = undefined;
      }
      return;
    }
    const session = pointerSession;
    if (!enabled || reducedMotion || !session || event.pointerId !== session.id) return;
    const deltaX = event.clientX - session.startX;
    const deltaY = event.clientY - session.startY;
    if (!session.captured) {
      const horizontalDistance = Math.abs(deltaX);
      const verticalDistance = Math.abs(deltaY);
      if (horizontalDistance > POINTER_CAPTURE_THRESHOLD_PX && horizontalDistance > verticalDistance) {
        try {
          stage.setPointerCapture(event.pointerId);
        } catch {
          // Synthetic pointers in tests have no active pointer id.
        }
        session.captured = true;
      } else {
        if (verticalDistance > POINTER_CAPTURE_THRESHOLD_PX && verticalDistance >= horizontalDistance) {
          pointerSession = undefined;
        }
        return;
      }
    }
    event.preventDefault();
    updateTargetFromPoint(event.clientX, event.clientY);
  };

  const onPointerEnd = (event: PointerEvent): void => {
    const tap = reducedTap;
    if (tap && event.pointerId === tap.id) {
      reducedTap = undefined;
      if (Math.abs(event.clientX - tap.x) <= POINTER_CAPTURE_THRESHOLD_PX &&
          Math.abs(event.clientY - tap.y) <= POINTER_CAPTURE_THRESHOLD_PX) {
        stepReducedMotion(1);
      }
      return;
    }
    if (!pointerSession || event.pointerId !== pointerSession.id) return;
    if (pointerSession.captured) event.preventDefault();
    releasePointerSession();
  };


  const REDUCED_ANGLES = HOME_ORBIT_CONTRACT.reducedMotion.positionsDeg.map((deg) => (deg * Math.PI) / 180);
  const nearestReducedIndex = (angle: number): number =>
    REDUCED_ANGLES.reduce((best, candidate, index) =>
      Math.abs(shortestArc(angle, candidate)) < Math.abs(shortestArc(angle, REDUCED_ANGLES[best])) ? index : best, 0);

  const stepReducedMotion = (delta: 1 | -1): void => {
    const index = (nearestReducedIndex(state.angle) + delta + REDUCED_ANGLES.length) % REDUCED_ANGLES.length;
    const angle = REDUCED_ANGLES[index];
    state.angle = angle;
    state.targetAngle = angle;
    state.angularVelocity = 0;
    lastTimestamp = null;
    elapsedMovingSeconds = 0;
    resetGazeToRenderedAngle();
    dogVisual.style.opacity = "0";
    render(0);
    window.requestAnimationFrame(() => {
      if (!destroyed) dogVisual.style.opacity = "1";
    });
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    if (!enabled || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return;
    event.preventDefault();
    if (reducedMotion) {
      stepReducedMotion(event.key === "ArrowRight" ? 1 : -1);
      return;
    }
    clearRestTimer();
    state.targetAngle = normalizeAngle(
      state.targetAngle + (event.key === "ArrowRight" ? KEYBOARD_STEP_RAD : -KEYBOARD_STEP_RAD),
    );
  };

  const onVisibilityChange = (): void => {
    lastTimestamp = null;
  };

  const onReducedMotionChange = (event: MediaQueryListEvent): void => {
    reducedMotion = event.matches;
    root.dataset.reducedMotion = String(reducedMotion);
    lastTimestamp = null;
    if (reducedMotion) {
      clearRestTimer();
      releasePointerSession();
    }
    render(0);
  };

  const onDebugSet = (event: Event): void => {
    if (!(event instanceof CustomEvent) || !isOrbitDebugDetail(event.detail)) return;
    const angle = normalizeAngle(event.detail.angle);
    state.angle = angle;
    state.angularVelocity = event.detail.angularVelocity;
    state.targetAngle = angle;
    // Debug-set is an exact pose override: seed layer hysteresis from the new
    // depth instead of inheriting whatever pose the intro handoff left behind.
    // In-band depths deterministically seed "front" so stress alternation
    // inside the hysteresis band never toggles the layer.
    previousLayer = Math.sin(angle) < HOME_ORBIT_CONTRACT.perspective.backThreshold ? "behind" : "front";
    elapsedMovingSeconds = 0;
    resetGazeToRenderedAngle();
    render(0);
  };

  const handoff = (nextState: Pick<OrbitState, "angle" | "angularVelocity">): void => {
    if (
      destroyed ||
      !Number.isFinite(nextState.angle) ||
      !Number.isFinite(nextState.angularVelocity)
    ) return;
    const angle = normalizeAngle(nextState.angle);
    state.angle = angle;
    state.angularVelocity = nextState.angularVelocity;
    state.targetAngle = angle;
    lastTimestamp = null;
    elapsedMovingSeconds = 0;
    resetGazeToRenderedAngle();
    render(0);
  };

  const enable = (): void => {
    if (destroyed || enabled) return;
    enabled = true;
    lastTimestamp = null;
    mouseInsideInteraction = false;
    root.dataset.controlsEnabled = "true";
  };

  const disable = (): void => {
    if (destroyed) return;
    enabled = false;
    lastTimestamp = null;
    mouseInsideInteraction = false;
    root.dataset.controlsEnabled = "false";
    clearStoodTimer();
    clearRestTimer();
    releasePointerSession();
  };

  const onIntroOrbitHandoff = (event: Event): void => {
    if (!(event instanceof CustomEvent) || !isOrbitDebugDetail(event.detail)) return;
    handoff(event.detail);
    introPreviewActive = false;
    root.dataset.orbitActive = "true";
  };

  const onIntroPersonStood = (): void => {
    introPreviewActive = true;
    clearStoodTimer();
    stoodTimer = window.setTimeout(() => {
      stoodTimer = undefined;
      enable();
    }, HOME_ORBIT_CONTRACT.transition.controlEnableDelayMs);
  };

  const onIntroOrbitPreview = (): void => {
    introPreviewActive = true;
  };

  const activateReducedStaticOrbit = (): void => {
    const angle = REDUCED_ANGLES[nearestReducedIndex(state.angle)];
    state.angle = angle;
    state.targetAngle = angle;
    state.angularVelocity = 0;
    root.dataset.orbitActive = "true";
    enable();
    render(0);
    // The orbit now owns the actors; hide the static final art if setFinalState
    // already revealed it (probe-settle path runs after the intro finished).
    const finalArt = document.querySelector<HTMLImageElement>("[data-intro-final-art]");
    if (finalArt) finalArt.hidden = true;
  };

  const onIntroOrbitReset = (): void => {
    introPreviewActive = false;
    clearStoodTimer();
    disable();
    root.dataset.orbitActive = "false";
    // Restore the canonical start pose so hidden orbit rects are measured from
    // the same 35° state the next forward handoff will begin at.
    state.angle = initialAngle;
    state.angularVelocity = 0;
    state.targetAngle = initialAngle;
    lastDogDirection = 0;
    lastPersonDirection = nearestPersonDirection(initialAngle);
    filteredPersonAngle = initialAngle;
    elapsedMovingSeconds = 0;
    lastTimestamp = null;
    resetGazeToRenderedAngle();
    render(0);
    // Reduced-motion intros jump straight to the final state; if probes already
    // settled, activate the static four-position orbit from here as well.
    if (reducedMotion && ready && root.dataset.assetError !== "true") {
      activateReducedStaticOrbit();
    }
  };

  const onIntroOrbitSettle = (): void => {
    introPreviewActive = false;
  };

  const tick = (timestamp: number): void => {
    if (destroyed) return;
    const dtSeconds = lastTimestamp === null
      ? 0
      : Math.min((timestamp - lastTimestamp) / 1000, HOME_ORBIT_CONTRACT.orbit.maxDtSeconds);
    lastTimestamp = timestamp;
    if (ready && enabled && !reducedMotion && !introPreviewActive) {
      state = stepOrbit(state, dtSeconds);
      render(dtSeconds);
    }
    rafId = window.requestAnimationFrame(tick);
  };

  const resizeObserver = new ResizeObserver(() => {
    measureOrbit();
    render(0);
  });

  measureOrbit();
  resizeObserver.observe(root);
  resizeObserver.observe(person);
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseleave", onMouseLeave);
  stage.addEventListener("pointerdown", onPointerDown);
  stage.addEventListener("pointermove", onPointerMove, { passive: false });
  stage.addEventListener("pointerup", onPointerEnd);
  stage.addEventListener("pointercancel", onPointerEnd);
  stage.addEventListener("lostpointercapture", onPointerEnd);
  root.addEventListener("keydown", onKeyDown);
  document.addEventListener("visibilitychange", onVisibilityChange);
  reducedMotionQuery.addEventListener("change", onReducedMotionChange);
  if (import.meta.env.DEV) window.addEventListener("baozi:orbit-debug-set", onDebugSet);
  window.addEventListener("baozi:intro-orbit-handoff", onIntroOrbitHandoff);
  window.addEventListener("baozi:intro-person-stood", onIntroPersonStood);
  window.addEventListener("baozi:intro-orbit-reset", onIntroOrbitReset);
  window.addEventListener("baozi:intro-orbit-preview", onIntroOrbitPreview);
  window.addEventListener("baozi:intro-orbit-settle", onIntroOrbitSettle);
  rafId = window.requestAnimationFrame(tick);

  const dogProbe = createAssetProbe(dogSource);
  const personProbe = createAssetProbe(personSource);
  void Promise.all([dogProbe.promise, personProbe.promise]).then(([dogAvailable, personAvailable]) => {
    if (destroyed) return;
    if (!dogAvailable) {
      root.dataset.assetError = "true";
      fallback.hidden = false;
    }
    if (!personAvailable) {
      personAssetFailed = true;
      root.dataset.personOrbitError = "true";
      window.dispatchEvent(new CustomEvent("baozi:orbit-person-asset-error"));
    }
    ready = true;
    render(0);
    window.dispatchEvent(new CustomEvent("baozi:orbit-ready"));
    // Reduced-motion users skip the scroll intro entirely (setFinalState). When
    // the intro is already complete and assets are healthy, self-activate the
    // orbit as a static four-position scene with controls enabled.
    if (
      reducedMotion &&
      root.dataset.assetError !== "true" &&
      document.querySelector("[data-intro-root]")?.getAttribute("data-intro-complete") === "true"
    ) {
      activateReducedStaticOrbit();
    }
  });

  return {
    handoff,
    enable,
    disable,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      enabled = false;
      window.cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      dogProbe.cancel();
      personProbe.cancel();
      clearRestTimer();
      clearStoodTimer();
      releasePointerSession();
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
      stage.removeEventListener("pointerdown", onPointerDown);
      stage.removeEventListener("pointermove", onPointerMove);
      stage.removeEventListener("pointerup", onPointerEnd);
      stage.removeEventListener("pointercancel", onPointerEnd);
      stage.removeEventListener("lostpointercapture", onPointerEnd);
      root.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      reducedMotionQuery.removeEventListener("change", onReducedMotionChange);
      window.removeEventListener("baozi:intro-orbit-handoff", onIntroOrbitHandoff);
      window.removeEventListener("baozi:intro-person-stood", onIntroPersonStood);
      window.removeEventListener("baozi:intro-orbit-reset", onIntroOrbitReset);
      window.removeEventListener("baozi:intro-orbit-preview", onIntroOrbitPreview);
      window.removeEventListener("baozi:intro-orbit-settle", onIntroOrbitSettle);
      if (import.meta.env.DEV) window.removeEventListener("baozi:orbit-debug-set", onDebugSet);
    },
  };
}
