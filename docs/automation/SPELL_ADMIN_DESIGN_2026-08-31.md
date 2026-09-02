# Spell, Discovery & Achievement Admin Design

**Author:** Spell, Discovery & Achievement Admin Designer  
**Automation:** `4efa22ec-a498-11f1-a7d1-d6b4613131ce`  
**Date:** 2026-08-31  
**Scope:** Owner tooling for the complete spell ecosystem. **No production code in this PR.**

**2026-09-01 re-audit:** contract below still stands. Partial safety work landed on the wrong field (`usableByPlayer=false` as retire). Evidence and ACTION_IDs: [`SPELL_ADMIN_DESIGN_2026-09-01.md`](./SPELL_ADMIN_DESIGN_2026-09-01.md), [`ACTION_IDS_SDA_2026-09-01.md`](./ACTION_IDS_SDA_2026-09-01.md).

**2026-09-02 re-audit:** contract below still stands. Bindgen summon lag closed; lifecycle is still the cast flag. Current HEAD evidence and ACTION_IDs: [`SPELL_ADMIN_DESIGN_2026-09-02.md`](./SPELL_ADMIN_DESIGN_2026-09-02.md), [`ACTION_IDS_SDA_2026-09-02.md`](./ACTION_IDS_SDA_2026-09-02.md).

This document is the design source for the ACTION_IDs in [`ACTION_IDS_2026-08-31.md`](./ACTION_IDS_2026-08-31.md). Implementers must treat it as a contract, not a license to invent name-based heuristics or to hard-delete live refs.

---

## 1. Current state (verified against `origin/main` @ `22503b5`)

The live admin surface is a **flat catalog CRUD**, not a spell-ecosystem studio. Catalog membership, combat kits, player ownership, and achievement rewards are four disconnected stores. Adding a spell in Admin immediately grants it to every player. Deleting a spell is a hard `Map.remove` with no dependency scan.

### 1.1 Three SpellConfig shapes

| Layer | Path | What it actually stores |
| :--- | :--- | :--- |
| Motoko persist | `src/backend/types/admin.mo` 79–110 | id, name, description, icon, AP/MP, damage, heal, effectType, spellType, isPhysical, range/min/max, LoS/linear/diagonal/freeCells/aoe/multiTarget/hitsAllies/hitTiles, effectCategory, usableByPlayer/Enemy, minLevel, effectParams, cooldown |
| Bindgen | `src/frontend/src/backend.ts` 115–145 | Same as Motoko. Extra frontend fields are **dropped** on `adminSetSpellConfig` (`to_candid_record_n16` at 4050–4141) |
| Engine / UI | `src/frontend/src/types/gameTypes.ts` 160–231 | Adds `targetType`, `areaShape`, `areaRadius`, buff/debuff/DoT, `isSwap`/`isMirror`/`isTimestep`/`isSacrifice`/`isBarrier`/`isTrap`/`isMark`/`isSummon`, `summonAI`, `summonLifespan`, `summonUnitDef`, `isBaseSpell` |

`spellEngine.ts` 6–13 documents that combat reads the **frontend** fields. Those fields never survive a canister round-trip. An owner who edits a spell in Admin and hits Save silently strips targeting, statuses, summons, and special mechanics.

`src/backend/lib/admin.mo` `defaultSpells()` (168–191) literals include `isSummon`, `summonAI`, `summonLifespan`, and `summonUnitDef`, which are **not** on `Types.SpellConfig`. That seed is already type-drifted against the persist record.

### 1.2 Two catalogs, neither is ownership

| Catalog | Contents | How the client uses it |
| :--- | :--- | :--- |
| Frontend static | `src/frontend/src/data/spellData.ts` — Strike + 6 starters + unique/summon ids (`spell-swap`, `summon-dire-wolf`, …) | Forced `isBaseSpell: true` and always unioned into `ownedSpells` (`WorldExploration.tsx` 2242–2272) |
| Canister | `AdminLib.defaultSpells()` — `shadow_strike`, `soul_rend`, `vampire_bite`, `reflect_barrier`, `thunder_clap`, `void_collapse` | `getSpellConfigs()` is treated as **acquired** if the id/name is not in `OLD_SPELL_NAMES_SET` |

