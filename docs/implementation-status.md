# MagicMadness Arena — Implementation Status

Updated: 2026-09-15

## Current combat direction — September 15

Latest explicit user direction supersedes earlier WASD and arena-size defaults.
- Arena: 3600×2200 (2.90 times the previous area); cover centers and spawns spread proportionally, with cover footprints preserved. Higher orthographic framing keeps the previous viewing angle; wheel/pinch zoom remains available.
- Desktop: right click sets a visible walking destination with routes around cover; QWER selects, left mouse aims/releases, 1/2 use HP/MP potions, Space dashes. Walking continues during aiming/casting. Touch joystick and drag-cast remain available.
- Meteor Fall now telegraphs for 0.85 seconds and resolves damage/displacement on landing. The renderer follows the same falling-strike state with rock, molten seams, flame trail, ground warning and debris. Faster movement, longer projectile trails and larger basic projectiles support distance/readability.
- Validation: unit/integration tests and TypeScript checks. Visual quality and combat feel still require a hands-on play session; no browser playtest or performance claim is implied.

## Evidence-backed baseline

The repository was initialized from the complete canonical pack in
docs/canonical/ (00 through 18). Product decisions are the baseline, amended by subsequent explicit user direction.
Technical choices below are implementation baselines and remain replaceable
only through ADRs that preserve the product contract.

## Completed in this initial milestone

- Continuation milestone: authenticated `/game/visual-lab` now inspects the shared four GLBs, thirteen clips, crossfades, skeletons, wireframe, cameras, quality tiers and all sixteen skill VFX packages. Its stress scene publishes renderer and bounded-pool counters without auto-approving unobserved visual checks.
- Presentation corrections: failed asset promises are evicted for explicit retry; every instance owns cloned texture resources with correct color spaces; model bounds are grounded consistently; death cannot fall back to idle during respawn; animation pause/speed and pool rejection/capacity metrics are explicit.
- Verified Vs Bots implementation: a Worker-issued signed session ticket authenticates the external WebSocket; the game-server owns the fixed tick and four improved bots, accepts strict inputs only, emits 20 Hz snapshots, neutralizes input on disconnect, supports a 20-second reconnect and signs one stable result receipt.
- Receipt presentation: the authenticated client performs bounded retry with the identical receipt and shows placement, both score layers, XP before/gained/current, reward, abbreviated receipt ID and idempotent replay status. Practice has no session/issuer call and remains labelled `NO PERSISTENT REWARDS`.
- Production safety: the hosted mode card is disabled unless `MATCH_SERVER_WS_URL` and the ticket secret are configured. The authoritative simulation was not moved into the Site Worker. The currently published Site therefore remains honest while external WebSocket deployment is pending.

- Asset-backed hero milestone: Ember, Tide, Bastion and Gale now ship as original GLB 2.0 files with compact original textures, one eight-joint skin and thirteen clips each. The normal arena and showcase path uses `GLTFLoader`, cache and `SkeletonUtils.clone`; procedural geometry is restricted to explicit load failure.
- Presentation-state milestone: a tested adapter maps alive/result state, velocity, `VerticalState` and combat events into cross-faded idle, movement, anticipation/release, hit, knockback, airborne, landing, death, respawn and victory clips without feeding results back into simulation.
- VFX resource milestone: typed visual packages cover all sixteen starter skills with unique icon marks and effect grammar. Keyed pools reuse projectiles, fields, walls and impact packages, with high/medium/low cosmetic budgets while keeping preview capacity constant.
- Authoritative result milestone: `MatchResultReceipt` v1 is implemented in protocol and game-server signing; the Worker verifies signature/account/expiry/versions and consumes through an idempotent D1 batch. Migration `0001_authoritative_match_receipts.sql` adds replay-resistant receipt, history and progression state.

- Hosted account refactor: the Site now emits a Vite client plus ESM Worker,
  creates level-one accounts idempotently in D1 from the authenticated hosting
  identity and persists only released starter selection through a same-origin API.
- Grand Meridian refactor: the simulation arena was initially 2200×1240 (now 3600×2200) with a dynamic
  renderer center/camera, six ruin lines, ten shrine/house colliders, four
  destructible elemental crates and four elemental landmark corners.
- First-match population is now one player plus four bots. The four starter
  elemental families are guaranteed across the five-fighter roster.
- Starter body pass now ships four original skinned GLB silhouettes: Fire furnace
  crown/horns, Water tide cape/fins, Earth helm/gauntlets/shield and Air
  halo/wing ribbons. The rotatable showcase and match load the same package.
