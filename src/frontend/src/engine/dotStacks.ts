// dotStacks.ts — Stacking Damage-over-Time effect math.
//
// Same-type DoTs stack additively: applying a second burn sums their per-turn
// damage (8 + 8 -> 16). Each DoT stack keeps its own independent duration; the
// tick reduces each stack's duration individually and drops expired stacks.
//
// Non-DoT buffs/debuffs retain their existing replace-or-refresh behavior —
// this module is ONLY consulted for type === "dot" effects.
//
// Pure functions, no React/DOM. Import ActiveEffect from ../types/gameTypes.

import type { ActiveEffect } from "../types/gameTypes";

/**
 * Generate a unique stackId for a DoT stack entry.
 * Format: `dot-<effectName>-<timestamp>-<random>`.
 */
function makeStackId(effect: ActiveEffect): string {
  return `dot-${effect.effectName}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Append a new DoT stack entry to the effects array WITHOUT replacing any
 * existing same-name effect. Each application accumulates as an independent
 * stack with its own duration.
 *
 * The incoming effect is assigned a stackId (preserving any caller-provided
 * id/stackId when present, otherwise generating a fresh one) so React keys
 * remain unique across multiple stacks of the same DoT type.
 */
export function appendDotStack(
  effects: ActiveEffect[],
  effect: ActiveEffect,
): ActiveEffect[] {
  const stackId = effect.stackId ?? effect.id ?? makeStackId(effect);
  const stack: ActiveEffect = { ...effect, stackId };
  return [...effects, stack];
}

/**
 * Sum the per-turn damage of all active DoT stacks on the given target.
 * Returns 0 when there are no active DoT stacks for that target.
 */
export function sumDotTicks(effects: ActiveEffect[], targetId: string): number {
  let total = 0;
  for (const eff of effects) {
    if (
      eff.targetId === targetId &&
      eff.type === "dot" &&
      eff.dotDamagePerTurn !== undefined &&
      eff.dotDamagePerTurn > 0
    ) {
      total += eff.dotDamagePerTurn;
    }
  }
  return total;
}

/**
 * Result of ticking all DoT stacks on a target for one turn.
 *
 * - `damage`: summed per-turn damage across all stacks (BEFORE RES — RES is
 *   applied by the damage helpers, not here, to avoid double-application).
 * - `remaining`: the surviving (non-expired) DoT stacks with their durations
 *   decremented by 1. Non-DoT effects are passed through untouched.
 * - `perStackDurations`: remaining duration of each DoT stack that was ticked,
 *   in the order they appeared in the input. Expired stacks contribute 0.
 * - `stackCount`: number of DoT stacks that were ticked this turn.
 */
export interface DotTickResult {
  damage: number;
  remaining: ActiveEffect[];
  perStackDurations: number[];
  stackCount: number;
}

/**
 * Tick all DoT stacks on the given target for one turn.
 *
 * Each DoT stack's duration is decremented independently; stacks reaching 0
 * are dropped from `remaining`. The summed per-turn damage is returned in
 * `damage` (RES is NOT applied here — the caller passes it to the damage
 * helper which applies RES once to the summed tick).
 *
 * Non-DoT effects on the same target are NOT touched by this function — the
 * caller is responsible for handling their duration decrement separately.
 * Effects on OTHER targets are passed through unchanged in `remaining`.
 */
export function tickDotStacks(
  effects: ActiveEffect[],
  targetId: string,
): DotTickResult {
  let damage = 0;
  const remaining: ActiveEffect[] = [];
  const perStackDurations: number[] = [];
  let stackCount = 0;

  for (const eff of effects) {
    // Effects on other targets pass through untouched.
    if (eff.targetId !== targetId) {
      remaining.push(eff);
      continue;
    }
    // Non-DoT effects on this target pass through untouched (caller handles).
    if (
      eff.type !== "dot" ||
      eff.dotDamagePerTurn === undefined ||
      eff.dotDamagePerTurn <= 0
    ) {
      remaining.push(eff);
      continue;
    }
    // DoT stack: accumulate damage, decrement duration independently.
    stackCount += 1;
    damage += eff.dotDamagePerTurn;
    const newDur = eff.duration - 1;
    perStackDurations.push(newDur);
    if (newDur > 0) {
      remaining.push({ ...eff, duration: newDur });
    }
    // expired (newDur <= 0) stacks are dropped from `remaining` but still
    // contribute 0 to perStackDurations so the log can show they expired.
  }

  return { damage, remaining, perStackDurations, stackCount };
}
