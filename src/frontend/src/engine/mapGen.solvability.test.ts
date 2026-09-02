import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { WORLD_GRID_SIZE } from "../data/gameConstants.ts";
import {
  persistBossRushRewardsThroughLock,
  persistBossRushRoomClear,
  progressAfterRoomClear,
  resumeRoomFromPersisted,
} from "../hooks/bossRushProgress.ts";
import { tryClaimDungeonChainBonus } from "../utils/dokaPersist.ts";
import {
  generateSeededBossPortalEncounter,
  generateSeededBossRushRoom,
  generateSeededDeathRealm,
  generateSeededRestMap,
  generateSeededSanctuary,
  generateSeededWorld,
  reportWorld,
  simulateBattleStartOnWorld,
  simulateCleanupSnapshotProgression,
  simulateClearUnlocksPortal,
  simulateCorpsesOnWorld,
  simulateEnemyWanderOnWorld,
  simulateRestExitEncounter,
  simulateSummonsOnWorld,
  simulateWalkBlockersOnWorld,
} from "./mapGen.simulate.ts";
import {
  MAP_ARCHETYPES,
  applyFinalizedLayout,
  applyVoidTiles,
  attachWhitePortalAfterLegalize,
  canPlaceWalkBlocker,
  createSeededRng,
  evaluateSolvability,
  finalizePlayableLayout,
  resetFailedGenerationVoids,
  sequentialClearUnlocks,
} from "./mapGen.ts";
import { placeWhitePortalAtSpawn } from "./portalRules.ts";

const W = "wall";
const F = "floor";

