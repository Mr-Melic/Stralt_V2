# Advanced Enemy AI Evolution — Design Catalog

**Status:** PROPOSED (design only; no production code in this change)  
**Dates:** 2026-08-31 (T0–T5 catalog) · 2026-09-01 (T6+ FUT-01…23) · **2026-09-02 re-read** (WX drift + SYS-13…21 / FUT-24…35)  
**Scope:** Reusable enemy sophistication that does not terminate at a fixed player level.

This document is the implementation brief for later PRs. It does **not** change combat math, the RAF loop, map generation, or turn order. It records what the live engine already does, then proposes capability modules that can keep appearing as relative difficulty rises.

**2026-09-01 increment:** [`ENEMY_AI_EVOLUTION_2026-09-01.md`](./ENEMY_AI_EVOLUTION_2026-09-01.md) — kit `levelZone` NaN, unread focus, targeting-shape mismatch, FUT-01…FUT-23.  
**2026-09-02 increment:** [`ENEMY_AI_EVOLUTION_2026-09-02.md`](./ENEMY_AI_EVOLUTION_2026-09-02.md) — live WX line numbers, player-centric `isTileCastableLive`, empty summon occupancy, path vs Chebyshev MP, boss second-brain legality, SYS-13…SYS-21, FUT-24…FUT-35. T0–T5 proposals in this file are unchanged and still **PROPOSED**.

---

## 1. Why this exists

Stralt has no character level cap. Enemy *statistics* already scale with `enemy.level` (`progression.ts` / `calcEnemyMaxHp`). Enemy *decisions* must also keep getting better — otherwise late-game fights are stat sticks.

The current engine maps level bands to an integer `aiTier` and then mostly ignores that integer inside `decideEnemyAction`. That cannot be the long-term model:

- A level-400 player fighting a peer pack should not automatically get “tier 7 god AI.”
- A level-400 player fighting a weak remnant should not get tutorial AI just because the remnant’s absolute level is “low” on a hardcoded table.
- There is no last band. Tiers are **conceptual sophistication**, not XP brackets.

**Hard rule:** never encode `if (level >= X) sophistication = Y`.

---

## 2. Current implementation (read-back)

All line numbers are from this checkout. Re-read them before implementing.

### 2.1 Decision core

| Piece | Path | What it actually does (2026-09-02 lines) |
| :--- | :--- | :--- |
| Pure decide | `src/frontend/src/engine/enemyAI.ts` `decideEnemyAction` (1649–1693) | One action per turn: `cast` / `melee` / `move` / `skip`. No React. |
| Apply | `WorldExploration.tsx` 16537–16800+ | Chebyshev range only (16540–16544), then damage/drain/self-heal (`range === 0` only, 16736)/debuff, else fallback melee **or Fire Bolt** (16792–16800). |
| Summon decide | `decideSummonAction` (1747+) | hunter / guardian / archer / bomber / healer. WX ctx at 15250 passes **empty** `occupied`. |
| Summon apply | `engine/summonExecutor.ts` 119–210 | **Does** debit AP/MP. Movement bill is Chebyshev teleport (125–126), not 4-dir path cost. |
| Boss decide | `hooks/useBossAI.ts` `pickBossKitSpell` (38–54) | First id in the phase pool. Call sites pass `new Map()` so cooldown is ignored. |
| Occupancy | `engine/occupancy.ts` | Shared passability for AI pathing. Pack snapshot fills occupied (WX 16397–16404); summon snapshot does not. |
| Targeting truth | `engine/targeting.ts` `isTileCastableLive` (415+) | Player: Manhattan ground; Chebyshev enemy/area; `minRange ?? 1` / `linear` / `diagonal` / `freeCells`. `ally` = player-side summons only (476–495). AI decide uses Chebyshev + `lineOfSight !== false` only. |

`DecideEnemyContext` already has LoS, hazards, barriers, focus-fire setters, enrage, slime-flood, and cooldown-filtered `availableSpells`. It does **not** carry enemy AP/MP, player AP/MP, RES/SR on combatants, or `activeEffects`.

### 2.2 Forbidden pattern already in tree: `computeAITier`

```36:52:src/frontend/src/engine/combatMath.ts
export const computeAITier = (enemyLevel: number): number => {
  let baseTier: number;
  if (enemyLevel <= 10) baseTier = 1;
  else if (enemyLevel <= 30) baseTier = 2;
  else if (enemyLevel <= 60) baseTier = 3;
  else if (enemyLevel <= 100) baseTier = 4;
  else if (enemyLevel <= 150) baseTier = 5;
  else if (enemyLevel <= 250) baseTier = 6;
  else if (enemyLevel <= 400) baseTier = 7;
  else if (enemyLevel <= 600) baseTier = 8;
  else if (enemyLevel <= 900) baseTier = 9;
  else baseTier = 10;
  if (Math.random() < AI_TIER_VARIANCE_CHANCE) {
    return Math.floor(Math.random() * 10) + 1;
  }
  return baseTier;
};
```

Assigned at spawn (`WorldExploration.tsx` 5823, 5951). This is exactly “Level X equals AI tier Y,” plus a 30% scramble to 1–10 that can give a tutorial mob elite logic or a boss tutorial logic.

`ENEMY_AI_TIER_GATES` (`gameConstants.ts` 200–209) lists `erratic`, `groupTactics`, `instantKill`, `betrayal`, `chokepointCamp`, `escapeRoute`, `bottleneckControl`, `defensiveRetreat`. **`enemyAI.ts` does not read this object** (only a comment at 1404). Live gates in the apply layer:

| Gate | Lines | Behaviour |
| :--- | :--- | :--- |
| `aiTier >= 5` | WX 15597–15679 | After leader death: random adjacent step + 50% **logged** random spell name (spell is **not** applied — only `updateCombatant` position). |
| `aiTier >= 10` | WX 15683–15700+ | 5% chance to damage an ally (“Betrayal”) and 6× enrage. |

Those are spectacle, not tactics. `instantKill` must never become a hidden-information or rule-breaking execute.

### 2.3 Archetype inference is kit-heuristic

`inferArchetype` (420–450):

1. Any heal / `healAmount > 0` → **healer** (runs first).
2. Majority ranged + `lineOfSight !== false` → caster.
3. `pieceType === "knight"` → flanker.
4. Enrage / `family` contains `"berserk"` / `aiStrategy === "berserk"` → berserker.
5. Melee-only → charger.
6. Else generic.

`buildEnemyKit` (156–178) gives queens and kings `starter-heal` from `levelZone >= 1`. Those pieces therefore **become healers** and stop using their frost/inferno kit as primary. Summoner is **not** in this switch; WX 16463–16472 routes `enemy.isSummoner` to `decideSummonerAction` only.

First-class roles that do **not** exist: tank, assassin, kiter, support, controller, artillery, disruptor, protector.

### 2.4 Target scoring (exists, incomplete)

`scoreTargets` (501–525):

```
score = 100*killableNow + 50*threat + 30*(1 - hp/effHp) + 10*proximity
```

Threat table (`ENEMY_THREAT_VALUES`): wisp 1.0, healer 0.8, summon 0.6, default 0.3. No player-as-support, no RES/SR, no AP/MP, no “already focused,” no “already has this DoT.”

`estimateDamage` (463–482) uses `spell.damage` or a melee `12 * level/5` crush. It ignores RES, SR, `isPhysical`, DoT (`spell-inferno` and `starter-poison` have `damage: 0` so they score **0** and lose `pickBestDamageSpell`).

`pickBestDamageSpell` (528–546) requires `damage > 0` and `spellType/effectType` in `{damage, drain}`. Utility, DoT-only, swap, mark, sacrifice, and most buffs are invisible.

### 2.5 Movement budget is not MP

`computeReachable` (330–367) is 4-directional BFS with `ENEMY_REACHABLE_STEP_BUDGET = 3` (`gameConstants.ts` 166). Slime flood doubles step cost. Hazard filter (`filterHazardCandidates`, 398–414) only runs when HP fraction `< ENEMY_HAZARD_AVOID_HP_PCT` (0.5). Ice/lava/spikes are treated the same.

Helpers that already exist and should be reused, not rewritten:

- `stepToward` / `stepAway` / `stepFlank`
- `findNearestLegalCastTile` (762–804) — range + LoS
- `repositionForLOS` (722–744) — budget 2
- `backlineGuardCell` (815–842) — healer idle only
- `applyLethalLookahead` / `applyOverkillSpread`

Retreat often returns `kind: "skip"` while still moving (caster 910–925, flanker 1305–1314, generic 1501–1510). Apply then commits dest via `enemyDestToCommit` (WX 16504–16510) or falls into melee if adjacent.

### 2.6 Honesty gaps (must not be “sophistication”)

| Gap | Evidence | Rule |
| :--- | :--- | :--- |
| Enemy AP/MP not spent | `decideEnemyAction` never reads `apCost` / `currentAp` / `currentMp` | AI must not cast or walk what the player could not. |
| Fallback “Fire Bolt” | WX 16792–16800: if cast fails or `kind === "melee"` and Chebyshev `nd <= 1`, 50% chance of a range-3 bolt **not in the kit** | Remove. Melee is adjacent-only Crush (or kit `physical_attack`). |
| Ally heal apply | WX 16736: heal only if `spellType === "heal" && spellRange === 0` | `decideHealer` can target an ally in range; apply ignores it and may melee the player. |
| Buff/utility apply | Apply handles damage/drain, self-heal, and `debuffStat`. No ally buff, swap, mark, sacrifice, AoE (`frost-nova`, `lifesteal-nova`) | Do not assign those spells until apply + scorer exist. |
| LoS in apply | Decide checks LoS (`lineOfSight !== false`); apply re-checks Chebyshev range only (WX 16540–16544). Player live gate requires `lineOfSight` **truthy** (`targeting.ts` 117–126) | Keep decide LoS. Never skip LoS for “smart” AI. Do not unify by turning AI LoS off. |
| Betrayal / 6× enrage | WX 15683+ | Not a tactic. Do not treat as T5+. |
| `instantKill` gate | Constant only | Never implement as a hidden execute. |
| Focus id unread | `setFocusTargetId` at 940 / 1526; `scoreTargets` never reads `ctx.focusTargetId` | TEM-01 is a writer without a reader. |
| Targeting shape | `findNearestLegalCastTile` (763–804): Chebyshev + LoS only | Player `isTileCastableLive` also gates `minRange`, `linear`, `diagonal`, `freeCells`, Manhattan ground. |
| Kit width dead | `buildEnemyKit(..., currentMap.levelZone)` | Zone-0 kits forever until AI-SYS-09. |
| Player-centric live helper | `isTileCastableLive` `ally` = `side === "player"` (`targeting.ts` 476–495) | SYS-13: side-parameterised helper. Raw extract would break enemy ally heals. |
| Summon occupied empty | WX 15250 | SYS-14. |
| Minion AP/MP 0 | WX 16243–16244 | SYS-21: seed, do not treat as budget 3. |

