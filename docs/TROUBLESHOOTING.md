# Setup and troubleshooting

## Environment

| Need | Notes |
| :--- | :--- |
| Node `>=16`, pnpm `>=7` | Root `package.json` engines |
| Motoko via Caffeine | `caffeine check --fix`, `caffeine build` |
| `dfx` | Often **missing** in this container. `mops build` then exits 127 |
| Frontend env | `src/frontend/env.json` (`backend_host`, `backend_canister_id`, II origin). Copied to `dist/` on build |

Verified from repo root:

```bash
pnpm typecheck
pnpm fix
pnpm build
pnpm bindgen    # after Candid / Motoko public-type changes
```

Frontend scripts (`src/frontend/package.json`): `dev` (Vite), `build`, `typecheck`, `check` / `fix` (Biome).

Caffeine GitHub → import frontend gate is exactly `src/frontend/caffeine.toml` `[check]`: `pnpm typecheck` then `pnpm check` (`biome check src`). `pnpm fix` is the same Biome run with `--write`. Unused locals and React hook deps are errors in `src/frontend/biome.json` so local `pnpm check` fails the same way as the import.

Local UI without a canister:

```bash
VITE_USE_MOCK=true pnpm --filter '@caffeine/template-frontend' dev
```

`useActor` then returns the shared `mocks/backend.ts` instance so every hook sees the same in-memory actor.

## Bindgen and Candid

After changing public Motoko types or methods:

1. Rebuild the backend so `src/backend/dist/backend.did` updates.
2. Run `pnpm bindgen`.
3. Commit `src/frontend/src/backend.ts`, `backend.d.ts`, and `src/frontend/src/declarations/*` together.

Trust `src/frontend/src/backend.ts`. The root `declarations/backend/` tree is a stale 15-field snapshot (`wp` / `wr` / `scp`) and will mislead hand-written clients.

## Common pitfalls

### Character save rejected (missing field)

Candid requires **all 12** `CharacterStats` fields. Omitting `killCount` (or any other field) fails at serialize time, before Motoko runs.

Fix: always send the full record. Carry `character.stats.killCount` or `0n` on create.

`updateCharacter` then applies Motoko checks:

- `hp <= level * 200 + 100`
- `ap <= 20`, `mp <= 20`
- `level` and `killCount` cannot decrease
- `colors.length <= 16`
- slot must already exist

### Profile create rejected

`saveCallerUserProfile` writes the payload as-is (no field merge). `{ name }` without `uiLayout` fails Candid. New accounts must send `uiLayout: ""`.

### Rewards applied twice, wiped, or not at all

- Persist **credits** (victory, portal XP, pickups, boss-rush room) only with `applyRewards` (`rewardResolver.ts` / `applyRewardsResult.ts`).
- Persist **penalties and spends** with `saveBattleStats` through the persist lock. `applyRewards` is `Nat`-only and cannot subtract.
- Do **not** call `updateCharacter` to write reward XP/Doka (or to debit the wallet — `Character` has no `dokaBalance`).
- Do **not** call `resolveBattleRewards` per kill. Death pipeline attributes kills into a list; victory calls the resolver once.
- Enqueue every credit **and** every `saveBattleStats` on `createProgressPersist`. A recap heal/shop click that snapshots the pre-credit wallet wipes the grant.
- Recap must stay mounted in `App.tsx`. Showing it from `WorldExploration` loses it on the battle → map transition.

`saveBattleStats` writes HP / AP / MP / atk / res / init / XP and the per-principal `dokaBalances` map. It **ignores** the spell-level arrays — `upgradeSpell` is the sole writer. It is not the battle-reward funnel.

### `dokaBalance` on `Character`

The field was removed from the Motoko `Character` type. Frontend `gameTypes.Character.dokaBalance` is a convenience alias. Bindgen drops unknown fields. Balance APIs: `getCallerDokaBalance`, `applyRewards`, admin grants.

### Recap heal refunds a just-claimed or just-won wallet

`saveBattleStats` is an absolute write. After victory / shop credit / feat claim, the recap is already clickable. A heal that reconstructs from the pre-credit snapshot (or from `getCallerDokaBalance` after a query invalidate) persists the old balance.

Fix: run the credit on the persist lock and `commit` the post-credit Doka. Add the granted delta onto the live UI (`applyShopCreditDeltaToUi`). Do not `invalidateQueries(['callerDokaBalance'])` after a persist-lock claim (`shouldInvalidateCallerDokaAfterClaim`). Once the world is hydrated, `shouldApplyCallerDokaHydrate` must stay false — window-focus refetch is the same class of bug.

