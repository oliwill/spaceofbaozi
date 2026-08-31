import { describe, expect, it } from "vitest";
import { projectActorAnchor } from "@/lib/intro/projectActorAnchor";

const base = {
  wrapperOrigin: { x: 120, y: 300 },
  spriteSize: { width: 384, height: 384 },
  anchor: [0.25, 0.5] as const,
  translate: { x: 40, y: 12 },
};

describe("projectActorAnchor", () => {
  it.each([0, 7.4, 13.8, 18])("matches bottom-center CSS rotation at %d degrees", (rotationDeg) => {
    const point = projectActorAnchor({ ...base, rotationDeg });
    const radians = rotationDeg * Math.PI / 180;
    const originX = 192;
    const originY = 384;
    const localX = 96;
    const localY = 192;
    const relativeX = localX - originX;
    const relativeY = localY - originY;
    const expectedX = 120 + 40 + originX + relativeX * Math.cos(radians) - relativeY * Math.sin(radians);
    const expectedY = 300 + 12 + originY + relativeX * Math.sin(radians) + relativeY * Math.cos(radians);

    expect(point.x).toBeCloseTo(expectedX, 10);
    expect(point.y).toBeCloseTo(expectedY, 10);
  });

  it("keeps an anchor at the transform origin fixed", () => {
    expect(projectActorAnchor({
      ...base,
      anchor: [0.5, 1],
      rotationDeg: 18,
    })).toEqual({ x: 352, y: 696 });
  });
});
