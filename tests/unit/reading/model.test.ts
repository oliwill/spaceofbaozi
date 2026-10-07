import { describe, expect, it } from "vitest";
import { activeHeadingIndex, groupReadingHeadings, readingDogFrame, readingDogPosition, readingFraction, readingProgress, majorReadingHeadings } from "@/lib/reading/model";

describe("正文阅读口径", () => {
  it("从正文首行起算，在正文末尾进入视口底部时完成，之后不继续增长", () => {
    expect(readingProgress(0, 600, 4600, 900, 32)).toBe(0);
    expect(readingProgress(568, 600, 4600, 900, 32)).toBe(0);
    expect(readingProgress(2134, 600, 4600, 900, 32)).toBe(50);
    expect(readingProgress(3700, 600, 4600, 900, 32)).toBe(100);
    expect(readingProgress(7000, 600, 4600, 900, 32)).toBe(100);
    expect(readingProgress(2134, 600, 4600, 900, 32)).toBe(50);
  });

  it("短文完全可见即100%，还没进入视口时0%，空正文不产生NaN", () => {
    expect(readingProgress(0, 300, 650, 900, 32)).toBe(100);
    expect(readingProgress(0, 1000, 1300, 900, 32)).toBe(0);
    expect(readingProgress(400, 1000, 1300, 900, 32)).toBe(100);
    expect(readingProgress(0, 0, 0, 900, 32)).toBe(100);
  });

  it("追球用连续进度，不把取整后的百分比当位移", () => {
    expect(readingFraction(600, 600, 4600, 900, 32)).toBeCloseTo(32 / 3132, 8);
    expect(readingProgress(600, 600, 4600, 900, 32)).toBe(1);
  });
});

describe("嘉乐追球进度", () => {
  it("从左端出发，正文结束停在球前8px，回滚原路退回", () => {
    expect(readingDogPosition(0, 250, 42)).toBe(0);
    expect(readingDogPosition(0.5, 250, 42)).toBe(100);
    expect(readingDogPosition(1, 250, 42)).toBe(200);
    expect(readingDogPosition(0.25, 250, 42)).toBe(50);
    expect(readingDogPosition(-1, 250, 42)).toBe(0);
    expect(readingDogPosition(2, 250, 42)).toBe(200);
  });

  it("轨道缩窄重算行程，极窄轨道不出现负位移", () => {
    expect(readingDogPosition(0.5, 150, 42)).toBe(50);
    expect(readingDogPosition(1, 20, 42)).toBe(0);
  });

  it("帧相位只由8px行程决定，减少动效始终使用静止帧", () => {
    expect([0, 7, 8, 16, 24, 32, 16].map((x) => readingDogFrame(x, false))).toEqual([0, 0, 1, 2, 3, 0, 2]);
    expect([0, 8, 160, 200].map((x) => readingDogFrame(x, true))).toEqual([0, 0, 0, 0]);
    expect(readingDogFrame(200, false, true)).toBe(0);
  });
});

describe("章节定位", () => {
  it("取最后一个越过阅读线的标题，快滚、反向和正文末尾都有确定结果", () => {
    const positions = [600, 1200, 1450, 2900];
    expect(activeHeadingIndex(positions, 400)).toBe(0);
    expect(activeHeadingIndex(positions, 1450)).toBe(2);
    expect(activeHeadingIndex(positions, 3000)).toBe(3);
    expect(activeHeadingIndex(positions, 700)).toBe(0);
    expect(activeHeadingIndex(positions, 2000, true)).toBe(3);
    expect(activeHeadingIndex([], 400)).toBe(-1);
  });

  it("H3隶属前一个H2，孤立H3保留，H4不挤入目录", () => {
    const headings = [
      { depth: 3, slug: "before", text: "前言" },
      { depth: 2, slug: "chapter", text: "章节" },
      { depth: 3, slug: "child", text: "子节" },
      { depth: 4, slug: "detail", text: "细节" },
      { depth: 2, slug: "next", text: "下一节" },
    ];
    expect(groupReadingHeadings(headings)).toEqual([
      { heading: headings[0], children: [] },
      { heading: headings[1], children: [headings[2]] },
      { heading: headings[4], children: [] },
    ]);
    expect(groupReadingHeadings([])).toEqual([]);
  });
});


describe("桌面主要章节", () => {
  it("只列H2；没有H2时使用H3，但零或一个章节不显示导航", () => {
    const headings = [
      { depth: 2, slug: "chapter", text: "章节" },
      { depth: 3, slug: "child", text: "子节" },
      { depth: 2, slug: "next", text: "下一章" },
    ];
    expect(majorReadingHeadings(headings)).toEqual([headings[0], headings[2]]);
    expect(majorReadingHeadings(headings.slice(0, 2))).toEqual([]);
    expect(majorReadingHeadings([])).toEqual([]);
    const fallback = [{ depth: 3, slug: "a", text: "甲" }, { depth: 3, slug: "b", text: "乙" }];
    expect(majorReadingHeadings(fallback)).toEqual(fallback);
  });
});
