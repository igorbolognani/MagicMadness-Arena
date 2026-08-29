# Technical Architecture — MagicMadness Arena

> **MAGICMADNESS ARENA — CANONICAL EXECUTION SPEC**
>
> Status: implementation baseline. Product/game-design requirements come from the canonical D0–D11 pack.
> Technical choices may evolve only through evidence-backed ADRs and must preserve the product contract.

## Objective

Build the **complete project architecture now**, while making the earliest dependency-complete slice playable quickly on mobile against bots.

The architecture must support:
- public website;
- authenticated hero/app landing;
- mobile and desktop web game client;
- local bot matches;
- History/PvE;
- authoritative online PvP;
- invite links/friends;
- account progression;
- talents;
- runes;
- collection/economy;
- analytics and replayable match evidence.

## Hosting reality

ChatGPT Sites is a suitable starting surface for:
- public pages;
- interactive product explanations;
- authenticated app shell where supported;
- a browser game client;
- preview and published URLs.

Do **not** assume the Sites runtime alone can host every final realtime/server/database/background capability.

Therefore client, realtime simulation and persistence are separate deployable concerns.

## Recommended implementation stack

### Monorepo
- TypeScript strict.
- pnpm workspaces.
- Turborepo only if it materially helps; avoid build-system complexity for its own sake.

### Web/UI/Game client
- React.
- Vite.
- PixiJS for performant 2D rendering.
- Zustand for local UI/meta state.
- React Router for site/app routes.
- CSS design tokens and a small shared component system.

### Game core / physics
- shared deterministic fixed-step TypeScript game-core;
- Rapier 2D WASM or an equivalent robust 2D physics adapter;
- an abstract vertical gameplay scalar/state for airborne mechanics;
- zero gameplay rules inside React components.

### Realtime game server
- Node.js TypeScript;
- authoritative fixed-step room simulation;
- WebSocket transport;
- server owns movement truth, hits, damage, cooldowns, RNG, death, respawn, score and results.

### Persistence/API
- TypeScript API service;
- PostgreSQL;
- Drizzle or Prisma;
- Redis only when matchmaking/presence/room coordination proves it is needed.

### Testing
- Vitest;
- Playwright;
- deterministic headless simulation;
- network reconciliation tests.

### Observability
- structured logs;
- OpenTelemetry-ready interfaces;
- append-only match events;
- client/server performance counters.

## Repository structure

```text
magicmadness-arena/
├─ apps/
│  ├─ web/
│  │  ├─ public site
│  │  ├─ authenticated app shell
│  │  └─ Pixi game client
│  ├─ game-server/
│  └─ api/
├─ packages/
│  ├─ game-core/
│  ├─ physics/
│  ├─ content/
│  ├─ balance/
│  ├─ protocol/
│  ├─ ui/
│  ├─ auth/
│  ├─ telemetry/
│  └─ testkit/
├─ docs/
│  ├─ canonical/
│  ├─ architecture/
│  ├─ ADR/
│  └─ testing/
├─ assets/
│  ├─ icons/
│  ├─ heroes/
│  ├─ maps/
│  ├─ vfx/
│  └─ audio/
└─ .github/workflows/
```

## Runtime topology

```text
BROWSER / MOBILE WEB
   │
   ├─ React application shell
   │
   └─ Pixi game renderer
          │
          ├─ local prediction
          │
          ├──────── Vs Bots ─────────► local/shared Game Core
          │
          └──────── Online ──────────► WebSocket
                                         │
                                  Authoritative Server
                                         │
                          ┌──────────────┼───────────────┐
                          ↓              ↓               ↓
                      Game Core      Match Events      API
                                                           │
                                                       PostgreSQL
```

## Determinism and authority

Competitive server does **not** trust the client for:
- world position;
- hit detection;
- damage;
- resource spending;
- cooldown completion;
- death;
- respawn;
- score;
- RNG;
- gacha/economy outcome.

Client may predict:
- own movement;
- immediate cast animation/feedback;
- non-authoritative VFX.

