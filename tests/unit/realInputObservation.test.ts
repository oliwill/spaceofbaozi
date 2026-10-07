import { describe, expect, it } from "vitest";
import {
  observeArticleInput, createArticleRules, homeProvenanceError, orderedTargetChanges, createOneShotInput,
  type ArticleRecord, type HomeRecord,
} from "../support/real-input-observation";
import { createArticleCdpHarness } from "../support/article-cdp-test-harness";

const sample = (kind: string, overrides: Partial<ArticleRecord> = {}): ArticleRecord => ({
  kind, seq: 1, at: 10, documentId: "doc", headingId: 1, pathname: "/blog/test", hash: "", y: 0,
  headingTop: 4000, safeOffset: 120, smooth: false, focused: false, reduced: false, active: "body",
  target: "link", trusted: true, button: 0, buttons: 0, modified: false,
  url: "https://baozi.test/blog/test", activeId: 2, targetId: 2, ...overrides,
});
function gate() {
  const rules = createArticleRules();
  rules.accept(sample("arm"));
  rules.accept(sample("pointerdown", { seq: 2 }));
  rules.accept(sample("mouseup", { seq: 3 }));
  rules.accept(sample("click", { seq: 4, at: 20 }));
  rules.accept(sample("raf", { seq: 5, at: 30, y: 60, headingTop: 3940, smooth: true }));
  rules.accept(sample("raf", { seq: 6, at: 40, y: 150, headingTop: 3850, smooth: true }));
  return rules;
}
const wheel = (overrides: Partial<ArticleRecord> = {}) => sample("wheel", {
  seq: 7, at: 50, y: 200, headingTop: 3800, smooth: true, target: "main", deltaX: 0, deltaY: -500,
  deltaMode: 0, ...overrides,
});
const deadline = (overrides: Partial<ArticleRecord> = {}) => sample("raf", {
  seq: 8, at: 1550, y: 90, headingTop: 3910, ...overrides,
});

