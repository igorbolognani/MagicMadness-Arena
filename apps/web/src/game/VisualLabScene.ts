import * as THREE from "three";
import { heroDefinitions, skillsById, type HeroId } from "@mma/content";
import { instantiateHeroAsset, heroAssetCacheStats, type LoadedHeroAsset } from "./HeroAssetLoader";
import { HERO_ANIMATION_CLIPS, type HeroAnimationClip } from "./heroAssetManifest";
import { getSkillVfxPackage } from "./skillVfxManifest";
import { KeyedObjectPool, VFX_QUALITY_BUDGETS, type VfxQuality } from "./VfxPool";

type PoolName = "projectiles" | "impacts" | "particles" | "rings" | "trails" | "fields" | "walls" | "previews";
type LabNode = THREE.Group & { userData: { poolName?: PoolName; poolKey?: string; role?: string; particleCount?: number } };
type Lease = { poolName: PoolName; key: string; node: LabNode };
type Burst = { skillId: string; age: number; duration: number; origin: THREE.Vector3; target: THREE.Vector3; leases: Lease[] };
type HeroRuntime = { id: HeroId; anchor: THREE.Group; asset: LoadedHeroAsset; skeleton: THREE.SkeletonHelper; shadow: THREE.Mesh };

export type VisualLabMetrics = {
  fps: number;
  frameMs: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  activeObjects: number;
  particleCount: number;
  cacheEntries: number;
  pools: Record<PoolName, ReturnType<KeyedObjectPool<LabNode>["stats"]>>;
};

export type VisualLabAssetState = { heroId: HeroId; visualPackageId: string; state: "loading" | "ready" | "error"; error?: string };

const ELEMENT_COLORS: Record<string, number> = { fire: 0xff6b35, water: 0x35baf6, earth: 0xc99a5b, air: 0xb18cff };
const POOL_NAMES: PoolName[] = ["projectiles", "impacts", "particles", "rings", "trails", "fields", "walls", "previews"];

function standardMaterial(color: number, emissive = 0): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: emissive ? .55 : 0, roughness: .58, metalness: .08 });
}

function transparentMaterial(color: number, opacity: number): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide });
}

function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    const renderable = child as THREE.Mesh;
    renderable.geometry?.dispose();
    const materials = Array.isArray(renderable.material) ? renderable.material : renderable.material ? [renderable.material] : [];
    for (const material of materials) {
      const textured = material as THREE.Material & { map?: THREE.Texture | null; normalMap?: THREE.Texture | null; emissiveMap?: THREE.Texture | null };
      textured.map?.dispose();
      textured.normalMap?.dispose();
      textured.emissiveMap?.dispose();
      material.dispose();
    }
  });
}

function resetNode(node: LabNode): void {
  node.visible = true;
  node.position.set(0, 0, 0);
  node.rotation.set(0, 0, 0);
  node.scale.set(1, 1, 1);
  node.traverse((entry) => {
    entry.visible = true;
    const mesh = entry as THREE.Mesh;
    const values = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
    values.forEach((material) => {
      if ("opacity" in material) material.opacity = Number(material.userData.baseOpacity ?? material.opacity ?? 1);
    });
  });
}

function seededOffset(skillId: string): number {
  return [...skillId].reduce((total, character) => total + character.charCodeAt(0), 0);
}

