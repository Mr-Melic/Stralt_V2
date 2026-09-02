// Pure map-generation helpers — extracted from WorldExploration.tsx
// Zero React / DOM dependencies.

export const MAP_ARCHETYPES = [
  {
    type: "openField" as const,
    fillDensity: 0.22,
    smoothPasses: 2,
    weight: 25,
  },
  {
    type: "corridorMaze" as const,
    fillDensity: 0.55,
    smoothPasses: 4,
    weight: 15,
  },
  {
    type: "fortress" as const,
    fillDensity: 0.4,
    smoothPasses: 3,
    weight: 15,
  },
  {
    type: "ruinsIslands" as const,
    fillDensity: 0.3,
    smoothPasses: 2,
    weight: 15,
  },
  { type: "arena" as const, fillDensity: 0.12, smoothPasses: 1, weight: 10 },
  {
    type: "asymmetric" as const,
    fillDensity: 0.35,
    smoothPasses: 3,
    weight: 10,
  },
  {
    type: "chessboard" as const,
    fillDensity: 0.5,
    smoothPasses: 2,
    weight: 10,
  },
];

/** Pluggable [0, 1) source. Production keeps `Math.random`; tests pass a seed. */
export type Rng = () => number;

/** Mulberry32 — deterministic across the solvability property suite. */
export function createSeededRng(seed: number): Rng {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickMapArchetype(rng: Rng = Math.random) {
  const totalWeight = MAP_ARCHETYPES.reduce((s, a) => s + a.weight, 0);
  let r = rng() * totalWeight;
  for (const a of MAP_ARCHETYPES) {
    r -= a.weight;
    if (r <= 0) return a;
  }
  return MAP_ARCHETYPES[0];
}

/** Rest/Death Realm maps still store voids as `Map`. Reachability only needs `.has`. */
export function toVoidSet(
  vt: Set<string> | Map<string, unknown> | undefined | null,
): Set<string> {
  if (!vt) return new Set();
  if (vt instanceof Set) return vt;
  return new Set(vt.keys());
}

export function countWalkableVoid(
  tilesArr: string[][],
  vt: Set<string>,
  w: number,
  h: number,
): number {
  let n = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if ((tilesArr[y]?.[x] as string) !== "wall" && !vt.has(`${x},${y}`)) n++;
  return n;
}

export function checkVoidConnectivity(
  tilesArr: string[][],
  vt: Set<string>,
  w: number,
  h: number,
): boolean {
  let sx = -1;
  let sy = -1;
  outer: for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if ((tilesArr[y]?.[x] as string) !== "wall" && !vt.has(`${x},${y}`)) {
        sx = x;
        sy = y;
        break outer;
      }
  if (sx < 0) return true;
  const vis = new Set<string>();
  const q = [`${sx},${sy}`];
  while (q.length > 0) {
    const k = q.shift()!;
    if (vis.has(k)) continue;
    vis.add(k);
    const ps = k.split(",");
    const kx = Number(ps[0]);
    const ky = Number(ps[1]);
    for (const d of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ] as [number, number][]) {
      const nx = kx + d[0];
      const ny = ky + d[1];
      const nk = `${nx},${ny}`;
      if (
        tilesArr[ny]?.[nx] &&
        (tilesArr[ny][nx] as string) !== "wall" &&
        !vt.has(nk) &&
        !vis.has(nk)
      )
        q.push(nk);
    }
  }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (
        (tilesArr[y]?.[x] as string) !== "wall" &&
        !vt.has(`${x},${y}`) &&
        !vis.has(`${x},${y}`)
      )
        return false;
  return true;
}

export function applyVoidTiles(
  tilesArr: string[][],
  arch: string,
  vt: Set<string>,
  prot: Set<string>,
  mw: number,
  mh: number,
  rng: Rng = Math.random,
): void {
  const ec =
    arch === "arena"
      ? 0.04
      : arch === "corridorMaze"
        ? 0.18
        : arch === "ruinsIslands"
          ? 0.32
          : 0.13;
  for (let x = 0; x < mw; x++)
    for (let y = 0; y < mh; y++) {
      if ((tilesArr[y]?.[x] as string) === "wall" || prot.has(`${x},${y}`))
        continue;
      if ((x <= 1 || y <= 1 || x >= mw - 2 || y >= mh - 2) && rng() < ec)
        vt.add(`${x},${y}`);
    }
  if (arch === "corridorMaze" || arch === "arena") return;
  const cc =
    arch === "ruinsIslands"
      ? 5 + Math.floor(rng() * 3)
      : 2 + Math.floor(rng() * 2);
  const mw2 = countWalkableVoid(tilesArr, vt, mw, mh) * 0.55;
  for (let c = 0; c < cc; c++) {
    const ad: string[] = [];
    let at = 0;
    let cx = 0;
    let cy = 0;
    do {
      cx = 2 + Math.floor(rng() * (mw - 4));
      cy = 2 + Math.floor(rng() * (mh - 4));
      at++;
    } while (
      at < 20 &&
      ((tilesArr[cy]?.[cx] as string) === "wall" ||
        vt.has(`${cx},${cy}`) ||
        prot.has(`${cx},${cy}`))
    );
    if (at >= 20) continue;
    const sz = 2 + Math.floor(rng() * 3);
    const q = [`${cx},${cy}`];
    while (ad.length < sz && q.length > 0) {
      const k = q.shift()!;
      if (vt.has(k) || prot.has(k)) continue;
      const p = k.split(",");
      const kx = Number(p[0]);
      const ky = Number(p[1]);
      if (!tilesArr[ky]?.[kx] || (tilesArr[ky][kx] as string) === "wall")
        continue;
      ad.push(k);
      vt.add(k);
      for (const d of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ] as [number, number][])
        q.push(`${kx + d[0]},${ky + d[1]}`);
    }
    if (countWalkableVoid(tilesArr, vt, mw, mh) < mw2) {
      for (const k of ad) vt.delete(k);
    }
  }
  // M3 fix: run connectivity check once after all clusters placed
  if (!checkVoidConnectivity(tilesArr, vt, mw, mh)) {
    vt.clear();
  }
}

