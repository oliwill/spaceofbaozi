import { describe, expect, it } from "vitest";
import { isPublishable } from "@/lib/content/gates";

describe("isPublishable（D-127 生产门禁）", () => {
  it("只有 draft:false 且 approved:true 才发布", () => {
    expect(isPublishable({ draft: false, approved: true })).toBe(true);
    expect(isPublishable({ draft: false, approved: false })).toBe(false);
    expect(isPublishable({ draft: true, approved: true })).toBe(false);
    expect(isPublishable({ draft: true, approved: false })).toBe(false);
  });
});
