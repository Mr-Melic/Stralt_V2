# Long-Horizon Infinite Progression — 2026-09-01

Stralt has no character level cap in data or persist. This run re-simulated the **live formulas** after the 2026-08-31 persist/XP contract moved (bigint HUD path, `applyRewards` per-call ceilings, `saveBattleStats` no longer raises level).

Stress levels: 1, 10, 15, 25, 48, 50, 78, 100, 250, 325, 500, 1000, 2500, 5000, 1018, 1019.

Players are **not** assumed to reach these levels quickly. The mid-teens already exhaust intended XP income. Observed max level (unknown here) is not a cap.

**Telemetry:** none. Leaderboard fields exist; this environment has no populated encounter / duration / death / discovery series. Calibration is skipped. Real play would only check the synthetic model, not stop the horizon.

**This run does not redesign progression.** Findings are ACTION_IDs only. Prior `LHIPS-2026-08-31-001..014` stay NEW unless a formula moved; those that moved get a 2026-09-01 id.

Harness: `src/frontend/src/utils/longHorizonSim.ts`  
Ledger: `docs/automation/ACTION_IDS_2026-09-01.md`

---

## Method

Authoritative sources (not comments, not `backend_extended`):

| Topic | Live formula (2026-09-01) |
| :--- | :--- |
| XP threshold (persist) | `100n * (1n << (N-1))` — `xpCurve.ts` 24–26; Motoko twin `main.mo` 1808–1812 |
| XP threshold (HUD / recap) | same, but `xpForNextLevel` saturates at `Number.MAX_SAFE_INTEGER` from **level 48** (`xpCurve.ts` 32–36) |
| Kill XP | `sum(enemy.level * 20)` — `rewardResolver.ts` 89–101 |
| Portal XP | 10 |
| `applyRewards` ceilings | `dokaDelta > 100_000` / `xpDelta > 500_000` → `#err` (`main.mo` 1798–1799); client `clampApplyRewardsDeltas` (`applyRewardsResult.ts` 46–61) |
| `saveBattleStats` | cannot raise level/XP/Doka (`main.mo` 1767–1769); AP/MP `_minNat(..., 20)` (1734–1735) |
| Enemy level | `pickEnemyLevelFromTiers`, `maxTier = floor(999 / tierSize)` |
| Enemy combat HP | `floor(50 * (1 + (L-1)*0.05))` |
| Player live max HP | `floor(100 * (1 + (L-1)*0.05))` |
| Player formula HP | `round(100 * 1.05^(L-1))` — unused for HP |
| AI tier | level table + 30% uniform 1–10 |
| Kits | `buildEnemyKit(piece, currentMap.levelZone)` — object, not number |
| Summoner | `0.12 + playerLevel * 0.02` |
| Boss combat | static `baseStats` (sample 350 HP), level `player+5` |
| Doka | frontend jackpot table, then clamp to 100_000 per call |

Monte Carlo: 4000 rolls per level, default tier config, no `localStorage` override.

---

## What moved since 2026-08-31

| Prior ID | Drift |
| :--- | :--- |
| LHIPS-2026-08-31-002 | Frontend no longer returns IEEE `Infinity` at 1019. HUD saturates at `MAX_SAFE_INTEGER` at **48**. Persist still uses exact bigint / Motoko `Nat`. |
| LHIPS-2026-08-31-012 | Recap leftover now uses `recapXpAfterGrant` / `xpForNextLevel` (`WorldExploration.tsx` 13010–13027). Jackpot table is unchanged; persist is now **100k-capped**. |
| LHIPS-2026-08-31-013 | `saveBattleStats` cannot raise level. Remaining issue is silent AP/MP clamp at 20 vs formula AP 21 at 325. |

Unchanged and still NEW: 001 (XP wall), 003–011, 014 (no telemetry).

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
| 250 | 9.05e76 | MAX_SAFE | ~14,760 | ~6.1e72 |
| 500 | 1.64e152 | MAX_SAFE | ~29,700 | ~5.5e147 |
| 1000 | 5.36e302 | MAX_SAFE | ~59,520 | ~9.0e297 |
| 1018 | 1.40e308 | MAX_SAFE | ~59,580 | ~2.4e303 |
| 1019 | **Infinity** (IEEE) | MAX_SAFE | ~59,580 | never |
| 2500 | Infinity | MAX_SAFE | ~59,580 | never |

`applyXpDelta(0, 48, 1)` and `applyXpDelta(0, 1018, 1)` stay at that level. Official income cannot fund 25+ in a realistic session count. `saveBattleStats` can no longer skip the curve.

**LHIPS-2026-08-31-001 (still).** **LHIPS-2026-09-01-001** (HUD sat).

---

## Enemy generation

Default weights: 60% same tier, 20% ±1, 10% ±2, leftover 10% ±3..6. `threeOrMorePercent: 5` is **not read**. Extra ±1 tier variance at 15% per side. Adjacent / ±2 do not clamp `maxTier`; ±3..6 do.

| Player | Mean enemy | Min | Max | P(below tier) | P(same) | P(above) |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 10.8 | 1 | **80** | 0 | 0.71 | 0.29 |
| 10 | 11.0 | 1 | 80 | 0 | 0.71 | 0.29 |
| 25 | 26.8 | 1 | 100 | 0.28 | 0.44 | 0.29 |
| 100 | 95.5 | 21 | 166 | 0.26 | 0.46 | 0.28 |
| 500 | 495.1 | 423 | 568 | 0.29 | 0.46 | 0.26 |
| 1000 | 991.9 | 921 | **1020** | 0.29 | 0.57 | 0.14 |
| 2500 | 993.3 | 931 | 1020 | **1.00** | 0 | 0 |
| 5000 | 993.0 | 931 | 1020 | **1.00** | 0 | 0 |

