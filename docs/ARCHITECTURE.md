# Architecture

Intent: one Motoko canister is the source of truth for characters, Doka, config, and rewards. The React client owns live combat, map generation, and presentation. Bindgen (`src/frontend/src/backend.ts`) is the typed contract between them.

```
Internet Identity
        │
        ▼
   App.tsx  ── auth / profile / version gate / PostBattleRecap
        │
        ▼
   GameFlow  ── selection → creation → world
        │
        ├─ WorldExploration   (canvas, combat, portals)
        ├─ src/frontend/src/engine/*   (pure combat helpers)
        └─ TanStack Query hooks ──► backend actor
                                        │
                                        ▼
                              src/backend/main.mo
```

## Canonical vs stale paths

| Use this | Do not treat as current |
| :--- | :--- |
| `src/backend/main.mo` | Root `backend_extended/main.mo` (15-field stats). `dfx.json` points at missing `src/backend_extended/main.mo` |
| `src/frontend/src/backend.ts` + `src/frontend/src/declarations/` | Root `declarations/backend/backend.did` (still has `wp`/`wr`/`scp`). Bindgen can also lag Motoko `SpellConfig` summon fields until `pnpm bindgen` |
| Root `mops.toml` (moc 1.11.2, migrations chain, `check-limit = 4`, `.old` empty-canister baseline) | `src/backend/mops.toml` (older moc 1.9.0, no migrations) |
| Frontend `EnemyConfig` in `types/gameTypes.ts` (admin spawn template) | `src/backend/types/common.mo` `EnemyConfig` (runtime combat template — different fields) |

`src/backend/mixins/*` are unused scaffolds. `src/backend/lib/admin.mo` is the live helper for default configs and admin CRUD. `src/backend/lib/adminGuard.mo` is the live input / URL / retirement / rollback guard.

## Persistence

The actor is a default-persistent Motoko actor (`--default-persistent-actors`). State is top-level `let`/`var` maps.

| Store | Key | Authority |
| :--- | :--- | :--- |
| `characterSlots` | Principal → 3 slots | Character progress |
| `dokaBalances` | Principal → Nat | **Only** Doka store. Not a field on `Character` |
| `userProfiles` | Principal | Display name + `uiLayout` JSON blob |
| `buffInventories` | `"principal#slot"` | Buff shop items |
| `achievementProgress` | `"principal#achievementId"` | Unlock / claim |
| `bossRushStates` | `"principal#slot"` | Current / best room |
| `dungeonRecords` | Principal | Chain depth / maps |
| `gameKeyRequests` | `"gk_*"` request id | Buy Doka requests. No plaintext GameKey |
| `gameKeyLedger` | 120-char code | Redemption ledger. Player queries never return this |
| `gameKeyReveals` | Request id → code | Admin one-time reveal until `adminMarkGameKeyEmailed` |
| Config maps | Text ids | Enemies, regions, spells, bosses, shop, ads |

**Not persisted across upgrades:** `chatMessages` (capped at 200, in-memory by design).

Frontend `localStorage` is cache or UI-only. Backend wins on conflict:

| Cache key | Backend winner |
| :--- | :--- |
| `{userId}_slot{N}_pbv_active_spells` | `Character.spellBarOrder` |
| `{userId}_slot{N}_pbv_spell_levels` | `Character.spellLevelKeys` / `spellLevelValues` via `upgradeSpell` |
| `pbv_panel_layout_{userId}` | `UserProfile.uiLayout` via `saveUserUiLayout` |
| `pbv_tier_spawn_config` | `getTierSpawnConfig` (hydrated on world mount) |

Exceptions still living only in `localStorage`: `pbv_boss_configs` (admin hook comment), some achievement counters, chat channel prefs, and **`${principal}_inventory`** (BuffShop potions paid in Doka). The canister also has `buffInventories` (`purchaseBuff` / `useBuffItem`); the live shop UI does not write that map. A version-bump wipe must keep keys ending `_inventory` or paid potions vanish while the Doka spend stays.

## Character contract

Slots are `1 | 2 | 3`. `Character` required fields: `name`, `pieceType`, `level`, `experience`, `stats`, `pixelPattern`, `colors` (max 16), `rotation`, `spellLevelKeys`, `spellLevelValues`. Optional session fields: `bloodBalance`, `covenantBuff`, `shrineCount`, `activeSpells` (max 8), `spellBarOrder` (max 8), `bossRushMasterComplete`.

### CharacterStats (12 fields)

Persisted type in `src/backend/main.mo` (lines 144–157). WP / WR / SCP are gone.

| Field | Meaning |
| :--- | :--- |
| `hp` | Current hit points. `saveBattleStats` cap: `maxPersistedHp` = `100 + (level-1) * growthPercent` (not `level*200+100`). `updateCharacter` keeps stored `stats` — cosmetics only |
| `ap` / `mp` | Action / movement points. `updateCharacter` cap: 20 |
| `atk` | Physical attack |
| `res` | Resistance — reduces **all** incoming damage, including DoT |
| `sp` | Spell Power — increases spell damage / heal % |
| `sr` | Spell Resistance — reduces incoming spell damage; excludes DoT |
| `chc` | Crit chance % |
| `init` | Initiative (higher acts earlier) |
| `resilience` | Persist-only combat stat |
| `evasion` | Persist-only combat stat |
| `killCount` | Required on every Candid `CharacterStats` payload. Cannot decrease |

TypeScript mirrors this in `src/frontend/src/backend.ts` and `types/gameTypes.ts` (`CharacterStatFields`). All values are `bigint` on the wire.

Creation defaults (`CharacterCreation.tsx`):

```ts
{
  hp: 100n, ap: 10n, mp: 5n, atk: 15n, res: 10n,
  evasion: 5n, init: 10n, sp: 8n, sr: 5n,
  resilience: 8n, chc: 5n, killCount: 0n,
}
```

`updateCharacter` keeps stored `level` / `experience` / `stats` / spell-level arrays / session fields. Official editor is cosmetics only (name, piece, colors, pattern). Empty slot → error. Missing slot map → error. `saveBattleStats` clamps HP with `maxPersistedHp` (`100 + (level-1) * growthPercent`). Do not cut HP already stored above that cap (`persistHpWriteCap` — historical `level*200+100` rows and a lowered growth percent).

## Public canister surface

Auth: `mo:caffeineai-authorization`. Roles `#admin | #user | #guest`. First non-anonymous caller of `getUserRole` becomes admin (`AccessControl.initialize`). Password admin is removed. Most writes require `#user` or `#admin`. Banned principals are blocked on purchases, buffs, achievements, boss rush, and Doka awards.

### Player

