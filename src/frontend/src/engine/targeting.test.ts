import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Enemy, SpellConfig } from "../types/gameTypes.ts";
import {
  attackNearestLiveCasterPos,
  canAttackNearestLive,
  computeTargetableTiles,
  isTileCastableLive,
  pickNearestLiveHostileTile,
  shouldExecuteLiveCast,
  spellHighlightRangeBase,
} from "./targeting.ts";

function floorGrid(size: number): Array<Array<"floor" | "wall" | "portal">> {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => "floor" as const),
  );
}

function enemySpell(range: number): SpellConfig {
  return {
    id: "starter-poison",
    name: "Poison",
    description: "",
    iconEmoji: "",
    apCost: 2n,
    mpCost: 0n,
    damage: 8n,
    range: BigInt(range),
    effectType: "damage",
    targetType: "enemy",
    maxRange: range,
    minRange: 1,
  } as SpellConfig;
}

describe("isTileCastableLive effective range", () => {
  it("accepts the highlight ring when the level-grown range is passed through", () => {
    const tiles = floorGrid(20);
    const caster = { x: 10, y: 10 };
    const tile = { x: 15, y: 10 };
    const enemies: Enemy[] = [
      {
        id: "rat-1",
        x: 15,
        y: 10,
        hp: 20,
        maxHp: 20,
        name: "Rat",
        pieceType: "pawn",
      } as Enemy,
    ];
    const spell = enemySpell(4);
    const highlighted = computeTargetableTiles(spell, caster, {
      tiles,
      enemies,
      worldGridSize: 20,
      effectiveRange: 5,
      barrierTiles: new Map(),
    });
    assert.equal(highlighted.has("15,10"), true);

    const raw = isTileCastableLive(spell, caster, tile, enemies, tiles);
    assert.equal(raw.ok, false, "base maxRange 4 must reject Chebyshev 5");

    const live = isTileCastableLive(spell, caster, tile, enemies, tiles, 5);
    assert.equal(live.ok, true, "effectiveRange 5 must match the highlight");
  });
});

function strikeSpell(): SpellConfig {
  return {
    id: "physical_attack",
    name: "Strike",
    description: "",
    iconEmoji: "",
    apCost: 2n,
    mpCost: 0n,
    damage: 10n,
    range: 1n,
    effectType: "damage",
    targetType: "enemy",
    isPhysical: true,
    maxRange: 1,
    minRange: 1,
  } as SpellConfig;
}

describe("spellHighlightRangeBase", () => {
  it("prefers maxRange so Attack Nearest matches the highlight ring", () => {
    assert.equal(spellHighlightRangeBase(enemySpell(4)), 4);
    assert.equal(
      spellHighlightRangeBase({ range: 1n, maxRange: 5 } as SpellConfig),
      5,
    );
    assert.equal(spellHighlightRangeBase({ range: 3n } as SpellConfig), 3);
  });
});

describe("pickNearestLiveHostileTile", () => {
  it("skips a closer LoS-blocked hostile so Attack Nearest matches the ring", () => {
    const tiles = floorGrid(20);
    tiles[10][11] = "wall";
    const caster = { x: 10, y: 10 };
    const blocked = {
      id: "blocked",
      x: 12,
      y: 10,
      hp: 20,
      maxHp: 20,
      name: "Wraith",
      pieceType: "pawn",
    } as Enemy;
    const open = {
      id: "open",
      x: 10,
      y: 13,
      hp: 20,
      maxHp: 20,
      name: "Rat",
      pieceType: "pawn",
    } as Enemy;
    const spell = {
      ...enemySpell(5),
      lineOfSight: true,
    } as SpellConfig;
    const highlighted = computeTargetableTiles(spell, caster, {
      tiles,
      enemies: [blocked, open],
      worldGridSize: 20,
      effectiveRange: 5,
      barrierTiles: new Map(),
    });
    assert.equal(highlighted.has("12,10"), false);
    assert.equal(highlighted.has("10,13"), true);

    const picked = pickNearestLiveHostileTile(
      spell,
      caster,
      [blocked, open],
      [blocked, open],
      tiles,
      5,
    );
    assert.deepEqual(picked, { x: 10, y: 13 });
  });

  it("skips a closer off-axis hostile for linear spells", () => {
    const tiles = floorGrid(20);
    const caster = { x: 10, y: 10 };
    const diagonal = {
      id: "diag",
      x: 11,
      y: 11,
      hp: 20,
      maxHp: 20,
      name: "Rat",
      pieceType: "pawn",
    } as Enemy;
    const cardinal = {
      id: "card",
      x: 13,
      y: 10,
      hp: 20,
      maxHp: 20,
      name: "Rat",
      pieceType: "pawn",
    } as Enemy;
    const spell = { ...enemySpell(4), linear: true } as SpellConfig;
    const picked = pickNearestLiveHostileTile(
      spell,
      caster,
      [diagonal, cardinal],
      [diagonal, cardinal],
      tiles,
      4,
    );
    assert.deepEqual(picked, { x: 13, y: 10 });
  });

  it("skips a hostile inside minRange", () => {
    const tiles = floorGrid(20);
    const caster = { x: 10, y: 10 };
    const adjacent = {
      id: "adj",
      x: 11,
      y: 10,
      hp: 20,
      maxHp: 20,
      name: "Rat",
      pieceType: "pawn",
    } as Enemy;
    const farther = {
      id: "far",
      x: 13,
      y: 10,
      hp: 20,
      maxHp: 20,
      name: "Rat",
      pieceType: "pawn",
    } as Enemy;
    const spell = { ...enemySpell(4), minRange: 2 } as SpellConfig;
    const highlighted = computeTargetableTiles(spell, caster, {
      tiles,
      enemies: [adjacent, farther],
      worldGridSize: 20,
      effectiveRange: 4,
      barrierTiles: new Map(),
    });
    assert.equal(highlighted.has("11,10"), false);
    assert.equal(highlighted.has("13,10"), true);
    const picked = pickNearestLiveHostileTile(
      spell,
      caster,
      [adjacent, farther],
      [adjacent, farther],
      tiles,
      4,
    );
    assert.deepEqual(picked, { x: 13, y: 10 });
  });
});

