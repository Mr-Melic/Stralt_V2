/**
 * Seeded replica of WorldExploration generateRandomMap / generateEnemies /
 * rest + Boss Rush placement — used only by solvability property tests.
 * Aesthetics stay in WX; this file exists so many seeds can be replayed.
 */

import { WORLD_GRID_SIZE } from "../data/gameConstants.ts";
import { findBattleStartCell } from "./battleStartPlacement.ts";
import {
  BOSS_RUSH_PREFERRED_CELLS,
  MAP_ARCHETYPES,
  type Rng,
  applySanctuaryLayout,
  applyVoidTiles,
  canPlaceWalkBlocker,
  createSeededRng,
  evaluateSolvability,
  finalizePlayableLayout,
  pickMapArchetype,
  placeBossRushSpawns,
  punchRosterReachability,
  resetFailedGenerationVoids,
  stampPortalTiles,
} from "./mapGen.ts";
import {
  type OccCell,
  type OccupancyContext,
  collectMandatoryProgressionCells,
  occKey,
  occupantsSealProgression,
  progressionReserved,
  relocateOffMandatoryCells,
  unsealProgressionOccupants,
} from "./occupancy.ts";
import {
  type DungeonChainSnapshot,
  type RunMode,
  decideDungeonChainPortal,
  isProgressionLocked,
  isProgressionPortalUnlocked,
  isRunProgressionPortal,
  restExitSpawnDepth,
  shouldArmDungeonChainOnRestExit,
  snapshotDungeonChain,
} from "./portalRules.ts";
import { spawnSummonUnit } from "./summonSpawn.ts";

export type SimArchetype = (typeof MAP_ARCHETYPES)[number]["type"];

export interface SimPortal {
  x: number;
  y: number;
  color: string;
  isProgressionPortal?: boolean;
  isDungeonEntry?: boolean;
  isBossRushPortal?: boolean;
  isRestPortal?: boolean;
  isRestExit?: boolean;
  restExitType?: string;
  isWhitePortal?: boolean;
}

export interface SimWorld {
  tiles: string[][];
  voidTiles: Set<string>;
  portals: SimPortal[];
  playerSpawn: { x: number; y: number };
  spawns: { x: number; y: number }[];
  runMode: RunMode;
  archetype: SimArchetype;
  seed: number;
}

function applyArchetypePostSteps(
  tiles: string[][],
  arch: SimArchetype,
  rng: Rng,
  size: number,
): void {
  if (arch === "fortress") {
    const cs = 3;
    for (let r2 = 0; r2 < cs; r2++)
      for (let c2 = 0; c2 < cs; c2++) tiles[r2][c2] = "wall";
    for (let r2 = 0; r2 < cs; r2++)
      for (let c2 = size - cs; c2 < size; c2++) tiles[r2][c2] = "wall";
    for (let r2 = size - cs; r2 < size; r2++)
      for (let c2 = 0; c2 < cs; c2++) tiles[r2][c2] = "wall";
    for (let r2 = size - cs; r2 < size; r2++)
      for (let c2 = size - cs; c2 < size; c2++) tiles[r2][c2] = "wall";
  } else if (arch === "ruinsIslands") {
    for (let i = 0; i < 5; i++) {
      const cr = 2 + Math.floor(rng() * (size - 4));
      const cc2 = 2 + Math.floor(rng() * (size - 4));
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          if (tiles[cr + dr]?.[cc2 + dc] !== undefined)
            tiles[cr + dr][cc2 + dc] = "wall";
        }
    }
  } else if (arch === "arena") {
    for (let r2 = 0; r2 < size; r2++)
      for (let c2 = 0; c2 < Math.floor(size / 2); c2++) {
        tiles[r2][size - 1 - c2] = tiles[r2][c2];
      }
  } else if (arch === "asymmetric") {
    for (let r2 = 0; r2 < size; r2++)
      for (let c2 = 0; c2 < Math.floor(size / 2); c2++) {
        tiles[r2][c2] = rng() < 0.2 ? "wall" : "floor";
      }
    for (let r2 = 0; r2 < size; r2++)
      for (let c2 = Math.floor(size / 2); c2 < size; c2++) {
        tiles[r2][c2] = rng() < 0.45 ? "wall" : "floor";
      }
  } else if (arch === "chessboard") {
    for (let r2 = 0; r2 < size; r2++)
      for (let c2 = 0; c2 < size; c2++) {
        if (r2 % 2 === 0 && c2 % 2 === 0) tiles[r2][c2] = "wall";
      }
  }
}

