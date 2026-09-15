import { describe, expect, it } from "vitest";
import { HERO_ANIMATION_CLIPS, heroAssetManifest, validateHeroAssetManifest } from "./heroAssetManifest";

describe("hero asset manifest", () => {
  it("maps all four released packages to GLBs and complete animation sets", () => {
    expect(Object.keys(heroAssetManifest)).toHaveLength(4);
    expect(validateHeroAssetManifest()).toEqual([]);
    for (const asset of Object.values(heroAssetManifest)) {
      expect(asset.glb).toMatch(/\.glb$/);
      expect(Object.keys(asset.animations)).toEqual(expect.arrayContaining([...HERO_ANIMATION_CLIPS]));
      expect(asset.deterministicCollisionSource).toBe("game-core.player.radius");
    }
  });
});
