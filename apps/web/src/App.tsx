import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { DevelopmentAuthProvider, type Identity } from "@mma/auth";
import {
  expandedElementDefinitions,
  heroDefinitions,
  historyChapters,
  runeDefinitions,
  skillDefinitions,
  talentNodes,
  type HeroDefinition,
  type HeroId,
} from "@mma/content";
import { MODE_RULES } from "@mma/balance";
import { createAccountProgression, accountBand } from "@mma/progression";
import { LiveGame } from "./game/LiveGame";

type Navigate = (to: string) => void;

type SurfaceAuthBridge = {
  signIn: () => Promise<Identity>;
  signOut?: () => Promise<void>;
};

declare global {
  interface Window {
    MagicMadnessAuth?: SurfaceAuthBridge;
  }
}

const AUTH_STORAGE_KEY = "magicmadness.identity";
const developmentAuth = new DevelopmentAuthProvider();

const elementGlyph: Record<string, string> = {
  fire: "✦",
  water: "◒",
  earth: "⬟",
  air: "◌",
  lightning: "ϟ",
  ice: "❄",
  venom: "☣",
  dark: "◐",
  light: "✧",
  iron: "⬢",
};

const elementLabels: Record<string, string> = {
  fire: "Fire",
  water: "Water",
  earth: "Earth",
  air: "Air",
  lightning: "Lightning",
  ice: "Ice",
  venom: "Venom",
  dark: "Dark",
  light: "Light",
  iron: "Iron",
};

function useRouter(): { path: string; navigate: Navigate } {
  const [path, setPath] = useState(() => (typeof window === "undefined" ? "/" : window.location.pathname));

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = useCallback<Navigate>((to) => {
    if (typeof window === "undefined") return;
    if (window.location.pathname !== to) {
      window.history.pushState({}, "", to);
      window.scrollTo({ top: 0, behavior: "auto" });
    }
    setPath(to);
  }, []);

  return { path, navigate };
}

function readStoredIdentity(): Identity | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!value) return null;
  try {
    const identity = JSON.parse(value) as Identity;
    if (!identity.accountId || !identity.displayName || !identity.provider) return null;
    return identity;
  } catch {
    return null;
  }
}

function useAuth() {
  const [identity, setIdentity] = useState<Identity | null>(readStoredIdentity);
  const hasChatGptBridge = typeof window !== "undefined" && Boolean(window.MagicMadnessAuth);

  const signIn = useCallback(async () => {
    const next = window.MagicMadnessAuth
      ? await window.MagicMadnessAuth.signIn()
      : await developmentAuth.signIn();
    setIdentity(next);
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(next));
    return next;
  }, []);

  const signOut = useCallback(async () => {
    if (window.MagicMadnessAuth?.signOut) await window.MagicMadnessAuth.signOut();
    else await developmentAuth.signOut();
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    setIdentity(null);
  }, []);

  return { identity, signIn, signOut, hasChatGptBridge };
}

function RouteLink({
  to,
  navigate,
  children,
  className = "",
}: {
  to: string;
  navigate: Navigate;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={to}
      className={className}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        navigate(to);
      }}
    >
      {children}
    </a>
  );
}

function HeroBadge({ hero, compact = false }: { hero: HeroDefinition; compact?: boolean }) {
  return (
    <span className={"hero-badge" + (compact ? " compact" : "")} style={{ "--hero-color": hero.color } as CSSProperties}>
      <span>{elementGlyph[hero.element] ?? "✦"}</span>
      <span>{hero.name}</span>
    </span>
  );
}

function Brand({ navigate, inverse = false }: { navigate: Navigate; inverse?: boolean }) {
  return (
    <RouteLink to="/" navigate={navigate} className={"brand-lockup brand-button" + (inverse ? " inverse" : "")}>
      <span className="brand-mark">MM</span>
      <span>MagicMadness <small>ARENA</small></span>
    </RouteLink>
  );
}

const publicLinks = [
  ["/how-it-works", "Combat"],
  ["/heroes", "Heroes"],
  ["/elements", "Elements"],
  ["/modes", "Modes"],
  ["/world", "World"],
] as const;

function PublicChrome({ path, navigate, children }: { path: string; navigate: Navigate; children: ReactNode }) {
  return (
    <main className="public-page">
      <nav className="public-nav">
        <Brand navigate={navigate} />
        <div className="public-nav-links">
          {publicLinks.map(([to, label]) => (
            <RouteLink key={to} to={to} navigate={navigate} className={path === to ? "active" : ""}>
              {label}
            </RouteLink>
          ))}
          <RouteLink to="/login" navigate={navigate} className="ghost-button nav-cta">Sign in / Play</RouteLink>
        </div>
      </nav>
      {children}
      <footer className="public-footer"><span>MagicMadness Arena</span><span>Physics · Identity · Positioning</span><RouteLink to="/news" navigate={navigate}>Build notes →</RouteLink></footer>
    </main>
  );
}

