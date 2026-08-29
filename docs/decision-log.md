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

## Change rule

Any technical change that changes authority, simulation ordering, content
versioning, persistence, or deployment boundaries requires a new ADR and
updated evidence in implementation-status.md.
