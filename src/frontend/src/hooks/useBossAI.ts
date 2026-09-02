/**
 * useBossAI.ts — Boss-specific AI decision functions.
 *
 * All decision functions are pure and synchronous. They return an AIAction
 * describing what the boss wants to do this turn. WorldExploration.tsx applies
 * the action via its own flushSync block inside an enemy AI setTimeout that
 * already guards with the generation counter.
 *
 * Pattern (matches the codebase convention):
 *   const currentGeneration = aiGenerationRef.current;
 *   // ... computation ...
 *   if (aiGenerationRef.current !== currentGeneration) return; // stale, abort
 */

import { BOSS_IDS, BossAbility } from "../types/bossTypes";
import type {
  AIAction,
  BossConfig,
  BossDecisionFn,
  BossId,
  BossState,
  CombatantEntryLike,
} from "../types/bossTypes";
import { applyBossAbility } from "./useBossSystem";

// ── Boss kit spell selection ────────────────────────────────────────────────────

/**
 * Pick the first off-cooldown spell from the boss kit's spell pool for the
 * current phase. A spell is off-cooldown when it is absent from the cooldown
 * map or its remaining cooldown is <= 0. Returns null when the pool is empty
 * or every spell is on cooldown.
 *
 * Cooldown enforcement happens at cast time in WorldExploration.tsx; the
 * decision functions pass an empty Map here so kit spells are always
 * considered available each turn.
 */
function pickBossKitSpell(
  config: BossConfig,
  currentPhase: 1 | 2,
  cooldownMap: Map<string, number>,
): string | null {
  const pool =
    currentPhase === 1
      ? config.phase1.spellPoolIds
      : config.phase2.spellPoolIds;
  for (const spellId of pool) {
    const remaining = cooldownMap.get(spellId);
    if (remaining === undefined || remaining <= 0) {
      return spellId;
    }
  }
  return null;
}

// ── Shared movement helpers ────────────────────────────────────────────────────

function getWalkableMoves(
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
      (p) =>
        p.x >= 0 &&
        p.x < 16 &&
        p.y >= 0 &&
        p.y < 16 &&
        allTiles[p.y]?.[p.x] &&
        !occupied.some((o) => o.x === p.x && o.y === p.y),
    );
}

