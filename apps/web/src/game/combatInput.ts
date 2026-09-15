import type { SkillIndex } from "@mma/game-core";
import { findWalkPath } from "./clickNavigation";
import type { Aabb, Vec2 } from "@mma/physics";

export const ARENA_CAMERA = { height: 2460, depth: 2050, ground: 10 };
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
  selectedSkill: SkillIndex = 0;
  destination: Vec2 | null = null;
  aimTarget: Vec2 | null = null;
  private path: Vec2[] = [];
  private routeKey = "";
  setDestination(point: Vec2) { this.destination = { ...point }; this.routeKey = ""; }
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
    this.held = null; this.aimTarget = null; this.actions = {}; this.destination = null; this.path = []; this.routeKey = "";
  }
  move(position?: Vec2, obstacles: Aabb[] = []): Vec2 {
    if (this.movementPointer !== null || Math.hypot(this.touchMove.x,this.touchMove.y) > .01) { this.destination = null; return this.touchMove; }
    if (!position || !this.destination) return { x: 0, y: 0 };
    const key=JSON.stringify([this.destination,obstacles]);
    if (key !== this.routeKey) { this.path=findWalkPath(position,this.destination,obstacles); this.routeKey=key; }
    while(this.path[0] && Math.hypot(this.path[0].x-position.x,this.path[0].y-position.y)<12) this.path.shift();
    const next=this.path[0];
    if(!next){this.destination=null;return {x:0,y:0};}
    const x=next.x-position.x,y=next.y-position.y,length=Math.hypot(x,y);
    return {x:x/length,y:y/length};
  }
  consume(position?: Vec2, obstacles: Aabb[] = []): { move: Vec2; aim: Vec2; actions: CombatActions } {
    const actions = this.actions; this.actions = {};
    if(position && this.aimTarget) this.aim = {x:this.aimTarget.x-position.x,y:this.aimTarget.y-position.y};
    return { move: this.move(position,obstacles), aim: { ...this.aim }, actions };
  }

}
