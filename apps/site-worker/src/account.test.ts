import { describe, expect, it } from "vitest";
import { accountFromRow, isStarterHeroId } from "./account.js";

describe("hosted account contract", () => {
  it("accepts only the four released starter heroes", () => {
    expect(isStarterHeroId("air-gale")).toBe(true);
    expect(isStarterHeroId("dark-unreleased")).toBe(false);
  });

  it("normalizes a D1 account row", () => {
    expect(accountFromRow({ account_id: "u1", display_name: "Mage", email: null, level: 1, experience: 0, selected_hero_id: "water-tide", created_at: "a", updated_at: "b" })).toMatchObject({ accountId: "u1", selectedHeroId: "water-tide", level: 1 });
  });
});
