# D7 — Environmental Events & Match Personality

> **MAGICMADNESS ARENA — CANONICAL PRODUCT DEFINITION**
>
> Status: **implementation baseline / frozen unless explicitly changed by Igor**.
> This file translates the approved 46-point decision set into an implementable specification.
> Do not reopen product strategy during implementation. Unfixed numeric values may be calibrated,
> but the mechanic, progression philosophy, fairness rule and interaction model remain canonical.

## Core law

**Random in selection; predictable and telegraphed in execution.**

## Match personality

At start, a roulette/reveal selects a tested modifier/personality.

Applies across:
- Solo;
- Duo;
- Trio;
- Squad;
- Normal;
- Ranked.

History/boss content may use fixed authored personalities.

## Event contract

Each event defines:
- allowed arenas/modes;
- selection weight;
- schedule;
- warning;
- affected zones/path;
- damage;
- impulse/control;
- duration;
- escalation;
- map interactions;
- skill interactions;
- VFX/SFX;
- accessibility cues.

## Initial event pool

- Lightning Storm
- Tornado
- Meteor Shower
- Flood
- Freeze
- Lava Burst
- Eclipse
- Earthquake
- Wind

## Telegraph

Use at least two channels where practical:
- marker/shape;
- animation;
- audio;
- countdown;
- direction/path.

Never rely on color only.

## Response timing

Expose data fields such as:
- warning lead;
- impact duration;
- active duration;
- repeat cadence;
- escalation curve.

Final numbers are per-event tuning.

## Interaction examples

Lightning:
- warning zone;
- strike;
- damage/control;
- player can intentionally knock enemy into it.

Tornado:
- visible path;
- pull/throw;
- can alter supported projectile trajectories.

Freeze:
- spreading ground;
- changes friction;
- creates displacement opportunities.

## Ranked

Ranked retains the system through tested pools and deterministic execution.

## Tournament

Official events may curate or fix the pool.

## Acceptance tests

- random selection replays deterministic execution;
- warnings visible at far zoom;
- audio has visual equivalent;
- player can intentionally combo with event;
- escalation never bypasses telegraph;
- attribution survives event/skill interaction.
