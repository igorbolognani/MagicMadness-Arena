import { z } from "zod";

export const EXPANDED_ELEMENT_IDS = ["lightning", "ice", "venom", "dark", "light", "iron"] as const;
export type ExpandedElementId = (typeof EXPANDED_ELEMENT_IDS)[number];

export const ExpandedElementSchema = z.object({
  id: z.enum(EXPANDED_ELEMENT_IDS),
  mechanicalIdentity: z.string().min(1),
  requiredDifferences: z.array(z.string()).min(3),
  competitiveReady: z.boolean(),
});
export type ExpandedElementDefinition = z.infer<typeof ExpandedElementSchema>;

export const expandedElementDefinitions: ExpandedElementDefinition[] = [
  { id: "lightning", mechanicalIdentity: "velocity, chain and conductive metal interactions", requiredDifferences: ["chain", "speed", "conduction"], competitiveReady: false },
  { id: "ice", mechanicalIdentity: "friction, slide, freeze and ground-state control", requiredDifferences: ["friction", "slide", "freeze"], competitiveReady: false },
  { id: "venom", mechanicalIdentity: "persistent zones, debuffs and cloud reactions", requiredDifferences: ["persistent-zone", "debuff", "cloud-reaction"], competitiveReady: false },
  { id: "dark", mechanicalIdentity: "teleport, gravity, swap and topology manipulation", requiredDifferences: ["teleport", "gravity", "swap"], competitiveReady: false },
  { id: "light", mechanicalIdentity: "beams, shields, cleanse and support", requiredDifferences: ["beam", "shield", "cleanse"], competitiveReady: false },
  { id: "iron", mechanicalIdentity: "mass, ricochet, magnetism and conductivity", requiredDifferences: ["mass", "ricochet", "magnetism"], competitiveReady: false },
];

export const BossDefinitionSchema = z.object({
  id: z.string().min(1),
  chapterId: z.string().min(1),
  name: z.string().min(1),
  element: z.string().min(1),
  phaseCount: z.number().int().min(1).max(5),
  activeSkills: z.array(z.string()).min(1).max(5),
  mechanicHooks: z.array(z.string()).min(1),
  rewardTableId: z.string().min(1),
});
export type BossDefinition = z.infer<typeof BossDefinitionSchema>;

export const bossDefinitions: BossDefinition[] = [
  {
    id: "cinder-warden",
    chapterId: "fire-chapter",
    name: "Cinder Warden",
    element: "fire",
    phaseCount: 3,
    activeSkills: ["telegraphed-meteor", "ember-ring", "wall-breaker", "summon-cinderlings", "edge-surge"],
    mechanicHooks: ["meteor-safe-zones", "destructible-cover", "edge-recovery", "summon-pressure"],
    rewardTableId: "history-fire-01",
  },
];

export const HistoryChapterSchema = z.object({
  id: z.string().min(1),
  order: z.number().int().positive(),
  element: z.string().min(1),
  title: z.string().min(1),
  teachingFocus: z.array(z.string()).min(1),
  stageIds: z.array(z.string()).min(1),
  bossIds: z.array(z.string()).min(1),
});
export type HistoryChapter = z.infer<typeof HistoryChapterSchema>;

export const historyChapters: HistoryChapter[] = [
  { id: "fire-chapter", order: 1, element: "fire", title: "The First Spark", teachingFocus: ["projectile", "explosion", "knockback", "hazard-positioning"], stageIds: ["fire-01", "fire-02", "fire-03"], bossIds: ["cinder-warden"] },
  { id: "water-chapter", order: 2, element: "water", title: "The Moving Current", teachingFocus: ["push-pull", "flow", "slow", "moving-interaction"], stageIds: ["water-01", "water-02"], bossIds: ["tide-keeper-placeholder"] },
  { id: "earth-chapter", order: 3, element: "earth", title: "Weight of the World", teachingFocus: ["walls", "mass", "stability", "objects"], stageIds: ["earth-01", "earth-02"], bossIds: ["stone-sentinel-placeholder"] },
  { id: "air-chapter", order: 4, element: "air", title: "The Open Edge", teachingFocus: ["mobility", "redirection", "recovery", "trajectory"], stageIds: ["air-01", "air-02"], bossIds: ["gale-herald-placeholder"] },
];

export const TalentNodeSchema = z.object({
  id: z.string().min(1),
  branch: z.enum(["ATTACK", "DEFENSE", "UTILITY"]),
  requiredAccountLevel: z.union([z.literal(10), z.literal(20), z.literal(30)]),
  prerequisites: z.array(z.string()),
  effectKind: z.enum(["mechanic", "reallocation", "resource", "affinity", "tactical", "sidegrade"]),
  description: z.string().min(1),
  glossaryRefs: z.array(z.string()),
});
export type TalentNode = z.infer<typeof TalentNodeSchema>;

export const talentNodes: TalentNode[] = [
  { id: "attack-10-pressure", branch: "ATTACK", requiredAccountLevel: 10, prerequisites: [], effectKind: "sidegrade", description: "Slightly favors direct Force while respecting the PvP cap.", glossaryRefs: ["force", "mode-cap"] },
  { id: "defense-10-stability", branch: "DEFENSE", requiredAccountLevel: 10, prerequisites: [], effectKind: "mechanic", description: "Improves grounded recovery timing without removing displacement counterplay.", glossaryRefs: ["resilience", "stability"] },
  { id: "utility-10-flow", branch: "UTILITY", requiredAccountLevel: 10, prerequisites: [], effectKind: "resource", description: "Makes resource behavior more controllable without uncapped global power.", glossaryRefs: ["control", "resource"] },
];

export const RuneDefinitionSchema = z.object({
  id: z.string().min(1),
  family: z.enum(["Projectile", "Knockback", "Mobility", "Resource", "Timing", "Area", "Defense", "Sustain", "Control", "Element"]),
  compatibleTags: z.array(z.string()).min(1),
  positiveEffect: z.string().min(1),
  tradeoff: z.string().min(1),
  tier: z.number().int().positive(),
  stackingGroup: z.string().min(1),
  powerBudget: z.number().positive(),
});
export type RuneDefinition = z.infer<typeof RuneDefinitionSchema>;

export const runeDefinitions: RuneDefinition[] = [
  { id: "rune-swift-edge", family: "Projectile", compatibleTags: ["PROJECTILE"], positiveEffect: "projectile speed", tradeoff: "projectile radius", tier: 1, stackingGroup: "projectile-shape", powerBudget: 1 },
  { id: "rune-wide-current", family: "Area", compatibleTags: ["AREA"], positiveEffect: "impact radius", tradeoff: "cast velocity", tier: 1, stackingGroup: "area-velocity", powerBudget: 1 },
  { id: "rune-heavy-push", family: "Knockback", compatibleTags: ["DISPLACEMENT"], positiveEffect: "knockback", tradeoff: "mana cost", tier: 1, stackingGroup: "knockback-resource", powerBudget: 1 },
];

export const CurrencyDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  sourceTypes: z.array(z.string()).min(1),
  spendTypes: z.array(z.string()).min(1),
  paidOnly: z.boolean(),
});
export type CurrencyDefinition = z.infer<typeof CurrencyDefinitionSchema>;

export const currencyDefinitions: CurrencyDefinition[] = [
  { id: "spark", name: "Spark", sourceTypes: ["history", "boss", "account-milestone", "event"], spendTypes: ["hero-discovery", "rune-material"], paidOnly: false },
  { id: "style-shard", name: "Style Shard", sourceTypes: ["duplicate", "achievement", "event"], spendTypes: ["cosmetic", "target-choice"], paidOnly: false },
];
