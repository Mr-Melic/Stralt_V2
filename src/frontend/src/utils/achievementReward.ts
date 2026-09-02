/**
 * Achievement claim is a backend Doka delta. saveBattleStats writes an
 * absolute wallet from the persist lock's committed snapshot. If the claim
 * runs outside that lock, a recap heal/death reconstructs from the pre-claim
 * balance and wipes the reward.
 */

export type AchievementCreditPersistLock = {
  enqueue<T>(fn: () => Promise<T>): Promise<T>;
  commit(next: { doka?: number }): void;
  snapshot(): { doka: number };
  isWalletSeeded(): boolean;
  /**
   * `#ok` on an unseeded placeholder must not seed at grant-only, but idle
   * hydrate must not copy the pre-claim query either.
   */
  noteUnseededCredit?: () => void;
};

/**
 * claimAchievementReward is a backend delta. Adding it onto an unseeded
 * placeholder 0 marks the lock seeded at `grant` only; the next death/heal
 * saveBattleStats then writes that under-count and wipes the canister.
 * Leave the lock unseeded so resolveCommittedDokaForAbsoluteWrite fetches.
 */
export function shouldCommitAchievementCredit(walletSeeded: boolean): boolean {
  return walletSeeded;
}

export type AchievementCreditActor = {
  claimAchievementReward: (achievementId: string) => Promise<unknown>;
};

export function readClaimAchievementReward(
  result: unknown,
): { ok: number } | { err: string } {
  if (result == null || typeof result !== "object") {
    return { err: "claimAchievementReward returned an empty result" };
  }
  const r = result as Record<string, unknown>;
  if (
    r.__kind__ === "err" ||
    (r.err != null && r.ok == null && r._ok == null)
  ) {
    return { err: String(r.err ?? r._err ?? "claimAchievementReward failed") };
  }
  const ok = r.ok ?? r._ok;
  const granted = Number(ok);
  if (!Number.isFinite(granted) || granted < 0) {
    return { err: "claimAchievementReward missing granted amount" };
  }
  return { ok: granted };
}

export function committedDokaAfterAchievementCredit(
  committedDoka: number,
  granted: number,
): number {
  const base = Math.max(0, Math.floor(Number(committedDoka) || 0));
  const add = Math.max(0, Math.floor(Number(granted) || 0));
  return base + add;
}

/**
 * GameFlow hydrates the session wallet from ['callerDokaBalance']. After a
 * persist-lock claim the live UI already has the grant as a delta. Invalidating
 * that key refetches an absolute backend balance and overwrites a recap heal
 * that deducted while the claim was on the lock; hydrateWhenIdle then copies
 * the refund into committed so the next saveBattleStats restores the spend.
 */
export function shouldInvalidateCallerDokaAfterClaim(
  claimedThroughPersistLock: boolean,
): boolean {
  return !claimedThroughPersistLock;
}

/** Double-click must not enqueue a second claim of the same feat. */
export function shouldBeginAchievementClaim(
  inFlightIds: ReadonlySet<string>,
  achievementId: string,
): boolean {
  return Boolean(achievementId) && !inFlightIds.has(achievementId);
}

/** Mark a feat in-flight. Callers must delete the id in `finally`. */
export function beginAchievementClaim(
  inFlightIds: Set<string>,
  achievementId: string,
): boolean {
  if (!shouldBeginAchievementClaim(inFlightIds, achievementId)) return false;
  inFlightIds.add(achievementId);
  return true;
}

/**
 * The second click of a double-claim hits "Reward already claimed" after
 * the first write succeeded. Rolling that back flips claimed=false and
 * hides the grant the canister already paid.
 */
export function isAlreadyClaimedRewardError(err: string): boolean {
  return String(err).toLowerCase().includes("already claimed");
}

export function shouldRollbackClaimFailure(
  err: string,
  alreadyAppliedOk: boolean,
): boolean {
  if (alreadyAppliedOk) return false;
  if (isAlreadyClaimedRewardError(err)) return false;
  return true;
}

/** Claim on the same persist lock as applyRewards / saveBattleStats. */
export async function creditAchievementRewardThroughPersist(
  actor: AchievementCreditActor,
  persist: AchievementCreditPersistLock,
  achievementId: string,
): Promise<{ ok: number } | { err: string }> {
  return persist.enqueue(async () => {
    const parsed = readClaimAchievementReward(
      await actor.claimAchievementReward(achievementId),
    );
    if (
      "ok" in parsed &&
      shouldCommitAchievementCredit(persist.isWalletSeeded())
    ) {
      persist.commit({
        doka: committedDokaAfterAchievementCredit(
          persist.snapshot().doka,
          parsed.ok,
        ),
      });
    } else if ("ok" in parsed && parsed.ok > 0) {
      persist.noteUnseededCredit?.();
    }
    return parsed;
  });
}