`OLD_SPELL_NAMES_SET` (`WorldExploration.tsx` 2203–2236) filters by **name and id** (`Blood Nova`, `Fireball`, `physical_attack`, …). That is a name heuristic and is forbidden going forward.

`ownedSpells` is `baseSpells ∪ filteredBackendSpells` with no per-player observed/unlocked set. There is no `discoveredSpells`, no observation log, no acquisition route.

### 1.3 Combat kits are hardcoded, not admin data

`buildEnemyKit` (`engine/enemyAI.ts` 156–193) maps chess piece → spell **ids** by `levelZone`. That is the only live enemy pool. Admin `EnemyConfig` (`admin.mo` 15–26 and `gameTypes.ts` 108–119) has **no spell list**.

Battle start still comments “Assign 10 random spells” (`WorldExploration.tsx` 12181) but then calls `buildEnemyKit` and resolves ids against `normalizedSpellPool`. A random summoner roll then **appends** `summon-dire-wolf` or `summon-archer` by hardcoded id (12201–12208).

Boss phases **do** have `spellPoolIds` (`admin.mo` 264–271). Seeded bosses still list purged ids (`fireball`, `cursed_gust`, `entangle`, `mist_form`, `blood_nova`, `obliterate`, `poison_dart`, …) in `defaultBossConfigs()` starting at `admin.mo` 350. Those ids are removed from `spellConfigs` on every canister start (`main.mo` 477–487). The boss editor can toggle chips (`AdminDashboard.tsx` 6810–6833) but cannot see whether a chip resolves.

### 1.4 Achievements and challenges cannot unlock spells

`AchievementConfig` (`admin.mo` 206–213, `gameTypes.ts` 359–367) is `{ id, name, description, dokaReward, condition, active }`. Condition is a **string key** matched client-side (`WorldExploration.tsx` 2071–2074). No spell id, no dependency edges, no reward type other than Doka.

`DEFAULT_CHALLENGES` (`utils/challengeCompletion.ts` 38–103) reward Doka / XP / a badge string. `challengeRewards.ts` persists only those numbers through `applyRewards`. There is no challenge → spell grant.

### 1.5 Hard delete and silent bar drops

| Write | Behaviour today |
| :--- | :--- |
| `adminDeleteSpellConfig` | `spellConfigs.remove(id)` (`main.mo` 622–627). No graph check. |
| Admin UI delete | One red `×` with no confirm and no dependents (`AdminDashboard.tsx` 3338–3345, 5217–5221). |
| `upgradeSpell` | Requires `spellConfigs.get(spellId)` (`main.mo` 684–688). A deleted or never-seeded starter id returns `#err("Spell not found")`. Starter ids (`starter-shield`, `physical_attack`, `spell-swap`, …) are **not** in `defaultSpells()`. |
| `setSpellBarOrder` | Drops ids not in `character.spellLevelKeys` (`main.mo` 1233–1242). Levels are only written by `upgradeSpell`. A never-upgraded owned spell disappears from the persisted bar. |

There is no draft, no version, no validate, no activate/deactivate, no rollback, no compare.

### 1.6 Remaining name heuristics (must not grow)

| Site | What it does |
| :--- | :--- |
| `WorldExploration.tsx` 2203–2239 | Filters catalog by spell **name** and id |
| `engine/summonSpawn.ts` 149 | `spell.name.replace("Summon ", "")` for the unit display name |
| `engine/enemyAI.ts` 196–217 | If `summonAI` is empty, infers archetype from **name** (`wolf`, `golem`, `wisp`, …) |

Combat targeting itself is metadata-first (`docs/ARCHITECTURE.md` 356; `targeting.ts` `targetType` / LoS / range). Admin tooling must stay on that path.

