import { describe, expect, it } from "vitest";
import { mapPerspective, resolveOrbitLayer } from "@/lib/home-orbit/perspectiveMapper";

const pose = (angle: number, previousLayer: "behind" | "front" = "front") => (
  mapPerspective({ angle, radiusX: 200, radiusY: 90, previousLayer })
);

describe("mapPerspective", () => {
  it.each([
    [0, 200, 0, 0.97, "front", 3],
    [Math.PI / 2, 0, 90, 1.08, "front", 3],
    [Math.PI, -200, 0, 0.97, "front", 3],
    [Math.PI * 1.5, 0, -90, 0.86, "behind", 1],
  ] as const)("maps perspective checkpoint %#", (angle, x, y, scale, layer, zIndex) => {
    expect(pose(angle)).toMatchObject({ x, y, dogScale: scale, layer, zIndex });
  });

  it("maps the shadow formulas at front and back", () => {
    expect(pose(Math.PI / 2).shadow).toEqual({ opacity: 0.1, scaleX: 1.05, scaleY: 1 });
    expect(pose(Math.PI * 1.5).shadow).toEqual({ opacity: 0.05, scaleX: 0.89, scaleY: 0.96 });
  });

  it("retains the previous layer inside the hysteresis band", () => {
    expect(resolveOrbitLayer(0, "behind")).toBe("behind");
    expect(resolveOrbitLayer(0, "front")).toBe("front");
    expect(resolveOrbitLayer(0.081, "behind")).toBe("front");
    expect(resolveOrbitLayer(-0.081, "front")).toBe("behind");
  });

  it("falls back to side scale when perspective inputs are invalid", () => {
    expect(pose(Number.NaN).dogScale).toBe(0.97);
  });
});
