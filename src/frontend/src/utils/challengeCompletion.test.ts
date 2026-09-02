import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { battleWalkHazardDamages } from "../engine/battleSetup.ts";
import {
  type Challenge,
  type ChallengePanelProgress,
  DEFAULT_CHALLENGES,
  applyChallengeDirectHit,
  castFollowUpShouldDebitAp,
  castResultAppliesCooldown,
  castResultSpendsAp,
  challengeFailCopy,
  isChallengeCompleted,
  isChallengeFailed,
  isPlayerHealTargetId,
  isSpellOnCooldown,
  isStrikerChallengeComplete,
  nextSpellCooldownTurns,
  recordChallengeApSpend,
  recordChallengeDamageTaken,
  recordChallengeDirectHit,
  recordChallengeHealFromHpRestore,
  recordChallengeItemHealUsed,
  recordChallengePlayerTurnStart,
  recordChallengeSelfHpLoss,
  recordChallengeWalkHazardDamage,
  recordInBattleChallengeDamage,
  recordInBattleChallengeHealUsed,
  shouldClearSpellAfterApSpend,
  shouldCountOpeningPlayerTurn,
} from "./challengeCompletion.ts";
import {
  addChallengeRewardDeltas,
  challengeXpFromEntries,
  liveBattleChallengePersistEntries,
} from "./challengeRewards.ts";

function progress(
  overrides: Partial<ChallengePanelProgress> = {},
): ChallengePanelProgress {
  return {
    turnCount: 1,
    totalDamage: 0,
    healUsed: false,
    directHit: true,
    maxApUsedInTurn: 4,
    directHitAttempts: 0,
    ...overrides,
  };
}

function byId(id: string): Challenge {
  const found = DEFAULT_CHALLENGES.find((c) => c.id === id);
  assert.ok(found, `missing catalog challenge ${id}`);
  return found;
}

