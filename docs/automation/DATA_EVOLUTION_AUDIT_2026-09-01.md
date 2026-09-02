# Player data evolution audit — 2026-09-01

**Guardian:** Save / Data Evolution Guardian  
**Trigger:** cron `0 */48 * * *`  
**HEAD:** `dd275aa` (Caffeine import gates)  
**Gameplay systems not touched:** RAF, map generation, turn logic, damage math  

This run does **not** approve any new required persist field and does **not** attach `(with migration)` to live `main.mo`.  
It does **not** clone draft Motoko from #209 / #215 (level ignore, keep-store spell arrays, Boss Rush run count, HP-cap tighten).

Landed this run (behavior-only, no schema):

- `WorldExploration.tsx` **3230** — `xpForNextLevel(savedLevel)` (closes the last SDEG-010 Number overflow on HUD init)
- `absoluteStatsClamp.test.ts` — locks “never adopt a client level” (canister still writes `min` until #209/#215)

## Cohort questions

| Player | What happens today |
| :--- | :--- |
| Created yesterday | 12-field Character, leftover XP, per-principal Doka, empty or upgraded `spellLevelKeys`, optional session fields default null. Loads. Buff potions exist only in this browser’s `*_inventory`. UI “owns” every **usableByPlayer** catalog spell (`shouldIncludeBackendSpellInLibrary` returns true unless retired). |
| Created six months ago | Same maps if the canister stayed on this actor. A live 15-field actor (`wp`/`wr`/`scp`) still rejects 12-field saves (SDEG-011). `spellLevelKeys` may hold purged ids (`fireball`, …). UI hides them by **name and id**; `upgradeSpell` returns `Spell not found`. |
| Created before a feature | Optional Character fields default null. Dungeon/rush/achievement maps miss the principal → 0/[]/null. Challenges are session-only. **Unsafe** if a required field is added without SDEG-001. New rollback stables (`*Prev`, `adminAuditLog`) exist on source; they are not on `20260827` NewActor. |
| Created before a spell/enemy rename | No alias table. `OLD_SPELL_IDS` is deleted from `spellConfigs` on **every** start/upgrade, including live starter `physical_attack`. Frontend `OLD_SPELL_NAMES_SET` also matches display names. Enemy/boss ids are config-only (not on Character) unless a kit later persists them. |
| Owns now-retired content | Arrays keep the id. Retired catalog (`usableByPlayer = false`) stays in the library only if already in keys/bar/starters. `upgradeSpell` allows a **new** pay-unlock of any `usableByPlayer` id. `setSpellBarOrder` drops ids not in `spellLevelKeys` (starters never persist unless upgraded). Achievement delete with progress now soft-retires (`active = false`); claim still works. `adminDeletePlayerSpriteConfig` does not delete the Character. WX `chessPiecePatterns[pieceType]` has **no** fallback (unlike `getCreaturePattern`). |

## Surface matrix

| Surface | Persist | Defaults / migration | ID stability | Stale overwrite | Unbounded level | Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| CharacterStats (12) | Required on Character | No 15→12 migration on live actor | n/a | `updateCharacter` keeps stored stats | HP cap `level*200+100` grows; AP/MP cap 20 | Live contract OK; deploy path not (SDEG-011) |
| Level / leftover XP | Character.level / experience | `applyRewards` Nat loop | n/a | `saveBattleStats` still `min` for XP **and level** | Motoko Nat OK; HUD init now bigint helper | Level demote open (09-01-001); generation still missing |
| Doka | `dokaBalances[Principal]` | Missing → 0 | n/a | Absolute snapshot; persist lock; mint clamp | Nat OK; **per-call 100_000 clamp** | Lock OK; high-level rolls truncated (09-01-004) |
| Owned spells | Implicit catalog ∪ starters | Empty keys ≠ “owns starters” on canister | Purge + name filter | `updateCharacter` union+max (can mint ids) | n/a | Not future-safe (004; 09-01-002) |
| Spell levels | Parallel arrays; `upgradeSpell` only | `saveBattleStats` ignores arrays | Same as owned ids | Union+max can **raise** paid levels | Cost `base*2^level` is Nat | 009 landed; keep-store is the next step |
| Discovery | **None** | Everyone sees current usable catalog | Names used in OLD set | `upgradeSpell` grants any usable id | `minLevel` 30 on void_collapse is content | 004 |
| Achievements | `principal#id` progress | Missing → locked | Delete-with-progress now retires | Claim one-shot; reward is **current** config | `level_10` is a feat, not a cap | 008 narrowed |
| Challenges | Session + `applyRewards` | Old players have no history (OK) | Catalog ids in `challengeCompletion.ts` | n/a | n/a | Do not persist without optional fields |
| Inventory / purchases | Canister shop + unused buff map; BuffShop localStorage | Version gate keeps `*_inventory` | itemId strings | #107-class in-flight buy | n/a | 005 |
| Dungeon | Principal map | Missing → null; update seeds zeros | n/a | `totalMapsCompleted + 1` every call; depth clamped 16 | Float multiplier | 007 |
| Boss Rush | `principal#slot` | Missing → (0,0,0); create/delete clear | Room 0–9 | Room 9 run count ++ (#209 vehicle) | n/a | 007 |
| Config refs | Admin maps, empty-only seeds | 20260831 is check-stable tail | Text ids; boot purge (bad) | n/a | Region `levelMax` is content | 003; 09-01-005 |
| Visuals | `pixelPattern` JSON + `pieceType`; optional sprite URLs | `getCreaturePattern` → king.front | pieceType strings | Appearance edit replaces pattern (intended) | n/a | URLs not mandatory (**pass**). WX index can crash (09-01-006) |

## Unbounded progression

- Backend `applyRewards` / Doka / spell cost use `Nat`. No stored max player level.
- Frontend `xpForNextLevel` uses bigint thresholds; HUD saturates at `MAX_SAFE_INTEGER`.
- Do not treat `spellFailReductionPerLevel` “0% at 200”, Death Realm `maxLevel: 5`, or `clampDungeonDepth` 16 as player caps.
- **New:** `applyRewards` rejects `dokaDelta > 100_000` / `xpDelta > 500_000`. Official client **clamps** to those maxima so persist cannot `#err`. Victory Doka is a 0.01% band of `level * [1, 1e9]` (and dungeon 4× + Doka Fever 2×). From low levels the max roll already exceeds 100k — leftover Doka is silently dropped. That is a hidden payout cap, not a mint guard.
- `getEnemyHPForLevel` (`main.mo` 2575–2581) still uses `Float` — precision loss at extreme levels (do not change without a human; adjacent to combat math).
- Draft #209 tightens `saveBattleStats` HP cap from `level*200+100` to the linear official max. That is a silent HP cut for any row stored under the old cap. **Not approved** (09-01-003).

## Visuals

Owner-uploaded URLs (`PlayerSpriteConfig.*Url`, `EnemyConfig.spriteUrl`, ad `imageUrl`, purchase `proofFileUrl`) remain optional or non-gameplay. `adminDeletePlayerSpriteConfig` removes the config only; Character is `pieceType` + `pixelPattern`. `getCreaturePattern` falls back to `chessPiecePatterns.king.front`.

**Keep:** never make a URL required on Character or combatant persist.

**Gap:** WX portrait/RAF still indexes `chessPiecePatterns[pieceType]` directly (3737, 8925). An unknown/retired `pieceType` throws instead of falling back. Official create/update reject unknown types; a six-month row or a future piece rename can still crash the session.

## Spell discovery (future-proof)

There is still no `ownedSpellIds` / `observedSpellIds` / `recordSpellObservation`. Preserving future discovery requires:

1. Stable **ids** (stop name filters and every-upgrade purge of live starters).
2. A stored ownership set (empty keys on old rows must mean “starters + upgraded ids”, not “owns nothing” and not “owns the whole catalog”).
3. `upgradeSpell` must not grant an unowned catalog id.
4. Achievement/challenge/boss grants must write ids, not names, and skip retired ids.
5. Bar filter = owned ∪ starters, not `spellLevelKeys` only.

Do not implement that schema until SDEG-001/002 (live migration annotation + matching inlined types).

## Migration analysis (do not attach)

| Module | Role | Live-upgrade safe? |
| :--- | :--- | :--- |
| `20260826_000000.mo` | Empty-canister genesis | Only for fresh import |
| `20260827_000000.mo` | Drop transients; full player maps; SpellConfig **without** summon fields | Pass-through of then-current shape |
| `20260831_000000.mo` | OldActor = `{ spellConfigs }` only; NewActor adds summon fields + rollback stables | **No.** Applying this to a populated actor would drop `characterSlots`, `dokaBalances`, achievements, dungeon, rush, … |

Live `main.mo` line 40 is still `actor {` (no annotation). `mops.toml` `check-limit = 3` is for Caffeine empty-previous / `.old` baseline, not a populated canister.

`20260827` NewActor also lacks `adminAuditLog` and `*Prev` vars that live source now has (`main.mo` 618, 663, 1366, 1501–1502).

## What this run will not approve

- New required Character / stats / config fields
- Attaching the current chain to live `main.mo`
- Cloning #209 / #215 Motoko
- #209 HP-cap tighten as a silent migration
- Hard spell-id remap without an alias table and a one-shot generation
- Persisting challenges onto required Character fields

## Open vehicles (do not clone)

| Draft PR | Overlap | Guardian stance |
| :--- | :--- | :--- |
| #209, #215 | `saveBattleStats` keep stored level | Approve (matches `clampSaveBattleStatsWrite`) |
| #209, #215 | `updateCharacter` keep stored spell arrays | Approve over union+max (closes mint; still prevents wipe) |
| #209 | Boss Rush `totalBossRushRuns` once per master | Approve (SDEG-007 rush half) |
| #209 | HP cap → linear official max | **Reject** until cohort HP vs old cap is proven |

## Landed this run (read-back)

- `src/frontend/src/components/WorldExploration.tsx` **3230** `xpForNextLevel(savedLevel)`
- `src/frontend/src/utils/absoluteStatsClamp.test.ts` client-level=1 case
