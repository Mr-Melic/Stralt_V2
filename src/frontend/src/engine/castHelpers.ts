/**
 * Extracted helpers for the player spell-cast damage loop.
 *
 * These two functions are VERBATIM copies of the inline blocks that previously
 * lived in WorldExploration.tsx (handleCanvasClick spell branch):
 *   - getAoETargets:    inline lines 8640-8720 (target list assembly)
 *   - applyDamageToEnemy: inline lines 8722-8958 (per-target damage body)
 *
 * Byte-identical contract: same log strings, same damage numbers, same
 * ordering, same side effects. The only change is that closure variables are
 * now passed in via explicit deps/args objects so the helpers are React-free
 * and testable in isolation.
 *
 * The for-loop over `targetsToHit` itself STAYS in WorldExploration.tsx — only
 * the body of that loop (and the target-list assembly before it) move here.
 *
 * This module is React-free and DOM-free at runtime. It imports only TYPE
 * declarations (CombatantEntry, SoundEvent, CharacterStats) from React-bearing
 * files via `import type` — these are erased at compile time and pull no
 * runtime React deps, matching the engine's React-free runtime convention.
 */

import type { CombatantEntry } from "../components/InitiativeStrip";
import type { CharacterStats } from "../components/WorldExploration";
import type { SoundEvent } from "../hooks/useSoundHooks";
import type { ActiveEffect } from "../types/gameTypes";
import type { Enemy } from "../types/gameTypes";
import { isActiveHostile } from "./battleSetup.ts";
import {
  type DeathPipelineCtx,
  processCombatantDeath,
} from "./deathPipeline.ts";
import type { PlayerCastEnemy, PlayerCastTarget } from "./spellEngine";
import {
  hitsAlliesIncludesPlayer,
  hitsMultipleIncludesOccupant,
  playerSpellEffectiveRange,
} from "./targeting.ts";
import { removeCombatantFromTurnQueue } from "./turnQueue.ts";

/**
 * Minimal structural shape of BossState from bossTypes.ts.
 * Only the fields the damage loop reads are declared here.
 */
interface BossStateLike {
  shellArmorActive?: boolean;
  reflectShieldActive?: boolean;
  larvae?: unknown[];
}

/**
 * Union target shape used by the damage loop. Either a real Enemy or the
 * "__player__" sentinel. Mirrors the inline `targetsToHit` array element type.
 */
type HitTarget = Enemy | PlayerCastTarget;

// ─────────────────────────────────────────────────────────────────────────────
// getAoETargets — verbatim copy of inline lines 8640-8720
// ─────────────────────────────────────────────────────────────────────────────

export interface GetAoETargetsArgs {
  spell: any;
  gridPos: { x: number; y: number };
  targetEnemy: PlayerCastEnemy | undefined;
  enemies: Enemy[];
  playerPosition: { x: number; y: number };
  characterName: string;
  characterStats: {
    level: number;
    res: number;
    sp: number;
    chc: number;
    hp: number;
    maxHp: number;
  };
  getEffectiveSpellRange: (baseRange: number, spellId?: string) => number;
  logBattleEntry: (msg: string, color?: string) => void;
}

/**
 * Build the multi-target / AoE target list for a player spell cast.
 *
 * VERBATIM copy of the inline block at WorldExploration.tsx lines 8640-8720.
 * Returns the assembled `targetsToHit` array (empty if no target in range,
 * after logging the "No target in range" message — matching inline behavior).
 */