export class VisualLabScene {
  private readonly scene = new THREE.Scene();
  private readonly perspective = new THREE.PerspectiveCamera(32, 1, 1, 3000);
  private readonly topDown = new THREE.OrthographicCamera(-500, 500, 300, -300, 1, 4000);
  private activeCamera: THREE.Camera = this.perspective;
  private renderer: THREE.WebGLRenderer | null = null;
  private readonly heroGroup = new THREE.Group();
  private readonly vfxGroup = new THREE.Group();
  private readonly windGroup = new THREE.Group();
  private readonly heroes = new Map<HeroId, HeroRuntime>();
  private fifthHero: HeroRuntime | null = null;
  private readonly bursts: Burst[] = [];
  private readonly pools: Record<PoolName, KeyedObjectPool<LabNode>> = {
    projectiles: new KeyedObjectPool({ maxActive: 64, maxActivePerKey: 18, maxIdlePerKey: 8 }),
    impacts: new KeyedObjectPool({ maxActive: 48, maxActivePerKey: 12, maxIdlePerKey: 6 }),
    particles: new KeyedObjectPool({ maxActive: 48, maxActivePerKey: 12, maxIdlePerKey: 6 }),
    rings: new KeyedObjectPool({ maxActive: 96, maxActivePerKey: 16, maxIdlePerKey: 8 }),
    trails: new KeyedObjectPool({ maxActive: 48, maxActivePerKey: 12, maxIdlePerKey: 6 }),
    fields: new KeyedObjectPool({ maxActive: 18, maxActivePerKey: 8, maxIdlePerKey: 4 }),
    walls: new KeyedObjectPool({ maxActive: 16, maxActivePerKey: 8, maxIdlePerKey: 4 }),
    previews: new KeyedObjectPool({ maxActive: 8, maxActivePerKey: 4, maxIdlePerKey: 4 }),
  };
  private quality: VfxQuality = "high";
  private selectedHero: HeroId | "all" = "all";
  private selectedClip: HeroAnimationClip = "idle";
  private clipCue = 0;
  private paused = false;
  private playbackSpeed = 1;
  private zoom = 1;
  private dragging = false;
  private lastPointerX = 0;
  private rotationY = 0;
  private stress = false;
  private stressAccumulator = 0;
  private frame = 0;
  private previousTime = 0;
  private smoothedFrameMs = 16.7;
  private metricAccumulator = 0;
  private resizeObserver: ResizeObserver | null = null;
  private controlHandlers: { pointerDown: (event: PointerEvent) => void; pointerMove: (event: PointerEvent) => void; pointerUp: () => void; wheel: (event: WheelEvent) => void } | null = null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly onAssetState: (state: VisualLabAssetState) => void,
    private readonly onMetrics: (metrics: VisualLabMetrics) => void,
    private readonly onRendererState: (state: "ready" | "unavailable") => void,
  ) {}

  async initialize(): Promise<void> {
    try {
      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
    } catch {
      this.onRendererState("unavailable");
      return;
    }
    this.onRendererState("ready");
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene.background = new THREE.Color(0x070b17);
    this.scene.fog = new THREE.Fog(0x070b17, 760, 1550);
    this.scene.add(this.heroGroup, this.vfxGroup, this.windGroup);
    this.createStage();
    this.createWindSurge();
    this.perspective.position.set(0, 245, 660);
    this.perspective.lookAt(0, 70, 0);
    this.topDown.position.set(0, 1100, 0);
    this.topDown.up.set(0, 0, -1);
    this.topDown.lookAt(0, 0, 0);
    this.attachControls();
    await this.loadHeroes();
    this.applyHeroVisibility();
    this.playClip(this.selectedClip);
    this.frame = requestAnimationFrame((time) => this.render(time));
  }

  private createStage(): void {
    const hemisphere = new THREE.HemisphereLight(0xc9d8ff, 0x101525, 2.4);
    const key = new THREE.DirectionalLight(0xffe4be, 4.4);
    key.position.set(-260, 520, 310);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -520;
    key.shadow.camera.right = 520;
    key.shadow.camera.top = 360;
    key.shadow.camera.bottom = -360;
    this.scene.add(hemisphere, key);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(1100, 720), standardMaterial(0x121a2c));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    const grid = new THREE.GridHelper(1100, 22, 0x4d5f8d, 0x252f49);
    grid.position.y = .6;
    this.scene.add(grid);
    const boundary = new THREE.Mesh(new THREE.RingGeometry(320, 335, 96), transparentMaterial(0x8d75ff, .22));
    boundary.rotation.x = -Math.PI / 2;
    boundary.position.y = 1.5;
    this.scene.add(boundary);
  }

  private createWindSurge(): void {
    for (let index = 0; index < 22; index += 1) {
      const gust = new THREE.Mesh(new THREE.PlaneGeometry(90 + (index % 4) * 30, 4), transparentMaterial(index % 3 ? 0xb996ff : 0xf4f1ff, .28));
      gust.rotation.x = -Math.PI / 2;
      gust.position.set(-520 + (index % 11) * 100, 9 + (index % 3) * 5, -240 + Math.floor(index / 11) * 480);
      gust.userData.phase = index * .63;
      this.windGroup.add(gust);
    }
    this.windGroup.visible = false;
  }

  private async createHeroRuntime(heroId: HeroId, position: THREE.Vector3): Promise<HeroRuntime> {
    const hero = heroDefinitions.find((entry) => entry.id === heroId);
    if (!hero) throw new Error(`Unknown hero ${heroId}`);
    this.onAssetState({ heroId, visualPackageId: hero.visualPackageId, state: "loading" });
    const anchor = new THREE.Group();
    anchor.position.copy(position);
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(38, 40), transparentMaterial(0x010207, .48));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 1.2;
    anchor.add(shadow);
    this.heroGroup.add(anchor);
    try {
      const asset = await instantiateHeroAsset(hero);
      anchor.add(asset.object);
      const skeleton = new THREE.SkeletonHelper(asset.object);
      skeleton.visible = false;
      const skeletonMaterials = Array.isArray(skeleton.material) ? skeleton.material : [skeleton.material];
      skeletonMaterials.forEach((material) => { material.depthTest = false; });
      anchor.add(skeleton);
      this.onAssetState({ heroId, visualPackageId: hero.visualPackageId, state: "ready" });
      return { id: heroId, anchor, asset, skeleton, shadow };
    } catch (error) {
      this.onAssetState({ heroId, visualPackageId: hero.visualPackageId, state: "error", error: error instanceof Error ? error.message : "GLB load failed" });
      this.heroGroup.remove(anchor);
      disposeObject(anchor);
      throw error;
    }
  }

  private async loadHeroes(): Promise<void> {
    const positions = [-225, -75, 75, 225];
    const results = await Promise.allSettled(heroDefinitions.map((hero, index) => this.createHeroRuntime(hero.id, new THREE.Vector3(positions[index] ?? 0, 0, 0))));
    results.forEach((result) => { if (result.status === "fulfilled") this.heroes.set(result.value.id, result.value); });
    const fifth = await this.createHeroRuntime("fire-ember", new THREE.Vector3(0, 0, 150)).catch(() => null);
    if (fifth) { fifth.anchor.visible = false; this.fifthHero = fifth; }
  }

  private attachControls(): void {
    const pointerDown = (event: PointerEvent) => { this.dragging = true; this.lastPointerX = event.clientX; this.canvas.setPointerCapture(event.pointerId); };
    const pointerMove = (event: PointerEvent) => { if (this.dragging) { this.rotationY += (event.clientX - this.lastPointerX) * .012; this.lastPointerX = event.clientX; } };
    const pointerUp = () => { this.dragging = false; };
    const wheel = (event: WheelEvent) => { event.preventDefault(); this.setZoom(this.zoom - event.deltaY * .001); };
    this.canvas.addEventListener("pointerdown", pointerDown);
    this.canvas.addEventListener("pointermove", pointerMove);
    this.canvas.addEventListener("pointerup", pointerUp);
    this.canvas.addEventListener("pointercancel", pointerUp);
    this.canvas.addEventListener("wheel", wheel, { passive: false });
    this.controlHandlers = { pointerDown, pointerMove, pointerUp, wheel };
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.canvas);
    this.resize();
  }

  private resize(): void {
    if (!this.renderer) return;
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    this.renderer.setSize(width, height, false);
    this.perspective.aspect = width / height;
    this.perspective.updateProjectionMatrix();
    const viewHeight = 620 / this.zoom;
    this.topDown.left = -viewHeight * width / height / 2;
    this.topDown.right = viewHeight * width / height / 2;
    this.topDown.top = viewHeight / 2;
    this.topDown.bottom = -viewHeight / 2;
    this.topDown.updateProjectionMatrix();
  }

  setHero(hero: HeroId | "all"): void { this.selectedHero = hero; this.applyHeroVisibility(); }
  private applyHeroVisibility(): void {
    let selected: HeroRuntime | undefined;
    for (const runtime of this.heroes.values()) {
      runtime.anchor.visible = this.selectedHero === "all" || runtime.id === this.selectedHero;
      if (runtime.id === this.selectedHero) selected = runtime;
    }
    if (this.selectedHero !== "all" && selected) selected.anchor.position.set(0, 0, 0);
    else [...this.heroes.values()].forEach((runtime, index) => runtime.anchor.position.set([-225, -75, 75, 225][index] ?? 0, 0, 0));
    if (this.fifthHero) this.fifthHero.anchor.visible = this.stress;
  }

  playClip(clip: HeroAnimationClip): void {
    this.selectedClip = clip;
    this.clipCue += 1;
    const looping = clip === "idle" || clip === "movement" || clip === "airborne" || clip === "victory";
    for (const runtime of [...this.heroes.values(), ...(this.fifthHero ? [this.fifthHero] : [])]) {
      runtime.asset.controller.play({ clip, cueId: `lab-${clip}-${this.clipCue}`, oneShot: !looping, priority: 1 });
    }
  }

  testCrossfade(): void {
    const clips: HeroAnimationClip[] = ["idle", "cast_anticipation", "cast_release", "movement", "hit_reaction", "knockback", "idle"];
    clips.forEach((clip, index) => window.setTimeout(() => this.playClip(clip), index * 520));
  }

  setPaused(paused: boolean): void { this.paused = paused; [...this.heroes.values(), ...(this.fifthHero ? [this.fifthHero] : [])].forEach((runtime) => runtime.asset.controller.setPaused(paused)); }
  setPlaybackSpeed(speed: number): void { this.playbackSpeed = speed; [...this.heroes.values(), ...(this.fifthHero ? [this.fifthHero] : [])].forEach((runtime) => runtime.asset.controller.setPlaybackSpeed(speed)); }
  setZoom(zoom: number): void { this.zoom = THREE.MathUtils.clamp(zoom, .55, 1.65); this.perspective.position.z = 660 / this.zoom; this.resize(); }
  setWireframe(enabled: boolean): void {
    for (const runtime of this.heroes.values()) runtime.asset.object.traverse((entry) => {
      const mesh = entry as THREE.Mesh;
      const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
      materials.forEach((material) => { if ("wireframe" in material) (material as THREE.MeshStandardMaterial).wireframe = enabled; });
    });
  }
  setSkeletonVisible(visible: boolean): void { this.heroes.forEach((runtime) => { runtime.skeleton.visible = visible; }); if (this.fifthHero) this.fifthHero.skeleton.visible = visible; }
  setQuality(quality: VfxQuality): void { this.quality = quality; }
  setBackground(background: "dark" | "light" | "arena"): void {
    const color = background === "light" ? 0xdde5ef : background === "arena" ? 0x13243a : 0x070b17;
    this.scene.background = new THREE.Color(color);
    this.scene.fog = new THREE.Fog(color, 760, 1550);
  }
  setCamera(camera: "showcase" | "top-down"): void { this.activeCamera = camera === "top-down" ? this.topDown : this.perspective; this.resize(); }

  private budget(poolName: PoolName): number {
    const budget = VFX_QUALITY_BUDGETS[this.quality];
    return poolName === "walls" ? 16 : budget[poolName];
  }

  private acquire(poolName: PoolName, key: string, skillId: string): Lease | null {
    const pool = this.pools[poolName];
    if (pool.stats().active >= this.budget(poolName)) return null;
    const node = pool.acquire(key, () => this.createVfxNode(poolName, skillId));
    if (!node) return null;
    resetNode(node);
    node.userData.poolName = poolName;
    node.userData.poolKey = key;
    this.vfxGroup.add(node);
    return { poolName, key, node };
  }

  private createVfxNode(poolName: PoolName, skillId: string): LabNode {
    const skill = skillsById[skillId];
    const pack = getSkillVfxPackage(skillId);
    const color = ELEMENT_COLORS[skill?.element ?? "air"] ?? 0xb18cff;
    const root = new THREE.Group() as LabNode;
    root.userData.role = poolName;
    if (poolName === "rings" || poolName === "previews") {
      const radius = poolName === "previews" ? 70 : 42;
      const ring = new THREE.Mesh(new THREE.RingGeometry(radius - 4, radius, 48), transparentMaterial(color, poolName === "previews" ? .36 : .72));
      ring.rotation.x = -Math.PI / 2;
      ring.material.userData.baseOpacity = ring.material.opacity;
      root.add(ring);
    } else if (poolName === "projectiles") {
      const geometry = skill?.element === "earth" ? new THREE.DodecahedronGeometry(18, 1) : skill?.element === "air" ? new THREE.TorusKnotGeometry(14, 3, 40, 8) : skill?.element === "water" ? new THREE.SphereGeometry(17, 16, 12) : new THREE.IcosahedronGeometry(17, 1);
      const core = new THREE.Mesh(geometry, standardMaterial(color, color));
      root.add(core);
    } else if (poolName === "fields") {
      const disc = new THREE.Mesh(new THREE.CircleGeometry(76, 48), transparentMaterial(color, .2));
      disc.rotation.x = -Math.PI / 2;
      disc.material.userData.baseOpacity = disc.material.opacity;
      const orbit = new THREE.Mesh(new THREE.TorusGeometry(58, 3, 8, 48), transparentMaterial(0xffffff, .42));
      orbit.rotation.x = Math.PI / 2;
      root.add(disc, orbit);
    } else if (poolName === "walls") {
      for (let index = -2; index <= 2; index += 1) {
        const slab = new THREE.Mesh(new THREE.BoxGeometry(30, 64 + (2 - Math.abs(index)) * 14, 18), standardMaterial(index % 2 ? color : 0x7b879d, color));
        slab.position.set(index * 31, slab.geometry.parameters.height / 2, 0);
        root.add(slab);
      }
    } else if (poolName === "impacts") {
      for (let index = 0; index < 8; index += 1) {
        const spark = new THREE.Mesh(new THREE.OctahedronGeometry(6 + index % 3, 0), standardMaterial(index % 2 ? 0xffffff : color, color));
        const angle = index / 8 * Math.PI * 2;
        spark.position.set(Math.cos(angle) * 36, 10 + index % 3 * 8, Math.sin(angle) * 36);
        root.add(spark);
      }
    } else if (poolName === "trails") {
      for (let index = 0; index < 5; index += 1) {
        const mote = new THREE.Mesh(new THREE.SphereGeometry(Math.max(3, 8 - index), 8, 6), transparentMaterial(color, .5 - index * .07));
        mote.position.z = index * 15;
        mote.material.userData.baseOpacity = mote.material.opacity;
        root.add(mote);
      }
    } else if (poolName === "particles") {
      const maximum = 24;
      const positions = new Float32Array(maximum * 3);
      for (let index = 0; index < maximum; index += 1) {
        const angle = index / maximum * Math.PI * 2 + seededOffset(skillId) * .01;
        positions[index * 3] = Math.cos(angle) * (20 + index % 5 * 8);
        positions[index * 3 + 1] = 8 + index % 6 * 8;
        positions[index * 3 + 2] = Math.sin(angle) * (20 + index % 5 * 8);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const points = new THREE.Points(geometry, new THREE.PointsMaterial({ color, size: 7, transparent: true, opacity: .72, depthWrite: false }));
      root.add(points);
      root.userData.particleCount = maximum;
    }
    root.name = `${poolName}:${pack.poolKey}`;
    return root;
  }

  triggerSkill(skillId: string, count = 1): void {
    const skill = skillsById[skillId];
    if (!skill) return;
    const pack = getSkillVfxPackage(skillId);
    const source = this.selectedHero === "all" ? [...this.heroes.values()].find((hero) => hero.id === skill.heroId) : this.heroes.get(this.selectedHero);
    const base = source?.anchor.position ?? new THREE.Vector3();
    const primary: PoolName = pack.preview === "wall" ? "walls" : ["field", "pull", "circle", "trail", "dash"].includes(pack.preview) ? "fields" : "projectiles";
    for (let index = 0; index < count; index += 1) {
      const angle = (seededOffset(skillId) + index * 57) * Math.PI / 180;
      const origin = base.clone().add(new THREE.Vector3(0, 36, 0));
      const target = base.clone().add(new THREE.Vector3(Math.cos(angle) * (130 + index * 12), 2, Math.sin(angle) * (130 + index * 12)));
      const roles: PoolName[] = ["previews", "rings", primary, "impacts", "particles"];
      if (primary === "projectiles" || pack.preview === "trail") roles.push("trails");
      const leases = roles.map((role) => this.acquire(role, `${pack.poolKey}:${role}`, skillId)).filter((lease): lease is Lease => Boolean(lease));
      leases.forEach((lease) => lease.node.position.copy(lease.poolName === "previews" || lease.poolName === "rings" ? origin : target));
      this.bursts.push({ skillId, age: 0, duration: 1.8, origin, target, leases });
    }
  }

  setStress(active: boolean): void { this.stress = active; this.windGroup.visible = active; this.applyHeroVisibility(); }

  private releaseBurst(burst: Burst): void {
    for (const lease of burst.leases) {
      this.vfxGroup.remove(lease.node);
      if (!this.pools[lease.poolName].release(lease.key, lease.node)) disposeObject(lease.node);
    }
  }

  private animateBursts(delta: number, elapsed: number): void {
    for (let index = this.bursts.length - 1; index >= 0; index -= 1) {
      const burst = this.bursts[index];
      if (!burst) continue;
      burst.age += delta;
      const anticipation = Math.min(1, burst.age / .35);
      const travel = THREE.MathUtils.clamp((burst.age - .35) / .55, 0, 1);
      const impact = THREE.MathUtils.clamp((burst.age - .9) / .4, 0, 1);
      const dissipate = THREE.MathUtils.clamp((burst.age - 1.3) / .5, 0, 1);
      for (const lease of burst.leases) {
        const node = lease.node;
        if (lease.poolName === "previews" || lease.poolName === "rings") {
          node.visible = burst.age < .95;
          node.position.copy(burst.origin);
          node.scale.setScalar(.35 + anticipation * .75);
        } else if (lease.poolName === "projectiles" || lease.poolName === "trails") {
          node.visible = burst.age >= .3 && burst.age < 1.15;
          node.position.lerpVectors(burst.origin, burst.target, travel);
          node.rotation.y = elapsed * .003;
        } else if (lease.poolName === "fields" || lease.poolName === "walls") {
          node.visible = burst.age >= .45;
          node.position.copy(burst.target);
          node.scale.y = Math.max(.05, travel);
        } else {
          node.visible = burst.age >= .88;
          node.position.copy(burst.target);
          node.scale.setScalar(.35 + impact * 1.15);
        }
        if (dissipate > 0) {
          node.scale.multiplyScalar(1 - dissipate * .35);
          node.traverse((entry) => {
            const mesh = entry as THREE.Mesh;
            const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
            materials.forEach((material) => { if (material.transparent) material.opacity = Math.max(0, Number(material.userData.baseOpacity ?? .72) * (1 - dissipate)); });
          });
        }
      }
      if (burst.age >= burst.duration) { this.releaseBurst(burst); this.bursts.splice(index, 1); }
    }
  }

  private render(time: number): void {
    if (!this.renderer) return;
    const delta = Math.min(.05, this.previousTime ? (time - this.previousTime) / 1000 : 1 / 60);
    this.previousTime = time;
    const frameMs = delta * 1000;
    this.smoothedFrameMs += (frameMs - this.smoothedFrameMs) * .08;
    if (!this.dragging) this.rotationY += delta * .18;
    for (const runtime of [...this.heroes.values(), ...(this.fifthHero ? [this.fifthHero] : [])]) {
      runtime.asset.controller.update(delta, this.selectedClip === "movement" ? 1.25 : 1);
      runtime.asset.controller.setPaused(this.paused);
      runtime.asset.controller.setPlaybackSpeed(this.playbackSpeed);
      runtime.anchor.rotation.y = this.rotationY;
      runtime.shadow.position.y = 1.2;
    }
    this.animateBursts(delta, time);
    if (this.stress) {
      this.stressAccumulator += delta;
      if (this.stressAccumulator >= .11) {
        this.stressAccumulator = 0;
        const skill = Object.keys(skillsById)[Math.floor(time / 110) % Object.keys(skillsById).length];
        if (skill) this.triggerSkill(skill, 2);
      }
      this.windGroup.children.forEach((child, index) => { child.position.x = -520 + ((time * .18 + index * 83) % 1040); });
    }
    this.renderer.render(this.scene, this.activeCamera);
    this.metricAccumulator += delta;
    if (this.metricAccumulator >= .25) { this.metricAccumulator = 0; this.emitMetrics(); }
    this.frame = requestAnimationFrame((next) => this.render(next));
  }

  private emitMetrics(): void {
    if (!this.renderer) return;
    const poolStats = Object.fromEntries(POOL_NAMES.map((name) => [name, this.pools[name].stats()])) as VisualLabMetrics["pools"];
    const activeObjects = Object.values(poolStats).reduce((sum, stats) => sum + stats.active, 0);
    const particleCount = this.pools.particles.stats().active * (this.quality === "high" ? 24 : this.quality === "medium" ? 14 : 8);
    this.onMetrics({
      fps: this.smoothedFrameMs > 0 ? 1000 / this.smoothedFrameMs : 0,
      frameMs: this.smoothedFrameMs,
      drawCalls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
      geometries: this.renderer.info.memory.geometries,
      textures: this.renderer.info.memory.textures,
      activeObjects,
      particleCount,
      cacheEntries: heroAssetCacheStats().entries,
      pools: poolStats,
    });
  }

  dispose(): void {
    cancelAnimationFrame(this.frame);
    this.resizeObserver?.disconnect();
    const handlers = this.controlHandlers;
    if (handlers) {
      this.canvas.removeEventListener("pointerdown", handlers.pointerDown);
      this.canvas.removeEventListener("pointermove", handlers.pointerMove);
      this.canvas.removeEventListener("pointerup", handlers.pointerUp);
      this.canvas.removeEventListener("pointercancel", handlers.pointerUp);
      this.canvas.removeEventListener("wheel", handlers.wheel);
    }
    this.controlHandlers = null;
    while (this.bursts.length) { const burst = this.bursts.pop(); if (burst) this.releaseBurst(burst); }
    POOL_NAMES.forEach((name) => this.pools[name].dispose(disposeObject));
    for (const runtime of [...this.heroes.values(), ...(this.fifthHero ? [this.fifthHero] : [])]) runtime.asset.controller.dispose();
    disposeObject(this.scene);
    this.renderer?.dispose();
    this.renderer = null;
  }
}

export { HERO_ANIMATION_CLIPS };
