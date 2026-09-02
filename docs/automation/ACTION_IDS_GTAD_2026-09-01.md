# ACTION_IDs — Gameplay Telemetry Architecture Director 2026-09-01

Durable ledger for implementers and the Report Action Orchestrator.  
Source of every record: Gameplay Telemetry Architecture Director  
(`047ac8a1-a4a0-11f1-a7d1-d6b4613131ce`).  
Design contract: [`TELEMETRY_ARCHITECTURE_2026-09-01.md`](./TELEMETRY_ARCHITECTURE_2026-09-01.md).  
Prior ledger (still NEW, not implemented): `GTAD-2026-08-31-001`…`011` in [`ACTION_IDS_2026-08-31.md`](./ACTION_IDS_2026-08-31.md).  
This run ships **docs only**. Do not implement gameplay from this file unless a later human or orchestrator explicitly picks an ID.

`GTAD-2026-09-01-*` **supersede** the 08-31 IDs for implementation (updated line numbers, AQA persist-lock correction, `getAllCharacters` fence). Policy intent is the same.

---

ACTION_ID: GTAD-2026-09-01-001  
SOURCE_AUTOMATION: Gameplay Telemetry Architecture Director  
TITLE: Privacy fence — aggregates only; never chat, purchase PII, principals, or getAllCharacters on Intelligence  
CATEGORY: privacy  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: Mandate forbids individual surveillance. `getLeaderboard` returns `principalId` (`main.mo` 3005). `getAllCharacters` (`main.mo` 558–563) dumps every Principal + `Character.name` and is unused by AdminDashboard today. OQL `characterSlots` / `userProfiles` are owner-scoped (`main.mo` ~3110). `PurchaseRecord` stores email/address/postal/proof (`types/admin.mo` 202–217). `chatMessages` is in-memory (2245) and must stay out of analytics.  
SYSTEMS_AFFECTED: future telemetry maps; Admin Intelligence tab; OQL (do not add owner-keyed event entities); do not call `getAllCharacters` from Intelligence  
RECOMMENDED_ACTION: Allow-list counter key prefixes; strip principals in snapshot queries; never persist chat text, `uiLayout`, pixel patterns, click traces, or purchase customer fields; never reuse `getLeaderboard` or `getAllCharacters` as an analytics wire format. Phase 0 must scan server-side and return buckets only.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: None  
REGRESSION_RISK: LOW if followed; HIGH if someone charts OQL / `getAllCharacters` rows in the browser.  
VALIDATION_REQUIRED: Intelligence responses contain no principal, display name, email, or message body.  
STATUS: NEW  

---

ACTION_ID: GTAD-2026-09-01-002  
SOURCE_AUTOMATION: Gameplay Telemetry Architecture Director  
TITLE: Fail-open sidecar — never on the persist lock, never authoritative; correct AQA-012 enqueue wording  
CATEGORY: architecture  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: `createProgressPersist` serializes `applyRewards` and `saveBattleStats`. `AQA-2026-08-30-012` said counters “must enqueue on `createProgressPersist` or be query-only.” Query-only is correct. Enqueue-on-lock is a wallet-race hazard. `handleBattleEnd` already shows recap then persist in a separate `try/catch` (`WorldExploration.tsx` 13009 / 13157–13162) that logs “non-blocking.” AGENTS.md: telemetry must not block combat, persistence, map load, or rewards.  
SYSTEMS_AFFECTED: `utils/progressPersist.ts`; future `recordTelemetryIncrements`; WorldExploration outcome paths; Quality Auditor prompt  
RECOMMENDED_ACTION: Implement increments as fire-and-forget after persist functions return. Swallow all sidecar errors. Do not enqueue telemetry on `progressPersistRef`. Do not write HP/XP/Doka/spell levels from telemetry. Missing method on the mock actor = no-op. Treat AQA-012’s enqueue clause as superseded: query-only snapshots OR off-lock increments only.  
AUTONOMY: IMPLEMENT_AFTER_HUMAN  
DEPENDENCIES: GTAD-2026-09-01-001  
REGRESSION_RISK: HIGH if ignored (wallet races, unpaid victories).  
VALIDATION_REQUIRED: Existing persist unit tests still pass with a throwing/missing increment API; a sidecar throw does not skip `applyRewards`.  
STATUS: NEW  

---

