import { describe, expect, it } from "vitest";
import { applyLedgerEntry, createPityState, duplicateConversion } from "./index";

describe("immutable economy contract", () => {
  it("applies a ledger entry without allowing negative balances", () => {
    const wallet = { accountId: "a", balances: { spark: 10 } };
    const next = applyLedgerEntry(wallet, { id: "1", accountId: "a", currencyId: "spark", delta: 5, reason: "boss", sourceId: "b1", createdAt: "2026-08-29T00:00:00Z" });
    expect(next.balances.spark).toBe(15);
    expect(() => applyLedgerEntry(wallet, { id: "2", accountId: "a", currencyId: "spark", delta: -11, reason: "pull", sourceId: "banner", createdAt: "2026-08-29T00:00:00Z" })).toThrow();
  });

  it("converts duplicates with zero direct combat power and exposes pity state", () => {
    expect(duplicateConversion("fire-ember").directCombatPower).toBe(0);
    expect(createPityState("starter-banner", "fire")).toMatchObject({ pulls: 0, target: "fire" });
  });
});
