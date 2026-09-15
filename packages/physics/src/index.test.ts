import { describe, expect, it } from "vitest";
import { circleOverlapsAabb, normalize, rayAabbIntersection, reflect } from "./index";

describe("deterministic physics adapter", () => {
  it("normalizes vectors without producing NaN", () => {
    expect(normalize({ x: 3, y: 4 }).x).toBeCloseTo(0.6);
    expect(normalize({ x: 3, y: 4 }).y).toBeCloseTo(0.8);
    expect(normalize({ x: 0, y: 0 })).toEqual({ x: 1, y: 0 });
  });

  it("detects circle and wall overlap", () => {
    expect(circleOverlapsAabb({ x: 10, y: 10 }, 2, { x: 11, y: 11 }, { x: 20, y: 20 })).toBe(true);
    expect(circleOverlapsAabb({ x: 0, y: 0 }, 1, { x: 11, y: 11 }, { x: 20, y: 20 })).toBe(false);
  });

  it("reflects a velocity across a wall normal", () => {
    expect(reflect({ x: 10, y: 2 }, { x: -1, y: 0 })).toEqual({ x: -10, y: 2 });
  });

  it("finds the first deterministic ray hit and its outward normal", () => {
    const hit = rayAabbIntersection({ x: 0, y: 10 }, { x: 1, y: 0 }, 100, { x: 20, y: 0 }, { x: 30, y: 20 });
    expect(hit?.distance).toBe(20);
    expect(hit?.point).toEqual({ x: 20, y: 10 });
    expect(hit?.normal).toEqual({ x: -1, y: 0 });
  });
});
