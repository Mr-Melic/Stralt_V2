/**
 * One-shot death guards. Every death path sets these so Game Over / Death
 * Realm cannot fire twice for the same death. They must be cleared again
 * once that death has finished (Death Realm loaded or Respawn clicked).
 *
 * The in-battle HP-watch and handleRespawn used to leave them set. After
 * escaping Death Realm, a later exploration death (lava / spikes) then
 * skipped the handler — 0 HP with no penalty, no Game Over, no Death Realm.
 */

export type DeathGuardRefs = {
  deathTriggered: { current: boolean };
  deathPenaltyApplied: { current: boolean };
};

/** True when a new death event is allowed to run. */
export function deathGuardsAreArmed(refs: DeathGuardRefs): boolean {
  return !refs.deathTriggered.current && !refs.deathPenaltyApplied.current;
}

/** Re-arm both guards after Death Realm entry or Respawn. */
export function armDeathGuards(refs: DeathGuardRefs): void {
  refs.deathTriggered.current = false;
  refs.deathPenaltyApplied.current = false;
}

/**
 * True while an exploration (or in-battle) death has armed the Death Realm
 * timer and that timer has not fired yet.
 *
 * persistDeathPenalty restores HP in the same death tick, so an hp<=0 check
 * is already false by the time the player can walk. World actions that
 * cancel the timer (portal → cleanupMap) or reset the death guards
 * (battle start) must stay blocked until the realm loads.
 */
export function isDeathRealmTransitionPending(
  deathTriggered: boolean,
  deathRealmTimerPending: boolean,
): boolean {
  return deathTriggered && deathRealmTimerPending;
}

/**
 * Block portal entry while a Death Realm timer is pending.
 *
 * persistDeathPenalty restores HP in the same death tick, so an hp<=0 check
 * is already false by the time the player can step on a portal. cleanupMap
 * then cancels deathRealmTimerRef while deathTriggered stays set — the HP
 * watch never re-runs, and the next lava/spike death strands the player.
 */
export function shouldBlockPortalDuringPendingDeathRealm(
  deathTriggered: boolean,
  deathRealmTimerPending: boolean,
): boolean {
  return isDeathRealmTransitionPending(deathTriggered, deathRealmTimerPending);
}
