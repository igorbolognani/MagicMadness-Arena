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
- React/Vite/PixiJS web surface with public homepage, app shell, profile hero,
  play route and mobile-landscape live arena.
- Desktop keyboard/mouse and mobile touch controls, pinch/scroll zoom and
  diagnostic overlay.
- Separate API and WebSocket server deployable boundaries.
- CI workflow definitions, deterministic tests and content validation tests.

## Deliberate remaining gaps

The first commit is a dependency-complete playable foundation, not a claim that
the whole live-service game is finished. The next canonical dependencies are:

1. richer D4 multi-round preparation and objective rules;
2. D6/D7 authored variation packages and more environmental events;
3. History stages, mobs and authored bosses;
4. friend lobbies, reconnect and production server persistence;
5. D8 expanded hero content;
6. D9 account/talent persistence and inspection;
7. D10 rune inventory, caps and telemetry;
8. D11 economy simulation, pity and collection UX after gameplay telemetry.

## Performance observations

No production device benchmark is asserted yet. The local renderer is
instrumented at the domain level and targets a 60 Hz fixed simulation. Mobile
hardware/FPS, memory and heat measurements require a real-device playtest.

## Verification observed

- `pnpm typecheck`: passed across all 14 packages/apps with typecheck scripts.
- `pnpm test`: 15 deterministic/content/progression/economy/physics tests
  passed; protocol and web unit-test scopes are explicitly empty and pass with
  `--passWithNoTests`.
- `pnpm build`: passed for every package and app; Vite emitted the Sites-ready
  root `dist/` static entrypoint.
- `pnpm --filter @mma/web e2e`: test definition is present for desktop and
  mobile landscape, but execution is blocked in this environment because the
  Playwright Chromium binary is not installed and the CDN download timed out.
- A Sites checkpoint was built and deployment-status verified successfully for
  the public/local-bot surface. The authoritative API/WebSocket services remain
  separate by contract.

## Verification policy

Repository evidence, deterministic simulation output and test results override
model self-report. A milestone is not considered complete until its route,
tests and known gaps are recorded here.
