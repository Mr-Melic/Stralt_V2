import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { WORLD_GRID_SIZE } from "../data/gameConstants.ts";
import { activeHostilesRemaining } from "./battleSetup.ts";
import { isCellFree } from "./occupancy.ts";
import {
  decideDungeonChainPortal,
  dungeonChainCompletionBonus,
  dungeonDokaMultiplierFor,
  filterRunPortals,
  getRunMode,
  isProgressionLocked,
  isProgressionPortalUnlocked,
  isRunProgressionPortal,
  placeWhitePortalAtSpawn,
  publishCurrentMap,
  resetRunState,
  restExitSpawnDepth,
  shouldArmDungeonChainOnRestExit,
  shouldSpawnWhitePortal,
  shouldSuppressPortal,
  snapshotDungeonChain,
} from "./portalRules.ts";

describe("snapshotDungeonChain", () => {
  it("captures refs before cleanupMap zeroes them", () => {
    const refs = {
      dungeonChainActiveRef: { current: true },
      dungeonChainDepthRef: { current: 2 },
      dungeonChainMaxDepthRef: { current: 4 },
    };
    const snap = snapshotDungeonChain(refs);
    refs.dungeonChainActiveRef.current = false;
    refs.dungeonChainDepthRef.current = 0;
    refs.dungeonChainMaxDepthRef.current = 0;
    assert.deepEqual(snap, { active: true, depth: 2, maxDepth: 4 });
    assert.deepEqual(decideDungeonChainPortal(false, snap), {
      kind: "progress",
      nextDepth: 3,
    });
    assert.deepEqual(
      decideDungeonChainPortal(false, snapshotDungeonChain(refs)),
      { kind: "none" },
    );
  });
});

describe("resetRunState", () => {
  it("clears dungeon React state and the Doka multiplier after death", () => {
    let active = true;
    let depth = 4;
    let maxDepth = 5;
    const multiplier = { current: 3 };
    resetRunState({
      bossRushActiveRef: { current: false },
      dungeonChainActiveRef: { current: false },
      dungeonChainDepthRef: { current: 0 },
      dungeonChainMaxDepthRef: { current: 0 },
      abortBossRush: async () => {},
      setDungeonChainActive: (next) => {
        active = next;
      },
      setDungeonChainDepth: (next) => {
        depth = next;
      },
      setDungeonChainMaxDepth: (next) => {
        maxDepth = next;
      },
      dungeonDokaMultiplierRef: multiplier,
    });
    assert.equal(active, false);
    assert.equal(depth, 0);
    assert.equal(maxDepth, 0);
    assert.equal(multiplier.current, 1);
  });
});

describe("decideDungeonChainPortal", () => {
  it("enters only from a dungeon-entry portal while no run is active", () => {
    assert.deepEqual(
      decideDungeonChainPortal(true, { active: false, depth: 0, maxDepth: 0 }),
      { kind: "enter" },
    );
    assert.deepEqual(
      decideDungeonChainPortal(false, {
        active: false,
        depth: 0,
        maxDepth: 0,
      }),
      { kind: "none" },
    );
  });

  it("progresses and completes from the live snapshot, not wiped zeros", () => {
    assert.deepEqual(
      decideDungeonChainPortal(false, { active: true, depth: 1, maxDepth: 4 }),
      { kind: "progress", nextDepth: 2 },
    );
    assert.deepEqual(
      decideDungeonChainPortal(false, { active: true, depth: 4, maxDepth: 4 }),
      { kind: "complete", bonus: dungeonChainCompletionBonus(4) },
    );
    assert.equal(dungeonChainCompletionBonus(4), 200);
  });
});

describe("dungeonDokaMultiplierFor", () => {
  it("is 1x outside a run and scales with live depth while active", () => {
    assert.equal(dungeonDokaMultiplierFor(false, 3), 1);
    assert.equal(dungeonDokaMultiplierFor(true, 0), 1);
    assert.equal(dungeonDokaMultiplierFor(true, 1), 1.5);
    assert.equal(dungeonDokaMultiplierFor(true, 3), 2.5);
    assert.equal(dungeonDokaMultiplierFor(true, 5), 4);
  });
});

