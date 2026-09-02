/**
 * battleSetup.ts — Single source of truth for combatant liveness.
 *
 * Pure engine module (no React, no DOM, no WX imports). All victory checks,
 * draw-skip decisions, and targeting filters that depend on "is this enemy
 * still relevant to the fight" MUST route through the predicates exported
 * here. WX passes its `Enemy` type structurally — see `Combatant` below.
 *
 * Liveness rules:
 *   - `isActiveHostile(e)`: a living NON-summon on the enemy side. These are
 *     the combatants that must be defeated for victory. Player-side summons
 *     are never hostile even if hp > 0.
 *   - `isAliveCombatant(e)`: any living combatant (hp > 0), including
 *     player-side summons. Used for draw/targeting filters where a living
 *     summon still occupies a tile and can be targeted or block LoS.
 *
 * Side semantics:
 *   - `side === 'enemy'` (or absent side with `isSummon === false`) → hostile
 *     when alive.
 *   - `side === 'player'` → never hostile (covers player summons).
 *   - Absent `side` defaults to enemy-side for non-summons, so legacy
 *     combatants without an explicit `side` field keep working.
 */

/**
 * Minimal structural combatant shape. WX's `Enemy` type satisfies this
 * structurally without a hard import dependency, keeping the engine module
 * decoupled from the WX type graph.
 */
export interface Combatant {
  hp: number;
  isSummon?: boolean;
  side?: "player" | "enemy";
  id?: string;
  x?: number;
  y?: number;
  isMoving?: boolean;
  assignedName?: string;
  pieceType?: string;
  level?: number;
  turnsRemaining?: number;
  isWandering?: boolean;
  spawnTime?: number;
  maxHp?: number;
  currentView?: string;
}

/**
 * Returns true when `e` is a living enemy-side combatant that must be
 * defeated for victory (including enemy-summoner minions after #79).
 *
 * - hp must be > 0.
 * - Player-side summons are never hostile.
 * - `side === 'enemy'` (or absent side, defaulted to enemy for non-summons)
 *   is hostile when alive.
 */
export function isActiveHostile(e: Combatant): boolean {
  if (e.hp <= 0) return false;
  return countsTowardKillRewards(e);
}

/**
 * Whether a combatant's death should enter the victory XP/Doka roster.
 *
 * The death pipeline snapshots the row after HP is already 0, so
 * `isActiveHostile` would drop real enemy kills. Player-side summons
 * (and the player) must still be excluded — otherwise a dead wolf / bomber
 * is treated as a defeated enemy and `applyRewards` credits extra XP/Doka.
 */
export function countsTowardKillRewards(e: {
  isSummon?: boolean;
  side?: "player" | "enemy";
}): boolean {
  if (e.isSummon && e.side !== "enemy") return false;
  // Absent side on a non-summon defaults to enemy-side (legacy combatants).
  return (e.side ?? "enemy") === "enemy";
}

/**
 * Returns true when `e` is any living combatant (hp > 0), including
 * player-side summons. Used for draw/targeting filters where a living
 * summon still occupies a tile and can be targeted or block LoS.
 */
export function isAliveCombatant(e: Combatant): boolean {
  return e.hp > 0;
}

/**
 * Returns the count of living hostile enemies remaining in `enemies`.
 * Victory fires when this reaches 0 — NOT when `enemies.length === 0`,
 * because living player-side summons may still be in the array.
 */
export function activeHostilesRemaining(enemies: Combatant[]): number {
  return enemies.filter(isActiveHostile).length;
}

/**
 * Victory persist may run only for a fight the player is still in and did
 * not already lose. `_handlePlayerDeath` used to leave `inBattle` true, so a
 * later last-hostile death (DoT tick, leftover AI turn) could still enter
 * handleBattleEnd / applyRewards and race the death-penalty save.
 */
