import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Enemy } from "../types/gameTypes.ts";
import {
  isChallengeCompleted,
  recordChallengeDamageTaken,
  recordChallengeHealFromHpRestore,
} from "../utils/challengeCompletion.ts";
import {
  type ApplyDamageToEnemyDeps,
  applyDamageToEnemy,
} from "./castHelpers.ts";

const UNTOUCHABLE = {
  id: "legendary_1",
  tier: "legendary" as const,
  description: "Win without taking any damage at all",
  condition: "no_damage_taken" as const,
  rewards: { doka: 500, xp: 1000, badge: "Untouchable" },
};

function enemy(overrides: Partial<Enemy> = {}): Enemy {
  return {
    id: "e1",
    x: 4,
    y: 4,
    level: 3,
    hp: 40,
    maxHp: 40,
    res: 0,
    sp: 0,
    chc: 0,
    init: 10,
    pieceType: "pawn",
    currentView: "front",
    isMoving: false,
    movementPath: [],
    scaleX: 1,
    scaleY: 1,
    nextMoveTime: 0,
    family: "plague_rat",
    ...overrides,
  };
}

function stubDeps(
  overrides: Partial<ApplyDamageToEnemyDeps> = {},
): ApplyDamageToEnemyDeps {
  return {
    spell: { id: "bolt", name: "Bolt" },
    gridPos: { x: 4, y: 4 },
    isPhysical: false,
    isCrit: false,
    rawDmg: 20,
    preCritDmg: 20,
    preCritDmgBM: 20,
    isDrainSpell: false,
    maxHp: 50,
    characterStats: { hp: 50 },
    targetsToHit: [],
    activeEffectsRef: { current: [] },
    turnOrderRef: { current: [] },
    currentTurnIndexRef: { current: 0 },
    bossStateRef: { current: null },
    enemyHpMap: { e1: 40 },
    leaderEnemyIdRef: { current: null },
    battleHitsRef: { current: 0 },
    battleCritHitsRef: { current: 0 },
    battleLeaderSlainRef: { current: false },
    leaderDiedRef: { current: false },
    leaderBoostPercent: 0,
    calculatePlayerDamage: (baseDamage) => ({
      finalDamage: baseDamage,
      breakdown: "",
    }),
    logBattleEntry: () => {},
    calcEnemyMaxHp: (level) => level * 10,
    setEnemyHpMap: () => {},
    setTurnOrder: (updater) => {
      updater([]);
    },
    enemies: [],
    enemyTakesDamage: () => {},
    playSound: () => {},
    setEnemies: () => {},
    triggerLeaderDeathAnimation: () => {},
    setLeaderBoostMultiplier: () => {},
    setCharacterStats: () => {},
    processCombatantDeath: () => false,
    onPlayerReflectedDamage: () => {},
    ...overrides,
  };
}

describe("applyDamageToEnemy reflect → challenge damage", () => {
  it("records Void Mirror reflect so Untouchable cannot persist after a spell hit", () => {
    let total = 0;
    const deps = stubDeps({
      preCritDmgBM: 20,
      onPlayerReflectedDamage: (amount) => {
        total = recordChallengeDamageTaken(total, amount);
      },
    });
    applyDamageToEnemy({
      hitTarget: enemy({ family: "void_mirror" }),
      isFirstTarget: true,
      deps,
    });
    assert.equal(total, 5);
    assert.equal(
      isChallengeCompleted(UNTOUCHABLE, {
        turnCount: 1,
        totalDamage: total,
        healUsed: false,
        directHit: true,
        maxApUsedInTurn: 4,
      }),
      false,
    );
  });

  it("records Reflect Shield so a phase-2 boss hit fails under-damage challenges", () => {
    let total = 0;
    const target = enemy({ id: "boss-1", family: "default" });
    const deps = stubDeps({
      preCritDmgBM: 20,
      turnOrderRef: {
        current: [
          {
            id: "boss-1",
            type: "enemy",
            initiative: 20,
            name: "Boss",
            pieceIcon: "K",
            hp: 200,
            maxHp: 200,
            level: 10,
            isBoss: true,
          },
        ],
      },
      bossStateRef: { current: { reflectShieldActive: true } },
      enemyHpMap: { "boss-1": 200 },
      onPlayerReflectedDamage: (amount) => {
        total = recordChallengeDamageTaken(total, amount);
      },
    });
    applyDamageToEnemy({
      hitTarget: target,
      isFirstTarget: true,
      deps,
    });
    assert.equal(total, 6);
    assert.equal(
      isChallengeCompleted(
        {
          id: "easy_3",
          tier: "easy",
          description: "Take less than 50 damage total",
          condition: "under_50_damage",
          rewards: { doka: 60 },
        },
        {
          turnCount: 1,
          totalDamage: total,
          healUsed: false,
          directHit: true,
          maxApUsedInTurn: 4,
        },
      ),
      true,
    );
    assert.equal(
      isChallengeCompleted(UNTOUCHABLE, {
        turnCount: 1,
        totalDamage: total,
        healUsed: false,
        directHit: true,
        maxApUsedInTurn: 4,
      }),
      false,
    );
  });

  it("does not record reflect when the target has no reflect path", () => {
    let total = 0;
    const deps = stubDeps({
      onPlayerReflectedDamage: (amount) => {
        total = recordChallengeDamageTaken(total, amount);
      },
    });
    applyDamageToEnemy({
      hitTarget: enemy(),
      isFirstTarget: true,
      deps,
    });
    assert.equal(total, 0);
    assert.equal(
      isChallengeCompleted(UNTOUCHABLE, {
        turnCount: 1,
        totalDamage: 0,
        healUsed: false,
        directHit: true,
        maxApUsedInTurn: 4,
      }),
      true,
    );
  });
});

