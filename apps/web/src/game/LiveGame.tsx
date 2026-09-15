import { useEffect, useMemo, useRef, useState } from "react";
import {
  FIXED_STEP_SECONDS,
  createMatch,
  getMatchRankings,
  getHeroSkill,
  latestEvents,
  previewSkill,
  startFinalRound,
  stepMatch,
  type GameState,
  type InputCommand,
  type MatchMode,
  type SkillPreview,
} from "@mma/game-core";
import { heroesById, type HeroId } from "@mma/content";
import { MemoryTelemetry } from "@mma/telemetry";
import { ThreeArena } from "./ThreeArena";
import { useCombatControls } from "./useCombatControls";
import { CombatControls } from "./CombatControls";
import { ElementIcon } from "../components/GameIcon";

type LiveGameProps = {
  heroId: HeroId;
  onExit: () => void;
  matchId?: string;
  mode?: MatchMode;
};



function percent(value: number, maximum: number): string {
  return Math.max(0, Math.min(100, Math.round((value / maximum) * 100))) + "%";
}

function seedFromMatchId(matchId: string): number {
  let seed = 17;
  for (const character of matchId) seed = (seed * 31 + character.charCodeAt(0)) % 2_147_483_647;
  return Math.max(1, seed);
}

function requestGameFullscreen(): void {
  const request = document.documentElement.requestFullscreen?.();
  if (request) void request.catch(() => undefined);
}

