/**
 * engine/portalRules.ts
 *
 * Pure helpers that decide which portals may spawn on a generated map while a
 * dungeon or boss-rush run is active. Keeping this logic in a single pure
 * module lets WorldExploration.tsx call one function instead of scattering
 * mode checks across the map-generation / portal-spawn code.
 *
 * Section 2 — Dungeon & Boss Rush Run Integrity:
 *  - While a run is active, maps contain ONLY the run's progression portal.
 *  - No regular/colored portals, no dungeon-entry portals, no boss-rush-entry
 *    portals, no death-realm portals.
 */

/** Coarse portal kind identifiers used by the spawn code. */
export type PortalKind =
  | "regular"
  | "dungeonEntry"
  | "bossRushEntry"
  | "deathRealm"
  | "progression"
  | "white";

/** Run mode the player is currently inside (if any). */
export type RunMode = "none" | "dungeon" | "bossRush";

/**
 * The portal kind that advances a dungeon or boss-rush run to the next room /
 * depth. Exported as a constant so spawn code and tests reference one source
 * of truth instead of repeating the string literal "progression".
 */
export const PROGRESSION_PORTAL_KIND: PortalKind = "progression";

/**
 * Inputs the spawn code already has at the point it decides which portals to
 * generate. Kept intentionally small so the helper stays pure and testable.
 */
export interface PortalFilterInput {
  /** Active run mode; "none" means free exploration. */
  runMode: RunMode;
  /**
   * Whether every enemy on the current run map has been defeated. The
   * progression portal is only usable (and only spawned) when this is true.
   */
  mapCleared: boolean;
  /** The full set of portals the map generator proposed for this map. */
  candidates: PortalKind[];
}

/**
 * Decide the final portal set for a generated map.
 *
 * Rules:
 *  - Free exploration (runMode === "none"): pass candidates through unchanged.
 *  - Active run: keep ONLY the progression portal, and only when the map is
 *    cleared. While the map is not yet cleared, return an empty list so no
 *    portal spawns at all (the way forward is locked until the last enemy
 *    dies).
 */
export function filterRunPortals(input: PortalFilterInput): PortalKind[] {
  const { runMode, mapCleared, candidates } = input;

  if (runMode === "none") {
    return candidates;
  }

  // Inside a dungeon or boss-rush run: suppress every non-progression portal.
  if (!mapCleared) {
    return [];
  }

  return candidates.includes("progression") ? ["progression"] : [];
}

/**
 * Convenience predicate: should a portal of `kind` be suppressed right now?
 * Useful for the spawn loop when it builds portals one at a time.
 */
export function shouldSuppressPortal(
  kind: PortalKind,
  runMode: RunMode,
  mapCleared: boolean,
): boolean {
  if (runMode === "none") return false;
  if (kind === "progression") return !mapCleared;
  return true;
}

/**
 * Whether the progression portal should render in its locked (dimmed) style.
 * Inside a run we still want to *show* the locked progression portal even
 * before the map is cleared, so the player understands the goal — but it must
 * not be usable. The spawn code can use this to pick the locked visual.
 */
export function isProgressionLocked(
  runMode: RunMode,
  mapCleared: boolean,
): boolean {
  return runMode !== "none" && !mapCleared;
}

/**
 * Unlock-on-clear gate for the run progression portal. Returns true only when
 * a run is actually active (bossRush or dungeon) AND the current map has been
 * fully cleared. This is the positive counterpart to {@link isProgressionLocked}
 * and the predicate the spawn code should consult before emitting an unlocked
 * progression portal (as opposed to a locked visual or no portal at all).
 *
 * Returns false during free exploration (runMode === "none") — outside a run
 * there is no progression portal to unlock.
 */
export function isProgressionPortalUnlocked(
  runMode: RunMode,
  mapCleared: boolean,
): boolean {
  return (runMode === "bossRush" || runMode === "dungeon") && mapCleared;
}

/**
 * Derive the current run mode from the two active-run flags. Boss rush takes
 * priority over the dungeon chain (the two are mutually exclusive in practice,
 * but the precedence is explicit here). Returns "none" during free exploration.
 */
export function getRunMode(
  bossRushActive: boolean,
  dungeonChainActive: boolean,
): RunMode {
  if (bossRushActive) return "bossRush";
  if (dungeonChainActive) return "dungeon";
  return "none";
}

