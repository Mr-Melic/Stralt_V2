/**
 * Pure spell resolution engine — React-free, DOM-free.
 * Designed for use by both player and enemy casters.
 * New spells are data-only: add fields to SpellConfig and the engine reads them.
 *
 * Fields the engine reads from a spell object:
 *   damage, isPhysical, spellType, buffStat, buffModifier, buffDuration,
 *   debuffStat, debuffModifier, debuffDuration, drainPercent,
 *   isBarrier, isTrap, isMark, aoe, hitsMultiple, hitsAllies,
 *   isDotSpell, dotDamage, dotDuration, dotType, dotDamagePerTurn,
 *   name, apCost, mpCost, range, targetType, effectType, effectCategory,
 *   effectParams, isSwap, isMirror, isTimestep, isSacrifice, cooldown,
 *   minLevel, usableByPlayer, usableByEnemy, healAmount, iconEmoji
 */

import type { SpellConfig } from "../types/gameTypes";
import { logDebugInfo } from "../utils/debugLogger";
import { isActiveHostile } from "./battleSetup";

export type Side = "player" | "enemy";

export interface SummonUnitDef {
  pieceType: string;
  level: number;
  hpScale?: number;
  damageScale?: number;
  /** Spell ids (from data/spellData.ts) the summon can cast via its AI kit. */
  summonKit?: string[];
  /** Per-turn Action Point budget. Falls back to SUMMON_AP[summonAI]. */
  ap?: number;
  /** Per-turn Mana Point budget. Falls back to SUMMON_MP[summonAI]. */
  mp?: number;
}

export interface ActiveEffectLike {
  id?: string;
  effectName: string;
  type: "buff" | "debuff" | "dot";
  targetId: string;
  stat?: string;
  modifier?: number;
  duration: number;
  iconEmoji: string;
  description: string;
  dotDamagePerTurn?: number;
}

export interface SpellContext {
  rng(): number;
  getEffectiveStat(combatantId: string, stat: string): number;
  dealDamage(
    targetId: string,
    amount: number,
    opts?: { isPhysical?: boolean },
  ): number;
  heal(combatantId: string, amount: number): void;
  applyEffect(effect: ActiveEffectLike): void;
  placeBarrier(cell: { x: number; y: number }, turns: number): void;
  spawnUnit(
    cell: { x: number; y: number },
    unitDef: SummonUnitDef,
    side: Side,
    lifespan: number,
    spell: any,
  ): void;
  /**
   * Enemy-side summon spawn callback. Used by enemy summoner archetypes to
   * spawn an enemy-side summon (red OWNER_TINT) through the same pipeline as
   * player summons. Optional — when absent, callers fall back to spawnUnit.
   */
  spawnEnemySummon?(cell: { x: number; y: number }, spell: SpellConfig): void;
  log(msg: string, color?: string, isSummon?: boolean): void;
  isCellFree(cell: { x: number; y: number }): boolean;
  getCombatantAt(cell: { x: number; y: number }): {
    id: string;
    side: Side;
  } | null;
}

/**
 * Extended context used ONLY by resolvePlayerCast — the byte-identical
 * replication of the inline player cast path in WorldExploration.tsx.
 * Every callback here is a thin dep wired in WorldExploration to an existing
 * inline function. The base SpellContext (above) is left untouched so the
 * enemy/summon-AI resolver (resolveSpellCast) keeps its simpler contract.
 *
 * Fields:
 *   - spellFailChance: component state value used by the inline FAIL roll
 *       (inline: `Math.random()*100 < spellFailChance`).
 *   - chc: player's crit chance (inline: `Math.random()*100 < characterStats.chc`).
 *   - onHit: increments battleHitsRef (inline: `battleHitsRef.current += 1`).
 *   - onCritHit: increments battleCritHitsRef (inline: `battleCritHitsRef.current += 1`).
 *   - triggerVfx: heal VFX trigger (inline heal branch).
 *   - consumeTimestep: returns true if timestep already used, else marks it used
 *       and returns false (inline: `if (timestepUsedRef.current) {...} timestepUsedRef.current = true`).
 *   - restoreApMp: restores AP+MP to full (inline: `setCurrentBattleAp(maxAp); setCurrentBattleMp(maxMp)`).
 *   - loseSelfHp: lose HP without going below 1 (inline Sacrifice: `Math.max(1, hp - hpLoss)`).
 *   - swapPositions: swap player/enemy positions (inline Swap branch).
 *   - placeMark: add a tile to the marked-tiles set (inline Mark branch).
 *   - getAoETargets: build the multi-target/AoE target list (inline target building).
 *   - calculatePlayerDamage: wraps the INLINE computeDamage at WorldExploration.tsx:1916
 *       (NOT the engine computeDamage). Returns { finalDamage, breakdown }.
 *   - applyDamageToEnemy: applies finalDmg to an enemy via the inline path
 *       (enemyHpMap update + turnOrder update + kill handling + Chain Lightning
 *       bounces + drain heal). This is the per-target body of the inline damage loop.
 *   - applyDamageToPlayer: applies finalDmg to the player (hitsAllies __player__ branch).
 *   - mirrorRedirect: inline Mirror-redirect branch (target has mirror active).
 *   - mirrorFieldReflect: inline Mirror Field 20% reflect branch.
 *   - paperWindstormMiss: inline Paper Windstorm miss check; returns true if missed.
 *   - activateMirror: inline Mirror spell activation (mirrorUnitsRef.add("player")).
 *   - placeBarrierTile: inline Barrier placement (barrierTilesRef.set + clear cache).
 *   - spawnPlayerSummon: inline summon spawn with the full inline arg list.
 *   - playSound: wraps the inline playSound(name, ctx?) no-op stub.
 *   - isBloodMoon / isFuryActive / isMirrorField / isPaperWindstorm: component flags.
 *   - getEffectiveSpellRange: wraps the inline getEffectiveSpellRange.
 *   - playerPosition / enemies / characterName / characterStats: snapshots the
 *       resolver reads (mirrors what the inline path closes over).
 */
