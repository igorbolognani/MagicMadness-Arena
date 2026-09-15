import { useEffect, useState } from "react";
import { heroDefinitions, skillDefinitions, type HeroId } from "@mma/content";
import { getSkillTuning, PHYSICS_BASELINE } from "@mma/balance";
import { SkillIcon } from "./GameIcon";

type Journey = { tutorialStep: number; matches: Array<{ matchId: string; placement?: number }> };
const steps = [
  { path: "/game", title: "Welcome to the Meridian", text: "This is your home between battles. Your chosen hero stays with your account. First, meet the four elemental starters.", next: "/game/heroes", action: "Meet my heroes" },
  { path: "/game/heroes", title: "Choose your first fighter", text: "Select a hero, then inspect each spell below. Fire pressures, Water controls, Earth holds ground and Air displaces. You can change starters freely.", next: "/game/play", action: "Explore the arena" },
  { path: "/game/play", title: "Learn before the first knockout", text: "Right click to move, select a spell with QWER, then hold and release left click to cast. Movement continues while casting. Space dashes; 1/2 use potions. On touch, use the left stick and drag a spell. Escape cancels freely. Practice does not award account XP.", next: "/game/profile", action: "See my progression" },
  { path: "/game/profile", title: "Your journey continues here", text: "Verified battles grow your account toward level 30. Talents unlock at 10, 20 and 30. Advanced systems have their own pages; their locks explain what is still required.", next: "/game/play", action: "Ready to practice" },
] as const;

export function ClientJourney({ accountId, path, navigate, dev }: { accountId: string; path: string; navigate: (path: string) => void; dev: boolean }) {
  const [journey, setJourney] = useState<Journey | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function load() {
    setError("");
    try {
      if (dev) { setJourney({ tutorialStep: 0, matches: [] }); return; }
      const response = await fetch("/api/account/journey", { credentials: "include" });
      if (!response.ok) throw new Error();
      setJourney(await response.json() as Journey);
    } catch { setError("Your guide could not be loaded. Retry when the connection returns."); }
  }
  useEffect(() => { setJourney(null); void load(); }, [accountId]);
  const step = journey ? steps[journey.tutorialStep] : undefined;
  useEffect(() => {
    const target = step ? document.querySelector(`.game-shell-sidebar a[href="${step.path}"]`) : null;
    target?.classList.add("journey-target");
    return () => { target?.classList.remove("journey-target"); };
  }, [step, path]);
  if (error) return <aside className="journey-guide" role="status"><p>{error}</p><button onClick={() => void load()}>Retry guide</button></aside>;
  if (!step || !journey) return null;
  async function advance() {
    if (!journey || !step) return;
    if (path !== step.path) { navigate(step.path); return; }
    setSaving(true);
    try {
      const next = { ...journey, tutorialStep: journey.tutorialStep + 1 };
      if (!dev) {
        const response = await fetch("/api/account/journey", { method: "PATCH", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ tutorialStep: next.tutorialStep }) });
        if (!response.ok) throw new Error();
        setJourney(await response.json() as Journey);
      } else setJourney(next);
      navigate(step.next);
    } catch { setError("Your guide could not be saved. Your current step is preserved."); }
    finally { setSaving(false); }
  }
  return <aside className="journey-guide" aria-label="First journey guide"><div className="journey-number">0{journey.tutorialStep + 1}<small>/ 04</small></div><div><span className="mini-label">FIRST JOURNEY</span><h2>{step.title}</h2><p>{step.text}</p></div><button className="primary-button compact" disabled={saving} onClick={() => void advance()}>{saving ? "Saving…" : path === step.path ? step.action : "Return to this step"} →</button></aside>;
}