| Method | Notes |
| :--- | :--- |
| `createCharacter(slot, character)` | Slots 1–3; fails if occupied. Clears slot-scoped boss-rush state |
| `updateCharacter(slot, character)` | Cosmetics only. Keeps stored progression / stats / spell levels / session fields so a full-record payload cannot mint |
| `deleteCharacter(slot)` | Also clears slot-scoped boss-rush state |
| `getCharacterSlots` / `getCharacter` / `getCharacterStats` | Caller-scoped |
| `renameCharacter(slot, newName)` | 1–20 chars, unique per account, **100 Doka**. Returns `{ #ok \| #err }` — Candid does **not** throw on `#err`. Debit the **live** wallet only after `readRenameCharacterResult` is `#ok` |
| `setSpellBarOrder(slot, spellIds)` | Drops unknown ids; keeps max 8 |
| `saveActiveSpells` / `updateSessionState` / `getSessionState` | Session fields on `Character` |
| `saveKillCount(slot, kills)` | Increments `stats.killCount`. Requires `#user`, not banned, `kills <= 64`. Hook exists; no UI caller yet |
| `calculateAndAwardDoka(enemies)` | No-op stub (returns `0`; Candid kept). Official funnel is `applyRewards` |
| `applyRewards(slot, dokaDelta, xpDelta)` | **Atomic additive** XP + level + Doka. `Nat` only — cannot subtract. Rejects `dokaDelta > 100_000` or `xpDelta > 500_000` |
| `saveBattleStats(...)` | Absolute HP/AP/MP/atk/res/init + XP + Doka snapshot. **Never mints** Doka/XP/level/atk/res/init (incoming above stored ignored). **Ignores** spell-level arrays (`upgradeSpell` owns those). Official client also keeps stored level (`clampSaveBattleStatsWrite`) |
| `sendMessage` / `getMessages` | Chat; lost on upgrade. Display name is the caller's `userProfiles` name — the client `playerName` argument is ignored |
| `getCallerDokaBalance` / `getDokaBalance` | Same per-principal map |
| `upgradeSpell(slot, spellId)` | Spends `spellLevelingBaseCost * 2^currentLevel` (default base **10**). Spellbook summon UI advertises `10×` that — debit the **canister** spend via `spellUpgradeUiSpend`. Cannot add a retired (`usableByPlayer=false`) spell the player never owned |
| `getBuffCatalog` / `purchaseBuff` / `useBuffItem` | Canister buff map. Live Items UI does not write it — potions live in `${principal}_inventory` |
| `getPlayerAchievements(player)` | Empty unless `player == caller` Principal. Pass `identity.getPrincipal()`, never the display name |
| `markAchievementUnlocked` / `claimAchievementReward` | Claim is a Doka delta — enqueue on the persist lock. Wallet/level conditions (`doka_1000`, `doka_10000`, `level_10`) are checked against canister state — do not fire them on projected recap totals |
| `initiatePurchase` | **Legacy stub.** Nine positional Text args kept so older clients get `#err("Doka purchases now use GameKey requests…")` instead of minting. Does not write `purchaseRecords` |
| `processPendingPurchases` | **No-op** (returns `0`). `_autoCompletePendingPurchases` is empty. Official paid Doka is `redeemGameKey` |
| `requestGameKeyPurchase(email, emailConsent, hintedEuroCents)` | Player Buy Doka request. Email + consent; optional euro hint (cents). One open `pending`/`approved` request; 60s cooldown. Never stores a GameKey |
| `getMyGameKeyPurchaseStatus` | Latest request for the caller. No plaintext code |
| `redeemGameKey(code)` | Credits the **caller** (not the requester) `entry.dokaAmount` after admin approval. Single-use 120-char code. Enqueue via `redeemGameKeyThroughPersist` |
| `getBossRushState` / `setBossRushProgress` / `completeBossRushRoom` / `resetBossRush` | Slot-scoped; query `userId` must be the caller principal. `setBossRushProgress` traps if `currentRoom` decreases — use `resetBossRush`. `completeBossRushRoom` ignores client `dokaReward`/`xpReward` (progress / master flag only), requires the slot character to exist **before** any mutation, and accepts `roomIndex == currentRoom` or `currentRoom - 1` |
| `getDungeonRecord` / `updateDungeonProgress` / `resetDungeonChain` | `dungeonRecords` keyed by Principal. Query/update require `caller == principal` (admin may update/reset) |
| `getLeaderboard` | Top 50 by level |

### Rewards (`applyRewards`)

Canonical curve (must match `utils/xpCurve.ts` `xpForNextLevel`):

```
threshold(N) = 100 * 2^(N-1)     // 1→2 = 100, 2→3 = 200, 3→4 = 400, …
newXp = experience + xpDelta
while newXp >= threshold(level):
    newXp -= threshold(level)
    level += 1
dokaBalances[caller] += dokaDelta
```

`100 * 2^N` is off-by-one and silently blocks intended level-ups. Experience is leftover in the current level — HUD uses `xpHudProgress` / `recapXpAfterGrant`, not a cumulative subtract. Thresholds use bigint (`xpThresholdBigInt`) so level 48+ does not freeze on `MAX_SAFE_INTEGER`. Deltas are `Nat` (non-negative). Official client `clampApplyRewardsDeltas` also caps at `100_000` Doka / `500_000` XP so a Doka-Fever roll cannot `#err` and drop the whole grant.

Victory XP: explicit grant if `> 0`, else sum of defeated `level * 20`, else `characterLevel * 20` (`computeVictoryExp`). Dungeon chain multipliers already baked into the recap must pass `PREAPPLIED_REWARD_MULTIPLIER` (`1`) so Doka is not squared.

### Progress persist lock

`createProgressPersist` (`utils/progressPersist.ts`) is the world-session queue. Recap / shop / heal become usable while `applyRewards` is still in flight. An absolute `saveBattleStats` snapshot taken then overwrites the just-credited wallet.

| Kind | Writer | Typical callers |
| :--- | :--- | :--- |
| Additive credit | `applyRewards` | Victory, portal +10 XP (`PORTAL_TRANSITION_XP` — HUD only after commit), world Doka pickups, shrine altar, dungeon-complete bonus, boss-rush room clear. Ground / shrine / dungeon-complete must claim a one-shot id first (`dokaPersist.ts`) — `applyRewards` is not idempotent. After persist, `settleOneShotAfterCredit`: gain → commit; canister `#err` → release; transport miss after invoke → **keep** (do not remint) |
| Paid spend | `upgradeSpell` | Spellbook. Deducts from `dokaBalances`; sole writer of spell levels |
| Paid credit | `claimAchievementReward` | Feat claim. Returns granted Nat |
| Paid credit | `redeemGameKey` | Buy Doka. Credits `dokaBalances` for the **caller**. Official client `redeemGameKeyThroughPersist` commits the `#ok` granted delta onto a **seeded** lock (`shouldCommitGameKeyRedeem` / `committedDokaAfterGameKeyRedeem`). Do not require a follow-up `getCallerDokaBalance` — a stale query used to skip commit after the key was consumed |
| No-op | `processPendingPurchases` | Always returns `0`. Signature kept so shop remount still calls it; `shouldCommitShopCredit` refuses a no-op commit |
| Absolute snapshot | `saveBattleStats` | Recap heals, item-shop spends, death 20% XP / 40% Doka |

