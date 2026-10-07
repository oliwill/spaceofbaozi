export interface TextRect { left: number; top: number; right: number; bottom: number }
export interface TextContainerGeometry {
  name: string; bounds: TextRect; clipBounds: TextRect;
  overflowX: string; overflowY: string; textOverflow: string; lineClamp: string; whiteSpace: string;
  display: string; visibility: string; opacity: string; contain: string; clipPath: string; documentScroller: boolean;
}
export interface ProjectTextGeometry {
  text: string; bounds: TextRect; mainBounds: TextRect | null;
  scrollHeight: number; clientHeight: number; scrollWidth: number; clientWidth: number;
  containers: TextContainerGeometry[];
  fragments: Array<{ text: string; rects: TextRect[]; containers: number[] }>;
}

// Playwright 序列化此函数；所有 DOM 采集依赖必须保留在函数内部。
export function collectProjectTextGeometry(node: Element): ProjectTextGeometry {
  const document = node.ownerDocument, view = document.defaultView!;
  const rect = (value: DOMRect): TextRect => ({ left: value.left, top: value.top, right: value.right, bottom: value.bottom });
  const containers: TextContainerGeometry[] = [];
  const indexes = new Map<Element, number>();
  const indexFor = (element: Element) => {
    const existing = indexes.get(element);
    if (existing !== undefined) return existing;
    const style = view.getComputedStyle(element), bounds = element.getBoundingClientRect();
    const left = bounds.left + element.clientLeft, top = bounds.top + element.clientTop;
    const index = containers.length;
    containers.push({
      name: `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ""}${element.classList.length ? `.${[...element.classList].join(".")}` : ""}`,
      bounds: rect(bounds), clipBounds: { left, top, right: left + element.clientWidth, bottom: top + element.clientHeight },
      overflowX: style.overflowX, overflowY: style.overflowY, textOverflow: style.textOverflow,
      lineClamp: style.webkitLineClamp, whiteSpace: style.whiteSpace, display: style.display,
      visibility: style.visibility, opacity: style.opacity, contain: style.contain, clipPath: style.clipPath,
      documentScroller: element === document.scrollingElement,
    });
    indexes.set(element, index);
    return index;
  };
  indexFor(node);
  const fragments: ProjectTextGeometry["fragments"] = [];
  const walker = document.createTreeWalker(node, 4 /* NodeFilter.SHOW_TEXT */);
  for (let textNode = walker.nextNode(); textNode; textNode = walker.nextNode()) {
    const text = textNode.textContent ?? "";
    if (!text.trim()) continue;
    const range = document.createRange();
    range.selectNodeContents(textNode);
    const chain: number[] = [];
    for (let parent = textNode.parentElement; parent; parent = parent.parentElement) chain.push(indexFor(parent));
    fragments.push({ text, rects: [...range.getClientRects()].filter((value) => value.width > 0 && value.height > 0).map(rect), containers: chain });
  }
  const main = node.closest("main");
  return {
    text: node.textContent ?? "", bounds: rect(node.getBoundingClientRect()), mainBounds: main ? rect(main.getBoundingClientRect()) : null,
    scrollHeight: node.scrollHeight, clientHeight: node.clientHeight, scrollWidth: node.scrollWidth, clientWidth: node.clientWidth,
    containers, fragments,
  };
}

export function projectTextGeometryIssues(actual: ProjectTextGeometry): string[] {
  const issues = new Set<string>();
  const outsideX = (text: TextRect, box: TextRect) => Math.max(box.left - text.left, text.right - box.right, 0) > 1;
  const outsideY = (text: TextRect, box: TextRect) => Math.max(box.top - text.top, text.bottom - box.bottom, 0) > 1;
  const clips = (style: TextContainerGeometry, axis: "X" | "Y") => {
    const overflow = style[`overflow${axis}`];
    if (style.documentScroller && ["auto", "scroll"].includes(overflow)) return false;
    return style.display !== "inline" && (["hidden", "clip", "auto", "scroll"].includes(overflow) || /\b(paint|strict|content)\b/.test(style.contain));
  };
  if (!actual.mainBounds) issues.add("missing-main");
  else if (outsideX(actual.bounds, actual.mainBounds)) issues.add("element-outside-main");
  if (!actual.fragments.length) issues.add("no-text");
  for (const style of actual.containers) {
    if (style.textOverflow.includes("ellipsis")) issues.add(`${style.name}: ellipsis`);
    if (!["none", "", "0"].includes(style.lineClamp)) issues.add(`${style.name}: line-clamp`);
    if (style.display === "none" || style.visibility !== "visible" || Number(style.opacity) === 0) issues.add(`${style.name}: hidden-text`);
    if (style.clipPath !== "none") issues.add(`${style.name}: unmeasured-clip-path`);
  }
  if (actual.containers[0]?.whiteSpace === "nowrap") issues.add(`${actual.containers[0].name}: nowrap`);
  for (const fragment of actual.fragments) {
    if (!fragment.rects.length) issues.add(`no-text-rects: ${fragment.text}`);
    if (actual.containers[fragment.containers[0]]?.whiteSpace === "nowrap") issues.add(`nowrap: ${fragment.text}`);
    for (const bounds of fragment.rects) {
      if (actual.mainBounds && outsideX(bounds, actual.mainBounds)) issues.add(`text-outside-main: ${fragment.text}`);
      for (const index of fragment.containers) {
        const style = actual.containers[index];
        if (clips(style, "X") && outsideX(bounds, style.clipBounds)) issues.add(`${style.name}: clipped-x: ${fragment.text}`);
        if (clips(style, "Y") && outsideY(bounds, style.clipBounds)) issues.add(`${style.name}: clipped-y: ${fragment.text}`);
      }
    }
  }
  return [...issues];
}
