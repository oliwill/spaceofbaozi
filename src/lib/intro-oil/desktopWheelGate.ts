const COMPLETE_POSE_PROGRESS = 0.972;
const WHEEL_GESTURE_GAP_MS = 300;
const SCROLL_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "PageUp", "PageDown", "Home", "End", " "]);

interface DesktopWheelGateOptions {
  enabled: () => boolean;
  progress: () => number;
  pin: () => number;
  complete: () => void;
  signal: AbortSignal;
}

export function createDesktopWheelGate(options: DesktopWheelGateOptions) {
  let wheelOwned = false;
  let waiting = false;
  let armed = false;
  let armFrame = 0;
  let lastWheelAt: number | undefined;
  let pinnedProgress = COMPLETE_POSE_PROGRESS;
  let pinning = false;

  function disarm(): void {
    if (armFrame) cancelAnimationFrame(armFrame);
    armFrame = 0;
    armed = false;
  }

  function release(): void {
    wheelOwned = false;
    waiting = false;
    disarm();
  }

  function pin(): void {
    if (pinning) return;
    disarm();
    pinning = true;
    try { pinnedProgress = options.pin(); }
    finally { pinning = false; }
  }

  function onWheel(event: WheelEvent): void {
    if (!event.isTrusted) return;
    const now = performance.now();
    const gap = lastWheelAt === undefined ? 0 : now - lastWheelAt;
    lastWheelAt = now;
    const eligible = options.enabled() && !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey;
    if (eligible && event.deltaX === 0 && event.deltaY === 0) return;
    const vertical = Math.abs(event.deltaY) > Math.abs(event.deltaX);
    if (!eligible || !vertical || event.deltaY <= 0) {
      release();
      return;
    }
    if (!waiting) {
      wheelOwned = options.progress() < COMPLETE_POSE_PROGRESS;
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (event.cancelable === false) return;
    if (armed && gap >= WHEEL_GESTURE_GAP_MS) {
      release();
      options.complete();
    }
  }

  function onOtherInput(event: Event): void {
    if (event.isTrusted && (event.type !== "keydown" || SCROLL_KEYS.has((event as KeyboardEvent).key))) release();
  }

  window.addEventListener("wheel", onWheel, { capture: true, passive: false, signal: options.signal });
  for (const type of ["keydown", "touchstart", "pointerdown"]) {
    window.addEventListener(type, onOtherInput, { capture: true, signal: options.signal });
  }
  options.signal.addEventListener("abort", release, { once: true });

  return {
    constrain(progress: number): number {
      if (!options.enabled()) { release(); return progress; }
      if (waiting) {
        if (!pinning && Math.abs(progress - pinnedProgress) > 1e-9) pin();
        return COMPLETE_POSE_PROGRESS;
      }
      if (!wheelOwned || progress < COMPLETE_POSE_PROGRESS) return progress;
      waiting = true;
      pin();
      return COMPLETE_POSE_PROGRESS;
    },
    rendered(progress: number): void {
      if (!waiting || !options.enabled() || progress !== COMPLETE_POSE_PROGRESS || armed || armFrame) return;
      armFrame = requestAnimationFrame(() => {
        armFrame = 0;
        if (waiting && options.enabled()) armed = true;
      });
    },
    layoutChanged(): void {
      disarm();
      if (!options.enabled()) release();
      else if (waiting) pin();
    },
  };
}
