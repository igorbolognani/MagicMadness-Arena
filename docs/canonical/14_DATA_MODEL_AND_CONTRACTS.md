# Data Model & Domain Contracts

> **MAGICMADNESS ARENA — CANONICAL EXECUTION SPEC**
>
> Status: implementation baseline. Product/game-design requirements come from the canonical D0–D11 pack.
> Technical choices may evolve only through evidence-backed ADRs and must preserve the product contract.

## Principle

All mechanics, balance, content, progression and economy are:
- schema validated;
- versioned;
- data-driven;
- inspectable;
- testable.

Separate **canonical mechanics** from **tuning values**.

## Account

```text
Account
- id
- authSubject
- displayName
- accountLevel: 1..30
- xp
- selectedProfileHeroId
- titleId?
- rankState
- createdAt
- updatedAt
```

Do not make email the internal account key.

## Hero definition

```text
HeroDefinition
- id
- version
- name
- element
- primaryClass
- difficulty
- baseAttributes
- passiveId
- skillIds[4]
- tacticalCompatibility
- resourceModel
- matchUpgradeGraphId
- visualPackageId
- contentTags
```

## Owned/player hero

```text
PlayerHero
- accountId
- heroId
- unlockedAt
- masteryXP
- masteryLevel
- persistentProgressionState
- cosmeticSelection
```

## Presentation bridge

The simulation snapshot is authoritative for gameplay coordinates and state.
The 3D client derives presentation data without changing those values:

```text
GameState.position.x/y         → Three scene x/z
PlayerState.vertical.height    → Three scene y
grounded shadow/ring           → Three floor plane
SkillPreview.path              → 3D telegraph segments
HeroDefinition.visualPackageId → cached GLTF visual package (procedural only after explicit load failure)
```

Visual packages may change meshes, animation clips, materials and VFX, but they
cannot own collision, hit detection, damage, cooldown, score or random state.

## Skill

```text
SkillDefinition
- id/version
- geometry
- projectile?
- impact
- casting
- area?
- statuses[]
- tags[]
- interactionHooks[]
- preview
- vfx
- sfx
- upgradeBranches[]
```

## Skill geometry

Union families:
- line;
- cone;
- circle;
- ring;
- arc;
- wall;
- beam;
- fan;
- trail;
- orbit;
- chain;
- pullCircle;
- dashLine;
- hook;
- bounce.

Each shape validates its own fields.

## Status

```text
StatusDefinition
- id/version
- tags[]
- duration
- stackingRule
- maxStacks
- statModifiers
- interactionModifiers
- vfx/sfx
- dispelRules
```

## Interaction rule

```text
InteractionRule
- id/version
- priority
- sourceTags[]
- targetTags[]
- conditions[]
- resolution[]
- attributionPolicy
- previewPolicy
- presentationPolicy
```

## Talent

```text
TalentNode
- id/version
- branch: ATTACK | DEFENSE | UTILITY
- requiredAccountLevel
- prerequisites[]
- effects[]
- glossaryRefs[]
- powerBudget
- capsByMode
```

## Rune

```text
RuneDefinition
- id/version
- family
- compatibleTags[]
- positiveEffects[]
- tradeoffs[]
- tier
- stackingGroup
- powerBudget
- capsByMode
```

## Arena

```text
ArenaDefinition
- id/version
- theme
- bounds
- spawnAnchors[]
- houseAnchors[]
- obstacleSlots[]
- hazardBoundary
- eventSlots[]
- bossSlots[]
- cameraBounds
- supportedModes[]
- variationPackages[]
- fairnessMetrics
```

## Environmental event

```text
EnvironmentalEvent
- id/version
- allowedArenas[]
- allowedModes[]
- selectionWeight
- schedule
- telegraph
- warningLead
- affectedGeometry
- damage
- impulse/control
- duration
- escalation
- interactionHooks[]
- presentation
```

## Boss

```text
BossDefinition
- id/version
- element/theme
- baseStats
- phaseRules[]
- activeSkills[<=5]
- passiveRules[]
- summonPackages[]
- arenaHooks[]
- rewardTableId
```

## Match

```text
Match
- id
- mode
- rulesetVersion
- balanceVersion
- contentVersions
- arenaVersion
- rngSeed
- accountBand
- participants[]
- startedAt
- endedAt
- result
```

## Participant snapshot

```text
MatchParticipant
- accountId
- heroId
- teamId?
- persistentBuildSnapshot
- matchUpgradeChoices[]
- matchLevel
- respawnsRemaining
- matchScore
- teamScore?
- performance
```

Persist the exact build/rules that entered the match.

## Append-only match event

```text
MatchEvent
- matchId
- tick
- sequence
- type
- actorId?
- targetId?
- sourceDefinitionId?
- position?
- vector?
- value?
- tags[]
- causalEventIds[]
```

Minimum event types:
- INPUT_ACCEPTED;
- CAST_START;
- CAST_RELEASE;
- PROJECTILE_SPAWN;
- COLLISION;
- INTERACTION;
- DAMAGE;
- STATUS_APPLY;
- IMPULSE;
- HAZARD_ENTER;
- KO;
- DEATH;
- RESPAWN;
- ASSIST;
- ROUND_END;
- LEVEL_UP;
- UPGRADE_CHOICE;
- MATCH_END.

## Score model

Keep separate persisted fields:
- matchScore;
- teamScore;
- performance.

Damage can be stored as analytics/performance but never implicitly converted to match score.

## Economy

Core entities:
- Wallet;
- CurrencyDefinition;
- TransactionLedger;
- BannerDefinition;
- PullResult;
- PityState;
- DuplicateConversion;
- RewardTable;
- ProgressionGrant.

Every wallet change is ledgered.

## Gacha integrity

Persist:
- banner version;
- odds version;
- pity before;
- outcome;
- pity after;
- duplicate conversion;
- transaction link.

## Glossary

```text
GlossaryTerm
- id
- term
- shortDefinition
- fullDefinition
- formulas/limits
- relatedTags[]
```

The same glossary powers hero, talent, rune and mechanic tooltips.

## Content validation

Reject content with:
- missing version;
- unresolved reference;
- unsupported geometry;
- circular upgrade graph;
- unknown interaction tag;
- invalid cap;
- invalid stacking group;
- invalid spawn/arena reference.

## Balance versioning

Example separation:

```text
CANONICAL
Dash exists as starter Tactical.

TUNING
dash.distance = X
dash.cooldown = Y
```

Tuning can change without rewriting the mechanic.

## Historical reconstruction

A completed match must remain explainable after later balance patches through immutable content/balance version references.

## Privacy

Store minimal identity data required for account operation.

Sign in with ChatGPT does not imply storing ChatGPT conversations, memory or unrelated account data.

## Deployed account contract — 2026-09-02

`accounts(account_id, display_name, email, level, experience, selected_hero_id, created_at, updated_at)` is the first D1 table. `GET /api/account` idempotently creates/refreshes identity metadata and returns the account; `PATCH /api/account/hero` accepts only the four released starter IDs. The header-derived authenticated user ID is the authorization boundary. Match result persistence requires a later receipt table and server-signed idempotency key.

`MatchResultReceipt` v1 now closes that later dependency. It contains receipt/match/account identity, authority/mode, placement, separate scores, authorized rewards, balance/game-core versions, timestamps, nonce and signature. `POST /api/matches/results` consumes it once into `consumed_match_receipts`, `match_history`, `progression_events` and the account update. Browser claims without a valid server signature fail closed.