export function getAoETargets(args: GetAoETargetsArgs): HitTarget[] {
  const {
    spell,
    gridPos,
    targetEnemy,
    enemies,
    playerPosition,
    characterName,
    characterStats,
    getEffectiveSpellRange,
    logBattleEntry,
  } = args;

  // FEATURE 4: Multi-target + AoE — build list of targets
  const effectiveRange = playerSpellEffectiveRange(
    spell,
    getEffectiveSpellRange,
  );
  // AoE hit tiles: collect enemies at each tile in the hitTiles pattern around the clicked target.
  // Liveness filter (#DEATH-DEREGISTER): exclude already-dead enemies (hp <= 0) at
  // assembly time so the target list never contains dead/removed combatants.
  const aoeEnemies: (typeof enemies)[number][] = [];
  if (spell.aoe && spell.hitTiles && spell.hitTiles.length > 0 && targetEnemy) {
    for (const [hx, hy] of spell.hitTiles as [number, number][]) {
      const ax = gridPos.x + hx;
      const ay = gridPos.y + hy;
      const hit = enemies.find(
        (e) =>
          e.x === ax &&
          e.y === ay &&
          e.id !== targetEnemy.id &&
          isActiveHostile(e),
      );
      if (hit) aoeEnemies.push(hit);
    }
  }
  // Build list of targets for this spell cast.
  // #296 fix: hitsMultiple expands from `gridPos` (the clicked tile), NOT
  // `playerPosition`. The aoeEnemies block above already correctly uses
  // gridPos; only this filter was still anchored to the player, which made
  // multi-target spells (e.g. Frost Nova) hit enemies relative to the caster
  // instead of relative to the clicked target tile.
  // Liveness filter (#DEATH-DEREGISTER): exclude already-dead enemies
  // (hp <= 0) so the target list never contains dead/removed combatants at
  // assembly time. This prevents post-mortem hits when a multi-hit/AoE spell
  // is cast after a prior hit in the same loop already killed a target.
  const baseEnemyTargets = spell.hitsMultiple
    ? enemies.filter(
        (e) =>
          hitsMultipleIncludesOccupant(e, gridPos, effectiveRange) &&
          isActiveHostile(e),
      )
    : targetEnemy && isActiveHostile(targetEnemy)
      ? [targetEnemy, ...aoeEnemies]
      : [];
  const enemiesInRange = Array.from(
    new Map(baseEnemyTargets.map((e) => [e.id, e])).values(),
  );
  // hitsAllies: Chebyshev from the clicked tile (not player-to-self).
  const playerInAoeRange = hitsAlliesIncludesPlayer(
    spell,
    playerPosition,
    gridPos,
    effectiveRange,
  );
  const targetsToHit: HitTarget[] = [
    ...enemiesInRange,
    ...(playerInAoeRange
      ? [
          {
            id: "__player__" as const,
            pieceType: characterName,
            x: playerPosition.x,
            y: playerPosition.y,
            level: characterStats.level,
            res: characterStats.res,
            sp: characterStats.sp,
            chc: characterStats.chc,
            isPlayer: true,
            hp: characterStats.hp,
            maxHp: characterStats.maxHp,
          },
        ]
      : []),
  ];

  if (targetsToHit.length === 0) {
    logBattleEntry(`No target in range for ${spell.name}!`, "#94a3b8");
    return [];
  }

  return targetsToHit;
}

// ─────────────────────────────────────────────────────────────────────────────
// applyDamageToEnemy — verbatim copy of inline lines 8722-8958 (loop body)
// ─────────────────────────────────────────────────────────────────────────────

export interface ApplyDamageToEnemyDeps {
  spell: any;
  gridPos: { x: number; y: number };
  isPhysical: boolean;
  isCrit: boolean;
  rawDmg: number;
  preCritDmg: number;
  preCritDmgBM: number;
  isDrainSpell: boolean;
  maxHp: number;
  characterStats: { hp: number };
  targetsToHit: HitTarget[];
  activeEffectsRef: { current: ActiveEffect[] };
  turnOrderRef: { current: CombatantEntry[] };
  currentTurnIndexRef: { current: number };
  bossStateRef: { current: BossStateLike | null };
  enemyHpMap: Record<string, number>;
  leaderEnemyIdRef: { current: string | null };
  battleHitsRef: { current: number };
  battleCritHitsRef: { current: number };
  battleLeaderSlainRef: { current: boolean };
  leaderDiedRef: { current: boolean };
  leaderBoostPercent: number;
  // Callbacks
  calculatePlayerDamage: (
    baseDamage: number,
    spellId: string,
    targetEnemy: Enemy,
    gridPos: { x: number; y: number },
    isPhysical: boolean,
    isCrit: boolean,
    effects: ActiveEffect[],
  ) => { finalDamage: number; breakdown: string };
  logBattleEntry: (msg: string, color?: string) => void;
  calcEnemyMaxHp: (level: number) => number;
  setEnemyHpMap: (
    updater: (prev: Record<string, number>) => Record<string, number>,
  ) => void;
  setTurnOrder: (updater: (prev: CombatantEntry[]) => CombatantEntry[]) => void;
  enemies: Enemy[];
  enemyTakesDamage: (
    enemyId: string,
    dmg: number,
    source: string,
    label: string,
    isCrit: boolean,
  ) => void;
  playSound: (event: SoundEvent, ctx?: string) => void;
  setEnemies: (updater: (prev: Enemy[]) => Enemy[]) => void;
  triggerLeaderDeathAnimation: (x: number, y: number) => void;
  setLeaderBoostMultiplier: (updater: (prev: number) => number) => void;
  setCharacterStats: (
    updater: (prev: CharacterStats) => CharacterStats,
  ) => void;
  processCombatantDeath: (id: string) => boolean;
  /**
   * Spell-reflect HP loss (Void Mirror / Reflect Shield) never goes through
   * playerTakesDamage. Callers must record it here so Untouchable and
   * under-damage challenges cannot persist after a reflected hit.
   */
  onPlayerReflectedDamage: (amount: number) => void;
  /**
   * Drain restores player HP without executeCastAttempt's self+heal gate.
   * Callers must flip challenge healUsed here so easy_1 / hard_1 cannot
   * persist after a Life Drain that actually increased HP.
   */
  onPlayerHealed?: (amount: number) => void;
  /**
   * Victory, DoT ticks, and later enemyTakesDamage read combatantsRef.
   * React-only enemyHpMap / turnOrder writes leave store hp unchanged, so
   * the next store-based tick recomputes from full HP and wipes this hit.
   */
  commitEnemyHp?: (id: string, hp: number) => void;
}

