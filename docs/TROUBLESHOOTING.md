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
pnpm check      # required — same Biome run Caffeine import uses
pnpm fix
pnpm build
mops check      # or caffeine check; required when Motoko / mocks / migrations change
pnpm bindgen    # after Candid / Motoko public-type changes
bash scripts/caffeine-import-gate.sh all
bash scripts/open-pr-stack-compat.sh --self
```

Frontend scripts (`src/frontend/package.json`): `dev` (Vite), `build`, `typecheck`, `check` / `fix` (Biome).

Caffeine GitHub → import frontend gate is exactly `src/frontend/caffeine.toml` `[check]`: `pnpm typecheck` then `pnpm check` (`biome check src`). Backend `[check]` is `mops check`. `pnpm fix` is the same Biome run with `--write`. Unused locals and React hook deps are errors in `src/frontend/biome.json` so local `pnpm check` fails the same way as the import. Do not treat those diagnostics as pre-existing. Full inventory: [CAFFEINE_IMPORT_GATES.md](automation/CAFFEINE_IMPORT_GATES.md). Oldest-first open PRs: [OPEN_PR_STACK_COMPAT.md](automation/OPEN_PR_STACK_COMPAT.md) (`bash scripts/open-pr-stack-compat.sh --self`). CI: `.github/workflows/caffeine-import-gate.yml` (frontend + Motoko + `open-pr-stack` jobs; no `caffeine build`).

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

`updateCharacter` keeps stored `level` / `experience` / `stats` / spell-level arrays (cosmetics only). A stale full-record payload cannot mint HP or spell levels.

`saveBattleStats` clamps HP with `maxPersistedHp`: `100 + (level-1) * growthPercent` (not `level*200+100`, which allowed 300 HP at level 1). Do not cut HP already stored above that cap (`persistHpWriteCap`). Other Motoko checks on dedicated writers:

- `ap <= 20`, `mp <= 20` on `saveBattleStats`
- `level` and `killCount` cannot decrease (`saveBattleStats` / `saveKillCount`)
- `colors.length <= 16`
- slot must already exist

### Profile create rejected

`saveCallerUserProfile` writes the payload as-is (no field merge). `{ name }` without `uiLayout` fails Candid. New accounts must send `uiLayout: ""`.

### Rewards applied twice, wiped, or not at all

- Persist **credits** (victory, portal XP, pickups, shrine, dungeon-complete, boss-rush room) only with `applyRewards` (`rewardResolver.ts` / `applyRewardsResult.ts`). Official deltas clamp to `100_000` Doka / `500_000` XP. Above that the canister `#err`s and the whole grant (including challenge XP) is dropped.
- Persist **penalties and spends** with `saveBattleStats` through the persist lock. `applyRewards` is `Nat`-only and cannot subtract.
- Do **not** call `updateCharacter` to write reward XP/Doka (or to debit the wallet — `Character` has no `dokaBalance`).
- Do **not** call `resolveBattleRewards` per kill. Death pipeline attributes kills into a list; victory calls the resolver once.
- Enqueue every credit **and** every `saveBattleStats` on `createProgressPersist`. A recap heal/shop click that snapshots the pre-credit wallet wipes the grant.
- Recap must stay mounted in `App.tsx`. Showing it from `WorldExploration` loses it on the battle → map transition.

`saveBattleStats` writes HP / AP / MP / atk / res / init / XP and the per-principal `dokaBalances` map. It **ignores** the spell-level arrays — `upgradeSpell` is the sole writer. It is not the battle-reward funnel. Incoming Doka/XP/level/atk/res/init **above** the stored values are ignored (never mint). A stale **lower** client level can still downgrade the canister — official `clampSaveBattleStatsWrite` keeps stored level.

### `dokaBalance` on `Character`

The field was removed from the Motoko `Character` type. Frontend `gameTypes.Character.dokaBalance` is a convenience alias. Bindgen drops unknown fields. Balance APIs: `getCallerDokaBalance`, `applyRewards`, admin grants.

### Recap heal refunds a just-claimed or just-won wallet

`saveBattleStats` is an absolute write. After victory / shop credit / feat claim, the recap is already clickable. A heal that reconstructs from the pre-credit snapshot (or from `getCallerDokaBalance` after a query invalidate) persists the old balance.

