/**
 * Item shop host contract.
 *
 * BuffShop is a full-screen modal that returns null unless isOpen === true.
 * Hosting it from GameFlow with a local-only deduct (and a no-op onUseItem)
 * refunds the spend on the next getCallerDokaBalance refetch and makes
 * purchased items unusable. The modal must be hosted in WorldExploration so
 * buys persist through saveBattleStats and uses reach handleUseItem.
 */

export function isBuffShopOpen(isOpen: boolean | undefined): boolean {
  return isOpen === true;
}

/** HP potions are the only BuffShop items that count as challenge healing. */
export function isBuffShopHealItem(itemType: string): boolean {
  return itemType === "health_potion" || itemType === "greater_health_potion";
}

export function nextDokaAfterShopSpend(
  currentDoka: number,
  amount: number,
): number {
  return Math.max(0, currentDoka - amount);
}

/** Jackpot heal spends 1 Doka from the live wallet, not the render snapshot. */
export const JACKPOT_HEAL_DOKA_COST = 1;

export function nextDokaAfterJackpotHeal(liveDoka: number): number {
  return nextDokaAfterShopSpend(liveDoka, JACKPOT_HEAL_DOKA_COST);
}

/**
 * Overworld Doka heal must read the live ref, not the render snapshot.
 * A same-tick shop/heal debit leaves `dokaBalance` stale-high; a second
 * click then "heals" again for 0 spend after the first click emptied the
 * wallet, and persistAbsoluteProgress writes the extra HP for free.
 */
export function shouldStartDokaHeal(args: {
  currentHp: number;
  maxHp: number;
  liveDoka: number;
  inFlight?: boolean;
}): boolean {
  if (args.inFlight === true) return false;
  const hp = Math.max(0, Math.floor(Number(args.currentHp) || 0));
  const max = Math.max(0, Math.floor(Number(args.maxHp) || 0));
  const doka = Math.max(0, Math.floor(Number(args.liveDoka) || 0));
  return doka >= 1 && hp < max;
}

/** 1 Doka : 3 HP, floored by remaining missing HP and the live wallet. */
export function dokaHealAmounts(
  currentHp: number,
  maxHp: number,
  liveDoka: number,
): { hpToAdd: number; dokaCost: number } {
  const hp = Math.max(0, Math.floor(Number(currentHp) || 0));
  const max = Math.max(0, Math.floor(Number(maxHp) || 0));
  const doka = Math.max(0, Math.floor(Number(liveDoka) || 0));
  const hpNeeded = Math.max(0, max - hp);
  const hpToAdd = Math.min(hpNeeded, doka * 3);
  const dokaCost = hpToAdd > 0 ? Math.ceil(hpToAdd / 3) : 0;
  return { hpToAdd, dokaCost };
}

/**
 * Persist the HP the player just paid for.
 *
 * setCharacterStats writes characterStatsRef inside React's eager updater.
 * Reading `ref.hp + hpToAdd` after that call persists the heal twice, so a
 * reload hydrates more HP than the Doka spend bought.
 */
export function nextHpAfterDokaHeal(
  currentHp: number,
  maxHp: number,
  hpToAdd: number,
): number {
  const hp = Math.max(0, Math.floor(Number(currentHp) || 0));
  const max = Math.max(1, Math.floor(Number(maxHp) || 0));
  const add = Math.max(0, Math.floor(Number(hpToAdd) || 0));
  return Math.min(max, hp + add);
}

/**
 * WorldExploration passes getLiveDoka so a same-tick heal debit is visible
 * before React re-renders dokaBalance. Falling back to the render prop
 * re-opens the free-item window #107 closed.
 */
export function liveShopWallet(
  renderDoka: number,
  getLiveDoka?: () => number,
): number {
  const raw = getLiveDoka ? getLiveDoka() : renderDoka;
  return Math.max(0, Math.floor(Number(raw) || 0));
}

/** Buff shop must gate on the live wallet, not a stale-high render snapshot. */
export function shouldAllowShopSpend(
  liveDoka: number,
  amount: number,
): boolean {
  const doka = Math.max(0, Math.floor(Number(liveDoka) || 0));
  const cost = Math.max(0, Math.floor(Number(amount) || 0));
  return cost > 0 && doka >= cost;
}

