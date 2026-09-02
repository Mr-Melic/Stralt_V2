# World, Dungeon & Encounter Admin Designer — 2026-08-31

**Source automation:** World, Dungeon & Encounter Admin Designer (`1592c6c0-a499-11f1-a7d1-d6b4613131ce`)  
**This run:** `bc-f1a31926-16dc-4c0e-8d6e-e0d84a621683`  
**Constraint:** design only. No production code, no RAF / mapGen / turn / damage-math edits.  
**Player rule:** Stralt has **no player level cap**. Every owner control must stay valid at hypothetical levels of 1, 50, 500, 5_000, and 50_000.

Companion ledger: [`ACTION_IDS_2026-08-31.md`](./ACTION_IDS_2026-08-31.md).

---

## 1. Mandate

Owner controls for:

| Domain | Must manage |
| :--- | :--- |
| Encounters | enemy pools, formations, relative difficulty, rarity, objectives, rewards, hazards, rules |
| Dungeons | room pools, sequencing, special rooms, rest rooms, branching, bosses, modifiers, rewards |
| Boss Rush | boss pools, relative scaling, progression, reward multipliers, room sequencing |
| World events | eligibility, rarity, hazards, elites, rare spell-bearing enemies, rewards, modifiers |
| Spawn | relative enemy-level distribution, equal-level %, above-level %, elite %, variant %, encounter size, family weighting, advanced-spell %, AI-sophistication % |
| Simulation lab | hypothetical player level / progression, many generated encounters, distribution reports — **never** player state, rewards, progression, or economy |

Preferred lifecycle for every pack:

**DRAFT → SIMULATE → VALIDATE → ACTIVATE**

Admin / debug / simulation stay **dev-gated**. They must never ship as a normal-player surface. Backend writes stay `#admin`. Simulation must never call `applyRewards`, `saveBattleStats`, `upgradeSpell`, `claimAchievementReward`, `processPendingPurchases`, or any persist-lock credit.

---

## 2. What owners can already touch

`AdminDashboard.tsx` tabs today (`gameTypes.ts` 473–488, dashboard 4820–4840):

| Tab | Persists | Used by live spawn? |
| :--- | :--- | :--- |
| Enemies | backend `EnemyConfig` (`id, name, hp, ap, mp, initStat, levelMin, levelMax, regions, spriteUrl`) | **No.** `WorldExploration.tsx` never reads `enemyConfigs`. Roster is chess-piece + `pickEnemyLevelFromTiers` + a 30% family roll. |
| Regions | backend `levelMin` / `levelMax` + battle effects | Only if `player.level` is inside `[levelMin, levelMax]`. Above `levelMax` the region silently disappears (WX 3517–3524). |
| Enemy Tiers | `localStorage pbv_tier_spawn_config` then `adminSetTierSpawnConfig` | Yes — but buckets are same / ±1 / ±2 / ±3+, split evenly above/below, and `pickEnemyLevelFromTiers` hard-caps at `floor(999 / tierSize)` (`combatMath.ts` 54–58). Preview samples only `[1, 10, 25, 50, 100, 200, 500]`. Tier-size input is `max={100}`. |
| Map Modifiers | backend `triggerChance` | World portal roll only. Two seeded types (`slime_flood`, `paper_windstorm`). Not encounter-, dungeon-, or event-scoped. |
| Game config | `leaderBoostPercent`, `dokaSpawnChance`, `dokaSpawnBaseValue` | Leader boost + ground Doka. Not encounter content. |
| Bosses | **`localStorage pbv_boss_configs`** (`useAdminQueries.ts` 462–517) despite backend `BossConfig` | Absolute `baseStats` (HP 100–800). Phase multipliers are relative to the boss, not the player. |
| Boss Rush | JSON blob `localStorage bossRushConfig` + `adminSetBossRushConfig(Text)` | Enable + reward-multiplier per **hardcoded 10 rooms**. Pools, pairing, scaling, and sequencing are not editable. Runtime rooms live in `useBossRush.ts` `BOSS_RUSH_ROOMS` (23–134). |
| Names / Spells / Achievements / Shop / Ads | backend | Names decorate the roster. Spells are assigned from `buildEnemyKit(pieceType, levelZone)` — a 0 / 1 / 2+ band, not an owner probability. Challenges are `DEFAULT_CHALLENGES` in `challengeCompletion.ts` (flat Doka/XP). |

