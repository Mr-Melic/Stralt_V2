/**
 * useBossSystem.ts — Boss encounter state management and ability logic.
 *
 * All functions are PURE (no direct state mutation). They receive refs/setters
 * as parameters and return new data. WorldExploration.tsx applies the results
 * via its own flushSync block.
 *
 * Follows the same timer tracking pattern used in the main game file:
 *   const id = setTimeout(fn, ms);
 *   pendingTimeoutsRef.current.add(id);
 */

import type React from "react";
import {
  BossAbility,
  type BossAbilityParams,
  type BossAbilityResult,
  type BossConfig,
  type BossState,
  type CombatantEntryLike,
  type DebuffData,
  type DoTData,
  type IllusionData,
  type LarvaData,
  type ShockTile,
  type SpawnData,
  makeFreshBossState,
} from "../types/bossTypes";
import type { ChessPieceType } from "../types/gameTypes";

// ── Utility helpers ─────────────────────────────────────────────────────────────────

function getAdjacentTiles(
  x: number,
  y: number,
  allTiles: boolean[][],
  occupied: Array<{ x: number; y: number }> = [],
): Array<{ x: number; y: number }> {
  const dirs = [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ];
  return dirs
    .map(([dx, dy]) => ({ x: x + dx, y: y + dy }))
    .filter(
      (pos) =>
        pos.x >= 0 &&
        pos.x < 16 &&
        pos.y >= 0 &&
        pos.y < 16 &&
        allTiles[pos.y]?.[pos.x] &&
        !occupied.some((o) => o.x === pos.x && o.y === pos.y),
    );
}

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function manhattanDistance(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function getKnightMoves(
  x: number,
  y: number,
  allTiles: boolean[][],
  ignoreWalls: boolean,
): Array<{ x: number; y: number }> {
  const offsets = [
    [-2, -1],
    [-2, 1],
    [2, -1],
    [2, 1],
    [-1, -2],
    [1, -2],
    [-1, 2],
    [1, 2],
  ];
  return offsets
    .map(([dx, dy]) => ({ x: x + dx, y: y + dy }))
    .filter(
      (pos) =>
        pos.x >= 0 &&
        pos.x < 16 &&
        pos.y >= 0 &&
        pos.y < 16 &&
        (ignoreWalls || allTiles[pos.y]?.[pos.x]),
    );
}

function getQueenRayTargets(
  x: number,
  y: number,
  allTiles: boolean[][],
  combatants: CombatantEntryLike[],
): CombatantEntryLike[] {
  const dirs = [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ];
  const targets: CombatantEntryLike[] = [];
  for (const [dx, dy] of dirs) {
    let cx = x + dx;
    let cy = y + dy;
    while (cx >= 0 && cx < 16 && cy >= 0 && cy < 16) {
      if (!allTiles[cy]?.[cx]) break; // wall stops ray
      const hit = combatants.find((c) => c.x === cx && c.y === cy);
      if (hit) {
        targets.push(hit);
        break; // ray stops at first combatant
      }
      cx += dx;
      cy += dy;
    }
  }
  return targets;
}

function makeMinionSpawn(
  parentBossId: string,
  x: number,
  y: number,
  index: number,
): SpawnData {
  return {
    id: `minion_${parentBossId}_${Date.now()}_${index}`,
    x,
    y,
    pieceType: "pawn" as ChessPieceType,
    hp: 20,
    maxHp: 20,
    ap: 3,
    atk: 8,
    res: 2,
    init: 5,
    isBossMinion: true,
    parentBossId,
  };
}

// ── initBossState ──────────────────────────────────────────────────────────────────

export function initBossState(bossId: string, _config: BossConfig): BossState {
  return makeFreshBossState(bossId);
}

// ── checkPhaseTransition ───────────────────────────────────────────────────────

/**
 * Pure function. Called each turn to check whether the boss HP has crossed
 * the Phase 2 threshold. When it does, returns a new BossState with
 * phase2Triggered = true and an updated currentPhase. Returns the unchanged
 * state if no transition occurred.
 *
 * The caller is responsible for applying the stat multiplier from
 * config.phase2.statMultiplier to the boss's live CombatantEntry.
 */
export function checkPhaseTransition(
  bossEntry: CombatantEntryLike,
  bossState: BossState,
  config: BossConfig,
): { transitioned: boolean; newState: BossState } {
  // Already in phase 2 — nothing to do.
  if (bossState.phase2Triggered) {
    return { transitioned: false, newState: bossState };
  }

  const hpFraction = bossEntry.hp / Math.max(bossEntry.maxHp, 1);
  if (hpFraction <= config.phase2.hpThreshold) {
    return {
      transitioned: true,
      newState: (() => {
        const s = {
          ...bossState,
          currentPhase: 2 as 1 | 2,
          phase2Triggered: true,
        };
        // C4 FIX: Scale illusion HP to match phase 2 stat multiplier
        if (s.illusions && s.illusions.length > 0) {
          const mult = config.phase2?.statMultiplier ?? 1;
          s.illusions = s.illusions.map((ill: IllusionData) => ({
            ...ill,
            hp: Math.round((ill.hp ?? 1) * mult),
            maxHp: Math.round((ill.maxHp ?? ill.hp ?? 1) * mult),
          }));
        }
        return s;
      })(),
    };
  }
  return { transitioned: false, newState: bossState };
}

// ── Individual ability handlers (pure) ────────────────────────────────────

function applyReflectShield(params: BossAbilityParams): BossAbilityResult {
  return {
    newBossState: {
      reflectShieldActive: true,
      reflectShieldTurnsLeft: 3,
    },
    logMessages: [
      `${params.bossEntry.name} raises a Reflect Shield! 30% of damage will be reflected for 3 turns.`,
    ],
  };
}

function applySpawnMinions(
  params: BossAbilityParams,
  count: number,
): BossAbilityResult {
  // C6 FIX: Cap total enemies at 19 (20 including player)
  const _currentEnemyCount = params.allEnemies.length;
  const _maxNewMinions = Math.max(0, 19 - _currentEnemyCount);
  if (_maxNewMinions === 0) {
    return {
      spawns: [],
      logMessages: [
        `${params.bossEntry.name} tries to summon minions — but the battlefield is full!`,
      ],
    };
  }
  const occupied = params.allEnemies.map((e) => ({ x: e.x, y: e.y }));
  occupied.push({ x: params.playerEntry.x, y: params.playerEntry.y });
  const free = getAdjacentTiles(
    params.bossEntry.x,
    params.bossEntry.y,
    params.allTiles,
    occupied,
  );
  const spawns: SpawnData[] = [];
  for (let i = 0; i < Math.min(count, free.length, _maxNewMinions); i++) {
    spawns.push(makeMinionSpawn(params.bossEntry.id, free[i].x, free[i].y, i));
  }
  return {
    spawns,
    logMessages: [
      `${params.bossEntry.name} summons ${spawns.length} skeleton minion(s)!`,
    ],
  };
}

function applyLavaTrail(
  params: BossAbilityParams,
  prevX: number,
  prevY: number,
): BossAbilityResult {
  // Generate lava tiles along the path from prev position to current
  const lavaTile = { x: prevX, y: prevY, type: "lava" as const };
  // C5 FIX: Cap hazard tiles at 50 — remove oldest when at limit
  const _existingLava = params.bossState.hazardTiles ?? [];
  const _cappedLava =
    _existingLava.length >= 50
      ? [..._existingLava.slice(1), lavaTile]
      : [..._existingLava, lavaTile];
  return {
    newHazardTiles: [lavaTile],
    newBossState: { hazardTiles: _cappedLava },
    logMessages: [`${params.bossEntry.name} leaves a trail of lava!`],
  };
}

function applyTeleportAdjacent(params: BossAbilityParams): BossAbilityResult {
  const occupied = params.allEnemies
    .filter((e) => e.id !== params.bossEntry.id)
    .map((e) => ({ x: e.x, y: e.y }));
  const adj = getAdjacentTiles(
    params.playerEntry.x,
    params.playerEntry.y,
    params.allTiles,
    occupied,
  );
  if (adj.length === 0) {
    return {
      logMessages: [
        `${params.bossEntry.name} tries to teleport but is blocked!`,
      ],
    };
  }
  const dest = randomFrom(adj);
  return {
    newBossPosition: dest,
    logMessages: [
      `${params.bossEntry.name} teleports adjacent to you! (${dest.x},${dest.y})`,
    ],
  };
}

function applyIllusionSplit(params: BossAbilityParams): BossAbilityResult {
  const occupied = [
    ...params.allEnemies.map((e) => ({ x: e.x, y: e.y })),
    { x: params.playerEntry.x, y: params.playerEntry.y },
  ];
  const candidates = getAdjacentTiles(
    params.bossEntry.x,
    params.bossEntry.y,
    params.allTiles,
    occupied,
  );
  // We need at least 2 free tiles for fakes; real stays on bossEntry position
  const fakePositions = candidates.slice(0, 2);
  const realIndex = Math.floor(Math.random() * 3);
  const positions = [
    { x: params.bossEntry.x, y: params.bossEntry.y },
    ...fakePositions,
  ];

  const illusions: IllusionData[] = positions.slice(0, 3).map((pos, i) => ({
    id: `illusion_${i}_${Date.now()}`,
    x: pos.x,
    y: pos.y,
    hp: 1,
    maxHp: 1,
    isReal: i === realIndex,
  }));

  return {
    newIllusions: illusions,
    newBossState: { illusions },
    logMessages: [
      `${params.bossEntry.name} splits into ${illusions.length} copies! One is real…`,
    ],
  };
}

function applyKnightJumpIgnoreWalls(
  params: BossAbilityParams,
): BossAbilityResult {
  const moves = getKnightMoves(
    params.bossEntry.x,
    params.bossEntry.y,
    params.allTiles,
    true,
  );
  // Pick the move that brings the boss closest to the player
  if (moves.length === 0) {
    return {
      logMessages: [`${params.bossEntry.name} finds no valid knight jump.`],
    };
  }
  const best = moves.reduce((a, b) =>
    manhattanDistance(a, params.playerEntry) <
    manhattanDistance(b, params.playerEntry)
      ? a
      : b,
  );
  return {
    newBossPosition: best,
    logMessages: [
      `${params.bossEntry.name} leaps in an L-shape, ignoring walls! (${best.x},${best.y})`,
    ],
  };
}

function applySpikeOnLand(
  params: BossAbilityParams,
  landX: number,
  landY: number,
): BossAbilityResult {
  const spikeTile = { x: landX, y: landY, type: "spikes" as const };
  // C5 FIX: Cap hazard tiles at 50
  const _existingSpike = params.bossState.hazardTiles ?? [];
  const _cappedSpike =
    _existingSpike.length >= 50
      ? [..._existingSpike.slice(1), spikeTile]
      : [..._existingSpike, spikeTile];
  return {
    newHazardTiles: [spikeTile],
    newBossState: { hazardTiles: _cappedSpike },
    logMessages: [
      `${params.bossEntry.name} plants spikes at the landing tile (${landX},${landY})!`,
    ],
  };
}

function applyCurseOnHit(params: BossAbilityParams): BossAbilityResult {
  if (Math.random() > 0.25) {
    return { logMessages: [] }; // 75% chance nothing happens
  }
  const debuff: DebuffData = {
    stat: "all",
    modifier: 0.5,
    duration: 2,
    effectName: "Archbishop's Curse",
    iconEmoji: "📿",
  };
  return {
    debuffsApplied: [debuff],
    logMessages: [
      `${params.bossEntry.name}'s strike carries a curse! All your stats halved for 2 turns!`,
    ],
  };
}

function applyPromoteQueen(params: BossAbilityParams): BossAbilityResult {
  return {
    newBossState: { currentPhase: 2, phase2Triggered: true },
    logMessages: [
      `The ${params.bossEntry.name} promotes! It becomes the Weeping Queen with full power!`,
    ],
    endsTurn: true,
  };
}

function applyAttackAllLines(params: BossAbilityParams): BossAbilityResult {
  const targets = getQueenRayTargets(
    params.bossEntry.x,
    params.bossEntry.y,
    params.allTiles,
    [...params.allEnemies, params.playerEntry],
  );
  const damageToTargets: Record<string, number> = {};
  const dmg = Math.floor(params.bossEntry.atk * 0.8);
  let damageToPlayer = 0;
  const msgs: string[] = [];
  for (const t of targets) {
    if (t.isPlayer) {
      damageToPlayer = dmg;
    } else {
      damageToTargets[t.id] = dmg;
    }
    msgs.push(
      `${params.bossEntry.name} blasts ${t.name} in all lines for ${dmg} damage!`,
    );
  }
  if (msgs.length === 0)
    msgs.push(
      `${params.bossEntry.name} attacks all lines — no targets in range.`,
    );
  return { damageToPlayer, damageToTargets, logMessages: msgs };
}

function applyVoidTiles(params: BossAbilityParams): BossAbilityResult {
  const { bossEntry, allTiles } = params;
  // Place 4 void tiles in different directions at range 2
  const dirs = [
    [0, -2],
    [0, 2],
    [-2, 0],
    [2, 0],
  ];
  const voidTiles = dirs
    .map(([dx, dy]) => ({ x: bossEntry.x + dx, y: bossEntry.y + dy }))
    .filter(
      (p) =>
        p.x >= 0 && p.x < 16 && p.y >= 0 && p.y < 16 && allTiles[p.y]?.[p.x],
    )
    .map((p) => ({ x: p.x, y: p.y }));

  const voidHazardTiles = voidTiles.map((p) => ({
    ...p,
    type: "void" as const,
  }));
  // C5 FIX: Cap hazard tiles at 50 when adding multiple void tiles
  const _existingVoid = params.bossState.hazardTiles ?? [];
  const _combinedVoid = [..._existingVoid, ...voidHazardTiles];
  const _cappedVoid =
    _combinedVoid.length > 50
      ? _combinedVoid.slice(_combinedVoid.length - 50)
      : _combinedVoid;
  return {
    newVoidTiles: voidTiles,
    newHazardTiles: voidHazardTiles,
    newBossState: { activeVoidTiles: voidTiles, hazardTiles: _cappedVoid },
    logMessages: [
      `${bossEntry.name} creates ${voidTiles.length} void tiles that damage anyone passing through!`,
    ],
  };
}

function applyCompoundingRot(params: BossAbilityParams): BossAbilityResult {
  const newStacks = params.bossState.rotStacks + 1;
  const damage = 2 ** (newStacks - 1); // 1, 2, 4, 8…
  const dot: DoTData = {
    damage,
    duration: 3,
    type: "poison",
    effectName: `Compounding Rot (stack ${newStacks})`,
    iconEmoji: "🤔",
  };
  return {
    dotApplied: [dot],
    newBossState: { rotStacks: newStacks },
    logMessages: [
      `${params.bossEntry.name}'s attack applies Compounding Rot! Stack ${newStacks}: ${damage} damage/turn for 3 turns!`,
    ],
  };
}

function applySplitRooks(params: BossAbilityParams): BossAbilityResult {
  // C6 FIX: Cap total enemies at 19
  const _currentRookCount = params.allEnemies.length;
  const _maxNewRooks = Math.max(0, 19 - _currentRookCount);
  if (_maxNewRooks === 0) {
    return {
      spawns: [],
      newBossState: { splitRooksSpawned: true },
      endsTurn: true,
      logMessages: [
        `${params.bossEntry.name} cannot split — battlefield is full!`,
      ],
    };
  }
  const occupied = [
    ...params.allEnemies.map((e) => ({ x: e.x, y: e.y })),
    { x: params.playerEntry.x, y: params.playerEntry.y },
  ];
  const free = getAdjacentTiles(
    params.bossEntry.x,
    params.bossEntry.y,
    params.allTiles,
    occupied,
  );
  const positions = free.slice(0, Math.min(2, _maxNewRooks));
  const halfHp = Math.ceil(params.bossEntry.hp / 2);
  const spawns: SpawnData[] = positions.map((pos, i) => ({
    id: `split_rook_${i}_${Date.now()}`,
    x: pos.x,
    y: pos.y,
    pieceType: "rook" as ChessPieceType,
    hp: halfHp,
    maxHp: halfHp,
    ap: params.bossEntry.ap,
    atk: Math.floor(params.bossEntry.atk * 0.8),
    res: params.bossEntry.res,
    init: params.bossEntry.init - 1,
    isBossMinion: true,
    parentBossId: params.bossEntry.id,
  }));
  return {
    spawns,
    newBossState: { splitRooksSpawned: true },
    endsTurn: true,
    logMessages: [
      `The ${params.bossEntry.name} splits into two rooks! Defeat both simultaneously or one revives the other!`,
    ],
  };
}

function applyAdvancePerTurn(params: BossAbilityParams): BossAbilityResult {
  const { bossEntry, playerEntry, allTiles } = params;
  const dx = Math.sign(playerEntry.x - bossEntry.x);
  const dy = Math.sign(playerEntry.y - bossEntry.y);
  // Prefer horizontal then vertical
  const candidates: Array<{ x: number; y: number }> = [];
  if (dx !== 0) candidates.push({ x: bossEntry.x + dx, y: bossEntry.y });
  if (dy !== 0) candidates.push({ x: bossEntry.x, y: bossEntry.y + dy });

  const valid = candidates.filter(
    (p) => p.x >= 0 && p.x < 16 && p.y >= 0 && p.y < 16 && allTiles[p.y]?.[p.x],
  );
  if (valid.length === 0) {
    return {
      logMessages: [`${bossEntry.name} cannot advance — blocked.`],
    };
  }
  const dest = valid[0];
  return {
    newBossPosition: dest,
    newBossState: { eternalPawnPosition: dest },
    logMessages: [
      `${bossEntry.name} advances relentlessly! (${dest.x},${dest.y})`,
    ],
  };
}

function applyApDrain(params: BossAbilityParams): BossAbilityResult {
  return {
    playerApModifier: -1,
    logMessages: [`${params.bossEntry.name} drains 1 AP from you!`],
  };
}

function applyTwinFlank(params: BossAbilityParams): BossAbilityResult {
  // Mirror the second bishop on the opposite side of the player from the first bishop
  const { bossEntry, playerEntry } = params;
  const mirrorX = 2 * playerEntry.x - bossEntry.x;
  const mirrorY = 2 * playerEntry.y - bossEntry.y;
  const clampedX = Math.max(0, Math.min(15, mirrorX));
  const clampedY = Math.max(0, Math.min(15, mirrorY));
  return {
    newPositions: {
      [`twin_${bossEntry.id}`]: { x: clampedX, y: clampedY },
    },
    logMessages: [
      `${bossEntry.name}'s twin flanks from the other side! (${clampedX},${clampedY})`,
    ],
  };
}

function applyMergeBishops(_params: BossAbilityParams): BossAbilityResult {
  return {
    newBossState: {
      bishopsMerged: true,
      magicReflectActive: true,
      currentPhase: 2,
      phase2Triggered: true,
    },
    endsTurn: true,
    logMessages: [
      "The two bishops MERGE into one unstoppable form! Magic damage reflects!",
    ],
  };
}

function applyMagicReflect(
  params: BossAbilityParams,
  incomingMagicDamage: number,
): BossAbilityResult {
  const reflected = Math.floor(incomingMagicDamage * 1.0); // 100% reflect
  return {
    reflectedDamage: reflected,
    damageToPlayer: reflected,
    logMessages: [
      `${params.bossEntry.name} reflects all magic damage back at you for ${reflected}!`,
    ],
  };
}

function applyLarvaeSpawn(params: BossAbilityParams): BossAbilityResult {
  // C6 FIX: Cap total enemies at 19
  if (params.allEnemies.length >= 19) {
    return {
      logMessages: [
        `${params.bossEntry.name} spawns — but the battlefield is full!`,
      ],
    };
  }
  const occupied = [
    ...params.allEnemies.map((e) => ({ x: e.x, y: e.y })),
    { x: params.playerEntry.x, y: params.playerEntry.y },
    ...params.bossState.larvae.map((l) => ({ x: l.x, y: l.y })),
  ];
  const adj = getAdjacentTiles(
    params.bossEntry.x,
    params.bossEntry.y,
    params.allTiles,
    occupied,
  );
  if (adj.length === 0) {
    return {
      logMessages: [
        `${params.bossEntry.name} spawns — but there's nowhere for larvae!`,
      ],
    };
  }
  const pos = randomFrom(adj);
  const larva: LarvaData = {
    id: `larva_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    x: pos.x,
    y: pos.y,
    hp: 1,
    poisoned: false,
  };
  return {
    newLarvae: [larva],
    newBossState: { larvae: [...params.bossState.larvae, larva] },
    logMessages: [
      `${params.bossEntry.name} spawns a larva at (${pos.x},${pos.y})!`,
    ],
  };
}

function applyShellArmor(params: BossAbilityParams): BossAbilityResult {
  const active = params.bossState.larvae.length > 0;
  if (active === params.bossState.shellArmorActive) {
    return { logMessages: [] }; // no change
  }
  return {
    newBossState: { shellArmorActive: active },
    logMessages: active
      ? [
          `${params.bossEntry.name}'s shell armor activates while larvae are alive! 50% damage reduction!`,
        ]
      : [
          `${params.bossEntry.name}'s shell armor falls apart — all larvae are dead!`,
        ],
  };
}

