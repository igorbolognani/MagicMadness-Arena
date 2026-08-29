import { useMemo, useState } from "react";
import { heroDefinitions, type HeroId } from "@mma/content";
import { LiveGame } from "./game/LiveGame";

type Screen = "home" | "app" | "play";

const elementGlyph: Record<string, string> = {
  fire: "✦",
  water: "◒",
  earth: "⬟",
  air: "◌",
};

function HeroBadge({ heroId }: { heroId: HeroId }) {
  const hero = heroDefinitions.find((item) => item.id === heroId) ?? heroDefinitions[0];
  if (!hero) return null;
  return (
    <span className="hero-badge" style={{ "--hero-color": hero.color } as React.CSSProperties}>
      <span>{elementGlyph[hero.element] ?? "✦"}</span>
      {hero.name}
    </span>
  );
}

function Home({ onEnter }: { onEnter: () => void }) {
  return (
    <main className="public-page">
      <nav className="public-nav">
        <div className="brand-lockup">
          <span className="brand-mark">MM</span>
          <span>MagicMadness</span>
        </div>
        <button className="ghost-button" onClick={onEnter}>Sign in / Play</button>
      </nav>
      <section className="hero-landing">
        <div className="hero-copy">
          <p className="eyebrow">PHYSICS-DRIVEN HERO BRAWLER</p>
          <h1>Position is your<br /><span>second HP bar.</span></h1>
          <p className="lead">
            Aim, preview, collide and launch opponents through a living arena.
            Master four elements, find the edge, and make every knockout yours.
          </p>
          <div className="hero-actions">
            <button className="primary-button" onClick={onEnter}>Enter the Arena <span>↗</span></button>
            <a className="text-link" href="#identity">See the grammar ↓</a>
          </div>
          <div className="trust-line"><span className="pulse-dot" /> Local bot build online · mobile landscape first</div>
        </div>
        <div className="hero-art" aria-label="Abstract arena preview">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="hero-orb">
            <span className="orb-core">✦</span>
            <span className="orb-label">KNOCK<br />OUT</span>
          </div>
          <div className="float-chip chip-one">HOLD → PREVIEW</div>
          <div className="float-chip chip-two">PUSH / PULL / RICOCHET</div>
          <div className="float-chip chip-three">4 STARTER ELEMENTS</div>
        </div>
      </section>
      <section className="identity-section" id="identity">
        <div className="section-heading">
          <p className="eyebrow">THE COMBAT LOOP</p>
          <h2>Readable chaos.<br /><span>Skillful outcomes.</span></h2>
        </div>
        <div className="identity-grid">
          {[
            ["01", "Move → Aim → Preview", "Every cast exposes direction, range, impact and known collision."],
            ["02", "Collide → Displace", "Damage matters, but momentum and recovery decide the arena."],
            ["03", "React → Create", "Wind, walls, elements and hazards turn rules into combinations."],
          ].map(([number, title, text]) => (
            <article className="identity-card" key={number}>
              <span className="card-number">{number}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="starter-strip">
        <div>
          <p className="eyebrow">STARTER FAMILIES</p>
          <h2>Four ways to learn the arena.</h2>
        </div>
        <div className="starter-pills">
          {heroDefinitions.map((hero) => <HeroBadge key={hero.id} heroId={hero.id} />)}
        </div>
      </section>
      <footer className="public-footer"><span>MagicMadness Arena</span><span>Physics · Identity · Positioning</span></footer>
    </main>
  );
}

function AppShell({
  screen,
  setScreen,
  selectedHero,
  setSelectedHero,
  onStart,
}: {
  screen: Screen;
  setScreen: (screen: Screen) => void;
  selectedHero: HeroId;
  setSelectedHero: (heroId: HeroId) => void;
  onStart: () => void;
}) {
  const selected = heroDefinitions.find((hero) => hero.id === selectedHero) ?? heroDefinitions[0];
  const totalSkills = useMemo(() => selected?.skillIds.length ?? 0, [selected]);
  if (!selected) return null;
  return (
    <main className="app-page">
      <header className="app-header">
        <button className="brand-lockup brand-button" onClick={() => setScreen("app")}>
          <span className="brand-mark">MM</span><span>MagicMadness</span>
        </button>
        <div className="account-chip"><span className="avatar">A</span><span><strong>Arena Tester</strong><small>Account 08 · Level 12</small></span></div>
      </header>
      <div className="app-layout">
        <aside className="app-sidebar">
          <p className="sidebar-label">ARENA</p>
          {[
            ["app", "⌂", "Overview"],
            ["play", "⚔", "Play"],
          ].map(([id, glyph, label]) => (
            <button className={"side-link " + (screen === id ? "active" : "")} key={id} onClick={() => setScreen(id as Screen)}>
              <span>{glyph}</span>{label}
            </button>
          ))}
          <p className="sidebar-label space-top">BUILD</p>
          {["Heroes", "Talents", "Runes", "Collection"].map((label) => <button className="side-link muted-link" key={label}><span>◈</span>{label}<em>soon</em></button>)}
          <div className="sidebar-footer"><span className="pulse-dot" /> Local simulation<br /><small>authoritative server boundary ready</small></div>
        </aside>
        <section className="app-content">
          {screen === "app" && (
            <>
              <div className="content-heading"><div><p className="eyebrow">WELCOME BACK</p><h1>Your arena identity.</h1></div><button className="primary-button compact" onClick={() => setScreen("play")}>Play now <span>↗</span></button></div>
              <div className="profile-hero-card" style={{ "--hero-color": selected.color } as React.CSSProperties}>
                <div className="profile-hero-copy"><span className="mini-label">SELECTED PROFILE HERO</span><h2>{selected.name}</h2><p>{selected.summary}</p><div className="hero-meta"><HeroBadge heroId={selected.id} /><span>{selected.primaryClass}</span><span>{totalSkills} skills</span></div><button className="outline-button" onClick={() => setScreen("play")}>Change hero / Play</button></div>
                <div className="profile-hero-figure"><div className="figure-ring" /><div className="figure-glyph">{elementGlyph[selected.element] ?? "✦"}</div><span>{selected.element.toUpperCase()}</span></div>
              </div>
              <div className="dashboard-grid">
                <article className="dashboard-card"><span className="mini-label">CURRENT PATH</span><h3>Air Chapter · 03</h3><p>Redirection trial is ready. Learn to turn Wind Surge into recovery.</p><div className="progress-track"><span style={{ width: "68%" }} /></div><small>68% chapter progress</small></article>
                <article className="dashboard-card accent-card"><span className="mini-label">NEXT MILESTONE</span><h3>Talent level 20</h3><p>Unlock a new Utility branch without uncapped PvP power.</p><button className="text-link" onClick={() => setScreen("play")}>View progression →</button></article>
              </div>
            </>
          )}
          {screen === "play" && (
            <>
              <div className="content-heading"><div><p className="eyebrow">PLAY</p><h1>Choose your pressure.</h1></div><span className="mode-status"><span className="pulse-dot" /> bots ready</span></div>
              <div className="mode-grid">
                <article className="mode-card featured-mode"><div><span className="mode-icon">✦</span><span className="mini-label">RECOMMENDED FIRST</span><h2>Vs Bots</h2><p>One authored arena, Wind Surge and the complete starter combat loop.</p></div><button className="primary-button" onClick={onStart}>Start local match <span>↗</span></button></article>
                {[
                  ["History", "Learn elements through stages, bosses and map mechanics.", "PvE"],
                  ["Normal", "Practice the shared arena grammar with casual stakes.", "FFA"],
                  ["Ranked", "Competitive rating arrives behind the authoritative server.", "LOCKED"],
                  ["Friends", "Invite-link lobbies are architected as a separate room path.", "SOON"],
                ].map(([title, text, tag]) => <article className="mode-card" key={title}><span className="mode-tag">{tag}</span><h3>{title}</h3><p>{text}</p><button className="text-link muted-link">Explore →</button></article>)}
              </div>
              <div className="hero-select">
                <div className="section-heading small"><p className="eyebrow">STARTER SELECT</p><h2>Pick a hero to test.</h2></div>
                <div className="hero-select-grid">{heroDefinitions.map((hero) => <button key={hero.id} className={"select-hero " + (selectedHero === hero.id ? "selected" : "")} style={{ "--hero-color": hero.color } as React.CSSProperties} onClick={() => setSelectedHero(hero.id)}><span className="select-glyph">{elementGlyph[hero.element] ?? "✦"}</span><span><strong>{hero.name}</strong><small>{hero.element} · {hero.primaryClass}</small></span><span className="select-check">{selectedHero === hero.id ? "✓" : "○"}</span></button>)}</div>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

export function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [selectedHero, setSelectedHero] = useState<HeroId>("fire-ember");
  const [inGame, setInGame] = useState(false);
  if (inGame) return <LiveGame heroId={selectedHero} onExit={() => setInGame(false)} />;
  if (screen === "home") return <Home onEnter={() => setScreen("app")} />;
  return <AppShell screen={screen} setScreen={setScreen} selectedHero={selectedHero} setSelectedHero={setSelectedHero} onStart={() => setInGame(true)} />;
}
