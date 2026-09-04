import { describe, expect, it } from "vitest";
import { adjacentIndices } from "@/lib/photos/lightboxPreload";

describe("adjacentIndices", () => {
  it("returns both neighbors for a middle index", () => {
    expect(adjacentIndices(2, 5)).toEqual([1, 3]);
  });

  it("returns one neighbor at the boundaries", () => {
    expect(adjacentIndices(0, 3)).toEqual([1]);
    expect(adjacentIndices(2, 3)).toEqual([1]);
  });

  it("returns empty for an empty list", () => {
    expect(adjacentIndices(0, 0)).toEqual([]);
  });
  it("returns empty for an out-of-range index", () => {
    expect(adjacentIndices(-1, 3)).toEqual([]);
    expect(adjacentIndices(3, 3)).toEqual([]);
  });
});
