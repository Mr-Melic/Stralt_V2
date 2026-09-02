/**
 * Pure summon AI engine — React-free, DOM-free.
 * Dispatches on summonAI kind to run distinct behaviors for summoned units.
 * All state changes go through ctx callbacks only.
 */

import { starterSpells } from "../data/spellData";
import type { SpellConfig } from "../types/gameTypes";
import type { OccupancyContext } from "./occupancy";
import { isCellFree as sharedIsCellFree } from "./occupancy";
import type { Side, SpellContext } from "./spellEngine";
import {
  type CombatantSnapshot,
  type TargetSnapshot,
  resolveSpellCast,
} from "./spellEngine";

/** Kit spell lookup keyed by spell id — built once from starterSpells. */
const KIT_SPELLS = new Map<string, SpellConfig>(
  starterSpells.map((s) => [s.id, s]),
);

export type SummonAIKind =
  | "hunter"
  | "guardian"
  | "archer"
  | "bomber"
  | "healer";

export interface SummonUnit {
  id: string;
  name: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  side: Side;
  isSummon: true;
  summonAI: SummonAIKind;
  ownerId: string;
  turnsRemaining: number;
  initiative: number;
  pieceType: string;
  level: number;
  stats: {
    sp: number;
    sr: number;
    res: number;
    chc: number;
    init: number;
  };
}

interface Cell {
  x: number;
  y: number;
}

function distance(a: Cell, b: Cell): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function findNearestEnemy(
  summon: SummonUnit,
  ctx: SpellContext,
): { id: string; side: Side; cell: Cell; hp: number; maxHp: number } | null {
  // Scan a reasonable area around the summon for enemies
  const range = 20;
  let nearest: {
    id: string;
    side: Side;
    cell: Cell;
    hp: number;
    maxHp: number;
  } | null = null;
  let bestDist = Number.POSITIVE_INFINITY;

  for (let dx = -range; dx <= range; dx++) {
    for (let dy = -range; dy <= range; dy++) {
      const cell = { x: summon.x + dx, y: summon.y + dy };
      const combatant = ctx.getCombatantAt(cell);
      if (combatant && combatant.side !== summon.side) {
        const dist = Math.abs(dx) + Math.abs(dy);
        if (dist < bestDist) {
          bestDist = dist;
          nearest = {
            id: combatant.id,
            side: combatant.side,
            cell,
            hp: 0, // ctx doesn't expose hp; we'll use the cell for targeting
            maxHp: 0,
          };
        }
      }
    }
  }
  return nearest;
}

function findAllies(
  summon: SummonUnit,
  ctx: SpellContext,
): { id: string; cell: Cell }[] {
  const allies: { id: string; cell: Cell }[] = [];
  const range = 20;
  for (let dx = -range; dx <= range; dx++) {
    for (let dy = -range; dy <= range; dy++) {
      const cell = { x: summon.x + dx, y: summon.y + dy };
      const combatant = ctx.getCombatantAt(cell);
      if (
        combatant &&
        combatant.side === summon.side &&
        combatant.id !== summon.id
      ) {
        allies.push({ id: combatant.id, cell });
      }
    }
  }
  return allies;
}

function getAdjacentEnemies(
  summon: SummonUnit,
  ctx: SpellContext,
): { id: string; cell: Cell }[] {
  const enemies: { id: string; cell: Cell }[] = [];
  const dirs = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];
  for (const d of dirs) {
    const cell = { x: summon.x + d.x, y: summon.y + d.y };
    const combatant = ctx.getCombatantAt(cell);
    if (combatant && combatant.side !== summon.side) {
      enemies.push({ id: combatant.id, cell });
    }
  }
  return enemies;
}

function moveToward(
  summon: SummonUnit,
  target: Cell,
  ctx: SpellContext,
  occupancy?: OccupancyContext,
): boolean {
  const dx = target.x - summon.x;
  const dy = target.y - summon.y;
  const stepX = dx > 0 ? 1 : dx < 0 ? -1 : 0;
  const stepY = dy > 0 ? 1 : dy < 0 ? -1 : 0;

  // Prefer horizontal then vertical
  const candidates: Cell[] = [];
  if (stepX !== 0) candidates.push({ x: summon.x + stepX, y: summon.y });
  if (stepY !== 0) candidates.push({ x: summon.x, y: summon.y + stepY });
  if (stepX !== 0 && stepY !== 0) {
    candidates.push({ x: summon.x + stepX, y: summon.y + stepY });
  }

  for (const cell of candidates) {
    // Layer the shared full-passability check when an OccupancyContext is
    // available; otherwise fall back to the occupancy-only ctx callback.
    const free = occupancy
      ? sharedIsCellFree(cell, occupancy)
      : ctx.isCellFree(cell);
    if (free) {
      summon.x = cell.x;
      summon.y = cell.y;
      return true;
    }
  }
  return false;
}