### 1.7 Admin editor coverage vs required definition fields

`SpellEditor` (`AdminDashboard.tsx` 2146–3178) edits name, description, AP/MP, damage, range, min/max, LoS flags, hitTiles, buff/debuff/DoT, and special boolean mechanics. It does **not** edit:

- `targetType` (required by targeting)
- `cooldown` (on Motoko `SpellConfig`, **zero** matches in `AdminDashboard.tsx`)
- `areaShape` / `areaRadius`
- summon block (`isSummon`, `summonAI`, `summonLifespan`, `summonUnitDef`)
- per-spell scaling (global `LevelUpConfig` only)
- acquisition, pools, lifecycle, versions

`newSpell()` (57–99) omits `targetType` and `cooldown`. Defaults therefore fail a metadata-complete validator.

Admin remains correctly gated (`isAdmin && onOpenAdmin`; backend `#admin` on writes). New studio surfaces must stay on that gate.

---

## 2. Design principles

1. **Id is identity.** `name` and `description` are presentation. No filter, kit, AI, or unlock may key off `spell.name`.
2. **Catalog ≠ ownership.** `spellConfigs` is the definition store. Per-character `ownedSpellIds` / `observedSpellIds` / `spellLevelKeys` are progress. Admin edits to the catalog must not grant or revoke by side effect.
3. **Explicit metadata only.** Targeting, effects, statuses, summons, and AI kits are typed fields or id lists.
4. **Soft-retire over delete.** Published ids are never removed from the map. Retirement is a lifecycle state plus a dependency report.
5. **Backend-authoritative.** Observation, unlock, and retirement are canister writes. `localStorage` is a cache (`{userId}_slot{N}_pbv_spell_levels` already follows this for levels).
6. **Dev-only owner UI.** Same lazy `AdminDashboard` + `#admin` rule. No player-facing studio.
7. **Do not touch** RAF, map generation, turn logic, or damage math. New behaviour lives in `engine/*` / `utils/*` helpers; WorldExploration only wires one-line call sites.
8. **Single reward funnel.** Spell grants that accompany Doka/XP still enqueue on `createProgressPersist`. The grant itself is a dedicated canister method, not a `updateCharacter` field smash.

---

## 3. Canonical `SpellDefinition`

Extend the persisted Motoko record (and bindgen) so one save round-trips everything combat and admin need. Frontend `SpellConfig` becomes a view of this record, not a parallel type.

### 3.1 Identity and presentation

| Field | Rule |
| :--- | :--- |
| `id` | Immutable after first activate. Drafts may set it once. Pattern: `^[a-z][a-z0-9_-]{1,47}$`. |
| `name` | UI/log only. Max 100 (already enforced in `adminSetSpellConfig`). |
| `description` | Player-facing. |
| `iconEmoji` | Presentation. |

Renaming does not change kits, achievements, or ownership. Those store **ids**.

### 3.2 Cost, range, targeting (required)

| Field | Rule |
| :--- | :--- |
| `apCost` | Nat 0–12. `0` is legal only when `isTimestep` or an explicit `allowZeroAp` flag is set. Today’s save rejects `< 1` (`main.mo` 603–604) and would block Timestep — validator must special-case the flag, not the name. |
| `mpCost` | Nat. |
| `minRange` / `maxRange` | `minRange ≤ maxRange ≤ 20`. Legacy `range` is a derived alias of `maxRange` until callers are gone. |
| `targetType` | Required enum: `self` \| `ally` \| `enemy` \| `ground` \| `area` \| `line` \| `all`. |
| `lineOfSight` | Bool. |
| `linear` / `diagonal` | Mutually exclusive unless both false (omnidirectional). |
| `freeCells` | Required true for summons and barriers. |
| `areaShape` / `areaRadius` / `hitTiles` | Required when `targetType` is `area` or `aoe` is true. |
| `cooldown` | Nat 0–10. **Must appear in the editor.** |

