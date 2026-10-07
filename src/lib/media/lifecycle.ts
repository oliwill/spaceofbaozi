import { servedUrl, logicalPath } from "@/lib/site/paths";
import type { TransitionBeforePreparationEvent, TransitionBeforeSwapEvent } from "astro:transitions/client";
import { scrollDocumentTo } from "@/lib/scroll/lenis";
import { canReturnToMediaList, mergeMediaHistory, mediaHistoryIndex, readMediaHistory, type MediaHistory, type MediaListPosition } from "@/lib/media/history";

interface Transfer {
  source: HTMLAnchorElement;
  to: string;
  list: MediaListPosition;
  detailId?: string;
  originIndex?: number;
}
interface Navigation {
  signal: AbortSignal;
  to: URL;
  transfer?: Transfer;
  swapped: boolean;
  restore: boolean;
  detach: () => void;
}
interface ReturnGesture {
  source: HTMLAnchorElement;
  x: number;
  y: number;
  pointerId: number;
  startedAt: number;
  navigation?: Navigation;
  pendingPress: boolean;
  repeated: boolean;
}

let initialized = false;
const listPath = (pathname: string) => /^\/media(?:\/y\/\d{4}|\/undated)?(?:\/(?:book|movie|music))?(?:\/d\/\d{4}-\d{2}-\d{2})?(?:\/p\/[1-9]\d*)?$/.test(logicalPath(pathname) ?? "");
const detailPath = (id: string) => new URL(servedUrl(`/media/item/${id}`), location.href).pathname;
const ordinaryClick = (event: MouseEvent, link: HTMLAnchorElement) => !event.defaultPrevented
  && event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey
  && (!link.target || link.target === "_self") && !link.hasAttribute("download") && !link.hasAttribute("data-astro-reload");

