# Owner telemetry dashboard — design only

**Author:** Telemetry Admin Dashboard Designer  
**Date:** 2026-08-31 (cron `0 */72 * * *`)  
**HEAD inspected:** `22503b5` (`fix: keep generated maps solvable across seeds (#110)`)  
**Gameplay / production code:** not modified.

This document designs **owner-only** analytical views. It uses only data Stralt
already persists or that `AQA-2026-08-30-012` already approved. It does not
invent battle logs, usage events, or custom-asset failure metrics.

---

## 1. Why this is not a vanity dashboard

The 2026-08-30 Quality Auditor found **no player telemetry**. The only source
hit for the word “telemetry” is a comment in `WorldExploration.tsx` (intent
already logged by `decideEnemyAction`; the comment does not emit a metric).
`AQA-2026-08-30-012` approved the smallest backend-authoritative counters so
later audits are not blind. Those counters are **not shipped**.

Today the owner can answer a few **as-of-now** questions from admin/OQL
snapshots. The owner **cannot** answer “how many battles this week,” “who is
winning vs this family,” or “which spell is overused in combat.” Charts that
pretend otherwise would be false.

**Rule for every panel below:** if the data class is not `LIVE_SNAPSHOT` or
`APPROVED_EVENT`, the panel is not drawn. The UI shows an explicit “not
measured” state instead of a zero that looks like “zero battles.”

---

## 2. Data classes (do not mix)

| Class | Meaning | Owner-aggregatable? |
| :--- | :--- | :--- |
| `LIVE_SNAPSHOT` | Current canister maps / configs. No history unless the row itself has a timestamp. | Yes, if queried as admin/controller and **aggregated before paint**. |
| `APPROVED_EVENT` | Counters named in `AQA-2026-08-30-012`. Not implemented. | Yes, **after** that ID ships. |
| `LOCAL_ONLY` | Client debug ring buffer (`debug/debugLogger.ts`, cap 2000). Console is dev-only. | **No.** Per-session, not written to the canister. |
| `UNSUPPORTED` | Requested in the brief, no persist path, not approved. | **No.** Do not design a chart. |

`getLeaderboard` is a **public** top-50 by level. It is not an owner health
API. It exposes `principalId` and `playerName`. Do not reuse it as the Health
tab data source.

---

## 3. Inventory — what actually exists

### 3.1 Admin / player canister APIs

| Source | Gate | Fields that matter | Class |
| :--- | :--- | :--- | :--- |
| `getAllCharacters()` (`main.mo` 369–374) | `#admin` | Full `Character` per slot: `level`, `experience`, `stats.killCount`, `spellLevelKeys` / `spellLevelValues`, `spellBarOrder`, `activeSpells`, `bossRushMasterComplete`, `name`, `pieceType` | `LIVE_SNAPSHOT` |
| `getLeaderboard()` (`main.mo` 2527–2571) | public | Best-slot `level`, `killCount`, claimed-achievement count, **principal + name** | Do not use on Health |
| `saveKillCount` (`main.mo` 2250–2286) | caller | Additive `stats.killCount`, max +64 per call | Hook exists; **no UI caller**. Architecture: “Hook exists; no UI caller yet.” |
| `dokaBalances` via `adminGetDoka(principal)` | `#admin`, one principal | Current wallet Nat | `LIVE_SNAPSHOT` (no dump-all except OQL) |
| `getPlayerAchievements(player)` (`main.mo` 1606–1614) | caller == player | One player’s unlock/claim rows | Not an owner dump |
| `adminGetPurchaseRecords` / Purchases tab | `#admin` | `dokaAmount`, `packageId`, `timestamp`, `status`, **plus customer PII** | Snapshot + PII (fulfillment only) |
| `getDungeonRecord(principal)` (`main.mo` 1988–1994) | caller == principal | `chainDepth`, `totalMapsCompleted`, `bestRewardMultiplier` | Per-player only |
| `getBossRushState(userId, slot)` (`main.mo` 2423–2431) | caller == userId else `(0,0,0)` | `currentRoom`, `highestRoomCompleted`, `totalBossRushRuns` | Per-player only |
| `getAppVersion` / `APP_VERSION` (`App.tsx` 15, currently `v163`) | public / client constant | Content version string | Catalog, not event-tagged |
| Config CRUD (`getSpellConfigs`, `getEnemyConfigs`, `getAllBossConfigs`, …) | mostly public read | Templates, URLs, `minLevel`, `usableByEnemy` | Catalog inventory |

