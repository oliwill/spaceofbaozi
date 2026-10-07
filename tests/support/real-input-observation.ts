import type { Page, TestInfo } from "@playwright/test";

export interface ArticleRecord {
  kind: string; seq: number; at: number; documentId: string; headingId: number; pathname: string; hash: string;
  y: number; headingTop: number; safeOffset: number; smooth: boolean; focused: boolean; reduced: boolean;
  active: string; target: string; trusted?: boolean; button?: number; buttons?: number; modified?: boolean;
  deltaX?: number; deltaY?: number; deltaMode?: number; historyState?: boolean; eventAt?: number; classes?: string; detail?: string;
  url?: string; activeId?: number; targetId?: number; historyNull?: boolean; clickDispatch?: boolean;
}
export interface HomeRecord {
  kind: string; seq: number; at: number; root: number; documentId: string; value: number;
  trusted?: boolean; rootTarget?: boolean; withinRoot?: boolean; pointerType?: string; focused?: boolean;
  key?: string; repeat?: boolean; before?: number; detail?: string; receivedByRoot?: boolean; eventAt?: number;
}
interface ArticleState {
  phase: string; failure?: string; initial?: ArticleRecord; click?: ArticleRecord; gate?: ArticleRecord[];
  wheel?: ArticleRecord; horizon?: ArticleRecord; final?: ArticleRecord; clickSucceeded: boolean;
  checks?: { horizon?: Record<string, boolean>; final?: Record<string, boolean> };
}

