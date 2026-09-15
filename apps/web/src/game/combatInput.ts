import type { SkillIndex } from "@mma/game-core";
import type { Vec2 } from "@mma/physics";

export const ARENA_CAMERA = { height: 1540, depth: 1280, ground: 10 };
const elevationSin = (ARENA_CAMERA.height - ARENA_CAMERA.ground) / Math.hypot(ARENA_CAMERA.height - ARENA_CAMERA.ground, ARENA_CAMERA.depth);

/** Inverse orthographic ground projection: screen down corresponds to world +Y. */
export function screenToArenaVector(vector: Vec2): Vec2 {
  const length = Math.min(1, Math.hypot(vector.x, vector.y));
  const groundY = vector.y / elevationSin;
  const groundLength = Math.hypot(vector.x, groundY);
  return groundLength ? { x: vector.x / groundLength * length, y: groundY / groundLength * length } : { x: 0, y: 0 };
}

export function heroFacing(aim: Vec2): number { return Math.atan2(aim.x, aim.y); }
export type CombatActions = Partial<{ releaseSkill: SkillIndex; dash: boolean; healthPotion: boolean; manaPotion: boolean }>;

export class CombatInput {
  readonly keys = new Set<string>();
  aim: Vec2 = { x: 1, y: 0 };
  touchMove: Vec2 = { x: 0, y: 0 };
  movementPointer: number | null = null;
  held: { owner: string; skill: SkillIndex } | null = null;
  private actions: CombatActions = {};

  begin(owner: string, skill: SkillIndex): boolean {
    if (this.held) return false;
    this.held = { owner, skill };
    return true;
  }
  finish(owner: string, cancelled = false): void {
    if (this.held?.owner !== owner) return;
    if (!cancelled) this.actions.releaseSkill = this.held.skill;
    this.held = null;
  }
  cancelSkill(): void { this.held = null; }
  action(key: "dash" | "healthPotion" | "manaPotion"): void { this.actions[key] = true; }
  reset(): void {
    this.keys.clear(); this.touchMove = { x: 0, y: 0 }; this.movementPointer = null;
    this.held = null; this.actions = {};
  }
  move(): Vec2 {
    const x = Number(this.keys.has("d") || this.keys.has("arrowright")) - Number(this.keys.has("a") || this.keys.has("arrowleft"));
    const y = Number(this.keys.has("s") || this.keys.has("arrowdown")) - Number(this.keys.has("w") || this.keys.has("arrowup"));
    return x || y ? screenToArenaVector({ x, y }) : this.touchMove;
  }
  consume(): { move: Vec2; aim: Vec2; actions: CombatActions } {
    const actions = this.actions; this.actions = {};
    return { move: this.move(), aim: { ...this.aim }, actions };
  }
}
