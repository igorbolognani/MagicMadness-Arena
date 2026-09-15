import * as THREE from "three";
import type { GameState } from "@mma/game-core";

type AnimatedProp = {
  object: THREE.Object3D;
  baseY: number;
  phase: number;
  speed: number;
};

export type ArenaWorld = {
  root: THREE.Group;
  animate: (elapsed: number, game: GameState) => void;
};

function standard(color: number, roughness = 0.72, metalness = 0.05): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function glow(color: number, opacity = 1): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 1.25,
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity >= 1,
    roughness: 0.3,
  });
}

function unlit(color: number, opacity = 1): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1, side: THREE.DoubleSide });
}

function mesh(geometry: THREE.BufferGeometry, material: THREE.Material): THREE.Mesh {
  const result = new THREE.Mesh(geometry, material);
  result.castShadow = true;
  result.receiveShadow = true;
  return result;
}

function seeded(index: number): number {
  const value = Math.sin(index * 91.733 + 17.17) * 43758.5453;
  return value - Math.floor(value);
}

function createStoneTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 576;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const gradient = ctx.createLinearGradient(0, 0, 1024, 576);
  gradient.addColorStop(0, "#526b72");
  gradient.addColorStop(0.52, "#425c62");
  gradient.addColorStop(1, "#314d55");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1024, 576);

  const tileW = 82;
  const tileH = 58;
  for (let row = -1; row < 12; row += 1) {
    for (let column = -1; column < 14; column += 1) {
      const index = row * 17 + column + 40;
      const x = column * tileW + (row % 2) * (tileW / 2);
      const y = row * tileH;
      const tint = Math.floor(seeded(index) * 22);
      ctx.fillStyle = `rgb(${65 + tint}, ${88 + tint}, ${92 + tint})`;
      ctx.strokeStyle = "rgba(15, 31, 35, .48)";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.roundRect(x + 3, y + 3, tileW - 6, tileH - 6, 9);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "rgba(166, 201, 183, .08)";
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 11, y + 11, tileW - 22, tileH - 22);
    }
  }

  for (let index = 0; index < 42; index += 1) {
    const x = seeded(index * 4 + 1) * 1024;
    const y = seeded(index * 4 + 2) * 576;
    ctx.strokeStyle = index % 3 === 0 ? "rgba(99, 160, 122, .25)" : "rgba(18, 31, 38, .3)";
    ctx.lineWidth = 2 + seeded(index) * 5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 20 + seeded(index + 7) * 45, y - 9 + seeded(index + 9) * 24);
    ctx.lineTo(x + 36 + seeded(index + 13) * 55, y + 10 + seeded(index + 3) * 28);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function createRune(radius: number, color: number, opacity: number): THREE.Mesh {
  const rune = mesh(new THREE.RingGeometry(radius - 4, radius, 64), unlit(color, opacity));
  rune.rotation.x = -Math.PI / 2;
  rune.position.y = 13;
  rune.castShadow = false;
  return rune;
}

function addRuinWall(root: THREE.Group, width: number, depth: number, x: number, z: number): void {
  const stone = standard(0x344b52, 0.88);
  const capStone = standard(0x6e8580, 0.78);
  const wall = mesh(new THREE.BoxGeometry(width, 38, depth), stone);
  wall.position.set(x, 29, z);
  root.add(wall);
  const cap = mesh(new THREE.BoxGeometry(width + 10, 8, depth + 10), capStone);
  cap.position.set(x, 51, z);
  root.add(cap);
  const count = Math.max(2, Math.floor(width / 72));
  for (let index = 0; index <= count; index += 1) {
    const pillar = mesh(new THREE.CylinderGeometry(12, 15, 62, 7), standard(0x405a60, 0.9));
    pillar.position.set(x - width / 2 + (width / count) * index, 35, z);
    pillar.rotation.y = seeded(index + Math.floor(x)) * 0.25;
    root.add(pillar);
  }
}

