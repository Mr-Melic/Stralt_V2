# Gameplay telemetry architecture — 2026-08-31

**Director:** Gameplay Telemetry Architecture Director  
**Automation:** `047ac8a1-a4a0-11f1-a7d1-d6b4613131ce` (cron `0 */72 * * *`)  
**HEAD inspected:** `22503b5` (`fix: keep generated maps solvable across seeds (#110)`)  
**Gameplay code:** not modified. This document is design only.

Mandate: owner-facing **aggregate game intelligence** for balancing, debugging, and content decisions. Not individual-player surveillance.

---

## 1. Current state (evidence)

There is **no analytics store, no increment API, and no admin Intelligence tab**.

| Surface | What exists | Why it is not telemetry |
| :--- | :--- | :--- |
| `src/frontend/src/debug/debugLogger.ts` | Local ring buffer (2000 lines). Overlay always reachable (Shift+D). Console is dev-only. | Session-local. Not persisted. Not aggregated. Can hold combatant ids / debug payloads. |
| `src/frontend/src/debug/clickTrace.ts` + `debugExport.ts` | Click-geometry traces, PDF/txt export. | Dev/debug only. Must never become a production funnel. |
| `WorldExploration.tsx` ~16457 | Comment: “caller-side telemetry” around enemy `action.intent`. Empty block. | No emit. |
| `WorldExploration.tsx` ~351–357 | Module-level `[SPELLBAR-BISECT]` counters. | Local debug throttle, not owner metrics. |
| `data/pieceArt.ts` ~40–50 | Throttled `logPatternLookupFailed` (first + every 500). Falls back to `king.front`. | Local `SUMMON` error log only. |
| `handleBattleEnd` ~12797 | `catch` logs `"Reward persistence failed (non-blocking)"`. Recap already shown. | Fail-open persist — the correct *pattern*, not a counter. |
| `getLeaderboard` (`main.mo` ~2527) | Top 50 by level: `principalId`, `playerName`, `level`, `killCount`, `achievementsCompleted`. | Identifiable. Game feature, not analytics. **Do not reuse as an Intelligence API.** |
| OQL `Expose` (`main.mo` ~2620) | `characterSlots`, `dokaBalances`, `userProfiles`, `dungeonRecords` are `ownedBy("owner")` + `controllerOrScoped()`. Config maps are controller-only. | Controller can already list principals, names, HP, kill counts. **Do not add a telemetry entity with an owner column.** |
| `PurchaseRecord` (`types/admin.mo` ~185) | Name, email, address, proof URL. | Payment ops only. **Never join into gameplay analytics.** |
| `chatMessages` (`main.mo` ~1741) | In-memory, cap 200, dropped on upgrade. | **Do not collect message content.** |
| Admin dashboard tabs | Enemies, Regions, Sprites, Spells, Modifiers, Tiers, Visuals, Settings, Purchases, Achievements, Names, Bosses, Ads, Shop, Boss Rush. Sidebar shows catalog *counts* only. | No Intelligence / outcome tab. |
| Quality audit `AQA-2026-08-30-012` | Asked for persist-ok/fail, victory paid, death-penalty applied, recap opened/dismissed, shop credit committed. | Still unimplemented. Every gameplay-outcome classification in that audit is INCONCLUSIVE. |

**Authoritative gameplay already persisted (usable as *snapshot* aggregates, not battle logs):**

| Store | Key today | Snapshot signal (aggregate only) |
| :--- | :--- | :--- |
| `characterSlots` | Principal → 3 slots | Level histogram, pieceType mix, leftover XP, killCount buckets |
| `dokaBalances` | Principal → Nat | Wallet-size histogram (no identity) |
| `achievementProgress` | `"principal#achievementId"` | Unlock / claim counts **by achievementId** |
| `dungeonRecords` | Principal | Depth / maps-completed / best-multiplier histograms |
| `bossRushStates` | `"principal#slot"` | `bestRoom` / `masterComplete` histograms |
| `spellConfigs` / `enemyConfigs` | Text id | Catalog validity (missing targeting metadata, unused ids) |
| `applyRewards` / `saveBattleStats` / `upgradeSpell` | Per-call `#ok` / `#err` | Quality counters *if* the client increments after the result (not on the persist lock) |

Combat, spell casts, flee, map modifiers, and shrines are **client-orchestrated**. The canister never sees a battle start. Outcome intelligence therefore needs a **fail-open increment sidecar**, or it will stay blind.

**Event sources already in the tree (do not invent parallel ones):**

| Outcome | Where it already happens |
| :--- | :--- |
| Battle start | `WorldExploration.tsx` ~12363 `setInBattle(true)` + `onDebugLog?.("BATTLE_START")` |
| Victory | `handleBattleEnd(true)` ~12598; recap first (~12731), persist in a separate `try/catch` (~12738) |
| Defeat (non-death branch) | `handleBattleEnd(false)` ~12872 (rare; most losses are death) |
| Combat / DoT / flee death | `_handlePlayerDeath` ~13321. **Flee (`onEndBattle` ~18871) calls this same function.** |
| Lava / spike death | HP-watch ~13376 — comment: lava/spike **never** call `_handlePlayerDeath` |
| Death persist | `persistDeathPenalty` → `saveBattleStats` (20% XP / 40% Doka) |
| Boss Rush room | `persistBossRushRoomClear` + `applyRewards` on the persist lock |
| Dungeon step | `snapshotDungeonChain` **before** `cleanupMap`, then `decideDungeonChainPortal` (`enter` / `progress` / `complete` / `none`) |
| Challenge complete | `isChallengeCompleted` + `liveBattleChallengePersistEntries` inside `handleBattleEnd` |
| Spell cast | `executeCastAttempt` / `resolvePlayerCast` / Attack Nearest — explicit `SpellConfig.id` |
| Enemy AI intent | `decideEnemyAction` → `EnemyAction.archetype` + `kind` (`cast` \| `melee` \| `move` \| `skip`). Local `TURN` log only. |
| Pattern fallback | `drawCombatant` → `king.front` + throttled `logPatternLookupFailed` |
| Reward persist fail | `handleBattleEnd` catch ~12797 (non-blocking) |

