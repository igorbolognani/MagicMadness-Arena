import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { MATCH_SESSION_TICKET_VERSION, PROTOCOL_VERSION, canonicalMatchSessionTicket, type MatchSessionTicket } from "@mma/protocol";
import { VerifiedBotMatchSession, SessionTicketError, inputMessage, verifyMatchSessionTicket } from "./verifiedBotMatch";

const authSecret = "a".repeat(48);
const receiptSecret = "r".repeat(48);

function ticket(now = new Date("2026-09-02T12:00:00.000Z")): MatchSessionTicket {
  const unsigned = { version: MATCH_SESSION_TICKET_VERSION, sessionId: "verified-session-0001", accountId: "account-1", heroId: "fire-ember" as const, issuedAt: now.toISOString(), expiresAt: new Date(now.getTime() + 120_000).toISOString(), nonce: "nonce-session-1234567890" } as const;
  return { ...unsigned, signature: createHmac("sha256", authSecret).update(canonicalMatchSessionTicket(unsigned)).digest("base64url") };
}

describe("Verified Vs Bots authoritative session", () => {
  it("verifies session signature and rejects tampering or expiration", () => {
    const now = new Date("2026-09-02T12:00:30.000Z");
    expect(verifyMatchSessionTicket(ticket(), authSecret, now).accountId).toBe("account-1");
    expect(() => verifyMatchSessionTicket({ ...ticket(), heroId: "air-gale" }, authSecret, now)).toThrow(SessionTicketError);
    expect(() => verifyMatchSessionTicket(ticket(), authSecret, new Date("2026-09-02T12:03:00.000Z"))).toThrow("ticket_expired");
  });

  it("accepts only versioned inputs and simulates one player plus four server bots", () => {
    const session = new VerifiedBotMatchSession(ticket(), receiptSecret);
    expect(Object.values(session.state.players).filter((player) => player.isBot)).toHaveLength(4);
    expect(session.receiveInput(inputMessage(1, 0, { move: { x: 1, y: 0 }, aim: { x: 0, y: 1 }, releaseSkill: 0 }))).toBe(true);
    expect(session.receiveInput(inputMessage(1, 0, { move: { x: 0, y: 0 }, aim: { x: 1, y: 0 } }))).toBe(false);
    expect(() => session.receiveInput({ type: "input", protocolVersion: PROTOCOL_VERSION, sequence: 2, tick: 1, move: { x: 0, y: 0 }, aim: { x: 1, y: 0 }, damage: 999 })).toThrow();
    session.step();
    expect(session.state.tick).toBe(1);
    expect(session.state.events.some((event) => event.type === "INPUT_ACCEPTED" && event.actorId === "player")).toBe(true);
  });

  it("supports bounded reconnection and issues one stable signed result receipt", () => {
    const session = new VerifiedBotMatchSession(ticket(), receiptSecret);
    session.markDisconnected(1_000);
    expect(session.canReconnect(session.resumeToken, 10_000)).toBe(true);
    expect(session.canReconnect("wrong-token", 10_000)).toBe(false);
    expect(session.isReconnectExpired(22_000)).toBe(true);
    session.state.time = 120;
    session.step();
    const first = session.issueResult(new Date("2026-09-02T12:01:00.000Z"));
    const replay = session.issueResult(new Date("2026-09-02T12:01:30.000Z"));
    expect(first?.receipt.accountId).toBe("account-1");
    expect(first?.receipt.mode).toBe("normal");
    expect(replay?.receipt.receiptId).toBe(first?.receipt.receiptId);
    expect(first?.botTelemetry["bot-1"]).toBeDefined();
  });
});

it("binds the level and build to the signed session and applies it equally to bots", () => {
  const now = new Date("2026-09-02T12:00:30.000Z");
  const unsigned = { ...ticket(), build: { accountLevel: 10, talents: ["utility-10-flow"], runes: ["rune-swift-edge"] } };
  const signed = { ...unsigned, signature: createHmac("sha256", authSecret).update(canonicalMatchSessionTicket(unsigned)).digest("base64url") };
  expect(verifyMatchSessionTicket(signed, authSecret, now).build?.accountLevel).toBe(10);
  expect(() => verifyMatchSessionTicket({ ...signed, build: { ...signed.build, accountLevel: 30 } }, authSecret, now)).toThrow("ticket_signature_invalid");
  const session = new VerifiedBotMatchSession(signed, receiptSecret);
  expect(Object.values(session.state.players).every(player => player.build?.talents[0] === "utility-10-flow")).toBe(true);
});
