import { z } from "zod";

export const PROTOCOL_VERSION = "protocol-0.1.0";
export const MATCH_RESULT_RECEIPT_VERSION = "match-result-receipt.v1";
export const MATCH_SESSION_TICKET_VERSION = "match-session-ticket.v2";

const VectorSchema = z.object({ x: z.number().finite(), y: z.number().finite() }).strict();

export const ClientInputMessageSchema = z.object({
  type: z.literal("input"),
  protocolVersion: z.string().min(1),
  sequence: z.number().int().nonnegative(),
  tick: z.number().int().nonnegative(),
  move: VectorSchema,
  aim: VectorSchema,
  releaseSkill: z.number().int().min(0).max(3).optional(),
  dash: z.boolean().optional(),
  healthPotion: z.boolean().optional(),
  manaPotion: z.boolean().optional(),
}).strict();

export type ClientInputMessage = z.infer<typeof ClientInputMessageSchema>;

export function parseClientInputMessage(input: unknown): ClientInputMessage {
  return ClientInputMessageSchema.parse(input);
}

export const MatchSessionTicketSchema = z.object({
  version: z.literal(MATCH_SESSION_TICKET_VERSION),
  sessionId: z.string().min(12).max(160),
  accountId: z.string().min(1).max(160),
  heroId: z.enum(["fire-ember", "water-tide", "earth-bastion", "air-gale"]),
  issuedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  nonce: z.string().min(16).max(180),
  build: z.object({ accountLevel: z.number().int().min(1).max(30), talents: z.array(z.string()).max(3), runes: z.array(z.string()).max(3) }).strict().optional(),
  signature: z.string().min(32).max(180),
}).strict();

export type MatchSessionTicket = z.infer<typeof MatchSessionTicketSchema>;
export type UnsignedMatchSessionTicket = Omit<MatchSessionTicket, "signature">;

export function canonicalMatchSessionTicket(ticket: UnsignedMatchSessionTicket): string {
  return JSON.stringify({ version: ticket.version, sessionId: ticket.sessionId, accountId: ticket.accountId, heroId: ticket.heroId, issuedAt: ticket.issuedAt, expiresAt: ticket.expiresAt, nonce: ticket.nonce, ...(ticket.build ? { build: { accountLevel: ticket.build.accountLevel, talents: [...ticket.build.talents].sort(), runes: [...ticket.build.runes].sort() } } : {}) });
}

export const ClientAuthenticateMessageSchema = z.object({
  type: z.literal("authenticate"),
  protocolVersion: z.string().min(1),
  ticket: MatchSessionTicketSchema,
  resumeToken: z.string().min(24).max(180).optional(),
}).strict();

export type ClientAuthenticateMessage = z.infer<typeof ClientAuthenticateMessageSchema>;

export function parseClientAuthenticateMessage(input: unknown): ClientAuthenticateMessage {
  return ClientAuthenticateMessageSchema.parse(input);
}

export type ServerMessage =
  | { type: "session"; protocolVersion: string; payload: { matchId: string; playerId: string; resumeToken: string; reconnectWindowSeconds: number } }
  | { type: "snapshot"; protocolVersion: string; tick: number; payload: unknown }
  | { type: "event"; protocolVersion: string; tick: number; payload: unknown }
  | { type: "result"; protocolVersion: string; payload: unknown }
  | { type: "error"; protocolVersion: string; code: string; message: string };

export const MatchResultReceiptSchema = z.object({
  version: z.literal(MATCH_RESULT_RECEIPT_VERSION),
  receiptId: z.string().min(12).max(160),
  matchId: z.string().min(1).max(160),
  accountId: z.string().min(1).max(160),
  authority: z.literal("authoritative-game-server"),
  mode: z.enum(["normal", "ranked", "history", "practice"]),
  placement: z.number().int().positive().max(128),
  matchScore: z.number().int().nonnegative().max(1_000_000),
  performanceScore: z.number().int().nonnegative().max(1_000_000),
  rewards: z.object({
    xp: z.number().int().nonnegative().max(100_000),
    currencies: z.record(z.string().min(1).max(48), z.number().int().nonnegative().max(1_000_000)),
  }).strict(),
  balanceVersion: z.string().min(1).max(80),
  gameCoreVersion: z.string().min(1).max(80),
  issuedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  nonce: z.string().min(16).max(180),
  signature: z.string().min(32).max(180),
}).strict();

export type MatchResultReceipt = z.infer<typeof MatchResultReceiptSchema>;
export type UnsignedMatchResultReceipt = Omit<MatchResultReceipt, "signature">;

export function canonicalReceiptPayload(receipt: UnsignedMatchResultReceipt): string {
  return JSON.stringify({
    version: receipt.version,
    receiptId: receipt.receiptId,
    matchId: receipt.matchId,
    accountId: receipt.accountId,
    authority: receipt.authority,
    mode: receipt.mode,
    placement: receipt.placement,
    matchScore: receipt.matchScore,
    performanceScore: receipt.performanceScore,
    rewards: { xp: receipt.rewards.xp, currencies: Object.fromEntries(Object.entries(receipt.rewards.currencies).sort(([a], [b]) => a.localeCompare(b))) },
    balanceVersion: receipt.balanceVersion,
    gameCoreVersion: receipt.gameCoreVersion,
    issuedAt: receipt.issuedAt,
    expiresAt: receipt.expiresAt,
    nonce: receipt.nonce,
  });
}

export function parseMatchResultReceipt(input: unknown): MatchResultReceipt {
  return MatchResultReceiptSchema.parse(input);
}

export function assertProtocolVersion(version: string): void {
  if (version !== PROTOCOL_VERSION) {
    throw new Error("Protocol mismatch: expected " + PROTOCOL_VERSION + ", received " + version);
  }
}
