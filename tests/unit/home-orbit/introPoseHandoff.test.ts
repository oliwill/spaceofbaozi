import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { holdIntroPose, isIntroPoseHeld, releaseHeldIntroPose } from "@/lib/home-orbit/introPoseHandoff";
import type { V2Manifest } from "@/lib/intro-oil/v2";

const manifest = JSON.parse(readFileSync(new URL("../../../public/manifest/asset-manifest.v2.json", import.meta.url), "utf8")) as V2Manifest;
class ElementStub extends EventTarget {
  dataset: Record<string, string> = {};
  style: Record<string, string> = {};
  className = "";
  parentElement: ElementStub | null = null;
  nodes: ElementStub[] = [];
  selectors = new Map<string, ElementStub>();
  rect = { left: 0, top: 0, width: 1440, height: 900, right: 1440, bottom: 900 };
  querySelector(selector: string) { return this.selectors.get(selector) ?? null; }
  getBoundingClientRect() { return this.rect; }
  setAttribute() {}
  append(node: ElementStub) { node.remove(); this.nodes.push(node); node.parentElement = this; }
  remove() {
    if (this.parentElement) this.parentElement.nodes = this.parentElement.nodes.filter(node => node !== this);
    this.parentElement = null;
  }
}
let home: ElementStub, container: ElementStub, stage: ElementStub, person: ElementStub, dog: ElementStub, targetPerson: ElementStub, targetDog: ElementStub;
let resize: (() => void)[];
let disconnect: ReturnType<typeof vi.fn>;
let desktop: boolean;

beforeEach(() => {
  resize = []; disconnect = vi.fn(); desktop = true;
  home = new ElementStub(); container = new ElementStub(); stage = new ElementStub();
  home.dataset.introPoseOwner = "intro";
  container.rect = { left: 10, top: 330, width: 280, height: 260, right: 290, bottom: 590 };
  home.selectors.set(".site-characters", container);
  const orbit = new ElementStub(); orbit.dataset.orbitActive = "true";
  home.selectors.set("[data-home-orbit-root]", orbit);
  targetPerson = new ElementStub(); targetDog = new ElementStub();
  targetPerson.rect = { left: 50, top: 350, width: 280, height: 250, right: 330, bottom: 600 };
  targetDog.rect = { left: 200, top: 575, width: 100, height: 75, right: 300, bottom: 650 };
  home.selectors.set("[data-home-person]", targetPerson); home.selectors.set("[data-home-dog]", targetDog);
  orbit.selectors.set("[data-orbit-person]", targetPerson); orbit.selectors.set("[data-dog-visual]", targetDog);
  person = new ElementStub(); dog = new ElementStub();
  person.rect = { left: 50, top: 342.4, width: 280, height: 280, right: 330, bottom: 622.4 };
  dog.rect = { left: 200, top: 581, width: 100, height: 75, right: 300, bottom: 656 };
  person.style.backgroundImage = `url(${manifest.sequences["person-slide-in-rise-stand"].src})`;
  dog.style.backgroundImage = `url(${manifest.sequences["dog-look-up-settle"].src})`;
  stage.append(person); stage.append(dog);
  vi.stubGlobal("window", Object.assign(new EventTarget(), { matchMedia: () => ({ matches: desktop }) }));
  vi.stubGlobal("document", Object.assign(new EventTarget(), { createElement: () => new ElementStub() }));
  vi.stubGlobal("ResizeObserver", class { constructor(callback: () => void) { resize.push(callback); } observe() {} disconnect = disconnect; });
  vi.stubGlobal("MutationObserver", class { observe() {} disconnect = disconnect; });
});
afterEach(() => { releaseHeldIntroPose(home as unknown as HTMLElement); vi.unstubAllGlobals(); });
function hold() { holdIntroPose(home as unknown as HTMLElement, { person: person as unknown as HTMLElement, dog: dog as unknown as HTMLElement }, manifest); }

it("transfers the exact two Intro nodes atomically without changing their atlas identities", () => {
  const sources = [person.style.backgroundImage, dog.style.backgroundImage];
  hold();
  expect(home.dataset.introPoseOwner).toBe("held");
  expect(stage.nodes).toEqual([]);
  expect(container.nodes).toHaveLength(1);
  expect(container.nodes[0].nodes).toEqual([person, dog]);
  expect(person.style.transform).toBe("translate3d(40px, 12.399999999999977px, 0)");
  expect(dog.style.transform).toBe("translate3d(190px, 251px, 0)");
  expect([person.style.backgroundImage, dog.style.backgroundImage]).toEqual(sources);
});

it("re-registers the same terminal frames across a responsive resize", () => {
  hold(); desktop = false;
  targetPerson.rect = { left: 240, top: 80, width: 169, height: 150, right: 409, bottom: 230 };
  targetDog.rect = { left: 300, top: 170, width: 81, height: 60.75, right: 381, bottom: 230.75 };
  resize[0]();
  expect(person.style.width).toBe("169px");
  expect(person.style.backgroundPosition).toBe("-507px -169px");
  expect(dog.style.width).toBe("81px");
  expect(dog.style.backgroundPosition).toBe("-243px -60.75px");
  expect(isIntroPoseHeld(home as unknown as HTMLElement)).toBe(true);
});

it("release restores native ownership and removes observers without deleting the original Intro nodes", () => {
  hold(); releaseHeldIntroPose(home as unknown as HTMLElement);
  expect(home.dataset.introPoseOwner).toBeUndefined();
  expect(container.nodes).toEqual([]);
  expect(stage.nodes).toEqual([person, dog]);
  expect(disconnect).toHaveBeenCalledTimes(2);
  releaseHeldIntroPose(home as unknown as HTMLElement);
  expect(disconnect).toHaveBeenCalledTimes(2);
});

it("keeps held nodes on BFCache pagehide but releases them for navigation", () => {
  hold();
  window.dispatchEvent(Object.assign(new Event("pagehide"), { persisted: true }));
  expect(home.dataset.introPoseOwner).toBe("held");
  document.dispatchEvent(new Event("astro:before-swap"));
  expect(home.dataset.introPoseOwner).toBeUndefined();
  expect(stage.nodes).toEqual([person, dog]);
});

it("a late failure only releases the matching Home", () => {
  hold();
  window.dispatchEvent(new CustomEvent("baozi:home-assets-failed", { detail: { home: new ElementStub() } }));
  expect(home.dataset.introPoseOwner).toBe("held");
  window.dispatchEvent(new CustomEvent("baozi:home-assets-failed", { detail: { home } }));
  expect(home.dataset.introPoseOwner).toBeUndefined();
});

it("never installs a held pose over an active resource fallback", () => {
  container.dataset.homeArtState = "fallback";
  hold();
  expect(container.nodes).toEqual([]);
  expect(stage.nodes).toEqual([person, dog]);
  expect(home.dataset.introPoseOwner).toBe("intro");
});
