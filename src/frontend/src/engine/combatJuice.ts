// combatJuice.ts — Presentation-only helpers that keep JUICE in screen space.
// EffectsManager.draw() plots in the current canvas/CSS transform. Grid
// coordinates must be converted (tileCenter / gridToScreen) before spawn.
// Does NOT touch turn logic, damage math, or the RAF scheduler.

import type { DamageKind } from "./effects.ts";

export type JuiceScreenFn = (
  gridX: number,
  gridY: number,
) => {
  x: number;
  y: number;
};

export interface JuiceDamageSink {
  spawnDamageNumber(
    x: number,
    y: number,
    value: number,
    kind: DamageKind,
  ): void;
}

export interface JuiceDeathSink {
  triggerDeath(entityId: string, x: number, y: number): void;
}

/** Project a board tile into the same space EffectsManager.draw() uses. */
export function juiceScreenFromTile(
  toScreen: JuiceScreenFn,
  tileX: number,
  tileY: number,
): { x: number; y: number } {
  return toScreen(tileX, tileY);
}

/** Spawn a damage/heal number on a tile. No-ops if the effects manager is missing. */
export function spawnDamageAtTile(
  em: JuiceDamageSink | null | undefined,
  toScreen: JuiceScreenFn,
  tileX: number,
  tileY: number,
  value: number,
  kind: DamageKind,
): void {
  if (!em) return;
  const { x, y } = juiceScreenFromTile(toScreen, tileX, tileY);
  em.spawnDamageNumber(x, y, value, kind);
}

/** Shatter VFX on a tile. No-ops if the effects manager is missing. */
export function triggerDeathAtTile(
  em: JuiceDeathSink | null | undefined,
  toScreen: JuiceScreenFn,
  entityId: string,
  tileX: number,
  tileY: number,
): void {
  if (!em) return;
  const { x, y } = juiceScreenFromTile(toScreen, tileX, tileY);
  em.triggerDeath(entityId, x, y);
}
