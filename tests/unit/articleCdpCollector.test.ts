import { describe, expect, it } from "vitest";
import { EventEmitter } from "node:events";
import { runInNewContext } from "node:vm";
import type { Page, TestInfo } from "@playwright/test";
import { observeCdpArticleInput } from "../support/article-cdp-input-observation";
import type { ArticleRecord, createArticleRules } from "../support/real-input-observation";

type CollectorRecord = ArticleRecord & {
  clientX?: number; clientY?: number; pointerInProse?: boolean;
  wheelInProse?: boolean; wheelBlockedPath?: string[];
};
interface Evidence {
  token: string; timeOrigin: number; prearmAt: number;
  state: ReturnType<typeof createArticleRules>["state"];
  records: CollectorRecord[]; bodyMove?: CollectorRecord;
  postWheelFrames: { count: number };
}
interface Milestone {
  kind: string; phase: string; documentId: string; token: string; seq: number;
  clickSeq?: number; gateSeqs?: number[]; bodyMoveSeq?: number;
  evidence?: Evidence; records?: CollectorRecord[];
}
interface Observer {
  arm(): Evidence; read(): Evidence; clickSucceeded(): void;
  final(): Evidence; dispose(): Evidence;
}

// This model supplies browser primitives only. The collector and its rule
// factory are the exact script emitted by the production test helper below.
class ElementModel {
  parent: ElementModel | null = null;
  attributes = new Set<string>();
  constructor(readonly tagName: string, readonly id: string, readonly bounds = () => ({ top: 0, height: 0 })) {}
  closest(selector: string): ElementModel | null {
    if (selector === '[data-reading-link="芝浜"]' && this.attributes.has("data-reading-link")) return this;
    return this.parent?.closest(selector) ?? null;
  }
  contains(element: ElementModel): boolean {
    return element === this || !!element.parent && this.contains(element.parent);
  }
  hasAttribute(attribute: string) { return this.attributes.has(attribute); }
  getBoundingClientRect() { return this.bounds(); }
}
class EventModel {
  target: ElementModel | null = null;
  currentTarget: ElementModel | null = null;
  isTrusted = true; defaultPrevented = false; eventPhase = 1; timeStamp = 0;
  constructor(readonly type: string, patch: Partial<EventModel> = {}) { Object.assign(this, patch); }
  composedPath() {
    const path: ElementModel[] = [];
    for (let element = this.target; element; element = element.parent) path.push(element);
    return path;
  }
}
class MouseModel extends EventModel {
  button = 0; buttons = 0; altKey = false; ctrlKey = false; metaKey = false; shiftKey = false;
  clientX = 1000; clientY = 500;
}
class PointerModel extends MouseModel { pointerType = "mouse"; }
class WheelModel extends MouseModel { deltaX = 0; deltaY = -500; deltaMode = 0; }
class KeyboardModel extends EventModel { altKey = false; ctrlKey = false; metaKey = false; shiftKey = false; }
class PopStateModel extends EventModel { state: unknown = null; }
class EventHub {
  private listeners = new Map<string, Set<(event: EventModel) => void>>();
  addEventListener(type: string, listener: (event: EventModel) => void, options?: { signal?: AbortSignal }) {
    const bucket = this.listeners.get(type) ?? new Set();
    bucket.add(listener); this.listeners.set(type, bucket);
    options?.signal?.addEventListener("abort", () => bucket.delete(listener), { once: true });
  }
  dispatch(event: EventModel) { for (const listener of this.listeners.get(event.type) ?? []) listener(event); }
}

