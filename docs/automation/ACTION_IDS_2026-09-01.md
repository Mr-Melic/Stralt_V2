# ACTION_IDs — 2026-09-01 Telemetry-Driven Balance & Content Analyst

Durable ledger for the Master Technical Director and Report Action Orchestrator.  
Source: Telemetry-Driven Balance & Content Analyst (`2786666f-a4a0-11f1-a7d1-d6b4613131ce`).  
Full report: [`TELEMETRY_BALANCE_2026-09-01.md`](./TELEMETRY_BALANCE_2026-09-01.md).  
This run ships **docs only**. No balance or collector implementation.

---

## Still-open IDs (not re-filed)

| ACTION_ID | STATUS | Notes |
| :--- | :--- | :--- |
| `AQA-2026-08-30-012` | NEW | Smallest persist/victory/recap/shop counters. Still unimplemented at HEAD `dd275aa`. |
| `TBC-2026-08-31-001` | NEW | Keep this analyst gated until real rows exist. Validation from that ID: this report is still `WAITING_FOR_TELEMETRY` with a fresh search. |
| `TBC-2026-08-31-002` | NEW | Human-designed `battle_end` / `spell_cast` / discovery / Doka ledger set. Depends on AQA-012. |

Do not open a second persist-counter PR. Do not implement gameplay from this file unless a later human or orchestrator explicitly picks an ID.

---

