import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface UserProfile {
    name: string;
    uiLayout: string;
}
export interface MapModifierConfig {
    id: string;
    active: boolean;
    name: string;
    description: string;
    modifierType: string;
    triggerChance: bigint;
}
export interface BossStats {
    ap: bigint;
    hp: bigint;
    mp: bigint;
    sp: bigint;
    atk: bigint;
    res: bigint;
    init: bigint;
}
export type BuffInventory = Array<BuffInventoryItem>;
export interface BuffInventoryItem {
    itemId: string;
    quantity: bigint;
}
export interface Character {
    rotation: bigint;
    activeSpells?: Array<bigint>;
    pieceType: string;
    name: string;
    covenantBuff?: string;
    level: bigint;
    experience: bigint;
    stats: CharacterStats;
    spellLevelKeys: Array<string>;
    shrineCount?: bigint;
    spellLevelValues: Array<bigint>;
    bloodBalance?: bigint;
    bossRushMasterComplete?: boolean;
    colors: Array<string>;
    spellBarOrder?: Array<string>;
    pixelPattern: string;
}
export interface AchievementConfig {
    id: string;
    active: boolean;
    name: string;
    description: string;
    dokaReward: bigint;
    condition: string;
}
export interface TierSpawnConfig {
    adjacentTierPercent: number;
    tierSize: bigint;
    sameTierPercent: number;
    twoAwayPercent: number;
    threeOrMorePercent: number;
}
export interface SpellConfig {
    id: string;
    aoe: boolean;
    effectCategory: string;
    damage: bigint;
    lineOfSight: boolean;
    freeCells: boolean;
    effectParams?: string;
    mpCost: bigint;
    isPhysical: boolean;
    name: string;
    hitTiles: Array<[bigint, bigint]>;
    description: string;
    minLevel: bigint;
    apCost: bigint;
    multiTarget: boolean;
    modifiableRange: boolean;
    usableByEnemy: boolean;
    maxRange: bigint;
    healAmount: bigint;
    iconEmoji: string;
    hitsAllies: boolean;
    effectType: string;
    usableByPlayer: boolean;
    spellType: string;
    diagonal: boolean;
    minRange: bigint;
    range: bigint;
    linear: boolean;
    cooldown: bigint;
}
export interface AdminGameConfig {
    leaderBoostPercent: bigint;
    dokaSpawnBaseValue: bigint;
    dokaSpawnChance: bigint;
}
export interface ShopPackage {
    id: string;
    displayOrder: bigint;
    dokaAmount: bigint;
    priceEuroCents: bigint;
    paymentLink: string;
}
export interface PlayerSpriteConfig {
    id: string;
    rightWalkFrames: Array<string>;
    name: string;
    frontUrl?: string;
    frontWalkFrames: Array<string>;
    characterPieceType: string;
    rightUrl?: string;
    leftWalkFrames: Array<string>;
    backWalkFrames: Array<string>;
    leftUrl?: string;
    backUrl?: string;
}
export interface LevelUpConfig {
    spellLevelingCostMultiplier: number;
    spellLevelingBaseCost: bigint;
    spellFailBaseChance: number;
    maxSpellRange: bigint;
    spellFailReductionPerLevel: number;
    spellRangeGrowthLevels: bigint;
    statGrowthPercent: bigint;
    spellDmgGrowthPercent: bigint;
    apMpLevelThreshold: bigint;
}
export interface Cell {
    value: Value;
    name: string;
}
export interface ChatMessage {
    id: bigint;
    text: string;
    colorHex: string;
    playerName: string;
    timestampMs: bigint;
}
export type Value = {
    __kind__: "int";
    int: bigint;
} | {
    __kind__: "nat";
    nat: bigint;
} | {
    __kind__: "float";
    float: number;
} | {
    __kind__: "bool";
    bool: boolean;
} | {
    __kind__: "null";
    null: null;
} | {
    __kind__: "text";
    text: string;
};
export type CharacterSlot = Character | null;
export interface CharacterSlots {
    slot1: CharacterSlot;
    slot2: CharacterSlot;
    slot3: CharacterSlot;
}
export interface CharacterStats {
    ap: bigint;
    hp: bigint;
    mp: bigint;
    sp: bigint;
    sr: bigint;
    atk: bigint;
    chc: bigint;
    res: bigint;
    killCount: bigint;
    init: bigint;
    resilience: bigint;
    evasion: bigint;
}
export interface EnemyConfig {
    ap: bigint;
    hp: bigint;
    id: string;
    mp: bigint;
    levelMax: bigint;
    levelMin: bigint;
    name: string;
    initStat: bigint;
    spriteUrl?: string;
    regions: Array<string>;
}
export interface BattleEffect {
    id: string;
    value: bigint;
    name: string;
    description: string;
    effectType: Variant_damage_buff_debuff;
}
export interface BossConfig {
    id: string;
    pieceType: string;
    name: string;
    portalColor: string;
    baseStats: BossStats;
    rewardXpMultiplier: number;
    bossMapColor: string;
    adminNotes: string;
    rewardDokaMultiplier: number;
    phase1: BossPhaseConfig;
    phase2: BossPhaseConfig;
    defeated: boolean;
}
export interface Result {
    hasMore: boolean;
    rows: Array<Array<Cell>>;
}
export interface RegionConfig {
    id: string;
    backgroundColor: string;
    levelMax: bigint;
    levelMin: bigint;
    name: string;
    battleEffects: Array<BattleEffect>;
}
export interface BossPhaseConfig {
    hpThreshold: number;
    statMultiplier: number;
    phaseNumber: bigint;
    spellPoolIds: Array<string>;
    specialAbilities: Array<string>;
    summonCount: bigint;
}
export interface PurchaseRecord {
    id: string;
    customerName: string;
    status: string;
    customerCountry: string;
    dokaAmount: bigint;
    customerSurname: string;
    customerPostal: string;
    customerAddress: string;
    proofFileUrl: string;
    userPrincipal: Principal;
    timestamp: bigint;
    customerEmail: string;
    packageId: string;
    customerCity: string;
}
export interface AchievementProgress {
    achievementId: string;
    unlockedAt: bigint;
    unlocked: boolean;
    claimed: boolean;
    principalId: string;
}
export interface DungeonRecord {
    chainDepth: bigint;
    totalMapsCompleted: bigint;
    bestRewardMultiplier: number;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export enum Variant_damage_buff_debuff {
    damage = "damage",
    buff = "buff",
    debuff = "debuff"
}
export interface backendInterface {
    /**
     * / Adds a new name to the pool (admin only).
     */
    addEnemyName(name: string): Promise<void>;
    /**
     * / Admin: add Doka to any account (used by shop admin panel to manually credit Doka).
     */
    adminAddDoka(userPrincipal: Principal, amount: bigint): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Admin: manually credit Doka to a principal and optionally mark a purchase as completed.
     */
    adminAddDokaToUser(userPrincipal: Principal, dokaAmount: bigint, purchaseId: string | null): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Admin: ban a principal for non-payment.
     * / M2: also clears achievement progress so banned players cannot double-claim
     * /     Doka rewards after being unbanned.
     */
    adminBanAccount(userPrincipal: Principal): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Admin: clear a specific ad box slot (sets it back to empty/inactive).
     */
    adminClearAdBox(index: bigint): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Admin: delete an achievement configuration.
     */
    adminDeleteAchievementConfig(id: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    adminDeleteEnemyConfig(id: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    adminDeleteMapModifier(id: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    adminDeletePlayerSpriteConfig(id: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    adminDeleteRegionConfig(id: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Admin: delete a shop package.
     */
    adminDeleteShopPackage(id: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    adminDeleteSpellConfig(id: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Admin: get the Doka balance of any account.
     */
    adminGetDoka(userPrincipal: Principal): Promise<{
        __kind__: "ok";
        ok: bigint;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Admin: get all purchase records, optionally filtered by principal text.
     */
    adminGetPurchaseRecords(filterPrincipal: string | null): Promise<{
        __kind__: "ok";
        ok: Array<PurchaseRecord>;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Admin: grant Doka to a principal by text ID (used by shop admin panel).
     * / Alias for adminAddDoka; named adminGrantDoka to match the frontend's expected method name.
     */
    adminGrantDoka(targetPrincipal: Principal, amount: bigint): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Admin: create or update an achievement configuration.
     */
    adminSetAchievementConfig(config: AchievementConfig): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Admin: set the image URL and link URL for a specific ad box slot.
     * / index must be 0, 1, or 2; the slot is immediately marked active.
     */
    adminSetAdBox(index: bigint, imageUrl: string, linkUrl: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    adminSetBossRushConfig(config: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    adminSetColorPalette(palettes: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    adminSetEnemyConfig(config: EnemyConfig): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    adminSetGameConfig(config: AdminGameConfig): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    adminSetLevelUpConfig(config: LevelUpConfig): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    adminSetMapModifier(config: MapModifierConfig): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Convenience endpoint: update only the triggerChance of an existing map modifier.
     * / Validates that chance is in the range 0–100.
     */
    adminSetMapModifierChance(id: string, chance: bigint): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    adminSetPlayerSpriteConfig(config: PlayerSpriteConfig): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    adminSetRegionConfig(config: RegionConfig): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Admin: create or update a shop package (set payment link etc.).
     */
    adminSetShopPackage(pkg: ShopPackage): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    adminSetSpellConfig(config: SpellConfig): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    adminSetTierSpawnConfig(config: TierSpawnConfig): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Admin: unban a principal.
     */
    adminUnbanAccount(userPrincipal: Principal): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    applyRewards(slot: bigint, dokaDelta: bigint, xpDelta: bigint): Promise<{
        __kind__: "ok";
        ok: {
            newLevel: bigint;
            newXp: bigint;
            newDoka: bigint;
        };
    } | {
        __kind__: "err";
        err: string;
    }>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    /**
     * / Admin-only: assign a role to another principal.
     * / M1: rate-limited — the same caller cannot change roles more than once per 30 s.
     */
    assignUserRole(target: Principal, role: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Admin: ban a player with a reason (convenience alias for adminBanAccount with reason).
     * / M2: also clears achievement progress so banned players cannot double-claim on unban.
     */
    banPlayer(userPrincipal: Principal, reason: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Admin: ban a principal (simple alias matching the frontend's expected method name).
     */
    banPrincipal(targetPrincipal: Principal): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / For each enemy in the list, computes a Doka drop using true IC randomness,
     * / sums the drops, adds to the caller's balance, and returns the total earned.
     * /
     * / Tier probabilities (out of 10_000 units):
     * /   9000 / 10000 = 90%   → 1–3
     * /    500 / 10000 =  5%   → 1–10
     * /    300 / 10000 =  3%   → 1–50
     * /    100 / 10000 =  1%   → 55–100
     * /     50 / 10000 = 0.5%  → 1–1000
     * /     40 / 10000 = 0.4%  → 1–5000
     * /      5 / 10000 = 0.05% → 1–1_000_000
     * /      1 / 10000 = 0.01% (≈ 0.0001%) → 1–1_000_000_000
     * /      4 remaining → 1–50  (lumped with 3% tier)
     */
    calculateAndAwardDoka(enemies: Array<{
        level: bigint;
    }>): Promise<bigint>;
    /**
     * / Returns whether the caller's account is banned.
     */
    checkAccountStatus(): Promise<{
        isBanned: boolean;
    }>;
    /**
     * / Player: claim the Doka reward for a completed achievement.
     * / Checks: achievement must be unlocked for this player AND not already claimed.
     * / On success, adds dokaReward to the caller's dokaBalances entry and marks as claimed.
     */
    claimAchievementReward(achievementId: string): Promise<{
        __kind__: "ok";
        ok: bigint;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Called when a boss rush room is cleared. Awards Doka and XP to the character.
     * / Room 10 (roomIndex = 9 completed → highestRoomCompleted reaches 10) sets bossRushMasterComplete.
     */
    completeBossRushRoom(slot: bigint, roomIndex: bigint, dokaReward: bigint, xpReward: bigint): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    createCharacter(slot: bigint, character: Character): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Admin: delete a boss configuration by id.
     */
    deleteBossConfig(id: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Admin: remove a boss portal assignment.
     */
    deleteBossPortalAssignment(portalId: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    deleteCharacter(slot: bigint): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Removes a name from the pool by value (admin only).
     */
    deleteEnemyName(name: string): Promise<void>;
    /**
     * / Debug query: returns raw slot data as text for diagnosing serialization issues.
     */
    diagnoseCharacterSlots(): Promise<string>;
    execute(qJson: string): Promise<Result>;
    /**
     * / Public: list all achievement configs (used by frontend to render the achievements panel).
     */
    getAchievementConfigs(): Promise<Array<AchievementConfig>>;
    /**
     * / Returns all three ad box slots.  Empty/inactive slots have isActive=false.
     */
    getAdBoxes(): Promise<Array<[string, string, boolean]>>;
    /**
     * / Public: returns all boss configs.
     */
    getAllBossConfigs(): Promise<Array<BossConfig>>;
    getAllCharacters(): Promise<{
        __kind__: "ok";
        ok: Array<[Principal, CharacterSlots]>;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Returns the current app version string.
     */
    getAppVersion(): Promise<string>;
    /**
     * / Admin query: returns the list of all currently banned principals.
     */
    getBannedPrincipals(): Promise<{
        __kind__: "ok";
        ok: Array<Principal>;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Public: returns a single boss config by id (null if not found).
     */
    getBossConfig(id: string): Promise<BossConfig | null>;
    /**
     * / Public: returns all (portalId, bossId) pairs for active boss portal assignments.
     */
    getBossPortalAssignments(): Promise<Array<[string, string]>>;
    getBossRushConfig(): Promise<string>;
    /**
     * / Returns (currentRoom, highestRoomCompleted, totalBossRushRuns) for any player+slot.
     */
    getBossRushState(userId: Principal, slot: bigint): Promise<[bigint, bigint, bigint]>;
    /**
     * / Public: list all available buff items (itemId, name, dokaCost).
     */
    getBuffCatalog(): Promise<Array<[string, string, bigint]>>;
    /**
     * / Retrieve a character slot's buff inventory.
     */
    getBuffInventory(slot: bigint): Promise<{
        __kind__: "ok";
        ok: BuffInventory;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Public query: returns the Doka balance for the caller (H1, H5).
     */
    getCallerDokaBalance(): Promise<bigint>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    /**
     * / Returns the changelog text for a given version (null if not set).
     */
    getChangelog(version: string): Promise<string | null>;
    /**
     * / Returns the version string of the changelog the given user has already seen.
     * / Empty string means the user has not seen any changelog yet.
     */
    getChangelogShownVersion(user: Principal): Promise<string>;
    getCharacter(slot: bigint): Promise<CharacterSlot>;
    getCharacterSlots(): Promise<CharacterSlots>;
    /**
     * / Retrieve the full Character record for a given slot.
     */
    getCharacterStats(slot: bigint): Promise<{
        __kind__: "ok";
        ok: Character;
    } | {
        __kind__: "err";
        err: string;
    }>;
    getColorPalette(): Promise<string>;
    /**
     * / Returns the caller's current Doka balance.
     */
    getDokaBalance(): Promise<bigint>;
    /**
     * / Returns a player's current dungeon chain record (null if never entered a dungeon).
     */
    getDungeonRecord(principal: Principal): Promise<DungeonRecord | null>;
    getEnemyConfigs(): Promise<Array<EnemyConfig>>;
    /**
     * / Compute the base HP for an enemy of the given tier at the given player level,
     * / using the admin-configurable stat growth percent as the scaling factor.
     * / Formula: baseHP * (1 + (level * scalingFactor))
     * / where scalingFactor = levelUpConfig.statGrowthPercent / 100.0
     * / and baseHP is determined by tier: tier 1 = 30, +20 per additional tier.
     */
    getEnemyHPForLevel(enemyTier: bigint, level: bigint): Promise<bigint>;
    /**
     * / Returns the current list of admin-managed enemy names.
     * / When the stored list is empty the canonical ancient names default list
     * / is returned so enemies are never named “AncientOne” by fallback.
     */
    getEnemyNames(): Promise<Array<string>>;
    getGameConfig(): Promise<AdminGameConfig>;
    getLeaderboard(): Promise<Array<{
        killCount: bigint;
        level: bigint;
        achievementsCompleted: bigint;
        playerName: string;
        principalId: string;
    }>>;
    getLevelUpConfig(): Promise<LevelUpConfig>;
    getMapModifiers(): Promise<Array<MapModifierConfig>>;
    /**
     * / Returns all current chat messages (oldest first).
     */
    getMessages(): Promise<Array<ChatMessage>>;
    /**
     * / Returns the caller's purchase history.
     */
    getMyPurchaseHistory(): Promise<Array<PurchaseRecord>>;
    /**
     * / Public: return the achievement progress records for the given principal.
     */
    getPlayerAchievements(player: Principal): Promise<Array<AchievementProgress>>;
    getPlayerSpriteConfigs(): Promise<Array<PlayerSpriteConfig>>;
    /**
     * / Public: returns all purchase records (admin-only; use adminGetPurchaseRecords for filtered access).
     */
    getPurchases(): Promise<{
        __kind__: "ok";
        ok: Array<PurchaseRecord>;
    } | {
        __kind__: "err";
        err: string;
    }>;
    getRegionConfigs(): Promise<Array<RegionConfig>>;
    /**
     * / Query the persisted session state for a character slot.
     * / Returns null values for any field not yet set (legacy characters).
     */
    getSessionState(slot: bigint): Promise<{
        __kind__: "ok";
        ok: {
            activeSpells: Array<bigint>;
            covenantBuff: string;
            shrineCount: bigint;
            bloodBalance: bigint;
        };
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Public: list all shop packages sorted by displayOrder.
     */
    getShopPackages(): Promise<Array<ShopPackage>>;
    /**
     * / Public: returns all (dokaAmount, paymentLink) pairs.
     */
    getShopPaymentLinks(): Promise<Array<[bigint, string]>>;
    getSpellConfigs(): Promise<Array<SpellConfig>>;
    getTierSpawnConfig(): Promise<TierSpawnConfig>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    /**
     * / Returns "admin" if the caller has admin permission, otherwise "user".
     * / Triggers first-login admin auto-assignment: the very first principal
     * / to call this becomes admin.
     */
    getUserRole(): Promise<string>;
    /**
     * / Load the caller's panel-layout blob. Returns the empty string if the
     * / caller has no UserProfile yet or if uiLayout was never set.
     */
    getUserUiLayout(): Promise<string>;
    /**
     * / Seed the names list on first call if it is empty.
     */
    initDefaultNames(): Promise<void>;
    /**
     * / Player initiates a purchase — creates a pending record.
     * / Returns the purchase id so the frontend can track it.
     * / H5: Accepts all customer fields including proofFileUrl.
     */
    initiatePurchase(packageId: string, customerName: string, customerSurname: string, customerEmail: string, customerAddress: string, customerCity: string, customerCountry: string, customerPostal: string, proofFileUrl: string): Promise<{
        __kind__: "ok";
        ok: string;
    } | {
        __kind__: "err";
        err: string;
    }>;
    isCallerAdmin(): Promise<boolean>;
    /**
     * / Public query: returns whether a given principal is banned.
     */
    isPlayerBanned(userPrincipal: Principal): Promise<boolean>;
    /**
     * / Player: mark an achievement as unlocked (called by the frontend when the condition is met).
     * / Idempotent — calling again on an already-unlocked achievement is a no-op.
     */
    markAchievementUnlocked(achievementId: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Called by the frontend after the player dismisses the changelog popup.
     * / Records that the caller has seen the changelog for the given version.
     */
    markChangelogShown(version: string): Promise<void>;
    /**
     * / Player calls this to trigger auto-completion of their pending purchases.
     */
    processPendingPurchases(): Promise<bigint>;
    /**
     * / Purchase a buff item. Deducts Doka from caller's per-principal balance.
     */
    purchaseBuff(slot: bigint, itemId: string): Promise<{
        __kind__: "ok";
        ok: BuffInventory;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Rename a character in the given slot. Costs 100 Doka from the character's balance.
     */
    renameCharacter(slot: bigint, newName: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Called on player death or boss rush abort. Resets currentRoom to 0.
     */
    resetBossRush(slot: bigint): Promise<void>;
    /**
     * / Reset a player's dungeon chain (called on death or chain completion).
     */
    resetDungeonChain(principal: Principal): Promise<void>;
    /**
     * / Save the active spell loadout (up to 8 spell IDs) for a character slot.
     * / Replaces localStorage so spell loadouts persist across devices and browser clears.
     */
    saveActiveSpells(slot: bigint, spells: Array<bigint>): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Save all battle-relevant stats back to a character slot after a battle.
     * / hp may arrive as negative (character was knocked out); it is clamped to 0 before storage.
     * / C1: dokaBalance parameter is intentionally ignored — Doka is tracked in the
     * /     per-principal dokaBalances Map only. The dokaBalance field no longer exists
     * /     on the Character type.
     */
    saveBattleStats(slot: bigint, level: bigint, xp: bigint, hp: bigint, _maxHp: bigint, _ap: bigint, maxAp: bigint, _mp: bigint, maxMp: bigint, attack: bigint, defense: bigint, initiative: bigint, dokaBalance: bigint, spellLevelKeys: Array<string>, spellLevelValues: Array<bigint>): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    saveKillCount(slot: bigint, kills: bigint): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Save the caller's full panel-layout blob (one compact JSON Text field).
     * / Single save endpoint for the layout — no per-panel records.
     * / Validates the caller is not anonymous. Reads the existing UserProfile,
     * / updates only uiLayout, and writes it back to the userProfiles Map.
     */
    saveUserUiLayout(layout: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    schema(): Promise<string>;
    /**
     * / Append a new message; trims list to at most 200 entries (oldest dropped).
     */
    sendMessage(playerName: string, text: string, colorHex: string): Promise<void>;
    /**
     * / Admin-only: sets the current app version string.
     */
    setAppVersion(version: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Admin: create or update a boss configuration.
     */
    setBossConfig(config: BossConfig): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Admin: assign a boss to a portal (or overwrite an existing assignment).
     */
    setBossPortalAssignment(portalId: string, bossId: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Called when the player enters a boss rush room. Records the current room index.
     */
    setBossRushProgress(slot: bigint, currentRoom: bigint): Promise<void>;
    /**
     * / Admin-only: sets the changelog text for a given version.
     */
    setChangelog(version: string, text: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Admin: set the payment URL for a specific shop package by dokaAmount.
     */
    setShopPaymentLink(dokaAmount: bigint, url: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Set the player-arranged spell bar order for the character in the given slot.
     * / FILTERS out any id not owned by the character (not in spellLevelKeys) and
     * / persists the remaining ids into spellBarOrder. The spell bar is a UI
     * / preference, not an authorization surface, so unknown ids are dropped
     * / rather than rejecting the whole save. Keeps the slot 1-3 guard and the
     * / max-8 cap as structural validation.
     */
    setSpellBarOrder(slot: bigint, spellIds: Array<string>): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Admin: unban a player account.
     */
    unbanPlayer(userPrincipal: Principal): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Admin: unban a principal (simple alias matching the frontend's expected method name).
     */
    unbanPrincipal(targetPrincipal: Principal): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    updateCharacter(slot: bigint, character: Character): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Update a player's dungeon progress (called by the frontend on each map completion).
     */
    updateDungeonProgress(principal: Principal, depth: bigint): Promise<void>;
    /**
     * / Update the session state fields (bloodBalance, covenantBuff, shrineCount)
     * / for a character slot. Replaces localStorage for cross-device persistence.
     */
    updateSessionState(slot: bigint, bloodBalance: bigint, covenantBuff: string, shrineCount: bigint): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Upgrade a spell for the character in the given slot.
     * / Cost = baseCost * 2^currentSpellLevel (all in Doka from character's dokaBalance).
     * / Returns the new spell level on success.
     */
    upgradeSpell(slot: bigint, spellId: string): Promise<{
        __kind__: "ok";
        ok: bigint;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Use one of a buff item (removes one from inventory).
     */
    useBuffItem(slot: bigint, itemId: string): Promise<{
        __kind__: "ok";
        ok: BuffInventory;
    } | {
        __kind__: "err";
        err: string;
    }>;
}