Fix: run the credit on the persist lock and `commit` the post-credit Doka. Add the granted delta onto the live UI (`applyShopCreditDeltaToUi`). Do not `invalidateQueries(['callerDokaBalance'])` after a persist-lock claim (`shouldInvalidateCallerDokaAfterClaim`). Once the world is hydrated, `shouldApplyCallerDokaHydrate` must stay false — window-focus refetch is the same class of bug.

### First-map death / idle hydrate writes Doka 0

The persist lock starts at `doka = 0` until an authoritative read or credit seeds it. GameFlow's pre-query state is also 0. A lava/combat death that penalizes that placeholder and `saveBattleStats`s it wipes the canister.

- `walletReady` is `queryResolved && sessionCacheApplied` — not merely “React Query has data”.
- Once seeded, `shouldCopyIdleWalletDoka` refuses **any** idle copy (not just cuts). A ghost HUD or stale-high query used to copy `incoming >= committed` and mint.
- Unseeded death/heal must `resolveCommittedDokaForAbsoluteWrite` (live `getCallerDokaBalance`); skip the absolute write if the read fails.
- Do not `commit` a rename/feat delta stacked on the placeholder (`shouldCommitRenameDokaSpend`).
- Idle hydrate must not copy leftover XP from a lower UI level over a post-`applyRewards` level-up (`resolveHydratedXp`). That leftover refunds the death XP cut on the next `saveBattleStats`.

### Death 20/40 never lands after reload / remount

`persistDeathPenalty` writes `pbv_pending_death_penalty_slotN` to **localStorage** (`defaultDeathPenaltyStorage`). Replay only when the canister still matches the pre-penalty snapshot (`resolvePendingDeathReplay`). Compare **canister** XP (`experienceFromCharacterRecord`), not GameFlow's Play-entry `character.experience` — that prop is never updated after `applyRewards`, so a remount used to clear the marker and skip the cut. Heal/shop after a failed persist uses `applyUnpaidDeathPenaltyToWrite` (XP still pre, Doka already spent).

### Ground coin / shrine / dungeon-complete credited twice

`applyRewards` is a raw Nat add. Claim a one-shot id **before** enqueue (`tryClaimPickupId` / `tryClaimFlag` / `tryClaimDungeonChainBonus` in `dokaPersist.ts`). Ground Doka used to credit inside `setDokaLoot` — React may replay that updater. Parse the result with `readApplyRewardsOk`; a `{ _ok }` that used to yield NaN left the canister credited and the persist lock unchanged.

After persist, `settleOneShotAfterCredit`: `#ok` with a gain → commit; explicit canister `#err` → **release** the claim (safe retry); transport/parse miss after invoke → **keep**. Releasing on a transport miss lets the next RAF step remint.

### Victory XP advertised but `applyRewards` rejected

A 0.01% Doka-Fever roll (or dungeon 4× × Fever 2×) can exceed `100_000` Doka. The canister then `#err`s the **whole** call, so XP and challenge rewards vanish too. Official persist must `clampApplyRewardsDeltas` first.

### Rename debit on a rejected name / stale click-time wallet

`renameCharacter` returns `{ #ok | #err }`. Candid resolves `#err` as a value — it does not throw. Parse with `readRenameCharacterResult` and debit only on `#ok`.

Debit `dokaBalanceRef` (live), not the click-time `dokaBalance - 100`. Recap is `pointer-events: none`, so a rename can finish after `applyRewards` credits the wallet. A stale subtract then lets idle hydrate persist the short wallet.

### Shop purchase never credits / nine-arg Candid reject

Paid Doka is **Buy Doka** (`DokaGameKeyShop.tsx`): Mollie pay → `requestGameKeyPurchase` → admin approve → email 120-char GameKey → `redeemGameKey` while logged in. Credits the **caller**. Official persist is `redeemGameKeyThroughPersist`: commit the `#ok` granted amount onto a seeded lock (`shouldCommitGameKeyRedeem`). A follow-up `getCallerDokaBalance` can still be the pre-redeem wallet; committing only on that delta used to skip the credit after the key was already consumed, then `saveBattleStats` wiped the mint.