---

## 2. Non-negotiable rules

Telemetry must **never**:

1. Become authoritative gameplay state (HP, AP, MP, XP, Doka, spell levels, dungeon depth, boss-rush room).
2. Enqueue on `createProgressPersist` (credits and `saveBattleStats` already share that lock).
3. Block combat, persistence, map loading, rewards, or the economy.
4. Be required for a normal session (missing increment = gameplay continues).
5. Collect chat / message text, purchase customer fields, pixel patterns, `uiLayout`, click traces, or per-player behavioural timelines.
6. Expose principals, display names, or character names on the Intelligence tab.
7. Touch the RAF loop, map generation, turn-order math, or damage formulas.

**Fail open.** A telemetry exception is swallowed. A full increment map is not a reason to skip `applyRewards`. If the sidecar is down, the game is unchanged.

**Privacy default:** increment a **bounded key** (`metricId` + coarse dimension + optional UTC day). Never store a row per player per event.

---

## 3. Recommended architecture (sidecar)

```
Gameplay (authoritative)
  WorldExploration / persist helpers / applyRewards / saveBattleStats
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
        │
        ▼
AdminDashboard tab "Intelligence"  (isAdmin && #admin on canister)
  carved-stone / slate / crimson — same language as existing tabs
  charts + tables of aggregates only
```

### 3.1 Why not OQL / leaderboard / debug export

- **OQL** already returns `owner` principals on player collections. Using it as an analytics UI would be identifiable surveillance. Keep OQL for owner-scoped debug of *that caller’s* row. Do not add a `telemetryEvents` OQL entity.
- **`getLeaderboard`** is a player-facing top-50 with `principalId`. Do not feed it into Intelligence. If a level histogram is needed, add an **admin-only bucket query** that never returns a principal.
- **Debug overlay / click-trace / SPELLBAR-BISECT** stay local. Promoting them to the canister would ship invasive, high-volume, often-PII-adjacent payloads.

### 3.2 Increment API shape (design)

```
recordTelemetryIncrements(increments: [(Text, Nat)]) : async ()
```

- Any authenticated `#user` or `#admin` may increment (otherwise only admins would generate data).
- **No principal is stored.** The canister adds `n` to `lifetime[key]` and `day[today|key]`.
- Reject (silently, `#ok` still) if: anonymous caller; banned caller (optional); batch `> 32` keys; any key `> 96` bytes; unknown prefix (allow-list `combat.`, `spell.`, `enemy.`, `prog.`, `content.`, `quality.`); day-map size over a hard cap (then drop new day keys, keep lifetime).
- **Never trap.** Never return `#err` that the client must handle. Best-effort `()` .
- **Never read or write** `dokaBalances`, `characterSlots`, spell levels, or run records.

Client rules:

- Call **after** recap is shown / death penalty is applied / persist `try` has settled — never inside the persist-lock `enqueue` function.
- Do not pass spell *names* (ids only). Do not pass enemy *assigned names*.
- Coarse buckets only for HP, turns, level delta (see metric catalog).

### 3.3 Aggregation, sampling, retention, cost

| Class | Volume | Sampling | Retention |
| :--- | :--- | :--- | :--- |
| Quality / persist | Rare (errors + one increment per persist) | **100%** | Lifetime + 28 UTC days |
| Battle outcomes | ~1 increment set per battle | **100%** | Lifetime + 28 UTC days |
| Content funnel (dungeon / rush / challenge / shrine) | ~1 per portal or offer | **100%** | Lifetime + 28 UTC days |
| Spell / enemy casts | Many per battle | **Per-battle unique-set** of ids (not every cast). If unique-set still grows, session sample 25%. | Lifetime + 28 UTC days |
| AI archetype | One per enemy turn if raw | **Per-battle counts by archetype**, or 10% of battles | 14 UTC days then drop |
| Visual fallback | Per draw if unthrottled | **Session-once per `pieceType\|view`**, matching existing 1 + every-500 log | Lifetime (low cardinality) |

**Key cardinality budget (hard design cap):** catalog-sized dimensions only — `spellId`, `pieceType` / `enemyConfigId`, `bossId`, `challengeId`, `modifierType`, `deathCause` enum, `achievementId`. No free-text. No map ids that include player names. If admin creates hundreds of spells, counters still scale with catalog size, not with player count.

**Do not store raw event logs on the canister.** IC stable memory is the wrong place for a clickstream.

### 3.4 Phased rollout

| Phase | What ships | Why first |
| :--- | :--- | :--- |
| **0 — Snapshot aggregates** | Admin-only queries that *scan existing maps* and return **buckets only** (level histogram, Doka histogram, achievement counts by id, dungeon/rush histograms, catalog validity). No combat instrumentation. No new player writes. | Immediate owner signal. Zero persist-lock risk. Unblocks `AQA-2026-08-30-012` for population, not battles. |
| **1 — Outcome + quality increments** | Sidecar + `recordTelemetryIncrements` + counters for persist ok/fail, victory paid, death penalty, recap opened, shop credit, battles started / victory / defeat / flee. | Answers the Quality Auditor. One batch per outcome. Fail-open. |
| **2 — Combat / spell / enemy / content dimensions** | Bucketed turns, remain-HP, death cause, enemy family W/L, level-delta, spell unique-set, dungeon/rush/challenge/modifier. | Balancing. Still aggregates. |
| **3 — Optional diagnostics** | Pattern-fallback counters, invalid-config counts, sampled AI archetype, pairwise spell co-occurrence (not sequences). | Only after Phase 1 is proven not to touch the persist lock. |

