# Advanced Enemy AI Evolution — 2026-09-02 increment

**Status:** PROPOSED (design only; no production code in this change)  
**Date:** 2026-09-02  
**Parent catalog:** [`ENEMY_AI_EVOLUTION.md`](./ENEMY_AI_EVOLUTION.md) (T0–T5)  
**Prior increment:** [`ENEMY_AI_EVOLUTION_2026-09-01.md`](./ENEMY_AI_EVOLUTION_2026-09-01.md) (SYS-06…SYS-12, FUT-01…FUT-23)  
**Implementer ledger:** [`automation/ACTION_IDS_AEE_2026-09-02.md`](./automation/ACTION_IDS_AEE_2026-09-02.md)

This increment re-reads the live engine after the 2026-09-01 catalog. T0–T5 and FUT-01…FUT-23 stay **PROPOSED** and are not restated here unless a line number or a fact changed. New work is: WX line-number drift, honesty gaps the first two passes missed, system modules that make T6+ legal on **both** decide brains (pack + summon + boss), and reusable T6+ scorers that can keep attaching as relative difficulty rises.

Stralt has **no character level cap**. Nothing here maps `if (level >= X) sophistication = Y`. Tiers remain conceptual. Eligibility remains the parent §4 sigmoid (`peer = log2(enemy.level / player.level)` plus pack/boss/modifier terms). A year-later peer fight at any absolute level can attach a new module without raising a cap.

**Hard rules (unchanged):** no cheat, no hidden player information, no ignored LoS/range/AP/MP, no unbounded search, no kit-less Fire Bolt, no `instantKill`, no betrayal-as-difficulty, no name-based spell heuristics, no production AI in this change.

---

## 1. Re-read (2026-09-02) — what moved

All line numbers are from this checkout. Re-read them before implementing. The 2026-09-01 WX cites are **stale** (the file shrank); behaviour did not.

### 1.1 Line-number drift (WX / decide)

| Fact | 2026-09-01 cite | Live (2026-09-02) |
| :--- | :--- | :--- |
| `computeAITier` bands + 30% scramble | `combatMath.ts` 36–52 | **unchanged** 36–52 |
| Spawn `aiTier: computeAITier(enemyLevel)` | WX 6408, 6536 | WX **5823**, **5951** |
| Stale comment “10 random spells” then kit assign | WX 12479–12487 | WX **12030–12038** |
| Summoner chance `BASE + player.level * PER` | WX 12496–12507 | WX **12047–12057** |
| `aiTier >= 5` erratic (log wild-cast, no apply) | WX 15956–16040 | WX **15597–15679** |
| `aiTier >= 10` 5% betrayal + 6× enrage | WX 16043+ | WX **15683–15700+** |
| Pack `aiCombatants` snapshot | WX 16722–16751 | WX **16362–16391** |
| Pack decide/apply try | WX ~16705 | WX **16454–16472** decide; apply **16537+** |
| Apply range = Chebyshev only (no LoS re-check) | (implied) | WX **16540–16544** |
| Self-heal `spellType === "heal" && spellRange === 0` | WX 17083 | WX **16736** |
| Fallback Crush **or Fire Bolt** (`nd <= 1` Chebyshev) | WX 17145–17150 | WX **16792–16800** |
| `decideEnemyAction` | 1648–1692 | **1649–1693** |
| `setFocusTargetId` writers | 939 / 1525 | **940** / **1526** |
| `decideSummonerAction` skip on cap/CD | 1827–1873 | **1819–1893** |
| Guardian recast (no effects on snapshot) | 2111–2117 | **2111–2128** |
| Charger `canReach` Chebyshev vs `budget+1` | 1178 | **1178–1179** |
| `pickBossKitSpell` + empty `Map` | `useBossAI.ts` 38–54 / 169–173 | **unchanged** |

`ENEMY_AI_TIER_GATES` (`gameConstants.ts` 200–209) is still unread by `enemyAI.ts` (comment only at 1405–1406). Master toggles (lethal lookahead, LoS reposition, backline, overkill spill) are still **global on**, not relative-eligibility modules.

### 1.2 Still true (do not re-file as new)

- `buildEnemyKit(..., currentMap.levelZone)` still floors an object → NaN → zone-0 kits (WX 12035, `enemyAI.ts` 192). AI-SYS-09.
- `scoreTargets` still ignores `ctx.focusTargetId` (502–525). AI-SYS-08.
- `estimateDamage` still returns 0 when `spell.damage <= 0` (475–476). Inferno/poison lose `pickBestDamageSpell`.
- `inferArchetype` still heal-first (423–426).
- `filterHazardCandidates` still HP < 50% (399–414); ice/lava/spikes identical.
- Retreat still returns `kind: "skip"` while moving (caster 910–925).
- Summoner overlay still `0.12 + characterStats.level * 0.02` (constants 298–299; comment at 295 still says “levelZone”). Hits 1.0 at player level 44. AI-FUT-23.
- `getEffectiveStat` is **wired** on the pack ctx (WX 16435–16436) and still **unused** by `estimateDamage`.

### 1.3 New honesty gaps (this increment)

