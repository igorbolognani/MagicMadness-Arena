# MagicMadness Arena

Mobile-first, landscape, top-down 2D competitive physics arena hero-brawler.

This repository is being built from the canonical MagicMadness Arena pack in
docs/canonical/. Product decisions are closed; technical deviations require an
ADR and must preserve the game contract.

## Current playable surface

The first vertical slice lives in apps/web and uses the shared
packages/game-core simulation locally against deterministic bots. It includes:

- public game-universe site with `/`, `/how-it-works`, `/heroes`, `/elements`,
  `/modes`, `/world`, `/news` and `/login` routes;
- authenticated game client shell at `/game/*` with launcher, profile, play,
  history, heroes, talents, runes, friends and collection routes;
- fullscreen-capable local match client at `/match/local/:matchId` with a
  boot screen, rendered arena HUD and result screen;
- Fire, Water, Earth and Air starter heroes;
- fixed-step movement, aim, hold-to-preview and release-to-cast;
- damage, knockback, wall/object collision and edge hazard;
- health/mana potions and Tactical Dash;
- one standard-round respawn and final-round three-respawn rules;
- separate Match Score and Performance Score;
- causal kill/assist event records;
- Wind environmental event;
- PixiJS arena renderer, mobile landscape HUD, desktop controls and diagnostics.

The server/API packages are separate deployable boundaries. The local bot path
uses the same game core that the authoritative server will use.

The current Site build is intentionally honest about its boundary: local bot
play is playable in the browser, while competitive authority remains on the
separate WebSocket server. See `docs/implementation-status.md` for the exact
verified status and remaining production dependencies.

## Commands

    pnpm install
    pnpm dev
    pnpm test
    pnpm typecheck
    pnpm build

## Product truth

The repository is intentionally data-driven and versioned. See
docs/implementation-status.md for evidence-backed status and known gaps.