**Do not implement a per-player profile store.** If a future debug tool needs one session’s log, that is the existing **local** debug export, gated, never uploaded by default.

---

## 4. Privacy model

| Allowed | Forbidden |
| :--- | :--- |
| `combat.outcome.victory` += 1 | `combat.outcome.victory.{principal}` |
| `combat.death_cause.lava` += 1 | Chat / whisper / battle-log text |
| `spell.used.blood_tap` += 1 (id) | Spell *name* strings as keys if ids exist |
| `prog.level_bucket.10_14` += N characters (snapshot) | Character name, display name, `uiLayout` |
| `quality.persist.apply_rewards.fail` += 1 | Error strings that include principals |
| Achievement counts by `achievementId` | Purchase email / address / proof URL |
| PieceType mix (pawn / rook / …) | Pixel pattern JSON, custom colors, sprite URLs of *players* |
| Pairwise “spell A and B used in same battle” totals | Ordered cast sequences, session timelines, heatmaps of a named player |

**Existing identifiable surfaces (do not expand):**

1. `getLeaderboard.principalId`
2. OQL `characterSlots.owner` / `userProfiles.name`
3. `PurchaseRecord` customer fields (Purchases tab stays payment-ops)
4. Admin ban list (ops, not Intelligence)
5. Debug overlay buffer (local; may contain ids — do not upload)

**Intelligence tab rule:** if a cell would let an owner single out one player without opening a separate, gated debug tool, it does not ship.

---

## 5. Metric catalog

STATUS is **PROPOSED** for every row (none implemented).  
`EVENT_SOURCE` is the *existing* gameplay site to observe — not a new authoritative writer.

### 5.1 Combat

METRIC_ID: GTAD-C-001  
NAME: Battles started  
PURPOSE: Denominator for win/loss, flee, and length rates.  
EVENT_SOURCE: `WorldExploration.tsx` ~12363 after `setInBattle(true)` / `onDebugLog("BATTLE_START")`. One increment per successful battle commit, including Boss Rush rooms.  
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
EVENT_SOURCE: `handleBattleEnd(true)` after recap is queued (~12731), **not** inside `resolveBattleRewards`. Boss Rush: `handleBossRushRoomClear` after recap.  
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
EVENT_SOURCE: `_handlePlayerDeath` ~13321 when `inBattleRef` is true **and** the caller is not the flee button.  
AGGREGATION: Counter; dim `mode`.  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Combat difficulty vs hazard difficulty (see C-007).  
PERFORMANCE_COST: Negligible.  
PRIVACY_RISK: Low.  
IMPLEMENTATION_COMPLEXITY: Medium — must tag the caller (flee vs combat vs DoT) without changing death math.  
STATUS: PROPOSED  

METRIC_ID: GTAD-C-004  
NAME: Flees  
PURPOSE: Distinguish “I quit this fight” from “I died”. Today flee **is** death (`onEndBattle` ~18871 → `_handlePlayerDeath`).  
EVENT_SOURCE: `onEndBattle` confirm path, **before** `_handlePlayerDeath`. Still apply the existing death penalty — telemetry does not change that.  
AGGREGATION: Counter; dim `mode` (dungeon/rush flee already confirms “you will fall”).  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Soft difficulty / frustration; whether run flees are too common.  
PERFORMANCE_COST: Negligible.  
PRIVACY_RISK: Low.  
IMPLEMENTATION_COMPLEXITY: Medium (discrete tag on a shared death function; do not fork persist).  
STATUS: PROPOSED  

METRIC_ID: GTAD-C-005  
NAME: Battle length (turn buckets)  
PURPOSE: Replace a stored average with histogram buckets so one 80-turn fight cannot dominate.  
EVENT_SOURCE: `challengeTurnCountRef` / `battleTurn` at `handleBattleEnd` or death.  
AGGREGATION: Counters `combat.turns.1_5|6_10|11_15|16_25|26_plus`.  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Challenge `under_N_turns` tuning; stall / AI-skip bugs (Quality Auditor cannot see this today).  
PERFORMANCE_COST: Negligible (one bucket increment per battle).  
PRIVACY_RISK: Low.  
IMPLEMENTATION_COMPLEXITY: Low.  
STATUS: PROPOSED  

METRIC_ID: GTAD-C-006  
NAME: Remaining HP at victory (buckets)  
PURPOSE: How close victories are — overtuned player vs overtuned enemies.  
EVENT_SOURCE: `characterStats.hp` / `maxHp` on the victory branch only (defeat is 0 by definition).  
AGGREGATION: `combat.remain_hp.1|2_10pct|11_25|26_50|51_75|76_100`. Include a dedicated `1` bucket for the `survive_1hp` feat.  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Boss / elite HP and player resilience.  
PERFORMANCE_COST: Negligible.  
PRIVACY_RISK: Low.  
IMPLEMENTATION_COMPLEXITY: Low.  
STATUS: PROPOSED  

METRIC_ID: GTAD-C-007  
NAME: Death causes  
PURPOSE: Split combat vs DoT vs hazard vs flee.  
EVENT_SOURCE: Existing bisect tags already name sources (`dot-tick` ~1790; flee ~18871; lava/spike HP-watch ~13380; enemy spell/melee comments on `_handlePlayerDeath`). Emit an enum only: `combat_melee|combat_spell|dot|lava|spikes|flee|other`.  
AGGREGATION: Counter per enum.  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Hazard damage vs combat tuning; Death Realm frequency.  
PERFORMANCE_COST: Negligible.  
PRIVACY_RISK: Low. Do not attach map seeds or coordinates.  
IMPLEMENTATION_COMPLEXITY: Medium (thread a `DeathCause` into the two death entry points; do not change `persistDeathPenalty`).  
STATUS: PROPOSED  