function toNat(n: number): number {
  const value = Math.floor(Number(n));
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export type BuffItemPurchaseInput = {
  wallet: number;
  cost: number;
  owned: number;
  maxStack: number;
  inBattle: boolean;
};

export type BuffItemPurchase = {
  nextWallet: number;
  nextOwned: number;
};

/**
 * Atomically decide a BuffShop buy from the live wallet and owned count.
 * The render `dokaBalance` prop stays stale across double-clicks, so a
 * second Buy still passed the affordability check after the first debit
 * drained the ref. persistAbsoluteProgress then saw spend=0 (ref already 0)
 * while inventory still incremented — a free item that survives reload.
 */
export function tryPurchaseBuffItem(
  input: BuffItemPurchaseInput,
): BuffItemPurchase | null {
  if (input.inBattle) return null;
  const wallet = toNat(input.wallet);
  const cost = toNat(input.cost);
  const owned = toNat(input.owned);
  const maxStack = toNat(input.maxStack);
  if (cost < 1 || wallet < cost) return null;
  if (owned >= maxStack) return null;
  return {
    nextWallet: wallet - cost,
    nextOwned: owned + 1,
  };
}

/** Consume from inventoryRef so a double-click cannot spend one stack twice. */
export function tryConsumeBuffItem(owned: number): number | null {
  const count = toNat(owned);
  if (count <= 0) return null;
  return count - 1;
}

export type OverworldHealSpendInput = {
  currentHp: number;
  maxHp: number;
  liveDoka: number;
  jackpot: boolean;
};

export type OverworldHealSpend = {
  nextHp: number;
  nextDoka: number;
  hpGained: number;
  dokaCost: number;
  jackpot: boolean;
};

/**
 * Price a Doka→HP heal from the live wallet, not the button's render
 * snapshot. A double-click with 1 Doka used to heal twice: canAfford
 * stayed true, the second persist wrote spendFromUiBalance(0,0)=0, and
 * the extra HP survived the next saveBattleStats. Jackpot used the
 * stale `dokaBalance` closure and could skip the 1 Doka debit entirely.
 */
/**
 * A failed persist must not roll the UI back to this click's before-snapshot
 * if a later heal already moved HP/Doka. Double-click with leftover Doka
 * starts two persists; the first reject used to restore hpBefore/dokaBefore
 * and wipe the second click's optimistic (and possibly committed) write.
 */
export function shouldRollbackFailedHeal(args: {
  liveHp: number;
  liveDoka: number;
  expectedHp: number;
  expectedDoka: number;
}): boolean {
  const liveHp = Math.floor(Number(args.liveHp) || 0);
  const liveDoka = Math.floor(Number(args.liveDoka) || 0);
  const expectedHp = Math.floor(Number(args.expectedHp) || 0);
  const expectedDoka = Math.floor(Number(args.expectedDoka) || 0);
  return liveHp === expectedHp && liveDoka === expectedDoka;
}

export function resolveOverworldHealSpend(
  input: OverworldHealSpendInput,
): OverworldHealSpend | null {
  const liveDoka = toNat(input.liveDoka);
  const currentHp = toNat(input.currentHp);
  const maxHp = toNat(input.maxHp);
  if (liveDoka < 1) return null;
  if (maxHp <= currentHp) return null;
  if (input.jackpot) {
    return {
      nextHp: maxHp,
      nextDoka: liveDoka - 1,
      hpGained: maxHp - currentHp,
      dokaCost: 1,
      jackpot: true,
    };
  }
  const hpNeeded = maxHp - currentHp;
  const healHp = Math.min(hpNeeded, Math.floor(liveDoka * 3));
  const dokaCost = Math.ceil(healHp / 3);
  if (dokaCost < 1 || liveDoka < dokaCost) return null;
  return {
    nextHp: currentHp + healHp,
    nextDoka: liveDoka - dokaCost,
    hpGained: healHp,
    dokaCost,
    jackpot: false,
  };
}

export function canSpendLiveDoka(liveDoka: number, cost: number): boolean {
  const live = toNat(liveDoka);
  const need = toNat(cost);
  return need > 0 && live >= need;
}

/** Jackpot heal spends 1 Doka from the live wallet, not the render snapshot. */

export function canAffordJackpotHeal(
  liveDoka: number,
  liveHp: number,
  maxHp: number,
): boolean {
  return toNat(liveDoka) >= JACKPOT_HEAL_DOKA_COST && liveHp < maxHp;
}

export type PaidHealGrant = {
  healHp: number;
  cost: number;
  nextHp: number;
  nextDoka: number;
};

/**
 * Price a Doka-to-HP heal from the live wallet and live HP.
 *
 * The button used the render snapshot for `healHp` / `actualCost` and the
 * wrapped `setCharacterStats` already wrote the new HP into the ref. Persist
 * then added `healHp` again (`ref.hp + healHp`), so a partial heal wrote
 * more HP than was paid. A same-tick second click with a stale `canAfford`
 * granted another heal at spend 0.
 */

export function paidHealFromLiveWallet(
  liveDoka: number,
  liveHp: number,
  maxHp: number,
): PaidHealGrant | null {
  const doka = toNat(liveDoka);
  const hp = Math.max(0, Math.floor(Number(liveHp) || 0));
  const max = Math.max(0, Math.floor(Number(maxHp) || 0));
  const hpNeeded = max - hp;
  if (doka < 1 || hpNeeded <= 0) return null;
  const healHp = Math.min(hpNeeded, Math.floor(doka * 3));
  const cost = Math.ceil(healHp / 3);
  if (!canSpendLiveDoka(doka, cost)) return null;
  return {
    healHp,
    cost,
    nextHp: hp + healHp,
    nextDoka: doka - cost,
  };
}

export function syncLiveDokaFromProp(args: {
  propDoka: number;
  prevPropDoka: number;
  liveDoka: number;
}): { liveDoka: number; prevPropDoka: number } {
  const prop = Math.max(0, Math.floor(Number(args.propDoka) || 0));
  const prev = Math.max(0, Math.floor(Number(args.prevPropDoka) || 0));
  const live = Math.max(0, Math.floor(Number(args.liveDoka) || 0));
  if (prev !== prop) {
    if (live === prev) {
      return { liveDoka: prop, prevPropDoka: prop };
    }
    return { liveDoka: live, prevPropDoka: prop };
  }
  return { liveDoka: live, prevPropDoka: prev };
}

export function shouldGrantBuffPurchase(
  liveDoka: number,
  cost: number,
  currentStack: number,
  maxStack: number,
  inBattle: boolean,
): boolean {
  if (inBattle) return false;
  if (cost <= 0) return false;
  if (currentStack >= maxStack) return false;
  return liveDoka >= cost;
}

/** Live wallet + missing HP, not the stale render snapshot. */

export function shouldGrantDokaHeal(
  liveDoka: number,
  currentHp: number,
  maxHp: number,
): boolean {
  return liveDoka >= 1 && currentHp < maxHp;
}

/** saveBattleStats must not run a 0-spend snapshot (second click / stale prop). */

export function shouldWriteAbsoluteSpend(spend: number): boolean {
  return Math.max(0, Math.floor(Number(spend) || 0)) > 0;
}

/**
 * BuffShop must debit WorldExploration's live wallet, not the render
 * `dokaBalance` / a useEffect-synced copy. A heal updates the host ref
 * and calls setCharacterStats; BuffShop can still be showing the
 * pre-heal prop until GameFlow commits.
 */
export function liveDokaForShopSpend(
  getLiveDoka: (() => number) | undefined,
  fallback: number,
): number {
  if (typeof getLiveDoka === "function") {
    return Math.max(0, Math.floor(Number(getLiveDoka()) || 0));
  }
  return Math.max(0, Math.floor(Number(fallback) || 0));
}

/**
 * saveBattleStats HP must be the live ref at write time, not the
 * click-time snapshot. A lava/spike tick after a paid heal used to
 * persist the pre-hazard HP; a reload then resurrected the damage.
 *
 * The heal path writes characterStatsRef synchronously before enqueue
 * so `liveHp` already includes the paid heal when no later damage
 * landed. `fallbackHp` is the click snapshot used only when the eager
 * ref has not caught up yet (updater still queued).
 */
export function resolveAbsoluteWriteHp(
  liveHp: number,
  fallbackHp: number,
): number {
  const live = Math.max(0, Math.floor(Number(liveHp) || 0));
  const fallback = Math.max(0, Math.floor(Number(fallbackHp) || 0));
  return Math.min(live, fallback);
}

/** Apply a paid heal to the live stats ref before React commits setState. */
export function applyHealHpToLiveStats<T extends { hp: number }>(
  stats: { current: T },
  nextHp: number,
): T {
  const hp = Math.max(0, Math.floor(Number(nextHp) || 0));
  const next = { ...stats.current, hp };
  stats.current = next;
  return next;
}

/**
 * Credits, spends, and death cuts must write the live ref in the same
 * tick as onDokaBalanceChange. GameFlow's setState is deferred; a later
 * heal/shop/rename still reads dokaBalanceRef.
 */
export function writeLiveDoka(live: { current: number }, next: number): number {
  const value = Math.max(0, Math.floor(Number(next) || 0));
  live.current = value;
  return value;
}

/** Add a persist-lock credit onto the live wallet, not a click-time snapshot. */
export function creditLiveDoka(
  live: { current: number },
  gained: number,
): number {
  const add = Math.max(0, Math.floor(Number(gained) || 0));
  return writeLiveDoka(live, live.current + add);
}

/**
 * A failed shop persist must not add `amount` back if a later buy/heal
 * already moved the live wallet. Double-buy: first reject after the second
 * commit used to restore +50 onto 0 and mint a ghost 50 for the next heal.
 */
export function shouldRollbackFailedShopSpend(args: {
  liveDoka: number;
  expectedDoka: number;
}): boolean {
  const live = Math.max(0, Math.floor(Number(args.liveDoka) || 0));
  const expected = Math.max(0, Math.floor(Number(args.expectedDoka) || 0));
  return live === expected;
}
