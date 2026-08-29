# ADR-001 — Deterministic Physics Adapter for First Slice

## Status

Accepted implementation baseline.

## Context

The canonical game requires a shared fixed-step physics boundary and a
playable mobile bot slice. The repository began empty, so the first milestone
needs testable collision, impulse, bounce and hazard behavior before an online
backend or richer physics dependency can block playtests.

## Decision

Implement a small pure TypeScript adapter in packages/physics with vector,
circle, AABB, overlap and reflection operations. Keep game rules in
packages/game-core and expose the adapter as a replaceable boundary.

## Consequences

- deterministic headless tests can run without a browser or WASM runtime;
- first arena interactions are available immediately;
- complex polygon/rigid-body requirements may require an evidence-backed
  adapter replacement later;
- the product contract, fixed-step ordering and interaction registry remain
  unchanged by that replacement.
