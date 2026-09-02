import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Enemy, SpellConfig } from "../types/gameTypes.ts";
import {
  collectHighlightLiveMismatches,
  computeTargetableTiles,
  findAttackNearestTarget,
  isTileCastableLive,
  shouldExecuteLiveCast,
  spellRangeBase,
} from "./targeting.ts";

function floorGrid(size: number): Array<Array<"floor" | "wall" | "portal">> {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => "floor" as const),
  );
}

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
    hp: 20,
    maxHp: 20,
    name: id,
    pieceType: "pawn",
    ...extras,
  } as Enemy;
}

function baseSpell(overrides: Partial<SpellConfig>): SpellConfig {
  return {
    id: "test-spell",
    name: "Test",
    description: "",
    iconEmoji: "",
    apCost: 2n,
    mpCost: 0n,
    damage: 8n,
    range: 3n,
    effectType: "damage",
    targetType: "enemy",
    maxRange: 3,
    minRange: 1,
    ...overrides,
  } as SpellConfig;
}

function assertParity(
  spell: SpellConfig,
  caster: { x: number; y: number },
  tiles: Array<Array<"floor" | "wall" | "portal">>,
  enemies: Enemy[],
  range: number,
  barriers: Map<string, number> = new Map(),
): void {
  const { highlightOnly, liveOnly } = collectHighlightLiveMismatches(
    spell,
    caster,
    enemies,
    tiles,
    range,
    barriers,
  );
  assert.deepEqual(
    highlightOnly,
    [],
    `highlighted but not executable: ${highlightOnly.join(" ")}`,
  );
  assert.deepEqual(
    liveOnly,
    [],
    `executable but not highlighted: ${liveOnly.join(" ")}`,
  );
}

describe("spellRangeBase", () => {
  it("prefers maxRange over range so Attack Nearest matches the highlight", () => {
    const spell = baseSpell({ range: 2n, maxRange: 5 });
    assert.equal(spellRangeBase(spell), 5);
    assert.equal(
      spellRangeBase(baseSpell({ range: 4n, maxRange: undefined })),
      4,
    );
  });
});

