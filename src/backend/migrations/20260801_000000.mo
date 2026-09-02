import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";
import AccessControl "mo:caffeineai-authorization/access-control";

module {

  // Empty-canister genesis. A fresh Caffeine install runs the whole chain from
  // a canister whose previous stable signature has no fields. The rest of the
  // chain (20260827 drop-transients, 20260831 summon + rollback, 20260901
  // GameKey) describes upgrades from a real populated actor.
  //
  // The runtime only runs chain files whose name sorts AFTER the latest
  // migration already recorded on the canister. This file was named
  // 20260826_000000 until 2026-09-02; the original Caffeine canister
  // (cwofb-yqaaa-aaaap-qp45q-cai) recorded `20260803_185500` as its first
  // migration, so a 20260826 genesis was *pending* there and its `{}` input
  // collided with the 37 legacy fields already in memory (RTS error:
  // Memory-incompatible program upgrade, reproduced on PocketIC). Sorting
  // before 20260803_185500 keeps it skipped on every populated canister and
  // still first on an empty one. Must stay first in lex order and must never
  // become the OldActor of a populated upgrade.

  // ─── Inlined types (must match 20260827 OldActor; no project imports) ──

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

  // Fresh / Caffeine-empty previous version: zero stables.
  type OldActor = {};

  // Must equal 20260827_000000.mo OldActor so the next step can drop transients
  // without rewriting a populated canister. Zero/empty values let main.mo
  // `do { }` seeds still run (statGrowthPercent == 0, empty maps, etc.).
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
    var enemyNamesInitialised : Bool;
    var adBoxes : [(Text, Text, Bool)];
    BUFF_CATALOG : [(Text, Text, Nat)];
    DEFAULT_ENEMY_NAMES : [Text];
    ROLE_CHANGE_MIN_NS : Int;
    var chatMessages : List.List<ChatMessage>;
    var nextChatId : Nat;
  };

  let emptyLevelUp : LevelUpConfig = {
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

  let emptyGame : AdminGameConfig = {
    leaderBoostPercent = 0;
    dokaSpawnChance = 0;
    dokaSpawnBaseValue = 0;
  };

  let emptyTierSpawn : TierSpawnConfig = {
    tierSize = 0;
    sameTierPercent = 0.0;
    adjacentTierPercent = 0.0;
    twoAwayPercent = 0.0;
    threeOrMorePercent = 0.0;
  };

  public func migration(_old : OldActor) : NewActor {
    {
      accessControlState = AccessControl.initState();
      userProfiles = Map.empty();
      characterSlots = Map.empty();
      enemyConfigs = Map.empty();
      regionConfigs = Map.empty();
      playerSpriteConfigs = Map.empty();
      var levelUpConfig = emptyLevelUp;
      spellConfigs = Map.empty();
      mapModifierConfigs = Map.empty();
      roleChangeTimestamps = Map.empty();
      shopPackages = Map.empty();
      achievementConfigs = Map.empty();
      achievementProgress = Map.empty();
      purchaseRecords = Map.empty();
      var nextPurchaseId = 0;
      bannedPrincipals = Map.empty();
      var gameConfig = emptyGame;
      var tierSpawnConfig = emptyTierSpawn;
      var colorPaletteStore = "";
      var bossRushConfigStore = "";
      var appVersion = "";
      changelogs = Map.empty();
      changelogShownVersions = Map.empty();
      buffInventories = Map.empty();
      dungeonRecords = Map.empty();
      bossConfigs = Map.empty();
      bossPortalAssignments = Map.empty();
      dokaBalances = Map.empty();
      bossRushStates = Map.empty();
      var enemyNames = List.empty();
      var enemyNamesInitialised = false;
      var adBoxes = [];
      BUFF_CATALOG = [];
      DEFAULT_ENEMY_NAMES = [];
      ROLE_CHANGE_MIN_NS = 0;
      var chatMessages = List.empty();
      var nextChatId = 0;
    };
  };
};
