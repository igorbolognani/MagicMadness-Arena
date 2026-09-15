import { getHeroSkill, type PlayerState } from "@mma/game-core";
import type { HeroDefinition } from "@mma/content";
import { getSkillTuning, tuneAccountSkill, SKILL_UNLOCK_LEVELS } from "@mma/balance";
import { SkillIcon } from "../components/GameIcon";
import type { useCombatControls } from "./useCombatControls";

export function CombatControls({ hero, player, controls }: { hero: HeroDefinition; player: PlayerState; controls: ReturnType<typeof useCombatControls> }) {
  return <>
    <div ref={controls.movementPadRef} className="movement-pad" data-testid="move-stick" onPointerDown={controls.beginMove} onPointerMove={controls.movePointer} onPointerUp={controls.endPointer} onPointerCancel={controls.cancelPointer} onLostPointerCapture={controls.cancelPointer}><span className="pad-cross">+</span><span className="pad-caption">MOVE</span></div>
    {controls.heldSkill !== null && <div ref={controls.cancelZoneRef} className={`cast-cancel-zone ${controls.cancelActive ? "active" : ""}`} onPointerDown={controls.cancel} role="button" tabIndex={0} onKeyDown={event => { if (event.key === "Enter") controls.cancel(); }} aria-label="Cancel spell without spending mana">×<small>{controls.cancelActive ? "RELEASE TO CANCEL" : "DRAG HERE TO CANCEL"}</small></div>}
    <div className="combat-controls">
      <div className="skill-row">{([0, 1, 2, 3] as const).map(index => {
        const skill = getHeroSkill(hero.id, index), tuning = tuneAccountSkill(getSkillTuning(skill.id), player.build), cooldown = player.cooldowns[skill.id] ?? 0;
        const locked = !!player.build && player.build.accountLevel < SKILL_UNLOCK_LEVELS[index];
        return <button disabled={locked} key={skill.id} data-testid={`skill-${index + 1}`} className={`skill-button ${controls.heldSkill === index ? "holding" : ""}`} style={{ "--hero-color": hero.color } as React.CSSProperties} title={skill.summary} aria-label={`${skill.name}. Hold and drag to aim; release to cast; drag to cancel zone to cancel.`} onPointerDown={event => controls.beginSkill(event, index)} onPointerMove={controls.dragSkill} onPointerUp={controls.endPointer} onPointerCancel={controls.cancelPointer} onLostPointerCapture={controls.cancelPointer}><span className="skill-key">{index + 1}</span><span className="skill-glyph"><SkillIcon behavior={tuning.behavior} element={hero.element} skillId={skill.id} /></span><small>{locked ? `Lv.${SKILL_UNLOCK_LEVELS[index]}` : cooldown > 0 ? cooldown.toFixed(1) : skill.name}</small>{cooldown > 0 && <span className="cooldown-cover" style={{ height: Math.min(100, cooldown / tuning.cooldown * 100) + "%" }} />}</button>;
      })}</div>
      <div className="utility-row"><button className="utility-button dash-button" onPointerDown={() => controls.fireOneShot("dash")}><strong>⇢</strong><small>DASH · SPACE / RMB</small><em>{player.tacticalCooldown > 0 ? player.tacticalCooldown.toFixed(1) : "READY"}</em></button><button className="utility-button" onPointerDown={() => controls.fireOneShot("healthPotion")}><strong>♥</strong><small>HEALTH · Q</small></button><button className="utility-button" onPointerDown={() => controls.fireOneShot("manaPotion")}><strong>◈</strong><small>MANA · E</small></button></div>
    </div>
  </>;
}