describe("highlight vs live parity", () => {
  const caster = { x: 5, y: 5 };

  it("keeps enemy / self / ally / ground / area / line / chain / all in lockstep", () => {
    const tiles = floorGrid(11);
    const wolf = unit("wolf", 7, 5, { isSummon: true, side: "player" });
    const rat = unit("rat", 8, 5, { side: "enemy" });
    const deadAlly = unit("corpse", 6, 6, {
      isSummon: true,
      side: "player",
      hp: 0,
    });
    const enemies = [wolf, rat, deadAlly];

    assertParity(baseSpell({ targetType: "enemy" }), caster, tiles, enemies, 3);
    assertParity(baseSpell({ targetType: "self" }), caster, tiles, enemies, 3);
    assertParity(baseSpell({ targetType: "ally" }), caster, tiles, enemies, 3);
    assertParity(
      baseSpell({ targetType: "ground" }),
      caster,
      tiles,
      enemies,
      3,
    );
    assertParity(
      baseSpell({ targetType: "area", areaRadius: 1 }),
      caster,
      tiles,
      enemies,
      3,
    );
    assertParity(baseSpell({ targetType: "line" }), caster, tiles, enemies, 3);
    assertParity(baseSpell({ targetType: "chain" }), caster, tiles, enemies, 3);
    assertParity(baseSpell({ targetType: "all" }), caster, tiles, enemies, 3);
  });

  it("rejects a dead ally on both the highlight and the live gate", () => {
    const tiles = floorGrid(11);
    const dead = unit("dead-wolf", 7, 5, {
      isSummon: true,
      side: "player",
      hp: 0,
    });
    const spell = baseSpell({ targetType: "ally", maxRange: 4 });
    const highlighted = computeTargetableTiles(spell, caster, {
      tiles,
      enemies: [dead],
      worldGridSize: 11,
      effectiveRange: 4,
      barrierTiles: new Map(),
    });
    assert.equal(highlighted.has("7,5"), false);
    const live = isTileCastableLive(
      spell,
      caster,
      { x: 7, y: 5 },
      [dead],
      tiles,
      4,
    );
    assert.equal(shouldExecuteLiveCast(live), false);
  });

  it("does not highlight or execute a line tile inside minRange", () => {
    const tiles = floorGrid(11);
    const spell = baseSpell({ targetType: "line", minRange: 2, maxRange: 4 });
    const highlighted = computeTargetableTiles(spell, caster, {
      tiles,
      enemies: [],
      worldGridSize: 11,
      effectiveRange: 4,
      barrierTiles: new Map(),
    });
    assert.equal(highlighted.has("6,5"), false);
    assert.equal(highlighted.has("7,5"), true);
    const near = isTileCastableLive(
      spell,
      caster,
      { x: 6, y: 5 },
      [],
      tiles,
      4,
    );
    const far = isTileCastableLive(spell, caster, { x: 7, y: 5 }, [], tiles, 4);
    assert.equal(shouldExecuteLiveCast(near), false);
    assert.equal(shouldExecuteLiveCast(far), true);
  });

  it("blocks LoS on both preview and execution when a barrier sits between", () => {
    const tiles = floorGrid(11);
    const barriers = new Map<string, number>([["6,5", 2]]);
    const rat = unit("rat", 8, 5, { side: "enemy" });
    const spell = baseSpell({
      targetType: "enemy",
      lineOfSight: true,
      maxRange: 4,
    });
    assertParity(spell, caster, tiles, [rat], 4, barriers);
    const highlighted = computeTargetableTiles(spell, caster, {
      tiles,
      enemies: [rat],
      worldGridSize: 11,
      effectiveRange: 4,
      barrierTiles: barriers,
    });
    assert.equal(highlighted.has("8,5"), false);
    const live = isTileCastableLive(
      spell,
      caster,
      { x: 8, y: 5 },
      [rat],
      tiles,
      4,
      barriers,
    );
    assert.equal(shouldExecuteLiveCast(live), false);
    assert.equal(live.reason, "los_blocked");
  });

  it("keeps area+freeCells occupied tiles off the anchor set on both sides", () => {
    const tiles = floorGrid(9);
    const origin = { x: 4, y: 4 };
    const blocked = unit("block", 6, 4, { side: "enemy" });
    tiles[3][5] = "wall";
    tiles[3][6] = "wall";
    tiles[3][7] = "wall";
    tiles[4][5] = "wall";
    tiles[4][7] = "wall";
    tiles[5][5] = "wall";
    tiles[5][6] = "wall";
    tiles[5][7] = "wall";
    const spell = baseSpell({
      targetType: "area",
      areaRadius: 1,
      freeCells: true,
      maxRange: 3,
    });
    assertParity(spell, origin, tiles, [blocked], 3);
    const live = isTileCastableLive(
      spell,
      origin,
      { x: 6, y: 4 },
      [blocked],
      tiles,
      3,
    );
    assert.equal(shouldExecuteLiveCast(live), false);
  });
});