/** Shape of the run-state refs the reset helper touches. */
export interface RunStateRefs {
  bossRushActiveRef: { current: boolean };
  dungeonChainActiveRef: { current: boolean };
  dungeonChainDepthRef: { current: number };
  dungeonChainMaxDepthRef: { current: number };
  /** Aborts an in-progress boss rush (no-op when no rush is active). */
  abortBossRush: () => Promise<void>;
  /** React HUD / multiplier state — refs alone leave these stale after death. */
  setDungeonChainActive?: (active: boolean) => void;
  setDungeonChainDepth?: (depth: number) => void;
  setDungeonChainMaxDepth?: (maxDepth: number) => void;
  dungeonDokaMultiplierRef?: { current: number };
}

const DUNGEON_DOKA_MULTIPLIERS = [1, 1.5, 2.0, 2.5, 3.0, 4.0];

/**
 * Doka multiplier for a dungeon-chain floor. Drive this from the live refs
 * at reward time — React state can stay true after resetRunState zeroes refs,
 * which used to inflate overworld kills 1.5×–4× until the next remount.
 */
export function dungeonDokaMultiplierFor(
  active: boolean,
  depth: number,
): number {
  if (!active) return 1;
  const safeDepth = Math.max(0, Math.floor(Number(depth) || 0));
  return DUNGEON_DOKA_MULTIPLIERS[Math.min(safeDepth, 5)] ?? 1;
}

export interface DungeonChainSnapshot {
  active: boolean;
  depth: number;
  maxDepth: number;
}

export type DungeonChainPortalAction =
  | { kind: "enter" }
  | { kind: "progress"; nextDepth: number }
  | { kind: "complete"; bonus: number }
  | { kind: "none" };

/**
 * Read dungeon-chain refs before cleanupMap. cleanupMap always zeroes these
 * refs (death/flee must not carry a run onto the next map). A progression
 * portal is not a flee — deciding enter/progress/complete from the wiped
 * refs drops the chain, generates an overworld map, and never pays the
 * completion bonus.
 */
export function snapshotDungeonChain(refs: {
  dungeonChainActiveRef: { current: boolean };
  dungeonChainDepthRef: { current: number };
  dungeonChainMaxDepthRef: { current: number };
}): DungeonChainSnapshot {
  return {
    active: refs.dungeonChainActiveRef.current,
    depth: refs.dungeonChainDepthRef.current,
    maxDepth: refs.dungeonChainMaxDepthRef.current,
  };
}

export function dungeonChainCompletionBonus(maxDepth: number): number {
  return Math.max(0, maxDepth) * 50;
}

/**
 * Decide the dungeon-chain step from a pre-cleanup snapshot.
 * Post-cleanup zeros always yield "none" (or "enter" on a dungeon-entry
 * portal) — never progress/complete — which is the bug this snapshot avoids.
 */
export function decideDungeonChainPortal(
  isDungeonEntry: boolean,
  snap: DungeonChainSnapshot,
): DungeonChainPortalAction {
  if (isDungeonEntry && !snap.active) return { kind: "enter" };
  if (!snap.active) return { kind: "none" };
  if (snap.depth >= snap.maxDepth) {
    return {
      kind: "complete",
      bonus: dungeonChainCompletionBonus(snap.maxDepth),
    };
  }
  return { kind: "progress", nextDepth: snap.depth + 1 };
}

/**
 * Reset every piece of run state before a flow that must see free-exploration
 * mode (e.g. the player-death → Death Realm transition). Clears the boss-rush
 * flag and aborts the rush, then clears the dungeon-chain flag and zeroes its
 * depth/max-depth counters. Safe to call when no run is active.
 */
export function resetRunState(refs: RunStateRefs): void {
  if (refs.bossRushActiveRef.current) {
    refs.bossRushActiveRef.current = false;
    void refs.abortBossRush();
  }
  refs.dungeonChainActiveRef.current = false;
  refs.dungeonChainDepthRef.current = 0;
  refs.dungeonChainMaxDepthRef.current = 0;
  refs.setDungeonChainActive?.(false);
  refs.setDungeonChainDepth?.(0);
  refs.setDungeonChainMaxDepth?.(0);
  if (refs.dungeonDokaMultiplierRef) {
    refs.dungeonDokaMultiplierRef.current = 1;
  }
}

