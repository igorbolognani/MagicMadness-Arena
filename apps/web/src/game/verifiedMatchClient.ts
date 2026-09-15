import { PROTOCOL_VERSION, parseMatchResultReceipt, type MatchResultReceipt, type MatchSessionTicket } from "@mma/protocol";
import type { HeroId } from "@mma/content";

export type VerifiedConnectionState =
  | "connecting"
  | "searching"
  | "match-found"
  | "loading"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "result-pending"
  | "receipt-issued"
  | "receipt-persisted"
  | "persistence-failed";

export type MatchSessionResponse = { ticket: MatchSessionTicket; webSocketUrl: string };
export type PersistedReceiptResult = {
  replayed: boolean;
  receiptId: string;
  previousExperience: number;
  xpGained: number;
  experience: number;
  level: number;
  rewards: MatchResultReceipt["rewards"];
};

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export class VerifiedMatchUnavailableError extends Error {
  constructor(public readonly status: number, public readonly code: string) { super(code); }
}

export async function requestVerifiedSession(heroId: HeroId, fetcher: FetchLike = fetch): Promise<MatchSessionResponse> {
  const response = await fetcher("/api/matches/session", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ heroId }),
  });
  const payload = await response.json().catch(() => ({})) as Partial<MatchSessionResponse> & { error?: string };
  if (!response.ok || !payload.ticket || typeof payload.webSocketUrl !== "string") {
    throw new VerifiedMatchUnavailableError(response.status, payload.error ?? "verified_session_failed");
  }
  return { ticket: payload.ticket, webSocketUrl: payload.webSocketUrl };
}

export async function persistAuthoritativeReceipt(receiptInput: unknown, fetcher: FetchLike = fetch, maxAttempts = 3): Promise<PersistedReceiptResult> {
  const receipt = parseMatchResultReceipt(receiptInput);
  let lastError: unknown;
  for (let attempt = 1; attempt <= Math.max(1, maxAttempts); attempt += 1) {
    try {
      const response = await fetcher("/api/matches/results", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ receipt }),
      });
      const payload = await response.json().catch(() => ({})) as { result?: PersistedReceiptResult; error?: string };
      if (response.ok && payload.result) return payload.result;
      const error = new VerifiedMatchUnavailableError(response.status, payload.error ?? "receipt_persistence_failed");
      if (response.status < 500 || attempt === maxAttempts) throw error;
      lastError = error;
    } catch (error) {
      lastError = error;
      if (error instanceof VerifiedMatchUnavailableError && error.status < 500) throw error;
      if (attempt === maxAttempts) throw error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("receipt_persistence_failed");
}

export function inputEnvelope(sequence: number, tick: number, move: { x: number; y: number }, aim: { x: number; y: number }, action: Partial<{ releaseSkill: 0 | 1 | 2 | 3; dash: boolean; healthPotion: boolean; manaPotion: boolean }> = {}) {
  return { type: "input" as const, protocolVersion: PROTOCOL_VERSION, sequence, tick, move, aim, ...action };
}
