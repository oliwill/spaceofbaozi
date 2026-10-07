import { EventEmitter } from "node:events";
import { runInNewContext } from "node:vm";
import type { Page, TestInfo } from "@playwright/test";
import { observeCdpArticleInput } from "./article-cdp-input-observation";
import { createArticleRules, type ArticleRecord } from "./real-input-observation";

export interface CdpRecord extends ArticleRecord {
  clientX?: number; clientY?: number; pointerType?: string;
  pointerInProse?: boolean; wheelInProse?: boolean; wheelBlockedPath?: string[];
}
export interface CdpEvidence {
  prearmAt: number; timeOrigin: number; token: string;
  state: ReturnType<typeof createArticleRules>["state"];
  records: CdpRecord[]; bodyMove?: CdpRecord;
  postWheelFrames: { count: number; firstAt?: number; lastAt?: number; minimumHeadingTop?: number; maximumY?: number };
}
export interface CdpMilestone {
  kind: string; token: string; documentId: string; seq: number; at: number; phase: string;
  failure?: string; clickSeq?: number; gateSeqs?: number[]; bodyMoveSeq?: number; evidence?: CdpEvidence;
}
export interface CdpAttachment {
  evidence?: CdpEvidence;
  commands: { action: string; error?: string }[];
  primary?: string; secondaryErrors: string[]; pendingActions?: string[];
  otherDocuments?: unknown[]; otherDocumentObservations?: unknown[];
}
interface BindingSource { page: Page; frame: object }
interface MouseParams { type: string; x: number; y: number; deltaX?: number; deltaY?: number }
export interface CdpTestObservation {
  run(click: () => Promise<void>): Promise<unknown>;
  finish(extra: unknown): Promise<void>;
}
type ObservationFactory = (page: Page, info: TestInfo) => Promise<CdpTestObservation>;

export function deferred() {
  let resolve!: () => void, reject!: (reason: Error) => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  void promise.catch(() => {});
  return { promise, resolve, reject };
}
export const flushTasks = () => new Promise<void>((resolve) => setImmediate(resolve));

