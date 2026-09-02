/**
 * Pure factory for SpellContext.
 *
 * This module is React-free and DOM-free. It MUST NOT import anything from
 * WorldExploration.tsx — the real callback implementations live there and are
 * passed in as deps. The factory simply wires each SpellContext callback to
 * the corresponding dep; it contains no business logic.
 *
 * Usage (from WorldExploration.tsx):
 *   const ctx = createSpellContext({
 *     rng, getEffectiveStat, dealDamage, heal, applyEffect,
 *     placeBarrier, spawnUnit, log, isCellFree, getCombatantAt,
 *   });
 *   resolveSpellCast(spell, caster, target, ctx, helpers);
 */

import type { SpellConfig } from "../types/gameTypes";
import type {
  ActiveEffectLike,
  PlayerCastEnemy,
  PlayerCastTarget,
  PlayerSpellContext,
  Side,
  SpellContext,
  SummonUnitDef,
} from "./spellEngine";

/**
 * Shape of the deps object WorldExploration passes in.
 * Each field is the REAL implementation of the corresponding SpellContext
 * callback, captured from the component's existing inline code paths.
 */
export interface SpellContextDeps {
  /** Existing rng used by the cast path. Returns a float in [0, 1). */
  rng: () => number;
  /** Wraps getStatModifier(combatantId, stat). */
  getEffectiveStat: (combatantId: string, stat: string) => number;
  /**
   * Wraps the existing damage-application path (shield absorb, drain handling,
   * kill handling). Returns the damage actually dealt.
   */
  dealDamage: (
    targetId: string,
    amount: number,
    opts?: { isPhysical?: boolean },
  ) => number;
  /** Wraps the existing heal implementation. */
  heal: (combatantId: string, amount: number) => void;
  /** Wraps the existing ActiveEffect add (applyActiveEffect). */
  applyEffect: (effect: ActiveEffectLike) => void;
  /** Wraps the existing barrier placement. */
  placeBarrier: (cell: { x: number; y: number }, turns: number) => void;
  /**
   * Wraps real summon spawning — creates the summon from unitDef and inserts
   * it via the real state paths (enemies/summons setters + turn order).
   */
  spawnUnit: (
    cell: { x: number; y: number },
    unitDef: SummonUnitDef,
    side: Side,
    lifespan: number,
    spell: any,
  ) => void;
  /**
   * Enemy-side summon spawn callback. Used by enemy summoner archetypes to
   * spawn an enemy-side summon through the same pipeline as player summons.
   * Optional — when absent, enemy summoner casts are no-ops.
   */
  spawnEnemySummon?: (
    gridPos: { x: number; y: number },
    spell: SpellConfig,
  ) => void;
  /** Wraps logBattleEntry. */
  log: (msg: string, color?: string, isSummon?: boolean) => void;
  /** Wraps the existing grid lookup used by movement/targeting. */
  isCellFree: (cell: { x: number; y: number }) => boolean;
  /** Wraps the existing combatant lookup used by movement/targeting. */
  getCombatantAt: (cell: { x: number; y: number }) => {
    id: string;
    side: Side;
  } | null;
}

/**
 * Build a SpellContext from an explicit deps object.
 * Each callback delegates directly to the corresponding dep — no inline logic.
 */
export function createSpellContext(deps: SpellContextDeps): SpellContext {
  return {
    rng: deps.rng,
    getEffectiveStat: deps.getEffectiveStat,
    dealDamage: deps.dealDamage,
    heal: deps.heal,
    applyEffect: deps.applyEffect,
    placeBarrier: deps.placeBarrier,
    spawnUnit: deps.spawnUnit,
    spawnEnemySummon: deps.spawnEnemySummon,
    log: deps.log,
    isCellFree: deps.isCellFree,
    getCombatantAt: deps.getCombatantAt,
  };
}

/**
 * Deps for the player-cast resolver (resolvePlayerCast). Each field is the REAL
 * implementation of the corresponding PlayerSpellContext callback, captured from
 * WorldExploration's existing inline code paths. The factory wires them 1:1.
 *
 * The base SpellContextDeps (above) is a strict subset — the player context
 * re-uses rng/getEffectiveStat/dealDamage/heal/applyEffect/log from the same
 * deps object so the two contexts share the same underlying implementations.
 */
export interface PlayerSpellContextDeps extends SpellContextDeps {
  // ── Scalars read directly from component state/refs ──
  spellFailChance: number;
  chc: number;
  isBloodMoon: boolean;
  isFuryActive: boolean;
  isMirrorField: boolean;
  isPaperWindstorm: boolean;
  playerPosition: { x: number; y: number };
  enemies: PlayerCastEnemy[];
  characterName: string;
  characterStats: {
    level: number;
    hp: number;
    maxHp: number;
    res: number;
    sp: number;
    chc: number;
    ap: number;
    mp: number;
  };
  spellLevels: Record<string, number>;

  // ── Counter / VFX callbacks ──
  onHit: () => void;
  onCritHit: () => void;
  triggerVfx: (targetId: string, vfx: "heal") => void;
  playSound: (name: string, ctx?: string) => void;