describe("ensureReachability / finalizePlayableLayout regressions", () => {
  it("seed-wall-spawn: legalizes a player standing on a wall", () => {
    const tiles = [
      [W, W, W, W, W],
      [W, W, F, F, W],
      [W, F, F, F, W],
      [W, F, F, F, W],
      [W, W, W, W, W],
    ];
    const before = evaluateSolvability(
      tiles,
      new Set(),
      { x: 1, y: 1 },
      [{ x: 3, y: 1 }],
      [{ x: 3, y: 3 }],
      5,
      5,
    );
    assert.equal(before.playerSpawnLegal, false, "fixture must start illegal");
    const finalized = finalizePlayableLayout({
      tiles,
      voidTiles: new Set(),
      playerSpawn: { x: 1, y: 1 },
      portals: [{ x: 3, y: 1 }],
      spawns: [{ x: 3, y: 3 }],
      w: 5,
      h: 5,
    });
    const after = evaluateSolvability(
      finalized.tiles,
      new Set(),
      finalized.playerSpawn,
      finalized.portals,
      finalized.spawns,
      5,
      5,
    );
    assert.equal(after.ok, true, after.failures.join(","));
  });

  it("seed-void-portal: relocates a void-pocket exit onto the walkable graph", () => {
    const tiles = [
      [F, F, F, W, W],
      [F, F, F, W, W],
      [F, F, F, W, W],
      [W, W, W, W, W],
      [W, W, W, W, F],
    ];
    const voidTiles = new Set(["4,4"]);
    const before = evaluateSolvability(
      tiles,
      voidTiles,
      { x: 0, y: 0 },
      [{ x: 4, y: 4 }],
      [{ x: 1, y: 1 }],
      5,
      5,
    );
    assert.equal(before.portalReachable, false, "fixture must start sealed");
    const finalized = finalizePlayableLayout({
      tiles,
      voidTiles,
      playerSpawn: { x: 0, y: 0 },
      portals: [{ x: 4, y: 4 }],
      spawns: [{ x: 1, y: 1 }],
      w: 5,
      h: 5,
    });
    const after = evaluateSolvability(
      finalized.tiles,
      voidTiles,
      finalized.playerSpawn,
      finalized.portals,
      finalized.spawns,
      5,
      5,
    );
    assert.equal(after.ok, true, after.failures.join(","));
  });

  it("seed-long-carve: relocates a portal more than 8 walls away", () => {
    const tiles = Array.from({ length: 12 }, () => Array(12).fill(W));
    tiles[0][0] = F;
    tiles[0][1] = F;
    tiles[0][11] = F;
    const before = evaluateSolvability(
      tiles,
      new Set(),
      { x: 0, y: 0 },
      [{ x: 11, y: 0 }],
      [],
      12,
      12,
    );
    assert.equal(before.portalReachable, false);
    const finalized = finalizePlayableLayout({
      tiles,
      voidTiles: new Set(),
      playerSpawn: { x: 0, y: 0 },
      portals: [{ x: 11, y: 0 }],
      spawns: [],
      w: 12,
      h: 12,
    });
    const after = evaluateSolvability(
      finalized.tiles,
      new Set(),
      finalized.playerSpawn,
      finalized.portals,
      finalized.spawns,
      12,
      12,
    );
    assert.equal(after.portalReachable, true, after.failures.join(","));
    assert.equal(after.playerSpawnLegal, true);
  });

  it("seed-missing-exit: inserts a reachable portal when the generator omitted one", () => {
    const tiles = [
      [F, F, F],
      [F, F, F],
      [F, F, F],
    ];
    const finalized = finalizePlayableLayout({
      tiles,
      voidTiles: new Set(),
      playerSpawn: { x: 0, y: 0 },
      portals: [],
      spawns: [{ x: 2, y: 2 }],
      w: 3,
      h: 3,
    });
    assert.ok(finalized.portal);
    const after = evaluateSolvability(
      finalized.tiles,
      new Set(),
      finalized.playerSpawn,
      finalized.portals,
      finalized.spawns,
      3,
      3,
    );
    assert.equal(after.ok, true, after.failures.join(","));
  });

  it("seed-isolated-hostile: punches a CA pocket so clearing can unlock", () => {
    const tiles = [
      [W, W, W, W, W, W, W, W],
      [W, F, F, F, W, W, W, W],
      [W, F, F, F, W, W, W, W],
      [W, F, F, F, W, W, W, W],
      [W, W, W, W, W, W, W, W],
      [W, W, W, W, W, F, W, W],
      [W, W, W, W, W, W, W, W],
      [W, W, W, W, W, W, W, W],
    ];
    const finalized = finalizePlayableLayout({
      tiles,
      voidTiles: new Set(),
      playerSpawn: { x: 1, y: 1 },
      portals: [{ x: 2, y: 1 }],
      spawns: [{ x: 5, y: 5 }],
      w: 8,
      h: 8,
    });
    const after = evaluateSolvability(
      finalized.tiles,
      new Set(),
      finalized.playerSpawn,
      finalized.portals,
      finalized.spawns,
      8,
      8,
    );
    assert.equal(after.enemiesReachable, true, after.failures.join(","));
    assert.equal(after.portalReachable, true);
    assert.equal(
      after.clearingUnlocks,
      true,
      "isolated hostile must be engageable after punch",
    );
    assert.equal(
      sequentialClearUnlocks(
        tiles,
        new Set(),
        { x: 1, y: 1 },
        [{ x: 2, y: 1 }],
        [{ x: 5, y: 5 }],
        8,
        8,
      ),
      false,
      "fixture must start as an unengageable pocket",
    );
  });

  it("seed-stacked-hostiles: destacks two isolated pockets onto unique cells", () => {
    const tiles = [
      [W, W, W, W, W, W, W, W],
      [W, F, F, F, W, W, W, W],
      [W, F, F, F, W, W, W, W],
      [W, F, F, F, W, W, W, W],
      [W, W, W, W, W, W, W, W],
      [W, W, W, W, W, F, W, W],
      [W, W, W, W, W, W, W, W],
      [W, W, W, W, W, W, F, W],
    ];
    const finalized = finalizePlayableLayout({
      tiles,
      voidTiles: new Set(),
      playerSpawn: { x: 1, y: 1 },
      portals: [{ x: 2, y: 1 }],
      spawns: [
        { x: 5, y: 5 },
        { x: 6, y: 7 },
      ],
      w: 8,
      h: 8,
    });
    const after = evaluateSolvability(
      finalized.tiles,
      new Set(),
      finalized.playerSpawn,
      finalized.portals,
      finalized.spawns,
      8,
      8,
    );
    assert.equal(after.enemiesReachable, true, after.failures.join(","));
    assert.equal(
      after.stackedEnemies,
      0,
      "isolated hostiles must not share a cell",
    );
    const keys = finalized.spawns.map((s) => `${s.x},${s.y}`);
    assert.equal(new Set(keys).size, 2);
  });

  it("seed-second-portal: punches an isolated overworld exit, not just portals[0]", () => {
    const tiles = [
      [F, F, F, W, W],
      [F, F, F, W, W],
      [F, F, F, W, W],
      [W, W, W, W, W],
      [W, W, W, W, F],
    ];
    const voidTiles = new Set(["4,4"]);
    const finalized = finalizePlayableLayout({
      tiles,
      voidTiles,
      playerSpawn: { x: 0, y: 0 },
      portals: [
        { x: 1, y: 0 },
        { x: 4, y: 4 },
      ],
      spawns: [],
      w: 5,
      h: 5,
    });
    const after = evaluateSolvability(
      finalized.tiles,
      voidTiles,
      finalized.playerSpawn,
      finalized.portals,
      finalized.spawns,
      5,
      5,
    );
    assert.equal(after.isolatedPortals, 0, after.failures.join(","));
    assert.equal(after.portalReachable, true);
  });

  it("seed-fallback-leftover-voids: dropping last-attempt voids keeps the fallback open", () => {
    const tiles = Array.from({ length: 8 }, () => Array(8).fill(F));
    const leftover = new Set<string>();
    for (let x = 0; x < 8; x++) leftover.add(`${x},3`);
    leftover.add("4,4");
    const before = evaluateSolvability(
      tiles,
      leftover,
      { x: 1, y: 1 },
      [{ x: 4, y: 4 }],
      [{ x: 6, y: 6 }],
      8,
      8,
    );
    assert.equal(before.portalReachable, false, "leftover voids must isolate");
    resetFailedGenerationVoids(leftover);
    const finalized = finalizePlayableLayout({
      tiles,
      voidTiles: leftover,
      playerSpawn: { x: 1, y: 1 },
      portals: [{ x: 4, y: 4 }],
      spawns: [{ x: 6, y: 6 }],
      w: 8,
      h: 8,
    });
    const after = evaluateSolvability(
      finalized.tiles,
      leftover,
      finalized.playerSpawn,
      finalized.portals,
      finalized.spawns,
      8,
      8,
    );
    assert.equal(after.ok, true, after.failures.join(","));
  });

  it("seed-portal-onto-hostile: relocating an isolated exit must not land on a rat", () => {
    const tiles = [
      [F, F, F, W, W],
      [F, F, F, W, W],
      [F, F, F, W, W],
      [W, W, W, W, W],
      [W, W, W, W, F],
    ];
    const voidTiles = new Set(["4,4"]);
    const finalized = finalizePlayableLayout({
      tiles,
      voidTiles,
      playerSpawn: { x: 0, y: 0 },
      portals: [{ x: 4, y: 4 }],
      spawns: [{ x: 2, y: 2 }],
      w: 5,
      h: 5,
    });
    const after = evaluateSolvability(
      finalized.tiles,
      voidTiles,
      finalized.playerSpawn,
      finalized.portals,
      finalized.spawns,
      5,
      5,
    );
    assert.equal(after.enemiesOnPortal, 0, after.failures.join(","));
    assert.equal(after.portalReachable, true);
    assert.equal(after.enemiesReachable, true);
  });

  it("seed-stacked-portals: two exits must not collapse onto the same cell", () => {
    const tiles = [
      [F, F, F, W, W],
      [F, F, F, W, W],
      [F, F, F, W, W],
      [W, W, W, W, W],
      [W, W, W, W, F],
    ];
    const voidTiles = new Set(["4,4"]);
    const finalized = finalizePlayableLayout({
      tiles,
      voidTiles,
      playerSpawn: { x: 0, y: 0 },
      portals: [
        { x: 4, y: 4 },
        { x: 2, y: 2 },
      ],
      spawns: [],
      w: 5,
      h: 5,
    });
    const after = evaluateSolvability(
      finalized.tiles,
      voidTiles,
      finalized.playerSpawn,
      finalized.portals,
      finalized.spawns,
      5,
      5,
    );
    assert.equal(after.stackedPortals, 0, after.failures.join(","));
    assert.equal(after.isolatedPortals, 0);
    const keys = finalized.portals.map((p) => `${p.x},${p.y}`);
    assert.equal(new Set(keys).size, 2);
  });

  it("seed-cramped-destack: three isolated hostiles get unique floors", () => {
    const tiles = [
      [W, W, W, W, W, W, W, W],
      [W, F, F, W, W, W, W, W],
      [W, W, W, W, W, W, W, W],
      [W, W, W, W, W, F, W, W],
      [W, W, W, W, W, W, W, W],
      [W, W, W, W, W, W, F, W],
      [W, W, W, W, W, W, W, W],
      [W, W, F, W, W, W, W, W],
    ];
    const finalized = finalizePlayableLayout({
      tiles,
      voidTiles: new Set(),
      playerSpawn: { x: 1, y: 1 },
      portals: [{ x: 2, y: 1 }],
      spawns: [
        { x: 5, y: 3 },
        { x: 6, y: 5 },
        { x: 2, y: 7 },
      ],
      w: 8,
      h: 8,
    });
    const after = evaluateSolvability(
      finalized.tiles,
      new Set(),
      finalized.playerSpawn,
      finalized.portals,
      finalized.spawns,
      8,
      8,
    );
    assert.equal(after.stackedEnemies, 0, after.failures.join(","));
    assert.equal(after.enemiesOnPortal, 0);
    assert.equal(after.enemiesReachable, true);
    const keys = finalized.spawns.map((s) => `${s.x},${s.y}`);
    assert.equal(new Set(keys).size, 3);
  });

  it("seed-spawn-on-second-portal: player does not start on a non-white exit", () => {
    const tiles = [
      [F, F, F],
      [F, F, F],
      [F, F, F],
    ];
    const finalized = finalizePlayableLayout({
      tiles,
      voidTiles: new Set(),
      playerSpawn: { x: 2, y: 2 },
      portals: [
        { x: 0, y: 0 },
        { x: 2, y: 2 },
      ],
      spawns: [],
      w: 3,
      h: 3,
    });
    const after = evaluateSolvability(
      finalized.tiles,
      new Set(),
      finalized.playerSpawn,
      finalized.portals,
      finalized.spawns,
      3,
      3,
    );
    assert.equal(after.ok, true, after.failures.join(","));
    assert.ok(
      finalized.portals.every(
        (p) =>
          p.x !== finalized.playerSpawn.x || p.y !== finalized.playerSpawn.y,
      ),
    );
  });

  it("seed-sequential-clear: a two-rat pocket stays unengageable until punched", () => {
    const tiles = [
      [W, W, W, W, W, W, W, W],
      [W, F, F, F, W, W, W, W],
      [W, F, F, F, W, W, W, W],
      [W, F, F, F, W, W, W, W],
      [W, W, W, W, W, W, W, W],
      [W, W, W, F, F, W, W, W],
      [W, W, W, W, W, W, W, W],
      [W, W, W, W, W, W, W, W],
    ];
    assert.equal(
      sequentialClearUnlocks(
        tiles,
        new Set(),
        { x: 1, y: 1 },
        [{ x: 2, y: 1 }],
        [
          { x: 3, y: 5 },
          { x: 4, y: 5 },
        ],
        8,
        8,
      ),
      false,
      "pocket rats must keep the progression portal sealed",
    );
    const finalized = finalizePlayableLayout({
      tiles,
      voidTiles: new Set(),
      playerSpawn: { x: 1, y: 1 },
      portals: [{ x: 2, y: 1 }],
      spawns: [
        { x: 3, y: 5 },
        { x: 4, y: 5 },
      ],
      w: 8,
      h: 8,
    });
    const after = evaluateSolvability(
      finalized.tiles,
      new Set(),
      finalized.playerSpawn,
      finalized.portals,
      finalized.spawns,
      8,
      8,
    );
    assert.equal(after.clearingUnlocks, true, after.failures.join(","));
    assert.equal(after.enemiesReachable, true);
    assert.equal(after.stackedEnemies, 0);
  });

  it("seed-spawn-onto-hostile: moving off an exit must not land on a rat", () => {
    const tiles = [
      [F, F, F],
      [F, F, F],
      [F, F, F],
    ];
    const finalized = finalizePlayableLayout({
      tiles,
      voidTiles: new Set(),
      playerSpawn: { x: 1, y: 0 },
      portals: [{ x: 1, y: 0 }],
      spawns: [
        { x: 0, y: 0 },
        { x: 2, y: 0 },
        { x: 1, y: 1 },
      ],
      w: 3,
      h: 3,
    });
    const after = evaluateSolvability(
      finalized.tiles,
      new Set(),
      finalized.playerSpawn,
      finalized.portals,
      finalized.spawns,
      3,
      3,
    );
    assert.equal(after.ok, true, after.failures.join(","));
    assert.equal(
      finalized.spawns.some(
        (s) =>
          s.x === finalized.playerSpawn.x && s.y === finalized.playerSpawn.y,
      ),
      false,
    );
  });

  it("seed-cut-vertex-pillar: a walk-blocker on the only corridor is rejected", () => {
    const tiles = [
      [W, W, W, W, W, W],
      [W, F, F, F, F, W],
      [W, W, W, W, W, W],
    ];
    tiles[1][4] = "portal";
    const spawn = { x: 1, y: 1 };
    const portals = [{ x: 4, y: 1 }];
    const spawns: { x: number; y: number }[] = [];
    assert.equal(
      canPlaceWalkBlocker(tiles, new Set(), spawn, portals, spawns, 6, 3, {
        x: 2,
        y: 1,
      }),
      false,
      "cut-vertex pillar would seal the exit",
    );
    assert.equal(
      canPlaceWalkBlocker(tiles, new Set(), spawn, portals, spawns, 6, 3, {
        x: 1,
        y: 1,
      }),
      false,
      "must not overwrite player spawn",
    );
    const open = [
      [F, F, F],
      [F, F, F],
      [F, F, F],
    ];
    open[2][2] = "portal";
    assert.equal(
      canPlaceWalkBlocker(
        open,
        new Set(),
        { x: 0, y: 0 },
        [{ x: 2, y: 2 }],
        [],
        3,
        3,
        { x: 1, y: 0 },
      ),
      true,
      "side cell on an open field is a legal pillar",
    );
  });

  it("seed-leftover-border-island: unreachable CA crumbs are walled, not playable", () => {
    const tiles = [
      [W, W, W, W, W, W, W, W],
      [F, F, W, F, F, F, F, W],
      [W, W, W, F, F, F, F, W],
      [W, W, W, F, F, F, F, W],
      [W, W, W, F, F, F, F, W],
      [W, W, W, W, W, W, W, W],
      [W, W, W, W, W, W, W, W],
      [W, W, W, W, W, W, W, W],
    ];
    tiles[1][5] = "portal";
    const before = evaluateSolvability(
      tiles,
      new Set(),
      { x: 4, y: 2 },
      [{ x: 5, y: 1 }],
      [{ x: 6, y: 3 }],
      8,
      8,
    );
    assert.ok(
      before.leftoverIslands >= 2,
      "fixture must start with leftover CA crumbs",
    );
    const finalized = finalizePlayableLayout({
      tiles,
      voidTiles: new Set(),
      playerSpawn: { x: 4, y: 2 },
      portals: [{ x: 5, y: 1 }],
      spawns: [{ x: 6, y: 3 }],
      w: 8,
      h: 8,
    });
    assert.equal(
      finalized.tiles[1][0],
      "wall",
      "2-tile border pocket must not stay walkable for battle-start destack",
    );
    assert.equal(finalized.tiles[1][1], "wall");
    const after = evaluateSolvability(
      finalized.tiles,
      new Set(),
      finalized.playerSpawn,
      finalized.portals,
      finalized.spawns,
      8,
      8,
    );
    assert.equal(after.ok, true, after.failures.join(","));
    assert.equal(after.leftoverIslands, 0);
  });

  it("seed-fortress-corner-spawn: relocates onto floor instead of carving a pocket", () => {
    const tiles = Array.from({ length: 8 }, () => Array(8).fill(F));
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) tiles[y][x] = W;
    }
    tiles[1][5] = "portal";
    const before = evaluateSolvability(
      tiles,
      new Set(),
      { x: 1, y: 1 },
      [{ x: 5, y: 1 }],
      [{ x: 6, y: 3 }],
      8,
      8,
    );
    assert.equal(before.playerSpawnLegal, false);
    const finalized = finalizePlayableLayout({
      tiles,
      voidTiles: new Set(),
      playerSpawn: { x: 1, y: 1 },
      portals: [{ x: 5, y: 1 }],
      spawns: [{ x: 6, y: 3 }],
      w: 8,
      h: 8,
    });
    assert.equal(
      finalized.tiles[1][1],
      W,
      "fortress corner must keep its wall when a legal floor exists",
    );
    const after = evaluateSolvability(
      finalized.tiles,
      new Set(),
      finalized.playerSpawn,
      finalized.portals,
      finalized.spawns,
      8,
      8,
    );
    assert.equal(after.ok, true, after.failures.join(","));
    assert.equal(after.playerSpawnLegal, true);
    assert.equal(after.leftoverIslands, 0);
  });

  it("seed-wall-mass-spawn: carves only when no walkable cell exists", () => {
    const tiles = Array.from({ length: 8 }, () => Array(8).fill(W));
    const finalized = finalizePlayableLayout({
      tiles,
      voidTiles: new Set(),
      playerSpawn: { x: 4, y: 4 },
      portals: [{ x: 0, y: 0 }],
      spawns: [],
      w: 8,
      h: 8,
    });
    const after = evaluateSolvability(
      finalized.tiles,
      new Set(),
      finalized.playerSpawn,
      finalized.portals,
      finalized.spawns,
      8,
      8,
    );
    assert.equal(after.ok, true, after.failures.join(","));
    assert.equal(after.playerSpawnLegal, true);
    assert.equal(after.portalReachable, true);
  });

  it("seed-spawn-on-leftover-island: relocates onto the main graph instead of sealing it", () => {
    const tiles = [
      [W, W, W, W, W, W, W, W],
      [F, F, W, F, F, F, F, W],
      [W, W, W, F, F, F, F, W],
      [W, W, W, F, F, F, F, W],
      [W, W, W, F, F, F, F, W],
      [W, W, W, W, W, W, W, W],
      [W, W, W, W, W, W, W, W],
      [W, W, W, W, W, W, W, W],
    ];
    tiles[1][5] = "portal";
    const before = evaluateSolvability(
      tiles,
      new Set(),
      { x: 0, y: 1 },
      [{ x: 5, y: 1 }],
      [{ x: 6, y: 3 }],
      8,
      8,
    );
    assert.equal(before.playerSpawnLegal, true);
    assert.ok(
      before.leftoverIslands >= 2,
      "flood from the crumb must leave the intended room unreachable",
    );
    const finalized = finalizePlayableLayout({
      tiles,
      voidTiles: new Set(),
      playerSpawn: { x: 0, y: 1 },
      portals: [{ x: 5, y: 1 }],
      spawns: [{ x: 6, y: 3 }],
      w: 8,
      h: 8,
    });
    assert.equal(
      finalized.tiles[1][0],
      "wall",
      "leftover island must be sealed, not used as the spawn graph",
    );
    assert.equal(finalized.tiles[1][1], "wall");
    assert.equal(
      finalized.tiles[1][2],
      W,
      "must not punch the separator wall to join the crumb to the room",
    );
    const after = evaluateSolvability(
      finalized.tiles,
      new Set(),
      finalized.playerSpawn,
      finalized.portals,
      finalized.spawns,
      8,
      8,
    );
    assert.equal(after.ok, true, after.failures.join(","));
    assert.equal(after.leftoverIslands, 0);
    assert.notEqual(
      `${finalized.playerSpawn.x},${finalized.playerSpawn.y}`,
      "0,1",
    );
    assert.notEqual(
      `${finalized.playerSpawn.x},${finalized.playerSpawn.y}`,
      "1,1",
    );
  });

  it("seed-wall-next-to-leftover: a wall spawn must not pick the closer crumb", () => {
    const tiles = [
      [W, W, W, W, W, W, W, W],
      [F, F, W, F, F, F, F, W],
      [W, W, W, F, F, F, F, W],
      [W, W, W, F, F, F, F, W],
      [W, W, W, F, F, F, F, W],
      [W, W, W, W, W, W, W, W],
      [W, W, W, W, W, W, W, W],
      [W, W, W, W, W, W, W, W],
    ];
    tiles[1][5] = "portal";
    const finalized = finalizePlayableLayout({
      tiles,
      voidTiles: new Set(),
      playerSpawn: { x: 0, y: 0 },
      portals: [{ x: 5, y: 1 }],
      spawns: [{ x: 6, y: 3 }],
      w: 8,
      h: 8,
    });
    assert.equal(finalized.tiles[1][0], "wall");
    assert.equal(finalized.tiles[1][1], "wall");
    assert.equal(finalized.tiles[1][2], W);
    const after = evaluateSolvability(
      finalized.tiles,
      new Set(),
      finalized.playerSpawn,
      finalized.portals,
      finalized.spawns,
      8,
      8,
    );
    assert.equal(after.ok, true, after.failures.join(","));
    assert.equal(finalized.playerSpawn.x >= 3, true);
  });

  it("seed-alcove-mouth-pillar: a blocker that leaves a leftover floor is rejected", () => {
    const tiles = [
      [W, W, W, W, W, W],
      [W, F, F, F, F, W],
      [W, W, F, W, W, W],
      [W, W, F, W, W, W],
      [W, W, W, W, W, W],
    ];
    tiles[1][4] = "portal";
    const spawn = { x: 1, y: 1 };
    const portals = [{ x: 4, y: 1 }];
    const before = evaluateSolvability(
      tiles,
      new Set(),
      spawn,
      portals,
      [],
      6,
      5,
    );
    assert.equal(before.ok, true, before.failures.join(","));
    assert.equal(
      canPlaceWalkBlocker(tiles, new Set(), spawn, portals, [], 6, 5, {
        x: 2,
        y: 2,
      }),
      false,
      "mouth pillar would leave (2,3) as a leftover island",
    );
  });

  it("seed-destack-keeps-first-portal-tile: destack must not floor the kept exit", () => {
    const tiles = [
      [F, F, F],
      [F, F, F],
      [F, F, F],
    ];
    tiles[0][1] = "portal";
    const finalized = finalizePlayableLayout({
      tiles,
      voidTiles: new Set(),
      playerSpawn: { x: 0, y: 0 },
      portals: [
        { x: 1, y: 0 },
        { x: 1, y: 0 },
      ],
      spawns: [],
      w: 3,
      h: 3,
    });
    const after = evaluateSolvability(
      finalized.tiles,
      new Set(),
      finalized.playerSpawn,
      finalized.portals,
      finalized.spawns,
      3,
      3,
    );
    assert.equal(after.ok, true, after.failures.join(","));
    assert.equal(after.stackedPortals, 0);
    assert.equal(after.portalTileMismatch, 0);
    for (const p of finalized.portals) {
      assert.equal(
        finalized.tiles[p.y][p.x],
        "portal",
        `portal at ${p.x},${p.y} must keep a portal tile`,
      );
    }
  });

  it("seed-portal-cut-hostile: relocates a rat beyond a portal choke onto the fight graph", () => {
    const tiles = [
      [W, W, W, W, W, W, W],
      [W, F, F, F, F, F, W],
      [W, W, W, W, W, W, W],
    ];
    tiles[1][3] = "portal";
    const portals = [{ x: 3, y: 1 }];
    const isolated = [{ x: 5, y: 1 }];
    const before = evaluateSolvability(
      tiles,
      new Set(),
      { x: 1, y: 1 },
      portals,
      isolated,
      7,
      3,
    );
    assert.equal(
      before.enemiesReachable,
      false,
      "fixture must start battle-isolated across the gate",
    );
    assert.equal(
      sequentialClearUnlocks(
        tiles,
        new Set(),
        { x: 1, y: 1 },
        portals,
        isolated,
        7,
        3,
      ),
      false,
      "melee cannot cross a battle-impassable portal",
    );
    const finalized = finalizePlayableLayout({
      tiles,
      voidTiles: new Set(),
      playerSpawn: { x: 1, y: 1 },
      portals,
      spawns: isolated,
      w: 7,
      h: 3,
    });
    const after = evaluateSolvability(
      finalized.tiles,
      new Set(),
      finalized.playerSpawn,
      finalized.portals,
      finalized.spawns,
      7,
      3,
    );
    assert.equal(after.ok, true, after.failures.join(","));
    assert.equal(
      finalized.spawns[0].x < finalized.portals[0].x,
      true,
      "hostile must sit on the player's side of the gate",
    );
    assert.equal(
      finalized.tiles[1][5],
      F,
      "must not wall the far-side floor (aesthetics)",
    );
  });

  it("seed-spawn-on-portal-cut: moving off the gate stays on the large room", () => {
    const tiles = [
      [W, W, W, W, W, W, W],
      [F, F, F, F, F, F, W],
      [W, W, W, W, W, W, W],
    ];
    tiles[1][3] = "portal";
    const finalized = finalizePlayableLayout({
      tiles,
      voidTiles: new Set(),
      playerSpawn: { x: 3, y: 1 },
      portals: [{ x: 3, y: 1 }],
      spawns: [],
      w: 7,
      h: 3,
    });
    const after = evaluateSolvability(
      finalized.tiles,
      new Set(),
      finalized.playerSpawn,
      finalized.portals,
      finalized.spawns,
      7,
      3,
    );
    assert.equal(after.ok, true, after.failures.join(","));
    assert.equal(
      finalized.playerSpawn.x < 3,
      true,
      "spawn-off-exit must not step onto the 2-tile far island",
    );
    assert.equal(finalized.tiles[1][4], F);
    assert.equal(finalized.tiles[1][5], F);
  });
});

