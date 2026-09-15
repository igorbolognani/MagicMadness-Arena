import { useEffect, useRef, type PointerEvent as ReactPointerEvent, type TouchEvent as ReactTouchEvent, type WheelEvent as ReactWheelEvent } from "react";
import * as THREE from "three";
import { type GameState, type SkillPreview } from "@mma/game-core";
import type { Vec2 } from "@mma/physics";
import { heroesById, skillsById, type HeroDefinition } from "@mma/content";
import { getSkillTuning } from "@mma/balance";
import { ARENA_CAMERA, heroFacing } from "./combatInput";
import { buildWindfallArena } from "./ArenaWorld";
import { instantiateHeroAsset } from "./HeroAssetLoader";
import { selectHeroAnimation, type HeroAnimationController } from "./animationController";
import { KeyedObjectPool, GameplayObjectPool, VFX_QUALITY_BUDGETS, qualityForDevice } from "./VfxPool";

type ThreeArenaProps = {
  game: GameState;
  zoom: number;
  preview: SkillPreview | null;
  moveTarget?: Vec2 | null;
  onAimChange: (worldPoint: Vec2) => void;
  onPointerDown: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
  onPointerCancel?: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
  onPointerLeave: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
  onWheel: (event: ReactWheelEvent<HTMLCanvasElement>) => void;
  onTouchStart: (event: ReactTouchEvent<HTMLCanvasElement>) => void;
  onTouchMove: (event: ReactTouchEvent<HTMLCanvasElement>) => void;
  onTouchEnd: (event: ReactTouchEvent<HTMLCanvasElement>) => void;
  onRendererStatus?: (status: "ready" | "unavailable") => void;
};

type ChibiNode = THREE.Group & {
  userData: {
    body?: THREE.Mesh;
    head?: THREE.Mesh;
    mantle?: THREE.Mesh;
    glow?: THREE.Mesh;
    ring?: THREE.Mesh;
    hpFill?: THREE.Mesh;
    shadow?: THREE.Mesh;
    leftFoot?: THREE.Mesh;
    rightFoot?: THREE.Mesh;
    staff?: THREE.Mesh;
    staffOrb?: THREE.Mesh;
    index?: number;
    visualPackageId?: string;
    assetRoot?: THREE.Group;
    loading?: THREE.Mesh;
    controller?: HeroAnimationController;
    assetState?: "loading" | "ready" | "fallback";
    lastElapsed?: number;
  };
};

type EffectNode = THREE.Group & { userData: { eventId?: string; kind?: string; poolKey?: string; poolOrigin?: THREE.Vector3; impact?: THREE.Mesh; meteor?: THREE.Group; ring?: THREE.Mesh; core?: THREE.Mesh; target?: THREE.Vector3 } };

const WORLD_CENTER = { x: 0, y: 0 };
const GROUND_Y = ARENA_CAMERA.ground;
const ELEMENT_HEX: Record<string, number> = {
  fire: 0xff6b35,
  water: 0x35baf6,
  earth: 0xc99a5b,
  air: 0xb18cff,
};

function worldPosition(x: number, y: number, height = 0): THREE.Vector3 {
  return new THREE.Vector3(x - WORLD_CENTER.x, height, y - WORLD_CENTER.y);
}

function colorForElement(element: string): number {
  return ELEMENT_HEX[element] ?? 0xb18cff;
}

function shadeHex(color: number, factor: number): number {
  return new THREE.Color(color).multiplyScalar(factor).getHex();
}

function material(color: number, options: { emissiveIntensity?: number; emissive?: number; transparent?: boolean; opacity?: number; roughness?: number; metalness?: number } = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? (options.emissive ? 0.9 : 0),
    roughness: options.roughness ?? 0.62,
    metalness: options.metalness ?? 0.08,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
    depthWrite: !(options.transparent ?? false),
  });
}

function basic(color: number, opacity = 1): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: false, side: THREE.DoubleSide });
}

function labelSprite(text: string, color: string): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 96;
  const context = canvas.getContext("2d");
  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.font = "700 34px Inter, Arial, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "rgba(3, 6, 15, .86)";
    context.roundRect(18, 13, 476, 70, 22);
    context.fill();
    context.strokeStyle = color;
    context.lineWidth = 3;
    context.stroke();
    context.fillStyle = "#f4f7ff";
    context.fillText(text.toUpperCase(), canvas.width / 2, canvas.height / 2 + 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.scale.set(92, 17, 1);
  return sprite;
}

function mesh(geometry: THREE.BufferGeometry, mat: THREE.Material): THREE.Mesh {
  return new THREE.Mesh(geometry, mat);
}