function carveCenterConnectivity(tiles: string[][], size: number): void {
  const spawnCx = Math.floor(size / 2);
  const spawnCy = Math.floor(size / 2);
  for (let dy = -3; dy <= 3; dy++) {
    for (let dx = -3; dx <= 3; dx++) {
      const nx = spawnCx + dx;
      const ny = spawnCy + dy;
      if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
        if (tiles[ny][nx] !== "portal") tiles[ny][nx] = "floor";
      }
    }
  }
  const visited = Array.from({ length: size }, () =>
    new Array(size).fill(false),
  );
  const queue: { x: number; y: number }[] = [{ x: spawnCx, y: spawnCy }];
  visited[spawnCy][spawnCx] = true;
  while (queue.length > 0) {
    const { x: qx, y: qy } = queue.shift()!;
    for (const [ddx, ddy] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ] as const) {
      const nx = qx + ddx;
      const ny = qy + ddy;
      if (nx < 0 || nx >= size || ny < 0 || ny >= size) continue;
      if (visited[ny][nx]) continue;
      if (tiles[ny][nx] === "wall") continue;
      visited[ny][nx] = true;
      queue.push({ x: nx, y: ny });
    }
  }
  for (let gy = 0; gy < size; gy++) {
    for (let gx = 0; gx < size; gx++) {
      if (tiles[gy][gx] !== "floor" && tiles[gy][gx] !== "portal") continue;
      if (visited[gy][gx]) continue;
      let cx2 = gx;
      let cy2 = gy;
      while ((cx2 !== spawnCx || cy2 !== spawnCy) && !visited[cy2][cx2]) {
        if (cx2 !== spawnCx) cx2 += Math.sign(spawnCx - cx2);
        else cy2 += Math.sign(spawnCy - cy2);
        if (tiles[cy2][cx2] === "wall") tiles[cy2][cx2] = "floor";
        visited[cy2][cx2] = true;
      }
    }
  }
}

function portalsReachableFrom(
  tiles: string[][],
  portals: { x: number; y: number }[],
  voidSet: Set<string>,
  size: number,
): boolean {
  let startX = -1;
  let startY = -1;
  outer: for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (tiles[y][x] === "floor" && !voidSet.has(`${x},${y}`)) {
        startX = x;
        startY = y;
        break outer;
      }
    }
  }
  if (startX < 0) return portals.length === 0;
  const visited = Array.from({ length: size }, () =>
    new Array(size).fill(false),
  );
  const q = [{ x: startX, y: startY }];
  visited[startY][startX] = true;
  while (q.length > 0) {
    const cur = q.shift()!;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const x = cur.x + dx;
      const y = cur.y + dy;
      if (x < 0 || y < 0 || x >= size || y >= size) continue;
      if (visited[y][x]) continue;
      if (tiles[y][x] === "wall") continue;
      if (voidSet.has(`${x},${y}`)) continue;
      visited[y][x] = true;
      q.push({ x, y });
    }
  }
  return portals.every(
    (p) => visited[p.y]?.[p.x] && !voidSet.has(`${p.x},${p.y}`),
  );
}

function placeSimPortals(
  tiles: string[][],
  rng: Rng,
  runMode: RunMode,
  size: number,
): SimPortal[] {
  const portals: SimPortal[] = [];
  const borderCandidates: { x: number; y: number }[] = [];
  for (let gy = 1; gy < size - 1; gy++) {
    for (let gx = 1; gx < size - 1; gx++) {
      if (tiles[gy][gx] !== "floor") continue;
      if (gx <= 2 || gx >= size - 3 || gy <= 2 || gy >= size - 3) {
        borderCandidates.push({ x: gx, y: gy });
      }
    }
  }
  for (let i = borderCandidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [borderCandidates[i], borderCandidates[j]] = [
      borderCandidates[j],
      borderCandidates[i],
    ];
  }
  if (runMode === "none") {
    const portalCount = Math.floor(rng() * 3) + 1;
    const colors = ["black", "blue", "red"] as const;
    for (let i = 0; i < Math.min(portalCount, borderCandidates.length); i++) {
      const cand = borderCandidates[i];
      if (
        portals.some(
          (p) => Math.max(Math.abs(p.x - cand.x), Math.abs(p.y - cand.y)) < 4,
        )
      )
        continue;
      tiles[cand.y][cand.x] = "portal";
      portals.push({
        x: cand.x,
        y: cand.y,
        color: colors[i % colors.length],
      });
    }
    if (portals.length === 0) {
      tiles[2][2] = "portal";
      portals.push({ x: 2, y: 2, color: "blue" });
    }
    const tryExtra = (color: string, flags: Partial<SimPortal>, minSep = 4) => {
      const used = new Set(portals.map((p) => `${p.x},${p.y}`));
      const cand = borderCandidates.find(
        (c) =>
          tiles[c.y][c.x] === "floor" &&
          !used.has(`${c.x},${c.y}`) &&
          portals.every(
            (p) => Math.max(Math.abs(p.x - c.x), Math.abs(p.y - c.y)) >= minSep,
          ),
      );
      if (!cand) return;
      tiles[cand.y][cand.x] = "portal";
      portals.push({ x: cand.x, y: cand.y, color, ...flags });
    };
    // Mirror WX overworld extras so punch-all / destack is exercised.
    if (rng() < 0.2) tryExtra("dungeon", { isDungeonEntry: true });
    if (rng() < 0.15) tryExtra("boss", { isBossRushPortal: true });
    if (rng() < 0.1) tryExtra("rest", { isRestPortal: true });
    if (rng() < 0.08) tryExtra("bossRush", { isBossRushPortal: true });
  } else {
    const used = new Set(portals.map((p) => `${p.x},${p.y}`));
    const cand = borderCandidates.find((c) => !used.has(`${c.x},${c.y}`));
    if (cand) {
      tiles[cand.y][cand.x] = "portal";
      portals.push({
        x: cand.x,
        y: cand.y,
        color: "progression",
        isProgressionPortal: true,
      });
    }
  }
  return portals;
}

