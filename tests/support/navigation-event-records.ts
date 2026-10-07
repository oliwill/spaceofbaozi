export interface PreparationRecord {
  type: string;
  pathname: string | null;
}

export interface PaperExitAnimationRecord {
  type: string;
  animationName: string;
  pseudoElement: string;
  isTrusted: boolean;
  targetIsExit: boolean;
  direction: string | null;
  computedAnimationName: string;
  durationMs: number;
}

export function hasBlogPreparation(records: readonly PreparationRecord[]): boolean {
  return records.some(({ type, pathname }) => type === "astro:before-preparation" && pathname === "/blog");
}

export function isBackPaperExitStart(record: PaperExitAnimationRecord): boolean {
  return record.type === "animationstart"
    && record.animationName === "paper-exit-move"
    && record.pseudoElement === ""
    && record.isTrusted
    && record.targetIsExit
    && record.direction === "back"
    && record.computedAnimationName.split(",").some((name) => name.trim() === "paper-exit-move")
    && Number.isFinite(record.durationMs)
    && record.durationMs > 0;
}
