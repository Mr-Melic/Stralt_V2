import Map "mo:core/Map";
import List "mo:core/List";

module {

  // Seed explicit summon metadata onto persisted admin SpellConfig rows.
  // Inlined types stay frozen if project types change later.

  type OldSpellConfig = {
    id : Text;
    name : Text;
    description : Text;
    iconEmoji : Text;
    apCost : Nat;
    mpCost : Nat;
    damage : Nat;
    healAmount : Nat;
    effectType : Text;
    spellType : Text;
    isPhysical : Bool;
    range : Nat;
    minRange : Nat;
    maxRange : Nat;
    modifiableRange : Bool;
    lineOfSight : Bool;
    linear : Bool;
    diagonal : Bool;
    freeCells : Bool;
    aoe : Bool;
    multiTarget : Bool;
    hitsAllies : Bool;
    hitTiles : [(Int, Int)];
    effectCategory : Text;
    usableByPlayer : Bool;
    usableByEnemy : Bool;
    minLevel : Nat;
    effectParams : ?Text;
    cooldown : Nat;
  };

  type SummonUnitDef = {
    pieceType : Text;
    level : Nat;
    hpScale : Float;
    damageScale : Float;
  };

  type SpellConfig = {
    id : Text;
    name : Text;
    description : Text;
    iconEmoji : Text;
    apCost : Nat;
    mpCost : Nat;
    damage : Nat;
    healAmount : Nat;
    effectType : Text;
    spellType : Text;
    isPhysical : Bool;
    range : Nat;
    minRange : Nat;
    maxRange : Nat;
    modifiableRange : Bool;
    lineOfSight : Bool;
    linear : Bool;
    diagonal : Bool;
    freeCells : Bool;
    aoe : Bool;
    multiTarget : Bool;
    hitsAllies : Bool;
    hitTiles : [(Int, Int)];
    effectCategory : Text;
    usableByPlayer : Bool;
    usableByEnemy : Bool;
    minLevel : Nat;
    effectParams : ?Text;
    isSummon : Bool;
    summonAI : Text;
    summonLifespan : Nat;
    summonUnitDef : SummonUnitDef;
    cooldown : Nat;
  };

  type LevelUpConfig = {
    statGrowthPercent : Nat;
    apMpLevelThreshold : Nat;
    spellLevelingBaseCost : Nat;
    spellLevelingCostMultiplier : Float;
    spellDmgGrowthPercent : Nat;
    maxSpellRange : Nat;
    spellRangeGrowthLevels : Nat;
    spellFailBaseChance : Float;
    spellFailReductionPerLevel : Float;
  };

  type AdminGameConfig = {
    leaderBoostPercent : Nat;
    dokaSpawnChance : Nat;
    dokaSpawnBaseValue : Nat;
  };

  type TierSpawnConfig = {
    tierSize : Nat;
    sameTierPercent : Float;
    adjacentTierPercent : Float;
    twoAwayPercent : Float;
    threeOrMorePercent : Float;
  };

  type AdminAuditEntry = {
    adminPrincipal : Text;
    timestampNs : Int;
    action : Text;
    objectId : Text;
    previousSummary : Text;
    newSummary : Text;
  };

  type OldActor = {
    spellConfigs : Map.Map<Text, OldSpellConfig>;
  };

  // New fields are introduced here (not required on OldActor) so an empty
  // previous and a populated pre-rollback previous both get defaults. A
  // canister that already has these fields is already past this tail.
  type NewActor = {
    spellConfigs : Map.Map<Text, SpellConfig>;
    var adminAuditLog : List.List<AdminAuditEntry>;
    var levelUpConfigPrev : LevelUpConfig;
    var hasLevelUpConfigPrev : Bool;
    var gameConfigPrev : AdminGameConfig;
    var hasGameConfigPrev : Bool;
    var tierSpawnConfigPrev : TierSpawnConfig;
    var hasTierSpawnConfigPrev : Bool;
    var colorPalettePrev : Text;
    var hasColorPalettePrev : Bool;
    var bossRushConfigPrev : Text;
    var hasBossRushConfigPrev : Bool;
  };

  public func migration(old : OldActor) : NewActor {
    {
      spellConfigs = old.spellConfigs.map(
        func(_, s : OldSpellConfig) : SpellConfig {
          {
            s with
            isSummon = false;
            summonAI = "";
            summonLifespan = 0;
            summonUnitDef = {
              pieceType = "";
              level = 0;
              hpScale = 0.0;
              damageScale = 0.0;
            };
          }
        }
      );
      var adminAuditLog = List.empty();
      var levelUpConfigPrev = {
        statGrowthPercent = 0;
        apMpLevelThreshold = 0;
        spellLevelingBaseCost = 0;
        spellLevelingCostMultiplier = 0.0;
        spellDmgGrowthPercent = 0;
        maxSpellRange = 0;
        spellRangeGrowthLevels = 0;
        spellFailBaseChance = 0.0;
        spellFailReductionPerLevel = 0.0;
      };
      var hasLevelUpConfigPrev = false;
      var gameConfigPrev = {
        leaderBoostPercent = 0;
        dokaSpawnChance = 0;
        dokaSpawnBaseValue = 0;
      };
      var hasGameConfigPrev = false;
      var tierSpawnConfigPrev = {
        tierSize = 0;
        sameTierPercent = 0.0;
        adjacentTierPercent = 0.0;
        twoAwayPercent = 0.0;
        threeOrMorePercent = 0.0;
      };
      var hasTierSpawnConfigPrev = false;
      var colorPalettePrev = "";
      var hasColorPalettePrev = false;
      var bossRushConfigPrev = "";
      var hasBossRushConfigPrev = false;
    };
  };
};