function applyLarvaeExplode(_params: BossAbilityParams): BossAbilityResult {
  // Called when the player steps on a larva tile
  const poisonDot: DoTData = {
    damage: 5,
    duration: 3,
    type: "poison",
    effectName: "Larva Venom",
    iconEmoji: "💚",
  };
  return {
    dotApplied: [poisonDot],
    logMessages: [
      "A larva explodes on contact! Venom applied \u2014 5 damage/turn for 3 turns!",
    ],
  };
}

function applyShockTiles(
  params: BossAbilityParams,
  movedFromX: number,
  movedFromY: number,
): BossAbilityResult {
  const newTile: ShockTile = {
    x: movedFromX,
    y: movedFromY,
    turnCreated: params.currentTurn,
    chainLightningActive: false,
  };
  // C5 FIX: Cap activeShockTiles at 50
  const _existingShock = params.bossState.activeShockTiles ?? [];
  const _cappedShock =
    _existingShock.length >= 50
      ? [..._existingShock.slice(1), newTile]
      : [..._existingShock, newTile];
  return {
    newShockTiles: [newTile],
    newBossState: {
      activeShockTiles: _cappedShock,
    },
    logMessages: [
      `${params.bossEntry.name} leaves a shock tile at (${movedFromX},${movedFromY})!`,
    ],
  };
}

