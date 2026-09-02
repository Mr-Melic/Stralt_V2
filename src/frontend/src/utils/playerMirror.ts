/**
 * Player Mirror (`spell-mirror`) is a one-shot reflect of the next
 * single-target enemy spell. spellEngine documents activateMirror as
 * `mirrorUnitsRef.add("player")`. The enemy-cast path consumes that
 * same token. Writing the player's tile key instead made Mirror a
 * 4-AP no-op: nothing ever read the coordinate, and nothing ever
 * wrote `"player"`.
 */

export const PLAYER_MIRROR_KEY = "player";

export function activatePlayerMirror(mirrorUnits: Set<string>): Set<string> {
  mirrorUnits.add(PLAYER_MIRROR_KEY);
  return mirrorUnits;
}

/** True when the incoming single-target spell should bounce. Consumes the shield. */
export function consumePlayerMirror(mirrorUnits: Set<string>): boolean {
  if (!mirrorUnits.has(PLAYER_MIRROR_KEY)) return false;
  mirrorUnits.delete(PLAYER_MIRROR_KEY);
  return true;
}