describe("applyDamageToEnemy store HP commit", () => {
  it("commits the reduced HP so a later store-based DoT tick cannot wipe the hit", () => {
    let storeHp = 40;
    applyDamageToEnemy({
      hitTarget: enemy({ hp: 40 }),
      isFirstTarget: true,
      deps: stubDeps({
        preCritDmgBM: 20,
        calculatePlayerDamage: () => ({
          finalDamage: 20,
          breakdown: "",
        }),
        commitEnemyHp: (_id, hp) => {
          storeHp = hp;
        },
      }),
    });
    assert.equal(
      storeHp,
      20,
      "player hit must land on the store, not only hpMap",
    );
    // enemyTakesDamage reads combatantsRef, not enemyHpMap.
    storeHp = Math.max(0, storeHp - 4);
    assert.equal(
      storeHp,
      16,
      "DoT tick must subtract from the post-hit store HP",
    );
  });

  it("subtracts from live target HP when enemyHpMap is stale", () => {
    let committed = -1;
    applyDamageToEnemy({
      hitTarget: enemy({ hp: 18 }),
      isFirstTarget: true,
      deps: stubDeps({
        enemyHpMap: { e1: 40 },
        preCritDmgBM: 10,
        calculatePlayerDamage: () => ({
          finalDamage: 10,
          breakdown: "",
        }),
        commitEnemyHp: (_id, hp) => {
          committed = hp;
        },
      }),
    });
    assert.equal(committed, 8);
  });

  it("commits hp 0 before processCombatantDeath so the last spell kill can award", () => {
    const events: string[] = [];
    applyDamageToEnemy({
      hitTarget: enemy({ hp: 40 }),
      isFirstTarget: true,
      deps: stubDeps({
        preCritDmgBM: 40,
        calculatePlayerDamage: () => ({
          finalDamage: 40,
          breakdown: "",
        }),
        commitEnemyHp: (id, hp) => {
          events.push(`commit:${id}:${hp}`);
        },
        processCombatantDeath: (id) => {
          events.push(`death:${id}`);
          return true;
        },
      }),
    });
    assert.deepEqual(
      events,
      ["commit:e1:0", "death:e1"],
      "React-only 0 HP left store hp > 0 so isActiveHostile blocked applyRewards",
    );
  });

  it("does not commit store HP for the player sentinel", () => {
    let committedId: string | null = null;
    applyDamageToEnemy({
      hitTarget: {
        id: "__player__",
        pieceType: "player",
        x: 0,
        y: 0,
        level: 1,
        hp: 50,
        maxHp: 50,
        res: 0,
        sp: 0,
        chc: 0,
      },
      isFirstTarget: true,
      deps: stubDeps({
        preCritDmgBM: 12,
        commitEnemyHp: (id) => {
          committedId = id;
        },
      }),
    });
    assert.equal(committedId, null);
  });
});

describe("applyDamageToEnemy drain → challenge healUsed", () => {
  const NO_HEAL = {
    id: "easy_1",
    tier: "easy" as const,
    description: "Win without using healing spells",
    condition: "no_healing" as const,
    rewards: { doka: 50 },
  };
  const HARD_NO_HEAL = {
    id: "hard_1",
    tier: "hard" as const,
    description: "Win without healing and take under 30 damage",
    condition: "no_healing_under_30_damage" as const,
    rewards: { doka: 200, xp: 500 },
  };

  it("records an in-battle Life Drain HP restore so no-heal cannot persist", () => {
    const target = enemy();
    let restored = 0;
    applyDamageToEnemy({
      hitTarget: target,
      isFirstTarget: true,
      deps: stubDeps({
        spell: { id: "starter-drain", name: "Life Drain" },
        isDrainSpell: true,
        preCritDmgBM: 20,
        maxHp: 50,
        characterStats: { hp: 20 },
        targetsToHit: [target],
        enemyHpMap: { e1: 40 },
        onPlayerHealed: (amount) => {
          restored = amount;
        },
      }),
    });
    assert.equal(restored, 10);
    const healUsed = recordChallengeHealFromHpRestore(true, false, restored);
    assert.equal(
      isChallengeCompleted(NO_HEAL, {
        turnCount: 1,
        totalDamage: 0,
        healUsed,
        directHit: true,
        maxApUsedInTurn: 4,
      }),
      false,
    );
    assert.equal(
      isChallengeCompleted(HARD_NO_HEAL, {
        turnCount: 1,
        totalDamage: 0,
        healUsed,
        directHit: true,
        maxApUsedInTurn: 4,
      }),
      false,
    );
  });

  it("does not record drain at full HP so a damage-only Life Drain can still complete no-heal", () => {
    const target = enemy();
    let restored = 0;
    applyDamageToEnemy({
      hitTarget: target,
      isFirstTarget: true,
      deps: stubDeps({
        spell: { id: "starter-drain", name: "Life Drain" },
        isDrainSpell: true,
        preCritDmgBM: 20,
        maxHp: 50,
        characterStats: { hp: 50 },
        targetsToHit: [target],
        enemyHpMap: { e1: 40 },
        onPlayerHealed: (amount) => {
          restored = amount;
        },
      }),
    });
    assert.equal(restored, 0);
    assert.equal(
      isChallengeCompleted(NO_HEAL, {
        turnCount: 1,
        totalDamage: 0,
        healUsed: recordChallengeHealFromHpRestore(true, false, restored),
        directHit: true,
        maxApUsedInTurn: 4,
      }),
      true,
    );
  });
});