function createProceduralAssetFallback(hero: HeroDefinition, name: string, index: number, isPlayer: boolean): ChibiNode {
  const root = new THREE.Group() as ChibiNode;
  root.userData.index = index;
  root.userData.visualPackageId = hero.visualPackageId;
  const color = colorForElement(hero.element);
  const accent = material(color, { emissive: color });
  const skin = material(0xffd5b5, { roughness: 0.85 });
  const dark = material(0x12192b, { roughness: 0.5, metalness: 0.15 });
  const body = mesh(new THREE.CapsuleGeometry(18, 24, 5, 12), accent);
  body.scale.set(hero.element === "earth" ? 1.28 : hero.element === "air" ? 0.84 : 1, hero.element === "earth" ? 0.9 : hero.element === "water" ? 1.08 : 1, hero.element === "air" ? 0.66 : 0.78);
  body.position.y = 28;
  body.castShadow = true;
  root.add(body);

  const mantle = mesh(new THREE.ConeGeometry(27, 28, 8), material(shadeHex(color, 0.55), { roughness: 0.75 }));
  mantle.position.y = 19;
  mantle.scale.z = 0.8;
  mantle.castShadow = true;
  root.add(mantle);

  const head = mesh(new THREE.SphereGeometry(23, 18, 14), skin);
  head.position.y = 59;
  head.castShadow = true;
  root.add(head);

  const hood = mesh(new THREE.SphereGeometry(25, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.58), material(color, { roughness: 0.68 }));
  hood.position.y = 62;
  hood.scale.set(1.02, 0.72, 1.02);
  root.add(hood);

  const eyeMaterial = material(0x111426, { emissive: 0x27304f });
  for (const side of [-1, 1]) {
    const eye = mesh(new THREE.SphereGeometry(3.1, 8, 8), eyeMaterial);
    eye.position.set(side * 8, 59, 20);
    root.add(eye);
  }

  const armGeometry = new THREE.CapsuleGeometry(6, 15, 4, 8);
  for (const side of [-1, 1]) {
    const arm = mesh(armGeometry, accent);
    arm.position.set(side * 24, 31, 1);
    arm.rotation.z = side * 0.45;
    arm.castShadow = true;
    root.add(arm);
  }

  const boots: THREE.Mesh[] = [];
  for (const side of [-1, 1]) {
    const boot = mesh(new THREE.CapsuleGeometry(7, 10, 4, 8), dark);
    boot.position.set(side * 10, 10, 5);
    boot.rotation.x = Math.PI / 2;
    boot.castShadow = true;
    root.add(boot);
    boots.push(boot);
  }

  const staff = mesh(new THREE.CylinderGeometry(2.2, 2.2, 58, 8), dark);
  staff.position.set(29, 45, 7);
  staff.rotation.z = -0.25;
  root.add(staff);
  const staffOrb = mesh(new THREE.IcosahedronGeometry(8, 1), material(color, { emissive: color }));
  staffOrb.position.set(37, 73, 13);
  root.add(staffOrb);

  if (hero.element === "fire") {
    for (const side of [-1, 1]) {
      const horn = mesh(new THREE.ConeGeometry(4.5, 18, 7), material(0x36182a, { roughness: 0.72 }));
      horn.position.set(side * 15, 82, 0);
      horn.rotation.z = side * -0.38;
      root.add(horn);
    }
    const flameCrown = mesh(new THREE.ConeGeometry(9, 28, 7), material(0xffd166, { emissive: color, transparent: true, opacity: 0.9 }));
    flameCrown.position.set(0, 94, -1);
    flameCrown.rotation.z = 0.12;
    root.add(flameCrown);
    const furnace = mesh(new THREE.TorusGeometry(13, 4, 7, 20), material(0x4b1721, { emissive: color }));
    furnace.position.set(0, 31, 20);
    root.add(furnace);
    for (const side of [-1, 1]) {
      const blade = mesh(new THREE.ConeGeometry(5, 24, 6), material(side < 0 ? 0xffd166 : color, { emissive: color }));
      blade.position.set(side * 19, 18, -13);
      blade.rotation.z = side * 0.5;
      root.add(blade);
    }
  } else if (hero.element === "water") {
    const crest = mesh(new THREE.TorusGeometry(17, 4, 7, 24, Math.PI), material(color, { emissive: color, transparent: true, opacity: 0.8 }));
    crest.position.set(0, 79, -3);
    crest.rotation.z = Math.PI / 2;
    root.add(crest);
    const tideCape = mesh(new THREE.SphereGeometry(30, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.42), material(0x174a78, { emissive: color, transparent: true, opacity: 0.62 }));
    tideCape.position.set(0, 37, -16);
    tideCape.scale.set(1, 1.25, 0.38);
    tideCape.rotation.x = -0.3;
    root.add(tideCape);
    for (const side of [-1, 1]) {
      const fin = mesh(new THREE.ConeGeometry(7, 27, 5), material(0xa7edff, { emissive: color, transparent: true, opacity: 0.8 }));
      fin.position.set(side * 28, 46, -5);
      fin.rotation.z = side * -0.95;
      root.add(fin);
    }
    const shell = mesh(new THREE.TorusGeometry(9, 3, 8, 22), material(0xe1fbff, { emissive: color }));
    shell.position.set(0, 31, 20);
    shell.rotation.x = Math.PI / 2;
    root.add(shell);
  } else if (hero.element === "earth") {
    for (const side of [-1, 1]) {
      const pauldron = mesh(new THREE.DodecahedronGeometry(10, 0), material(0x6c5638, { roughness: 0.96 }));
      pauldron.position.set(side * 25, 40, 0);
      root.add(pauldron);
    }
    const helm = mesh(new THREE.DodecahedronGeometry(27, 1), material(0x58452d, { roughness: 0.98 }));
    helm.position.set(0, 67, -3);
    helm.scale.set(1.08, 0.78, 1.02);
    root.add(helm);
    const visor = mesh(new THREE.BoxGeometry(30, 6, 8), material(0xf4cf75, { emissive: color, metalness: 0.55 }));
    visor.position.set(0, 62, 21);
    root.add(visor);
    for (const side of [-1, 1]) {
      const gauntlet = mesh(new THREE.DodecahedronGeometry(11, 0), material(0x7d633e, { roughness: 0.92 }));
      gauntlet.position.set(side * 31, 25, 7);
      root.add(gauntlet);
    }
    const shield = mesh(new THREE.CylinderGeometry(22, 22, 7, 6), material(0x6c5638, { metalness: 0.25, roughness: 0.8 }));
    shield.position.set(-31, 39, 6);
    shield.rotation.z = Math.PI / 2;
    root.add(shield);
  } else {
    const feather = mesh(new THREE.ConeGeometry(5, 24, 5), material(0xe7e8ff, { emissive: color, transparent: true, opacity: 0.88 }));
    feather.position.set(-17, 84, -2);
    feather.rotation.z = -0.52;
    root.add(feather);
    for (const side of [-1, 1]) {
      const wing = mesh(new THREE.ConeGeometry(10, 48, 5), material(side < 0 ? 0xf4f0ff : color, { emissive: color, transparent: true, opacity: 0.54 }));
      wing.position.set(side * 29, 47, -18);
      wing.rotation.z = side * -0.88;
      wing.rotation.x = 0.28;
      root.add(wing);
      const ankleRibbon = mesh(new THREE.TorusGeometry(10, 2, 6, 24, Math.PI * 1.5), basic(0xf4f0ff, 0.66));
      ankleRibbon.position.set(side * 10, 13, 1);
      ankleRibbon.rotation.x = Math.PI / 2;
      root.add(ankleRibbon);
    }
    const halo = mesh(new THREE.TorusGeometry(19, 2.5, 7, 36), material(0xf4f0ff, { emissive: color, transparent: true, opacity: 0.76 }));
    halo.position.set(0, 91, 0);
    halo.rotation.x = Math.PI / 2;
    root.add(halo);
  }

  const glow = mesh(new THREE.SphereGeometry(8, 16, 10), material(color, { emissive: color, transparent: true, opacity: 0.88 }));
  glow.position.y = 86;
  root.add(glow);

  const shadow = mesh(new THREE.CircleGeometry(31, 32), basic(0x02040b, 0.58));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 1;
  shadow.scale.set(1.2, 0.62, 1);
  root.add(shadow);

  const ring = mesh(new THREE.TorusGeometry(34, isPlayer ? 2.7 : 1.6, 8, 40), basic(isPlayer ? 0xf4d35e : color, isPlayer ? 0.9 : 0.55));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 3;
  root.add(ring);

  const hpBack = mesh(new THREE.PlaneGeometry(62, 6), basic(0x111a30, 0.95));
  hpBack.position.set(0, 95, 0);
  root.add(hpBack);
  const hpFill = mesh(new THREE.PlaneGeometry(58, 3), basic(0x5be1ad, 0.95));
  hpFill.position.set(-29, 95.2, 1);
  hpFill.scale.x = 1;
  root.add(hpFill);

  const nameTag = labelSprite(name, hero.color);
  nameTag.position.y = 116;
  root.add(nameTag);

  root.userData.body = body;
  root.userData.head = head;
  root.userData.mantle = mantle;
  root.userData.glow = glow;
  root.userData.ring = ring;
  root.userData.hpFill = hpFill;
  root.userData.shadow = shadow;
  if (boots[0]) root.userData.leftFoot = boots[0];
  if (boots[1]) root.userData.rightFoot = boots[1];
  root.userData.staff = staff;
  root.userData.staffOrb = staffOrb;
  root.rotation.order = "YXZ";
  return root;
}

