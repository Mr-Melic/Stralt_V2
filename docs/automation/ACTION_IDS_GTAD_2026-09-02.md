# ACTION_IDs — Gameplay Telemetry Architecture Director 2026-09-02

Durable ledger for implementers and the Report Action Orchestrator.  
Source of every record: Gameplay Telemetry Architecture Director  
(`047ac8a1-a4a0-11f1-a7d1-d6b4613131ce`).  
Design contract: [`TELEMETRY_ARCHITECTURE_2026-09-02.md`](./TELEMETRY_ARCHITECTURE_2026-09-02.md).  

**Do not re-implement from stale line numbers.** Phase 0/1 tickets remain  
`GTAD-2026-09-01-001`…`014` in [`ACTION_IDS_GTAD_2026-09-01.md`](./ACTION_IDS_GTAD_2026-09-01.md)  
(policy still NEW, not shipped). This run adds **deltas only** (GameKey shop, unpaid-death replay, summoner roll, EOP-migration fence).

This run ships **docs only**. Do not implement gameplay from this file unless a later human or orchestrator explicitly picks an ID.

---

ACTION_ID: GTAD-2026-09-02-001  
SOURCE_AUTOMATION: Gameplay Telemetry Architecture Director  
TITLE: Privacy fence — GameKey email, ledger codes, redeemedBy, and OQL gameKeyRequests stay off Intelligence  
CATEGORY: privacy  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: `GameKeyRequest` stores `email` and `redeemedBy` (`types/admin.mo` 221–234). OQL entity `gameKeyRequests` payloads include `userPrincipal` and `email` (`main.mo` 3715–3731). `adminGetGameKeyReveal` returns the 120-char code (1582). `gameKeyLedger` is keyed by plaintext GameKey and is not an OQL entity — keep it that way. Purchases tab (`AdminGameKeyPurchases`) is fulfillment, not analytics. Mandate forbids identifiable Intelligence cells.  
SYSTEMS_AFFECTED: future telemetry maps; Admin Intelligence tab; OQL (do not add owner-keyed event entities); do not call `adminListGameKeyRequests` / `adminGetGameKeyReveal` from Intelligence  
RECOMMENDED_ACTION: Phase 0 GameKey snapshot may return **status histogram only** (pending/approved/redeemed/rejected counts). Never persist chat text, GameKey codes, emails, `uiLayout`, pixel patterns, click traces, or purchase KYC. Never reuse `getLeaderboard`, `getAllCharacters`, or OQL `gameKeyRequests` as an analytics wire format.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: GTAD-2026-09-01-001 (still NEW; this ID extends it for GameKey)  
REGRESSION_RISK: LOW if followed; HIGH if someone charts OQL GameKey rows in the browser.  
VALIDATION_REQUIRED: Intelligence responses contain no principal, display name, email, GameKey, or message body.  
STATUS: NEW  

---

ACTION_ID: GTAD-2026-09-02-002  
SOURCE_AUTOMATION: Gameplay Telemetry Architecture Director  
TITLE: Shop-credit increment site is redeemGameKey — not processPendingPurchases remount  
CATEGORY: telemetry  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: `processPendingPurchases` is a stub that always returns 0 (`main.mo` 1301–1316; `_autoCompletePendingPurchases` is empty). Paid Doka credits via `redeemGameKey` (`main.mo` 1436) through `redeemGameKeyThroughPersist` (`shopPurchase.ts` 210–240; `DokaGameKeyShop.tsx` 178). WX remount still calls `creditPendingPurchasesThroughPersist` (1459) which cannot observe a gain. AQA-012 “shop credit committed” and GTAD-Q-006 / P-010 must hook the GameKey path. `calculateAndAwardDoka` still returns 0 (`main.mo` 3008–3011).  
SYSTEMS_AFFECTED: future sidecar flush in `shopPurchase.ts`; Q-006 / P-010 / Q-013; Quality Auditor shop-credit interpretation; WX remount helper (do not treat as mint)  
RECOMMENDED_ACTION: Increment `quality.shop.redeem_ok` / `prog.doka_earned.shop_gamekey` only after redeem returns and `shouldCommitShopCredit(gained)`. Optional `quality.shop.redeem_fail` with enum reasons. Never increment on the no-op remount. Fire-and-forget **after** the persist-lock function returns. Swallow sidecar errors.  
AUTONOMY: IMPLEMENT_AFTER_HUMAN  
DEPENDENCIES: GTAD-2026-09-01-002; GTAD-2026-09-01-004; GTAD-2026-09-02-001  
REGRESSION_RISK: HIGH if someone counts remount no-ops as shop volume or enqueues telemetry on the wallet lock.  
VALIDATION_REQUIRED: A redeem `#ok` with gain produces one increment; remount `processPendingPurchases` produces zero; a throwing sidecar does not skip redeem.  
STATUS: NEW  

