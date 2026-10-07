import { gsap } from "gsap";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { holdIntroPose, releaseHeldIntroPose } from "@/lib/home-orbit/introPoseHandoff";
import type { V2Manifest } from "@/lib/intro-oil/v2";
import manifest from "../../../public/manifest/asset-manifest.v2.json";
import { watchHomeAssets } from "@/lib/home-orbit/assetFallback";
import { createHomeOrbit, type HomeOrbitController } from "@/lib/home-orbit/createHomeOrbit";

vi.mock("gsap", () => ({ gsap: { ticker: { add: vi.fn(), remove: vi.fn() } } }));

class ElementStub extends EventTarget {
  dataset: Record<string, string> = {};
  parentElement: ElementStub | null = null;
  nodes: ElementStub[] = [];
  className = "";
  style = { setProperty: vi.fn() };
  hidden = true;
  inert = false;
  tabIndex = 0;
  rail = true;
  captured = new Set<number>();
  focus = vi.fn();
  offsetWidth = 800;
  children = new Map<string, ElementStub>();
  attributes = new Map<string, string>();
  home: ElementStub | null = null;
  characters: ElementStub | null = null;
  src = "";
  rect = { left: 0, top: 0, width: 800, height: 740 };
  append(node: ElementStub) { node.remove(); this.nodes.push(node); node.parentElement = this; }
  remove() { if (this.parentElement) this.parentElement.nodes = this.parentElement.nodes.filter(node => node !== this); this.parentElement = null; }
  querySelector(selector: string) { return this.children.get(selector) ?? null; }
  closest(selector: string) { return selector === "#home" ? this.home : this.characters; }
  getBoundingClientRect() { return this.rect; }
  hasAttribute(name: string) { return name === "data-rail-orbit" ? this.rail : this.attributes.has(name); }
  setAttribute(name: string, value: string) { this.attributes.set(name, value); }
  getAttribute(name: string) { return name === "src" && this.src ? this.src : this.attributes.get(name) ?? null; }
  removeAttribute(name: string) { this.attributes.delete(name); }
  hasPointerCapture(id: number) { return this.captured.has(id); }
  setPointerCapture(id: number) { this.captured.add(id); }
  releasePointerCapture(id: number) { this.captured.delete(id); }
  contains(element: unknown) { return element === this || [...this.children.values()].includes(element as ElementStub); }
}

type PendingImage = { onload: (() => void) | null; onerror: (() => void) | null };
let images: Map<string, PendingImage>;
let root: ElementStub;
let home: ElementStub;
let characters: ElementStub;
let still: ElementStub;
let controller: HomeOrbitController | undefined;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] });
  vi.clearAllMocks();
  images = new Map();
  root = new ElementStub(); home = new ElementStub(); characters = new ElementStub(); still = new ElementStub();
  root.home = home; root.characters = characters;
  home.children.set("#main", new ElementStub());
  vi.stubGlobal("document", Object.assign(new EventTarget(), { activeElement: null, createElement: () => new ElementStub() }));
  home.children.set(".site-characters", characters);
  home.children.set("[data-home-orbit-root]", root);
  root.dataset.personOrbitSrc = "/person.webp";
  root.dataset.dogOrbitSrc = "/dog.webp";
  still.dataset.src = "/existing-fallback.webp";
  characters.children.set("[data-home-asset-fallback]", still);
  for (const key of ["orbit-person", "person-feet-anchor", "person-sprite", "person-sprite-crossfade", "dog-visual", "dog-sprite", "dog-sprite-crossfade", "orbit-fallback"]) root.children.set(`[data-${key}]`, new ElementStub());
  vi.stubGlobal("window", Object.assign(new EventTarget(), { matchMedia: () => ({ matches: false }), setTimeout, clearTimeout }));
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("MutationObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("Image", class {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(value: string) { images.set(value, this); }
  });
});

afterEach(() => { releaseHeldIntroPose(home as unknown as HTMLElement); controller?.destroy(); controller = undefined; vi.unstubAllGlobals(); vi.useRealTimers(); });
async function flush() { for (let n = 0; n < 8; n++) await Promise.resolve(); }
function mount() {
  controller = createHomeOrbit(root as unknown as HTMLElement);
  controller.handoff({ angle: .61, angularVelocity: 0 });
  controller.enable();
}

for (const failed of ["person", "dog"]) {
  it(`uses one complete existing still as soon as ${failed} fails, even while the other atlas is pending`, async () => {
    mount();
    images.get(`/${failed}.webp`)!.onerror!();
    await flush();
    expect(characters.dataset.homeArtState).toBe("fallback");
    expect(still.src).toBe("/existing-fallback.webp");
    expect(still.hidden).toBe(false);
    expect(root.dataset.controlsEnabled).toBe("false");
    expect(root.dataset.orbitActive).toBe("false");
    expect(root.tabIndex).toBe(-1);
  });
}