ACTION_ID: GTAD-2026-09-01-003  
SOURCE_AUTOMATION: Gameplay Telemetry Architecture Director  
TITLE: Phase 0 — admin-only snapshot aggregates from existing stores (buckets only)  
CATEGORY: telemetry  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `characterSlots`, `dokaBalances`, `achievementProgress`, `dungeonRecords`, `bossRushStates` already persist population signals. No combat write required. Admin sidebar only shows catalog counts. Quality Auditor could not estimate player population. `getAllCharacters` must not be the client-side source.  
SYSTEMS_AFFECTED: `src/backend/main.mo` (new `#admin` query); `AdminDashboard.tsx` (Intelligence tab, read-only)  
RECOMMENDED_ACTION: Add `adminGetProgressionSnapshot` that returns **buckets only**: occupied-slot + principal **counts**, level histogram, pieceType mix, Doka-size histogram, achievement unlock/claim counts by id, dungeon depth/maps histograms, boss-rush `highestRoomCompleted` histogram. Scan maps server-side; never return a principal or character name.  
AUTONOMY: IMPLEMENT_AFTER_HUMAN  
DEPENDENCIES: GTAD-2026-09-01-001  
REGRESSION_RISK: LOW (query-only). Residual: expensive scan on a large principal map — keep admin-gated and off the game loop.  
VALIDATION_REQUIRED: Response JSON has no principal-shaped strings; `#user` callers are rejected; `pnpm typecheck` + `mops check` / `caffeine check` after bindgen.  
STATUS: NEW  

---

ACTION_ID: GTAD-2026-09-01-004  
SOURCE_AUTOMATION: Gameplay Telemetry Architecture Director  
TITLE: Phase 1 — smallest outcome + quality increment hooks (including recap dismiss)  
CATEGORY: telemetry  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Implements AQA-012 + Q-005. Fail-open sites: reward persist catch `WX` 13157; `persistDeathPenalty`; `onShowBattleSummary` 13009; `creditPendingPurchasesThroughPersist`; battle start 12661; `_handlePlayerDeath` 13754. Recap `onClose` is now discrete (`PostBattleRecap.tsx` 72, 93, 99, Continue).  
SYSTEMS_AFFECTED: new sidecar module; `main.mo` increment map + `recordTelemetryIncrements`; outcome helpers after they return; `PostBattleRecap` dismiss once  
RECOMMENDED_ACTION: Ship lifetime+28-day counters only for: persist ok/fail (`applyRewards`, `saveBattleStats`), victory paid, death-penalty ok/fail, recap opened, recap dismissed, shop credit committed, battles started, victories. Fire-and-forget batches of `(Text, Nat)`. Allow-list prefixes. No WorldExploration RAF / damage / mapGen edits.  
AUTONOMY: IMPLEMENT_AFTER_HUMAN  
DEPENDENCIES: GTAD-2026-09-01-001; GTAD-2026-09-01-002  
REGRESSION_RISK: MEDIUM if increments are placed inside persist `enqueue`. LOW if after-return only.  
VALIDATION_REQUIRED: Next Quality Auditor can cite persist-ok/fail, victory-paid, and recap open/dismiss, or still say “Phase 1 not merged.” Import gate clean.  
STATUS: NEW  

---

ACTION_ID: GTAD-2026-09-01-005  
SOURCE_AUTOMATION: Gameplay Telemetry Architecture Director  
TITLE: Tag flee vs combat death vs lava/spike without changing the penalty  
CATEGORY: telemetry  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Flee (`onEndBattle` 19297–19314) calls `_handlePlayerDeath`. Lava/spike use the HP-watch path (13809+) and still do **not** call `_handlePlayerDeath`, despite the linchpin comment at 13756 listing HP-watch as a routed caller. Death-cause intelligence is impossible until both entry points are tagged. Mandate: do not change death math.  
SYSTEMS_AFFECTED: `_handlePlayerDeath` call sites; HP-watch; future C-003/C-004/C-007 increments  
RECOMMENDED_ACTION: Thread a closed `DeathCause` enum (`combat_melee|combat_spell|dot|lava|spikes|flee|other`) into the two entry points for telemetry only. Keep `persistDeathPenalty` / `resetRunState` / Death Realm timer unchanged.  
AUTONOMY: IMPLEMENT_AFTER_HUMAN  
DEPENDENCIES: GTAD-2026-09-01-002; GTAD-2026-09-01-004 (or same PR)  
REGRESSION_RISK: MEDIUM if someone forks persist or skips the flee→death penalty.  
VALIDATION_REQUIRED: Existing `deathGuards` / `deathPenalty` tests still pass; flee in a dungeon still aborts the run.  
STATUS: NEW  

