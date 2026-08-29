# D6 — Arena System, Houses, Geometry & Camera

> **MAGICMADNESS ARENA — CANONICAL PRODUCT DEFINITION**
>
> Status: **implementation baseline / frozen unless explicitly changed by Igor**.
> This file translates the approved 46-point decision set into an implementable specification.
> Do not reopen product strategy during implementation. Unfixed numeric values may be calibrated,
> but the mechanic, progression philosophy, fairness rule and interaction model remain canonical.

## Principle

Arenas are authored, spacious, beautiful and mechanically readable.

No unlimited procedural geometry.

## Arena contract

```text
ARENA
 ├─ authored base geometry
 ├─ spawn anchors
 ├─ center
 ├─ house anchors
 ├─ obstacle packages
 ├─ edge/hazard
 ├─ destructible layers
 ├─ event zones
 ├─ boss hooks
 ├─ camera bounds
 └─ tested variation packages
```

## Fairness

Competitive layouts maintain comparable:
- path distance to center;
- house access;
- edge exposure;
- firing-lane opportunity;
- recovery route quality.

Random packages are only selected from tested combinations.

## Houses

Houses can be:
- cover;
- blocker;
- ricochet surface;
- chokepoint;
- event shelter;
- destructible structure;
- territorial objective/position.

Their **match function** can be selected at match start from a tested pool.

Classic larger arenas may use roughly ten house anchors when geometry supports it.

Do not force the same count into every map.

## Arena families

Develop richer versions of:
- Ring;
- Cross;
- Split.

### Ring
Open center plus circumferential pressure.

### Cross
Strong corridors and collision lanes.

### Split
Separated spaces requiring mobility/reconnection.

## Edge themes

The outside/hazard can be:
- lava;
- acid/venom;
- spikes/metal;
- void;
- other authored danger.

All use a standardized hazard contract but distinct interaction/VFX.

## Shrink / late pressure

Where used:
- path/timing telegraphed;
- navigability preserved;
- recovery not instantly invalidated;
- values data-driven.

## Camera

Desktop:
- mouse wheel.

Mobile:
- two-finger pinch.

Rules:
- smooth/clamped;
- HUD independent;
- targeting physics independent;
- minimum zoom still preserves hero/telegraph/status readability.

At far zoom, decorative LOD may fall, gameplay cues may not.

## Acceptance tests

- measured spawn fairness;
- zoom has zero gameplay effect;
- mobile pinch smooth and non-casting;
- arena readable at far zoom;
- house function changes without unfair anchor movement;
- destructible collision and preview update together.
