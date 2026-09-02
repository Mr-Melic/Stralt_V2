# World, Dungeon & Encounter Admin Designer — 2026-09-02

**Source automation:** World, Dungeon & Encounter Admin Designer (`1592c6c0-a499-11f1-a7d1-d6b4613131ce`)  
**This run:** `bc-54f15f08-1937-402c-ba6f-c5880675c10a`  
**HEAD inspected:** `58302bc` (`main` after #258 GameKey shop)  
**Constraint:** design only. No production code, no RAF / mapGen / turn / damage-math edits.  
**Player rule:** Stralt has **no player level cap**. Every owner control must stay valid at hypothetical levels of 1, 50, 500, 5_000, and 50_000. Never recommend a hard maximum player or enemy level.

Prior briefs (still the content-model contract):

- [`WORLD_ENCOUNTER_ADMIN_DESIGN_2026-08-31.md`](./WORLD_ENCOUNTER_ADMIN_DESIGN_2026-08-31.md) — pack, relative spawn, Simulation Lab, DRAFT → SIMULATE → VALIDATE → ACTIVATE (`WDEAD-2026-08-31-001` … `015`)
- [`WORLD_ENCOUNTER_ADMIN_DESIGN_2026-09-01.md`](./WORLD_ENCOUNTER_ADMIN_DESIGN_2026-09-01.md) — lying knobs, `longHorizonSim` isolation, one roll budget, payable rewards (`WDEAD-2026-09-01-001` … `010`)

This run’s IDs: [`ACTION_IDS_WDEAD_2026-09-02.md`](./ACTION_IDS_WDEAD_2026-09-02.md).

Do **not** re-issue `WDEAD-2026-08-31-*`, `WDEAD-2026-09-01-*`, `WDD-*`, `EBA-*`, `EED-*` / `ENC-*`, `FSN-*`, `AFDA-*`, or `LHIPS-*`.

---

## 0. What this cron is for

The owner pack, relative spawn knobs, Simulation Laboratory, and DRAFT → SIMULATE → VALIDATE → ACTIVATE **still do not exist**. This run re-audits live ceilings against `58302bc` and only issues **NEW** IDs for gaps that appeared (or hardened) after the 2026-09-01 brief.

Preferred lifecycle is unchanged:

**DRAFT → SIMULATE → VALIDATE → ACTIVATE**

Admin / debug / simulation stay **dev-gated**. Simulation must never call `applyRewards`, `saveBattleStats`, `upgradeSpell`, `claimAchievementReward`, `processPendingPurchases`, `redeemGameKey`, or any persist-lock credit.

---

## 1. Re-audit: `WDEAD-2026-08-31-001` … `015`

Line numbers below are **this HEAD**. Status stays `NEW` unless noted.

| ID | Still true? | Live evidence @ `58302bc` |
| :--- | :--- | :--- |
| 001 hard ceilings | Yes (partial UI) | `combatMath.ts` 58 `maxTier = floor(999 / ts)`. `computeAITier` 36–51 stops at 900 → tier 10; 30% uniform 1–10. **Admin default `levelMax` is now `BigInt(9999)`** (`AdminDashboard.tsx` 134–154) — not 5. Region match is still a **closed interval** `level <= levelMax` (WX 3663). Dungeon extras / boost `Math.min(dungeonDepth, 5)` (WX 5708–5709). Chain length `3 + floor(random*3)` (WX 6325, 6417). Death Realm fallbacks `maxLevel: 5` (WX 13613, 13745) vs entry `9999` (WX 5436). Rest maps `maxLevel: 9999` (WX 5514). **New closed-interval lie → 09-02-001.** |
| 002 relative spawn knobs | Yes | Tiers tab still four buckets + sum-100 (`AdminDashboard.tsx` 3785–3790). Preview `SAMPLE_LEVELS = [1, 10, 25, 50, 100, 200, 500]` (3833). `tierSize` `max={100}` (3914). Frontend `TierSpawnConfig` (`gameTypes.ts` 428–434) still omits `levelVarianceChance`. No equal/above first-class fields. Tiers tab has **no** CatalogNote. |
| 003 Simulation Lab | Yes | No Admin Simulation tab (`gameTypes.ts` 482–498; tabs 5529–5548). `mapGen.simulate.ts` is solvability + destack replay, not an encounter lab. **Do not treat `longHorizonSim.ts` as 003.** |
| 004 draft lifecycle | Yes | Tiers save writes canister then `localStorage` immediately (3817–3826). Boss Rush save same pattern (~7053–7058). No pack status. |
| 005 encounter catalog | Yes | `generateEnemies` (WX 5699–5956): size `1+rand*8` + depth table, random chess piece, quadrant + Chebyshev ≥ 4, then 30% equal-weight family (5941–5952). No formation / rarity / rule / encounter-bound objective. |
| 006 dead EnemyConfig | Yes | Enemies tab now **admits** catalog-only (`AdminDashboard.tsx` 2085–2090). WX still has **zero** `enemyConfigs` / `getEnemyConfigs` reads. Do not treat the label as wiring. |
| 007 dungeon policy | Yes | Entry 20% (WX 4845–4852). Rest is a **world** 10% portal (4911–4916), not a dungeon room. Bosses 15% (4877–4884). Continue-in-chain 25% (WX 5020). No branch graph. |
| 008 Boss Rush policy | Yes | `BOSS_RUSH_ROOMS` still 10 hardcoded pairs (`useBossRush.ts` 24–135). Entry 8% (WX 4934–4939). Admin enable + per-room `x` still do not skip rooms. **New unused-multiplier fact → 09-02-002.** |
| 009 world-event catalog | Partial | Hardcoded catalog is now **36** `WF-*` ids (20 wave 1 + 16 wave 2, `worldFeatures.ts` 159–1215). Still not owner-editable, still not imported by WX. Live events are still the 22-modifier two-roll. Do not re-issue 009. |
| 010 relative rewards | Yes | `DEFAULT_CHALLENGES` still flat. Rush rooms still flat 500–5000 / 200–2000. Payable clamp still 09-01-005. |
| 011 elite / variant / size / family / AI knobs | Yes | Family 30% equal (WX 5941). `MAX_ENEMIES = 20`. No `isElite`. AI still 10-bucket + 30% chaos. |
| 012 summoner + NaN kit zone | Yes | `buildEnemyKit(enemy.pieceType, currentMap.levelZone)` (WX 12035). Summoner `0.12 + level * 0.02` (WX 12047–12049). Linear, unclamped. |
| 013 unify Doka tables | **PARTIAL** | Three copies collapsed to `dungeonDokaMultiplierFor` (`portalRules.ts` 148–161). WX HUD (1320), `useDungeonState.ts` 14–18, and `longHorizonSim.ts` 534 all call it. **Freeze `Math.min(safeDepth, 5)` remains.** Owner still cannot edit the table. Unlock the editor → 09-02-008. Do not re-issue 013. |
| 014 backend bosses | Yes | Bosses tab still “Browser-local drafts only (`pbv_boss_configs`)” (7614–7616). WX boss portal still `localStorage.getItem("pbv_boss_configs")`. |
| 015 dev-gate lab | Yes | Lab does not exist. Admin is still the 15-tab CRUD list (5529–5548). |

Missing tabs (unchanged): Encounters, Dungeons, World Events, Spawn (beyond coarse tiers), Simulation, Drafts.

---

## 2. Re-audit: `WDEAD-2026-09-01-001` … `010` (all still `NEW`)

| ID | Still true? | Drift since 09-01 |
| :--- | :--- | :--- |
| 001 lying knobs | Yes (partial labels) | Honesty `CatalogNote` landed on Enemies, Sprites, Shop, Boss Rush. Tiers **unlabeled**. `threeOrMorePercent` still stored, still unread (`combatMath.ts` 72–75 vs leftover `_threeMore`). `levelVarianceChance` still engine-only. |
| 002 isolate `longHorizonSim` | Yes | Still CLI. `STRESS_LEVELS` still omit 10_000 / 50_000 (81–83). Now also reports `dungeonMultiplierAtDepth5` (534) — do not promote that sample to the owner lab. |
| 003 one roll budget | Yes | Wave 2 **reaffirmed** independent two-roll in `docs/WORLD_DYNAMICS.md` line 44. Catalog grew 20 → 36 ids. WX still does not import `worldFeatures`. **New owner-wave + contract conflict → 09-02-003.** |
| 004 `skippedForBudget` | Yes | `MAX_ROLLED_FEATURES = 3` (worldFeatures.ts 31). `canAddEnemies` / `canAddHazardTiles` still skip at 20 / 50. Twice as many ids now compete for the same 3 slots. |
| 005 payable rewards | Yes | `applyRewards` still `#err` above 100_000 Doka / 500_000 XP (`main.mo` 2058–2059). Client clamp unchanged. Extreme `REWARD_MULT` 2.5 still clips jackpots. |
| 006 `grantClass` | Yes | Rune Bearer still `mapAttune`. Wave 2 **Grimoire Stalker** is a different grant (one remaining cast). Do not re-issue 006; expand → 09-02-004. |
| 007 combat hooks only | Yes | Eclipse / Low Ceiling still unwired. Wave 2 **Scourge Compact** (+10% incoming) and **Echo Hall** (linear +1) are new hook candidates. Same rule. Expand → 09-02-004. |
| 008 overflow 50_000 | Yes | Tiers preview still caps sample at 500. LHIPS stress still stops at 5000 + 1018/1019. |
| 009 rush multipliers → `applyRewards` | Yes | `completeBossRushRoom` still `(0, 0)`. CatalogNote now **claims** `parsed.rewardMultiplier` is read. Hook state is `_rewardMultiplier` and has **zero consumers** (`useBossRush.ts` 209–248). **New honesty-lie → 09-02-002.** |
| 010 rest / deathRealm eligibility | Yes | `WorldFeatureRunMode` is still `exploration \| dungeon \| bossRush` (worldFeatures.ts 62). `isFeatureAllowedInContext` hard-returns false for `deathRealm` (1283–1288). Echo Gate / Pilgrim Banners join Flicker / Gambit as hardcoded exploration-only. Rest is still not an enum value. |

---

## 3. What landed that is not the owner pack

| Artifact | Status | Owner can edit? | Drives live spawn? |
| :--- | :--- | :--- | :--- |
| Admin `CatalogNote` + `DEFAULT_ELIGIBILITY_LEVEL_MAX = 9999` | Honesty / AFDA “tiny correction” | Band fields yes | Region match yes (closed interval). EnemyConfig rows still unused. |
| `adminVisualStatus.ts` | Sprite URL honesty | URL stored | **No** renderer |
| Wave 2 `WF-*` (16 ids, `catalogWave: 2`) | Designed + unit-tested (`WDD-2026-09-01-001`) | **No** | **No** |
| `featuresInCatalogWave` helper | Exists | **No** — `pickWeightedFeatures` does not take a wave | N/A until overlay |
| `dungeonDokaMultiplierFor` | Shared helper | **No** | Yes — freeze at depth 5 |
| `mapGen.destackSpawns` + WX `findBattleStartCell` unique occupancy | Live solvability | **No** | Yes — can move roster cells at battle start |
| GameKey / Mollie shop (`redeemGameKey`, Purchases tab) | Live economy | Approve / grant / ban | Not spawn. **Is** a persist credit. |
| `AdminGuard` summon `level > 99`, `hpScale` 0–10, `minLevel > 999` | Input rails | Yes (reject) | Spell catalog writes. **New career caps on content.** |
| `longHorizonSim` dungeon depth-5 sample | LHIPS harness | **No** | **No** |

**Rule (unchanged):** every owner field must either drive the active pack after VALIDATE or be labeled read-only / unused. A CatalogNote that claims a field is live when the hook discards it is worse than no note.

---

## 4. Closed 9999 is not indefinite progression

AFDA / admin-drift changed `newEnemy()` / `newRegion()` from `levelMax: 5` to `9999` and added `ELIGIBILITY_BAND_HINT` (`AdminDashboard.tsx` 245–246, 804–805, 1037–1038): “so high-level play still matches.”

That is a **larger last bucket**, not an open tail:

- WX still requires `level >= levelMin && level <= levelMax` (3663). A level-10_000 character loses every region whose max is 9999.
- Death Realm rebuilds still stamp `maxLevel: 5` (13613, 13745).
- Spawn picker still `floor(999 / tierSize)` (`combatMath.ts` 58).
- `validateTierSpawnConfig` still `tierSize … > 100` (`adminSafety.ts` 418–419) — bucket width, not a player cap, but the Tiers UI `max={100}` plus preview 500 teach a career ceiling.

Owner eligibility (same as 08-31 §4.1, now with a false-uncapped default to forbid):

```
relativeEligibility
  preferredOffset?     # fade weight, never reject
  openTail: true       # overflow still resolves
  # FORBIDDEN: required levelMax that hides the row
```

Do not “fix” this by raising 9999 to 99999.

---

## 5. Wave-2 catalog is not an owner control

`LATEST_CATALOG_WAVE = 2` (`worldFeatures.ts` 110–111). `featuresInCatalogWave(1|2)` exists (1230–1232) and tests assert 16 wave-2 ids. `pickWeightedFeatures` (1372–1390) filters by slot + run mode only — **both waves share `MAX_ROLLED_FEATURES = 3`**.

`docs/WORLD_DYNAMICS.md` line 44 still says the 22 live modifiers “still roll on their own two-roll; this catalog does not replace them.” That sentence is the WDD placement contract. It is **not** the owner-console contract (`WDEAD-2026-09-01-003`). Wave 2 doubled the unwired overlay without giving the owner:

- `enabledWaves: 1[] | 2[] | 1+2`
- per-wave rarity mix
- a single roll budget that includes `MAP_MODIFIERS` ids

Until VALIDATE, `WF-*` stay data. Do not overlay from Admin “to try wave 2.”

---

## 6. Grant classes and combat hooks after wave 2

| Id | Proposed grant / combat | Owner field |
| :--- | :--- | :--- |
| `WF-SPL-RUNE_BEARER` | map-only attune of `usableByEnemy` | `grantClass: mapAttune` (09-01-006) |
| `WF-SPL-GRIMOIRE_STALKER` | **one remaining cast** this map, not full attune (`worldFeatures.ts` 1067–1095) | `grantClass: oneCast` |
| `WF-RSK-SCOURGE_COMPACT` | +10% of already-computed incoming; next `applyRewards` uses hard multiplier (1097–1124) | `combatHookId` + `rewardCurve` payable preview |
| `WF-MOD-ECHO_HALL` | `linear === true` range +1 empty cell (1127+) | `combatHookId` on metadata range, never name |

`grantClass` on the pack is now `none | mapAttune | oneCast | observe`. `observe` stays reserved. None of these call `upgradeSpell` or write spell-level arrays. Scourge / Echo / Eclipse still may not grow a WX `if (feature.id)` damage pass.

---

## 7. AdminGuard content caps are not board-safety

`adminGuard.mo` 375 `minLevel > 999`, 390–394 `summonLifespan > 20`, `summonUnitDef.level > 99`, `hpScale`/`damageScale` 0–10. Lifespan 20 is a **turn budget** (same class as AP/MP ≤ 20) — keep it. Level 99 / minLevel 999 are **career caps** on catalog content. Summon HP that would become Inf is a finite-scale rail (0–10), not a player-level max — keep the Inf reject; do not add `levelMax` beside it.

Owner summon templates should scale off the **caster’s relative level** (offset + scale), not a stored absolute 99.

---

## 8. Simulation Laboratory — GameKey and destack

Isolation allow-list (spy test, fail on any call):

`applyRewards` · `saveBattleStats` · `upgradeSpell` · `claimAchievementReward` · `processPendingPurchases` · **`redeemGameKey`** · persist-lock `commit` · `pbv_*` / inventory writes · `ensureLocalStorage`

GameKey is a new official credit (`shopPurchase.ts` `redeemGameKeyThroughPersist`). A lab that “replays shop remount” will mint.

Hypothetical level remains unbounded (09-01-008). Presets: 1 / 10 / 100 / 1_000 / 10_000 / 50_000. Reports (08-31-003 plus): relative-level histogram, below/equal/above, families, variants, elites, AI, rare spells, discovery opportunities, formations, estimated difficulty, `skippedForBudget`, theoretical vs payable, **`destackRelocations`**, **`catalogWave` mix**.

`mapGen.destackSpawns` (512+) and WX battle-start `findBattleStartCell` unique occupancy (11972–12008) can move bodies after `generateEnemies` placed them on Chebyshev ≥ 4. Scripted formations (`FSN-*` / future `encounterFormations.ts`) and `WF-INV-WARBAND` extras must **compose** with that destack: roles on unique walkable cells, then re-check solvability. Do not edit `mapGen.ts` or the RAF loop to “preserve formation art.”

Do not import `runLongHorizonSim`. Do not treat `dungeonMultiplierAtDepth5` as dungeon policy.

---

## 9. Owner console IA (unchanged, still missing)

Carved-stone, dark slate, crimson (`#13161f`, `#d8463f`, `#f0c44a`).

```
CONTENT
  Encounters     pools · formations · rarity · objectives · rewards · hazards · rules
  Dungeons       rooms · sequence · special · rest · branch · bosses · modifiers · rewards
  Boss Rush      pool · scale · progression · multipliers · sequence
  World Events   eligibility (incl. rest / deathRealm) · rarity · hazards · elites · grants · hooks · catalogWave
  Spawn          relative level · equal · above · elite · variant · size · family · spells · AI
  Simulation     hypothetical level (unbounded) · N · seed · reports · payable vs theoretical
LIFECYCLE
  Drafts         diff vs active · simulate · validate · activate
LEGACY (label unused knobs until migrate)
  Enemies / Regions / Tiers / Modifiers / Bosses / Names
```

### Validate gates (08-31 §6 + 09-01 + this run)

18. No CatalogNote that claims a field is consumed when the only binding is an unused `_` state.
19. Eligibility has no required `levelMax` reject (9999 is still a reject).
20. `pickWeightedFeatures` (once activated) honors owner `enabledWaves`; sim reports wave mix.
21. `grantClass` includes `oneCast`; zero `upgradeSpell` from events.
22. Lab spy includes `redeemGameKey` / `processPendingPurchases`.
23. Formation / extra-enemy placement reports `destackRelocations`; solvability still passes.
24. Dungeon Doka editor reads/writes the **one** `dungeonDokaMultiplierFor` table with an unbounded curve (no `min(depth, 5)`).

---

## 10. What this program must not do

- Do not implement the pack, the lab, or the tabs in this run.
- Do not edit `WorldExploration.tsx` to overlay wave 2.
- Do not edit RAF, `mapGen.ts`, turn order, or `calcScaledDamage`.
- Do not add `levelMax` “for safety” or raise 9999 / 99 / 999 as a substitute for relative eligibility.
- Do not promote `longHorizonSim` to Admin.
- Do not open a second reward or spell-level writer (including GameKey from the lab).
- Do not re-issue prior WDEAD / WDD / EBA / EED / FSN / AFDA / LHIPS IDs.
- Do not retune `100 * 2^(N-1)` (`LHIPS-001`).

Extract path for implementers (unchanged): `engine/spawnPolicy.ts`, `engine/encounterFormations.ts`, `engine/encounterSim.ts`, `engine/dungeonPolicy.ts`. World-event weights stay data loaded from the **active** pack.

---

## 11. ACTION_ID index (this run only)

| ID | Title | Priority |
| :--- | :--- | :--- |
| WDEAD-2026-09-02-001 | Closed-interval 9999 is not uncapped eligibility | P0 |
| WDEAD-2026-09-02-002 | Boss Rush CatalogNote claims `rewardMultiplier` is live; hook discards it | P0 |
| WDEAD-2026-09-02-003 | Owner `catalogWave` + one roll budget; do not ship WDD dual-roll as admin policy | P0 |
| WDEAD-2026-09-02-004 | Expand `grantClass` with `oneCast`; Scourge/Echo only via registry hooks | P1 |
| WDEAD-2026-09-02-005 | AdminGuard `summonUnitDef.level` 99 / spell `minLevel` 999 are content career caps | P1 |
| WDEAD-2026-09-02-006 | Simulation isolation allow-list includes GameKey credits | P1 |
| WDEAD-2026-09-02-007 | Formations and WF extras must compose with destack occupancy | P1 |
| WDEAD-2026-09-02-008 | Owner dungeon Doka curve on the unified helper — no depth-5 freeze | P1 |

Full records: [`ACTION_IDS_WDEAD_2026-09-02.md`](./ACTION_IDS_WDEAD_2026-09-02.md).
