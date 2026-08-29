import {
  ARENA_BASELINE,
  BALANCE_VERSION,
  HERO_BASE_ATTRIBUTES,
  MODE_RULES,
  PHYSICS_BASELINE,
  getSkillTuning,
  type SkillBehavior,
  type SkillTuning,
} from "@mma/balance";
import {
  CONTENT_VERSION,
  heroDefinitions,
  heroesById,
  skillsById,
  type ElementId,
  type HeroDefinition,
  type HeroId,
  type SkillDefinition,
} from "@mma/content";
import {
  add,
  clamp,
  clampMagnitude,
  circleOverlapsAabb,
  circleOverlapsCircle,
  distance,
  dot,
  normalize,
  reflect,
  scale,
  sub,
  type Aabb,
  type Vec2,
} from "@mma/physics";

export const GAME_CORE_VERSION = "game-core-0.1.0";
export const FIXED_STEP_SECONDS = PHYSICS_BASELINE.fixedStepSeconds;

export type MatchMode = "standard" | "final";
export type MatchPhase = "round" | "results";
export type DeathCause = "hp" | "hazard" | "environment" | "scripted";
export type SkillIndex = 0 | 1 | 2 | 3;
export type StatusId = "burning" | "slowed" | "airborne" | "wind-charged";

export type InputCommand = {
  playerId: string;
  move: Vec2;
  aim: Vec2;
  releaseSkill?: SkillIndex;
  dash?: boolean;
  healthPotion?: boolean;
  manaPotion?: boolean;
};

export type StatusState = {
  id: StatusId;
  remaining: number;
  strength: number;
  sourceId?: string;
  tickAccumulator: number;
};

export type PerformanceScore = {
  damage: number;
  assists: number;
  kos: number;
  survivalSeconds: number;
  utility: number;
  deaths: number;
};

export type PlayerState = {
  id: string;
  name: string;
  heroId: HeroId;
  teamId?: string;
  isBot: boolean;
  position: Vec2;
  velocity: Vec2;
  radius: number;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  alive: boolean;
  eliminated: boolean;
  respawnTimer: number;
  respawnsRemaining: number;
  tacticalCooldown: number;
  potionCooldown: number;
  cooldowns: Record<string, number>;
  statuses: StatusState[];
  matchScore: number;
  teamScore: number;
  performance: PerformanceScore;
  lastDamager?: string;
  lastImpulseContributor?: string;
  input: InputCommand;
  spawn: Vec2;
};

export type ProjectileState = {
  id: string;
  ownerId: string;
  skillId: string;
  element: ElementId;
  position: Vec2;
  velocity: Vec2;
  radius: number;
  damage: number;
  knockback: number;
  remaining: number;
  maxRange: number;
  distanceTravelled: number;
  bouncesRemaining: number;
  status?: StatusId;
  statusDuration?: number;
  statusStrength?: number;
  active: boolean;
};

export type FieldState = {
  id: string;
  ownerId: string;
  skillId: string;
  element: ElementId;
  position: Vec2;
  radius: number;
  remaining: number;
  damage: number;
  knockback: number;
  status?: StatusId;
  statusDuration?: number;
  statusStrength?: number;
  tickAccumulator: number;
};

export type WallState = {
  id: string;
  ownerId: string;
  skillId: string;
  min: Vec2;
  max: Vec2;
  remaining: number;
  destructible: boolean;
  hp: number;
  color: string;
};

export type ArenaObject = {
  id: string;
  kind: "crate" | "house";
  min: Vec2;
  max: Vec2;
  destructible: boolean;
  hp: number;
  color: string;
};

export type ArenaState = {
  width: number;
  height: number;
  safeMin: Vec2;
  safeMax: Vec2;
  center: Vec2;
  walls: Aabb[];
  objects: ArenaObject[];
};

export type EnvironmentalState = {
  name: "Wind Surge";
  phase: "calm" | "warning" | "active";
  remaining: number;
  cycleIndex: number;
  direction: Vec2;
  affectedRadius: number;
};

export type MatchEvent = {
  id: string;
  tick: number;
  sequence: number;
  type:
    | "INPUT_ACCEPTED"
    | "CAST_START"
    | "CAST_RELEASE"
    | "PROJECTILE_SPAWN"
    | "COLLISION"
    | "INTERACTION"
    | "DAMAGE"
    | "STATUS_APPLY"
    | "IMPULSE"
    | "HAZARD_ENTER"
    | "KO"
    | "DEATH"
    | "RESPAWN"
    | "ASSIST"
    | "ROUND_END"
    | "LEVEL_UP"
    | "UPGRADE_CHOICE"
    | "MATCH_END";
  actorId?: string;
  targetId?: string;
  sourceDefinitionId?: string;
  position?: Vec2;
  vector?: Vec2;
  value?: number;
  tags: string[];
  causalEventIds: string[];
  detail?: string;
};

export type MatchResult = {
  winnerId?: string;
  rankings: Array<{
    playerId: string;
    placement: number;
    matchScore: number;
    performanceScore: number;
  }>;
};

export type GameState = {
  version: string;
  balanceVersion: string;
  contentVersion: string;
  tick: number;
  time: number;
  round: number;
  mode: MatchMode;
  phase: MatchPhase;
  rngState: number;
  arena: ArenaState;
  players: Record<string, PlayerState>;
  projectiles: ProjectileState[];
  fields: FieldState[];
  walls: WallState[];
  environmental: EnvironmentalState;
  events: MatchEvent[];
  eventSequence: number;
  result?: MatchResult;
};

export type CreateMatchOptions = {
  seed?: number;
  playerHeroId?: HeroId;
  botCount?: number;
  mode?: MatchMode;
};

