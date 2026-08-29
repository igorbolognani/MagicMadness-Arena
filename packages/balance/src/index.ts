import { z } from "zod";

export const BALANCE_VERSION = "balance-baseline-0.1.0";
export const PHYSICS_BASELINE = {
  fixedStepSeconds: 1 / 60,
  moveSpeed: 245,
  acceleration: 1350,
  friction: 0.82,
  playerRadius: 24,
  maxHp: 100,
  maxMana: 100,
  manaRegenPerSecond: 7,
  globalKnockbackScale: 1,
  hazardDamagePerSecond: 24,
  hazardKoDistance: 80,
  dashDistance: 170,
  dashDuration: 0.16,
  dashCooldown: 4.2,
  potionCooldown: 8,
  healthPotionAmount: 32,
  manaPotionAmount: 38,
} as const;

export type SkillBehavior = "projectile" | "radial" | "field" | "wall" | "pull" | "arc" | "dash";

export type SkillTuning = {
  behavior: SkillBehavior;
  cooldown: number;
  manaCost: number;
  damage: number;
  knockback: number;
  range: number;
  projectileSpeed: number;
  radius: number;
  lifetime: number;
  effectRadius: number;
  status?: string;
  statusDuration?: number;
  statusStrength?: number;
  projectileBounces: number;
};

export const SkillTuningSchema = z.object({
  behavior: z.enum(["projectile", "radial", "field", "wall", "pull", "arc", "dash"]),
  cooldown: z.number().nonnegative(),
  manaCost: z.number().nonnegative(),
  damage: z.number().nonnegative(),
  knockback: z.number(),
  range: z.number().nonnegative(),
  projectileSpeed: z.number().nonnegative(),
  radius: z.number().positive(),
  lifetime: z.number().nonnegative(),
  effectRadius: z.number().positive(),
  status: z.string().optional(),
  statusDuration: z.number().positive().optional(),
  statusStrength: z.number().nonnegative().optional(),
  projectileBounces: z.number().int().nonnegative(),
});

const projectile = (
  cooldown: number,
  manaCost: number,
  damage: number,
  knockback: number,
  range: number,
  projectileSpeed: number,
  radius: number,
  lifetime = 2.5,
  projectileBounces = 0,
  status?: string,
  statusDuration?: number,
  statusStrength?: number,
): SkillTuning => ({
  behavior: "projectile",
  cooldown,
  manaCost,
  damage,
  knockback,
  range,
  projectileSpeed,
  radius,
  lifetime,
  effectRadius: radius,
  projectileBounces,
  ...(status ? { status } : {}),
  ...(statusDuration !== undefined ? { statusDuration } : {}),
  ...(statusStrength !== undefined ? { statusStrength } : {}),
});

const radial = (
  cooldown: number,
  manaCost: number,
  damage: number,
  knockback: number,
  range: number,
  effectRadius: number,
  status?: string,
  statusDuration?: number,
  statusStrength?: number,
): SkillTuning => ({
  behavior: "radial",
  cooldown,
  manaCost,
  damage,
  knockback,
  range,
  projectileSpeed: 0,
  radius: effectRadius,
  lifetime: 0,
  effectRadius,
  projectileBounces: 0,
  ...(status ? { status } : {}),
  ...(statusDuration !== undefined ? { statusDuration } : {}),
  ...(statusStrength !== undefined ? { statusStrength } : {}),
});