---

ACTION_ID: GTAD-2026-09-01-006  
SOURCE_AUTOMATION: Gameplay Telemetry Architecture Director  
TITLE: Phase 2 — combat / spell / content aggregate dimensions  
CATEGORY: telemetry  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Battle length (`challengeTurnCountRef`), remain HP, roster `pieceType` / `EnemyFamily`, `TierSpawnConfig` level gap, `decideDungeonChainPortal` (6966), Boss Rush rooms 0–9, challenge ids, map modifiers, rare refs already exist. Spell usage should flush a **per-battle unique-set** of `SpellConfig.id`. Family 30% roll (WX 6525–6537) can increment E-007; family W/L must note battle-start overwrite of `res`/`sp`/`init`/`chc` (12456–12467).  
SYSTEMS_AFFECTED: sidecar flush at battle end / portal; Admin Intelligence sections  
RECOMMENDED_ACTION: After Phase 1 is proven fail-open, add bucket increments for turns, remain-HP, death cause, family W/L, level-delta, family-variant roll, dungeon/rush/challenge/modifier/rare, spell unique-set + fizzle + enemy unique-set + upgrade. Cap key cardinality to catalog ids and enums.  
AUTONOMY: IMPLEMENT_AFTER_HUMAN  
DEPENDENCIES: GTAD-2026-09-01-004; GTAD-2026-09-01-005  
REGRESSION_RISK: MEDIUM if unique-set flush is done per RAF frame or per targeting preview.  
VALIDATION_REQUIRED: One battle produces a bounded batch (≤32 keys); no increment from `mapGen` / `combatMath` / RAF.  
STATUS: NEW  

---

ACTION_ID: GTAD-2026-09-01-007  
SOURCE_AUTOMATION: Gameplay Telemetry Architecture Director  
TITLE: Admin Intelligence tab — aggregates, carved-stone, `#admin` only, honest empty state  
CATEGORY: admin-ui  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: `AdminDashboardState.tab` (`gameTypes.ts` 483–498) is config CRUD only. Sidebar counts are catalog sizes. Admin is lazy-loaded (`isAdmin && onOpenAdmin`; canister `#admin`). `TELEMETRY_DASHBOARD_2026-08-31.md` already forbids painting zeros as “zero battles.”  
SYSTEMS_AFFECTED: `AdminDashboard.tsx`; `types/gameTypes.ts` tab union; `useAdminQueries.ts`  
RECOMMENDED_ACTION: Add an `intelligence` tab that charts Phase 0 snapshots and Phase 1+ counters. Empty state if maps are empty. No principal search. Dev raw-key dump only under `import.meta.env.DEV`. Match existing stone/slate/crimson chrome.  
AUTONOMY: IMPLEMENT_AFTER_HUMAN  
DEPENDENCIES: GTAD-2026-09-01-003 (minimum); GTAD-2026-09-01-004 for live counters  
REGRESSION_RISK: LOW. Do not ship the tab to normal players.  
VALIDATION_REQUIRED: Non-admin build path unchanged; `#user` query rejected; browser check of the tab on an admin session when implemented.  
STATUS: NEW  

---

ACTION_ID: GTAD-2026-09-01-008  
SOURCE_AUTOMATION: Gameplay Telemetry Architecture Director  
TITLE: Do not invent a spell-discovery persist path for analytics  
CATEGORY: content-scope  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: `ownedSpells` is starters ∪ backend rows with `usableByPlayer !== false` (`WX` 2410–2438; `shouldIncludeBackendSpellInLibrary` in `adminSafety.ts` 311–317). There is no `ownedSpellIds` / drop / first-seen canister field. SDA-002 / SPELL_DISCOVERY_ECOSYSTEM remain design-only. Building observe→win “so we can measure discovery” would be new gameplay.  
SYSTEMS_AFFECTED: spell catalog; Intelligence “reach” panel  
RECOMMENDED_ACTION: Measure reach via Phase 0 (`level >= minLevel`) and Phase 2 first-equip / unique-set use (S-003/S-010). Do not add a discovery inventory to `Character` for telemetry. If SDA ships later, attach S-004 source enums to that writer — do not pre-build it here.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: GTAD-2026-09-01-003; GTAD-2026-09-01-006  
REGRESSION_RISK: HIGH if a fake unlock store desyncs the spell bar.  
VALIDATION_REQUIRED: No new `Character` fields in the Phase 1/2 telemetry PR.  
STATUS: NEW  

