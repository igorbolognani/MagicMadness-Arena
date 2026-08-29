import { useEffect, useMemo, useRef, useState } from "react";
import {
  FIXED_STEP_SECONDS,
  createMatch,
  getHeroDefinition,
  getHeroSkill,
  latestEvents,
  previewSkill,
  startFinalRound,
  stepMatch,
  type GameState,
  type InputCommand,
  type MatchMode,
  type SkillIndex,
  type SkillPreview,
} from "@mma/game-core";
import { getSkillTuning } from "@mma/balance";
import { heroesById, type HeroId } from "@mma/content";
import { MemoryTelemetry } from "@mma/telemetry";
import { PixiArena } from "./PixiArena";

type LiveGameProps = {
  heroId: HeroId;
  onExit: () => void;
  matchId?: string;
  mode?: MatchMode;
};

const skillIndexes: SkillIndex[] = [0, 1, 2, 3];
const heroGlyph: Record<string, string> = { fire: "✦", water: "◒", earth: "⬟", air: "◌" };

function percent(value: number, maximum: number): string {
  return Math.max(0, Math.min(100, Math.round((value / maximum) * 100))) + "%";
}

function actionCommand(base: InputCommand, key: "dash" | "healthPotion" | "manaPotion"): InputCommand {
  return { ...base, [key]: true };
}

function seedFromMatchId(matchId: string): number {
  let seed = 17;
  for (const character of matchId) seed = (seed * 31 + character.charCodeAt(0)) % 2_147_483_647;
  return Math.max(1, seed);
}

