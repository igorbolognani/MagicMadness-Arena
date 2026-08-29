# MAGICMADNESS ARENA — Executive Digest

> **MAGICMADNESS ARENA — CANONICAL PRODUCT DEFINITION**
>
> Status: **implementation baseline / frozen unless explicitly changed by Igor**.
> This file translates the approved 46-point decision set into an implementable specification.
> Do not reopen product strategy during implementation. Unfixed numeric values may be calibrated,
> but the mechanic, progression philosophy, fairness rule and interaction model remain canonical.

## Product definition

**MagicMadness Arena** is a mobile-first, landscape, top-down 2D competitive physics arena hero-brawler with two equally important game pillars:

1. **PvP:** skillful movement, aiming, predictive skill preview, damage, control, knockback, map interaction and spectacular arena knockouts.
2. **PvE / History:** staged elemental progression, difficult bosses, mobs, map mechanics and progression rewards that let a skilled free player meaningfully advance without paying.

The game is not “Warlock with more spells.” Its identity is:

```text
PHYSICS + HERO IDENTITY + POSITIONING + MAP INTERACTION
+ SKILLFUL EXECUTION + FAIR ACCOUNT EXPRESSION
```

**Position is effectively a second HP bar.**

## Product surfaces

```text
PUBLIC WEBSITE
  ├─ Home / cinematic hero
  ├─ Gameplay mechanics videos
  ├─ How it works
  ├─ Heroes / elements / classes
  ├─ Modes
  ├─ History / bosses / world
  └─ Login / Play CTA

AUTHENTICATED LANDING
  ├─ Selected profile hero
  ├─ Play
  ├─ Heroes
  ├─ Progression
  ├─ Talents
  ├─ Runes
  ├─ Collection
  ├─ Profile / mastery / cosmetics
  └─ Settings

PLAY
  ├─ History / PvE
  ├─ Normal
  ├─ Ranked
  ├─ Vs Bots
  ├─ Friends / invite link
  └─ Events
```

## Canonical progressions

| Layer | Persists | Cap | Purpose |
|---|---:|---:|---|
| Account | Yes | 30 | unlocks, talent milestones, content bands |
| Heroes/talents/runes/mastery | Yes | system-specific | collection and build identity |
| Hero level inside match | No | 15 | round-by-round power/evolution |

Account content is segmented:
- **1–10:** early game;
- **10–20:** mid game;
- **20–30:** endgame.

Matchmaking uses compatible progression bands plus skill/rating once data exists.

## Combat constitution

```text
MOVE → AIM → PREVIEW → CAST → COLLIDE → DAMAGE/CONTROL
                                      ↓
                                  DISPLACEMENT
                                      ↓
                                    POSITION
                                      ↓
                         WALL / HAZARD / EDGE / KO
```

Rules:
- HP reaching zero causes death.
- Arena hazards/edge knockouts are equally valid and central.
- Skills can become dangerous at high in-match level, but the game must never collapse into ordinary DPS-only combat.
- Multiple hits/statuses may amplify later damage or knockback.
- Elemental advantages/resistances must remain bounded and readable.
- Returning from near-death edge situations can be as skillful and entertaining as producing the knockout.

## PvE / History

The first progression chapters are the four starter elements:

1. Fire
2. Water
3. Earth
4. Air

Each chapter contains stages, mechanics training, mobs/elites, several bosses where appropriate, and a major progression-lock boss.

Bosses:
- may have up to five authored skills/mechanics;
- use map mechanics;
- can summon mobs;
- have high but balanced effective life;
- require execution, dodging, positioning and interaction knowledge rather than only DPS;
- provide account, hero and gacha/progression resources.

## Elements and classes

Element is not class. Each elemental family can support:
- Tank;
- Damage;
- Utility.

Elemental identity must alter physics, geometry, VFX, animation and interactions rather than color only.

| Element | Mechanical identity |
|---|---|
| Fire | explosion, radial impulse, burning/zone reactions |
| Water | flow, push, pull, momentum |
| Earth | mass, walls, terrain, stability |
| Air | movement, trajectories, redirection |
| Lightning | speed, chain, metal conduction |
| Ice | friction, slide, freeze |
| Venom | persistent zones, debuffs, reactions |
| Dark | teleport, gravity, swap |
| Light | beams, shields, cleanse |
| Iron | mass, ricochet, magnetism |

## Starter teaching roles

| Starter | Teaching emphasis |
|---|---|
| Fire | direct damage, projectiles, explosions, knockback |
| Water | utility, push/pull, slow, manipulation |
| Earth | tanking, stability, walls, mass |
| Air | mobility, trajectory, redirection |

Later heroes are mechanically different, not higher power tiers.

## Hero kit

```text
PASSIVE
SKILL 1
SKILL 2
SKILL 3
SKILL 4 / SPECIAL
TACTICAL ACTION
HEALTH POTION
MANA POTION
```

