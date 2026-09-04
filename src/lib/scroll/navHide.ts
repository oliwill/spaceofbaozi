import type Lenis from "lenis";

const TOP_VISIBLE_Y = 80;
const DIRECTION_THRESHOLD = 6;

export function decideNavHidden(prevY: number, nextY: number): boolean | null {
  if (nextY <= TOP_VISIBLE_Y) return false;
  const delta = nextY - prevY;
  if (Math.abs(delta) < DIRECTION_THRESHOLD) return null;
  return delta > 0;
}

export function initNavHide(lenis: Lenis, nav: HTMLElement): () => void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {};

  let prevY = lenis.scroll;
  return lenis.on("scroll", (current) => {
    const hidden = decideNavHidden(prevY, current.scroll);
    prevY = current.scroll;
    if (hidden !== null) nav.dataset.hidden = String(hidden);
  });
}
