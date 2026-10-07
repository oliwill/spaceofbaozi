import { afterEach, beforeEach, expect, it, vi } from "vitest";

const scroll = vi.hoisted(() => vi.fn());
vi.mock("@/lib/scroll/lenis", () => ({ scrollDocumentTo: scroll }));

class ElementStub extends EventTarget {
  dataset: Record<string, string> = {};
  href = "";
  target = "";
  isConnected = true;
  attributes = new Set<string>();
  children: ElementStub[] = [];
  focus = vi.fn();
  constructor(readonly kind: "list" | "detail" | "link" | "heading", id?: string) {
    super();
    if (id) this.dataset.projectId = id;
  }
  hasAttribute(name: string) { return this.attributes.has(name); }
  contains(element: ElementStub) { return this.children.includes(element); }
  closest() { return this.kind === "link" ? this : null; }
  querySelector(selector: string) { return selector === "#project-list-title" ? this.children.find((child) => child.kind === "heading") ?? null : null; }
  querySelectorAll(selector: string) {
    return this.children.filter((child) => selector.includes("data-project-return") ? child.attributes.has("data-project-return") : child.kind === "link" && child.dataset.projectId);
  }
}

let doc: EventTarget & { querySelector: (selector: string) => ElementStub | null; documentElement: { scrollHeight: number } };
let win: EventTarget & { scrollY: number };
let root: ElementStub | null;
let locationValue: URL;
let historyValue: { state: Record<string, unknown> | null; replaceState: ReturnType<typeof vi.fn>; back: ReturnType<typeof vi.fn> };
let frames: Map<number, FrameRequestCallback>;
let sequence: number;
const snapshot = { key: "visit", projectId: "last", scrollY: 640 };
const namespace = { version: 1, list: snapshot, originIndex: 3, detailId: "last" };

function show(kind: "list" | "detail" | "other", state: Record<string, unknown> | null = { index: 3 }, id = "last") {
  if (root) root.isConnected = false;
  locationValue = new URL(kind === "list" ? "/projects" : kind === "detail" ? `/projects/${id}` : "/blog", "https://baozi.test");
  vi.stubGlobal("location", locationValue);
  historyValue.state = state;
  root = kind === "other" ? null : new ElementStub(kind, kind === "detail" ? id : undefined);
  if (root) {
    if (kind === "list") root.children.push(new ElementStub("heading"));
    const link = new ElementStub("link", kind === "list" ? id : undefined);
    link.href = new URL(kind === "list" ? `/projects/${id}` : "/projects", locationValue).href;
    if (kind === "detail") link.attributes.add("data-project-return");
    root.children.push(link);
  }
  return root;
}

function click(link = root!.children.find((child) => child.kind === "link")!, overrides: Record<string, unknown> = {}) {
  const event = new Event("click", { cancelable: true });
  Object.defineProperties(event, Object.fromEntries(Object.entries({ target: link, button: 0, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...overrides }).map(([key, value]) => [key, { value }])));
  root!.dispatchEvent(event);
  return event;
}

function mouseInput(type: string, target: EventTarget | object, overrides: Record<string, unknown> = {}) {
  const event = new Event(type, { cancelable: true });
  Object.defineProperties(event, Object.fromEntries(Object.entries({ target, clientX: 400, clientY: 200, pointerId: 1, pointerType: "mouse", button: 0, detail: 0, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, timeStamp: 1042, ...overrides }).map(([key, value]) => [key, { value }])));
  doc.dispatchEvent(event);
  return event;
}

async function startPointerReturn() {
  show("detail", { index: 4, baoziProjects: namespace });
  await init();
  const link = root!.children[0];
  mouseInput("pointerdown", link, { timeStamp: 964 });
  const event = mouseInput("click", link, { timeStamp: 987, detail: 1 });
  root!.dispatchEvent(event);
  const prep = prepare("/projects", undefined, "traverse");
  vi.stubGlobal("location", new URL("/projects", locationValue));
  historyValue.state = { index: 3, baoziProjects: { version: 1, list: snapshot } };
  return { prep, link };
}