// ── SECTION 6: MAP REACHABILITY LOCK-IN ────────────────────────────────────
// Pure post-generation pass. Flood-fills from the player spawn over walkable
// (non-wall, non-void) tiles, then guarantees every enemy spawn and the portal
// are reachable from the player. Enclosed spawns are either connected by
// carving the fewest possible walls to floor, or relocated to the nearest
// reachable cell when carving is impractical (deep void pocket).
//
// Runs AFTER archetype post-steps, void tile application, and enemy spawn
// placement, BEFORE state commit. Self-contained — no React / DOM imports.

const REACH_DIRS: [number, number][] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

function isWalkable(
  tiles: string[][],
  vt: Set<string>,
  x: number,
  y: number,
  w: number,
  h: number,
): boolean {
  if (x < 0 || y < 0 || x >= w || y >= h) return false;
  const t = tiles[y]?.[x] as string;
  if (t === "wall") return false;
  if (vt.has(`${x},${y}`)) return false;
  return true;
}

function floodFillReachable(
  tiles: string[][],
  vt: Set<string>,
  start: { x: number; y: number },
  w: number,
  h: number,
): Set<string> {
  const visited = new Set<string>();
  if (!isWalkable(tiles, vt, start.x, start.y, w, h)) return visited;
  const q: { x: number; y: number }[] = [start];
  visited.add(`${start.x},${start.y}`);
  while (q.length > 0) {
    const cur = q.shift()!;
    for (const d of REACH_DIRS) {
      const nx = cur.x + d[0];
      const ny = cur.y + d[1];
      const k = `${nx},${ny}`;
      if (visited.has(k)) continue;
      if (!isWalkable(tiles, vt, nx, ny, w, h)) continue;
      visited.add(k);
      q.push({ x: nx, y: ny });
    }
  }
  return visited;
}

// BFS from `start` to any cell in `targetSet`, treating walls as walkable
// (cost 1) and floor/portal as walkable (cost 0). Returns the sequence of
// wall cells to convert to floor, or null if no path exists (e.g. blocked by
// void or grid bounds).
function bfsCarvePath(
  tiles: string[][],
  vt: Set<string>,
  start: { x: number; y: number },
  targetSet: Set<string>,
  w: number,
  h: number,
): { x: number; y: number }[] | null {
  // 0-1 BFS using two queues (floor = front, wall = back).
  const visited = new Set<string>();
  const parent = new Map<string, { x: number; y: number } | null>();
  const startKey = `${start.x},${start.y}`;
  // Start cell must be in-bounds and not void. It may be a wall (we'll carve it).
  if (
    start.x < 0 ||
    start.y < 0 ||
    start.x >= w ||
    start.y >= h ||
    vt.has(startKey)
  )
    return null;
  const floorQ: { x: number; y: number }[] = [];
  const wallQ: { x: number; y: number }[] = [];
  if ((tiles[start.y]?.[start.x] as string) === "wall") {
    wallQ.push(start);
  } else {
    floorQ.push(start);
  }
  visited.add(startKey);
  parent.set(startKey, null);
  let foundKey: string | null = null;
  while (floorQ.length > 0 || wallQ.length > 0) {
    const cur = floorQ.length > 0 ? floorQ.shift()! : wallQ.shift()!;
    const ck = `${cur.x},${cur.y}`;
    if (targetSet.has(ck) && ck !== startKey) {
      foundKey = ck;
      break;
    }
    for (const d of REACH_DIRS) {
      const nx = cur.x + d[0];
      const ny = cur.y + d[1];
      const nk = `${nx},${ny}`;
      if (visited.has(nk)) continue;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      if (vt.has(nk)) continue; // void is never traversable
      visited.add(nk);
      parent.set(nk, cur);
      if ((tiles[ny]?.[nx] as string) === "wall") {
        wallQ.push({ x: nx, y: ny });
      } else {
        floorQ.push({ x: nx, y: ny });
      }
    }
  }
  if (foundKey === null) return null;
  // Walk back from foundKey to start, collecting wall cells only.
  const carve: { x: number; y: number }[] = [];
  let curKey: string | null = foundKey;
  while (curKey !== null && curKey !== startKey) {
    const p = curKey.split(",");
    const px = Number(p[0]);
    const py = Number(p[1]);
    if ((tiles[py]?.[px] as string) === "wall") {
      carve.push({ x: px, y: py });
    }
    const par = parent.get(curKey);
    if (!par) break;
    curKey = `${par.x},${par.y}`;
  }
  // Also carve the start cell itself if it's a wall (so the spawn sits on floor).
  if ((tiles[start.y]?.[start.x] as string) === "wall") {
    carve.push({ x: start.x, y: start.y });
  }
  return carve;
}