export function createArticleRules() {
  const state: ArticleState = { phase: "inactive", clickSucceeded: false };
  let previous: ArticleRecord | undefined;
  let down = false, up = false, hashSeen = false, popSeen = false;
  let fragment: "closed" | "click" | "pop" | "focus" = "closed", fragmentRecord: ArticleRecord | undefined;
  const targetHash = `#${encodeURIComponent("芝浜")}`;
  const terminal = () => ["failed", "disposed", "complete"].includes(state.phase);
  const fail = (reason: string) => { if (!terminal()) { state.failure = reason; state.phase = "failed"; } };
  const geometry = (r: ArticleRecord) => [r.y, r.headingTop, r.safeOffset, r.at].every(Number.isFinite);
  const orderedEvent = (r: ArticleRecord, before: ArticleRecord) => r.seq > before.seq && r.at >= before.at
    && Number.isFinite(r.eventAt) && r.eventAt! >= before.at && r.eventAt! <= r.at;
  const restored = (r: ArticleRecord, click: ArticleRecord) => !r.focused && !r.smooth && !r.modified
    && r.y === click.y && r.headingTop === click.headingTop && r.activeId === click.targetId;
  const postcondition = (r: ArticleRecord, point: "horizon" | "final") => {
    const checks = { finite: geometry(r), notFocused: !r.focused, headingAbove300: r.headingTop > 300, rollbackOver100: r.y < state.wheel!.y - 100 };
    (state.checks ??= {})[point] = checks;
    return Object.values(checks).every(Boolean);
  };
  const accept = (r: ArticleRecord): string | undefined => {
    if (terminal()) return;
    if (r.kind === "arm") {
      if (state.phase !== "inactive" || !geometry(r) || !r.headingId || r.headingTop <= 400 || r.reduced || r.focused) fail("invalid initial geometry/motion");
      else { state.initial = r; state.phase = "armed"; }
      return;
    }
    const initial = state.initial;
    if (!initial) { fail("record before arm"); return; }
    if (r.documentId !== initial.documentId || r.headingId !== initial.headingId || r.pathname !== initial.pathname
      || !r.url || r.url !== initial.url) fail("document/heading/path changed");
    if (!geometry(r) || r.reduced) fail("nonfinite geometry or changed motion preference");
    if (r.hash !== "" && r.hash !== targetHash || hashSeen && r.hash !== targetHash) fail("unexpected same-document hash");
    if (r.hash === targetHash) hashSeen = true;
    if (["beforeunload", "astro:before-preparation", "astro:after-preparation", "astro:before-swap", "astro:after-swap"].includes(r.kind)) fail(`unexpected ${r.kind}`);
    if (r.kind === "popstate") {
      const click = state.click;
      if (!click || state.phase !== "clicked" || fragment !== "click" || popSeen || previous || r.trusted !== true
        || r.historyState !== false || r.historyNull !== true || r.clickDispatch !== true || r.hash !== targetHash
        || initial.hash !== "" || click.hash !== "" || click.smooth || click.focused || !click.targetId || click.activeId !== click.targetId
        || !restored(r, click) || !orderedEvent(r, click)) fail("unexpected history interrupt");
      else { popSeen = true; fragment = "pop"; fragmentRecord = r; }
      return;
    }
    if (r.kind === "hashchange") fail("unexpected hashchange");
    if (state.failure) return;
    if (fragment === "focus") {
      const click = state.click!;
      if (r.kind !== "focusin" || r.trusted !== true || r.target !== "link" || r.targetId !== click.targetId
        || r.active !== click.active || !restored(r, click) || !orderedEvent(r, fragmentRecord!)) fail("invalid initial fragment restoration");
      fragment = "closed";
      return;
    }
    if (fragment === "pop" && r.kind === "focusin") {
      if (r.trusted !== true || r.clickDispatch !== true || !r.focused || r.smooth || r.modified
        || r.targetId !== initial.headingId || r.activeId !== initial.headingId || r.y <= state.click!.y
        || r.headingTop >= state.click!.headingTop || !orderedEvent(r, fragmentRecord!)) fail("invalid initial fragment focus");
      else { fragment = "focus"; fragmentRecord = r; }
      return;
    }
    if (popSeen && r.kind === "focusin" && !r.focused) fail("unexpected focus after fragment preparation");
    if (state.click) fragment = "closed";
    const primary = r.trusted && r.target === "link" && r.button === 0 && !r.modified;
    if (r.kind === "pointerdown" && !state.click && !down && primary) { down = true; return; }
    if (r.kind === "mouseup" && !state.click && down && !up && primary) { up = true; return; }
    if (r.kind === "click" && !state.click && down && up && primary) { state.click = r; state.phase = "clicked"; fragment = "click"; return "click"; }
    if (["pointerdown", "touchstart", "keydown", "click", "mouseup"].includes(r.kind)) fail(`unexpected ${r.kind}`);
    if (r.kind === "wheel") {
      const click = state.click;
      if (state.phase !== "gate-sent" || !click || !r.trusted || r.deltaX !== 0 || r.deltaY !== -500 || r.deltaMode !== 0
        || r.buttons !== 0 || r.modified || r.y <= click.y + 100 || r.headingTop <= 300 || !r.smooth || r.focused) fail("invalid actual wheel precondition");
      else { state.wheel = r; state.phase = "wheel-captured"; return "wheel"; }
    }
    if (state.click && !state.wheel && (r.focused || (r.kind === "raf" && r.headingTop <= 300))) fail("missed smooth interruption window");
    if (state.wheel && r.focused) fail("target focused after interruption");
    if (state.failure) return;
    if (r.kind === "raf" && state.click && !state.wheel) {
      if (state.phase === "clicked" && previous && previous.at > state.click.at && previous.y > state.click.y
        && previous.smooth && previous.headingTop > 300 && !previous.focused && r.at > previous.at
        && r.y > previous.y && r.y > state.click.y + 100 && r.headingTop > 300 && r.smooth && !r.focused) {
        state.gate = [previous, r]; state.phase = "gate-sent"; return "gate";
      }
      previous = r;
    }
    if (r.kind === "raf" && state.wheel && !state.horizon && r.at >= state.wheel.at + 1500) {
      state.horizon = r;
      if (!postcondition(r, "horizon")) fail("required 1500ms horizon postcondition failed");
      else { state.phase = "horizon-captured"; return "horizon"; }
    }
    if (r.kind === "final") {
      state.final = r;
      if (!state.horizon || !state.clickSucceeded || r.at < state.horizon.at || !postcondition(r, "final")) fail("fresh final postcondition/click failed");
      else state.phase = "complete";
    }
  };
  return { state, accept, fail, clickSucceeded() { state.clickSucceeded = true; }, dispose() { if (!terminal()) state.phase = "disposed"; } };
}

export function orderedTargetChanges(oldValues: (string | null)[], finalValue: string | null) {
  return oldValues.map((old, index) => {
    const next = index + 1 < oldValues.length ? oldValues[index + 1] : finalValue;
    const before = old === null || old.trim() === "" ? NaN : Number(old);
    const value = next === null || next.trim() === "" ? NaN : Number(next);
    if (!Number.isFinite(before) || !Number.isFinite(value)) throw Error("nonfinite target mutation");
    return { before, value, changed: before !== value };
  });
}

