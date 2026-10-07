import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { initIntroOilRuntime } from "@/components/intro-oil/runtime";

const manifest: unknown = JSON.parse(readFileSync(new URL("../../../public/manifest/asset-manifest.v2.json", import.meta.url), "utf8"));

const controls = vi.hoisted(() => ({
  update: undefined as undefined | ((state: { progress: number }) => void),
  kill: vi.fn(),
  scroll: vi.fn(),
  start: 0,
  end: 2700,
  progress: 0,
}));
vi.mock("gsap", () => ({ default: { registerPlugin: vi.fn() } }));
vi.mock("gsap/ScrollTrigger", () => ({ ScrollTrigger: {
  create: (options: { onUpdate: (state: { progress: number }) => void }) => {
    controls.update = state => { controls.progress = state.progress; options.onUpdate(state); };
    return { kill: controls.kill, get start() { return controls.start; }, get end() { return controls.end; }, get progress() { return controls.progress; } };
  },
  refresh: vi.fn(),
} }));
vi.mock("@/lib/scroll/lenis", () => ({ scrollDocumentTo: controls.scroll }));

class ElementStub extends EventTarget {
  hidden = false;
  inert = false;
  complete = true;
  naturalWidth = 2560;
  naturalHeight = 640;
  dataset: Record<string, string> = {};
  attributes = new Map<string, string>();
  styles = new Map<string, string>();
  style: Record<string, unknown> = {
    setProperty: (name: string, value: string) => this.styles.set(name, value),
    removeProperty: (name: string) => this.styles.delete(name),
    getPropertyValue: (name: string) => this.styles.get(name) ?? "",
  };
  classes = new Set<string>();
  classList = {
    toggle: (name: string, enabled: boolean) => enabled ? this.classes.add(name) : this.classes.delete(name),
    add: (name: string) => this.classes.add(name),
    remove: (name: string) => this.classes.delete(name),
    contains: (name: string) => this.classes.has(name),
  };
  children = new Map<string, ElementStub>();
  parent: ElementStub | null = null;
  focus = vi.fn();
  rect = { left: 0, top: 0, right: 1440, bottom: 900, width: 1440, height: 900 };
  getBoundingClientRect() { return this.rect; }
  querySelector(selector: string) { return this.children.get(selector) ?? null; }
  closest() { return this.parent; }
  setAttribute(name: string, value: string) { this.attributes.set(name, value); }
  getAttribute(name: string) { return this.attributes.get(name) ?? null; }
  removeAttribute(name: string) { this.attributes.delete(name); }
  hasAttribute(name: string) { return this.attributes.has(name); }
  contains(node: unknown): boolean { return node === this || [...this.children.values()].some(child => child.contains(node)); }
}