describe("findAttackNearestTarget", () => {
  it("picks a highlighted legal hostile and refuses a LoS-blocked nearer one", () => {
    const tiles = floorGrid(11);
    const caster = { x: 5, y: 5 };
    const blocked = unit("blocked", 7, 5, { side: "enemy" });
    const open = unit("open", 5, 8, { side: "enemy" });
    const barriers = new Map<string, number>([["6,5", 2]]);
    const spell = baseSpell({
      targetType: "enemy",
      lineOfSight: true,
      maxRange: 4,
    });
    const picked = findAttackNearestTarget(
      spell,
      caster,
      [blocked, open],
      tiles,
      4,
      barriers,
    );
    assert.deepEqual(picked, { x: 5, y: 8 });
    const live = isTileCastableLive(
      spell,
      caster,
      picked!,
      [blocked, open],
      tiles,
      4,
      barriers,
    );
    assert.equal(shouldExecuteLiveCast(live), true);
    const illegal = isTileCastableLive(
      spell,
      caster,
      { x: 7, y: 5 },
      [blocked, open],
      tiles,
      4,
      barriers,
    );
    assert.equal(shouldExecuteLiveCast(illegal), false);
  });

  it("returns the caster tile for self spells and null when nothing is legal", () => {
    const tiles = floorGrid(7);
    const caster = { x: 3, y: 3 };
    const heal = baseSpell({
      targetType: "self",
      effectType: "heal",
      maxRange: 1,
    });
    assert.deepEqual(
      findAttackNearestTarget(heal, caster, [], tiles, 1),
      caster,
    );
    const losSpell = baseSpell({
      targetType: "enemy",
      lineOfSight: true,
      maxRange: 2,
    });
    const behindWall = unit("hid", 3, 6, { side: "enemy" });
    tiles[4][3] = "wall";
    tiles[5][3] = "wall";
    assert.equal(
      findAttackNearestTarget(losSpell, caster, [behindWall], tiles, 2),
      null,
    );
  });
});

