import { describe, it, expect } from "vitest";
import { getSkillTuning } from "./index";
import { validBuild, tuneAccountSkill, displacementResistance } from "./build";

describe("account build caps and unlocks", () => {
  it("rejects premature, duplicate and competing milestone choices", () => {
    expect(validBuild({ accountLevel: 1, talents: ["attack-10-pressure"], runes: [] })).toBe(false);
    expect(validBuild({ accountLevel: 10, talents: ["attack-10-pressure", "utility-10-flow"], runes: [] })).toBe(false);
    expect(validBuild({ accountLevel: 4, talents: [], runes: ["rune-heavy-push"] })).toBe(false);
    expect(validBuild({ accountLevel: 5, talents: [], runes: ["rune-heavy-push", "rune-swift-edge"] })).toBe(false);
    expect(validBuild({ accountLevel: 25, talents: [], runes: ["rune-heavy-push", "rune-heavy-push"] })).toBe(false);
  });
  it("applies a compatible rune with its cost without mutating shared balance", () => {
    const base = getSkillTuning("fire-ember-bolt");
    const tuned = tuneAccountSkill(base, { accountLevel: 5, talents: [], runes: ["rune-swift-edge"] });
    expect(tuned.projectileSpeed).toBeCloseTo(base.projectileSpeed * 1.1);
    expect(tuned.radius).toBeCloseTo(base.radius * .92);
    expect(base.projectileSpeed).toBe(670);
    const field = getSkillTuning("fire-scorch-trail");
    expect(tuneAccountSkill(field, { accountLevel: 5, talents: [], runes: ["rune-swift-edge"] })).toEqual(field);
  });
  it("caps a complete talent branch", () => {
    const attack = { accountLevel: 30, talents: ["attack-10-pressure", "attack-20-pressure", "attack-30-pressure"], runes: [] };
    expect(validBuild(attack)).toBe(true);
    expect(tuneAccountSkill(getSkillTuning("fire-ember-bolt"), attack).damage).toBeCloseTo(18 * 1.05);
    expect(displacementResistance({ ...attack, talents: ["defense-10-stability", "defense-20-stability", "defense-30-stability"] })).toBeCloseTo(.92);
  });
});
