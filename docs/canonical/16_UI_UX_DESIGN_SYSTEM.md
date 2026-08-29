# UI/UX, Visual System, Icons & Website

> **MAGICMADNESS ARENA — CANONICAL EXECUTION SPEC**
>
> Status: implementation baseline. Product/game-design requirements come from the canonical D0–D11 pack.
> Technical choices may evolve only through evidence-backed ADRs and must preserve the product contract.

## Objective

One coherent visual language from homepage to live-match HUD.

## Principles

1. readability before decoration;
2. elemental identity;
3. strong top-down silhouettes;
4. professional mobile controls;
5. concise navigation;
6. gameplay VFX never hide gameplay truth.

## Public homepage

```text
HERO / FEATURED CHARACTER
 ↓
WHAT IS MAGICMADNESS
 ↓
GAMEPLAY VIDEO: PHYSICS + KNOCKOUT
 ↓
ELEMENTS & CLASSES
 ↓
HISTORY / BOSSES
 ↓
PVP MODES
 ↓
BUILD / TALENTS / RUNES
 ↓
FAIR PROGRESSION
 ↓
PLAY / LOGIN CTA
```

Hero section:
- featured hero;
- logo/title;
- short proposition;
- Play/Login;
- motion/video showcase.

## Authenticated hero landing

Selected profile hero is visually central.

Primary navigation:
- Play;
- Heroes;
- Progression;
- Collection;
- Profile.

Secondary/detail navigation:
- Talents;
- Runes;
- Settings;
- Rankings/Events when available.

Do not give every subsystem equal visual weight.

## Play route

Cards:
- History;
- Normal;
- Ranked;
- Vs Bots;
- Friends;
- Events.

Each shows:
- player/team structure;
- unlock state;
- short identity;
- current relevant progression.

## Mobile gameplay HUD

Landscape:

```text
┌────────────────────────────────────────────────────┐
│ Round / Rank                         Event / Timer  │
│                                                    │
│                  GAME WORLD                        │
│                                                    │
│ [Movement]                      [S1][S2][S3][S4]   │
│                                  [T][HP][MANA]     │
└────────────────────────────────────────────────────┘
```

Controls:
- large touch target;
- compact visual;
- same-frame press feedback;
- cooldown radial/overlay;
- insufficient-resource state;
- selected/preview state.

## Desktop HUD

Same information model, desktop hints:
- WASD;
- 1–4;
- LMB;
- RMB;
- Q/E;
- wheel.

Do not build a separate desktop game.

## Icon language

Create original in-repository SVG families:
- elements;
- classes;
- skill geometry;
- status;
- resources;
- Tactical;
- environmental events;
- currencies;
- mastery/profile.

Rules:
- readable at 24px;
- recognizable silhouette;
- common stroke/shape grammar;
- no color-only meaning;
- ready/cooldown/selected states consistent;
- palette comes from design tokens.

## Asset workflow

For each asset:
1. semantic purpose;
2. visual concept/reference;
3. gameplay-readability review;
4. controlled vector/SVG for critical icons;
5. test 24/32/48px;
6. grayscale/color-blind check;
7. repository versioning.

Generative/reference art can inform style, but collision/telegraph truth must be controlled assets.

## Skill preview

World-space geometry plus screen-space legibility.

Show:
- origin;
- trajectory;
- impact;
- bounce;
- predicted transformation;
- blocked segment;
- uncertain segment.

## Boss UX

Expose:
- boss life;
- phase;
- mechanic name/introduction;
- warnings;
- countdown where useful;
- summon state;
- map mechanic state.

Announcements teach without freezing combat.

## Profile personalization

Visible high-value identity:
- selected hero;
- account level;
- rank;
- title;
- mastery;
- banner/avatar;
- selected achievements.

Avoid too many simultaneous cosmetic toggles.

## Motion

- short transitions;
- no animation blocking input;
- decorative motion can respect reduced-motion;
- gameplay timing never depends on CSS/visual easing.

## Accessibility

- telegraphs not color-only;
- strong contrast;
- scalable menu text;
- reduced decorative motion;
- visual equivalents for audio warnings;
- optional haptics where available.

## Orientation

Menus may work portrait, but entering gameplay requests/requires landscape.

## Camera and UI

World zoom never scales HUD.

At far zoom:
- simplify decoration;
- keep hero outline;
- keep status;
- keep skill/event warnings;
- keep impact geometry legible.

## Acceptance

- homepage explains the game before login;
- Play is reachable immediately after login;
- selected profile hero is central;
- combat icons readable at actual size;
- mobile controls pass thumb-reach/safe-area tests;
- pinch/zoom never disturbs HUD.
