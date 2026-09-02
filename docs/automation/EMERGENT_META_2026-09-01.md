# Emergent Build & Meta Analysis — 2026-09-01

**Analyzer:** Emergent Build & Meta Analyzer  
**Automation:** `7b2f2b58-a49e-11f1-a7d1-d6b4613131ce` (cron `0 */72 * * *`)  
**HEAD:** `dd275aa` (`ci: require Caffeine import gates on all automations`, #182)  
**Prior pass:** 2026-08-31 (memories only; ACTION_IDs `EBMA-2026-08-31-001` … `010`)  
**Gameplay code:** not modified. Balance was not changed.

This is a combination audit, not a single-spell DPS sheet. Individual rows can look fair while two or three of them delete the rest of the kit.

Intervention is recommended only when a strategy:

- invalidates alternatives
- removes counterplay
- produces infinite / degenerate loops
- destroys progression or economy

Strong interesting synergy is left alone.

ACTION_IDs: [`ACTION_IDS_EBMA_2026-09-01.md`](./ACTION_IDS_EBMA_2026-09-01.md).

---

## 0. What changed since 2026-08-31

| Gate | 2026-08-31 | 2026-09-01 | Meta effect |
| :--- | :--- | :--- | :--- |
| Player summon AP | `resolvePlayerCast` returned `"summon"` and the click path skipped debit | `castResultSpendsAp` includes `"summon"`; `executeCastAttempt` deducts | Flood is no longer free. Still uncapped and un-CDed. |
| Attack Nearest Inferno | leftover AP recast | `isSpellOnCooldown` + `castResultAppliesCooldown` on the shared helper | Player Inferno CD holds on the player bar. Summon-kit Inferno still ignores it. |
| Backend library filter | catalog ≈ ownership | `shouldIncludeBackendSpellInLibrary` — `usableByPlayer !== false` still dumps the live catalog | Retired ids stay only if already owned. Playable backend ids are still Day-1 owned. |
| DoT append | no cap | unchanged (`appendDotStack`) | Still BROKEN in long fights. |
| Player `debuffStat` | damage loop never applied it | unchanged (`resolvePlayerCast` 876–1028) | Control kit still dead on the player. |
| Pacifist | summon select/cast does not flip | unchanged | Summon-kill pacifist still pays 500 Doka. |
| Challenge heal | `self` + `heal` only | unchanged | Drain + Wisp still clear no-heal. |
| Summon-AI DoT tick | `applyEffect` omits `dotDamagePerTurn` | unchanged (`executeSummonAction` 212–224) | AI Poison/Venom/Inferno still do not tick. Player-controlled summons do. |
| Enemy kit zone | `buildEnemyKit(object)` → `NaN` → zone 0 | unchanged (`WX` 12484) | Enemies never grow kits. Prior “Bishop Slow stack” is **latent**, not live. |
| Titan / Glass damage | wired through `applyDamageDealt` | still only on `enemyTakesDamage` (`WX` 3520) | Lottery hits Sacrifice + summon-AI damage, not the main player damage loop. |

Closed since last pass (do not re-open):

- Free player summon placement (0 AP).
- Attack Nearest Inferno cooldown skip on the player bar.

---

## 1. Access model (what a player can actually bring)

There is still no observe → win → unlock path. “Discovered enemy spells” and “achievement/challenge spells” are design docs (`SPELL_DISCOVERY_ECOSYSTEM_2026-08-31.md`, `SPELL_ADMIN_DESIGN_2026-08-31.md`), not live systems.

| Source | What enters the library | Spell grant? |
| :--- | :--- | :--- |
| `starterSpells` | All 32 ids forced `isBaseSpell: true` (`WX` 2393–2406) | Always owned |
| `getSpellConfigs()` | Every `usableByPlayer !== false` id (`adminSafety.ts` 311–317; `WX` 2424–2436) | Catalog membership **is** ownership |
| Achievements | Doka only (`admin.mo` `defaultAchievements` 309–325) | No |
| Challenges | Doka / XP / badge (`challengeCompletion.ts` 38–103) | No |
| Recap / `applyRewards` | XP + Doka | No |
| `upgradeSpell` | Levels a known id; charges `10 * 2^level` | Must not grant |

Real loadout constraint: **8-slot bar**. The broken strategies below are 8-slot legal.

Backend seed (`admin.mo` `defaultSpells` 168–191) that actually fires on the player path:

| Id | On paper | Live `resolvePlayerCast` | Class |
| :--- | :--- | :--- | :--- |
| `shadow_strike` | 35 dmg / 3 AP / CD 2 / diagonal | Damage loop (`hitsMultiple` false, `damage` 35) | STRONG_BUT_HEALTHY |
| `thunder_clap` | 25 AoE / 4 AP / CD 3 | Damage loop via `multiTarget` → `hitsMultiple` | STRONG_BUT_HEALTHY |
| `void_collapse` | 80 AoE + pull / 12 AP / `minLevel` 30 | AoE damage only. Attract unused. 12 AP needs level 100 (`8 + floor(level/25)`). `minLevel` not enforced. | NICHE until ~100, then STRONG_BUT_HEALTHY |
| `soul_rend` | DoT + 25 upfront | `effectType === "dot"` takes the DoT branch; no `dotDamagePerTurn` → 0 tick | UNDERPOWERED (inert) |
| `vampire_bite` | Drain 20 / heal 20 | `effectType` is `"heal"` not `"drain"`; not `targetType === "self"` → 20 damage, no heal | UNDERPOWERED (inert heal) |
| `reflect_barrier` | Reflect next spell | Generic `buff` without `buffStat` / `isMirror` / `targetType` | UNDERPOWERED (inert) |

Enemy kits (`ENEMY_KITS` in `enemyAI.ts` 156–178) reuse starter ids. Seeing a bishop cast Frost teaches nothing and unlocks nothing.

---

## 2. Live gates (combo truth table)

| Gate | File | Live behavior |
| :--- | :--- | :--- |
| DoT append | `engine/dotStacks.ts` `appendDotStack`; `WX` `applyActiveEffect` 1835–1845 | Same-type stacks add; no cap; independent durations |
| Player DoT apply | `spellEngine.ts` `resolvePlayerCast` 777–814 | Sets `dotDamagePerTurn` |
| Player damage debuffs | same, 876–1028 | **Does not** call `applyEffect` for `debuffStat` |
| Enemy / boss debuffs | `WX` 17029–17042, 17106–17122 | Apply; same `effectName` replaces; different names with the same `stat` add |
| Summon cap | `gameConstants.ts` `ENEMY_SUMMON_CAP = 2` | Enemy only. Player `spawnPlayerSummon` (`WX` 10195–10247) has no alive-cap. Comment at `enemyAI.ts` 1816 (“player-side summonCount gate”) is not implemented. |
| Summon spell CD | `spellData.ts` summon rows | No `cooldown` on the five kits |
| Summon kit CD | `summonControlCast.ts`; `executeSummonAction` | No per-spell cooldown map. Bomber Inferno (player CD 3) is free on the summon. |
| Player summon AP | `challengeCompletion.ts` 283–285; `WX` 17559–17566 | Charged |
| Pacifist select | `targeting.ts` `applyHealBuffSideEffect` 54–74 | Offensive `targetType` / drain / physical / listed categories. `targetType: "ground"` + `effectType: "summon"` does not flip. |
| Pacifist cast | `WX` `recordPlayerSpellType` 17449–17467 | `"summon"` is not in `offCats` |
| Challenge heal | `WX` 17584–17589; 11047–11048 | `targetType === "self" && effectType === "heal"` only |
| Wisp / summon heal | `WX` summonCtx `heal` 15466–15481 | Heals **player only**. Does not set `challengeHealUsedRef`. |
| Summon-AI DoT | `summonExecutor.ts` 212–224 | `applyEffect` without `dotDamagePerTurn` |
| Player-controlled summon DoT | `WX` 10462 + `resolveSpellCast` | Ticks |
| Timestep | `spellEngine.ts` 721–733 | Once per battle; 0 AP; restores formula AP/MP + active AP/MP additives |
| Sacrifice | `spellEngine.ts` 749–763 | 20% `characterStats.hp` → 3× via `dealDamage` → `enemyTakesDamage` (Enrage / Titan / Glass apply). Mark / crit do not. |
| Upgrade damage | `combatMath.ts` `calcScaledDamage` | `base * 1.03^level` |
| Battle AP | `progression.ts` `getPlayerBaseStats` | Floor 8; +1 every `apMpGrowthEveryNLevels` (default 25) |
| Enemy kit zone | `WX` 12484 + `buildEnemyKit` 187–192 | `currentMap.levelZone` is `{name,minLevel,maxLevel}`. `Math.floor(object)` is `NaN`. Every kit stays zone 0. |
| Enemy summoner roll | `WX` 12496–12506 | `0.12 + playerLevel * 0.02` **per enemy**. 100% at level 44+. Global alive cap still 2. |

---

## 3. Combination reports

### 3.1 Unbounded player DoT recast — **BROKEN**

**COMPONENTS:** Poison Arrow (2 AP, 4/turn, 3 turns, no CD) + Venom Strike (3 AP, 4/turn, 3 turns, no CD) + Inferno (5 AP, 8/turn, 3 turns, CD 3). Optional: Arcane Surge / Arcane Overflow (−1 AP, min 1). Optional: player-controlled Archer (`resolveSpellCast` Poison).

**COMBO_SEQUENCE:**

1. Equip Poison + Venom + Inferno (and optionally an Archer).
2. Each player turn: dump leftover AP into Poison recasts (4 stacks at 8 AP; 8 stacks under Arcane Surge).
3. Mix Venom / Inferno when the extra tick is worth the AP.
4. Stacks append (`appendDotStack`). They do not refresh. A 10-turn boss fight is a damage integral, not a 4+4+8 ceiling.

**ACCESS_REQUIREMENTS:** Starter library. Arcane Surge is a map-modifier roll, not a unlock. Archer is a starter summon.

**WHY_IT_IS_STRONG:** Cost-to-stack is linear; duration is independent; there is no same-source cap. Long fights (boss, dungeon chain, boss rush) make the last recast strictly better than a front-loaded nuke. Inferno’s CD only gates the 8-tick, not Poison.

**COUNTERPLAY:** Kill faster than the integral. RES reduces each tick once (summed). Null Field does **not** suppress DoTs. Enemy kits are stuck at zone 0, so they rarely apply cleanse or pressure that forces the player off the recast.

**RELATIVE_PROGRESSION_CONTEXT:** Available at level 1. Upgrade scaling (`1.03^level`) applies to `spell.damage`, not to the static `dotDamagePerTurn` literals — late-game the **stack count** is the scaling, not the upgrade curve.

**PERSISTENCE/ECONOMY_IMPACT:** Faster clears → more `applyRewards` XP/Doka. Does not mint outside the funnel. Soft-destroys “spend Doka on spell levels” for damage spells because recast beats 3%/level on a 4-tick.

**RECOMMENDED_RESPONSE:** Same-source refresh or a small per-target / per-name cap. Keep Poison + Venom + Inferno as three different types that can coexist. Do not flatten DoT identity. See `EBMA-2026-09-01-001`.

---

### 3.2 Player summon flood — **DOMINANT**

**COMPONENTS:** Dire Wolf (3 AP) + Archer (3 AP) + Sentinel (3) + Bomber (2) + Wisp (2). No alive-cap. No summon-spell cooldown. Lifespan 4–5 + `floor(spellLevel / 2)`.

**COMBO_SEQUENCE:**

1. Turn 1 at 8 AP: Wolf + Archer + Wisp, or Wolf + two Wisps, or four Bombers.
2. Each summon gets its own turn (`type: "summon"`), own AP/MP budget, and (if player-controlled) a kit that goes through `resolveSpellCast`.
3. Next player turn: spawn again. Nothing evicts the previous wave except lifespan.

**ACCESS_REQUIREMENTS:** All five kits are starters. 8-slot bar is the only limiter.

**WHY_IT_IS_STRONG:** Action-economy multiplier. One player turn buys three extra turns of units that occupy tiles, body-block, and (when controlled) apply real DoTs. Enemy summons are capped at 2 with a 2-turn cadence; the player is not. AP cost (new this pass) only slows the first dump.

**COUNTERPLAY:** Focus the Wisp (enemy AI already scores it high). AoE (Thunder Clap / Chain Lightning / Lifesteal Nova). Lifespan expiry. Occupancy / portal-reserved cells prevent sealing exits.

**RELATIVE_PROGRESSION_CONTEXT:** Spell-level buys HP (+10%/level), AP (+1/3 levels), MP, and lifespan. Cheap Doka upgrades on summon ids make the flood tankier without touching the missing cap.

**PERSISTENCE/ECONOMY_IMPACT:** Pacifist and no-heal challenges (below) convert the flood into Doka. Summon UI advertises 10× upgrade cost; canister still charges `10 * 2^level`.

**RECOMMENDED_RESPONSE:** Player alive-cap (2–3) and a short summon-spell cooldown. Keep five identities. See `EBMA-2026-09-01-002`. Do not also give AI summons ticking DoTs until 001 lands (`EBMA-2026-09-01-006`).

---

### 3.3 Pacifist Run + summons — **DOMINANT** (economy)

**COMPONENTS:** Achievement `pacifist_run` (500 Doka, “heal or buff only”) + any damage summon (Wolf / Archer / Bomber) + optional Wisp.

**COMBO_SEQUENCE:**

1. Equip only heals/buffs on the **player** bar (Blood Mend, Rally, Shield, Iron Skin, Haste, Timestep).
2. Put one or more summon kits on the remaining slots (or rely on already-spawned units).
3. Select/cast summons: `applyHealBuffSideEffect` and `recordPlayerSpellType` do not flip `battleOnlyHealBuffSpellsRef`.
4. Summons kill. Recap fires `checkAndFireAchievement("pacifist_run")`. Claim 500 Doka.

**ACCESS_REQUIREMENTS:** Starters + the feat existing on the canister. No discovery.

**WHY_IT_IS_STRONG:** The condition is implemented as “the player character did not select/cast an offensive **player** spell,” not “the player side dealt no damage.” That is the opposite of the advertised intent.

**COUNTERPLAY:** None. The check cannot see summon damage.

**RELATIVE_PROGRESSION_CONTEXT:** 500 Doka is `upgradeSpell` fuel. A single legal pacifist clear funds several damage-spell levels or a summon-level spike.

**PERSISTENCE/ECONOMY_IMPACT:** Direct. `claimAchievementReward` credits the persist-lock wallet. Repeatable per unlock (once per account), but the first 500 is a free spike if the player knows the hole.

**RECOMMENDED_RESPONSE:** Count player-side summon damage / offensive summon casts as flipping the flag. Keep a true pacifist (heals + buffs + maybe barrier/timestep, no kits) as a feat. See `EBMA-2026-09-01-003`.

---

### 3.4 No-heal challenge + drain / Wisp — **DOMINANT** (challenge)

**COMPONENTS:** `easy_1` (50 Doka) / `hard_1` (200 Doka + 500 XP) + Life Drain / Lifesteal Nova / Drain Courage + Wisp Blood Mend / Rallying Cry. Vampire Bite’s heal is inert, so it is **not** part of the live combo.

**COMBO_SEQUENCE:**

1. Accept no-heal (or no-heal + under 30 damage).
2. Never cast a `targetType === "self" && effectType === "heal"` player spell.
3. Drain on the damage loop heals via `applyDamageToEnemy` / drain branch; flag stays false.
4. Wisp `heal` on `combatantId === "player"` writes HP and does not touch `challengeHealUsedRef`.
5. Persist advertised rewards on victory.

**ACCESS_REQUIREMENTS:** Starter drains + Wisp. Challenges are always offered.

**WHY_IT_IS_STRONG:** The predicate measures a narrow metadata pair, not “HP went up from a spell.” Sustain without failing the objective. Combined with 3.1 / 3.2 the fight is also short.

**COUNTERPLAY:** None on the current flag.

**RELATIVE_PROGRESSION_CONTEXT:** `hard_1` is 500 XP — half a low-level `applyRewards` curve step (`100 * 2^(N-1)`). Easy farm.

**PERSISTENCE/ECONOMY_IMPACT:** Direct `applyRewards` credit on a failed-intent objective.

**RECOMMENDED_RESPONSE:** Count drain heals and player-targeted summon heals. Keep overworld Doka-to-HP from flipping the flag (`recordInBattleChallengeHealUsed` already gates `inBattle`). See `EBMA-2026-09-01-005`.

---

### 3.5 Dead player control kit — **UNDERPOWERED**

**COMPONENTS:** Slow (`mp` −2 / 2), Frost Bolt (`mp` −1 / 1), Weaken (`dmg` 0.7 / 2), Expose / Shadow Veil (`res_sp`), Drain Courage (`ap` −1 / 1), Cursed Wound (`healRecv` 0.5), Life Drain (`sp` 0.8).

**COMBO_SEQUENCE:** Player casts any of the above through `resolvePlayerCast`. Damage (if any) applies. `debuffStat` is never written.

**ACCESS_REQUIREMENTS:** Starters. 8-slot opportunity cost.

**WHY_IT_IS_STRONG:** It is not. The cards advertise control that the player path cannot deliver. Enemy / boss path **does** apply the same fields.

**COUNTERPLAY:** N/A (player is the one missing the tool).

**RELATIVE_PROGRESSION_CONTEXT:** Upgrading Slow / Weaken spends Doka on a missing half of the spell.

**PERSISTENCE/ECONOMY_IMPACT:** Wasted upgrade spend. Does not break the wallet.

**RECOMMENDED_RESPONSE:** Wire `debuffStat` after the damage loop (do not skip damage). Then cap stacked AP/MP denial so the restored kit cannot lock a target at 0 AP/MP forever. See `EBMA-2026-09-01-004`. This is a restore, not a nerf.

---

### 3.6 Latent enemy AP/MP denial (Bishop + Archer Slow) — **NICHE** live / **DOMINANT** if kits grow

**COMPONENTS:** Bishop Frost Bolt + enemy Archer Slow (enemy summon kit). Same-stat additives in `getStatModifier` (`WX` 3304–3305).

**COMBO_SEQUENCE (if kits were zone-correct):** Frost (−1 MP, 1 turn) + Slow (−2 MP, 2 turns) = −3 on a 4-MP player. Refresh each enemy turn.

**LIVE SEQUENCE:** `buildEnemyKit(..., currentMap.levelZone)` stays zone 0. Bishops have Frost only. Slow is not on the bishop. Multiple Frosts **replace** by `effectName`. Live denial is −1 MP for 1 turn.

**ACCESS_REQUIREMENTS:** Live: any bishop pack. Latent: zone ≥ 1 kits + enemy Archer summon.

**WHY_IT_IS_STRONG (latent):** Player mobility is the positional game. −3 MP on a 4-MP pool is near-root. Different spell names stack; same name refreshes.

**COUNTERPLAY (latent):** Kill the bishop / archer; Haste (+2 MP, 1 turn); Timestep (once); Null Field (suppresses buffs/debuffs).

**RELATIVE_PROGRESSION_CONTEXT:** Zone growth is supposed to add Slow / Inferno / heals and never does.

**PERSISTENCE/ECONOMY_IMPACT:** None live.

**RECOMMENDED_RESPONSE:** Do **not** nerf Frost or Slow. Pass a numeric zone into `buildEnemyKit` so intended kits exist (`EBMA-2026-09-01-009`). If that ships, add a same-stat AP/MP stack cap on the enemy path (`EBMA-2026-09-01-004` covers both sides).

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

**RECOMMENDED_RESPONSE:** Per-summon (or per-unit) cooldown map for kit ids that declare `cooldown`. Do not put Inferno on a 0-CD kit without a kit-local lock. See `EBMA-2026-09-01-010`.

---

### 3.8 Titan’s Vigor × Glass Realm × Sacrifice — **STRONG_BUT_HEALTHY** (monitor)

**COMPONENTS:** Map modifiers Titan’s Vigor (`+1000` HP on `applyBattleStart`; `onDamageDealt` 1–5×) + Glass Realm (×2 on the same hook) + Sacrifice (20% current `characterStats.hp` × 3).

**COMBO_SEQUENCE:**

1. Roll both modifiers (independent map rolls; not guaranteed).
2. Sacrifice reads `characterStats.hp` (Titan’s store-HP bump may not be on that object).
3. `dealDamage` → `enemyTakesDamage` → `applyDamageDealt` applies Titan roll then Glass.

**WHY_IT_IS_STRONG:** Lottery on a path that already ignores Mark/crit. Main-bar nukes (Strike, Shadow Strike, Chain Lightning) **do not** go through `enemyTakesDamage`, so they do **not** get the 1–5× / ×2. The scary packet is Sacrifice-only.

**COUNTERPLAY:** Don’t stand next to the target (range 1). Mirror. Don’t pick Sacrifice on a Glass map.

**RELATIVE_PROGRESSION_CONTEXT:** Modifier luck, not a loadout.

**PERSISTENCE/ECONOMY_IMPACT:** None beyond a lucky one-shot.

**RECOMMENDED_RESPONSE:** Monitor. Do not nerf Sacrifice or the modifiers unless play data shows every Glass+Titan map is a skip-or-Sacrifice binary. Same stance as `EBMA-2026-08-31-009`. See `EBMA-2026-09-01-008`.

---

### 3.9 Enrage + Mark + Crit + Fury / Blood Moon — **STRONG_BUT_HEALTHY**

**COMPONENTS:** Enrage (×1.4 dmg, 2 turns, 3 AP) + Mark (×2 next hit, 2 AP) + CHC crit (×2) + Fury potion (×1.25, 3 turns) + Blood Moon (×1.25, map).

**COMBO_SEQUENCE:** Enrage → Mark tile → nuke (Shadow Strike 35 or Chain Lightning / Expose). Setup is 5 AP before the hit; 8 AP bar leaves 3 for the nuke (Shadow Strike fits).

**WHY_IT_IS_STRONG:** Multipliers compose. Shadow Strike (backend seed) is the best payload.

**COUNTERPLAY:** RES/SR. Don’t stand on the marked tile. Kill the caster during the setup turn. Paper Windstorm miss. Mirror.

**RECOMMENDED_RESPONSE:** Preserve. This is the intended burst identity. Do not touch Mark or Enrage because the product is large.

---

### 3.10 Shield + Iron Skin — **STRONG_BUT_HEALTHY**

**COMPONENTS:** Both `buffStat: "res"`, `buffModifier: 1.3`, different `effectName` → multiplicative 1.69× RES for 3 turns. Sentinel kit can apply both.

**WHY_IT_IS_STRONG:** Durable, not immortal. Costs 5 AP (or a Sentinel turn). Null Field suppresses. Duration is short.

**RECOMMENDED_RESPONSE:** Preserve.

---

### 3.11 Timestep + Haste + Rally — **STRONG_BUT_HEALTHY**

**COMPONENTS:** Timestep (once, restores formula AP/MP + additives) + Haste (+2 MP, 1 turn) + Rally / Blood Mend (heal + advertised CHC).

**WHY_IT_IS_STRONG:** One extra full bar per fight is a real decision, not a loop. Haste is already included in `restoreApMp` via `getStatModifier("player", "mp")`.

**NOTE:** Blood Mend / Rally `buffModifier: 0.15` on `chc` never reaches the crit roll (`playerSpellContext` uses raw `characterStats.chc`). The CHC half is **UNDERPOWERED** / inert. Heal half is fine.

**RECOMMENDED_RESPONSE:** Preserve Timestep. Optionally wire CHC through `getStatModifier` (`EBMA-2026-09-01-012`) — restore, not nerf.

---

### 3.12 Swap / Barrier / Mirror — **STRONG_BUT_HEALTHY** (Swap has a hazard hole)

**COMPONENTS:** Swap (3 AP), Barrier (3 AP, 3-turn tile; copy says 2), Mirror (4 AP, next single-target reflect).

**WHY_IT_IS_STRONG:** Positional and reactive. Swap onto lava/ice/rift does **not** run walk hazards (already `MIMA-2026-08-31-001`). That is a challenge-integrity hole (Untouchable) more than a damage loop.

**RECOMMENDED_RESPONSE:** Do not nerf Swap. Hazard landing belongs to the MIMA ticket, not a damage nerf.

---

### 3.13 Backend catalog + 8-slot bar — **NICHE** (discovery still inert)

There is no achievement-spell or enemy-discovery combination on the live path. The only extra combo space from the canister is Shadow Strike / Thunder Clap / late Void Collapse sitting next to starters. That is a **catalog dump**, not a discovery reward.

**RECOMMENDED_RESPONSE:** Do not invent unlocks in this PR. Point implementers at existing `SDA-2026-08-31-002` … `004`. See `EBMA-2026-09-01-007`.

---

### 3.14 Late-game enemy summoner density — **STRONG_BUT_HEALTHY**

**COMPONENTS:** `ENEMY_SUMMONER_CHANCE_BASE + level * 0.02` per enemy + Wolf/Archer kits + `ENEMY_SUMMON_CAP = 2`.

**WHY_IT_IS_STRONG:** By level 44 every trash mob is a summoner. The cap and 2-turn cadence keep this from flooding. Comment in `gameConstants.ts` 295–297 still says “~12% of packs.”

**RECOMMENDED_RESPONSE:** Retarget the roll to pack-level / zone if the board feels noisy. Not a P0. See `EBMA-2026-09-01-011`.

---

## 4. Classification board (player-accessible)

| Package | Class | Intervene? |
| :--- | :--- | :--- |
| Poison recast / Poison+Venom+Inferno (+ Arcane Surge) | BROKEN | Yes — cap / refresh |
| Player summon flood (5 kits, no cap/CD) | DOMINANT | Yes — cap + kit CD |
| Pacifist + summon damage | DOMINANT | Yes — count summons |
| No-heal + drain / Wisp | DOMINANT | Yes — count real heals |
| Inferno via Bomber / controlled kit | DOMINANT | Yes — kit cooldown |
| Shadow Strike + Mark + Enrage | STRONG_BUT_HEALTHY | No |
| Shield + Iron Skin (+ Sentinel) | STRONG_BUT_HEALTHY | No |
| Timestep (once) | STRONG_BUT_HEALTHY | No |
| Sacrifice + Titan + Glass | STRONG_BUT_HEALTHY | Monitor |
| Thunder Clap / Chain Lightning | STRONG_BUT_HEALTHY | No |
| Swap / Barrier / Mirror | STRONG_BUT_HEALTHY | Hazard landing is MIMA, not EBMA |
| Enemy summoner density (capped 2) | STRONG_BUT_HEALTHY | Soft formula fix |
| Bishop Frost only (zone 0) | NICHE | Restore zone number |
| Void Collapse (12 AP) | NICHE | Don’t enforce `minLevel` as a surprise nerf |
| Player Slow/Weaken/Expose/Frost/Courage | UNDERPOWERED | Restore `debuffStat` |
| Soul Rend / Vampire Bite heal / Reflect Barrier | UNDERPOWERED | Metadata, not a nerf |
| Blood Mend / Rally CHC half | UNDERPOWERED | Wire `chc` |
| AI summon DoTs / AI Bomber kamikaze | UNDERPOWERED | Only after DoT cap |

---

## 5. What not to touch

- RAF loop, map generation, turn order, damage formula (`calcScaledDamage` 3%/level).
- Mark, Enrage, Timestep-once, Mirror, Barrier geometry, Swap’s teleport identity.
- 3% upgrade curve. Economy bugs around summon advertised cost vs canister debit are already owned by persist work.
- Inventing observe-to-unlock in this automation. That is SDA / SDE.

---

## 6. Prior ACTION_ID disposition

| 2026-08-31 | 2026-09-01 | Notes |
| :--- | :--- | :--- |
| 001 DoT cap | Reissued as 001 | Still true; Arcane Surge makes it worse |
| 002 Summon cap + CD | Reissued as 002 | AP now charged; cap/CD still missing |
| 003 Pacifist | Reissued as 003 | Unchanged |
| 004 Player debuff + stack cap | Reissued as 004 | Unchanged |
| 005 Challenge drain | Reissued as 005 | Also count Wisp→player heals |
| 006 AI DoT ppt | Reissued as 006 | Still gated on 001 |
| 007 Wisp/Sentinel ally targeting | Dropped as a balance ID | `heal` only writes player HP — a bug, not a broken combo |
| 008 Discovery design | Reissued as 007 | Still inert; point at SDA |
| 009 Titan × Glass | Reissued as 008 | Scope narrowed to Sacrifice path |
| 010 Enemy AP/MP stack cap | Folded into 004 | Live threat is zone-0; cap matters after 009 |