METRIC_ID: GTAD-C-008  
NAME: Enemy-family win / loss  
PURPOSE: Which piece types / config ids are stomping or being stomped.  
EVENT_SOURCE: Battle roster at start (`pieceType`, optional `enemyConfig.id`) + outcome at end. Prefer **family** (`pawn|rook|bishop|knight|queen|king|summon|boss|leader`) over assigned display names.  
AGGREGATION: `combat.family.{family}.win|loss` += 1 per battle that contained that family (not per corpse).  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Enemy config / kit / tier-spawn edits in Admin → Enemies / Tiers.  
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
PURPOSE: `isLeader` + `leader_slayer` feat are already tracked client-side (`battleLeaderSlainRef`).  
EVENT_SOURCE: Battle end: leader present vs leader slain.  
AGGREGATION: `combat.leader.present|slain|escaped`.  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Leader boost (`AdminGameConfig.leaderBoostPercent`).  
PERFORMANCE_COST: Negligible.  
PRIVACY_RISK: Low.  
IMPLEMENTATION_COMPLEXITY: Low.  
STATUS: PROPOSED  

METRIC_ID: GTAD-C-011  
NAME: Boss completion  
PURPOSE: Per-boss clear vs fail.  
EVENT_SOURCE: Victory with `currentBossConfigRef`; death/flee while a boss is active; Boss Rush room index 0–9 via `persistBossRushRoomClear`.  
AGGREGATION: `combat.boss.{bossId}.win|fail`; `content.boss_rush.room.{n}.clear|fail`.  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Boss HP/phases (`Admin → Bosses`); jackpot room 9 economy.  
PERFORMANCE_COST: Negligible.  
PRIVACY_RISK: Low (config ids, not player names).  
IMPLEMENTATION_COMPLEXITY: Low.  
STATUS: PROPOSED  

METRIC_ID: GTAD-C-012  
NAME: Abnormal battle termination  
PURPOSE: Catch cleanup / generation-guard / concurrent-end paths that are not a clean victory, death, or flee.  
EVENT_SOURCE: `handleBattleEnd` generation-guard return (~12606); `cleanupBattle` while `inBattleRef` without an outcome increment; persist catch that still showed a recap.  
AGGREGATION: `quality.battle.abort.{gen_guard|cleanup_orphan|reward_compute_err}`.  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Whether a combat patch increased orphaned fights (Quality Auditor currently guesses).  
PERFORMANCE_COST: Negligible.  
PRIVACY_RISK: Low. No stack traces with principals.  
IMPLEMENTATION_COMPLEXITY: Medium.  
STATUS: PROPOSED  

### 5.2 Spells

METRIC_ID: GTAD-S-001  
NAME: Spell usage (player)  
PURPOSE: Which catalog ids are actually cast.  
EVENT_SOURCE: Successful spend paths only: `castResultSpendsAp` true (`cast` \| `fizzled` \| `summon`) on canvas + Attack Nearest. Key = `SpellConfig.id`, never `name`.  
AGGREGATION: **Per-battle unique-set** `spell.used.{spellId}` += 1 (presence), plus optional `spell.casts.{spellId}` += N if session sample allows.  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Dead spells vs dominant spells; Admin → Spells.  
PERFORMANCE_COST: Low if unique-set; medium if every cast is sent. Prefer unique-set.  
PRIVACY_RISK: Low at unique-set. Medium if full sequences are stored — **do not store sequences**.  
IMPLEMENTATION_COMPLEXITY: Medium (must not sit in the RAF / targeting hot path; increment a `Set` on the battle object, flush at end).  
STATUS: PROPOSED  

METRIC_ID: GTAD-S-002  
NAME: Casts per battle  
PURPOSE: Action density; AP-challenge (`under_8_ap_per_turn`) context.  
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
PURPOSE: Today **there is no persisted spell-drop / first-seen**. `ownedSpells` = starters ∪ all backend configs minus a retired-name filter (`WorldExploration.tsx` ~2257–2271). `minLevel` exists on `SpellConfig` but is not a discovery event.  
EVENT_SOURCE: **Do not invent a drop system.** Approximate: (a) Phase 0 snapshot — count characters with `level >= spell.minLevel` vs catalog size; (b) Phase 2 — first time `spellId` is **equipped** (`setSpellBarOrder` / `saveActiveSpells`) or first unique-set use (S-001).  
AGGREGATION: `spell.reach.{spellId}.eligible_snapshot` (admin query) and/or `spell.first_equip.{spellId}`.  
RETENTION: Snapshot is live; first-equip counters lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Whether high-`minLevel` spells are ever equipped.  
PERFORMANCE_COST: Snapshot is an admin query (not per combat). First-equip is one increment.  
PRIVACY_RISK: Low if only ids.  
IMPLEMENTATION_COMPLEXITY: Medium (document the lack of a real discovery pipeline).  
STATUS: PROPOSED  

