import { useEffect, useRef } from "react";
import { Application, Container, Graphics, Text, TextStyle } from "pixi.js";
import {
  elementColor,
  type GameState,
  type SkillPreview,
} from "@mma/game-core";
import { heroesById } from "@mma/content";

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
    path.drawRect(preview.impact.x - preview.geometry.width / 2, preview.impact.y - 18, preview.geometry.width, 36);
    path.endFill();
  }
  root.addChild(path);
}

function drawWorld(root: Container, game: GameState, preview: SkillPreview | null): void {
  root.removeChildren().forEach((child) => child.destroy({ children: true }));
  const background = new Graphics();
  background.beginFill(0x090d1a);
  background.drawRect(0, 0, game.arena.width, game.arena.height);
  background.endFill();
  background.beginFill(0x121d31);
  background.drawRect(game.arena.safeMin.x, game.arena.safeMin.y, game.arena.safeMax.x - game.arena.safeMin.x, game.arena.safeMax.y - game.arena.safeMin.y);
  background.endFill();
  background.lineStyle(3, 0xe94d72, 0.58);
  background.drawRect(game.arena.safeMin.x, game.arena.safeMin.y, game.arena.safeMax.x - game.arena.safeMin.x, game.arena.safeMax.y - game.arena.safeMin.y);
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
  root.addChild(grid);

  const eventGraphic = new Graphics();
  if (game.environmental.phase === "warning") {
    eventGraphic.lineStyle(8, 0xffd166, 0.4);
    eventGraphic.drawCircle(game.arena.center.x, game.arena.center.y, game.environmental.affectedRadius);
    eventGraphic.lineStyle(2, 0xfff4c1, 0.8);
    eventGraphic.drawCircle(game.arena.center.x, game.arena.center.y, game.environmental.affectedRadius - 20);
  } else if (game.environmental.phase === "active") {
    eventGraphic.beginFill(0xa88bff, 0.08);
    eventGraphic.drawCircle(game.arena.center.x, game.arena.center.y, game.environmental.affectedRadius);
    eventGraphic.endFill();
    eventGraphic.lineStyle(6, 0xb18cff, 0.38);
    eventGraphic.moveTo(game.arena.center.x - game.environmental.direction.x * 340, game.arena.center.y - game.environmental.direction.y * 340);
    eventGraphic.lineTo(game.arena.center.x + game.environmental.direction.x * 340, game.arena.center.y + game.environmental.direction.y * 340);
  }
  root.addChild(eventGraphic);

  const geometry = new Graphics();
  for (const wall of game.arena.walls) {
    geometry.beginFill(0x2b3c5f, 1);
    geometry.drawRect(wall.min.x, wall.min.y, wall.max.x - wall.min.x, wall.max.y - wall.min.y);
    geometry.endFill();
    geometry.lineStyle(2, 0x5e79a8, 0.75);
    geometry.drawRect(wall.min.x, wall.min.y, wall.max.x - wall.min.x, wall.max.y - wall.min.y);
  }
  for (const object of game.arena.objects) {
    geometry.beginFill(Number.parseInt(object.color.slice(1), 16), 1);
    geometry.drawRoundedRect(object.min.x, object.min.y, object.max.x - object.min.x, object.max.y - object.min.y, 12);
    geometry.endFill();
    geometry.lineStyle(2, 0xf4e2c0, 0.32);
    geometry.drawRoundedRect(object.min.x, object.min.y, object.max.x - object.min.x, object.max.y - object.min.y, 12);
  }
  for (const wall of game.walls) {
    geometry.beginFill(Number.parseInt(wall.color.slice(1), 16), 0.92);
    geometry.drawRoundedRect(wall.min.x, wall.min.y, wall.max.x - wall.min.x, wall.max.y - wall.min.y, 8);
    geometry.endFill();
    geometry.lineStyle(2, 0xffffff, 0.35);
    geometry.drawRoundedRect(wall.min.x, wall.min.y, wall.max.x - wall.min.x, wall.max.y - wall.min.y, 8);
  }
  root.addChild(geometry);

  for (const field of game.fields) {
    const fieldGraphic = new Graphics();
    fieldGraphic.beginFill(elementColor(field.element), 0.16);
    fieldGraphic.drawCircle(field.position.x, field.position.y, field.radius);
    fieldGraphic.endFill();
    fieldGraphic.lineStyle(2, elementColor(field.element), 0.72);
    fieldGraphic.drawCircle(field.position.x, field.position.y, field.radius);
    root.addChild(fieldGraphic);
  }

  for (const projectile of game.projectiles) {
    const projectileGraphic = new Graphics();
    projectileGraphic.beginFill(elementColor(projectile.element), 0.95);
    projectileGraphic.drawCircle(projectile.position.x, projectile.position.y, projectile.radius);
    projectileGraphic.endFill();
    projectileGraphic.lineStyle(3, 0xffffff, 0.7);
    projectileGraphic.drawCircle(projectile.position.x, projectile.position.y, projectile.radius + 3);
    root.addChild(projectileGraphic);
  }

  for (const player of Object.values(game.players)) {
    if (!player.alive) continue;
    const heroGraphic = new Graphics();
    const heroColor = colorForHero(player.heroId);
    heroGraphic.beginFill(heroColor, 1);
    heroGraphic.drawCircle(player.position.x, player.position.y, player.radius);
    heroGraphic.endFill();
    heroGraphic.lineStyle(player.id === "player" ? 5 : 3, player.id === "player" ? 0xffffff : 0x101526, 0.95);
    heroGraphic.drawCircle(player.position.x, player.position.y, player.radius);
    const aim = player.input.aim;
    heroGraphic.lineStyle(4, 0xffffff, 0.8);
    heroGraphic.moveTo(player.position.x, player.position.y);
    heroGraphic.lineTo(player.position.x + aim.x * (player.radius + 14), player.position.y + aim.y * (player.radius + 14));
    const burning = player.statuses.some((entry) => entry.id === "burning");
    const slowed = player.statuses.some((entry) => entry.id === "slowed");
    if (burning || slowed) {
      heroGraphic.lineStyle(4, burning ? 0xffa63d : 0x8fe7ff, 0.95);
      heroGraphic.drawCircle(player.position.x, player.position.y, player.radius + 9);
    }
    root.addChild(heroGraphic);
    const label = new Text(player.name, new TextStyle({ fontFamily: "Arial", fontSize: 16, fill: 0xffffff, stroke: 0x080b16, strokeThickness: 4, align: "center" }));
    label.anchor.set(0.5);
    label.position.set(player.position.x, player.position.y - player.radius - 16);
    root.addChild(label);
    const hp = new Graphics();
    hp.beginFill(0x161c2b, 0.9);
    hp.drawRoundedRect(player.position.x - 28, player.position.y + player.radius + 8, 56, 6, 3);
    hp.endFill();
    hp.beginFill(player.hp > player.maxHp * 0.35 ? 0x4de1a7 : 0xff5277, 1);
    hp.drawRoundedRect(player.position.x - 28, player.position.y + player.radius + 8, 56 * (player.hp / player.maxHp), 6, 3);
    hp.endFill();
    root.addChild(hp);
  }

  if (preview) drawPreview(root, preview);
}

export function PixiArena(props: PixiArenaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<Application | null>(null);
  const worldRef = useRef<Container | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const app = new Application({
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
    const resize = () => {
      const width = canvas.clientWidth || 800;
      const height = canvas.clientHeight || 450;
      app.renderer.resize(width, height);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => {
      observer.disconnect();
      app.destroy(true, { children: true, texture: false, baseTexture: false });
      appRef.current = null;
      worldRef.current = null;
    };
  }, []);

  useEffect(() => {
    const app = appRef.current;
    const world = worldRef.current;
    const canvas = canvasRef.current;
    if (!app || !world || !canvas) return;
    const width = canvas.clientWidth || 800;
    const height = canvas.clientHeight || 450;
    app.renderer.resize(width, height);
    const worldScale = Math.min(width / props.game.arena.width, height / props.game.arena.height) * props.zoom;
    world.scale.set(worldScale);
    world.position.set(
      width / 2 - (props.game.arena.width * worldScale) / 2,
      height / 2 - (props.game.arena.height * worldScale) / 2,
    );
    drawWorld(world, props.game, props.preview);
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