`getAllCharacters` is bound in `backend.ts` and mocked. **AdminDashboard does
not call it.** There is no Health tab (`AdminDashboardState.tab` is config
CRUD only: enemies, regions, sprites, spells, modifiers, tiers, visuals,
settings, purchases, achievements, names, bosses, ads, shop, bossRush).

### 3.2 OQL (`schema` / `execute`, `main.mo` ~2620–3010)

Caffeine OQL exposes maps for the Data Intelligence controller. The admin UI
does not call `execute` today.

| Entity | Useful payloads | Missing vs a health dashboard |
| :--- | :--- | :--- |
| `characterSlots` | per-slot name, pieceType, level, experience, hp, killCount | **No** `spellLevelKeys`, `spellBarOrder`, `bossRushMasterComplete` |
| `dokaBalances` | owner, balance | No earn/spend history |
| `userProfiles` | owner, **name** | PII |
| `changelogShownVersions` | owner, last-seen version | Not “events in version X” |
| `dungeonRecords` | chainDepth, totalMapsCompleted, bestRewardMultiplier | No attempts, no flee, no timestamps |
| `achievementProgress` | achievementId, unlocked, unlockedAt, claimed, **principalId** | Owner dump exists; must drop principal |
| `purchaseRecords` | dokaAmount, packageId, timestamp, status | Also customer name/email/city/country |
| `bossRushStates` | currentRoom, highestRoomCompleted, totalBossRushRuns | No attempt/flee counters; key is `principal#slot` |
| `spellConfigs` / `enemyConfigs` / `bossConfigs` / `playerSpriteConfigs` / `mapModifierConfigs` / `shopPackages` | catalog | `enemyConfigs.spriteUrl`, sprite `*Url` are **config**, not load outcomes |
| `buffInventories` | itemCount, totalQuantity | Not requested; omit |

OQL `characterSlots` is **not** enough for spell or Boss Rush master views.
Those need `getAllCharacters` or an OQL payload extension (`TADD-2026-08-31-003`).

### 3.3 Client-only (not owner telemetry)

| Signal | Where | Why it is not a dashboard source |
| :--- | :--- | :--- |
| `logDebug*` ring buffer | `debug/debugLogger.ts` 105–112; console gated 123–124 | Local, 2000 lines, not persisted |
| “Reward persistence failed (non-blocking)” | `WorldExploration.tsx` ~12797–12802 | `logDebugInfo` only |
| “BossRush reward persist failed” | same file ~13097 | Same |
| Pattern lookup failed → king.front | `data/pieceArt.ts` 809–811, 40–50 | Local, throttled; **pieceType/palette miss**, not a custom URL fail |
| Admin sprite `<img onError>` | `AdminDashboard.tsx` ~1247–1249 | Hides preview; no counter |
| Enemy `spriteUrl` / player `frontUrl` | configs + OQL | **WorldExploration does not load `spriteUrl`.** World draw is pixel patterns. |
| `useSaveKillCount` | `hooks/useLeaderboardQueries.ts` 43–50 | Defined; **zero TSX callers** |
| Recap open/close | `PostBattleRecap.tsx` `onClose` | Local UI; not counted |

### 3.4 Approved but not shipped (`AQA-2026-08-30-012`)

Human-designed, backend-authoritative counters only. No gameplay math change.
Must enqueue on `createProgressPersist` or be query-only:

