# ADR-003 — Renderer fallback for hosted game clients

## Status

Accepted — 2026-08-29

## Context

The browser game client must remain inspectable and playable on mobile and
hosted surfaces that may not expose a usable WebGL context. PixiJS is the
preferred renderer for the authored arena presentation, but a renderer failure
must not unmount the match route or make the deterministic local simulation
unverifiable.

## Decision

Keep PixiJS as the first renderer and catch initialization/render failures at
the `PixiArena` boundary. When WebGL is unavailable, draw the same arena state,
preview path, projectiles, fields, hazards and hero readouts with the native
Canvas 2D context on the same canvas element.

The fallback is presentation-only. It consumes `GameState`, does not own input,
physics, balance, score or random state, and does not change the authoritative
server boundary.

## Consequences

- Headless/mobile browsers can still verify the real match route and controls.
- PixiJS remains available for surfaces with WebGL and can receive visual
  upgrades without changing the fallback contract.
- Renderer failures are observable through the game-client route instead of
  becoming a blank page.