// Find the nearest cell in `reachable` to `target` by Chebyshev distance that
// is also walkable. Excluded cells (spawn / portals / hostiles) are never
// returned — a fallback onto those used to stack a portal on a rat or two
// isolated pockets onto one floor.
function nearestReachableCell(
  target: { x: number; y: number },
  reachable: Set<string>,
  w: number,
  h: number,
  exclude?: Set<string>,
): { x: number; y: number } | null {
  let best: { x: number; y: number } | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const k of reachable) {
    const p = k.split(",");
    const rx = Number(p[0]);
    const ry = Number(p[1]);
    if (rx < 0 || ry < 0 || rx >= w || ry >= h) continue;
    if (exclude?.has(k)) continue;
    const dist = Math.max(Math.abs(rx - target.x), Math.abs(ry - target.y));
    if (dist < bestDist) {
      bestDist = dist;
      best = { x: rx, y: ry };
    }
  }
  return best;
}

/** Punch one neighboring wall so destack has a unique floor. */
function punchAdjacentFloor(
  tiles: string[][],
  vt: Set<string>,
  reachable: Set<string>,
  exclude: Set<string>,
  w: number,
  h: number,
): { x: number; y: number } | null {
  for (const k of reachable) {
    const p = k.split(",");
    const x = Number(p[0]);
    const y = Number(p[1]);
    for (const d of REACH_DIRS) {
      const nx = x + d[0];
      const ny = y + d[1];
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const nk = `${nx},${ny}`;
      if (vt.has(nk) || exclude.has(nk)) continue;
      if ((tiles[ny]?.[nx] as string) === "wall") {
        tiles[ny][nx] = "floor";
        reachable.add(nk);
        return { x: nx, y: ny };
      }
    }
  }
  return null;
}

function claimUniqueReachableCell(
  tiles: string[][],
  vt: Set<string>,
  from: { x: number; y: number },
  reachable: Set<string>,
  exclude: Set<string>,
  w: number,
  h: number,
): { x: number; y: number } | null {
  const near = nearestReachableCell(from, reachable, w, h, exclude);
  if (near) return near;
  return punchAdjacentFloor(tiles, vt, reachable, exclude, w, h);
}

function isWhitePortalFlag(portal: object): boolean {
  return (portal as { isWhitePortal?: unknown }).isWhitePortal === true;
}

function destackStackedPortals<P extends { x: number; y: number }>(
  tiles: string[][],
  vt: Set<string>,
  portals: P[],
  playerSpawn: { x: number; y: number },
  spawns: { x: number; y: number }[],
  w: number,
  h: number,
): void {
  const reachable = floodFillReachable(tiles, vt, playerSpawn, w, h);
  const occupied = new Set<string>([
    `${playerSpawn.x},${playerSpawn.y}`,
    ...spawns.map((s) => `${s.x},${s.y}`),
  ]);
  const seen = new Set<string>();
  for (let i = 0; i < portals.length; i++) {
    const k = `${portals[i].x},${portals[i].y}`;
    if (!seen.has(k)) {
      seen.add(k);
      occupied.add(k);
      continue;
    }
    const next = relocatePortalOntoReachable(
      tiles,
      vt,
      portals[i],
      reachable,
      playerSpawn,
      w,
      h,
      new Set([...occupied, ...seen]),
    );
    portals[i].x = next.x;
    portals[i].y = next.y;
    seen.add(`${next.x},${next.y}`);
    occupied.add(`${next.x},${next.y}`);
  }
}

function destackSpawns(
  tiles: string[][],
  vt: Set<string>,
  spawns: { x: number; y: number }[],
  occupied: Set<string>,
  reserved: Set<string>,
  reachable: Set<string>,
  w: number,
  h: number,
): void {
  const seen = new Set<string>();
  for (let i = 0; i < spawns.length; i++) {
    const k = `${spawns[i].x},${spawns[i].y}`;
    if (!seen.has(k) && !reserved.has(k)) {
      seen.add(k);
      continue;
    }
    const near = claimUniqueReachableCell(
      tiles,
      vt,
      spawns[i],
      reachable,
      new Set([...reserved, ...seen, k]),
      w,
      h,
    );
    if (near && `${near.x},${near.y}` !== k) {
      occupied.delete(k);
      spawns[i] = near;
      occupied.add(`${near.x},${near.y}`);
      seen.add(`${near.x},${near.y}`);
    }
  }
}