  // ── Timestep ──
  consumeTimestep: () => boolean;
  restoreApMp: () => void;

  // ── Sacrifice ──
  loseSelfHp: (amount: number) => number;

  // ── Swap ──
  swapPositions: (targetEnemyId: string) => void;

  // ── Mark ──
  placeMark: (cell: { x: number; y: number }) => void;

  // ── Damage loop ──
  getAoETargets: (
    spell: any,
    gridPos: { x: number; y: number },
    targetEnemy: PlayerCastEnemy | undefined,
  ) => PlayerCastTarget[];
  calculatePlayerDamage: (
    baseDamage: number,
    spellId: string,
    targetEnemy: PlayerCastEnemy,
    gridPos: { x: number; y: number },
    isPhysical: boolean,
    isCrit: boolean,
  ) => { finalDamage: number; breakdown: string };
  applyDamageToEnemy: (
    target: PlayerCastEnemy,
    finalDmg: number,
    spell: any,
    gridPos: { x: number; y: number },
    isCrit: boolean,
    rawDmg: number,
    preCritDmg: number,
    preCritDmgBM: number,
    isFirstTarget: boolean,
  ) => void;
  applyDamageToPlayer: (finalDmg: number) => void;
  mirrorRedirect: (
    targetEnemy: PlayerCastEnemy,
    spell: any,
    gridPos: { x: number; y: number },
  ) => boolean;
  mirrorFieldReflect: (
    spell: any,
    gridPos: { x: number; y: number },
    preCritDmgBM: number,
  ) => boolean;
  paperWindstormMiss: (
    spell: any,
    gridPos: { x: number; y: number },
  ) => boolean;
  activateMirror: () => void;
  placeBarrierTile: (cell: { x: number; y: number }, turns: number) => void;

  // ── Summon ──
  spawnPlayerSummon: (gridPos: { x: number; y: number }, spell: any) => void;

  // ── Range ──
  getEffectiveSpellRange: (baseRange: number, spellId?: string) => number;

  // ── Spell-type history (player only) ──
  /** Records the player's last cast spell type for history/pacifist tracking. */
  recordSpellType: (effectType: string) => void;

  // ── Death pipeline ──
  /**
   * Idempotent combatant death processing. Called by the damage loop after
   * applyDamageToEnemy when a target's post-damage hp drops to <= 0. Returns
   * true if the death sequence ran this call, false if already removed.
   */
  processCombatantDeath: (id: string) => boolean;
}

/**
 * Build a PlayerSpellContext from an explicit deps object.
 * Each callback delegates directly to the corresponding dep — no inline logic.
 * The base SpellContext callbacks (rng, getEffectiveStat, dealDamage, heal,
 * applyEffect, log) are re-used from the same deps so the player context and
 * the enemy/summon-AI context share the same underlying implementations.
 */
export function createPlayerSpellContext(
  deps: PlayerSpellContextDeps,
): PlayerSpellContext {
  return {
    // Base SpellContext callbacks (shared with the enemy/summon-AI resolver)
    rng: deps.rng,
    getEffectiveStat: deps.getEffectiveStat,
    dealDamage: deps.dealDamage,
    heal: deps.heal,
    applyEffect: deps.applyEffect,
    placeBarrier: deps.placeBarrier,
    spawnUnit: deps.spawnUnit,
    spawnEnemySummon: deps.spawnEnemySummon,
    log: deps.log,
    isCellFree: deps.isCellFree,
    getCombatantAt: deps.getCombatantAt,

    // Player-cast scalars
    spellFailChance: deps.spellFailChance,
    chc: deps.chc,
    isBloodMoon: deps.isBloodMoon,
    isFuryActive: deps.isFuryActive,
    isMirrorField: deps.isMirrorField,
    isPaperWindstorm: deps.isPaperWindstorm,
    playerPosition: deps.playerPosition,
    enemies: deps.enemies,
    characterName: deps.characterName,
    characterStats: deps.characterStats,
    spellLevels: deps.spellLevels,

    // Player-cast callbacks
    onHit: deps.onHit,
    onCritHit: deps.onCritHit,
    triggerVfx: deps.triggerVfx,
    playSound: deps.playSound,
    consumeTimestep: deps.consumeTimestep,
    restoreApMp: deps.restoreApMp,
    loseSelfHp: deps.loseSelfHp,
    swapPositions: deps.swapPositions,
    placeMark: deps.placeMark,
    getAoETargets: deps.getAoETargets,
    calculatePlayerDamage: deps.calculatePlayerDamage,
    applyDamageToEnemy: deps.applyDamageToEnemy,
    applyDamageToPlayer: deps.applyDamageToPlayer,
    mirrorRedirect: deps.mirrorRedirect,
    mirrorFieldReflect: deps.mirrorFieldReflect,
    paperWindstormMiss: deps.paperWindstormMiss,
    activateMirror: deps.activateMirror,
    placeBarrierTile: deps.placeBarrierTile,
    spawnPlayerSummon: deps.spawnPlayerSummon,
    getEffectiveSpellRange: deps.getEffectiveSpellRange,
    recordSpellType: deps.recordSpellType,
    processCombatantDeath: deps.processCombatantDeath,
  };
}
