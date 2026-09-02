# Advanced Enemy AI Evolution — 2026-09-01 increment

**Status:** PROPOSED (design only; no production code in this change)  
**Date:** 2026-09-01  
**Parent catalog:** [`ENEMY_AI_EVOLUTION.md`](./ENEMY_AI_EVOLUTION.md) (T0–T5 modules, scoring contract, eligibility math)  
**Implementer ledger:** [`automation/ACTION_IDS_2026-09-01.md`](./automation/ACTION_IDS_2026-09-01.md)

This increment re-reads the live engine after the 2026-08-31 catalog. T0–T5 proposals stay **PROPOSED** and are not restated here unless a line number or fact changed. New work is: honesty gaps the first pass missed, system modules that make T6+ legal, and full proposal blocks for reusable sophistication that can keep attaching as relative difficulty rises.

Stralt has **no character level cap**. Nothing here maps `if (level >= X) sophistication = Y`. Tiers remain conceptual. Eligibility remains the §4 sigmoid in the parent catalog (`peer = log2(enemy.level / player.level)` plus pack/boss/modifier terms). A year-later peer fight at any absolute level can attach a new module without raising a cap.

**Hard rules (unchanged):** no cheat, no hidden player information, no ignored LoS/range/AP/MP, no unbounded search, no kit-less Fire Bolt, no `instantKill`, no betrayal-as-difficulty, no name-based spell heuristics, no production AI in this change.

---

## 1. Re-read (2026-09-01) — what is still true

All line numbers are from this checkout. Re-read them before implementing.

### 1.1 Decision / apply split

| Piece | Path | Live behaviour |
| :--- | :--- | :--- |
| Pure decide | `enemyAI.ts` `decideEnemyAction` 1648–1692 | One `EnemyAction` per turn. Does **not** read `enemy.currentAp` / `currentMp` even though those fields exist on `Enemy` (`gameTypes.ts` 312–316). |
| Apply | `WorldExploration.tsx` ~16705–17200 | Damage/drain, self-heal if `spellRange === 0` (17083), `debuffStat`. Failed cast / `kind === "melee"` → fallback pool Crush **or Fire Bolt** (17145–17150). |
| Reachable | `computeReachable` 330–367 | 4-directional BFS, `ENEMY_REACHABLE_STEP_BUDGET = 3` (`gameConstants.ts` 166). Not `enemy.currentMp`. Slime flood doubles step cost. |
| Cast tile | `findNearestLegalCastTile` 762–804 | Chebyshev `dist <= Number(spell.range)` + `lineOfSight !== false`. Ignores `minRange`, `maxRange`, `linear`, `diagonal`, `freeCells`, Manhattan ground. |
| Player legality | `targeting.ts` `isTileCastableLive` ~660+ | Ground = Manhattan (unless `diagonal`); enemy/area = Chebyshev; `minRange` / `linear` / `diagonal` / `freeCells`. Player LoS is **opt-in** (`lineOfSight` truthy, 107–114). AI LoS is **default-on** (`!== false`). Do not “unify” by turning AI LoS off. |
| Summon spend | `summonExecutor.ts` 122–210 | Blocks move/cast when MP/AP insufficient. Honesty template. |
| Boss | `useBossAI.ts` `pickBossKitSpell` 38–54 | First pool id. Decide fns pass `new Map()` (e.g. Pale Archbishop 169–173) so cooldown is unused. Movement is 4-dir Manhattan (`getWalkableMoves` 58–80). |
| Snapshot | WX `aiCombatants` 16722–16751 | id, side, summonAI, name, x/y, hp, maxHp, level. **No** AP, MP, RES, SR, `activeEffects`. |

`Enemy` already has `currentAp` / `currentMp` / `activeEffects` / `aiTier` / `isSummoner`. `AICombatant` and the WX snapshot do not copy them. `getEffectiveStat` is on `DecideEnemyContext` and unused by `estimateDamage` (463–482).

### 1.2 Forbidden level → tier (still live)

`computeAITier` (`combatMath.ts` 36–52) is unchanged: bands at 10 / 30 / 60 / 100 / 150 / 250 / 400 / 600 / 900, then 30% scramble to 1–10. Assigned at spawn WX 6408 and 6536.

Live `aiTier` gates (not tactics):

- `>= 5` + leader dead (WX 15956–16040): random adjacent step; 50% chance to **log** a random spell name; spell is not applied.
- `>= 10` (WX 16043+): 5% ally damage + 6× enrage.

`ENEMY_AI_TIER_GATES` (`gameConstants.ts` 200–209) is still unread by `enemyAI.ts`.

### 1.3 Kit width is dead (new)

`assignEnemySpells` (WX 12483–12487) calls `buildEnemyKit(enemy.pieceType, currentMap.levelZone)`.

`levelZone` is `{ name, minLevel, maxLevel }` (WX 529, 5265). `buildEnemyKit` (`enemyAI.ts` 187–193) does `Math.floor(levelZone)`. `Math.floor(object)` is `NaN`, so every builder stays on the `z >= 1` / `z >= 2` **false** branch.

Live kits today:

| Piece | Actual assigned ids |
| :--- | :--- |
| pawn | `physical_attack` |
| knight | `physical_attack` |
| bishop | `starter-frost` |
| rook | `physical_attack` |
| queen | `starter-frost` (never inferno, never Blood Mend) |
| king | `starter-frost` (never inferno, never rally) |

The 2026-08-31 “queen becomes healer” failure is therefore **latent**: it appears the moment kit width is repaired with a numeric zone **without** SYS-04. Do not “fix” width by passing `levelZone.minLevel`. Use relative difficulty (AI-SYS-09).

Summoner overlay (WX 12496–12507): `0.12 + characterStats.level * 0.02`. At player level 44 the chance is ≥ 1.0. This is a **player-level** term with no cap — the same class of bug as `computeAITier` bands. Cap and/or re-key to `peer` (AI-FUT-23).

### 1.4 Focus fire is a writer without a reader (new)

