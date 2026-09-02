import { 
  BuffInventory,
  DungeonRecord,
  MapModifierConfig,
  TierSpawnConfig,
  Variant_damage_buff_debuff,
 } from "../backend";
import type { 
  AdminGameConfig,
  BossConfig,
  BossPhaseConfig,
  BossStats,
  Character,
  CharacterSlot,
  CharacterSlots,
  EnemyConfig,
  PlayerSpriteConfig,
  RegionConfig,
  Result,
  SpellConfig,
  UserProfile,
  UserRole,
  backendInterface,
 } from "../backend";
import type { Principal } from "@icp-sdk/core/principal";
import type { UiLayoutActor } from "../hooks/usePanelLayout";

type OkResult = { __kind__: "ok"; ok: null };

const sampleCharacter: Character = {
  name: "Knight",
  pieceType: "knight",
  level: BigInt(3),
  experience: BigInt(150),
  stats: {
    ap: BigInt(6),
    hp: BigInt(100),
    mp: BigInt(4),
    sp: BigInt(10),
    sr: BigInt(5),
    atk: BigInt(20),
    chc: BigInt(10),
    res: BigInt(15),
    killCount: BigInt(0),
    init: BigInt(10),
    resilience: BigInt(10),
    evasion: BigInt(8),
  },
  colors: ["#c8962a", "#0d0f1a", "#ffffff"],
  pixelPattern: "default",
  rotation: BigInt(0),
  spellLevelKeys: [],
  spellLevelValues: [],
};

const sampleSlots: CharacterSlots = {
  slot1: sampleCharacter,
  slot2: null,
  slot3: null,
};

const sampleEnemyConfig: EnemyConfig = {
  id: "skeleton-1",
  name: "Skeleton Warrior",
  ap: BigInt(4),
  hp: BigInt(60),
  mp: BigInt(3),
  levelMin: BigInt(1),
  levelMax: BigInt(5),
  initStat: BigInt(8),
  spriteUrl: undefined,
  regions: ["forest"],
};

const sampleRegionConfig: RegionConfig = {
  id: "forest",
  name: "Dark Forest",
  backgroundColor: "#0d1a0d",
  levelMin: BigInt(1),
  levelMax: BigInt(5),
  battleEffects: [
    {
      id: "poison-1",
      name: "Forest Poison",
      description: "Toxic atmosphere deals damage each turn",
      value: BigInt(5),
      effectType: Variant_damage_buff_debuff.damage,
    },
  ],
};

const okResult: OkResult = { __kind__: "ok", ok: null };
const notAdmin: { __kind__: "err"; err: string } = {
  __kind__: "err",
  err: "Unauthorized: admin only",
};