export function legalizePlayerSpawn(
  tiles: string[][],
  voidTiles: Set<string>,
  spawn: { x: number; y: number },
  w: number,
  h: number,
): { x: number; y: number } {
  if (isWalkable(tiles, voidTiles, spawn.x, spawn.y, w, h)) {
    return { x: spawn.x, y: spawn.y };
  }
  // Wall (not void): carve the spawn cell so the player stands on floor.
  if (
    spawn.x >= 0 &&
    spawn.y >= 0 &&
    spawn.x < w &&
    spawn.y < h &&
    !voidTiles.has(`${spawn.x},${spawn.y}`)
  ) {
    tiles[spawn.y][spawn.x] = "floor";
    return { x: spawn.x, y: spawn.y };
  }
  let best: { x: number; y: number } | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!isWalkable(tiles, voidTiles, x, y, w, h)) continue;
      const dist = Math.max(Math.abs(x - spawn.x), Math.abs(y - spawn.y));
      if (dist < bestDist) {
        bestDist = dist;
        best = { x, y };
      }
    }
  }
  if (best) return best;
  const cx = Math.max(0, Math.min(w - 1, spawn.x));
  const cy = Math.max(0, Math.min(h - 1, spawn.y));
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (
        nx >= 0 &&
        ny >= 0 &&
        nx < w &&
        ny < h &&
        !voidTiles.has(`${nx},${ny}`)
      ) {
        tiles[ny][nx] = "floor";
      }
    }
  }
  if (isWalkable(tiles, voidTiles, cx, cy, w, h)) return { x: cx, y: cy };
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (isWalkable(tiles, voidTiles, nx, ny, w, h)) return { x: nx, y: ny };
    }
  }
  return { x: cx, y: cy };
}

function relocatePortalOntoReachable(
  tiles: string[][],
  vt: Set<string>,
  portal: { x: number; y: number },
  reachable: Set<string>,
  playerSpawn: { x: number; y: number },
  w: number,
  h: number,
  exclude?: Set<string>,
): { x: number; y: number } {
  const reserved = new Set<string>(exclude);
  reserved.add(`${playerSpawn.x},${playerSpawn.y}`);
  const dest =
    claimUniqueReachableCell(tiles, vt, portal, reachable, reserved, w, h) ??
    [...reachable]
      .map((k) => {
        const p = k.split(",");
        return { x: Number(p[0]), y: Number(p[1]) };
      })
      .find(
        (c) =>
          (c.x !== playerSpawn.x || c.y !== playerSpawn.y) &&
          !reserved.has(`${c.x},${c.y}`),
      ) ??
    playerSpawn;
  if (tiles[portal.y]?.[portal.x] === "portal") {
    tiles[portal.y][portal.x] = "floor";
  }
  if (tiles[dest.y]) {
    tiles[dest.y][dest.x] = "portal";
  }
  return { x: dest.x, y: dest.y };
}