export function shouldAwardVictory(opts: {
  inBattle: boolean;
  deathTriggered: boolean;
  /** Must be the battle-open snapshot size, not the living roster. */
  battleStartIdsSize: number;
  hostilesRemaining: number;
}): boolean {
  return (
    opts.inBattle &&
    !opts.deathTriggered &&
    opts.battleStartIdsSize > 0 &&
    opts.hostilesRemaining === 0
  );
}

/**
 * handleBattleEnd / handleBossRushRoomClear set battleEndedRef then call
 * cleanupBattle. Resetting the guard there let a second victory-gate fire
 * (enemies update / Strict Mode) re-enter applyRewards for the same fight.
 * The guard stays true through cleanup and is cleared only at the next
 * battle start.
 */
export function persistBattleEndGuardAfterCleanup(ended: boolean): boolean {
  return ended === true;
}

/** Next fight may persist rewards. Call at battle start, not in cleanup. */
export function resetBattleEndGuardForNewBattle(): boolean {
  return false;
}

/**
 * World / next-room encounters may start only when React `inBattle` AND the
 * sync `inBattleRef` are both false. `cleanupBattle()` only clears the ref;
 * `handleBattleEnd` / `handleBossRushRoomClear` / death must also
 * `setInBattle(false)` or `checkBattleTrigger` stays blocked — Boss Rush
 * room 2 never starts after a room-clear, and later overworld fights stay dead.
 */
export function shouldAllowBattleTrigger(opts: {
  inBattle: boolean;
  inBattleRef: boolean;
  transitionInProgress: boolean;
  /**
   * Exploration lava/spike death arms a 1.5s Death Realm timer and restores
   * HP immediately. Mid-path movement can still land on an enemy cell.
   * Starting that fight resets the death guards without clearing the timer,
   * so the leftover callback aborts the battle (and a second persistDeathPenalty
   * can fire if the player also dies in it).
   */
  deathRealmPending?: boolean;
  /**
   * Recap can be dismissed while applyRewards is still queued. A walk onto
   * another overworld hostile then starts a second fight before the first
   * credit commits.
   */
  victoryPersistPending?: boolean;
}): boolean {
  return (
    !opts.inBattle &&
    !opts.inBattleRef &&
    !opts.transitionInProgress &&
    !opts.deathRealmPending &&
    !opts.victoryPersistPending
  );
}

/**
 * Returns `enemies` with all summons removed (living or dead). Used on
 * victory and Boss Rush room-clear so leftover player summons cannot occupy
 * the walk to the progression portal or become the next overworld collision.
 */
export function despawnSummons<T extends Combatant>(enemies: T[]): T[] {
  return enemies.filter((e) => !e.isSummon);
}

/**
 * Overworld encounter collision. checkBattleTrigger used to start a fight
 * on any same-cell combatant, so a leftover player-side wolf after a Boss
 * Rush room-clear (which skipped despawnSummons) re-entered battle as the
 * colliding "enemy" — often with 0 hostiles, so victory + applyRewards
 * fired immediately.
 */
export function shouldTriggerOverworldEncounter(e: Combatant): boolean {
  return isActiveHostile(e);
}

/**
 * Subtract incoming damage from live HP. Pass the current HP (store /
 * characterStatsRef / setState `prev`), never a useCallback-closed snapshot.
 *
 * `processActiveEffects` is created once (`[logBattleEntry]` only) and used
 * to close over mount-time `characterStats.hp`. Writing that snapshot after
 * a mid-fight hit restores the player toward full HP on every DoT tick.
 */
export function hpAfterIncomingDamage(
  currentHp: number,
  damage: number,
): { newHp: number; lethal: boolean } {
  const hp = Number.isFinite(currentHp) ? currentHp : 0;
  const dmg = Number.isFinite(damage) ? Math.max(0, damage) : 0;
  const newHp = Math.max(0, hp - dmg);
  return { newHp, lethal: newHp === 0 };
}

