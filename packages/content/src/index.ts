import { z } from "zod";
import {
  BossDefinitionSchema,
  CurrencyDefinitionSchema,
  ExpandedElementSchema,
  HistoryChapterSchema,
  HistoryStageSchema,
  RuneDefinitionSchema,
  TalentNodeSchema,
  bossDefinitions,
  currencyDefinitions,
  expandedElementDefinitions,
  historyChapters,
  historyStages,
  runeDefinitions,
  talentNodes,
} from "./meta";

export const CONTENT_VERSION = "content-0.1.0";

export const ELEMENTS = [
  "fire",
  "water",
  "earth",
  "air",
  "lightning",
  "ice",
  "venom",
  "dark",
  "light",
  "iron",
] as const;
export type ElementId = (typeof ELEMENTS)[number];

export const STARTER_HERO_IDS = ["fire-ember", "water-tide", "earth-bastion", "air-gale"] as const;
export type StarterHeroId = (typeof STARTER_HERO_IDS)[number];
export type HeroId = StarterHeroId | string;
export const HERO_CLASSES = ["tank", "damage", "utility"] as const;
export type HeroClass = (typeof HERO_CLASSES)[number];

const vecSchema = z.object({ x: z.number(), y: z.number() });

export const SkillGeometrySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("line"), range: z.number().positive() }),
  z.object({ kind: z.literal("cone"), range: z.number().positive(), angle: z.number().positive() }),
  z.object({ kind: z.literal("circle"), range: z.number().nonnegative() }),
  z.object({ kind: z.literal("ring"), range: z.number().positive(), thickness: z.number().positive() }),
  z.object({ kind: z.literal("arc"), range: z.number().positive(), angle: z.number().positive() }),
  z.object({ kind: z.literal("wall"), range: z.number().positive(), width: z.number().positive() }),
  z.object({ kind: z.literal("beam"), range: z.number().positive(), width: z.number().positive() }),
  z.object({ kind: z.literal("fan"), range: z.number().positive(), angle: z.number().positive() }),
  z.object({ kind: z.literal("trail"), range: z.number().positive(), width: z.number().positive() }),
  z.object({ kind: z.literal("orbit"), range: z.number().positive(), count: z.number().int().positive() }),
  z.object({ kind: z.literal("chain"), range: z.number().positive(), jumps: z.number().int().positive() }),
  z.object({ kind: z.literal("pullCircle"), range: z.number().nonnegative() }),
  z.object({ kind: z.literal("dashLine"), range: z.number().positive() }),
  z.object({ kind: z.literal("hook"), range: z.number().positive() }),
  z.object({ kind: z.literal("bounce"), range: z.number().positive(), bounces: z.number().int().nonnegative() }),
]);
export type SkillGeometry = z.infer<typeof SkillGeometrySchema>;

export const SkillDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  heroId: z.string().min(1),
  element: z.enum(ELEMENTS),
  geometry: SkillGeometrySchema,
  tags: z.array(z.string()).min(1),
  balanceKey: z.string().min(1),
  summary: z.string().min(1),
  preview: z.object({
    predictableBounce: z.boolean(),
    dynamicSegment: z.boolean(),
  }),
});
export type SkillDefinition = z.infer<typeof SkillDefinitionSchema>;

export const HeroDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  element: z.enum(ELEMENTS),
  primaryClass: z.enum(HERO_CLASSES),
  difficulty: z.enum(["easy", "medium", "hard"]),
  passive: z.string().min(1),
  skillIds: z.array(z.string()).length(4),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  summary: z.string().min(1),
});
export type HeroDefinition = z.infer<typeof HeroDefinitionSchema>;

export const STATUS_IDS = ["burning", "slowed", "rooted", "airborne", "wind-charged"] as const;
export type StatusId = (typeof STATUS_IDS)[number];