function Home({ navigate }: { navigate: Navigate }) {
  return (
    <PublicChrome path="/" navigate={navigate}>
      <section className="marketing-hero">
        <div className="marketing-hero-art" aria-hidden="true"><img src="/assets/magicmadness-battle.webp" alt="" /></div>
        <div className="marketing-hero-copy">
          <p className="eyebrow">A PHYSICS-DRIVEN FANTASY ARENA</p>
          <h1>Make the arena<br /><span>answer to you.</span></h1>
          <p className="lead">MagicMadness Arena is a top-down hero brawler where aim, collision, momentum and map pressure make every cast visible — and every knockout earned.</p>
          <div className="hero-actions">
            <button className="primary-button" onClick={() => navigate("/login")}>Enter the Arena <span>↗</span></button>
            <RouteLink to="/how-it-works" navigate={navigate} className="text-link">Learn the combat loop ↓</RouteLink>
          </div>
          <div className="trust-line"><span className="pulse-dot" /> Client build online · local bot playtest ready</div>
        </div>
        <div className="hero-fact-stack" aria-label="Game facts">
          <div className="fact-card"><span className="fact-kicker">THE CORE</span><strong>Position is your<br />second HP bar.</strong><span>Push. Pull. Bounce. Recover.</span></div>
          <div className="fact-card fact-card-small"><span className="fact-icon">◈</span><span><strong>Readable chaos</strong><small>Hold to preview every cast.</small></span></div>
          <div className="fact-card fact-card-small"><span className="fact-icon violet">ϟ</span><span><strong>Living arenas</strong><small>Wind Surge changes the line.</small></span></div>
        </div>
      </section>
      <section className="public-section combat-preview-section">
        <div className="section-heading"><p className="eyebrow">THE COMBAT LOOP</p><h2>Four rules create<br /><span>infinite situations.</span></h2></div>
        <div className="identity-grid">
          {[
            ["01", "Move → Aim → Preview", "Expose direction, range, impact and known collision before you release."],
            ["02", "Collide → Displace", "Damage matters, but momentum and recovery decide who owns the edge."],
            ["03", "React → Create", "Fire, Water, Earth and Air turn the same arena into different puzzles."],
          ].map(([number, title, text]) => <article className="identity-card" key={number}><span className="card-number">{number}</span><h3>{title}</h3><p>{text}</p></article>)}
        </div>
      </section>
      <section className="public-section starter-strip">
        <div><p className="eyebrow">STARTER FAMILIES</p><h2>Four ways to read the arena.</h2><p className="muted-copy">Each starter hero has four authored skills, a passive identity and a distinct answer to pressure.</p></div>
        <div className="starter-pills">{heroDefinitions.map((hero) => <HeroBadge key={hero.id} hero={hero} />)}</div>
      </section>
    </PublicChrome>
  );
}

function PublicPage({ kind, navigate }: { kind: "how" | "heroes" | "elements" | "modes" | "world" | "news"; navigate: Navigate }) {
  const titles = {
    how: ["Combat grammar", "The arena is a language. Learn to speak with force."],
    heroes: ["The starter roster", "Four identities. Sixteen skills. No interchangeable silhouettes."],
    elements: ["Elemental grammar", "Every element changes the way space answers back."],
    modes: ["Choose your pressure", "Start local, learn the rules, then step into the server boundary."],
    world: ["The Shattered Meridian", "A broken world where every arena is a piece of a moving constellation."],
    news: ["Build notes", "The current client is being built in public, one playable dependency at a time."],
  } as const;
  const [eyebrow, title] = titles[kind];
  return (
    <PublicChrome path={`/${kind === "how" ? "how-it-works" : kind}`} navigate={navigate}>
      <section className="inner-public-hero">
        <p className="eyebrow">{eyebrow.toUpperCase()}</p>
        <h1>{title.split(". ")[0]}<br /><span>{title.split(". ").slice(1).join(". ")}</span></h1>
        <p className="lead">Explore the systems that shape the client, then enter the launcher to feel them in motion.</p>
      </section>
      {kind === "how" && <CombatExplainer />}
      {kind === "heroes" && <HeroesExplainer navigate={navigate} />}
      {kind === "elements" && <ElementsExplainer />}
      {kind === "modes" && <ModesExplainer navigate={navigate} />}
      {kind === "world" && <WorldExplainer />}
      {kind === "news" && <NewsExplainer />}
    </PublicChrome>
  );
}

function CombatExplainer() {
  const steps = [
    ["Input", "Move with WASD, arrows or the landscape pad. Aim with the pointer; zoom with wheel or pinch."],
    ["Preview", "Hold a skill to see its path. Certain, predicted and dynamic segments stay visually distinct."],
    ["Impact", "Damage, knockback, fields, walls and hazards resolve in the deterministic Game Core."],
    ["Attribution", "The result keeps Match Score separate from Performance Score, including KO and assist credit."],
  ];
  return <section className="public-section explainer-grid">{steps.map(([name, text], index) => <article className="explainer-card" key={name}><span className="card-number">0{index + 1}</span><h2>{name}</h2><p>{text}</p></article>)}</section>;
}

