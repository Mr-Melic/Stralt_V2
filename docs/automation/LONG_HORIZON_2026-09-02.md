# Long-Horizon Infinite Progression — 2026-09-02

Stralt has no character level cap in data or persist. This run re-simulated the **live formulas** at HEAD `58302bc` (#258 GameKey shop). Players are **not** assumed to reach these levels quickly. The mid-teens already exhaust intended XP income. Observed max level (unknown here) is not a cap.

Stress levels: 1, 10, 15, 25, 48, 50, 78, 100, 250, 325, 500, 1000, 2500, 5000, 1018, 1019, **10000, 50000**.

**Telemetry:** none. No `recordTelemetryIncrements`, no encounter / duration / death / discovery series. Calibration is skipped. Real play would only check the synthetic model, not stop the horizon.

**This run does not redesign progression.** Findings are ACTION_IDs only. Prior `LHIPS-2026-08-31-001..014` and `LHIPS-2026-09-01-001..004` stay NEW unless a formula moved; moved claims get a 2026-09-02 id.

Harness: `src/frontend/src/utils/longHorizonSim.ts`  
Ledger: [`ACTION_IDS_LHIPS_2026-09-02.md`](./ACTION_IDS_LHIPS_2026-09-02.md)

---

## Method

Authoritative sources (not comments, not `backend_extended`):

| Topic | Live formula (2026-09-02) |
| :--- | :--- |
| XP threshold (persist) | `100n * (1n << (N-1))` — `xpCurve.ts` 24–26; Motoko twin `main.mo` 2065–2072 |
| XP threshold (HUD / recap) | same, but `xpForNextLevel` saturates at `Number.MAX_SAFE_INTEGER` from **level 48** (`xpCurve.ts` 32–36) |
| Kill XP | `sum(enemy.level * 20)` — `rewardResolver.ts` 89–101 |
| Portal XP | 10 |
| `applyRewards` ceilings | `dokaDelta > 100_000` / `xpDelta > 500_000` → `#err` (`main.mo` 2058–2059); client `clampApplyRewardsDeltas` |
| `saveBattleStats` | cannot raise **or lower** level (`main.mo` 2028–2032); AP/MP `_minNat(..., 20)` (1993–1994) |
| GameKey | `redeemGameKey` credits `entry.dokaAmount` directly (`main.mo` 1437–1499); max `MAX_DOKA_GRANT` 10_000_000 (`adminGuard.mo` 8, 138–143) |
| Spell upgrade | `baseCost * 2^currentLevel` while-loop (`main.mo` 1003–1009); default base 10 |
| Enemy level | `pickEnemyLevelFromTiers`, `maxTier = floor(999 / tierSize)` (`combatMath.ts` 54–107) |
| Enemy combat HP | `floor(50 * (1 + (L-1)*0.05))` (`WorldExploration.tsx` 3568–3573) |
| Player live max HP | `floor(100 * (1 + (L-1)*0.05))` (`WorldExploration.tsx` 3361–3367) |
| Player formula HP | `round(100 * 1.05^(L-1))` — unused for HP |
| AI tier | level table + 30% uniform 1–10 (`combatMath.ts` 36–51) |
| Kits | `buildEnemyKit(piece, currentMap.levelZone)` — object, not number (`WorldExploration.tsx` 12035). Numeric `setCurrentZoneTier` exists at 4677 and is **not** passed in. |
| Summoner | `0.12 + playerLevel * 0.02` (`WorldExploration.tsx` 12047–12053) |
| Boss combat | static `baseStats` (sample 350 HP), level `player+5` |
| Doka | frontend jackpot table (`WorldExploration.tsx` 12502–12528), then clamp to 100_000 per `applyRewards` call |

Monte Carlo: 4000 rolls per level, default tier config, no `localStorage` override.

---

## What moved since 2026-09-01

| Prior ID | Drift |
| :--- | :--- |
| LHIPS-2026-08-31-013 / 09-01-003 | `saveBattleStats` now **freezes** stored level (cannot raise or lower). AP/MP silent clamp at 20 vs formula AP 21 at 325 remains. |
| (new path) | GameKey redeem (#258) credits up to 10M Doka **outside** `applyRewards`. Combat jackpot still 100k-capped. |
| (not previously filed) | Uncapped `upgradeSpell` `10 * 2^n` vs those two Doka ceilings. |

Unchanged and still NEW: XP wall 001; HUD sat 09-01-001; enemy 999 cap 003; RES/HP/AI/kits/discovery/summoner/boss/challenge 004–011; jackpot table + 100k/500k clamp 09-01-002; leftover Nat / pow2 09-01-004; no telemetry 014.

Line numbers in WorldExploration / `main.mo` drifted; formulas did not, except the two items above.

---

## XP and practical rate

| Level | Exact XP to next | HUD `xpForNextLevel` | Typical 3-kill XP | Fights to next |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 100 | 100 | ~660 | 0.15 (mean enemy ~11) |
| 10 | 51,200 | 51,200 | ~660 | ~78 |
| 15 | 1.64e6 | 1.64e6 | ~1,080 | ~1.5e3 |
| 25 | 1.678e9 | 1.678e9 | ~1,620 | ~1.0e6 |
| 48 | 1.407e16 | **MAX_SAFE 9.01e15** | ~2,760 | ~5.1e12 |
| 50 | 5.63e16 | MAX_SAFE | ~2,760 | ~2.0e13 |
| 100 | 6.34e31 | MAX_SAFE | ~5,700 | ~1.1e28 |
| 250 | 9.05e76 | MAX_SAFE | ~14,700 | ~6.2e72 |
| 500 | 1.64e152 | MAX_SAFE | ~29,760 | ~5.5e147 |
| 1000 | 5.36e302 | MAX_SAFE | ~59,520 | ~9.0e297 |
| 1018 | 1.40e308 | MAX_SAFE | ~59,580 | ~2.4e303 |
| 1019 | **Infinity** (IEEE) | MAX_SAFE | ~59,580 | never |
| 2500 | Infinity | MAX_SAFE | ~59,580 | never |
| 10000 | Infinity | MAX_SAFE | ~59,580 | never |
| 50000 | Infinity | MAX_SAFE | ~59,580 | never |

`applyXpDelta(0, 48, 1)` and `applyXpDelta(0, 1018, 1)` stay at that level. Official income cannot fund 25+ in a realistic session count. `saveBattleStats` cannot skip or demote the curve.

**LHIPS-2026-08-31-001 (still).** **LHIPS-2026-09-01-001 (still).**

---

## Enemy generation

Default weights: 60% same tier, 20% ±1, 10% ±2, leftover 10% ±3..6. `threeOrMorePercent: 5` is **not read**. Extra ±1 tier variance at 15% per side. Adjacent / ±2 do not clamp `maxTier`; ±3..6 do.

| Player | Mean enemy | Min | Max | P(below tier) | P(same) | P(above) |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 11.0 | 1 | **77–80** | 0 | 0.72 | 0.28 |
| 10 | 10.9 | 1 | 79 | 0 | 0.71 | 0.29 |
| 25 | 27.0 | 1 | 99 | 0.27 | 0.46 | 0.27 |
| 100 | 95.5 | 22 | 170 | 0.27 | 0.47 | 0.26 |
| 500 | 495.6 | 421 | 568 | 0.28 | 0.44 | 0.28 |
| 1000 | 991.9 | 921 | **1020** | 0.29 | 0.58 | 0.14 |
| 2500 | 993.6 | 931 | 1020 | **1.00** | 0 | 0 |
| 10000 | ~993 | 931 | 1020 | **1.00** | 0 | 0 |
| 50000 | ~993 | 931 | 1020 | **1.00** | 0 | 0 |

Dungeon boost is `+ boost * tierSize` (max +30 at depth 5) on top of this window. 10k/50k confirm the 999 ceiling does not grow with the player.

**LHIPS-2026-08-31-003 (still).**

---

## Enemy / player stats

| Level | Live player HP | Formula (unused) HP | Victory HP floor | Enemy live HP |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 100 | 100 | 60 | 50 |
| 10 | 145 | 155 | **150 (> max)** | 72 |
| 25 | 220 | 323 | 300 | 110 |
| 50 | 345 | 1,092 | 550 | 172 |
| 100 | 595 | 12,524 | 1,050 | 297 |
| 500 | 2,595 | 3.75e12 | 5,050 | 1,297 |
| 1000 | 5,095 | 1.47e23 | 10,050 | 2,547 |
| 10000 | 50,095 | overflow-scale | 100,050 | 25,047 |

First level a **max** RES roll can reach 100 (full reduction, then chip-1): rook 78, knight 84, king 107, pawn 126, queen 143, bishop 154. SR: rook 79, king 96.

`calcScaledDamage` still ignores caster level (`combatMath.ts` 130–137) — player offense grows only with spell upgrades (+3%/level). Family 30% (`WorldExploration.tsx` 5941–5952) is still overwritten at battle start (12013–12017).

**LHIPS-2026-08-31-004, 005 (still).**

---

## AI

| Enemy level | Mean tier | P(tier 10 / betrayal gate) | P(tier ≥ 5 / erratic gate) |
| ---: | ---: | ---: | ---: |
| 1 | 2.3 | 0.030 | 0.177 |
| 10 | 2.4 | 0.030 | 0.188 |
| 101 | 5.2 | 0.029 | 0.882 |
| 901 | 8.6 | 0.725 | 0.877 |
| 1000 | 8.7 | 0.731 | 0.882 |

Gates: erratic `aiTier >= 5` (`WorldExploration.tsx` 15597); betrayal `>= 10` and 5% (`15684–15687`). `instantKill` (gate 9) is unused. Summoner chance = 100% at player 44. Extra combatants + AI work stay saturated from 44 through 50000.

**LHIPS-2026-08-31-006, 009 (still).**

---

## Spell pools and discovery

Passing the live `LevelZone` object into `buildEnemyKit` (`WorldExploration.tsx` 12035) still yields the zone-0 kit at every player level. `setCurrentZoneTier(playerTier + 1)` at 4677 is a numeric zone and is **not** the kit argument.

| Piece | Live call (object) | Numeric zone 2 (intended late) |
| :--- | :--- | :--- |
| pawn | Strike | Strike + Venom |
| rook | Strike | Strike + Iron Skin |
| knight | Strike | Strike |
| bishop | Frost | Frost + Poison |
| queen | Frost | **Inferno + Heal** |
| king | Frost | **Inferno + Rally** |

All 32 frontend spells are `starterSpells` and are `baseSpells` at create (`WorldExploration.tsx` 2356–2369). `shouldIncludeBackendSpellInLibrary` (`adminSafety.ts` 551–557) only hides **retired** catalog rows; any `usableByPlayer !== false` backend spell still enters the library. No rarity, no duplicate-discovery path.

**LHIPS-2026-08-31-007, 008 (still).**

---

## Rewards / economy

- Kill Doka = `enemy.level * multiplier`. The `roll < 0.0001` band is still 0.01% (comment still says 0.0001%) × `1..1e9` (`WorldExploration.tsx` 12502–12528).
- Persist still clamps the **whole `applyRewards` call** to 100_000 Doka / 500_000 XP. Recap uses the clamped pair (`12561–12581`).
- A jackpot hit at any simulated enemy level persists **exactly 100_000**.
- Stacked official XP (`3 * L * 20 * 6 * 1.5` Enthroned Void + XP boost) exceeds 500_000 from enemy **926**.
- Dungeon Doka multiplier still saturates at ×4 (depth 5). Dungeon pack XP stays under the XP ceiling because enemy level caps near 1020 (`13 * 1020 * 20 = 265_200`).
- Challenge XP is still flat 400–1000 and cannot move the exponential wall.
- **New:** `redeemGameKey` adds up to 10_000_000 Doka without going through `applyRewards`. Copy: 1000 Doka = 10€.
- **New filing:** `upgradeSpell` cost `10 * 2^n` exceeds one combat jackpot at **spell level 14** (163_840) and exceeds a max GameKey at **spell level 20** (10_485_760). Frontend `Number` of that cost is inexact from spell level 50.

**LHIPS-2026-09-01-002 (still).** **LHIPS-2026-09-02-001, 002.**

---

## Bosses / dungeons

Combat boss HP stays 350 (Pale Archbishop sample) at every player level including 10000 / 50000. Guide `1.08^5` shows 514. Solvable at all simulated levels as a time sink, not as a scaled threat, once player HP and AP grow. Dungeon extra-enemy / tier-boost tables stop at depth 5. Highest catalog boss XP multiplier is 6 (`bossDefaults.ts` 755). Challenge under-30 / under-50 damage still fails on a single placeholder hit at 14 / 24.

**LHIPS-2026-08-31-010, 011 (still).**

---

## Technical limits

| Limit | What happens now |
| :--- | :--- |
| HUD `xpForNextLevel` | Saturates at `MAX_SAFE_INTEGER` from level 48 |
| Exact `100 * 2^(N-1)` as Number | Infinity at N=1019 (also 2500 / 10000 / 50000) |
| `Number(ok.newXp)` | Precision loss above 2^53 (`applyRewardsResult.ts` 28–31) |
| Motoko `pow2` | `O(level)` multiplies on every `applyRewards` (`main.mo` 2068); `xpDelta` ≤ 500k so wrap count is small, but `2^(level-1)` at a stored high level can still trap |
| `saveBattleStats.level` | Frozen to stored value (cannot raise or lower) |
| `saveBattleStats` AP/MP | Silent `_minNat(..., 20)`; formula AP 21 at 325 |
| Spell fail | 0 at 201 |
| Spell range | Capped at 5 by the teens |
| Spell upgrade cost | `10 * 2^n` Nat; Number-inexact at spell 50+ |
| GameKey / admin grant | 10M Nat, bypasses 100k combat ceiling |
| Enemy id | `enemy-${i}-${currentTime}` — not a level issue |
| UI leftover bar | `leftover / hudNeed`; at 48+ the denominator is 9.01e15 while persist need is 1.41e16 |
| `toLocaleString` Doka | Fine through GameKey max; unsafe if a wallet ever exceeds `MAX_SAFE_INTEGER` |

**LHIPS-2026-09-01-001, 003, 004 (still).** **LHIPS-2026-09-02-001, 002.**

---

## Telemetry / calibration

No series to compare XP rate, relative-level mix, battle length, death rate, discovery, advanced-AI, elite, or wallet growth. Combat elite flags do not exist (`elite_patrol` is a world-feature design row only). Family 30% is cosmetic after battle-start overwrite.

**LHIPS-2026-08-31-014 (still).**

---

## What this run did not do

- No change to RAF, map generation, turn logic, or damage math.
- No curve / spawn / kit / jackpot / GameKey retune.
- No claim that current live players are at any of these levels.
- No reopen of unchanged 2026-08-31 or 2026-09-01 IDs.
