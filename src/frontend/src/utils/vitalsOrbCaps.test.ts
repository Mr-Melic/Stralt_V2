import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  toVitalsCap,
  vitalsOrbCaps,
  vitalsOrbFillPct,
} from "./vitalsOrbCaps.ts";

describe("vitalsOrbCaps", () => {
  it("uses live maxes instead of the old 100 / 6 / 4 jewels", () => {
    const caps = vitalsOrbCaps({ maxHp: 105, maxAp: 10, maxMp: 5 });
    assert.deepEqual(caps, { hp: 105, ap: 10, mp: 5 });
    assert.notEqual(caps.hp, 100);
    assert.notEqual(caps.ap, 6);
    assert.notEqual(caps.mp, 4);
  });

  it("clamps non-positive or NaN caps to 1 so fill math stays finite", () => {
    assert.equal(toVitalsCap(0), 1);
    assert.equal(toVitalsCap(-4), 1);
    assert.equal(toVitalsCap(Number.NaN), 1);
    assert.deepEqual(
      vitalsOrbCaps({ maxHp: 0, maxAp: -1, maxMp: Number.NaN }),
      {
        hp: 1,
        ap: 1,
        mp: 1,
      },
    );
  });
});

describe("vitalsOrbFillPct", () => {
  it("fills current / live max and never exceeds 100%", () => {
    assert.equal(vitalsOrbFillPct(50, 100), 50);
    assert.equal(vitalsOrbFillPct(10, 10), 100);
    assert.equal(vitalsOrbFillPct(12, 10), 100);
  });

  it("does not treat a 10 AP starter as overflowing a 6 AP jewel", () => {
    assert.equal(vitalsOrbFillPct(10, 6), 100);
    assert.equal(vitalsOrbFillPct(10, 10), 100);
    assert.ok(vitalsOrbFillPct(6, 10) < 100);
  });
});