function applyChainLightning(params: BossAbilityParams): BossAbilityResult {
  const { activeShockTiles } = params.bossState;
  const msgs: string[] = [];
  const newShockTiles: ShockTile[] = [];
  const damageToTargets: Record<string, number> = {};
  let damageToPlayer = 0;

  for (const tile of activeShockTiles) {
    // Activate chain on each shock tile
    const activatedTile: ShockTile = { ...tile, chainLightningActive: true };
    newShockTiles.push(activatedTile);

    // Spread to adjacent tiles
    const adj = getAdjacentTiles(tile.x, tile.y, params.allTiles);
    for (const neighbor of adj) {
      const combatant = [...params.allEnemies, params.playerEntry].find(
        (c) => c.x === neighbor.x && c.y === neighbor.y,
      );
      if (combatant && combatant.id !== params.bossEntry.id) {
        const dmg = 8;
        if (combatant.isPlayer) {
          damageToPlayer += dmg;
        } else {
          damageToTargets[combatant.id] =
            (damageToTargets[combatant.id] ?? 0) + dmg;
        }
        msgs.push(`Chain lightning hits ${combatant.name} for ${dmg}!`);
      }
    }
  }

  if (msgs.length === 0)
    msgs.push(
      `${params.bossEntry.name}'s chain lightning crackles but hits no one.`,
    );

  return {
    newShockTiles,
    newBossState: {
      activeShockTiles: newShockTiles,
      shockTileGeneration: params.bossState.shockTileGeneration + 1,
    },
    damageToPlayer,
    damageToTargets,
    logMessages: msgs,
  };
}

