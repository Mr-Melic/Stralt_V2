/**
 * Pure turn-queue maintenance helpers.
 *
 * Centralizes the "a combatant left the queue" bookkeeping that previously
 * leaked out of sync between `setTurnOrder` (React state) and the parallel
 * refs (`turnOrderRef`, `currentTurnIndexRef`) that the turn-advance logic
 * at WorldExploration.tsx line 10436-10448 reads synchronously.
 *
 * The advance rule (WX line 10447) is:
 *   nextIdx = (prevIdx + 1) % prevOrder.length
 * so `currentTurnIndexRef.current` points at the combatant whose turn it
 * currently IS. When a combatant is removed:
 *   - removed index < current  -> shift current down by 1 (same combatant stays active)
 *   - removed index == current -> the removed combatant WAS the active turn.
 *     Do NOT advance implicitly: point currentIdx at the entry that PRECEDED
 *     the dead slot in the new (shorter) array, so the normal advanceTurn
 *     `(prevIdx + 1) % length` handoff lands on the combatant that shifted
 *     into the dead slot (the next entry in the original order). This keeps
 *     the wheel from shifting forward on its own; only advanceTurn moves it.
 *   - removed index >  current  -> no adjustment needed.
 *
 * This module is React-free and DOM-free at runtime. It imports only the
 * CombatantEntry TYPE (erased at compile time), matching the engine's
 * React-free runtime convention.
 */

import type { CombatantEntry } from "../components/InitiativeStrip";

/** Mutable-ref shape for the turn-order array. */
export type TurnOrderRef = { current: CombatantEntry[] };

/** Mutable-ref shape for the active-turn index. */
export type CurrentTurnIndexRef = { current: number };

/** React state setter for the turn-order array. */
export type SetTurnOrder = (
  updater: (prev: CombatantEntry[]) => CombatantEntry[],
) => void;

/**
 * Remove a combatant from the turn queue and keep all parallel state in sync.
 *
 * Filters `deadId` out of the turn-order array, syncs `turnOrderRef.current`
 * to the new array, adjusts `currentTurnIndexRef.current` based on where the
 * removed entry sat relative to the active turn, and calls `setTurnOrder`
 * with the new array.
 *
 * Index adjustment rules (applied after filtering out the dead entry):
 *   - removedIdx <  currentIdx -> decrement currentIdx by 1 (the same
 *     combatant stays active; everything after the gap shifts down).
 *   - removedIdx === currentIdx -> the removed combatant WAS the active
 *     turn (e.g. a summon expiring during its own turn). Do NOT advance
 *     implicitly: set currentIdx to the entry that PRECEDED the dead slot
 *     in the new array — `(removedIdx - 1 + newOrder.length) %
 *     newOrder.length` — so the normal advanceTurn `(prevIdx + 1) % length`
 *     handoff lands on the combatant that shifted into the dead slot (the
 *     next entry in the original order). The wheel does not move forward
 *     here; only advanceTurn advances it.
 *   - removedIdx >  currentIdx -> leave currentIdx unchanged (the active
 *     combatant is unaffected; only later entries moved).
 *
 * Edge cases: when `newOrder` is empty the index is forced to 0. When the
 * preserved position would land past the end of the shorter array it is
 * wrapped with modulo so it stays in range.
 *
 * Pure with respect to external state: it only mutates the two refs it is
 * handed and invokes the one setter it is handed. No other side effects.
 */
export function removeCombatantFromTurnQueue(
  turnOrder: CombatantEntry[],
  turnOrderRef: TurnOrderRef,
  currentTurnIndexRef: CurrentTurnIndexRef,
  deadId: string,
  setTurnOrder: SetTurnOrder,
): void {
  const removedIdx = turnOrder.findIndex((c) => c.id === deadId);
  if (removedIdx === -1) {
    // Not in the queue — nothing to do. Still sync the ref in case the caller
    // passed a stale array; this is a no-op when they match.
    turnOrderRef.current = turnOrder;
    return;
  }

  const newOrder = turnOrder.filter((c) => c.id !== deadId);

  // Adjust the active-turn index based on the removed entry's position
  // relative to the current turn. See the doc comment above for the three
  // cases; the `===` branch is the expiry-during-own-turn fix.
  let newIdx: number;
  if (newOrder.length === 0) {
    newIdx = 0;
  } else if (removedIdx < currentTurnIndexRef.current) {
    // Earlier entry removed: same combatant stays active, shift index down.
    newIdx = currentTurnIndexRef.current - 1;
  } else if (removedIdx === currentTurnIndexRef.current) {
    // The active combatant itself was removed (e.g. a summon expiring
    // during its own turn, or the active enemy dying from a DoT). Do NOT
    // advance the wheel implicitly: point currentIdx at the entry that
    // PRECEDED the dead slot in the new (shorter) array, so the normal
    // advanceTurn `(prevIdx + 1) % length` handoff lands on the combatant
    // that shifted into the dead slot (the next entry in the original
    // order). This keeps the death from shifting the wheel forward; only
    // advanceTurn moves it. The modulo handles the wrap when the dead
    // entry was at index 0 (predecessor becomes the new last entry).
    newIdx = (removedIdx - 1 + newOrder.length) % newOrder.length;
  } else {
    // Later entry removed: active combatant is unaffected.
    newIdx = currentTurnIndexRef.current;
  }

  // Defensive clamp: keep the index inside [0, newOrder.length - 1]. The
  // branches above already produce in-range values, but this guards against
  // any future caller passing an out-of-range currentTurnIndexRef.
  if (newIdx < 0) {
    newIdx = 0;
  } else if (newIdx >= newOrder.length && newOrder.length > 0) {
    newIdx = newIdx % newOrder.length;
  }
  currentTurnIndexRef.current = newIdx;

  // Sync the ref BEFORE the state update so any synchronous reader (e.g. the
  // turn-advance gate at WX line 10640) sees a fresh value, matching the
  // existing pattern at castHelpers.ts line 374.
  turnOrderRef.current = newOrder;

  setTurnOrder(() => newOrder);
}

/**
 * Prefer the live turn-order ref after `removeCombatantFromTurnQueue`.
 * That helper writes the filtered array to the ref immediately; React
 * `turnOrder` can still be the pre-remove snapshot in the same
 * `flushSync` (or a later End Turn if only the ref was shifted).
 */
export function liveTurnOrder<T>(reactOrder: T[], liveOrder: T[]): T[] {
  return liveOrder.length > 0 ? liveOrder : reactOrder;
}

/**
 * Advance one slot from the live current index.
 *
 * `removeCombatantFromTurnQueue` shifts `currentTurnIndexRef` when an
 * earlier combatant dies or a wrap-around summon expires at index 0. It
 * does not write React `currentTurnIndex`. `(reactIdx + 1) % length`
 * then repeats the combatant who just acted (kill the initiative-first
 * enemy, End Turn) or skips the next living combatant after #74 expires
 * a summon at the head of the queue.
 */
export function nextTurnIndex(currentIdx: number, orderLength: number): number {
  if (orderLength <= 0) return 0;
  return (currentIdx + 1) % orderLength;
}