function moveAway(
  summon: SummonUnit,
  threat: Cell,
  ctx: SpellContext,
  occupancy?: OccupancyContext,
): boolean {
  const dx = summon.x - threat.x;
  const dy = summon.y - threat.y;
  const stepX = dx > 0 ? 1 : dx < 0 ? -1 : 0;
  const stepY = dy > 0 ? 1 : dy < 0 ? -1 : 0;

  const candidates: Cell[] = [];
  if (stepX !== 0) candidates.push({ x: summon.x + stepX, y: summon.y });
  if (stepY !== 0) candidates.push({ x: summon.x, y: summon.y + stepY });
  if (stepX !== 0 && stepY !== 0) {
    candidates.push({ x: summon.x + stepX, y: summon.y + stepY });
  }

  for (const cell of candidates) {
    // Layer the shared full-passability check when an OccupancyContext is
    // available; otherwise fall back to the occupancy-only ctx callback.
    const free = occupancy
      ? sharedIsCellFree(cell, occupancy)
      : ctx.isCellFree(cell);
    if (free) {
      summon.x = cell.x;
      summon.y = cell.y;
      return true;
    }
  }
  return false;
}

function attackAdjacent(
  summon: SummonUnit,
  ctx: SpellContext,
  damage: number,
): boolean {
  const adjacent = getAdjacentEnemies(summon, ctx);
  if (adjacent.length === 0) return false;
  // Attack the first adjacent enemy
  const target = adjacent[0];
  ctx.dealDamage(target.id, damage, { isPhysical: true });
  ctx.log(
    `${summon.name} attacks ${target.id} for ${damage} damage!`,
    "#f87171",
  );
  return true;
}

// ---------------------------------------------------------------------------
// Behavior implementations
// ---------------------------------------------------------------------------

function runHunter(
  summon: SummonUnit,
  ctx: SpellContext,
  occupancy?: OccupancyContext,
): void {
  const enemy = findNearestEnemy(summon, ctx);
  if (!enemy) {
    ctx.log(`${summon.name} (Hunter) sees no enemies.`, "#9ca3af");
    return;
  }

  const dist = distance(summon, enemy.cell);
  if (dist <= 1) {
    const dmg = Math.round(summon.level * 2.5 + 4);
    attackAdjacent(summon, ctx, dmg);
  } else {
    const moved = moveToward(summon, enemy.cell, ctx, occupancy);
    if (moved) {
      ctx.log(`${summon.name} (Hunter) moves toward the enemy.`, "#60a5fa");
    } else {
      ctx.log(`${summon.name} (Hunter) is blocked.`, "#9ca3af");
    }
  }
}

function runGuardian(
  summon: SummonUnit,
  ctx: SpellContext,
  occupancy?: OccupancyContext,
): void {
  // Guardian leashes to owner: we approximate by not moving far from spawn area
  // Guardian leashes to owner: we approximate by not moving far from spawn area
  // Since ctx doesn't expose owner position by id, we use a simple heuristic:
  // stay within ~2 tiles of current position (guardian doesn't chase across map)

  // Attack any enemy adjacent to self
  const selfAdjacent = getAdjacentEnemies(summon, ctx);
  if (selfAdjacent.length > 0) {
    const dmg = Math.round(summon.level * 1.2 + 2);
    attackAdjacent(summon, ctx, dmg);
    return;
  }

  // Attack any enemy adjacent to owner — we can't know owner position precisely,
  // so we scan nearby cells for enemies adjacent to any ally
  const allies = findAllies(summon, ctx);
  for (const ally of allies) {
    const dirs = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ];
    for (const d of dirs) {
      const cell = { x: ally.cell.x + d.x, y: ally.cell.y + d.y };
      const combatant = ctx.getCombatantAt(cell);
      if (combatant && combatant.side !== summon.side) {
        // Move toward this enemy if within leash range
        if (distance(summon, cell) <= 3) {
          const moved = moveToward(summon, cell, ctx, occupancy);
          if (moved) {
            ctx.log(
              `${summon.name} (Guardian) moves to protect an ally.`,
              "#60a5fa",
            );
          }
          return;
        }
      }
    }
  }

  ctx.log(`${summon.name} (Guardian) holds position.`, "#9ca3af");
}