Dungeon boost is `+ boost * tierSize` (max +30 at depth 5) on top of this window (`WorldExploration.tsx` 6293–6366).

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

First level a **max** RES roll can reach 100 (full reduction, then chip-1): rook 78, knight 84, king 107, pawn 126, queen 143, bishop 154. SR: rook 79, king 96.

`calcScaledDamage` still ignores caster level (`combatMath.ts` 130–137) — player offense grows only with spell upgrades (+3%/level).

**LHIPS-2026-08-31-004, 005 (still).**

---

## AI

| Enemy level | Mean tier | P(tier 10 / betrayal gate) | P(tier ≥ 5 / erratic gate) |
| ---: | ---: | ---: | ---: |
| 1 | 2.3 | 0.031 | 0.177 |
| 10 | 2.4 | 0.029 | 0.182 |
| 101 | 5.2 | 0.033 | 0.882 |
| 901 | 8.6 | 0.730 | 0.875 |
| 1000 | 8.7 | 0.734 | 0.879 |

`instantKill` (gate 9) is unused. Summoner chance = 100% at player 44.

**LHIPS-2026-08-31-006, 009 (still).**

---

## Spell pools and discovery

Passing the live `LevelZone` object into `buildEnemyKit` (`WorldExploration.tsx` 12484) still yields the zone-0 kit at every player level:

| Piece | Live call (object) | Numeric zone 2 (intended late) |
| :--- | :--- | :--- |
| pawn | Strike | Strike + Venom |
| rook | Strike | Strike + Iron Skin |
| knight | Strike | Strike |
| bishop | Frost | Frost + Poison |
| queen | Frost | **Inferno + Heal** |
| king | Frost | **Inferno + Rally** |

All 32 frontend spells are `starterSpells` and are `baseSpells` at create (`WorldExploration.tsx` 2394–2438). Backend spells with `usableByPlayer !== false` still enter the library (`adminSafety.ts` 311–317). No rarity, no duplicate-discovery path.

**LHIPS-2026-08-31-007, 008 (still).**

---

## Rewards / economy

- Kill Doka = `enemy.level * multiplier`. The `roll < 0.0001` band is still 0.01% (comment still says 0.0001%) × `1..1e9` (`WorldExploration.tsx` 12951–12977).
- Persist now clamps the **whole call** to 100_000 Doka / 500_000 XP. Recap uses the clamped pair (`13010–13027`).
- A jackpot hit at any simulated enemy level persists **exactly 100_000** (mean unclamped is `level * 5e8`).
- Stacked official XP (`3 * L * 20 * 6 * 1.5` Enthroned Void + XP boost) exceeds 500_000 from enemy **926**. At the 999 enemy cap, that stack is 550_800 → persist 500_000.
- Dungeon Doka multiplier still saturates at ×4 (depth 5). Dungeon pack XP (13 × ~1050 × 20) stays under the XP ceiling.
- Challenge XP is still flat 400–1000 and cannot move the exponential wall.

**LHIPS-2026-09-01-002.** Recap leftover lie from 012 is closed.

---

## Bosses / dungeons

Combat boss HP stays 350 (Pale Archbishop sample) at every player level. Guide `1.08^5` shows 514. Solvable at all simulated levels as a time sink, not as a scaled threat, once player HP and AP grow. Dungeon extra-enemy / tier-boost tables stop at depth 5. Highest catalog boss XP multiplier is 6 (`bossDefaults.ts` 755).

**LHIPS-2026-08-31-010, 011 (still).**

---

## Technical limits

| Limit | What happens now |
| :--- | :--- |
| HUD `xpForNextLevel` | Saturates at `MAX_SAFE_INTEGER` from level 48 |
| Exact `100 * 2^(N-1)` as Number | Infinity at N=1019 |
| `Number(ok.newXp)` | Precision loss above 2^53 (`applyRewardsResult.ts` 28–31) |
| Motoko `pow2` | `O(level)` multiplies on every `applyRewards` (`main.mo` 1808–1818); `xpDelta` is now ≤ 500k so wrap count is small, but `2^(level-1)` at a stored high level can still trap |
| `updateCharacter` | Cosmetics only — no longer a god-mode level write |
| `saveBattleStats.level` | Cannot raise; **can** lower (death leftover path) |
| `saveBattleStats` AP/MP | Silent `_minNat(..., 20)`; formula AP 21 at 325 |
| Spell fail | 0 at 201 |
| Spell range | Capped at 5 by the teens |
| Enemy id | `enemy-${i}-${Date.now()}` — not a level issue |
| UI leftover bar | `leftover / hudNeed`; at 48+ the denominator is 9.01e15 while persist need is 1.41e16 |

**LHIPS-2026-09-01-001, 003, 004.**

---

## Telemetry / calibration

No series to compare XP rate, relative-level mix, battle length, death rate, discovery, advanced-AI, elite, or wallet growth. Family 30% (`WorldExploration.tsx` 6525–6537) is still cosmetic after battle-start overwrite. Combat elite flags do not exist (`elite_patrol` is a world-feature design row only).

**LHIPS-2026-08-31-014 (still).**

---

## What this run did not do

- No change to RAF, map generation, turn logic, or damage math.
- No curve / spawn / kit / jackpot retune.
- No claim that current live players are at any of these levels.
- No reopen of unchanged 2026-08-31 IDs.
