# D1 — Physics & Interaction System

> **MAGICMADNESS ARENA — CANONICAL PRODUCT DEFINITION**
>
> Status: **implementation baseline / frozen unless explicitly changed by Igor**.
> This file translates the approved 46-point decision set into an implementable specification.
> Do not reopen product strategy during implementation. Unfixed numeric values may be calibrated,
> but the mechanic, progression philosophy, fairness rule and interaction model remain canonical.

## Goal

Make physics the transversal grammar of the game.

## Interaction domains

| A | B | Resolution family |
|---|---|---|
| Spell | Player | damage/status/impulse |
| Spell | Spell | cancel/deflect/merge/ignore |
| Spell | Wall | stop/explode/bounce/pierce |
| Spell | Object | move/destroy/activate/ignore |
| Player | Player | collision/tactical body effect |
| Player | Wall | block/bounce/stun |
| Player | Object | block/push/trigger |
| Hazard | Player | damage/control/KO |
| Hazard | Spell | transform/dissipate/redirect |
| Element state | Element state | authored reaction |

## Horizontal physics

Support:
- velocity/acceleration;
- collision;
- radial impulse;
- push/pull;
- friction/slide;
- rebound;
- gravity-like planar fields;
- attraction/repulsion;
- ricochet;
- movable/destructible objects.

## Vertical-in-effect state

The game remains 2D top-down but tracks a simple height axis:

```text
GROUND → RISING → AIRBORNE → FALLING → LANDING
```

Uses:
- knock-up;
- leap;
- slam;
- arcing projectile;
- ground-only/air-only boss effects;
- crossing low geometry where authored.

Render vertical state through sprite offset, shadow and VFX.

## Element tags

Skills/events/entities expose tags such as:

```text
FIRE
WATER
WIND
ICE
METAL
VENOM_CLOUD
GRAVITY_FIELD
PROJECTILE
BEAM
AREA
GROUND
AIRBORNE
DESTRUCTIVE
```

Interactions come from a registry, not nested hero-specific conditionals.

## Deterministic resolution order

```text
1 INPUT
2 CAST TRANSITIONS
3 MOVEMENT INTENT
4 FIELDS/FORCES
5 PHYSICS STEP
6 COLLISION COLLECTION
7 INTERACTION RULES
8 DAMAGE/STATUS
9 POST-COLLISION IMPULSE
10 DEATH/KO
11 EVENT LOG
12 SNAPSHOT/RENDER STATE
```

## Emergent combo quality bar

A combo is valid only when:
- cause is understandable;
- result follows a known rule;
- timing matters;
- it is repeatable;
- telemetry reconstructs it;
- VFX communicate transformation.

## Predictive preview

Preview may show:
- direct path;
- static bounce;
- static wall hit;
- curvature from a known field;
- impact area.

Dynamic opponent motion is not presented as guaranteed prediction.

Use visual distinction for:
- certain path;
- predicted path;
- unknown/dynamic segment.

## Wall/object metadata

Walls:
- solid;
- reflective;
- destructible;
- movable;
- element-reactive;
- height class;
- friction/restitution.

Objects:
- cover;
- pillar;
- crate;
- conductor;
- mechanic object;
- destructible house component.

## Anti-chaos rules

- gameplay collision survives decorative particle culling;
- chain reactions have authored recursion/depth caps;
- ownership/assist attribution propagates through transformed projectiles;
- physics debug overlay exposes vectors, colliders, tags and rule IDs.

## Acceptance tests

1. Wind bends a projectile and keeps attribution.
2. Ice alters friction and can contribute to hazard KO.
3. Earth wall blocks supported projectiles.
4. Reflective surface ricochets.
5. Wall collision triggers configured bounce/stun.
6. Fire reacts with compatible cloud.
7. Ground-only attack misses correctly airborne target.
8. Preview predicts one static bounce.
9. Event log reconstructs resolution order.
