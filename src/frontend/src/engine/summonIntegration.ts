/**
 * Summon integration helpers — minimal bridge between WorldExploration.tsx
 * and the pure summon engine modules (summonSpawn.ts, summonExecutor.ts,
 * spellEngine.ts). `summonAI.ts` is unused; live turns go through enemyAI.
 *
 * All functions are side-effect-free except where explicitly noted.
 */

import type { CombatantEntry } from "../components/InitiativeStrip";
import { logDebugInfo } from "../utils/debugLogger";
import { type SpellContextDeps, createSpellContext } from "./spellContext";
import type { SpellContext } from "./spellEngine";
import { expireSummonsAtTurnStart } from "./summonLifespan";
import {
  type CurrentTurnIndexRef,
  type SetTurnOrder,
  type TurnOrderRef,
  removeCombatantFromTurnQueue,
} from "./turnQueue";

/**
 * Decrement lifespan for summons, kill those at 0, and return both the
 * filtered enemy list and the IDs of summons that expired this tick.
 *
 * DECREMENT MODEL (Section 2 fix): "once when the summon's own turn begins".
 * A summon's lifespan decrements by exactly 1 when ITS OWN turn starts — i.e.
 * when advanceTurn dispatches to that summon's turn-order entry. A lifespan-4
 * summon therefore acts on ~4 of its own turns before fading.
 *
 * The `activeSummonId` parameter selects the decrement target:
 *   - When it is a non-null string: ONLY the summon with that id is decremented
 *     (the one whose turn is about to begin). All other summons are left
 *     untouched this tick. This is the Section 2 call path.
 *   - When it is null/undefined: NO summon is decremented this tick — the call
 *     is purely a cleanup pass to remove any summon that already hit 0 from a
 *     prior decrement. (Legacy callers that omitted the arg used to decrement
 *     ALL summons every tick; that path is intentionally NOT preserved because
 *     it was the bug Section 2 fixes. No current caller relies on the legacy
 *     "decrement all" behavior.)
 *
 * This function NO LONGER mutates the turn queue itself. The previous
 * implementation called removeCombatantFromTurnQueue inside the loop, which
 * raced the turn-advance index computation in WorldExploration.tsx (the
 * setEnemies callback ran AFTER currentTurnIndexRef was already advanced
 * against the stale turnOrder, leaving ghost turn entries).
 *
 * The contract is synchronous and ordered:
 *   1. Decrement turnsRemaining for the active summon only (when activeSummonId
 *      is provided and matches a living summon).
 *   2. For any summon that hits 0 (or was already at 0 from a prior tick): set
 *      hp=0 and log "fades away" (isSummon=true routes the line to the Summons
 *      chat channel — preserved verbatim).
 *   3. Collect the expired summon IDs into expiredIds.
 *   4. Return { enemies, expiredIds }.
 *
 * The caller is responsible for syncing the turn queue with expiredIds BEFORE
 * it computes the next turn index, so the index is always computed against a
 * turnOrder that no longer contains the faded summons. This closes the ghost-
 * entry race: there is no window where currentTurnIndexRef points at a removed
 * combatant.
 */
export function decrementSummonLifespan(
  enemies: any[],
  log: (msg: string, color?: string, isSummon?: boolean) => void,
  activeSummonId?: string | null,
): { enemies: any[]; expiredIds: string[] } {
  logDebugInfo("SUMMON", "[SUMMON-LIFE] decrementSummonLifespan ENTER", {
    activeSummonId: activeSummonId ?? null,
    summonCount: enemies.filter((e: any) => e.isSummon).length,
    enemies: enemies.map((e: any) => ({
      id: e.id,
      isSummon: !!e.isSummon,
      turnsRemaining: e.turnsRemaining,
      hp: e.hp,
    })),
  });
  const expiredIds = expireSummonsAtTurnStart(enemies, log, activeSummonId);
  // Removal filter: distinguish expiry (hp set to 0 above) from any other
  // hp<=0 cause (e.g. death path that already zeroed hp before this call).
  const removed: any[] = [];
  const survivors = enemies.filter((e: any) => {
    if (e.hp > 0) return true;
    const isExpiry = expiredIds.includes(e.id);
    removed.push({
      id: e.id,
      isSummon: !!e.isSummon,
      turnsRemaining: e.turnsRemaining,
      hp: e.hp,
      path: isExpiry ? "expiry_filter" : "hp_filter",
    });
    return false;
  });
  if (removed.length > 0) {
    logDebugInfo("SUMMON", "[SUMMON-LIFE] REMOVAL filter result", {
      removed,
      survivors: survivors.map((e: any) => ({
        id: e.id,
        isSummon: !!e.isSummon,
        turnsRemaining: e.turnsRemaining,
        hp: e.hp,
      })),
    });
  }
  return { enemies: survivors, expiredIds };
}