describe("isChallengeCompleted", () => {
  it("credits no-heal and no-damage legendary only on a clean fight", () => {
    const untouchable = byId("legendary_1");
    assert.equal(isChallengeCompleted(untouchable, progress()), true);
    assert.equal(
      isChallengeCompleted(untouchable, progress({ totalDamage: 1 })),
      false,
    );
    assert.equal(
      isChallengeFailed(untouchable, progress({ totalDamage: 1 })),
      true,
    );
  });

  it("treats under_N_turns as inclusive at the advertised limit", () => {
    const under15 = byId("easy_2");
    const under10 = byId("hard_2");
    const under5 = byId("legendary_2");
    assert.equal(
      isChallengeCompleted(under15, progress({ turnCount: 15 })),
      true,
    );
    assert.equal(
      isChallengeCompleted(under15, progress({ turnCount: 16 })),
      false,
    );
    assert.equal(
      isChallengeCompleted(under10, progress({ turnCount: 10 })),
      true,
    );
    assert.equal(
      isChallengeCompleted(under10, progress({ turnCount: 11 })),
      false,
    );
    assert.equal(
      isChallengeCompleted(under5, progress({ turnCount: 5 })),
      true,
    );
    assert.equal(
      isChallengeCompleted(under5, progress({ turnCount: 6 })),
      false,
    );
  });

  it("counts the opening player turn so six turns cannot persist Blitz", () => {
    // Battle start used to leave turnCount at 0 when the player was first.
    // Five later advanceTurn increments then read as 5 after six player
    // turns and credited legendary_2 (450 Doka / 900 XP).
    assert.equal(shouldCountOpeningPlayerTurn(true), true);
    assert.equal(shouldCountOpeningPlayerTurn(false), false);

    let skippedOpening = 0;
    for (let i = 0; i < 5; i++) {
      skippedOpening = recordChallengePlayerTurnStart(skippedOpening);
    }
    const blitz = byId("legendary_2");
    assert.equal(skippedOpening, 5);
    assert.equal(
      isChallengeCompleted(blitz, progress({ turnCount: skippedOpening })),
      true,
    );
    assert.deepEqual(liveBattleChallengePersistEntries(true, blitz, true), [
      {
        name: "Battle Challenge",
        dokaReward: 450,
        xpReward: 900,
      },
    ]);

    let counted = 0;
    if (shouldCountOpeningPlayerTurn(true)) {
      counted = recordChallengePlayerTurnStart(counted);
    }
    for (let i = 0; i < 5; i++) {
      counted = recordChallengePlayerTurnStart(counted);
    }
    assert.equal(counted, 6);
    assert.equal(
      isChallengeCompleted(blitz, progress({ turnCount: counted })),
      false,
    );
    assert.deepEqual(
      liveBattleChallengePersistEntries(
        true,
        blitz,
        isChallengeCompleted(blitz, progress({ turnCount: counted })),
      ),
      [],
    );
  });

  it("still counts the first player turn when an enemy opened the fight", () => {
    let counted = 0;
    if (shouldCountOpeningPlayerTurn(false)) {
      counted = recordChallengePlayerTurnStart(counted);
    }
    counted = recordChallengePlayerTurnStart(counted);
    assert.equal(counted, 1);
    assert.equal(
      isChallengeCompleted(
        byId("legendary_2"),
        progress({ turnCount: counted }),
      ),
      true,
    );
  });

  it("does not mark under_N_turns failed mid-battle", () => {
    // Turn count is final only on victory. A mid-fight chip must stay open
    // even after turn 16 or handleBattleEnd could treat the offer as dead.
    assert.equal(
      isChallengeFailed(byId("easy_2"), progress({ turnCount: 40 })),
      false,
    );
    assert.equal(
      isChallengeFailed(byId("hard_2"), progress({ turnCount: 40 })),
      false,
    );
    assert.equal(
      isChallengeFailed(byId("legendary_2"), progress({ turnCount: 40 })),
      false,
    );
  });

  it("fails take-damage caps at the advertised boundary, not one above", () => {
    const under50 = byId("easy_3");
    const hardCombo = byId("hard_1");
    assert.equal(
      isChallengeCompleted(under50, progress({ totalDamage: 49 })),
      true,
    );
    assert.equal(
      isChallengeCompleted(under50, progress({ totalDamage: 50 })),
      false,
    );
    assert.equal(
      isChallengeFailed(under50, progress({ totalDamage: 50 })),
      true,
    );
    assert.equal(
      isChallengeCompleted(hardCombo, progress({ totalDamage: 29 })),
      true,
    );
    assert.equal(
      isChallengeCompleted(hardCombo, progress({ totalDamage: 30 })),
      false,
    );
    assert.equal(
      isChallengeCompleted(hardCombo, progress({ healUsed: true })),
      false,
    );
  });

  it("fails AP-per-turn and direct-hit as soon as the condition is broken", () => {
    const apCap = byId("hard_3");
    const striker = byId("legendary_3");
    assert.equal(
      isChallengeCompleted(apCap, progress({ maxApUsedInTurn: 8 })),
      true,
    );
    assert.equal(
      isChallengeCompleted(apCap, progress({ maxApUsedInTurn: 9 })),
      false,
    );
    assert.equal(
      isChallengeFailed(apCap, progress({ maxApUsedInTurn: 9 })),
      true,
    );
    assert.equal(
      isChallengeCompleted(striker, progress({ directHit: false })),
      false,
    );
    assert.equal(
      isChallengeFailed(striker, progress({ directHit: false })),
      true,
    );
    assert.match(challengeFailCopy(striker), /beyond 2 tiles/i);
    assert.match(challengeFailCopy(byId("easy_1")), /heal was used/i);
    assert.match(challengeFailCopy(byId("legendary_1")), /damage was taken/i);
  });

  it("does not invent a completion for an unknown condition", () => {
    const unknown = {
      id: "typo",
      tier: "legendary",
      description: "broken",
      condition: "survive_with_50_hp",
      rewards: { xp: 1000 },
    } as unknown as Challenge;
    assert.equal(isChallengeCompleted(unknown, progress()), false);
    assert.equal(isChallengeFailed(unknown, progress()), false);
  });
});

