# Emergent Build & Meta Analysis — 2026-09-02

**Analyzer:** Emergent Build & Meta Analyzer  
**Automation:** `7b2f2b58-a49e-11f1-a7d1-d6b4613131ce` (cron `0 */72 * * *`)  
**HEAD:** `58302bc` (`Merge pull request #258` — GameKey shop)  
**Prior pass:** 2026-09-01 (`dd275aa`; `EMERGENT_META_2026-09-01.md`; ACTION_IDs `EBMA-2026-09-01-001` … `012`)  
**Gameplay code:** not modified. Balance was not changed.

This is a combination audit. Individual rows can look fair while two or three of them delete the rest of the kit.

Intervention is recommended only when a strategy:

- invalidates alternatives
- removes counterplay
- produces infinite / degenerate loops
- destroys progression or economy

Strong interesting synergy is left alone.

ACTION_IDs: [`ACTION_IDS_EBMA_2026-09-02.md`](./ACTION_IDS_EBMA_2026-09-02.md).

Prior IDs were **not implemented**. They are reissued with current line numbers. Escalate only where a cited gate actually moved.

---

## 0. What changed since 2026-09-01

Combat-relevant merges on the path from `dd275aa` → `58302bc` that touch this audit:

| Gate | 2026-09-01 | 2026-09-02 | Meta effect |
| :--- | :--- | :--- | :--- |
| Pacifist range preview | `applyHealBuffSideEffect` on highlight could fail the feat without a cast | `shouldApplyHealBuffSideEffectOnRangePreview()` is `false` (`targeting.ts` 83–85). Helper is **not called from WorldExploration** | Correct for Strike hover. Execute now uses **only** `recordPlayerSpellType` (`WX` 17103–17122). Vampire Bite / Mark / Barrier / Mirror / summons stay legal. **Escalate 003.** |
| BuffShop potions × no-heal | potions skipped `challengeHealUsedRef` | `recordChallengeItemHealUsed` (`challengeCompletion.ts` 225–229); `WX` 3556–3560 | Potion hole **closed**. Drain + Wisp still open. |
| Inf-HP summon catalog | admin `hpScale` could mint Inf | `adminGuard.mo` 386–406 finite `hpScale`/`damageScale` in `[0, 10]` | Admin abuse closed. Not a player combo. |
| Void Rift × controlled summon | player-side summons skipped the tick | `battleSetup.turnStart.test.ts` locks the commit | Counterplay restored. Do not re-open. |
| Dual-path summon unseal | occupancy could seal exits | reserved-cell + origin-vacate tests | Occupancy hygiene, not a damage combo. |
| Player summon AP | Charged | Still charged (`castResultSpendsAp` includes `"summon"`, 300–302; `WX` 17227) | Unchanged. |
| Attack Nearest Inferno CD | Closed on the player bar | Still closed (`WX` 17208–17210, 17258–17261) | Unchanged. |
| DoT append | no cap | unchanged (`appendDotStack` 31–37) | Still BROKEN. |
| Player `debuffStat` | damage loop never applied it | unchanged (`resolvePlayerCast` 876–1028) | Player bar control kit still dead. **Controlled Archer Slow is live** via `resolveSpellCast` 529–548. |
| Catalog = ownership | `usableByPlayer !== false` dumps the library | unchanged (`adminSafety.ts` 551–558) | Discovery still inert. |
| Enemy kit zone | object → NaN → zone 0 | unchanged (`WX` 12035; `buildEnemyKit` 187–192) | Still latent. |
| GameKey shop | Doka packages | admin-approval shop (#258) | Economy surface moved. Does not grant spells. Out of combat-combo scope. |

Closed since last pass (do not re-open):

- Pacifist failing on spell-range preview.
- BuffShop mid-fight potions paying no-heal.
- Inf-HP summon catalog writes.
- Player-controlled summons ignoring Void Rift ticks.
- Free player summon placement (0 AP) — already closed 2026-09-01.
- Attack Nearest Inferno cooldown skip on the player bar — already closed 2026-09-01.

Still unimplemented from 2026-09-01: DoT cap, player summon cap/CD, pacifist summon damage, player `debuffStat` wire, no-heal drain/Wisp, AI DoT `dotDamagePerTurn`, catalog≠ownership, Titan monitor, numeric zone, kit-spell CD, summoner-chance retarget, CHC restore.

---

## 1. Access model (what a player can actually bring)

There is still no observe → win → unlock path. “Discovered enemy spells” and “achievement/challenge spells” remain design docs (`SPELL_DISCOVERY_ECOSYSTEM_2026-09-01.md`, `SPELL_ADMIN_DESIGN_2026-09-01.md`), not live systems.

| Source | What enters the library | Spell grant? |
| :--- | :--- | :--- |
| `starterSpells` | All starter ids forced `isBaseSpell: true` (`WX` 2360–2368) | Always owned |
| `getSpellConfigs()` | Every `usableByPlayer !== false` id (`adminSafety.ts` 551–558; `WX` 2373–2400) | Catalog membership **is** ownership |
| Achievements | Doka only (`admin.mo` `defaultAchievements` 309–325) | No |
| Challenges | Doka / XP / badge (`challengeCompletion.ts` 38–103) | No |
| Recap / `applyRewards` | XP + Doka | No |
| `upgradeSpell` | Levels a known id; charges `10 * 2^level` | Must not grant |
| GameKey shop | Admin-approved keys | No spells |

Real loadout constraint: **8-slot bar**. The broken strategies below are 8-slot legal.

Backend seed (`admin.mo` `defaultSpells` 168–191) that actually fires on the player path:

| Id | On paper | Live `resolvePlayerCast` | Class |
| :--- | :--- | :--- | :--- |
| `shadow_strike` | 35 dmg / 3 AP / CD 2 / diagonal | Damage loop (`hitsMultiple` false, `damage` 35) | STRONG_BUT_HEALTHY |
| `thunder_clap` | 25 AoE / 4 AP / CD 3 | Damage loop via `multiTarget` → `hitsMultiple` | STRONG_BUT_HEALTHY |
| `void_collapse` | 80 AoE + pull / 12 AP / `minLevel` 30 | AoE damage only. Attract unused. 12 AP needs level 100 (`8 + floor(level/25)`). `minLevel` is listed on the type and **not** checked in `resolvePlayerCast`. | NICHE until ~100, then STRONG_BUT_HEALTHY |
| `soul_rend` | DoT + 25 upfront | `effectType === "dot"` takes the DoT branch; no `dotDamagePerTurn` → 0 tick | UNDERPOWERED (inert) |
| `vampire_bite` | Drain 20 / heal 20 | `effectType` is `"heal"` not `"drain"`; not `targetType === "self"` → 20 damage, **no heal**. `recordPlayerSpellType("heal")` does **not** flip Pacifist | UNDERPOWERED heal + **DOMINANT** Pacifist payload |
| `reflect_barrier` | Reflect next spell | Generic `buff` without `buffStat` / `isMirror` / `targetType: "self"` | UNDERPOWERED (inert) |

Enemy kits (`ENEMY_KITS` in `enemyAI.ts` 156–178) reuse starter ids. Seeing a bishop cast Frost teaches nothing and unlocks nothing.

---

## 2. Live gates (combo truth table)

| Gate | File | Live behavior |
| :--- | :--- | :--- |
| DoT append | `engine/dotStacks.ts` `appendDotStack` 31–37; `statusEffects.ts` `mergeIncomingEffect` 92–99; `WX` `applyActiveEffect` 1836–1858 | Same-type stacks add; no cap; independent durations |
| Player DoT apply | `spellEngine.ts` `resolvePlayerCast` 777–814 | Sets `dotDamagePerTurn` |
| Player damage debuffs | same, 876–1028 | **Does not** call `applyEffect` for `debuffStat` |
| Controlled-summon / enemy `resolveSpellCast` debuffs | `spellEngine.ts` 529–548 | **Does** apply `debuffStat`. Player-controlled Archer Slow is live |
| Enemy / boss inline debuffs | `WX` ~16682 / ~16761 | Apply; same `effectName` replaces (`applyOrRefreshNonDotEffect` 71–84); different names with the same `stat` add (`getStatModifier` 45–63) |
| Summon cap | `gameConstants.ts` `ENEMY_SUMMON_CAP = 2` (300) | Enemy only. Player `spawnPlayerSummon` (`WX` 9622–9675) has no alive-cap. Comment at `enemyAI.ts` 1816–1817 (“player-side summonCount gate”) is still false |
| Summon spell CD | `spellData.ts` 547–688 | No `cooldown` on the five kits |
| Summon kit CD | `summonControlCast.ts` `planSummonControlCast` 221–258 | AP, range, live geometry — **not** cooldown. Bomber Inferno (player CD 3) is free on the summon |
| Player summon AP | `challengeCompletion.ts` 300–302; `WX` 17227 | Charged |
| Pacifist execute | `WX` `recordPlayerSpellType` 17103–17122 | Offensive `effectType` list: damage/drain/aoe/dot/pushback/attract/cc/teleport. `"summon"`, `"heal"`, `"debuff"`, `"defense"`, `"buff"` do not flip |
| Pacifist preview | `targeting.ts` 83–85 | Does not flip. `applyHealBuffSideEffect` is test-only on the live path |
| Challenge heal (spells) | `WX` 17248–17254 | `targetType === "self" && effectType === "heal"` only |
| Challenge heal (potions) | `challengeCompletion.ts` 225–229 | **Now counted** in battle |
| Wisp / summon heal | `WX` 9238–9253 and 15104–15119 | Heals **player only**. Does not set `challengeHealUsedRef` |
| Drain heal | `castHelpers.ts` 466–480 | `drainPercent` default 0.5 of first-target damage. Does not set the flag |
| Summon-AI DoT | `summonExecutor.ts` 191–203 | `applyEffect` without `dotDamagePerTurn` or `stat`/`modifier` |
| Player-controlled summon DoT | `WX` `castControlledSummonSpell` → `resolveSpellCast` | Ticks |
| Timestep | `spellEngine.ts` 721–733 | Once per battle; 0 AP; restores formula AP/MP + active AP/MP additives |
| Sacrifice | `spellEngine.ts` 749–763 | 20% `characterStats.hp` → 3× via `dealDamage` → `enemyTakesDamage` (Enrage / Titan / Glass apply). Mark / crit do not |
| Upgrade damage | `combatMath.ts` `calcScaledDamage` 130–136 | `base * 1.03^level`. Does **not** scale `dotDamagePerTurn` literals |
| Battle AP | `progression.ts` `getPlayerBaseStats` 59–72 | Floor 8; +1 every `apMpGrowthEveryNLevels` (default 25) |
| Enemy kit zone | `WX` 12035 + `buildEnemyKit` 187–192 | `currentMap.levelZone` is `{name,minLevel,maxLevel}` (`WX` 4680, 5231). `Math.floor(object)` is `NaN`. Every kit stays zone 0 |
| Enemy summoner roll | `WX` 12047–12057 | `0.12 + playerLevel * 0.02` **per enemy**. 100% at level 44+. Global alive cap still 2 |
| Null Field | `mapModifiers.ts` 419–431 | Suppresses buff/debuff only. DoTs still apply |
| `minLevel` | `resolvePlayerCast` | Not enforced |

---

## 3. Combination reports

### 3.1 Unbounded player DoT recast — **BROKEN**

**COMPONENTS:** Poison Arrow (2 AP, 4/turn, 3 turns, no CD) + Venom Strike (3 AP, 4/turn, 3 turns, no CD) + Inferno (5 AP, 8/turn, 3 turns, CD 3). Optional: Arcane Surge / Arcane Overflow (−1 AP, min 1). Optional: player-controlled Archer (`resolveSpellCast` Poison). Optional: `hard_3` (max AP used ≤ 8).

**COMBO_SEQUENCE:**

1. Equip Poison + Venom + Inferno (and optionally an Archer).
2. Each player turn: dump leftover AP into Poison recasts (4 stacks at 8 AP; 8 stacks under Arcane Surge).
3. Mix Venom / Inferno when the extra tick is worth the AP.
4. Stacks append (`appendDotStack`). They do not refresh. A 10-turn boss fight is a damage integral, not a 4+4+8 ceiling.
5. `hard_3` accepts `maxApUsedInTurn <= 8` (`challengeCompletion.ts` 120–121). A full 8-AP Poison dump is legal for 150 Doka + 450 XP.

**ACCESS_REQUIREMENTS:** Starter library. Arcane Surge is a map-modifier roll, not an unlock. Archer is a starter summon.

**WHY_IT_IS_STRONG:** Cost-to-stack is linear; duration is independent; there is no same-source cap. Long fights (boss, dungeon chain, boss rush) make the last recast strictly better than a front-loaded nuke. Inferno’s CD only gates the 8-tick, not Poison. Null Field does not suppress DoTs. Upgrade 3%/level never touches the 4-tick literal, so stack count is the real scaling.

**COUNTERPLAY:** Kill faster than the integral. RES reduces each tick once (summed). Enemy kits are stuck at zone 0, so they rarely apply cleanse or pressure that forces the player off the recast.

**RELATIVE_PROGRESSION_CONTEXT:** Available at level 1. Late-game the **stack count** is the scaling, not the upgrade curve.

**PERSISTENCE/ECONOMY_IMPACT:** Faster clears → more `applyRewards` XP/Doka. Soft-destroys “spend Doka on spell levels” for damage spells because recast beats 3%/level on a 4-tick. `hard_3` converts the same dump into a challenge payout.

**RECOMMENDED_RESPONSE:** Same-source refresh or a small per-target / per-name cap. Keep Poison + Venom + Inferno as three different types that can coexist. Do not flatten DoT identity. See `EBMA-2026-09-02-001`.

---

### 3.2 Player summon flood — **DOMINANT**

**COMPONENTS:** Dire Wolf (3 AP) + Archer (3 AP) + Sentinel (3) + Bomber (2) + Wisp (2). No alive-cap. No summon-spell cooldown. Lifespan = `summonLifespan + floor(spellLevel / 2)` (`summonSpawn.ts` 154–157).

**COMBO_SEQUENCE:**

1. Turn 1 at 8 AP: Wolf + Archer + Wisp, or Wolf + two Wisps, or four Bombers.
2. Each summon gets its own turn (`type: "summon"`), own AP/MP budget, and (if player-controlled) a kit that goes through `resolveSpellCast` — including live Slow / ticking Poison.
3. Next player turn: spawn again. Nothing evicts the previous wave except lifespan.

**ACCESS_REQUIREMENTS:** All five kits are starters. 8-slot bar is the only limiter.

**WHY_IT_IS_STRONG:** Action-economy multiplier. One player turn buys three extra turns of units that occupy tiles, body-block, and (when controlled) apply real DoTs and Slow. Enemy summons are capped at 2 with a 2-turn cadence; the player is not. AP cost only slows the first dump. Blitz (`legendary_2`, under 5 turns, 450 Doka / 900 XP) is the natural payout.

**COUNTERPLAY:** Focus the Wisp (enemy AI already scores it high). AoE (Thunder Clap / Chain Lightning / Lifesteal Nova). Lifespan expiry. Occupancy / portal-reserved cells prevent sealing exits (closed this cycle). Void Rift now ticks controlled summons.

**RELATIVE_PROGRESSION_CONTEXT:** Spell-level buys HP (+10%/level), AP (+1/3 levels), MP, and lifespan. Cheap Doka upgrades on summon ids make the flood tankier without touching the missing cap.

**PERSISTENCE/ECONOMY_IMPACT:** Pacifist and no-heal challenges (below) convert the flood into Doka. Summon UI advertises 10× upgrade cost; canister still charges `10 * 2^level`.

**RECOMMENDED_RESPONSE:** Player alive-cap (2–3) and a short summon-spell cooldown. Keep five identities. See `EBMA-2026-09-02-002`. Do not also give AI summons ticking DoTs until 001 lands (`EBMA-2026-09-02-006`).

---

### 3.3 Pacifist Run + summons / Bite / Mark — **DOMINANT** (economy) — *escalated*

**COMPONENTS:** Achievement `pacifist_run` (500 Doka, “Win a battle using only heal or buff spells”, `admin.mo` 324) + any of: damage summon (Wolf / Archer / Bomber) + Vampire Bite (`effectType: "heal"`, 20 damage) + Mark (`effectType: "debuff"`) + Barrier / Mirror (`defense`).

**COMBO_SEQUENCE:**

1. Equip heals/buffs plus any of Bite, Mark, Barrier, Mirror, or a summon kit.
2. Cast them. `recordPlayerSpellType` only flips on `damage|drain|aoe|dot|pushback|attract|cc|teleport`.
3. Bite deals 20 through the damage loop (`resolvePlayerCast` 876+) and records `"heal"`.
4. Summons kill. Recap fires `checkAndFireAchievement("pacifist_run")` (`WX` 12613–12614). Claim 500 Doka.

**ACCESS_REQUIREMENTS:** Starters + backend Bite if the catalog dump is live + the feat on the canister. The 2026-09-02 preview fix (`44adf79`) removed the accidental “selecting Strike fails Pacifist” false-positive. It also removed the only live caller of `applyHealBuffSideEffect`, which would have caught Bite/Mark via `targetType === "enemy"`.

**WHY_IT_IS_STRONG:** The condition is implemented as “the player character did not resolve a listed `effectType`,” not “the player side dealt no damage / used only heal or buff.” Bite is a 20-damage spell that the feat treats as a heal. That is the opposite of the advertised intent.

**COUNTERPLAY:** None. The check cannot see summon damage, Bite damage, or Mark.

**RELATIVE_PROGRESSION_CONTEXT:** 500 Doka is `upgradeSpell` fuel. A single legal pacifist clear funds several damage-spell levels or a summon-level spike.

**PERSISTENCE/ECONOMY_IMPACT:** Direct. `claimAchievementReward` credits the persist-lock wallet. Once per account, but the first 500 is a free spike if the player knows the hole.

**RECOMMENDED_RESPONSE:** Fail the feat unless every resolved **player** spell is heal, buff, Timestep, or (optionally) Mirror. Count player-side summon damage / offensive kit casts. Bite must fail it even while its heal metadata is still wrong. Keep a true pacifist (heals + buffs + Timestep, no kits, no Bite) as a feat. Do not change the Doka amount. See `EBMA-2026-09-02-003`. Do not revert the preview fix.

---

### 3.4 No-heal challenge + drain / Wisp — **DOMINANT** (challenge)

**COMPONENTS:** `easy_1` (50 Doka) / `hard_1` (200 Doka + 500 XP) + Life Drain / Lifesteal Nova / Drain Courage + Wisp Blood Mend / Rallying Cry. Vampire Bite’s heal is still inert, so Bite is **not** a no-heal sustain tool (it is a Pacifist tool). BuffShop potions are **no longer** part of this combo.

**COMBO_SEQUENCE:**

1. Accept no-heal (or no-heal + under 30 damage).
2. Never cast a `targetType === "self" && effectType === "heal"` player spell. Do not drink a BuffShop potion in battle.
3. Drain on `applyDamageToEnemy` heals via `drainPercent` (`castHelpers.ts` 466–480); flag stays false.
4. Wisp `heal` on `combatantId === "player"` writes HP and does not touch `challengeHealUsedRef`.
5. Persist advertised rewards on victory.

**ACCESS_REQUIREMENTS:** Starter drains + Wisp. Challenges are always offered.

**WHY_IT_IS_STRONG:** The predicate measures a narrow metadata pair, not “HP went up from a spell.” Sustain without failing the objective. Combined with 3.1 / 3.2 the fight is also short.

**COUNTERPLAY:** None on the current flag (potions aside).

**RELATIVE_PROGRESSION_CONTEXT:** `hard_1` is 500 XP — half a low-level `applyRewards` curve step (`100 * 2^(N-1)`). Easy farm.

**PERSISTENCE/ECONOMY_IMPACT:** Direct `applyRewards` credit on a failed-intent objective.

**RECOMMENDED_RESPONSE:** Count drain heals and player-targeted summon heals. Keep overworld Doka-to-HP from flipping the flag (`recordInBattleChallengeHealUsed` already gates `inBattle`). Keep the potion wire. See `EBMA-2026-09-02-005`.

---

### 3.5 Dead player-bar control kit — **UNDERPOWERED** (player bar) / **STRONG_BUT_HEALTHY** (controlled Archer)

**COMPONENTS:** Slow (`mp` −2 / 2), Frost Bolt (`mp` −1 / 1), Weaken (`dmg` 0.7 / 2), Expose / Shadow Veil (`res_sp`), Drain Courage (`ap` −1 / 1), Cursed Wound (`healRecv` 0.5), Life Drain (`sp` 0.8). Archer kit: Poison + Slow.

**COMBO_SEQUENCE (player bar):** Player casts any of the above through `resolvePlayerCast`. Damage (if any) applies. `debuffStat` is never written.

**COMBO_SEQUENCE (controlled Archer):** Player-controlled Archer casts Slow through `resolveSpellCast` 529–548. The MP debuff **does** land. AI Archer Slow still goes through `executeSummonAction` `applyEffect` without `stat`/`modifier` (cosmetic).

**ACCESS_REQUIREMENTS:** Starters. 8-slot opportunity cost on the bar; Archer kit is a summon slot.

**WHY_IT_IS_STRONG:** The player bar is not. The cards advertise control that the player path cannot deliver. The **intended** Slow identity currently lives only on a controlled Archer, which is interesting synergy and should be kept if 002 caps the flood.

**COUNTERPLAY:** N/A on the bar (player is the one missing the tool). Kill the Archer to remove live Slow.

**RELATIVE_PROGRESSION_CONTEXT:** Upgrading Slow / Weaken on the bar spends Doka on a missing half of the spell.

**PERSISTENCE/ECONOMY_IMPACT:** Wasted upgrade spend. Does not break the wallet.

**RECOMMENDED_RESPONSE:** Wire `debuffStat` after the player damage loop (do not skip damage). Then cap stacked AP/MP denial so the restored kit cannot lock a target at 0 AP/MP forever. See `EBMA-2026-09-02-004`. This is a restore, not a nerf. Do not strip Archer Slow.

---

### 3.6 Latent enemy AP/MP denial (Bishop + Archer Slow) — **NICHE** live / **DOMINANT** if kits grow

**COMPONENTS:** Bishop Frost Bolt + enemy Archer Slow (enemy summon kit). Same-stat additives in `getStatModifier` (`statusEffects.ts` 45–63).

**COMBO_SEQUENCE (if kits were zone-correct):** Frost (−1 MP, 1 turn) + Slow (−2 MP, 2 turns) = −3 on a 4-MP player. Refresh each enemy turn.

**LIVE SEQUENCE:** `buildEnemyKit(..., currentMap.levelZone)` stays zone 0. Bishops have Frost only. Slow is not on the bishop. Multiple Frosts **replace** by `effectName`. Live denial is −1 MP for 1 turn. Enemy AI Slow from an Archer summoner is cosmetic (`summonExecutor` omits `stat`).

**ACCESS_REQUIREMENTS:** Live: any bishop pack. Latent: zone ≥ 1 kits + enemy Archer summon.

**WHY_IT_IS_STRONG (latent):** Player mobility is the positional game. −3 MP on a 4-MP pool is near-root. Different spell names stack; same name refreshes.

**COUNTERPLAY (latent):** Kill the bishop / archer; Haste (+2 MP, 1 turn); Timestep (once); Null Field (suppresses buffs/debuffs).

**RELATIVE_PROGRESSION_CONTEXT:** Zone growth is supposed to add Slow / Inferno / heals and never does.

**PERSISTENCE/ECONOMY_IMPACT:** None live.

**RECOMMENDED_RESPONSE:** Do **not** nerf Frost or Slow. Pass a numeric zone into `buildEnemyKit` so intended kits exist (`EBMA-2026-09-02-009`). If that ships, add a same-stat AP/MP stack cap on the enemy path (`004` covers both sides).

---

### 3.7 Inferno cooldown circumvention via summons — **DOMINANT**

**COMPONENTS:** Player Inferno (CD 3, 5 AP) + Bomber kit (`summonKit: ["spell-inferno"]`) + player-controlled `resolveSpellCast` (ticks) or AI `executeSummonAction` (does not tick, and does not kamikaze because Inferno `damage` is 0).

**COMBO_SEQUENCE:**

1. Cast player Inferno; bar locks 3 turns.
2. Spawn / control a Bomber. `planSummonControlCast` has no cooldown map.
3. Controlled Bomber applies an 8/turn × 3 Inferno stack that **does** tick.
4. Repeat every Bomber turn. Player Inferno CD is irrelevant.

**ACCESS_REQUIREMENTS:** Starter Bomber + Inferno (or just Bomber).

**WHY_IT_IS_STRONG:** The only starter spell with a real cooldown can be laundered through a 2-AP spawn. Combined with 3.1 this is extra uncapped burn.

**COUNTERPLAY:** Kill the Bomber (3-turn lifespan, 0.5 HP scale).

**RELATIVE_PROGRESSION_CONTEXT:** Early.

**PERSISTENCE/ECONOMY_IMPACT:** Indirect (faster clears).

**RECOMMENDED_RESPONSE:** Per-summon (or per-unit) cooldown map for kit ids that declare `cooldown`. Do not put Inferno on a 0-CD kit without a kit-local lock. See `EBMA-2026-09-02-010`.

---

### 3.8 Titan’s Vigor × Glass Realm × Sacrifice — **STRONG_BUT_HEALTHY** (monitor)

**COMPONENTS:** Map modifiers Titan’s Vigor (`+1000` HP on `applyBattleStart`; `onDamageDealt` 1–5×) + Glass Realm (×2 on the same hook) + Sacrifice (20% current `characterStats.hp` × 3).

**COMBO_SEQUENCE:**

1. Roll both modifiers (independent map rolls; not guaranteed).
2. Sacrifice reads `characterStats.hp` (Titan’s store-HP bump may not be on that object).
3. `dealDamage` → `enemyTakesDamage` → `applyDamageDealt` applies Titan roll then Glass.

**WHY_IT_IS_STRONG:** Lottery on a path that already ignores Mark/crit. Main-bar nukes (Strike, Shadow Strike, Chain Lightning) **do not** go through `enemyTakesDamage`, so they do **not** get the 1–5× / ×2. The scary packet is Sacrifice-only. Vampiric Ground is on the same hook, so it also misses the main bar.

**COUNTERPLAY:** Don’t stand next to the target (range 1). Mirror. Don’t pick Sacrifice on a Glass map.

**RELATIVE_PROGRESSION_CONTEXT:** Modifier luck, not a loadout.

**PERSISTENCE/ECONOMY_IMPACT:** None beyond a lucky one-shot.

**RECOMMENDED_RESPONSE:** Monitor. Do not nerf Sacrifice or the modifiers unless play data shows every Glass+Titan map is a skip-or-Sacrifice binary. See `EBMA-2026-09-02-008`.

---

### 3.9 Enrage + Mark + Crit + Fury / Blood Moon — **STRONG_BUT_HEALTHY**

**COMPONENTS:** Enrage (×1.4 dmg, 2 turns, 3 AP) + Mark (×2 next hit, 2 AP) + CHC crit (×2) + Fury potion (×1.25, 3 turns) + Blood Moon (×1.25, map). Optional: player Enrage on an allied Wolf (`targetType: "ally"` now resolves to a player-side summon in `resolvePlayerCast` 676–718).

**COMBO_SEQUENCE:** Enrage → Mark tile → nuke (Shadow Strike 35 or Chain Lightning / Expose). Setup is 5 AP before the hit; 8 AP bar leaves 3 for the nuke (Shadow Strike fits). Ally-Enrage on a Wolf is a second payload on the summon’s turn.

**WHY_IT_IS_STRONG:** Multipliers compose. Shadow Strike (backend seed) is the best payload. Ally-Enrage is new targeting honesty, not a new number.

**COUNTERPLAY:** RES/SR. Don’t stand on the marked tile. Kill the caster during the setup turn. Paper Windstorm miss. Mirror. Kill the Wolf.

**RECOMMENDED_RESPONSE:** Preserve. This is the intended burst identity. Do not touch Mark, Enrage, or ally-buff targeting because the product is large.

---

### 3.10 Shield + Iron Skin (+ Sentinel / ally target) — **STRONG_BUT_HEALTHY**

**COMPONENTS:** Both `buffStat: "res"`, `buffModifier: 1.3`, different `effectName` → multiplicative 1.69× RES for 3 turns. Sentinel kit can apply both. Player Shield/Iron Skin can now land on an allied summon (`targetType: "ally"`).

**WHY_IT_IS_STRONG:** Durable, not immortal. Costs 5 AP (or a Sentinel turn). Null Field suppresses. Duration is short. Buffing a 0.5-scale Bomber is a real decision, not a loop.

**RECOMMENDED_RESPONSE:** Preserve.

---

### 3.11 Timestep + Haste + Rally — **STRONG_BUT_HEALTHY**

**COMPONENTS:** Timestep (once, restores formula AP/MP + additives) + Haste (+2 MP, 1 turn) + Rally / Blood Mend (heal + advertised CHC).

**WHY_IT_IS_STRONG:** One extra full bar per fight is a real decision, not a loop. Haste is already included in `restoreApMp` via `getStatModifier("player", "mp")`. Combined with 3.1 it is an amplifier (one extra Poison dump); the loop is still the missing DoT cap, not Timestep.

**NOTE:** Blood Mend / Rally `buffModifier: 0.15` on `chc` never reaches the crit roll (`playerSpellContext` uses raw `characterStats.chc`, `WX` 9211). The CHC half is **UNDERPOWERED** / inert. Heal half is fine.

**RECOMMENDED_RESPONSE:** Preserve Timestep. Optionally wire CHC through `getStatModifier` (`EBMA-2026-09-02-012`) — restore, not nerf.

---

### 3.12 Swap / Barrier / Mirror — **STRONG_BUT_HEALTHY** (Swap has a hazard hole)

**COMPONENTS:** Swap (3 AP), Barrier (3 AP, 3-turn tile; copy says 2), Mirror (4 AP, next single-target reflect; `activatePlayerMirror` is wired).

**WHY_IT_IS_STRONG:** Positional and reactive. Swap onto lava/ice/rift does **not** run walk hazards (MIMA-2026-08-31-001). That is a challenge-integrity hole (Untouchable) more than a damage loop.

**RECOMMENDED_RESPONSE:** Do not nerf Swap. Hazard landing belongs to the MIMA ticket, not a damage nerf. Pacifist-legal Barrier/Mirror is owned by 003, not a Swap nerf.

---

### 3.13 Backend catalog + 8-slot bar — **NICHE** (discovery still inert)

There is no achievement-spell or enemy-discovery combination on the live path. The only extra combo space from the canister is Shadow Strike / Thunder Clap / late Void Collapse sitting next to starters, plus inert Bite / Soul Rend / Reflect. That is a **catalog dump**, not a discovery reward.

**RECOMMENDED_RESPONSE:** Do not invent unlocks in this PR. Point implementers at existing `SDA-2026-08-31-002` … `004` / `SDE-2026-08-31-001` … `003`. See `EBMA-2026-09-02-007`. Restore Bite / Soul Rend / Reflect metadata so the dump is at least honest (`EBMA-2026-09-02-013`).

---

### 3.14 Late-game enemy summoner density — **STRONG_BUT_HEALTHY**

**COMPONENTS:** `ENEMY_SUMMONER_CHANCE_BASE + level * 0.02` per enemy + Wolf/Archer kits + `ENEMY_SUMMON_CAP = 2`.

**WHY_IT_IS_STRONG:** By level 44 every trash mob is a summoner. The cap and 2-turn cadence keep this from flooding. Comment in `gameConstants.ts` 295–297 still says “~12% of packs.” AI enemy summons still do not tick DoTs.

**RECOMMENDED_RESPONSE:** Retarget the roll to pack-level / zone if the board feels noisy. Not a P0. See `EBMA-2026-09-02-011`.

---

### 3.15 Ally-buff summons (Enrage / Shield / Haste on kits) — **STRONG_BUT_HEALTHY** (new, preserve)

**COMPONENTS:** `resolvePlayerCast` ally branch (676–718) + Enrage / Shield / Iron Skin / Haste + any player-side summon.

**WHY_IT_IS_STRONG:** The spells already said “ally.” Landing them on a Wolf or Sentinel is the identity working. 1.4× Wolf damage and 1.69× Sentinel RES are large but duration-gated and Null-Field-vulnerable.

**RECOMMENDED_RESPONSE:** Preserve. Do not close ally targeting to “fix” 3.2. Cap the flood instead.

---

## 4. Classification board (player-accessible)

| Package | Class | Intervene? |
| :--- | :--- | :--- |
| Poison recast / Poison+Venom+Inferno (+ Arcane Surge) (+ `hard_3`) | BROKEN | Yes — cap / refresh |
| Player summon flood (5 kits, no cap/CD) | DOMINANT | Yes — cap + kit CD |
| Pacifist + summon / Bite / Mark | DOMINANT | Yes — advertised categories; keep preview fix |
| No-heal + drain / Wisp | DOMINANT | Yes — count real heals (potions already counted) |
| Inferno via Bomber / controlled kit | DOMINANT | Yes — kit cooldown |
| Shadow Strike + Mark + Enrage | STRONG_BUT_HEALTHY | No |
| Shield + Iron Skin (+ Sentinel / ally) | STRONG_BUT_HEALTHY | No |
| Ally Enrage / Haste on kits | STRONG_BUT_HEALTHY | No |
| Timestep (once) | STRONG_BUT_HEALTHY | No |
| Sacrifice + Titan + Glass | STRONG_BUT_HEALTHY | Monitor |
| Thunder Clap / Chain Lightning | STRONG_BUT_HEALTHY | No |
| Swap / Barrier / Mirror | STRONG_BUT_HEALTHY | Hazard landing is MIMA, not EBMA |
| Enemy summoner density (capped 2) | STRONG_BUT_HEALTHY | Soft formula fix |
| Controlled Archer Slow | STRONG_BUT_HEALTHY | Restore the bar; keep the kit |
| Bishop Frost only (zone 0) | NICHE | Restore zone number |
| Void Collapse (12 AP) | NICHE | Don’t enforce `minLevel` as a surprise nerf |
| Player Slow/Weaken/Expose/Frost/Courage | UNDERPOWERED | Restore `debuffStat` |
| Soul Rend / Vampire Bite heal / Reflect Barrier | UNDERPOWERED | Metadata, not a nerf |
| Blood Mend / Rally CHC half | UNDERPOWERED | Wire `chc` |
| AI summon DoTs / AI Bomber kamikaze / AI Slow | UNDERPOWERED | Only after DoT cap (DoTs); Slow restore is 004/006 adjacent |

---

## 5. What not to touch

- RAF loop, map generation, turn order, damage formula (`calcScaledDamage` 3%/level).
- Mark, Enrage, Timestep-once, Mirror, Barrier geometry, Swap’s teleport identity, ally-buff targeting.
- 3% upgrade curve. Economy bugs around summon advertised cost vs canister debit are already owned by persist work.
- Inventing observe-to-unlock in this automation. That is SDA / SDE.
- Reverting the Pacifist preview fix.
- GameKey shop numbers (out of combat-combo scope).
- Occupancy dual-path unseal / Void Rift summon tick (closed correctly).

---

## 6. Prior ACTION_ID disposition

| Prior | 2026-09-02 | Notes |
| :--- | :--- | :--- |
| 08-31 / 09-01 001 DoT cap | Reissued as 001 | Still true; `hard_3` payout named |
| 09-01 002 Summon cap + CD | Reissued as 002 | AP still charged; cap/CD still missing |
| 09-01 003 Pacifist | Reissued as 003 | **Escalated** — preview fix left execute on `effectType` only; Bite/Mark |
| 09-01 004 Player debuff + stack cap | Reissued as 004 | Bar still dead; controlled Archer Slow live |
| 09-01 005 Challenge drain | Reissued as 005 | Potions closed; drain + Wisp still open |
| 09-01 006 AI DoT ppt | Reissued as 006 | Still gated on 001 |
| 09-01 007 Catalog ≠ ownership | Reissued as 007 | Still inert; point at SDA/SDE |
| 09-01 008 Titan × Glass | Reissued as 008 | Still Sacrifice-only hook |
| 09-01 009 Numeric zone | Reissued as 009 | Call site still passes the object |
| 09-01 010 Kit cooldown | Reissued as 010 | `planSummonControlCast` still has no CD |
| 09-01 011 Enemy summoner chance | Reissued as 011 | Still per-enemy × player level |
| 09-01 012 CHC buff restore | Reissued as 012 | `chc` still raw |
| — | **New 013** | Inert backend seed metadata (Bite / Soul Rend / Reflect) |

---

## 7. Search checklist (this pass)

| Pattern | Result |
| :--- | :--- |
| Excessive damage/AP combinations | 3.1 DoT recast; 3.9 burst (healthy) |
| Infinite / near-infinite loops | DoT append has no cap; summon recast limited only by AP + lifespan |
| Permanent control | Player-bar denial dead; latent after 009 |
| AP/MP denial chains | Latent 3.6; live Archer Slow is kit identity |
| Summon abuse | 3.2 flood; 3.7 Inferno launder |
| Cooldown circumvention | 3.7; Attack Nearest Inferno **closed** |
| Healing loops | 3.4 drain/Wisp; potions **closed**; Bite heal inert |
| Defensive immortality | Shield+Iron Skin duration-gated (healthy) |
| Status stacking | DoT append BROKEN; non-DoT replace-by-name |
| Displacement loops | Swap identity healthy; hazard landing is MIMA |
| Hazard combinations | Swap × lava is MIMA, not EBMA |
| Achievement-spell combinations | No spell grants. Pacifist is an achievement × existing kit combo |
| Enemy-discovery spell combinations | Discovery inert. Catalog dump is not discovery |
