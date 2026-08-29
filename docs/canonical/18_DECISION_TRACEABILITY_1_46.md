# MagicMadness Arena — Decision Traceability 1–46

> This file maps Igor's approved 46-point decision set to the canonical implementation pack.
> It is a traceability/audit index, not a new design layer.

| # | Frozen decision | Canonical destination |
|---:|---|---|
| 1 | Expanded product: public/home hero, mechanics media, authenticated routes, mobile-first landscape, History progression, bosses, persistent progression layers | Executive, D3, Technical Architecture, UI/UX |
| 2 | PvP identity remains arena knockout/displacement; PvE uses difficult bosses/map mechanics/mobs | Executive, D0, D3, D4 |
| 3 | Fire/Water/Earth/Air are starters and first 1–4 progression content; free-friendly | D3 |
| 4 | Element/class skill quality, mechanics, graphics and balance are core fun | D2, D3, UI/UX |
| 5 | Elemental physics, character identity and professional low-latency mobile controls | D1, D2, Technical, UI/UX |
| 6 | Hero kit approved and represented as mobile controls | D2, UI/UX |
| 7 | Tactical/RMB starts as Dash; other Tactical actions unlock with level/progression | D0, D9 |
| 8 | Desktop controls follow WASD + skill/mouse/potion layout | D0, Technical |
| 9 | Hold-to-preview must visualize trajectories and map interactions | D0, D1, D2 |
| 10 | Skill geometry library expanded and element/animation-aware | D2 |
| 11 | Skill parameters must be explicit/data-driven for balancing | Executive, D0–D2, Data Model |
| 12 | Horizontal and vertical-in-effect physics both developed strongly | D1 |
| 13 | Rich interaction matrices | D1 |
| 14 | Emergent combos are a major quality investment | D1 |
| 15 | Main attributes remain limited and role-relevant | Executive, D9 |
| 16 | Subattributes are bounded, mechanic-relevant and preserve dodge readability | Executive, D10 |
| 17 | Talent trees Attack/Defense/Utility with meaningful 10/20/30 identity and inspectable glossary terms | D9 |
| 18 | Account/content bands 1–10, 10–20, 20–30; matchmaking respects bands | D5, D9 |
| 19 | In-match hero progression 1–15 remains | D4 |
| 20 | Skill upgrade choices at 5/10/15 alter behavior; subtle hero evolution | D2, D4 |
| 21 | Solo/Duo/Trio/Squad retained; match personality roulette can apply across modes | D5, D7 |
| 22 | House/map placement must preserve center/edge fairness | D6 |
| 23 | Houses have diverse match-specific function selected from tested pool | D6 |
| 24 | Normal and Ranked share tested map/personality/house grammar; History/boss can specialize | D6, D7 |
| 25 | Arenas are larger/spacious/beautiful/readable/optimized | D6, UI/UX |
| 26 | Environmental zones/timers/areas/damage evolve with round time and have clear reaction windows | D7 |
| 27 | Random event selection but predictable execution with warnings/effects | D7 |
| 28 | Normal and Ranked both use the system; serious competition may curate modifiers | D5, D7 |
| 29 | Finite rounds; one respawn per normal round; final has three respawn entitlements then permanent elimination; last survivor wins | D4 |
| 30 | HP=0 death plus knockback/status/element interactions; arena knockout soul preserved | D0, D1, D4 |
| 31 | Match/team/individual score separated; no raw damage points; deterministic kill attribution; multi-kill announcements | D4 |
| 32 | Match progression retains 15-level/final-round logic | D4 |
| 33 | Economy/gacha combines best fair practices but progression/story must remain strong and skill-based | D11 |
| 34 | Gacha creates discovery/collection/identity/build diversity, not raw power | D11 |
| 35 | Starter element choice; later gacha can target element/route with generous probability increase | D11 |
| 36 | Avoid whales; hero duplicates convert to useful currencies, never stats | D11 |
| 37 | Pity/economy values finalized only with global economy telemetry | D11 |
| 38 | Runes personalize skill effects with small noticeable gaps, no whale power | D10 |
| 39 | Rune tiers may use small magnitudes such as 5/10/20 as tuning notion, approximately equal power budgets, sidegrades | D10 |
| 40 | Talents macro, runes micro; effects noticeable but bounded | D9, D10 |
| 41 | Account cap 30; post-30 progression emphasizes mastery/rank/collections/titles/cosmetics | D9 |
| 42 | Account personalization explored but not saturated with excessive choices | D9, UI/UX |
| 43 | Expanded global vision must be fully documented and visualizable | Executive + all D docs |
| 44 | Dependencies, values, behavior and balance documented; diagrams/maps retained | Executive, Technical, Data, Workflow |
| 45 | All D phases developed; global economy last; playable against bots early, then friends via invite | Workflow, Bootstrap |
| 46 | 46-point brainstorming considered closed; proceed to canonical definition/architecture/implementation | Entire pack |

## Canonical audit rule

When implementation behavior conflicts with this index:
1. open the referenced canonical phase document;
2. treat the phase document plus Executive Digest as product truth;
3. if implementation differs, fix implementation;
4. only create an ADR for **technical** deviations;
5. product changes require explicit new user decision.

## Attachment rule

This traceability file is valuable but optional if the attachment UI is capped below the full set.
Never omit the Executive Digest, D0–D11, Technical Architecture, Data Model, Workflow, UI/UX and Bootstrap Prompt in favor of this index.