describe("article real-input evidence", () => {
  it("requires two post-click forward RAF samples before gating", () => {
    const trial = gate();
    expect(trial.state.phase).toBe("gate-sent");
    expect(trial.state.gate?.map((r) => r.seq)).toEqual([5, 6]);
  });
  it.each([
    { trusted: false }, { deltaY: -499 }, { deltaX: 1 }, { deltaMode: 1 }, { modified: true },
    { documentId: "other" }, { headingId: 2 }, { y: NaN }, { y: 100 }, { headingTop: 300 },
    { headingTop: 120.796875 }, { smooth: false }, { focused: true },
  ])("rejects actual wheel precondition %j even after a good gate", (change) => {
    const trial = gate(); trial.accept(wheel(change));
    expect(trial.state.phase).toBe("failed");
    expect(trial.state.failure).toBeTruthy();
  });
  it("rejects wheel before the real click", () => {
    const trial = createArticleRules(); trial.accept(sample("arm")); trial.accept(wheel());
    expect(trial.state.phase).toBe("failed");
  });
  it.each(["pointerdown", "touchstart", "keydown", "click"])("rejects extra %s including synthetic input", (kind) => {
    const trial = gate(); trial.accept(sample(kind, { seq: 7, trusted: false }));
    expect(trial.state.phase).toBe("failed");
  });
  it("rejects a second wheel", () => {
    const trial = gate(); trial.accept(wheel()); trial.accept(wheel({ seq: 8 }));
    expect(trial.state.phase).toBe("failed");
  });
  it("never completes a horizon early", () => {
    const trial = gate(); trial.accept(wheel()); trial.accept(deadline({ at: 1549 }));
    expect(trial.state.horizon).toBeUndefined();
    trial.accept(deadline()); expect(trial.state.horizon?.at).toBe(1550);
  });
  it.each([{ y: 100 }, { headingTop: 300 }, { focused: true }])("cannot replace a bad horizon with a good final: %j", (change) => {
    const trial = gate(); trial.accept(wheel()); trial.accept(deadline(change));
    trial.accept(sample("final", { seq: 9, at: 1600, y: 80 }));
    expect(trial.state.phase).toBe("failed");
  });
  it("cannot mask a failed original click with valid wheel and horizon", () => {
    const trial = gate(); trial.accept(wheel()); trial.accept(deadline()); trial.fail("click rejected");
    trial.accept(sample("final", { at: 1600, y: 80 }));
    expect(trial.state.failure).toBe("click rejected");
  });
  it("requires successful original click before a fresh final", () => {
    const trial = gate(); trial.accept(wheel()); trial.accept(deadline());
    trial.accept(sample("final", { at: 1600, y: 80 }));
    expect(trial.state.phase).toBe("failed");
  });
  it("retains the full horizon and final snapshots on success", () => {
    const trial = gate(); trial.accept(wheel()); trial.clickSucceeded(); trial.accept(deadline());
    trial.accept(sample("final", { seq: 9, at: 1600, y: 80 }));
    expect(trial.state.phase).toBe("complete");
    expect(trial.state.horizon?.at).toBe(1550); expect(trial.state.final?.at).toBe(1600);
  });
  it.each(["astro:before-preparation", "astro:before-swap", "beforeunload", "popstate", "hashchange"])("rejects unexpected %s after a good gate", (kind) => {
    const trial = gate(); trial.accept(sample(kind, { hash: "#other" }));
    expect(trial.state.phase).toBe("failed");
  });
  it("rejects a same-document wrong hash seen only on RAF", () => {
    const trial = gate(); trial.accept(sample("raf", { hash: "#other" }));
    expect(trial.state.phase).toBe("failed");
  });
  it("rejects trusted history traversal even to the expected hash", () => {
    const trial = gate(); trial.accept(sample("popstate", { hash: `#${encodeURIComponent("芝浜")}` }));
    expect(trial.state.phase).toBe("failed");
  });
  it("rejects transient target focus even if focus later moves away", () => {
    const trial = gate(); trial.accept(wheel()); trial.accept(sample("focusin", { focused: true }));
    expect(trial.state.phase).toBe("failed");
  });
  it.each(["failed", "disposed"])("cannot resurrect a %s trial", (phase) => {
    const trial = gate(); if (phase === "failed") trial.fail("failure"); else trial.dispose();
    trial.accept(wheel()); expect(trial.state.phase).toBe(phase);
  });
});