function pickSpawn(
  tiles: string[][],
  voidTiles: Set<string>,
  size: number,
): { x: number; y: number } {
  let spawnX = Math.floor(size / 2);
  let spawnY = Math.floor(size / 2);
  if (
    !voidTiles.has(`${spawnX},${spawnY}`) &&
    tiles[spawnY][spawnX] !== "wall"
  ) {
    return { x: spawnX, y: spawnY };
  }
  for (let radius = 1; radius <= 15; radius++) {
    const candidates = [
      { x: spawnX + radius, y: spawnY },
      { x: spawnX - radius, y: spawnY },
      { x: spawnX, y: spawnY + radius },
      { x: spawnX, y: spawnY - radius },
      { x: spawnX + radius, y: spawnY + radius },
      { x: spawnX - radius, y: spawnY - radius },
      { x: spawnX + radius, y: spawnY - radius },
      { x: spawnX - radius, y: spawnY + radius },
    ];
    for (const c of candidates) {
      if (
        c.x >= 0 &&
        c.x < size &&
        c.y >= 0 &&
        c.y < size &&
        tiles[c.y][c.x] !== "wall" &&
        !voidTiles.has(`${c.x},${c.y}`)
      ) {
        return c;
      }
    }
  }
  return { x: spawnX, y: spawnY };
}

function placeEnemies(
  tiles: string[][],
  portals: { x: number; y: number }[],
  voidTiles: Set<string>,
  rng: Rng,
  size: number,
  count: number,
): { x: number; y: number }[] {
  const allValid: { x: number; y: number }[] = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (tiles[y][x] !== "floor") continue;
      if (voidTiles.has(`${x},${y}`)) continue;
      if (Math.abs(x - 8) <= 3 && Math.abs(y - 8) <= 3) continue;
      if (portals.some((p) => Math.abs(p.x - x) + Math.abs(p.y - y) <= 2))
        continue;
      allValid.push({ x, y });
    }
  }
  const shuffled = [...allValid];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const placed: { x: number; y: number }[] = [];
  for (const pos of shuffled) {
    if (placed.length >= count) break;
    if (
      placed.every(
        (e) => Math.max(Math.abs(e.x - pos.x), Math.abs(e.y - pos.y)) >= 4,
      )
    ) {
      placed.push(pos);
    }
  }
  if (placed.length === 0 && shuffled[0]) placed.push(shuffled[0]);
  return placed;
}

export interface GenerateSeededWorldOpts {
  seed: number;
  runMode?: RunMode;
  archetype?: SimArchetype;
  enemyCount?: number;
  size?: number;
  finalize?: boolean;
}