Summon AI is the honesty template: `summonExecutor.ts` 122–210 blocks move/cast/melee when MP/AP is insufficient.

### 2.7 Spell kit vs spell book

Battle start (`WX` 12030–12038) assigns `buildEnemyKit(pieceType, currentMap.levelZone)`, not “10 random spells” (comment at 12030 is stale). **`currentMap.levelZone` is an object** (`{ name, minLevel, maxLevel }`, WX 4680 / type at 558). `buildEnemyKit` does `Math.floor(levelZone)` (`enemyAI.ts` 192). `Math.floor(object)` is `NaN`, so **every live kit stays on the zone-0 branch** (one spell). Confirmed by `longHorizonSim.ts` 45–52. Kit width must be re-keyed to **relative difficulty**, not that object and not a level cap. See AI-SYS-09.

Enemy-usable spells the decide loop cannot score intelligently today (do not give these to enemies until a profile exists):

`spell-swap`, `spell-mark`, `spell-sacrifice`, `spell-lifesteal-nova`, `spell-enrage`, `spell-haste`, `spell-weaken`, `spell-expose`, `spell-drain-courage`, `spell-cursed-wound`, `spell-shadow-veil`, `spell-frost-nova`, `spell-inferno` (DoT, `damage: 0`), `starter-poison` / `spell-venom-strike` (same), `starter-shield` / `spell-iron-skin` (ally buff).

`usableByEnemy: false` today: `spell-barrier`, `spell-mirror`, `spell-timestep`, `spell-rallying-cry`, sentinel/bomber/wisp summons. Keep false until a scorer **and** apply path exist.

### 2.8 Tests

`src/frontend/src/engine/enemyAI.charger.test.ts` exists (charger wait / advance / adjacent melee). There is still **no** `enemyAI.test.ts` covering legality, heals, DoT EV, or focus. Any implementation PR must add pure tests next to `engine/enemyAI.ts` before touching WX. Do not treat the charger file as coverage for SYS-05.

---

## 3. Design principles

1. **Modules, not a level table.** Sophistication is a set of enabled capability IDs rolled at spawn.
2. **Relative eligibility.** Compare this enemy’s threat to the *current* player (level ratio, pack role, boss/leader flags, map modifiers). Absolute level never unlocks a module by itself.
3. **Unbounded composition.** Tier 6+ is more modules and tighter weights, not a final form. A year-later encounter can attach new modules without raising a level cap.
4. **Spell contract.** Every enemy-usable spell has a `SpellScoreProfile`. No profile → `usableByEnemy` stays false and the kit builder must not emit the id.
5. **Explicit roles.** `Enemy.role` (or spawn metadata) is assigned. Do not infer “healer” from “has a heal.” A queen may *know* Blood Mend and still be artillery.
6. **Visible information only.** Player HP, AP, MP, position, summons, and public effects. No pending click, no fog-of-war pierce, no future RNG.
7. **Legal actions only.** Same LoS, range (`minRange`/`maxRange`/`linear`/`diagonal`/`freeCells`), AP, MP, cooldown, and occupancy as the player.
8. **Bounded compute.** 16×16 grid (`WORLD_GRID_SIZE`). One-turn action enum. No multi-turn tree except T5+ with a hard node cap (see AI-SYS-03).
9. **Do not cheat to feel hard.** No kit-less Fire Bolt, no betrayal-as-difficulty, no instant kill, no ignoring RES in *resolution* (scoring may *estimate* visible RES).
10. **Player can read it.** Intent log already exists (`AI_INTENT_LOG_ENABLED`). Every module must emit a reason string.

---

## 4. Conceptual sophistication tiers

Tiers describe **which modules may attach**, not a level range. A weak remnant at any absolute level can stay T0. A peer pack at any absolute level can roll T2–T3. A boss can roll T5 while trash in the same room stays T1.

| Tier | Intent | Typical module budget |
| :--- | :--- | :--- |
| **T0** | Tutorial / simple | Nearest-target melee or one in-range spell. No retreat. No focus. |
| **T1** | Basic tactical | Range + LoS + hazard avoid + kill-if-obvious. Current caster/charger core. |
| **T2** | Role-aware | One explicit role profile. Kit used as designed. |
| **T3** | Synergistic | Pack blackboard: focus, debuff hygiene, protect support. |
| **T4** | Adaptive | Visible player HP/AP/MP and status change weights this fight. |
| **T5** | Elite / boss | Bounded one-turn combo search + phase/role swap. Still no cheat. |
| **T6+** | Future modules | Extra scorers (bait tiles, remembered last-player-cell, pack spell rotation). Stack; do not replace T0–T5. |

**Eligibility (normative):**

```
relative = enemy.level / max(1, player.level)          // unbounded in level, ratio-based
peer     = log2(relative)                              // 0 = even; +1 = double level; -1 = half
pack     = isBoss ? 2 : isLeader ? 1 : 0
mod      = map-modifier threat bump (Arcane Surge, Glass Realm, …) in [0, 1]
score    = peer + 0.35*pack + 0.25*mod                 // no absolute-level term

P(attach module M) = clamp(sigmoid((score - M.mu) / M.sigma), M.pMin, M.pMax)
```

- `M.mu` / `M.sigma` live in `gameConstants` per module, **not** as “unlock at level 60.”
- Roll **once at spawn**; persist on the `Enemy` as `aiModules: string[]` (plus optional `sophisticationScore` for debug).
- Variance is the sigmoid roll, not `computeAITier`’s “pick 1–10 at random.”
- A T6 module has a higher `mu` and a low `pMin` so it can appear on any sufficiently *relatively* hard enemy, including future content.

Replace `computeAITier` + `enemy.aiTier` integer gates with this list. Keep `aiTier` only as a debug alias: `aiTier ≈ clamp(round(score + 3), 0, 6)` for logs — never as a behaviour `if`.

---

## 5. Shared scoring model

All modules add terms to one utility. Higher is better. Illegal actions score −∞ and are dropped.

```
U(action) =
    Σ roleWeights[role][k] * feature_k(action, ctx)
  + Σ enabledModule[m].score(action, ctx)
  - apWastePenalty
  - mpWastePenalty
  - friendlyFirePenalty
  - hazardStepPenalty
  - clusterPenalty
```

**Legal action** = destination reachable with **actual remaining MP** (slime-aware) + spell (if any) payable with **actual remaining AP** + `targetType` / range / LoS / linear / diagonal / freeCells / cooldown / `usableByEnemy`.

**Visible features** (no hidden state):

| Feature | Definition |
| :--- | :--- |
| `killableNow` | Estimated incoming HP loss ≥ target current HP (after visible RES/SR). |
| `threat` | Role/summon table + this-fight damage dealt if tracked publicly. |
| `lowHp` | `1 - hp/maxHp`. |
| `resGap` | Prefer the defense the spell actually bypasses (`isPhysical` → RES; else SR then RES). |
| `focusBonus` | Same id as pack `focusTargetId`. |
| `dupDebuff` | Negative if target already has this `debuffStat` / `dotType`. |
| `healNeed` | Ally `1 - hp/maxHp` above heal threshold. |
| `playerApFrac` / `playerMpFrac` | Last *public* end-of-turn or current-turn values the enemy can see. |
| `escapeDegree` | Count of walkable non-hazard exits after the action. |

**Compute cap:** enumerate destinations in the MP-reachable set (≤16×16, typically ≪ 20 tiles at MP 3–6) × assigned spells (kit ≤ ~6) × living opponents (≤ `MAX_ENEMIES` + summons). That is fine on a 16×16 board. Do not BFS the full grid per spell per enemy beyond the MP budget.

---

## 6. Spell scoring contract

New or enemy-enabled spells must ship a profile. Name is UI-only (`ARCHITECTURE.md`).

```
SpellScoreProfile {
  spellId: string
  effectCategory: SpellEffectCategory | "summon" | "swap" | "mark" | "sacrifice"
  legality(ctx, casterCell, dest, target): boolean   // metadata only
  expectedValue(ctx, dest, target): number           // HP, control, tempo
  synergy(ctx, target): number                       // existing public effects
  roleFit: Partial<Record<EnemyRole, number>>
  minSophistication: 0..6                            // eligibility mu hint, not a level
}
```

Category defaults (reuse; do not special-case `spell.name`):

| Category / flag | Default EV |
| :--- | :--- |
| `damage` / `drain` | Scaled damage × (1 − visible RES/SR) + drain heal. |
| `dot` | `dotDamagePerTurn * remainingDuration` if target lacks this `dotType`; else ~0. |
| `heal` | `healAmount * healNeed` on legal ally/self; 0 on full HP. |
| `buff` | Stat gap × duration if ally lacks buff. |
| `debuff` / `cc` | Threat × duration if target lacks that stat debuff. |
| `aoe` | Sum of single-target EV over `hitTiles` / radius; minus friendly fire. |
| `pushback` / `attract` | EV from dest tile (hazard, LoS break, stack for ally AoE). |
| `teleport` / `isSwap` | EV of swapped cells (escape, melee drop, hazard). |
| `isMark` | Next-hit bonus if a follow-up damage spell is still affordable this turn or next (T3+). |
| `isSacrifice` | 3× spent HP vs target EV; refuse if own HP would drop below retreat line unless berserker. |
| `isSummon` | Cap / cooldown / placement EV (body-block, kite screen). |

**Kit rule:** `buildEnemyKit` may only emit ids that have a profile **and** an apply branch. Until then, keep `usableByEnemy: false`.

---

## 7. System proposals

### AI-SYS-01