1. **`isTileCastableLive` is player-centric.** Parent SYS-06 said “extract from `isTileCastableLive`.” The live helper’s `ally` branch only accepts `e.side === "player"` summons (`targeting.ts` 476–495). `minRange` defaults to **1** (427). `spellRangeBase` uses `maxRange ?? max(1, Number(range))` (111–115). Sharing it unchanged would make enemy ally-heals illegal and would apply player LoS (opt-in, 122–126) to enemies. SYS-13.
2. **Summon decide occupancy is empty.** Pack snapshot fills `aiOccupied` (WX 16397–16404). Summon snapshot allocates `new Set()` and never adds tiles (WX **15250**), then passes it as `ctx.occupied` (15260). `computeReachable` therefore treats other combatants as air. The executor later blocks occupied dests (`summonExecutor.ts` 119–123) — the summon **looks** at a path through the player, then the move is rejected. SYS-14.
3. **Summon `availableSpells` is unfiltered.** Pack filters cooldown + `usableByEnemy` (WX 16357–16360). Summon ctx sets `availableSpells: summonEnemy.spells ?? []` (WX 15265–15266). `findKitSpell` prefers available (1724–1731), so CD spells stay “ready.” SYS-14.
4. **Movement cost metric split.** Decide BFS is 4-directional with `ENEMY_REACHABLE_STEP_BUDGET` (`enemyAI.ts` 343–352). Summon apply charges **Chebyshev teleport** MP (`summonExecutor.ts` 56, 125–126). A dest three cardinal steps away that is Chebyshev 2 underpays; a 4-dir path of 3 to a Chebyshev-2 tile is a cheaper bill than the walk. Pack apply commits dest then range-checks from `newX/newY` (WX 16509–16544) without debiting MP at all (SYS-05). SYS-15.
5. **Charger commit is Chebyshev, not path.** `canReach = dist <= ENEMY_REACHABLE_STEP_BUDGET + 1` (1178–1179) ignores walls. A charger four Chebyshev away behind a maze still “commits.” FUT-26.
6. **Boss second brain still bypasses decide.** Every `decide*Action` prefers `pickBossKitSpell(..., new Map())` — first pool id, no range, no LoS, no AP/MP. Bone Cavalier `KNIGHT_JUMP_IGNORE_WALLS` (`useBossAI.ts` 408–438) is a **named boss ability** (telegraphed); do not copy wall-ignore to pack AI. Final Pawn kit-less ranged when `manhattan 1 < d <= 3` (992–1001) is the same class of cheat as Fire Bolt. Chessboard Lich `currentTurn % 1 === 0` (1152) is always true — rotate every turn; not a sophistication module. SYS-16.
7. **Summon archetype from `name.includes`.** `inferSummonArchetype` (195–217) falls back to `"wolf"` / `"golem"` / `"wisp"` in `summon.name`. Spell scoring already forbids name heuristics; summon routing must too. SYS-17.
8. **Dormant `Enemy` fields are not AI tiers.** `intelligence` is written `0` on boss minions (WX 16248). `campTurnCount` / `escapeRouteTriggered` (`gameTypes.ts` 339–340) are unused by decide. Do not revive them as `if (intelligence >= 5)` or `if (level >= X)`. SYS-18.
9. **Overkill spill does not splash.** `applyOverkillSpread` (669+) **retargets** the whole action when excess > fraction. Apply never splits leftover HP onto a second id. Do not “upgrade” this into hidden splash. SYS-19.
10. **Range helper mismatch.** Player live gate uses `spellRangeBase` / `minRange ?? 1` / `maxRange`. Enemy decide uses `Number(spell.range)` only (`findNearestLegalCastTile` 770; apply 16539). SYS-20.
11. **Boss minion AP/MP seed.** Ghost/minion spawn sets `ap: 0, mp: 0` (WX 16243–16244) and `intelligence: 0`. After SYS-07, `currentMp === 0` must mean **no walk**, not “unset, use 3.” Seed minion budgets from the piece/boss-minion table at spawn. SYS-21.
12. **Berserker “wounded-sacrifice” is a log tag** (1402–1420). It does not cast `spell-sacrifice`. Do not emit that id from the HP flag. FUT-29.

`engine/summonAI.ts` `runSummonAI` remains unused. Live summon decide is `decideSummonAction` (1747+). Do not grow a third brain.

### 1.4 Tests (unchanged coverage hole)

`enemyAI.charger.test.ts` still covers wait / advance / adjacent melee only. Occupancy, targeting, and summon executor have tests. Honesty, DoT EV, heal-apply, focus, summon occupied-set, and boss cooldown Map still have no decide-layer tests.

### 1.5 What this increment does **not** change

T0–T5 (POS / TGT / RES / ROL / TEM / ADV) and SYS-01…SYS-12 plus FUT-01…FUT-23 remain the implementation order. This file adds SYS-13…SYS-21 and FUT-24…FUT-35. Do not implement FUT modules before the honesty + enumerator + side-aware legality slices.

---

## 2. Design additions (normative)

1. **Legal = same-side player-legal.** An enemy or summon action is illegal if a **side-parameterised** helper (not raw `isTileCastableLive`) would reject the same spell, origin, dest, occupancy, and **that side’s** LoS policy. Pack LoS stays default-on (`!== false`). Player stays opt-in (`!!lineOfSight`).
2. **One occupancy snapshot shape.** Pack, summon, and boss-minion decide must see the same occupied/barrier/void/portal/hazard sets the executor will use.
3. **Pay the path you walked.** MP debit is 4-dir path cost (slime-aware), matching `computeReachable`. Chebyshev origin→dest is not a walk bill.
4. **Boss abilities stay tagged.** Wall-ignore, board rotate, invincible phase, combo replay are **named** `BossAbility` values with UI copy. They are not pack modules and not `aiTier` gates.
5. **T6+ still stacks.** A new module is an extra scorer on the same enumerator. It does not replace T0–T5 and does not require a new integer tier or a player-level table.
6. **Public authored hazards are map hazards.** Boss apply already writes `currentMap.hazardTiles` (WX 16177–16186). POS-04 / FUT-09 must score those keys; do not keep a private boss-only hazard brain.

---

## 3. System proposals (2026-09-02)

### AI-SYS-13