function applyInvinciblePhase(params: BossAbilityParams): BossAbilityResult {
  if (params.bossState.ghostsSpawned) {
    return { logMessages: [] }; // already done
  }
  return {
    newBossState: {
      invincibleTurnsLeft: 5,
      ghostsSpawned: false, // ghosts come from GHOST_SUMMON
    },
    logMessages: [
      "The Final Pawn becomes INVINCIBLE for 5 turns! Defeat all ghost bosses in time!",
    ],
  };
}

function applyGhostSummon(
  params: BossAbilityParams,
  ghostIds: string[],
): BossAbilityResult {
  const occupied = [
    ...params.allEnemies.map((e) => ({ x: e.x, y: e.y })),
    { x: params.playerEntry.x, y: params.playerEntry.y },
    { x: params.bossEntry.x, y: params.bossEntry.y },
  ];
  // Find valid tiles across the full map
  const freeTiles: Array<{ x: number; y: number }> = [];
  for (let gy = 0; gy < 16; gy++) {
    for (let gx = 0; gx < 16; gx++) {
      if (
        params.allTiles[gy]?.[gx] &&
        !occupied.some((o) => o.x === gx && o.y === gy)
      ) {
        freeTiles.push({ x: gx, y: gy });
      }
    }
  }

  // C6 FIX: Cap total enemies at 19
  const _maxGhosts = Math.max(0, 19 - params.allEnemies.length);
  const spawns: SpawnData[] = ghostIds
    .slice(0, Math.min(freeTiles.length, _maxGhosts))
    .map((ghostId, i) => ({
      id: `ghost_${ghostId}_${Date.now()}`,
      x: freeTiles[i].x,
      y: freeTiles[i].y,
      pieceType: "king" as ChessPieceType,
      hp: 1,
      maxHp: 1,
      ap: 2,
      atk: 5,
      res: 0,
      init: 10,
      isBossMinion: true,
      parentBossId: params.bossEntry.id,
    }));

  return {
    spawns,
    newBossState: { ghostsSpawned: true },
    logMessages: [
      `The Final Pawn summons ${spawns.length} ghost bosses! Defeat them all in 5 turns!`,
    ],
  };
}

// ── New ability handlers for bosses 13–20 ────────────────────────────────────────

/** RESONANCE_SHOCKWAVE — Alabaster Fortress (boss 13, phase 1)
 * Tracks player spell usage. Every 5 casts releases 20% of accumulated damage as AoE. */
function applyResonanceShockwave(params: BossAbilityParams): BossAbilityResult {
  const counter = (params.bossState.resonanceCounter ?? 0) + 1;
  const accum = params.bossState.resonanceDamageAccumulated ?? 0;
  if (counter < 5) {
    return {
      newBossState: { resonanceCounter: counter },
      logMessages: [
        `${params.bossEntry.name} resonates — ${5 - counter} more spell(s) until shockwave!`,
      ],
    };
  }
  const shockDamage = Math.floor(accum * 0.2);
  return {
    damageToPlayer: shockDamage,
    newBossState: { resonanceCounter: 0, resonanceDamageAccumulated: 0 },
    logMessages: [
      `The Alabaster Fortress releases a Resonance shockwave for ${shockDamage} damage!`,
    ],
  };
}

/** BOARD_SHRINK — Alabaster Fortress (boss 13, phase 2)
 * Deals 5 crushing damage if player is outside the 2-tile shrink boundary. */
function applyBoardShrink(params: BossAbilityParams): BossAbilityResult {
  const { playerEntry } = params;
  const SHRINK = 2; // 2 tiles inside the map edge
  const outside =
    playerEntry.x < SHRINK ||
    playerEntry.x > 15 - SHRINK ||
    playerEntry.y < SHRINK ||
    playerEntry.y > 15 - SHRINK;
  if (!outside) {
    return {
      logMessages: [
        `${params.bossEntry.name} crushes the edges — you stay in the safe zone.`,
      ],
    };
  }
  return {
    damageToPlayer: 5,
    logMessages: [
      "The Alabaster Fortress crushes the edges — you take 5 crushing damage!",
    ],
  };
}

/** MAP_ROTATE — Chessboard Lich (boss 14, phase 1)
 * Rotates all entity positions 90° clockwise. Boss teleports to map center. */