Rules verified in `WorldExploration` + the persist unit tests:

1. Enqueue **both** credits and snapshots on `progressPersistRef`.
2. `commit({ doka, xp, level })` inside the queued fn after the canister write.
3. `hydrateWhenIdle` returns false while `pending > 0` — do not copy UI over an in-flight credit.
4. Live UI **adds deltas** (`applyShopCreditDeltaToUi`). Replacing with an absolute backend read refunds a heal/shop spend the player already applied locally.
5. After world hydrate, `shouldApplyCallerDokaHydrate` ignores `['callerDokaBalance']` refetches (claim invalidate / window focus).
6. After death has fired, `shouldApplyVictoryLiveHydrate` is false — a late `applyRewards` hydrate must not restore HP or unpenalized XP. Compare `deathEpoch` at persist-start vs now (portal XP and victory share this gate).
7. Idle hydrate must not copy leftover XP from a **lower UI level** over a post-`applyRewards` level-up (`resolveHydratedXp`). `max(old leftover, persisted leftover)` refunds the death XP cut on the next `saveBattleStats`.
8. Shop remount / no-op `processPendingPurchases` commits only when that pair observed a gain (`shouldCommitShopCredit`). Never cut a higher lock snapshot (`committedDokaAfterShopCreditOnLock`).
9. `upgradeSpell` then `getCallerDokaBalance` is a query. Commit the post-upgrade wallet only when it decreased (`committedDokaAfterSpellUpgrade`).
10. Absolute writes clamp with `clampAbsoluteProgressWrite` / `clampSaveBattleStatsWrite` so a stale optimistic UI cannot mint. Official client keeps stored **level**; do not pass Play-entry / pre-level UI after `applyRewards`.

Death penalty cannot use `applyRewards` (Nat-only add). `persistDeathPenalty` writes the already-reduced absolute XP/Doka through `saveBattleStats`, then `raiseUiAfterDeathPersist` so a short optimistic UI cannot overwrite the post-credit cut. Death persist HP is `respawnHpAfterDeath`: **50%** of `100 * (1 + (level-1) * 0.05)`. The old `(50 + level) * 10 * 0.5` inflated reload HP above max. After a victory level-up, `xpAfterDeathPersist` keeps the persisted leftover when `persistedLevel > uiLevel`.

`mergeVictoryRewardLiveStats` must not replace HP with the post-battle floor when a recap heal already raised it — the recap wrapper is `pointer-events: none`, so a paid heal can land before the persist await returns.

Unpaid 20/40 after a replica reject lives in `localStorage` (`pbv_pending_death_penalty_slotN`, `defaultDeathPenaltyStorage`). Replay compares **canister** XP (`experienceFromCharacterRecord` / `readDeathReplayBackendSnapshot`), not GameFlow's Play-entry `character.experience` (that prop is never updated after `applyRewards`). Heal/shop after a failed persist uses `applyUnpaidDeathPenaltyToWrite`. Retry the write up to `DEATH_PENALTY_PERSIST_ATTEMPTS` (3).

| Helper | Path |
| :--- | :--- |
| `createProgressPersist` / `shouldCopyIdleWalletDoka` / `resolveCommittedDokaForAbsoluteWrite` / `resolveHydratedXp` / `clampAbsoluteProgressWrite` / `floorHydratedLevel` | `utils/progressPersist.ts` |
| `resolveBattleRewards` / `computeVictoryExp` / `PREAPPLIED_REWARD_MULTIPLIER` | `utils/rewardResolver.ts` |
| `PORTAL_TRANSITION_XP` / `persistIncrementalRewards` / `readApplyRewardsOk` / `clampApplyRewardsDeltas` | `utils/applyRewardsResult.ts` |
| `persistDeathPenalty` / `shouldApplyVictoryLiveHydrate` / `respawnHpAfterDeath` / `xpAfterDeathPersist` / `mergeVictoryRewardLiveStats` / `resolvePendingDeathReplay` / `applyUnpaidDeathPenaltyToWrite` | `utils/deathPenalty.ts` |
| `persistDokaCredit` / `tryClaimPickupId` / `tryClaimDungeonChainBonus` / `tryClaimFlag` / `settleOneShotAfterCredit` | `utils/dokaPersist.ts` |
| `clampSaveBattleStatsWrite` | `utils/absoluteStatsClamp.ts` |
| `recordChallengeSelfHpLoss` / `recordChallengeItemHealUsed` | `utils/challengeCompletion.ts` |
| `attachRecapUnlocks` | `utils/recapUnlocks.ts` |
| `shouldDeferAchievementUnlockUntilRewardsPersist` / `thresholdAchievementConditionsFromPersist` | `utils/adminSafety.ts` |
| `shouldIgnoreClickAfterTouch` | `utils/pointerGesture.ts` |
| `attackNearestLiveCasterPos` | `engine/targeting.ts` |
| `xpHudProgress` / `recapXpAfterGrant` / `xpThresholdBigInt` | `utils/xpCurve.ts` |
| `shouldStartDokaHeal` / `dokaHealAmounts` / `nextHpAfterDokaHeal` / `syncLiveDokaFromProp` / `tryConsumeBuffItem` | `utils/itemShop.ts` |
| `creditPendingPurchasesThroughPersist` / `shouldCommitShopCredit` / `committedDokaAfterShopCreditOnLock` / `redeemGameKeyThroughPersist` / `shouldCommitGameKeyRedeem` | `utils/shopPurchase.ts` |
| `creditAchievementRewardThroughPersist` / `shouldBeginAchievementClaim` / `shouldRollbackClaimFailure` | `utils/achievementReward.ts` |
| `persistSpellUpgrade` / `spellUpgradeUiSpend` / `committedDokaAfterSpellUpgrade` | `utils/spellUpgrade.ts` |
| `shouldApplyCallerDokaHydrate` / `shouldMarkCallerDokaWalletReady` | `utils/dokaBalanceQuery.ts` |
| `persistBossRushRoomClear` / `resolveBossRushQueryPrincipalText` | `hooks/bossRushProgress.ts` |
| `readRenameCharacterResult` / `shouldDebitRenameDoka` | `utils/renameCharacter.ts` |
| `fetchPlayerAchievements` | `utils/playerAchievements.ts` |
| `shouldPreserveVersionGateKey` | `utils/versionGate.ts` |