export function homeProvenanceError(records: HomeRecord[], target: number, requireKey = true): string | null {
  const baseline = records.find((r) => r.kind === "baseline");
  if (!baseline || !Number.isFinite(baseline.value) || !Number.isFinite(target)) return "missing finite mouse baseline";
  const before = records.filter((r) => r.seq < baseline.seq);
  const mouse = before.filter((r) => r.kind === "pointermove" && r.withinRoot);
  if (mouse.length !== 1 || !mouse[0].trusted || mouse[0].pointerType !== "mouse" || !mouse[0].receivedByRoot) return "expected one trusted mouse move";
  if (!before.some((r) => r.kind === "target" && r.seq > mouse[0].seq && r.value === baseline.value && r.before !== r.value)) return "mouse target never rendered";
  const mouseToBaseline = before.filter((r) => r.seq > mouse[0].seq);
  if (mouseToBaseline.some((r) => ["keydown", "pointerdown", "handoff", "reset", "mount", "remount"].includes(r.kind))) return "writer between mouse and rendered baseline";
  if (mouseToBaseline.filter((r) => r.kind === "target" && r.before !== r.value).length !== 1) return "ambiguous mouse target changes";
  if (records.some((r) => r.documentId !== baseline.documentId || r.root !== baseline.root)) return "root/document replacement";
  if (records.some((r) => r.kind === "pointerleave" && r.rootTarget && r.pointerType === "mouse")) return "root mouse leave since mount";
  const after = records.filter((r) => r.seq > baseline.seq);
  const keys = after.filter((r) => r.kind === "keydown");
  if (!requireKey && keys.length) return "key before intended key command";
  if (requireKey && (keys.length !== 1 || !keys[0].trusted || keys[0].repeat || keys[0].key !== "ArrowRight"
    || !keys[0].focused || !keys[0].withinRoot || !keys[0].rootTarget || keys[0].value !== baseline.value)) return "invalid/stale actual key baseline";
  const key = keys[0];
  const expected = (baseline.value + Math.PI / 12) % (Math.PI * 2);
  for (const r of after) {
    if (["mount", "remount", "handoff", "reset", "pointerdown", "pointercancel"].includes(r.kind)
      || (r.kind === "pointermove" && r.withinRoot)) return `unexpected ${r.kind} after mouse baseline`;
    if (r.kind === "target") {
      if (!Number.isFinite(r.before) || !Number.isFinite(r.value)) return "nonfinite target change";
      if (r.before !== r.value && (!key || r.seq < key.seq || Math.abs(r.value - expected) >= 0.00005 || r.before !== baseline.value)) return "unexpected ordered target change";
    }
  }
  const delta = (target - baseline.value + Math.PI * 2) % (Math.PI * 2);
  if (requireKey && Math.abs(delta - Math.PI / 12) >= 0.00005) return "target step is not exactly 15 degrees at precision 4";
  return null;
}

export function createOneShotInput() {
  let active = true, used = false;
  return {
    stop() { active = false; },
    async run(move: () => Promise<void>, wheel: () => Promise<void>) {
      if (!active || used) return;
      used = true;
      await move();
      if (!active) return;
      await wheel();
    },
  };
}

export async function observeArticleInput(page: Page, testInfo: TestInfo) {
  const { observeCdpArticleInput } = await import("./article-cdp-input-observation");
  const observation = await observeCdpArticleInput(page, testInfo);
  return {
    async run(click: () => Promise<void>) { await observation.run(click); },
    finish: (extra: unknown) => observation.finish(extra),
  };
}

interface HomeEvidence { records: HomeRecord[]; errors: string[]; prearmAt: number; timeOrigin: number }
interface HomeObserver { baseline(): HomeRecord; read(): HomeEvidence; dispose(): void }
type HomeWindow = Window & { __baoziHomeInput?: HomeObserver };

