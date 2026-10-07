import { logicalPath } from "@/lib/site/paths";
export interface MediaListPosition { key: string; mediaId: string; scrollY: number }
export interface MediaHistory { version: 1; list?: MediaListPosition; originIndex?: number; detailId?: string }

const record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0 && value.length <= 1000;
export const mediaHistoryIndex = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

export function readMediaHistory(state: unknown): MediaHistory {
  const empty: MediaHistory = { version: 1 };
  if (!record(state) || !record(state.baoziMedia) || state.baoziMedia.version !== 1) return empty;
  const value = state.baoziMedia;
  if (value.originIndex !== undefined && !mediaHistoryIndex(value.originIndex)) return empty;
  if (value.detailId !== undefined && !text(value.detailId)) return empty;
  let list: MediaListPosition | undefined;
  if (value.list !== undefined) {
    const position = value.list;
    if (!record(position) || !text(position.key) || !/^\/media(?:\/y\/\d{4}|\/undated)?(?:\/(?:book|movie|music))?(?:\/d\/\d{4}-\d{2}-\d{2})?(?:\/p\/[1-9]\d*)?$/.test(position.key) || !text(position.mediaId)
      || typeof position.scrollY !== "number" || !Number.isFinite(position.scrollY) || position.scrollY < 0) return empty;
    list = { key: position.key, mediaId: position.mediaId, scrollY: position.scrollY };
  }
  return {
    version: 1,
    ...(list ? { list } : {}),
    ...(value.originIndex !== undefined ? { originIndex: value.originIndex as number } : {}),
    ...(value.detailId !== undefined ? { detailId: value.detailId as string } : {}),
  };
}

export function mergeMediaHistory(state: unknown, update: Partial<MediaHistory>): Record<string, unknown> {
  return { ...(record(state) ? state : {}), baoziMedia: readMediaHistory({ baoziMedia: { ...readMediaHistory(state), ...update, version: 1 } }) };
}

export function canReturnToMediaList(meta: MediaHistory, index: unknown, pathname: string): boolean {
  const safe = readMediaHistory({ baoziMedia: meta });
  if (!mediaHistoryIndex(index) || !mediaHistoryIndex(safe.originIndex)
    || index !== safe.originIndex + 1 || !safe.list || safe.list.mediaId !== safe.detailId) return false;
  try { return logicalPath(pathname)?.replace(/\/$/, "") === `/media/item/${encodeURI(safe.detailId)}`; }
  catch { return false; }
}