function runArcher(
  summon: SummonUnit,
  ctx: SpellContext,
  occupancy?: OccupancyContext,
): void {
  const enemy = findNearestEnemy(summon, ctx);
  if (!enemy) {
    ctx.log(`${summon.name} (Archer) sees no enemies.`, "#9ca3af");
    return;
  }

  const dist = distance(summon, enemy.cell);
  const adjacentEnemies = getAdjacentEnemies(summon, ctx);

  // If enemy is adjacent, flee
  if (adjacentEnemies.length > 0) {
    const moved = moveAway(summon, adjacentEnemies[0].cell, ctx, occupancy);
    if (moved) {
      ctx.log(`${summon.name} (Archer) retreats to keep distance.`, "#60a5fa");
    } else {
      ctx.log(`${summon.name} (Archer) is cornered!`, "#f87171");
    }
    return;
  }

  // If within range 3, shoot
  if (dist <= 3) {
    const dmg = Math.round(summon.level * 2.0 + 3);
    ctx.dealDamage(enemy.id, dmg, { isPhysical: false });
    ctx.log(
      `${summon.name} (Archer) shoots ${enemy.id} for ${dmg} damage!`,
      "#f87171",
    );
    return;
  }

  // Otherwise move toward enemy
  const moved = moveToward(summon, enemy.cell, ctx, occupancy);
  if (moved) {
    ctx.log(`${summon.name} (Archer) moves into range.`, "#60a5fa");
  } else {
    ctx.log(`${summon.name} (Archer) is blocked.`, "#9ca3af");
  }
}

function runBomber(
  summon: SummonUnit,
  ctx: SpellContext,
  occupancy?: OccupancyContext,
): void {
  const enemy = findNearestEnemy(summon, ctx);
  if (!enemy) {
    ctx.log(`${summon.name} (Bomber) sees no enemies.`, "#9ca3af");
    return;
  }

  const dist = distance(summon, enemy.cell);

  // Explode if adjacent or about to expire
  if (dist <= 1 || summon.turnsRemaining <= 1) {
    const aoeDmg = Math.round(summon.level * 3.0 + 6);
    const dirs = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ];
    for (const d of dirs) {
      const cell = { x: summon.x + d.x, y: summon.y + d.y };
      const combatant = ctx.getCombatantAt(cell);
      if (combatant && combatant.side !== summon.side) {
        ctx.dealDamage(combatant.id, aoeDmg, { isPhysical: true });
      }
    }
    ctx.log(
      `${summon.name} (Bomber) EXPLODES for ${aoeDmg} AoE damage and is destroyed!`,
      "#f59e0b",
    );
    summon.hp = 0;
    return;
  }

  // Otherwise rush toward enemy
  const moved = moveToward(summon, enemy.cell, ctx, occupancy);
  if (moved) {
    ctx.log(`${summon.name} (Bomber) rushes toward the enemy.`, "#60a5fa");
  } else {
    ctx.log(`${summon.name} (Bomber) is blocked.`, "#9ca3af");
  }
}

function runHealer(
  summon: SummonUnit,
  ctx: SpellContext,
  occupancy?: OccupancyContext,
): void {
  // Find owner by scanning for the allied unit that isn't a summon and isn't self
  const allies = findAllies(summon, ctx);
  let owner = allies.find((a) => !a.id.startsWith("summon-"));
  if (!owner && allies.length > 0) owner = allies[0];

  if (!owner) {
    ctx.log(`${summon.name} (Healer) finds no owner to heal.`, "#9ca3af");
    return;
  }

  // Heal owner if injured
  // Since ctx doesn't expose hp directly, we rely on the heal callback to cap
  const healAmount = Math.round(summon.level * 1.5 + 3);
  ctx.heal(owner.id, healAmount);
  ctx.log(
    `${summon.name} (Healer) heals ${owner.id} for ${healAmount} HP.`,
    "#4ade80",
  );

  // Stay near owner
  const distToOwner = distance(summon, owner.cell);
  if (distToOwner > 1) {
    const moved = moveToward(summon, owner.cell, ctx, occupancy);
    if (moved) {
      ctx.log(`${summon.name} (Healer) moves closer to its owner.`, "#60a5fa");
    }
  }
}

// ---------------------------------------------------------------------------
// Kit spell casting — summons resolve real kit spells through resolveSpellCast
// ---------------------------------------------------------------------------

const SUMMON_ACCENT = "#a78bfa";

/**
 * Attempt to resolve a kit spell from the summon's kit through resolveSpellCast,
 * using the summon as the caster. Returns true on a clean resolve, false if
 * the spell id is unknown or resolution throws.
 *
 * - Self/ally spells (targetType "self") target the summon's own cell.
 * - Enemy spells target the supplied targetEnemy's cell.
 */