const SPAWN_POINTS: Vec2[] = [
  { x: 250, y: 180 },
  { x: 1350, y: 180 },
  { x: 250, y: 720 },
  { x: 1350, y: 720 },
  { x: 800, y: 150 },
  { x: 800, y: 750 },
];

const BOT_HERO_IDS: HeroId[] = ["water-tide", "earth-bastion", "air-gale", "fire-ember"];
const ELEMENT_COLORS: Record<string, number> = {
  fire: 0xff6b35,
  water: 0x35baf6,
  earth: 0xc99a5b,
  air: 0xb18cff,
  lightning: 0xf7db58,
  ice: 0xa7e8ff,
  venom: 0x86d94c,
  dark: 0x7c65b8,
  light: 0xfff2b2,
  iron: 0x9ea9ba,
};

const HERO_COLORS: Record<string, string> = Object.fromEntries(
  heroDefinitions.map((hero) => [hero.id, hero.color]),
);

const clampUnit = (value: number): number => clamp(value, -1, 1);

function emptyInput(playerId: string): InputCommand {
  return { playerId, move: { x: 0, y: 0 }, aim: { x: 1, y: 0 } };
}

function createArena(): ArenaState {
  return {
    width: ARENA_BASELINE.width,
    height: ARENA_BASELINE.height,
    safeMin: { x: ARENA_BASELINE.margin, y: ARENA_BASELINE.margin },
    safeMax: {
      x: ARENA_BASELINE.width - ARENA_BASELINE.margin,
      y: ARENA_BASELINE.height - ARENA_BASELINE.margin,
    },
    center: { x: ARENA_BASELINE.width / 2, y: ARENA_BASELINE.height / 2 },
    walls: [
      { min: { x: 638, y: 354 }, max: { x: 962, y: 402 } },
      { min: { x: 638, y: 498 }, max: { x: 962, y: 546 } },
      { min: { x: 314, y: 406 }, max: { x: 390, y: 494 } },
      { min: { x: 1210, y: 406 }, max: { x: 1286, y: 494 } },
    ],
    objects: [
      { id: "crate-west", kind: "crate", min: { x: 486, y: 230 }, max: { x: 550, y: 294 }, destructible: true, hp: 70, color: "#b9784d" },
      { id: "crate-east", kind: "crate", min: { x: 1050, y: 606 }, max: { x: 1114, y: 670 }, destructible: true, hp: 70, color: "#b9784d" },
      { id: "house-north", kind: "house", min: { x: 1040, y: 238 }, max: { x: 1175, y: 318 }, destructible: false, hp: 999, color: "#34466d" },
      { id: "house-south", kind: "house", min: { x: 425, y: 582 }, max: { x: 560, y: 662 }, destructible: false, hp: 999, color: "#34466d" },
    ],
  };
}

function createPlayer(
  id: string,
  name: string,
  heroId: HeroId,
  isBot: boolean,
  spawn: Vec2,
  mode: MatchMode,
): PlayerState {
  const attributes = HERO_BASE_ATTRIBUTES[heroId] ?? { force: 1, resilience: 1, control: 1 };
  const maxHp = Math.round(PHYSICS_BASELINE.maxHp * (0.96 + (attributes.resilience - 1) * 0.3));
  return {
    id,
    name,
    heroId,
    teamId: id,
    isBot,
    position: { ...spawn },
    velocity: { x: 0, y: 0 },
    radius: PHYSICS_BASELINE.playerRadius,
    hp: maxHp,
    maxHp,
    mana: PHYSICS_BASELINE.maxMana,
    maxMana: PHYSICS_BASELINE.maxMana,
    alive: true,
    eliminated: false,
    respawnTimer: 0,
    respawnsRemaining: MODE_RULES[mode].respawns,
    tacticalCooldown: 0,
    potionCooldown: 0,
    cooldowns: {},
    statuses: [],
    matchScore: 0,
    teamScore: 0,
    performance: { damage: 0, assists: 0, kos: 0, survivalSeconds: 0, utility: 0, deaths: 0 },
    input: emptyInput(id),
    spawn: { ...spawn },
  };
}

export function createMatch(options: CreateMatchOptions = {}): GameState {
  const seed = Math.max(1, Math.floor(options.seed ?? 1337));
  const mode = options.mode ?? "standard";
  const playerHeroId = options.playerHeroId ?? "fire-ember";
  const botCount = clamp(Math.floor(options.botCount ?? 3), 1, 5);
  const players: Record<string, PlayerState> = {};
  players.player = createPlayer("player", "You", playerHeroId, false, SPAWN_POINTS[0] ?? { x: 250, y: 180 }, mode);
  for (let index = 0; index < botCount; index += 1) {
    const botId = "bot-" + (index + 1);
    players[botId] = createPlayer(
      botId,
      "Bot " + (index + 1),
      BOT_HERO_IDS[index % BOT_HERO_IDS.length] ?? "water-tide",
      true,
      SPAWN_POINTS[index + 1] ?? { x: 1350, y: 180 },
      mode,
    );
  }
  return {
    version: GAME_CORE_VERSION,
    balanceVersion: BALANCE_VERSION,
    contentVersion: CONTENT_VERSION,
    tick: 0,
    time: 0,
    round: 1,
    mode,
    phase: "round",
    rngState: seed >>> 0,
    arena: createArena(),
    players,
    projectiles: [],
    fields: [],
    walls: [],
    environmental: {
      name: "Wind Surge",
      phase: "calm",
      remaining: 7,
      cycleIndex: 0,
      direction: { x: 1, y: 0 },
      affectedRadius: 520,
    },
    events: [],
    eventSequence: 0,
  };
}

function nextRandom(state: GameState): number {
  state.rngState = (Math.imul(state.rngState, 1664525) + 1013904223) >>> 0;
  return state.rngState / 0x100000000;
}

