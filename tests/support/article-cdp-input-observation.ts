import type { Page, TestInfo } from "@playwright/test";
import { createArticleRules, type ArticleRecord } from "./real-input-observation";

interface CdpRecord extends ArticleRecord {
  clientX?: number;
  clientY?: number;
  wheelInProse?: boolean;
  wheelBlockedPath?: string[];
  eventPath?: string[];
  pointerType?: string;
  pointerInProse?: boolean;
}
interface Evidence {
  prearmAt: number;
  timeOrigin: number;
  token: string;
  state: ReturnType<typeof createArticleRules>["state"];
  records: CdpRecord[];
  bodyMove?: CdpRecord;
  postWheelFrames: { count: number; firstAt?: number; lastAt?: number; minimumHeadingTop?: number; maximumY?: number };
}
interface Milestone {
  kind: string;
  token: string;
  documentId: string;
  seq: number;
  at: number;
  phase: string;
  failure?: string;
  clickSeq?: number;
  gateSeqs?: number[];
  bodyMoveSeq?: number;
  evidence?: Evidence;
}
interface Observer {
  arm(): Evidence;
  read(): Evidence;
  clickSucceeded(): void;
  final(): Evidence;
  dispose(): Evidence;
}
type ObservedWindow = Window & { __baoziArticleCdpInput?: Observer };

