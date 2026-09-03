import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";
import AccessControl "mo:caffeineai-authorization/access-control";

module {

  // Chain genesis (first in lex order). moc's k=0 `ICStableRead` uses this
  // file's OldActor as type_0 whenever the canister has no recorded migration
  // name (Version 1.0.0 / Caffeine #340 / a fork that never applied EM).
  //
  // A `{}` OldActor traps `RTS error: Memory-incompatible program upgrade`
  // (IC0503) on any populated heap — that is Stralt_V2 canister
  // ozvtz-4aaaa-aaaai-av4yq-cai after restoring the 20260826 *name* still
  // failed: no name matched, so genesis `{}` was the read type.
  //
  // OldActor fields are optional so BOTH shapes work:
  //   * empty canister / fresh install: every field is `null` → defaults
  //     (same zeros / empty maps as the previous `{}` genesis).
  //   * Caffeine #340 37-field legacy actor: each required field promotes
  //     to `?T` and is copied (admin roles, Doka, characters stay).
  // NewActor stays the frozen 37-field pre-transient-drop shape so 20260827
  // can still consume it. Do not add GameKey here.

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

  // Optional so an empty previous is still a subtype (fresh install) and a
  // populated 37-field #340 actor is a subtype (each Ti <: ?Ti). Extra fields
  // beyond this set still trap IC0503 — that is the PR #258 / stuffed-GameKey
  // case, documented under snapshots/unsupported/.
  type OldActor = {
    accessControlState : ?AccessControl.AccessControlState;
    userProfiles : ?Map.Map<Principal, UserProfile>;
    characterSlots : ?Map.Map<Principal, CharacterSlots>;
    enemyConfigs : ?Map.Map<Text, EnemyConfig>;
    regionConfigs : ?Map.Map<Text, RegionConfig>;
    playerSpriteConfigs : ?Map.Map<Text, PlayerSpriteConfig>;
    levelUpConfig : ?LevelUpConfig;
    spellConfigs : ?Map.Map<Text, SpellConfig>;
    mapModifierConfigs : ?Map.Map<Text, MapModifierConfig>;
    roleChangeTimestamps : ?Map.Map<Text, Int>;
    shopPackages : ?Map.Map<Text, ShopPackage>;
    achievementConfigs : ?Map.Map<Text, AchievementConfig>;
    achievementProgress : ?Map.Map<Text, AchievementProgress>;
    purchaseRecords : ?Map.Map<Text, PurchaseRecord>;
    nextPurchaseId : ?Nat;
    bannedPrincipals : ?Map.Map<Text, Bool>;
    gameConfig : ?AdminGameConfig;
    tierSpawnConfig : ?TierSpawnConfig;
    colorPaletteStore : ?Text;
    bossRushConfigStore : ?Text;
    appVersion : ?Text;
    changelogs : ?Map.Map<Text, Text>;
    changelogShownVersions : ?Map.Map<Principal, Text>;
    buffInventories : ?Map.Map<Text, BuffInventory>;
    dungeonRecords : ?Map.Map<Principal, DungeonRecord>;
    bossConfigs : ?Map.Map<Text, BossConfig>;
    bossPortalAssignments : ?Map.Map<Text, Text>;
    dokaBalances : ?Map.Map<Principal, Nat>;
    bossRushStates : ?Map.Map<Text, BossRushState>;
    enemyNames : ?List.List<Text>;
    enemyNamesInitialised : ?Bool;
    adBoxes : ?[(Text, Text, Bool)];
    BUFF_CATALOG : ?[(Text, Text, Nat)];
    DEFAULT_ENEMY_NAMES : ?[Text];
    ROLE_CHANGE_MIN_NS : ?Int;
    chatMessages : ?List.List<ChatMessage>;
    nextChatId : ?Nat;
  };

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

  func take<T>(opt : ?T, fallback : T) : T {
    switch (opt) {
      case (?value) { value };
      case null { fallback };
    };
  };

  // Map.empty / List.empty are non-static (M0014) if bound at module scope
  // in a migration module. Call them only inside `migration`, with explicit
  // K/V so moc does not hit M0098.
  public func migration(old : OldActor) : NewActor {
    {
      accessControlState = take(old.accessControlState, AccessControl.initState());
      userProfiles = take(old.userProfiles, Map.empty<Principal, UserProfile>());
      characterSlots = take(old.characterSlots, Map.empty<Principal, CharacterSlots>());
      enemyConfigs = take(old.enemyConfigs, Map.empty<Text, EnemyConfig>());
      regionConfigs = take(old.regionConfigs, Map.empty<Text, RegionConfig>());
      playerSpriteConfigs = take(old.playerSpriteConfigs, Map.empty<Text, PlayerSpriteConfig>());
      var levelUpConfig = take(old.levelUpConfig, emptyLevelUp);
      spellConfigs = take(old.spellConfigs, Map.empty<Text, SpellConfig>());
      mapModifierConfigs = take(old.mapModifierConfigs, Map.empty<Text, MapModifierConfig>());
      roleChangeTimestamps = take(old.roleChangeTimestamps, Map.empty<Text, Int>());
      shopPackages = take(old.shopPackages, Map.empty<Text, ShopPackage>());
      achievementConfigs = take(old.achievementConfigs, Map.empty<Text, AchievementConfig>());
      achievementProgress = take(old.achievementProgress, Map.empty<Text, AchievementProgress>());
      purchaseRecords = take(old.purchaseRecords, Map.empty<Text, PurchaseRecord>());
      var nextPurchaseId = take(old.nextPurchaseId, 0);
      bannedPrincipals = take(old.bannedPrincipals, Map.empty<Text, Bool>());
      var gameConfig = take(old.gameConfig, emptyGame);
      var tierSpawnConfig = take(old.tierSpawnConfig, emptyTierSpawn);
      var colorPaletteStore = take(old.colorPaletteStore, "");
      var bossRushConfigStore = take(old.bossRushConfigStore, "");
      var appVersion = take(old.appVersion, "");
      changelogs = take(old.changelogs, Map.empty<Text, Text>());
      changelogShownVersions = take(old.changelogShownVersions, Map.empty<Principal, Text>());
      buffInventories = take(old.buffInventories, Map.empty<Text, BuffInventory>());
      dungeonRecords = take(old.dungeonRecords, Map.empty<Principal, DungeonRecord>());
      bossConfigs = take(old.bossConfigs, Map.empty<Text, BossConfig>());
      bossPortalAssignments = take(old.bossPortalAssignments, Map.empty<Text, Text>());
      dokaBalances = take(old.dokaBalances, Map.empty<Principal, Nat>());
      bossRushStates = take(old.bossRushStates, Map.empty<Text, BossRushState>());
      var enemyNames = take(old.enemyNames, List.empty<Text>());
      var enemyNamesInitialised = take(old.enemyNamesInitialised, false);
      var adBoxes = take(old.adBoxes, [] : [(Text, Text, Bool)]);
      BUFF_CATALOG = take(old.BUFF_CATALOG, [] : [(Text, Text, Nat)]);
      DEFAULT_ENEMY_NAMES = take(old.DEFAULT_ENEMY_NAMES, [] : [Text]);
      ROLE_CHANGE_MIN_NS = take(old.ROLE_CHANGE_MIN_NS, 0);
      var chatMessages = take(old.chatMessages, List.empty<ChatMessage>());
      var nextChatId = take(old.nextChatId, 0);
    };
  };
};