/**
 * Atomically decrement summon lifespans, remove every expired summon from the
 * turn queue (state + both refs), and update the enemies state — in that order,
 * synchronously, in a single call.
 *
 * DECREMENT MODEL (Section 2): the decrement only fires for the summon whose
 * own turn is about to begin — identified by `activeSummonId`. When the next
 * combatant is NOT a summon, the caller passes `null` and this call becomes a
 * cleanup-only pass (no decrement, but any summon already at 0 is still removed
 * from the queue and enemies state). This makes a summon's lifespan decrement
 * exactly once per ROUND (on its own turn), not once per combatant turn.
 *
 * This is the single entry point that satisfies the "no ghost slot" contract:
 *   1. `decrementSummonLifespan` runs first with `activeSummonId`, producing
 *      `{ survivingEnemies, expiredIds }`. Only the active summon (if any) is
 *      decremented; expired summons are collected regardless.
 *   2. For each `expiredId`, `removeCombatantFromTurnQueue` runs synchronously,
 *      filtering `turnOrder`, syncing `turnOrderRef.current`, and adjusting
 *      `currentTurnIndexRef.current` (3-case index math, including the
 *      expiry-during-own-turn fix at turnQueue.ts line 94).
 *   3. `setEnemies(survivingEnemies)` runs LAST, so there is never a window
 *      where `enemies` state has dropped a summon but the turn queue still
 *      references it (or vice versa).
 *
 * The caller MUST invoke this BEFORE computing the next turn index (the
 * `(prevIdx + 1) % prevOrder.length` advance at WorldExploration.tsx ~10530),
 * so the advance always runs against a turnOrder that no longer contains the
 * faded summons. This closes the ghost-entry race: there is no window where
 * `currentTurnIndexRef` points at a removed combatant.
 *
 * Side-effectful by design: it mutates the two refs it is handed, invokes the
 * two setters it is handed, and mutates `turnsRemaining`/`hp` on the enemy
 * objects in place (matching the existing `decrementSummonLifespan` behavior).
 *
 * `activeSummonId`: when non-null, only that summon is decremented this tick
 *   (the one whose turn is about to begin). When null, no summon is decremented
 *   — the call is cleanup-only. Expired-removal always runs for any summon at
 *   0, regardless of this argument.
 */
export function syncExpiredSummonsFromTurnQueue(
  enemies: any[],
  _turnOrder: CombatantEntry[],
  turnOrderRef: TurnOrderRef,
  currentTurnIndexRef: CurrentTurnIndexRef,
  setTurnOrder: SetTurnOrder,
  setEnemies: (enemies: any[]) => void,
  log: (msg: string, color?: string, isSummon?: boolean) => void,
  activeSummonId?: string | null,
): void {
  const { enemies: survivingEnemies, expiredIds } = decrementSummonLifespan(
    enemies,
    log,
    activeSummonId,
  );
  for (const expiredId of expiredIds) {
    removeCombatantFromTurnQueue(
      turnOrderRef.current,
      turnOrderRef,
      currentTurnIndexRef,
      expiredId,
      setTurnOrder,
    );
  }
  setEnemies(survivingEnemies);
}

/**
 * Build a real SpellContext from explicit deps captured by the caller
 * (WorldExploration.tsx). Delegates 1:1 to createSpellContext — no inline logic,
 * no no-op stubs. The caller passes the same callback implementations used by
 * the playerSpellContext factory so player casts and summon-AI casts share the
 * same underlying damage/heal/effect/spawn paths.
 */
export function buildSpellContext(deps: SpellContextDeps): SpellContext {
  return createSpellContext(deps);
}

export function getPlayerSideTargets(enemies: any[]): any[] {
  return enemies.filter((e: any) => e.side === "player" || e.isPlayer);
}

/**
 * Resolve the AP/MP to display for a turn-order combatant. Player-side summons
 * carry their own currentAp/currentMp budget (seeded in spawnSummonUnit and
 * refreshed each turn in handleSummonTurn); regular enemies derive AP/MP from
 * their level. Falls back to the combatant's existing level when the enemy
 * record is missing.
 */
export function resolveEnemyApMp(
  enemy: any | undefined,
  fallbackLevel: number,
): { ap: number; mp: number } {
  if (!enemy) return { ap: fallbackLevel, mp: 1 };
  if (enemy.isSummon) {
    return {
      ap: enemy.currentAp ?? enemy.level ?? fallbackLevel,
      mp: enemy.currentMp ?? Math.max(1, Math.floor((enemy.level ?? 1) / 2)),
    };
  }
  return {
    ap: enemy.level ?? fallbackLevel,
    mp: Math.max(1, Math.floor(enemy.level / 2)),
  };
}