describe("recordChallengeDamageTaken", () => {
  it("accumulates post-hit HP loss so Untouchable cannot persist after a melee", () => {
    let total = 0;
    total = recordChallengeDamageTaken(total, 12);
    total = recordChallengeDamageTaken(total, 8);
    assert.equal(total, 20);
    const untouchable = byId("legendary_1");
    const under50 = byId("easy_3");
    assert.equal(
      isChallengeCompleted(untouchable, progress({ totalDamage: total })),
      false,
    );
    assert.equal(
      isChallengeCompleted(under50, progress({ totalDamage: total })),
      true,
    );
    assert.deepEqual(
      liveBattleChallengePersistEntries(
        true,
        untouchable,
        isChallengeCompleted(untouchable, progress({ totalDamage: total })),
      ),
      [],
    );
  });

  it("counts Sacrifice HP actually lost so Untouchable cannot persist after a self-hit", () => {
    const hpBefore = 100;
    const requested = Math.floor(hpBefore * 0.2);
    const recorded = recordChallengeSelfHpLoss(0, hpBefore, requested);
    assert.equal(recorded.lost, 20);
    assert.equal(recorded.hpAfter, 80);
    assert.equal(recorded.nextTotal, 20);
    assert.equal(
      isChallengeCompleted(
        byId("legendary_1"),
        progress({ totalDamage: recorded.nextTotal }),
      ),
      false,
    );
    assert.deepEqual(
      liveBattleChallengePersistEntries(
        true,
        byId("legendary_1"),
        isChallengeCompleted(
          byId("legendary_1"),
          progress({ totalDamage: recorded.nextTotal }),
        ),
      ),
      [],
    );
    const floored = recordChallengeSelfHpLoss(0, 5, 20);
    assert.equal(floored.hpAfter, 1, "Sacrifice combat floor stays at 1");
    assert.equal(floored.lost, 4, "only the HP that left the bar is counted");
    assert.equal(floored.nextTotal, 4);
    assert.equal(recordChallengeSelfHpLoss(0, 100, 0).lost, 0);
    assert.equal(recordChallengeSelfHpLoss(0, 100, Number.NaN).lost, 0);
  });

  it("ignores absorbed / invalid hits so a full-shield block stays at 0", () => {
    assert.equal(recordChallengeDamageTaken(0, 0), 0);
    assert.equal(recordChallengeDamageTaken(0, -4), 0);
    assert.equal(recordChallengeDamageTaken(0, Number.NaN), 0);
    assert.equal(
      isChallengeCompleted(
        byId("legendary_1"),
        progress({ totalDamage: recordChallengeDamageTaken(0, 0) }),
      ),
      true,
    );
  });
});

