# Match-result receipt v1

The versioned contract lives in `@mma/protocol`. The signed payload includes receipt, match and account IDs; authority; mode; placement; Match and Performance Scores; authorized XP/currencies; balance and game-core versions; issue/expiry timestamps; nonce and signature.

```text
authoritative game-server
  -> signs canonical receipt with runtime secret
  -> authenticated client relays unchanged receipt
  -> Site Worker verifies signature/account/expiry/versions
  -> one D1 batch consumes receipt + history + progression + account update
  -> retry returns stored result without another grant
```

`POST /api/matches/results` accepts `{ receipt }`. It never accepts raw client-authored score or reward fields. Local practice has no issuer path and grants no progression.

The response includes the stored account experience/level, previous experience, authorized XP delta, currencies and `replayed`. The account update reads the result stored by the receipt insert inside the same D1 batch, preventing two distinct concurrent receipts from overwriting progression with a stale pre-transaction total. A client retry uses the identical receipt and shows `already consumed · idempotent` rather than granting again.

Production requires the same `MATCH_RECEIPT_SECRET` in the authoritative game-server and Site Worker runtimes. The Site runtime secret is configured through hosting environment management and is not committed.