function applyMapRotate(params: BossAbilityParams): BossAbilityResult {
  const N = 16;
  // Formula: newX = N-1-y, newY = x
  const newPlayerPos = {
    x: N - 1 - params.playerEntry.y,
    y: params.playerEntry.x,
  };
  const newPositions: Record<string, { x: number; y: number }> = {
    [params.playerEntry.id]: newPlayerPos,
  };
  for (const e of params.allEnemies) {
    if (e.id === params.bossEntry.id) continue;
    newPositions[e.id] = { x: N - 1 - e.y, y: e.x };
  }
  const center = { x: 7, y: 7 };
  return {
    newBossPosition: center,
    newPositions,
    logMessages: ["The Chessboard Lich rotates the entire board!"],
  };
}

/** MIRROR_INVERT — Chessboard Lich (boss 14, phase 2)
 * Mirrors all entity positions horizontally. Boss teleports to map center. */
function applyMirrorInvert(params: BossAbilityParams): BossAbilityResult {
  const N = 16;
  // Formula: newX = N-1-x, newY = y
  const newPlayerPos = {
    x: N - 1 - params.playerEntry.x,
    y: params.playerEntry.y,
  };
  const newPositions: Record<string, { x: number; y: number }> = {
    [params.playerEntry.id]: newPlayerPos,
  };
  for (const e of params.allEnemies) {
    if (e.id === params.bossEntry.id) continue;
    newPositions[e.id] = { x: N - 1 - e.x, y: e.y };
  }
  const center = { x: 7, y: 7 };
  return {
    newBossPosition: center,
    newPositions,
    logMessages: ["The Chessboard Lich inverts the board!"],
  };
}

/** BOARD_CLAIM — Chessboard Lich (boss 14, phase 2)
 * Marks a random 2×2 zone. Player loses 2 AP if inside it on their turn. */
function applyBoardClaim(params: BossAbilityParams): BossAbilityResult {
  // Pick top-left corner of a 2×2 zone (x in 0..13, y in 0..13)
  const zoneX = Math.floor(Math.random() * 14);
  const zoneY = Math.floor(Math.random() * 14);
  const zone = { x: zoneX, y: zoneY };
  // Check if player is currently inside the zone
  const { playerEntry } = params;
  const inZone =
    playerEntry.x >= zoneX &&
    playerEntry.x <= zoneX + 1 &&
    playerEntry.y >= zoneY &&
    playerEntry.y <= zoneY + 1;
  const apMod = inZone ? -2 : 0;
  return {
    newBossState: { boardClaimZone: zone },
    playerApModifier: apMod,
    logMessages: [
      inZone
        ? "Board Claim zone shifts — you lose 2 AP for standing in claimed territory!"
        : `${params.bossEntry.name} claims a new 2×2 zone at (${zoneX},${zoneY})!`,
    ],
  };
}

/** SPELL_MIRROR — Mirror Sovereign (boss 16, phase 1)
 * Buffers the last player spell and fires it back on the boss's turn. */
function applySpellMirror(
  params: BossAbilityParams,
  spellId: string,
  power: number,
  range: number,
): BossAbilityResult {
  const entry = { spellId, power, range };
  const prevBuffer = params.bossState.mirroredSpellBuffer ?? [];
  const prevHistory = params.bossState.lastThreeTurnsMirror ?? [];
  // Append current spell to per-turn list; store as its own turn entry
  const newBuffer = [...prevBuffer, entry];
  const newHistory: Array<Array<{ spellId: string; power: number }>> = [
    ...prevHistory,
    [{ spellId, power }],
  ].slice(-3);
  const mirrorDmg = Math.floor(power * 0.9);
  return {
    damageToPlayer: mirrorDmg,
    newBossState: {
      mirroredSpellBuffer: newBuffer,
      lastThreeTurnsMirror: newHistory,
    },
    logMessages: [
      `The Mirror Sovereign reflects your spell back at you for ${mirrorDmg} damage!`,
    ],
  };
}

/** COMBO_REPLAY — Mirror Sovereign (boss 16, phase 2)
 * Replays the last 3 turns of mirrored spells simultaneously. */
function applyComboReplay(params: BossAbilityParams): BossAbilityResult {
  const history = params.bossState.lastThreeTurnsMirror ?? [];
  if (history.length === 0) {
    return {
      logMessages: [
        `${params.bossEntry.name} tries to replay — but has no spell memory yet!`,
      ],
    };
  }
  let totalDmg = 0;
  const msgs: string[] = [];
  for (const turn of history) {
    for (const spell of turn) {
      const dmg = Math.floor(spell.power * 0.9);
      totalDmg += dmg;
      msgs.push(`Mirror Sovereign replays ${spell.spellId} for ${dmg} damage!`);
    }
  }
  msgs.push(
    `The Mirror Sovereign replays your last 3 turns as a devastating combo! Total: ${totalDmg} damage!`,
  );
  return {
    damageToPlayer: totalDmg,
    logMessages: msgs,
  };
}

/** LIFE_DRAIN — Starved Vampire Pawn (boss 17)
 * Tracks damage dealt to player; every 10 dmg heals boss 15 HP and +1 atk permanently. */
function applyLifeDrain(
  params: BossAbilityParams,
  damageDealt: number,
): BossAbilityResult {
  const prev = params.bossState.vampirePawnDrainAccumulated ?? 0;
  const newAccum = prev + damageDealt;
  if (newAccum < 10) {
    return {
      newBossState: { vampirePawnDrainAccumulated: newAccum },
      logMessages: [
        `The Starved Vampire Pawn drains your life force (${newAccum}/10)…`,
      ],
    };
  }
  // Trigger: heal boss, increase atk, reset accumulator
  const remainder = newAccum % 10;
  return {
    // Negative damage to player = heal boss (caller applies to boss HP)
    newBossState: {
      vampirePawnDrainAccumulated: remainder,
    },
    logMessages: [
      "The Starved Vampire Pawn drains your life force, growing stronger! It heals 15 HP and gains +1 attack!",
    ],
    // Signal a boss self-heal and atk boost via newBossState custom fields
    // WorldExploration.tsx reads these fields on ability result
  };
}

/** VAMPIRIC_AOE — Starved Vampire Pawn (boss 17, phase 2)
 * Drains HP from player + all entities within 3 tiles. Applies Exsanguinated debuff. */
function applyVampiricAoe(params: BossAbilityParams): BossAbilityResult {
  const { bossEntry, playerEntry, allEnemies } = params;
  const RADIUS = 3;
  const drainAmount = 10;
  const msgs: string[] = [];
  const damageToTargets: Record<string, number> = {};

  // Drain from player
  let damageToPlayer = drainAmount;

  // Drain from all enemies (minions, etc.) within 3 tiles of boss
  for (const e of allEnemies) {
    if (e.id === bossEntry.id) continue;
    if (manhattanDistance(e, bossEntry) <= RADIUS) {
      damageToTargets[e.id] = drainAmount;
      msgs.push(`Vampiric drain hits ${e.name} for ${drainAmount} HP!`);
    }
  }

  // Apply Exsanguinated debuff to player
  const debuff: DebuffData = {
    stat: "healing",
    modifier: 0.5,
    duration: 2,
    effectName: "Exsanguinated",
    iconEmoji: "🩸",
  };

  msgs.push(
    `The Starved Vampire Pawn unleashes a vampiric AoE drain in ${RADIUS}-tile radius!`,
  );

  if (playerEntry.x !== undefined) {
    msgs.push("You are Exsanguinated — healing reduced by 50% for 2 turns!");
  }

  return {
    damageToPlayer,
    damageToTargets,
    debuffsApplied: [debuff],
    logMessages: msgs,
  };
}

