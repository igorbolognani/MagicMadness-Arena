# D4 — Match Grammar: Rounds, Levels, Death, Respawn & Score

> **MAGICMADNESS ARENA — CANONICAL PRODUCT DEFINITION**
>
> Status: **implementation baseline / frozen unless explicitly changed by Igor**.
> This file translates the approved 46-point decision set into an implementable specification.
> Do not reopen product strategy during implementation. Unfixed numeric values may be calibrated,
> but the mechanic, progression philosophy, fairness rule and interaction model remain canonical.

## Match skeleton

```text
MATCH START
 ↓
MAP/PERSONALITY REVEAL
 ↓
ROUND
 ↓
PREPARATION / MATCH LEVEL
 ↓
ROUND
 ↓
...
 ↓
FINAL ROUND
 ↓
RESULTS
```

## Hero progression

In-match hero level:
**1–15**

Major milestones:
- 5;
- 10;
- 15.

The standard match maps progression legibly across that arc.

## Round timing

Every round has:
- countdown;
- finite active time;
- end condition;
- resolution;
- preparation window.

Exact duration is balance data.

## Standard respawn

Each player has:
**1 respawn entitlement per standard round.**

```text
ALIVE
 ↓ death
RESPAWN LEFT?
 ├─ yes → respawn → ALIVE
 └─ no  → eliminated until next round
```

## Final round

After final preparation:
- **3 respawn entitlements** per player;
- after they are consumed, next death is permanent;
- last surviving player/team receives first place.

## Death causes

- HP=0;
- edge/hazard KO;
- boss/explicit mechanic;
- scripted mode result when authored.

Death cause and credited killer are separate fields.

## Score layers

### Match Score
Decides placement/winner.

### Team Score
Shared team result.

### Individual Performance
XP/mastery/statistics/rewards.

Do not award match points for raw damage.

Track:
- KOs;
- assists;
- survival;
- placement;
- round victories;
- final victory;
- objective contribution;
- useful support contribution where measurable.

## Attribution

Use causal event history:
- lethal direct hit;
- recent impulse causing hazard KO;
- status/environment interaction;
- assists from causal contributors.

Attribution must be deterministic and replayable.

## Solo kill stealing

Allowed as emergent FFA play.

However:
- healthy players are not normally instant-killed by ordinary skills;
- hazard causality remains creditable;
- UI makes the kill source understandable.

## Announcer

Support:
- Double Kill;
- Triple Kill;
- Multi Kill;
- streak;
- distinctive MagicMadness “Madness” high-streak call.

## Preparation window

May contain:
- match level-up;
- one eligible branch choice;
- short build/status review.

No deep menu labyrinth between rounds, especially on mobile.

## Acceptance tests

- one-respawn standard rule works;
- three-respawn final rule works;
- final survivor wins despite damage totals;
- Match and Performance scores can diverge;
- hazard KO attribution works;
- streaks derive from authoritative event log;
- 5/10/15 progression visible.
