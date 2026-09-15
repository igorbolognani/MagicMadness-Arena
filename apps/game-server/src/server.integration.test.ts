import { createHmac } from "node:crypto";
import { WebSocket } from "ws";
import { afterEach, describe, expect, it } from "vitest";
import { MATCH_SESSION_TICKET_VERSION, PROTOCOL_VERSION, canonicalMatchSessionTicket, type MatchSessionTicket, type ServerMessage } from "@mma/protocol";
import { createAuthoritativeGameServer, type AuthoritativeGameServer } from "./serverRuntime";

const authSecret = "integration-auth-secret-".padEnd(48, "a");
const receiptSecret = "integration-receipt-secret-".padEnd(48, "r");
let runtime: AuthoritativeGameServer | null = null;

afterEach(async () => { if (runtime) await runtime.close(); runtime = null; });

function ticket(): MatchSessionTicket {
  const now = new Date();
  const unsigned = { version: MATCH_SESSION_TICKET_VERSION, sessionId: "integration-session-0001", accountId: "account-integration", heroId: "water-tide" as const, issuedAt: now.toISOString(), expiresAt: new Date(now.getTime() + 120_000).toISOString(), nonce: "integration-nonce-00000001" } as const;
  return { ...unsigned, signature: createHmac("sha256", authSecret).update(canonicalMatchSessionTicket(unsigned)).digest("base64url") };
}

describe("authoritative WebSocket server integration", () => {
  it("authenticates a signed session and streams server-owned snapshots", async () => {
    runtime = createAuthoritativeGameServer({ authSecret, receiptSecret });
    const port = await runtime.listen(0, "127.0.0.1");
    const health = await fetch(`http://127.0.0.1:${port}/health`).then((response) => response.json()) as { ok: boolean };
    expect(health.ok).toBe(true);
    const socket = new WebSocket(`ws://127.0.0.1:${port}`);
    const messages: ServerMessage[] = [];
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("snapshot timeout")), 2_000);
      socket.on("open", () => socket.send(JSON.stringify({ type: "authenticate", protocolVersion: PROTOCOL_VERSION, ticket: ticket() })));
      socket.on("message", (raw) => {
        messages.push(JSON.parse(raw.toString()) as ServerMessage);
        if (messages.some((message) => message.type === "session") && messages.some((message) => message.type === "snapshot" && message.tick > 0)) {
          clearTimeout(timeout);
          resolve();
        }
      });
      socket.on("error", reject);
    });
    expect(messages.find((message) => message.type === "session")).toMatchObject({ payload: { playerId: "player", reconnectWindowSeconds: 20 } });
    const snapshot = [...messages].reverse().find((message) => message.type === "snapshot") as Extract<ServerMessage, { type: "snapshot" }>;
    expect(Object.keys((snapshot.payload as { players: object }).players)).toHaveLength(5);
    socket.close();
  });
});
