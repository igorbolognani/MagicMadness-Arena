# 3D Client and Hosting Refactor Audit — 2026-09-02

## Scope

Reviewed Git history, the complete 20-file canonical pack, all ADRs, current implementation boundaries, Sites hosting shape and persistent-account requirements.

## Findings

| Area | Before | Refactor decision |
|---|---|---|
| Match truth | Deterministic 2D core projected by Three.js | Preserve; no second physics engine |
| Arena | 1600×900 with fixed projection center | 2200×1240; camera and world center derive from arena state |
| Population | Player plus three bots | Player plus four bots; four starter families represented |
| World | Central ruins, two houses, two crates | Grand Meridian with ten shrines/houses, four crates, six ruin lines and four elemental corners |
| Heroes | Shared chibi base with small accessories | Distinct Fire, Water, Earth and Air silhouettes/body accessories |
| Skills | Text/glyph HUD with element VFX | Original SVG icon grammar plus element/behavior marks; retain world VFX |
| Portal | Modern prototype marketing shell | Original elemental online-game portal and launcher hierarchy |
| Account | Browser/development persistence | Worker/D1 account source of truth keyed by authenticated user |
| Multiplayer | Separate WS server boundary | Preserve; Site Worker is account/web only |

## Verification obligations

Typecheck, all package tests and production build must pass. The build must contain `dist/client/index.html` and an ESM `dist/server/index.js` default `fetch`. Deployment packaging must include the immutable D1 migration. Browser E2E is evidence only when a compatible runtime exists.

## Known next dependencies

Authored animation clips/state blending, pooled production VFX, model/texture asset pipeline, authoritative match-result receipts, browser visual QA, and online lobby/matchmaking remain separate milestones.

## Continuation evidence — GLB and receipts

The prior dependency list is now partly closed: four generated GLBs, textures, rig/clip controller, shared showcase/arena loader, keyed VFX pools and signed idempotent D1 receipt consumption are implemented and covered by pure tests. No live path instantiates the procedural body unless GLB loading rejects.

Browser QA reached the public home, development login, launcher and desktop match HUD through the supervised preview. The cloud browser could not create WebGL, and the supported Chromium installer received repeated 502/timeouts; therefore actual rendered GLB screenshots, draw calls and FPS remain blocked evidence, not claimed success. Production typecheck/tests/build remain the release gate.
