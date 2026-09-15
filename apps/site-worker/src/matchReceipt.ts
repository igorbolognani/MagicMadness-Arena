import { canonicalReceiptPayload, parseMatchResultReceipt, type MatchResultReceipt } from "@mma/protocol";

export const SUPPORTED_RECEIPT_VERSIONS = { balance: "balance-baseline-0.2.0", gameCore: "game-core-0.2.0" } as const;

export type D1Result = { success: boolean };
export type D1Statement = { bind: (...values: unknown[]) => D1Statement; first: <T = Record<string, unknown>>() => Promise<T | null>; run: () => Promise<D1Result> };
export type D1Database = { prepare: (query: string) => D1Statement; batch: (statements: D1Statement[]) => Promise<D1Result[]> };

export class ReceiptValidationError extends Error {
  constructor(public readonly code: string, message: string) { super(message); }
}

function decodeBase64Url(value: string): ArrayBuffer {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat((4 - value.length % 4) % 4);
  const binary = atob(base64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0)).buffer as ArrayBuffer;
}

export async function signReceiptForTest(receipt: Omit<MatchResultReceipt, "signature">, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(canonicalReceiptPayload(receipt)));
  return btoa(String.fromCharCode(...new Uint8Array(signature))).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export async function verifyMatchResultReceipt(input: unknown, accountId: string, secret: string, now = new Date()): Promise<MatchResultReceipt> {
  let receipt: MatchResultReceipt;
  try { receipt = parseMatchResultReceipt(input); }
  catch { throw new ReceiptValidationError("invalid_receipt", "Receipt contract validation failed"); }
  if (receipt.accountId !== accountId) throw new ReceiptValidationError("account_mismatch", "Receipt belongs to a different account");
  if (receipt.balanceVersion !== SUPPORTED_RECEIPT_VERSIONS.balance || receipt.gameCoreVersion !== SUPPORTED_RECEIPT_VERSIONS.gameCore) throw new ReceiptValidationError("version_incompatible", "Receipt references an unsupported runtime version");
  if (Date.parse(receipt.expiresAt) <= now.getTime() || Date.parse(receipt.issuedAt) > now.getTime() + 30_000) throw new ReceiptValidationError("receipt_expired", "Receipt is expired or issued in the future");
  if (receipt.mode === "practice" && (receipt.rewards.xp > 0 || Object.values(receipt.rewards.currencies).some((value) => value > 0))) throw new ReceiptValidationError("practice_rewards_forbidden", "Practice cannot grant progression");
  if (secret.length < 32) throw new ReceiptValidationError("receipt_verifier_unavailable", "Receipt verifier is not configured");
  let signature: ArrayBuffer;
  try { signature = decodeBase64Url(receipt.signature); }
  catch { throw new ReceiptValidationError("invalid_signature", "Receipt signature encoding is invalid"); }
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const { signature: _signature, ...unsigned } = receipt;
  const valid = await crypto.subtle.verify("HMAC", key, signature, new TextEncoder().encode(canonicalReceiptPayload(unsigned)));
  if (!valid) throw new ReceiptValidationError("invalid_signature", "Receipt signature is invalid");
  return receipt;
}

export async function consumeVerifiedReceipt(db: D1Database, receipt: MatchResultReceipt, consumedAt = new Date().toISOString()): Promise<{ replayed: boolean; experience: number; level: number; receiptId: string }> {
  const existing = await db.prepare("SELECT receipt_id, resulting_experience, resulting_level FROM consumed_match_receipts WHERE receipt_id = ?").bind(receipt.receiptId).first<Record<string, unknown>>();
  if (existing) return { replayed: true, experience: Number(existing.resulting_experience), level: Number(existing.resulting_level), receiptId: String(existing.receipt_id) };
  const account = await db.prepare("SELECT experience, level FROM accounts WHERE account_id = ?").bind(receipt.accountId).first<Record<string, unknown>>();
  if (!account) throw new ReceiptValidationError("account_not_found", "Account must exist before consuming a receipt");
  const resultJson = JSON.stringify({ placement: receipt.placement, matchScore: receipt.matchScore, performanceScore: receipt.performanceScore, rewards: receipt.rewards });
  try {
    const results = await db.batch([
      db.prepare(`INSERT INTO consumed_match_receipts
        (receipt_id, nonce, match_id, account_id, mode, signature, issued_at, expires_at, consumed_at, resulting_experience, resulting_level)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?,
          (SELECT experience + ? FROM accounts WHERE account_id = ?),
          MIN(30, MAX((SELECT level FROM accounts WHERE account_id = ?), 1 + CAST((SELECT experience + ? FROM accounts WHERE account_id = ?) / 1000 AS INTEGER))))`)
        .bind(receipt.receiptId, receipt.nonce, receipt.matchId, receipt.accountId, receipt.mode, receipt.signature, receipt.issuedAt, receipt.expiresAt, consumedAt, receipt.rewards.xp, receipt.accountId, receipt.accountId, receipt.rewards.xp, receipt.accountId),
      db.prepare("INSERT INTO match_history (history_id, match_id, account_id, mode, placement, match_score, performance_score, balance_version, game_core_version, result_json, played_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(`history:${receipt.receiptId}`, receipt.matchId, receipt.accountId, receipt.mode, receipt.placement, receipt.matchScore, receipt.performanceScore, receipt.balanceVersion, receipt.gameCoreVersion, resultJson, receipt.issuedAt),
      db.prepare("INSERT INTO progression_events (event_id, account_id, source_type, source_id, experience_delta, payload_json, created_at) VALUES (?, ?, 'match_receipt', ?, ?, ?, ?)").bind(`progression:${receipt.receiptId}`, receipt.accountId, receipt.receiptId, receipt.rewards.xp, resultJson, consumedAt),
      db.prepare("UPDATE accounts SET experience = (SELECT resulting_experience FROM consumed_match_receipts WHERE receipt_id = ?), level = (SELECT resulting_level FROM consumed_match_receipts WHERE receipt_id = ?), updated_at = ? WHERE account_id = ?").bind(receipt.receiptId, receipt.receiptId, consumedAt, receipt.accountId),
    ]);
    if (results.some((result) => !result.success)) throw new Error("D1 batch reported an unsuccessful statement");
  } catch (error) {
    const replay = await db.prepare("SELECT receipt_id, resulting_experience, resulting_level FROM consumed_match_receipts WHERE receipt_id = ?").bind(receipt.receiptId).first<Record<string, unknown>>();
    if (replay) return { replayed: true, experience: Number(replay.resulting_experience), level: Number(replay.resulting_level), receiptId: String(replay.receipt_id) };
    throw error;
  }
  const stored = await db.prepare("SELECT receipt_id, resulting_experience, resulting_level FROM consumed_match_receipts WHERE receipt_id = ?").bind(receipt.receiptId).first<Record<string, unknown>>();
  if (!stored) throw new Error("Receipt transaction completed without a stored receipt");
  return { replayed: false, experience: Number(stored.resulting_experience), level: Number(stored.resulting_level), receiptId: String(stored.receipt_id) };
}
