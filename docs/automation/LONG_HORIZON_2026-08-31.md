# Long-Horizon Infinite Progression — 2026-08-31

Stralt has no character level cap in data or persist. This run stress-tested the **live formulas** at levels 1, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, and the IEEE edge 1018 / 1019.

Players are **not** assumed to reach these levels quickly. The mid-teens already exhaust intended XP income.

**Telemetry:** none. Leaderboard fields exist; this environment has no populated encounter / duration / death / discovery series. Observed max level (unknown here) is not a cap. Calibration is skipped. Real play would only be used to check the synthetic model, not to stop the horizon.

**This run does not redesign progression.** Findings are ACTION_IDs only.

Harness: `src/frontend/src/utils/longHorizonSim.ts`  
Ledger: `docs/automation/ACTION_IDS_2026-08-31.md`

---

## Method

Authoritative sources (not comments, not `backend_extended`):

| Topic | Live formula |
| :--- | :--- |
| XP threshold | `100 * 2^(N-1)` — `xpCurve.ts` 10–13, `main.mo` 1364–1371 |
| Kill XP | `sum(enemy.level * 20)` — `rewardResolver.ts` 82–94 |
| Portal XP | 10 |
| Challenge XP | flat 400–1000 |
| Enemy level | `pickEnemyLevelFromTiers`, `maxTier = floor(999 / tierSize)` |
| Enemy combat HP | `floor(50 * (1 + (L-1)*0.05))` |
| Player live max HP | `floor(100 * (1 + (L-1)*0.05))` |
| Player formula HP | `round(100 * 1.05^(L-1))` — unused for HP |
| Enemy RES/SP/SR | `getEnemyBaseStats` linear rolls |
| Damage mitigation | `max(0, 1 - stat/100)` then `max(1, round)` |
| AI tier | level table + 30% uniform 1–10 |
| Kits | `buildEnemyKit(piece, currentMap.levelZone)` — object, not number |
| Summoner | `0.12 + playerLevel * 0.02` |
| Boss combat | static `baseStats` (~350 HP), level `player+5` |
| Doka | frontend jackpot table, persist via `applyRewards` |

Monte Carlo: 4000 rolls per level, default tier config, no `localStorage` override.

---

## XP and practical rate

| Level | XP to next | Typical 3-kill XP (sim mean enemy) | Fights to next |
| ---: | ---: | ---: | ---: |
| 1 | 100 | ~660 | 0.15 (mean enemy is already ~11) |
| 10 | 51,200 | ~660 | ~78 |
| 25 | 1.678e9 | ~1,620 | ~1.0e6 |
| 50 | 5.63e16 | ~2,760 | ~2.0e13 |
| 100 | 6.34e31 | ~5,700 | ~1.1e28 |
| 250 | 9.05e76 | ~14,760 | ~6.1e72 |
| 500 | 1.64e152 | ~29,760 | ~5.5e147 |
| 1000 | 5.36e302 | ~59,520 | ~9.0e297 |
| 1018 | 1.40e308 | ~59,580 | ~2.4e303 |
| 1019 | **Infinity** | ~59,580 | never |
| 2500 | Infinity | ~59,580 | never |

`applyXpDelta(0, 1018, 1)` stays at level 1018. Frontend `Number(newXp)` / `Number(newLevel)` cannot represent Motoko `Nat` past `2^53` / `MAX_VALUE`.

**LHIPS-2026-08-31-001, 002.**

---

## Enemy generation

Default weights: 60% same tier, 20% ±1, 10% ±2, leftover 10% ±3..6. `threeOrMorePercent: 5` is **not read**. Extra ±1 tier variance at 15% per side. Adjacent / ±2 do not clamp `maxTier`; ±3..6 do.

| Player | Mean enemy | Min | Max | P(below tier) | P(same) | P(above) |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 10.8 | 1 | **80** | 0 | 0.72 | 0.28 |
| 10 | 11.2 | 1 | 80 | 0 | 0.71 | 0.29 |
| 25 | 26.9 | 1 | 100 | 0.27 | 0.45 | 0.28 |
| 50 | 45.9 | 1 | 120 | 0.27 | 0.46 | 0.28 |
| 100 | 95.5 | 22 | 168 | 0.28 | 0.44 | 0.28 |
| 250 | 245.6 | 171 | 315 | 0.28 | 0.45 | 0.27 |
| 500 | 495.8 | 422 | 570 | 0.27 | 0.43 | 0.30 |
| 1000 | 992.0 | 924 | **1020** | 0.28 | 0.59 | 0.13 |
| 2500 | 993.5 | 931 | 1020 | **1.00** | 0 | 0 |
| 5000 | 993.3 | 931 | 1020 | **1.00** | 0 | 0 |

