/**
 * Shop checkout helpers. The canister initiatePurchase endpoint takes nine
 * positional Text arguments — passing a customer-data object is rejected by
 * Candid and the purchase record is never created.
 */

import { legacyPurchaseCreditForHud } from "./legacyPurchaseCredit.ts";

export type ShopCustomerFields = {
  firstName?: string;
  lastName?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
};

export type InitiatePurchaseArgs = [
  packageId: string,
  customerName: string,
  customerSurname: string,
  customerEmail: string,
  customerAddress: string,
  customerCity: string,
  customerCountry: string,
  customerPostal: string,
  proofFileUrl: string,
];

function field(value: string | undefined): string {
  return (value ?? "").trim();
}

/** Map the shop form + proof payload onto the canister's positional args. */
export function buildInitiatePurchaseArgs(
  packageId: string,
  customer: ShopCustomerFields,
  proofFileUrl: string,
): InitiatePurchaseArgs {
  return [
    packageId,
    field(customer.firstName),
    field(customer.lastName),
    field(customer.email),
    field(customer.address),
    field(customer.city),
    field(customer.country),
    field(customer.postalCode),
    proofFileUrl,
  ];
}

export function readInitiatePurchaseResult(
  result: unknown,
): { ok: string } | { err: string } {
  if (result == null || typeof result !== "object") {
    return { err: "initiatePurchase returned an empty result" };
  }
  const r = result as Record<string, unknown>;
  if (
    r.__kind__ === "err" ||
    (r.err != null && r.ok == null && r._ok == null)
  ) {
    return { err: String(r.err ?? r._err ?? "initiatePurchase failed") };
  }
  const ok = r.ok ?? r._ok;
  if (typeof ok !== "string" || ok.length === 0) {
    return { err: "initiatePurchase missing purchase id" };
  }
  return { ok };
}

