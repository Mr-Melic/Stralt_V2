# Player data evolution audit — 2026-08-31

**Guardian:** Save / Data Evolution Guardian  
**Trigger:** cron `0 */48 * * *`  
**HEAD:** `22503b5` (`#110` solvability) on top of `#111` persist races  
**Gameplay systems not touched:** RAF, map generation, turn logic, damage math  

This run does **not** approve any new required persist field. Two behavior-only hardenings landed (spell-level merge, bigint XP helpers). Schema adds stay blocked until SDEG-2026-08-31-001/002.

## Cohort questions

| Player | What happens today |
| :--- | :--- |
| Created yesterday | 12-field Character, leftover XP, per-principal Doka, empty or upgraded `spellLevelKeys`, optional session fields default null. Loads. Buff potions exist only in this browser’s `*_inventory`. Owns every **current** catalog spell in the UI (not a stored grant). |
| Created six months ago | Same stable maps if the canister stayed on this actor. If the live canister is still 15-field (`wp`/`wr`/`scp`), 12-field saves fail at Candid (SDEG-011). `spellLevelKeys` may still hold purged ids (`fireball`, …). UI hides them; `upgradeSpell` rejects them (SDEG-003). |
| Created before a feature | Optional Character fields (`spellBarOrder`, `bossRushMasterComplete`, …) default null and merge on update. Dungeon/rush/achievement maps miss the principal → queries return 0/[]/null. Challenges are session-only; old players just start them. **Unsafe** when a future required field is added without SDEG-001. |
| Created before a spell/enemy rename | IDs are not aliased. `OLD_SPELL_IDS` is deleted from `spellConfigs` every upgrade. Frontend also filters by **name**. Ownership in `spellLevelKeys` is not remapped. Enemy/boss ids are config-only (not stored on the character) — rename is cosmetic unless kits persist those ids. |
| Owns now-retired content | Arrays keep the id. Bar save drops it if not in `spellLevelKeys` (starters) or if the load filter uses `ownedSpells` (retired catalog). Upgrade fails. Achievement delete (hard) blocks claim. Retired visual: `pieceArt` falls back to `king.front`; `spriteUrl` is optional — characters do not corrupt. |

## Surface matrix

| Surface | Persist | Defaults / migration | ID stability | Stale overwrite | Unbounded level | Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| CharacterStats (12) | Required on Character | No 15→12 migration on live actor | n/a | `updateCharacter` monotonic level/kills; HP cap uses **supplied** level | HP cap `level*200+100` grows; AP/MP cap 20 is a stat cap | Live contract OK; deploy path not (SDEG-011) |
| Level / leftover XP | Character.level / experience | applyRewards Nat loop | n/a | saveBattleStats absolute; #107 clamps up | Motoko Nat OK; JS Number not (SDEG-010) | Helper fixed; generation still missing (SDEG-006) |
| Doka | `dokaBalances[Principal]` | Missing → 0 | n/a | Absolute snapshot; persist lock; #107 clamp up | Nat OK | Lock OK; generation still missing |
| Owned spells | Implicit catalog ∪ starters | Empty keys ≠ “owns starters” on the canister | Purge + name filter (SDEG-003/004) | updateCharacter replaced arrays — **merged this run** (SDEG-009) | n/a | Not future-safe |
| Spell levels | Parallel arrays; `upgradeSpell` only | saveBattleStats ignores arrays | Same as owned ids | SDEG-009 max/union | Cost `base*2^level` is Nat | Paid levels safer |
| Discovery | **None** | Everyone sees current catalog | Names used in OLD set | n/a | `minLevel` 30 on void_collapse is content, not a cap | SDEG-004 |
| Achievements | `principal#id` progress | Missing → locked | Delete drops config | Claim is one-shot | `level_10` is a feat, not a cap | SDEG-008 |
| Challenges | Session refs + applyRewards | Old players have no history (OK) | Catalog ids in `challengeCompletion.ts` | n/a | n/a | Do not persist without optional fields |
| Inventory / purchases | Canister shop + **unused** buff map; BuffShop localStorage | Version gate keeps `*_inventory` | itemId strings | #107 in-flight buy | n/a | SDEG-005 |
| Dungeon | Principal map | Missing → null; update seeds zeros | n/a | +1 maps on every call | Float multiplier | SDEG-007 |
| Boss Rush | `principal#slot` | Missing → (0,0,0); create/delete clear | Room 0–9 | Room 9 run count ++ | n/a | SDEG-007 |
| Config refs | Admin maps, seeded if empty | Empty-only seeds (good) | Text ids; boot purge (bad) | n/a | Region levelMax is content | SDEG-003 |
| Visuals | `pixelPattern` JSON + `pieceType`; optional sprite URLs | Fallback king.front | pieceType strings | Appearance edit replaces pattern (intended) | n/a | **Pass** — URLs not mandatory |

## Unbounded progression

- Backend `applyRewards` / HP cap / Doka / spell cost use `Nat`. No stored max level.
- Frontend `xpForNextLevel` now uses bigint thresholds (SDEG-010). HUD saturates at `MAX_SAFE_INTEGER` so bars do not become `Infinity`.
- Do not treat `spellFailReductionPerLevel` “0% at 200” or Death Realm `maxLevel: 5` as player caps.
- `getEnemyHPForLevel` (`main.mo` 2087–2093) uses `Float` — silent precision loss at extreme levels (do not change without a human; adjacent to combat math).

## Visuals

Owner-uploaded URLs (`PlayerSpriteConfig.*Url`, `EnemyConfig.spriteUrl`, ad `imageUrl`, purchase `proofFileUrl`) are optional or non-gameplay. `pieceArt.ts` falls back to `chessPiecePatterns.king.front` when `pieceType` is unknown. Deleting a sprite config does not delete the Character. **Keep this invariant:** never make a URL required on Character or combatant persist.

## What this run will not approve

- New required Character / stats / config fields
- Attaching `(with migration = …)` until inlined types match (SDEG-002)
- A second `saveBattleStats` clamp PR while #107 is open (SDEG-012)
- WorldExploration recap XP formula changes while #108 is open
- Hard remap of spell ids without an alias table and a one-shot flag

## Landed this run (read-back)

- `src/backend/main.mo` `_mergeSpellLevels` **148–187**; `updateCharacter` merge **295–304**
- `src/frontend/src/utils/xpCurve.ts` `xpThresholdBigInt` / saturating `xpForNextLevel`
- `src/frontend/src/utils/deathPenalty.ts` **167** `expToNext: xpForNextLevel(level)`
- `src/frontend/src/components/CharacterSelection.tsx` **29–32**, **393–394**