function prepare(to: string, sourceElement?: ElementStub, navigationType = "push") {
  const controller = new AbortController();
  const event = Object.assign(new Event("astro:before-preparation", { cancelable: true }), {
    from: locationValue, to: new URL(to, locationValue), sourceElement, navigationType, signal: controller.signal, loader: async () => {},
  });
  doc.dispatchEvent(event);
  return { event, controller };
}

function swap(preparation: ReturnType<typeof prepare>, kind: "list" | "detail" | "other", state: Record<string, unknown> | null, id = "last") {
  doc.dispatchEvent(Object.assign(new Event("astro:before-swap"), { signal: preparation.controller.signal, to: preparation.event.to }));
  show(kind, state, id);
  doc.dispatchEvent(new Event("astro:after-swap"));
  doc.dispatchEvent(new Event("astro:page-load"));
}

function flush() {
  const callbacks = [...frames.values()];
  frames.clear();
  callbacks.forEach((callback) => callback(0));
}

beforeEach(() => {
  vi.resetModules();
  scroll.mockReset();
  root = null;
  frames = new Map();
  sequence = 0;
  doc = Object.assign(new EventTarget(), {
    querySelector: (selector: string) => selector === "[data-project-list]" ? root?.kind === "list" ? root : null : selector === "[data-project-detail]" && root?.kind === "detail" ? root : null,
    documentElement: { scrollHeight: 1800 },
  });
  win = Object.assign(new EventTarget(), { scrollY: 640 });
  historyValue = { state: { index: 3 }, replaceState: vi.fn((state: Record<string, unknown>) => { historyValue.state = state; }), back: vi.fn() };
  vi.stubGlobal("document", doc);
  vi.stubGlobal("window", win);
  vi.stubGlobal("history", historyValue);
  vi.stubGlobal("innerHeight", 900);
  vi.stubGlobal("Element", ElementStub);
  vi.stubGlobal("HTMLAnchorElement", ElementStub);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { frames.set(++sequence, callback); return sequence; });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => { frames.delete(id); });
});
afterEach(() => vi.unstubAllGlobals());
const init = async () => (await import("@/lib/projects/projectLifecycle")).initProjectLifecycle();

it("saves actual position on the list, transfers after the matching swap, and uses one adjacent back", async () => {
  show("list", { index: 3, baoziAlbum: { albumId: "keep" }, __astro: "keep" });
  await init();
  const link = root!.children[1];
  expect(click(link).defaultPrevented).toBe(false);
  expect(historyValue.state).toMatchObject({ index: 3, __astro: "keep", baoziAlbum: { albumId: "keep" }, baoziProjects: { list: { projectId: "last", scrollY: 640 } } });
  const prep = prepare("/projects/last", link);
  swap(prep, "detail", { index: 4, baoziAlbum: { albumId: "keep" } });
  expect(historyValue.state).toMatchObject({ index: 4, baoziAlbum: { albumId: "keep" }, baoziProjects: { detailId: "last", originIndex: 3, list: { scrollY: 640 } } });
  expect(click().defaultPrevented).toBe(true);
  expect(click().defaultPrevented).toBe(true);
  expect(historyValue.back).toHaveBeenCalledTimes(1);
});

it.each([{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }, { button: 2 }])("does not save or intercept modified click %j", async (flags) => {
  show("list");
  await init();
  expect(click(undefined, flags).defaultPrevented).toBe(false);
  expect(historyValue.replaceState).not.toHaveBeenCalled();
});

it.each(["_blank", "another-window"]) ("leaves the %s target alone", async (target) => {
  show("detail", { index: 4, baoziProjects: namespace });
  root!.children[0].target = target;
  await init();
  expect(click().defaultPrevented).toBe(false);
  expect(historyValue.back).not.toHaveBeenCalled();
});

