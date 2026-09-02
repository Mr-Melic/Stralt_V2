import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Enemy, SpellConfig } from "../types/gameTypes.ts";
import {
  attackNearestResolvesOnCasterTile,
  canAffordCastAp,
  canAttackNearestAgainstLive,
  chebyshevOnBoard,
  collectHighlightLiveMismatches,
  computeTargetableTiles,
  decideSpriteCastClick,
  decideTileCastClick,
  enemyCastGeometryOk,
  enemyCastRangeOk,
  enemySpellRange,
  enemySpellRequiresLos,
  findAttackNearestTarget,
  groundTileInRange,
  hasBresenhamLoS,
  hitsAlliesIncludesPlayer,
  hitsMultipleIncludesOccupant,
  isCasterTile,
  isTileCastableLive,
  pickNearestLiveHostileTile,
  playerSpellAllowsCasterTile,
  playerSpellEffectiveRange,
  playerSpellRequiresLos,
  probeLiveCast,
  resolveCastApCost,
  shouldBypassHighlightForLiveHostile,
  shouldExecuteLiveCast,
  spellHighlightRangeBase,
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

function baseSpell(overrides: Partial<SpellConfig> = {}): SpellConfig {
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
    assert.equal(spellHighlightRangeBase(spell), 5);
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

  it("every highlighted tile is executable and every illegal tile cannot execute", () => {
    const tiles = floorGrid(12);
    tiles[5][6] = "wall";
    const enemies = [
      unit("open", 4, 5, { side: "enemy" }),
      unit("blocked", 7, 5, { side: "enemy" }),
    ];
    const barriers = new Map<string, number>([["5,7", 2]]);
    const spell = baseSpell({
      lineOfSight: true,
      maxRange: 4,
      range: 4n,
    });
    const grid = {
      tiles,
      enemies,
      worldGridSize: 12,
      effectiveRange: 4,
      barrierTiles: barriers,
    };
    assert.deepEqual(collectHighlightLiveMismatches(spell, caster, grid), {
      highlightOnly: [],
      liveOnly: [],
    });

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

  it("caps diagonal ground at the same Chebyshev box the highlight walks", () => {
    const tiles = floorGrid(11);
    const spell = baseSpell({
      targetType: "ground",
      diagonal: true,
      maxRange: 2,
      range: 2n,
    });
    assertParity(spell, caster, tiles, [], 2);
    assert.equal(groundTileInRange(2, 2, 2, true), true);
    assert.equal(groundTileInRange(3, 3, 2, true), false);
    const highlighted = computeTargetableTiles(spell, caster, {
      tiles,
      enemies: [],
      worldGridSize: 11,
      effectiveRange: 2,
      barrierTiles: new Map(),
    });
    assert.equal(highlighted.has("7,7"), true);
    assert.equal(highlighted.has("8,8"), false);
    assert.equal(
      shouldExecuteLiveCast(
        probeLiveCast(spell, caster, { x: 7, y: 7 }, [], tiles, 2),
      ),
      true,
    );
    assert.equal(
      shouldExecuteLiveCast(
        probeLiveCast(spell, caster, { x: 8, y: 8 }, [], tiles, 2),
      ),
      false,
    );
  });

  it("does not highlight or execute the caster tile for area spells", () => {
    const tiles = floorGrid(10);
    const origin = { x: 4, y: 4 };
    const spell = baseSpell({
      id: "spell-frost-nova",
      targetType: "area",
      areaRadius: 2,
      maxRange: 1,
      range: 1n,
    });
    const grid = {
      tiles,
      enemies: [unit("n", 4, 5, { side: "enemy" })],
      worldGridSize: 10,
      effectiveRange: 1,
      barrierTiles: new Map<string, number>(),
    };
    assert.deepEqual(collectHighlightLiveMismatches(spell, origin, grid), {
      highlightOnly: [],
      liveOnly: [],
    });
    const highlighted = computeTargetableTiles(spell, origin, grid);
    assert.equal(
      highlighted.has("4,4"),
      false,
      "own tile must not be a highlighted area click",
    );
    const liveSelf = probeLiveCast(
      spell,
      origin,
      origin,
      grid.enemies,
      tiles,
      1,
    );
    assert.equal(shouldExecuteLiveCast(liveSelf), false);
    assert.equal(liveSelf.reason, "caster_tile_hostile");
    assert.equal(highlighted.has("4,6"), true);
    assert.equal(
      shouldExecuteLiveCast(
        probeLiveCast(spell, origin, { x: 4, y: 6 }, grid.enemies, tiles, 1),
      ),
      true,
    );
  });

  it("linear and diagonal shapes stay in lockstep, including illegal off-axis tiles", () => {
    const tiles = floorGrid(11);
    const enemies = [unit("rat", 7, 6, { side: "enemy" })];
    const linear = baseSpell({
      targetType: "enemy",
      linear: true,
      maxRange: 3,
    });
    const diagonal = baseSpell({
      targetType: "enemy",
      diagonal: true,
      maxRange: 3,
    });
    assertParity(linear, caster, tiles, enemies, 3);
    assertParity(diagonal, caster, tiles, enemies, 3);
    const highlightedLinear = computeTargetableTiles(linear, caster, {
      tiles,
      enemies,
      worldGridSize: 11,
      effectiveRange: 3,
      barrierTiles: new Map(),
    });
    assert.equal(highlightedLinear.has("8,5"), true);
    assert.equal(highlightedLinear.has("7,6"), false);
    assert.equal(
      shouldExecuteLiveCast(
        probeLiveCast(linear, caster, { x: 8, y: 5 }, enemies, tiles, 3),
      ),
      true,
    );
    assert.equal(
      shouldExecuteLiveCast(
        probeLiveCast(linear, caster, { x: 7, y: 6 }, enemies, tiles, 3),
      ),
      false,
    );
  });

  it("treats portal tiles as floor for both highlight and live", () => {
    const tiles = floorGrid(11);
    tiles[5][8] = "portal";
    const spell = baseSpell({ targetType: "enemy", maxRange: 4 });
    assertParity(spell, caster, tiles, [], 4);
    const highlighted = computeTargetableTiles(spell, caster, {
      tiles,
      enemies: [],
      worldGridSize: 11,
      effectiveRange: 4,
      barrierTiles: new Map(),
    });
    assert.equal(highlighted.has("8,5"), true);
    assert.equal(
      shouldExecuteLiveCast(
        probeLiveCast(spell, caster, { x: 8, y: 5 }, [], tiles, 4),
      ),
      true,
    );
  });

  it("keeps a living ally highlighted and executable, and a far ally illegal", () => {
    const tiles = floorGrid(11);
    const near = unit("wolf", 7, 5, { isSummon: true, side: "player" });
    const far = unit("wolf-far", 10, 10, { isSummon: true, side: "player" });
    const spell = baseSpell({ targetType: "ally", maxRange: 3 });
    assertParity(spell, caster, tiles, [near, far], 3);
    const highlighted = computeTargetableTiles(spell, caster, {
      tiles,
      enemies: [near, far],
      worldGridSize: 11,
      effectiveRange: 3,
      barrierTiles: new Map(),
    });
    assert.equal(highlighted.has("5,5"), true);
    assert.equal(highlighted.has("7,5"), true);
    assert.equal(highlighted.has("10,10"), false);
    assert.equal(
      shouldExecuteLiveCast(
        probeLiveCast(spell, caster, { x: 7, y: 5 }, [near, far], tiles, 3),
      ),
      true,
    );
    assert.equal(
      shouldExecuteLiveCast(
        probeLiveCast(spell, caster, { x: 10, y: 10 }, [near, far], tiles, 3),
      ),
      false,
    );
  });

  it("area expansion tiles stay legal on both sides", () => {
    const tiles = floorGrid(10);
    const origin = { x: 4, y: 4 };
    const spell = baseSpell({
      id: "spell-frost-nova",
      targetType: "area",
      areaRadius: 2,
      maxRange: 1,
      range: 1n,
    });
    const grid = {
      tiles,
      enemies: [unit("n", 4, 5, { side: "enemy" })],
      worldGridSize: 10,
      effectiveRange: 1,
      barrierTiles: new Map<string, number>(),
    };
    assert.deepEqual(collectHighlightLiveMismatches(spell, origin, grid), {
      highlightOnly: [],
      liveOnly: [],
    });
    const highlighted = computeTargetableTiles(spell, origin, grid);
    assert.equal(highlighted.has("4,6"), true, "AoE footprint beyond range 1");
    assert.equal(
      probeLiveCast(spell, origin, { x: 4, y: 6 }, grid.enemies, tiles, 1).ok,
      true,
    );
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

  it("returns the caster tile for self heals and null when nothing is legal", () => {
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

  it("executes highlighted self/ally caster tiles (Timestep, Mirror, Shield)", () => {
    const tiles = floorGrid(9);
    const caster = { x: 4, y: 4 };
    const rat = unit("rat", 6, 4, { side: "enemy" });
    const timestep = baseSpell({
      id: "spell-timestep",
      targetType: "self",
      effectType: "buff",
      apCost: 0n,
      maxRange: 0,
      range: 0n,
      minRange: 0,
    });
    const mirror = baseSpell({
      id: "spell-mirror",
      targetType: "self",
      effectType: "defense",
      maxRange: 0,
      range: 0n,
      minRange: 0,
    });
    const shield = baseSpell({
      id: "starter-shield",
      targetType: "ally",
      effectType: "buff",
      maxRange: 3,
      range: 3n,
    });
    for (const spell of [timestep, mirror, shield]) {
      assertParity(spell, caster, tiles, [rat], spell.maxRange ?? 1);
      const highlighted = computeTargetableTiles(spell, caster, {
        tiles,
        enemies: [rat],
        worldGridSize: 9,
        effectiveRange: spell.maxRange ?? 1,
        barrierTiles: new Map(),
      });
      assert.equal(highlighted.has("4,4"), true);
      assert.equal(
        highlighted.has("6,4"),
        false,
        "enemy tile is not a self/ally Attack Nearest pick",
      );
      const picked = findAttackNearestTarget(
        spell,
        caster,
        [rat],
        tiles,
        spell.maxRange ?? 1,
      );
      assert.deepEqual(picked, caster);
      assert.equal(
        canAttackNearestAgainstLive(
          spell,
          caster,
          [rat],
          tiles,
          spell.maxRange ?? 1,
        ),
        true,
      );
      assert.equal(
        shouldExecuteLiveCast(
          probeLiveCast(
            spell,
            caster,
            picked!,
            [rat],
            tiles,
            spell.maxRange ?? 1,
          ),
        ),
        true,
      );
      const illegal = probeLiveCast(
        spell,
        caster,
        { x: 6, y: 4 },
        [rat],
        tiles,
        spell.maxRange ?? 1,
      );
      assert.equal(
        shouldExecuteLiveCast(illegal),
        false,
        "hostile tile is not a self/ally execute target",
      );
    }
  });

  it("probes a self-heal from the player tile, not a controlled summon tile", () => {
    const tiles = floorGrid(12);
    const player = { x: 2, y: 2 };
    const summon = { x: 8, y: 7 };
    const heal = baseSpell({
      targetType: "self",
      effectType: "heal",
      maxRange: 1,
    });
    const fromPlayer = probeLiveCast(heal, player, player, [], tiles, 1);
    const fromSummonToPlayer = probeLiveCast(
      heal,
      summon,
      player,
      [],
      tiles,
      1,
    );
    assert.equal(shouldExecuteLiveCast(fromPlayer), true);
    assert.equal(shouldExecuteLiveCast(fromSummonToPlayer), false);
    assert.deepEqual(
      findAttackNearestTarget(heal, player, [], tiles, 1),
      player,
    );
  });
});

describe("shared helpers", () => {
  it("allows the caster tile only for self / ally / all", () => {
    assert.equal(playerSpellAllowsCasterTile({ targetType: "self" }), true);
    assert.equal(playerSpellAllowsCasterTile({ targetType: "ally" }), true);
    assert.equal(playerSpellAllowsCasterTile({ targetType: "all" }), true);
    assert.equal(playerSpellAllowsCasterTile({ targetType: "area" }), false);
    assert.equal(playerSpellAllowsCasterTile({ targetType: "enemy" }), false);
    assert.equal(isCasterTile({ x: 3, y: 3 }, { x: 3, y: 3 }), true);
    assert.equal(isCasterTile({ x: 3, y: 3 }, { x: 4, y: 3 }), false);
  });

  it("requires LoS only when lineOfSight is truthy", () => {
    assert.equal(playerSpellRequiresLos({}), false);
    assert.equal(playerSpellRequiresLos({ lineOfSight: false }), false);
    assert.equal(playerSpellRequiresLos({ lineOfSight: true }), true);
  });

  it("applies the same range bonus the highlight uses", () => {
    const spell = baseSpell({
      maxRange: 3,
      range: 3n,
      modifiableRange: true,
    });
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
    const barriers = new Set(["5,3"]);
    assert.equal(
      hasBresenhamLoS({ x: 3, y: 3 }, { x: 6, y: 3 }, tiles, barriers),
      false,
    );
    assert.equal(
      hasBresenhamLoS({ x: 3, y: 3 }, { x: 3, y: 5 }, tiles, new Map()),
      true,
    );
    tiles[4][3] = "wall";
    assert.equal(
      hasBresenhamLoS({ x: 3, y: 3 }, { x: 3, y: 5 }, tiles, new Map()),
      false,
    );
    assert.equal(
      hasBresenhamLoS({ x: 3, y: 3 }, { x: 3, y: 4 }, tiles, new Map()),
      true,
    );
  });

  it("skips the cached highlight set only when the live gate passes", () => {
    const ok = { ok: true, reason: "enemy" };
    const blocked = { ok: false, reason: "los_blocked" };
    assert.equal(shouldBypassHighlightForLiveHostile(true, ok), true);
    assert.equal(shouldBypassHighlightForLiveHostile(true, blocked), false);
    assert.equal(shouldBypassHighlightForLiveHostile(false, ok), false);
  });

  it("lets mouse and touch share one highlight-vs-live click decision", () => {
    const liveOk = { ok: true, reason: "enemy" };
    const liveFail = { ok: false, reason: "los_blocked" };
    assert.deepEqual(
      decideTileCastClick({
        live: liveOk,
        tileHighlighted: true,
        occupantIsLiveHostile: false,
      }),
      { action: "execute", bypassHighlight: false },
    );
    assert.deepEqual(
      decideTileCastClick({
        live: liveFail,
        tileHighlighted: true,
        occupantIsLiveHostile: false,
      }),
      { action: "reject", reason: "los_blocked" },
    );
    assert.deepEqual(
      decideTileCastClick({
        live: liveOk,
        tileHighlighted: false,
        occupantIsLiveHostile: false,
      }),
      { action: "reject", reason: "out_of_range" },
    );
    assert.deepEqual(
      decideTileCastClick({
        live: liveOk,
        tileHighlighted: false,
        occupantIsLiveHostile: true,
      }),
      { action: "execute", bypassHighlight: true },
    );
    assert.deepEqual(
      decideTileCastClick({
        live: liveFail,
        tileHighlighted: true,
        occupantIsLiveHostile: true,
      }),
      { action: "reject", reason: "los_blocked" },
    );
  });

  it("measures hitsAllies from the click, same Chebyshev as hitsMultiple", () => {
    assert.equal(chebyshevOnBoard({ x: 4, y: 4 }, { x: 4, y: 5 }), 1);
    assert.equal(
      hitsMultipleIncludesOccupant({ x: 4, y: 5 }, { x: 4, y: 4 }, 1),
      true,
    );
    assert.equal(
      hitsMultipleIncludesOccupant({ x: 0, y: 0 }, { x: 4, y: 4 }, 1),
      false,
    );
    assert.equal(
      hitsAlliesIncludesPlayer(
        { hitsAllies: true, hitsMultiple: true },
        { x: 4, y: 5 },
        { x: 4, y: 4 },
        1,
      ),
      true,
    );
    assert.equal(
      hitsAlliesIncludesPlayer(
        { hitsAllies: true, hitsMultiple: true },
        { x: 0, y: 0 },
        { x: 4, y: 4 },
        1,
      ),
      false,
    );
    assert.equal(
      hitsAlliesIncludesPlayer(
        { hitsAllies: true, hitsMultiple: false },
        { x: 4, y: 5 },
        { x: 4, y: 4 },
        1,
      ),
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

  it("picks the same nearest hostile the live gate would execute", () => {
    const tiles = floorGrid(10);
    const caster = { x: 4, y: 4 };
    const barriers = new Map<string, number>([["5,4", 1]]);
    const spell = baseSpell({
      lineOfSight: true,
      maxRange: 3,
      range: 3n,
    });
    const enemies = [unit("blocked", 6, 4, { side: "enemy" })];
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
});

describe("player vs enemy LoS / range policies", () => {
  it("does not merge player truthy-LoS with enemy default-on LoS", () => {
    assert.equal(playerSpellRequiresLos({}), false);
    assert.equal(playerSpellRequiresLos({ lineOfSight: false }), false);
    assert.equal(playerSpellRequiresLos({ lineOfSight: true }), true);
    assert.equal(enemySpellRequiresLos({}), true);
    assert.equal(enemySpellRequiresLos({ lineOfSight: false }), false);
    assert.equal(enemySpellRequiresLos({ lineOfSight: true }), true);
  });

  it("keeps AI range on Number(spell.range), not maxRange", () => {
    const spell = baseSpell({ range: 2n, maxRange: 6 });
    assert.equal(enemySpellRange(spell), 2);
    assert.equal(spellRangeBase(spell), 6);
  });

  it("lets a no-LoS enemy spell execute through a wall the player gate would skip", () => {
    const origin = { x: 4, y: 4 };
    const target = { x: 7, y: 4 };
    const throughWall = enemyCastGeometryOk({
      origin,
      target,
      spell: { range: 4n, lineOfSight: false },
      hasLoS: false,
    });
    const defaultLos = enemyCastGeometryOk({
      origin,
      target,
      spell: { range: 4n },
      hasLoS: false,
    });
    assert.equal(throughWall, true);
    assert.equal(defaultLos, false);
    assert.equal(
      enemyCastGeometryOk({
        origin,
        target: { x: 8, y: 4 },
        spell: { range: 3n, lineOfSight: false },
        hasLoS: false,
      }),
      false,
      "out of Chebyshev range is still illegal",
    );
  });

  it("shares Chebyshev range between geometry and range-only healer/bomber checks", () => {
    const origin = { x: 2, y: 2 };
    const inRange = { x: 4, y: 3 };
    const out = { x: 6, y: 2 };
    const spell = { range: 3n };
    assert.equal(enemyCastRangeOk(origin, inRange, spell), true);
    assert.equal(enemyCastRangeOk(origin, out, spell), false);
    assert.equal(
      enemyCastGeometryOk({
        origin,
        target: inRange,
        spell,
        hasLoS: false,
      }),
      false,
      "default-on LoS still blocks healer-style range-ok tiles",
    );
    assert.equal(
      enemyCastGeometryOk({
        origin,
        target: inRange,
        spell: { range: 3n, lineOfSight: false },
        hasLoS: false,
      }),
      true,
    );
  });
});

describe("decideSpriteCastClick mouse/touch table", () => {
  const liveOk = true;
  const liveFail = false;

  it("executes a live-ok hostile sprite and rejects an illegal one", () => {
    assert.deepEqual(
      decideSpriteCastClick({
        selectedSpellId: "starter-poison",
        hasSelectedSpell: true,
        hitKind: "enemy",
        playerCastOk: true,
        inBattle: true,
        liveOk,
        selfOrAllySpell: false,
        hasBasicAttack: false,
      }),
      { action: "execute", source: "sprite-enemy" },
    );
    assert.deepEqual(
      decideSpriteCastClick({
        selectedSpellId: "starter-poison",
        hasSelectedSpell: true,
        hitKind: "enemy",
        playerCastOk: true,
        inBattle: true,
        liveOk: liveFail,
        selfOrAllySpell: false,
        hasBasicAttack: false,
      }),
      { action: "reject_live" },
    );
  });

  it("does not let Strike execute off-turn or out of live range", () => {
    assert.deepEqual(
      decideSpriteCastClick({
        selectedSpellId: null,
        hasSelectedSpell: false,
        hitKind: "enemy",
        playerCastOk: true,
        inBattle: true,
        liveOk: liveFail,
        selfOrAllySpell: false,
        hasBasicAttack: true,
      }),
      { action: "inspect" },
    );
    assert.deepEqual(
      decideSpriteCastClick({
        selectedSpellId: null,
        hasSelectedSpell: false,
        hitKind: "enemy",
        playerCastOk: true,
        inBattle: true,
        liveOk,
        selfOrAllySpell: false,
        hasBasicAttack: true,
      }),
      { action: "execute", source: "sprite-basic" },
    );
    assert.deepEqual(
      decideSpriteCastClick({
        selectedSpellId: "starter-heal",
        hasSelectedSpell: true,
        hitKind: "player",
        playerCastOk: true,
        inBattle: true,
        liveOk,
        selfOrAllySpell: true,
        hasBasicAttack: false,
      }),
      { action: "execute", source: "sprite-player" },
    );
    assert.deepEqual(
      decideSpriteCastClick({
        selectedSpellId: "starter-poison",
        hasSelectedSpell: true,
        hitKind: "enemy",
        playerCastOk: false,
        inBattle: true,
        liveOk,
        selfOrAllySpell: false,
        hasBasicAttack: false,
      }),
      { action: "wait_for_turn" },
    );
  });

  it("heal sprite off-turn waits, live-illegal heal rejects, unselected summon inspects", () => {
    assert.deepEqual(
      decideSpriteCastClick({
        selectedSpellId: "starter-heal",
        hasSelectedSpell: true,
        hitKind: "player",
        playerCastOk: false,
        inBattle: true,
        liveOk,
        selfOrAllySpell: true,
        hasBasicAttack: false,
      }),
      { action: "wait_for_turn" },
    );
    assert.deepEqual(
      decideSpriteCastClick({
        selectedSpellId: "starter-heal",
        hasSelectedSpell: true,
        hitKind: "player",
        playerCastOk: true,
        inBattle: true,
        liveOk: liveFail,
        selfOrAllySpell: true,
        hasBasicAttack: false,
      }),
      { action: "reject_live" },
    );
    assert.deepEqual(
      decideSpriteCastClick({
        selectedSpellId: null,
        hasSelectedSpell: false,
        hitKind: "summon",
        playerCastOk: true,
        inBattle: true,
        liveOk,
        selfOrAllySpell: false,
        hasBasicAttack: false,
      }),
      { action: "inspect" },
    );
  });
});

describe("resolveCastApCost", () => {
  it("is the same debit canAffordCastAp and planPlayerCastResources use", () => {
    const apply = (base: number) => Math.max(1, base - 1);
    assert.equal(resolveCastApCost(4, apply), 3);
    assert.equal(canAffordCastAp(3, 4, apply), true);
    assert.equal(canAffordCastAp(2, 4, apply), false);
  });
});

describe("self/ally Attack Nearest vs sprite caster-tile hits", () => {
  it("treats targetType all as a sprite self hit and keeps Attack Nearest on hostiles", () => {
    assert.equal(playerSpellAllowsCasterTile({ targetType: "all" }), true);
    assert.equal(
      attackNearestResolvesOnCasterTile({ targetType: "all" }),
      false,
    );
    assert.equal(
      attackNearestResolvesOnCasterTile({ targetType: "self" }),
      true,
    );
    assert.deepEqual(
      decideSpriteCastClick({
        selectedSpellId: "spell-timestep",
        hasSelectedSpell: true,
        hitKind: "player",
        playerCastOk: true,
        inBattle: true,
        liveOk: true,
        selfOrAllySpell: playerSpellAllowsCasterTile({ targetType: "self" }),
        hasBasicAttack: false,
      }),
      { action: "execute", source: "sprite-player" },
    );
    assert.deepEqual(
      decideSpriteCastClick({
        selectedSpellId: "spell-timestep",
        hasSelectedSpell: true,
        hitKind: "player",
        playerCastOk: true,
        inBattle: true,
        liveOk: false,
        selfOrAllySpell: playerSpellAllowsCasterTile({ targetType: "self" }),
        hasBasicAttack: false,
      }),
      { action: "reject_live" },
    );
  });
});