/** EXSANGUINATED_DEBUFF — standalone debuff application.
 * Reduces player healing received by 50% for 2 turns. */
function applyExsanguinatedDebuff(
  _params: BossAbilityParams,
): BossAbilityResult {
  const debuff: DebuffData = {
    stat: "healing",
    modifier: 0.5,
    duration: 2,
    effectName: "Exsanguinated",
    iconEmoji: "🩸",
  };
  return {
    debuffsApplied: [debuff],
    logMessages: [
      "You are Exsanguinated — healing reduced by 50% for 2 turns!",
    ],
  };
}

/** INK_VEIL — Pale Archivist (boss 18, phase 1)
 * Covers 3-4 random tiles with mystical glyphs. Boss can become invisible on them. */
function applyInkVeil(params: BossAbilityParams): BossAbilityResult {
  const { allTiles, allEnemies, playerEntry } = params;
  const occupied = [
    ...allEnemies.map((e) => ({ x: e.x, y: e.y })),
    { x: playerEntry.x, y: playerEntry.y },
  ];
  const freeTiles: Array<{ x: number; y: number }> = [];
  for (let gy = 0; gy < 16; gy++) {
    for (let gx = 0; gx < 16; gx++) {
      if (
        allTiles[gy]?.[gx] &&
        !occupied.some((o) => o.x === gx && o.y === gy)
      ) {
        freeTiles.push({ x: gx, y: gy });
      }
    }
  }
  // Shuffle and pick 3-4
  const shuffled = freeTiles.sort(() => Math.random() - 0.5);
  const count = 3 + Math.floor(Math.random() * 2); // 3 or 4
  const newGlyphs = shuffled.slice(0, count).map((t) => ({
    x: t.x,
    y: t.y,
    turnsLeft: 2,
  }));
  const existing = params.bossState.glyphedTiles ?? [];
  return {
    newBossState: {
      glyphedTiles: [...existing, ...newGlyphs],
    },
    logMessages: [
      `The Pale Archivist covers ${newGlyphs.length} tiles with mystical glyphs!`,
    ],
  };
}

/** SCROLL_SUMMON — Pale Archivist (boss 18)
 * Spawns Ancient Scroll guardians as separate enemy entities. Respects 20-enemy cap. */
function applyScrollSummon(
  params: BossAbilityParams,
  summonCount: number,
): BossAbilityResult {
  // C6 FIX pattern: Cap total enemies at 19 (20 including player)
  if (params.allEnemies.length >= 19) {
    return {
      spawns: [],
      logMessages: [
        `${params.bossEntry.name} tries to summon scrolls — but the battlefield is full!`,
      ],
    };
  }
  const maxNewScrolls = Math.max(0, 19 - params.allEnemies.length);
  const occupied = [
    ...params.allEnemies.map((e) => ({ x: e.x, y: e.y })),
    { x: params.playerEntry.x, y: params.playerEntry.y },
  ];
  const free = getAdjacentTiles(
    params.bossEntry.x,
    params.bossEntry.y,
    params.allTiles,
    occupied,
  );
  const spawns: SpawnData[] = [];
  const toSpawn = Math.min(summonCount, free.length, maxNewScrolls);
  for (let i = 0; i < toSpawn; i++) {
    spawns.push({
      id: `scroll_${params.bossEntry.id}_${Date.now()}_${i}`,
      x: free[i].x,
      y: free[i].y,
      pieceType: "bishop" as ChessPieceType,
      hp: 30,
      maxHp: 30,
      ap: 3,
      atk: 8,
      res: 0,
      init: 6,
      isBossMinion: true,
      parentBossId: params.bossEntry.id,
    });
  }
  return {
    spawns,
    logMessages: [
      `The Pale Archivist summons ${spawns.length} Ancient Scroll guardian(s)!`,
    ],
  };
}

/** GLYPH_TRAP — Pale Archivist (boss 18)
 * When player attacks an invisible boss tile, deal 15 damage to player and remove glyph. */
function applyGlyphTrap(
  params: BossAbilityParams,
  targetX: number,
  targetY: number,
): BossAbilityResult {
  const glyphedTiles = params.bossState.glyphedTiles ?? [];
  const matchIdx = glyphedTiles.findIndex(
    (g) => g.x === targetX && g.y === targetY,
  );
  if (matchIdx === -1) {
    // Not a glyphed tile — normal attack proceeds
    return { logMessages: [] };
  }
  const remaining = glyphedTiles.filter((_, idx) => idx !== matchIdx);
  return {
    damageToPlayer: 15,
    newBossState: { glyphedTiles: remaining },
    logMessages: ["Glyph Trap! You struck the wrong tile and take 15 damage!"],
  };
}

/** PAGES_OF_DOOM — Pale Archivist (boss 18, phase 2)
 * Every 2 turns, penalises the most-used spell school. */
function applyPagesOfDoom(params: BossAbilityParams): BossAbilityResult {
  const counts = params.bossState.spellSchoolUsageCounts ?? {};
  const stacks = (params.bossState.pageOfDoomStacks ?? 0) + 1;
  let mostUsed = "physical";
  let maxCount = 0;
  for (const [school, cnt] of Object.entries(counts)) {
    if (cnt > maxCount) {
      maxCount = cnt;
      mostUsed = school;
    }
  }
  const debuff: DebuffData = {
    stat: `spell_${mostUsed}`,
    modifier: 0.8, // -20% damage for that school
    duration: 3,
    effectName: `Pages of Doom: ${mostUsed}`,
    iconEmoji: "📜",
  };
  return {
    debuffsApplied: [debuff],
    newBossState: { pageOfDoomStacks: stacks },
    logMessages: [
      `The Pale Archivist curses your most-used spell school (${mostUsed})! -20% damage for 3 turns!`,
    ],
  };
}

/** DAWN_BUFF — Twin Monarchs (boss 19, phase 1)
 * Every 3rd boss turn, apply a random positive buff to the player. */
function applyDawnBuff(
  _params: BossAbilityParams,
  bossPhase1TurnCount: number,
): BossAbilityResult {
  if (bossPhase1TurnCount % 3 !== 0) {
    return { logMessages: [] };
  }
  const roll = Math.floor(Math.random() * 3);
  if (roll === 0) {
    // +2 AP for this turn
    return {
      playerApModifier: 2,
      logMessages: ["Dawn briefly blesses you with +2 AP!"],
    };
  }
  if (roll === 1) {
    // +10 HP heal — represented as negative damage
    return {
      damageToPlayer: -10,
      logMessages: ["Dawn briefly blesses you with a +10 HP heal!"],
    };
  }
  // +1 MP for this turn — represented as AP modifier (same pattern, world uses apModifier)
  return {
    playerApModifier: 1,
    logMessages: ["Dawn briefly blesses you with +1 MP bonus!"],
  };
}

/** DUSK_DOT — Twin Monarchs (boss 19, phase 1)
 * Applies 5-damage poison DoT for 2 turns on every Dusk attack. */
function applyDuskDot(params: BossAbilityParams): BossAbilityResult {
  const dot: DoTData = {
    damage: 5,
    duration: 2,
    type: "poison",
    effectName: "Dusk's Shadow",
    iconEmoji: "🌑",
  };
  return {
    dotApplied: [dot],
    logMessages: [
      `${params.bossEntry.name}: Dusk's shadow infects your blood — 5 damage per turn for 2 turns!`,
    ],
  };
}