describe("highlight vs live parity", () => {
  it("every highlighted tile is executable and every illegal tile cannot execute", () => {
    const tiles = floorGrid(12);
    tiles[5][6] = "wall";
    const caster = { x: 5, y: 5 };
    const enemies = [rat("open", 4, 5), rat("blocked", 7, 5)];
    const barriers = new Map<string, number>([["5,7", 2]]);
    const spell = enemySpell({ lineOfSight: true });
    const grid = {
      tiles,
      enemies,
      worldGridSize: 12,
      effectiveRange: 4,
      barrierTiles: barriers,
    };
    const mismatches = collectHighlightLiveMismatches(spell, caster, grid);
    assert.deepEqual(mismatches, []);

    const highlighted = computeTargetableTiles(spell, caster, grid);
    assert.equal(highlighted.has("4,5"), true);
    assert.equal(
      shouldExecuteLiveCast(
        probeLiveCast(
          spell,
          caster,
          { x: 4, y: 5 },
          enemies,
          tiles,
          4,
          barriers,
        ),
      ),
      true,
    );
    assert.equal(highlighted.has("7,5"), false, "wall at 6,5 blocks east");
    assert.equal(
      shouldExecuteLiveCast(
        probeLiveCast(
          spell,
          caster,
          { x: 7, y: 5 },
          enemies,
          tiles,
          4,
          barriers,
        ),
      ),
      false,
    );
    assert.equal(highlighted.has("5,8"), false, "barrier at 5,7 blocks south");
  });

  it("LoS-blocked tiles are neither highlighted nor live-ok", () => {
    const tiles = floorGrid(10);
    tiles[4][5] = "wall";
    const caster = { x: 4, y: 4 };
    const spell = enemySpell({ lineOfSight: true, maxRange: 3, range: 3n });
    const enemies = [rat("hidden", 6, 4)];
    const grid = {
      tiles,
      enemies,
      worldGridSize: 10,
      effectiveRange: 3,
      barrierTiles: new Map<string, number>(),
    };
    assert.deepEqual(collectHighlightLiveMismatches(spell, caster, grid), []);
    const highlighted = computeTargetableTiles(spell, caster, grid);
    assert.equal(highlighted.has("6,4"), false);
    assert.equal(
      probeLiveCast(spell, caster, { x: 6, y: 4 }, enemies, tiles, 3).ok,
      false,
    );
  });

  it("a barrier between caster and target blocks the same way as a wall", () => {
    const tiles = floorGrid(10);
    const caster = { x: 4, y: 4 };
    const barriers = new Map<string, number>([["5,4", 1]]);
    const spell = enemySpell({ lineOfSight: true, maxRange: 3, range: 3n });
    const enemies = [rat("blocked", 6, 4)];
    const grid = {
      tiles,
      enemies,
      worldGridSize: 10,
      effectiveRange: 3,
      barrierTiles: barriers,
    };
    assert.deepEqual(collectHighlightLiveMismatches(spell, caster, grid), []);
    assert.equal(
      hasBresenhamLoS(tiles, caster, { x: 6, y: 4 }, barriers),
      false,
    );
    assert.equal(
      shouldExecuteLiveCast(
        probeLiveCast(
          spell,
          caster,
          { x: 6, y: 4 },
          enemies,
          tiles,
          3,
          barriers,
        ),
      ),
      false,
    );
    assert.equal(
      pickNearestLiveHostileTile(
        spell,
        caster,
        enemies,
        enemies,
        tiles,
        3,
        barriers,
      ),
      null,
    );
  });

  it("ground / barrier placement rejects occupied and barrier tiles on both sides", () => {
    const tiles = floorGrid(8);
    const caster = { x: 3, y: 3 };
    const enemies = [rat("occ", 4, 3)];
    const barriers = new Map<string, number>([["3,4", 2]]);
    const spell = enemySpell({
      id: "spell-barrier",
      targetType: "ground",
      isBarrier: true,
      maxRange: 2,
      range: 2n,
      minRange: 0,
    });
    const grid = {
      tiles,
      enemies,
      worldGridSize: 8,
      effectiveRange: 2,
      barrierTiles: barriers,
    };
    assert.deepEqual(collectHighlightLiveMismatches(spell, caster, grid), []);
    const highlighted = computeTargetableTiles(spell, caster, grid);
    assert.equal(highlighted.has("4,3"), false);
    assert.equal(highlighted.has("3,4"), false);
    assert.equal(highlighted.has("5,3"), true);
    assert.equal(
      probeLiveCast(spell, caster, { x: 5, y: 3 }, enemies, tiles, 2, barriers)
        .ok,
      true,
    );
  });

  it("ally highlight skips dead summons; live rejects them", () => {
    const tiles = floorGrid(8);
    const caster = { x: 3, y: 3 };
    const dead = rat("wolf", 5, 3, {
      isSummon: true,
      side: "player",
      hp: 0,
    });
    const liveAlly = rat("wolf2", 4, 3, {
      isSummon: true,
      side: "player",
      hp: 10,
    });
    const spell = enemySpell({
      id: "starter-shield",
      targetType: "ally",
      effectType: "buff",
      maxRange: 3,
      range: 3n,
    });
    const enemies = [dead, liveAlly];
    const grid = {
      tiles,
      enemies,
      worldGridSize: 8,
      effectiveRange: 3,
      barrierTiles: new Map<string, number>(),
    };
    assert.deepEqual(collectHighlightLiveMismatches(spell, caster, grid), []);
    const highlighted = computeTargetableTiles(spell, caster, grid);
    assert.equal(highlighted.has("3,3"), true);
    assert.equal(highlighted.has("4,3"), true);
    assert.equal(highlighted.has("5,3"), false);
    assert.equal(
      probeLiveCast(spell, caster, { x: 5, y: 3 }, enemies, tiles, 3).ok,
      false,
    );
  });

  it("line minRange is honored by highlight and live", () => {
    const tiles = floorGrid(10);
    const caster = { x: 4, y: 4 };
    const spell = enemySpell({
      targetType: "line",
      maxRange: 4,
      range: 4n,
      minRange: 2,
    });
    const grid = {
      tiles,
      enemies: [],
      worldGridSize: 10,
      effectiveRange: 4,
      barrierTiles: new Map<string, number>(),
    };
    assert.deepEqual(collectHighlightLiveMismatches(spell, caster, grid), []);
    const highlighted = computeTargetableTiles(spell, caster, grid);
    assert.equal(highlighted.has("5,4"), false);
    assert.equal(highlighted.has("6,4"), true);
    assert.equal(
      probeLiveCast(spell, caster, { x: 5, y: 4 }, [], tiles, 4).ok,
      false,
    );
    assert.equal(
      probeLiveCast(spell, caster, { x: 6, y: 4 }, [], tiles, 4).ok,
      true,
    );
  });

  it("area expansion tiles stay legal on both sides", () => {
    const tiles = floorGrid(10);
    const caster = { x: 4, y: 4 };
    const spell = enemySpell({
      id: "spell-frost-nova",
      targetType: "area",
      areaRadius: 2,
      maxRange: 1,
      range: 1n,
    });
    const grid = {
      tiles,
      enemies: [rat("n", 4, 5)],
      worldGridSize: 10,
      effectiveRange: 1,
      barrierTiles: new Map<string, number>(),
    };
    assert.deepEqual(collectHighlightLiveMismatches(spell, caster, grid), []);
    const highlighted = computeTargetableTiles(spell, caster, grid);
    assert.equal(highlighted.has("4,6"), true, "AoE footprint beyond range 1");
    assert.equal(
      probeLiveCast(spell, caster, { x: 4, y: 6 }, grid.enemies, tiles, 1).ok,
      true,
    );
  });

  it("entity-first bypass is only granted when the live gate passes", () => {
    const ok = { ok: true, reason: "enemy" };
    const blocked = { ok: false, reason: "los_blocked" };
    assert.equal(shouldBypassHighlightForLiveHostile(true, ok), true);
    assert.equal(shouldBypassHighlightForLiveHostile(true, blocked), false);
    assert.equal(shouldBypassHighlightForLiveHostile(false, ok), false);
  });

  it("player LoS is opt-in; unset lineOfSight does not require a ray", () => {
    assert.equal(playerSpellRequiresLos({}), false);
    assert.equal(playerSpellRequiresLos({ lineOfSight: false }), false);
    assert.equal(playerSpellRequiresLos({ lineOfSight: true }), true);
  });
});