describe("recordInBattleChallengeHealUsed", () => {
  it("leaves healUsed unset for an overworld Doka heal so easy_1 / hard_1 still persist", () => {
    const healUsed = recordInBattleChallengeHealUsed(false, false);
    assert.equal(healUsed, false);
    const easy1 = byId("easy_1");
    const hard1 = byId("hard_1");
    assert.equal(isChallengeCompleted(easy1, progress({ healUsed })), true);
    assert.equal(isChallengeCompleted(hard1, progress({ healUsed })), true);
    assert.equal(
      challengeXpFromEntries(
        liveBattleChallengePersistEntries(true, hard1, true),
      ),
      500,
    );
  });

  it("does not clear an in-battle heal that already failed the objective", () => {
    assert.equal(recordInBattleChallengeHealUsed(false, true), true);
    assert.equal(
      recordInBattleChallengeHealUsed(true, false),
      true,
      "jackpot and paid Doka heals in battle must fail no_healing",
    );
    assert.equal(
      isChallengeCompleted(
        byId("easy_1"),
        progress({
          healUsed: recordInBattleChallengeHealUsed(true, false),
        }),
      ),
      false,
    );
  });

  it("in-battle BuffShop potion heal fails easy_1 / hard_1", () => {
    const healUsed = recordChallengeItemHealUsed(true, false);
    assert.equal(healUsed, true);
    assert.equal(
      isChallengeCompleted(byId("easy_1"), progress({ healUsed })),
      false,
    );
    assert.equal(
      isChallengeCompleted(byId("hard_1"), progress({ healUsed })),
      false,
    );
    assert.equal(
      recordChallengeItemHealUsed(false, false),
      false,
      "overworld item use must not stick healUsed into the next fight",
    );
  });

  it("fails no-heal when Life Drain or ctx.heal actually restores HP in battle", () => {
    assert.equal(isPlayerHealTargetId("player"), true);
    assert.equal(isPlayerHealTargetId("__player__"), true);
    assert.equal(isPlayerHealTargetId("wisp-1"), false);
    const healUsed = recordChallengeHealFromHpRestore(true, false, 10);
    assert.equal(healUsed, true);
    assert.equal(
      isChallengeCompleted(byId("easy_1"), progress({ healUsed })),
      false,
    );
    assert.equal(
      isChallengeCompleted(byId("hard_1"), progress({ healUsed })),
      false,
    );
    assert.equal(
      addChallengeRewardDeltas(
        0,
        0,
        liveBattleChallengePersistEntries(true, byId("easy_1"), false),
      ).dokaFromChallenges,
      0,
      "easy_1 50 Doka must not persist after an in-battle HP restore",
    );
    assert.equal(
      addChallengeRewardDeltas(
        0,
        0,
        liveBattleChallengePersistEntries(true, byId("hard_1"), false),
      ).xpDelta,
      0,
      "hard_1 500 XP must not persist after an in-battle HP restore",
    );
  });

  it("does not fail no-heal for a 0-HP drain or an overworld restore", () => {
    assert.equal(recordChallengeHealFromHpRestore(true, false, 0), false);
    assert.equal(
      recordChallengeHealFromHpRestore(true, false, Number.NaN),
      false,
    );
    assert.equal(
      recordChallengeHealFromHpRestore(false, false, 12),
      false,
      "overworld ctx.heal must not stick healUsed into the next fight",
    );
    assert.equal(
      isChallengeCompleted(
        byId("easy_1"),
        progress({
          healUsed: recordChallengeHealFromHpRestore(true, false, 0),
        }),
      ),
      true,
    );
  });
});

describe("battle-walk hazards fail Untouchable (mouse and touch share this path)", () => {
  it("debits Thorned Ground extra tiles so tablet walk cannot keep Untouchable", () => {
    const damages = battleWalkHazardDamages({
      thornedActive: true,
      pathLength: 3,
      voidRiftActive: false,
      dest: { x: 2, y: 2 },
      riftTile: null,
    });
    const total = recordChallengeWalkHazardDamage(0, damages);
    assert.equal(damages.thornDmg, 10);
    assert.equal(total, 10);
    const untouchable = byId("legendary_1");
    assert.equal(
      isChallengeCompleted(untouchable, progress({ totalDamage: total })),
      false,
    );
    assert.deepEqual(
      liveBattleChallengePersistEntries(true, untouchable, false),
      [],
    );
  });

  it("debits Void Rift destination so stepping the rift fails Untouchable", () => {
    const damages = battleWalkHazardDamages({
      thornedActive: false,
      pathLength: 1,
      voidRiftActive: true,
      dest: { x: 8, y: 3 },
      riftTile: { x: 8, y: 3 },
    });
    const total = recordChallengeWalkHazardDamage(0, damages);
    assert.equal(damages.riftDmg, 3);
    assert.equal(
      isChallengeCompleted(
        byId("legendary_1"),
        progress({ totalDamage: total }),
      ),
      false,
    );
  });

  it("does not debit when both hazards are inactive", () => {
    const damages = battleWalkHazardDamages({
      thornedActive: false,
      pathLength: 4,
      voidRiftActive: false,
      dest: { x: 1, y: 1 },
      riftTile: { x: 1, y: 1 },
    });
    assert.equal(recordChallengeWalkHazardDamage(7, damages), 7);
    assert.equal(
      isChallengeCompleted(byId("legendary_1"), progress({ totalDamage: 0 })),
      true,
    );
  });
});

