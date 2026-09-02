# Enemy & Boss Admin — 2026-09-02 re-audit

**Author:** Enemy & Boss Admin Content Designer  
**Automation:** `299b70f5-a498-11f1-a7d1-d6b4613131ce`  
**Verified against:** `origin/main` @ `58302bc` (2026-09-02)  
**Prior contract:** [`ENEMY_BOSS_ADMIN_DESIGN_2026-08-31.md`](./ENEMY_BOSS_ADMIN_DESIGN_2026-08-31.md) (merged as [#146](https://github.com/Mr-Melic/stralt/pull/146))  
**Prior ledgers:** [`ACTION_IDS_ENEMY_BOSS_ADMIN_2026-08-31.md`](./ACTION_IDS_ENEMY_BOSS_ADMIN_2026-08-31.md) (`EBA-2026-08-31-001` … `024`); [`ACTION_IDS_ENEMY_BOSS_ADMIN_2026-09-01.md`](./ACTION_IDS_ENEMY_BOSS_ADMIN_2026-09-01.md) (`EBA-2026-09-01-001` … `006`, already on `main`)  
**This run:** documentation only. No production, RAF, map generation, turn, or damage-math code.

Stralt has **no character level cap**. Do not add a final maximum level. Prefer relative offsets, probability curves, eligibility thresholds, and scalable formulas.

---

## 0. Verdict

The 2026-08-31 design is still the owner-studio contract. **None of EBA-2026-08-31-001–024 shipped as gameplay.** There is still no `EnemyDefinition` / `BossDefinition`, no draft→validate→preview→activate path, no authored AI, no variants, no kit/discovery chips, and no visual mode `none|asset|pool`.

09-01 docs are on `main`. This run **does not re-file** `EBA-2026-08-31-*`, `EBA-2026-09-01-*` (except a status note on 006), `SDA-*`, `VAL-*`, `AFDA-*`, or `WDEAD-*`. New IDs are only for gaps that appeared or hardened after the 09-01 EBA ledger.

Honesty copy landed in two places. That is not the studio.

Consume, do not duplicate:

| Sibling | Consume for |
| :--- | :--- |
| SDA (PR [#116](https://github.com/Mr-Melic/stralt/pull/116) + 09-01 ledger) | CORE–SIGNATURE pools, `PLAYER_LEARNABLE`, observation, SpellConfig activate gate |
| VAL (PR [#121](https://github.com/Mr-Melic/stralt/pull/121); `VAL-2026-09-01-001` copy IMPLEMENTED) | Asset / pool bind, `boss_large`, no gameplay invalidation |
| AFDA-2026-08-31-011 (PARTIAL) | Raised `levelMax` default to 9999 as a workaround — **not** RelativeEligibility |
| WDEAD | Region `level <= levelMax` live ceiling, dungeon-depth tables, Death Realm `maxLevel: 5` stamps |
| Enemy Elite Evolution | Family overlay discarded at battle start |
| Enemy Formations / AI Evolution catalogs | Named packs and sophistication modules — still design-only |

---

## 1. What still drives live encounters

| Surface | Still true on `58302bc` | Prior ID |
| :--- | :--- | :--- |
| Admin `EnemyConfig` CRUD | Canister write via `adminSetEnemyConfig` (`main.mo` 778–793) + `useGetEnemyConfigs`. `generateEnemies` (`WorldExploration.tsx` 5699–5957) never reads those rows. Enemies tab CatalogNote now **admits** this (`AdminDashboard.tsx` 2085–2089). Save is still immediate. | EBA-001, 005 |
| Spawn roster | Uniform chess piece, `pickEnemyLevelFromTiers`, placeholder `level*8+20` HP then `computeEnemyStats` (5830–5838), then 30% family overlay (5862–5953). | EBA-001, 007, 008 |
| Closed level bands | `newEnemy()` / `newRegion()` default `levelMax` to **9999** (`AdminDashboard.tsx` 134–154), not 5. Editor still labeled Level Min/Max (791–805). List chips still `Lv min–max` (2190–2192). `AdminGuard` still **requires** the closed band (`adminGuard.mo` 237–241). | EBA-002; EBA-2026-09-01-001; **new 09-02-001** |
| Hidden 999 cap | `combatMath.ts` 58: `maxTier = Math.floor(999 / ts)`. | EBA-003 |
| Boss source | `useBossQueries.ts` 1–21 and portal entry (`WorldExploration.tsx` 6570–6574) read `pbv_boss_configs`. `getAllBossConfigs` unused by gameplay. | EBA-004 |
| Boss catalogue | Editor maps `BOSS_IDS` only (`AdminDashboard.tsx` 7636; 19 ids in `bossTypes.ts` 390–410). Motoko seeds **12** (`admin.mo` 350–551). WX still comments “Pick a random boss from the 12” while using `BOSS_IDS.length` (4896–4898). | EBA-014 |
| Boss scaling | Spawn `level + 5` and `Math.min(50, res/sp)` (`WorldExploration.tsx` 6622–6645). `getBossEffectiveStats` is Boss Guide + `longHorizonSim` only. | EBA-011 |
| Kit zone NaN | `buildEnemyKit(enemy.pieceType, currentMap.levelZone)` (`WorldExploration.tsx` 12035). `Math.floor(object)` → zone-0 kits. Comment at 12030 still says “10 random spells.” | EBA-013 |
| AI inference | `inferArchetype` (`enemyAI.ts` 421–449): healer from heal flags, flanker from `pieceType === "knight"`, berserker from `family.includes("berserk")`. | EBA-009 |
| Boss Rush | `placeBossRushSpawns` / `applyFinalizedLayout` punch walkable cells (`WorldExploration.tsx` 5297–5312) but units are still 100-HP placeholders (5318–5358). Room 9 still `weeping_pawn_2` (`useBossRush.ts` 127). CatalogNote now admits live rooms come from `BOSS_RUSH_ROOMS` (`AdminDashboard.tsx` 6942–6946). | EBA-015 |
| Portal assignments | Canister `setBossPortalAssignment` exists (`main.mo` 2957+). Frontend hook is still a no-op invalidate (`useAdminQueries.ts` 541–548). World picks a random `BOSS_IDS` entry. | EBA-023 |
| Hard delete | `adminDeleteEnemyConfig` is still `Map.remove` (`main.mo` 795–801). Bosses tab holds unused `_deleteBossConfig` (`AdminDashboard.tsx` 7537) — no owner delete control. | EBA-021; EBA-2026-09-01-003 |
| Player catalog | `EnemyRegister.tsx` 22+ still hardcodes `MONSTERS` / `BOSSES`. | EBA-024 |
| Engine extract | No `engine/enemyDefinition.ts`, `bossDefinition.ts`, `contentValidate.ts`, `encounterPreview.ts`, `spawnFormations.ts`, or `enemyKitResolve.ts`. | EBA-022 |
| Presets | `EnemyPresets` is still browser `localStorage` (`AdminDashboard.tsx` 552–574), max snapshots, not canister clones. | EBA-018 |

Immediate Save is still live: Enemy editor `onSave` → `setEnemyMut.mutate`. Boss Save still writes localStorage (`useAdminQueries.ts` 510–519).

---

## 2. Partial progress since 2026-09-01 (do not treat as EBA done)

| Change | What it is | What it is not |
| :--- | :--- | :--- |
| `DEFAULT_ELIGIBILITY_LEVEL_MAX = 9999` + `ELIGIBILITY_BAND_HINT` (`AdminDashboard.tsx` 134–135, 245–246; commit `22b69cf`) | New drafts no longer seed a 1–5 career band. AFDA-011 PARTIAL. | Not RelativeEligibility. Player 10000 is still outside the band. Library chips still teach `Lv 1–9999`. **New 09-02-001.** |
| Enemies / Sprites / Boss Rush `CatalogNote` | Honest: enemy rows do not drive packs; Rush JSON is not room documents. | Not DRAFT → VALIDATE → PREVIEW → ACTIVATE. Enemy Save still writes the live map. |
| `adminVisualStatus.ts` + `8ebecca` | Empty URL = Default Pixel Visual. Filled URL = **Stored URL — not rendered**. Matches `VAL-2026-09-01-001` IMPLEMENTED (copy only). | Not `visualMode none\|asset\|pool`. No Use Default / Select Uploaded / Select Pool / Preview / Manage Assets. **EBA-2026-09-01-006 copy = done; 017 still OPEN.** |
| Boss toast (`AdminDashboard.tsx` 7561–7563) | Says “this browser only — not canister-live”. | Header still calls the **live** `pbv_boss_configs` store a draft **and** says changes apply on the next encounter (7613–7616). **EBA-2026-09-01-002 still OPEN.** |
| `AdminGuard.validateSpellConfig` summon rails (`adminGuard.mo` 387–406; commit `3b9461a`) | Rejects Inf-HP scales and unknown `summonAI`. | `summonUnitDef.level > 99` is a new **absolute level** ceiling on catalog summons. Keep as a document-size rail or replace with a relative offset — never a career cap. **New 09-02-002.** |
| Boss Rush spawn punch | Solvable tiles (`placeBossRushSpawns` in `mapGen.ts`). | Still not `BossDefinition` + boss AI. |
| Mixin `admin-api.mo` | Still dead. Not included from `main.mo`. | If someone includes it later, `AdminLib.setEnemyConfig` writes with **no** `AdminGuard` and **no** audit. **EBA-2026-09-01-005 still OPEN.** |
| `longHorizonSim.ts` | More stress levels, XP clamp observation, still calls `getBossEffectiveStats`. | Private `buildEnemyKit` still duplicates `enemyAI.ts` (53–78). **EBA-2026-09-01-004 still OPEN.** |

AP/MP ≤ 20 remains a **combat-budget** clamp. Keep that. Do not invent a character-level max beside it. HP 1–100000 on enemy/boss templates stays a document-size rail.

Tiers tab preview is still `SAMPLE_LEVELS = [1, 10, 25, 50, 100, 200, 500]` (`AdminDashboard.tsx` 3833) — consume WDEAD, do not re-file. EBA-019 still requires owner-typed 1 and 10000 on the **enemy/boss** preview once it exists.

Death Realm fallbacks still stamp `maxLevel: 5` (`WorldExploration.tsx` 13613, 13745) vs entry `9999` (5436). Consume WDEAD-001. Do not “fix” kit width by reading that object (EBA-013).

---

## 3. Status of prior EBA IDs

### EBA-2026-08-31-001 … 024

All remain **OPEN**. Evidence line numbers above replace the 08-31 and 09-01 citations where they drifted.

| ID | Priority | Status |
| :--- | :--- | :--- |
| 001 Unify EnemyDefinition + drive spawn | P0 | OPEN |
| 002 Replace levelMin/levelMax with relative eligibility | P0 | OPEN — frontend now defaults 9999 (see 2026-09-02-001); Motoko still requires the closed band (09-01-001) |
| 003 Remove `floor(999/ts)` | P0 | OPEN |
| 004 Boss configs backend-authoritative | P0 | OPEN |
| 005 Draft → validate → preview → activate | P0 | OPEN |
| 006 Identity: name, family, role, lifecycle | P1 | OPEN — spawn still writes `family: "boss"` (`WorldExploration.tsx` 6653) |
| 007 Variants base/veteran/elite/champion/rare | P1 | OPEN |
| 008 Spawn weights, tags, formations, elite chance | P1 | OPEN |
| 009 Author AI profile / modules | P1 | OPEN |
| 010 Formula stats + rewards via `applyRewards` | P1 | OPEN |
| 011 `levelOffset` + `getBossEffectiveStats` in combat | P0 | OPEN |
| 012 SDA kits + discovery chips | P1 | OPEN (SDA still design-only for pools) |
| 013 Numeric kit zone (NaN fix) | P0 | OPEN |
| 014 Create/clone bosses; ability registry | P1 | OPEN |
| 015 Boss Rush as live documents | P1 | OPEN |
| 016 Mastery objectives | P2 | OPEN |
| 017 Visual mode NONE / asset / pool | P1 | OPEN — copy is now honest (09-01-006 / VAL-09-01-001) |
| 018 Clone, compare, deactivate, rollback | P1 | OPEN |
| 019 Unbounded preview + activate validation | P1 | OPEN |
| 020 Owner studio UI | P1 | OPEN |
| 021 Soft-retire; block hard delete | P0 | OPEN |
| 022 Extract helpers; do not grow WX | P0 | OPEN |
| 023 Honour portal assignments | P1 | OPEN |
| 024 EnemyRegister / Boss Guide from active defs | P2 | OPEN |

### EBA-2026-09-01-001 … 006

| ID | Priority | Status |
| :--- | :--- | :--- |
| 001 Replace adminGuard closed-band checks | P0 | OPEN — `adminGuard.mo` 237–241, 261–265 unchanged |
| 002 Stop calling live `pbv_boss_configs` a “draft” | P1 | OPEN — toast improved; header 7613–7616 still contradicts itself |
| 003 Wire boss set/delete to the canister | P0 | OPEN — hooks still localStorage; `_deleteBossConfig` unused |
| 004 Retire `longHorizonSim` private kit copy | P1 | OPEN |
| 005 Ban or guard unused `admin-api.mo` mixin | P1 | OPEN |
| 006 Do not label unused `spriteUrl` as live | P1 | **PARTIAL** — copy-only landed in `adminVisualStatus.ts`. Full controls remain EBA-017 + VAL |

---

## 4. Owner studio still required (unchanged)

Identity, gameplay formulas, relative-level behaviour, rewards, authored AI, CORE–SIGNATURE pools with discovery chips, variants, spawn rules, boss phases/summons/arena/mastery, visual mode **NONE** by default, and **DRAFT → VALIDATE → PREVIEW → ACTIVATE**.

Validation before activate: required fields, AI/spell compatibility, SpellConfig, spawn rules, rewards, visual fallback, render profile, references, encounter compatibility.

Visuals must never change occupancy, pathing, range, or rewards. Bosses may use `boss_large`. Missing custom art falls back to the built-in pixel design the next frame.

Do not implement from this file. Consume the 08-31 contract.

---

## 5. New ACTION_IDs (this run only)

Full records: [`ACTION_IDS_ENEMY_BOSS_ADMIN_2026-09-02.md`](./ACTION_IDS_ENEMY_BOSS_ADMIN_2026-09-02.md).

| ID | Title | Priority |
| :--- | :--- | :--- |
| EBA-2026-09-02-001 | Do not treat `levelMax = 9999` as unbounded RelativeEligibility | P0 |
| EBA-2026-09-02-002 | `summonUnitDef.level ≤ 99` is a template-size rail, not a summon career cap | P1 |
