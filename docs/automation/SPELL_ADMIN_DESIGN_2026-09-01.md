# Spell, Discovery & Achievement Admin Design — 2026-09-01 re-audit

**Author:** Spell, Discovery & Achievement Admin Designer  
**Automation:** `4efa22ec-a498-11f1-a7d1-d6b4613131ce`  
**Date:** 2026-09-01  
**HEAD audited:** `dd275aa` (`Merge pull request #182`)  
**Scope:** Owner tooling for the complete spell ecosystem. **No production code in this PR.**

**2026-09-02 re-audit:** this delta still stands. Bindgen summon lag (09-01-002) closed; lifecycle is still `usableByPlayer=false`. Current HEAD and ACTION_IDs: [`SPELL_ADMIN_DESIGN_2026-09-02.md`](./SPELL_ADMIN_DESIGN_2026-09-02.md), [`ACTION_IDS_SDA_2026-09-02.md`](./ACTION_IDS_SDA_2026-09-02.md).

This is a **delta** on [`SPELL_ADMIN_DESIGN_2026-08-31.md`](./SPELL_ADMIN_DESIGN_2026-08-31.md) (#116, merged). Sections 2–11 of that document remain the contract (canonical `SpellDefinition`, acquisition routes, observe→win→unlock, CORE–SIGNATURE pools, dependency views, soft-retire + legacy owned, studio tabs, persist sketch). This run does **not** replace that contract.

It records what landed after #116, what that partial work broke, and the ACTION_IDs in [`ACTION_IDS_SDA_2026-09-01.md`](./ACTION_IDS_SDA_2026-09-01.md).

Do not implement those IDs unless a human or orchestrator picks one. Do not grow `WorldExploration.tsx`. Never introduce spell-name heuristics.

---

## 1. Why this run exists

#116 specified a real lifecycle (`draft | active | inactive | retired`) and `ownedSpellIds` / `observedSpellIds`. A later merge wave shipped **half of the safety story** using the wrong field:

`usableByPlayer = false` is now treated as “retired.”

That flag is a **cast gate**. Using it as lifecycle silently makes `ENEMY_ONLY` / `BOSS_ONLY` / “player cannot equip yet” indistinguishable from retirement. Implementers who treat SDA-2026-08-31-005 as done will extend the wrong model.

The 08-31 contract is still the destination. The 09-01 IDs are the current first cuts.

---

## 2. Current state (verified against `origin/main` @ `dd275aa`)

### 2.1 What landed (partial — do not call this the studio)

| Change | Where | What it actually does |
| :--- | :--- | :--- |
| Motoko `SpellConfig` gained summon + cooldown | `src/backend/types/admin.mo` 80–126 | Persist now has `isSummon`, `summonAI`, `summonLifespan`, `summonUnitDef`, `cooldown`. Still **no** `targetType`, area, buff/debuff/DoT, mechanic flags, acquisition, or lifecycle. |
| Migration seeds empty summons | `src/backend/migrations/20260831_000000.mo` 141–156 | Every existing row got `isSummon=false`, empty `summonAI`, zero lifespan. Data is not “complete metadata.” |
| `AdminGuard.validateSpellConfig` | `src/backend/lib/adminGuard.mo` 306–344 | Id/name, AP 1–12, MP/cooldown/range caps, enum strings. **No** `targetType`, summon completeness, acquisition, or lifecycle. AP `0` is illegal (blocks Timestep unless a flag exception exists). |
| Client mirror | `src/frontend/src/utils/adminSafety.ts` 279–308 | Same incomplete validator. **Admin Save never calls it** (`AdminDashboard.tsx` 5595–5602). |
| Cooldown in the editor | `AdminDashboard.tsx` 2452–2457; `newSpell()` 94 | Cooldown round-trips if bindgen matches. `targetType` still has **zero** matches in `AdminDashboard.tsx`. |
| Soft-retire via cast flag | `main.mo` 861–880 | Built-in six cannot be deleted. If `_spellReferencedByPlayers`, write `usableByPlayer=false`. Else `spellConfigs.remove`. |
| Player-ref scan | `main.mo` 243–274 | Only `spellLevelKeys` and `spellBarOrder`. Ignores boss `spellPoolIds`, enemy kits, achievements, and never-upgraded “owned” catalog ids. |
| Upgrade gate | `main.mo` 974–982 | Rejects `usableByPlayer=false` unless the id is already in `spellLevelKeys`. Starters still `#err("Spell not found")` because they are not in `spellConfigs`. |
| Library helper | `adminSafety.ts` 310–318; WX 2424–2436 | `shouldIncludeBackendSpellInLibrary` returns **true** whenever `usableByPlayer !== false`. Catalog membership is still ownership for every live backend row. |
| Achievement retire | `main.mo` 2064–2084, 2115–2117 | Progress present → `active=false`; else hard remove. Unlock rejects inactive. Still Doka-only (`AchievementConfig` 223–230). |
| Delete confirm | `AdminDashboard.tsx` 3538–3547 | Confirm exists. Copy still says the spell is **removed immediately** and that dependents **will break**. Backend may have only flipped a bool. Toast is always `"Spell deleted"` (5618–5621). |
| Candid adapters | `adminContract.ts` 235–258 | Maps `hitsMultiple` ↔ `multiTarget` and defaults `cooldown`. Does **not** send Motoko summon fields. |
| Bindgen `SpellConfig` | `src/frontend/src/backend.ts` 115–145, `to_candid_record_n16` 4050–4141 | Still **no** `isSummon` / `summonAI` / `summonLifespan` / `summonUnitDef`. Motoko grew; bindgen did not. |

`defaultSpells()` (`admin.mo` 168–191) now literals the summon block (all empty). The 08-31 type-drift on those literals is **closed**. The bindgen lag is **new**.

### 2.2 What did not land (still the 08-31 gaps)

| Gap | Evidence @ `dd275aa` |
| :--- | :--- |
| Catalog ≠ ownership | `ownedSpells` = all `starterSpells` (forced `isBaseSpell`) ∪ every backend row with `usableByPlayer !== false` (`WorldExploration.tsx` 2354–2438). 31 frontend ids in `spellData.ts` are pre-owned. |
| Observation / unlock persist | No `ownedSpellIds`, `observedSpellIds`, `recordSpellObservation`, or `commitSpellDiscoveries`. |
| Acquisition routes + three flags | Still only `usableByPlayer` / `usableByEnemy` (`admin.mo` 117–118; editor 2567–2568). |
| Enemy pools | `ENEMY_KITS` is still `Record<ChessPieceType, …>` (`enemyAI.ts` 156–193). Battle start still comments “10 random spells” then `buildEnemyKit` + hardcoded `summon-dire-wolf` / `summon-archer` (`WorldExploration.tsx` 12479–12506). Admin `EnemyConfig` still has no spell list (`admin.mo` 15–26). |
| Achievement / challenge spell grants | `AchievementConfig` is `{ id, name, description, dokaReward, condition, active }`. `DEFAULT_CHALLENGES` still `{ doka, xp, badge }`. |
| Name heuristics | `OLD_SPELL_NAMES_SET` matches **name and id** (WX 2354–2390). `summonSpawn.ts` 161: `spell.name.replace("Summon ", "")`. `inferSummonArchetype` (`enemyAI.ts` 196–217) falls back to `summon.name` (`wolf` / `golem` / `wisp` / …). |
| Starter catalog vs canister | Combat ids live in `spellData.ts`. Canister seed is six other ids. `physical_attack` is still in the start-up **purge** list (`main.mo` 715–723). |
| Bar persist | `setSpellBarOrder` still keeps only `spellLevelKeys` (`main.mo` 1603–1644). Never-upgraded starters drop off the persisted bar. |
| Draft / version / rollback | `adminSetSpellConfig` writes the live map after `validateSpellConfig` (`main.mo` 848–858). No revision store. |
| Enemy hard delete | `adminDeleteEnemyConfig` is still `remove` (`main.mo` 777–783). |
| Boss seed ids | `defaultBossConfigs()` still lists `fireball`, `cursed_gust`, `entangle`, `mist_form`, `blood_nova`, `obliterate`, `poison_dart`, `ice_shard`, `meteor_strike`, `plague_wave`, `inferno`, `frost_nova` (`admin.mo` 350+). Those ids are purged every start. |

### 2.3 Three SpellConfig shapes (updated)

| Layer | Path | Now stores | Still missing vs combat |
| :--- | :--- | :--- | :--- |
| Motoko persist | `admin.mo` 92–126 | 08-31 fields **plus** summon block + `cooldown` | `targetType`, area, buff/debuff/DoT, mechanic flags, acquisition, lifecycle, effects list |
| Bindgen | `backend.ts` 115–145 | 08-31 fields + `cooldown`. **No summon block.** | Everything Motoko just added, plus all combat-only fields |
| Engine / UI | `gameTypes.ts` 160–241 | `targetType`, area, buffs, DoT, `isSwap`/`isMirror`/`isTimestep`/`isSacrifice`/`isBarrier`/`isTrap`/`isMark`, summon | Those fields never survive a canister round-trip |

`spellEngine.ts` 6–13 still documents that combat reads the **frontend** fields, including `targetType` and mechanic flags.

Saving a summon from Admin today: editor cannot set summon fields; bindgen cannot encode them; Motoko will not receive them even after an actor upgrade.

---

## 3. Superseding rule: lifecycle ≠ `usableByPlayer`

Restate 08-31 §4 and §8 so the partial implementation cannot be extended.

| Field | Meaning | Must not mean |
| :--- | :--- | :--- |
| `usableByPlayer` | Cast/equip gate **after** ownership (and `minLevel`) | Retired, ENEMY_ONLY, draft, hidden |
| `usableByEnemy` | Hostile AI may resolve this id | Learnable, in a pool, or published |
| `lifecycle` | `draft \| active \| inactive \| retired` | Anything about who can cast |
| `PLAYER_LEARNABLE` | May enter `ownedSpellIds` | `usableByPlayer` |
| `acquisition.route` | How a player learns it | Inferred from the two usable flags |

`ENEMY_ONLY` / `BOSS_ONLY`: `PLAYER_LEARNABLE = false`, `usableByEnemy = true`, `lifecycle = active`. Players never own them. Setting `usableByPlayer = false` on those ids is **correct as a cast gate** and **wrong as the only retire signal**.

**Already-owned retired spells** (08-31 §8.2, unchanged):

1. Do not strip `ownedSpellIds`, `spellLevelKeys` / `spellLevelValues`, or `spellBarOrder`.
2. `setSpellBarOrder` keeps the id if owned (not “must be in `spellLevelKeys`” and not “must be `usableByPlayer`”).
3. `upgradeSpell` stays legal for owned retired ids. New players cannot obtain the id.
4. Spellbook shows a Retired seal. Combat reads the frozen `retiredRevision`.
5. New achievement grants skip a retired reward id and still pay Doka.
6. Live kits ignore retired ids at resolve time (log once). Activate of a kit that still lists them is blocked.

Today’s `upgradeSpell` check (`usableByPlayer=false` and not in `spellLevelKeys`) is the **only** correct fragment. It must key off `lifecycle = retired` (or a dedicated tombstone), not the cast flag. Owned-but-never-upgraded retired ids are **not** in `spellLevelKeys` today, so the current check would reject the legacy upgrade the contract requires.

Hard delete remains legal **only** for `draft` with zero published revisions and zero refs (players, kits, bosses, achievements). `adminDeleteSpellConfig` must return `#err` plus a dependency report otherwise.

---

## 4. Ownership helper is inverted

`shouldIncludeBackendSpellInLibrary` (`adminSafety.ts` 310–318):

```
if (usableByPlayer !== false) return true;
return ownedSpellIds.has(spellId);
```

Wired at `WorldExploration.tsx` 2424–2436. The `ownedIds` set is `baseSpells ∪ spellLevelKeys ∪ spellBarOrder`. `baseSpells` is **every** `starterSpells` row with `isBaseSpell: true` (2393–2406).

So:

- A new Admin spell with default `usableByPlayer: true` is still granted to every account on next hydrate.
- `usableByPlayer: false` hides the id unless it already appears on keys/bar — that is a **retire carve-out**, not an ownership split.
- There is still no observation log and no grant writer.

08-31 SDA-002 remains the persist work. 09-01-003 is “do not treat the helper as that work.”

Migration when 002 is implemented (unchanged): seed `ownedSpellIds` from `SYSTEM_ONLY` / innate four ∪ `spellLevelKeys` ∪ resolving `spellBarOrder` ids. **Do not** grant `getSpellConfigs()`. **Do not** grant the full `starterSpells` array.

---

## 5. Bindgen / actor lag (same class as 15-field CharacterStats)

Motoko persist now requires summon fields. Bindgen `to_candid_record_n16` does not send them. `toBackendSpellConfig` does not add them.

Until bindgen and the live actor match:

- Admin Save against an **upgraded** actor can fail Candid (missing record fields).
- Admin Save against a **lagging** actor silently drops summons even if the editor later grows the form.

Ship Motoko + bindgen + editor + migration together. Do not `dfx deploy` `backend_extended/`.

`targetType` is still frontend-only. That is the remaining half of SDA-2026-08-31-001.

---

## 6. Dependency scan that cannot see the graph

`_spellReferencedByPlayers` only walks character level keys and bar slots. It cannot see:

- `BossPhaseConfig.spellPoolIds` (and those pools already list purged ids)
- Future `EnemyKit` lists / today’s `ENEMY_KITS`
- Achievement / challenge reward ids (none exist yet)
- Summon kits
- Characters who “own” the id only because the catalog was unioned into `ownedSpells`

Therefore a custom spell that was never upgraded can still be **hard-deleted** while every player’s spellbook still shows it from the catalog union. The confirm dialog’s warning is accurate for that path and **false** for the built-in / referenced path (which only flips `usableByPlayer`).

Required inspector (08-31 §7), computed from **ids**:

Spell → enemies, achievements, challenges, bosses, AI modules, acquisition routes.  
Achievement → conditions, `spellRewardIds`, `requiresAchievementIds` / `requiresSpellIds`.

---

## 7. Required definition fields (activate gate — unchanged)

A definition cannot leave `draft` → `active` unless:

- id (`^[a-z][a-z0-9_-]{1,47}$`), name, description
- `targetType` (`self | ally | enemy | ground | area | line | all`)
- `minRange` ≤ `maxRange` ≤ 20
- `apCost` 0–12; `0` legal only with `isTimestep` or explicit `allowZeroAp` (not a name check)
- `cooldown` 0–10 (editor field exists; keep it)
- at least one explicit effect (typed variant or today’s metadata flags — never `spell.name`)
- if summon: complete `SummonUnitDef` + `summonAI` enum + `displayName` + `freeCells` + `targetType = ground`
- if enemy-usable: pool membership **or** an explicit `ENEMY_ONLY` / `BOSS_ONLY` route with a kit/boss ref
- acquisition block filled (`ENEMY_DISCOVERY` default + `OBSERVATION_REQUIRED` / `VICTORY_REQUIRED` / `PLAYER_LEARNABLE`)
- no name-heuristic fields

`validateSpellConfig` today is a payload clamp, not this gate. `AdminGuard` AP `< 1` reject must be replaced when Timestep (or any zero-AP flag) is persisted.

---

## 8. Acquisition, discovery, pools (contract pointer)

Unchanged from 08-31 §§4–6 and the sibling [`SPELL_DISCOVERY_ECOSYSTEM_2026-08-31.md`](./SPELL_DISCOVERY_ECOSYSTEM_2026-08-31.md):

```
eligible unknown spell
  → enemy kit actually contains the id
  → enemy successfully casts it
  → observed (persist)
  → player wins that encounter
  → ownedSpellIds + root recap
```

Routes: `ENEMY_DISCOVERY` | `ACHIEVEMENT` | `CHALLENGE` | `BOSS` | `ELITE` | `SPECIAL_ENCOUNTER` | `MULTI_SOURCE` | `ENEMY_ONLY` | `BOSS_ONLY` | `SYSTEM_ONLY`.

Pools: `CORE` | `ADVANCED` | `RARE` | `ELITE` | `SIGNATURE`.

Possession is not observation. Player-side summons do not observe. Hostile summons may. `upgradeSpell` is never the grant writer.

---

## 9. Owner UI (dev-gated — still the 08-31 studio)

Tabs: Library, Editor, Discovery, Kits, Feats, Graph, Versions. Carved-stone / slate / crimson. Same `#admin` + lazy `AdminDashboard` gate.

Immediate UI honesty (can land with 001/004, not a restyle):

- Delete on published ids is **Retire**. Confirm lists dependents. Toast must say retired vs rejected vs draft-deleted.
- Cast-gate checkboxes stay labeled “player may cast” / “enemy may cast.” Lifecycle is a separate control.
- Validation strip: missing `targetType`, broken kit id, name-heuristic leftover = crimson.

Do not grow the 7k-line dashboard until activate exists on the canister (08-31 SDA-012 / 09-01-013).

---

## 10. 08-31 ACTION_ID status @ `dd275aa`

| ID | Status | Note |
| :--- | :--- | :--- |
| SDA-2026-08-31-001 | **PARTIAL** | Cooldown + Motoko summon fields landed. `targetType` / mechanics / bindgen summons / editor summons did not. |
| SDA-2026-08-31-002 | **OPEN** | Helper is not ownership. Catalog still grants. |
| SDA-2026-08-31-003 | **OPEN** | No route enum; flags still the two usable bools. |
| SDA-2026-08-31-004 | **OPEN** | No observe/commit APIs. |
| SDA-2026-08-31-005 | **PARTIAL / WRONG FIELD** | Soft-retire exists as `usableByPlayer=false`. Hard delete still exists. No graph. |
| SDA-2026-08-31-006 | **OPEN** | Name set, summon displayName, `inferSummonArchetype` unchanged. |
| SDA-2026-08-31-007 | **OPEN** | Starters not seeded; `physical_attack` still purged. |
| SDA-2026-08-31-008 | **OPEN** | `ENEMY_KITS` + hardcoded wolf/archer. |
| SDA-2026-08-31-009 | **OPEN** | Boss seeds still purged ids. |
| SDA-2026-08-31-010 | **OPEN** | Feats/challenges still Doka/XP/badge. |
| SDA-2026-08-31-011 | **OPEN** | No revisions. Save = live write. |
| SDA-2026-08-31-012 | **OPEN** | Confirm dialog only. |
| SDA-2026-08-31-013 | **OPEN** | Bar filter still `spellLevelKeys`. |

Next implementer still starts at **08-31 001 remainder + 002 + 007**, but must apply **09-01-001 first** so 005 is not extended on `usableByPlayer`.

---

## 11. Out of scope

- Production TypeScript / Motoko / Candid in this PR
- RAF, map generation, turn logic, damage math
- Growing `WorldExploration.tsx`
- Re-authoring Wave-1 spell cards (`SPELL_DISCOVERY_ECOSYSTEM`) or boss adaptations (`BOSS_AND_SPELL_DISCOVERY.md`)
- Treating `adminSafety.ts` helpers as the finished lifecycle

---

## 12. ACTION_ID index (this run)

All items: `STATUS: NEW`. Full records: [`ACTION_IDS_SDA_2026-09-01.md`](./ACTION_IDS_SDA_2026-09-01.md).

| ID | Title | Priority |
| :--- | :--- | :--- |
| SDA-2026-09-01-001 | Separate lifecycle from `usableByPlayer` | P0 |
| SDA-2026-09-01-002 | Align bindgen + adapters with Motoko summon fields | P0 |
| SDA-2026-09-01-003 | Stop treating the library helper as ownership | P0 |
| SDA-2026-09-01-004 | Real dependency report; hard-delete only drafts | P0 |
| SDA-2026-09-01-005 | Persist `targetType` and combat mechanic flags | P0 |
| SDA-2026-09-01-006 | Activate-gate validator (AP 0 exception, required metadata) | P1 |
| SDA-2026-09-01-007 | Seed starters; remove `physical_attack` from purge | P0 |
| SDA-2026-09-01-008 | Replace remaining name heuristics | P0 |
| SDA-2026-09-01-009 | Acquisition flags + observe→win→unlock | P0 |
| SDA-2026-09-01-010 | Admin-authored CORE–SIGNATURE pools | P1 |
| SDA-2026-09-01-011 | Repair boss `spellPoolIds`; honest retire UI | P1 |
| SDA-2026-09-01-012 | Achievement / challenge `spellRewardIds` | P1 |
| SDA-2026-09-01-013 | Draft / validate / activate / rollback / compare / duplicate | P1 |
| SDA-2026-09-01-014 | Persist bar from ownership, not only upgrade keys | P1 |
