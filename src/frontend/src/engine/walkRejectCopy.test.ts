import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyWalkReject,
  isBattleWalkTileBlocked,
  playerFacingWalkReject,
  shouldFloatWorldUnreachable,
  spawnWalkRejectFloat,
} from "./walkRejectCopy.ts";

describe("isBattleWalkTileBlocked", () => {
  const empty = new Set<string>();
  const portals = new Set(["3,3"]);
  const barriers = new Set(["2,2"]);
  const voids = new Set(["1,1"]);

  it("matches highlight and execute for wall, void, barrier, and in-battle portal", () => {
    assert.equal(
      isBattleWalkTileBlocked({
        tileKind: "wall",
        key: "0,0",
        inBattle: true,
        portals,
        barriers,
        voidTiles: voids,
      }),
      true,
    );
    assert.equal(
      isBattleWalkTileBlocked({
        tileKind: "floor",
        key: "1,1",
        inBattle: true,
        portals,
        barriers,
        voidTiles: voids,
      }),
      true,
    );
    assert.equal(
      isBattleWalkTileBlocked({
        tileKind: "floor",
        key: "2,2",
        inBattle: true,
        portals,
        barriers,
        voidTiles: voids,
      }),
      true,
    );
    assert.equal(
      isBattleWalkTileBlocked({
        tileKind: "floor",
        key: "3,3",
        inBattle: true,
        portals,
        barriers,
        voidTiles: voids,
      }),
      true,
    );
    assert.equal(
      isBattleWalkTileBlocked({
        tileKind: "floor",
        key: "3,3",
        inBattle: false,
        portals,
        barriers,
        voidTiles: voids,
      }),
      false,
    );
    assert.equal(
      isBattleWalkTileBlocked({
        tileKind: "floor",
        key: "4,4",
        inBattle: true,
        portals: empty,
        barriers: empty,
        voidTiles: empty,
      }),
      false,
    );
  });
});

describe("playerFacingWalkReject", () => {
  it("uses short carved-stone walk copy", () => {
    assert.equal(playerFacingWalkReject("no_mp"), "No MP");
    assert.equal(playerFacingWalkReject("not_enough_mp"), "Not enough MP");
    assert.equal(playerFacingWalkReject("blocked"), "Can't reach");
    assert.equal(playerFacingWalkReject("unreachable"), "Can't reach");
  });
});

describe("classifyWalkReject", () => {
  it("explains 0 MP before reachability", () => {
    assert.equal(
      classifyWalkReject({
        currentMp: 0,
        isBlocked: false,
        reachable: true,
        pathLength: 2,
      }),
      "no_mp",
    );
  });

  it("treats walls and void as blocked", () => {
    assert.equal(
      classifyWalkReject({
        currentMp: 4,
        isBlocked: true,
        reachable: false,
        pathLength: 0,
      }),
      "blocked",
    );
  });

  it("rejects tiles outside the MP BFS or with no path", () => {
    assert.equal(
      classifyWalkReject({
        currentMp: 4,
        isBlocked: false,
        reachable: false,
        pathLength: 0,
      }),
      "unreachable",
    );
    assert.equal(
      classifyWalkReject({
        currentMp: 4,
        isBlocked: false,
        reachable: true,
        pathLength: 0,
      }),
      "unreachable",
    );
  });

  it("rejects a path longer than remaining MP", () => {
    assert.equal(
      classifyWalkReject({
        currentMp: 2,
        isBlocked: false,
        reachable: true,
        pathLength: 3,
      }),
      "not_enough_mp",
    );
  });

  it("allows a legal walk", () => {
    assert.equal(
      classifyWalkReject({
        currentMp: 3,
        isBlocked: false,
        reachable: true,
        pathLength: 3,
      }),
      null,
    );
  });

  it("rejects a Frozen 3-tile path when leftover MP would only cover 1× tiles", () => {
    assert.equal(
      classifyWalkReject({
        currentMp: 6,
        isBlocked: false,
        reachable: true,
        pathLength: 3,
        costPerTile: 2,
      }),
      null,
    );
    assert.equal(
      classifyWalkReject({
        currentMp: 5,
        isBlocked: false,
        reachable: true,
        pathLength: 3,
        costPerTile: 2,
      }),
      "not_enough_mp",
    );
  });

  it("rejects a leftover 1-MP Frozen step the 1× execute formula used to allow", () => {
    assert.equal(
      classifyWalkReject({
        currentMp: 1,
        isBlocked: false,
        reachable: true,
        pathLength: 1,
        costPerTile: 2,
      }),
      "not_enough_mp",
    );
  });
});

describe("shouldFloatWorldUnreachable", () => {
  it("is quiet when a path exists or the tile is self / adjacent", () => {
    assert.equal(
      shouldFloatWorldUnreachable(3, { x: 1, y: 1 }, { x: 4, y: 4 }),
      false,
    );
    assert.equal(
      shouldFloatWorldUnreachable(0, { x: 2, y: 2 }, { x: 2, y: 2 }),
      false,
    );
    assert.equal(
      shouldFloatWorldUnreachable(0, { x: 2, y: 2 }, { x: 3, y: 3 }),
      false,
    );
  });

  it("floats when an empty path is not the adjacent fallback", () => {
    assert.equal(
      shouldFloatWorldUnreachable(0, { x: 0, y: 0 }, { x: 4, y: 0 }),
      true,
    );
  });
});

describe("spawnWalkRejectFloat", () => {
  it("spawns the mapped copy at the given screen point", () => {
    const calls: Array<{ x: number; y: number; text: string }> = [];
    spawnWalkRejectFloat(
      {
        spawnFloatText: (x, y, text) => {
          calls.push({ x, y, text });
        },
      },
      { x: 40, y: 80 },
      "unreachable",
    );
    assert.deepEqual(calls, [{ x: 40, y: 80, text: "Can't reach" }]);
  });

  it("no-ops when the effects manager is missing", () => {
    assert.doesNotThrow(() =>
      spawnWalkRejectFloat(null, { x: 1, y: 1 }, "no_mp"),
    );
    assert.doesNotThrow(() =>
      spawnWalkRejectFloat(undefined, { x: 1, y: 1 }, "blocked"),
    );
  });
});