1. persist-ok  
2. persist-fail  
3. death-penalty applied  
4. victory paid  
5. recap opened  
6. recap dismissed  
7. shop credit committed  

Until these exist, **Game Health event panels stay in “approved, not shipped.”**
Do not fill them from `killCount`, debug logs, or recap local state.

---

## 4. Requested metrics — support matrix

### 4.1 Game health

| Asked | Support | Honest substitute |
| :--- | :--- | :--- |
| Battle count | `UNSUPPORTED` | After AQA-012: **victory paid** is a **paid-victory** count, not all battles (excludes defeat/flee/crash). |
| Victory / defeat / flee | `UNSUPPORTED` | Victory paid (approved). Defeat/flee have **no** counter. Flee in dungeon/Boss Rush is death-penalty path (`portalRules` / `_handlePlayerDeath`); still uncounted. |
| Average battle turns | `UNSUPPORTED` | Challenge `under_*_turns` is local progress, never persisted as a turn histogram. |
| Deaths | `UNSUPPORTED` | After AQA-012: **death-penalty applied**. That is “penalty persist succeeded,” not “bodies on the floor” (lava vs combat vs flee are not distinguished). |
| Persistence failures | `LOCAL_ONLY` today | After AQA-012: persist-ok vs persist-fail. |
| Abnormal termination | `UNSUPPORTED` | No crash / tab-close / mid-battle abandon event. |

`killCount` is **not** battle count. It is unused in the official client.
Charting it would show zeros or stale admin writes and look like “no combat.”

### 4.2 Enemy health

| Asked | Support |
| :--- | :--- |
| Encounter frequency | `UNSUPPORTED` — no encounter log; enemy configs are templates. |
| Relative level | `UNSUPPORTED` — runtime level is generated; not stored per fight. Region `levelMin`/`levelMax` is catalog, not outcomes. |
| Player win/loss vs enemy | `UNSUPPORTED` |
| Battle duration | `UNSUPPORTED` |
| Elite frequency | `UNSUPPORTED` — no elite persist field; tier spawn is localStorage + config. |
| Advanced AI usage | `UNSUPPORTED` — archetypes live in `enemyAI.ts`; intent logs are `LOCAL_ONLY`. |
| Enemy spell usage | `UNSUPPORTED` — `usableByEnemy` is catalog, not casts. |

**No Enemy Health outcome charts.** Optional catalog panel: count of enemy
templates by region / level band / `spriteUrl` empty vs set (config hygiene,
not combat health).

### 4.3 Spell health

| Asked | Support | Honest substitute |
| :--- | :--- | :--- |
| Usage (casts) | `UNSUPPORTED` | None. |
| Discovery | `UNSUPPORTED` | Official client treats non-legacy `getSpellConfigs()` rows as owned (`WorldExploration.tsx` 2257–2272: base ∪ filtered backend). There is no discover/unlock write. |
| Acquisition source | `UNSUPPORTED` | Starter list is `data/spellData.ts` (client). Backend catalog is admin config. `spellLevelKeys` is **upgrade history**, created by `upgradeSpell` (`main.mo` 677–766), not “first obtained.” |
| Combinations (combat) | `UNSUPPORTED` | Optional weak proxy: **equipped-together** from `spellBarOrder` / `activeSpells` snapshots (`LIVE_SNAPSHOT` via `getAllCharacters` only). Label as loadout, not combo usage. |
| Underused / overused | `UNSUPPORTED` for casts | Upgrade-presence vs catalog: “never upgraded” ≠ underused. “High upgrade level” ≠ overused in combat. |
| Observed but rarely obtained | `UNSUPPORTED` | Nothing observes spells without obtaining them. |

### 4.4 Progression

