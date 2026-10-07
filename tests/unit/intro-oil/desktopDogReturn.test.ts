import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { initIntroOilRuntime } from "@/components/intro-oil/runtime";
import type { V2Manifest } from "@/lib/intro-oil/v2";

const originalManifest: V2Manifest = JSON.parse(readFileSync(new URL("../../../public/manifest/asset-manifest.v2.json", import.meta.url), "utf8"));
const controls = vi.hoisted(() => ({ update: undefined as undefined | ((state: { progress: number }) => void) }));
vi.mock("gsap", () => ({ default: { registerPlugin: vi.fn() } }));
vi.mock("gsap/ScrollTrigger", () => ({ ScrollTrigger: {
  create: (options: { onUpdate: (state: { progress: number }) => void }) => {
    controls.update = options.onUpdate;
    return { kill() {} };
  },
  refresh() {},
} }));
vi.mock("@/lib/scroll/lenis", () => ({ scrollDocumentTo: vi.fn() }));

class ElementStub extends EventTarget {
  hidden = false;
  inert = false;
  complete = true;
  naturalWidth = 2560;
  naturalHeight = 640;
  dataset: Record<string, string> = {};
  style: Record<string, unknown> = {
    setProperty: (name: string, value: string) => { this.style[name] = value; },
    removeProperty: (name: string) => { delete this.style[name]; },
  };
  classes = new Set<string>();
  classList = {
    toggle: (name: string, enabled: boolean) => enabled ? this.classes.add(name) : this.classes.delete(name),
    add: (name: string) => this.classes.add(name),
    remove: (name: string) => this.classes.delete(name),
  };
  children = new Map<string, ElementStub>();
  parent: ElementStub | null = null;
  rect = { left: 0, top: 0, right: 1440, bottom: 900, width: 1440, height: 900 };
  getBoundingClientRect() { return this.rect; }
  querySelector(selector: string) { return this.children.get(selector) ?? null; }
  closest() { return this.parent; }
  setAttribute() {}
}

let manifest: V2Manifest;
let stage: ElementStub;
let dog: ElementStub;
let home: ElementStub;
let frames: Map<number, FrameRequestCallback>;
let nextFrame: number;
let cleanup: (() => void) | undefined;

beforeEach(() => {
  vi.useFakeTimers();
  controls.update = undefined;
  manifest = structuredClone(originalManifest);
  frames = new Map();
  nextFrame = 0;
  stage = new ElementStub();
  stage.parent = new ElementStub();
  for (const key of ["grass", "ball", "dog", "person", "leash", "leash-path", "still", "skip"]) {
    stage.children.set(`[data-io="${key}"]`, new ElementStub());
  }
  dog = stage.children.get('[data-io="dog"]')!;
  home = new ElementStub();
  const homePerson = new ElementStub();
  homePerson.rect = { left: 50, top: 350, right: 330, bottom: 600, width: 280, height: 250 };
  const homeDog = new ElementStub();
  homeDog.rect = { left: 200, top: 575, right: 300, bottom: 650, width: 100, height: 75 };
  home.children.set("[data-home-person]", homePerson);
  home.children.set("[data-home-dog]", homeDog);
  const win = Object.assign(new EventTarget(), {
    innerWidth: 1440, innerHeight: 900,
    matchMedia: (query: string) => Object.assign(new EventTarget(), {
      matches: query.includes("min-width") && win.innerWidth >= 768,
    }),
    setTimeout, clearTimeout,
  });
  vi.stubGlobal("window", win);
  vi.stubGlobal("document", {
    getElementById: (id: string) => id === "home" ? home : null,
    querySelector: () => null,
  });
  vi.stubGlobal("location", { hash: "", search: "", pathname: "/" });
  vi.stubGlobal("history", { state: null, replaceState: vi.fn() });
  vi.stubGlobal("sessionStorage", { getItem: () => null, setItem: vi.fn() });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => manifest }));
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    const id = ++nextFrame;
    frames.set(id, callback);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  vi.stubGlobal("Image", class {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(_src: string) { Promise.resolve().then(() => this.onload?.()); }
  });
  vi.stubGlobal("MutationObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
});

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function ready() {
  cleanup = initIntroOilRuntime(stage as unknown as HTMLElement);
  for (let i = 0; i < 20; i++) await Promise.resolve();
  expect(stage.dataset.introState).toBe("ready");
}

function render(progress: number) {
  controls.update!({ progress });
  const pending = [...frames.values()];
  frames.clear();
  pending.forEach(callback => callback(nextFrame * 16.667));
}