function HeroesExplainer({ navigate }: { navigate: Navigate }) {
  return <section className="public-section"><div className="hero-lore-grid">{heroDefinitions.map((hero) => <article className="lore-hero-card" key={hero.id} style={{ "--hero-color": hero.color } as CSSProperties}><div className="lore-hero-icon">{elementGlyph[hero.element]}</div><div><span className="mini-label">{elementLabels[hero.element]} · {hero.primaryClass}</span><h2>{hero.name}</h2><p>{hero.summary}</p><p className="passive-line"><strong>Passive:</strong> {hero.passive}</p><div className="skill-chip-row">{hero.skillIds.map((skillId) => <span key={skillId}>{skillDefinitions.find((skill) => skill.id === skillId)?.name}</span>)}</div></div></article>)}</div><div className="public-callout"><div><p className="eyebrow">ENTER THE CLIENT</p><h2>Choose a hero in the launcher.</h2><p>Start with a local bot match and see the same hero identity inside the fullscreen HUD.</p></div><button className="primary-button" onClick={() => navigate("/login")}>Open game client <span>↗</span></button></div></section>;
}

function ElementsExplainer() {
  return <section className="public-section"><div className="element-grid">{heroDefinitions.map((hero) => <article className="element-card" key={hero.element} style={{ "--hero-color": hero.color } as CSSProperties}><span className="element-glyph">{elementGlyph[hero.element]}</span><span className="mini-label">STARTER ELEMENT</span><h2>{elementLabels[hero.element]}</h2><p>{hero.summary}</p><span className="element-role">{hero.primaryClass} · {hero.difficulty} onboarding</span></article>)}</div><div className="expanded-grid"><div><p className="eyebrow">EXPANDED ELEMENTS</p><h2>Designed before they are competitive.</h2><p className="muted-copy">These contracts are visible so the world can grow without pretending unfinished mechanics are ready for ranked play.</p></div>{expandedElementDefinitions.map((element) => <div className="expanded-element" key={element.id}><span style={{ color: element.id === "ice" ? "#a7e8ff" : "#b18cff" }}>{elementGlyph[element.id]}</span><strong>{elementLabels[element.id]}</strong><small>CONTRACT READY · SERVER GATED</small><p>{element.mechanicalIdentity}</p></div>)}</div></section>;
}

function ModesExplainer({ navigate }: { navigate: Navigate }) {
  const modes = [
    ["Vs Bots", "Local simulation", "The first playable route: one authored arena, four fighters, Wind Surge and deterministic bot pressure.", "READY"],
    ["History", "PvE chapters", "A staged path through elemental lessons. The Cinder Warden contract is authored; later bosses remain gated until implemented.", "IN BUILD"],
    ["Normal", "Standard match", "The standard contract includes one respawn and a separate result model for placement and performance.", "SERVER PATH"],
    ["Ranked", "Competitive", "Position, hit, damage, cooldown, RNG, death, respawn, score and economy remain authoritative on the server.", "LOCKED"],
  ];
  return <section className="public-section"><div className="mode-public-grid">{modes.map(([title, tag, text, status]) => <article className={"mode-public-card " + (status === "READY" ? "ready" : "")} key={title}><span className="mode-tag">{tag}</span><span className="mode-status-pill">{status}</span><h2>{title}</h2><p>{text}</p>{status === "READY" ? <button className="text-link" onClick={() => navigate("/login")}>Play local build →</button> : <span className="muted-copy tiny">Dependency tracked in the client</span>}</article>)}</div></section>;
}

function WorldExplainer() {
  return <section className="public-section world-layout"><div className="world-art"><img src="/assets/magicmadness-battle.webp" alt="The elemental fighters of the Shattered Meridian" /></div><div className="world-copy"><p className="eyebrow">THE WORLD FRAME</p><h2>Arena fragments keep moving.</h2><p>The Shattered Meridian is an original visual frame for MagicMadness: floating stone, elemental weather and old geometry pulled into combat. It gives the client a place to belong without changing the deterministic rules underneath.</p><div className="world-facts"><span><strong>4</strong> starter elements</span><span><strong>1</strong> living arena</span><span><strong>∞</strong> pressure lines</span></div></div></section>;
}

function NewsExplainer() {
  return <section className="public-section news-list"><article><span className="news-date">CLIENT 0.1 · NOW</span><h2>Game client shell is online.</h2><p>Public discovery, authenticated launcher, local bot match, landscape controls, Pixi rendering, diagnostics and result scoring share one visual language.</p></article><article><span className="news-date">ARCHITECTURE</span><h2>Server authority stays separate.</h2><p>Vs Bots can run the shared Game Core locally. Competitive multiplayer keeps a deployable authoritative server boundary and is never simulated as if browser state were trusted.</p></article><article><span className="news-date">NEXT DEPENDENCY</span><h2>History becomes a playable path.</h2><p>Boss contracts, account progression, friends, expanded heroes, runes and final economy follow the canonical dependency order.</p></article></section>;
}