describe("seeded world property suite", () => {
  const seeds = Array.from({ length: 256 }, (_, i) => 1000 + i * 17);
  const archetypes = MAP_ARCHETYPES.map((a) => a.type);
  const modes = ["none", "dungeon", "bossRush"] as const;

  for (const mode of modes) {
    it(`keeps a legal route for runMode=${mode} across ${seeds.length} seeds`, () => {
      const failures: string[] = [];
      for (const seed of seeds) {
        const world = generateSeededWorld({
          seed,
          runMode: mode,
          archetype: archetypes[seed % archetypes.length],
        });
        const report = reportWorld(world);
        if (!report.ok || report.stackedEnemies > 0) {
          failures.push(
            `seed ${seed} ${world.archetype}: ${report.failures.join(",") || `stacked:${report.stackedEnemies}`}`,
          );
        }
        if (mode !== "none") {
          assert.ok(
            world.portals.some((p) => p.isProgressionPortal),
            `seed ${seed} missing progression portal`,
          );
        }
      }
      assert.equal(failures.length, 0, failures.slice(0, 8).join(" | "));
    });
  }

  it("Boss Rush preferred cells stay walk-reachable across seeds", () => {
    const failures: string[] = [];
    for (const seed of seeds) {
      const world = generateSeededBossRushRoom(seed);
      const report = reportWorld(world);
      if (!report.ok || report.stackedEnemies > 0) {
        failures.push(`seed ${seed}: ${report.failures.join(",")}`);
      }
    }
    assert.equal(failures.length, 0, failures.slice(0, 8).join(" | "));
  });

  it("Boss Rush 10-room sequences stay solvable", () => {
    const failures: string[] = [];
    for (let seq = 0; seq < 32; seq++) {
      for (let room = 0; room < 10; room++) {
        const world = generateSeededBossRushRoom(9000 + seq * 97 + room);
        const report = reportWorld(world);
        if (!report.ok) {
          failures.push(
            `seq ${seq} room ${room}: ${report.failures.join(",")}`,
          );
        }
      }
    }
    assert.equal(failures.length, 0, failures.slice(0, 8).join(" | "));
  });

  it("rest map exits stay reachable and rest-exit encounters unlock", () => {
    const rest = generateSeededRestMap();
    const restReport = reportWorld(rest);
    assert.equal(restReport.ok, true, restReport.failures.join(","));
    assert.equal(rest.portals.length, 3);
    assert.equal(
      rest.portals.some((p) => p.restExitType === "boss"),
      true,
    );
    const failures: string[] = [];
    for (const restExitType of ["dungeon", "normal", "boss"] as const) {
      for (const seed of seeds) {
        const world = simulateRestExitEncounter(seed, restExitType);
        const report = reportWorld(world);
        if (!report.ok) {
          failures.push(
            `${restExitType} seed ${seed}: ${report.failures.join(",")}`,
          );
        }
      }
    }
    assert.equal(failures.length, 0, failures.slice(0, 8).join(" | "));
  });

  it("sanctuary white-portal maps keep a legal route", () => {
    const failures: string[] = [];
    for (const seed of seeds) {
      const world = generateSeededSanctuary(seed);
      const report = reportWorld(world, { allowSpawnOnPortal: true });
      if (!report.ok) {
        failures.push(`seed ${seed}: ${report.failures.join(",")}`);
      }
      const white = world.portals.find((p) => p.isWhitePortal);
      assert.ok(white, `seed ${seed} missing white portal`);
      assert.equal(white?.x, world.playerSpawn.x);
      assert.equal(white?.y, world.playerSpawn.y);
    }
    assert.equal(failures.length, 0, failures.slice(0, 8).join(" | "));
  });

  it("dungeon-complete white portal follows the legalized spawn, not the pre-finalize tile", () => {
    const size = WORLD_GRID_SIZE;
    const tiles = Array.from({ length: size }, () =>
      Array.from({ length: size }, () => "floor"),
    );
    const spawn = { x: 8, y: 8 };
    tiles[8][8] = "portal";
    const white = {
      x: 0,
      y: 0,
      color: "white" as const,
      isWhitePortal: true,
    };

    const wrongMap = {
      tiles: tiles.map((row) => [...row]),
      portals: [
        { x: 8, y: 8, color: "black" as const },
        placeWhitePortalAtSpawn(white, spawn),
      ],
    };
    const wrongApplied = applyFinalizedLayout(
      wrongMap,
      [{ x: 3, y: 3, id: "rat" }],
      spawn,
      size,
    );
    const wrongWhite = wrongMap.portals.find((p) => p.isWhitePortal);
    assert.ok(wrongWhite);
    assert.notEqual(
      `${wrongApplied.spawn.x},${wrongApplied.spawn.y}`,
      `${wrongWhite?.x},${wrongWhite?.y}`,
      "pre-finalize attach must diverge when legalize moves spawn off portals[0]",
    );

    const rightMap = {
      tiles: tiles.map((row) => [...row]),
      portals: [{ x: 8, y: 8, color: "black" as const }],
    };
    const rightApplied = attachWhitePortalAfterLegalize(
      rightMap,
      [{ x: 3, y: 3, id: "rat" }],
      spawn,
      size,
      white,
    );
    const rightWhite = rightMap.portals.find((p) => p.isWhitePortal);
    assert.ok(rightWhite);
    assert.equal(rightWhite?.x, rightApplied.spawn.x);
    assert.equal(rightWhite?.y, rightApplied.spawn.y);
    assert.equal(
      rightMap.tiles[rightApplied.spawn.y]?.[rightApplied.spawn.x],
      "portal",
    );
  });

  it("Death Realm exits stay reachable", () => {
    const failures: string[] = [];
    for (const seed of seeds) {
      const realm = generateSeededDeathRealm(seed);
      const report = reportWorld(realm);
      if (!report.ok) {
        failures.push(`seed ${seed}: ${report.failures.join(",")}`);
      }
    }
    assert.equal(failures.length, 0, failures.slice(0, 8).join(" | "));
  });

  it("portal objects keep portal tiles after finalize", () => {
    const failures: string[] = [];
    for (const seed of seeds) {
      const world = generateSeededWorld({ seed, runMode: "dungeon" });
      const report = reportWorld(world);
      if (report.portalTileMismatch > 0) {
        failures.push(`seed ${seed}: ${report.failures.join(",")}`);
      }
    }
    assert.equal(failures.length, 0, failures.slice(0, 8).join(" | "));
  });

  it("summons on seeded dungeons cannot jointly seal the exit", () => {
    const failures: string[] = [];
    for (const seed of seeds) {
      const world = generateSeededWorld({ seed, runMode: "dungeon" });
      const occ = simulateSummonsOnWorld(world, 4);
      if (occ.sealed) {
        failures.push(
          `seed ${seed}: summons at ${occ.cells.map((c) => `${c.x},${c.y}`).join("/")}`,
        );
      }
    }
    assert.equal(failures.length, 0, failures.slice(0, 8).join(" | "));
  });

  it("corpses on unique bridges relocate so the exit stays open", () => {
    const failures: string[] = [];
    for (const seed of seeds) {
      const world = generateSeededWorld({ seed, runMode: "dungeon" });
      const occ = simulateCorpsesOnWorld(world);
      if (occ.sealed) {
        failures.push(
          `seed ${seed}: corpses at ${occ.cells.map((c) => `${c.x},${c.y}`).join("/")}`,
        );
      }
    }
    assert.equal(failures.length, 0, failures.slice(0, 8).join(" | "));
  });

  it("walk-blockers skip cut-vertices across seeded dungeon maps", () => {
    const failures: string[] = [];
    for (const seed of seeds) {
      const world = generateSeededWorld({
        seed,
        runMode: "dungeon",
        archetype: "corridorMaze",
      });
      const placed = simulateWalkBlockersOnWorld(world, 2);
      if (!placed.ok) {
        failures.push(`seed ${seed}: blockers sealed the route`);
      }
    }
    assert.equal(failures.length, 0, failures.slice(0, 8).join(" | "));
  });

  it("battle-start destack keeps a legal route across seeds", () => {
    const failures: string[] = [];
    for (const seed of seeds) {
      const world = generateSeededWorld({ seed, runMode: "dungeon" });
      const after = simulateBattleStartOnWorld(world);
      if (!after.ok) {
        failures.push(`seed ${seed}: battle-start destack sealed the route`);
      }
    }
    assert.equal(failures.length, 0, failures.slice(0, 8).join(" | "));
  });

  it("enemy wander stays on the spawn graph across seeds", () => {
    const failures: string[] = [];
    for (const seed of seeds) {
      const world = generateSeededWorld({ seed, runMode: "dungeon" });
      const after = simulateEnemyWanderOnWorld(
        world,
        12,
        createSeededRng(seed + 99),
      );
      if (!after.ok) {
        failures.push(`seed ${seed}: wander left a hostile isolated`);
      }
    }
    assert.equal(failures.length, 0, failures.slice(0, 8).join(" | "));
  });

  it("seed-maze-void-split: corridorMaze edge voids that split the graph are dropped", () => {
    const size = 8;
    const tiles = Array.from({ length: size }, () => Array(size).fill(F));
    const leftover = new Set<string>();
    applyVoidTiles(
      tiles,
      "corridorMaze",
      leftover,
      new Set(["1,1"]),
      size,
      size,
      () => 0,
    );
    assert.equal(
      leftover.size,
      0,
      "disconnecting edge voids must clear like cluster voids",
    );
  });

  it("Boss portal entry cell (11,5) stays walk-reachable across seeds", () => {
    const failures: string[] = [];
    for (const seed of seeds) {
      const world = generateSeededBossPortalEncounter(seed);
      const report = reportWorld(world);
      if (!report.ok || report.stackedEnemies > 0) {
        failures.push(`seed ${seed}: ${report.failures.join(",")}`);
      }
    }
    assert.equal(failures.length, 0, failures.slice(0, 8).join(" | "));
  });
});

