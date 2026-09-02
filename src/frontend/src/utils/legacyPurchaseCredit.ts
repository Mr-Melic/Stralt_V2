/**
 * World remount still calls processPendingPurchases, which is a no-op after
 * GameKey redeem became the paid-credit writer. Two getCallerDokaBalance
 * queries can disagree on IC.
 *
 * #296 keeps that jitter off the persist lock. WorldExploration still credits
 * dokaBalanceRef from the returned pair (`creditedDokaDelta(previous, credited)`),
 * so a later Doka-to-HP heal spent Doka the lock did not have and
 * saveBattleStats wrote the extra HP.
 *
 * Sanitize the pair unless processPendingPurchases actually minted. Lives in
 * this module so shopPurchase.ts only changes `creditPendingPurchases` (a
 * region #279 / #296 do not rewrite).
 */

export function legacyPurchaseMintedAmount(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.floor(n);
}

export function legacyPurchaseCreditForHud(
  minted: unknown,
  pair: { previous: number | null; credited: number | null },
): { previous: number | null; credited: number | null } {
  const gained =
    pair.credited == null || pair.previous == null
      ? 0
      : Math.max(0, pair.credited - pair.previous);
  if (legacyPurchaseMintedAmount(minted) <= 0 || gained <= 0) {
    return { previous: pair.previous, credited: pair.previous };
  }
  return pair;
}