| Asked | Support |
| :--- | :--- |
| Level distribution | `LIVE_SNAPSHOT` — occupied slots, `Character.level`. **No cap.** Histogram is open-ended (1, 2, …, max observed, + “≥ max+1” is unnecessary; add bins as max grows). |
| XP progression | `LIVE_SNAPSHOT` — leftover XP vs `100 * 2^(N-1)` (`docs/ARCHITECTURE.md`, `utils/xpCurve.ts`). Show leftover / threshold, not a fake “to cap.” |
| Spell discovery | `UNSUPPORTED` as discovery. Show **upgrade coverage** only (see 4.3). |
| Achievement progression | `LIVE_SNAPSHOT` — OQL `achievementProgress` + `getAchievementConfigs`. `unlockedAt` is the only gameplay timestamp besides purchases. |

### 4.5 Economy

| Asked | Support |
| :--- | :--- |
| Doka earned (aggregate) | `UNSUPPORTED` as a ledger. Wallet is current `dokaBalances` only. |
| Doka spent (aggregate) | `UNSUPPORTED` as a ledger. Sinks (`upgradeSpell`, rename 100, `purchaseBuff`, recap/item shop via `saveBattleStats`, death 40%) are not journaled. |
| Major sources | **Code map** (architecture), not measured shares. After AQA-012: counts of **victory paid** and **shop credit committed** — still not amounts unless a later human expands 012. |
| Major sinks | Same: architecture list only. Death-penalty **count** after 012, not Doka removed. |

Known writers (do not turn this into a pie chart of “share”):

| Direction | Writer | Typical reason |
| :--- | :--- | :--- |
| + | `applyRewards` | Victory, portal +10 XP (XP not Doka), world pickups, Boss Rush room clear |
| + | `claimAchievementReward` | Feat claim |
| + | `processPendingPurchases` | Shop package after 60s |
| + | `adminGrantDoka` / `adminAddDoka*` | Operator |
| − / absolute | `upgradeSpell` | Spell level |
| − / absolute | `renameCharacter` | 100 Doka |
| − / absolute | `purchaseBuff` | Buff shop |
| absolute | `saveBattleStats` | Heals, item-shop spends, death 20% XP / 40% Doka |

IAP `purchaseRecords` **are** a dated money-adjacent source: completed
`dokaAmount` by `packageId`. That is **shop mint**, not battle earn.

### 4.6 Bosses / dungeons

| Asked | Support |
| :--- | :--- |
| Attempts | `UNSUPPORTED` — `resetBossRush` / `resetDungeonChain` do not increment an attempt counter. |
| Completion | **Partial snapshot:** Boss Rush `highestRoomCompleted` (0–10), `totalBossRushRuns` (full 10-room clears), `bossRushMasterComplete` on Character. Dungeon `totalMapsCompleted` is cumulative map clears, not “dungeon finished.” |
| Average attempts | `UNSUPPORTED` |
| Flee / abandonment | `UNSUPPORTED` — flee is death-penalty; reset zeroes `currentRoom` / `chainDepth` without a flee flag. |
| Relative difficulty | `UNSUPPORTED` — no win/loss. Do not infer difficulty from `bestRewardMultiplier` or room reached (survivorship). |
| `BossConfig.defeated` | **Global admin flag**, not per-player telemetry. Do not chart as “players who beat this boss.” |

Per-boss named encounters (portal assignments) have **no** attempt table.

### 4.7 Admin content health

| Asked | Support |
| :--- | :--- |
| Extremely low usage | Only where a snapshot proxy exists: spell never in any `spellLevelKeys` / bar; achievement never unlocked; Boss Rush `highestRoomCompleted` all 0; shop package with zero purchase rows. **Enemies, modifiers, regions, ads: no usage signal.** |
| Invalid configuration events | `UNSUPPORTED` — validation returns `#err` to the caller; no event store. |
| Failed asset loads | `LOCAL_ONLY` (admin preview `onError`). |
| Pixel-fallback events | `LOCAL_ONLY` pattern-lookup-failed. **Not** custom-URL fallback. |
| Unused custom visual assets | Config: `spriteUrl` / `*Url` non-empty. Runtime world **ignores** those URLs. “Unused” = configured but never loaded (always), or configured and no entity type exists. Do not mark empty URL as unused-custom. |
| Stale dependencies | **Repo inventory**, not telemetry. `package.json` lists Three/R3F stacks unused by the canvas game. One-time audit, not a Health chart. |