describe("recordInBattleChallengeDamage", () => {
  it("counts in-battle spike/lava HP loss so Untouchable cannot persist", () => {
    let total = 0;
    total = recordInBattleChallengeDamage(true, total, 8);
    total = recordInBattleChallengeDamage(true, total, 5);
    assert.equal(total, 13);
    const untouchable = byId("legendary_1");
    assert.equal(
      isChallengeCompleted(untouchable, progress({ totalDamage: total })),
      false,
    );
    assert.deepEqual(
      liveBattleChallengePersistEntries(
        true,
        untouchable,
        isChallengeCompleted(untouchable, progress({ totalDamage: total })),
      ),
      [],
    );
  });

  it("leaves the counter unchanged for overworld hazard steps", () => {
    assert.equal(recordInBattleChallengeDamage(false, 0, 12), 0);
    assert.equal(recordInBattleChallengeDamage(false, 7, 9), 7);
    assert.equal(
      isChallengeCompleted(
        byId("legendary_1"),
        progress({
          totalDamage: recordInBattleChallengeDamage(false, 0, 15),
        }),
      ),
      true,
    );
  });
});

describe("challenge completion → persist XP", () => {
  it("credits advertised Untouchable XP only when the predicate passes", () => {
    const legendary = byId("legendary_1");
    const completed = isChallengeCompleted(legendary, progress());
    const entries = liveBattleChallengePersistEntries(
      true,
      legendary,
      completed,
    );
    assert.equal(challengeXpFromEntries(entries), 1000);
    const deltas = addChallengeRewardDeltas(12, 80, entries);
    assert.equal(deltas.xpDelta, 1080);
    assert.equal(deltas.dokaDelta, 512);
    assert.equal(deltas.dokaFromChallenges, 500);
  });

  it("drops advertised XP when the player took damage or never accepted", () => {
    const legendary = byId("legendary_1");
    const failed = isChallengeCompleted(
      legendary,
      progress({ totalDamage: 1 }),
    );
    assert.deepEqual(
      liveBattleChallengePersistEntries(true, legendary, failed),
      [],
    );
    assert.deepEqual(
      liveBattleChallengePersistEntries(false, legendary, true),
      [],
    );
  });

  it("does not persist Striker when the fight had no spent spell attempt", () => {
    // legendary_3 starts directHit=true. A lava / reflect / wait win never
    // calls applyChallengeDirectHit, so the panel still reads on-track and
    // used to persist 400 Doka / 800 XP.
    const striker = byId("legendary_3");
    const vacuous = progress({ directHit: true, directHitAttempts: 0 });
    assert.equal(isStrikerChallengeComplete(vacuous), false);
    assert.equal(
      isStrikerChallengeComplete({ directHit: true }),
      false,
      "pre-fix progress omitted attempts and still persisted Striker",
    );
    assert.equal(isChallengeCompleted(striker, vacuous), false);
    assert.deepEqual(
      liveBattleChallengePersistEntries(
        true,
        striker,
        isChallengeCompleted(striker, vacuous),
      ),
      [],
    );
    const deltas = addChallengeRewardDeltas(12, 80, []);
    assert.equal(deltas.dokaDelta, 12);
    assert.equal(deltas.xpDelta, 80);
    assert.equal(deltas.dokaFromChallenges, 0);
  });
});

