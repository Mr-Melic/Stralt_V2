import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { punchRosterReachability } from "./mapGen.ts";

function flood(
  tiles: string[][],
  start: { x: number; y: number },
): Set<string> {
  const h = tiles.length;
  const w = tiles[0]?.length ?? 0;
  const seen = new Set<string>();
  const walkable = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < w && y < h && tiles[y][x] !== "wall";
  if (!walkable(start.x, start.y)) return seen;
  const q = [start];
  seen.add(`${start.x},${start.y}`);
  while (q.length > 0) {
    const cur = q.shift()!;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      const k = `${nx},${ny}`;
      if (seen.has(k) || !walkable(nx, ny)) continue;
      seen.add(k);
      q.push({ x: nx, y: ny });
    }
  }
  return seen;
}

describe("punchRosterReachability (rest-exit)", () => {
  it("relocates or carves so an isolated rest-exit spawn cannot seal the portal", () => {
    // CA leftover: player/portal room, plus a 1-tile pocket the player
    // cannot walk to. #91 spawned there and skipped this punch.
    const W = "wall";
    const F = "floor";
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
    const spawn = { x: 1, y: 1 };
    const portal = { x: 2, y: 1 };
    const isolated = { id: "rat", x: 5, y: 5 };
    assert.equal(
      flood(tiles, spawn).has("5,5"),
      false,
      "fixture must start unreachable",
    );

    const punched = punchRosterReachability(
      tiles,
      new Set(),
      [isolated],
      spawn,
      portal,
      8,
      8,
    );
    const reachable = flood(punched.tiles, spawn);
    const enemy = punched.roster[0];
    assert.equal(
      reachable.has(`${enemy.x},${enemy.y}`),
      true,
      "rest-exit hostiles must be walk-reachable or the progression portal stays sealed",
    );
  });

  it("still punches when the exit portal is missing so hostiles cannot stay isolated", () => {
    const W = "wall";
    const F = "floor";
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
    const punched = punchRosterReachability(
      tiles,
      new Set(),
      [{ id: "rat", x: 5, y: 5 }],
      { x: 1, y: 1 },
      undefined,
      8,
      8,
    );
    const reachable = flood(punched.tiles, { x: 1, y: 1 });
    const enemy = punched.roster[0];
    assert.equal(reachable.has(`${enemy.x},${enemy.y}`), true);
  });

  it("is a no-op when the rest-exit roster is empty", () => {
    const tiles = [
      ["floor", "floor"],
      ["floor", "wall"],
    ];
    const punched = punchRosterReachability(
      tiles,
      undefined,
      [],
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      2,
      2,
    );
    assert.equal(punched.roster.length, 0);
    assert.equal(punched.tiles[1][1], "wall");
  });
});
