import { BuildWorkshop } from "./components/BuildWorkshop";
import { lazy, Suspense, useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { DevelopmentAuthProvider, type Identity } from "@mma/auth";
import {
  expandedElementDefinitions,
  heroDefinitions,
  historyChapters,
  historyStages,
  skillDefinitions,
  type HeroDefinition,
  type HeroId,
} from "@mma/content";
import { MODE_RULES } from "@mma/balance";
import { createAccountProgression, accountBand } from "@mma/progression";
import { ClientJourney, Spellbook, CollectionRoom, AccountRecordPanel } from "./components/ClientJourney";
import { ElementIcon, SkillIcon } from "./components/GameIcon";

const LiveGame = lazy(() => import("./game/LiveGame").then(({ LiveGame: Component }) => ({ default: Component })));
const VerifiedGame = lazy(() => import("./game/VerifiedGame").then(({ VerifiedGame: Component }) => ({ default: Component })));
const HeroShowcase = lazy(() => import("./game/HeroShowcase").then(({ HeroShowcase: Component }) => ({ default: Component })));
const VisualLab = lazy(() => import("./game/VisualLab").then(({ VisualLab: Component }) => ({ default: Component })));

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

const developmentAuth = new DevelopmentAuthProvider();

type HostedAccount = {
  accountId: string;
  displayName: string;
  level: number;
  experience: number;
  selectedHeroId: HeroId;
};

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

function requestBrowserFullscreen(): void {
  const request = document.documentElement.requestFullscreen?.();
  if (request) void request.catch(() => undefined);
}

function exitBrowserFullscreen(): void {
  const exit = document.exitFullscreen?.();
  if (exit) void exit.catch(() => undefined);
}

function useAuth() {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [account, setAccount] = useState<HostedAccount | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const hasChatGptBridge = typeof window !== "undefined" && Boolean(window.MagicMadnessAuth);

  const loadHostedAccount = useCallback(async (): Promise<Identity> => {
    const response = await fetch("/api/account", { credentials: "include", headers: { accept: "application/json" } });
    if (!response.ok) throw new Error(response.status === 401 ? "Sign in is required by the hosting surface." : "The hosted account service is unavailable.");
    const payload = await response.json() as { account: HostedAccount };
    const nextIdentity: Identity = { accountId: payload.account.accountId, displayName: payload.account.displayName, provider: "chatgpt" };
    setAccount(payload.account);
    setIdentity(nextIdentity);
    return nextIdentity;
  }, []);

  useEffect(() => {
    let active = true;
    void loadHostedAccount().catch(async () => {
      if (!import.meta.env.DEV || !active) return;
      const next = await developmentAuth.getSession();
      if (active && next) {
        setIdentity(next);
        setAccount({ accountId: next.accountId, displayName: next.displayName, level: 1, experience: 0, selectedHeroId: "fire-ember" });
      }
    }).finally(() => { if (active) setSessionChecked(true); });
    return () => { active = false; };
  }, [loadHostedAccount]);

  const signIn = useCallback(async () => {
    if (window.MagicMadnessAuth) await window.MagicMadnessAuth.signIn();
    try { return await loadHostedAccount(); }
    catch (cause) {
      if (!import.meta.env.DEV) { window.location.assign("/signin-with-chatgpt?return_to=%2Fgame"); throw new Error("Opening secure sign in…"); }
      const next = await developmentAuth.signIn();
      setIdentity(next);
      setAccount({ accountId: next.accountId, displayName: next.displayName, level: 1, experience: 0, selectedHeroId: "fire-ember" });
      return next;
    }
  }, [loadHostedAccount]);

  const signOut = useCallback(async () => {
    if (window.MagicMadnessAuth?.signOut) await window.MagicMadnessAuth.signOut();
    else if (import.meta.env.DEV && identity?.provider === "dev") await developmentAuth.signOut();
    else { window.location.assign("/signout-with-chatgpt?return_to=%2Flogin"); return; }
    setIdentity(null);
    setAccount(null);
  }, [identity?.provider]);

  const selectHero = useCallback(async (heroId: HeroId) => {
    setAccount((current) => current ? { ...current, selectedHeroId: heroId } : current);
    if (import.meta.env.DEV && identity?.provider === "dev") return;
    const response = await fetch("/api/account/hero", {
      method: "PATCH",
      credentials: "include",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ heroId }),
    });
    if (!response.ok) {
      await loadHostedAccount().catch(() => undefined);
      throw new Error("The selected hero could not be persisted.");
    }
  }, [identity?.provider, loadHostedAccount]);

  return { identity, account, sessionChecked, signIn, signOut, selectHero, hasChatGptBridge, refreshAccount: loadHostedAccount };
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
      <span><ElementIcon element={hero.element} /></span>
      <span>{hero.name}</span>
    </span>
  );
}

