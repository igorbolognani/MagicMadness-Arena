# ADR-010 — Verified Vs Bots session boundary

Status: Accepted — 2026-09-02

## Context

Practice Vs Bots runs `game-core` in the browser and cannot be progression authority. The first reward-bearing match needs a deployable server path without moving competitive simulation into the Site Worker.

## Decision

`apps/game-server` owns one fixed-step `VerifiedBotMatchSession` per signed session ticket. The authenticated Site Worker issues a two-minute HMAC ticket bound to account and selected starter; the browser sends that ticket as the first WebSocket message. After authentication the server accepts only the strict versioned input schema. It owns four bots, RNG, hit, damage, cooldown, death, respawn, score and result.

Snapshots are emitted at 20 Hz while the simulation remains at 60 Hz. Disconnect neutralizes movement, retains a session for 20 seconds and requires the opaque resume token. A completed session emits one stable HMAC `MatchResultReceipt`; retrying persistence relays the same receipt to the Worker and D1 returns the stored result idempotently.

The Site Worker exposes availability separately. If no external `MATCH_SERVER_WS_URL` is configured, the production UI disables Verified Vs Bots and names the missing deployment dependency. The Worker must not host the simulation as a workaround.

## Consequences

- Practice remains always local and reward-free.
- Verified works end to end in the real WebSocket integration test.
- Production availability additionally requires an externally reachable TLS WebSocket deployment sharing the ticket and receipt secrets through runtime configuration.
- Neither secret enters Git, Vite output or browser storage.
