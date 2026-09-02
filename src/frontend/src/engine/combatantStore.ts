/**
 * combatantStore.ts — Atomic combatant-state store helpers.
 *
 * Centralizes the multi-array bookkeeping that WorldExploration.tsx (WX)
 * previously scattered across `setEnemies` / `setBattleEnemies` /
 * `setTurnOrder` plus their parallel mirror refs (`enemiesRef`,
 * `battleEnemiesRef`, `turnOrderRef`). Every mutation that touches the
 * combatant set MUST route through this module so the four arrays
 * (combatants, enemies mirror, battleEnemies mirror, turnOrder) and the
 * `battleStartIds` set stay in sync atomically.
 *
 * Design rules (verbatim from the migration spec):
 *   - The caller (WX) owns the refs and setters; this module is pure with
 *     respect to external state — it only mutates the refs / calls the
 *     setters handed to it via the ctx.
 *   - `battleEnemies` remains a DERIVED view (never deleted) so the reads
 *     at WX 10611 (defeatedList) and WX 12121 (boss-AI battleEnemiesRef
 *     lookup) keep working. `deriveBattleEnemies(ctx)` reproduces it.
 *   - `enemiesRef` / `battleEnemiesRef` / `turnOrderRef` are kept as
 *     mirrors the store helpers sync (NOT removed) to avoid a large
 *     read-site refactor.
 *   - Every helper is atomic: compute all next-arrays first, then assign
 *     refs, then call setters. No half-applied state is ever observable.
 *
 * React-free / DOM-free at runtime. Imports the `Enemy` and
 * `CombatantEntry` TYPES (erased at compile time) plus the pure
 * `removeCombatantFromTurnQueue` and `activeHostilesRemaining` engine
 * helpers — matching the engine's React-free runtime convention.
 */

import type { MutableRefObject } from "react";
import type { CombatantEntry } from "../components/InitiativeStrip";
import type { Enemy } from "../types/gameTypes";
import { activeHostilesRemaining } from "./battleSetup.ts";
import type {
  CurrentTurnIndexRef,
  SetTurnOrder,
  TurnOrderRef,
} from "./turnQueue.ts";
import { removeCombatantFromTurnQueue } from "./turnQueue.ts";

/** React state setter for an array of combatants. */
type SetCombatants = (updater: (prev: Enemy[]) => Enemy[]) => void;

/** Options for {@link addCombatant}. */
export interface AddCombatantOpts {
  /** When true, the added combatant participates in the current battle
   *  (its id is added to `battleStartIds` and mirrored into
   *  `battleEnemiesRef`). Defaults to `false` (world-level spawn). */
  battleParticipant?: boolean;
  /** When set, insert the new combatant's turn-order entry immediately
   *  AFTER the entry whose id matches (summoner-adjacent placement).
   *  When the id is not found, the entry is appended at the end. This
   *  reproduces the placement `applySummonResult` (summonSpawn.ts) used to
   *  do, but inside the atomic ADD so the combatant array, mirrors, and
   *  turn order all commit together — no wholesale REPLACE. */
  insertAfterId?: string;
}

/** Options for {@link syncCombatants}. */
export interface SyncCombatantsOpts {
  /** When true, rebuild `battleStartIds` from `next` (every id becomes a
   *  battle participant). Used for battle-start teleport. Defaults to
   *  `false` (world init / exploration movement bulk maps preserve the
   *  existing battle roster). */
  resetBattle?: boolean;
}

/**
 * The combatant-store context. Assembled by the caller (WX) from its
 * existing refs and setters and handed to every store helper. The
 * `initCombatantStore` factory wires the common pieces; the caller only
 * needs to supply the refs + setters it already owns.
 */