export function readCallerDokaBalance(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** Backend auto-completes purchases older than 60s. Match that delay. */
export const PENDING_PURCHASE_CREDIT_DELAY_MS = 60_000;

export type PurchaseCreditActor = {
  processPendingPurchases?: () => Promise<unknown>;
  getCallerDokaBalance?: () => Promise<unknown>;
};

/**
 * Battle cleanup clears `pendingTimeoutsRef` on every portal, death, and
 * victory. Shop credit timers must live in a separate set or paid Doka
 * never reaches processPendingPurchases.
 */
export function shopCreditUsesBattleTimeoutSet(): boolean {
  return false;
}

/**
 * Confirm Purchase awaits FileReader then initiatePurchase. A second click
 * before the first #ok creates two pending records; both 60s timers then
 * credit the package twice through processPendingPurchases.
 */
export function shouldStartShopPurchase(inFlight: boolean): boolean {
  return inFlight !== true;
}

export function creditedDokaDelta(
  previous: number | null,
  credited: number | null,
): number {
  if (credited == null || previous == null) return 0;
  return Math.max(0, credited - previous);
}

/**
 * processPendingPurchases is a credit. The 60s remount retry and a no-op
 * complete both still read getCallerDokaBalance and used to commit that
 * absolute snapshot. A stale pre-heal query then refunds the spend on the
 * persist lock; the next saveBattleStats writes it on-chain.
 *
 * Only commit when this pair observed a gain, and never cut a higher
 * lock snapshot (applyRewards may have committed since the query).
 */
export function shouldCommitShopCredit(gained: number): boolean {
  return gained > 0;
}

/** processPendingPurchases returns the credited Nat. A 0 means no-op. */
export function readProcessPendingPurchasesMinted(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.floor(n);
}

/**
 * World remount still calls processPendingPurchases, which is now a no-op
 * (GameKey redeem is the paid-credit writer). Two getCallerDokaBalance
 * queries can disagree on IC; treating that jitter as a shop gain restored
 * a pre-heal wallet on the persist lock and the next saveBattleStats
 * refunded the spend.
 */
export function shouldCommitLegacyPurchaseCredit(
  minted: number,
  gained: number,
): boolean {
  return (
    readProcessPendingPurchasesMinted(minted) > 0 &&
    shouldCommitShopCredit(gained)
  );
}

export function committedDokaAfterShopCreditOnLock(
  committedDoka: number,
  credited: number,
): number {
  return Math.max(
    Math.max(0, Math.floor(Number(committedDoka) || 0)),
    Math.max(0, Math.floor(Number(credited) || 0)),
  );
}

/** Complete aged pending purchases and return the wallet before/after. */
export async function creditPendingPurchases(
  actor: PurchaseCreditActor,
): Promise<{ previous: number | null; credited: number | null }> {
  if (!actor.getCallerDokaBalance || !actor.processPendingPurchases) {
    return { previous: null, credited: null };
  }
  const previous = readCallerDokaBalance(await actor.getCallerDokaBalance());
  const minted = await actor.processPendingPurchases();
  const credited = readCallerDokaBalance(await actor.getCallerDokaBalance());
  return legacyPurchaseCreditForHud(minted, { previous, credited });
}

/**
 * saveBattleStats writes an absolute Doka snapshot. Shop credits must join the
 * same persist lock as applyRewards / heals / death, or a later absolute write
 * persists the pre-purchase wallet and wipes paid Doka.
 */
export type ShopCreditPersistLock = {
  enqueue<T>(fn: () => Promise<T>): Promise<T>;
  commit(next: { doka?: number }): void;
  snapshot(): { doka: number };
  isWalletSeeded(): boolean;
  /**
   * `#ok` on an unseeded placeholder must not seed at grant-only, but idle
   * hydrate must not copy the pre-credit query either.
   */
  noteUnseededCredit?: () => void;
};

export async function creditPendingPurchasesThroughPersist(
  actor: PurchaseCreditActor,
  persist: ShopCreditPersistLock,
): Promise<{ previous: number | null; credited: number | null }> {
  return persist.enqueue(async () => {
    let minted = 0;
    const actorWithMinted: PurchaseCreditActor = {
      getCallerDokaBalance: actor.getCallerDokaBalance,
      processPendingPurchases: actor.processPendingPurchases
        ? async () => {
            const raw = await actor.processPendingPurchases?.();
            minted = readProcessPendingPurchasesMinted(raw);
            return raw;
          }
        : undefined,
    };
    const result = await creditPendingPurchases(actorWithMinted);
    const gained = creditedDokaDelta(result.previous, result.credited);
    if (
      result.credited != null &&
      shouldCommitLegacyPurchaseCredit(minted, gained)
    ) {
      persist.commit({
        doka: committedDokaAfterShopCreditOnLock(
          persist.snapshot().doka,
          result.credited,
        ),
      });
    }
    return result;
  });
}

export type GameKeyRedeemActor = {
  redeemGameKey?: (code: string) => Promise<unknown>;
};

export function readRedeemGameKeyResult(
  result: unknown,
): { ok: number } | { err: string } {
  if (result == null || typeof result !== "object") {
    return { err: "redeemGameKey returned an empty result" };
  }
  const r = result as Record<string, unknown>;
  if (
    r.__kind__ === "err" ||
    (r.err != null && r.ok == null && r._ok == null)
  ) {
    return { err: String(r.err ?? r._err ?? "redeemGameKey failed") };
  }
  const ok = r.ok ?? r._ok;
  const n = Number(ok);
  if (!Number.isFinite(n) || n < 0) {
    return { err: "redeemGameKey missing Doka amount" };
  }
  return { ok: n };
}

/**
 * redeemGameKey returns the granted delta (`#ok(dokaAmount)`), not the new
 * wallet. Committing a follow-up getCallerDokaBalance used to skip the credit
 * when that query was stale or threw after the key was already consumed.
 *
 * Chronology (stale query + recap heal):
 * 1. Player redeems. Canister adds 1000; `#ok(1000)`.
 * 2. getCallerDokaBalance still returns the pre-redeem wallet (replica lag)
 *    or throws. creditedDokaDelta is 0, so the persist lock never commits.
 * 3. Shop toasts "still pending" and does not credit the live UI.
 * 4. Retry → "GameKey already used".
 * 5. Recap heal saveBattleStats writes the pre-redeem snapshot and wipes
 *    the paid Doka. Incoming-above-stored is ignored, so the mint is gone.
 *
 * Match claimAchievementReward: add `#ok` onto a seeded lock. Leave an
 * unseeded placeholder alone so resolveCommittedDokaForAbsoluteWrite fetches.
 */
export function committedDokaAfterGameKeyRedeem(
  committedDoka: number,
  granted: number,
): number {
  const base = Math.max(0, Math.floor(Number(committedDoka) || 0));
  const add = Math.max(0, Math.floor(Number(granted) || 0));
  return base + add;
}

export function shouldCommitGameKeyRedeem(
  walletSeeded: boolean,
  granted: number,
): boolean {
  return walletSeeded && Math.max(0, Math.floor(Number(granted) || 0)) > 0;
}

/** HUD / live-ref credit. Prefer `#ok`, never a stale wallet-query delta. */
export function dokaGainedFromGameKeyRedeem(
  result: { ok: number } | { err: string },
): number {
  if (!("ok" in result)) return 0;
  return Math.max(0, Math.floor(Number(result.ok) || 0));
}

/**
 * redeemGameKey is a credit. Enqueue on the persist lock and commit the
 * granted delta from `#ok` — do not require a second wallet query.
 */
export async function redeemGameKeyThroughPersist(
  actor: GameKeyRedeemActor,
  persist: ShopCreditPersistLock,
  code: string,
): Promise<{
  previous: number | null;
  credited: number | null;
  result: { ok: number } | { err: string };
}> {
  return persist.enqueue(async () => {
    if (!actor.redeemGameKey) {
      return {
        previous: null,
        credited: null,
        result: { err: "Actor not available" },
      };
    }
    const before = persist.snapshot().doka;
    const parsed = readRedeemGameKeyResult(await actor.redeemGameKey(code));
    const gained = dokaGainedFromGameKeyRedeem(parsed);
    if (shouldCommitGameKeyRedeem(persist.isWalletSeeded(), gained)) {
      persist.commit({
        doka: committedDokaAfterGameKeyRedeem(persist.snapshot().doka, gained),
      });
    } else if (gained > 0) {
      // Canister already added. Leave the placeholder unseeded so an
      // absolute write fetches, but block idle hydrate from copying the
      // in-flight pre-redeem query (that used to seed and wipe the grant).
      persist.noteUnseededCredit?.();
    }
    const after = persist.snapshot().doka;
    return {
      previous: persist.isWalletSeeded() ? before : null,
      credited: persist.isWalletSeeded() && gained > 0 ? after : null,
      result: parsed,
    };
  });
}
