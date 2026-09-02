import assert from "node:assert/strict";
import {
  APPLY_REWARDS_MAX_DOKA_DELTA,
  APPLY_REWARDS_MAX_XP_DELTA,
} from "./applyRewardsResult.ts";
import {
  fightsToNextLevel,
  firstEnemyLevelXpClampHits,
  firstHudSaturationLevel,
  firstLevelResCanHit100,
  firstSpellLevelCostExceeds,
  formulaAp,
  jackpotPersistIfHit,
  jackpotUnclampedMean,
  kitForZoneInput,
  linearPlayerMaxHp,
  officialStackedXp,
  runLongHorizonSim,
  spawnPlaceholderDamage,
  spellFailChance,
  spellUpgradeCostBigInt,
  summonerChance,
  victoryHpFloor,
  xpNeedExactAsNumber,
} from "./longHorizonSim.ts";
import { applyXpDelta, xpForNextLevel } from "./xpCurve.ts";

const report = runLongHorizonSim();

assert.equal(xpForNextLevel(1), 100);
assert.equal(xpForNextLevel(10), 51200);
assert.equal(xpForNextLevel(25), 1_677_721_600);
assert.equal(Number.isFinite(xpForNextLevel(1018)), true);
assert.equal(
  Number.isFinite(xpForNextLevel(1019)),
  true,
  "HUD saturates at MAX_SAFE_INTEGER — Infinity used to freeze leftover bars",
);
assert.equal(xpForNextLevel(1019), Number.MAX_SAFE_INTEGER);
assert.equal(firstHudSaturationLevel(), 48);
assert.equal(xpForNextLevel(47) < Number.MAX_SAFE_INTEGER, true);
assert.equal(xpForNextLevel(48), Number.MAX_SAFE_INTEGER);
assert.equal(Number.isFinite(xpNeedExactAsNumber(1018)), true);
assert.equal(Number.isFinite(xpNeedExactAsNumber(1019)), false);
assert.deepEqual(applyXpDelta(0, 48, 1), { newXp: 1, newLevel: 48 });
assert.deepEqual(applyXpDelta(0, 1018, 1), { newXp: 1, newLevel: 1018 });

assert.equal(victoryHpFloor(10) > linearPlayerMaxHp(10), true);
assert.equal(formulaAp(325) > 20, true);
assert.equal(spellFailChance(201), 0);
assert.ok(summonerChance(44) >= 1);
assert.equal(spawnPlaceholderDamage(14) > 30, true);
assert.equal(spawnPlaceholderDamage(24) > 50, true);
assert.equal(firstLevelResCanHit100("rook"), 78);

assert.deepEqual(kitForZoneInput("queen", 2), [
  "spell-inferno",
  "starter-heal",
]);
assert.deepEqual(kitForZoneInput("queen", { name: "Tier 25 Zone" }), [
  "starter-frost",
]);

assert.ok((report.xpRows.find((r) => r.level === 25)?.fightsToNext ?? 0) > 1e6);
assert.ok((report.xpRows.find((r) => r.level === 1)?.enemyLevelMax ?? 0) >= 70);
assert.equal(report.catalog.starterSpellCount, 32);
assert.equal(report.telemetry.available, false);
assert.equal(report.persistContract.hudSaturationLevel, 48);
assert.equal(report.saveBattleStatsLevelUnconstrained, false);

assert.ok(fightsToNextLevel(15, 15) > 100);

assert.ok(jackpotUnclampedMean(1) > APPLY_REWARDS_MAX_DOKA_DELTA);
assert.equal(jackpotPersistIfHit(1), APPLY_REWARDS_MAX_DOKA_DELTA);
assert.equal(firstEnemyLevelXpClampHits(3, 6, true), 926);
assert.ok(officialStackedXp(1020, 3, 6, true) > APPLY_REWARDS_MAX_XP_DELTA);
assert.equal(
  report.xpRows.find((r) => r.level === 1000)?.stackedXpTruncated,
  true,
);
assert.equal(
  report.xpRows.some((r) => r.level === 10_000),
  true,
);
assert.equal(report.xpRows.find((r) => r.level === 10_000)?.pBelowTier, 1);
assert.equal(report.xpRows.find((r) => r.level === 50_000)?.pBelowTier, 1);
assert.equal(report.persistContract.saveBattleStatsCannotLowerLevel, true);
assert.equal(report.persistContract.maxDokaGrant, 10_000_000);
assert.equal(report.persistContract.gameKeyBypassesApplyRewardsCeiling, true);
assert.equal(spellUpgradeCostBigInt(0), 10n);
assert.equal(spellUpgradeCostBigInt(14), 163_840n);
assert.equal(firstSpellLevelCostExceeds(100_000), 14);
assert.equal(firstSpellLevelCostExceeds(10_000_000), 20);
assert.equal(report.persistContract.firstSpellLevelCombatDokaCannotBuy, 14);
assert.equal(report.persistContract.firstSpellLevelGameKeyCannotBuy, 20);

console.log("longHorizonSim.test: ok");
