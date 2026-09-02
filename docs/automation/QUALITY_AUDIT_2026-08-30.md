# Automation quality audit — week of 2026-08-23

**Auditor:** Automation Quality Auditor (`976261d8-a49f-11f1-a7d1-d6b4613131ce`)  
**Window:** 2026-08-23 19:00 UTC → 2026-08-30 19:00 UTC (weekly cron `0 19 * * 0`)  
**This run:** first Quality Auditor pass (`bc-9fb7e418-627b-48f2-aaa4-5cf0f4a2a760`)  
**HEAD inspected:** `e4abb4c` (`fix: target live combatants in Attack Nearest (#102)`)  
**Gameplay code:** not modified.

## Evidence sources

| Source | What it covered |
| :--- | :--- |
| Cursor cloud agents (this environment) | 255 automation runs since 2026-08-16; 245 inside the week window |
| GitHub `Mr-Melic/stralt` | Commits, PR titles/bodies, merge/close state through #111 |
| Agent transcripts (via subagents) | Today’s specialist suite, security ×3, digest ×3, test coverage ×5, three no-PR bug-hunter runs |
| Repo docs | `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/TROUBLESHOOTING.md` |
| Player telemetry | **None.** One comment in `WorldExploration.tsx` mentions “telemetry”; no analytics, no encounter/UX/balance metrics |

No prior Quality Auditor report exists. No `ACTION_ID` string appears in the repository or in GitHub issues/PRs. GitHub issues: **0**. Formal reverts: **0**. Closed-unmerged PRs: **11** (mostly stale test drafts, plus a few superseded fixes).

GetAutomation metadata is readable for the 2026-08-30 specialist suite and this auditor. Older automations (`996df6df`, `4a5a5880`, `b82ecc58`, `27809f11`, `9c30083d`) are named from their agent titles only.

---

## Ecosystem snapshot

| Metric | Value |
| :--- | :--- |
| Unique automations observed | 16 |
| Week runs | 245 (244 `IDLE`, 1 `ERROR`) |
| Runs that opened a PR / recorded a diff | 98 |
| Runs with no PR | 147 (60%) |
| Runs on 2026-08-30 alone | 103 |
| Critical-bug family (`996df6df`) week runs | 215 |
| Open drafts at audit time | #100, #101, #103–#111 (#102 already merged) |
| `WorldExploration.tsx` | 19,502 lines; **88** week commits touching it |
| Dedicated test-automation PRs merged | 1 of 8 (`#51`) |

Daily run volume (week): 23rd 1 → 24th 2 → 25th 3 → 26th 3 → **27th 40 → 28th 44 → 29th 49 → 30th 103**. The ecosystem scaled from a handful of hunters to a near-continuous critical-bug mill, then a same-day specialist pile-on.

The single `ERROR` run is `bc-be3ce690` (High-severity bug management). Dashboard events for that run are empty; treat as infrastructure noise, not a product finding.

---

## Per-automation evaluation

### 1. Critical / high-severity bug hunter — `996df6df-9d7a-11f1-a7d1-d6b4613131ce`

**Names this week:** Critical bug investigation (133), High-severity bug management (74), plus scan/inspection/identification/management aliases.  
**Volume:** 215 week runs, 79 PRs, 136 no-PR. One ERROR.