function createHeroAnchor(hero: HeroDefinition, name: string, index: number, isPlayer: boolean): ChibiNode {
  const root = new THREE.Group() as ChibiNode;
  root.userData.index = index;
  root.userData.visualPackageId = hero.visualPackageId;
  root.userData.assetState = "loading";
  const color = colorForElement(hero.element);
  const assetRoot = new THREE.Group();
  root.add(assetRoot);
  const loading = mesh(new THREE.OctahedronGeometry(15, 1), basic(color, .48));
  loading.position.y = 48;
  root.add(loading);
  const shadow = mesh(new THREE.CircleGeometry(31, 32), basic(0x02040b, 0.58));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 1;
  shadow.scale.set(1.2, 0.62, 1);
  root.add(shadow);
  const ring = mesh(new THREE.TorusGeometry(34, isPlayer ? 2.7 : 1.6, 8, 40), basic(isPlayer ? 0xf4d35e : color, isPlayer ? 0.9 : 0.55));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 3;
  root.add(ring);
  const hpBack = mesh(new THREE.PlaneGeometry(62, 6), basic(0x111a30, 0.95));
  hpBack.position.set(0, 118, 0);
  root.add(hpBack);
  const hpFill = mesh(new THREE.PlaneGeometry(58, 3), basic(0x5be1ad, 0.95));
  hpFill.position.set(-29, 118.2, 1);
  root.add(hpFill);
  const nameTag = labelSprite(name, hero.color);
  nameTag.position.y = 138;
  root.add(nameTag);
  root.userData.assetRoot = assetRoot;
  root.userData.loading = loading;
  root.userData.shadow = shadow;
  root.userData.ring = ring;
  root.userData.hpFill = hpFill;
  root.rotation.order = "YXZ";
  return root;
}

function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    const renderable = child as THREE.Mesh | THREE.Line;
    if (renderable.geometry) renderable.geometry.dispose();
    const materialValue = renderable.material;
    const disposeMaterial = (value: THREE.Material) => {
      const textured = value as THREE.Material & { map?: THREE.Texture | null };
      textured.map?.dispose();
      value.dispose();
    };
    if (Array.isArray(materialValue)) materialValue.forEach(disposeMaterial);
    else if (materialValue) disposeMaterial(materialValue);
  });
}

function clearGroup(group: THREE.Group): void {
  while (group.children.length > 0) {
    const child = group.children.pop();
    if (child) disposeObject(child);
  }
}

function makeRing(radius: number, color: number, opacity = 0.5): THREE.Mesh {
  const ring = mesh(new THREE.RingGeometry(Math.max(1, radius - 3), radius, 64), basic(color, opacity));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 2;
  return ring;
}

function makeSpark(color: number, size: number, angle: number): THREE.Mesh {
  const spark = mesh(new THREE.OctahedronGeometry(size, 0), material(color, { emissive: color, roughness: 0.35 }));
  spark.position.set(Math.cos(angle) * size * 2.2, 18 + Math.sin(angle * 2) * 6, Math.sin(angle) * size * 2.2);
  return spark;
}

function createMeteorEffect(eventId: string, position: THREE.Vector3, color: number): EffectNode {
  const root = new THREE.Group() as EffectNode;
  root.position.y = GROUND_Y;
  root.userData.eventId = eventId;
  root.userData.kind = "meteor";
  root.userData.target = position.clone();
  const meteor = new THREE.Group();
  meteor.position.copy(position);
  const core = mesh(new THREE.IcosahedronGeometry(49, 2), material(0x37211a, { emissive: 0x8b260b, emissiveIntensity: .35, roughness: 0.92 }));
  core.rotation.set(0.3, 0.2, 0.7);
  meteor.add(core);
  for(let i=0;i<5;i++){
    const seam=mesh(new THREE.TorusGeometry(45,2.5,6,28),basic(i%2?0xffec90:0xff641b,.85));seam.rotation.set(i*.83,i*.57,i*.29);meteor.add(seam);
  }
  const flame = mesh(new THREE.SphereGeometry(59, 20, 14), material(color, { emissive: color, transparent: true, opacity: 0.34 }));
  flame.scale.set(0.85, 1.35, 0.85);
  flame.position.y = 18;
  meteor.add(flame);
  const trail = new THREE.Group();
  for (let index = 0; index < 5; index += 1) {
    const tail = mesh(new THREE.SphereGeometry(Math.max(9, 36 - index * 5), 8, 8), material(index < 2 ? 0xffffd2 : color, { emissive: color, transparent: true, opacity: 0.68 - index * 0.1 }));
    tail.position.set((index % 2 ? 8 : -8) * (index / 4), 55 + index * 42, 0);
    trail.add(tail);
  }
  meteor.add(trail);
  root.add(meteor);
  const shadow = mesh(new THREE.CircleGeometry(52, 48), basic(0x03040b, 0.58));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(position.x, 3, position.z);
  root.add(shadow);
  const ring = makeRing(180, color, 0.62);
  ring.position.set(position.x, 4, position.z);
  root.add(ring);
  root.userData.meteor = meteor;
  root.userData.core = core;
  root.userData.ring = ring;
  return root;
}

function createImpactEffect(eventId: string, position: THREE.Vector3, color: number, kind: string): EffectNode {
  const root = new THREE.Group() as EffectNode;
  root.position.y = GROUND_Y;
  root.userData.eventId = eventId;
  root.userData.kind = kind;
  root.userData.target = position.clone();
  const ring = makeRing(kind === "METEOR_IMPACT" ? 180 : 48, color, 0.78);
  ring.position.copy(position);
  ring.position.y = 5;
  root.add(ring);
  for (let index = 0; index < 8; index += 1) {
    const spark = makeSpark(color, (kind === "METEOR_IMPACT" ? 17 : 6) + (index % 3) * 3, (index / 8) * Math.PI * 2);
    spark.position.add(position);
    spark.userData.origin = spark.position.clone();
    root.add(spark);
  }
  root.userData.ring = ring;
  return root;
}