**NAME:** Relative sophistication eligibility  
**ROLE:** system  
**SOPHISTICATION:** T0–T6+ (meta)  
**DECISION_RULES:** At spawn, compute `score` from §4. For each catalog module, roll `P(attach)`. Persist `aiModules`. `decideEnemyAction` enables a module iff its id is on the enemy **and** its spell requirements are met. Never branch on `enemy.level` alone.  
**SCORING_MODEL:** Sigmoid eligibility; behaviour scoring is per-module.  
**SPELL_REQUIREMENTS:** None.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** Always on. This *is* the eligibility system.  
**ENEMY_ARCHETYPES:** All.  
**PLAYER_COUNTERPLAY:** Fight below-peer remnants for simpler AI; peer/boss packs roll more modules.  
**EDGE_CASES:** `player.level` 1 vs huge enemy → high `peer`, still legal actions only. Equal high levels → `peer ≈ 0`, role/boss terms dominate.  
**IMPLEMENTATION_COMPLEXITY:** Medium (spawn + persist field; delete `computeAITier` gates).  
**TEST_SCENARIOS:** Same absolute enemy level, player 1 vs player 200 → different attach distributions. Boss flag raises P(T5) at even ratio. Seeded RNG is deterministic.  
**STATUS:** PROPOSED

### AI-SYS-02

**NAME:** Spell score profile registry  
**ROLE:** system  
**SOPHISTICATION:** T1+  
**DECISION_RULES:** Lookup by `spell.id`. If missing, spell is illegal for AI. Profiles use `effectCategory`, `targetType`, `isDotSpell`, `isPhysical`, flags — never `name`.  
**SCORING_MODEL:** §6.  
**SPELL_REQUIREMENTS:** One profile per enemy-usable id.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** Always (kit honesty).  
**ENEMY_ARCHETYPES:** All.  
**PLAYER_COUNTERPLAY:** N/A (authoring rule).  
**EDGE_CASES:** Backend adds a spell without a profile → enemy cannot cast it even if in kit.  
**IMPLEMENTATION_COMPLEXITY:** Medium (table + tests per category).  
**TEST_SCENARIOS:** Inferno/poison EV > 0 despite `damage: 0`. Duplicate DoT EV ≈ 0. Missing profile → not in legal set.  
**STATUS:** PROPOSED

### AI-SYS-03

**NAME:** Bounded legal-action enumerator  
**ROLE:** system  
**SOPHISTICATION:** T1+ (T5 uses the same enum with combo depth 2)  
**DECISION_RULES:** Generate MP-reachable cells from **current MP** (not the constant 3). For each cell, generate payable spells × legal targets. Cap: 64 destinations, 8 spells, 12 targets. T5 may pair (move + spell) or (spell + step-away) if both pay. Abort enum if node count exceeds 256.  
**SCORING_MODEL:** Enumerator only; modules score the list.  
**SPELL_REQUIREMENTS:** Uses profiles for legality.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** Always for any enemy that decides.  
**ENEMY_ARCHETYPES:** All.  
**PLAYER_COUNTERPLAY:** Out-of-MP enemies cannot “budget 3 anyway.”  
**EDGE_CASES:** Slime flood; MP 0; occupied dest; `freeCells` ground spells.  
**IMPLEMENTATION_COMPLEXITY:** High (replace step-budget 3; wire AP/MP on enemy like summons).  
**TEST_SCENARIOS:** MP 1 cannot reach a 3-step tile. AP 2 cannot cast Inferno (5). Depth-2 combo respects leftover AP/MP.  
**STATUS:** PROPOSED

### AI-SYS-04

**NAME:** Explicit role assignment  
**ROLE:** system  
**SOPHISTICATION:** T2+  
**DECISION_RULES:** Spawn sets `enemy.role` from piece/family/admin template. `inferArchetype` becomes a **fallback only** when `role` is missing. Heal-in-kit does not override artillery/queen.  
**SCORING_MODEL:** Role weight vector over features.  
**SPELL_REQUIREMENTS:** Role’s primary kit must be profiled.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** T2+ attach; T0–T1 may stay implicit generic.  
**ENEMY_ARCHETYPES:** All listed roles.  
**PLAYER_COUNTERPLAY:** Readable silhouettes (rook tanks, bishop kites).  
**EDGE_CASES:** Admin custom kit vs role mismatch → clamp to generic + log.  
**IMPLEMENTATION_COMPLEXITY:** Medium (field + spawn table; stop heal-first inference).  
**TEST_SCENARIOS:** Queen + Blood Mend still picks frost/inferno when role is artillery. Knight without role still flanks.  
**STATUS:** PROPOSED

### AI-SYS-05

**NAME:** Apply-layer honesty  
**ROLE:** system  
**SOPHISTICATION:** all  
**DECISION_RULES:** Apply only kit spells that passed legality. Debit AP/MP. Ally heal/buff uses `targetId`. Remove fallback Fire Bolt. Melee = adjacent kit strike or Crush. No betrayal module.  
**SCORING_MODEL:** N/A (correctness).  
**SPELL_REQUIREMENTS:** Apply branch per category the AI may choose.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** Always.  
**ENEMY_ARCHETYPES:** All.  
**PLAYER_COUNTERPLAY:** Mirror and RES work as advertised.  
**EDGE_CASES:** Paper Windstorm miss; reflect; `hitsMultiple`.  
**IMPLEMENTATION_COMPLEXITY:** High (WX apply is large; prefer extracting a pure apply helper, not more WX branches).  
**TEST_SCENARIOS:** Healer ally in range actually heals. Failed frost does not become Fire Bolt. AP 0 cannot cast.  
**STATUS:** PROPOSED

---

## 8. Positioning

### AI-POS-01

**NAME:** Maintain optimal range  
**ROLE:** positioning  
**SOPHISTICATION:** T1  
**DECISION_RULES:** Prefer destination where preferred spell is in `[minRange, maxRange]`, LoS clear, and Chebyshev distance is not adjacent if the kit is ranged.  
**SCORING_MODEL:** `+wRange` if `minRange ≤ dist ≤ maxRange`; `−wMelee` if `dist ≤ 1` and role is kiter/artillery; `−wOor` if out of range.  
**SPELL_REQUIREMENTS:** At least one ranged profile (`range > 1`).  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** `mu ≈ −0.4` (common on peer casters).  
**ENEMY_ARCHETYPES:** kiter, artillery, caster, controller  
**PLAYER_COUNTERPLAY:** Close the gap; break LoS with walls/barriers.  
**EDGE_CASES:** `minRange > 1`; linear-only spells; Paper Windstorm range cut.  
**IMPLEMENTATION_COMPLEXITY:** Low (`findNearestLegalCastTile` exists).  
**TEST_SCENARIOS:** Bishop with frost at dist 1 steps away if MP allows, then holds at dist 3–4.  
**STATUS:** PROPOSED

### AI-POS-02

**NAME:** Retreat from melee  
**ROLE:** positioning  
**SOPHISTICATION:** T1  
**DECISION_RULES:** If adjacent to a threat and role is not tank/berserker/charger-committed, spend leftover MP away after (or instead of) a low-value melee.  
**SCORING_MODEL:** `+wLeaveMelee * (distAfter − distBefore)` for kiter/artillery/healer.  
**SPELL_REQUIREMENTS:** None (move-only legal).  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** `mu ≈ −0.2`.  
**ENEMY_ARCHETYPES:** kiter, artillery, healer, support, summoner  
**PLAYER_COUNTERPLAY:** Corner them; occupy escape tiles.  
**EDGE_CASES:** All exits hazard/occupied → accept melee.  
**IMPLEMENTATION_COMPLEXITY:** Low (`stepAway` exists; fix `kind: "skip"`).  
**TEST_SCENARIOS:** Caster adjacent, MP 2, no cast → steps away, no Fire Bolt.  
**STATUS:** PROPOSED

### AI-POS-03

**NAME:** Approach vulnerable targets  
**ROLE:** positioning  
**SOPHISTICATION:** T1  
**DECISION_RULES:** Path toward the highest-scoring *reachable-this-turn or next* target, not blindly the nearest. Chargers still wait if they cannot commit (current charger `canReach` rule).  
**SCORING_MODEL:** `+wApproach * (1 − dist/max)` × target score.  
**SPELL_REQUIREMENTS:** Melee or short-range kit.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** `mu ≈ −0.5` (already generic).  
**ENEMY_ARCHETYPES:** charger, assassin, tank, generic  
**PLAYER_COUNTERPLAY:** Body-block; put summons in the path.  
**EDGE_CASES:** Unreachable island; portals/void.  
**IMPLEMENTATION_COMPLEXITY:** Low.  
**TEST_SCENARIOS:** Low-HP summon behind the player outscores a full-HP player if killable.  
**STATUS:** PROPOSED

### AI-POS-04

**NAME:** Avoid hazards  
**ROLE:** positioning  
**SOPHISTICATION:** T1  
**DECISION_RULES:** Always prefer non-hazard tiles. Current code only filters when HP < 50%. Ice (slip), lava, spikes, thorned ground, void rift all have public costs — score them even at full HP.  
**SCORING_MODEL:** `−wLava/−wSpike/−wIce/−wThorn` per step; berserker/kamikaze may accept if EV to kill is higher.  
**SPELL_REQUIREMENTS:** None.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** `mu ≈ −0.6` (nearly always).  
**ENEMY_ARCHETYPES:** All except kamikaze-on-detonate.  
**PLAYER_COUNTERPLAY:** Kite across lava; bait onto spikes.  
**EDGE_CASES:** Only path is hazardous → take cheapest or hold.  
**IMPLEMENTATION_COMPLEXITY:** Low (lift HP gate).  
**TEST_SCENARIOS:** Full-HP caster does not stand on lava to gain one tile.  
**STATUS:** PROPOSED

### AI-POS-05

**NAME:** Exploit terrain  
**ROLE:** positioning  
**SOPHISTICATION:** T2  
**DECISION_RULES:** Prefer tiles that break player LoS to backline, choke a corridor, or place the player on a hazard if a push/attract exists.  
**SCORING_MODEL:** `+wCover` if player LoS to ward is blocked after move; `+wChoke` if dest has ≤2 walkable exits and blocks the player’s shortest path; `+wHazardPush` if a legal push lands the player on lava/spikes.  
**SPELL_REQUIREMENTS:** Optional `pushback` / `attract` / `isBarrier` (barrier still `usableByEnemy: false` until profiled).  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** `mu ≈ 0.3`.  
**ENEMY_ARCHETYPES:** controller, tank, protector, artillery  
**PLAYER_COUNTERPLAY:** Don’t stand in 1-tile hallways; bring attract/swap.  
**EDGE_CASES:** Open-field maps → term ≈ 0.  
**IMPLEMENTATION_COMPLEXITY:** Medium (path-block heuristic, not full flow).  
**TEST_SCENARIOS:** Corridor map: tank steps onto the 1-tile neck.  
**STATUS:** PROPOSED

