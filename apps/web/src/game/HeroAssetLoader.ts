import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { HeroDefinition } from "@mma/content";
import { HeroAnimationController } from "./animationController";
import { AssetPromiseCache } from "./AssetPromiseCache";
import { getHeroAssetPackage, heroAssetManifest } from "./heroAssetManifest";

const loader = new GLTFLoader();
const cache = new AssetPromiseCache<GLTF>();

const textureKeys = ["map", "normalMap", "roughnessMap", "metalnessMap", "emissiveMap", "alphaMap", "aoMap"] as const;

function cloneMaterial(source: THREE.Material): THREE.Material {
  const material = source.clone() as THREE.MeshStandardMaterial;
  for (const key of textureKeys) {
    const texture = material[key];
    if (texture) material[key] = texture.clone();
  }
  if (material.map) material.map.colorSpace = THREE.SRGBColorSpace;
  if (material.emissiveMap) material.emissiveMap.colorSpace = THREE.SRGBColorSpace;
  if (material.normalMap) material.normalMap.colorSpace = THREE.NoColorSpace;
  if (material.roughnessMap) material.roughnessMap.colorSpace = THREE.NoColorSpace;
  if (material.metalnessMap) material.metalnessMap.colorSpace = THREE.NoColorSpace;
  material.emissiveIntensity = Math.min(material.emissiveIntensity, .72);
  material.transparent = material.opacity < .999;
  material.depthWrite = !material.transparent;
  material.needsUpdate = true;
  return material;
}

function loadPackage(visualPackageId: string): Promise<GLTF> {
  const asset = getHeroAssetPackage(visualPackageId);
  return cache.get(visualPackageId, () => loader.loadAsync(asset.glb).then((gltf) => {
      gltf.scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach((entry) => {
          const material = entry as THREE.MeshStandardMaterial;
          if (material.map) material.map.colorSpace = THREE.SRGBColorSpace;
          if (material.normalMap) material.normalMap.colorSpace = THREE.NoColorSpace;
          if (material.roughnessMap) material.roughnessMap.colorSpace = THREE.NoColorSpace;
        });
      });
      return gltf;
    }));
}

export type LoadedHeroAsset = {
  object: THREE.Group;
  controller: HeroAnimationController;
  animations: THREE.AnimationClip[];
};

export async function instantiateHeroAsset(hero: HeroDefinition): Promise<LoadedHeroAsset> {
  const asset = getHeroAssetPackage(hero.visualPackageId);
  const gltf = await loadPackage(hero.visualPackageId);
  const object = clone(gltf.scene) as THREE.Group;
  object.traverse((entry) => {
    const mesh = entry as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry = mesh.geometry.clone();
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(cloneMaterial) : cloneMaterial(mesh.material);
  });
  object.name = `${hero.id}-asset-instance`;
  object.scale.setScalar(asset.scale);
  object.rotation.y = asset.orientationY;
  object.position.y = asset.groundOffset;
  object.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(object);
  if (Number.isFinite(bounds.min.y)) object.position.y += asset.groundOffset - bounds.min.y;
  object.userData.visualPackageId = hero.visualPackageId;
  object.userData.assetSource = asset.glb;
  return { object, animations: gltf.animations, controller: new HeroAnimationController(object, gltf.animations) };
}

export async function preloadHeroAssets(ids = Object.keys(heroAssetManifest)): Promise<void> {
  await Promise.all(ids.map((id) => loadPackage(id).then(() => undefined)));
}

export function clearHeroAssetCache(): void {
  cache.clear();
}

export function heroAssetCacheStats(): { entries: number } {
  return { entries: cache.size() };
}