describe("shared helpers", () => {
  it("requires LoS only when lineOfSight is truthy", () => {
    assert.equal(playerSpellRequiresLos({} as SpellConfig), false);
    assert.equal(
      playerSpellRequiresLos({ lineOfSight: false } as SpellConfig),
      false,
    );
    assert.equal(
      playerSpellRequiresLos({ lineOfSight: true } as SpellConfig),
      true,
    );
  });

  it("applies the same range bonus the highlight uses", () => {
    const spell = enemySpell(3);
    spell.modifiableRange = true;
    assert.equal(
      playerSpellEffectiveRange(spell, (base, id) => {
        assert.equal(base, spellHighlightRangeBase(spell));
        assert.equal(id, spell.id);
        return base + 2;
      }),
      5,
    );
  });

  it("blocks LoS on intermediate walls and barriers, not origin or dest", () => {
    const tiles = floorGrid(8);
    tiles[3][4] = "wall";
    tiles[4][3] = "wall";
    const barriers = new Set(["5,3"]);
    assert.equal(
      hasBresenhamLoS({ x: 3, y: 3 }, { x: 6, y: 3 }, tiles, barriers),
      false,
    );
    assert.equal(
      hasBresenhamLoS({ x: 3, y: 3 }, { x: 3, y: 5 }, tiles, new Map()),
      false,
    );
    assert.equal(
      hasBresenhamLoS({ x: 3, y: 3 }, { x: 3, y: 4 }, tiles, new Map()),
      true,
    );
  });

  it("skips the cached highlight set only for a living hostile that is live-ok", () => {
    assert.equal(
      shouldBypassHighlightForLiveHostile({ hp: 10 }, true, {
        ok: true,
        reason: "enemy",
      }),
      true,
    );
    assert.equal(
      shouldBypassHighlightForLiveHostile({ hp: 0 }, true, {
        ok: true,
        reason: "enemy",
      }),
      false,
    );
    assert.equal(
      shouldBypassHighlightForLiveHostile({ hp: 10 }, true, {
        ok: false,
        reason: "los_blocked",
      }),
      false,
    );
  });

  it("uses the execute-path AP modifier for the Attack Nearest preview", () => {
    assert.equal(
      canAffordCastAp(3, 4, (base) => Math.max(1, base - 1)),
      true,
    );
    assert.equal(
      canAffordCastAp(2, 4, (base) => Math.max(1, base - 1)),
      false,
    );
  });
});