### Wallet seeding (placeholder 0)

`createProgressPersist` starts at `doka = 0`. That 0 is **ambiguous**: a new empty wallet vs GameFlow's pre-query placeholder. A lava/combat death on the first map that penalizes committed `0` and `saveBattleStats`s it wipes the canister.

| Rule | Helper |
| :--- | :--- |
| Constructor seed is live only when `initial.doka > 0` | `createProgressPersist` |
| Idle hydrate copies UI Doka only after `setDokaBalance(query)` (`walletReady`) | `shouldMarkCallerDokaWalletReady` |
| Once seeded, idle hydrate must **not copy** Doka (ghost HUD / stale-high query used to mint via `incoming >= committed`) | `shouldCopyIdleWalletDoka` |
| Idle hydrate must not write a **lower level** than committed (lava death mid-`applyRewards`) | `floorHydratedLevel` |
| Unseeded absolute writes (`saveBattleStats` death/heal) must fetch the live wallet first; skip the write if the read fails | `resolveCommittedDokaForAbsoluteWrite` |
| Credits/renames stacked on the placeholder must not mark the lock seeded | `shouldCommitRenameDokaSpend`, `creditAchievementRewardThroughPersist` |

`walletReady` is `queryResolved && sessionCacheApplied`. React Query resolving one render before `setDokaBalance` still leaves GameFlow at placeholder 0.

### Shop and item purchases

**Buy Doka** (`DokaGameKeyShop.tsx`) is real-money EUR → Doka. **Items** (`BuffShop.tsx`) is in-world potion spend. They are different stores and different UIs (`iapShopCopy.ts`).

Paid Doka flow:

1. Player pays via Mollie, then `requestGameKeyPurchase(email, consent, hintedEuroCents)` (email 6–200 chars, consent required, one open `pending`/`approved` request, 60s cooldown). Rate: 1000 Doka = 10€ (hint Doka == euro-cents).
2. Admin `adminApproveGameKeyPurchase(requestId, dokaAmount)` mints a 120-char GameKey from IC `raw_rand` (`lib/gameKey.mo`). Amount must pass `validateDokaGrant` (1–10_000_000). The code is stored in `gameKeyLedger` and a one-time `gameKeyReveals` slot — **not** on `GameKeyRequest`.
3. Admin copies/emails the code, then `adminMarkGameKeyEmailed` wipes the plaintext reveal. The canister cannot send email.
4. Player `redeemGameKey(code)` while logged in. Credits the **caller**, not the original requester. Single-use. Official client enqueues `redeemGameKeyThroughPersist` and commits the `#ok` delta onto a seeded lock (`shouldCommitGameKeyRedeem`). Do not wait on a second wallet query.

`initiatePurchase` (nine positional Text args) always returns `#err` pointing at GameKey. `processPendingPurchases` always returns `0`. Official `WorldExploration` may still call the no-op on remount; `shouldCommitShopCredit` prevents committing that snapshot. Shop-credit timers live in `shopCreditTimersRef` — `cleanupBattle` clears `pendingTimeoutsRef` on every portal/death/victory.

`BuffShop` is hosted in `WorldExploration` (not `GameFlow`). A GameFlow-only local deduct + no-op `onUseItem` refunds the spend on the next wallet refetch and makes bought items unusable. Bought potions persist only in `${principal}_inventory` — not `buffInventories`. Consume from `inventoryRef` (`tryConsumeBuffItem`) so a double-click cannot spend one stack twice. Jackpot heal spends **1 Doka from the live wallet** (`nextDokaAfterJackpotHeal`), not the render snapshot. Overworld Doka-to-HP uses `shouldStartDokaHeal` (live ref + in-flight) and `nextHpAfterDokaHeal` (do not re-read `characterStatsRef` after the eager updater). Copy GameFlow's `dokaBalance` prop onto the live ref only when the prop actually changed (`syncLiveDokaFromProp`) — a child-only HP update used to restore a stale-high wallet and refund the spend.

### Admin (gated)

UI is lazy-loaded (`AdminDashboard.tsx`) and shown only when `isAdmin && onOpenAdmin`. Backend still enforces `#admin` on every write. Do not ship admin as first-class player UI.

| Operator action | Method | Constraint |
| :--- | :--- | :--- |
| Ban / unban | `adminBanAccount` / `banPrincipal` / `banPlayer` + matching unban | Banned principals fail purchases, buffs, achievements, boss rush, Doka awards |
| Grant Doka | `adminGrantDoka` / `adminAddDoka` / `adminAddDokaToUser` | Writes `dokaBalances` — not a field on `Character`. Cap 1–10_000_000 (`validateDokaGrant`) |
| Config CRUD | `adminSet*` / `adminDelete*` for enemy, region, sprite, spell, map-modifier, shop, achievement, boss, game, tier-spawn | Reads of most configs are public queries |
| Login ads | `adminSetAdBox(index, imageUrl, linkUrl)` / `adminClearAdBox` / `getAdBoxes` | Three slots (`index` 0–2). Tuple is `(imageUrl, linkUrl, isActive)`. URLs reject `javascript:` / `data:` / `vbscript:` (`AdminGuard.validateAdBox`) |
| Buy Doka | `adminListGameKeyRequests` / `adminApproveGameKeyPurchase` / `adminRejectGameKeyPurchase` / `adminGetGameKeyReveal` / `adminMarkGameKeyEmailed` | No plaintext codes on the request list. Approve mints from `raw_rand`. `adminMarkGameKeyEmailed` wipes the reveal (canister cannot email) |
| Version | `setAppVersion` / `setChangelog` | Frontend wipe still keys off `APP_VERSION` in `App.tsx` |
| Role | `assignUserRole` | Admin-only; rate-limited once per 30s |
| Rollback | `adminRollbackLevelUpConfig` / `GameConfig` / `TierSpawnConfig` / `ColorPalette` / `BossRushConfig` | Last-write stables from migration `20260831`. Empty previous → `#err` |
| Audit | `getAdminAuditLog` | Capped at 100 entries |
| Spell catalog | `adminSetSpellConfig` / `adminDeleteSpellConfig` | Full `AdminTypes.SpellConfig` including `isSummon` / `summonAI` / `summonLifespan` / `summonUnitDef`. Built-in ids cannot be deleted — retire with `usableByPlayer=false`. Rejects unknown `summonAI`, `summonLifespan > 20`, `summonUnitDef.level > 99`, non-finite / out-of-range scales (0–10) so `getSummonBaseStats` cannot mint Inf-HP units |

Password admin is removed. First non-anonymous caller of `getUserRole` becomes `#admin`. Invalid admin payloads return `#err` **before** any store write (`adminGuard.mo`). Boss portal ids cap at 64 chars (`requireId` / `MAX_ID`).

