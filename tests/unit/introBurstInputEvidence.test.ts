import type { Page, TestInfo } from "@playwright/test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { retainIntroBurstInputs } from "../support/intro-burst-input-evidence";

afterEach(() => vi.unstubAllGlobals());

function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (error: unknown) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

function fixture() {
  const inputs = [{ type: "wheel", at: 1750.25, trusted: true, cancelable: true, dy: 4, dx: 0, mode: 0 }];
  vi.stubGlobal("window", { __nextScrollInput: inputs });
  const saved: { name: string; body: unknown; contentType?: string }[] = [];
  const steps: string[] = [];
  let beforeRead = async () => {}, beforeAttach = async () => {};
  const page = {
    evaluate: async (read: () => unknown) => { steps.push("read"); await beforeRead(); return read(); },
  } as unknown as Page;
  const info: Pick<TestInfo, "attach" | "annotations"> = {
    annotations: [],
    attach: async (name, options = {}) => {
      steps.push("attach"); await beforeAttach();
      saved.push({ name, body: JSON.parse(String(options.body)), contentType: options.contentType });
    },
  };
  return { inputs, page, info, saved, steps,
    beforeRead: (callback: () => Promise<void>) => { beforeRead = callback; },
    beforeAttach: (callback: () => Promise<void>) => { beforeAttach = callback; } };
}

describe("continuous burst evidence retention", () => {
  it("keeps successful run steps and return value before saving the original DOM records", async () => {
    const f = fixture(), result = { completed: true };
    const actual = await retainIntroBurstInputs(f.page, f.info, async () => {
      f.steps.push("run:start"); await Promise.resolve(); f.steps.push("run:end"); return result;
    });
    expect(actual).toBe(result);
    expect(f.steps).toEqual(["run:start", "run:end", "read", "attach"]);
    expect(f.saved).toEqual([{ name: "actual-burst-inputs", body: f.inputs, contentType: "application/json" }]);
    expect(f.info.annotations).toEqual([]);
  });

  it("saves the recorded wheel when a pose assertion fails before the success attachment", async () => {
    const f = fixture(), primary = Error("expected hidden false, received true");
    const actual = await retainIntroBurstInputs(f.page, f.info, async () => { throw primary; }).catch(error => error);
    expect(actual).toBe(primary);
    expect(f.saved).toEqual([{ name: "actual-burst-inputs", body: f.inputs, contentType: "application/json" }]);
    expect(f.info.annotations).toEqual([]);
  });

  it("retains even an undefined original rejection without turning it into success", async () => {
    const f = fixture();
    const actual = await retainIntroBurstInputs(f.page, f.info, async () => { throw undefined; })
      .then(() => ({ resolved: true }), error => ({ rejected: true, error }));
    expect(actual).toEqual({ rejected: true, error: undefined });
    expect(f.saved[0]?.body).toEqual(f.inputs);
  });

  it("waits for a late read rejection and records it without replacing the original failure", async () => {
    const f = fixture(), late = deferred<void>(), readStarted = deferred<void>();
    void late.promise.catch(() => {});
    const primary = Error("original pose failure"), secondary = Error("page closed while reading");
    f.beforeRead(() => { readStarted.resolve(); return late.promise; });
    let settled = false;
    const outcome = retainIntroBurstInputs(f.page, f.info, async () => { throw primary; })
      .catch(error => error).finally(() => { settled = true; });
    await Promise.race([readStarted.promise, outcome]);
    expect.soft(settled).toBe(false);
    late.reject(secondary);
    expect(await outcome).toBe(primary);
    expect(f.saved).toEqual([]);
    expect(f.info.annotations).toEqual([{ type: "intro-burst-evidence-error", description: "read: Error: page closed while reading" }]);
  });

  it("waits for a late attachment rejection and records it without replacing the original failure", async () => {
    const f = fixture(), late = deferred<void>(), attachStarted = deferred<void>();
    void late.promise.catch(() => {});
    const primary = Error("original pose failure"), secondary = Error("attachment storage unavailable");
    f.beforeAttach(() => { attachStarted.resolve(); return late.promise; });
    let settled = false;
    const outcome = retainIntroBurstInputs(f.page, f.info, async () => { throw primary; })
      .catch(error => error).finally(() => { settled = true; });
    await Promise.race([attachStarted.promise, outcome]);
    expect.soft(settled).toBe(false);
    late.reject(secondary);
    expect(await outcome).toBe(primary);
    expect(f.info.annotations).toEqual([{ type: "intro-burst-evidence-error", description: "attach: Error: attachment storage unavailable" }]);
  });

  it.each(["read", "attach"] as const)("fails on a %s error when the run itself succeeded", async stage => {
    const f = fixture(), failure = Error(`${stage} unavailable`);
    const reject = async () => { throw failure; };
    if (stage === "read") f.beforeRead(reject); else f.beforeAttach(reject);
    const actual = await retainIntroBurstInputs(f.page, f.info, async () => "success").catch(error => error);
    expect(actual).toBe(failure);
    expect(f.info.annotations).toEqual([]);
  });

  it("rejects missing DOM records instead of saving invented empty evidence", async () => {
    const f = fixture(); vi.stubGlobal("window", {});
    await expect(retainIntroBurstInputs(f.page, f.info, async () => {}))
      .rejects.toThrow("intro burst input records unavailable");
    expect(f.saved).toEqual([]);
  });
});
