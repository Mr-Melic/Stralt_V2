import Common "../types/common";
import TypesLib "../lib/types";

module {

  public type CombatantEntry = Common.CombatantEntry;
  public type Side = Common.Side;
  public type SummonAIKind = Common.SummonAIKind;
  public type SpellConfig = Common.SpellConfig;
  public type EnemyConfig = Common.EnemyConfig;

  /// Public API mixin for game types.
  /// Currently re-exports type definitions and helpers.
  /// Future: add admin endpoints for CRUD on spell/enemy configs.

}
