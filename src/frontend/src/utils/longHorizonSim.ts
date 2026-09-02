/**
 * Long-Horizon Infinite Progression Simulator — observation harness.
 *
 * Reuses live formulas. Does not change combat, XP, or spawn math.
 * Run: node --experimental-strip-types src/frontend/src/utils/longHorizonSim.ts
 */

import {
  ENEMY_SUMMONER_CHANCE_BASE,
  ENEMY_SUMMONER_CHANCE_PER_LEVEL_ZONE,
  PLAYER_BASE_AP,
  PLAYER_BASE_MP,
} from "../data/gameConstants.ts";
import { starterSpells } from "../data/spellData.ts";
import {
  computeAITier,
  pickEnemyLevelFromTiers,
} from "../engine/combatMath.ts";
import { dungeonDokaMultiplierFor } from "../engine/portalRules.ts";
import {
  BOSS_LEVEL_DIFF_STEP,
  getBossEffectiveStats,
  getEnemyBaseStats,
  getPlayerBaseStats,
} from "../engine/progression.ts";
import type { ChessPieceType } from "../types/gameTypes.ts";
import { DEFAULT_LEVELUP_CONFIG } from "../types/gameTypes.ts";
import { applyXpDelta, xpForNextLevel } from "./xpCurve.ts";

/** Mirrors rewardResolver.computeVictoryExp — kept local so Node can run this file. */
function computeVictoryExp(input: {
  defeatedEnemies: Array<{ name: string; level: number }>;
  characterLevel: number;
}): number {
  if (input.defeatedEnemies.length > 0) {
    return input.defeatedEnemies.reduce(
      (sum, enemy) => sum + enemy.level * 20,
      0,
    );
  }
  return input.characterLevel * 20;
}

/**
 * Mirrors enemyAI.ENEMY_KITS / buildEnemyKit. The live call site passes a
 * LevelZone object (`currentMap.levelZone: any`); Math.floor(object) is NaN.
 */
function buildEnemyKit(
  pieceType: ChessPieceType,
  levelZone: unknown,
): string[] {
  const z = Math.max(0, Math.floor(levelZone as number));
  const kits: Record<ChessPieceType, (zone: number) => string[]> = {
    pawn: (zone) =>
      zone >= 1
        ? ["physical_attack", "spell-venom-strike"]
        : ["physical_attack"],
    knight: () => ["physical_attack"],
    bishop: (zone) =>
      zone >= 1 ? ["starter-frost", "starter-poison"] : ["starter-frost"],
    rook: (zone) =>
      zone >= 1 ? ["physical_attack", "spell-iron-skin"] : ["physical_attack"],
    queen: (zone) => {
      const nuke = zone >= 2 ? "spell-inferno" : "starter-frost";
      return zone >= 1 ? [nuke, "starter-heal"] : [nuke];
    },
    king: (zone) => {
      const nuke = zone >= 2 ? "spell-inferno" : "starter-frost";
      return zone >= 1 ? [nuke, "spell-rallying-cry"] : [nuke];
    },
  };
  return (kits[pieceType] ?? kits.pawn)(z);
}

export const STRESS_LEVELS = [
  1, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 1018, 1019,
] as const;

const GROWTH = (DEFAULT_LEVELUP_CONFIG.statGrowthPercent ?? 5) / 100;
const AP_EVERY = DEFAULT_LEVELUP_CONFIG.apMpGrowthEveryNLevels ?? 25;
const PIECES: ChessPieceType[] = [
  "pawn",
  "rook",
  "knight",
  "bishop",
  "queen",
  "king",
];

export function linearPlayerMaxHp(level: number): number {
  return Math.floor(100 * (1 + (Math.max(1, level) - 1) * GROWTH));
}

export function linearEnemyMaxHp(level: number): number {
  return Math.floor(50 * (1 + (Math.max(1, level) - 1) * GROWTH));
}

export function spawnPlaceholderHp(level: number): number {
  return Math.max(1, Math.round(level * 8 + 20));
}

export function spawnPlaceholderDamage(level: number): number {
  return Math.max(1, Math.round(level * 2 + 3));
}

