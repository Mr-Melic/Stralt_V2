/**
 * Seeded replica of WorldExploration generateRandomMap / generateEnemies /
 * rest + Boss Rush placement — used only by solvability property tests.
 * Aesthetics stay in WX; this file exists so many seeds can be replayed.
 */

import { WORLD_GRID_SIZE } from "../data/gameConstants.ts";
import {
  BOSS_RUSH_PREFERRED_CELLS,
  MAP_ARCHETYPES,
  type Rng,
  applySanctuaryLayout,
  applyVoidTiles,
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
    { x: Math.floor(size / 2), y: size - 3, color: "boss", isRestExit: true },
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

export function simulateRestExitEncounter(seed: number): SimWorld {
  const rest = generateSeededRestMap();
  const dungeonExit = rest.portals.find((p) => p.restExitType === "dungeon");
  const arm = shouldArmDungeonChainOnRestExit(dungeonExit?.restExitType);
  const depth = restExitSpawnDepth(dungeonExit?.restExitType);
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
