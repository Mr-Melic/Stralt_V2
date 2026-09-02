// Sound-ready hooks — delegates to the procedural WebAudio SoundEngine.
// Import playSound wherever a game event fires; the exported API (SoundEvent
// type + playSound signature) is stable, so call sites never need to change.

import { soundEngine } from "../engine/soundEngine";

export type SoundEvent =
  | "spell_cast"
  | "spell_hit"
  | "enemy_death"
  | "player_damage"
  | "doka_collected"
  | "map_transition"
  | "battle_start"
  | "battle_end"
  | "level_up"
  | "critical_hit"
  | "combo"
  | "leader_boost";

/**
 * Fire a sound event.
 * Delegates to the procedural SoundEngine (lazy AudioContext, synthesized
 * envelopes). Silent no-op until the first user gesture resumes the context.
 *
 * @param event  The type of game event
 * @param context Optional context string (e.g. spell name, enemy name)
 */
export function playSound(event: SoundEvent, context?: string): void {
  if (import.meta.env.DEV) {
    console.debug("[Sound]", event, context ?? "");
  }
  soundEngine.playEvent(event);
}