// Keep the original rules, event order, and initial hash/focus handshake. Only
// milestones cross the binding; per-frame geometry stays in this document.
function installObservation(makeRules: typeof createArticleRules, binding: string, token: string) {
  const rules = makeRules(), records: CdpRecord[] = [], prearmAt = performance.now();
  const documentId = `${performance.timeOrigin}:${token}`;
  const ids = new WeakMap<Element, number>();
  const postWheelFrames: Evidence["postWheelFrames"] = { count: 0 };
  let nextId = 0, seq = 0, armed = false, stopped = false, raf = 0, reportedFailure = false;
  let acceptedClick: Event | undefined, clickTrigger: Element | null = null;
  let bodyMove: CdpRecord | undefined, inputReadySent = false;
  const abort = new AbortController();
  const id = (element: Element | null) => {
    if (!element) return 0;
    if (!ids.has(element)) ids.set(element, ++nextId);
    return ids.get(element)!;
  };
  const snapshot = (kind: string, event?: Event): CdpRecord => {
    const heading = document.querySelector('[data-reading-prose] [id="芝浜"]');
    const prose = document.querySelector("[data-reading-prose]");
    const dock = document.querySelector<HTMLElement>("[data-reading-obstruction]");
    const target = event?.target instanceof Element ? event.target : null;
    const mouse = event instanceof MouseEvent ? event : null;
    const wheel = event instanceof WheelEvent ? event : null;
    const pointer = event instanceof PointerEvent ? event : null;
    const key = event instanceof KeyboardEvent ? event : null;
    const path = (wheel ?? pointer)?.composedPath().filter((node): node is Element => node instanceof Element);
    const preventAttributes = ["data-lenis-prevent", "data-lenis-prevent-wheel", "data-lenis-prevent-vertical"];
    return {
      kind, seq: ++seq, at: performance.now(), documentId, headingId: id(heading), pathname: location.pathname, hash: location.hash,
      url: `${location.origin}${location.pathname}${location.search}`, activeId: id(document.activeElement),
      targetId: id(target?.closest('[data-reading-link="芝浜"]') ?? target),
      clickDispatch: !!acceptedClick?.isTrusted && acceptedClick.defaultPrevented && acceptedClick.eventPhase !== 0
        && acceptedClick.currentTarget === clickTrigger,
      historyNull: event instanceof PopStateEvent ? event.state === null : undefined,
      y: scrollY, headingTop: heading?.getBoundingClientRect().top ?? NaN,
      safeOffset: dock ? (Number.parseFloat(getComputedStyle(dock).top) || 0) + dock.getBoundingClientRect().height + 16 : NaN,
      smooth: document.documentElement.classList.contains("lenis-scrolling") && document.documentElement.classList.contains("lenis-smooth"),
      focused: !!heading && document.activeElement === heading, reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
      active: `${document.activeElement?.tagName ?? "none"}#${document.activeElement?.id ?? ""}`,
      target: target?.closest('[data-reading-link="芝浜"]') ? "link" : `${target?.tagName ?? "none"}#${target?.id ?? ""}`,
      trusted: event?.isTrusted, button: mouse?.button, buttons: mouse?.buttons,
      modified: !!(mouse?.altKey || mouse?.ctrlKey || mouse?.metaKey || mouse?.shiftKey || key?.altKey || key?.ctrlKey || key?.metaKey || key?.shiftKey),
      deltaX: wheel?.deltaX, deltaY: wheel?.deltaY, deltaMode: wheel?.deltaMode, eventAt: event?.timeStamp,
      classes: document.documentElement.className, historyState: event instanceof PopStateEvent ? !!event.state : undefined,
      clientX: (wheel ?? pointer)?.clientX, clientY: (wheel ?? pointer)?.clientY,
      wheelInProse: wheel ? !!prose && !!target && prose.contains(target) && !!path?.includes(prose) : undefined,
      wheelBlockedPath: path?.flatMap((element) => preventAttributes.filter((attribute) => element.hasAttribute(attribute))),
      eventPath: path?.map((element) => `${element.tagName}#${element.id}`),
      pointerType: pointer?.pointerType,
      pointerInProse: pointer ? !!prose && !!target && prose.contains(target) && !!path?.includes(prose) : undefined,
    };
  };
  const read = (): Evidence => ({
    prearmAt, timeOrigin: performance.timeOrigin, token, state: { ...rules.state },
    records: [...records], bodyMove, postWheelFrames: { ...postWheelFrames },
  });
  const signal = (kind: string, r: CdpRecord) => {
    const callback = (window as unknown as Record<string, (milestone: Milestone) => Promise<void>>)[binding];
    const milestone: Milestone = {
      kind, token, documentId, seq: r.seq, at: r.at, phase: rules.state.phase,
      failure: rules.state.failure,
      clickSeq: rules.state.click?.seq,
      gateSeqs: kind === "gate" || kind === "input-ready" ? rules.state.gate?.map((sample) => sample.seq) : undefined,
      bodyMoveSeq: kind === "input-ready" ? bodyMove?.seq : undefined,
      evidence: kind === "failed" ? read() : undefined,
    };
    void callback(milestone).catch((error: unknown) => { rules.fail(`binding rejected: ${String(error)}`); });
  };
  const record = (kind: string, event?: Event) => {
    if (!armed || stopped) return;
    const r = snapshot(kind, event); records.push(r);
    if (["beforeunload", "astro:before-swap", "astro:after-swap"].includes(kind)) rules.fail(`unexpected ${kind}`);
    if (kind === "wheel" && (r.clientX !== 1000 || r.clientY !== 500 || !r.wheelInProse || r.wheelBlockedPath?.length)) {
      rules.fail("actual wheel did not target unblocked prose at 1000,500");
    }
    if (kind === "pointermove" && rules.state.click && r.clientX === 1000 && r.clientY === 500) {
      if (bodyMove || !r.trusted || r.pointerType !== "mouse" || r.buttons !== 0 || r.modified
        || !r.pointerInProse || r.wheelBlockedPath?.length || rules.state.wheel) {
        rules.fail("invalid or repeated post-click prose pointer move");
      } else bodyMove = r;
    }
    if (kind === "raf" && rules.state.wheel) {
      postWheelFrames.count += 1;
      postWheelFrames.firstAt ??= r.at;
      postWheelFrames.lastAt = r.at;
      postWheelFrames.minimumHeadingTop = Math.min(postWheelFrames.minimumHeadingTop ?? Infinity, r.headingTop);
      postWheelFrames.maximumY = Math.max(postWheelFrames.maximumY ?? -Infinity, r.y);
      if (!Number.isFinite(r.headingTop) || r.headingTop <= 300 || r.focused) {
        rules.fail("target returned or focused during post-wheel RAF observation");
      }
    }
    const result = rules.accept(r);
    if (result === "click") {
      acceptedClick = event;
      clickTrigger = event?.target instanceof Element ? event.target.closest('[data-reading-link="芝浜"]') : null;
    }
    if (rules.state.failure && !reportedFailure) { reportedFailure = true; signal("failed", r); }
    else if (result) signal(result, r);
    if (!rules.state.failure && rules.state.phase === "gate-sent" && bodyMove && !inputReadySent) {
      inputReadySent = true;
      signal("input-ready", r);
    }
  };
  for (const kind of ["click", "mouseup", "wheel", "pointerdown", "touchstart", "keydown", "pointermove", "focusin", "scroll", "hashchange", "popstate", "beforeunload"]) {
    window.addEventListener(kind, (event) => record(kind, event), { capture: true, passive: true, signal: abort.signal });
  }
  for (const kind of ["astro:before-preparation", "astro:after-preparation", "astro:before-swap", "astro:after-swap", "astro:page-load"]) {
    document.addEventListener(kind, (event) => record(kind, event), { capture: true, passive: true, signal: abort.signal });
  }
  const frame = () => { if (stopped) return; record("raf"); raf = requestAnimationFrame(frame); };
  raf = requestAnimationFrame(frame);
  (window as ObservedWindow).__baoziArticleCdpInput = {
    arm() { armed = true; record("arm"); return read(); }, read,
    clickSucceeded() { rules.clickSucceeded(); },
    final() { record("final"); return read(); },
    dispose() { stopped = true; abort.abort(); cancelAnimationFrame(raf); rules.dispose(); return read(); },
  };
}