### First-map death / idle hydrate writes Doka 0

The persist lock starts at `doka = 0` until an authoritative read or credit seeds it. GameFlow's pre-query state is also 0. A lava/combat death that penalizes that placeholder and `saveBattleStats`s it wipes the canister.

- `walletReady` is `queryResolved && sessionCacheApplied` — not merely “React Query has data”.
- Once seeded, `shouldCopyIdleWalletDoka` refuses any idle **cut** (stale pre-credit 50 over committed 550 is the same class).
- Unseeded death/heal must `resolveCommittedDokaForAbsoluteWrite` (live `getCallerDokaBalance`); skip the absolute write if the read fails.
- Do not `commit` a rename/feat delta stacked on the placeholder (`shouldCommitRenameDokaSpend`).
- Idle hydrate must not copy leftover XP from a lower UI level over a post-`applyRewards` level-up (`resolveHydratedXp`). That leftover refunds the death XP cut on the next `saveBattleStats`.

### Rename debit on a rejected name / stale click-time wallet

`renameCharacter` returns `{ #ok | #err }`. Candid resolves `#err` as a value — it does not throw. Parse with `readRenameCharacterResult` and debit only on `#ok`.

Debit `dokaBalanceRef` (live), not the click-time `dokaBalance - 100`. Recap is `pointer-events: none`, so a rename can finish after `applyRewards` credits the wallet. A stale subtract then lets idle hydrate persist the short wallet.

### Shop purchase never credits / nine-arg Candid reject

`initiatePurchase` is nine positional `Text` fields (`packageId`, name, surname, email, address, city, country, postal, proof URL). Passing one customer object fails at serialize time.

Credits are **not** instant: backend auto-completes pending records ≥ 60s. The client must call `processPendingPurchases` via `creditPendingPurchasesThroughPersist`. Shop-credit timers must **not** live in `pendingTimeoutsRef` — `cleanupBattle` clears that set on portal/death/victory (`shopCreditUsesBattleTimeoutSet` is false).

A 60s remount retry or a no-op complete still reads `getCallerDokaBalance`. Committing that absolute snapshot when `gained === 0` refunds a recap heal that landed while the timer was waiting. Commit only when `shouldCommitShopCredit(gained)` is true, and never cut a higher lock snapshot.

### Item shop spend refunds and items do nothing

`BuffShop` returns `null` unless `isOpen === true`. Host it in `WorldExploration` so buys go through `saveBattleStats` on the persist lock and uses reach `handleUseItem`. A `GameFlow`-only local deduct is restored on the next `getCallerDokaBalance` hydrate.

### Portal +10 XP appears then vanishes / unpaid XP persists

Portal step XP is `PORTAL_TRANSITION_XP` (10) through `persistIncrementalRewards`. Do **not** add it to the HUD before `applyRewards` commits. Optimistic leftover + a failed persist lets `hydrateWhenIdle` copy unpaid XP onto the lock; the next `saveBattleStats` writes it. After commit, still gate the live hydrate with `shouldApplyVictoryLiveHydrate` (death epoch) — lava on the new map can land while the write is in flight.

### Challenge XP advertised but never persisted

`handleBattleEnd` is a `useCallback` that omits `challengeAccepted` / `currentChallenge`. Pass the live accept flag and challenge from refs (`liveBattleChallengePersistEntries`). Persist both `dokaReward` **and** `xpReward` (hard/legendary objectives show 400–1000 XP). Persist only when `isChallengeCompleted` is true (`utils/challengeCompletion.ts`).

The opening player turn never goes through `advanceTurn`. Without `shouldCountOpeningPlayerTurn`, six player turns still read as 5 and Blitz (900 XP) credits. Overworld Doka-to-HP must not flip `healUsed` — the flag only clears in `cleanupBattle`, so a pre-fight heal fails the next no-heal challenge.

### Untouchable / under-damage challenge credited after a hit

`challengeTotalDamageRef` used to increment only on the boss-ability branch. Regular melee, spells, Void Mirror, Reflect Shield, Mirror Field, Thorned Ground, and Void Rift must call `recordChallengeDamageTaken`. Lava / spikes must call `recordInBattleChallengeDamage(inBattleRef, …)` — **not** out of combat, because the counter is zeroed in `cleanupBattle`, not at battle start.

