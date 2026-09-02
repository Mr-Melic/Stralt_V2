/**
 * Summon action executor — applies a decided EnemyAction (from
 * decideSummonAction) through the real engine paths.
 *
 * This module is React-free and DOM-free. WorldExploration.tsx builds the
 * SpellContext (summonCtx) and the OccupancyContext, calls decideSummonAction
 * to get an EnemyAction, then calls executeSummonAction to apply it. The
 * executor returns the updated summon state (position, AP, MP, HP) so WX can
 * mutate enemiesRef + setEnemies via the same direct-position-mutation pattern
 * the enemy branch uses (prevEnemies.map, clamp to [0, WORLD_GRID_SIZE-1]).
 *
 * Responsibilities:
 *  - MOVE:   update summon grid position to action.destination, spend MP at
 *            per-tile cost (Chebyshev distance), occupancy-checked via isCellFree.
 *  - CAST:   resolve the summon's kit spell through the SpellContext
 *            (dealDamage / heal / applyEffect), AP deducted. Preserves the
 *            damage / AoE / heal / effect branch logic from the inline WX path.
 *  - MELEE:  dealDamage with summon's atk, AP deducted.
 *  - HOLD:   log only.
 *
 * Bomber kamikaze: after a cast, if the summon is a bomber, HP is dropped to 0
 * (detonation kills the summon). This mirrors the inline WX behavior.
 */

import type { Enemy, SpellConfig } from "../types/gameTypes";
import { logDebugError } from "../utils/debugLogger.ts";
import type { EnemyAction } from "./enemyAI";
import {
  type OccupancyContext,
  isCellFree,
  relocateOffMandatoryCells,
} from "./occupancy.ts";
import type { SpellContext } from "./spellEngine.ts";

export interface SummonExecutorResult {
  /** New grid position after movement (clamped to grid bounds). */
  newPosition: { x: number; y: number };
  /** Remaining AP after the action. */
  currentAp: number;
  /** Remaining MP after movement. */
  currentMp: number;
  /** Updated HP (bomber kamikaze drops this to 0). */
  hp: number;
  /** Log lines emitted (also pushed through summonCtx.log). */
  logLines: string[];
}

export interface SummonExecutorHelpers {
  /** calcScaledDamage(base, level, upgrade) — same helper used by the enemy branch. */
  calcScaledDamage: (base: number, level: number, upgrade: number) => number;
  /** Occupancy context used for movement validation (same one passed to spawnSummonUnit). */
  occupancyCtx: OccupancyContext;
  /** World grid size for clamping. */
  worldGridSize: number;
  /** MP cost per tile of Chebyshev movement. */
  mpCostPerTile: number;
  /** AP cost for a melee action. */
  meleeApCost: number;
  /**
   * Look up an enemy/summon by id from the live enemiesRef snapshot. Used to
   * resolve cast/melee targets (the SpellContext.getCombatantAt only returns
   * {id, side}, not the full combatant needed for AoE blast math).
   */
  getEnemyById: (id: string) => Enemy | undefined;
  /**
   * Resolve AoE blast victims: every enemy within Chebyshev distance
   * blastRadius of the primary target (excluding the primary target and
   * same-side combatants). Caller reads enemiesRef.current and filters by
   * side. Returns the list of secondary victim ids to apply blast damage to.
   */
  getAoEVictims: (primaryTargetId: string, blastRadius: number) => Enemy[];
  /**
   * Optional re-evaluator used by the `kind === "move"` branch to decide a
   * follow-up cast/melee AFTER the move, mirroring the enemy move-then-cast
   * pattern. Receives the summon's post-move state (position, remaining AP/MP)
   * and returns the next EnemyAction to execute, or null if no legal follow-up
   * exists. The executor applies only cast/melee follow-ups (never another
   * move/skip) and only when AP remains. Kept optional so the executor stays
   * decoupled from decideSummonAction (React-free, no engine cycle).
   */
  reevaluate?: (
    postMoveSummon: Enemy,
    currentAp: number,
    currentMp: number,
  ) => EnemyAction | null;
}

/**
 * Apply a decided summon action through the real engine paths.
 * Returns updated summon state so WX can mutate enemiesRef + setEnemies.
 */