`ctx.setFocusTargetId` runs in `decideCaster` (939) and `decideGeneric` (1525). `scoreTargets` (501–525) never reads `ctx.focusTargetId`. Charger / flanker / berserker / healer never write it. `decideEnemyAction` 1669 only uses `focusAlreadySet` to skip wisp promotion.

TEM-01 in the parent catalog is therefore not “exists in skeleton form” for scoring — only the setter exists.

### 1.5 Infer / score (unchanged, still blocking)

- `inferArchetype` 420–425: any heal → healer (heal-first).
- `estimateDamage` 474–475: `spell.damage <= 0` → 0. Inferno / poison lose `pickBestDamageSpell`.
- `filterHazardCandidates` 398–414: only when HP < 50%; ice/lava/spikes identical.
- Retreat often returns `kind: "skip"` while moving (caster 915–924).
- `decideSummonerAction` 1827–1873: skip when cap/CD; midpoint can be a wall; no kit fallback.
- Guardian (`decideSummonGuardian` 2111–2117): recasts shield every turn because `AICombatant` has no effects.

### 1.6 Tests

`enemyAI.charger.test.ts` covers wait / advance / adjacent melee only. Occupancy, targeting, and summon executor have tests. Honesty, DoT EV, heal-apply, and focus still have no decide-layer tests.

### 1.7 What this increment does **not** change

T0–T5 modules (POS / TGT / RES / ROL / TEM / ADV) and SYS-01…SYS-05 in the parent catalog remain the implementation order. This file adds SYS-06…SYS-12 and FUT-01…FUT-23. Do not implement FUT modules before the honesty + enumerator slices.

---

## 2. Design additions (normative)

1. **Legal = player-legal.** An enemy action is illegal if `isTileCastableLive` (or a shared extracted helper) would reject the same spell, origin, dest, and public occupancy. Decide must not emit it; apply must not invent a replacement (Fire Bolt).
2. **Spend fields that already exist.** `Enemy.currentAp` / `currentMp` are the budget. `ENEMY_REACHABLE_STEP_BUDGET` is a debug fallback only when those fields are missing (legacy summons), never a cheat walk of 3.
3. **Kit width is relative, not a map object and not `player.level * k`.** Same sigmoid family as module attach.
4. **T6+ stacks.** A new module is an extra scorer on the same enumerator. It does not replace T0–T5 and does not require a new integer tier.
5. **Public initiative / bar / family only.** Next-actor and “player kit threat” read the combatant list and the **visible** spell bar, not the full owned book.
6. **Erratic stays spectacle.** A logged wild-cast that deals no damage must not be “upgraded” into a free off-kit hit.

---

## 3. System proposals (2026-09-01)

### AI-SYS-06

**NAME:** Targeting-shape legality  
**ROLE:** system  
**SOPHISTICATION:** T1+ (required for any enemy that casts)  
**DECISION_RULES:** Shared helper (extract from `isTileCastableLive`, do not fork) rejects a dest unless: distance metric matches `targetType` (Manhattan ground / Chebyshev enemy-area); `minRange ≤ dist ≤ maxRange ?? range`; `linear` ⇒ cardinal; `diagonal` ⇒ `|dx|===|dy|`; `freeCells` ⇒ unoccupied; LoS when the **AI policy** says so (`lineOfSight !== false`). Enumerator drops illegal dests.  
**SCORING_MODEL:** Illegal ⇒ −∞ (dropped). No EV for a tile the player could not click.  
**SPELL_REQUIREMENTS:** Uses `SpellConfig` metadata only — never `name`.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** Always for any deciding enemy.  
**ENEMY_ARCHETYPES:** All casters.  
**PLAYER_COUNTERPLAY:** Stand off-axis of a linear frost; occupy `freeCells` tiles.  
**EDGE_CASES:** `minRange` default in player preview is 1 (`targeting.ts` 280) — self/heal `range: 0` must still be legal for self. Do not apply `minRange ?? 1` to `targetType === "self"`.  
**IMPLEMENTATION_COMPLEXITY:** Medium (extract helper; wire `findNearestLegalCastTile`).  
**TEST_SCENARIOS:** Linear frost, dest (2,2) from (0,0) → illegal. `minRange: 2`, adjacent dest → illegal. Ground barrier Manhattan 3 vs Chebyshev 3 mismatch.  
**STATUS:** PROPOSED

### AI-SYS-07

**NAME:** Movement-budget honesty  
**ROLE:** system  
**SOPHISTICATION:** T1+  
**DECISION_RULES:** `computeReachable` step budget = `enemy.currentMp` (slime-aware cost). Missing MP field → 0 walk this turn (do not silently use 3). 4-dir BFS stays if player walk is 4-dir; if player walk later gains diagonals, share one occupancy walker. Charger `canReach` uses the same budget, not `ENEMY_REACHABLE_STEP_BUDGET + 1`.  
**SCORING_MODEL:** Destinations outside the MP set are not enumerated.  
**SPELL_REQUIREMENTS:** None.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** Always.  
**ENEMY_ARCHETYPES:** All.  
**PLAYER_COUNTERPLAY:** MP-burn and slime flood actually shorten enemy walks.  
**EDGE_CASES:** `closes-in` that returns `kind: "cast"` from a dest 3 tiles away with MP 1 is illegal.  
**IMPLEMENTATION_COMPLEXITY:** Medium (depends on SYS-05 spend + SYS-10 snapshot).  
**TEST_SCENARIOS:** MP 1 cannot occupy a 3-step tile. Charger at Chebyshev 6 with MP 3 still waits.  
**STATUS:** PROPOSED

### AI-SYS-08