**NAME:** Side-aware legality helper  
**ROLE:** system  
**SOPHISTICATION:** T1+ (required for any non-player decide)  
**DECISION_RULES:** Extract range / shape / occupancy / LoS checks from `isTileCastableLive` (`targeting.ts` 415+) into a helper that takes `side: "player" | "enemy"`. `ally` means same-side living units, not hard-coded `side === "player"`. `self` / `range: 0` heals stay legal (do **not** apply `minRange ?? 1` to `targetType === "self"`). Enemy LoS policy remains `lineOfSight !== false`. Player policy remains `playerSpellRequiresLos`. Enumerator drops illegal dests. WX apply re-checks the **acting side’s** policy, not the player one.  
**SCORING_MODEL:** Illegal ⇒ −∞ (dropped). No EV for a tile that side could not click.  
**SPELL_REQUIREMENTS:** `SpellConfig` metadata only — never `name`.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** Always for any deciding combatant.  
**ENEMY_ARCHETYPES:** All casters, healers, supports.  
**PLAYER_COUNTERPLAY:** Stand off-axis of linear frost; occupy `freeCells` tiles; break LoS with walls.  
**EDGE_CASES:** Passing raw `isTileCastableLive` into enemy decide makes ally Blood Mend / Shield-on-ward always fail. `spellRangeBase` must not force `max(1, range)` on true range-0 self.  
**IMPLEMENTATION_COMPLEXITY:** Medium (extract; wire `findNearestLegalCastTile` + apply).  
**TEST_SCENARIOS:** Enemy healer, ally at Chebyshev 2, heal `targetType: "ally"` → legal. Same call with player-only helper → would be illegal (must not use that helper). Linear frost dest (2,2) from (0,0) → illegal.  
**STATUS:** PROPOSED

### AI-SYS-14

**NAME:** Summon decide snapshot parity  
**ROLE:** system  
**SOPHISTICATION:** T1+  
**DECISION_RULES:** Summon WX ctx (15250–15290) copies the pack snapshot: occupied keys for every living combatant except self; cooldown-filtered `availableSpells`; `usableByEnemy` / kit filter; public AP/MP/RES/effects once SYS-10 exists. `runSummonAI` stays unused.  
**SCORING_MODEL:** Occupied dests are not enumerated. On-CD kit ids are absent from `availableSpells` so `findKitSpell` cannot prefer them.  
**SPELL_REQUIREMENTS:** Kit ids already in `SUMMON_KIT`.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** Always (summon honesty).  
**ENEMY_ARCHETYPES:** hunter, guardian, archer, bomber, healer summons.  
**PLAYER_COUNTERPLAY:** Body-block a wolf’s only step; the decide must see the block.  
**EDGE_CASES:** Empty `occupied` + executor reject = skipped turn that looks like a freeze. Do not “fix” by letting the executor ignore occupancy.  
**IMPLEMENTATION_COMPLEXITY:** Low (WX snapshot only; no new decide branch).  
**TEST_SCENARIOS:** Player on (3,3), wolf origin (3,4), occupied contains (3,3) → dest ≠ player tile. Shield on CD → guardian does not pick it from `assignedSpells` via the available-first lookup.  
**STATUS:** PROPOSED

### AI-SYS-15

**NAME:** Path-cost movement honesty  
**ROLE:** system  
**SOPHISTICATION:** T1+  
**DECISION_RULES:** MP spent = slime-aware 4-dir path cost inside the reachable set (same graph as `computeReachable`). Summon executor must not bill `chebyshev(origin, dest) * mpCostPerTile` as a teleport (56, 125–126). Pack apply must debit the same path cost (SYS-05). If player walk later gains diagonals, share one occupancy walker — do not give AI a private diagonal step. `stepToward` may propose a diagonal candidate (569–570) only if that cell is in the reachable set.  
**SCORING_MODEL:** Destinations whose path cost > remaining MP are not enumerated (SYS-07).  
**SPELL_REQUIREMENTS:** None.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** Always.  
**ENEMY_ARCHETYPES:** All walkers.  
**PLAYER_COUNTERPLAY:** Slime flood actually triples (or doubles) the bill.  
**EDGE_CASES:** Dest (2,1) from (0,0) is Chebyshev 2 but 4-dir cost 3 — charge 3. Missing MP field → 0 walk (SYS-07), not silent 3.  
**IMPLEMENTATION_COMPLEXITY:** Medium (executor + pack apply; depends on SYS-07).  
**TEST_SCENARIOS:** MP 2 cannot occupy a 3-step 4-dir dest even if Chebyshev is 2. Diagonal candidate not in reachable → not chosen.  
**STATUS:** PROPOSED

### AI-SYS-16

**NAME:** Boss second-brain legality  
**ROLE:** system  
**SOPHISTICATION:** T5 (boss) / honesty for all tagged abilities  
**DECISION_RULES:** `pickBossKitSpell` receives the **live** cooldown map (already AEE-2026-09-01-008). A kit id is legal only if SYS-13 would accept origin, dest, LoS, AP, MP. If no kit id is legal, fall through to the named `BossAbility` script — never to Fire Bolt or a kit-less range-3 hit. Final Pawn’s feeble projectile (992–1001) is removed or replaced with a profiled kit id. `KNIGHT_JUMP_IGNORE_WALLS` stays a unique tagged ability with UI copy; pack modules must not ignore walls. `currentTurn % 1 === 0` is not a cadence. Full enumerator overlay remains FUT-20.  
**SCORING_MODEL:** Illegal kit id ⇒ skip to next pool id or ability. No EV for a through-wall frost.  
**SPELL_REQUIREMENTS:** Phase pool ids profiled (SYS-02) before they are preferred over abilities.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** `isBoss` pack term in SYS-01; not `level >= 100`.  
**ENEMY_ARCHETYPES:** Catalog bosses (`useBossAI.ts` DECISION_MAP).  
**PLAYER_COUNTERPLAY:** Walls still break kit shots; jump remains readable as the Cavalier’s ability.  
**EDGE_CASES:** Empty pool + all abilities on internal CD → skip, not Crush-from-range. Invincible phase skip (Final Pawn 977–989) is a tagged ability, not T5 sophistication.  
**IMPLEMENTATION_COMPLEXITY:** Medium for Map+range; high for FUT-20 merge.  
**TEST_SCENARIOS:** Wall between Archbishop and player, first pool id is frost → no cast; move or ability. Cavalier jump still ignores walls. Final Pawn at Manhattan 3 with empty pool → no kit-less bolt.  
**STATUS:** PROPOSED

