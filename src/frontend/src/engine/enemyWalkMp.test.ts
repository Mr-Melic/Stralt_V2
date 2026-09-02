import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { enemyWalkCostPerTile } from "./enemyWalkMp.ts";
import { mapModifierRegistry } from "./mapModifiers.ts";

const ctx = { log: () => {}, rng: () => 0 };

describe("enemyWalkCostPerTile", () => {
  it("matches the registry MP doublers the player highlight already uses", () => {
    assert.equal(enemyWalkCostPerTile({}), 1);
    assert.equal(enemyWalkCostPerTile({ slimeFlood: true }), 2);
    assert.equal(enemyWalkCostPerTile({ frozenTerrain: true }), 2);
    assert.equal(
      enemyWalkCostPerTile({ slimeFlood: true, frozenTerrain: true }),
      4,
    );
    assert.equal(
      enemyWalkCostPerTile({ frozenTerrain: true }),
      mapModifierRegistry.applyMpCost(1, new Set(["frozen_terrain"]), ctx),
    );
    assert.equal(
      enemyWalkCostPerTile({ slimeFlood: true, frozenTerrain: true }),
      mapModifierRegistry.applyMpCost(
        1,
        new Set(["slime_flood", "frozen_terrain"]),
        ctx,
      ),
    );
  });
});