export function generateSeededWorld(opts: GenerateSeededWorldOpts): SimWorld {
  const rng = createSeededRng(opts.seed);
  const size = opts.size ?? WORLD_GRID_SIZE;
  const runMode = opts.runMode ?? "none";
  const archDef = opts.archetype
    ? (MAP_ARCHETYPES.find((a) => a.type === opts.archetype) ??
      MAP_ARCHETYPES[0])
    : pickMapArchetype(rng);
  const fillDensity = archDef.fillDensity;
  const smoothPasses = archDef.smoothPasses;
  let attempts = 0;
  const maxAttempts = fillDensity >= 0.4 ? 100 : 50;
  let tiles: string[][] = [];
  let portals: SimPortal[] = [];
  const voidTiles = new Set<string>();

  do {
    attempts++;
    tiles = Array(size)
      .fill(null)
      .map((_, gy) =>
        Array(size)
          .fill(null)
          .map((_, gx) => {
            if (gx === 0 || gx === size - 1 || gy === 0 || gy === size - 1)
              return "floor";
            return rng() < fillDensity ? "wall" : "floor";
          }),
      );
    for (let pass = 0; pass < smoothPasses; pass++) {
      const next = tiles.map((row) => [...row]);
      for (let gy = 1; gy < size - 1; gy++) {
        for (let gx = 1; gx < size - 1; gx++) {
          let wallCount = 0;
          for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++)
              if (tiles[gy + dy]?.[gx + dx] === "wall") wallCount++;
          if (wallCount >= 5) next[gy][gx] = "wall";
          else if (wallCount < 4) next[gy][gx] = "floor";
        }
      }
      tiles = next;
    }
    applyArchetypePostSteps(tiles, archDef.type, rng, size);
    portals = placeSimPortals(tiles, rng, runMode, size);
    if (runMode !== "none" && !portals.some((p) => p.isProgressionPortal)) {
      tiles[2][2] = "portal";
      portals.push({
        x: 2,
        y: 2,
        color: "progression",
        isProgressionPortal: true,
      });
    }
    carveCenterConnectivity(tiles, size);
    voidTiles.clear();
    const prot = new Set(portals.map((p) => `${p.x},${p.y}`));
    applyVoidTiles(tiles, archDef.type, voidTiles, prot, size, size, rng);
  } while (
    !portalsReachableFrom(tiles, portals, voidTiles, size) &&
    attempts < maxAttempts
  );

  if (attempts >= maxAttempts) {
    tiles = Array(size)
      .fill(null)
      .map(() => Array(size).fill("floor"));
    portals = [
      {
        x: 4,
        y: 4,
        color: runMode === "none" ? "blue" : "progression",
        isProgressionPortal: runMode !== "none",
      },
    ];
    tiles[4][4] = "portal";
    resetFailedGenerationVoids(voidTiles);
  }

  const playerSpawn = pickSpawn(tiles, voidTiles, size);
  const enemyCount = opts.enemyCount ?? 1 + Math.floor(rng() * 8);
  let spawns = placeEnemies(tiles, portals, voidTiles, rng, size, enemyCount);

  if (opts.finalize !== false) {
    const finalized = finalizePlayableLayout({
      tiles,
      voidTiles,
      playerSpawn,
      portals,
      spawns,
      w: size,
      h: size,
      requireExit: true,
    });
    return {
      tiles: finalized.tiles,
      voidTiles,
      portals: finalized.portals,
      playerSpawn: finalized.playerSpawn,
      spawns: finalized.spawns,
      runMode,
      archetype: archDef.type,
      seed: opts.seed,
    };
  }

  return {
    tiles,
    voidTiles,
    portals,
    playerSpawn,
    spawns,
    runMode,
    archetype: archDef.type,
    seed: opts.seed,
  };
}

export function generateSeededBossRushRoom(seed: number): SimWorld {
  const world = generateSeededWorld({
    seed,
    runMode: "bossRush",
    enemyCount: 0,
  });
  const preferred = BOSS_RUSH_PREFERRED_CELLS.map((c) => ({ x: c.x, y: c.y }));
  const placed = placeBossRushSpawns(
    world.tiles,
    world.voidTiles,
    preferred,
    world.playerSpawn,
    world.portals[0],
    WORLD_GRID_SIZE,
    WORLD_GRID_SIZE,
  );
  const finalized = finalizePlayableLayout({
    tiles: placed.tiles,
    voidTiles: world.voidTiles,
    playerSpawn: placed.playerSpawn,
    portals: world.portals,
    spawns: placed.spawns,
    w: WORLD_GRID_SIZE,
    h: WORLD_GRID_SIZE,
    requireExit: true,
  });
  return {
    ...world,
    tiles: finalized.tiles,
    portals: finalized.portals,
    playerSpawn: finalized.playerSpawn,
    spawns: finalized.spawns,
  };
}

