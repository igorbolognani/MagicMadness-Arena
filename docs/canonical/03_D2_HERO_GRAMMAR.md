# D2 — Hero Grammar, Skills & Presentation

> **MAGICMADNESS ARENA — CANONICAL PRODUCT DEFINITION**
>
> Status: **implementation baseline / frozen unless explicitly changed by Igor**.
> This file translates the approved 46-point decision set into an implementable specification.
> Do not reopen product strategy during implementation. Unfixed numeric values may be calibrated,
> but the mechanic, progression philosophy, fairness rule and interaction model remain canonical.

## Hero contract

Each hero defines:
- identity;
- element;
- primary class;
- silhouette;
- base attributes;
- passive;
- skills 1–4;
- Tactical compatibility;
- resource model;
- match upgrade graph;
- talent/rune compatibility;
- VFX/SFX/animation.

## Class independence

Classes:
- Tank;
- Damage;
- Utility.

A Fire Tank, Fire Damage and Fire Utility hero share Fire identity but differ in role, geometry and pressure pattern.

## Skill contract

Each skill defines:
- geometry;
- timing;
- resource;
- collision;
- damage;
- displacement;
- control/status;
- interactions;
- preview;
- VFX/SFX;
- upgrade branches.

## Geometry vocabulary

Line, Cone, Circle, Ring, Arc, Wall, Beam, Fan, Trail, Orbit, Chain, Pull Circle, Dash Line, Hook, Bounce.

The primitive is mathematical. Presentation is elemental.

Example:
```text
LINE
Fire  = flaming bolt
Water = pressure jet
Earth = fissure spear
Air   = slicing gust
```

## Hold-to-preview is hero content

Preview layers:
1. origin;
2. direction;
3. range;
4. impact shape;
5. collision/bounce;
6. deterministic transformation;
7. ready/cancel state.

## Animation

Priority:
- anticipation communicates timing;
- cast communicates release;
- travel communicates velocity/element;
- impact communicates damage/impulse;
- recovery communicates vulnerability.

Animation cannot silently change authoritative timing.

## Hero page

Expose:
- element/class;
- difficulty;
- skill icons;
- concise summary;
- detailed tooltips;
- damage/knockback/control tags;
- geometry demo;
- current account modifications;
- talents/runes;
- 5/10/15 upgrade routes;
- glossary links.

## Glossary

Every specialized term is tappable/clickable.

Example:

```text
Pierce ⓘ
Definition
What defense it affects
Current build value
Mode cap
What it does NOT bypass
```

## Match upgrades

At 5/10/15, skills can branch behaviorally.

Preferred:
- size/shape transformation;
- cast behavior;
- impact behavior;
- interaction change.

Avoid creating a second uncontrolled stat tree.

Subtle hero visual changes can reflect chosen branches without losing silhouette recognition.

## Versioning

Matches store:
- hero version;
- skill versions;
- balance version.

## Acceptance tests

- four heroes reuse the engine but feel distinct;
- data edit updates gameplay and tooltip;
- preview matches collider;
- buttons expose cooldown/resource;
- every status term is explainable;
- branch changes behavior without ad-hoc code;
- hero recognizable at far zoom.
