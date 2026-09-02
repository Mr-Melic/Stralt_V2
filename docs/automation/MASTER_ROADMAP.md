# Stralt Master Roadmap

**Director:** Stralt Master Technical Director (`0b92479e-a49e-11f1-a7d1-d6b4613131ce`)  
**Run:** 2026-08-31 00:01 UTC (daily cron)  
**HEAD inspected:** `22503b5` — `fix: keep generated maps solvable across seeds (#110)`  
**Gameplay / production code:** not modified.

This file is the living prioritized roadmap. ACTION_ID records for this run live in [`ACTION_IDS_2026-08-31.md`](./ACTION_IDS_2026-08-31.md). Prior ledger: [`ACTION_IDS_2026-08-30.md`](./ACTION_IDS_2026-08-30.md). Process audit: [`QUALITY_AUDIT_2026-08-30.md`](./QUALITY_AUDIT_2026-08-30.md).

## Evidence available this run

| Source | Status |
| :--- | :--- |
| `AGENTS.md`, `README.md`, `DESIGN.md`, `docs/ARCHITECTURE.md`, `docs/TROUBLESHOOTING.md` | Read |
| Quality audit + ACTION_IDs (2026-08-30 19:00 UTC) | Read; first director-usable ledger |
| Expansion / admin / balance / security / architecture / telemetry *reports* | **Not available as completed artifacts.** Matching specialists launched in the same 00:00–00:02 UTC minute as this run and have not finished. |
| Open ACTION_IDs | AQA-2026-08-30-001 … 012 (all still `NEW` in-repo; none implemented as automation-config changes) |
| Recent commits | `git log` + GitHub `main` since 2026-08-27 |
| Open drafts | #100, #101, #105, #106, #107, #108, #114 |
| Player telemetry | **None.** One comment in `WorldExploration.tsx` (~16457). No persist-ok/fail, victory-paid, recap, spell-pick, or encounter series. |

**Evidence classes used below**

| Class | Meaning |
| :--- | :--- |
| MEASURED PLAYER BEHAVIOUR | Live play counters. **None exist.** |
| DESIGN INTERPRETATION | Product rules in this prompt + `AGENTS.md` / `DESIGN.md` |
| ENGINEERING EVIDENCE | Code, tests, PR history, automation volume |

Telemetry is not allowed to set priority. Correlation is not causation. No CLEAR_POSITIVE_SIGNAL is claimed.

---

## Seven-dimension evaluation

### 1. Correctness — fragile-intact

Official-client persist and victory integrity improved in a 72-hour burst (27th–30th). The *helper* `progressPersist.ts` is stable (8 week commits). The *caller* is not: `WorldExploration.tsx` is **19,619** lines and took **96** commits since 2026-08-24.