METRIC_ID: GTAD-S-004  
NAME: Unlock source (coarse)  
PURPOSE: If a later content patch adds drops/shrines, tag source then. Until then only `starter|catalog|unknown`.  
EVENT_SOURCE: Starter list membership vs backend catalog vs future drop hook. **No chat, no NPC dialogue.**  
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
EVENT_SOURCE: Derived in the admin query: `S-001` / battles started vs `getSpellConfigs` (`usableByPlayer`, `minLevel`).  
AGGREGATION: Query-time list: spells with 0 unique-set uses in the retention window (or below 2% of C-001).  
RETENTION: Derived; no extra store.  
OWNER_DECISION_SUPPORTED: Hide, buff, or rewrite dead spells.  
PERFORMANCE_COST: None at runtime.  
PRIVACY_RISK: None.  
IMPLEMENTATION_COMPLEXITY: Low (dashboard query).  
STATUS: PROPOSED  

METRIC_ID: GTAD-S-006  
NAME: Spell co-occurrence (not sequences)  
PURPOSE: “Which two ids appear in the same battle unique-set?” — enough for combo balancing without a behavioural profile.  
EVENT_SOURCE: Same unique-set as S-001. Emit **canonical pairs** (`idA<idB`) only if the set size is 2–8. **Do not emit ordered n-grams or per-player histories.**  
AGGREGATION: `spell.pair.{idA}_{idB}` += 1 per battle. Cap: only pairs involving at least one non-starter, or top-N by use, to bound keys.  
RETENTION: 14 days (higher cardinality).  
OWNER_DECISION_SUPPORTED: Accidental dominant combos.  
PERFORMANCE_COST: Medium (O(k²) keys per battle if unbounded — **must cap**).  
PRIVACY_RISK: Medium if pairs are unique enough to fingerprint a small population — mitigate with pair cap + no principal.  
IMPLEMENTATION_COMPLEXITY: High. **Phase 3 only.**  
STATUS: PROPOSED  

METRIC_ID: GTAD-S-007  
NAME: Enemy spell usage  
PURPOSE: Whether enemy kits (`usableByEnemy`, `enemyAI` piece kits, boss `spellPoolIds`) are firing.  
EVENT_SOURCE: WX enemy `action.kind === "cast"` branch ~16464; boss AI casts. Unique-set per battle.  
AGGREGATION: `spell.enemy_used.{spellId}`.  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Enemy/boss kit edits.  
PERFORMANCE_COST: Low (unique-set flush).  
PRIVACY_RISK: Low.  
IMPLEMENTATION_COMPLEXITY: Medium.  
STATUS: PROPOSED  

METRIC_ID: GTAD-S-008  
NAME: Fizzles  
PURPOSE: Fail-chance (`spellFailBaseChance`) vs player frustration.  
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
PURPOSE: Economy + `spell_scholar` / upgrade cost curve (`base * 2^level`).  
EVENT_SOURCE: After `upgradeSpell` `#ok` in `persistSpellUpgrade` — **after** the persist-lock write commits, not inside it.  
AGGREGATION: `spell.upgrade.{spellId}` += 1; optional `prog.doka_spent.upgrade` += canister cost (not the 10× UI sticker).  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Whether anyone pays past level 3.  
PERFORMANCE_COST: Negligible.  
PRIVACY_RISK: Low.  
IMPLEMENTATION_COMPLEXITY: Low.  
STATUS: PROPOSED  

### 5.3 Enemies

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
PURPOSE: Same buckets as C-009, tagged by family if needed.  
EVENT_SOURCE: Battle start.  
AGGREGATION: `enemy.level_delta.{family}.{bucket}` only if key count stays bounded; otherwise rely on C-009.  
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
OWNER_DECISION_SUPPORTED: Nerf/buff a family.  
PERFORMANCE_COST: None at runtime.  
PRIVACY_RISK: None.  
IMPLEMENTATION_COMPLEXITY: Low.  
STATUS: PROPOSED  

METRIC_ID: GTAD-E-004  
NAME: Battle length vs family  
PURPOSE: Which families produce long fights.  
EVENT_SOURCE: C-005 bucket + C-008 family present.  
AGGREGATION: Optional cross-tab `enemy.turns.{family}.{turnBucket}` — Phase 2, only if key budget allows.  
RETENTION: 14 days.  
OWNER_DECISION_SUPPORTED: HP/AI stall.  
PERFORMANCE_COST: Low.  
PRIVACY_RISK: Low.  
IMPLEMENTATION_COMPLEXITY: Medium.  
STATUS: PROPOSED  

METRIC_ID: GTAD-E-005  
NAME: Enemy spell usage  
PURPOSE: Alias of S-007 for the Enemies admin mental model.  
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
PURPOSE: `EnemyArchetype` is already `caster|healer|charger|flanker|berserker|summoner|generic` (`enemyAI.ts` ~79). Useful if one branch never fires after a kit change.  
EVENT_SOURCE: `decideEnemyAction` return. **Do not persist per-turn intent strings.**  
AGGREGATION: Per-battle unique or counts: `enemy.ai.{archetype}`. Sample 10% of battles if volume matters.  
RETENTION: 14 days.  
OWNER_DECISION_SUPPORTED: AI kit bugs vs intended mix.  
PERFORMANCE_COST: Medium if every turn; low if per-battle unique.  
PRIVACY_RISK: Low (no intent text, no target ids).  
IMPLEMENTATION_COMPLEXITY: Medium. Phase 3. Do not log `intent` strings to the canister.  
STATUS: PROPOSED  

### 5.4 Progression

METRIC_ID: GTAD-P-001  
NAME: Approximate player-level distribution  
PURPOSE: Population shape without a census of identities.  
EVENT_SOURCE: **Phase 0 admin snapshot** over `characterSlots` (occupied slots only). Buckets `1|2_4|5_9|10_14|15_19|20_plus`. Best slot per principal, or all occupied slots — pick one and document it (recommend **all occupied slots** so alts are visible as content demand, still no principal).  
AGGREGATION: Query-time histogram. **Response contains buckets only.**  
RETENTION: Live snapshot (no extra store).  
OWNER_DECISION_SUPPORTED: Content level bands, XP curve `100 * 2^(N-1)`.  
PERFORMANCE_COST: Admin query scans the map (acceptable; do not run on the player path).  
PRIVACY_RISK: Low **if** principals are stripped. High if someone “just returns the OQL rows.”  
IMPLEMENTATION_COMPLEXITY: Medium (new admin query; do not reuse `getLeaderboard`).  
STATUS: PROPOSED  

