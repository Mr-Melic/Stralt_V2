/**
 * Battle-challenge completion predicates.
 *
 * handleBattleEnd persists advertised Doka/XP only when
 * `isChallengeCompleted(liveChallenge, progress)` is true. A wrong
 * boundary here silently drops 400–1000 XP or credits a failed objective.
 */

export type ChallengeTier = "easy" | "hard" | "legendary";

export type ChallengeCondition =
  | "no_healing"
  | "under_15_turns"
  | "under_50_damage"
  | "no_healing_under_30_damage"
  | "under_10_turns"
  | "under_8_ap_per_turn"
  | "no_damage_taken"
  | "under_5_turns"
  | "direct_hit";

export interface Challenge {
  id: string;
  tier: ChallengeTier;
  description: string;
  condition: ChallengeCondition;
  rewards: { doka?: number; xp?: number; badge?: string };
}

export interface ChallengePanelProgress {
  turnCount: number;
  totalDamage: number;
  healUsed: boolean;
  directHit: boolean;
  maxApUsedInTurn: number;
  /**
   * Spent cast / fizzle / summon attempts that consulted Striker range.
   * `directHit` starts true (no long-range miss yet). A lava / reflect /
   * wait win never increments this, so legendary_3 must not persist.
   */
  directHitAttempts?: number;
}

export const DEFAULT_CHALLENGES: Challenge[] = [
  {
    id: "easy_1",
    tier: "easy",
    description: "Win without using healing spells",
    condition: "no_healing",
    rewards: { doka: 50 },
  },
  {
    id: "easy_2",
    tier: "easy",
    description: "Defeat all enemies within 15 turns",
    condition: "under_15_turns",
    rewards: { doka: 75 },
  },
  {
    id: "easy_3",
    tier: "easy",
    description: "Take less than 50 damage total",
    condition: "under_50_damage",
    rewards: { doka: 60 },
  },
  {
    id: "hard_1",
    tier: "hard",
    description: "Win without healing and take under 30 damage",
    condition: "no_healing_under_30_damage",
    rewards: { doka: 200, xp: 500 },
  },
  {
    id: "hard_2",
    tier: "hard",
    description: "Defeat all enemies within 10 turns",
    condition: "under_10_turns",
    rewards: { doka: 175, xp: 400 },
  },
  {
    id: "hard_3",
    tier: "hard",
    description: "Never spend more than 8 AP in any single turn",
    condition: "under_8_ap_per_turn",
    rewards: { doka: 150, xp: 450 },
  },
  {
    id: "legendary_1",
    tier: "legendary",
    description: "Win without taking any damage at all",
    condition: "no_damage_taken",
    rewards: { doka: 500, xp: 1000, badge: "Untouchable" },
  },
  {
    id: "legendary_2",
    tier: "legendary",
    description: "Defeat all enemies in under 5 turns",
    condition: "under_5_turns",
    rewards: { doka: 450, xp: 900, badge: "Blitz" },
  },
  {
    id: "legendary_3",
    tier: "legendary",
    description:
      "Win using only spells cast on targets within 2 tiles (Chebyshev distance ≤ 2)",
    condition: "direct_hit",
    rewards: { doka: 400, xp: 800, badge: "Striker" },
  },
];

export function isChallengeCompleted(
  challenge: Challenge,
  progress: ChallengePanelProgress,
): boolean {
  switch (challenge.condition) {
    case "no_healing":
      return !progress.healUsed;
    case "under_15_turns":
      return progress.turnCount <= 15;
    case "under_50_damage":
      return progress.totalDamage < 50;
    case "no_healing_under_30_damage":
      return !progress.healUsed && progress.totalDamage < 30;
    case "under_10_turns":
      return progress.turnCount <= 10;
    case "under_8_ap_per_turn":
      return progress.maxApUsedInTurn <= 8;
    case "no_damage_taken":
      return progress.totalDamage === 0;
    case "under_5_turns":
      return progress.turnCount <= 5;
    case "direct_hit":
      return isStrikerChallengeComplete(progress);
    default:
      return false;
  }
}

