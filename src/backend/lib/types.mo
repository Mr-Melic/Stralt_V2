import Common "../types/common";

module {

  public type CombatantEntry = Common.CombatantEntry;
  public type Side = Common.Side;
  public type SummonAIKind = Common.SummonAIKind;
  public type SummonUnitDef = Common.SummonUnitDef;
  public type SpellConfig = Common.SpellConfig;
  public type EnemyConfig = Common.EnemyConfig;
  public type BarrierTile = Common.BarrierTile;
  public type ActiveEffect = Common.ActiveEffect;
  public type TargetType = Common.TargetType;

  /// Re-export helper functions from common types.
  public let computeEnemyStats = Common.computeEnemyStats;
  public let createPlayerCombatant = Common.createPlayerCombatant;
  public let createEnemyCombatant = Common.createEnemyCombatant;
  public let createSummonCombatant = Common.createSummonCombatant;

}