export const mockBackend: UiLayoutActor = {
  adminDeleteEnemyConfig: async (_id: string) => okResult,
  adminDeletePlayerSpriteConfig: async (_id: string) => okResult,
  adminDeleteRegionConfig: async (_id: string) => okResult,
  adminDeleteSpellConfig: async (_id: string) => okResult,
  adminSetEnemyConfig: async (_config: EnemyConfig) => okResult,
  adminSetPlayerSpriteConfig: async (_config: PlayerSpriteConfig) => okResult,
  adminSetRegionConfig: async (_config: RegionConfig) => okResult,
  adminSetSpellConfig: async (_config: SpellConfig) => okResult,
  assignCallerUserRole: async (_user: Principal, _role: UserRole) => undefined,
  createCharacter: async (_slot: bigint, _character: Character) => okResult,
  deleteCharacter: async (_slot: bigint) => okResult,
  getAllCharacters: async () => ({ __kind__: "ok" as const, ok: [] }),
  getCallerUserProfile: async (): Promise<UserProfile | null> => ({ name: "Player One", uiLayout: "" }),
  getCallerUserRole: async () => "user" as unknown as UserRole,
  getCharacter: async (_slot: bigint): Promise<CharacterSlot> => sampleCharacter,
  getCharacterSlots: async (): Promise<CharacterSlots> => sampleSlots,
  getDokaBalance: async () => BigInt(0),
  getEnemyConfigs: async (): Promise<Array<EnemyConfig>> => [sampleEnemyConfig],
  getMessages: async () => [],
  getPlayerSpriteConfigs: async (): Promise<Array<PlayerSpriteConfig>> => [],
  getRegionConfigs: async (): Promise<Array<RegionConfig>> => [sampleRegionConfig],
  getSpellConfigs: async (): Promise<Array<SpellConfig>> => [],
  getUserProfile: async (_user: Principal): Promise<UserProfile | null> => ({ name: "Player One", uiLayout: "" }),
  getUserRole: async () => "user",
  isCallerAdmin: async () => false,
  saveCallerUserProfile: async (_profile: UserProfile) => undefined,
  calculateAndAwardDoka: async (_enemies: Array<{ level: bigint }>) => BigInt(0),
  sendMessage: async (_playerName: string, _text: string, _colorHex: string) => undefined,
  updateCharacter: async (_slot: bigint, _character: Character) => okResult,
  adminSetLevelUpConfig: async (_config: unknown) => okResult,
  adminSetTierSpawnConfig: async (_config: TierSpawnConfig) => okResult,
  getTierSpawnConfig: async (): Promise<TierSpawnConfig> => ({ tierSize: BigInt(10), sameTierPercent: 60, adjacentTierPercent: 20, twoAwayPercent: 10, threeOrMorePercent: 5 }),
  getLevelUpConfig: async () => ({ spellLevelingBaseCost: BigInt(10), spellLevelingCostMultiplier: 2, statGrowthPercent: BigInt(5), spellDmgGrowthPercent: BigInt(3), apMpLevelThreshold: BigInt(25), spellFailBaseChance: 20.0, maxSpellRange: BigInt(5), spellFailReductionPerLevel: 0.1, spellRangeGrowthLevels: BigInt(10) }),
  upgradeSpell: async (_slot: bigint, _spellId: string) => ({ __kind__: "ok" as const, ok: BigInt(1) }),
  getCharacterStats: async (_slot: bigint) => ({ __kind__: "ok" as const, ok: sampleCharacter }),
  saveBattleStats: async (
    _slot: bigint, _level: bigint, _xp: bigint, _hp: bigint, _maxHp: bigint,
    _ap: bigint, _maxAp: bigint, _mp: bigint, _maxMp: bigint, _attack: bigint,
    _defense: bigint, _initiative: bigint, _dokaBalance: bigint,
    _spellLevelKeys: Array<string>, _spellLevelValues: Array<bigint>
  ) => okResult,
  adminDeleteMapModifier: async (_id: string) => okResult,
  adminSetMapModifier: async (_config: MapModifierConfig) => okResult,
  adminSetMapModifierChance: async (_id: string, _chance: bigint) => okResult,
  getMapModifiers: async (): Promise<Array<MapModifierConfig>> => [],
  getAppVersion: async () => "v161",
  setAppVersion: async (_version: string) => okResult,
  getChangelog: async (_version: string) => null,
  setChangelog: async (_version: string, _text: string) => okResult,
  getChangelogShownVersion: async (_user: import("@icp-sdk/core/principal").Principal) => "",
  markChangelogShown: async (_version: string) => undefined,
  adminAddDokaToUser: async (_userPrincipal: import("@icp-sdk/core/principal").Principal, _dokaAmount: bigint, _purchaseId: string | null) => okResult,
  adminBanAccount: async (_userPrincipal: import("@icp-sdk/core/principal").Principal) => okResult,
  adminDeleteShopPackage: async (_id: string) => okResult,
  adminGetPurchaseRecords: async (_filterPrincipal: string | null) => ({ __kind__: "ok" as const, ok: [] }),
  adminSetShopPackage: async (_pkg: import("../backend").ShopPackage) => okResult,
  adminUnbanAccount: async (_userPrincipal: import("@icp-sdk/core/principal").Principal) => okResult,
  checkAccountStatus: async () => ({ isBanned: false }),
  diagnoseCharacterSlots: async () => "",
  getMyPurchaseHistory: async () => [],
  getShopPackages: async () => [],
  initiatePurchase: async (_packageId: string, _customerName: string, _customerSurname: string, _customerEmail: string, _customerAddress: string, _customerCity: string, _customerCountry: string, _customerPostal: string) => ({ __kind__: "ok" as const, ok: "mock-purchase-id" }),
  processPendingPurchases: async () => BigInt(0),
  getMyGameKeyPurchaseStatus: async () => null,
  requestGameKeyPurchase: async (_email: string, _consent: boolean, _hintedEuroCents: bigint) => ({ __kind__: "ok" as const, ok: "gk_1" }),
  redeemGameKey: async (_code: string) => ({ __kind__: "err" as const, err: "Invalid GameKey" }),
  adminListGameKeyRequests: async () => ({ __kind__: "ok" as const, ok: [] }),
  adminApproveGameKeyPurchase: async (_id: string, _doka: bigint) => ({ __kind__: "ok" as const, ok: "A".repeat(120) }),
  adminRejectGameKeyPurchase: async (_id: string) => okResult,
  adminGetGameKeyReveal: async (_id: string) => ({ __kind__: "err" as const, err: "GameKey is no longer available to copy" }),
  adminMarkGameKeyEmailed: async (_id: string) => okResult,
  renameCharacter: async (_slot: bigint, _newName: string) => okResult,
  adminSetGameConfig: async (_config: AdminGameConfig) => okResult,
  _initializeAccessControl: async (): Promise<void> => undefined,
  getGameConfig: async () => ({ leaderBoostPercent: BigInt(10), dokaSpawnChance: BigInt(40), dokaSpawnBaseValue: BigInt(5) }),
  getAchievementConfigs: async () => [],
  getPlayerAchievements: async () => [],
  markAchievementUnlocked: async (_id: string) => okResult,
  claimAchievementReward: async (_id: string) => ({ __kind__: "ok" as const, ok: BigInt(0) }),
  adminSetAchievementConfig: async (_config: unknown) => okResult,
  adminDeleteAchievementConfig: async (_id: string) => okResult,
  getEnemyNames: async (): Promise<Array<string>> => [],
  addEnemyName: async (_name: string): Promise<void> => undefined,
  deleteEnemyName: async (_name: string): Promise<void> => undefined,
  initDefaultNames: async (): Promise<void> => undefined,
  adminAddDoka: async (_principal: Principal, _amount: bigint) => okResult,
  adminGetDoka: async (_principal: Principal) => ({ __kind__: "ok" as const, ok: BigInt(0) }),
  banPlayer: async (_principal: Principal, _reason: string) => okResult,
  unbanPlayer: async (_principal: Principal) => okResult,
  isPlayerBanned: async (_principal: Principal): Promise<boolean> => false,
  setShopPaymentLink: async (_dokaAmount: bigint, _url: string) => okResult,
  getShopPaymentLinks: async (): Promise<Array<[bigint, string]>> => [],
  getPurchases: async () => ({ __kind__: "ok" as const, ok: [] }),
  // New II-principal admin endpoints
  assignUserRole: async (_principal: Principal, _role: UserRole) => okResult,
  getCallerDokaBalance: async (): Promise<bigint> => BigInt(0),
  getLeaderboard: async () => [],
  saveKillCount: async (_slot: bigint, _kills: bigint) => ({ __kind__: "ok" as const, ok: null as null }),

  // Buff shop endpoints
  getBuffCatalog: async (): Promise<Array<[string, string, bigint]>> => [
    ["health_potion", "Health Potion", BigInt(50)],
    ["atk_boost", "Attack Boost", BigInt(80)],
    ["def_shield", "Defense Shield", BigInt(80)],
  ],
  getBuffInventory: async (_slot: bigint): Promise<{ __kind__: "ok"; ok: BuffInventory } | { __kind__: "err"; err: string }> =>
    ({ __kind__: "ok", ok: [] }),
  purchaseBuff: async (_slot: bigint, _itemId: string): Promise<{ __kind__: "ok"; ok: BuffInventory } | { __kind__: "err"; err: string }> =>
    ({ __kind__: "ok", ok: [] }),
  useBuffItem: async (_slot: bigint, _itemId: string): Promise<{ __kind__: "ok"; ok: BuffInventory } | { __kind__: "err"; err: string }> =>
    ({ __kind__: "ok", ok: [] }),

  // Dungeon chain endpoints
  getDungeonRecord: async (_principal: Principal): Promise<DungeonRecord | null> => null,
  updateDungeonProgress: async (_principal: Principal, _depth: bigint): Promise<void> => undefined,
  resetDungeonChain: async (_principal: Principal): Promise<void> => undefined,

  // Enemy HP scaling
  getEnemyHPForLevel: async (_enemyTier: bigint, _level: bigint): Promise<bigint> => BigInt(60),

  // Boss system endpoints
  getAllBossConfigs: async (): Promise<Array<BossConfig>> => [
    {
      id: "pale-archbishop",
      name: "The Pale Archbishop",
      pieceType: "bishop",
      portalColor: "#9333ea",
      bossMapColor: "#1a0a2e",
      adminNotes: "Phase 1 curses spell range; Phase 2 summons skeletons",
      rewardXpMultiplier: 5,
      rewardDokaMultiplier: 10,
      defeated: false,
      baseStats: { ap: BigInt(8), hp: BigInt(500), mp: BigInt(6), sp: BigInt(20), atk: BigInt(40), res: BigInt(25), init: BigInt(12) },
      phase1: { phaseNumber: BigInt(1), hpThreshold: 1.0, statMultiplier: 1.0, spellPoolIds: ["curse-range"], specialAbilities: ["area_curse"], summonCount: BigInt(0) },
      phase2: { phaseNumber: BigInt(2), hpThreshold: 0.5, statMultiplier: 1.5, spellPoolIds: ["dark-bolt", "summon"], specialAbilities: ["reflect_shield"], summonCount: BigInt(2) },
    },
  ],
  getBossConfig: async (_id: string): Promise<BossConfig | null> => null,
  getBossPortalAssignments: async (): Promise<Array<[string, string]>> => [["portal-boss-1", "pale-archbishop"]],
  setBossConfig: async (_config: BossConfig): Promise<{ __kind__: "ok"; ok: null } | { __kind__: "err"; err: string }> => okResult,
  deleteBossConfig: async (_id: string): Promise<{ __kind__: "ok"; ok: null } | { __kind__: "err"; err: string }> => okResult,
  setBossPortalAssignment: async (_portalId: string, _bossId: string): Promise<{ __kind__: "ok"; ok: null } | { __kind__: "err"; err: string }> => okResult,
  deleteBossPortalAssignment: async (_portalId: string): Promise<{ __kind__: "ok"; ok: null } | { __kind__: "err"; err: string }> => okResult,

  // Session state endpoints
  getSessionState: async (_slot: bigint): Promise<{ __kind__: "ok"; ok: { activeSpells: bigint[]; covenantBuff: string; shrineCount: bigint; bloodBalance: bigint } } | { __kind__: "err"; err: string }> =>
    ({ __kind__: "ok", ok: { bloodBalance: BigInt(100), covenantBuff: "", shrineCount: BigInt(0), activeSpells: [] } }),
  saveActiveSpells: async (_slot: bigint, _spells: bigint[]): Promise<{ __kind__: "ok"; ok: null } | { __kind__: "err"; err: string }> =>
    ({ __kind__: "ok", ok: null }),
  updateSessionState: async (_slot: bigint, _bloodBalance: bigint, _covenantBuff: string, _shrineCount: bigint): Promise<{ __kind__: "ok"; ok: null } | { __kind__: "err"; err: string }> =>
    ({ __kind__: "ok", ok: null }),
  setSpellBarOrder: async (_slot: bigint, _spellIds: Array<string>) => okResult,

  // Ad boxes
  getAdBoxes: async (): Promise<Array<[string, string, boolean]>> => [["",'',false],["",'',false],["",'',false]],
  adminSetAdBox: async (_i: bigint, _img: string, _link: string) => ({ __kind__: "ok" as const, ok: null as null }),
  adminClearAdBox: async (_i: bigint) => ({ __kind__: "ok" as const, ok: null as null }),

  // Boss rush
  getBossRushState: async (_userId: unknown, _slot: bigint): Promise<[bigint, bigint, bigint]> => [BigInt(0), BigInt(0), BigInt(0)],
  setBossRushProgress: async (_slot: bigint, _room: bigint): Promise<void> => undefined,
  completeBossRushRoom: async (_slot: bigint, _room: bigint, _doka: bigint, _xp: bigint) => ({ __kind__: "ok" as const, ok: null as null }),
  resetBossRush: async (_slot: bigint): Promise<void> => undefined,
  adminSetColorPalette: async (_palettes: string): Promise<{ __kind__: "ok"; ok: null } | { __kind__: "err"; err: string }> => ({ __kind__: "ok" as const, ok: null }),
  adminRollbackColorPalette: async () => okResult,
  getColorPalette: async (): Promise<string> => "",
  adminSetBossRushConfig: async (_config: string): Promise<{ __kind__: "ok"; ok: null } | { __kind__: "err"; err: string }> => ({ __kind__: "ok" as const, ok: null }),
  adminRollbackBossRushConfig: async () => okResult,
  getBossRushConfig: async (): Promise<string> => "",
  adminRollbackLevelUpConfig: async () => notAdmin,
  adminRollbackGameConfig: async () => notAdmin,
  adminRollbackTierSpawnConfig: async () => notAdmin,
  getAdminAuditLog: async () => notAdmin,

  applyRewards: async (_slot: bigint, _dokaDelta: bigint, _xpDelta: bigint) =>
    ({ __kind__: "ok" as const, ok: { newDoka: BigInt(0), newXp: BigInt(0), newLevel: BigInt(1) } }),

  // Shop admin — principal-based methods
  adminGrantDoka: async (_targetPrincipal: Principal, _amount: bigint) => ({ __kind__: "ok" as const, ok: null as null }),
  banPrincipal: async (_targetPrincipal: Principal) => ({ __kind__: "ok" as const, ok: null as null }),
  getBannedPrincipals: async () => ({ __kind__: "ok" as const, ok: [] as Principal[] }),
  unbanPrincipal: async (_targetPrincipal: Principal) => ({ __kind__: "ok" as const, ok: null as null }),

  // OQL query endpoints (caffeineai-oql Expose mixin)
  schema: async (): Promise<string> => JSON.stringify({ entities: [] }),
  execute: async (_qJson: string): Promise<Result> => ({ hasMore: false, rows: [] }),

  // UI layout blob — single compact JSON Text field, backend-authoritative.
  // Mock returns empty string so the frontend falls back to localStorage.
  getUserUiLayout: async (): Promise<string> => "",
  saveUserUiLayout: async (_layout: string): Promise<{ __kind__: "ok"; ok: null } | { __kind__: "err"; err: string }> => ({ __kind__: "ok" as const, ok: null as null }),

};
