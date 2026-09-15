import * as THREE from "three";
import type { MatchEvent, PlayerState, VerticalState } from "@mma/game-core";
import type { HeroAnimationClip } from "./heroAssetManifest";

export type AnimationSelection = { clip: HeroAnimationClip; cueId: string; oneShot: boolean; priority: number };

type AnimationInput = {
  player: Pick<PlayerState, "id" | "alive" | "eliminated" | "velocity" | "respawnTimer" | "vertical">;
  events: MatchEvent[];
  tick: number;
  winnerId?: string;
  holding?: boolean;
};

function recentEvent(events: MatchEvent[], tick: number, playerId: string, types: MatchEvent["type"][], asTarget = false): MatchEvent | undefined {
  return [...events].reverse().find((event) => tick - event.tick <= 18 && types.includes(event.type) && (asTarget ? event.targetId === playerId : event.actorId === playerId));
}

function verticalClip(vertical: VerticalState): HeroAnimationClip | null {
  if (vertical.state === "rising") return "rising";
  if (vertical.state === "airborne") return "airborne";
  if (vertical.state === "falling") return "falling";
  if (vertical.state === "landing") return "landing";
  return null;
}

export function selectHeroAnimation({ player, events, tick, winnerId, holding }: AnimationInput): AnimationSelection {
  if (!player.alive) return { clip: "death", cueId: `death-${player.id}`, oneShot: true, priority: 100 };
  if (winnerId === player.id) return { clip: "victory", cueId: `victory-${player.id}`, oneShot: false, priority: 95 };
  const respawn = recentEvent(events, tick, player.id, ["RESPAWN"]);
  if (respawn) return { clip: "respawn", cueId: respawn.id, oneShot: true, priority: 90 };
  const knockback = recentEvent(events, tick, player.id, ["IMPULSE", "KO"], true);
  if (knockback) return { clip: "knockback", cueId: knockback.id, oneShot: true, priority: 84 };
  const hit = recentEvent(events, tick, player.id, ["DAMAGE", "COLLISION"], true);
  if (hit) return { clip: "hit_reaction", cueId: hit.id, oneShot: true, priority: 78 };
  const release = recentEvent(events, tick, player.id, ["CAST_RELEASE"]);
  if (release) return { clip: "cast_release", cueId: release.id, oneShot: true, priority: 72 };
  if (holding) return { clip: "cast_anticipation", cueId: `held-${player.id}`, oneShot: true, priority: 68 };
  const start = recentEvent(events, tick, player.id, ["CAST_START"]);
  if (start) return { clip: "cast_anticipation", cueId: start.id, oneShot: true, priority: 68 };
  const vertical = verticalClip(player.vertical);
  if (vertical) return { clip: vertical, cueId: `${vertical}-${player.id}-${player.vertical.state}`, oneShot: vertical !== "airborne", priority: 60 };
  const speed = Math.hypot(player.velocity.x, player.velocity.y);
  return speed > 18
    ? { clip: "movement", cueId: `movement-${player.id}`, oneShot: false, priority: 20 }
    : { clip: "idle", cueId: `idle-${player.id}`, oneShot: false, priority: 10 };
}

export class HeroAnimationController {
  private readonly mixer: THREE.AnimationMixer;
  private readonly actions = new Map<string, THREE.AnimationAction>();
  private active: THREE.AnimationAction | null = null;
  private cueId = "";
  private paused = false;
  private playbackSpeed = 1;

  constructor(root: THREE.Object3D, clips: THREE.AnimationClip[]) {
    this.mixer = new THREE.AnimationMixer(root);
    clips.forEach((clip) => this.actions.set(clip.name, this.mixer.clipAction(clip)));
  }

  play(selection: AnimationSelection): void {
    if (selection.cueId === this.cueId) return;
    const next = this.actions.get(selection.clip);
    if (!next) return;
    this.cueId = selection.cueId;
    next.reset();
    next.enabled = true;
    next.setLoop(selection.oneShot ? THREE.LoopOnce : THREE.LoopRepeat, selection.oneShot ? 1 : Infinity);
    next.clampWhenFinished = selection.oneShot;
    if (this.active && this.active !== next) this.active.crossFadeTo(next, selection.oneShot ? .08 : .16, false);
    next.play();
    this.active = next;
  }

  update(deltaSeconds: number, speedRatio = 1): void {
    if (this.active) this.active.timeScale = THREE.MathUtils.clamp(speedRatio * this.playbackSpeed, .05, 3);
    if (!this.paused) this.mixer.update(Math.min(deltaSeconds, .05));
  }

  setPaused(paused: boolean): void { this.paused = paused; }
  setPlaybackSpeed(speed: number): void { this.playbackSpeed = THREE.MathUtils.clamp(speed, .1, 2.5); }
  activeClip(): string | null { return this.active?.getClip().name ?? null; }

  dispose(): void {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.mixer.getRoot());
    this.actions.clear();
  }
}