### OQL

`schema()` and `execute(qJson)` are included via `mo:caffeineai-oql/Expose` at the **end** of `main.mo` so every persisted `let` exists first. Player collections are scoped; admin configs are controller-only.

## Frontend flow

`main.tsx` wraps TanStack Query + Internet Identity. Viewport `< 768px` shows `SmallScreenGuard` (warn + **Continue anyway**). Continue is stored in `sessionStorage` (`pbv_small_screen_continue`) for the tab only. Primary chrome is 44px min-height.

`App.tsx` (`APP_VERSION = "v163"`):

1. Version mismatch → wipe `localStorage` except keys `shouldPreserveVersionGateKey` keeps (`pbv_tier_spawn_config`, `pbv_levelup_config`, `*_inventory`) → reload.
2. No identity → `LandingPage`.
3. Profile fetch timeout 8s → treat as no profile.
4. No profile → `ProfileSetup` (must send `{ name, uiLayout: "" }`).
5. Profile present → `GameFlow` + root `PostBattleRecap`.

`GameFlow` stages: `"selection"` → `"character"` → `"world"` (canvas + `ChatPanel` + stone top bar).

### Character create

`CharacterCreation.handleSave` builds a full `Character` (including `killCount: 0n`) and calls `createCharacter` / `updateCharacter`. Extra frontend-only fields such as `dokaBalance` are **dropped** by the bindgen serializer — they never reach the canister.

### Battle → recap

1. Combatants mutate through `engine/combatantStore.ts` (atomic roster + turn-order + mirrors).
2. Deaths go through `engine/deathPipeline.ts` (10-step, idempotent). Per-kill code **must not** call `resolveBattleRewards`. `selectDefeatedEnemiesForRewards` prefers the attributed-kill roster — `recheckVictory` used to pass `[]`.
3. Victory: `WorldExploration` builds recap locally, calls `onShowBattleSummary` **first**, then enqueues `resolveBattleRewards` → `actor.applyRewards` on the persist lock.
4. Challenge XP/Doka must be read from **live refs** (`liveBattleChallengePersistEntries`). `handleBattleEnd` omits `challengeAccepted` / `currentChallenge` from its deps; a stale `accepted === false` drops the 400–1000 XP the panel advertised.
5. Recap popup is only mounted in `App.tsx` (z-index 9999) so it survives the battle → exploration transition. The full-screen wrapper is `pointer-events: none` (the card itself is `auto`) so HUD heal/shop stay clickable. Canvas walk / hazard clicks are ignored while `battleRecapOpen` is true (`shouldIgnoreWorldInputDuringRecap`). In-battle feat unlocks travel on `BattleRecapData.newlyUnlockedAchievements` (`attachRecapUnlocks`) — a WorldExploration-only list never reaches the dialog. Wallet/level feats (`doka_1000`, `doka_10000`, `level_10`) wait until `applyRewards` commits (`shouldDeferAchievementUnlockUntilRewardsPersist` / `thresholdAchievementConditionsFromPersist`). `markAchievementUnlocked` rejects projected recap totals against the pre-credit canister snapshot, and `achievementsShownRef` would block the post-credit retry.
6. Both React `inBattle` **and** `inBattleRef` must be false after `handleBattleEnd` / room clear / death. `cleanupBattle` only clears the ref; leaving React state true blocks the next fight (`shouldAllowBattleTrigger`).
7. Canvas `onTouchEnd` + `onClick`: drop the synthetic click for 400ms (`shouldIgnoreClickAfterTouch`). One physical tap used to fire two casts.

### Battle challenges

Catalog and predicates live in `utils/challengeCompletion.ts`. `handleBattleEnd` / `handleBossRushRoomClear` persist advertised Doka/XP only when `isChallengeCompleted(liveChallenge, progress)` is true.

| Id | Condition | Persist reward |
| :--- | :--- | :--- |
| `easy_1` | `no_healing` | 50 Doka |
| `easy_2` | `under_15_turns` | 75 Doka |
| `easy_3` | `under_50_damage` | 60 Doka |
| `hard_1` | `no_healing_under_30_damage` | 200 Doka / 500 XP |
| `hard_2` | `under_10_turns` | 175 Doka / 400 XP |
| `hard_3` | `under_8_ap_per_turn` | 150 Doka / 450 XP |
| `legendary_1` | `no_damage_taken` (Untouchable) | 500 Doka / 1000 XP |
| `legendary_2` | `under_5_turns` | 450 Doka / 900 XP |
| `legendary_3` | `direct_hit` (Chebyshev ≤ 2) | 400 Doka / 800 XP |

**Damage that must increment `challengeTotalDamageRef`** (HP actually lost after shields):

| Source | Helper | Constraint |
| :--- | :--- | :--- |
| Regular melee / spell / `playerTakesDamage` | `recordChallengeDamageTaken` | Boss-ability-only increment used to leave `totalDamage` at 0 and credit a failed Untouchable |
| Sacrifice (`loseSelfHp`, floor at 1) | `recordChallengeSelfHpLoss` | Never entered `playerTakesDamage`. Record HP actually lost, not the requested amount |
| Void Mirror / Reflect Shield / Mirror Field | `recordChallengeDamageTaken` via `onPlayerReflectedDamage` | Reflect never went through `playerTakesDamage` |
| Thorned Ground / Void Rift walk | `recordChallengeDamageTaken` | In-combat map modifiers |
| Lava (8–15) / spikes (5–10) | `recordInBattleChallengeDamage(inBattleRef, …)` | **In-battle only.** Counter is zeroed in `cleanupBattle`, not at battle start — overworld hazard steps must not fail the next fight |

**AP for `under_8_ap_per_turn`:** `recordChallengeApSpend` keeps a per-turn accumulator (reset on turn start) and a **peak** that only clears in `cleanupBattle`. A 9+ AP dump on turn 1 still fails even if later turns are cheap.

`castResultSpendsAp` is true for `"cast" | "fizzled" | "summon"`. Both the canvas click path (`executeCastAttempt`) and **Attack Nearest** (`resolvePlayerCast` directly) must debit AP + record the spend. Skipping either made the cast free and hid a 9+ AP dump from `hard_3`. The tile follow-up after `executeCastAttempt` must **not** debit again (`castFollowUpShouldDebitAp`).

Turn-count challenges (`under_N_turns`) only fail at battle end — `isChallengeFailed` stays false mid-fight so the banner chip does not flip early. The **opening** player turn never goes through `advanceTurn`; count it with `shouldCountOpeningPlayerTurn` / `recordChallengePlayerTurnStart` or six player turns still read as 5 and credit Blitz.