export const skillBalance: Record<string, SkillTuning> = {
  "fire-ember-bolt": projectile(1.2, 12, 18, 92, 560, 670, 14),
  "fire-flare-burst": radial(3.8, 24, 24, 150, 260, 104, "burning", 3.2, 12),
  "fire-scorch-trail": { behavior: "field", cooldown: 7, manaCost: 30, damage: 7, knockback: 10, range: 310, projectileSpeed: 0, radius: 36, lifetime: 5, effectRadius: 72, status: "burning", statusDuration: 2.6, statusStrength: 10, projectileBounces: 0 },
  "fire-solar-orb": projectile(5.4, 34, 32, 185, 480, 410, 22, 3.6, 1, "burning", 2.5, 8),

  "water-pressure-jet": projectile(1.1, 11, 12, 112, 520, 720, 15, 2.1, 0, "slowed", 1.7, 0.35),
  "water-undertow": { behavior: "pull", cooldown: 4.5, manaCost: 25, damage: 8, knockback: -135, range: 300, projectileSpeed: 0, radius: 52, lifetime: 0, effectRadius: 118, status: "slowed", statusDuration: 2.1, statusStrength: 0.42, projectileBounces: 0 },
  "water-tide-field": { behavior: "field", cooldown: 7.5, manaCost: 28, damage: 4, knockback: 5, range: 330, projectileSpeed: 0, radius: 55, lifetime: 5.2, effectRadius: 92, status: "slowed", statusDuration: 1.2, statusStrength: 0.55, projectileBounces: 0 },
  "water-wave-wall": { behavior: "wall", cooldown: 6.5, manaCost: 28, damage: 9, knockback: 80, range: 300, projectileSpeed: 0, radius: 18, lifetime: 4.5, effectRadius: 70, status: "slowed", statusDuration: 1.8, statusStrength: 0.45, projectileBounces: 0 },

  "earth-stone-shard": projectile(1.45, 13, 20, 140, 430, 560, 17),
  "earth-bulwark": { behavior: "wall", cooldown: 8.5, manaCost: 30, damage: 0, knockback: 0, range: 300, projectileSpeed: 0, radius: 20, lifetime: 6.5, effectRadius: 90, projectileBounces: 0 },
  "earth-quake": radial(5.6, 30, 18, 120, 220, 112, "airborne", 0.9, 1),
  "earth-boulder": { behavior: "arc", cooldown: 5.8, manaCost: 32, damage: 36, knockback: 220, range: 500, projectileSpeed: 330, radius: 26, lifetime: 3.5, effectRadius: 26, projectileBounces: 0 },

  "air-gust": projectile(1.25, 12, 11, 145, 500, 760, 13),
  "air-vortex": { behavior: "pull", cooldown: 5.4, manaCost: 28, damage: 9, knockback: -155, range: 310, projectileSpeed: 0, radius: 50, lifetime: 0, effectRadius: 112, status: "wind-charged", statusDuration: 2, statusStrength: 1, projectileBounces: 0 },
  "air-wind-shear": { behavior: "arc", cooldown: 3.4, manaCost: 18, damage: 19, knockback: 105, range: 420, projectileSpeed: 530, radius: 18, lifetime: 1.5, effectRadius: 18, projectileBounces: 0 },
  "air-updraft": { behavior: "dash", cooldown: 5.2, manaCost: 22, damage: 9, knockback: 100, range: 290, projectileSpeed: 0, radius: 24, lifetime: 0, effectRadius: 60, projectileBounces: 0 },
};

export const HERO_BASE_ATTRIBUTES: Record<string, { force: number; resilience: number; control: number }> = {
  "fire-ember": { force: 1.08, resilience: 0.94, control: 0.98 },
  "water-tide": { force: 0.9, resilience: 0.98, control: 1.1 },
  "earth-bastion": { force: 0.94, resilience: 1.14, control: 0.96 },
  "air-gale": { force: 0.92, resilience: 0.9, control: 1.12 },
};

export const ARENA_BASELINE = {
  width: 1600,
  height: 900,
  margin: 44,
  hazardKoDistance: PHYSICS_BASELINE.hazardKoDistance,
  roundDurationSeconds: 120,
  windWarningSeconds: 2.5,
  windActiveSeconds: 6,
} as const;

export const MODE_RULES = {
  standard: { respawns: 1, finalRound: false },
  final: { respawns: 3, finalRound: true },
} as const;

export const META_BALANCE_VERSION = "meta-baseline-0.1.0";

export const TALENT_CAPS = {
  attack: { force: 0.08, directDamage: 0.05 },
  defense: { resilience: 0.08, displacementResistance: 0.08 },
  utility: { control: 0.08, resourceEfficiency: 0.06 },
} as const;

export const RUNE_POWER_BUDGET = {
  tier1: 1,
  tier2: 1,
  tier3: 1,
  maxEquippedPerFamily: 1,
} as const;

export const ECONOMY_BASELINE = {
  freeSparkPerFirstClear: 120,
  duplicateStyleShard: 40,
  targetPreferenceWeight: 1.35,
  pityPulls: 40,
  paidOnlyCombatPower: false,
  duplicateCombatPower: 0,
} as const;

export function getSkillTuning(skillId: string): SkillTuning {
  const tuning = skillBalance[skillId];
  if (!tuning) throw new Error("Missing balance data for skill: " + skillId);
  return tuning;
}

export function validateBalance(): void {
  z.record(SkillTuningSchema).parse(skillBalance);
  z.record(z.object({ force: z.number(), resilience: z.number(), control: z.number() })).parse(HERO_BASE_ATTRIBUTES);
  z.object({
    fixedStepSeconds: z.number().positive(),
    moveSpeed: z.number().positive(),
    acceleration: z.number().positive(),
    friction: z.number().positive(),
    playerRadius: z.number().positive(),
    maxHp: z.number().positive(),
    maxMana: z.number().positive(),
    manaRegenPerSecond: z.number().nonnegative(),
    globalKnockbackScale: z.number().nonnegative(),
    hazardDamagePerSecond: z.number().nonnegative(),
    hazardKoDistance: z.number().positive(),
    dashDistance: z.number().positive(),
    dashDuration: z.number().positive(),
    dashCooldown: z.number().positive(),
    potionCooldown: z.number().positive(),
    healthPotionAmount: z.number().positive(),
    manaPotionAmount: z.number().positive(),
  }).parse(PHYSICS_BASELINE);
}
