import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHomeOrbit, type HomeOrbitController } from "@/lib/home-orbit/createHomeOrbit";

vi.mock("gsap", () => ({ gsap: { ticker: { add: vi.fn(), remove: vi.fn() } } }));

class ElementStub extends EventTarget {
  dataset: Record<string, string> = {};
  style = { setProperty: vi.fn() };
  hidden = true;
  inert = true;
  offsetWidth = 800;
  children = new Map<string, ElementStub>();
  home: ElementStub | null = null;
  rect = { left: 0, top: 0, width: 800, height: 740 };
  querySelector(selector: string) { return this.children.get(selector) ?? null; }
  closest() { return this.home; }
  getBoundingClientRect() { return this.rect; }
  hasAttribute(name: string) { return name === "data-rail-orbit"; }
  hasPointerCapture() { return false; }
}

let home: ElementStub;
let controllers: HomeOrbitController[];

function mount() {
  const root = new ElementStub();
  root.home = home;
  root.dataset.controlsEnabled = "false";
  for (const key of ["orbit-person", "person-feet-anchor", "person-sprite", "person-sprite-crossfade", "dog-visual", "dog-sprite", "dog-sprite-crossfade", "orbit-fallback"]) {
    root.children.set(`[data-${key}]`, new ElementStub());
  }
  const controller = createHomeOrbit(root as unknown as HTMLElement);
  controller.handoff({ angle: 35 * Math.PI / 180, angularVelocity: 0 });
  controllers.push(controller);
  return { root, controller };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] });
  controllers = [];
  home = new ElementStub();
  home.dataset.introHomeActive = "true";
  vi.stubGlobal("window", Object.assign(new EventTarget(), {
    matchMedia: () => ({ matches: false }), setTimeout, clearTimeout,
  }));
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("Image", class {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(_value: string) { Promise.resolve().then(() => this.onload?.()); }
  });
});

afterEach(() => {
  controllers.forEach(controller => controller.destroy());
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("intro controls ownership", () => {
  it("disabled keyboard input does not consume the key or steer the dog", () => {
    const { root } = mount();
    const before = root.dataset.orbitTargetAngle;
    const event = Object.assign(new Event("keydown", { cancelable: true }), { key: "ArrowRight" });
    root.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(root.dataset.orbitTargetAngle).toBe(before);
  });

  it("a late mount inherits the original stood deadline, enabling at 300ms", () => {
    home.dataset.introControlsReadyAt = String(performance.now() + 300);
    const { root } = mount();
    vi.advanceTimersByTime(299);
    expect(root.dataset.controlsEnabled).toBe("false");
    vi.advanceTimersByTime(1);
    expect(root.dataset.controlsEnabled).toBe("true");
  });

  it("a remount after release keeps the remaining delay rather than restarting it", () => {
    home.dataset.introControlsReadyAt = String(performance.now() + 300);
    const first = mount();
    vi.advanceTimersByTime(100);
    first.controller.destroy();
    home.inert = false;
    delete home.dataset.introHomeActive;
    const second = mount();
    vi.advanceTimersByTime(199);
    expect(second.root.dataset.controlsEnabled).toBe("false");
    vi.advanceTimersByTime(1);
    expect(second.root.dataset.controlsEnabled).toBe("true");
    expect(first.root.dataset.controlsEnabled).toBe("false");
  });

  it("reset cancels pending input but keeps the covered rail pose prepared", () => {
    home.dataset.introControlsReadyAt = String(performance.now() + 300);
    const { root } = mount();
    delete home.dataset.introControlsReadyAt;
    window.dispatchEvent(new Event("baozi:intro-orbit-reset"));
    vi.advanceTimersByTime(400);
    expect(root.dataset.controlsEnabled).toBe("false");
    expect(root.dataset.orbitActive).toBe("true");
  });
});
