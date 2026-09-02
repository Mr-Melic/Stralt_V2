import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldDeferAchievementUnlockUntilRewardsPersist } from "./adminSafety.ts";
import { clientTrustedVictoryAchievementConditions } from "./victoryAchievements.ts";

const clean = {
  hp: 80,
  mapsVisited: 3,
  groundDokaPickups: 0,
  spellBarCount: 4,
  hasSpellAtLeast5: false,
  critHits: 0,
  pacifist: false,
  betrayal: false,
  doubleBetrayal: false,
  leaderSlain: false,
  bossId: null,
};

describe("clientTrustedVictoryAchievementConditions", () => {
  it("always includes first_battle_win and never wallet/level persist feats", () => {
    const conditions = clientTrustedVictoryAchievementConditions(clean);
    assert.deepEqual(conditions, ["first_battle_win"]);
    for (const condition of conditions) {
      assert.equal(
        shouldDeferAchievementUnlockUntilRewardsPersist(condition),
        false,
      );
    }
  });

  it("Boss Rush room-clear with a leader kill and pacifist win lists those feats", () => {
    const conditions = clientTrustedVictoryAchievementConditions({
      ...clean,
      hp: 1,
      critHits: 5,
      pacifist: true,
      leaderSlain: true,
      bossId: "starved_pawn",
    });
    assert.ok(conditions.includes("first_battle_win"));
    assert.ok(conditions.includes("survive_1hp"));
    assert.ok(conditions.includes("critical_5_in_battle"));
    assert.ok(conditions.includes("pacifist_run"));
    assert.ok(conditions.includes("leader_slayer"));
    assert.ok(conditions.includes("boss_defeated_starved_pawn"));
    assert.equal(conditions.includes("doka_1000"), false);
    assert.equal(conditions.includes("level_10"), false);
  });

  it("omits combat feats when the room-clear snapshot is clean", () => {
    const conditions = clientTrustedVictoryAchievementConditions({
      ...clean,
      mapsVisited: 25,
      groundDokaPickups: 10,
      spellBarCount: 8,
      hasSpellAtLeast5: true,
    });
    assert.deepEqual(conditions, [
      "first_battle_win",
      "explore_25_maps",
      "loot_10_doka",
      "spell_master_8",
      "spell_level_5",
    ]);
    assert.equal(conditions.includes("pacifist_run"), false);
    assert.equal(conditions.includes("leader_slayer"), false);
  });
});
