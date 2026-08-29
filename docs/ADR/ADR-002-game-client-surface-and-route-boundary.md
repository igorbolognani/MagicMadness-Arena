# ADR-002 — Game client surface and route boundary

## Status

Accepted — 2026-08-29

## Context

MagicMadness Arena needs to be inspectable as a real game client. A public
marketing surface, an authenticated account/game shell and a match renderer
have different interaction contracts. The Site deployment is static, while the
future competitive match service must remain a separate authoritative server.

## Decision

Use three explicit route families in the web client:

- public discovery: `/`, `/how-it-works`, `/heroes`, `/elements`, `/modes`,
  `/world`, `/news`, `/login`;
- authenticated game shell: `/game`, `/game/play`, `/game/profile`,
  `/game/history`, `/game/heroes`, `/game/talents`, `/game/runes`,
  `/game/friends`, `/game/collection`;
- match client: `/match/local/:matchId` for shared-core bot play and
  `/match/history/:stageId` for authored stage briefs.

The match entry starts with a client boot screen, requests fullscreen only from
the user gesture that starts the match, and renders the existing DOM HUD plus
Pixi arena. A missing fullscreen capability is a supported fallback. The local
route never presents itself as authoritative online multiplayer.

## Consequences

- Deep links and browser back/forward preserve the product separation.
- The game UI can be tested independently from public discovery pages.
- Static Sites hosting can serve the frontend while API/WebSocket authority
  remains deployable separately.
- The current lightweight history adapter must be replaced only if a routing
  library becomes necessary; route semantics remain the contract.