// D-150：v16 生产附件 seq1–20 的最小原始投影，仅重放诊断前缀，不证明真实 wheel。
const measuredFragmentPrefix = (): ArticleRecord[] => [
    {"kind": "arm", "seq": 1, "at": 228.59999990463257, "hash": ""},
    {"kind": "raf", "seq": 2, "at": 230.2999997138977, "hash": ""},
    {"kind": "raf", "seq": 3, "at": 237.40000009536743, "hash": ""},
    {"kind": "raf", "seq": 4, "at": 247, "hash": ""},
    {"kind": "raf", "seq": 5, "at": 254.09999990463257, "hash": ""},
    {"kind": "pointermove", "seq": 6, "at": 258.2999997138977, "hash": "", "target": "link", "trusted": true, "button": -1, "buttons": 0, "eventAt": 257.69999980926514},
    {"kind": "pointerdown", "seq": 7, "at": 258.90000009536743, "hash": "", "target": "link", "trusted": true, "button": 0, "buttons": 1, "eventAt": 257.7999997138977},
    {"kind": "focusin", "seq": 8, "at": 259.2999997138977, "hash": "", "active": "A#", "target": "link", "trusted": true, "eventAt": 259.2999997138977},
    {"kind": "mouseup", "seq": 9, "at": 259.69999980926514, "hash": "", "active": "A#", "target": "link", "trusted": true, "button": 0, "buttons": 0, "eventAt": 257.90000009536743},
    {"kind": "click", "seq": 10, "at": 259.90000009536743, "hash": "", "active": "A#", "target": "link", "trusted": true, "button": 0, "buttons": 0, "eventAt": 257.90000009536743},
    {"kind": "popstate", "seq": 11, "at": 260.90000009536743, "hash": "#%E8%8A%9D%E6%B5%9C", "active": "A#", "trusted": true, "historyState": false, "eventAt": 260.90000009536743},
    {"kind": "focusin", "seq": 12, "at": 261.2999997138977, "hash": "#%E8%8A%9D%E6%B5%9C", "y": 2889, "headingTop": 491.796875, "focused": true, "active": "H2#芝浜", "target": "H2#芝浜", "trusted": true, "eventAt": 261.2999997138977},
    {"kind": "focusin", "seq": 13, "at": 262.19999980926514, "hash": "#%E8%8A%9D%E6%B5%9C", "active": "A#", "target": "link", "trusted": true, "eventAt": 262.19999980926514},
    {"kind": "scroll", "seq": 14, "at": 295.19999980926514, "hash": "#%E8%8A%9D%E6%B5%9C", "smooth": true, "active": "A#", "trusted": true, "eventAt": 261.2999997138977},
    {"kind": "raf", "seq": 15, "at": 296.5, "hash": "#%E8%8A%9D%E6%B5%9C", "smooth": true, "active": "A#"},
    {"kind": "scroll", "seq": 16, "at": 298.09999990463257, "hash": "#%E8%8A%9D%E6%B5%9C", "y": 726, "headingTop": 2654.796875, "smooth": true, "active": "A#", "trusted": true, "eventAt": 296.59999990463257},
    {"kind": "raf", "seq": 17, "at": 298.69999980926514, "hash": "#%E8%8A%9D%E6%B5%9C", "y": 726, "headingTop": 2654.796875, "smooth": true, "active": "A#"},
    {"kind": "raf", "seq": 18, "at": 305.40000009536743, "hash": "#%E8%8A%9D%E6%B5%9C", "y": 726, "headingTop": 2654.796875, "smooth": true, "active": "A#"},
    {"kind": "scroll", "seq": 19, "at": 313.7999997138977, "hash": "#%E8%8A%9D%E6%B5%9C", "y": 874, "headingTop": 2506.796875, "smooth": true, "active": "A#", "trusted": true, "eventAt": 305.69999980926514},
    {"kind": "raf", "seq": 20, "at": 314.59999990463257, "hash": "#%E8%8A%9D%E6%B5%9C", "y": 874, "headingTop": 2506.796875, "smooth": true, "active": "A#"},
  ].map((r) => ({
    "documentId": "1791116597190.3:article-834e4915e877e76ae051-4aa110f32516c2eeefea", "headingId": 1, "pathname": "/blog/ryoutei-menu-05", "y": 0, "headingTop": 3380.796875, "safeOffset": 120.390625, "smooth": false, "focused": false, "reduced": false, "active": "BODY#", "target": "none#", "modified": false, ...r,
  }));
const fragmentPrefix = () => measuredFragmentPrefix().map((r) => ({ ...r,
  // D-150：以下见证为单元模型，v16 未采集，必须由新 Mac 实测确认。
  url: `https://baozi.test${r.pathname}`, activeId: r.focused ? 1 : r.active === "A#" ? 2 : 3,
  targetId: r.target === "link" ? 2 : r.focused ? 1 : 0,
  clickDispatch: r.seq === 11 || r.seq === 12, ...(r.kind === "popstate" ? { historyNull: true } : {}),
}));
function replayFragment(records: ArticleRecord[] = fragmentPrefix()) {
  const trial = createArticleRules();
  for (const record of records) trial.accept(record);
  return trial;
}