Missing tabs: Encounters, Dungeons, World Events, Spawn (beyond coarse tiers), Simulation Lab, Drafts.

There is no draft store. Save is live. There is no validate step beyond “tier percents sum to 100.”

---

## 3. Hard-cap audit (must not survive activation)

These are the live ceilings that make “no player level cap” false in content:

| Ceiling | Where | Effect at high player level |
| :--- | :--- | :--- |
| `maxTier = floor(999 / tierSize)` | `combatMath.ts` 58 | Enemy levels stop climbing near 999. A level-5000 player still fights ≤999. |
| `computeAITier` buckets end at 900 → tier 10; 30% roll is `1..10` | `combatMath.ts` 36–51 | AI sophistication hard-stops. |
| `newEnemy()` / `newRegion()` default `levelMax: 5` | `AdminDashboard.tsx` 108–118 | Owner UI teaches a cap. |
| Region match `level <= levelMax` | WX 3517–3524 | Late-game players lose region effects. |
| Map `levelZone.maxLevel = (playerTier+1)*tierSize` | WX 5057–5068 | Zone name/band is a closed interval. |
| Death Realm `maxLevel: 5` on some rebuilds | WX 13567, 13699 | Inconsistent with 9999 on the entry path (5818). |
| Dungeon depth tables clamp `Math.min(depth, 5)` | WX 6082–6083, 1201–1203; `useDungeonState.ts` 10–21; `portalRules.ts` 148–161 | Extra enemies, tier boost, and Doka multiplier freeze after floor 5. |
| Chain length `3 + floor(random*3)` → 3–5 | WX 6693, 6785 | No longer-than-5 dungeon. |
| `MAX_ENEMIES = 20` | `gameConstants.ts` 10 | Encounter size cannot grow with depth/rarity. |
| `ENEMY_KITS` only `z>=0/1/2` | `enemyAI.ts` 156–178 | “Advanced spells” stop at band 2. WX also passes `currentMap.levelZone` (an object) into a `number` parameter (WX 12186) — `Math.floor(object)` is `NaN`, so kits stay on the early branch. |
| `ENEMY_SUMMONER_CHANCE = 0.12 + level * 0.02` | `gameConstants.ts` 298–299; WX 12198–12200 | Linear, unclamped. By level ~44 every enemy is a summoner — a soft ceiling that collapses variety. |
| Boss `baseStats.hp` 100–800 | `admin.mo` `defaultBossConfigs` | A level-200 player already outscales most bosses. |
| Boss Rush 10 rooms, flat 500–5000 Doka | `useBossRush.ts` 23–134 | Finite mode; rewards do not track player level. |
| Challenges: flat 50–500 Doka / 400–1000 XP | `challengeCompletion.ts` 38–103 | Objectives become pocket change. |
| Tier preview max sample 500; tierSize `max={100}` | `AdminDashboard.tsx` 3407, 3488–3489 | Owner cannot even inspect extreme levels. |
| `mapGen.simulate.ts` | solvability seeds only | Not an encounter laboratory. |

**Rule for every new field:** store *relative* quantities (offset from player level, weight, probability, curve). Never store a required `levelMax` that stops eligibility. Optional “preferred band” is allowed only if overflow still resolves (fade weight, not reject).

---

## 4. Content model (indefinite progression)

One backend-authoritative pack. `localStorage` is a cache of the **active** pack only.

```
WorldContentPack
  id, version, status: draft | simulating | validated | active | archived
  notes
  spawnPolicy
  encounterCatalog[]      # templates, not one-off maps
  dungeonPolicy
  bossRushPolicy
  worldEventCatalog[]
  simulationDefaults
```

All IDs are explicit metadata. No name-based heuristics (AGENTS.md). Family, formation, objective, hazard, and rule are catalogs keyed by id.

### 4.1 Relative level (replace tier-999)

