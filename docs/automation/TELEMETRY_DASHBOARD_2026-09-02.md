# Owner telemetry dashboard — inventory refresh

**Author:** Telemetry Admin Dashboard Designer  
**Date:** 2026-09-02 (cron `0 */72 * * *`)  
**HEAD inspected:** `58302bc` (`Merge pull request #258` — GameKey admin-approval shop)  
**Prior designs:** [`TELEMETRY_DASHBOARD_2026-09-01.md`](TELEMETRY_DASHBOARD_2026-09-01.md), [`TELEMETRY_DASHBOARD_2026-08-31.md`](TELEMETRY_DASHBOARD_2026-08-31.md)  
**Gameplay / production code:** not modified this run.

This is a **support-matrix refresh**. Views H1–H5 and H7–H13 stay. Two
real API shifts landed after `dd275aa`: official bindgen of
`getAdminAuditLog` (H14 unblocked) and GameKey replacing live shop mint
(H6 rewrite). Requested battle / enemy / spell-cast / earn-spend series
are still **not invented**.

---

## 0. What changed since 2026-09-01 (and what did not)

Inspected against prior HEAD `dd275aa`. Persist, admin-safety, visual
honesty copy, and GameKey shop PRs landed. **No gameplay event store
landed.**

| Topic | 2026-09-01 (`dd275aa`) | 2026-09-02 (`58302bc`) | Dashboard impact |
| :--- | :--- | :--- | :--- |
| AQA-012 / TADD-001 seven counters | Approved, not shipped | Still absent (`incrementTelemetry`, `persist_ok`, sidecar: **0** product hits) | H12 stays “not shipped.” Do not draw zeros. |
| Health tab | No `tab: "health"` | Still config CRUD only (`gameTypes.ts` 483–498; `AdminDashboard.tsx` 5534–5548) | TADD-002 still open. |
| `getAdminAuditLog` | Motoko last-100; **missing** from `backend.ts` / Candid | **Bound** (`backend.ts` 873–889, 2465–2481; `backend.did.d.ts` 684). Mock + `UiLayoutActor` still present. **No AdminDashboard caller.** | Class → `LIVE_SNAPSHOT`. H14 no longer waits on bindgen. TADD-2026-09-01-001 bindgen half is **done**. |
| Shop mint | Legacy `purchaseRecords` + 60s `processPendingPurchases` | `processPendingPurchases` **always returns 0** (`main.mo` 1306–1316). Live credit is `redeemGameKey` via `redeemGameKeyThroughPersist` (`shopPurchase.ts` 210–238; `DokaGameKeyShop.tsx`). World still calls the legacy remount path (`WorldExploration.tsx` 1459–1462) which cannot gain. OQL `gameKeyRequests` includes **email + principal** (`main.mo` 3715–3731). Ledger/reveals are **not** OQL. | **H6 rewrite.** AQA-012 `shop_credit_committed` must fire on redeem-commit, never on the no-op remount. |
| Achievements | Client `markAchievementUnlocked`; retired configs blocked; “condition not checked” | `achievementUnlockRejected` (`adminGuard.mo` 551–565) rejects `level_10` / `doka_1000` / `doka_10000` / `spell_level_5` when the snapshot is short. **Combat feats stay client-trusted.** | H2 caption split. Still not a full condition engine. |
| Custom world visuals | World does not load `spriteUrl` | Still **0** `spriteUrl` / `drawImage` hits in `WorldExploration.tsx`. New `adminVisualStatus.ts`: empty URL = “Active fallback”; filled URL = “Stored URL — not rendered.” | Both are **not** `CUSTOM_FALLBACK`. Honesty copy landed; metric did not. |
| `getAllCharacters` | Admin query; unused by dashboard | `main.mo` 529–534; still unused by `AdminDashboard` | H1/H3/H4/H9 still need this or an aggregate helper. |
| OQL `characterSlots` | No spell / Boss Rush master fields | Unchanged (`main.mo` 3440–3486) | TADD-003 still required. |
| Spell “ownership” | Starters ∪ usable catalog ∪ persist keys | `shouldIncludeBackendSpellInLibrary` (`adminSafety.ts` 551–557): same rule, new line numbers. | Not discovery. H3 caption only. |
| `saveKillCount` | Hook, no UI caller | `useSaveKillCount` only in `useLeaderboardQueries.ts` 43–48; **0** TSX callers | Still not battle count. |
| `APP_VERSION` | `v163` | Still `v163` (`App.tsx` 14) | H11 labels unchanged. |
| Long-horizon sim | `telemetry.available === false` | Same (`longHorizonSim.ts` 516–520; test asserts) | Synthetic only. |
| Open older PRs at inspect time | — | #259 EOP GameKey migration (README hunks at top of file; **no** `docs/automation/TELEMETRY_*` overlap) | This refresh adds new telemetry docs + a docs-table README row only. |