export function initMediaLifecycle(): void {
  if (initialized) return;
  initialized = true;
  let candidate: Transfer | undefined;
  let active: Navigation | undefined;
  let swapping: Navigation | undefined;
  let scope: AbortController | undefined;
  let mounted: HTMLElement | null = null;
  let frame = 0;
  let restoreGeneration = 0;
  let backRequested = false;
  let returnGesture: ReturnGesture | undefined;

  function continuesReturn(event: Event): boolean {
    const gesture = returnGesture;
    if (!gesture || !["pointerdown", "mousedown", "click"].includes(event.type)) return false;
    const mouse = event as PointerEvent;
    const source = event.target instanceof Element ? event.target.closest("a[data-media-return]") : null;
    if (gesture.navigation?.signal.aborted || mouse.defaultPrevented || mouse.button !== 0
      || mouse.ctrlKey || mouse.metaKey || mouse.shiftKey || mouse.altKey
      || mouse.timeStamp < gesture.startedAt || mouse.timeStamp - gesture.startedAt > 500
      || Math.abs(mouse.clientX - gesture.x) > 4 || Math.abs(mouse.clientY - gesture.y) > 4
      || (event.target !== document.documentElement && source !== gesture.source)) return false;
    if (event.type === "pointerdown" && mouse.pointerType === "mouse" && mouse.pointerId === gesture.pointerId
      && backRequested && (!gesture.navigation || gesture.navigation === active)) {
      gesture.pendingPress = true;
      return true;
    }
    if (event.type === "mousedown" && mouse.detail >= 2 && gesture.pendingPress) {
      gesture.repeated = true;
      return true;
    }
    if (event.type === "click" && mouse.detail >= 2 && gesture.repeated) {
      returnGesture = undefined;
      return true;
    }
    return false;
  }

  function cancelRestore() {
    ++restoreGeneration;
    cancelAnimationFrame(frame);
    frame = 0;
  }
  function dispose() {
    cancelRestore();
    scope?.abort();
    scope = undefined;
    mounted = null;
  }
  function replace(update: Partial<MediaHistory>): boolean {
    if (!mediaHistoryIndex(history.state?.index)) return false;
    try { history.replaceState(mergeMediaHistory(history.state, update), ""); return true; }
    catch { return false; }
  }
  function clearNavigation() {
    active?.detach();
    active = undefined;
  }
  function mount(restore = true) {
    const list = document.querySelector<HTMLElement>("[data-media-list]");
    const detail = document.querySelector<HTMLElement>("[data-media-detail]");
    const root = list ?? detail;
    if (scope && mounted === root) return;
    dispose();
    backRequested = false;
    if (!root) return;
    mounted = root;
    scope = new AbortController();
    const { signal } = scope;
    if (list && listPath(location.pathname)) {
      const saved = readMediaHistory(history.state).list;
      if (restore && saved && saved.key===list.dataset.mediaKey && mediaHistoryIndex(history.state?.index)) {
        const generation = restoreGeneration;
        frame = requestAnimationFrame(() => {
          frame = 0;
          if (signal.aborted || generation !== restoreGeneration || !list.isConnected || !listPath(location.pathname)
            || readMediaHistory(history.state).list?.key !== saved.key) return;
          const link = Array.from(list.querySelectorAll<HTMLAnchorElement>("a[data-media-id]")).find((link) => link.dataset.mediaId === saved.mediaId);
          scrollDocumentTo(Math.min(saved.scrollY, Math.max(0, document.documentElement.scrollHeight - innerHeight)), { immediate: true });
          const target=link ?? list.querySelector<HTMLElement>("#media-list-title");
          if(target){const rect=target.getBoundingClientRect();if(rect.bottom>0&&rect.top<innerHeight)target.focus({preventScroll:true});}
        });
      }
      list.addEventListener("click", (event) => {
        const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[data-media-id]") : null;
        if (!link || !list.contains(link) || !ordinaryClick(event, link) || !listPath(location.pathname)) return;
        candidate = undefined;
        const id = link.dataset.mediaId;
        const to = new URL(link.href, location.href);
        const index: unknown = history.state?.index;
        if (!id || to.origin !== location.origin || to.pathname !== detailPath(id) || !mediaHistoryIndex(index)) return;
        const position = { key: list.dataset.mediaKey ?? logicalPath(location.pathname) ?? "", mediaId: id, scrollY: Math.max(0, window.scrollY) };
        if (!readMediaHistory({ baoziMedia: { version: 1, list: position } }).list) return;
        if (replace({ list: position, originIndex: undefined, detailId: undefined })) {
          candidate = { source: link, to: to.href, list: position, originIndex: index, detailId: id };
        }
      }, { signal });
    }
    if(detail){
      const back=detail.querySelector<HTMLAnchorElement>('[data-media-return]');
      let allowed:string[]=[];
      try{const parsed:unknown=JSON.parse(detail.dataset.mediaReturns??'[]');if(Array.isArray(parsed))allowed=parsed.filter((v):v is string=>typeof v==='string');}catch{}
      const requested=new URL(location.href).searchParams.get('from');
      if(back&&requested){const normalized=requested.split('#')[0]+`#media-${detail.dataset.mediaId}`;if(allowed.includes(normalized)&&(!requested.includes('#')||requested===normalized))back.href=normalized;}
    }
    if (detail && detail.dataset.mediaId && location.pathname.replace(/\/$/, "") === detailPath(detail.dataset.mediaId)) {
      detail.addEventListener("click", (event) => {
        const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[data-media-return]") : null;
        if (!link || !detail.contains(link) || !ordinaryClick(event, link)) return;
        const to = new URL(link.href, location.href);
        if (to.origin !== location.origin || !listPath(to.pathname)) return;
        candidate = undefined;
        if (backRequested) { event.preventDefault(); return; }
        const meta = readMediaHistory(history.state);
        if (meta.detailId !== detail.dataset.mediaId || !meta.list || logicalPath(to.pathname)!==meta.list.key) return;
        if (canReturnToMediaList(meta, history.state?.index, location.pathname)) {
          event.preventDefault();
          const pointer = event as PointerEvent;
          if (pointer.pointerType === "mouse" && pointer.detail === 1) {
            returnGesture = { source: link, x: pointer.clientX, y: pointer.clientY, pointerId: pointer.pointerId, startedAt: pointer.timeStamp, pendingPress: false, repeated: false };
          }
          backRequested = true;
          history.back();
        } else if (meta.list && meta.list.mediaId === meta.detailId) {
          candidate = { source: link, to: to.href, list: meta.list };
        }
      }, { signal });
    }
  }

  for (const type of ["pointerdown", "mousedown", "keydown", "wheel", "touchstart", "click"]) {
    document.addEventListener(type, (event) => {
      if (continuesReturn(event)) return;
      returnGesture = undefined;
      cancelRestore();
      if (active) active.restore = false;
    }, { capture: true, passive: true });
  }
  document.addEventListener("astro:before-preparation", (event: TransitionBeforePreparationEvent) => {
    cancelRestore();
    clearNavigation();
    const transfer = event.navigationType === "push" && candidate && candidate.source === event.sourceElement
      && candidate.to === event.to.href && event.to.origin === location.origin ? candidate : undefined;
    candidate = undefined;
    const navigation: Navigation = { signal: event.signal, to: event.to, transfer, swapped: false, restore: true, detach: () => {} };
    active = navigation;
    if (returnGesture && !returnGesture.navigation && backRequested && event.navigationType === "traverse" && listPath(event.to.pathname)) {
      returnGesture.navigation = navigation;
    } else returnGesture = undefined;
    const cancel = () => {
      if (active !== navigation) return;
      navigation.transfer = undefined;
      navigation.restore = false;
      backRequested = false;
      returnGesture = undefined;
      cancelRestore();
    };
    event.signal.addEventListener("abort", cancel, { once: true });
    navigation.detach = () => event.signal.removeEventListener("abort", cancel);
    const load = event.loader;
    event.loader = async () => {
      try { await load(); }
      catch (error) { cancel(); throw error; }
      finally {
        if (event.defaultPrevented || event.signal.aborted) cancel();
        navigation.to = event.to;
      }
    };
  });
  document.addEventListener("astro:before-swap", (event: TransitionBeforeSwapEvent) => {
    dispose();
    swapping = active?.signal === event.signal && !event.signal.aborted ? active : undefined;
    if (swapping) swapping.to = event.to;
  });
  document.addEventListener("astro:after-swap", () => {
    const navigation = swapping;
    swapping = undefined;
    if (!navigation || navigation !== active || navigation.signal.aborted || navigation.to.href !== location.href) return;
    navigation.swapped = true;
    const transfer = navigation.transfer;
    if (!transfer || transfer.to !== location.href) return;
    if (transfer.detailId && document.querySelector<HTMLElement>("[data-media-detail]")?.dataset.mediaId === transfer.detailId) {
      const originIndex = history.state?.index === (transfer.originIndex ?? NaN) + 1 ? transfer.originIndex : undefined;
      replace({ list: transfer.list, detailId: transfer.detailId, originIndex });
    } else if (!transfer.detailId && listPath(location.pathname) && document.querySelector("[data-media-list]")) {
      replace({ list: transfer.list, detailId: undefined, originIndex: undefined });
    }
    navigation.transfer = undefined;
  });
  document.addEventListener("astro:page-load", () => {
    if (active && (!active.swapped || active.signal.aborted || active.to.href !== location.href)) return;
    mount(active?.restore ?? true);
    if (!returnGesture?.pendingPress) returnGesture = undefined;
    clearNavigation();
  });
  window.addEventListener("pagehide", () => {
    dispose();
    clearNavigation();
    candidate = swapping = undefined;
    backRequested = false;
    returnGesture = undefined;
  });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) { clearNavigation(); mount(); }
  });
  mount();
}
