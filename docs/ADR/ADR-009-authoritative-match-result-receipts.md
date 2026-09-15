# ADR-009 — Signed idempotent match-result receipts

## Status

Accepted — 2026-09-02

## Decision

The authoritative `apps/game-server` is the only component allowed to issue progression-bearing `MatchResultReceipt` v1 envelopes. It signs the canonical receipt payload with HMAC-SHA-256 and a runtime-only `MATCH_RECEIPT_SECRET`. The Site Worker verifies the signature, authenticated account ID, expiry, balance version and game-core version before writing D1.

Receipt consumption is atomic and idempotent. One D1 batch inserts the consumed receipt, match history and progression event, then updates the account. Primary, nonce, `(account_id, match_id)` and source constraints reject replay. A byte-identical retry returns the stored post-consumption result without applying XP again.

Local Vs Bots is practice. The browser cannot mint a valid signature and practice receipts cannot authorize non-zero rewards.

## Consequences

- The Site Worker remains a verifier and persistence boundary, never a match simulator.
- The signing secret is configured in runtime environments and is absent from Git, client bundles and browser storage.
- Receipt/balance/game-core incompatibility fails closed.
- `drizzle/0001_authoritative_match_receipts.sql` is immutable after application.