export interface CombatantStoreCtx {
  /** Primary combatant array (source of truth). */
  combatantsRef: MutableRefObject<Enemy[]>;
  /**
   * Snapshot of combatant ids present when the current battle roster was
   * established (`syncCombatants({ resetBattle: true })` or
   * `addCombatant(..., { battleParticipant: true })`).
   *
   * This set is NOT a living roster. Death must not delete from it —
   * `shouldAwardVictory` requires `battleStartIdsSize > 0` so the last
   * kill can still persist rewards. Living membership is `combatantsRef`
   * intersected with this snapshot (`deriveBattleEnemies`).
   */
  battleStartIds: Set<string>;
  /** Mirror of `combatantsRef` kept for synchronous reads. */
  enemiesRef: MutableRefObject<Enemy[]>;
  /** Mirror of the derived battle-enemies view. */
  battleEnemiesRef: MutableRefObject<Enemy[]>;
  /** Mirror of the turn-order array. */
  turnOrderRef: TurnOrderRef;
  /** Active-turn index ref (consumed by `removeCombatantFromTurnQueue`). */
  currentTurnIndexRef: CurrentTurnIndexRef;
  /** React state setter for the enemies array. */
  setEnemies: SetCombatants;
  /** React state setter for the battle-enemies array. */
  setBattleEnemies: SetCombatants;
  /** React state setter for the turn-order array. */
  setTurnOrder: SetTurnOrder;
  /** Optional mutation hook fired at the TAIL of {@link addCombatant},
   *  {@link removeCombatant}, {@link updateCombatant}, and
   *  {@link syncCombatants} AFTER the atomic mutation completes. Used by WX
   *  to bump `battleWorldVersionRef` and clear `spellRangeCacheRef` so a
   *  tile set computed before a combatant moved/death/spawned can never
   *  gate a click after. NOT fired by {@link resetCombatantStore} or
   *  {@link deriveBattleEnemies} (those are not combatant-mutation paths
   *  that affect spell-range validity). */
  onMutation?: () => void;
}

/**
 * Build a {@link CombatantEntry} from a combatant. Real combatants (WX's
 * `Enemy` type) carry the rich fields (`name`, `initiative`,
 * `pieceIcon`, `maxHp`, `level`, `pieceType`, `spells`, `isLeader`,
 * `isBoss`, `bossId`, `currentBossPhase`, `side`, `isSummon`,
 * `summonAI`, `ownerId`, `turnsRemaining`, `leaderBoostCount`); we spread
 * them through and fill any missing required entry field with a safe
 * default so the function is total for any `Combatant`-shaped input.
 *
 * The `type` field discriminates the turn route:
 *   - "summon" — player-side summons (SummonControlPanel / control id)
 *   - "player" — the human player
 *   - "enemy"  — hostile combatants, including enemy-side summons
 *
 * Tagging every `isSummon` as "summon" made enemy minions fail the
 * `currentCombatant.type !== "enemy"` AI gate and, because spawn
 * defaulted `side` to "player", handed those minions to the player.
 */
export function combatantTurnEntryType(c: {
  isSummon?: boolean;
  side?: "player" | "enemy";
}): CombatantEntry["type"] {
  const side = c.side ?? "enemy";
  if (c.isSummon && side === "player") return "summon";
  return side === "player" ? "player" : "enemy";
}

function toCombatantEntry(c: Enemy): CombatantEntry {
  const rich = c as Enemy & Partial<CombatantEntry>;
  const side: "player" | "enemy" = rich.side ?? "enemy";
  return {
    id: c.id,
    type: combatantTurnEntryType({
      isSummon: rich.isSummon ?? c.isSummon,
      side,
    }),
    initiative: rich.initiative ?? 0,
    name: rich.name ?? c.id,
    pieceIcon: rich.pieceIcon ?? "",
    hp: c.hp,
    maxHp: rich.maxHp ?? c.hp,
    level: rich.level ?? 1,
    pieceType: rich.pieceType,
    spells: rich.spells,
    isLeader: rich.isLeader,
    leaderBoostCount: rich.leaderBoostCount,
    isBoss: rich.isBoss,
    bossId: rich.bossId,
    currentBossPhase: rich.currentBossPhase,
    side: rich.side,
    isSummon: rich.isSummon ?? c.isSummon,
    summonAI: rich.summonAI,
    ownerId: rich.ownerId,
    turnsRemaining: rich.turnsRemaining,
  };
}

/**
 * DEV divergence guard. Compares the enemies-state mirror
 * (`enemiesRef.current`, which tracks the React `enemies` state) against
 * the source-of-truth `combatantsRef.current`. Logs `[STORE-DIVERGE]`
 * with both id sets when they ever differ.
 *
 * Cheap by construction: length check first; id-set comparison only runs
 * when lengths match (so the common case is a single number compare).
 * No-op in production builds (`import.meta.env.DEV` is false).
 *
 * This guard is invoked at the tail of every store mutation so the
 * enemies-state-vs-combatantsRef class of bug is self-announcing
 * forever.
 */