/**
 * Complete a run successfully (player cleared the final boss-rush room or the
 * last dungeon-chain depth). This is the NON-penalty counterpart to the
 * death-flow reset: it reuses `resetRunState` to clear the boss-rush flag,
 * abort the rush, and zero the dungeon-chain flag/depth/max-depth counters —
 * but it does NOT apply the death penalty (XP 20% / Doka 40%). Rewards earned
 * during the run stay with the player. After this call the world is back in
 * free-exploration mode so the next map can generate normally.
 *
 * Flags reset (delegated to resetRunState):
 *  - bossRushActiveRef → false (and abortBossRush() invoked)
 *  - dungeonChainActiveRef → false
 *  - dungeonChainDepthRef → 0
 *  - dungeonChainMaxDepthRef → 0
 */
export function completeRun(refs: RunStateRefs): void {
  resetRunState(refs);
}

/**
 * Whether a white "sanctuary" portal should spawn on the just-cleared run map.
 * A white portal leads the player back to the rest map (safe zone) after a
 * successful run completion. Returns true only when the run that just ended
 * was actually completed (not aborted, not fled, not still in progress).
 *
 * @param bossRushComplete  true when the final boss-rush room was cleared
 * @param dungeonComplete   true when the final dungeon-chain depth was cleared
 */
export function shouldSpawnWhitePortal(
  bossRushComplete: boolean,
  dungeonComplete: boolean,
): boolean {
  return bossRushComplete || dungeonComplete;
}

/**
 * Colocate a pending white sanctuary portal with the player spawn.
 *
 * Dungeon-chain completion used to hardcode `(0, 0)`. Fortress corners and
 * chessboard even/even cells wall that tile, and entry is coordinate-based
 * (`portals.find` on player position), so the advertised sanctuary gateway
 * was unwalkable. Boss-rush completion already places the portal on
 * `whiteSpawn`; this helper is the same contract.
 */
export function placeWhitePortalAtSpawn<T extends { x: number; y: number }>(
  portal: T,
  spawn: { x: number; y: number },
): T {
  return { ...portal, x: spawn.x, y: spawn.y };
}

/**
 * Publish a generated map to the RAF ref before React state.
 * Final Boss Rush / run-complete white maps used to call only setCurrentMap,
 * so the canvas kept drawing the pre-victory room.
 */
export function publishCurrentMap<T>(mapRef: { current: T | null }, map: T): T {
  mapRef.current = map;
  return map;
}

/**
 * Rest-exit `cleanupMap` zeroes dungeon refs, then this path re-arms them.
 * Depth must be written on the ref (not only React state) so
 * `generateEnemies(..., depth)` and later progression snapshots see floor 1.
 */
export function shouldArmDungeonChainOnRestExit(
  restExitType: string | undefined,
): boolean {
  return restExitType === "dungeon";
}

/** Dungeon rest-exit starts at depth 1; overworld/boss rest-exit stay 0. */
export function restExitSpawnDepth(restExitType: string | undefined): number {
  return restExitType === "dungeon" ? 1 : 0;
}

/**
 * During a run, any non-special portal is the way forward — including the
 * unmarked fallback cell when generateRandomMap exhausts attempts.
 * White / rest / entry portals must not steal room-advance.
 */
export function isRunProgressionPortal(
  portal: {
    isProgressionPortal?: boolean;
    kind?: string;
    isBossRushPortal?: boolean;
    isRestPortal?: boolean;
    isRestExit?: boolean;
    isBossPortal?: boolean;
    isDungeonEntry?: boolean;
    isWhitePortal?: boolean;
    color?: string;
  },
  runMode: RunMode,
): boolean {
  if (runMode === "none") return false;
  if (portal.isProgressionPortal || portal.kind === PROGRESSION_PORTAL_KIND) {
    return true;
  }
  if (
    portal.isBossRushPortal ||
    portal.color === "bossRush" ||
    portal.isRestPortal ||
    portal.isRestExit ||
    portal.isBossPortal ||
    portal.isDungeonEntry ||
    portal.isWhitePortal ||
    portal.color === "white"
  ) {
    return false;
  }
  return true;
}