/**
 * Accumulate HP actually lost this battle for challenge predicates.
 *
 * handleBattleEnd / handleBossRushRoomClear persist advertised Untouchable
 * (1000 XP / 500 Doka) and under-50-damage rewards from this total. Only
 * the boss-ability branch used to increment it, so a regular melee or
 * spell hit left totalDamage at 0 and credited a failed objective.
 */
export function recordChallengeDamageTaken(
  current: number,
  incoming: number,
): number {
  const base = Math.max(0, Math.floor(Number(current) || 0));
  const add = Math.max(0, Math.floor(Number(incoming) || 0));
  return base + add;
}

/**
 * Sacrifice (`loseSelfHp`) floors the player at 1 HP and never entered
 * `playerTakesDamage`. Untouchable / under-N-damage therefore stayed at
 * `totalDamage === 0` after a starter-spell 20% self-hit and still
 * persisted 500 Doka / 1000 XP.
 *
 * Record the HP actually lost (floor-at-1), not the requested amount.
 * Do not apply RES / shields — that would change Sacrifice damage math.
 */
export function recordChallengeSelfHpLoss(
  current: number,
  hpBefore: number,
  requestedLoss: number,
  hpFloor = 1,
): { nextTotal: number; hpAfter: number; lost: number } {
  const before = Math.max(0, Math.floor(Number(hpBefore) || 0));
  const want = Math.max(0, Math.floor(Number(requestedLoss) || 0));
  const floor = Math.max(0, Math.floor(Number(hpFloor) || 0));
  const hpAfter = Math.max(floor, before - want);
  const lost = Math.max(0, before - hpAfter);
  return {
    nextTotal: recordChallengeDamageTaken(current, lost),
    hpAfter,
    lost,
  };
}

/**
 * Battle-walk Thorned Ground / Void Rift HP loss.
 *
 * Mouse and touch both call this after `battleWalkHazardDamages`.
 * Touch used to skip the debit, so tablet walks kept Untouchable / under-
 * damage challenges the mouse path already failed.
 */
export function recordChallengeWalkHazardDamage(
  current: number,
  damages: { thornDmg: number; riftDmg: number },
): number {
  let next = current;
  if (damages.thornDmg > 0) {
    next = recordChallengeDamageTaken(next, damages.thornDmg);
  }
  if (damages.riftDmg > 0) {
    next = recordChallengeDamageTaken(next, damages.riftDmg);
  }
  return next;
}

/**
 * Mark heal-used for `no_healing` / `no_healing_under_30_damage`.
 *
 * handleBattleEnd persists easy_1 (50 Doka) and hard_1 (200 Doka / 500 XP)
 * from `healUsed`. The flag is only cleared in cleanupBattle (battle end),
 * not at the next battle start. The overworld Doka-to-HP button used to
 * flip it, so a pre-fight heal failed the following no-heal challenge
 * even when no healing spell was cast.
 */
export function recordInBattleChallengeHealUsed(
  inBattle: boolean,
  alreadyUsed: boolean,
): boolean {
  if (!inBattle) return alreadyUsed === true;
  return true;
}

/**
 * BuffShop `health_potion` / `greater_health_potion` restore HP on the
 * player turn (`handleUse` requires inBattle). handleUseItem used to skip
 * `challengeHealUsedRef`, so easy_1 (50 Doka) and hard_1 (200 Doka / 500 XP)
 * still persisted after a mid-fight potion. Spell heals and in-battle
 * Doka-to-HP already flip the flag.
 *
 * Pass the live in-battle flag — the same overworld-must-not-stick rule as
 * {@link recordInBattleChallengeHealUsed}.
 */
export function recordChallengeItemHealUsed(
  inBattle: boolean,
  alreadyUsed: boolean,
): boolean {
  return recordInBattleChallengeHealUsed(inBattle, alreadyUsed);
}

/** Player combatant ids that restore the character strip, not a summon. */
export function isPlayerHealTargetId(id: string | undefined | null): boolean {
  return id === "player" || id === "__player__";
}

/**
 * Life Drain (`applyDamageToEnemy`) and summon/ctx.heal restore player HP
 * without the executeCastAttempt `self` + `heal` gate. handleBattleEnd then
 * persisted easy_1 (50 Doka) and hard_1 (200 Doka / 500 XP) as a clean
 * no-heal fight. Record only when HP actually increased, and only in battle
 * — the same overworld-must-not-stick rule as Doka-to-HP.
 */
