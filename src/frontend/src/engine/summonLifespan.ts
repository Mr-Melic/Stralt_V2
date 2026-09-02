import { SUMMON_BASE_LIFESPAN } from "../data/gameConstants.ts";

/**
 * Lifespan tick for the summon whose turn is about to start.
 *
 * Must run against the live combatant store, not a React `enemies`
 * snapshot. `advanceTurn` is a long-lived callback and does not list
 * `enemies` in its deps — the snapshot from that closure is the
 * pre-battle (often empty) roster. Decrementing that list and writing
 * it back via `setEnemies` drops every mid-fight summon and skips
 * their lifespan tick, so a lifespan-4 Wolf never fades and anything
 * that reads `enemies` (Attack Nearest, the debug roster) loses its
 * targets after the first End Turn.
 *
 * Returns expired ids. The caller must drop them through
 * `removeCombatant` so combatantsRef, enemies state, and the turn
 * queue stay aligned.
 */
export function expireSummonsAtTurnStart(
  liveCombatants: any[],
  log: (msg: string, color?: string, isSummon?: boolean) => void,
  activeSummonId?: string | null,
): string[] {
  const expiredIds: string[] = [];
  for (const e of liveCombatants) {
    if (!e.isSummon) continue;
    if (activeSummonId != null && e.id !== activeSummonId) continue;
    if (activeSummonId != null) {
      if (e.turnsRemaining == null) {
        e.turnsRemaining = SUMMON_BASE_LIFESPAN;
      }
      e.turnsRemaining = e.turnsRemaining - 1;
    }
    if (e.turnsRemaining <= 0) {
      e.hp = 0;
      log(`${e.name} fades away...`, "#a78bfa", true);
      expiredIds.push(e.id);
    }
  }
  return expiredIds;
}