### 3.3 Effects, duration, scaling, statuses

Replace the parallel `effectType` / `spellType` / `effectCategory` / boolean mechanic pile with an **ordered `effects: [SpellEffect]`** list plus a small compatibility projection for the current engine.

Each `SpellEffect` is a variant keyed by kind, never by spell name:

- `#damage { amount; isPhysical }`
- `#heal { amount }`
- `#drain { damage; heal }`
- `#buff { stat; modifier; duration }`
- `#debuff { stat; modifier; duration }`
- `#dot { dotType; damagePerTurn; duration }`
- `#status { statusId; duration }` — `statusId` references a status catalog, not a string match on “Poison”
- `#displace { mode: pushback \| attract \| swap \| teleport; distance }`
- `#summon { unitDefId; lifespan }`
- `#mechanic { flag: mirror \| timestep \| sacrifice \| barrier \| trap \| mark }`

**Scaling** is per-definition, not only global `LevelUpConfig`:

| Field | Default (matches today’s UI) |
| :--- | :--- |
| `damageGrowthPercent` | inherit global `spellDmgGrowthPercent` (3) |
| `rangeGrowthEveryNLevels` | inherit `spellRangeGrowthLevels` (10) |
| `maxScaledRange` | inherit `maxSpellRange` (5) |
| `upgradeBaseCost` | inherit `spellLevelingBaseCost` (10). Summon UI still advertises 10× and must debit via `spellUpgradeUiSpend`. |

### 3.4 Summons

A summon is a `SummonUnitDef` **id**, not a name prefix.

| Field | Rule |
| :--- | :--- |
| `summonUnitDef.id` | Stable id. |
| `pieceType` | Visual/piece only. |
| `summonAI` | Required enum: `hunter` \| `guardian` \| `archer` \| `bomber` \| `healer`. Legacy aliases `kiter`/`kamikaze` map in data, not in `inferSummonArchetype` name fallbacks. |
| `summonKit` | Spell **ids**. Validator rejects unknown / retired-without-legacy. |
| `summonLifespan` | Nat ≥ 1. |
| `displayName` | Explicit text. Do not derive from `spell.name.replace("Summon ", "")`. |

`inferSummonArchetype` must return `#err` (or a required default recorded on the def) when `summonAI` is empty. The name fallback at `enemyAI.ts` 211–217 is retired.

### 3.5 Required-metadata checklist (activate gate)

A definition cannot leave `draft` → `active` unless all of the following are present:

- id, name, description
- `targetType`
- `minRange` / `maxRange` consistent
- `apCost` legal for flags
- at least one `SpellEffect`
- if summon: complete `SummonUnitDef` + `freeCells` + `targetType = ground`
- if enemy-usable: at least one pool membership **or** an explicit `ENEMY_ONLY` / `BOSS_ONLY` route with a kit/boss ref
- acquisition block (section 4) fully filled
- no name-heuristic fields

---

## 4. Acquisition

Persisted on the definition as a **closed enum** plus flags. The engine and admin read the enum. They never infer route from the spell’s name or from “usableByPlayer && usableByEnemy”.

### 4.1 Routes

| Route | Meaning | Writer |
| :--- | :--- | :--- |
| `ENEMY_DISCOVERY` | Default. Observe in combat, then win. | Discovery persist (section 5) |
| `ACHIEVEMENT` | Granted when the achievement is unlocked (not merely claimed). | `markAchievementUnlocked` extension |
| `CHALLENGE` | Granted when the live challenge predicate succeeds and rewards persist. | Same persist lock as `liveBattleChallengePersistEntries` |
| `BOSS` | Granted on that boss defeat (phase-complete, not room-0 farm). | Existing boss-clear persist path |
| `ELITE` | Granted on elite pack victory. | Discovery persist with elite encounter tag |
| `SPECIAL_ENCOUNTER` | Granted on a tagged encounter id. | Encounter complete |
| `MULTI_SOURCE` | Union of listed child routes. Unlock if **any** child completes unless `requireAllSources` is set. | Each child writer |
| `ENEMY_ONLY` | Enemies may cast; players never own. `PLAYER_LEARNABLE = false`. | n/a |
| `BOSS_ONLY` | Only boss `spellPoolIds`. Players never own. | n/a |
| `SYSTEM_ONLY` | Strike / Attack Nearest / debug. Always owned for players if `isBaseSpell`, never in enemy random kits. | Character create seed |

