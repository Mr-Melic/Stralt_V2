import { readApplyRewardsOk } from "./applyRewardsResult.ts";

/** One shrine altar credit per room. Stepping the tile twice must not applyRewards 300 twice. */
export const SHRINE_ALTAR_CREDIT_ID = "shrine-altar";

/** One dungeon-chain completion bonus per run. */
export const DUNGEON_CHAIN_COMPLETE_CREDIT_ID = "dungeon-chain-complete";

/**
 * Claim a credit id before enqueueing applyRewards. Ground Doka used to
 * credit inside `setDokaLoot` — React may replay that updater, and a second
 * movement step can see the same uncollected coin before the collected flag
 * lands.
 */
export function beginOneShotCredit(
  claimedIds: Set<string>,
  id: string,
): boolean {
  if (!id || claimedIds.has(id)) return false;
  claimedIds.add(id);
  return true;
}

export type GroundDokaLoot = {
  id: string;
  tileX: number;
  tileY: number;
  collected: boolean;
  value: number;
};

export function findGroundDokaOnTile(
  loot: readonly GroundDokaLoot[],
  tileX: number,
  tileY: number,
): GroundDokaLoot | undefined {
  return loot.find(
    (item) => !item.collected && item.tileX === tileX && item.tileY === tileY,
  );
}

export function markGroundDokaCollected<
  T extends { id: string; collected: boolean },
>(loot: readonly T[], id: string): T[] {
  return loot.map((item) =>
    item.id === id ? { ...item, collected: true } : item,
  );
}

/**
 * Minimal actor surface used by persistDokaCredit. Matches the backend
 * applyRewards(slot : Nat, dokaDelta : Nat, xpDelta : Nat) signature.
 */
export interface DokaCreditActor {
  applyRewards: (
    slot: bigint,
    dokaDelta: bigint,
    xpDelta: bigint,
  ) => Promise<
    | { ok: { newDoka: bigint; newXp: bigint; newLevel: bigint } }
    | { err: string }
  >;
}

/**
 * Ground Doka / shrine credits must claim a pickup id synchronously before
 * enqueueing applyRewards. The movement RAF can re-enter the same tile
 * (stale step index, Strict Mode updater) and used to call persistDokaCredit
 * twice for one coin — a reload-surviving double mint.
 */
export function tryClaimPickupId(claimed: Set<string>, id: string): boolean {
  if (!id || claimed.has(id)) return false;
  claimed.add(id);
  return true;
}

export function releasePickupId(claimed: Set<string>, id: string): void {
  claimed.delete(id);
}

export function tryClaimFlag(flag: { current: boolean }): boolean {
  if (flag.current) return false;
  flag.current = true;
  return true;
}

export function releaseFlag(flag: { current: boolean }): void {
  flag.current = false;
}

/** One-shot dungeon-chain completion bonus after cleanupMap zeros the refs. */
export function tryClaimDungeonChainBonus(claimed: {
  current: boolean;
}): boolean {
  return tryClaimFlag(claimed);
}

/**
 * Credits Doka to a character slot via the single atomic backend funnel
 * applyRewards(slot, doka, 0) and returns the new absolute Doka balance.
 * On backend error the failure is logged and 0 is returned so the caller can
 * fall back gracefully instead of crashing the reward flow.
 *
 * Parse through readApplyRewardsOk. A `{ _ok }` / `{ __kind__: "ok" }`
 * success that used to yield NaN left the canister credited and the persist
 * lock unchanged, so the next saveBattleStats wiped the pickup.
 */
export async function persistDokaCredit(
  actor: DokaCreditActor,
  slot: number,
  doka: number,
): Promise<number> {
  try {
    const result = await actor.applyRewards(
      BigInt(slot),
      BigInt(doka),
      BigInt(0),
    );
    return readApplyRewardsOk(result).newDoka;
  } catch (error) {
    console.error("persistDokaCredit failed", error);
    return 0;
  }
}