export interface PlayerSpellContext extends SpellContext {
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
  onHit(): void;
  onCritHit(): void;
  triggerVfx(targetId: string, vfx: "heal"): void;
  playSound(name: string, ctx?: string): void;

  // ── Timestep ──
  /** Returns true if timestep already used (caller aborts); false if it consumed it. */
  consumeTimestep(): boolean;
  restoreApMp(): void;

  // ── Sacrifice ──
  /** Lose HP without going below 1. Returns the HP actually lost. */
  loseSelfHp(amount: number): number;

  // ── Swap ──
  swapPositions(targetEnemyId: string): void;

  // ── Mark ──
  placeMark(cell: { x: number; y: number }): void;

  // ── Damage loop ──
  /** Build the multi-target/AoE target list for the spell (inline target building). */
  getAoETargets(
    spell: any,
    gridPos: { x: number; y: number },
    targetEnemy: PlayerCastEnemy | undefined,
  ): PlayerCastTarget[];
  /** Wraps the INLINE computeDamage (WorldExploration.tsx:1916). */
  calculatePlayerDamage(
    baseDamage: number,
    spellId: string,
    targetEnemy: PlayerCastEnemy,
    gridPos: { x: number; y: number },
    isPhysical: boolean,
    isCrit: boolean,
  ): { finalDamage: number; breakdown: string };
  /** Per-target damage application (enemyHpMap + turnOrder + kill + bounces + drain). */
  applyDamageToEnemy(
    target: PlayerCastEnemy,
    finalDmg: number,
    spell: any,
    gridPos: { x: number; y: number },
    isCrit: boolean,
    rawDmg: number,
    preCritDmg: number,
    preCritDmgBM: number,
    isFirstTarget: boolean,
  ): void;
  /**
   * Idempotent combatant death processing. Called by the damage loop after
   * applyDamageToEnemy when a target's post-damage hp drops to <= 0. Returns
   * true if the death sequence ran this call, false if already removed.
   */
  processCombatantDeath: (id: string) => boolean;
  /** hitsAllies __player__ branch — apply finalDmg to the player. */
  applyDamageToPlayer(finalDmg: number): void;
  /** Inline Mirror-redirect branch (target has mirror active). Returns true if redirected. */
  mirrorRedirect(
    targetEnemy: PlayerCastEnemy,
    spell: any,
    gridPos: { x: number; y: number },
  ): boolean;
  /** Inline Mirror Field 20% reflect branch. Returns true if reflected. */
  mirrorFieldReflect(
    spell: any,
    gridPos: { x: number; y: number },
    preCritDmgBM: number,
  ): boolean;
  /** Inline Paper Windstorm miss check. Returns true if the spell missed. */
  paperWindstormMiss(spell: any, gridPos: { x: number; y: number }): boolean;
  /** Inline Mirror spell activation (mirrorUnitsRef.add("player")). */
  activateMirror(): void;
  /** Inline Barrier placement (barrierTilesRef.set + clear cache). */
  placeBarrierTile(cell: { x: number; y: number }, turns: number): void;

  // ── Summon ──
  /** Inline summon spawn with the full inline arg list. */
  spawnPlayerSummon(gridPos: { x: number; y: number }, spell: any): void;

  // ── Range ──
  getEffectiveSpellRange(baseRange: number, spellId?: string): number;

  // ── Spell-type history (player only) ──
  /** Records the player's last cast spell type for history/pacifist tracking. */
  recordSpellType(effectType: string): void;
}

/**
 * Minimal enemy shape the resolver reads. Mirrors the fields the inline path
 * touches on `Enemy` (types/gameTypes.ts) without importing the full type —
 * keeps the engine React-free and DOM-free.
 */
export interface PlayerCastEnemy {
  id: string;
  x: number;
  y: number;
  level: number;
  hp: number;
  maxHp: number;
  res: number;
  sp: number;
  chc: number;
  pieceType: string;
  family?: string;
  isBoss?: boolean;
  isSummon?: boolean;
  side?: Side;
}

/**
 * A target the damage loop iterates over. Either a real enemy or the
 * "__player__" sentinel used by hitsAllies spells.
 */
