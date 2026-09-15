# ADR-003 — Historical renderer fallback for hosted game clients

## Status

Superseded by ADR-004 and ADR-006 — 2026-08-30

## Context

The first session considered a PixiJS/Canvas 2D fallback for hosted surfaces
without WebGL. The later 3D visibility decision changed the match renderer
contract: a 2D canvas cannot stand in for the requested 3D presentation.

## Decision

Do not use this fallback for the current client. Three.js/WebGL is the live
renderer and its initialization failure is surfaced in the match/hero UI as an
explicit capability state. The deterministic simulation stays mounted and
inspectable, but the client does not silently downgrade the visual contract.

The fallback is presentation-only. It consumes `GameState`, does not own input,
physics, balance, score or random state, and does not change the authoritative
server boundary.

## Consequences

- The renderer failure remains observable instead of becoming a blank page.
- Automated simulation and protocol tests remain independent of WebGL.
- Any future accessibility or non-WebGL presentation must be proposed as a new
  ADR and must not be mistaken for the 3D match renderer.
