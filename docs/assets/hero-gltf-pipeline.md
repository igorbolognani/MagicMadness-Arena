# Original hero GLTF pipeline

`tools/asset-pipeline/generate-heroes.mjs` reproducibly generates the four original starter GLBs and 64×64 elemental base-color textures. Blender was checked first and was not installed in this runtime, so the repository uses a dependency-free glTF 2.0 binary exporter rather than leaving Three.js primitives as the normal character path.

Each GLB contains one skinned mesh, an eight-joint hierarchy, inverse bind matrices, five named PBR materials, an external sRGB texture and thirteen animation clips: idle, movement, cast anticipation/release, hit, knockback, rising, airborne, falling, landing, death, respawn and victory.

Runtime loading is defined by `heroAssetManifest.ts` and `HeroAssetLoader.ts`: `GLTFLoader`, promise cache, `SkeletonUtils.clone`, instance-local geometry/material ownership, asynchronous preload, explicit loading/error states and a procedural fallback only after an asset load failure. Arena collision remains `game-core.player.radius`; the manifest's presentation radius is visual metadata only.

Commands:

- `pnpm assets:generate`
- `pnpm assets:validate`

The validator checks GLB header/length, skin/joint count, all required clips and PNG signatures.