describe("bounded initial fragment preparation", () => {
  it("replays the whole measured prefix with explicitly modeled witnesses to gate [18, 20]", () => {
    const trial = replayFragment();
    expect(trial.state.failure).toBeUndefined();
    expect(trial.state.gate?.map((r) => r.seq)).toEqual([18, 20]);
    expect(trial.state.wheel).toBeUndefined();
  });
  it("does not invent missing witnesses in historic raw records", () => {
    expect(replayFragment(measuredFragmentPrefix()).state.phase).toBe("failed");
  });
  it("allows the same witnessed fragment without an observed native focus pair", () => {
    expect(replayFragment(fragmentPrefix().filter((r) => r.seq !== 12 && r.seq !== 13)).state.phase).toBe("gate-sent");
  });
  it("keeps the preparatory native focus out of the gate", () => {
    const trial = replayFragment(fragmentPrefix().slice(0, 12));
    expect(trial.state.phase).toBe("clicked"); expect(trial.state.gate).toBeUndefined(); expect(trial.state.wheel).toBeUndefined();
  });
  it.each([
    { historyState: undefined }, { historyState: true }, { historyNull: undefined }, { historyNull: false },
    { trusted: false }, { clickDispatch: undefined }, { clickDispatch: false }, { modified: true },
    { activeId: 99 }, { focused: true }, { smooth: true }, { y: 1 }, { headingTop: 3000 },
    { seq: 10 }, { at: 250 }, { eventAt: 250 }, { eventAt: 258 }, { eventAt: 262 }, { eventAt: undefined },
    { hash: "#other" }, { pathname: "/other" }, { documentId: "other" }, { headingId: 99 },
    { url: "https://other.test/blog/ryoutei-menu-05" }, { url: "https://baozi.test/blog/ryoutei-menu-05?other" },
  ])("rejects unknown, stale, traversed or mismatched initial history: %j", (change) => {
    const records = fragmentPrefix(); Object.assign(records[10], change);
    expect(replayFragment(records).state.phase).toBe("failed");
  });
  it.each(["back", "forward"])("rejects same-hash null-state %s after original dispatch, even before a RAF", () => {
    const records = fragmentPrefix(); records[10].clickDispatch = false;
    expect(replayFragment(records).state.failure).toBe("unexpected history interrupt");
  });
  it.each([
    { targetId: 99 }, { activeId: 99 }, { clickDispatch: false }, { trusted: false },
    { smooth: true }, { seq: 11 }, { at: 250 }, { eventAt: 250 }, { modified: true }, { y: 0 },
  ])("rejects invalid native anchor focus: %j", (change) => {
    const records = fragmentPrefix(); Object.assign(records[11], change);
    expect(replayFragment(records).state.phase).toBe("failed");
  });
  it.each([
    { targetId: 99 }, { activeId: 99 }, { target: "other" }, { focused: true }, { smooth: true },
    { trusted: false }, { y: 1 }, { headingTop: 3381 }, { seq: 12 }, { at: 250 }, { eventAt: 250 },
  ])("requires explicit original trigger and geometry restoration: %j", (change) => {
    const records = fragmentPrefix(); Object.assign(records[12], change);
    expect(replayFragment(records).state.phase).toBe("failed");
  });
  it.each([10, 11, 12])("rejects the unpaired sequence with source index %s missing", (index) => {
    const records = fragmentPrefix(); records.splice(index, 1);
    expect(replayFragment(records).state.phase).toBe("failed");
  });
  it.each([10, 11, 12])("rejects duplicated history/focus preparation index %s", (index) => {
    const records = fragmentPrefix(); records.splice(index + 1, 0, { ...records[index], seq: records[index].seq + .5 });
    expect(replayFragment(records).state.phase).toBe("failed");
  });
  it.each([0, 10, 13, 14, 15, 20])("rejects a misplaced history event after %s prefix records", (count) => {
    const records = fragmentPrefix(), unexpected = { ...records[10], seq: 100, at: 400, eventAt: 400 };
    const trial = replayFragment(records.slice(0, count));
    if (count === 10) trial.accept({ ...records[14], seq: 99, at: 350 });
    trial.accept(unexpected); expect(trial.state.phase).toBe("failed");
  });
  it.each(["hashchange", "pointerdown", "touchstart", "keydown", "click", "astro:before-preparation", "beforeunload"])("rejects %s during preparation", (kind) => {
    const records = fragmentPrefix(); records.splice(11, 0, { ...records[10], kind, seq: 11.5 });
    expect(replayFragment(records).state.phase).toBe("failed");
  });
  it.each([13, 14, 15, 20])("never exempts target focus after restoration/smooth/gate: %s", (count) => {
    const records = fragmentPrefix(), trial = replayFragment(records.slice(0, count));
    trial.accept({ ...records[11], seq: 100, at: 400, eventAt: 400 });
    expect(trial.state.failure).toBe("missed smooth interruption window");
  });
  it("still fails when the first post-preparation RAF misses the smooth window", () => {
    const records = fragmentPrefix(); records[14].headingTop = 300;
    expect(replayFragment(records).state.failure).toBe("missed smooth interruption window");
  });
  it.each([false, true])("keeps a complete modeled wheel/horizon/final sequence strict, extra history=%s", (extraHistory) => {
    const records = fragmentPrefix(), trial = replayFragment(records);
    const event = (kind: string, seq: number, at: number, y: number) => ({ ...records[19], kind, seq, at, y,
      headingTop: records[0].headingTop - y, smooth: false, target: "none#", eventAt: at });
    trial.accept({ ...event("wheel", 21, 400, 1000), smooth: true, trusted: true, buttons: 0, deltaX: 0, deltaY: -500, deltaMode: 0 });
    trial.clickSucceeded(); trial.accept(event("raf", 22, 1899, 700)); expect(trial.state.horizon).toBeUndefined();
    trial.accept(event("raf", 23, 1900, 700)); expect(trial.state.horizon?.at).toBe(1900);
    if (extraHistory) trial.accept({ ...records[10], seq: 24, at: 1910, eventAt: 1910 });
    trial.accept(event("final", 25, 1950, 700));
    expect(trial.state.phase).toBe(extraHistory ? "failed" : "complete");
  });
  it("rejects same-hash history immediately after the actual wheel", () => {
    const records = fragmentPrefix(), trial = replayFragment(records);
    trial.accept({ ...records[19], kind: "wheel", seq: 21, at: 400, trusted: true, buttons: 0, deltaX: 0, deltaY: -500, deltaMode: 0 });
    expect(trial.state.phase).toBe("wheel-captured");
    trial.accept({ ...records[10], seq: 22, at: 401, eventAt: 401 });
    expect(trial.state.failure).toBe("unexpected history interrupt");
  });
  it("rejects target focus after the actual wheel in modeled preparation", () => {
    const records = fragmentPrefix(), trial = replayFragment(records), at = 400;
    trial.accept({ ...records[19], ...wheel(), documentId: records[0].documentId, pathname: records[0].pathname,
      url: records[0].url, hash: records[19].hash, seq: 21, at });
    expect(trial.state.phase).toBe("wheel-captured");
    trial.accept({ ...records[11], seq: 22, at: at + 1, eventAt: at + 1 });
    expect(trial.state.failure).toBe("target focused after interruption");
  });

});

