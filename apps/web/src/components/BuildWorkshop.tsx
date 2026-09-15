import { useEffect, useState } from "react";
import { TALENT_CHOICES, RUNE_CHOICES, RUNE_SLOT_LEVELS, tuneAccountSkill, getSkillTuning, validBuild } from "@mma/balance";
import { heroDefinitions, type HeroId } from "@mma/content";

export function BuildWorkshop({ kind, level, heroId, dev }: { kind: "talents" | "runes"; level: number; heroId: HeroId; dev: boolean }) {
  const [build, setBuild] = useState<{ talents: string[]; runes: string[] } | null>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [dirty, setDirty] = useState(false);
  async function load() {
    try {
      const response = await fetch("/api/account/journey", { credentials: "include" });
      if (!response.ok) throw new Error();
      const value = await response.json() as { talents: string[]; runes: string[] };
      setBuild({ talents: value.talents, runes: value.runes }); setMessage("");
    } catch {
      if (dev) setBuild({ talents: [], runes: [] });
      else setMessage("Your saved build is unavailable. Retry to load it safely.");
    }
  }
  useEffect(() => { void load(); }, []);
  const hero = heroDefinitions.find(item => item.id === heroId)!;
  const base = getSkillTuning(hero.skillIds[0]!);
  const tuned = tuneAccountSkill(base, { accountLevel: level, talents: build?.talents ?? [], runes: build?.runes ?? [] });
  function chooseTalent(id: string) {
    if (!build) return;
    const choice = TALENT_CHOICES.find(item => item.id === id)!;
    const others = build.talents.filter(value => TALENT_CHOICES.find(item => item.id === value)?.level !== choice.level);
    setBuild({ ...build, talents: build.talents.includes(id) ? others : [...others, id] }); setDirty(true); setMessage("");
  }
  function chooseRune(id: string) {
    if (!build) return;
    const next = { ...build, runes: build.runes.includes(id) ? build.runes.filter(value => value !== id) : [...build.runes, id] };
    if (!validBuild({ ...next, accountLevel: level })) { setMessage("All unlocked rune slots are occupied. Remove a rune before choosing another."); return; }
    setBuild(next); setDirty(true); setMessage("");
  }
  async function save() {
    if (!build || dev) return;
    setPending(true);
    try {
      const response = await fetch("/api/account/journey", { method: "PATCH", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify(build) });
      if (!response.ok) throw new Error();
      setDirty(false); setMessage("Build saved. It applies when you enter your next verified battle.");
    } catch { setMessage("Build was not saved. Your choices remain here; try again."); }
    finally { setPending(false); }
  }
  return <section className="build-workshop"><p className="eyebrow">{kind === "talents" ? "TALENT CONSTELLATION" : "RUNE WORKSHOP"} · ACCOUNT LEVEL {level}</p><h1>{kind === "talents" ? "Choose how you grow." : "A strength. A tradeoff."}</h1><p className="build-intro">{kind === "talents" ? "One choice at each milestone. Change your choices freely between battles." : "Three starter runes. Slots unlock through account levels; each rune can be equipped once."} Practice uses the unmodified starter kit.</p>
    {!build ? <button className="outline-button" onClick={() => void load()}>Load saved build</button> : kind === "talents" ? <div className="talent-tree">{[10,20,30].map(milestone => <section key={milestone}><header><span>LEVEL {milestone}</span><b>{level < milestone ? `${milestone-level} levels to unlock` : "Choose one"}</b></header><div>{TALENT_CHOICES.filter(choice => choice.level === milestone).map(choice => <button key={choice.id} disabled={level < milestone || pending} className={build.talents.includes(choice.id) ? "chosen" : ""} aria-pressed={build.talents.includes(choice.id)} onClick={() => chooseTalent(choice.id)}><span className="talent-star">{choice.branch === "Attack" ? "✦" : choice.branch === "Defense" ? "◈" : "⌁"}</span><small>{choice.branch}</small><strong>{choice.name}</strong><p>{choice.description}</p><em>{level < milestone ? `Locked · Lv.${milestone}` : build.talents.includes(choice.id) ? "Selected" : "Choose talent"}</em></button>)}</div></section>)}</div> : <><div className="rune-slots">{RUNE_SLOT_LEVELS.map((threshold,index) => <div key={threshold}><span>◇</span><strong>{level < threshold ? `Unlocks at ${threshold}` : RUNE_CHOICES.find(choice => choice.id === build.runes[index])?.name ?? "Empty slot"}</strong><small>SLOT {index+1}</small></div>)}</div><div className="workshop-runes">{RUNE_CHOICES.map(rune => <article key={rune.id}><div className="rune-symbol">◇</div><h2>{rune.name}</h2><p className="rune-positive">{rune.positive}</p><p className="rune-cost">{rune.tradeoff}</p><small>{rune.compatible}</small><button className="outline-button" disabled={level < 5 || pending} onClick={() => chooseRune(rune.id)}>{level < 5 ? "First slot · Level 5" : build.runes.includes(rune.id) ? "Remove rune" : "Equip rune"}</button></article>)}</div></>}
    {build && <div className="build-save"><div><strong>{hero.name} · Spell 1 preview</strong><p>Damage {base.damage} → {tuned.damage.toFixed(1)} · Mana {base.manaCost} → {tuned.manaCost.toFixed(1)} · Impulse {base.knockback} → {tuned.knockback.toFixed(1)}</p><small>{dirty ? "Unsaved choices" : "Saved account build"}</small></div><button className="primary-button" disabled={!dirty || pending || dev} onClick={() => void save()}>{pending ? "Saving…" : dev ? "Development · no account writes" : "Save build"}</button></div>}
    {message && <p className="build-message" role="status">{message}</p>}
  </section>;
}