function tryKitCast(
  summon: SummonUnit,
  ctx: SpellContext,
  spellId: string,
  targetEnemy?: {
    id: string;
    side: Side;
    cell: Cell;
    hp: number;
    maxHp: number;
  },
): boolean {
  const spell = KIT_SPELLS.get(spellId);
  if (!spell) return false;

  const caster: CombatantSnapshot = {
    id: summon.id,
    side: summon.side,
    level: summon.level,
    effects: [],
    hp: summon.hp,
    maxHp: summon.maxHp,
    stats: {
      res: summon.stats.res,
      sp: summon.stats.sp,
      fail: 0,
    },
  };

  const isSelf = spell.targetType === "self";
  const target: TargetSnapshot = isSelf
    ? {
        ...caster,
        cell: { x: summon.x, y: summon.y },
      }
    : {
        id: targetEnemy?.id ?? summon.id,
        side: targetEnemy?.side ?? summon.side,
        cell: targetEnemy?.cell ?? { x: summon.x, y: summon.y },
        hp: targetEnemy?.hp ?? 0,
        maxHp: targetEnemy?.maxHp ?? 0,
        level: summon.level,
        effects: [],
        stats: { res: 0, sp: 0 },
      };

  try {
    resolveSpellCast(spell, caster, target, ctx, {
      getStatModifier: (id, stat, _effects) => ctx.getEffectiveStat(id, stat),
      calcScaledDamage: (base, _lvl, _up) => base,
    });
    ctx.log(`${summon.name} casts ${spell.name}.`, SUMMON_ACCENT);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export function runSummonAI(
  summon: SummonUnit,
  ctx: SpellContext,
  occupancy?: OccupancyContext,
): void {
  switch (summon.summonAI) {
    case "hunter": {
      const enemy = findNearestEnemy(summon, ctx);
      const dist = enemy
        ? distance(summon, enemy.cell)
        : Number.POSITIVE_INFINITY;
      let kitCast = false;
      if (enemy) {
        if (dist <= 1) {
          kitCast = tryKitCast(summon, ctx, "physical_attack", enemy);
        } else if (dist <= 2) {
          kitCast = tryKitCast(summon, ctx, "spell-venom-strike", enemy);
        }
      }
      if (kitCast) return;
      ctx.log(`${summon.name} (Hunter) falls back to instinct.`, SUMMON_ACCENT);
      runHunter(summon, ctx, occupancy);
      break;
    }
    case "guardian": {
      // Shield the player if unshielded, else Iron Skin on self.
      const allies = findAllies(summon, ctx);
      const playerAlly = allies.find((a) => !a.id.startsWith("summon-"));
      let kitCast = false;
      if (playerAlly) {
        kitCast = tryKitCast(summon, ctx, "starter-shield", {
          id: playerAlly.id,
          side: summon.side,
          cell: playerAlly.cell,
          hp: 0,
          maxHp: 0,
        });
      }
      if (!kitCast) {
        kitCast = tryKitCast(summon, ctx, "spell-iron-skin");
      }
      if (kitCast) return;
      ctx.log(
        `${summon.name} (Guardian) falls back to instinct.`,
        SUMMON_ACCENT,
      );
      runGuardian(summon, ctx, occupancy);
      break;
    }
    case "archer": {
      const enemy = findNearestEnemy(summon, ctx);
      const dist = enemy
        ? distance(summon, enemy.cell)
        : Number.POSITIVE_INFINITY;
      let kitCast = false;
      if (enemy) {
        if (dist <= 4) {
          kitCast = tryKitCast(summon, ctx, "starter-poison", enemy);
        } else if (dist <= 3) {
          kitCast = tryKitCast(summon, ctx, "spell-slow", enemy);
        }
      }
      if (kitCast) return;
      ctx.log(`${summon.name} (Archer) falls back to instinct.`, SUMMON_ACCENT);
      runArcher(summon, ctx, occupancy);
      break;
    }
    case "bomber": {
      // Inferno at own tile (self-cast AoE).
      const kitCast = tryKitCast(summon, ctx, "spell-inferno");
      if (kitCast) return;
      ctx.log(`${summon.name} (Bomber) falls back to instinct.`, SUMMON_ACCENT);
      runBomber(summon, ctx, occupancy);
      break;
    }
    case "healer": {
      // Heal the most-wounded ally, else Rallying Cry on self.
      const allies = findAllies(summon, ctx);
      const wounded = allies[0];
      let kitCast = false;
      if (wounded) {
        kitCast = tryKitCast(summon, ctx, "starter-heal", {
          id: wounded.id,
          side: summon.side,
          cell: wounded.cell,
          hp: 0,
          maxHp: 0,
        });
      }
      if (!kitCast) {
        kitCast = tryKitCast(summon, ctx, "spell-rallying-cry");
      }
      if (kitCast) return;
      ctx.log(`${summon.name} (Healer) falls back to instinct.`, SUMMON_ACCENT);
      runHealer(summon, ctx, occupancy);
      break;
    }
    default:
      ctx.log(`${summon.name} has unknown AI: ${summon.summonAI}`, "#9ca3af");
  }
}