### AI-SYS-17

**NAME:** Name-heuristic lock (summon routing)  
**ROLE:** system  
**SOPHISTICATION:** all  
**DECISION_RULES:** `inferSummonArchetype` (195–217) may read `summonAI` and legacy aliases `kiter`/`kamikaze` only. Drop `name.includes("wolf"|"golem"|"wisp"|…)`. Missing `summonAI` → `"hunter"` fallback remains acceptable as a typed default, not a string search. Spell scoring already forbids `spell.name`.  
**SCORING_MODEL:** N/A (routing).  
**SPELL_REQUIREMENTS:** `summonAI` metadata on the combatant.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** Always.  
**ENEMY_ARCHETYPES:** All summons.  
**PLAYER_COUNTERPLAY:** N/A (authoring).  
**EDGE_CASES:** Admin-renamed “Wolfish Bishop” must not become hunter.  
**IMPLEMENTATION_COMPLEXITY:** Low.  
**TEST_SCENARIOS:** `name: "wolf", summonAI: "healer"` → healer. `name: "golem", summonAI: undefined` → hunter default, not guardian.  
**STATUS:** PROPOSED

### AI-SYS-18

**NAME:** Dormant fields are not sophistication  
**ROLE:** system  
**SOPHISTICATION:** meta  
**DECISION_RULES:** `Enemy.intelligence`, `campTurnCount`, `escapeRouteTriggered` (`gameTypes.ts` 307, 339–340) must not become `if (intelligence >= N)` or level-band gates. `escapeRouteTriggered` may be a **debug flag** when POS-08 fires (parent POS-08). `intelligence: 0` on minions (WX 16248) is a spawn stub, not T0. Replace `computeAITier` with SYS-01 `aiModules`; keep `aiTier` as a log alias only.  
**SCORING_MODEL:** N/A.  
**SPELL_REQUIREMENTS:** None.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** N/A (authoring rule).  
**ENEMY_ARCHETYPES:** All.  
**PLAYER_COUNTERPLAY:** N/A.  
**EDGE_CASES:** Admin `aiStrategy === "berserk"` already routes berserker (`enemyAI.ts` 444) — that string is an explicit role hint, not a level table. Do not add `aiStrategy === "elite"` as a hidden execute.  
**IMPLEMENTATION_COMPLEXITY:** None (do-not-implement).  
**TEST_SCENARIOS:** Grep decide for `intelligence`, `campTurnCount`, `escapeRouteTriggered` as branch conditions → zero.  
**STATUS:** PROPOSED

### AI-SYS-19

**NAME:** Overkill is retarget, not splash  
**ROLE:** system  
**SOPHISTICATION:** T1 (honesty)  
**DECISION_RULES:** `applyOverkillSpread` (669+) may change `targetId` when `dmg - hp > AI_OVERKILL_SPILL_FRACTION * maxHp`. Apply deals **one** hit to the chosen id. Do not add a second hidden damage event to “spend the leftover.” If a later profiled `hitsMultiple` / radius spell exists, that is FUT-19, not this helper.  
**SCORING_MODEL:** Existing spill gate; leftover is unused EV, not a second target.  
**SPELL_REQUIREMENTS:** Single-target damage.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** Always (correctness).  
**ENEMY_ARCHETYPES:** All damage roles.  
**PLAYER_COUNTERPLAY:** Overheal so spill never trips; spread so the retarget is out of range.  
**EDGE_CASES:** Retarget dest illegal (range/LoS) → keep primary or skip; do not splash.  
**IMPLEMENTATION_COMPLEXITY:** Low (document + test; do not grow apply).  
**TEST_SCENARIOS:** 100 dmg vs 10 HP primary, secondary in range → decide targetId is secondary; apply log has one damage line.  
**STATUS:** PROPOSED

### AI-SYS-20

**NAME:** Range helper parity (`maxRange` / `minRange`)  
**ROLE:** system  
**SOPHISTICATION:** T1+  
**DECISION_RULES:** Decide and apply use the same numeric range as the acting side’s live gate: `maxRange ?? Number(range)` without forcing `max(1, range)` on range-0 self. Honor `minRange` except self. Do not invent a longer range than the spell metadata.  
**SCORING_MODEL:** Out of `[min, max]` ⇒ dropped.  
**SPELL_REQUIREMENTS:** `range` / `minRange` / `maxRange` fields.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** Always.  
**ENEMY_ARCHETYPES:** All casters.  
**PLAYER_COUNTERPLAY:** Stand inside `minRange` of a sniper kit.  
**EDGE_CASES:** `spellRangeBase` today is `maxRange ?? max(1, Number(range))` (`targeting.ts` 111–115) — the `max(1, …)` must not leak into self-heal.  
**IMPLEMENTATION_COMPLEXITY:** Low–medium (shared helper with SYS-13).  
**TEST_SCENARIOS:** `maxRange: 4`, `range: 2` → enemy frost legal at dist 4 iff player frost would be. `range: 0` self heal at origin → legal.  
**STATUS:** PROPOSED

### AI-SYS-21