It reconciles to server snapshots.

## Simulation

Implementation baseline:
- fixed-step simulation around 60 Hz when feasible;
- network snapshot rate may be lower;
- render interpolation independent from simulation;
- monotonic tick/time source;
- seeded RNG for authored randomness.

No physics is tied to render FPS.

## Protocol

Version:
- protocol;
- balance;
- hero/skill content;
- arena/event content;
- ruleset.

Reject incompatible clients rather than silently desynchronizing.

Message families:
- input;
- lobby;
- ready;
- match start;
- authoritative snapshot;
- reliable gameplay event;
- score/round;
- disconnect/reconnect;
- result.

## Routes

### Public
```text
/
 /how-it-works
 /heroes
 /elements
 /modes
 /world
 /news
 /login
```

### Authenticated
```text
/app
/app/play
/app/history
/app/pvp
/app/ranked
/app/bots
/app/friends
/app/heroes
/app/talents
/app/runes
/app/collection
/app/profile
/app/settings
```

### Game
```text
/play/local
/play/bots
/play/match/:matchId
/play/lobby/:lobbyId
```

## Authentication

Desired primary login:
**Sign in with ChatGPT where the deployment surface supports it.**

Keep an adapter:

```text
AuthProvider
 ├─ getSession()
 ├─ signIn()
 ├─ signOut()
 └─ getIdentity()
```

Development can use a dev/local identity without blocking gameplay.

Never use email itself as the internal player/account ID.

## Mobile-first requirements

Gameplay:
- landscape;
- safe-area aware;
- touch hit targets larger than visual icons;
- hold/drag/release targeting;
- two-finger pinch zoom isolated from cast gestures;
- no preventable 300ms-style interaction delays;
- local visual response on the same frame when possible.

Rendering:
- target 60 FPS representative mid-range phone;
- DPR cap;
- culling;
- sprite atlases;
- pooled temporary entities/VFX;
- LOD at far zoom;
- preserve telegraphs at every LOD.

## Desktop

- keyboard + mouse;
- 16:9-first layout;
- scroll zoom;
- same game simulation/content as mobile;
- desktop-specific hint labels only.

## Offline/local bot path

The client must be able to instantiate the shared core locally.

Purpose:
- immediate mobile testing;
- gameplay development without backend blocking;
- deterministic bot regression;
- tutorial/History foundations.

It must not become a separate incompatible “prototype engine.”

## Online path

For friend/PvP:
- authoritative server;
- client prediction;
- interpolation;
- reconciliation;
- reconnect;
- rate limiting;
- input sequencing.

## Website / landing

Public homepage:
- featured hero;
- clear MagicMadness identity;
- video/gameplay showcase components;
- physics/knockout explanation;
- elements/classes;
- History/bosses;
- PvP modes;
- fair-progression message;
- Login/Play CTA.

Authenticated `/app`:
- selected profile hero is central;
- Play is primary;
- progression/collection routes secondary.

## ChatGPT Sites deployment

First deploy can contain:
- public site;
- app shell;
- local bot game;
- account/auth scaffold supported by the runtime.

When realtime server is needed, keep it independently deployable and connect through an environment-configured URL.

Never fake server authority in competitive mode merely to keep everything inside one hosting surface.

## GitHub

Repository is the durable source of truth.

Branch policy:
- protected `main`;
- feature branches;
- PR checks;
- tagged beta releases when useful.

Canonical docs live in:
`docs/canonical/`

## Security

- server validates all input;
- no client-owned scores/economy;
- no secrets in browser;
- auth/session validation;
- rate-limit lobby/API;
- sequence/nonce or equivalent anti-replay for realtime input;
- input magnitude validation;
- server-owned RNG;
- immutable currency ledger.

## Technical acceptance

A mature flow must support:

```text
FRIEND OPENS INVITE
 → AUTH
 → JOIN LOBBY
 → READY
 → PLAY
 → AUTHORITATIVE RESULT
 → PROGRESSION UPDATE
```

And the same client remains usable in local bot mode.