**NAME:** Focus-fire consumption  
**ROLE:** system  
**SOPHISTICATION:** T3  
**DECISION_RULES:** `scoreTargets` adds `wFocus` when `c.id === ctx.focusTargetId`. First non-healer actor that picks a damage target calls `setFocusTargetId` + `markFocusSet`. Later actors read it. Overkill spill (existing) may retarget and rewrite focus once.  
**SCORING_MODEL:** Parent TEM-01 term.  
**SPELL_REQUIREMENTS:** Damage / DoT / drain profiles.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** Same as TEM-01 (`mu ≈ 0.3`).  
**ENEMY_ARCHETYPES:** All non-healer-primary.  
**PLAYER_COUNTERPLAY:** Peel; overheal the focused id.  
**EDGE_CASES:** Focus dies mid-round → clear and allow one re-roll. Healer does not set focus.  
**IMPLEMENTATION_COMPLEXITY:** Low.  
**TEST_SCENARIOS:** Second charger scores the first’s `targetId` above an equal-HP other.  
**STATUS:** PROPOSED

### AI-SYS-09

**NAME:** Relative kit width  
**ROLE:** system  
**SOPHISTICATION:** T1+ (authoring)  
**DECISION_RULES:** Stop passing `currentMap.levelZone` into `buildEnemyKit`. Width = how many **profiled** ids beyond the chassis staple, rolled from the same `score` as SYS-01 (`peer + pack + mod`). Example: staple always; +1 utility if `score > 0`; +1 nuke if `score > 0.6` and a profile exists. Never `Math.floor(levelZoneObject)`. Never `if (enemy.level >= 30) inferno`.  
**SCORING_MODEL:** N/A (spawn).  
**SPELL_REQUIREMENTS:** Every emitted id has SYS-02 profile **and** apply branch.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** Always at spawn.  
**ENEMY_ARCHETYPES:** All chassis.  
**PLAYER_COUNTERPLAY:** Below-peer remnants keep staple-only kits.  
**EDGE_CASES:** Queen staple is frost/inferno **by role**, not heal. Repairing width without SYS-04 re-introduces heal-first queens.  
**IMPLEMENTATION_COMPLEXITY:** Medium (spawn only; do not grow WX).  
**TEST_SCENARIOS:** `buildEnemyKit("queen", {name:"x"})` must not be the production call. Same enemy level, player 5 vs 50 → different width distributions.  
**STATUS:** PROPOSED

### AI-SYS-10

**NAME:** Public combatant snapshot  
**ROLE:** system  
**SOPHISTICATION:** T1+ (required for T4 / T6+)  
**DECISION_RULES:** WX `aiCombatants` copies, when public: `currentAp`, `currentMp`, `res`, `sr` (or `getEffectiveStat`), `activeEffects` (stat, type, duration, `dotType`). Player row uses the same fields the HUD shows. No pending click, no fog pierce, no unrevealed RNG.  
**SCORING_MODEL:** Enables TGT-05, RES-06, TEM-03/04, ADV-*, FUT-15.  
**SPELL_REQUIREMENTS:** None.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** Always.  
**ENEMY_ARCHETYPES:** All.  
**PLAYER_COUNTERPLAY:** Hidden book stays hidden; only the bar is visible.  
**EDGE_CASES:** If a field is not on the HUD / combatant, treat as unknown and disable modules that need it.  
**IMPLEMENTATION_COMPLEXITY:** Low–medium (type + WX snapshot; no math change).  
**TEST_SCENARIOS:** Snapshot fixture includes RES 50 → estimate uses it. Missing AP → ADV-04 disabled.  
**STATUS:** PROPOSED

### AI-SYS-11

**NAME:** LoS policy lock  
**ROLE:** system  
**SOPHISTICATION:** all  
**DECISION_RULES:** Enemy decide keeps default-on LoS (`lineOfSight !== false`). Player preview/live keeps opt-in (`!!lineOfSight`). Apply for enemy casts must re-check the **enemy** policy, not the player one. Never skip LoS to feel smart.  
**SCORING_MODEL:** N/A (correctness).  
**SPELL_REQUIREMENTS:** `lineOfSight` flag only.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** Always.  
**ENEMY_ARCHETYPES:** All.  
**PLAYER_COUNTERPLAY:** Walls and barriers still break enemy shots.  
**EDGE_CASES:** `lineOfSight === false` (auras) skip both.  
**IMPLEMENTATION_COMPLEXITY:** Low (document + apply re-check).  
**TEST_SCENARIOS:** Wall between bishop and player → no frost; reposition or hold.  
**STATUS:** PROPOSED

### AI-SYS-12

**NAME:** Erratic / betrayal isolation  
**ROLE:** system  
**SOPHISTICATION:** spectacle only (not a sophistication tier)  
**DECISION_RULES:** Leader-death erratic may move randomly and **log** panic. It must not apply an off-kit spell, skip LoS, or grant Fire Bolt. Betrayal (ally damage + 6× enrage) is not a T5+ module and must not be re-keyed to `aiTier`. If kept as flavour, gate on a spawn flag with low `pMax`, not level bands.  
**SCORING_MODEL:** Not scored.  
**SPELL_REQUIREMENTS:** None.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** Optional flavour roll; `pMax` low.  
**ENEMY_ARCHETYPES:** None (anti-tactic).  
**PLAYER_COUNTERPLAY:** N/A.  
**EDGE_CASES:** Do not “fix” the logged-but-not-applied wild cast by dealing damage.  
**IMPLEMENTATION_COMPLEXITY:** Low (delete or isolate WX 15956–16059).  
**TEST_SCENARIOS:** Leader death → at most a random legal step; no kit-less damage.  
**STATUS:** PROPOSED

---

## 4. Tier 6+ modules (full specs)

Attach via SYS-01. Higher `mu` than T4/T5. Stack. Still one-turn (or depth-2 with the 256-node cap from SYS-03).

### AI-FUT-01

