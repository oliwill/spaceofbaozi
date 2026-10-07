import { describe, expect, it } from "vitest";
import { projectTextGeometryIssues, type ProjectTextGeometry, type TextContainerGeometry } from "../../support/project-text-geometry";

const rect = (left: number, top: number, right: number, bottom: number) => ({ left, top, right, bottom });
function container(overrides: Partial<TextContainerGeometry> = {}): TextContainerGeometry {
  return {
    name: "p.project-header__role", bounds: rect(20, 40, 280, 80), clipBounds: rect(20, 40, 280, 80),
    overflowX: "visible", overflowY: "visible", textOverflow: "clip", lineClamp: "none", whiteSpace: "normal",
    display: "block", visibility: "visible", opacity: "1", contain: "none", clipPath: "none", documentScroller: false,
    ...overrides,
  };
}
function geometry(overrides: Partial<ProjectTextGeometry> = {}): ProjectTextGeometry {
  return {
    text: "完整职责，包括最后一句。", bounds: rect(20, 40, 280, 80), mainBounds: rect(0, 0, 320, 2000),
    scrollHeight: 45, clientHeight: 40, scrollWidth: 260, clientWidth: 260,
    containers: [container()], fragments: [{ text: "完整职责，包括最后一句。", rects: [rect(20, 42, 275, 85)], containers: [0] }],
    ...overrides,
  };
}
const issues = (sample: ProjectTextGeometry) => projectTextGeometryIssues(sample).join("\n");

