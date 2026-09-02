# Telemetry Admin Dashboard Designer — ACTION_IDs (2026-09-02)

Source automation: Telemetry Admin Dashboard Designer (`4b026695`).  
Design only. No production code in this run.

Prior IDs `TADD-2026-08-31-001` … `007`, `AQA-2026-08-30-012`, and
`TADD-2026-09-01-002` … `005` remain **OPEN**.  
`TADD-2026-09-01-001` bindgen half is **done** on `58302bc`; the Health
H14 card is still unbuilt (see 09-02-001). Do not open a second counter
set. This file is the delta after HEAD `58302bc`.

---

ACTION_ID: TADD-2026-09-02-001  
SOURCE_AUTOMATION: Telemetry Admin Dashboard Designer  
TITLE: Implement Health H14 on the now-bound getAdminAuditLog — aggregates only  
CATEGORY: telemetry  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: `getAdminAuditLog` is in official bindgen (`src/frontend/src/backend.ts` 873–889 and 2465–2481; `declarations/backend.did.d.ts` 684). Canister method is last-100 (`main.mo` 3421–3426; ring trim at 591–610). AdminDashboard still has **0** callers. New GameKey audits (`approveGameKey` / `rejectGameKey` / `markGameKeyEmailed` at `main.mo` 1555, 1575, 1606) store `userPrincipal.toText()` in `objectId`. Validation `#err` still returns before `_recordAdminAudit`. TADD-2026-09-01-001 asked for bindgen first; that wait is over.  
SYSTEMS_AFFECTED: Health H14; do not change persist writers; do not add an OQL audit entity  
RECOMMENDED_ACTION: After a human picks this ID with the Health tab (TADD-002), call `getAdminAuditLog` from owner Health only. Render counts by `action`. Drop `adminPrincipal`. Drop `objectId` when it is a player principal (grant/ban/role/GameKey). Caption: last 100 successful admin writes, not lifetime volume, not invalid-config events, not CUSTOM_FALLBACK. Do not leave the card in “bindings missing.” Do not paint the raw ring.  
AUTONOMY: IMPLEMENT_AFTER_DESIGN — read-only Health card  
DEPENDENCIES: TADD-2026-08-31-002 (Health tab); TADD-2026-08-31-005 (PII); TADD-2026-09-01-001 (bindgen, done)  
REGRESSION_RISK: LOW if read-only. MEDIUM if audit rows are stored in React state and painted as a principal table.  
VALIDATION_REQUIRED: Network inspector on Health shows no admin/player principals. `n` equals ring length. GameKey approve rows increment `approveGameKey` only.  
STATUS: NEW  

---