function LoginPage({ navigate, signIn, hasChatGptBridge }: { navigate: Navigate; signIn: () => Promise<Identity>; hasChatGptBridge: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function handleSignIn() {
    setLoading(true);
    setError(null);
    try {
      await signIn();
      navigate("/game");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to start the account session.");
    } finally {
      setLoading(false);
    }
  }
  return <PublicChrome path="/login" navigate={navigate}><section className="login-page"><div className="login-art"><img src="/assets/magicmadness-battle.webp" alt="MagicMadness Arena battle" /><div className="login-art-caption"><span className="pulse-dot" /> THE MERIDIAN IS OPEN</div></div><div className="login-panel"><p className="eyebrow">ACCESS THE GAME CLIENT</p><h1>Enter the<br /><span>arena.</span></h1><p className="lead">Your account is the bridge between the public world and the private game shell: profile, heroes, progression, history and matches.</p><button className="primary-button login-button" onClick={() => void handleSignIn()} disabled={loading}>{loading ? "Opening client…" : hasChatGptBridge ? "Continue with ChatGPT" : "Continue to development client"}<span>↗</span></button><div className="auth-note"><span className="auth-check">✓</span><span><strong>{hasChatGptBridge ? "ChatGPT identity adapter detected" : "Local adapter active"}</strong><small>{hasChatGptBridge ? "The hosting surface controls the sign-in handshake." : "A development identity keeps the client playable until the hosting surface supplies sign-in."}</small></span></div>{error && <p className="error-message">{error}</p>}<RouteLink to="/" navigate={navigate} className="text-link">Back to public site</RouteLink></div></section></PublicChrome>;
}

const gameNav = [
  ["/game", "⌂", "Launcher"],
  ["/game/play", "⚔", "Play"],
  ["/game/history", "◈", "History"],
  ["/game/heroes", "✦", "Heroes"],
  ["/game/talents", "⌁", "Talents"],
  ["/game/runes", "◇", "Runes"],
  ["/game/friends", "♢", "Friends"],
  ["/game/collection", "▦", "Collection"],
] as const;

function GameHubLayout({ path, navigate, identity, signOut, children }: { path: string; navigate: Navigate; identity: Identity; signOut: () => Promise<void>; children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  async function leaveAccount() {
    await signOut();
    navigate("/");
  }
  return <main className="game-shell"><header className="game-shell-header"><button className="mobile-menu-button" onClick={() => setMenuOpen((value) => !value)} aria-label="Open game menu">☰</button><Brand navigate={navigate} inverse /><div className="game-shell-status"><span className="pulse-dot" /> CLIENT ONLINE <small>LOCAL BUILD</small></div><button className="account-chip" onClick={() => navigate("/game/profile")}><span className="avatar">{identity.displayName.slice(0, 1).toUpperCase()}</span><span><strong>{identity.displayName}</strong><small>Level 12 · Profile</small></span></button><button className="shell-exit" onClick={() => void leaveAccount()}>Exit</button></header><div className="game-shell-layout"><aside className={"game-shell-sidebar " + (menuOpen ? "open" : "")}><div className="shell-nav-label">GAME CLIENT</div>{gameNav.map(([to, glyph, label]) => <RouteLink key={to} to={to} navigate={navigate} className={path === to ? "active" : ""} ><span>{glyph}</span>{label}{to === "/game/play" && <em>GO</em>}</RouteLink>)}<div className="shell-sidebar-footer"><span className="status-line"><span className="pulse-dot" /> Simulation ready</span><small>Authoritative multiplayer remains a separate server path.</small></div></aside><section className="game-shell-content">{children}</section></div></main>;
}

function HubHeader({ eyebrow, title, action, navigate }: { eyebrow: string; title: string; action?: [string, string]; navigate: Navigate }) {
  return <div className="hub-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></div>{action && <button className="primary-button compact" onClick={() => navigate(action[0])}>{action[1]} <span>↗</span></button>}</div>;
}

function GameLauncher({ navigate, selectedHero, setSelectedHero }: { navigate: Navigate; selectedHero: HeroId; setSelectedHero: (heroId: HeroId) => void }) {
  const hero = heroDefinitions.find((entry) => entry.id === selectedHero) ?? heroDefinitions[0];
  if (!hero) return null;
  const start = () => {
    const matchId = `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    void document.documentElement.requestFullscreen?.().catch(() => undefined);
    navigate(`/match/local/${matchId}`);
  };
  return <><HubHeader eyebrow="GAME CLIENT · READY" title="Open the arena." action={["/game/play", "Choose a mode"]} navigate={navigate} /><section className="launcher-hero"><div className="launcher-hero-background"><img src="/assets/magicmadness-battle.webp" alt="" /></div><div className="launcher-hero-copy"><span className="launcher-kicker"><span className="pulse-dot" /> BUILD 0.1 · PLAYABLE</span><h2>Momentum is<br /><span>the real spell.</span></h2><p>Enter a full-viewport match client with a deterministic local simulation, rendered arena, hold-to-preview casting, environmental pressure and a result screen.</p><button className="primary-button" onClick={start}>Play Vs Bots <span>↗</span></button></div><div className="launcher-readout"><span className="mini-label">SELECTED HERO</span><div className="launcher-hero-id" style={{ "--hero-color": hero.color } as CSSProperties}><span>{elementGlyph[hero.element]}</span><div><strong>{hero.name}</strong><small>{elementLabels[hero.element]} · {hero.primaryClass}</small></div></div><button className="text-link" onClick={() => navigate("/game/heroes")}>Change hero →</button></div></section><div className="launcher-grid"><article className="launcher-card"><span className="mini-label">NEXT MATCH</span><h3>Windfall Ring</h3><p>One arena contract · Wind Surge · four fighters · one standard respawn.</p><div className="launcher-tags"><span>1600 × 900</span><span>LOCAL CORE</span><span>BOT READY</span></div></article><article className="launcher-card"><span className="mini-label">ACCOUNT SIGNAL</span><h3>Level 12 · {accountBand(12)}</h3><p>Your profile is ready for starter heroes, talents and runes. Competitive power caps remain data-driven.</p><button className="text-link" onClick={() => navigate("/game/profile")}>Open profile →</button></article></div><section className="launcher-select"><div className="section-heading small"><p className="eyebrow">QUICK SELECT</p><h2>Pick your fighter.</h2></div><div className="hero-select-grid">{heroDefinitions.map((entry) => <button key={entry.id} className={"select-hero " + (entry.id === selectedHero ? "selected" : "")} style={{ "--hero-color": entry.color } as CSSProperties} onClick={() => setSelectedHero(entry.id)}><span className="select-glyph">{elementGlyph[entry.element]}</span><span><strong>{entry.name}</strong><small>{elementLabels[entry.element]} · {entry.primaryClass}</small></span><span className="select-check">{entry.id === selectedHero ? "✓" : "○"}</span></button>)}</div></section></>;
}

function PlayHub({ navigate, selectedHero, setSelectedHero }: { navigate: Navigate; selectedHero: HeroId; setSelectedHero: (heroId: HeroId) => void }) {
  const start = () => {
    const matchId = `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    void document.documentElement.requestFullscreen?.().catch(() => undefined);
    navigate(`/match/local/${matchId}`);
  };
  return <><HubHeader eyebrow="PLAY · MATCHMAKING" title="Choose your pressure." navigate={navigate} /><div className="play-status-bar"><span><span className="pulse-dot" /> local simulation ready</span><small>Every match uses the shared deterministic Game Core.</small></div><div className="mode-grid hub-mode-grid"><article className="mode-card featured-mode"><div><span className="mode-icon">✦</span><span className="mini-label">RECOMMENDED FIRST</span><h2>Vs Bots</h2><p>One authored arena, Wind Surge and the complete starter combat loop. Start immediately in the fullscreen client.</p></div><button className="primary-button" onClick={start}>Start local match <span>↗</span></button></article><article className="mode-card"><span className="mode-tag">PvE · CONTRACT READY</span><h3>History</h3><p>Study the four elemental chapters. Boss staging is visible; only authored boss content is playable when its contract is complete.</p><button className="text-link" onClick={() => navigate("/game/history")}>Open history →</button></article><article className="mode-card"><span className="mode-tag">FFA · SERVER PATH</span><h3>Normal</h3><p>Standard round rules with one respawn. Online authority is reserved for the deployable server.</p><span className="muted-copy tiny">Server boundary ready · lobby not connected</span></article><article className="mode-card"><span className="mode-tag">RATING · LOCKED</span><h3>Ranked</h3><p>Competitive play waits for authoritative matchmaking and persistence.</p><span className="muted-copy tiny">Position, hit and score never trust the browser.</span></article><article className="mode-card"><span className="mode-tag">SOCIAL · IN BUILD</span><h3>Friends</h3><p>Invite-link rooms are modeled separately from local play.</p><button className="text-link" onClick={() => navigate("/game/friends")}>Open friends →</button></article></div><HeroPicker selectedHero={selectedHero} setSelectedHero={setSelectedHero} /><div className="contract-banner"><strong>Standard contract verified</strong><span>{MODE_RULES.standard.respawns} respawn · Match Score separated from Performance Score</span></div></>;
}

function HeroPicker({ selectedHero, setSelectedHero }: { selectedHero: HeroId; setSelectedHero: (heroId: HeroId) => void }) {
  return <section className="hero-select hub-picker"><div className="section-heading small"><p className="eyebrow">STARTER SELECT</p><h2>Pick a hero to test.</h2></div><div className="hero-select-grid">{heroDefinitions.map((hero) => <button key={hero.id} className={"select-hero " + (selectedHero === hero.id ? "selected" : "")} style={{ "--hero-color": hero.color } as CSSProperties} onClick={() => setSelectedHero(hero.id)}><span className="select-glyph">{elementGlyph[hero.element]}</span><span><strong>{hero.name}</strong><small>{elementLabels[hero.element]} · {hero.primaryClass}</small></span><span className="select-check">{selectedHero === hero.id ? "✓" : "○"}</span></button>)}</div></section>;
}

function ProfilePage({ identity, navigate }: { identity: Identity; navigate: Navigate }) {
  const account = createAccountProgression(identity.accountId);
  return <><HubHeader eyebrow="ACCOUNT · PROFILE" title="Your arena identity." action={["/game/play", "Play now"]} navigate={navigate} /><section className="account-profile-card"><div className="profile-avatar-large">{identity.displayName.slice(0, 1).toUpperCase()}</div><div><span className="mini-label">{identity.provider === "chatgpt" ? "CHATGPT ACCOUNT" : "DEVELOPMENT ACCOUNT"}</span><h2>{identity.displayName}</h2><p>Account {identity.accountId} · connected identity adapter</p><div className="profile-pill-row"><span>Level 12</span><span>{accountBand(12)} band</span><span>XP 7,420 / 10,000</span></div></div><div className="profile-rank"><span className="mini-label">CURRENT SIGNAL</span><strong>SPARKBOUND</strong><small>Local client progression</small></div></section><div className="account-stat-grid"><article><span className="mini-label">MATCHES</span><strong>24</strong><small>local playtests</small></article><article><span className="mini-label">BEST PLACEMENT</span><strong>#1</strong><small>Windfall Ring</small></article><article><span className="mini-label">TALENTS</span><strong>{account.unlockedTalentIds.length}/3</strong><small>data contract ready</small></article><article><span className="mini-label">CURRENCY</span><strong>120</strong><small>Spark · first clear</small></article></div><div className="profile-link-grid"><button onClick={() => navigate("/game/heroes")}><span>✦</span><strong>Roster</strong><small>Inspect hero identity and skills</small>→</button><button onClick={() => navigate("/game/talents")}><span>⌁</span><strong>Talents</strong><small>Account-capped sidegrades</small>→</button><button onClick={() => navigate("/game/runes")}><span>◇</span><strong>Runes</strong><small>Tradeoff-based build layer</small>→</button></div></>;
}

function HeroesHub({ navigate, selectedHero, setSelectedHero }: { navigate: Navigate; selectedHero: HeroId; setSelectedHero: (heroId: HeroId) => void }) {
  return <><HubHeader eyebrow="BUILD · HEROES" title="Read the roster." action={["/game/play", "Play selected"]} navigate={navigate} /><div className="hub-hero-grid">{heroDefinitions.map((hero) => <article className={"hub-hero-card " + (selectedHero === hero.id ? "selected" : "")} key={hero.id} style={{ "--hero-color": hero.color } as CSSProperties}><div className="hub-hero-card-top"><span className="hub-hero-glyph">{elementGlyph[hero.element]}</span><span className="mode-tag">{elementLabels[hero.element]} · {hero.primaryClass}</span></div><h2>{hero.name}</h2><p>{hero.summary}</p><div className="hub-skill-list">{hero.skillIds.map((skillId, index) => { const skill = skillDefinitions.find((entry) => entry.id === skillId); return <span key={skillId}><b>{index + 1}</b>{skill?.name}</span>; })}</div><button className="outline-button" onClick={() => { setSelectedHero(hero.id); navigate("/game/play"); }}>{selectedHero === hero.id ? "Selected · play" : "Select hero"}</button></article>)}</div><div className="contract-banner"><strong>Starter roster complete</strong><span>four heroes · sixteen authored skills · all values come from versioned content and balance data</span></div></>;
}

function TalentsPage({ navigate }: { navigate: Navigate }) {
  return <><HubHeader eyebrow="BUILD · ACCOUNT TALENTS" title="Shape the account, not the hitbox." navigate={navigate} /><div className="system-intro"><p>Talent contracts unlock by account level and stay within the canonical PvP caps. They create sidegrades and control choices rather than uncapped global power.</p><span className="system-version">META BASELINE · 0.1</span></div><div className="talent-grid">{talentNodes.map((talent) => <article className="talent-card" key={talent.id}><div className="talent-top"><span className={"branch-badge " + talent.branch.toLowerCase()}>{talent.branch}</span><span>LEVEL {talent.requiredAccountLevel}</span></div><h2>{talent.description}</h2><p>{talent.effectKind} · {talent.glossaryRefs.join(" · ")}</p><button className="outline-button" disabled>Locked for this account</button></article>)}</div></>;
}

function RunesPage({ navigate }: { navigate: Navigate }) {
  return <><HubHeader eyebrow="BUILD · RUNES" title="Power with a visible tradeoff." navigate={navigate} /><div className="system-intro"><p>Runes are compatible, budgeted and stacking-aware. The positive effect is always paired with a cost so the build remains legible in combat.</p><span className="system-version">POWER BUDGET · TIER 1</span></div><div className="rune-grid">{runeDefinitions.map((rune) => <article className="rune-card" key={rune.id}><div className="rune-symbol">◇</div><div><span className="mode-tag">{rune.family} · TIER {rune.tier}</span><h2>{rune.id.replace("rune-", "").replaceAll("-", " ")}</h2><div className="rune-trade"><span><small>+</small>{rune.positiveEffect}</span><span><small>−</small>{rune.tradeoff}</span></div><p>Compatible: {rune.compatibleTags.join(", ")} · stacking group {rune.stackingGroup}</p></div><button className="outline-button" disabled>Equip in account build</button></article>)}</div></>;
}

function HistoryPage({ navigate }: { navigate: Navigate }) {
  return <><HubHeader eyebrow="PLAY · HISTORY" title="Learn the Meridian one chapter at a time." navigate={navigate} /><div className="history-intro"><div><p>History teaches the same combat grammar through staged pressure. Each chapter has an explicit contract; the client only presents a boss as playable when its authored mechanics exist.</p></div><div className="history-progress"><span className="mini-label">CHAPTER PROGRESS</span><strong>01 / 04</strong><div className="progress-track"><span style={{ width: "24%" }} /></div></div></div><div className="chapter-list">{historyChapters.map((chapter) => { const bossReady = chapter.id === "fire-chapter"; return <article className={"chapter-card " + (bossReady ? "ready" : "locked")} key={chapter.id} style={{ "--chapter-color": chapter.element === "fire" ? "#ff6b35" : chapter.element === "water" ? "#35baf6" : chapter.element === "earth" ? "#c99a5b" : "#b18cff" } as CSSProperties}><div className="chapter-number">0{chapter.order}</div><div className="chapter-copy"><span className="mini-label">{elementLabels[chapter.element]} CHAPTER</span><h2>{chapter.title}</h2><p>Teaching focus: {chapter.teachingFocus.join(" · ")}</p><div className="chapter-tags">{chapter.stageIds.map((stage) => <span key={stage}>{stage}</span>)}<span>{bossReady ? "CINDER WARDEN" : "BOSS CONTRACT"}</span></div></div><div className="chapter-action">{bossReady ? <><span className="ready-label"><span className="pulse-dot" /> CONTRACT READY</span><button className="outline-button" onClick={() => navigate(`/match/history/${chapter.stageIds[0] ?? "fire-01"}`)}>Open stage brief</button></> : <><span className="muted-copy tiny">CONTENT CONTRACT TRACKED</span><button className="outline-button" disabled>Coming through dependency</button></>}</div></article>; })}</div></>;
}

function HistoryStageScreen({ stageId, navigate, selectedHero }: { stageId: string; navigate: Navigate; selectedHero: HeroId }) {
  const chapter = historyChapters.find((entry) => entry.stageIds.includes(stageId)) ?? historyChapters[0];
  const boss = chapter?.bossIds[0] === "cinder-warden";
  const startStudyMatch = () => {
    const matchId = `history-${stageId}-${Date.now().toString(36)}`;
    void document.documentElement.requestFullscreen?.().catch(() => undefined);
    navigate(`/match/local/${matchId}`);
  };
  if (!chapter) return null;
  return <main className="stage-brief-page"><div className="stage-brief-back"><button className="game-brand" onClick={() => navigate("/game/history")}><span className="brand-mark">MM</span><span>Back to History</span></button><span className="system-version">STAGE BRIEF · {stageId}</span></div><section className="stage-brief-card" style={{ "--chapter-color": boss ? "#ff6b35" : "#b18cff" } as CSSProperties}><div className="stage-brief-art"><img src="/assets/magicmadness-battle.webp" alt="Elemental battle preview" /></div><div className="stage-brief-copy"><span className="mini-label">{elementLabels[chapter.element]} · CHAPTER {chapter.order}</span><h1>{chapter.title}</h1><p>This route exposes the canonical History contract. The current client can study the arena loop with a local simulation; boss authority and authored encounter scripting remain separate dependencies.</p><div className="brief-facts"><span><strong>{chapter.stageIds.length}</strong> stages</span><span><strong>{boss ? "3" : "—"}</strong> boss phases</span><span><strong>{chapter.teachingFocus.length}</strong> lessons</span></div><div className="result-actions"><button className="primary-button" onClick={startStudyMatch}>Play local study match <span>↗</span></button><button className="text-link" onClick={() => navigate("/game/history")}>Return to history</button></div><div className="contract-note"><strong>{boss ? "Cinder Warden contract authored" : "Boss contract placeholder"}</strong><span>{boss ? "telegraphed meteor · ember ring · destructible cover · edge recovery" : "This stage is visible but not presented as a finished boss fight."}</span></div></div></section><div className="stage-brief-footer"><span>Selected hero: {heroDefinitions.find((hero) => hero.id === selectedHero)?.name ?? selectedHero}</span><span>Local study mode · no competitive result</span></div></main>;
}

function GenericSystemPage({ kind, navigate }: { kind: "friends" | "collection"; navigate: Navigate }) {
  const friends = kind === "friends";
  return <><HubHeader eyebrow={`SYSTEM · ${friends ? "FRIENDS" : "COLLECTION"}`} title={friends ? "Find your pressure partners." : "See what the account owns."} navigate={navigate} /><section className="empty-system-card"><div className="empty-system-icon">{friends ? "♢" : "▦"}</div><div><span className="mini-label">{friends ? "INVITE-LINK ROOMS" : "VERSIONED COLLECTION"}</span><h2>{friends ? "The room boundary is ready." : "The collection layer is accounted for."}</h2><p>{friends ? "Friends and invite multiplayer need identity-backed rooms and an authoritative match service. The local client stays honest and available while that dependency is built." : "Spark, Style Shard, hero discovery, duplicate conversion and cosmetic ownership are modeled in contracts. Final Gacha presentation stays behind the canonical economy milestone."}</p><div className="empty-system-chips"><span>{friends ? "AUTH REQUIRED" : "ECONOMY CONTRACT"}</span><span>{friends ? "WEBSOCKET ROOM" : "NO COMBAT POWER DUPES"}</span><span>IN BUILD</span></div></div><button className="outline-button" onClick={() => navigate(friends ? "/game/play" : "/game/profile")}>{friends ? "Play local while waiting" : "View account"} →</button></section></>;
}

function GameBootScreen({ matchId }: { matchId: string }) {
  const [progress, setProgress] = useState(8);
  useEffect(() => {
    const started = performance.now();
    let frame = 0;
    const loop = (now: number) => {
      const next = Math.min(100, Math.round(8 + ((now - started) / 1150) * 92));
      setProgress(next);
      if (next < 100) frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);
  const stage = progress < 38 ? "Loading arena geometry" : progress < 68 ? "Binding input and balance" : progress < 100 ? "Starting local simulation" : "Client ready";
  return <main className="game-boot-page"><div className="game-boot-mark"><span className="brand-mark">MM</span><div><strong>MAGICMADNESS</strong><small>ARENA CLIENT</small></div></div><div className="boot-visual"><img src="/assets/magicmadness-battle.webp" alt="" /><div className="boot-ring" /></div><div className="boot-copy"><p className="eyebrow">MATCH {matchId.toUpperCase()}</p><h1>Opening the<br /><span>arena client.</span></h1><div className="boot-progress"><div><span>{stage}</span><strong>{progress}%</strong></div><div className="progress-track"><span style={{ width: `${progress}%` }} /></div></div><div className="boot-status"><span><span className="pulse-dot" /> Pixi renderer</span><span><span className="pulse-dot" /> deterministic core</span><span><span className="status-hollow" /> server authority separate</span></div></div></main>;
}

function MatchRoute({ matchId, heroId, onExit }: { matchId: string; heroId: HeroId; onExit: () => void }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const image = new Image();
    image.src = "/assets/magicmadness-battle.webp";
    const timer = window.setTimeout(() => setReady(true), 1200);
    return () => window.clearTimeout(timer);
  }, []);
  if (!ready) return <GameBootScreen matchId={matchId} />;
  return <LiveGame key={matchId} matchId={matchId} heroId={heroId} mode="standard" onExit={onExit} />;
}

function GameHubPage({ path, navigate, identity, signOut }: { path: string; navigate: Navigate; identity: Identity; signOut: () => Promise<void> }) {
  const [selectedHero, setSelectedHero] = useState<HeroId>(() => {
    if (typeof window === "undefined") return "fire-ember";
    return (window.localStorage.getItem("magicmadness.hero") as HeroId | null) ?? "fire-ember";
  });
  function chooseHero(heroId: HeroId) {
    setSelectedHero(heroId);
    window.localStorage.setItem("magicmadness.hero", heroId);
  }
  let content: ReactNode;
  if (path === "/game/play") content = <PlayHub navigate={navigate} selectedHero={selectedHero} setSelectedHero={chooseHero} />;
  else if (path === "/game/profile") content = <ProfilePage identity={identity} navigate={navigate} />;
  else if (path === "/game/heroes") content = <HeroesHub navigate={navigate} selectedHero={selectedHero} setSelectedHero={chooseHero} />;
  else if (path === "/game/talents") content = <TalentsPage navigate={navigate} />;
  else if (path === "/game/runes") content = <RunesPage navigate={navigate} />;
  else if (path === "/game/history") content = <HistoryPage navigate={navigate} />;
  else if (path === "/game/friends") content = <GenericSystemPage kind="friends" navigate={navigate} />;
  else if (path === "/game/collection") content = <GenericSystemPage kind="collection" navigate={navigate} />;
  else content = <GameLauncher navigate={navigate} selectedHero={selectedHero} setSelectedHero={chooseHero} />;
  return <GameHubLayout path={path} navigate={navigate} identity={identity} signOut={signOut}>{content}</GameHubLayout>;
}

function App() {
  const { path, navigate } = useRouter();
  const { identity, signIn, signOut, hasChatGptBridge } = useAuth();
  const storedHero = typeof window === "undefined" ? null : window.localStorage.getItem("magicmadness.hero");
  const selectedHero = heroDefinitions.some((hero) => hero.id === storedHero) ? storedHero as HeroId : "fire-ember";
  const matchPath = path.match(/^\/match\/(local|history)\/([^/]+)$/);
  if (matchPath?.[1] === "history" && identity) {
    return <HistoryStageScreen stageId={matchPath[2] ?? "fire-01"} navigate={navigate} selectedHero={selectedHero} />;
  }
  if (matchPath && identity) {
    return <MatchRoute matchId={matchPath[2] ?? "local-match"} heroId={selectedHero} onExit={() => { void document.exitFullscreen?.().catch(() => undefined); navigate("/game/play"); }} />;
  }
  if (matchPath && !identity) {
    return <LoginPage navigate={navigate} signIn={signIn} hasChatGptBridge={hasChatGptBridge} />;
  }
  if (path === "/login") return <LoginPage navigate={navigate} signIn={signIn} hasChatGptBridge={hasChatGptBridge} />;
  if (path.startsWith("/game")) {
    if (!identity) return <LoginPage navigate={navigate} signIn={signIn} hasChatGptBridge={hasChatGptBridge} />;
    return <GameHubPage path={path} navigate={navigate} identity={identity} signOut={signOut} />;
  }
  if (path === "/how-it-works") return <PublicPage kind="how" navigate={navigate} />;
  if (path === "/heroes") return <PublicPage kind="heroes" navigate={navigate} />;
  if (path === "/elements") return <PublicPage kind="elements" navigate={navigate} />;
  if (path === "/modes") return <PublicPage kind="modes" navigate={navigate} />;
  if (path === "/world") return <PublicPage kind="world" navigate={navigate} />;
  if (path === "/news") return <PublicPage kind="news" navigate={navigate} />;
  return <Home navigate={navigate} />;
}

export { App };
