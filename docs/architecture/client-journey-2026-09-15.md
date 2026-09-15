# Client journey and Warlock combat — 2026-09-15

## Direction and evidence

User direction: distant Warlock camera, readable large spells, meaningful knockback/lava, animated original 3D chibis closer to Swap Heroes, a separate game client with AFK-style progression interfaces. Portal and client share hosting but not their UI shell; the portal opens `/game` in another tab. Preserve the current owner-private audience.

Read inventory: all 19 numbered canonical specifications plus MANIFEST in the preceding context review; original 46-point brainstorming; September 5 3D review; implementation status, decision log, architecture audits, ADRs 004–010; current source, dirty input refactor and local history. Previous-session retrieval was partial/truncated: it is not evidence of complete conversation recovery. The latest local canonical additions were compared with their original baseline. The four reference games are user-stated direction, not copied assets or a claim of measured visual equivalence.

Confirmed: local source was cc6fe01 (3D version24); GitHub main was 64e837f (older Pixi history). Histories have independent roots. The latest source retains all GitHub paths except the intentionally superseded PixiArena renderer. No blind reset to GitHub is appropriate.

## Implemented experience

- Portal Play opens `/game` in a separate tab; `/login` uses its own game-client shell.
- Production login/logout use hosting-owned top-level SIWC routes. The private Site still requires platform authentication before even the portal; a public anonymous portal requires an explicit audience change.
- Monotonic four-step onboarding lives in D1, scoped by stable authenticated account ID. Guide highlights a relevant client navigation target and explains controls and progress.
- Hero selection retains server persistence and now reports save failure. Profile reads actual level/XP and recent verified results.
- Spellbook shows all sixteen skill descriptions/icons and actual base combat values, plus dash/potion/lava values.
- Talent constellation and rune workshop are constructed, level gated, editable between matches and saved server-side. The authoritative match ticket v2 signs the account level and build; game-core applies the same tuning to previews and casts. Verified bots receive the same build budget.
- Collection has summon, inventory and rules views. No active purchases, fabricated wallet, or fake summoning outcomes. Expanded champions, banners and economic commissioning remain unfinished.
- Practice deliberately provides the complete baseline starter kit and no XP. Verified matches enforce account unlocks and apply saved builds.

## New calibration decisions (implementation choices, not recovered user decisions)

- Skill slots unlock at account levels 1 / 2 / 4 / 7 in Verified.
- Rune slots unlock at 5 / 15 / 25; three initial runes are free build options when their slots open.
- One talent choice per milestone 10 / 20 / 30, freely changeable outside a match. Attack totals at most +5% spell damage; Defense at most 8% displacement resistance; Utility at most 6% mana efficiency.
- Swift Edge: +10% projectile speed / -8% radius. Wide Current: +8% area radius / +8% mana. Heavy Push: +8% displacement / +8% mana. Wide Current's earlier unspecific cast-velocity cost is replaced by mana because its eligible instantaneous areas have no projectile speed.
- Impulse multiplier 3.4; 0.65s momentum window, reduced input acceleration and .985 per-tick drag during that window. This preserves recoverability without immediately erasing a heavy hit.
- Default zoom1.06 keeps the distant arena view. Camera does not alter range or collision.

## 3D packages

Original procedural surface authoring, not Blender/Unreal assets: continuous spline-loft robes, curved hair/horns/feathers, expressive faces, rounded armor and shields. v3 visual IDs retain the existing GLTF loader, clone/cache and eight-joint/thirteen-clip rig. Cape vertices blend between back and spine. Corrected surface winding and ellipsoid normals. Largest GLB ~556KB; explicit budget650KB. A CPU projection of actual meshes was inspected; it is not browser/WebGL or mobile-FPS evidence. These models remain a developing art direction, not final Swap Heroes-quality production art.

Held local previews drive anticipation posing; authoritative release still drives release animation. Shared mobile/desktop controls handle pointer ownership, cancellation, pinch, blur, left-click cast and right-click dash. Cosmetic pool exhaustion falls back to visible gameplay objects. Final survival outranks eliminated score leaders.

## Persistence migration

0000 and 0001 remain untouched. 0002 is generated from `db/schema.ts` using Drizzle and adds only `client_journey`. Earlier migrations predate Drizzle snapshots; metadata begins at migration2 and tracks the new table without recreating legacy tables. SQLite smoke applied all migrations and checked persistence, foreign key and tutorial range constraints.

## Remaining limits

The external secure WebSocket service is not deployed/configured. Source implementation and integration tests do not mean live account XP is currently playable. No match authority was moved into the Site Worker. Real History boss encounters, expanded champion assets, gacha economics/payments, social rooms, ranked matchmaking and device/WebGL performance signoff are still outstanding. The current changes do not complete all 19 documents.

## Verification completed

- 67 automated tests passed, including core replay, heavy displacement, final survivor placement, input cancellation, build caps, account-level spoof rejection and signed-build tamper rejection.
- Workspace typecheck passed; production Vite/Worker build passed.
- Four GLBs validated: all required clips, rig, references and textures present.
- All three SQL migrations applied to SQLite; new constraints verified. A second Drizzle generation reported no schema drift.
- No new browser/WebGL/mobile FPS certification was performed. The production build emits a Three/GLTF chunk above500KB uncompressed; lazy loading is retained, and device testing remains required.
