# MagicMadness Arena — Decision Log

## Product decisions

Product decisions 1–46 are closed and preserved in
docs/canonical/18_DECISION_TRACEABILITY_1_46.md. The Executive Digest and
D0–D11 documents are the product source of truth.

## Technical baseline decisions

### T001 — Shared game core before online authority

The local bot path and future authoritative server import the same
packages/game-core simulation. This keeps local playtests useful without
creating a disposable prototype engine.

### T002 — Deterministic adapter for first vertical slice

The first slice uses a small deterministic 2D physics adapter behind an
interface. It supports the acceptance scenarios now and leaves a replaceable
boundary for Rapier 2D WASM if measured collision complexity requires it.

### T003 — Vite web client with a replaceable 3D renderer

The web surface uses React/Vite for the public/app shell and Three.js for the
first playable 3D world renderer. HUD remains DOM-based so it does not scale
with world zoom. The renderer boundary remains replaceable and consumes only
authoritative `GameState`.

### T004 — ChatGPT authentication adapter

Development uses a local identity. Sign in with ChatGPT is represented by an
adapter because availability depends on the deployment surface; account
identity is never derived from email.

### T005 — Route-separated game client

The public discovery surface, authenticated launcher and actual match client
are separate URL route families: public `/`, `/heroes`, `/elements`,
`/modes`, `/world` and `/news`; authenticated `/game/*`; and match
`/match/local/:matchId` or `/match/history/:stageId`. The web client uses a
small history API adapter so the surface remains static-host compatible while
retaining real navigation and deep-linkable entry points.

### T006 — Fullscreen as progressive enhancement

Starting a match requests browser fullscreen from the initiating user gesture.
The game remains playable in a normal viewport when fullscreen is unavailable;
`100dvh`, safe-area-aware responsive layout and the landscape warning preserve
the mobile contract without making browser fullscreen a gameplay dependency.

### T007 — HD presentation without simulation coupling

Public/stage presentation may use original raster key art, while the live arena
is rendered as a top-down 3D scene through Three.js from authoritative
`GameState`. Visual art cannot become a gameplay input or balance source; the
deterministic simulation continues to use versioned content and balance
packages.

### T008 — Renderer boundary and capability reporting

Three.js WebGL is the live renderer. If WebGL cannot be initialized on a
browser or hosted surface, the client reports that capability failure rather
than silently downgrading the requested 3D presentation. The simulation and
input boundaries remain independent of renderer capability.

### T009 — Fullscreen-first match presentation

The match route owns the whole viewport. The arena renderer is the visual
foundation; score, placement, diagnostics, event log and controls are layered
over it and reduced on mobile landscape. This preserves the canonical HUD
information while ensuring the client reads as a game scene before it reads as
an application shell.

### T010 — Procedural art baseline before sprite production

The first visual client pass uses deterministic renderer-side shapes for unit
silhouettes, arena floor detail, props and elemental feedback so the game can be
played and tested without coupling art files to simulation. These shapes are an
implementation baseline, not a product art decision; original animated sprite
atlases, terrain tiles and authored VFX can replace them without changing
GameState, content, balance or authority contracts.

### T011 — Dual-stick input boundary for mobile client

The mobile match client exposes independent circular move and aim controls.
Both controls emit normalized vectors into the same `InputCommand` stream used
by keyboard/mouse play. A skill remains a hold-to-preview action and casts only
when the release command reaches `game-core`; pointer cancellation releases the
skill as well, preventing a stuck input state.

### T012 — Circular combat control language

Touch-facing skills, dash and potion actions use circular controls in the match
HUD. Skill glyphs are derived from the versioned balance behavior, while the
renderer remains responsible for the higher-fidelity world presentation.

### T013 — Persistent visual confirmation for non-projectile casts

Because radial, pull, field, wall and dash skills do not all leave a moving
projectile in the world, the renderer emits a short behavior-specific cast
burst from the `CAST_RELEASE` event. This is presentation-only feedback; hit,
damage, cooldown and outcome remain owned by `game-core`.

### T014 — Landscape battle HUD composition

On short landscape screens, the match client hides secondary score and event
rails so the arena owns the full viewport. Movement, aim, skills, dash and
potions remain circular DOM overlays above the renderer, while fullscreen and
pause remain in the compact topbar. Pause only gates the local simulation
clock; it does not add an authority rule or mutate `GameState`.

### T015 — History stage and boss content contract

History content is represented as versioned stage records with an explicit
purpose (`lesson`, `pressure`, or `boss`) and mechanic list. Boss records now
carry bounded phase thresholds, mechanic identifiers and telegraph identifiers;
the first Fire chapter binds `fire-03` to the three-phase Cinder Warden. Runtime
encounter execution remains the next implementation step and must consume
these records outside React components.

### T016 — Procedural 3D chibi vertical slice