export function victoryHpFloor(level: number): number {
  return 50 + Math.max(1, level) * 10;
}

export function respawnHp(level: number): number {
  return Math.max(1, Math.floor(linearPlayerMaxHp(level) * 0.5));
}

export function formulaAp(level: number): number {
  return Math.max(
    PLAYER_BASE_AP,
    PLAYER_BASE_AP + Math.floor(level / AP_EVERY),
  );
}

export function formulaMp(level: number): number {
  return Math.max(
    PLAYER_BASE_MP,
    PLAYER_BASE_MP + Math.floor(level / AP_EVERY),
  );
}

export function updateCharacterMaxHpAllowed(level: number): number {
  return level * 200 + 100;
}

export function spellFailChance(level: number): number {
  return Math.max(
    0,
    DEFAULT_LEVELUP_CONFIG.spellFailBaseChance -
      (level - 1) * DEFAULT_LEVELUP_CONFIG.spellFailReductionPerLevel,
  );
}

export function summonerChance(playerLevel: number): number {
  return (
    ENEMY_SUMMONER_CHANCE_BASE +
    playerLevel * ENEMY_SUMMONER_CHANCE_PER_LEVEL_ZONE
  );
}

/** Cumulative XP to *reach* `level` from 1 (leftover 0). */
export function cumulativeXpToReach(level: number): number {
  if (level <= 1) return 0;
  let total = 0;
  for (let n = 1; n < level; n++) {
    const need = xpForNextLevel(n);
    if (!Number.isFinite(need)) return Number.POSITIVE_INFINITY;
    total += need;
    if (!Number.isFinite(total)) return Number.POSITIVE_INFINITY;
  }
  return total;
}

export function fightsToNextLevel(
  level: number,
  meanEnemyLevel: number,
  enemiesPerFight = 3,
): number {
  const need = xpForNextLevel(level);
  if (!Number.isFinite(need)) return Number.POSITIVE_INFINITY;
  const perFight = computeVictoryExp({
    defeatedEnemies: Array.from({ length: enemiesPerFight }, () => ({
      name: "sim",
      level: Math.max(1, Math.round(meanEnemyLevel)),
    })),
    characterLevel: level,
  });
  if (perFight <= 0) return Number.POSITIVE_INFINITY;
  return need / perFight;
}

export function enemyStatBounds(level: number, piece: ChessPieceType) {
  const mult: Record<
    ChessPieceType,
    { sp: number; sr: number; init: number; res: number; chc: number }
  > = {
    pawn: { sp: 0.85, sr: 0.85, init: 0.85, res: 0.85, chc: 0.85 },
    rook: { sp: 0.8, sr: 1.2, init: 1.1, res: 1.35, chc: 0.7 },
    knight: { sp: 0.85, sr: 1.15, init: 1.2, res: 1.25, chc: 0.8 },
    bishop: { sp: 1.3, sr: 0.85, init: 1.0, res: 0.7, chc: 1.2 },
    queen: { sp: 1.25, sr: 0.9, init: 1.1, res: 0.75, chc: 1.15 },
    king: { sp: 1.0, sr: 1.0, init: 1.0, res: 1.0, chc: 1.0 },
  };
  const m = mult[piece];
  const base = Math.max(1, level);
  const bound = (min: number, max: number, k: number) => ({
    min: Math.max(1, Math.round(min * k)),
    max: Math.max(1, Math.round(max * k)),
  });
  return {
    sp: bound(3, 6 + base * 1.2, m.sp),
    sr: bound(2, 4 + base * 1.0, m.sr),
    res: bound(2, 4 + base * 0.9, m.res),
    init: bound(3, 6 + base * 1.2, m.init),
    chc: bound(1, 3 + base * 0.7, m.chc),
  };
}

export function firstLevelResCanHit100(piece: ChessPieceType): number | null {
  for (let level = 1; level <= 400; level++) {
    if (enemyStatBounds(level, piece).res.max >= 100) return level;
  }
  return null;
}