`hard_3` (`under_8_ap_per_turn`) uses a **peak** AP spend. Reset only the per-turn accumulator at turn start; the peak clears in `cleanupBattle`.

### Attack Nearest / canvas summon costs 0 AP

Attack Nearest calls `resolvePlayerCast` directly (not `executeCastAttempt`). Canvas summons return `"summon"` — `castResultSpendsAp` includes that result. Both paths must debit AP and `recordChallengeApSpend`. A free cast also hides a 9+ AP dump from `hard_3`. Tile follow-up after `executeCastAttempt` must **not** debit again on fizzle (`castFollowUpShouldDebitAp`).

Attack Nearest and sprite-click Strike must pick from `getLiveCombatants` + `isActiveHostile` / `isTileCastableLive` (range, LoS, cooldown). A React `enemies` snapshot misses enemy minions and leftover corpses, and leftover AP used to recast Inferno every click without consulting the cooldown map.

### Spell upgrade debit is 10× too large (summons)

Spellbook summon UI shows `SUMMON_UPGRADE_COST_MULTIPLIER * 10 * 2^level` (100 at level 0). `upgradeSpell` charges `spellLevelingBaseCost * 2^level` (default base **10**). Debit with `spellUpgradeUiSpend(advertised, committedBefore, backendAfter)` so idle hydrate cannot copy the under-count over committed.

`getCallerDokaBalance` after `upgradeSpell` is a query. A stale pre-upgrade read is `>= committedBefore`. Committing that snapshot refunds the spend on the lock; the next `saveBattleStats` writes it back. Use `committedDokaAfterSpellUpgrade` — keep the observed wallet only when it actually decreased.

### Spell upgrade wiped by the next heal

`upgradeSpell` must enqueue on the persist lock and update `spellLevelsRef` **inside** that queued fn, before any later `saveBattleStats`. The canister now ignores heal/death spell-level arrays, but a local map rollback still shows the pre-upgrade level until reload. Deduct Doka as a UI delta (`dokaBalance - cost`); do not replace the wallet with the absolute post-upgrade read.

### `killCount` never increments in the client

`useSaveKillCount` is defined in `useLeaderboardQueries.ts` and is unused. World saves only **preserve** the current count. Leaderboard kill totals will stall until a caller invokes `saveKillCount`. The canister now requires `#user`, not banned, and `kills <= 64` (single-battle bound).

### Deployed canister still on 15-field stats

Source on disk can be 12-field while the live canister is not. Symptom: Candid / upgrade errors on create or update. Fix: upgrade the canister so `src/backend/migrations/20260827_000000.mo` (and the new type) actually run. Restarting the frontend is not enough.

### `dfx.json` vs `mops.toml`

`dfx.json` → `src/backend_extended/main.mo` (**path does not exist**). The stale 15-field actor is root `backend_extended/main.mo`.  
Root `mops.toml` → `src/backend/main.mo` (canonical).

Do not `dfx deploy` expecting the current game actor unless `dfx.json` is pointed at `src/backend/main.mo`.

### OQL / `caffeine check` M0010

`caffeineai-oql@0.4.0` is a real dependency and **is imported** at the bottom of `main.mo`. Some `caffeine check` toolchains fail with `M0010 package not defined` even when `mops sources` resolves the package. If check fails on OQL only, it is a toolchain mismatch — do not delete the `Expose` block without a replacement plan.

### Chat vanished after upgrade

Expected. `sendMessage` / `getMessages` are in-memory (`main.mo` comment at the chat block).

### Version bump logs everyone out

Changing `APP_VERSION` in `App.tsx` clears almost all `localStorage` and reloads. Preserve via `shouldPreserveVersionGateKey`: `pbv_tier_spawn_config`, `pbv_levelup_config`, and keys ending `_inventory`. A blanket `clear()` drops paid BuffShop potions (`${principal}_inventory`) while the canister Doka spend stays. Bump `CHANGELOG_ITEMS` in the same change.

### First user is admin

`getUserRole` calls `_ensureRegistered` → `AccessControl.initialize`. The first non-anonymous Internet Identity principal becomes `#admin`. Later callers are `#user`. `assignUserRole` is admin-only and rate-limited to once per 30 seconds.

### Circular hook imports

`hooks/useQueries.ts` is a barrel. Importing it from another file under `hooks/` creates a cycle. Import the specific hook file instead.

### Two `EnemyConfig` types

