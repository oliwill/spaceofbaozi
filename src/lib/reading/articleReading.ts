import { navigate, type TransitionBeforePreparationEvent } from "astro:transitions/client";
import { scrollDocumentTo } from "@/lib/scroll/lenis";
import { activeHeadingIndex, readingDogFrame, readingDogPosition, readingFraction } from "@/lib/reading/model";

let installed = false;
let dispose: (() => void) | undefined;
let correctHashOnLoad = true;

function safeOffset(dock: HTMLElement | null): number {
  if (!dock || dock.getClientRects().length === 0) return 16;
  const top = Number.parseFloat(getComputedStyle(dock).top) || 0;
  const bounds = dock.getBoundingClientRect();
  const height = bounds.height;
  return top + height + 16;
}

function startArticleReading(): void {
  dispose?.();
  dispose = undefined;
  const region = document.querySelector<HTMLElement>("[data-reading-region]");
  const prose = region?.querySelector<HTMLElement>("[data-reading-prose]");
  if (!region || !prose) return;

  const controller = new AbortController();
  const { signal } = controller;
  const articleLocation = location.pathname + location.search;
  const headings = Array.from(prose.querySelectorAll<HTMLElement>("h2[id], h3[id]"));
  const links = Array.from(region.querySelectorAll<HTMLAnchorElement>("[data-reading-link]"));
  const chapterNavs = Array.from(region.querySelectorAll<HTMLElement>("[data-reading-chapters]"));
  const chapterHeadings = links.flatMap((link) => headings.filter((heading) => heading.id === link.dataset.readingLink));
  const progressBars = Array.from(region.querySelectorAll<HTMLElement>("[data-reading-progress]"));
  const title = region.querySelector<HTMLElement>(".article-page__header h1");
  const dock = region.querySelector<HTMLElement>("[data-reading-obstruction]");
  const tracks = Array.from(region.querySelectorAll<HTMLElement>("[data-reading-track]")).flatMap((track) => {
    const dog = track.querySelector<HTMLElement>("[data-reading-dog]");
    const ball = track.querySelector<HTMLElement>("[data-reading-ball]");
    return dog && ball ? [{ track, dog, ball, ballLeft: 0, dogWidth: 0, lastPosition: -1, lastFrame: -1 }] : [];
  });
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let frame = 0;
  let needsMeasure = true;
  let positions: number[] = [];
  let proseTop = 0;
  let proseBottom = 0;
  let offset = 32;
  let percent = -1;
  let activeIndex = -2;
  let historyFocus = false;
  let initialHashPending = correctHashOnLoad && Boolean(location.hash);
  let jumpSequence = 0;
  let cancelScroll: (() => void) | undefined;
  const reveals = new Set<Animation>();

  const positionChapterLabels = () => {
    for (const nav of chapterNavs) {
      const visibleLinks = nav.querySelectorAll<HTMLAnchorElement>("[data-reading-link]:is(:hover, :focus-visible)");
      if (!visibleLinks.length) continue;
      const navTop = nav.getBoundingClientRect().top + nav.clientTop;
      const placements = Array.from(visibleLinks, (link) => {
        const bounds = link.getBoundingClientRect();
        return { link, top: `${bounds.top + bounds.height / 2 - navTop}px` };
      });
      for (const { link, top } of placements) {
        if (link.style.getPropertyValue("--reading-label-top") !== top) {
          link.style.setProperty("--reading-label-top", top);
        }
      }
    }
  };

  const measure = () => {
    const y = scrollY;
    const bounds = prose.getBoundingClientRect();
    proseTop = bounds.top + y;
    proseBottom = bounds.bottom + y;
    positions = chapterHeadings.map((heading) => heading.getBoundingClientRect().top + y);
    offset = safeOffset(dock);
    prose.style.setProperty("--reading-offset", `${offset}px`);
    for (const item of tracks) {
      item.ballLeft = item.ball.offsetLeft;
      item.dogWidth = item.dog.offsetWidth;
    }
    needsMeasure = false;
  };

  const update = () => {
    frame = 0;
    if (needsMeasure) measure();
    positionChapterLabels();
    if (historyFocus) {
      historyFocus = false;
      if (location.pathname + location.search === articleLocation) {
        let id = "";
        try { id = decodeURIComponent(location.hash.slice(1)); } catch { /* 无效 hash 保留当前位置。 */ }
        const target = headings.find((heading) => heading.id === id) ?? (!location.hash ? title : null);
        if (target?.isConnected) {
          target.tabIndex = -1;
          target.focus({ preventScroll: true });
        }
      }
    }
    const y = scrollY;
    const fraction = readingFraction(y, proseTop, proseBottom, innerHeight, offset);
    const nextPercent = Math.round(fraction * 100);
    if (nextPercent !== percent) {
      percent = nextPercent;
      for (const bar of progressBars) {
        bar.setAttribute("aria-valuenow", String(percent));
        const number = bar.querySelector<HTMLElement>("[data-reading-percent]");
        if (number) number.textContent = `${percent}%`;
      }
    }
    for (const item of tracks) {
      const position = Math.round(readingDogPosition(fraction, item.ballLeft, item.dogWidth) * 100) / 100;
      const spriteFrame = readingDogFrame(position, reducedMotion.matches, fraction === 1);
      if (position !== item.lastPosition) {
        item.dog.style.setProperty("--reading-dog-x", `${position}px`);
        item.lastPosition = position;
      }
      if (spriteFrame !== item.lastFrame) {
        item.dog.style.setProperty("--reading-dog-frame", String(spriteFrame));
        item.lastFrame = spriteFrame;
      }
    }
    const nextIndex = activeHeadingIndex(positions, y + innerHeight * 0.4, fraction === 1);
    if (nextIndex !== activeIndex) {
      activeIndex = nextIndex;
      const heading = chapterHeadings[activeIndex];
      for (const link of links) {
        if (link.dataset.readingLink === heading?.id) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      }
    }
  };

  const scheduleUpdate = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  const invalidate = () => {
    needsMeasure = true;
    scheduleUpdate();
  };
  const interrupt = () => {
    initialHashPending = false;
    jumpSequence += 1;
    cancelScroll?.();
    cancelScroll = undefined;
    for (const animation of reveals) animation.cancel();
    reveals.clear();
  };
  const reveal = (heading: HTMLElement) => {
    if (reducedMotion.matches) return;
    const next = heading.nextElementSibling;
    const elements = next instanceof HTMLElement ? [heading, next] : [heading];
    for (const element of elements) {
      const animation = element.animate(
        [{ opacity: 0.65, transform: "translateY(4px)" }, { opacity: 1, transform: "none" }],
        { duration: 280, easing: "cubic-bezier(.16,1,.3,1)" },
      );
      reveals.add(animation);
      void animation.finished.then(() => reveals.delete(animation), () => reveals.delete(animation));
    }
  };

  const jumpTo = async (heading: HTMLElement, trigger: HTMLAnchorElement) => {
    interrupt();
    const sequence = jumpSequence;
    const previousY = scrollY;
    const hash = `#${encodeURIComponent(heading.id)}`;
    if (location.hash !== hash) await navigate(hash, { history: "push" });
    if (signal.aborted || sequence !== jumpSequence || !heading.isConnected) return;
    // D-148：历史索引由 Astro 管理，同任务内复位锚点瞬跳后交给 Lenis 定位。
    scrollDocumentTo(previousY, { immediate: true });
    trigger.focus({ preventScroll: true });
    invalidate();
    cancelScroll = scrollDocumentTo(heading.getBoundingClientRect().top + scrollY, {
      offset: -safeOffset(dock),
      immediate: reducedMotion.matches,
      onComplete: () => {
        if (signal.aborted || sequence !== jumpSequence) return;
        cancelScroll = undefined;
        heading.focus({ preventScroll: true });
        if (history.state) history.replaceState({ ...history.state, scrollX, scrollY }, "");
        reveal(heading);
        scheduleUpdate();
      },
    });
  };

  headings.forEach((heading) => { heading.tabIndex = -1; });
  progressBars.forEach((bar) => { bar.hidden = false; });
  links.forEach((link) => {
    link.addEventListener("click", (event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const heading = headings.find((item) => item.id === link.dataset.readingLink);
      if (!heading) return;
      event.preventDefault();
      void jumpTo(heading, link);
    }, { signal });
  });

  window.addEventListener("scroll", scheduleUpdate, { passive: true, signal });
  window.addEventListener("resize", invalidate, { passive: true, signal });
  for (const nav of chapterNavs) {
    nav.addEventListener("pointerover", scheduleUpdate, { passive: true, signal });
    nav.addEventListener("focusin", scheduleUpdate, { signal });
    nav.addEventListener("scroll", scheduleUpdate, { passive: true, capture: true, signal });
  }
  for (const event of ["wheel", "touchstart", "pointerdown", "keydown"] as const) {
    window.addEventListener(event, interrupt, { passive: true, capture: true, signal });
  }
  window.addEventListener("popstate", (event) => {
    // D-148：Astro 的同页 hash 导航会同步发出空 state 合成事件，不能当作用户后退。
    if (!event.state) return;
    interrupt();
    scrollDocumentTo(scrollY, { immediate: true });
    historyFocus = true;
    invalidate();
  }, { signal });
  document.addEventListener("astro:before-preparation", interrupt, { signal });
  reducedMotion.addEventListener("change", () => { interrupt(); scheduleUpdate(); }, { signal });
  const observer = new ResizeObserver(invalidate);
  observer.observe(prose);
  if (dock) observer.observe(dock);
  chapterNavs.forEach((nav) => observer.observe(nav));
  tracks.forEach(({ track }) => observer.observe(track));
  if (title?.parentElement) observer.observe(title.parentElement);

  const images = Array.from(region.querySelectorAll<HTMLImageElement>(".article-page__cover img, [data-reading-prose] img"));
  const settledImages = images.filter((image) => image.loading !== "lazy").map((image) => image.decode().catch(() => undefined));
  void Promise.allSettled([document.fonts.ready, ...settledImages]).then(() => {
    if (signal.aborted) return;
    invalidate();
    if (!initialHashPending) return;
    initialHashPending = false;
    let id: string;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    const heading = headings.find((item) => item.id === id);
    if (heading) {
      scrollDocumentTo(heading.getBoundingClientRect().top + scrollY, { offset: -safeOffset(dock), immediate: true });
      heading.focus({ preventScroll: true });
    }
  });
  scheduleUpdate();
  dispose = () => {
    interrupt();
    controller.abort();
    observer.disconnect();
    cancelAnimationFrame(frame);
  };
}

export function initArticleReading(): void {
  if (installed) return;
  installed = true;
  document.addEventListener("astro:before-preparation", (event) => {
    correctHashOnLoad = (event as TransitionBeforePreparationEvent).navigationType !== "traverse";
  });
  document.addEventListener("astro:page-load", startArticleReading);
  document.addEventListener("astro:before-swap", (event) => {
    dispose?.();
    dispose = undefined;
    event.newDocument.querySelectorAll<HTMLElement>("[data-reading-progress]").forEach((bar) => { bar.hidden = false; });
  });
  startArticleReading();
}
