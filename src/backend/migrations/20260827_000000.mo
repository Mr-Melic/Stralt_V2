import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";
import AccessControl "mo:caffeineai-authorization/access-control";

module {

  // ─── Inlined project types referenced by stable fields ────────────────────
  // The migration chain must not import project modules, so every type a stable
  // field references is inlined here. This is a pure legacy→EM upgrade: the
  // stable shape is unchanged, so NewActor aliases OldActor and data passes
  // through untouched.

  type UserProfile = {
    name : Text;
    uiLayout : Text;
  };

  type CharacterStats = {
    hp : Nat;
    ap : Nat;
    mp : Nat;
    atk : Nat;
    res : Nat;
    evasion : Nat;
    init : Nat;
    sp : Nat;
    sr : Nat;
    resilience : Nat;
    chc : Nat;
    killCount : Nat;
  };

  type Character = {
    name : Text;
    pieceType : Text;
    level : Nat;
    experience : Nat;
    stats : CharacterStats;
    pixelPattern : Text;
    colors : [Text];
    rotation : Nat;
    spellLevelKeys : [Text];
    spellLevelValues : [Nat];
    bloodBalance : ?Nat;
    covenantBuff : ?Text;
    shrineCount : ?Nat;
    activeSpells : ?[Nat];
    spellBarOrder : ?[Text];
    bossRushMasterComplete : ?Bool;
  };

  type CharacterSlot = ?Character;

  type CharacterSlots = {
    slot1 : CharacterSlot;
    slot2 : CharacterSlot;
    slot3 : CharacterSlot;
  };

  type BattleEffect = {
    id : Text;
    name : Text;
    description : Text;
    effectType : { #damage; #buff; #debuff };
    value : Int;
  };

  type EnemyConfig = {
    id : Text;
    name : Text;
    hp : Nat;
    ap : Nat;
    mp : Nat;
    initStat : Nat;
    levelMin : Nat;
    levelMax : Nat;
    regions : [Text];
    spriteUrl : ?Text;
  };

  type RegionConfig = {
    id : Text;
    name : Text;
    levelMin : Nat;
    levelMax : Nat;
    battleEffects : [BattleEffect];
    backgroundColor : Text;
  };

  type PlayerSpriteConfig = {
    id : Text;
    name : Text;
    characterPieceType : Text;
    frontUrl : ?Text;
    rightUrl : ?Text;
    leftUrl : ?Text;
    backUrl : ?Text;
    frontWalkFrames : [Text];
    rightWalkFrames : [Text];
    leftWalkFrames : [Text];
    backWalkFrames : [Text];
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
    cooldown : Nat;
  };

  type MapModifierConfig = {
    id : Text;
    name : Text;
    description : Text;
    modifierType : Text;
    active : Bool;
    triggerChance : Nat;
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

  type ShopPackage = {
    id : Text;
    dokaAmount : Nat;
    priceEuroCents : Nat;
    paymentLink : Text;
    displayOrder : Nat;
  };

  type PurchaseRecord = {
    id : Text;
    userPrincipal : Principal;
    dokaAmount : Nat;
    packageId : Text;
    customerName : Text;
    customerSurname : Text;
    customerEmail : Text;
    customerAddress : Text;
    customerCity : Text;
    customerCountry : Text;
    customerPostal : Text;
    proofFileUrl : Text;
    timestamp : Int;
    status : Text;
  };

  type AchievementConfig = {
    id : Text;
    name : Text;
    description : Text;
    dokaReward : Nat;
    condition : Text;
    active : Bool;
  };

  type AchievementProgress = {
    principalId : Text;
    achievementId : Text;
    unlocked : Bool;
    unlockedAt : Int;
    claimed : Bool;
  };

  type BuffInventoryItem = {
    itemId : Text;
    quantity : Nat;
  };

  type BuffInventory = [BuffInventoryItem];

  type DungeonRecord = {
    chainDepth : Nat;
    totalMapsCompleted : Nat;
    bestRewardMultiplier : Float;
  };

  type BossStats = {
    hp : Nat;
    ap : Nat;
    mp : Nat;
    atk : Nat;
    res : Nat;
    init : Nat;
    sp : Nat;
  };

  type BossPhaseConfig = {
    phaseNumber : Nat;
    hpThreshold : Float;
    statMultiplier : Float;
    spellPoolIds : [Text];
    specialAbilities : [Text];
    summonCount : Nat;
  };

  type BossConfig = {
    id : Text;
    name : Text;
    pieceType : Text;
    baseStats : BossStats;
    phase1 : BossPhaseConfig;
    phase2 : BossPhaseConfig;
    bossMapColor : Text;
    portalColor : Text;
    rewardDokaMultiplier : Float;
    rewardXpMultiplier : Float;
    defeated : Bool;
    adminNotes : Text;
  };

  type BossRushState = {
    currentRoom : Nat;
    highestRoomCompleted : Nat;
    totalBossRushRuns : Nat;
  };

  type ChatMessage = {
    id          : Nat;
    playerName  : Text;
    text        : Text;
    timestampMs : Int;
    colorHex    : Text;
  };

  // ─── Old actor state shape (pre-conversion stable fields) ─────────────────

  type OldActor = {
    accessControlState : AccessControl.AccessControlState;
    userProfiles : Map.Map<Principal, UserProfile>;
    characterSlots : Map.Map<Principal, CharacterSlots>;
    enemyConfigs : Map.Map<Text, EnemyConfig>;
    regionConfigs : Map.Map<Text, RegionConfig>;
    playerSpriteConfigs : Map.Map<Text, PlayerSpriteConfig>;
    var levelUpConfig : LevelUpConfig;
    spellConfigs : Map.Map<Text, SpellConfig>;
    mapModifierConfigs : Map.Map<Text, MapModifierConfig>;
    roleChangeTimestamps : Map.Map<Text, Int>;
    shopPackages : Map.Map<Text, ShopPackage>;
    achievementConfigs : Map.Map<Text, AchievementConfig>;
    achievementProgress : Map.Map<Text, AchievementProgress>;
    purchaseRecords : Map.Map<Text, PurchaseRecord>;
    var nextPurchaseId : Nat;
    bannedPrincipals : Map.Map<Text, Bool>;
    var gameConfig : AdminGameConfig;
    var tierSpawnConfig : TierSpawnConfig;
    var colorPaletteStore : Text;
    var bossRushConfigStore : Text;
    var appVersion : Text;
    changelogs : Map.Map<Text, Text>;
    changelogShownVersions : Map.Map<Principal, Text>;
    buffInventories : Map.Map<Text, BuffInventory>;
    dungeonRecords : Map.Map<Principal, DungeonRecord>;
    bossConfigs : Map.Map<Text, BossConfig>;
    bossPortalAssignments : Map.Map<Text, Text>;
    dokaBalances : Map.Map<Principal, Nat>;
    bossRushStates : Map.Map<Text, BossRushState>;
    var enemyNames : List.List<Text>;
    var enemyNamesInitialised : Bool;
    var adBoxes : [(Text, Text, Bool)];
    // ─── Fields present in the legacy (pre-conversion) stable shape that are
    // now transient in the current actor. They are explicitly discarded here so
    // the EM chain can drop them instead of failing the compatibility check.
    BUFF_CATALOG : [(Text, Text, Nat)];
    DEFAULT_ENEMY_NAMES : [Text];
    ROLE_CHANGE_MIN_NS : Int;
    var chatMessages : List.List<ChatMessage>;
    var nextChatId : Nat;
  };

  // The current actor keeps these fields as transient, so the new stable shape
  // excludes them. NewActor matches the current stable fields exactly.
  type NewActor = {
    accessControlState : AccessControl.AccessControlState;
    userProfiles : Map.Map<Principal, UserProfile>;
    characterSlots : Map.Map<Principal, CharacterSlots>;
    enemyConfigs : Map.Map<Text, EnemyConfig>;
    regionConfigs : Map.Map<Text, RegionConfig>;
    playerSpriteConfigs : Map.Map<Text, PlayerSpriteConfig>;
    var levelUpConfig : LevelUpConfig;
    spellConfigs : Map.Map<Text, SpellConfig>;
    mapModifierConfigs : Map.Map<Text, MapModifierConfig>;
    roleChangeTimestamps : Map.Map<Text, Int>;
    shopPackages : Map.Map<Text, ShopPackage>;
    achievementConfigs : Map.Map<Text, AchievementConfig>;
    achievementProgress : Map.Map<Text, AchievementProgress>;
    purchaseRecords : Map.Map<Text, PurchaseRecord>;
    var nextPurchaseId : Nat;
    bannedPrincipals : Map.Map<Text, Bool>;
    var gameConfig : AdminGameConfig;
    var tierSpawnConfig : TierSpawnConfig;
    var colorPaletteStore : Text;
    var bossRushConfigStore : Text;
    var appVersion : Text;
    changelogs : Map.Map<Text, Text>;
    changelogShownVersions : Map.Map<Principal, Text>;
    buffInventories : Map.Map<Text, BuffInventory>;
    dungeonRecords : Map.Map<Principal, DungeonRecord>;
    bossConfigs : Map.Map<Text, BossConfig>;
    bossPortalAssignments : Map.Map<Text, Text>;
    dokaBalances : Map.Map<Principal, Nat>;
    bossRushStates : Map.Map<Text, BossRushState>;
    var enemyNames : List.List<Text>;
    var adBoxes : [(Text, Text, Bool)];
  };

  public func migration(old : OldActor) : NewActor {
    {
      accessControlState = old.accessControlState;
      userProfiles = old.userProfiles;
      characterSlots = old.characterSlots;
      enemyConfigs = old.enemyConfigs;
      regionConfigs = old.regionConfigs;
      playerSpriteConfigs = old.playerSpriteConfigs;
      var levelUpConfig = old.levelUpConfig;
      spellConfigs = old.spellConfigs;
      mapModifierConfigs = old.mapModifierConfigs;
      roleChangeTimestamps = old.roleChangeTimestamps;
      shopPackages = old.shopPackages;
      achievementConfigs = old.achievementConfigs;
      achievementProgress = old.achievementProgress;
      purchaseRecords = old.purchaseRecords;
      var nextPurchaseId = old.nextPurchaseId;
      bannedPrincipals = old.bannedPrincipals;
      var gameConfig = old.gameConfig;
      var tierSpawnConfig = old.tierSpawnConfig;
      var colorPaletteStore = old.colorPaletteStore;
      var bossRushConfigStore = old.bossRushConfigStore;
      var appVersion = old.appVersion;
      changelogs = old.changelogs;
      changelogShownVersions = old.changelogShownVersions;
      buffInventories = old.buffInventories;
      dungeonRecords = old.dungeonRecords;
      bossConfigs = old.bossConfigs;
      bossPortalAssignments = old.bossPortalAssignments;
      dokaBalances = old.dokaBalances;
      bossRushStates = old.bossRushStates;
      var enemyNames = old.enemyNames;
      var adBoxes = old.adBoxes;
    };
  };
};
