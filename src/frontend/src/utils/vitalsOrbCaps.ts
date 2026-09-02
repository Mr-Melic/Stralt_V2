/**
 * Side-panel vitals jewels used hardcoded HP 100 / AP 6 / MP 4.
 * After the first level-up (or a 10 AP starter) the fill overflowed.
 *
 * Caps come from the live character record. Combat numbers are unchanged.
 */

export function toVitalsCap(n: number): number {
  const v = Math.floor(Number(n) || 0);
  return v > 0 ? v : 1;
}

export function vitalsOrbCaps(input: {
  maxHp: number;
  maxAp: number;
  maxMp: number;
}): { hp: number; ap: number; mp: number } {
  return {
    hp: toVitalsCap(input.maxHp),
    ap: toVitalsCap(input.maxAp),
    mp: toVitalsCap(input.maxMp),
  };
}

/** Mini-bar width percent. Never exceeds 100 even if a buff raises current. */
export function vitalsOrbFillPct(current: number, max: number): number {
  const cap = toVitalsCap(max);
  const cur = Math.max(0, Number(current) || 0);
  return Math.min(100, (cur / cap) * 100);
}