ACTION_ID: TADD-2026-09-02-002  
SOURCE_AUTOMATION: Telemetry Admin Dashboard Designer  
TITLE: Attach AQA-012 shop_credit_committed to redeemGameKeyThroughPersist — never processPendingPurchases  
CATEGORY: telemetry  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: AQA-012 / TADD-2026-08-31-001 still not shipped. `processPendingPurchases` is now a documented dead credit that **always returns 0** (`main.mo` 1301–1316). World still remounts `creditPendingPurchasesThroughPersist` (`WorldExploration.tsx` 1459–1462), which cannot gain. Live paid mint is `redeemGameKeyThroughPersist` (`shopPurchase.ts` 210–238) from `DokaGameKeyShop.tsx`. On this HEAD the helper still commits from a follow-up wallet query + `shouldCommitShopCredit`. Older open PR #279 (createdAt before this run) changes that to commit `#ok(dokaAmount)` via `shouldCommitGameKeyRedeem` so a stale query cannot skip the lock. TADD-2026-09-01-003 still said increment shop credit after `shouldCommitShopCredit` on the pending-purchase path.  
SYSTEMS_AFFECTED: future sidecar only; `redeemGameKeyThroughPersist`; do not revive auto-complete  
RECOMMENDED_ACTION: When TADD-001 is implemented, increment `shop_credit_committed` only when the official redeem persist helper **commits** (follow #279 if it has landed: seeded lock and `#ok` granted > 0). Do not increment from a second `getCallerDokaBalance`. Do not increment on request, approve, reject, email-mark, World remount, or `processPendingPurchases`. Keep TADD-2026-09-01-003 rules for victory/death/persist. Do not enqueue a second wallet write on `progressPersistRef`. Swallow sidecar errors.  
AUTONOMY: IMPLEMENT_WITH_TADD-2026-08-31-001 — do not open a second counter set  
DEPENDENCIES: AQA-2026-08-30-012; TADD-2026-08-31-001; TADD-2026-09-01-003; open PR #279 (union persist helper, do not overwrite)  
REGRESSION_RISK: MEDIUM if counters write off the persist lock, tick on the always-0 remount, or double-count a redeem whose HUD used `#ok` while the lock used a stale query  
VALIDATION_REQUIRED: One successful redeem whose persist helper commits → `shop_credit_committed` +1. Remount / `processPendingPurchases` → 0. Failed or already-used key → 0. Unseeded lock → 0. Next Quality Auditor can cite weekly persist-ok/fail, victory-paid, and shop-credit, or still say “not shipped.”  
STATUS: NEW  

---

ACTION_ID: TADD-2026-09-02-003  
SOURCE_AUTOMATION: Telemetry Admin Dashboard Designer  
TITLE: Health H6 is a GameKey status funnel — no email, no code, no legacy KYC mix-in  
CATEGORY: telemetry  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: Purchases tab is `AdminGameKeyPurchases` (email + reveal). `adminListGameKeyRequests` (`main.mo` 1507–1516) and OQL `gameKeyRequests` (`main.mo` 3715–3731) include email and `userPrincipal`. `dokaAmount` is 0 until approve. Ledger/reveals are not OQL. Legacy `initiatePurchase` errors; `purchaseRecords` is a stale writer. ShopPackage UI is absent from AdminDashboard. `hintedEuroCents` is a player hint (`dokaGameKey.ts` 15–18), not Mollie settlement.  
SYSTEMS_AFFECTED: Health H6; do not change GameKey writers  
RECOMMENDED_ACTION: On the Health tab, aggregate GameKey requests by `status` (pending / approved / redeemed / rejected). Optionally sum `dokaAmount` for redeemed (minted) and approved (outstanding keys). Strip email, principal, redeemedBy, and codes before setState. Do not reuse `AdminGameKeyPurchases`. Do not chart hinted euros as revenue. Do not merge leftover `purchaseRecords` into the same bars. Caption: as-of-now; hide % when n < 20.  
AUTONOMY: IMPLEMENT_WITH_TADD-2026-08-31-002  
DEPENDENCIES: TADD-2026-08-31-002; TADD-2026-08-31-005  
REGRESSION_RISK: MEDIUM if Health stores the full request list (email leak). LOW if aggregated first.  
VALIDATION_REQUIRED: Health DOM/network has no emails or 120-char keys. n is request count. Outstanding approved Doka is labeled issued-not-redeemed, not wallet credit.  
STATUS: NEW  

---

ACTION_ID: TADD-2026-09-02-004  
SOURCE_AUTOMATION: Telemetry Admin Dashboard Designer  
TITLE: H2 captions — only four achievement keys are server-gated; combat feats stay client-trusted  
CATEGORY: telemetry  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: `markAchievementUnlocked` (`main.mo` 2400–2432) still trusts the client to call it, but `AdminGuard.achievementUnlockRejected` (`adminGuard.mo` 551–565) now refuses `level_10`, `doka_1000`, `doka_10000`, and `spell_level_5` when best slot level / wallet / best spell level is short. Retired configs still cannot newly unlock (`main.mo` 2410–2412). Comment in adminGuard: “Combat feats stay client-trusted.” TADD-2026-09-01-004 said the canister did not evaluate the condition.  
SYSTEMS_AFFECTED: Health H2 captions only  
RECOMMENDED_ACTION: Caption H2: “Client-reported unlock, except level/Doka/spell-level keys listed in `achievementUnlockRejected`.” Do not label the funnel “feat completions proven” for combat conditions (`first_battle_win`, `survive_1hp`, …). Do not add a discovery/combat-feat persist path for analytics. Keep TADD-2026-09-01-004 H3 language (upgrade persist, not discovery).  
AUTONOMY: IMPLEMENT_WITH_TADD-2026-08-31-002  
DEPENDENCIES: TADD-2026-08-31-002; TADD-2026-09-01-004  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: H2 empty states never say “0 feat completions proven” for combat keys. Server-gated keys may say “canister refused if snapshot short.”  
STATUS: NEW  

---

ACTION_ID: TADD-2026-09-02-005  
SOURCE_AUTOMATION: Telemetry Admin Dashboard Designer  
TITLE: Treat “Stored URL — not rendered” as unused catalog storage, not CUSTOM_FALLBACK  
CATEGORY: visuals-telemetry  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `adminVisualStatus.ts` landed: empty URL → `DEFAULT_PIXEL_VISUAL_STATUS` (“Active fallback”); filled URL → `STORED_URL_NOT_RENDERED_*`. WorldExploration still has 0 `spriteUrl` / `drawImage` hits. File header states a pasted URL is catalog-only until VAL-001/011. TADD-2026-09-01-002 already forbade charting empty-URL “Active fallback” and audit `pixel-fallback` as CUSTOM_FALLBACK; the stored-not-rendered chip is new.  
SYSTEMS_AFFECTED: Health H10 captions; future custom-URL loader only  
RECOMMENDED_ACTION: H10 may count empty vs stored URLs as config hygiene. Empty = NORMAL_DEFAULT. Stored = unused catalog field. Do not increment CUSTOM_FALLBACK for either, or for admin preview `onError`, pattern-lookup-failed, or `deletePlayerSpriteConfig` audit rows. CUSTOM_FALLBACK remains unapproved until a human ID covers a real custom-URL loader (`url != ""` and load/decode fails).  
AUTONOMY: POLICY — implement captions with TADD-002 / H10  
DEPENDENCIES: TADD-2026-08-31-006; TADD-2026-09-01-002  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Health has no “pixel fallback errors” or “custom visual failure rate” series. H10 names NORMAL_DEFAULT vs STORED_NOT_RENDERED vs (not measured) CUSTOM_FALLBACK.  
STATUS: NEW  

---

ACTION_ID: TADD-2026-09-02-006  
SOURCE_AUTOMATION: Telemetry Admin Dashboard Designer  
TITLE: Keep refusing invented combat/economy/enemy series — still no event telemetry on 58302bc  
CATEGORY: process  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Re-inventory 2026-09-02. No Health tab. No `persist_ok` / sidecar. `saveKillCount` still unused. Wallet is current Nat. World does not load `spriteUrl`. `longHorizonSim.telemetry.available === false`. GameKey and audit bindgen landed without AQA-012. TADD-2026-08-31-004 and TADD-2026-09-01-005 already stated this policy.  
SYSTEMS_AFFECTED: Future hunters / dashboard implementers; do not touch RAF, map gen, turn logic, or damage math to “add telemetry.”  
RECOMMENDED_ACTION: Refuse charts for battle count, victory/defeat/flee, average turns, encounter frequency, relative enemy level, win/loss, duration, elite frequency, advanced AI, enemy spell usage, spell casts, discovery, acquisition source, combat combinations, Doka earned/spent totals, boss attempts/average attempts/flee, invalid-config events, failed asset loads, and custom-fallback events. Do not wire `saveKillCount` as a battle proxy. Do not treat GameKey hints or dead `processPendingPurchases` as an earn/spend ledger. Any expansion beyond AQA-012 needs a new human-approved ACTION_ID.  
AUTONOMY: POLICY — no code  
DEPENDENCIES: TADD-2026-09-01-005 (same policy; this ID records the 72-hour reconfirm after GameKey)  
REGRESSION_RISK: LOW. Residual risk is continued blindness (already true).  
VALIDATION_REQUIRED: Next dashboard PR does not add those series. Next Quality Auditor still marks them INCONCLUSIVE unless TADD-001 shipped.  
STATUS: NEW  
