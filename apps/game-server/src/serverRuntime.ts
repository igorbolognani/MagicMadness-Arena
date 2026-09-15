import { createServer, type Server as HttpServer } from "node:http";
import { WebSocket, WebSocketServer } from "ws";
import { FIXED_STEP_SECONDS } from "@mma/game-core";
import { PROTOCOL_VERSION, parseClientAuthenticateMessage } from "@mma/protocol";
import { SessionTicketError, VerifiedBotMatchSession, verifyMatchSessionTicket } from "./verifiedBotMatch.js";

type SessionEntry = { session: VerifiedBotMatchSession; socket: WebSocket | null; resultSent: boolean };
export type AuthoritativeServerOptions = { authSecret: string; receiptSecret: string };

export class AuthoritativeGameServer {
  readonly sessions = new Map<string, SessionEntry>();
  readonly httpServer: HttpServer;
  readonly websocketServer: WebSocketServer;
  private readonly interval: ReturnType<typeof setInterval>;

  constructor(private readonly options: AuthoritativeServerOptions) {
    this.httpServer = createServer((request, response) => {
      if (request.url === "/health") {
        const ok = options.authSecret.length >= 32 && options.receiptSecret.length >= 32;
        response.writeHead(ok ? 200 : 503, { "content-type": "application/json", "cache-control": "no-store" });
        response.end(JSON.stringify({ ok, service: "magicmadness-game-server", activeSessions: this.sessions.size, mode: "verified-vs-bots" }));
        return;
      }
      response.writeHead(404);
      response.end();
    });
    this.websocketServer = new WebSocketServer({ server: this.httpServer, maxPayload: 16 * 1024 });
    this.websocketServer.on("connection", (socket) => this.accept(socket));
    this.interval = setInterval(() => this.tick(), FIXED_STEP_SECONDS * 1000);
  }

  private send(socket: WebSocket, message: unknown): void {
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
  }

  private accept(socket: WebSocket): void {
    let entry: SessionEntry | null = null;
    let authenticated = false;
    const authTimeout = setTimeout(() => socket.close(1008, "Authentication timeout"), 5_000);
    socket.on("message", (raw) => {
      try {
        const decoded: unknown = JSON.parse(raw.toString());
        if (!authenticated) {
          const auth = parseClientAuthenticateMessage(decoded);
          if (auth.protocolVersion !== PROTOCOL_VERSION) throw new Error("Protocol mismatch");
          const ticket = verifyMatchSessionTicket(auth.ticket, this.options.authSecret);
          const existing = this.sessions.get(ticket.sessionId);
          if (existing) {
            if (existing.session.ticket.accountId !== ticket.accountId || !existing.session.canReconnect(auth.resumeToken)) {
              socket.close(1008, "Session is already active or resume token is invalid");
              return;
            }
            entry = existing;
            existing.socket = socket;
            existing.session.markConnected();
          } else {
            if (this.options.receiptSecret.length < 32) throw new Error("Receipt issuer unavailable");
            entry = { session: new VerifiedBotMatchSession(ticket, this.options.receiptSecret), socket, resultSent: false };
            this.sessions.set(ticket.sessionId, entry);
          }
          authenticated = true;
          clearTimeout(authTimeout);
          this.send(socket, entry.session.sessionMessage());
          this.send(socket, entry.session.snapshotMessage());
          return;
        }
        entry?.session.receiveInput(decoded);
      } catch (error) {
        const code = error instanceof SessionTicketError ? error.code : "INVALID_MESSAGE";
        this.send(socket, { type: "error", protocolVersion: PROTOCOL_VERSION, code, message: error instanceof Error ? error.message : "Invalid message" });
        if (!authenticated) socket.close(1008, code);
      }
    });
    socket.on("close", () => {
      clearTimeout(authTimeout);
      if (entry?.socket === socket) {
        entry.socket = null;
        entry.session.neutralizeInput();
        entry.session.markDisconnected();
      }
    });
  }

  private tick(): void {
    const now = Date.now();
    for (const [sessionId, entry] of this.sessions) {
      if (!entry.socket && entry.session.isReconnectExpired(now)) { this.sessions.delete(sessionId); continue; }
      entry.session.step();
      if (!entry.socket) continue;
      if (entry.session.state.tick % 3 === 0) this.send(entry.socket, entry.session.snapshotMessage());
      if (!entry.resultSent) {
        const result = entry.session.resultMessage();
        if (result) { this.send(entry.socket, result); entry.resultSent = true; }
      }
    }
  }

  listen(port: number, host = "0.0.0.0"): Promise<number> {
    return new Promise((resolve, reject) => {
      this.httpServer.once("error", reject);
      this.httpServer.listen(port, host, () => {
        this.httpServer.off("error", reject);
        const address = this.httpServer.address();
        resolve(typeof address === "object" && address ? address.port : port);
      });
    });
  }

  async close(): Promise<void> {
    clearInterval(this.interval);
    for (const client of this.websocketServer.clients) client.terminate();
    await new Promise<void>((resolve) => this.websocketServer.close(() => resolve()));
    if (this.httpServer.listening) await new Promise<void>((resolve, reject) => this.httpServer.close((error) => error ? reject(error) : resolve()));
  }
}

export function createAuthoritativeGameServer(options: AuthoritativeServerOptions): AuthoritativeGameServer {
  return new AuthoritativeGameServer(options);
}
