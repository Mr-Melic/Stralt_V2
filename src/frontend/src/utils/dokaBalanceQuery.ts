/**
 * Normalize getCallerDokaBalance payloads. A missing value is a real 0
 * (new principal). Non-numeric payloads throw so React Query keeps the last
 * successful balance instead of treating the failure as "wallet is empty".
 */
export function normalizeCallerDokaBalance(raw: unknown): number {
  if (raw === null || raw === undefined) return 0;
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    throw new Error("getCallerDokaBalance returned a non-numeric value");
  }
  return n;
}

/**
 * GameFlow hydrates the session wallet from getCallerDokaBalance. After
 * WorldExploration owns that cache, a refetch (claim invalidate, window
 * focus) can restore a pre-spend snapshot. hydrateWhenIdle then copies
 * the refund into committed.doka and the next persist writes it back.
 *
 * Apply the query only before the world session is hydrated — or whenever
 * the world is not mounted (character select still needs rename spends).
 */
export function shouldApplyCallerDokaHydrate(args: {
  backendDoka: number | undefined;
  inWorld: boolean;
  alreadyHydratedInWorld: boolean;
}): boolean {
  if (args.backendDoka === undefined) return false;
  if (args.inWorld && args.alreadyHydratedInWorld) return false;
  return true;
}

/**
 * WorldExploration's idle hydrate treats walletReady as "the session cache
 * is the canister wallet, including a real 0".
 *
 * `queryResolved` alone is one render too early: GameFlow still holds the
 * placeholder 0 until the hydrate effect calls setDokaBalance. Passing that
 * pair lets hydrateWhenIdle overwrite a shop-credit seed with 0. A stale
 * positive query (pre-credit snapshot) is the same class — the persist
 * lock must refuse any idle cut of a seeded wallet.
 */
export function shouldMarkCallerDokaWalletReady(args: {
  queryResolved: boolean;
  sessionCacheApplied: boolean;
}): boolean {
  return args.queryResolved && args.sessionCacheApplied;
}

/**
 * WorldExploration used to assign `dokaBalanceRef.current = dokaBalance`
 * on every render. A child-only `setCharacterStats` then restored the
 * stale-high GameFlow prop after a heal/shop had already debited the ref.
 *
 * Chronology:
 * 1. Click heal: ref=90, onDokaBalanceChange(90), setCharacterStats(hp).
 * 2. WorldExploration re-renders from the HP update before GameFlow
 *    commits. Prop is still 100.
 * 3. `ref.current = prop` writes 100 back.
 * 4. Shop buy / second heal spends from 100. persistAbsoluteProgress
 *    captures a second spend (or spend=0 after the wallet is already 0).
 * 5. hydrateWhenIdle sees incoming 100 >= committed 90 and refunds the
 *    first spend onto the lock. The next saveBattleStats writes it.
 *
 * Copy the prop only when GameFlow actually changed it.
 */
export function syncLiveDokaFromProp(
  lastSeenProp: { current: number },
  live: { current: number },
  prop: number,
): void {
  const next = Math.max(0, Math.floor(Number(prop) || 0));
  if (lastSeenProp.current === next) return;
  lastSeenProp.current = next;
  live.current = next;
}