let observedAt: number;
let inputListeners: Map<string, Set<EventListener>>;
let stage: ElementStub;
let track: ElementStub;
let home: ElementStub;
let documentSkip: ElementStub;
let frameCallbacks: Map<number, FrameRequestCallback>;
let events: string[];
let cleanup: (() => void) | undefined;
let frameIndex: number;
let mutationCallbacks: MutationCallback[];
let resizeCallbacks: ResizeObserverCallback[];

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  controls.update = undefined;
  controls.start = 0; controls.end = 2700; controls.progress = 0;
  controls.scroll.mockReset();
  controls.scroll.mockImplementation((target: unknown) => {
    if (typeof target === "number") controls.update?.({ progress: (target - controls.start) / (controls.end - controls.start) });
  });
  observedAt = 0;
  inputListeners = new Map();
  vi.spyOn(performance, "now").mockImplementation(() => observedAt);
  frameCallbacks = new Map();
  frameIndex = 0;
  events = [];
  mutationCallbacks = [];
  resizeCallbacks = [];
  track = new ElementStub();
  track.hidden = true;
  stage = new ElementStub();
  stage.parent = track;
  for (const key of ["grass", "ball", "dog", "person", "leash", "leash-path", "still", "skip", "debug"]) {
    stage.children.set(`[data-io="${key}"]`, new ElementStub());
  }
  home = new ElementStub();
  documentSkip = new ElementStub();
  const person = new ElementStub();
  person.rect = { left: 50, top: 350, right: 330, bottom: 600, width: 280, height: 250 };
  const dog = new ElementStub();
  dog.rect = { left: 200, top: 575, right: 300, bottom: 650, width: 100, height: 75 };
  home.children.set("[data-home-person]", person);
  home.children.set("[data-home-dog]", dog);
  home.children.set("[data-orbit-person]", person);
  home.children.set("[data-dog-visual]", dog);
  home.children.set("#main", new ElementStub());
  const media = Object.assign(new EventTarget(), { matches: false });
  const win = Object.assign(new EventTarget(), {
    innerWidth: 1440, innerHeight: 900,
    matchMedia: (query: string) => query.includes("min-width")
      ? Object.assign(new EventTarget(), { matches: win.innerWidth >= 768 }) : media,
    setTimeout, clearTimeout,
  });
  const addListener = win.addEventListener.bind(win);
  win.addEventListener = (type, listener, options) => {
    if (["wheel", "keydown", "touchstart", "pointerdown"].includes(type) && typeof listener === "function") {
      if (!inputListeners.has(type)) inputListeners.set(type, new Set());
      inputListeners.get(type)!.add(listener);
      if (typeof options === "object") options.signal?.addEventListener("abort", () => inputListeners.get(type)?.delete(listener), { once: true });
    }
    addListener(type, listener, options);
  };
  for (const name of ["baozi:intro-orbit-handoff", "baozi:intro-person-stood", "baozi:intro-orbit-reset"]) {
    win.addEventListener(name, () => events.push(name));
  }
  vi.stubGlobal("window", win);
  vi.stubGlobal("document", {
    activeElement: null,
    getElementById: (id: string) => id === "home" ? home : id === "main" ? home.children.get("#main") : null,
    querySelector: (selector: string) => selector === '.skip-link[href="#main"]' ? documentSkip : null,
  });
  vi.stubGlobal("location", { hash: "", search: "", pathname: "/" });
  vi.stubGlobal("history", { state: null, replaceState: vi.fn() });
  vi.stubGlobal("sessionStorage", { getItem: () => null, setItem: vi.fn() });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => manifest }));
  vi.stubGlobal("getComputedStyle", () => ({ display: "block", visibility: "visible", opacity: "1" }));
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    const id = ++frameIndex;
    frameCallbacks.set(id, callback);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frameCallbacks.delete(id));
  vi.stubGlobal("Image", class {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(_value: string) { Promise.resolve().then(() => this.onload?.()); }
  });
  vi.stubGlobal("MutationObserver", class {
    constructor(callback: MutationCallback) { mutationCallbacks.push(callback); }
    observe() {}
    disconnect() {}
  });
  vi.stubGlobal("ResizeObserver", class {
    constructor(callback: ResizeObserverCallback) { resizeCallbacks.push(callback); }
    observe() {}
    disconnect() {}
  });
});

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function ready() {
  cleanup = initIntroOilRuntime(stage as unknown as HTMLElement);
  for (let attempt = 0; attempt < 20; attempt++) await Promise.resolve();
  expect(stage.dataset.introState).toBe("ready");
}

function frame() {
  const callbacks = [...frameCallbacks.values()];
  frameCallbacks.clear();
  callbacks.forEach(callback => callback(frameIndex * 16.667));
}

function input(type: string, fields: Record<string, unknown> = {}) {
  const event = { type, isTrusted: true, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false,
    deltaX: 0, deltaY: 40, timeStamp: 1, preventDefault: vi.fn(), stopPropagation: vi.fn(), ...fields };
  for (const listener of [...(inputListeners.get(type) ?? [])]) listener(event as unknown as Event);
  return event;
}

function wheel(at: number, fields: Record<string, unknown> = {}) {
  observedAt = at;
  return input("wheel", fields);
}

async function gate(progress = 0.999) {
  await ready();
  events.length = 0;
  wheel(0);
  controls.update!({ progress });
  frame();
}

