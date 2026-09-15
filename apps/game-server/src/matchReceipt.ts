import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { MATCH_RESULT_RECEIPT_VERSION, canonicalReceiptPayload, type MatchResultReceipt, type UnsignedMatchResultReceipt } from "@mma/protocol";

export type ReceiptIssueInput = Omit<MatchResultReceipt, "version" | "authority" | "receiptId" | "nonce" | "issuedAt" | "expiresAt" | "signature"> & { ttlSeconds?: number };

export function signMatchResultReceipt(input: ReceiptIssueInput, secret: string, now = new Date()): MatchResultReceipt {
  if (secret.length < 32) throw new Error("MATCH_RECEIPT_SECRET must contain at least 32 characters");
  if (input.mode === "practice" && (input.rewards.xp > 0 || Object.values(input.rewards.currencies).some((value) => value > 0))) {
    throw new Error("Practice receipts cannot authorize progression rewards");
  }
  const unsigned: UnsignedMatchResultReceipt = {
    version: MATCH_RESULT_RECEIPT_VERSION,
    receiptId: randomUUID(),
    matchId: input.matchId,
    accountId: input.accountId,
    authority: "authoritative-game-server" as const,
    mode: input.mode,
    placement: input.placement,
    matchScore: input.matchScore,
    performanceScore: input.performanceScore,
    rewards: input.rewards,
    balanceVersion: input.balanceVersion,
    gameCoreVersion: input.gameCoreVersion,
    issuedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + (input.ttlSeconds ?? 300) * 1000).toISOString(),
    nonce: randomBytes(24).toString("base64url"),
  };
  return { ...unsigned, signature: createHmac("sha256", secret).update(canonicalReceiptPayload(unsigned)).digest("base64url") };
}