`initiatePurchase` (nine positional Text args) always `#err`s: `"Doka purchases now use GameKey requests…"`. Passing a customer object still fails Candid, but even a well-formed call cannot mint. `processPendingPurchases` always returns `0`; remount still calls it, and `shouldCommitShopCredit` must refuse that no-op snapshot.

Items (BuffShop potions) is a different store — do not send potion checkout through GameKey, or GameKey through `BuffShop`.

### Item shop spend refunds and items do nothing

`BuffShop` returns `null` unless `isOpen === true`. Host it in `WorldExploration` so buys go through `saveBattleStats` on the persist lock and uses reach `handleUseItem`. A `GameFlow`-only local deduct is restored on the next `getCallerDokaBalance` hydrate. Consume from `inventoryRef` (`tryConsumeBuffItem`) — a double-click on React state used to spend one stack twice. Copy GameFlow's `dokaBalance` prop onto the live ref only when the prop actually changed (`syncLiveDokaFromProp`); a child-only HP update used to restore a stale-high wallet and refund the spend.

### Portal +10 XP appears then vanishes / unpaid XP persists

Portal step XP is `PORTAL_TRANSITION_XP` (10) through `persistIncrementalRewards`. Do **not** add it to the HUD before `applyRewards` commits. Optimistic leftover + a failed persist lets `hydrateWhenIdle` copy unpaid XP onto the lock; the next `saveBattleStats` writes it. After commit, still gate the live hydrate with `shouldApplyVictoryLiveHydrate` (death epoch) — lava on the new map can land while the write is in flight.

### Challenge XP advertised but never persisted

`handleBattleEnd` is a `useCallback` that omits `challengeAccepted` / `currentChallenge`. Pass the live accept flag and challenge from refs (`liveBattleChallengePersistEntries`). Persist both `dokaReward` **and** `xpReward` (hard/legendary objectives show 400–1000 XP). Persist only when `isChallengeCompleted` is true (`utils/challengeCompletion.ts`).

The opening player turn never goes through `advanceTurn`. Without `shouldCountOpeningPlayerTurn`, six player turns still read as 5 and Blitz (900 XP) credits. Overworld Doka-to-HP must not flip `healUsed` — the flag only clears in `cleanupBattle`, so a pre-fight heal fails the next no-heal challenge. In-battle BuffShop potions must call `recordChallengeItemHealUsed` or easy_1 / hard_1 still persist after a mid-fight drink.

Sacrifice (`loseSelfHp`) floors the player at 1 and never entered `playerTakesDamage`. Without `recordChallengeSelfHpLoss`, Untouchable still persists after a 20% self-hit.

Pacifist Run flips only on a resolved offensive cast. Range preview / `getSpellRangeTiles` must not call `applyHealBuffSideEffect` — selecting Strike to see range used to fail the feat without a cast.

### Untouchable / under-damage challenge credited after a hit

`challengeTotalDamageRef` used to increment only on the boss-ability branch. Regular melee, spells, Void Mirror, Reflect Shield, Mirror Field, Thorned Ground, Void Rift, and **Sacrifice** must call `recordChallengeDamageTaken` / `recordChallengeSelfHpLoss`. Lava / spikes must call `recordInBattleChallengeDamage(inBattleRef, …)` — **not** out of combat, because the counter is zeroed in `cleanupBattle`, not at battle start.

`hard_3` (`under_8_ap_per_turn`) uses a **peak** AP spend. Reset only the per-turn accumulator at turn start; the peak clears in `cleanupBattle`.

### Attack Nearest / canvas summon costs 0 AP

Attack Nearest calls `resolvePlayerCast` directly (not `executeCastAttempt`). Canvas summons return `"summon"` — `castResultSpendsAp` includes that result. Both paths must debit AP and `recordChallengeApSpend`. A free cast also hides a 9+ AP dump from `hard_3`. Tile follow-up after `executeCastAttempt` must **not** debit again on fizzle (`castFollowUpShouldDebitAp`).

Attack Nearest and sprite-click Strike must pick from `getLiveCombatants` + `isActiveHostile` / `isTileCastableLive` (range, LoS, cooldown). A React `enemies` snapshot misses enemy minions and leftover corpses, and leftover AP used to recast Inferno every click without consulting the cooldown map. Range/LoS origin is the **player** tile (`attackNearestLiveCasterPos`) — using the controlled summon spent player AP on a self-heal that never applied.

