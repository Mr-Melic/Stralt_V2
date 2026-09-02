# Gameplay telemetry architecture — 2026-09-02

**Director:** Gameplay Telemetry Architecture Director  
**Automation:** `047ac8a1-a4a0-11f1-a7d1-d6b4613131ce` (cron `0 */72 * * *`)  
**HEAD inspected:** `58302bc` (`Merge pull request #258` — GameKey admin-approval shop)  
**Prior design:** [`TELEMETRY_ARCHITECTURE_2026-09-01.md`](./TELEMETRY_ARCHITECTURE_2026-09-01.md). Ledger: [`ACTION_IDS_GTAD_2026-09-02.md`](./ACTION_IDS_GTAD_2026-09-02.md).  
**Gameplay / production code:** not modified. This document is design only.

Mandate: owner-facing **aggregate game intelligence** for balancing, debugging, and content decisions. Not individual-player surveillance.

---

## 0. Verdict

There is still **no analytics store, no increment API, no sidecar module, and no admin Intelligence / Health tab**.

The 2026-08-31 / 2026-09-01 **fail-open increment sidecar** is **reaffirmed**. This run does **not** invent a second architecture. It patches evidence (line numbers after 141 commits since `dd275aa`) and corrects two implementer hazards:

1. **Shop mint moved.** `processPendingPurchases` is now a documented no-op that always returns `0` (`main.mo` **1301–1316**). Paid Doka credits only via `redeemGameKey` / `redeemGameKeyThroughPersist`. A Phase 1 hook on the remount `creditPendingPurchasesThroughPersist` path (`WorldExploration.tsx` **1459**) would count a **dead writer**.
2. **GameKey PII.** `GameKeyRequest.email` is persisted and exposed on OQL (`main.mo` **3715–3731**). `adminGetGameKeyReveal` returns a 120-char code. Intelligence must never join these. Aggregate request/redeem **counts** are allowed.

`GTAD-2026-09-01-001`…`014` remain the Phase 0/1 implementation tickets. Use **this file’s `EVENT_SOURCE` line numbers**, not 09-01. New IDs this run are GameKey / unpaid-death / summoner-roll deltas only.

Balance analyst and `longHorizonSim.telemetry.available` must stay **WAITING_FOR_TELEMETRY**.

---

## 1. What changed since 2026-09-01

| Topic | 2026-09-01 (`dd275aa`) | 2026-09-02 (`58302bc`) |
| :--- | :--- | :--- |
| Production telemetry | None | **Still none.** `src/` hits: WX intent comment, `longHorizonSim.telemetry.available = false`. No `recordTelemetryIncrements`, no `telemetrySidecar`. |
| `WorldExploration.tsx` | 20,063 lines; battle start **12661** | **19,253** lines. Battle start `setInBattle(true)` **12212–12214**. |
| Victory recap-then-persist | Recap **13009**; catch **13157** | Recap **12645–12647**; catch **12739–12744** (`"Reward persistence failed (non-blocking)"`). Boss Rush catch **12990–12995**. |
| `_handlePlayerDeath` | **13754** | **13360**. Linchpin comment still lists HP-watch as a routed caller; **HP-watch still does not call it** (**13419**). |
| Flee | **19297** → death | **18959–18976** → `_handlePlayerDeath`. Run confirm unchanged. |
| Intent comment | **16877** | **16530–16534** (empty block). |
| Family 30% roll | **6525–6537** | **5940–5952**. Battle start still overwrites `sp`/`sr`/`init`/`res`/`chc` via `computeEnemyStats` (**12007–12018**). |
| Shop mint | 60s `processPendingPurchases` | **GameKey.** Canister auto-complete is empty; `processPendingPurchases` returns **0**. Live credit: `DokaGameKeyShop` → `redeemGameKeyThroughPersist` (**178**). WX remount still calls the no-op credit helper (**1459**). |
| Purchase PII | Address / proof URL on `PurchaseRecord` | Plus **`GameKeyRequest.email`**, `redeemedBy` principal text, `adminGetGameKeyReveal` plaintext code. Legacy `PurchaseRecord` KYC fields remain on the type. |
| `getAdminAuditLog` | Motoko only (`CANISTER_UNBOUND`) | **Bound** in `backend.ts` **873 / 2465**. AdminDashboard still has **no** caller. Ops ring, not gameplay telemetry. |
| `ownedSpells` | Catalog grant | Unchanged policy (`WX` **2373–2401**; `adminSafety.ts` **551–558**). Not discovery. |
| Recap dismiss | Instrumentable `onClose` | Still: Escape **68**, backdrop **95**, Enter/Space **99** (`PostBattleRecap.tsx`). |
| Identifiable dumps | Leaderboard, OQL, `getAllCharacters` | Same, **plus** OQL `gameKeyRequests` with **email**. `getAllCharacters` **529–534**. `getLeaderboard` **3325**. OQL `include Expose` **3433**. |
| Enemy summoner roll | Not called out | Live at battle start (**12047–12057**): `ENEMY_SUMMONER_CHANCE_BASE + level * PER_LEVEL_ZONE` (`gameConstants.ts` **298–299**). Count this; do not invent `elite_patrol`. |
| Unpaid death replay | Pending localStorage | `flushPendingDeathPenalty` / `resolvePendingDeathReplay` (`deathPenalty.ts` **442+**, **572+**). Quality increment **after** the replay write, off the lock. |
| World features / formations / observe→win | Not wired | Still **not** imported by `WorldExploration.tsx`. |
| Admin tabs | Config CRUD | Unchanged (`gameTypes.ts` **483–498**). Purchases tab renders `AdminGameKeyPurchases` (fulfillment, emails). **No `intelligence` / Health.** |
| `APP_VERSION` | v163 | Still **v163**. |
| Import / stack gate | Caffeine import | Plus oldest-first open-PR stack (`scripts/open-pr-stack-compat.sh`). Open **#259** is GameKey EOP migration — do not hitchhike telemetry maps onto that Motoko PR. |

