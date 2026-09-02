# ACTION_IDs — 2026-08-30 Quality Auditor

Durable ledger for the Report Action Orchestrator and next week’s audit.  
Source of every record: Automation Quality Auditor.  
Do not implement gameplay from this file unless a later human or orchestrator explicitly picks an ID and the item is still unique.

**2026-08-31 director note:** Status of these IDs was re-evaluated in [`ACTION_IDS_2026-08-31.md`](./ACTION_IDS_2026-08-31.md) and [`MASTER_ROADMAP.md`](./MASTER_ROADMAP.md). AQA-004 is SUPERSEDED (stack merged). AQA-006 is BROKEN (#110 on `main`). AQA-003 is PARTIAL. All others remain OPEN. New work uses MTD-2026-08-31-* or the reused ID — do not open a second PR for the same theme.

---

ACTION_ID: AQA-2026-08-30-001  
SOURCE_AUTOMATION: Automation Quality Auditor  
TITLE: Throttle the critical / high-severity bug hunter  
CATEGORY: automation-ops  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: Automation `996df6df-9d7a-11f1-a7d1-d6b4613131ce` ran 215 times in the week window (136 no-PR). Ecosystem volume peaked at 103 runs on 2026-08-30. `WorldExploration.tsx` (19,502 lines) received 88 week commits. Three consecutive post-#99 hunter transcripts (`bc-14f8b564`, `bc-37795377`, `bc-8c0b93c3`) each concluded “no critical bugs” after re-deriving the same below-bar leftover list.  
AUTOMATION_AFFECTED: 996df6df-9d7a-11f1-a7d1-d6b4613131ce  
RECOMMENDED_ACTION: REDUCE_FREQUENCY to at most once per 12–24 hours, and pause new runs for 6 hours after a merge to `main` that touches `WorldExploration.tsx` or `progressPersist.ts`. UPDATE_PROMPT: require a uniqueness check against PR titles from the last 24 hours; extract helpers instead of adding WX branches; drop the Slack-or-nothing leftover path (no Slack tool exists).  
DEPENDENCIES: AQA-2026-08-30-002 (merge the second critical hunter first or at the same time)  
REGRESSION_RISK: LOW — slowing a hunter does not remove merged fixes. Residual risk is a slower response to a new critical.  
VALIDATION_REQUIRED: Next auditor window should show ≤14 hunter runs/week and a falling no-PR rate, not zero PRs.  
STATUS: NEW  

---

ACTION_ID: AQA-2026-08-30-002  
SOURCE_AUTOMATION: Automation Quality Auditor  
TITLE: Merge the two critical-bug automations into one  
CATEGORY: automation-ops  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: `1aa41c6c` (Find Critical Gameplay Bugs) ran twice on 2026-08-30 and opened #103 and #109 while `996df6df` was still firing. Jackpot stale-wallet appears in #103, #107, and #111. White portal `(0,0)` appears in #103 and #110. Two critical hunters plus persist/economy/combat specialists implemented the same surfaces in a three-hour window.  
AUTOMATION_AFFECTED: 1aa41c6c-a483-11f1-a7d1-d6b4613131ce; 996df6df-9d7a-11f1-a7d1-d6b4613131ce  
RECOMMENDED_ACTION: MERGE. Keep one critical hunter at the throttled cadence from AQA-2026-08-30-001. Disable or pause `1aa41c6c` as a separate cron. Fold #103/#109 review into the human merge queue (they are still the best-scoped open P1s).  
DEPENDENCIES: AQA-2026-08-30-001  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Only one critical-bug automation ID appears in the next week’s agent list.  
STATUS: NEW  

---

ACTION_ID: AQA-2026-08-30-003  
SOURCE_AUTOMATION: Automation Quality Auditor  
TITLE: Adopt an in-repo ACTION_ID ledger all producers write to  
CATEGORY: process  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: GitHub search for `ACTION_ID` returned 0 issues and 0 PRs. Fourteen sampled implementer transcripts produced no IDs. Orchestrator `68f2958f` (`bc-16e9941d`, PR #108) deduped by informal “already draft #104” and then implemented leftover XP instead of writing IDs. Result: portal +10 XP in #104 and #111; jackpot in #103/#107/#111; Attack Nearest in #102/#104/#105. Daily digest output lives only in Google Drive and cannot be consumed by other agents.  
AUTOMATION_AFFECTED: 68f2958f-a489-11f1-a7d1-d6b4613131ce; 9c30083d-a20f-11f1-b532-320a589b8025; all implementer automations  
RECOMMENDED_ACTION: UPDATE_PROMPT on the orchestrator and every hunter: append records to `docs/automation/ACTION_IDS_*.md` (this schema). Digest must also write `docs/automation/digests/YYYY-MM-DD.md`. Refuse to open a second PR for an ID that is already OPEN or that matches an open PR title/theme.  
DEPENDENCIES: None  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Next week’s search of `docs/automation/` contains IDs from at least the orchestrator, security review, and one hunter. Duplicate-theme draft count drops.  
STATUS: NEW  

---

ACTION_ID: AQA-2026-08-30-004  
SOURCE_AUTOMATION: Automation Quality Auditor  
TITLE: Do not merge the 2026-08-30 overlapping draft stack as-is  
CATEGORY: merge-hygiene  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: Open at audit time: #100 and #101 (coverage clones); #103 (store HP + white portal + jackpot); #104 (portal XP + Attack Nearest, dirty); #105 (targeting rewrite, dirty); #106 (tests overlapping #100/#101); #107 (economy + backend clamp + jackpot); #108 (XP HUD, unique); #109 (touch hazards, unique); #110 (mapGen, AGENTS.md conflict, white portal dup); #111 (persist races duplicating #103/#104/#107).  
AUTOMATION_AFFECTED: 607e0304-a484-11f1-a7d1-d6b4613131ce; f37b7505-a484-11f1-a7d1-d6b4613131ce; 72eb90fe-a483-11f1-a7d1-d6b4613131ce; 1e548d83-a485-11f1-a7d1-d6b4613131ce; 9dcfd122-a484-11f1-a7d1-d6b4613131ce; 4a5a5880-9d7c-11f1-a7d1-d6b4613131ce; 81c2e934-a485-11f1-a7d1-d6b4613131ce  
RECOMMENDED_ACTION: Human pick, do not autonmerge. Suggested keep: #109, #108, #103 (then drop jackpot hunks from #107/#111), #107 backend clamp only, #104 portal-XP *or* #111 portal-XP (not both), #105 *or* #104 Attack Nearest (not both; #102 already merged). Close or supersede #100 if #101 is kept. Do not merge #110 until AQA-2026-08-30-006.  
DEPENDENCIES: None  
REGRESSION_RISK: HIGH if the stack is merged in parallel — dirty #104/#105 plus #111 will fight `main`.  
VALIDATION_REQUIRED: After review, at most one PR per theme remains open; `pnpm typecheck` / tests on the survivor.  
STATUS: NEW  

---

ACTION_ID: AQA-2026-08-30-005  
SOURCE_AUTOMATION: Automation Quality Auditor  
TITLE: Stop the test-coverage clone mill  
CATEGORY: automation-ops  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Test automation `4a5a5880` opened 8 week PRs; only #51 merged. #3 #5 #7 #10 #12 #29 #66 closed unmerged (batch close 2026-08-30 11:20). Same occupancy / `battleParticipant` / loss-path files reappeared as #100 and #101 the same afternoon. `81c2e934` opened overlapping #106. Fix PRs already add more targeted tests than this automation lands.  
AUTOMATION_AFFECTED: 4a5a5880-9d7c-11f1-a7d1-d6b4613131ce; 81c2e934-a485-11f1-a7d1-d6b4613131ce  
RECOMMENDED_ACTION: MERGE the Regression Test Builder into Missing Test Coverage. UPDATE_PROMPT: only add cases for merged fixes that still lack a helper test; never reopen a closed PR’s file set; run after merge bursts, not daily. REDUCE_FREQUENCY to 2–3×/week.  
DEPENDENCIES: AQA-2026-08-30-004 (decide #100 vs #101 vs #106 first)  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Next week ≤3 coverage PRs and merge rate ≥50%, with no occupancy/loss-path reopen.  
STATUS: NEW  

---

ACTION_ID: AQA-2026-08-30-006  
SOURCE_AUTOMATION: Automation Quality Auditor  
TITLE: Align the Solvability Guardian with AGENTS.md — no mapGen implementation  
CATEGORY: prompt-architecture  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `AGENTS.md` line 5 forbids map generation edits. Automation `9dcfd122` opened #110 (`mapGen.ts` +490/−70 plus WX finalize call sites; +1952/−137 overall). Agent prompt authorized a “narrow reachability correction.” White portal-at-spawn duplicates #103.  
AUTOMATION_AFFECTED: 9dcfd122-a484-11f1-a7d1-d6b4613131ce  
RECOMMENDED_ACTION: UPDATE_PROMPT to report-only (ACTION_IDs + failing seed fixtures) unless a human explicitly authorizes a mapGen change. PAUSE implementation until that prompt ships. Close or hold #110.  
DEPENDENCIES: None  
REGRESSION_RISK: LOW if #110 stays unmerged. HIGH if #110 merges without a playtest of CA/void aesthetics and dungeon-chain portals.  
VALIDATION_REQUIRED: Next Solvability run opens 0 mapGen PRs; any seed failures appear as ACTION_IDs only.  
STATUS: NEW  

---

ACTION_ID: AQA-2026-08-30-007  
SOURCE_AUTOMATION: Automation Quality Auditor  
TITLE: Freeze drive-by WorldExploration edits  
CATEGORY: sensitive-code  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `WorldExploration.tsx` is 19,502 lines and took 88 commits in the week window. Persist helper `progressPersist.ts` took only 8 — the lock stabilized; the caller did not. Later same-day hunters re-fixed last-hostile / store-HP / leftover-roster holes created or left by earlier WX patches. `AGENTS.md` already forbids RAF, map gen, turn logic, and damage math — most of those paths still live in this file.  
AUTOMATION_AFFECTED: 996df6df-9d7a-11f1-a7d1-d6b4613131ce; 1aa41c6c-a483-11f1-a7d1-d6b4613131ce; f37b7505-a484-11f1-a7d1-d6b4613131ce; 72eb90fe-a483-11f1-a7d1-d6b4613131ce  
RECOMMENDED_ACTION: UPDATE_PROMPT on every implementer: new behavior must go into `src/frontend/src/engine/*` or `src/frontend/src/utils/*` with tests; WX-only one-line call-site wiring. Reject PRs whose primary hunk is another WX branch.  
DEPENDENCIES: AQA-2026-08-30-001  
REGRESSION_RISK: MEDIUM — some defects are still WX-closure bugs and will take longer to extract.  
VALIDATION_REQUIRED: Next week WX commit count under 20; new tests land beside extracted helpers.  
STATUS: NEW  

---

ACTION_ID: AQA-2026-08-30-008  
SOURCE_AUTOMATION: Automation Quality Auditor  
TITLE: Convert the security 9-finding set into architecture decisions  
CATEGORY: security-architecture  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Security automation `b82ecc58` ran 6 times this week, 0 PRs. Three transcripts reconfirmed the same 9 `active` findings with no human `feedback`. `applyRewards` (`main.mo` 1356–1388) and `saveBattleStats` (`main.mo` 1285–1353, Doka write at 1352) are unbounded client writes. Finding 3 (“must not write Doka from saveBattleStats”) is stale vs `docs/ARCHITECTURE.md` lines 143–154 (heals/spends/death **must** use that write). Shop 60s auto-complete and `completeBossRushRoom` client rewards remain design-level. #107’s backend upper clamp is the first code-shaped response and is still a draft.  
AUTOMATION_AFFECTED: b82ecc58-9d7b-11f1-a7d1-d6b4613131ce; 1e548d83-a485-11f1-a7d1-d6b4613131ce  
RECOMMENDED_ACTION: UPDATE_PROMPT: rewrite finding 3 as “absolute Doka/XP/level must be bounded by current store,” not “do not write Doka.” REDUCE_FREQUENCY to weekly while the set is unchanged. Human decision required: (a) keep official-client trust and clamp like #107, or (b) require canister-side proofs for rewards/purchases. Do not silently reconfirm for a fourth week.  
DEPENDENCIES: AQA-2026-08-30-004 (review #107 clamp as its own change)  
REGRESSION_RISK: HIGH if canister APIs are tightened without a frontend roll — `applyRewards` / `saveBattleStats` are the live persist funnel.  
VALIDATION_REQUIRED: Either a written architecture decision in `docs/ARCHITECTURE.md` or a reviewed clamp PR; security file marks findings decided, not just `active`.  
STATUS: NEW  

---

ACTION_ID: AQA-2026-08-30-009  
SOURCE_AUTOMATION: Automation Quality Auditor  
TITLE: Stop the orchestrator from implementing gameplay  
CATEGORY: automation-ops  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Orchestrator `68f2958f` opened #108 (leftover XP HUD) — a real unique display bug — but did not write ACTION_IDs and listed six playbook specialists (Game Balance, Architecture Debt, Player Journey, Mobile/A11y, Performance, Weekly Changelog) that have **zero** runs in this environment.  
AUTOMATION_AFFECTED: 68f2958f-a489-11f1-a7d1-d6b4613131ce  
RECOMMENDED_ACTION: UPDATE_PROMPT: primary output is the ACTION_ID ledger plus a merge-order note. Implement only display-only items that are unique and not already drafted. Remove or mark “does not exist” the six missing specialists so the run does not wait on them.  
DEPENDENCIES: AQA-2026-08-30-003  
REGRESSION_RISK: LOW — #108 can still be merged as a human-picked HUD fix.  
VALIDATION_REQUIRED: Next orchestrator run produces a ledger file and 0 gameplay PRs unless a unique display-only ID is marked IMPLEMENT.  
STATUS: NEW  

---

ACTION_ID: AQA-2026-08-30-010  
SOURCE_AUTOMATION: Automation Quality Auditor  
TITLE: Dedup persist-race and economy specialists  
CATEGORY: automation-ops  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Same-day drafts #104 (portal XP), #107 (shop/heal/death/clamp), #111 (shop remount, portal XP, jackpot, feat/upgrade/rename in-flight). Transcripts acknowledge each other and still implement. Persist helper churn is low (8 commits); overlapping caller patches are the risk.  
AUTOMATION_AFFECTED: 607e0304-a484-11f1-a7d1-d6b4613131ce; 1e548d83-a485-11f1-a7d1-d6b4613131ce; 72eb90fe-a483-11f1-a7d1-d6b4613131ce  
RECOMMENDED_ACTION: UPDATE_PROMPT on all three: if an open PR already names the race, emit ACTION_ID only. Optional MERGE of Persist Race Auditor into Economy Hunter after the current drafts are resolved.  
DEPENDENCIES: AQA-2026-08-30-003; AQA-2026-08-30-004  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Next persist/economy pair does not open two PRs that both mention portal XP or jackpot.  
STATUS: NEW  

---

ACTION_ID: AQA-2026-08-30-011  
SOURCE_AUTOMATION: Automation Quality Auditor  
TITLE: Point remaining implementer prompts at live architecture  
CATEGORY: prompt-architecture  
PRIORITY: P2  
CONFIDENCE: MEDIUM  
EVIDENCE: Combat Parity #105 rewrites targeting while #102 is merged and #104 is open (dirty). Invariant Guardian implements Attack Nearest again. Security finding 3 vs `saveBattleStats` (see AQA-2026-08-30-008). Contract Guardian correctly treated 12-field `CharacterStats` and stale `dfx.json` as documented, not live bugs — other prompts still discover `backend_extended` as if it were canonical.  
AUTOMATION_AFFECTED: f37b7505-a484-11f1-a7d1-d6b4613131ce; 72eb90fe-a483-11f1-a7d1-d6b4613131ce; b82ecc58-9d7b-11f1-a7d1-d6b4613131ce  
RECOMMENDED_ACTION: UPDATE_PROMPT: cite `docs/ARCHITECTURE.md` + `AGENTS.md` as source of truth; `backend_extended` / root `declarations/` are stale; `saveBattleStats` Doka writes are required; targeting changes require the live-cast gate already on `main` (#95/#102) and must not fork it.  
DEPENDENCIES: AQA-2026-08-30-008  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Next Combat Parity / Invariant runs either no-op or open a PR that rebases on #102 without a second Attack Nearest stack.  
STATUS: NEW  

---

ACTION_ID: AQA-2026-08-30-012  
SOURCE_AUTOMATION: Automation Quality Auditor  
TITLE: Add the smallest outcome-telemetry hooks so next week’s audit is not blind  
CATEGORY: telemetry  
PRIORITY: P2  
CONFIDENCE: MEDIUM  
EVIDENCE: This audit classified every gameplay outcome INCONCLUSIVE, NO_MEASURABLE_EFFECT, or LIKELY_POSITIVE-without-proof. No player population, encounter, recap-cancel, spell-pick, or error-rate series exists. The only “telemetry” hit in source is a comment in `WorldExploration.tsx`. Outcome examples in the auditor prompt (difficulty health, UX cancellation, spell dominance, encounter variety, discovery pacing, performance) cannot be evaluated.  
AUTOMATION_AFFECTED: 976261d8-a49f-11f1-a7d1-d6b4613131ce (consumer); no current producer  
RECOMMENDED_ACTION: Human-designed, backend-authoritative counters only (no gameplay math change): persist-fail vs persist-ok, death-penalty applied, victory paid, recap opened/dismissed, shop credit committed. Until those exist, automations must not claim CLEAR_POSITIVE_SIGNAL.  
DEPENDENCIES: None  
REGRESSION_RISK: MEDIUM if counters are written off the persist lock or invent a second wallet path — they must enqueue on `createProgressPersist` or be query-only.  
VALIDATION_REQUIRED: Next Quality Auditor run can cite at least persist-ok/fail and victory-paid counts for the week, or explicitly repeat “still no telemetry.”  
STATUS: NEW  