export async function createArticleCdpHarness(factory: ObservationFactory = observeCdpArticleInput) {
  const rules = createArticleRules(), records: CdpRecord[] = [], frame = {}, fake = new EventEmitter();
  const clickApi = deferred(), moveApi = deferred(), wheelApi = deferred(), clickBegan = deferred();
  const saved: CdpAttachment[] = [], attachmentNames: string[] = [];
  const attachments: { body: string }[] = [];
  const calls = { move: [] as number[][], wheel: [] as number[][], evaluate: [] as string[], detach: 0 };
  const operations = {
    move: (_x: number, _y: number): Promise<void> => moveApi.promise,
    wheel: (_deltaX: number, _deltaY: number): Promise<void> => wheelApi.promise,
  };
  const info = {
    testId: "cdp-lifecycle", status: "passed",
    async attach(name: string, value: { body: string }) {
      attachments.push(value);
      attachmentNames.push(name); saved.push(JSON.parse(value.body) as CdpAttachment);
    },
  };
  const token = `article-cdp-${info.testId}`, postWheelFrames: CdpEvidence["postWheelFrames"] = { count: 0 };
  let bodyMoveRecord: CdpRecord | undefined, replacement: CdpEvidence | undefined;
  let signal!: (source: BindingSource, milestone: CdpMilestone) => unknown;
  let moveHook: (() => void) | undefined, wheelHook: (() => void) | undefined;
  let inputReadySent = false, finished = false, finishPromise: Promise<void> | undefined;
  let result: Promise<unknown> | undefined, observed: unknown;
  const read = (): CdpEvidence => structuredClone({ token, state: rules.state, records, prearmAt: 0, timeOrigin: 0, bodyMove: bodyMoveRecord, postWheelFrames });
  const record = (kind: string, patch: Partial<CdpRecord> = {}) => {
    const value: CdpRecord = {
      kind, seq: records.length + 1, at: 10, documentId: "doc", headingId: 1,
      pathname: "/blog/test", hash: "", y: 0, headingTop: 4000, safeOffset: 120,
      smooth: false, focused: false, reduced: false, active: "A#", target: "link",
      trusted: true, button: 0, buttons: 0, modified: false,
      url: "https://baozi.test/blog/test", activeId: 2, targetId: 2, ...patch,
    };
    records.push(value);
    if (kind === "raf" && rules.state.wheel) {
      postWheelFrames.count++;
      postWheelFrames.firstAt ??= value.at; postWheelFrames.lastAt = value.at;
      postWheelFrames.minimumHeadingTop = Math.min(postWheelFrames.minimumHeadingTop ?? Infinity, value.headingTop);
      postWheelFrames.maximumY = Math.max(postWheelFrames.maximumY ?? -Infinity, value.y);
    }
    return rules.accept(value);
  };
  const observer = {
    arm() { calls.evaluate.push("arm"); record("arm"); return read(); },
    read() { calls.evaluate.push("read"); return replacement ?? read(); },
    clickSucceeded() { calls.evaluate.push("clickSucceeded"); rules.clickSucceeded(); },
    final() { calls.evaluate.push("final"); record("final", { at: 1600, y: 80, headingTop: 3920 }); return read(); },
    dispose() { calls.evaluate.push("dispose"); if (replacement) return replacement; rules.dispose(); return read(); },
  };
  const session = {
    async send(method: string, params: MouseParams) {
      if (method !== "Input.dispatchMouseEvent") throw Error(`unexpected CDP method: ${method}`);
      if (params.type === "mouseMoved") {
        calls.move.push([params.x, params.y]); moveHook?.(); await operations.move(params.x, params.y);
      } else if (params.type === "mouseWheel") {
        calls.wheel.push([params.deltaX ?? NaN, params.deltaY ?? NaN]); wheelHook?.();
        await operations.wheel(params.deltaX ?? NaN, params.deltaY ?? NaN);
      } else throw Error(`unexpected input type: ${params.type}`);
    },
    async detach() { calls.detach++; },
  };
  Object.assign(fake, {
    mainFrame: () => frame, context: () => ({ async newCDPSession() { return session; } }),
    async exposeBinding(_name: string, callback: typeof signal) { signal = callback; },
    async addInitScript() {},
    async evaluate(callback: () => unknown) {
      const value: unknown = runInNewContext(`(${callback.toString()})()`, { window: { __baoziArticleCdpInput: observer } });
      return structuredClone(value);
    },
  });
  const page = fake as unknown as Page;
  const observation = await factory(page, info as unknown as TestInfo);
  const milestone = (kind: string, payload = read()): CdpMilestone => {
    const latest = payload.records.at(-1)!;
    return {
      kind, token: payload.token, documentId: payload.state.initial?.documentId ?? "replacement",
      seq: latest?.seq ?? 0, at: latest?.at ?? 0, phase: payload.state.phase, failure: payload.state.failure,
      clickSeq: payload.state.click?.seq,
      gateSeqs: kind === "gate" || kind === "input-ready" ? payload.state.gate?.map((sample) => sample.seq) : undefined,
      bodyMoveSeq: kind === "input-ready" ? payload.bodyMove?.seq : undefined,
      evidence: ["failed", "complete", "disposed"].includes(payload.state.phase) ? payload : undefined,
    };
  };
  const deliverMilestone = (value: CdpMilestone, source = { page, frame }) => signal(source, structuredClone(value));
  const deliver = (kind: string, payload = read(), source = { page, frame }) => deliverMilestone(milestone(kind, payload), source);
  const ready = () => {
    if (!inputReadySent && rules.state.phase === "gate-sent" && bodyMoveRecord) {
      inputReadySent = true; deliver("input-ready");
    }
  };
  const capture = (kind: string, patch: Partial<CdpRecord> = {}, send = true) => {
    const result = record(kind, patch);
    if (send && (result || rules.state.failure)) deliver(rules.state.failure ? "failed" : result!);
    if (send) ready();
    return read();
  };
  const click = (send = true) => {
    capture("pointerdown", {}, send); capture("mouseup", {}, send);
    return capture("click", { at: 20 }, send);
  };
  const gate = (send = true) => {
    capture("raf", { at: 30, y: 60, headingTop: 3940, smooth: true }, send);
    return capture("raf", { at: 40, y: 150, headingTop: 3850, smooth: true }, send);
  };
  const bodyMove = (send = true, patch: Partial<CdpRecord> = {}) => {
    record("pointermove", { at: 45, y: 170, headingTop: 3830, smooth: true, target: "P#",
      clientX: 1000, clientY: 500, pointerType: "mouse", pointerInProse: true, wheelBlockedPath: [], ...patch });
    bodyMoveRecord = records.at(-1);
    if (send) ready();
    return read();
  };
  const wheel = (patch: Partial<CdpRecord> = {}) => capture("wheel", {
    at: 50, y: 200, headingTop: 3800, smooth: true, target: "main",
    deltaX: 0, deltaY: -500, deltaMode: 0, clientX: 1000, clientY: 500, wheelInProse: true, wheelBlockedPath: [], ...patch,
  });
  const horizon = (patch: Partial<CdpRecord> = {}) => capture("raf", { at: 1550, y: 90, headingTop: 3910, ...patch });
  const fail = (message = "browser rule failed") => { rules.fail(message); return deliver("failed"); };
  const terminal = (phase: "complete" | "disposed", kind = "progress") => {
    const payload = read(); payload.state.phase = phase; deliver(kind, payload); return payload;
  };
  const replaceDocument = () => {
    replacement = { ...read(), records: [], state: { phase: "inactive", clickSucceeded: false } };
  };
  const finish = (extra: unknown = { wireOnly: true }) => {
    finishPromise ??= observation.finish(extra).then(() => { finished = true; });
    return finishPromise;
  };
  const settle = () => { clickApi.resolve(); moveApi.resolve(); wheelApi.resolve(); };
  return {
    calls, clickApi, moveApi, wheelApi, info, saved, attachmentNames, attachments, rules, observer, fake, page, frame, operations, observation,
    read, milestone, deliver, deliverMilestone, capture, click, gate, bodyMove, wheel, horizon, fail, terminal,
    replaceDocument, finish, settle,
    onMove(hook: () => void) { moveHook = hook; }, onWheel(hook: () => void) { wheelHook = hook; },
    async start() {
      result = observation.run(() => { clickBegan.resolve(); return clickApi.promise; }).catch((error: unknown) => error);
      void result.then((value) => { observed = value; }); await clickBegan.promise;
    },
    outcome: () => result!, observed: () => observed,
    async cleanup() {
      fake.emit("close"); settle(); await result;
      if (!finished) await finish();
    },
  };
}
export type ArticleCdpHarness = Awaited<ReturnType<typeof createArticleCdpHarness>>;