export function generateSeededRestMap(): SimWorld {
  const size = WORLD_GRID_SIZE;
  const tiles: string[][] = [];
  for (let y = 0; y < size; y++) {
    const row: string[] = [];
    for (let x = 0; x < size; x++) {
      row.push(
        x === 0 || y === 0 || x === size - 1 || y === size - 1
          ? "wall"
          : "floor",
      );
    }
    tiles.push(row);
  }
  const portals: SimPortal[] = [
    { x: 2, y: 2, color: "blue", isRestExit: true, restExitType: "normal" },
    {
      x: size - 3,
      y: 2,
      color: "dungeon",
      isRestExit: true,
      restExitType: "dungeon",
      isDungeonEntry: true,
    },
    {
      x: Math.floor(size / 2),
      y: size - 3,
      color: "boss",
      isRestExit: true,
      restExitType: "boss",
    },
  ];
  const center = Math.floor(size / 2);
  stampPortalTiles(tiles, portals);
  const finalized = finalizePlayableLayout({
    tiles,
    voidTiles: new Set(),
    playerSpawn: { x: center, y: center },
    portals,
    spawns: [],
    w: size,
    h: size,
    requireExit: true,
  });
  return {
    tiles: finalized.tiles,
    voidTiles: new Set(),
    portals: finalized.portals,
    playerSpawn: finalized.playerSpawn,
    spawns: [],
    runMode: "none",
    archetype: "openField",
    seed: 0,
  };
}

export function simulateRestExitEncounter(
  seed: number,
  restExitType = "dungeon",
): SimWorld {
  const arm = shouldArmDungeonChainOnRestExit(restExitType);
  const depth = restExitSpawnDepth(restExitType);
  const world = generateSeededWorld({
    seed,
    runMode: arm ? "dungeon" : "none",
    enemyCount: 2 + depth,
  });
  const punched = punchRosterReachability(
    world.tiles,
    world.voidTiles,
    world.spawns,
    world.playerSpawn,
    world.portals[0],
    WORLD_GRID_SIZE,
    WORLD_GRID_SIZE,
  );
  const finalized = finalizePlayableLayout({
    tiles: punched.tiles,
    voidTiles: world.voidTiles,
    playerSpawn: punched.playerSpawn,
    portals: world.portals,
    spawns: punched.roster,
    w: WORLD_GRID_SIZE,
    h: WORLD_GRID_SIZE,
    requireExit: true,
  });
  return {
    ...world,
    tiles: finalized.tiles,
    portals: finalized.portals,
    playerSpawn: finalized.playerSpawn,
    spawns: finalized.spawns,
  };
}

export function simulateCleanupSnapshotProgression(
  active: boolean,
  depth: number,
  maxDepth: number,
): ReturnType<typeof decideDungeonChainPortal> {
  const refs = {
    dungeonChainActiveRef: { current: active },
    dungeonChainDepthRef: { current: depth },
    dungeonChainMaxDepthRef: { current: maxDepth },
  };
  const snap: DungeonChainSnapshot = snapshotDungeonChain(refs);
  refs.dungeonChainActiveRef.current = false;
  refs.dungeonChainDepthRef.current = 0;
  refs.dungeonChainMaxDepthRef.current = 0;
  return decideDungeonChainPortal(false, snap);
}

export function simulateClearUnlocksPortal(
  runMode: RunMode,
  hostilesRemaining: number,
): { locked: boolean; unlocked: boolean; progression: boolean } {
  const mapCleared = hostilesRemaining === 0;
  const portal = { isProgressionPortal: true };
  return {
    locked: isProgressionLocked(runMode, mapCleared),
    unlocked: isProgressionPortalUnlocked(runMode, mapCleared),
    progression: isRunProgressionPortal(portal, runMode),
  };
}

export function generateSeededSanctuary(seed: number): SimWorld {
  const world = generateSeededWorld({ seed, runMode: "none" });
  const map = {
    tiles: world.tiles,
    portals: world.portals,
    voidTiles: world.voidTiles,
  };
  const applied = applySanctuaryLayout(
    map,
    world.playerSpawn,
    WORLD_GRID_SIZE,
    {
      x: world.playerSpawn.x,
      y: world.playerSpawn.y,
      color: "white",
      isWhitePortal: true,
    },
  );
  return {
    ...world,
    tiles: map.tiles,
    portals: map.portals,
    playerSpawn: applied.spawn,
  };
}