`usableByPlayer` / `usableByEnemy` remain **cast gates**, not acquisition. A spell can be enemy-castable and not player-learnable (`ENEMY_ONLY`). A spell can be player-owned and never appear on enemies.

### 4.2 Flags (every definition exposes these)

| Flag | Default for `ENEMY_DISCOVERY` | Meaning |
| :--- | :--- | :--- |
| `OBSERVATION_REQUIRED` | true | Unlock is illegal until this character has a persisted observation of **this spell id** actually being cast by an enemy in a battle they participated in. |
| `VICTORY_REQUIRED` | true | Observation alone is not enough; the player must win that battle (or a later battle in which the spell is re-observed — see 5.3). |
| `PLAYER_LEARNABLE` | true | If false, the spell can never enter `ownedSpellIds`. |

`SYSTEM_ONLY` + `isBaseSpell`: `PLAYER_LEARNABLE = true`, both observation flags false.  
`ENEMY_ONLY` / `BOSS_ONLY`: `PLAYER_LEARNABLE = false`.  
`ACHIEVEMENT` / `CHALLENGE` / `BOSS` / `ELITE` / `SPECIAL_ENCOUNTER`: observation flags default **false** (the named source is the gate). An owner may still turn them on for a hybrid (`MULTI_SOURCE`).

### 4.3 `minLevel`

Stays as a **cast/equip** requirement after ownership, not a substitute for acquisition. Admin must show both: “how you get it” and “when you can use it”.

---

## 5. Enemy discovery default

This is the only automatic learn path. It is id-based and backend-authoritative.

```
eligible unknown spell
  → enemy kit actually contains the id
  → enemy successfully casts it (not merely “had it assigned”)
  → spell becomes observed for this character
  → player wins the battle
  → spell permanently unlocks (ownedSpellIds + recap)
```

### 5.1 Eligibility (all must hold)

1. Definition `lifecycle = active`.
2. `PLAYER_LEARNABLE = true`.
3. Route is `ENEMY_DISCOVERY` or a `MULTI_SOURCE` that includes it.
4. Id is **not** already in `ownedSpellIds`.
5. Enemy that cast it is a hostile (not a player-side summon).
6. Spell id was on that enemy’s **resolved kit** (assignedSpells), not inferred from name.

### 5.2 Observation

On a successful enemy cast of `spellId`, the client enqueues `recordSpellObservation(slot, spellId, encounterId)` on the persist lock. The canister:

- rejects if the spell is unknown or not learnable
- is idempotent per `(principal, slot, spellId)`
- stores `observedAt` and last `encounterId`

Observation does **not** unlock. Death / flee / Death Realm leaves the observation in place (the player already saw the spell).

### 5.3 Victory

On victory persist (existing `applyRewards` enqueue), the canister (or a dedicated `commitSpellDiscoveries(slot, encounterId)`) grants every observed, eligible, not-yet-owned id whose `VICTORY_REQUIRED` is satisfied by **this** encounter, **or** (if the owner set `allowLaterVictory`) by any later win while the observation still exists.

Recommended default: **same-encounter victory**. A later win without re-observation does not unlock. Owner can flip `allowLaterVictory` per spell.

### 5.4 Recap

Unlocks appear on the existing root `PostBattleRecap` as a third column next to XP/Doka. No second recap popup. Do not write ownership through `updateCharacter`.

### 5.5 What this replaces