it("degrades to ordinary links without a usable Astro index or writable history", async () => {
  show("list", null);
  await init();
  const link = root!.children[1];
  click(link);
  expect(historyValue.replaceState).not.toHaveBeenCalled();
  const prep = prepare("/projects/last", link);
  swap(prep, "detail", null);
  expect(click().defaultPrevented).toBe(false);
  expect(historyValue.back).not.toHaveBeenCalled();
  show("list");
  doc.dispatchEvent(new Event("astro:page-load"));
  historyValue.replaceState.mockImplementation(() => { throw new Error("history unavailable"); });
  expect(() => click()).not.toThrow();
});

it("restores clamped scroll and the original link with preventScroll", async () => {
  show("list", { index: 3, baoziProjects: { version: 1, list: { ...snapshot, scrollY: 4000 } } });
  await init();
  flush();
  expect(scroll).toHaveBeenCalledExactlyOnceWith(900, { immediate: true });
  expect(root!.children[1].focus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true });
});

it("uses the list heading when the project disappeared, including an empty list", async () => {
  show("list", { index: 3, baoziProjects: { version: 1, list: snapshot } });
  root!.children.pop();
  await init();
  flush();
  expect(root!.children[0].focus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true });
});

it.each(["pointerdown", "keydown", "wheel", "touchstart", "click"])("cancels delayed restoration on %s", async (type) => {
  show("list", { index: 3, baoziProjects: { version: 1, list: snapshot } });
  await init();
  const queued = [...frames.values()];
  doc.dispatchEvent(new Event(type));
  queued.forEach((callback) => callback(0));
  expect(scroll).not.toHaveBeenCalled();
  expect(root!.children[1].focus).not.toHaveBeenCalled();
});

it("keeps a trusted snapshot on ordinary non-adjacent return without leaving the site", async () => {
  show("detail", { index: 9, baoziProjects: namespace });
  await init();
  const link = root!.children[0];
  expect(click(link).defaultPrevented).toBe(false);
  expect(historyValue.back).not.toHaveBeenCalled();
  const prep = prepare("/projects", link);
  swap(prep, "list", { index: 10 });
  flush();
  expect(historyValue.state).toEqual({ index: 10, baoziProjects: { version: 1, list: snapshot } });
  expect(scroll).toHaveBeenCalledExactlyOnceWith(640, { immediate: true });
  expect(root!.children[1].focus).toHaveBeenCalledTimes(1);
});

it("does not steal focus after user input while a return is loading", async () => {
  show("detail", { index: 9, baoziProjects: namespace });
  await init();
  const link = root!.children[0];
  click(link);
  const prep = prepare("/projects", link);
  doc.dispatchEvent(new Event("keydown"));
  swap(prep, "list", { index: 10 });
  flush();
  expect(scroll).not.toHaveBeenCalled();
  expect(root!.children[1].focus).not.toHaveBeenCalled();
});

it("keeps unknown/direct detail returns as normal links and starts the new list at the top", async () => {
  show("detail", { index: 0 });
  await init();
  const link = root!.children[0];
  expect(click(link).defaultPrevented).toBe(false);
  swap(prepare("/projects", link), "list", { index: 1 });
  flush();
  expect(historyValue.back).not.toHaveBeenCalled();
  expect(scroll).not.toHaveBeenCalled();
});

it("discards a cancelled or superseded detail snapshot and ignores its late page-load", async () => {
  show("list");
  await init();
  const link = root!.children[1];
  click(link);
  const first = prepare("/projects/last", link);
  first.controller.abort();
  const later = prepare("/blog");
  swap(first, "detail", { index: 4 });
  expect(historyValue.state).toEqual({ index: 4 });
  swap(later, "other", { index: 5 });
  expect(historyValue.state).toEqual({ index: 5 });
  flush();
  expect(scroll).not.toHaveBeenCalled();
});

