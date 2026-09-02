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

  it("uses the same effective-range helper as the highlight ring", () => {
    const rat = unit("rat", 6, 4, { side: "enemy" });
    let seenBase: number | undefined;
    let seenId: string | undefined;
    const targets = getAoETargets({
      spell: {
        id: "nova",
        hitsMultiple: true,
        maxRange: 2,
        range: 2,
        modifiableRange: true,
      },
      gridPos: { x: 4, y: 4 },
      targetEnemy: rat,
      enemies: [rat],
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
      getEffectiveSpellRange: (base, id) => {
        seenBase = base;
        seenId = id;
        return base;
      },
      logBattleEntry: () => {},
    });
    assert.equal(seenBase, 2);
    assert.equal(seenId, "nova");
    assert.deepEqual(
      targets.map((t) => t.id),
      ["rat"],
    );
  });

  it("includes the player in hitsAllies only when they sit in range of the click", () => {
    const rat = unit("rat", 4, 4, { side: "enemy" });
    const near = getAoETargets({
      spell: {
        hitsMultiple: true,
        hitsAllies: true,
        maxRange: 1,
        range: 1,
      },
      gridPos: { x: 4, y: 4 },
      targetEnemy: rat,
      enemies: [rat],
      playerPosition: { x: 4, y: 5 },
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
    assert.deepEqual(near.map((t) => t.id).sort(), ["__player__", "rat"]);

    const far = getAoETargets({
      spell: {
        hitsMultiple: true,
        hitsAllies: true,
        maxRange: 1,
        range: 1,
      },
      gridPos: { x: 4, y: 4 },
      targetEnemy: rat,
      enemies: [rat],
      playerPosition: { x: 0, y: 0 },
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
      far.map((t) => t.id),
      ["rat"],
    );
  });

  it("hitsMultiple uses spell range from the click, not preview areaRadius", () => {
    const rat = unit("rat", 4, 4, { side: "enemy" });
    const far = unit("far", 4, 6, { side: "enemy" });
    const targets = getAoETargets({
      spell: {
        hitsMultiple: true,
        maxRange: 1,
        range: 1,
        areaRadius: 2,
        targetType: "area",
      },
      gridPos: { x: 4, y: 4 },
      targetEnemy: rat,
      enemies: [rat, far],
      playerPosition: { x: 2, y: 4 },
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
      "Chebyshev 2 from the click is outside hitsMultiple radius 1",
    );
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