function assertNoDivergence(
  label: string,
  ctx: CombatantStoreCtx,
  nextCombatants: Enemy[],
  nextEnemies: Enemy[],
): void {
  if (!import.meta.env?.DEV) return;

  const refIds = ctx.combatantsRef.current.map((c) => c.id);
  const stateIds = ctx.enemiesRef.current.map((c) => c.id);

  // Cheap path: length mismatch is a single number compare.
  // Id-set comparison only runs when lengths match (catches
  // same-length-but-different-members divergence).
  const diverged =
    refIds.length !== stateIds.length ||
    (refIds.length === stateIds.length &&
      refIds.some((id, i) => id !== stateIds[i]));

  if (!diverged) return;

  // eslint-disable-next-line no-console
  console.log(
    `[STORE-DIVERGE] ${label} ` +
      `combatantsRef(N=${refIds.length}) ids=[${refIds.join(",")}] ` +
      `enemiesRef(N=${stateIds.length}) ids=[${stateIds.join(",")}] ` +
      `nextCombatants(N=${nextCombatants.length}) ` +
      `nextEnemies(N=${nextEnemies.length})`,
  );
}

/**
 * Initialize a combatant-store context from the refs + setters the caller
 * already owns. Seeds `combatantsRef.current` with `initial` and
 * `battleStartIds` with the initial ids (every initial combatant is
 * treated as a battle participant — the caller can `syncCombatants` with
 * `resetBattle: false` afterwards if it needs a different roster).
 *
 * Returns the assembled ctx. The caller retains ownership of every ref
 * and setter; this factory only wires them together and seeds the
 * battle-start id set.
 */
export function initCombatantStore(
  combatantsRef: MutableRefObject<Enemy[]>,
  enemiesRef: MutableRefObject<Enemy[]>,
  battleEnemiesRef: MutableRefObject<Enemy[]>,
  turnOrderRef: TurnOrderRef,
  currentTurnIndexRef: CurrentTurnIndexRef,
  setEnemies: SetCombatants,
  setBattleEnemies: SetCombatants,
  setTurnOrder: SetTurnOrder,
  // biome-ignore lint/correctness/noUnusedVariables: retained for backward compatibility with positional call sites
  initial: Enemy[] = [],
): CombatantStoreCtx {
  // SIDE-EFFECT-SAFE INIT: build the ctx around the refs AS THEY ARE.
  // Never wipe live ref contents on (re)render — syncCombatants is the only
  // place that reassigns the arrays / rebuilds battleStartIds.
  if (combatantsRef.current === undefined) {
    combatantsRef.current = [];
  }
  if (enemiesRef.current === undefined) {
    enemiesRef.current = [];
  }
  const battleStartIds = new Set<string>(
    combatantsRef.current.map((c) => c.id),
  );
  const battleEnemies = combatantsRef.current.filter((c) =>
    battleStartIds.has(c.id),
  );
  if (battleEnemiesRef.current === undefined) {
    battleEnemiesRef.current = battleEnemies;
  }
  const ctx: CombatantStoreCtx = {
    combatantsRef,
    battleStartIds,
    enemiesRef,
    battleEnemiesRef,
    turnOrderRef,
    currentTurnIndexRef,
    setEnemies,
    setBattleEnemies,
    setTurnOrder,
  };
  return ctx;
}

/**
 * Append a combatant to the store atomically.
 *
 * - Appends to `combatantsRef.current` and syncs `enemiesRef.current`.
 * - When `opts.battleParticipant` is true, adds the id to
 *   `battleStartIds` and syncs `battleEnemiesRef.current`.
 * - Appends a {@link CombatantEntry} built from the combatant to
 *   `turnOrderRef.current` and syncs `setTurnOrder`.
 * - Calls `setEnemies` and `setBattleEnemies` with the new arrays.
 *
 * Atomic: all next-arrays are computed first, then refs are assigned,
 * then setters are called.
 */