describe("failed home asset lifecycle", () => {
  it("cannot revive interactive art from stood timers or later handoff calls", async () => {
    mount();
    home.dataset.introControlsReadyAt = String(performance.now() + 300);
    window.dispatchEvent(new Event("baozi:intro-person-stood"));
    const staleSuccess = images.get("/dog.webp")!.onload!;
    images.get("/person.webp")!.onerror!();
    staleSuccess();
    await flush();
    controller!.handoff({ angle: 1, angularVelocity: 0 });
    controller!.enable();
    vi.advanceTimersByTime(500);
    expect(root.dataset.controlsEnabled).toBe("false");
    expect(root.dataset.orbitActive).toBe("false");
  });

  it("falls back to HTML without a broken illustration if the existing still also fails", async () => {
    mount();
    images.get("/dog.webp")!.onerror!();
    await flush();
    still.dispatchEvent(new Event("error"));
    expect(characters.dataset.homeArtState).toBe("unavailable");
    expect(still.hidden).toBe(true);
  });

  it("does not change a disposed page when a pending atlas fails", async () => {
    mount();
    const lateError = images.get("/person.webp")!.onerror!;
    controller!.destroy();
    lateError();
    await flush();
    expect(characters.dataset.homeArtState).toBeUndefined();
    expect(still.src).toBe("");
  });
});


it("a narrow static Home without an orbit controller uses the same failure path", () => {
  const stop = watchHomeAssets(root as unknown as HTMLElement);
  images.get("/person.webp")!.onerror!();
  expect(characters.dataset.homeArtState).toBe("fallback");
  expect(still.hidden).toBe(false);
  stop();
});

it("viewport remount retains the failure without requesting either atlas again", async () => {
  mount();
  images.get("/dog.webp")!.onerror!();
  await flush();
  controller!.destroy();
  images.clear();
  const stop = watchHomeAssets(root as unknown as HTMLElement);
  expect(images.size).toBe(0);
  expect(characters.dataset.homeArtState).toBe("fallback");
  expect(still.src).toBe("/existing-fallback.webp");
  stop();
});

it("both failed callbacks produce one fallback event and cannot re-expose sprites", () => {
  mount();
  const events = vi.fn();
  window.addEventListener("baozi:home-assets-failed", events);
  const dogError = images.get("/dog.webp")!.onerror!;
  images.get("/person.webp")!.onerror!();
  dogError();
  expect(events).toHaveBeenCalledTimes(1);
  expect(characters.dataset.homeArtState).toBe("fallback");
});

it("healthy assets preserve the normal artwork without loading the fallback", () => {
  mount();
  images.get("/person.webp")!.onload!();
  images.get("/dog.webp")!.onload!();
  expect(root.dataset.orbitReady).toBe("true");
  expect(root.dataset.orbitActive).toBe("true");
  expect(characters.dataset.homeArtState).toBeUndefined();
  expect(still.src).toBe("");
  expect(still.hidden).toBe(true);
});


it("retains the existing visible non-rail fallback instead of hiding its parent", () => {
  root.rail = false; root.characters = null;
  mount();
  images.get("/dog.webp")!.onerror!();
  expect(root.dataset.orbitActive).toBe("true");
  expect(root.children.get("[data-orbit-fallback]")!.hidden).toBe(false);
  expect(root.dataset.controlsEnabled).toBe("false");
});

it("clears the outstanding leave timer and captured pointer when art fails", () => {
  mount();
  root.dispatchEvent(Object.assign(new Event("pointerleave"), { pointerType: "mouse" }));
  root.dispatchEvent(Object.assign(new Event("pointerdown"), { pointerType: "touch", pointerId: 7, clientX: 100, clientY: 100 }));
  root.dispatchEvent(Object.assign(new Event("pointermove", { cancelable: true }), { pointerType: "touch", pointerId: 7, clientX: 140, clientY: 100 }));
  expect(root.hasPointerCapture(7)).toBe(true);
  images.get("/person.webp")!.onerror!();
  expect(root.hasPointerCapture(7)).toBe(false);
  const adds = vi.mocked(gsap.ticker.add).mock.calls.length;
  vi.advanceTimersByTime(1000);
  expect(vi.mocked(gsap.ticker.add).mock.calls.length).toBe(adds);
});

it("moves focus out of an orbit that becomes hidden", () => {
  mount();
  Object.assign(document, { activeElement: root });
  images.get("/person.webp")!.onerror!();
  expect(home.children.get("#main")!.focus).toHaveBeenCalledWith({ preventScroll: true });
});


it("does not steal unrelated focus when the artwork fails", () => {
  mount();
  Object.assign(document, { activeElement: new ElementStub() });
  images.get("/dog.webp")!.onerror!();
  expect(home.children.get("#main")!.focus).not.toHaveBeenCalled();
});