| Dimension | Assessment |
| :--- | :--- |
| Useful defects | High. Most merged `#1`–`#102` integrity work originated here: victory XP, death penalty, persist lock, shop/heal Doka, Boss Rush room-0 farm, Death Realm guards, challenge credit, summon hostility/lifespan, last-hostile victory, store-committed HP. |
| Useful features | None (fix-only). |
| False positives | Frequent confirm-then-reverse on no-PR runs (lava re-farm after #99, slot-0 wipe, watchdog dual-AI, jackpot mint). Prompt bar is “critical + concrete trigger”; leftovers are stamped below-bar in automation memory. |
| Duplicates | Same persist-lock story shipped as many PRs (#19/#24/#25/#34/#36/#37/#54/#55/#56). Same last-hostile / DoT / turn-skip cluster on 2026-08-30 (#81–#89). Duplicate open PRs closed unmerged (#70 vs #76, #82 vs #84, #85 vs #87). |
| Regressions caused | No formal revert. Rapid `WorldExploration` stacking is the regression *risk* (see Outcome). Later hunters spent the day re-fixing last-hostile / store-HP / leftover-roster holes left by earlier same-day merges. |
| Unnecessary churn | 136 no-PR runs still paid a full inspect of combat + persist. Workspace often started behind `origin/main`. |
| Repeated recommendations | Persist lock vs `saveBattleStats`; client-trusted `applyRewards`; shop 60s auto-complete; Attack Nearest vs live gate; HP-watch as recovery for stale AI HP. |
| Stale assumptions | “Slack the leftovers” — no Slack tool, so silent. `saveBattleStats` writing Doka treated as accidental; architecture requires it for heals/spends/death (`docs/ARCHITECTURE.md` persist table; `main.mo` 1285–1353). |
| Tests added | Many *with* fix PRs (deathGuards, progressPersist, challengeCompletion, turnQueue, summonLifespan, …). Good. |
| Reports acted upon | High human merge rate 2026-08-27–30. |
| Reports ignored | Design-level canister trust (same 9 security items). |
| Overlap | Now overlaps **Find Critical Gameplay Bugs**, Invariant Guardian, Combat Parity, Persist Race Auditor, Economy Hunter. |

**Classification: REDUCE_FREQUENCY + UPDATE_PROMPT**

This hunter discovered real player-visible defects. It is also the agent that repeatedly edits the most sensitive file with diminishing unique yield (215 runs / 79 PRs / 136 no-ops; 103 ecosystem runs on the 30th). Cap it (daily or after each merge burst), require a uniqueness check against the last 24h of PR titles, and stop touching `WorldExploration.tsx` unless the defect cannot be extracted.

---

### 2. Find Critical Gameplay Bugs — `1aa41c6c-a483-11f1-a7d1-d6b4613131ce`

**Runs:** 2 (15:00 and 18:00 UTC 2026-08-30). **PRs:** #103 (open), #109 (draft).

| Dimension | Assessment |
| :--- | :--- |
| Useful defects | #103: enemy/boss heals and phase-2 HP skipped the combatant store; dungeon white portal at `(0,0)`; jackpot heal used the render wallet. #109: touch battle-walk skipped Thorned Ground / Void Rift HP that mouse walk applied. |
| Duplicates | Jackpot restated in #107 and #111. White portal restated in #110. Correctly avoided re-fixing #102 / #104 / #107 on the 18:00 pass. |
| Tests | Focused helper tests (`battleSetup.hp`, portal attach, jackpot spend). |
| Overlap | Same job as `996df6df`, at a saner cadence. |

**Classification: MERGE** into the single remaining critical hunter after that hunter is throttled. Two critical hunters plus three specialists implementing on the same afternoon is how #103/#107/#111 triple-wrote jackpot.

---

### 3. Missing test coverage — `4a5a5880-9d7c-11f1-a7d1-d6b4613131ce`

**Runs:** 8 week PRs. **Merged:** #51 only. **Closed unmerged:** #3, #5, #7, #10, #12, #29, #66. **Open drafts:** #100, #101.

| Dimension | Assessment |
| :--- | :--- |
| Useful defects | None (tests-only). #51 extracted `challengeCompletion.ts` and locked challenge boundaries, hostile summons, dungeon 4× clamp, persist-lock release. That is the one landed win. |
| Duplicates | Occupancy / `battleParticipant` / loss-path tests cloned #29 → #66 → #100 → #101. Agent notes “earlier coverage never landed” and reopens the same three files. |
| Reports ignored | A batch close at 2026-08-30 11:20 UTC discarded a week of test drafts. Then the same day opened #100 and #101 again. |
| Tests added | High volume, low merge rate (1/8). Fix PRs from the bug hunter already add more targeted tests than this automation lands. |

**Classification: UPDATE_PROMPT + REDUCE_FREQUENCY**

Only add tests for **merged** fixes that still lack a helper case. Refuse to reopen a closed coverage PR’s file set. Merge cadence: after a merge burst, not daily.

---

### 4. Regression Test Builder — `81c2e934-a485-11f1-a7d1-d6b4613131ce`

**Runs:** 1. **PR:** #106 (draft). Locks #81–#99 contracts (run-portal suppress, leftover-roster XP, AoE vs enemy minions, lethal store `hp: 0`). Import-suffix-only production edits.

**Classification: MERGE** into the test-coverage automation. Two test writers on the same afternoon produced overlapping portal/occupancy suites (#100/#101/#106).

---

### 5. Application security review — `b82ecc58-9d7b-11f1-a7d1-d6b4613131ce`

**Runs:** 6 week, 0 PRs. Three transcripts sampled (27th, 28th, 29th): **same 9 active findings**, flagged-vuln file unchanged, no Slack.

| # | Severity | Finding (first seen ~`a0ca6e63`) |
| ---: | :--- | :--- |
| 1 | Critical | Shop `processPendingPurchases` auto-credits after 60s |
| 2 | Critical | `applyRewards` accepts unbounded client `dokaDelta` / `xpDelta` (`main.mo` 1356–1388) |
| 3 | High | `saveBattleStats` overwrites Doka (`main.mo` 1352) |
| 4 | High | `calculateAndAwardDoka` attacker-controlled enemy list |
| 5 | Critical | `completeBossRushRoom` client Doka/XP, no room-clear proof |
| 6 | High | `createCharacter` client-chosen level / stats / spell levels |
| 7 | Medium | Unauthenticated `sendMessage` impersonation |
| 8 | High | `updateCharacter` HP cap uses **supplied** level |
| 9 | Medium | `markAchievementUnlocked` / claim with no condition check |

| Dimension | Assessment |
| :--- | :--- |
| Useful defects | The mint/trust boundary is real for a **custom client**. Official-client persist work does not close those canister sinks. |
| False positives / stale | Finding 3 conflicts with current architecture: death/heal/shop **must** write Doka through `saveBattleStats` (`docs/ARCHITECTURE.md` lines 143–154; `AGENTS.md` persist rules). The real issue is **unbounded absolute values**, not the write itself. First-login-becomes-admin and admin ad URLs correctly treated as by-design. |
| Reports repeatedly ignored | All 9 remain `active` with **no human feedback** across three weekly reconfirms. |
| Overlap | Economy Hunter #107 starts a backend clamp (the right *shape* for findings 2–3) but leaves shop 60s auto-complete alone. |

**Classification: KEEP + UPDATE_PROMPT + REDUCE_FREQUENCY (weekly is enough while the set is unchanged)**

Emit durable `ACTION_ID`s. Do not re-file finding 3 as “Doka write is a bug.” Ask for an architecture decision on client-trusted canister APIs instead of a silent weekly reconfirm.

---

### 6. Daily engineering digest — `9c30083d-a20f-11f1-b532-320a589b8025`

**Runs:** 3. **Repo PRs:** 0. Posts Google Docs (26–27, 27–28, 28–29). Accurate merge changelogs. Watchlists went stale within 24h as humans merged.

| Dimension | Assessment |
| :--- | :--- |
| Useful | The only human-readable week narrative besides PR titles. |
| Stale | “No security/dependency changes” means no *commits*, not “canister is safe.” Parallel security reviews still list 9 vulns. |
| Gap | Output lives outside the repo, so other automations cannot consume it as ACTION_IDs. |

**Classification: KEEP + UPDATE_PROMPT** — also append a dated file under `docs/automation/digests/` so the orchestrator and this auditor can read it next week.

---

### 7. Engineering documentation updates — `27809f11-9d7c-11f1-a7d1-d6b4613131ce`

**Week PRs:** #50, #68 (merged). Older #2 also merged 2026-08-27. Documents persist lock, XP curve, shop, Boss Rush, challenges, Death Realm, dungeon chain. Matches `AGENTS.md` / live `main.mo`.

**Classification: KEEP.** Highest signal-to-churn ratio after the contract guardian.

---

### 8. State & Persistence Race Auditor — `607e0304-a484-11f1-a7d1-d6b4613131ce`

**Runs:** 1. **PR:** #111 draft (+440/−99, 17 files). Real races (shop-credit remount commit, `_ok` parse miss, rename double-submit) mixed with copies of #103 jackpot, #104 portal XP, #107 in-flight gates.

**Classification: UPDATE_PROMPT.** Report ACTION_IDs and implement **only** races not already in an open PR. Do not re-patch portal XP / jackpot / feat claim.

---

### 9. Dungeon Solvability Guardian — `9dcfd122-a484-11f1-a7d1-d6b4613131ce`

**Runs:** 1. **PR:** #110 draft (+1952/−137, 10 files). Reachability punch, spawn legalize, progression-portal guarantee, 128-seed property tests. **Edits `mapGen.ts`.**

`AGENTS.md` line 5: “Do not touch RAF loop, **map generation**, turn logic, damage math.” The agent prompt authorized a “narrow reachability correction.” Those two instructions conflict. White portal-at-spawn duplicates #103.

**Classification: UPDATE_PROMPT** (report-only / human-approved mapGen) — treat as **PAUSE** until the prompt cites `AGENTS.md` and stops implementing map generation on the first run.

---

### 10. Stralt Report Action Orchestrator — `68f2958f-a489-11f1-a7d1-d6b4613131ce`

**Runs:** 1. **PR:** #108 draft. Leftover-XP HUD on select / top bar / recap is a real display bug and is unique among open PRs. The run also correctly discarded already-merged or already-drafted items.

Failures: (1) implemented instead of only orchestrating; (2) **zero ACTION_IDs** produced or consumed; (3) playbook names Game Balance, Architecture Debt, Player Journey, Mobile/A11y, Performance, Weekly Changelog specialists that **have no runs in this environment**.

**Classification: UPDATE_PROMPT.** Persist an ACTION_ID ledger. Implement only if the item is unique, display-only, and not already drafted. Do not invent missing specialists.

---

### 11. Regression Hunter — `1f90a60d-a484-11f1-a7d1-d6b4613131ce`

**Runs:** 1. **PR:** none. Inspected `main` from the prior 6h slot through `#102`. 84 related tests passed. Unproven watches (Attack Nearest vs live LoS; atypical Boss Rush stack) left as watches. Correct no-op.

**Classification: KEEP.** First run showed the discipline the implement-first specialists lacked.

---

### 12. Economy & Exploit Hunter — `1e548d83-a485-11f1-a7d1-d6b4613131ce`

**Runs:** 1. **PR:** #107 draft (+795/−131, 12 files). Official-client double-click shop/heal, ground-loot double-claim, death persist retry, **backend clamp** on `saveBattleStats` so a client cannot mint above the current store. Prices/rates unchanged.

| Dimension | Assessment |
| :--- | :--- |
| Useful | Backend clamp is the first code response to security findings 2–3 that matches architecture (absolute writes stay, upper bound is added). |
| Overlap | Jackpot / in-flight claim / upgrade with #103 and #111. |
| Risk | `sessionStorage` death replay can misfire if snapshot matching is wrong. Shop 60s auto-complete left alone (correctly called out as not official-client). |

**Classification: UPDATE_PROMPT.** Dedup against open persist PRs. Keep the backend clamp as a standalone, reviewable change.

---

### 13. Backend Contract Guardian — `4fba3a56-a485-11f1-a7d1-d6b4613131ce`

**Runs:** 1. **PR:** none. Live 12-field `CharacterStats` / bindgen / `main.mo` agree. Correctly left stale `dfx.json` → `backend_extended` and root `declarations/` alone (documented, not imported).

**Classification: KEEP.**

---

### 14. Combat Rules Consistency Auditor — `f37b7505-a484-11f1-a7d1-d6b4613131ce`

**Runs:** 1. **PR:** #105 draft, **mergeable dirty** (+795/−302). Unifies preview vs live-cast. Attack Nearest overlaps merged #102 and draft #104. Large `targeting.ts` rewrite.

**Classification: UPDATE_PROMPT.** Report the parity matrix; do not rewrite targeting on week one while #102/#104 are in flight.

---

### 15. Gameplay Invariant Guardian — `72eb90fe-a483-11f1-a7d1-d6b4613131ce`

**Runs:** 1. **PR:** #104 draft (dirty). Portal +10 XP credited before `applyRewards` (real mint path via idle hydrate). Attack Nearest Chebyshev / raw range (real gate hole). Portal-XP copy lands again in #111.

**Classification: UPDATE_PROMPT.** Keep the invariant checklist; implement one unique break per run; emit ACTION_IDs for the rest.

---

### 16. Automation Quality Auditor — `976261d8-a49f-11f1-a7d1-d6b4613131ce`

**Runs:** this one (after the window). Docs-only.

**Classification: KEEP.** Next week must verify whether the 2026-08-30 draft pile merged, closed, or re-cloned.

---

## Agents repeatedly modifying sensitive code

| Agent | Sensitive surface | Week benefit vs cost |
| :--- | :--- | :--- |
| Critical / high-severity hunter (`996df6df`) | `WorldExploration.tsx` (19,502 lines, 88 week commits), persist lock, turn advance, DoT/hazard HP | Early-week persist/combat fixes were high value. By 2026-08-30 the same file was being patched every few minutes for last-hostile / store-HP / leftover variants. **Highest unnecessary sensitive churn.** |
| Find Critical Gameplay Bugs | Combatant-store HP, walk hazards, WX shop | Two focused P1s. Acceptable *if* the other hunter is throttled. |
| Persist Race Auditor | Persist lock, shop, portal XP, `main` callers | First run already overlaps three open PRs. |
| Economy Hunter | `main.mo` `saveBattleStats` / `applyRewards` contract | Backend clamp is valuable; do not let a second agent rewrite the same methods the next cycle. |
| Combat Parity | `targeting.ts`, Attack Nearest, live-cast | High regression risk on a dirty PR. |
| Dungeon Solvability | **`mapGen.ts` — forbidden by `AGENTS.md`** | Tests are useful; implementing punches on run 1 is not. |

`progressPersist.ts` itself had only 8 week commits — the lock helper stabilized. The churn is the 19k-line caller, not the lock.

---

## Prompt vs current architecture

Live architecture (`docs/ARCHITECTURE.md`, `AGENTS.md`):

- Canonical actor is `src/backend/main.mo` (12-field `CharacterStats`). `dfx.json` → `backend_extended/` is stale.
- Battle XP/Doka **credits** go through `applyRewards`. Penalties and shop/heal spends go through `saveBattleStats` on `createProgressPersist`.
- `applyRewards` is Nat-only (`100 * 2^(N-1)`).
- Do not touch RAF, map generation, turn logic, or damage math.
- Spell targeting uses explicit `SpellConfig` metadata.

Prompt mismatches observed this week:

1. **Map generation:** Solvability Guardian prompt vs `AGENTS.md` line 5. Result: #110.
2. **`saveBattleStats` Doka write:** Security prompt treats `main.mo` 1352 as a vulnerability. Architecture requires that write for death/heal/shop. The prompt should say “unbounded client absolute values,” not “must not write Doka.”
3. **Turn / last-hostile:** Critical hunter repeatedly edits turn-advance after last kill — adjacent to the forbidden “turn logic” line. Several of those fixes were necessary; the prompt should require extraction into `turnQueue.ts` / `battleSetup.ts` instead of more WX branches.
4. **Orchestrator playbook** lists six specialists that do not exist in this environment.
5. **ACTION_ID contract** is specified on this auditor (and implied for the orchestrator) but **no producer writes the schema**. Dedup is informal (“already draft #104”), which is why portal XP / jackpot / Attack Nearest shipped 2–3 times in three hours.
6. **Slack leftovers:** Critical hunter and security review say “Slack, don’t PR.” There is no Slack tool. Findings die in automation memory.

---

## Implemented, reverted, ignored

### Implemented (merged on `main` during the week — selected clusters)

Persist / economy: `#1` `#6` `#8` `#11` `#13`–`#22` `#24`–`#27` `#32` `#34` `#36`–`#42` `#45`–`#47` `#49` `#53`–`#56` `#96` `#99`.  
Death Realm / dungeon / Boss Rush: `#21` `#23` `#28` `#30` `#31` `#33` `#35` `#44` `#52` `#60` `#94` `#97`.  
Combat / summons / victory: `#4` `#63`–`#65` `#67` `#69` `#71`–`#79` `#81` `#83` `#84` `#86`–`#93` `#95` `#98` `#102`.  
Docs: `#2` `#50` `#68`. Tests: `#51`.

Human merge rate after 2026-08-27 is high. That is “reports acted upon” for the critical hunter.

### Reverted

No `revert` commits. Functional equivalents:

- Closed-unmerged test mill (`#3` `#5` `#7` `#10` `#12` `#29` `#66`) and superseded fix drafts (`#43` `#70` `#82` `#85`), many closed together at 2026-08-30 11:20 UTC.
- Same-day replacement PRs (e.g. `#85` closed, `#87` merged for last-hazard skip).

### Repeatedly ignored

- Security 9-finding set (three weekly reconfirms, no human `feedback`).
- Stale `dfx.json` / root `declarations/` 15-field path (documented, still present).
- Closed test drafts, then reopened as #100/#101.
- ACTION_ID schema (never adopted).

---

## Outcome quality

No player population, encounter, cancellation, spell-pick, or performance telemetry exists. Sample size of *players* is unknown. Almost all merged work landed in a 72-hour burst (27th–30th) with many simultaneous authors. **Do not attribute any live-player outcome to one automation.**

| Change class | What the code change intended | Telemetry | Classification | Why |
| :--- | :--- | :--- | :--- | :--- |
| Persist / wallet / death penalty / shop spend | Credits and spends survive reload and do not wipe each other | None | **LIKELY_POSITIVE** | Defect class is deterministic (absolute snapshot vs in-flight credit). Unit tests now lock the funnel. Still no proof players hit the old paths less. Simultaneous persist PRs could reintroduce races — that risk is why this is not CLEAR_POSITIVE. |
| Boss Rush room-0 farm / inBattle stuck / lava-resume | Stop refill / stuck tree | None | **LIKELY_POSITIVE** | `#21` `#30` `#31` `#99` form a coherent sequence; #99 still needed after #21. |
| Victory / last-hostile / store HP / summons | Fights can end and pay | None | **LIKELY_POSITIVE** (integrity) / **INCONCLUSIVE** (difficulty health) | Many same-day patches (#78–#98) mean the “healthy fight” outcome is still moving. |
| Challenge credit / AP spend | Advertised challenges can complete | None | **LIKELY_POSITIVE** | Predicate + live refs + damage/AP accumulators landed with tests (`#39` `#41` `#57`–`#64`). |
| Attack Nearest / Strike range | Casts match live hostiles / range | None | **INCONCLUSIVE** | #102 merged; #104/#105 still rewrite the same gate. |
| XP HUD leftover (#108) | Stop lying about leftover XP | Unmerged | **NO_MEASURABLE_EFFECT** | Not on `main`. |
| Touch walk hazards (#109) | Touch = mouse Thorned/Rift | Unmerged | **NO_MEASURABLE_EFFECT** | Not on `main`. |
| Map solvability (#110) | Every seed has a route | Unmerged + policy conflict | **INCONCLUSIVE** | Cannot credit or blame. |
| Economy clamp / official-client exploits (#107) | No double-claim / no absolute mint | Unmerged | **NO_MEASURABLE_EFFECT** | Not on `main`. |
| Spell balance / tactical diversity | — | No automation changed numbers | **NO_MEASURABLE_EFFECT** | No Game Balance agent runs. |
| Enemy variants / encounter variety | — | None | **NO_MEASURABLE_EFFECT** | |
| Spell-discovery pacing | — | None | **NO_MEASURABLE_EFFECT** | |
| UX cancellation / confusion | — | None | **INCONCLUSIVE** | Digests do not record player signals. |
| Performance / error rate | — | None | **INCONCLUSIVE** | No Performance specialist; no error budget. |
| Automation-driven *stability of the persist lock as a system* | Stop wallet wipes | None | **POSSIBLE_NEGATIVE_EFFECT** | Individual bugs were real, but 88 WX commits + three overlapping 2026-08-30 persist drafts (#104/#107/#111) is how a lock acquires new races. Not a measured player regression — a process risk. |
| Security posture (custom client mint) | Close canister sinks | None | **NO_MEASURABLE_EFFECT** | Findings unchanged after six reviews. |

No **CLEAR_POSITIVE_SIGNAL** or **CLEAR_REGRESSION** can be assigned without player telemetry or a revert.

---

## Classification board

| Automation | Classification | One-line reason |
| :--- | :--- | :--- |
| Critical / high-severity hunter (`996df6df`) | **REDUCE_FREQUENCY** + **UPDATE_PROMPT** | 215 runs, 136 no-ops, 88 WX commits |
| Find Critical Gameplay Bugs | **MERGE** | Same job as the hunter; two good P1s |
| Missing test coverage | **UPDATE_PROMPT** + **REDUCE_FREQUENCY** | 1/8 merged; clone mill |
| Regression Test Builder | **MERGE** | Into test coverage |
| Application security review | **KEEP** + **UPDATE_PROMPT** + **REDUCE_FREQUENCY** | Same 9 findings; weekly is enough |
| Daily engineering digest | **KEEP** + **UPDATE_PROMPT** | Useful; persist in-repo |
| Engineering documentation | **KEEP** | Architecture-accurate |
| Persist Race Auditor | **UPDATE_PROMPT** | Dedup or it will re-patch #103/#104/#107 |
| Dungeon Solvability Guardian | **UPDATE_PROMPT** / **PAUSE** | Implements forbidden mapGen |
| Report Action Orchestrator | **UPDATE_PROMPT** | Must write ACTION_IDs, not more gameplay |
| Regression Hunter | **KEEP** | Correct no-op |
| Economy & Exploit Hunter | **UPDATE_PROMPT** | Keep clamp; dedup jackpot/in-flight |
| Backend Contract Guardian | **KEEP** | Clean, no churn |
| Combat Rules Consistency Auditor | **UPDATE_PROMPT** | Dirty targeting rewrite vs #102/#104 |
| Gameplay Invariant Guardian | **UPDATE_PROMPT** | Two real breaks; portal XP duplicated |
| Automation Quality Auditor | **KEEP** | First pass |

No **INCREASE_FREQUENCY**. No **SPLIT**. **PAUSE** applies only to map-gen implementation until the Solvability prompt matches `AGENTS.md`.

Actionable `ACTION_ID` records: [`ACTION_IDS_2026-08-30.md`](./ACTION_IDS_2026-08-30.md).
