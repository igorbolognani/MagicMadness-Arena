import { describe, expect, it } from "vitest";
import { MATCH_RESULT_RECEIPT_VERSION, MATCH_SESSION_TICKET_VERSION, canonicalMatchSessionTicket, canonicalReceiptPayload, parseClientAuthenticateMessage, parseClientInputMessage, parseMatchResultReceipt } from "./index";

describe("authoritative input contract", () => {
  it("accepts bounded command envelopes", () => {
    expect(parseClientInputMessage({
      type: "input",
      protocolVersion: "protocol-0.1.0",
      sequence: 4,
      tick: 12,
      move: { x: 1, y: 0 },
      aim: { x: 0, y: -1 },
      releaseSkill: 2,
    }).releaseSkill).toBe(2);
  });

  it("rejects unknown fields and invalid skill indexes", () => {
    expect(() => parseClientInputMessage({
      type: "input",
      protocolVersion: "protocol-0.1.0",
      sequence: 4,
      tick: 12,
      move: { x: 1, y: 0 },
      aim: { x: 0, y: -1 },
      releaseSkill: 7,
    })).toThrow();
    expect(() => parseClientInputMessage({
      type: "input",
      protocolVersion: "protocol-0.1.0",
      sequence: 4,
      tick: 12,
      move: { x: 1, y: 0 },
      aim: { x: 0, y: -1 },
      clientPosition: { x: 99, y: 99 },
    })).toThrow();
  });
});

describe("match result receipt contract", () => {
  const receipt = { version: MATCH_RESULT_RECEIPT_VERSION, receiptId: "receipt-00000001", matchId: "match-1", accountId: "account-1", authority: "authoritative-game-server", mode: "ranked", placement: 1, matchScore: 120, performanceScore: 84, rewards: { xp: 50, currencies: { spark: 2 } }, balanceVersion: "balance-baseline-0.2.0", gameCoreVersion: "game-core-0.2.0", issuedAt: "2026-09-02T12:00:00.000Z", expiresAt: "2026-09-02T12:05:00.000Z", nonce: "nonce-00000000000001", signature: "signature-00000000000000000000000000000000" } as const;

  it("parses and canonicalizes a versioned authoritative receipt", () => {
    expect(parseMatchResultReceipt(receipt).accountId).toBe("account-1");
    expect(canonicalReceiptPayload(receipt)).not.toContain("signature");
  });
});

describe("verified match session contract", () => {
  it("validates an authentication envelope without including its signature in the canonical payload", () => {
    const ticket = { version: MATCH_SESSION_TICKET_VERSION, sessionId: "session-verified-123", accountId: "account-1", heroId: "fire-ember" as const, issuedAt: "2026-09-02T12:00:00.000Z", expiresAt: "2026-09-02T12:02:00.000Z", nonce: "nonce-session-123456", signature: "signature-value-long-enough-1234567890" } as const;
    expect(parseClientAuthenticateMessage({ type: "authenticate", protocolVersion: "protocol-0.1.0", ticket }).ticket.heroId).toBe("fire-ember");
    const { signature: _signature, ...unsigned } = ticket;
    expect(canonicalMatchSessionTicket(unsigned)).not.toContain("signature");
  });
});