- Original SVG element/skill icon grammar now appears in hero selection,
  roster cards and the radial combat HUD; behavior marks distinguish projectile,
  field/radial, wall, pull and dash meaning in addition to element color.
- Public and authenticated surfaces now use an original elemental online-game
  portal/launcher hierarchy with service ribbon, news board, denser route chrome
  and arena-first combat styling. Development diagnostics are hidden by default.
- All 20 canonical files were revised for the hosted 3D continuation; ADR-007,
  ADR-008, the 2026-09-02 architecture audit and the next-session bootstrap
  record the resulting execution boundary.

- pnpm TypeScript monorepo shape with web, game-server, API and shared packages.
- Schema-validated starter content for Fire, Water, Earth and Air.
- Versioned balance data for 16 starter skills and core physics constants.
- Versioned and schema-validated arena layout, mode rules and score constants.
- Shared fixed-step game core with deterministic seeded simulation.
- Physics adapter boundary with deterministic circle/AABB operations.
- D0 combat lifecycle: movement, aim, preview, release, cooldown, resources,
  damage, displacement, dash, potions and death causes.
- D1 interactions: projectiles, walls, fields, pull/knockback, bounce, status,
  edge hazard and environmental Wind Surge.
- D2/D3 starter hero contracts and four mechanically distinct starter kits.
- D4 standard respawn, final-round three-respawn rule, separate score layers,
  causal KO/assist events and results ranking.
- Local bot path using the same game core as the future authoritative server.
- React/Vite web surface with a public game-universe site, real URL
  routes, authentication boundary, authenticated game launcher, profile,
  roster, progression, history, friends and collection surfaces.
- Desktop keyboard/mouse and mobile touch controls, pinch/scroll zoom and
  diagnostic overlay inside a full-viewport game client.
- Original high-definition battle key art used by the public site, login,
  launcher, stage brief and client boot screen.
- Explicit client boot/loading screen with asset warm-up, 3D renderer status,
  deterministic-core status and separate server-authority status.
- Fullscreen entry from a user gesture with graceful fallback when the browser
  or hosting surface does not grant fullscreen.
- Three.js arena presentation with a top-down 3D scene, lighting, shadows,
  terrain grid, authored arena geometry, 3D chibi meshes, elemental projectiles,
  fields, walls, preview path, impact rings and Wind Surge telegraph/active visuals.
- Game-client presentation pass: match viewport is fullscreen-first, the arena
  is the dominant surface, HUD rails are overlays, and landscape mobile layouts
  hide secondary diagnostics/logs instead of squeezing the world.
- Live hero presentation now mounts a rigged GLB chibi body beneath a renderer-owned
  shadow, selection ring, nameplate and HP bar. Clip selection consumes `GameState`
  and combat events without changing them.
- WebGL is the game-client path. If WebGL cannot initialize, the client reports
  the renderer limitation instead of presenting a false 3D result.
- Mobile input pass: circular move and aim sticks now feed the live command
  stream, their knobs track pointer position, and skill buttons send the
  canonical hold-preview/release-cast command on pointer up or cancellation.
- Skill HUD pass: circular skill/utility controls expose distinct projectile,
  radial, field, wall, pull, arc and dash glyphs instead of four identical
  buttons.
- Combat feedback pass: every cast now produces a short renderer-side burst
  based on its versioned behavior, and the player has a visible 360-degree aim
  reticle so radial, field, wall, pull and dash actions are not visually
  mistaken for a failed projectile.
- Mobile battle HUD pass: short landscape screens give the arena the full
  viewport, keep movement/aim/skill actions as large circular overlays, hide
  secondary rails, and retain a compact topbar with fullscreen and pause.
- Pause control now stops local simulation stepping while keeping the client
  rendered and clearly communicates the paused state; HP values are also
  rendered above each live unit for in-world combat readability.
- Separate API and WebSocket server deployable boundaries.
- Strict runtime-validated client input protocol; client position/hit/damage/
  cooldown/RNG/death/respawn/score/economy fields are not accepted as authority.
- CI workflow definitions, deterministic tests and content validation tests.
- History content contract pass: the Fire chapter now has three explicit
  versioned stages, with lesson/pressure/boss purpose and a three-phase
  Cinder Warden contract including telegraph names and mechanic hooks.
- 3D game-client vertical slice: a level 1 account can select a starter hero,
  see that hero in a rotatable 360-degree showcase on `/game` and
  `/game/heroes`, enter a loading handoff, then play `/match/local/:matchId`
  against four level 1 elemental chibi bots. The four starter elements are
  present in the first match, and all four authored starter kits are available.