`healUsed` is only cleared in `cleanupBattle`. Overworld Doka-to-HP must call `recordInBattleChallengeHealUsed(inBattle, …)` — a pre-fight heal used to fail the next no-heal challenge. In-battle BuffShop `health_potion` / `greater_health_potion` must call `recordChallengeItemHealUsed` — potions restore HP on the player turn without going through spell heals.

**Pacifist Run** (`pacifist_run`): flip `battleOnlyHealBuffSpellsRef` only on a resolved offensive cast (`recordPlayerSpellType`). Range highlight / `getSpellRangeTiles` must not call `applyHealBuffSideEffect` (`shouldApplyHealBuffSideEffectOnRangePreview` is false). Selecting Strike to see range used to fail the feat without a cast.

**Striker** (`direct_hit`): every spent attempt must stay within Chebyshev ≤ 2. Sprite-click and player-controlled summon kits (`utils/summonControlCast.ts`) skip the tile-click follow-up — record range there or a range-3+ Archer still persists 800 XP. Once false, it stays false.

**Cooldown:** `isSpellOnCooldown` gates sprite-click, tile-click, and Attack Nearest. BattleUI only disables re-selection; leftover AP used to recast Inferno every click. Fizzle spends AP but does **not** start cooldown (`castResultAppliesCooldown`).

Thorned Ground / Void Rift **walk** damage: mouse and touch must share `battleWalkHazardDamages` (`engine/battleSetup.ts`). Touch used to skip the debit and credit Untouchable the mouse path fails.

### Death Realm transition

Exploration (or in-battle) lava/spike death arms a **1.5s** timer (`deathRealmTimerRef`) and `persistDeathPenalty` **restores HP in the same tick**. An `hp <= 0` check is already false when the player can walk.

While `isDeathRealmTransitionPending(deathTriggered, timerPending)`:

1. Portals stay blocked (`shouldBlockPortalDuringPendingDeathRealm`). `cleanupMap` would cancel the timer while `deathTriggered` stays set — the HP watch never re-runs and the next lava death strands the player.
2. World encounters stay blocked (`shouldAllowBattleTrigger.deathRealmPending`). Starting a fight resets the death guards without clearing the timer; the leftover callback aborts the battle (and a second death persist can fire).

After Death Realm loads or Respawn is clicked, call `armDeathGuards` so both `deathTriggered` and `deathPenaltyApplied` are false. Leaving them set skips the next exploration death (0 HP, no penalty, no Game Over).

Respawn / persist HP must be `respawnHpAfterDeath(level)` so a reload cannot hydrate above max HP.

### Boss rush persist / resume

`bossRushStates` is keyed `principalText#slot`. `getBossRushState(userId, slot)` returns `(0,0,0)` unless `userId == caller`. GameFlow `userId` is the **display name** — `Principal.fromText("VampireBob")` throws. Query with the authenticated II principal (`resolveBossRushQueryPrincipalText`).

On room clear (`persistBossRushRoomClear` + `persistBossRushRewardsThroughLock`):

1. Write `currentRoom` (`setBossRushProgress` or `resetBossRush` on the final room) **before** `applyRewards`. `persistRoomClear` must **throw** if that write did not run (missing method or swallowed replica reject) — a success-then-`applyRewards` path farms the same room on reload.
2. Call `completeBossRushRoom(slot, roomIndex, 0, 0)` — progress / master flag only. The canister **ignores** client `dokaReward`/`xpReward` and requires the slot character to exist first. A failure here after `currentRoom` already advanced must **not** skip the wallet credit.
3. Both writes stay on the persist lock so a lava death cannot jump the queue and let the credit land after the penalty.
4. `createCharacter` / `deleteCharacter` call `_clearBossRushForSlot` so a new occupant cannot resume mid-tree.
5. Lava/spike death calls `abortBossRush` → `resetBossRush` (`currentRoom = 0`). A late in-flight room-clear write is superseded (`wasSuperseded`).

Ten rooms (`BOSS_RUSH_ROOMS` in `hooks/useBossRush.ts`), indexes 0–9. Room 9 is the jackpot (5000 Doka / 2000 XP). Pair kits and combined mechanics live in that table — do not invent a parallel inventory.

### Portals

`engine/portalRules.ts` `filterRunPortals`: free exploration keeps generator candidates; dungeon / boss-rush keeps only `"progression"` and only when the map is cleared. Portal checks must read `inBattleRef`, not stale `inBattle` state.

### Dungeon chain

`dungeonRecords` is Principal-keyed (`chainDepth`, `totalMapsCompleted`, `bestRewardMultiplier`). Frontend run flags (`dungeonChainActiveRef` / `depth` / `maxDepth`) are **session refs**. `cleanupMap` always zeroes them (death/flee must not carry a run onto the next map).

A progression portal is not a flee. Snapshot **before** `cleanupMap`, then decide the step:

```
snap = snapshotDungeonChain(refs)
action = decideDungeonChainPortal(portal.isDungeonEntry, snap)
```

| Action | When | Effect |
| :--- | :--- | :--- |
| `enter` | `isDungeonEntry && !snap.active` | Depth 1; `maxDepth = 3 + random(0..2)` (3–5 maps) |
| `progress` | active and `depth < maxDepth` | `nextDepth = depth + 1` |
| `complete` | active and `depth >= maxDepth` | Bonus `maxDepth * 50` Doka via persist-lock credit; then reset flags |
| `none` | not in a chain, not an entry portal | Free exploration |

Post-cleanup zeros always yield `none` (or `enter` on a dungeon-entry portal) — never `progress` / `complete` — which drops the chain, generates an overworld map, and skips the completion bonus.

`getRunMode`: boss rush wins over dungeon. `resetRunState` on death → Death Realm (aborts rush + zeroes chain **and** React dungeon setters / `dungeonDokaMultiplierRef`). Drive victory Doka from `dungeonDokaMultiplierFor(activeRef, depthRef)` — React state can stay true after a reset and inflate overworld kills 1.5×–4×.

`completeRun` is the non-penalty counterpart (rewards stay). White sanctuary portal: `shouldSpawnWhitePortal` after a successful final room / final depth, then `placeWhitePortalAtSpawn` / `pickLegalWhitePortalCell` so the gateway sits on the player spawn. Hardcoded `(0, 0)` is a wall on fortress corners and chessboard even/even cells; entry is coordinate-based.

Rest-exit `cleanupMap` zeroes dungeon refs, then the rest-exit path must re-arm them: `shouldArmDungeonChainOnRestExit("dungeon")` and `restExitSpawnDepth` write **depth 1 on the refs** (not only React state) so `generateEnemies(..., depth)` and later progression snapshots see floor 1. Then `applyFinalizedLayout` so rest-exit hostiles can still reach the exit.

During a run, `isRunProgressionPortal` treats an unmarked fallback cell as the way forward. White / rest / entry / boss-rush-entry portals must not steal room-advance.

