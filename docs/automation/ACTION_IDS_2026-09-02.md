# ACTION_IDs — 2026-09-02 Master Technical Director

Durable director ledger. Reuse existing IDs. Do not append specialist catalogs here.

**HEAD:** `58302bc` (#258 GameKey shop)  
**Prior director:** [`ACTION_IDS_2026-09-01.md`](./ACTION_IDS_2026-09-01.md) + [`MASTER_ROADMAP.md`](./MASTER_ROADMAP.md)  
**This agent:** `bc-a7b3fff6-cf5d-40c4-9b9a-bfcde9471ba3`  
**Gameplay / production code:** not modified this run.

Specialist IDs stay in their producer files (`ACTION_IDS_SDE_*`, `ACTION_IDS_MIMA_*`, `ACTION_IDS_SDA_*`, orchestrator `ACTION_IDS_2026-09-01-*.md`, TBC in its own file going forward). Do not concatenate into this ledger.

---

## Status of prior director IDs (reuse; do not mint twins)

| ACTION_ID | STATUS | Notes |
| :--- | :--- | :--- |
| MTD-2026-08-31-001 / MTD-2026-09-01-001 | OPEN | Flock halt failed third midnight. See MTD-2026-09-02-001. |
| MTD-2026-09-01-002 | IMPLEMENTED | #183 merged; #255/#256 tightened unpaid replay. Freeze `deathPenalty.ts`. |
| MTD-2026-09-01-003 | IMPLEMENTED | `writeLiveDoka` / `creditLiveDoka` / `beginRename` on `main`. |
| MTD-2026-09-01-005 | IMPLEMENTED | `main.mo` 2028–2032 `level = character.level`. |
| MTD-2026-08-31-002 | IMPLEMENTED | Clamps on `main`. |
| AQA-2026-08-30-008 | PARTIAL | Clamps + ignore-client level; **no ADR**. |
| AQA-2026-08-30-003 / MTD-2026-09-01-004 | PARTIAL | 09-01 director file was concatenated by TBC/LHIPS. See MTD-2026-09-02-004. |
| AQA-2026-08-30-006 | BROKEN | mapGen 1348 → 1544. Guardian in tonight’s flock. |
| AQA-2026-08-30-007 | BROKEN | 49 WX commits since `dd275aa`. File shrank 20063 → 19253. |
| AQA-2026-08-30-005 | PARTIAL | #173 stacked. Test mill in tonight’s flock. |
| AQA-2026-08-30-012 | OPEN | Still 0 collectors. |
| TBC-2026-08-31-001 | OPEN | WAITING_FOR_TELEMETRY. Confirmed this run. |
| MIMA-2026-08-31-001 | OPEN | Swap still teleports (`WX` 9436–9448). |
| MIMA-2026-08-31-002 | PARTIAL | Dest occupancy/unseal landed; **no** `applyBattleWalkHazards`. |
| MIMA-2026-09-01-001 | OPEN | Execute still `path.length` (WX 10663). |
| MIMA-2026-09-01-002 | OPEN | `findPath` ignores barriers/occupants (WX 4483–4493). |
| MIMA-2026-09-01-003 | PARTIAL | Preview no longer flips Pacifist. Summon-kill policy is HUMAN. |
| MIMA-2026-09-01-004 | PARTIAL | WX passes `victoryPersistPendingRef`. |
| SDA-2026-08-31-002 / SDA-2026-09-01-003 | OPEN | Catalog still hydrates into every book. |
| SDA-2026-08-31-004 | OPEN | No observe→win persist. |
| SDA-2026-09-01-002 | IMPLEMENTED | Bindgen summon fields present in `backend.ts`. |
| EXPANSION-PREREQ-A | OPEN | `WX` 12035 still passes LevelZone object. |
| MTD-2026-08-31-003 | OPEN | HP/death extraction. Not tonight. |
| MTD-2026-08-31-004 | OPEN | Expansion freeze. Implementer flock running. |
| MTD-2026-08-31-005 | OPEN | `useSaveKillCount` unused. |
| MTD-2026-08-31-006 | OPEN | Admin DVA not canister. |
| MTD-2026-08-31-007 | OPEN | Point at SDA-002/004; no fifth schema. |
| MTD-2026-08-31-008 | OPEN | 30% random AI tier (`combatMath.ts` 48–50). |
| LHIPS-2026-09-01-001 | NEW / HOLD | HUD saturates at 48. Do not retune curve. |
| LHIPS-2026-09-01-002 | NEW / HOLD | 100k/500k clamp vs jackpot. Architecture, not a BAL retune. |

---

ACTION_ID: MTD-2026-08-31-001  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Halt same-hour P2/P3 implementer flock after a merge burst  
CATEGORY: automation-coherence  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: Failed 2026-08-31 (25+ agents). Recurred 2026-09-01 00:00 (34 agents). Recurred 2026-09-02 00:00: **41** automations including Approved Game Design Implementer `fe5b679a`, map integrity `9dcfd122`, combat parity `f37b7505`, adversarial QA `08e7de28`, security `c97e5c0c`, persist `607e0304`, economy `1e548d83`, complexity reduction `386a157d`, plus expansion/AI/feel/admin/telemetry. P0 leftover is now #259 (EOP), not #183. Cursor has no dashboard write API.  
SYSTEMS_AFFECTED: all implementer automations; merge queue; live Caffeine upgrade  
RECOMMENDED_ACTION: First-run and expansion specialists emit ACTION_IDs only. Do not open gameplay PRs this cycle unless unique, display-only, and not already on `main`. Stagger crons. Pause map/combat/persist/Motoko-stables implementers 6 hours after a `main` merge that touches WX, `progressPersist`, `mapGen`, or `main.mo`.  
AUTONOMY: HUMAN_CONFIG  
DEPENDENCIES: AQA-2026-08-30-001; AQA-2026-08-30-009  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Next director run sees ≤3 new gameplay PRs from this wave, and those PRs do not retouch persist / targeting / mapGen / WX / `main.mo` stables.  
STATUS: OPEN  

---

ACTION_ID: MTD-2026-09-02-001  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Hold the 2026-09-02 00:00 specialist wave  
CATEGORY: automation-coherence  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: 41 RUNNING agents listed this hour (see MASTER_ROADMAP). During this director run the wave already opened #260–#273 including WX gameplay #265 and GameKey bindgen #272. Yesterday the same pattern produced overlapping persist/targeting/mapGen PRs that humans then merged. Tonight the unique P0 is already drafted as #259.  
SYSTEMS_AFFECTED: merge queue; `WorldExploration.tsx`; `mapGen.ts`; `main.mo`; AdminDashboard; migrations  
RECOMMENDED_ACTION: Default HOLD any PR from this wave. Orchestrator may implement one unique display-only item. Designers update their own dated files; do not rewrite SDA/SDE/EBA schemas; do not restack GameKey or death-penalty.  
AUTONOMY: HUMAN_CONFIG + review  
DEPENDENCIES: MTD-2026-08-31-001  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: No mapGen / persist-lock / targeting / enemyAI / AdminDashboard / Motoko-stables gameplay PR merges from this wave except human-approved #259.  
STATUS: NEW  

---

ACTION_ID: MTD-2026-09-02-002  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Human merge and deploy #259 — EOP migration for GameKey stables  
CATEGORY: data-persistence  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: GitHub #259 body: Caffeine `install_code` on `cwofb-yqaaa-aaaap-qp45q-cai` trapped `RTS error: Memory-incompatible program upgrade` / IC0503. ENGINEERING on `58302bc`: `20260831_000000.mo` NewActor still contains `gameKeyRequests` / `gameKeyLedger` / `gameKeyReveals` / `lastGameKeyRequestAt` / `nextGameKeyRequestId` (lines 162–166, 218–222). Live `main.mo` is a plain `actor {`; mops still injects the chain. Empty `.old` check-stable passed; populated layout did not grow those fields. #259 is the only open PR: draft, unique, +1397/−54, 15 files, `mergeable_state: clean` vs `58302bc`. Restores frozen 20260831; adds `20260901_000000.mo`; bumps `check-limit` 3→4; adds populated snapshot check.  
SYSTEMS_AFFECTED: `src/backend/migrations/`; `mops.toml`; Caffeine deploy; GameKey shop  
RECOMMENDED_ACTION: Review/merge #259. Deploy to Caffeine. Do not open a second GameKey migration PR. After merge, freeze shipped NewActors (`20260826`, `20260827`, `20260831`, `20260901`).  
AUTONOMY: HUMAN_REVIEW + deploy  
DEPENDENCIES: None (oldest open PR)  
REGRESSION_RISK: HIGH if a second agent amends 20260831 or 20260901 in parallel; LOW if #259 is the only Motoko change.  
VALIDATION_REQUIRED: `mops check` vs empty `.old`; `mops check-stable src/backend/migrations/snapshots/post-20260831.most backend`; Caffeine `install_code` no longer traps; GameKey request/approve/redeem still works on a fresh and a populated canister.  
STATUS: NEW  

---

ACTION_ID: MTD-2026-09-02-003  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Freeze new persistent let/var on main.mo until #259 is on main and deployed  
CATEGORY: data-persistence  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: #258 added GameKey maps to live `main.mo` and stuffed them into an already-applied NewActor. DATA_EVOLUTION 09-01 already warned not to attach `(with migration)` carelessly and not to mutate 20260831. The 09-02 flock includes persist, security, admin, and data-evolution agents who will be tempted to add fields.  
SYSTEMS_AFFECTED: `src/backend/main.mo`; `src/backend/migrations/`; discovery persist; telemetry increment maps; admin lifecycle  
RECOMMENDED_ACTION: No new stables (including `ownedSpellIds`, telemetry maps, admin `lifecycle`) until #259 deploys. Then: new later lex file; never edit a shipped NewActor; bump `check-limit`; populated `check-stable`.  
AUTONOMY: HUMAN_CONFIG  
DEPENDENCIES: MTD-2026-09-02-002  
REGRESSION_RISK: HIGH if discovery or telemetry writers add maps this hour.  
VALIDATION_REQUIRED: Next Motoko PR that adds a `let`/`var` also adds a new migration file whose OldActor lacks that field.  
STATUS: NEW  

---

ACTION_ID: AQA-2026-08-30-008  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Convert the security 9-finding set into an architecture decision  
CATEGORY: security-architecture  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: Reused. Clamp/no-mint is on `main`. `writeLevel` now always `character.level` (`main.mo` 2028–2032). No written ADR file (glob `docs/**/*ADR*` = 0). Finding 3 is still restated as “must not write Doka” by security runs. `calculateAndAwardDoka` unused. `markAchievementUnlocked` still client-asserted. Shop 60s auto-complete is **gone** in source (GameKey). Security `c97e5c0c` is running this hour.  
SYSTEMS_AFFECTED: `src/backend/main.mo`; `docs/ARCHITECTURE.md`  
RECOMMENDED_ACTION: Write the ADR: (a) official-client trust + store-relative clamps (current de-facto, including ignore-client level), or (b) canister proofs. Rewrite finding 3. Do not open a third clamp PR. Do not revert GameKey.  
AUTONOMY: HUMAN_DECISION + reviewed docs PR  
DEPENDENCIES: MTD-2026-08-31-002 (done); MTD-2026-09-01-005 (done)  
REGRESSION_RISK: HIGH if APIs tighten without a frontend roll.  
VALIDATION_REQUIRED: ADR merged; security findings marked decided.  
STATUS: PARTIAL  

---

ACTION_ID: MTD-2026-09-02-004  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Stop concatenating specialist catalogs into dated director ACTION_ID files  
CATEGORY: process  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: `ACTION_IDS_2026-09-01.md` opens as TBC ledger, then LHIPS, then director IDs. `ACTION_IDS_2026-08-31.md` remains a ~4k-line dump yard. AQA-003 asked for one ledger; the result is unreadable. Producers already have `ACTION_IDS_<PREFIX>_YYYY-MM-DD.md`.  
SYSTEMS_AFFECTED: `docs/automation/ACTION_IDS_*.md`  
RECOMMENDED_ACTION: UPDATE_PROMPT: each producer writes `ACTION_IDS_<PREFIX>_YYYY-MM-DD.md`. Director maintains MASTER_ROADMAP + `ACTION_IDS_YYYY-MM-DD.md` (director IDs only). TBC must not write into the director file. Do not append to 08-31 or 09-01.  
AUTONOMY: HUMAN_CONFIG  
DEPENDENCIES: AQA-2026-08-30-003  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Next wave adds 0 lines to ACTION_IDS_2026-08-31.md and ACTION_IDS_2026-09-01.md.  
STATUS: NEW  

---

ACTION_ID: AQA-2026-08-30-001  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Throttle the critical / high-severity bug hunter  
CATEGORY: automation-ops  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: Reused. `996df6df` still not GetAutomation-visible. WX is 19,253 lines / 198 commits since 2026-08-24 / 49 since `dd275aa`.  
SYSTEMS_AFFECTED: `996df6df-9d7a-11f1-a7d1-d6b4613131ce`; `WorldExploration.tsx`  
RECOMMENDED_ACTION: REDUCE_FREQUENCY to at most once per 12–24 hours; pause 6 hours after a `main` merge that touches WX or persist.  
AUTONOMY: HUMAN_CONFIG  
DEPENDENCIES: AQA-2026-08-30-002  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: ≤14 hunter runs/week.  
STATUS: OPEN  

---

ACTION_ID: AQA-2026-08-30-002  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Keep a single critical-bug automation  
CATEGORY: automation-ops  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: Reused. `1aa41c6c` remains enabled. Volume problem is the rest of the flock (41 this hour), not this hunter’s last unique PR.  
SYSTEMS_AFFECTED: `1aa41c6c-a483-11f1-a7d1-d6b4613131ce`; `996df6df-9d7a-11f1-a7d1-d6b4613131ce`  
RECOMMENDED_ACTION: MERGE hunters. Keep one at AQA-001 cadence.  
AUTONOMY: HUMAN_CONFIG  
DEPENDENCIES: AQA-2026-08-30-001  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Only one critical-bug automation ID fires per day.  
STATUS: OPEN  

---

ACTION_ID: AQA-2026-08-30-006  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Freeze mapGen after #110 (and the follow-up punches)  
CATEGORY: sensitive-code  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Reused. After #110, later punches including #206/#246. `mapGen.ts` 988 → 1,348 → **1,544**. Guardian `9dcfd122` is RUNNING this hour. `AGENTS.md` still forbids map-generation edits.  
SYSTEMS_AFFECTED: `src/frontend/src/engine/mapGen.ts`  
RECOMMENDED_ACTION: Report-only (ACTION_IDs + failing seed fixtures) unless a human authorizes a playtested change. Close any 09-02 mapGen PR.  
AUTONOMY: HUMAN_CONFIG  
REGRESSION_RISK: HIGH if another punch lands without playtest.  
VALIDATION_REQUIRED: Next solvability run opens 0 mapGen PRs.  
STATUS: BROKEN  

---

ACTION_ID: AQA-2026-08-30-007  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Freeze drive-by WorldExploration edits  
CATEGORY: sensitive-code  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Reused. File is 19,253 lines (down from 20,063 via extraction) but **49** commits since `dd275aa`. Tonight’s feel / AI / expansion / invariant / combat agents will add more branches if allowed.  
SYSTEMS_AFFECTED: `WorldExploration.tsx`  
RECOMMENDED_ACTION: New behavior in `engine/*` or `utils/*` with tests; WX one-line wiring. Reject PRs whose primary hunk is another WX branch. Exception: #259 does not touch WX.  
AUTONOMY: HUMAN_CONFIG + review  
REGRESSION_RISK: MEDIUM — some remaining defects are still WX closures.  
VALIDATION_REQUIRED: Next week WX commit count under 20.  
STATUS: BROKEN  

---

ACTION_ID: MIMA-2026-08-31-001  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Swap landing skips lava, spikes, ice, and Void Rift walk damage  
CATEGORY: combat-correctness  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Reused. Reconfirmed on `58302bc`. `swapPositions` (`WorldExploration.tsx` 9436–9448) still copies coordinates and does not call `applyBattleWalkHazards`. Occupancy helper exists for summons; Swap does not use it.  
SYSTEMS_AFFECTED: Swap; hazards; challenges  
RECOMMENDED_ACTION: Extract `applyHazardLanding` + tests; one WX call site. Do not change damage numbers. Do not grow WX without the helper. After flock halt.  
AUTONOMY: IMPLEMENT_AFTER_HUMAN  
DEPENDENCIES: AQA-2026-08-30-007; MTD-2026-09-02-001  
REGRESSION_RISK: MEDIUM — must not double-charge a walk that already ran the stepper.  
VALIDATION_REQUIRED: Swap onto lava increments challenge damage; walk path still charges once.  
STATUS: OPEN  

---

ACTION_ID: MIMA-2026-08-31-002  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Player-controlled summon walk ignores tile hazards (occupancy landed)  
CATEGORY: combat-correctness  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Reused; narrowed. On `58302bc`, `applyControlledSummonWalk` (`WX` 9978–10036) calls `resolveControlledSummonMoveDest` (`occupancy.ts` 358–388) — dest occupancy and unseal **yes**. Then `updateCombatant` with no `applyBattleWalkHazards`. MP debit is still `pathLength` (1×).  
SYSTEMS_AFFECTED: summons; occupancy; hazards  
RECOMMENDED_ACTION: Same `applyHazardLanding` as MIMA-001 after dest is accepted. Do not rewrite occupancy.  
AUTONOMY: IMPLEMENT_AFTER_HUMAN  
DEPENDENCIES: MIMA-2026-08-31-001  
REGRESSION_RISK: MEDIUM  
VALIDATION_REQUIRED: Path onto occupied tile is a no-op (already); path onto lava commits store HP.  
STATUS: PARTIAL  

---

ACTION_ID: MIMA-2026-09-01-001  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Frozen Terrain / Slime Flood MP doubling is preview-only  
CATEGORY: combat-correctness  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Reused from MIMA auditor. Reconfirmed: highlight uses `applyMpCost` (WX 7120); mouse/touch execute still `const cost = path.length` (10663, 11278); summon walk uses `path.length` (10105). Do not change the 2× formula.  
SYSTEMS_AFFECTED: MP; terrain; summons  
RECOMMENDED_ACTION: Extract `battleWalkMpCost(pathLength, modifierTypes)` used by highlight, hover, player debit, and summon-control. After flock halt.  
AUTONOMY: IMPLEMENT_HELPER_THEN_WX_CALL_SITES  
DEPENDENCIES: AQA-2026-08-30-007  
REGRESSION_RISK: MEDIUM  
VALIDATION_REQUIRED: 6 MP + Frozen, one 3-tile walk leaves 0.  
STATUS: OPEN  

---

ACTION_ID: MIMA-2026-09-01-002  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Player battle-walk path steps through barriers and living combatants  
CATEGORY: combat-correctness  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Reused. Reconfirmed: `findPath` (`WX` 4483–4493) blocks walls, void, in-battle portals — **not** `barrierTilesRef` and **not** combatants. Dest occupancy reject exists; intermediate tiles can clip.  
SYSTEMS_AFFECTED: Barrier; occupancy; pathing  
RECOMMENDED_ACTION: Battle-only `findPath` wrapper or walk BFS parents from `getMpReachableTiles`. Helper then one WX path. Do not change RAF timing.  
AUTONOMY: IMPLEMENT_HELPER_THEN_ONE_WX_PATH  
DEPENDENCIES: AQA-2026-08-30-007  
REGRESSION_RISK: MEDIUM  
VALIDATION_REQUIRED: Dest beyond a one-tile barrier uses the around-path.  
STATUS: OPEN  

---

ACTION_ID: MTD-2026-08-31-003  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Controlled extraction of HP and death authority out of WorldExploration  
CATEGORY: architecture  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Reused. Cluster #78–#256 plus Swap/summon landing. Dual authority remains. Do not start this in the 00:00 wave or in the same PR as #259.  
SYSTEMS_AFFECTED: `combatantStore.ts`; `deathPipeline.ts`; `battleSetup.ts`; WX  
RECOMMENDED_ACTION: After #259 deploy and MIMA landing helper. One scoped PR. No RAF / mapGen / damage-formula changes.  
AUTONOMY: IMPLEMENT_AFTER_HUMAN  
DEPENDENCIES: MTD-2026-09-02-002; MIMA-2026-08-31-001  
REGRESSION_RISK: HIGH if bundled with targeting or persist.  
VALIDATION_REQUIRED: Engine tests for plague / DoT / lava / reflect / swap-landing / last-hostile.  
STATUS: OPEN  

---

ACTION_ID: MTD-2026-08-31-004  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Freeze content / AI / feel / admin implementation until P0/P1 settle  
CATEGORY: expansion-gating  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Reused. Design catalogs from 08-31/09-01 are on `main` (correct). Gameplay from those catalogs is still blocked: no ownership persist, zone-0 kits, no ADR, EOP chain broken, flock active. Approved Game Design Implementer is RUNNING this hour.  
SYSTEMS_AFFECTED: expansion / AI / feel / admin implementers  
RECOMMENDED_ACTION: Docs and ACTION_IDs only until #259 + ADR + landing helper exist.  
AUTONOMY: HUMAN_CONFIG  
DEPENDENCIES: MTD-2026-09-02-001; MTD-2026-09-02-002  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: No SDA/SDE/EBA/AI gameplay PR from the 09-02 wave.  
STATUS: OPEN  

---

ACTION_ID: AQA-2026-08-30-012  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Outcome telemetry before any dashboard  
CATEGORY: telemetry  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Reused. Still no collectors on `58302bc`. TBC-2026-08-31-001 WAITING_FOR_TELEMETRY. Dashboard specialist `4b026695` and architecture `047ac8a1` are in tonight’s wave. `longHorizonSim.telemetry.available === false`. Telemetry increment maps would be new stables — blocked on MTD-2026-09-02-003.  
SYSTEMS_AFFECTED: future counters; Admin telemetry UI  
RECOMMENDED_ACTION: Design + tiny persist-lock-enqueued counters **after** #259. No dashboard UI. No balance labels. Fail-open.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: MTD-2026-09-02-003  
REGRESSION_RISK: HIGH if a second persist path is invented or stables are stuffed into 20260901.  
VALIDATION_REQUIRED: Zero CLEAR_POSITIVE_SIGNAL claims until rows exist.  
STATUS: OPEN  

---

ACTION_ID: TBC-2026-08-31-001  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Keep balance analyst gated until telemetry rows exist  
CATEGORY: telemetry  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Reused. Fresh search this run: 0 `recordTelemetry` hits in `src/backend`. Do not infer balance from source or longHorizonSim.  
SYSTEMS_AFFECTED: Telemetry-Driven Balance automation `2786666f`  
RECOMMENDED_ACTION: STATUS WAITING_FOR_TELEMETRY. No BAL-* implementation. Write TBC ACTION_IDs to `ACTION_IDS_TBC_YYYY-MM-DD.md`, not the director file.  
AUTONOMY: HUMAN_CONFIG  
DEPENDENCIES: AQA-2026-08-30-012  
REGRESSION_RISK: HIGH if formulas change without data.  
VALIDATION_REQUIRED: No OVERPERFORMING labels.  
STATUS: OPEN  

---

ACTION_ID: EXPANSION-PREREQ-A  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Pass a numeric zone into buildEnemyKit  
CATEGORY: content-infrastructure  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Reused. Reconfirmed on `58302bc`. `buildEnemyKit` does `Math.floor(levelZone)` (`enemyAI.ts` 187–192). Call site `buildEnemyKit(enemy.pieceType, currentMap.levelZone)` (`WX` 12035). `levelZone` is `{ name, minLevel, maxLevel }` (`WX` 4680–4684, type `any` at 558). `Math.floor(object)` is `NaN` → every `z >= 1` check fails. Core rule “dynamic enemy spell pools” is implemented and dead.  
SYSTEMS_AFFECTED: battle-start kit assign; `enemyAI.ts`  
RECOMMENDED_ACTION: After flock hold and #259. One call site + unit test. Pass `floor((enemy.level-1)/tierSize)` or relative band. WX one-line. Do not invent new kits in the same PR.  
AUTONOMY: IMPLEMENT_AFTER_HUMAN  
DEPENDENCIES: MTD-2026-08-31-004; AQA-2026-08-30-007  
REGRESSION_RISK: MEDIUM — zone-1 kits suddenly appear.  
VALIDATION_REQUIRED: Zone 0 pawn kit unchanged; zone ≥1 adds the advanced id.  
STATUS: OPEN  

---

ACTION_ID: SDA-2026-08-31-002  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Split catalog from ownership; persist owned and observed spell ids  
CATEGORY: ownership-persist  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Reused. `ownedSpells` is still starters ∪ filtered backend (`WX` 2371–2400). `shouldIncludeBackendSpellInLibrary` returns true whenever `usableByPlayer !== false` (`adminSafety.ts` 551–558). Admin add still grants everyone. Blocks meaningful telemetry-by-acquisition-path. New maps are new stables → blocked on MTD-2026-09-02-003.  
SYSTEMS_AFFECTED: `main.mo`; spellbook; WX ownedSpells  
RECOMMENDED_ACTION: After P0/P1 persist freeze **and** #259. Canonical persist shape; SDE/EBA/SPELL_DISCOVERY cards attach later. New later migration file. Never `spell.name`.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: SDA-2026-08-31-001; MTD-2026-08-31-004; MTD-2026-09-02-003  
REGRESSION_RISK: HIGH  
VALIDATION_REQUIRED: New character owns only base ids; admin catalog add does not hydrate into others’ books.  
STATUS: OPEN  

---

ACTION_ID: SDA-2026-08-31-004  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Implement enemy-discovery default (cast → observe → win → unlock)  
CATEGORY: discovery-pipeline  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Reused. Still no `recordSpellObservation`. Core Stralt rule. Must enqueue on persist lock; must not use `spell.name`.  
SYSTEMS_AFFECTED: enemy cast hook; persist lock; recap  
RECOMMENDED_ACTION: Blocked on SDA-002/003, persist quiet, and #259.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: SDA-2026-08-31-002; SDA-2026-08-31-003; MTD-2026-09-02-003  
REGRESSION_RISK: HIGH if granted off the lock.  
VALIDATION_REQUIRED: Cast-then-flee observes without unlock; cast-then-win unlocks once.  
STATUS: OPEN  

---

ACTION_ID: MTD-2026-08-31-006  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Admin Draft → Validate → Activate on the canister  
CATEGORY: admin-pipeline  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Reused. Dashboard 8,035 lines. Hard delete / `usableByPlayer` retire remain. Not a canister publish workflow. EBA/SDA/WORLD_ENCOUNTER designs overlap — pick SDA-005 lifecycle, do not grow chrome first. GameKey tab growth is ops, not DVA.  
SYSTEMS_AFFECTED: `main.mo` admin; AdminDashboard  
RECOMMENDED_ACTION: Canister states first (new later migration after #259); UI second. Hold 09-02 admin implementers.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: SDA-2026-08-31-005; AQA-008; MTD-2026-09-02-003  
REGRESSION_RISK: HIGH if hard-delete remains.  
VALIDATION_REQUIRED: Retire does not strip owned levels.  
STATUS: OPEN  

---

ACTION_ID: MTD-2026-08-31-005  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Wire saveKillCount or drop it from the leaderboard  
CATEGORY: persistence  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Reused. `useSaveKillCount` in `useLeaderboardQueries.ts` 43–51; grep shows **no UI caller**. Canister rejects `kills > 64`.  
SYSTEMS_AFFECTED: leaderboard; `saveKillCount`  
RECOMMENDED_ACTION: One caller on attributed player-side kills **or** remove from HUD. Not tonight.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: persist freeze  
REGRESSION_RISK: MEDIUM if it races `applyRewards`.  
VALIDATION_REQUIRED: Allied summons never increment.  
STATUS: OPEN  

---

ACTION_ID: MTD-2026-08-31-008  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Revisit computeAITier 30% full-random roll  
CATEGORY: design  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Reused. `combatMath.ts` 34–50 unchanged (`AI_TIER_VARIANCE_CHANCE = 0.3` then `Math.random() * 10 + 1`). Contradicts progressively sophisticated enemies. Do not rewrite `enemyAI.ts`.  
SYSTEMS_AFFECTED: `computeAITier`  
RECOMMENDED_ACTION: Design decision: variance within adjacent tiers, not uniform 1–10.  
AUTONOMY: HUMAN_DECISION  
DEPENDENCIES: MTD-2026-08-31-004  
REGRESSION_RISK: HIGH if bundled with an AI rewrite.  
VALIDATION_REQUIRED: Report only until human picks.  
STATUS: OPEN  

---

ACTION_ID: MTD-2026-08-31-007  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Enemy-observed spell discovery design (canonical persist shape)  
CATEGORY: design  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Reused. SDA-002/004 is the persist shape. Do not author a fifth schema this hour (SDE / SPELL_DISCOVERY / EBA already exist). Spell-discovery specialist is in tonight’s flock.  
SYSTEMS_AFFECTED: design docs only  
RECOMMENDED_ACTION: Point implementers at SDA-002/004. Mark overlapping docs as content cards.  
AUTONOMY: DOCS_ONLY  
DEPENDENCIES: SDA-2026-08-31-002  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: No new discovery schema file from the 09-02 wave.  
STATUS: OPEN  

---

ACTION_ID: AQA-2026-08-30-009  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Orchestrator must not implement gameplay  
CATEGORY: automation-ops  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Reused. 09-01 06:00/12:00/18:00 implemented unique display (acceptable). Orchestrator `68f2958f` is RUNNING this hour and must not restack persist/combat/GameKey/EOP.  
SYSTEMS_AFFECTED: `68f2958f-a489-11f1-a7d1-d6b4613131ce`  
RECOMMENDED_ACTION: ACTION_IDs + at most one unique display-only item. Point humans at #259.  
AUTONOMY: HUMAN_CONFIG  
DEPENDENCIES: MTD-2026-09-02-001  
REGRESSION_RISK: MEDIUM if it implements persist or Motoko.  
VALIDATION_REQUIRED: Orchestrator PR (if any) is display-only and unique.  
STATUS: PARTIAL  

---

ACTION_ID: AQA-2026-08-30-010  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Dedup persist / economy implementers  
CATEGORY: automation-ops  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Reused. Official-client races largely on `main` (#183/#180/#256). Economy hunter `1e548d83` and persist `607e0304` are RUNNING this hour. GameKey already replaced 60s auto-complete.  
SYSTEMS_AFFECTED: persist / economy automations  
RECOMMENDED_ACTION: ACTION_IDs only if a race is already drafted. Do not open a third clamp. Do not restack GameKey.  
AUTONOMY: HUMAN_CONFIG  
DEPENDENCIES: MTD-2026-09-02-002  
REGRESSION_RISK: HIGH if another persist rewrite lands.  
VALIDATION_REQUIRED: At most one open persist/Motoko PR (#259).  
STATUS: PARTIAL  

---

ACTION_ID: AQA-2026-08-30-003  
SOURCE_AUTOMATION: Stralt Master Technical Director  
TITLE: Adopt an in-repo ACTION_ID ledger all producers write to  
CATEGORY: process  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: Reused. Ledger exists and is now a dump yard + concatenated 09-01 file (see MTD-2026-09-02-004). Dedup still fails if producers ignore dated files.  
SYSTEMS_AFFECTED: all producer prompts  
RECOMMENDED_ACTION: Index + per-producer files. Refuse a second PR for an ID that is OPEN or matches an open PR theme.  
AUTONOMY: HUMAN_CONFIG  
DEPENDENCIES: MTD-2026-09-02-004  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Director can list OPEN P0/P1 without grepping 4k lines.  
STATUS: PARTIAL  