export interface ApplyDamageToEnemyArgs {
  hitTarget: HitTarget;
  isFirstTarget: boolean;
  deps: ApplyDamageToEnemyDeps;
}

/**
 * Apply damage to a single target in the player spell-cast damage loop.
 *
 * VERBATIM copy of the inline loop body at WorldExploration.tsx lines
 * 8722-8958. The for-loop over `targetsToHit` itself stays in WorldExploration;
 * only the body moves here. Every log string, damage number, side-effect
 * ordering, and branch matches the inline path exactly.
 */
export function applyDamageToEnemy(args: ApplyDamageToEnemyArgs): void {
  const { hitTarget, deps } = args;
  const {
    spell,
    gridPos: _gridPos,
    isPhysical,
    isCrit,
    rawDmg: _rawDmg,
    preCritDmg: _preCritDmg,
    preCritDmgBM,
    isDrainSpell,
    maxHp,
    characterStats,
    targetsToHit,
    activeEffectsRef,
    turnOrderRef,
    currentTurnIndexRef: _currentTurnIndexRef,
    bossStateRef,
    enemyHpMap,
    leaderEnemyIdRef: _leaderEnemyIdRef,
    battleHitsRef,
    battleCritHitsRef,
    battleLeaderSlainRef: _battleLeaderSlainRef,
    leaderDiedRef: _leaderDiedRef,
    leaderBoostPercent: _leaderBoostPercent,
    calculatePlayerDamage,
    logBattleEntry,
    calcEnemyMaxHp,
    setEnemyHpMap,
    setTurnOrder,
    enemies,
    enemyTakesDamage,
    playSound,
    setEnemies: _setEnemies,
    triggerLeaderDeathAnimation: _triggerLeaderDeathAnimation,
    setLeaderBoostMultiplier: _setLeaderBoostMultiplier,
    setCharacterStats,
    processCombatantDeath,
    onPlayerReflectedDamage,
    onPlayerHealed,
    commitEnemyHp,
  } = deps;

  const targetEnemy =
    hitTarget.id === "__player__" ? undefined : (hitTarget as Enemy);
  let finalDmg: number;
  if (hitTarget.id !== "__player__" && targetEnemy) {
    const { finalDamage, breakdown: _breakdown } = calculatePlayerDamage(
      preCritDmgBM,
      spell.id,
      targetEnemy,
      _gridPos,
      isPhysical,
      isCrit,
      activeEffectsRef.current,
    );
    finalDmg = finalDamage;
  } else {
    finalDmg = preCritDmgBM;
  }

  // Void Mirror reflect — synchronous, no timers
  if ((hitTarget as Enemy)?.family === "void_mirror") {
    const voidReflect = Math.floor(preCritDmgBM * 0.25);
    if (voidReflect > 0) {
      setCharacterStats((prev) => ({
        ...prev,
        hp: Math.max(0, prev.hp - voidReflect),
      }));
      onPlayerReflectedDamage(voidReflect);
      logBattleEntry(`Void Mirror reflects ${voidReflect} damage!`, "#E2E8F0");
    }
  }
  // ISSUE 1 — Shell armor: halve damage to Broodmother Rook while larvae are alive
  const isBossTarget =
    hitTarget.id !== "__player__" &&
    turnOrderRef.current.find((c) => c.isBoss && c.id === hitTarget.id);
  if (
    isBossTarget &&
    bossStateRef.current?.shellArmorActive === true &&
    (bossStateRef.current?.larvae?.length ?? 0) > 0
  ) {
    finalDmg = Math.max(1, Math.floor(finalDmg / 2));
    logBattleEntry(
      "🐛 Shell Armor absorbs half the damage (larvae are alive)!",
      "#84cc16",
    );
  }
  // ISSUE 2 — Reflect shield (AoE path)
  if (isBossTarget && bossStateRef.current?.reflectShieldActive === true) {
    const reflectAmtBM = Math.floor(finalDmg * 0.3);
    if (reflectAmtBM > 0) {
      setCharacterStats((s) => ({
        ...s,
        hp: Math.max(0, s.hp - reflectAmtBM),
      }));
      onPlayerReflectedDamage(reflectAmtBM);
      logBattleEntry(
        `🛡️ Reflect Shield deflects ${reflectAmtBM} damage back at you!`,
        "#f97316",
      );
    }
  }
  const enemySp = hitTarget.sp ?? 0;
  const enemyRes = hitTarget.res ?? 0;
  const resistedAmt = preCritDmgBM - finalDmg;
  battleHitsRef.current += 1;
  // ── #21 RES/SP resistance breakdown for battle log ─────────────────
  const spReduction = isPhysical
    ? 0
    : Math.round(preCritDmgBM * (enemySp / 100));
  const resReduction = isPhysical
    ? Math.round(preCritDmgBM * (enemyRes / 100))
    : Math.round(preCritDmgBM * (1 - enemySp / 100) * (enemyRes / 100));
  const resistParts: string[] = [];
  if (spReduction > 0) resistParts.push(`-${spReduction}SP`);
  if (resReduction > 0) resistParts.push(`-${resReduction}RES`);
  // Format: raw→absorbed(reason)→final with distinct markup token ||...|| for grey coloring
  const _resistNote =
    resistedAmt > 0 ? ` |[${resistParts.join("+")}=>${finalDmg}]|` : "";
  if (isCrit) {
    playSound("critical_hit", spell.name);
    playSound("spell_hit", hitTarget.pieceType);
    battleCritHitsRef.current += 1;
  } else {
    playSound("spell_hit", hitTarget.pieceType);
  }
  // Prefer the live target snapshot (combatantsRef via getAoETargets).
  // enemyHpMap is React state and can still hold the pre-hit value in the
  // same turn; using it as the baseline then committing would write a
  // stale max-HP formula over a mid-fight summon.
  const fromTarget = Number(hitTarget.hp);
  const enemyPrevHp = Number.isFinite(fromTarget)
    ? fromTarget
    : (enemyHpMap[hitTarget.id] ?? calcEnemyMaxHp(hitTarget.level));
  const enemyNewHp = Math.max(0, enemyPrevHp - finalDmg);
  logBattleEntry(
    `${hitTarget.pieceType} takes ${finalDmg} damage (${enemyNewHp} HP left)`,
    "#a855f7",
  );

  setEnemyHpMap((prev) => ({
    ...prev,
    [hitTarget.id]: enemyNewHp,
  }));
  setTurnOrder((prev) => {
    const newOrder = prev.map((c) =>
      c.id === hitTarget.id ? { ...c, hp: enemyNewHp } : c,
    );
    turnOrderRef.current = newOrder;
    return newOrder;
  });
  if (hitTarget.id !== "__player__") {
    commitEnemyHp?.(hitTarget.id, enemyNewHp);
  }

  // Chain Lightning bounce
  if (
    spell.bounces &&
    spell.bounces > 0 &&
    hitTarget &&
    hitTarget.id &&
    hitTarget.id !== "__player__"
  ) {
    const otherEnemies = enemies.filter(
      (e) => e.id !== hitTarget.id && isActiveHostile(e),
    );
    const sorted = otherEnemies.sort((a, b) => {
      const distA = Math.abs(a.x - hitTarget.x) + Math.abs(a.y - hitTarget.y);
      const distB = Math.abs(b.x - hitTarget.x) + Math.abs(b.y - hitTarget.y);
      return distA - distB;
    });
    const bounceTargets = sorted.slice(0, spell.bounces);
    bounceTargets.forEach((bounceEnemy, idx) => {
      const bounceDmg = Math.floor(finalDmg * 0.5 ** (idx + 1));
      enemyTakesDamage(
        bounceEnemy.id,
        bounceDmg,
        "player",
        `${spell.name} bounce`,
        isCrit,
      );
      logBattleEntry(
        `${spell.name} bounced to ${bounceEnemy.id} for ${bounceDmg} damage!`,
        "#fbbf24",
      );
    });
  }

  // hitsAllies player-sentinel: deduct damage from the player's own HP
  if (hitTarget.id === "__player__") {
    setCharacterStats((prev) => ({
      ...prev,
      hp: Math.max(0, prev.hp - finalDmg),
    }));
  } else if (enemyNewHp <= 0) {
    processCombatantDeath(hitTarget.id);
  }

  // Drain: heal player too (once per cast, not per target)
  if (isDrainSpell && hitTarget === targetsToHit[0]) {
    const drainPercent = (spell as any).drainPercent || 0.5;
    const healAmt = Math.min(
      maxHp - characterStats.hp,
      Math.round(finalDmg * drainPercent),
    );
    if (healAmt > 0) {
      setCharacterStats((prev) => ({
        ...prev,
        hp: Math.min(maxHp, prev.hp + healAmt),
      }));
      logBattleEntry(`${spell.name} drained ${healAmt} HP!`, "#22c55e");
      onPlayerHealed?.(healAmt);
    }
  }
}