---

ACTION_ID: GTAD-2026-09-02-003  
SOURCE_AUTOMATION: Gameplay Telemetry Architecture Director  
TITLE: Unpaid death replay is a quality counter — not a second penalty writer  
CATEGORY: telemetry  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `flushPendingDeathPenalty` (`deathPenalty.ts` 572–588) writes the original 20/40 when `resolvePendingDeathReplay` says `write`, then `confirmAndClear`. Portal +10 or Doka-only credits must not look like a later earn. This is diagnostic of persist races, not a new economy.  
SYSTEMS_AFFECTED: `deathPenalty.ts` after replay write returns; GTAD-Q-014; persist lock (increments stay off it)  
RECOMMENDED_ACTION: After flush returns, fire-and-forget `quality.death_replay.{wrote|skipped_clear|fetch_fail}`. Do not change `persistDeathPenalty` math. Do not store pending XP/Doka amounts.  
AUTONOMY: IMPLEMENT_AFTER_HUMAN  
DEPENDENCIES: GTAD-2026-09-01-002; GTAD-2026-09-01-004  
REGRESSION_RISK: MEDIUM if someone forks the replay write or clears pending on increment failure.  
VALIDATION_REQUIRED: Existing `deathPenalty.test.ts` replay cases still pass with a throwing sidecar.  
STATUS: NEW  

---

ACTION_ID: GTAD-2026-09-02-004  
SOURCE_AUTOMATION: Gameplay Telemetry Architecture Director  
TITLE: Enemy summoner roll is a live Phase 2 knob — still do not invent elite_patrol or discovery events  
CATEGORY: content-scope  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Battle start sets `isSummoner` with `ENEMY_SUMMONER_CHANCE_BASE + level * PER_LEVEL_ZONE` (`WX` 12047–12057; `gameConstants.ts` 298–299). Family 30% roll is live (`WX` 5940–5952). `worldFeatures.ts` / formations / SDE observe→win have **no** WX importer. `ownedSpells` is still catalog grant (`WX` 2373–2401).  
SYSTEMS_AFFECTED: Phase 2 flush; Intelligence Enemies panel  
RECOMMENDED_ACTION: Allow E-007 (variant roll) and E-008 (summoner roll) once Phase 1 exists. Do not add `content.world_feature.elite_patrol` or discovery-source series until those systems persist an event. Family W/L must caption the battle-start overwrite of `sp`/`sr`/`init`/`res`/`chc` (WX 12007–12018).  
AUTONOMY: IMPLEMENT_AFTER_HUMAN  
DEPENDENCIES: GTAD-2026-09-01-006; GTAD-2026-09-01-014  
REGRESSION_RISK: LOW.  
VALIDATION_REQUIRED: Dashboard does not show world-feature or discovery charts with invented zeros.  
STATUS: NEW  

---

ACTION_ID: GTAD-2026-09-02-005  
SOURCE_AUTOMATION: Gameplay Telemetry Architecture Director  
TITLE: getAdminAuditLog is bound ops — not gameplay Intelligence  
CATEGORY: admin-ui  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: `getAdminAuditLog` (`main.mo` 3421–3426) is in official bindgen (`backend.ts` 873 / 2465). Entries include `adminPrincipal` (`types/admin.mo` 413–420). AdminDashboard still has no caller. TADD H14 may count `action` after privacy strip; GTAD Intelligence must not dump the ring as player behaviour.  
SYSTEMS_AFFECTED: Intelligence tab vs Purchases vs future Health H14  
RECOMMENDED_ACTION: Keep audit-log action counts on an ops/Health card if TADD ships H14. Do not mix them into battle/spell/economy Intelligence series. Never display `adminPrincipal` or principal-shaped `objectId`.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: GTAD-2026-09-01-001; GTAD-2026-09-01-007  
REGRESSION_RISK: LOW (deferral).  
VALIDATION_REQUIRED: Intelligence empty-state does not claim “zero admin mutations” from an unread audit ring.  
STATUS: NEW  

---