describe("resetRunState", () => {
  it("clears dungeon React state so the HUD and multiplier cannot stick", () => {
    let active = true;
    let depth = 3;
    let maxDepth = 4;
    const refs = {
      bossRushActiveRef: { current: false },
      dungeonChainActiveRef: { current: true },
      dungeonChainDepthRef: { current: 3 },
      dungeonChainMaxDepthRef: { current: 4 },
      abortBossRush: async () => {},
      setDungeonChainActive: (next: boolean) => {
        active = next;
      },
      setDungeonChainDepth: (next: number) => {
        depth = next;
      },
      setDungeonChainMaxDepth: (next: number) => {
        maxDepth = next;
      },
    };
    resetRunState(refs);
    assert.equal(refs.dungeonChainActiveRef.current, false);
    assert.equal(refs.dungeonChainDepthRef.current, 0);
    assert.equal(refs.dungeonChainMaxDepthRef.current, 0);
    assert.equal(active, false);
    assert.equal(depth, 0);
    assert.equal(maxDepth, 0);
    assert.equal(dungeonDokaMultiplierFor(active, depth), 1);
  });
});

describe("publishCurrentMap", () => {
  it("binds the white sanctuary map on the RAF ref before setState", () => {
    const mapRef: { current: { id: string } | null } = {
      current: { id: "boss-room-9" },
    };
    const whiteMap = { id: "sanctuary" };
    assert.equal(publishCurrentMap(mapRef, whiteMap), whiteMap);
    assert.equal(mapRef.current, whiteMap);
    assert.notEqual(mapRef.current?.id, "boss-room-9");
  });
});

describe("placeWhitePortalAtSpawn", () => {
  it("relocates a (0,0) dungeon-complete portal onto the walkable spawn", () => {
    const pending = {
      x: 0,
      y: 0,
      color: "white" as const,
      isWhitePortal: true,
    };
    const atSpawn = placeWhitePortalAtSpawn(pending, { x: 8, y: 8 });
    assert.deepEqual(atSpawn, {
      x: 8,
      y: 8,
      color: "white",
      isWhitePortal: true,
    });
    assert.notEqual(atSpawn.x, 0);
    assert.notEqual(atSpawn.y, 0);
  });

  it("keeps the sanctuary portal off a walled fortress (0,0)", () => {
    const tiles = Array.from({ length: WORLD_GRID_SIZE }, (_, y) =>
      Array.from({ length: WORLD_GRID_SIZE }, (_, x) => !(x === 0 && y === 0)),
    );
    const occupancy = {
      tiles,
      barriers: new Set<string>(),
      voidTiles: new Set<string>(),
      portals: new Set<string>(),
      isOccupied: () => false,
    };
    const pending = {
      x: 0,
      y: 0,
      color: "white" as const,
      isWhitePortal: true,
    };
    const spawn = { x: 8, y: 8 };
    assert.equal(
      isCellFree(pending, occupancy),
      false,
      "fortress/chessboard walls (0,0); entry is coordinate-based",
    );
    assert.equal(isCellFree(spawn, occupancy), true);
    const placed = placeWhitePortalAtSpawn(pending, spawn);
    assert.equal(isCellFree(placed, occupancy), true);
    assert.deepEqual({ x: placed.x, y: placed.y }, spawn);
  });
});

describe("rest-exit dungeon spawn", () => {
  it("re-arms the chain at depth 1 so generateEnemies is not called at 0", () => {
    assert.equal(shouldArmDungeonChainOnRestExit("dungeon"), true);
    assert.equal(restExitSpawnDepth("dungeon"), 1);
    assert.equal(shouldArmDungeonChainOnRestExit("normal"), false);
    assert.equal(restExitSpawnDepth("normal"), 0);
    assert.equal(shouldArmDungeonChainOnRestExit(undefined), false);
  });
});

