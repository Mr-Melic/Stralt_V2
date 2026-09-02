# World, Dungeon & Encounter Admin Designer — 2026-09-01

**Source automation:** World, Dungeon & Encounter Admin Designer (`1592c6c0-a499-11f1-a7d1-d6b4613131ce`)  
**This run:** `bc-31a80ba0-ecd3-455c-861c-d951675e8ff8`  
**HEAD inspected:** `dd275aa` (`main` after #182)  
**Constraint:** design only. No production code, no RAF / mapGen / turn / damage-math edits.  
**Player rule:** Stralt has **no player level cap**. Every owner control must stay valid at hypothetical levels of 1, 50, 500, 5_000, and 50_000.

Prior brief (still the content-model contract): [`WORLD_ENCOUNTER_ADMIN_DESIGN_2026-08-31.md`](./WORLD_ENCOUNTER_ADMIN_DESIGN_2026-08-31.md) (PR [#126](https://github.com/Mr-Melic/stralt/pull/126), merged).  
Prior IDs (do not re-issue): `WDEAD-2026-08-31-001` … `015` in [`ACTION_IDS_2026-08-31.md`](./ACTION_IDS_2026-08-31.md).  
This run’s IDs: [`ACTION_IDS_WDEAD_2026-09-01.md`](./ACTION_IDS_WDEAD_2026-09-01.md).

---

## 0. What this cron is for

The 2026-08-31 run specified the owner pack, relative spawn, Simulation Lab, and DRAFT → SIMULATE → VALIDATE → ACTIVATE. **None of those IDs were implemented.** This run re-audits live ceilings and only issues **NEW** IDs for gaps that did not exist (or were not owner-facing) 48 hours ago.

New artifacts on `main` that change the owner-control job:

| Artifact | Status | Owner can edit? | Drives live spawn? |
| :--- | :--- | :--- | :--- |
| `engine/worldFeatures.ts` (20 `WF-*` ids, `pickWeightedFeatures`) | Designed + unit-tested. Sibling `WDD-2026-08-31-001` is `DESIGNED`. | **No** | **No** — `WorldExploration.tsx` does not import it |
| `utils/longHorizonSim.ts` | CLI observation harness (`LHIPS-*`) | **No** | **No** — and must not become the owner lab |
| `engine/mapModifiers.ts` | **22 live** modifiers with `onDamageDealt` / `rewardMultiplier` hooks | Admin Modifiers tab (trigger chance) | Yes — world two-roll |
| `applyRewards` per-call ceilings | `dokaDelta > 100_000` / `xpDelta > 500_000` → `#err`; client `clampApplyRewardsDeltas` | **No** | Yes — official funnel |
| `bossRushProgress.ts` | `completeBossRushRoom` is **progress-only (0, 0)** | Admin “Reward x” looks live | Credits go through `applyRewards` after `currentRoom` advances |

Preferred lifecycle is unchanged:

**DRAFT → SIMULATE → VALIDATE → ACTIVATE**

Admin / debug / simulation stay **dev-gated**. Simulation must never call `applyRewards`, `saveBattleStats`, `upgradeSpell`, `claimAchievementReward`, `processPendingPurchases`, or any persist-lock credit.

---

## 1. Re-audit: `WDEAD-2026-08-31-001` … `015` (all still `NEW`)

Line numbers below are **this HEAD**. The 08-31 IDs stay the implementer contract; this table is evidence they are still open.

| ID | Still true? | Live evidence @ `dd275aa` |
| :--- | :--- | :--- |
| 001 hard ceilings | Yes | `combatMath.ts` 58 `maxTier = floor(999 / ts)`. `computeAITier` 36–51 stops at 900 → tier 10; 30% uniform 1–10. `newEnemy` / `newRegion` `levelMax: 5` (`AdminDashboard.tsx` 116–134). Region match `level <= levelMax` (WX 3717–3724). Dungeon extras / boost `Math.min(dungeonDepth, 5)` (WX 6293–6294). Doka tables clamp 5 (WX 1294–1296; `useDungeonState.ts` 10–21; `portalRules.ts` 148–161). Chain length `3 + floor(random*3)` (WX 6905, 6997). Death Realm fallbacks `maxLevel: 5` (WX 14004, 14136) vs entry `9999` (WX 6021). |
| 002 relative spawn knobs | Yes | Tiers tab still four buckets + sum-100 (`AdminDashboard.tsx` 3556–3619). Preview `SAMPLE_LEVELS = [1, 10, 25, 50, 100, 200, 500]` (3619). `tierSize` `max={100}` (3701). Frontend `TierSpawnConfig` (`gameTypes.ts` 428–434) still omits `levelVarianceChance` (engine-only, `combatMath.ts` 11, 60–69). No equal/above first-class fields. |
| 003 Simulation Lab | Yes | No Admin Simulation tab (`gameTypes.ts` 483–498). `mapGen.simulate.ts` is still solvability-only. **Do not treat `longHorizonSim.ts` as 003** — see `WDEAD-2026-09-01-002`. |
| 004 draft lifecycle | Yes | Tiers save writes `localStorage` then `adminSetTierSpawnConfig` immediately (3604–3611). Boss Rush save same pattern (6790–6800). No pack status. |
| 005 encounter catalog | Yes | `generateEnemies` (WX 6284–6542): size `1+rand*8` + depth table, random chess piece, quadrant + Chebyshev ≥ 4, then 30% equal-weight family (6447–6537). No formation / rarity / rule / encounter-bound objective. |
| 006 dead EnemyConfig | Yes | WX still has **zero** `enemyConfigs` / `getEnemyConfigs` reads. |
| 007 dungeon policy | Yes | Entry 20% (WX 5434–5437). Rest is a **world** 10% portal (5496–5501), not a dungeon room. Bosses are a separate 15% world portal (5462–5469). Continue-in-chain 25% (5603–5605). No branch graph. Completion `maxDepth * 50` (`portalRules.ts` 195–197). |
| 008 Boss Rush policy | Yes | `BOSS_RUSH_ROOMS` still 10 hardcoded pairs (`useBossRush.ts` 24–135). Admin is enable + multiplier on labels (6717–6783). Entry 8% (WX 5519–5524). **New unpaid-multiplier fact → 09-01-009.** |
| 009 world-event catalog | Partial | 08-31 said “no event type.” A **hardcoded** 20-row catalog now exists (`worldFeatures.ts`) but is not owner-editable and not live. Live events are still the 22-modifier two-roll. **Do not re-issue 009.** New work is unify + own the catalog (09-01-003). |
| 010 relative rewards | Yes | `DEFAULT_CHALLENGES` still flat 50–500 Doka / 400–1000 XP (`challengeCompletion.ts` 38–103). Rush rooms still flat 500–5000 / 200–2000. **New clamp fact → 09-01-005.** |
| 011 elite / variant / size / family / AI knobs | Yes | Family 30% equal (WX 6526–6528). `MAX_ENEMIES = 20` (`gameConstants.ts` 10). No `isElite`. AI still 10-bucket + 30% chaos. |
| 012 summoner + NaN kit zone | Yes | `buildEnemyKit(enemy.pieceType, currentMap.levelZone)` (WX 12484). Summoner `0.12 + level * 0.02` (12496–12502). Linear, unclamped. |
| 013 unify Doka tables | Yes | Three copies remain (WX 1294–1296; `useDungeonState.ts` 10–21; `portalRules.ts` 148–161). |
| 014 backend bosses | Yes | Bosses tab still “Browser-local drafts only (`pbv_boss_configs`)” (7333–7335). `useBossQueries.ts` / `useAdminQueries.ts` still key `pbv_boss_configs`. WX boss portal still `localStorage.getItem("pbv_boss_configs")` (7151). |
| 015 dev-gate lab | Yes | Lab does not exist yet. Admin is still the 15-tab CRUD list (5104–5118). |

Missing tabs (unchanged): Encounters, Dungeons, World Events, Spawn (beyond coarse tiers), Simulation, Drafts.

---

## 2. Owner-lying controls (new class)

Several surfaces **look** like live owner knobs and are not. An implementer who “just wires the existing tab” will ship a lie.

| Control | What the owner thinks | What actually happens |
| :--- | :--- | :--- |
| Enemies tab CRUD | Roster uses `hp/ap/mp/levelMin/levelMax` | `generateEnemies` never reads `enemyConfigs` |
| Tiers `threeOrMorePercent` | ±3+ bucket is this field; save requires sum 100 including it (3576–3591) | `pickEnemyLevelFromTiers` **never reads** `cfg.threeOrMorePercent`. The ±3+ branch is leftover `100 - same - adj - twoAway` (`combatMath.ts` 72–75, 90–97). Setting 20% ±3+ while the first three already sum to 95 silently stores 5%. |
| Tiers preview | Distribution at 1…500 | Static table of configured percents, not a Monte Carlo. Caps sample at 500. Does not show below/equal/above **level** (only tier bands). |
| `levelVarianceChance` | Engine comment says “admin-configurable” (`combatMath.ts` 60) | Not on frontend `TierSpawnConfig`. Not on the Tiers tab. Defaults to 15% in the picker. |
| Boss Rush `room_N_enabled` / Reward x | Rooms and payouts are owner-owned | Runtime walks `BOSS_RUSH_ROOMS`. `completeBossRushRoom` is called with `(0, 0)` (`bossRushProgress.ts` 164–198). Official credit is `applyRewards` after `currentRoom` advances. The “x” field is not that payload. |
| `WORLD_FEATURES` ids | Catalog in `engine/` looks shippable | Not imported by WX. Placement helpers (`canAddEnemies`, `canAddHazardTiles`) encode `MAX_ENEMIES` / `MAX_HAZARD_TILES` as content ceilings. |
| `longHorizonSim` | “We already have a sim lab” | CLI harness. `STRESS_LEVELS` stop at 5000 plus IEEE 1018/1019. Reports XP/HP/AI/kit NaN — **not** families, variants, elites, formations, discovery, or estimated difficulty. Installs a fake `localStorage` if missing (299–316). |

**Rule:** every owner field must either drive the active pack after VALIDATE or be labeled read-only / unused. Draft save must not imply live spawn.

---

## 3. Dual catalogs that must not both roll

Live world already has:

- Hazard tiles `lava` / `ice` / `spikes`
- **22** `MAP_MODIFIERS` (`mapModifiers.ts` 152–471) with hook points including `onDamageDealt` and `rewardMultiplier`
- Portals (regular, dungeon 20%, boss 15%, rest 10%, boss-rush 8%)
- Ground Doka

`worldFeatures.ts` adds a **second** rarity-weighted overlay (tile 55% / encounter 25% / event 15%, `MAX_ROLLED_FEATURES = 3`) with ids such as `WF-MOD-CROSSWIND`, `WF-MOD-LOW_CEILING`, `WF-EVT-ECLIPSE`. `EXISTING_MAP_MODIFIER_IDS` (912–935) lists the 22 live ids so the new catalog does not collide **by string** — it still **double-rolls** if both systems fire independently (Crosswind + `paper_windstorm` + Eclipse on one map).

Owner surface (one pack, one roll budget):

```
WorldContentPack.worldEventCatalog[]   # includes WF-* and live modifier ids
  id
  slot: tile | encounter | event | modifier
  rarityWeight
  eligibility.runModes[]               # exploration | dungeon | bossRush | rest | deathRealm
  relativeDifficulty                   # soft | medium | hard | extreme — vs same-tier
  hazardIds[] / elitePolicy / rareSpellBearerPolicy
  combatHookId?                        # MUST be a mapModifierRegistry hook, or none
  rewardCurve                          # payable under applyRewards ceilings
  grantClass                           # none | mapAttune | observe  — never upgradeSpell
```

Death Realm stays quiet unless the owner **explicitly** enables a feature for `deathRealm`. Today `isFeatureAllowedInContext` hard-returns false (`worldFeatures.ts` 786–792) with no owner override. Rest / sanctuary maps (`isRestMap`, white portal at spawn) are a live run context and must appear on that eligibility enum — they are not “depth 0 overworld.”

Do not implement placement inside `mapGen.ts` or a new 400-line WX branch. WDD already specified post-`finalizePlayableLayout` + re-`evaluateSolvability`. This program only specifies **owner control** of weights, eligibility, and activate.

---

## 4. Combat and spell grants — no second funnels

`WF-EVT-ECLIPSE` proposes “+15% of the already-computed hit.” `WF-MOD-LOW_CEILING` proposes a metadata range clamp. Those may exist **only** as `mapModifierRegistry` hooks (`onDamageDealt`, existing range readers). A third damage pass inside `WorldExploration` is forbidden (AGENTS.md: do not touch damage math; no name heuristics).

`WF-SPL-RUNE_BEARER` proposes map-only attune of `usableByEnemy` spells and “does not call `upgradeSpell`.” That grant class must be explicit on the owner form:

| `grantClass` | Persist | Writer |
| :--- | :--- | :--- |
| `none` | — | — |
| `mapAttune` | this map only, in-memory | never `upgradeSpell`, never `spellLevel` arrays |
| `observe` | future discovery funnel only if a human picks the discovery IDs | not this program |

There is still **no** live `observeSpell` / learn-from-enemy path in `src/frontend`. Do not invent one here to “complete” the bearer.

---

## 5. Economy: relative curves vs per-call ceilings (new law)

08-31 `WDEAD-010` asked for `RewardCurve` on challenges / dungeon / rush / events. Since then:

- `main.mo` `applyRewards` rejects `dokaDelta > 100_000` and (paired) XP above `500_000`
- Official client clamps first (`applyRewardsResult.ts` 37–61) so the recap cannot advertise a grant the canister `#err`s
- Comments in that file record that the **existing** 0.01% jackpot band (`level * [1, 1e9]`) already exceeds the Doka ceiling; dungeon 4× + Doka Fever 2× also can

So an owner “2.5× extreme event” on a late-game jackpot is not “more reward” — it is **silent clip** (or a rejected call if someone bypasses the client clamp).

Owner rules for every curve (validate gate additions):

1. Persist only through `applyRewards` (credits) or `saveBattleStats` (absolute heals / spends / death).
2. Evaluate from authoritative character level on the official client; enqueue on `createProgressPersist`.
3. Show the **payable** amount (after official clamp) next to the theoretical amount in draft preview.
4. Prefer diminishing / relative functions whose payable value stays meaningful under the official maxima — do not invent a second mint to “fix” the ceiling.
5. Simulation reports theoretical vs payable and **must not credit**.

Do not retune `100 * 2^(N-1)` in this program (`LHIPS-2026-08-31-001` owns that report).

---

## 6. Feature / encounter budgets are not a level cap — but they are a content cap

`MAX_ENEMIES = 20` and `MAX_HAZARD_TILES = 50` are board-safety limits (initiative, leftover roster, solvability). `worldFeatures.ts` now **re-encodes** them as skip rules (`canAddEnemies` 804–807, `canAddHazardTiles` 799–802). `MAX_ROLLED_FEATURES = 3` plus slot chances (30, 128–132, 875–893) freeze event density for a 50_000-level character the same as a level-1 character.

That is correct for “no level gate” and wrong for “owner cannot raise density on a draft.” Owner pack fields:

- `featureBudget.maxRolled` (draftable; validate solvability rate in sim)
- `encounterSize { min, max, depthCurve }` (still `WDEAD-011`)
- board-safety **ceilings** stay named constants, not hidden `levelMax`

Warband (`WF-INV-WARBAND` +3–5) is already specified to skip when the roster is at 20. At high rarity that skip **erases** the legendary event. Sim must report `skippedForBudget` so owners see the lie.

---

## 7. Simulation Laboratory vs `longHorizonSim` (do not conflate)

`WDEAD-2026-08-31-003` still stands. This run adds isolation rules because a second “sim” now lives in-repo.

| | `longHorizonSim.ts` | Owner Simulation Lab (003 + 09-01-002/008) |
| :--- | :--- | :--- |
| Audience | Engineers / LHIPS reports | Dev-gated owner |
| Entry | `node --experimental-strip-types …` | Admin Simulation tab |
| Player level input | `STRESS_LEVELS` 1…5000 + 1018/1019 | Unbounded field; presets 1 / 10 / 100 / 1_000 / 10_000 / 50_000 |
| Pickers | Live `pickEnemyLevelFromTiers` (still 999-capped) | Draft pack pickers (after 001/002) |
| Reports | XP wall, HP formulas, AI pMax, kit NaN, boss guide vs combat | Relative-level histogram, below/equal/above, families, variants, elites, AI, rare spells, discovery opportunities, formations, estimated difficulty, **skippedForBudget**, **theoretical vs payable rewards** |
| Persist | Fake `localStorage` shim if missing | **Zero** player-cache keys, zero actor updates |
| Overflow | Documents Infinity at 1019 | Must **display** overflow; must **not** clamp the hypothetical level to 999 / 5000 / 1018 |

Lab isolation (unchanged, now with a concrete anti-pattern):

- Do not call WX `generateEnemies`
- Do not import `runLongHorizonSim` into Admin
- Do not call `ensureLocalStorage` in the browser session
- Allow-list test: spy actor + persist lock; fail on `applyRewards` / `saveBattleStats` / `upgradeSpell`

Extreme levels: use integer offsets + bigint **display**. If `xpForNextLevel` is `Infinity`, the report says so. Never “keep it safe” by clamping the input.

---

## 8. Boss Rush owner multipliers are unpaid

08-31 `WDEAD-008` asked for pools / relative scale / sequencing. Additional live fact:

`persistBossRushRoomClear` (`bossRushProgress.ts` 155–198) writes `currentRoom` (or `resetBossRush` on the jackpot room) **then** calls `completeBossRushRoom(slot, room, 0, 0)`. Wallet credit is a later `applyRewards` on the persist lock. AGENTS.md already: canister ignores client `dokaReward` / `xpReward`.

So the Admin “Reward x” number (6717–6779) cannot be “the room payout” unless an implementer folds the evaluated curve into the **official** `bossRushRoomReward` passed to `computeRewardDeltas` (`rewardResolver.ts` 164–166) — still `0, 0` to `completeBossRushRoom`.

Validate: disable room 10 must not leave a resumable jackpot (`bossRushProgress.test.ts` already encodes this). Relative scale bosses vs player level remains `WDEAD-008` / `EBA-004`.

---

## 9. Rest / sanctuary / Death Realm as owner contexts

Live modes the 08-31 dungeon policy underspecified as **first-class eligibility**:

| Context | Live signal | Feature catalog today | Owner need |
| :--- | :--- | :--- | :--- |
| Exploration | `RunMode "none"` | `allowedRunModes` includes `exploration` | Default |
| Dungeon chain | `dungeonChainActiveRef` | Allowed unless `EXPLORATION_ONLY` (Flicker Gate, Gambit, Eclipse) | Weights + rest-room-from-depth |
| Boss Rush | `bossRushActiveRef` | Same as dungeon for most `WF-*` | Usually mute invasions |
| Rest / white sanctuary | `isRestMap` (WX 6099 `maxLevel: 9999`); white portal colocates with spawn | Not a `WorldFeatureRunMode` | Explicit `rest`: no hostiles / optional shrine-only |
| Death Realm | `isDeathRealm`; guards 1.5s; fallbacks `maxLevel: 5` | Always `[]` | Explicit mute (default) or owner-enabled quiet features — **no** `levelMax` |

Do not re-issue 001’s Death Realm `maxLevel: 5` stamp. This ID is eligibility metadata on the pack.

---

## 10. Owner console IA (unchanged, still missing)

Carved-stone, dark slate, crimson (`#13161f`, `#d8463f`, `#f0c44a`). Do not copy the grey Tailwind Boss Rush rows (6742–6781) as the new pattern.

```
CONTENT
  Encounters     pools · formations · rarity · objectives · rewards · hazards · rules
  Dungeons       rooms · sequence · special · rest · branch · bosses · modifiers · rewards
  Boss Rush      pool · scale · progression · multipliers · sequence
  World Events   eligibility (incl. rest / deathRealm) · rarity · hazards · elites · grants · hooks
  Spawn          relative level · equal · above · elite · variant · size · family · spells · AI
  Simulation     hypothetical level (unbounded) · N · seed · reports · payable vs theoretical
LIFECYCLE
  Drafts         diff vs active · simulate · validate · activate
LEGACY (label unused knobs until migrate)
  Enemies / Regions / Tiers / Modifiers / Bosses / Names
```

Every economy/difficulty control: draft vs active badge, last sim snapshot at 1 / 1_000 / 10_000, Activate disabled until VALIDATE is green.

### Validate gates (08-31 §6 plus this run)

11. No owner field that is stored but unread (`threeOrMorePercent` class).
12. `WORLD_FEATURES` ids and `MAP_MODIFIERS` ids share one roll budget; no independent double-roll.
13. Every combat effect is a `mapModifierRegistry` hook or “none.”
14. Every spell grant is `none | mapAttune | observe`.
15. Reward preview shows payable amount ≤ official `applyRewards` maxima.
16. Sim log contains zero persist / actor updates and zero `pbv_*` / inventory writes.
17. Hypothetical level 50_000 is accepted; overflow is reported, not clamped.

---

## 11. What this program must not do

- Do not implement the pack, the lab, or the tabs in this run.
- Do not edit `WorldExploration.tsx` to add another generate / feature-overlay branch.
- Do not edit RAF, `mapGen.ts`, turn order, or `calcScaledDamage`.
- Do not add `levelMax` “for safety.”
- Do not promote `longHorizonSim` to Admin.
- Do not open a second reward or spell-level writer.
- Do not re-issue `WDEAD-2026-08-31-001` … `015`, `WDD-2026-08-31-001`, `EBA-*`, or `ENC-*`.
- Do not retune the XP curve (`LHIPS-001`).

Extract path for implementers (unchanged): `engine/spawnPolicy.ts`, `engine/encounterFormations.ts`, `engine/encounterSim.ts`, `engine/dungeonPolicy.ts`. World-event weights belong next to `worldFeatures.ts` as **data loaded from the active pack**, not a second hardcoded array.

---

## 12. ACTION_ID index (this run only)

| ID | Title | Priority |
| :--- | :--- | :--- |
| WDEAD-2026-09-01-001 | Quarantine owner-lying controls | P0 |
| WDEAD-2026-09-01-002 | Isolate `longHorizonSim` from the owner Simulation Lab | P0 |
| WDEAD-2026-09-01-003 | One owner catalog / one roll budget for `WF-*` + 22 modifiers | P0 |
| WDEAD-2026-09-01-004 | Owner feature-budget policy; report `skippedForBudget` | P1 |
| WDEAD-2026-09-01-005 | Reward curves must stay payable under `applyRewards` ceilings | P0 |
| WDEAD-2026-09-01-006 | Explicit event spell `grantClass` — never `upgradeSpell` | P1 |
| WDEAD-2026-09-01-007 | Event combat effects only via `mapModifierRegistry` | P1 |
| WDEAD-2026-09-01-008 | Simulation overflow contract at hypothetical 50_000 | P1 |
| WDEAD-2026-09-01-009 | Bind Boss Rush owner multipliers into official `applyRewards` | P1 |
| WDEAD-2026-09-01-010 | Rest / sanctuary / Death Realm eligibility on the pack | P2 |

Full records: [`ACTION_IDS_WDEAD_2026-09-01.md`](./ACTION_IDS_WDEAD_2026-09-01.md).