### AI-POS-06

**NAME:** Avoid unnecessary AoE clustering  
**ROLE:** positioning  
**SOPHISTICATION:** T2  
**DECISION_RULES:** Allies keep Chebyshev gap ≥ player’s largest *visible* AoE radius (from the player’s last cast or known starter blast/nova radii on the public spell bar if shown). If unknown, default gap 2.  
**SCORING_MODEL:** `−wCluster * max(0, 2 − minAllyDist)` except when coordinating AI-TEM-05.  
**SPELL_REQUIREMENTS:** None.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** `mu ≈ 0.2`.  
**ENEMY_ARCHETYPES:** All non-kamikaze.  
**PLAYER_COUNTERPLAY:** Forced stacks still work in chokes.  
**EDGE_CASES:** Tiny rooms; guardian must stay adjacent to ward (override).  
**IMPLEMENTATION_COMPLEXITY:** Medium (needs ally positions; already in ctx).  
**TEST_SCENARIOS:** Two casters do not end adjacent in open field. Guardian may stay adjacent to healer.  
**STATUS:** PROPOSED

### AI-POS-07

**NAME:** Protect valuable allies  
**ROLE:** positioning  
**SOPHISTICATION:** T2  
**DECISION_RULES:** Interpose on the ward→threat line at `AI_BACKLINE_GUARD_DISTANCE`. Current `backlineGuardCell` is healer-idle only; attach to protector/tank/guardian.  
**SCORING_MODEL:** `+wGuard` if dest is the guard cell; `+wBodyBlock` if dest is adjacent to ward and on the threat axis.  
**SPELL_REQUIREMENTS:** None; shield/iron-skin bonus if profiled.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** `mu ≈ 0.0` for protector/tank; higher for others.  
**ENEMY_ARCHETYPES:** protector, tank, guardian summon, healer  
**PLAYER_COUNTERPLAY:** Walk around; swap; hit the tank.  
**EDGE_CASES:** No ward; ward is the acting unit.  
**IMPLEMENTATION_COMPLEXITY:** Low (reuse helper).  
**TEST_SCENARIOS:** Protector steps between player and wounded healer.  
**STATUS:** PROPOSED

### AI-POS-08

**NAME:** Maintain escape routes  
**ROLE:** positioning  
**SOPHISTICATION:** T2  
**DECISION_RULES:** After the action, prefer tiles with ≥2 walkable, non-hazard, non-occupied exits. `escapeRouteTriggered` on `Enemy` is unused — use it as a debug flag when the module fires, not as a level gate.  
**SCORING_MODEL:** `+wEscape * exitCount` for kiter/artillery/healer; tanks invert (hold choke).  
**SPELL_REQUIREMENTS:** None.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** `mu ≈ 0.1`.  
**ENEMY_ARCHETYPES:** kiter, artillery, healer, summoner, assassin (after commit)  
**PLAYER_COUNTERPLAY:** Cut exits with summons/barriers.  
**EDGE_CASES:** Corner spawn.  
**IMPLEMENTATION_COMPLEXITY:** Low.  
**TEST_SCENARIOS:** Kiter prefers the tile with two exits over a corner with equal range.  
**STATUS:** PROPOSED

---

## 9. Target selection

### AI-TGT-01

**NAME:** Low-HP bias  
**ROLE:** target  
**SOPHISTICATION:** T1  
**DECISION_RULES:** Keep `wLowHp`. Do not let it beat a true kill on another target (AI-TGT-06).  
**SCORING_MODEL:** Existing `30 * (1 - hp/max)`.  
**SPELL_REQUIREMENTS:** Any damage/DoT/drain.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** Always with T1+.  
**ENEMY_ARCHETYPES:** All damage roles.  
**PLAYER_COUNTERPLAY:** Heal; hide the wounded unit.  
**EDGE_CASES:** `effectiveHp` vs current hp mismatch.  
**IMPLEMENTATION_COMPLEXITY:** None (exists).  
**TEST_SCENARIOS:** Two in-range targets, no kill → lower HP wins.  
**STATUS:** PROPOSED

### AI-TGT-02

**NAME:** High-threat bias  
**ROLE:** target  
**SOPHISTICATION:** T1  
**DECISION_RULES:** Extend threat beyond wisp/healer/summon: player damage-dealers (high visible ATK/SP), controllers (slow/weaken on bar), leaders.  
**SCORING_MODEL:** Table + `0.2 * visibleDpsProxy` (public atk/sp).  
**SPELL_REQUIREMENTS:** Damage kit.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** `mu ≈ −0.3`.  
**ENEMY_ARCHETYPES:** assassin, charger, artillery  
**PLAYER_COUNTERPLAY:** Don’t look like the wisp; keep support off the front.  
**EDGE_CASES:** Player with no summons → player is default threat.  
**IMPLEMENTATION_COMPLEXITY:** Low.  
**TEST_SCENARIOS:** Wisp still outranks a full-HP player for T1 harass.  
**STATUS:** PROPOSED

### AI-TGT-03

**NAME:** Support-unit priority  
**ROLE:** target  
**SOPHISTICATION:** T2  
**DECISION_RULES:** Units that heal/buff (wisp, enemy-visible heal spells on player bar if public) outrank raw HP. Current code only tags `summonAI === healer|wisp`.  
**SCORING_MODEL:** `threat.healer` / `threat.wisp`.  
**SPELL_REQUIREMENTS:** Damage that can reach the backline (range ≥ 3) or assassin mobility.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** `mu ≈ 0.0`.  
**ENEMY_ARCHETYPES:** assassin, artillery, disruptor  
**PLAYER_COUNTERPLAY:** Body-block; keep wisp off LoS.  
**EDGE_CASES:** No support on board → term 0.  
**IMPLEMENTATION_COMPLEXITY:** Low (exists for wisp).  
**TEST_SCENARIOS:** Pack first actor still prefers wisp when focus unset (current 1668–1676).  
**STATUS:** PROPOSED

### AI-TGT-04

**NAME:** Summon response targeting  
**ROLE:** target  
**SOPHISTICATION:** T2  
**DECISION_RULES:** Bombers and low-HP summons are kill-on-sight if they threaten a cluster. Guardian summons are deprioritized unless they body-block the real target.  
**SCORING_MODEL:** `threat.summon` × (bomber 1.4, hunter 1.0, guardian 0.5, wisp 1.6).  
**SPELL_REQUIREMENTS:** Damage.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** `mu ≈ 0.1`.  
**ENEMY_ARCHETYPES:** All.  
**PLAYER_COUNTERPLAY:** Sacrifice a summon to save the player.  
**EDGE_CASES:** Enemy-side summons are allies, never targets.  
**IMPLEMENTATION_COMPLEXITY:** Low.  
**TEST_SCENARIOS:** Bomber in blast range of two allies beats a healthy player.  
**STATUS:** PROPOSED

### AI-TGT-05

**NAME:** Resistance-aware selection  
**ROLE:** target  
**SOPHISTICATION:** T2  
**DECISION_RULES:** Estimate post-mitigation damage using **visible** RES/SR (`AICombatant` must carry them — player snapshot already has both in WX apply). Physical spells use RES; others use SR then RES as the live formula does (WX 16546–16550).  
**SCORING_MODEL:** Replace raw `spell.damage` with `estimateDamageAfterMitigation`.  
**SPELL_REQUIREMENTS:** Damage/drain/DoT profiles.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** `mu ≈ 0.0`.  
**ENEMY_ARCHETYPES:** All damage roles.  
**PLAYER_COUNTERPLAY:** Stack the defense the pack is using.  
**EDGE_CASES:** RES ≥ 100 → clamp incoming to 1 (match apply `Math.max(1, …)`).  
**IMPLEMENTATION_COMPLEXITY:** Medium (extend `AICombatant`; do not change damage math).  
**TEST_SCENARIOS:** High-RES target loses to a low-RES summon for the same raw hit.  
**STATUS:** PROPOSED

### AI-TGT-06

**NAME:** Kill opportunities  
**ROLE:** target  
**SOPHISTICATION:** T1  
**DECISION_RULES:** Keep `applyLethalLookahead`. Estimate must include DoT already on the target if it will tick before they act (public `activeEffects`).  
**SCORING_MODEL:** Existing `wKillable = 100` plus lookahead.  
**SPELL_REQUIREMENTS:** Damage/drain with EV ≥ remaining HP.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** Always T1+.  
**ENEMY_ARCHETYPES:** All.  
**PLAYER_COUNTERPLAY:** Stay above one-shot thresholds; shield.  
**EDGE_CASES:** Overkill spill (existing) when excess > `AI_OVERKILL_SPILL_FRACTION`.  
**IMPLEMENTATION_COMPLEXITY:** Low (fix estimate for DoT/RES).  
**TEST_SCENARIOS:** 1 HP player vs 8 HP summon → player if killable.  
**STATUS:** PROPOSED

### AI-TGT-07

**NAME:** Strategically important targets  
**ROLE:** target  
**SOPHISTICATION:** T3  
**DECISION_RULES:** Prefer the unit that, if removed, collapses a formation: the only healer, the summoner, the marked carry, the player when no summons remain.  
**SCORING_MODEL:** `+wUniqueRole` if they are the last healer/summoner on that side.  
**SPELL_REQUIREMENTS:** Damage.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** `mu ≈ 0.5`.  
**ENEMY_ARCHETYPES:** assassin, controller, artillery  
**PLAYER_COUNTERPLAY:** Redundant supports; don’t be the only healer.  
**EDGE_CASES:** Solo player — this is just “attack the player.”  
**IMPLEMENTATION_COMPLEXITY:** Medium.  
**TEST_SCENARIOS:** Last wisp outranks a damaged hunter summon.  
**STATUS:** PROPOSED

---

## 10. Resource planning

### AI-RES-01

