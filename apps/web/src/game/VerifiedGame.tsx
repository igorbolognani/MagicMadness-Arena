import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getMatchRankings, previewSkill, type GameState, type SkillPreview } from "@mma/game-core";
import { heroesById, type HeroId } from "@mma/content";
import { PROTOCOL_VERSION, type MatchResultReceipt, type MatchSessionTicket, type ServerMessage } from "@mma/protocol";
import { ElementIcon } from "../components/GameIcon";
import { ThreeArena } from "./ThreeArena";
import { useCombatControls } from "./useCombatControls";
import { CombatControls } from "./CombatControls";
import { inputEnvelope, persistAuthoritativeReceipt, requestVerifiedSession, type PersistedReceiptResult, type VerifiedConnectionState } from "./verifiedMatchClient";

type VerifiedResultEnvelope = { result: NonNullable<GameState["result"]>; receipt: MatchResultReceipt; botTelemetry: GameState["botTelemetry"] };
const stateCopy: Record<VerifiedConnectionState, string> = {
  connecting: "Contacting match service",
  searching: "Searching for server slot",
  "match-found": "Verified match found",
  loading: "Loading authoritative snapshot",
  connected: "Connected · server authoritative",
  reconnecting: "Reconnecting within 20 seconds",
  disconnected: "Disconnected from game server",
  "result-pending": "Result pending",
  "receipt-issued": "Receipt issued · persisting",
  "receipt-persisted": "Receipt persisted",
  "persistence-failed": "Persistence failed · safe to retry",
};

function percent(value: number, maximum: number): string {
  return `${Math.max(0, Math.min(100, Math.round(value / maximum * 100)))}%`;
}