const home = (kind: string, seq: number, overrides: Partial<HomeRecord> = {}): HomeRecord => ({
  kind, seq, at: seq, root: 1, documentId: "doc", value: 1, trusted: true, rootTarget: true,
  withinRoot: true, receivedByRoot: true, pointerType: "mouse", focused: true, key: "ArrowRight", repeat: false, ...overrides,
});
const homeRecords = () => [home("mount", 1), home("pointermove", 2), home("target", 3, { before: .5, value: 1 }),
  home("baseline", 4), home("keydown", 5), home("target", 6, { before: 1, value: 1 + Math.PI / 12 })];

describe("home combined-input provenance", () => {
  it("accepts exactly one trusted mouse-derived 15-degree step", () => {
    expect(homeProvenanceError(homeRecords(), 1 + Math.PI / 12)).toBeNull();
  });
  it.each([Math.PI / 6, .1])("rejects changed but non-15-degree target %s", (delta) => {
    expect(homeProvenanceError(homeRecords(), 1 + delta)).toBeTruthy();
  });
  it.each([
    { trusted: false }, { repeat: true }, { focused: false }, { withinRoot: false },
    { key: "ArrowLeft" }, { value: .6 }, { documentId: "wrong" }, { root: 2 },
  ])("rejects bad key provenance %j", (change) => {
    const records = homeRecords(); records[4] = home("keydown", 5, change);
    expect(homeProvenanceError(records, 1 + Math.PI / 12)).toBeTruthy();
  });
  it("does not misclassify a descendant leave as the root leave", () => {
    const records = homeRecords(); records.splice(4, 0, home("pointerleave", 4.5, { rootTarget: false }));
    expect(homeProvenanceError(records, 1 + Math.PI / 12)).toBeNull();
  });
  it.each([true, false])("rejects root mouse leave even when trusted=%s", (trusted) => {
    const records = homeRecords(); records.splice(1, 0, home("pointerleave", 1.5, { trusted }));
    expect(homeProvenanceError(records, 1 + Math.PI / 12)).toBeTruthy();
  });
  it.each(["pointermove", "keydown", "handoff", "reset", "mount", "target"])("rejects %s between baseline and key", (kind) => {
    const records = homeRecords(); records.splice(4, 0, home(kind, 4.5, { trusted: false, before: 1, value: 2 }));
    expect(homeProvenanceError(records, 1 + Math.PI / 12)).toBeTruthy();
  });
  it.each(["handoff", "reset", "target"])("rejects %s after mouse render but before the saved baseline", (kind) => {
    const records = homeRecords();
    records.splice(3, 0, home(kind, 3.5, { before: 1, value: 2 }));
    records[4].value = 2; records[5].value = 2; records[6].before = 2; records[6].value = 2 + Math.PI / 12;
    expect(homeProvenanceError(records, 2 + Math.PI / 12)).toBeTruthy();
  });
  it("preserves the modulo wraparound exact step", () => {
    const records = homeRecords(), value = Math.PI * 2 - .1, target = (value + Math.PI / 12) % (Math.PI * 2);
    for (const r of records) { if (r.value === 1) r.value = value; if (r.before === 1) r.before = value; }
    records[5].value = target;
    expect(homeProvenanceError(records, target)).toBeNull();
  });
  it("ignores equal finite render rewrites", () => {
    const records = homeRecords(); records.splice(4, 0, home("target", 4.5, { before: 1, value: 1 }));
    expect(homeProvenanceError(records, 1 + Math.PI / 12)).toBeNull();
  });
  it("keeps intermediate ordered changes even if final returns to baseline", () => {
    expect(orderedTargetChanges(["1", "2", "2"], "1")).toEqual([
      { before: 1, value: 2, changed: true }, { before: 2, value: 2, changed: false }, { before: 2, value: 1, changed: true },
    ]);
  });
  it("rejects missing/nonfinite target writes", () => {
    expect(() => orderedTargetChanges([null], "1")).toThrow();
    expect(() => orderedTargetChanges(["NaN"], "1")).toThrow();
  });
});