export function addCombatant(
  ctx: CombatantStoreCtx,
  combatant: Enemy,
  opts?: AddCombatantOpts,
): void {
  const c = combatant;
  const battleParticipant = opts?.battleParticipant ?? false;

  const nextCombatants = [...ctx.combatantsRef.current, combatant];
  const nextEnemies = nextCombatants;

  let nextBattleEnemies = ctx.battleEnemiesRef.current;
  if (battleParticipant) {
    ctx.battleStartIds.add(c.id);
    nextBattleEnemies = nextCombatants.filter((x) =>
      ctx.battleStartIds.has(x.id),
    );
  }

  const entry = toCombatantEntry(c);
  // Summoner-adjacent turn-order placement: when insertAfterId is set,
  // splice the new entry immediately after the matching id (or append at
  // the end when not found). This reproduces applySummonResult's placement
  // inside the atomic ADD so the combatant array and turn order commit
  // together — no wholesale REPLACE that could wipe live combatants.
  const insertAfterId = opts?.insertAfterId;
  const nextTurnOrder = [...ctx.turnOrderRef.current];
  if (insertAfterId !== undefined) {
    const i = nextTurnOrder.findIndex(
      (e) => e.id === insertAfterId || e.ownerId === insertAfterId,
    );
    nextTurnOrder.splice(i === -1 ? nextTurnOrder.length : i + 1, 0, entry);
  } else {
    nextTurnOrder.push(entry);
  }

  // Assign refs first so any synchronous reader sees a fresh value.
  ctx.combatantsRef.current = nextCombatants;
  ctx.enemiesRef.current = nextEnemies;
  ctx.battleEnemiesRef.current = nextBattleEnemies;
  ctx.turnOrderRef.current = nextTurnOrder;

  // Then fire the React state updates.
  ctx.setEnemies(() => nextEnemies);
  ctx.setBattleEnemies(() => nextBattleEnemies);
  ctx.setTurnOrder(() => nextTurnOrder);

  // DEV divergence guard — self-announces if the enemies-state mirror
  // ever drifts from combatantsRef after this mutation.
  assertNoDivergence("addCombatant", ctx, nextCombatants, nextEnemies);

  // 1B: structural version bump via store onMutation hook. Fired AFTER the
  // atomic mutation completes so WX can invalidate the spell-range cache.
  ctx.onMutation?.();
}

/**
 * Remove a combatant from the store atomically.
 *
 * - Filters `combatantsRef.current` by id and syncs `enemiesRef.current`.
 * - Rebuilds `battleEnemiesRef` from the remaining live combatants whose
 *   id is still in the battle-start snapshot. Does **not** delete from
 *   `battleStartIds` — that set is the "a fight was opened" gate used by
 *   `shouldAwardVictory`. The last kill would otherwise empty it before
 *   the `[inBattle, enemies]` effect runs, dropping recap / applyRewards.
 * - Calls `removeCombatantFromTurnQueue` (from `./turnQueue`) on
 *   `turnOrderRef.current`, which also adjusts
 *   `currentTurnIndexRef.current` and calls `setTurnOrder`.
 * - Calls `setEnemies` and `setBattleEnemies` with the new arrays.
 *
 * Atomic: all next-arrays are computed first, then refs are assigned,
 * then setters are called. The turn-queue leg is delegated to
 * `removeCombatantFromTurnQueue`, which itself assigns its ref before
 * its setter — preserving the assign-refs-then-set-setters ordering.
 */
export function removeCombatant(ctx: CombatantStoreCtx, id: string): void {
  const nextCombatants = ctx.combatantsRef.current.filter((c) => c.id !== id);
  const nextEnemies = nextCombatants;

  const nextBattleEnemies = nextCombatants.filter((c) =>
    ctx.battleStartIds.has(c.id),
  );

  // Assign the combatant / enemies / battleEnemies refs first.
  ctx.combatantsRef.current = nextCombatants;
  ctx.enemiesRef.current = nextEnemies;
  ctx.battleEnemiesRef.current = nextBattleEnemies;

  // Turn-queue leg: delegate to the pure helper. It syncs turnOrderRef
  // and currentTurnIndexRef and calls setTurnOrder atomically.
  removeCombatantFromTurnQueue(
    ctx.turnOrderRef.current,
    ctx.turnOrderRef,
    ctx.currentTurnIndexRef,
    id,
    ctx.setTurnOrder,
  );

  // Fire the enemies / battleEnemies state updates.
  ctx.setEnemies(() => nextEnemies);
  ctx.setBattleEnemies(() => nextBattleEnemies);

  // DEV divergence guard — self-announces if the enemies-state mirror
  // ever drifts from combatantsRef after this mutation.
  assertNoDivergence("removeCombatant", ctx, nextCombatants, nextEnemies);

  // 1B: structural version bump via store onMutation hook. Fired AFTER the
  // atomic mutation completes so WX can invalidate the spell-range cache.
  ctx.onMutation?.();
}

/**
 * Patch a single combatant by id atomically.
 *
 * - Maps `combatantsRef.current` applying `patch` to the matching id.
 * - Syncs `enemiesRef.current` and `battleEnemiesRef.current` (when the
 *   id is in `battleStartIds`).
 * - Patches the matching {@link CombatantEntry} in `turnOrderRef.current`
 *   (spreading `patch` over the entry) and syncs `setTurnOrder`.
 * - Calls `setEnemies` and `setBattleEnemies` with the new arrays.
 *
 * Atomic: all next-arrays are computed first, then refs are assigned,
 * then setters are called.
 */