Backend `updateDungeonProgress` writes `chainDepth` and `1.0 + depth * 0.25` into `bestRewardMultiplier`. Victory Doka that already baked the chain multiplier must pass `PREAPPLIED_REWARD_MULTIPLIER` (`1`) so it is not squared. Frontend floor multipliers are `[1, 1.5, 2.0, 2.5, 3.0, 4.0]` (`dungeonDokaMultiplierFor`).

## Combat engine (`src/frontend/src/engine/`)

These modules are React-free. `WorldExploration.tsx` remains the orchestrator and still owns refs/setters.

| Module | Job |
| :--- | :--- |
| `combatantStore.ts` | Atomic add/remove/patch/sync of combatants + turn order. `combatantTurnEntryType`: player-side summons are `"summon"`; enemy-side summons are `"enemy"` |
| `turnQueue.ts` | Index-safe removal; advance from the **live** queue index (`nextTurnIndex` / `liveTurnOrder`) |
| `deathPipeline.ts` | Idempotent death sequence + optional reconcile hook |
| `spellEngine.ts` | Pure player / enemy spell resolution |
| `castHelpers.ts` | AoE target list + `applyDamageToEnemy` (Void Mirror / Reflect Shield call `onPlayerReflectedDamage`) |
| `targeting.ts` | Preview + live cast gate from **explicit** spell metadata (`isTileCastableLive`) |
| `occupancy.ts` | Tile passability, pushback, attract. `collectMandatoryProgressionCells` = unique player→exit bridges — spawn/relocate must not sit on them |
| `battleSetup.ts` | Liveness / remaining-hostile predicates + store-HP helpers (`hpAfterIncomingDamage`, `hpAfterHeal`, `hpAfterBossPhase2`, `battleWalkHazardDamages`) |
| `combatMath.ts` | Spawn clustering, damage helpers |
| `progression.ts` | Level-derived base stats (player / enemy / summon) |
| `mapGen.ts` | Archetypes + solvability finalize (do not casually rewrite) |
| `portalRules.ts` | Run-mode portal filter + dungeon-chain snapshot / `decideDungeonChainPortal` |
| `summonSpawn.ts` / `summonExecutor.ts` / `summonIntegration.ts` | Summon lifecycle. Hostile minions: `spawnEnemySummonUnit`. Kit casts: `utils/summonControlCast.ts` (catalog `summonKit`, not `summon.spells`). `summonAI.ts` exists but `runSummonAI` is unused; live summon turns use `enemyAI.ts` |
| `summonLifespan.ts` | Lifespan tick against the **live** combatant store; drop expired ids through `removeCombatant` |
| `dotStacks.ts` | Same-name DoT append + independent per-stack duration tick (RES applied by damage helpers, not here) |
| `statusEffects.ts` | Non-DoT replace-or-refresh, AP/MP additive vs multiplicative `getStatModifier`, battle-log magnitude. WX still owns map-modifier suppression, DoT damage, death, and the expire-log loop |
| `battleStartPlacement.ts` | Battle-start cell spacing (player ≥3 / enemies ≥2, occupancy fallback) |
| `spawnPolicy.ts` | Overworld / dungeon enemy spawn policy: dungeon extra-count + tier-boost tables, valid-cell filters, family 30% variants, visual scale. `generateEnemies` still places units and re-rolls `aiTier`. Family catalog `ap`/`mp` are unused. Portal keep-clear is Manhattan ≤ 2; map-spawn keep-clear is Chebyshev ≤ 3 from (8,8); enemy spacing is Chebyshev ≥ 4 — do not merge these |

Spell targeting source of truth: `SpellConfig.targetType`, `minRange` / `maxRange`, `lineOfSight`, `linear`, `diagonal`, `freeCells`, `areaRadius`, `isBarrier`. `spell.name` is UI/log only. Sprite-click Strike and Attack Nearest must use the same live gate (`isTileCastableLive` / `isActiveHostile` on `getLiveCombatants`) — a React `enemies` snapshot misses enemy minions and leftover corpses. Attack Nearest range/LoS uses the **player** tile (`attackNearestLiveCasterPos`), not a controlled summon.

`engine/worldFeatures.ts` is the world-dynamics catalog (rarity + relative difficulty). It is **not** wired into map gen — same status as `docs/WORLD_DYNAMICS.md`.

### Map solvability

Generated maps must stay player-solvable across seeds. After `generateEnemies`, Boss Rush preferred cells, or a rest-exit encounter, call `finalizePlayableLayout` / `applyFinalizedLayout` (`engine/mapGen.ts`):

- Player spawn is a walkable, non-void cell and **not** on a non-white exit (`spawn-on-portal` skips the room when the portal is unlocked). White sanctuary gateways may colocate with spawn.
- At least one exit exists on the player's reachable graph (`pickProgressionPortalCell` if the generator omitted one). Every placed portal is punched, not only `portals[0]`.
- Every hostile spawn is on that graph (`ensureReachability` / `punchRosterReachability`). Wall/void Boss Rush kits used to seal the progression portal. Destack punches a neighboring wall when the walkable graph is too cramped; exits never relocate onto a hostile. Dual-path summons that seal both 1-wide corridors unseal via `unsealProgressionOccupants`. Leftover CA walkable islands (border 2-tile pockets outside the spawn flood) become walls (`sealUnreachableWalkable`) — do not carve new corridors. Battle-start max-spacing used to teleport the player onto those pockets and seal every exit. Destack stacked hostiles / portals onto unique reachable cells (`destackSpawns`).
- `evaluateSolvability` is the report (`player-spawn-illegal`, `isolated-enemies`, `isolated-portals`, `missing-exit-portal`, `spawn-on-portal`, `stacked-enemies`, `stacked-portals`, `enemies-on-portal`, `portal-tile-mismatch`). Property tests live in `mapGen.solvability.test.ts`; `mapGen.simulate.ts` is test-only. Joint-cut summons (two 1-wide corridors) unseal via `unsealProgressionOccupants`.

Do not change archetype fill/smooth weights to "fix" a stuck map — run the finalize pass.

### Combatant-store HP and last-hostile victory

`isActiveHostile` / `shouldAwardVictory` read **store** HP. Strip-only or React-`enemyHpMap` writes leave `hp > 0`, so the last lava/DoT/minion tick never awards victory and the "dead" unit takes another turn (including a lethal hit that persists a death penalty instead).

Write lava/spikes, plague/DoT, player-spell damage, enemy self-heal, and boss phase-2 HP through `updateCombatant` (helpers in `battleSetup.ts`). Tick DoT on enemy summons too — a last-minion plague death must enter the death pipeline.

