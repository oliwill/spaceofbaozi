import { afterEach, describe, expect, it } from "vitest";
import { createArticleCdpHarness, flushTasks, type ArticleCdpHarness } from "../support/article-cdp-test-harness";

const cleanups: ArticleCdpHarness[] = [];
afterEach(async () => { for (const harness of cleanups.splice(0)) await harness.cleanup(); });
async function started() {
  const harness = await createArticleCdpHarness(); cleanups.push(harness); await harness.start(); return harness;
}
async function moved() {
  const harness = await started(); harness.click(); await flushTasks(); return harness;
}

describe("CDP article fixture lifecycle contract", () => {
  it("preserves the full beforeunload failure after the document is replaced", async () => {
    const c = await moved();
    c.capture("beforeunload");
    expect(await c.outcome()).toEqual(Error("unexpected beforeunload"));
    c.replaceDocument(); c.settle(); await c.finish();
    expect(c.saved[0].evidence?.state.phase).toBe("failed");
    expect(c.saved[0].evidence?.records.some((record) => record.kind === "beforeunload")).toBe(true);
  });

  it("preserves an invalid actual wheel snapshot after the document is replaced", async () => {
    const c = await moved(); c.gate(); c.bodyMove(); c.moveApi.resolve(); await flushTasks();
    c.wheel({ headingTop: 300 });
    expect(await c.outcome()).toEqual(Error("invalid actual wheel precondition"));
    c.replaceDocument(); c.settle(); await c.finish();
    expect(c.saved[0].evidence?.state.failure).toBe("invalid actual wheel precondition");
    expect(c.saved[0].evidence?.records.at(-1)).toMatchObject({ kind: "wheel", trusted: true, headingTop: 300 });
  });

  it.each(["click", "move", "wheel"] as const)("finish waits for a late %s rejection before attaching errors", async (action) => {
    const c = await moved(); c.gate(); c.bodyMove();
    if (action !== "move") c.moveApi.resolve();
    if (action !== "click") c.clickApi.resolve();
    if (action !== "wheel") c.wheelApi.resolve();
    await flushTasks(); c.fail("first browser failure");
    expect(await c.outcome()).toEqual(Error("first browser failure"));
    let attached = false;
    const finishing = c.finish().then(() => { attached = true; });
    await flushTasks();
    expect.soft(attached).toBe(false);
    expect.soft(c.saved).toHaveLength(0);
    const pending = action === "click" ? c.clickApi : action === "move" ? c.moveApi : c.wheelApi;
    pending.reject(Error(`late ${action} rejection`));
    await finishing;
    expect(c.saved).toHaveLength(1);
    expect(c.saved[0].primary).toBe("first browser failure");
    expect(c.saved[0].secondaryErrors).toContain(`late ${action} rejection`);
    const commands = action === "click" ? ["click:error"] : [`${action}:error`, `cdp-${action}:error`];
    expect(c.saved[0].commands.some((entry) => commands.includes(entry.action) && entry.error?.includes(`late ${action} rejection`))).toBe(true);
  });

  it.each(["close", "crash"])("finish escapes permanently pending click and move when the fixture emits %s", async (event) => {
    const c = await moved();
    c.fake.emit(event);
    expect(await c.outcome()).toEqual(Error(`article page ${event === "close" ? "closed" : "crashed"}`));
    await c.finish();
    expect(c.saved).toHaveLength(1); expect(c.calls.move).toHaveLength(1); expect(c.calls.wheel).toHaveLength(0);
    expect(c.calls.detach).toBe(1);
    expect(c.fake.listenerCount("close")).toBe(0); expect(c.fake.listenerCount("crash")).toBe(0);
  });

  it("requires the same move ACK after actual prose movement and gate before sending wheel", async () => {
    const c = await moved(); c.gate(); c.bodyMove(); await flushTasks();
    expect.soft(c.calls.wheel).toHaveLength(0);
    c.moveApi.resolve(); await flushTasks();
    expect(c.calls.move).toEqual([[1000, 500]]); expect(c.calls.wheel).toEqual([[0, -500]]);
  });

  it("requires actual prose movement even when the move ACK and gate have arrived", async () => {
    const c = await moved(); c.moveApi.resolve(); c.gate(); await flushTasks();
    expect(c.calls.wheel).toHaveLength(0);
    c.bodyMove(); await flushTasks(); expect(c.calls.wheel).toEqual([[0, -500]]);
  });

  it("uses the accepted click witness when gate arrives without the click notification", async () => {
    const c = await started(); const click = c.click(false), gate = c.gate(false);
    c.deliver("gate", gate); await flushTasks();
    expect.soft(c.calls.move).toEqual([[1000, 500]]);
    c.bodyMove(); c.moveApi.resolve(); await flushTasks();
    expect.soft(c.calls.wheel).toEqual([[0, -500]]);
    c.deliver("click", click); c.deliver("gate", gate); await flushTasks();
    expect(c.calls.move).toHaveLength(1); expect(c.calls.wheel).toHaveLength(1);
  });

  it.each([undefined, 0, -1, 1.5, 99])("rejects a gate with invalid accepted click witness %s", async (clickSeq) => {
    const c = await started(); c.click(false); const payload = c.gate(false);
    const signal = c.milestone("gate", payload); signal.clickSeq = clickSeq;
    c.deliverMilestone(signal); await flushTasks();
    expect(c.calls.move).toHaveLength(0); expect(c.calls.wheel).toHaveLength(0);
    expect(c.observed()).toBeInstanceOf(Error);
  });

  it.each(["complete", "disposed"] as const)("does not revive cached %s after stale click, gate, and input-ready", async (phase) => {
    const c = await started(); const click = c.click(false), gate = c.gate(false);
    c.bodyMove(false); const ready = c.read();
    c.terminal(phase);
    c.deliver("click", click); c.deliver("gate", gate); c.deliver("input-ready", ready);
    c.moveApi.resolve(); await flushTasks();
    expect.soft(c.calls.move).toHaveLength(0); expect.soft(c.calls.wheel).toHaveLength(0);
    c.settle(); await c.finish();
    expect(c.saved[0].evidence?.state.phase).toBe(phase);
  });

  it.each(["complete", "disposed"] as const)("retains %s and cancels wheel when terminal arrives during the shared move", async (phase) => {
    const c = await moved(); c.gate(); c.bodyMove(); c.terminal(phase);
    c.moveApi.resolve(); await flushTasks();
    expect(c.calls.move).toHaveLength(1); expect.soft(c.calls.wheel).toHaveLength(0);
    c.settle(); await c.finish();
    expect(c.saved[0].evidence?.state.phase).toBe(phase);
  });

  it("does not downgrade or shorten cached failure when a stale same-document snapshot arrives", async () => {
    const c = await moved(); const stale = c.read(); c.capture("beforeunload");
    expect(await c.outcome()).toEqual(Error("unexpected beforeunload"));
    c.deliver("progress", stale);
    c.observer.dispose = () => stale;
    c.settle(); await c.finish();
    expect(c.saved[0].evidence?.state.phase).toBe("failed");
    expect(c.saved[0].evidence?.records.at(-1)?.kind).toBe("beforeunload");
  });

  it("cancels an unsubmitted move when a terminal signal follows click synchronously", async () => {
    const c = await started(); c.click(); c.capture("beforeunload"); await flushTasks();
    expect(await c.outcome()).toEqual(Error("unexpected beforeunload"));
    expect(c.calls.move).toHaveLength(0); expect(c.calls.wheel).toHaveLength(0);
  });

  it("still requires capture, original click success, full horizon, and a fresh final", async () => {
    const c = await moved(); c.gate(); c.bodyMove(); c.moveApi.resolve(); await flushTasks();
    c.wheelApi.resolve(); c.wheel(); c.horizon({ at: 1549 }); c.clickApi.resolve(); await flushTasks();
    expect(c.observed()).toBeUndefined(); expect(c.calls.evaluate).not.toContain("final");
    c.horizon(); await c.outcome(); await c.finish();
    expect(c.saved[0].evidence?.state.phase).toBe("complete");
    expect(c.saved[0].evidence?.state.clickSucceeded).toBe(true);
    expect(c.saved[0].evidence!.state.horizon!.at - c.saved[0].evidence!.state.wheel!.at).toBe(1500);
    expect(c.calls.evaluate).toContain("final");
  });
});
