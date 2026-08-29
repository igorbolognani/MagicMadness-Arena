# D11 — Collection, Gacha, Currencies & Economy

> **MAGICMADNESS ARENA — CANONICAL PRODUCT DEFINITION**
>
> Status: **implementation baseline / frozen unless explicitly changed by Igor**.
> This file translates the approved 46-point decision set into an implementable specification.
> Do not reopen product strategy during implementation. Unfixed numeric values may be calibrated,
> but the mechanic, progression philosophy, fairness rule and interaction model remain canonical.

## Status

This is intentionally the last economy phase.

The **philosophy is frozen**. Exact pity, prices and currency rates are calibrated after the game is playable and measurable.

## Constitution

```text
MONETIZATION MAY SELL/ACCELERATE
- discovery
- collection
- personalization
- convenience
- bounded progression inside caps

MONETIZATION MAY NOT SELL
- decisive PvP stats
- duplicate-only power
- must-have superior competitive heroes
```

## Starter flow

Player begins by choosing:
- Fire;
- Water;
- Earth;
- Air.

History and normal progression provide practical paths to the other starter families.

## Hero gacha targeting

Player may prefer:
- element;
- class/route.

Preference raises probability.

The system should be generous enough that players can pursue a preferred identity without making all heroes trivial to obtain.

## Pull outputs

Depending on final economy:
- new hero;
- rune/rune material;
- cosmetic;
- currency.

No output may create whale-only raw combat power.

## Duplicates

Hero duplicate grants **zero direct combat stats**.

Convert into useful currencies such as:
- universal hero value;
- cosmetic value;
- choice value;
- pity/pull progress.

Final mapping should be simple and globally consistent.

## Pity/fairness requirements

- visible odds;
- clear hard ceiling;
- carry-over where applicable;
- no duplicate power gap;
- target preference;
- meaningful free earning;
- avoid punitive forced-loss/50-50 philosophy as default.

Exact count is chosen only after economy simulation.

## Free sources

- History;
- boss clears;
- account milestones;
- events;
- normal/ranked participation where appropriate;
- achievements;
- mastery.

Avoid turning progression into mandatory chore overload.

## Anti-P2W audit

For each monetized path ask:

1. Can a payer reach combat power a skilled free player cannot?
2. Do duplicates raise combat ceiling?
3. Is a hero statistically superior rather than mechanically different?
4. Can payment bypass PvE mastery?
5. Is preferred starter identity artificially blocked?
6. Can matchmaking protect meaningful account-band differences?

Any “yes” requires revision.

## Economy metrics before freezing values

Measure:
- time to account 10/20/30;
- story reward cadence;
- hero acquisition cadence;
- desired collection horizon;
- duplicate rate;
- rune progression;
- free/paid pull mix;
- retention;
- PvP win rate by spend cohort;
- hero diversity.

## Preferred monetization identity

Favor:
- cosmetics;
- collection/discovery;
- profile/account identity;
- optional bounded acceleration.

Avoid:
- stat packs;
- paid-exclusive PvP power;
- duplicate constellations with damage/HP/ultimate upgrades;
- opaque odds.

## Acceptance tests

- free account progresses meaningfully;
- duplicate gives zero direct stat;
- target preference works;
- pity state visible/testable;
- economy values can change without code changes;
- spend cohort does not create systemic PvP advantage after skill/band adjustment.