**NAME:** Efficient AP combinations  
**ROLE:** resource  
**SOPHISTICATION:** T3 (T5 depth 2)  
**DECISION_RULES:** Prefer sequences that spend AP without leaving a stranded 1 AP if a 2+ AP spell is the only leftover option. Cheap DoT + melee if both legal.  
**SCORING_MODEL:** `−wWaste * leftoverAp` if leftover < cheapest remaining legal spell and no melee.  
**SPELL_REQUIREMENTS:** Accurate `apCost` (map modifiers: Arcane Surge discount is public).  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** `mu ≈ 0.4`.  
**ENEMY_ARCHETYPES:** All T3+.  
**PLAYER_COUNTERPLAY:** AP-burn (`spell-drain-courage`) to break combos.  
**EDGE_CASES:** Timestep is player-only — AI never assumes a refresh.  
**IMPLEMENTATION_COMPLEXITY:** High (depends on AI-SYS-03).  
**TEST_SCENARIOS:** AP 5: Inferno (5) beats Frost (3) + stranded 2 if Inferno kills; else Frost + Strike.  
**STATUS:** PROPOSED

### AI-RES-02

**NAME:** Movement before attack  
**ROLE:** resource  
**SOPHISTICATION:** T1  
**DECISION_RULES:** If the current cell is illegal for the best spell (range/LoS) and a reachable cell is legal, move then cast in the same turn if AP/MP allow. Already sketched as `closes-in` / `findNearestLegalCastTile`.  
**SCORING_MODEL:** Same U; dest ≠ origin and spell legal from dest.  
**SPELL_REQUIREMENTS:** Any.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** Always T1+.  
**ENEMY_ARCHETYPES:** All.  
**PLAYER_COUNTERPLAY:** Deny the only LoS tile.  
**EDGE_CASES:** Move spends MP; slime flood.  
**IMPLEMENTATION_COMPLEXITY:** Low (exists; must debit MP).  
**TEST_SCENARIOS:** Dist 5, frost range 4, MP 2 → step in and cast.  
**STATUS:** PROPOSED

### AI-RES-03

**NAME:** Attack before retreat  
**ROLE:** resource  
**SOPHISTICATION:** T2  
**DECISION_RULES:** If a legal attack exists and retreat is desired (low HP), take the attack first, then step away with leftover MP. Current retreat often skips the attack (`kind: "skip"`).  
**SCORING_MODEL:** `U(cast+stepAway) > U(stepAway)` when EV > 0.  
**SPELL_REQUIREMENTS:** Damage or cheap debuff.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** `mu ≈ 0.0`.  
**ENEMY_ARCHETYPES:** kiter, artillery, generic  
**PLAYER_COUNTERPLAY:** Finish them on the attack tile before they step.  
**EDGE_CASES:** Attack would use all MP (none left to flee) → still attack if killable.  
**IMPLEMENTATION_COMPLEXITY:** Medium (combo enum).  
**TEST_SCENARIOS:** 25% HP caster in frost range → frost then step away.  
**STATUS:** PROPOSED

### AI-RES-04

**NAME:** Ability sequencing  
**ROLE:** resource  
**SOPHISTICATION:** T3  
**DECISION_RULES:** Buff/mark/expose before a damage spell if both fit in AP and the damage spell is still legal after.  
**SCORING_MODEL:** Profile `synergy` + leftover-AP check.  
**SPELL_REQUIREMENTS:** Profiles for mark, expose, enrage, weaken.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** `mu ≈ 0.6`.  
**ENEMY_ARCHETYPES:** support, disruptor, artillery  
**PLAYER_COUNTERPLAY:** Cleanse / wait out duration.  
**EDGE_CASES:** Mark with no follow-up this or next turn → do not mark.  
**IMPLEMENTATION_COMPLEXITY:** Medium (needs apply for mark/buff).  
**TEST_SCENARIOS:** AP 5: Expose (3) + cannot Strike (2) if Strike not in kit — pick the higher single EV.  
**STATUS:** PROPOSED

### AI-RES-05

**NAME:** Cooldown awareness  
**ROLE:** resource  
**SOPHISTICATION:** T2  
**DECISION_RULES:** `availableSpells` is already cooldown-filtered for **pack** enemies (WX 16357–16360). Summon ctx is **not** (WX 15265). Scorer should still *prefer* to hold a once-every-3 Inferno if a weaker spell does not lose a kill and Inferno will be ready when the player is in a cluster.  
**SCORING_MODEL:** `+wHoldCd` if using the CD spell now has EV only slightly above the filler **and** next-turn cluster is already visible (units already stacked).  
**SPELL_REQUIREMENTS:** `cooldown > 0` profiles.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** `mu ≈ 0.3`.  
**ENEMY_ARCHETYPES:** artillery, controller  
**PLAYER_COUNTERPLAY:** Spread before the CD comes up.  
**EDGE_CASES:** Last living enemy — never hold.  
**IMPLEMENTATION_COMPLEXITY:** Medium.  
**TEST_SCENARIOS:** Inferno CD 3, single target, frost also legal → frost unless Inferno kills.  
**STATUS:** PROPOSED

### AI-RES-06

**NAME:** Avoid wasting AP  
**ROLE:** resource  
**SOPHISTICATION:** T1  
**DECISION_RULES:** Do not cast a heal on full HP, a DoT on a target that already has that `dotType`, or a buff that already exists. Do not melee when a 0-EV skip is better (charger already waits).  
**SCORING_MODEL:** Hard zero / negative on those actions.  
**SPELL_REQUIREMENTS:** Profiles must expose “already applied.” Needs `activeEffects` on ctx.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** Always T1+.  
**ENEMY_ARCHETYPES:** All.  
**PLAYER_COUNTERPLAY:** Bait wasted heals by appearing wounded then shielding.  
**EDGE_CASES:** Refresh vs stack — DoTs stack (`dotStacks.ts`); extra venom may still be EV. Prefer stack only if T3+.  
**IMPLEMENTATION_COMPLEXITY:** Medium (effects on ctx).  
**TEST_SCENARIOS:** Second Poison Arrow on same target scores below Strike if Strike kills.  
**STATUS:** PROPOSED

---

## 11. Role behaviour

Roles are spawn metadata. Weights below are the *identity* of the role; modules still attach separately.

### AI-ROL-01

**NAME:** Tank  
**ROLE:** tank  
**SOPHISTICATION:** T2  
**DECISION_RULES:** Close to the highest-threat enemy (usually the player). Hold chokes. Use iron-skin/shield on self when HP < 70%. Do not retreat at 30% unless the ward is already safe.  
**SCORING_MODEL:** High `wApproach`, high `wChoke`, low `wEscape`, heal/buff self > ally unless ally is the last healer.  
**SPELL_REQUIREMENTS:** `physical_attack` and/or `spell-iron-skin` / `starter-shield`.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** Piece rook / family tank / admin role. `mu ≈ −0.2` when role assigned.  
**ENEMY_ARCHETYPES:** rook, guardian-like  
**PLAYER_COUNTERPLAY:** Walk around; DoT; ignore and kill backline.  
**EDGE_CASES:** No ward → become charger.  
**IMPLEMENTATION_COMPLEXITY:** Medium (new branch; do not reuse healer inference).  
**TEST_SCENARIOS:** Rook walks to the corridor neck, not the wisp.  
**STATUS:** PROPOSED

### AI-ROL-02

**NAME:** Assassin  
**ROLE:** assassin  
**SOPHISTICATION:** T2  
**DECISION_RULES:** Path to the highest `U(kill)` target (wisp, wounded player). Flank tiles. Commit only if killable this or next turn (charger wait + flank).  
**SCORING_MODEL:** High `wKillable`, high `wThreat`, `stepFlank`.  
**SPELL_REQUIREMENTS:** Short-range damage, optional venom/sacrifice.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** Knight/flanker family or admin.  
**ENEMY_ARCHETYPES:** knight, flanker  
**PLAYER_COUNTERPLAY:** Keep the carry above execute; body-block.  
**EDGE_CASES:** No kill window → lurk, do not suicide into tank.  
**IMPLEMENTATION_COMPLEXITY:** Low (flanker exists).  
**TEST_SCENARIOS:** Prefers 2-HP wisp over 80-HP player when both reachable.  
**STATUS:** PROPOSED

### AI-ROL-03

**NAME:** Kiter  
**ROLE:** kiter  
**SOPHISTICATION:** T2  
**DECISION_RULES:** Keep dist ≥ 3. Cast, then step away. Archer summon already does this; promote to first-class enemy role (bishop).  
**SCORING_MODEL:** POS-01 + POS-02 + POS-08.  
**SPELL_REQUIREMENTS:** Ranged damage + optional slow.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** Bishop / archer kit.  
**ENEMY_ARCHETYPES:** bishop, archer summon  
**PLAYER_COUNTERPLAY:** Gap-close; MP burn.  
**EDGE_CASES:** Cornered → melee once, then skip.  
**IMPLEMENTATION_COMPLEXITY:** Medium (split from caster).  
**TEST_SCENARIOS:** Dist 2, frost range 4 → step away before or after cast.  
**STATUS:** PROPOSED

### AI-ROL-04

**NAME:** Healer  
**ROLE:** healer  
**SOPHISTICATION:** T2  
**DECISION_RULES:** Heal the most-wounded *legal* ally (`ENEMY_HEAL_ALLY_THRESHOLD_PCT`). Then guard. Then weak damage. **Must not** steal queen/artillery kits. Apply must heal `targetId` at range > 0.  
**SCORING_MODEL:** Existing decideHealer order, plus POS-07.  
**SPELL_REQUIREMENTS:** `spellType === "heal"` profile; `starter-heal` is self-only (`range: 0`) — cannot be an ally heal. Ally heal needs a ranged heal id or the kit is self-only.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** Explicit healer / wisp.  
**ENEMY_ARCHETYPES:** wisp, dedicated healer piece  
**PLAYER_COUNTERPLAY:** Kill the healer first; stay spread so they walk.  
**EDGE_CASES:** Self-only Blood Mend on a “healer” queen → they are not a pack healer.  
**IMPLEMENTATION_COMPLEXITY:** Medium (apply fix + role assignment).  
**TEST_SCENARIOS:** Ally at 40% HP, heal range 3 → HP increases; player is not meled.  
**STATUS:** PROPOSED

### AI-ROL-05

