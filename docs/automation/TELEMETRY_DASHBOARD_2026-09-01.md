# Owner telemetry dashboard — inventory refresh

**Author:** Telemetry Admin Dashboard Designer  
**Date:** 2026-09-01 (cron `0 */72 * * *`)  
**HEAD inspected:** `dd275aa` (`Merge pull request #182` — Caffeine import gates)  
**Prior design:** [`TELEMETRY_DASHBOARD_2026-08-31.md`](TELEMETRY_DASHBOARD_2026-08-31.md) (merged as #119)  
**Gameplay / production code:** not modified this run.

This is a **support-matrix refresh**, not a second vanity redesign. Views
H1–H13 stay. One new read-only card (H14) is added because a canister API
appeared after #119. Requested battle / enemy / spell-cast / earn-spend
series are still **not invented**.

---

## 0. What changed since 2026-08-31 (and what did not)

Inspected against prior HEAD `22503b5`. Persist, admin-safety, and combat
PRs landed. **No gameplay event store landed.**

| Topic | 2026-08-31 | 2026-09-01 | Dashboard impact |
| :--- | :--- | :--- | :--- |
| AQA-012 / TADD-001 seven counters | Approved, not shipped | Still absent (`incrementTelemetry`, `persist_ok`, sidecar: **0** product hits) | H12 stays “not shipped.” Do not draw zeros. |
| Health tab | No `tab: "health"` | Still config CRUD only (`gameTypes.ts` 483–498; `AdminDashboard.tsx` 5104–5118) | TADD-002 still open. |
| `getAllCharacters` | Admin query; unused by dashboard | `main.mo` 558–563; still unused by `AdminDashboard` | H1/H3/H4/H9 still need this or an aggregate helper. |
| OQL `characterSlots` | No spell / Boss Rush master fields | Unchanged (`main.mo` 3120–3166) | TADD-003 still required. |
| Spell “ownership” | Non-legacy catalog treated as owned | `shouldIncludeBackendSpellInLibrary` (`adminSafety.ts` 310–318): **retired** rows (`usableByPlayer === false`) stay only if already on `spellLevelKeys` / `spellBarOrder`. Active catalog rows are still shown. | Not discovery. H3 caption only. |
| Achievements | Client `markAchievementUnlocked` | Rejects unknown / `active=false` (`main.mo` 2112–2118). **Condition still not checked on canister.** | H2 honesty: “client said unlocked,” plus retired configs cannot unlock. |
| Persist writers | Official funnel | Hardened: `clampApplyRewardsDeltas` (`applyRewardsResult.ts` 46–60); death HP formula (`deathPenalty.ts` 131–141); `calculateAndAwardDoka` now **returns 0** (`main.mo` 2687–2693). Double-victory / leftover-recap refuses exist. | No ledger. H12 increment sites must fire **once** on the official success path, never on restore/refuse/no-op mint. |
| Admin audit | Did not exist | `adminAuditLog` last-100 (`main.mo` 618–638, 3101–3106). **Not in** `backend.ts` / Candid declarations. Mock + `UiLayoutActor` type only. **No AdminDashboard caller.** | New H14 **after bindgen**. Not invalid-config events. |
| Custom world visuals | World does not load `spriteUrl` | Still **0** `spriteUrl` / `drawImage` hits in `WorldExploration.tsx`. No `visualAssets` module. | `NORMAL_DEFAULT` vs `CUSTOM_FALLBACK` unchanged. New **label traps** (below). |
| `saveKillCount` | Hook, no UI caller | `useSaveKillCount` still only in `useLeaderboardQueries.ts` 43–48 | Still not battle count. |
| `APP_VERSION` | `v163` | Still `v163` (`App.tsx` 14) | H11 labels unchanged. |
| Long-horizon sim | — | `telemetry.available === false` (`longHorizonSim.ts` 432–436; asserted in test) | Explicit: synthetic only. |

`longHorizonSim` is **not** a Health data source.

---

## 1. Why this is still not a vanity dashboard

The 2026-08-30 Quality Auditor found no player telemetry. That is still true
on `dd275aa`. Persist-fail strings remain `logDebugInfo` only
(`WorldExploration.tsx` 13158–13162, 13399). Debug ring is local
(`debug/debugLogger.ts` 105–124, cap 2000).

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
| `CANISTER_UNBOUND` | Exists on Motoko, **missing from official bindgen**. | Not from the official Health client until `pnpm bindgen`. |
| `LOCAL_ONLY` | Debug ring / admin `<img onError>`. | **No.** |
| `UNSUPPORTED` | Requested, no persist, not approved. | **No.** Do not design a chart. |

`getLeaderboard` (`main.mo` 3005) is public and returns `principalId` +
`playerName`. Do not use it on Health.

---

## 3. Inventory — what actually exists now

### 3.1 Admin / player canister APIs

| Source | Gate | Fields that matter | Class |
| :--- | :--- | :--- | :--- |
| `getAllCharacters()` (`main.mo` 558–563) | `#admin` | Full `Character`: `level`, `experience`, `stats.killCount`, `spellLevelKeys` / `spellLevelValues`, `spellBarOrder`, `activeSpells`, `bossRushMasterComplete`, `name`, `pieceType` | `LIVE_SNAPSHOT` |
| `getLeaderboard()` (`main.mo` 3005) | public | Best-slot level, killCount, claimed-achievement count, **principal + name** | Do not use on Health |
| `saveKillCount` (`main.mo` 2695+) | caller | Additive `killCount`, max +64 | Hook exists; **no UI caller** |
| `dokaBalances` via `adminGetDoka` / OQL | `#admin` / OQL | Current wallet Nat | `LIVE_SNAPSHOT` (no earn/spend journal) |
| `getPlayerAchievements` (`main.mo` 2093–2100) | caller == player | One player’s rows | Not an owner dump |
| `adminGetPurchaseRecords` / Purchases tab | `#admin` | `dokaAmount`, `packageId`, `timestamp`, `status`, **plus customer PII** (`AdminDashboard.tsx` 5672, 5741, 5891–5926) | Snapshot + PII (fulfillment only) |
| `getDungeonRecord` | caller == principal | `chainDepth`, `totalMapsCompleted`, `bestRewardMultiplier` | Per-player; owner dump via OQL |
| `getBossRushState` | caller == userId else `(0,0,0)` | `currentRoom`, `highestRoomCompleted`, `totalBossRushRuns` | Per-player; owner dump via OQL |
| `getAppVersion` (`main.mo` 1984) / `APP_VERSION` | public / client | Content version string (`v163`) | Catalog, not event-tagged |
| Config CRUD | mostly public read | Templates, URLs, `minLevel`, `usableByEnemy` / `usableByPlayer` | Catalog inventory |
| `getAdminAuditLog()` (`main.mo` 3101–3106) | `#admin` | Last 100 `{adminPrincipal, timestampNs, action, objectId, previousSummary, newSummary}` | `CANISTER_UNBOUND` until bindgen; then `LIVE_SNAPSHOT` ring |
| `calculateAndAwardDoka` (`main.mo` 2687–2693) | public | **Always 0** | Not a source. Do not chart. |

`AdminDashboardState.tab` is still enemies, regions, sprites, visuals,
spells, settings, tiers, modifiers, purchases, achievements, names,
bosses, ads, shop, bossRush. No Health. No OQL `execute` caller in
`src/frontend`.

### 3.2 OQL (`main.mo` 3108–3498)

Unchanged vs 2026-08-31 for Health purposes:

| Entity | Useful payloads | Missing vs Health |
| :--- | :--- | :--- |
| `characterSlots` | name, pieceType, level, experience, hp, killCount | **No** spell keys, bar, `bossRushMasterComplete` |
| `dokaBalances` | owner, balance | No ledger |
| `userProfiles` | owner, **name** | PII |
| `changelogShownVersions` | owner, version | Not “played during vX” |
| `dungeonRecords` | chainDepth, totalMapsCompleted, bestRewardMultiplier | No attempts / flee / time |
| `achievementProgress` | achievementId, unlocked, unlockedAt, claimed, **principalId** | Drop principal before paint |
| `purchaseRecords` | dokaAmount, packageId, timestamp, status | Also customer name/email/city/country |
| `bossRushStates` | currentRoom, highestRoomCompleted, totalBossRushRuns | Key is `principal#slot` |
| catalog entities | templates + URL strings | Config, not load outcomes |
| `buffInventories` | itemCount, totalQuantity | Omit unless a later human asks |
| `adminAuditLog` | **Not an OQL entity** | Use `getAdminAuditLog` only |

### 3.3 Client-only (not owner telemetry)

| Signal | Where | Why not Health |
| :--- | :--- | :--- |
| Debug ring | `debug/debugLogger.ts` 105–124 | Local, 2000 lines |
| “Reward persistence failed (non-blocking)” | `WorldExploration.tsx` 13158–13162 | `logDebugInfo` only |
| “BossRush reward persist failed” | same file ~13399 | Same |
| Pattern lookup failed → `king.front` | `pieceArt.ts` 809–811 | Local; **pieceType/palette miss**, not custom-URL fail |
| Admin sprite `<img onError>` | `AdminDashboard.tsx` 1415–1417 | Hides preview; no counter |
| Empty-URL sprite preview copy | `AdminDashboard.tsx` 1429: “Default Pixel Visual — **Active fallback**” | **NORMAL_DEFAULT**. The word “fallback” is a label trap. |
| Enemy chip “Custom visual” / “Default pixel visual” | `AdminDashboard.tsx` 2066–2067 | Config hygiene, correct empty-vs-set split |
| `useSaveKillCount` | `useLeaderboardQueries.ts` 43–48 | Zero TSX callers |
| Recap open/close | `PostBattleRecap` | Local UI |
| `longHorizonSim.telemetry` | `available: false` | Synthetic; not live play |

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
from `killCount`, debug logs, recap state, or `calculateAndAwardDoka`.

**Increment placement (new constraint after persist hardening):**

| Counter | Increment when | Do not increment |
| :--- | :--- | :--- |
| `persist_ok` / `persist_fail` | Official persist fn returns `#ok` / `#err` or transport throw **after** enqueue | Optimistic UI; user cancel |
| `death_penalty_applied` | `persistDeathPenalty` **write succeeds** (20% XP / 40% Doka + `respawnHpAfterDeath`) | Death Realm timer; HP restore alone; a refused leftover persist (`deathGuards` / second death epoch) |
| `victory_paid` | `resolveBattleRewards` → `applyRewards` `#ok` for a battle recap, **once** | Portal +10 XP; Boss Rush room (unless a human expands 012); `shouldAwardVictory` refuse; double-credit leftover |
| `recap_opened` / `recap_dismissed` | Root recap mount / `onClose` | Crash unmount |
| `shop_credit_committed` | `creditPendingPurchasesThroughPersist` commit after `#ok` | `initiatePurchase`; no-op remount (`shouldCommitShopCredit` false) |

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
| Discovery | `UNSUPPORTED` | No observe/unlock persist. `ownedSpells` = starters ∪ **player-usable** catalog ∪ persisted keys/bar. Retired catalog rows require a persist key (`adminSafety.ts` 310–318). That is retirement gating, not discovery. |
| Acquisition source | `UNSUPPORTED` | `spellLevelKeys` is `upgradeSpell` history, not first obtain |
| Combinations | `UNSUPPORTED` | Weak proxy: equipped-together from `spellBarOrder` / `activeSpells` (`getAllCharacters` only). Label **loadout**. |
| Underused / overused | `UNSUPPORTED` for casts | Do not use those words. Upgrade-presence ≠ combat use. |
| Observed but rarely obtained | `UNSUPPORTED` | Nothing observes a spell without putting it in the library. |

### 4.4 Progression

| Asked | Support |
| :--- | :--- |
| Level distribution | `LIVE_SNAPSHOT` — occupied slots, `Character.level`. **No cap.** Open-ended histogram. |
| XP progression | `LIVE_SNAPSHOT` — leftover XP vs `100 * 2^(N-1)` (`xpCurve.ts`). Not “to cap.” |
| Spell discovery | `UNSUPPORTED`. Upgrade coverage only (H3). |
| Achievement progression | `LIVE_SNAPSHOT` — OQL `achievementProgress` + configs. `unlockedAt` is a real timestamp. Retired configs cannot newly unlock. |

### 4.5 Economy

| Asked | Support |
| :--- | :--- |
| Doka earned (aggregate) | `UNSUPPORTED` as a ledger |
| Doka spent (aggregate) | `UNSUPPORTED` as a ledger |
| Major sources | **Code map** only. After AQA-012: **counts** of victory paid and shop credit committed — not amounts. |
| Major sinks | Architecture list. Death-penalty **count** after 012, not Doka removed. |

Writers (do not turn into a share pie):

| Direction | Writer | Note |
| :--- | :--- | :--- |
| + | `applyRewards` | Official credits; client clamps to 100_000 Doka / 500_000 XP per call |
| + | `claimAchievementReward` | Feat claim |
| + | `processPendingPurchases` | Shop package after 60s |
| + | `adminGrantDoka` / `adminAddDoka*` | Operator — H14 action counts can flag grant bursts |
| − / absolute | `upgradeSpell`, `renameCharacter` (100), `purchaseBuff` | Sinks |
| absolute | `saveBattleStats` | Heals, item-shop, death 20% XP / 40% Doka |
| none | `calculateAndAwardDoka` | **Dead mint** (returns 0). Not a source. |

IAP `purchaseRecords` remain dated **shop mint**, not battle earn.

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
| Extremely low usage | Snapshot proxies only: spell never in any `spellLevelKeys` / bar **and** not a starter; achievement never unlocked; Rush all `highestRoomCompleted` 0; shop package with zero purchase rows. Enemies / modifiers / regions / ads: **no usage signal.** |
| Invalid configuration events | `UNSUPPORTED` — `AdminGuard` `#err` returns **before** `_recordAdminAudit` |
| Failed asset loads | `LOCAL_ONLY` (admin preview `onError`) |
| Pixel-fallback events | `LOCAL_ONLY` pattern-lookup-failed. **Not** custom-URL fallback. |
| Unused custom visual assets | Config: non-empty `spriteUrl` / `*Url`. World **ignores** those URLs. Empty URL = `NORMAL_DEFAULT`. |
| Stale dependencies | Repo inventory (`package.json`), not a Health series. |
| Recent admin mutations | **H14** after bindgen: last-100 successful writes. Ops context for H2/H3/H5, not player usage. |

### 4.8 Visual fallback (required distinction)

| Kind | Definition | Exists today? |
| :--- | :--- | :--- |
| `NORMAL_DEFAULT` | Entity is **meant** to use built-in pixels. `spriteUrl` / `frontUrl` empty. | Yes. This is the live world path. Admin enemy chip “Default pixel visual” is this. |
| `CUSTOM_FALLBACK` | A custom visual **was configured** and **failed**, so default pixels were used. | **No metric.** World does not fetch custom URLs. |

**Do not treat as `CUSTOM_FALLBACK`:**

1. Empty URL / empty tuple (`adminContract.test.ts` 139–144 already refuses to treat `[]` as a custom asset).  
2. Pattern-lookup-failed (`pieceArt.ts` 809–811) — missing `pieceType`/palette.  
3. Admin preview `onError` (`AdminDashboard.tsx` 1415–1417).  
4. Sprite preview copy “Default Pixel Visual — **Active fallback**” (`AdminDashboard.tsx` 1429) when URL is empty. That is `NORMAL_DEFAULT`.  
5. Audit `deletePlayerSpriteConfig` with `newSummary = "pixel-fallback"` (`main.mo` 838). That is an **admin delete** of a sprite config, not a runtime load fail.

A future custom-URL loader may emit `CUSTOM_FALLBACK` only when `url != ""`
and load/decode fails. That event is **not** approved (TADD-006 / 09-01-002).

---

## 5. Filters

Same as 2026-08-31, plus H14:

| Filter | Enable on | Disable / hide |
| :--- | :--- | :--- |
| Date / time period | H2 `unlockedAt`; H6 purchase `timestamp`; **H14 `timestampNs`** (ring only); H12 after day-buckets exist | All other snapshots (“as-of-now”) |
| Relative player-level band | H1, H3, H4, H8/H9 if joined | Catalog-only; H14 |
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
| Principal text | `getAllCharacters`, OQL `owner`, `getLeaderboard`, **audit `adminPrincipal`**, audit `objectId` on grant/ban/role actions |
| Character / profile name | Character, `userProfiles`, leaderboard |
| Customer name, email, address, city, country, postal, proof URL | Purchases tab |
| Chat `playerName` | Irrelevant here |

`n < 5`: hide rates. HMAC principal only if a human later requires a debug
export; default is no row-level export.

H14 default columns: `action`, count. Config `objectId` (spell/enemy/boss
ids) is allowed. Principal-shaped `objectId` is not.

---

## 7. Analytical honesty

1. Snapshot ≠ rate over time. Caption: **“As of query time.”**  
2. Correlation ≠ causation. Room 8 reached ≠ “room 8 is fair.”  
3. Always show **n**.  
4. Hide % when `n < 20` (rates) or `n < 5` (privacy).  
5. Survivorship: `bestRewardMultiplier` / `highestRoomCompleted` describe people who still have a record.  
6. Victory paid ≠ battles started.  
7. `killCount` unused → do not plot.  
8. H14 `n ≤ 100` is a ring, not lifetime volume.  
9. No composite health score.  
10. Admin grant burst (H14) **beside** a fat wallet (H5) does not prove the wallet is only grants.

---

## 8. Views (decision-backed)

Placement: new **Health** tab on owner-only `AdminDashboard` (same
`isAdmin && onOpenAdmin` gate, carved-stone tokens). Dev-only. Do not
ship to normal players.

H1–H13: unchanged decisions vs 2026-08-31. Caption deltas only:

| View | Caption delta this run |
| :--- | :--- |
| H1 Population / level | Unchanged. No cap. |
| H2 Achievement funnel | Unlock = client report. Retired configs cannot newly unlock (`main.mo` 2115–2117). Still not a canister condition check. |
| H3 Spell upgrade coverage | “Upgrade persist only. Not casts. Starter + **usable** catalog may appear with no key. Retired (`usableByPlayer === false`) appears only if a key/bar already exists.” |
| H4 Loadout co-occurrence | Unchanged. `n ≥ 20` bars. |
| H5 Wallet distribution | Unchanged. Not earned/spent. Read next to H14 grant actions. |
| H6 Shop mint | Unchanged. No customer columns. |
| H7 Source/sink map | Add: `calculateAndAwardDoka` is a dead mint (returns 0). Official credits clamp per call. |
| H8 Dungeon snapshot | Unchanged. |
| H9 Boss Rush snapshot | Unchanged. Not `BossConfig.defeated`. |
| H10 Config hygiene | Add visual taxonomy (4.8). Empty URL = `NORMAL_DEFAULT`. |
| H11 Client version seen | Still `v163` vs `getAppVersion`. Not “played during vX.” |
| H12 Event strip | Still “not shipped (AQA-012 / TADD-001).” Increment rules in §3.4. |
| H13 Not measured | Unchanged list (battle starts, defeat, flee, turns, enemy series, casts, discovery, Doka ledger, boss attempts, abnormal termination). |

### H14 — Admin mutation ring (Admin content / economy context) — NEW

- **Decision:** Did an operator grant, retire, or delete content that would
  explain an empty H3 row, a never-unlocked feat, or a handful of huge
  wallets?  
- **Class:** `CANISTER_UNBOUND` today; `LIVE_SNAPSHOT` after official
  bindgen includes `getAdminAuditLog`.  
- **Query:** `getAdminAuditLog` only. Do not add an OQL entity that
  repeats `adminPrincipal`.  
- **Viz:** Counts by `action` (e.g. `setSpellConfig`, `retireSpellConfig`,
  `grantDoka` / `addDoka*`, `banPrincipal`, `deletePlayerSpriteConfig`).
  Optional period filter on `timestampNs` **inside the ring**.  
- **n** = ring length (max 100). Caption: “Last 100 **successful** admin
  writes. Validation `#err` is not recorded. Not player telemetry.”  
- **Forbidden:** `adminPrincipal`; player principals in `objectId`.  
- **Not:** invalid-config event feed; `CUSTOM_FALLBACK`; lifetime volume.

Until bindgen: card state = “Canister method exists; official actor
bindings missing. Do not mock a chart.”

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
  [ Economy ]      H5 | H6 | H7 | H14 (grant/retire context)
  [ Dungeon/Rush ] H8 | H9
  [ Spells ]       H3 | H4 (n>=20)
  [ Catalog ]      H10 | H11 | NORMAL_DEFAULT counts
```

No Enemy Health outcome section.

---

## 10. Still refused

- Wiring `saveKillCount` as a battle chart.  
- Debug overlay as production telemetry.  
- `BossConfig.defeated` or empty `spriteUrl` as player outcomes.  
- Treating admin “pixel-fallback” / “Active fallback” copy as
  `CUSTOM_FALLBACK`.  
- Date-filtered earn/spend **share** charts before a ledger exists.  
- A composite health score.  
- Any Health cell with a principal, email, or proof URL.  
- Expanding AQA-012 without a new human-approved ID.

---

## 11. Implementation order (no production code this run)

1. **TADD-2026-08-31-001 / AQA-012** — seven counters. Highest leverage.
   Follow §3.4 increment rules.  
2. **TADD-2026-08-31-002** — Health tab H1–H11, H13 (read-only).  
3. **TADD-2026-08-31-003** — aggregate query or OQL extension without PII.  
4. **TADD-2026-09-01-001** — bindgen `getAdminAuditLog`, then H14.  
5. H12 widgets only after counters are queryable.

Snapshot UI regression risk is low if read-only and aggregated before
setState. TADD-001 remains **medium** if it writes off the persist lock.

---

## 12. Sample-size and confidence

| n | Rates | Histograms |
| :--- | :--- | :--- |
| 0 | “No rows” | Empty |
| 1–4 | Hide % ; privacy | Counts ok |
| 5–19 | Counts; hide % | Counts ok |
| ≥ 20 | % + optional Wilson 95% (H2 claim/unlock, H12 fail rate) | Counts ok |

H14: never present ring counts as a weekly rate. Do not interpolate empty
level bins as historical zeros.

---

## 13. ACTION_IDs

Prior (still OPEN): `TADD-2026-08-31-001` … `007` in
[`ACTION_IDS_2026-08-31.md`](ACTION_IDS_2026-08-31.md).  
This run: [`ACTION_IDS_TADD_2026-09-01.md`](ACTION_IDS_TADD_2026-09-01.md).
