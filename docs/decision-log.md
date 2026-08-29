# MagicMadness Arena — Decision Log

## Product decisions

Product decisions 1–46 are closed and preserved in
docs/canonical/18_DECISION_TRACEABILITY_1_46.md. The Executive Digest and
D0–D11 documents are the product source of truth.

## Technical baseline decisions

### T001 — Shared game core before online authority

The local bot path and future authoritative server import the same
packages/game-core simulation. This keeps local playtests useful without
creating a disposable prototype engine.

### T002 — Deterministic adapter for first vertical slice

The first slice uses a small deterministic 2D physics adapter behind an
interface. It supports the acceptance scenarios now and leaves a replaceable
boundary for Rapier 2D WASM if measured collision complexity requires it.

### T003 — Vite/PixiJS web client

The web surface uses React/Vite for the public/app shell and PixiJS for the
2D world renderer. HUD remains DOM-based so it does not scale with world zoom.

### T004 — ChatGPT authentication adapter

Development uses a local identity. Sign in with ChatGPT is represented by an
adapter because availability depends on the deployment surface; account
identity is never derived from email.

### T005 — Route-separated game client

The public discovery surface, authenticated launcher and actual match client
are separate URL route families: public `/`, `/heroes`, `/elements`,
`/modes`, `/world` and `/news`; authenticated `/game/*`; and match
`/match/local/:matchId` or `/match/history/:stageId`. The web client uses a
small history API adapter so the surface remains static-host compatible while
retaining real navigation and deep-linkable entry points.

### T006 — Fullscreen as progressive enhancement

Starting a match requests browser fullscreen from the initiating user gesture.
The game remains playable in a normal viewport when fullscreen is unavailable;
`100dvh`, safe-area-aware responsive layout and the landscape warning preserve
the mobile contract without making browser fullscreen a gameplay dependency.

### T007 — HD presentation without simulation coupling

Public/stage presentation may use original raster key art, while the live arena
remains code-rendered through Pixi from authoritative `GameState`. Visual art
cannot become a gameplay input or balance source; the deterministic simulation
continues to use versioned content and balance packages.

### T008 — Renderer fallback at the game-client boundary

PixiJS remains the preferred live renderer. If WebGL cannot be initialized on a
browser or hosted surface, the same `GameState` is rendered through a native
Canvas 2D fallback on the existing game canvas. This preserves a real playable
client and input surface without changing simulation, scoring or authority.

### T009 — Fullscreen-first match presentation

The match route owns the whole viewport. The arena renderer is the visual
foundation; score, placement, diagnostics, event log and controls are layered
over it and reduced on mobile landscape. This preserves the canonical HUD
information while ensuring the client reads as a game scene before it reads as
an application shell.

### T010 — Procedural art baseline before sprite production

The first visual client pass uses deterministic renderer-side shapes for unit
silhouettes, arena floor detail, props and elemental feedback so the game can be
played and tested without coupling art files to simulation. These shapes are an
implementation baseline, not a product art decision; original animated sprite
atlases, terrain tiles and authored VFX can replace them without changing
GameState, content, balance or authority contracts.

### T011 — Dual-stick input boundary for mobile client

The mobile match client exposes independent circular move and aim controls.
Both controls emit normalized vectors into the same `InputCommand` stream used
by keyboard/mouse play. A skill remains a hold-to-preview action and casts only
when the release command reaches `game-core`; pointer cancellation releases the
skill as well, preventing a stuck input state.

### T012 — Circular combat control language

Touch-facing skills, dash and potion actions use circular controls in the match
HUD. Skill glyphs are derived from the versioned balance behavior, while the
renderer remains responsible for the higher-fidelity world presentation.

### T013 — Persistent visual confirmation for non-projectile casts

Because radial, pull, field, wall and dash skills do not all leave a moving
projectile in the world, the renderer emits a short behavior-specific cast
burst from the `CAST_RELEASE` event. This is presentation-only feedback; hit,
damage, cooldown and outcome remain owned by `game-core`.

### T014 — Landscape battle HUD composition

On short landscape screens, the match client hides secondary score and event
rails so the arena owns the full viewport. Movement, aim, skills, dash and
potions remain circular DOM overlays above the renderer, while fullscreen and
pause remain in the compact topbar. Pause only gates the local simulation
clock; it does not add an authority rule or mutate `GameState`.

## Change rule

Any technical change that changes authority, simulation ordering, content
versioning, persistence, or deployment boundaries requires a new ADR and
updated evidence in implementation-status.md.