Desktop:
- WASD;
- 1–4;
- left mouse hold/release for preview/cast;
- right mouse Tactical;
- Q health;
- E mana;
- wheel zoom.

Mobile:
- landscape;
- floating professional controls;
- left movement control;
- right skill/tactical/potion controls;
- hold/drag/release targeting;
- two-finger pinch zoom.

Starter Tactical is **Dash**. Other tactical actions unlock with progression.

## Hold-to-preview

Preview must visualize:
- direction;
- range;
- impact area;
- trajectory;
- static bounce/ricochet;
- predictable wall/object collision;
- predictable curvature under known fields;
- blocked segments;
- dynamic/uncertain segments distinctly.

Canonical skill shape vocabulary:
Line, Cone, Circle, Ring, Arc, Wall, Beam, Fan, Trail, Orbit, Chain, Pull Circle, Dash Line, Hook, Bounce.

The same primitive must still look elemental/hero-specific.

## Skill parameterization

All gameplay values are data-driven and versioned.

Families:
- Projectile: speed, acceleration, radius, life, range, pierce, bounce, homing, collision.
- Impact: damage, knockback, angle, radial force, stun, slow, pull, deflection.
- Casting: cast time, recovery, cooldown, mana, charges.
- Area: radius, shape, duration, expansion, tick frequency.
- State: elemental tags, vulnerabilities, resistances, stack rules.
- Interaction: wall/projectile/player/hazard/map responses.
- Preview: geometry/prediction behavior.
- Presentation: VFX/SFX/animation/telegraph.

## Physics

Physics is both planar and vertical-in-effect.

Planar:
- movement;
- collision;
- push/pull;
- knockback;
- slide/friction;
- ricochet;
- field forces;
- moving/destructible objects.

Vertical-in-effect:
- leap;
- knock-up;
- airborne;
- slam;
- projectile arcs;
- grounded/airborne mechanic targeting.

The game stays top-down 2D but represents vertical state clearly with shadow/sprite/VFX cues.

## Interaction matrix

Required domains:

```text
SPELL ↔ SPELL
SPELL ↔ PLAYER
SPELL ↔ WALL
SPELL ↔ OBJECT
PLAYER ↔ PLAYER
PLAYER ↔ WALL
PLAYER ↔ OBJECT
HAZARD ↔ SPELL
HAZARD ↔ PLAYER
ELEMENTAL STATE ↔ ELEMENTAL STATE
```

Emergent combos are a first-class feature and receive significant development effort.

Examples:
- wind redirects projectile;
- gravity curves projectile;
- ice changes friction;
- dash body-knockback;
- wall bounce/stun;
- lightning chains through metal;
- earth blocks projectile;
- fire reacts with a compatible venom cloud;
- one status reduces resistance so a follow-up attack becomes stronger.

## Attributes

Main attributes:
- **Force:** offense and displacement.
- **Resilience:** survival, stability and resistance.
- **Control:** utility, manipulation and resource effects.

Subattributes include:
- projectile;
- knockback;
- mobility;
- resource;
- timing;
- area;
- defense;
- sustain;
- control.

Rule: persistent substats can be noticeable but cannot destroy learnable dodge timing.

## Account talents

Talent tree is macro identity:
- Attack;
- Defense;
- Utility.

Milestones:
- Level 10;
- Level 20;
- Level 30.

A deeply Utility-oriented account must feel meaningfully more Utility-focused while still respecting PvP caps.

Special terms such as **Pierce** are clickable/tappable and explain:
- definition;
- affected defense;
- current value;
- mode cap;
- what the effect does not bypass.

## Runes

Runes are micro identity:
```text
TALENT = WHAT KIND OF BUILD?
RUNE   = HOW EXACTLY DOES IT BEHAVE?
```

They use approximately equal power budgets, small meaningful upgrades and sidegrades.

Examples:
- + projectile speed / - radius;
- + radius / - velocity;
- + knockback / + mana cost;
- - cooldown / - damage.

Illustrative tiers such as 5/10/20 may be used during tuning, but no percentage is a final constitutional rule until balance testing.

## In-match hero progression

Hero level: **1–15**.

Major evolution:
- **5**
- **10**
- **15**

Skill upgrades may branch between two behavioral routes. Prefer mechanic/shape/behavior changes over adding another uncontrolled stat layer.

The hero may receive subtle visual evolution according to selected skill routes.

## PvP modes

| Mode | Structure | Players |
|---|---|---:|
| Solo | FFA | ~15 |
| Duo | 7×2 | 14 |
| Trio | 5×3 | 15 |
| Squad | 3×5 | 15 |

Identity:
- Solo = chaos/opportunism;
- Duo = coordination;
- Trio = tactics;
- Squad = team war.

Normal and Ranked share the same core arena/event grammar. Normal is where players learn/familiarize. Ranked measures competitive performance. Official tournaments may lock curated modifiers/maps.

## Rounds, death and respawn

Rounds have finite duration.

Standard round:
- each player has **one respawn entitlement**;
- after using it, the next death eliminates that player for the rest of the round.

