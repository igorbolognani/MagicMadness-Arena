import { describe, expect, it, vi } from "vitest";
import { MATCH_RESULT_RECEIPT_VERSION, type MatchResultReceipt } from "@mma/protocol";
import { persistAuthoritativeReceipt } from "./verifiedMatchClient";

const receipt: MatchResultReceipt = {
  version: MATCH_RESULT_RECEIPT_VERSION,
  receiptId: "receipt-verified-0001",
  matchId: "match-verified-1",
  accountId: "account-1",
  authority: "authoritative-game-server",
  mode: "normal",
  placement: 2,
  matchScore: 100,
  performanceScore: 80,
  rewards: { xp: 42, currencies: { spark: 1 } },
  balanceVersion: "balance-baseline-0.2.0",
  gameCoreVersion: "game-core-0.2.0",
  issuedAt: "2026-09-02T12:00:00.000Z",
  expiresAt: "2026-09-02T12:05:00.000Z",
  nonce: "nonce-verified-0000001",
  signature: "signature-value-at-least-thirty-two-characters",
};

function success(replayed = false) {
  return new Response(JSON.stringify({ result: { replayed, receiptId: receipt.receiptId, previousExperience: 10, xpGained: 42, experience: 52, level: 1, rewards: receipt.rewards } }), { status: 200, headers: { "content-type": "application/json" } });
}

describe("verified receipt persistence client", () => {
  it("persists a valid result and represents an already consumed receipt", async () => {
    await expect(persistAuthoritativeReceipt(receipt, vi.fn(async () => success(true)))).resolves.toMatchObject({ replayed: true, experience: 52 });
  });

  it("retries the exact same receipt after an interrupted response", async () => {
    const bodies: string[] = [];
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      bodies.push(String(init?.body));
      if (bodies.length === 1) throw new TypeError("connection interrupted");
      return success(false);
    });
    await expect(persistAuthoritativeReceipt(receipt, fetcher)).resolves.toMatchObject({ replayed: false, xpGained: 42 });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(bodies[0]).toBe(bodies[1]);
  });

  it("does not retry a fraudulent or expired receipt response", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ error: "invalid_signature" }), { status: 422 }));
    await expect(persistAuthoritativeReceipt(receipt, fetcher)).rejects.toMatchObject({ code: "invalid_signature" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("reports a Worker outage after bounded retries", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ error: "receipt_transaction_failed" }), { status: 503 }));
    await expect(persistAuthoritativeReceipt(receipt, fetcher, 2)).rejects.toMatchObject({ code: "receipt_transaction_failed" });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