**NAME:** Bait tile  
**ROLE:** positioning  
**SOPHISTICATION:** T6  
**DECISION_RULES:** If ADV-02 history shows the player re-entered tile P, prefer a dest that is **one legal step** off the optimal kite/artillery tile such that a player step onto the obvious approach cell enters this enemy’s preferred range + LoS (or an ally’s planned AoE). Never stand on a hazard to bait.  
**SCORING_MODEL:** `+wBait` if dest is off-optimal **and** the player’s last approach vector cell is now in this (or ally) legal set. `−wBait` if dest loses current killableNow.  
**SPELL_REQUIREMENTS:** Ranged profile; optional ground/AoE.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** `mu ≈ 1.2`; requires ADV-02 attached.  
**ENEMY_ARCHETYPES:** kiter, artillery, controller  
**PLAYER_COUNTERPLAY:** Do not take the obvious step; swap; break LoS.  
**EDGE_CASES:** First visit to P → 0. No hidden path prediction.  
**IMPLEMENTATION_COMPLEXITY:** Medium.  
**TEST_SCENARIOS:** Player ended two turns on (4,4) approaching from +x → bishop prefers (6,4) over (5,4) if both legal.  
**STATUS:** PROPOSED

### AI-FUT-02

**NAME:** Pack cooldown rotation  
**ROLE:** team  
**SOPHISTICATION:** T6  
**DECISION_RULES:** Blackboard `spentHeavyIdsThisRound`. A “heavy” spell is `cooldown >= 2` or `apCost >= 5`. Second ally this round scores that same id ≈ 0 unless `killableNow`. Fillers (frost, strike) remain legal.  
**SCORING_MODEL:** `−wDupCd` if `spell.id` is already on `spentHeavyIdsThisRound` and not lethal.  
**SPELL_REQUIREMENTS:** Cooldown-aware profiles (RES-05).  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** `mu ≈ 1.1`; pack size ≥ 2 with ≥1 heavy id.  
**ENEMY_ARCHETYPES:** artillery, controller  
**PLAYER_COUNTERPLAY:** Spread; the second nuke is withheld.  
**EDGE_CASES:** Last living enemy — never hold.  
**IMPLEMENTATION_COMPLEXITY:** Low (blackboard field).  
**TEST_SCENARIOS:** Two queens with inferno: first may inferno; second frosts unless inferno kills.  
**STATUS:** PROPOSED

### AI-FUT-03

**NAME:** Fake retreat  
**ROLE:** resource  
**SOPHISTICATION:** T6  
**DECISION_RULES:** Depth-2 only (SYS-03): `stepAway` then legal cast from the new cell if leftover AP/MP pay both. Intent log `"fake-retreat"`. Not a skip-with-move.  
**SCORING_MODEL:** `U(stepAway+cast) > U(cast) + U(stepAway)` when the step leaves melee **and** the cast still hits.  
**SPELL_REQUIREMENTS:** Ranged profile still legal after one step.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** `mu ≈ 1.3`; needs SYS-03 combo.  
**ENEMY_ARCHETYPES:** kiter, artillery  
**PLAYER_COUNTERPLAY:** Follow the step; occupy the landing tile.  
**EDGE_CASES:** Step spends all MP → no fake, just retreat or cast.  
**IMPLEMENTATION_COMPLEXITY:** High (combo enum).  
**TEST_SCENARIOS:** Adjacent bishop, frost range 3, MP 2, AP 3 → step then frost, not skip.  
**STATUS:** PROPOSED

### AI-FUT-04

**NAME:** Summon screen  
**ROLE:** summoner  
**SOPHISTICATION:** T6  
**DECISION_RULES:** Placement = first `isCellFree` tile on the player’s last **public** approach vector (ADV-02 / FUT-13), inside summon range, not a hazard. Ring scan if the vector cell is blocked (parent ROL-06 midpoint fix).  
**SCORING_MODEL:** Summon EV `+wScreen` if the dest is on the player→ward line.  
**SPELL_REQUIREMENTS:** `isSummon` + `usableByEnemy` (wolf/archer today).  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** `mu ≈ 1.0`; role summoner.  
**ENEMY_ARCHETYPES:** summoner  
**PLAYER_COUNTERPLAY:** Sit on the spawn tile; kill the summoner.  
**EDGE_CASES:** No history → fall back to ROL-06 ring. Cap/CD still skip summon (then FUT-23 kit fallback).  
**IMPLEMENTATION_COMPLEXITY:** Medium.  
**TEST_SCENARIOS:** Player walked +x two turns → wolf lands on that +x cell if free.  
**STATUS:** PROPOSED

### AI-FUT-05

**NAME:** Hazard escort  
**ROLE:** team  
**SOPHISTICATION:** T6  
**DECISION_RULES:** If an ally has a legal `pushback` / `attract` and the player’s dest after that move is lava/spikes/void, this actor may **delay damage** one turn to hold a tile that keeps the player in the push line. Requires apply branches for push/attract (do not enable those ids until then).  
**SCORING_MODEL:** `+wEscort` × hazard cost of the projected dest. Friendly fire 0.  
**SPELL_REQUIREMENTS:** Push/attract profiles + apply.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** `mu ≈ 1.4`; pack has a push/attract profile.  
**ENEMY_ARCHETYPES:** controller, disruptor, tank  
**PLAYER_COUNTERPLAY:** Step off the line; don’t stand next to lava.  
**EDGE_CASES:** Projected dest occupied → 0. No invented extra push distance.  
**IMPLEMENTATION_COMPLEXITY:** High (apply missing).  
**TEST_SCENARIOS:** Player adjacent to lava, ally has push → other ally holds rather than clustering.  
**STATUS:** PROPOSED

### AI-FUT-06

**NAME:** Next-actor tempo  
**ROLE:** advanced  
**SOPHISTICATION:** T6  
**DECISION_RULES:** Read the **public** initiative / turn-order list (already built at battle start). If the next living actor is an ally artillery, prefer setup (expose/mark/cluster). If the next actor is the player with high public AP, prefer retreat/control.  
**SCORING_MODEL:** `+wSetup` when `nextId` is allied heavy; `+wDeny` when `nextId` is player and `playerApFrac` high.  
**SPELL_REQUIREMENTS:** Optional mark/expose profiles.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** `mu ≈ 1.2`; needs SYS-10 AP on player.  
**ENEMY_ARCHETYPES:** support, controller, artillery  
**PLAYER_COUNTERPLAY:** High-init so you act before the setup resolves.  
**EDGE_CASES:** Unknown order → module off. Do not simulate hidden delay.  
**IMPLEMENTATION_COMPLEXITY:** Medium.  
**TEST_SCENARIOS:** Next is queen inferno → pawn holds a cluster tile instead of melee.  
**STATUS:** PROPOSED

