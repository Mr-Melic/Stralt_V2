# ACTION_IDs — 2026-09-01 Enemy & Boss Admin Content Designer

Durable ledger for implementers and the Report Action Orchestrator.  
Source of every record: Enemy & Boss Admin Content Designer.  
Prior contract: [`ENEMY_BOSS_ADMIN_DESIGN_2026-08-31.md`](./ENEMY_BOSS_ADMIN_DESIGN_2026-08-31.md).  
Re-audit: [`ENEMY_BOSS_ADMIN_REAUDIT_2026-09-01.md`](./ENEMY_BOSS_ADMIN_REAUDIT_2026-09-01.md).  
Verified against `origin/main` @ `dd275aa`.

**Do not re-file** `EBA-2026-08-31-001` … `024`. Those remain OPEN. This file is **new gaps only**.  
Do not implement gameplay from this file unless a later human or orchestrator picks an ID. This run ships **docs only**.

Sibling IDs to consume, not duplicate: `SDA-2026-08-31-*`, `VAL-2026-08-31-*`.

---

ACTION_ID: EBA-2026-09-01-001  
SOURCE_AUTOMATION: Enemy & Boss Admin Content Designer  
TITLE: Replace adminGuard closed-band enemy/region checks with RelativeEligibility validators  
CATEGORY: scaling-guard  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: After the 08-31 design, `AdminGuard.validateEnemyConfig` (`src/backend/lib/adminGuard.mo` 205–218) rejects any enemy whose `levelMin`/`levelMax` are missing the closed-band invariant (`>= 1` and `min <= max`). `validateRegionConfig` (235–242) does the same. `adminSetEnemyConfig` (`src/backend/main.mo` 764–766) returns `#err` before write. `newEnemy()` still defaults `levelMax: BigInt(5)` (`AdminDashboard.tsx` 117–124). Product rule: Stralt has no character level cap. These rails **canonize** the forbidden schema EBA-2026-08-31-002 told implementers to delete. HP 1–100000 (208–209) and boss HP 1–100000 (`validateBossConfig` 396–397) are document-size rails on offset-0 bases — do not treat them as a world level cap. AP/MP ≤ 20 (211–212, 394–395) stays a combat-budget clamp.  
SYSTEMS_AFFECTED: `src/backend/lib/adminGuard.mo`; `src/backend/main.mo` adminSetEnemyConfig / adminSetRegionConfig / setBossConfig; frontend Enemy/Region editors; future EnemyDefinition persist  
RECOMMENDED_ACTION: When EBA-2026-08-31-002 lands, replace `levelMin`/`levelMax` checks with `RelativeEligibility` (`minOffset`, optional **relative** `maxOffset`, `weightCurve`, tags). Reject an absolute world `levelMax`. Keep AP/MP ≤ 20. If offset-0 `baseStats.hp` keeps a Nat ceiling, document it as a template-size rail, never as “max player level.” Preview/validate must accept owner-typed player levels 1, 80, 800, 8000. Do not add `floor(999/…)` here (`combatMath.ts` 58 is EBA-2026-08-31-003).  
AUTONOMY: HUMAN_APPROVE — Motoko persist + security rails.  
DEPENDENCIES: EBA-2026-08-31-002; EBA-2026-08-31-001  
REGRESSION_RISK: HIGH if someone “fixes” activation by keeping the closed band so current Admin saves still pass. MEDIUM if AP 20 is deleted (combat budget).  
VALIDATION_REQUIRED: A definition with only `minOffset = -2` and no max activates. Saving an enemy that only has relative eligibility is not rejected for “levelMin cannot exceed levelMax.” Player level 8000 still eligible. `mops check` or `caffeine check`; `pnpm typecheck`.  
STATUS: NEW  

---