const paper = () => Number(stage.styles.get("--intro-paper-opacity"));
const actor = (name: string) => stage.children.get(`[data-io="${name}"]`)!;

describe("desktop next independent wheel after the complete ending pose", () => {
  it.each([0.972, 0.99, 1])("pins wheel progress %s to the complete pair without revealing or notifying Home", async progress => {
    await gate(progress);
    expect(controls.scroll).toHaveBeenCalledTimes(1);
    expect(controls.scroll).toHaveBeenCalledWith(2625, { immediate: true });
    expect(actor("person").style.backgroundPosition).toBe("-840px -280px");
    expect(actor("dog").style.backgroundPosition).toBe("-300px -75px");
    expect([paper(), home.inert, track.hidden]).toEqual([1, true, false]);
    expect(events).toEqual([]);
    frame();
    vi.advanceTimersByTime(60000);
    frame();
    expect([paper(), home.inert, track.hidden]).toEqual([1, true, false]);
    expect(events).toEqual([]);
  });

  it("keeps the accepted three-beat frames and travel before .972", async () => {
    await ready();
    const expected = [[0.91, "0px -280px", "0px 0px"], [0.935, "-280px -280px", "0px 0px"],
      [0.95, "-560px -280px", "-200px 0px"], [0.956, "-840px -280px", "-300px 0px"],
      [0.963, "-840px -280px", "-200px -75px"]] as const;
    for (const [progress, person, dog] of expected) {
      wheel(observedAt + 100);
      controls.update!({ progress }); frame();
      expect(actor("person").style.backgroundPosition).toBe(person);
      expect(actor("dog").style.backgroundPosition).toBe(dog);
    }
    expect(controls.scroll).not.toHaveBeenCalled();
  });

  it("cannot accept a new wheel until the complete frame and a following RAF have run", async () => {
    await ready(); wheel(0); controls.update!({ progress: 1 });
    expect(wheel(301).preventDefault).toHaveBeenCalled();
    expect(track.hidden).toBe(false);
    frame();
    expect(wheel(602).preventDefault).toHaveBeenCalled();
    expect(track.hidden).toBe(false);
    frame();
    wheel(902);
    expect(track.hidden).toBe(true);
  });

  it("uses the gap from the latest observed wheel rather than event timestamps or time since posing", async () => {
    await gate(); frame();
    for (const at of [100, 200, 400, 699]) {
      const event = wheel(at);
      expect(event.preventDefault).toHaveBeenCalledOnce();
      expect(event.stopPropagation).toHaveBeenCalledOnce();
      expect(track.hidden).toBe(false);
    }
    wheel(999);
    expect(track.hidden).toBe(true);
  });

  it("restores the physical pin after a noncancelable wheel without repinning aligned updates", async () => {
    await gate(); frame();
    controls.update!({ progress: 2625 / 2700 }); frame();
    expect(controls.scroll).toHaveBeenCalledTimes(1);
    wheel(100, { cancelable: false });
    controls.update!({ progress: 0.98 }); frame();
    expect(controls.scroll).toHaveBeenCalledTimes(2);
    expect(controls.scroll).toHaveBeenLastCalledWith(2625, { immediate: true });
    expect([paper(), track.hidden, home.inert]).toEqual([1, false, true]);
    controls.update!({ progress: 2625 / 2700 }); frame();
    expect(controls.scroll).toHaveBeenCalledTimes(2);
  });

  it("waits through an independent noncancelable wheel and accepts only a later cancelable gesture", async () => {
    await gate(); frame();
    const event = wheel(300, { cancelable: false });
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(event.stopPropagation).toHaveBeenCalledOnce();
    expect(track.hidden).toBe(false);
    expect(events).toEqual([]);
    controls.update!({ progress: 0.98 }); frame(); frame();
    expect(controls.scroll).toHaveBeenCalledTimes(2);
    expect([paper(), home.inert]).toEqual([1, true]);
    wheel(599, { cancelable: true });
    expect(track.hidden).toBe(false);
    wheel(899, { cancelable: true });
    expect(track.hidden).toBe(true);
  });

  it("keeps wheel ownership through a zero-delta event and measures the gap from that observation", async () => {
    await gate(); frame();
    wheel(100, { deltaY: 0, deltaX: 0 });
    controls.update!({ progress: 2625 / 2700 }); frame();
    wheel(399);
    expect([paper(), track.hidden, home.inert]).toEqual([1, false, true]);
    wheel(699);
    expect(track.hidden).toBe(true);
  });

  it("enters Home immediately on the independent down wheel with the original 300ms controls deadline", async () => {
    await gate(); frame();
    const event = wheel(300);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(event.stopPropagation).toHaveBeenCalledOnce();
    expect(track.hidden).toBe(true);
    expect(stage.dataset.introState).toBe("completed");
    expect(home.inert).toBe(false);
    expect(Number(home.dataset.introControlsReadyAt)).toBe(600);
    expect(events).toEqual(["baozi:intro-orbit-handoff", "baozi:intro-person-stood"]);
    expect(wheel(310).preventDefault).not.toHaveBeenCalled();
  });

  it("lets the same upward wheel leave the gate and replay the original ending", async () => {
    await gate(); frame();
    const event = wheel(100, { deltaY: -40 });
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(event.stopPropagation).not.toHaveBeenCalled();
    controls.update!({ progress: 0.95 }); frame();
    expect(actor("person").style.backgroundPosition).toBe("-560px -280px");
    expect(actor("dog").style.backgroundPosition).toBe("-200px 0px");
    wheel(500); controls.update!({ progress: 0.99 }); frame(); frame();
    expect([paper(), track.hidden]).toEqual([1, false]);
  });

  it.each(["ArrowDown", "PageDown", "End", " "])("releases wheel ownership to the original %s keyboard path", async key => {
    await gate(); frame();
    expect(input("keydown", { key }).preventDefault).not.toHaveBeenCalled();
    controls.update!({ progress: 0.99 }); frame();
    expect(paper()).toBeCloseTo(0.5, 8);
    controls.update!({ progress: 1 }); frame(); frame();
    expect(track.hidden).toBe(true);
  });

  it.each(["touchstart", "pointerdown"])("releases wheel ownership for %s", async type => {
    await gate(); frame();
    expect(input(type).preventDefault).not.toHaveBeenCalled();
    controls.update!({ progress: 0.99 }); frame();
    expect(paper()).toBeCloseTo(0.5, 8);
  });

  it.each([{ ctrlKey: true }, { metaKey: true }, { altKey: true }, { shiftKey: true }, { deltaX: 50, deltaY: 40 }])("does not trap a modified or horizontal wheel %s", async fields => {
    await gate(); frame();
    expect(wheel(500, fields).preventDefault).not.toHaveBeenCalled();
    controls.update!({ progress: 0.99 }); frame();
    expect(paper()).toBeCloseTo(0.5, 8);
  });

  it("ignores untrusted wheels without granting, consuming or releasing wheel ownership", async () => {
    await ready(); wheel(0, { isTrusted: false });
    controls.update!({ progress: 0.99 }); frame();
    expect(paper()).toBeCloseTo(0.5, 8);
    controls.update!({ progress: 0.9 }); frame();
    wheel(100); controls.update!({ progress: 0.99 }); frame(); frame();
    expect(wheel(500, { isTrusted: false }).preventDefault).not.toHaveBeenCalled();
    expect([paper(), track.hidden]).toEqual([1, false]);
    wheel(600);
    expect(track.hidden).toBe(true);
  });

  it("does not retain an earlier wheel owner after another input starts scrolling", async () => {
    await ready(); wheel(0); input("keydown", { key: "End" });
    controls.update!({ progress: 0.99 }); frame();
    expect(paper()).toBeCloseTo(0.5, 8);
    expect(controls.scroll).not.toHaveBeenCalled();
  });

  it.each([390, 767])("preserves the mobile scrub path at width %s", async width => {
    window.innerWidth = width;
    await ready(); wheel(0); controls.update!({ progress: 0.99 }); frame();
    expect(paper()).toBeCloseTo(0.5, 8);
    expect(controls.scroll).not.toHaveBeenCalled();
    controls.update!({ progress: 1 }); frame(); frame();
    expect(track.hidden).toBe(true);
  });

  it("preserves the lab scrub path", async () => {
    const plate = new ElementStub(); stage.children.set('[data-io="plate"]', plate);
    await ready(); wheel(0); controls.update!({ progress: 0.99 }); frame();
    expect(plate.style.opacity).toBe("0.500");
    expect(controls.scroll).not.toHaveBeenCalled();
  });

  it("re-pins resized desktop geometry and waits for its full frame and subsequent RAF", async () => {
    await gate(); frame();
    const destination = home.children.get("[data-home-person]")!;
    destination.rect = { left: 50, top: 350, right: 230, bottom: 540, width: 180, height: 190 };
    controls.start = 100; controls.end = 2500;
    window.innerWidth = 1024; window.dispatchEvent(new Event("resize"));
    expect(controls.scroll).toHaveBeenLastCalledWith(2433, { immediate: true });
    wheel(400); expect(track.hidden).toBe(false);
    frame(); expect(actor("person").style.width).toBe("180px");
    wheel(800); expect(track.hidden).toBe(false);
    frame(); wheel(1100); expect(track.hidden).toBe(true);
  });

  it.each(["resize", "mutation"])("re-arms only after geometry from the Home %s observer is rendered", async observer => {
    await gate(); frame();
    const destination = home.children.get("[data-home-person]")!;
    destination.rect = { left: 50, top: 350, right: 230, bottom: 540, width: 180, height: 190 };
    if (observer === "resize") resizeCallbacks.forEach(callback => callback([], {} as ResizeObserver));
    else mutationCallbacks.forEach(callback => callback([], {} as MutationObserver));
    wheel(400); expect(track.hidden).toBe(false);
    frame(); expect(actor("person").style.width).toBe("180px");
    frame(); wheel(700); expect(track.hidden).toBe(true);
  });

  it("releases the gate across 767 and restores normal scrub without a wheel owner", async () => {
    await gate(); frame();
    window.innerWidth = 767; window.dispatchEvent(new Event("resize"));
    controls.update!({ progress: 0.99 }); frame();
    expect(paper()).toBeCloseTo(0.5, 8);
    window.innerWidth = 768; window.dispatchEvent(new Event("resize")); frame();
    expect(paper()).toBeCloseTo(0.5, 8);
  });

  it("cancels an old completion on resize and reads refreshed raw progress without onUpdate", async () => {
    await ready(); controls.update!({ progress: 1 }); frame();
    controls.progress = 0.99;
    window.dispatchEvent(new Event("resize")); frame(); frame();
    expect(track.hidden).toBe(false);
    expect(paper()).toBeCloseTo(0.5, 8);
  });

  it("redraws the resized final frame before completing the original non-wheel path", async () => {
    await ready(); controls.update!({ progress: 1 }); frame();
    const destination = home.children.get("[data-home-person]")!;
    destination.rect = { left: 50, top: 350, right: 230, bottom: 540, width: 180, height: 190 };
    window.dispatchEvent(new Event("resize")); frame();
    expect(track.hidden).toBe(false);
    expect(actor("person").style.width).toBe("180px");
    frame(); expect(track.hidden).toBe(true);
  });

  it.each(["skip", "failure", "hash", "dispose"])("cleans listeners and pending arming on %s", async reason => {
    await gate();
    if (reason === "skip") actor("skip").dispatchEvent(new Event("click", { cancelable: true }));
    else if (reason === "failure") window.dispatchEvent(new CustomEvent("baozi:home-assets-failed", { detail: { home } }));
    else if (reason === "hash") { location.hash = "#main"; window.dispatchEvent(new Event("hashchange")); }
    else cleanup?.();
    const previousEvents = [...events];
    expect(frameCallbacks.size).toBe(0);
    expect(wheel(500).preventDefault).not.toHaveBeenCalled();
    frame(); expect(events).toEqual(previousEvents);
    expect(home.inert).toBe(false);
  });
});