`ownedSpells = starter ∪ all backend configs` (`WorldExploration.tsx` 2257–2272) is retired. After migrate:

- `ownedSpellIds` = `SYSTEM_ONLY` base ids seeded at create ∪ granted ids
- Catalog queries return definitions for **rendering unknown-as-silhouette** in a future codex; they do not equip

---

## 6. Enemy pools

Admin-authored, id lists, not piece-name heuristics.

| Pool | Intent | Typical assignment |
| :--- | :--- | :--- |
| `CORE` | Always-on bread-and-butter | Zone 0+ kits |
| `ADVANCED` | Zone-gated extras | `levelZone ≥ 1` |
| `RARE` | Low-weight extra slot | Weighted roll, max 1 |
| `ELITE` | Elite packs / leaders | Elite encounter flag |
| `SIGNATURE` | One id unique to an enemy/boss family | Explicit `EnemyKit.signatureId` |

### 6.1 `EnemyKit` (new admin document)

Attached to `EnemyConfig` (or a sidecar map keyed by enemy id — prefer sidecar so today’s spawn-template `EnemyConfig` does not collide with `types/common.mo` combat `EnemyConfig`).

```
EnemyKit {
  enemyId: Text
  core: [Text]          // spell ids
  advanced: [Text]
  rare: [Text]
  elite: [Text]
  signature: ?Text
  advancedFromZone: Nat // default 1
  rareWeight: Nat       // 0–100
}
```

`buildEnemyKit(pieceType, levelZone)` becomes `resolveEnemyKit(enemyId, levelZone, encounterTags)` that **only** reads this document. Chess piece may still pick a **default kit template** when cloning a new enemy, but the stored kit is ids.

Boss `spellPoolIds` stay the boss-phase override. Validator flags any id not `active` or not `usableByEnemy`.

### 6.2 Summoner extras

The 50/50 wolf/archer append (`WorldExploration.tsx` 12201–12208) becomes a kit field `bonusSummonSpellIds` with weights. No hardcoded `starterSpells.find(id === "summon-dire-wolf")`.

---

## 7. Dependency views

Admin gets a read-only graph, computed from ids. No string search on names.

### 7.1 Spell →

| Edge | Source |
| :--- | :--- |
| Enemies | `EnemyKit` lists containing the id |
| Achievements | `AchievementConfig.spellRewardIds` / conditions that reference the id |
| Challenges | `Challenge.rewards.spellIds` |
| Bosses | `BossPhaseConfig.spellPoolIds` |
| AI modules | `SummonUnitDef.summonKit`, `ENEMY_KITS` replacement, `summonAI` consumers |
| Acquisition routes | The spell’s own `acquisition.route` plus `MULTI_SOURCE` children |

### 7.2 Achievement →

| Edge | Source |
| :--- | :--- |
| Conditions | Typed `condition` variant (keep today’s string keys as the first variant payloads) |
| Spell / reward unlocks | New `spellRewardIds` + existing `dokaReward` |
| Dependencies | `requiresAchievementIds`, `requiresSpellIds` (e.g. Spell Scholar after any spell reaches level 5 — condition still keys off levels, not a named spell) |

### 7.3 Inspector UI

A carved-stone side drawer on every editor:

- **Safe to retire** — zero live refs, or only refs that are themselves retired
- **Blocked** — list each ref with jump-to-editor
- **Legacy owned** — count of characters with this id in `ownedSpellIds` or `spellLevelKeys` (admin query, not a full table dump in the first slice)

---

## 8. Dependency safety and legacy retirement

### 8.1 Lifecycle

```
draft → (validate) → active ⇄ inactive → retired
                              ↘ rollback to prior version (active only)
```

| State | Catalog visible to players | Enemies / bosses may cast | New unlocks | Already-owned |
| :--- | :--- | :--- | :--- | :--- |
| `draft` | no | no | no | n/a |
| `active` | yes | if flags/pools say so | yes | yes |
| `inactive` | no (hidden from new content) | no | no | **yes** — keep bar, keep levels, keep cast |
| `retired` | no | no | no | **yes**, with legacy rules below |

