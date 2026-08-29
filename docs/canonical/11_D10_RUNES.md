# D10 — Rune System

> **MAGICMADNESS ARENA — CANONICAL PRODUCT DEFINITION**
>
> Status: **implementation baseline / frozen unless explicitly changed by Igor**.
> This file translates the approved 46-point decision set into an implementable specification.
> Do not reopen product strategy during implementation. Unfixed numeric values may be calibrated,
> but the mechanic, progression philosophy, fairness rule and interaction model remain canonical.

## Purpose

Runes provide **micro-level behavior personalization**.

```text
TALENT = macro identity
RUNE   = micro behavior tuning
```

## Fairness

Runes must not create a spender-only combat ceiling.

They use:
- approximately equal power budgets;
- bounded upgrade tiers;
- visible tradeoffs;
- mode caps;
- anti-stacking rules.

Illustrative magnitudes such as 5/10/20 may be used while tuning, but final percentages are balance data.

## Sidegrade patterns

```text
+ projectile speed
- projectile radius

+ radius
- velocity

+ knockback
+ mana cost

- cooldown
- direct damage
```

## Rune families

- Projectile
- Knockback
- Mobility
- Resource
- Timing
- Area
- Defense
- Sustain
- Control
- authored element interaction

## Rune definition

Each rune contains:
- compatible tags;
- positive effects;
- tradeoffs;
- tier;
- stacking group;
- power-budget score;
- caps by mode.

## Sockets

Conceptual groups:
- Offense;
- Defense;
- Utility.

Exact socket count is tunable.

## Upgrade

Upgrade may improve/specialize a rune but:
- cannot bypass mode caps;
- cannot turn a low-access rune into an overwhelming strict upgrade;
- cannot create duplicate-driven whales.

## UI

Show:
- before/after;
- positive effect;
- tradeoff;
- affected skills;
- current cap;
- source/tier;
- preview/demo where useful.

## Telemetry

Track:
- equip rate;
- win rate adjusted by rating;
- hero synergy;
- KO/damage contribution;
- account band;
- free/paid acquisition source;
- upgrade distribution.

## Acceptance tests

- rune changes feel;
- tradeoff visible;
- same-budget rune choices are not obvious strict dominance;
- upgrades respect caps;
- duplicates cannot accumulate uncapped power;
- skill tooltip shows rune contribution separately.
