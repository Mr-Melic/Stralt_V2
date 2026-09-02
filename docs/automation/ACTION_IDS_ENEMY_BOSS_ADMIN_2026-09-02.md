# ACTION_IDs — 2026-09-02 Enemy & Boss Admin Content Designer

Durable ledger for implementers and the Report Action Orchestrator.  
Source of every record: Enemy & Boss Admin Content Designer.  
Prior contract: [`ENEMY_BOSS_ADMIN_DESIGN_2026-08-31.md`](./ENEMY_BOSS_ADMIN_DESIGN_2026-08-31.md).  
Re-audit: [`ENEMY_BOSS_ADMIN_REAUDIT_2026-09-02.md`](./ENEMY_BOSS_ADMIN_REAUDIT_2026-09-02.md).  
Verified against `origin/main` @ `58302bc`.

**Do not re-file** `EBA-2026-08-31-001` … `024` or `EBA-2026-09-01-001` … `006`. Those remain OPEN (006 copy is PARTIAL). This file is **new gaps only**.  
Do not implement gameplay from this file unless a later human or orchestrator picks an ID. This run ships **docs only**.

Sibling IDs to consume, not duplicate: `SDA-2026-08-31-*`, `SDA-2026-09-01-*`, `VAL-2026-08-31-*`, `VAL-2026-09-01-*`, `AFDA-2026-08-31-011`, `WDEAD-*`.

---

ACTION_ID: EBA-2026-09-02-001  
SOURCE_AUTOMATION: Enemy & Boss Admin Content Designer  
TITLE: Do not treat levelMax = 9999 as unbounded RelativeEligibility  
CATEGORY: scaling  
PRIORITY: P0  
CONFIDENCE: HIGH  
EVIDENCE: After the 09-01 EBA re-audit (which still saw `newEnemy()` `levelMax: 5` on `dd275aa`), commit `22b69cf` shipped `DEFAULT_ELIGIBILITY_LEVEL_MAX = BigInt(9999)` (`AdminDashboard.tsx` 134–154) and `ELIGIBILITY_BAND_HINT` (245–246, rendered at 804–805): “New drafts default max to 9999 so high-level play still matches.” Enemy list chips still print `Lv ${levelMin}–${levelMax}` (2190–2192). `AdminGuard.validateEnemyConfig` / `validateRegionConfig` (`adminGuard.mo` 237–241, 261–265) still reject missing closed bands. Live region match is `level <= Number(r.levelMax)` (`WorldExploration.tsx` 3662–3663). Product rule: Stralt has no character level cap. 9999 is a **finite** eligibility ceiling (player 10000 is out). AFDA-2026-08-31-011 PARTIAL recommended this workaround; EBA-2026-08-31-002 still requires deleting the field. Raising 5 → 9999 makes the 08-31 validation “new-enemy no longer writes levelMax = 5” pass while keeping the forbidden schema.  
SYSTEMS_AFFECTED: `AdminDashboard.tsx` `newEnemy` / `newRegion` / EnemyEditor / RegionEditor / enemy list chips; `adminGuard.mo`; future `RelativeEligibility` persist; region match in WorldExploration (do not retune region as a world cap here — WDEAD owns that surface)  
RECOMMENDED_ACTION: When EBA-2026-08-31-002 lands, delete `DEFAULT_ELIGIBILITY_LEVEL_MAX` and `ELIGIBILITY_BAND_HINT`. Persist `RelativeEligibility` (`minOffset`, optional **relative** `maxOffset = null`, `weightCurve`, tags). Do not “fix” again by raising 9999 → 99999. Do not keep `Lv min–max` chips. Preview/validate must accept owner-typed player levels 1, 80, 800, 8000, 10000. Keep AP/MP ≤ 20 as a combat budget. Consume AFDA-011: existing saved `levelMax: 5` region rows are content, not a product cap, and migrate separately. Do not touch `pickEnemyLevelFromTiers` here (EBA-2026-08-31-003).  
AUTONOMY: HUMAN_APPROVE — persist shape + owner copy. Copy-only removal of the 9999 hint is allowed if the fields remain for one cycle, but do not teach 9999 as “unbounded.”  
DEPENDENCIES: EBA-2026-08-31-002; EBA-2026-09-01-001; AFDA-2026-08-31-011 (consume)  
REGRESSION_RISK: HIGH if implementers close EBA-002 by keeping 9999 so current Admin saves still pass. MEDIUM if region matching becomes empty for high-level players without a fallback (WDEAD).  
VALIDATION_REQUIRED: A definition with only `minOffset = -2` and no max activates. New-enemy draft does not write `levelMax = 9999`. Player 10000 remains eligible. `pnpm typecheck`; `mops check` or `caffeine check` when Motoko eligibility lands.  
STATUS: NEW  

---

ACTION_ID: EBA-2026-09-02-002  
SOURCE_AUTOMATION: Enemy & Boss Admin Content Designer  
TITLE: summonUnitDef.level ≤ 99 is a template-size rail, not a summon career cap  
CATEGORY: scaling-guard  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: Commit `3b9461a` (after the 09-01 EBA ledger) added `if (config.summonUnitDef.level > 99)` in `AdminGuard.validateSpellConfig` (`adminGuard.mo` 393–395). The same function already caps `minLevel > 999` (375) — a spell-catalog rail (SDA). Boss management includes summons (`BossPhaseConfig.summonCount` 20-cap at 486–488 is a pack-size rail, not a level cap). Live enemy summoner overlay still rolls `0.12 + playerLevel * 0.02` then hardcoded `summon-dire-wolf` / `summon-archer` (`WorldExploration.tsx` 12047–12057). EBA-014/015/012 will bind boss/enemy summons through SpellConfig. If `summonUnitDef.level` is treated as the summoned unit’s absolute combat level, a player at 8000 cannot author a relative-scaled minion past 99. The Inf-HP `hpScale`/`damageScale` 0–10 rails (399–406) are the correct class of document-size guard; an absolute **level** 99 is the forbidden class.  
SYSTEMS_AFFECTED: `adminGuard.mo` `validateSpellConfig`; Admin spell / future enemy-boss summon editors; `getSummonBaseStats`; BossDefinition / EnemyDefinition summon blocks  
RECOMMENDED_ACTION: Document today’s 99 as a **template-size** rail (same class as enemy HP 1–100000), never as “max summon/player level.” When EBA summons scale with the encounter, store offset-0 base stats + `statGrowth` / relative offset — do not persist a closed 1–99 career band. Do not raise 99 → 999 as a fake unbounded fix (same trap as 09-02-001). Keep finite `hpScale`/`damageScale` anti-Inf checks. Do not edit summon combat math in the same PR. Spell `minLevel > 999` stays SDA.  
AUTONOMY: HUMAN_APPROVE — Motoko guard wording + future persist. Copy/comment-only is IMPLEMENT_WITH_TESTS.  
DEPENDENCIES: SDA-2026-08-31-001; SDA-2026-09-01-002; EBA-2026-08-31-012; EBA-2026-08-31-014  
REGRESSION_RISK: HIGH if someone deletes the 99 check and re-opens Inf-HP via huge `level` in `getSummonBaseStats`. MEDIUM if EBA wires summons to the absolute field and late-game minions freeze at 99.  
VALIDATION_REQUIRED: Saving a summon with `hpScale` non-finite still fails. A boss/enemy definition whose minion uses relative offset (no absolute 99) activates at player 1 and 10000. `mops check` or `caffeine check`; `pnpm typecheck`.  
STATUS: NEW  
