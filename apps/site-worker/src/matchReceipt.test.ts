import { describe, expect, it } from "vitest";
import { MATCH_RESULT_RECEIPT_VERSION, type MatchResultReceipt } from "@mma/protocol";
import { ReceiptValidationError, consumeVerifiedReceipt, signReceiptForTest, verifyMatchResultReceipt, type D1Database, type D1Result, type D1Statement } from "./matchReceipt.js";

const secret = "test-receipt-secret-with-at-least-thirty-two-characters";

async function receipt(overrides: Partial<Omit<MatchResultReceipt, "signature">> = {}): Promise<MatchResultReceipt> {
  const unsigned = { version: MATCH_RESULT_RECEIPT_VERSION, receiptId: "receipt-00000001", matchId: "match-1", accountId: "account-1", authority: "authoritative-game-server", mode: "ranked", placement: 1, matchScore: 120, performanceScore: 84, rewards: { xp: 50, currencies: {} }, balanceVersion: "balance-baseline-0.2.0", gameCoreVersion: "game-core-0.2.0", issuedAt: "2026-09-02T12:00:00.000Z", expiresAt: "2026-09-02T12:05:00.000Z", nonce: "nonce-00000000000001", ...overrides } as Omit<MatchResultReceipt, "signature">;
  return { ...unsigned, signature: await signReceiptForTest(unsigned, secret) };
}

class Statement implements D1Statement {
  values: unknown[] = [];
  constructor(readonly db: FakeD1, readonly query: string) {}
  bind(...values: unknown[]) { this.values = values; return this; }
  async first<T>() { return this.db.first(this) as T | null; }
  async run() { return { success: true }; }
}

class FakeD1 implements D1Database {
  account = { experience: 0, level: 1 };
  receipts = new Map<string, { receipt_id: string; resulting_experience: number; resulting_level: number }>();
  failBatch = false;
  prepare(query: string) { return new Statement(this, query); }
  first(statement: Statement): Record<string, unknown> | null {
    if (statement.query.includes("FROM consumed_match_receipts")) return this.receipts.get(String(statement.values[0])) ?? null;
    if (statement.query.includes("FROM accounts")) return String(statement.values[0]) === "account-1" ? this.account : null;
    return null;
  }
  async batch(statements: D1Statement[]): Promise<D1Result[]> {
    if (this.failBatch) throw new Error("simulated transaction failure");
    const insert = statements[0] as Statement;
    const update = statements[3] as Statement;
    const id = String(insert.values[0]);
    if (this.receipts.has(id)) throw new Error("unique constraint");
    const nextExperience = this.account.experience + Number(insert.values[9]);
    const nextReceipt = { receipt_id: id, resulting_experience: nextExperience, resulting_level: Math.min(30, Math.max(this.account.level, 1 + Math.floor(nextExperience / 1000))) };
    const nextAccount = { experience: nextReceipt.resulting_experience, level: nextReceipt.resulting_level };
    this.receipts.set(id, nextReceipt);
    this.account = nextAccount;
    return statements.map(() => ({ success: true }));
  }
}

describe("authoritative match receipts", () => {
  it("accepts a valid signature and rejects a modified signature", async () => {
    const valid = await receipt();
    await expect(verifyMatchResultReceipt(valid, "account-1", secret, new Date("2026-09-02T12:01:00Z"))).resolves.toMatchObject({ receiptId: valid.receiptId });
    await expect(verifyMatchResultReceipt({ ...valid, matchScore: 999 }, "account-1", secret, new Date("2026-09-02T12:01:00Z"))).rejects.toMatchObject({ code: "invalid_signature" });
  });

  it("rejects another account, expiry, incompatible versions and rewarded practice", async () => {
    const valid = await receipt();
    await expect(verifyMatchResultReceipt(valid, "account-2", secret, new Date("2026-09-02T12:01:00Z"))).rejects.toMatchObject({ code: "account_mismatch" });
    await expect(verifyMatchResultReceipt(valid, "account-1", secret, new Date("2026-09-02T12:06:00Z"))).rejects.toMatchObject({ code: "receipt_expired" });
    const old = await receipt({ balanceVersion: "old-balance" });
    await expect(verifyMatchResultReceipt(old, "account-1", secret, new Date("2026-09-02T12:01:00Z"))).rejects.toMatchObject({ code: "version_incompatible" });
    const practice = await receipt({ mode: "practice", rewards: { xp: 1, currencies: {} } });
    await expect(verifyMatchResultReceipt(practice, "account-1", secret, new Date("2026-09-02T12:01:00Z"))).rejects.toMatchObject({ code: "practice_rewards_forbidden" });
  });

  it("consumes once and returns an idempotent replay without duplicate XP", async () => {
    const db = new FakeD1();
    const valid = await receipt();
    await expect(consumeVerifiedReceipt(db, valid)).resolves.toMatchObject({ replayed: false, experience: 50 });
    await expect(consumeVerifiedReceipt(db, valid)).resolves.toMatchObject({ replayed: true, experience: 50 });
    expect(db.account.experience).toBe(50);
  });

  it("leaves account and receipt state unchanged when the atomic batch fails", async () => {
    const db = new FakeD1();
    db.failBatch = true;
    const valid = await receipt();
    await expect(consumeVerifiedReceipt(db, valid)).rejects.toThrow("simulated transaction failure");
    expect(db.account.experience).toBe(0);
    expect(db.receipts.size).toBe(0);
  });

  it("updates account level at the configured XP threshold", async () => {
    const db = new FakeD1();
    db.account = { experience: 980, level: 1 };
    const valid = await receipt({ rewards: { xp: 50, currencies: {} } });
    await expect(consumeVerifiedReceipt(db, valid)).resolves.toMatchObject({ experience: 1030, level: 2 });
    expect(db.account).toEqual({ experience: 1030, level: 2 });
  });
});
