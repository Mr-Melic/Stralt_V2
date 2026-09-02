/**
 * saveBattleStats writes an absolute wallet/XP snapshot. Credits belong on
 * applyRewards. This clamp is the backend contract: never mint Doka/XP and
 * never adopt a client level (applyRewards is the only level writer).
 */

function toNat(n: number, fallback: number): number {
  const value = Math.floor(Number(n));
  return Number.isFinite(value) ? value : fallback;
}

export type AbsoluteStatsSnapshot = {
  doka: number;
  xp: number;
  level: number;
};

export function clampSaveBattleStatsWrite(
  stored: AbsoluteStatsSnapshot,
  incoming: AbsoluteStatsSnapshot,
): AbsoluteStatsSnapshot {
  const storedDoka = Math.max(0, toNat(stored.doka, 0));
  const storedXp = Math.max(0, toNat(stored.xp, 0));
  const storedLevel = Math.max(1, toNat(stored.level, 1));
  const writeDoka = Math.max(0, toNat(incoming.doka, storedDoka));
  const writeXp = Math.max(0, toNat(incoming.xp, storedXp));
  return {
    doka: Math.min(storedDoka, writeDoka),
    xp: Math.min(storedXp, writeXp),
    level: storedLevel,
  };
}