describe("one-shot real input lifecycle", () => {
  it("issues exactly one wheel after one move", async () => {
    const calls: string[] = []; const input = createOneShotInput();
    await input.run(async () => { calls.push("move"); }, async () => { calls.push("wheel"); });
    await input.run(async () => { calls.push("extra"); }, async () => { calls.push("extra"); });
    expect(calls).toEqual(["move", "wheel"]);
  });
  it("does not issue a late wheel after failure during awaited move", async () => {
    let release!: () => void; let wheels = 0; const input = createOneShotInput();
    const running = input.run(() => new Promise<void>((resolve) => { release = resolve; }), async () => { wheels++; });
    input.stop(); release(); await running; expect(wheels).toBe(0);
  });
  it("ignores a queued binding after terminal failure", async () => {
    const input = createOneShotInput(); input.stop(); let calls = 0;
    await input.run(async () => { calls++; }, async () => { calls++; }); expect(calls).toBe(0);
  });
  it("propagates move rejection and prevents wheel", async () => {
    const input = createOneShotInput(); let calls = 0;
    await expect(input.run(async () => { throw Error("move failed"); }, async () => { calls++; })).rejects.toThrow("move failed");
    expect(calls).toBe(0);
  });
});


async function coordinator() {
  // D-150：协调断言直接覆盖 CDP 路径，移动捕获与命令回执保持独立。
  const c = await createArticleCdpHarness(observeArticleInput);
  c.moveApi.resolve(); c.wheelApi.resolve(); c.onMove(() => { c.bodyMove(); });
  const gate = () => { c.click(false); c.gate(false); c.deliver("gate"); };
  const captureWheelAndHorizon = () => { c.wheel(); c.horizon(); };
  const navigateAway = () => { c.capture("beforeunload"); };
  return { ...c, gate, captureWheelAndHorizon, navigateAway,
    counts: () => ({ moves: c.calls.move.length, wheels: c.calls.wheel.length }) };
}

