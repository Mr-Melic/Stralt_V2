# Enemy & Boss Admin — 2026-09-01 re-audit

**Author:** Enemy & Boss Admin Content Designer  
**Automation:** `299b70f5-a498-11f1-a7d1-d6b4613131ce`  
**Verified against:** `origin/main` @ `dd275aa` (2026-09-01)  
**Prior contract:** [`ENEMY_BOSS_ADMIN_DESIGN_2026-08-31.md`](./ENEMY_BOSS_ADMIN_DESIGN_2026-08-31.md) (merged as [#146](https://github.com/Mr-Melic/stralt/pull/146))  
**Prior ledger:** [`ACTION_IDS_ENEMY_BOSS_ADMIN_2026-08-31.md`](./ACTION_IDS_ENEMY_BOSS_ADMIN_2026-08-31.md) (`EBA-2026-08-31-001` … `024`)  
**This run:** documentation only. No production, RAF, map generation, turn, or damage-math code.

Stralt has **no character level cap**. Do not add a final maximum level. Prefer relative offsets, probability curves, eligibility thresholds, and scalable formulas.

---

## 0. Verdict

The 2026-08-31 design is still the owner-studio contract. **None of EBA-001–024 shipped as gameplay.** There is still no `EnemyDefinition` / `BossDefinition`, no draft→validate→preview→activate path, no authored AI, no variants, no kit/discovery chips, and no visual mode `none|asset|pool`.

This run **does not re-file** `EBA-2026-08-31-*`, `SDA-*`, or `VAL-*`. New IDs are only for gaps that appeared or hardened after that ledger.

Consume, do not duplicate:

| Sibling | Consume for |
| :--- | :--- |
| SDA (PR [#116](https://github.com/Mr-Melic/stralt/pull/116)) | CORE–SIGNATURE pools, `PLAYER_LEARNABLE`, observation, SpellConfig activate gate |
| VAL (PR [#121](https://github.com/Mr-Melic/stralt/pull/121)) | Asset / pool bind, `boss_large`, no gameplay invalidation |
| World Encounter Admin | Region `levelMax` as a live ceiling, dungeon-depth tables, unbounded summoner chance |
| Enemy Elite Evolution | Family overlay discarded at battle start |

---

## 1. What still drives live encounters

| Surface | Still true on `dd275aa` | Prior ID |
| :--- | :--- | :--- |
| Admin `EnemyConfig` CRUD | Canister write via `adminSetEnemyConfig` (`main.mo` 760–774) + `useGetEnemyConfigs`. `generateEnemies` (`WorldExploration.tsx` 6320–6541) never reads those rows. | EBA-001 |
| Spawn roster | Uniform chess piece, `pickEnemyLevelFromTiers`, placeholder `level*8+20` HP (6415–6417), then 30% family overlay (6447–6537). | EBA-001, 007, 008 |
| Closed level bands | `newEnemy()` / `newRegion()` default `levelMax: 5` (`AdminDashboard.tsx` 117–133). Editor still labeled Level Min/Max (717–728). | EBA-002 |
| Hidden 999 cap | `combatMath.ts` 58: `maxTier = Math.floor(999 / ts)`. | EBA-003 |
| Boss source | `useBossQueries.ts` 1–20 and portal entry (`WorldExploration.tsx` 7150–7154) read `pbv_boss_configs`. `getAllBossConfigs` unused by gameplay. | EBA-004 |
| Boss catalogue | Editor maps `BOSS_IDS` only (`AdminDashboard.tsx` 7340; 19 ids in `bossTypes.ts` 390–410). Motoko seeds **12** (`admin.mo` 350–551). | EBA-014 |
| Boss scaling | Spawn `level + 5` and `Math.min(50, res/sp)` (`WorldExploration.tsx` 7202–7225). `getBossEffectiveStats` is Boss Guide + `longHorizonSim` only. | EBA-011 |
| Kit zone NaN | `buildEnemyKit(enemy.pieceType, currentMap.levelZone)` (`WorldExploration.tsx` 12484). `Math.floor(object)` → zone-0 kits. Comment at 12479 still says “10 random spells.” | EBA-013 |
| AI inference | `inferArchetype` (`enemyAI.ts` 420–449): healer from heal flags, flanker from `pieceType === "knight"`, berserker from `family.includes("berserk")`. | EBA-009 |
| Boss Rush | `placeBossRushSpawns` / `applyFinalizedLayout` now punch walkable cells (`WorldExploration.tsx` 5870–5897) but units are still 100-HP placeholders (5903–5928). Room 9 still `weeping_pawn_2` (`useBossRush.ts` 127). | EBA-015 |
| Portal assignments | Canister `setBossPortalAssignment` exists (`main.mo` 2650+). Frontend hook is still a no-op invalidate (`useAdminQueries.ts` 541–548). | EBA-023 |
| Hard delete | `adminDeleteEnemyConfig` is still `Map.remove` (`main.mo` 777–783). | EBA-021 |
| Player catalog | `EnemyRegister.tsx` 22+ still hardcodes `MONSTERS` / `BOSSES`. | EBA-024 |
| Engine extract | No `engine/enemyDefinition.ts`, `bossDefinition.ts`, `contentValidate.ts`, `encounterPreview.ts`, `spawnFormations.ts`, or `enemyKitResolve.ts`. | EBA-022 |

Immediate Save is still live: Enemy editor `onSave` → `setEnemyMut.mutate` (`AdminDashboard.tsx` 5449–5456). Boss Save still writes localStorage (`useAdminQueries.ts` 510–519).

---

## 2. Partial progress since 2026-08-31 (do not treat as done)

Security / admin-UX PRs landed **on top of** the orphaned schema. They make the 08-31 gaps harder to implement, not smaller.

| Change | What it is | What it is not |
| :--- | :--- | :--- |
| `AdminGuard.validateEnemyConfig` / `validateRegionConfig` / `validateBossConfig` (`adminGuard.mo` 205–250, 391–431) called from `main.mo` 764 and 2606 | Input rails before store write | Not RelativeEligibility. **Requires** `levelMin`/`levelMax` ≥ 1 and min ≤ max. Boss/enemy HP 1–100000. |
| `deleteBossConfig` refuses if a portal assignment exists (`main.mo` 2620–2623) | One dependent check | Not soft-retire. No rush / kit / mastery dependents. Still `remove`. Frontend `useDeleteBossConfig` never calls this method. |
| Boss editor copy (`AdminDashboard.tsx` 7332–7335) | Admits canister is unused | Contradicts itself: “saved draft is not the live encounter” **and** “changes apply on this browser's next boss encounter.” The second sentence is the live truth (`WorldExploration.tsx` 7150–7154). |
| Enemy visual copy (`AdminDashboard.tsx` 731–762, 2066–2068) | VAL language (“Default Pixel Visual”, “Custom Visual”) | `spriteUrl` is still an unused hosted URL. World renderer does not read it. |
| Boss Rush spawn punch | Solvable tiles (`placeBossRushSpawns`) | Still not `BossDefinition` + boss AI. |
| Mixin `admin-api.mo` | Dead. Not included from `main.mo`. | If someone includes it later, `AdminLib.setEnemyConfig` writes with **no** `AdminGuard` and **no** audit. |

AP/MP ≤ 20 remains a **combat-budget** clamp (same class as `updateCharacter`). Keep that. Do not invent a character-level max beside it.

---

## 3. Status of EBA-2026-08-31-001 … 024

All remain **OPEN**. Evidence line numbers above replace the 08-31 citations where they drifted.

| ID | Priority | Status |
| :--- | :--- | :--- |
| 001 Unify EnemyDefinition + drive spawn | P0 | OPEN |
| 002 Replace levelMin/levelMax with relative eligibility | P0 | OPEN — now **blocked** by adminGuard (see 2026-09-01-001) |
| 003 Remove `floor(999/ts)` | P0 | OPEN |
| 004 Boss configs backend-authoritative | P0 | OPEN — UI/canister delete split (see 2026-09-01-003) |
| 005 Draft → validate → preview → activate | P0 | OPEN — “draft” copy is a lie (see 2026-09-01-002) |
| 006 Identity: name, family, role, lifecycle | P1 | OPEN |
| 007 Variants base/veteran/elite/champion/rare | P1 | OPEN |
| 008 Spawn weights, tags, formations, elite chance | P1 | OPEN |
| 009 Author AI profile / modules | P1 | OPEN |
| 010 Formula stats + rewards via `applyRewards` | P1 | OPEN |
| 011 `levelOffset` + `getBossEffectiveStats` in combat | P0 | OPEN — sim already calls it (see 2026-09-01-004) |
| 012 SDA kits + discovery chips | P1 | OPEN (SDA still design-only) |
| 013 Numeric kit zone (NaN fix) | P0 | OPEN |
| 014 Create/clone bosses; ability registry | P1 | OPEN |
| 015 Boss Rush as live documents | P1 | OPEN |
| 016 Mastery objectives | P2 | OPEN |
| 017 Visual mode NONE / asset / pool | P1 | OPEN — VAL copy already on the dead URL (see 2026-09-01-006) |
| 018 Clone, compare, deactivate, rollback | P1 | OPEN |
| 019 Unbounded preview + activate validation | P1 | OPEN |
| 020 Owner studio UI | P1 | OPEN |
| 021 Soft-retire; block hard delete | P0 | OPEN — portal gate only, unused by UI |
| 022 Extract helpers; do not grow WX | P0 | OPEN |
| 023 Honour portal assignments | P1 | OPEN |
| 024 EnemyRegister / Boss Guide from active defs | P2 | OPEN |

---

## 4. Owner studio still required (unchanged)

Identity, gameplay formulas, relative-level behaviour, rewards, authored AI, CORE–SIGNATURE pools with discovery chips, variants, spawn rules, boss phases/summons/arena/mastery, visual mode **NONE** by default, and **DRAFT → VALIDATE → PREVIEW → ACTIVATE**.

Validation before activate: required fields, AI/spell compatibility, SpellConfig, spawn rules, rewards, visual fallback, render profile, references, encounter compatibility.

Visuals must never change occupancy, pathing, range, or rewards. Bosses may use `boss_large`. Missing custom art falls back to the built-in pixel design the next frame.

---

## 5. New ACTION_IDs (this run only)

Full records: [`ACTION_IDS_ENEMY_BOSS_ADMIN_2026-09-01.md`](./ACTION_IDS_ENEMY_BOSS_ADMIN_2026-09-01.md).

| ID | Title | Priority |
| :--- | :--- | :--- |
| EBA-2026-09-01-001 | Replace adminGuard closed-band enemy/region checks with RelativeEligibility validators | P0 |
| EBA-2026-09-01-002 | Stop calling live `pbv_boss_configs` a “draft” | P1 |
| EBA-2026-09-01-003 | Wire boss set/delete to the canister; do not treat the portal gate as soft-retire | P0 |
| EBA-2026-09-01-004 | Retire `longHorizonSim`’s private kit/scaling copy | P1 |
| EBA-2026-09-01-005 | Ban or guard the unused `admin-api.mo` mixin write path | P1 |
| EBA-2026-09-01-006 | Do not label unused `spriteUrl` as a live Default/Custom visual | P1 |