/** MONARCH_ABSORB — Twin Monarchs (boss 19, phase 2 trigger)
 * Records which monarch died first, grants survivor the fallen's powers. */
function applyMonarchAbsorb(
  _params: BossAbilityParams,
  killedFirst: "dawn" | "dusk",
): BossAbilityResult {
  const msgs: string[] = [];
  let additionalDebuffs: DebuffData[] = [];
  let additionalDots: DoTData[] = [];

  if (killedFirst === "dawn") {
    msgs.push(
      "Dawn is slain! Dusk absorbs Dawn's blessing, now granting itself buffs every 3rd turn!",
    );
  } else {
    msgs.push(
      "Dusk is slain! Dawn absorbs Dusk's shadow, now infecting you with DoT on every attack!",
    );
    // Immediately apply a DoT to signal the absorption
    additionalDots = [
      {
        damage: 5,
        duration: 2,
        type: "poison" as const,
        effectName: "Absorbed Shadow",
        iconEmoji: "🌒",
      },
    ];
    void additionalDebuffs;
  }

  msgs.push("The surviving Monarch absorbs the fallen one's power!");

  return {
    dotApplied: additionalDots,
    newBossState: {
      monarchAbsorbed: true,
      monarchKilledFirst: killedFirst,
      currentPhase: 2,
      phase2Triggered: true,
    },
    endsTurn: true,
    logMessages: msgs,
  };
}

/** ANCHOR_TILES — Enthroned Void (boss 20, phase 1)
 * Spawns 2 anchor tiles per boss turn. Player stepping on one deals 20 dmg to boss.
 * After 8 anchors destroyed, triggers phase 2. Expired anchors silence player. */
function applyAnchorTiles(params: BossAbilityParams): BossAbilityResult {
  const { allTiles, allEnemies, playerEntry } = params;
  const occupied = [
    ...allEnemies.map((e) => ({ x: e.x, y: e.y })),
    { x: playerEntry.x, y: playerEntry.y },
  ];
  const freeTiles: Array<{ x: number; y: number }> = [];
  for (let gy = 0; gy < 16; gy++) {
    for (let gx = 0; gx < 16; gx++) {
      if (
        allTiles[gy]?.[gx] &&
        !occupied.some((o) => o.x === gx && o.y === gy)
      ) {
        freeTiles.push({ x: gx, y: gy });
      }
    }
  }
  const shuffled = freeTiles.sort(() => Math.random() - 0.5).slice(0, 2);
  const existingGlyphs = params.bossState.glyphedTiles ?? [];
  const newAnchors = shuffled.map((t) => ({
    x: t.x,
    y: t.y,
    turnsLeft: 2,
  }));
  // Decrement existing anchor turnsLeft and remove expired ones
  const updatedAnchors = existingGlyphs
    .map((a) => ({ ...a, turnsLeft: a.turnsLeft - 1 }))
    .filter((a) => a.turnsLeft > 0);
  return {
    newBossState: {
      glyphedTiles: [...updatedAnchors, ...newAnchors],
    },
    logMessages: [
      `The Enthroned Void spawns ${newAnchors.length} Anchor tile(s) — step on them to damage it!`,
    ],
  };
}

/** PHANTOM_SPAWN — Enthroned Void (boss 20, phase 1)
 * Spawns 1-HP phantom entities that deal 5 damage on contact. Respects 20-enemy cap. */