const skill = (
  id: string,
  name: string,
  heroId: StarterHeroId,
  element: ElementId,
  geometry: SkillGeometry,
  balanceKey: string,
  summary: string,
  tags: string[],
  predictableBounce = false,
  dynamicSegment = false,
): SkillDefinition => ({
  id,
  name,
  heroId,
  element,
  geometry,
  balanceKey,
  summary,
  tags,
  preview: { predictableBounce, dynamicSegment },
});

export const skillDefinitions: SkillDefinition[] = [
  skill("fire-ember-bolt", "Ember Bolt", "fire-ember", "fire", { kind: "line", range: 560 }, "fire-ember-bolt", "Fast projectile with reliable push.", ["FIRE", "PROJECTILE"], true),
  skill("fire-flare-burst", "Flare Burst", "fire-ember", "fire", { kind: "circle", range: 390 }, "fire-flare-burst", "Radial explosion that displaces nearby targets.", ["FIRE", "AREA", "DESTRUCTIVE"]),
  skill("fire-scorch-trail", "Scorch Trail", "fire-ember", "fire", { kind: "trail", range: 310, width: 72 }, "fire-scorch-trail", "Leaves a burning lane that punishes pursuit.", ["FIRE", "AREA", "GROUND"]),
  skill("fire-solar-orb", "Solar Orb", "fire-ember", "fire", { kind: "bounce", range: 480, bounces: 1 }, "fire-solar-orb", "A heavy orb that can bounce once from a wall.", ["FIRE", "PROJECTILE", "BOUNCE"], true),

  skill("water-pressure-jet", "Pressure Jet", "water-tide", "water", { kind: "line", range: 520 }, "water-pressure-jet", "A precise flow that pushes targets away.", ["WATER", "PROJECTILE", "CONTROL"], true),
  skill("water-undertow", "Undertow", "water-tide", "water", { kind: "pullCircle", range: 350 }, "water-undertow", "Pulls nearby enemies toward the selected current.", ["WATER", "AREA", "PULL"]),
  skill("water-tide-field", "Tide Field", "water-tide", "water", { kind: "circle", range: 360 }, "water-tide-field", "Creates a slow field that changes movement timing.", ["WATER", "AREA", "GROUND"]),
  skill("water-wave-wall", "Wave Wall", "water-tide", "water", { kind: "wall", range: 330, width: 150 }, "water-wave-wall", "Raises a short-lived moving barrier.", ["WATER", "WALL", "CONTROL"]),

  skill("earth-stone-shard", "Stone Shard", "earth-bastion", "earth", { kind: "line", range: 430 }, "earth-stone-shard", "A dense projectile with high displacement.", ["EARTH", "PROJECTILE"], true),
  skill("earth-bulwark", "Bulwark", "earth-bastion", "earth", { kind: "wall", range: 300, width: 190 }, "earth-bulwark", "Places cover that blocks supported projectiles.", ["EARTH", "WALL", "DESTRUCTIVE"]),
  skill("earth-quake", "Quake", "earth-bastion", "earth", { kind: "circle", range: 260 }, "earth-quake", "A ground shock that lifts grounded targets.", ["EARTH", "AREA", "GROUND"]),
  skill("earth-boulder", "Boulder", "earth-bastion", "earth", { kind: "arc", range: 500, angle: 0.55 }, "earth-boulder", "A slow, massive arcing projectile.", ["EARTH", "PROJECTILE", "HEAVY"]),

  skill("air-gust", "Gust", "air-gale", "air", { kind: "line", range: 500 }, "air-gust", "Redirects momentum with a sharp gust.", ["AIR", "PROJECTILE", "CONTROL"], true),
  skill("air-vortex", "Vortex", "air-gale", "air", { kind: "pullCircle", range: 350 }, "air-vortex", "Pulls targets toward a rotating center.", ["AIR", "AREA", "PULL"]),
  skill("air-wind-shear", "Wind Shear", "air-gale", "air", { kind: "arc", range: 420, angle: 1.2 }, "air-wind-shear", "A wide curved blade that rewards positioning.", ["AIR", "PROJECTILE", "ARC"]),
  skill("air-updraft", "Updraft", "air-gale", "air", { kind: "dashLine", range: 290 }, "air-updraft", "Repositions rapidly and leaves a displacement wake.", ["AIR", "MOBILITY", "DASH"]),
];