describe("recordChallengeApSpend", () => {
  it("keeps the peak after a later cheap turn so hard_3 cannot persist", () => {
    let peak = 0;
    let thisTurn = 0;
    ({ peak, spentThisTurn: thisTurn } = recordChallengeApSpend(
      peak,
      thisTurn,
      5,
    ));
    ({ peak, spentThisTurn: thisTurn } = recordChallengeApSpend(
      peak,
      thisTurn,
      6,
    ));
    assert.equal(thisTurn, 11);
    assert.equal(peak, 11);

    thisTurn = 0;
    ({ peak, spentThisTurn: thisTurn } = recordChallengeApSpend(
      peak,
      thisTurn,
      3,
    ));
    assert.equal(thisTurn, 3);
    assert.equal(peak, 11);

    const hard3 = byId("hard_3");
    assert.equal(
      isChallengeCompleted(hard3, progress({ maxApUsedInTurn: peak })),
      false,
    );
    assert.deepEqual(
      liveBattleChallengePersistEntries(
        true,
        hard3,
        isChallengeCompleted(hard3, progress({ maxApUsedInTurn: peak })),
      ),
      [],
    );
  });

  it("still completes when every turn stays at or under 8 AP", () => {
    let peak = 0;
    let thisTurn = 0;
    ({ peak, spentThisTurn: thisTurn } = recordChallengeApSpend(
      peak,
      thisTurn,
      8,
    ));
    thisTurn = 0;
    ({ peak, spentThisTurn: thisTurn } = recordChallengeApSpend(
      peak,
      thisTurn,
      4,
    ));
    const hard3 = byId("hard_3");
    assert.equal(
      isChallengeCompleted(hard3, progress({ maxApUsedInTurn: peak })),
      true,
    );
    assert.equal(
      challengeXpFromEntries(
        liveBattleChallengePersistEntries(true, hard3, true),
      ),
      450,
    );
  });

  it("treats summon the same as cast/fizzle for the AP debit", () => {
    assert.equal(castResultSpendsAp("cast"), true);
    assert.equal(castResultSpendsAp("fizzled"), true);
    assert.equal(castResultSpendsAp("summon"), true);
    assert.equal(castResultSpendsAp("no_ap"), false);
    assert.equal(castResultSpendsAp("abort"), false);
  });

  it("does not let a tile-click follow-up debit AP after executeCastAttempt", () => {
    assert.equal(castFollowUpShouldDebitAp("fizzled"), false);
    assert.equal(castFollowUpShouldDebitAp("cast"), false);
    assert.equal(castFollowUpShouldDebitAp("summon"), false);
    assert.equal(castFollowUpShouldDebitAp("no_ap"), true);
    assert.equal(castFollowUpShouldDebitAp("abort"), true);
  });

  it("clears the selected spell from leftover AP, not leftover minus cost again", () => {
    // 6 AP, 4-cost fizzle already paid inside executeCastAttempt → 2 left.
    assert.equal(shouldClearSpellAfterApSpend(2), false);
    // 8 AP, 4-cost cast already paid → 4 left; old `remaining - cost` cleared.
    assert.equal(shouldClearSpellAfterApSpend(4), false);
    assert.equal(shouldClearSpellAfterApSpend(0), true);
    assert.equal(shouldClearSpellAfterApSpend(-1), true);
  });
});