Dungeon boost is `+ boost * tierSize` (max +30 at depth 5) on top of this window.

**LHIPS-2026-08-31-003.**

---

## Enemy / player stats

| Level | Live player HP | Formula (unused) HP | Victory HP floor | Enemy live HP | Placeholder melee |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 100 | 100 | 60 | 50 | 5 |
| 10 | 145 | 155 | **150 (> max)** | 72 | 23 |
| 25 | 220 | 323 | 300 | 110 | 53 |
| 50 | 345 | 1,092 | 550 | 172 | 103 |
| 100 | 595 | 12,524 | 1,050 | 297 | 203 |
| 500 | 2,595 | 3.75e12 | 5,050 | 1,297 | 1,003 |
| 1000 | 5,095 | 1.47e23 | 10,050 | 2,547 | 2,003 |

First level a **max** RES roll can reach 100 (full reduction, then chip-1): rook 78, knight 84, king 107, pawn 126, queen 143, bishop 154. SR: rook 79.

**LHIPS-2026-08-31-004, 005.**

---

## AI

| Enemy level | Mean tier | P(tier 10 / betrayal gate) | P(tier ≥ 5 / erratic gate) |
| ---: | ---: | ---: | ---: |
| 1 | 2.4 | 0.030 | 0.186 |
| 10 | 2.4 | 0.032 | 0.179 |
| 101 | 5.2 | 0.031 | 0.879 |
| 901 | 8.6 | 0.728 | 0.883 |
| 1000 | 8.7 | 0.731 | 0.884 |

`instantKill` (gate 9) is unused. Summoner chance = 100% at player 44.

**LHIPS-2026-08-31-006, 009.**

---

## Spell pools and discovery

Passing the live `LevelZone` object into `buildEnemyKit` yields the zone-0 kit at every player level:

| Piece | Live call (object) | Numeric zone 2 (intended late) |
| :--- | :--- | :--- |
| pawn | Strike | Strike + Venom |
| rook | Strike | Strike + Iron Skin |
| knight | Strike | Strike |
| bishop | Frost | Frost + Poison |
| queen | Frost | **Inferno + Heal** |
| king | Frost | **Inferno + Rally** |

All 32 frontend spells are `starterSpells` and are owned at create. No rarity, no duplicate-discovery path, no leftover undiscovered catalog.

**LHIPS-2026-08-31-007, 008.**

---

## Rewards / economy

- Kill Doka = `enemy.level * multiplier`. The `roll < 0.0001` band is 0.01% (comment says 0.0001%) × `1..1e9`. Expected jackpot term ≈ `5e4 * level` Doka/enemy and dominates the 90% `1–3` band.
- Dungeon multiplier saturates at ×4 (depth 5). Boss ads ×5 Doka / ×3 XP on static ~350 HP.
- Recap leftover uses `(level)*100` in four WX sites; HUD leftover uses the real `2^(N-1)` curve.
- Challenge XP is flat and cannot move the exponential wall.

**LHIPS-2026-08-31-012, 011.**

---

## Bosses / dungeons

Combat boss HP stays 350 (Pale Archbishop sample) at every player level. Guide `1.08^5` shows 514. Solvable at all simulated levels as a time sink, not as a scaled threat, once player HP and AP grow. Dungeon extra-enemy / tier-boost tables stop at depth 5.

**LHIPS-2026-08-31-010.**

---

## Technical limits

| Limit | What happens |
| :--- | :--- |
| JS `100 * 2^(N-1)` | Infinity at N=1019 |
| `Number(ok.newXp)` | Precision loss above 2^53 |
| Motoko `Nat` + `pow2` loop | Unbounded; large `xpDelta` can trap |
| `updateCharacter` AP/MP | Reject > 20 (formula AP 21 at 325) |
| `saveBattleStats.level` | Unconstrained write — curve can be skipped |
| Spell fail | 0 at 201 |
| Spell range | Capped at 5 by the teens |
| Enemy id | `enemy-${i}-${Date.now()}` — not a level issue |
| UI | `toLocaleString()` on Doka; leftover bar is raw `exp/expToNext` (scientific at high N) |

**LHIPS-2026-08-31-002, 013.**

---

## Telemetry / calibration

No series to compare XP rate, relative-level mix, battle length, death rate, discovery, advanced-AI, elite, or wallet growth. Family 30% is cosmetic after battle-start overwrite. There is no elite flag.

**LHIPS-2026-08-31-014.**

---

## What this run did not do

- No change to RAF, map generation, turn logic, or damage math.
- No curve / spawn / kit / jackpot retune.
- No claim that current live players are at any of these levels.