### 4.8 Visual fallback (required distinction)

| Kind | Definition | Exists today? |
| :--- | :--- | :--- |
| `NORMAL_DEFAULT` | Entity is **meant** to use built-in pixel art. `spriteUrl` / `frontUrl` empty. | Yes, this is the live world path. |
| `CUSTOM_FALLBACK` | A custom visual **was configured** and **failed**, so default pixels were used. | **No metric.** World does not fetch custom URLs. Pattern fallback is missing `pieceType`/palette, which is a **content bug**, not a custom-asset fail. |

**Do not** put pattern-lookup-failed or empty `spriteUrl` on an “errors”
chart. A future custom-URL loader may emit `CUSTOM_FALLBACK` only when
`url != ""` and load/decode fails (`TADD-2026-08-31-006`).

---

## 5. Filters

| Filter | Enable on | Disable / hide |
| :--- | :--- | :--- |
| Date / time period | Achievement `unlockedAt`; purchase `timestamp` | All other snapshot panels (grey: “as-of-now, no event time”) |
| Relative player-level band | Character-derived histograms (level, leftover XP, upgrade presence, Boss Rush / dungeon joined by slot level) | Catalog-only panels |
| Enemy family | — | Hidden. No persist. |
| Spell | Upgrade / loadout tables (spell id) | Cast-usage (none) |
| Boss | — | Hidden. No per-boss outcomes. Boss Rush uses **room index**, not boss id. |
| Dungeon | Dungeon snapshot tables | Attempt/flee (none) |
| Content version | `changelogShownVersions` distribution | Gameplay events (not version-tagged). Client `APP_VERSION` vs canister `getAppVersion` may **diverge** — show both strings, do not assume they match. |

Level bands (suggested, not a cap): 1–4, 5–9, 10–19, 20–39, 40–79, 80+  
Recompute the last edge from `max(level)` when the live max exceeds 80.
Never add an “endgame / max level” band.

---

## 6. Privacy

Owner Health is **aggregates only**.

| Must not appear on Health | Why it exists elsewhere |
| :--- | :--- |
| Principal text | `getAllCharacters`, OQL `owner`, `getLeaderboard` |
| Character / profile name | Character, `userProfiles`, leaderboard |
| Customer name, email, address, city, country, postal, proof URL | Purchases tab (fulfillment). Keep it **off** Health. |
| Chat `playerName` | `sendMessage` is unauthenticated (known security finding); irrelevant here. |

Implementation: aggregate in memory, then render counts. If a join key is
required in a debug export, HMAC the principal with an owner-only secret and
never show the raw id. Default: no export of row-level player data.

`n` below 5: show “n too small” instead of a 100% / 0% rate.

---

## 7. Analytical honesty (every panel)

1. Snapshot ≠ rate over time. Caption: **“As of query time.”**  
2. Correlation ≠ causation. Reaching room 8 does not prove room 8 is “fair.”  
3. Always show **n** (occupied slots, unlock rows, purchase rows, counter total).  
4. Hide percentages when `n < 20` (rates) or `n < 5` (privacy).  
5. Survivorship: `bestRewardMultiplier` and `highestRoomCompleted` describe
   people who still have a record, not people who quit.  
6. AQA-012 **victory paid** ≠ battles started.  
7. `killCount` unused → do not plot.  
8. No “health score” composite.

---

## 8. Views to build (decision-backed)