export function ensureReachability(
  tiles: string[][],
  voidTiles: Set<string>,
  spawns: { x: number; y: number }[],
  playerSpawn: { x: number; y: number },
  portal: { x: number; y: number },
  w: number,
  h: number,
  portalExclude?: Set<string>,
): {
  tiles: string[][];
  spawns: { x: number; y: number }[];
  playerSpawn: { x: number; y: number };
  portal: { x: number; y: number };
} {
  // Deep-copy tiles so we never mutate the caller's grid.
  const out: string[][] = tiles.map((row) => (row ? row.slice() : []));
  const vt = voidTiles;
  // Defensive copy of spawns (we may relocate individual entries).
  const outSpawns: { x: number; y: number }[] = spawns.map((s) => ({
    x: s.x,
    y: s.y,
  }));

  // 1. Player spawn must be walkable. The old pass flooded from a fallback
  // cell when reachable.size === 0 but left the player on wall/void.
  const liveSpawn = legalizePlayerSpawn(out, vt, playerSpawn, w, h);
  let reachable = floodFillReachable(out, vt, liveSpawn, w, h);

  if (reachable.size === 0) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = liveSpawn.x + dx;
        const ny = liveSpawn.y + dy;
        if (nx >= 0 && ny >= 0 && nx < w && ny < h && !vt.has(`${nx},${ny}`)) {
          out[ny][nx] = "floor";
        }
      }
    }
    reachable = floodFillReachable(out, vt, liveSpawn, w, h);
  }

  // 2. For each enemy spawn not reachable, carve or relocate. Occupied
  // cells (player, portal, already-placed hostiles, other exits) are
  // avoided so two isolated pockets do not collapse onto one tile or
  // land on an exit.
  const occupied = new Set<string>([
    `${liveSpawn.x},${liveSpawn.y}`,
    `${portal.x},${portal.y}`,
    ...(portalExclude ?? []),
  ]);
  for (const s of outSpawns) {
    if (reachable.has(`${s.x},${s.y}`)) occupied.add(`${s.x},${s.y}`);
  }
  for (let i = 0; i < outSpawns.length; i++) {
    const sp = outSpawns[i];
    const key = `${sp.x},${sp.y}`;
    if (reachable.has(key)) continue;
    // Try carving a minimal path to the reachable set.
    const carve = bfsCarvePath(out, vt, sp, reachable, w, h);
    if (carve !== null && carve.length <= 6) {
      for (const c of carve) {
        if ((out[c.y]?.[c.x] as string) === "wall") {
          out[c.y][c.x] = "floor";
          reachable.add(`${c.x},${c.y}`);
        }
      }
      // Re-flood from the (legal) player spawn to expand the reachable set
      // through the newly opened corridor.
      reachable = floodFillReachable(out, vt, liveSpawn, w, h);
      if (!reachable.has(`${sp.x},${sp.y}`)) {
        // Carving didn't connect (e.g. spawn sits in a void pocket). Relocate.
        const near = claimUniqueReachableCell(
          out,
          vt,
          sp,
          reachable,
          occupied,
          w,
          h,
        );
        if (near) {
          occupied.delete(key);
          outSpawns[i] = near;
          occupied.add(`${near.x},${near.y}`);
        }
      } else {
        occupied.add(`${sp.x},${sp.y}`);
      }
    } else {
      // Carving impractical (too long or no path). Relocate to nearest
      // reachable cell that is not already taken; punch a wall if the
      // graph is too cramped to destack.
      const near = claimUniqueReachableCell(
        out,
        vt,
        sp,
        reachable,
        occupied,
        w,
        h,
      );
      if (near) {
        occupied.delete(key);
        outSpawns[i] = near;
        occupied.add(`${near.x},${near.y}`);
      }
    }
  }

  const reserved = new Set<string>([
    `${liveSpawn.x},${liveSpawn.y}`,
    `${portal.x},${portal.y}`,
    ...(portalExclude ?? []),
  ]);
  destackSpawns(out, vt, outSpawns, occupied, reserved, reachable, w, h);

  // 3. Guarantee the portal is reachable from the player spawn.
  let livePortal = { x: portal.x, y: portal.y };
  const portalKey = `${livePortal.x},${livePortal.y}`;
  if (!reachable.has(portalKey)) {
    const carve = bfsCarvePath(out, vt, livePortal, reachable, w, h);
    if (carve !== null && carve.length <= 8) {
      for (const c of carve) {
        if ((out[c.y]?.[c.x] as string) === "wall") {
          out[c.y][c.x] = "floor";
          reachable.add(`${c.x},${c.y}`);
        }
      }
      reachable = floodFillReachable(out, vt, liveSpawn, w, h);
    }
    // If the portal still isn't reachable, carve a 3x3 clearing around it as a
    // last resort (the portal must always be reachable — player progression
    // depends on it).
    if (!reachable.has(`${livePortal.x},${livePortal.y}`)) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = livePortal.x + dx;
          const ny = livePortal.y + dy;
          if (
            nx >= 0 &&
            ny >= 0 &&
            nx < w &&
            ny < h &&
            !vt.has(`${nx},${ny}`)
          ) {
            if ((out[ny]?.[nx] as string) === "wall") {
              out[ny][nx] = "floor";
            }
          }
        }
      }
      reachable = floodFillReachable(out, vt, liveSpawn, w, h);
    }
    // Void pockets and carve-cap (>8 walls) used to leave the portal
    // isolated. Relocate onto the player's walkable graph.
    if (!reachable.has(`${livePortal.x},${livePortal.y}`)) {
      livePortal = relocatePortalOntoReachable(
        out,
        vt,
        livePortal,
        reachable,
        liveSpawn,
        w,
        h,
        new Set([...(portalExclude ?? []), ...occupied]),
      );
      reachable = floodFillReachable(out, vt, liveSpawn, w, h);
    }
  }

  reserved.add(`${livePortal.x},${livePortal.y}`);
  destackSpawns(out, vt, outSpawns, occupied, reserved, reachable, w, h);

  return {
    tiles: out,
    spawns: outSpawns,
    playerSpawn: liveSpawn,
    portal: livePortal,
  };
}

/**
 * Preferred Boss Rush overworld cells. `spawnBossRushRoom` used to drop
 * bosses here with no walkability check. WORLD_GRID_SIZE is 16 (center 8);
 * the generator only floors the center 7×7 (x/y 5–11), so (4,5) stays a
 * CA/void cell. Battle starts only when the player steps onto the enemy,
 * and walls/void are unwalkable — an isolated boss seals the progression
 * portal. Flee is the death penalty (20% XP / 40% Doka).
 */
export const BOSS_RUSH_PREFERRED_CELLS = [
  { x: 4, y: 5 },
  { x: 6, y: 5 },
] as const;

/**
 * Relocate or carve so hardcoded Boss Rush spawns are walk-reachable from
 * the player. Same contract as the main portal `ensureReachability` pass.
 * When no progression portal exists, the player spawn is used as the gate
 * so wall/void bosses still move onto the walkable graph.
 */
export function placeBossRushSpawns(
  tiles: string[][],
  voidTiles: Set<string> | undefined,
  preferred: { x: number; y: number }[],
  playerSpawn: { x: number; y: number },
  portal: { x: number; y: number } | undefined,
  w: number,
  h: number,
): {
  tiles: string[][];
  spawns: { x: number; y: number }[];
  playerSpawn: { x: number; y: number };
  portal: { x: number; y: number };
} {
  if (preferred.length === 0) {
    return {
      tiles,
      spawns: [],
      playerSpawn,
      portal: portal ?? playerSpawn,
    };
  }
  return ensureReachability(
    tiles,
    toVoidSet(voidTiles),
    preferred,
    playerSpawn,
    portal ?? playerSpawn,
    w,
    h,
  );
}

/**
 * Rest-exit dungeon spawn (#91) called `generateEnemies` but skipped this
 * punch. Cellular-automata maps (corridorMaze 55% walls) leave isolated
 * floor pockets; an enemy there keeps `isProgressionLocked` true. Regular
 * portals are suppressed during a run, and flee is `_handlePlayerDeath`
 * (20% XP / 40% Doka). Same contract as the main portal path.
 */
