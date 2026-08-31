import { describe, expect, it } from "vitest";
import {
  shortestArc,
  stepOrbit,
  targetAngleFromPointer,
} from "@/lib/home-orbit/orbitIntegrator";

describe("orbitIntegrator", () => {
  it("crosses 360 degrees by the shortest path", () => {
    expect(shortestArc(350 * Math.PI / 180, 10 * Math.PI / 180))
      .toBeCloseTo(20 * Math.PI / 180);
  });

  it("retains the previous target inside the pointer dead zone", () => {
    expect(targetAngleFromPointer({
      pointerX: 150,
      pointerY: 150,
      footX: 100,
      footY: 100,
      previousTarget: 1.2,
    })).toBe(1.2);
  });

  it("maps pointer direction outside the dead zone", () => {
    expect(targetAngleFromPointer({
      pointerX: 100,
      pointerY: 220,
      footX: 100,
      footY: 100,
      previousTarget: 0,
    })).toBeCloseTo(Math.PI / 2);
  });

  it("clamps a stalled frame to 50ms", () => {
    const state = { angle: 0, angularVelocity: 0, targetAngle: Math.PI / 2 };
    expect(stepOrbit(state, 0.5)).toEqual(stepOrbit(state, 0.05));
  });

  it("settles without residual gait velocity", () => {
    const next = stepOrbit({ angle: 0, angularVelocity: 0.02, targetAngle: 0.01 }, 1 / 60);
    expect(next.angularVelocity).toBe(0);
    expect(next.angle).toBeCloseTo(0.01);
  });
});
