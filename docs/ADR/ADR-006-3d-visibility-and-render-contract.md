# ADR-006 — 3D visibility and simulation/render contract

Status: accepted  
Date: 2026-08-30

## Context

The second implementation session introduced a Three.js arena and direct
skill-drag targeting, but several boundaries still described the old Pixi
renderer. The game also represented airborne play only as a status, so a
three-dimensional hero could not visibly follow the canonical
`GROUND → RISING → AIRBORNE → FALLING → LANDING` lifecycle. Pointer coordinates
were mapped as if the canvas were a flat rectangle, which is not correct for an
oblique 3D camera.

## Decision

- Keep the competitive simulation deterministic and top-down in game-core. Its
  authoritative coordinates remain 2D X/Y.
- Add an explicit vertical state to player snapshots. Height, rising/falling
  state and landing timing are simulation data, not renderer guesses.
- Map game X/Y to Three X/Z and vertical height to Three Y. The model moves with
  the gameplay height while the shadow and selection ring stay readable on the
  ground plane.
- Resolve desktop pointer aiming by raycasting the Three camera onto the game
  floor plane. Touch skill buttons continue to own press/drag/release 360-degree
  targeting; the redundant touch aim stick remains hidden in landscape.
- Compute static preview intersections and predictable bounce segments in
  game-core. Three.js only visualizes the returned path, certainty, impact area
  and blocked marker.
- Three.js/WebGL is the live visual path. Initialization failures are surfaced
  as capability states in the UI; no silent Pixi/Canvas 2D fallback remains.
- Keep a versioned `visualPackageId` on heroes. Procedural packages are the
  current baseline and are replaceable by GLTF/animation packages later.

## Consequences

- 3D visibility is now coupled to explicit simulation state without coupling
  game rules to React or Three.js.
- Preview feedback reflects actual cover and ricochet geometry rather than a
  decorative straight line.
- The older Pixi fallback ADR is historical and cannot override this contract.
- Renderer performance still requires route-level code splitting, pooled VFX
  and representative device benchmarks before production scale.