| Type | Fields | Use |
| :--- | :--- | :--- |
| Admin / frontend `EnemyConfig` | `hp`, `ap`, `mp`, `initStat`, level range, `regions`, `spriteUrl` | Spawn templates, admin UI |
| `types/common.mo` `EnemyConfig` | `damage`, `res`, `sp`, `sr`, `chc`, `init`, rewards, `side` | Runtime combat template |

Do not pass one into an API expecting the other.

### Spell bar silently shrinks

`setSpellBarOrder` drops ids not present in `spellLevelKeys`. It does not return an error for unknown ids. Max 8.

### Debug overlay missing

On the world stage, press **Shift+D** (ignored while typing in an input). The Debug channel is hidden from the default channel list but the panel is always mounted. Canvas crash UI (`CanvasErrorBoundary`) has its own “Copy Debug Report” at z-index 99999.

### Portal / death double-fire

- Portal interaction must read `inBattleRef` / `transitionInProgressRef`.
- Transition lock has a 5s timeout and must release in `finally`.
- Player death uses `deathTriggeredRef` so the death-realm flow cannot run twice.
- Re-arm both death guards (`armDeathGuards`) after Death Realm entry or Respawn. Leaving them set skips the next exploration death (0 HP, no penalty, no Game Over).
- While the 1.5s Death Realm timer is pending, block **portals and encounters**. `persistDeathPenalty` already restored HP, so an `hp <= 0` check is false. A new fight resets the guards without clearing the timer; the leftover callback aborts the battle.

### Dungeon chain drops after a progression portal

`cleanupMap` zeroes `dungeonChainActiveRef` / depth / maxDepth (death/flee must not carry a run). Snapshot **before** cleanup (`snapshotDungeonChain` → `decideDungeonChainPortal`). Reading the wiped refs yields `none`, generates an overworld map, and skips the `maxDepth * 50` completion bonus.

Rest-exit is the same class: `cleanupMap` runs first, then the rest-exit path must re-arm depth 1 **on the refs** (`shouldArmDungeonChainOnRestExit` / `restExitSpawnDepth`) and `applyFinalizedLayout` so hostiles can reach the exit. Drive the Doka multiplier from those refs (`dungeonDokaMultiplierFor`), not React state after `resetRunState`.

### White sanctuary portal is a wall / unwalkable

Dungeon-chain completion used to hardcode the white portal at `(0, 0)`. Fortress corners and chessboard even/even cells wall that tile; entry is coordinate-based. Place it with `placeWhitePortalAtSpawn` / `pickLegalWhitePortalCell` (same contract as Boss Rush `whiteSpawn`).

### Feats panel empty / Claim never appears

`getPlayerAchievements(player)` returns `[]` unless `player` is the caller Principal. `useGetPlayerAchievements` must pass `identity.getPrincipal()`. A display name or omitted arg fails Candid encode (caught → `[]`) or the `caller == player` guard. Advertised 50–1000 Doka then cannot be claimed even after `markAchievementUnlocked` succeeds.

Double-click: `shouldBeginAchievementClaim` (in-flight set). The second click hits "already claimed" after the first write succeeded — rolling that back hides the grant the canister already paid (`shouldRollbackClaimFailure`).

### Lava death after victory / portal refunds the penalty

The recap wrapper in `App.tsx` is `pointer-events: none` so HUD heal/shop stay live. Canvas mouse/touch must still ignore the world while `battleRecapOpen` is true (`shouldIgnoreWorldInputDuringRecap`). A portal swap has no overlay. If lava/spikes still fire during `applyRewards`, the death write already penalized the post-credit committed snapshot. Applying the post-await live hydrate (`shouldApplyVictoryLiveHydrate`, including death-epoch mismatch) restores HP and unpenalized XP; `hydrateWhenIdle` then copies that into committed and the next persist refunds the death.

### Boss rush resume / farm / stuck between rooms

- `getBossRushState` requires `userId == caller` as a **principal**. Pass the II identity text (`isPrincipalText`), not the profile display name.
- Persist `currentRoom` on room clear **before** `applyRewards`, both on the persist lock. `persistRoomClear` must throw if `setBossRushProgress` / `resetBossRush` did not run — a swallowed progress error still ran `applyRewards` and a reload re-entered the same room. `completeBossRushRoom` no longer mints client-supplied Doka/XP.
- `createCharacter` / `deleteCharacter` clear slot-scoped progress. Lava/spike death must `abortBossRush` so a late room-clear write cannot resume mid-tree.
- After a room clear, `setInBattle(false)` as well as `inBattleRef = false`. `cleanupBattle` only clears the ref; React `inBattle === true` blocks `checkBattleTrigger` and room 2 never starts.

