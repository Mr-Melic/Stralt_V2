# Player data evolution audit — 2026-09-02

**Guardian:** Save / Data Evolution Guardian  
**Trigger:** cron `0 */48 * * *`  
**HEAD:** `58302bc` (GameKey shop #258)  
**Gameplay systems not touched:** RAF body, map generation, turn logic, damage math  

This run does **not** approve any new required persist field and does **not** attach `(with migration)` to live `main.mo`.  
It does **not** clone #259 (EOP GameKey migration). Stack: #259 is the only older open PR; this branch does not overlap its files.

## Landed this run (behavior-only, no schema)

- `AdminGuard.persistHpWriteCap` **553–556** + `saveBattleStats` **1990–1996** — grandfather stored HP above the live linear cap (SDEG-2026-09-02-003). Death/incoming-lower still cuts.
- `getPersistedPiecePattern` **653–658** — WX portrait **3680** + player draw **8342** (SDEG-2026-09-01-006). Sprite URLs remain optional.

## Cohort questions

| Player | What happens today |
| :--- | :--- |
| Created yesterday | 12-field Character, leftover XP, per-principal Doka, empty or upgraded `spellLevelKeys`. `updateCharacter` keeps stored progression. `saveBattleStats` ignores client level. GameKey maps exist on source; live Caffeine upgrade still traps until #259. Buff potions still `${principal}_inventory`. UI still shows every `usableByPlayer` catalog spell. |
| Created six months ago | Same maps if the canister stayed on this actor. 15-field live actor still rejects 12-field saves (SDEG-011). `spellLevelKeys` may hold purged ids; UI hides by **name and id**; `upgradeSpell` → `Spell not found`. HP stored under `level*200+100` is no longer cut on the next absolute write. |
| Created before a feature | Optional Character fields default null. Dungeon/rush/achievement maps miss the principal → 0/[]/null. Challenges are session-only. **Unsafe** if a required field is added without SDEG-001. GameKey is a new map set — empty defaults only after #259. Old KYC `purchaseRecords` pending rows never auto-complete (`processPendingPurchases` returns 0). |
| Created before a spell/enemy rename | No alias table. `OLD_SPELL_IDS` still deleted from `spellConfigs` on **every** start/upgrade, including live starter `physical_attack`. Enemy/boss ids are config-only unless a kit persists them. Unknown `pieceType` now paints king.front instead of throwing. |
| Owns now-retired content | Arrays keep the id. Retired catalog stays in the library only if already in keys/bar/starters. `upgradeSpell` still appends any usable catalog id on first paid upgrade. `setSpellBarOrder` drops ids not in `spellLevelKeys`. Achievement delete-with-progress soft-retires; claim still pays **current** `dokaReward`. `adminDeletePlayerSpriteConfig` does not delete the Character. |

## Surface matrix

| Surface | Persist | Defaults / migration | ID stability | Stale overwrite | Unbounded level | Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| CharacterStats (12) | Required on Character | No 15→12 migration on live actor | n/a | `updateCharacter` keeps stored stats | HP write cap now grandfathers stored | Live contract OK; deploy path not (SDEG-011) |
| Level / leftover XP | Character.level / experience | `applyRewards` Nat loop | n/a | Client level ignored (#209/#215) | Motoko Nat OK; HUD bigint helper | Generation still missing (SDEG-006) |
| Doka | `dokaBalances[Principal]` | Missing → 0 | n/a | Absolute snapshot; persist lock; mint clamp | Nat OK; **per-call 100_000 clamp** | High-level rolls truncated (09-01-004) |
| Owned spells | Implicit catalog ∪ starters | Empty keys ≠ “owns starters” on canister | Purge + name filter | Appearance keep-store (no mint) | n/a | Not future-safe (SDEG-004) |
| Spell levels | Parallel arrays; `upgradeSpell` only | `saveBattleStats` ignores arrays | Same as owned ids | Keep-store on appearance | Cost `base*2^level` is Nat | Paid path OK; discovery grant hole remains |
| Discovery | **None** | Everyone sees current usable catalog | Names used in OLD set | `upgradeSpell` grants any usable id | `minLevel` 30 is content | SDEG-004 |
| Achievements | `principal#id` progress | Missing → locked; server checks level/doka/spell feats | Delete-with-progress retires | Claim one-shot; reward is **current** config | `level_10` is a feat | SDEG-008 |
| Challenges | Session + `applyRewards` | Old players have no history (OK) | Catalog ids | n/a | n/a | Do not persist without optional fields |
| Inventory / purchases | Canister shop leftover + unused buff map; BuffShop localStorage; **GameKey** | #258 added GameKey stables **into shipped 20260831** | GameKey 120-char codes | Redeem is one-shot; credits **redeemer** | `nextGameKeyRequestId` wraps at 1e9 | #259 is the migration vehicle; KYC pending orphaned |
| Dungeon | Principal map | Missing → null; update seeds zeros | n/a | `totalMapsCompleted + 1` every call; depth 16 | Float multiplier | SDEG-007 dungeon half |
| Boss Rush | `principal#slot` | Missing → (0,0,0); create/delete clear | Room 0–9 | Run count once per master (#209) | n/a | Rush half **done** |
| Config refs | Admin maps, empty-only seeds | 20260831 stuffed then frozen-wrong on main; #259 adds 20260901 | Text ids; boot purge (bad) | n/a | Region `levelMax` is content | Do not restuff shipped NewActor |
| Visuals | `pixelPattern` JSON + `pieceType`; optional sprite URLs | Unknown pieceType → king.front | pieceType strings | Appearance replaces pattern (intended) | n/a | URLs not mandatory (**pass**) |

## Unbounded progression

- Backend `applyRewards` / Doka / spell cost use `Nat`. No stored max player level.
- Frontend `xpForNextLevel` uses bigint thresholds; HUD saturates at `MAX_SAFE_INTEGER`.
- `applyRewards` still rejects `dokaDelta > 100_000` / `xpDelta > 500_000`. Official client clamps. Victory 0.01% of `level * [1, 1e9]` still exceeds the cap.
- Official victory HP floor `50 + level*10` exceeds linear persist max from **level 10** at 5% growth (`150` vs `145`). Grandfather does not save the **first** write of 150 onto a 100-HP row (SDEG-2026-09-02-001).
- `getEnemyHPForLevel` still uses `Float` — do not change without a human.
- `nextGameKeyRequestId` wraps `999_999_999 → 1` and can collide (`gameKeyRequests.add`).

## Visuals

Owner-uploaded URLs remain optional or non-gameplay. Deleting a sprite config does not delete the Character. Portrait/player draw no longer index `chessPiecePatterns[pieceType]` directly.

**Keep:** never make a URL required on Character or combatant persist.

## Spell discovery (future-proof)

Still no `ownedSpellIds` / observe / commit APIs. Do not add those required fields until SDEG-001/002 (and after #259’s GameKey tail, as a **new later** file — never edit 20260831 or 20260901 NewActor).

## Migration analysis (do not attach full chain; do not clone #259)

| Module | Role | Live-upgrade safe? |
| :--- | :--- | :--- |
| `20260826_000000.mo` | Empty-canister genesis | Only for fresh import |
| `20260827_000000.mo` | Drop transients; full player maps; SpellConfig **without** summon fields | Pass-through of then-current shape |
| `20260831_000000.mo` **on main** | NewActor **includes GameKey** (stuffed by #258 after Caffeine had applied the tail) | **No.** This is the IC0503 trap. |
| `20260901_000000.mo` **on #259** | OldActor = frozen 20260831 **without** GameKey; NewActor adds empty GameKey maps | **Yes** for GameKey only. Player maps stay orthogonal. **Approve.** |

Live `main.mo` is still `actor {` (no annotation). mops still injects the chain. Empty `.old` check-stable can pass while a populated Caffeine canister traps.

## What this run will not approve

- New required Character / stats / config fields
- Attaching the current chain to live `main.mo` as a player-data rewrite
- Editing shipped `20260831` / `20260901` NewActor (add a later file)
- Cloning #259
- Hard spell-id remap without an alias table and a one-shot generation
- Persisting challenges onto required Character fields
- Reverting the linear HP formula; grandfather is the persist mitigation

## Open vehicles (do not clone)

| Draft PR | Overlap | Guardian stance |
| :--- | :--- | :--- |
| #259 | migrations, mops.toml, EOP docs/gate | **Approve.** GameKey empty defaults. Restores frozen 20260831. Bumps `check-limit` 3→4. |