### AI-FUT-07

**NAME:** Visible player kit threat  
**ROLE:** target / advanced  
**SOPHISTICATION:** T6  
**DECISION_RULES:** Threat proxy adds weights for ids on the **visible spell bar** only (HUD / `spellBarOrder` public). Heal/buff ids raise “kill support / close gap”; long-range nuke ids raise kite/hold. Owned-but-unbarred ids are hidden — do not read them.  
**SCORING_MODEL:** `threatPlayer += Σ barId.publicTag` (heal, nuke, control).  
**SPELL_REQUIREMENTS:** None (reads player bar metadata).  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** `mu ≈ 1.1`.  
**ENEMY_ARCHETYPES:** All T6.  
**PLAYER_COUNTERPLAY:** Hide a nuke off the bar; show a dummy heal.  
**EDGE_CASES:** Empty bar → stats-only (ADV-01).  
**IMPLEMENTATION_COMPLEXITY:** Medium (must not leak ownedSpellIds).  
**TEST_SCENARIOS:** Bar shows only Strike → kiter holds range less. Bar shows Inferno → tank does not walk to dist 1.  
**STATUS:** PROPOSED

### AI-FUT-08

**NAME:** Family / reflect honesty  
**ROLE:** advanced  
**SOPHISTICATION:** T6  
**DECISION_RULES:** Score only **implemented** family hooks: `void_mirror` 25% pre-crit reflect, `ember_knight` melee burn, `tide_shade` melee MP −1 (`ENEMY_ELITE_EVOLUTION` live table). Do not path as if wraiths phase walls (register text, not live). Prefer physical vs void_mirror if a physical profile is in kit; otherwise do not suicide-cast into reflect unless killableNow after 25% bounce (own HP).  
**SCORING_MODEL:** `−wReflect * 0.25 * outgoing` when target family is void_mirror and spell is not physical.  
**SPELL_REQUIREMENTS:** `isPhysical` flag on profiles.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** `mu ≈ 1.0`; requires a live family hook on the **player-side** target or on self.  
**ENEMY_ARCHETYPES:** All damage roles.  
**PLAYER_COUNTERPLAY:** Bring physical vs mirrors.  
**EDGE_CASES:** Lore-only families (Crimson Spawn, etc.) → term 0.  
**IMPLEMENTATION_COMPLEXITY:** Medium.  
**TEST_SCENARIOS:** Void-mirror player, frost vs strike in kit → strike preferred if both legal.  
**STATUS:** PROPOSED

### AI-FUT-09

**NAME:** Differentiated hazard costs  
**ROLE:** positioning  
**SOPHISTICATION:** T6 (T1 POS-04 may keep a flat penalty)  
**DECISION_RULES:** Ice = slip / extra step risk (public ice rule). Lava = HP tick. Spikes = HP tick. Thorned / void = impassable or tick as the map actually applies. Full HP still pays the penalty (POS-04 lift). Berserker may accept lava if EV to kill exceeds the tick.  
**SCORING_MODEL:** Separate `−wIce / −wLava / −wSpike / −wVoid`.  
**SPELL_REQUIREMENTS:** None.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** `mu ≈ 0.8` (can attach earlier than other T6).  
**ENEMY_ARCHETYPES:** All except kamikaze-on-detonate.  
**PLAYER_COUNTERPLAY:** Kite across lava; bait ice slips.  
**EDGE_CASES:** Only path is lava → cheapest or hold (POS-04).  
**IMPLEMENTATION_COMPLEXITY:** Low.  
**TEST_SCENARIOS:** Equal-range ice vs lava → prefer ice if slip is cheaper than lava tick.  
**STATUS:** PROPOSED

### AI-FUT-10

**NAME:** Occupy escape  
**ROLE:** positioning  
**SOPHISTICATION:** T6  
**DECISION_RULES:** If the player’s last public cell has ≥2 walkable exits, prefer a dest that occupies the highest-degree remaining exit (body-block). Tank/protector primary; charger only if not throwing a kill.  
**SCORING_MODEL:** `+wOccupyExit` if dest ∈ playerExitSet and role is tank/protector.  
**SPELL_REQUIREMENTS:** None.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** `mu ≈ 1.2`.  
**ENEMY_ARCHETYPES:** tank, protector, charger  
**PLAYER_COUNTERPLAY:** Cut around; summon into the block.  
**EDGE_CASES:** Open field (4+ exits) → term small.  
**IMPLEMENTATION_COMPLEXITY:** Low.  
**TEST_SCENARIOS:** Corridor: rook steps onto the player’s rear exit, not the wisp.  
**STATUS:** PROPOSED

### AI-FUT-11

**NAME:** Surround / split-pack  
**ROLE:** team  
**SOPHISTICATION:** T6  
**DECISION_RULES:** Soft slots around the focus id: actors prefer dests that increase the number of **unique** cardinal sides covered (N/E/S/W). Does not force illegal diagonal walks. Overrides POS-06 only when TEM-05 is not planning a friendly nova.  
**SCORING_MODEL:** `+wSurround * uniqueSidesAfter`.  
**SPELL_REQUIREMENTS:** None.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** `mu ≈ 1.1`; pack size ≥ 3.  
**ENEMY_ARCHETYPES:** Mixed packs.  
**PLAYER_COUNTERPLAY:** Collapse one side; AoE the stack if they fail POS-06.  
**EDGE_CASES:** 1v1 → off.  
**IMPLEMENTATION_COMPLEXITY:** Medium.  
**TEST_SCENARIOS:** Three pawns: they do not all end on the same adjacent tile.  
**STATUS:** PROPOSED

### AI-FUT-12