**NAME:** Combatant resource seed  
**ROLE:** system  
**SOPHISTICATION:** T1+ (spawn honesty)  
**DECISION_RULES:** Every deciding combatant enters battle with `currentAp`/`currentMp`/`maxAp`/`maxMp` set from the **same** piece/family/boss-minion table the HUD would show. Boss minions currently spawn `ap: 0, mp: 0` (WX 16243–16244). After SYS-07, 0 means no walk/cast — correct if they are truly exhausted, wrong if 0 means “unset.” Distinguish unset (legacy) from zero. Unset → 0 this turn (SYS-07), then fix spawn. Do not treat 0 as `ENEMY_REACHABLE_STEP_BUDGET`.  
**SCORING_MODEL:** N/A (spawn).  
**SPELL_REQUIREMENTS:** None.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** Always.  
**ENEMY_ARCHETYPES:** Boss minions, ghosts, pack trash.  
**PLAYER_COUNTERPLAY:** AP-burn on a seeded minion actually strands it.  
**EDGE_CASES:** Player summons already seed via `summonSpawn.ts` 177–179 — that is the template.  
**IMPLEMENTATION_COMPLEXITY:** Low (spawn fields; depends on SYS-07 meaning).  
**TEST_SCENARIOS:** Minion fixture `currentMp: 0` → dest = origin. Minion fixture seeded MP 2 → 2-step 4-dir legal.  
**STATUS:** PROPOSED

---

## 4. Tier 6+ modules (2026-09-02)

Attach via SYS-01. Higher `mu` than T4/T5 unless noted. Stack on FUT-01…FUT-23. Still one-turn (or depth-2 with the 256-node cap from SYS-03).

### AI-FUT-24

**NAME:** Authored-hazard scoring  
**ROLE:** positioning  
**SOPHISTICATION:** T6  
**DECISION_RULES:** Treat `currentMap.hazardTiles` keys written by boss apply (WX 16177–16186: lava trail, spike-on-land, void, shock) as the same public hazards POS-04 / FUT-09 score. Do not keep a second `bossState.hazardTiles`-only brain. Shock / lava / spikes / void keep **separate** costs (FUT-09). Full HP still pays (POS-04 lift).  
**SCORING_MODEL:** FUT-09 weights per `hazardTiles` value string. Unknown string → cheapest lava-like tick, or hold if impassable.  
**SPELL_REQUIREMENTS:** None.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** `mu ≈ 0.8` when any authored hazard exists this fight.  
**ENEMY_ARCHETYPES:** All except kamikaze-on-detonate.  
**PLAYER_COUNTERPLAY:** Kite the Countess across her own lava.  
**EDGE_CASES:** Hazard written this turn after this actor moved → visible next actor (sequential turns). Do not peek the ability result before it is on the map.  
**IMPLEMENTATION_COMPLEXITY:** Low once POS-04/FUT-09 exist.  
**TEST_SCENARIOS:** Shock at dest vs equal-range safe dest → safe. Void tile not walkable.  
**STATUS:** PROPOSED

### AI-FUT-25

**NAME:** DoT stack expected value  
**ROLE:** spell contract  
**SOPHISTICATION:** T6 (T3 may add a first stack only)  
**DECISION_RULES:** Public `activeEffects` with `type === "dot"` stack additively (`dotStacks.ts` `appendDotStack` / `sumDotTicks`). First application EV = `dotDamagePerTurn * remainingDuration` (SYS-02 category default). Extra stacks EV = **additional** tick sum over the new stack’s duration, not zero (parent RES-06 said T3+ may stack). Prefer a new stack only if it beats a legal direct hit that kills now. Needs SYS-10 effects on the snapshot.  
**SCORING_MODEL:** `EV_stack = new.dotDamagePerTurn * new.duration`; compare to `killableNow` of a damage profile.  
**SPELL_REQUIREMENTS:** `isDotSpell` / `dotDamagePerTurn` / `dotDuration` profiles. Inferno/poison stay unused until this **and** apply exist.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** `mu ≈ 0.9` when a DoT id is in kit.  
**ENEMY_ARCHETYPES:** artillery, assassin, hunter summon.  
**PLAYER_COUNTERPLAY:** Cleanse; stay above combined tick+hit kill band.  
**EDGE_CASES:** Non-DoT debuffs still replace-or-refresh — do not stack frost MP shred.  
**IMPLEMENTATION_COMPLEXITY:** Medium (needs SYS-02 + apply DoT).  
**TEST_SCENARIOS:** Target already has one venom stack, Strike would kill → Strike. Target full HP, two venoms legal → second venom EV > 0.  
**STATUS:** PROPOSED

### AI-FUT-26

**NAME:** Path-aware commit  
**ROLE:** positioning  
**SOPHISTICATION:** T6  
**DECISION_RULES:** Charger/assassin “can reach this turn” uses BFS steps in `computeReachable` (actual MP, SYS-07), not Chebyshev `dist <= budget + 1` (1178–1179). If the shortest legal path is longer than remaining MP, **wait** (existing charger hold), do not suicide-advance because Chebyshev looked short.  
**SCORING_MODEL:** `canReach = targetAdjacentCell ∈ reachable ∪ {origin if already adjacent}`.  
**SPELL_REQUIREMENTS:** Melee / range-1 kit.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** `mu ≈ 0.7`; chargers/assassins.  
**ENEMY_ARCHETYPES:** charger, assassin, knight.  
**PLAYER_COUNTERPLAY:** Maze the charger; they wait instead of leaking steps.  
**EDGE_CASES:** Adjacent Chebyshev including diagonal: commit only if player Strike would also be legal from that cell (Chebyshev enemy targeting — `targeting.ts` 570–623). Do not invent Manhattan-only melee for pack units; bosses already use Manhattan `dist` (`useBossAI.ts` 83–88, 121–126) for **ability** adjacency — keep that as boss-script, not pack.  
**IMPLEMENTATION_COMPLEXITY:** Low (replace the Chebyshev inequality).  
**TEST_SCENARIOS:** Chebyshev 3, path 6 through a corridor, MP 3 → wait. Open field Chebyshev 3, MP 3 → advance.  
**STATUS:** PROPOSED

### AI-FUT-27