Final round:
- happens after final preparation/upgrades;
- each player has **three respawn entitlements**;
- after they are consumed, the next death is permanent;
- last surviving player/team wins first place.

Arena exterior is theme-dependent:
lava, acid/venom, spikes, void or another authored hazard.

## Scoring

Do **not** award match points from raw damage.

Separate:
1. Match Score — decides placement/winner.
2. Team Score — team result.
3. Individual Performance — XP/mastery/stats/rewards.

Track:
- KOs;
- assists;
- survival;
- placement;
- round wins;
- final victory;
- mode objectives;
- utility contribution where measurable.

Solo may contain kill stealing, but attribution must be deterministic and explainable.

Support kill/streak announcements such as Double Kill, Triple Kill and a distinctive MagicMadness high-streak “Madness” call.

## Arenas and houses

Arenas are authored templates with tested variation packages, not unlimited procedural maps.

Each arena defines:
- bounds;
- spawn anchors;
- center;
- house anchors;
- obstacles;
- hazard boundary;
- destructibles;
- event zones;
- boss hooks;
- camera bounds.

House anchors must be fairness-equivalent relative to center and edge.

Classic large arena target: roughly ten house anchors where geometry supports it.

Houses may function as:
- cover;
- blockers;
- ricochet surfaces;
- chokepoints;
- event shelter;
- destructible structures;
- tactical control positions.

The house function for a specific match can be selected from a tested pre-match pool.

## Match personality and environment

At match start, a roulette/reveal selects the tested personality/modifier.

Core rule:
**random in selection, predictable/telegraphed in execution.**

Events include:
- Lightning Storm;
- Tornado;
- Meteor Shower;
- Flood;
- Freeze;
- Lava Burst;
- Eclipse;
- Earthquake;
- Wind.

Every event has:
- warning;
- area/path;
- timing;
- damage/control;
- escalation;
- map interaction;
- skill interaction;
- audio/visual cues.

Normal and Ranked both retain this system.

## Collection and monetization

Constitution:

```text
GACHA / ECONOMY SHOULD CREATE
DISCOVERY
COLLECTION
ACCOUNT IDENTITY
BUILD DIVERSITY
PERSONALIZATION

NOT
RAW DECISIVE POWER
```

Starter player chooses Fire/Water/Earth/Air.

Gacha may target:
- element;
- class/route.

Targeting increases probability.

Hero duplicates never grant direct combat stats. They convert into useful currencies for collection, choice, cosmetics or pity/progression.

Required economy qualities:
- visible odds;
- understandable hard pity;
- carry-over where applicable;
- no duplicate power gap;
- target preference;
- meaningful free acquisition.

Exact pity and currency values are finalized only after gameplay/progression telemetry exists.

## Personalization

Explore:
- profile banner;
- avatar;
- title;
- hero mastery;
- selected VFX/trails;
- dash effect;
- KO effect;
- emotes;
- victory poses;
- rank badges.

Avoid “a million” simultaneous configuration choices. Rich account information is good; overloaded cosmetic controls are not.

## Visual/UX direction

- polished stylized 2D;
- top-down;
- strong silhouettes;
- hero-specific high-quality VFX;
- readable before decorative;
- professional public website;
- gameplay clips/videos on homepage;
- consistent original icon language across site and HUD;
- selected profile hero central after login.

## Camera

Desktop:
- scroll zoom.

Mobile:
- two-finger pinch.

The zoom range must allow tactical overview without losing hero, skill, telegraph or interaction readability.

World zoom never scales the HUD.

## Performance baseline

- fixed-step simulation;
- target 60 FPS on representative mid-range mobile;
- immediate local button/gesture feedback;
- no UI animation may block input;
- pooled projectiles/VFX;
- culling/LOD;
- gameplay telegraphs get priority over decorative effects.

## Development phases

```text
D0 Combat Grammar
 ↓
D1 Physics Interaction
 ↓
D2 Hero Grammar
 ↓
D3 Starter Elements
 ↓
D4 Match Grammar
 ↓
D5 Teams
 ↓
D6 Arena System
 ↓
D7 Environmental Layer
 ↓
D8 Expanded Heroes
 ↓
D9 Account Meta
 ↓
D10 Runes
 ↓
D11 Collection/Gacha/Economy
```

Cross-cutting from the beginning:
- mobile input;
- data-driven balance;
- testing;
- diagnostics;
- replay/event evidence;
- performance;
- accessibility.

## First playable product truth test

A build is not MagicMadness Arena until it proves:
1. throwing someone out is fun;
2. returning from danger is possible and skillful;
3. hold-to-preview makes complex skills readable;
4. at least one emergent combo is predictable/repeatable;
5. a boss requires mechanics rather than pure DPS;
6. mobile controls are fluid;
7. four starter heroes feel mechanically different;
8. respawn/score rules are understandable;
9. persistent builds feel different without deciding PvP;
10. bots and friends can expose balance problems quickly.
