/**
 * Player-cast resource + live geometry plan.
 *
 * Highlight / sprite / touch / Attack Nearest / keyboard (S) all reach
 * `executeCastAttempt`. AP + cooldown used to be re-derived at each call
 * site (raw `apCost`, then `applyApCost`, then a separate cooldown map
 * read). This module is the single preview+execute resource gate; live
 * geometry stays in `isTileCastableLive`.
 */

import type { Enemy, SpellConfig } from "../types/gameTypes.ts";
import { isSpellOnCooldown } from "../utils/challengeCompletion.ts";
import {
  type BarrierTiles,
  type CasterPosition,
  type TileCastableResult,
  type TileType,
  isTileCastableLive,
  resolveCastApCost,
  shouldExecuteLiveCast,
} from "./targeting.ts";

export type PlayerCastResourceDecision =
  | { ok: true; apCost: number }
  | { ok: false; reason: "on_cooldown" | "no_ap"; apCost: number };

/**
 * Attack Nearest button, tile/sprite execute, and keyboard S share this
 * AP + cooldown check. `applyApCost` runs once so Arcane Surge preview
 * cannot disagree with the debit.
 */
export function planPlayerCastResources(args: {
  currentAp: number;
  baseApCost: number;
  cooldownTurnsRemaining: unknown;
  applyApCost?: (base: number) => number;
}): PlayerCastResourceDecision {
  const apCost = resolveCastApCost(args.baseApCost, args.applyApCost);
  if (isSpellOnCooldown(args.cooldownTurnsRemaining)) {
    return { ok: false, reason: "on_cooldown", apCost };
  }
  const have = Math.max(0, Math.floor(Number(args.currentAp) || 0));
  if (have < apCost) {
    return { ok: false, reason: "no_ap", apCost };
  }
  return { ok: true, apCost };
}

export type PlayerCastAttemptPlan =
  | { ok: true; apCost: number; live: TileCastableResult }
  | {
      ok: false;
      reason: string;
      apCost: number;
      live: TileCastableResult;
    };

/**
 * Execute-path plan: resources first (same order as the previous
 * `executeCastAttempt` body), then the live tile gate so a caller that
 * skipped `probeLiveCast` cannot spend AP on an illegal tile.
 */
export function planPlayerCastAttempt(args: {
  spell: SpellConfig;
  caster: CasterPosition;
  tile: { x: number; y: number };
  liveCombatants: Enemy[];
  mapTiles: TileType[][];
  effectiveRange: number;
  barrierTiles?: BarrierTiles;
  currentAp: number;
  baseApCost: number;
  cooldownTurnsRemaining: unknown;
  applyApCost?: (base: number) => number;
}): PlayerCastAttemptPlan {
  const resources = planPlayerCastResources({
    currentAp: args.currentAp,
    baseApCost: args.baseApCost,
    cooldownTurnsRemaining: args.cooldownTurnsRemaining,
    applyApCost: args.applyApCost,
  });
  const live = isTileCastableLive(
    args.spell,
    args.caster,
    args.tile,
    args.liveCombatants,
    args.mapTiles,
    args.effectiveRange,
    args.barrierTiles,
  );
  if (!resources.ok) {
    return {
      ok: false,
      reason: resources.reason,
      apCost: resources.apCost,
      live,
    };
  }
  if (!shouldExecuteLiveCast(live)) {
    return { ok: false, reason: live.reason, apCost: 0, live };
  }
  return { ok: true, apCost: resources.apCost, live };
}

export function playerCastAttemptResult(
  plan: PlayerCastAttemptPlan,
): "ok" | "on_cooldown" | "no_ap" | "abort" {
  if (plan.ok) return "ok";
  if (plan.reason === "on_cooldown") return "on_cooldown";
  if (plan.reason === "no_ap") return "no_ap";
  return "abort";
}

/**
 * Tile/touch used to abort when the wallet was 0, before reading the
 * spell's cost. Timestep is 0 AP, so a highlighted self tile could not
 * execute while sprite-click / {@link planPlayerCastAttempt} still could.
 * Use this (or skip the extra gate and let {@link planPlayerCastAttempt}
 * run) so empty AP only blocks positive-cost casts.
 */
export function shouldRejectCastForMissingAp(args: {
  currentAp: number;
  baseApCost: number;
  applyApCost?: (base: number) => number;
}): boolean {
  const planned = planPlayerCastResources({
    currentAp: args.currentAp,
    baseApCost: args.baseApCost,
    cooldownTurnsRemaining: 0,
    applyApCost: args.applyApCost,
  });
  return !planned.ok && planned.reason === "no_ap";
}
