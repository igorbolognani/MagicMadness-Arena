import { describe, expect, it } from "vitest";
import { BALANCE_VERSION, ECONOMY_BASELINE, getSkillTuning, RUNE_POWER_BUDGET, skillBalance, validateBalance } from "./index";

describe("versioned balance", () => {
  it("contains tuning for every starter skill", () => {
    validateBalance();
    expect(BALANCE_VERSION).toContain("baseline");
    expect(Object.keys(skillBalance)).toHaveLength(16);
    expect(getSkillTuning("fire-ember-bolt").damage).toBeGreaterThan(0);
    expect(ECONOMY_BASELINE.duplicateCombatPower).toBe(0);
    expect(RUNE_POWER_BUDGET.maxEquippedPerFamily).toBe(1);
  });
});