- Bot baseline is versioned in balance data: deterministic decision cadence,
  lead aim, distance-based skill choice, edge recovery, retreat threshold and
  readable training pressure.
- Authenticated client shell pass: internal routes now share a game-client
  atmosphere with a persistent 3D hero presence, selected starter status,
  Meridian client navigation and a narrower mobile drawer. `/game` and
  `/game/heroes` keep their full showcase while other client routes use the
  ambient scene behind their account systems.
- Authored arena visual pass: `/match/local/:matchId` now presents Windfall
  Ring as a layered game world rather than a debug grid. The renderer includes
  a tiled stone island, depth/abyss, hazard rim, ruins matching authoritative
  walls, elemental shrines matching arena houses, destructible crates,
  crystals, central runes and animated Wind Surge ribbons.
- Mobile skill input now follows the requested direct gesture: hold a circular
  skill button, drag outside it through 360 degrees, inspect the world-space
  range/impact geometry, then release to cast. Wall, arc, pull-circle, trail
  and dash previews are visually distinct; the redundant mobile aim stick is
  removed on touch landscape.
- 3D visibility contract pass: game-core now exposes explicit vertical motion
  (`GROUND → RISING → AIRBORNE → FALLING → LANDING`), the renderer maps game
  X/Y to Three X/Z and model height to Three Y, and shadows/rings stay readable
  on the ground. Desktop pointer aim now raycasts the actual Three floor plane.
- Preview truth pass: game-core resolves static wall/object cover and bounded
  predictable ricochets; Three.js renders certain/predicted/dynamic segments
  and a visible blocked marker. Destructible crates now take shared-core damage
  and disappear from the authored 3D world when their authoritative HP reaches
  zero.
- Architecture cleanup pass: the obsolete Pixi renderer and dependency were
  removed, ADR-003 was marked historical, ADR-006 records the 3D visibility
  contract, and the 3D showcase/match client is route-lazy-loaded.
- Starter chibis now have element-specific silhouette accessories, feet and
  run/cast motion. Skill feedback is keyed by starter skill identity, including
  falling Flare Burst meteor, Scorch Trail flames, Solar Orb corona, Undertow
  spiral, Wave Wall crests, Bulwark slabs, Quake fissures and Air vortex/updraft
  funnels.

## Deliberate remaining gaps

The game client is now a real playable frontend, but this milestone does not
claim that the whole live-service game is finished. The next canonical
dependencies are:

1. richer D4 multi-round preparation and objective rules;
2. D6/D7 authored variation packages and more environmental events;
3. History runtime: spawnable mobs, boss AI/phase execution and authored boss
   rewards still need to consume the new stage/boss data contract;
4. external TLS WebSocket deployment and matchmaking infrastructure. The signed
   ticket, 20-second reconnect, online client relay, authoritative bot session,
   receipt UI and D1 consumption are implemented and integration-tested; the
   Site keeps Verified Vs Bots disabled until that service is reachable;
5. D8 expanded hero content;
6. D9 account/talent persistence and inspection;
7. D10 rune inventory, caps and telemetry;
8. D11 economy simulation, pity and collection UX after gameplay telemetry.

The current `/match/local/:matchId` route is an honest local/bot client. The
`/match/history/:stageId` route is a stage brief and local study entry; it does
not pretend that the Cinder Warden or placeholder bosses are already complete.
Local Vite development may fall back to the development identity adapter. In
the deployed Site, the hosting identity and D1 account are the source of truth;
browser storage is not production authority.

## Performance observations

No production device benchmark is asserted yet. The local renderer is
instrumented at the domain level and targets a 60 Hz fixed simulation. Mobile
hardware/FPS, memory and heat measurements require a real-device playtest.

## Verification observed

- `pnpm typecheck`: passed across all 15 packages/apps with typecheck scripts.
- Current renderer/input pass: the first workspace typecheck exposed two
  exact-optional assignments in the new chibi feet; those were corrected and
  `pnpm --filter @mma/web typecheck` then passed.
- `pnpm test`: 26 deterministic/content/progression/economy/physics/protocol/Worker tests
  passed after adding hosted-account validation, larger-arena population,
  raycast, preview, vertical-state and destructible-cover coverage. Web unit-test
  scopes are explicitly empty and pass with `--passWithNoTests`.
- `pnpm build`: passed; Vite emitted `dist/client/index.html` and the Worker
  package emitted `dist/server/index.js` with a default ESM `fetch`, alongside
  the D1 migration packaged from `drizzle/`.