// Reinstating scrollHeight/clientHeight as a visibility oracle must fail the positive controls.
describe("Projects text geometry contract", () => {
  it.each([2, 3, 4, 5])("accepts %ipx scroll metric overhang with visible text and no clipping ancestor", (delta) => {
    const sample = geometry({ scrollHeight: 40 + delta });
    sample.fragments[0].rects[0].bottom = 80 + delta;
    expect(projectTextGeometryIssues(sample)).toEqual([]);
  });
  it("accepts font overhang outside a small text box when every text fragment stays inside main", () => {
    expect(projectTextGeometryIssues(geometry({ scrollWidth: 265, fragments: [{ text: "完整职责", rects: [rect(18, 38, 285, 85)], containers: [0] }] }))).toEqual([]);
  });
  it.each(["hidden", "clip", "auto", "scroll"])("rejects actual 2px vertical text clipping by its own overflow:%s", (overflowY) => {
    const sample = geometry({ scrollHeight: 42, containers: [container({ overflowY })] });
    sample.fragments[0].rects[0].bottom = 82;
    expect(issues(sample)).toContain("clipped-y");
  });
  it.each(["hidden", "clip"])("rejects actual 2px horizontal text clipping by its own overflow:%s", (overflowX) => {
    const sample = geometry({ scrollHeight: 40, containers: [container({ overflowX })] });
    sample.fragments[0].rects[0] = rect(20, 42, 282, 78);
    expect(issues(sample)).toContain("clipped-x");
  });
  it.each(["hidden", "clip"])("rejects a clipping ancestor even when the text node has no scroll overflow (%s)", (overflowY) => {
    const sample = geometry({ scrollHeight: 40, containers: [container(), container({ name: "div.wrapper", overflowY, clipBounds: rect(0, 0, 320, 83) })] });
    sample.fragments[0].containers.push(1);
    expect(issues(sample)).toContain("div.wrapper: clipped-y");
  });
  it("rejects horizontal ancestor clipping", () => {
    const sample = geometry({ scrollHeight: 40, containers: [container(), container({ name: "div.wrapper", overflowX: "clip", clipBounds: rect(0, 0, 273, 200) })] });
    sample.fragments[0].containers.push(1);
    expect(issues(sample)).toContain("div.wrapper: clipped-x");
  });
  it("uses the padding clip edge rather than a border-box edge", () => {
    const sample = geometry({ containers: [container({ overflowY: "hidden", bounds: rect(10, 30, 290, 90), clipBounds: rect(20, 40, 280, 80) })] });
    expect(issues(sample)).toContain("clipped-y");
  });
  it("keeps an entire long role, including a trailing nested text fragment, within clipping ancestors", () => {
    const sample = geometry({ scrollHeight: 40, containers: [container(), container({ name: "div.long-role-wrapper", overflowY: "hidden", clipBounds: rect(0, 0, 320, 100) })] });
    sample.fragments = [
      { text: "负责".repeat(80), rects: [rect(20, 42, 275, 80)], containers: [0, 1] },
      { text: "职责最后一句不可丢失", rects: [rect(20, 110, 200, 130)], containers: [0, 1] },
    ];
    expect(issues(sample)).toContain("div.long-role-wrapper: clipped-y");
  });
  it("rejects a hidden trailing span even if the root still has visible text", () => {
    const sample = geometry({ containers: [container(), container({ name: "span.last-role", display: "none" })] });
    sample.fragments.push({ text: "最后职责", rects: [], containers: [1, 0] });
    expect(issues(sample)).toContain("hidden-text");
    expect(issues(sample)).toContain("no-text-rects");
  });
  it.each(["hidden", "collapse"])("rejects visibility:%s text", (visibility) => {
    expect(issues(geometry({ containers: [container({ visibility })] }))).toContain("hidden-text");
  });
  it("rejects fully transparent text", () => {
    expect(issues(geometry({ containers: [container({ opacity: "0" })] }))).toContain("hidden-text");
  });
  it.each(["self", "ancestor"])("retains the ellipsis gate on %s", (placement) => {
    const containers = placement === "self" ? [container({ textOverflow: "ellipsis" })] : [container(), container({ textOverflow: "ellipsis", name: "div.wrapper" })];
    const sample = geometry({ containers });
    sample.fragments[0].containers = containers.map((_, index) => index);
    expect(issues(sample)).toContain("ellipsis");
  });
  it.each(["self", "ancestor"])("retains the line-clamp gate on %s", (placement) => {
    const containers = placement === "self" ? [container({ lineClamp: "2" })] : [container(), container({ lineClamp: "2", name: "div.wrapper" })];
    const sample = geometry({ containers });
    sample.fragments[0].containers = containers.map((_, index) => index);
    expect(issues(sample)).toContain("line-clamp");
  });
  it("retains the non-wrapping text gate", () => {
    expect(issues(geometry({ containers: [container({ whiteSpace: "nowrap" })] }))).toContain("nowrap");
  });
  it("rejects 2px of text beyond main even when its element box fits", () => {
    const sample = geometry({ scrollHeight: 40 });
    sample.fragments[0].rects[0].right = 322;
    expect(issues(sample)).toContain("text-outside-main");
  });
  it("retains element horizontal main bounds coverage", () => {
    expect(issues(geometry({ bounds: rect(-2, 40, 280, 80) }))).toContain("element-outside-main");
  });
  it("does not treat offscreen but document-scrollable text as truncated", () => {
    const sample = geometry({ bounds: rect(20, 1040, 280, 1080), containers: [container({ bounds: rect(20, 1040, 280, 1080) }), container({ name: "html", documentScroller: true, overflowY: "auto", clipBounds: rect(0, 0, 320, 900) })] });
    sample.fragments[0] = { text: "完整职责", rects: [rect(20, 1042, 275, 1085)], containers: [0, 1] };
    expect(projectTextGeometryIssues(sample)).toEqual([]);
  });
  it("does not excuse a hidden document scroller", () => {
    const sample = geometry({ containers: [container({ documentScroller: true, overflowY: "hidden" })] });
    expect(issues(sample)).toContain("clipped-y");
  });
  it("fails closed when main or measurable text is missing", () => {
    expect(issues(geometry({ mainBounds: null }))).toContain("missing-main");
    expect(issues(geometry({ fragments: [] }))).toContain("no-text");
  });
  it("rejects paint containment clipping even with overflow visible", () => {
    expect(issues(geometry({ containers: [container({ contain: "paint" })] }))).toContain("clipped-y");
  });
  it("fails closed for a clip path whose shape was not measured", () => {
    expect(issues(geometry({ containers: [container({ clipPath: "inset(0 0 10px 0)" })] }))).toContain("clip-path");
  });
});
