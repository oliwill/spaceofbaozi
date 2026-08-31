import { describe, expect, it } from "vitest";
import { selectDogSprite, selectPersonGaze } from "@/lib/home-orbit/spriteSelector";

const dog = (angle: number, angularVelocity: number, lastDirection = 0) => (
  selectDogSprite({
    angle,
    angularVelocity,
    radiusX: 200,
    radiusY: 90,
    elapsedMovingSeconds: 0,
    lastDirection,
  })
);

describe("selectDogSprite", () => {
  it.each([
    [0, 1, 2],
    [Math.PI / 2, 1, 4],
    [Math.PI, 1, 6],
    [Math.PI * 1.5, 1, 0],
    [0, -1, 6],
    [Math.PI / 2, -1, 0],
    [Math.PI, -1, 2],
    [Math.PI * 1.5, -1, 4],
  ])("uses the ellipse tangent at checkpoint %#", (angle, velocity, direction) => {
    expect(dog(angle, velocity).direction).toBe(direction);
  });

  it("retains direction and contact frame when stopped", () => {
    expect(dog(Math.PI / 2, 0.01, 6)).toEqual({
      direction: 6,
      gaitFrame: 0,
      moving: false,
    });
  });

  it("advances four gait frames at 9fps", () => {
    expect(selectDogSprite({
      angle: 0,
      angularVelocity: 1,
      radiusX: 200,
      radiusY: 90,
      elapsedMovingSeconds: 3 / 9,
      lastDirection: 2,
    }).gaitFrame).toBe(3);
  });
});

describe("selectPersonGaze", () => {
  it("looks at the rendered dog position", () => {
    expect(selectPersonGaze({
      dogX: 0,
      dogY: 100,
      filteredAngle: 0,
      dtSeconds: 1,
      lastDirection: 0,
    }).direction).toBe(3);
  });
});