**Hard delete** is allowed only for `draft` with zero versions published and zero character refs. `adminDeleteSpellConfig` must return `#err` with the dependency report otherwise.

Same rule for achievements and enemy configs: deactivate/retire first; delete only drafts.

### 8.2 Legacy behaviour for already-owned retired spells

When a published spell is retired:

1. **Do not strip** `ownedSpellIds`, `spellLevelKeys` / `spellLevelValues`, or `spellBarOrder` for that id.
2. **`setSpellBarOrder` must keep the id** if it is owned, even if `spellConfigs` is retired (today it drops anything not in `spellLevelKeys`; after this change the filter is `ownedSpellIds ∪ spellLevelKeys`, never “must be active”).
3. **`upgradeSpell` remains legal** for owned retired ids so players are not stuck mid-curve. Cost formula unchanged. New players cannot obtain the id.
4. Spellbook shows a **Retired** seal. Tooltip: “No longer taught. You keep what you learned.”
5. Targeting and effects use the **last published version** frozen on the definition (`retiredRevision`). Owners cannot edit a retired record in place; they clone to a new draft.
6. Achievements that already unlocked stay unlocked. New unlocks that would grant a retired spell skip the grant and still pay Doka.
7. Enemy/boss kits that still list the id fail validation and are blocked from activate; live kits ignore retired ids at resolve time (log once) so a stale kit cannot crash combat.

### 8.3 Versioning

Each activate writes `SpellRevision { revision: Nat; definition snapshot; activatedAt; activatedBy }`.

Owner actions:

| Action | Rule |
| :--- | :--- |
| **Duplicate** | New draft, new id (`{id}_copy` then owner edits), copies definition, clears acquisition progress refs, copies kit suggestions as unchecked |
| **Compare versions** | Side-by-side field diff, id-stable. Highlight targeting / acquisition / pool changes |
| **Draft** | Mutations go to `draftDefinition`. Live combat reads `activeRevision` only |
| **Validate** | Pure function: required metadata + dependency referential integrity + no name heuristics + Candid-round-tripable |
| **Activate** | Validate, bump revision, swap live snapshot, invalidate `["spellConfigs"]` |
| **Deactivate** | `inactive` without bumping revision |
| **Rollback** | Pick prior revision → new draft prefilled → validate → activate (never silent overwrite) |
| **Dependency inspection** | Section 7, required before retire |

Canister keeps N revisions (recommend 20). Older than that: export-only, no in-UI rollback.

---

## 9. Owner UI (dev-gated)

One new Admin tab cluster, same Ankama/Dofus carved-stone language as the current dashboard (slate panels, gold dim borders, crimson delete, 10–11px uppercase labels). Do not introduce a second visual system.

### 9.1 Tabs

| Tab | Job |
| :--- | :--- |
| **Library** | Filter by lifecycle, route, pool, `PLAYER_LEARNABLE`. Cards show id (mono), name, AP, range, route chips. |
| **Editor** | Full definition (section 3). Sections: Identity, Cost & targeting, Effects, Duration & statuses, Scaling, Summon, Acquisition, Pools, Validation. |
| **Discovery** | Observation / victory flags, allowLaterVictory, recap copy. |
| **Kits** | Enemy + boss pool membership with resolve-or-broken chips. |
| **Feats** | Achievement conditions, spell rewards, dependency edges. |
| **Graph** | Spell ↔ enemy ↔ achievement ↔ challenge ↔ boss ↔ AI. |
| **Versions** | Compare, rollback, duplicate. |

### 9.2 Validation strip

Always visible in the editor footer:

- green: activate enabled
- amber: warnings (unused pool, boss chip unresolved)
- crimson: hard errors (missing `targetType`, broken kit id, name-heuristic leftover)

### 9.3 Safety copy on retire