function addEvent(
  state: GameState,
  type: MatchEvent["type"],
  detail: Omit<MatchEvent, "id" | "tick" | "sequence" | "type" | "tags" | "causalEventIds"> = {},
  tags: string[] = [],
  causalEventIds: string[] = [],
): MatchEvent {
  const event: MatchEvent = {
    id: "event-" + state.eventSequence,
    tick: state.tick,
    sequence: state.eventSequence,
    type,
    tags,
    causalEventIds,
    ...detail,
  };
  state.eventSequence += 1;
  state.events.push(event);
  if (state.events.length > 1800) state.events.splice(0, state.events.length - 1800);
  return event;
}

function livingPlayers(state: GameState): PlayerState[] {
  return Object.values(state.players).filter((player) => !player.eliminated);
}

function alivePlayers(state: GameState): PlayerState[] {
  return Object.values(state.players).filter((player) => player.alive && !player.eliminated);
}

function getPlayer(state: GameState, id: string): PlayerState | undefined {
  return state.players[id];
}

function getSkillForPlayer(player: PlayerState, index: SkillIndex): {
  definition: SkillDefinition;
  tuning: SkillTuning;
} {
  const hero = heroesById[player.heroId];
  if (!hero) throw new Error("Unknown hero: " + player.heroId);
  const skillId = hero.skillIds[index];
  if (!skillId) throw new Error("Missing skill index " + index + " for hero " + hero.id);
  const definition = skillsById[skillId];
  if (!definition) throw new Error("Unknown skill: " + skillId);
  return { definition, tuning: getSkillTuning(skillId) };
}

export function getHeroDefinition(heroId: HeroId): HeroDefinition {
  const hero = heroesById[heroId];
  if (!hero) throw new Error("Unknown hero: " + heroId);
  return hero;
}

export function getHeroSkill(heroId: HeroId, index: SkillIndex): SkillDefinition {
  const hero = getHeroDefinition(heroId);
  const skillId = hero.skillIds[index];
  const skill = skillId ? skillsById[skillId] : undefined;
  if (!skill) throw new Error("Unknown hero skill");
  return skill;
}

export type PreviewSegment = {
  from: Vec2;
  to: Vec2;
  certainty: "certain" | "predicted" | "dynamic";
};

export type SkillPreview = {
  skillId: string;
  geometry: SkillDefinition["geometry"];
  origin: Vec2;
  direction: Vec2;
  impact: Vec2;
  range: number;
  radius: number;
  path: PreviewSegment[];
};

export function previewSkill(
  state: GameState,
  playerId: string,
  index: SkillIndex,
  aim: Vec2,
): SkillPreview | null {
  const player = getPlayer(state, playerId);
  if (!player || !player.alive) return null;
  const { definition, tuning } = getSkillForPlayer(player, index);
  const direction = normalize(aim);
  const origin = add(player.position, scale(direction, player.radius + 8));
  const range = tuning.range;
  const impact = add(origin, scale(direction, range));
  const certainty = definition.preview.dynamicSegment ? "dynamic" : "certain";
  return {
    skillId: definition.id,
    geometry: definition.geometry,
    origin,
    direction,
    impact,
    range,
    radius: tuning.effectRadius,
    path: [{ from: origin, to: impact, certainty }],
  };
}

function status(player: PlayerState, id: StatusId): StatusState | undefined {
  return player.statuses.find((entry) => entry.id === id);
}

function applyStatus(
  state: GameState,
  sourceId: string,
  target: PlayerState,
  id: StatusId,
  duration: number,
  strength: number,
  causalEventIds: string[] = [],
): void {
  const existing = status(target, id);
  if (existing) {
    existing.remaining = Math.max(existing.remaining, duration);
    existing.strength = Math.max(existing.strength, strength);
    existing.sourceId = sourceId;
  } else {
    target.statuses.push({ id, remaining: duration, strength, sourceId, tickAccumulator: 0 });
  }
  addEvent(
    state,
    "STATUS_APPLY",
    { actorId: sourceId, targetId: target.id, value: duration, detail: id },
    [id],
    causalEventIds,
  );
}

function applyImpulse(
  state: GameState,
  sourceId: string,
  target: PlayerState,
  direction: Vec2,
  amount: number,
  causalEventIds: string[] = [],
): void {
  if (!target.alive) return;
  const hero = heroesById[target.heroId];
  const reduction = hero?.element === "earth" && !status(target, "airborne") ? 0.68 : 1;
  const impulse = scale(normalize(direction), amount * PHYSICS_BASELINE.globalKnockbackScale * reduction);
  target.velocity = clampMagnitude(add(target.velocity, impulse), 1250);
  if (amount > 0) target.lastImpulseContributor = sourceId;
  addEvent(
    state,
    "IMPULSE",
    { actorId: sourceId, targetId: target.id, vector: impulse, value: amount },
    ["DISPLACEMENT"],
    causalEventIds,
  );
}

function applyDamage(
  state: GameState,
  sourceId: string,
  target: PlayerState,
  amount: number,
  sourceDefinitionId: string,
  tags: string[] = [],
  causalEventIds: string[] = [],
): void {
  if (!target.alive || amount <= 0) return;
  const actual = Math.max(0, amount);
  target.hp = Math.max(0, target.hp - actual);
  target.lastDamager = sourceId;
  const source = getPlayer(state, sourceId);
  if (source) source.performance.damage += actual;
  addEvent(
    state,
    "DAMAGE",
    { actorId: sourceId, targetId: target.id, sourceDefinitionId, value: actual },
    tags,
    causalEventIds,
  );
  if (target.hp <= 0) resolveDeath(state, target, "hp");
}