export function VerifiedGame({ heroId, accountExperience, onExit }: { heroId: HeroId; accountExperience: number; onExit: () => void }) {
  const [connectionState, setConnectionState] = useState<VerifiedConnectionState>("connecting");
  const [game, setGame] = useState<GameState | null>(null);
  const [resultEnvelope, setResultEnvelope] = useState<VerifiedResultEnvelope | null>(null);
  const [persisted, setPersisted] = useState<PersistedReceiptResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rendererStatus, setRendererStatus] = useState<"checking" | "ready" | "unavailable">("checking");
  const socketRef = useRef<WebSocket | null>(null);
  const ticketRef = useRef<MatchSessionTicket | null>(null);
  const urlRef = useRef("");
  const resumeTokenRef = useRef<string | undefined>(undefined);
  const reconnectDeadlineRef = useRef(0);
  const reconnectTimerRef = useRef<number | undefined>(undefined);
  const sequenceRef = useRef(0);
  const tickRef = useRef(0);
  const resultRef = useRef<VerifiedResultEnvelope | null>(null);
  const disposedRef = useRef(false);

  const controls = useCombatControls(game?.players.player?.position, connectionState === "connected" && game?.phase !== "results");
  const { zoom, heldSkill } = controls;

  const hero = heroesById[heroId] ?? heroesById["fire-ember"];
  const player = game?.players.player;
  const preview: SkillPreview | null = game && heldSkill !== null ? previewSkill(game, "player", heldSkill, controls.aim) : null;

  const persistReceipt = useCallback(async (receipt: MatchResultReceipt) => {
    setConnectionState("receipt-issued");
    setError(null);
    try {
      const value = await persistAuthoritativeReceipt(receipt);
      if (disposedRef.current) return;
      setPersisted(value);
      setConnectionState("receipt-persisted");
    } catch (cause) {
      if (disposedRef.current) return;
      setError(cause instanceof Error ? cause.message : "receipt_persistence_failed");
      setConnectionState("persistence-failed");
    }
  }, []);

  const connect = useCallback((reconnecting = false) => {
    const ticket = ticketRef.current;
    if (!ticket || !urlRef.current || disposedRef.current) return;
    setConnectionState(reconnecting ? "reconnecting" : "loading");
    const socket = new WebSocket(urlRef.current);
    socketRef.current = socket;
    socket.addEventListener("open", () => {
      socket.send(JSON.stringify({ type: "authenticate", protocolVersion: PROTOCOL_VERSION, ticket, ...(resumeTokenRef.current ? { resumeToken: resumeTokenRef.current } : {}) }));
    });
    socket.addEventListener("message", (event) => {
      let message: ServerMessage;
      try { message = JSON.parse(String(event.data)) as ServerMessage; }
      catch { setError("invalid_server_message"); return; }
      if (message.protocolVersion !== PROTOCOL_VERSION) { setError("protocol_mismatch"); socket.close(); return; }
      if (message.type === "session") {
        resumeTokenRef.current = message.payload.resumeToken;
        reconnectDeadlineRef.current = Date.now() + message.payload.reconnectWindowSeconds * 1000;
        setConnectionState("connected");
      } else if (message.type === "snapshot") {
        tickRef.current = message.tick;
        setGame(message.payload as GameState);
        setConnectionState((current) => current === "receipt-issued" || current === "receipt-persisted" || current === "persistence-failed" ? current : "connected");
      } else if (message.type === "result") {
        const envelope = message.payload as VerifiedResultEnvelope;
        resultRef.current = envelope;
        setResultEnvelope(envelope);
        setConnectionState("result-pending");
        void persistReceipt(envelope.receipt);
      } else if (message.type === "error") {
        setError(`${message.code}: ${message.message}`);
      }
    });
    socket.addEventListener("close", () => {
      if (disposedRef.current || resultRef.current) return;
      if (resumeTokenRef.current && Date.now() < reconnectDeadlineRef.current) {
        setConnectionState("reconnecting");
        reconnectTimerRef.current = window.setTimeout(() => connect(true), 800);
      } else {
        setConnectionState("disconnected");
        setError("authoritative_game_server_disconnected");
      }
    });
    socket.addEventListener("error", () => setError("game_server_connection_error"));
  }, [persistReceipt]);

  useEffect(() => {
    disposedRef.current = false;
    setConnectionState("searching");
    void requestVerifiedSession(heroId).then((session) => {
      if (disposedRef.current) return;
      ticketRef.current = session.ticket;
      urlRef.current = session.webSocketUrl;
      setConnectionState("match-found");
      connect(false);
    }).catch((cause) => {
      if (disposedRef.current) return;
      setConnectionState("disconnected");
      setError(cause instanceof Error ? cause.message : "verified_mode_unavailable");
    });
    return () => {
      disposedRef.current = true;
      if (reconnectTimerRef.current !== undefined) window.clearTimeout(reconnectTimerRef.current);
      socketRef.current?.close(1000, "Client route closed");
    };
  }, [connect, heroId]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN || connectionState !== "connected") return;
      const next = controls.input.consume();
      socket.send(JSON.stringify(inputEnvelope(sequenceRef.current++, tickRef.current, next.move, next.aim, next.actions)));
    }, 1000 / 30);
    return () => window.clearInterval(interval);
  }, [connectionState, controls.input]);

  const scoreRows = useMemo(() => game ? getMatchRankings(game).map(row => game.players[row.playerId]!) : [], [game]);

  return <main className="game-page verified-game" data-testid="verified-game">
    <div className="landscape-warning"><span>↔</span><strong>Rotate to landscape</strong><small>Gameplay is designed for a horizontal screen.</small></div>
    <header className="game-topbar"><button className="game-brand" onClick={onExit}><span className="brand-mark">MM</span><span>MagicMadness</span></button><div className="round-readout"><span className="mini-label">VERIFIED VS BOTS</span><strong>{game ? `${Math.max(0, 120 - Math.floor(game.time))}s` : "—"}</strong><small>SERVER TICK {game?.tick ?? "—"}</small></div><div className={`verified-state state-${connectionState}`}><span className="pulse-dot" /><strong>{stateCopy[connectionState]}</strong></div><button className="exit-button" onClick={onExit}>Exit</button></header>
    <section className="game-body">
      <div className="verified-badge" role="status">VERIFIED · SERVER AUTHORITY · PERSISTENT RECEIPT</div>
      {game && player && hero ? <>
        <aside className="game-rail left-rail"><div className="live-card"><span className="mini-label">YOU</span><div className="live-identity" style={{ "--hero-color": hero.color } as React.CSSProperties}><span className="live-glyph"><ElementIcon element={hero.element} /></span><span><strong>{hero.name}</strong><small>{hero.element} · authoritative snapshot</small></span></div><div className="meter-label"><span>HP</span><strong>{Math.ceil(player.hp)} / {player.maxHp}</strong></div><div className="meter hp-meter"><span style={{ width: percent(player.hp, player.maxHp) }} /></div><div className="meter-label"><span>MANA</span><strong>{Math.ceil(player.mana)} / {player.maxMana}</strong></div><div className="meter mana-meter"><span style={{ width: percent(player.mana, player.maxMana) }} /></div></div></aside>
        <div className="arena-stage"><div className="arena-title"><span className="pulse-dot" /> VERIFIED BOT MATCH <span>·</span><span>5 fighters</span><span className={`renderer-readout ${rendererStatus}`}>{rendererStatus === "ready" ? "3D READY" : rendererStatus === "unavailable" ? "3D UNAVAILABLE" : "3D CHECKING"}</span></div><ThreeArena game={game} zoom={zoom} preview={preview} {...controls.arenaProps} onRendererStatus={setRendererStatus} />{rendererStatus === "unavailable" && <div className="renderer-warning"><strong>3D renderer unavailable</strong><span>The authoritative match remains connected, but this browser cannot initialize WebGL.</span></div>}</div>
        <aside className="game-rail right-rail"><div className="live-card leaderboard"><span className="mini-label">SERVER PLACEMENT</span>{scoreRows.map((row, index) => <div className={`leader-row ${row.id === "player" ? "self" : ""}`} key={row.id}><span className="placement">{index + 1}</span><span className="leader-name">{row.name}</span><strong>{row.matchScore}</strong></div>)}</div></aside>
        <CombatControls hero={hero} player={player} controls={controls} />
      </> : <div className="verified-connection-panel"><span className="pulse-dot" /><h1>{stateCopy[connectionState]}</h1><p>{error ?? "The client is waiting for the first signed, authoritative snapshot."}</p><button className="outline-button" onClick={onExit}>Return to Play</button></div>}
    </section>
    {resultEnvelope && <div className="result-overlay"><div className="result-panel verified-result"><p className="eyebrow">AUTHORITATIVE MATCH COMPLETE</p><h1>{persisted ? "Progress saved." : "Result received."}</h1><div className="receipt-score-grid"><article><small>PLACEMENT</small><strong>#{resultEnvelope.receipt.placement}</strong></article><article><small>MATCH SCORE</small><strong>{resultEnvelope.receipt.matchScore}</strong></article><article><small>PERFORMANCE</small><strong>{resultEnvelope.receipt.performanceScore}</strong></article></div><div className="receipt-details"><span>XP before <strong>{persisted?.previousExperience ?? accountExperience}</strong></span><span>XP gained <strong>+{persisted?.xpGained ?? resultEnvelope.receipt.rewards.xp}</strong></span><span>XP current <strong>{persisted?.experience ?? "pending"}</strong></span><span>Reward <strong>{Object.entries(resultEnvelope.receipt.rewards.currencies).map(([key, value]) => `${value} ${key}`).join(" · ") || "none"}</strong></span><span>Receipt <strong>{resultEnvelope.receipt.receiptId.slice(0, 12)}…</strong></span><span>Status <strong>{persisted ? persisted.replayed ? "already consumed · idempotent" : "persisted" : connectionState}</strong></span></div>{error && <p className="error-message">{error}</p>}<div className="result-actions">{connectionState === "persistence-failed" && <button className="primary-button" onClick={() => void persistReceipt(resultEnvelope.receipt)}>Retry same receipt</button>}<button className="text-link" onClick={onExit}>Return to Play</button></div></div></div>}
  </main>;
}