The first playable client uses deterministic procedural meshes for four starter
chibi heroes, arena geometry and elemental VFX so 3D gameplay can be inspected
immediately without waiting for a complete art pipeline. The baseline includes
a rotatable hero showcase and top-down camera scene. The meshes are an
implementation baseline; production GLTF models, animation clips and particle
textures may replace them without changing game-core contracts.

### T017 — Authenticated client shell composition

The authenticated route family keeps a shared Meridian game-client shell with
persistent selected-hero context and an ambient 3D hero scene. The launcher and
hero roster show the larger interactive showcase; secondary account routes use
the lower-opacity ambient scene. This fixes the dashboard-like transition while
preserving route separation, DOM HUD ownership and Game Core boundaries.

### T018 — Hybrid authored arena renderer and direct skill-drag targeting

The competitive simulation remains a deterministic top-down 2D plane, while
the client maps it to an authored Three.js world. Windfall Ring now renders a
textured stone island, abyss layer, hazard rim, ruins, shrines, crystals and
environmental wind ribbons without changing collider coordinates. On coarse
pointer devices, each circular skill button owns press/drag/release targeting:
the drag vector updates the 360-degree aim and the world preview exposes the
skill's actual line, arc, wall, pull-circle, trail or dash geometry. The
separate aim stick is hidden on touch landscape because it is no longer needed
for casting.

### T019 — Explicit 3D visibility contract

The 3D client now has a formal presentation bridge rather than an implicit
canvas transform. Game-core exposes vertical motion state and deterministic
preview path segments; Three.js maps X/Y to X/Z, height to model Y, and uses a
floor-plane raycast for desktop pointer aim. Ground shadows/rings remain on the
floor so airborne units are visually readable. Hero content carries a versioned
`visualPackageId` for the current procedural meshes and future GLTF/animation
packages.

### T020 — WebGL capability is explicit

Three.js/WebGL is the live match and showcase renderer. If it cannot initialize,
the client displays the capability failure while leaving simulation/protocol
tests independent. PixiJS and the old Canvas 2D fallback are historical and are
not shipped as a competing match renderer.

### T021 — Worker/D1 account boundary

The deployed Site Worker owns authenticated level-one account creation and
starter selection in D1. Its stable key is the hosting-provided authenticated
user ID. The Worker serves web/account concerns only; competitive match truth
and reward issuance remain in the authoritative game-server path. Browser
result claims cannot write progression.

### T022 — Grand Meridian and elemental client skin

The first arena baseline is enlarged to 2200×1240 and all projection/camera
centers derive from arena state. Ten shrine/house colliders, four destructible
crates, six ruin lines and four elemental corners form the authored world.
Classic portal and top-down brawler references constrain hierarchy/readability
only; MagicMadness models, icons, layouts, VFX and fiction remain original.

### T023 — Asset-backed starter presentation

The four starter `visualPackageId` values now map to original GLB 2.0 files with skinned meshes, an eight-joint rig, thirteen named clips and compact elemental textures. `GLTFLoader` plus cached `SkeletonUtils.clone` is the normal path shared by arena and showcase. Procedural character geometry is an explicit load-failure fallback only.

### T024 — Authoritative idempotent result consumption

The separate game-server signs canonical v1 result receipts with a runtime HMAC secret. The Worker verifies account, signature, expiry and versions, then atomically consumes the receipt into D1 history/progression/account state. Local practice cannot mint rewards. ADR-009 controls this boundary.

### T025 — Authenticated Visual Lab as the inspection surface

The shared GLB/VFX presentation stack is inspected through `/game/visual-lab`, not a separate renderer or procedural demo. The route exposes the four models, thirteen clips, sixteen skill packages, three quality tiers, bounded pool counters and renderer metrics. Its checklist distinguishes machine-verified loading from human visual observation and never promotes unavailable WebGL evidence to an approval.

### T026 — Server-owned Verified Vs Bots

The first progression-bearing bot mode runs in `apps/game-server` behind a Worker-issued signed ticket. The browser sends only versioned inputs and renders snapshots; reconnect is token-bound and limited. The final signed receipt is relayed unchanged and consumed idempotently. Production availability is controlled by the external WebSocket environment variable, so the Site cannot claim the mode while only the integration runtime exists. ADR-010 controls this boundary.

## Change rule

Any technical change that changes authority, simulation ordering, content
versioning, persistence, or deployment boundaries requires a new ADR and
updated evidence in implementation-status.md.

## T011 — Separate client journey and stronger arena displacement (2026-09-15)

Follow the latest explicit distant-camera/Warlock/Swap Heroes direction. Implement portal-to-new-tab client, real logout, D1 guide/build persistence, numerical spellbook, signed build ticket v2, bounded talents/runes, account skill unlocks and v3 curved hero meshes. Preserve practice/no-reward and external-match-authority boundaries. Calibration values, read inventory and unresolved requirements are recorded in `docs/architecture/client-journey-2026-09-15.md`; they are implementation decisions, not retroactively attributed to the original brainstorming.