export function recordChallengeHealFromHpRestore(
  inBattle: boolean,
  alreadyUsed: boolean,
  restoredHp: number,
): boolean {
  const restored = Number(restoredHp);
  if (!inBattle || !Number.isFinite(restored) || restored <= 0) {
    return alreadyUsed === true;
  }
  return recordInBattleChallengeHealUsed(true, alreadyUsed);
}

/**
 * Lava / spike tiles live on the overworld map and also deal HP during
 * combat walks. The challenge counter is zeroed in cleanupBattle, not at
 * battle start, so an out-of-combat hazard step must not increment it —
 * leftover overworld damage would fail the next fight's Untouchable.
 */
export function recordInBattleChallengeDamage(
  inBattle: boolean,
  current: number,
  incoming: number,
): number {
  if (!inBattle) return current;
  return recordChallengeDamageTaken(current, incoming);
}

/**
 * Count a player-turn start toward under_N_turns challenges.
 *
 * handleBattleEnd persists legendary_2 (450 Doka / 900 XP) from
 * `challengeTurnCountRef`. The opening player turn used to skip this
 * increment (only `advanceTurn`'s later player branch counted), so six
 * player turns still read as 5 and credited Blitz.
 */
export function recordChallengePlayerTurnStart(current: number): number {
  return Math.max(0, Math.floor(Number(current) || 0)) + 1;
}

/**
 * The first combatant never goes through `advanceTurn`. Count that opening
 * player turn here so Blitz / under-10 / under-15 use the same counter as
 * later player-turn starts.
 */
export function shouldCountOpeningPlayerTurn(
  firstCombatantIsPlayer: boolean,
): boolean {
  return firstCombatantIsPlayer === true;
}

/**
 * AP actually spent this battle for `under_8_ap_per_turn`.
 *
 * handleBattleEnd persists hard_3 (150 Doka / 450 XP) from the peak
 * `maxApUsedInTurn`. The live ref used to reset to 0 at every player
 * turn start, so a 9+ AP dump on turn 1 followed by a cheap finish
 * still credited the reward.
 *
 * Keep a per-turn accumulator (reset on turn start) and a peak that
 * only clears in cleanupBattle.
 */
export function recordChallengeApSpend(
  peak: number,
  spentThisTurn: number,
  cost: number,
): { peak: number; spentThisTurn: number } {
  const add = Math.max(0, Math.floor(Number(cost) || 0));
  const thisTurn = Math.max(0, Math.floor(Number(spentThisTurn) || 0)) + add;
  return {
    spentThisTurn: thisTurn,
    peak: Math.max(0, Math.floor(Number(peak) || 0), thisTurn),
  };
}

/**
 * resolvePlayerCast results that consumed the spell attempt.
 * `summon` must debit the same as `cast` / `fizzled` — canvas click
 * routed summons through executeCastAttempt and then skipped the
 * follow-up debit because a stale comment claimed it was already paid.
 */
export function castResultSpendsAp(result: string): boolean {
  return result === "cast" || result === "fizzled" || result === "summon";
}

/**
 * Tile-click / touch follow-up after executeCastAttempt.
 *
 * #59 moved the debit into executeCastAttempt for cast / fizzled / summon.
 * The tile follow-up still deducted on fizzle, so a 4-AP miss from 6 AP
 * left 0 instead of 2 and ended the turn. Follow-up must not debit again.
 */
export function castFollowUpShouldDebitAp(result: string): boolean {
  return !castResultSpendsAp(result);
}

/**
 * Cooldown starts after a completed cast / summon. Fizzle spends AP
 * but does not lock the spell (matches the tile-click follow-up).
 */
export function castResultAppliesCooldown(result: string): boolean {
  return result === "cast" || result === "summon";
}

/**
 * BattleUIPanel only disables re-selection. Sprite-click,
 * tile-click, and Attack Nearest keep the spell selected when leftover
 * AP remains, so Inferno (5 AP / 3-turn CD) could be recast every click
 * until AP ran out, then every later turn, without ever consulting the
 * cooldown map.
 */
