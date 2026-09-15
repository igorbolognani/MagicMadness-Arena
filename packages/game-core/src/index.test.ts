import { describe, expect, it } from "vitest";
import {
  compareDeterministicSnapshots,
  createMatch,
  getHeroSkill,
  getMatchRankings,
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

  it("fills the first local match with the four starter elements", () => {
    const state = createMatch({ seed: 78, playerHeroId: "fire-ember", botCount: 4 });
    const elements = Object.values(state.players).map((player) => getHeroSkill(player.heroId, 0).element);
    expect(Object.keys(state.players)).toHaveLength(5);
    expect([...new Set(elements)].sort()).toEqual(["air", "earth", "fire", "water"]);
    expect(state.arena).toMatchObject({ width: 2200, height: 1240, center: { x: 1100, y: 620 } });
  });

  it("exposes a preview that matches the selected skill data", () => {
    const state = createMatch({ seed: 2, playerHeroId: "water-tide", botCount: 1 });
    const preview = previewSkill(state, "player", 0, { x: 1, y: 0 });
    expect(preview?.skillId).toBe("water-pressure-jet");
    expect(preview?.path[0]?.certainty).toBe("certain");
    expect(preview?.impact.x).toBeGreaterThan(preview?.origin.x ?? 0);
  });

  it("stops a non-bouncing telegraph at cover and predicts a supported bounce", () => {
    const blockedState = createMatch({ seed: 9, playerHeroId: "fire-ember", botCount: 0 });
    blockedState.players.player!.position = { x: 500, y: 378 };
    const blocked = previewSkill(blockedState, "player", 0, { x: 1, y: 0 });
    expect(blocked?.blocked).toBe(true);
    expect(blocked?.impact.x).toBeLessThan((blocked?.origin.x ?? 0) + (blocked?.range ?? 0));

    const bounceState = createMatch({ seed: 10, playerHeroId: "fire-ember", botCount: 0 });
    bounceState.players.player!.position = { x: 500, y: 378 };
    const bounce = previewSkill(bounceState, "player", 3, { x: 1, y: 0 });
    expect(bounce?.blocked).toBe(false);
    expect(bounce?.predictedBounces).toBe(1);
    expect(bounce?.path.length).toBe(2);
  });

  it("exposes vertical gameplay state to the renderer after a ground launch", () => {
    const state = createMatch({ seed: 11, playerHeroId: "earth-bastion", botCount: 1 });
    const target = state.players["bot-1"];
    if (!target) throw new Error("missing bot");
    target.position = { x: 650, y: 375 };
    stepMatch(state, [{ ...idle(), aim: { x: 1, y: 0 }, releaseSkill: 2 }]);
    expect(target.vertical.state).toBe("rising");
    expect(target.vertical.height).toBeGreaterThan(0);
    run(state, 90);
    expect(target.vertical.state).toBe("grounded");
    expect(target.vertical.height).toBe(0);
  });

  it("resolves destructible cover in the shared simulation", () => {
    const state = createMatch({ seed: 12, playerHeroId: "fire-ember", botCount: 0 });
    const crate = state.arena.objects.find((object) => object.id === "crate-fire");
    if (!crate) throw new Error("missing fire crate");
    crate.hp = 10;
    state.players.player!.position = { x: 520, y: 420 };
    stepMatch(state, [{ ...idle(), aim: { x: 1, y: 0 }, releaseSkill: 0 }]);
    run(state, 30);
    expect(crate.hp).toBe(0);
    expect(state.events.some((event) => event.detail === "object destroyed")).toBe(true);
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

  it("accepts every starter skill and preserves 360-degree aim", () => {
    const starterHeroes = ["fire-ember", "water-tide", "earth-bastion", "air-gale"] as const;
    for (const [heroIndex, heroId] of starterHeroes.entries()) {
      for (const skillIndex of [0, 1, 2, 3] as const) {
        const state = createMatch({ seed: 70 + heroIndex * 10 + skillIndex, playerHeroId: heroId, botCount: 0 });
        const skill = getHeroSkill(heroId, skillIndex);
        const player = state.players.player!;
        player.mana = player.maxMana;
        stepMatch(state, [{ ...idle(), aim: { x: 0, y: -1 }, releaseSkill: skillIndex }]);
        expect(player.input.aim.x).toBeCloseTo(0, 5);
        expect(player.input.aim.y).toBeCloseTo(-1, 5);
        expect(state.events.some((event) => event.type === "CAST_RELEASE" && event.sourceDefinitionId === skill.id)).toBe(true);
      }
    }
  });

  it("runs the telegraphed environmental event cycle", () => {
    const state = createMatch({ seed: 6, botCount: 1 });
    run(state, 900);
    expect(state.events.some((event) => event.detail === "Wind Surge warning")).toBe(true);
    expect(state.events.some((event) => event.detail === "Wind Surge active")).toBe(true);
    expect(state.environmental.cycleIndex).toBeGreaterThan(0);
  });

  it("records deterministic bot decisions, casts and edge recovery without illegal stats", () => {
    const state = createMatch({ seed: 607, playerHeroId: "fire-ember", botCount: 4 });
    const bot = state.players["bot-1"]!;
    bot.position = { x: state.arena.safeMin.x + 4, y: state.arena.center.y };
    run(state, 360);
    const telemetry = state.botTelemetry[bot.id]!;
    expect(telemetry.edgeRecoveryAttempts).toBeGreaterThan(0);
    expect(telemetry.skillsUsed).toBeGreaterThan(0);
    expect(telemetry.accuracy).toBeGreaterThanOrEqual(0);
    expect(telemetry.damageCaused).toBeCloseTo(bot.performance.damage, 5);
    expect(bot.maxHp).toBeLessThanOrEqual(1200);
    expect(bot.maxMana).toBe(100);
  });
});


describe("Warlock displacement and account contracts", () => {
  it("keeps the final survivor above an eliminated score leader", () => {
    const state = createMatch({ seed: 12, playerHeroId: "fire-ember", botCount: 1, mode: "final" });
    state.players["bot-1"]!.eliminated = true;
    state.players["bot-1"]!.alive = false;
    state.players["bot-1"]!.matchScore = 900;
    expect(getMatchRankings(state)[0]?.playerId).toBe("player");
  });
  it("makes a heavy hit carry the target instead of being erased by idle input", () => {
    const state = createMatch({ seed: 13, playerHeroId: "earth-bastion", botCount: 1 });
    state.arena.walls = []; state.arena.objects = [];
    const target = state.players["bot-1"]!; target.isBot = false;
    state.players.player!.position = { x: 850, y: 620 }; target.position = { x: 970, y: 620 };
    stepMatch(state, [{ ...idle(), releaseSkill: 3 }]);
    run(state, 60);
    expect(target.position.x).toBeGreaterThan(1170);
    expect(target.hp).toBeLessThan(target.maxHp);
  });
  it("enforces account skill locks in the simulation, not only in the HUD", () => {
    const state = createMatch({ seed: 14, playerHeroId: "fire-ember", botCount: 0 });
    state.players.player!.build = { accountLevel: 1, talents: [], runes: [] };
    stepMatch(state, [{ ...idle(), releaseSkill: 3 }]);
    expect(state.projectiles).toHaveLength(0);
    expect(state.players.player!.mana).toBe(100);
    state.players.player!.build.accountLevel = 7;
    stepMatch(state, [{ ...idle(), releaseSkill: 3 }]);
    expect(state.projectiles).toHaveLength(1);
  });
});
