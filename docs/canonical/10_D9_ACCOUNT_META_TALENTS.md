# D9 — Account Progression, Talent Trees & Mastery

> **MAGICMADNESS ARENA — CANONICAL PRODUCT DEFINITION**
>
> Status: **implementation baseline / frozen unless explicitly changed by Igor**.
> This file translates the approved 46-point decision set into an implementable specification.
> Do not reopen product strategy during implementation. Unfixed numeric values may be calibrated,
> but the mechanic, progression philosophy, fairness rule and interaction model remain canonical.

## Account cap

**Level 30.**

Bands:
- 1–10 early;
- 10–20 mid;
- 20–30 endgame.

Progression should feel meaningful and relatively slow rather than ending immediately.

## Account levels unlock

- content;
- systems;
- talent milestones;
- tactical/loadout options;
- deeper PvE;
- ranked readiness;
- progression surfaces.

They do not create uncapped global stat inflation.

## Talents

Macro branches:
- Attack;
- Defense;
- Utility.

Major milestones:
- Level 10;
- Level 20;
- Level 30.

A player strongly invested in Utility must gain a real utility identity while staying inside PvP caps.

## Node types

Prefer:
- mechanic unlock;
- bounded reallocation;
- resource behavior;
- class affinity;
- tactical interaction;
- conditional specialization;
- sidegrade.

Avoid stacking many invisible unconditional multipliers.

## Build inspection

Show:
- Force;
- Resilience;
- Control;
- substats;
- talents;
- runes;
- caps;
- exact source breakdown for derived values.

Every specialized term links to glossary information.

## Progression pacing instrumentation

Measure:
- time to 5/10/20/30;
- sessions per milestone;
- story completion;
- hero diversity;
- churn point;
- resource scarcity.

Use evidence to tune speed without changing the 30-level architecture.

## Matchmaking

Account band is an explicit matching constraint alongside skill/rating and latency.

## After 30

No further permanent global power level.

Continue with:
- Hero Mastery;
- Collection;
- Rank;
- Achievements;
- Cosmetics;
- Titles;
- Seasonal progression;
- later mode-specific progression if desired.

## Personal profile

Primary:
- selected hero;
- account level;
- rank;
- title;
- mastery;
- concise build identity.

Secondary:
- stats;
- collection;
- achievements;
- detailed progression.

## Acceptance tests

- level 30 ends global account power levels;
- Utility build is noticeable but cap-compliant;
- glossary explains every term;
- source breakdown explains every build value;
- post-30 progression rewards identity, not raw global power.
