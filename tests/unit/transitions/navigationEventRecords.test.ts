import { describe, expect, it } from "vitest";
import {
  hasBlogPreparation, isBackPaperExitStart,
  type PaperExitAnimationRecord, type PreparationRecord,
} from "../../support/navigation-event-records";

const preparation = (overrides: Partial<PreparationRecord> = {}): PreparationRecord => ({
  type: "astro:before-preparation", pathname: "/blog", ...overrides,
});
const exitStart = (overrides: Partial<PaperExitAnimationRecord> = {}): PaperExitAnimationRecord => ({
  type: "animationstart", animationName: "paper-exit-move", pseudoElement: "", isTrusted: true,
  targetIsExit: true, direction: "back", computedAnimationName: "paper-exit-move, paper-exit-fade",
  durationMs: 600, ...overrides,
});

describe("Blog preparation records", () => {
  it("rejects missing preparation", () => {
    expect(hasBlogPreparation([])).toBe(false);
  });

  it.each(["/photos", "/projects/example", "/blog/example", "/blog/", null])("rejects preparation for %s", (pathname) => {
    expect(hasBlogPreparation([preparation({ pathname })])).toBe(false);
  });

  it("rejects the wrong lifecycle event even at the correct destination", () => {
    expect(hasBlogPreparation([preparation({ type: "astro:after-swap" })])).toBe(false);
  });

  it("accepts exact Blog preparation after an unrelated preparation", () => {
    expect(hasBlogPreparation([preparation({ pathname: "/projects/example" }), preparation()])).toBe(true);
  });

  it("retains copied preparation evidence when the source event changes", () => {
    const source = preparation();
    const records = [{ ...source }];
    source.pathname = null;
    expect(hasBlogPreparation(records)).toBe(true);
    expect(hasBlogPreparation([source])).toBe(false);
  });
});

describe("back paper-exit animation records", () => {
  it("rejects missing animation evidence instead of passing an empty collection", () => {
    expect(([] as PaperExitAnimationRecord[]).some(isBackPaperExitStart)).toBe(false);
  });

  it("accepts a real named animation start on the current exit with back direction", () => {
    expect(isBackPaperExitStart(exitStart())).toBe(true);
  });

  it.each([
    { type: "animationend" }, { type: "animationcancel" },
    { animationName: "paper-exit-fade" }, { animationName: "not-paper-exit-move" },
    { pseudoElement: "::before" }, { isTrusted: false }, { targetIsExit: false },
    { direction: "forward" }, { direction: null },
    { computedAnimationName: "none" }, { computedAnimationName: "not-paper-exit-move" },
    { durationMs: 0 }, { durationMs: -1 }, { durationMs: Number.NaN }, { durationMs: Infinity },
  ])("rejects nonmatching animation evidence: %j", (overrides) => {
    expect(isBackPaperExitStart(exitStart(overrides))).toBe(false);
  });

  it("matches a complete computed animation-name token with surrounding whitespace", () => {
    expect(isBackPaperExitStart(exitStart({ computedAnimationName: "paper-exit-fade,  paper-exit-move " }))).toBe(true);
  });

  it("retains event-time evidence after later direction/style cleanup", () => {
    const current = exitStart();
    const records = [{ ...current }];
    current.direction = null;
    current.computedAnimationName = "none";
    current.durationMs = 0;
    expect(records.some(isBackPaperExitStart)).toBe(true);
    expect(isBackPaperExitStart(current)).toBe(false);
  });
});