function createElementalEffect(eventId: string, position: THREE.Vector3, color: number, element: string, behavior: string, skillId: string): EffectNode {
  const root = createImpactEffect(eventId, position, color, `skill-${skillId}-${behavior}`);
  if (element === "water") {
    for (const scale of [0.7, 1, 1.3]) {
      const wave = mesh(new THREE.TorusGeometry(28 * scale, 3.2, 8, 48), basic(color, 0.5));
      wave.rotation.x = -Math.PI / 2;
      wave.position.set(position.x, 7 + scale * 8, position.z);
      root.add(wave);
    }
    if (skillId === "water-undertow") {
      for (let index = 0; index < 6; index += 1) {
        const spiral = mesh(new THREE.TorusGeometry(52 - index * 6, 2.6, 7, 42), basic(index % 2 ? 0xdaf8ff : color, 0.5));
        spiral.position.set(position.x, 7 + index * 8, position.z);
        spiral.rotation.x = -Math.PI / 2 + index * 0.08;
        root.add(spiral);
      }
    } else if (skillId === "water-wave-wall") {
      for (let index = -2; index <= 2; index += 1) {
        const crest = mesh(new THREE.TorusGeometry(42, 5, 8, 28, Math.PI), basic(index % 2 ? 0xdaf8ff : color, 0.44));
        crest.position.set(position.x + index * 25, 28 + Math.abs(index) * 3, position.z);
        crest.rotation.y = Math.PI / 2;
        root.add(crest);
      }
    }
  } else if (element === "earth") {
    for (let index = 0; index < 5; index += 1) {
      const spike = mesh(new THREE.ConeGeometry(8 + (index % 2) * 5, 34 + (index % 3) * 10, 6), material(color, { emissive: color, roughness: 0.86 }));
      const angle = index * Math.PI * 0.4;
      spike.position.set(position.x + Math.cos(angle) * 30, 18, position.z + Math.sin(angle) * 30);
      spike.rotation.z = Math.sin(angle) * 0.35;
      spike.rotation.x = Math.cos(angle) * 0.35;
      root.add(spike);
    }
    if (skillId === "earth-quake") {
      for (let index = 0; index < 9; index += 1) {
        const shard = mesh(new THREE.BoxGeometry(4, 3, 58 + index * 5), basic(index % 2 ? 0xffd37a : 0x332415, 0.66));
        shard.position.set(position.x, 5, position.z);
        shard.rotation.y = (index / 9) * Math.PI * 2;
        root.add(shard);
      }
    } else if (skillId === "earth-bulwark") {
      for (let index = -2; index <= 2; index += 1) {
        const slab = mesh(new THREE.DodecahedronGeometry(18 + (2 - Math.abs(index)) * 5, 0), material(index % 2 ? 0x8e7046 : color, { emissive: color, roughness: 0.9 }));
        slab.position.set(position.x + index * 28, 20 + (2 - Math.abs(index)) * 8, position.z);
        slab.scale.y = 1.45;
        root.add(slab);
      }
    }
  } else if (element === "air") {
    const vortex = mesh(new THREE.TorusKnotGeometry(35, 3.5, 64, 10, 2, 3), basic(color, 0.56));
    vortex.position.set(position.x, 40, position.z);
    vortex.scale.set(1, 1.7, 1);
    root.add(vortex);
    for (let index = 0; index < 4; index += 1) {
      const blade = mesh(new THREE.PlaneGeometry(5, 64), basic(0xf4f7ff, 0.32));
      blade.position.set(position.x + Math.cos(index * Math.PI / 2) * 30, 35, position.z + Math.sin(index * Math.PI / 2) * 30);
      blade.rotation.y = index * Math.PI / 2;
      root.add(blade);
    }
    if (skillId === "air-vortex" || skillId === "air-updraft") {
      for (let index = 0; index < 8; index += 1) {
        const funnel = mesh(new THREE.TorusGeometry(18 + index * 6, 2.2, 6, 36), basic(index % 2 ? 0xf2f5ff : color, 0.44));
        funnel.position.set(position.x, 10 + index * 10, position.z);
        funnel.rotation.x = Math.PI / 2;
        funnel.rotation.z = index * 0.38;
        root.add(funnel);
      }
    }
  } else if (element === "fire") {
    for (let index = 0; index < 5; index += 1) {
      const ember = mesh(new THREE.IcosahedronGeometry(6 + (index % 2) * 3, 1), material(index % 2 ? 0xffd166 : color, { emissive: color, transparent: true, opacity: 0.8 }));
      const angle = index * Math.PI * 0.4;
      ember.position.set(position.x + Math.cos(angle) * 24, 18 + (index % 3) * 14, position.z + Math.sin(angle) * 24);
      root.add(ember);
    }
    if (skillId === "fire-scorch-trail") {
      for (let index = -3; index <= 3; index += 1) {
        const flame = mesh(new THREE.ConeGeometry(9 + (index % 2 ? 5 : 0), 44 + Math.abs(index) * 3, 7), material(index % 2 ? 0xffd05a : color, { emissive: color, transparent: true, opacity: 0.82 }));
        flame.position.set(position.x + index * 25, 23, position.z);
        flame.rotation.z = index * 0.06;
        root.add(flame);
      }
    } else if (skillId === "fire-solar-orb") {
      const sun = mesh(new THREE.IcosahedronGeometry(30, 2), material(0xffed99, { emissive: color }));
      sun.position.set(position.x, 46, position.z);
      root.add(sun);
      for (const radius of [42, 57]) {
        const corona = mesh(new THREE.TorusGeometry(radius, 3, 7, 48), basic(color, 0.55));
        corona.position.copy(sun.position);
        corona.rotation.x = radius === 42 ? 0.7 : -0.45;
        root.add(corona);
      }
    }
  }
  return root;
}

function updatePreview(group: THREE.Group, preview: SkillPreview | null): void {
  clearGroup(group);
  if (!preview) return;
  const color = colorForElement(skillsById[preview.skillId]?.element ?? "fire");
  const start = worldPosition(preview.origin.x, preview.origin.y, GROUND_Y + 8);
  const path = preview.path.length > 0 ? preview.path : [{ from: preview.origin, to: preview.impact, certainty: "certain" as const }];
  let finalDirection = new THREE.Vector3(preview.direction.x, 0, preview.direction.y);
  let pathLength = 0;
  path.forEach((segment) => {
    const segmentStart = worldPosition(segment.from.x, segment.from.y, GROUND_Y + 8);
    const segmentEnd = worldPosition(segment.to.x, segment.to.y, GROUND_Y + 8);
    const direction = segmentEnd.clone().sub(segmentStart);
    const length = direction.length();
    if (length < 0.5) return;
    pathLength += length;
    finalDirection = direction.clone().normalize();
    const segmentColor = segment.blocked ? 0xe84872 : segment.certainty === "predicted" ? 0xf4d35e : segment.certainty === "dynamic" ? 0xb18cff : color;
    const line = mesh(new THREE.CylinderGeometry(segment.blocked ? 3.2 : 2.3, segment.blocked ? 3.2 : 2.3, length, 8), basic(segmentColor, segment.blocked ? 0.86 : 0.72));
    line.position.copy(segmentStart).add(segmentEnd).multiplyScalar(0.5);
    line.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    group.add(line);
  });
  const end = worldPosition(preview.impact.x, preview.impact.y, GROUND_Y + 8);
  const origin = mesh(new THREE.SphereGeometry(8, 12, 8), material(color, { emissive: color }));
  origin.position.copy(start);
  group.add(origin);
  const impactRing = makeRing(Math.max(24, preview.radius), preview.blocked ? 0xe84872 : color, preview.blocked ? 0.65 : 0.42);
  impactRing.position.copy(end);
  impactRing.position.y = GROUND_Y + 5;
  group.add(impactRing);
  const impactDisc = mesh(new THREE.CircleGeometry(Math.max(22, preview.radius), 48), basic(preview.blocked ? 0xe84872 : color, 0.13));
  impactDisc.rotation.x = -Math.PI / 2;
  impactDisc.position.copy(end);
  impactDisc.position.y = GROUND_Y + 4;
  group.add(impactDisc);

  const facing = Math.atan2(finalDirection.z, finalDirection.x);
  if (preview.geometry.kind === "wall") {
    const wallWidth = preview.geometry.width;
    const wall = mesh(new THREE.BoxGeometry(wallWidth, 5, 18), basic(color, 0.46));
    wall.position.copy(end);
    wall.position.y = GROUND_Y + 6;
    wall.rotation.y = -facing;
    group.add(wall);
  } else if (preview.geometry.kind === "arc") {
    const arc = mesh(new THREE.RingGeometry(Math.max(30, pathLength * 0.68), Math.max(31, pathLength), 56, 1, -preview.geometry.angle / 2, preview.geometry.angle), basic(color, 0.16));
    arc.rotation.x = -Math.PI / 2;
    arc.rotation.z = -facing;
    arc.position.copy(start);
    arc.position.y = GROUND_Y + 4;
    group.add(arc);
  } else if (preview.geometry.kind === "pullCircle") {
    for (const scale of [0.5, 0.75]) {
      const inner = makeRing(Math.max(18, preview.radius * scale), color, 0.28);
      inner.position.copy(end);
      inner.position.y = GROUND_Y + 5;
      group.add(inner);
    }
  } else if (preview.geometry.kind === "trail" || preview.geometry.kind === "dashLine") {
    const width = preview.geometry.kind === "trail" ? preview.geometry.width : 52;
    const lane = mesh(new THREE.PlaneGeometry(Math.max(1, pathLength), width), basic(color, 0.14));
    lane.rotation.x = -Math.PI / 2;
    lane.rotation.z = -facing;
    lane.position.copy(start).add(end).multiplyScalar(0.5);
    lane.position.y = GROUND_Y + 3;
    group.add(lane);
  }
  if (preview.blocked) {
    const blocker = mesh(new THREE.TorusGeometry(Math.max(12, preview.radius * 0.42), 3, 8, 20), basic(0xe84872, 0.86));
    blocker.position.copy(end);
    blocker.position.y = GROUND_Y + 12;
    blocker.rotation.x = Math.PI / 2;
    blocker.rotation.z = Math.PI / 4;
    group.add(blocker);
  }
}

