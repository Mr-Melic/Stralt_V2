/**
 * Overworld enemy wander is invoked from the world RAF.
 * Skip the per-frame enemies.map() when nobody is moving and nobody is due.
 */

export type WanderEnemyProbe = {
  isMoving?: boolean;
  isWandering?: boolean;
  nextMoveTime?: number;
};

export function shouldTickEnemyWander(
  enemies: readonly WanderEnemyProbe[],
  now: number,
): boolean {
  for (const enemy of enemies) {
    if (enemy.isMoving) return true;
    if (
      enemy.isWandering === true &&
      now >= (enemy.nextMoveTime ?? Number.POSITIVE_INFINITY)
    ) {
      return true;
    }
  }
  return false;
}