Recurring defect class: **dual HP / death authority**. Combatant-store HP, React `enemyHpMap` / `characterStats`, and the post-paint HP-watch disagree. Same-day patches (#78–#99, #103, #109) then a new leak after the evening merge: #114 (plague-zone player death still unset `deathTriggered`, so a 1–2 HP player can kill the last hostile and be paid).

Recurring defect class: **preview vs live targeting**. #95, #102, #104, #113 patched Attack Nearest / Strike. #114 must still pass `barrierTiles` into the live gate. #105 remains an overlapping targeting rewrite on a stale base.

`#110` (mapGen punch / spawn legalize) **merged** after AQA-2026-08-30-006 said hold it. `AGENTS.md` still forbids map-generation edits. Treat further mapGen work as frozen unless a human explicitly authorizes a playtested change.

### 2. Player experience — integrity first, content loop incomplete

ENGINEERING: recap / wallet / death / challenge credit paths are much less likely to lie than a week ago (unit-tested funnel). DESIGN: leftover XP HUD still lies on selection / top bar / recap (#108, unique, unmerged). Touch vs mouse Thorned Ground / Void Rift parity landed (#109).

No MEASURED data on cancellation, confusion, spell use, or discovery pacing. Recap wrapper remains `pointer-events: none` (`docs/ARCHITECTURE.md`) so lava under the card can still fire while persist is in flight — a known PX/integrity interaction, not a new finding.

Starter catalog is 32 static spells (`spellData.ts`). Enemy kits are piece-type + zone (`buildEnemyKit`), plus a level-scaled summoner chance. **Enemy-observed spell discovery is not implemented.** Achievement unlock is client-asserted (`markAchievementUnlocked`). Challenge rewards exist; they do not grant spells.

### 3. Technical health — hotspot + flock

| Surface | Lines | Week-ish commits | Verdict |
| :--- | ---: | ---: | :--- |
| `WorldExploration.tsx` | 19,619 | 96 | Over-patched orchestrator |
| `AdminDashboard.tsx` | 7,322 | — | Over-developed UI without a content pipeline |
| `enemyAI.ts` | 2,582 | — | Extracted and large; stop growing on first specialist run |
| `main.mo` | 3,013 | 6 | Canonical actor; trust boundary unresolved |
| `mapGen.ts` | 988 | 3 | Just rewritten by #110; freeze |
| `progressPersist.ts` | 252 | 8 | Leave it |

Stale paths remain documented, not fixed: `dfx.json` → `backend_extended/`; root `declarations/` 15-field snapshot; unused `src/backend/mixins/*`; two `EnemyConfig` types.

### 4. Content depth — bosses rich, meta-progression thin

Present: player-relative tier spawn (`pickEnemyLevelFromTiers`), AI tiers 1–10, family variants, named boss kits with phase `spellPoolIds`, dungeon chain, Boss Rush (10 rooms), 9 challenges, feats panel.

Missing vs core rules: observed-spell discovery, achievement/challenge/boss *spell* unlocks, admin Draft → Validate → Activate as a real publish pipeline (boss editor has local React drafts only).

`computeAITier` applies a **30% fully random 1–10** roll (`combatMath.ts` 48–50). That contradicts DESIGN “progressively sophisticated enemies.” Do not let an AI specialist “fix” this by rewriting `enemyAI.ts` tonight.

### 5. Long-term scalability — rules vs implementation

| Core rule | Implementation |
| :--- | :--- |
| No character level cap | Yes (`applyRewards` while-loop) |
| Increasing XP | Yes `100 * 2^(N-1)` |
| Player-relative enemies | Yes tier percents + dungeon boost |
| Progressively sophisticated enemies | Partial (tiers + kits); undermined by 30% random AI tier |
| Dynamic enemy spell pools | Boss phases yes; overworld = static kits + summoner coin-flip |
| Enemy-observed spell discovery | **Absent** |
| Achievement / challenge / boss spell unlocks | Rewards are Doka/XP, not spells |
| Backend-authoritative persistence | Wallet/XP yes; combat client-side; achievement unlock client-trusted |
| Optional owner-uploaded visuals + pixel fallback | `pixelPattern` / `spriteUrl` / `pieceArt.ts` fallback exist |
| Admin Draft → Validate → Activate | **Not a canister workflow** |

Expansion that adds spells, AI behaviors, or admin chrome **before** HP-authority extraction and a reward-trust ADR will not scale.

### 6. Data / persistence safety — official client better, canister still trusting

`saveBattleStats` (`main.mo` 1285–1353) still writes client-supplied level / XP / Doka with **no upper bound**. Architecture *requires* this write for heals / spends / death. The defect is unbounded absolute values, not the write (AQA-2026-08-30-008; security finding 3 is stale if phrased as “must not write Doka”).

`applyRewards` (`main.mo` 1356–1389) still accepts unbounded `dokaDelta` / `xpDelta`.

#107 (draft, base `e4abb4c`, **before** #103/#104/#109/#111/#110) contains the first backend clamp. #111 already landed overlapping official-client races (shop credit, portal XP, jackpot, in-flight spends). **Keep the clamp; rebase; drop hunks already on `main`.** Do not merge #107 as-is. #107’s `sessionStorage` death replay is HIGH regression risk if snapshot matching is wrong.

Other sinks (custom client, not official UI): shop 60s auto-complete, `calculateAndAwardDoka` (no frontend caller), `createCharacter` client-chosen stats, `markAchievementUnlocked` without condition proof. `completeBossRushRoom` now ignores client Doka/XP (official path passes 0,0).

`saveKillCount` hook exists (`useLeaderboardQueries.ts` 43–50) and has **no UI caller**. Leaderboard kill totals stall (documented in `TROUBLESHOOTING.md`).

Wallet seeding / idle-hydrate rules remain load-bearing. Do not invent a second persist path for telemetry or expansion rewards.

### 7. Automation coherence — P0, worse than yesterday

AQA-2026-08-30-001…012 were written at 19:00 UTC. By 20:48 UTC the overlapping draft stack was largely **merged anyway** (#103, #109, #112, #113, #104, #111, #110), including forbidden mapGen.

This 00:00 UTC window launched **25+ automations in ~2 minutes**, including first-ever runs of expansion, enemy AI, spell mechanics, game feel, balance, content diversity, admin visuals, spell-discovery admin, telemetry *dashboard*, mobile/a11y, adversarial QA, economy hunter, invariant guardian, orchestrator, and this director.

Yesterday’s audit said those specialists had **zero** runs and must not block the orchestrator. Today they all implement in parallel **before** any of them have written reports this director can consume. That is exactly “P2/P3 expansion displacing unresolved P0/P1.”

| AQA ID | Director status 2026-08-31 |
| :--- | :--- |
| AQA-001 hunter throttle | **OPEN** — `996df6df` still enabled historically (61 runs on the 30th in the first 100-agent page). Not accessible to this principal’s GetAutomation. |
| AQA-002 merge two critical hunters | **OPEN** — `1aa41c6c` still enabled; produced #114 after the evening merges (correct unique P0). |
| AQA-003 in-repo ACTION_ID ledger | **PARTIAL** — ledger exists; most producers still do not write it. |
| AQA-004 don’t merge the stack as-is | **BROKEN** — stack merged; leftovers listed below. |
| AQA-005 test clone mill | **OPEN** — #100/#101/#106 still open; coverage automation running again tonight. |
| AQA-006 no mapGen implementation | **BROKEN** — #110 on `main`. Convert to freeze. |
| AQA-007 freeze drive-by WX | **OPEN** — #114 adds more WX branches (justified plague/barrier). Further WX PRs tonight should be rejected. |
| AQA-008 security → ADR | **OPEN** — no written decision; #107 still the only clamp draft. |
| AQA-009 orchestrator must not implement gameplay | **OPEN** — orchestrator running again at 00:02. |
| AQA-010 persist/economy dedup | **PARTIAL** — #111 merged; #107 stale overlap; economy hunter running again. |
| AQA-011 prompts vs live architecture | **OPEN** | 
| AQA-012 outcome telemetry | **OPEN** — still no counters. Telemetry *dashboard* specialist running tonight must not ship UI without AQA-012. |

---

## Recurring hotspots — local patches no longer sufficient

Do **not** automatically perform a large refactor. Recommend *controlled* extraction only:

1. **HP / death authority** — every lethal tick (plague, DoT, lava, reflect, heal, phase-2) must commit store HP and `deathTriggered` on the same tick. Remaining writes in WX should become one-line calls into `combatantStore` / `battleSetup` / `deathPipeline`. #114 is the last allowed WX patch in this cluster until that extraction exists.
2. **Live-cast gate** — one function, preview and execute. Land #114 barrier pass. **Close #105** rather than rewrite `targeting.ts` on a stale base.
3. **Canister trust** — human ADR: official-client trust + clamps (#107 shape) vs proofs. Until then, no new credit APIs.
4. **Automation flock** — one critical hunter, report-only specialists on first run, no same-hour implementer pile-on after a merge burst.

---

## Human merge queue (do not autonmerge)

| Order | PR | Action |
| :--- | :--- | :--- |
| 1 | **#114** | Review/merge. Unique P0 plague-death victory + P1 barrier LoS. Clean vs `22503b5`. Tests added. |
| 2 | **#107** | Rebase on post-#111 `main`. **Keep backend clamp only** (and tests for it). Drop shop/heal/jackpot/portal hunks already landed. Treat death `sessionStorage` replay as optional / high-risk. |
| 3 | **#108** | Unique leftover-XP HUD. Safe display-only after #114. |
| — | #105 | **Close.** Targeting rewrite duplicates #102/#104/#114. |
| — | #100, #101, #106 | **Close or hold.** Coverage clones; wait for merged unique contracts. |
| — | Any new PR from the 00:00 specialist wave | Default **hold**. Report ACTION_IDs only unless the item is unique, display-only, and not already drafted. |

---

## Prioritized roadmap (what to work next)

**P0 — do these before any expansion PR merges**

1. Stop the same-hour implementer flock (MTD-2026-08-31-001). Report-only for first-run specialists.
2. Throttle / merge critical hunters (AQA-001, AQA-002).
3. Merge #114; rebase #107 clamp-only (MTD-2026-08-31-002).
4. Write the reward-trust ADR (AQA-008). Finding 3 = unbounded absolute write, not “Doka write is a bug.”

**P1 — infrastructure / gameplay integrity**

5. Freeze `mapGen.ts` and `WorldExploration.tsx` drive-bys (AQA-006, AQA-007).
6. Extract remaining HP/death commits out of WX (MTD-2026-08-31-003). No big-bang rewrite.
7. Freeze content/AI/feel/admin *implementation* until P0/P1 above (MTD-2026-08-31-004).
8. Dedup persist/economy implementers; ACTION_IDs only if a race is already drafted (AQA-010).

**P2 — high-value expansion (after P0/P1, not tonight)**

9. Outcome counters, then maybe a dashboard (AQA-012 before any telemetry UI).
10. Enemy-observed spell discovery + achievement/challenge/boss *spell* unlocks (requires persist + metadata, not name heuristics).
11. Admin Draft → Validate → Activate on the canister (do not grow the 7.3k-line dashboard first).
12. Wire `saveKillCount` or drop it from the leaderboard (MTD-2026-08-31-005).
13. Revisit `computeAITier` 30% random vs progressive sophistication (report/design, not an `enemyAI.ts` rewrite).

**P3 — polish**

14. #108 leftover XP HUD.
15. Recap `pointer-events` / lava-under-card (only after persist lock is quiet).
16. Visual / game-feel / mobile polish — DESIGN.md already specifies the look; do not let feel specialists edit combat math or WX.

---

## Contradictions and duplicates (do not re-litigate)

| Conflict | Resolution |
| :--- | :--- |
| Security “don’t write Doka from `saveBattleStats`” vs ARCHITECTURE | Write stays; **clamp** the absolute values. |
| Solvability vs `AGENTS.md` mapGen | #110 already merged; **freeze** further mapGen. |
| AQA-004 vs human merge of the stack | Accept `main`; clean leftovers; do not re-open merged themes. |
| #105 rewrite vs #114 incremental gate | Keep #114; close #105. |
| #107 vs #111 | #111 won the official-client races; #107 keeps clamp only. |
| Progressive AI vs 30% random tier | Design decision later; no first-run AI PR. |
| Expansion specialists vs “P0/P1 first” | Tonight’s wave is the violation. Hold their PRs. |

---

## TOP 5 CURRENT PRIORITIES

1. **Halt same-hour P2/P3 implementation** (25+ automations launched 00:00–00:02 UTC). First-run specialists: ACTION_IDs only.
2. **#114 plague-death + barrier LoS** — last justified combat P0 on current `main`.
3. **#107 rebase → backend clamp only** — first code-shaped answer to unbounded `saveBattleStats` / `applyRewards`.
4. **Reward-trust ADR** (AQA-008) so security review stops weekly-reconfirming a stale finding 3.
5. **WX / mapGen / targeting freeze** after #114 so the persist lock and live gate can settle.

## BLOCKED WORK

- Spell discovery / observed enemy kits / new unlock loops — no observation persist, no metadata pipeline, combat HP still racing.
- Enemy AI capability expansion — `enemyAI.ts` already 2,582 lines; HP/death still dual-written.
- Telemetry admin dashboard — no counters to display (AQA-012).
- Merging #107 or #105 as currently based.
- Further `mapGen.ts` punches without an explicit human playtest of #110.
- Custom-client mint proofs until the ADR exists.
- `calculateAndAwardDoka` productization (unused official path; still a sink).

## SAFE EXPANSION WORK

- Close stale drafts (#100, #101, #105, #106).
- Merge #108 leftover-XP HUD after #114 (display only).
- Adopt ACTION_ID writes in every producer prompt (AQA-003) — process, not gameplay.
- Design-only (no PR): Draft → Validate → Activate; observed-spell persist shape; killCount caller.
- Query-only / persist-lock-enqueued counters (AQA-012) — **design + tiny isolated PR**, not a dashboard.

## AREAS TO STOP TOUCHING TEMPORARILY

- `src/frontend/src/components/WorldExploration.tsx` except one-line helper wiring
- `src/frontend/src/engine/mapGen.ts`
- RAF loop, turn-order math, damage formulas (`AGENTS.md`)
- `src/frontend/src/utils/progressPersist.ts` (stable)
- `src/frontend/src/engine/targeting.ts` until #114 is merged or closed
- `src/frontend/src/engine/enemyAI.ts`
- `src/frontend/src/components/AdminDashboard.tsx` (7.3k; no pipeline yet)
- `src/backend/main.mo` reward methods except a reviewed clamp

## ARCHITECTURAL HOTSPOTS

1. Dual HP / death authority (React snapshot vs `combatantsRef` vs HP-watch)
2. Preview vs live targeting (still leaking after four merges)
3. Client-trusted `applyRewards` / `saveBattleStats`
4. 19.6k-line world orchestrator absorbing every hunter
5. Automation pile-on (two critical hunters + first-run expansion suite)

## TELEMETRY SIGNALS WORTH INVESTIGATING

**None can be investigated in production — the series do not exist.**

When AQA-012 lands, investigate in this order (engineering + design, not telemetry-alone priority):

1. persist-ok vs persist-fail and death-penalty-applied vs victory-paid (integrity)
2. recap opened vs dismissed vs lava-death-during-recap (PX / known `pointer-events: none`)
3. spell-cast counts **by acquisition path** (starter vs unlocked vs observed) — a “weak” spell may be undiscovered, not weak
4. Attack Nearest vs aimed-cast ratio (gate confusion vs power)
5. challenge accept vs complete vs advertised-reward-missing (already a historical integrity bug)

Until those exist: automations must not claim CLEAR_POSITIVE_SIGNAL or “players don’t use X.”