it("does not copy a snapshot into a redirected or wrong detail", async () => {
  show("list");
  await init();
  const link = root!.children[1];
  click(link);
  const prep = prepare("/projects/last", link);
  prep.event.to = new URL("/projects/other", locationValue);
  swap(prep, "detail", { index: 4 }, "other");
  expect(historyValue.state).toEqual({ index: 4 });
});

it("cleans old callbacks and handlers at before-swap and pagehide, remounting a BFCache page once", async () => {
  show("list", { index: 3, baoziProjects: { version: 1, list: snapshot } });
  await init();
  const old = root!;
  const queued = [...frames.values()];
  win.dispatchEvent(new Event("pagehide"));
  queued.forEach((callback) => callback(0));
  click(old.children[1]);
  expect(historyValue.replaceState).not.toHaveBeenCalled();
  expect(scroll).not.toHaveBeenCalled();
  win.dispatchEvent(Object.assign(new Event("pageshow"), { persisted: true }));
  await init();
  doc.dispatchEvent(new Event("astro:page-load"));
  flush();
  expect(scroll).toHaveBeenCalledTimes(1);
  click(old.children[1]);
  expect(historyValue.replaceState).toHaveBeenCalledTimes(1);
});

it("cancels the queued frame and detaches list events before swap", async () => {
  show("list", { index: 3, baoziProjects: { version: 1, list: snapshot } });
  await init();
  const old = root!;
  const queued = [...frames.values()];
  const prep = prepare("/blog");
  doc.dispatchEvent(Object.assign(new Event("astro:before-swap"), { signal: prep.controller.signal, to: prep.event.to }));
  queued.forEach((callback) => callback(0));
  click(old.children[1]);
  expect(historyValue.replaceState).not.toHaveBeenCalled();
  expect(scroll).not.toHaveBeenCalled();
});

it("clears a failed loader without swallowing the failure or losing current-page links", async () => {
  show("list");
  await init();
  const link = root!.children[1];
  click(link);
  const controller = new AbortController();
  const event = Object.assign(new Event("astro:before-preparation", { cancelable: true }), {
    from: locationValue, to: new URL("/projects/last", locationValue), sourceElement: link, navigationType: "push", signal: controller.signal,
    loader: async () => { throw new Error("controlled failure"); },
  });
  doc.dispatchEvent(event);
  await expect(event.loader()).rejects.toThrow("controlled failure");
  click(link);
  swap(prepare("/projects/last", link), "detail", { index: 4 });
  expect(historyValue.state).toMatchObject({ baoziProjects: { detailId: "last" } });
});

it("repeats five round trips and forward traversals without duplicated restoration or back handlers", async () => {
  show("list");
  await init();
  await init();
  for (let index = 0; index < 5; index++) {
    const link = root!.children[1];
    click(link);
    const listState = historyValue.state!;
    swap(prepare("/projects/last", link), "detail", { index: 4 });
    const detailState = historyValue.state!;
    click();
    swap(prepare("/projects", undefined, "traverse"), "list", listState);
    flush();
    expect(root!.children[1].focus).toHaveBeenCalledTimes(1);
    swap(prepare("/projects/last", undefined, "traverse"), "detail", detailState);
    expect(historyValue.state).toEqual(detailState);
    swap(prepare("/projects", undefined, "traverse"), "list", listState);
    flush();
  }
  expect(historyValue.back).toHaveBeenCalledTimes(5);
  expect(scroll).toHaveBeenCalledTimes(10);
});