export function firstLevelSrCanHit100(piece: ChessPieceType): number | null {
  for (let level = 1; level <= 400; level++) {
    if (enemyStatBounds(level, piece).sr.max >= 100) return level;
  }
  return null;
}

export function kitForZoneInput(
  piece: ChessPieceType,
  zone: unknown,
): string[] {
  return buildEnemyKit(piece, zone as number);
}

export function monteCarloEnemyLevels(
  playerLevel: number,
  samples = 4000,
): {
  min: number;
  max: number;
  mean: number;
  pBelow: number;
  pEqualBand: number;
  pAbove: number;
  histogramMax: number;
} {
  let min = Number.POSITIVE_INFINITY;
  let max = 0;
  let sum = 0;
  let below = 0;
  let above = 0;
  let equal = 0;
  const ts = 10;
  const playerTier = Math.floor((playerLevel - 1) / ts);
  for (let i = 0; i < samples; i++) {
    const lvl = pickEnemyLevelFromTiers(playerLevel);
    min = Math.min(min, lvl);
    max = Math.max(max, lvl);
    sum += lvl;
    const enemyTier = Math.floor((lvl - 1) / ts);
    if (enemyTier < playerTier) below += 1;
    else if (enemyTier > playerTier) above += 1;
    else equal += 1;
  }
  return {
    min,
    max,
    mean: sum / samples,
    pBelow: below / samples,
    pEqualBand: equal / samples,
    pAbove: above / samples,
    histogramMax: max,
  };
}

export function monteCarloAiTiers(
  enemyLevel: number,
  samples = 4000,
): {
  mean: number;
  pMax: number;
  pMin: number;
  pBetrayalEligible: number;
  pErraticEligible: number;
} {
  let sum = 0;
  let pMax = 0;
  let pMin = 0;
  let betrayal = 0;
  let erratic = 0;
  for (let i = 0; i < samples; i++) {
    const t = computeAITier(enemyLevel);
    sum += t;
    if (t >= 10) pMax += 1;
    if (t <= 1) pMin += 1;
    if (t >= 10) betrayal += 1;
    if (t >= 5) erratic += 1;
  }
  return {
    mean: sum / samples,
    pMax: pMax / samples,
    pMin: pMin / samples,
    pBetrayalEligible: betrayal / samples,
    pErraticEligible: erratic / samples,
  };
}

function ensureLocalStorage(): void {
  if (typeof globalThis.localStorage !== "undefined") return;
  const mem = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => {
      mem.set(k, String(v));
    },
    removeItem: (k: string) => {
      mem.delete(k);
    },
    clear: () => mem.clear(),
    key: (i: number) => [...mem.keys()][i] ?? null,
    get length() {
      return mem.size;
    },
  } as Storage;
}

