import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * 全站平滑滚动（D-124）：Lenis 驱动原生滚动，GSAP ticker 回灌，
 * ScrollTrigger 在 Lenis 每帧滚动时更新，保证 alpha-atlas scrub 无偏差。
 */
export function initLenis(): Lenis {
  const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  return lenis;
}