export async function observeCdpArticleInput(page: Page, testInfo: TestInfo) {
  const binding = "__baoziArticleCdpSignal", token = `article-cdp-${testInfo.testId}`;
  const session = await page.context().newCDPSession(page);
  const commands: { action: string; at: number; error?: string; params?: object }[] = [];
  const milestones: Milestone[] = [], secondaryErrors: string[] = [], otherDocumentObservations: unknown[] = [];
  const actions: Promise<unknown>[] = [];
  const pendingActions = new Set<string>();
  let evidence: Evidence | undefined, armedDocument: string | undefined, active = true, gateSent = false, primary: Error | undefined;
  let move: Promise<void> | undefined, wheelSubmitted = false, terminalSeen = false, latestSeq = 0;
  const terminal = (phase?: string) => ["failed", "disposed", "complete"].includes(phase ?? "");
  const deferred = () => {
    let resolve!: () => void, reject!: (error: Error) => void;
    const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
    void promise.catch(() => {});
    return { promise, resolve, reject };
  };
  const failure = deferred(), moveApi = deferred(), wheelApi = deferred(), wheelCapture = deferred(), horizon = deferred(), deadline = deferred();
  const note = (action: string, error?: string, params?: object) => commands.push({ action, at: performance.now(), error, params });
  const fail = (error: unknown) => {
    const reason = error instanceof Error ? error : Error(String(error));
    if (!primary) primary = reason; else if (primary !== reason) secondaryErrors.push(reason.message);
    active = false;
    for (const waiter of [failure, moveApi, wheelApi, wheelCapture, horizon]) waiter.reject(primary);
  };
  const stillActive = () => {
    if (!active) return false;
    if (testInfo.status !== "passed") { fail(Error(`original test boundary: ${testInfo.status}`)); return false; }
    return true;
  };
  const keepEvidence = (next: Evidence) => {
    if (next.token !== token || armedDocument && next.state.initial?.documentId !== armedDocument) {
      otherDocumentObservations.push({ token: next.token, documentId: next.state.initial?.documentId, phase: next.state.phase, recordCount: next.records.length });
      return false;
    }
    if (!evidence || next.records.length >= evidence.records.length
      && (!terminal(evidence.state.phase) || next.state.phase === evidence.state.phase)) evidence = next;
    return true;
  };
  const canInput = () => stillActive() && !terminalSeen && !terminal(evidence?.state.phase);
  const track = (name: string, operation: () => Promise<unknown>, params?: object) => {
    const action = Promise.resolve().then(async () => {
      if (!canInput()) return;
      note(`${name}:begin`, undefined, params); pendingActions.add(name);
      try { await operation(); note(`${name}:end`); }
      catch (error) { note(`${name}:error`, String(error)); fail(error); throw error; }
      finally { pendingActions.delete(name); }
    });
    void action.catch(() => {}); actions.push(action); return action;
  };
  const queueMove = () => {
    move ??= track("move", async () => {
      await session.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 1000, y: 500, button: "none", buttons: 0, modifiers: 0 });
      stillActive();
    }, { type: "mouseMoved", x: 1000, y: 500, button: "none", buttons: 0, modifiers: 0 });
    void move.then(moveApi.resolve, () => {});
  };
  const onClose = () => { fail(Error("article page closed")); deadline.resolve(); };
  const onCrash = () => { fail(Error("article page crashed")); deadline.resolve(); };
  page.on("close", onClose); page.on("crash", onCrash);
  try {
    await page.exposeBinding(binding, (source, milestone: Milestone) => {
      if (!stillActive()) return;
      milestones.push(milestone);
      if (source.page !== page || source.frame !== page.mainFrame() || milestone.token !== token
        || !armedDocument || milestone.documentId !== armedDocument) {
        fail(Error("wrong milestone source/token/document")); return;
      }
      if (milestone.evidence && !keepEvidence(milestone.evidence)) { fail(Error("milestone evidence document changed")); return; }
      if (milestone.failure || milestone.kind === "failed") { fail(Error(milestone.failure ?? "browser observation failed")); return; }
      if (terminal(milestone.phase)) terminalSeen = true;
      if (!canInput()) return;
      if (!Number.isInteger(milestone.seq) || milestone.seq <= 0) { fail(Error("invalid milestone sequence")); return; }
      if (milestone.seq < latestSeq) return;
      latestSeq = milestone.seq;
      const inputSignal = ["click", "gate", "input-ready"].includes(milestone.kind);
      const gate = milestone.gateSeqs;
      const acceptedClick = Number.isInteger(milestone.clickSeq) && milestone.clickSeq! > 0 && milestone.clickSeq! <= milestone.seq;
      const acceptedGate = gate?.length === 2 && gate.every(Number.isInteger)
        && gate[0] > milestone.clickSeq! && gate[0] < gate[1] && gate[1] <= milestone.seq;
      if (inputSignal && (!acceptedClick || milestone.kind === "click" && milestone.phase !== "clicked"
        || milestone.kind !== "click" && (milestone.phase !== "gate-sent" || !acceptedGate))) {
        fail(Error("input signal without accepted click/gate")); return;
      }
      if (inputSignal && !move) queueMove();
      if (milestone.kind === "wheel") {
        if (!wheelSubmitted || milestone.phase !== "wheel-captured") { fail(Error("wheel without accepted gate/capture")); return; }
        wheelCapture.resolve();
      }
      if (milestone.kind === "horizon") {
        if (!gateSent || milestone.phase !== "horizon-captured") { fail(Error("horizon without accepted wheel")); return; }
        horizon.resolve();
      }
      if (milestone.kind !== "input-ready" || gateSent) return;
      if (!move || !Number.isInteger(milestone.bodyMoveSeq) || milestone.bodyMoveSeq! <= milestone.clickSeq! || milestone.bodyMoveSeq! > milestone.seq) {
        fail(Error("input signal without accepted two-RAF gate and actual body move")); return;
      }
      gateSent = true;
      note("input-ready:received");
      const params = { type: "mouseWheel" as const, x: 1000, y: 500, deltaX: 0, deltaY: -500, modifiers: 0, buttons: 0 };
      const command = move.then(async () => {
        if (!canInput()) return;
        await track("wheel", async () => { wheelSubmitted = true; await session.send("Input.dispatchMouseEvent", params); }, params);
        if (canInput()) wheelApi.resolve();
      });
      void command.catch(fail); actions.push(command);
    });
    await page.addInitScript({ content: `(${installObservation.toString()})(${createArticleRules.toString()}, ${JSON.stringify(binding)}, ${JSON.stringify(token)});` });
  } catch (error) {
    fail(error); page.off("close", onClose); page.off("crash", onCrash);
    await session.detach().catch(() => {}); throw error;
  }
  return {
    async run(click: () => Promise<void>) {
      if (!stillActive()) throw primary;
      evidence = await page.evaluate(() => (window as ObservedWindow).__baoziArticleCdpInput!.arm());
      armedDocument = evidence.state.initial?.documentId;
      latestSeq = evidence.records.at(-1)?.seq ?? 0;
      if (!stillActive()) throw primary;
      if (evidence.state.failure || !armedDocument) { fail(Error(evidence.state.failure ?? "observer did not arm")); throw primary; }
      const clickAction = track("click", async () => {
        await click();
        if (stillActive()) await page.evaluate(() => (window as ObservedWindow).__baoziArticleCdpInput!.clickSucceeded());
      });
      await Promise.race([Promise.all([clickAction, moveApi.promise, wheelApi.promise, wheelCapture.promise, horizon.promise]), failure.promise]);
      const final = await page.evaluate(() => {
        const observer = (window as ObservedWindow).__baoziArticleCdpInput!;
        const result = observer.final(); observer.dispose(); return result;
      });
      if (!keepEvidence(final)) { fail(Error("document changed at final snapshot")); throw primary; }
      if (final.state.phase !== "complete" || final.postWheelFrames.count === 0
        || final.records.filter((record) => record.kind === "wheel").length !== 1
        || !final.bodyMove || !final.state.wheel || final.bodyMove.seq >= final.state.wheel.seq
        || !final.state.horizon || final.state.horizon.at - final.state.wheel.at < 1500
        || (final.postWheelFrames.minimumHeadingTop ?? -Infinity) <= 300) {
        fail(Error(final.state.failure ?? "incomplete actual wheel/horizon/final observation")); throw primary;
      }
      active = false;
      return final;
    },
    async finish(extra: unknown) {
      active = false;
      for (const waiter of [failure, moveApi, wheelApi, wheelCapture, horizon]) waiter.reject(primary ?? Error("observer disposed"));
      try {
        if (evidence?.state.phase !== "complete") {
          const current = await page.evaluate(() => (window as ObservedWindow).__baoziArticleCdpInput?.dispose());
          if (current && !keepEvidence(current)) secondaryErrors.push("evidence document changed during cleanup");
        }
      } catch (error) { secondaryErrors.push(`evidence/cleanup: ${String(error)}`); }
      await Promise.race([Promise.allSettled(actions), deadline.promise]);
      try { await session.detach(); } catch (error) { secondaryErrors.push(`CDP detach: ${String(error)}`); }
      page.off("close", onClose); page.off("crash", onCrash);
      await testInfo.attach("article-real-input-observation", {
        body: JSON.stringify({
          evidence, commands, milestones, pendingActions: [...pendingActions], testStatus: testInfo.status,
          primary: primary?.message, secondaryErrors, otherDocumentObservations, extra, transport: "cdp",
        }, null, 2),
        contentType: "application/json",
      });
    },
  };
}
