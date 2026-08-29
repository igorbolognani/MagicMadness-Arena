import { RUNE_POWER_BUDGET, TALENT_CAPS } from "@mma/balance";
import { runeDefinitions, talentNodes, type RuneDefinition, type TalentNode } from "@mma/content";
import { z } from "zod";

export const PROGRESSION_VERSION = "progression-0.1.0";

export const AccountProgressionSchema = z.object({
  accountId: z.string().min(1),
  level: z.number().int().min(1).max(30),
  xp: z.number().nonnegative(),
  unlockedTalentIds: z.array(z.string()),
  equippedRuneIds: z.array(z.string()),
});
export type AccountProgression = z.infer<typeof AccountProgressionSchema>;

export type BuildSnapshot = {
  accountLevel: number;
  talents: string[];
  runes: string[];
  caps: typeof TALENT_CAPS;
};

export function createAccountProgression(accountId: string): AccountProgression {
  return { accountId, level: 1, xp: 0, unlockedTalentIds: [], equippedRuneIds: [] };
}

export function accountBand(level: number): "1-10" | "10-20" | "20-30" {
  if (level < 10) return "1-10";
  if (level < 20) return "10-20";
  return "20-30";
}

export function findTalent(id: string): TalentNode {
  const talent = talentNodes.find((entry) => entry.id === id);
  if (!talent) throw new Error("Unknown talent: " + id);
  return talent;
}

export function findRune(id: string): RuneDefinition {
  const rune = runeDefinitions.find((entry) => entry.id === id);
  if (!rune) throw new Error("Unknown rune: " + id);
  return rune;
}

export function unlockTalent(account: AccountProgression, talentId: string): AccountProgression {
  const talent = findTalent(talentId);
  if (account.level < talent.requiredAccountLevel) throw new Error("Talent level requirement not met: " + talentId);
  for (const prerequisite of talent.prerequisites) {
    if (!account.unlockedTalentIds.includes(prerequisite)) throw new Error("Talent prerequisite not met: " + prerequisite);
  }
  if (account.unlockedTalentIds.includes(talentId)) return account;
  const next = { ...account, unlockedTalentIds: [...account.unlockedTalentIds, talentId] };
  AccountProgressionSchema.parse(next);
  return next;
}

export function equipRune(account: AccountProgression, runeId: string): AccountProgression {
  const rune = findRune(runeId);
  const currentlyEquipped = account.equippedRuneIds.map(findRune);
  const sameGroup = currentlyEquipped.find((entry) => entry.stackingGroup === rune.stackingGroup);
  if (sameGroup && sameGroup.id !== rune.id) {
    throw new Error("Rune stacking group already occupied: " + rune.stackingGroup);
  }
  if (rune.powerBudget > RUNE_POWER_BUDGET.tier1) throw new Error("Rune exceeds configured power budget");
  if (account.equippedRuneIds.includes(runeId)) return account;
  const next = { ...account, equippedRuneIds: [...account.equippedRuneIds, runeId] };
  AccountProgressionSchema.parse(next);
  return next;
}

export function buildSnapshot(account: AccountProgression): BuildSnapshot {
  AccountProgressionSchema.parse(account);
  return {
    accountLevel: account.level,
    talents: [...account.unlockedTalentIds],
    runes: [...account.equippedRuneIds],
    caps: TALENT_CAPS,
  };
}

export function validateProgression(account: AccountProgression): void {
  AccountProgressionSchema.parse(account);
  for (const talentId of account.unlockedTalentIds) findTalent(talentId);
  const groups = new Set<string>();
  for (const runeId of account.equippedRuneIds) {
    const rune = findRune(runeId);
    if (groups.has(rune.stackingGroup)) throw new Error("Duplicate rune stacking group");
    groups.add(rune.stackingGroup);
  }
}
