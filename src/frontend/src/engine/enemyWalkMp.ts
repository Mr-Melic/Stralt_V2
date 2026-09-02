/**
 * Per-tile movement cost for enemy / summon-AI walks.
 *
 * Player highlight already runs `mapModifierRegistry.applyMpCost` (Slime
 * Flood and Frozen Terrain each double). Enemy `computeReachable` used
 * only `isSlimeFlood`, and the summon executor hardcoded `mpCostPerTile: 1`,
 * so Frozen Terrain left AI units walking the full 3-tile budget while
 * the player paid 2 MP/tile.
 *
 * Keep this aligned with the registry onMpCost hooks — do not rebalance
 * the 2× formula.
 */

import { mapModifierRegistry } from "./mapModifiers.ts";

const silentCtx = {
  log: () => {},
  rng: () => 0,
};

export function enemyWalkCostPerTile(opts: {
  slimeFlood?: boolean;
  frozenTerrain?: boolean;
}): number {
  const active = new Set<string>();
  if (opts.slimeFlood) active.add("slime_flood");
  if (opts.frozenTerrain) active.add("frozen_terrain");
  return mapModifierRegistry.applyMpCost(1, active, silentCtx);
}