`shouldAwardVictory` requires `inBattle`, `!deathTriggered`, a non-empty **battle-start** id snapshot (`battleStartIdsSize`), and `hostilesRemaining === 0`. After the last hostile dies (lava, lifespan fade, DoT), skip the leftover turn dispatch (`turnQueue.liveTurnOrder` + `nextTurnIndex`) or a queued AI/summon turn can still fire.

`countsTowardKillRewards` excludes player-side summons (and the player). Allied / leftover-wolf kills must not enter `applyRewards`. `selectDefeatedEnemiesForRewards` still prefers the attributed-kill roster.

Player Mirror uses the token `"player"` (`activatePlayerMirror` / `consumePlayerMirror`) — the same key the enemy-cast path consumes. Writing the player's tile key made Mirror a 4-AP no-op.

## Auth, admin, debug

- Actor hook: `hooks/useActor.ts`. `VITE_USE_MOCK=true` returns the shared `mocks/backend.ts` singleton.
- Admin UI is lazy-loaded. Button is `isAdmin && onOpenAdmin`. Backend still enforces `#admin` on writes.
- Feats: `useGetPlayerAchievements` must pass `identity.getPrincipal()`. Omitting the Principal throws at Candid encode (caught → `[]`) or fails `caller == player` and returns `[]` — every feat stays locked and Claim never renders. Double-click: `shouldBeginAchievementClaim` (in-flight set). A second click that hits "already claimed" after the first `#ok` must **not** rollback (`shouldRollbackClaimFailure`).
- Debug overlay lives in `ChatPanel` (always mounted on the world stage). **Shift+D** opens the Debug channel. Ring buffer (`debug/debugLogger.ts`) runs in production; console output is dev-only. Click-trace / geometry overlay are `import.meta.env.DEV`.

## Migrations

`mops.toml` `[canisters.backend.migrations] chain = "src/backend/migrations"`, `check-limit = 5`. Caffeine builds the backend with exactly `mops build` (`src/backend/caffeine.toml` `[build]`), so this chain is what the replica runs. Baseline `.old/src/backend/dist/backend.most` (directory gitignored; file force-tracked) is **Caffeine-owned**: the byte-identical `.most` of the last build Caffeine deployed successfully — the 2026-08-31 import (PR #181 merge `f8aa05e`), latest applied `20260831_000000`, 42 stables, **no GameKey**. Caffeine compares every import against its own copy of that file (PR #311 committed a hand-made `.old` with GameKey and Caffeine still failed M0263), so the repo copy exists only to make local `mops check` behave like Caffeine's. Other recorded shapes: `src/backend/migrations/snapshots/deployed/*.most`; documented non-upgradable shapes: `snapshots/unsupported/` (PR #258 GameKey-on-`20260831`, Caffeine #340 legacy); fresh import: `snapshots/empty-canister.most` (see `snapshots/README.md`). `python3 scripts/check-eop-stables.py` freezes NewActor field lists through 20260901, requires every recorded tail name to remain a chain file, rejects a blank or unrecorded `.old`, and applies the runtime upgrade rule to every snapshot (`--verdict <file.most>`).

Runtime rule (moc 1.11.2 `--enhanced-migration`, `src/lowering/desugar.ml`): the canister stores the names of the migrations it applied; on upgrade the new program matches the **most recently applied name** against its chain file names, loads the state as the chain type at that position and runs every later file. Name missing from the chain → `{}` genesis input → `RTS error: Memory-incompatible program upgrade` (IC0503). Fewer fields at that position than the canister holds → IC0503. More fields → `stable variable … not found in persisted state`. Compile-time rule (`mops check-stable`, `mo_types/type.ml`): position = last name in the previous `.most` chain block; every field not produced by a later file is a required input there (M0263), a field nobody consumes is dropped (M0169); at the chain head nothing is required (false negative). The wasm never depends on `.old`.

Lex order (never rename or delete a file; never edit a shipped `NewActor`):

| Module | Job |
| :--- | :--- |
| `20260801_000000.mo` | Empty-canister genesis (`OldActor = {}`), renamed from `20260826` so it sorts before every name a live canister recorded. Must stay first so a fresh install compiles (M0263). |
| `20260803_185500.mo` | Name-only no-op (`(_ : {}) : {}`). Caffeine builds #347/#348 recorded this name on `cwofb-yqaaa-aaaap-qp45q-cai`; keeping it lets that canister resume from `20260827`. |
| `20260827_000000.mo` | Legacy → enhanced-orthogonal: inlined types, `NewActor` drops transients that `main.mo` now marks `transient` (`BUFF_CATALOG`, `DEFAULT_ENEMY_NAMES`, `ROLE_CHANGE_MIN_NS`, `chatMessages`, `nextChatId`, `enemyNamesInitialised`). Player/config maps copy through. |
| `20260831_000000.mo` | **Frozen — the 2026-08-31 deployed tail.** Seeds `isSummon` / `summonAI` / `summonLifespan` / `summonUnitDef` on persisted admin `SpellConfig` rows; introduces rollback stables (`*Prev` / `has*Prev`) and `adminAuditLog`. **No GameKey** — PR #258 adding it here (and #311 keeping it here) is what broke the Sep-1 deploy and the #311 import (M0263). |
| `20260901_000000.mo` | **Frozen — GameKey.** `OldActor = {}`; `NewActor` = `gameKeyRequests`, `gameKeyLedger`, `gameKeyReveals`, `lastGameKeyRequestAt`, `nextGameKeyRequestId` with empty / zero defaults. Runs on the Aug-31 tail; a #259–#311 fresh install already recorded this name and is at the head. |

- Inlined `OldActor` / `NewActor` (no project type imports).
- Fresh-install seeds live in `main.mo` `do { }` blocks (empty `appVersion` → `"v163"`, default game config, etc.) — not in the migration module.
- Current `main.mo` is a plain `actor {` — it does **not** use `(with migration = Migration.run)`. **mops injects** `--enhanced-migration` from the chain directory, and Caffeine runs mops. The annotation exists only on the legacy `backend_extended` actor.
- New persistent `let`/`var` on `main.mo` require a **new later** chain file (`20260902+`, input `{}` for pure additions). Static `mops check-stable` is necessary but not sufficient (it passed Aug-31 → #258, which trapped); `scripts/eop-upgrade-matrix.mjs` installs each candidate on PocketIC and upgrades to HEAD.
- After every successful Caffeine deploy, refresh `.old` byte-for-byte from that build's `src/backend/dist/backend.most` (or `caffeine projects clone` → `.old/`, or `dfx canister --network ic metadata <id> motoko:stable-types`, controller-only) and add the same file under `snapshots/deployed/`.

A deployed canister still running the old 15-field `CharacterStats` (or pre-summon `SpellConfig`) will reject the new shapes until it is upgraded so these modules actually run.