export interface PlayerCastTarget {
  id: string;
  pieceType: string;
  x: number;
  y: number;
  level: number;
  hp: number;
  maxHp: number;
  res: number;
  sp: number;
  chc: number;
  family?: string;
  isBoss?: boolean;
  /**
   * True only on the "__player__" sentinel emitted by hitsAllies spells.
   * Optional because real Enemy objects flow through the same HitTarget union
   * and are not player-controlled; the damage loop branches on
   * `hitTarget.id === "__player__"` rather than reading this flag, so omitting
   * it on enemy entries is behavior-preserving.
   */
  isPlayer?: boolean;
}

/**
 * Result of resolvePlayerCast. The caller (WorldExploration) branches on this
 * to decide whether to deduct AP / set cooldowns / deselect — matching the
 * inline path's per-branch early-return behavior.
 *
 *   - "cast":       a normal cast completed → caller deducts AP + sets cooldown.
 *   - "fizzled":    FAIL roll fired → caller deducts AP (no cooldown) + maybe deselect.
 *   - "no_ap":       caller already handled AP (e.g. timestep) → do NOT deduct again.
 *   - "summon":     summon spawned → caller does NOT deduct AP (preserves inline bug).
 *   - "abort":      early abort (timestep already used, no target in range, etc.)
 *                   → caller does NOT deduct AP.
 */
export type PlayerCastResult =
  | "cast"
  | "fizzled"
  | "no_ap"
  | "summon"
  | "abort";

export interface CombatantSnapshot {
  id: string;
  side: Side;
  level: number;
  effects: ActiveEffectLike[];
  hp: number;
  maxHp: number;
  stats: {
    res: number;
    sp: number;
    sr?: number;
    fail?: number;
    [k: string]: number | undefined;
  };
}

export interface TargetSnapshot {
  id: string;
  side: Side;
  cell: { x: number; y: number };
  hp: number;
  maxHp: number;
  level: number;
  effects: ActiveEffectLike[];
  stats: {
    res: number;
    sp: number;
    sr?: number;
    [k: string]: number | undefined;
  };
}

export function computeDamage(params: {
  baseDamage: number;
  casterLevel: number;
  spellUpgradeLevel?: number;
  isCrit?: boolean;
  hasMark?: boolean;
  dmgBuffModifier?: number;
  /** Caster's Spell Power — flat % bonus to damage AND healing (SP 8 = +8%). */
  casterSp?: number;
  /** Target's Spell Resistance — flat % reduction to INCOMING spell damage (excludes DoT ticks). */
  targetSr?: number;
  targetRes: number;
  targetSp: number;
  targetEffects: ActiveEffectLike[];
  getStatModifier: (
    targetId: string,
    stat: string,
    effects: ActiveEffectLike[],
  ) => number;
  calcScaledDamage: (base: number, level: number, upgrade: number) => number;
}): { finalDamage: number; breakdown: string } {
  const {
    baseDamage,
    casterLevel,
    spellUpgradeLevel = 0,
    isCrit = false,
    hasMark = false,
    dmgBuffModifier = 1.0,
    casterSp = 0,
    targetSr = 0,
    targetRes,
    targetSp: _targetSp,
    targetEffects,
    getStatModifier,
    calcScaledDamage,
  } = params;

  let dmg = calcScaledDamage(baseDamage, casterLevel, spellUpgradeLevel);
  const steps: string[] = [`base ${baseDamage}`];

  steps.push(`scaled ${Math.round(dmg)}`);

  // SP (Spell Power): flat % bonus to spell damage (SP 8 = +8%)
  if (casterSp > 0) {
    dmg *= 1 + casterSp / 100;
    steps.push(`sp +${casterSp}%`);
  }

  if (dmgBuffModifier !== 1.0) {
    dmg *= dmgBuffModifier;
    steps.push(`buff ${dmgBuffModifier.toFixed(2)}`);
  }

  if (hasMark) {
    dmg *= 2;
    steps.push("mark 2.0");
  }

  if (isCrit) {
    dmg *= 2;
    steps.push("crit 2.0");
  }

  // SR (Spell Resistance): flat % reduction to incoming spell damage (excludes DoT ticks).
  // RES: flat % reduction to ALL incoming damage (multiplicative with SR for spells).
  // Stacking order (multiplicative): finalDamage = baseDamage * (1 - SR/100) * (1 - RES/100) for spells.
  const srMod = getStatModifier("", "sr", targetEffects);
  const effectiveSr = targetSr * srMod;
  const resMod = getStatModifier("", "res", targetEffects);
  const effectiveRes = targetRes * resMod;
  const srFactor = Math.max(0, 1 - effectiveSr / 100);
  const resFactor = Math.max(0, 1 - effectiveRes / 100);
  dmg = dmg * srFactor * resFactor;
  steps.push(
    `sr ${Math.round(effectiveSr)}% × res ${Math.round(effectiveRes)}%`,
  );

  const finalDamage = Math.max(1, Math.round(dmg));
  steps.push(`final ${finalDamage}`);

  return { finalDamage, breakdown: steps.join(" → ") };
}