ACTION_ID: GTAD-2026-09-02-006  
SOURCE_AUTOMATION: Gameplay Telemetry Architecture Director  
TITLE: Telemetry Motoko maps must not hitchhike the GameKey EOP migration PR  
CATEGORY: process  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Open PR #259 (`cursor/eop-gamekey-migration-46e6`) is the GameKey stables upgrade path. New `telemetryLifetime` / `telemetryDay` maps on `main.mo` need bindgen, mock shape, and possibly `.old` / migrations. Caffeine import gate + oldest-first stack-compat are mandatory. Empty-canister M0263 if `.old` is skipped.  
SYSTEMS_AFFECTED: `src/backend/main.mo`; mocks; bindgen; possibly `.old` / `src/backend/migrations`  
RECOMMENDED_ACTION: Land telemetry stables in a dedicated, human-approved PR after #259 (or explicitly unioned by a human). Run `pnpm typecheck`, `pnpm check`, `mops check` or `caffeine check`, and `bash scripts/open-pr-stack-compat.sh --self`. Add increment/snapshot methods to the mock with the real shape.  
AUTONOMY: IMPLEMENT_AFTER_HUMAN  
DEPENDENCIES: GTAD-2026-09-01-013; GameKey EOP (#259) or a human combining the PRs  
REGRESSION_RISK: HIGH if maps are dropped on upgrade or conflict with GameKey NewActor.  
VALIDATION_REQUIRED: CI caffeine-import-gate and open-pr-stack jobs green; check-stable vs empty canister.  
STATUS: NEW  

---

ACTION_ID: GTAD-2026-09-02-007  
SOURCE_AUTOMATION: Gameplay Telemetry Architecture Director  
TITLE: Point Quality Auditor, Balance Analyst, Dashboard Designer, and longHorizonSim at the 09-02 contract — stay WAITING until Phase 0/1  
CATEGORY: prompt-architecture  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: `longHorizonSim.ts` 516–520 still sets `telemetry.available: false`. No sidecar in `src/`. Admin tabs (`gameTypes.ts` 483–498) have no intelligence/health. Cursor Cloud Automations have no prompt write API. TBC 09-01/09-02 reports must remain WAITING_FOR_TELEMETRY. AQA-012 shop site is now GameKey.  
SYSTEMS_AFFECTED: Quality Auditor prompt; Balance Analyst; Dashboard Designer; `utils/longHorizonSim.ts` (do not flip `available` in this docs PR)  
RECOMMENDED_ACTION: UPDATE_PROMPT (human, dashboard): read `docs/automation/TELEMETRY_ARCHITECTURE_2026-09-02.md`. If increment/snapshot APIs are absent, repeat INCONCLUSIVE / WAITING. If present, cite persist-ok/fail, victory-paid, death-penalty, recap open/dismiss, GameKey redeem, death-replay, and snapshot level histogram. Never treat a missing increment as a player regression. Never require persist-lock enqueue. Never treat `processPendingPurchases` volume as shop health. Keep `longHorizonSim.telemetry.available = false` until APIs exist and are populated.  
AUTONOMY: HUMAN_APPROVE  
DEPENDENCIES: GTAD-2026-09-01-003 or GTAD-2026-09-01-004 merged before sibling audits have numbers  
REGRESSION_RISK: LOW.  
VALIDATION_REQUIRED: Next auditor/balance/dashboard report either cites real counters or explicitly says “still no telemetry.”  
STATUS: NEW  

---

## Still NEW (do not re-file)

Implementers should execute these 09-01 IDs against **09-02 line numbers**:

| ID | Title (short) | 09-02 note |
| :--- | :--- | :--- |
| GTAD-2026-09-01-001 | Aggregates only; no principals | Extended by 09-02-001 (GameKey email) |
| GTAD-2026-09-01-002 | Fail-open sidecar; not on persist lock | Unchanged. AQA enqueue clause still superseded |
| GTAD-2026-09-01-003 | Phase 0 snapshot buckets | `getAllCharacters` now `main.mo` 529; optional GameKey **status** histogram |
| GTAD-2026-09-01-004 | Phase 1 outcome + quality hooks | Shop hook = 09-02-002; recap dismiss still `PostBattleRecap` onClose 68/95/99 |
| GTAD-2026-09-01-005 | Tag flee vs combat vs lava/spike | Flee `WX` 18976; HP-watch 13419 still a second entry |
| GTAD-2026-09-01-006 | Phase 2 combat/spell/content dims | Add E-008 summoner roll; family overwrite 12007–12018 |
| GTAD-2026-09-01-007 | Intelligence tab, honest empty state | Distinct from Purchases GameKey inbox |
| GTAD-2026-09-01-008 | Do not invent spell-discovery persist | `ownedSpells` still catalog grant (WX 2373) |
| GTAD-2026-09-01-009 | Defer sequences / intent / URLs / world-features | Unchanged |
| GTAD-2026-09-01-010 | Sibling prompts stay WAITING | Superseded for *citation path* by 09-02-007 |
| GTAD-2026-09-01-011 | Keep increment maps off OQL | Do not OQL-expose telemetry or `gameKeyLedger` |
| GTAD-2026-09-01-012 | Sidecar outside WorldExploration | WX is now **19,253** lines |
| GTAD-2026-09-01-013 | Import gate on Motoko/mocks | Plus stack-compat; see 09-02-006 |
| GTAD-2026-09-01-014 | Family-variant / enemy-only extras | Plus E-008; still no elite_patrol |