function pose(actor = dog) {
  const width = parseFloat(String(actor.style.width));
  const height = parseFloat(String(actor.style.height));
  const transform = String(actor.style.transform);
  const translation = /translate3d\(([-\d.e]+)px, ([-\d.e]+)px, 0\)/.exec(transform)!;
  const scaleX = /scaleX\(([-\d.e]+)\)/.exec(transform);
  const origin = String(actor.style.transformOrigin || "50% 50%").split(" ").map(parseFloat);
  const [backgroundX, backgroundY] = String(actor.style.backgroundPosition).split(" ").map(parseFloat);
  return {
    width, height, x: Number(translation[1]), y: Number(translation[2]),
    scaleX: scaleX ? Number(scaleX[1]) : 1,
    opacity: parseFloat(String(actor.style.opacity || "1")),
    originX: origin[0] / 100, originY: origin[1] / 100,
    frame: 0 + Math.round(-backgroundX / width) + 4 * Math.round(-backgroundY / height),
    image: String(actor.style.backgroundImage),
    visible: actor.classes.has("is-live"),
  };
}

const person = () => stage.children.get('[data-io="person"]')!;
const groundX = (p: ReturnType<typeof pose>, anchor = 0.5) => p.x + anchor * p.width;
const groundY = (p: ReturnType<typeof pose>, anchor = 0.92) => p.y + anchor * p.height;

