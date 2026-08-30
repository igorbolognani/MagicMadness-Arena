import { describe, expect, it } from "vitest";
import { CONTENT_VERSION, bossDefinitions, expandedElementDefinitions, heroDefinitions, historyChapters, historyStages, runeDefinitions, skillDefinitions, talentNodes, validateCanonicalContent } from "./index";

describe("canonical content", () => {
  it("validates versioned starter content and references", () => {
    validateCanonicalContent();
    expect(CONTENT_VERSION).toMatch(/^content-/);
    expect(heroDefinitions).toHaveLength(4);
    expect(skillDefinitions).toHaveLength(16);
    expect(historyChapters).toHaveLength(4);
    expect(bossDefinitions[0]?.activeSkills).toHaveLength(5);
    expect(bossDefinitions[0]?.phases).toHaveLength(3);
    expect(historyStages.find((stage) => stage.purpose === "boss")?.bossId).toBe("cinder-warden");
    expect(expandedElementDefinitions).toHaveLength(6);
    expect(talentNodes.length).toBeGreaterThan(0);
    expect(runeDefinitions.length).toBeGreaterThan(0);
  });

  it("keeps the four starters mechanically distinct", () => {
    expect(new Set(heroDefinitions.map((hero) => hero.element)).size).toBe(4);
    expect(new Set(heroDefinitions.map((hero) => hero.primaryClass)).size).toBeGreaterThan(1);
  });
});
