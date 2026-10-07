import { afterEach, describe, expect, it } from "vitest";
import type { Page } from "@playwright/test";
import { observeArticleInput, type ArticleRecord } from "../support/real-input-observation";
import { createArticleCdpHarness } from "../support/article-cdp-test-harness";

function deferred() {
  let resolve!: () => void, reject!: (reason: Error) => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  void promise.catch(() => {});
  return { promise, resolve, reject };
}
const drain = () => new Promise<void>((resolve) => setImmediate(resolve));
const sample = (kind: string, seq: number, patch: Partial<ArticleRecord> = {}): ArticleRecord => ({
  kind, seq, at: 10, documentId: "doc", headingId: 1, pathname: "/blog/test", hash: "", y: 0,
  headingTop: 4000, safeOffset: 120, smooth: false, focused: false, reduced: false, active: "A#",
  target: "link", trusted: true, button: 0, buttons: 0, modified: false,
  url: "https://baozi.test/blog/test", activeId: 2, targetId: 2, ...patch,
});
const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => { for (const cleanup of cleanups.splice(0)) await cleanup(); });

async function wire() {
  // D-150：全部协调断言必须通过活动入口验证实际 CDP 传输。
  const harness = await createArticleCdpHarness(observeArticleInput);
  harness.wheelApi.resolve();
  cleanups.push(() => harness.cleanup());
  return harness;
}

