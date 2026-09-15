# MagicMadness Arena — Codex Bootstrap Prompt (3D Client Continuation)

Use this prompt at the start of the next implementation session.

---

You are continuing the existing **MagicMadness Arena** repository and deployed ChatGPT Site. Do not restart, rescope or replace the project. Inspect the exact Git state and read all 20 files under `docs/canonical/` completely before changing code. Then read every ADR, `docs/implementation-status.md`, `docs/decision-log.md` and the latest architecture audit. Repository and tests override summaries.

## Product direction

Build an original, production-oriented top-down 3D elemental arena client. Use Warlock-like references only for arena visibility, camera readability, held-cast telegraphs and HUD hierarchy. Use Gunbound, Grand Chase and late-2000s OnGame portals only for information density, launcher feeling and elemental service presentation. Never copy names, layouts, models, icons, imagery, sounds or proprietary assets.

The visual target is a spacious authored fantasy battleground with real Three.js/WebGL chibi bodies, readable silhouettes, element-specific skills/VFX and an arena-first interface. Preserve MagicMadness mechanics, fiction and visual identity.

## Non-negotiable architecture

1. `@mma/game-core` is the deterministic 2D simulation and source of match truth.
2. Three.js projects simulation state into 3D; it never invents collision, timing, hit, RNG, score or death.
3. Vertical visuals are driven by explicit `VerticalState`.
4. Pointer aiming raycasts to the arena floor and becomes a 2D command.
5. Preview geometry and collision share authored bounds.
6. Local Vs Bots may run the shared core in-browser.
7. Competitive multiplayer remains authoritative in `apps/game-server` over versioned protocol messages.
8. The Site Worker owns only same-origin web/account concerns. It is not the authoritative match server.
9. D1 is the production source of truth for account meta. Do not restore localStorage as account authority.
10. Use authenticated hosting headers server-side and authorize every account write against the stable user ID.

## Current deployed baseline

- pnpm monorepo with React/Vite, Three.js, shared content/balance/physics/protocol packages, Fastify API and WebSocket game server boundaries.
- Worker-backed Site build: SPA in `dist/client`, Worker entry in `dist/server/index.js`, D1 migration in `drizzle/`.
- Level-one hosted account with persisted starter selection.
- Grand Meridian arena: 2200×1240, dynamic camera projection, ten shrine/house structures, destructible crates, central ruins/runes and elemental corners.
- First match: player plus four bots, ensuring representation of the four starter elemental families.
- Four released chibi visual packages: Fire/Ember, Water/Tide, Earth/Bastion and Air/Gale.
- Sixteen authored starter skills with floor preview, projectiles/fields/walls and element-specific impact VFX.
- Public elemental portal, authenticated launcher and fullscreen combat client.

Verify every claim above in code before relying on it.

## Immediate work order

1. Run a clean Git/worktree audit; preserve user changes.
2. Run baseline typecheck, unit tests and production build.
3. Inspect the hosted account Worker and migration for authorization, idempotent first-account creation, SPA fallback and migration safety.
4. Inspect Grand Meridian at all camera zooms. Remove any remaining hard-coded 1600×900 projection constants.
5. Refine each starter into a complete original body package with unmistakable proportions, headgear, focus/weapon and back silhouette.
6. Implement/verify idle, move, cast, hit, knockback, airborne, landing, death and victory presentation states without creating a second simulation.
7. Give all sixteen starter skills distinct icons, cast anticipation, path/area telegraph, projectile/field/wall model and impact effect. Reuse pooled geometry/materials where practical.
8. Make the arena feel inhabited: improve shrines, houses, ruins, bridges/lanes, elemental landmarks, lighting, fog and edge hazards while keeping collision readable.
9. Refine the mobile landscape HUD: left movement, right circular skill cluster, hold/drag 360°, safe areas, cooldown/resource clarity and minimal center obstruction.
10. Refine each portal/launcher route into a distinct designed page without fabricating complete systems. Clearly label unconnected History, friends, collection, ranked and economy dependencies.
11. Add tests for arena dimensions/spawns, account hero validation, preview/collision parity and any new pure presentation adapters.
12. Update ADRs, implementation status and the audit with exact evidence.
13. Run typecheck, tests and build. Run E2E only if a compatible browser runtime is available; report the exact blocker otherwise.
14. Commit and push the exact verified state, package the Site, create a new version, deploy with the existing access policy and poll to a terminal state.

## Quality rules

- Keep the arena visible; avoid dashboard panels over the playfield.
- Gameplay meaning cannot depend on color alone.
- Zoom never changes gameplay.
- Cosmetic VFX may degrade; telegraphs may not disappear.
- Destroyed cover and spawned skill walls update render, collision and preview together.
- Models must be recognizable at far zoom and in the 360° account showcase.
- Do not claim online matchmaking, persistent results, bosses, talents, runes, friends or gacha are complete unless code and tests prove it.
- Do not spend the session only planning. Implement the highest-value safe vertical slice, validate it and leave the repository deployable.

## Required handoff

Return: exact changes, architecture boundaries preserved, tests/build results, deployment URL/version, known blockers, and the next dependency-ordered implementation slice. When blocked by runtime limits, document the precise limit and implement the closest architecture-compatible path without changing the canonical requirement.

Begin now.

## Continuation checkpoint — after GLB/receipt implementation

The next session must preserve the new asset and authority boundaries: `visualPackageId` resolves through `heroAssetManifest.ts`; normal arena/showcase loading uses GLB + skeleton clone; animation selection is driven by game-core state/events; and D1 progression accepts only verified `MatchResultReceipt` v1 envelopes. Re-run `pnpm assets:validate`, receipt tests and browser QA before changing either contract.

Immediate next visual dependency: perform a real WebGL-capable device/browser capture of all four models and animation states, then tune bones/materials/camera from those images. Immediate online dependency: deploy/authenticate the separate game-server and relay its signed result to `POST /api/matches/results`; do not give local practice an issuer.

## Continuation checkpoint — Visual Lab and Verified Vs Bots

Preserve `/game/visual-lab`, the shared GLB loader corrections, bounded VFX diagnostics, ADR-010 and the server-owned Verified Vs Bots implementation. Verified is integration-complete but must stay disabled in production until a separately hosted secure WebSocket is configured through `MATCH_SERVER_WS_URL`; do not move simulation into the Site Worker or claim persistent play without that deployment. The next visual task is observation on a real WebGL-capable desktop/mobile landscape device using the lab checklist and recording screenshots, draw calls and stress FPS only after direct inspection.
