// D-142/D-143：ShellLayout 文档页之间的方向性卡片切换。
// 桌面端由 view-transition（main[transition:name="page-card"]）+ data-nav-direction 驱动；
// 移动端复刻 suepark.xyz 的羽化遮罩横扫：before-preparation 起扫，before-swap 推迟到
// 遮罩盖满后再交换文档（Astro 里取消 before-preparation 会退化成整页刷新，不能用它做延迟；
// swapRootAttributes 会剥掉 <html> 上的自定义 data-*，所以方向属性只能在 after-swap 里落）。
const EDITORIAL_SECTIONS = /^\/(blog|photos|projects|resume)(\/|$)/;

interface PreparationEvent extends Event {
  from: URL;
  to: URL;
  direction: "forward" | "back";
}

interface BeforeSwapEvent extends Event {
  swap: () => void;
}

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const mobile = window.matchMedia("(max-width: 639.98px)").matches;

const editorialPath = (url: URL) => EDITORIAL_SECTIONS.test(url.pathname);

const resolveDirection = (from: URL, to: URL, native: "forward" | "back"): "forward" | "back" => {
  if (native === "back") return "back";
  const fromDepth = from.pathname.split("/").filter(Boolean).length;
  const toDepth = to.pathname.split("/").filter(Boolean).length;
  const sameSection = from.pathname.split("/")[1] === to.pathname.split("/")[1];
  if (sameSection && toDepth < fromDepth) return "back";
  return "forward";
};

let masking = false;
let coverDoneAt = 0;
let navSeq = 0;
let pendingDirection: "forward" | "back" | "mask" | null = null;

export const initPageTurn = () => {
  const mask = document.querySelector<HTMLElement>("[data-turn-mask]");
  const root = document.documentElement;

  document.addEventListener("astro:before-preparation", (event) => {
    if (masking) return;
    const { from, to, direction } = event as unknown as PreparationEvent;
    if (!editorialPath(from) || !editorialPath(to) || reduced) {
      pendingDirection = null;
      return;
    }
    navSeq += 1;

    if (mobile && mask) {
      masking = true;
      pendingDirection = "mask";
      mask.dataset.direction = resolveDirection(from, to, direction) === "back" ? "previous" : "next";
      mask.dataset.phase = "preparing";
      requestAnimationFrame(() => {
        mask.dataset.phase = "covering";
        coverDoneAt = performance.now() + 360;
      });
      window.setTimeout(() => {
        if (!masking) return;
        mask.dataset.phase = "idle";
        masking = false;
        pendingDirection = null;
      }, 4000);
      return;
    }

    pendingDirection = resolveDirection(from, to, direction);
  });

  document.addEventListener("astro:before-swap", (event) => {
    if (!masking) return;
    event.preventDefault();
    const swap = (event as unknown as BeforeSwapEvent).swap;
    const wait = Math.max(0, coverDoneAt - performance.now());
    window.setTimeout(() => swap(), wait);
  });

  document.addEventListener("astro:after-swap", () => {
    if (pendingDirection && pendingDirection !== "mask") {
      root.setAttribute("data-nav-direction", pendingDirection);
    } else {
      root.removeAttribute("data-nav-direction");
    }
    pendingDirection = null;

    if (!masking || !mask) return;
    requestAnimationFrame(() => {
      mask.dataset.phase = "idle";
      window.setTimeout(() => {
        masking = false;
        root.removeAttribute("data-nav-direction");
      }, 350);
    });
  });

  document.addEventListener("astro:page-load", () => {
    if (masking) return;
    const seq = navSeq;
    window.setTimeout(() => {
      if (seq === navSeq) root.removeAttribute("data-nav-direction");
    }, 1100);
  });
};
