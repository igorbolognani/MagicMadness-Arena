import { createMatch, stepMatch, type GameState, type InputCommand } from "@mma/game-core";

export function createDeterministicScenario(seed = 42): GameState {
  return createMatch({ seed, playerHeroId: "fire-ember", botCount: 3 });
}

export function runTicks(state: GameState, ticks: number, command?: InputCommand): GameState {
  const input = command ?? { playerId: "player", move: { x: 0, y: 0 }, aim: { x: 1, y: 0 } };
  for (let index = 0; index < ticks; index += 1) stepMatch(state, [input]);
  return state;
}
