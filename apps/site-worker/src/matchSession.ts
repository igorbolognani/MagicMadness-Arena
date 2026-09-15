import { MATCH_SESSION_TICKET_VERSION, canonicalMatchSessionTicket, type MatchSessionTicket, type UnsignedMatchSessionTicket } from "@mma/protocol";

function encodeBase64Url(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer))).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export async function issueMatchSessionTicket(accountId: string, heroId: MatchSessionTicket["heroId"], secret: string, now = new Date(), build?: MatchSessionTicket["build"]): Promise<MatchSessionTicket> {
  if (secret.length < 32) throw new Error("MATCH_SERVER_AUTH_SECRET must contain at least 32 characters");
  const unsigned: UnsignedMatchSessionTicket = {
    version: MATCH_SESSION_TICKET_VERSION,
    sessionId: crypto.randomUUID(),
    accountId,
    ...(build ? { build } : {}),
    heroId,
    issuedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 120_000).toISOString(),
    nonce: encodeBase64Url(crypto.getRandomValues(new Uint8Array(24)).buffer),
  };
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(canonicalMatchSessionTicket(unsigned)));
  return { ...unsigned, signature: encodeBase64Url(signature) };
}