**NAME:** Friendly-blast avoidance  
**ROLE:** positioning  
**SOPHISTICATION:** T6  
**DECISION_RULES:** Blackboard `plannedAoECell` + bomber dest. Allies score `−∞` (or huge penalty) for dests inside a friendly `areaRadius` / `AI_KAMIKAZE_BLAST_RADIUS` unless they are the bomber.  
**SCORING_MODEL:** Hard drop unless kamikaze self.  
**SPELL_REQUIREMENTS:** AoE / bomber kit in the pack.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** `mu ≈ 1.0`; requires TEM-05 or a bomber ally.  
**ENEMY_ARCHETYPES:** All non-kamikaze.  
**PLAYER_COUNTERPLAY:** Force a choke so they cannot spread.  
**EDGE_CASES:** Inferno is single-target DoT — do not treat it as a blast (parent TEM-05).  
**IMPLEMENTATION_COMPLEXITY:** Low.  
**TEST_SCENARIOS:** Bomber approaching (4,4) → ally does not step to (4,5).  
**STATUS:** PROPOSED

### AI-FUT-13

**NAME:** Lead tile  
**ROLE:** advanced  
**SOPHISTICATION:** T6  
**DECISION_RULES:** Vector = last public player cell − previous public cell (length 1 if they moved). Ground/AoE/`freeCells` dest prefers `current + vector` if that tile is legal. Unit-targeted spells still target the unit, not the ghost tile.  
**SCORING_MODEL:** `+wLead` on legal ground dest = lead tile.  
**SPELL_REQUIREMENTS:** Ground / area / trap profiles. Barrier still `usableByEnemy: false` until profiled.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** `mu ≈ 1.3`.  
**ENEMY_ARCHETYPES:** artillery, controller, disruptor  
**PLAYER_COUNTERPLAY:** Stop-start; feint a direction.  
**EDGE_CASES:** No previous cell → 0. Do not extrapolate more than one tile.  
**IMPLEMENTATION_COMPLEXITY:** Medium.  
**TEST_SCENARIOS:** Player (3,3)→(4,3) → ground dest (5,3) outscores (4,3) if both legal.  
**STATUS:** PROPOSED

### AI-FUT-14

**NAME:** Overwatch hold  
**ROLE:** positioning  
**SOPHISTICATION:** T6  
**DECISION_RULES:** If no legal attack beats `U(hold)` and dest is already a choke / optimal range, `kind: "skip"` with intent `"overwatch"` — **destination = origin**. Distinct from charger wait (out of reach) and wounded retreat.  
**SCORING_MODEL:** `+wHoldChoke` when dest has ≤2 exits and player shortest path crosses it.  
**SPELL_REQUIREMENTS:** None.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** `mu ≈ 1.2`; tank/controller.  
**ENEMY_ARCHETYPES:** tank, controller, protector  
**PLAYER_COUNTERPLAY:** Don’t walk the choke; attract/swap the holder.  
**EDGE_CASES:** Apply must not translate this skip into Fire Bolt.  
**IMPLEMENTATION_COMPLEXITY:** Low (depends on SYS-05).  
**TEST_SCENARIOS:** Rook on 1-tile neck, player 4 away → hold, no advance.  
**STATUS:** PROPOSED

### AI-FUT-15

**NAME:** Buff hygiene  
**ROLE:** resource  
**SOPHISTICATION:** T6  
**DECISION_RULES:** If the intended ally already has a public effect with the same `buffStat` (or shield HP > 0 if that is public), shield/iron-skin/enrage/haste EV ≈ 0. Guardian then guards or holds instead of recasting (`decideSummonGuardian` 2111–2117).  
**SCORING_MODEL:** RES-06 “already applied” on buffs.  
**SPELL_REQUIREMENTS:** Buff profiles; SYS-10 effects.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** `mu ≈ 0.9` (cheap once snapshot exists).  
**ENEMY_ARCHETYPES:** support, protector, guardian summon  
**PLAYER_COUNTERPLAY:** Purge then they recast (tempo win).  
**EDGE_CASES:** Refresh vs stack — only refresh if duration ≤ 1 **and** T6+.  
**IMPLEMENTATION_COMPLEXITY:** Medium.  
**TEST_SCENARIOS:** Ward already iron-skinned → golem moves to guard, does not recast.  
**STATUS:** PROPOSED

### AI-FUT-16

**NAME:** Linear corridor artillery  
**ROLE:** positioning  
**SOPHISTICATION:** T6  
**DECISION_RULES:** For `linear` / `diagonal` spells, dests that put the focus on-axis outscore equal-range off-axis dests. Combine with SYS-06 (off-axis dests are illegal to cast from, not merely low).  
**SCORING_MODEL:** `+wAxis` if `linear` and (dx=0 or dy=0) to focus.  
**SPELL_REQUIREMENTS:** `linear` or `diagonal` flag on a profiled spell.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** `mu ≈ 1.0` when kit has such a spell.  
**ENEMY_ARCHETYPES:** artillery, controller  
**PLAYER_COUNTERPLAY:** Stand off-axis.  
**EDGE_CASES:** No linear spell in kit → module inert.  
**IMPLEMENTATION_COMPLEXITY:** Low (depends on SYS-06).  
**TEST_SCENARIOS:** Frost `linear`, dest (3,1) vs (3,3) to target (3,6) → (3,3) wins.  
**STATUS:** PROPOSED

### AI-FUT-17

**NAME:** Elite extra-spell honesty  
**ROLE:** system / kit  
**SOPHISTICATION:** T6 (authoring)  
**DECISION_RULES:** World elite extras (`worldFeatures.ts` usableByEnemy draw) may only attach ids that have SYS-02 profiles **and** apply branches. Otherwise the elite is extra stats / extra staple copies, not a random unscoreable swap/mark.  
**SCORING_MODEL:** N/A.  
**SPELL_REQUIREMENTS:** Profiled ids only.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** Elite / champion flags raise `pack` in SYS-01; they do not bypass the profile gate.  
**ENEMY_ARCHETYPES:** Elite overlays.  
**PLAYER_COUNTERPLAY:** N/A (authoring).  
**EDGE_CASES:** Admin custom kit with unprofiled id → clamp + log (SYS-04).  
**IMPLEMENTATION_COMPLEXITY:** Low (filter at assign).  
**TEST_SCENARIOS:** Elite roll cannot emit `spell-swap` until FUT-22 apply exists.  
**STATUS:** PROPOSED

