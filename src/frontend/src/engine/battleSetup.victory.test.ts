import assert from "node:assert/strict";
import { shouldAllowBattleTrigger, shouldAwardVictory } from "./battleSetup.ts";

assert.equal(
  shouldAwardVictory({
    inBattle: true,
    deathTriggered: false,
    battleStartIdsSize: 2,
    hostilesRemaining: 0,
  }),
  true,
  "live fight with no hostiles left awards victory",
);

assert.equal(
  shouldAwardVictory({
    inBattle: true,
    deathTriggered: true,
    battleStartIdsSize: 2,
    hostilesRemaining: 0,
  }),
  false,
  "player death must not award victory when the last hostile also dies",
);

assert.equal(
  shouldAwardVictory({
    inBattle: false,
    deathTriggered: false,
    battleStartIdsSize: 2,
    hostilesRemaining: 0,
  }),
  false,
  "out-of-battle leftover empty roster must not award victory",
);

assert.equal(
  shouldAwardVictory({
    inBattle: true,
    deathTriggered: false,
    battleStartIdsSize: 0,
    hostilesRemaining: 0,
  }),
  false,
  "pre-battle empty roster must not award victory",
);

assert.equal(
  shouldAwardVictory({
    inBattle: true,
    deathTriggered: false,
    battleStartIdsSize: 2,
    hostilesRemaining: 1,
  }),
  false,
  "living hostiles must not award victory",
);

assert.equal(
  shouldAllowBattleTrigger({
    inBattle: true,
    inBattleRef: false,
    transitionInProgress: false,
  }),
  false,
  "stale React inBattle after cleanupBattle must block the next encounter",
);

assert.equal(
  shouldAllowBattleTrigger({
    inBattle: false,
    inBattleRef: true,
    transitionInProgress: false,
  }),
  false,
  "in-battle ref must still block a world encounter",
);

assert.equal(
  shouldAllowBattleTrigger({
    inBattle: false,
    inBattleRef: false,
    transitionInProgress: true,
  }),
  false,
  "map transition must not start a fight",
);

assert.equal(
  shouldAllowBattleTrigger({
    inBattle: false,
    inBattleRef: false,
    transitionInProgress: false,
  }),
  true,
  "room-clear / death must drop both inBattle flags so the next room can start",
);

assert.equal(
  shouldAllowBattleTrigger({
    inBattle: false,
    inBattleRef: false,
    transitionInProgress: false,
    deathRealmPending: true,
  }),
  false,
  "pending Death Realm after lava/spike death must not start a fight",
);

assert.equal(
  shouldAllowBattleTrigger({
    inBattle: false,
    inBattleRef: false,
    transitionInProgress: false,
    deathRealmPending: false,
  }),
  true,
  "Death Realm already loaded must allow the next encounter",
);

console.log("battleSetup.victory.test: ok");
