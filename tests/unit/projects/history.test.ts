import { describe, expect, it } from "vitest";
import { canReturnToProjectList, mergeProjectHistory, readProjectHistory, type ProjectHistory } from "@/lib/projects/history";

const list = { key: "list-visit", projectId: "sample-project", scrollY: 712.5 };
const meta: ProjectHistory = { version: 1, list, originIndex: 3, detailId: list.projectId };
const state = (value: unknown) => ({ baoziProjects: value });

describe("project history", () => {
  it.each([null, undefined, 1, "state", [], {}, { baoziProjects: [] }, state({ version: 0 }), state({ version: "1" })])("ignores absent or malformed state %j", (value) => {
    expect(readProjectHistory(value)).toEqual({ version: 1 });
  });

  it.each([-1, NaN, Infinity, -Infinity, "12", null])("rejects invalid scrollY %j", (scrollY) => {
    expect(readProjectHistory(state({ ...meta, list: { ...list, scrollY } }))).toEqual({ version: 1 });
  });

  it.each(["", "   ", "x".repeat(1001), 1, null])("rejects invalid key or project id %j", (value) => {
    for (const field of ["key", "projectId"]) {
      expect(readProjectHistory(state({ ...meta, list: { ...list, [field]: value } }))).toEqual({ version: 1 });
    }
    expect(readProjectHistory(state({ ...meta, detailId: value }))).toEqual({ version: 1 });
  });

  it.each([-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, "3", null])("rejects invalid originIndex %j", (originIndex) => {
    expect(readProjectHistory(state({ ...meta, originIndex }))).toEqual({ version: 1 });
  });

  it("copies the known fields, accepts zero and text at the bound, and drops unknown data", () => {
    const value = { ...meta, list: { ...list, key: "x".repeat(1000), scrollY: 0, secret: "drop" }, secret: "drop" };
    const result = readProjectHistory(state(value));
    expect(result).toEqual({ ...meta, list: { ...list, key: "x".repeat(1000), scrollY: 0 } });
    expect(result.list).not.toBe(value.list);
  });

  it("merges only its namespace and does not mutate Astro or album state", () => {
    const original = { index: 4, scrollX: 0, scrollY: 20, __astro: "keep", baoziAlbum: { version: 1, albumId: "album" }, baoziProjects: meta };
    const result = mergeProjectHistory(original, { detailId: "other", originIndex: undefined });
    expect(result).toEqual({ ...original, baoziProjects: { version: 1, list, detailId: "other" } });
    expect(result.baoziAlbum).toBe(original.baoziAlbum);
    expect(original.baoziProjects).toEqual(meta);
  });

  it("clears only the requested optional fields and sanitizes updates", () => {
    expect(mergeProjectHistory(state(meta), { list: undefined, originIndex: undefined, detailId: undefined })).toEqual(state({ version: 1 }));
    expect(mergeProjectHistory(null, { list })).toEqual(state({ version: 1, list }));
    expect(mergeProjectHistory(state(meta), { list: { ...list, scrollY: -1 } })).toEqual(state({ version: 1 }));
  });

  it("returns only from the matching adjacent detail with a valid snapshot", () => {
    expect(canReturnToProjectList(meta, 4, "/projects/sample-project")).toBe(true);
    expect(canReturnToProjectList(meta, 4, "/projects/sample-project/")).toBe(true);
    expect(canReturnToProjectList({ ...meta, originIndex: 0 }, 1, "/projects/sample-project")).toBe(true);
    for (const index of [undefined, null, "4", NaN, Infinity, 3, 5, 4.5]) {
      expect(canReturnToProjectList(meta, index, "/projects/sample-project")).toBe(false);
    }
    for (const pathname of ["/projects", "/projects/other", "/blog/sample-project", "/projects/sample-project/extra"]) {
      expect(canReturnToProjectList(meta, 4, pathname)).toBe(false);
    }
    for (const invalid of [{ version: 1 }, { ...meta, originIndex: undefined }, { ...meta, list: undefined }, { ...meta, detailId: "other" }, { ...meta, list: { ...list, projectId: "other" } }, { ...meta, list: { ...list, scrollY: NaN } }]) {
      expect(canReturnToProjectList(invalid as ProjectHistory, 4, "/projects/sample-project")).toBe(false);
    }
  });

  it("matches encoded detail ids without treating URL syntax as the identity", () => {
    const chinese = { ...meta, detailId: "项目", list: { ...list, projectId: "项目" } };
    expect(canReturnToProjectList(chinese, 4, "/projects/%E9%A1%B9%E7%9B%AE")).toBe(true);
    for (const detailId of ["sample-project?query", "sample-project#hash", "sample-project/..", "\ud800"]) {
      expect(canReturnToProjectList({ ...meta, detailId, list: { ...list, projectId: detailId } }, 4, "/projects/sample-project")).toBe(false);
    }
  });
});