describe("portal lock / unlock / cleanup sequencing", () => {
  it("stays locked while hostiles remain and unlocks on clear", () => {
    const locked = simulateClearUnlocksPortal("dungeon", 2);
    assert.equal(locked.locked, true);
    assert.equal(locked.unlocked, false);
    const open = simulateClearUnlocksPortal("dungeon", 0);
    assert.equal(open.locked, false);
    assert.equal(open.unlocked, true);
    const overworld = simulateClearUnlocksPortal("none", 0);
    assert.equal(overworld.unlocked, false);
  });

  it("cleanupMap zeros cannot drop a snapshotted dungeon chain", () => {
    assert.deepEqual(simulateCleanupSnapshotProgression(true, 2, 4), {
      kind: "progress",
      nextDepth: 3,
    });
    assert.deepEqual(simulateCleanupSnapshotProgression(true, 4, 4), {
      kind: "complete",
      bonus: 200,
    });
    assert.deepEqual(simulateCleanupSnapshotProgression(false, 0, 0), {
      kind: "none",
    });
  });

  it("dungeon-complete bonus cannot remint on the same claim flag", () => {
    const claimed = { current: false };
    assert.equal(tryClaimDungeonChainBonus(claimed), true);
    assert.equal(
      tryClaimDungeonChainBonus(claimed),
      false,
      "reload / second step must not pay the chain bonus twice",
    );
    claimed.current = false;
    assert.equal(
      tryClaimDungeonChainBonus(claimed),
      true,
      "cleanupMap resetting the flag is a new run, not a remint of the last room",
    );
  });
});