function addShrine(root: THREE.Group, x: number, z: number, width: number, depth: number, color: number): void {
  const base = mesh(new THREE.BoxGeometry(width, 18, depth), standard(0x3d5055, 0.9));
  base.position.set(x, 18, z);
  root.add(base);
  const lower = mesh(new THREE.BoxGeometry(width * 0.76, 48, depth * 0.76), standard(0x485f64, 0.82));
  lower.position.set(x, 47, z);
  root.add(lower);
  const roof = mesh(new THREE.ConeGeometry(Math.max(width, depth) * 0.58, 42, 6), standard(0x182c36, 0.72, 0.16));
  roof.position.set(x, 91, z);
  roof.rotation.y = Math.PI / 6;
  roof.scale.set(width / Math.max(width, depth), 1, depth / Math.max(width, depth));
  root.add(roof);
  const doorway = mesh(new THREE.PlaneGeometry(width * 0.22, 34), glow(color, 0.76));
  doorway.position.set(x, 47, z + depth * 0.385 + 1);
  root.add(doorway);
  for (const side of [-1, 1]) {
    const lantern = mesh(new THREE.OctahedronGeometry(8, 0), glow(color));
    lantern.position.set(x + side * width * 0.3, 65, z + depth * 0.42);
    root.add(lantern);
  }
}

function addCrystalCluster(root: THREE.Group, x: number, z: number, color: number, animated: AnimatedProp[], phase: number): void {
  const cluster = new THREE.Group();
  cluster.position.set(x, 16, z);
  for (let index = 0; index < 4; index += 1) {
    const crystal = mesh(new THREE.OctahedronGeometry(12 + index * 2, 0), glow(color, 0.86));
    crystal.scale.y = 1.5 + index * 0.2;
    crystal.position.set((index - 1.5) * 13, index % 2 ? 10 : 2, (index % 2 ? -1 : 1) * 8);
    crystal.rotation.z = (index - 1.5) * 0.13;
    cluster.add(crystal);
  }
  const light = new THREE.PointLight(color, 28, 180, 2);
  light.position.y = 32;
  cluster.add(light);
  root.add(cluster);
  animated.push({ object: cluster, baseY: cluster.position.y, phase, speed: 0.0014 });
}

function addEdgeRocks(root: THREE.Group, width: number, height: number): void {
  const rockMaterial = standard(0x20393f, 0.95);
  for (let index = 0; index < 48; index += 1) {
    const t = index / 48;
    const horizontal = index < 24;
    const side = index % 2 === 0 ? -1 : 1;
    const x = horizontal ? -width / 2 + t * 2 * width : side * (width / 2 - 8);
    const z = horizontal ? side * (height / 2 - 8) : -height / 2 + (t - 0.5) * 2 * height;
    const size = 20 + seeded(index) * 28;
    const rock = mesh(new THREE.DodecahedronGeometry(size, 0), rockMaterial);
    rock.position.set(x, 4 + size * 0.25, z);
    rock.scale.set(1.15, 0.55 + seeded(index + 2) * 0.45, 0.82);
    rock.rotation.set(seeded(index + 4), seeded(index + 7) * Math.PI, seeded(index + 9) * 0.4);
    root.add(rock);
  }
}