`longHorizonSim` is **not** a Health data source.

---

## 1. Why this is still not a vanity dashboard

The 2026-08-30 Quality Auditor found no player telemetry. That is still true
on `58302bc`. Persist-fail strings remain local logs only
(`WorldExploration.tsx` 12740–12744, 12990–12995). Debug ring is local
(`debug/debugLogger.ts` 44, 105–111, cap 2000).

**Rule:** if the class is not `LIVE_SNAPSHOT` or `APPROVED_EVENT`, do not
draw the panel. Show “not measured,” never a zero that looks like “zero
battles.”

Correlation is not causation. Show **n**. No composite “health score.”
There is **no level cap** — do not design endgame chrome.

---

## 2. Data classes (do not mix)

| Class | Meaning | Owner-aggregatable? |
| :--- | :--- | :--- |
| `LIVE_SNAPSHOT` | Current canister maps / configs. No history unless the row has a timestamp. | Yes, admin/controller, **aggregated before paint**. |
| `APPROVED_EVENT` | AQA-012 seven counters. Not implemented. | Yes, **after** that ID ships. |
| `LOCAL_ONLY` | Debug ring / admin `<img onError>`. | **No.** |
| `UNSUPPORTED` | Requested, no persist, not approved. | **No.** Do not design a chart. |

`CANISTER_UNBOUND` is **empty this run** for Health sources. Do not keep
drawing H14 as “bindings missing.”

`getLeaderboard` is public and returns `principalId` + `playerName`. Do
not use it on Health. AdminDashboard does not call it today.

---

## 3. Inventory — what actually exists now

### 3.1 Admin / player canister APIs

| Source | Gate | Fields that matter | Class |
| :--- | :--- | :--- | :--- |
| `getAllCharacters()` (`main.mo` 529–534) | `#admin` | Full `Character`: `level`, `experience`, `stats.killCount`, `spellLevelKeys` / `spellLevelValues`, `spellBarOrder`, `activeSpells`, `bossRushMasterComplete`, `name`, `pieceType` | `LIVE_SNAPSHOT` |
| `getLeaderboard()` | public | Best-slot level, killCount, claimed-achievement count, **principal + name** | Do not use on Health |
| `saveKillCount` (`main.mo` 3013+) | caller | Additive `killCount`, max +64 | Hook exists; **no UI caller** |
| `dokaBalances` via `adminGetDoka` / OQL | `#admin` / OQL | Current wallet Nat | `LIVE_SNAPSHOT` (no earn/spend journal) |
| `getPlayerAchievements` | caller == player | One player’s rows | Not an owner dump |
| `adminListGameKeyRequests` (`main.mo` 1507–1516) | `#admin` | `status`, `dokaAmount`, `timestamp`, `hintedEuroCents`, **plus email, userPrincipal, redeemedBy** | Snapshot + **PII**. Health may use **status / dokaAmount / timestamp only**, aggregated before `setState`. |
| `adminGetPurchaseRecords` | `#admin` | Legacy KYC rows. `initiatePurchase` now errors (“Doka purchases now use GameKey requests”). | **Stale path.** Do not chart as live shop mint. |
| `getDungeonRecord` | caller == principal | `chainDepth`, `totalMapsCompleted`, `bestRewardMultiplier` | Per-player; owner dump via OQL |
| `getBossRushState` | caller == userId else `(0,0,0)` | `currentRoom`, `highestRoomCompleted`, `totalBossRushRuns` | Per-player; owner dump via OQL |
| `getAppVersion` (`main.mo` 2244) / `APP_VERSION` | public / client | Content version string (`v163`) | Catalog, not event-tagged |
| Config CRUD | mostly public read | Templates, URLs, `minLevel`, `usableByEnemy` / `usableByPlayer` | Catalog inventory |
| `getAdminAuditLog()` (`main.mo` 3421–3426) | `#admin` | Last 100 `{adminPrincipal, timestampNs, action, objectId, previousSummary, newSummary}` | `LIVE_SNAPSHOT` ring. Official bindgen present. Still unused by AdminDashboard. |
| `calculateAndAwardDoka` (`main.mo` 3008–3011) | public | **Always 0** | Not a source. Do not chart. |
| `processPendingPurchases` (`main.mo` 1306–1316) | caller | **Always 0** | Not a source. Do not chart remounts as shop credits. |
| `redeemGameKey` (`main.mo` 1437+) | caller | Credits `dokaAmount` from ledger; returns Nat | Live paid-Doka writer. No owner aggregate of redemptions except via GameKey **request** `status=redeemed`. |

