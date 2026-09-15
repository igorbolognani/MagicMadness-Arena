export type SkillVfxPackage = {
  skillId: string;
  iconMark: string;
  anticipation: "focus" | "gather" | "brace" | "spin";
  origin: "hand" | "focus" | "ground" | "body";
  preview: "line" | "circle" | "trail" | "bounce" | "pull" | "field" | "wall" | "arc" | "dash";
  motion: string;
  impact: string;
  dissipation: string;
  poolKey: string;
  maxInstances: number;
};

const entries: SkillVfxPackage[] = [
  ["fire-ember-bolt","◆","focus","focus","line","ember dart","spark burst","ash motes",18],
  ["fire-flare-burst","✦","gather","ground","circle","falling meteor","radial flare","cinder ring",8],
  ["fire-scorch-trail","⌁","spin","body","trail","flame lane","licking flames","smoke ribbon",6],
  ["fire-solar-orb","☉","gather","focus","bounce","solar orbit","corona blast","ember halo",8],
  ["water-pressure-jet","➟","focus","hand","line","pressure lance","splash fork","droplet wake",18],
  ["water-undertow","↯","spin","ground","pull","inward spiral","whirlpool pull","foam rings",8],
  ["water-tide-field","≋","gather","ground","field","tide basin","wave pulse","receding rings",6],
  ["water-wave-wall","∿","brace","ground","wall","rising crest","breaker wall","falling spray",6],
  ["earth-stone-shard","⬖","brace","hand","line","stone spear","shard fan","dust chips",18],
  ["earth-bulwark","▰","brace","ground","wall","rising slabs","fortified edge","settling dust",6],
  ["earth-quake","⌗","brace","ground","circle","fissure spokes","ground lift","rockfall",8],
  ["earth-boulder","⬣","gather","hand","arc","heavy arc","crater burst","debris tumble",8],
  ["air-gust","➤","focus","hand","line","gust ribbon","pressure bloom","wind threads",18],
  ["air-vortex","◎","spin","ground","pull","spiral funnel","vortex pull","loose ribbons",8],
  ["air-wind-shear","◖","spin","focus","arc","crescent blade","split gust","feather trails",12],
  ["air-updraft","⇧","gather","body","dash","vertical wake","lift funnel","floating motes",8],
].map(([skillId,iconMark,anticipation,origin,preview,motion,impact,dissipation,maxInstances]) => ({ skillId,iconMark,anticipation,origin,preview,motion,impact,dissipation,poolKey:`skill:${skillId}`,maxInstances })) as SkillVfxPackage[];

export const skillVfxManifest: Record<string, SkillVfxPackage> = Object.fromEntries(entries.map((entry) => [entry.skillId, entry]));

export function getSkillVfxPackage(skillId: string): SkillVfxPackage {
  const value = skillVfxManifest[skillId];
  if (!value) throw new Error(`Missing skill VFX package: ${skillId}`);
  return value;
}