- `pnpm --filter @mma/web e2e`: the local definition covers desktop and mobile
  landscape, including direct skill drag and the touch aim-stick contract. The
  latest run was blocked before test execution because this environment has no
  installed Chromium binary.
- GitHub Actions `Web E2E`: passed on commit `4a639ea00c74ed0878316b74bff9b669669ba04b`
  with all 4 desktop/landscape-mobile route and canvas scenarios green.
- A Sites checkpoint was built and deployment-status verified successfully for
  the public/local-bot surface. The authoritative API/WebSocket services remain
  separate by contract.
- The initial internal preview start could not see `pnpm`; adding the canonical
  root Vite dev entry allowed the supervised preview to start. Public home,
  development authentication, launcher and match HUD were inspected there.
- The current client build is route-split: the initial app chunk is about 310 kB
  minified, while the lazy ThreeArena renderer is about 542 kB and is only
  fetched by the showcase/match surfaces. The renderer chunk still needs
  production-scale asset streaming and further optimization.
- The current 3D visual pass is an original low-poly GLB production baseline,
  not a high-resolution final-art pass. Real-device bone/material polish,
  authored terrain textures and GPU particle textures remain next dependencies.
- Three.js is no longer part of the initial app entry chunk. Asset streaming,
  pooled VFX and representative-device benchmarks remain required before
  production scale.
- The browser's own address/status chrome may remain visible when the hosting
  surface denies fullscreen; the client now fills the available viewport and
  keeps its game canvas edge-to-edge, but cannot remove browser chrome without
  platform permission or an installed PWA shell.

## Verification policy

## Continuation verification — Visual Lab and Verified server

- Expanded GLB validation passes for all four files, including GLB chunks, BIN bounds, buffer views, accessors, mesh/material/texture references, skins, eight joints and thirteen animation channels.
- Workspace typecheck passes across all 15 runnable packages/apps.
- The full workspace has 54 passing tests. New coverage includes asset-promise retry/cache, animation death priority, VFX pool bounds, client receipt retry/replay/fraud/outage, signed match tickets, atomic level progression, improved bot decisions and a real local WebSocket handshake/snapshot integration test.
- Production build passes. The initial client chunk is 319.77 kB minified; Visual Lab is 25.08 kB, VerifiedGame 13.49 kB, ThreeArena 55.27 kB and the lazy Three/GLTF loader chunk 608.45 kB.
- Browser DOM inspection confirmed all four GLB packages reach `ready`, all thirteen clip controls and sixteen skill controls are present, and the hosted-availability contract disables Verified Vs Bots when no external server URL is configured.
- Browser visual evidence is limited to the complete Visual Lab/client shell. The cloud renderer reports `GL_VENDOR = Disabled`, `GL_RENDERER = Disabled`, `Sandboxed = yes`; GLB/VFX screenshots, GPU counters and mobile WebGL inspection therefore remain blocked by the environment rather than marked approved.

## Continuation verification — GLB and receipts

- `pnpm assets:validate`: four valid GLBs, 8 joints and 13 clips each; total hero GLB payload 338,172 bytes and textures 6,697 bytes.
- `pnpm typecheck`: passed after the asset, animation, VFX and receipt changes.
- `pnpm test`: 38 tests passed across content/balance/physics/core/protocol/account/receipt/presentation scopes.
- `pnpm build`: client and bundled ESM Worker passed; current chunk evidence is recorded in `docs/performance/visual-performance-2026-09-02.md`.
- Supervised browser QA captured the public home, development login, launcher and desktop match HUD. The cloud browser reported WebGL unavailable.
- The supported `playwright install chromium` path was attempted; its official download returned repeated 502/timeouts. WebGL model screenshots, mobile emulation E2E, draw calls and FPS are therefore recorded as blocked rather than passed.

Repository evidence, deterministic simulation output and test results override
model self-report. A milestone is not considered complete until its route,
tests and known gaps are recorded here.

## September 15 continuation

Portal/client separation, production logout, D1 onboarding and saved builds, real profile XP/history, skill book and numerical talent/rune interfaces are integrated. Account builds are validated and signed into session ticket v2; Verified simulation enforces unlocks and applies the same budget to bots. Practice remains baseline/no rewards. Input cancellation/ownership, final survivor placement and gameplay-pool visibility are corrected. v3 GLBs use curved continuous surfaces and retain the shared loader/rig. Distant framing preserved; knockback carries targets farther.

See `architecture/client-journey-2026-09-15.md` for calibration, tests, source reconciliation and actual limitations. External match hosting, real History boss runtime, expanded champions/gacha economy/social/ranked and WebGL device signoff remain incomplete; do not advertise those as live.
