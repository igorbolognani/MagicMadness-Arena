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
