# ADR-008 — Original elemental 3D client direction

## Status

Accepted — 2026-09-02

## Decision

MagicMadness adopts an arena-first top-down 3D presentation: authored fantasy locations, chibi body packages, direct held-cast floor previews, radial mobile skills and compact peripheral HUD. Classic online-game portals inform density and launcher hierarchy; top-down spell brawlers inform visibility and camera readability.

All models, icons, effects, page layouts, names and fiction remain original. References are constraints, not assets to reproduce.

## Consequences

- Hero and skill release gates include complete 3D presentation packages.
- Camera/projection derive from arena data.
- Color is never the sole carrier of gameplay meaning.
- Decorative density yields to collision and telegraph clarity.

## Implemented asset baseline — 2026-09-02

The four released `visualPackageId` values now resolve to original GLB 2.0 packages rather than procedural meshes. Arena and 360° showcase share `GLTFLoader`, cache, safe skeleton cloning, PBR texture handling and the same thirteen animation clips. The old procedural body builder remains reachable only after an explicit asset-load failure.
