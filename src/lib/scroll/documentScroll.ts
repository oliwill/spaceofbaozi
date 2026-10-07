import { destroyLenis, initLenis, scrollDocumentTo } from "@/lib/scroll/lenis";

let initialized = false;

export function initDocumentScroll() {
  if (initialized) return;
  initialized = true;
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let swapping = false;

  document.addEventListener("astro:before-preparation", () => {
    scrollDocumentTo(window.scrollY, { immediate: true });
  });
  document.addEventListener("astro:before-swap", () => {
    swapping = true;
    destroyLenis();
  });
  document.addEventListener("astro:page-load", () => {
    swapping = false;
    initLenis();
  });
  motion.addEventListener("change", () => {
    destroyLenis();
    if (!swapping) initLenis();
  });
  window.addEventListener("pagehide", destroyLenis);
  window.addEventListener("pageshow", () => {
    if (!swapping) initLenis();
  });
  initLenis();
}
