# Session audit — canonical pack, first session and 3D continuation

Date: 2026-08-30  
Scope: complete `docs/canonical/00–18`, bootstrap, decision log, ADRs, git
history and the current web/API/game-server checkout.

## Result

The product contract is preserved. The first session established the shared
deterministic simulation, versioned content/balance, route families, local bots,
score/respawn rules and deployable server boundaries. The second session added
the 3D client shell, authored Windfall Ring world, procedural chibis, elemental
VFX and direct skill-drag targeting. This audit brought the remaining 3D
boundaries into the implementation instead of leaving them as presentation-only
assumptions.

## Canonical coverage

| Area | Current evidence | Status |
| --- | --- | --- |
| D0 combat grammar | Fixed-step movement, aim, hold/release, resources, dash and preview | Implemented baseline |
| D1 physics/interactions | Circle/AABB physics, wall/object cover, bounded bounce preview, knockback, statuses, hazard and Wind Surge | Implemented baseline; interaction registry remains future expansion |
| D2–D3 heroes | Four distinct level-1 starters, sixteen skills, element/class separation, versioned visual package IDs | Implemented baseline |
| D4 match | Standard respawn, final-round respawns, score layers, causal KO/assist events and results | Implemented baseline; richer round preparation remains |
| D5 modes/social | Local bot path and separate authoritative WebSocket boundary | Scaffold; matchmaking/friends/reconnect remain |
| D6 arena | Authored Windfall Ring geometry, houses, cover, hazard rim and arena personality | One authored template |
| D7 environment | Warning/active/end Wind Surge with visible ribbons and event log | One complete event |
| D8–D11 | Expanded elements, talents, runes and economy contracts are schema/data-backed | Scaffolding; runtime persistence/economy remain |
| 3D presentation | Three.js/WebGL, chibi meshes, 360° showcase, world VFX, vertical model height and floor-locked shadows/rings | Implemented playable baseline |
| 3D targeting | Three floor-plane raycast for desktop; direct press/drag/release skill aiming on touch landscape | Implemented baseline |
| Authority | Browser never owns online hit, damage, cooldown, score, death, RNG or economy | Boundary preserved; production service still separate |

## Corrections made in this audit

- replaced the old Pixi/Canvas fallback architecture with an explicit
  Three.js/WebGL capability contract;
- added authoritative vertical motion state so `GROUND → RISING → AIRBORNE →
  FALLING → LANDING` is visible in 3D;
- fixed desktop aim projection for the oblique camera;
- changed preview from a decorative straight line to static-cover collision,
  bounded ricochet and blocked-marker data;
- made destructible crate HP and 3D visibility use the same shared state;
- removed the obsolete Pixi source/dependency;
- added lazy loading for the 3D showcase/match renderer;
- corrected the development API account to the required level-1 baseline;
- corrected History stage resolution so only the actual boss stage claims the
  Cinder Warden contract;
- recorded ADR-006 and bumped content, balance and game-core versions for the
  snapshot/data-shape changes.

## Deliberate remaining gaps

The audit does not claim production art or live-service completeness. GLTF hero
assets/animation clips, pooled production VFX, real account persistence,
History boss runtime, full matchmaking/reconnect, expanded content and
representative-device benchmarks remain explicit follow-up work. These gaps do
not change the current 3D visibility or authority contract.

## Verification

The repository must pass `pnpm typecheck`, `pnpm test` and `pnpm build`. The
Playwright suite covers public routes, the match handoff, desktop controls and
the mobile direct-skill gesture; execution in this environment is contingent on
an installed Chromium binary.
