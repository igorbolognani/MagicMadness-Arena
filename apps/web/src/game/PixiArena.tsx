import { useEffect, useRef } from "react";
import { Application, Container, Graphics, Text, TextStyle } from "pixi.js";
import {
  elementColor,
  type GameState,
  type SkillPreview,
} from "@mma/game-core";
import { heroesById, skillsById } from "@mma/content";
import { getSkillTuning } from "@mma/balance";

type PixiArenaProps = {
  game: GameState;
  zoom: number;
  preview: SkillPreview | null;
  onPointerMove: (event: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerDown: (event: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerUp: (event: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerLeave: (event: React.PointerEvent<HTMLCanvasElement>) => void;
  onWheel: (event: React.WheelEvent<HTMLCanvasElement>) => void;
  onTouchStart: (event: React.TouchEvent<HTMLCanvasElement>) => void;
  onTouchMove: (event: React.TouchEvent<HTMLCanvasElement>) => void;
  onTouchEnd: (event: React.TouchEvent<HTMLCanvasElement>) => void;
};

function colorForHero(heroId: string): number {
  const hero = heroesById[heroId];
  return hero ? Number.parseInt(hero.color.slice(1), 16) : 0xffffff;
}

function colorForObject(color: string, fallback = 0xffffff): number {
  const parsed = Number.parseInt(color.replace("#", ""), 16);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function shadeColor(color: number, amount: number): number {
  const red = Math.max(0, Math.min(255, ((color >> 16) & 0xff) + amount));
  const green = Math.max(0, Math.min(255, ((color >> 8) & 0xff) + amount));
  const blue = Math.max(0, Math.min(255, (color & 0xff) + amount));
  return (red << 16) | (green << 8) | blue;
}

function normalizeVector(vector: { x: number; y: number }): { x: number; y: number } {
  const length = Math.hypot(vector.x, vector.y);
  return length > 0 ? { x: vector.x / length, y: vector.y / length } : { x: 1, y: 0 };
}

function orientedRectangle(center: { x: number; y: number }, direction: { x: number; y: number }, width: number, depth: number): number[] {
  const aim = normalizeVector(direction);
  const side = { x: -aim.y, y: aim.x };
  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  return [
    center.x - side.x * halfWidth - aim.x * halfDepth,
    center.y - side.y * halfWidth - aim.y * halfDepth,
    center.x + side.x * halfWidth - aim.x * halfDepth,
    center.y + side.y * halfWidth - aim.y * halfDepth,
    center.x + side.x * halfWidth + aim.x * halfDepth,
    center.y + side.y * halfWidth + aim.y * halfDepth,
    center.x - side.x * halfWidth + aim.x * halfDepth,
    center.y - side.y * halfWidth + aim.y * halfDepth,
  ];
}

function elementGlyphForHero(heroId: string): string {
  const element = heroesById[heroId]?.element;
  return element === "fire" ? "✦" : element === "water" ? "◒" : element === "earth" ? "⬟" : "◌";
}

function drawPreview(root: Container, preview: SkillPreview): void {
  const path = new Graphics();
  for (const segment of preview.path) {
    const color = segment.certainty === "certain" ? 0xffffff : segment.certainty === "predicted" ? 0xffd166 : 0xff6b9d;
    path.lineStyle(3, color, 0.78);
    path.moveTo(segment.from.x, segment.from.y);
    path.lineTo(segment.to.x, segment.to.y);
  }
  path.beginFill(0xffffff, 0.95);
  path.drawCircle(preview.origin.x, preview.origin.y, 6);
  path.endFill();
  path.lineStyle(2, 0xffffff, 0.9);
  path.drawCircle(preview.impact.x, preview.impact.y, Math.max(12, preview.radius));
  if (preview.geometry.kind === "circle" || preview.geometry.kind === "pullCircle") {
    path.beginFill(0xffffff, 0.09);
    path.drawCircle(preview.impact.x, preview.impact.y, Math.max(12, preview.radius));
    path.endFill();
  }
  if (preview.geometry.kind === "wall") {
    path.beginFill(0xffffff, 0.2);
    path.drawPolygon(orientedRectangle(preview.impact, preview.direction, preview.geometry.width, 36));
    path.endFill();
  }
  root.addChild(path);
}

function drawCastBursts(root: Container, game: GameState): void {
  const recentCasts = game.events.filter((event) => event.type === "CAST_RELEASE" && event.position && event.vector && event.sourceDefinitionId && game.tick - event.tick <= 24);
  for (const event of recentCasts) {
    if (!event.position || !event.vector || !event.sourceDefinitionId) continue;
    const tuning = getSkillTuning(event.sourceDefinitionId);
    const definition = skillsById[event.sourceDefinitionId];
    if (!definition) continue;
    const age = Math.max(0, game.tick - event.tick);
    const alpha = Math.max(0, 1 - age / 24);
    const direction = normalizeVector(event.vector);
    const target = { x: event.position.x + direction.x * tuning.range, y: event.position.y + direction.y * tuning.range };
    const burst = new Graphics();
    const color = elementColor(definition.element);
    burst.lineStyle(4, color, alpha * 0.9);
    burst.beginFill(color, alpha * 0.12);
    if (tuning.behavior === "radial" || tuning.behavior === "pull" || tuning.behavior === "field") {
      burst.drawCircle(target.x, target.y, tuning.effectRadius * (0.72 + age / 34));
      burst.endFill();
      burst.drawCircle(target.x, target.y, tuning.effectRadius * (0.42 + age / 48));
    } else if (tuning.behavior === "wall") {
      const wallWidth = definition.geometry.kind === "wall" ? definition.geometry.width : 120;
      burst.drawPolygon(orientedRectangle(target, direction, wallWidth, 34));
      burst.endFill();
      const wallLine = orientedRectangle(target, direction, wallWidth - 16, 3);
      burst.moveTo(wallLine[0] ?? target.x, wallLine[1] ?? target.y);
      burst.lineTo(wallLine[2] ?? target.x, wallLine[3] ?? target.y);
    } else if (tuning.behavior === "dash") {
      burst.moveTo(event.position.x, event.position.y);
      burst.lineTo(target.x, target.y);
      burst.drawCircle(event.position.x, event.position.y, tuning.effectRadius * (1 - alpha * 0.3));
      burst.endFill();
    } else {
      burst.moveTo(event.position.x, event.position.y);
      burst.lineTo(target.x, target.y);
      burst.endFill();
      burst.drawCircle(event.position.x, event.position.y, 12 + age * 1.6);
    }
    root.addChild(burst);
  }
}

function combatEventPosition(game: GameState, event: GameState["events"][number]): { x: number; y: number } | null {
  if (event.position) return event.position;
  if (event.targetId) return game.players[event.targetId]?.position ?? null;
  return null;
}

function drawCombatImpacts(root: Container, game: GameState): void {
  for (const event of game.events) {
    if ((event.type !== "DAMAGE" && event.type !== "IMPULSE") || game.tick - event.tick > 18) continue;
    const position = combatEventPosition(game, event);
    if (!position) continue;
    const age = Math.max(0, game.tick - event.tick);
    const alpha = Math.max(0, 1 - age / 18);
    const sourceSkill = event.sourceDefinitionId ? skillsById[event.sourceDefinitionId] : undefined;
    const color = sourceSkill
      ? elementColor(sourceSkill.element)
      : 0xffffff;
    const impact = new Graphics();
    impact.lineStyle(event.type === "DAMAGE" ? 3 : 2, color, alpha * 0.9);
    impact.drawCircle(position.x, position.y, 10 + age * 2.7);
    const spokes = event.type === "DAMAGE" ? 6 : 4;
    for (let spoke = 0; spoke < spokes; spoke += 1) {
      const angle = event.sequence * 0.41 + spoke * Math.PI * 2 / spokes;
      const inner = 12 + age * 1.4;
      const outer = 22 + age * 2.4;
      impact.moveTo(position.x + Math.cos(angle) * inner, position.y + Math.sin(angle) * inner);
      impact.lineTo(position.x + Math.cos(angle) * outer, position.y + Math.sin(angle) * outer);
    }
    if (event.type === "IMPULSE" && event.vector) {
      const direction = normalizeVector(event.vector);
      impact.lineStyle(4, color, alpha * 0.68);
      impact.moveTo(position.x - direction.x * 28, position.y - direction.y * 28);
      impact.lineTo(position.x + direction.x * 18, position.y + direction.y * 18);
    }
    root.addChild(impact);
  }
}

function canvasHex(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`;
}

function canvasRoundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

function canvasPolygon(context: CanvasRenderingContext2D, points: number[]): void {
  context.beginPath();
  context.moveTo(points[0] ?? 0, points[1] ?? 0);
  for (let index = 2; index < points.length; index += 2) {
    context.lineTo(points[index] ?? 0, points[index + 1] ?? 0);
  }
  context.closePath();
}

function drawCanvasPreview(context: CanvasRenderingContext2D, preview: SkillPreview): void {
  context.save();
  context.setLineDash([11, 8]);
  context.strokeStyle = preview.path[0]?.certainty === "dynamic" ? "rgba(255,209,102,.9)" : "rgba(255,255,255,.78)";
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(preview.origin.x, preview.origin.y);
  context.lineTo(preview.impact.x, preview.impact.y);
  context.stroke();
  context.setLineDash([]);
  context.fillStyle = "rgba(255,255,255,.92)";
  context.beginPath();
  context.arc(preview.origin.x, preview.origin.y, 6, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = "rgba(255,255,255,.92)";
  context.lineWidth = 2;
  if (preview.geometry.kind === "wall") {
    canvasPolygon(context, orientedRectangle(preview.impact, preview.direction, preview.geometry.width, 36));
    context.fillStyle = "rgba(255,255,255,.18)";
    context.fill();
    context.stroke();
  } else {
    context.beginPath();
    context.arc(preview.impact.x, preview.impact.y, Math.max(12, preview.radius), 0, Math.PI * 2);
    context.stroke();
    if (["circle", "pullCircle", "ring", "trail", "orbit"].includes(preview.geometry.kind)) {
      context.fillStyle = "rgba(255,255,255,.08)";
      context.fill();
    }
  }
  context.restore();
}

function drawCanvasWorld(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  game: GameState,
  preview: SkillPreview | null,
  zoom: number,
): void {
  const width = canvas.clientWidth || 800;
  const height = canvas.clientHeight || 450;
  const resolution = Math.min(window.devicePixelRatio || 1, 2);
  const pixelWidth = Math.max(1, Math.round(width * resolution));
  const pixelHeight = Math.max(1, Math.round(height * resolution));
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
  context.setTransform(resolution, 0, 0, resolution, 0, 0);
  context.clearRect(0, 0, width, height);

  const worldScale = Math.min(width / game.arena.width, height / game.arena.height) * zoom;
  context.save();
  context.translate(width / 2 - (game.arena.width * worldScale) / 2, height / 2 - (game.arena.height * worldScale) / 2);
  context.scale(worldScale, worldScale);
  const pulse = 0.5 + Math.sin(game.time * 4) * 0.5;

  context.fillStyle = "#070a13";
  context.fillRect(0, 0, game.arena.width, game.arena.height);
  context.fillStyle = "#0c1426";
  context.fillRect(game.arena.safeMin.x, game.arena.safeMin.y, game.arena.safeMax.x - game.arena.safeMin.x, game.arena.safeMax.y - game.arena.safeMin.y);
  context.fillStyle = "rgba(117, 91, 66, .12)";
  for (let x = 40; x < game.arena.width; x += 160) {
    for (let y = 40; y < game.arena.height; y += 160) {
      context.fillRect(x, y, 76, 76);
      context.strokeStyle = "rgba(210, 177, 126, .12)";
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(x + 8, y + 10);
      context.lineTo(x + 68, y + 10);
      context.moveTo(x + 12, y + 66);
      context.lineTo(x + 62, y + 66);
      context.stroke();
    }
  }
  context.fillStyle = "rgba(53, 186, 246, .18)";
  for (const crystal of [{ x: 165, y: 125 }, { x: 1435, y: 675 }, { x: 1435, y: 125 }, { x: 165, y: 675 }]) {
    context.beginPath();
    context.moveTo(crystal.x, crystal.y - 22);
    context.lineTo(crystal.x + 14, crystal.y + 7);
    context.lineTo(crystal.x, crystal.y + 24);
    context.lineTo(crystal.x - 14, crystal.y + 7);
    context.closePath();
    context.fill();
  }
  const atmosphere = context.createRadialGradient(game.arena.center.x, game.arena.center.y, 30, game.arena.center.x, game.arena.center.y, 360);
  atmosphere.addColorStop(0, "rgba(72, 52, 112, .26)");
  atmosphere.addColorStop(1, "rgba(23, 37, 65, 0)");
  context.fillStyle = atmosphere;
  context.fillRect(0, 0, game.arena.width, game.arena.height);
  context.strokeStyle = "rgba(233, 77, 114, .62)";
  context.lineWidth = 3;
  context.strokeRect(game.arena.safeMin.x, game.arena.safeMin.y, game.arena.safeMax.x - game.arena.safeMin.x, game.arena.safeMax.y - game.arena.safeMin.y);

  context.strokeStyle = "rgba(37, 51, 78, .3)";
  context.lineWidth = 1;
  for (let x = 80; x < game.arena.width; x += 80) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, game.arena.height);
    context.stroke();
  }
  for (let y = 80; y < game.arena.height; y += 80) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(game.arena.width, y);
    context.stroke();
  }
  context.strokeStyle = "rgba(244, 211, 94, .34)";
  context.beginPath();
  context.arc(game.arena.center.x, game.arena.center.y, 96, 0, Math.PI * 2);
  context.stroke();
  context.beginPath();
  context.arc(game.arena.center.x, game.arena.center.y, 70, 0, Math.PI * 2);
  context.moveTo(game.arena.center.x - 115, game.arena.center.y);
  context.lineTo(game.arena.center.x + 115, game.arena.center.y);
  context.moveTo(game.arena.center.x, game.arena.center.y - 115);
  context.lineTo(game.arena.center.x, game.arena.center.y + 115);
  context.stroke();
  context.fillStyle = "#f4d35e";
  context.beginPath();
  context.arc(game.arena.center.x, game.arena.center.y, 4, 0, Math.PI * 2);
  context.fill();

  if (game.environmental.phase === "warning") {
    context.strokeStyle = `rgba(255, 209, 102, ${0.34 + pulse * 0.2})`;
    context.lineWidth = 8;
    context.beginPath();
    context.arc(game.arena.center.x, game.arena.center.y, game.environmental.affectedRadius + pulse * 8, 0, Math.PI * 2);
    context.stroke();
    context.strokeStyle = "rgba(255, 244, 193, .82)";
    context.lineWidth = 2;
    context.beginPath();
    context.arc(game.arena.center.x, game.arena.center.y, game.environmental.affectedRadius - 20, 0, Math.PI * 2);
    context.stroke();
  } else if (game.environmental.phase === "active") {
    context.fillStyle = "rgba(168, 139, 255, .09)";
    context.beginPath();
    context.arc(game.arena.center.x, game.arena.center.y, game.environmental.affectedRadius, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "rgba(177, 140, 255, .45)";
    context.lineWidth = 6;
    context.beginPath();
    context.moveTo(game.arena.center.x - game.environmental.direction.x * 340, game.arena.center.y - game.environmental.direction.y * 340);
    context.lineTo(game.arena.center.x + game.environmental.direction.x * 340, game.arena.center.y + game.environmental.direction.y * 340);
    context.stroke();
  }

  for (const wall of game.arena.walls) {
    context.fillStyle = "rgba(2, 4, 10, .5)";
    canvasRoundedRect(context, wall.min.x + 9, wall.min.y + 11, wall.max.x - wall.min.x, wall.max.y - wall.min.y, 10);
    context.fill();
    context.fillStyle = "#2b3c5f";
    context.fillRect(wall.min.x, wall.min.y, wall.max.x - wall.min.x, wall.max.y - wall.min.y);
    context.strokeStyle = "rgba(167, 184, 223, .7)";
    context.lineWidth = 2;
    context.strokeRect(wall.min.x, wall.min.y, wall.max.x - wall.min.x, wall.max.y - wall.min.y);
  }
  for (const object of game.arena.objects) {
    context.fillStyle = "rgba(2, 4, 10, .42)";
    canvasRoundedRect(context, object.min.x + 8, object.min.y + 10, object.max.x - object.min.x, object.max.y - object.min.y, 12);
    context.fill();
    context.fillStyle = canvasHex(colorForObject(object.color, 0x53688d));
    canvasRoundedRect(context, object.min.x, object.min.y, object.max.x - object.min.x, object.max.y - object.min.y, 12);
    context.fill();
    context.strokeStyle = "rgba(244, 226, 192, .45)";
    context.lineWidth = 2;
    context.stroke();
    if (object.kind === "crate") {
      context.strokeStyle = "rgba(66, 42, 42, .64)";
      context.beginPath();
      context.moveTo(object.min.x + 9, object.min.y + 9);
      context.lineTo(object.max.x - 9, object.max.y - 9);
      context.moveTo(object.max.x - 9, object.min.y + 9);
      context.lineTo(object.min.x + 9, object.max.y - 9);
      context.stroke();
    }
  }
  for (const wall of game.walls) {
    context.fillStyle = canvasHex(colorForObject(wall.color, 0xb18cff));
    context.globalAlpha = 0.92;
    canvasRoundedRect(context, wall.min.x, wall.min.y, wall.max.x - wall.min.x, wall.max.y - wall.min.y, 8);
    context.fill();
    context.globalAlpha = 1;
    context.strokeStyle = "rgba(255, 255, 255, .4)";
    context.lineWidth = 2;
    context.stroke();
  }

  for (const field of game.fields) {
    context.fillStyle = "rgba(2, 4, 10, .28)";
    context.beginPath();
    context.arc(field.position.x + 7, field.position.y + 9, field.radius, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = canvasHex(elementColor(field.element));
    context.globalAlpha = 0.18;
    context.beginPath();
    context.arc(field.position.x, field.position.y, field.radius, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 0.75;
    context.lineWidth = 2;
    context.strokeStyle = canvasHex(elementColor(field.element));
    context.stroke();
    context.globalAlpha = 1;
  }

  for (const projectile of game.projectiles) {
    const direction = normalizeVector(projectile.velocity);
    context.strokeStyle = canvasHex(elementColor(projectile.element));
    context.globalAlpha = 0.25;
    context.lineWidth = Math.max(3, projectile.radius * 0.55);
    context.beginPath();
    context.moveTo(projectile.position.x - direction.x * 38, projectile.position.y - direction.y * 38);
    context.lineTo(projectile.position.x, projectile.position.y);
    context.stroke();
    context.globalAlpha = 0.95;
    context.fillStyle = canvasHex(elementColor(projectile.element));
    context.beginPath();
    context.arc(projectile.position.x, projectile.position.y, projectile.radius, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 1;
  }

  for (const event of game.events) {
    if (event.type !== "CAST_RELEASE" || !event.position || !event.vector || !event.sourceDefinitionId || game.tick - event.tick > 24) continue;
    const tuning = getSkillTuning(event.sourceDefinitionId);
    const definition = skillsById[event.sourceDefinitionId];
    if (!definition) continue;
    const age = Math.max(0, game.tick - event.tick);
    const alpha = Math.max(0, 1 - age / 24);
    const direction = normalizeVector(event.vector);
    const target = { x: event.position.x + direction.x * tuning.range, y: event.position.y + direction.y * tuning.range };
    context.strokeStyle = canvasHex(elementColor(definition.element));
    context.fillStyle = canvasHex(elementColor(definition.element));
    context.globalAlpha = alpha * 0.9;
    context.lineWidth = 4;
    context.beginPath();
    if (tuning.behavior === "radial" || tuning.behavior === "pull" || tuning.behavior === "field") {
      context.arc(target.x, target.y, tuning.effectRadius * (0.72 + age / 34), 0, Math.PI * 2);
      context.stroke();
      context.globalAlpha = alpha * 0.12;
      context.beginPath();
      context.arc(target.x, target.y, tuning.effectRadius * (0.72 + age / 34), 0, Math.PI * 2);
      context.fill();
    } else if (tuning.behavior === "wall") {
      const wallWidth = definition.geometry.kind === "wall" ? definition.geometry.width : 120;
      canvasPolygon(context, orientedRectangle(target, direction, wallWidth, 34));
      context.stroke();
    } else if (tuning.behavior === "dash") {
      context.moveTo(event.position.x, event.position.y);
      context.lineTo(target.x, target.y);
      context.stroke();
    } else {
      context.moveTo(event.position.x, event.position.y);
      context.lineTo(target.x, target.y);
      context.stroke();
      context.beginPath();
      context.arc(event.position.x, event.position.y, 12 + age * 1.6, 0, Math.PI * 2);
      context.stroke();
    }
    context.globalAlpha = 1;
  }

  for (const event of game.events) {
    if ((event.type !== "DAMAGE" && event.type !== "IMPULSE") || game.tick - event.tick > 18) continue;
    const position = combatEventPosition(game, event);
    if (!position) continue;
    const age = Math.max(0, game.tick - event.tick);
    const alpha = Math.max(0, 1 - age / 18);
    const sourceSkill = event.sourceDefinitionId ? skillsById[event.sourceDefinitionId] : undefined;
    const color = sourceSkill
      ? canvasHex(elementColor(sourceSkill.element))
      : "#ffffff";
    context.strokeStyle = color;
    context.globalAlpha = alpha * 0.9;
    context.lineWidth = event.type === "DAMAGE" ? 3 : 2;
    context.beginPath();
    context.arc(position.x, position.y, 10 + age * 2.7, 0, Math.PI * 2);
    context.stroke();
    const spokes = event.type === "DAMAGE" ? 6 : 4;
    for (let spoke = 0; spoke < spokes; spoke += 1) {
      const angle = event.sequence * 0.41 + spoke * Math.PI * 2 / spokes;
      const inner = 12 + age * 1.4;
      const outer = 22 + age * 2.4;
      context.beginPath();
      context.moveTo(position.x + Math.cos(angle) * inner, position.y + Math.sin(angle) * inner);
      context.lineTo(position.x + Math.cos(angle) * outer, position.y + Math.sin(angle) * outer);
      context.stroke();
    }
    if (event.type === "IMPULSE" && event.vector) {
      const direction = normalizeVector(event.vector);
      context.lineWidth = 4;
      context.beginPath();
      context.moveTo(position.x - direction.x * 28, position.y - direction.y * 28);
      context.lineTo(position.x + direction.x * 18, position.y + direction.y * 18);
      context.stroke();
    }
    context.globalAlpha = 1;
  }

  if (preview) drawCanvasPreview(context, preview);

  context.textAlign = "center";
  context.textBaseline = "middle";
  for (const player of Object.values(game.players)) {
    if (!player.alive) continue;
    const color = canvasHex(colorForHero(player.heroId));
    context.fillStyle = "rgba(2, 4, 10, .48)";
    context.beginPath();
    context.ellipse(player.position.x + 7, player.position.y + 10, player.radius * 1.08, player.radius * 0.72, 0, 0, Math.PI * 2);
    context.fill();
    const aim = normalizeVector(player.input.aim);
    const side = { x: -aim.y, y: aim.x };
    context.fillStyle = canvasHex(shadeColor(colorForHero(player.heroId), -36));
    context.beginPath();
    context.moveTo(player.position.x - side.x * player.radius * 0.82 - aim.x * 5, player.position.y - side.y * player.radius * 0.82 - aim.y * 5);
    context.lineTo(player.position.x + side.x * player.radius * 0.82 - aim.x * 5, player.position.y + side.y * player.radius * 0.82 - aim.y * 5);
    context.lineTo(player.position.x + aim.x * player.radius * 0.8, player.position.y + aim.y * player.radius * 0.8);
    context.closePath();
    context.fill();
    context.fillStyle = "#f1d0aa";
    context.beginPath();
    context.arc(player.position.x - aim.x * player.radius * 0.32, player.position.y - aim.y * player.radius * 0.32 - player.radius * 0.56, player.radius * 0.38, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = canvasHex(shadeColor(colorForHero(player.heroId), 24));
    context.beginPath();
    context.arc(player.position.x - aim.x * player.radius * 0.34, player.position.y - aim.y * player.radius * 0.34, player.radius * 0.78, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "rgba(244,226,192,.88)";
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(player.position.x + side.x * player.radius * 0.15, player.position.y + side.y * player.radius * 0.15);
    context.lineTo(player.position.x + aim.x * player.radius * 1.38 + side.x * player.radius * 0.15, player.position.y + aim.y * player.radius * 1.38 + side.y * player.radius * 0.15);
    context.stroke();
    context.fillStyle = canvasHex(elementColor(heroesById[player.heroId]?.element ?? "fire"));
    context.beginPath();
    context.arc(player.position.x + aim.x * player.radius * 0.72, player.position.y + aim.y * player.radius * 0.72, Math.max(4, player.radius * 0.18), 0, Math.PI * 2);
    context.fill();
    if (player.id === "player") {
      context.strokeStyle = `rgba(255, 255, 255, ${0.2 + pulse * 0.18})`;
      context.lineWidth = 2;
      context.beginPath();
      context.arc(player.position.x, player.position.y, player.radius + 16 + pulse * 4, 0, Math.PI * 2);
      context.stroke();
    }
    context.fillStyle = color;
    context.beginPath();
    context.arc(player.position.x, player.position.y, player.radius, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = player.id === "player" ? "#ffffff" : "#101526";
    context.lineWidth = player.id === "player" ? 5 : 3;
    context.stroke();
    context.fillStyle = "rgba(255,255,255,.23)";
    context.beginPath();
    context.arc(player.position.x - player.radius * 0.28, player.position.y - player.radius * 0.31, player.radius * 0.36, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "rgba(255,255,255,.8)";
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(player.position.x, player.position.y);
    context.lineTo(player.position.x + aim.x * (player.radius + 14), player.position.y + aim.y * (player.radius + 14));
    context.stroke();
    if (player.id === "player") {
      const reticle = { x: player.position.x + aim.x * 132, y: player.position.y + aim.y * 132 };
      context.setLineDash([5, 5]);
      context.strokeStyle = "rgba(255,255,255,.48)";
      context.lineWidth = 1.5;
      context.beginPath();
      context.moveTo(player.position.x + aim.x * 26, player.position.y + aim.y * 26);
      context.lineTo(reticle.x, reticle.y);
      context.stroke();
      context.setLineDash([]);
      context.strokeStyle = "rgba(255,255,255,.9)";
      context.lineWidth = 2;
      context.beginPath();
      context.arc(reticle.x, reticle.y, 8 + pulse * 2, 0, Math.PI * 2);
      context.moveTo(reticle.x - 13, reticle.y);
      context.lineTo(reticle.x - 4, reticle.y);
      context.moveTo(reticle.x + 4, reticle.y);
      context.lineTo(reticle.x + 13, reticle.y);
      context.moveTo(reticle.x, reticle.y - 13);
      context.lineTo(reticle.x, reticle.y - 4);
      context.moveTo(reticle.x, reticle.y + 4);
      context.lineTo(reticle.x, reticle.y + 13);
      context.stroke();
    }
    const element = heroesById[player.heroId]?.element ?? "fire";
    context.strokeStyle = canvasHex(elementColor(element));
    context.fillStyle = canvasHex(elementColor(element));
    context.lineWidth = 2.5;
    context.beginPath();
    if (element === "fire") {
      context.moveTo(player.position.x, player.position.y - 11);
      context.lineTo(player.position.x + 7, player.position.y + 3);
      context.lineTo(player.position.x, player.position.y + 10);
      context.lineTo(player.position.x - 7, player.position.y + 3);
      context.closePath();
      context.fill();
    } else if (element === "water") {
      context.arc(player.position.x, player.position.y + 2, 8, 0, Math.PI * 2);
      context.stroke();
      context.moveTo(player.position.x, player.position.y - 12);
      context.lineTo(player.position.x + 5, player.position.y - 2);
      context.lineTo(player.position.x - 5, player.position.y - 2);
      context.closePath();
      context.fill();
    } else if (element === "earth") {
      context.moveTo(player.position.x, player.position.y - 11);
      context.lineTo(player.position.x + 10, player.position.y);
      context.lineTo(player.position.x, player.position.y + 11);
      context.lineTo(player.position.x - 10, player.position.y);
      context.closePath();
      context.fill();
    } else {
      context.arc(player.position.x - 2, player.position.y, 10, -1.1, 1.1);
      context.stroke();
      context.beginPath();
      context.arc(player.position.x + 5, player.position.y, 7, -1.1, 1.1);
      context.stroke();
    }
    for (let particleIndex = 0; particleIndex < 3; particleIndex += 1) {
      const particleAngle = game.time * (element === "air" ? 1.7 : 1.05) + particleIndex * (Math.PI * 2 / 3);
      const particleRadius = player.radius * (1.22 + 0.08 * Math.sin(game.time * 3 + particleIndex));
      context.globalAlpha = 0.42 + pulse * 0.28;
      context.beginPath();
      context.arc(player.position.x + Math.cos(particleAngle) * particleRadius, player.position.y + Math.sin(particleAngle) * particleRadius, Math.max(2.5, player.radius * 0.1), 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
    context.fillStyle = "#ffffff";
    context.font = "bold 18px Arial";
    context.fillText(elementGlyphForHero(player.heroId), player.position.x, player.position.y + 1);
    context.font = "16px Arial";
    context.strokeStyle = "#080b16";
    context.lineWidth = 4;
    context.strokeText(player.name, player.position.x, player.position.y - player.radius - 16);
    context.fillStyle = "#ffffff";
    context.fillText(player.name, player.position.x, player.position.y - player.radius - 16);
    context.fillStyle = "rgba(22, 28, 43, .9)";
    canvasRoundedRect(context, player.position.x - 28, player.position.y + player.radius + 8, 56, 6, 3);
    context.fill();
    context.fillStyle = player.hp > player.maxHp * 0.35 ? "#4de1a7" : "#ff5277";
    canvasRoundedRect(context, player.position.x - 28, player.position.y + player.radius + 8, 56 * Math.max(0, Math.min(1, player.hp / player.maxHp)), 6, 3);
    context.fill();
  }

  if (preview) {
    for (const segment of preview.path) {
      context.strokeStyle = segment.certainty === "certain" ? "#ffffff" : segment.certainty === "predicted" ? "#ffd166" : "#ff6b9d";
      context.globalAlpha = 0.8;
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(segment.from.x, segment.from.y);
      context.lineTo(segment.to.x, segment.to.y);
      context.stroke();
    }
    context.globalAlpha = 1;
    context.strokeStyle = "#ffffff";
    context.lineWidth = 2;
    context.beginPath();
    context.arc(preview.impact.x, preview.impact.y, Math.max(12, preview.radius), 0, Math.PI * 2);
    context.stroke();
  }
  context.restore();
}

function drawWorld(root: Container, game: GameState, preview: SkillPreview | null): void {
  root.removeChildren().forEach((child) => child.destroy({ children: true }));
  const pulse = 0.5 + Math.sin(game.time * 4) * 0.5;
  const background = new Graphics();
  background.beginFill(0x070a13);
  background.drawRect(0, 0, game.arena.width, game.arena.height);
  background.endFill();
  background.beginFill(0x0c1426, 1);
  background.drawRect(game.arena.safeMin.x, game.arena.safeMin.y, game.arena.safeMax.x - game.arena.safeMin.x, game.arena.safeMax.y - game.arena.safeMin.y);
  background.endFill();
  const floor = new Graphics();
  floor.beginFill(0x8a684e, 0.1);
  for (let x = 40; x < game.arena.width; x += 160) {
    for (let y = 40; y < game.arena.height; y += 160) {
      floor.drawRect(x, y, 76, 76);
      floor.lineStyle(2, 0xd2b17e, 0.11);
      floor.moveTo(x + 8, y + 10);
      floor.lineTo(x + 68, y + 10);
      floor.moveTo(x + 12, y + 66);
      floor.lineTo(x + 62, y + 66);
    }
  }
  for (const crystal of [{ x: 165, y: 125 }, { x: 1435, y: 675 }, { x: 1435, y: 125 }, { x: 165, y: 675 }]) {
    floor.beginFill(0x35baf6, 0.2);
    floor.drawPolygon([crystal.x, crystal.y - 22, crystal.x + 14, crystal.y + 7, crystal.x, crystal.y + 24, crystal.x - 14, crystal.y + 7]);
    floor.endFill();
  }
  root.addChild(floor);
  background.beginFill(0x172541, 0.18);
  background.drawCircle(game.arena.center.x, game.arena.center.y, 320 + pulse * 18);
  background.endFill();
  background.beginFill(0x2a1d43, 0.1);
  background.drawCircle(game.arena.center.x, game.arena.center.y, 170 + pulse * 9);
  background.endFill();
  background.lineStyle(3, 0xe94d72, 0.58);
  background.drawRect(game.arena.safeMin.x, game.arena.safeMin.y, game.arena.safeMax.x - game.arena.safeMin.x, game.arena.safeMax.y - game.arena.safeMin.y);
  background.lineStyle(1, 0xf4d35e, 0.23);
  background.drawRect(game.arena.safeMin.x + 12, game.arena.safeMin.y + 12, game.arena.safeMax.x - game.arena.safeMin.x - 24, game.arena.safeMax.y - game.arena.safeMin.y - 24);
  root.addChild(background);

  const grid = new Graphics();
  grid.lineStyle(1, 0x25334e, 0.26);
  for (let x = 80; x < game.arena.width; x += 80) {
    grid.moveTo(x, 0);
    grid.lineTo(x, game.arena.height);
  }
  for (let y = 80; y < game.arena.height; y += 80) {
    grid.moveTo(0, y);
    grid.lineTo(game.arena.width, y);
  }
  for (let x = 80; x < game.arena.width; x += 160) {
    for (let y = 80; y < game.arena.height; y += 160) {
      grid.beginFill(0x6d84b6, 0.035);
      grid.drawRect(x, y, 80, 80);
      grid.endFill();
    }
  }
  root.addChild(grid);

  const compass = new Graphics();
  compass.lineStyle(2, 0xf4d35e, 0.35);
  compass.drawCircle(game.arena.center.x, game.arena.center.y, 96);
  compass.lineStyle(1, 0xf4d35e, 0.27);
  compass.drawCircle(game.arena.center.x, game.arena.center.y, 70);
  compass.moveTo(game.arena.center.x - 115, game.arena.center.y);
  compass.lineTo(game.arena.center.x + 115, game.arena.center.y);
  compass.moveTo(game.arena.center.x, game.arena.center.y - 115);
  compass.lineTo(game.arena.center.x, game.arena.center.y + 115);
  compass.beginFill(0xf4d35e, 0.85);
  compass.drawCircle(game.arena.center.x, game.arena.center.y, 4);
  compass.endFill();
  root.addChild(compass);

  const eventGraphic = new Graphics();
  if (game.environmental.phase === "warning") {
    eventGraphic.lineStyle(8, 0xffd166, 0.4);
    eventGraphic.drawCircle(game.arena.center.x, game.arena.center.y, game.environmental.affectedRadius);
    eventGraphic.lineStyle(2, 0xfff4c1, 0.8);
    eventGraphic.drawCircle(game.arena.center.x, game.arena.center.y, game.environmental.affectedRadius - 20);
    eventGraphic.lineStyle(2, 0xffd166, 0.35 + pulse * 0.35);
    eventGraphic.drawCircle(game.arena.center.x, game.arena.center.y, game.environmental.affectedRadius + 18 + pulse * 8);
  } else if (game.environmental.phase === "active") {
    eventGraphic.beginFill(0xa88bff, 0.08);
    eventGraphic.drawCircle(game.arena.center.x, game.arena.center.y, game.environmental.affectedRadius);
    eventGraphic.endFill();
    eventGraphic.lineStyle(6, 0xb18cff, 0.38);
    eventGraphic.moveTo(game.arena.center.x - game.environmental.direction.x * 340, game.arena.center.y - game.environmental.direction.y * 340);
    eventGraphic.lineTo(game.arena.center.x + game.environmental.direction.x * 340, game.arena.center.y + game.environmental.direction.y * 340);
    for (let index = -2; index <= 2; index += 1) {
      const offset = index * 42;
      eventGraphic.lineStyle(2, 0xd7cbff, 0.22);
      eventGraphic.moveTo(game.arena.center.x - game.environmental.direction.x * 340 + offset, game.arena.center.y - game.environmental.direction.y * 340);
      eventGraphic.lineTo(game.arena.center.x + game.environmental.direction.x * 340 + offset, game.arena.center.y + game.environmental.direction.y * 340);
    }
  }
  root.addChild(eventGraphic);

  const geometry = new Graphics();
  for (const wall of game.arena.walls) {
    geometry.beginFill(0x02040a, 0.42);
    geometry.drawRoundedRect(wall.min.x + 9, wall.min.y + 11, wall.max.x - wall.min.x, wall.max.y - wall.min.y, 10);
    geometry.endFill();
    geometry.beginFill(0x2b3c5f, 1);
    geometry.drawRect(wall.min.x, wall.min.y, wall.max.x - wall.min.x, wall.max.y - wall.min.y);
    geometry.endFill();
    geometry.lineStyle(2, 0x5e79a8, 0.75);
    geometry.drawRect(wall.min.x, wall.min.y, wall.max.x - wall.min.x, wall.max.y - wall.min.y);
    geometry.lineStyle(1, 0xa7b8df, 0.2);
    geometry.moveTo(wall.min.x + 12, wall.min.y + 9);
    geometry.lineTo(wall.max.x - 12, wall.min.y + 9);
  }
  for (const object of game.arena.objects) {
    const objectColor = colorForObject(object.color, 0x53688d);
    geometry.beginFill(0x02040a, 0.36);
    geometry.drawRoundedRect(object.min.x + 8, object.min.y + 10, object.max.x - object.min.x, object.max.y - object.min.y, 13);
    geometry.endFill();
    geometry.beginFill(objectColor, 1);
    geometry.drawRoundedRect(object.min.x, object.min.y, object.max.x - object.min.x, object.max.y - object.min.y, 12);
    geometry.endFill();
    geometry.lineStyle(2, 0xf4e2c0, 0.32);
    geometry.drawRoundedRect(object.min.x, object.min.y, object.max.x - object.min.x, object.max.y - object.min.y, 12);
    if (object.kind === "crate") {
      geometry.lineStyle(2, 0x422a2a, 0.46);
      geometry.moveTo(object.min.x + 9, object.min.y + 9);
      geometry.lineTo(object.max.x - 9, object.max.y - 9);
      geometry.moveTo(object.max.x - 9, object.min.y + 9);
      geometry.lineTo(object.min.x + 9, object.max.y - 9);
      geometry.beginFill(0xf4e2c0, 0.6);
      geometry.drawCircle(object.min.x + 13, object.min.y + 13, 2);
      geometry.drawCircle(object.max.x - 13, object.max.y - 13, 2);
      geometry.endFill();
    } else {
      geometry.beginFill(0x18213b, 0.82);
      geometry.moveTo(object.min.x - 8, object.min.y);
      geometry.lineTo((object.min.x + object.max.x) / 2, object.min.y - 28);
      geometry.lineTo(object.max.x + 8, object.min.y);
      geometry.closePath();
      geometry.endFill();
      geometry.beginFill(0x0c1223, 0.95);
      geometry.drawRect((object.min.x + object.max.x) / 2 - 12, object.max.y - 31, 24, 31);
      geometry.endFill();
    }
  }
  for (const wall of game.walls) {
    geometry.beginFill(0x02040a, 0.34);
    geometry.drawRoundedRect(wall.min.x + 7, wall.min.y + 9, wall.max.x - wall.min.x, wall.max.y - wall.min.y, 9);
    geometry.endFill();
    geometry.beginFill(colorForObject(wall.color, 0xb18cff), 0.92);
    geometry.drawRoundedRect(wall.min.x, wall.min.y, wall.max.x - wall.min.x, wall.max.y - wall.min.y, 8);
    geometry.endFill();
    geometry.lineStyle(2, 0xffffff, 0.35);
    geometry.drawRoundedRect(wall.min.x, wall.min.y, wall.max.x - wall.min.x, wall.max.y - wall.min.y, 8);
    geometry.lineStyle(1, 0xffffff, 0.26);
    geometry.moveTo(wall.min.x + 9, wall.min.y + 8);
    geometry.lineTo(wall.max.x - 9, wall.min.y + 8);
  }
  root.addChild(geometry);

  for (const field of game.fields) {
    const fieldGraphic = new Graphics();
    fieldGraphic.beginFill(0x02040a, 0.24);
    fieldGraphic.drawCircle(field.position.x + 7, field.position.y + 9, field.radius);
    fieldGraphic.endFill();
    fieldGraphic.beginFill(elementColor(field.element), 0.16);
    fieldGraphic.drawCircle(field.position.x, field.position.y, field.radius);
    fieldGraphic.endFill();
    fieldGraphic.lineStyle(2, elementColor(field.element), 0.72);
    fieldGraphic.drawCircle(field.position.x, field.position.y, field.radius);
    fieldGraphic.lineStyle(1, elementColor(field.element), 0.32);
    fieldGraphic.drawCircle(field.position.x, field.position.y, field.radius * 0.72);
    fieldGraphic.moveTo(field.position.x - field.radius, field.position.y);
    fieldGraphic.lineTo(field.position.x + field.radius, field.position.y);
    root.addChild(fieldGraphic);
  }

  for (const projectile of game.projectiles) {
    const projectileGraphic = new Graphics();
    const projectileDirection = normalizeVector(projectile.velocity);
    projectileGraphic.lineStyle(Math.max(3, projectile.radius * 0.55), elementColor(projectile.element), 0.22);
    projectileGraphic.moveTo(projectile.position.x - projectileDirection.x * 38, projectile.position.y - projectileDirection.y * 38);
    projectileGraphic.lineTo(projectile.position.x, projectile.position.y);
    projectileGraphic.beginFill(elementColor(projectile.element), 0.95);
    projectileGraphic.drawCircle(projectile.position.x, projectile.position.y, projectile.radius);
    projectileGraphic.endFill();
    projectileGraphic.lineStyle(3, 0xffffff, 0.7);
    projectileGraphic.drawCircle(projectile.position.x, projectile.position.y, projectile.radius + 3);
    projectileGraphic.beginFill(0xffffff, 0.75);
    projectileGraphic.drawCircle(projectile.position.x - projectileDirection.x * projectile.radius * 0.35, projectile.position.y - projectileDirection.y * projectile.radius * 0.35, Math.max(2, projectile.radius * 0.22));
    projectileGraphic.endFill();
    root.addChild(projectileGraphic);
  }

  drawCombatImpacts(root, game);

  for (const player of Object.values(game.players)) {
    if (!player.alive) continue;
    const heroGraphic = new Graphics();
    const heroColor = colorForHero(player.heroId);
    heroGraphic.beginFill(0x02040a, 0.42);
    heroGraphic.drawEllipse(player.position.x + 7, player.position.y + 10, player.radius * 1.08, player.radius * 0.72);
    heroGraphic.endFill();
    const heroAim = normalizeVector(player.input.aim);
    const side = { x: -heroAim.y, y: heroAim.x };
    const cloakColor = shadeColor(heroColor, -36);
    heroGraphic.beginFill(cloakColor, 0.96);
    heroGraphic.drawPolygon([
      player.position.x - side.x * player.radius * 0.82 - heroAim.x * 5,
      player.position.y - side.y * player.radius * 0.82 - heroAim.y * 5,
      player.position.x + side.x * player.radius * 0.82 - heroAim.x * 5,
      player.position.y + side.y * player.radius * 0.82 - heroAim.y * 5,
      player.position.x + heroAim.x * player.radius * 0.8,
      player.position.y + heroAim.y * player.radius * 0.8,
    ]);
    heroGraphic.endFill();
    heroGraphic.beginFill(0xf1d0aa, 1);
    heroGraphic.drawCircle(player.position.x - heroAim.x * player.radius * 0.32, player.position.y - heroAim.y * player.radius * 0.32 - player.radius * 0.56, player.radius * 0.38);
    heroGraphic.endFill();
    heroGraphic.beginFill(shadeColor(heroColor, 24), 0.95);
    heroGraphic.drawCircle(player.position.x - heroAim.x * player.radius * 0.34, player.position.y - heroAim.y * player.radius * 0.34, player.radius * 0.78);
    heroGraphic.endFill();
    heroGraphic.lineStyle(3, 0xf4e2c0, 0.88);
    heroGraphic.moveTo(player.position.x + side.x * player.radius * 0.15, player.position.y + side.y * player.radius * 0.15);
    heroGraphic.lineTo(player.position.x + heroAim.x * player.radius * 1.38 + side.x * player.radius * 0.15, player.position.y + heroAim.y * player.radius * 1.38 + side.y * player.radius * 0.15);
    heroGraphic.beginFill(elementColor(heroesById[player.heroId]?.element ?? "fire"), 0.9);
    heroGraphic.drawCircle(player.position.x + heroAim.x * player.radius * 0.72, player.position.y + heroAim.y * player.radius * 0.72, Math.max(4, player.radius * 0.18));
    heroGraphic.endFill();
    if (player.id === "player") {
      heroGraphic.lineStyle(2, 0xffffff, 0.18 + pulse * 0.17);
      heroGraphic.drawCircle(player.position.x, player.position.y, player.radius + 16 + pulse * 4);
    }
    heroGraphic.beginFill(heroColor, 1);
    heroGraphic.drawCircle(player.position.x, player.position.y, player.radius);
    heroGraphic.endFill();
    heroGraphic.lineStyle(player.id === "player" ? 5 : 3, player.id === "player" ? 0xffffff : 0x101526, 0.95);
    heroGraphic.drawCircle(player.position.x, player.position.y, player.radius);
    heroGraphic.beginFill(0xffffff, 0.21);
    heroGraphic.drawCircle(player.position.x - player.radius * 0.28, player.position.y - player.radius * 0.31, player.radius * 0.36);
    heroGraphic.endFill();
    const element = heroesById[player.heroId]?.element ?? "fire";
    const emblemColor = elementColor(element);
    heroGraphic.lineStyle(2.5, emblemColor, 0.95);
    if (element === "fire") {
      heroGraphic.beginFill(emblemColor, 0.95);
      heroGraphic.drawPolygon([player.position.x, player.position.y - 11, player.position.x + 7, player.position.y + 3, player.position.x, player.position.y + 10, player.position.x - 7, player.position.y + 3]);
      heroGraphic.endFill();
    } else if (element === "water") {
      heroGraphic.drawCircle(player.position.x, player.position.y + 2, 8);
      heroGraphic.beginFill(emblemColor, 0.95);
      heroGraphic.drawPolygon([player.position.x, player.position.y - 12, player.position.x + 5, player.position.y - 2, player.position.x - 5, player.position.y - 2]);
      heroGraphic.endFill();
    } else if (element === "earth") {
      heroGraphic.beginFill(emblemColor, 0.95);
      heroGraphic.drawPolygon([player.position.x, player.position.y - 11, player.position.x + 10, player.position.y, player.position.x, player.position.y + 11, player.position.x - 10, player.position.y]);
      heroGraphic.endFill();
    } else {
      heroGraphic.arc(player.position.x - 2, player.position.y, 10, -1.1, 1.1);
      heroGraphic.arc(player.position.x + 5, player.position.y, 7, -1.1, 1.1);
    }
    for (let particleIndex = 0; particleIndex < 3; particleIndex += 1) {
      const particleAngle = game.time * (element === "air" ? 1.7 : 1.05) + particleIndex * (Math.PI * 2 / 3);
      const particleRadius = player.radius * (1.22 + 0.08 * Math.sin(game.time * 3 + particleIndex));
      heroGraphic.beginFill(emblemColor, 0.42 + pulse * 0.28);
      heroGraphic.drawCircle(player.position.x + Math.cos(particleAngle) * particleRadius, player.position.y + Math.sin(particleAngle) * particleRadius, Math.max(2.5, player.radius * 0.1));
      heroGraphic.endFill();
    }
    const aim = player.input.aim;
    heroGraphic.lineStyle(4, 0xffffff, 0.8);
    heroGraphic.moveTo(player.position.x, player.position.y);
    heroGraphic.lineTo(player.position.x + aim.x * (player.radius + 14), player.position.y + aim.y * (player.radius + 14));
    if (player.id === "player") {
      const reticle = { x: player.position.x + aim.x * 132, y: player.position.y + aim.y * 132 };
      heroGraphic.lineStyle(1.5, 0xffffff, 0.4);
      heroGraphic.moveTo(player.position.x + aim.x * 26, player.position.y + aim.y * 26);
      heroGraphic.lineTo(reticle.x, reticle.y);
      heroGraphic.lineStyle(2, 0xffffff, 0.9);
      heroGraphic.drawCircle(reticle.x, reticle.y, 8 + pulse * 2);
      heroGraphic.moveTo(reticle.x - 13, reticle.y);
      heroGraphic.lineTo(reticle.x - 4, reticle.y);
      heroGraphic.moveTo(reticle.x + 4, reticle.y);
      heroGraphic.lineTo(reticle.x + 13, reticle.y);
      heroGraphic.moveTo(reticle.x, reticle.y - 13);
      heroGraphic.lineTo(reticle.x, reticle.y - 4);
      heroGraphic.moveTo(reticle.x, reticle.y + 4);
      heroGraphic.lineTo(reticle.x, reticle.y + 13);
    }
    const burning = player.statuses.some((entry) => entry.id === "burning");
    const slowed = player.statuses.some((entry) => entry.id === "slowed");
    if (burning || slowed) {
      heroGraphic.lineStyle(4, burning ? 0xffa63d : 0x8fe7ff, 0.95);
      heroGraphic.drawCircle(player.position.x, player.position.y, player.radius + 9);
    }
    const heroGlyph = new Text(elementGlyphForHero(player.heroId), new TextStyle({ fontFamily: "Arial", fontSize: 18, fill: 0xffffff, fontWeight: "bold", align: "center" }));
    heroGlyph.anchor.set(0.5);
    heroGlyph.position.set(player.position.x, player.position.y + 1);
    root.addChild(heroGraphic);
    root.addChild(heroGlyph);
    const label = new Text(player.name, new TextStyle({ fontFamily: "Arial", fontSize: 16, fill: 0xffffff, stroke: 0x080b16, strokeThickness: 4, align: "center" }));
    label.anchor.set(0.5);
    label.position.set(player.position.x, player.position.y - player.radius - 16);
    root.addChild(label);
    const hp = new Graphics();
    hp.beginFill(0x161c2b, 0.9);
    hp.drawRoundedRect(player.position.x - 28, player.position.y + player.radius + 8, 56, 6, 3);
    hp.endFill();
    hp.beginFill(player.hp > player.maxHp * 0.35 ? 0x4de1a7 : 0xff5277, 1);
    hp.drawRoundedRect(player.position.x - 28, player.position.y + player.radius + 8, 56 * Math.max(0, Math.min(1, player.hp / player.maxHp)), 6, 3);
    hp.endFill();
    root.addChild(hp);
  }

  drawCastBursts(root, game);
  if (preview) drawPreview(root, preview);
}

export function PixiArena(props: PixiArenaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<Application | null>(null);
  const worldRef = useRef<Container | null>(null);
  const canvasContextRef = useRef<CanvasRenderingContext2D | null>(null);
  const fallbackRef = useRef(false);
  const propsRef = useRef(props);
  propsRef.current = props;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    let app: Application | null = null;
    try {
      app = new Application({
        view: canvas,
        antialias: true,
        backgroundAlpha: 0,
        autoDensity: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
      });
      const world = new Container();
      app.stage.addChild(world);
      appRef.current = app;
      worldRef.current = world;
      fallbackRef.current = false;
    } catch {
      fallbackRef.current = true;
      canvasContextRef.current = canvas.getContext("2d");
    }
    const resize = () => {
      const width = canvas.clientWidth || 800;
      const height = canvas.clientHeight || 450;
      if (app && !fallbackRef.current) {
        try {
          app.renderer.resize(width, height);
        } catch {
          fallbackRef.current = true;
          canvasContextRef.current = canvas.getContext("2d");
        }
      }
      if (fallbackRef.current && canvasContextRef.current) {
        drawCanvasWorld(canvasContextRef.current, canvas, propsRef.current.game, propsRef.current.preview, propsRef.current.zoom);
      }
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => {
      observer.disconnect();
      if (app) {
        try {
          app.destroy(false, { children: true, texture: false, baseTexture: false });
        } catch {
          // A partially initialized WebGL renderer may not have a destroyable context.
        }
      }
      appRef.current = null;
      worldRef.current = null;
      canvasContextRef.current = null;
    };
  }, []);

  useEffect(() => {
    const app = appRef.current;
    const world = worldRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const width = canvas.clientWidth || 800;
    const height = canvas.clientHeight || 450;
    if (app && world && !fallbackRef.current) {
      try {
        app.renderer.resize(width, height);
        const worldScale = Math.min(width / props.game.arena.width, height / props.game.arena.height) * props.zoom;
        world.scale.set(worldScale);
        world.position.set(
          width / 2 - (props.game.arena.width * worldScale) / 2,
          height / 2 - (props.game.arena.height * worldScale) / 2,
        );
        drawWorld(world, props.game, props.preview);
        return;
      } catch {
        fallbackRef.current = true;
        canvasContextRef.current = canvas.getContext("2d");
        try {
          app.destroy(false, { children: true, texture: false, baseTexture: false });
        } catch {
          // Fall through to the native canvas renderer.
        }
        appRef.current = null;
        worldRef.current = null;
      }
    }
    if (canvasContextRef.current) {
      drawCanvasWorld(canvasContextRef.current, canvas, props.game, props.preview, props.zoom);
    }
  }, [props.game, props.preview, props.zoom]);

  return (
    <canvas
      ref={canvasRef}
      className="arena-canvas"
      data-testid="arena-canvas"
      onPointerMove={props.onPointerMove}
      onPointerDown={props.onPointerDown}
      onPointerUp={props.onPointerUp}
      onPointerLeave={props.onPointerLeave}
      onWheel={props.onWheel}
      onTouchStart={props.onTouchStart}
      onTouchMove={props.onTouchMove}
      onTouchEnd={props.onTouchEnd}
    />
  );
}
