import { describe, expect, it } from "vitest";
import { selectHeroAnimation } from "./animationController";

const player = { id: "p1", alive: true, eliminated: false, velocity: { x: 0, y: 0 }, respawnTimer: 0, vertical: { state: "grounded", height: 0, velocity: 0, landingRemaining: 0 } } as const;

describe("hero animation presentation state", () => {
  it("prioritizes release cues over locomotion", () => {
    const event = { id: "e1", tick: 10, sequence: 1, type: "CAST_RELEASE" as const, actorId: "p1", tags: [], causalEventIds: [] };
    expect(selectHeroAnimation({ player: { ...player, velocity: { x: 200, y: 0 } }, events: [event], tick: 11 }).clip).toBe("cast_release");
  });
  it("maps authoritative vertical state", () => {
    expect(selectHeroAnimation({ player: { ...player, vertical: { ...player.vertical, state: "falling" } }, events: [], tick: 1 }).clip).toBe("falling");
  });
  it("never selects locomotion for a dead player", () => {
    expect(selectHeroAnimation({ player: { ...player, alive: false, eliminated: true, velocity: { x: 300, y: 0 } }, events: [], tick: 1 }).clip).toBe("death");
  });
  it("keeps a respawning dead player in death instead of returning to idle", () => {
    expect(selectHeroAnimation({ player: { ...player, alive: false, respawnTimer: 1.2 }, events: [], tick: 40 }).clip).toBe("death");
  });
});