/** Boss-portal entry used to drop the boss at (11, 5) with no punch. */
export function generateSeededBossPortalEncounter(seed: number): SimWorld {
  const world = generateSeededWorld({
    seed,
    runMode: "none",
    enemyCount: 0,
  });
  const mid = Math.floor(WORLD_GRID_SIZE / 2);
  const bossCell = { x: mid + 3, y: mid - 3 };
  const punched = punchRosterReachability(
    world.tiles,
    world.voidTiles,
    [bossCell],
    world.playerSpawn,
    world.portals[0],
    WORLD_GRID_SIZE,
    WORLD_GRID_SIZE,
  );
  const finalized = finalizePlayableLayout({
    tiles: punched.tiles,
    voidTiles: world.voidTiles,
    playerSpawn: punched.playerSpawn,
    portals: world.portals,
    spawns: punched.roster,
    w: WORLD_GRID_SIZE,
    h: WORLD_GRID_SIZE,
    requireExit: true,
  });
  return {
    ...world,
    tiles: finalized.tiles,
    portals: finalized.portals,
    playerSpawn: finalized.playerSpawn,
    spawns: finalized.spawns,
  };
}

export function generateSeededDeathRealm(seed = 0): SimWorld {
  const rng = createSeededRng(seed);
  const size = WORLD_GRID_SIZE;
  const tiles: string[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => "floor"),
  );
  const edgePositions: { x: number; y: number }[] = [];
  for (let i = 2; i <= 13; i += 4) {
    edgePositions.push({ x: i, y: 1 });
    edgePositions.push({ x: i, y: 14 });
    edgePositions.push({ x: 1, y: i });
    edgePositions.push({ x: 14, y: i });
  }
  for (let i = edgePositions.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [edgePositions[i], edgePositions[j]] = [edgePositions[j], edgePositions[i]];
  }
  const portalCount = 2 + Math.floor(rng() * 2);
  const colors = ["black", "blue", "red"] as const;
  const portals: SimPortal[] = [];
  for (let i = 0; i < Math.min(portalCount, edgePositions.length); i++) {
    const pos = edgePositions[i];
    portals.push({ x: pos.x, y: pos.y, color: colors[i % colors.length] });
  }
  stampPortalTiles(tiles, portals);
  let spawnPos = { x: 1, y: 1 };
  outer: for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (tiles[y][x] === "floor") {
        spawnPos = { x, y };
        break outer;
      }
    }
  }
  const finalized = finalizePlayableLayout({
    tiles,
    voidTiles: new Set(),
    playerSpawn: spawnPos,
    portals,
    spawns: [],
    w: size,
    h: size,
    requireExit: true,
  });
  return {
    tiles: finalized.tiles,
    voidTiles: new Set(),
    portals: finalized.portals,
    playerSpawn: finalized.playerSpawn,
    spawns: [],
    runMode: "none",
    archetype: "openField",
    seed,
  };
}

const SIM_SUMMON_SPELL = {
  id: "summon-wolf",
  name: "Summon Wolf",
  summonUnitDef: { pieceType: "pawn" as const, level: 1 },
  summonAI: "hunter",
};

/**
 * Drop `count` summons onto a finalized world (enemy cells, then
 * portal-adjacent floors). Spawn/unseal must leave a player→exit route.
 */
export function simulateSummonsOnWorld(
  world: SimWorld,
  count: number,
): { sealed: boolean; cells: { x: number; y: number }[] } {
  const tiles = world.tiles.map((row) => row.map((t) => t !== "wall"));
  const portals = new Set(world.portals.map((p) => `${p.x},${p.y}`));
  const occupied = new Set<string>([
    `${world.playerSpawn.x},${world.playerSpawn.y}`,
  ]);
  const size = world.tiles[0]?.length ?? WORLD_GRID_SIZE;
  const candidates: { x: number; y: number }[] = [];
  for (const s of world.spawns) candidates.push({ x: s.x, y: s.y });
  for (const p of world.portals) {
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const x = p.x + dx;
      const y = p.y + dy;
      if (x < 0 || y < 0 || x >= size || y >= size) continue;
      if (world.tiles[y][x] === "wall") continue;
      if (world.voidTiles.has(`${x},${y}`)) continue;
      candidates.push({ x, y });
    }
  }
  candidates.push({
    x: Math.min(size - 1, world.playerSpawn.x + 1),
    y: world.playerSpawn.y,
  });
  const cells: { x: number; y: number }[] = [];
  const n = Math.max(0, Math.min(count, Math.max(candidates.length, 1)));
  for (let i = 0; i < n; i++) {
    const cell = candidates[i % Math.max(candidates.length, 1)] ?? {
      x: world.playerSpawn.x,
      y: world.playerSpawn.y,
    };
    const reserved = collectMandatoryProgressionCells(
      tiles,
      world.voidTiles,
      portals,
      world.playerSpawn,
      new Set(),
    );
    const spawned = spawnSummonUnit(
      cell,
      SIM_SUMMON_SPELL,
      "player",
      1,
      () => {},
      () => ({ init: 4 }),
      0,
      {
        tiles,
        barriers: new Set(),
        voidTiles: world.voidTiles,
        portals,
        reserved,
        progressStart: world.playerSpawn,
        isOccupied: (c) => occupied.has(`${c.x},${c.y}`),
      },
    );
    occupied.add(`${spawned.summon.x},${spawned.summon.y}`);
    cells.push({ x: spawned.summon.x, y: spawned.summon.y });
  }
  return {
    sealed: occupantsSealProgression(
      tiles,
      world.voidTiles,
      portals,
      world.playerSpawn,
      cells,
    ),
    cells,
  };
}