ACTION_ID: TBC-2026-09-01-001  
SOURCE_AUTOMATION: Telemetry-Driven Balance & Content Analyst  
TITLE: Do not treat design docs, longHorizonSim, or debug click-trace as live telemetry  
CATEGORY: telemetry  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: After the 2026-08-31 TBC run, `TELEMETRY_ARCHITECTURE_2026-08-31.md`, `TELEMETRY_DASHBOARD_2026-08-31.md`, and `longHorizonSim.ts` landed. Architecture/dashboard texts state they are design-only and that increment APIs are unimplemented. `longHorizonSim.ts` 432–437 sets `telemetry.available: false`; `longHorizonSim.test.ts` asserts that. `clickTrace.ts` is DEV-only (capacity 20, local). `src/backend` still has no `recordTelemetryIncrements`. Open collector PRs: 0.  
SYSTEMS_AFFECTED: Master Technical Director priority queue; Quality Auditor / Game Balance specialists; this analyst’s next cron  
RECOMMENDED_ACTION: When scoring or scheduling 2026-09-01 work, classify those artifacts as DESIGN / SYNTHETIC / DEBUG. Do not open enemy, spell, XP, or Doka retune PRs from them. Leave TBC in WAITING_FOR_TELEMETRY until collectors 1–9 exist and ≥1 UTC day of rows is queryable.  
AUTONOMY: REPORT_ONLY  
DEPENDENCIES: None  
REGRESSION_RISK: LOW (documentation / priority hygiene only).  
VALIDATION_REQUIRED: Next director or TBC run either still cites WAITING_FOR_TELEMETRY, or cites real event counts with sample sizes — not sim output.  
STATUS: NEW
# ACTION_IDs — 2026-09-01 Long-Horizon Infinite Progression Simulator
Durable ledger for implementers and the Report Action Orchestrator.  
Source of every record: Long-Horizon Infinite Progression Simulator.  
Narrative: [`LONG_HORIZON_2026-09-01.md`](./LONG_HORIZON_2026-09-01.md).  
Harness: `src/frontend/src/utils/longHorizonSim.ts`.
Do not implement gameplay from this file unless a later human or orchestrator explicitly picks an ID. This run ships **observation only** — no curve redesign.
Prior IDs `LHIPS-2026-08-31-001..014` remain NEW. This file adds IDs only where formulas moved or a new failure became visible.
ACTION_ID: LHIPS-2026-09-01-001  
SOURCE_AUTOMATION: Long-Horizon Infinite Progression Simulator  
TITLE: HUD XP threshold saturates at MAX_SAFE_INTEGER from level 48  
CATEGORY: technical  
PRIORITY: P0  
EVIDENCE: `xpForNextLevel` (`src/frontend/src/utils/xpCurve.ts` 32–36) returns `Number.MAX_SAFE_INTEGER` once `100n * (1n << (N-1))` exceeds `2^53-1`. First saturation is level 48 (exact need `1.407e16`; HUD shows `9.007e15`). Recap `needed` uses the same helper (`recapXpAfterGrant` 91–101; `WorldExploration.tsx` 13014–13027, 7505). Persist math stays exact via `xpThresholdBigInt` (24–26) and Motoko `100 * pow2(level-1)` (`main.mo` 1808–1812). `applyXpDelta(0, 48, 1)` stays `{ newXp: 1, newLevel: 48 }`. `Number(ok.newXp)` / `Number(ok.newLevel)` still coerce canister `Nat` (`applyRewardsResult.ts` 28–31). IEEE Infinity of the raw float `100 * 2^(N-1)` still appears at 1019 (`xpNeedExactAsNumber(1019)` is not finite); HUD no longer reports Infinity.  
FIRST_APPROXIMATE_PROBLEM_LEVEL: 48 (HUD lie); 1019 (exact Number overflow). Unreachable by official kill/portal/challenge income (see LHIPS-2026-08-31-001).  
CAUSE: HUD path was switched from raw Number (Infinity at 1019) to bigint-then-saturate so bars never become NaN. Saturation is earlier than the old hard stop and disagrees with persist.  
PLAYER_EFFECT: A synthetic or legacy level-48+ character sees a leftover bar against 9.01e15 while the canister still requires 1.41e16. Percent fill is permanently wrong. Official play hits the XP wall at 15–22 first.  
TECHNICAL_EFFECT: Frontend/backend leftover-need twins diverge at 48. `JSON.stringify` of HUD need is a safe integer, not `null`.  
SYSTEMS_AFFECTED: xpCurve.xpForNextLevel, recapXpAfterGrant, PostBattleRecap, leftover HUD, readApplyRewardsOk  
RECOMMENDED_ACTION: Do not retune the curve. If a human wants a truthful bar at 48+, format leftover/need as decimal text or bigint and stop saturating `xpForNextLevel`. Keep persist on `xpThresholdBigInt` / Motoko `Nat`.  
DEPENDENCIES: LHIPS-2026-08-31-001; supersedes the Infinity-at-1019 display claim in LHIPS-2026-08-31-002  
REGRESSION_RISK: HIGH — leftover HUD and recap already had an off-by-one that blocked level-ups.  
VALIDATION_REQUIRED: `xpForNextLevel(47) < MAX_SAFE_INTEGER`; `xpForNextLevel(48) === MAX_SAFE_INTEGER`; recap `needed` at 48 vs `Number(xpThresholdBigInt(48))`. Re-run `longHorizonSim.test.ts`.  
STATUS: NEW  
ACTION_ID: LHIPS-2026-09-01-002  
SOURCE_AUTOMATION: Long-Horizon Infinite Progression Simulator  
TITLE: applyRewards 100k/500k ceilings truncate official jackpot and stacked boss XP  
CATEGORY: economy  
PRIORITY: P0  
EVIDENCE: Canister rejects `dokaDelta > 100_000` and `xpDelta > 500_000` (`src/backend/main.mo` 1798–1799). Official client clamps before the call (`applyRewardsResult.ts` 46–61). Victory Doka still rolls `roll < 0.0001` × uniform `1..1e9` × `enemy.level` (`WorldExploration.tsx` 12951–12977; comment still says 0.0001%). Mean unclamped jackpot at enemy 1 is `5.5e9`; persist if hit is **100_000** at every simulated level. Recap now shows the clamped pair (13010–13027) — the old `(level)*100` leftover lie is gone. Stacked official XP `3 * L * 20 * 6 * 1.5` (Enthroned Void `rewardXpMultiplier` 6 at `bossDefaults.ts` 755, plus XP boost 1.5 at WX 12937–12940) exceeds 500_000 from enemy **926**; at the 1020 spawn cap that stack is 550_800 → persist 500_000. Dungeon ×4 applies to Doka only on this path (`PREAPPLIED_REWARD_MULTIPLIER`, WX 13109).  
FIRST_APPROXIMATE_PROBLEM_LEVEL: 1 (every jackpot hit is truncated); 926 (Void + XP-boost XP clamp)  
CAUSE: Per-call mint guard was added so a raw client cannot Nat-max. Official jackpot and the top boss+boost stack were not resized to fit.  
PLAYER_EFFECT: Jackpot is a 100k ticket, not a billion-mint. Late Void+boost victories silently lose ~50k XP versus the unclamped formula. Recap matches persist (clamped). Mid-rare Doka bands at high enemy level also saturate the 100k fight cap.  
TECHNICAL_EFFECT: Wallet inflation is ceilinged at 100k Doka per `applyRewards` call. `Number(enemy.level * 1e9)` stays inside `MAX_SAFE` because enemy level caps near 1020.  
SYSTEMS_AFFECTED: main.mo applyRewards, clampApplyRewardsDeltas, handleBattleEnd Doka table, PostBattleRecap  
RECOMMENDED_ACTION: Report only. Do not retune jackpot or the ceiling here. If a human picks this ID, either shrink the jackpot table to fit 100k or raise the official-client ceiling to the documented max official stack — not both independently.  
DEPENDENCIES: LHIPS-2026-08-31-012 (jackpot table unchanged; persist contract moved)  
REGRESSION_RISK: HIGH — unclamping re-opens the reject-whole-call bug the ceiling fixed; shrinking jackpot changes the wallet.  
VALIDATION_REQUIRED: `clampApplyRewardsDeltas(1e12, 550800)` → `{ 100000, 500000 }`; recap `dokaEarned` after a jackpot fixture; Void+boost XP at enemy 926 vs 925.  
STATUS: NEW  
ACTION_ID: LHIPS-2026-09-01-003  
SOURCE_AUTOMATION: Long-Horizon Infinite Progression Simulator  
TITLE: Formula AP/MP exceed silent saveBattleStats clamp of 20 at level 325  
CATEGORY: technical  
PRIORITY: P1  
EVIDENCE: Battle AP/MP init uses `getPlayerBaseStats` (`progression.ts` 71–72, `WorldExploration.tsx` 12669–12680): `8 + floor(L/25)` / `4 + floor(L/25)`. First AP 21 at level 325. `saveBattleStats` writes `safeAp/safeMp = _minNat(..., 20)` (`main.mo` 1734–1735) and **cannot raise** level (`writeLevel` 1769). `updateCharacter` is cosmetics-only (422–425). Debug already warns when persisted AP/MP diverge from formula (WX 12681–12688). Spell fail hits 0 at 201 (WX 3664–3668). Spell range saturates at `maxSpellRange` 5 by the teens (3671–3682).  
FIRST_APPROXIMATE_PROBLEM_LEVEL: 201 (fail=0); 325 (AP persist clamp)  
CAUSE: Persist validators and the live formula were not updated together. The old unconstrained `saveBattleStats.level` skip is closed; the AP/MP cap was converted from reject to silent clamp.  
PLAYER_EFFECT: A 325+ character fights with AP 21+ and stores 20. Next battle still uses the formula, so play is not stuck at 20 — only the persisted snapshot is wrong. Fail chance and range stop being progression knobs much earlier. Extreme levels are no longer reachable via heal/death persist.  
TECHNICAL_EFFECT: Official-client trust on `saveBattleStats.level` as a skip path is gone. Synthetic 1000/2500 rows now require `applyRewards` grinding (blocked by 001) or legacy canister rows.  
SYSTEMS_AFFECTED: saveBattleStats, getPlayerBaseStats, battle AP init, spell fail/range  
RECOMMENDED_ACTION: Architecture decision, not a silent raise of the 20 cap. Do not implement here.  
DEPENDENCIES: LHIPS-2026-08-31-013 (level-skip claim closed; AP remainder remains)  
REGRESSION_RISK: HIGH if the 20 cap is lifted without a paired Motoko + battle-init update.  
VALIDATION_REQUIRED: formula AP at 300/325; saveBattleStats of maxAp 21 stores 20; battle init at 325 still 21.  
STATUS: NEW  
ACTION_ID: LHIPS-2026-09-01-004  
SOURCE_AUTOMATION: Long-Horizon Infinite Progression Simulator  
TITLE: Leftover XP is unbounded Nat; frontend Number and Motoko pow2 do not scale  
CATEGORY: technical  
PRIORITY: P1  
EVIDENCE: After the practical wall, leftover XP grows by official deltas and never wraps (`applyRewards` 1803–1818). Frontend `readApplyRewardsOk` does `Number(ok.newXp)` (`applyRewardsResult.ts` 28–31); `toNatXp` re-floors that Number (`xpCurve.ts` 19–21). Integers above `2^53` are not exact. Motoko `pow2(n)` is a `while (i < n) { r *= 2 }` on **every** applyRewards call (1808–1808) using `n = level-1`. `xpDelta` is now ≤ 500_000 so the wrap loop cannot run away, but computing `2^(level-1)` at a stored high level is O(level) multiplies of a growing Nat. `applyXpDelta` also stops after 100_000 wraps (`xpCurve.ts` 58–63). Death penalty 20% leftover uses `Number()` (`deathPenalty.ts` 95–103).  
FIRST_APPROXIMATE_PROBLEM_LEVEL: leftover `> 2^53` (precision); stored level thousands+ (pow2 trap). Official leftover at 19 is ~26e6 need / ~1k per fight — precision is far.  
CAUSE: Persist lock closed the skip-to-1018 path; leftover Nat and the pow2 helper were not given a size/iteration guard for synthetic or legacy high levels.  
PLAYER_EFFECT: Official players at the wall see leftover climb forever with a truthful-looking bar until 48. A legacy high-level row can instruction-trap `applyRewards` on the next portal +10.  
TECHNICAL_EFFECT: Frontend/backend leftover disagreement; possible Motoko instruction trap; death 20% of a rounded leftover.  
SYSTEMS_AFFECTED: applyRewards pow2, readApplyRewardsOk, applyXpDelta maxSteps, deathPenalty Number()  
RECOMMENDED_ACTION: Add an iteration/size guard on Motoko `xpToAdvance` without changing the published curve. Keep leftover as Nat/bigint on the HUD persist path. Do not implement here.  
DEPENDENCIES: LHIPS-2026-09-01-001; LHIPS-2026-08-31-002  
REGRESSION_RISK: HIGH — persist funnel.  
VALIDATION_REQUIRED: `Number` round-trip of leftover `2^53+1`; pow2(level-1) cost at 1 / 100 / 10000 (test-only, do not deploy a 10000-level row).  
STATUS: NEW  
# ACTION_IDs — 2026-09-01 Master Technical Director
Durable director ledger. Reuse existing IDs. Do not append specialist catalogs here.
**HEAD:** `dd275aa` (#182)  
**Prior director:** [`ACTION_IDS_2026-08-31.md`](./ACTION_IDS_2026-08-31.md) + [`MASTER_ROADMAP.md`](./MASTER_ROADMAP.md)  
**Gameplay / production code:** not modified this run.
Specialist IDs stay in their producer files (`ACTION_IDS_SDE_*`, `ACTION_IDS_MIMA_*`, `ACTION_IDS_ENEMY_BOSS_ADMIN_*`, orchestrator `ACTION_IDS_2026-08-31-0604/1200/1800.md`, etc.).
ACTION_ID: MTD-2026-08-31-001  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Halt same-hour P2/P3 implementer flock after a merge burst  
CATEGORY: automation-coherence  
EVIDENCE: Failed on 2026-08-31 (25+ agents; humans then merged three bursts). Recurred 2026-09-01 00:00–00:02 UTC: **34** automations including map integrity `9dcfd122`, combat parity `f37b7505`, adversarial QA `08e7de28`, security `c97e5c0c`, admin safety `7e907066`, test mill `81c2e934`, orchestrator `68f2958f`, plus expansion/AI/feel/admin/telemetry designers. P0 leftover #183 and ADR AQA-008 are still open.  
SYSTEMS_AFFECTED: all implementer automations; merge queue  
RECOMMENDED_ACTION: First-run and expansion specialists emit ACTION_IDs only. Do not open gameplay PRs this cycle unless unique, display-only, and not already drafted. Stagger crons. Pause map/combat/persist implementers 6 hours after a `main` merge that touches WX, `progressPersist`, `mapGen`, or `main.mo` rewards.  
AUTONOMY: HUMAN_CONFIG  
DEPENDENCIES: AQA-2026-08-30-001; AQA-2026-08-30-009  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Next director run sees ≤3 new gameplay PRs from this wave, and those PRs do not retouch persist / targeting / mapGen / WX.  
STATUS: OPEN  
ACTION_ID: MTD-2026-09-01-001  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Hold the 2026-09-01 00:00 specialist wave  
CATEGORY: automation-coherence  
EVIDENCE: 34 RUNNING agents listed this hour (see MASTER_ROADMAP). Yesterday the same pattern produced overlapping persist/targeting/mapGen PRs that later merged dirty and required #167/#169/#171/#175/#179/#181 cleanup.  
SYSTEMS_AFFECTED: merge queue; `WorldExploration.tsx`; `mapGen.ts`; `main.mo`; AdminDashboard  
RECOMMENDED_ACTION: Default HOLD any PR from this wave. Orchestrator may implement one unique display-only item. Designers update their own dated files; do not rewrite SDA/SDE/EBA schemas.  
AUTONOMY: HUMAN_CONFIG + review  
DEPENDENCIES: MTD-2026-08-31-001  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: No mapGen / persist-lock / targeting / enemyAI / AdminDashboard gameplay PR merges from this wave.  
ACTION_ID: AQA-2026-08-30-001  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Throttle the critical / high-severity bug hunter  
CATEGORY: automation-ops  
EVIDENCE: Reused. `996df6df` still not GetAutomation-visible. WX is 20,063 lines / 149 commits since 2026-08-24.  
SYSTEMS_AFFECTED: `996df6df-9d7a-11f1-a7d1-d6b4613131ce`; `WorldExploration.tsx`  
RECOMMENDED_ACTION: REDUCE_FREQUENCY to at most once per 12–24 hours; pause 6 hours after a `main` merge that touches WX or persist.  
AUTONOMY: HUMAN_CONFIG  
DEPENDENCIES: AQA-2026-08-30-002  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: ≤14 hunter runs/week.  
STATUS: OPEN  
ACTION_ID: AQA-2026-08-30-002  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Keep a single critical-bug automation  
CATEGORY: automation-ops  
EVIDENCE: Reused. `1aa41c6c` remains enabled and correctly opened unique #183 after the 19:07 burst. Volume problem is the rest of the flock, not this hunter’s last PR.  
SYSTEMS_AFFECTED: `1aa41c6c-a483-11f1-a7d1-d6b4613131ce`; `996df6df-9d7a-11f1-a7d1-d6b4613131ce`  
RECOMMENDED_ACTION: MERGE hunters. Keep one at AQA-001 cadence. Fold #183 into the human merge queue as the surviving critical PR.  
AUTONOMY: HUMAN_CONFIG  
DEPENDENCIES: AQA-2026-08-30-001  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Only one critical-bug automation ID fires per day.  
STATUS: OPEN  
ACTION_ID: MTD-2026-09-01-002  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Human merge #183 — death replay after portal or Doka-only credit  
CATEGORY: persist  
EVIDENCE: `resolvePendingDeathReplay` (`deathPenalty.ts` 426–449) writes only when both axes are still `pre`, or XP is `pre` and Doka already spent. Portal +10 or a Doka-only credit moves one axis above `pre`; reload **clears** the marker and the 20/40 cut never retries. #183 is +24/−0 on `deathPenalty.ts` + tests, clean vs `dd275aa`, unique among open PRs. #175 already on `main` (double-victory / cleanup).  
SYSTEMS_AFFECTED: `src/frontend/src/utils/deathPenalty.ts`  
RECOMMENDED_ACTION: Review/merge #183. Do not open a second death-replay PR. After merge, freeze death-penalty helpers except proven unique holes.  
AUTONOMY: HUMAN_REVIEW  
REGRESSION_RISK: MEDIUM if both axes above `pre` are recut (later earn). #183 keeps that as clear.  
VALIDATION_REQUIRED: Portal +10 then lava-reload still applies 20/40 to the credited snapshot; dual-axis victory credit still clears.  
ACTION_ID: MTD-2026-08-31-002  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Human merge queue — #114 then #107 clamp-only rebase  
CATEGORY: merge-hygiene  
EVIDENCE: Both themes are on `main` (#114 09:33; clamps via #107/#144/#171). `applyRewards` rejects `dokaDelta > 100_000` and `xpDelta > 500_000` (`main.mo` 1798–1799). `saveBattleStats` cannot raise Doka/XP (`main.mo` 1767–1768).  
SYSTEMS_AFFECTED: `main.mo`; persist callers  
RECOMMENDED_ACTION: CLOSED. Do not re-implement clamps. Leftover trust work is AQA-008 + MTD-2026-09-01-005.  
AUTONOMY: HUMAN_REVIEW  
DEPENDENCIES: AQA-2026-08-30-008  
REGRESSION_RISK: n/a  
VALIDATION_REQUIRED: n/a  
STATUS: IMPLEMENTED  
ACTION_ID: AQA-2026-08-30-008  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Convert the security 9-finding set into an architecture decision  
CATEGORY: security-architecture  
EVIDENCE: Reused. Clamp/no-mint is now on `main`. No written ADR. Finding 3 is still restated as “must not write Doka” by security runs. `writeLevel` still uses client `_level` when ≤ stored (`main.mo` 1769) despite the comment that level is ignored. `calculateAndAwardDoka` unused. `markAchievementUnlocked` still client-asserted. Shop 60s auto-complete still architecture. Security `c97e5c0c` is running this hour.  
SYSTEMS_AFFECTED: `src/backend/main.mo`; `docs/ARCHITECTURE.md`  
RECOMMENDED_ACTION: Write the ADR: (a) official-client trust + store-relative clamps (current de-facto), or (b) canister proofs. Rewrite finding 3. Then land MTD-2026-09-01-005. Do not open a third clamp PR.  
AUTONOMY: HUMAN_DECISION + reviewed docs PR  
DEPENDENCIES: MTD-2026-08-31-002 (done)  
REGRESSION_RISK: HIGH if APIs tighten without a frontend roll.  
VALIDATION_REQUIRED: ADR merged; security findings marked decided; `writeLevel` ignores client.  
STATUS: PARTIAL  
ACTION_ID: MTD-2026-09-01-005  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: saveBattleStats must ignore client level (stored level always wins)  
CATEGORY: persist  
EVIDENCE: `main.mo` 1688–1692 says applyRewards is the sole level writer and the client level argument is ignored. Line 1769: `writeLevel = if (_level > character.level) { character.level } else { _level }` — a stale lower client level after an in-flight `applyRewards` can drop the character. RAO-2026-08-31-1800-008 flagged remount leftover of the same class.  
SYSTEMS_AFFECTED: `src/backend/main.mo` `saveBattleStats`  
RECOMMENDED_ACTION: `writeLevel = character.level`. Keep `_level` in the signature for Candid compat. Tests: client level 5 / store 6 stays 6; client 7 / store 6 stays 6. Do not bundle with discovery or admin.  
AUTONOMY: HUMAN_APPROVE — Motoko reward path  
DEPENDENCIES: AQA-2026-08-30-008  
REGRESSION_RISK: LOW if only level is pinned; HIGH if bundled with Doka/XP rules.  
VALIDATION_REQUIRED: `mops check` / `caffeine check`; official heal/death still persist HP/Doka/XP cuts.  
ACTION_ID: MTD-2026-09-01-004  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Stop appending specialist catalogs to ACTION_IDS_2026-08-31.md  
CATEGORY: process  
EVIDENCE: File is ~4,200 lines. Header is SDA designer. Contains SDA, MTD, AQA, TADD, VAL, TBC, WDEAD, EED, PXA, GTAD, UX-*, AEE, AFDA, SDEG, RAO, AUX, WDD, LHIPS, MAA, GFCF. AQA-003 asked for one ledger; the result is unreadable. Producers already have dated files (SDE, MIMA, EBA, PERF, 0604/1200/1800).  
SYSTEMS_AFFECTED: `docs/automation/ACTION_IDS_*.md`  
RECOMMENDED_ACTION: UPDATE_PROMPT: each producer writes `ACTION_IDS_<PREFIX>_YYYY-MM-DD.md`. Director maintains this index + MASTER_ROADMAP. Do not append to the 08-31 dump.  
AUTONOMY: HUMAN_CONFIG  
DEPENDENCIES: AQA-2026-08-30-003  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Next wave adds 0 lines to ACTION_IDS_2026-08-31.md.  
ACTION_ID: AQA-2026-08-30-003  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Adopt an in-repo ACTION_ID ledger all producers write to  
CATEGORY: process  
EVIDENCE: Reused. Ledger exists and is now a dump yard (see MTD-2026-09-01-004). Dedup still fails (portal XP / targeting / persist twins).  
SYSTEMS_AFFECTED: all producer prompts  
RECOMMENDED_ACTION: Index + per-producer files. Refuse a second PR for an ID that is OPEN or matches an open PR theme.  
AUTONOMY: HUMAN_CONFIG  
DEPENDENCIES: MTD-2026-09-01-004  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Director can list OPEN P0/P1 without grepping 4k lines.  
STATUS: PARTIAL  
ACTION_ID: AQA-2026-08-30-006  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Freeze mapGen after #110 (and the 08-31 follow-up punches)  
CATEGORY: sensitive-code  
EVIDENCE: Reused. After #110, #155 #158 #164 #179 still edited `mapGen.ts` (988 → 1,348 lines). Guardian `9dcfd122` is RUNNING this hour. `AGENTS.md` still forbids map-generation edits.  
SYSTEMS_AFFECTED: `src/frontend/src/engine/mapGen.ts`  
RECOMMENDED_ACTION: Report-only (ACTION_IDs + failing seed fixtures) unless a human authorizes a playtested change. Close any 09-01 mapGen PR.  
AUTONOMY: HUMAN_CONFIG  
REGRESSION_RISK: HIGH if another punch lands without playtest.  
VALIDATION_REQUIRED: Next solvability run opens 0 mapGen PRs.  
STATUS: BROKEN  
ACTION_ID: AQA-2026-08-30-007  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Freeze drive-by WorldExploration edits  
CATEGORY: sensitive-code  
EVIDENCE: Reused. File is 20,063 lines; 149 commits since 2026-08-24. #180 wants another WX persist restack. Tonight’s feel / AI / expansion / invariant / combat agents will add more branches if allowed.  
SYSTEMS_AFFECTED: `WorldExploration.tsx`  
RECOMMENDED_ACTION: New behavior in `engine/*` or `utils/*` with tests; WX one-line wiring. Reject PRs whose primary hunk is another WX branch. Exception: #183 does not touch WX.  
AUTONOMY: HUMAN_CONFIG + review  
DEPENDENCIES: MTD-2026-09-01-002  
REGRESSION_RISK: MEDIUM — some remaining defects are still WX closures.  
VALIDATION_REQUIRED: Next week WX commit count under 20.  
STATUS: BROKEN  
ACTION_ID: MTD-2026-09-01-003  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Rebase #180 live-Doka helpers; do not merge dirty  
CATEGORY: persist  
EVIDENCE: `writeLiveDoka` / `creditLiveDoka` / `beginRename` / `shouldRollbackFailedShopSpend` are not on `main`. #180 implements them but is dirty vs `dd275aa`, based on `036600f`, and restacks WX credit/death/heal paths already patched by #167/#169/#175.  
SYSTEMS_AFFECTED: `itemShop.ts`; `renameCharacter.ts`; `WorldExploration.tsx`; `BuffShop.tsx`  
RECOMMENDED_ACTION: Hold. Rebase on post-#183 `main`. Keep helpers + tests; drop WX hunks already landed. Do not open a third persist PR.  
AUTONOMY: HUMAN_REVIEW  
DEPENDENCIES: MTD-2026-09-01-002  
REGRESSION_RISK: HIGH if merged dirty.  
VALIDATION_REQUIRED: Victory-then-heal cannot ghost Doka; rename double-click debits once; failed shop persist does not refund a later buy.  
ACTION_ID: MIMA-2026-08-31-001  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Swap landing skips lava, spikes, ice, and Void Rift walk damage  
CATEGORY: combat-correctness  
EVIDENCE: Reused. Reconfirmed on `dd275aa`. `swapPositions` (`WorldExploration.tsx` 10009–10021) still copies coordinates and does not call `applyBattleWalkHazards`. RAO-1800-002 still NEEDS_HUMAN_DECISION. Not drafted as a unique PR.  
SYSTEMS_AFFECTED: Swap; hazards; challenges  
RECOMMENDED_ACTION: Extract `applyHazardLanding` + tests; one WX call site. Do not change damage numbers. Do not grow WX without the helper.  
AUTONOMY: IMPLEMENT_AFTER_HUMAN  
DEPENDENCIES: AQA-2026-08-30-007  
REGRESSION_RISK: MEDIUM — must not double-charge a walk that already ran the stepper.  
VALIDATION_REQUIRED: Swap onto lava increments challenge damage; walk path still charges once.  
STATUS: OPEN  
ACTION_ID: MIMA-2026-08-31-002  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Player-controlled summon walk ignores occupancy and tile hazards  
CATEGORY: combat-correctness  
EVIDENCE: Reused. Reconfirmed on `dd275aa`. Controlled summon walk (`WorldExploration.tsx` 10583–10594) is `findPath` + `updateCombatant` with no `isCellFree` and no hazard landing.  
SYSTEMS_AFFECTED: summons; occupancy; hazards  
RECOMMENDED_ACTION: Same helper as MIMA-001. Reject occupied destinations; then land hazards.  
AUTONOMY: IMPLEMENT_AFTER_HUMAN  
DEPENDENCIES: MIMA-2026-08-31-001  
REGRESSION_RISK: MEDIUM  
VALIDATION_REQUIRED: Path onto occupied tile is a no-op; path onto lava commits store HP.  
STATUS: OPEN  
ACTION_ID: MTD-2026-08-31-003  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Controlled extraction of HP and death authority out of WorldExploration  
CATEGORY: architecture  
EVIDENCE: Reused. Cluster #78–#114 plus Swap/summon landing (MIMA-001/002). Dual authority remains. Do not start this in the 00:00 wave.  
SYSTEMS_AFFECTED: `combatantStore.ts`; `deathPipeline.ts`; `battleSetup.ts`; WX  
RECOMMENDED_ACTION: After #183 and MIMA landing helper. One scoped PR. No RAF / mapGen / damage-formula changes.  
AUTONOMY: IMPLEMENT_AFTER_HUMAN  
DEPENDENCIES: MTD-2026-09-01-002; MIMA-2026-08-31-001  
REGRESSION_RISK: HIGH if bundled with targeting or persist.  
VALIDATION_REQUIRED: Engine tests for plague / DoT / lava / reflect / swap-landing / last-hostile.  
STATUS: OPEN  
ACTION_ID: MTD-2026-08-31-004  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Freeze content / AI / feel / admin implementation until P0/P1 settle  
CATEGORY: expansion-gating  
EVIDENCE: Reused. Design catalogs from 08-31 are on `main` (correct). Gameplay from those catalogs is still blocked: no ownership persist, zone-0 kits, no ADR, flock active.  
SYSTEMS_AFFECTED: expansion / AI / feel / admin implementers  
RECOMMENDED_ACTION: Docs and ACTION_IDs only until #183 + ADR + landing helper exist.  
AUTONOMY: HUMAN_CONFIG  
DEPENDENCIES: MTD-2026-09-01-001  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: No SDA/SDE/EBA/AI gameplay PR from the 09-01 wave.  
STATUS: OPEN  
ACTION_ID: AQA-2026-08-30-005  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Stop the test-clone mill  
CATEGORY: automation-ops  
EVIDENCE: Reused. #100/#101/#106 merged or closed in the 10:14 burst. #173 is a stale restack on `bcb0721`. Test builder `81c2e934` is RUNNING this hour.  
SYSTEMS_AFFECTED: `src/frontend/src/**/*.test.ts`  
RECOMMENDED_ACTION: Close or hold #173. New tests only lock a unique merged contract.  
AUTONOMY: HUMAN_REVIEW  
REGRESSION_RISK: LOW if closed; MEDIUM if merged dirty.  
VALIDATION_REQUIRED: 0 clone suites referencing removed exports.  
STATUS: OPEN  
ACTION_ID: AQA-2026-08-30-009  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Orchestrator must not implement gameplay  
CATEGORY: automation-ops  
EVIDENCE: Reused. 06:04/12:00/18:00 implemented unique display (feat recap, recap click-through, vitals jewels) — acceptable. Orchestrator `68f2958f` is RUNNING this hour and must not restack persist/combat.  
SYSTEMS_AFFECTED: `68f2958f-a489-11f1-a7d1-d6b4613131ce`  
RECOMMENDED_ACTION: ACTION_IDs + at most one unique display-only item.  
AUTONOMY: HUMAN_CONFIG  
DEPENDENCIES: MTD-2026-09-01-001  
REGRESSION_RISK: MEDIUM if it implements persist.  
VALIDATION_REQUIRED: Orchestrator PR (if any) is display-only and unique.  
STATUS: PARTIAL  
ACTION_ID: AQA-2026-08-30-010  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Dedup persist / economy implementers  
CATEGORY: automation-ops  
EVIDENCE: Reused. Official-client races largely on `main`. Leftovers are #183 (unique) and #180 (dirty). Economy hunter `1e548d83` produced #175 (merged).  
SYSTEMS_AFFECTED: persist / economy automations  
RECOMMENDED_ACTION: ACTION_IDs only if a race is already drafted. Do not open a third clamp.  
AUTONOMY: HUMAN_CONFIG  
DEPENDENCIES: MTD-2026-09-01-002; MTD-2026-09-01-003  
REGRESSION_RISK: HIGH if another persist rewrite lands.  
VALIDATION_REQUIRED: At most one open persist PR.  
STATUS: PARTIAL  
ACTION_ID: AQA-2026-08-30-012  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Outcome telemetry before any dashboard  
EVIDENCE: Reused. Still no collectors. TBC-2026-08-31-001 WAITING_FOR_TELEMETRY. Dashboard specialist `4b026695` and architecture `047ac8a1` are RUNNING this hour. `longHorizonSim.telemetry.available === false`.  
SYSTEMS_AFFECTED: future counters; Admin telemetry UI  
RECOMMENDED_ACTION: Design + tiny persist-lock-enqueued counters first. No dashboard UI. No balance labels.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: None for design; persist freeze for any writer  
REGRESSION_RISK: HIGH if a second persist path is invented.  
VALIDATION_REQUIRED: Zero CLEAR_POSITIVE_SIGNAL claims until rows exist.  
STATUS: OPEN  
ACTION_ID: TBC-2026-08-31-001  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Keep balance analyst gated until telemetry rows exist  
EVIDENCE: Reused. No collectors on `dd275aa`. Do not infer balance from source.  
SYSTEMS_AFFECTED: Telemetry-Driven Balance automation `2786666f`  
RECOMMENDED_ACTION: STATUS WAITING_FOR_TELEMETRY. No BAL-* implementation.  
AUTONOMY: HUMAN_CONFIG  
DEPENDENCIES: AQA-2026-08-30-012  
REGRESSION_RISK: HIGH if formulas change without data.  
VALIDATION_REQUIRED: No OVERPERFORMING labels.  
STATUS: OPEN  
ACTION_ID: SDA-2026-08-31-002  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Split catalog from ownership; persist owned and observed spell ids  
CATEGORY: ownership-persist  
EVIDENCE: Reused. `ownedSpells` is still starters ∪ filtered backend (`WX` ~2410). Admin add still grants everyone. Blocks meaningful telemetry-by-acquisition-path.  
SYSTEMS_AFFECTED: `main.mo`; spellbook; WX ownedSpells  
RECOMMENDED_ACTION: After P0/P1 persist freeze. Do not implement from the 09-01 wave. Canonical persist shape; SDE/EBA/SPELL_DISCOVERY cards attach later.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: SDA-2026-08-31-001; MTD-2026-08-31-004  
REGRESSION_RISK: HIGH  
VALIDATION_REQUIRED: New character owns only base ids; admin catalog add does not hydrate into others’ books.  
STATUS: OPEN  
ACTION_ID: SDA-2026-08-31-004  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Implement enemy-discovery default (cast → observe → win → unlock)  
CATEGORY: discovery-pipeline  
EVIDENCE: Reused. Still no `recordSpellObservation`. Core Stralt rule. Must enqueue on persist lock; must not use `spell.name`.  
SYSTEMS_AFFECTED: enemy cast hook; persist lock; recap  
RECOMMENDED_ACTION: Blocked on SDA-002/003 and persist quiet.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: SDA-2026-08-31-002; SDA-2026-08-31-003  
REGRESSION_RISK: HIGH if granted off the lock.  
VALIDATION_REQUIRED: Cast-then-flee observes without unlock; cast-then-win unlocks once.  
STATUS: OPEN  
ACTION_ID: MTD-2026-08-31-006  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Admin Draft → Validate → Activate on the canister  
CATEGORY: admin-pipeline  
EVIDENCE: Reused. Dashboard 7,737 lines. Hard delete still exists historically; #165 hardened some retirement. Not a canister publish workflow. EBA/SDA/WORLD_ENCOUNTER designs overlap — pick SDA-005 lifecycle, do not grow chrome first.  
SYSTEMS_AFFECTED: `main.mo` admin; AdminDashboard  
RECOMMENDED_ACTION: Canister states first; UI second. Hold 09-01 admin implementers.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: SDA-2026-08-31-005; AQA-008  
REGRESSION_RISK: HIGH if hard-delete remains.  
VALIDATION_REQUIRED: Retire does not strip owned levels.  
STATUS: OPEN  
ACTION_ID: MTD-2026-08-31-005  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Wire saveKillCount or drop it from the leaderboard  
CATEGORY: persistence  
EVIDENCE: Reused. Hook in `useLeaderboardQueries.ts`; no UI caller. Canister rejects `kills > 64`.  
SYSTEMS_AFFECTED: leaderboard; `saveKillCount`  
RECOMMENDED_ACTION: One caller on attributed player-side kills **or** remove from HUD. Not tonight.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: persist freeze  
REGRESSION_RISK: MEDIUM if it races `applyRewards`.  
VALIDATION_REQUIRED: Allied summons never increment.  
STATUS: OPEN  
ACTION_ID: MTD-2026-08-31-008  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Revisit computeAITier 30% full-random roll  
CATEGORY: design  
EVIDENCE: Reused. `combatMath.ts` 48–50 unchanged. Contradicts progressively sophisticated enemies. Do not rewrite `enemyAI.ts`.  
SYSTEMS_AFFECTED: `computeAITier`  
RECOMMENDED_ACTION: Design decision: variance within adjacent tiers, not uniform 1–10.  
AUTONOMY: HUMAN_DECISION  
DEPENDENCIES: MTD-2026-08-31-004  
REGRESSION_RISK: HIGH if bundled with an AI rewrite.  
VALIDATION_REQUIRED: Report only until human picks.  
STATUS: OPEN  
ACTION_ID: MTD-2026-08-31-007  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Enemy-observed spell discovery design (canonical persist shape)  
CATEGORY: design  
EVIDENCE: Reused. SDA-002/004 is the persist shape. Do not author a fifth schema this hour (SDE / SPELL_DISCOVERY / EBA already exist).  
SYSTEMS_AFFECTED: design docs only  
RECOMMENDED_ACTION: Point implementers at SDA-002/004. Mark overlapping docs as content cards.  
AUTONOMY: DOCS_ONLY  
DEPENDENCIES: SDA-2026-08-31-002  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: No new discovery schema file from the 09-01 wave.  
STATUS: OPEN  
ACTION_ID: EXPANSION-PREREQ-A  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Pass a numeric zone into buildEnemyKit  
CATEGORY: content-infrastructure  
EVIDENCE: Reused from `EXPANSION_PROPOSALS_2026-08-31.md` PREREQ-A. `buildEnemyKit` does `Math.floor(levelZone)` on an object → `NaN` → zone-0 kits forever. Unblocks dynamic pools without an AI rewrite.  
SYSTEMS_AFFECTED: battle-start kit assign; `enemyAI.ts`  
RECOMMENDED_ACTION: After flock hold. One call site + unit test. WX one-line. Do not invent new kits in the same PR.  
AUTONOMY: IMPLEMENT_AFTER_HUMAN  
DEPENDENCIES: MTD-2026-08-31-004; AQA-2026-08-30-007  
REGRESSION_RISK: MEDIUM — zone-1 kits suddenly appear.  
VALIDATION_REQUIRED: Zone 0 pawn kit unchanged; zone ≥1 adds the advanced id.  
STATUS: OPEN  
ACTION_ID: SDA-2026-08-31-007  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Seed frontend starter ids into the canister catalog  
CATEGORY: catalog-sync  
EVIDENCE: Reused. Dual catalogs remain. `upgradeSpell("physical_attack")` still fails if purged. Blocked on SDA-001 type alignment and a canister upgrade.  
SYSTEMS_AFFECTED: `AdminLib.defaultSpells`; purge list; `upgradeSpell`  
RECOMMENDED_ACTION: After ADR/type work. Not the 09-01 wave.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: SDA-2026-08-31-001  
REGRESSION_RISK: HIGH if purge still drops `physical_attack`.  
VALIDATION_REQUIRED: `upgradeSpell` on Strike and a summon returns `#ok`.  
STATUS: OPEN  
ACTION_ID: MTD-2026-08-31-009  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Leftover XP HUD on selection / top bar / recap  
CATEGORY: display  
PRIORITY: P3  
EVIDENCE: #108 / #138 / #178-class HUD work is on `main`. Recap uses `xpForNextLevel`.  
SYSTEMS_AFFECTED: HUD / recap  
RECOMMENDED_ACTION: CLOSED. Do not re-implement.  
AUTONOMY: n/a  
DEPENDENCIES: none  
REGRESSION_RISK: n/a  
VALIDATION_REQUIRED: n/a  
STATUS: IMPLEMENTED  
ACTION_ID: RAO-2026-08-31-1800-001  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Side-panel vitals jewels use live HP/AP/MP caps  
CATEGORY: display  
PRIORITY: P3  
EVIDENCE: #178 merged 19:08 UTC.  
RECOMMENDED_ACTION: CLOSED.  
STATUS: IMPLEMENTED  
ACTION_ID: MIMA-2026-08-31-003  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Ignore canvas walk / hazard clicks while the app-root recap is open  
CATEGORY: display / input  
PRIORITY: P3  
EVIDENCE: #166 merged (`shouldIgnoreWorldInputDuringRecap`).  
RECOMMENDED_ACTION: CLOSED. Measure later via AQA-012; do not re-patch.  
STATUS: IMPLEMENTED  
ACTION_ID: RAO-2026-08-31-1200-001  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Recap click-through gate  
CATEGORY: display / input  
PRIORITY: P3  
EVIDENCE: Same as MIMA-003 / #166.  
STATUS: IMPLEMENTED  
# ACTION_IDs — 2026-09-01 (Player Experience Coherence Auditor)
**Source:** Player Experience Coherence Auditor (`30118f7c-a49e-11f1-a7d1-d6b4613131ce`)  
**HEAD:** `dd275aa`  
**Narrative:** [`PX_COHERENCE_AUDIT_2026-09-01.md`](./PX_COHERENCE_AUDIT_2026-09-01.md)
Prior PX records `PXA-2026-08-31-001` … `015` in [`ACTION_IDS_2026-08-31.md`](./ACTION_IDS_2026-08-31.md) are **still open**. Do not re-file them.
Do not implement from this file unless a human or the Report Action Orchestrator picks an ID.
ACTION_ID: PXA-2026-09-01-001  
SOURCE_AUTOMATION: Player Experience Coherence Auditor  
TITLE: Make the Enemies register describe only rules the engine runs  
CATEGORY: encounter-honesty  
EVIDENCE: World HUD **Enemies** (`WorldExploration.tsx` 18211–18224) opens `EnemyRegister.tsx`. `MONSTERS` 22–83 teach wall-phase, elemental weaknesses, evasion, magic immunity, poison stacks, burning **tiles**, HP regen, earth-weak, storm clouds. Live family overlay (`WorldExploration.tsx` 6448–6537) is a 30% stat/pixel roll over seven ids. Only three have combat hooks, and they do not match the card: Ember Knight applies a 3/3 melee DoT (17224–17238), not burning tiles; Tide Shade applies −1 MP / 2 turns on melee (17240–17255), not adjacent slow + regen + lightning weakness; Void Mirror reflects 25% of pre-mitigation damage (`castHelpers.ts` 326–336), not “immune to magic until physical.” Crimson Spawn / Shadow Lurker / Storm Caller are **not in the roll**. Archbishop tip (90) claims invulnerability while pawns live — that is unused rush-pair copy (`useBossRush.ts` 31–32), not `BossAbility`. `evasion` is persist-only (`combatMath.ts` has no reader). Combat has no earth/lightning weakness table. This is a player-facing rule card for a different game. EBA-2026-08-31-024 would wire the same panel to admin lore and make the lie data-driven.  
SYSTEMS_AFFECTED: enemies, visual feedback, bosses, AI, admin-enabled content  
RECOMMENDED_ACTION: REWORK. Rewrite Register (and Boss tips that invent pair rules) so each line is traceable to `buildEnemyKit`, a family hook, or a `BossAbility`. Promote Ember / Tide / Void hooks to explicit kit metadata (not `family === "ember_knight"` name tests). Remove elemental / evasion / immunity sentences until combat implements them. Do not implement EBA-024 until this card is honest. Fold leftover family names into PXA-007’s single poster.  
AUTONOMY: HUMAN_DESIGN_REQUIRED  
DEPENDENCIES: PXA-2026-08-31-007 (one poster); PXA-2026-08-31-003 (do not teach unused rush pairs as general boss rules); blocks EBA-2026-08-31-024  
REGRESSION_RISK: LOW for copy-only. MEDIUM if family hooks move into kits without retargeting `BOSS_KITS` / `ENEMY_KITS`.  
VALIDATION_REQUIRED: Every Register sentence has a cited engine path. A Wraith Bishop does not drain MP unless that hook exists. Spectate Ember melee: card says burn DoT, not tiles. Typecheck clean.  
ACTION_ID: PXA-2026-09-01-002  
SOURCE_AUTOMATION: Player Experience Coherence Auditor  
TITLE: Modifier announce, admin labels, and live hooks must be the same sentence  
CATEGORY: world-events  
EVIDENCE: Paper Windstorm announce is “ranged spell reach halved” (`mapModifiers.ts` 249–257); registry comment says targeting applies ×0.5; `targeting.ts` has no windstorm branch. Live WX is `isPaperWindstorm && spellRange > 1 && Math.random() < 0.5` miss (16926–16930; enemy path 17164). Blood Moon announce is flavor (`mapModifiers.ts` 261–267, hook marked placeholder) while `spellEngine.ts` 895 applies ×1.25 to non-heals; admin label claims “−25% heal” (`AdminDashboard.tsx` 4485) — no heal cut exists. Gravity Well / Fog of War announce and admin labels claim push/pull and 3-tile hide (4484–4486); registry hooks are empty (280–296); WX stores `_isGravityWell` / `_isFogOfWar` (2326–2328) unused. Frozen Terrain admin claims “LoS +1” (4494–4495); engine is `onMpCost * 2` only (164–172), identical to Slime Flood. AFDA-2026-08-31-016 owns **id-list** drift; this ID owns **rule-card** drift on ids that already roll. Violates “comprehensible encounter rules” and “admin-enabled content changes.”  
SYSTEMS_AFFECTED: world events, admin-enabled content, visual feedback, challenges  
RECOMMENDED_ACTION: REWORK copy immediately: Paper Windstorm announce = “ranged spells miss half the time”; Blood Moon announce = “+25% non-heal damage” (drop −25% heal from admin). DEPRECATE or implement Gravity Well / Fog of War (no announce, no admin label, no roll until a hook exists). MERGE Frozen into Slime or give Frozen a real extra rule. Cap at one player-facing modifier unless a named dungeon rule (PXA-008).  
AUTONOMY: ORCHESTRATOR_MAY_DRAFT for announce/admin string fixes only; HUMAN_DESIGN_REQUIRED to implement or delete empty ids  
DEPENDENCIES: PXA-2026-08-31-008 (slim the set); AFDA-2026-08-31-016 (dropdown = registry ids)  
REGRESSION_RISK: LOW for string-only. MEDIUM if empty ids are removed from a live canister roll table without a migrate.  
VALIDATION_REQUIRED: Announce text, Map Effects description, and admin label match the hook that fired. Paper Windstorm never changes range. Blood Moon does not reduce heals. Gravity/Fog never appear until implemented.  
ACTION_ID: PXA-2026-09-01-003  
SOURCE_AUTOMATION: Player Experience Coherence Auditor  
TITLE: Do not stack the World Dynamics catalog on 22 modifiers or a second discovery path  
CATEGORY: world-events  
EVIDENCE: `worldFeatures.ts` 1–18 is an unwired catalog. `WORLD_DYNAMICS.md` 43 keeps the live 22-modifier two-roll **and** adds up to `MAX_ROLLED_FEATURES` (3) extra tile/encounter/event rolls (`worldFeatures.ts` 30, 875–893). WDD-2026-08-31-001 tells a later implementer to overlay `pickWeightedFeatures` after finalize. Rune Bearer (`worldFeatures.ts` 499–516) grants a **map-only attune** of an enemy spell id — a second discovery language beside the gifted innate book (PXA-001) and the designed observe→win→unlock (SDE). Blood Altar (528–541) adds a fourth “Blood” (unused HUD bar, Blood Moon, Blood Mend, altar). Live maps already fail the “learnable event list” test (PXA-008, PXA-2026-09-01-002). Stacking a third language answers none of the four PX questions; it adds explanation load.  
SYSTEMS_AFFECTED: world events, spell discovery, dungeons, rewards, visual feedback  
RECOMMENDED_ACTION: MERGE or hold. Keep the catalog as design notes. Do not wire `pickWeightedFeatures` onto the current 22. After PXA-008 slims live events and PXA-001 picks one discovery path, promote at most a short list of *new* decisions (risk tiles that use % max HP are the ones that stay relevant with no cap). Kill or rename Blood Altar until Blood is a real spend. Do not ship Rune Bearer attune as a substitute for observe→win→unlock.  
AUTONOMY: HUMAN_DESIGN_REQUIRED  
DEPENDENCIES: PXA-2026-08-31-001; PXA-2026-08-31-008; PXA-2026-09-01-002; supersedes WDD-2026-08-31-001’s “later implementer may overlay” for production  
REGRESSION_RISK: LOW while unwired. HIGH if overlay lands in `mapGen.ts` or WX without a solvability re-check (AGENTS.md forbids casual mapGen).  
VALIDATION_REQUIRED: No `pickWeightedFeatures` caller in spawn/map install. Death Realm still rolls empty. A design review picks one discovery path before any attune tile.  
# Game Feel ACTION_IDs — 2026-09-01
**SOURCE_AUTOMATION:** Game Feel & Combat Feedback Director  
**Companion audit:** `docs/automation/GAME_FEEL_AUDIT_2026-09-01.md`
Prior IDs `GFCF-2026-08-31-001` … `015` live in `ACTION_IDS_2026-08-31.md`. This file records this run’s implementations and **new unique** recommendations only. Do not re-open 003–005 / 009–015 as NEW.
ACTION_ID: GFCF-2026-08-31-006  
SOURCE_AUTOMATION: Game Feel & Combat Feedback Director  
TITLE: Float walk rejects (no MP / unreachable)  
CATEGORY: combat-feedback  
EVIDENCE: Battle walk (WX mouse ~11123 / touch ~11759) returned on `currentBattleMp <= 0`, wall/void, `!reachable`, empty path, and `cost > currentBattleMp` with no float. Occupied already said `"Occupied"`. Hover MP (WX ~9150) still uses Manhattan `dist`, not `findPath.length`. Post-fix: `spawnWalkRejectFloat` on those five returns (mouse + touch). Hover path cost left unchanged (RAF-hot).  
SYSTEMS_AFFECTED: `engine/walkRejectCopy.ts`; WorldExploration walk click/touch only  
RECOMMENDED_ACTION: IMPLEMENT. Float `"No MP"` / `"Can't walk there"` / `"Can't reach"` / `"Not enough MP"`. Do not change `findPath` or `MOVEMENT_DURATION`.  
AUTONOMY: IMPLEMENTED_THIS_PR  
REGRESSION_RISK: LOW — copy only. Hover label can still disagree with path cost (ANTICIPATION leftover; do not pathfind every RAF frame).  
VALIDATION_REQUIRED: 0 MP click → “No MP”. Wall → “Can't walk there”. Distant tile → “Can't reach”. `node --experimental-strip-types --test src/frontend/src/engine/walkRejectCopy.test.ts`.  
ACTION_ID: GFCF-2026-08-31-008  
SOURCE_AUTOMATION: Game Feel & Combat Feedback Director  
TITLE: Play the existing level_up sound when recap level increases  
CATEGORY: reward-feedback  
EVIDENCE: `level_up` existed in `useSoundHooks.ts` / `soundEngine.ts` and was never played. #108/#138 merged leftover XP (`recapXpAfterGrant`). This PR plays `level_up` when `shouldAnnounceLevelUp(characterStats.level, recapXp.level)` (victory WX ~13161) or `leveled.newLevel` (Boss Rush WX ~13501). Recap header still shows only `Level {currentLevel}` (`PostBattleRecap.tsx` ~257 / ~285) with no LEVEL UP chrome.  
SYSTEMS_AFFECTED: `engine/rewardFeel.ts`; WorldExploration recap fire sites only  
RECOMMENDED_ACTION: Sound shipped. Remaining: one-line gold “Level N” on the existing recap header when level increased. Do not add confetti. Do not reopen the curve.  
AUTONOMY: IMPLEMENTED_THIS_PR (sound) / RECOMMEND (banner)  
DEPENDENCIES: #108/#138 merged  
REGRESSION_RISK: LOW — one sound, gated on level increase. No XP write.  
VALIDATION_REQUIRED: Grant enough XP to cross a level; `level_up` once; bar still `100 * 2^(N-1)`. No sound when leftover XP stays in-level. `rewardFeel.test.ts`.  
ACTION_ID: GFCF-2026-09-01-001  
SOURCE_AUTOMATION: Game Feel & Combat Feedback Director  
TITLE: Map barrier live-cast tokens and leftover invalid-target floats  
CATEGORY: combat-feedback  
EVIDENCE: After barrier LoS landed, `isTileCastableLive` emits `ground_barrier`, `line_blocked_barrier`, `line_los_blocked`, `barrier_tile` (`targeting.ts` ~598–665). `REJECT_COPY` omitted them, so `playerFacingRejectReason` fell through to “Invalid target”. Tile-branch self-hit and `!shouldExecuteLiveCast` floated raw `"invalid target"` (pre-fix WX ~11017 / ~11644) instead of the probe reason.  
SYSTEMS_AFFECTED: `engine/rejectCopy.ts`; WorldExploration tile-cast leftovers  
RECOMMENDED_ACTION: IMPLEMENT. Add the four tokens. Use `playerFacingRejectReason("self_other_tile")` and `_live.reason` on the leftover tile misses. DEV `recordClickOutcome` tokens stay raw.  
AUTONOMY: IMPLEMENTED_THIS_PR  
DEPENDENCIES: GFCF-2026-08-31-002  
REGRESSION_RISK: LOW — copy only. Unknown future tokens still fall back to “Invalid target”.  
VALIDATION_REQUIRED: Cast into a barrier / blocked LoS; float is “Blocked” or “No line of sight”. Self-tile hostile → “Invalid target”. `rejectCopy.test.ts`.  
ACTION_ID: GFCF-2026-09-01-002  
SOURCE_AUTOMATION: Game Feel & Combat Feedback Director  
TITLE: Explain attack-mode clicks when no spell is selected  
CATEGORY: combat-feedback  
EVIDENCE: Mouse and touch battle handlers fall through to `else { /* Attack mode with no spell selected — silent return */ }` (WX ~11197 / ~11833). INFORMATION is empty: the player cannot tell whether another action is possible (select a spell vs End Turn vs walk). UX #132 titled the Attack button; canvas clicks still have no float.  
SYSTEMS_AFFECTED: WorldExploration attack-mode empty branch  
RECOMMENDED_ACTION: Float `"Select a spell"` (or reuse footer copy) at `tileCenter`. One float, no modal, no gameplay change.  
AUTONOMY: RECOMMEND  
VALIDATION_REQUIRED: Enter attack with no spell; click a tile; one float. Selecting a spell then clicking a target is unchanged.  
ACTION_ID: GFCF-2026-09-01-003  
SOURCE_AUTOMATION: Game Feel & Combat Feedback Director  
TITLE: Float world-mode unreachable (non-adjacent empty path)  
CATEGORY: combat-feedback  
CONFIDENCE: MEDIUM  
EVIDENCE: World-mode click (WX ~11189+) sets `clickedTile` then `findPath`. Empty path only auto-steps if Chebyshev-adjacent; otherwise the gold tint appears and nothing walks. Player cannot tell *why* (blocked vs void vs no path). Distinct from battle-walk 006.  
SYSTEMS_AFFECTED: WorldExploration world-mode click/touch  
RECOMMENDED_ACTION: Float `"Can't reach"` when path is empty and the adjacent fallback does not apply. Do not change `findPath` or portal guards.  
AUTONOMY: RECOMMEND  
VALIDATION_REQUIRED: Click an isolated floor across a wall; float once; adjacent floor still steps.  
## Still open from 2026-08-31 (do not duplicate)
- **GFCF-2026-08-31-003** P0 — `onDamageJuice` on `applyDamageToEnemy` (skip bounce double-count).  
- **GFCF-2026-08-31-004** P0 — draw `getHitFlashAlpha` in the existing sprite pass (not RAF).  
- **GFCF-2026-08-31-005** P2 DEFER — hit-stop needs RAF exemption.  
- **GFCF-2026-08-31-009** P2 — reuse `bossEncounterBanner` for PHASE 2 / Weeping Pawn promote.  
- **GFCF-2026-08-31-010** P2 — dashed walk-path overlay.  
- **GFCF-2026-08-31-011** P2 — lava / spikes / reflect / shield / DoT source labels.  
- **GFCF-2026-08-31-012** P2 — duration digit on status pills.  
- **GFCF-2026-08-31-013** P2 — “Entering the Death Realm…” for the existing 1.5s wait.  
- **GFCF-2026-08-31-014** P2 — map `triggerVfx("heal")` to flash + existing green number.  
- **GFCF-2026-08-31-015** P2 DEFER — no production feel-telemetry.  
- **GFCF-2026-08-31-008** remaining — recap LEVEL UP chrome (sound shipped).
# ACTION_IDs — 2026-09-01 Advanced Enemy AI Evolution Designer
Durable ledger for implementers.  
Source automation: Advanced Enemy AI Evolution Designer (`67b03c2f-a492-11f1-a7d1-d6b4613131ce`).  
Design: [`docs/ENEMY_AI_EVOLUTION.md`](../ENEMY_AI_EVOLUTION.md) (T0–T5) and [`docs/ENEMY_AI_EVOLUTION_2026-09-01.md`](../ENEMY_AI_EVOLUTION_2026-09-01.md) (re-read + T6+).  
This run ships **docs only**. Do not implement gameplay from these IDs unless a later human or orchestrator explicitly picks one.
Prior open IDs (still valid; line numbers updated below): `AEE-2026-08-31-001` … `003`.
ACTION_ID: AEE-2026-08-31-001  
SOURCE_AUTOMATION: Advanced Enemy AI Evolution Designer  
TITLE: Replace `computeAITier` level bands with relative module eligibility  
CATEGORY: combat-ai  
EVIDENCE: `combatMath.ts` 36–52 still maps `enemyLevel` → tiers 1–10 + 30% scramble. Assigned WX 6408 / 6536. Behaviour gates `aiTier >= 5` (WX 15956) and `>= 10` (WX 16043). Brief forbids “Level X always equals AI tier Y.”  
RECOMMENDED_ACTION: Implement AI-SYS-01. Delete those integer gates.  
REGRESSION_RISK: MEDIUM — spawn + leader-death / betrayal  
VALIDATION_REQUIRED: Same absolute enemy level, player 5 vs 50 → different attach distributions; seeded RNG deterministic.  
ACTION_ID: AEE-2026-08-31-002  
SOURCE_AUTOMATION: Advanced Enemy AI Evolution Designer  
TITLE: Apply-layer honesty (Fire Bolt, AP/MP, ally heal)  
CATEGORY: combat-ai  
EVIDENCE: WX 17145–17150 fallback pool still includes `e-firebolt` range 3. `decideEnemyAction` never reads `Enemy.currentAp` / `currentMp` (`gameTypes.ts` 312–316). WX 17083 heals only when `spellType === "heal" && spellRange === 0`.  
RECOMMENDED_ACTION: AI-SYS-05 before new roles. Mirror `summonExecutor.ts` 122–210.  
REGRESSION_RISK: HIGH if WX apply is edited without tests  
VALIDATION_REQUIRED: TS-LEGAL, TS-AP, TS-MP, TS-HEAL, TS-BOLT  
ACTION_ID: AEE-2026-08-31-003  
SOURCE_AUTOMATION: Advanced Enemy AI Evolution Designer  
TITLE: Explicit roles + spell score profiles (stop heal-first inference)  
CATEGORY: combat-ai  
EVIDENCE: `inferArchetype` 420–425 still heal-first. Kit width is currently dead (see AEE-2026-09-01-003); repairing width without SYS-04 makes queens healers again.  
RECOMMENDED_ACTION: AI-SYS-02, AI-SYS-04, AI-ROL-08.  
DEPENDENCIES: AEE-2026-08-31-002  
VALIDATION_REQUIRED: TS-QUEEN, TS-DOT  
ACTION_ID: AEE-2026-09-01-001  
SOURCE_AUTOMATION: Advanced Enemy AI Evolution Designer  
TITLE: Shared targeting-shape legality for enemy decide  
CATEGORY: combat-ai  
EVIDENCE: `findNearestLegalCastTile` (`enemyAI.ts` 762–804) checks Chebyshev ≤ `spell.range` and `lineOfSight !== false` only. Player `isTileCastableLive` (`targeting.ts` ~660+) also gates `minRange`, `linear`, `diagonal`, `freeCells`, Manhattan ground. AI LoS policy is default-on; player is opt-in (`targeting.ts` 107–114) — do not unify by turning AI LoS off.  
RECOMMENDED_ACTION: AI-SYS-06 + AI-SYS-11. Extract one helper; enumerator drops illegal dests.  
DEPENDENCIES: AEE-2026-08-31-002 (apply must not Fire-Bolt a rejected shape)  
REGRESSION_RISK: MEDIUM — linear/minRange spells become uncastable if the helper is wrong  
VALIDATION_REQUIRED: TS-LINEAR, TS-MINR, TS-LEGAL  
ACTION_ID: AEE-2026-09-01-002  
SOURCE_AUTOMATION: Advanced Enemy AI Evolution Designer  
TITLE: Movement budget = actual MP, not constant 3  
CATEGORY: combat-ai  
EVIDENCE: `computeReachable` 351 uses `ENEMY_REACHABLE_STEP_BUDGET` (3). Charger `canReach` uses `budget + 1` (1178). `Enemy.currentMp` exists but is unused. Summons already spend MP (`summonExecutor.ts` 126–131).  
RECOMMENDED_ACTION: AI-SYS-07. Missing MP ⇒ 0 walk, not silent 3.  
DEPENDENCIES: AEE-2026-08-31-002; AEE-2026-09-01-004  
REGRESSION_RISK: MEDIUM — chargers wait more often  
VALIDATION_REQUIRED: TS-MP3; charger test updated to inject `currentMp`  
ACTION_ID: AEE-2026-09-01-003  
SOURCE_AUTOMATION: Advanced Enemy AI Evolution Designer  
TITLE: Relative kit width — stop `Math.floor(levelZoneObject)`  
CATEGORY: combat-ai  
EVIDENCE: WX 12483–12487 passes `currentMap.levelZone` (`{ name, minLevel, maxLevel }`). `buildEnemyKit` (`enemyAI.ts` 192) `Math.floor`s it → `NaN` → every kit is zone 0. `longHorizonSim.ts` 45–52 documents this. Do not substitute `minLevel` (that is a map band, not AI).  
RECOMMENDED_ACTION: AI-SYS-09. Width from SYS-01 `score`. Do not ship width without AEE-2026-08-31-003 (heal-first queens).  
DEPENDENCIES: AEE-2026-08-31-003 for role; AEE-2026-08-31-002 for apply  
REGRESSION_RISK: HIGH if width opens inferno/heal without profiles  
VALIDATION_REQUIRED: TS-KITOBJ; relative width distribution  
ACTION_ID: AEE-2026-09-01-004  
SOURCE_AUTOMATION: Advanced Enemy AI Evolution Designer  
TITLE: Copy public AP/MP/RES/SR/effects onto `AICombatant`  
CATEGORY: combat-ai  
EVIDENCE: WX snapshot 16722–16751 omits them. `getEffectiveStat` on ctx is unused by `estimateDamage` 463–482. Guardian recasts shield every turn (2111–2117) because effects are invisible.  
RECOMMENDED_ACTION: AI-SYS-10. Unknown field ⇒ disable modules that need it.  
REGRESSION_RISK: LOW if read-only  
VALIDATION_REQUIRED: RES 50 changes estimate; missing AP disables ADV-04  
ACTION_ID: AEE-2026-09-01-005  
SOURCE_AUTOMATION: Advanced Enemy AI Evolution Designer  
TITLE: Consume `focusTargetId` in `scoreTargets`  
CATEGORY: combat-ai  
EVIDENCE: Setter at `enemyAI.ts` 939 / 1525; `scoreTargets` 501–525 never reads `ctx.focusTargetId`. Charger/flanker/berserker never write it.  
RECOMMENDED_ACTION: AI-SYS-08 / TEM-01.  
DEPENDENCIES: None for the reader; roles later  
VALIDATION_REQUIRED: TS-FOCUS  
ACTION_ID: AEE-2026-09-01-006  
SOURCE_AUTOMATION: Advanced Enemy AI Evolution Designer  
TITLE: Isolate erratic / betrayal — do not upgrade the logged wild-cast  
CATEGORY: combat-ai  
EVIDENCE: WX 16007–16014 logs a random spell name and does not apply it. WX 16043+ 5% betrayal + 6× enrage. Neither is a tactic.  
RECOMMENDED_ACTION: AI-SYS-12. If flavour is kept, spawn-flag + low `pMax`, not `aiTier >= 5/10`. Never turn the log into off-kit damage.  
DEPENDENCIES: AEE-2026-08-31-001  
VALIDATION_REQUIRED: TS-ERRATIC  
ACTION_ID: AEE-2026-09-01-007  
SOURCE_AUTOMATION: Advanced Enemy AI Evolution Designer  
TITLE: Cap summoner chance; kit fallback when summon is illegal  
CATEGORY: combat-ai  
EVIDENCE: WX 12496–12498 `0.12 + characterStats.level * 0.02` reaches 1.0 at level 44. `decideSummonerAction` 1827–1873 returns skip on cap/CD; midpoint can be a wall.  
RECOMMENDED_ACTION: AI-FUT-23 + parent ROL-06. `Pmax ≈ 0.35`. Fall through to chassis kit.  
DEPENDENCIES: AEE-2026-08-31-002 if the fallback is a cast  
REGRESSION_RISK: MEDIUM — fewer late-game summoners  
VALIDATION_REQUIRED: TS-SUMCAP; cap + frost in kit → frost  
ACTION_ID: AEE-2026-09-01-008  
SOURCE_AUTOMATION: Advanced Enemy AI Evolution Designer  
TITLE: Boss kit respects real cooldowns; phase overlay later  
CATEGORY: combat-ai  
EVIDENCE: `pickBossKitSpell` (`useBossAI.ts` 38–54). Pale Archbishop 169–173 passes `new Map()` so the first pool id is always chosen.  
RECOMMENDED_ACTION: Pass the live cooldown map now. Full enumerator overlay is AI-FUT-20 (after SYS-03).  
DEPENDENCIES: None for the Map fix; FUT-20 after honesty slices  
REGRESSION_RISK: LOW for the Map fix  
VALIDATION_REQUIRED: TS-BOSSCD  
ACTION_ID: AEE-2026-09-01-009  
SOURCE_AUTOMATION: Advanced Enemy AI Evolution Designer  
TITLE: Do not assign unprofiled enemy-usable utilities (swap/mark/sacrifice/DoT)  
CATEGORY: combat-ai  
EVIDENCE: `spellData.ts` sets `usableByEnemy: true` on swap (155), mark (173), sacrifice (247), inferno (518), nova (268), enrage/haste/shield, etc. Decide `pickBestDamageSpell` requires `damage > 0`. Elite extras (`worldFeatures.ts`) draw from that flag.  
RECOMMENDED_ACTION: AI-SYS-02 + AI-FUT-17 + AI-FUT-22. Enumerator treats missing profile as illegal. Elite filter = profiled ids only.  
DEPENDENCIES: AEE-2026-08-31-002 for apply  
REGRESSION_RISK: MEDIUM — elites look less “magic” until profiles exist  
VALIDATION_REQUIRED: TS-SWAP; TS-DOT once inferno is profiled  
ACTION_ID: AEE-2026-09-01-010  
SOURCE_AUTOMATION: Advanced Enemy AI Evolution Designer  
TITLE: T6+ modules are stackable scorers, not a level-900 final form  
CATEGORY: combat-ai  
EVIDENCE: Parent §14 was a five-row sketch. 2026-09-01 file specifies FUT-01…FUT-23 (bait, CD rotation, fake retreat, summon screen, hazard escort, next-actor, visible bar, family/reflect, hazard split, occupy exit, surround, friendly-blast, lead tile, overwatch, buff hygiene, linear corridor, elite honesty, post-player tempo, multi-hit EV, boss overlay, public miss, swap/mark/sacrifice, summoner cap).  
RECOMMENDED_ACTION: Implement only after P0 honesty + enumerator. One module per PR with `enemyAI*.test.ts`. Never `if (level >= X)`.  
DEPENDENCIES: AEE-2026-08-31-001…003; AEE-2026-09-01-001…005  
REGRESSION_RISK: HIGH if stacked before legality  
VALIDATION_REQUIRED: Per-module TEST_SCENARIOS in the 2026-09-01 doc  
# ACTION_IDs — 2026-09-01 Admin Feature & Drift Auditor
Durable ledger. Reuses AFDA-2026-08-31-* for the same underlying problems.
Source of every record: Admin Feature & Drift Auditor.
Do not delete admin CRUD because a tab looks unused. Prove obsolescence first.
ACTION_ID: AFDA-2026-08-31-001
SOURCE_AUTOMATION: Admin Feature & Drift Auditor
TITLE: Spell admin writes used frontend `hitsMultiple` and omitted Candid `cooldown` / `multiTarget`
CATEGORY: BROKEN
PRIORITY: P1
CONFIDENCE: HIGH
EVIDENCE: Adapter still in `adminContract.ts` `toBackendSpellConfig` / `fromBackendSpellConfig` (235–247, 298–307). Bindgen `SpellConfig` (`backend.ts` 115–145) requires `multiTarget`, `hitsAllies`, `cooldown`. Combat still reads `hitsMultiple`. Motoko `admin.mo` 92–127 now also requires summon fields the bindgen record lacks (see AFDA-2026-09-01-020).
SYSTEMS_AFFECTED: Admin Spells tab; `adminSetSpellConfig`; player/enemy cast targeting
CURRENT_BEHAVIOUR: Cooldown and multi-target round-trip via adapter. Frontend-only mechanic flags still drop (018).
AUTHORITATIVE_BEHAVIOUR: One wire name (`multiTarget`); hydrate maps to `hitsMultiple`. Persist or hide frontend-only flags.
RECOMMENDED_ACTION: Keep the adapter. Persist `targetType` / mechanic flags or stop editing them (018). Regenerate bindgen for summon fields (020).
AUTONOMY: HUMAN — remaining work is a schema decision
DEPENDENCIES: AFDA-2026-08-31-018; AFDA-2026-09-01-020
REGRESSION_RISK: MEDIUM if a later change drops the adapter without updating combat
VALIDATION_REQUIRED: Admin create a multi-target spell with cooldown 2; Candid save succeeds; combat applies both.
STATUS: PARTIAL
ACTION_ID: AFDA-2026-08-31-002
SOURCE_AUTOMATION: Admin Feature & Drift Auditor
TITLE: Boss admin and world load `pbv_boss_configs` while the canister already has boss CRUD
CATEGORY: LEGACY
PRIORITY: P1
CONFIDENCE: HIGH
EVIDENCE: `useBossQueries.ts` 1–31 and `useAdminQueries.ts` 484–524 still read/write `localStorage.pbv_boss_configs`. `WorldExploration.tsx` 7151 loads the same key. `main.mo` 2602–2645: `setBossConfig`, `deleteBossConfig`, `getAllBossConfigs`. Frontend `BossConfig` (`bossTypes.ts` 91–110) has `iconEmoji`, `loreText`, `chc`; bindgen/Motoko (`backend.ts` 251–264; `admin.mo` 291–304) have `defeated`, `adminNotes`, no `chc`. Admin Bosses tab still states browser-local drafts (`AdminDashboard.tsx` ~7333).
SYSTEMS_AFFECTED: Admin Bosses tab; boss portals; Boss Rush kits
CURRENT_BEHAVIOUR: Admin edits are browser-local. Canister boss maps stay empty unless written elsewhere.
AUTHORITATIVE_BEHAVIOUR: Backend-authoritative configs; localStorage cache only.
RECOMMENDED_ACTION: Unify schemas, then wire hooks to `getAllBossConfigs` / `setBossConfig`. Do not delete the local fallback until a live canister read succeeds.
AUTONOMY: HUMAN — schema merge
DEPENDENCIES: None
REGRESSION_RISK: HIGH if wired without mapping `iconEmoji`/`loreText`
VALIDATION_REQUIRED: Save a boss in admin on machine A; load on machine B against the same canister.
ACTION_ID: AFDA-2026-08-31-003
SOURCE_AUTOMATION: Admin Feature & Drift Auditor
TITLE: Level-up admin still omits canister fields the game and `upgradeSpell` use
CATEGORY: PARTIAL
PRIORITY: P1
CONFIDENCE: HIGH
EVIDENCE: This run added all nine inputs and `toBackendLevelUpConfig` (`adminContract.ts` 273–296). Settings hydrates `getLevelUpConfig`. Frontend `LevelUpConfig` (`gameTypes.ts` 408–424) still uses `apMpGrowthEveryNLevels` and omits `spellLevelingBaseCost` / multiplier / `spellDmgGrowthPercent`. `WorldExploration.tsx` 2308–2316 still reads only `pbv_levelup_config`, never `getLevelUpConfig()`. `upgradeSpell` uses canister `spellLevelingBaseCost`.
SYSTEMS_AFFECTED: Settings tab; spell upgrade cost; HP/AP growth
CURRENT_BEHAVIOUR: Admin can edit and persist all nine canister fields. Live combat still hydrates fail/range from localStorage.
AUTHORITATIVE_BEHAVIOUR: Admin edits all nine fields; world hydrates `getLevelUpConfig()`.
RECOMMENDED_ACTION: Point WorldExploration at `getLevelUpConfig` (cache only). Align `gameTypes.LevelUpConfig` names with Candid (`apMpLevelThreshold`).
AUTONOMY: IMPLEMENT
DEPENDENCIES: None
REGRESSION_RISK: MEDIUM — wrong defaults would change upgrade prices
VALIDATION_REQUIRED: Change `spellLevelingBaseCost` on canister; confirm summon upgrade UI and debit match.
STATUS: PARTIAL
ACTION_ID: AFDA-2026-08-31-004
SOURCE_AUTOMATION: Admin Feature & Drift Auditor
TITLE: Shop packages are hardcoded in the player shop; admin Shop tab cannot CRUD them
CATEGORY: MISSING
PRIORITY: P1
CONFIDENCE: HIGH
EVIDENCE: `adminSetShopPackage` / `adminDeleteShopPackage` / `getShopPackages` (`main.mo` 1051–1082). Admin Shop tab is grant-Doka + ban; “Configure payment links below” has no form. Player shop (`WorldExploration.tsx` 19609–19627) hardcodes 15 packages. `useGetShopPackages` exists and is unused by AdminDashboard.
SYSTEMS_AFFECTED: Economy; Doka shop; admin Shop tab
CURRENT_BEHAVIOUR: Players buy a fixed catalog. Canister packages are unused by the UI.
AUTHORITATIVE_BEHAVIOUR: Player shop lists `getShopPackages`; admin CRUD writes that catalog and payment links.
RECOMMENDED_ACTION: Add package CRUD to the Shop tab; drive the player shop from `getShopPackages` with the hardcoded list as fallback only.
AUTONOMY: HUMAN — pricing / payment-link policy
DEPENDENCIES: None
REGRESSION_RISK: HIGH if the live catalog is emptied
VALIDATION_REQUIRED: Admin add/edit a package; player shop shows it; `initiatePurchase` still uses nine positional args.
ACTION_ID: AFDA-2026-08-31-005
SOURCE_AUTOMATION: Admin Feature & Drift Auditor
TITLE: Purchases tab called non-existent `getPurchaseRecords`
CATEGORY: BROKEN
PRIORITY: P1
CONFIDENCE: HIGH
EVIDENCE: Hook now calls `getPurchases` and maps via `readPurchasesResult` (`useShopQueries.ts` 70–89; `adminContract.ts` 77–141). Canister also has `adminGetPurchaseRecords` (`main.mo` 1198). Price column stays empty (`priceEur` not on `PurchaseRecord`; cents live on `ShopPackage`).
SYSTEMS_AFFECTED: Admin Purchases tab
CURRENT_BEHAVIOUR: Query hits a live method and maps customer fields. Price column empty.
AUTHORITATIVE_BEHAVIOUR: Admin list uses `adminGetPurchaseRecords`; join package price if needed.
RECOMMENDED_ACTION: Switch the hook to `adminGetPurchaseRecords(null)`; show `priceEuroCents` via package join.
AUTONOMY: IMPLEMENT
DEPENDENCIES: AFDA-2026-08-31-004
REGRESSION_RISK: LOW
VALIDATION_REQUIRED: After a real purchase, admin Purchases shows name, email, status, and proof URL.
STATUS: PARTIAL
ACTION_ID: AFDA-2026-08-31-006
SOURCE_AUTOMATION: Admin Feature & Drift Auditor
TITLE: Admin enemy records are not consumed by encounter spawn
CATEGORY: MISLEADING
PRIORITY: P1
CONFIDENCE: HIGH
EVIDENCE: `useGetEnemyConfigs` is admin-only. Spawn uses `pickEnemyLevelFromTiers` + `getEnemyBaseStats`. Admin `EnemyConfig` is hp/ap/mp/initStat/levelMin/levelMax/regions/spriteUrl — not `types/common.mo` combat template. No `spriteUrl` reader in WorldExploration. This run labeled the Enemies tab catalog-only. Do not delete CRUD.
SYSTEMS_AFFECTED: Enemies tab; encounters; player-relative tiers
CURRENT_BEHAVIOUR: Saving an enemy does not change overworld packs. Tiers tab does affect spawn. Enemy **names** from `getEnemyNames` are used at spawn (`WorldExploration.tsx` 2172, 6332).
AUTHORITATIVE_BEHAVIOUR: Either wire spawn to admin enemy templates (optional visual, default pixel) or keep the catalog-only label.
RECOMMENDED_ACTION: Keep CRUD. Prove no other caller before any delete. Optional spawn integration is a separate project (EBA-001).
AUTONOMY: HUMAN
DEPENDENCIES: AFDA-2026-08-31-013
REGRESSION_RISK: HIGH if spawn is rewritten
VALIDATION_REQUIRED: Grep-confirmed no game caller for getEnemyConfigs; optional spawn playtest.
ACTION_ID: AFDA-2026-08-31-007
SOURCE_AUTOMATION: Admin Feature & Drift Auditor
TITLE: Battle challenges have no admin surface
CATEGORY: MISSING
PRIORITY: P2
CONFIDENCE: HIGH
EVIDENCE: Catalog is `DEFAULT_CHALLENGES` in `utils/challengeCompletion.ts`. AdminDashboard has zero challenge editors. Backend has no challenge config map.
SYSTEMS_AFFECTED: Challenges; recap rewards
CURRENT_BEHAVIOUR: Operators cannot change conditions or rewards without a code change.
AUTHORITATIVE_BEHAVIOUR: If challenges stay code-owned, say so in admin. If editable, add a gated catalog that `handleBattleEnd` reads.
RECOMMENDED_ACTION: Report-only unless product wants operator-tunable rewards.
AUTONOMY: HUMAN
DEPENDENCIES: None
REGRESSION_RISK: HIGH if rewards move off the persist lock
VALIDATION_REQUIRED: N/A until a design exists
ACTION_ID: AFDA-2026-08-31-008
SOURCE_AUTOMATION: Admin Feature & Drift Auditor
TITLE: Boss Rush admin enable/reward JSON is ignored by the live 10-room table
CATEGORY: MISLEADING
PRIORITY: P1
CONFIDENCE: HIGH
EVIDENCE: Admin writes `room_N_enabled` / `room_N_reward` to localStorage + `adminSetBossRushConfig`. `useBossRush.ts` 233–247 only applies `parsed.rewardMultiplier`. Rooms come from `BOSS_RUSH_ROOMS` (room 9 uses `weeping_pawn_2`). This run labeled the tab.
SYSTEMS_AFFECTED: Boss Rush; admin Boss Rush tab
CURRENT_BEHAVIOUR: Toggling a room off does not skip it. Reward `x` does not change `dokaReward`/`xpReward`.
AUTHORITATIVE_BEHAVIOUR: Either consume the JSON (enable + multiplier) or replace the tab with a read-only view of `BOSS_RUSH_ROOMS`.
RECOMMENDED_ACTION: Do not invent a second room table. Wire or relabel.
AUTONOMY: HUMAN
DEPENDENCIES: AFDA-2026-08-31-002
REGRESSION_RISK: HIGH if rooms are duplicated
VALIDATION_REQUIRED: Disable room 3 in admin; start a rush; confirm skip or confirm the control is labeled display-only.
ACTION_ID: AFDA-2026-08-31-009
SOURCE_AUTOMATION: Admin Feature & Drift Auditor
TITLE: Player sprite walk-frame field names drifted (`walkFramesFront` vs `frontWalkFrames`)
CATEGORY: BROKEN
PRIORITY: P2
CONFIDENCE: HIGH
EVIDENCE: Adapter still maps both directions (`adminContract.ts` 179–227; `useSpellQueries.ts` 223–246). Motoko / bindgen use `frontWalkFrames`. Admin type uses `walkFramesFront`. WorldExploration still never reads `getPlayerSpriteConfigs` (017).
SYSTEMS_AFFECTED: Admin Player Sprites tab
CURRENT_BEHAVIOUR: Walk-frame arrays can round-trip the canister. Game still draws built-in pixel pieces.
AUTHORITATIVE_BEHAVIOUR: Same field names on admin type and Candid; optional custom URL with pixel fallback.
RECOMMENDED_ACTION: Rename the frontend type to match bindgen; keep the adapter until callers migrate.
AUTONOMY: IMPLEMENT
DEPENDENCIES: AFDA-2026-08-31-017
REGRESSION_RISK: LOW
VALIDATION_REQUIRED: Save walk frames; refetch; arrays still populated.
STATUS: PARTIAL
ACTION_ID: AFDA-2026-08-31-010
SOURCE_AUTOMATION: Admin Feature & Drift Auditor
TITLE: Visuals tab and world hydrate used different palette cache keys
CATEGORY: BROKEN
PRIORITY: P2
CONFIDENCE: HIGH
EVIDENCE: Admin still dual-writes `paperVertexPalette` and `pbv_color_palette` (`AdminDashboard.tsx` ~4271–4272). World hydrates `getColorPalette` into `pbv_color_palette`.
SYSTEMS_AFFECTED: Visuals tab; paper-vertex landscape
CURRENT_BEHAVIOUR: Admin save updates both caches and the canister.
AUTHORITATIVE_BEHAVIOUR: Single cache key matching world hydrate.
RECOMMENDED_ACTION: Drop `paperVertexPalette` after one version-gate cycle.
AUTONOMY: IMPLEMENT
DEPENDENCIES: None
REGRESSION_RISK: LOW
VALIDATION_REQUIRED: Save palette in admin; reload world; vertex colors match.
STATUS: PARTIAL
ACTION_ID: AFDA-2026-08-31-011
SOURCE_AUTOMATION: Admin Feature & Drift Auditor
TITLE: Finite-level defaults and copy contradict “no player level cap”
CATEGORY: MISLEADING
PRIORITY: P2
CONFIDENCE: HIGH
EVIDENCE: This run defaults new enemy/region `levelMax` to 9999 and rewrote fail-chance help. Region effects still apply only when `level <= region.levelMax` (`WorldExploration.tsx` 3717–3721). Death Realm `maxLevel` is 5 at 14004 and 14136 vs 9999 at 6021. `pickEnemyLevelFromTiers` caps at `floor(999 / tierSize)` (`combatMath.ts` 58). Motoko `LevelUpConfig` comment still says fail reaches 0 at level 200 (`admin.mo` 148).
SYSTEMS_AFFECTED: Regions; enemies; spell fail; Death Realm; player-relative spawn
CURRENT_BEHAVIOUR: New admin drafts no longer seed a 1–5 career band. A saved region with max 5 still excludes level 6+. Spawn math still stops climbing after level 999.
AUTHORITATIVE_BEHAVIOUR: No player level cap. `levelMax` on templates is a band, not a career ceiling. Death Realm must not use maxLevel 5.
RECOMMENDED_ACTION: Fix Death Realm zone to 9999 (do not edit mapGen). Lift or document the 999 spawn band (EBA-003). Treat existing region max=5 as content, not a product cap.
AUTONOMY: IMPLEMENT for Death Realm zone only. Do not touch mapGen / combat math in this auditor.
DEPENDENCIES: None
REGRESSION_RISK: MEDIUM if region matching becomes unbounded without a fallback
VALIDATION_REQUIRED: Level 20 character still gets a region (or an explicit “no region” state). Death Realm HUD does not show 1–5.
STATUS: PARTIAL
ACTION_ID: AFDA-2026-08-31-012
SOURCE_AUTOMATION: Admin Feature & Drift Auditor
TITLE: Backend/game systems with no admin management
CATEGORY: MISSING
PRIORITY: P2
CONFIDENCE: HIGH
EVIDENCE: Present in actor or live game, absent from AdminDashboard tabs: dungeon records; buff catalog; `setAppVersion` / `setChangelog`; `getBannedPrincipals` list; `setBossPortalAssignment` (hook is a no-op, `useAdminQueries.ts` 541–557); `getAllCharacters`; enemy AI; variants; telemetry (comment only at WorldExploration 16878); `getAdminAuditLog` (`main.mo` 3101) — also missing from bindgen `backend.ts`.
SYSTEMS_AFFECTED: Dungeons; economy/buffs; ops; portals; AI; telemetry
CURRENT_BEHAVIOUR: Operators cannot tune these from the dashboard.
AUTHORITATIVE_BEHAVIOUR: Admin covers every persisted config map. Code-owned systems should be labeled as such.
RECOMMENDED_ACTION: Add only configs that already have canister CRUD (version, changelog, ban list, portal assignments, shop packages, audit log). Do not invent telemetry.
AUTONOMY: HUMAN — pick which surfaces
DEPENDENCIES: AFDA-2026-08-31-004; AFDA-2026-09-01-020
REGRESSION_RISK: LOW for read-only ops panels
VALIDATION_REQUIRED: Per surface
ACTION_ID: AFDA-2026-08-31-013
SOURCE_AUTOMATION: Admin Feature & Drift Auditor
TITLE: Custom enemy artwork is optional; admin `spriteUrl` is unused
CATEGORY: VISUAL_FALLBACK
PRIORITY: P2
CONFIDENCE: HIGH
EVIDENCE: Enemy editor already labels Default Pixel Visual (`AdminDashboard.tsx` ~731–763). No `spriteUrl` / `drawImage` reader in WorldExploration. New enemies/bosses render from piece/family pixel patterns. Custom art is not mandatory.
SYSTEMS_AFFECTED: Enemies; bosses; visuals
CURRENT_BEHAVIOUR: Default pixel visual always works. Admin URL does not appear in combat.
AUTHORITATIVE_BEHAVIOUR: valid custom visual → custom; otherwise built-in pixel.
RECOMMENDED_ACTION: Keep pixel fallback. Either hook `spriteUrl` as optional overlay or keep the unused-field label. Do not require artwork for new enemies.
AUTONOMY: HUMAN
DEPENDENCIES: AFDA-2026-08-31-006
REGRESSION_RISK: LOW
VALIDATION_REQUIRED: Spawn an enemy with empty `spriteUrl`; confirm default pixels draw.
ACTION_ID: AFDA-2026-08-31-014
SOURCE_AUTOMATION: Admin Feature & Drift Auditor
TITLE: Spell `minLevel` / discovery is not enforced; every backend spell becomes owned
CATEGORY: PARTIAL
PRIORITY: P2
CONFIDENCE: HIGH
EVIDENCE: `ownedSpells` (`WorldExploration.tsx` 2410–2438) now filters via `shouldIncludeBackendSpellInLibrary` (`usableByPlayer` or already owned via spellLevelKeys / bar). Still no `minLevel` check. `OLD_SPELL_NAMES_SET` still filters by name and id (SDA-006). Admin still edits `minLevel`.
SYSTEMS_AFFECTED: Spells; spell discovery
CURRENT_BEHAVIOUR: Retired `usableByPlayer=false` spells stay out of new libraries. `minLevel` is ignored. Saving a player-usable spell still grants it to anyone who hydrates the catalog.
AUTHORITATIVE_BEHAVIOUR: `minLevel` gates discovery/equip if that field stays in admin. Catalog does not imply ownership (SDA-002).
RECOMMENDED_ACTION: Enforce `minLevel` at hydrate, or hide the field. Do not treat the full catalog as owned.
AUTONOMY: HUMAN
DEPENDENCIES: AFDA-2026-08-31-001
REGRESSION_RISK: MEDIUM — locking existing bars
VALIDATION_REQUIRED: Spell with minLevel 10 hidden from a level-3 character.
STATUS: PARTIAL
ACTION_ID: AFDA-2026-08-31-015
SOURCE_AUTOMATION: Admin Feature & Drift Auditor
TITLE: Shop, Ads, and Boss Rush tabs use gray Tailwind instead of carved-stone admin chrome
CATEGORY: UX-DEGRADED
PRIORITY: P3
CONFIDENCE: HIGH
EVIDENCE: Enemies/Spells/Settings use stone tokens. Shop (`bg-gray-800`), Ads (`#ff4444` / `#aaa`), Boss Rush (`bg-gray-800`) do not.
SYSTEMS_AFFECTED: Admin Shop / Ads / Boss Rush
CURRENT_BEHAVIOUR: Three tabs look like a different product.
AUTHORITATIVE_BEHAVIOUR: Ankama/Dofus carved-stone, dark slate, crimson accents.
RECOMMENDED_ACTION: Restyle those tabs to match `sectionHeadStyle` / `C` tokens.
AUTONOMY: IMPLEMENT
DEPENDENCIES: None
REGRESSION_RISK: LOW
VALIDATION_REQUIRED: Visual compare against Enemies tab.
ACTION_ID: AFDA-2026-08-31-016
SOURCE_AUTOMATION: Admin Feature & Drift Auditor
TITLE: Admin modifier type list drifted from the live engine registry
CATEGORY: OUTDATED
PRIORITY: P2
CONFIDENCE: HIGH
EVIDENCE: This run builds the dropdown from `listAdminModifierTypeOptions()` (`mapModifiers.ts`). Live registry has 22 ids including `titans_vigor` … `doka_fever`. Legacy `lava_fields` / `ice_fields` / `spike_pit` / `custom` remain selectable so saved rows are not deleted. Motoko `MapModifierConfig` comment (`admin.mo` 167–171) still lists only slime_flood / paper_windstorm.
SYSTEMS_AFFECTED: Map Modifiers tab; portal modifier rolls
CURRENT_BEHAVIOUR: Every registry id is selectable. Legacy hazard ids still save but have no engine hook.
AUTHORITATIVE_BEHAVIOUR: Dropdown equals `MAP_MODIFIERS` ids. Saved unknown ids remain visible.
RECOMMENDED_ACTION: Keep legacy options until no stored row uses them. Do not delete configs.
AUTONOMY: IMPLEMENT
DEPENDENCIES: None
REGRESSION_RISK: MEDIUM if a live modifier id is dropped from the dropdown
VALIDATION_REQUIRED: Every registry id selectable; a `doka_fever` row can be saved.
STATUS: PARTIAL
ACTION_ID: AFDA-2026-08-31-017
SOURCE_AUTOMATION: Admin Feature & Drift Auditor
TITLE: Player sprite configs persist but the world never draws them
CATEGORY: MISLEADING
PRIORITY: P2
CONFIDENCE: HIGH
EVIDENCE: `getPlayerSpriteConfigs` is admin-only. WorldExploration has no `playerSprite` / `frontUrl` usage; player draw uses `chessPiecePatterns` / `drawPixelPattern`. This run labeled the tab catalog-only. Custom art is not mandatory.
SYSTEMS_AFFECTED: Player Sprites tab; character visuals
CURRENT_BEHAVIOUR: Operators can upload URLs that never appear in play. Pixel pieces still work.
AUTHORITATIVE_BEHAVIOUR: Optional custom sprite with pixel fallback.
RECOMMENDED_ACTION: Prove no other renderer reads these configs. Then wire optional overlay or keep catalog-only. Do not delete.
AUTONOMY: HUMAN
DEPENDENCIES: AFDA-2026-08-31-009
REGRESSION_RISK: LOW
VALIDATION_REQUIRED: Grep-confirmed no game caller.
ACTION_ID: AFDA-2026-08-31-018
SOURCE_AUTOMATION: Admin Feature & Drift Auditor
TITLE: Admin special-mechanic flags are not on the canister SpellConfig
CATEGORY: IGNORED_FIELDS
PRIORITY: P2
CONFIDENCE: HIGH
EVIDENCE: Editor writes `isSwap`, `isMirror`, `isTimestep`, `isSacrifice`, `isBarrier`, `isTrap`, `isMark`, buff/debuff/DoT numbers, `targetType`. Motoko `SpellConfig` (`admin.mo` 92–127) now has summon fields + cooldown but still lacks those mechanic flags. Bindgen (`backend.ts` 115–145) has neither summon nor mechanic flags. `toBackendSpellConfig` cannot persist what Candid does not encode.
SYSTEMS_AFFECTED: Spells
CURRENT_BEHAVIOUR: Toggling Barrier on an admin spell does not persist. Reloading loses the flag.
AUTHORITATIVE_BEHAVIOUR: Either extend Motoko SpellConfig / `effectParams` JSON, or remove the toggles.
RECOMMENDED_ACTION: Persist via `effectParams` (already optional Text) without a Motoko schema break, or extend the record and regenerate bindgen.
AUTONOMY: HUMAN
DEPENDENCIES: AFDA-2026-08-31-001; AFDA-2026-09-01-020
REGRESSION_RISK: MEDIUM
VALIDATION_REQUIRED: Save Barrier; reload admin; combat still treats the spell as a barrier.
ACTION_ID: AFDA-2026-08-31-019
SOURCE_AUTOMATION: Admin Feature & Drift Auditor
TITLE: Settings admin-role transfer calls caffeine `assignCallerUserRole`, not `assignUserRole`
CATEGORY: UNSAFE
PRIORITY: P2
CONFIDENCE: HIGH
EVIDENCE: `useAssignUserRole` (`useAdminQueries.ts` 92–98) now calls `assignUserRole(Principal, role: Text)` and `assertAdminCmdOk`. `main.mo` implements `assignUserRole`. Bindgen still also lists mixin `assignCallerUserRole` / `isCallerAdmin` which are **not** in `src/backend/main.mo`. App.tsx admin gate uses `getUserRole`, not `isCallerAdmin`.
SYSTEMS_AFFECTED: Settings tab; auth
CURRENT_BEHAVIOUR: Transfer uses the rate-limited Text-role method. Mixin methods remain on stale Candid.
AUTHORITATIVE_BEHAVIOUR: Admin transfer uses `assignUserRole` in `main.mo`.
RECOMMENDED_ACTION: Keep current hook. Do not call `isCallerAdmin` against a source-only actor (020).
AUTONOMY: HUMAN — confirm deployed DID
DEPENDENCIES: AFDA-2026-09-01-020
REGRESSION_RISK: HIGH if the mixin is the only live grant path on an un-upgraded canister
VALIDATION_REQUIRED: Transfer admin on a deployed canister; both principals can open admin.
STATUS: FIXED
ACTION_ID: AFDA-2026-09-01-020
SOURCE_AUTOMATION: Admin Feature & Drift Auditor
TITLE: Bindgen and `src/backend/main.mo` SpellConfig / admin methods have drifted
CATEGORY: BACKEND_CONTRACT
PRIORITY: P1
CONFIDENCE: HIGH
EVIDENCE: Motoko `SpellConfig` (`admin.mo` 92–127; `defaultSpells` 172–190) requires `isSummon`, `summonAI`, `summonLifespan`, `summonUnitDef`, `cooldown`. Generated `backend.ts` 115–145 and `declarations/backend.did.d.ts` 202–232 omit the summon block. `getAdminAuditLog` exists on `main.mo` 3101 and `usePanelLayout.ts` 48 but not on `backend.ts`. Bindgen lists `isCallerAdmin` / `assignCallerUserRole` which are absent from `main.mo`. README says do not hand-edit bindgen; regenerate with `pnpm bindgen`.
SYSTEMS_AFFECTED: `adminSetSpellConfig`; audit log; admin auth probes; mocks
CURRENT_BEHAVIOUR: Admin spell save encodes the bindgen record (no summon). A canister built from current Motoko would reject or drop summon metadata. Audit log is uncallable through generated client.
AUTHORITATIVE_BEHAVIOUR: Bindgen matches canonical `src/backend/main.mo`. Extra mixin methods are not treated as the live actor.
RECOMMENDED_ACTION: After a source-faithful Candid emit, run `pnpm bindgen`. Update mocks. Do not hand-edit `backend.ts`. Do not deploy `backend_extended`.
AUTONOMY: HUMAN — bindgen + live DID
DEPENDENCIES: None
REGRESSION_RISK: HIGH if frontend + actor ship out of sync (same class as 12- vs 15-field CharacterStats)
VALIDATION_REQUIRED: `pnpm bindgen`; `adminSetSpellConfig` of a summon seed round-trips `isSummon`; `getAdminAuditLog` exists on the generated client; `isCallerAdmin` either exists in `main.mo` or is removed from bindgen.
# Game UX Designer — 2026-09-01
DESIGN.md is unchanged. Visual identity stays Dofus / Ankama carved stone, gold/crimson, orbs — not SaaS.
## Journey snapshot
| Beat | Should do | Can do | Why blocked | Just happened | Earned/lost | Next |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Launch | Sign in | II popup | Popup blocked (now has error) | Title + realm copy | — | Login |
| Login | Name account | ProfileSetup | Candid/name errors shown | Session starts | — | Forge / Play |
| Create | Name + piece + colors | Cancel / save | Empty name disables save | Toast: Play from slots | Appearance only | Selection |
| Selection | Play a slot | Edit / delete / create | Slots load fail → Retry | Leftover XP bar (curve OK) | — | World |
| Explore | Click tiles to walk | Portals, Doka, Items, heal | First map has no coach | Map # + region | Ground Doka | Step on enemy / portal |
| Encounter | Step onto an enemy | Walk around | Death-realm timer / transition | Fight starts with no coach | — | Combat |
| Combat | Spend AP/MP, end turn | Walk / cast / Attack Nearest | Failures often only in chat | Initiative + orbs | — | Victory or death |
| Spells | Pick slot, click tile | Book / upgrade | Slots dead on overworld | Cooldown number | — | Cast or Book |
| Victory | Read recap | Continue | — | Recap at app root | XP + Doka (curve OK) | Explore |
| Rewards | Confirm totals | Close recap | Map title was raw id (fixed) | applyRewards persist | Leftover XP / Doka | Portal or shop |
| Progress | Level + spell ranks | Book upgrades | Cost surprise on summons | HUD leftover XP | Stats grow | Harder maps |
| Death | Enter Death Realm | Walk to portal | Combat vs lava use different UIs | −20% XP / −40% Doka | Half HP | Portal out |
| Recovery | Leave Death Realm | Portals | Unlabeled exits | Toast after lava | Level kept | Explore |
| Shop | Buy potions (Doka) or credit (EUR) | Two doors | IAP asks KYC docs | Items vs cart | Doka in/out | Heal / upgrade |
| Upgrades | Expand spell, pay Doka | 8 loadout slots | Overworld slots look broken | +3% dmg / level | Doka | Combat |
| Dungeon | Enter labeled whirlpool | Chain depth HUD | Rest/boss/sanctuary unlabeled | Depth × Doka | Chain bonus | Next floor / rest |
| Boss | Purple portal / rush | Bosses guide | Pink rush chip; purple banner | Room n/10 | Boss recap | Sanctuary |
## Status of 2026-08-31 UX IDs
| ID | Status this run |
| :--- | :--- |
| UX-HUD-DUPLICATE-TOPBAR | Still shipped. Spacer + under-HUD cluster remain. |
| UX-DEATH-DUAL-MODAL | Still open. Combat uses Game Over only; lava uses recap + auto-realm. |
| UX-RECAP-XP-CURVE | Resolved on this branch (`xpHudProgress` / `recapXpAfterGrant` / `xpForNextLevel`). |
| UX-ONBOARD-FIRST-MAP | Still open. |
| UX-PORTAL-LEGEND | Still open. |
| UX-CAST-FAIL-FEEDBACK | Still open (button titles exist; tile clicks still log-only). |
| UX-VITALS-ORB-MAX | Resolved (`vitalsOrbCaps` + current/max on jewels). |
| UX-SHOP-TWO-STORES | Still open. |
| UX-BLOOD-DEAD-BAR | Implemented this run (bar + unused state removed). |
| UX-CREATE-NO-STATS | Still open. |
| UX-VERSION-FORCE-RELOGIN | Still open. |
| UX-SMALL-SCREEN-HARD-BLOCK | Softened: Continue anyway exists; no stacked HUD yet. |
| UX-IDENTITY-FONT-DRIFT | Still open (Baloo 2 / Saira / Arial vs Space Grotesk / Inter). |
| UX-BOOST-DEAD-CONTROL | Still hidden. |
| UX-SELECT-ROTATE-LEFT | Still shipped. |
ACTION_ID: UX-BLOOD-DEAD-BAR
TITLE: Remove inert Blood chip from the live HUD
CATEGORY: hud-crowding
FILES_OR_SYSTEMS: src/frontend/src/components/WorldExploration.tsx
CURRENT_BEHAVIOUR: Blood bar stayed at localStorage 100; setter unused.
DESIRED_BEHAVIOUR: No Blood chip until a live Blood system exists.
EVIDENCE: Prior unused `_setBloodBalance`; HUD chip sat between leftover XP and Doka.
RECOMMENDED_ACTION: Hide the chip and drop the unused state.
AUTONOMY:
- SAFE_TO_AUTO_IMPLEMENT
VALIDATION_REQUIRED: World HUD still shows leftover XP, Map #, region, Doka.
STATUS: IMPLEMENTED_THIS_RUN
ACTION_ID: UX-RECAP-MAP-ID
TITLE: Recap headline used the internal map id
CATEGORY: reward-clarity
FILES_OR_SYSTEMS: src/frontend/src/components/WorldExploration.tsx; src/frontend/src/components/PostBattleRecap.tsx
CURRENT_BEHAVIOUR: Victory, persist-fail, and lava-defeat recaps passed `currentMap.id` (e.g. map-…).
DESIRED_BEHAVIOUR: Recap subtitle is the region name (`levelZone.name`), with id as fallback.
EVIDENCE: WorldExploration recap builders; PostBattleRecap renders `data.mapTitle` under Battle Complete.
RECOMMENDED_ACTION: Prefer `levelZone.name`.
AUTONOMY:
- SAFE_TO_AUTO_IMPLEMENT
VALIDATION_REQUIRED: Recap shows the same region string as the HUD chip, not a raw map id.
STATUS: IMPLEMENTED_THIS_RUN
ACTION_ID: UX-SPELL-OVERWORLD-MUTED
TITLE: Overworld spell slots look broken
CATEGORY: spell-state
FILES_OR_SYSTEMS: src/frontend/src/components/SpellFooter.tsx
CURRENT_BEHAVIOUR: Slots are disabled out of battle. Hover still described damage/AP as if they were live.
DESIRED_BEHAVIOUR: Hover says the spell is usable once a fight starts. Later: dim copy on the dock itself.
EVIDENCE: SpellFooter `disabled={isEmpty \|\| !inBattle \|\| isOnCooldown}`.
RECOMMENDED_ACTION: Title-only this run. Do not change cast gating.
AUTONOMY:
- SAFE_TO_AUTO_IMPLEMENT
VALIDATION_REQUIRED: In battle, hover still shows AP/range; on the map, hover says fight-first.
ACTION_ID: UX-SELECT-DEAD-BREADCRUMB
TITLE: Selection header showed a dead Character pill
CATEGORY: visual-hierarchy
FILES_OR_SYSTEMS: src/frontend/src/components/GameFlow.tsx
CURRENT_BEHAVIOUR: Non-world header mapped a one-item `["character"]` list. On selection the pill never highlighted and did nothing.
DESIRED_BEHAVIOUR: No fake stage breadcrumb.
EVIDENCE: GameFlow non-game header next to Log Out.
RECOMMENDED_ACTION: Remove the leftover chip. Keep Log Out / Admin.
AUTONOMY:
- SAFE_TO_AUTO_IMPLEMENT
VALIDATION_REQUIRED: Selection and create still show name + Log Out.
STATUS: IMPLEMENTED_THIS_RUN
ACTION_ID: UX-RECAP-DEBUG-LOGS
TITLE: Recap printed BattleSummary debug lines
CATEGORY: feedback
FILES_OR_SYSTEMS: src/frontend/src/components/PostBattleRecap.tsx; src/frontend/src/App.tsx
CURRENT_BEHAVIOUR: Render and every dismiss path `console.log`’d BattleSummary.
DESIRED_BEHAVIOUR: No player-facing console noise on recap.
EVIDENCE: PostBattleRecap mount/escape/backdrop/close/continue; App onClose.
RECOMMENDED_ACTION: Delete the logs. Keep dismiss behaviour.
AUTONOMY:
- SAFE_TO_AUTO_IMPLEMENT
VALIDATION_REQUIRED: Escape, backdrop, ×, and Continue still close the root recap.
STATUS: IMPLEMENTED_THIS_RUN
ACTION_ID: UX-DEATH-DUAL-MODAL
TITLE: Combat Game Over and lava recap still disagree on the next step
CATEGORY: modal-conflicts
PRIORITY: P0
FILES_OR_SYSTEMS: src/frontend/src/components/WorldExploration.tsx; src/frontend/src/components/GameOverModal.tsx; src/frontend/src/components/PostBattleRecap.tsx; src/frontend/src/App.tsx
CURRENT_BEHAVIOUR: `_handlePlayerDeath` unmounts the world and shows Game Over (“Enter the Death Realm”). Lava/out-of-battle HP-watch fires the root defeat recap and auto-enters the realm in 1.5s while the recap can still be open. Combat no longer stacks both overlays.
DESIRED_BEHAVIOUR: One death beat: what you lost (−20% XP / −40% Doka), where you go (Death Realm), what to do (walk to a portal). Do not unmount the world under a second dialog.
EVIDENCE: `_handlePlayerDeath` → `setShowGameOver(true)`; showGameOver early return; lava path `onShowBattleSummary` + 1500ms timer; GameOverModal; recap z-9999.
RECOMMENDED_ACTION: Human-approved: keep root recap as the only death UI, then fade into Death Realm. Do not rewire deathGuards in an unattended run.
AUTONOMY:
- HUMAN_APPROVAL_REQUIRED
REGRESSION_RISK: HIGH
VALIDATION_REQUIRED: Battle death and lava death each show one explanation; penalties match persistDeathPenalty; portal exit still works.
STATUS: OPEN
ACTION_ID: UX-ONBOARD-FIRST-MAP
TITLE: First realm visit has no teaching beat
CATEGORY: action-discoverability
FILES_OR_SYSTEMS: src/frontend/src/components/WorldExploration.tsx; src/frontend/src/components/LandingPage.tsx; src/frontend/src/components/CharacterCreation.tsx
CURRENT_BEHAVIOUR: After Play the player is on an isometric map with unlabeled whirlpools, no “click a tile to walk,” and no mention that stepping onto an enemy starts a fight. Launch/create still have a next-step line.
DESIRED_BEHAVIOUR: One dismissible carved-stone coach on first world enter. Never a SaaS tooltip tour.
EVIDENCE: No tutorial/onboarding/firstVisit strings in WorldExploration.
RECOMMENDED_ACTION: Human-written 3-line coach, once per slot (localStorage cache only).
AUTONOMY:
- HUMAN_APPROVAL_REQUIRED
VALIDATION_REQUIRED: First Play shows the coach; second Play does not; it never blocks portals or combat.
STATUS: OPEN
ACTION_ID: UX-PORTAL-LEGEND
TITLE: Only dungeon portals explain themselves
CATEGORY: portal-clarity
FILES_OR_SYSTEMS: src/frontend/src/components/WorldExploration.tsx; src/frontend/src/engine/portalRules.ts
CURRENT_BEHAVIOUR: Nearby dungeon / chain portals draw “Enter Dungeon Chain” / “Continue Chain (d/max)”. Rest, boss, colored exits, white sanctuary, and Death Realm exits have no label.
DESIRED_BEHAVIOUR: Within 3 tiles, each kind shows a short carved label: Explore / Rest / Boss / Dungeon / Sanctuary / Death Realm exit.
EVIDENCE: Label block gated on `p.color === "dungeon" || dungeonChainActive`.
RECOMMENDED_ACTION: Extend the existing nearby-label path. Do not change spawn rules.
AUTONOMY:
- HUMAN_APPROVAL_REQUIRED
VALIDATION_REQUIRED: Each kind in a playtest seed shows a distinct label; dungeon copy still shows depth.
STATUS: OPEN
ACTION_ID: UX-CAST-FAIL-FEEDBACK
TITLE: Illegal casts still mostly write the battle log
CATEGORY: invalid-action-explanation
FILES_OR_SYSTEMS: src/frontend/src/components/WorldExploration.tsx; src/frontend/src/components/BattleUIPanel.tsx; src/frontend/src/components/ChatPanel.tsx
CURRENT_BEHAVIOUR: Button titles cover some “Not enough AP” cases. Tile clicks still `logBattleEntry`. Players who never open chat get no reason.
DESIRED_BEHAVIOUR: A 1.5s stone whisper on the clicked tile or a toast: Not enough AP, out of range, not your turn, summon is acting.
EVIDENCE: logBattleEntry reject sites in WorldExploration cast paths.
RECOMMENDED_ACTION: One shared `explainRejectedCast(reason)` for click and touch. Do not change targeting math.
AUTONOMY:
- HUMAN_APPROVAL_REQUIRED
VALIDATION_REQUIRED: AP-starved, out-of-range, and enemy-turn clicks each show a reason once.
STATUS: OPEN
ACTION_ID: UX-SHOP-TWO-STORES
TITLE: Items and Buy Doka still feel like one shop
CATEGORY: action-discoverability
FILES_OR_SYSTEMS: src/frontend/src/components/GameFlow.tsx; src/frontend/src/components/WorldExploration.tsx; src/frontend/src/components/BuffShop.tsx
CURRENT_BEHAVIOUR: Under-HUD **Items** opens BuffShop (Doka potions). CARVED cart next to the Doka chip is icon-only (`title="Buy Doka"`) and opens a modal still titled **Doka Shop** with EUR packages, then a proof-of-address form.
DESIRED_BEHAVIOUR: “Items” vs “Buy Doka”, never both labeled Shop. IAP must say it is real-money credit before KYC.
EVIDENCE: GameFlow Items; WorldExploration shop modal heading “Doka Shop”; form fields include Proof of Address — Required.
RECOMMENDED_ACTION: Rename modal to Buy Doka and add one real-money line. Do not change purchase APIs.
AUTONOMY:
- HUMAN_APPROVAL_REQUIRED
REGRESSION_RISK: LOW for copy; HIGH if IAP/KYC is redesigned.
VALIDATION_REQUIRED: Items still buys buffs; cart still opens packages.
STATUS: OPEN
ACTION_ID: UX-IAP-KYC-SURPRISE
TITLE: Buy Doka jumps into identity documents
CATEGORY: action-discoverability
FILES_OR_SYSTEMS: src/frontend/src/components/WorldExploration.tsx
CURRENT_BEHAVIOUR: After picking a EUR package the player is asked for name, address, and a required utility-bill upload with no “why” or “what happens next.”
DESIRED_BEHAVIOUR: One stone line before the form: real-money purchase, documents for the operator, Doka credits after review. Keep the form if legally required.
EVIDENCE: shopStep `"form"`; Proof of Address — Required; no preamble.
RECOMMENDED_ACTION: Copy-only preamble. Do not drop required fields without a human/legal call.
AUTONOMY:
- HUMAN_APPROVAL_REQUIRED
REGRESSION_RISK: MEDIUM if fields are removed.
VALIDATION_REQUIRED: Package → form still submits the same payload.
ACTION_ID: UX-HUD-TOOL-CLUSTER
TITLE: Realm tools float over the map instead of living in one bar
CATEGORY: hud-crowding
FILES_OR_SYSTEMS: src/frontend/src/components/GameFlow.tsx; src/frontend/src/components/WorldExploration.tsx
CURRENT_BEHAVIOUR: World HUD is name, level, Map #, leftover XP, Doka, cart, region, Center, Enemies. GameFlow pins Items / Board / Feats / Bosses at top-right under a 44px spacer. They collide with the live strip on mid-width tablets.
DESIRED_BEHAVIOUR: One carved-stone header. Tools as overflow (⋯) or a second row that does not cover XP/Doka.
EVIDENCE: GameFlow z-9001 cluster; WorldExploration 44px header z-100.
RECOMMENDED_ACTION: Human layout. Do not restore the dummy 0/100 overlay bar.
AUTONOMY:
- HUMAN_APPROVAL_REQUIRED
REGRESSION_RISK: MEDIUM — panel snap still uses the spacer.
VALIDATION_REQUIRED: Items / Board / Feats / Bosses still open; leftover XP stays visible at 768 and 1280.
ACTION_ID: UX-CREATE-NO-STATS
TITLE: Champion forge never shows starting combat stats
CATEGORY: action-discoverability
FILES_OR_SYSTEMS: src/frontend/src/components/CharacterCreation.tsx
CURRENT_BEHAVIOUR: Piece Details lists Type / Pixel Art / 4 Views. Starting 100 HP, 10 AP, 5 MP apply only on save.
DESIRED_BEHAVIOUR: A compact stone row of starting HP/AP/MP/INIT.
EVIDENCE: `generateDefaultStats`; Piece Details block.
RECOMMENDED_ACTION: Display-only row. Do not let the player edit persisted stats here.
AUTONOMY:
- HUMAN_APPROVAL_REQUIRED
VALIDATION_REQUIRED: Create still writes the 12-field CharacterStats payload including killCount.
STATUS: OPEN
ACTION_ID: UX-VERSION-FORCE-RELOGIN
TITLE: App version bump wipes local cache and forces re-login
CATEGORY: feedback
FILES_OR_SYSTEMS: src/frontend/src/App.tsx
CURRENT_BEHAVIOUR: APP_VERSION mismatch clears localStorage (preserve list), reloads, then changelog after II login. Changelog still mentions “15 milestones” / “AI fully rebuilt.”
DESIRED_BEHAVIOUR: Show changelog on landing, then ask to sign in. Do not imply a wipe of canister progress.
EVIDENCE: App.tsx APP_VERSION / CHANGELOG_ITEMS / localStorage.clear path.
RECOMMENDED_ACTION: Human: stop forcing II re-auth or add landing copy “Game updated to vN — sign in to continue.” Refresh changelog.
AUTONOMY:
- HUMAN_APPROVAL_REQUIRED
VALIDATION_REQUIRED: Bump APP_VERSION in staging; canister characters still load.
STATUS: OPEN
ACTION_ID: UX-SMALL-SCREEN-HARD-BLOCK
TITLE: Narrow viewports still have no stacked HUD
CATEGORY: responsive-behaviour
FILES_OR_SYSTEMS: src/frontend/src/App.tsx; DESIGN.md
CURRENT_BEHAVIOUR: Guard now offers Continue anyway. DESIGN.md still wants ≥44px targets and a sticky bottom menu. Continuing on 390px leaves the desktop HUD overlapping.
DESIRED_BEHAVIOUR: Product call: tablet floor, or a stacked HUD (orbs + spell dock) for 768 landscape first.
EVIDENCE: SmallScreenGuard Continue anyway; no mobile HUD reflow in WorldExploration.
RECOMMENDED_ACTION: Report-only until a human picks a mobile scope.
AUTONOMY:
- REPORT_ONLY
REGRESSION_RISK: HIGH if the guard is removed without a HUD reflow.
VALIDATION_REQUIRED: 768 and 390-wide viewports after any policy change.
STATUS: OPEN
ACTION_ID: UX-IDENTITY-FONT-DRIFT
TITLE: Live type and color tokens still drift from DESIGN.md
CATEGORY: visual-hierarchy
FILES_OR_SYSTEMS: DESIGN.md; src/frontend/src/index.css; src/frontend/src/components/LandingPage.tsx
CURRENT_BEHAVIOUR: Brief specifies Space Grotesk / Inter / OKLCH-only. CSS uses Baloo 2 / Saira; launch title measures Arial; boss rush chip is hot pink; boss banner is purple gradient.
DESIRED_BEHAVIOUR: New chrome uses DESIGN.md tokens. Do not run a repo-wide hex rewrite.
EVIDENCE: DESIGN.md Typography; index.css --font-display; LandingPage Arial; Boss Rush `#FF69B4`.
RECOMMENDED_ACTION: Next new screen only. Forbid shadcn gray/purple on player-facing dialogs.
AUTONOMY:
- REPORT_ONLY
REGRESSION_RISK: HIGH for a global color sweep.
VALIDATION_REQUIRED: Side-by-side with DESIGN.md; gold-on-navy ≥ 4.5:1.
STATUS: OPEN
ACTION_ID: UX-BOSS-RUSH-PINK
TITLE: Boss Rush room chip uses arcade pink
CATEGORY: visual-hierarchy
FILES_OR_SYSTEMS: src/frontend/src/components/WorldExploration.tsx
CURRENT_BEHAVIOUR: “Boss Rush — Room n / 10” is `#FF69B4` on magenta, monospace, floating under the header. Dungeon chain uses carved crimson; this chip looks like a different game.
DESIRED_BEHAVIOUR: Same stone + gold/crimson family as the dungeon depth pill. Keep room n/10.
EVIDENCE: WorldExploration bossRushState.active overlay.
RECOMMENDED_ACTION: Restyle only. Do not change room indexing or completeBossRushRoom.
AUTONOMY:
- HUMAN_APPROVAL_REQUIRED
VALIDATION_REQUIRED: Room counter still matches currentRoom + 1 / 10.
ACTION_ID: UX-HUD-DUPLICATE-TOPBAR
TITLE: Do not restore the dummy GameFlow XP bar
CATEGORY: visual-hierarchy
PRIORITY: P0
FILES_OR_SYSTEMS: src/frontend/src/components/GameFlow.tsx
CURRENT_BEHAVIOUR: Live HUD is WorldExploration. GameFlow keeps a pointer-events-none spacer.
DESIRED_BEHAVIOUR: Keep it that way.
EVIDENCE: GameFlow comment + 44px spacer.
RECOMMENDED_ACTION: Do not unmask a second opaque bar.
AUTONOMY:
- REPORT_ONLY
REGRESSION_RISK: HIGH if the dummy bar returns.
VALIDATION_REQUIRED: Leftover XP visible on world enter.
STATUS: IMPLEMENTED
ACTION_ID: UX-RECAP-XP-CURVE
TITLE: Recap and selection XP bars use leftover / 100×2^(N-1)
CATEGORY: reward-clarity
PRIORITY: P0
FILES_OR_SYSTEMS: src/frontend/src/utils/xpCurve.ts; src/frontend/src/components/CharacterSelection.tsx; src/frontend/src/components/WorldExploration.tsx
CURRENT_BEHAVIOUR: This branch uses `xpHudProgress`, `recapXpAfterGrant`, and `xpForNextLevel()`.
DESIRED_BEHAVIOUR: Keep it. Do not open a second leftover-XP PR.
EVIDENCE: CharacterSelection XpBar; WorldExploration recap builders.
RECOMMENDED_ACTION: None. Leave closed.
AUTONOMY:
- REPORT_ONLY
REGRESSION_RISK: MEDIUM if rewritten again.
VALIDATION_REQUIRED: Level 3 with 50 leftover shows 50/400.
STATUS: RESOLVED
ACTION_ID: UX-VITALS-ORB-MAX
TITLE: Side-panel jewels use live HP/AP/MP caps
CATEGORY: ap-mp-clarity
FILES_OR_SYSTEMS: src/frontend/src/utils/vitalsOrbCaps.ts; src/frontend/src/components/WorldExploration.tsx
CURRENT_BEHAVIOUR: Jewels bind `sidePanelVitalsCaps` and show current/max.
DESIRED_BEHAVIOUR: Keep it.
EVIDENCE: Vitals orb map in WorldExploration.
RECOMMENDED_ACTION: None.
AUTONOMY:
- REPORT_ONLY
VALIDATION_REQUIRED: Fill ≤ 100% after AP growth.
STATUS: RESOLVED
# ACTION_IDs — 2026-09-01
ACTION_ID: WDD-2026-09-01-001  
SOURCE_AUTOMATION: World Dynamics Designer (62dfc3fc-a494-11f1-a7d1-d6b4613131ce)  
TITLE: Wave-2 world feature catalog for indefinite variation  
EVIDENCE: Wave 1 (`WDD-2026-08-31-001`) is 18 designed ids in `engine/worldFeatures.ts`. Long sessions still re-roll the same lava / ice / spikes tints and the same two-roll live-modifier pair. Wave 2 adds 16 new ids (one per requested category) that do not clone wave 1, lava/ice/spikes, or the 22 live `EXISTING_MAP_MODIFIER_IDS`.  
RECOMMENDED_ACTION: Keep `docs/WORLD_DYNAMICS.md` + `engine/worldFeatures.ts` as the contract. A later implementer may add a post-`finalizePlayableLayout` overlay that calls `pickWeightedFeatures`, then re-runs `evaluateSolvability`. Credits stay on `applyRewards`. Do not add level cutoffs. Death Realm stays quiet. Flicker Gate, Gambit Chest, Echo Gate, and Pilgrim Banners stay exploration-only.  
DEPENDENCIES: WDD-2026-08-31-001 (wave 1 catalog)  
REGRESSION_RISK: LOW while unwired. HIGH if placed inside `mapGen.ts` or `WorldExploration.tsx` without a solvability re-check.  
VALIDATION_REQUIRED: Catalog tests in `worldFeatures.test.ts` stay green. Wave 2 covers every category. No feature id collides with `EXISTING_MAP_MODIFIER_IDS`. Death Realm rolls stay empty.  
STATUS: DESIGNED
