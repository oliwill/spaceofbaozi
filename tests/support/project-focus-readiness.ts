export interface ProjectFocusAnimation {
  name: string;
  relevant: boolean;
  playState: AnimationPlayState;
  pending: boolean;
  endTime: number;
}
export interface ProjectFocusReadiness {
  navigationActive: boolean;
  maskPhases: string[];
  animations: ProjectFocusAnimation[];
}
export interface ProjectFocusContainer {
  name: string;
  display: string;
  visibility: string;
  opacity: string;
  filter: string;
  contentVisibility: string;
}

export function projectFocusReadinessIssues(sample: ProjectFocusReadiness): string[] {
  const issues = sample.navigationActive ? ["navigation-active"] : [];
  for (const phase of sample.maskPhases) if (phase !== "idle") issues.push(`navigation-mask:${phase}`);
  for (const animation of sample.animations) {
    if (!animation.relevant || (!animation.pending && ["idle", "finished"].includes(animation.playState))) continue;
    issues.push(`animation-${Number.isFinite(animation.endTime) ? "active" : "unbounded"}:${animation.name}`);
  }
  return issues;
}

export function projectFocusPresentationIssues(containers: ProjectFocusContainer[]): string[] {
  return containers.filter((style) => style.display === "none" || style.visibility !== "visible"
    || Number(style.opacity) !== 1 || !["none", "blur(0px)"].includes(style.filter)
    || style.contentVisibility === "hidden").map(({ name }) => `not-presentable:${name}`);
}

// Playwright 序列化此函数；DOM 依赖须留在函数内部。
export function collectProjectFocus(element: Element) {
  const document = element.ownerDocument, view = document.defaultView!;
  const style = view.getComputedStyle(element), bounds = element.getBoundingClientRect();
  const outline = parseFloat(style.outlineWidth) + parseFloat(style.outlineOffset);
  const hit = document.elementFromPoint(Math.min(view.innerWidth - 1, Math.max(0, bounds.x + bounds.width / 2)), Math.min(view.innerHeight - 1, Math.max(0, bounds.y + bounds.height / 2)));
  const rgba = (value: string) => {
    const channels = value.match(/[\d.]+/g)!.map(Number);
    return [channels[0], channels[1], channels[2], channels[3] ?? 1];
  };
  const composite = (front: number[], back: number[]) => front.slice(0, 3).map((value, index) => value * front[3] + back[index] * (1 - front[3])).concat(1);
  const luminance = (color: number[]) => color.slice(0, 3).map((value) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
  const ancestors: Element[] = [];
  for (let parent: Element | null = element.parentElement; parent; parent = parent.parentElement) ancestors.unshift(parent);
  let background = [255, 255, 255, 1];
  for (const parent of ancestors) background = composite(rgba(view.getComputedStyle(parent).backgroundColor), background);
  const a = luminance(composite(rgba(style.outlineColor), background)), b = luminance(background);
  const containers: ProjectFocusContainer[] = [...ancestors, element].map((node) => {
    const computed = view.getComputedStyle(node);
    return {
      name: `${node.tagName.toLowerCase()}${node.id ? `#${node.id}` : ""}`,
      display: computed.display, visibility: computed.visibility, opacity: computed.opacity,
      filter: computed.filter, contentVisibility: computed.contentVisibility,
    };
  });
  const animations: ProjectFocusAnimation[] = document.getAnimations().map((animation) => {
    const effect = animation.effect as KeyframeEffect | null, target = effect?.target;
    const pseudo = effect?.pseudoElement ?? "";
    return {
      name: pseudo || (animation as CSSAnimation).animationName || animation.id || "unnamed",
      relevant: pseudo.startsWith("::view-transition") || (!!target && (target === element
        || target.contains(element) || element.contains(target) || target.matches("[data-turn-mask], [data-turn-exit]"))),
      playState: animation.playState, pending: animation.pending,
      endTime: Number(effect?.getComputedTiming().endTime ?? Infinity),
    };
  });
  return {
    navigationActive: document.documentElement.hasAttribute("data-astro-transition"),
    maskPhases: [...document.querySelectorAll("[data-turn-mask]")].map((mask) => mask.getAttribute("data-phase") ?? "missing"),
    animations, containers, focused: document.activeElement === element, focusVisible: element.matches(":focus-visible"),
    style: style.outlineStyle, width: parseFloat(style.outlineWidth), color: style.outlineColor,
    contrast: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
    inViewport: bounds.width > 0 && bounds.height > 0 && bounds.left - outline >= -1 && bounds.right + outline <= view.innerWidth + 1
      && bounds.top - outline >= -1 && bounds.bottom + outline <= view.innerHeight + 1,
    unobscured: !!hit && (hit === element || element.contains(hit)),
  };
}