ACTION_ID: EBA-2026-09-01-002  
SOURCE_AUTOMATION: Enemy & Boss Admin Content Designer  
TITLE: Stop calling live pbv_boss_configs a “draft”  
CATEGORY: admin-ux  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Boss Editor copy (`AdminDashboard.tsx` 7332–7335) says “Browser-local drafts only” and “A saved draft is not the live encounter until a backend writer exists,” then “Changes apply on this browser's next boss encounter.” Portal entry loads `localStorage.getItem("pbv_boss_configs")` (`WorldExploration.tsx` 7150–7154). `useGetAllBossConfigs` / `useSetBossConfig` (`useBossQueries.ts` 14–21; `useAdminQueries.ts` 510–519) read/write that key. EBA-2026-08-31-005 requires DRAFT → VALIDATE → PREVIEW → ACTIVATE. Calling the **live** browser store a draft teaches the opposite lifecycle.  
SYSTEMS_AFFECTED: `AdminDashboard.tsx` BossesTab copy only (until EBA-004/005 land)  
RECOMMENDED_ACTION: Until EBA-2026-08-31-004, label the store **LIVE BROWSER SOURCE** (this browser, next boss encounter, not canister). After 004+005, the footer is Validate → Preview → Activate and “draft” means `lifecycle = draft` on the canister. Never use “draft” for an immediately applied localStorage write.  
AUTONOMY: IMPLEMENT_WITH_TESTS — copy-only is allowed; do not change persist in the same PR.  
DEPENDENCIES: None for the copy fix; EBA-2026-08-31-004; EBA-2026-08-31-005 for the real lifecycle  
REGRESSION_RISK: LOW  
VALIDATION_REQUIRED: Owner-facing string no longer claims a saved boss is inert. After 004, draft rows do not appear in the next portal.  
STATUS: NEW  

---

ACTION_ID: EBA-2026-09-01-003  
SOURCE_AUTOMATION: Enemy & Boss Admin Content Designer  
TITLE: Wire boss set/delete to the canister; do not treat the portal-assignment gate as soft-retire  
CATEGORY: persistence  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: `deleteBossConfig` (`main.mo` 2616–2631) now returns `#err` if any `bossPortalAssignments` row points at the id (2620–2623), then `remove`s. Frontend `useDeleteBossConfig` / `useSetBossConfig` (`useAdminQueries.ts` 510–538) only mutate `pbv_boss_configs`. The new gate is **dead** from Admin. `adminDeleteEnemyConfig` (`main.mo` 777–783) is still unconditional `remove` with no dependents. EBA-2026-08-31-021 required soft-retire + rush/kit/mastery/portal report. A single unused portal check is not that.  
SYSTEMS_AFFECTED: `useAdminQueries.ts`; `useBossQueries.ts`; `main.mo` deleteBossConfig / setBossConfig; Admin Bosses tab  
RECOMMENDED_ACTION: As part of EBA-2026-08-31-004, Admin set/delete must call the actor. Keep the portal-assignment refuse as one line in the dependency report. Add rush rooms, kit refs, mastery, and in-flight best-effort. Lifecycle `draft|active|inactive|retired`. Hard delete only unpublished drafts with zero dependents. Do not ship a second localStorage writer.  
AUTONOMY: HUMAN_APPROVE — Candid / migration.  
DEPENDENCIES: EBA-2026-08-31-004; EBA-2026-08-31-021; EBA-2026-08-31-005  
REGRESSION_RISK: HIGH if UI starts calling canister delete while gameplay still reads localStorage (split-brain worse). MEDIUM if portal-only refuse lets rush rooms dangle.  
VALIDATION_REQUIRED: Admin delete hits `deleteBossConfig`. Assigned boss returns err with the portal id listed. Retired (not deleted) boss stays resolvable for an in-progress room. Empty localStorage still loads seeded defs from the actor after 004.  
STATUS: NEW  

---

ACTION_ID: EBA-2026-09-01-004  
SOURCE_AUTOMATION: Enemy & Boss Admin Content Designer  
TITLE: Retire longHorizonSim’s private kit and boss-scaling copy  
CATEGORY: sensitive-code  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `src/frontend/src/utils/longHorizonSim.ts` 44–70 duplicates `ENEMY_KITS` / `buildEnemyKit` and does `Math.floor(levelZone as number)` (52). Comment at 45–47 already records that the live call site passes a `levelZone` object. Line 412 calls `getBossEffectiveStats` while combat spawn (`WorldExploration.tsx` 7202–7225) uses raw `baseStats` and `level + 5`. EBA-2026-08-31-013 / 011 / 022 require one helper. A third copy will “pass” sim reports that combat cannot match.  
SYSTEMS_AFFECTED: `utils/longHorizonSim.ts`; future `engine/enemyKitResolve.ts`; `engine/bossDefinition.ts`  
RECOMMENDED_ACTION: Import the same resolver EBA-013/011 extract. Delete the private `buildEnemyKit`. Sim preview of boss HP must use the function combat will call. Do not “fix” the sim by recasting the zone object. Do not edit RAF / mapGen / damage math.  
AUTONOMY: IMPLEMENT_AFTER EBA-2026-08-31-013 and EBA-2026-08-31-011 helpers exist; or land the import in the same extract PR.  
DEPENDENCIES: EBA-2026-08-31-013; EBA-2026-08-31-011; EBA-2026-08-31-022  
REGRESSION_RISK: MEDIUM if sim keeps the old table after combat kits move to SDA. LOW if it only imports.  
VALIDATION_REQUIRED: Grep finds one `buildEnemyKit` implementation. Sim at playerLevel 1 and 10000 uses the same kit-zone helper as battle start. Boss HP in sim equals `getBossEffectiveStats` for that pair **and** combat after 011.  
STATUS: NEW  