export function resolveSpellCast(
  spell: any,
  caster: CombatantSnapshot,
  target: TargetSnapshot,
  ctx: SpellContext,
  helpers: {
    getStatModifier: (
      targetId: string,
      stat: string,
      effects: ActiveEffectLike[],
    ) => number;
    calcScaledDamage: (base: number, level: number, upgrade: number) => number;
  },
): void {
  // FAIL roll first
  const failChance = (caster.stats.fail ?? 0) / 100;
  if (ctx.rng() < failChance) {
    ctx.log(`${spell.name} fizzled!`, "#ef4444");
    return;
  }

  // Static summon (barrier)
  if (spell.isBarrier) {
    ctx.placeBarrier(target.cell, 2);
    ctx.log(`${spell.name} placed a barrier!`, "#818cf8");
    return;
  }

  // Trap
  if (spell.isTrap) {
    ctx.placeBarrier(target.cell, 3);
    ctx.log(`${spell.name} placed a trap!`, "#f59e0b");
    return;
  }

  // Drain / Lifesteal
  const isDrain =
    spell.spellType === "drain" ||
    (spell.effectType &&
      String(spell.effectType).toLowerCase().includes("drain"));

  if (spell.damage > 0 && isDrain) {
    const { finalDamage } = computeDamage({
      baseDamage: Number(spell.damage),
      casterLevel: caster.level,
      spellUpgradeLevel: spell.upgradeLevel ?? 0,
      isCrit: false,
      hasMark: false,
      dmgBuffModifier: 1.0,
      casterSp: caster.stats.sp ?? 0,
      targetSr: target.stats.sr ?? 0,
      targetRes: target.stats.res ?? 0,
      targetSp: target.stats.sp ?? 0,
      targetEffects: target.effects,
      getStatModifier: helpers.getStatModifier,
      calcScaledDamage: helpers.calcScaledDamage,
    });
    ctx.dealDamage(target.id, finalDamage, { isPhysical: spell.isPhysical });
    const drainPercent = spell.drainPercent ?? 0.5;
    const healAmount = Math.round(finalDamage * drainPercent);
    const cappedHeal = Math.min(healAmount, caster.maxHp - caster.hp);
    ctx.heal(caster.id, cappedHeal);
    ctx.log(
      `${spell.name} drained ${finalDamage} and healed ${cappedHeal}!`,
      "#10b981",
    );
    return;
  }

  // Damage
  if (spell.damage > 0) {
    const { finalDamage, breakdown } = computeDamage({
      baseDamage: Number(spell.damage),
      casterLevel: caster.level,
      spellUpgradeLevel: spell.upgradeLevel ?? 0,
      isCrit: false,
      hasMark: false,
      dmgBuffModifier: 1.0,
      casterSp: caster.stats.sp ?? 0,
      targetSr: target.stats.sr ?? 0,
      targetRes: target.stats.res ?? 0,
      targetSp: target.stats.sp ?? 0,
      targetEffects: target.effects,
      getStatModifier: helpers.getStatModifier,
      calcScaledDamage: helpers.calcScaledDamage,
    });
    ctx.dealDamage(target.id, finalDamage, { isPhysical: spell.isPhysical });
    ctx.log(
      `${spell.name} dealt ${finalDamage} damage. ${breakdown}`,
      "#f87171",
    );
    return;
  }

  // Buff (self)
  if (spell.buffStat) {
    const pct = Math.round((spell.buffModifier - 1) * 100);
    const duration = spell.buffDuration ?? 3;
    const effect: ActiveEffectLike = {
      effectName: spell.name,
      type: "buff",
      targetId: caster.id,
      stat: spell.buffStat,
      modifier: spell.buffModifier,
      duration,
      iconEmoji: spell.iconEmoji || "✨",
      description: `${spell.name} buff`,
    };
    ctx.applyEffect(effect);
    ctx.log(
      `${spell.name}: +${pct}% ${spell.buffStat.toUpperCase()} for ${duration} turns!`,
      "#4ade80",
    );
    return;
  }

  // Debuff
  if (spell.debuffStat) {
    const pct = Math.round((1 - spell.debuffModifier) * 100);
    const duration = spell.debuffDuration ?? 3;
    const effect: ActiveEffectLike = {
      effectName: spell.name,
      type: "debuff",
      targetId: target.id,
      stat: spell.debuffStat,
      modifier: spell.debuffModifier,
      duration,
      iconEmoji: spell.iconEmoji || "💀",
      description: `${spell.name} debuff`,
    };
    ctx.applyEffect(effect);
    ctx.log(
      `${spell.name}: -${pct}% ${spell.debuffStat.toUpperCase()} for ${duration} turns!`,
      "#f87171",
    );
    return;
  }

  // Heal
  if (spell.healAmount > 0) {
    // SP (Spell Power): flat % bonus to spell healing (SP 8 = +8%)
    const casterSp = caster.stats.sp ?? 0;
    const healed = Math.round(spell.healAmount * (1 + casterSp / 100));
    ctx.heal(target.id, healed);
    ctx.log(`${spell.name} healed ${healed} HP!`, "#4ade80");
    return;
  }

  // DoT
  if (spell.isDotSpell || spell.dotDamage > 0) {
    const effect: ActiveEffectLike = {
      effectName: spell.name,
      type: "dot",
      targetId: target.id,
      duration: spell.dotDuration ?? 3,
      iconEmoji: spell.iconEmoji || "🔥",
      description: `${spell.name} DoT`,
      dotDamagePerTurn: spell.dotDamagePerTurn ?? spell.dotDamage ?? 0,
    };
    ctx.applyEffect(effect);
    ctx.log(`${spell.name} applied a damage-over-time effect!`, "#f59e0b");
    return;
  }

  // Summon
  if (spell.isSummon && spell.summonUnitDef) {
    const def: SummonUnitDef = spell.summonUnitDef;
    const lifespan = spell.summonLifespan ?? 3;
    // [SUMMON] link (b): resolveSpellCast entered the summon branch.
    logDebugInfo("SUMMON", "resolveSpellCast summon branch", {
      spellId: spell.id,
      spellName: spell.name,
      casterSide: caster.side,
      pieceType: def.pieceType,
      level: def.level,
      lifespan,
      cell: target.cell,
    });
    // [SUMMON] link (c): ctx.spawnUnit invoked.
    logDebugInfo("SUMMON", "ctx.spawnUnit invoked", {
      cell: target.cell,
      pieceType: def.pieceType,
      side: caster.side,
      lifespan,
    });
    ctx.spawnUnit(target.cell, def, caster.side, lifespan, spell);
    ctx.log(`${spell.name} summoned a ${def.pieceType}!`, "#a78bfa", true);
    return;
  }

  // Fallback
  ctx.log(`${spell.name} cast with no effect.`, "#9ca3af");
}