async function injectedCollector() {
  let script = "";
  const fake = Object.assign(new EventEmitter(), {
    context: () => ({ newCDPSession: async () => ({ send: async () => undefined, detach: async () => undefined }) }),
    exposeBinding: async () => undefined,
    addInitScript: async (value: { content: string }) => { script = value.content; },
    evaluate: async () => undefined,
  });
  const info = { testId: "collector-vm", status: "passed", attach: async () => undefined };
  const fixture = await observeCdpArticleInput(fake as unknown as Page, info as unknown as TestInfo);
  await fixture.finish({ model: "injected collector only" });
  expect(script).toContain("__baoziArticleCdpInput");

  let now = 1, y = 0, smooth = false, nextFrame = 0;
  const frames = new Map<number, () => void>();
  const signals: Milestone[] = [];
  const html = new ElementModel("HTML", "");
  const body = new ElementModel("BODY", ""); body.parent = html;
  const prose = new ElementModel("DIV", "prose"); prose.parent = body;
  const paragraph = new ElementModel("P", ""); paragraph.parent = prose;
  const heading = new ElementModel("H2", "芝浜", () => ({ top: 4000 - y, height: 40 })); heading.parent = prose;
  const link = new ElementModel("A", ""); link.parent = body; link.attributes.add("data-reading-link");
  const dock = new ElementModel("NAV", "", () => ({ top: 20, height: 84 }));
  const documentElement = Object.assign(html, {
    classList: { contains: (name: string) => smooth && ["lenis-scrolling", "lenis-smooth"].includes(name) },
    get className() { return smooth ? "lenis lenis-scrolling lenis-smooth" : "lenis"; },
  });
  const document = Object.assign(new EventHub(), {
    activeElement: body,
    documentElement,
    querySelector: (selector: string) => selector === '[data-reading-prose] [id="芝浜"]' ? heading
      : selector === "[data-reading-prose]" ? prose
        : selector === "[data-reading-obstruction]" ? dock : null,
  });
  const window = Object.assign(new EventHub(), {
    __baoziArticleCdpInput: undefined as Observer | undefined,
    __baoziArticleCdpSignal: async (milestone: Milestone) => { signals.push(structuredClone(milestone)); },
  });
  const sandbox = {
    window, document, Element: ElementModel, Event: EventModel, MouseEvent: MouseModel,
    PointerEvent: PointerModel, WheelEvent: WheelModel, KeyboardEvent: KeyboardModel, PopStateEvent: PopStateModel,
    AbortController, performance: { timeOrigin: 100000, now: () => now },
    location: { origin: "https://baozi.test", pathname: "/blog/test", search: "", hash: "" },
    get scrollY() { return y; }, matchMedia: () => ({ matches: false }),
    getComputedStyle: () => ({ top: "20px" }),
    requestAnimationFrame: (callback: () => void) => { const id = ++nextFrame; frames.set(id, callback); return id; },
    cancelAnimationFrame: (id: number) => { frames.delete(id); },
  };
  runInNewContext(script, sandbox);
  const observer = window.__baoziArticleCdpInput!;
  const emit = (event: EventModel, time: number) => { now = time; event.timeStamp = time; window.dispatch(event); };
  const frame = (time: number, scroll: number, moving = true) => {
    now = time; y = scroll; smooth = moving;
    const callbacks = [...frames.values()]; frames.clear();
    for (const callback of callbacks) callback();
  };
  const click = () => {
    document.activeElement = link;
    emit(new PointerModel("pointerdown", { target: link }), 10);
    emit(new MouseModel("mouseup", { target: link }), 11);
    emit(new MouseModel("click", { target: link }), 12);
  };
  const gate = () => { frame(20, 60); frame(30, 150); };
  const move = () => emit(new PointerModel("pointermove", { target: paragraph }), 35);
  return {
    observer, signals, document, window, paragraph, prose, heading, sandbox,
    frame, emit, click, gate, move, frames,
    setTime(time: number) { now = time; },
  };
}

