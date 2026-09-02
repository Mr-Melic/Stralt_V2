import Map "mo:core/Map";
import Text "mo:core/Text";

module {

  /// Side of a combatant in battle.
  public type Side = { #player; #enemy };

  /// AI behavior kind for summoned units.
  public type SummonAIKind = { #hunter; #guardian; #archer; #bomber; #healer };

  /// Definition of a unit to be summoned.
  public type SummonUnitDef = {
    pieceType     : Text;   // e.g. "wolf", "sentinel", "archer", "bomber", "wisp"
    level         : Nat;
    hpScale       : Float;  // multiplier for base HP
    damageScale   : Float;  // multiplier for base damage
  };

  /// Runtime combatant entry used in battle state.
  public type CombatantEntry = {
    id            : Text;
    name          : Text;
    side          : Side;
    hp            : Nat;
    maxHp         : Nat;
    ap            : Nat;
    mp            : Nat;
    initiative    : Nat;
    // Summon-specific fields (ignored for non-summons)
    isSummon      : Bool;
    summonAI      : ?SummonAIKind;
    ownerId       : ?Text;
    turnsRemaining: ?Nat;
  };

  /// Static barrier placed on a tile.
  public type BarrierTile = {
    x             : Nat;
    y             : Nat;
    turnsRemaining: Nat;
  };

  /// Active status effect on a combatant.
  public type ActiveEffect = {
    targetId      : Text;
    stat          : Text;
    modifier      : Float;
    duration      : Nat;
    type_         : { #buff; #debuff };
    iconEmoji     : Text;
  };

  /// Spell targeting type.
  public type TargetType = { #self; #ally; #enemy; #area; #line; #all; #ground };

  /// Complete spell configuration (mirrors frontend SpellConfig).
  public type SpellConfig = {
    id            : Text;
    name          : Text;
    description   : Text;
    iconEmoji     : Text;
    element       : Text;
    damage        : Nat;
    healAmount    : Nat;
    apCost        : Nat;
    mpCost        : Nat;
    range         : Nat;
    areaRadius    : Nat;
    cooldown      : Nat;
    targetType    : TargetType;
    isPhysical    : Bool;
    buffStat      : Text;
    buffModifier  : Float;
    buffDuration  : Nat;
    debuffStat    : Text;
    debuffModifier: Float;
    debuffDuration: Nat;
    drainPercent  : Float;
    isBarrier     : Bool;
    isSummon      : Bool;
    summonAI      : Text;
    summonUnitDef : SummonUnitDef;
    summonLifespan: Nat;
    levelReq      : Nat;
    isBase        : Bool;
  };

  /// Enemy configuration template.
  ///
  /// Stat system (post-overhaul): WP/WR/SCP removed. Remaining combat stats:
  ///   sp   — Spell Power (increases spell damage/healing by %).
  ///   sr   — Spell Resistance (reduces incoming spell damage by %; excludes DoT).
  ///   res  — Resistance (reduces ALL incoming damage by %, including DoT).
  ///   chc  — Critical Chance (% chance a spell crits).
  ///   init — Initiative (turn order; higher acts earlier).
  public type EnemyConfig = {
    id            : Text;
    name          : Text;
    pieceType     : Text;
    level         : Nat;
    hp            : Nat;
    damage        : Nat;
    res           : Nat;
    sp            : Nat;
    chc           : Nat;
    init          : Nat;
    sr            : Nat;
    xpReward      : Nat;
    dokaReward    : Nat;
    side          : Side;  // always #enemy for normal enemies
  };

  /// Compute default enemy stats scaled by level and piece type.
  /// Returns the post-overhaul stat set: sp, sr, init, res, chc (no wp/wr/scp).
  public func computeEnemyStats(level : Nat, pieceType : Text) : { sp : Nat; sr : Nat; init : Nat; res : Nat; chc : Nat } {
    let base = level * 2;
    let scaled = level * 3;
    var sp = base;
    var sr = base;
    var init_ = base;
    var res = base;
    var chc = base;

    if (pieceType == "rook" or pieceType == "knight") {
      // Tanky: higher RES
      res := scaled + 2;
      sp := base - 1;
    } else if (pieceType == "bishop" or pieceType == "queen") {
      // Casters: higher SP
      sp := scaled + 2;
      res := base - 1;
    } else if (pieceType == "pawn") {
      // Weaker overall
      sp := base - 1;
      sr := base - 1;
      init_ := base - 1;
      res := base - 1;
      chc := base - 1;
    } else if (pieceType == "king") {
      // Balanced, slightly higher init
      init_ := scaled + 1;
    };

    // Ensure minimum of 1
    if (sp < 1) sp := 1;
    if (sr < 1) sr := 1;
    if (init_ < 1) init_ := 1;
    if (res < 1) res := 1;
    if (chc < 1) chc := 1;

    { sp; sr; init = init_; res; chc }
  };

  /// Create a default player combatant entry.
  public func createPlayerCombatant(id : Text, name : Text, hp : Nat, maxHp : Nat, ap : Nat, mp : Nat, initiative : Nat) : CombatantEntry {
    {
      id;
      name;
      side = #player;
      hp;
      maxHp;
      ap;
      mp;
      initiative;
      isSummon = false;
      summonAI = null;
      ownerId = null;
      turnsRemaining = null;
    }
  };

  /// Create a default enemy combatant entry.
  public func createEnemyCombatant(id : Text, name : Text, hp : Nat, maxHp : Nat, ap : Nat, mp : Nat, initiative : Nat) : CombatantEntry {
    {
      id;
      name;
      side = #enemy;
      hp;
      maxHp;
      ap;
      mp;
      initiative;
      isSummon = false;
      summonAI = null;
      ownerId = null;
      turnsRemaining = null;
    }
  };

  /// Create a summoned combatant entry.
  public func createSummonCombatant(id : Text, name : Text, side : Side, hp : Nat, maxHp : Nat, ap : Nat, mp : Nat, initiative : Nat, summonAI : SummonAIKind, ownerId : Text, turnsRemaining : Nat) : CombatantEntry {
    {
      id;
      name;
      side;
      hp;
      maxHp;
      ap;
      mp;
      initiative;
      isSummon = true;
      summonAI = ?summonAI;
      ownerId = ?ownerId;
      turnsRemaining = ?turnsRemaining;
    }
  };

}