function applyAreaEffect(
  state: GameState,
  source: PlayerState,
  position: Vec2,
  tuning: SkillTuning,
  skillId: string,
  element: ElementId,
  pull = false,
): void {
  const event = addEvent(
    state,
    "INTERACTION",
    { actorId: source.id, sourceDefinitionId: skillId, position, value: tuning.effectRadius },
    [element.toUpperCase(), "AREA"],
  );
  for (const target of alivePlayers(state)) {
    if (target.id === source.id) continue;
    const delta = sub(target.position, position);
    const distanceToCenter = Math.max(1, distance(target.position, position));
    if (distanceToCenter > tuning.effectRadius + target.radius) continue;
    const falloff = clamp(1 - distanceToCenter / (tuning.effectRadius + target.radius), 0.35, 1);
    const direction = pull ? scale(delta, -1) : delta;
    const impulse = pull ? Math.abs(tuning.knockback) : tuning.knockback;
    applyDamage(state, source.id, target, tuning.damage * falloff, skillId, [element.toUpperCase(), "AREA"], [event.id]);
    if (impulse > 0) applyImpulse(state, source.id, target, direction, impulse * falloff, [event.id]);
    if (tuning.status) {
      applyStatus(
        state,
        source.id,
        target,
        tuning.status as StatusId,
        tuning.statusDuration ?? 1,
        tuning.statusStrength ?? 1,
        [event.id],
      );
    }
  }
}

function makeRectAt(position: Vec2, direction: Vec2, width: number, depth: number): Aabb {
  const perpendicular = { x: -normalize(direction).y, y: normalize(direction).x };
  const center = add(position, scale(normalize(direction), depth / 2));
  const extentX = Math.abs(perpendicular.x * width / 2) + Math.abs(normalize(direction).x * depth / 2);
  const extentY = Math.abs(perpendicular.y * width / 2) + Math.abs(normalize(direction).y * depth / 2);
  return {
    min: { x: center.x - extentX, y: center.y - extentY },
    max: { x: center.x + extentX, y: center.y + extentY },
  };
}

function castSkill(state: GameState, player: PlayerState, index: SkillIndex): void {
  const { definition, tuning } = getSkillForPlayer(player, index);
  const skillId = definition.id;
  if ((player.cooldowns[skillId] ?? 0) > 0 || player.mana < tuning.manaCost) return;
  const direction = normalize(player.input.aim);
  const origin = add(player.position, scale(direction, player.radius + 10));
  const castEvent = addEvent(
    state,
    "CAST_RELEASE",
    { actorId: player.id, sourceDefinitionId: skillId, position: player.position, vector: direction },
    [definition.element.toUpperCase(), ...definition.tags],
  );
  player.mana -= tuning.manaCost;
  player.cooldowns[skillId] = tuning.cooldown;
  if (tuning.behavior === "projectile" || tuning.behavior === "arc") {
    const projectile: ProjectileState = {
      id: "projectile-" + state.tick + "-" + player.id + "-" + index,
      ownerId: player.id,
      skillId,
      element: definition.element,
      position: origin,
      velocity: scale(direction, tuning.projectileSpeed),
      radius: tuning.radius,
      damage: tuning.damage,
      knockback: tuning.knockback,
      remaining: tuning.lifetime,
      maxRange: tuning.range,
      distanceTravelled: 0,
      bouncesRemaining: tuning.projectileBounces,
      ...(tuning.status ? { status: tuning.status as StatusId } : {}),
      ...(tuning.statusDuration ? { statusDuration: tuning.statusDuration } : {}),
      ...(tuning.statusStrength ? { statusStrength: tuning.statusStrength } : {}),
      active: true,
    };
    state.projectiles.push(projectile);
    addEvent(
      state,
      "PROJECTILE_SPAWN",
      { actorId: player.id, sourceDefinitionId: skillId, position: origin, vector: projectile.velocity },
      [definition.element.toUpperCase(), "PROJECTILE"],
      [castEvent.id],
    );
  } else if (tuning.behavior === "radial") {
    applyAreaEffect(state, player, add(player.position, scale(direction, tuning.range)), tuning, skillId, definition.element);
  } else if (tuning.behavior === "pull") {
    applyAreaEffect(state, player, add(player.position, scale(direction, tuning.range)), tuning, skillId, definition.element, true);
  } else if (tuning.behavior === "field") {
    const field: FieldState = {
      id: "field-" + state.tick + "-" + player.id + "-" + index,
      ownerId: player.id,
      skillId,
      element: definition.element,
      position: add(player.position, scale(direction, tuning.range)),
      radius: tuning.effectRadius,
      remaining: tuning.lifetime,
      damage: tuning.damage,
      knockback: tuning.knockback,
      ...(tuning.status ? { status: tuning.status as StatusId } : {}),
      ...(tuning.statusDuration ? { statusDuration: tuning.statusDuration } : {}),
      ...(tuning.statusStrength ? { statusStrength: tuning.statusStrength } : {}),
      tickAccumulator: 0,
    };
    state.fields.push(field);
    addEvent(state, "INTERACTION", { actorId: player.id, sourceDefinitionId: skillId, position: field.position }, [definition.element.toUpperCase(), "FIELD"], [castEvent.id]);
  } else if (tuning.behavior === "wall") {
    const rect = makeRectAt(add(player.position, scale(direction, tuning.range)), direction, definition.geometry.kind === "wall" ? definition.geometry.width : 120, 34);
    state.walls.push({
      id: "wall-" + state.tick + "-" + player.id + "-" + index,
      ownerId: player.id,
      skillId,
      min: rect.min,
      max: rect.max,
      remaining: tuning.lifetime,
      destructible: player.heroId === "earth-bastion",
      hp: player.heroId === "earth-bastion" ? 180 : 90,
      color: HERO_COLORS[player.heroId] ?? "#ffffff",
    });
    addEvent(state, "INTERACTION", { actorId: player.id, sourceDefinitionId: skillId, position: rect.min }, ["WALL"], [castEvent.id]);
  } else if (tuning.behavior === "dash") {
    const before = { ...player.position };
    player.position = add(player.position, scale(direction, tuning.range));
    player.velocity = scale(direction, 180);
    addEvent(state, "INTERACTION", { actorId: player.id, sourceDefinitionId: skillId, position: player.position, vector: direction }, ["DASH"], [castEvent.id]);
    for (const target of alivePlayers(state)) {
      if (target.id === player.id) continue;
      if (distance(target.position, player.position) <= target.radius + tuning.effectRadius) {
        applyDamage(state, player.id, target, tuning.damage, skillId, [definition.element.toUpperCase(), "DASH"], [castEvent.id]);
        applyImpulse(state, player.id, target, direction, tuning.knockback, [castEvent.id]);
      }
    }
    if (distance(before, player.position) > tuning.range * 0.7) {
      player.performance.utility += 1;
    }
  }
}

