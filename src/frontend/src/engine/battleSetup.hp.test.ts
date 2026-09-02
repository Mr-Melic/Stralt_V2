import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  battleWalkHazardDamages,
  hpAfterBossPhase2,
  hpAfterHeal,
  hpAfterIncomingDamage,
  thornedGroundWalkDamage,
  voidRiftWalkDamage,
} from "./battleSetup.ts";

describe("hpAfterIncomingDamage live HP", () => {
  it("subtracts a DoT tick from live HP instead of a mount-time snapshot", () => {
    // processActiveEffects used to close over mount HP (100). After a hit
    // to 10, a 5-dmg tick must land at 5, not restore the player to 95.
    assert.deepEqual(hpAfterIncomingDamage(10, 5), {
      newHp: 5,
      lethal: false,
    });
    assert.notEqual(hpAfterIncomingDamage(10, 5).newHp, 95);
  });

  it("marks a DoT tick lethal from live HP even when a stale snapshot would survive", () => {
    assert.deepEqual(hpAfterIncomingDamage(4, 5), {
      newHp: 0,
      lethal: true,
    });
    assert.equal(hpAfterIncomingDamage(100, 5).lethal, false);
  });
});

describe("battle-walk hazards (mouse and touch must match)", () => {
  it("charges 5 HP per extra tile after the first on Thorned Ground", () => {
    assert.equal(thornedGroundWalkDamage(1), 0);
    assert.equal(thornedGroundWalkDamage(2), 5);
    assert.equal(thornedGroundWalkDamage(4), 15);
    assert.equal(
      battleWalkHazardDamages({
        thornedActive: true,
        pathLength: 3,
        voidRiftActive: false,
        dest: { x: 2, y: 2 },
        riftTile: null,
      }).thornDmg,
      10,
    );
    assert.equal(
      battleWalkHazardDamages({
        thornedActive: false,
        pathLength: 4,
        voidRiftActive: false,
        dest: { x: 2, y: 2 },
        riftTile: null,
      }).thornDmg,
      0,
    );
  });

  it("charges 3 HP only when the destination is the live Void Rift tile", () => {
    assert.equal(voidRiftWalkDamage({ x: 5, y: 5 }, { x: 5, y: 5 }), 3);
    assert.equal(voidRiftWalkDamage({ x: 5, y: 5 }, { x: 4, y: 5 }), 0);
    assert.equal(voidRiftWalkDamage({ x: 5, y: 5 }, null), 0);
    assert.equal(
      battleWalkHazardDamages({
        thornedActive: false,
        pathLength: 1,
        voidRiftActive: true,
        dest: { x: 8, y: 3 },
        riftTile: { x: 8, y: 3 },
      }).riftDmg,
      3,
    );
    assert.equal(
      battleWalkHazardDamages({
        thornedActive: false,
        pathLength: 1,
        voidRiftActive: false,
        dest: { x: 8, y: 3 },
        riftTile: { x: 8, y: 3 },
      }).riftDmg,
      0,
    );
  });
});

describe("hpAfterHeal store contract", () => {
  it("caps at maxHp so a drain/heal cannot inflate past the strip", () => {
    assert.equal(hpAfterHeal(100, 200, 50), 150);
    assert.equal(hpAfterHeal(180, 200, 50), 200);
  });
});

describe("hpAfterBossPhase2 store contract", () => {
  it("doubles live HP/maxHp and full-heals Weeping Pawn", () => {
    assert.deepEqual(hpAfterBossPhase2(200, 200, 2, false), {
      hp: 400,
      maxHp: 400,
    });
    assert.deepEqual(hpAfterBossPhase2(50, 200, 2, false), {
      hp: 100,
      maxHp: 400,
    });
    assert.deepEqual(hpAfterBossPhase2(50, 200, 2, true), {
      hp: 400,
      maxHp: 400,
    });
  });
});
