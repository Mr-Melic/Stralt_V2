/**
 * Client-trusted victory feats fired from handleBattleEnd before recap.
 * The victory gate routes Boss Rush room-clear to handleBossRushRoomClear
 * instead, which used to skip this list — pacifist_run (500 Doka),
 * leader_slayer (150), first_battle_win (50), critical_5_in_battle (150),
 * and survive_1hp (100) never unlocked after a room-clear, then battle
 * start reset the per-fight refs.
 *
 * Wallet / level feats (doka_1000, doka_10000, level_10) stay deferred
 * until applyRewards commits — do not add them here.
 */

export interface ClientTrustedVictoryFeatSnapshot {
  hp: number;
  mapsVisited: number;
  groundDokaPickups: number;
  spellBarCount: number;
  hasSpellAtLeast5: boolean;
  critHits: number;
  pacifist: boolean;
  betrayal: boolean;
  doubleBetrayal: boolean;
  leaderSlain: boolean;
  bossId?: string | null;
}

export function clientTrustedVictoryAchievementConditions(
  snap: ClientTrustedVictoryFeatSnapshot,
): string[] {
  const conditions: string[] = ["first_battle_win"];
  if (snap.hp === 1) conditions.push("survive_1hp");
  if (snap.mapsVisited >= 25) conditions.push("explore_25_maps");
  if (snap.groundDokaPickups >= 10) conditions.push("loot_10_doka");
  if (snap.spellBarCount >= 8) conditions.push("spell_master_8");
  if (snap.hasSpellAtLeast5) conditions.push("spell_level_5");
  if (snap.critHits >= 5) conditions.push("critical_5_in_battle");
  if (snap.pacifist) conditions.push("pacifist_run");
  if (snap.betrayal) conditions.push("betrayal_witness");
  if (snap.doubleBetrayal) conditions.push("double_betrayal");
  if (snap.leaderSlain) conditions.push("leader_slayer");
  const bossId = snap.bossId;
  if (typeof bossId === "string" && bossId.length > 0) {
    conditions.push(`boss_defeated_${bossId}`);
  }
  return conditions;
}
