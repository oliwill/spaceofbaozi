import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const MAX_ATTEMPTS = 120; // ~2s @60fps；client:idle island 通常更早就绪

/**
 * 场景转场（D-125）：用滚动驱动过渡填满 sticky pin 长度，消除死区。
 * - 首页（场景 2）pin 区间：暖白纸 .home-v2 被 scrub 上移并淡出离场，露出点阵纸。
 * - 项目矩阵（场景 3）pin 区间：卡片随滚动逐张拼装；无卡片（草稿/空）时对整块面板做 scrub 揭示，
 *   end 取 bottom bottom 覆盖整个 pin，保证无论内容是否就绪该场景始终有运动。
 * 与 Lenis 共用 ScrollTrigger（lenis.ts 已回灌 ScrollTrigger.update）。
 * 仅在 no-preference 下启用；reduced-motion 用户直接看终态。
 * React islands 为 client:idle，首屏脚本运行时 DOM 可能未注入，故 poll 等待。
 */
export function initSceneScroll(): void {
  const mm = gsap.matchMedia();

  mm.add("(prefers-reduced-motion: no-preference)", () => {
    const created: gsap.core.Tween[] = [];
    let attempts = 0;

    const tryBuild = () => {
      const home = document.querySelector<HTMLElement>(".scene--home .home-v2");
      const projects = document.querySelector<HTMLElement>(".scene--projects .scene-projects");
      const cards = gsap.utils.toArray<HTMLElement>(".scene--projects .scene-projects__card");

      if ((!home || !projects) && attempts++ < MAX_ATTEMPTS) {
        requestAnimationFrame(tryBuild);
        return;
      }

      if (home) {
        created.push(
          gsap.to(home, {
            yPercent: -68,
            opacity: 0.12,
            ease: "none",
            scrollTrigger: {
              trigger: ".scene--home",
              start: "top top",
              end: "bottom bottom",
              scrub: true,
            },
          }),
        );
      }

      if (projects) {
        const populated = cards.length > 0;
        const target = populated ? cards : projects;
        const from = populated
          ? { yPercent: 55, opacity: 0, stagger: 0.12 }
          : { yPercent: 16, opacity: 0.5 };
        created.push(
          gsap.from(target, {
            ...from,
            ease: "none",
            scrollTrigger: {
              trigger: ".scene--projects",
              start: "top top",
              end: "bottom bottom",
              scrub: true,
            },
          }),
        );
      }

      ScrollTrigger.refresh();
    };

    tryBuild();

    return () => {
      created.forEach((tween) => tween.scrollTrigger?.kill());
      created.forEach((tween) => tween.kill());
    };
  });
}
