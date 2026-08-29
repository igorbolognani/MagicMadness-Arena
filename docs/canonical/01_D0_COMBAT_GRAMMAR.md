# D0 — Combat Grammar

> **MAGICMADNESS ARENA — CANONICAL PRODUCT DEFINITION**
>
> Status: **implementation baseline / frozen unless explicitly changed by Igor**.
> This file translates the approved 46-point decision set into an implementable specification.
> Do not reopen product strategy during implementation. Unfixed numeric values may be calibrated,
> but the mechanic, progression philosophy, fairness rule and interaction model remain canonical.

## Goal

Define the universal combat language every hero, boss, arena and mode must obey.

## Core verbs

```text
MOVE → AIM → PREVIEW → CAST → COLLIDE
 → DAMAGE / CONTROL → DISPLACE → RECOVER → SURVIVE / KO
```

## Required player states

- idle;
- moving;
- casting;
- recovery;
- displaced;
- slowed/rooted/stunned where applicable;
- airborne;
- tactical movement;
- hazard recovery;
- dead;
- respawning.

Normal movement changes velocity/position through the simulation. Teleport/swap are explicit exceptions.

## Aim and cast lifecycle

```text
READY
 → PREVIEW
 → COMMIT
 → CAST_START
 → ACTIVE
 → IMPACT/EXPIRE
 → RECOVERY
 → COOLDOWN
 → READY
```

Canceling preview consumes no resource.

Desktop:
- cursor-to-world aim;
- LMB hold/release;
- RMB Tactical.

Mobile:
- press/hold skill;
- drag target;
- release to cast;
- explicit cancel gesture/region;
- pinch zoom must never accidentally cast.

## HP, damage and KO

Canonical:
- HP <= 0 = death;
- arena hazard/edge can also kill/KO;
- both are first-class death causes;
- direct damage does not itself produce match score.

Skills may deal enough late-match damage to kill a vulnerable low-HP target inside the arena, but displacement remains a central combat axis.

## Knockback

Knockback is a vector produced by:
- direct impulse;
- radial impulse;
- body interaction;
- environmental force;
- status/amplifier;
- chained interaction.

Two properly timed skills may compound displacement.

Modifiers:
- Resilience/stability;
- mass/state;
- friction;
- wall collision;
- status;
- elemental interaction.

## Dodge timing

Dodge timing must remain learnable across account progression.

Therefore:
- projectile/cast speeds use bounded bands;
- collider and VFX correspond;
- high-level persistent bonuses cannot create unreadable timing;
- invisible/instant mechanics require explicit tells/counterplay.

## Tactical

Starter: **Dash**.

```text
READY → INPUT → DIRECTION → DASH → RECOVERY → COOLDOWN
```

Dash supports:
- evasion;
- repositioning;
- edge recovery;
- offensive body interaction only where the tactical definition explicitly permits it.

Other Tactical actions unlock through account progression.

## Potions

Desktop:
- Q health;
- E mana.

Mobile:
- dedicated buttons.

Both must define:
- charges/cooldown;
- amount;
- anti-animation-cancel rules;
- clear ready/empty state.

## Camera input

Desktop wheel and mobile pinch only change camera zoom. They never modify actual skill range or world coordinates.

## Mobile HUD

```text
┌────────────────────────────────────────────────────┐
│ Round/Score                         Event/Timer     │
│                                                    │
│                  WORLD / ARENA                     │
│                                                    │
│ [MOVE]                          [1][2][3][4]        │
│                                   [TACT][HP][MP]   │
└────────────────────────────────────────────────────┘
```

Hit targets are larger than icons, safe-area aware and non-overlapping.

## Baseline tuning fields

Implement as balance/config data:
- move speed;
- acceleration/deceleration;
- player mass;
- base HP/mana;
- dash distance/duration/cooldown;
- global knockback scale;
- wall bounce/stun thresholds;
- potion values;
- hazard recovery rules.

Exact numbers are tunable, not hardcoded.

## Telemetry

Record:
- input timestamp;
- cast start/release;
- hit;
- status;
- impulse;
- hazard entry;
- death;
- respawn;
- camera zoom;
- online reconciliation.

## Acceptance tests

- behavior independent from render FPS;
- mobile aim maps to correct world angle;
- zoom does not change range;
- HP death and hazard KO have distinct causes;
- dash can save an edge situation;
- two impulses compound deterministically;
- preview cancel spends nothing;
- no live-combat action requires a deep menu.