export function LiveGame({ heroId, onExit, matchId = "local-playtest", mode = "standard" }: LiveGameProps) {
  const gameRef = useRef<GameState>(createMatch({ seed: seedFromMatchId(matchId), playerHeroId: heroId, botCount: 3, mode }));
  const [game, setGame] = useState<GameState>(() => structuredClone(gameRef.current));
  const [heldSkill, setHeldSkill] = useState<SkillIndex | null>(null);
  const [aim, setAim] = useState({ x: 1, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [metrics, setMetrics] = useState({ frameMs: 0, physicsMs: 0 });
  const commandRef = useRef<InputCommand>({ playerId: "player", move: { x: 0, y: 0 }, aim: { x: 1, y: 0 } });
  const keysRef = useRef(new Set<string>());
  const telemetryRef = useRef(new MemoryTelemetry());
  const canvasCastingRef = useRef(false);
  const movementPointerRef = useRef<number | null>(null);
  const pinchDistanceRef = useRef<number | null>(null);
  const touchMoveRef = useRef({ x: 0, y: 0 });

  const player = game.players.player;
  const hero = heroesById[heroId] ?? heroesById["fire-ember"];
  const preview: SkillPreview | null = heldSkill === null ? null : previewSkill(game, "player", heldSkill, aim);

  useEffect(() => {
    let frame = 0;
    let previous = performance.now();
    let accumulator = 0;
    const loop = (now: number) => {
      const frameStarted = performance.now();
      const elapsed = Math.min(0.1, (now - previous) / 1000);
      previous = now;
      accumulator += elapsed;
      const keys = keysRef.current;
      const keyboardMove = {
        x: Number(keys.has("d") || keys.has("arrowright")) - Number(keys.has("a") || keys.has("arrowleft")),
        y: Number(keys.has("s") || keys.has("arrowdown")) - Number(keys.has("w") || keys.has("arrowup")),
      };
      const move = Math.abs(keyboardMove.x) + Math.abs(keyboardMove.y) > 0 ? keyboardMove : touchMoveRef.current;
      commandRef.current = { ...commandRef.current, move };
      const physicsStarted = performance.now();
      while (accumulator >= FIXED_STEP_SECONDS) {
        const command = { ...commandRef.current, move: { ...commandRef.current.move }, aim: { ...commandRef.current.aim } };
        stepMatch(gameRef.current, [command]);
        commandRef.current = { playerId: "player", move, aim: { ...command.aim } };
        accumulator -= FIXED_STEP_SECONDS;
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

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      keysRef.current.add(key);
      if (key === "q") fireOneShot("healthPotion");
      if (key === "e") fireOneShot("manaPotion");
      if (key === " ") fireOneShot("dash");
      const index = ["1", "2", "3", "4"].indexOf(key);
      if (index >= 0) setHeldSkill(index as SkillIndex);
    };
    const up = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      keysRef.current.delete(key);
      const index = ["1", "2", "3", "4"].indexOf(key);
      if (index >= 0) releaseSkill(index as SkillIndex);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  function fireOneShot(key: "dash" | "healthPotion" | "manaPotion"): void {
    commandRef.current = actionCommand(commandRef.current, key);
  }

  function releaseSkill(index: SkillIndex): void {
    commandRef.current = { ...commandRef.current, releaseSkill: index };
    setHeldSkill(null);
    canvasCastingRef.current = false;
  }

  function updateAimFromClient(clientX: number, clientY: number, element: HTMLElement): void {
    const rect = element.getBoundingClientRect();
    const worldScale = Math.min(rect.width / gameRef.current.arena.width, rect.height / gameRef.current.arena.height) * zoom;
    const worldX = (clientX - rect.left - rect.width / 2) / worldScale + gameRef.current.arena.width / 2;
    const worldY = (clientY - rect.top - rect.height / 2) / worldScale + gameRef.current.arena.height / 2;
    const current = gameRef.current.players.player;
    if (!current) return;
    const nextAim = { x: worldX - current.position.x, y: worldY - current.position.y };
    setAim(nextAim);
    commandRef.current = { ...commandRef.current, aim: nextAim };
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>): void {
    updateAimFromClient(event.clientX, event.clientY, event.currentTarget);
    if (movementPointerRef.current === event.pointerId) return;
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>): void {
    updateAimFromClient(event.clientX, event.clientY, event.currentTarget);
    if (heldSkill !== null) canvasCastingRef.current = true;
  }

  function handlePointerUp(): void {
    if (canvasCastingRef.current && heldSkill !== null) releaseSkill(heldSkill);
  }

  function handleMovementPointer(event: React.PointerEvent<HTMLDivElement>): void {
    if (movementPointerRef.current === null) {
      movementPointerRef.current = event.pointerId;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const y = (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    const magnitude = Math.hypot(x, y);
    touchMoveRef.current = magnitude > 1 ? { x: x / magnitude, y: y / magnitude } : { x, y };
  }

  function endMovementPointer(event: React.PointerEvent<HTMLDivElement>): void {
    if (movementPointerRef.current === event.pointerId) {
      movementPointerRef.current = null;
      touchMoveRef.current = { x: 0, y: 0 };
    }
  }

  function handleWheel(event: React.WheelEvent<HTMLCanvasElement>): void {
    event.preventDefault();
    setZoom((value) => Math.max(0.72, Math.min(1.35, value - event.deltaY * 0.001)));
  }

  function touchDistance(event: React.TouchEvent<HTMLCanvasElement>): number | null {
    const first = event.touches[0];
    const second = event.touches[1];
    if (!first || !second) return null;
    return Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
  }

  function handleTouchStart(event: React.TouchEvent<HTMLCanvasElement>): void {
    const distance = touchDistance(event);
    if (distance !== null) {
      event.preventDefault();
      pinchDistanceRef.current = distance;
    }
  }

  function handleTouchMove(event: React.TouchEvent<HTMLCanvasElement>): void {
    const distance = touchDistance(event);
    if (distance === null || pinchDistanceRef.current === null) return;
    event.preventDefault();
    setZoom((value) => Math.max(0.72, Math.min(1.35, value + (distance - pinchDistanceRef.current!) * 0.002)));
    pinchDistanceRef.current = distance;
  }

  function handleTouchEnd(): void {
    pinchDistanceRef.current = null;
  }

  const scoreRows = useMemo(
    () => Object.values(game.players).sort((a, b) => b.matchScore - a.matchScore || b.performance.damage - a.performance.damage),
    [game.players],
  );
  const eventRows = latestEvents(game, 5).reverse();

  if (!player || !hero) return null;

  return (
    <main className="game-page" data-testid="game-client">
      <div className="landscape-warning"><span>↔</span><strong>Rotate to landscape</strong><small>Gameplay is designed for a horizontal screen.</small></div>
      <header className="game-topbar">
        <button className="game-brand" onClick={onExit}><span className="brand-mark">MM</span><span>MagicMadness</span></button>
        <div className="round-readout"><span className="mini-label">ROUND {game.round}</span><strong>{Math.max(0, 120 - Math.floor(game.time))}s</strong><small>{game.mode === "final" ? "FINAL · 3 respawns" : "STANDARD · 1 respawn"}</small></div>
        <div className="event-readout"><span className={"event-dot " + game.environmental.phase} /><span><small>ARENA PERSONALITY</small><strong>{game.environmental.name}</strong></span><em>{game.environmental.phase === "active" ? "ACTIVE" : game.environmental.phase === "warning" ? "TELEGRAPH" : Math.ceil(game.environmental.remaining) + "s"}</em></div>
        <button className="exit-button" onClick={onExit}>Exit</button>
      </header>
      <section className="game-body">
        <aside className="game-rail left-rail">
          <div className="live-card"><span className="mini-label">YOU</span><div className="live-identity" style={{ "--hero-color": hero.color } as React.CSSProperties}><span className="live-glyph">{heroGlyph[hero.element] ?? "✦"}</span><span><strong>{hero.name}</strong><small>{hero.element} · {hero.primaryClass}</small></span></div><div className="meter-label"><span>HP</span><strong>{Math.ceil(player.hp)} / {player.maxHp}</strong></div><div className="meter hp-meter"><span style={{ width: percent(player.hp, player.maxHp) }} /></div><div className="meter-label"><span>MANA</span><strong>{Math.ceil(player.mana)} / {player.maxMana}</strong></div><div className="meter mana-meter"><span style={{ width: percent(player.mana, player.maxMana) }} /></div></div>
          <div className="live-card compact-card"><span className="mini-label">SCORE LAYERS</span><div className="score-line"><span>Match</span><strong>{player.matchScore}</strong></div><div className="score-line"><span>Damage</span><strong>{Math.round(player.performance.damage)}</strong></div><div className="score-line"><span>Assists</span><strong>{player.performance.assists}</strong></div><div className="score-line"><span>Respawns</span><strong>{player.respawnsRemaining}</strong></div></div>
          <div className="diagnostic-card"><span className="mini-label">DIAGNOSTICS</span><div><span>tick</span><strong>{game.tick}</strong></div><div><span>physics</span><strong>{metrics.physicsMs.toFixed(2)} ms</strong></div><div><span>frame</span><strong>{metrics.frameMs.toFixed(2)} ms</strong></div><div><span>projectiles</span><strong>{game.projectiles.length}</strong></div><div><span>events</span><strong>{game.events.length}</strong></div><div><span>zoom</span><strong>{zoom.toFixed(2)}×</strong></div></div>
        </aside>
        <div className="arena-stage">
          <div className="arena-title"><span className="pulse-dot" /> LOCAL BOT MATCH <span>·</span><span>{Object.values(game.players).length} fighters</span><small>CLIENT {matchId}</small></div>
          <PixiArena game={game} zoom={zoom} preview={preview} onPointerMove={handlePointerMove} onPointerDown={handlePointerDown} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp} onWheel={handleWheel} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} />
          <div className="arena-legend"><span><i className="legend-dot hazard" /> edge hazard</span><span><i className="legend-dot event" /> wind field</span><span><i className="legend-dot preview" /> preview path</span></div>
        </div>
        <aside className="game-rail right-rail">
          <div className="live-card leaderboard"><span className="mini-label">LIVE PLACEMENT</span>{scoreRows.map((row, index) => <div className={"leader-row " + (row.id === "player" ? "self" : "")} key={row.id}><span className="placement">{index + 1}</span><span className="leader-name"><i style={{ background: heroesById[row.heroId]?.color ?? "#fff" }} />{row.name}</span><strong>{row.matchScore}</strong></div>)}</div>
          <div className="live-card event-log"><span className="mini-label">EVENT LOG</span>{eventRows.map((event) => <div className="log-row" key={event.id}><span>{event.type.replaceAll("_", " ")}</span><small>{event.detail ?? event.tags[0] ?? "system"}</small></div>)}</div>
        </aside>
        <div className="movement-pad" onPointerDown={handleMovementPointer} onPointerMove={handleMovementPointer} onPointerUp={endMovementPointer} onPointerCancel={endMovementPointer}><span className="pad-cross">+</span><span className="pad-caption">MOVE</span></div>
        <div className="combat-controls">
          <div className="skill-row">{skillIndexes.map((index) => { const skill = getHeroSkill(hero.id, index); const tuning = getSkillTuning(skill.id); const cooldown = player.cooldowns[skill.id] ?? 0; return <button key={skill.id} className={"skill-button " + (heldSkill === index ? "holding" : "")} style={{ "--hero-color": hero.color } as React.CSSProperties} title={skill.summary} onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); setHeldSkill(index); }} onPointerUp={() => releaseSkill(index)} onPointerCancel={() => setHeldSkill(null)}><span className="skill-key">{index + 1}</span><span className="skill-glyph">{heroGlyph[hero.element] ?? "✦"}</span><small>{cooldown > 0 ? cooldown.toFixed(1) : tuning.behavior}</small>{cooldown > 0 && <span className="cooldown-cover" style={{ height: Math.min(100, cooldown / tuning.cooldown * 100) + "%" }} />}</button>; })}</div>
          <div className="utility-row"><button className="utility-button dash-button" onPointerDown={() => fireOneShot("dash")}><strong>⇢</strong><small>DASH · SPACE</small><em>{player.tacticalCooldown > 0 ? player.tacticalCooldown.toFixed(1) : "READY"}</em></button><button className="utility-button" onPointerDown={() => fireOneShot("healthPotion")}><strong>♥</strong><small>HEALTH · Q</small></button><button className="utility-button" onPointerDown={() => fireOneShot("manaPotion")}><strong>◈</strong><small>MANA · E</small></button></div>
          </div>
      </section>
      {game.phase === "results" && game.result && <div className="result-overlay"><div className="result-panel"><p className="eyebrow">MATCH COMPLETE</p><h1>{game.result.winnerId === "player" ? "Arena won." : "The arena remembers."}</h1><p>Match Score decides placement. Performance Score records how you created the result.</p><div className="result-table">{game.result.rankings.map((row) => <div className={"result-row " + (row.playerId === "player" ? "self" : "")} key={row.playerId}><span>#{row.placement}</span><strong>{game.players[row.playerId]?.name ?? row.playerId}</strong><small>match {row.matchScore} · performance {row.performanceScore}</small></div>)}</div><div className="result-actions"><button className="primary-button" onClick={() => { gameRef.current = createMatch({ seed: 20260829 + game.tick, playerHeroId: heroId, botCount: 3 }); setGame(structuredClone(gameRef.current)); }}>Play again <span>↗</span></button><button className="outline-button" onClick={() => { startFinalRound(gameRef.current); setGame(structuredClone(gameRef.current)); }}>Try final-round rules</button><button className="text-link" onClick={onExit}>Return to app</button></div></div></div>}
      {heldSkill !== null && preview && <div className="preview-hint">RELEASE TO CAST · {getHeroSkill(hero.id, heldSkill).name.toUpperCase()} · {preview.geometry.kind.toUpperCase()}</div>}
    </main>
  );
}