### AI-FUT-18

**NAME:** Post-player tempo  
**ROLE:** advanced  
**SOPHISTICATION:** T6  
**DECISION_RULES:** After the player’s public turn ends, if `currentAp`/`currentMp` are spent (HUD), raise approach / melee weights and lower slow/frost-MP (ADV-04 inverse). Values are the **current** public bar, not a prediction of next turn’s refresh until refresh is visible.  
**SCORING_MODEL:** `approach *= (1 + wSpent * (1 - playerApFrac))`.  
**SPELL_REQUIREMENTS:** None.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** `mu ≈ 1.1`; SYS-10.  
**ENEMY_ARCHETYPES:** charger, tank, assassin  
**PLAYER_COUNTERPLAY:** End turn with leftover AP to look dangerous.  
**EDGE_CASES:** If AP resets before enemies act and that reset is public, use post-reset values.  
**IMPLEMENTATION_COMPLEXITY:** Medium.  
**TEST_SCENARIOS:** Player AP 0 after their turn → charger `canReach` commits; no slow.  
**STATUS:** PROPOSED

### AI-FUT-19

**NAME:** Multi-hit expected value  
**ROLE:** spell contract  
**SOPHISTICATION:** T6  
**DECISION_RULES:** Profiles for `hitsMultiple` / `aoe` / `hitTiles` / `areaRadius` sum single-target EV over **public** occupants of those tiles. Subtract friendly fire. `lifesteal-nova` / `frost-nova` stay unused until this **and** apply exist. Do not invent a radius for Inferno (still single-target DoT).  
**SCORING_MODEL:** Parent §6 `aoe` default.  
**SPELL_REQUIREMENTS:** Those flags + apply.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** `mu ≈ 1.0` when such a spell is in kit.  
**ENEMY_ARCHETYPES:** artillery, disruptor  
**PLAYER_COUNTERPLAY:** Spread.  
**EDGE_CASES:** `hitsAllies: false` → do not add ally tiles as victims, but still penalize if apply would hit them anyway.  
**IMPLEMENTATION_COMPLEXITY:** Medium.  
**TEST_SCENARIOS:** Two player-side units in radius 2 → nova EV > frost; one unit → frost.  
**STATUS:** PROPOSED

### AI-FUT-20

**NAME:** Boss phase overlay  
**ROLE:** elite / boss  
**SOPHISTICATION:** T5–T6  
**DECISION_RULES:** `useBossAI` phase kits become **weight overlays** on the shared enumerator: phase 1 prefers control/setup; phase 2 prefers damage/execute. Still first-class legality (LoS, range, AP/MP). `pickBossKitSpell` empty-Map cooldown cheat is removed — use the real cooldown map. Phase change does not grant instant kill.  
**SCORING_MODEL:** Phase vector multiplies role weights; same U().  
**SPELL_REQUIREMENTS:** Phase pool ids profiled.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** `isBoss` pack term (SYS-01); not `level >= 100`.  
**ENEMY_ARCHETYPES:** catalog bosses.  
**PLAYER_COUNTERPLAY:** Same as now — break LoS, burn AP, spread.  
**EDGE_CASES:** Unique boss scripts (Pale Archbishop, etc.) may keep a named overlay; they must call the enumerator, not a second movement brain that ignores MP.  
**IMPLEMENTATION_COMPLEXITY:** High (do last).  
**TEST_SCENARIOS:** Phase 2 still cannot cast through a wall; cooldown 3 is respected.  
**STATUS:** PROPOSED

### AI-FUT-21

**NAME:** Public miss chance  
**ROLE:** resource  
**SOPHISTICATION:** T6  
**DECISION_RULES:** If a **public** map modifier (Paper Windstorm) halves or misses ranged (`WX` 17164–17168 today applies to Fire Bolt — after SYS-05 it must apply to real kit ranged the same way the player sees), EV *= (1 − publicMiss). Do not invent a private accuracy stat.  
**SCORING_MODEL:** `EV *= (1 - pMiss)` when the modifier is on the map and the spell is ranged.  
**SPELL_REQUIREMENTS:** Ranged profiles.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** `mu ≈ 0.9` when the modifier is active.  
**ENEMY_ARCHETYPES:** artillery, kiter  
**PLAYER_COUNTERPLAY:** Fight in Windstorm; close to melee.  
**EDGE_CASES:** Modifier off → 1.0.  
**IMPLEMENTATION_COMPLEXITY:** Low.  
**TEST_SCENARIOS:** Windstorm on, frost vs adjacent strike → strike can outscore frost.  
**STATUS:** PROPOSED

### AI-FUT-22

**NAME:** Swap / mark / sacrifice profiles  
**ROLE:** spell contract  
**SOPHISTICATION:** T3–T6 (contract is T1; use is T3+)  
**DECISION_RULES:** Category defaults from parent §6. Swap EV = U(swapped occupancy) − U(now); refuse if dest is worse. Mark EV only if a follow-up damage spell is affordable this turn or next (RES-04). Sacrifice EV = 3× spent HP vs target; refuse below retreat line unless berserker. **`usableByEnemy: true` today** on swap / mark / sacrifice (`spellData.ts` 155, 173, 247) is a contract violation until apply + profile ship — treat as false in the enumerator.  
**SCORING_MODEL:** Parent §6 teleport / isMark / isSacrifice.  
**SPELL_REQUIREMENTS:** Those flags + apply (swap has no enemy apply today).  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** Profile always; attach to disruptor/assassin via SYS-01 `mu ≈ 0.7+`.  
**ENEMY_ARCHETYPES:** disruptor, assassin, berserker (sacrifice).  
**PLAYER_COUNTERPLAY:** Stand off hazards; stay above sacrifice EV.  
**EDGE_CASES:** Elite extras must not emit these ids until this lands (FUT-17).  
**IMPLEMENTATION_COMPLEXITY:** High (new apply).  
**TEST_SCENARIOS:** Swap onto lava → cast; reverse → no. Mark with AP left for strike → mark; AP 0 leftover → no mark.  
**STATUS:** PROPOSED