function useDash(state: GameState, player: PlayerState): void {
  if (player.tacticalCooldown > 0 || !player.alive) return;
  const direction = normalize(player.input.aim);
  player.position = add(player.position, scale(direction, PHYSICS_BASELINE.dashDistance));
  player.velocity = scale(direction, 250);
  player.tacticalCooldown = PHYSICS_BASELINE.dashCooldown;
  player.performance.utility += 1;
  addEvent(state, "INTERACTION", { actorId: player.id, position: player.position, vector: direction }, ["TACTICAL", "DASH"]);
}

function usePotion(state: GameState, player: PlayerState, kind: "health" | "mana"): void {
  if (player.potionCooldown > 0 || !player.alive) return;
  if (kind === "health" && player.hp < player.maxHp) {
    player.hp = Math.min(player.maxHp, player.hp + PHYSICS_BASELINE.healthPotionAmount);
  } else if (kind === "mana" && player.mana < player.maxMana) {
    player.mana = Math.min(player.maxMana, player.mana + PHYSICS_BASELINE.manaPotionAmount);
  } else {
    return;
  }
  player.potionCooldown = PHYSICS_BASELINE.potionCooldown;
  addEvent(state, "INTERACTION", { actorId: player.id, value: kind === "health" ? PHYSICS_BASELINE.healthPotionAmount : PHYSICS_BASELINE.manaPotionAmount, detail: kind + "-potion" }, ["RESOURCE"]);
}

function sanitizeInput(command: InputCommand, playerId: string): InputCommand {
  return {
    ...command,
    playerId,
    move: { x: clampUnit(command.move.x), y: clampUnit(command.move.y) },
    aim: normalize(command.aim),
  };
}

function nearestTarget(state: GameState, player: PlayerState): PlayerState | undefined {
  return alivePlayers(state)
    .filter((candidate) => candidate.id !== player.id)
    .sort((a, b) => distance(a.position, player.position) - distance(b.position, player.position))[0];
}

function botCommand(state: GameState, player: PlayerState): InputCommand {
  const target = nearestTarget(state, player);
  if (!target) return emptyInput(player.id);
  const delta = sub(target.position, player.position);
  const targetDistance = distance(target.position, player.position);
  const moveDirection = normalize(delta);
  const edgeX = Math.min(player.position.x - state.arena.safeMin.x, state.arena.safeMax.x - player.position.x);
  const edgeY = Math.min(player.position.y - state.arena.safeMin.y, state.arena.safeMax.y - player.position.y);
  const nearEdge = Math.min(edgeX, edgeY) < 95;
  const skillIndex = (Math.floor(state.time * 2) + player.id.length) % 4 as SkillIndex;
  const skill = getSkillForPlayer(player, skillIndex);
  const canCast = (player.cooldowns[skill.definition.id] ?? 0) <= 0 && player.mana >= skill.tuning.manaCost;
  return {
    playerId: player.id,
    move: nearEdge ? scale(moveDirection, -1) : targetDistance > 280 ? moveDirection : { x: -moveDirection.y, y: moveDirection.x },
    aim: delta,
    ...(canCast && (targetDistance < skill.tuning.range + 150) ? { releaseSkill: skillIndex } : {}),
    ...(nearEdge && player.tacticalCooldown <= 0 ? { dash: true } : {}),
  };
}

function processInputs(state: GameState, commands: InputCommand[], dt: number): void {
  const byPlayer = new Map(commands.map((command) => [command.playerId, command]));
  for (const player of Object.values(state.players)) {
    if (player.isBot) byPlayer.set(player.id, botCommand(state, player));
    const raw = byPlayer.get(player.id) ?? emptyInput(player.id);
    const command = sanitizeInput(raw, player.id);
    player.input = command;
    if (!player.alive) continue;
    if (command.releaseSkill !== undefined) {
      addEvent(state, "CAST_START", { actorId: player.id, value: command.releaseSkill }, ["INPUT"]);
      castSkill(state, player, command.releaseSkill);
    }
    if (command.dash) useDash(state, player);
    if (command.healthPotion) usePotion(state, player, "health");
    if (command.manaPotion) usePotion(state, player, "mana");
    const slowed = status(player, "slowed");
    const speed = PHYSICS_BASELINE.moveSpeed * (slowed ? 1 - slowed.strength : 1);
    const desired = scale(normalize(command.move), speed);
    const acceleration = Math.min(1, PHYSICS_BASELINE.acceleration * dt / speed);
    player.velocity = add(player.velocity, scale(sub(desired, player.velocity), acceleration));
    player.mana = Math.min(player.maxMana, player.mana + PHYSICS_BASELINE.manaRegenPerSecond * dt);
    player.tacticalCooldown = Math.max(0, player.tacticalCooldown - dt);
    player.potionCooldown = Math.max(0, player.potionCooldown - dt);
    for (const key of Object.keys(player.cooldowns)) {
      player.cooldowns[key] = Math.max(0, (player.cooldowns[key] ?? 0) - dt);
    }
    player.performance.survivalSeconds += dt;
  }
}