export function reportWorld(
  world: SimWorld,
  opts?: { allowSpawnOnPortal?: boolean },
) {
  return evaluateSolvability(
    world.tiles,
    world.voidTiles,
    world.playerSpawn,
    world.portals,
    world.spawns,
    world.tiles[0]?.length ?? WORLD_GRID_SIZE,
    world.tiles.length,
    opts,
  );
}

/**
 * Place a corpse/summon on every unique player→exit bridge, then relocate.
 * Living leftovers on those cells permanently seal the unlocked portal.
 */
export function simulateCorpsesOnWorld(world: SimWorld): {
  sealed: boolean;
  cells: OccCell[];
} {
  const tiles = world.tiles.map((row) => row.map((t) => t !== "wall"));
  const portals = new Set(world.portals.map((p) => `${p.x},${p.y}`));
  const occupied = new Set<string>([
    `${world.playerSpawn.x},${world.playerSpawn.y}`,
  ]);
  const ctx: OccupancyContext = {
    tiles,
    barriers: new Set(),
    voidTiles: world.voidTiles,
    portals,
    progressStart: world.playerSpawn,
    isOccupied: (c) => occupied.has(occKey(c.x, c.y)),
  };
  const mandatory = progressionReserved(ctx, world.playerSpawn);
  if (mandatory.size === 0) {
    return { sealed: false, cells: [] };
  }
  let offPath = 0;
  const size = world.tiles[0]?.length ?? WORLD_GRID_SIZE;
  for (let y = 0; y < world.tiles.length; y++) {
    for (let x = 0; x < size; x++) {
      const k = occKey(x, y);
      if (mandatory.has(k) || portals.has(k)) continue;
      if (k === `${world.playerSpawn.x},${world.playerSpawn.y}`) continue;
      if (world.tiles[y][x] === "wall") continue;
      if (world.voidTiles.has(k)) continue;
      offPath += 1;
    }
  }
  if (offPath === 0) {
    return { sealed: false, cells: [] };
  }
  const ranked = [...mandatory]
    .map((k) => {
      const p = k.split(",");
      const x = Number(p[0]);
      const y = Number(p[1]);
      return {
        x,
        y,
        dist:
          Math.abs(x - world.playerSpawn.x) + Math.abs(y - world.playerSpawn.y),
      };
    })
    .sort((a, b) => b.dist - a.dist);
  const corpses: OccCell[] = ranked
    .slice(0, Math.min(ranked.length, Math.min(offPath, 4)))
    .map((c) => ({ x: c.x, y: c.y }));
  const moved = relocateOffMandatoryCells(corpses, mandatory, ctx);
  const unsealed = unsealProgressionOccupants(
    moved,
    tiles,
    world.voidTiles,
    portals,
    world.playerSpawn,
    ctx,
  );
  return {
    sealed: occupantsSealProgression(
      tiles,
      world.voidTiles,
      portals,
      world.playerSpawn,
      unsealed,
    ),
    cells: unsealed,
  };
}

/**
 * Try to drop `count` walk-blockers (pillars/gates) on legal side cells.
 * Cut-vertex candidates must be rejected so a corridor cannot seal the exit.
 */
export function simulateWalkBlockersOnWorld(
  world: SimWorld,
  count: number,
): { placed: OccCell[]; rejectedCutVertices: number; ok: boolean } {
  const w = world.tiles[0]?.length ?? WORLD_GRID_SIZE;
  const h = world.tiles.length;
  const placed: OccCell[] = [];
  let rejectedCutVertices = 0;
  const tiles = world.tiles.map((row) => row.slice());
  const used = new Set<string>([
    `${world.playerSpawn.x},${world.playerSpawn.y}`,
    ...world.portals.map((p) => `${p.x},${p.y}`),
    ...world.spawns.map((s) => `${s.x},${s.y}`),
  ]);
  for (let y = 0; y < h && placed.length < count; y++) {
    for (let x = 0; x < w && placed.length < count; x++) {
      const k = `${x},${y}`;
      if (used.has(k)) continue;
      if (tiles[y][x] === "wall") continue;
      if (world.voidTiles.has(k)) continue;
      const legal = canPlaceWalkBlocker(
        tiles,
        world.voidTiles,
        world.playerSpawn,
        world.portals,
        world.spawns,
        w,
        h,
        { x, y },
      );
      if (!legal) {
        rejectedCutVertices += 1;
        continue;
      }
      tiles[y][x] = "wall";
      used.add(k);
      placed.push({ x, y });
    }
  }
  const report = evaluateSolvability(
    tiles,
    world.voidTiles,
    world.playerSpawn,
    world.portals,
    world.spawns,
    w,
    h,
  );
  return { placed, rejectedCutVertices, ok: report.ok };
}