**NAME:** Support  
**ROLE:** support  
**SOPHISTICATION:** T2  
**DECISION_RULES:** Enrage / haste / shield the highest-threat *ally* that lacks the buff. Do not damage unless no legal buff.  
**SCORING_MODEL:** Buff EV on ally carry; cluster avoid.  
**SPELL_REQUIREMENTS:** `spell-enrage`, `spell-haste`, `starter-shield`, `spell-iron-skin` profiles + apply.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** Admin / king-lite kits.  
**ENEMY_ARCHETYPES:** support, king-without-nuke  
**PLAYER_COUNTERPLAY:** Interrupt; kill support; purge.  
**EDGE_CASES:** All allies already buffed → fallback controller or hold.  
**IMPLEMENTATION_COMPLEXITY:** Medium (apply missing).  
**TEST_SCENARIOS:** Enrage lands on the charger, not the summoner.  
**STATUS:** PROPOSED

### AI-ROL-06

**NAME:** Summoner  
**ROLE:** summoner  
**SOPHISTICATION:** T2  
**DECISION_RULES:** Keep cap/cooldown (`ENEMY_SUMMON_CAP`, `ENEMY_SUMMON_COOLDOWN_TURNS`). Place on a free tile that body-blocks or screens. **When they cannot summon, fall through to generic/caster** — current `decideSummonerAction` returns skip (1828–1875). Placement must be in spell range and `isCellFree` (midpoint today can be a wall).  
**SCORING_MODEL:** Summon EV vs fight EV.  
**SPELL_REQUIREMENTS:** `isSummon` + `usableByEnemy` (wolf/archer only today).  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** Existing summoner chance (`ENEMY_SUMMONER_CHANCE_*`) is a *spawn* rate, not an AI tier. Keep it ratio-scaled if changed, not `characterStats.level * constant` unbounded without a cap (WX 12047–12049 is `0.12 + level * 0.02` and hits 1.0 at level 44 — cap at e.g. 0.35; see AI-FUT-23).  
**ENEMY_ARCHETYPES:** summoner  
**PLAYER_COUNTERPLAY:** Cap the board; kill the summoner; sit on spawn tiles.  
**EDGE_CASES:** Midpoint occupied/void → scan ring around midpoint.  
**IMPLEMENTATION_COMPLEXITY:** Medium.  
**TEST_SCENARIOS:** Cap reached → frost if in kit, not skip. Illegal midpoint → no spawn.  
**STATUS:** PROPOSED

### AI-ROL-07

**NAME:** Controller  
**ROLE:** controller  
**SOPHISTICATION:** T2  
**DECISION_RULES:** Cast slow / frost MP shred / weaken on the player when they have MP to spend or are about to close. Avoid duplicate MP debuffs (TEM-04).  
**SCORING_MODEL:** High debuff EV × `playerMpFrac`.  
**SPELL_REQUIREMENTS:** `starter-frost`, `spell-slow`, `spell-weaken`.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** Bishop/king control kits.  
**ENEMY_ARCHETYPES:** controller, bishop  
**PLAYER_COUNTERPLAY:** Play a low-MP turn; cleanse.  
**EDGE_CASES:** Player already at 0 MP → damage instead.  
**IMPLEMENTATION_COMPLEXITY:** Medium.  
**TEST_SCENARIOS:** Player MP 4 → slow; player MP 0 → frost-for-damage or strike.  
**STATUS:** PROPOSED

### AI-ROL-08

**NAME:** Artillery  
**ROLE:** artillery  
**SOPHISTICATION:** T2  
**DECISION_RULES:** Maximize post-mitigation damage from a safe tile. Inferno/frost/nova. Queen default role **even if** they know Blood Mend.  
**SCORING_MODEL:** High damage EV, POS-01, POS-06.  
**SPELL_REQUIREMENTS:** High AP nukes with profiles (inferno must EV from DoT).  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** Queen / late `levelZone` kits.  
**ENEMY_ARCHETYPES:** queen, artillery  
**PLAYER_COUNTERPLAY:** LoS break; close; SR stack.  
**EDGE_CASES:** Self-heal only when HP < retreat line **and** no legal nuke.  
**IMPLEMENTATION_COMPLEXITY:** Medium (stop heal-first inference).  
**TEST_SCENARIOS:** Queen with heal+frost casts frost on a wounded player, not Blood Mend at 90% HP.  
**STATUS:** PROPOSED

### AI-ROL-09

**NAME:** Disruptor  
**ROLE:** disruptor  
**SOPHISTICATION:** T3  
**DECISION_RULES:** Swap, drain-courage (AP −1), cursed-wound (healRecv), expose. Goal is tempo, not raw DPS.  
**SCORING_MODEL:** Tempo EV: `playerApFrac` × drain-courage; swap EV if it drops the player onto hazard or off a choke.  
**SPELL_REQUIREMENTS:** Those spells profiled + apply (swap today has no enemy apply).  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** `mu ≈ 0.7`.  
**ENEMY_ARCHETYPES:** disruptor  
**PLAYER_COUNTERPLAY:** Stand off hazards; don’t overcap AP.  
**EDGE_CASES:** Swap with no better cell → do not cast.  
**IMPLEMENTATION_COMPLEXITY:** High (new apply).  
**TEST_SCENARIOS:** Player on safe tile, swap dest is lava → swap. Reverse → no swap.  
**STATUS:** PROPOSED

### AI-ROL-10

**NAME:** Protector  
**ROLE:** protector  
**SOPHISTICATION:** T2  
**DECISION_RULES:** Guard cell + shield ward. Attack only if the ward is safe and a target is adjacent. Distinct from tank (tank holds the player; protector holds the ally).  
**SCORING_MODEL:** POS-07 + support buffs on ward.  
**SPELL_REQUIREMENTS:** Shield / iron-skin.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** Golem / sentinel-like (sentinel summon is player-only today).  
**ENEMY_ARCHETYPES:** protector, guardian  
**PLAYER_COUNTERPLAY:** Pull the ward; AoE both.  
**EDGE_CASES:** Ward dead → become tank.  
**IMPLEMENTATION_COMPLEXITY:** Low–medium.  
**TEST_SCENARIOS:** Steps onto guard cell even if a 1-damage melee is available.  
**STATUS:** PROPOSED

---

## 12. Team behaviour

Needs a small **public blackboard** already half-present: `focusTargetId`, `focusAlreadySet`, `markFocusSet` (ctx 268–275). Extend with `plannedAoECell`, `protectedIds`, `appliedDebuffsThisTurn`. One pack, one board, cleared each round.

### AI-TEM-01

**NAME:** Focus fire  
**ROLE:** team  
**SOPHISTICATION:** T3  
**DECISION_RULES:** First eligible actor sets focus via TGT scoring. Others add `focusBonus` unless overkill spill redirects. Exists in skeleton form.  
**SCORING_MODEL:** `+wFocus` if `target.id === focusTargetId`.  
**SPELL_REQUIREMENTS:** Damage.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** `mu ≈ 0.3` (`groupTactics` gate 4 was a level-tier — delete that meaning).  
**ENEMY_ARCHETYPES:** All non-healer-primary.  
**PLAYER_COUNTERPLAY:** Peel; body-block; overheal the focused unit.  
**EDGE_CASES:** Focus dies mid-round → re-roll once.  
**IMPLEMENTATION_COMPLEXITY:** Low (exists).  
**TEST_SCENARIOS:** Second enemy attacks the same id as the first.  
**STATUS:** PROPOSED

### AI-TEM-02

**NAME:** Protect support  
**ROLE:** team  
**SOPHISTICATION:** T3  
**DECISION_RULES:** If a healer/support is threatened (player adjacent or in range), nearest tank/protector activates POS-07; others may hold fire one turn to interpose if they cannot kill.  
**SCORING_MODEL:** `+wSaveSupport` on guard actions when ward `hpFrac < 0.5` and threat in range.  
**SPELL_REQUIREMENTS:** None.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** `mu ≈ 0.4`; requires a support ally.  
**ENEMY_ARCHETYPES:** tank, protector, charger  
**PLAYER_COUNTERPLAY:** Threaten two supports; they cannot cover both.  
**EDGE_CASES:** Support is the only enemy.  
**IMPLEMENTATION_COMPLEXITY:** Medium.  
**TEST_SCENARIOS:** Player adjacent to healer → rook steps in, does not chase a far summon.  
**STATUS:** PROPOSED

### AI-TEM-03

**NAME:** Exploit allied debuffs  
**ROLE:** team  
**SOPHISTICATION:** T3  
**DECISION_RULES:** If the target has public expose/weaken/mark, prefer damage on that target.  
**SCORING_MODEL:** `+wMark` / `+wExpose` from `activeEffects`.  
**SPELL_REQUIREMENTS:** Damage; allies must have applied the debuff (apply must set effects).  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** `mu ≈ 0.5`.  
**ENEMY_ARCHETYPES:** artillery, assassin  
**PLAYER_COUNTERPLAY:** Don’t stay marked.  
**EDGE_CASES:** Mark on a tile vs unit — use public mark store if any.  
**IMPLEMENTATION_COMPLEXITY:** Medium.  
**TEST_SCENARIOS:** Marked player outscores an unmarked lower-HP summon.  
**STATUS:** PROPOSED

### AI-TEM-04

**NAME:** Avoid duplicate debuffs  
**ROLE:** team  
**SOPHISTICATION:** T3  
**DECISION_RULES:** Second slow/frost-MP on the same target this duration scores ~0. Use damage instead.  
**SCORING_MODEL:** Profile `synergy` ≈ 0 when `debuffStat` already present.  
**SPELL_REQUIREMENTS:** Debuff profiles.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** `mu ≈ 0.4`.  
**ENEMY_ARCHETYPES:** controller, kiter  
**PLAYER_COUNTERPLAY:** You only need one cleanse.  
**EDGE_CASES:** Different stats (MP vs DMG) still stack.  
**IMPLEMENTATION_COMPLEXITY:** Low once effects are on ctx.  
**TEST_SCENARIOS:** Two bishops: first slows, second frosts for damage or switches target.  
**STATUS:** PROPOSED

### AI-TEM-05