**NAME:** Split / clone blackboard  
**ROLE:** team  
**SOPHISTICATION:** T6  
**DECISION_RULES:** Public extra bodies from Fetid Rook split, Twin Monarchs, Void illusions, Broodmother larvae, Archivist scrolls share the pack blackboard (`focusTargetId`, TEM-04 debuff hygiene, POS-06 gap). They do **not** get a second `computeAITier`. Clones inherit the parent’s `aiModules` list (SYS-01 roll once). Do not focus-fire the player’s decoy if the public state marks an illusion as non-damageable — only if that flag is on the combatant the HUD shows.  
**SCORING_MODEL:** Same U(); `pack` term already raised by boss flag.  
**SPELL_REQUIREMENTS:** None.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** `mu ≈ 1.0` when `isBossMinion` or split flag is public.  
**ENEMY_ARCHETYPES:** Boss minions / clones.  
**PLAYER_COUNTERPLAY:** Kill the real body; ignore tagged illusions if the UI says so.  
**EDGE_CASES:** Minion `ap: 0` (SYS-21) — clones that cannot act still occupy tiles (POS-06).  
**IMPLEMENTATION_COMPLEXITY:** Medium (spawn copy of `aiModules`).  
**TEST_SCENARIOS:** Two split rooks do not both slow the same target (TEM-04). Both can share focus (SYS-08).  
**STATUS:** PROPOSED

### AI-FUT-28

**NAME:** Public objective tiles  
**ROLE:** advanced  
**SOPHISTICATION:** T6  
**DECISION_RULES:** Enthroned Void anchors (`ANCHOR_TILES`, `useBossSystem.ts` 1368–1370) are public: the player must step them. Pack/minion AI may **not** camp every anchor (that is a rule-break if it uses hidden “this is the only win con” beyond what the board shows). If the tile is a normal hazard/occupiable cell, score it as a cell — body-block is legal (FUT-10). Do not path as if the boss were immune unless the HUD/combatant shows immunity.  
**SCORING_MODEL:** `+wBodyBlock` on an anchor cell only if FUT-10 would occupy that exit anyway. No extra “protect win-con” term from private script knowledge.  
**SPELL_REQUIREMENTS:** None.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** `mu ≈ 1.2` during fights that expose objective tiles on the map.  
**ENEMY_ARCHETYPES:** protector, tank, void minions.  
**PLAYER_COUNTERPLAY:** Attract/swap the camper; step the free anchor.  
**EDGE_CASES:** Expired anchors that silence the player are public effects — ADV-06 may react to the silence, not to a hidden timer.  
**IMPLEMENTATION_COMPLEXITY:** Medium (must not leak script).  
**TEST_SCENARIOS:** Four anchors, one tank → at most one dest is an anchor, and only if it is also a choke/exit.  
**STATUS:** PROPOSED

### AI-FUT-29

**NAME:** Sacrifice-spell vs wounded log  
**ROLE:** spell contract  
**SOPHISTICATION:** T3–T6 (contract)  
**DECISION_RULES:** `ENEMY_WOUNDED_SACRIFICE_HP_PCT` (1402–1420) only changes berserker **press** (no retreat). It must not select `spell-sacrifice`. That id stays illegal until FUT-22 profile + apply. Intent string `"wounded-sacrifice"` is debug, not a kit.  
**SCORING_MODEL:** Parent §6 `isSacrifice` only when the profiled spell is in the legal set.  
**SPELL_REQUIREMENTS:** `spell-sacrifice` profile + apply (FUT-22).  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** HP flag always for berserker press; spell attach `mu ≈ 0.7` via SYS-01.  
**ENEMY_ARCHETYPES:** berserker (log); assassin/berserker (spell, later).  
**PLAYER_COUNTERPLAY:** Keep the berserker above the spell’s HP floor once it exists.  
**EDGE_CASES:** Elite extra must not emit `spell-sacrifice` until FUT-22 (FUT-17).  
**IMPLEMENTATION_COMPLEXITY:** Low (do not wire the id).  
**TEST_SCENARIOS:** Berserker at 15% HP, sacrifice not in kit → melee/cast kit only. Sacrifice in kit without profile → not legal.  
**STATUS:** PROPOSED

### AI-FUT-30

**NAME:** Chain along public shock  
**ROLE:** artillery / disruptor  
**SOPHISTICATION:** T6  
**DECISION_RULES:** Lord of Static `CHAIN_LIGHTNING` is a tagged boss ability (875–886). Pack AI may score a profiled `hitsMultiple` / chain spell **only** along **public** occupants and public shock tiles on `currentMap.hazardTiles`. Do not invent extra bounce distance. Do not enable chain ids until SYS-02 + apply exist (FUT-19).  
**SCORING_MODEL:** Parent §6 `aoe` / chain: sum EV over public bounce set minus friendly fire.  
**SPELL_REQUIREMENTS:** Chain/hitsMultiple profile + apply.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** `mu ≈ 1.1` when such a spell is in kit and shock/occupants exist.  
**ENEMY_ARCHETYPES:** artillery, disruptor, Static (boss overlay FUT-20).  
**PLAYER_COUNTERPLAY:** Step off shock; spread summons.  
**EDGE_CASES:** Zero shock tiles → chain EV = single-target only.  
**IMPLEMENTATION_COMPLEXITY:** High (apply missing for pack chain).  
**TEST_SCENARIOS:** Two player-side units on shock + in bounce → chain EV > frost; none on shock → frost.  
**STATUS:** PROPOSED

### AI-FUT-31

