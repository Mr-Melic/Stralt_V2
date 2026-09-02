/**
 * The App-root recap overlay is pointer-events: none so HUD heal / shop /
 * feats stay clickable while applyRewards is in flight. Canvas walk and
 * hazard tiles sit under that overlay and used to receive those clicks.
 *
 * Gate world input (mouse + touch) when the recap is showing. Do not use
 * this to block HUD buttons — those must keep pointer-events: auto.
 */

export function shouldIgnoreWorldInputDuringRecap(
  recapVisible: boolean,
  victoryPersistPending = false,
): boolean {
  return recapVisible === true || victoryPersistPending === true;
}
