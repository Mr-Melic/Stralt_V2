import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldTickEnemyWander } from "./enemyWander.ts";

describe("shouldTickEnemyWander", () => {
  it("skips the update when every enemy is idle and not due", () => {
    assert.equal(
      shouldTickEnemyWander(
        [
          { isMoving: false, isWandering: true, nextMoveTime: 2_000 },
          { isMoving: false, isWandering: true, nextMoveTime: 3_000 },
        ],
        1_000,
      ),
      false,
    );
  });

  it("ticks when at least one enemy is mid-path", () => {
    assert.equal(
      shouldTickEnemyWander(
        [
          { isMoving: false, isWandering: true, nextMoveTime: 2_000 },
          { isMoving: true, isWandering: true, nextMoveTime: 5_000 },
        ],
        1_000,
      ),
      true,
    );
  });

  it("ticks when a wandering enemy reaches nextMoveTime", () => {
    assert.equal(
      shouldTickEnemyWander(
        [{ isMoving: false, isWandering: true, nextMoveTime: 1_000 }],
        1_000,
      ),
      true,
    );
  });

  it("does not treat a missing nextMoveTime as due", () => {
    assert.equal(
      shouldTickEnemyWander([{ isMoving: false, isWandering: true }], 9_999),
      false,
    );
  });
});
