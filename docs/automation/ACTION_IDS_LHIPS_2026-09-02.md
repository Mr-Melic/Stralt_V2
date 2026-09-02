# ACTION_IDs — 2026-09-02 Long-Horizon Infinite Progression Simulator

Durable ledger for implementers and the Report Action Orchestrator.  
Source of every record: Long-Horizon Infinite Progression Simulator.  
Narrative: [`LONG_HORIZON_2026-09-02.md`](./LONG_HORIZON_2026-09-02.md).  
Harness: `src/frontend/src/utils/longHorizonSim.ts`.

Do not implement gameplay from this file unless a later human or orchestrator explicitly picks an ID. This run ships **observation only** — no curve redesign.

HEAD inspected: `58302bc` (#258 GameKey shop).

## Still-open IDs (not re-filed)

| ACTION_ID | STATUS | Notes |
| :--- | :--- | :--- |
| `LHIPS-2026-08-31-001` | NEW | Exponential XP vs linear kill XP. Practical wall ~15–22. |
| `LHIPS-2026-08-31-002` | NEW | IEEE Infinity of the raw float at 1019. HUD path superseded by 09-01-001. |
| `LHIPS-2026-08-31-003` | NEW | Enemy `maxTier = floor(999/tierSize)`. Player 2500+ is 100% under-level. Confirmed at 10000 / 50000. |
| `LHIPS-2026-08-31-004` | NEW | RES/SR hit 100; player SP does not scale. Rook RES 100 at 78. |
| `LHIPS-2026-08-31-005` | NEW | Three HP formulas; victory floor exceeds maxHp at 10. |
| `LHIPS-2026-08-31-006` | NEW | 30% uniform AI 1–10; saturates ~901. |
| `LHIPS-2026-08-31-007` | NEW | `buildEnemyKit(currentMap.levelZone)` still passes an object. `setCurrentZoneTier` at WX 4677 is unused by kits. |
| `LHIPS-2026-08-31-008` | NEW | All 32 starters owned at create. `shouldIncludeBackendSpellInLibrary` only hides retired ids. |
| `LHIPS-2026-08-31-009` | NEW | Summoner 100% at player 44. |
| `LHIPS-2026-08-31-010` | NEW | Boss combat HP static (~350). Guide `1.08^diff` not applied. |
| `LHIPS-2026-08-31-011` | NEW | Challenge under-30 / under-50 fail on one hit at 14 / 24. |
| `LHIPS-2026-08-31-012` | NEW | Jackpot table unchanged. Recap leftover lie closed (09-01-002). Persist 100k-capped. |
| `LHIPS-2026-08-31-013` | NEW | Level-skip claim closed (level is frozen on `saveBattleStats`). AP/MP clamp remainder is 09-01-003. |
| `LHIPS-2026-08-31-014` | NEW | No player telemetry. |
| `LHIPS-2026-09-01-001` | NEW | HUD saturates at MAX_SAFE from 48. |
| `LHIPS-2026-09-01-002` | NEW | applyRewards 100k/500k vs jackpot and Void+boost XP. |
| `LHIPS-2026-09-01-003` | NEW | Formula AP 21 at 325 vs silent persist 20. |
| `LHIPS-2026-09-01-004` | NEW | Leftover Nat / Motoko pow2 / Number leftover. |
| `AQA-2026-08-30-012` | NEW | Collectors still missing. |

This file adds IDs only where a persist path landed after 09-01 or a numeric failure was in-scope and never filed.

---

ACTION_ID: LHIPS-2026-09-02-001  
SOURCE_AUTOMATION: Long-Horizon Infinite Progression Simulator  
TITLE: GameKey redeem credits up to 10M Doka outside the applyRewards 100k combat ceiling  
CATEGORY: economy  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `redeemGameKey` (`src/backend/main.mo` 1437–1499) does `dokaBalances.add(caller, current + entry.dokaAmount)` after `AdminGuard.validateDokaGrant`. Max grant is `MAX_DOKA_GRANT = 10_000_000` (`adminGuard.mo` 8, 138–143; frontend mirror `adminSafety.ts` 7, 316–323). That path is not `applyRewards`, so the per-call 100_000 Doka / 500_000 XP ceilings (`main.mo` 2058–2059) do not apply. Official copy is `1000 Doka = 10€` (`iapShopCopy.ts` 12). Combat jackpot still rolls `roll < 0.0001` × `1..1e9` × `enemy.level` (`WorldExploration.tsx` 12502–12528) then `clampApplyRewardsDeltas` to 100_000 (`applyRewardsResult.ts` 46–61). One max GameKey is 100× a clamped jackpot and 10_000× the advertised 1000-Doka pack. XP is unchanged — GameKey cannot fund the exponential wall (001). Harness: `persistContract.maxDokaGrant === 10000000`, `gameKeyBypassesApplyRewardsCeiling === true`.  
FIRST_APPROXIMATE_PROBLEM_LEVEL: 1 (wallet split is independent of character level). Spell-upgrade interaction starts at spell level 14 (see 002).  
CAUSE: IAP mint was moved to a dedicated actor method with a 10M admin-grant cap; combat persist kept the 100k raw-client guard. The two ceilings were not sized together.  
PLAYER_EFFECT: Paid Doka can dwarf any combat wallet. A 0.01% jackpot still pays 100k (100× a 10€ pack) if it hits, then stops. Late spell upgrades (002) spend this IAP pool, not kill Doka. Playable leveling is still blocked by XP, not Doka.  
TECHNICAL_EFFECT: Two credit funnels. `applyRewards` remains the only XP writer. Wallet Nat after many 10M grants stays inside `MAX_SAFE_INTEGER` for any realistic redeem count. `toLocaleString` HUD is fine through 10M.  
SYSTEMS_AFFECTED: `redeemGameKey`; `validateDokaGrant`; `dokaBalances`; `clampApplyRewardsDeltas`; DokaGameKey shop; jackpot table  
RECOMMENDED_ACTION: Report only. Do not retune jackpot, XP, or GameKey here. If a human picks this ID, pick one published Doka-per-call / Doka-per-key budget and document how IAP relates to combat 100k — do not raise the combat ceiling to 10M as a silent side effect.  
AUTONOMY: REPORT_ONLY  
DEPENDENCIES: LHIPS-2026-09-01-002 (combat clamp); LHIPS-2026-08-31-012 (jackpot table)  
REGRESSION_RISK: HIGH if combat 100k is lifted or GameKey is routed through `applyRewards` without a paid-IAP exception. LOW for documentation.  
VALIDATION_REQUIRED: `validateDokaGrant(10_000_001)` rejects; `redeemGameKey` of an approved 10M key increases `getCallerDokaBalance` by 10M without calling `applyRewards`; a combat jackpot still persists 100_000. Re-run `longHorizonSim.test.ts`.  
STATUS: NEW  

---

ACTION_ID: LHIPS-2026-09-02-002  
SOURCE_AUTOMATION: Long-Horizon Infinite Progression Simulator  
TITLE: Uncapped upgradeSpell 10×2^n outruns combat Doka at spell 14 and Number at spell 50  
CATEGORY: economy  
PRIORITY: P1  
CONFIDENCE: HIGH  
EVIDENCE: `upgradeSpell` (`src/backend/main.mo` 1003–1009) sets `cost = baseCost` then `while (expCount > 0) { cost := cost * 2 }`. Default `spellLevelingBaseCost = 10` (`main.mo` 622). No max spell level exists on the persist arrays. Cost to buy the next level from current `n` is `10 * 2^n`: n=13 → 81_920 (fits one 100k jackpot); n=14 → 163_840 (exceeds `APPLY_REWARDS_MAX_DOKA_DELTA`); n=19 → 5_242_880 (fits one max GameKey); n=20 → 10_485_760 (exceeds `MAX_DOKA_GRANT`). Frontend `Number(cost)` / advertised UI is inexact once `10 * 2^n > MAX_SAFE_INTEGER` (first at n=50: `10 * 2^50 = 1.126e16`). Motoko Nat is unbounded; the doubling loop is O(spell level) of a growing Nat — same class as `applyRewards` pow2 (09-01-004) but on the spend path. All 32 starters are already owned (008), so the sink is depth of upgrades, not discovery. Harness: `firstSpellLevelCombatDokaCannotBuy === 14`, `firstSpellLevelGameKeyCannotBuy === 20`.  
FIRST_APPROXIMATE_PROBLEM_LEVEL: spell level 14 (combat Doka); 20 (max GameKey); 50 (IEEE). Independent of character level. Official play hits the XP wall (001) first.  
CAUSE: Spell cost doubles forever. Combat Doka was later ceilinged at 100k/call. GameKey was later ceilinged at 10M. No pairing of those caps to a max spell level.  
PLAYER_EFFECT: After ~14 upgrades on a spell, kill/jackpot Doka cannot pay the next level even if every fight hits the 100k persist cap. IAP can continue to ~19. Past 20, only a sequence of max keys or an admin grant policy change could continue — and the XP wall still blocks character leveling. Summon UI still advertises 10× the canister debit (`spellUpgrade.ts` 91–98).  
TECHNICAL_EFFECT: Spend path can instruction-trap on a synthetic high `spellLevelValues` row. HUD cost `toLocaleString` / `Number` rounds after 50. `saveBattleStats` ignores spell-level arrays (upgradeSpell remains the sole writer).  
SYSTEMS_AFFECTED: `upgradeSpell`; Spellbook cost UI; `spellUpgradeUiSpend`; `dokaBalances`; GameKey wallet  
RECOMMENDED_ACTION: Report only. Do not add a spell-level cap or retune `2^n` here. If a human wants a finite sink, pair a max spell level with the published Doka ceilings rather than shrinking jackpot alone.  
AUTONOMY: REPORT_ONLY  
DEPENDENCIES: LHIPS-2026-09-02-001; LHIPS-2026-09-01-002; LHIPS-2026-08-31-008  
REGRESSION_RISK: HIGH if cost formula or a new cap ships without a paired Motoko + Spellbook + summon-UI debit update (summon already advertises 10×).  
VALIDATION_REQUIRED: `10 * 2^13 = 81920`; `10 * 2^14 = 163840`; `upgradeSpell` at stored level 14 with 100_000 Doka returns not-enough; `Number(10n << 50n)` is not exact. Re-run `longHorizonSim.test.ts`.  
STATUS: NEW  