```
relativeLevelPolicy
  equalLevelProbability          # P(enemyLevel == playerLevel)
  aboveLevelProbability          # P(enemyLevel > playerLevel)
  belowLevelProbability          # remainder or explicit
  aboveOffsetWeights[]           # +1, +2, +3, … decaying tail — NO last bucket that clips
  belowOffsetWeights[]
  openTail                       # { kind: "geometric", ratio } so +N never ends
```

`pickEnemyLevelFromTiers` today cannot express “40% equal, 25% above, 35% below.” Adjacent percent is split 50/50 (`combatMath.ts` 82–85). That is why the owner console must show **below / equal / above** as first-class knobs, then a tail — not four closed tiers.

Dungeon “tier boost” today is `+ boost * tierSize` clamped at depth 5. Replace with `relativeOffset += dungeonOffsetCurve(depth)` where the curve is unbounded (log or diminishing, never `min(depth, 5)`).

### 4.2 Encounters

```
EncounterTemplate
  id
  rarity                         # weight, not a max-level gate
  relativeDifficulty             # multiplier on the relative-level draw
  enemyPoolIds[]                 # references EnemyArchetype / family, not dead EnemyConfig stats
  formationId                    # explicit tile offsets + roles
  objectiveIds[]                 # catalog; live challenges stay predicates, rewards use curves
  rewardCurve                    # doka/xp as f(playerLevel, relativeDifficulty, rarity)
  hazardIds[]
  ruleIds[]                      # e.g. no-flee, timer, leader-must-die-last — metadata
  encounterSize                  # { min, max } or { curve vs rarity }
```

Live gap: WX `generateEnemies` (6073–6330) rolls `1..8` plus a depth table, scatters by quadrant (Chebyshev ≥ 4), then 30% equal-weight family. There is no formation, no rarity, no objective bind, no per-encounter reward, no rule pack.

**EnemyConfig decision:** do not keep a second unused CRUD. Either (a) retire admin EnemyConfig as a spawn source and treat it as art/name only, or (b) replace it with `EnemyArchetype { id, familyId, pieceWeights, statMults, spellPoolIds, eliteCapable }` that `generateEnemies` actually samples. Absolute `hp/ap/mp` on the admin template fights `progression.ts` level formulas — reject absolute combat stats on the owner form.

### 4.3 Formations

New catalog. Each formation is `{ id, cells: [{ dx, dy, role, familyHint? }] }`. Roles: frontline, backline, leader, skirmish. Placement walks the catalog against walkable tiles; if a cell is blocked, drop that slot rather than inventing a name heuristic. Do not grow `WorldExploration.tsx` for this — extract `engine/encounterFormations.ts`.

### 4.4 Objectives & rewards

Promote `DEFAULT_CHALLENGES` into an owner catalog:

- condition stays an explicit enum (`challengeCompletion.ts` 11–20)
- `rewards` become `RewardCurve` (`base * playerLevelFactor * difficultyFactor`), never a lone `doka: 50`
- bind optional `encounterIds` / `eventIds` so a legendary objective is not offered on a 1-rat pack
- persist still goes through the single `applyRewards` funnel (`rewardResolver.ts`) — owner edits change the **advertised** curve, not a second writer

### 4.5 Dungeons

Today a dungeon is “same `generateRandomMap` + more rats + +N tiers,” length 3–5, Doka `1.5 / 2 / 2.5 / 3 / 4` then freeze. Rest is a **world** portal (10%), not a dungeon room. Bosses are a **separate** 15% world portal. No branching.

```
DungeonPolicy
  entryChance                    # replace magic 0.2 (WX 5236)
  lengthPolicy                   # { min, max } OR open-ended continue-or-exit weights — no hidden 5
  roomPoolIds[]                  # archetype ids the generator may draw (do not fork mapGen in this program)
  sequence                       # linear list | weighted bag | graph
  specialRoomWeights             # elite, hazard-dense, puzzle, shop — ids only
  restRoomPolicy                 # { firstEligibleDepth, weightPerDepth, healRule }
  branchPolicy                   # optional graph; each edge has weight + requiredClear
  bossPolicy                     # { fromDepth, poolIds, relativeScale }
  modifierPolicy                 # dungeon-scoped, not only world portal roll
  rewardCurve                    # replace triplicated DUNGEON_DOKA_MULTIPLIERS
  completionBonusCurve           # replace maxDepth * 50 (portalRules.ts 195–197)
```