describe("progression lock and unlock", () => {
  it("suppresses non-progression portals inside a run until the map is clear", () => {
    assert.deepEqual(
      filterRunPortals({
        runMode: "dungeon",
        mapCleared: false,
        candidates: ["regular", "dungeonEntry", "progression"],
      }),
      [],
    );
    assert.deepEqual(
      filterRunPortals({
        runMode: "bossRush",
        mapCleared: true,
        candidates: ["regular", "progression"],
      }),
      ["progression"],
    );
  });

  it("treats an unmarked fallback portal as the run exit", () => {
    assert.equal(isRunProgressionPortal({ color: "blue" }, "bossRush"), true);
    assert.equal(
      isRunProgressionPortal(
        { isWhitePortal: true, color: "white" },
        "bossRush",
      ),
      false,
    );
    assert.equal(
      isRunProgressionPortal({ isProgressionPortal: true }, "none"),
      false,
    );
  });

  it("unlocks only after the last hostile dies inside a run", () => {
    assert.equal(isProgressionLocked("dungeon", false), true);
    assert.equal(isProgressionPortalUnlocked("dungeon", true), true);
    assert.equal(shouldSpawnWhitePortal(true, false), true);
    assert.equal(shouldSpawnWhitePortal(false, false), false);
  });
});

describe("run-mode portal suppression", () => {
  it("derives bossRush over dungeon, else free exploration", () => {
    assert.equal(getRunMode(true, true), "bossRush");
    assert.equal(getRunMode(false, true), "dungeon");
    assert.equal(getRunMode(false, false), "none");
  });

  it("keeps side portals off during an uncleared run so the player cannot flee", () => {
    const uncleared = [
      "regular",
      "dungeonEntry",
      "bossRushEntry",
      "deathRealm",
      "white",
    ] as const;
    for (const kind of uncleared) {
      assert.equal(
        shouldSuppressPortal(kind, "bossRush", false),
        true,
        `${kind} mid-Boss-Rush would leak the player off the sealed room`,
      );
      assert.equal(shouldSuppressPortal(kind, "dungeon", false), true);
    }
    assert.equal(
      shouldSuppressPortal("progression", "bossRush", false),
      true,
      "uncleared progression stays unusable; WX still shows the locked visual",
    );
    assert.equal(isProgressionLocked("bossRush", false), true);
    assert.equal(isProgressionPortalUnlocked("bossRush", false), false);
    assert.deepEqual(
      filterRunPortals({
        runMode: "bossRush",
        mapCleared: false,
        candidates: ["regular", "progression", "deathRealm"],
      }),
      [],
    );
  });

  it("unlocks only the progression portal after the last hostile dies", () => {
    assert.equal(shouldSuppressPortal("progression", "dungeon", true), false);
    assert.equal(shouldSuppressPortal("regular", "dungeon", true), true);
    assert.equal(shouldSuppressPortal("deathRealm", "dungeon", true), true);
    assert.equal(isProgressionLocked("dungeon", true), false);
    assert.equal(isProgressionPortalUnlocked("dungeon", true), true);
    assert.deepEqual(
      filterRunPortals({
        runMode: "dungeon",
        mapCleared: true,
        candidates: ["regular", "progression", "deathRealm"],
      }),
      ["progression"],
    );
  });

  it("does not invent a progression portal when the generator never proposed one", () => {
    assert.deepEqual(
      filterRunPortals({
        runMode: "bossRush",
        mapCleared: true,
        candidates: ["regular", "deathRealm"],
      }),
      [],
    );
  });

  it("passes free-exploration candidates through unchanged", () => {
    const candidates = ["regular", "dungeonEntry", "deathRealm"] as const;
    assert.deepEqual(
      filterRunPortals({
        runMode: "none",
        mapCleared: false,
        candidates: [...candidates],
      }),
      [...candidates],
    );
    for (const kind of candidates) {
      assert.equal(shouldSuppressPortal(kind, "none", false), false);
    }
    assert.equal(isProgressionPortalUnlocked("none", true), false);
    assert.equal(isProgressionLocked("none", false), false);
  });

  it("unlocks the run portal when only a leftover player summon remains", () => {
    const leftovers = [
      { id: "wolf", hp: 40, isSummon: true, side: "player" as const },
    ];
    const cleared = activeHostilesRemaining(leftovers) === 0;
    assert.equal(cleared, true);
    assert.equal(
      leftovers.length === 0,
      false,
      "enemies.length used to stay > 0 and keep the portal sealed",
    );
    assert.equal(isProgressionLocked("dungeon", cleared), false);
    assert.equal(isProgressionPortalUnlocked("dungeon", cleared), true);
  });
});