function resolveAgainstAabb(player: PlayerState, bounds: Aabb): void {
  if (!circleOverlapsAabb(player.position, player.radius, bounds.min, bounds.max)) return;
  const candidates = [
    { distance: Math.abs(player.position.x - bounds.min.x), position: { x: bounds.min.x - player.radius, y: player.position.y }, normal: { x: -1, y: 0 } },
    { distance: Math.abs(player.position.x - bounds.max.x), position: { x: bounds.max.x + player.radius, y: player.position.y }, normal: { x: 1, y: 0 } },
    { distance: Math.abs(player.position.y - bounds.min.y), position: { x: player.position.x, y: bounds.min.y - player.radius }, normal: { x: 0, y: -1 } },
    { distance: Math.abs(player.position.y - bounds.max.y), position: { x: player.position.x, y: bounds.max.y + player.radius }, normal: { x: 0, y: 1 } },
  ].sort((a, b) => a.distance - b.distance);
  const chosen = candidates[0];
  if (chosen) {
    player.position = chosen.position;
    player.velocity = reflect(player.velocity, chosen.normal, 0.12);
  }
}

function updatePlayers(state: GameState, dt: number): void {
  for (const player of Object.values(state.players)) {
    if (!player.alive) {
      if (player.respawnTimer > 0 && !player.eliminated) {
        player.respawnTimer = Math.max(0, player.respawnTimer - dt);
        if (player.respawnTimer === 0) {
          player.alive = true;
          player.hp = player.maxHp;
          player.mana = player.maxMana;
          player.position = { ...player.spawn };
          player.velocity = { x: 0, y: 0 };
          player.statuses = [];
          addEvent(state, "RESPAWN", { actorId: player.id, position: player.position }, ["RESPAWN"]);
        }
      }
      continue;
    }
    const slowed = status(player, "slowed");
    const friction = slowed ? 0.92 : Math.pow(PHYSICS_BASELINE.friction, dt * 60);
    player.position = add(player.position, scale(player.velocity, dt));
    player.velocity = scale(player.velocity, friction);
    for (const wall of state.arena.walls) resolveAgainstAabb(player, wall);
    for (const object of state.arena.objects) resolveAgainstAabb(player, object);
    for (const wall of state.walls) resolveAgainstAabb(player, { min: wall.min, max: wall.max });
    const outside =
      player.position.x < state.arena.safeMin.x ||
      player.position.x > state.arena.safeMax.x ||
      player.position.y < state.arena.safeMin.y ||
      player.position.y > state.arena.safeMax.y;
    if (outside) {
      if (state.tick % 15 === 0) addEvent(state, "HAZARD_ENTER", { targetId: player.id, position: player.position }, ["EDGE", "HAZARD"]);
      player.performance.utility += dt;
      const inward = sub(state.arena.center, player.position);
      player.velocity = add(player.velocity, scale(normalize(inward), 78 * dt));
      applyDamage(state, "environment", player, PHYSICS_BASELINE.hazardDamagePerSecond * dt, "arena-edge", ["HAZARD"]);
      const distanceOutside = Math.max(
        state.arena.safeMin.x - player.position.x,
        player.position.x - state.arena.safeMax.x,
        state.arena.safeMin.y - player.position.y,
        player.position.y - state.arena.safeMax.y,
      );
      if (distanceOutside > PHYSICS_BASELINE.hazardKoDistance && player.alive) {
        resolveDeath(state, player, "hazard");
      }
    }
  }
}

function updateStatuses(state: GameState, dt: number): void {
  for (const player of Object.values(state.players)) {
    if (!player.alive) continue;
    for (const entry of player.statuses) {
      entry.remaining = Math.max(0, entry.remaining - dt);
      entry.tickAccumulator += dt;
      if (entry.id === "burning" && entry.tickAccumulator >= 0.5) {
        entry.tickAccumulator = 0;
        applyDamage(state, entry.sourceId ?? "environment", player, entry.strength, "status-burning", ["STATUS", "BURNING"]);
      }
    }
    player.statuses = player.statuses.filter((entry) => entry.remaining > 0);
  }
}

function projectileWallNormal(projectile: ProjectileState, wall: Aabb): Vec2 {
  const distances = [
    { distance: Math.abs(projectile.position.x - wall.min.x), normal: { x: -1, y: 0 } },
    { distance: Math.abs(projectile.position.x - wall.max.x), normal: { x: 1, y: 0 } },
    { distance: Math.abs(projectile.position.y - wall.min.y), normal: { x: 0, y: -1 } },
    { distance: Math.abs(projectile.position.y - wall.max.y), normal: { x: 0, y: 1 } },
  ].sort((a, b) => a.distance - b.distance);
  return distances[0]?.normal ?? { x: -1, y: 0 };
}

