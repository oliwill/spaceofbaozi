import { logicalPath } from "@/lib/site/paths";
export interface ProjectListPosition { key: string; projectId: string; scrollY: number }
export interface ProjectHistory { version: 1; list?: ProjectListPosition; originIndex?: number; detailId?: string }

const record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0 && value.length <= 1000;
export const projectHistoryIndex = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

export function readProjectHistory(state: unknown): ProjectHistory {
  const empty: ProjectHistory = { version: 1 };
  if (!record(state) || !record(state.baoziProjects) || state.baoziProjects.version !== 1) return empty;
  const value = state.baoziProjects;
  if (value.originIndex !== undefined && !projectHistoryIndex(value.originIndex)) return empty;
  if (value.detailId !== undefined && !text(value.detailId)) return empty;
  let list: ProjectListPosition | undefined;
  if (value.list !== undefined) {
    const position = value.list;
    if (!record(position) || !text(position.key) || !text(position.projectId)
      || typeof position.scrollY !== "number" || !Number.isFinite(position.scrollY) || position.scrollY < 0) return empty;
    list = { key: position.key, projectId: position.projectId, scrollY: position.scrollY };
  }
  return {
    version: 1,
    ...(list ? { list } : {}),
    ...(value.originIndex !== undefined ? { originIndex: value.originIndex as number } : {}),
    ...(value.detailId !== undefined ? { detailId: value.detailId as string } : {}),
  };
}

export function mergeProjectHistory(state: unknown, update: Partial<ProjectHistory>): Record<string, unknown> {
  return { ...(record(state) ? state : {}), baoziProjects: readProjectHistory({ baoziProjects: { ...readProjectHistory(state), ...update, version: 1 } }) };
}

export function canReturnToProjectList(meta: ProjectHistory, index: unknown, pathname: string): boolean {
  const safe = readProjectHistory({ baoziProjects: meta });
  if (!projectHistoryIndex(index) || !projectHistoryIndex(safe.originIndex)
    || index !== safe.originIndex + 1 || !safe.list || safe.list.projectId !== safe.detailId) return false;
  try { return logicalPath(pathname)?.replace(/\/$/, "") === `/projects/${encodeURI(safe.detailId)}`; }
  catch { return false; }
}