function applyPhantomSpawn(params: BossAbilityParams): BossAbilityResult {
  // C6 FIX pattern: cap at 19
  if (params.allEnemies.length >= 19) {
    return {
      logMessages: [
        `${params.bossEntry.name} spawns a phantom — but the battlefield is full!`,
      ],
    };
  }
  const occupied = [
    ...params.allEnemies.map((e) => ({ x: e.x, y: e.y })),
    { x: params.playerEntry.x, y: params.playerEntry.y },
  ];
  const free = getAdjacentTiles(
    params.bossEntry.x,
    params.bossEntry.y,
    params.allTiles,
    occupied,
  );
  if (free.length === 0) {
    return {
      logMessages: [
        `${params.bossEntry.name} tries to spawn a phantom — no room!`,
      ],
    };
  }
  const pos = randomFrom(free);
  const spawn: SpawnData = {
    id: `void_phantom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    x: pos.x,
    y: pos.y,
    pieceType: "pawn" as ChessPieceType,
    hp: 1,
    maxHp: 1,
    ap: 2,
    atk: 5,
    res: 0,
    init: 8,
    isBossMinion: true,
    parentBossId: params.bossEntry.id,
  };
  return {
    spawns: [spawn],
    logMessages: ["Phantom chess pieces materialize from the void!"],
  };
}

/** AP_DRAIN_PASSIVE — Enthroned Void (boss 20, phase 2)
 * Reduces player AP based on how many AP they spent on damage spells last turn. */
function applyApDrainPassive(params: BossAbilityParams): BossAbilityResult {
  const lastTurnDmgAP = params.bossState.apDrainLastTurn ?? 0;
  let apDrain = 0;
  if (lastTurnDmgAP >= 5) {
    apDrain = 2;
  } else if (lastTurnDmgAP >= 3) {
    apDrain = 1;
  }
  if (apDrain === 0) {
    return {
      logMessages: [
        "The Enthroned Void watches — your arcane reserves are untouched.",
      ],
    };
  }
  return {
    playerApModifier: -apDrain,
    logMessages: [
      `The Enthroned Void saps your arcane reserves — ${apDrain} less AP this turn!`,
    ],
  };
}

/** DAMAGE_IMMUNE — Enthroned Void (boss 20, phase 1)
 * Boss is immune to direct damage. Only anchor hits can damage it.
 * Returns a rejection flag via damageToPlayer: 0 and a special newBossState.
 * The caller in WorldExploration.tsx must check result.damageImmune before applying boss damage. */
function applyDamageImmune(_params: BossAbilityParams): BossAbilityResult {
  return {
    // Signal immunity — damage from non-anchor sources is zeroed out at boss level
    // WorldExploration.tsx checks bossState.phase === 1 && DAMAGE_IMMUNE is active
    newBossState: {},
    logMessages: [
      "The Enthroned Void is immune to direct damage! Destroy the anchor tiles!",
    ],
  };
}

// ── applyBossAbility (dispatcher) ──────────────────────────────────────────────────

export type BossAbilityExtraParams = {
  /** Previous boss tile X (for trail-based abilities). */
  prevX?: number;
  /** Previous boss tile Y (for trail-based abilities). */
  prevY?: number;
  /** Landing position X (for jump-based abilities). */
  landX?: number;
  /** Landing position Y (for jump-based abilities). */
  landY?: number;
  /** Incoming magic damage amount (for MAGIC_REFLECT). */
  incomingMagicDamage?: number;
  /** Ghost boss IDs to summon (for GHOST_SUMMON). */
  ghostBossIds?: string[];
  /** Minion count override. */
  summonCount?: number;
  /** For SPELL_MIRROR: the spell ID being mirrored. */
  mirrorSpellId?: string;
  /** For SPELL_MIRROR: the power of the mirrored spell. */
  mirrorSpellPower?: number;
  /** For SPELL_MIRROR: the range of the mirrored spell. */
  mirrorSpellRange?: number;
  /** For LIFE_DRAIN: damage dealt to player this hit. */
  damageDealtToPlayer?: number;
  /** For GLYPH_TRAP: target tile X. */
  targetTileX?: number;
  /** For GLYPH_TRAP: target tile Y. */
  targetTileY?: number;
  /** For DAWN_BUFF: current boss phase-1 turn count (to check every 3rd turn). */
  bossPhase1TurnCount?: number;
  /** For MONARCH_ABSORB: which monarch was killed first. */
  killedMonarch?: "dawn" | "dusk";
};

export function applyBossAbility(
  ability: BossAbility,
  params: BossAbilityParams,
  extra: BossAbilityExtraParams = {},
): BossAbilityResult {
  switch (ability) {
    case BossAbility.REFLECT_SHIELD:
      return applyReflectShield(params);

    case BossAbility.SPAWN_MINIONS:
      return applySpawnMinions(params, extra.summonCount ?? 2);

    case BossAbility.LAVA_TRAIL:
      return applyLavaTrail(
        params,
        extra.prevX ?? params.bossEntry.x,
        extra.prevY ?? params.bossEntry.y,
      );

    case BossAbility.TELEPORT_ADJACENT:
      return applyTeleportAdjacent(params);

    case BossAbility.ILLUSION_SPLIT:
      return applyIllusionSplit(params);

    case BossAbility.KNIGHT_JUMP_IGNORE_WALLS:
      return applyKnightJumpIgnoreWalls(params);

    case BossAbility.SPIKE_ON_LAND:
      return applySpikeOnLand(
        params,
        extra.landX ?? params.bossEntry.x,
        extra.landY ?? params.bossEntry.y,
      );

    case BossAbility.CURSE_ON_HIT:
      return applyCurseOnHit(params);

    case BossAbility.PROMOTE_QUEEN:
      return applyPromoteQueen(params);

    case BossAbility.ATTACK_ALL_LINES:
      return applyAttackAllLines(params);

    case BossAbility.VOID_TILES:
      return applyVoidTiles(params);

    case BossAbility.COMPOUNDING_ROT:
      return applyCompoundingRot(params);

    case BossAbility.SPLIT_ROOKS:
      return applySplitRooks(params);

    case BossAbility.ADVANCE_PER_TURN:
      return applyAdvancePerTurn(params);

    case BossAbility.AP_DRAIN:
      return applyApDrain(params);

    case BossAbility.TWIN_FLANK:
      return applyTwinFlank(params);

    case BossAbility.MERGE_BISHOPS:
      return applyMergeBishops(params);

    case BossAbility.MAGIC_REFLECT:
      return applyMagicReflect(params, extra.incomingMagicDamage ?? 0);

    case BossAbility.LARVAE_SPAWN:
      return applyLarvaeSpawn(params);

    case BossAbility.SHELL_ARMOR:
      return applyShellArmor(params);

    case BossAbility.LARVAE_EXPLODE:
      return applyLarvaeExplode(params);

    case BossAbility.SHOCK_TILES:
      return applyShockTiles(
        params,
        extra.prevX ?? params.bossEntry.x,
        extra.prevY ?? params.bossEntry.y,
      );

    case BossAbility.CHAIN_LIGHTNING:
      return applyChainLightning(params);

    case BossAbility.INVINCIBLE_PHASE:
      return applyInvinciblePhase(params);

    case BossAbility.GHOST_SUMMON:
      return applyGhostSummon(params, extra.ghostBossIds ?? []);

    // ── New abilities: bosses 13–20 ──────────────────────────────────────────

    case BossAbility.RESONANCE_SHOCKWAVE:
      return applyResonanceShockwave(params);

    case BossAbility.BOARD_SHRINK:
      return applyBoardShrink(params);

    case BossAbility.MAP_ROTATE:
      return applyMapRotate(params);

    case BossAbility.MIRROR_INVERT:
      return applyMirrorInvert(params);

    case BossAbility.BOARD_CLAIM:
      return applyBoardClaim(params);

    case BossAbility.SPELL_MIRROR:
      return applySpellMirror(
        params,
        extra.mirrorSpellId ?? "unknown",
        extra.mirrorSpellPower ?? 0,
        extra.mirrorSpellRange ?? 1,
      );

    case BossAbility.COMBO_REPLAY:
      return applyComboReplay(params);

    case BossAbility.LIFE_DRAIN:
      return applyLifeDrain(params, extra.damageDealtToPlayer ?? 0);

    case BossAbility.VAMPIRIC_AOE:
      return applyVampiricAoe(params);

    case BossAbility.EXSANGUINATED_DEBUFF:
      return applyExsanguinatedDebuff(params);

    case BossAbility.INK_VEIL:
      return applyInkVeil(params);

    case BossAbility.SCROLL_SUMMON:
      return applyScrollSummon(params, extra.summonCount ?? 3);

    case BossAbility.GLYPH_TRAP:
      return applyGlyphTrap(
        params,
        extra.targetTileX ?? params.bossEntry.x,
        extra.targetTileY ?? params.bossEntry.y,
      );

    case BossAbility.PAGES_OF_DOOM:
      return applyPagesOfDoom(params);

    case BossAbility.DAWN_BUFF:
      return applyDawnBuff(params, extra.bossPhase1TurnCount ?? 1);

    case BossAbility.DUSK_DOT:
      return applyDuskDot(params);

    case BossAbility.MONARCH_ABSORB:
      return applyMonarchAbsorb(params, extra.killedMonarch ?? "dawn");

    case BossAbility.ANCHOR_TILES:
      return applyAnchorTiles(params);

    case BossAbility.PHANTOM_SPAWN:
      return applyPhantomSpawn(params);

    case BossAbility.AP_DRAIN_PASSIVE:
      return applyApDrainPassive(params);

    case BossAbility.DAMAGE_IMMUNE:
      return applyDamageImmune(params);

    default: {
      const _exhaustive: never = ability;
      return { logMessages: [`Unknown ability: ${_exhaustive as string}`] };
    }
  }
}

// ── cleanupBossState ────────────────────────────────────────────────────────────

/**
 * Clears all runtime boss state. Safe to call on battle end or map transition.
 * Boss-specific refs in WorldExploration.tsx should also be reset after this.
 */
export function cleanupBossState(
  bossStateRef: React.MutableRefObject<BossState | null>,
  setBossState: (s: BossState | null) => void,
): void {
  bossStateRef.current = null;
  setBossState(null);
}

// ── Hook export ────────────────────────────────────────────────────────────────────

export interface UseBossSystemParams {
  bossStateRef: React.MutableRefObject<BossState | null>;
  setBossState: (s: BossState | null) => void;
  pendingTimeoutsRef: React.MutableRefObject<
    Set<ReturnType<typeof setTimeout>>
  >;
  aiGenerationRef: React.MutableRefObject<number>;
}

export function useBossSystem(_params: UseBossSystemParams) {
  return {
    initBossState,
    checkPhaseTransition,
    applyBossAbility,
    cleanupBossState: (
      ref: React.MutableRefObject<BossState | null>,
      setter: (s: BossState | null) => void,
    ) => cleanupBossState(ref, setter),
  };
}