export function updateCombatant(
  ctx: CombatantStoreCtx,
  id: string,
  patch: Partial<Enemy>,
): void {
  const nextCombatants = ctx.combatantsRef.current.map((c) =>
    c.id === id ? { ...c, ...patch } : c,
  );
  const nextEnemies = nextCombatants;

  const inBattle = ctx.battleStartIds.has(id);
  const nextBattleEnemies = inBattle
    ? nextCombatants.filter((c) => ctx.battleStartIds.has(c.id))
    : ctx.battleEnemiesRef.current;

  const nextTurnOrder = ctx.turnOrderRef.current.map((e) =>
    e.id === id ? { ...e, ...patch } : e,
  );

  ctx.combatantsRef.current = nextCombatants;
  ctx.enemiesRef.current = nextEnemies;
  ctx.battleEnemiesRef.current = nextBattleEnemies;
  ctx.turnOrderRef.current = nextTurnOrder;

  ctx.setEnemies(() => nextEnemies);
  ctx.setBattleEnemies(() => nextBattleEnemies);
  ctx.setTurnOrder(() => nextTurnOrder);

  // DEV divergence guard — self-announces if the enemies-state mirror
  // ever drifts from combatantsRef after this mutation.
  assertNoDivergence("updateCombatant", ctx, nextCombatants, nextEnemies);

  // 1B: structural version bump via store onMutation hook. Fired AFTER the
  // atomic mutation completes so WX can invalidate the spell-range cache.
  ctx.onMutation?.();
}

/**
 * Bulk-replace the combatant set atomically.
 *
 * - Sets `combatantsRef.current = next`.
 * - When `opts.resetBattle` is true, rebuilds `battleStartIds` from
 *   `next` (every id becomes a battle participant) — used for
 *   battle-start teleport. When false, preserves the existing
 *   `battleStartIds` — used for world init and exploration-movement
 *   bulk maps.
 * - Syncs all mirrors (`enemiesRef`, `battleEnemiesRef`,
 *   `turnOrderRef`) and the three setters.
 *
 * The turn-order mirror is rebuilt from `next` restricted to the
 * (possibly rebuilt) `battleStartIds`, so the queue reflects exactly the
 * combatants that are in the current battle.
 *
 * Atomic: all next-arrays are computed first, then refs are assigned,
 * then setters are called.
 */
export function syncCombatants(
  ctx: CombatantStoreCtx,
  next: Enemy[],
  opts?: SyncCombatantsOpts,
): void {
  const resetBattle = opts?.resetBattle ?? false;

  if (resetBattle) {
    ctx.battleStartIds = new Set(next.map((c) => c.id));
  }

  const nextEnemies = next;
  const nextBattleEnemies = next.filter((c) => ctx.battleStartIds.has(c.id));
  const nextTurnOrder = nextBattleEnemies.map((c) => toCombatantEntry(c));

  ctx.combatantsRef.current = nextEnemies;
  ctx.enemiesRef.current = nextEnemies;
  ctx.battleEnemiesRef.current = nextBattleEnemies;
  ctx.turnOrderRef.current = nextTurnOrder;

  ctx.setEnemies(() => nextEnemies);
  ctx.setBattleEnemies(() => nextBattleEnemies);
  ctx.setTurnOrder(() => nextTurnOrder);

  // DEV divergence guard — self-announces if the enemies-state mirror
  // ever drifts from combatantsRef after this mutation.
  assertNoDivergence("syncCombatants", ctx, nextEnemies, nextEnemies);

  // 1B: structural version bump via store onMutation hook. Fired AFTER the
  // atomic mutation completes so WX can invalidate the spell-range cache.
  ctx.onMutation?.();
}

/**
 * Derive the battle-enemies view: the subset of `combatantsRef.current`
 * whose id is in `battleStartIds`. This is the canonical `battleEnemies`
 * value — kept as a derived view (never stored as the source of truth)
 * so the reads at WX 10611 (defeatedList) and WX 12121 (boss-AI
 * battleEnemiesRef lookup) keep working against the mirror that the
 * store helpers maintain.
 */
export function deriveBattleEnemies(ctx: CombatantStoreCtx): Enemy[] {
  return ctx.combatantsRef.current.filter((c) => ctx.battleStartIds.has(c.id));
}