describe("actual injected CDP article collector (VM DOM model, no browser)", () => {
  it("transmits accepted click identity in compact click, gate and input-ready signals", async () => {
    const c = await injectedCollector(); c.observer.arm(); c.click(); c.gate(); c.move();
    const read = c.observer.read(), clickSeq = read.state.click!.seq;
    expect(c.signals.map(signal => signal.kind)).toEqual(["click", "gate", "input-ready"]);
    for (const signal of c.signals) {
      expect(signal.clickSeq).toBe(clickSeq);
      expect(signal.evidence).toBeUndefined();
      expect(signal.records).toBeUndefined();
    }
    const gate = c.signals.find(signal => signal.kind === "gate")!;
    const ready = c.signals.find(signal => signal.kind === "input-ready")!;
    expect(gate.gateSeqs).toEqual(read.state.gate!.map(record => record.seq));
    expect(ready.bodyMoveSeq).toBe(read.bodyMove!.seq);
    expect(ready.clickSeq).toBeLessThan(ready.bodyMoveSeq!);
    c.observer.dispose();
  });

  it("retains local high-frequency records without sending growing histories over the binding", async () => {
    const c = await injectedCollector(); c.observer.arm();
    for (let index = 0; index < 40; index++) c.frame(2 + index / 10, 0, false);
    c.click(); c.gate(); c.move();
    for (let index = 0; index < 40; index++) c.frame(40 + index, 180 + index);
    expect(c.observer.read().records.length).toBeGreaterThan(80);
    expect(c.signals.map(signal => signal.kind)).toEqual(["click", "gate", "input-ready"]);
    expect(c.signals.every(signal => signal.evidence === undefined && signal.records === undefined)).toBe(true);
    c.observer.dispose();
  });

  it.each(["beforeunload", "invalid-wheel"])("preserves the full original-document failure snapshot: %s", async (failure) => {
    const c = await injectedCollector(); c.observer.arm(); c.click(); c.gate(); c.move();
    if (failure === "beforeunload") c.emit(new EventModel("beforeunload"), 40);
    else {
      const wheel = new WheelModel("wheel", { target: c.paragraph }); wheel.deltaY = -400;
      c.emit(wheel, 40);
    }
    const failed = c.signals.find(signal => signal.kind === "failed")!;
    expect(failed).toBeDefined();
    expect(failed.evidence).toBeDefined();
    const retained = failed.evidence!;
    expect(retained.state.phase).toBe("failed");
    expect(retained.state.failure).toBe(failure === "beforeunload" ? "unexpected beforeunload" : "invalid actual wheel precondition");
    expect(retained.records.at(-1)?.kind).toBe(failure === "beforeunload" ? "beforeunload" : "wheel");
    expect(retained.records.at(-1)?.seq).toBe(failed.seq);
    expect(retained.records.every(record => record.documentId === failed.documentId)).toBe(true);
    expect(retained.state.click?.seq).toBe(failed.clickSeq);
    expect(retained.records.some(record => record.kind === "click" && record.trusted)).toBe(true);
    expect(retained.bodyMove?.pointerInProse).toBe(true);
    if (failure === "invalid-wheel") {
      expect(retained.records.at(-1)).toMatchObject({ trusted: true, deltaY: -400, wheelInProse: true });
    }
    const stored = JSON.stringify(retained);
    // The binding snapshot must survive the old document becoming unavailable.
    c.window.__baoziArticleCdpInput = undefined;
    c.sandbox.location.pathname = "/replacement";
    c.frame(50, 200); c.emit(new EventModel("beforeunload"), 51);
    c.observer.dispose(); c.observer.dispose();
    expect(c.signals.filter(signal => signal.phase === "failed")).toHaveLength(1);
    expect(JSON.stringify(retained)).toBe(stored);
    expect(retained.state.initial?.pathname).toBe("/blog/test");
  });

  it("emits one failed terminal signal even when more events, frames and disposal follow", async () => {
    const c = await injectedCollector(); c.observer.arm(); c.click();
    c.emit(new EventModel("beforeunload"), 15);
    c.emit(new EventModel("beforeunload"), 16); c.frame(20, 0, false);
    const result = c.observer.dispose(); c.observer.dispose();
    c.emit(new EventModel("beforeunload"), 21); c.frame(22, 0, false);
    expect(c.signals.filter(signal => signal.kind === "failed")).toHaveLength(1);
    expect(result.state.phase).toBe("failed");
    expect(c.frames.size).toBe(0);
  });

  it("disposal returns the complete local evidence and stops sampling without a new binding contract", async () => {
    const c = await injectedCollector(); c.observer.arm(); c.click(); c.gate();
    const before = c.observer.read(), signalsBefore = c.signals.length;
    const disposed = c.observer.dispose();
    expect(disposed.state.phase).toBe("disposed");
    expect(disposed.records).toEqual(before.records);
    c.frame(50, 300); c.emit(new EventModel("beforeunload"), 51);
    expect(c.observer.read().records).toEqual(before.records);
    expect(c.signals).toHaveLength(signalsBefore);
  });

  it("returns fresh complete evidence after actual wheel and the unchanged 1500ms horizon", async () => {
    const c = await injectedCollector(); c.observer.arm(); c.click(); c.gate(); c.move();
    c.emit(new WheelModel("wheel", { target: c.paragraph }), 40);
    c.observer.clickSucceeded(); c.frame(1540, 40, false); c.setTime(1550);
    const result = c.observer.final(); c.observer.dispose();
    expect(result.state.phase).toBe("complete");
    expect(result.state.horizon!.at - result.state.wheel!.at).toBe(1500);
    expect(result.records.filter(record => record.kind === "wheel")).toHaveLength(1);
    expect(result.records.at(-1)?.kind).toBe("final");
    expect(result.postWheelFrames.count).toBe(1);
    expect(result.state.checks?.final).toMatchObject({ notFocused: true, headingAbove300: true, rollbackOver100: true });
  });
});
