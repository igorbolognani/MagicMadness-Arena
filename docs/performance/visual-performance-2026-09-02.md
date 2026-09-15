# Visual performance evidence — 2026-09-02

## Continuation instrumentation

The internal Visual Lab now reports approximate FPS/frame time, draw calls, triangles, geometries, textures, active objects and particles directly from the shared Three renderer. It also exposes active/idle/created/rejected/capacity counters for projectiles, impacts, particles, rings, trails, fields, walls and previews. High/medium/low settings change cosmetic budgets while retaining preview capacity.

The authoritative server keeps its 60 Hz fixed simulation but sends full snapshots at 20 Hz. Disconnect immediately neutralizes movement so a stale command cannot continue moving a player during the reconnect window.

No new FPS or draw-call approval is asserted in this environment: no compatible installed browser was detected and the cloud browser exposed no WebGL. The lab shell was observed, but raw GPU counters remain pending a real WebGL-capable device.

## Asset budgets

| Hero | GLB | Texture | Rig / clips |
|---|---:|---:|---:|
| Ember | 83,040 B | 1,676 B | 8 joints / 13 |
| Tide | 85,072 B | 1,762 B | 8 joints / 13 |
| Bastion | 80,260 B | 1,630 B | 8 joints / 13 |
| Gale | 89,800 B | 1,629 B | 8 joints / 13 |

## Production chunks

- initial application: 317.19 kB minified / 92.82 kB gzip;
- live-game route: 69.99 kB / 23.28 kB gzip;
- lazy Three.js + GLTF loader: 605.29 kB / 155.45 kB gzip;
- CSS: 72.09 kB / 15.22 kB gzip;
- Worker bundle including receipt validation: 132.0 kB.

## Runtime limits

VFX quality preserves eight preview/telegraph slots at every tier. Cosmetic particle budgets are 720/420/220 for high/medium/low; projectile limits 64/48/32; impact limits 48/32/20; field limits 18/14/10. Projectiles, impacts (including their rings/trails/particles), fields and walls reuse keyed pools.

The supervised cloud browser exposed no WebGL context, so renderer draw calls, GLTF-on-screen FPS and GPU load time could not be measured there. The DOM/HUD and route screenshots were inspected. A safe Playwright Chromium installation was attempted, but the official download endpoint returned repeated 502/timeouts. No FPS claim is made from that blocked environment.
