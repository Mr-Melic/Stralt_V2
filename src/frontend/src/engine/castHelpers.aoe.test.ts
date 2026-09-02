import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Enemy } from "../types/gameTypes.ts";
import { getAoETargets } from "./castHelpers.ts";

function unit(
  id: string,
  x: number,
  y: number,
  extras: Partial<Enemy> = {},
): Enemy {
  return {
    id,
    x,
    y,
    level: 3,
    hp: 40,
    maxHp: 40,
    res: 0,
    sp: 0,
    chc: 0,
    init: 8,
    pieceType: "pawn",
    currentView: "front",
    isMoving: false,
    movementPath: [],
    scaleX: 1,
    scaleY: 1,
    nextMoveTime: 0,
    family: "plague_rat",
    ...extras,
  };
}

describe("getAoETargets hostility filter", () => {
  it("does not include a living player summon in hitsMultiple", () => {
    const rat = unit("rat", 4, 4, { side: "enemy" });
    const wolf = unit("wolf", 5, 4, {
      isSummon: true,
      side: "player",
    });
    const targets = getAoETargets({
      spell: {
        hitsMultiple: true,
        maxRange: 2,
        range: 2,
        modifiableRange: false,
      },
      gridPos: { x: 4, y: 4 },
      targetEnemy: rat,
      enemies: [rat, wolf],
      playerPosition: { x: 3, y: 4 },
      characterName: "Hero",
      characterStats: {
        level: 1,
        res: 0,
        sp: 0,
        chc: 0,
        hp: 50,
        maxHp: 50,
      },
      getEffectiveSpellRange: (base) => base,
      logBattleEntry: () => {},
    });
    assert.deepEqual(
      targets.map((t) => t.id),
      ["rat"],
    );
  });

  it("does not treat a player summon as the primary single-target", () => {
    const wolf = unit("wolf", 5, 4, {
      isSummon: true,
      side: "player",
    });
    const targets = getAoETargets({
      spell: {
        hitsMultiple: false,
        maxRange: 2,
        range: 2,
        modifiableRange: false,
      },
      gridPos: { x: 5, y: 4 },
      targetEnemy: wolf,
      enemies: [wolf],
      playerPosition: { x: 3, y: 4 },
      characterName: "Hero",
      characterStats: {
        level: 1,
        res: 0,
        sp: 0,
        chc: 0,
        hp: 50,
        maxHp: 50,
      },
      getEffectiveSpellRange: (base) => base,
      logBattleEntry: () => {},
    });
    assert.deepEqual(targets, []);
  });

  it("still hits an enemy minion in range so Frost Nova cannot skip the last hostile", () => {
    const rat = unit("rat", 4, 4, { side: "enemy" });
    const wolf = unit("wolf", 5, 4, {
      isSummon: true,
      side: "player",
    });
    const larva = unit("larva", 4, 5, {
      isSummon: true,
      side: "enemy",
    });
    const targets = getAoETargets({
      spell: {
        hitsMultiple: true,
        maxRange: 2,
        range: 2,
        modifiableRange: false,
      },
      gridPos: { x: 4, y: 4 },
      targetEnemy: rat,
      enemies: [rat, wolf, larva],
      playerPosition: { x: 3, y: 4 },
      characterName: "Hero",
      characterStats: {
        level: 1,
        res: 0,
        sp: 0,
        chc: 0,
        hp: 50,
        maxHp: 50,
      },
      getEffectiveSpellRange: (base) => base,
      logBattleEntry: () => {},
    });
    assert.deepEqual(targets.map((t) => t.id).sort(), ["larva", "rat"]);
  });
});