Modal lists dependents and the legacy-owned count. Primary button is **Retire** (crimson). There is no **Delete** on `active`/`inactive`/`retired`.

---

## 10. Persistence sketch (for implementers; not this PR)

New or extended canister maps (names indicative):

| Store | Key | Value |
| :--- | :--- | :--- |
| `spellConfigs` | spell id | `SpellDefinition` + `lifecycle` + `activeRevision` |
| `spellRevisions` | `spellId#rev` | snapshot |
| `enemyKits` | enemy id | `EnemyKit` |
| `ownedSpells` | `principal#slot` | `[Text]` |
| `observedSpells` | `principal#slot#spellId` | `{ observedAt; encounterId }` |

`upgradeSpell` already keys levels by spell id. Seed `ownedSpellIds` at create with `SYSTEM_ONLY` / `isBaseSpell` ids that exist in the catalog (fix today’s starter-vs-canister split).

`getSpellConfigs` stays public (definitions). Ownership queries are caller-scoped.

---

## 11. Migration notes (when a later run implements)

1. **Do not** grant current `getSpellConfigs()` to all players. That would freeze the “everyone owns the catalog” bug.
2. Seed ownership from `SYSTEM_ONLY` + ids already present in `spellLevelKeys` (player paid to upgrade — they own it) + ids on `spellBarOrder` that still resolve.
3. Frontend-only starters (`starter-shield`, `spell-swap`, summons, …) must be **inserted** into `spellConfigs` with explicit metadata and `SYSTEM_ONLY` or `ENEMY_DISCOVERY` as designed — otherwise `upgradeSpell` keeps returning “Spell not found”.
4. Rewrite `OLD_SPELL_NAMES_SET` into an id tombstone list (`retiredIds`) with no name keys.
5. Retarget boss `spellPoolIds` to live ids before the next boss playtest.
6. Keep `saveBattleStats` ignoring spell-level arrays. `upgradeSpell` remains the sole level writer. Discovery grants only append `ownedSpellIds`.

---

## 12. Out of scope for this design

- Changing damage formulas, XP curve, or persist-lock algebra
- Player-facing codex UX beyond recap unlock chips (a later journey specialist can spec it)
- Implementing the Motoko/TS changes in this PR

---

## 13. ACTION_ID index

All items: `STATUS: NEW`. Full records: [`ACTION_IDS_2026-08-31.md`](./ACTION_IDS_2026-08-31.md).

| ID | Title | Priority |
| :--- | :--- | :--- |
| SDA-2026-08-31-001 | Unify SpellDefinition so Admin save round-trips combat metadata | P0 |
| SDA-2026-08-31-002 | Split catalog from ownership; persist owned/observed ids | P0 |
| SDA-2026-08-31-003 | Acquisition routes + OBSERVATION / VICTORY / LEARNABLE flags | P0 |
| SDA-2026-08-31-004 | Implement enemy-discovery default (cast → observe → win → unlock) | P0 |
| SDA-2026-08-31-005 | Soft-retire + dependency-safe delete; define legacy owned behaviour | P0 |
| SDA-2026-08-31-006 | Replace name heuristics with id tombstones and explicit summonAI | P0 |
| SDA-2026-08-31-007 | Seed starters into the canister so upgradeSpell can resolve them | P0 |
| SDA-2026-08-31-008 | Admin-authored enemy pools (CORE…SIGNATURE) replacing ENEMY_KITS | P1 |
| SDA-2026-08-31-009 | Repair boss spellPoolIds against purged ids | P1 |
| SDA-2026-08-31-010 | Achievement and challenge spell-reward edges | P1 |
| SDA-2026-08-31-011 | Draft / validate / activate / deactivate / rollback / compare / duplicate | P1 |
| SDA-2026-08-31-012 | Spell Studio UI: complete editor + dependency drawer | P1 |
| SDA-2026-08-31-013 | Keep retired ids on the spell bar; stop filtering by levels only | P1 |
