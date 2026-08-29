# Engineering Workflows, Testing, Automation & Verification

> **MAGICMADNESS ARENA — CANONICAL EXECUTION SPEC**
>
> Status: implementation baseline. Product/game-design requirements come from the canonical D0–D11 pack.
> Technical choices may evolve only through evidence-backed ADRs and must preserve the product contract.

## Objective

Develop the entire project directly, without throwaway architecture, while exposing playable checkpoints early.

## Workstream

```text
CANONICAL DOCS
 ↓
SCHEMAS / CONTRACTS
 ↓
D0–D3 PLAYABLE COMBAT
 ↓
BOTS
 ↓
D4 MATCH RULES
 ↓
D6/D7 ARENA + EVENT
 ↓
HISTORY/BOSS
 ↓
FRIEND MULTIPLAYER
 ↓
D8–D10 META/CONTENT
 ↓
D11 ECONOMY CALIBRATION
 ↓
BETA
```

This is dependency order, not “microdevelopment.” The repository contains the complete intended architecture from the first implementation pass.

## First playable acceptance

Required:
- responsive landscape shell;
- one authored arena;
- Fire/Water/Earth/Air starter heroes;
- movement;
- mobile controls;
- desktop controls;
- hold-preview-release;
- HP/mana/potions;
- Tactical Dash;
- damage;
- knockback;
- wall/object collision;
- edge hazard;
- one standard-round respawn;
- final-round rule covered in domain tests;
- bots;
- one environmental event;
- score/result screen;
- camera zoom;
- developer diagnostics.

## Test pyramid

### Unit
Test:
- formulas;
- cast state machine;
- cooldowns;
- score;
- respawn;
- attribution;
- talents/rune caps;
- content schemas.

### Deterministic simulation
Headless:
- seeded RNG;
- fixed ticks;
- collision cases;
- combo cases;
- bot rounds;
- no NaN/out-of-bounds state;
- repeatable result for same seed/input stream.

### Property/invariant tests
Examples:
- cooldown cannot cast early;
- respawn count cannot be negative;
- HP cap obeyed unless explicit effect;
- Match Score never derives directly from damage;
- mode caps always bound persistent modifications;
- economy ledger balances.

### Integration
- client ↔ local core;
- client ↔ server;
- server ↔ API;
- result ↔ progression;
- auth ↔ account mapping.

### E2E
Playwright:
- homepage;
- app landing;
- open bot match;
- perform mobile skill gesture;
- finish round;
- show result;
- inspect hero/talent/rune pages.

Viewports:
- desktop 1920×1080;
- representative 16:9 landscape phone;
- wider/taller landscape phone.

## Mobile manual test

Check:
- thumb reach;
- safe areas;
- no accidental OS gesture conflict;
- pinch never casts;
- hold-preview cancel;
- cooldown visibility;
- far-zoom readability;
- FPS;
- memory/heat;
- audio/visual telegraphs.

## Performance telemetry

Record:
- render frame time;
- physics tick time;
- bodies/projectiles;
- VFX count;
- heap/memory;
- network snapshot size;
- reconciliation distance;
- local input feedback time.

## Bot test archetypes

- basic mover/caster;
- edge recovery;
- telegraph dodger;
- aggressive finisher;
- map interaction;
- utility support;
- boss-mechanic test agent.

Bot difficulty changes decision quality, not impossible hidden stats.

## Balance workflow

```text
CHANGE VERSIONED BALANCE DATA
 ↓
SCHEMA VALIDATION
 ↓
DETERMINISTIC SCENARIOS
 ↓
BOT BATCH
 ↓
COMPARE METRICS
 ↓
MOBILE/MANUAL PLAY
 ↓
RECORD BALANCE VERSION
 ↓
MERGE
```

## Pull request evidence

Every substantial PR reports:
1. canonical requirement IDs;
2. files changed;
3. behavior;
4. tests;
5. screenshots/video for UI;
6. performance impact;
7. balance/content versions;
8. known gaps.

## GitHub Actions

Create:
- `ci.yml`;
- `content-validation.yml`;
- `simulation-regression.yml`;
- `web-e2e.yml`;
- `security.yml`.

PR gate:
- install;
- typecheck;
- lint;
- unit;
- simulations;
- build all apps;
- smoke E2E;
- schema/reference validation.

## Environments

- Preview
- Beta
- Production

Every deployment records:
- git SHA;
- balance version;
- content version;
- protocol version.

## Failure policy

Never silently tolerate:
- unknown interaction;
- invalid balance field;
- protocol mismatch;
- missing spawn;
- unresolved content reference;
- impossible score state.

Development should fail with an actionable message.

## Useful automations

- validate references;
- generate glossary tables;
- generate hero datasheets;
- run seeded bot tournament;
- detect balance regression;
- responsive screenshot checks;
- accessibility lint;
- bundle-size/performance regression checks;
- implementation-status report from tests/requirements.

## Verification loop

```text
BUILDER
 ↓
TESTS
 ↓
REVIEW
 ↓
SIMULATION EVIDENCE
 ↓
MOBILE PLAYTEST
 ↓
VERIFICATION
 ↓
MERGE
```

Repository and test evidence override model self-report.
