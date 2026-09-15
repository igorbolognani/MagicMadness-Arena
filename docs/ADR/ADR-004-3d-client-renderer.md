# ADR-004: Three-dimensional game-client renderer

Status: accepted  
Date: 2026-08-30

## Context

The canonical combat and physics contracts describe a top-down arena, but the intended
presentation is a real game client: chibi 3D heroes, readable elemental effects, a full
screen match surface and a rotatable hero showcase. The previous renderer drew the arena
with 2D vector primitives, which made movement and input observable but could not express
the requested meteor, lightning, tornado, projectile and character presentation.

## Decision

Use Three.js directly in the web client for the first playable visual slice. The renderer
owns only presentation: floor, walls, chibi meshes, camera, lighting, projectiles, fields,
preview geometry and transient VFX. The deterministic `@mma/game-core` remains the source
of truth for positions, collisions, hit resolution, damage, cooldowns, respawns, score and
bot decisions.

The first slice uses procedural chibi meshes so the client is immediately playable without
pretending that placeholder 2D art is final production art. The mesh/material interface is
deliberately replaceable by GLTF assets and animation clips later. This is an implementation
baseline, not a new product decision.

The presentation bridge is explicit: authoritative game X/Y becomes scene X/Z,
`PlayerState.vertical.height` becomes scene Y, and the unit shadow/selection
ring remain compensated to the ground plane. Pointer aiming uses a Three.js ray
against that same plane so desktop aim is not distorted by the oblique camera.
The renderer draws the `SkillPreview.path` segments supplied by game-core,
including predicted ricochets and blocked-cover markers; it never recomputes
hits or outcomes.

Every hero definition carries a versioned `visualPackageId`. The current
packages resolve to procedural chibi profiles, while a later GLTF/animation
loader can replace the visual package without changing the hero, balance,
physics or protocol contracts.

## Consequences

- The public site and authenticated client remain separate surfaces.
- `/match/local/:id` is a real WebGL game surface with a loading handoff, HUD and controls.
- Local bot play is honest and deterministic; competitive multiplayer still requires the
  separate authoritative server boundary defined by the architecture documents.
- Three.js increases the initial bundle size, so the client records bundle size and should
  move to lazy-loaded renderer chunks before production scale.
- Asset-backed GLTF heroes, authored animation clips and production particle textures remain
  explicit follow-up work; they do not block the first playable vertical slice.
- A browser without WebGL receives an explicit capability message. There is no
  silent 2D downgrade that could hide a missing 3D presentation.
