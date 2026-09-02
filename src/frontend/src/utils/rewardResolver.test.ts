import {
  computeVictoryExp,
  selectDefeatedEnemiesForRewards,
} from "./rewardResolver.ts";

function assertEqual(actual: number, expected: number, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

assertEqual(
  computeVictoryExp({
    explicitGrant: 0,
    defeatedEnemies: [
      { name: "a", level: 3 },
      { name: "b", level: 5 },
    ],
    characterLevel: 4,
  }),
  160,
  "derive from kills when explicitGrant is 0",
);
assertEqual(
  computeVictoryExp({
    defeatedEnemies: [{ name: "a", level: 2 }],
    characterLevel: 4,
  }),
  40,
  "derive from kills when explicitGrant is omitted",
);
assertEqual(
  computeVictoryExp({
    explicitGrant: 90,
    defeatedEnemies: [{ name: "a", level: 2 }],
    characterLevel: 4,
  }),
  90,
  "prefer explicit positive grant",
);
assertEqual(
  computeVictoryExp({
    explicitGrant: 0,
    defeatedEnemies: [],
    characterLevel: 7,
  }),
  140,
  "fallback to characterLevel * 20",
);

const attributed = selectDefeatedEnemiesForRewards(
  [],
  [
    { pieceType: "wraith", level: 4 },
    { name: "golem", level: 6 },
  ],
);
if (
  attributed.length !== 2 ||
  attributed[0].name !== "wraith" ||
  attributed[0].level !== 4 ||
  attributed[1].name !== "golem" ||
  attributed[1].level !== 6
) {
  throw new Error(
    `selectDefeatedEnemiesForRewards should prefer attributed roster, got ${JSON.stringify(attributed)}`,
  );
}

const passedFallback = selectDefeatedEnemiesForRewards(
  [{ name: "fallback", level: 2 }],
  [],
);
if (
  passedFallback.length !== 1 ||
  passedFallback[0].name !== "fallback" ||
  passedFallback[0].level !== 2
) {
  throw new Error(
    `selectDefeatedEnemiesForRewards should fall back to passed list, got ${JSON.stringify(passedFallback)}`,
  );
}

const emptyBoth = selectDefeatedEnemiesForRewards(undefined, []);
if (emptyBoth.length !== 0) {
  throw new Error("empty attributed + omitted passed should be []");
}

const alliedDropped = selectDefeatedEnemiesForRewards(
  [],
  [
    { pieceType: "rat", level: 3, side: "enemy" },
    { pieceType: "wolf", level: 5, isSummon: true, side: "player" },
    { pieceType: "larva", level: 2, isSummon: true, side: "enemy" },
  ],
);
if (
  alliedDropped.length !== 2 ||
  alliedDropped[0].name !== "rat" ||
  alliedDropped[1].name !== "larva"
) {
  throw new Error(
    `player-side summons must not count as defeated enemies, got ${JSON.stringify(alliedDropped)}`,
  );
}

console.log("computeVictoryExp tests passed");