METRIC_ID: GTAD-P-002  
NAME: Level-up rate  
PURPOSE: Progression velocity.  
EVENT_SOURCE: `applyRewards` `#ok` when `newLevel > oldLevel` — increment **after** the persist-lock function returns, using the already-known delta. Optional: count of `newLevel` crossings per day.  
AGGREGATION: `prog.levelup` += 1; `prog.levelup.to.{bucket}`.  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Whether the XP curve is stalled (the off-by-one `100*2^N` class of bug).  
PERFORMANCE_COST: Negligible.  
PRIVACY_RISK: Low.  
IMPLEMENTATION_COMPLEXITY: Low.  
STATUS: PROPOSED  

METRIC_ID: GTAD-P-003  
NAME: XP sources (coarse)  
PURPOSE: `applyRewards` is untagged on the canister. Source must be a client enum at the *call site*, not parsed from recap text.  
EVENT_SOURCE: Call sites: victory / challenge persist, portal +10, Boss Rush room, dungeon complete bonus, (not death — death cannot use `applyRewards`).  
AGGREGATION: `prog.xp.{victory|challenge|portal|boss_rush|dungeon_bonus}` += 1 (event) and optionally += clamped XP (cap increment at 50_000 to avoid jackpot-skewed sums).  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Whether portals or challenges dominate XP.  
PERFORMANCE_COST: Negligible.  
PRIVACY_RISK: Low. Do not store per-enemy Doka roll breakdowns (those include enemy display names today).  
IMPLEMENTATION_COMPLEXITY: Low.  
STATUS: PROPOSED  

METRIC_ID: GTAD-P-004  
NAME: Doka earned (coarse)  
PURPOSE: Credit funnel.  
EVENT_SOURCE: Same `applyRewards` `#ok` sites + `claimAchievementReward` + `processPendingPurchases` (purchase **amount only**, never customer fields).  
AGGREGATION: `prog.doka_earned.{victory|challenge|pickup|achievement|shop|dungeon_bonus|boss_rush}` += 1 and/or += clamped Nat.  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Economy inflation; jackpot / shop mix.  
PERFORMANCE_COST: Negligible.  
PRIVACY_RISK: Low if shop increments carry **packageId / amount only**.  
IMPLEMENTATION_COMPLEXITY: Low.  
STATUS: PROPOSED  

METRIC_ID: GTAD-P-005  
NAME: Doka spent (coarse)  
PURPOSE: Sink health. `applyRewards` cannot subtract — spends are `upgradeSpell`, `saveBattleStats` (heal/shop/death), `renameCharacter`.  
EVENT_SOURCE: After those writers `#ok`, off the lock. Death is a **penalty**, not a sink players chose — tag separately (`prog.doka_lost.death`).  
AGGREGATION: `prog.doka_spent.{upgrade|heal|item_shop|rename}` ; `prog.doka_lost.death`.  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Whether upgrade costs (and the 10× UI sticker) starve the rest of the sinks.  
PERFORMANCE_COST: Negligible.  
PRIVACY_RISK: Low.  
IMPLEMENTATION_COMPLEXITY: Low.  
STATUS: PROPOSED  

METRIC_ID: GTAD-P-006  
NAME: Spellbook / bar occupancy  
PURPOSE: `spell_master_8` and empty-bar issues.  
EVENT_SOURCE: Snapshot of `spellBarOrder` length on world hydrate (once per session) or Phase 0 scan of `activeSpells` / `spellBarOrder` optionals.  
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
EVENT_SOURCE: Phase 0 scan of `achievementProgress` grouped by `achievementId`: unlocked, claimed, unlocked-unclaimed. Client increment on `markAchievementUnlocked` / `claimAchievementReward` `#ok` is optional (snapshot is enough).  
AGGREGATION: `prog.feat.{achievementId}.unlocked|claimed`.  
RETENTION: Live snapshot + optional lifetime increments.  
OWNER_DECISION_SUPPORTED: Dead feats (`pacifist_run`, `double_betrayal`) vs trivial ones.  
PERFORMANCE_COST: Admin scan.  
PRIVACY_RISK: Low **without** principalId. The stored key is `"principal#id"` — **strip the prefix in the query**.  
IMPLEMENTATION_COMPLEXITY: Medium (careful aggregation).  
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

### 5.5 Content

METRIC_ID: GTAD-N-001  
NAME: Dungeon-chain funnel  
PURPOSE: Enter / progress / complete / abort. Session refs are zeroed by `cleanupMap`; backend `dungeonRecords` is a coarse snapshot.  
EVENT_SOURCE: `decideDungeonChainPortal` action (`enter|progress|complete|none`) after snapshot ~6754; abort via `resetRunState` on death.  
AGGREGATION: `content.dungeon.enter|progress|complete|abort`. Optional `content.dungeon.complete_depth.{3|4|5}` (`maxDepth` is 3–5).  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Whether the completion bonus (`maxDepth * 50`) is ever reached.  
PERFORMANCE_COST: Negligible.  
PRIVACY_RISK: Low.  
IMPLEMENTATION_COMPLEXITY: Low.  
STATUS: PROPOSED  