it("shows the non-rail failure message even when the asset fails before its first handoff", () => {
  root.rail = false; root.characters = null;
  root.dataset.orbitActive = "false";
  controller = createHomeOrbit(root as unknown as HTMLElement);
  images.get("/dog.webp")!.onerror!();
  controller.handoff({ angle: .61, angularVelocity: 0 });
  expect(root.dataset.orbitActive).toBe("true");
  expect(root.children.get("[data-orbit-fallback]")!.hidden).toBe(false);
  expect(root.dataset.controlsEnabled).toBe("false");
});

it("preserves non-rail failure text through a later intro reset and handoff", () => {
  root.rail = false; root.characters = null;
  mount();
  images.get("/dog.webp")!.onerror!();
  window.dispatchEvent(new Event("baozi:intro-orbit-reset"));
  controller!.handoff({ angle: .61, angularVelocity: 0 });
  expect(root.dataset.orbitActive).toBe("true");
  expect(root.children.get("[data-orbit-fallback]")!.hidden).toBe(false);
  expect(root.dataset.controlsEnabled).toBe("false");
});

it("a stationary mouse event cannot release or steer the held Intro pose", () => {
  mount();
  home.dataset.introPoseOwner = "held";
  const before = root.dataset.orbitTargetAngle;
  root.dispatchEvent(Object.assign(new Event("pointermove"), { pointerType: "mouse", clientX: 600, clientY: 50, movementX: 0, movementY: 0 }));
  expect(gsap.ticker.add).not.toHaveBeenCalled();
  expect(home.dataset.introPoseOwner).toBe("held");
  expect(root.dataset.orbitTargetAngle).toBe(before);
});

it("synthetic arrows cannot release or steer the held pose", () => {
  mount();
  home.dataset.introPoseOwner = "held";
  const before = root.dataset.orbitTargetAngle;
  const event = Object.assign(new Event("keydown", { cancelable: true }), { key: "ArrowRight" });
  root.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(false);
  expect(root.dataset.orbitTargetAngle).toBe(before);
});


function holdPose() {
  const stage = new ElementStub(); const person = new ElementStub(); const dog = new ElementStub();
  stage.append(person); stage.append(dog);
  home.children.set("[data-home-person]", root.children.get("[data-orbit-person]")!);
  home.children.set("[data-home-dog]", root.children.get("[data-dog-visual]")!);
  holdIntroPose(home as unknown as HTMLElement, { person: person as unknown as HTMLElement, dog: dog as unknown as HTMLElement }, manifest as unknown as V2Manifest);
}
function trusted(type: string, fields: Record<string, unknown>) {
  const event = Object.assign(new Event(type, { cancelable: true }), fields);
  Object.defineProperty(event, "isTrusted", { value: true }); // Model input only; browser tests use real events.
  return event;
}
function renderTick() { const callback = vi.mocked(gsap.ticker.add).mock.calls.at(-1)?.[0]; callback?.(0, 16, 1, 0); }

it("one eligible first arrow releases the real held layer and advances the target exactly once", () => {
  mount(); holdPose();
  images.get("/person.webp")!.onload!(); images.get("/dog.webp")!.onload!();
  const before = Number(root.dataset.orbitTargetAngle);
  root.dispatchEvent(trusted("keydown", { key: "ArrowRight" }));
  renderTick();
  expect(home.dataset.introPoseOwner).toBeUndefined();
  expect(Number(root.dataset.orbitTargetAngle) - before).toBeCloseTo(Math.PI / 12, 10);
});

it("holds intentional input while Home atlases are pending, and never replays it on load", () => {
  mount(); holdPose();
  const event = trusted("keydown", { key: "ArrowRight" });
  root.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(false);
  expect(home.dataset.introPoseOwner).toBe("held");
  expect(gsap.ticker.add).not.toHaveBeenCalled();
  images.get("/person.webp")!.onload!(); images.get("/dog.webp")!.onload!();
  expect(home.dataset.introPoseOwner).toBe("held");
  expect(gsap.ticker.add).not.toHaveBeenCalled();
  root.dispatchEvent(trusted("keydown", { key: "ArrowRight" }));
  expect(home.dataset.introPoseOwner).toBeUndefined();
});

it("a real moving pointer releases the layer and uses that same input to steer", () => {
  mount(); holdPose();
  images.get("/person.webp")!.onload!(); images.get("/dog.webp")!.onload!();
  const before = root.dataset.orbitTargetAngle;
  root.dispatchEvent(trusted("pointermove", { pointerType: "mouse", clientX: 600, clientY: 50, movementX: 5, movementY: 0 }));
  renderTick();
  expect(home.dataset.introPoseOwner).toBeUndefined();
  expect(root.dataset.orbitTargetAngle).not.toBe(before);
});