**NAME:** Mark tile vs mark unit  
**ROLE:** spell contract  
**SOPHISTICATION:** T6  
**DECISION_RULES:** `spell-mark` description says “Mark target **tile**”; `targetType` is `"enemy"` (`spellData.ts` 161–176). AI must score the **metadata** (`targetType: "enemy"`), not the flavour text. Until apply exists, enumerator treats the id as illegal (FUT-22). When apply lands, mark the unit (or tile if `targetType` is changed to ground in data — follow data, not the blurb).  
**SCORING_MODEL:** Parent §6 `isMark` on the legal dest type.  
**SPELL_REQUIREMENTS:** `isMark` + apply.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** Profile always; attach `mu ≈ 0.7`.  
**ENEMY_ARCHETYPES:** disruptor, artillery.  
**PLAYER_COUNTERPLAY:** Move off the marked unit/tile.  
**EDGE_CASES:** Do not pre-aim a ghost tile because the description said “tile” while type is enemy.  
**IMPLEMENTATION_COMPLEXITY:** Low (authoring) / high (apply).  
**TEST_SCENARIOS:** Profile uses `targetType`. Flavour-only test must not drive dest.  
**STATUS:** PROPOSED

### AI-FUT-32

**NAME:** Initiative strip as public AP/MP source  
**ROLE:** advanced  
**SOPHISTICATION:** T6  
**DECISION_RULES:** ADV-04 / FUT-06 / FUT-18 read AP/MP from the **same** public values the initiative strip / HUD shows (SYS-10). If the strip omits a field, the module is off — do not read `characterStats` internals that the player cannot see on that surface. Next-actor id comes from the already-built battle-start order list (public).  
**SCORING_MODEL:** Unchanged ADV-04; source of the feature is the strip.  
**SPELL_REQUIREMENTS:** None.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** Same as ADV-04 / FUT-06 (`mu ≈ 0.8–1.2`).  
**ENEMY_ARCHETYPES:** T4+ / T6.  
**PLAYER_COUNTERPLAY:** End turn with leftover AP visible on the strip.  
**EDGE_CASES:** Strip hidden in a UI layout → treat AP/MP unknown.  
**IMPLEMENTATION_COMPLEXITY:** Low once SYS-10 exists.  
**TEST_SCENARIOS:** Fixture strip AP 0 → charger commit weight up (FUT-18). Fixture without AP field → ADV-04 disabled.  
**STATUS:** PROPOSED

### AI-FUT-33

**NAME:** Sim kit twin  
**ROLE:** system / authoring  
**SOPHISTICATION:** T1 (honesty of tools)  
**DECISION_RULES:** `longHorizonSim.ts` 45–52 duplicates `buildEnemyKit` and documents the `levelZone` object bug. The sim must call the **production** `buildEnemyKit` (or the future relative-width helper from SYS-09), not a private copy that can drift. Sim output is **not** live telemetry (TBC-2026-09-01-001).  
**SCORING_MODEL:** N/A.  
**SPELL_REQUIREMENTS:** Same as SYS-09.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** N/A.  
**ENEMY_ARCHETYPES:** Sim-only.  
**PLAYER_COUNTERPLAY:** N/A.  
**EDGE_CASES:** Do not retune combat from sim kit histograms.  
**IMPLEMENTATION_COMPLEXITY:** Low.  
**TEST_SCENARIOS:** Production and sim kit ids match for the same `(piece, relativeWidth)` fixture.  
**STATUS:** PROPOSED

### AI-FUT-34

**NAME:** Mirror last-spell (public only)  
**ROLE:** advanced  
**SOPHISTICATION:** T6  
**DECISION_RULES:** Mirror Sovereign `SPELL_MIRROR` / `COMBO_REPLAY` (`useBossAI.ts` 1200–1220) are tagged boss abilities that copy **public** last player actions. Pack AI may raise SR/physical bias (FUT-08) when a public “mirror active” effect is on the combatant. Pack must **not** replay the player’s last three turns (that is the Sovereign’s ability). No hidden click buffer.  
**SCORING_MODEL:** `−wReflect` when the public mirror effect is present and the spell is not physical (FUT-08 family table).  
**SPELL_REQUIREMENTS:** Optional physical profile in kit.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** `mu ≈ 1.0` when the public mirror flag is on.  
**ENEMY_ARCHETYPES:** Pack in Sovereign fights; Sovereign via FUT-20.  
**PLAYER_COUNTERPLAY:** Show a dummy heal on the bar (FUT-07); bring Strike.  
**EDGE_CASES:** Combo replay remains boss-only.  
**IMPLEMENTATION_COMPLEXITY:** Low for the pack bias; do not port replay.  
**TEST_SCENARIOS:** Public mirror on, frost vs strike in kit → strike if both legal. Pack actor never emits `COMBO_REPLAY`.  
**STATUS:** PROPOSED

### AI-FUT-35

**NAME:** Barrier / ground profile gate  
**ROLE:** spell contract  
**SOPHISTICATION:** T6  
**DECISION_RULES:** `spell-barrier` stays `usableByEnemy: false` (`spellData.ts` 192) until a ground/Manhattan profile **and** apply exist. Ground distance is Manhattan (`targeting.ts` 501–524), not Chebyshev. SYS-13 must use that metric for `targetType === "ground"`. Do not let elite extras (`worldFeatures.ts`) flip the flag without the profile (FUT-17).  
**SCORING_MODEL:** Parent §6 teleport/cover: EV of blocking player shortest path minus self-trap.  
**SPELL_REQUIREMENTS:** `isBarrier` / ground + apply.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** Profile always; attach `mu ≈ 1.0` for controller/protector.  
**ENEMY_ARCHETYPES:** controller, protector.  
**PLAYER_COUNTERPLAY:** Attract the wall; walk around.  
**EDGE_CASES:** Occupied ground dest illegal (already in live helper).  
**IMPLEMENTATION_COMPLEXITY:** High (new apply).  
**TEST_SCENARIOS:** Chebyshev 2 / Manhattan 3 dest for range 2 barrier → illegal. Elite roll cannot assign barrier until profiled.  
**STATUS:** PROPOSED

---

## 5. Spell-awareness contract (reminder)