function updateProjectiles(state: GameState, dt: number): void {
  const next: ProjectileState[] = [];
  for (const projectile of state.projectiles) {
    if (!projectile.active) continue;
    const previous = { ...projectile.position };
    if (state.environmental.phase === "active" && distance(projectile.position, state.arena.center) < state.environmental.affectedRadius) {
      projectile.velocity = add(projectile.velocity, scale(state.environmental.direction, 26 * dt));
    }
    projectile.position = add(projectile.position, scale(projectile.velocity, dt));
    projectile.remaining -= dt;
    projectile.distanceTravelled += distance(previous, projectile.position);
    let consumed = false;
    const boundary = {
      min: { x: 0, y: 0 },
      max: { x: state.arena.width, y: state.arena.height },
    };
    if (
      projectile.position.x < boundary.min.x ||
      projectile.position.x > boundary.max.x ||
      projectile.position.y < boundary.min.y ||
      projectile.position.y > boundary.max.y
    ) {
      if (projectile.bouncesRemaining > 0) {
        const normal =
          projectile.position.x < 0 || projectile.position.x > state.arena.width
            ? { x: projectile.position.x < 0 ? 1 : -1, y: 0 }
            : { x: 0, y: projectile.position.y < 0 ? 1 : -1 };
        projectile.velocity = reflect(projectile.velocity, normal, 0.9);
        projectile.position = { x: clamp(projectile.position.x, 5, state.arena.width - 5), y: clamp(projectile.position.y, 5, state.arena.height - 5) };
        projectile.bouncesRemaining -= 1;
        addEvent(state, "COLLISION", { sourceDefinitionId: projectile.skillId, position: projectile.position, vector: normal }, ["WALL", "BOUNCE"]);
      } else {
        consumed = true;
      }
    }
    const staticBounds = [...state.arena.walls, ...state.arena.objects.map((object) => ({ min: object.min, max: object.max })), ...state.walls.map((wall) => ({ min: wall.min, max: wall.max }))];
    for (const bounds of staticBounds) {
      if (consumed || !circleOverlapsAabb(projectile.position, projectile.radius, bounds.min, bounds.max)) continue;
      if (projectile.bouncesRemaining > 0) {
        const normal = projectileWallNormal(projectile, bounds);
        projectile.velocity = reflect(projectile.velocity, normal, 0.9);
        projectile.position = add(projectile.position, scale(normal, projectile.radius + 3));
        projectile.bouncesRemaining -= 1;
        addEvent(state, "COLLISION", { sourceDefinitionId: projectile.skillId, position: projectile.position, vector: normal }, ["WALL", "BOUNCE"]);
      } else {
        consumed = true;
        addEvent(state, "COLLISION", { sourceDefinitionId: projectile.skillId, position: projectile.position }, ["WALL"]);
      }
    }
    if (!consumed) {
      for (const target of alivePlayers(state)) {
        if (target.id === projectile.ownerId) continue;
        if (!circleOverlapsCircle(projectile.position, projectile.radius, target.position, target.radius)) continue;
        const collision = addEvent(state, "COLLISION", { actorId: projectile.ownerId, targetId: target.id, sourceDefinitionId: projectile.skillId, position: projectile.position }, ["PROJECTILE", projectile.element.toUpperCase()]);
        applyDamage(state, projectile.ownerId, target, projectile.damage, projectile.skillId, [projectile.element.toUpperCase(), "PROJECTILE"], [collision.id]);
        applyImpulse(state, projectile.ownerId, target, projectile.velocity, projectile.knockback, [collision.id]);
        if (projectile.status) applyStatus(state, projectile.ownerId, target, projectile.status, projectile.statusDuration ?? 1, projectile.statusStrength ?? 1, [collision.id]);
        consumed = true;
        break;
      }
    }
    if (!consumed && projectile.remaining > 0 && projectile.distanceTravelled < projectile.maxRange) next.push(projectile);
  }
  state.projectiles = next;
}

function updateFields(state: GameState, dt: number): void {
  const next: FieldState[] = [];
  for (const field of state.fields) {
    field.remaining -= dt;
    field.tickAccumulator += dt;
    if (field.tickAccumulator >= 0.5) {
      field.tickAccumulator = 0;
      const source = getPlayer(state, field.ownerId);
      if (source) {
        for (const target of alivePlayers(state)) {
          if (target.id === source.id || distance(target.position, field.position) > field.radius + target.radius) continue;
          applyDamage(state, source.id, target, field.damage, field.skillId, [field.element.toUpperCase(), "FIELD"]);
          if (field.knockback > 0) applyImpulse(state, source.id, target, sub(target.position, field.position), field.knockback);
          if (field.status) applyStatus(state, source.id, target, field.status, field.statusDuration ?? 1, field.statusStrength ?? 1);
        }
      }
    }
    if (field.remaining > 0) next.push(field);
  }
  state.fields = next;
}

function updateWalls(state: GameState, dt: number): void {
  state.walls = state.walls.filter((wall) => {
    wall.remaining -= dt;
    return wall.remaining > 0 && wall.hp > 0;
  });
}

function updateEnvironmental(state: GameState, dt: number): void {
  state.environmental.remaining -= dt;
  if (state.environmental.remaining > 0) {
    if (state.environmental.phase === "calm" && state.environmental.remaining <= ARENA_BASELINE.windWarningSeconds) {
      state.environmental.phase = "warning";
      addEvent(state, "INTERACTION", { position: state.arena.center, detail: "Wind Surge warning" }, ["EVENT", "TELEGRAPH"]);
    } else if (state.environmental.phase === "warning" && state.environmental.remaining <= 0) {
      state.environmental.phase = "active";
      state.environmental.remaining = ARENA_BASELINE.windActiveSeconds;
      state.environmental.cycleIndex += 1;
      const angle = nextRandom(state) * Math.PI * 2;
      state.environmental.direction = { x: Math.cos(angle), y: Math.sin(angle) };
      addEvent(state, "INTERACTION", { position: state.arena.center, vector: state.environmental.direction, detail: "Wind Surge active" }, ["EVENT", "WIND"]);
    }
  } else if (state.environmental.phase === "active") {
    state.environmental.phase = "calm";
    state.environmental.remaining = 8 + nextRandom(state) * 5;
    addEvent(state, "INTERACTION", { position: state.arena.center, detail: "Wind Surge ended" }, ["EVENT"]);
  }
}

function calculatePerformanceScore(player: PlayerState): number {
  return Math.round(player.performance.damage + player.performance.assists * 30 + player.performance.kos * 80 + player.performance.utility * 4 + player.performance.survivalSeconds);
}