export function punchRosterReachability<T extends { x: number; y: number }>(
  tiles: string[][],
  voidTiles: Set<string> | undefined,
  roster: T[],
  spawnPosition: { x: number; y: number },
  portal: { x: number; y: number } | undefined,
  worldW: number,
  worldH: number,
): { tiles: string[][]; roster: T[]; playerSpawn: { x: number; y: number } } {
  if (roster.length === 0) {
    return { tiles, roster, playerSpawn: spawnPosition };
  }
  // Missing portal used to no-op, leaving CA pocket hostiles that seal
  // isProgressionLocked. Gate through the player spawn like Boss Rush.
  const {
    tiles: nextTiles,
    spawns,
    playerSpawn,
  } = ensureReachability(
    tiles,
    toVoidSet(voidTiles),
    roster.map((e) => ({ x: e.x, y: e.y })),
    spawnPosition,
    portal ?? spawnPosition,
    worldW,
    worldH,
  );
  const nextRoster = roster.map((e, i) =>
    spawns[i] ? { ...e, x: spawns[i].x, y: spawns[i].y } : e,
  );
  return { tiles: nextTiles, roster: nextRoster, playerSpawn };
}

export interface PlayablePortal {
  x: number;
  y: number;
  [key: string]: unknown;
}

export interface FinalizePlayableInput<
  P extends { x: number; y: number } = PlayablePortal,
> {
  tiles: string[][];
  voidTiles?: Set<string> | Map<string, unknown>;
  playerSpawn: { x: number; y: number };
  portals: P[];
  spawns: { x: number; y: number }[];
  w: number;
  h: number;
  /** Default true — every intended playable map needs a reachable exit. */
  requireExit?: boolean;
}

export interface FinalizePlayableResult<
  P extends { x: number; y: number } = PlayablePortal,
> {
  tiles: string[][];
  playerSpawn: { x: number; y: number };
  portals: P[];
  portal: P | null;
  spawns: { x: number; y: number }[];
}

/**
 * Narrow post-generation correction: legalize spawn, guarantee an exit,
 * punch hostiles onto the walkable graph. Does not change archetype aesthetics.
 */
export function finalizePlayableLayout<P extends { x: number; y: number }>(
  input: FinalizePlayableInput<P>,
): FinalizePlayableResult<P> {
  const vt = toVoidSet(input.voidTiles);
  const tiles = input.tiles.map((row) => (row ? row.slice() : []));
  const liveSpawn = legalizePlayerSpawn(
    tiles,
    vt,
    input.playerSpawn,
    input.w,
    input.h,
  );
  const portals = input.portals.map((p) => ({ ...p }));
  const requireExit = input.requireExit !== false;

  let primary: { x: number; y: number } | null = portals[0] ?? null;
  if (requireExit && !primary) {
    const reachable = floodFillReachable(
      tiles,
      vt,
      liveSpawn,
      input.w,
      input.h,
    );
    const placed = pickProgressionPortalCell(
      tiles,
      vt,
      new Set([`${liveSpawn.x},${liveSpawn.y}`]),
      input.w,
      input.h,
      reachable,
    );
    if (placed) {
      tiles[placed.y][placed.x] = "portal";
      const added = { x: placed.x, y: placed.y } as P;
      portals.push(added);
      primary = added;
    } else {
      primary = liveSpawn;
    }
  }

  const punched = ensureReachability(
    tiles,
    vt,
    input.spawns,
    liveSpawn,
    primary ?? liveSpawn,
    input.w,
    input.h,
    new Set(portals.slice(1).map((p) => `${p.x},${p.y}`)),
  );

  if (portals[0] && punched.portal) {
    const p0 = portals[0];
    if (p0.x !== punched.portal.x || p0.y !== punched.portal.y) {
      if (punched.tiles[p0.y]?.[p0.x] === "portal") {
        punched.tiles[p0.y][p0.x] = "floor";
      }
      p0.x = punched.portal.x;
      p0.y = punched.portal.y;
    }
    if (punched.tiles[p0.y]) {
      punched.tiles[p0.y][p0.x] = "portal";
    }
  }

  let liveTiles = punched.tiles;
  let playerSpawn = punched.playerSpawn;
  let spawns = punched.spawns;

  // Punch every remaining exit — overworld dungeon/boss/rest portals used
  // to stay isolated because only portals[0] went through ensureReachability.
  for (let i = 1; i < portals.length; i++) {
    const extra = ensureReachability(
      liveTiles,
      vt,
      spawns,
      playerSpawn,
      portals[i],
      input.w,
      input.h,
      new Set(portals.filter((_, j) => j !== i).map((p) => `${p.x},${p.y}`)),
    );
    liveTiles = extra.tiles;
    playerSpawn = extra.playerSpawn;
    spawns = extra.spawns;
    if (
      extra.portal &&
      (portals[i].x !== extra.portal.x || portals[i].y !== extra.portal.y)
    ) {
      if (liveTiles[portals[i].y]?.[portals[i].x] === "portal") {
        liveTiles[portals[i].y][portals[i].x] = "floor";
      }
      portals[i].x = extra.portal.x;
      portals[i].y = extra.portal.y;
    }
    if (liveTiles[portals[i].y]) {
      liveTiles[portals[i].y][portals[i].x] = "portal";
    }
  }

  destackStackedPortals(
    liveTiles,
    vt,
    portals,
    playerSpawn,
    spawns,
    input.w,
    input.h,
  );

  const takenPortals = new Set(portals.map((p) => `${p.x},${p.y}`));
  const blockingExits = portals.filter((p) => !isWhitePortalFlag(p));
  const spawnOnExit = blockingExits.some(
    (p) => p.x === playerSpawn.x && p.y === playerSpawn.y,
  );
  if (spawnOnExit) {
    const reachable = floodFillReachable(
      liveTiles,
      vt,
      playerSpawn,
      input.w,
      input.h,
    );
    for (const k of reachable) {
      if (takenPortals.has(k)) continue;
      const p = k.split(",");
      playerSpawn = { x: Number(p[0]), y: Number(p[1]) };
      break;
    }
  }

  return {
    tiles: liveTiles,
    playerSpawn,
    portals,
    portal: portals[0] ?? null,
    spawns,
  };
}