---

ACTION_ID: EBA-2026-09-01-005  
SOURCE_AUTOMATION: Enemy & Boss Admin Content Designer  
TITLE: Ban or guard the unused admin-api.mo mixin write path  
CATEGORY: persist-footgun  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `src/backend/mixins/admin-api.mo` 18–25 exposes `adminSetEnemyConfig` that calls `AdminLib.setEnemyConfig` (`src/backend/lib/admin.mo` 8–13) with **no** `AdminGuard.validateEnemyConfig` and **no** `_recordAdminAudit`. Live actor methods live in `src/backend/main.mo` 760–774 (guard + audit). `main.mo` does not include this mixin (grep: no `admin-api` include). The next Motoko split that `include`s the mixin would publish an unguarded duplicate of the same Candid name.  
SYSTEMS_AFFECTED: `src/backend/mixins/admin-api.mo`; `src/backend/lib/admin.mo` set/delete helpers; canonical `src/backend/main.mo`  
RECOMMENDED_ACTION: Either delete the mixin, or make `AdminLib.setEnemyConfig` call the same guard and have the mixin record audit like `main.mo`. Do not `include` the mixin into `main.mo` as-is (duplicate public funcs). Do not deploy `backend_extended/`.  
AUTONOMY: HUMAN_APPROVE — Motoko surface.  
DEPENDENCIES: EBA-2026-09-01-001 if guards move  
REGRESSION_RISK: HIGH if both mixin and `main.mo` methods are compiled together (name clash). LOW if the mixin stays unused and is deleted.  
VALIDATION_REQUIRED: `mops check` / `caffeine check`. After change, every enemy write path runs `validateEnemyConfig` (or the RelativeEligibility successor) and audit. No second unguarded `add`.  
STATUS: NEW  

---

ACTION_ID: EBA-2026-09-01-006  
SOURCE_AUTOMATION: Enemy & Boss Admin Content Designer  
TITLE: Do not label unused spriteUrl as a live Default/Custom visual  
CATEGORY: visual  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Enemy editor (`AdminDashboard.tsx` 731–762) titles the URL box “Custom Visual Override,” states “Default Pixel Visual — Active fallback when this field is empty,” and chips “Custom Visual — 1 override URL” vs “Default Pixel Visual — Active fallback.” Library cards (`AdminDashboard.tsx` 2066–2068) show “Custom visual” / “Default pixel visual” from `spriteUrl[0]`. World spawn stores `family` and still paints chess / family pixels; `spriteUrl` is not read by the world renderer (VAL-012; EBA-2026-08-31-017). Owners will believe a pasted URL is live.  
SYSTEMS_AFFECTED: `AdminDashboard.tsx` EnemyEditor / EnemyList copy only until EBA-017 + VAL  
RECOMMENDED_ACTION: Until VAL-001/010 and EBA-2026-08-31-017, status must say **UNUSED — not rendered** (or remove VAL wording). After 017: controls Use Default Pixel Visual / Select Uploaded Visual / Select Visual Pool / Preview / Manage Assets, default `visualMode = none`, category spec beside the controls (`enemy_standard` vs `boss_large`). Never `drawImage(spriteUrl)` on the RAF path. Visual bind must not change stats, AI, occupancy, range, or rewards.  
AUTONOMY: IMPLEMENT_WITH_TESTS for copy-only; full controls IMPLEMENT_AFTER VAL-001/003/004/010  
DEPENDENCIES: EBA-2026-08-31-017; VAL-2026-08-31-001; VAL-2026-08-31-008; VAL-2026-08-31-010; VAL-2026-08-31-012  
REGRESSION_RISK: HIGH if a hunter wires raw `spriteUrl` into draw to make the chip “true.” LOW if copy is honest and default remains built-in pixels.  
VALIDATION_REQUIRED: Empty URL matches current pixels. A pasted URL does not change the overworld sprite until VAL bind exists. After 017, deleted asset → builtin next frame; occupancy stays one tile for `boss_large`.  
STATUS: NEW  