---

ACTION_ID: GTAD-2026-09-01-009  
SOURCE_AUTOMATION: Gameplay Telemetry Architecture Director  
TITLE: Defer sequences, AI intent text, visual URLs, and unwired world-feature metrics  
CATEGORY: privacy  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Pairwise unique-set co-occurrence is Phase 3 with a key cap (S-006). `decideEnemyAction.intent` is free text (`WX` 16877–16881 empty block). Sprite `onerror` URLs may be private. `logPatternLookupFailed` is already throttled (Q-010). `worldFeatures.ts` (`elite_patrol`, etc.) has **no production importer**. Formations / WORLD_DYNAMICS are not in map gen.  
SYSTEMS_AFFECTED: enemy AI logging; pieceArt; Intelligence; future world-feature wiring  
RECOMMENDED_ACTION: Refuse PRs that upload debug buffers, ordered n-grams, intent strings, raw image URLs, or `content.world_feature.*` counters before map gen applies a feature id (N-007). Allow throttled `pattern_fallback` and `quality.visual.load_fail.{kind}` without URLs.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: GTAD-2026-09-01-001  
REGRESSION_RISK: LOW (deferral).  
VALIDATION_REQUIRED: Phase 3 design re-read before any pair-key implementation.  
STATUS: NEW  

---

ACTION_ID: GTAD-2026-09-01-010  
SOURCE_AUTOMATION: Gameplay Telemetry Architecture Director  
TITLE: Point Quality Auditor, Balance Analyst, and longHorizonSim at Phase 0/1 — stay WAITING until then  
CATEGORY: prompt-architecture  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: `QUALITY_AUDIT_2026-08-30.md` classified every gameplay outcome INCONCLUSIVE. `TELEMETRY_BALANCE_2026-08-31.md` is WAITING_FOR_TELEMETRY. `longHorizonSim.ts` 432–436 sets `telemetry.available: false`. Cursor Cloud Automations have no prompt write API (`CAFFEINE_IMPORT_GATES.md`).  
SYSTEMS_AFFECTED: Quality Auditor prompt (`976261d8`); Balance Analyst (`2786666f`); `utils/longHorizonSim.ts` (do not flip `available` in this telemetry-docs PR)  
RECOMMENDED_ACTION: UPDATE_PROMPT (human, dashboard): read `docs/automation/TELEMETRY_ARCHITECTURE_2026-09-01.md`; if increment/snapshot APIs are absent, repeat INCONCLUSIVE / WAITING; if present, cite persist-ok/fail, victory-paid, death-penalty, recap open/dismiss, and snapshot level histogram. Never treat a missing increment as a player regression. Never require persist-lock enqueue. Keep `longHorizonSim.telemetry.available = false` until APIs exist and are populated.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: GTAD-2026-09-01-003 or GTAD-2026-09-01-004 merged before the next Sunday audit to have numbers  
REGRESSION_RISK: LOW.  
VALIDATION_REQUIRED: Next auditor/balance report either cites real counters or explicitly says “still no telemetry.”  
STATUS: NEW  

---

ACTION_ID: GTAD-2026-09-01-011  
SOURCE_AUTOMATION: Gameplay Telemetry Architecture Director  
TITLE: Keep increment maps off OQL owner-scoped entities  
CATEGORY: architecture  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: OQL `Expose` at end of `main.mo` (~3110) is `controllerOrScoped` for player collections. A `telemetryEvents` entity with `owner` would create a per-player log the controller can dump.  
SYSTEMS_AFFECTED: `main.mo` OQL block  
RECOMMENDED_ACTION: Store counters in dedicated `Map<Text, Nat>` queried only via `adminGetTelemetrySnapshot`. Do not `include Expose` those maps as owned entities.  
AUTONOMY: IMPLEMENT_AFTER_HUMAN  
DEPENDENCIES: GTAD-2026-09-01-001; GTAD-2026-09-01-004  
REGRESSION_RISK: LOW.  
VALIDATION_REQUIRED: `schema()` / `execute` do not list a player-owned telemetry event collection.  
STATUS: NEW  

