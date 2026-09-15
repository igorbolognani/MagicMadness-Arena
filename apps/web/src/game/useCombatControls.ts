import { useEffect, useRef, useState, type PointerEvent, type TouchEvent, type WheelEvent } from "react";
import type { SkillIndex } from "@mma/game-core";
import type { Vec2 } from "@mma/physics";
import { CombatInput, screenToArenaVector } from "./combatInput";

const owner = (pointerId: number) => `pointer:${pointerId}`;
const clampZoom = (value: number) => Math.max(.58, Math.min(1.75, value));

export function useCombatControls(position: Vec2 | undefined, enabled = true) {
  const input = useRef(new CombatInput()).current;
  const [, refresh] = useState(0);
  const [zoom, setZoom] = useState(1.06);
  const [cancelActive, setCancelActive] = useState(false);
  const movementPadRef = useRef<HTMLDivElement>(null);
  const cancelZoneRef = useRef<HTMLDivElement>(null);
  const current = useRef({ position, enabled });
  current.current = { position, enabled };
  const pinchDistance = useRef<number | null>(null);
  const pinching = useRef(false);
  const redraw = () => refresh(value => value + 1);

  function stick(vector: Vec2) {
    movementPadRef.current?.style.setProperty("--stick-x", `${vector.x * 28}px`);
    movementPadRef.current?.style.setProperty("--stick-y", `${vector.y * 28}px`);
  }
  function inCancelZone(x: number, y: number) {
    const rect = cancelZoneRef.current?.getBoundingClientRect();
    return !!rect && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  }
  function cancel() { input.cancelSkill(); setCancelActive(false); redraw(); }
  function reset() { input.reset(); stick({ x: 0, y: 0 }); pinching.current = false; pinchDistance.current = null; setCancelActive(false); redraw(); }
  function endPointer(event: { pointerId: number; clientX: number; clientY: number }, cancelled: boolean) {
    if (input.movementPointer === event.pointerId) {
      input.movementPointer = null; input.touchMove = { x: 0, y: 0 }; stick(input.touchMove);
    }
    if (input.held?.owner === owner(event.pointerId) || input.held?.owner === `arena:${event.pointerId}`) {
      input.finish(input.held.owner, cancelled || pinching.current || inCancelZone(event.clientX, event.clientY));
      setCancelActive(false); redraw();
    }
  }

  useEffect(() => {
    if (!enabled) reset();
  }, [enabled]);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (!current.current.enabled) return;
      const key = event.key.toLowerCase();
      input.keys.add(key);
      if ([" ", "q", "e", "1", "2", "3", "4", "escape", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) event.preventDefault();
      if (event.repeat) return;
      if (key === "escape") cancel();
      if (key === "q") input.action("healthPotion");
      if (key === "e") input.action("manaPotion");
      if (key === " ") input.action("dash");
      const index = ["1", "2", "3", "4"].indexOf(key);
      if (index >= 0 && !pinching.current && input.begin(`key:${key}`, index as SkillIndex)) redraw();
    };
    const up = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase(); input.keys.delete(key);
      input.finish(`key:${key}`, !current.current.enabled || pinching.current); redraw();
    };
    const upPointer = (event: globalThis.PointerEvent) => endPointer(event, false);
    const cancelPointer = (event: globalThis.PointerEvent) => endPointer(event, true);
    const hidden = () => { if (document.hidden) reset(); };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up);
    window.addEventListener("pointerup", upPointer); window.addEventListener("pointercancel", cancelPointer);
    window.addEventListener("blur", reset); document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("keydown", down); window.removeEventListener("keyup", up);
      window.removeEventListener("pointerup", upPointer); window.removeEventListener("pointercancel", cancelPointer);
      window.removeEventListener("blur", reset); document.removeEventListener("visibilitychange", hidden);
      input.reset();
    };
  }, [input]);

  function movePointer(event: PointerEvent<HTMLDivElement>) {
    if (!current.current.enabled || input.movementPointer !== event.pointerId) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const vector = { x: (event.clientX - rect.left - rect.width / 2) / (rect.width / 2), y: (event.clientY - rect.top - rect.height / 2) / (rect.height / 2) };
    const length = Math.max(1, Math.hypot(vector.x, vector.y));
    vector.x /= length; vector.y /= length;
    input.touchMove = screenToArenaVector(vector); stick(vector);
  }
  function beginMove(event: PointerEvent<HTMLDivElement>) {
    if (!current.current.enabled || input.movementPointer !== null) return;
    input.movementPointer = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId); movePointer(event);
  }
  function beginSkill(event: PointerEvent<HTMLButtonElement>, index: SkillIndex) {
    if (!current.current.enabled || pinching.current || event.button !== 0) return;
    event.preventDefault();
    if (input.begin(owner(event.pointerId), index)) { event.currentTarget.setPointerCapture(event.pointerId); redraw(); }
  }
  function dragSkill(event: PointerEvent<HTMLButtonElement>) {
    if (input.held?.owner !== owner(event.pointerId)) return;
    event.preventDefault();
    setCancelActive(inCancelZone(event.clientX, event.clientY));
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2, y = event.clientY - rect.top - rect.height / 2;
    if (Math.hypot(x, y) < 9) return;
    input.aim = screenToArenaVector({ x, y }); redraw();
  }
  function updateAim(point: Vec2) {
    const player = current.current.position;
    if (!player || pinching.current || input.held?.owner.startsWith("pointer:")) return;
    input.aim = { x: point.x - player.x, y: point.y - player.y }; redraw();
  }
  function distance(event: TouchEvent<HTMLCanvasElement>) {
    const a = event.targetTouches[0], b = event.targetTouches[1];
    return a && b ? Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) : null;
  }
  function touchStart(event: TouchEvent<HTMLCanvasElement>) {
    const value = distance(event);
    if (value !== null) { event.preventDefault(); pinching.current = true; pinchDistance.current = value; cancel(); }
  }
  function touchMove(event: TouchEvent<HTMLCanvasElement>) {
    const value = distance(event);
    if (value === null || pinchDistance.current === null) return;
    event.preventDefault(); const delta = value - pinchDistance.current;
    setZoom(z => clampZoom(z + delta * .002)); pinchDistance.current = value;
  }
  function touchEnd(event: TouchEvent<HTMLCanvasElement>) {
    pinchDistance.current = distance(event);
    if (event.targetTouches.length === 0) pinching.current = false;
  }

  return {
    input, heldSkill: input.held?.skill ?? null, aim: input.aim, zoom, cancelActive, cancel, reset,
    movementPadRef, cancelZoneRef, beginMove, movePointer, beginSkill, dragSkill,
    endPointer: (event: PointerEvent<HTMLElement>) => endPointer(event, false),
    cancelPointer: (event: PointerEvent<HTMLElement>) => endPointer(event, true),
    fireOneShot: (key: "dash" | "healthPotion" | "manaPotion") => { if (current.current.enabled) input.action(key); },
    arenaProps: {
      onAimChange: updateAim,
      onPointerDown: (event: PointerEvent<HTMLCanvasElement>) => { if (!current.current.enabled || event.pointerType === "touch") return; if (event.button === 2) { event.preventDefault(); input.action("dash"); } else if (event.button === 0 && input.begin(`arena:${event.pointerId}`, 0)) { event.currentTarget.setPointerCapture(event.pointerId); redraw(); } },
      onPointerUp: (event: PointerEvent<HTMLCanvasElement>) => endPointer(event, false),
      onPointerCancel: (event: PointerEvent<HTMLCanvasElement>) => endPointer(event, true),
      onPointerLeave: () => undefined,
      onWheel: (event: WheelEvent<HTMLCanvasElement>) => { event.preventDefault(); setZoom(z => clampZoom(z - event.deltaY * .001)); },
      onTouchStart: touchStart, onTouchMove: touchMove, onTouchEnd: touchEnd,
    },
  };
}
