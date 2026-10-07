import { describe, expect, it } from "vitest";
import {
  projectFocusPresentationIssues, projectFocusReadinessIssues,
  type ProjectFocusAnimation, type ProjectFocusContainer, type ProjectFocusReadiness,
} from "../../support/project-focus-readiness";

const animation = (overrides: Partial<ProjectFocusAnimation> = {}): ProjectFocusAnimation => ({
  name: "content-opacity-reveal", relevant: true, playState: "running", pending: false, endTime: 700, ...overrides,
});
const sample = (overrides: Partial<ProjectFocusReadiness> = {}): ProjectFocusReadiness => ({
  navigationActive: false, maskPhases: ["idle"], animations: [], ...overrides,
});
const container = (overrides: Partial<ProjectFocusContainer> = {}): ProjectFocusContainer => ({
  name: "header.project-header", display: "block", visibility: "visible", opacity: "1", filter: "none", contentVisibility: "visible", ...overrides,
});

describe("Projects focus readiness", () => {
  it("accepts a settled page without depending on the direction cleanup timer", () => {
    expect(projectFocusReadinessIssues(sample())).toEqual([]);
  });
  it("waits for the native navigation lifecycle even before its animations are registered", () => {
    expect(projectFocusReadinessIssues(sample({ navigationActive: true }))).toContain("navigation-active");
  });
  it.each(["preparing", "covering"])("waits for the navigation mask in %s", (phase) => {
    expect(projectFocusReadinessIssues(sample({ maskPhases: [phase] }))).toContain(`navigation-mask:${phase}`);
  });
  it.each(["::view-transition-new(page-card)", "content-opacity-reveal", "content-blur-reveal", "turn-exit"])("waits for the relevant finite %s animation", (name) => {
    expect(projectFocusReadinessIssues(sample({ animations: [animation({ name })] }))).toContain(`animation-active:${name}`);
  });
  it("does not accept native completion while an ancestor reveal is still running", () => {
    const native = animation({ name: "::view-transition-new(page-card)", playState: "finished" });
    expect(projectFocusReadinessIssues(sample({ animations: [native, animation()] }))).toEqual(["animation-active:content-opacity-reveal"]);
  });
  it.each(["paused", "idle", "finished"] as const)("does not accept a pending %s animation", (playState) => {
    expect(projectFocusReadinessIssues(sample({ animations: [animation({ pending: true, playState })] }))).toContain("animation-active:content-opacity-reveal");
  });
  it("does not treat a paused, unfinished finite animation as completed", () => {
    expect(projectFocusReadinessIssues(sample({ animations: [animation({ playState: "paused" })] }))).toContain("animation-active:content-opacity-reveal");
  });
  it.each(["idle", "finished"] as const)("accepts a genuinely %s animation", (playState) => {
    expect(projectFocusReadinessIssues(sample({ animations: [animation({ playState })] }))).toEqual([]);
  });
  it.each([700, Infinity])("ignores unrelated decorative animations with endTime %s", (endTime) => {
    expect(projectFocusReadinessIssues(sample({ animations: [animation({ relevant: false, endTime })] }))).toEqual([]);
  });
  it("reports an unending animation affecting focus rather than claiming it settled", () => {
    expect(projectFocusReadinessIssues(sample({ animations: [animation({ endTime: Infinity })] }))).toContain("animation-unbounded:content-opacity-reveal");
  });
});

describe("Projects focus ancestor presentation", () => {
  it.each(["none", "blur(0px)"])("accepts fully revealed ancestors with filter %s", (filter) => {
    expect(projectFocusPresentationIssues([container({ filter })])).toEqual([]);
  });
  it.each([
    { display: "none" }, { visibility: "hidden" }, { visibility: "collapse" },
    { opacity: "0" }, { opacity: "0.994276" }, { filter: "blur(0.727124px)" }, { contentVisibility: "hidden" },
  ])("rejects an unrevealed or hidden ancestor: %j", (change) => {
    expect(projectFocusPresentationIssues([container(), container({ name: "main#main", ...change })])).toContain("not-presentable:main#main");
  });
  it("does not let a visible target excuse an transparent or blurred ancestor", () => {
    expect(projectFocusPresentationIssues([container({ name: "a.project-return" }), container({ opacity: "0", filter: "blur(6px)" })])).toEqual(["not-presentable:header.project-header"]);
  });
});