Placement: new **Health** tab on the existing owner-only `AdminDashboard`
(already `isAdmin && onOpenAdmin`, lazy-loaded). Same carved-stone tokens
(`C.bg0` / gold / crimson). Dev-only: do not ship Health to normal players
(same gate as the rest of the dashboard).

Each card: **title**, **decision**, **data class**, **query**, **viz**,
**empty / not-measured state**, **n**.

### H1 — Population and level (Progression)

- **Decision:** Is anyone actually playing, and is the population stuck in a
  band? Should starter regions / XP curve get attention?  
- **Class:** `LIVE_SNAPSHOT`  
- **Query:** `getAllCharacters` (preferred) or OQL `characterSlots`.  
- **Viz:**  
  - Occupied slots / principals with ≥1 slot (two numbers).  
  - Open-ended level histogram (occupied slots only).  
  - Leftover XP as fraction of `xpForNextLevel(level)` — box or banded bars.  
- **Not:** a max-level trophy wall.  
- **Caption:** As of now. Empty slots omitted. `n` = occupied slots.

### H2 — Achievement funnel (Progression)

- **Decision:** Which feats never unlock or never get claimed (reward too
  obscure vs condition never reachable)?  
- **Class:** `LIVE_SNAPSHOT`  
- **Query:** OQL `achievementProgress` + `getAchievementConfigs`.  
- **Viz:** Table: achievement id, active flag, unlocks, claims, claim/unlock
  ratio. Date filter on `unlockedAt` only.  
- **Honesty:** Unlock is client `markAchievementUnlocked` (no canister
  condition check — known security finding). Treat counts as “client said
  unlocked,” not proof of the feat.  
- **n** = distinct principals who have **any** progress row, plus per-row
  unlock n.

### H3 — Spell upgrade coverage (Spell health — proxy only)

- **Decision:** Which catalog spells have **never been upgraded** (dead
  upgrade UX / dead catalog row)? Which have high levels (Doka sink
  concentration)?  
- **Class:** `LIVE_SNAPSHOT`  
- **Query:** `getAllCharacters` (`spellLevelKeys` / values) + `getSpellConfigs`
  + client starter ids (`spellData.ts`). OQL alone is insufficient today.  
- **Viz:** Table: spell id, `minLevel`, `usableByPlayer`, characters with
  key present, median / max upgrade level. Filter by spell id and player
  level band (character level, not spell minLevel).  
- **Caption:** “Upgrade persist only. Not casts. Starter spells may be used
  at level 0 with no key.”  
- **Do not** label “underused” / “overused.”

### H4 — Equipped loadout co-occurrence (optional, Spell)

- **Decision:** Are players parking one 8-spell bar (e.g. all starters)?  
- **Class:** `LIVE_SNAPSHOT`  
- **Query:** `spellBarOrder` / `activeSpells` from `getAllCharacters`.  
- **Viz:** Pair counts for ids appearing on the same bar. Require `n ≥ 20`
  bars before showing pairs.  
- **Caption:** Equipped snapshot, not combat combinations.

### H5 — Wallet distribution (Economy)

- **Decision:** Is the live economy a handful of huge wallets (admin grants /
  shop) vs empty official-client wallets?  
- **Class:** `LIVE_SNAPSHOT`  
- **Query:** OQL `dokaBalances`.  
- **Viz:** Histogram of **current** balance (log bins). `n` = principals
  with a map entry. Note: missing key ≠ proven zero (never touched).  
- **Do not** title this “Doka earned” or “Doka spent.”

### H6 — Shop mint (Economy, dated)

- **Decision:** Are IAP packages completing? Is pending stuck (60s
  auto-complete / `processPendingPurchases`)?  
- **Class:** `LIVE_SNAPSHOT` with timestamps  
- **Query:** `adminGetPurchaseRecords` aggregated in the client.  
- **Viz:** Counts by `status`; sum `dokaAmount` for `completed` by
  `packageId`; time filter.  
- **Columns allowed:** period, packageId, status, count, sum doka.  
- **Columns forbidden:** customer identity, email, address, proof.  
- **Caption:** Shop mint, not battle income.