export function Spellbook({ heroId }: { heroId: HeroId }) {
  const hero = heroDefinitions.find(entry => entry.id === heroId)!;
  const [slot, setSlot] = useState(0);
  const skill = skillDefinitions.find(entry => entry.id === hero.skillIds[slot])!;
  const tuning = getSkillTuning(skill.id);
  return <section className="spellbook" style={{ "--hero-color": hero.color } as React.CSSProperties}>
    <div className="spellbook-title"><p className="eyebrow">{hero.name.toUpperCase()} · SPELLBOOK</p><h2>Know your next move.</h2><p>Values below are read from the same balance data used in battle.</p></div>
    <div className="spell-tabs" role="tablist" aria-label="Hero spells">{hero.skillIds.map((id, index) => { const entry = skillDefinitions.find(value => value.id === id)!; return <button key={id} role="tab" aria-selected={index === slot} onClick={() => setSlot(index)}><SkillIcon behavior={getSkillTuning(id).behavior} element={hero.element} skillId={id} /><span><small>SPELL {index + 1}</small>{entry.name}</span></button>; })}</div>
    <article className="spell-detail" role="tabpanel"><div className="spell-emblem"><SkillIcon behavior={tuning.behavior} element={hero.element} skillId={skill.id} /></div><div><span className="mode-tag">{tuning.behavior.toUpperCase()} · STARTER KIT</span><h3>{skill.name}</h3><p>{skill.summary}</p><div className="spell-numbers">{[["Damage", tuning.damage], ["Mana", tuning.manaCost], ["Cooldown", `${tuning.cooldown}s`], ["Range", tuning.range], ["Impact radius", tuning.effectRadius], ["Impulse", tuning.knockback]].map(([label, value]) => <div key={label}><small>{label}</small><strong>{value}</strong></div>)}</div><p className="spell-rule">{tuning.projectileBounces > 0 ? `${tuning.projectileBounces} wall bounce. ` : ""}{tuning.status ? `${tuning.status} · ${tuning.statusDuration}s. ` : ""}{tuning.lifetime > 0 ? `Duration up to ${tuning.lifetime}s. ` : ""}Hold to preview. Release to cast. Cancel spends no mana.</p></div></article>
    <div className="spell-utilities"><span>Dash <b>{PHYSICS_BASELINE.dashDistance} units / {PHYSICS_BASELINE.dashCooldown}s</b></span><span>Health potion <b>+{PHYSICS_BASELINE.healthPotionAmount} HP</b></span><span>Mana potion <b>+{PHYSICS_BASELINE.manaPotionAmount} MP</b></span><span>Lava <b>{PHYSICS_BASELINE.hazardDamagePerSecond} HP/s</b></span></div>
  </section>;
}

export function CollectionRoom({ level }: { level: number }) {
  const [selected, select] = useState(heroDefinitions[0]!);
  const [tab, setTab] = useState<"summon" | "inventory" | "rules">("summon");
  return <section className="collection-room"><p className="eyebrow">COLLECTION · THE ELEMENTAL GATE</p><h1>Answer the call.</h1><div className="collection-tabs">{(["summon", "inventory", "rules"] as const).map(value => <button key={value} aria-pressed={tab === value} onClick={() => setTab(value)}>{value}</button>)}</div>
    {tab === "summon" && <div className="summon-chamber" style={{ "--hero-color": selected.color } as React.CSSProperties}><div className="summon-orbit"><span>✦</span><small>{selected.element}</small></div><div><span className="mode-tag">ELEMENTAL DISCOVERY</span><h2>{selected.name}</h2><p>{selected.summary}</p><div className="summon-roster">{heroDefinitions.map(hero => <button key={hero.id} aria-pressed={hero.id === selected.id} onClick={() => select(hero)}>{hero.name}</button>)}</div><button className="primary-button" disabled>Summoning not open yet</button><p className="muted-copy">Account level {level}. Summoning opens when the reward economy is enabled. Tickets, rates and purchases are not active in this build.</p></div></div>}
    {tab === "inventory" && <div className="inventory-grid">{heroDefinitions.map(hero => <article key={hero.id} style={{ "--hero-color": hero.color } as React.CSSProperties}><span className="mini-label">STARTER · AVAILABLE</span><h2>{hero.name}</h2><p>{hero.summary}</p><strong>Free starter access</strong></article>)}</div>}
    {tab === "rules" && <div className="collection-rules"><h2>Discovery, without purchased victories.</h2><p>New heroes expand your play styles. Duplicate heroes do not add direct combat power. Earned currency, ticket conversion, banner rates and guarantees will be shown here before summoning opens.</p><p>There is no active payment or currency balance to spend yet.</p></div>}
  </section>;
}

export function AccountRecordPanel({ experience, level }: { experience: number; level: number }) {
  const [records, setRecords] = useState<Array<{ matchId: string; placement: number; xp: number; playedAt: string }> | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    void fetch("/api/account/journey", { credentials: "include" }).then(async response => {
      if (!response.ok) throw new Error();
      setRecords((await response.json() as { matches: NonNullable<typeof records> }).matches);
    }).catch(() => setError(true));
  }, []);
  return <section className="account-record-panel"><div className="account-xp"><span className="mini-label">ACCOUNT PROGRESSION</span><h2>Level {level} / 30</h2><div className="progress-track"><span style={{ width: `${level >= 30 ? 100 : experience % 1000 / 10}%` }} /></div><p>{level >= 30 ? "Account level cap reached" : `${1000 - experience % 1000} XP to level ${level + 1}`} · verified battle rewards</p></div><h2>Recent battles</h2>{error ? <p>Match records are unavailable. Reopen your profile to retry.</p> : !records ? <p>Loading match records…</p> : records.length === 0 ? <p>Your first verified battle will appear here. Practice does not create an account result.</p> : <div className="match-records">{records.map(record => <article key={record.matchId}><strong>#{record.placement}</strong><span>{new Date(record.playedAt).toLocaleDateString()}</span><b>+{record.xp} XP</b></article>)}</div>}</section>;
}
