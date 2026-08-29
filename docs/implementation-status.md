# MagicMadness Arena — Implementation Status

Updated: 2026-08-29

## Evidence-backed baseline

The repository was initialized from the complete canonical pack in
docs/canonical/ (00 through 18). Product decisions are treated as frozen.
Technical choices below are implementation baselines and remain replaceable
only through ADRs that preserve the product contract.

## Completed in this initial milestone

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
- React/Vite/PixiJS web surface with a public game-universe site, real URL
  routes, authentication boundary, authenticated game launcher, profile,
  roster, progression, history, friends and collection surfaces.
- Desktop keyboard/mouse and mobile touch controls, pinch/scroll zoom and
  diagnostic overlay inside a full-viewport game client.
- Original high-definition battle key art used by the public site, login,
  launcher, stage brief and client boot screen.
- Explicit client boot/loading screen with asset warm-up, Pixi renderer status,
  deterministic-core status and separate server-authority status.
- Fullscreen entry from a user gesture with graceful fallback when the browser
  or hosting surface does not grant fullscreen.
- Pixi arena presentation upgraded with layered background, arena compass,
  object silhouettes, shadows, projectile trails, hero glyphs, status rings and
  Wind Surge telegraph/active visuals.
- Game-client presentation pass: match viewport is fullscreen-first, the arena
  is the dominant surface, HUD rails are overlays, and landscape mobile layouts
  hide secondary diagnostics/logs instead of squeezing the world.
- Live hero presentation now includes a stylized 2D unit silhouette, shadow,
  cloak/body layers, head, weapon line, elemental core and animated aura in
  both Pixi and native Canvas render paths.
- Native Canvas 2D fallback at the renderer boundary keeps the same arena
  state and controls playable when a browser cannot initialize WebGL.
- Separate API and WebSocket server deployable boundaries.
- Strict runtime-validated client input protocol; client position/hit/damage/
  cooldown/RNG/death/respawn/score/economy fields are not accepted as authority.
- CI workflow definitions, deterministic tests and content validation tests.

## Deliberate remaining gaps

The game client is now a real playable frontend, but this milestone does not
claim that the whole live-service game is finished. The next canonical
dependencies are:

1. richer D4 multi-round preparation and objective rules;
2. D6/D7 authored variation packages and more environmental events;
3. History stages, mobs and authored bosses;
4. friend lobbies, reconnect, production server persistence and a real
   Sign in with ChatGPT handshake on the target hosting surface;
5. D8 expanded hero content;
6. D9 account/talent persistence and inspection;
7. D10 rune inventory, caps and telemetry;
8. D11 economy simulation, pity and collection UX after gameplay telemetry.

The current `/match/local/:matchId` route is an honest local/bot client. The
`/match/history/:stageId` route is a stage brief and local study entry; it does
not pretend that the Cinder Warden or placeholder bosses are already complete.
The authenticated session currently persists a development identity in local
storage when no hosting-provided auth bridge is available.

## Performance observations

No production device benchmark is asserted yet. The local renderer is
instrumented at the domain level and targets a 60 Hz fixed simulation. Mobile
hardware/FPS, memory and heat measurements require a real-device playtest.

## Verification observed

- `pnpm typecheck`: passed across all 14 packages/apps with typecheck scripts.
- `pnpm test`: 18 deterministic/content/progression/economy/physics/protocol tests
  passed; protocol and web unit-test scopes are explicitly empty and pass with
  `--passWithNoTests`.
- `pnpm build`: passed for every package and app; Vite emitted the Sites-ready
  root `dist/` static entrypoint, including the generated battle art asset.
- `pnpm --filter @mma/web e2e`: the local definition covers desktop and mobile
  landscape; this scratch environment has no installed Chromium binary.
- GitHub Actions `Web E2E`: passed on commit `4a639ea00c74ed0878316b74bff9b669669ba04b`
  with all 4 desktop/landscape-mobile route and canvas scenarios green.
- A Sites checkpoint was built and deployment-status verified successfully for
  the public/local-bot surface. The authoritative API/WebSocket services remain
  separate by contract.
- The current client build emits an 832 kB minified JavaScript chunk because
  PixiJS and the complete content/game-core slice are shipped together. This is
  an observed optimization gap; the next safe technical step is route/client
  code-splitting without changing simulation behavior.
- The current visual pass is an authored vector-renderer baseline, not a final
  sprite-atlas production. The next art dependency is replacing procedural unit
  shapes with original animated hero sheets, terrain tiles and elemental VFX
  while preserving the same GameState contract.

## Verification policy

Repository evidence, deterministic simulation output and test results override
model self-report. A milestone is not considered complete until its route,
tests and known gaps are recorded here.