describe("article accepted-click dispatch wiring (fake Page, no browser)", () => {
  it("starts exactly one body move on accepted click before click API completion or gate", async () => {
    const c = await wire(); await c.start(); const click = c.click();
    c.deliver("click", click); await drain();
    expect(c.calls.move).toEqual([[1000, 500]]); expect(c.calls.wheel).toEqual([]);
    expect(c.calls.evaluate).toEqual(["arm"]); expect(c.rules.state.clickSucceeded).toBe(false);
  });
  it("stores the one-use move before a reentrant click or gate can start another", async () => {
    const c = await wire(); await c.start();
    c.onMove(() => { c.deliver("click"); c.gate(); c.bodyMove(); }); c.click(); await drain();
    expect(c.calls.move).toHaveLength(1); expect(c.calls.wheel).toHaveLength(0);
    c.moveApi.resolve(); await drain(); expect(c.calls.wheel).toEqual([[0, -500]]);
  });
  it.each(["move-first", "gate-first"])("requires both the same move and two-RAF gate: %s", async (order) => {
    const c = await wire(); await c.start(); c.click(); await drain();
    if (order === "move-first") {
      c.bodyMove(true, { at: 25, y: 30, headingTop: 3970 }); c.moveApi.resolve();
      await drain(); expect(c.calls.wheel).toHaveLength(0); c.gate();
    } else { c.gate(); c.bodyMove(); await drain(); expect(c.calls.wheel).toHaveLength(0); c.moveApi.resolve(); }
    await drain();
    expect(c.calls.move).toEqual([[1000, 500]]); expect(c.calls.wheel).toEqual([[0, -500]]);
    expect(c.calls.evaluate).toEqual(["arm"]);
  });
  it("accepts gate delivery before click delivery only from its accepted-click payload", async () => {
    const c = await wire(); await c.start(); const click = c.click(false), gate = c.gate(false);
    c.deliver("gate", gate); c.deliver("click", click); c.deliver("gate", gate); await drain();
    c.bodyMove(); c.moveApi.resolve(); await drain();
    expect(c.calls.move).toHaveLength(1); expect(c.calls.wheel).toHaveLength(1);
    expect(c.calls.evaluate).toEqual(["arm"]);
  });
  it.each(["click", "gate"])("rejects a %s signal without accepted-click evidence", async (kind) => {
    const c = await wire(); await c.start(); c.deliver(kind); c.moveApi.resolve(); await drain();
    expect(c.calls.move).toHaveLength(0); expect(c.calls.wheel).toHaveLength(0);
    expect(c.observed()).toBeInstanceOf(Error);
  });
  it("ignores duplicate and delayed lower-sequence payloads after the actual wheel", async () => {
    const c = await wire(); await c.start(); const click = c.click(), gate = c.gate();
    await drain(); c.bodyMove(); c.moveApi.resolve(); await drain(); c.wheel();
    for (let i = 0; i < 3; i++) { c.deliver("click", click); c.deliver("gate", gate); }
    await drain(); expect(c.calls.move).toHaveLength(1); expect(c.calls.wheel).toHaveLength(1);
    c.horizon(); c.clickApi.resolve(); expect(await c.outcome()).toBeUndefined();
    await c.finish(); expect(c.saved[0].evidence!.state.phase).toBe("complete");
  });
  it.each(["complete", "disposed"].flatMap((phase) => [false, true].map((append) => ({ phase, append }))))(
    "does not revive a cached terminal using old click/gate: %j", async ({ phase, append }) => {
      const c = await wire(); await c.start(); const click = c.click(false), gate = c.gate(false);
      const terminal = c.read(); terminal.state.phase = phase;
      if (append) terminal.records.push(sample("terminal", terminal.records.length + 1));
      c.deliver("progress", terminal); c.deliver("click", click); c.deliver("gate", gate);
      c.moveApi.resolve(); await drain(); expect(c.calls.move).toHaveLength(0); expect(c.calls.wheel).toHaveLength(0);
    });
  it.each(["complete", "disposed"])("keeps cached %s terminal while the shared move is pending", async (phase) => {
    const c = await wire(); await c.start(); const click = c.click(), gate = c.gate(); await drain(); c.bodyMove();
    const terminal = c.read(); terminal.state.phase = phase;
    c.deliver("progress", terminal); c.deliver("click", click); c.deliver("gate", gate);
    c.moveApi.resolve(); await drain(); expect(c.calls.move).toHaveLength(1); expect(c.calls.wheel).toHaveLength(0);
  });
  it("retains a newer failure and stops the pending move before old bindings arrive", async () => {
    const c = await wire(); await c.start(); const click = c.click(), gate = c.gate(); await drain(); c.bodyMove();
    c.capture("beforeunload"); c.deliver("click", click); c.deliver("gate", gate); c.moveApi.resolve();
    expect(await c.outcome()).toEqual(Error("unexpected beforeunload"));
    c.clickApi.resolve(); await c.finish(); expect(c.calls.wheel).toHaveLength(0);
    expect(c.saved[0].primary).toBe("unexpected beforeunload"); expect(c.saved[0].evidence!.state.phase).toBe("failed");
  });
  it.each(["page", "frame", "token", "document"])("rejects wrong %s before any move", async (wrong) => {
    const c = await wire(); await c.start(); const payload = c.click(false), source = { page: c.page, frame: c.frame };
    if (wrong === "page") source.page = {} as Page;
    if (wrong === "frame") source.frame = {};
    if (wrong === "token") payload.token = "other";
    if (wrong === "document") payload.state.initial!.documentId = "other";
    c.deliver("click", payload, source); await drain(); expect(await c.outcome()).toBeInstanceOf(Error);
    expect(c.calls.move).toHaveLength(0); expect(c.calls.wheel).toHaveLength(0);
  });
  it.each(["page", "frame", "token", "document"])("stops before wheel when gate has wrong %s", async (wrong) => {
    const c = await wire(); await c.start(); c.click(); await drain(); const payload = c.gate(false), source = { page: c.page, frame: c.frame };
    if (wrong === "page") source.page = {} as Page;
    if (wrong === "frame") source.frame = {};
    if (wrong === "token") payload.token = "other";
    if (wrong === "document") payload.state.initial!.documentId = "other";
    c.deliver("gate", payload, source); c.bodyMove(); c.moveApi.resolve(); await drain();
    expect(await c.outcome()).toBeInstanceOf(Error); expect(c.calls.wheel).toHaveLength(0);
  });
  it("propagates early move rejection even without a gate and saves the command", async () => {
    const c = await wire(); await c.start(); c.click(); await drain(); c.moveApi.reject(Error("body move rejected")); await drain();
    expect(c.observed()).toEqual(Error("body move rejected")); c.clickApi.resolve(); await c.finish();
    expect(c.calls.wheel).toHaveLength(0); expect(c.saved[0].primary).toBe("body move rejected");
    expect(c.saved[0].commands.some((entry) => entry.action === "move:error")).toBe(true);
  });
  it.each(["no-gate", "moving", "wheel-sent"])("requires original click API success even at %s", async (stage) => {
    const c = await wire(); await c.start(); c.click(); if (stage !== "no-gate") c.gate();
    await drain(); if (stage !== "no-gate") c.bodyMove();
    if (stage === "wheel-sent") { c.moveApi.resolve(); await drain(); c.wheel(); c.horizon(); }
    c.clickApi.reject(Error("original click rejected")); await drain(); c.moveApi.resolve();
    expect(await c.outcome()).toEqual(Error("original click rejected")); await c.finish();
    expect(c.saved[0].evidence!.state.phase).not.toBe("complete"); expect(c.calls.evaluate).not.toContain("final");
    expect(c.calls.wheel).toHaveLength(stage === "wheel-sent" ? 1 : 0);
  });
  it.each(["failed", "beforeunload", "timedOut", "close", "crash", "finish"])("stops inputs across a pending move on %s", async (boundary) => {
    const c = await wire(); await c.start(); const click = c.click(), gate = c.gate(); await drain(); c.bodyMove();
    let finishing: Promise<void> | undefined;
    if (boundary === "failed") { c.rules.fail("rule rejected"); c.deliver("failed"); }
    if (boundary === "beforeunload") c.capture("beforeunload");
    if (boundary === "timedOut") c.info.status = "timedOut";
    if (boundary === "close" || boundary === "crash") c.fake.emit(boundary);
    if (boundary === "finish") finishing = c.finish();
    c.moveApi.resolve(); c.clickApi.resolve(); c.deliver("click", click); c.deliver("gate", gate); await drain();
    expect(await c.outcome()).toBeInstanceOf(Error); if (finishing) await finishing; else await c.finish();
    expect(c.calls.wheel).toHaveLength(0); expect(c.saved).toHaveLength(1);
  });
  it.each(["close", "crash"])("cleans up no gate and indefinitely pending click/move on fixture %s", async (event) => {
    const c = await wire(); await c.start(); c.click(); await drain(); c.fake.emit(event);
    expect(await c.outcome()).toEqual(Error(`article page ${event === "close" ? "closed" : "crashed"}`));
    await c.finish(); expect(c.saved).toHaveLength(1); expect(c.calls.wheel).toHaveLength(0);
  });
  it("does not submit a queued early move after a synchronous terminal signal", async () => {
    const c = await wire(); await c.start(); c.click(); c.capture("beforeunload"); await drain();
    expect(c.calls.move).toHaveLength(0); expect(c.calls.wheel).toHaveLength(0);
  });
  it("keeps actual-wheel failure evidence when the next read sees a replacement document", async () => {
    const c = await wire(); await c.start(); c.click(); c.gate(); await drain(); c.bodyMove(); c.moveApi.resolve(); await drain();
    c.wheel({ headingTop: 300 }); c.clickApi.resolve();
    expect(await c.outcome()).toEqual(Error("invalid actual wheel precondition"));
    c.replaceDocument();
    await c.finish(); expect(c.saved[0].evidence!.state.failure).toBe("invalid actual wheel precondition");
    expect(c.saved[0].evidence!.records.at(-1)?.kind).toBe("wheel"); expect(c.saved[0].otherDocumentObservations).toHaveLength(1);
  });
  it("does not let duplicate gates substitute for a still-pending wheel API", async () => {
    const c = await wire(), pending = deferred(); cleanups.unshift(async () => { pending.resolve(); }); await c.start();
    c.operations.wheel = () => pending.promise;
    c.click(); const gate = c.gate(); await drain(); c.bodyMove(); c.moveApi.resolve(); await drain();
    c.wheel(); c.horizon(); c.clickApi.resolve(); c.deliver("gate", gate); await drain();
    expect(c.calls.evaluate).not.toContain("final");
    pending.reject(Error("late wheel API rejection")); await drain();
    expect(c.observed()).toEqual(Error("late wheel API rejection")); await c.finish();
  });
  it("preserves wheel API rejection and the original primary/secondary errors", async () => {
    const c = await wire(); await c.start();
    c.onWheel(() => { c.wheel({ trusted: false }); throw Error("wheel API rejected"); });
    c.click(); c.gate(); await drain(); c.bodyMove(); c.moveApi.resolve(); c.clickApi.resolve();
    expect(await c.outcome()).toEqual(Error("invalid actual wheel precondition")); await c.finish();
    expect(c.saved[0].secondaryErrors).toContain("wheel API rejected");
    expect(c.saved[0].commands.some((entry) => entry.action === "wheel:error")).toBe(true);
  });
  it("requires real capture, the 1500ms horizon, click success, and a fresh final in order", async () => {
    const c = await wire(); await c.start(); c.click(); c.gate(); await drain(); c.bodyMove(); c.moveApi.resolve(); await drain();
    expect(c.calls.wheel).toEqual([[0, -500]]); expect(c.calls.evaluate).toEqual(["arm"]);
    c.wheel(); c.horizon({ at: 1549 }); c.clickApi.resolve(); await drain();
    expect(c.calls.evaluate).toEqual(["arm", "clickSucceeded"]); expect(c.rules.state.horizon).toBeUndefined();
    c.horizon(); expect(await c.outcome()).toBeUndefined();
    expect(c.calls.evaluate).toEqual(["arm", "clickSucceeded", "final", "dispose"]);
    c.observer.read = () => { throw Error("next chapter must not overwrite evidence"); };
    await c.finish(); expect(c.saved[0].evidence!.state.phase).toBe("complete"); expect(c.saved[0].evidence!.state.clickSucceeded).toBe(true);
    expect(c.saved[0].evidence!.state.horizon!.at - c.saved[0].evidence!.state.wheel!.at).toBe(1500);
    expect(c.saved[0].secondaryErrors).toEqual([]);
  });
  it("keeps early move during fragment focus/restoration an original rule failure", async () => {
    const c = await wire(); await c.start(); c.click();
    const hash = `#${encodeURIComponent("芝浜")}`;
    c.capture("popstate", { at: 21, eventAt: 21, hash, historyState: false, historyNull: true, clickDispatch: true });
    c.capture("focusin", { at: 22, eventAt: 22, hash, focused: true, targetId: 1, activeId: 1, y: 1000, headingTop: 3000, clickDispatch: true });
    c.capture("pointermove", { at: 23, eventAt: 23, hash, target: "P#" });
    c.moveApi.resolve(); c.clickApi.resolve();
    expect(await c.outcome()).toEqual(Error("invalid initial fragment restoration")); await c.finish();
    expect(c.calls.wheel).toHaveLength(0);
  });
});