function resolveDeath(state: GameState, target: PlayerState, cause: DeathCause): void {
  if (!target.alive) return;
  target.alive = false;
  target.performance.deaths += 1;
  const lastDamager = target.lastDamager ? getPlayer(state, target.lastDamager) : undefined;
  const killer = cause === "hazard" && target.lastImpulseContributor
    ? getPlayer(state, target.lastImpulseContributor) ?? lastDamager
    : lastDamager;
  const deathEvent = addEvent(
    state,
    "DEATH",
    { ...(killer ? { actorId: killer.id } : {}), targetId: target.id, detail: cause, position: target.position },
    [cause.toUpperCase()],
  );
  if (killer && killer.id !== target.id) {
    killer.matchScore += 100;
    killer.performance.kos += 1;
    addEvent(state, "KO", { actorId: killer.id, targetId: target.id, detail: cause }, ["KO"], [deathEvent.id]);
    const assistIds = new Set(
      state.events
        .filter((event) => event.type === "DAMAGE" && event.targetId === target.id && event.actorId && event.actorId !== killer.id && event.tick >= state.tick - 300)
        .map((event) => event.actorId as string),
    );
    for (const assistId of assistIds) {
      const assister = getPlayer(state, assistId);
      if (assister) {
        assister.performance.assists += 1;
        addEvent(state, "ASSIST", { actorId: assister.id, targetId: target.id }, ["ASSIST"], [deathEvent.id]);
      }
    }
  } else {
    addEvent(state, "KO", { targetId: target.id, detail: cause }, ["KO", "ENVIRONMENT"], [deathEvent.id]);
  }
  delete target.lastDamager;
  delete target.lastImpulseContributor;
  if (target.respawnsRemaining > 0) {
    target.respawnsRemaining -= 1;
    target.respawnTimer = 1.5;
    addEvent(state, "ROUND_END", { targetId: target.id, detail: "respawn pending" }, ["RESPAWN"]);
  } else {
    target.eliminated = true;
  }
}

export function resolveDeathForTesting(
  state: GameState,
  playerId: string,
  cause: DeathCause = "scripted",
): GameState {
  const player = state.players[playerId];
  if (!player) throw new Error("Unknown player: " + playerId);
  resolveDeath(state, player, cause);
  return state;
}

function finishMatch(state: GameState): void {
  if (state.phase === "results") return;
  const rankings = livingPlayers(state)
    .concat(Object.values(state.players).filter((player) => player.eliminated))
    .sort((a, b) => b.matchScore - a.matchScore || calculatePerformanceScore(b) - calculatePerformanceScore(a))
    .map((player, index) => ({
      playerId: player.id,
      placement: index + 1,
      matchScore: player.matchScore,
      performanceScore: calculatePerformanceScore(player),
    }));
  state.phase = "results";
  state.result = {
    ...(rankings[0] ? { winnerId: rankings[0].playerId } : {}),
    rankings,
  };
  addEvent(state, "MATCH_END", { detail: "results" }, ["RESULT"]);
}

function checkEnd(state: GameState): void {
  const remaining = livingPlayers(state).filter((player) => player.alive || player.respawnTimer > 0);
  if (remaining.length <= 1 || state.time >= ARENA_BASELINE.roundDurationSeconds) finishMatch(state);
}

export function stepMatch(
  state: GameState,
  commands: InputCommand[] = [],
  dt = FIXED_STEP_SECONDS,
): GameState {
  if (state.phase === "results") return state;
  const safeDt = clamp(dt, 0, 0.1);
  state.tick += 1;
  state.time += safeDt;
  for (const command of commands) addEvent(state, "INPUT_ACCEPTED", { actorId: command.playerId, vector: command.move }, ["INPUT"]);
  processInputs(state, commands, safeDt);
  updateEnvironmental(state, safeDt);
  updateStatuses(state, safeDt);
  updateFields(state, safeDt);
  updateProjectiles(state, safeDt);
  updatePlayers(state, safeDt);
  updateWalls(state, safeDt);
  checkEnd(state);
  return state;
}

export function startFinalRound(state: GameState): GameState {
  state.mode = "final";
  state.round += 1;
  state.phase = "round";
  delete state.result;
  for (const player of Object.values(state.players)) {
    player.eliminated = false;
    player.alive = true;
    player.respawnTimer = 0;
    player.respawnsRemaining = MODE_RULES.final.respawns;
    player.hp = player.maxHp;
    player.mana = player.maxMana;
    player.position = { ...player.spawn };
    player.velocity = { x: 0, y: 0 };
    player.matchScore = 0;
    player.performance = { damage: 0, assists: 0, kos: 0, survivalSeconds: 0, utility: 0, deaths: 0 };
  }
  addEvent(state, "ROUND_END", { detail: "final round started" }, ["FINAL", "RESPAWN"]);
  return state;
}

export function latestEvents(state: GameState, limit = 12): MatchEvent[] {
  return state.events.slice(-limit);
}

export function elementColor(element: ElementId): number {
  return ELEMENT_COLORS[element] ?? 0xffffff;
}

export function hexColor(element: ElementId): string {
  return "#" + elementColor(element).toString(16).padStart(6, "0");
}

export function getModeRespawnLabel(mode: MatchMode): string {
  return mode === "final" ? "Final: 3 respawns" : "Standard: 1 respawn";
}

export function getSkillBehaviorLabel(behavior: SkillBehavior): string {
  return behavior.toUpperCase();
}

export function isTargetInGroundState(player: PlayerState): boolean {
  return !status(player, "airborne");
}

export function canGroundOnlyHit(player: PlayerState): boolean {
  return isTargetInGroundState(player);
}

export function compareDeterministicSnapshots(a: GameState, b: GameState): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export { heroesById, skillsById };