**NAME:** Coordinated AoE  
**ROLE:** team  
**SOPHISTICATION:** T3  
**DECISION_RULES:** Blackboard `plannedAoECell`. Allies may **cluster the player** (override POS-06) if an inferno/nova ally is about to act and ≥ `AI_KAMIKAZE_MIN_TARGETS` hostiles would be hit. Friendly fire weight is high.  
**SCORING_MODEL:** AoE EV over public positions only.  
**SPELL_REQUIREMENTS:** `aoe` / `hitsMultiple` / radius profiles (`frost-nova`, `lifesteal-nova`). Inferno is single-target DoT in data — do not pretend it is a blast (kamikaze hardcodes radius; that is summon-only).  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** `mu ≈ 0.6` and ≥1 AoE profile in the pack.  
**ENEMY_ARCHETYPES:** artillery, controller  
**PLAYER_COUNTERPLAY:** Spread.  
**EDGE_CASES:** Ally in the blast → cancel unless kamikaze.  
**IMPLEMENTATION_COMPLEXITY:** Medium.  
**TEST_SCENARIOS:** Two player-side units in radius 2 → nova; one unit → single-target frost.  
**STATUS:** PROPOSED

### AI-TEM-06

**NAME:** Positioning formations  
**ROLE:** team  
**SOPHISTICATION:** T3  
**DECISION_RULES:** Soft slots: tank front, protector on ward axis, artillery back, kiter side. Score dest vs slot, not a scripted dance.  
**SCORING_MODEL:** `−wSlot * dist(dest, slotHint)`.  
**SPELL_REQUIREMENTS:** None.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** `mu ≈ 0.5` and pack size ≥ 3.  
**ENEMY_ARCHETYPES:** Mixed packs.  
**PLAYER_COUNTERPLAY:** Collapse the backline first.  
**EDGE_CASES:** 1v1 → off.  
**IMPLEMENTATION_COMPLEXITY:** Medium.  
**TEST_SCENARIOS:** 3-pack open field: rook closer to player than queen.  
**STATUS:** PROPOSED

### AI-TEM-07

**NAME:** Retreat toward support  
**ROLE:** team  
**SOPHISTICATION:** T3  
**DECISION_RULES:** Wounded non-tanks `stepToward` the healer/support if one exists, not only `stepAway` from the player (current retreat).  
**SCORING_MODEL:** `+wToSupport * (1 − distToHealer)`.  
**SPELL_REQUIREMENTS:** A living support ally.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** `mu ≈ 0.3`.  
**ENEMY_ARCHETYPES:** generic, kiter, artillery  
**PLAYER_COUNTERPLAY:** Cut the path to the healer.  
**EDGE_CASES:** Healer is the threat’s adjacent — don’t path through the player if avoidable.  
**IMPLEMENTATION_COMPLEXITY:** Low.  
**TEST_SCENARIOS:** 20% HP bishop steps toward wisp-equivalent ally, not into a corner.  
**STATUS:** PROPOSED

---

## 13. Advanced behaviour

All of this uses **public** combat state only.

### AI-ADV-01

**NAME:** Estimate player threat  
**ROLE:** advanced  
**SOPHISTICATION:** T4  
**DECISION_RULES:** Proxy = visible atk/sp, last public damage this battle (if logged), remaining summons, current AP/MP. Raise retreat/guard weights when proxy is high; raise aggression when proxy is low.  
**SCORING_MODEL:** `threatPlayer` multiplies survival vs aggression (ADV-08).  
**SPELL_REQUIREMENTS:** None.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** `mu ≈ 0.8`.  
**ENEMY_ARCHETYPES:** All T4+.  
**PLAYER_COUNTERPLAY:** Play low-AP turns to look poor, then dump.  
**EDGE_CASES:** First turn of battle — use stats only.  
**IMPLEMENTATION_COMPLEXITY:** Medium.  
**TEST_SCENARIOS:** Player AP 1, low atk → kiter holds range less aggressively.  
**STATUS:** PROPOSED

### AI-ADV-02

**NAME:** Punish predictable positioning  
**ROLE:** advanced  
**SOPHISTICATION:** T4  
**DECISION_RULES:** Remember the player’s last 1–2 **public** cells this battle (`playerPosHistory` on the blackboard). If they re-enter the same cell, pre-aim that tile (AoE/ground) or hold a choke.  
**SCORING_MODEL:** `+wRepeatTile` if dest/target matches history.  
**SPELL_REQUIREMENTS:** Optional ground/AoE.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** `mu ≈ 1.0`.  
**ENEMY_ARCHETYPES:** artillery, controller, tank  
**PLAYER_COUNTERPLAY:** Do not stand in the same tile.  
**EDGE_CASES:** First visit → 0. No hidden path prediction.  
**IMPLEMENTATION_COMPLEXITY:** Medium.  
**TEST_SCENARIOS:** Player ends two turns on (4,4) → nova/center bias on (4,4).  
**STATUS:** PROPOSED

### AI-ADV-03

**NAME:** Adapt to player HP  
**ROLE:** advanced  
**SOPHISTICATION:** T4  
**DECISION_RULES:** Player `hpFrac < 0.3` → pack shifts to kill (TEM-01, TGT-06). Player `hpFrac > 0.8` → allow setup (debuff/buff).  
**SCORING_MODEL:** Scale `wKillable` / `wDebuff` by player HP band.  
**SPELL_REQUIREMENTS:** None.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** `mu ≈ 0.7`.  
**ENEMY_ARCHETYPES:** All T4+.  
**PLAYER_COUNTERPLAY:** Stay in the middle band; bait execute.  
**EDGE_CASES:** Summons low, player high → still TGT-04.  
**IMPLEMENTATION_COMPLEXITY:** Low.  
**TEST_SCENARIOS:** Player 10% HP → frost over slow.  
**STATUS:** PROPOSED

### AI-ADV-04

**NAME:** Adapt to player AP/MP  
**ROLE:** advanced  
**SOPHISTICATION:** T4  
**DECISION_RULES:** High player MP → slow/frost-MP and hold chokes. Low player AP → safer to walk into their range. Values must be the **current public** AP/MP (initiative UI / last turn end), not predicted spends.  
**SCORING_MODEL:** Controller weights × `playerMpFrac`; tank approach × `(1 - playerApFrac)`.  
**SPELL_REQUIREMENTS:** Control spells for the MP branch.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** `mu ≈ 0.8`.  
**ENEMY_ARCHETYPES:** controller, tank, kiter  
**PLAYER_COUNTERPLAY:** Fake a spent bar if the UI shows it; otherwise play honestly.  
**EDGE_CASES:** Hidden AP (if any) must not be read — if it is not on the combatant snapshot, treat as unknown and disable this module.  
**IMPLEMENTATION_COMPLEXITY:** Medium (pass AP/MP into `AICombatant`).  
**TEST_SCENARIOS:** Player MP 0 → no slow. Player AP 8 → tank does not walk to dist 1.  
**STATUS:** PROPOSED

### AI-ADV-05

**NAME:** Respond to summons  
**ROLE:** advanced  
**SOPHISTICATION:** T4  
**DECISION_RULES:** On summon spawn (public), retarget per TGT-04 and optionally collapse on the summoner (ROL-06 / TGT-07).  
**SCORING_MODEL:** Event bump on the blackboard for one round.  
**SPELL_REQUIREMENTS:** Damage.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** `mu ≈ 0.6`.  
**ENEMY_ARCHETYPES:** All.  
**PLAYER_COUNTERPLAY:** Summon after they have acted.  
**EDGE_CASES:** Enemy summons ignored.  
**IMPLEMENTATION_COMPLEXITY:** Low.  
**TEST_SCENARIOS:** Wisp spawn this turn → focus moves off the player if no kill.  
**STATUS:** PROPOSED

### AI-ADV-06

**NAME:** Respond to status effects  
**ROLE:** advanced  
**SOPHISTICATION:** T4  
**DECISION_RULES:** If the player is slowed, walk in. If the enemy is exposed, retreat/guard. If a DoT is on the player and they are in kill band, finish.  
**SCORING_MODEL:** Weight tweaks from public `activeEffects`.  
**SPELL_REQUIREMENTS:** None.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** `mu ≈ 0.7`.  
**ENEMY_ARCHETYPES:** All T4+.  
**PLAYER_COUNTERPLAY:** Don’t attack while exposed.  
**EDGE_CASES:** Unknown custom `buffStat` → ignore.  
**IMPLEMENTATION_COMPLEXITY:** Medium.  
**TEST_SCENARIOS:** Player has MP −2 → charger `canReach` treats remaining MP as reduced **only if** that is how apply works (do not invent extra reduction).  
**STATUS:** PROPOSED

### AI-ADV-07

**NAME:** Alter behaviour as own HP falls  
**ROLE:** advanced  
**SOPHISTICATION:** T2 (bands) / T4 (role swap)  
**DECISION_RULES:** Reuse `ENEMY_RETREAT_HP_PCT` (0.3) and `ENEMY_WOUNDED_SACRIFICE_HP_PCT` (0.2). T4 may swap weights: artillery → self-heal; berserker → sacrifice eligible (already). Do not change role to healer just because HP is low.  
**SCORING_MODEL:** Band multipliers on retreat / sacrifice / heal-self.  
**SPELL_REQUIREMENTS:** Optional self-heal.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** Retreat `mu ≈ −0.3`; swap `mu ≈ 0.8`.  
**ENEMY_ARCHETYPES:** All except berserker (no retreat).  
**PLAYER_COUNTERPLAY:** Pressure the backline to force retreats.  
**EDGE_CASES:** Enrage 6× is apply-layer, not this module.  
**IMPLEMENTATION_COMPLEXITY:** Low.  
**TEST_SCENARIOS:** Caster at 25% retreats; berserker at 15% still advances.  
**STATUS:** PROPOSED

### AI-ADV-08

**NAME:** Survival vs aggression  
**ROLE:** advanced  
**SOPHISTICATION:** T4  
**DECISION_RULES:** Single knob `stance = clamp(aggression − survival, −1, 1)` from ADV-01/03/07. Positive → TGT-06/charge; negative → POS-02/08/heal.  
**SCORING_MODEL:** Multiplies role weights.  
**SPELL_REQUIREMENTS:** None.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** `mu ≈ 0.9`.  
**ENEMY_ARCHETYPES:** All T4+.  
**PLAYER_COUNTERPLAY:** Force survival (threaten) or punish greed (look weak).  
**EDGE_CASES:** T5 boss may lock stance by phase (`useBossAI` phases stay authoritative for bosses).  
**IMPLEMENTATION_COMPLEXITY:** Medium.  
**TEST_SCENARIOS:** High player threat + low own HP → stance < 0 → no charger suicide.  
**STATUS:** PROPOSED

---

## 14. Tier 6+ future modules (stackable)

