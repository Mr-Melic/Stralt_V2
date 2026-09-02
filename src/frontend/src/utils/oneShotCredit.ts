/**
 * One-shot claim ids for world credits that are not backend-idempotent.
 * applyRewards is a raw Nat add — a replayed movement updater, a second
 * altar step, or a second dungeon-complete portal must not mint again.
 */

export type GroundDokaLoot = {
  id: string;
  tileX: number;
  tileY: number;
  value: number;
  collected: boolean;
};

export function takeOneShotCredit(
  claimedIds: Set<string>,
  creditId: string,
): boolean {
  if (!creditId || claimedIds.has(creditId)) return false;
  claimedIds.add(creditId);
  return true;
}

/**
 * Claim a ground coin from the live loot list. Marks the id claimed before
 * returning so a second RAF step or a React updater replay cannot
 * applyRewards the same coin.
 */
export function claimGroundDokaAtTile(
  loot: GroundDokaLoot[],
  tileX: number,
  tileY: number,
  claimedIds: Set<string>,
): { hit: GroundDokaLoot | null; next: GroundDokaLoot[] } {
  const hit = loot.find(
    (item) =>
      !item.collected &&
      item.tileX === tileX &&
      item.tileY === tileY &&
      item.value > 0 &&
      !claimedIds.has(item.id),
  );
  if (!hit) return { hit: null, next: loot };
  claimedIds.add(hit.id);
  return {
    hit,
    next: loot.map((item) =>
      item.id === hit.id ? { ...item, collected: true } : item,
    ),
  };
}

export function shrineCreditId(visitId: string): string {
  return visitId ? `shrine:${visitId}` : "";
}

export function dungeonCompleteCreditId(runId: string): string {
  return runId ? `dungeon:${runId}` : "";
}