describe("recordChallengeDirectHit", () => {
  it("fails Striker after a sprite-click beyond Chebyshev 2", () => {
    const caster = { x: 8, y: 8 };
    let state = { stillDirect: true, attempts: 0 };
    state = applyChallengeDirectHit(state, caster, { x: 10, y: 8 });
    assert.equal(state.stillDirect, true);
    assert.equal(state.attempts, 1);

    state = applyChallengeDirectHit(state, caster, { x: 11, y: 8 });
    assert.equal(state.stillDirect, false);
    assert.equal(state.attempts, 2);
    state = applyChallengeDirectHit(state, caster, { x: 8, y: 9 });
    assert.equal(state.stillDirect, false);

    const striker = byId("legendary_3");
    const snap = progress({
      directHit: state.stillDirect,
      directHitAttempts: state.attempts,
    });
    assert.equal(isChallengeCompleted(striker, snap), false);
    assert.deepEqual(
      liveBattleChallengePersistEntries(
        true,
        striker,
        isChallengeCompleted(striker, snap),
      ),
      [],
    );
  });

  it("fails Striker after a controlled summon casts beyond Chebyshev 2", () => {
    const summon = { x: 8, y: 8 };
    let state = { stillDirect: true, attempts: 0 };
    // Adjacent / range-2 shots stay legal.
    state = applyChallengeDirectHit(state, summon, { x: 10, y: 8 });
    assert.equal(state.stillDirect, true);

    // Archer Poison Arrow (range 4) / Slow (range 3) from control mode.
    state = applyChallengeDirectHit(state, summon, { x: 12, y: 8 });
    assert.equal(state.stillDirect, false);
    state = applyChallengeDirectHit(state, summon, { x: 8, y: 9 });
    assert.equal(state.stillDirect, false);

    const striker = byId("legendary_3");
    const snap = progress({
      directHit: state.stillDirect,
      directHitAttempts: state.attempts,
    });
    assert.equal(isChallengeCompleted(striker, snap), false);
    assert.deepEqual(
      liveBattleChallengePersistEntries(
        true,
        striker,
        isChallengeCompleted(striker, snap),
      ),
      [],
    );
  });

  it("still completes when every spent attempt stays within 2 tiles", () => {
    const caster = { x: 5, y: 5 };
    let state = { stillDirect: true, attempts: 0 };
    state = applyChallengeDirectHit(state, caster, { x: 7, y: 6 });
    state = applyChallengeDirectHit(state, caster, { x: 5, y: 5 });
    const striker = byId("legendary_3");
    const snap = progress({
      directHit: state.stillDirect,
      directHitAttempts: state.attempts,
    });
    assert.equal(state.attempts, 2);
    assert.equal(isChallengeCompleted(striker, snap), true);
    assert.equal(
      challengeXpFromEntries(
        liveBattleChallengePersistEntries(
          true,
          striker,
          isChallengeCompleted(striker, snap),
        ),
      ),
      800,
    );
  });

  it("does not treat the opening directHit=true flag as a spent attempt", () => {
    assert.equal(
      recordChallengeDirectHit(true, { x: 1, y: 1 }, { x: 1, y: 1 }),
      true,
    );
    assert.equal(
      isStrikerChallengeComplete({ directHit: true, directHitAttempts: 0 }),
      false,
    );
    assert.equal(
      isStrikerChallengeComplete({ directHit: true, directHitAttempts: 1 }),
      true,
    );
  });
});

describe("spell cooldown gate", () => {
  it("blocks a still-selected Inferno recast while turns remain", () => {
    // Sprite / tile / Attack Nearest leave the spell selected when AP
    // remains. The bar only disables re-selection, so leftover 5 AP
    // used to fire Inferno again the same turn (and every later turn).
    assert.equal(isSpellOnCooldown(3), true);
    assert.equal(isSpellOnCooldown(1), true);
    assert.equal(isSpellOnCooldown(0), false);
    assert.equal(isSpellOnCooldown(undefined), false);
    assert.equal(isSpellOnCooldown(Number.NaN), false);
  });

  it("locks the spell after cast/summon, not after a fizzle", () => {
    assert.equal(castResultAppliesCooldown("cast"), true);
    assert.equal(castResultAppliesCooldown("summon"), true);
    assert.equal(castResultAppliesCooldown("fizzled"), false);
    assert.equal(castResultAppliesCooldown("on_cooldown"), false);
    assert.equal(castResultAppliesCooldown("no_ap"), false);
    assert.equal(nextSpellCooldownTurns(3), 3);
    assert.equal(nextSpellCooldownTurns(0), 0);
    assert.equal(nextSpellCooldownTurns(undefined), 0);
  });
});