METRIC_ID: GTAD-N-002  
NAME: Boss Rush funnel  
PURPOSE: Room clears, aborts, master complete, jackpot room 9.  
EVENT_SOURCE: `persistBossRushRoomClear` success; `resetBossRush` / `abortBossRush` on lava/flee/death; `bossRushMasterComplete`.  
AGGREGATION: `content.boss_rush.room.{0-9}.clear|fail`; `content.boss_rush.master`; `content.boss_rush.abort`.  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Room 0 farm vs mid-tree drop-off; jackpot heal/economy.  
PERFORMANCE_COST: Negligible.  
PRIVACY_RISK: Low.  
IMPLEMENTATION_COMPLEXITY: Low.  
STATUS: PROPOSED  

METRIC_ID: GTAD-N-003  
NAME: Challenge funnel  
PURPOSE: Offered vs accepted vs completed vs failed (accepted but predicate false).  
EVENT_SOURCE: Panel accept + `isChallengeCompleted` at `handleBattleEnd` / room clear. Ids `easy_1`…`legendary_3` (`challengeCompletion.ts`).  
AGGREGATION: `content.challenge.{id}.accept|complete|fail`.  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Untouchable / AP-challenge tuning; whether advertised 400–1000 XP is actually paid.  
PERFORMANCE_COST: Negligible.  
PRIVACY_RISK: Low.  
IMPLEMENTATION_COMPLEXITY: Low.  
STATUS: PROPOSED  

METRIC_ID: GTAD-N-004  
NAME: Map-modifier participation  
PURPOSE: World-event stand-in. Modifiers (`slime_flood`, `blood_moon`, `fog_of_war`, `thorned_ground`, `void_rift`, …) apply on portal transition.  
EVENT_SOURCE: After modifier roll on portal (~7087 / `activeMapModifierTypes`).  
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
EVENT_SOURCE: Existing refs/achievements: `jackpotHealVisible`, `battleBetrayalOccurredRef`, `battleDoubleBetrayelOccurredRef`, `isLeader` spawn (~7020), ground Doka pickup count. Increment **event enums**, not story text.  
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
EVENT_SOURCE: Shrine completion ~11529 (`_purePath` / altar).  
AGGREGATION: `content.shrine.complete|path_broken`.  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Whether shrine rooms are understood.  
PERFORMANCE_COST: Negligible.  
PRIVACY_RISK: Low. Do not persist covenant flavour text.  
IMPLEMENTATION_COMPLEXITY: Low.  
STATUS: PROPOSED  

### 5.6 Quality

METRIC_ID: GTAD-Q-001  
NAME: applyRewards failure  
PURPOSE: First Quality Auditor gap (`AQA-2026-08-30-012`).  
EVENT_SOURCE: After `readApplyRewardsOk` throws / `#err` at victory, portal, rush, challenge, pickup — **outside** the persist-lock `enqueue` (in the existing `catch`).  
AGGREGATION: `quality.persist.apply_rewards.fail` ; optional coarse `reason=banned|anonymous|empty_slot|other` (no raw error text).  
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
EVENT_SOURCE: `#ok` from `applyRewards` / `saveBattleStats` / `upgradeSpell` / `claimAchievementReward` / `processPendingPurchases` — increment after commit, off the lock.  
AGGREGATION: `quality.persist.{writer}.ok`.  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Fail rate.  
PERFORMANCE_COST: One increment per successful persist.  
PRIVACY_RISK: Low.  
IMPLEMENTATION_COMPLEXITY: Low.  
STATUS: PROPOSED  

METRIC_ID: GTAD-Q-004  
NAME: Recap opened  
PURPOSE: UX — recap is root-mounted (`App.tsx` → `PostBattleRecap`).  
EVENT_SOURCE: `onShowBattleSummary` success (~12731 / room clear).  
AGGREGATION: `quality.recap.opened`.  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Recap vs persist mismatch (shown but unpaid = Q-001).  
PERFORMANCE_COST: Negligible.  
PRIVACY_RISK: Low. Do not store recap enemy-name breakdowns.  
IMPLEMENTATION_COMPLEXITY: Low.  
STATUS: PROPOSED  

METRIC_ID: GTAD-Q-005  
NAME: Recap dismissed  
PURPOSE: UX cancellation. Only if the recap component has a discrete close handler — do not scrape clicks.  
EVENT_SOURCE: `PostBattleRecap` dismiss / continue. If no single handler exists, **defer** rather than instrument the canvas.  
AGGREGATION: `quality.recap.dismissed`.  
RETENTION: 28 days.  
OWNER_DECISION_SUPPORTED: Players skipping recap (heal-under-recap races).  
PERFORMANCE_COST: Negligible.  
PRIVACY_RISK: Low.  
IMPLEMENTATION_COMPLEXITY: Low–medium (find the real close path first).  
STATUS: PROPOSED  

METRIC_ID: GTAD-Q-006  
NAME: Shop credit committed  
PURPOSE: 60s auto-complete path (`creditPendingPurchasesThroughPersist`).  
EVENT_SOURCE: After persist-lock credit `#ok`. **No customer fields.**  
AGGREGATION: `quality.shop.credit_ok` ; `prog.doka_earned.shop` (P-004).  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Broken shop timers vs `cleanupBattle` clearing the wrong timeout set.  
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
PURPOSE: Admin CRUD can save incomplete targeting metadata; combat must keep using explicit `SpellConfig` fields.  
EVENT_SOURCE: Load-time validation when hydrating `getSpellConfigs` / enemy / boss configs (missing `targetType` / range / `usableBy*`). Count **config ids**, once per session per id.  
AGGREGATION: `quality.config.invalid.{kind}.{id}`.  
RETENTION: Lifetime.  
OWNER_DECISION_SUPPORTED: Which admin row is unsafe to ship.  
PERFORMANCE_COST: Low (once per hydrate).  
PRIVACY_RISK: Low (admin catalog ids).  
IMPLEMENTATION_COMPLEXITY: Medium.  
STATUS: PROPOSED  