export function isSpellOnCooldown(turnsRemaining: unknown): boolean {
  return Math.max(0, Math.floor(Number(turnsRemaining) || 0)) > 0;
}

/** Configured lock length. 0 / invalid → no cooldown. */
export function nextSpellCooldownTurns(cooldown: unknown): number {
  const n = Math.floor(Number(cooldown) || 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * After AP has already been deducted, leftover is in the live ref.
 * Subtracting the cost again kicks the player to walk whenever remaining
 * AP is less than the spell cost (8 AP, 4-cost cast → 4 left, still cleared).
 */
export function shouldClearSpellAfterApSpend(remainingAp: number): boolean {
  return Math.max(0, Math.floor(Number(remainingAp) || 0)) <= 0;
}

/**
 * legendary_3 Striker (400 Doka / 800 XP) requires every spent attempt
 * to land within Chebyshev distance 2 of the caster. Sprite-click used
 * to skip the tile-click follow-up, and player-controlled summons
 * (Archer Poison Arrow range 4, Slow range 3) call resolveSpellCast
 * without that follow-up, so a range-3+ hit still persisted the reward.
 * Once false, it stays false for the fight.
 */
export function recordChallengeDirectHit(
  stillDirect: boolean,
  caster: { x: number; y: number },
  target: { x: number; y: number },
): boolean {
  if (!stillDirect) return false;
  const dx = Math.abs(Number(target.x) - Number(caster.x));
  const dy = Math.abs(Number(target.y) - Number(caster.y));
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return false;
  return Math.max(dx, dy) <= 2;
}

export type DirectHitChallengeState = {
  stillDirect: boolean;
  attempts: number;
};

/**
 * Count a spent spell attempt toward Striker. `recordChallengeDirectHit`
 * alone left attempts at 0, so a no-cast victory still read
 * `directHit === true` and persisted 400 Doka / 800 XP.
 */
export function applyChallengeDirectHit(
  state: DirectHitChallengeState,
  caster: { x: number; y: number },
  target: { x: number; y: number },
): DirectHitChallengeState {
  return {
    stillDirect: recordChallengeDirectHit(state.stillDirect, caster, target),
    attempts: Math.max(0, Math.floor(Number(state.attempts) || 0)) + 1,
  };
}

/** legendary_3: every spent attempt in range, and at least one attempt. */
export function isStrikerChallengeComplete(progress: {
  directHit: boolean;
  directHitAttempts?: number;
}): boolean {
  return (
    progress.directHit === true &&
    Math.max(0, Math.floor(Number(progress.directHitAttempts) || 0)) > 0
  );
}

/**
 * True when the condition can no longer be satisfied this battle
 * (banner chip should flip to ✗). "under_N_turns" challenges are only
 * failed at battle end (turn count is final only on victory), so they
 * report false mid-battle.
 */
export function isChallengeFailed(
  challenge: Challenge,
  progress: ChallengePanelProgress,
): boolean {
  switch (challenge.condition) {
    case "no_healing":
      return progress.healUsed;
    case "under_15_turns":
      return false;
    case "under_50_damage":
      return progress.totalDamage >= 50;
    case "no_healing_under_30_damage":
      return progress.healUsed || progress.totalDamage >= 30;
    case "under_10_turns":
      return false;
    case "under_8_ap_per_turn":
      return progress.maxApUsedInTurn > 8;
    case "no_damage_taken":
      return progress.totalDamage > 0;
    case "under_5_turns":
      return false;
    case "direct_hit":
      return !progress.directHit;
    default:
      return false;
  }
}

/** Player-facing reason when the mid-fight banner is already failed. */
export function challengeFailCopy(challenge: Challenge): string {
  switch (challenge.condition) {
    case "no_healing":
      return "Failed — a heal was used";
    case "under_50_damage":
      return "Failed — damage taken reached 50";
    case "no_healing_under_30_damage":
      return "Failed — heal used or damage reached 30";
    case "under_8_ap_per_turn":
      return "Failed — more than 8 AP spent in one turn";
    case "no_damage_taken":
      return "Failed — damage was taken";
    case "direct_hit":
      return "Failed — a spell landed beyond 2 tiles";
    default:
      return "Failed!";
  }
}
