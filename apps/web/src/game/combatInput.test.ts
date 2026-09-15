import { describe, it, expect } from "vitest";
import { CombatInput, heroFacing, screenToArenaVector } from "./combatInput";

describe("shared combat controls", () => {
  it("cancellation and pointer ownership never leak a cast", () => {
    const input = new CombatInput();
    input.begin("pointer:1", 2);
    input.finish("pointer:2");
    expect(input.held?.skill).toBe(2);
    input.finish("pointer:1", true);
    expect(input.consume().actions.releaseSkill).toBeUndefined();
    input.begin("key:1", 0); input.finish("key:1");
    expect(input.consume().actions.releaseSkill).toBe(0);
    expect(input.consume().actions.releaseSkill).toBeUndefined();
  });
  it("blur reset clears movement, held skills and queued actions", () => {
    const input = new CombatInput(); input.keys.add("w"); input.begin("key:1", 0); input.action("dash"); input.reset();
    expect(input.consume()).toEqual({ move: { x: 0, y: 0 }, aim: { x: 1, y: 0 }, actions: {} });
    expect(input.held).toBeNull();
  });
  it("uses the ground projection for diagonal movement and +Z model facing", () => {
    const move = screenToArenaVector({ x: 1, y: 1 });
    expect(move.y).toBeGreaterThan(move.x); expect(Math.hypot(move.x, move.y)).toBeCloseTo(1);
    expect(heroFacing({ x: 0, y: 1 })).toBe(0); expect(heroFacing({ x: 1, y: 0 })).toBeCloseTo(Math.PI / 2);
  });
});