### Last-hostile victory never fires / leftover AI kills the player

`isActiveHostile` reads **store** HP. Lava/spikes, plague/DoT, player-spell damage, enemy self-heal, and boss phase-2 must `updateCombatant`. Strip-only or `enemyHpMap` writes leave `hp > 0`, so the last tick never awards victory and the "dead" unit takes another turn (including a lethal hit that persists a death penalty). Tick DoT on enemy summons. After the last hostile dies, skip leftover turn dispatch (`liveTurnOrder` + `nextTurnIndex`).

Enemy minions must spawn via `spawnEnemySummonUnit` (`side: "enemy"`, turn type `"enemy"`). Default `side: "player"` hands them to the control panel and drops them from victory. Player-side / allied kills must not enter `applyRewards` (`countsTowardKillRewards`).

### Generated map has no reachable portal / sealed Boss Rush room

Do not retune archetype fill to fix a stuck seed. After generateEnemies, Boss Rush preferred cells, or rest-exit, run `finalizePlayableLayout` / `applyFinalizedLayout`: legal spawn (not on the exit), at least one reachable portal, hostiles punched onto the walkable graph. Wall/void Boss Rush kits used to seal the progression portal. `evaluateSolvability` names the failure (`isolated-enemies`, `no-reachable-portal`, `spawn-on-portal`, …). Summons must not sit on unique player→exit bridges (`collectMandatoryProgressionCells`).

### Jackpot heal refunds / charges twice

Jackpot heal spends 1 Doka from the **live** wallet (`nextDokaAfterJackpotHeal`), not the render snapshot. `mergeVictoryRewardLiveStats` must keep leftover combat HP (or a recap heal) when it is already above the post-battle floor — replacing HP undoes the paid heal and the player is charged twice.

### `calculateAndAwardDoka` looks like a reward API

It is an unused public mint. Official XP/Doka go through `applyRewards`. The canister now requires `#user`, rejects banned callers, drops lists longer than 16, awards at most 8 rows, and caps each enemy level at 200. Do not wire the official funnel to it.

### Motoko / frontend level-up floors differ

`progression.getPlayerBaseStats` uses floors AP=8, MP=4 (plus optional `LevelUpConfig` growth). Character creation defaults AP=10, MP=5. Battle init prefers the formula when they diverge — do not “fix” one without checking the other.

## Operational checklist (canister upgrade)

1. Confirm `src/backend/main.mo` and `migrations/` match the intended `CharacterStats` (12 fields, `killCount` present, no `wp`/`wr`/`scp`). Current chain module: `20260827_000000.mo`.
2. Confirm `applyRewards` uses `100 * 2^(N-1)` (same as `utils/xpCurve.ts`).
3. `caffeine check --fix` then `caffeine build` (or the project’s deploy pipeline). Do not `dfx deploy` — `dfx.json` points at missing `src/backend_extended/main.mo`.
4. `pnpm bindgen` and commit generated client files.
5. Smoke: create character (full stats), play, win a battle **and** a boss-rush room, confirm recap + wallet/XP moved **once**; then heal once and confirm the credit was not refunded. Confirm `currentRoom` advanced before the room-clear credit (reload must not re-enter the paid room).
6. Smoke: accept a battle challenge, complete it, confirm advertised XP landed. Die on lava after a recap — HP stays down and the 20/40 penalty sticks. Respawn HP must match `respawnHpAfterDeath` (not above max).
7. Confirm chat empty after upgrade is expected; Doka / slots / configs / boss-rush `currentRoom` are not. Confirm `${principal}_inventory` survived if `APP_VERSION` bumped.
8. Smoke: accept Untouchable, take a regular melee **or** a Void Mirror / lava-in-battle / **touch-walk** Thorned Ground hit, confirm the reward is **not** granted. Attack Nearest and a canvas summon both debit AP and honor cooldown.
9. Smoke: die on the first map before the Doka query paints — canister wallet must not become 0. Walk a dungeon-chain progression portal and confirm the next depth (not an overworld map). White sanctuary portal must be walkable at spawn. Rest-exit dungeon must still be a chain at depth 1.
10. Smoke: last-enemy lava / last-minion DoT awards victory once. A generated overworld / Boss Rush / rest-exit map must have a reachable exit from spawn.