### Touch tap casts twice

Canvas listens to `onTouchEnd` and `onClick`. Mobile browsers still dispatch a synthetic click after `touchend`. Drop it for 400ms (`shouldIgnoreClickAfterTouch`). One physical tap with leftover AP used to fire two casts.

### Spell upgrade debit is 10× too large (summons)

Spellbook summon UI shows `SUMMON_UPGRADE_COST_MULTIPLIER * 10 * 2^level` (100 at level 0). `upgradeSpell` charges `spellLevelingBaseCost * 2^level` (default base **10**). Debit with `spellUpgradeUiSpend(advertised, committedBefore, backendAfter)` so idle hydrate cannot copy the under-count over committed.

`getCallerDokaBalance` after `upgradeSpell` is a query. A stale pre-upgrade read is `>= committedBefore`. Committing that snapshot refunds the spend on the lock; the next `saveBattleStats` writes it back. Use `committedDokaAfterSpellUpgrade` — keep the observed wallet only when it actually decreased.

### Spell upgrade wiped by the next heal

`upgradeSpell` must enqueue on the persist lock and update `spellLevelsRef` **inside** that queued fn, before any later `saveBattleStats`. The canister now ignores heal/death spell-level arrays, but a local map rollback still shows the pre-upgrade level until reload. Deduct Doka as a UI delta (`dokaBalance - cost`); do not replace the wallet with the absolute post-upgrade read.

### Leftover XP HUD shows 0 / bar never moves

`Character.experience` is leftover in the current level, not lifetime total. Subtracting `cumulativeXpToReachLevel` zeroes the selection / top-bar / recap fill. Use `xpHudProgress(experience, level)`. Level 48+ thresholds exceed `MAX_SAFE_INTEGER` — persist math must use `xpThresholdBigInt`.

### `killCount` never increments in the client

`useSaveKillCount` is defined in `useLeaderboardQueries.ts` and is unused. World saves only **preserve** the current count. Leaderboard kill totals will stall until a caller invokes `saveKillCount`. The canister now requires `#user`, not banned, and `kills <= 64` (single-battle bound).

### Deployed canister still on 15-field stats / pre-summon SpellConfig

Source on disk can be 12-field while the live canister is not. Symptom: Candid / upgrade errors on create or update. Fix: upgrade so the migration chain actually runs (`20260801` genesis, `20260803_185500` name-only, `20260827` drop-transients, `20260831` summon fields + rollback stables, `20260901` GameKey maps). Restarting the frontend is not enough. After the Motoko rebuild, `pnpm bindgen` — `backend.ts` SpellConfig can still omit `isSummon` / `summonUnitDef`.

### Caffeine import `vite build` fails: Multiple exports with the same name

esbuild cannot transform a module that declares the same `export function` twice. Typical restack-union failure: two copies of `shouldFloatWorldUnreachable` in `walkRejectCopy.ts`. Gold-highlight / “does not change pathfinding” is the intended helper — keep **one** implementation.

`pnpm typecheck` (TS2393), Biome `noRedeclare`, and `python3 scripts/check-duplicate-exports.py src/frontend/src` must fail first. Stack-compat “union overlapping files” does not mean concatenate two `export function` copies.

### Caffeine import / deploy fails on the EOP migration chain (M0263 at `mops check`, or IC0503 at `install_code`)

#### Deep analysis (2026-09-02, moc 1.11.2 source + PocketIC)

**1. Mechanism.** Caffeine builds the backend with `mops build` and checks it with `mops check` (`src/backend/caffeine.toml`), so the `mops.toml` migration chain **is** what runs on the replica. Two different rules decide the chain position:

