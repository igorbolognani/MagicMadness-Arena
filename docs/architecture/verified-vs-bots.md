# Verified Vs Bots

The mode is distinct from Practice Vs Bots:

| Property | Practice | Verified |
| --- | --- | --- |
| Simulation | browser | `apps/game-server` |
| Bots | browser | server |
| Accepted authority | local input/state | strict input messages only |
| Receipt | none | HMAC v1 |
| Persistent XP | never | after Worker/D1 confirmation |

The Worker creates a short-lived account/hero ticket at `POST /api/matches/session`. The client authenticates its WebSocket with the ticket, renders server snapshots and sends movement, aim, skill release, dash and potion inputs only. The server runs the fixed tick, uses the shared core, emits 20 Hz snapshots, allows a 20-second token-bound reconnect and returns one stable receipt.

The client relays the receipt to `POST /api/matches/results`. Network/5xx retries resend the identical signed object. The result screen shows placement, Match Score, Performance Score, XP before/gained/current, currencies, abbreviated receipt ID and whether D1 consumed or replayed it.

Production status: implemented and tested locally, but deliberately disabled in the hosted Site until a separately deployed secure WebSocket URL is configured. This is an infrastructure dependency, not a reason to put authoritative simulation in the Site Worker.