describe("sprite-basic live gate", () => {
  it("rejects Strike beyond Chebyshev 1 so executeCastAttempt cannot snipe", () => {
    const tiles = floorGrid(20);
    const caster = { x: 10, y: 10 };
    const adjacent = { x: 11, y: 10 };
    const distant = { x: 14, y: 10 };
    const enemies: Enemy[] = [
      {
        id: "rat-adj",
        x: 11,
        y: 10,
        hp: 20,
        maxHp: 20,
        name: "Rat",
        pieceType: "pawn",
      } as Enemy,
      {
        id: "rat-far",
        x: 14,
        y: 10,
        hp: 20,
        maxHp: 20,
        name: "Rat",
        pieceType: "pawn",
      } as Enemy,
    ];
    const spell = strikeSpell();
    const near = isTileCastableLive(spell, caster, adjacent, enemies, tiles, 1);
    const far = isTileCastableLive(spell, caster, distant, enemies, tiles, 1);
    assert.equal(shouldExecuteLiveCast(near), true);
    assert.equal(shouldExecuteLiveCast(far), false);
    assert.equal(far.ok, false, "Chebyshev 4 must fail melee range 1");
  });
});

describe("barrier LoS preview vs live", () => {
  it("rejects a LoS-blocked hostile so sprite-click and Attack Nearest match the ring", () => {
    const tiles = floorGrid(20);
    const caster = { x: 10, y: 10 };
    const blocked = {
      id: "blocked",
      x: 12,
      y: 10,
      hp: 20,
      maxHp: 20,
      name: "Wraith",
      pieceType: "pawn",
    } as Enemy;
    const open = {
      id: "open",
      x: 10,
      y: 13,
      hp: 20,
      maxHp: 20,
      name: "Rat",
      pieceType: "pawn",
    } as Enemy;
    const spell = {
      ...enemySpell(5),
      lineOfSight: true,
    } as SpellConfig;
    const barriers = new Map<string, number>([["11,10", 2]]);
    const highlighted = computeTargetableTiles(spell, caster, {
      tiles,
      enemies: [blocked, open],
      worldGridSize: 20,
      effectiveRange: 5,
      barrierTiles: barriers,
    });
    assert.equal(highlighted.has("12,10"), false);
    assert.equal(highlighted.has("10,13"), true);

    const liveBlocked = isTileCastableLive(
      spell,
      caster,
      { x: 12, y: 10 },
      [blocked, open],
      tiles,
      5,
      barriers,
    );
    const liveOpen = isTileCastableLive(
      spell,
      caster,
      { x: 10, y: 13 },
      [blocked, open],
      tiles,
      5,
      barriers,
    );
    assert.equal(liveBlocked.ok, false, "mid-ray barrier must block live LoS");
    assert.equal(liveOpen.ok, true);

    const picked = pickNearestLiveHostileTile(
      spell,
      caster,
      [blocked, open],
      [blocked, open],
      tiles,
      5,
      barriers,
    );
    assert.deepEqual(picked, { x: 10, y: 13 });
  });

  it("stops a line spell at an active barrier the same way the preview does", () => {
    const tiles = floorGrid(20);
    const caster = { x: 10, y: 10 };
    const enemyOnFarSide = {
      id: "far",
      x: 13,
      y: 10,
      hp: 20,
      maxHp: 20,
      name: "Rat",
      pieceType: "pawn",
    } as Enemy;
    const spell = {
      ...enemySpell(5),
      targetType: "line",
      lineOfSight: true,
    } as SpellConfig;
    const barriers = new Map<string, number>([["12,10", 2]]);
    const highlighted = computeTargetableTiles(spell, caster, {
      tiles,
      enemies: [enemyOnFarSide],
      worldGridSize: 20,
      effectiveRange: 5,
      barrierTiles: barriers,
    });
    assert.equal(highlighted.has("13,10"), false);
    const live = isTileCastableLive(
      spell,
      caster,
      { x: 13, y: 10 },
      [enemyOnFarSide],
      tiles,
      5,
      barriers,
    );
    assert.equal(live.ok, false);
    assert.equal(live.reason, "line_blocked_barrier");
  });
});

