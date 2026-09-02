/**
 * engine/statusEffects.ts
 *
 * Pure non-DoT status-effect list math. WorldExploration.applyActiveEffect /
 * processActiveEffects own refs, map-modifier suppression, DoT damage, and
 * battle-log side effects. This module is React-free.
 *
 * DoT stacking and per-stack duration ticks stay in engine/dotStacks.ts.
 * Call mergeIncomingEffect to route type === "dot" there and every other
 * type through replace-or-refresh.
 *
 * StatusEffectBadge formats AP/MP and percent stats differently (always
 * prefixes '+'). Do not reuse formatBattleEffectMagnitude for the badge.
 */

import type { ActiveEffect } from "../types/gameTypes";
import { appendDotStack } from "./dotStacks.ts";

/** Fields getStatModifier actually reads. ActiveEffect and ActiveEffectLike both satisfy this. */
export type StatModifiableEffect = Pick<
  ActiveEffect,
  "targetId" | "type" | "stat" | "modifier"
>;

/**
 * AP and MP are flat additive points. Every other tracked stat (dmg, res,
 * sr, chc, …) is a multiplicative modifier. The keys are 'ap' / 'mp' —
 * 'maxAp' / 'maxMp' must NOT be treated as additive (legacy keys hit the
 * multiplier branch and returned 1, capping restore at 1).
 */
export function isAdditiveResourceStat(stat: string): boolean {
  return stat === "ap" || stat === "mp";
}

/**
 * Combined buff/debuff modifier for `stat` on `targetId`.
 *
 * - AP/MP: sum of matching modifiers (missing modifier counts as 0).
 *   No matching effects → 0.
 * - Other stats: product of matching modifiers (missing modifier counts as 1).
 *   No matching effects → 1.
 * - Only type "buff" | "debuff" contribute. DoT rows are ignored even if
 *   they carry a stat field.
 */
export function getStatModifier(
  targetId: string,
  stat: string,
  effects: readonly StatModifiableEffect[],
): number {
  let multiplier = 1;
  let additive = 0;
  for (const eff of effects) {
    if (eff.targetId !== targetId || eff.stat !== stat) continue;
    if (eff.type === "buff" || eff.type === "debuff") {
      if (isAdditiveResourceStat(stat)) {
        additive += eff.modifier ?? 0;
      } else {
        multiplier *= eff.modifier ?? 1;
      }
    }
  }
  return isAdditiveResourceStat(stat) ? additive : multiplier;
}

/**
 * Replace the first same-name+target effect, or append. Does not stack.
 *
 * Do NOT pass type === "dot" here — same-name DoTs stack via appendDotStack.
 * This function does not inspect `type`; a DoT would replace by name.
 */
export function applyOrRefreshNonDotEffect(
  effects: readonly ActiveEffect[],
  effect: ActiveEffect,
): ActiveEffect[] {
  const existing = effects.findIndex(
    (e) => e.targetId === effect.targetId && e.effectName === effect.effectName,
  );
  if (existing >= 0) {
    const next = [...effects];
    next[existing] = effect;
    return next;
  }
  return [...effects, effect];
}

/**
 * Apply one incoming effect to the live list.
 *
 * - type === "dot": append a new stack (appendDotStack assigns stackId).
 * - otherwise: replace-or-refresh by targetId + effectName.
 */
export function mergeIncomingEffect(
  effects: readonly ActiveEffect[],
  effect: ActiveEffect,
): ActiveEffect[] {
  if (effect.type === "dot") {
    return appendDotStack([...effects], effect);
  }
  return applyOrRefreshNonDotEffect(effects, effect);
}

/**
 * WorldExploration battle-log magnitude (apply + "expired" lines).
 *
 * Percent stats (not AP/MP): modifier 1.25 → "+25%", 0.8 → "-20%", 1 → "0%".
 * AP/MP: modifier 2 → "+2", 0 → "0", -1 → "-1".
 *
 * StatusEffectBadge uses `>= 0` for the '+' prefix (shows "+0" / "+0%").
 * That difference is intentional — do not merge the two formatters.
 */
export function formatBattleEffectMagnitude(
  stat: string,
  modifier: number,
): string {
  if (isAdditiveResourceStat(stat)) {
    return modifier > 0 ? `+${modifier}` : `${modifier}`;
  }
  const pct = Math.round((modifier - 1) * 100);
  return modifier > 1 ? `+${pct}%` : `${pct}%`;
}

export interface NonDotTickResult {
  /** Full list after this target's non-DoT durations were decremented. */
  remaining: ActiveEffect[];
  /**
   * Every non-DoT on `targetId` whose duration was decremented this tick,
   * including rows that are still active (newDur > 0).
   *
   * WorldExploration.processActiveEffects currently logs an "expired" line
   * for each of these that has stat + modifier — not only when the row is
   * dropped. That log wording is characterized here; do not "fix" it in
   * the same change as this extraction.
   */
  decremented: ActiveEffect[];
}

/**
 * Decrement duration on non-DoT effects for `targetId`. Drop rows whose
 * duration reaches 0. Other targets and type === "dot" pass through
 * unchanged (DoT stacks were already ticked by tickDotStacks).
 *
 * A type === "dot" row with no / zero damage is also left untouched here.
 * tickDotStacks likewise passes those through, so they never expire by
 * duration. That interaction is current behaviour — do not change it here.
 */
export function tickNonDotEffects(
  effects: readonly ActiveEffect[],
  targetId: string,
): NonDotTickResult {
  const remaining: ActiveEffect[] = [];
  const decremented: ActiveEffect[] = [];

  for (const eff of effects) {
    if (eff.targetId !== targetId) {
      remaining.push(eff);
      continue;
    }
    if (eff.type === "dot") {
      remaining.push(eff);
      continue;
    }
    const newDur = eff.duration - 1;
    if (newDur > 0) {
      remaining.push({ ...eff, duration: newDur });
    }
    decremented.push(eff);
  }

  return { remaining, decremented };
}