export const heroDefinitions: HeroDefinition[] = [
  {
    id: "fire-ember",
    name: "Ember",
    element: "fire",
    primaryClass: "damage",
    difficulty: "easy",
    passive: "Ignition: repeated fire hits briefly amplify the next impulse.",
    skillIds: ["fire-ember-bolt", "fire-flare-burst", "fire-scorch-trail", "fire-solar-orb"],
    color: "#ff6b35",
    summary: "Explosions, pressure and burning lanes. Teaches direct damage plus knockout timing.",
  },
  {
    id: "water-tide",
    name: "Tide",
    element: "water",
    primaryClass: "utility",
    difficulty: "easy",
    passive: "Flow State: movement through a water field preserves more momentum.",
    skillIds: ["water-pressure-jet", "water-undertow", "water-tide-field", "water-wave-wall"],
    color: "#35baf6",
    summary: "Push, pull and slow. Teaches space manipulation and team utility.",
  },
  {
    id: "earth-bastion",
    name: "Bastion",
    element: "earth",
    primaryClass: "tank",
    difficulty: "easy",
    passive: "Mass: displacement received is reduced while grounded.",
    skillIds: ["earth-stone-shard", "earth-bulwark", "earth-quake", "earth-boulder"],
    color: "#c99a5b",
    summary: "Walls, mass and stability. Teaches cover, collisions and controlled pressure.",
  },
  {
    id: "air-gale",
    name: "Gale",
    element: "air",
    primaryClass: "utility",
    difficulty: "medium",
    passive: "Slipstream: air skills slightly redirect nearby projectile trajectories.",
    skillIds: ["air-gust", "air-vortex", "air-wind-shear", "air-updraft"],
    color: "#b18cff",
    summary: "Mobility, redirection and recovery. Teaches trajectory control and edge saves.",
  },
];

export const heroesById: Record<string, HeroDefinition> = Object.fromEntries(
  heroDefinitions.map((hero) => [hero.id, hero]),
);
export const skillsById: Record<string, SkillDefinition> = Object.fromEntries(
  skillDefinitions.map((skillDefinition) => [skillDefinition.id, skillDefinition]),
);

export function validateCanonicalContent(): void {
  HeroDefinitionSchema.array().parse(heroDefinitions);
  SkillDefinitionSchema.array().parse(skillDefinitions);
  ExpandedElementSchema.array().parse(expandedElementDefinitions);
  HistoryChapterSchema.array().parse(historyChapters);
  HistoryStageSchema.array().parse(historyStages);
  BossDefinitionSchema.array().parse(bossDefinitions);
  TalentNodeSchema.array().parse(talentNodes);
  RuneDefinitionSchema.array().parse(runeDefinitions);
  CurrencyDefinitionSchema.array().parse(currencyDefinitions);
  if (new Set(skillDefinitions.map((item) => item.id)).size !== skillDefinitions.length) {
    throw new Error("Duplicate skill definition id");
  }
  for (const hero of heroDefinitions) {
    for (const skillId of hero.skillIds) {
      if (!skillsById[skillId]) throw new Error("Unresolved skill reference: " + hero.id + " -> " + skillId);
    }
  }
}

export const contentVectorSchema = vecSchema;

export {
  BossDefinitionSchema,
  CurrencyDefinitionSchema,
  ExpandedElementSchema,
  HistoryChapterSchema,
  HistoryStageSchema,
  RuneDefinitionSchema,
  TalentNodeSchema,
  bossDefinitions,
  currencyDefinitions,
  expandedElementDefinitions,
  historyChapters,
  historyStages,
  runeDefinitions,
  talentNodes,
  type BossDefinition,
  type CurrencyDefinition,
  type ExpandedElementDefinition,
  type HistoryChapter,
  type HistoryStage,
  type RuneDefinition,
  type TalentNode,
} from "./meta";