/**
 * Replay WX battle-start destack (player ≥3, enemies ≥2) on a finalized
 * world. Spacing used to scatter units onto a far island when the graph
 * was still one component — still must stay solvable.
 */
export function simulateBattleStartOnWorld(world: SimWorld): {
  playerSpawn: OccCell;
  spawns: OccCell[];
  ok: boolean;
} {
  const size = world.tiles[0]?.length ?? WORLD_GRID_SIZE;
  const tiles = world.tiles.map((row) => row.map((t) => t !== "wall"));
  const placed = new Set<string>();
  for (const s of world.spawns) placed.add(`${s.x},${s.y}`);
  const ctx: OccupancyContext = {
    tiles,
    barriers: new Set(),
    voidTiles: world.voidTiles,
    portals: new Set(world.portals.map((p) => `${p.x},${p.y}`)),
    isOccupied: (c) => placed.has(occKey(c.x, c.y)),
  };
  const player =
    findBattleStartCell(
      world.playerSpawn,
      world.spawns.map((s) => ({ x: s.x, y: s.y, minDist: 3 })),
      3,
      ctx,
    ) ?? world.playerSpawn;
  placed.add(`${player.x},${player.y}`);
  const nextSpawns: OccCell[] = [];
  for (const s of world.spawns) {
    const avoid: { x: number; y: number; minDist: number }[] = [
      { x: player.x, y: player.y, minDist: 3 },
    ];
    for (const key of placed) {
      const p = key.split(",");
      avoid.push({ x: Number(p[0]), y: Number(p[1]), minDist: 2 });
    }
    const cell = findBattleStartCell({ x: s.x, y: s.y }, avoid, 2, ctx) ?? {
      x: s.x,
      y: s.y,
    };
    placed.add(`${cell.x},${cell.y}`);
    nextSpawns.push(cell);
  }
  const report = evaluateSolvability(
    world.tiles,
    world.voidTiles,
    player,
    world.portals,
    nextSpawns,
    size,
    world.tiles.length,
  );
  return { playerSpawn: player, spawns: nextSpawns, ok: report.ok };
}

const WANDER_DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

/**
 * Replay overworld wander on the finalized graph. Enemies used to step onto
 * leftover CA crumbs (still floor, outside the spawn flood); battle then
 * started on an island and sealed every exit. After seal they must stay
 * engageable.
 */
export function simulateEnemyWanderOnWorld(
  world: SimWorld,
  steps: number,
  rng: Rng,
): { spawns: { x: number; y: number }[]; ok: boolean } {
  const size = world.tiles[0]?.length ?? WORLD_GRID_SIZE;
  const portals = new Set(world.portals.map((p) => `${p.x},${p.y}`));
  const occupied = new Set<string>([
    `${world.playerSpawn.x},${world.playerSpawn.y}`,
  ]);
  const walk = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= size || y >= world.tiles.length) return false;
    if (world.tiles[y][x] === "wall") return false;
    const k = `${x},${y}`;
    if (world.voidTiles.has(k) || portals.has(k)) return false;
    return true;
  };
  const spawns = world.spawns.map((s) => ({ x: s.x, y: s.y }));
  for (const s of spawns) occupied.add(`${s.x},${s.y}`);
  for (const s of spawns) {
    occupied.delete(`${s.x},${s.y}`);
    for (let i = 0; i < steps; i++) {
      const d = WANDER_DIRS[Math.floor(rng() * WANDER_DIRS.length)];
      const nx = s.x + d[0];
      const ny = s.y + d[1];
      const k = `${nx},${ny}`;
      if (!walk(nx, ny) || occupied.has(k)) continue;
      s.x = nx;
      s.y = ny;
    }
    occupied.add(`${s.x},${s.y}`);
  }
  const report = evaluateSolvability(
    world.tiles,
    world.voidTiles,
    world.playerSpawn,
    world.portals,
    spawns,
    size,
    world.tiles.length,
  );
  return { spawns, ok: report.ok };
}
