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

export type PersistDokaCreditResult =
  | { ok: number }
  | { err: "rejected" | "transport" };

/**
 * After applyRewards is invoked, do not release the one-shot id.
 * Returning 0 / throwing used to look like "not credited" so shrine /
 * ground Doka / dungeon-complete retried and minted twice.
 */
export function shouldReleaseOneShotAfterPersist(
  applyRewardsInvoked: boolean,
): boolean {
  return applyRewardsInvoked !== true;
}

/** Only an explicit applyRewards #err is safe to retry (canister did not add). */
export function shouldReleaseOneShotDokaCredit(
  result: PersistDokaCreditResult,
): boolean {
  return "err" in result && result.err === "rejected";
}

export function persistDokaCreditAmount(
  result: PersistDokaCreditResult,
): number {
  return "ok" in result ? result.ok : 0;
}

export type DokaCreditPersistResult = {
  newDoka: number;
  applyRewardsInvoked: boolean;
  canisterRejected: boolean;
};

/**
 * Transport / parse failures after invoke still mean the canister may have
 * the credit. Releasing the one-shot id then lets the next RAF step mint again.
 */
export function shouldReleaseOneShotAfterCredit(
  result: DokaCreditPersistResult,
): boolean {
  if (result.canisterRejected) return true;
  return !result.applyRewardsInvoked;
}

/** Production shrine / ground / dungeon-complete settle after persist. */
export function settleOneShotAfterCredit(
  result: PersistDokaCreditResult,
): "commit" | "release" | "keep" {
  if ("ok" in result && Number.isFinite(result.ok) && result.ok > 0) {
    return "commit";
  }
  if (shouldReleaseOneShotDokaCredit(result)) return "release";
  return "keep";
}

export type OneShotCreditSettle =
  | { kind: "commit"; doka: number }
  | { kind: "release" }
  | { kind: "keep" };

/**
 * Transport-after-invoke used to `keep` the claim (no remint) but never
 * commit the persist lock. A later saveBattleStats heal then wrote the
 * pre-credit snapshot and wiped the canister grant.
 *
 * Confirm via live wallet without releasing the one-shot id. A live
 * balance that did not rise still `keep`s — retry would remint.
 *
 * Only confirm when the persist lock is already wallet-seeded. An unseeded
 * placeholder is 0; any live balance looks like a rise, so callers that
 * creditLiveDoka the pickup amount on commit would mint ghost HUD Doka.
 * Unseeded absolute writes already fetch live via
 * resolveCommittedDokaForAbsoluteWrite — confirm is unnecessary there.
 */
export async function confirmKeptOneShotCredit(
  committedDoka: number,
  readWallet: () => Promise<unknown>,
  walletSeeded = false,
): Promise<number | null> {
  // Fail-closed: unseeded / omitted must not treat live > 0 as a pickup.
  if (!walletSeeded) return null;
  try {
    const raw = await readWallet();
    if (raw == null) return null;
    const live = Number(raw);
    if (!Number.isFinite(live)) return null;
    const n = Math.max(0, Math.floor(live));
    const committed = Math.max(0, Math.floor(Number(committedDoka) || 0));
    if (n <= committed) return null;
    return n;
  } catch {
    return null;
  }
}

export async function resolveOneShotCreditSettle(
  result: PersistDokaCreditResult,
  opts: {
    committedDoka: number;
    readWallet: () => Promise<unknown>;
    /** When false, transport-keep stays keep (no false commit on placeholder 0). */
    walletSeeded?: boolean;
  },
): Promise<OneShotCreditSettle> {
  const settle = settleOneShotAfterCredit(result);
  if (settle === "commit") {
    return { kind: "commit", doka: persistDokaCreditAmount(result) };
  }
  if (settle === "release") return { kind: "release" };
  const confirmed = await confirmKeptOneShotCredit(
    opts.committedDoka,
    opts.readWallet,
    opts.walletSeeded === true,
  );
  if (confirmed != null) return { kind: "commit", doka: confirmed };
  return { kind: "keep" };
}

function classifyPersistDokaCreditError(
  error: unknown,
): "rejected" | "transport" {
  const msg = error instanceof Error ? error.message : String(error);
  return msg.includes("applyRewards failed") ? "rejected" : "transport";
}

export async function persistDokaCreditResult(
  actor: DokaCreditActor,
  slot: number,
  doka: number,
): Promise<PersistDokaCreditResult> {
  try {
    const result = await actor.applyRewards(
      BigInt(slot),
      BigInt(doka),
      BigInt(0),
    );
    return { ok: readApplyRewardsOk(result).newDoka };
  } catch (error) {
    console.error("persistDokaCredit failed", error);
    return { err: classifyPersistDokaCreditError(error) };
  }
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
 *
 * Prefer {@link persistDokaCreditResult} + {@link settleOneShotAfterCredit}
 * at one-shot call sites so a transport miss after invoke cannot remint.
 */
export async function persistDokaCredit(
  actor: DokaCreditActor,
  slot: number,
  doka: number,
): Promise<number> {
  return persistDokaCreditAmount(
    await persistDokaCreditResult(actor, slot, doka),
  );
}
