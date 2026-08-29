import { describe, expect, it } from "vitest";
import {
  compareDeterministicSnapshots,
  createMatch,
  previewSkill,
  resolveDeathForTesting,
  startFinalRound,
  stepMatch,
  type GameState,
  type InputCommand,
} from "./index";

const idle = (playerId = "player"): InputCommand => ({
  playerId,
  move: { x: 0, y: 0 },
  aim: { x: 1, y: 0 },
});

function run(state: GameState, ticks: number, command: InputCommand = idle()): GameState {
  for (let index = 0; index < ticks; index += 1) stepMatch(state, [command]);
  return state;
}

describe("MagicMadness deterministic game core", () => {
  it("replays the same seed and inputs identically", () => {
    const first = run(createMatch({ seed: 77, playerHeroId: "fire-ember", botCount: 2 }), 120);
    const second = run(createMatch({ seed: 77, playerHeroId: "fire-ember", botCount: 2 }), 120);
    expect(compareDeterministicSnapshots(first, second)).toBe(true);
  });

  it("exposes a preview that matches the selected skill data", () => {
    const state = createMatch({ seed: 2, playerHeroId: "water-tide", botCount: 1 });
    const preview = previewSkill(state, "player", 0, { x: 1, y: 0 });
    expect(preview?.skillId).toBe("water-pressure-jet");
    expect(preview?.path[0]?.certainty).toBe("certain");
    expect(preview?.impact.x).toBeGreaterThan(preview?.origin.x ?? 0);
  });

  it("keeps a standard respawn separate from match score", () => {
    const state = createMatch({ seed: 3, playerHeroId: "fire-ember", botCount: 1 });
    const player = state.players.player!;
    player.position = { x: state.arena.safeMax.x + 100, y: state.arena.center.y };
    player.velocity = { x: 1000, y: 0 };
    run(state, 30);
    expect(player.respawnsRemaining).toBeLessThanOrEqual(1);
    expect(player.matchScore).toBe(0);
    expect(state.events.some((event) => event.type === "DEATH")).toBe(true);
  });

  it("implements three final-round respawns and then elimination", () => {
    const state = startFinalRound(createMatch({ seed: 4, botCount: 1 }));
    const player = state.players.player!;
    expect(player.respawnsRemaining).toBe(3);
    for (let index = 0; index < 4; index += 1) {
      player.alive = true;
      player.respawnTimer = 0;
      resolveDeathForTesting(state, player.id, "scripted");
    }
    expect(player.respawnsRemaining).toBe(0);
    expect(player.eliminated).toBe(true);
  });

  it("records causal damage and displacement events", () => {
    const state = createMatch({ seed: 5, playerHeroId: "earth-bastion", botCount: 1 });
    const target = state.players["bot-1"];
    if (!target) throw new Error("missing bot");
    target.position = { x: 500, y: state.arena.center.y };
    state.players.player!.position = { x: 300, y: state.arena.center.y };
    stepMatch(state, [{ ...idle(), aim: { x: 1, y: 0 }, releaseSkill: 0 }]);
    run(state, 80);
    expect(state.events.some((event) => event.type === "DAMAGE")).toBe(true);
    expect(state.events.some((event) => event.type === "IMPULSE")).toBe(true);
  });
});