/**
 * Player-cast resolver — byte-identical replication of the inline player cast
 * path in WorldExploration.tsx (handleCanvasClick spell branch, lines 8186-8966).
 *
 * This function does NOT touch AP or cooldowns — those stay at the call site in
 * WorldExploration (matching the inline ordering). It returns a PlayerCastResult
 * the caller branches on:
 *   - "cast":    deduct AP + set cooldown (the inline post-loop block at line 8950).
 *   - "fizzled": deduct AP only (inline FAIL branch at line 8257).
 *   - "no_ap":   caller must NOT deduct AP (timestep already restored AP).
 *   - "summon":  caller must NOT deduct AP (preserves the inline no-AP-deduction bug).
 *   - "abort":   caller must NOT deduct AP (early abort: timestep already used,
 *                no target in range, etc.).
 *
 * Every log string, color, damage number, and side-effect ordering matches the
 * inline path exactly. The existing resolveSpellCast (used by enemy/summon-AI)
 * is NOT modified.
 */
export function resolvePlayerCast(
  spell: any,
  gridPos: { x: number; y: number },
  ctx: PlayerSpellContext,
): PlayerCastResult {
  const isPhysical = spell.isPhysical ?? false;
  const isHealSpell =
    spell.targetType === "self" && spell.effectType === "heal";
  const isDrainSpell = spell.effectType === "drain";
  const isShieldSpell =
    (spell.targetType === "self" || spell.targetType === "ally") &&
    spell.effectType === "buff";
  const isSwapSpell = spell.isSwap === true;
  const isPlayerTile =
    gridPos.x === ctx.playerPosition.x && gridPos.y === ctx.playerPosition.y;

  // ── FAIL roll FIRST — before any effect is applied (inline line 8253) ──
  if (!isPhysical) {
    const failRoll = ctx.rng() * 100;
    if (failRoll < ctx.spellFailChance) {
      logDebugInfo(
        "RESOLVER",
        `abort {spellId: "${spell.id}", reason: "FAIL roll (failRoll=${failRoll.toFixed(2)} < spellFailChance=${ctx.spellFailChance})"}`,
      );
      ctx.log(`${spell.name} fizzled!`, "#AAAAAA");
      return "fizzled";
    }
  }

  // ── Heal spell targets player tile (inline line 8269) ──
  if (isHealSpell && isPlayerTile) {
    const baseHealAmt = spell.healAmount ?? 0;
    const healRecvMod = ctx.getEffectiveStat("player", "healRecv");
    const modHeal =
      typeof healRecvMod === "number" && healRecvMod !== 1
        ? Math.round(baseHealAmt * healRecvMod)
        : baseHealAmt;
    const isCrit = ctx.rng() * 100 < ctx.chc;
    const finalHeal = isCrit ? modHeal * 2 : modHeal;
    ctx.heal("player", finalHeal);
    ctx.log(
      `${isCrit ? "CRITICAL! " : ""}You healed ${finalHeal} HP with ${spell.name}`,
      isCrit ? "#FFD700" : "#22c55e",
    );
    ctx.onHit();
    ctx.triggerVfx("player", "heal");
    ctx.recordSpellType(spell.effectType ?? "damage");
    return "cast";
  }

  // ── Shield / self-buff spells (inline line 8295) ──
  // Widened (#297 Section 2): when targetType==='ally' and the clicked tile
  // holds an allied summon (enemy with isSummon=true and side='player'), apply
  // the buff to that summon (targetId: summonId) instead of the player. The
  // player's own tile still works (targetId: "player") for self-cast.
  if (isShieldSpell) {
    // Determine the buff target: allied summon on the clicked tile, else player
    // (only when the clicked tile IS the player's tile).
    const alliedSummonOnTile = ctx.enemies.find(
      (e) =>
        e.x === gridPos.x &&
        e.y === gridPos.y &&
        (e as PlayerCastEnemy & { isSummon?: boolean; side?: string })
          .isSummon === true &&
        (e as PlayerCastEnemy & { isSummon?: boolean; side?: string }).side ===
          "player",
    );
    const isAllyCast =
      spell.targetType === "ally" && Boolean(alliedSummonOnTile);
    if (isPlayerTile || isAllyCast) {
      const buffTargetId =
        isAllyCast && alliedSummonOnTile ? alliedSummonOnTile.id : "player";
      if (spell.buffStat && spell.buffModifier) {
        const pct = Math.round((spell.buffModifier - 1) * 100);
        const shieldDur = spell.buffDuration ?? 3;
        ctx.applyEffect({
          id: `${buffTargetId}-shield-${Date.now()}`,
          effectName: `${spell.name} Shield`,
          type: "buff",
          targetId: buffTargetId,
          stat: spell.buffStat,
          modifier: spell.buffModifier,
          duration: shieldDur,
          iconEmoji: "🛡️",
          description: `+${pct}% ${spell.buffStat.toUpperCase()} for ${shieldDur} turns`,
        });
        ctx.log(
          `You cast ${spell.name}: +${pct}% ${spell.buffStat.toUpperCase()} for ${shieldDur} turns on ${buffTargetId === "player" ? "yourself" : (alliedSummonOnTile?.pieceType ?? "ally")}!`,
          "#60a5fa",
        );
      }
      ctx.recordSpellType(spell.effectType ?? "damage");
      return "cast";
    }
  }

  // ── Timestep: restore AP and MP to full once per battle (inline line 8326) ──
  if (spell.isTimestep) {
    if (ctx.consumeTimestep()) {
      logDebugInfo(
        "RESOLVER",
        `abort {spellId: "${spell.id}", reason: "timestep already consumed this battle"}`,
      );
      ctx.log("Timestep can only be used once per battle!", "#fbbf24");
      return "abort";
    }
    ctx.restoreApMp();
    ctx.log("Timestep! AP and MP restored to full", "#22d3ee");
    return "no_ap"; // caller must NOT deduct AP — timestep restored it
  }

  // ── Check if an enemy is on clicked tile (inline line 8349) ──
  const targetEnemy = ctx.enemies.find(
    (e) =>
      e.x === gridPos.x &&
      e.y === gridPos.y &&
      isActiveHostile({
        hp: e.hp ?? 0,
        isSummon: e.isSummon,
        side: e.side,
        id: e.id,
      }),
  );

  // ── Sacrifice: lose 20% HP, deal 3x that as damage (inline line 8354) ──
  if (spell.isSacrifice) {
    const hpLoss = Math.floor(ctx.characterStats.hp * 0.2);
    ctx.loseSelfHp(hpLoss);
    ctx.log(`Sacrifice! Lost ${hpLoss} HP`, "#ef4444");
    if (targetEnemy) {
      const sacrificeDmg = hpLoss * 3;
      ctx.dealDamage(targetEnemy.id, sacrificeDmg, { isPhysical });
      ctx.log(
        `Sacrifice dealt ${sacrificeDmg} damage to ${targetEnemy.id}`,
        "#ef4444",
      );
    }
    ctx.recordSpellType(spell.effectType ?? "damage");
    return "cast";
  }

  // ── Swap spell: swap player position with target enemy (inline line 8377) ──
  if (isSwapSpell && targetEnemy) {
    ctx.swapPositions(targetEnemy.id);
    ctx.log(
      `You cast ${spell.name} and swapped places with ${targetEnemy.pieceType}!`,
      "#a855f7",
    );
    ctx.recordSpellType(spell.effectType ?? "damage");
    return "cast";
  }

  // ── DoT spell (inline line 8412) ──
  const isDotSpell = spell.isDotSpell === true || spell.effectType === "dot";
  if (isDotSpell && targetEnemy) {
    const dotPpt = spell.dotDamagePerTurn ?? spell.dotDamage ?? 0;
    const dotDur = spell.dotDuration ?? 3;
    const dotIcon =
      spell.dotType === "burn"
        ? "\uD83D\uDD25"
        : spell.dotType === "bleed"
          ? "\uD83E\uDE78"
          : spell.dotType === "venom"
            ? "\uD83D\uDC0D"
            : "\u2620\uFE0F";
    const dotLabel =
      spell.dotType === "burn"
        ? "burning"
        : spell.dotType === "bleed"
          ? "bleeding"
          : spell.dotType === "venom"
            ? "venomed"
            : "poisoned";
    ctx.applyEffect({
      id: `player-dot-${Date.now()}`,
      effectName: `${spell.name} DoT`,
      type: "dot",
      targetId: targetEnemy.id,
      dotDamagePerTurn: dotPpt,
      duration: dotDur,
      iconEmoji: dotIcon,
      description: `${dotPpt} dmg/turn`,
    });
    ctx.log(
      `${targetEnemy.pieceType} is ${dotLabel} by ${spell.name} for ${dotPpt} dmg/turn for ${dotDur} turns`,
      "#22c55e",
    );
    ctx.onHit();
    ctx.recordSpellType(spell.effectType ?? "damage");
    return "cast";
  }

  // ── Summon (inline line 8558) — preserves the no-AP-deduction bug ──
  // HOISTED out of the damage-loop guard (build #303): ground summon spells
  // target EMPTY tiles by design, so `targetEnemy` is undefined and the
  // `if (targetEnemy || (isDrainSpell && !isPlayerTile))` block below was
  // never entered — the summon branch was unreachable and the function fell
  // through to `return "cast"`, deducting AP without spawning. This branch
  // must run regardless of whether an enemy occupies the clicked tile.
  if (spell.isSummon && spell.summonUnitDef) {
    // [SUMMON] link (b): resolvePlayerCast entered the summon branch.
    logDebugInfo("SUMMON", "resolvePlayerCast summon branch", {
      spellId: spell.id,
      spellName: spell.name,
      pieceType: spell.summonUnitDef.pieceType,
      gridPos,
      targetEnemyOnTile: !!targetEnemy,
    });
    ctx.spawnPlayerSummon(gridPos, spell);
    ctx.recordSpellType(spell.effectType ?? "damage");
    return "summon";
  }

  // ── Barrier spell — place an impassable tile for 3 turns (inline line 8540) ──
  // HOISTED out of the damage-loop guard (build #308): barrier spells target
  // EMPTY ground tiles by design (targetType "ground", see targeting.ts line
  // 201 `targetType === "ground" || spell.isBarrier`), so `targetEnemy` is
  // undefined and `isDrainSpell` is false. The guard
  // `if (targetEnemy || (isDrainSpell && !isPlayerTile))` at the damage loop
  // was therefore never entered — the barrier branch was unreachable and the
  // function fell through to `return "cast"`, deducting AP without placing
  // the barrier. This branch must run regardless of whether an enemy occupies
  // the clicked tile. Same hoist pattern as the summon branch above (line 799).
  if (spell.isBarrier) {
    ctx.placeBarrierTile(gridPos, 3);
    ctx.log(
      `Barrier placed at (${gridPos.x},${gridPos.y}) for 3 turns!`,
      "#818cf8",
    );
    ctx.recordSpellType(spell.effectType ?? "damage");
    return "cast";
  }

  // ── Drain target guard (Pattern B fix) ──
  // Drain spells are single-target enemy-only (targetType: "enemy"). The
  // damage-loop guard below previously let drain enter via
  // `isDrainSpell && !isPlayerTile` even when targetEnemy was undefined
  // (stale sprite rect, dead enemy, misclick on empty tile), which then
  // aborted silently at the `targetsToHit.length === 0` check because
  // getAoETargets cannot build a target list without targetEnemy (drain is
  // not hitsMultiple). Surface the reason here and abort explicitly so the
  // caller does NOT deduct AP and the log names the cause.
  if (isDrainSpell && !targetEnemy) {
    logDebugInfo(
      "RESOLVER",
      `abort {spellId: "${spell.id}", reason: "drain requires enemy target on tile (targetEnemy=undefined)"}`,
    );
    ctx.log(`No enemy on target tile for ${spell.name}!`, "#94a3b8");
    return "abort";
  }

  // ── Damage loop (inline line 8456) ──
  // Guard: enter the loop when there is an explicit enemy target OR the spell
  // is multi-target (hitsMultiple) so getAoETargets can build the list from the
  // enemies-in-range filter. The previous `isDrainSpell && !isPlayerTile`
  // fallback is removed — drain spells now require targetEnemy (handled by the
  // guard above) and never enter the loop without one.
  if (targetEnemy || spell.hitsMultiple) {
    const baseDamage = Number(spell.damage);
    const rawDmg = calcScaledDamageInline(
      baseDamage,
      ctx.characterStats.level,
      ctx.spellLevels[spell.id] ?? 0,
    );

    // Critical hit check (inline line 8465)
    const isCrit = ctx.rng() * 100 < ctx.chc;
    const preCritDmg = isCrit ? rawDmg * 2 : rawDmg;

    // Blood Moon + Fury Potion (inline lines 8469-8476)
    const bloodMoonMultiplier = ctx.isBloodMoon && !isHealSpell ? 1.25 : 1.0;
    const furyMultiplier = ctx.isFuryActive && !isHealSpell ? 1.25 : 1.0;
    const preCritDmgBM = Math.round(
      preCritDmg * bloodMoonMultiplier * furyMultiplier,
    );

    // Mirror Field: 20% chance single-target reflect (inline line 8479)
    if (ctx.isMirrorField && !spell.hitsMultiple && !spell.aoe) {
      if (ctx.mirrorFieldReflect(spell, gridPos, preCritDmgBM)) {
        ctx.recordSpellType(spell.effectType ?? "damage");
        return "cast";
      }
    }

    // Paper Windstorm miss check (inline line 8501)
    if (ctx.isPaperWindstorm) {
      if (ctx.paperWindstormMiss(spell, gridPos)) {
        ctx.recordSpellType(spell.effectType ?? "damage");
        return "cast";
      }
    }

    // Mirror spell — activate mirror shield on the player (inline line 8522)
    if (spell.isMirror) {
      ctx.activateMirror();
      ctx.log(
        "Mirror active! Next single-target damage spell cast at you reflects back!",
        "#c084fc",
      );
      ctx.recordSpellType(spell.effectType ?? "damage");
      return "cast";
    }

    // Mark spell (inline line 8577)
    if (spell.isMark) {
      ctx.placeMark(gridPos);
      ctx.log(
        `Mark placed at tile (${gridPos.x},${gridPos.y}). Next hit deals x2 damage!`,
        "#fcd34d",
      );
      ctx.recordSpellType(spell.effectType ?? "damage");
      return "cast";
    }

    // Mirror-redirect (inline line 8596)
    if (
      targetEnemy &&
      !spell.hitsMultiple &&
      !spell.aoe &&
      ctx.mirrorRedirect(targetEnemy, spell, gridPos)
    ) {
      ctx.recordSpellType(spell.effectType ?? "damage");
      return "cast";
    }

    // Build target list (inline line 8629)
    const targetsToHit = ctx.getAoETargets(spell, gridPos, targetEnemy);
    if (targetsToHit.length === 0) {
      logDebugInfo(
        "RESOLVER",
        `abort {spellId: "${spell.id}", reason: "no target in range (targetsToHit empty after getAoETargets)"}`,
      );
      ctx.log(`No target in range for ${spell.name}!`, "#94a3b8");
      return "abort";
    }

    // Liveness tracking (#DEATH-DEREGISTER): a local set of combatant ids
    // killed by an earlier hit in THIS cast. processCombatantDeath is
    // idempotent (deathPipeline L73-75), so re-calling on an already-dead
    // target is a no-op — but the damage loop must still SKIP applying damage
    // to a target that was killed by an earlier hit in the same multi-hit/AoE
    // cast, otherwise the dead combatant takes post-mortem damage ("king takes
    // 45 damage" after defeat). The set is checked per-hit before any damage
    // is applied. The "__player__" sentinel is never a death candidate.
    const killedThisCast = new Set<string>();

    for (let i = 0; i < targetsToHit.length; i++) {
      const hitTarget = targetsToHit[i];
      // Liveness re-check (#DEATH-DEREGISTER): before applying damage to each
      // target in the multi-hit/AoE loop, verify the target was not already
      // killed by an earlier hit in this same cast. A target whose death was
      // processed (processCombatantDeath ran and removed it from the roster)
      // is skipped here so it cannot take post-mortem damage. The "__player__"
      // sentinel is never a death candidate and is always processed.
      if (hitTarget.id !== "__player__" && killedThisCast.has(hitTarget.id)) {
        logDebugInfo(
          "RESOLVER",
          `skip {targetId: "${hitTarget.id}", reason: "target already killed earlier in this multi-hit cast (post-mortem hit prevented)"}`,
        );
        continue;
      }
      const hitEnemy = hitTarget.isPlayer
        ? undefined
        : (hitTarget as PlayerCastEnemy);
      let finalDmg: number;
      if (!hitTarget.isPlayer && hitEnemy) {
        const { finalDamage, breakdown } = ctx.calculatePlayerDamage(
          preCritDmgBM,
          spell.id,
          hitEnemy,
          gridPos,
          isPhysical,
          isCrit,
        );
        finalDmg = finalDamage;
        ctx.log(breakdown, "#fbbf24");
      } else {
        finalDmg = preCritDmgBM;
      }

      ctx.applyDamageToEnemy(
        hitEnemy ?? (hitTarget as PlayerCastEnemy),
        finalDmg,
        spell,
        gridPos,
        isCrit,
        rawDmg,
        preCritDmg,
        preCritDmgBM,
        i === 0,
      );
      // Detect death from the pre-damage hp snapshot minus the applied damage.
      // applyDamageToEnemy returns void and updates enemyHpMap asynchronously,
      // so the synchronous hp - finalDmg check is the reliable death signal here.
      if (hitTarget.hp - finalDmg <= 0 && hitTarget.id !== "__player__") {
        ctx.processCombatantDeath(hitTarget.id);
        killedThisCast.add(hitTarget.id);
      }
      ctx.log(`${hitTarget.pieceType} takes ${finalDmg} damage`, "#ef4444");
    }
  }

  ctx.recordSpellType(spell.effectType ?? "damage");
  return "cast";
}

/**
 * Inline copy of calcScaledDamage — the inline path calls the module-level
 * calcScaledDamage from engine/combatMath.ts directly. We re-implement it here
 * to avoid importing combatMath (keeps the engine self-contained and avoids
 * pulling any transitive React deps). The math is identical:
 *   Math.max(1, Math.floor(baseDamage * 1.03 ** spellUpgradeLevel))
 */
function calcScaledDamageInline(
  baseDamage: number,
  _casterLevel: number,
  spellUpgradeLevel = 0,
): number {
  return Math.max(1, Math.floor(baseDamage * 1.03 ** spellUpgradeLevel));
}