These are **not** a final boss form. They attach when `score` is high *relative to the player*, including both-level-900 peer fights that still want new toys later.

Full proposal blocks: [`ENEMY_AI_EVOLUTION_2026-09-01.md`](./ENEMY_AI_EVOLUTION_2026-09-01.md) §4 (FUT-01…23) and [`ENEMY_AI_EVOLUTION_2026-09-02.md`](./ENEMY_AI_EVOLUTION_2026-09-02.md) §4 (FUT-24…35).

| AI_ID | NAME | Idea (still legal, still bounded) |
| :--- | :--- | :--- |
| AI-FUT-01 | Bait tile | Stand one tile off optimal to invite a predictable player step (uses ADV-02 history). |
| AI-FUT-02 | Pack cooldown rotation | Blackboard: only one Inferno this round unless a kill. |
| AI-FUT-03 | Fake retreat | Step away then spend leftover AP on a still-legal cast (needs combo enum). |
| AI-FUT-04 | Summon screen | Summoner places wolf on the player’s last approach vector. |
| AI-FUT-05 | Hazard escort | Push/attract after an ally has stacked the player on a tile (needs those applies). |
| AI-FUT-06 | Next-actor tempo | Weight actions by who is next on the **public** initiative list. |
| AI-FUT-07 | Visible player kit | Threat from the on-bar spell ids the enemy can see, not hidden book. |
| AI-FUT-08 | Family / reflect honesty | Score void_mirror / ember burn only from public family hooks. |
| AI-FUT-09 | Differentiated hazards | Ice ≠ lava ≠ spikes (current filter treats them the same). |
| AI-FUT-10 | Occupy escape | Stand on the player’s last exit tile. |
| AI-FUT-11 | Surround / split | Soft opposite-side slots when pack ≥ 3. |
| AI-FUT-12 | Friendly-blast avoid | Do not end in a bomber / nova ally footprint. |
| AI-FUT-13 | Lead tile | Bias ground/AoE one step along last public move vector. |
| AI-FUT-14 | Overwatch hold | Skip when the only good play is waiting on a choke. |
| AI-FUT-15 | Buff hygiene | Do not recast shield/iron-skin if public effect already present. |
| AI-FUT-16 | Linear corridor | Prefer cardinal/diagonal dest for `linear` / `diagonal` spells. |
| AI-FUT-17 | Elite extra-spell honesty | Extra `usableByEnemy` ids need profiles or they stay unused. |
| AI-FUT-18 | Post-player tempo | After a public spent bar, raise approach / lower control. |
| AI-FUT-19 | Multi-hit EV | `hitsMultiple` / `hitTiles` sum, minus friendly fire. |
| AI-FUT-20 | Boss phase overlay | `useBossAI` phases become enumerator weights, not a second brain. |
| AI-FUT-21 | Public miss chance | Paper Windstorm range-cut is public — score expected miss. |
| AI-FUT-22 | Swap / mark / sacrifice | Category profiles + apply before any kit emits those ids. |
| AI-FUT-23 | Summoner relative cap | Cap spawn chance; when summon is illegal, fall through to kit. |
| AI-FUT-24 | Authored-hazard scoring | Boss lava/shock/void on `currentMap.hazardTiles` use FUT-09 costs. |
| AI-FUT-25 | DoT stack EV | Additive stacks (`dotStacks.ts`); extra venom is EV, not zero. |
| AI-FUT-26 | Path-aware commit | Charger wait uses BFS/MP, not Chebyshev `budget+1`. |
| AI-FUT-27 | Split / clone blackboard | Minions inherit parent `aiModules`; share TEM/focus. |
| AI-FUT-28 | Public objective tiles | Anchors: body-block only as FUT-10, no private win-con. |
| AI-FUT-29 | Sacrifice vs wounded log | HP flag does not emit `spell-sacrifice`. |
| AI-FUT-30 | Chain on public shock | Profiled chain only along public shock/occupants. |
| AI-FUT-31 | Mark tile vs unit | Score `targetType`, not flavour text. |
| AI-FUT-32 | Initiative strip AP/MP | ADV-04 source is the public strip (SYS-10). |
| AI-FUT-33 | Sim kit twin | `longHorizonSim` must call production kit helper. |
| AI-FUT-34 | Mirror last-spell | Pack SR/physical bias; no combo replay. |
| AI-FUT-35 | Barrier / ground gate | Manhattan ground; keep `usableByEnemy: false` until profiled. |

Each module is **STATUS: PROPOSED**. Implement only after SYS-01…SYS-05 (and SYS-06…SYS-21 where the module depends on legality).

---

## 15. Role × module matrix (minimum attach)

| Role | Always (if T2) | Common extras |
| :--- | :--- | :--- |
| tank | POS-03, POS-05, ROL-01 | TEM-02, POS-07 |
| assassin | POS-03, TGT-06, ROL-02 | TGT-03, TEM-01 |
| kiter | POS-01, POS-02, POS-08, ROL-03 | RES-03, ADV-04 |
| healer | ROL-04, POS-07 | TEM-07 (as destination) |
| support | ROL-05, RES-04 | TEM-03 |
| summoner | ROL-06 | FUT-04 |
| controller | ROL-07, TEM-04 | ADV-04, TEM-05 |
| artillery | ROL-08, POS-01, POS-06 | RES-05, TEM-05 |
| disruptor | ROL-09 | ADV-02 |
| protector | ROL-10, POS-07 | TEM-02 |
| generic / T0 | TGT-01, nearest | none |

---

## 16. What later PRs must not do

- Do not implement production AI in the same change as this catalog unless a human explicitly asks.
- Do not touch RAF, map generation, turn order, or damage formulas. Scoring **reads** RES/SR; it does not change `calcScaledDamage`.
- Do not reintroduce `computeAITier` bands or `ENEMY_AI_TIER_GATES` as level unlocks.
- Do not implement `instantKill`.
- Do not keep Betrayal as a sophistication feature.
- Do not invent Fire Bolt / kit-less ranged melee.
- Do not infer role from `spell.name` or “has heal.”
- Do not give enemies `usableByEnemy` spells without profile + apply.
- Do not read hidden player intent, unrevealed RNG, or off-UI AP.
- Do not add unbounded search (full game-tree, per-tile Dijkstra for every enemy every spell).

---

## 17. Suggested implementation slices (complexity, not calendar)

Each slice should be its own PR with `engine/enemyAI*.test.ts` and zero WX drive-by refactors.

1. **Honesty (SYS-05)** — Fire Bolt removal, AP/MP debit, ally heal/buff apply. Highest correctness value.  
2. **Enumerator + profiles (SYS-02, SYS-03, SYS-06, SYS-07)** — legal set matches the player, including `minRange` / linear / diagonal / freeCells and **actual MP**.  
3. **Kit width + snapshot (SYS-09, SYS-10)** — stop passing the `levelZone` object; put public AP/MP/RES/SR/effects on `AICombatant`.  
4. **Eligibility + roles (SYS-01, SYS-04, ROL-*)** — delete `computeAITier` behaviour.  
5. **Positioning / targets (POS-*, TGT-05, SYS-08)** — lift hazard gate; RES-aware estimate; **read** focus id.  
6. **Team blackboard (TEM-*)**.  
7. **Adaptive (ADV-*)** — only after AP/MP are on `AICombatant`.  
8. **T6+ modules** — [`ENEMY_AI_EVOLUTION_2026-09-01.md`](./ENEMY_AI_EVOLUTION_2026-09-01.md) then [`ENEMY_AI_EVOLUTION_2026-09-02.md`](./ENEMY_AI_EVOLUTION_2026-09-02.md). Stack; do not replace T0–T5.  
9. **New spells** — one profile + apply + test per id.

Bosses stay on `useBossAI` until slice 6; then T5 may call the same enumerator with a phase weight overlay.

---

## 18. Test scenarios (pack-level)

| ID | Setup | Expect |
| :--- | :--- | :--- |
| TS-LEGAL | Wall between caster and player, frost in Chebyshev range | No cast; reposition or hold. |
| TS-AP | Enemy AP 2, Inferno cost 5 | Inferno absent from legal set. |
| TS-MP | Enemy MP 0, dest 1 tile away | No walk. |
| TS-HEAL | Healer, ally 40% HP in range 3 | Ally HP up; no player melee. |
| TS-QUEEN | Queen kit heal+frost, role artillery, 90% HP | Frost, not Blood Mend. |
| TS-DOT | Inferno vs 20 HP, no other damage | Inferno chosen (EV from ticks). |
| TS-DUP | Target already slowed | Second controller does not slow. |
| TS-REL | Same enemy level, player 5 vs player 50 | Attach distributions differ; no `level===50` assert. |
| TS-BOLT | Cast fails range | Adjacent Crush or skip; never Fire Bolt. |
| TS-HAZ | Full HP, lava step vs equal safe step | Safe tile. |
| TS-FOCUS | Two chargers, one wounded summon | Both melee the summon if legal. |
| TS-BOSS | Boss phase 2 | Still LoS/range/AP; no instant kill. |

---

## 19. Mapping from requested capability list

| Request | Primary AI_ID |
| :--- | :--- |
| maintain optimal range | AI-POS-01 |
| retreat from melee | AI-POS-02 |
| approach vulnerable targets | AI-POS-03 |
| avoid hazards | AI-POS-04 |
| exploit terrain | AI-POS-05 |
| avoid unnecessary AoE clustering | AI-POS-06 |
| protect valuable allies | AI-POS-07 |
| maintain escape routes | AI-POS-08 |
| low-HP targets | AI-TGT-01 |
| high-threat targets | AI-TGT-02 |
| support units | AI-TGT-03 |
| summons | AI-TGT-04 |
| resistance-aware selection | AI-TGT-05 |
| kill opportunities | AI-TGT-06 |
| strategically important targets | AI-TGT-07 |
| efficient AP combinations | AI-RES-01 |
| movement before attack | AI-RES-02 |
| attack before retreat | AI-RES-03 |
| ability sequencing | AI-RES-04 |
| cooldown awareness | AI-RES-05 |
| avoid wasting AP | AI-RES-06 |
| tank … protector | AI-ROL-01 … AI-ROL-10 |
| focus fire … retreat toward support | AI-TEM-01 … AI-TEM-07 |
| estimate player threat … survival vs aggression | AI-ADV-01 … AI-ADV-08 |

Every row above is **STATUS: PROPOSED**.
