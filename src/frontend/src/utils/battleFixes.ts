export interface ChallengeRefs {
  challengeHealUsedRef: React.MutableRefObject<boolean>;
  challengeTotalDamageRef: React.MutableRefObject<number>;
  challengeTurnCountRef: React.MutableRefObject<number>;
  challengeMaxApThisTurnRef: React.MutableRefObject<number>;
  challengeDirectHitRef: React.MutableRefObject<boolean>;
}

export function evaluateChallenges(
  refs: ChallengeRefs,
  playerHp: number,
  playerMaxHp: number,
): { id: string; status: "on_track" | "failed" | "completed" }[] {
  const results: { id: string; status: "on_track" | "failed" | "completed" }[] =
    [];

  // no_healing
  results.push({
    id: "no_healing",
    status: refs.challengeHealUsedRef.current ? "failed" : "on_track",
  });

  // under_15_turns
  results.push({
    id: "under_15_turns",
    status: refs.challengeTurnCountRef.current > 15 ? "failed" : "on_track",
  });

  // direct_hit
  results.push({
    id: "direct_hit",
    status: !refs.challengeDirectHitRef.current ? "failed" : "on_track",
  });

  // survive_with_50_hp
  results.push({
    id: "survive_with_50_hp",
    status: playerHp < playerMaxHp * 0.5 ? "failed" : "on_track",
  });

  // deal_500_damage
  results.push({
    id: "deal_500_damage",
    status:
      refs.challengeTotalDamageRef.current >= 500 ? "completed" : "on_track",
  });

  return results;
}
