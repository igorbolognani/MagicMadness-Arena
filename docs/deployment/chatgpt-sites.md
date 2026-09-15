# ChatGPT Sites Deployment Boundary

MagicMadness is a Worker-backed Site rather than a static-only deployment.

## Build artifact

- `dist/client/`: Vite SPA, Three.js chunks and public assets.
- `dist/server/index.js`: ESM Worker default export with `fetch`.
- `drizzle/`: immutable D1 schema migrations.
- `.openai/hosting.json`: existing project ID and logical `DB` binding.

The Worker serves the client with SPA deep-link fallback and exposes
`GET /api/account`, `PATCH /api/account/hero` and `GET /api/health`.

## Authority boundary

- The hosting surface supplies the authenticated user headers.
- D1 owns level-one account meta and selected released starter.
- The Vite/Three client may run local Vs Bots on shared `game-core`.
- `apps/game-server` remains the authoritative WebSocket match service.
- Position, hit, damage, RNG, score and rewards are never accepted from the
  browser account API.

Future persistent match rewards require server-signed idempotent receipts.
The Site Worker must not be expanded into a substitute simulation authority.

## Result persistence extension

- `POST /api/matches/results` verifies and consumes `MatchResultReceipt` v1.
- `drizzle/0001_authoritative_match_receipts.sql` is the append-only migration for receipts, match history and progression events.
- `MATCH_RECEIPT_SECRET` is a hosted runtime secret and must match the independently deployed authoritative game-server secret.
