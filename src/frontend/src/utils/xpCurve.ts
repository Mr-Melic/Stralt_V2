/**
 * Canonical XP curve shared by the frontend HUD and backend applyRewards.
 *
 * Level N→N+1 requires 100 * 2^(N-1):
 *   1→2 = 100, 2→3 = 200, 3→4 = 400, …
 *
 * applyRewards must use the same threshold. Using 100 * 2^N (off by one)
 * silently blocks intended level-ups and reverts portal/victory local math.
 *
 * Number is not a level cap. Thresholds and leftover XP use bigint so a
 * player at level 48+ (where 100*2^(N-1) exceeds MAX_SAFE_INTEGER) still
 * levels instead of freezing on Infinity or a rounded comparison.
 */

function toNatLevel(level: number): number {
  return Math.max(1, Math.floor(Number(level) || 1));
}

function toNatXp(n: number): bigint {
  return BigInt(Math.max(0, Math.floor(Number(n) || 0)));
}

/** Exact threshold for level N→N+1 as 100 * 2^(N-1). */
export function xpThresholdBigInt(level: number): bigint {
  return 100n * (1n << BigInt(toNatLevel(level) - 1));
}

/**
 * HUD / number callers. Values above MAX_SAFE_INTEGER saturate so bars
 * never become Infinity/NaN. Persist math must use xpThresholdBigInt.
 */
export function xpForNextLevel(level: number): number {
  const t = xpThresholdBigInt(level);
  if (t > BigInt(Number.MAX_SAFE_INTEGER)) return Number.MAX_SAFE_INTEGER;
  return Number(t);
}

/** Total XP consumed to reach `level` from level 1: 100 * (2^(L-1) - 1). */
export function cumulativeXpToReachLevel(level: number): number {
  const total = 100n * ((1n << BigInt(toNatLevel(level) - 1)) - 1n);
  if (total > BigInt(Number.MAX_SAFE_INTEGER)) return Number.MAX_SAFE_INTEGER;
  return Number(total);
}

/**
 * Mirrors backend applyRewards XP leveling: add the delta to leftover XP
 * in the current level, then consume thresholds until leftover is below
 * the next level's requirement.
 */
export function applyXpDelta(
  currentXp: number,
  currentLevel: number,
  xpDelta: number,
): { newXp: number; newLevel: number } {
  let newXp = toNatXp(currentXp) + toNatXp(xpDelta);
  let newLevel = toNatLevel(currentLevel);
  // Huge minted deltas must not spin forever; Motoko Nat is the authority.
  let steps = 0;
  const maxSteps = 100_000;
  while (newXp >= xpThresholdBigInt(newLevel) && steps < maxSteps) {
    newXp -= xpThresholdBigInt(newLevel);
    newLevel += 1;
    steps += 1;
  }
  const xpNum =
    newXp > BigInt(Number.MAX_SAFE_INTEGER)
      ? Number.MAX_SAFE_INTEGER
      : Number(newXp);
  return { newXp: xpNum, newLevel };
}

/**
 * HUD progress for leftover XP in the current level (the applyRewards store).
 * Do not subtract a cumulative total — experience is already the remainder.
 */
export function xpHudProgress(
  leftoverXp: number,
  level: number,
): { leftover: number; needed: number; percent: number } {
  const needed = xpForNextLevel(level);
  const leftover = Math.max(0, Math.floor(Number(leftoverXp) || 0));
  return {
    leftover,
    needed,
    percent:
      needed > 0 ? Math.min(100, Math.max(0, (leftover / needed) * 100)) : 0,
  };
}

/** Predicted leftover / level / threshold after a grant, for recap display. */
export function recapXpAfterGrant(
  leftoverXp: number,
  level: number,
  xpDelta: number,
): { leftover: number; level: number; needed: number } {
  const after = applyXpDelta(leftoverXp, level, xpDelta);
  return {
    leftover: after.newXp,
    level: after.newLevel,
    needed: xpForNextLevel(after.newLevel),
  };
}

/**
 * HUD progress for leftover XP in the current level (the applyRewards store).
 * Do not subtract a cumulative total — experience is already the remainder.
 */