Unchanged: no profile + apply ⇒ not in kit, not in elite extras, `usableByEnemy` treated as false in the enumerator.

Still `usableByEnemy: true` without a working decide+apply pair (do not give these to AI until FUT-22 / FUT-25 / FUT-31 / apply):

`spell-swap`, `spell-mark`, `spell-sacrifice`, `spell-lifesteal-nova`, `spell-enrage`, `spell-haste`, `spell-weaken`, `spell-expose`, `spell-drain-courage`, `spell-cursed-wound`, `spell-shadow-veil`, `spell-frost-nova`, `spell-inferno` (DoT `damage: 0`), `starter-poison` / `spell-venom-strike`, `starter-shield` / `spell-iron-skin`.

Keep `usableByEnemy: false` until profiled: barrier, mirror, timestep, rallying-cry, sentinel/bomber/wisp summons.

`starter-heal` is self-only (`range: 0`). It cannot satisfy ROL-04 ally heal. SYS-13 must keep that legal for **self**.

---

## 6. Implementation order (this increment)

Do not start FUT-24+ first. Do not start T6+ from 2026-09-01 before P0 honesty.

1. SYS-05 (Fire Bolt WX **16792–16800**, AP/MP debit, ally heal WX **16736**) — still P0.  
2. SYS-13 + SYS-06 + SYS-11 + SYS-20 — side-aware legality = that side’s live gate.  
3. SYS-14 + SYS-21 — summon occupied/CD snapshot; minion resource seed.  
4. SYS-07 + SYS-15 — actual MP, path-cost bill.  
5. SYS-08, SYS-09, SYS-10, SYS-12 — as parent / 09-01.  
6. SYS-16 — boss kit Map + range/LoS; delete kit-less Final Pawn bolt.  
7. SYS-17, SYS-18, SYS-19 — heuristics / dormant fields / overkill honesty.  
8. Parent T2–T5 roles / team / adaptive.  
9. FUT-26, FUT-24, FUT-29, FUT-33 (cheap once enumerator exists).  
10. FUT-25…FUT-35 and 2026-09-01 FUT-01…FUT-23 as spells and apply land.

Each slice: `engine/enemyAI*.test.ts`, zero WX drive-by, no RAF / map gen / turn order / damage-formula edits. Scoring **reads** RES/SR; it does not change `calcScaledDamage`.

---

## 7. Extra test scenarios

| ID | Setup | Expect |
| :--- | :--- | :--- |
| TS-SIDEALLY | Enemy heal `targetType: "ally"`, dest = allied rook | Legal under SYS-13; illegal if raw player helper is used. |
| TS-SUMOCC | Wolf decide with empty occupied vs filled occupied | Empty path through player is a **bug**; filled must not dest onto player. |
| TS-SUMCD | Guardian shield remaining CD 2, available unfiltered | Must not cast (SYS-14). |
| TS-PATHMP | Dest Chebyshev 2, 4-dir cost 3, MP 2 | Not reachable. |
| TS-CHARGEPATH | Chebyshev 3, path 6, MP 3 | Charger wait. |
| TS-BOLT2 | `nd` Chebyshev 1, failed frost | Crush or skip; never `e-firebolt` (WX 16798–16800). |
| TS-BOSSWALL | Archbishop, wall, first pool frost | No through-wall kit cast. |
| TS-PAWNBOLT | Final Pawn, empty pool, Manhattan 3 | No kit-less projectile. |
| TS-NAME | `name: "wolf", summonAI: "healer"` | Healer, not hunter. |
| TS-MINIONMP | Minion `currentMp: 0` after SYS-07 | Hold. |
| TS-OVERKILL | Spill retarget | One apply hit, not two. |
| TS-MAXR | `maxRange: 4`, `range: 2` | Dist 4 legal iff player gate agrees. |
| TS-MARKMETA | `spell-mark` flavour “tile”, type enemy | Score as enemy until data changes. |
| TS-INTEL | `intelligence: 0` minion | No extra skip/execute from that field. |

Parent and 2026-09-01 TS-* rows still apply (with **new** WX line numbers from §1.1).

---

## 8. Mapping (new gaps → ids)

| Request / gap | Primary AI_ID |
| :--- | :--- |
| Player-centric `isTileCastableLive` | AI-SYS-13 |
| Summon empty occupied / unfiltered CD | AI-SYS-14 |
| Chebyshev teleport MP vs 4-dir path | AI-SYS-15 |
| Boss empty Map, kit-less pawn bolt, wall-jump leak | AI-SYS-16 |
| `name.includes` summon routing | AI-SYS-17 |
| `intelligence` / camp / escapeRoute as fake tiers | AI-SYS-18 |
| Overkill splash cheat | AI-SYS-19 |
| `maxRange` / `minRange` mismatch | AI-SYS-20 |
| Minion `ap: 0, mp: 0` seed | AI-SYS-21 |
| Boss-authored lava/shock/void | AI-FUT-24 |
| Additive DoT stacks | AI-FUT-25 |
| Charger Chebyshev commit | AI-FUT-26 |
| Split/clone modules | AI-FUT-27 |
| Anchor / objective honesty | AI-FUT-28 |
| Sacrifice id vs HP log | AI-FUT-29 |
| Chain on public shock | AI-FUT-30 |
| Mark flavour vs `targetType` | AI-FUT-31 |
| Initiative strip as SYS-10 source | AI-FUT-32 |
| `longHorizonSim` kit fork | AI-FUT-33 |
| Sovereign mirror without replay | AI-FUT-34 |
| Barrier Manhattan ground | AI-FUT-35 |

T0–T5 requested list (positioning, targeting, resources, roles, team, adaptive) remains parent §19. Nothing in that list is implemented. Higher-level enemies still get harder from **modules on the sigmoid**, not from `computeAITier(enemyLevel)`.