/**
 * Reset the combatant store to empty atomically. This is the canonical
 * reset for entering safe maps (death realm, rest map, exploration
 * transitions).
 *
 * - Clears `combatantsRef.current` to `[]` (the source of truth).
 * - Clears `battleStartIds` (no combatants ⇒ no battle participants).
 * - Syncs every mirror (`enemiesRef`, `battleEnemiesRef`,
 *   `turnOrderRef`) to `[]`.
 * - Routes the clear through `ctx.setEnemies(() => [])` so the React
 *   `enemies` state and `combatantsRef` stay in lockstep. Also fires
 *   `setBattleEnemies` and `setTurnOrder` for the mirrors.
 *
 * Atomic: refs are assigned first, then setters are called. The
 * `currentTurnIndexRef` is intentionally NOT touched here — turn-index
 * repositioning is the caller's responsibility (the turn-queue leg of
 * `removeCombatant` is the only place that adjusts it).
 */
export function resetCombatantStore(ctx: CombatantStoreCtx): void {
  const nextCombatants: Enemy[] = [];
  const nextEnemies: Enemy[] = nextCombatants;
  const nextBattleEnemies: Enemy[] = nextCombatants;
  const nextTurnOrder: CombatantEntry[] = [];

  ctx.battleStartIds.clear();

  // Assign refs first so any synchronous reader sees the cleared state.
  ctx.combatantsRef.current = nextCombatants;
  ctx.enemiesRef.current = nextEnemies;
  ctx.battleEnemiesRef.current = nextBattleEnemies;
  ctx.turnOrderRef.current = nextTurnOrder;

  // Then fire the React state updates — routing the clear through
  // setEnemies keeps the enemies state and combatantsRef in lockstep.
  ctx.setEnemies(() => nextEnemies);
  ctx.setBattleEnemies(() => nextBattleEnemies);
  ctx.setTurnOrder(() => nextTurnOrder);

  // DEV divergence guard — self-announces if the enemies-state mirror
  // ever drifts from combatantsRef after this reset.
  assertNoDivergence("resetCombatantStore", ctx, nextCombatants, nextEnemies);
}

/**
 * Canonical live-combatants accessor. Returns `combatantsRef.current` as
 * the single source of truth for ALL interaction reads (click
 * hit-test, damage lookup, hover, collision, AI context).
 *
 * This replaces direct reads of the `enemies` React state variable:
 * the React state is a render-scheduled snapshot, while the ref is the
 * synchronous, always-current array the engine reads against. Routing
 * every interaction read through this accessor guarantees the engine
 * never observes a stale render snapshot.
 *
 * Returns the live array by reference — callers MUST treat it as
 * read-only. Mutate via the store helpers (`addCombatant`,
 * `removeCombatant`, `updateCombatant`, `syncCombatants`,
 * `resetCombatantStore`).
 */
export function getLiveCombatants(ctx: CombatantStoreCtx): Enemy[] {
  return ctx.combatantsRef.current;
}

/**
 * Dev-gated synchronous state dump for debugging the store's atomic
 * updates. Prints a `[STATE-SYNC]` block with the lengths and ids of
 * every mirror plus the `activeHostilesRemaining` result. No-op in
 * production builds (`import.meta.env.DEV` is false).
 *
 * Format per line:
 *   [STATE-SYNC] <label> enemies=N ids=[...] battleEnemies=N ids=[...]
 *   turnOrder=N ids=[...] hostiles=K
 */
export function dumpStateSync(label: string, ctx: CombatantStoreCtx): void {
  if (!import.meta.env?.DEV) return;

  const ids = (arr: Enemy[]): string[] => arr.map((c) => c.id);
  const turnIds = ctx.turnOrderRef.current.map((e) => e.id);
  const hostiles = activeHostilesRemaining(ctx.combatantsRef.current);

  // eslint-disable-next-line no-console
  console.log(
    `[STATE-SYNC] ${label} ` +
      `enemies=${ctx.enemiesRef.current.length} ids=[${ids(
        ctx.enemiesRef.current,
      ).join(",")}] ` +
      `battleEnemies=${ctx.battleEnemiesRef.current.length} ids=[${ids(
        ctx.battleEnemiesRef.current,
      ).join(",")}] ` +
      `turnOrder=${ctx.turnOrderRef.current.length} ids=[${turnIds.join(
        ",",
      )}] ` +
      `hostiles=${hostiles}`,
  );
}