- *Runtime* (`moc/src/lowering/desugar.ml`, `rts_was_migration_performed`): the canister stores the names of the migrations it applied (RTS `migration_functions`). The new wasm is a nest of `migrate_step_k`: from the **last** step down, `if (most recently applied name == name_k) then ICStableRead(type_k) else run step k on the result of step k-1`. So the position is the chain file whose name equals the canister's most recently applied name; every later file runs. No name matches → `ICStableRead(type_0)` with the genesis input `{}` → `RTS error: Memory-incompatible program upgrade` (IC0503) on any populated canister (`rts/motoko-rts/src/persistence.rs` `update_stable_type`). A stable that is neither in the loaded state nor produced by a step that ran → `stable variable … not found in persisted state (migration should have initialized it)`.
- *Compile time* (`moc/src/mo_types/type.ml` `pre` / `post` / `match_stab_sig`; `mops check-stable` = `moc --stable-compatible <previous.most> <new.most>`): the position is the **last** name in the previous `.most` chain block. moc folds the new chain backwards to that position: every actor field not produced by a later file is a **required input** (M0263 when the previous version lacks it), every `OldActor` field of a later file is required, and a previous field no later file consumes that the actor no longer declares is dropped (M0169). When the previous version is already at the head of the new chain nothing is marked required — a false negative (2026-08-31 → PR #258 passed the check and trapped at runtime).
- The built wasm does **not** depend on `.old/…/backend.most`: `mops build --verbose` passes only `--enhanced-migration=src/backend/migrations` to moc (no `--stable-baseline` before moc 1.15), and the wasm md5 is identical with a blank, a wrong and the real `.old`. Renaming the genesis file is harmless: it is never the most recently applied name.

**2. What Caffeine uses as "previous version".** Its own copy of the `src/backend/dist/backend.most` of the last build it deployed successfully (`caffeine projects clone` writes that stored file to `.old/src/backend/dist/backend.most`). It does not read the repo's `.old`: PR #311 committed an `.old` *with* GameKey and Caffeine still reported M0263 for the GameKey fields. `moc --stable-compatible` against the rebuilt 2026-08-31 import signature (PR #181 merge `f8aa05e`: chain `20260826/27/31`, 42 stables, no GameKey) reproduces Caffeine's five M0263 lines exactly; no other candidate shape (#354, #348, #258, #259/#309, blank) produces them.

**3. Timeline.**

| When | Target | New chain | Deployed / recorded shape | Why it failed (PocketIC reproduction) |
| :--- | :--- | :--- | :--- | :--- |
| 2026-08-31 18:50 UTC | Caffeine import of PR #181 | `20260826 {}` → `20260827` → `20260831` (no GameKey) | — | succeeded; this `.most` became Caffeine's previous version |
| 2026-09-01 21:5x | `cwofb-yqaaa-aaaap-qp45q-cai`, PR #258 | GameKey stuffed into `20260831` | Aug-31 shape: `stable variable gameKeyRequests … not found in persisted state`; Caffeine #348 shape (`20260803_185500`): `Memory-incompatible` | either way the applied `20260831` had no GameKey / the name was not in the chain; `mops check-stable` passed (head-position false negative) |
| 2026-09-02 06:4x | `cwofb…`, PR #259 | `20260901` adds GameKey on top of no-GameKey `20260831` | Aug-31 shape upgrades **cleanly** on PocketIC | trap only reproducible if `cwofb` still held a Caffeine #347/#348 tail (`20260803_185500` not in the chain → genesis → `Memory-incompatible`) |
| 2026-09-02 07:04 | `zh6cg-aaaaa-aaaad-aar2q-cai`, PR #309 | same chain as #259 | Aug-31 shape upgrades cleanly on PocketIC | same as above — the trap implies `zh6cg`'s memory was not the Aug-31 shape at that moment, or the trap was not the chain (see residual uncertainty) |
| 2026-09-02 ~08:30 | Caffeine `mops check` of PR #311 | `20260801 {}` → `20260803` no-op → `20260827` → `20260831` **with** GameKey → `20260901` no-op | Caffeine record = Aug-31 shape | compile-time **M0263 ×5**: the `20260901` no-op after `20260831` makes every field required at that position; the record lacks GameKey. Would also have trapped at runtime (`not found in persisted state`) |

**4. Why compile time this time.** #258/#309 kept the record's position (`20260831`) at or near the chain head, where moc requires nothing, so their checks passed and the replica trapped. #311 put a step *after* `20260831`, so moc computed the required inputs at that position and finally compared them with what Caffeine actually holds. The M0263 list is therefore the first hard evidence of the previous version: latest applied `20260831_000000`, all 42 non-GameKey stables present, no GameKey.

**5. Fix (this branch).** `20260831_000000.mo` is back to the deployed no-GameKey shape (frozen); `20260901_000000.mo` introduces the five GameKey stables with `OldActor = {}`; `20260801` genesis and `20260803_185500` no-op stay; `check-limit = 5`; `.old` is the byte-identical `f8aa05e` build signature (also `snapshots/deployed/caffeine-aug31-import-tail-20260831-no-gamekey.most`). `mops check` against it fails with Caffeine's M0263 on the #311 chain and passes on this one. PocketIC (`scripts/eop-upgrade-matrix.mjs`): Aug-31 → HEAD, empty → HEAD, empty → Aug-31 → HEAD, Caffeine #348 → HEAD, #354 → HEAD, #354 → Aug-31 → HEAD, #259 fresh → HEAD, #309 fresh → HEAD, Aug-31 → #259 → #309 → HEAD, #311 fresh → HEAD all upgrade with the probe profile preserved and the GameKey maps initialised. Residual uncertainty: the 07:04 trap on `zh6cg` is not reproducible from the Aug-31 shape, so if that canister's memory is a Caffeine #347/#348 tail the chain still serves it (via `20260803_185500`); if it is the #340 legacy actor or a PR #258 fresh install it does not (`snapshots/unsupported/`), and the bridge is: deploy `origin/main@31feee5` (Caffeine #347, adopts the legacy actor) resp. `origin/main@d8b8f35` (#311 chain, GameKey on `20260831`) first, then this chain. Read the real state with `dfx canister --network ic metadata <id> motoko:stable-types` (controller only) or `caffeine projects clone` (`.old/` = Caffeine's copy).

**6. Prevention.** `.old` is Caffeine-owned (byte-identical to the last deployed build, recorded under `snapshots/deployed/`, never blank, never hand-written; `check-eop-stables.py` enforces the match); new stables only in a file that sorts **after** the deployed tail with `OldActor = {}`; never rename/shrink a shipped step; `python3 scripts/check-eop-stables.py` applies the runtime rule (stricter than moc's check) to `.old`, every `snapshots/deployed/*.most` (must pass) and `snapshots/unsupported/*.most` (must fail), and `--verdict <file.most>` explains any signature; `bash scripts/caffeine-import-gate.sh backend` + `node scripts/eop-upgrade-matrix.mjs` before every backend PR.

#### Operational fallback when the deployed shape is unknown

(a) Read the live signature and validate against reality:

```bash
dfx canister --network ic metadata zh6cg-aaaaa-aaaad-aar2q-cai motoko:stable-types > deployed.most
mops check-stable deployed.most backend
python3 scripts/check-eop-stables.py --verdict deployed.most
```

moc 1.11.2 stores the full `.most` as the `icp:private motoko:stable-types` custom section, so only a **controller** can read it. Caffeine controls its canisters: if `dfx` is rejected, `caffeine projects clone <project-id> <dir>` gives Caffeine's previous-version copy in `<dir>/.old/src/backend/dist/backend.most`; or compare `dfx canister --network ic metadata <id> candid:service` (public) with `src/backend/dist/backend.did` history to identify the commit, then `mops build` that commit and take its `src/backend/dist/backend.most`. Commit the result byte-for-byte as `.old/src/backend/dist/backend.most` and under `snapshots/deployed/`, and make sure its latest chain name is a file in `src/backend/migrations/`.

(b) Fresh reinstall when the canister only holds disposable test data: in Caffeine choose the reset / deploy-fresh option for the project (equivalent of `dfx canister install --mode reinstall`). Every stable map (`characterSlots`, `dokaBalances`, achievements, purchases, GameKey ledger, admin configs) is wiped and the whole chain runs from `20260801`. Local proof: `mops check-stable src/backend/migrations/snapshots/empty-canister.most backend`. This needs no upgrade path at all.

Recommendation: import this branch first — it is built for the shape Caffeine's own check proves (the 2026-08-31 record), and also for the Caffeine #348/#354 tails and fresh #259–#311 installs. Fall back to (b) only if a readout shows one of the `snapshots/unsupported/` shapes and the data is expendable; otherwise bridge through the commit named in `snapshots/README.md`.

### `dfx.json` vs `mops.toml`

`dfx.json` → `src/backend_extended/main.mo` (**path does not exist**). The stale 15-field actor is root `backend_extended/main.mo`.  
Root `mops.toml` → `src/backend/main.mo` (canonical).

Do not `dfx deploy` expecting the current game actor unless `dfx.json` is pointed at `src/backend/main.mo`.

### OQL / `caffeine check` M0010

`caffeineai-oql@0.4.0` is a real dependency and **is imported** at the bottom of `main.mo`. Some `caffeine check` toolchains fail with `M0010 package not defined` even when `mops sources` resolves the package. If check fails on OQL only, it is a toolchain mismatch — do not delete the `Expose` block without a replacement plan.

### Chat vanished after upgrade

Expected. `sendMessage` / `getMessages` are in-memory (`main.mo` comment at the chat block).

### Chat shows the wrong name

`sendMessage` ignores the client `playerName` and uses the caller's `userProfiles` name. A raw client cannot impersonate. Empty profile → `"Player"`.

### Phone / tablet cannot start

Viewport `< 768px` is a warning, not a hard block. **Continue anyway** writes `sessionStorage` `pbv_small_screen_continue` for the tab. Primary chrome is 44px min-height.

### Retired spell upgrade / built-in delete

`upgradeSpell` rejects a `usableByPlayer=false` spell the player never owned. Built-in ids cannot be deleted — retire them. Admin payloads that fail `adminGuard.mo` return `#err` before any store write.

### Recap never shows the in-battle feat unlock

Unlocks must ride `BattleRecapData.newlyUnlockedAchievements` (`attachRecapUnlocks`). The recap mounts in `App.tsx`; a WorldExploration-only `useState` never reaches it.

Wallet/level feats (`doka_1000`, `doka_10000`, `level_10`) wait until `applyRewards` commits (`shouldDeferAchievementUnlockUntilRewardsPersist`). Firing them from projected recap totals `#err`s against the pre-credit snapshot, and `achievementsShownRef` then blocks the post-credit retry.

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
- Persist `currentRoom` on room clear **before** `applyRewards`, both on the persist lock. `persistRoomClear` must throw if `setBossRushProgress` / `resetBossRush` did not run — a swallowed progress error still ran `applyRewards` and a reload re-entered the same room. `completeBossRushRoom` no longer mints client-supplied Doka/XP. `setBossRushProgress` traps if `currentRoom` decreases — abort with `resetBossRush`. `completeBossRushRoom` accepts `roomIndex == currentRoom` or `currentRoom - 1`.
- `createCharacter` / `deleteCharacter` clear slot-scoped progress. Lava/spike death must `abortBossRush` so a late room-clear write cannot resume mid-tree.
- After a room clear, `setInBattle(false)` as well as `inBattleRef = false`. `cleanupBattle` only clears the ref; React `inBattle === true` blocks `checkBattleTrigger` and room 2 never starts.

### Last-hostile victory never fires / leftover AI kills the player

`isActiveHostile` reads **store** HP. Lava/spikes, plague/DoT, player-spell damage, enemy self-heal, and boss phase-2 must `updateCombatant`. Strip-only or `enemyHpMap` writes leave `hp > 0`, so the last tick never awards victory and the "dead" unit takes another turn (including a lethal hit that persists a death penalty). Tick DoT on enemy summons. After the last hostile dies, skip leftover turn dispatch (`liveTurnOrder` + `nextTurnIndex`).

Enemy minions must spawn via `spawnEnemySummonUnit` (`side: "enemy"`, turn type `"enemy"`). Default `side: "player"` hands them to the control panel and drops them from victory. Player-side / allied kills must not enter `applyRewards` (`countsTowardKillRewards`).

### Generated map has no reachable portal / sealed Boss Rush room

Do not retune archetype fill to fix a stuck seed. After generateEnemies, Boss Rush preferred cells, or rest-exit, run `finalizePlayableLayout` / `applyFinalizedLayout`: legal spawn (not on the exit), at least one reachable portal, hostiles punched onto the walkable graph. Wall/void Boss Rush kits used to seal the progression portal. `evaluateSolvability` names the failure (`isolated-enemies`, `isolated-portals`, `missing-exit-portal`, `spawn-on-portal`, …). Dual-path summons that seal both 1-wide corridors unseal via `unsealProgressionOccupants`. Summons must not sit on unique player→exit bridges (`collectMandatoryProgressionCells`). Leftover CA walkable islands become walls (`sealUnreachableWalkable`) — battle-start spacing used to teleport the player onto those pockets and seal every exit.

### Jackpot heal refunds / charges twice

Jackpot heal spends 1 Doka from the **live** wallet (`nextDokaAfterJackpotHeal`), not the render snapshot. Overworld Doka-to-HP must use `shouldStartDokaHeal` (live ref + in-flight) and persist `nextHpAfterDokaHeal` — re-reading `characterStatsRef` after the eager updater writes the heal twice. `mergeVictoryRewardLiveStats` must keep leftover combat HP (or a recap heal) when it is already above the post-battle floor — replacing HP undoes the paid heal and the player is charged twice.

### `calculateAndAwardDoka` looks like a reward API

It is a no-op stub (returns `0`; Candid kept). Official XP/Doka go through `applyRewards`. Do not wire the official funnel to it.

### Motoko / frontend level-up floors differ

`progression.getPlayerBaseStats` uses floors AP=8, MP=4 (plus optional `LevelUpConfig` growth). Character creation defaults AP=10, MP=5. Battle init prefers the formula when they diverge — do not “fix” one without checking the other.

## Operational checklist (canister upgrade)

1. Confirm `src/backend/main.mo` and `migrations/` match the intended `CharacterStats` (12 fields, `killCount` present, no `wp`/`wr`/`scp`) and admin `SpellConfig` summon fields. Chain: `20260801` genesis (`OldActor = {}`), `20260803_185500` name-only, `20260827` drop-transients, `20260831` summon + rollback (frozen, the 2026-08-31 deployed tail), `20260901` GameKey maps (frozen, `OldActor = {}`). New persistent fields need a **new later** file — do not edit a shipped `NewActor`.
2. Confirm `applyRewards` uses `100 * 2^(N-1)` (same as `utils/xpCurve.ts`).
3. `caffeine check --fix` then `caffeine build` (or the project’s deploy pipeline). Do not `dfx deploy` — `dfx.json` points at missing `src/backend_extended/main.mo`.
4. `pnpm bindgen` and commit generated client files.
5. Smoke: create character (full stats), play, win a battle **and** a boss-rush room, confirm recap + wallet/XP moved **once**; then heal once and confirm the credit was not refunded. Confirm `currentRoom` advanced before the room-clear credit (reload must not re-enter the paid room).
6. Smoke: accept a battle challenge, complete it, confirm advertised XP landed. Die on lava after a recap — HP stays down and the 20/40 penalty sticks. Respawn HP must match `respawnHpAfterDeath` (not above max).
7. Confirm chat empty after upgrade is expected; Doka / slots / configs / boss-rush `currentRoom` are not. Confirm `${principal}_inventory` survived if `APP_VERSION` bumped.
8. Smoke: accept Untouchable, take a regular melee **or** a Void Mirror / lava-in-battle / **touch-walk** Thorned Ground hit **or** a Sacrifice self-hit, confirm the reward is **not** granted. Attack Nearest (from the player tile) and a canvas summon both debit AP and honor cooldown. One touch tap must not cast twice.
9. Smoke: die on the first map before the Doka query paints — canister wallet must not become 0. Walk a dungeon-chain progression portal and confirm the next depth (not an overworld map). White sanctuary portal must be walkable at spawn. Rest-exit dungeon must still be a chain at depth 1. Reload after a lava death before persist lands — 20/40 must still apply (`pbv_pending_death_penalty_slotN`).
10. Smoke: last-enemy lava / last-minion DoT awards victory once. A generated overworld / Boss Rush / rest-exit map must have a reachable exit from spawn. Ground coin / shrine / dungeon-complete credit once. Selection / top bar show leftover XP (`xpHudProgress`), not 0. `applyRewards` of a huge Doka-Fever roll must persist (clamped), not `#err`.
11. Smoke: Buy Doka `requestGameKeyPurchase` → admin approve → `redeemGameKey` credits **once** (second redeem `#err`). `initiatePurchase` must `#err`. In-battle health potion fails easy_1. Selecting Strike without casting must not fail Pacifist Run.
