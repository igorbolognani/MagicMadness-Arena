export const HERO_ANIMATION_CLIPS = [
  "idle", "movement", "cast_anticipation", "cast_release", "hit_reaction",
  "knockback", "rising", "airborne", "falling", "landing", "death",
  "respawn", "victory",
] as const;

export type HeroAnimationClip = (typeof HERO_ANIMATION_CLIPS)[number];

export type HeroAssetPackage = {
  visualPackageId: string;
  heroId: "fire-ember" | "water-tide" | "earth-bastion" | "air-gale";
  glb: string;
  textures: { baseColor: string };
  materials: readonly string[];
  scale: number;
  orientationY: number;
  groundOffset: number;
  collisionPresentationRadius: number;
  deterministicCollisionSource: "game-core.player.radius";
  animations: Record<HeroAnimationClip, string>;
  budget: { glbBytes: number; textureBytes: number };
};

const animations = Object.fromEntries(HERO_ANIMATION_CLIPS.map((clip) => [clip, clip])) as Record<HeroAnimationClip, string>;

export const heroAssetManifest: Record<string, HeroAssetPackage> = {
  "hero-ember-chibi-glb-v3": { visualPackageId: "hero-ember-chibi-glb-v3", heroId: "fire-ember", glb: "/assets/heroes/fire-ember/fire-ember.glb", textures: { baseColor: "/assets/textures/heroes/fire-ember-albedo.png" }, materials: ["Elemental cloth", "Elemental armor", "Skin", "Elemental emissive", "Face"], scale: 1, orientationY: 0, groundOffset: 0, collisionPresentationRadius: 34, deterministicCollisionSource: "game-core.player.radius", animations, budget: { glbBytes: 451948, textureBytes: 2200 } },
  "hero-tide-chibi-glb-v3": { visualPackageId: "hero-tide-chibi-glb-v3", heroId: "water-tide", glb: "/assets/heroes/water-tide/water-tide.glb", textures: { baseColor: "/assets/textures/heroes/water-tide-albedo.png" }, materials: ["Elemental cloth", "Elemental armor", "Skin", "Elemental emissive", "Face"], scale: 1, orientationY: 0, groundOffset: 0, collisionPresentationRadius: 35, deterministicCollisionSource: "game-core.player.radius", animations, budget: { glbBytes: 488728, textureBytes: 2297 } },
  "hero-bastion-chibi-glb-v3": { visualPackageId: "hero-bastion-chibi-glb-v3", heroId: "earth-bastion", glb: "/assets/heroes/earth-bastion/earth-bastion.glb", textures: { baseColor: "/assets/textures/heroes/earth-bastion-albedo.png" }, materials: ["Elemental cloth", "Elemental armor", "Skin", "Elemental emissive", "Face"], scale: 1, orientationY: 0, groundOffset: 0, collisionPresentationRadius: 42, deterministicCollisionSource: "game-core.player.radius", animations, budget: { glbBytes: 504712, textureBytes: 2164 } },
  "hero-gale-chibi-glb-v3": { visualPackageId: "hero-gale-chibi-glb-v3", heroId: "air-gale", glb: "/assets/heroes/air-gale/air-gale.glb", textures: { baseColor: "/assets/textures/heroes/air-gale-albedo.png" }, materials: ["Elemental cloth", "Elemental armor", "Skin", "Elemental emissive", "Face"], scale: 1, orientationY: 0, groundOffset: 3, collisionPresentationRadius: 36, deterministicCollisionSource: "game-core.player.radius", animations, budget: { glbBytes: 555804, textureBytes: 2163 } },
};

export function getHeroAssetPackage(visualPackageId: string): HeroAssetPackage {
  const asset = heroAssetManifest[visualPackageId];
  if (!asset) throw new Error(`Unknown hero visual package: ${visualPackageId}`);
  return asset;
}

export function validateHeroAssetManifest(): string[] {
  const errors: string[] = [];
  for (const [id, asset] of Object.entries(heroAssetManifest)) {
    if (id !== asset.visualPackageId) errors.push(`${id}: package id mismatch`);
    if (!asset.glb.endsWith(".glb")) errors.push(`${id}: GLB path required`);
    for (const clip of HERO_ANIMATION_CLIPS) if (!asset.animations[clip]) errors.push(`${id}: missing ${clip}`);
    if (asset.budget.glbBytes > 650_000) errors.push(`${id}: GLB exceeds 650 KB mobile budget`);
    if (asset.budget.textureBytes > 128_000) errors.push(`${id}: texture exceeds 128 KB mobile budget`);
  }
  return errors;
}