describe("desktop production shares three ending beats", () => {
  it.each([
    [0.91, 4, 0, false], [0.931999, 4, 0, false],
    [0.932, 5, 0, true], [0.943999, 5, 0, true],
    [0.944, 6, 1, true], [0.949999, 6, 1, true],
    [0.95, 6, 2, true], [0.955999, 6, 2, true],
    [0.956, 7, 3, true], [0.962999, 7, 3, true],
    [0.963, 7, 6, true], [0.971999, 7, 6, true],
    [0.972, 7, 7, true], [0.979999, 7, 7, true], [1, 7, 7, true],
  ] as const)("coordinates both original poses at progress %s", async (progress, personFrame, dogFrame, visible) => {
    await ready();
    render(progress);
    expect(pose(person()).frame).toBe(personFrame);
    expect(pose(person()).image).toBe(`url(${manifest.sequences["person-slide-in-rise-stand"].src})`);
    expect(pose().image).toBe(`url(${manifest.sequences["dog-look-up-settle"].src})`);
    expect(pose().frame).toBe(dogFrame);
    expect(pose().visible).toBe(visible);
  });

  it("uses each active frame's ground anchor without reflecting or resizing either actor", async () => {
    for (const frame of manifest.sequences["dog-look-up-settle"].frames.slice(0, 3)) frame.anchors.ground = [0.37, 0.83];
    manifest.sequences["person-slide-in-rise-stand"].frames[5].anchors.ground = [0.41, 0.87];
    await ready();
    render(0.938);
    const d = pose();
    const p = pose(person());
    expect(d.scaleX).toBe(1);
    expect(p.scaleX).toBe(1);
    expect([d.width, d.height, p.width]).toEqual([100, 75, 280]);
    expect(groundX(d, 0.37)).toBeGreaterThan(240);
    expect(groundX(d, 0.37)).toBeLessThan(250);
    expect(groundY(d, 0.83)).toBeCloseTo(650, 8);
    expect(groundX(p, 0.41)).toBeCloseTo(190, 8);
    expect(groundY(p, 0.87)).toBeCloseTo(600, 8);
  });

  it("takes a short rightward step and decelerates to the actual Home anchor", async () => {
    await ready();
    const samples = [0.932, 0.933, 0.934, 0.954, 0.955, 0.956].map(progress => { render(progress); return pose(); });
    expect(groundX(samples[0])).toBeCloseTo(240, 8);
    expect(groundX(samples.at(-1)!)).toBeCloseTo(250, 8);
    expect(groundX(samples.at(-1)!) - groundX(samples[0])).toBeCloseTo(samples[0].width * 0.1, 8);
    for (let i = 1; i < samples.length; i++) expect(groundX(samples[i])).toBeGreaterThan(groundX(samples[i - 1]));
    expect(samples[4].x - samples[3].x).toBeLessThan(samples[2].x - samples[1].x);
    expect(samples.every(p => p.scaleX === 1 && p.image.includes("dog-look-up-settle"))).toBe(true);
  });

  it("never slides while looking up or sitting and holds both terminal poses before paper reveal", async () => {
    await ready();
    const samples = [0.956, 0.962, 0.963, 0.971, 0.972, 0.976, 0.98, 0.995, 1].map(progress => {
      render(progress);
      const d = pose();
      expect(groundX(d)).toBeCloseTo(250, 8);
      expect(groundY(d)).toBeCloseTo(650, 8);
      expect([d.width, d.height, d.opacity, pose(person()).frame]).toEqual([100, 75, 1, 7]);
      return d.frame;
    });
    expect(samples).toEqual([3, 3, 6, 6, 7, 7, 7, 7, 7]);
  });

  it("keeps the original paper reveal and handoff threshold after the shared hold", async () => {
    const handoff = vi.fn();
    window.addEventListener("baozi:intro-orbit-handoff", handoff);
    await ready();
    for (const progress of [0.972, 0.976, 0.98]) {
      render(progress);
      expect([pose(person()).frame, pose().frame]).toEqual([7, 7]);
      expect(Number(stage.style["--intro-paper-opacity"])).toBe(1);
    }
    render(0.99);
    expect(Number(stage.style["--intro-paper-opacity"])).toBeCloseTo(0.5, 8);
    expect(handoff).not.toHaveBeenCalled();
    render(0.995);
    expect(handoff).toHaveBeenCalledTimes(1);
    expect(home.inert).toBe(true);
    expect(stage.parent!.hidden).toBe(false);
  });

  it("reveals only the beginning of the short approach and restores both actors on reverse", async () => {
    await ready();
    for (const progress of [0.91, 0.92, 0.931999]) {
      render(progress);
      expect(pose().opacity).toBe(0);
      expect(pose().visible).toBe(false);
    }
    render(0.932);
    expect(pose().opacity).toBe(0);
    render(0.935);
    expect(pose().opacity).toBeCloseTo(0.5, 8);
    const before = [pose(), pose(person())];
    render(0.938);
    expect(pose().opacity).toBe(1);
    render(0.979);
    render(0.935);
    expect([pose(), pose(person())]).toEqual(before);
    render(0.5);
    expect([pose().opacity, pose().scaleX, pose().width]).toEqual([1, 1, 207]);
  });

  it("clears the desktop phase across 767 and restores it at 768", async () => {
    await ready();
    render(0.935);
    const before = [pose(), pose(person())];
    expect(pose().opacity).toBeCloseTo(0.5, 8);
    window.innerWidth = 767;
    window.dispatchEvent(new Event("resize"));
    render(0.935);
    expect(pose().visible).toBe(false);
    expect([pose().opacity, pose().width]).toEqual([1, 207]);
    expect(pose(person()).frame).toBe(5);
    window.innerWidth = 768;
    window.dispatchEvent(new Event("resize"));
    render(0.935);
    for (const [i, current] of [pose(), pose(person())].entries()) {
      expect(current.x).toBeCloseTo(before[i].x, 8);
      expect(current.y).toBeCloseTo(before[i].y, 8);
      expect({ ...current, x: 0, y: 0 }).toEqual({ ...before[i], x: 0, y: 0 });
    }
  });

  it("remeasures the actual Home size and anchor while retaining the same phase", async () => {
    await ready();
    render(0.944);
    const target = home.children.get("[data-home-dog]")!;
    target.rect = { left: 300, top: 700, right: 450, bottom: 812.5, width: 150, height: 112.5 };
    window.dispatchEvent(new Event("resize"));
    render(0.944);
    expect([pose().width, pose().height, pose().frame]).toEqual([150, 112.5, 1]);
    expect(groundY(pose())).toBeCloseTo(812.5, 8);
    expect(groundX(pose())).toBeGreaterThan(360);
    expect(groundX(pose())).toBeLessThan(375);
    render(0.956);
    expect(groundX(pose())).toBeCloseTo(375, 8);
  });

  it("keeps pre-tail production poses before and after reversing out of the ending", async () => {
    await ready();
    const samples = [0.08, 0.5, 0.75, 0.82, 0.85, 0.88, 0.9, 0.909999];
    const before = samples.map(progress => { render(progress); return [pose(), pose(person())]; });
    render(0.976);
    for (const [index, progress] of samples.entries()) {
      render(progress);
      expect([pose(), pose(person())]).toEqual(before[index]);
    }
    expect(before.slice(-4).map(pair => pair[1].frame)).toEqual([1, 2, 3, 3]);
    expect(before.slice(-4).every(pair => !pair[0].visible)).toBe(true);
  });

  it.each([390, 767])("preserves both original mobile frame schedules at width %s", async width => {
    window.innerWidth = width;
    await ready();
    const samples = [0.935, 0.944, 0.956, 0.963, 0.972, 0.98, 0.999].map(progress => {
      render(progress);
      expect([pose().opacity, pose().scaleX]).toEqual([1, 1]);
      return [pose(person()).frame, pose().frame];
    });
    expect(samples).toEqual([[5, 4], [5, 0], [6, 2], [6, 3], [6, 4], [7, 5], [7, 7]]);
  });

  it("preserves both lab schedules and viewport-relative dimensions", async () => {
    stage.children.set('[data-io="plate"]', new ElementStub());
    await ready();
    const samples = [0.935, 0.944, 0.956, 0.963, 0.972, 0.98].map(progress => {
      render(progress);
      expect([pose().opacity, pose().scaleX, pose().width]).toEqual([1, 1, 207]);
      return [pose(person()).frame, pose().frame];
    });
    expect(samples).toEqual([[5, 4], [5, 0], [6, 2], [6, 3], [6, 4], [7, 5]]);
  });
});