Unify the three multiplier tables (`WorldExploration.tsx` 1201–1203, `useDungeonState.ts` 10–21, `portalRules.ts` 148–161) into **one** curve module before adding owner knobs. Snapshot-before-`cleanupMap` (`snapshotDungeonChain`) stays mandatory.

Do not implement new cellular-automata rules here. Owner picks **which room ids / archetypes / rest / boss policies** the existing generator may use.

### 4.6 Boss Rush

Replace the 10-row checkbox list with:

```
BossRushPolicy
  entryChance                    # replace magic 0.08 (WX 5323)
  bossPoolIds[]                  # from backend BossConfig ids, not localStorage-only
  pairingPolicy                  # fixed pairs | sampled pairs | solo
  roomSequence[]                 # ordered draftable rooms { bossIds[], mechanicId, rewardMultiplier }
  relativeScale                  # boss combat stats = f(playerLevel) * roomIndexCurve
  progression                    # roomCount as a policy, or continue-weight — not a hardcoded 10
  rewardMultiplierCurve          # owner-visible; client still pays through applyRewards / persist lock
```

`completeBossRushRoom` remains a security-sensitive client write (quality-audit finding 5). Owner multipliers must not add a second wallet path. Scale **relative to the player**; do not raise the flat 5000 Doka jackpot room as if it were late-game.

Boss CRUD must leave `pbv_boss_configs` and use backend `adminSetBossConfig` / `getAllBossConfigs`. LocalStorage is cache only.

### 4.7 World events

There is no event catalog. Adjacent live scraps:

- map-modifier two-roll (`MAP_MODIFIER_GLOBAL_TRIGGER_CHANCE = 20`, second 50)
- jackpot heal banner (WX 930–931, 17928+)
- betrayal / double-betrayal (`ENEMY_AI_TIER_GATES.betrayal = 10` — only AI tier 10)
- leader designation
- 30% family / void_mirror reflect
- summoner roll

```
WorldEvent
  id
  eligibility                    # runMode, regionIds, relativeLevelBand (open-ended), not levelMax
  rarity                         # weight per map / per encounter
  hazardIds[]
  elitePolicy                    # { probability, familyWeights, relativeDifficulty }
  rareSpellBearerPolicy          # { probability, spellPoolIds, minRarity }
  rewardCurve
  modifierIds[]
```

Elites are **not** leaders. Leaders already exist (`isLeader` + `leaderBoostPercent`). Elite = rarity flag + stat/spell/AI bump from metadata.

Rare spell-bearers must use `usableByEnemy` + an explicit `advancedSpellPoolIds` list. Do not infer “advanced” from the spell name. Do not keep the NaN `levelZone` object pass.

### 4.8 Spawn owner surface (safe inspect + configure)

Single Spawn tab, all probabilities 0–1 (or 0–100 with live normalize). Required knobs:

| Knob | Live today | Owner control |
| :--- | :--- | :--- |
| Relative level distribution | four tier buckets + 999 cap | histogram + open tail; **no max level field** |
| Equal-level probability | buried inside `sameTierPercent` | first-class |
| Above-level probability | half of ± buckets | first-class (below is the rest or explicit) |
| Elite probability | none | first-class |
| Variant probability | hardcoded `0.3` family (WX 6236, 6315) | first-class, not equal-weight |
| Encounter size | `1 + rand*8` + depth table | `{ min, max, depthCurve }` |
| Family weighting | 7 families, equal `1/7` | weight per family id |
| Advanced spell probability | kit band 0/1/2 + broken zone arg; plus unclamped summoner linear | probability + pool ids; summoner chance **asymptotic** |
| AI sophistication probability | `computeAITier` 10-bucket + 30% uniform 1–10 | probability of “high” behaviors; gates stay constants, weights become policy |