function installHomeObservation(changes: typeof orderedTargetChanges) {
  const records: HomeRecord[] = [], errors: string[] = [], prearmAt = performance.now();
  const documentId = `home:${performance.timeOrigin}`, abort = new AbortController();
  const seen = new WeakMap<Element, number>(), inputRecords = new WeakMap<Event, HomeRecord>();
  let root: HTMLElement | null = null, seq = 0, nextRoot = 0;
  const append = (kind: string, extra: Partial<HomeRecord> = {}) => {
    const record: HomeRecord = { kind, seq: ++seq, at: performance.now(), root: root ? seen.get(root)! : 0,
      documentId, value: root?.dataset.orbitTargetAngle ? Number(root.dataset.orbitTargetAngle) : NaN, ...extra };
    records.push(record); return record;
  };
  const syncRoot = () => {
    const current = document.querySelector<HTMLElement>("[data-home-orbit-root]");
    if (current === root) return;
    root = current;
    if (!root) { if (nextRoot) append("remount"); return; }
    if (!seen.has(root)) seen.set(root, ++nextRoot);
    append("mount");
    root.addEventListener("pointermove", (event) => {
      const record = inputRecords.get(event);
      if (record) record.receivedByRoot = true;
    }, { passive: true, signal: abort.signal });
  };
  const collect = (batch: MutationRecord[]) => {
    syncRoot();
    for (const mutation of batch) {
      if (mutation.type === "childList" && root && Array.from(mutation.removedNodes).some((node) => node === root || node.contains(root))) append("remount");
    }
    const targets = [...new Set(batch.filter((r) => r.attributeName === "data-orbit-target-angle").map((r) => r.target))];
    for (const target of targets) {
      if (!(target instanceof HTMLElement) || !target.matches("[data-home-orbit-root]")) continue;
      const writes = batch.filter((r) => r.target === target && r.attributeName === "data-orbit-target-angle");
      const values = writes.map((r) => r.oldValue), finalValue = target.getAttribute("data-orbit-target-angle");
      for (let i = 0; i < values.length; i++) {
        const after = i + 1 < values.length ? values[i + 1] : finalValue;
        if (values[i] === null && !records.some((r) => r.kind === "baseline")) {
          append("initial-target", { value: after === null ? NaN : Number(after) }); continue;
        }
        try {
          const change = changes([values[i]], after)[0];
          append("target", { ...change, root: seen.get(target) ?? 0, detail: "MutationObserver delivery time; ordered attributeOldValue reconstruction" });
        } catch (error) { errors.push(String(error)); }
      }
    }
    for (const r of batch) {
      if (r.type === "attributes" && r.target === root && r.attributeName !== "data-orbit-target-angle") {
        append("status", { detail: `${r.attributeName}:${r.oldValue}->${root!.getAttribute(r.attributeName!)}` });
        if (records.some((entry) => entry.kind === "baseline") && r.oldValue !== root!.getAttribute(r.attributeName!)) append("reset");
      }
    }
  };
  const observer = new MutationObserver(collect);
  observer.observe(document, { subtree: true, childList: true, attributes: true, attributeOldValue: true,
    attributeFilter: ["data-orbit-target-angle", "data-orbit-active", "data-controls-enabled", "data-reduced-motion", "data-orbit-ready"] });
  const drain = () => { collect(observer.takeRecords()); syncRoot(); };
  for (const kind of ["pointermove", "pointerleave", "pointerdown", "pointerup", "pointercancel", "keydown", "keyup", "focusin"]) {
    window.addEventListener(kind, (event) => {
      drain(); if (!root) return;
      const pointer = event instanceof PointerEvent ? event : null, key = event instanceof KeyboardEvent ? event : null;
      const r = append(kind, { trusted: event.isTrusted, rootTarget: event.target === root,
        withinRoot: event.composedPath().includes(root), pointerType: pointer?.pointerType, key: key?.key, repeat: key?.repeat,
        focused: document.activeElement === root, receivedByRoot: false, eventAt: event.timeStamp });
      inputRecords.set(event, r);
    }, { passive: true, capture: true, signal: abort.signal });
  }
  for (const kind of ["baozi:intro-orbit-update", "baozi:intro-orbit-handoff", "baozi:intro-person-stood", "baozi:intro-orbit-reset", "baozi:orbit-debug-set", "astro:before-swap", "beforeunload"]) {
    window.addEventListener(kind, () => { drain(); if (root) append(kind.includes("reset") || kind.includes("swap") || kind === "beforeunload" ? "reset" : "handoff", { detail: kind }); },
      { passive: true, capture: true, signal: abort.signal });
  }
  (window as HomeWindow).__baoziHomeInput = {
    baseline() { drain(); return append("baseline"); },
    read() { drain(); return { records: [...records], errors: [...errors], prearmAt, timeOrigin: performance.timeOrigin }; },
    dispose() { drain(); observer.disconnect(); abort.abort(); },
  };
}

export async function observeHomeInput(page: Page) {
  await page.addInitScript({ content: `(${installHomeObservation.toString()})(${orderedTargetChanges.toString()});` });
  const read = () => page.evaluate(() => (window as HomeWindow).__baoziHomeInput!.read());
  return {
    async baseline() { return page.evaluate(() => (window as HomeWindow).__baoziHomeInput!.baseline()); },
    async check(target: number, requireKey = true) {
      const evidence = await read();
      const error = evidence.errors[0] ?? homeProvenanceError(evidence.records, target, requireKey);
      if (error) throw Error(error);
      return evidence;
    },
    async finish(testInfo: TestInfo, extra: unknown) {
      let evidence: HomeEvidence | undefined, cleanupError: string | undefined;
      try { evidence = await read(); await page.evaluate(() => (window as HomeWindow).__baoziHomeInput?.dispose()); }
      catch (error) { cleanupError = String(error); }
      await testInfo.attach("home-real-input-observation", { body: JSON.stringify({ evidence, cleanupError, extra }, null, 2), contentType: "application/json" });
    },
  };
}