function Brand({ navigate, inverse = false }: { navigate: Navigate; inverse?: boolean }) {
  return (
    <RouteLink to="/" navigate={navigate} className={"brand-lockup brand-button" + (inverse ? " inverse" : "")}>
      <span className="brand-mark"><i>MM</i></span>
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  return (
    <main className="public-page">
      <div className="portal-ribbon"><span>MAGICMADNESS ONLINE</span><RouteLink to="/news" navigate={navigate}>NEWS</RouteLink><RouteLink to="/modes" navigate={navigate}>GAME MODES</RouteLink><RouteLink to="/how-it-works" navigate={navigate}>GAME GUIDE</RouteLink><em>THE MERIDIAN · ELEMENTAL ARENA</em></div>
      <nav className="public-nav">
        <Brand navigate={navigate} />
        <div className={"public-nav-links " + (mobileNavOpen ? "open" : "")}>
          {publicLinks.map(([to, label]) => (
            <RouteLink key={to} to={to} navigate={(to) => { setMobileNavOpen(false); navigate(to); }} className={path === to ? "active" : ""}>
              {label}
            </RouteLink>
          ))}
          <a href="/game" target="_blank" rel="noopener" className="ghost-button nav-cta">Open game client ↗</a>
        </div>
        <button className="mobile-public-menu" onClick={() => setMobileNavOpen((value) => !value)} aria-expanded={mobileNavOpen} aria-label="Open public menu">{mobileNavOpen ? "Close" : "Menu"}</button>
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
            <a className="primary-button" href="/game" target="_blank" rel="noopener">Play MagicMadness <span>↗</span></a>
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
      <section className="portal-news-board">
        <div className="portal-news-title"><span>MERIDIAN NEWS</span><strong>LIVE SERVICE BOARD</strong></div>
        <article><time>15.09</time><span>UPDATE</span><strong>New elemental heroes, curved silhouettes and stronger displacement.</strong></article>
        <article><time>15.09</time><span>JOURNEY</span><strong>A guided client, spellbooks and saved talent / rune builds.</strong></article>
        <button onClick={() => navigate("/news")}>ALL NEWS +</button>
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
    how: ["Combat grammar", "The arena is a language.", "Learn to speak with force."],
    heroes: ["Heroes", "The starter roster", "Four identities. Sixteen skills."],
    elements: ["Elements", "Elemental grammar", "Every element changes the line."],
    modes: ["Modes", "Choose your pressure", "Start local. Learn the rules."],
    world: ["World", "The Shattered Meridian", "Every arena is a moving fragment."],
    news: ["Build notes", "The client is online", "One playable dependency at a time."],
  } as const;
  const [eyebrow, heading, tagline] = titles[kind];
  return (
    <PublicChrome path={`/${kind === "how" ? "how-it-works" : kind}`} navigate={navigate}>
      <section className="inner-public-hero">
        <p className="eyebrow">{eyebrow.toUpperCase()}</p>
        <h1>{heading}<br /><span>{tagline}</span></h1>
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
  return <section className="public-section news-list"><article><span className="news-date">CLIENT 0.2 · NOW</span><h2>The 3D game client is online.</h2><p>Public discovery, authenticated launcher, local bot match, landscape controls, Three.js rendering, elemental VFX, diagnostics and result scoring share one game universe.</p></article><article><span className="news-date">ARCHITECTURE</span><h2>Server authority stays separate.</h2><p>Vs Bots can run the shared Game Core locally. Competitive multiplayer keeps a deployable authoritative server boundary and is never simulated as if browser state were trusted.</p></article><article><span className="news-date">NEXT DEPENDENCY</span><h2>History becomes a playable path.</h2><p>Boss contracts, account progression, friends, expanded heroes, runes and final economy follow the canonical dependency order.</p></article></section>;
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
  return <main className="client-login"><section className="login-page"><div className="login-art"><img src="/assets/magicmadness-battle.webp" alt="MagicMadness Arena battle" /><div className="login-art-caption"><span className="pulse-dot" /> THE MERIDIAN IS OPEN</div></div><div className="login-panel"><p className="eyebrow">ACCESS THE GAME CLIENT</p><h1>Enter the<br /><span>arena.</span></h1><p className="lead">Your account is the bridge between the public world and the private game shell: profile, heroes, progression, history and matches.</p><button className="primary-button login-button" onClick={() => void handleSignIn()} disabled={loading}>{loading ? "Opening client…" : import.meta.env.DEV ? "Enter development client" : "Sign in with ChatGPT"}<span>↗</span></button><div className="auth-note"><span className="auth-check">✓</span><span><strong>{import.meta.env.DEV ? "Development session" : "Your MagicMadness account"}</strong><small>{import.meta.env.DEV ? "Progression rewards are disabled in development." : "Your hero and journey are saved to your account."}</small></span></div>{error && <p className="error-message">{error}</p>}<RouteLink to="/" navigate={navigate} className="text-link">Back to public site</RouteLink></div></section></main>;
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
  ["/game/visual-lab", "⌬", "3D Visual Lab"],
] as const;

function GameHubLayout({ path, navigate, identity, selectedHero, account, signOut, children }: { path: string; navigate: Navigate; identity: Identity; selectedHero: HeroId; account: HostedAccount; signOut: () => Promise<void>; children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => setMenuOpen(false), [path]);
  const hero = heroDefinitions.find((entry) => entry.id === selectedHero) ?? heroDefinitions.find((entry) => entry.id === "fire-ember")!;
  async function leaveAccount() {
    await signOut();
    navigate("/");
  }
  return <main className="game-shell">{path !== "/game" && path !== "/game/heroes" && <div className="client-ambient" aria-hidden="true"><Suspense fallback={<div className="showcase-loading">Loading 3D scene…</div>}><HeroShowcase hero={hero} /></Suspense></div>}<header className="game-shell-header"><button className="mobile-menu-button" onClick={() => setMenuOpen((value) => !value)} aria-label="Open game menu">☰</button><Brand navigate={navigate} inverse /><div className="game-shell-status"><span className="pulse-dot" /> THE MERIDIAN <small>GAME CLIENT</small></div><button className="account-chip" onClick={() => navigate("/game/profile")}><span className="avatar">{identity.displayName.slice(0, 1).toUpperCase()}</span><span><strong>{identity.displayName}</strong><small>Level {account.level} · Profile</small></span></button><button className="shell-exit" onClick={() => void leaveAccount()}>Log out</button></header><div className="game-shell-layout"><aside className={"game-shell-sidebar " + (menuOpen ? "open" : "")}><div className="shell-nav-label">GAME CLIENT / MERIDIAN</div><div className="shell-hero-status"><span className="shell-hero-orb" style={{ background: hero.color }} /><span><strong>{hero.name}</strong><small>Starter · Level 1</small></span></div>{gameNav.map(([to, glyph, label]) => <RouteLink key={to} to={to} navigate={navigate} className={path === to ? "active" : ""} ><span>{glyph}</span>{label}{to === "/game/talents" && account.level < 10 && <small>Lv.10</small>}{to === "/game/runes" && account.level < 5 && <small>Lv.5</small>}{to === "/game/collection" && <small>Locked</small>}{to === "/game/play" && <em>GO</em>}</RouteLink>)}<div className="shell-sidebar-footer"><span className="status-line"><span className="pulse-dot" /> Simulation ready</span><small>Aim carefully. Hold your ground. Recover before the edge.</small></div></aside><section className="game-shell-content">{children}</section></div></main>;
}

function HubHeader({ eyebrow, title, action, navigate }: { eyebrow: string; title: string; action?: [string, string]; navigate: Navigate }) {
  return <div className="hub-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></div>{action && <button className="primary-button compact" onClick={() => navigate(action[0])}>{action[1]} <span>↗</span></button>}</div>;
}

function GameLauncher({ navigate, selectedHero, account, setSelectedHero }: { navigate: Navigate; selectedHero: HeroId; account: HostedAccount; setSelectedHero: (heroId: HeroId) => void }) {
  const hero = heroDefinitions.find((entry) => entry.id === selectedHero) ?? heroDefinitions[0];
  if (!hero) return null;
  const start = () => {
    const matchId = `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    requestBrowserFullscreen();
    navigate(`/match/local/${matchId}`);
  };
  return <><HubHeader eyebrow={`GAME CLIENT · LEVEL ${account.level}`} title="Open the arena." action={["/game/play", "Choose a mode"]} navigate={navigate} /><section className="launcher-hero"><div className="launcher-hero-background"><img src="/assets/magicmadness-battle.webp" alt="" /></div><div className="launcher-hero-copy"><span className="launcher-kicker"><span className="pulse-dot" /> THE MERIDIAN · TRAINING OPEN</span><h2>Meet your first<br /><span>elemental hero.</span></h2><p>Choose your starter, enter a spacious fullscreen 3D arena and learn movement, 360° aiming, impact, knockback and elemental pressure against four chibi bots.</p><button className="primary-button" onClick={start}>Play Vs Bots <span>↗</span></button></div><div className="launcher-readout"><HeroShowcase hero={hero} /><span className="mini-label">STARTER HERO · LEVEL 1</span><div className="launcher-hero-id" style={{ "--hero-color": hero.color } as CSSProperties}><span><ElementIcon element={hero.element} /></span><div><strong>{hero.name}</strong><small>{elementLabels[hero.element]} · {hero.primaryClass}</small></div></div><button className="text-link" onClick={() => navigate("/game/heroes")}>Choose another hero →</button></div></section><div className="launcher-grid"><article className="launcher-card"><span className="mini-label">FIRST MATCH</span><h3>Grand Meridian · 3D</h3><p>Five fighters, four elemental families, Wind Surge, circular skills and one standard respawn. The larger arena uses authored shrines, ruins and cover.</p><div className="launcher-tags"><span>3D SCENE</span><span>4 ELEMENTS</span><span>4 BOTS</span></div></article><article className="launcher-card"><span className="mini-label">ACCOUNT SIGNAL</span><h3>Level {account.level} · {accountBand(account.level)}</h3><p>Your hero, guide and build stay with your account. Grow through verified battles to unlock skills, rune slots and talent choices.</p><button className="text-link" onClick={() => navigate("/game/profile")}>Open profile →</button></article></div><section className="launcher-select"><div className="section-heading small"><p className="eyebrow">STARTER SELECT</p><h2>Choose your fighter.</h2></div><div className="hero-select-grid">{heroDefinitions.map((entry) => <button key={entry.id} className={"select-hero " + (entry.id === selectedHero ? "selected" : "")} style={{ "--hero-color": entry.color } as CSSProperties} onClick={() => setSelectedHero(entry.id)}><span className="select-glyph"><ElementIcon element={entry.element} /></span><span><strong>{entry.name}</strong><small>{elementLabels[entry.element]} · {entry.primaryClass}</small></span><span className="select-check">{entry.id === selectedHero ? "✓" : "○"}</span></button>)}</div></section></>;
}

function PlayHub({ navigate, selectedHero, setSelectedHero }: { navigate: Navigate; selectedHero: HeroId; setSelectedHero: (heroId: HeroId) => void }) {
  const [verifiedAvailable, setVerifiedAvailable] = useState(false);
  const [availabilityChecked, setAvailabilityChecked] = useState(false);
  useEffect(() => {
    let active = true;
    void fetch("/api/matches/availability", { credentials: "include", headers: { accept: "application/json" } })
      .then((response) => response.ok ? response.json() as Promise<{ available?: boolean }> : Promise.reject(new Error("availability_failed")))
      .then((payload) => { if (active) setVerifiedAvailable(payload.available === true); })
      .catch(() => { if (active) setVerifiedAvailable(false); })
      .finally(() => { if (active) setAvailabilityChecked(true); });
    return () => { active = false; };
  }, []);
  const startPractice = () => {
    const matchId = `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    requestBrowserFullscreen();
    navigate(`/match/local/${matchId}`);
  };
  const startVerified = () => {
    requestBrowserFullscreen();
    navigate(`/match/verified/${Date.now().toString(36)}`);
  };
  return <>
    <HubHeader eyebrow="PLAY · MATCHMAKING" title="Choose your pressure." navigate={navigate} />
    <div className="play-status-bar"><span><span className="pulse-dot" /> practice simulation ready</span><small>Practice freely with all starter spells. Verified battles use your account unlocks and award XP.</small></div>
    <div className="mode-grid hub-mode-grid">
      <article className="mode-card featured-mode"><div><span className="mode-icon">✦</span><span className="mini-label">LOCAL · NO REWARDS</span><h2>Practice Vs Bots</h2><p>Browser simulation with the complete arena loop. It never creates a receipt or persistent XP.</p></div><button className="primary-button" onClick={startPractice}>Start practice <span>↗</span></button></article>
      <article className={`mode-card verified-mode-card ${verifiedAvailable ? "available" : "unavailable"}`}><span className="mode-tag">ACCOUNT PROGRESSION</span><h3>Verified Vs Bots</h3><p>Battle four opponents with your saved build. Completed verified battles award account XP and unlock your next skills.</p><button className={verifiedAvailable ? "primary-button" : "outline-button"} disabled={!verifiedAvailable} onClick={startVerified}>{verifiedAvailable ? "Start verified match" : availabilityChecked ? "Verified battles unavailable" : "Checking server…"}</button><span className="muted-copy tiny">{verifiedAvailable ? "Account rewards enabled" : "The online battle service is not available yet. Practice is open below."}</span></article>
      <article className="mode-card"><span className="mode-tag">PvE · CONTRACT READY</span><h3>History</h3><p>Study the four elemental chapters. Boss staging is visible; only authored boss content is playable when its contract is complete.</p><button className="text-link" onClick={() => navigate("/game/history")}>Open history →</button></article>
      <article className="mode-card"><span className="mode-tag">RATING · LOCKED</span><h3>Ranked</h3><p>Competitive play waits for authoritative matchmaking and persistence.</p><span className="muted-copy tiny">Position, hit and score never trust the browser.</span></article>
      <article className="mode-card"><span className="mode-tag">SOCIAL · IN BUILD</span><h3>Friends</h3><p>Invite-link rooms are modeled separately from local play.</p><button className="text-link" onClick={() => navigate("/game/friends")}>Open friends →</button></article>
    </div>
    <HeroPicker selectedHero={selectedHero} setSelectedHero={setSelectedHero} />
    <div className="contract-banner"><strong>Standard contract verified</strong><span>{MODE_RULES.standard.respawns} respawn · Match Score separated from Performance Score</span></div>
  </>;
}

function HeroPicker({ selectedHero, setSelectedHero }: { selectedHero: HeroId; setSelectedHero: (heroId: HeroId) => void }) {
  return <section className="hero-select hub-picker"><div className="section-heading small"><p className="eyebrow">STARTER SELECT</p><h2>Pick a hero to test.</h2></div><div className="hero-select-grid">{heroDefinitions.map((hero) => <button key={hero.id} className={"select-hero " + (selectedHero === hero.id ? "selected" : "")} style={{ "--hero-color": hero.color } as CSSProperties} onClick={() => setSelectedHero(hero.id)}><span className="select-glyph">{elementGlyph[hero.element]}</span><span><strong>{hero.name}</strong><small>{elementLabels[hero.element]} · {hero.primaryClass}</small></span><span className="select-check">{selectedHero === hero.id ? "✓" : "○"}</span></button>)}</div></section>;
}

function ProfilePage({ identity, account: hosted, navigate }: { identity: Identity; account: HostedAccount; navigate: Navigate }) {
  const account = createAccountProgression(identity.accountId);
  return <><HubHeader eyebrow="ACCOUNT · PROFILE" title="Your arena identity." action={["/game/play", "Play now"]} navigate={navigate} /><section className="account-profile-card"><div className="profile-avatar-large">{identity.displayName.slice(0, 1).toUpperCase()}</div><div><span className="mini-label">{identity.provider === "chatgpt" ? "CHATGPT ACCOUNT" : "DEVELOPMENT ACCOUNT"}</span><h2>{identity.displayName}</h2><p>Account {identity.accountId} · connected identity adapter</p><div className="profile-pill-row"><span>Level {hosted.level}</span><span>{accountBand(hosted.level)} band</span><span>{hosted.experience} XP total</span></div></div><div className="profile-rank"><span className="mini-label">CURRENT SIGNAL</span><strong>NEW AWAKENING</strong><small>Starter account</small></div></section><AccountRecordPanel experience={hosted.experience} level={hosted.level} /><div className="profile-link-grid"><button onClick={() => navigate("/game/heroes")}><span>✦</span><strong>Roster</strong><small>Choose your level 1 starter hero</small>→</button><button onClick={() => navigate("/game/talents")}><span>⌁</span><strong>Talents</strong><small>Locked until account progression</small>→</button><button onClick={() => navigate("/game/runes")}><span>◇</span><strong>Runes</strong><small>Locked until account progression</small>→</button></div></>;
}

function HeroesHub({ navigate, selectedHero, setSelectedHero }: { navigate: Navigate; selectedHero: HeroId; setSelectedHero: (heroId: HeroId) => void }) {
  const selected = heroDefinitions.find((hero) => hero.id === selectedHero) ?? heroDefinitions.find((hero) => hero.id === "fire-ember")!;
  return <><HubHeader eyebrow="BUILD · HEROES" title="Read the roster." action={["/game/play", "Play selected"]} navigate={navigate} /><section className="hero-detail-panel" style={{ "--hero-color": selected.color } as CSSProperties}><div><span className="mini-label">SELECTED STARTER · LEVEL 1</span><h2>{selected.name}</h2><p>{selected.summary}</p><div className="hero-detail-facts"><span>{elementLabels[selected.element]}</span><span>{selected.primaryClass}</span><span>{selected.difficulty} onboarding</span></div><button className="primary-button" onClick={() => navigate("/game/play")}>Play as {selected.name} <span>↗</span></button></div><HeroShowcase hero={selected} /></section><Spellbook heroId={selected.id} /><div className="hub-hero-grid">{heroDefinitions.map((hero) => <article className={"hub-hero-card " + (selectedHero === hero.id ? "selected" : "")} key={hero.id} style={{ "--hero-color": hero.color } as CSSProperties}><div className="hub-hero-card-top"><span className="hub-hero-glyph"><ElementIcon element={hero.element} /></span><span className="mode-tag">{elementLabels[hero.element]} · {hero.primaryClass}</span></div><h2>{hero.name}</h2><p>{hero.summary}</p><div className="hub-skill-list">{hero.skillIds.map((skillId, index) => { const skill = skillDefinitions.find((entry) => entry.id === skillId); const behavior = skill ? skill.geometry.kind === "line" ? "projectile" : skill.geometry.kind : "projectile"; return <span key={skillId}><SkillIcon behavior={behavior} element={hero.element} /><b>{index + 1}</b>{skill?.name}</span>; })}</div><button className="outline-button" onClick={() => setSelectedHero(hero.id)}>{selectedHero === hero.id ? "Selected · play" : "Select hero"}</button></article>)}</div><div className="contract-banner"><strong>Four elemental starters</strong><span>sixteen distinct skills · free starter selection · inspect each spell before entering the arena</span></div></>;
}

function HistoryPage({ navigate }: { navigate: Navigate }) {
  return <><HubHeader eyebrow="PLAY · HISTORY" title="Learn the Meridian one chapter at a time." navigate={navigate} /><div className="history-intro"><div><p>History teaches the same combat grammar through staged pressure. Each chapter has an explicit contract; the client only presents a boss as playable when its authored mechanics exist.</p></div><div className="history-progress"><span className="mini-label">CHAPTER PROGRESS</span><strong>01 / 04</strong><div className="progress-track"><span style={{ width: "24%" }} /></div></div></div><div className="chapter-list">{historyChapters.map((chapter) => { const bossReady = chapter.id === "fire-chapter"; return <article className={"chapter-card " + (bossReady ? "ready" : "locked")} key={chapter.id} style={{ "--chapter-color": chapter.element === "fire" ? "#ff6b35" : chapter.element === "water" ? "#35baf6" : chapter.element === "earth" ? "#c99a5b" : "#b18cff" } as CSSProperties}><div className="chapter-number">0{chapter.order}</div><div className="chapter-copy"><span className="mini-label">{elementLabels[chapter.element]} CHAPTER</span><h2>{chapter.title}</h2><p>Teaching focus: {chapter.teachingFocus.join(" · ")}</p><div className="chapter-tags">{chapter.stageIds.map((stage) => <span key={stage}>{stage}</span>)}<span>{bossReady ? "CINDER WARDEN" : "BOSS CONTRACT"}</span></div></div><div className="chapter-action">{bossReady ? <><span className="ready-label"><span className="pulse-dot" /> CONTRACT READY</span><button className="outline-button" onClick={() => navigate(`/match/history/${chapter.stageIds[0] ?? "fire-01"}`)}>Open stage brief</button></> : <><span className="muted-copy tiny">CONTENT CONTRACT TRACKED</span><button className="outline-button" disabled>Coming through dependency</button></>}</div></article>; })}</div></>;
}

function HistoryStageScreen({ stageId, navigate, selectedHero }: { stageId: string; navigate: Navigate; selectedHero: HeroId }) {
  const chapter = historyChapters.find((entry) => entry.stageIds.includes(stageId)) ?? historyChapters[0];
  const stage = historyStages.find((entry) => entry.id === stageId);
  const boss = stage?.purpose === "boss" && stage.bossId === "cinder-warden";
  const startStudyMatch = () => {
    const matchId = `history-${stageId}-${Date.now().toString(36)}`;
    requestBrowserFullscreen();
    navigate(`/match/local/${matchId}`);
  };
  if (!chapter) return null;
  return <main className="stage-brief-page"><div className="stage-brief-back"><button className="game-brand" onClick={() => navigate("/game/history")}><span className="brand-mark">MM</span><span>Back to History</span></button><span className="system-version">STAGE BRIEF · {stageId}</span></div><section className="stage-brief-card" style={{ "--chapter-color": boss ? "#ff6b35" : "#b18cff" } as CSSProperties}><div className="stage-brief-art"><img src="/assets/magicmadness-battle.webp" alt="Elemental battle preview" /></div><div className="stage-brief-copy"><span className="mini-label">{elementLabels[chapter.element]} · CHAPTER {chapter.order} · {stage?.purpose?.toUpperCase() ?? "STAGE"}</span><h1>{chapter.title}</h1><p>This route exposes the canonical History contract. The current client can study the arena loop with a local simulation; boss authority and authored encounter scripting remain separate dependencies.</p><div className="brief-facts"><span><strong>{chapter.stageIds.length}</strong> stages</span><span><strong>{boss ? "3" : "—"}</strong> boss phases</span><span><strong>{stage?.mechanics.length ?? chapter.teachingFocus.length}</strong> mechanics</span></div><div className="result-actions"><button className="primary-button" onClick={startStudyMatch}>Play local study match <span>↗</span></button><button className="text-link" onClick={() => navigate("/game/history")}>Return to history</button></div><div className="contract-note"><strong>{boss ? "Cinder Warden contract authored" : "Boss contract placeholder"}</strong><span>{boss ? "telegraphed meteor · ember ring · destructible cover · edge recovery" : "This stage is visible but not presented as a finished boss fight."}</span></div></div></section><div className="stage-brief-footer"><span>Selected hero: {heroDefinitions.find((hero) => hero.id === selectedHero)?.name ?? selectedHero}</span><span>Local study mode · no competitive result</span></div></main>;
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
  return <main className="game-boot-page" data-testid="game-boot"><div className="game-boot-mark"><span className="brand-mark">MM</span><div><strong>MAGICMADNESS</strong><small>ARENA CLIENT</small></div></div><div className="boot-visual"><img src="/assets/magicmadness-battle.webp" alt="" /><div className="boot-ring" /></div><div className="boot-copy"><p className="eyebrow">MATCH {matchId.toUpperCase()}</p><h1>Opening the<br /><span>3D arena.</span></h1><div className="boot-progress"><div><span>{stage}</span><strong>{progress}%</strong></div><div className="progress-track"><span style={{ width: `${progress}%` }} /></div></div><div className="boot-status"><span><span className="pulse-dot" /> 3D scene renderer</span><span><span className="pulse-dot" /> deterministic core</span><span><span className="status-hollow" /> server authority separate</span></div></div></main>;
}

function MatchRoute({ matchId, heroId, onExit }: { matchId: string; heroId: HeroId; onExit: () => void }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const image = new Image();
    image.src = "/assets/magicmadness-battle.webp";
    let active = true;
    const minimum = new Promise<void>((resolve) => window.setTimeout(resolve, 650));
    void Promise.all([minimum, import("./game/HeroAssetLoader").then(({ preloadHeroAssets }) => preloadHeroAssets())])
      .catch(() => undefined)
      .then(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, [heroId]);
  if (!ready) return <GameBootScreen matchId={matchId} />;
  return <Suspense fallback={<GameBootScreen matchId={matchId} />}><LiveGame key={matchId} matchId={matchId} heroId={heroId} mode="standard" onExit={onExit} /></Suspense>;
}

function GameHubPage({ path, navigate, identity, initialSelectedHero, account, persistHero, signOut }: { path: string; navigate: Navigate; identity: Identity; initialSelectedHero: HeroId; account: HostedAccount; persistHero: (heroId: HeroId) => Promise<void>; signOut: () => Promise<void> }) {
  const [selectedHero, setSelectedHero] = useState<HeroId>(initialSelectedHero);
  const [saveError, setSaveError] = useState("");
  useEffect(() => setSelectedHero(initialSelectedHero), [initialSelectedHero]);
  function chooseHero(heroId: HeroId) {
    setSelectedHero(heroId);
    void persistHero(heroId).catch(() => { setSelectedHero(initialSelectedHero); setSaveError("Hero could not be saved. Please try again."); });
  }
  let content: ReactNode;
  if (path === "/game/play") content = <PlayHub navigate={navigate} selectedHero={selectedHero} setSelectedHero={chooseHero} />;
  else if (path === "/game/profile") content = <ProfilePage identity={identity} account={account} navigate={navigate} />;
  else if (path === "/game/heroes") content = <HeroesHub navigate={navigate} selectedHero={selectedHero} setSelectedHero={chooseHero} />;
  else if (path === "/game/talents") content = <BuildWorkshop kind="talents" level={account.level} heroId={selectedHero} dev={identity.provider === "dev"} />;
  else if (path === "/game/runes") content = <BuildWorkshop kind="runes" level={account.level} heroId={selectedHero} dev={identity.provider === "dev"} />;
  else if (path === "/game/history") content = <HistoryPage navigate={navigate} />;
  else if (path === "/game/friends") content = <GenericSystemPage kind="friends" navigate={navigate} />;
  else if (path === "/game/collection") content = <CollectionRoom level={account.level} />;
  else if (path === "/game/visual-lab") content = <VisualLab />;
  else content = <GameLauncher navigate={navigate} account={account} selectedHero={selectedHero} setSelectedHero={chooseHero} />;
  return <GameHubLayout path={path} navigate={navigate} identity={identity} selectedHero={selectedHero} account={account} signOut={signOut}><ClientJourney accountId={identity.accountId} dev={identity.provider === "dev"} path={path} navigate={navigate} />{saveError && <p role="alert" className="error-message">{saveError}</p>}{content}</GameHubLayout>;
}

function App() {
  const { path, navigate } = useRouter();
  const { identity, account, sessionChecked, signIn, signOut, selectHero, hasChatGptBridge, refreshAccount } = useAuth();
  useEffect(() => { if (path.startsWith("/game") && identity?.provider === "chatgpt") void refreshAccount().catch(() => undefined); }, [path, identity?.provider, refreshAccount]);
  const selectedHero = account?.selectedHeroId ?? "fire-ember";
  const matchPath = path.match(/^\/match\/(local|history|verified)\/([^/]+)$/);
  if (matchPath && !sessionChecked) {
    return <main className="game-boot-page"><div className="boot-copy"><p className="eyebrow">HOSTED ACCOUNT</p><h1>Loading your<br /><span>saved fighter.</span></h1></div></main>;
  }
  if (matchPath?.[1] === "history" && identity) {
    return <HistoryStageScreen stageId={matchPath[2] ?? "fire-01"} navigate={navigate} selectedHero={selectedHero} />;
  }
  if (matchPath?.[1] === "verified" && identity && account) {
    return <Suspense fallback={<GameBootScreen matchId="verified-server" />}><VerifiedGame heroId={selectedHero} accountExperience={account.experience} onExit={() => { exitBrowserFullscreen(); navigate("/game/play"); }} /></Suspense>;
  }
  if (matchPath && identity) {
    return <MatchRoute matchId={matchPath[2] ?? "local-match"} heroId={selectedHero} onExit={() => { exitBrowserFullscreen(); navigate("/game/play"); }} />;
  }
  if (matchPath && !identity) {
    return <LoginPage navigate={navigate} signIn={signIn} hasChatGptBridge={hasChatGptBridge} />;
  }
  if (path === "/login") return <LoginPage navigate={navigate} signIn={signIn} hasChatGptBridge={hasChatGptBridge} />;
  if (path.startsWith("/game")) {
    if (!sessionChecked) return <main className="game-boot-page"><div className="boot-copy"><p className="eyebrow">HOSTED ACCOUNT</p><h1>Opening your<br /><span>elemental profile.</span></h1></div></main>;
    if (!identity) return <LoginPage navigate={navigate} signIn={signIn} hasChatGptBridge={hasChatGptBridge} />;
    return <Suspense fallback={<main className="game-boot-page"><div className="boot-copy"><p className="eyebrow">GAME CLIENT</p><h1>Loading the<br /><span>3D shell.</span></h1></div></main>}><GameHubPage path={path} navigate={navigate} identity={identity} initialSelectedHero={selectedHero} account={account!} persistHero={selectHero} signOut={signOut} /></Suspense>;
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