`levelVarianceChance` is already on the engine type (`combatMath.ts` 11, 60–69) but **not** on the frontend `TierSpawnConfig` or the Tiers tab. Surface it or fold it into the relative-offset tail.

The Tiers tab `max={100}` on tier size and the 500-level preview must go. Preview input: arbitrary player level (text/bigint-safe), plus presets 1 / 10 / 100 / 1_000 / 10_000 / 50_000.

---

## 5. Simulation Laboratory (non-persistent)

A **dev-only** pane. It is not a player feature and not a persist path.

### Inputs

- Hypothetical player level (unbounded integer; must accept 50_000)
- Hypothetical equipped-spell count / challenge opt-in (cloned snapshot, never the live character)
- Pack under test: **current draft**, not necessarily active
- Encounter count N (e.g. 200 / 1_000 / 10_000)
- Seed
- Mode filters: overworld / dungeon depth D / boss rush room R / event-forced

### Reports

| Report | Meaning |
| :--- | :--- |
| Relative-level distribution | histogram of `enemyLevel - playerLevel` |
| Below / equal / above frequency | three percentages + Wilson interval |
| Families | counts + weights vs policy |
| Variants | variant flag rate |
| Elites | elite flag rate |
| AI | sophistication-band histogram (not capped at 10 as a *player* level) |
| Rare spells | advanced-pool hit rate |
| Discovery opportunities | unique family / spell / event / formation ids seen / N |
| Formations | formation-id histogram |
| Estimated difficulty | `mean(relativeDifficulty * size * eliteFactor)` — **display only**, not a new damage formula |

### Isolation (hard)

Simulation **must never**:

- read or write the live character slot
- call `applyRewards` / `saveBattleStats` / `upgradeSpell` / `claimAchievementReward` / `processPendingPurchases`
- enqueue `createProgressPersist`
- mutate Doka, XP, killCount, spell levels, dungeonRecords, boss-rush state
- write `localStorage` keys that GameFlow hydrates as player cache
- spawn a real map the player can walk

Implementation shape (for a later implementer, not this run): `engine/encounterSim.ts` using the **same** pure pickers as live spawn (`pickRelativeEnemyLevel`, `sampleFamily`, …). `mapGen.simulate.ts` stays solvability-only. Do not route the lab through `WorldExploration` generate callbacks.

Extreme levels: if a picker overflows JS `Number` safety, use integer offsets + bigint level display. **Do not clamp the input to 999 to “keep it safe.”**

---

## 6. Lifecycle: DRAFT → SIMULATE → VALIDATE → ACTIVATE

```
┌─────────┐   edit    ┌───────────┐  N sims   ┌───────────┐  owner   ┌─────────┐
│  DRAFT  │──────────▶│ SIMULATE  │──────────▶│ VALIDATE  │────────▶│ ACTIVE  │
└─────────┘           └───────────┘           └───────────┘         └─────────┘
     ▲                      │ fail gates            │ fail
     └──────────────────────┴───────────────────────┘
```

| Stage | Rules |
| :--- | :--- |
| DRAFT | Backend (or admin-only store) copy. Live world keeps the previous **active** pack. Dirty admin forms today write immediately — that stops. |
| SIMULATE | Lab runs against the draft. Results stored on the draft, not the player. |
| VALIDATE | Mechanical gates, no gameplay math change. See below. |
| ACTIVATE | Single admin call swaps the active pointer. Frontend hydrates active pack; `localStorage` cache only. |

### Validate gates (must all pass)

1. No field named or used as a hard maximum player/enemy level.
2. `equal + above + below` (or equivalent) normalize to 1.0; no silent drop.
3. Open tail defined (geometric ratio in (0,1) or equivalent).
4. Every pool id exists; every formation cell has a role; every objective condition is in the enum.
5. Reward curves are relative (reference `playerLevel` or `relativeDifficulty`) — reject constant-only curves for dungeon/boss/event catalogs.
6. Dungeon depth curve has no `min(depth, 5)` equivalent.
7. Simulation report attached with N ≥ owner minimum (default 1_000) at player levels {1, 100, 1_000, 10_000}.
8. Sim log contains zero persist / actor update calls.
9. Pack does not introduce a second reward writer.
10. Admin-only: activate requires `#admin`. Players never see draft UI.

