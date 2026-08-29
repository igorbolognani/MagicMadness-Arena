# D5 — Teams, PvP Modes, Bots & Friend Play

> **MAGICMADNESS ARENA — CANONICAL PRODUCT DEFINITION**
>
> Status: **implementation baseline / frozen unless explicitly changed by Igor**.
> This file translates the approved 46-point decision set into an implementable specification.
> Do not reopen product strategy during implementation. Unfixed numeric values may be calibrated,
> but the mechanic, progression philosophy, fairness rule and interaction model remain canonical.

## Mode sizes

| Mode | Teams | Players |
|---|---|---:|
| Solo | FFA | ~15 |
| Duo | 7×2 | 14 |
| Trio | 5×3 | 15 |
| Squad | 3×5 | 15 |

## Identity

```text
SOLO  = CHAOS / OPPORTUNISM
DUO   = COORDINATION
TRIO  = TACTICS
SQUAD = TEAM WAR
```

## Normal

For:
- learning;
- familiarization;
- casual play;
- build/map practice.

It uses the same tested core grammar as Ranked.

## Ranked

Adds:
- rating;
- competitive progression;
- stricter integrity;
- reconnect/abandon rules.

It does not remove the game’s environmental personality.

## Tournament

Serious competition may lock:
- maps;
- modifiers;
- house-function pools;
- special event rules;
- tournament format.

## Bots

Bots are both player content and development infrastructure.

They must:
- move;
- aim;
- use skills;
- dodge telegraphs;
- use Tactical;
- recover from edge;
- exploit low-HP/opportunistic situations at higher difficulty;
- interact with map.

Difficulty changes decision/reaction quality, not hidden impossible stat boosts.

## Friends via link

```text
CREATE LOBBY
 ↓
COPY INVITE LINK
 ↓
FRIEND OPENS
 ↓
AUTH / ALLOWED GUEST FLOW
 ↓
JOIN
 ↓
READY
 ↓
START / QUEUE
```

## Matchmaking

Account bands:
- 1–10;
- 10–20;
- 20–30.

Also consider:
- skill/rating;
- party size;
- latency/region;
- queue time.

New players must not routinely face mature endgame build budgets.

## Team composition

No mandatory tank/damage/utility queue lock in the baseline. Composition should matter naturally through hero kits.

## Disconnect

Support:
- reconnect grace;
- optional temporary bot takeover;
- abandon timeout;
- correct rank/result handling;
- no duplicate character on reconnect.

## Acceptance tests

- all four sizes instantiate correctly;
- same hero rules across Normal/Ranked;
- bot completes a match;
- invite link joins correct lobby;
- party survives queue/result;
- account-band mismatch protection works.