/**
 * Prefer a border-adjacent floor on the player's reachable graph so a
 * walled-off ring cannot omit the run progression portal.
 */
export function pickProgressionPortalCell(
  tiles: string[][],
  voidTiles: Set<string>,
  used: Set<string>,
  w: number,
  h: number,
  reachable?: Set<string>,
): { x: number; y: number } | null {
  const candidates: { x: number; y: number; border: boolean }[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const k = `${x},${y}`;
      if (used.has(k)) continue;
      if (voidTiles.has(k)) continue;
      const t = tiles[y]?.[x] as string;
      if (t === "wall") continue;
      if (reachable && !reachable.has(k)) continue;
      const border = x <= 2 || y <= 2 || x >= w - 3 || y >= h - 3;
      candidates.push({ x, y, border });
    }
  }
  const border = candidates.find((c) => c.border);
  if (border) return { x: border.x, y: border.y };
  if (candidates[0]) return { x: candidates[0].x, y: candidates[0].y };
  return null;
}

export function pickLegalWhitePortalCell(
  tiles: string[][],
  voidTiles: Set<string> | Map<string, unknown> | undefined,
  spawn: { x: number; y: number },
  w: number,
  h: number,
): { x: number; y: number } {
  const vt = toVoidSet(voidTiles);
  if (isWalkable(tiles, vt, spawn.x, spawn.y, w, h)) return { ...spawn };
  return legalizePlayerSpawn(tiles, vt, spawn, w, h);
}

export interface SolvabilityReport {
  ok: boolean;
  playerSpawnLegal: boolean;
  enemiesReachable: boolean;
  portalReachable: boolean;
  isolatedEnemies: number;
  isolatedPortals: number;
  stackedEnemies: number;
  stackedPortals: number;
  enemiesOnPortal: number;
  failures: string[];
}

export function floodWalkable(
  tiles: string[][],
  voidTiles: Set<string>,
  start: { x: number; y: number },
  w: number,
  h: number,
): Set<string> {
  return floodFillReachable(tiles, voidTiles, start, w, h);
}

export function evaluateSolvability(
  tiles: string[][],
  voidTiles: Set<string> | Map<string, unknown> | undefined,
  playerSpawn: { x: number; y: number },
  portals: { x: number; y: number }[],
  spawns: { x: number; y: number }[],
  w: number,
  h: number,
  opts?: { allowSpawnOnPortal?: boolean },
): SolvabilityReport {
  const vt = toVoidSet(voidTiles);
  const failures: string[] = [];
  const playerSpawnLegal = isWalkable(
    tiles,
    vt,
    playerSpawn.x,
    playerSpawn.y,
    w,
    h,
  );
  if (!playerSpawnLegal) failures.push("player-spawn-illegal");
  const reachable = floodFillReachable(tiles, vt, playerSpawn, w, h);
  let isolatedEnemies = 0;
  for (const s of spawns) {
    if (!reachable.has(`${s.x},${s.y}`)) isolatedEnemies += 1;
  }
  const enemiesReachable = isolatedEnemies === 0;
  if (!enemiesReachable) {
    failures.push(`isolated-enemies:${isolatedEnemies}`);
  }
  let isolatedPortals = 0;
  for (const p of portals) {
    if (!reachable.has(`${p.x},${p.y}`)) isolatedPortals += 1;
  }
  const portalReachable = portals.length > 0 && isolatedPortals === 0;
  if (portals.length > 0 && isolatedPortals > 0) {
    failures.push(`isolated-portals:${isolatedPortals}`);
  }
  if (portals.length === 0) failures.push("missing-exit-portal");
  const occupancy = new Map<string, number>();
  for (const s of spawns) {
    const k = `${s.x},${s.y}`;
    occupancy.set(k, (occupancy.get(k) ?? 0) + 1);
  }
  let stackedEnemies = 0;
  for (const n of occupancy.values()) {
    if (n > 1) stackedEnemies += n - 1;
  }
  if (stackedEnemies > 0) failures.push(`stacked-enemies:${stackedEnemies}`);
  const portalKeys = new Set(portals.map((p) => `${p.x},${p.y}`));
  let stackedPortals = 0;
  if (portals.length > portalKeys.size) {
    stackedPortals = portals.length - portalKeys.size;
    failures.push(`stacked-portals:${stackedPortals}`);
  }
  let enemiesOnPortal = 0;
  for (const s of spawns) {
    if (portalKeys.has(`${s.x},${s.y}`)) enemiesOnPortal += 1;
  }
  if (enemiesOnPortal > 0) {
    failures.push(`enemies-on-portal:${enemiesOnPortal}`);
  }
  if (
    !opts?.allowSpawnOnPortal &&
    playerSpawnLegal &&
    portals.some(
      (p) =>
        p.x === playerSpawn.x && p.y === playerSpawn.y && !isWhitePortalFlag(p),
    ) &&
    reachable.size > 1
  ) {
    // Standing on an exit is legal walkability but skips the room if the
    // portal is unlocked. Flag it so finalize can keep spawn off the exit
    // when another floor cell exists. White sanctuary gateways colocated
    // with spawn are intentional.
    failures.push("spawn-on-portal");
  }
  return {
    ok: failures.length === 0,
    playerSpawnLegal,
    enemiesReachable,
    portalReachable,
    isolatedEnemies,
    isolatedPortals,
    stackedEnemies,
    stackedPortals,
    enemiesOnPortal,
    failures,
  };
}