/**
 * Lava / spike damage after an enemy lands on a hazard.
 *
 * Callers must then write `newHp` through `updateCombatant` and, when
 * `lethal`, `processCombatantDeath` — the same contract as player Mirror.
 * React-only `enemyHpMap` / `turnOrder` writes leave store hp > 0, so
 * `isActiveHostile` still counts the unit: last-enemy lava delays
 * applyRewards, and the "dead" unit takes another full turn (including a
 * lethal attack that can persist a death penalty instead of victory).
 */
export function enemyHpAfterHazardDamage(
  currentHp: number,
  damage: number,
): { newHp: number; lethal: boolean } {
  return hpAfterIncomingDamage(currentHp, damage);
}

/**
 * Authoritative HP for a combatant in the live store.
 *
 * The enemy-AI apply layer captures `enemyHpMap` in a closure that is not
 * refreshed after an earlier `updateCombatant` in the same `flushSync`
 * (Mirror reflect, then lava/spike). Basing the hazard off that stale map
 * overwrites the store and can heal the attacker.
 */
export function liveCombatantHp(
  combatants: Combatant[],
  id: string,
  fallback: number,
): number {
  const live = combatants.find((c) => c.id === id);
  if (live == null || !Number.isFinite(live.hp)) return fallback;
  return live.hp;
}

/**
 * Next HP after an enemy/boss self-heal or drain.
 *
 * Callers must write this through `updateCombatant`. A `setTurnOrder`-only
 * write leaves store HP at the pre-heal snapshot, so `enemyTakesDamage`
 * (store-authoritative) ignores the heal and can kill a unit the strip
 * still shows as healthy.
 */
export function hpAfterHeal(
  currentHp: number,
  maxHp: number,
  healAmount: number,
): number {
  const hp = Number.isFinite(currentHp) ? currentHp : 0;
  const max = Number.isFinite(maxHp) ? Math.max(0, maxHp) : hp;
  const heal = Number.isFinite(healAmount) ? Math.max(0, healAmount) : 0;
  return Math.min(max, hp + heal);
}

/**
 * Phase-2 HP / maxHp after the boss stat multiplier.
 *
 * Same contract as {@link hpAfterHeal}: `updateCombatant` must receive
 * these values. Strip-only phase writes leave store HP at phase-1, so the
 * next player hit can kill a boss the initiative strip shows at 2× HP.
 */
export function hpAfterBossPhase2(
  hp: number,
  maxHp: number,
  multiplier: number,
  fullHeal: boolean,
): { hp: number; maxHp: number } {
  const safeHp = Number.isFinite(hp) ? hp : 0;
  const safeMax = Number.isFinite(maxHp) ? maxHp : safeHp;
  const mult = Number.isFinite(multiplier) ? multiplier : 1;
  const newMaxHp = Math.round(safeMax * mult);
  const newHp = fullHeal
    ? newMaxHp
    : Math.min(Math.round(safeHp * mult), newMaxHp);
  return { hp: newHp, maxHp: newMaxHp };
}

/** Plague Zone WX tick. Must match the inline "deals 2 damage" log. */
export const PLAGUE_ZONE_TICK = 2;

/** Void Rift WX tick. Must match mapModifiers VOID_RIFT_TICK / MAP_MODIFIER_VOID_RIFT_DAMAGE. */
export const VOID_RIFT_TICK = 3;

/**
 * Battle-walk Thorned Ground: 5 HP per extra tile after the first.
 * Matches the live mouse walk in WorldExploration (path.length > 1).
 * Touch walk used to skip this debit; both input paths must use this helper.
 */
export const THORNED_WALK_DAMAGE_PER_EXTRA_TILE = 5;

export function thornedGroundWalkDamage(pathLength: number): number {
  if (!Number.isFinite(pathLength) || pathLength <= 1) return 0;
  return (pathLength - 1) * THORNED_WALK_DAMAGE_PER_EXTRA_TILE;
}

/** −VOID_RIFT_TICK when the walk destination is the current rift tile. */
export function voidRiftWalkDamage(
  dest: { x: number; y: number },
  rift: { x: number; y: number } | null | undefined,
): number {
  if (!rift) return 0;
  if (rift.x !== dest.x || rift.y !== dest.y) return 0;
  return VOID_RIFT_TICK;
}

