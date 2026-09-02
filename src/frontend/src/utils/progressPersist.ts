/**
 * Serializes wallet/XP persist writes and tracks the last backend-committed
 * progress so absolute saveBattleStats calls cannot clobber an in-flight
 * applyRewards delta.
 *
 * applyRewards adds a delta. saveBattleStats (heals, shop spends, death
 * penalty) writes an absolute Doka/XP snapshot captured from local UI state.
 * After a victory the recap is shown immediately and heal/shop become usable
 * while applyRewards is still in flight — a click-time snapshot then overwrites
 * the just-credited wallet.
 *
 * Paid-Doka processPendingPurchases and claimAchievementReward are the same
 * class of backend delta: they must enqueue on this lock and commit the
 * post-credit balance, or a recap heal reconstructs from the pre-credit
 * snapshot and wipes the grant.
 */

export type CommittedProgress = {
  doka: number;
  xp: number;
  level: number;
};

function toNat(n: number | undefined, fallback: number): number {
  const value = Math.floor(Number(n));
  return Number.isFinite(value) ? value : fallback;
}

function readWalletNumber(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function spendFromUiBalance(uiDoka: number, nextDoka: number): number {
  return Math.max(0, toNat(uiDoka, 0) - toNat(nextDoka, 0));
}

export function applySpendToCommitted(
  committedDoka: number,
  spend: number,
): number {
  return Math.max(0, toNat(committedDoka, 0) - Math.max(0, toNat(spend, 0)));
}

/**
 * saveBattleStats writes an absolute snapshot. Credits belong on
 * applyRewards / claim / shop-complete / upgrade. An absolute write must
 * never raise the canister wallet, XP, or level — that is how a stale
 * optimistic UI (failed applyRewards, ghost HUD) minted permanent progress.
 */
export function clampAbsoluteProgressWrite(
  proposed: number,
  current: number,
): number {
  const next = Math.max(0, toNat(proposed, 0));
  const live = Math.max(0, toNat(current, 0));
  return next > live ? live : next;
}

/**
 * processPendingPurchases writes an absolute wallet. Commit that balance so a
 * later saveBattleStats spend cannot reconstruct from a pre-credit snapshot.
 */
export function shouldPersistAbsoluteDokaSpend(spend: number): boolean {
  return Math.max(0, toNat(spend, 0)) > 0;
}

/** Never mint Doka through saveBattleStats. */

/** Alias: never-raise clamp for Doka absolute writes (same as clampAbsoluteProgressWrite). */
export function clampAbsoluteDokaWrite(
  committedDoka: number,
  requestedDoka: number,
): number {
  return clampAbsoluteProgressWrite(requestedDoka, committedDoka);
}

/** Alias: never-raise clamp for XP absolute writes (same as clampAbsoluteProgressWrite). */
export function clampAbsoluteXpWrite(
  committedXp: number,
  requestedXp: number,
): number {
  return clampAbsoluteProgressWrite(requestedXp, committedXp);
}

export function committedDokaAfterShopCredit(
  credited: number | null,
): number | null {
  if (credited == null) return null;
  return Math.max(0, toNat(credited, 0));
}

/**
 * Add the credited delta onto the live UI wallet. Replacing with the absolute
 * backend read would overwrite a heal/shop spend the player already applied
 * locally while this credit was waiting on the persist queue.
 */
export function applyShopCreditDeltaToUi(
  uiDoka: number,
  gained: number,
): number {
  return Math.max(0, toNat(uiDoka, 0) + Math.max(0, toNat(gained, 0)));
}

/**
 * Idle hydrate copies UI onto committed. applyRewards can bump
 * committed.level while shouldApplyVictoryLiveHydrate skips the live UI
 * update (lava/spike death mid-persist). Copying the stale UI level then
 * lets the next saveBattleStats downgrade the canister. Never write a
 * lower level than the lock already committed.
 */
export function floorHydratedLevel(
  committedLevel: number,
  uiLevel: number,
): number {
  return Math.max(1, toNat(committedLevel, 1), toNat(uiLevel, 1));
}

/**
 * Level-up resets leftover XP onto a new threshold. applyRewards can commit
 * `{ xp: 30, level: 5 }` while lava death skips the live UI hydrate, so the
 * hydrate effect still sees the old-level leftover (e.g. 80). Copying that
 * leftover over the post-level snapshot lets the next saveBattleStats refund
 * the death XP penalty.
 */
export function resolveHydratedXp(
  committedXp: number,
  committedLevel: number,
  uiXp: number,
  uiLevel: number,
): number {
  const committedLvl = Math.max(1, toNat(committedLevel, 1));
  const incomingLvl = Math.max(1, toNat(uiLevel, 1));
  if (committedLvl > incomingLvl) {
    return Math.max(0, toNat(committedXp, 0));
  }
  if (incomingLvl > committedLvl) {
    return Math.max(0, toNat(uiXp, 0));
  }
  // Same level: the lock is authoritative. Copying a higher ghost HUD
  // minted unpaid portal XP; copying a lower stale HUD refunded a
  // just-committed applyRewards leftover.
  return Math.max(0, toNat(committedXp, 0));
}

export type HydrateWhenIdleOptions = {
  /**
   * True once the session cache has been set from getCallerDokaBalance
   * (including a real 0). The query resolving is not enough: GameFlow's
   * dokaBalance state stays 0 for one render, and copying that placeholder
   * over a shop-credit seed lets a lava-death saveBattleStats write 0.
   */
  walletReady?: boolean;
};

/**
 * Idle hydrate must not treat GameFlow's pre-query 0 as the canister wallet.
 *
 * `walletReady` is only safe after setDokaBalance(query) — not merely when
 * the React Query data exists. A positive UI value can also be a feat-claim
 * or rename delta stacked on the placeholder; that must not seed.
 *
 * Once the lock is seeded, idle UI must not change the committed wallet.
 * A ghost HUD (failed applyRewards still credited locally, or a stale
 * high query) used to copy incoming >= committed and let the next
 * saveBattleStats mint. Credits and spends already commit on the lock.
 */
export function shouldCopyIdleWalletDoka(args: {
  walletSeeded: boolean;
  walletReady?: boolean;
  incomingDoka: number;
  committedDoka: number;
}): boolean {
  if (args.walletSeeded) return false;
  return args.walletReady === true;
}

export function createProgressPersist(initial?: Partial<CommittedProgress>) {
  let committed: CommittedProgress = {
    doka: Math.max(0, toNat(initial?.doka, 0)),
    xp: Math.max(0, toNat(initial?.xp, 0)),
    level: Math.max(1, toNat(initial?.level, 1)),
  };
  // A positive constructor seed came from GameFlow after the query landed.
  // 0 is ambiguous (new wallet vs query still in flight).
  let walletSeeded = initial?.doka != null && toNat(initial.doka, 0) > 0;
  let pending = 0;
  let chain: Promise<void> = Promise.resolve();

  const persist = {
    snapshot(): CommittedProgress {
      return { ...committed };
    },
    pendingCount(): number {
      return pending;
    },
    isWalletSeeded(): boolean {
      return walletSeeded;
    },
    seedWallet(doka: number) {
      persist.commit({ doka: Math.max(0, toNat(doka, 0)) });
    },
    commit(next: Partial<CommittedProgress>) {
      committed = {
        doka:
          next.doka != null
            ? Math.max(0, toNat(next.doka, committed.doka))
            : committed.doka,
        xp:
          next.xp != null
            ? Math.max(0, toNat(next.xp, committed.xp))
            : committed.xp,
        level:
          next.level != null
            ? Math.max(1, toNat(next.level, committed.level))
            : committed.level,
      };
      if (next.doka != null) walletSeeded = true;
    },
    hydrateWhenIdle(
      next: CommittedProgress,
      options?: HydrateWhenIdleOptions,
    ): boolean {
      if (pending > 0) return false;
      const copyDoka = shouldCopyIdleWalletDoka({
        walletSeeded,
        walletReady: options?.walletReady,
        incomingDoka: next.doka,
        committedDoka: committed.doka,
      });
      persist.commit({
        doka: copyDoka ? next.doka : undefined,
        xp: resolveHydratedXp(
          committed.xp,
          committed.level,
          next.xp,
          next.level,
        ),
        level: floorHydratedLevel(committed.level, next.level),
      });
      return true;
    },
    enqueue<T>(fn: () => Promise<T>): Promise<T> {
      pending += 1;
      const run = chain.then(fn, fn);
      chain = run.then(
        () => {
          pending -= 1;
        },
        () => {
          pending -= 1;
        },
      );
      return run;
    },
  };

  return persist;
}

export type ProgressPersist = ReturnType<typeof createProgressPersist>;

/**
 * saveBattleStats writes an absolute wallet. The persist lock starts at 0
 * whenever WorldExploration mounts before getCallerDokaBalance resolves.
 * hydrateWhenIdle then copies that placeholder. A lava/combat death on the
 * first map penalizes committed.doka=0 and persists 0 — wiping the canister.
 *
 * Fetch the live wallet when the lock was never seeded from an authoritative
 * read/credit. Return null if the read fails so the caller can skip the
 * absolute write instead of persisting the placeholder.
 */
export async function resolveCommittedDokaForAbsoluteWrite(
  persist: Pick<ProgressPersist, "isWalletSeeded" | "seedWallet" | "snapshot">,
  readWallet: () => Promise<unknown>,
): Promise<number | null> {
  if (persist.isWalletSeeded()) {
    return persist.snapshot().doka;
  }
  try {
    const live = readWalletNumber(await readWallet());
    if (live == null) return null;
    persist.seedWallet(live);
    return live;
  } catch {
    return null;
  }
}
