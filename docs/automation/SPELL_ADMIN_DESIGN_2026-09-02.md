# Spell, Discovery & Achievement Admin Design — 2026-09-02 re-audit

**Author:** Spell, Discovery & Achievement Admin Designer  
**Automation:** `4efa22ec-a498-11f1-a7d1-d6b4613131ce`  
**Date:** 2026-09-02  
**HEAD audited:** `58302bc` (`Merge pull request #258`)  
**Scope:** Owner tooling for the complete spell ecosystem. **No production code in this PR.**

This is a **delta** on [`SPELL_ADMIN_DESIGN_2026-08-31.md`](./SPELL_ADMIN_DESIGN_2026-08-31.md) (#116) and [`SPELL_ADMIN_DESIGN_2026-09-01.md`](./SPELL_ADMIN_DESIGN_2026-09-01.md). Sections 2–11 of the 08-31 document remain the contract (canonical `SpellDefinition`, acquisition routes, observe→win→unlock, CORE–SIGNATURE pools, dependency views, soft-retire + legacy owned, studio tabs, persist sketch). This run does **not** replace that contract.

It records what landed after `dd275aa`, what is still the wrong field, and the ACTION_IDs in [`ACTION_IDS_SDA_2026-09-02.md`](./ACTION_IDS_SDA_2026-09-02.md).

Do not implement those IDs unless a human or orchestrator picks one. Do not grow `WorldExploration.tsx` (19 253 lines). Never introduce spell-name heuristics.

---

## 1. Why this run exists

09-01 warned that `usableByPlayer = false` is a **cast gate** being used as lifecycle. That is still the live retire path.

What *did* land is the bindgen/adapter half of 09-01-002: Motoko summon fields now round-trip through `backend.ts` and `toBackendSpellConfig`. That closed the CharacterStats-class lag for `isSummon` / `summonAI` / `summonLifespan` / `summonUnitDef`. It did **not** ship a studio, ownership, discovery, or a complete summon record.

The 08-31 contract is still the destination. The 09-02 IDs are the current first cuts. Do not extend the `usableByPlayer=false` retire path.

---

## 2. Current state (verified against `origin/main` @ `58302bc`)

### 2.1 What landed since 09-01 (do not rediscover)

| Change | Where | What it actually does |
| :--- | :--- | :--- |
| Bindgen `SpellConfig` includes summon + cooldown | `src/frontend/src/backend.ts` 118–152 | `isSummon`, `summonAI`, `summonLifespan`, `summonUnitDef`, `cooldown` now exist on the Candid type. 09-01-002 **closed**. |
| Adapters send the summon block | `adminContract.ts` `toBackendSpellConfig` 280–306; `fromBackendSpellConfig` 356–388 | Empty unit def helper matches the 20260831 migration. Still **no** `targetType`, `displayName`, `summonKit`, or acquisition. |
| Client validator covers summon completeness | `adminSafety.ts` `validateSpellConfig` 429–512 | `isSummon` requires a known `summonAI` and `pieceType`. AP still `< 1` illegal. **Admin Save now calls it** (`AdminDashboard.tsx` 3509–3527). |
| Motoko validator covers summon enums | `adminGuard.mo` 341–407 | Caps + enum strings. Empty `summonAI` is legal even when `isSummon=true` — **client/server drift**. Still no `targetType`. |
| Cooldown + mechanic defaults on new drafts | `AdminDashboard.tsx` `newSpell()` 82–132; cooldown input 2614–2618 | Drafts carry `isSummon`/`summonAI`/`summonUnitDef` and Swap/Mirror/Timestep flags. **Editor has no summon section and zero `targetType` matches.** |
| Appearance cannot mint spell levels | `adminSafety.ts` `resolveAppearanceSpellLevels` 525–537; `main.mo` comments 283–289 | Cosmetic writes keep stored keys. Does not create `ownedSpellIds`. |
| Wallet/level feats defer until `applyRewards` | `shouldDeferAchievementUnlockUntilRewardsPersist` `adminSafety.ts` 268–276 | Unlocks still grant **Doka only**. |
| Config rollback exists for some maps | `adminRollbackLevelUpConfig` / `GameConfig` / `TierSpawnConfig` / `ColorPalette` / `BossRushConfig` | **No** `adminRollbackSpellConfig`. Spell Save is still a live overwrite (`main.mo` 866–877). |

`defaultSpells()` literals include the summon block (all empty). The 08-31 type-drift on those literals stays closed.

### 2.2 What did not land (still the 08-31 / 09-01 gaps)

| Gap | Evidence @ `58302bc` |
| :--- | :--- |
| Catalog ≠ ownership | `ownedSpells` = all `starterSpells` (forced `isBaseSpell`) ∪ every backend row with `usableByPlayer !== false` (`WorldExploration.tsx` 2356–2401). 32 frontend ids in `spellData.ts` are pre-owned. |
| Observation / unlock persist | No `ownedSpellIds`, `observedSpellIds`, `recordSpellObservation`, or `commitSpellDiscoveries`. Recap still XP/Doka/feats (`PostBattleRecap.tsx`; `attachRecapUnlocks` is achievements only). |
| Acquisition routes + three flags | Still only `usableByPlayer` / `usableByEnemy` (`admin.mo` 117–118; editor 2726–2778). No `ENEMY_DISCOVERY` / `ACHIEVEMENT` / `CHALLENGE` / `BOSS` / `ELITE` / `SPECIAL_ENCOUNTER` / `MULTI_SOURCE` / `ENEMY_ONLY` / `BOSS_ONLY` / `SYSTEM_ONLY`. No `OBSERVATION_REQUIRED` / `VICTORY_REQUIRED` / `PLAYER_LEARNABLE`. |
| Enemy pools | `ENEMY_KITS` is still `Record<ChessPieceType, …>` (`enemyAI.ts` 156–193). Battle start still comments “10 random spells” then `buildEnemyKit` (`WorldExploration.tsx` 12030–12038). Admin `EnemyConfig` still has no spell list (`admin.mo` 15–26). |
| Zone always 0 | `buildEnemyKit(enemy.pieceType, currentMap.levelZone)` passes a `{ name, minLevel, maxLevel }` object (`WorldExploration.tsx` 12035, 4680, 5231). `Math.floor(levelZone)` is `NaN`; `z >= 1` is false; every kit stays zone 0. |
| Achievement / challenge spell grants | `AchievementConfig` is `{ id, name, description, dokaReward, condition, active }` (`admin.mo` 249–256). `DEFAULT_CHALLENGES` still `{ doka, xp, badge }`. |
| Name heuristics | `OLD_SPELL_NAMES_SET` matches **name and id** (WX 2317–2354). `summonSpawn.ts` 161: `spell.name.replace("Summon ", "")`. `inferSummonArchetype` (`enemyAI.ts` 196–217) falls back to `summon.name` (`wolf` / `golem` / `wisp` / …). |
| Starter catalog vs canister | Combat ids live in `spellData.ts` (32 ids). Canister seed is six other ids (`admin.mo` 168–191). `physical_attack` is still in the start-up **purge** list (`main.mo` 686–695). |
| Live id in the tombstone | `OLD_SPELL_NAMES_SET` includes `physical_attack`. Enemy kit resolution looks that id up in `normalizedSpellPool` (WX 12035–12038, 2649–2662), which **strips** it. Zone-0 pawn/knight/rook kits resolve empty unless the summoner roll appends wolf/archer. |
| Bar persist | `setSpellBarOrder` still keeps only `spellLevelKeys` (`main.mo` 1900–1902). Never-upgraded starters drop off the persisted bar. |
| Draft / version / rollback | `adminSetSpellConfig` writes the live map after `validateSpellConfig` (`main.mo` 866–877). No revision store. |
| Enemy hard delete | `adminDeleteEnemyConfig` is still `remove` (`main.mo` 795–802). |
| Boss seed ids | `defaultBossConfigs()` still lists `fireball`, `cursed_gust`, `entangle`, `mist_form`, `blood_nova`, `obliterate`, `poison_dart`, `ice_shard`, `meteor_strike`, `plague_wave`, `inferno`, `frost_nova` (`admin.mo` 350+). Those ids are purged every start. Live combat bosses use `data/bossKits.ts` (id-validated against `spellData.ts`). Admin Bosses tab chips `getSpellConfigs()` (`AdminDashboard.tsx` 7373–7497). **Three kit sources.** |
| Summon editor | Persist + bindgen + save-validator exist. Spell Type `<select>` is only damage/heal/drain (2646–2648). No `isSummon` / `summonAI` / `summonLifespan` / `summonUnitDef` / `displayName` controls. Saving a migrated empty-AI summon fails the **client** validator and would pass Motoko. |

### 2.3 Three SpellConfig shapes (updated)

| Layer | Path | Now stores | Still missing vs combat |
| :--- | :--- | :--- | :--- |
| Motoko persist | `admin.mo` 85–127 | Identity, AP/MP, damage/heal, effect strings, range/LoS flags, usable flags, cooldown, thin summon block (`pieceType`/`level`/`hpScale`/`damageScale`) | `targetType`, area, buff/debuff/DoT, mechanic flags, `displayName`, `summonKit`, summon AP/MP, acquisition, lifecycle, effects list |
| Bindgen | `backend.ts` 118–152 | Matches Motoko, including summon block | Everything Motoko still omits |
| Engine / UI | `gameTypes.ts` 160–241 + `summonSpawn.ts` `SummonUnitDef` 21–32 | `targetType`, area, buffs, DoT, `isSwap`/`isMirror`/`isTimestep`/`isSacrifice`/`isBarrier`/`isTrap`/`isMark`, `summonKit`, summon AP/MP | Those fields never survive a canister round-trip |

`spellEngine.ts` 6–13 still documents that combat reads the **frontend** fields, including `targetType` and mechanic flags.

Saving a summon from Admin today: editor cannot set summon fields; Motoko unit def cannot store `summonKit` / `displayName`; bindgen cannot invent them.

---

## 3. Superseding rule: lifecycle ≠ `usableByPlayer`

Unchanged from 09-01 §3 / 08-31 §4 and §8. Restated so the partial implementation cannot be extended.

| Field | Meaning | Must not mean |
| :--- | :--- | :--- |
| `usableByPlayer` | Cast/equip gate **after** ownership (and `minLevel`) | Retired, ENEMY_ONLY, draft, hidden |
| `usableByEnemy` | Hostile AI may resolve this id | Learnable, in a pool, or published |
| `lifecycle` | `draft \| active \| inactive \| retired` | Anything about who can cast |
| `PLAYER_LEARNABLE` | May enter `ownedSpellIds` | `usableByPlayer` |
| `acquisition.route` | How a player learns it | Inferred from the two usable flags |

`ENEMY_ONLY` / `BOSS_ONLY`: `PLAYER_LEARNABLE = false`, `usableByEnemy = true`, `lifecycle = active`. Players never own them. Setting `usableByPlayer = false` on those ids is **correct as a cast gate** and **wrong as the only retire signal**.

Live retire (`main.mo` 879–899): built-in six cannot be deleted; if `_spellReferencedByPlayers` then `{ existing with usableByPlayer = false }`; else `spellConfigs.remove`. Error copy still says “set usableByPlayer=false to retire it” (884).

`upgradeSpell` (994–1000) rejects `usableByPlayer=false` unless the id is already in `spellLevelKeys`. Owned-but-never-upgraded retired ids are **not** in `spellLevelKeys`, so the check would reject the legacy upgrade 08-31 §8.2 requires.

**Already-owned retired spells** (08-31 §8.2, unchanged):

1. Do not strip `ownedSpellIds`, `spellLevelKeys` / `spellLevelValues`, or `spellBarOrder`.
2. `setSpellBarOrder` keeps the id if owned (not “must be in `spellLevelKeys`” and not “must be `usableByPlayer`”).
3. `upgradeSpell` stays legal for owned retired ids. New players cannot obtain the id.
4. Spellbook shows a Retired seal. Combat reads the frozen `retiredRevision`.
5. New achievement grants skip a retired reward id and still pay Doka.
6. Live kits ignore retired ids at resolve time (log once). Activate of a kit that still lists them is blocked.

Hard delete remains legal **only** for `draft` with zero published revisions and zero refs (players, kits, bosses, achievements). `adminDeleteSpellConfig` must return `#err` plus a dependency report otherwise.

---

## 4. Ownership helper is still inverted

`shouldIncludeBackendSpellInLibrary` (`adminSafety.ts` 550–558):

```
if (usableByPlayer !== false) return true;
return ownedSpellIds.has(spellId);
```

Wired at `WorldExploration.tsx` 2387–2398. The `ownedIds` set is `baseSpells ∪ spellLevelKeys ∪ spellBarOrder`. `baseSpells` is **every** `starterSpells` row with `isBaseSpell: true` (2356–2368), including Strike.

So:

- A new Admin spell with default `usableByPlayer: true` (`newSpell()` 95; checkbox 2729) is still granted to every account on next hydrate.
- `usableByPlayer: false` hides the id unless it already appears on keys/bar — that is a **retire carve-out**, not an ownership split.
- There is still no observation log and no grant writer.

08-31 SDA-002 remains the persist work. 09-01-003 / 09-02-003 is “do not treat the helper as that work.”

Migration when ownership is implemented (unchanged): seed `ownedSpellIds` from `SYSTEM_ONLY` / innate four ∪ `spellLevelKeys` ∪ resolving `spellBarOrder` ids. **Do not** grant `getSpellConfigs()`. **Do not** grant the full `starterSpells` array.

---

## 5. Bindgen lag closed; summon persist is still thin

09-01-002 is **done**. The remaining summon hole is the Motoko `SummonUnitDef` (`admin.mo` 85–90):

```
pieceType, level, hpScale, damageScale
```

Combat `SummonUnitDef` (`summonSpawn.ts` 21–32) also needs `summonKit`, `ap`, `mp`. Display name is not on the def at all; spawn still does `spell.name.replace("Summon ", "")` (`summonSpawn.ts` 161).

Ship Motoko + bindgen + editor + migration together for any **new** fields. Do not `dfx deploy` `backend_extended/`.

`targetType` is still frontend-only. That is the remaining half of SDA-2026-08-31-001.

---

## 6. Dependency scan that cannot see the graph

`_spellReferencedByPlayers` (`main.mo` 250–281) only walks character level keys and bar slots. It cannot see:

- `BossPhaseConfig.spellPoolIds` (Motoko seed still lists purged ids)
- `data/bossKits.ts` (live combat kits)
- `ENEMY_KITS` / future `EnemyKit` lists
- Achievement / challenge reward ids (none exist yet)
- Summon kits
- Characters who “own” the id only because the catalog was unioned into `ownedSpells`

Therefore a custom spell that was never upgraded can still be **hard-deleted** while every player’s spellbook still shows it from the catalog union. The confirm dialog (`AdminDashboard.tsx` 3747–3758) says the live spell is **removed immediately** and dependents **will break**. Backend may have only flipped a bool. Toast is always `"Spell deleted"` (6084–6087).

Achievement delete (`main.mo` 2327–2348) is the same pattern: progress present → `active=false`; else hard `remove`. Unlock rejects inactive (2410–2412). Still Doka-only.

Enemy delete is unconditional `remove` (795–802).

Required inspector (08-31 §7), computed from **ids**:

Spell → enemies, achievements, challenges, bosses, AI modules, acquisition routes.  
Achievement → conditions, `spellRewardIds`, `requiresAchievementIds` / `requiresSpellIds`.

---

## 7. Required definition fields (activate gate)

A definition cannot leave `draft` → `active` unless:

- id (`^[a-z][a-z0-9_-]{1,47}$`), name, description
- `targetType` (`self | ally | enemy | ground | area | line | all`)
- `minRange` ≤ `maxRange` ≤ 20
- `apCost` 0–12; `0` legal only with `isTimestep` or explicit `allowZeroAp` (not a name check)
- `cooldown` 0–10 (editor field exists; keep it)
- at least one explicit effect (typed variant or today’s metadata flags — never `spell.name`)
- if summon: complete `SummonUnitDef` including `summonAI` enum, `displayName`, `summonKit` (id list), `freeCells`, `targetType = ground`
- if enemy-usable: pool membership **or** an explicit `ENEMY_ONLY` / `BOSS_ONLY` route with a kit/boss ref
- acquisition block filled (`ENEMY_DISCOVERY` default + `OBSERVATION_REQUIRED` / `VICTORY_REQUIRED` / `PLAYER_LEARNABLE`)
- no name-heuristic fields

`validateSpellConfig` today is a payload clamp, not this gate. Client and Motoko must return the **same** error strings. Today they do not: client requires `summonAI` when `isSummon`; Motoko allows empty AI.

`AdminGuard` AP `< 1` reject must be replaced when Timestep (or any zero-AP flag) is persisted. Editor already exposes `isTimestep` (3396) but cannot save AP 0.

---

## 8. Acquisition, discovery, pools (contract pointer)

Unchanged from 08-31 §§4–6 and [`SPELL_DISCOVERY_ECOSYSTEM_2026-08-31.md`](./SPELL_DISCOVERY_ECOSYSTEM_2026-08-31.md):

```
eligible unknown spell
  → enemy kit actually contains the id
  → enemy successfully casts it
  → observed (persist)
  → player wins that encounter
  → ownedSpellIds + root recap
```

Routes: `ENEMY_DISCOVERY` | `ACHIEVEMENT` | `CHALLENGE` | `BOSS` | `ELITE` | `SPECIAL_ENCOUNTER` | `MULTI_SOURCE` | `ENEMY_ONLY` | `BOSS_ONLY` | `SYSTEM_ONLY`.

Flags on every definition: `OBSERVATION_REQUIRED`, `VICTORY_REQUIRED`, `PLAYER_LEARNABLE`.

Pools: `CORE` | `ADVANCED` | `RARE` | `ELITE` | `SIGNATURE`.

Possession is not observation. Player-side summons do not observe. Hostile summons may. `upgradeSpell` is never the grant writer.

Summoner extras (`WorldExploration.tsx` 12047–12057) stay a kit field `bonusSummonSpellIds` with weights. No hardcoded `starterSpells.find(id === "summon-dire-wolf")`.

`resolveEnemyKit` must receive a **numeric** zone (or `minLevel`), not the LevelZone object.

---

## 9. Owner UI (dev-gated — still the 08-31 studio)

Live tabs (`AdminDashboard.tsx` 5529–5548): Enemies, Regions, Player Sprites, Spells, Map Modifiers, Enemy Tiers, Visuals, Settings, Purchases, Achievements, Enemy Names, Bosses, Ad Boxes, Shop, Boss Rush.

Missing studio tabs: Library (lifecycle/route filters), Discovery, Kits, Feats-as-graph, Graph, Versions.

Carved-stone / slate / crimson. Same `#admin` + lazy `AdminDashboard` gate.

Immediate UI honesty (can land with persist 001/004, not a restyle):

- Delete on published ids is **Retire**. Confirm lists dependents. Toast must say retired vs rejected vs draft-deleted.
- Cast-gate checkboxes stay labeled “player may cast” / “enemy may cast.” Lifecycle is a separate control.
- Validation strip: missing `targetType`, broken kit id, name-heuristic leftover = crimson.
- Spell Type includes `summon`. Summon section: `summonAI`, lifespan, piece, scales, **displayName**, kit ids.

Do not grow the 8 035-line dashboard until activate exists on the canister (08-31 SDA-012 / 09-02-013). Extract `SpellEditor` rather than appending another thousand lines. Do not grow `WorldExploration.tsx`.

---

## 10. Prior ACTION_ID status @ `58302bc`

### 08-31

| ID | Status | Note |
| :--- | :--- | :--- |
| SDA-2026-08-31-001 | **PARTIAL** | Cooldown + Motoko/bindgen summon **block** landed. `targetType` / mechanics / complete unit def / editor summons did not. |
| SDA-2026-08-31-002 | **OPEN** | Helper is not ownership. Catalog still grants. |
| SDA-2026-08-31-003 | **OPEN** | No route enum; flags still the two usable bools. |
| SDA-2026-08-31-004 | **OPEN** | No observe/commit APIs. |
| SDA-2026-08-31-005 | **PARTIAL / WRONG FIELD** | Soft-retire exists as `usableByPlayer=false`. Hard delete still exists. No graph. |
| SDA-2026-08-31-006 | **OPEN** | Name set, summon displayName, `inferSummonArchetype` unchanged. |
| SDA-2026-08-31-007 | **OPEN** | Starters not seeded; `physical_attack` still purged **and** tombstoned. |
| SDA-2026-08-31-008 | **OPEN** | `ENEMY_KITS` + hardcoded wolf/archer + zone NaN. |
| SDA-2026-08-31-009 | **OPEN** | Motoko boss seeds still purged ids; live kits live in `bossKits.ts`. |
| SDA-2026-08-31-010 | **OPEN** | Feats/challenges still Doka/XP/badge. |
| SDA-2026-08-31-011 | **OPEN** | No revisions. Save = live write. Other configs have rollback; spells do not. |
| SDA-2026-08-31-012 | **OPEN** | Confirm dialog only; copy still lies. |
| SDA-2026-08-31-013 | **OPEN** | Bar filter still `spellLevelKeys`. |

### 09-01

| ID | Status | Note |
| :--- | :--- | :--- |
| SDA-2026-09-01-001 | **OPEN** | Lifecycle still the cast flag. |
| SDA-2026-09-01-002 | **LANDED** | Bindgen + `toBackendSpellConfig` summon fields. Do not re-do. |
| SDA-2026-09-01-003 | **OPEN** | Helper still inverted. |
| SDA-2026-09-01-004 | **OPEN** | Player-key scan only. |
| SDA-2026-09-01-005 | **OPEN** | `targetType` still frontend-only; editor has zero matches. |
| SDA-2026-09-01-006 | **PARTIAL** | Save calls client validator; summon enums exist. Not an activate gate. Client ≠ Motoko on empty `summonAI`. AP 0 still illegal. |
| SDA-2026-09-01-007 … 014 | **OPEN** | Evidence line numbers moved; substance unchanged. |

Next implementer starts at **09-02-001** so 005 is not extended on `usableByPlayer`, then **09-02-007** (live Strike is missing from enemy kits), then **09-02-003** ownership. Persist `targetType` + complete summon def before player-facing unlock UX.

---

## 11. Out of scope

- Production TypeScript / Motoko / Candid in this PR
- RAF, map generation, turn logic, damage math
- Growing `WorldExploration.tsx`
- Re-authoring Wave-1 spell cards (`SPELL_DISCOVERY_ECOSYSTEM`) or boss adaptations (`BOSS_AND_SPELL_DISCOVERY.md`)
- Treating `adminSafety.ts` helpers as the finished lifecycle
- Re-opening 09-01-002 bindgen work
- Editing Cursor dashboard prompts (no write API)

---

## 12. ACTION_ID index (this run)

All items: `STATUS: NEW`. Full records: [`ACTION_IDS_SDA_2026-09-02.md`](./ACTION_IDS_SDA_2026-09-02.md).

| ID | Title | Priority |
| :--- | :--- | :--- |
| SDA-2026-09-02-001 | Separate lifecycle from `usableByPlayer` | P0 |
| SDA-2026-09-02-002 | Persist complete combat `SummonUnitDef` (`displayName`, `summonKit`, AP/MP) | P0 |
| SDA-2026-09-02-003 | Stop treating the library helper as ownership | P0 |
| SDA-2026-09-02-004 | Real dependency report; hard-delete only drafts | P0 |
| SDA-2026-09-02-005 | Persist `targetType` and combat mechanic flags | P0 |
| SDA-2026-09-02-006 | Shared activate-gate validator (close client/Motoko drift) | P1 |
| SDA-2026-09-02-007 | Seed starters; stop purging and tombstoning live `physical_attack` | P0 |
| SDA-2026-09-02-008 | Replace remaining name heuristics | P0 |
| SDA-2026-09-02-009 | Acquisition flags + observe→win→unlock | P0 |
| SDA-2026-09-02-010 | Admin-authored CORE–SIGNATURE pools; numeric zone; kit summon extras | P1 |
| SDA-2026-09-02-011 | One boss-kit source; repair Motoko pools; honest retire UI | P1 |
| SDA-2026-09-02-012 | Achievement / challenge `spellRewardIds` | P1 |
| SDA-2026-09-02-013 | Draft / validate / activate / rollback / compare / duplicate | P1 |
| SDA-2026-09-02-014 | Persist bar from ownership, not only upgrade keys | P1 |
| SDA-2026-09-02-015 | SpellEditor summon + targeting + acquisition; do not grow WX | P1 |