/**
 * Combined battle-walk hazards. Mouse and touch must apply the same
 * thorn / rift HP so Untouchable and under-damage challenges cannot
 * be satisfied by switching input method.
 */
export function battleWalkHazardDamages(opts: {
  thornedActive: boolean;
  pathLength: number;
  voidRiftActive: boolean;
  dest: { x: number; y: number };
  riftTile: { x: number; y: number } | null | undefined;
}): { thornDmg: number; riftDmg: number } {
  return {
    thornDmg: opts.thornedActive ? thornedGroundWalkDamage(opts.pathLength) : 0,
    riftDmg: opts.voidRiftActive
      ? voidRiftWalkDamage(opts.dest, opts.riftTile)
      : 0,
  };
}

/**
 * After DoT / plague at enemy turn start, dispatch AI only if the unit
 * is still alive in the store. Applies to non-summon enemies and enemy
 * summons (hostiles after #79). `setBattlePhase("enemy")` before a lethal
 * tick leaves battlePhase stuck when `processCombatantDeath` points the
 * queue at a non-enemy predecessor.
 */
export function shouldDispatchEnemyAiAfterTurnStart(opts: {
  stillInStore: boolean;
  storeHp: number;
}): boolean {
  return opts.stillInStore && opts.storeHp > 0;
}

/**
 * Player plague / DoT at turn start must stop the rest of player-turn
 * setup. Plague used to `setCharacterStats` only and rely on the async
 * HP-watch effect, so `deathTriggered` stayed false while AP restored
 * and the canvas accepted a last-hostile kill → `shouldAwardVictory`.
 */
export function shouldContinuePlayerTurnAfterHazard(opts: {
  deathTriggered: boolean;
  liveHp: number;
}): boolean {
  return !opts.deathTriggered && opts.liveHp > 0;
}

/**
 * Player lives outside `combatantsRef`. Falling back to `[0]` mutates the
 * first enemy's store HP (plague −1 / void −3) every player turn without
 * `processCombatantDeath`.
 */
export function playerTurnStartModifierTarget<T extends { id?: string }>(
  combatants: T[],
): T | undefined {
  return combatants.find((c) => c.id === "player");
}

/**
 * After an enemy apply-layer finally (lava/spike, Mirror bounce, thisHp
 * check) or a last-hostile summon fade inside `advanceTurn`, do not
 * dispatch the next turn when the fight is already over.
 *
 * `advanceTurn` is `flushSync` and runs before the `[inBattle, enemies]`
 * victory useEffect. Dispatching the player's next turn lets DoT / plague
 * call `_handlePlayerDeath` first, set `deathTriggered`, and make
 * `shouldAwardVictory` refuse — `persistDeathPenalty` instead of
 * `applyRewards`.
 */
export function shouldAdvanceAfterEnemyTurn(opts: {
  deathTriggered: boolean;
  hostilesRemaining: number;
}): boolean {
  return !opts.deathTriggered && opts.hostilesRemaining > 0;
}

/**
 * Clamp the AI destination and return a store patch when the unit actually
 * leaves its origin tile. The WX apply layer used dest only for range /
 * hazard math and never called updateCombatant({ x, y }), so regular
 * enemies stayed frozen while boss / erratic paths already committed.
 */
export function enemyDestToCommit(
  origin: { x: number; y: number },
  dest: { x: number; y: number } | null | undefined,
  gridSize: number,
): { x: number; y: number } | null {
  if (!dest) return null;
  const size = Math.max(1, Math.floor(Number(gridSize) || 0));
  const x = Math.max(0, Math.min(size - 1, Math.floor(Number(dest.x))));
  const y = Math.max(0, Math.min(size - 1, Math.floor(Number(dest.y))));
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  if (x === origin.x && y === origin.y) return null;
  return { x, y };
}