export function buildWindfallArena(scene: THREE.Scene, game: GameState): ArenaWorld {
  const centerX = game.arena.center.x;
  const centerY = game.arena.center.y;
  const root = new THREE.Group();
  const animated: AnimatedProp[] = [];
  const objectNodes = new Map<string, THREE.Group>();
  scene.add(root);

  const abyss = mesh(new THREE.PlaneGeometry(game.arena.width + 720, game.arena.height + 720), new THREE.MeshStandardMaterial({color:0x8f210b,emissive:0xff4809,emissiveIntensity:.9,roughness:.6}));
  abyss.rotation.x = -Math.PI / 2;
  abyss.position.y = -42;
  root.add(abyss);

  const mist = mesh(new THREE.PlaneGeometry(game.arena.width + 520, game.arena.height + 520), unlit(0xff7429, 0.18));
  mist.rotation.x = -Math.PI / 2;
  mist.position.y = -30;
  root.add(mist);

  const foundation = mesh(new THREE.BoxGeometry(game.arena.width - 44, 50, game.arena.height - 44), standard(0x1b343b, 0.98));
  foundation.position.y = -16;
  root.add(foundation);

  const floorMaterial = new THREE.MeshStandardMaterial({ map: createStoneTexture(), roughness: 0.9, metalness: 0.02, color: 0xffffff });
  const floor = mesh(new THREE.PlaneGeometry(game.arena.width - 62, game.arena.height - 62), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 10;
  root.add(floor);

  addEdgeRocks(root, game.arena.width - 42, game.arena.height - 42);

  const hazard = glow(0xff661a, 0.78);
  for (const side of [-1, 1]) {
    const vertical = mesh(new THREE.PlaneGeometry(30, game.arena.height - 90), hazard.clone());
    vertical.rotation.x = -Math.PI / 2;
    vertical.position.set(side * (game.arena.width / 2 - 49), 12, 0);
    root.add(vertical);
    const horizontal = mesh(new THREE.PlaneGeometry(game.arena.width - 90, 30), hazard.clone());
    horizontal.rotation.x = -Math.PI / 2;
    horizontal.position.set(0, 12, side * (game.arena.height / 2 - 49));
    root.add(horizontal);
  }

  const dais = mesh(new THREE.CylinderGeometry(158, 174, 18, 48), standard(0x38545a, 0.82));
  dais.position.y = 18;
  root.add(dais);
  const runeA = createRune(126, 0x8fe5da, 0.64);
  const runeB = createRune(88, 0xe7c36b, 0.48);
  root.add(runeA, runeB);
  animated.push({ object: runeA, baseY: runeA.position.y, phase: 0, speed: 0.00018 });
  animated.push({ object: runeB, baseY: runeB.position.y, phase: Math.PI, speed: -0.00024 });

  for (const wall of game.arena.walls) {
    const width = wall.max.x - wall.min.x;
    const depth = wall.max.y - wall.min.y;
    addRuinWall(root, width, depth, (wall.min.x + wall.max.x) / 2 - centerX, (wall.min.y + wall.max.y) / 2 - centerY);
  }

  for (const object of game.arena.objects) {
    const objectNode = new THREE.Group();
    objectNode.userData.arenaObjectId = object.id;
    root.add(objectNode);
    objectNodes.set(object.id, objectNode);
    const width = object.max.x - object.min.x;
    const depth = object.max.y - object.min.y;
    const x = (object.min.x + object.max.x) / 2 - centerX;
    const z = (object.min.y + object.max.y) / 2 - centerY;
    if (object.kind === "house") {
      const shrineColor = object.id.includes("fire") ? 0xff6b35 : object.id.includes("water") ? 0x35baf6 : object.id.includes("earth") ? 0xc99a5b : object.id.includes("air") ? 0xb18cff : 0x8fe5da;
      addShrine(objectNode, x, z, width, depth, shrineColor);
    } else {
      const crate = mesh(new THREE.BoxGeometry(width, 42, depth), standard(0x75533c, 0.92));
      crate.position.set(x, 31, z);
      objectNode.add(crate);
      for (const rotation of [0, Math.PI / 2]) {
        const band = mesh(new THREE.BoxGeometry(rotation ? 8 : width + 3, 5, rotation ? depth + 3 : 8), standard(0xe0aa5c, 0.5, 0.35));
        band.position.set(x, 52, z);
        objectNode.add(band);
      }
    }
  }

  const crystalX = game.arena.width * 0.41;
  const crystalZ = game.arena.height * 0.36;
  addCrystalCluster(root, -crystalX, -crystalZ, 0xff704d, animated, 0.2);
  addCrystalCluster(root, crystalX, -crystalZ, 0x59d8ff, animated, 1.7);
  addCrystalCluster(root, -crystalX, crystalZ, 0xf2cb62, animated, 3.1);
  addCrystalCluster(root, crystalX, crystalZ, 0xc998ff, animated, 4.4);

  return {
    root,
    animate(elapsed, currentGame) {
      const eventPower = currentGame.environmental.phase === "active" ? 1 : currentGame.environmental.phase === "warning" ? 0.55 : 0.18;
      mist.rotation.z = elapsed * 0.000018;
      (mist.material as THREE.MeshBasicMaterial).opacity = 0.07 + eventPower * 0.08;
      objectNodes.forEach((node, objectId) => {
        const current = currentGame.arena.objects.find((object) => object.id === objectId);
        node.visible = Boolean(current && (!current.destructible || current.hp > 0));
      });
      animated.forEach((entry, index) => {
        entry.object.rotation.y = elapsed * entry.speed;
        entry.object.position.y = entry.baseY + Math.sin(elapsed * 0.0012 + entry.phase) * (index < 2 ? 0.8 : 4);
      });
    },
  };
}