export function LiveGame({ heroId, onExit, matchId = "local-playtest", mode = "standard" }: LiveGameProps) {
  const gameRef = useRef<GameState>(createMatch({ seed: seedFromMatchId(matchId), playerHeroId: heroId, botCount: 4, mode }));
  const [game, setGame] = useState<GameState>(() => structuredClone(gameRef.current));
  const [paused, setPaused] = useState(false);
  const [rendererStatus, setRendererStatus] = useState<"checking" | "ready" | "unavailable">("checking");
  const [metrics, setMetrics] = useState({ frameMs: 0, physicsMs: 0 });
  const telemetryRef = useRef(new MemoryTelemetry());
  const pausedRef = useRef(false);
  const controls = useCombatControls(game.players.player?.position, !paused && game.phase !== "results");
  const { heldSkill, aim, zoom } = controls;

  const player = game.players.player;
  const hero = heroesById[heroId] ?? heroesById["fire-ember"];
  const preview: SkillPreview | null = heldSkill === null ? null : previewSkill(game, "player", heldSkill, aim);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    let frame = 0;
    let previous = performance.now();
    let accumulator = 0;
    const loop = (now: number) => {
      const frameStarted = performance.now();
      const elapsed = Math.min(0.1, (now - previous) / 1000);
      previous = now;
      accumulator = pausedRef.current ? 0 : accumulator + elapsed;
      const physicsStarted = performance.now();
      if (!pausedRef.current) {
        while (accumulator >= FIXED_STEP_SECONDS) {
          const next = controls.input.consume(gameRef.current.players.player?.position, [...gameRef.current.arena.walls, ...gameRef.current.arena.objects.filter(o => o.hp > 0), ...gameRef.current.walls]);
          const command: InputCommand = { playerId: "player", move: next.move, aim: next.aim, ...next.actions };
          stepMatch(gameRef.current, [command]);
          accumulator -= FIXED_STEP_SECONDS;
        }
      }
      const physicsMs = performance.now() - physicsStarted;
      const frameMs = performance.now() - frameStarted;
      telemetryRef.current.performance({
        frameMs,
        physicsMs,
        activeBodies: Object.values(gameRef.current.players).filter((entry) => entry.alive).length,
        projectileCount: gameRef.current.projectiles.length,
      });
      if (gameRef.current.tick % 12 === 0) setMetrics({ frameMs, physicsMs });
      setGame(structuredClone(gameRef.current));
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  const scoreRows = useMemo(
    () => getMatchRankings(game).map(row => game.players[row.playerId]!),
    [game],
  );
  const eventRows = latestEvents(game, 5).reverse();
  const aimAngle = Math.round((Math.atan2(aim.y, aim.x) * 180 / Math.PI + 360) % 360);

  if (!player || !hero) return null;

  return (
    <main className="game-page" data-testid="game-client">
      <div className="landscape-warning"><span>↔</span><strong>Rotate to landscape</strong><small>Gameplay is designed for a horizontal screen.</small></div>
      <header className="game-topbar">
        <button className="game-brand" onClick={onExit}><span className="brand-mark">MM</span><span>MagicMadness</span></button>
        <div className="round-readout"><span className="mini-label">ROUND {game.round}</span><strong>{Math.max(0, 120 - Math.floor(game.time))}s</strong><small>{game.mode === "final" ? "FINAL · 3 respawns" : "STANDARD · 1 respawn"}</small></div>
        <div className="event-readout"><span className={"event-dot " + game.environmental.phase} /><span><small>ARENA PERSONALITY</small><strong>{game.environmental.name}</strong></span><em>{game.environmental.phase === "active" ? "ACTIVE" : game.environmental.phase === "warning" ? "TELEGRAPH" : Math.ceil(game.environmental.remaining) + "s"}</em></div>
        <button className="fullscreen-button" aria-label="Enter fullscreen" title="Enter fullscreen" onClick={requestGameFullscreen}>⛶</button><button className="pause-button" aria-label={paused ? "Resume match" : "Pause match"} title={paused ? "Resume match" : "Pause match"} onClick={() => setPaused((value) => !value)}>{paused ? "▶" : "Ⅱ"}</button><button className="exit-button" onClick={onExit}>Exit</button>
      </header>
      <section className="game-body">
        <div className="practice-badge" role="status">PRACTICE · NO PERSISTENT REWARDS</div>
        <aside className="game-rail left-rail">
          <div className="live-card"><span className="mini-label">YOU</span><div className="live-identity" style={{ "--hero-color": hero.color } as React.CSSProperties}><span className="live-glyph"><ElementIcon element={hero.element} /></span><span><strong>{hero.name}</strong><small>{hero.element} · {hero.primaryClass}</small></span></div><div className="meter-label"><span>HP</span><strong>{Math.ceil(player.hp)} / {player.maxHp}</strong></div><div className="meter hp-meter"><span style={{ width: percent(player.hp, player.maxHp) }} /></div><div className="meter-label"><span>MANA</span><strong>{Math.ceil(player.mana)} / {player.maxMana}</strong></div><div className="meter mana-meter"><span style={{ width: percent(player.mana, player.maxMana) }} /></div></div>
          <div className="live-card compact-card"><span className="mini-label">SCORE LAYERS</span><div className="score-line"><span>Match</span><strong>{player.matchScore}</strong></div><div className="score-line"><span>Damage</span><strong>{Math.round(player.performance.damage)}</strong></div><div className="score-line"><span>Assists</span><strong>{player.performance.assists}</strong></div><div className="score-line"><span>Respawns</span><strong>{player.respawnsRemaining}</strong></div></div>
          <div className="diagnostic-card"><span className="mini-label">DIAGNOSTICS</span><div><span>tick</span><strong>{game.tick}</strong></div><div><span>physics</span><strong>{metrics.physicsMs.toFixed(2)} ms</strong></div><div><span>frame</span><strong>{metrics.frameMs.toFixed(2)} ms</strong></div><div><span>projectiles</span><strong>{game.projectiles.length}</strong></div><div><span>events</span><strong>{game.events.length}</strong></div><div><span>zoom</span><strong>{zoom.toFixed(2)}×</strong></div></div>
        </aside>
        <div className="arena-stage">
          <div className="arena-title"><span className="pulse-dot" /> LOCAL BOT MATCH <span>·</span><span>{Object.values(game.players).length} fighters</span><span className="aim-readout">AIM {aimAngle}°</span><span className={"renderer-readout " + rendererStatus}>{rendererStatus === "ready" ? "3D READY" : rendererStatus === "unavailable" ? "3D UNAVAILABLE" : "3D CHECKING"}</span><small>CLIENT {matchId}</small></div>
          <ThreeArena game={game} zoom={zoom} preview={preview} {...controls.arenaProps} onRendererStatus={setRendererStatus} />
          {rendererStatus === "unavailable" && <div className="renderer-warning" role="status" data-testid="renderer-unavailable"><strong>3D renderer unavailable</strong><span>The match simulation is intact, but this browser cannot initialize WebGL.</span></div>}
          <div className="arena-legend"><span><i className="legend-dot hazard" /> edge hazard</span><span><i className="legend-dot event" /> wind field</span><span><i className="legend-dot preview" /> preview path</span></div>
        </div>
        <aside className="game-rail right-rail">
          <div className="live-card leaderboard"><span className="mini-label">LIVE PLACEMENT</span>{scoreRows.map((row, index) => <div className={"leader-row " + (row.id === "player" ? "self" : "")} key={row.id}><span className="placement">{index + 1}</span><span className="leader-name"><i style={{ background: heroesById[row.heroId]?.color ?? "#fff" }} />{row.name}</span><strong>{row.matchScore}</strong></div>)}</div>
          <div className="live-card event-log"><span className="mini-label">EVENT LOG</span>{eventRows.map((event) => <div className="log-row" key={event.id}><span>{event.type.replaceAll("_", " ")}</span><small>{event.detail ?? event.tags[0] ?? "system"}</small></div>)}</div>
        </aside>
        <CombatControls hero={hero} player={player} controls={controls} />
      </section>
      {paused && <div className="paused-banner" role="status"><strong>MATCH PAUSED</strong><span>Press the pause button to resume</span></div>}
      {game.phase === "results" && game.result && <div className="result-overlay"><div className="result-panel"><p className="eyebrow">MATCH COMPLETE</p><h1>{game.result.winnerId === "player" ? "Arena won." : "The arena remembers."}</h1><p>{game.mode === "final" ? "The last survivor wins. Score orders the remaining places." : "Match Score decides placement."} Performance is recorded separately.</p><div className="result-table">{game.result.rankings.map((row) => <div className={"result-row " + (row.playerId === "player" ? "self" : "")} key={row.playerId}><span>#{row.placement}</span><strong>{game.players[row.playerId]?.name ?? row.playerId}</strong><small>match {row.matchScore} · performance {row.performanceScore}</small></div>)}</div><div className="result-actions"><button className="primary-button" onClick={() => { controls.reset(); gameRef.current = createMatch({ seed: 20260829 + game.tick, playerHeroId: heroId, botCount: 4 }); setGame(structuredClone(gameRef.current)); }}>Play again <span>↗</span></button><button className="outline-button" onClick={() => { controls.reset(); startFinalRound(gameRef.current); setGame(structuredClone(gameRef.current)); }}>Try final-round rules</button><button className="text-link" onClick={onExit}>Return to app</button></div></div></div>}
      {heldSkill !== null && preview && <div className="preview-hint">RELEASE TO CAST · {getHeroSkill(hero.id, heldSkill).name.toUpperCase()} · {preview.geometry.kind.toUpperCase()}</div>}
    </main>
  );
}