---

ACTION_ID: GTAD-2026-09-01-012  
SOURCE_AUTOMATION: Gameplay Telemetry Architecture Director  
TITLE: Extract the sidecar outside WorldExploration; do not grow the 20k-line orchestrator  
CATEGORY: architecture  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `WorldExploration.tsx` is 20,063 lines (was ~19.6k on 2026-08-31). Outcome sites already exist in helpers (`rewardResolver`, `deathPenalty`, `bossRushProgress`, `shopPurchase`, `spellUpgrade`, `challengeCompletion`). Import gate treats unused locals / hook-deps as errors — a WX-local sidecar will fail check.  
SYSTEMS_AFFECTED: new `utils/telemetrySidecar.ts` (name flexible); call sites after helper return; **not** RAF / mapGen / combatMath  
RECOMMENDED_ACTION: New module + thin flush calls at existing outcome boundaries. Do not add increment logic inside targeting, `advanceTurn`, or `generateEnemies`. Mock actor: missing method is a no-op.  
AUTONOMY: IMPLEMENT_AFTER_HUMAN  
DEPENDENCIES: GTAD-2026-09-01-002; GTAD-2026-09-01-004  
REGRESSION_RISK: MEDIUM if WX gains another closed-over callback that breaks hook-deps.  
VALIDATION_REQUIRED: `pnpm check` clean; sidecar unit tests do not import WorldExploration.  
STATUS: NEW  

---

ACTION_ID: GTAD-2026-09-01-013  
SOURCE_AUTOMATION: Gameplay Telemetry Architecture Director  
TITLE: Telemetry Motoko must pass the Caffeine import gate (typecheck, biome, mops/check-stable)  
CATEGORY: process  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: PR #182 / `docs/automation/CAFFEINE_IMPORT_GATES.md` / `.github/workflows/caffeine-import-gate.yml`. New `Map<Text, Nat>` on `main.mo` is a Motoko + bindgen + mock-shape change (TS2740 if mocks omit the methods). Empty-canister M0263 if `.old` / migrations are skipped.  
SYSTEMS_AFFECTED: `src/backend/main.mo`; `src/frontend/src/mocks/backend.ts`; bindgen; possibly `.old`  
RECOMMENDED_ACTION: Any implementation PR runs `pnpm typecheck`, `pnpm check`, and `mops check` or `caffeine check`. Add increment/snapshot methods to the mock with the real shape. Do not treat unused-vars, hook-deps, mock mismatches, or check-stable as pre-existing.  
AUTONOMY: IMPLEMENT_AFTER_HUMAN  
DEPENDENCIES: GTAD-2026-09-01-003; GTAD-2026-09-01-004  
REGRESSION_RISK: MEDIUM (Candid/mock drift).  
VALIDATION_REQUIRED: CI caffeine-import-gate jobs green.  
STATUS: NEW  

---

ACTION_ID: GTAD-2026-09-01-014  
SOURCE_AUTOMATION: Gameplay Telemetry Architecture Director  
TITLE: Family-variant and enemy-only reach are optional Phase 2 extras — do not invent elite_patrol or discovery events  
CATEGORY: content-scope  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: `EnemyFamily` 30% roll is live (`WX` 6447–6537) and `family` is spread at battle start. `usableByPlayer === false` is the only ownership gate (`adminSafety.ts` 311–317). `worldFeatures.ts` / formations / SDE discovery have no production event source.  
SYSTEMS_AFFECTED: Phase 2 flush; Intelligence Enemies / Spells panels  
RECOMMENDED_ACTION: Allow E-007 (variant roll) and S-010 (enemy-only on player bar snapshot) once Phase 1 exists. Do not add `content.world_feature.elite_patrol` or discovery-source series until those systems persist an event.  
AUTONOMY: IMPLEMENT_AFTER_HUMAN  
DEPENDENCIES: GTAD-2026-09-01-003; GTAD-2026-09-01-006  
REGRESSION_RISK: LOW.  
VALIDATION_REQUIRED: Dashboard does not show world-feature or discovery charts with invented zeros.  
STATUS: NEW  