export function executeSummonAction(
  action: EnemyAction,
  summon: Enemy,
  summonCtx: SpellContext,
  helpers: SummonExecutorHelpers,
): SummonExecutorResult {
  const maxAp = summon.maxAp ?? 2;
  const maxMp = summon.maxMp ?? 2;
  let x = summon.x;
  let y = summon.y;
  let currentAp = summon.currentAp ?? maxAp;
  let currentMp = summon.currentMp ?? maxMp;
  let hp = summon.hp;
  const logLines: string[] = [];
  const summonLabel = summon.summonAI ?? summon.pieceType ?? summon.id;

  // ── Movement primitive (shared by `move` and any branch carrying a
  // destination). Mirrors the WX enemy move resolution at
  // WorldExploration.tsx:13332-13336 (clamp + apply) and reuses the same
  // isCellFree occupancy check the original MOVE block used.
  const applyMovement = (dest: { x: number; y: number } | undefined) => {
    if (!dest || (dest.x === x && dest.y === y)) return;
    const clamped = {
      x: Math.max(0, Math.min(helpers.worldGridSize - 1, dest.x)),
      y: Math.max(0, Math.min(helpers.worldGridSize - 1, dest.y)),
    };
    if (!isCellFree(clamped, helpers.occupancyCtx)) {
      logLines.push(
        `[move] ${summonLabel} → (${clamped.x},${clamped.y}) blocked (occupied)`,
      );
      return;
    }
    const dist = Math.max(Math.abs(clamped.x - x), Math.abs(clamped.y - y));
    const mpCost = dist * helpers.mpCostPerTile;
    if (currentMp < mpCost) {
      logLines.push(
        `[move] ${summonLabel} → (${clamped.x},${clamped.y}) blocked (need ${mpCost}MP, have ${currentMp}MP)`,
      );
      return;
    }
    x = clamped.x;
    y = clamped.y;
    currentMp -= mpCost;
    const reserved = helpers.occupancyCtx.reserved;
    if (reserved?.has(`${x},${y}`)) {
      const [slid] = relocateOffMandatoryCells(
        [{ x, y }],
        reserved,
        helpers.occupancyCtx,
      );
      if (slid.x !== x || slid.y !== y) {
        logLines.push(
          `[move] ${summonLabel} slid off unique bridge (${x},${y}) → (${slid.x},${slid.y})`,
        );
        x = slid.x;
        y = slid.y;
      }
    }
    logLines.push(`[move] ${summonLabel} → (${x},${y}) spent ${mpCost}MP`);
  };

  // ── Cast primitive (shared by the `cast` branch and the move-then-cast
  // re-evaluation follow-up). Returns true when AP was spent on a real cast.
  const applyCast = (spell: SpellConfig, targetId: string): boolean => {
    const apCost = Number(spell.apCost ?? 0);
    if (currentAp < apCost) {
      logLines.push(
        `[cast] ${summonLabel} ${spell.name} → ${targetId} blocked (need ${apCost}AP, have ${currentAp}AP)`,
      );
      return false;
    }
    const target = helpers.getEnemyById(targetId);
    const damage = Number(spell.damage ?? 0);
    const healAmount = Number(spell.healAmount ?? 0);
    if (damage > 0 && target) {
      const baseDmg = helpers.calcScaledDamage(damage, summon.level, 0);
      summonCtx.dealDamage(targetId, baseDmg);
      const blastR = Number(spell.areaRadius ?? 0);
      if (blastR > 0) {
        for (const victim of helpers.getAoEVictims(targetId, blastR)) {
          summonCtx.dealDamage(victim.id, baseDmg);
        }
      }
      currentAp -= apCost;
      logLines.push(
        `[cast] ${summonLabel} ${spell.name} → ${targetId} for ${baseDmg}`,
      );
      if (summon.summonAI === "bomber") {
        hp = 0;
        logLines.push(`[cast] ${summonLabel} ${spell.name} detonated (hp=0)`);
      }
      return true;
    }
    if (healAmount > 0) {
      summonCtx.heal(targetId, healAmount);
      currentAp -= apCost;
      logLines.push(
        `[cast] ${summonLabel} ${spell.name} → ${targetId} healed ${healAmount}`,
      );
      return true;
    }
    summonCtx.applyEffect({
      effectName: spell.name ?? spell.effectType,
      type: (spell.effectType === "buff"
        ? "buff"
        : spell.effectType === "debuff"
          ? "debuff"
          : "dot") as "buff" | "debuff" | "dot",
      targetId,
      duration:
        spell.buffDuration ?? spell.debuffDuration ?? spell.dotDuration ?? 1,
      iconEmoji: spell.iconEmoji ?? "✨",
      description: spell.description ?? "",
    });
    currentAp -= apCost;
    logLines.push(
      `[cast] ${summonLabel} ${spell.name} → ${targetId} applied effect`,
    );
    return true;
  };

  // ── Melee primitive (shared by the `melee` branch and the move-then-melee
  // re-evaluation follow-up). Returns true when AP was spent on a real hit.
  const applyMelee = (targetId: string): boolean => {
    const apCost = helpers.meleeApCost;
    if (currentAp < apCost) {
      logLines.push(
        `[melee] ${summonLabel} → ${targetId} blocked (need ${apCost}AP, have ${currentAp}AP)`,
      );
      return false;
    }
    const dmg = helpers.calcScaledDamage(
      summon.atk ?? summon.level,
      summon.level,
      0,
    );
    summonCtx.dealDamage(targetId, dmg);
    currentAp -= apCost;
    logLines.push(`[melee] ${summonLabel} → ${targetId} for ${dmg}`);
    return true;
  };

  // ── [decide] line: log the chosen action before dispatching ────────────
  logLines.push(
    `[decide] ${summonLabel}: ${action.archetype ?? "unknown"} → ${action.kind} ${action.intent ?? ""} ${action.spell?.name ?? action.targetId ?? ""} (${action.intent ?? "no intent"})`,
  );

  // ── Dispatch on action.kind (explicit branches; no fallthrough mis-log) ─
  switch (action.kind) {
    case "move": {
      // Move intent log — mirrors the WX enemy move intent log at
      // WorldExploration.tsx:13717-13720 ("{pieceType} {intent}"). Replaces
      // the previous mis-log of move actions as [SUMMON-HOLD].
      logLines.push(`[move] ${summonLabel}: ${action.intent ?? "closes in"}`);
      applyMovement(action.destination);
      // Re-evaluate once with remaining AP — mirrors the enemy move-then-cast
      // pattern. If the archetype now sees a legal cast/melee from the new
      // position, execute it in the same turn. Only cast/melee follow-ups are
      // applied (never a second move/skip), and only when AP remains.
      if (helpers.reevaluate && currentAp > 0 && hp > 0) {
        const postMoveSummon: Enemy = { ...summon, x, y, currentAp, currentMp };
        const followUp = helpers.reevaluate(
          postMoveSummon,
          currentAp,
          currentMp,
        );
        if (
          followUp &&
          (followUp.kind === "cast" || followUp.kind === "melee")
        ) {
          if (followUp.kind === "cast" && followUp.spell && followUp.targetId) {
            applyCast(followUp.spell, followUp.targetId);
          } else if (followUp.kind === "melee" && followUp.targetId) {
            applyMelee(followUp.targetId);
          }
        }
      }
      break;
    }
    case "cast": {
      if (action.spell && action.targetId) {
        applyCast(action.spell, action.targetId);
      } else {
        // Defensive: cast kind without spell/target — log and treat as hold.
        logDebugError("SUMMON", "cast action missing spell/target", {
          id: summon.id,
          archetype: action.archetype,
        });
        logLines.push(
          `[skip] ${summonLabel}: ${action.intent ?? "cast missing spell/target"}`,
        );
      }
      break;
    }
    case "melee": {
      if (action.targetId) {
        applyMelee(action.targetId);
      } else {
        logDebugError("SUMMON", "melee action missing target", {
          id: summon.id,
          archetype: action.archetype,
        });
        logLines.push(
          `[skip] ${summonLabel}: ${action.intent ?? "melee missing target"}`,
        );
      }
      break;
    }
    case "skip": {
      logLines.push(`[skip] ${summonLabel}: ${action.intent ?? "holds"}`);
      break;
    }
    default: {
      // Unknown/unhandled kind — never silent, never hang. The WX summon
      // branch's try/finally guarantee advances the turn regardless.
      logDebugError("SUMMON", "unhandled action kind", {
        kind: (action as EnemyAction).kind,
        archetype: action.archetype,
      });
      logLines.push(
        `[skip] ${summonLabel}: unhandled kind (${String((action as EnemyAction).kind)})`,
      );
    }
  }

  // ── [end] line: mark turn complete before emitting ────────────────────
  logLines.push(`[end] ${summonLabel} turn complete`);

  // ── Emit logs through the real SpellContext log channel ───────────────
  for (const line of logLines) {
    summonCtx.log(line, action.intentColor ?? "#a78bfa", true);
  }

  return { newPosition: { x, y }, currentAp, currentMp, hp, logLines };
}