export function runLongHorizonSim() {
  ensureLocalStorage();

  const xpRows = STRESS_LEVELS.map((level) => {
    const need = xpForNextLevel(level);
    const dist = Number.isFinite(level) ? monteCarloEnemyLevels(level) : null;
    const meanEnemy = dist?.mean ?? level;
    return {
      level,
      xpToNext: need,
      xpToNextIsFinite: Number.isFinite(need),
      cumulativeXp: cumulativeXpToReach(level),
      linearPlayerHp: linearPlayerMaxHp(level),
      exponentialPlayerHp: getPlayerBaseStats(level, DEFAULT_LEVELUP_CONFIG).hp,
      formulaAp: formulaAp(level),
      formulaMp: formulaMp(level),
      persistApExceeds20: formulaAp(level) > 20,
      maxHpAllowed: updateCharacterMaxHpAllowed(level),
      enemyHpLive: linearEnemyMaxHp(level),
      enemyHpSpawnPlaceholder: spawnPlaceholderHp(level),
      enemyMeleePlaceholder: spawnPlaceholderDamage(level),
      victoryHpFloor: victoryHpFloor(level),
      victoryFloorExceedsMax: victoryHpFloor(level) > linearPlayerMaxHp(level),
      respawnHp: respawnHp(level),
      spellFail: spellFailChance(level),
      summonerChance: Math.min(1, summonerChance(level)),
      challengeUnder30ImpossibleIfHit: spawnPlaceholderDamage(level) > 30,
      challengeUnder50ImpossibleIfHit: spawnPlaceholderDamage(level) > 50,
      meanEnemyLevel: dist?.mean ?? null,
      enemyLevelMin: dist?.min ?? null,
      enemyLevelMax: dist?.max ?? null,
      pBelowTier: dist?.pBelow ?? null,
      pSameTier: dist?.pEqualBand ?? null,
      pAboveTier: dist?.pAbove ?? null,
      fightsToNext: dist ? fightsToNextLevel(level, dist.mean) : null,
      typicalVictoryXp: computeVictoryExp({
        defeatedEnemies: [
          { name: "a", level: Math.round(meanEnemy) },
          { name: "b", level: Math.round(meanEnemy) },
          { name: "c", level: Math.round(meanEnemy) },
        ],
        characterLevel: level,
      }),
    };
  });

  const aiRows = [1, 10, 31, 61, 101, 151, 251, 401, 601, 901, 1000].map(
    (enemyLevel) => ({
      enemyLevel,
      ...monteCarloAiTiers(enemyLevel),
    }),
  );

  const resBreakpoints = Object.fromEntries(
    PIECES.map((p) => [p, firstLevelResCanHit100(p)]),
  );
  const srBreakpoints = Object.fromEntries(
    PIECES.map((p) => [p, firstLevelSrCanHit100(p)]),
  );

  const sampleStats = getEnemyBaseStats(80, "rook", "sim-rook-80");

  const kitsNumeric = Object.fromEntries(
    PIECES.map((p) => [
      p,
      {
        z0: kitForZoneInput(p, 0),
        z1: kitForZoneInput(p, 1),
        z2: kitForZoneInput(p, 2),
      },
    ]),
  );
  const liveZoneObject = {
    name: "Tier 25 Zone",
    minLevel: 241,
    maxLevel: 250,
  };
  const kitsLiveCallSite = Object.fromEntries(
    PIECES.map((p) => [p, kitForZoneInput(p, liveZoneObject)]),
  );

  const bossBase = {
    hp: 350,
    ap: 6,
    mp: 4,
    atk: 35,
    res: 12,
    init: 8,
    sp: 10,
    chc: 5,
  };
  const bossGuideVsCombat = STRESS_LEVELS.filter((l) => l <= 2500).map(
    (playerLevel) => {
      const bossLevel = playerLevel + 5;
      const guide = getBossEffectiveStats(bossBase, playerLevel, bossLevel);
      return {
        playerLevel,
        bossLevel,
        combatHp: bossBase.hp,
        combatResClamped: Math.min(50, bossBase.res),
        guideHp: guide.hp,
        guideMult: BOSS_LEVEL_DIFF_STEP ** 5,
      };
    },
  );

  const applyXpInfinity = applyXpDelta(0, 1018, 1);
  const applyXpAt1019 = {
    threshold: xpForNextLevel(1019),
    canLevel: 1e308 >= xpForNextLevel(1019),
  };

  return {
    generatedAt: "2026-08-31T00:03:15.838Z",
    telemetry: {
      available: false,
      reason:
        "No backend-authoritative player-level / encounter / discovery series exists (AQA-2026-08-30-012). Calibration skipped; synthetic only.",
    },
    catalog: {
      starterSpellCount: starterSpells.length,
      allSpellsAreStarter: true,
    },
    dungeonMultiplierAtDepth5: dungeonDokaMultiplierFor(true, 5),
    xpRows,
    aiRows,
    resBreakpoints,
    srBreakpoints,
    sampleRookStatsAt80: sampleStats,
    kitsNumeric,
    kitsLiveCallSite,
    bossGuideVsCombat,
    applyXpInfinity,
    applyXpAt1019,
    updateCharacterApCap: 20,
    saveBattleStatsLevelUnconstrained: true,
  };
}

const isMain =
  typeof process !== "undefined" &&
  process.argv[1] &&
  process.argv[1].includes("longHorizonSim.ts");

if (isMain) {
  const report = runLongHorizonSim();
  console.log(JSON.stringify(report, null, 2));
}
