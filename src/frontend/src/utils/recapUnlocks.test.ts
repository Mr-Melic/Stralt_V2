import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AchievementConfig } from "../types/gameTypes.ts";
import {
  appendRecapUnlock,
  attachRecapUnlocks,
  recapUnlocksFromData,
} from "./recapUnlocks.ts";

const feat = (id: string): AchievementConfig => ({
  id,
  name: id,
  description: "",
  dokaReward: 50,
  condition: id,
  active: true,
});

describe("appendRecapUnlock", () => {
  it("appends a new feat and ignores a duplicate id", () => {
    const first = feat("first_battle_win");
    const once = appendRecapUnlock([], first);
    assert.deepEqual(once, [first]);
    assert.deepEqual(appendRecapUnlock(once, first), [first]);
  });
});

describe("attachRecapUnlocks", () => {
  it("copies the snapshot onto recap data without mutating the source", () => {
    const unlocks = [feat("critical_5_in_battle")];
    const recap = { mapTitle: "room", xpEarned: 20 };
    const attached = attachRecapUnlocks(recap, unlocks);
    assert.equal(attached.mapTitle, "room");
    assert.deepEqual(attached.newlyUnlockedAchievements, unlocks);
    unlocks.push(feat("pacifist_run"));
    assert.equal(attached.newlyUnlockedAchievements.length, 1);
  });
});

describe("recapUnlocksFromData", () => {
  it("prefers an explicit prop, else the recap payload", () => {
    const fromData = [feat("level_10")];
    const fromProp = [feat("doka_1000")];
    assert.deepEqual(recapUnlocksFromData(fromData, fromProp), fromProp);
    assert.deepEqual(recapUnlocksFromData(fromData, []), fromData);
    assert.deepEqual(recapUnlocksFromData(undefined, []), []);
  });
});
