/**
 * Death pipeline — idempotent combatant death processing.
 *
 * Idempotency contract:
 *   `processCombatantDeath(id, ctx)` is safe to call any number of times for the
 *   same combatant id. The first invocation performs the full death sequence
 *   and returns `true`. Every subsequent invocation for an already-removed
 *   combatant is a no-op and returns `false`, regardless of which caller
 *   triggers it (turn-end sweep, damage handler, leader-death cascade, etc.).
 *
 * Ordering contract:
 *   The death sequence runs in a fixed, deliberate order so downstream
 *   callbacks can rely on prior state changes:
 *     1. Idempotency guard — bail if already removed.
 *     2. Snapshot name + position BEFORE removal (positions/names may become
 *        unavailable once the combatant is detached from the roster).
 *     3. Detach from the combatant roster.
 *     4. Detach from the turn queue.
 *     5. Detach from the initiative strip UI.
 *     6. Trigger the shatter VFX at the death position.
 *     7. Log the defeat message.
 *     8. Apply leader-death boost (if the dead combatant was a leader).
 *     9. Recheck victory/defeat conditions.
 *    10. Attribute the kill reward.
 *
 * This module is intentionally React- and actor-free. It depends only on the
 * `DeathPipelineCtx` interface, which the caller implements against whatever
 * runtime (React state, Motoko actor, etc.) owns the combatant state.
 */

/**
 * Callback bundle supplied by the caller. Each callback mutates or queries the
 * caller's own combatant state; this module never touches that state directly.
 */
export interface DeathPipelineCtx {
  /** Detach the combatant from the active roster. */
  removeCombatant(id: string): void;
  /** Remove the combatant from the pending turn queue. */
  removeFromTurnQueue(id: string): void;
  /** Remove the combatant from the initiative strip UI. */
  removeFromInitiativeStrip(id: string): void;
  /** Fire the shatter visual effect at the given board position. */
  triggerShatter(id: string, x: number, y: number): void;
  /** Append a "defeated" entry to the combat log. */
  logDefeated(name: string): void;
  /** Apply a leader-death boost triggered by this combatant's death. */
  applyLeaderDeathBoost(deadId: string): void;
  /** Re-evaluate victory/defeat conditions after a death. */
  recheckVictory(): void;
  /** Attribute the kill reward for the dead combatant. */
  attributeKillReward(deadId: string): void;
  /** Whether the combatant has already been removed from the roster. */
  isCombatantRemoved(id: string): boolean;
  /** Display name of the combatant (must be valid before removal). */
  getCombatantName(id: string): string;
  /** Board position of the combatant (must be valid before removal). */
  getCombatantPos(id: string): { x: number; y: number };
}

/**
 * Process a combatant's death exactly once.
 *
 * @param id   - The combatant id that just died.
 * @param ctx  - Caller-supplied callback bundle (see {@link DeathPipelineCtx}).
 * @returns `true` if the death sequence ran this call, `false` if the combatant
 *          was already removed (idempotent no-op).
 */
export function processCombatantDeath(
  id: string,
  ctx: DeathPipelineCtx,
): boolean {
  // 1. Idempotency guard — already dead, no-op.
  if (ctx.isCombatantRemoved(id)) {
    return false;
  }

  // 2. Snapshot name + position BEFORE removal.
  const name = ctx.getCombatantName(id);
  const pos = ctx.getCombatantPos(id);

  // 3. Detach from roster.
  ctx.removeCombatant(id);
  // 4. Detach from turn queue.
  ctx.removeFromTurnQueue(id);
  // 5. Detach from initiative strip.
  ctx.removeFromInitiativeStrip(id);
  // 6. Shatter VFX at death position.
  ctx.triggerShatter(id, pos.x, pos.y);
  // 7. Log the defeat.
  ctx.logDefeated(name);
  // 8. Leader-death boost.
  ctx.applyLeaderDeathBoost(id);
  // 9. Recheck victory conditions.
  ctx.recheckVictory();
  // 10. Attribute kill reward.
  ctx.attributeKillReward(id);

  return true;
}