`AdminDashboardState.tab` is still enemies, regions, sprites, visuals,
spells, settings, tiers, modifiers, purchases, achievements, names,
bosses, ads, shop, bossRush. Purchases tab is `AdminGameKeyPurchases`
(fulfillment: email, reveal code). No Health. No OQL `execute` caller in
`src/frontend` except the bindgen wrapper.

`gameKeyLedger` / `gameKeyReveals` are **not** queryable for Health.
Plaintext GameKeys must never appear on Health.

### 3.2 OQL (`main.mo` 3428+)

| Entity | Useful payloads | Missing vs Health / PII |
| :--- | :--- | :--- |
| `characterSlots` | name, pieceType, level, experience, hp, killCount | **No** spell keys, bar, `bossRushMasterComplete` |
| `dokaBalances` | owner, balance | No ledger |
| `userProfiles` | owner, **name** | PII |
| `changelogShownVersions` | owner, version | Not “played during vX” |
| `dungeonRecords` | chainDepth, totalMapsCompleted, bestRewardMultiplier | No attempts / flee / time |
| `achievementProgress` | achievementId, unlocked, unlockedAt, claimed, **principalId** | Drop principal before paint |
| `purchaseRecords` | dokaAmount, packageId, timestamp, status + customer columns | **Legacy.** Also customer name/email/city/country |
| `gameKeyRequests` | status, dokaAmount, timestamp, hintedEuroCents | Also **email**, **userPrincipal**. Drop those. Not a GameKey. |
| `bossRushStates` | currentRoom, highestRoomCompleted, totalBossRushRuns | Key is `principal#slot` |
| catalog entities | templates + URL strings | Config, not load outcomes |
| `buffInventories` | itemCount, totalQuantity | Omit unless a later human asks |
| `adminAuditLog` | **Not an OQL entity** | Use `getAdminAuditLog` only |
| `gameKeyLedger` / `gameKeyReveals` | **Not OQL** | Keep it that way |

### 3.3 Client-only (not owner telemetry)

| Signal | Where | Why not Health |
| :--- | :--- | :--- |
| Debug ring | `debug/debugLogger.ts` 44, 105–111 | Local, 2000 lines |
| “Reward persistence failed (non-blocking)” | `WorldExploration.tsx` 12740–12744 | `logDebugInfo` only |
| “BossRush reward persist failed” | same file 12990–12995 | `logDebugError` only |
| Pattern lookup failed → `king.front` | `pieceArt.ts` 809–811 | Local; **pieceType/palette miss**, not custom-URL fail |
| Admin sprite `<img onError>` | `AdminDashboard.tsx` 1500–1502 | Hides preview; no counter |
| Empty-URL sprite preview copy | `AdminDashboard.tsx` 1514; `DEFAULT_PIXEL_VISUAL_STATUS` in `adminVisualStatus.ts` 10–11 | **NORMAL_DEFAULT**. The word “fallback” is a label trap. |
| Filled-URL chip | `STORED_URL_NOT_RENDERED_*` (`adminVisualStatus.ts` 13–15) | Catalog storage. World ignores the URL. **Not** `CUSTOM_FALLBACK`. |
| Enemy chip via `enemyVisualStatusCopy` | `AdminDashboard.tsx` 2141–2143 | Config hygiene, correct empty-vs-set split |
| `useSaveKillCount` | `useLeaderboardQueries.ts` 43–48 | Zero TSX callers |
| Recap open/close | `PostBattleRecap` | Local UI |
| `longHorizonSim.telemetry` | `available: false` | Synthetic; not live play |
| World remount `creditPendingPurchasesThroughPersist` | `WorldExploration.tsx` 1459–1462 | Hits a writer that returns 0 |

