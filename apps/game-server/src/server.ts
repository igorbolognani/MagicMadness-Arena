import { createServer } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import {
  FIXED_STEP_SECONDS,
  createMatch,
  stepMatch,
  type GameState,
  type InputCommand,
} from "@mma/game-core";
import { PROTOCOL_VERSION, assertProtocolVersion, type ClientInputMessage } from "@mma/protocol";

type ConnectedClient = { socket: WebSocket; playerId: string; lastSequence: number };

const state: GameState = createMatch({ seed: 20260829, botCount: 1 });
const inputs = new Map<string, InputCommand>();
const clients = new Map<string, ConnectedClient>();
let playerNumber = 1;

const httpServer = createServer((request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true, service: "magicmadness-game-server", tick: state.tick }));
    return;
  }
  response.writeHead(404);
  response.end();
});

const websocketServer = new WebSocketServer({ server: httpServer });

websocketServer.on("connection", (socket) => {
  const playerId = "online-" + playerNumber++;
  const playerTemplate = state.players.player;
  if (!playerTemplate) {
    socket.close(1011, "Server player template unavailable");
    return;
  }
  state.players[playerId] = {
    ...playerTemplate,
    id: playerId,
    name: "Online Fighter",
    isBot: false,
    spawn: { x: 800, y: 450 },
    position: { x: 800, y: 450 },
    teamId: playerId,
    input: { playerId, move: { x: 0, y: 0 }, aim: { x: 1, y: 0 } },
  };
  const client: ConnectedClient = { socket, playerId, lastSequence: -1 };
  clients.set(playerId, client);
  socket.send(JSON.stringify({ type: "snapshot", protocolVersion: PROTOCOL_VERSION, tick: state.tick, payload: state }));
  socket.on("message", (raw) => {
    try {
      const message = JSON.parse(raw.toString()) as ClientInputMessage;
      assertProtocolVersion(message.protocolVersion);
      if (message.sequence <= client.lastSequence) return;
      client.lastSequence = message.sequence;
      inputs.set(playerId, {
        playerId,
        move: message.move,
        aim: message.aim,
        ...(message.releaseSkill !== undefined ? { releaseSkill: message.releaseSkill as 0 | 1 | 2 | 3 } : {}),
        ...(message.dash ? { dash: true } : {}),
        ...(message.healthPotion ? { healthPotion: true } : {}),
        ...(message.manaPotion ? { manaPotion: true } : {}),
      });
    } catch (error) {
      socket.send(JSON.stringify({ type: "error", protocolVersion: PROTOCOL_VERSION, code: "INVALID_INPUT", message: error instanceof Error ? error.message : "Invalid input" }));
    }
  });
  socket.on("close", () => {
    inputs.delete(playerId);
    delete state.players[playerId];
    clients.delete(playerId);
  });
});

setInterval(() => {
  stepMatch(state, [...inputs.values()], FIXED_STEP_SECONDS);
  const snapshot = JSON.stringify({ type: "snapshot", protocolVersion: PROTOCOL_VERSION, tick: state.tick, payload: state });
  for (const client of clients.values()) {
    if (client.socket.readyState === 1) client.socket.send(snapshot);
  }
  for (const command of inputs.values()) {
    inputs.set(command.playerId, { playerId: command.playerId, move: command.move, aim: command.aim });
  }
}, FIXED_STEP_SECONDS * 1000);

httpServer.listen(Number(process.env.PORT ?? 8787), "0.0.0.0", () => {
  console.log("MagicMadness authoritative server listening on 8787");
});
