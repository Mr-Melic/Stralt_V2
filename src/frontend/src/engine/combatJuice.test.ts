import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  juiceScreenFromTile,
  spawnDamageAtTile,
  triggerDeathAtTile,
} from "./combatJuice.ts";
import type { DamageKind } from "./effects.ts";

function fakeScreen(gridX: number, gridY: number): { x: number; y: number } {
  return { x: gridX * 10 + 5, y: gridY * 20 + 7 };
}

describe("combatJuice screen-space anchors", () => {
  it("projects grid tiles through toScreen instead of passing raw coords", () => {
    const pos = juiceScreenFromTile(fakeScreen, 3, 4);
    assert.deepEqual(pos, { x: 35, y: 87 });
    assert.notEqual(pos.x, 3);
    assert.notEqual(pos.y, 4);
  });

  it("spawns damage numbers at the projected tile, never at (0, 0) for a non-origin tile", () => {
    const calls: Array<{
      x: number;
      y: number;
      value: number;
      kind: DamageKind;
    }> = [];
    spawnDamageAtTile(
      {
        spawnDamageNumber: (x, y, value, kind) => {
          calls.push({ x, y, value, kind });
        },
      },
      fakeScreen,
      3,
      4,
      12,
      "crit",
    );
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0], { x: 35, y: 87, value: 12, kind: "crit" });
    assert.notEqual(calls[0].x, 0);
    assert.notEqual(calls[0].y, 0);
  });

  it("triggers death shatter at the projected tile, not raw grid x/y", () => {
    const calls: Array<{ id: string; x: number; y: number }> = [];
    triggerDeathAtTile(
      {
        triggerDeath: (entityId, x, y) => {
          calls.push({ id: entityId, x, y });
        },
      },
      fakeScreen,
      "rat-1",
      8,
      2,
    );
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0], { id: "rat-1", x: 85, y: 47 });
  });

  it("no-ops when the effects manager is missing", () => {
    assert.doesNotThrow(() =>
      spawnDamageAtTile(null, fakeScreen, 1, 1, 4, "heal"),
    );
    assert.doesNotThrow(() =>
      triggerDeathAtTile(undefined, fakeScreen, "x", 1, 1),
    );
  });
});
