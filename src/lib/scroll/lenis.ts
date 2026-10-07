import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

let instance: Lenis | null = null;
let removeScrollListener: (() => void) | undefined;
const tick = (time: number) => instance?.raf(time * 1000);
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function getLenis(): Lenis | null {
  return instance;
}

export function initLenis(): Lenis {
  if (instance) return instance;
  instance = new Lenis({ lerp: 0.1, smoothWheel: !reducedMotion() });
  removeScrollListener = instance.on("scroll", ScrollTrigger.update);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);
  return instance;
}

export function destroyLenis() {
  gsap.ticker.remove(tick);
  removeScrollListener?.();
  removeScrollListener = undefined;
  instance?.destroy();
  instance = null;
}

interface DocumentScrollOptions {
  offset?: number;
  immediate?: boolean;
  onComplete?: () => void;
}

export function scrollDocumentTo(target: HTMLElement | number, options: DocumentScrollOptions = {}): () => void {
  const lenis = instance;
  const top = (typeof target === "number" ? target : target.getBoundingClientRect().top + window.scrollY) + (options.offset ?? 0);
  const settle = () => {
    if (!lenis || instance !== lenis) return;
    const stopped = lenis.isStopped;
    lenis.stop();
    if (!stopped) lenis.start();
  };
  if (!lenis || options.immediate || reducedMotion()) {
    settle();
    window.scrollTo({ top, behavior: "instant" });
    lenis?.resize();
    options.onComplete?.();
    return () => {};
  }
  lenis.resize();
  lenis.scrollTo(top, { force: true, onComplete: options.onComplete });
  return settle;
}
