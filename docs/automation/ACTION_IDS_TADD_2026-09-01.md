# Telemetry Admin Dashboard Designer — ACTION_IDs (2026-09-01)

Source automation: Telemetry Admin Dashboard Designer (`4b026695`).  
Design only. No production code in this run.

Prior IDs `TADD-2026-08-31-001` … `007` and `AQA-2026-08-30-012` remain
**OPEN**. Do not open a second counter design. This file is the delta after
HEAD `dd275aa`.

---

ACTION_ID: TADD-2026-09-01-001  
SOURCE_AUTOMATION: Telemetry Admin Dashboard Designer  
TITLE: Bindgen getAdminAuditLog, then Health H14 aggregates only  
CATEGORY: telemetry  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: `getAdminAuditLog` exists (`src/backend/main.mo` 3101–3106) as a last-100 ring (`adminAuditLog`, 618–638). It is stubbed on the frontend mock (`mocks/backend.ts` 263) and typed on `UiLayoutActor` (`usePanelLayout.ts` 48–51) but **absent** from `backend.ts`, `backend.d.ts`, and `declarations/backend.did.d.ts`. AdminDashboard never calls it. OQL has no audit entity. Validation `#err` returns before `_recordAdminAudit`.  
SYSTEMS_AFFECTED: bindgen; Health H14; do not change persist writers  
RECOMMENDED_ACTION: After a human picks this ID, run official bindgen so the Health client can call `getAdminAuditLog`. Render counts by `action` only. Drop `adminPrincipal`. Drop `objectId` when it is a player principal (grant/ban/role). Caption: last 100 successful admin writes, not lifetime volume, not invalid-config events. Do not add a telemetry OQL entity with an owner column.  
AUTONOMY: IMPLEMENT_AFTER_DESIGN — bindgen + read-only Health card  
DEPENDENCIES: TADD-2026-08-31-002 (Health tab); TADD-2026-08-31-005 (PII)  
REGRESSION_RISK: LOW if read-only. MEDIUM if audit rows are stored in React state and painted as a principal table.  
VALIDATION_REQUIRED: Network inspector on Health shows no admin/player principals. Card is “bindings missing” until bindgen. `n` equals ring length.  
STATUS: NEW  

---

ACTION_ID: TADD-2026-09-01-002  
SOURCE_AUTOMATION: Telemetry Admin Dashboard Designer  
TITLE: Do not treat admin “pixel-fallback” labels as CUSTOM_FALLBACK events  
CATEGORY: visuals-telemetry  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: WorldExploration has 0 `spriteUrl` / `drawImage` hits. Empty `spriteUrl` is `NORMAL_DEFAULT` (`adminContract.test.ts` 139–144; enemy chip “Default pixel visual” at `AdminDashboard.tsx` 2066). Three label traps now exist: (1) sprite preview “Default Pixel Visual — Active fallback” when URL is empty (`AdminDashboard.tsx` 1429); (2) `deletePlayerSpriteConfig` audit `newSummary = "pixel-fallback"` (`main.mo` 838); (3) local `pattern lookup failed` (`pieceArt.ts` 809–811) is a pieceType/palette miss. TADD-2026-08-31-006 already forbade charting either class as errors; these strings arrived after that ID.  
SYSTEMS_AFFECTED: Health H10/H14 captions; future custom-URL loader only  
RECOMMENDED_ACTION: Health must classify empty URL as NORMAL_DEFAULT. Do not increment CUSTOM_FALLBACK for empty URL, admin preview `onError`, pattern-lookup-failed, the “Active fallback” empty-state copy, or `deletePlayerSpriteConfig` audit rows. CUSTOM_FALLBACK remains unapproved until a human ID covers a real custom-URL loader (`url != ""` and load/decode fails).  
AUTONOMY: POLICY — implement captions with TADD-002 / H14  
DEPENDENCIES: TADD-2026-08-31-006; TADD-2026-09-01-001  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Health has no “pixel fallback errors” series. H10/H14 captions name the three traps.  
STATUS: NEW  

---