function previewSignature(preview: SkillPreview | null): string {
  if (!preview) return "none";
  return JSON.stringify({
    skillId: preview.skillId,
    impact: preview.impact,
    origin: preview.origin,
    direction: preview.direction,
    blocked: preview.blocked,
    predictedBounces: preview.predictedBounces,
    path: preview.path,
  });
}

export function ThreeArena({ game, zoom, preview, moveTarget, onAimChange, onPointerDown, onPointerUp, onPointerCancel, onPointerLeave, onWheel, onTouchStart, onTouchMove, onTouchEnd, onRendererStatus }: ThreeArenaProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef(game);
  const previewRef = useRef(preview);
  const moveTargetRef = useRef(moveTarget); moveTargetRef.current = moveTarget;
  const zoomRef = useRef(zoom);
  const resizeRequestedRef = useRef(true);
  const pointerToWorldRef = useRef<(clientX: number, clientY: number) => Vec2 | null>(() => null);

  useEffect(() => { gameRef.current = game; }, [game]);
  useEffect(() => { previewRef.current = preview; }, [preview]);
  useEffect(() => {
    zoomRef.current = zoom;
    resizeRequestedRef.current = true;
  }, [zoom]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const initialGame = gameRef.current;
    WORLD_CENTER.x = initialGame.arena.center.x;
    WORLD_CENTER.y = initialGame.arena.center.y;
    const arenaCanvas = canvas;
    arenaCanvas.dataset.renderer = "checking";
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: arenaCanvas, antialias: true, alpha: false, powerPreference: "high-performance" });
    } catch {
      arenaCanvas.dataset.renderer = "unavailable";
      onRendererStatus?.("unavailable");
      return undefined;
    }
    onRendererStatus?.("ready");
    arenaCanvas.dataset.renderer = "three-webgl";
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      arenaCanvas.dataset.renderer = "unavailable";
      onRendererStatus?.("unavailable");
    };
    const handleContextRestored = () => {
      arenaCanvas.dataset.renderer = "three-webgl";
      onRendererStatus?.("ready");
    };
    arenaCanvas.addEventListener("webglcontextlost", handleContextLost, false);
    arenaCanvas.addEventListener("webglcontextrestored", handleContextRestored, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050a16);
    scene.fog = new THREE.Fog(0x050a16, initialGame.arena.height * 0.72, initialGame.arena.width * 1.38);
    const arenaWorld = buildWindfallArena(scene, initialGame);

    const ambient = new THREE.HemisphereLight(0x9bb8ff, 0x081022, 1.65);
    scene.add(ambient);
    const key = new THREE.DirectionalLight(0xffedd4, 3.4);
    key.position.set(-400, 900, 360);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -initialGame.arena.width * 0.58;
    key.shadow.camera.right = initialGame.arena.width * 0.58;
    key.shadow.camera.top = initialGame.arena.height * 0.68;
    key.shadow.camera.bottom = -initialGame.arena.height * 0.68;
    scene.add(key);
    const blueFill = new THREE.PointLight(0x5b75ff, 70, 850, 2);
    blueFill.position.set(0, 130, 0);
    scene.add(blueFill);

    const camera = new THREE.OrthographicCamera(-1800, 1800, 1100, -1100, 1, 9000);
    camera.position.set(0, ARENA_CAMERA.height, ARENA_CAMERA.depth);
    camera.lookAt(0, GROUND_Y, 0);
    camera.zoom = 1;
    camera.updateProjectionMatrix();

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -GROUND_Y);
    const floorHit = new THREE.Vector3();
    pointerToWorldRef.current = (clientX, clientY) => {
      const rect = arenaCanvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      pointer.set(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.ray.intersectPlane(floorPlane, floorHit);
      return hit ? { x: hit.x + WORLD_CENTER.x, y: hit.z + WORLD_CENTER.y } : null;
    };

    const playersGroup = new THREE.Group();
    const projectilesGroup = new THREE.Group();
    const fieldsGroup = new THREE.Group();
    const wallsGroup = new THREE.Group();
    const effectsGroup = new THREE.Group();
    const previewGroup = new THREE.Group();
    const windGroup = new THREE.Group();
    for (let index = 0; index < 20; index += 1) {
      const gust = mesh(new THREE.PlaneGeometry(110 + (index % 4) * 38, 4 + (index % 3) * 2), basic(index % 3 === 0 ? 0xf3efff : 0xb996ff, 0.16));
      gust.rotation.x = -Math.PI / 2;
      gust.position.set(-980 + (index % 10) * 220, 22 + (index % 4) * 10, -470 + Math.floor(index / 10) * 860 + (index % 3) * 42);
      gust.userData.baseX = gust.position.x;
      gust.userData.baseZ = gust.position.z;
      gust.userData.phase = index * 0.71;
      windGroup.add(gust);
    }
    scene.add(playersGroup, projectilesGroup, fieldsGroup, wallsGroup, effectsGroup, previewGroup, windGroup);

    const chibis = new Map<string, ChibiNode>();
    const moveMarker = new THREE.Group();
    moveMarker.add(makeRing(30,0x9effcb,.95),makeRing(43,0x9effcb,.35));
    const pointerGem=mesh(new THREE.ConeGeometry(9,22,4),basic(0xd4ffe7));pointerGem.rotation.z=Math.PI;pointerGem.position.y=28;moveMarker.add(pointerGem);scene.add(moveMarker);
    const fallingNodes = new Map<string,EffectNode>();
    function syncFalling(current:GameState) {
      const ids=new Set(current.strikes.map(strike=>strike.id));
      for(const [id,node] of fallingNodes)if(!ids.has(id)){scene.remove(node);disposeObject(node);fallingNodes.delete(id);}
      for(const strike of current.strikes){
        let node=fallingNodes.get(strike.id);
        if(!node){node=createMeteorEffect(strike.id,worldPosition(strike.position.x,strike.position.y),0xff681d);scene.add(node);fallingNodes.set(strike.id,node);}
        const progress=1-strike.remaining/strike.duration;
        if(node.userData.meteor){node.userData.meteor.position.y=45+760*(1-progress*progress);node.userData.meteor.position.x=node.userData.target!.x-180*(1-progress);node.userData.meteor.rotation.y=progress*2.6;}
        if(node.userData.ring){node.userData.ring.scale.setScalar(strike.tuning.effectRadius/180);(node.userData.ring.material as THREE.MeshBasicMaterial).opacity=.35+progress*.6;}
      }
    }
    const projectileNodes = new Map<string, THREE.Group>();
    const fieldNodes = new Map<string, THREE.Group>();
    const wallNodes = new Map<string, THREE.Group>();
    const effectNodes = new Map<string, EffectNode>();
    const quality = qualityForDevice();
    const vfxBudget = VFX_QUALITY_BUDGETS[quality];
    const projectilePool = new GameplayObjectPool<THREE.Group>({ maxActive: vfxBudget.projectiles, maxActivePerKey: 16, maxIdlePerKey: 8 });
    const fieldPool = new GameplayObjectPool<THREE.Group>({ maxActive: vfxBudget.fields, maxActivePerKey: 6, maxIdlePerKey: 3 });
    const wallPool = new GameplayObjectPool<THREE.Group>({ maxActive: 16, maxActivePerKey: 6, maxIdlePerKey: 3 });
    const effectPool = new KeyedObjectPool<EffectNode>({ maxActive: vfxBudget.impacts, maxActivePerKey: 12, maxIdlePerKey: 6 });
    arenaCanvas.dataset.vfxQuality = quality;
    arenaCanvas.dataset.particleBudget = String(vfxBudget.particles);
    let lastPreviewSignature = "";

    function ensureChibi(id: string, player: GameState["players"][string], index: number): ChibiNode {
      const current = chibis.get(id);
      if (current) return current;
      const hero = heroesById[player.heroId] ?? heroesById["fire-ember"];
      if (!hero) throw new Error("Missing fallback hero definition");
      const node = createHeroAnchor(hero, player.name, index, id === "player");
      playersGroup.add(node);
      chibis.set(id, node);
      void instantiateHeroAsset(hero).then((asset) => {
        if (chibis.get(id) !== node) { asset.controller.dispose(); disposeObject(asset.object); return; }
        if (node.userData.loading) { node.remove(node.userData.loading); disposeObject(node.userData.loading); delete node.userData.loading; }
        node.userData.assetRoot?.add(asset.object);
        node.userData.controller = asset.controller;
        node.userData.assetState = "ready";
        if (node.userData.assetRoot) node.userData.assetRoot.userData.assetSource = hero.visualPackageId;
      }).catch(() => {
        if (chibis.get(id) !== node) return;
        if (node.userData.loading) { node.remove(node.userData.loading); disposeObject(node.userData.loading); delete node.userData.loading; }
        const fallback = createProceduralAssetFallback(hero, player.name, index, id === "player");
        fallback.children.filter((child) => child !== fallback.userData.ring && child !== fallback.userData.shadow && child !== fallback.userData.hpFill).forEach((child) => node.userData.assetRoot?.add(child));
        node.userData.assetState = "fallback";
        if (node.userData.assetRoot) node.userData.assetRoot.userData.assetError = true;
      });
      return node;
    }

    function syncPlayers(currentGame: GameState, elapsed: number): void {
      Object.values(currentGame.players).forEach((player, index) => {
        const node = ensureChibi(player.id, player, index);
        const verticalHeight = player.vertical?.height ?? 0;
        const position = worldPosition(player.position.x, player.position.y, player.alive ? verticalHeight : -10);
        node.position.x = position.x;
        node.position.z = position.z;
        const motion = Math.min(1, Math.hypot(player.velocity.x, player.velocity.y) / 260);
        const bob = 0;
        node.position.y = player.alive ? verticalHeight : -22;
        node.rotation.y = heroFacing(player.input.aim);
        node.rotation.z = THREE.MathUtils.lerp(node.rotation.z, THREE.MathUtils.clamp(-player.velocity.x * 0.0013, -.3, .3), 0.14);
        node.scale.setScalar(0.94);
        node.visible = player.alive || (!player.eliminated && player.respawnTimer > 0);
        const hpFill = node.userData.hpFill;
        if (hpFill) {
          hpFill.scale.x = Math.max(0.02, player.hp / player.maxHp);
          hpFill.position.x = -29 + (58 * (player.hp / player.maxHp)) / 2;
          (hpFill.material as THREE.MeshBasicMaterial).color.set(player.hp / player.maxHp < 0.35 ? 0xe84872 : 0x5be1ad);
        }
        const selection = selectHeroAnimation({ holding: player.id === "player" && previewRef.current !== null, player, events: currentGame.events, tick: currentGame.tick, ...(currentGame.result?.winnerId ? { winnerId: currentGame.result.winnerId } : {}) });
        node.userData.controller?.play(selection);
        const previousElapsed = node.userData.lastElapsed ?? elapsed;
        node.userData.controller?.update((elapsed - previousElapsed) / 1000, selection.clip === "movement" ? .75 + motion * .65 : 1);
        node.userData.lastElapsed = elapsed;
        const ring = node.userData.ring;
        if (ring) {
          ring.rotation.z = elapsed * 0.0015;
          ring.position.y = GROUND_Y + 3 - verticalHeight - bob;
        }
        const shadow = node.userData.shadow;
        if (shadow) {
          shadow.scale.set(1.2 + motion * 0.12 + verticalHeight * 0.0012, 0.62 - motion * 0.08, 1);
          shadow.position.y = GROUND_Y + 1 - verticalHeight - bob;
        }
        if (node.userData.loading) node.userData.loading.rotation.y = elapsed * .003;
      });
    }

    function syncProjectiles(currentGame: GameState): void {
      const activeIds = new Set(currentGame.projectiles.map((projectile) => projectile.id));
      for (const [id, node] of projectileNodes) {
        if (!activeIds.has(id)) {
          projectilesGroup.remove(node);
          const poolKey = String(node.userData.poolKey ?? node.userData.skillId ?? "projectile");
          if (!projectilePool.release(poolKey, node)) disposeObject(node);
          projectileNodes.delete(id);
        }
      }
      currentGame.projectiles.forEach((projectile) => {
        let node = projectileNodes.get(projectile.id);
        if (!node) {
          const poolKey = projectile.skillId;
          node = projectilePool.acquire(poolKey, () => new THREE.Group(), () => {
            const minimal = new THREE.Group();
            minimal.add(mesh(new THREE.IcosahedronGeometry(Math.max(8, projectile.radius), 0), basic(colorForElement(projectile.element))));
            return minimal;
          });
          node.visible = true;
          node.userData.poolKey = poolKey;
          node.userData.skillId = projectile.skillId;
          if (node.children.length === 0) {
            const color = colorForElement(projectile.element);
            const size = Math.max(10, projectile.radius * (projectile.skillId === "fire-solar-orb" || projectile.skillId === "earth-boulder" ? 1.65 : 1.2));
            const coreGeometry = projectile.element === "water"
              ? new THREE.SphereGeometry(size, 16, 12)
              : projectile.element === "earth"
                ? new THREE.DodecahedronGeometry(size, 1)
                : projectile.element === "air"
                  ? new THREE.TorusKnotGeometry(size * 0.72, Math.max(2, size * 0.16), 32, 8, 2, 3)
                  : new THREE.IcosahedronGeometry(size, 1);
            const core = mesh(coreGeometry, material(color, { emissive: color, roughness: 0.35 }));
            node.add(core);
            const halo = mesh(new THREE.TorusGeometry(size * 1.18, Math.max(1.6, size * 0.1), 7, 36), basic(projectile.element === "water" ? 0xd7fbff : projectile.element === "air" ? 0xf0eaff : 0xffe19a, 0.62));
            halo.rotation.x = Math.PI / 2;
            node.add(halo);
            const tailCount = quality === "low" ? 3 : quality === "medium" ? 5 : 7;
            for (let index = 0; index < tailCount; index += 1) {
              const tail = mesh(new THREE.SphereGeometry(Math.max(3, projectile.radius * (0.85 - index * 0.10)), 8, 8), material(color, { emissive: color, transparent: true, opacity: 0.55 - index * 0.07 }));
              tail.position.z = -28 - index * 30;
              tail.position.y = index * 3;
              node.add(tail);
            }
          }
          projectilesGroup.add(node);
          projectileNodes.set(projectile.id, node);
        }
        node.position.copy(worldPosition(projectile.position.x, projectile.position.y, GROUND_Y + (projectile.height ?? 20)));
        node.rotation.y = heroFacing(projectile.velocity);
        if(node.children[0]) node.children[0].rotation.z = currentGame.time*2.5;
      });
    }

    function syncFields(currentGame: GameState): void {
      const activeIds = new Set(currentGame.fields.map((field) => field.id));
      for (const [id, node] of fieldNodes) {
        if (!activeIds.has(id)) {
          fieldsGroup.remove(node);
          const poolKey = String(node.userData.poolKey ?? node.userData.skillId ?? "field");
          if (!fieldPool.release(poolKey, node)) disposeObject(node);
          fieldNodes.delete(id);
        }
      }
      currentGame.fields.forEach((field) => {
        let node = fieldNodes.get(field.id);
        if (!node) {
          const poolKey = field.skillId;
          node = fieldPool.acquire(poolKey, () => new THREE.Group(), () => {
            const minimal = new THREE.Group();
            const disc = mesh(new THREE.CircleGeometry(field.radius, 24), basic(colorForElement(field.element), .24));
            disc.rotation.x = -Math.PI / 2; disc.position.y = 3;
            minimal.add(disc, makeRing(field.radius, colorForElement(field.element), .85));
            return minimal;
          });
          node.userData.poolKey = poolKey;
          node.userData.skillId = field.skillId;
          if (node.children.length === 0) {
            const color = colorForElement(field.element);
            const disc = mesh(new THREE.CircleGeometry(field.radius, 48), basic(color, 0.16));
            disc.rotation.x = -Math.PI / 2;
            disc.position.y = 3;
            node.add(disc, makeRing(field.radius, color, 0.62));
            const ribbonCount = quality === "low" ? 3 : quality === "medium" ? 5 : 8;
            for (let index = 0; index < ribbonCount; index += 1) {
              const ribbon = mesh(new THREE.TorusGeometry(field.radius * 0.62 + index * 2, 1.3, 6, 28), basic(color, 0.2));
              ribbon.rotation.x = -Math.PI / 2;
              ribbon.rotation.z = index * 0.4;
              ribbon.position.y = 4 + index * 0.6;
              node.add(ribbon);
            }
          }
          fieldsGroup.add(node);
          fieldNodes.set(field.id, node);
        }
        node.position.copy(worldPosition(field.position.x, field.position.y, GROUND_Y));
        node.rotation.y += 0.008;
      });
    }

    function syncWalls(currentGame: GameState): void {
      const activeIds = new Set(currentGame.walls.map((wall) => wall.id));
      for (const [id, node] of wallNodes) {
        if (!activeIds.has(id)) {
          wallsGroup.remove(node);
          const poolKey = String(node.userData.poolKey ?? node.userData.skillId ?? "wall");
          if (!wallPool.release(poolKey, node)) disposeObject(node);
          wallNodes.delete(id);
        }
      }
      currentGame.walls.forEach((wall) => {
        let node = wallNodes.get(wall.id);
        if (!node) {
          const width = wall.max.x - wall.min.x;
          const depth = wall.max.y - wall.min.y;
          const poolKey = `${wall.skillId}:${Math.round(width)}:${Math.round(depth)}`;
          node = wallPool.acquire(poolKey, () => new THREE.Group(), () => {
            const minimal = new THREE.Group();
            const block = mesh(new THREE.BoxGeometry(width, 45, depth), basic(Number.parseInt(wall.color.slice(1), 16) || 0xc99a5b));
            block.position.y = 24; minimal.add(block); return minimal;
          });
          node.userData.poolKey = poolKey;
          node.userData.skillId = wall.skillId;
          if (node.children.length === 0) {
            const wallMesh = mesh(new THREE.BoxGeometry(width, 45, depth), material(Number.parseInt(wall.color.slice(1), 16) || 0x5c6da1, { roughness: 0.68 }));
            wallMesh.position.y = 24;
            wallMesh.castShadow = true;
            node.add(wallMesh);
            const edge = mesh(new THREE.BoxGeometry(width + 6, 3, depth + 6), basic(0xf4d35e, 0.55));
            edge.position.y = 48;
            node.add(edge);
          }
          wallsGroup.add(node);
          wallNodes.set(wall.id, node);
        }
        node.position.set((wall.min.x + wall.max.x) / 2 - WORLD_CENTER.x, 0, (wall.min.y + wall.max.y) / 2 - WORLD_CENTER.y);
      });
    }

    function syncEffects(currentGame: GameState, elapsed: number): void {
      const relevantEvents = currentGame.events.filter((event) => currentGame.tick - event.tick <= 42 && (event.position || event.targetId));
      const activeIds = new Set(relevantEvents.map((event) => event.id));
      for (const [id, node] of effectNodes) {
        if (!activeIds.has(id)) {
          effectsGroup.remove(node);
          const poolKey = node.userData.poolKey ?? node.userData.kind ?? "impact";
          if (!effectPool.release(poolKey, node)) disposeObject(node);
          effectNodes.delete(id);
        }
      }
      for (const event of relevantEvents) {
        const age = Math.max(0, currentGame.tick - event.tick);
        const targetPlayer = event.targetId ? currentGame.players[event.targetId] : undefined;
        const point = event.position ?? targetPlayer?.position;
        if (!point) continue;
        const position = worldPosition(point.x, point.y);
        const skillId = event.sourceDefinitionId;
        const skill = skillId ? skillsById[skillId] : undefined;
        const color = colorForElement(skill?.element ?? (event.tags[0] ?? "fire").toLowerCase());
        let node = effectNodes.get(event.id);
        if (!node) {
          const poolKey = event.type === "INTERACTION" && skill ? `skill:${skill.id}` : `impact:${event.type}:${color}`;
          const isImpact = ["DAMAGE", "COLLISION", "IMPULSE", "KO", "HAZARD_ENTER"].includes(event.type);
          if (!isImpact && !(event.type === "INTERACTION" && skill)) continue;
          node = effectPool.acquire(poolKey, () => {
            if (event.type === "INTERACTION" && skill?.id === "fire-flare-burst") return createImpactEffect(event.id, position, color, "METEOR_IMPACT");
            if (isImpact) return createImpactEffect(event.id, position, color, event.type);
            if (!skill) throw new Error("Effect pool requested without a skill");
            return createElementalEffect(event.id, position, color, skill.element, getSkillTuning(skill.id).behavior, skill.id);
          }) ?? undefined;
          if (!node) continue;
          node.userData.poolKey = poolKey;
          node.userData.poolOrigin ??= (node.userData.target ?? position).clone();
          node.userData.eventId = event.id;
          node.position.x = position.x - node.userData.poolOrigin.x;
          node.position.z = position.z - node.userData.poolOrigin.z;
          if (node.userData.ring) {
            node.userData.ring.scale.setScalar(1);
            (node.userData.ring.material as THREE.MeshBasicMaterial).opacity = .72;
          }
          if (node.userData.meteor) node.userData.meteor.visible = true;
          effectsGroup.add(node);
          effectNodes.set(event.id, node);
        }
        if (node.userData.kind === "meteor") {
          const progress = THREE.MathUtils.clamp(age / 27, 0, 1);
          const meteor = node.userData.meteor;
          if (meteor) {
            meteor.position.y = (1 - progress) * 230;
            meteor.rotation.y = elapsed * 0.002;
            meteor.visible = progress < 0.92;
          }
          const ring = node.userData.ring;
          if (ring) { ring.scale.setScalar(0.66 + progress * 0.8); (ring.material as THREE.MeshBasicMaterial).opacity = 0.2 + progress * 0.6; }
        } else {
          const ring = node.userData.ring;
          const progress = THREE.MathUtils.clamp(age / 24, 0, 1);
          if (node.userData.kind === "METEOR_IMPACT") for(const child of node.children){
            const origin=child.userData.origin as THREE.Vector3 | undefined;
            if(origin){const center=node.userData.target!;child.position.set(center.x+(origin.x-center.x)*(1+progress*4),origin.y+Math.sin(progress*Math.PI)*130,center.z+(origin.z-center.z)*(1+progress*4));child.rotation.x=progress*4;child.scale.setScalar(1-progress*.8);}
          }
          if (ring) { ring.scale.setScalar(0.6 + progress * 1.2); (ring.material as THREE.MeshBasicMaterial).opacity = (1 - progress) * 0.8; }
        }
      }
    }

    function resize(): void {
      const rect = arenaCanvas.getBoundingClientRect();
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
      renderer.setSize(width, height, false);
      const aspect = width / height;
      const viewHeight = Math.max(initialGame.arena.height * .98, initialGame.arena.width / aspect * 1.04) / Math.max(0.58, zoomRef.current);
      camera.left = (-viewHeight * aspect) / 2;
      camera.right = (viewHeight * aspect) / 2;
      camera.top = viewHeight / 2;
      camera.bottom = -viewHeight / 2;
      camera.updateProjectionMatrix();
      resizeRequestedRef.current = false;
    }

    const observer = new ResizeObserver(() => { resizeRequestedRef.current = true; });
    observer.observe(arenaCanvas);
    resize();
    let frame = 0;
    const render = (elapsed: number) => {
      const currentGame = gameRef.current;
      if (resizeRequestedRef.current) resize();
      const nextPreviewSignature = previewSignature(previewRef.current);
      if (nextPreviewSignature !== lastPreviewSignature) {
        updatePreview(previewGroup, previewRef.current);
        lastPreviewSignature = nextPreviewSignature;
      }
      const movePoint=moveTargetRef.current;
      moveMarker.visible=!!movePoint;
      if(movePoint){moveMarker.position.copy(worldPosition(movePoint.x,movePoint.y,GROUND_Y+4));moveMarker.scale.setScalar(1+Math.sin(elapsed*.009)*.12);}
      syncFalling(currentGame);
      syncPlayers(currentGame, elapsed);
      syncProjectiles(currentGame);
      syncFields(currentGame);
      syncWalls(currentGame);
      syncEffects(currentGame, elapsed);
      arenaWorld.animate(elapsed, currentGame);
      const wind = currentGame.environmental.phase === "active" ? 1 : currentGame.environmental.phase === "warning" ? 0.6 : 0.25;
      blueFill.intensity = 52 + wind * 36;
      const windAngle = Math.atan2(currentGame.environmental.direction.y, currentGame.environmental.direction.x);
      windGroup.rotation.y = -windAngle;
      windGroup.visible = currentGame.environmental.phase !== "calm";
      windGroup.children.forEach((child, index) => {
        const gust = child as THREE.Mesh;
        const phase = Number(gust.userData.phase ?? index);
        const travelSpan = currentGame.arena.width + 240;
        const travel = (elapsed * (currentGame.environmental.phase === "active" ? 0.34 : 0.15) + phase * 160) % travelSpan;
        gust.position.x = -currentGame.arena.width / 2 - 120 + travel;
        gust.position.z = Number(gust.userData.baseZ ?? 0) + Math.sin(elapsed * 0.002 + phase) * 24;
        (gust.material as THREE.MeshBasicMaterial).opacity = currentGame.environmental.phase === "active" ? 0.36 : 0.18;
      });
      renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      chibis.forEach((node) => node.userData.controller?.dispose());
      clearGroup(playersGroup);
      fallingNodes.forEach(node=>{scene.remove(node);disposeObject(node);});fallingNodes.clear();scene.remove(moveMarker);disposeObject(moveMarker);
      clearGroup(projectilesGroup);
      clearGroup(fieldsGroup);
      clearGroup(wallsGroup);
      clearGroup(effectsGroup);
      clearGroup(previewGroup);
      clearGroup(windGroup);
      projectilePool.dispose(disposeObject);
      fieldPool.dispose(disposeObject);
      wallPool.dispose(disposeObject);
      effectPool.dispose(disposeObject);
      disposeObject(arenaWorld.root);
      arenaCanvas.removeEventListener("webglcontextlost", handleContextLost);
      arenaCanvas.removeEventListener("webglcontextrestored", handleContextRestored);
      renderer.dispose();
      pointerToWorldRef.current = () => null;
    };
  }, []);

  const aimFromPointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.pointerType === "touch") return;
    const point = pointerToWorldRef.current(event.clientX, event.clientY);
    if (point) onAimChange(point);
  };
  return <canvas ref={canvasRef} className="arena-canvas arena-3d-canvas" data-testid="arena-canvas" data-renderer="checking" onPointerMove={aimFromPointer} onPointerDown={(event) => { aimFromPointer(event); onPointerDown(event); }} onPointerUp={onPointerUp} onPointerCancel={onPointerCancel} onContextMenu={event => event.preventDefault()} onPointerLeave={onPointerLeave} onWheel={onWheel} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} aria-label="3D Windfall Ring battle arena" />;
}