---

## 7. Owner console IA (dev-gated)

Add / reshape tabs. Carved-stone, dark slate, crimson accent — same tokens as `AdminDashboard` `C` (`#13161f`, `#d8463f`, `#f0c44a`). Do not ship Tailwind-grey Boss Rush rows (`AdminDashboard.tsx` 6310–6412) as the new pattern.

```
CONTENT
  Encounters     pools · formations · rarity · objectives · rewards · hazards · rules
  Dungeons       rooms · sequence · special · rest · branch · bosses · modifiers · rewards
  Boss Rush      pool · scale · progression · multipliers · sequence
  World Events   eligibility · rarity · hazards · elites · rare-spells · rewards · modifiers
  Spawn          relative level · equal · above · elite · variant · size · family · spells · AI
  Simulation     hypothetical level · N · seed · reports
LIFECYCLE
  Drafts         diff vs active · simulate · validate · activate
LEGACY (keep, then migrate)
  Enemies / Regions / Tiers / Modifiers / Bosses / Names
```

Tiers tab becomes a **read-only projection** of Spawn once the relative policy exists, or is deleted after migrate.

Every control that can change economy or difficulty shows:

- draft vs active badge
- last sim snapshot (below/equal/above at level 1 / 1_000 / 10_000)
- Activate disabled until VALIDATE is green

---

## 8. What this program must not do

- Do not implement the pack, the lab, or the tabs in this run.
- Do not edit `WorldExploration.tsx` to add another 400-line generate branch (AQA-2026-08-30-007).
- Do not edit RAF, `mapGen.ts` aesthetics, turn order, or `combatMath` damage (`calcScaledDamage`).
- Do not add `levelMax` “for safety.”
- Do not let simulation touch the persist lock.
- Do not open a second reward funnel.

Extract path for implementers: `engine/spawnPolicy.ts`, `engine/encounterFormations.ts`, `engine/encounterSim.ts`, `engine/dungeonPolicy.ts`. WX call sites become one-line policy reads.

---

## 9. ACTION_ID index

| ID | Title | Priority |
| :--- | :--- | :--- |
| WDEAD-2026-08-31-001 | Remove hard level ceilings from spawn / region / dungeon / AI | P0 |
| WDEAD-2026-08-31-002 | Relative spawn owner surface (equal / above / tail, no max) | P0 |
| WDEAD-2026-08-31-003 | Non-persistent Simulation Laboratory | P0 |
| WDEAD-2026-08-31-004 | DRAFT → SIMULATE → VALIDATE → ACTIVATE | P0 |
| WDEAD-2026-08-31-005 | Encounter catalog (pools, formations, rarity, objectives, rewards, hazards, rules) | P1 |
| WDEAD-2026-08-31-006 | Replace dead EnemyConfig with archetypes the roster actually samples | P1 |
| WDEAD-2026-08-31-007 | Dungeon policy (rooms, sequence, rest, branch, bosses, unbounded curves) | P1 |
| WDEAD-2026-08-31-008 | Boss Rush pool / relative scale / sequencing | P1 |
| WDEAD-2026-08-31-009 | World-event catalog (elites, rare-spell-bearers, eligibility) | P1 |
| WDEAD-2026-08-31-010 | Relative reward curves (challenges, dungeon, rush, events) | P1 |
| WDEAD-2026-08-31-011 | Family / variant / elite / size / AI / advanced-spell knobs | P1 |
| WDEAD-2026-08-31-012 | Asymptotic summoner + explicit advanced-spell pool (fix NaN zone) | P1 |
| WDEAD-2026-08-31-013 | Unify dungeon multiplier tables before owner edits | P2 |
| WDEAD-2026-08-31-014 | Backend-authoritative boss configs; drop `pbv_boss_configs` writer | P2 |
| WDEAD-2026-08-31-015 | Keep admin + lab dev-gated; activate is `#admin` only | P2 |

Full records: [`ACTION_IDS_2026-08-31.md`](./ACTION_IDS_2026-08-31.md).