ACTION_ID: TADD-2026-09-01-003  
SOURCE_AUTOMATION: Telemetry Admin Dashboard Designer  
TITLE: Attach AQA-012 increments after persist hardening — once, never on refuse/restore/dead mint  
CATEGORY: telemetry  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: AQA-012 / TADD-2026-08-31-001 still not shipped. Meanwhile official persist changed: `clampApplyRewardsDeltas` (`applyRewardsResult.ts` 46–60); `respawnHpAfterDeath` (`deathPenalty.ts` 131–141); leftover-recap / second-death refuses (`deathGuards.ts`, `battleSetup.ts` 360); `calculateAndAwardDoka` now returns 0 (`main.mo` 2687–2693). Persist-fail logs remain `logDebugInfo` (`WorldExploration.tsx` 13158–13162, 13399).  
SYSTEMS_AFFECTED: future sidecar only; `applyRewards`, `persistDeathPenalty`, recap, shop credit  
RECOMMENDED_ACTION: When TADD-001 is implemented, increment `victory_paid` once on `applyRewards` `#ok` for a battle recap; `death_penalty_applied` only when the penalty write succeeds (not HP restore, not refused leftover persist); `shop_credit_committed` only after `#ok` and `shouldCommitShopCredit`; persist-ok/fail on official writers only. Do not increment from `calculateAndAwardDoka`. Do not enqueue a second wallet write on `progressPersistRef`. Swallow sidecar errors.  
AUTONOMY: IMPLEMENT_WITH_TADD-2026-08-31-001 — do not open a second counter set  
DEPENDENCIES: AQA-2026-08-30-012; TADD-2026-08-31-001; AQA-2026-08-30-008  
REGRESSION_RISK: MEDIUM if counters write off the persist lock or double-count after the 08-31 victory/death fixes  
VALIDATION_REQUIRED: One victory → `victory_paid` +1. One death persist `#ok` → `death_penalty_applied` +1. Refused leftover recap → 0 extra. `calculateAndAwardDoka` → 0. Next Quality Auditor can cite weekly persist-ok/fail and victory-paid, or still say “not shipped.”  
STATUS: NEW  

---

ACTION_ID: TADD-2026-09-01-004  
SOURCE_AUTOMATION: Telemetry Admin Dashboard Designer  
TITLE: H2/H3 captions — retirement gates are not discovery or feat proof  
CATEGORY: telemetry  
PRIORITY: P2  
CONFIDENCE: HIGH  
EVIDENCE: `shouldIncludeBackendSpellInLibrary` (`adminSafety.ts` 310–318) hides retired catalog spells unless `spellLevelKeys` / `spellBarOrder` already contain the id. Active `usableByPlayer` catalog rows are still treated as library. `markAchievementUnlocked` now rejects unknown / `active=false` (`main.mo` 2112–2118) but still does not evaluate the feat condition. No observe/unlock persist. Starter list remains `data/spellData.ts` (32 ids; `longHorizonSim.test.ts` asserts `allSpellsAreStarter` / `starterSpellCount` 32).  
SYSTEMS_AFFECTED: Health H2/H3 captions only  
RECOMMENDED_ACTION: Do not label H3 “discovery,” “obtained,” “underused,” or “overused.” Caption: upgrade persist + retirement gating. H2: “client said unlocked”; retired feats cannot newly unlock. Do not add a discovery persist path for analytics (MTD-2026-08-31-007 / prior TADD policy).  
AUTONOMY: IMPLEMENT_WITH_TADD-2026-08-31-002  
DEPENDENCIES: TADD-2026-08-31-002; TADD-2026-08-31-004  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: H3/H2 empty states never say “0 discoveries” or “0 feat completions proven.”  
STATUS: NEW  

---

ACTION_ID: TADD-2026-09-01-005  
SOURCE_AUTOMATION: Telemetry Admin Dashboard Designer  
TITLE: Keep refusing invented combat/economy/enemy series — still no event telemetry on dd275aa  
CATEGORY: process  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Re-inventory 2026-09-01. No Health tab. No `persist_ok` / sidecar. `saveKillCount` still unused. Wallet is current Nat. World does not load `spriteUrl`. `longHorizonSim.telemetry.available === false`. Many persist/admin PRs merged after #119 without AQA-012. TADD-2026-08-31-004 already stated this policy.  
SYSTEMS_AFFECTED: Future hunters / dashboard implementers; do not touch RAF, map gen, turn logic, or damage math to “add telemetry.”  
RECOMMENDED_ACTION: Refuse charts for battle count, victory/defeat/flee, average turns, encounter frequency, relative enemy level, win/loss, duration, elite frequency, advanced AI, enemy spell usage, spell casts, discovery, acquisition source, combat combinations, Doka earned/spent totals, boss attempts/average attempts/flee, invalid-config events, failed asset loads, and custom-fallback events. Do not wire `saveKillCount` as a battle proxy. Any expansion beyond AQA-012 needs a new human-approved ACTION_ID.  
AUTONOMY: POLICY — no code  
DEPENDENCIES: TADD-2026-08-31-004 (same policy; this ID records the 72-hour reconfirm)  
REGRESSION_RISK: LOW. Residual risk is continued blindness (already true).  
VALIDATION_REQUIRED: Next dashboard PR does not add those series. Next Quality Auditor still marks them INCONCLUSIVE unless TADD-001 shipped.  
STATUS: NEW