### 3.4 Approved but not shipped (`AQA-2026-08-30-012` / `TADD-2026-08-31-001`)

Same seven counters only:

1. persist-ok  
2. persist-fail  
3. death-penalty applied  
4. victory paid  
5. recap opened  
6. recap dismissed  
7. shop credit committed  

Until these exist, Game Health event panels stay empty. Do not fill them
from `killCount`, debug logs, recap state, `calculateAndAwardDoka`, or
`processPendingPurchases`.

**Increment placement (updated after GameKey):**

| Counter | Increment when | Do not increment |
| :--- | :--- | :--- |
| `persist_ok` / `persist_fail` | Official persist fn returns `#ok` / `#err` or transport throw **after** enqueue | Optimistic UI; user cancel |
| `death_penalty_applied` | `persistDeathPenalty` **write succeeds** (20% XP / 40% Doka + `respawnHpAfterDeath`) | Death Realm timer; HP restore alone; a refused leftover persist |
| `victory_paid` | `resolveBattleRewards` → `applyRewards` `#ok` for a battle recap, **once** | Portal +10 XP; Boss Rush room (unless a human expands 012); `shouldAwardVictory` refuse; double-credit leftover |
| `recap_opened` / `recap_dismissed` | Root recap mount / `onClose` | Crash unmount |
| `shop_credit_committed` | Official `redeemGameKeyThroughPersist` **commits** (HEAD: wallet-query + `shouldCommitShopCredit`. Sibling #279, older in the merge queue: `#ok` granted + `shouldCommitGameKeyRedeem` on a seeded lock). Increment only when that helper actually commits. | `requestGameKeyPurchase`; `adminApproveGameKeyPurchase`; `processPendingPurchases` (always 0); World remount credit; failed / already-used key; unseeded lock |

Do not enqueue telemetry on `progressPersistRef` as a **second wallet
write**. Fire-and-forget after the persist function returns. Swallow
sidecar errors.

---

## 4. Requested metrics — support matrix

### 4.1 Game health

| Asked | Support | Honest substitute |
| :--- | :--- | :--- |
| Battle count | `UNSUPPORTED` | After AQA-012: **victory paid** = paid victories, not all battles. |
| Victory / defeat / flee | `UNSUPPORTED` | Victory paid only. Defeat/flee uncounted. |
| Average battle turns | `UNSUPPORTED` | Challenge `under_*_turns` is local. |
| Deaths | `UNSUPPORTED` | After AQA-012: **death-penalty applied** = penalty persist succeeded, not death cause. |
| Persistence failures | `LOCAL_ONLY` | After AQA-012: persist-ok vs persist-fail. |
| Abnormal termination | `UNSUPPORTED` | No crash / tab-close / mid-battle abandon event. |

`killCount` is unused in the official client. Do not plot it.

### 4.2 Enemy health

| Asked | Support |
| :--- | :--- |
| Encounter frequency | `UNSUPPORTED` |
| Relative level | `UNSUPPORTED` — region `levelMin`/`levelMax` is catalog |
| Player win/loss vs enemy | `UNSUPPORTED` |
| Battle duration | `UNSUPPORTED` |
| Elite frequency | `UNSUPPORTED` |
| Advanced AI usage | `UNSUPPORTED` — `enemyAI.ts` intents are `LOCAL_ONLY` |
| Enemy spell usage | `UNSUPPORTED` — `usableByEnemy` is catalog |

**No Enemy Health outcome charts.** Optional H10 catalog counts only.

### 4.3 Spell health

| Asked | Support | Honest substitute |
| :--- | :--- | :--- |
| Usage (casts) | `UNSUPPORTED` | None |
| Discovery | `UNSUPPORTED` | No observe/unlock persist. `ownedSpells` = starters ∪ **player-usable** catalog ∪ persisted keys/bar. Retired catalog rows require a persist key (`adminSafety.ts` 551–557). That is retirement gating, not discovery. |
| Acquisition source | `UNSUPPORTED` | `spellLevelKeys` is `upgradeSpell` history, not first obtain |
| Combinations | `UNSUPPORTED` | Weak proxy: equipped-together from `spellBarOrder` / `activeSpells` (`getAllCharacters` only). Label **loadout**. |
| Underused / overused | `UNSUPPORTED` for casts | Do not use those words. Upgrade-presence ≠ combat use. |
| Observed but rarely obtained | `UNSUPPORTED` | Nothing observes a spell without putting it in the library. |

Starter catalog remains 32 (`longHorizonSim.test.ts` asserts
`starterSpellCount` 32 / `allSpellsAreStarter`).

### 4.4 Progression

| Asked | Support |
| :--- | :--- |
| Level distribution | `LIVE_SNAPSHOT` — occupied slots, `Character.level`. **No cap.** Open-ended histogram. |
| XP progression | `LIVE_SNAPSHOT` — leftover XP vs `100 * 2^(N-1)` (`xpCurve.ts`). Not “to cap.” |
| Spell discovery | `UNSUPPORTED`. Upgrade coverage only (H3). |
| Achievement progression | `LIVE_SNAPSHOT` — OQL `achievementProgress` + configs. `unlockedAt` is a real timestamp. Retired configs cannot newly unlock. Four wallet/level/spell-level keys are **server-gated**; combat feats remain client-reported. |

### 4.5 Economy

| Asked | Support |
| :--- | :--- |
| Doka earned (aggregate) | `UNSUPPORTED` as a battle/loot ledger |
| Doka spent (aggregate) | `UNSUPPORTED` as a ledger |
| Major sources | **Code map** only. After AQA-012: **counts** of victory paid and shop credit committed — not amounts. GameKey **redeemed** `dokaAmount` sum is a snapshot of **paid mint**, not battle earn. |
| Major sinks | Architecture list. Death-penalty **count** after 012, not Doka removed. |

Writers (do not turn into a share pie):

| Direction | Writer | Note |
| :--- | :--- | :--- |
| + | `applyRewards` | Official credits; client clamps to 100_000 Doka / 500_000 XP per call |
| + | `claimAchievementReward` | Feat claim |
| + | `redeemGameKey` | Paid mint after admin approve. Live path. |
| + | `adminGrantDoka` / `adminAddDoka*` | Operator — H14 action counts can flag grant bursts |
| − / absolute | `upgradeSpell`, `renameCharacter` (100), `purchaseBuff` | Sinks |
| absolute | `saveBattleStats` | Heals, item-shop, death 20% XP / 40% Doka |
| none | `calculateAndAwardDoka` | **Dead mint** (returns 0). Not a source. |
| none | `processPendingPurchases` | **Dead credit** (returns 0). Not a source. |

`hintedEuroCents` is a **player-typed hint**, not processor settlement.
Do not chart it as revenue.

### 4.6 Bosses / dungeons

| Asked | Support |
| :--- | :--- |
| Attempts | `UNSUPPORTED` — reset does not increment attempts |
| Completion | Partial snapshot: Rush `highestRoomCompleted` (0–10), `totalBossRushRuns`, `bossRushMasterComplete`. Dungeon `totalMapsCompleted` is cumulative maps, not “dungeon finished.” |
| Average attempts | `UNSUPPORTED` |
| Flee / abandonment | `UNSUPPORTED` |
| Relative difficulty | `UNSUPPORTED` — do not infer from `bestRewardMultiplier` or room reached (survivorship) |
| `BossConfig.defeated` | **Global admin flag.** Not “players who beat this boss.” |

### 4.7 Admin content health

| Asked | Support |
| :--- | :--- |
| Extremely low usage | Snapshot proxies only: spell never in any `spellLevelKeys` / bar **and** not a starter; achievement never unlocked; Rush all `highestRoomCompleted` 0; GameKey **package catalog unused** (Purchases UI is GameKey, not `ShopPackage` rows). Enemies / modifiers / regions / ads: **no usage signal.** |
| Invalid configuration events | `UNSUPPORTED` — `AdminGuard` `#err` returns **before** `_recordAdminAudit` |
| Failed asset loads | `LOCAL_ONLY` (admin preview `onError`) |
| Pixel-fallback events | `LOCAL_ONLY` pattern-lookup-failed. **Not** custom-URL fallback. |
| Unused custom visual assets | Config: non-empty `spriteUrl` / `*Url` stored, **not rendered**. Empty URL = `NORMAL_DEFAULT`. |
| Stale dependencies | Repo inventory (`package.json`), not a Health series. |
| Recent admin mutations | **H14**: last-100 successful writes, including GameKey approve/reject/emailed. Ops context for H2/H3/H5/H6, not player usage. |

### 4.8 Visual fallback (required distinction)

| Kind | Definition | Exists today? |
| :--- | :--- | :--- |
| `NORMAL_DEFAULT` | Entity is **meant** to use built-in pixels. `spriteUrl` / `frontUrl` empty. | Yes. This is the live world path. Admin empty-state copy still says “Active fallback.” |
| `STORED_NOT_RENDERED` | A custom URL is saved on the catalog row; World does not fetch it. | Yes, as **config hygiene** (`spriteUrlIsStored`). Not an error. Not a load event. |
| `CUSTOM_FALLBACK` | A custom visual **was configured** and **failed**, so default pixels were used. | **No metric.** World does not fetch custom URLs. |

**Do not treat as `CUSTOM_FALLBACK`:**

1. Empty URL / empty tuple (`adminVisualStatus.test.ts`; `adminContract.test.ts`).  
2. Pattern-lookup-failed (`pieceArt.ts` 809–811) — missing `pieceType`/palette.  
3. Admin preview `onError` (`AdminDashboard.tsx` 1500–1502).  
4. Sprite preview copy “Default Pixel Visual — **Active fallback**” when URL is empty. That is `NORMAL_DEFAULT`.  
5. Chip “Stored URL — not rendered” when URL is set. That is unused catalog storage.  
6. Audit `deletePlayerSpriteConfig` with `newSummary = "pixel-fallback"` (`main.mo` 856). That is an **admin delete** of a sprite config, not a runtime load fail.

A future custom-URL loader may emit `CUSTOM_FALLBACK` only when `url != ""`
and load/decode fails. That event is **not** approved (TADD-006 / 09-01-002 /
09-02-005).

---

## 5. Filters

| Filter | Enable on | Disable / hide |
| :--- | :--- | :--- |
| Date / time period | H2 `unlockedAt`; **H6 GameKey `timestamp`**; **H14 `timestampNs`** (ring only); H12 after day-buckets exist | All other snapshots (“as-of-now”) |
| Relative player-level band | H1, H3, H4, H8/H9 if joined | Catalog-only; H14; H6 (no level on the request) |
| Enemy family | — | Hidden |
| Spell | H3, H4 | Cast-usage (none) |
| Boss | — | Hidden. Rush uses **room index** |
| Dungeon | H8 | Attempt/flee (none) |
| Content version | H11 | Gameplay events (not version-tagged) |

Level bands (not a cap): 1–4, 5–9, 10–19, 20–39, 40–79, 80+  
Raise the last edge when `max(level) > 80`. Never add “endgame / max level.”

---

## 6. Privacy

Owner Health is **aggregates only**.

| Must not appear on Health | Why it exists elsewhere |
| :--- | :--- |
| Principal text | `getAllCharacters`, OQL `owner`, `getLeaderboard`, **audit `adminPrincipal`**, audit `objectId` on grant/ban/role/**GameKey** actions (`approveGameKey` / `rejectGameKey` / `markGameKeyEmailed` store `userPrincipal.toText()`) |
| Character / profile name | Character, `userProfiles`, leaderboard |
| Customer name, email, address, city, country, postal, proof URL | Legacy Purchases records |
| GameKey **email**, **redeemedBy**, plaintext **code** | `AdminGameKeyPurchases` fulfillment; `gameKeyReveals` |
| Chat `playerName` | Irrelevant here |

Do **not** mount `AdminGameKeyPurchases` inside Health. That tab is
ops/fulfillment, not analytics.

`n < 5`: hide rates. HMAC principal only if a human later requires a debug
export; default is no row-level export.

H14 default columns: `action`, count. Config `objectId` (spell/enemy/boss
ids) is allowed. Principal-shaped `objectId` is not.

H6 default columns: `status`, count, optional sum of `dokaAmount` for
`redeemed` and for `approved` (outstanding). No email column. No request id
list.

---

## 7. Analytical honesty

1. Snapshot ≠ rate over time. Caption: **“As of query time.”**  
2. Correlation ≠ causation. Room 8 reached ≠ “room 8 is fair.” Redeemed
   GameKey Doka ≠ “shop is healthy because players like the game.”  
3. Always show **n**.  
4. Hide % when `n < 20` (rates) or `n < 5` (privacy).  
5. Survivorship: `bestRewardMultiplier` / `highestRoomCompleted` describe people who still have a record.  
6. Victory paid ≠ battles started.  
7. `killCount` unused → do not plot.  
8. H14 `n ≤ 100` is a ring, not lifetime volume.  
9. No composite health score.  
10. Admin grant burst (H14) **beside** a fat wallet (H5) does not prove the wallet is only grants.  
11. `hintedEuroCents` ≠ settled euros.  
12. `approved` GameKey Doka is **issued not yet redeemed**, not revenue and not wallet credit.  
13. Four achievement condition keys are server-gated; all other unlocks remain “client said unlocked.”

---

## 8. Views (decision-backed)

Placement: new **Health** tab on owner-only `AdminDashboard` (same
`isAdmin && onOpenAdmin` gate, carved-stone tokens). Dev-only. Do not
ship to normal players.

H1–H5, H7–H13: unchanged decisions vs 2026-09-01. Caption deltas only
where the canister changed.

| View | Caption delta this run |
| :--- | :--- |
| H1 Population / level | Unchanged. No cap. |
| H2 Achievement funnel | Unlock = client report **except** `level_10` / `doka_1000` / `doka_10000` / `spell_level_5`, which `achievementUnlockRejected` can refuse. Retired configs cannot newly unlock. Combat feats are still not canister-proven. |
| H3 Spell upgrade coverage | “Upgrade persist only. Not casts. Starter + **usable** catalog may appear with no key. Retired (`usableByPlayer === false`) appears only if a key/bar already exists.” |
| H4 Loadout co-occurrence | Unchanged. `n ≥ 20` bars. |
| H5 Wallet distribution | Unchanged. Not earned/spent. Read next to H14 grant actions **and** H6 redeemed mint. |
| H6 Shop mint | **Rewritten** (below). Live path is GameKey. Legacy `purchaseRecords` is not the live funnel. |
| H7 Source/sink map | Add: `processPendingPurchases` is a dead credit (returns 0). Live paid mint is `redeemGameKey`. `calculateAndAwardDoka` remains a dead mint. |
| H8 Dungeon snapshot | Unchanged. |
| H9 Boss Rush snapshot | Unchanged. Not `BossConfig.defeated`. |
| H10 Config hygiene | Visual taxonomy (4.8). Empty URL = `NORMAL_DEFAULT`. Filled URL = stored-not-rendered. Neither is `CUSTOM_FALLBACK`. |
| H11 Client version seen | Still `v163` vs `getAppVersion`. Not “played during vX.” |
| H12 Event strip | Still “not shipped (AQA-012 / TADD-001).” Increment rules in §3.4 (**shop credit = redeem**). |
| H13 Not measured | Unchanged list (battle starts, defeat, flee, turns, enemy series, casts, discovery, Doka earn/spend ledger, boss attempts, abnormal termination, custom-fallback events). |

### H6 — GameKey funnel (economy) — REWRITE

- **Decision:** How many paid-Doka requests are waiting, approved-unredeemed
  (ops backlog / outstanding keys), redeemed (actual mint), or rejected?
  Is outstanding approved Doka large next to H5 wallets / H14 grants?  
- **Class:** `LIVE_SNAPSHOT`.  
- **Query:** `adminListGameKeyRequests` **or** OQL `gameKeyRequests`.
  Strip `email`, `userPrincipal`, `redeemedBy` **before** React state.
  Never call `adminReveal` / ledger APIs from Health.  
- **Viz:** Counts by `status` (`pending` / `approved` / `redeemed` /
  `rejected`). Optional sums: `dokaAmount` where `status=redeemed`
  (minted); `dokaAmount` where `status=approved` (issued, not yet in a
  wallet). Period filter on `timestamp`.  
- **n** = request rows after filter. Caption: “GameKey requests as of
  query time. `dokaAmount` is 0 until approve. Hinted euros are not
  settlement. Not battle earn. Not conversion unless n ≥ 20.”  
- **Forbidden:** email; principal; GameKey code; `hintedEuroCents` as a
  revenue series; mixing leftover `purchaseRecords` into the same bars
  without a “legacy KYC, writer disabled” caption.  
- **Not:** IAP package mix (ShopPackage UI is gone from AdminDashboard);
  `shop_credit_committed` (that is H12 after AQA-012).

### H14 — Admin mutation ring (Admin content / economy context)

- **Decision:** Did an operator grant, retire, approve a GameKey, or
  delete content that would explain an empty H3 row, a never-unlocked
  feat, a handful of huge wallets, or a burst of H6 approved rows?  
- **Class:** `LIVE_SNAPSHOT` (bindgen is present). Card must no longer
  say “bindings missing.”  
- **Query:** `getAdminAuditLog` only. Do not add an OQL entity that
  repeats `adminPrincipal`.  
- **Viz:** Counts by `action` (include `approveGameKey`, `rejectGameKey`,
  `markGameKeyEmailed`, `grantDoka` / `addDoka*`, `retireSpellConfig`,
  `deletePlayerSpriteConfig`, …). Optional period filter on
  `timestampNs` **inside the ring**.  
- **n** = ring length (max 100). Caption: “Last 100 **successful** admin
  writes. Validation `#err` is not recorded. Not player telemetry. GameKey
  audit `objectId` is a player principal — drop it.”  
- **Forbidden:** `adminPrincipal`; player principals in `objectId`;
  treating `newSummary = "pixel-fallback"` as `CUSTOM_FALLBACK`.  
- **Not:** invalid-config event feed; lifetime volume.

Until the Health tab exists: do not mock a chart in another tab.

---

## 9. Layout (owner Health tab)

```
[ Health ]
  Period: [ 7d | 30d | all ]     <- H2, H6, H12 (when shipped), H14 (ring only)
  Level band: [ all | 1-4 | ... ]  <- H1, H3, H4, H8/H9 if joined
  Spell: [ all | id ]            <- H3, H4
  Version: [ all | v... ]          <- H11 only

  [ Game ]         H12 (or "not shipped") | H13
  [ Progression ]  H1 | H2
  [ Economy ]      H5 | H6 (GameKey status) | H7 | H14 (grant/approve context)
  [ Dungeon/Rush ] H8 | H9
  [ Spells ]       H3 | H4 (n>=20)
  [ Catalog ]      H10 | H11 | NORMAL_DEFAULT vs STORED_NOT_RENDERED counts
```

No Enemy Health outcome section.

---

## 10. Still refused

- Wiring `saveKillCount` as a battle chart.  
- Debug overlay as production telemetry.  
- `BossConfig.defeated` or empty `spriteUrl` as player outcomes.  
- Treating admin “pixel-fallback” / “Active fallback” / “Stored URL —
  not rendered” as `CUSTOM_FALLBACK`.  
- Date-filtered earn/spend **share** charts before a ledger exists.  
- Charting `hintedEuroCents` as revenue or `processPendingPurchases` as
  shop volume.  
- Putting GameKey emails or codes on Health.  
- A composite health score.  
- Any Health cell with a principal, email, or proof URL.  
- Expanding AQA-012 without a new human-approved ID.

---

## 11. Implementation order (no production code this run)

1. **TADD-2026-08-31-001 / AQA-012** — seven counters. Highest leverage.
   Follow §3.4 increment rules (**shop credit = redeemGameKey**).  
2. **TADD-2026-08-31-002** — Health tab H1–H11, H13 (read-only), with
   **H6 GameKey aggregates** (TADD-2026-09-02-003).  
3. **TADD-2026-08-31-003** — aggregate query or OQL extension without PII
   (spell keys; GameKey without email).  
4. **TADD-2026-09-02-001** — H14 now (bindgen already in `backend.ts`).
   Supersedes the bindgen wait in TADD-2026-09-01-001.  
5. H12 widgets only after counters are queryable.

Snapshot UI regression risk is low if read-only and aggregated before
setState. TADD-001 remains **medium** if it writes off the persist lock
or increments shop credit on the dead `processPendingPurchases` path.

---

## 12. Sample-size and confidence

| n | Rates | Histograms |
| :--- | :--- | :--- |
| 0 | “No rows” | Empty |
| 1–4 | Hide % ; privacy | Counts ok |
| 5–19 | Counts; hide % | Counts ok |
| ≥ 20 | % + optional Wilson 95% (H2 claim/unlock, H6 redeem/request, H12 fail rate) | Counts ok |

H14: never present ring counts as a weekly rate. Do not interpolate empty
level bins as historical zeros. Do not call H6 `redeemed/n` a conversion
rate when `n < 20`.

---

## 13. ACTION_IDs

Prior (still OPEN unless noted): `TADD-2026-08-31-001` … `007`;
`TADD-2026-09-01-001` (bindgen **done**, H14 card still open — see
09-02-001); `TADD-2026-09-01-002` … `005`.  
This run: [`ACTION_IDS_TADD_2026-09-02.md`](ACTION_IDS_TADD_2026-09-02.md).