METRIC_ID: GTAD-Q-009  
NAME: Custom visual / sprite load failure  
PURPOSE: `spriteUrl` / player sprite panels / ad images.  
EVENT_SOURCE: `onerror` on admin-configured URLs (player sprites, enemy `spriteUrl`, ad boxes). **Do not send the URL** (may be private). Send `kind=enemy_sprite|player_sprite|ad_box`.  
AGGREGATION: `quality.visual.load_fail.{kind}`.  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Broken CDN / admin URLs.  
PERFORMANCE_COST: Negligible.  
PRIVACY_RISK: Medium if URLs are logged — **strip URLs**.  
IMPLEMENTATION_COMPLEXITY: Medium (hooks may not exist yet).  
STATUS: PROPOSED  

METRIC_ID: GTAD-Q-010  
NAME: Default pixel fallback  
PURPOSE: `drawCombatant` already falls back to `king.front` and throttles logs (`pieceArt.ts` ~40).  
EVENT_SOURCE: Same throttle: first occurrence + every 500 per `pieceType|view`. Increment on those emit points only.  
AGGREGATION: `quality.visual.pattern_fallback` += 1; optional dim `pieceType` if it is a catalog key (not a free string).  
RETENTION: Lifetime.  
OWNER_DECISION_SUPPORTED: Missing summon/boss art after a content add.  
PERFORMANCE_COST: Negligible (already throttled).  
PRIVACY_RISK: Low.  
IMPLEMENTATION_COMPLEXITY: Low.  
STATUS: PROPOSED  

METRIC_ID: GTAD-Q-011  
NAME: Spell / layout load failure  
PURPOSE: Existing warn paths: spell state empty defaults (~2567), `DraggablePanel` backend layout fail, `ChallengePanel` layout fail.  
EVENT_SOURCE: Those `catch` blocks.  
AGGREGATION: `quality.load.{spells|ui_layout|challenge_layout}.fail`.  
RETENTION: Lifetime + 28 days.  
OWNER_DECISION_SUPPORTED: Hydrate flakes vs real canister errors.  
PERFORMANCE_COST: Negligible.  
PRIVACY_RISK: Low. Do not attach `uiLayout` JSON.  
IMPLEMENTATION_COMPLEXITY: Low.  
STATUS: PROPOSED  

---

## 6. Explicitly rejected (for this design)

| Idea | Why rejected |
| :--- | :--- |
| Per-player battle history / “behavioural profile” | Surveillance; IC cost; contradicts mandate. |
| Chat / battle-log text mining | Privacy rule. Chat is already ephemeral. |
| Uploading debug overlay / click-trace buffers | High volume, geometry of a session, possible ids. |
| Using `getLeaderboard` or OQL rows as the Intelligence UI | Identifiable (`principalId`, `owner`, names). |
| Joining `PurchaseRecord` PII into gameplay charts | Different purpose; high privacy risk. |
| Telemetry on `createProgressPersist` | Can stall or reorder wallet writes; AQA already flagged this. |
| Authoritative “telemetry HP” or server-replay combat | Combat is client-orchestrated; do not fork damage math. |
| Building a spell-drop system only to measure discovery | Inventing gameplay for a metric. Use S-003 approximations. |
| Ordered spell n-grams / pathing heatmaps | Fingerprinting; RAF-adjacent. |
| Storing `intent` strings from enemy AI | Free text; already in local TURN logs. |

---

## 7. Admin Intelligence tab (UX)

- New tab key `intelligence` on `AdminDashboard` (lazy-loaded with the rest).
- **Backend `#admin` on every read.** Same gate as other admin writes.
- Carved-stone / dark slate / crimson — match existing tabs (`DESIGN.md`).
- Sections: Population (P-001/P-008), Economy (P-004/P-005), Combat (C-*), Spells (S-*), Content (N-*), Quality (Q-*).
- Empty state: “No increment sidecar yet — snapshot queries only” until Phase 1.
- No principal search. No “inspect this player” from this tab.
- Dev-only extras (raw key dump) stay behind `import.meta.env.DEV` **and** `#admin`.

---

## 8. Implementation constraints (when a later agent implements)

1. Canonical actor only: `src/backend/main.mo`. Do not add maps to `backend_extended/`.
2. Client module must be **outside** `WorldExploration.tsx` as much as possible (that file is already ~19k lines). Flush from existing outcome helpers (`rewardResolver`, `deathPenalty`, `bossRushProgress`, `challengeCompletion`) after they return.
3. Tests: sidecar swallows throws; increment API never appears in persist-lock unit tests as a required mock; fail-open if `actor.recordTelemetryIncrements` is missing (mock actor).
4. Bindgen after Candid change (`pnpm bindgen`). Every `CharacterStats` field rule is unchanged — telemetry must not ride on `updateCharacter`.
5. `pnpm typecheck` / `pnpm fix` / `pnpm build` must stay clean.
6. Do not modify RAF, map generation, turn logic, or damage math to “make metrics easier.”

---

## 9. How the Quality Auditor should consume this

Until Phase 1 exists, keep classifying player outcomes **INCONCLUSIVE**.  
After Phase 1, cite `quality.persist.*.ok|fail`, `combat.outcome.*`, `quality.death_penalty.*`, `quality.recap.opened` for the week window.  
Do not treat a missing increment as a gameplay regression.

Related ledger entry: `AQA-2026-08-30-012` (still NEW). This document supplies the architecture that entry asked a human/director to design.
