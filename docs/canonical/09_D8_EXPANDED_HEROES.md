# D8 — Expanded Elements & Hero Content

> **MAGICMADNESS ARENA — CANONICAL PRODUCT DEFINITION**
>
> Status: **implementation baseline / frozen unless explicitly changed by Igor**.
> This file translates the approved 46-point decision set into an implementable specification.
> Do not reopen product strategy during implementation. Unfixed numeric values may be calibrated,
> but the mechanic, progression philosophy, fairness rule and interaction model remain canonical.

## Expanded elements

- Lightning
- Ice
- Venom
- Dark
- Light
- Iron

Together with Fire/Water/Earth/Air:
**10 elemental families**.

Each can eventually support Tank, Damage and Utility, creating up to 30 archetype cells without requiring 30 launch heroes.

## Mechanical identity

### Lightning
Velocity, chain, conductive metal interactions.

### Ice
Friction, slide, freeze, ground-state control.

### Venom
Persistent zones, debuffs, cloud/reaction logic.

### Dark
Teleport, gravity, swap, topology manipulation.

### Light
Beams, shields, cleanse/support.

### Iron
Mass, ricochet, magnetism, conductivity.

## No reskins

A new element must change several of:
- movement interaction;
- projectile behavior;
- map behavior;
- status;
- combo rules;
- preview geometry;
- recovery/counterplay.

## Release quality gate

A hero cannot enter competitive pool without:
- complete data contract;
- bot/PvE test;
- interaction tests;
- mobile readability;
- balance simulation;
- tooltip/glossary;
- VFX budget;
- replay attribution.

## No power creep

Later heroes may be:
- more complex;
- niche;
- synergistic;
- matchup-sensitive.

They are not higher budget.

## Element advantages/resistances

Allowed only as bounded, visible modifiers/interactions.

They:
- encourage roster diversity;
- must not pre-decide matchups;
- may have mode-specific caps;
- work consistently in PvE and PvP.

## Acceptance tests

- hero describable mechanically without color;
- later hero within starter power budget;
- counter matchup remains winnable;
- every status documented;
- unique mechanic has a test scenario.

## Expanded 3D gate — 2026-09-02

An expanded hero cannot become playable from data alone. It needs a complete `visualPackageId`, body silhouette, animation-state mapping, four skill icons, telegraphs, projectile/field/wall models, impact VFX, showcase pose and far-zoom validation. Contract-only heroes remain visible as lore/system entries, never disguised as production-ready 3D content.
