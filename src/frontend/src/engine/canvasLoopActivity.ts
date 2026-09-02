/**
 * Decorative canvas loops (landing logo, character-select blood drips)
 * must not keep paying 2D work while the tab is hidden. Distinct from
 * the world game RAF, which has its own watchdog and must not change
 * combat timing.
 */

export function shouldRunDecorativeCanvasLoop(
  documentHidden: boolean,
): boolean {
  return !documentHidden;
}
