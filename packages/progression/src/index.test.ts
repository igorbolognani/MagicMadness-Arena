import { describe, expect, it } from "vitest";
import { accountBand, createAccountProgression, equipRune, unlockTalent } from "./index";

describe("bounded account progression", () => {
  it("keeps account bands and talent unlocks explicit", () => {
    const account = { ...createAccountProgression("test"), level: 10 };
    expect(accountBand(account.level)).toBe("10-20");
    expect(unlockTalent(account, "utility-10-flow").unlockedTalentIds).toContain("utility-10-flow");
  });

  it("enforces one rune per stacking group", () => {
    const account = createAccountProgression("test");
    const equipped = equipRune(account, "rune-swift-edge");
    expect(equipped.equippedRuneIds).toEqual(["rune-swift-edge"]);
    expect(() => equipRune(equipped, "rune-wide-current")).not.toThrow();
  });
});
