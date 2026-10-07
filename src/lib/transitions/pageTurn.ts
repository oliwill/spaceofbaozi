import { logicalPath } from "@/lib/site/paths";
import { isAlbumTransition } from "@/lib/photos/routes";
import type { TransitionBeforePreparationEvent } from "astro:transitions/client";

const EDITORIAL_SECTIONS = /^\/(blog|photos|projects|resume|media)(\/|$)/;
const COVER_DURATION = 360;
const DIRECTION_DURATION = 1100;
type Direction = "forward" | "back";

interface Navigation {
  signal: AbortSignal;
  direction: Direction;
  masked: boolean;
  albumInternal: boolean;
  releaseCover: () => void;
  detachAbort: () => void;
}

let initialized = false;

const editorialPath = (url: URL) => logicalPath(url.pathname) === "/" || EDITORIAL_SECTIONS.test(logicalPath(url.pathname) ?? "");

function resolveDirection(from: URL, to: URL, native: string): Direction {
  if (native === "back") return "back";
  const fromParts = (logicalPath(from.pathname) ?? "").split("/").filter(Boolean);
  const toParts = (logicalPath(to.pathname) ?? "").split("/").filter(Boolean);
  return fromParts[0] === toParts[0] && toParts.length < fromParts.length ? "back" : "forward";
}

export function initPageTurn() {
  if (initialized) return;
  initialized = true;
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mobile = window.matchMedia("(max-width: 639.98px)");
  let active: Navigation | null = null;
  let swapping: Navigation | null = null;
  let directionTimer: number | undefined;
  let preloadSequence = 0;
  const mask = () => document.querySelector<HTMLElement>("[data-turn-mask]");

  function resetVisuals() {
    window.clearTimeout(directionTimer);
    document.documentElement.removeAttribute("data-nav-direction");
    const element = mask();
    if (element) element.dataset.phase = "idle";
    document.querySelector<HTMLElement>("[data-turn-exit]")?.style.removeProperty("inset");
  }

  function cancelNavigation() {
    active?.releaseCover();
    active?.detachAbort();
    active = null;
    resetVisuals();
  }

  function cover(navigation: Navigation): Promise<void> {
    const element = mask();
    if (!element) return Promise.resolve();
    element.dataset.direction = navigation.direction === "back" ? "previous" : "next";
    element.dataset.phase = "preparing";
    return new Promise((resolve) => {
      let timer: number | undefined;
      let frame = requestAnimationFrame(() => {
        frame = 0;
        if (active !== navigation || motion.matches || navigation.signal.aborted) {
          navigation.releaseCover();
          return;
        }
        element.dataset.phase = "covering";
        timer = window.setTimeout(navigation.releaseCover, COVER_DURATION);
      });
      navigation.releaseCover = () => {
        cancelAnimationFrame(frame);
        window.clearTimeout(timer);
        resolve();
      };
    });
  }

  document.addEventListener("astro:before-preparation", (event: TransitionBeforePreparationEvent) => {
    cancelNavigation();
    if (motion.matches || !editorialPath(event.from) || !editorialPath(event.to)) return;
    const navigation: Navigation = {
      signal: event.signal,
      direction: resolveDirection(event.from, event.to, event.direction),
      masked: !isAlbumTransition(event.from.pathname,event.to.pathname) && mobile.matches && !!mask(),
      albumInternal: isAlbumTransition(event.from.pathname,event.to.pathname),
      releaseCover: () => {},
      detachAbort: () => {},
    };
    active = navigation;
    event.direction = navigation.direction;
    const abort = () => {
      if (active === navigation) cancelNavigation();
    };
    event.signal.addEventListener("abort", abort, { once: true });
    navigation.detachAbort = () => event.signal.removeEventListener("abort", abort);
    if (!navigation.masked) return;
    const covered = cover(navigation);
    const load = event.loader;
    // Astro before-swap 不可取消；只等待 loader，文档交换始终由 Router 执行一次。
    event.loader = async () => {
      try {
        await Promise.all([load(), covered]);
      } catch (error) {
        if (active === navigation) cancelNavigation();
        throw error;
      } finally {
        if ((event.signal.aborted || event.defaultPrevented) && active === navigation) cancelNavigation();
      }
    };
  });

  document.addEventListener("astro:before-swap", (event) => {
    // D-155：Router 也会取消旧转场，须在所有交换中观察 ready 的取消拒绝。
    void event.viewTransition.ready.catch((error: unknown) => {
      if (!(error instanceof DOMException && error.name === "AbortError")) throw error;
    });
    if (event.signal.aborted) {
      // D-149：已排队的旧交换须保留后续导航仍在等待的 CSS 预加载。
      for (const link of document.head.querySelectorAll<HTMLLinkElement>('link[rel="preload"][as="style"]')) {
        link.dataset.astroTransitionPersist ??= `page-turn-preload-${++preloadSequence}`;
        event.newDocument.head.append(link.cloneNode(true));
      }
    }
    swapping = active?.signal === event.signal ? active : null;
    if (event.signal.aborted || motion.matches || swapping?.masked || swapping?.albumInternal) {
      event.viewTransition.skipTransition();
    }
  });

  document.addEventListener("astro:after-swap", () => {
    const navigation = swapping;
    swapping = null;
    if (!navigation || navigation !== active) return;
    navigation.releaseCover();
    navigation.detachAbort();
    resetVisuals();
    if (motion.matches || navigation.masked || navigation.albumInternal) return;
    if (navigation.direction === "back") {
      const paper = document.querySelector<HTMLElement>("main#main")?.getBoundingClientRect();
      const exit = document.querySelector<HTMLElement>("[data-turn-exit]");
      if (paper && exit) {
        const edges = [paper.top, innerWidth - paper.right, innerHeight - paper.bottom, paper.left];
        exit.style.inset = edges.map((value) => `${Math.max(0, value)}px`).join(" ");
      }
    }
    document.documentElement.dataset.navDirection = navigation.direction;
    directionTimer = window.setTimeout(() => {
      if (active === navigation) resetVisuals();
    }, DIRECTION_DURATION);
  });

  motion.addEventListener("change", () => {
    if (motion.matches) cancelNavigation();
  });
  window.addEventListener("pagehide", cancelNavigation);
}
