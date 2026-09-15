import { validBuild } from "@mma/balance";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { FIXED_STEP_SECONDS, GAME_CORE_VERSION, createMatch, stepMatch, type GameState, type InputCommand } from "@mma/game-core";
import { PROTOCOL_VERSION, canonicalMatchSessionTicket, parseClientInputMessage, MatchSessionTicketSchema, type ClientInputMessage, type MatchResultReceipt, type MatchSessionTicket, type ServerMessage } from "@mma/protocol";
import { signMatchResultReceipt } from "./matchReceipt.js";

export class SessionTicketError extends Error {
  constructor(public readonly code: "invalid_ticket" | "ticket_expired" | "ticket_signature_invalid" | "ticket_verifier_unavailable") { super(code); }
}

export function verifyMatchSessionTicket(input: unknown, secret: string, now = new Date()): MatchSessionTicket {
  if (secret.length < 32) throw new SessionTicketError("ticket_verifier_unavailable");
  const parsed = MatchSessionTicketSchema.safeParse(input);
  if (!parsed.success) throw new SessionTicketError("invalid_ticket");
  const ticket = parsed.data;
  if (ticket.build && !validBuild(ticket.build)) throw new SessionTicketError("invalid_ticket");
  if (Date.parse(ticket.expiresAt) <= now.getTime() || Date.parse(ticket.issuedAt) > now.getTime() + 30_000) throw new SessionTicketError("ticket_expired");
  const { signature, ...unsigned } = ticket;
  const expected = createHmac("sha256", secret).update(canonicalMatchSessionTicket(unsigned)).digest();
  let actual: Buffer;
  try { actual = Buffer.from(signature, "base64url"); } catch { throw new SessionTicketError("ticket_signature_invalid"); }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new SessionTicketError("ticket_signature_invalid");
  return ticket;
}

function seedFromSession(sessionId: string): number {
  let seed = 23;
  for (const character of sessionId) seed = (seed * 33 + character.charCodeAt(0)) >>> 0;
  return Math.max(1, seed);
}

export type VerifiedResultEnvelope = { result: NonNullable<GameState["result"]>; receipt: MatchResultReceipt; botTelemetry: GameState["botTelemetry"] };

export class VerifiedBotMatchSession {
  readonly playerId = "player";
  readonly state: GameState;
  readonly resumeToken = randomBytes(32).toString("base64url");
  readonly reconnectWindowSeconds = 20;
  private lastSequence = -1;
  private currentInput: InputCommand = { playerId: "player", move: { x: 0, y: 0 }, aim: { x: 1, y: 0 } };
  private resultEnvelope: VerifiedResultEnvelope | null = null;
  private disconnectedAt: number | null = null;

  constructor(readonly ticket: MatchSessionTicket, private readonly receiptSecret: string) {
    this.state = createMatch({ seed: seedFromSession(ticket.sessionId), playerHeroId: ticket.heroId, botCount: 4, mode: "standard" });
    if (ticket.build) for (const player of Object.values(this.state.players)) player.build = structuredClone(ticket.build);
  }

  receiveInput(input: unknown): boolean {
    const message = parseClientInputMessage(input);
    if (message.protocolVersion !== PROTOCOL_VERSION || message.sequence <= this.lastSequence) return false;
    this.lastSequence = message.sequence;
    this.currentInput = {
      playerId: this.playerId,
      move: message.move,
      aim: message.aim,
      ...(message.releaseSkill !== undefined ? { releaseSkill: message.releaseSkill as 0 | 1 | 2 | 3 } : {}),
      ...(message.dash ? { dash: true } : {}),
      ...(message.healthPotion ? { healthPotion: true } : {}),
      ...(message.manaPotion ? { manaPotion: true } : {}),
    };
    return true;
  }

  step(dt = FIXED_STEP_SECONDS): void {
    stepMatch(this.state, [this.currentInput], dt);
    this.currentInput = { playerId: this.playerId, move: this.currentInput.move, aim: this.currentInput.aim };
  }

  neutralizeInput(): void {
    this.currentInput = { playerId: this.playerId, move: { x: 0, y: 0 }, aim: this.currentInput.aim };
  }

  snapshotMessage(): ServerMessage {
    return { type: "snapshot", protocolVersion: PROTOCOL_VERSION, tick: this.state.tick, payload: structuredClone(this.state) };
  }

  sessionMessage(): ServerMessage {
    return { type: "session", protocolVersion: PROTOCOL_VERSION, payload: { matchId: this.ticket.sessionId, playerId: this.playerId, resumeToken: this.resumeToken, reconnectWindowSeconds: this.reconnectWindowSeconds } };
  }

  issueResult(now = new Date()): VerifiedResultEnvelope | null {
    if (this.resultEnvelope) return this.resultEnvelope;
    if (this.state.phase !== "results" || !this.state.result) return null;
    const ranking = this.state.result.rankings.find((entry) => entry.playerId === this.playerId);
    if (!ranking) return null;
    const receipt = signMatchResultReceipt({
      matchId: this.ticket.sessionId,
      accountId: this.ticket.accountId,
      mode: "normal",
      placement: ranking.placement,
      matchScore: ranking.matchScore,
      performanceScore: ranking.performanceScore,
      rewards: { xp: Math.max(25, Math.min(240, 25 + ranking.matchScore + Math.round(ranking.performanceScore * .22))), currencies: { spark: ranking.placement === 1 ? 3 : 1 } },
      balanceVersion: this.state.balanceVersion,
      gameCoreVersion: GAME_CORE_VERSION,
    }, this.receiptSecret, now);
    this.resultEnvelope = { result: structuredClone(this.state.result), receipt, botTelemetry: structuredClone(this.state.botTelemetry) };
    return this.resultEnvelope;
  }

  resultMessage(now = new Date()): ServerMessage | null {
    const envelope = this.issueResult(now);
    return envelope ? { type: "result", protocolVersion: PROTOCOL_VERSION, payload: envelope } : null;
  }

  markDisconnected(now = Date.now()): void { this.disconnectedAt = now; }
  markConnected(): void { this.disconnectedAt = null; }
  canReconnect(token: string | undefined, now = Date.now()): boolean {
    return Boolean(token && token === this.resumeToken && this.disconnectedAt !== null && now - this.disconnectedAt <= this.reconnectWindowSeconds * 1000);
  }
  isReconnectExpired(now = Date.now()): boolean { return this.disconnectedAt !== null && now - this.disconnectedAt > this.reconnectWindowSeconds * 1000; }
}

export function inputMessage(sequence: number, tick: number, command: Omit<ClientInputMessage, "type" | "protocolVersion" | "sequence" | "tick">): ClientInputMessage {
  return { type: "input", protocolVersion: PROTOCOL_VERSION, sequence, tick, ...command };
}
