import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { initIntroOilRuntime } from "@/components/intro-oil/runtime";

const manifest: unknown = JSON.parse(readFileSync(new URL("../../../public/manifest/asset-manifest.v2.json", import.meta.url), "utf8"));

const controls = vi.hoisted(() => ({
  update: undefined as undefined | ((state: { progress: number }) => void),
  kill: vi.fn(),
  scroll: vi.fn(),
}));
vi.mock("gsap", () => ({ default: { registerPlugin: vi.fn() } }));
vi.mock("gsap/ScrollTrigger", () => ({ ScrollTrigger: {
  create: (options: { onUpdate: (state: { progress: number }) => void }) => {
    controls.update = options.onUpdate;
    return { kill: controls.kill };
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
      ? Object.assign(new EventTarget(), { matches: true }) : media,
    setTimeout, clearTimeout,
  });
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

describe("production intro handoff", () => {
  it("preserves the rendered .995 handoff before final track removal", async () => {
    await ready();
    events.length = 0;
    controls.update!({ progress: 0.996 });
    expect(events).toEqual([]);
    frame();
    expect(events).toEqual(["baozi:intro-orbit-handoff", "baozi:intro-person-stood"]);
    expect(track.hidden).toBe(false);
    controls.update!({ progress: 0.97 });
    frame();
    expect(events.at(-1)).toBe("baozi:intro-orbit-reset");
  });

  it("renders the final character frame before removing the intro track", async () => {
    await ready();
    events.length = 0;
    controls.update!({ progress: 1 });
    expect(track.hidden).toBe(false);
    expect(events).toEqual([]);
    frame();
    const person = stage.children.get('[data-io="person"]')!;
    expect(person.style.backgroundPosition).toBe("-840px -280px");
    expect(track.hidden).toBe(false);
    frame();
    expect(track.hidden).toBe(true);
    expect(stage.dataset.introState).toBe("completed");
  });

  it("does not complete when scrolling reverses before the final frame", async () => {
    await ready();
    events.length = 0;
    controls.update!({ progress: 1 });
    controls.update!({ progress: 0.9 });
    frame();
    frame();
    expect(track.hidden).toBe(false);
    expect(stage.dataset.introState).toBe("ready");
    expect(events).toEqual([]);
  });

  it("keeps home out of keyboard navigation while the intro owns the screen", async () => {
    await ready();
    expect(home.inert).toBe(true);
    cleanup?.();
    expect(home.inert).toBe(false);
  });

  it("the document skip link exits to #main and moves keyboard focus", async () => {
    await ready();
    location.hash = "#main";
    window.dispatchEvent(new Event("hashchange"));
    expect(track.hidden).toBe(true);
    expect(home.inert).toBe(false);
    expect(location.hash).toBe("#main");
    expect(controls.scroll).toHaveBeenLastCalledWith(home.children.get("#main"), { immediate: true });
    expect(home.children.get("#main")!.focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it("handles the skip-link click before Astro can route without a hashchange", async () => {
    await ready();
    const click = Object.assign(new Event("click", { cancelable: true }), { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false });
    documentSkip.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
    expect(track.hidden).toBe(true);
    expect(history.replaceState).toHaveBeenLastCalledWith(null, "", "/#main");
    expect(home.children.get("#main")!.focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it("does not consume modified document skip clicks", async () => {
    await ready();
    const click = Object.assign(new Event("click", { cancelable: true }), { button: 0, metaKey: false, ctrlKey: true, shiftKey: false, altKey: false });
    documentSkip.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(false);
    expect(track.hidden).toBe(false);
  });

  it("targets the active orbit actors rather than the hidden still, with separate contact heights", async () => {
    const orbit = new ElementStub();
    orbit.dataset.orbitActive = "true";
    orbit.children.set("[data-orbit-person]", home.children.get("[data-orbit-person]")!);
    orbit.children.set("[data-dog-visual]", home.children.get("[data-dog-visual]")!);
    home.children.set("[data-home-orbit-root]", orbit);
    for (const name of ["[data-home-person]", "[data-home-dog]"]) {
      const still = new ElementStub();
      still.rect = { left: 900, top: 300, right: 1200, bottom: 600, width: 300, height: 300 };
      home.children.set(name, still);
    }
    await ready();
    controls.update!({ progress: 1 });
    frame();
    const person = stage.children.get('[data-io="person"]')!;
    const dog = stage.children.get('[data-io="dog"]')!;
    expect(person.style.width).toBe("280px");
    expect(dog.style.width).toBe("100px");
    const position = (actor: ElementStub) => String(actor.style.transform).match(/translate3d\(([-.\d]+)px, ([-.\d]+)px, 0\)/)!.slice(1).map(Number);
    expect(position(person)[0]).toBeCloseTo(50);
    expect(position(person)[1] + 280 * 0.92).toBeCloseTo(600);
    expect(position(dog)[0]).toBeCloseTo(200);
    expect(position(dog)[1] + 75 * 0.92).toBeCloseTo(650);
  });

  it("reveals the real home only in the original .98–1 crossfade and cleans its presentation state", async () => {
    await ready();
    expect(home.dataset.introHomeActive).toBe("true");
    controls.update!({ progress: 0.99 });
    frame();
    expect(Number(stage.styles.get("--intro-paper-opacity"))).toBeCloseTo(0.5);
    controls.update!({ progress: 0.97 });
    frame();
    expect(Number(stage.style.opacity)).toBe(1);
    expect(Number(stage.styles.get("--intro-paper-opacity"))).toBe(1);
    cleanup?.();
    expect(home.dataset.introHomeActive).toBeUndefined();
    expect(home.inert).toBe(false);
  });

  it("resizing during grass exit does not shift the ground when the user reverses", async () => {
    const grass = stage.children.get('[data-io="grass"]')!;
    grass.rect = { left: 0, top: 400, right: 2000, bottom: 900, width: 2000, height: 500 };
    await ready();
    controls.update!({ progress: 0.35 });
    frame();
    const person = stage.children.get('[data-io="person"]')!;
    const before = person.style.transform;
    controls.update!({ progress: 0.8 });
    frame();
    grass.rect.top += 150;
    grass.rect.bottom += 150;
    window.dispatchEvent(new Event("resize"));
    controls.update!({ progress: 0.35 });
    frame();
    expect(person.style.transform).toBe(before);
  });

  it("updates a paused tail when the active home actor layer mounts late", async () => {
    const orbit = new ElementStub();
    orbit.dataset.orbitActive = "false";
    orbit.children.set("[data-orbit-person]", home.children.get("[data-orbit-person]")!);
    orbit.children.set("[data-dog-visual]", home.children.get("[data-dog-visual]")!);
    home.children.set("[data-home-orbit-root]", orbit);
    const still = new ElementStub();
    still.rect = { left: 700, top: 300, right: 1000, bottom: 600, width: 300, height: 300 };
    home.children.set("[data-home-person]", still);
    await ready();
    controls.update!({ progress: 0.96 });
    frame();
    const person = stage.children.get('[data-io="person"]')!;
    expect(person.style.width).toBe("300px");
    orbit.dataset.orbitActive = "true";
    mutationCallbacks.forEach(callback => callback([], {} as MutationObserver));
    frame();
    expect(person.style.width).toBe("280px");
    expect(String(person.style.transform)).toContain("translate3d(50px,");
  });

  it("refreshes the current sequence size after its home destination resizes", async () => {
    await ready();
    controls.update!({ progress: 0.96 });
    frame();
    const target = home.children.get("[data-home-person]")!;
    target.rect = { left: 50, top: 350, right: 230, bottom: 540, width: 180, height: 190 };
    resizeCallbacks.forEach(callback => callback([], {} as ResizeObserver));
    frame();
    const person = stage.children.get('[data-io="person"]')!;
    expect(person.style.width).toBe("180px");
    const y = Number(String(person.style.transform).match(/, ([-.\d]+)px, 0\)/)![1]);
    expect(y + 180 * 0.92).toBeCloseTo(540);
  });
});


describe("home resource failure releases intro ownership", () => {
  it("exits while the intro manifest is pending and ignores its late arrival", async () => {
    let release!: (value: unknown) => void;
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(resolve => { release = resolve; })));
    cleanup = initIntroOilRuntime(stage as unknown as HTMLElement);
    expect(stage.dataset.introState).toBe("loading");
    window.dispatchEvent(new CustomEvent("baozi:home-assets-failed", { detail: { home } }));
    expect(track.hidden).toBe(true);
    expect(home.inert).toBe(false);
    expect(home.dataset.introHomeActive).toBeUndefined();
    release({ ok: true, json: async () => manifest });
    for (let attempt = 0; attempt < 20; attempt++) await Promise.resolve();
    expect(stage.dataset.introState).toBe("home-assets-failed");
    expect(controls.update).toBeUndefined();
  });

  it("does not start over an already-latched Home failure", () => {
    const orbit = new ElementStub();
    orbit.dataset.homeAssetFailure = "true";
    home.children.set("[data-home-orbit-root]", orbit);
    cleanup = initIntroOilRuntime(stage as unknown as HTMLElement);
    expect(track.hidden).toBe(true);
    expect(home.inert).toBe(false);
    expect(home.dataset.introHomeActive).toBeUndefined();
  });

  it("exits after the .995 handoff without trapping Home or replaying after late frames", async () => {
    await ready();
    controls.update!({ progress: .997 });
    frame();
    window.dispatchEvent(new CustomEvent("baozi:home-assets-failed", { detail: { home } }));
    frame();
    expect(track.hidden).toBe(true);
    expect(home.inert).toBe(false);
    expect(stage.dataset.introState).toBe("home-assets-failed");
  });
});

it("fades only the page backdrop while exactly one opaque Intro pair owns the tail", async () => {
  await ready();
  controls.update!({ progress: .99 });
  frame();
  expect(stage.style.opacity).toBe("1");
  expect(stage.styles.get("--intro-paper-opacity")).toBe("0.5");
  expect(home.dataset.introPoseOwner).toBe("intro");
});
