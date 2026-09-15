import { describe, expect, it } from "vitest";
import { skillDefinitions } from "@mma/content";
import { skillVfxManifest } from "./skillVfxManifest";

describe("starter skill VFX packages", () => {
  it("covers every starter skill with a unique identity mark and pool key", () => {
    expect(Object.keys(skillVfxManifest)).toHaveLength(16);
    expect(new Set(Object.values(skillVfxManifest).map((entry) => entry.iconMark)).size).toBe(16);
    for (const skill of skillDefinitions) expect(skillVfxManifest[skill.id]?.poolKey).toBe(`skill:${skill.id}`);
  });
});