describe("article coordinator terminal paths (no browser)", () => {
  it("retains completed trial evidence if the next chapter replaces the document", async () => {
    const c = await coordinator();
    c.operations.wheel = async () => { c.captureWheelAndHorizon(); };
    const result = await c.observation.run(async () => { c.gate(); });
    expect(result).toBeUndefined();
    c.replaceDocument(); await c.observation.finish({ nextChapter: "done" });
    expect(c.attachmentNames).toEqual(["article-real-input-observation"]);
    expect(c.saved[0]).toMatchObject({ transport: "cdp" });
    const attachment = c.attachments[0] as { body: string };
    const saved = JSON.parse(attachment.body) as { evidence: { state: { phase: string }; records: unknown[] } };
    expect(saved.evidence.state.phase).toBe("complete"); expect(saved.evidence.records.length).toBeGreaterThan(0);
  });
  it("retains failed-navigation evidence when cleanup sees an inactive replacement", async () => {
    const c = await coordinator();
    await expect(c.observation.run(async () => { c.navigateAway(); })).rejects.toThrow("unexpected beforeunload");
    c.replaceDocument(); await c.observation.finish({});
    const saved = JSON.parse((c.attachments[0] as { body: string }).body) as { evidence: { state: { phase: string }; records: ArticleRecord[] } };
    expect(saved.evidence.state.phase).toBe("failed");
    expect(saved.evidence.records.some((r) => r.kind === "beforeunload")).toBe(true);
  });
  it("terminalizes a rejected original click without a gate and ignores queued gates", async () => {
    const c = await coordinator();
    await expect(c.observation.run(async () => { throw Error("original click rejected"); })).rejects.toThrow("original click rejected");
    c.gate(); await c.observation.finish({});
    expect(c.counts()).toEqual({ moves: 0, wheels: 0 }); expect(c.attachments).toHaveLength(1);
  });
  it("terminalizes no gate plus a hanging click when the original fixture closes", async () => {
    const c = await coordinator(); let rejectClick!: (error: Error) => void, began!: () => void;
    const begun = new Promise<void>((resolve) => { began = resolve; });
    const running = c.observation.run(() => { began(); return new Promise<void>((_resolve, reject) => { rejectClick = reject; }); });
    const result = expect(running).rejects.toThrow("article page closed");
    await begun; c.fake.emit("close"); rejectClick(Error("fixture cancelled click"));
    await result; await c.observation.finish({}); expect(c.counts()).toEqual({ moves: 0, wheels: 0 });
  });
  it("terminalizes a successful click with no gate at timeout and fixture closure", async () => {
    const c = await coordinator(); let began!: () => void;
    const begun = new Promise<void>((resolve) => { began = resolve; });
    const running = c.observation.run(async () => { began(); });
    const result = running.catch((error: unknown) => error);
    await begun; await new Promise<void>((resolve) => setImmediate(resolve));
    c.info.status = "timedOut"; c.fake.emit("close");
    expect(await result).toBeInstanceOf(Error); await c.observation.finish({});
    expect(c.counts()).toEqual({ moves: 0, wheels: 0 }); expect(c.attachments).toHaveLength(1);
  });
  it("does not send a wheel when the public test deadline status changes during move", async () => {
    const c = await coordinator(); let release!: () => void, began!: () => void;
    const begun = new Promise<void>((resolve) => { began = resolve; });
    c.operations.move = () => { began(); return new Promise<void>((resolve) => { release = resolve; }); };
    const running = c.observation.run(async () => { c.gate(); });
    const result = running.catch((error: unknown) => error);
    await begun; c.info.status = "timedOut"; release();
    await new Promise<void>((resolve) => setImmediate(resolve));
    const count = c.counts().wheels;
    c.fake.emit("close"); await result; await c.observation.finish({});
    expect(count).toBe(0);
  });
});