### H7 — Architecture source/sink map (Economy, static)

- **Decision:** When reading H5/H6, which writers exist so the owner does
  not invent a fourth wallet path?  
- **Class:** Documentation (this file + `docs/ARCHITECTURE.md` persist table).  
- **Viz:** Static table (section 4.5). No numeric shares.

### H8 — Dungeon chain snapshot (Bosses / dungeons)

- **Decision:** Is anyone in a chain, and how deep are live chains?  
- **Class:** `LIVE_SNAPSHOT`  
- **Query:** OQL `dungeonRecords`.  
- **Viz:** Histogram of `chainDepth` (0 = not in chain); histogram of
  `totalMapsCompleted`; `bestRewardMultiplier` as a distribution with
  survivorship caption.  
- **Not:** attempts, flee rate, difficulty.

### H9 — Boss Rush snapshot (Bosses / dungeons)

- **Decision:** Do runs die in early rooms? Has anyone finished 10 rooms?  
- **Class:** `LIVE_SNAPSHOT`  
- **Query:** OQL `bossRushStates` + `bossRushMasterComplete` from
  `getAllCharacters`.  
- **Viz:** Histogram of `highestRoomCompleted` (0–10); count of
  `totalBossRushRuns` > 0; count of master-complete flags.  
- **Caption:** Best room ever, not attempts. `currentRoom` is mid-run
  state, not a completion rate.  
- **Not:** per-boss named fights; `BossConfig.defeated`.

### H10 — Config hygiene (Admin content)

- **Decision:** What catalog rows have **no snapshot evidence** of player
  interaction (so the owner can delete or ship them)?  
- **Class:** `LIVE_SNAPSHOT` + catalog  
- **Viz:**  
  - Spells in `getSpellConfigs` with zero `spellLevelKeys` hits **and**
    not in the starter id set.  
  - Achievements with zero unlocks.  
  - Shop packages with zero purchase rows.  
  - Enemy / modifier / region / ad rows: **list with “usage not measured.”**  
  - Custom URL inventory: count configs with empty vs non-empty `spriteUrl`
    / `*Url`. Empty = `NORMAL_DEFAULT`. Non-empty = configured custom
    (world still does not load it).  
- **Not:** invalid-config event feed; failed-load feed; pixel-error feed.

### H11 — Client version seen (Content version)

- **Decision:** Are players still on an old changelog-seen version after a
  wipe (`APP_VERSION`)?  
- **Class:** `LIVE_SNAPSHOT`  
- **Query:** OQL `changelogShownVersions`; display canister `getAppVersion`
  and client `APP_VERSION` as labels.  
- **Viz:** Counts by version string.  
- **Caption:** Last changelog ack, not “played during vX.”

### H12 — Game Health events (APPROVED_EVENT — do not ship UI until counters exist)

- **Decision:** Is persist healthy? Are victories paying? Are players
  dismissing recap? Is death penalty landing? Is shop credit committing?  
- **Counters (names for implementers — do not add fields beyond AQA-012):**  

  | Counter | Increment when | Not |
  | :--- | :--- | :--- |
  | `persist_ok` | Queued persist fn completes a successful canister write (`applyRewards` `#ok`, `saveBattleStats` `#ok`, `upgradeSpell` `#ok`, claim/shop credit `#ok`) | Local optimistic UI |
  | `persist_fail` | Same paths, `#err` or transport throw after enqueue | User cancel |
  | `death_penalty_applied` | `persistDeathPenalty` write succeeds | Death Realm timer fire; HP restore |
  | `victory_paid` | `resolveBattleRewards` → `applyRewards` `#ok` for a battle recap | Portal +10 XP; Boss Rush room (optional **separate** count only if a human expands 012 — default: do not) |
  | `recap_opened` | Root `PostBattleRecap` mounts with data | |
  | `recap_dismissed` | `onClose` on that recap | Unmount from crash |
  | `shop_credit_committed` | `creditPendingPurchasesThroughPersist` commit after `#ok` | `initiatePurchase` |

