# ADR-007 — Hosted account persistence through Site Worker and D1

## Status

Accepted — 2026-09-02

## Decision

The deployed Site becomes Worker-backed. The Worker serves the Vite client and owns same-origin account endpoints. D1 stores the initial account row keyed by `oai-authenticated-user-id`; account creation is idempotent and starter selection is server-authorized.

The Worker is not a match server. Local Vs Bots remains in-browser on the shared deterministic core. Competitive movement, hit, score and rewards remain in the separate authoritative WebSocket service.

## Consequences

- Production account state no longer depends on localStorage.
- The first migration is immutable and schema-only.
- Future match rewards require server-signed idempotent receipts, not browser result claims.
- Static-only hosting is no longer sufficient; builds must emit client and Worker artifacts.

## Implemented extension — 2026-09-02

ADR-009 implements the anticipated receipt boundary. The Worker now exposes `POST /api/matches/results`, verifies signed v1 receipts and consumes them through an atomic D1 batch. `0001_authoritative_match_receipts.sql` adds replay-resistant receipt, history and progression tables. The Worker still does not simulate matches or accept browser-authored rewards.