### AI-FUT-23

**NAME:** Summoner relative cap + kit fallback  
**ROLE:** summoner  
**SOPHISTICATION:** T2 (fallback) / T6 (relative chance)  
**DECISION_RULES:** Replace `0.12 + playerLevel * 0.02` with `clamp(P0 + k * sigmoid(peer), 0, Pmax)` e.g. `Pmax = 0.35`. When summon is illegal (cap, CD, no free tile, no spell), **fall through to `decideEnemyAction` / generic-caster** — do not skip the turn (`decideSummonerAction` 1827–1873).  
**SCORING_MODEL:** ROL-06 summon EV vs fight EV.  
**SPELL_REQUIREMENTS:** Summon profile; chassis staple still in `e.spells`.  
**RELATIVE_DIFFICULTY_ELIGIBILITY:** Spawn chance uses SYS-01 `score`, not raw player level.  
**ENEMY_ARCHETYPES:** summoner  
**PLAYER_COUNTERPLAY:** Cap the board; sit on tiles.  
**EDGE_CASES:** Midpoint wall → ring scan, then kit.  
**IMPLEMENTATION_COMPLEXITY:** Medium.  
**TEST_SCENARIOS:** Player level 200, even-ratio remnant → chance not ~1.0. Cap reached + frost in kit → frost.  
**STATUS:** PROPOSED

---

## 5. Spell-awareness contract (reminder)

New or newly enemy-enabled mechanics must add a `SpellScoreProfile` (parent §6) **before** `usableByEnemy` is true and before `buildEnemyKit` / elite extras emit the id.

Already `usableByEnemy: true` without a working decide+apply pair (do not give these to AI until FUT-22 / apply):

`spell-swap`, `spell-mark`, `spell-sacrifice`, `spell-lifesteal-nova`, `spell-enrage`, `spell-haste`, `spell-weaken`, `spell-expose`, `spell-drain-courage`, `spell-cursed-wound`, `spell-shadow-veil`, `spell-frost-nova`, `spell-inferno` (DoT `damage: 0`), `starter-poison` / `spell-venom-strike` (same), `starter-shield` / `spell-iron-skin`.

Keep `usableByEnemy: false` until profiled: barrier, mirror, timestep, rallying-cry, sentinel/bomber/wisp summons.

`starter-heal` is self-only (`range: 0`). It cannot satisfy ROL-04 ally heal.

---

## 6. Implementation order (this increment)

Do not start FUT modules first.

1. SYS-05 (Fire Bolt, AP/MP debit, ally heal) — still P0.  
2. SYS-06 + SYS-07 + SYS-11 — legality = player legality.  
3. SYS-09 + SYS-10 — kit width + snapshot.  
4. SYS-08 — focus actually used.  
5. SYS-12 — isolate erratic.  
6. Parent T2–T5 roles / team / adaptive.  
7. FUT-15, FUT-09, FUT-23 (cheap once snapshot/kit exist).  
8. FUT-01…FUT-22 as spells and apply land.

Each slice: `engine/enemyAI*.test.ts`, zero WX drive-by, no RAF / map gen / turn order / damage-formula edits. Scoring **reads** RES/SR; it does not change `calcScaledDamage`.

---

## 7. Extra test scenarios

| ID | Setup | Expect |
| :--- | :--- | :--- |
| TS-KITOBJ | `buildEnemyKit("queen", { name: "Mid", minLevel: 10, maxLevel: 20 })` | Must not be the production path; production uses relative width. |
| TS-FOCUS | Two generics, first sets focus to player | Second’s `scoreTargets` ranks player above an equal-HP summon. |
| TS-LINEAR | `linear` frost, dest off-axis | Not in legal set. |
| TS-MINR | `minRange: 2`, dest dist 1 | Not in legal set. |
| TS-MP3 | `currentMp: 1`, dest 3 orthogonal steps | Not reachable. |
| TS-ERRATIC | Leader dead, `aiTier` 7 | Random legal step only; no damage from the logged spell. |
| TS-SUMCAP | Player level 80, even-ratio pawn | Summoner chance < 1.0. |
| TS-GUARD | Guardian, ward already shielded (public) | No recast; guard or hold. |
| TS-BOSSCD | Boss kit spell remaining CD 2 | Not picked (`new Map()` cheat gone). |
| TS-SWAP | `spell-swap` in elite extra, no profile | Not assigned / not legal. |

Parent TS-* rows still apply.

---

## 8. Mapping (requested list → ids)

Unchanged from parent §19 for T0–T5. T6+ additions:

| Request / gap | Primary AI_ID |
| :--- | :--- |
| Targeting shape / minRange / linear | AI-SYS-06 |
| Actual MP walk | AI-SYS-07 |
| Focus fire actually used | AI-SYS-08 |
| Kit width not a level table | AI-SYS-09 |
| Visible AP/MP/RES/effects | AI-SYS-10 |
| LoS honesty | AI-SYS-11 |
| Erratic not a tier | AI-SYS-12 |
| Bait / rotation / fake retreat / screen / escort | AI-FUT-01…05 |
| Initiative, visible bar, family, hazards, occupy, surround | AI-FUT-06…11 |
| Friendly blast, lead, overwatch, buff hygiene, linear | AI-FUT-12…16 |
| Elite extras, post-player tempo, multi-hit, boss overlay | AI-FUT-17…20 |
| Public miss, swap/mark/sacrifice, summoner cap | AI-FUT-21…23 |

Every row: **STATUS: PROPOSED**.