- **Viz:** Single-period counts + persist_fail / (ok+fail) with Wilson
  interval when `n ≥ 20`. Date filter **only if** counters are stored
  with day buckets (recommended: `Nat` per UTC day, 90-day ring, no
  principal).  
- **Empty state until shipped:** “Event counters not deployed (AQA-012 /
  TADD-001). Do not infer from killCount.”

### H13 — Game Health not measured (static)

Visible list so the owner does not ask the tab for:

- Battle starts, defeat, flee, turns, duration  
- Abnormal termination  
- Enemy family / elite / AI / enemy spells  
- Spell casts / discovery / obtain source  
- Doka earned vs spent totals  
- Boss attempts / flee / per-boss difficulty  

---

## 9. Layout (owner Health tab)

```
[ Health ]
  Period: [ 7d | 30d | all ]     ← enabled only on H2 (unlocks), H6, H12
  Level band: [ all | 1–4 | … ]  ← H1, H3, H4, H8/H9 if joined
  Spell: [ all | id ]            ← H3, H4
  Version: [ all | v… ]          ← H11 only

  ┌ Game ─────────────────────────────────────────────────────────┐
  │ H12 event strip (or “not shipped”)                             │
  │ H13 not-measured list                                          │
  └────────────────────────────────────────────────────────────────┘
  ┌ Progression ──── H1 histogram + leftover XP | H2 feat table ───┐
  ┌ Economy ─────── H5 wallet | H6 shop mint | H7 static map ──────┐
  ┌ Dungeon / Rush ─ H8 | H9 ──────────────────────────────────────┐
  ┌ Spells ──────── H3 | H4 (if n≥20) ─────────────────────────────┐
  ┌ Catalog ─────── H10 | H11 | visual NORMAL_DEFAULT counts ──────┐
```

No Enemy Health outcome section. Catalog enemy table may live under H10.

---

## 10. What this designer will not approve later

- Wiring `saveKillCount` “to get a battle chart” without a specified
  increment semantics (kills ≠ battles; bound 64; unused).  
- Using the debug overlay export as production telemetry.  
- Treating `BossConfig.defeated` or empty `spriteUrl` as player outcomes.  
- Date-filtered battle/economy **share** charts before a ledger exists.  
- A composite “game is healthy” score.  
- Any Health cell that shows a principal, email, or proof URL.

---

## 11. Implementation order (no code in this run)

1. **TADD-001 / AQA-012** — counters on the persist lock (or query-only
   canister Nat). Highest leverage for Game Health.  
2. **TADD-002** — Health tab UI for H1–H11, H13 using existing reads.  
3. **TADD-003** — spell/Boss Rush fields on OQL **or** aggregate helper
   over `getAllCharacters` that never returns principals to React state
   used for render.  
4. **TADD-005 / TADD-006** — privacy + visual taxonomy (docs + tab
   captions; Purchases tab may stay fulfillment-PII).  
5. H12 widgets only after counters are queryable.

Regression risk is **medium** only for TADD-001 (persist lock). Snapshot UI
is read-only if it uses `getAllCharacters` / OQL / existing admin queries
and does not write.

---

## 12. Sample-size and confidence (display rules)

| n | Rates | Histograms |
| :--- | :--- | :--- |
| 0 | “No rows” | Empty |
| 1–4 | Hide % ; privacy | Counts ok |
| 5–19 | Show counts; hide % | Counts ok |
| ≥ 20 | % + optional Wilson 95% on ratios (H2 claim/unlock, H12 fail rate) | Counts ok |

Do not interpolate empty level bins as “zero players historically.”

---

## 13. ACTION_IDs

Ledger: `docs/automation/ACTION_IDS_2026-08-31.md`.  
This run does not implement them.