/**
 * Drop leftover CA voids after generation exhausts attempts. An all-floor
 * fallback that keeps the last attempt's voids can isolate spawn / exits.
 */
export function resetFailedGenerationVoids(
  voidTiles: Set<string> | Map<string, unknown>,
): void {
  voidTiles.clear();
}

/** Mark portal coordinates on the tile grid so pathing and occupancy agree. */
export function stampPortalTiles<P extends { x: number; y: number }>(
  tiles: string[][],
  portals: P[],
): void {
  for (const p of portals) {
    if (tiles[p.y]) tiles[p.y][p.x] = "portal";
  }
}

function colocateWhitePortal<P extends { x: number; y: number }>(
  map: { tiles: string[][]; portals: P[] },
  spawn: { x: number; y: number },
  whitePortal: P,
): void {
  const placed: P = { ...whitePortal, x: spawn.x, y: spawn.y };
  const existing = map.portals.findIndex(
    (p) => (p as { isWhitePortal?: boolean }).isWhitePortal,
  );
  if (existing >= 0) map.portals[existing] = placed;
  else map.portals.push(placed);
  stampPortalTiles(map.tiles as string[][], map.portals);
}

/**
 * Sanctuary / white-portal maps skipped finalize. Legalize the overworld
 * first, then colocate the white gateway with the (legal) spawn.
 */
export function applySanctuaryLayout<P extends { x: number; y: number }>(
  map: { tiles: string[][]; portals: P[]; voidTiles?: unknown },
  spawn: { x: number; y: number },
  size: number,
  whitePortal: P,
): { spawn: { x: number; y: number } } {
  const applied = applyFinalizedLayout(map, [], spawn, size);
  colocateWhitePortal(map, applied.spawn, whitePortal);
  return { spawn: applied.spawn };
}

/**
 * Dungeon-chain completion used to pin the white gateway to the
 * pre-finalize spawn, then applyFinalizedLayout moved the player off
 * portals[0] and left the sanctuary tile behind.
 *
 * Legalize spawn + roster first, then colocate — same contract as
 * applySanctuaryLayout, but keep enemy placement.
 */
export function attachWhitePortalAfterLegalize<
  T extends { x: number; y: number },
  P extends { x: number; y: number },
>(
  map: { tiles: string[][]; portals: P[]; voidTiles?: unknown },
  roster: T[],
  spawn: { x: number; y: number },
  size: number,
  whitePortal: P,
): { spawn: { x: number; y: number }; roster: T[] } {
  const applied = applyFinalizedLayout(map, roster, spawn, size);
  colocateWhitePortal(map, applied.spawn, whitePortal);
  return applied;
}

/**
 * Apply finalize onto a live map + roster. Call after generateEnemies /
 * Boss Rush preferred cells / rest-exit so cleanup sequencing still sees
 * reachable hostiles and a reachable exit.
 */
export function applyFinalizedLayout<
  T extends { x: number; y: number },
  P extends { x: number; y: number },
>(
  map: { tiles: string[][]; portals: P[]; voidTiles?: unknown },
  roster: T[],
  spawn: { x: number; y: number },
  size: number,
): { spawn: { x: number; y: number }; roster: T[] } {
  const finalized = finalizePlayableLayout({
    tiles: map.tiles,
    voidTiles: toVoidSet(
      map.voidTiles as Set<string> | Map<string, unknown> | undefined,
    ),
    playerSpawn: spawn,
    portals: map.portals,
    spawns: roster.map((e) => ({ x: e.x, y: e.y })),
    w: size,
    h: size,
    requireExit: true,
  });
  map.tiles = finalized.tiles as typeof map.tiles;
  if (finalized.portals.length > 0) {
    if (map.portals.length === 0) {
      map.portals.push(...(finalized.portals as P[]));
    } else {
      for (
        let i = 0;
        i < Math.min(map.portals.length, finalized.portals.length);
        i++
      ) {
        map.portals[i].x = finalized.portals[i].x;
        map.portals[i].y = finalized.portals[i].y;
      }
    }
  }
  const nextRoster = roster.map((e, i) =>
    finalized.spawns[i]
      ? { ...e, x: finalized.spawns[i].x, y: finalized.spawns[i].y }
      : e,
  );
  return { spawn: finalized.playerSpawn, roster: nextRoster };
}