describe("Attack Nearest live gate", () => {
  it("uses maxRange as the highlight base so grown rings stay searchable", () => {
    const spell = enemySpell(3);
    spell.maxRange = 5;
    assert.equal(spellHighlightRangeBase(spell), 5);
    assert.equal(spellHighlightRangeBase({ ...spell, maxRange: undefined }), 3);
  });

  it("skips a nearer LoS-blocked hostile so Attack Nearest cannot snipe", () => {
    const tiles = floorGrid(20);
    tiles[10][11] = "wall";
    const caster = { x: 10, y: 10 };
    const blocked = {
      id: "blocked",
      x: 12,
      y: 10,
      hp: 20,
      maxHp: 20,
      name: "Wraith",
      pieceType: "bishop",
    } as Enemy;
    const open = {
      id: "open",
      x: 10,
      y: 13,
      hp: 20,
      maxHp: 20,
      name: "Rat",
      pieceType: "pawn",
    } as Enemy;
    const spell = {
      ...enemySpell(5),
      lineOfSight: true,
    };
    const highlighted = computeTargetableTiles(spell, caster, {
      tiles,
      enemies: [blocked, open],
      worldGridSize: 20,
      effectiveRange: 5,
      barrierTiles: new Map(),
    });
    assert.equal(highlighted.has("12,10"), false);
    assert.equal(highlighted.has("10,13"), true);

    const hostiles = [blocked, open];
    const picked = pickNearestLiveHostileTile(
      spell,
      caster,
      hostiles,
      hostiles,
      tiles,
      5,
    );
    assert.deepEqual(picked, { x: 10, y: 13 });
    assert.equal(
      canAttackNearestLive(spell, caster, hostiles, hostiles, tiles, 5),
      true,
    );
  });

  it("keeps Attack Nearest on the player tile while a summon is the active caster", () => {
    const player = { x: 2, y: 2 };
    const summon = { x: 8, y: 7 };
    const origin = attackNearestLiveCasterPos(player, summon);
    assert.deepEqual(origin, player);
    assert.notDeepEqual(origin, summon);

    const tiles = floorGrid(16);
    const heal = {
      id: "starter-heal",
      name: "Blood Mend",
      description: "",
      iconEmoji: "",
      apCost: 3n,
      mpCost: 0n,
      damage: 0n,
      range: 0n,
      effectType: "heal",
      targetType: "self",
    } as SpellConfig;
    const liveAtSummon = isTileCastableLive(heal, summon, summon, [], tiles, 1);
    const liveAtPlayer = isTileCastableLive(heal, origin, origin, [], tiles, 1);
    assert.equal(shouldExecuteLiveCast(liveAtSummon), true);
    assert.equal(shouldExecuteLiveCast(liveAtPlayer), true);
    assert.equal(
      origin.x === player.x && origin.y === player.y,
      true,
      "heal Attack Nearest must land on the player tile resolvePlayerCast heals",
    );

    const adjacentToSummon = {
      id: "rat-summon-adj",
      x: 8,
      y: 8,
      hp: 20,
      maxHp: 20,
      name: "Rat",
      pieceType: "pawn",
    } as Enemy;
    const strike = strikeSpell();
    const fromSummon = pickNearestLiveHostileTile(
      strike,
      summon,
      [adjacentToSummon],
      [adjacentToSummon],
      tiles,
      1,
    );
    const fromPlayer = pickNearestLiveHostileTile(
      strike,
      origin,
      [adjacentToSummon],
      [adjacentToSummon],
      tiles,
      1,
    );
    assert.deepEqual(fromSummon, { x: 8, y: 8 });
    assert.equal(
      fromPlayer,
      null,
      "player-origin Strike must not reach a summon-adjacent hostile",
    );
    assert.equal(
      canAttackNearestLive(
        strike,
        origin,
        [adjacentToSummon],
        [adjacentToSummon],
        tiles,
        1,
      ),
      false,
    );
  });
});