it("keeps the Mac double-click return intent when the second press hits transition HTML before swap and releases after page-load", async () => {
  const { prep } = await startPointerReturn();
  mouseInput("pointerdown", doc.documentElement);
  mouseInput("mousedown", doc.documentElement, { detail: 2, timeStamp: 1042.1 });
  swap(prep, "list", historyValue.state);
  const repeatedClick = mouseInput("click", doc.documentElement, { detail: 2, timeStamp: 1067.1 });
  flush();
  expect(repeatedClick.defaultPrevented).toBe(false);
  expect(historyValue.back).toHaveBeenCalledTimes(1);
  expect(scroll).toHaveBeenCalledExactlyOnceWith(640, { immediate: true });
  expect(root!.children[1].focus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true });
});

it("consumes a repeated return click on the old source after popstate changed the current history entry", async () => {
  const { prep, link } = await startPointerReturn();
  mouseInput("pointerdown", link);
  mouseInput("mousedown", link, { detail: 2 });
  const repeatedClick = mouseInput("click", link, { detail: 2, timeStamp: 1067 });
  root!.dispatchEvent(repeatedClick);
  swap(prep, "list", historyValue.state);
  flush();
  expect(repeatedClick.defaultPrevented).toBe(true);
  expect(historyValue.back).toHaveBeenCalledTimes(1);
  expect(root!.children[1].focus).toHaveBeenCalledTimes(1);
});

it.each(["wheel", "touchstart", "keydown"])("still cancels a double-click return after intervening %s input", async (type) => {
  const { prep } = await startPointerReturn();
  mouseInput("pointerdown", doc.documentElement);
  doc.dispatchEvent(new Event(type));
  mouseInput("mousedown", doc.documentElement, { detail: 2 });
  swap(prep, "list", historyValue.state);
  mouseInput("click", doc.documentElement, { detail: 2, timeStamp: 1067 });
  flush();
  expect(scroll).not.toHaveBeenCalled();
  expect(root!.children[1].focus).not.toHaveBeenCalled();
  expect(historyValue.back).toHaveBeenCalledTimes(1);
});

it.each([{ detail: 1 }, { detail: 2, clientX: 480 }, { detail: 2, ctrlKey: true }, { detail: 2, metaKey: true }, { detail: 2, shiftKey: true }, { detail: 2, altKey: true }, { detail: 2, button: 2 }, { detail: 2, pointerId: 2 }, { detail: 2, timeStamp: 3000 }])("does not mistake a new mouse action for a continued return %j", async (input) => {
  const { prep } = await startPointerReturn();
  mouseInput("pointerdown", doc.documentElement, input);
  mouseInput("mousedown", doc.documentElement, input);
  swap(prep, "list", historyValue.state);
  flush();
  expect(scroll).not.toHaveBeenCalled();
  expect(root!.children[1].focus).not.toHaveBeenCalled();
});

it("cancels when the next mouse action targets an unrelated link, even at the same coordinates", async () => {
  const { prep } = await startPointerReturn();
  const external = new ElementStub("link");
  external.href = "https://elsewhere.test/";
  mouseInput("pointerdown", external);
  mouseInput("mousedown", external, { detail: 2 });
  swap(prep, "list", historyValue.state);
  flush();
  expect(scroll).not.toHaveBeenCalled();
});

it("does not carry the continued return gesture into a later navigation or BFCache restore", async () => {
  const { prep } = await startPointerReturn();
  mouseInput("pointerdown", doc.documentElement);
  mouseInput("mousedown", doc.documentElement, { detail: 2 });
  prep.controller.abort();
  const later = prepare("/blog");
  swap(later, "other", { index: 4 });
  expect(mouseInput("click", doc.documentElement, { detail: 2 }).defaultPrevented).toBe(false);
  win.dispatchEvent(new Event("pagehide"));
  show("list", { index: 3, baoziProjects: { version: 1, list: snapshot } });
  win.dispatchEvent(Object.assign(new Event("pageshow"), { persisted: true }));
  mouseInput("pointerdown", doc.documentElement);
  mouseInput("mousedown", doc.documentElement, { detail: 2 });
  flush();
  expect(scroll).not.toHaveBeenCalled();
  expect(root!.children[1].focus).not.toHaveBeenCalled();
});