Merged since `dd275aa`: persist/combat/map PRs, GameKey shop (#258), stack-compat CI. **No increment sidecar shipped.** Prior telemetry PRs remain docs only (#130 architecture, #119 dashboard, #122 balance).

---

## 2. Current state (evidence)

| Surface | What exists | Why it is not telemetry |
| :--- | :--- | :--- |
| `src/frontend/src/debug/debugLogger.ts` | Local ring buffer (`DEBUG_BUFFER_CAP` **2000**, **44** / **105–111**). Shift+D. Console dev-only. | Session-local. Not aggregated. |
| `debug/clickTrace.ts` | Click-geometry ring, cap **20**. | Dev-only. Never a production funnel. |
| `WX` **16530–16534** | Empty “caller-side telemetry” around `action.intent`. | No emit. |
| `data/pieceArt.ts` **40–55**, **867+** | Throttled `logPatternLookupFailed` → `king.front`. | Local `SUMMON` log. |
| `handleBattleEnd` catch **12739** | `"Reward persistence failed (non-blocking)"`. Recap already shown. | Fail-open **pattern**, not a counter. |
| `getLeaderboard` (`main.mo` **3325**) | Top 50: `principalId`, `playerName`, `level`, `killCount`, `achievementsCompleted`. | Identifiable game feature. **Do not reuse as Intelligence.** |
| `getAllCharacters` (`main.mo` **529**) | Full slots + names + principals. Unused by AdminDashboard. | Identifiable dump. **Phase 0 must scan server-side and return buckets only.** |
| OQL `Expose` (`main.mo` **3433**) | `characterSlots` / `dokaBalances` / `userProfiles` / `dungeonRecords` / **`gameKeyRequests` (email)** `ownedBy` owner. | Controller can list principals and **emails**. **Do not add a telemetry entity with an owner column.** |
| `PurchaseRecord` (`types/admin.mo` **202–217**) | Name, email, address, postal, proof URL. | Legacy IAP. **Never join into gameplay analytics.** |
| `GameKeyRequest` (**221–234**) | Email, consent, euro hint, status, `redeemedBy`. | Fulfillment only. Intelligence = **status counts**, never email/code. |
| `GameKeyLedgerEntry` (**237–242**) | Keyed by plaintext GameKey. | **Never query from Intelligence.** `adminGetGameKeyReveal` is copy-once ops. |
| `chatMessages` (`main.mo` **2539**) | In-memory, cap 200, dropped on upgrade. `sendMessage` binds `playerName` from `userProfiles` (**2545 / 2580**). | **Do not collect message content.** |
| Admin dashboard | Same CRUD tabs; Purchases = GameKey inbox. | Catalog + fulfillment. Not battle outcomes. |
| `useSaveKillCount` | `useLeaderboardQueries.ts` **43–51**. | **Zero TSX callers.** `killCount` is not battle count. |
| `longHorizonSim.ts` **516–520** | `telemetry.available: false`. | Correct. Do not calibrate from source. |
| `calculateAndAwardDoka` (`main.mo` **3008–3011**) | Always `0`. | Not a mint. Do not chart. |
| `adminVisualStatus.ts` | Documents world never loads `spriteUrl`. | Empty URL = `NORMAL_DEFAULT`, not `CUSTOM_FALLBACK`. |
| Quality audit `AQA-2026-08-30-012` | persist-ok/fail, victory paid, death-penalty, recap open/dismiss, shop credit. | Still unimplemented. Shop credit **site** is now GameKey redeem. |

**Authoritative stores usable as *snapshot* aggregates (not battle logs):**

| Store | Key today | Snapshot signal (aggregate only) |
| :--- | :--- | :--- |
| `characterSlots` | Principal → 3 slots | Level histogram, pieceType mix, leftover XP, killCount **buckets** |
| `dokaBalances` | Principal → Nat | Wallet-size histogram (no identity) |
| `achievementProgress` | `"principal#achievementId"` | Unlock / claim counts **by achievementId** (strip prefix) |
| `dungeonRecords` | Principal | Depth / maps-completed / best-multiplier histograms |
| `bossRushStates` | `"principal#slot"` | `highestRoomCompleted` / `totalBossRushRuns` histograms |
| `gameKeyRequests` | Request id | **Counts by `status` only** (pending/approved/redeemed/rejected). Never email. |
| `spellConfigs` / `enemyConfigs` | Text id | Catalog validity |
| Writer `#ok` / `#err` | Per call | Quality counters **if** the client increments **after** the result, off the lock |

Combat, casts, flee, modifiers, and shrines are **client-orchestrated**. The canister never sees a battle start.

**Existing event sources (observe these; do not invent parallel writers):**

| Outcome | Where it already happens |
| :--- | :--- |
| Battle start | `WX` **12212–12214** `setInBattle(true)` + `onDebugLog("BATTLE_START")` |
| Victory | `handleBattleEnd(true)` **12377**; recap first **12645**; persist in `try/catch` **12739** |
| Defeat (non-death) | `handleBattleEnd(false)` **12748** (rare vs HP-watch / `_handlePlayerDeath`) |
| Combat / DoT / flee death | `_handlePlayerDeath` **13360**. Flee **18976** calls this. |
| Lava / spike death | HP-watch **13412+** — still **does not** call `_handlePlayerDeath` |
| Death persist | `persistDeathPenalty` → `saveBattleStats` (20% XP / 40% Doka) |
| Unpaid death replay | `flushPendingDeathPenalty` (`deathPenalty.ts` **572**) before heal/shop/`applyRewards`/upgrade |
| Boss Rush room | `persistBossRushRewardsThroughLock` + `applyRewards` on the persist lock |
| Dungeon step | `snapshotDungeonChain` **before** `cleanupMap` (**6381**), then `decideDungeonChainPortal` (**6386**) |
| Challenge complete | `isChallengeCompleted` inside `handleBattleEnd` (`challengeCompletion.ts` ids `easy_1`…`legendary_3`) |
| Spell cast | `executeCastAttempt` / `resolvePlayerCast` / Attack Nearest — `SpellConfig.id` |
| Enemy AI | `decideEnemyAction` → `EnemyAction.archetype` + `kind`. Local TURN log only. |
| Family variant | `generateEnemies` 30% roll **5940–5952**; `family` kept then stats overwritten at battle start |
| Summoner roll | Battle start **12047–12057** |
| Pattern fallback | `drawCombatant` → `king.front` + throttle |
| Recap dismiss | `PostBattleRecap` `onClose` |
| Reward persist fail | catch **12739** / Boss Rush **12990** (non-blocking) |
| Shop mint | `redeemGameKeyThroughPersist` after `#ok` **and** `shouldCommitShopCredit` |

---

## 3. Non-negotiable rules

Telemetry must **never**:

1. Become authoritative gameplay state (HP, AP, MP, XP, Doka, spell levels, dungeon depth, boss-rush room).
2. Enqueue on `createProgressPersist` (credits and `saveBattleStats` already share that lock).
3. Block combat, persistence, map loading, rewards, or the economy.
4. Be required for a normal session (missing increment = gameplay continues).
5. Collect chat / message text, purchase customer fields, GameKey **email / codes / redeemedBy**, pixel patterns, `uiLayout`, click traces, or per-player behavioural timelines.
6. Expose principals, display names, or character names on the Intelligence tab.
7. Download `getAllCharacters` / OQL owner rows / `getLeaderboard` / `adminListGameKeyRequests` into the Intelligence UI and “aggregate in the client.”
8. Touch the RAF loop, map generation, turn-order math, or damage formulas.

**Fail open.** Swallow telemetry exceptions. A full increment map is not a reason to skip `applyRewards`. If the sidecar is down, the game is unchanged.

**Privacy default:** increment a **bounded key** (`metricId` + coarse dimension + optional UTC day). Never store a row per player per event.

### 3.1 Correcting `AQA-2026-08-30-012` (still in force)

The Quality Auditor asked for the right *counters* but wrote: they “must enqueue on `createProgressPersist` or be query-only.”

| Allowed | Forbidden |
| :--- | :--- |
| Phase 0 **query-only** bucket scans | Enqueue increments **on** the persist lock |
| Fire-and-forget increment **after** the persist function returns | A second wallet / XP writer |
| Swallow increment failures | Block `applyRewards` / `saveBattleStats` / `redeemGameKey` if telemetry fails |

### 3.2 Shop-credit correction (new this run)

| Allowed increment site | Forbidden increment site |
| :--- | :--- |
| After `redeemGameKeyThroughPersist` returns with `shouldCommitShopCredit(gained)` | `creditPendingPurchasesThroughPersist` remount (`WX` **1459**) — canister always returns 0 |
| Query-time count of `gameKeyRequests` by `status` | Storing email, euro hint as a player id, or GameKey text |
| `quality.shop.redeem_fail` with enum reasons (`invalid\|already_used\|not_approved\|short\|other`) | Raw `err` strings (may echo ops copy) |

---

## 4. Recommended architecture (sidecar) — unchanged

```
Gameplay (authoritative)
  WorldExploration / persist helpers / applyRewards / saveBattleStats / redeemGameKey
        │
        │ after outcome is already decided
        │ fire-and-forget — do not await on the persist lock
        ▼
Client sidecar  (new module, e.g. utils/telemetrySidecar.ts — not implemented here)
  - in-memory queue, drop-oldest on overflow (e.g. 64 batches)
  - coalesce identical keys in the same flush
  - sample flags decided once per session (not per click)
  - payload: [(key: Text, n: Nat)] only
        │
        │ actor.recordTelemetryIncrements(batch)
        │ .catch(() => {})
        ▼
Canister  (new maps on canonical src/backend/main.mo — not OQL-owned)
  telemetryLifetime : Map<Text, Nat>
  telemetryDay      : Map<Text, Nat>     // key = "YYYY-MM-DD|metric|dim…"
  telemetryDayEpoch : Nat                // prune keys older than retention
        │
        │ admin-only query
        ▼
adminGetTelemetrySnapshot() → { lifetime, days, generatedAt }
adminGetProgressionSnapshot() → { buckets only }   // Phase 0, no principals
        │
        ▼
AdminDashboard tab "intelligence"  (isAdmin && #admin on canister)
  carved-stone / slate / crimson
  charts + tables of aggregates only
  empty state if maps are empty — never paint a zero that looks like “zero battles”
```

### 4.1 Why not OQL / leaderboard / getAllCharacters / GameKey inbox / debug export

- **OQL** returns `owner` principals and now **emails** on `gameKeyRequests`.
- **`getLeaderboard`** is a player-facing top-50 with `principalId`.
- **`getAllCharacters`** is an admin dump of every name and slot.
- **`adminListGameKeyRequests` / `adminGetGameKeyReveal`** are fulfillment tools (Purchases tab).
- **`getAdminAuditLog`** is a last-100 **ops** ring with `adminPrincipal`. Dashboard Health H14 may count `action` after bindgen; Intelligence gameplay charts must not dump principals.
- **Debug overlay / click-trace / SPELLBAR-BISECT** stay local.

### 4.2 Increment API (design)

```
recordTelemetryIncrements(increments: [(Text, Nat)]) : async ()
```

- Authenticated `#user` or `#admin` may increment (otherwise only admins generate data).
- **No principal is stored.** Add `n` to `lifetime[key]` and `day[today|key]`.
- Reject silently (still `()`) if: anonymous; batch `> 32` keys; any key `> 96` bytes; unknown prefix (allow-list `combat.`, `spell.`, `enemy.`, `prog.`, `content.`, `quality.`); day-map over a hard cap (drop new day keys, keep lifetime).
- **Never trap.** Never return `#err` the client must handle.
- **Never read or write** `dokaBalances`, `characterSlots`, spell levels, run records, `gameKeyLedger`, or `gameKeyRequests` rows.

Client: call **after** recap is shown / death penalty applied / persist `try` settled / GameKey redeem returned. Spell **ids**, not names. Coarse buckets for HP, turns, level delta.

### 4.3 Aggregation, sampling, retention, cost

| Class | Volume | Sampling | Retention |
| :--- | :--- | :--- | :--- |
| Quality / persist | Rare | **100%** | Lifetime + 28 UTC days |
| Battle outcomes | ~1 set per battle | **100%** | Lifetime + 28 UTC days |
| Content funnel | ~1 per portal / offer | **100%** | Lifetime + 28 UTC days |
| GameKey redeem | Rare | **100%** (ok/fail enums) | Lifetime + 28 UTC days |
| Spell / enemy casts | Many per battle | **Per-battle unique-set** of ids. If still large, session sample 25%. | Lifetime + 28 UTC days |
| AI archetype | Per enemy turn if raw | **Per-battle unique**, or 10% of battles | 14 UTC days |
| Visual fallback | Per draw if unthrottled | **Session-once per `pieceType\|view`**, matching existing 1 + every-500 log | Lifetime |

**Key cardinality budget:** catalog-sized dimensions only — `spellId`, `pieceType`, `EnemyFamily` enum, `bossId`, `challengeId`, `modifierType`, `deathCause` enum, `achievementId`, GameKey `status` enum. No free-text. No map ids that include player names. No emails. No GameKeys.

**Do not store raw event logs on the canister.**

### 4.4 Phased rollout (unchanged order)

| Phase | What ships | Why first |
| :--- | :--- | :--- |
| **0 — Snapshot aggregates** | `#admin` queries that scan existing maps and return **buckets only**. No combat writes. Optional: GameKey **status histogram** (no email). | Immediate population signal. Zero persist-lock risk. |
| **1 — Outcome + quality increments** | Sidecar + `recordTelemetryIncrements` + persist ok/fail, victory paid, death penalty, recap open/**dismiss**, **GameKey redeem committed**, battles started / victory / defeat / flee. | Answers AQA-012 with a live shop site. Fail-open. |
| **2 — Combat / spell / enemy / content dimensions** | Turns, remain-HP, death cause, family W/L, level-delta, summoner roll, spell unique-set, dungeon/rush/challenge/modifier. | Balancing. |
| **3 — Optional diagnostics** | Pattern-fallback, invalid-config, sampled AI archetype, capped pairwise co-occurrence. | Only after Phase 1 is proven off the lock. |

**Do not implement a per-player profile store.**

**Motoko note:** open PR **#259** (EOP GameKey stables) owns the live migration path. A telemetry `Map<Text, Nat>` needs its **own** human-approved migration / empty-canister baseline — do not sneak it into #259.

---

## 5. Privacy model

| Allowed | Forbidden |
| :--- | :--- |
| `combat.outcome.victory` += 1 | `combat.outcome.victory.{principal}` |
| `combat.death_cause.lava` += 1 | Chat / whisper / battle-log text |
| `spell.used.{spellId}` += 1 | Spell *name* strings as keys |
| `prog.level_bucket.10_14` += N (snapshot) | Character name, display name, `uiLayout` |
| `quality.persist.apply_rewards.fail` += 1 | Error strings that include principals |
| `quality.shop.redeem_ok` += 1 | GameKey plaintext, email, `redeemedBy` |
| `content.gamekey.status.redeemed` snapshot count | Joining Purchases tab rows into Intelligence |
| Achievement counts by `achievementId` | Purchase KYC / proof URL |
| `pieceType` / `EnemyFamily` enums | Pixel pattern JSON, custom colors, player sprite URLs |
| Pairwise “spell A and B in same battle unique-set” (Phase 3, capped) | Ordered n-grams, session timelines, named-player heatmaps |

**Existing identifiable surfaces (do not expand; do not feed Intelligence):**

1. `getLeaderboard.principalId`
2. `getAllCharacters` principals + `Character.name`
3. OQL `characterSlots.owner` / `userProfiles.name` / **`gameKeyRequests.email`**
4. `PurchaseRecord` customer fields
5. `adminGetGameKeyReveal` / `gameKeyLedger` keys
6. Admin ban list and `getAdminAuditLog.adminPrincipal` (ops, not Intelligence)
7. Debug overlay buffer (local)
8. Purchases tab (`AdminGameKeyPurchases`) — fulfillment UI with emails

**Intelligence tab rule:** if a cell would let an owner single out one player without a separate, gated debug tool, it does not ship.

---

## 6. Metric catalog

STATUS is **PROPOSED** for every row (none implemented).  
`EVENT_SOURCE` is the *existing* gameplay site to observe — not a new authoritative writer.  
Metric IDs `GTAD-C-001`… are **stable** from 2026-08-31; rows marked **NEW 2026-09-01** or **NEW 2026-09-02** are additive.

### 6.1 Combat

METRIC_ID: GTAD-C-001  
NAME: Battles started  
PURPOSE: Denominator for win/loss, flee, and length rates.  
EVENT_SOURCE: `WorldExploration.tsx` **12212–12214** after `setInBattle(true)` / `onDebugLog("BATTLE_START")`. One increment per successful battle commit, including Boss Rush rooms. Do not double-count the 2s safety `setInBattle(true)` at **12285**.  
AGGREGATION: Lifetime + daily counter. Optional dim: `mode=explore|dungeon|boss_rush|boss`.  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Is content producing enough fights? Did a patch collapse encounter rate?  
PERFORMANCE_COST: Negligible (one increment per battle).  
PRIVACY_RISK: Low (no identity).  
IMPLEMENTATION_COMPLEXITY: Low.  
STATUS: PROPOSED  

METRIC_ID: GTAD-C-002  
NAME: Victories  
PURPOSE: Win count; pair with C-001 for win rate.  
EVENT_SOURCE: `handleBattleEnd(true)` after recap is queued (**12645**), **not** inside `resolveBattleRewards`. Boss Rush: after recap is shown in the room-clear path, still **after** persist returns for “victory paid.”  
AGGREGATION: Counter; dim `mode`.  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Difficulty health; whether a balance patch moved win rate.  
PERFORMANCE_COST: Negligible.  
PRIVACY_RISK: Low.  
IMPLEMENTATION_COMPLEXITY: Low.  
STATUS: PROPOSED  

METRIC_ID: GTAD-C-003  
NAME: Combat defeats  
PURPOSE: Losses that went through death / Game Over (not lava-only exploration death).  
EVENT_SOURCE: `_handlePlayerDeath` **13360** when `inBattleRef` is true **and** the caller is not the flee button.  
AGGREGATION: Counter; dim `mode`.  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Combat difficulty vs hazard difficulty (see C-007).  
PERFORMANCE_COST: Negligible.  
PRIVACY_RISK: Low.  
IMPLEMENTATION_COMPLEXITY: Medium — must tag the caller (flee vs combat vs DoT) without changing death math. The linchpin comment is still slightly wrong: HP-watch is a second entry (**13419**).  
STATUS: PROPOSED  

METRIC_ID: GTAD-C-004  
NAME: Flees  
PURPOSE: Distinguish “I quit this fight” from “I died”. Flee **is** death (`onEndBattle` **18976** → `_handlePlayerDeath`).  
EVENT_SOURCE: `onEndBattle` confirm path, **before** `_handlePlayerDeath`. Still apply the existing death penalty — telemetry does not change that.  
AGGREGATION: Counter; dim `mode`.  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Soft difficulty / frustration; whether run flees are too common.  
PERFORMANCE_COST: Negligible.  
PRIVACY_RISK: Low.  
IMPLEMENTATION_COMPLEXITY: Medium (discrete tag on a shared death function; do not fork persist).  
STATUS: PROPOSED  

METRIC_ID: GTAD-C-005  
NAME: Battle length (turn buckets)  
PURPOSE: Histogram so one 80-turn fight cannot dominate.  
EVENT_SOURCE: `challengeTurnCountRef` / `battleTurn` at `handleBattleEnd` or death. Opening player turn is already counted (`shouldCountOpeningPlayerTurn` at **12254–12259**).  
AGGREGATION: Counters `combat.turns.1_5|6_10|11_15|16_25|26_plus`.  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Challenge `under_N_turns` tuning; stall / AI-skip bugs.  
PERFORMANCE_COST: Negligible.  
PRIVACY_RISK: Low.  
IMPLEMENTATION_COMPLEXITY: Low.  
STATUS: PROPOSED  

METRIC_ID: GTAD-C-006  
NAME: Remaining HP at victory (buckets)  
PURPOSE: How close victories are.  
EVENT_SOURCE: `characterStats.hp` / `maxHp` on the victory branch only.  
AGGREGATION: `combat.remain_hp.1|2_10pct|11_25|26_50|51_75|76_100`. Dedicated `1` bucket for `survive_1hp`.  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Boss / elite HP and player resilience.  
PERFORMANCE_COST: Negligible.  
PRIVACY_RISK: Low.  
IMPLEMENTATION_COMPLEXITY: Low.  
STATUS: PROPOSED  

METRIC_ID: GTAD-C-007  
NAME: Death causes  
PURPOSE: Split combat vs DoT vs hazard vs flee.  
EVENT_SOURCE: Tag both entry points. Flee **18976**; lava/spike HP-watch **13412+**; combat/DoT via `_handlePlayerDeath` callers. Enum only: `combat_melee|combat_spell|dot|lava|spikes|flee|other`.  
AGGREGATION: Counter per enum.  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Hazard damage vs combat tuning; Death Realm frequency.  
PERFORMANCE_COST: Negligible.  
PRIVACY_RISK: Low. Do not attach map seeds or coordinates.  
IMPLEMENTATION_COMPLEXITY: Medium (thread `DeathCause` into **two** entry points; do not change `persistDeathPenalty`).  
STATUS: PROPOSED  

METRIC_ID: GTAD-C-008  
NAME: Enemy-family win / loss  
PURPOSE: Which `pieceType` / `EnemyFamily` / config ids are stomping or being stomped.  
EVENT_SOURCE: Battle-start roster (`pieceType`, `family` if not `default`/`""`, optional `enemyConfig.id`) + outcome. Prefer closed enums over assigned display names.  
AGGREGATION: `combat.family.{family}.win|loss` += 1 per battle that contained that family (not per corpse).  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Enemy / kit / tier-spawn edits. **Caveat:** battle start overwrites family `sp`/`sr`/`init`/`res`/`chc` (`WX` **12007–12018**). Family HP/damage from the 30% roll can still be live; do not treat family W/L as proof the overwritten rows are live.  
PERFORMANCE_COST: Low (≤ families-on-map increments).  
PRIVACY_RISK: Low if names are excluded.  
IMPLEMENTATION_COMPLEXITY: Medium.  
STATUS: PROPOSED  

METRIC_ID: GTAD-C-009  
NAME: Relative enemy-level difference  
PURPOSE: Validate `TierSpawnConfig` (same / adjacent / two-away / 3+).  
EVENT_SOURCE: At battle start, `round(mean(enemy.level) - player.level)` (summons excluded).  
AGGREGATION: `combat.level_delta.le_neg3|neg2|neg1|0|pos1|pos2|ge_pos3`.  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Tier percents in Admin → Enemy Tiers.  
PERFORMANCE_COST: Negligible.  
PRIVACY_RISK: Low.  
IMPLEMENTATION_COMPLEXITY: Low.  
STATUS: PROPOSED  

METRIC_ID: GTAD-C-010  
NAME: Leader / elite completion  
PURPOSE: `isLeader` + `leader_slayer` (`battleLeaderSlainRef`).  
EVENT_SOURCE: Battle end: leader present vs leader slain.  
AGGREGATION: `combat.leader.present|slain|escaped`.  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: `AdminGameConfig.leaderBoostPercent`.  
PERFORMANCE_COST: Negligible.  
PRIVACY_RISK: Low.  
IMPLEMENTATION_COMPLEXITY: Low.  
STATUS: PROPOSED  

METRIC_ID: GTAD-C-011  
NAME: Boss completion  
PURPOSE: Per-boss clear vs fail.  
EVENT_SOURCE: Victory with `currentBossConfigRef`; death/flee while a boss is active; Boss Rush room index 0–9 via room-clear persist.  
AGGREGATION: `combat.boss.{bossId}.win|fail`; `content.boss_rush.room.{n}.clear|fail`.  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Boss HP/phases; jackpot room 9 economy.  
PERFORMANCE_COST: Negligible.  
PRIVACY_RISK: Low (config ids, not player names).  
IMPLEMENTATION_COMPLEXITY: Low.  
STATUS: PROPOSED  

METRIC_ID: GTAD-C-012  
NAME: Abnormal battle termination  
PURPOSE: Cleanup / generation-guard / concurrent-end paths that are not a clean victory, death, or flee.  
EVENT_SOURCE: `handleBattleEnd` `deathTriggered` early return (**12391**); `cleanupBattle` while `inBattleRef` without an outcome increment; persist catch that still showed a recap (**12739**).  
AGGREGATION: `quality.battle.abort.{gen_guard|cleanup_orphan|reward_compute_err}`.  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Whether a combat patch increased orphaned fights.  
PERFORMANCE_COST: Negligible.  
PRIVACY_RISK: Low. No stack traces with principals.  
IMPLEMENTATION_COMPLEXITY: Medium.  
STATUS: PROPOSED  

### 6.2 Spells

METRIC_ID: GTAD-S-001  
NAME: Spell usage (player)  
PURPOSE: Which catalog ids are actually cast.  
EVENT_SOURCE: Successful spend paths only: `castResultSpendsAp` true (`cast` \| `fizzled` \| `summon`) on canvas + Attack Nearest. Key = `SpellConfig.id`, never `name`.  
AGGREGATION: **Per-battle unique-set** `spell.used.{spellId}` += 1, plus optional `spell.casts.{spellId}` += N if session sample allows.  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Dead spells vs dominant spells; Admin → Spells.  
PERFORMANCE_COST: Low if unique-set; medium if every cast is sent. Prefer unique-set.  
PRIVACY_RISK: Low at unique-set. Medium if sequences are stored — **do not store sequences**.  
IMPLEMENTATION_COMPLEXITY: Medium (increment a `Set` on the battle object, flush at end — **not** in the RAF / targeting hot path).  
STATUS: PROPOSED  

METRIC_ID: GTAD-S-002  
NAME: Casts per battle  
PURPOSE: Action density; AP-challenge context.  
EVENT_SOURCE: Same spend counter as S-001, flushed as a bucket.  
AGGREGATION: `spell.casts_per_battle.0|1_3|4_8|9_15|16_plus`.  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Whether fights are “one big dump” vs attrition.  
PERFORMANCE_COST: Negligible.  
PRIVACY_RISK: Low.  
IMPLEMENTATION_COMPLEXITY: Low (given S-001 set).  
STATUS: PROPOSED  

METRIC_ID: GTAD-S-003  
NAME: Catalog reach (not drop-discovery)  
PURPOSE: There is **no** persisted spell-drop / first-seen store. `ownedSpells` (`WX` **2373–2401**) = starters ∪ backend rows with `usableByPlayer !== false` (or already on `spellLevelKeys` / `spellBarOrder`). `minLevel` is catalog metadata only. SDA-002 (owned/observed ids) is design-only.  
EVENT_SOURCE: **Do not invent a drop system.** (a) Phase 0 — characters with `level >= spell.minLevel` vs catalog; (b) Phase 2 — first **equip** (`setSpellBarOrder` / `saveActiveSpells`) or first unique-set use (S-001).  
AGGREGATION: `spell.reach.{spellId}.eligible_snapshot` and/or `spell.first_equip.{spellId}`.  
RETENTION: Snapshot is live; first-equip counters lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Whether high-`minLevel` spells are ever equipped.  
PERFORMANCE_COST: Snapshot is an admin query. First-equip is one increment.  
PRIVACY_RISK: Low if only ids.  
IMPLEMENTATION_COMPLEXITY: Medium (document the lack of a real discovery pipeline).  
STATUS: PROPOSED  

METRIC_ID: GTAD-S-004  
NAME: Unlock source (coarse)  
PURPOSE: If a later content patch adds drops/shrines, tag source then. Until then only `starter|catalog|unknown`.  
EVENT_SOURCE: Starter list vs backend catalog vs future drop hook. **No chat, no NPC dialogue.** Do not implement SDA observe→win solely to feed this metric.  
AGGREGATION: `spell.source.{source}.{spellId}` only after a real unlock event exists.  
RETENTION: 28 days.  
OWNER_DECISION_SUPPORTED: Future drop-table design.  
PERFORMANCE_COST: Negligible.  
PRIVACY_RISK: Low if sources stay an enum.  
IMPLEMENTATION_COMPLEXITY: High *if* a discovery system is built; **do not build it for telemetry alone**.  
STATUS: PROPOSED  

METRIC_ID: GTAD-S-005  
NAME: Rarely used spells (derived)  
PURPOSE: Catalog hygiene.  
EVENT_SOURCE: Derived: S-001 / C-001 vs `getSpellConfigs` (`usableByPlayer`, `minLevel`).  
AGGREGATION: Query-time list: 0 unique-set uses in the window (or below 2% of C-001).  
RETENTION: Derived; no extra store.  
OWNER_DECISION_SUPPORTED: Hide, buff, or rewrite dead spells.  
PERFORMANCE_COST: None at runtime.  
PRIVACY_RISK: None.  
IMPLEMENTATION_COMPLEXITY: Low (dashboard query).  
STATUS: PROPOSED  

METRIC_ID: GTAD-S-006  
NAME: Spell co-occurrence (not sequences)  
PURPOSE: Which two ids appear in the same battle unique-set.  
EVENT_SOURCE: Same unique-set as S-001. Canonical pairs (`idA<idB`) only if set size is 2–8. **No ordered n-grams.**  
AGGREGATION: `spell.pair.{idA}_{idB}` += 1. Cap: pairs involving at least one non-starter, or top-N by use.  
RETENTION: 14 days (higher cardinality).  
OWNER_DECISION_SUPPORTED: Accidental dominant combos.  
PERFORMANCE_COST: Medium (O(k²) if unbounded — **must cap**).  
PRIVACY_RISK: Medium in a small population — mitigate with pair cap + no principal.  
IMPLEMENTATION_COMPLEXITY: High. **Phase 3 only.**  
STATUS: PROPOSED  

METRIC_ID: GTAD-S-007  
NAME: Enemy spell usage  
PURPOSE: Whether enemy kits / boss `spellPoolIds` are firing.  
EVENT_SOURCE: WX `action.kind === "cast"` after **16538**; boss AI casts. Unique-set per battle.  
AGGREGATION: `spell.enemy_used.{spellId}`.  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Enemy/boss kit edits.  
PERFORMANCE_COST: Low (unique-set flush).  
PRIVACY_RISK: Low.  
IMPLEMENTATION_COMPLEXITY: Medium.  
STATUS: PROPOSED  

METRIC_ID: GTAD-S-008  
NAME: Fizzles  
PURPOSE: `spellFailBaseChance` vs frustration.  
EVENT_SOURCE: Cast result `"fizzled"` (already spends AP).  
AGGREGATION: `spell.fizzle.{spellId}` and/or a global fizzle bucket.  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Level-up fail-chance table.  
PERFORMANCE_COST: Negligible.  
PRIVACY_RISK: Low.  
IMPLEMENTATION_COMPLEXITY: Low.  
STATUS: PROPOSED  

METRIC_ID: GTAD-S-009  
NAME: Spell upgrades  
PURPOSE: Economy + upgrade cost curve (`spellLevelingBaseCost * 2^level`).  
EVENT_SOURCE: After `upgradeSpell` `#ok` in `persistSpellUpgrade` — **after** the persist-lock write commits. Debit is canister cost, not the 10× UI sticker.  
AGGREGATION: `spell.upgrade.{spellId}` += 1; optional `prog.doka_spent.upgrade` += canister cost.  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Whether anyone pays past level 3.  
PERFORMANCE_COST: Negligible.  
PRIVACY_RISK: Low.  
IMPLEMENTATION_COMPLEXITY: Low.  
STATUS: PROPOSED  

METRIC_ID: GTAD-S-010  
NAME: Enemy-only catalog exclusion  
PURPOSE: NEW 2026-09-01. `shouldIncludeBackendSpellInLibrary` hides `usableByPlayer === false` unless already on keys/bar (`adminSafety.ts` **551–558**).  
EVENT_SOURCE: Phase 0 snapshot of catalog `usableByPlayer === false` vs any character `spellLevelKeys` / `spellBarOrder` containing those ids (counts only).  
AGGREGATION: `spell.enemy_only.{spellId}.on_player_bar` snapshot count.  
RETENTION: Live snapshot.  
OWNER_DECISION_SUPPORTED: Whether enemy-only ids leaked onto player bars.  
PERFORMANCE_COST: Admin scan.  
PRIVACY_RISK: Low (ids only).  
IMPLEMENTATION_COMPLEXITY: Low.  
STATUS: PROPOSED  

### 6.3 Enemies

METRIC_ID: GTAD-E-001  
NAME: Encounter frequency  
PURPOSE: How often a family / config appears.  
EVENT_SOURCE: Battle-start roster (same as C-008).  
AGGREGATION: `enemy.encounter.{family_or_configId}`.  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Spawn tables / regions / tier percents.  
PERFORMANCE_COST: Low.  
PRIVACY_RISK: Low.  
IMPLEMENTATION_COMPLEXITY: Low (shared with C-008).  
STATUS: PROPOSED  

METRIC_ID: GTAD-E-002  
NAME: Encounter relative level  
PURPOSE: Same buckets as C-009, tagged by family if key budget allows.  
EVENT_SOURCE: Battle start.  
AGGREGATION: `enemy.level_delta.{family}.{bucket}` or rely on C-009.  
RETENTION: 28 days.  
OWNER_DECISION_SUPPORTED: Tier spawn vs region level bands.  
PERFORMANCE_COST: Low.  
PRIVACY_RISK: Low.  
IMPLEMENTATION_COMPLEXITY: Low.  
STATUS: PROPOSED  

METRIC_ID: GTAD-E-003  
NAME: Victory rate vs family  
PURPOSE: Derived: C-008 win / (win+loss).  
EVENT_SOURCE: Dashboard query.  
AGGREGATION: Derived.  
RETENTION: Derived.  
OWNER_DECISION_SUPPORTED: Nerf/buff a family (with C-008 caveat).  
PERFORMANCE_COST: None at runtime.  
PRIVACY_RISK: None.  
IMPLEMENTATION_COMPLEXITY: Low.  
STATUS: PROPOSED  

METRIC_ID: GTAD-E-004  
NAME: Battle length vs family  
PURPOSE: Which families produce long fights.  
EVENT_SOURCE: C-005 + C-008.  
AGGREGATION: Optional `enemy.turns.{family}.{turnBucket}` — Phase 2, key budget.  
RETENTION: 14 days.  
OWNER_DECISION_SUPPORTED: HP/AI stall.  
PERFORMANCE_COST: Low.  
PRIVACY_RISK: Low.  
IMPLEMENTATION_COMPLEXITY: Medium.  
STATUS: PROPOSED  

METRIC_ID: GTAD-E-005  
NAME: Enemy spell usage  
PURPOSE: Alias of S-007.  
EVENT_SOURCE: Same as S-007.  
AGGREGATION: Same keys (do not duplicate stores).  
RETENTION: Same as S-007.  
OWNER_DECISION_SUPPORTED: Same as S-007.  
PERFORMANCE_COST: None extra.  
PRIVACY_RISK: Low.  
IMPLEMENTATION_COMPLEXITY: None (dashboard grouping).  
STATUS: PROPOSED  

METRIC_ID: GTAD-E-006  
NAME: AI archetype selection  
PURPOSE: `EnemyArchetype` is `caster|healer|charger|flanker|berserker|summoner|generic` (`enemyAI.ts` **79–86**).  
EVENT_SOURCE: `decideEnemyAction` return. **Do not persist `intent` strings.**  
AGGREGATION: Per-battle unique: `enemy.ai.{archetype}`. Sample 10% of battles if needed.  
RETENTION: 14 days.  
OWNER_DECISION_SUPPORTED: AI kit bugs vs intended mix.  
PERFORMANCE_COST: Medium if every turn; low if per-battle unique.  
PRIVACY_RISK: Low (no intent text, no target ids).  
IMPLEMENTATION_COMPLEXITY: Medium. Phase 3.  
STATUS: PROPOSED  

METRIC_ID: GTAD-E-007  
NAME: Family-variant roll  
PURPOSE: The 30% `EnemyFamily` overlay (`WX` **5940–5952**) is a content knob.  
EVENT_SOURCE: Battle-start roster: count units with `family` in the closed enum vs `default`/empty.  
AGGREGATION: `enemy.variant.rolled|default` += 1 per unit (or per battle that contained a roll).  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Whether the 30% roll is actually ~30% after placement / battle-start filters.  
PERFORMANCE_COST: Negligible.  
PRIVACY_RISK: Low.  
IMPLEMENTATION_COMPLEXITY: Low.  
STATUS: PROPOSED  

METRIC_ID: GTAD-E-008  
NAME: Enemy summoner roll  
PURPOSE: NEW 2026-09-02. Battle start flags `isSummoner` with `ENEMY_SUMMONER_CHANCE_BASE + level * PER_LEVEL_ZONE` (`WX` **12047–12057**; `gameConstants.ts` **298–299**).  
EVENT_SOURCE: After the roll loop, count units with `isSummoner` vs not (non-summon hostiles only).  
AGGREGATION: `enemy.summoner.rolled|skipped` += 1 per eligible unit.  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Whether summoner density matches the 0.12 + 0.02×level knob vs feeling rare/spammy.  
PERFORMANCE_COST: Negligible.  
PRIVACY_RISK: Low.  
IMPLEMENTATION_COMPLEXITY: Low. Phase 2 with E-007.  
STATUS: PROPOSED  

### 6.4 Progression

METRIC_ID: GTAD-P-001  
NAME: Approximate player-level distribution  
PURPOSE: Population shape without identities. There is **no level cap**.  
EVENT_SOURCE: **Phase 0 admin snapshot** over `characterSlots` (occupied slots). Buckets `1|2_4|5_9|10_14|15_19|20_plus` (dashboard may raise the top edge). Recommend **all occupied slots**.  
AGGREGATION: Query-time histogram. **Response contains buckets only.**  
RETENTION: Live snapshot (no extra store).  
OWNER_DECISION_SUPPORTED: Content level bands, XP curve `100 * 2^(N-1)`.  
PERFORMANCE_COST: Admin query scan (not on the player path).  
PRIVACY_RISK: Low **if** principals are stripped. High if the query returns `getAllCharacters` rows.  
IMPLEMENTATION_COMPLEXITY: Medium (new admin query; do not reuse `getLeaderboard` or `getAllCharacters` as the wire format).  
STATUS: PROPOSED  

METRIC_ID: GTAD-P-002  
NAME: Level-up rate  
PURPOSE: Progression velocity.  
EVENT_SOURCE: `applyRewards` `#ok` when `newLevel > oldLevel` — increment **after** the persist-lock function returns.  
AGGREGATION: `prog.levelup` += 1; `prog.levelup.to.{bucket}`.  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Whether the XP curve is stalled (`100*2^N` class of bug).  
PERFORMANCE_COST: Negligible.  
PRIVACY_RISK: Low.  
IMPLEMENTATION_COMPLEXITY: Low.  
STATUS: PROPOSED  

METRIC_ID: GTAD-P-003  
NAME: XP sources (coarse)  
PURPOSE: `applyRewards` is untagged on the canister. Client enum at the *call site*, not recap text.  
EVENT_SOURCE: Victory / challenge, portal +10, Boss Rush room, dungeon complete bonus. Not death.  
AGGREGATION: `prog.xp.{victory|challenge|portal|boss_rush|dungeon_bonus}` += 1; optional += clamped XP (cap 50_000).  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Whether portals or challenges dominate XP.  
PERFORMANCE_COST: Negligible.  
PRIVACY_RISK: Low. Do not store per-enemy Doka roll breakdowns (display names).  
IMPLEMENTATION_COMPLEXITY: Low.  
STATUS: PROPOSED  

METRIC_ID: GTAD-P-004  
NAME: Doka earned (coarse)  
PURPOSE: Credit funnel.  
EVENT_SOURCE: `applyRewards` `#ok` sites + `claimAchievementReward` + **`redeemGameKey` `#ok`** (package/status enums only). Do **not** use `processPendingPurchases` (always 0) or `calculateAndAwardDoka` (always 0).  
AGGREGATION: `prog.doka_earned.{victory|challenge|pickup|achievement|shop_gamekey|dungeon_bonus|boss_rush}` += 1 and/or += clamped Nat.  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Economy inflation; jackpot / shop mix.  
PERFORMANCE_COST: Negligible.  
PRIVACY_RISK: Low if shop increments carry no email/code.  
IMPLEMENTATION_COMPLEXITY: Low.  
STATUS: PROPOSED  

METRIC_ID: GTAD-P-005  
NAME: Doka spent (coarse)  
PURPOSE: Sink health. Spends are `upgradeSpell`, `saveBattleStats` (heal/shop/death), `renameCharacter`. BuffShop potions are localStorage inventory after a Doka debit.  
EVENT_SOURCE: After those writers `#ok`, off the lock. Death is `prog.doka_lost.death`, not a chosen sink.  
AGGREGATION: `prog.doka_spent.{upgrade|heal|item_shop|rename}` ; `prog.doka_lost.death`.  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Whether upgrade costs starve other sinks.  
PERFORMANCE_COST: Negligible.  
PRIVACY_RISK: Low.  
IMPLEMENTATION_COMPLEXITY: Low.  
STATUS: PROPOSED  

METRIC_ID: GTAD-P-006  
NAME: Spellbook / bar occupancy  
PURPOSE: `spell_master_8` and empty-bar issues.  
EVENT_SOURCE: Snapshot of `spellBarOrder` length on world hydrate (once per session) or Phase 0 scan.  
AGGREGATION: `prog.bar_slots.0|1_3|4_7|8`.  
RETENTION: Snapshot + optional daily.  
OWNER_DECISION_SUPPORTED: UX of the spell bar vs catalog size.  
PERFORMANCE_COST: Low.  
PRIVACY_RISK: Low.  
IMPLEMENTATION_COMPLEXITY: Low.  
STATUS: PROPOSED  

METRIC_ID: GTAD-P-007  
NAME: Achievement completion  
PURPOSE: Feat difficulty and unclaimed rewards.  
EVENT_SOURCE: Phase 0 scan of `achievementProgress` grouped by `achievementId`: unlocked, claimed, unlocked-unclaimed. Canister still does not check feat conditions (`markAchievementUnlocked` is client-reported). Caption must say so.  
AGGREGATION: `prog.feat.{achievementId}.unlocked|claimed`.  
RETENTION: Live snapshot + optional lifetime increments.  
OWNER_DECISION_SUPPORTED: Dead feats vs trivial ones.  
PERFORMANCE_COST: Admin scan.  
PRIVACY_RISK: Low **without** principalId. Stored key is `"principal#id"` — **strip the prefix**.  
IMPLEMENTATION_COMPLEXITY: Medium.  
STATUS: PROPOSED  

METRIC_ID: GTAD-P-008  
NAME: Piece-type mix  
PURPOSE: Content demand for pawn vs queen starters.  
EVENT_SOURCE: Phase 0 snapshot of `Character.pieceType`.  
AGGREGATION: `prog.piece.{pieceType}` counts.  
RETENTION: Live snapshot.  
OWNER_DECISION_SUPPORTED: Piece art / kit investment.  
PERFORMANCE_COST: Admin scan.  
PRIVACY_RISK: Low.  
IMPLEMENTATION_COMPLEXITY: Low.  
STATUS: PROPOSED  

METRIC_ID: GTAD-P-009  
NAME: Occupied-slot population  
PURPOSE: Quality Auditor could not estimate player count.  
EVENT_SOURCE: Phase 0: count occupied slots and distinct principals **as two numbers**, no lists.  
AGGREGATION: `prog.population.occupied_slots` ; `prog.population.principals` (scalars in the snapshot response).  
RETENTION: Live snapshot.  
OWNER_DECISION_SUPPORTED: Whether the live canister has anyone on it.  
PERFORMANCE_COST: Admin scan.  
PRIVACY_RISK: Low if only two Nats are returned.  
IMPLEMENTATION_COMPLEXITY: Low.  
STATUS: PROPOSED  

METRIC_ID: GTAD-P-010  
NAME: GameKey Doka mint  
PURPOSE: NEW 2026-09-02. Replaces the dead 60s package auto-complete as the **shop earn** series.  
EVENT_SOURCE: After `redeemGameKeyThroughPersist` returns (`shopPurchase.ts` **210–240**; UI `DokaGameKeyShop.tsx` **178**). Increment only when `shouldCommitShopCredit(gained)`.  
AGGREGATION: `prog.doka_earned.shop_gamekey` += 1; optional += min(gained, 100_000). Pair with Q-006 / Q-013.  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Whether paid Doka is actually landing vs stuck pending/approved.  
PERFORMANCE_COST: Negligible.  
PRIVACY_RISK: Low if no email/code.  
IMPLEMENTATION_COMPLEXITY: Low.  
STATUS: PROPOSED  

### 6.5 Content

METRIC_ID: GTAD-N-001  
NAME: Dungeon-chain funnel  
PURPOSE: Enter / progress / complete / abort.  
EVENT_SOURCE: `decideDungeonChainPortal` after snapshot **6381–6388**; abort via `resetRunState` on death.  
AGGREGATION: `content.dungeon.enter|progress|complete|abort`. Optional `content.dungeon.complete_depth.{3|4|5}`.  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Whether the completion bonus (`maxDepth * 50`) is ever reached.  
PERFORMANCE_COST: Negligible.  
PRIVACY_RISK: Low.  
IMPLEMENTATION_COMPLEXITY: Low.  
STATUS: PROPOSED  

METRIC_ID: GTAD-N-002  
NAME: Boss Rush funnel  
PURPOSE: Room clears, aborts, master complete, jackpot room 9.  
EVENT_SOURCE: Room-clear persist success; `resetBossRush` / `abortBossRush`; `bossRushMasterComplete`.  
AGGREGATION: `content.boss_rush.room.{0-9}.clear|fail`; `content.boss_rush.master`; `content.boss_rush.abort`.  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Room 0 farm vs mid-tree drop-off.  
PERFORMANCE_COST: Negligible.  
PRIVACY_RISK: Low.  
IMPLEMENTATION_COMPLEXITY: Low.  
STATUS: PROPOSED  

METRIC_ID: GTAD-N-003  
NAME: Challenge funnel  
PURPOSE: Offered vs accepted vs completed vs failed.  
EVENT_SOURCE: Panel accept + `isChallengeCompleted` at `handleBattleEnd` / room clear. Ids `easy_1`…`legendary_3`.  
AGGREGATION: `content.challenge.{id}.accept|complete|fail`.  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Untouchable / AP-challenge tuning; whether advertised 400–1000 XP is paid.  
PERFORMANCE_COST: Negligible.  
PRIVACY_RISK: Low.  
IMPLEMENTATION_COMPLEXITY: Low.  
STATUS: PROPOSED  

METRIC_ID: GTAD-N-004  
NAME: Map-modifier participation  
PURPOSE: World-event stand-in. Live types include `slime_flood`, `paper_windstorm`, `blood_moon`, `fog_of_war`, `thorned_ground`, `void_rift`, `plague_zone`, `time_warp`, `mirror_field`, …  
EVENT_SOURCE: After modifier roll on portal (`activeMapModifierTypes`).  
AGGREGATION: `content.modifier.{modifierType}.applied`.  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: `triggerChance` on Admin → Map Modifiers.  
PERFORMANCE_COST: Negligible.  
PRIVACY_RISK: Low.  
IMPLEMENTATION_COMPLEXITY: Low.  
STATUS: PROPOSED  

METRIC_ID: GTAD-N-005  
NAME: Rare encounters  
PURPOSE: Jackpot heal, betrayal, double betrayal, leader spawn, ground Doka maps.  
EVENT_SOURCE: Existing refs: `jackpotHealVisible`, `battleBetrayalOccurredRef`, `battleDoubleBetrayelOccurredRef`, `isLeader` spawn, ground Doka pickup. Event **enums**, not story text.  
AGGREGATION: `content.rare.{jackpot|betrayal|double_betrayal|leader_spawn|doka_pickup}`.  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: `dokaSpawnChance`, betrayal percents, jackpot rarity.  
PERFORMANCE_COST: Negligible.  
PRIVACY_RISK: Low.  
IMPLEMENTATION_COMPLEXITY: Low.  
STATUS: PROPOSED  

METRIC_ID: GTAD-N-006  
NAME: Shrine / covenant  
PURPOSE: Shrine rooms are a content beat; covenant buff is still largely `localStorage`.  
EVENT_SOURCE: Existing shrine completion path.  
AGGREGATION: `content.shrine.complete|path_broken`.  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Whether shrine rooms are understood.  
PERFORMANCE_COST: Negligible.  
PRIVACY_RISK: Low. Do not persist covenant flavour text.  
IMPLEMENTATION_COMPLEXITY: Low.  
STATUS: PROPOSED  

METRIC_ID: GTAD-N-007  
NAME: Catalog-only world features (not live)  
PURPOSE: `engine/worldFeatures.ts` lists `elite_patrol` and peers. **No production importer** (WX does not import the module). Formations / observe→win discovery are design-only.  
EVENT_SOURCE: **None today.** Do not increment `content.world_feature.*` until map gen actually applies a feature id.  
AGGREGATION: Deferred.  
RETENTION: n/a.  
OWNER_DECISION_SUPPORTED: Prevents fake “elite patrol completion” charts.  
PERFORMANCE_COST: None.  
PRIVACY_RISK: None.  
IMPLEMENTATION_COMPLEXITY: None (explicit non-metric).  
STATUS: PROPOSED  

### 6.6 Quality

METRIC_ID: GTAD-Q-001  
NAME: applyRewards failure  
PURPOSE: First Quality Auditor gap (`AQA-2026-08-30-012`).  
EVENT_SOURCE: After `readApplyRewardsOk` throws / `#err` — **outside** the persist-lock `enqueue` (existing `catch` **12739**; Boss Rush **12990**).  
AGGREGATION: `quality.persist.apply_rewards.fail` ; optional `reason=banned|anonymous|empty_slot|other` (no raw error text).  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Silent unpaid victories vs canister lag.  
PERFORMANCE_COST: Negligible.  
PRIVACY_RISK: Low if reasons are enums.  
IMPLEMENTATION_COMPLEXITY: Low.  
STATUS: PROPOSED  

METRIC_ID: GTAD-Q-002  
NAME: saveBattleStats failure  
PURPOSE: Death / heal / shop snapshot failures (including unseeded-wallet skip).  
EVENT_SOURCE: `persistDeathPenalty` `#err`; heal/shop snapshot `#err`; `resolveCommittedDokaForAbsoluteWrite` skip.  
AGGREGATION: `quality.persist.save_battle_stats.fail|{unseeded_skip}`.  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Wallet-wipe class bugs.  
PERFORMANCE_COST: Negligible.  
PRIVACY_RISK: Low.  
IMPLEMENTATION_COMPLEXITY: Low.  
STATUS: PROPOSED  

METRIC_ID: GTAD-Q-003  
NAME: Persist success  
PURPOSE: Denominator for Q-001/Q-002.  
EVENT_SOURCE: `#ok` from `applyRewards` / `saveBattleStats` / `upgradeSpell` / `claimAchievementReward` / **`redeemGameKey`** — after commit, off the lock. Not `processPendingPurchases`.  
AGGREGATION: `quality.persist.{writer}.ok`.  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Fail rate.  
PERFORMANCE_COST: One increment per successful persist.  
PRIVACY_RISK: Low.  
IMPLEMENTATION_COMPLEXITY: Low.  
STATUS: PROPOSED  

METRIC_ID: GTAD-Q-004  
NAME: Recap opened  
PURPOSE: Recap is root-mounted (`App.tsx` → `PostBattleRecap`).  
EVENT_SOURCE: `onShowBattleSummary` success (**12645** / room clear).  
AGGREGATION: `quality.recap.opened`.  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Recap vs persist mismatch (shown but unpaid = Q-001).  
PERFORMANCE_COST: Negligible.  
PRIVACY_RISK: Low. Do not store recap enemy-name breakdowns.  
IMPLEMENTATION_COMPLEXITY: Low.  
STATUS: PROPOSED  

METRIC_ID: GTAD-Q-005  
NAME: Recap dismissed  
PURPOSE: UX cancellation. Discrete handlers (`PostBattleRecap.tsx` Escape **68** / backdrop **95** / Enter **99** / Continue → `onClose`).  
EVENT_SOURCE: `onClose` once per recap (dedupe if several UI paths fire). Do not scrape canvas clicks.  
AGGREGATION: `quality.recap.dismissed`.  
RETENTION: 28 days.  
OWNER_DECISION_SUPPORTED: Players skipping recap (heal-under-recap races).  
PERFORMANCE_COST: Negligible.  
PRIVACY_RISK: Low.  
IMPLEMENTATION_COMPLEXITY: Low.  
STATUS: PROPOSED  

METRIC_ID: GTAD-Q-006  
NAME: Shop credit committed  
PURPOSE: Paid Doka actually landed. **Updated 2026-09-02:** this is **GameKey redeem**, not the 60s auto-complete.  
EVENT_SOURCE: After `redeemGameKeyThroughPersist` commit when `shouldCommitShopCredit`. **No email, no code.** Do not increment on WX remount `creditPendingPurchasesThroughPersist` (**1459**) — `processPendingPurchases` returns 0 (`main.mo` **1306–1316**).  
AGGREGATION: `quality.shop.redeem_ok` ; `prog.doka_earned.shop_gamekey` (P-010).  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Broken redeem vs pending-forever GameKey requests.  
PERFORMANCE_COST: Negligible.  
PRIVACY_RISK: Low.  
IMPLEMENTATION_COMPLEXITY: Low.  
STATUS: PROPOSED  

METRIC_ID: GTAD-Q-007  
NAME: Death penalty applied  
PURPOSE: Confirm the 20/40 persist actually ran.  
EVENT_SOURCE: After `persistDeathPenalty` returns without throw.  
AGGREGATION: `quality.death_penalty.ok|fail`.  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Death-Realm / persist races.  
PERFORMANCE_COST: Negligible.  
PRIVACY_RISK: Low. Do not store XP/Doka amounts per player.  
IMPLEMENTATION_COMPLEXITY: Low.  
STATUS: PROPOSED  

METRIC_ID: GTAD-Q-008  
NAME: Invalid content configuration  
PURPOSE: Admin CRUD can save incomplete targeting metadata.  
EVENT_SOURCE: Load-time validation when hydrating spell / enemy / boss configs (missing `targetType` / range / `usableBy*`). Count **config ids**, once per session per id.  
AGGREGATION: `quality.config.invalid.{kind}.{id}`.  
RETENTION: Lifetime.  
OWNER_DECISION_SUPPORTED: Which admin row is unsafe to ship.  
PERFORMANCE_COST: Low (once per hydrate).  
PRIVACY_RISK: Low (admin catalog ids).  
IMPLEMENTATION_COMPLEXITY: Medium.  
STATUS: PROPOSED  

METRIC_ID: GTAD-Q-009  
NAME: Custom visual / sprite load failure  
PURPOSE: Admin-configured URLs (player sprites, enemy `spriteUrl`, ad boxes). World draw is still pixel patterns — **do not count empty URL as CUSTOM_FALLBACK** (`adminVisualStatus.ts`).  
EVENT_SOURCE: `onerror` only when a **non-empty** URL fails. **Do not send the URL.** Send `kind=enemy_sprite|player_sprite|ad_box`. World currently does not fetch these URLs — metric stays dormant until a loader exists.  
AGGREGATION: `quality.visual.load_fail.{kind}`.  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Broken CDN / admin URLs.  
PERFORMANCE_COST: Negligible.  
PRIVACY_RISK: Medium if URLs are logged — **strip URLs**.  
IMPLEMENTATION_COMPLEXITY: Medium (world may not load `spriteUrl` yet).  
STATUS: PROPOSED  

METRIC_ID: GTAD-Q-010  
NAME: Default pixel fallback  
PURPOSE: `drawCombatant` falls back to `king.front` (`pieceArt.ts` **40–55**, **867+**). This is missing `pieceType`/palette — a content bug — not a custom-URL fail.  
EVENT_SOURCE: Same throttle: first occurrence + every 500 per `pieceType|view`.  
AGGREGATION: `quality.visual.pattern_fallback` += 1; optional dim `pieceType` if it is a catalog key.  
RETENTION: Lifetime.  
OWNER_DECISION_SUPPORTED: Missing summon/boss art after a content add.  
PERFORMANCE_COST: Negligible (already throttled).  
PRIVACY_RISK: Low.  
IMPLEMENTATION_COMPLEXITY: Low.  
STATUS: PROPOSED  

METRIC_ID: GTAD-Q-011  
NAME: Spell / layout load failure  
PURPOSE: Existing warn paths: spell state empty defaults, `DraggablePanel` backend layout fail, `ChallengePanel` layout fail.  
EVENT_SOURCE: Those `catch` blocks.  
AGGREGATION: `quality.load.{spells|ui_layout|challenge_layout}.fail`.  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Hydrate flakes vs real canister errors.  
PERFORMANCE_COST: Negligible.  
PRIVACY_RISK: Low. Do not attach `uiLayout` JSON.  
IMPLEMENTATION_COMPLEXITY: Low.  
STATUS: PROPOSED  

METRIC_ID: GTAD-Q-012  
NAME: Sidecar overflow / reject  
PURPOSE: Telemetry health, not gameplay health.  
EVENT_SOURCE: Client queue drop-oldest; canister silent reject (batch > 32, bad prefix, day-map cap).  
AGGREGATION: `quality.telemetry.dropped|rejected`.  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Whether sampling/caps are too tight.  
PERFORMANCE_COST: Negligible. Must also fail open.  
PRIVACY_RISK: Low.  
IMPLEMENTATION_COMPLEXITY: Low (implement with the sidecar).  
STATUS: PROPOSED  

METRIC_ID: GTAD-Q-013  
NAME: GameKey request funnel  
PURPOSE: NEW 2026-09-02. Ops/economy health without opening the Purchases inbox.  
EVENT_SOURCE: Phase 0 scan of `gameKeyRequests` grouped by `status` (`pending|approved|redeemed|rejected`). Optional increments after `requestGameKeyPurchase` / `adminApprove` / `adminReject` / redeem **off the lock**, still no email.  
AGGREGATION: `content.gamekey.status.{status}` counts (snapshot) or lifetime increments.  
RETENTION: Live snapshot + optional 28-day increments.  
OWNER_DECISION_SUPPORTED: Stuck pending pile vs redeem drop-off.  
PERFORMANCE_COST: Admin scan.  
PRIVACY_RISK: Low **if** email / principal / code are stripped. High if OQL `gameKeyRequests` is the wire format.  
IMPLEMENTATION_COMPLEXITY: Low (snapshot) / low (increments).  
STATUS: PROPOSED  

METRIC_ID: GTAD-Q-014  
NAME: Unpaid death replay  
PURPOSE: NEW 2026-09-02. Recent persist work (`flushPendingDeathPenalty`) exists because a failed 20/40 can be overwritten by portal/heal/shop.  
EVENT_SOURCE: After `flushPendingDeathPenalty` (`deathPenalty.ts` **572–588**): `write` success vs fetch-null vs `action !== "write"` clear. Enum only.  
AGGREGATION: `quality.death_replay.{wrote|skipped_clear|fetch_fail}`.  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Whether unpaid-death races still fire in the wild.  
PERFORMANCE_COST: Negligible.  
PRIVACY_RISK: Low. Do not store pending XP/Doka amounts.  
IMPLEMENTATION_COMPLEXITY: Low. Do not add a second penalty writer.  
STATUS: PROPOSED  

---

## 7. Explicitly rejected

| Idea | Why rejected |
| :--- | :--- |
| Per-player battle history / behavioural profile | Surveillance; IC cost. |
| Chat / battle-log text mining | Privacy. Chat is ephemeral. |
| Uploading debug overlay / click-trace | High volume, session geometry, possible ids. |
| Intelligence UI over `getLeaderboard`, OQL owner rows, `getAllCharacters`, or `adminListGameKeyRequests` | Identifiable (now includes **email**). |
| Joining `PurchaseRecord` / GameKey email / ledger codes into gameplay charts | Different purpose (fulfillment). |
| Telemetry **on** `createProgressPersist` | Wallet races. AQA enqueue wording is a hazard. |
| Counting `processPendingPurchases` remount as shop credit | Writer is a stub returning 0. |
| Authoritative “telemetry HP” or server-replay combat | Combat is client-orchestrated. |
| Building spell-drop / observe→win **for** analytics | Inventing gameplay for a metric. |
| Ordered spell n-grams / pathing heatmaps | Fingerprinting; RAF-adjacent. |
| Storing `intent` strings from enemy AI | Free text; local TURN logs. |
| Charts for `worldFeatures` / formations / discovery as if live | Catalog-only. N-007. |
| Painting dashboard zeros as “zero battles” | False. Empty state until Phase 1. |
| Using `killCount` / `useSaveKillCount` as battle count | Hook unused; not an outcome series. |
| Hitchhiking telemetry maps onto PR #259 EOP GameKey migration | Separate human-approved Motoko change. |
| Treating `getAdminAuditLog` as player telemetry | Ops ring with `adminPrincipal`; TADD H14 only, action counts. |

---

## 8. Admin Intelligence tab (UX)

- New tab key `intelligence` on `AdminDashboardState.tab` (lazy-loaded with the rest). Distinct from Purchases (GameKey fulfillment).
- **Backend `#admin` on every read.**
- Carved-stone / dark slate / crimson (`DESIGN.md`).
- Sections: Population (P-001/P-008/P-009), Economy (P-004/P-005/P-010), Combat (C-*), Spells (S-*), Content (N-*), Quality (Q-*).
- Empty state: “No increment sidecar yet — snapshot queries only” until Phase 1. **Never** show `0` battles as if measured.
- No principal search. No “inspect this player.” No GameKey inbox embed.
- Dev raw-key dump only under `import.meta.env.DEV` **and** `#admin`.

---

## 9. Implementation constraints (later agent)

1. Canonical actor only: `src/backend/main.mo`. Do not add maps to `backend_extended/`.
2. Client sidecar **outside** `WorldExploration.tsx` (**19,253** lines). Flush from `rewardResolver`, `deathPenalty`, `bossRushProgress`, `challengeCompletion`, `shopPurchase` (`redeemGameKeyThroughPersist`), `spellUpgrade` **after they return**.
3. Tests: sidecar swallows throws; increment API is **not** a required persist-lock mock; fail-open if `recordTelemetryIncrements` is missing on the mock actor.
4. Bindgen after Candid change (`pnpm bindgen`). Telemetry must not ride on `updateCharacter`. `CharacterStats` stays 12 fields (`main.mo` **144–157**).
5. Import gate: `pnpm typecheck` && `pnpm check`. Motoko / mocks / `.old` → `mops check` or `caffeine check`. Unused locals and hook-deps are **errors**. Also `bash scripts/open-pr-stack-compat.sh --self`.
6. Do not modify RAF, map generation, turn logic, or damage math to “make metrics easier.”
7. Do not call `getAllCharacters`, OQL `execute`, or `adminListGameKeyRequests` from the Intelligence tab.
8. Do not land telemetry stables in the same PR as GameKey EOP (#259) unless a human explicitly combines them.

---

## 10. How sibling automations should consume this

| Automation | Until Phase 0/1 ships | After |
| :--- | :--- | :--- |
| Quality Auditor (`976261d8`) | INCONCLUSIVE. Do **not** require persist-lock enqueue. Shop credit = GameKey redeem, not `processPendingPurchases`. | Cite `quality.persist.*`, `combat.outcome.*`, `quality.death_penalty.*`, `quality.recap.*`, `quality.shop.redeem_*`, `quality.death_replay.*`. Missing increment ≠ regression. |
| Balance / Content Analyst (`2786666f`) | Stay `WAITING_FOR_TELEMETRY`. | Use Phase 2 dimensions; never invent OVERPERFORMING from source. |
| Dashboard Designer (`4b026695`) | Snapshot panels + honest “not measured.” Shop series = GameKey. H14 audit log is ops, not battles. | Bind to `adminGetTelemetrySnapshot` / progression snapshot only. |
| `longHorizonSim` | Keep `telemetry.available = false`. | Flip only when increment/snapshot APIs exist **and** are populated. |
| Expansion / discovery / formations / world-events | Design docs stay design. | Add metric keys only when a persist/event source exists. E-008 summoner roll is live; `elite_patrol` is not. |

Related: `AQA-2026-08-30-012` (still NEW; shop site patched here). `GTAD-2026-09-01-*` remain the implementation tickets; **read this file for line numbers and GameKey rules.** `GTAD-2026-09-02-*` are additive deltas only.
