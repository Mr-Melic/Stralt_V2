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