describe("reload cannot duplicate Boss Rush room rewards", () => {
  it("replays a 10-room persist sequence without re-farming a cleared room", async () => {
    const paid = new Set<number>();
    const actor = {
      currentRoom: 0,
      setBossRushProgress: async (_slot: bigint, room: bigint) => {
        actor.currentRoom = Number(room);
      },
      resetBossRush: async () => {
        actor.currentRoom = 0;
      },
      completeBossRushRoom: async () => undefined,
    };
    let doka = 0;
    for (let room = 0; room < 10; room++) {
      assert.equal(
        resumeRoomFromPersisted(actor.currentRoom),
        room === 0 ? 0 : room,
        `reload before room ${room} must not rewind`,
      );
      await persistBossRushRewardsThroughLock(
        {
          enqueue: async (fn) => fn(),
        },
        () => persistBossRushRoomClear(actor, 1, room),
        async () => {
          assert.equal(paid.has(room), false, `room ${room} paid twice`);
          paid.add(room);
          doka += 100;
          return { doka };
        },
      );
      const progress = progressAfterRoomClear(room);
      assert.equal(actor.currentRoom, progress.nextCurrentRoom);
    }
    assert.equal(paid.size, 10);
    assert.equal(doka, 1000);
    assert.equal(actor.currentRoom, 0);
    assert.equal(resumeRoomFromPersisted(actor.currentRoom), 0);
  });
});

describe("map bounds", () => {
  it("keeps spawn, portals, and hostiles inside the grid on every generated mode", () => {
    const seeds = Array.from({ length: 64 }, (_, i) => 5000 + i);
    for (const seed of seeds) {
      const worlds = [
        generateSeededWorld({ seed, runMode: "none" }),
        generateSeededWorld({ seed, runMode: "dungeon" }),
        generateSeededWorld({ seed, runMode: "bossRush" }),
        generateSeededBossRushRoom(seed),
        generateSeededDeathRealm(seed),
        generateSeededSanctuary(seed),
        simulateRestExitEncounter(seed, "dungeon"),
      ];
      for (const world of worlds) {
        const report = reportWorld(world, {
          allowSpawnOnPortal: world.portals.some((p) => p.isWhitePortal),
        });
        assert.equal(
          report.outOfBounds,
          0,
          `seed ${seed} ${world.archetype}: ${report.failures.join(",")}`,
        );
        assert.equal(
          report.leftoverIslands,
          0,
          `seed ${seed} leftover ${report.leftoverIslands}`,
        );
      }
    }
  });
});