function dist(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function moveToward(
  boss: CombatantEntryLike,
  target: CombatantEntryLike,
  allTiles: boolean[][],
  allEnemies: CombatantEntryLike[],
): AIAction {
  const occupied = allEnemies
    .filter((e) => e.id !== boss.id)
    .map((e) => ({ x: e.x, y: e.y }));
  occupied.push({ x: target.x, y: target.y });
  const moves = getWalkableMoves(boss.x, boss.y, allTiles, occupied);
  if (moves.length === 0) return { type: "skip" };
  const best = moves.reduce((a, b) =>
    dist(a, target) < dist(b, target) ? a : b,
  );
  return { type: "move", targetX: best.x, targetY: best.y };
}

function attackPlayer(
  boss: CombatantEntryLike,
  player: CombatantEntryLike,
): AIAction {
  return {
    type: "attack",
    targetId: player.id,
    targetX: player.x,
    targetY: player.y,
    logMessage: `${boss.name} attacks!`,
  };
}

function isAdjacent(
  a: { x: number; y: number },
  b: { x: number; y: number },
): boolean {
  return dist(a, b) === 1;
}

// ── Helpers for building BossAbilityParams ──────────────────────────────────

function makeAbilityParams(
  boss: CombatantEntryLike,
  player: CombatantEntryLike,
  allEnemies: CombatantEntryLike[],
  allTiles: boolean[][],
  bossState: BossState,
  currentTurn: number,
) {
  return {
    bossEntry: boss,
    playerEntry: player,
    allEnemies,
    allTiles,
    bossState,
    currentTurn,
  };
}

// ── 1. Pale Archbishop ───────────────────────────────────────────────────────────

export const decidePaleArchbishopAction: BossDecisionFn = (
  boss,
  player,
  allEnemies,
  allTiles,
  bossState,
  config,
  currentTurn,
): AIAction => {
  const p = makeAbilityParams(
    boss,
    player,
    allEnemies,
    allTiles,
    bossState,
    currentTurn,
  );

  // Boss kit spell: prefer the first off-cooldown kit spell for this phase.
  const kitSpellId = pickBossKitSpell(
    config,
    bossState.currentPhase,
    new Map<string, number>(),
  );
  if (kitSpellId) {
    return {
      type: "spell" as const,
      spellId: kitSpellId,
      targetId: player?.id ?? "player",
      targetX: player?.x ?? 0,
      targetY: player?.y ?? 0,
    };
  }

  // Phase 2: Activate reflect shield if not already active, then spawn minions
  if (bossState.currentPhase === 2 && !bossState.reflectShieldActive) {
    const result = applyBossAbility(BossAbility.REFLECT_SHIELD, p);
    return {
      type: "ability",
      ability: BossAbility.REFLECT_SHIELD,
      abilityResult: result,
    };
  }

  // Phase 2: Spawn minions if phase just triggered
  if (
    bossState.currentPhase === 2 &&
    bossState.phase2Triggered &&
    currentTurn % 3 === 0
  ) {
    const result = applyBossAbility(BossAbility.SPAWN_MINIONS, p, {
      summonCount: 2,
    });
    return {
      type: "summon",
      ability: BossAbility.SPAWN_MINIONS,
      abilityResult: result,
    };
  }

  // Adjacent: attack with curse chance
  if (isAdjacent(boss, player)) {
    const curseResult = applyBossAbility(BossAbility.CURSE_ON_HIT, p);
    if (curseResult.debuffsApplied && curseResult.debuffsApplied.length > 0) {
      return {
        type: "ability",
        ability: BossAbility.CURSE_ON_HIT,
        abilityResult: curseResult,
      };
    }
    return attackPlayer(boss, player);
  }

  return moveToward(boss, player, allTiles, allEnemies);
};

// ── 2. Crimson Countess ─────────────────────────────────────────────────────────

export const decideCrimsonCountessAction: BossDecisionFn = (
  boss,
  player,
  allEnemies,
  allTiles,
  bossState,
  config,
  currentTurn,
): AIAction => {
  const p = makeAbilityParams(
    boss,
    player,
    allEnemies,
    allTiles,
    bossState,
    currentTurn,
  );

  // Boss kit spell: prefer the first off-cooldown kit spell for this phase.
  const kitSpellId = pickBossKitSpell(
    config,
    bossState.currentPhase,
    new Map<string, number>(),
  );
  if (kitSpellId) {
    return {
      type: "spell" as const,
      spellId: kitSpellId,
      targetId: player?.id ?? "player",
      targetX: player?.x ?? 0,
      targetY: player?.y ?? 0,
    };
  }

  // Phase 2: Leave lava on every move
  if (bossState.currentPhase === 2) {
    const moveAction = moveToward(boss, player, allTiles, allEnemies);
    if (moveAction.type === "move" && moveAction.targetX !== undefined) {
      const lavaResult = applyBossAbility(BossAbility.LAVA_TRAIL, p, {
        prevX: boss.x,
        prevY: boss.y,
      });
      return {
        type: "move",
        targetX: moveAction.targetX,
        targetY: moveAction.targetY,
        ability: BossAbility.LAVA_TRAIL,
        abilityResult: lavaResult,
        logMessage: `${boss.name} rushes forward leaving lava in her wake!`,
      };
    }
  }

  // Adjacent: attack with 30% bleed chance
  if (isAdjacent(boss, player)) {
    if (Math.random() < 0.3) {
      const rotResult = applyBossAbility(BossAbility.COMPOUNDING_ROT, p);
      return {
        type: "ability",
        ability: BossAbility.COMPOUNDING_ROT,
        abilityResult: rotResult,
        targetId: player.id,
      };
    }
    return attackPlayer(boss, player);
  }

  return moveToward(boss, player, allTiles, allEnemies);
};

// ── 3. Void Grandmaster ─────────────────────────────────────────────────────────

export const decideVoidGrandmasterAction: BossDecisionFn = (
  boss,
  player,
  allEnemies,
  allTiles,
  bossState,
  config,
  currentTurn,
): AIAction => {
  const p = makeAbilityParams(
    boss,
    player,
    allEnemies,
    allTiles,
    bossState,
    currentTurn,
  );

  // Boss kit spell: prefer the first off-cooldown kit spell for this phase.
  const kitSpellId = pickBossKitSpell(
    config,
    bossState.currentPhase,
    new Map<string, number>(),
  );
  if (kitSpellId) {
    return {
      type: "spell" as const,
      spellId: kitSpellId,
      targetId: player?.id ?? "player",
      targetX: player?.x ?? 0,
      targetY: player?.y ?? 0,
    };
  }

  // Phase 2: Teleport adjacent every other turn, then split illusions
  if (bossState.currentPhase === 2) {
    if (currentTurn % 2 === 0 || bossState.illusions.length === 0) {
      const result = applyBossAbility(BossAbility.ILLUSION_SPLIT, p);
      return {
        type: "ability",
        ability: BossAbility.ILLUSION_SPLIT,
        abilityResult: result,
      };
    }
    const teleportResult = applyBossAbility(BossAbility.TELEPORT_ADJACENT, p);
    if (teleportResult.newBossPosition) {
      return {
        type: "move",
        ability: BossAbility.TELEPORT_ADJACENT,
        abilityResult: teleportResult,
        targetX: teleportResult.newBossPosition.x,
        targetY: teleportResult.newBossPosition.y,
      };
    }
  }

  // Phase 1: Teleport adjacent, then attack
  const teleportResult = applyBossAbility(BossAbility.TELEPORT_ADJACENT, p);
  if (teleportResult.newBossPosition) {
    return {
      type: "move",
      ability: BossAbility.TELEPORT_ADJACENT,
      abilityResult: teleportResult,
      targetX: teleportResult.newBossPosition.x,
      targetY: teleportResult.newBossPosition.y,
    };
  }

  if (isAdjacent(boss, player)) return attackPlayer(boss, player);
  return moveToward(boss, player, allTiles, allEnemies);
};

// ── 4. Bone Cavalier ─────────────────────────────────────────────────────────────

export const decideBoneCavalierAction: BossDecisionFn = (
  boss,
  player,
  allEnemies,
  allTiles,
  bossState,
  config,
  currentTurn,
): AIAction => {
  const p = makeAbilityParams(
    boss,
    player,
    allEnemies,
    allTiles,
    bossState,
    currentTurn,
  );

  // Boss kit spell: prefer the first off-cooldown kit spell for this phase.
  const kitSpellId = pickBossKitSpell(
    config,
    bossState.currentPhase,
    new Map<string, number>(),
  );
  if (kitSpellId) {
    return {
      type: "spell" as const,
      spellId: kitSpellId,
      targetId: player?.id ?? "player",
      targetX: player?.x ?? 0,
      targetY: player?.y ?? 0,
    };
  }

  // Always jump with knight pattern (ignoring walls)
  const jumpResult = applyBossAbility(BossAbility.KNIGHT_JUMP_IGNORE_WALLS, p);
  if (jumpResult.newBossPosition) {
    // Phase 2: also plant spikes at landing position
    if (bossState.currentPhase === 2) {
      const spikeResult = applyBossAbility(BossAbility.SPIKE_ON_LAND, p, {
        landX: jumpResult.newBossPosition.x,
        landY: jumpResult.newBossPosition.y,
      });
      return {
        type: "move",
        targetX: jumpResult.newBossPosition.x,
        targetY: jumpResult.newBossPosition.y,
        ability: BossAbility.SPIKE_ON_LAND,
        abilityResult: {
          ...jumpResult,
          newHazardTiles: spikeResult.newHazardTiles,
          logMessages: [
            ...(jumpResult.logMessages ?? []),
            ...(spikeResult.logMessages ?? []),
          ],
        },
      };
    }
    return {
      type: "move",
      targetX: jumpResult.newBossPosition.x,
      targetY: jumpResult.newBossPosition.y,
      ability: BossAbility.KNIGHT_JUMP_IGNORE_WALLS,
      abilityResult: jumpResult,
    };
  }

  if (isAdjacent(boss, player)) return attackPlayer(boss, player);
  return moveToward(boss, player, allTiles, allEnemies);
};

// ── 5. Weeping Pawn ─────────────────────────────────────────────────────────────

export const decideWeepingPawnAction: BossDecisionFn = (
  boss,
  player,
  allEnemies,
  allTiles,
  bossState,
  config,
  currentTurn,
): AIAction => {
  const p = makeAbilityParams(
    boss,
    player,
    allEnemies,
    allTiles,
    bossState,
    currentTurn,
  );

  // Boss kit spell: prefer the first off-cooldown kit spell for this phase.
  const kitSpellId = pickBossKitSpell(
    config,
    bossState.currentPhase,
    new Map<string, number>(),
  );
  if (kitSpellId) {
    return {
      type: "spell" as const,
      spellId: kitSpellId,
      targetId: player?.id ?? "player",
      targetX: player?.x ?? 0,
      targetY: player?.y ?? 0,
    };
  }

  // Phase 2 trigger: promote to queen
  if (!bossState.phase2Triggered && boss.hp / boss.maxHp <= 0.3) {
    const promoteResult = applyBossAbility(BossAbility.PROMOTE_QUEEN, p);
    return {
      type: "promote",
      ability: BossAbility.PROMOTE_QUEEN,
      abilityResult: promoteResult,
    };
  }

  if (isAdjacent(boss, player)) {
    // 25% chance to curse on hit
    const curseResult = applyBossAbility(BossAbility.CURSE_ON_HIT, p);
    if (curseResult.debuffsApplied && curseResult.debuffsApplied.length > 0) {
      return {
        type: "ability",
        ability: BossAbility.CURSE_ON_HIT,
        abilityResult: curseResult,
      };
    }
    return attackPlayer(boss, player);
  }

  return moveToward(boss, player, allTiles, allEnemies);
};

// ── 6. Starborn Queen ──────────────────────────────────────────────────────────

export const decideStarbornQueenAction: BossDecisionFn = (
  boss,
  player,
  allEnemies,
  allTiles,
  bossState,
  config,
  currentTurn,
): AIAction => {
  const p = makeAbilityParams(
    boss,
    player,
    allEnemies,
    allTiles,
    bossState,
    currentTurn,
  );

  // Boss kit spell: prefer the first off-cooldown kit spell for this phase.
  const kitSpellId = pickBossKitSpell(
    config,
    bossState.currentPhase,
    new Map<string, number>(),
  );
  if (kitSpellId) {
    return {
      type: "spell" as const,
      spellId: kitSpellId,
      targetId: player?.id ?? "player",
      targetX: player?.x ?? 0,
      targetY: player?.y ?? 0,
    };
  }

  // Every 3 turns: attack all lines
  if (currentTurn % 3 === 0) {
    const result = applyBossAbility(BossAbility.ATTACK_ALL_LINES, p);
    return {
      type: "ability",
      ability: BossAbility.ATTACK_ALL_LINES,
      abilityResult: result,
    };
  }

  // Phase 2: place void tiles
  if (bossState.currentPhase === 2 && bossState.activeVoidTiles.length < 4) {
    const result = applyBossAbility(BossAbility.VOID_TILES, p);
    return {
      type: "ability",
      ability: BossAbility.VOID_TILES,
      abilityResult: result,
    };
  }

  if (isAdjacent(boss, player)) return attackPlayer(boss, player);
  return moveToward(boss, player, allTiles, allEnemies);
};

// ── 7. Fetid Rook ───────────────────────────────────────────────────────────────

export const decideFetidRookAction: BossDecisionFn = (
  boss,
  player,
  allEnemies,
  allTiles,
  bossState,
  config,
  currentTurn,
): AIAction => {
  const p = makeAbilityParams(
    boss,
    player,
    allEnemies,
    allTiles,
    bossState,
    currentTurn,
  );

  // Boss kit spell: prefer the first off-cooldown kit spell for this phase.
  const kitSpellId = pickBossKitSpell(
    config,
    bossState.currentPhase,
    new Map<string, number>(),
  );
  if (kitSpellId) {
    return {
      type: "spell" as const,
      spellId: kitSpellId,
      targetId: player?.id ?? "player",
      targetX: player?.x ?? 0,
      targetY: player?.y ?? 0,
    };
  }

  // Phase 2 trigger: split into two rooks
  if (bossState.currentPhase === 2 && !bossState.splitRooksSpawned) {
    const result = applyBossAbility(BossAbility.SPLIT_ROOKS, p);
    return {
      type: "split",
      ability: BossAbility.SPLIT_ROOKS,
      abilityResult: result,
    };
  }

  if (isAdjacent(boss, player)) {
    // Apply compounding rot on attack
    const rotResult = applyBossAbility(BossAbility.COMPOUNDING_ROT, p);
    return {
      type: "ability",
      ability: BossAbility.COMPOUNDING_ROT,
      abilityResult: rotResult,
      targetId: player.id,
    };
  }

  return moveToward(boss, player, allTiles, allEnemies);
};

// ── 8. Eternal Pawn King ─────────────────────────────────────────────────────────

export const decideEternalPawnKingAction: BossDecisionFn = (
  boss,
  player,
  allEnemies,
  allTiles,
  bossState,
  config,
  currentTurn,
): AIAction => {
  const p = makeAbilityParams(
    boss,
    player,
    allEnemies,
    allTiles,
    bossState,
    currentTurn,
  );

  // Boss kit spell: prefer the first off-cooldown kit spell for this phase.
  const kitSpellId = pickBossKitSpell(
    config,
    bossState.currentPhase,
    new Map<string, number>(),
  );
  if (kitSpellId) {
    return {
      type: "spell" as const,
      spellId: kitSpellId,
      targetId: player?.id ?? "player",
      targetX: player?.x ?? 0,
      targetY: player?.y ?? 0,
    };
  }

  // Phase 2: drain AP every turn
  if (bossState.currentPhase === 2) {
    const drainResult = applyBossAbility(BossAbility.AP_DRAIN, p);
    return {
      type: "ability",
      ability: BossAbility.AP_DRAIN,
      abilityResult: drainResult,
    };
  }

  // Phase 1: always advance toward the player
  const advanceResult = applyBossAbility(BossAbility.ADVANCE_PER_TURN, p);
  if (advanceResult.newBossPosition) {
    return {
      type: "move",
      targetX: advanceResult.newBossPosition.x,
      targetY: advanceResult.newBossPosition.y,
      ability: BossAbility.ADVANCE_PER_TURN,
      abilityResult: advanceResult,
    };
  }

  if (isAdjacent(boss, player)) return attackPlayer(boss, player);
  return { type: "skip", logMessage: `${boss.name} stands its ground.` };
};

// ── 9. Midnight Bishop ──────────────────────────────────────────────────────────

export const decideMidnightBishopAction: BossDecisionFn = (
  boss,
  player,
  allEnemies,
  allTiles,
  bossState,
  config,
  currentTurn,
): AIAction => {
  const p = makeAbilityParams(
    boss,
    player,
    allEnemies,
    allTiles,
    bossState,
    currentTurn,
  );

  // Boss kit spell: prefer the first off-cooldown kit spell for this phase.
  const kitSpellId = pickBossKitSpell(
    config,
    bossState.currentPhase,
    new Map<string, number>(),
  );
  if (kitSpellId) {
    return {
      type: "spell" as const,
      spellId: kitSpellId,
      targetId: player?.id ?? "player",
      targetX: player?.x ?? 0,
      targetY: player?.y ?? 0,
    };
  }

  // Phase 2: merge if not yet merged
  if (bossState.currentPhase === 2 && !bossState.bishopsMerged) {
    const result = applyBossAbility(BossAbility.MERGE_BISHOPS, p);
    return {
      type: "merge",
      ability: BossAbility.MERGE_BISHOPS,
      abilityResult: result,
    };
  }

  // After merge: reflect magic, attack if adjacent
  if (bossState.bishopsMerged) {
    if (isAdjacent(boss, player)) return attackPlayer(boss, player);
    return moveToward(boss, player, allTiles, allEnemies);
  }

  // Phase 1: flank from both diagonal sides
  const flankResult = applyBossAbility(BossAbility.TWIN_FLANK, p);
  if (currentTurn % 2 === 0) {
    return {
      type: "ability",
      ability: BossAbility.TWIN_FLANK,
      abilityResult: flankResult,
    };
  }

  if (isAdjacent(boss, player)) return attackPlayer(boss, player);
  return moveToward(boss, player, allTiles, allEnemies);
};

// ── 10. Broodmother Rook ────────────────────────────────────────────────────────

export const decideBroodmotherRookAction: BossDecisionFn = (
  boss,
  player,
  allEnemies,
  allTiles,
  bossState,
  config,
  currentTurn,
): AIAction => {
  const p = makeAbilityParams(
    boss,
    player,
    allEnemies,
    allTiles,
    bossState,
    currentTurn,
  );

  // Boss kit spell: prefer the first off-cooldown kit spell for this phase.
  const kitSpellId = pickBossKitSpell(
    config,
    bossState.currentPhase,
    new Map<string, number>(),
  );
  if (kitSpellId) {
    return {
      type: "spell" as const,
      spellId: kitSpellId,
      targetId: player?.id ?? "player",
      targetX: player?.x ?? 0,
      targetY: player?.y ?? 0,
    };
  }

  // Check shell armor status
  const shellResult = applyBossAbility(BossAbility.SHELL_ARMOR, p);
  const isShellActive = bossState.larvae.length > 0;

  // Phase 2: larvae explode on contact (handled on player movement side), spawn more larvae
  if (bossState.currentPhase === 2 && currentTurn % 2 === 0) {
    const larvaeResult = applyBossAbility(BossAbility.LARVAE_SPAWN, p);
    return {
      type: "ability",
      ability: BossAbility.LARVAE_SPAWN,
      abilityResult: {
        ...larvaeResult,
        newBossState: {
          ...larvaeResult.newBossState,
          shellArmorActive: isShellActive,
        },
      },
    };
  }

  // Spawn a larva when hit (every other turn)
  if (currentTurn % 2 === 1) {
    const larvaeResult = applyBossAbility(BossAbility.LARVAE_SPAWN, p);
    return {
      type: "ability",
      ability: BossAbility.LARVAE_SPAWN,
      abilityResult: {
        ...larvaeResult,
        newBossState: {
          ...larvaeResult.newBossState,
          shellArmorActive: isShellActive,
        },
      },
    };
  }

  if (isAdjacent(boss, player)) {
    return {
      type: "attack",
      targetId: player.id,
      abilityResult: shellResult,
      logMessage: `${boss.name} attacks from within her shell!`,
    };
  }

  return moveToward(boss, player, allTiles, allEnemies);
};

// ── 11. Lord of Static ───────────────────────────────────────────────────────────

export const decideLordOfStaticAction: BossDecisionFn = (
  boss,
  player,
  allEnemies,
  allTiles,
  bossState,
  config,
  currentTurn,
): AIAction => {
  const p = makeAbilityParams(
    boss,
    player,
    allEnemies,
    allTiles,
    bossState,
    currentTurn,
  );

  // Boss kit spell: prefer the first off-cooldown kit spell for this phase.
  const kitSpellId = pickBossKitSpell(
    config,
    bossState.currentPhase,
    new Map<string, number>(),
  );
  if (kitSpellId) {
    return {
      type: "spell" as const,
      spellId: kitSpellId,
      targetId: player?.id ?? "player",
      targetX: player?.x ?? 0,
      targetY: player?.y ?? 0,
    };
  }

  // Phase 2: chain lightning every 3 turns
  if (
    bossState.currentPhase === 2 &&
    currentTurn % 3 === 0 &&
    bossState.activeShockTiles.length > 0
  ) {
    const result = applyBossAbility(BossAbility.CHAIN_LIGHTNING, p);
    return {
      type: "ability",
      ability: BossAbility.CHAIN_LIGHTNING,
      abilityResult: result,
    };
  }

  // Move toward player, leave shock tile at previous position
  const moveAction = moveToward(boss, player, allTiles, allEnemies);
  if (moveAction.type === "move" && moveAction.targetX !== undefined) {
    const shockResult = applyBossAbility(BossAbility.SHOCK_TILES, p, {
      prevX: boss.x,
      prevY: boss.y,
    });
    return {
      type: "move",
      targetX: moveAction.targetX,
      targetY: moveAction.targetY,
      ability: BossAbility.SHOCK_TILES,
      abilityResult: shockResult,
    };
  }

  if (isAdjacent(boss, player)) return attackPlayer(boss, player);
  return { type: "skip" };
};

// ── 12. Final Pawn ────────────────────────────────────────────────────────────────

const OTHER_BOSS_IDS = BOSS_IDS.filter((id) => id !== "final_pawn");

export const decideFinalPawnAction: BossDecisionFn = (
  boss,
  player,
  allEnemies,
  allTiles,
  bossState,
  config,
  currentTurn,
): AIAction => {
  const p = makeAbilityParams(
    boss,
    player,
    allEnemies,
    allTiles,
    bossState,
    currentTurn,
  );

  // Boss kit spell: prefer the first off-cooldown kit spell for this phase.
  const kitSpellId = pickBossKitSpell(
    config,
    bossState.currentPhase,
    new Map<string, number>(),
  );
  if (kitSpellId) {
    return {
      type: "spell" as const,
      spellId: kitSpellId,
      targetId: player?.id ?? "player",
      targetX: player?.x ?? 0,
      targetY: player?.y ?? 0,
    };
  }

  // Phase 2 trigger: become invincible and summon all ghost bosses
  if (!bossState.phase2Triggered && boss.hp / boss.maxHp <= 0.1) {
    // First: invincible phase
    const invincResult = applyBossAbility(BossAbility.INVINCIBLE_PHASE, p);
    const ghostResult = applyBossAbility(
      BossAbility.GHOST_SUMMON,
      { ...p, bossState: { ...bossState, invincibleTurnsLeft: 5 } },
      { ghostBossIds: [...OTHER_BOSS_IDS] },
    );
    return {
      type: "summon",
      ability: BossAbility.GHOST_SUMMON,
      abilityResult: {
        ...ghostResult,
        newBossState: {
          ...invincResult.newBossState,
          ...ghostResult.newBossState,
          invincibleTurnsLeft: 5,
          phase2Triggered: true,
          currentPhase: 2,
        },
        logMessages: [
          ...(invincResult.logMessages ?? []),
          ...(ghostResult.logMessages ?? []),
        ],
      },
    };
  }

  // During invincibility countdown: do nothing (invincible)
  if (bossState.invincibleTurnsLeft > 0) {
    return {
      type: "skip",
      abilityResult: {
        newBossState: {
          invincibleTurnsLeft: bossState.invincibleTurnsLeft - 1,
        },
        logMessages: [
          `The Final Pawn is INVINCIBLE (${bossState.invincibleTurnsLeft - 1} turns remaining)!`,
        ],
      },
      logMessage: "The Final Pawn waits, impervious to all damage.",
    };
  }

  // Phase 1: ranged attack when within ~3 tiles but not adjacent
  const d = dist(boss, player);
  if (d <= 3 && d > 1) {
    return {
      type: "attack",
      targetId: player.id,
      targetX: player.x,
      targetY: player.y,
      logMessage: `${boss.name} hurls a feeble projectile from afar!`,
    };
  }

  // Phase 1: weak melee attack
  if (isAdjacent(boss, player)) {
    const baseAtk = attackPlayer(boss, player);
    if (Math.random() < 0.2) {
      const curseResult = applyBossAbility(BossAbility.CURSE_ON_HIT, p);
      if (curseResult.debuffsApplied && curseResult.debuffsApplied.length > 0) {
        return {
          type: "ability",
          ability: BossAbility.CURSE_ON_HIT,
          abilityResult: curseResult,
        };
      }
    }
    return {
      ...baseAtk,
      logMessage: `${boss.name} makes a feeble attack… it barely hurts.`,
    };
  }

  return moveToward(boss, player, allTiles, allEnemies);
};

// ── 13. Alabaster Fortress ─────────────────────────────────────────────────────

export const decideAlabasterFortressAction: BossDecisionFn = (
  boss,
  player,
  allEnemies,
  allTiles,
  bossState,
  config,
  currentTurn,
): AIAction => {
  const p = makeAbilityParams(
    boss,
    player,
    allEnemies,
    allTiles,
    bossState,
    currentTurn,
  );

  // Boss kit spell: prefer the first off-cooldown kit spell for this phase.
  const kitSpellId = pickBossKitSpell(
    config,
    bossState.currentPhase,
    new Map<string, number>(),
  );
  if (kitSpellId) {
    return {
      type: "spell" as const,
      spellId: kitSpellId,
      targetId: player?.id ?? "player",
      targetX: player?.x ?? 0,
      targetY: player?.y ?? 0,
    };
  }

  // Phase 2: board shrinks and boss becomes more vulnerable
  if (bossState.currentPhase === 2) {
    const shrinkResult = applyBossAbility(BossAbility.BOARD_SHRINK, p);
    if (shrinkResult.damageToPlayer && shrinkResult.damageToPlayer > 0) {
      return {
        type: "ability",
        ability: BossAbility.BOARD_SHRINK,
        abilityResult: shrinkResult,
      };
    }
  }

  // Fire resonance shockwave when counter reaches 5
  if ((bossState.resonanceCounter ?? 0) >= 5) {
    const shockResult = applyBossAbility(BossAbility.RESONANCE_SHOCKWAVE, p);
    return {
      type: "ability",
      ability: BossAbility.RESONANCE_SHOCKWAVE,
      abilityResult: shockResult,
    };
  }

  // Adjacent: physical attack (slow, massive tank boss)
  if (isAdjacent(boss, player)) {
    return {
      ...attackPlayer(boss, player),
      logMessage: `${boss.name} slams with crushing stone weight!`,
    };
  }

  return moveToward(boss, player, allTiles, allEnemies);
};

// ── 14. Chessboard Lich ──────────────────────────────────────────────────────────

export const decideChessboardLichAction: BossDecisionFn = (
  boss,
  player,
  allEnemies,
  allTiles,
  bossState,
  config,
  currentTurn,
): AIAction => {
  const p = makeAbilityParams(
    boss,
    player,
    allEnemies,
    allTiles,
    bossState,
    currentTurn,
  );

  // Boss kit spell: prefer the first off-cooldown kit spell for this phase.
  const kitSpellId = pickBossKitSpell(
    config,
    bossState.currentPhase,
    new Map<string, number>(),
  );
  if (kitSpellId) {
    return {
      type: "spell" as const,
      spellId: kitSpellId,
      targetId: player?.id ?? "player",
      targetX: player?.x ?? 0,
      targetY: player?.y ?? 0,
    };
  }

  // Every turn: rotate the board (MAP_ROTATE in phase 1, MIRROR_INVERT in phase 2)
  if (bossState.currentPhase === 2 && currentTurn % 2 === 0) {
    const invertResult = applyBossAbility(BossAbility.MIRROR_INVERT, p);
    return {
      type: "ability",
      ability: BossAbility.MIRROR_INVERT,
      abilityResult: invertResult,
    };
  }

  // Phase 2: claim a 2x2 zone each turn
  if (bossState.currentPhase === 2) {
    const claimResult = applyBossAbility(BossAbility.BOARD_CLAIM, p);
    return {
      type: "ability",
      ability: BossAbility.BOARD_CLAIM,
      abilityResult: claimResult,
    };
  }

  // Phase 1: rotate board each turn
  if (currentTurn % 1 === 0) {
    const rotResult = applyBossAbility(BossAbility.MAP_ROTATE, p);
    return {
      type: "ability",
      ability: BossAbility.MAP_ROTATE,
      abilityResult: rotResult,
    };
  }

  return moveToward(boss, player, allTiles, allEnemies);
};

// ── 16. Mirror Sovereign ─────────────────────────────────────────────────────────

export const decideMirrorSovereignAction: BossDecisionFn = (
  boss,
  player,
  allEnemies,
  allTiles,
  bossState,
  config,
  currentTurn,
): AIAction => {
  const p = makeAbilityParams(
    boss,
    player,
    allEnemies,
    allTiles,
    bossState,
    currentTurn,
  );

  // Boss kit spell: prefer the first off-cooldown kit spell for this phase.
  const kitSpellId = pickBossKitSpell(
    config,
    bossState.currentPhase,
    new Map<string, number>(),
  );
  if (kitSpellId) {
    return {
      type: "spell" as const,
      spellId: kitSpellId,
      targetId: player?.id ?? "player",
      targetX: player?.x ?? 0,
      targetY: player?.y ?? 0,
    };
  }

  // Phase 2: replay the last 3 turns as a combo burst
  if (
    bossState.currentPhase === 2 &&
    (bossState.lastThreeTurnsMirror?.length ?? 0) >= 3
  ) {
    const comboResult = applyBossAbility(BossAbility.COMBO_REPLAY, p);
    return {
      type: "ability",
      ability: BossAbility.COMBO_REPLAY,
      abilityResult: comboResult,
    };
  }

  // Mirror the last spell the player cast back next turn
  const mirrorResult = applyBossAbility(BossAbility.SPELL_MIRROR, p);
  if (mirrorResult.damageToPlayer && mirrorResult.damageToPlayer > 0) {
    return {
      type: "ability",
      ability: BossAbility.SPELL_MIRROR,
      abilityResult: mirrorResult,
    };
  }

  // Adjacent: physical attack
  if (isAdjacent(boss, player)) {
    return {
      ...attackPlayer(boss, player),
      logMessage: `${boss.name} strikes with a mirror shard!`,
    };
  }

  return moveToward(boss, player, allTiles, allEnemies);
};

// ── 17. Starved Vampire Pawn ─────────────────────────────────────────────────────

export const decideStarvedVampirePawnAction: BossDecisionFn = (
  boss,
  player,
  allEnemies,
  allTiles,
  bossState,
  config,
  currentTurn,
): AIAction => {
  const p = makeAbilityParams(
    boss,
    player,
    allEnemies,
    allTiles,
    bossState,
    currentTurn,
  );

  // Boss kit spell: prefer the first off-cooldown kit spell for this phase.
  const kitSpellId = pickBossKitSpell(
    config,
    bossState.currentPhase,
    new Map<string, number>(),
  );
  if (kitSpellId) {
    return {
      type: "spell" as const,
      spellId: kitSpellId,
      targetId: player?.id ?? "player",
      targetX: player?.x ?? 0,
      targetY: player?.y ?? 0,
    };
  }

  // Phase 2 (HP grew to 200% of starting value): vampiric AoE drain
  if (bossState.currentPhase === 2 && currentTurn % 2 === 0) {
    const vampResult = applyBossAbility(BossAbility.VAMPIRIC_AOE, p);
    return {
      type: "ability",
      ability: BossAbility.VAMPIRIC_AOE,
      abilityResult: vampResult,
    };
  }

  // Always try to life-drain on adjacent
  if (isAdjacent(boss, player)) {
    const drainResult = applyBossAbility(BossAbility.LIFE_DRAIN, p);
    return {
      type: "ability",
      ability: BossAbility.LIFE_DRAIN,
      abilityResult: drainResult,
    };
  }

  return moveToward(boss, player, allTiles, allEnemies);
};

// ── 18. Pale Archivist ───────────────────────────────────────────────────────────

export const decidePaleArchivistAction: BossDecisionFn = (
  boss,
  player,
  allEnemies,
  allTiles,
  bossState,
  config,
  currentTurn,
): AIAction => {
  const p = makeAbilityParams(
    boss,
    player,
    allEnemies,
    allTiles,
    bossState,
    currentTurn,
  );

  // Boss kit spell: prefer the first off-cooldown kit spell for this phase.
  const kitSpellId = pickBossKitSpell(
    config,
    bossState.currentPhase,
    new Map<string, number>(),
  );
  if (kitSpellId) {
    return {
      type: "spell" as const,
      spellId: kitSpellId,
      targetId: player?.id ?? "player",
      targetX: player?.x ?? 0,
      targetY: player?.y ?? 0,
    };
  }

  // Phase 2: stack pages of doom debuff every 2 turns
  if (bossState.currentPhase === 2 && currentTurn % 2 === 0) {
    const doomResult = applyBossAbility(BossAbility.PAGES_OF_DOOM, p);
    return {
      type: "ability",
      ability: BossAbility.PAGES_OF_DOOM,
      abilityResult: doomResult,
    };
  }

  // Summon a scroll each turn (scrolls act as minions/summons)
  if (currentTurn % 2 === 1) {
    const scrollResult = applyBossAbility(BossAbility.SCROLL_SUMMON, p);
    return {
      type: "summon",
      ability: BossAbility.SCROLL_SUMMON,
      abilityResult: scrollResult,
    };
  }

  // Place ink veil to hide tiles and set glyph traps
  const inkResult = applyBossAbility(BossAbility.INK_VEIL, p);
  if (inkResult.newBossState) {
    return {
      type: "ability",
      ability: BossAbility.INK_VEIL,
      abilityResult: inkResult,
    };
  }

  if (isAdjacent(boss, player)) {
    return attackPlayer(boss, player);
  }

  return moveToward(boss, player, allTiles, allEnemies);
};

// ── 19. Twin Monarchs ────────────────────────────────────────────────────────────

export const decideTwinMonarchsAction: BossDecisionFn = (
  boss,
  player,
  allEnemies,
  allTiles,
  bossState,
  config,
  currentTurn,
): AIAction => {
  const p = makeAbilityParams(
    boss,
    player,
    allEnemies,
    allTiles,
    bossState,
    currentTurn,
  );

  // Boss kit spell: prefer the first off-cooldown kit spell for this phase.
  const kitSpellId = pickBossKitSpell(
    config,
    bossState.currentPhase,
    new Map<string, number>(),
  );
  if (kitSpellId) {
    return {
      type: "spell" as const,
      spellId: kitSpellId,
      targetId: player?.id ?? "player",
      targetX: player?.x ?? 0,
      targetY: player?.y ?? 0,
    };
  }

  // Phase 2: one monarch absorbed the other — use merged kit
  if (bossState.currentPhase === 2 && !bossState.monarchAbsorbed) {
    const absorbResult = applyBossAbility(BossAbility.MONARCH_ABSORB, p);
    return {
      type: "ability",
      ability: BossAbility.MONARCH_ABSORB,
      abilityResult: absorbResult,
    };
  }

  // Dusk DoT on adjacent hit
  if (isAdjacent(boss, player)) {
    const dotResult = applyBossAbility(BossAbility.DUSK_DOT, p);
    if (dotResult.dotApplied && dotResult.dotApplied.length > 0) {
      return {
        type: "ability",
        ability: BossAbility.DUSK_DOT,
        abilityResult: dotResult,
      };
    }
    return attackPlayer(boss, player);
  }

  // Dawn buff: randomly buff the player every 3rd turn (canon mechanic)
  if (currentTurn % 3 === 0) {
    const buffResult = applyBossAbility(BossAbility.DAWN_BUFF, p);
    if (buffResult.logMessages.length > 0) {
      return {
        type: "ability",
        ability: BossAbility.DAWN_BUFF,
        abilityResult: buffResult,
      };
    }
  }

  return moveToward(boss, player, allTiles, allEnemies);
};

// ── 20. Enthroned Void ───────────────────────────────────────────────────────────

export const decideEnthronedVoidAction: BossDecisionFn = (
  boss,
  player,
  allEnemies,
  allTiles,
  bossState,
  config,
  currentTurn,
): AIAction => {
  const p = makeAbilityParams(
    boss,
    player,
    allEnemies,
    allTiles,
    bossState,
    currentTurn,
  );

  // Boss kit spell: prefer the first off-cooldown kit spell for this phase.
  const kitSpellId = pickBossKitSpell(
    config,
    bossState.currentPhase,
    new Map<string, number>(),
  );
  if (kitSpellId) {
    return {
      type: "spell" as const,
      spellId: kitSpellId,
      targetId: player?.id ?? "player",
      targetX: player?.x ?? 0,
      targetY: player?.y ?? 0,
    };
  }

  // Phase 1: immune to direct damage — place anchor tiles and spawn phantoms
  if (bossState.currentPhase === 1) {
    // Spawn phantom chess pieces every other turn
    if (currentTurn % 2 === 0) {
      const phantomResult = applyBossAbility(BossAbility.PHANTOM_SPAWN, p);
      return {
        type: "summon",
        ability: BossAbility.PHANTOM_SPAWN,
        abilityResult: phantomResult,
      };
    }
    // Place anchor tiles for the player to hit
    const anchorResult = applyBossAbility(BossAbility.ANCHOR_TILES, p);
    return {
      type: "ability",
      ability: BossAbility.ANCHOR_TILES,
      abilityResult: anchorResult,
    };
  }

  // Phase 2 (8 anchors destroyed): become vulnerable, drain AP passively
  if (bossState.currentPhase === 2) {
    const drainResult = applyBossAbility(BossAbility.AP_DRAIN_PASSIVE, p);
    if (drainResult.playerApModifier && drainResult.playerApModifier < 0) {
      return {
        type: "ability",
        ability: BossAbility.AP_DRAIN_PASSIVE,
        abilityResult: drainResult,
      };
    }
    if (isAdjacent(boss, player)) {
      return {
        ...attackPlayer(boss, player),
        logMessage: `${boss.name} coalesces and strikes with void force!`,
      };
    }
    return moveToward(boss, player, allTiles, allEnemies);
  }

  return { type: "skip" };
};

// ── Boss ID lookup map ───────────────────────────────────────────────────────────

const DECISION_MAP: Record<BossId, BossDecisionFn> = {
  pale_archbishop: decidePaleArchbishopAction,
  crimson_countess: decideCrimsonCountessAction,
  void_grandmaster: decideVoidGrandmasterAction,
  bone_cavalier: decideBoneCavalierAction,
  weeping_pawn: decideWeepingPawnAction,
  starborn_queen: decideStarbornQueenAction,
  fetid_rook: decideFetidRookAction,
  eternal_pawn_king: decideEternalPawnKingAction,
  midnight_bishop: decideMidnightBishopAction,
  broodmother_rook: decideBroodmotherRookAction,
  lord_of_static: decideLordOfStaticAction,
  final_pawn: decideFinalPawnAction,
  alabaster_fortress: decideAlabasterFortressAction,
  chessboard_lich: decideChessboardLichAction,
  mirror_sovereign: decideMirrorSovereignAction,
  starved_vampire_pawn: decideStarvedVampirePawnAction,
  pale_archivist: decidePaleArchivistAction,
  twin_monarchs: decideTwinMonarchsAction,
  enthroned_void: decideEnthronedVoidAction,
};

// ── Hook ─────────────────────────────────────────────────────────────────────────

export interface UseBossAIParams {
  aiGenerationRef: React.MutableRefObject<number>;
}

export interface UseBossAIResult {
  isBossId(id: string): boolean;
  getBossDecisionFn(bossId: string): BossDecisionFn | null;
  decidePaleArchbishopAction: BossDecisionFn;
  decideCrimsonCountessAction: BossDecisionFn;
  decideVoidGrandmasterAction: BossDecisionFn;
  decideBoneCavalierAction: BossDecisionFn;
  decideWeepingPawnAction: BossDecisionFn;
  decideStarbornQueenAction: BossDecisionFn;
  decideFetidRookAction: BossDecisionFn;
  decideEternalPawnKingAction: BossDecisionFn;
  decideMidnightBishopAction: BossDecisionFn;
  decideBroodmotherRookAction: BossDecisionFn;
  decideLordOfStaticAction: BossDecisionFn;
  decideFinalPawnAction: BossDecisionFn;
  decideAlabasterFortressAction: BossDecisionFn;
  decideChessboardLichAction: BossDecisionFn;
  decideMirrorSovereignAction: BossDecisionFn;
  decideStarvedVampirePawnAction: BossDecisionFn;
  decidePaleArchivistAction: BossDecisionFn;
  decideTwinMonarchsAction: BossDecisionFn;
  decideEnthronedVoidAction: BossDecisionFn;
  /**
   * Convenience wrapper: runs a boss decision function with the generation
   * counter guard identical to the guard used throughout WorldExploration.tsx.
   *
   *   const action = executeBossDecision(bossId, boss, player, enemies, tiles, state, config, turn);
   *   if (!action) return; // stale generation, abort
   */
  executeBossDecision(
    bossId: string,
    bossEntry: CombatantEntryLike,
    playerEntry: CombatantEntryLike,
    allEnemies: CombatantEntryLike[],
    allTiles: boolean[][],
    bossState: BossState,
    config: BossConfig,
    currentTurn: number,
  ): AIAction | null;
}

// React import for the ref type used in UseBossAIParams
import type React from "react";

export function useBossAI({
  aiGenerationRef,
}: UseBossAIParams): UseBossAIResult {
  function isBossId(id: string): boolean {
    return (BOSS_IDS as readonly string[]).includes(id);
  }

  function getBossDecisionFn(bossId: string): BossDecisionFn | null {
    return DECISION_MAP[bossId as BossId] ?? null;
  }

  function executeBossDecision(
    bossId: string,
    bossEntry: CombatantEntryLike,
    playerEntry: CombatantEntryLike,
    allEnemies: CombatantEntryLike[],
    allTiles: boolean[][],
    bossState: BossState,
    config: BossConfig,
    currentTurn: number,
  ): AIAction | null {
    // Capture generation before any async work
    const currentGeneration = aiGenerationRef.current;

    const decisionFn = getBossDecisionFn(bossId);
    if (!decisionFn) return null;

    const action = decisionFn(
      bossEntry,
      playerEntry,
      allEnemies,
      allTiles,
      bossState,
      config,
      currentTurn,
      currentGeneration,
    );

    // Stale generation check — matches pattern used throughout the codebase
    if (aiGenerationRef.current !== currentGeneration) return null;

    return action;
  }

  return {
    isBossId,
    getBossDecisionFn,
    executeBossDecision,
    decidePaleArchbishopAction,
    decideCrimsonCountessAction,
    decideVoidGrandmasterAction,
    decideBoneCavalierAction,
    decideWeepingPawnAction,
    decideStarbornQueenAction,
    decideFetidRookAction,
    decideEternalPawnKingAction,
    decideMidnightBishopAction,
    decideBroodmotherRookAction,
    decideLordOfStaticAction,
    decideFinalPawnAction,
    decideAlabasterFortressAction,
    decideChessboardLichAction,
    decideMirrorSovereignAction,
    decideStarvedVampirePawnAction,
    decidePaleArchivistAction,
    decideTwinMonarchsAction,
    decideEnthronedVoidAction,
  };
}
