import type { SkillTuning } from "./index";

export const BUILD_VERSION = "account-build-0.1.0";
export const SKILL_UNLOCK_LEVELS = [1, 2, 4, 7] as const;
export const RUNE_SLOT_LEVELS = [5, 15, 25] as const;
export type AccountBuild = { accountLevel: number; talents: string[]; runes: string[] };
export const TALENT_CHOICES = [
  { id: "attack-10-pressure", level: 10, name: "Pressure", branch: "Attack", description: "+2% spell damage. Keep your opponent under pressure." },
  { id: "defense-10-stability", level: 10, name: "Stability", branch: "Defense", description: "2% less displacement received." },
  { id: "utility-10-flow", level: 10, name: "Flow", branch: "Utility", description: "2% less mana per spell." },
  { id: "attack-20-pressure", level: 20, name: "Kindled pressure", branch: "Attack", description: "+2% spell damage. Stacks within the 5% account cap." },
  { id: "defense-20-stability", level: 20, name: "Rooted stance", branch: "Defense", description: "2% less displacement received." },
  { id: "utility-20-flow", level: 20, name: "Steady flow", branch: "Utility", description: "2% less mana per spell." },
  { id: "attack-30-pressure", level: 30, name: "Mastered pressure", branch: "Attack", description: "+1% spell damage. Maximum total bonus: 5%." },
  { id: "defense-30-stability", level: 30, name: "Unbroken stance", branch: "Defense", description: "4% less displacement received. Maximum total: 8%." },
  { id: "utility-30-flow", level: 30, name: "Effortless flow", branch: "Utility", description: "2% less mana per spell. Maximum total: 6%." },
] as const;
export const RUNE_CHOICES = [
  { id: "rune-swift-edge", name: "Swift Edge", positive: "+10% projectile speed", tradeoff: "−8% projectile radius", compatible: "Projectiles and arcs" },
  { id: "rune-wide-current", name: "Wide Current", positive: "+8% area radius", tradeoff: "+8% mana cost", compatible: "Fields, pulls and radial spells" },
  { id: "rune-heavy-push", name: "Heavy Push", positive: "+8% displacement", tradeoff: "+8% mana cost", compatible: "Spells with displacement" },
] as const;

export function validBuild(build: AccountBuild): boolean {
  if (!Number.isInteger(build.accountLevel) || build.accountLevel < 1 || build.accountLevel > 30) return false;
  if (new Set(build.talents).size !== build.talents.length || new Set(build.runes).size !== build.runes.length) return false;
  const picked = build.talents.map(id => TALENT_CHOICES.find(item => item.id === id));
  if (picked.some(item => !item || item.level > build.accountLevel)) return false;
  if (new Set(picked.map(item => item!.level)).size !== picked.length) return false;
  return build.runes.length <= RUNE_SLOT_LEVELS.filter(level => level <= build.accountLevel).length && build.runes.every(id => RUNE_CHOICES.some(item => item.id === id));
}

export function displacementResistance(build?: AccountBuild): number {
  if (!build) return 1;
  return 1 - Math.min(.08, build.talents.reduce((sum, id) => sum + (id.startsWith("defense-") ? id.includes("-30-") ? .04 : .02 : 0), 0));
}

export function tuneAccountSkill(base: SkillTuning, build?: AccountBuild): SkillTuning {
  if (!build) return base;
  const tuning = { ...base };
  const damage = Math.min(.05, build.talents.reduce((sum, id) => sum + (id.startsWith("attack-") ? id.includes("-30-") ? .01 : .02 : 0), 0));
  const efficiency = Math.min(.06, build.talents.filter(id => id.startsWith("utility-")).length * .02);
  tuning.damage *= 1 + damage; tuning.manaCost *= 1 - efficiency;
  if (build.runes.includes("rune-swift-edge") && ["projectile", "arc"].includes(base.behavior)) { tuning.projectileSpeed *= 1.1; tuning.radius *= .92; tuning.effectRadius *= .92; }
  if (build.runes.includes("rune-wide-current") && ["radial", "pull", "field"].includes(base.behavior)) { tuning.radius *= 1.08; tuning.effectRadius *= 1.08; tuning.manaCost *= 1.08; }
  if (build.runes.includes("rune-heavy-push") && base.knockback !== 0) { tuning.knockback *= 1.08; tuning.manaCost *= 1.08; }
  return tuning;
}
