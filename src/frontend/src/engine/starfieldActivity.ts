/**
 * Pause the root starfield RAF while the world canvas is mounted.
 * The game canvas fills opaque `#0a0c18`, so the starfield is invisible
 * during play but still burned a full 2D RAF + shadowBlur pass.
 */

type Listener = () => void;

const listeners = new Set<Listener>();
let paused = false;

export function setStarfieldPaused(next: boolean): void {
  if (paused === next) return;
  paused = next;
  for (const listener of listeners) listener();
}

export function isStarfieldPaused(): boolean {
  return paused;
}

export function subscribeStarfieldPaused(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * What the root starfield should do this frame / on a visibility or pause flip.
 * `pause_release_gpu`: world canvas covers the starfield — drop the backing
 * store and star list so a mobile rotate during play does not allocate ~250
 * stars or a second full-size 2D buffer (PERF-2026-09-02-049).
 * `pause_keep_buffer`: tab is hidden on landing/select — stop RAF but keep
 * the star list so resume is a single frame, not a createStars hitch.
 */
export type StarfieldLoopPlan =
  | "run"
  | "pause_keep_buffer"
  | "pause_release_gpu";

export function planStarfieldLoop(input: {
  worldPaused: boolean;
  documentHidden: boolean;
}): StarfieldLoopPlan {
  if (input.worldPaused) return "pause_release_gpu";
  if (input.documentHidden) return "pause_keep_buffer";
  return "run";
}
