module {
    /// Generic command result used across admin API endpoints.
    public type CmdResult = { #ok; #err : Text };

    /// A battle effect that can be applied in a region.
    public type BattleEffect = {
        id          : Text;
        name        : Text;
        description : Text;
        effectType  : { #damage; #buff; #debuff };
        value       : Int;
    };

    /// Configuration for an enemy type, including stats, spawn regions, and optional sprite.
    public type EnemyConfig = {
        id          : Text;
        name        : Text;
        hp          : Nat;
        ap          : Nat;
        mp          : Nat;
        initStat    : Nat;
        levelMin    : Nat;
        levelMax    : Nat;
        regions     : [Text];
        spriteUrl   : ?Text;
    };

    /// Configuration for a region, including level range, battle effects, and background colour.
    public type RegionConfig = {
        id              : Text;
        name            : Text;
        levelMin        : Nat;
        levelMax        : Nat;
        battleEffects   : [BattleEffect];
        backgroundColor : Text;
    };

    /// Optional player-character sprite panels with per-direction walk-frame arrays.
    public type PlayerSpriteConfig = {
        id                 : Text;
        name               : Text;
        characterPieceType : Text;
        frontUrl           : ?Text;
        rightUrl           : ?Text;
        leftUrl            : ?Text;
        backUrl            : ?Text;
        frontWalkFrames    : [Text];
        rightWalkFrames    : [Text];
        leftWalkFrames     : [Text];
        backWalkFrames     : [Text];
    };

    /// Configuration for a castable spell.
    ///
    /// spellType: "damage" | "heal" | "drain"
    ///   - "damage" : damages the target.
    ///   - "heal"   : restores HP to the caster/player (no enemy damage).
    ///   - "drain"  : damages the enemy AND heals the caster simultaneously.
    ///
    /// isPhysical: when true, only RES (physical resistance) applies — SP (spell resistance) is ignored.
    ///
    /// effectCategory: "damage"|"heal"|"drain"|"defense"|"pushback"|"attract"|"teleport"|"aoe"|"dot"|"debuff"|"buff"|"cc"
    ///
    /// effectParams: optional JSON-like string for special mechanics
    ///   e.g. "{\"pushDistance\":2}" or "{\"teleportMode\":\"self\"}" or "{\"attractDistance\":1}"
    ///
    /// Spell targeting properties:
    ///   modifiableRange — range can be altered by other spells/effects.
    ///   lineOfSight     — requires clear line of sight between caster and target.
    ///   linear          — can only be cast in a straight line along grid axes.
    ///   diagonal        — can only be cast diagonally from the caster's corners.
    ///   freeCells       — target cell must be unoccupied (movement/summon spells).
    ///   aoe             — affects more than one cell; hitTiles defines relative offsets.
    ///   multiTarget     — hits all valid targets in range simultaneously.
    ///   hitsAllies      — also affects allied targets (for multi-target spells).
    ///   hitTiles        — relative (dx, dy) tile offsets that are hit for AoE patterns.
    ///   minRange        — minimum tile distance for valid targeting (0 = self/adjacent).
    ///   maxRange        — maximum tile distance for valid targeting.
    ///
    /// Summon metadata (explicit; never inferred from spell name):
    ///   isSummon        — true if this spell spawns a unit rather than dealing direct damage.
    ///   summonAI        — archetype key (e.g. "hunter", "guardian"); empty when not a summon.
    ///   summonLifespan  — turns the summoned unit lasts; 0 when not a summon.
    ///   summonUnitDef   — piece/stat scales for the spawned unit (not CharacterStats).
    public type SummonUnitDef = {
        pieceType   : Text;
        level       : Nat;
        hpScale     : Float;
        damageScale : Float;
    };

    public type SpellConfig = {
        id              : Text;
        name            : Text;
        description     : Text;
        iconEmoji       : Text;
        apCost          : Nat;
        mpCost          : Nat;
        damage          : Nat;
        healAmount      : Nat;      // HP restored for "heal" or the heal component of "drain"
        effectType      : Text;     // "damage" | "heal" | "dot" | "aoe" | "debuff" | "buff"
        spellType       : Text;     // "damage" | "heal" | "drain"
        isPhysical      : Bool;     // true = only RES applies, SP is ignored
        range           : Nat;      // legacy range field (kept for backwards compat)
        minRange        : Nat;      // minimum targeting distance in tiles
        maxRange        : Nat;      // maximum targeting distance in tiles
        modifiableRange : Bool;     // range can be modified by other spell effects
        lineOfSight     : Bool;     // requires clear line-of-sight to target
        linear          : Bool;     // can only be cast along grid axis lines
        diagonal        : Bool;     // can only be cast diagonally
        freeCells       : Bool;     // target tile must be unoccupied
        aoe             : Bool;     // hits more than one cell
        multiTarget     : Bool;     // hits all valid targets in range
        hitsAllies      : Bool;     // multi-target also hits ally targets
        hitTiles        : [(Int, Int)]; // relative (dx, dy) offsets for AoE hit pattern
        effectCategory  : Text;     // "damage"|"heal"|"drain"|"defense"|"pushback"|"attract"|"teleport"|"aoe"|"dot"|"debuff"|"buff"|"cc"
        usableByPlayer  : Bool;     // whether players can equip/use this spell
        usableByEnemy   : Bool;     // whether enemies can use this spell in battle
        minLevel        : Nat;      // minimum player level required to unlock
        effectParams    : ?Text;    // optional JSON-like string for pushback/attract/teleport params
        isSummon        : Bool;
        summonAI        : Text;
        summonLifespan  : Nat;
        summonUnitDef   : SummonUnitDef;
        /// Number of turns the spell is unavailable after casting. 0 = no cooldown.
        cooldown        : Nat;
    };

    /// Configuration for level-up stat growth and spell leveling costs.
    /// Editable by admin; defaults are applied when not yet set.
    public type LevelUpConfig = {
        /// Percentage all stats grow per character level (e.g. 5 = 5%).
        statGrowthPercent           : Nat;
        /// Every N levels the character gains +1 AP and +1 MP.
        apMpLevelThreshold          : Nat;
        /// Base Doka cost to upgrade a spell from level 0 → 1.
        spellLevelingBaseCost       : Nat;
        /// Multiplier applied to baseCost each successive spell level (e.g. 2.0 = double).
        spellLevelingCostMultiplier : Float;
        /// Percentage damage increase per spell level (e.g. 3 = 3%).
        spellDmgGrowthPercent       : Nat;
        /// Maximum range a spell can grow to via level-up scaling (default 5).
        maxSpellRange               : Nat;
        /// Every N levels of the player, the spell's range increases by 1 (default 10).
        spellRangeGrowthLevels      : Nat;
        /// Base spell fail chance at level 1 (e.g. 20.0 = 20%).
        spellFailBaseChance         : Float;
        /// Fail chance reduction per player level (e.g. 0.1 = -0.1% per level, reaches 0 at level 200).
        spellFailReductionPerLevel  : Float;
    };

    /// Configuration for enemy tier-based spawn probability.
    /// tierSize defines how many levels form one tier (e.g. 10 = tier 1 is levels 1–10).
    /// The four percent fields control how likely the player encounters enemies of the
    /// same tier, one tier away, two tiers away, or three-or-more tiers away.
    /// The values do not need to sum to 100; the frontend normalises them.
    public type TierSpawnConfig = {
        tierSize               : Nat;
        sameTierPercent        : Float;
        adjacentTierPercent    : Float;
        twoAwayPercent         : Float;
        threeOrMorePercent     : Float;
    };

    /// A map modifier that alters gameplay rules for a session.
    ///
    /// modifierType values:
    ///   "slime_flood"      — movement costs double MP per tile cell.
    ///   "paper_windstorm"  — ranged spells (target > 1 tile away) have 50% chance to miss.
    ///
    /// triggerChance: percentage chance (0–100) that this modifier is applied when
    /// the player passes through a portal into a new map. Default is 20.
    public type MapModifierConfig = {
        id            : Text;
        name          : Text;
        description   : Text;
        modifierType  : Text;  // "slime_flood" | "paper_windstorm"
        active        : Bool;
        triggerChance : Nat;   // 0–100, default 20
    };
    /// Global game-play configuration editable by admin.
    /// leaderBoostPercent — % stat boost the leader enemy receives per non-leader ally death.
    /// dokaSpawnChance    — % chance (0–100) that a map contains ground Doka loot pickups.
    /// dokaSpawnBaseValue — base Doka value per individual ground loot pickup.
    public type AdminGameConfig = {
        leaderBoostPercent : Nat;   // default 10
        dokaSpawnChance    : Nat;   // 0–100, default 40
        dokaSpawnBaseValue : Nat;   // default 5
    };

    /// A shop package representing a Doka bundle purchasable by players.
    public type ShopPackage = {
        id             : Text;      // unique identifier e.g. "pkg_10"
        dokaAmount     : Nat;       // amount of Doka granted on purchase
        priceEuroCents : Nat;       // price in euro cents (e.g. 100 = €1.00)
        paymentLink    : Text;      // URL set by admin for the payment processor
        displayOrder   : Nat;       // sort order for display (lower = first)
    };

    /// A record of a Doka purchase initiated by a player.
    /// status: "pending" | "completed" | "cancelled"
    public type PurchaseRecord = {
        id              : Text;      // unique record id
        userPrincipal   : Principal;
        dokaAmount      : Nat;
        packageId       : Text;
        customerName    : Text;
        customerSurname : Text;
        customerEmail   : Text;
        customerAddress : Text;
        customerCity    : Text;
        customerCountry : Text;
        customerPostal  : Text;
        proofFileUrl    : Text;      // URL of uploaded proof-of-address document
        timestamp       : Int;       // nanoseconds since epoch (Time.now())
        status          : Text;      // "pending" | "completed" | "cancelled"
    };

    /// Player GameKey purchase request. The plaintext code is never stored here.
    /// status: "pending" | "approved" | "rejected" | "redeemed"
    public type GameKeyRequest = {
        id               : Text;
        userPrincipal    : Principal;
        email            : Text;
        emailConsent     : Bool;
        hintedEuroCents  : Nat;
        timestamp        : Int;
        status           : Text;
        dokaAmount       : Nat;
        emailed          : Bool;
        approvedAt       : Int;
        redeemedAt       : Int;
        redeemedBy       : Text;
    };

    /// Ledger keyed by the 120-char GameKey. Player queries never return this.
    public type GameKeyLedgerEntry = {
        requestId  : Text;
        dokaAmount : Nat;
        redeemed   : Bool;
        redeemedBy : Text;
    };

    /// Configuration for an achievement, admin-editable.
    ///
    /// condition: machine-readable key used by frontend to detect when the
    /// achievement is earned (e.g. 'first_battle_win', 'doka_1000').
    /// active: false hides the achievement from players but preserves it.
    public type AchievementConfig = {
        id          : Text;   // unique identifier, e.g. "first_blood"
        name        : Text;
        description : Text;
        dokaReward  : Nat;
        condition   : Text;   // 'first_battle_win'|'survive_1hp'|'spell_level_5'|...
        active      : Bool;
    };

    /// Progress record for a single achievement for a single player.
    /// principalId   -- Text-encoded Principal of the player.
    /// achievementId -- matches AchievementConfig.id.
    /// unlocked      -- true once the frontend calls markAchievementUnlocked.
    /// unlockedAt    -- Time.now() (nanoseconds) when unlocked; 0 if not yet.
    /// claimed       -- true once the player has claimed the Doka reward.
    public type AchievementProgress = {
        principalId   : Text;
        achievementId : Text;
        unlocked      : Bool;
        unlockedAt    : Int;
        claimed       : Bool;
    };
    // ─── Buff shop item ──────────────────────────────────────────────────────

    /// A single buff item in a player's inventory.
    public type BuffInventoryItem = {
        itemId   : Text;   // e.g. "health_potion"
        quantity : Nat;
    };

    /// The full buff inventory for a character slot (array of items with quantity > 0).
    public type BuffInventory = [BuffInventoryItem];

    // ─── Dungeon chain record ────────────────────────────────────────────────────

    /// Tracks a player's current dungeon chain progress.
    /// chainDepth           — current depth (0 = not in a chain).
    /// totalMapsCompleted   — cumulative maps completed across all chains this session.
    /// bestRewardMultiplier — highest reward multiplier achieved in any completed chain.
    public type DungeonRecord = {
        chainDepth           : Nat;
        totalMapsCompleted   : Nat;
        bestRewardMultiplier : Float;
    };
    // ─── Boss system ─────────────────────────────────────────────────────────

    /// Stats record for a boss (separate from CharacterStats to avoid coupling).
    public type BossStats = {
        hp   : Nat;
        ap   : Nat;
        mp   : Nat;
        atk  : Nat;
        res  : Nat;
        init : Nat;
        sp   : Nat;
    };

    /// Configuration for one phase of a boss encounter.
    public type BossPhaseConfig = {
        phaseNumber      : Nat;
        hpThreshold      : Float;
        statMultiplier   : Float;
        spellPoolIds     : [Text];
        specialAbilities : [Text];
        summonCount      : Nat;
    };

    /// Full configuration for a boss.
    public type BossConfig = {
        id                   : Text;
        name                 : Text;
        pieceType            : Text;
        baseStats            : BossStats;
        phase1               : BossPhaseConfig;
        phase2               : BossPhaseConfig;
        bossMapColor         : Text;
        portalColor          : Text;
        rewardDokaMultiplier : Float;
        rewardXpMultiplier   : Float;
        defeated             : Bool;
        adminNotes           : Text;
    };

    /// Maps a portal id to the boss id it leads to.
    public type BossPortalAssignment = {
        portalId : Text;
        bossId   : Text;
    };
    /// An advertisement box shown on the login page.
    /// imageUrl — URL of the uploaded banner image.
    /// linkUrl  — destination URL opened in a new tab when clicked.
    /// isActive — false means the slot is empty (no ad shown).
    /// A player character slot with stats, appearance, and progress.
    public type CharacterSlot = {
        id            : Text;
        name          : Text;
        pieceType     : Text;
        level         : Nat;
        xp            : Nat;
        hp            : Nat;
        maxHp         : Nat;
        ap            : Nat;
        mp            : Nat;
        sp            : Nat;
        sr            : Nat;
        res           : Nat;
        chc           : Nat;
        init          : Nat;
        fail          : Nat;
        equippedSpells: [Text];
        spellLevels   : [(Text, Nat)];
        inventory     : [BuffInventoryItem];
        appearance    : { skinColor : Text; eyeColor : Text; hairColor : Text };
    };

    /// A user profile tied to a Principal.
    public type UserProfile = {
        name : Text;
    };

    /// A sprite configuration for player characters.
    public type SpriteConfig = {
        id                 : Text;
        name               : Text;
        characterPieceType : Text;
        frontUrl           : ?Text;
        rightUrl           : ?Text;
        leftUrl            : ?Text;
        backUrl            : ?Text;
        frontWalkFrames    : [Text];
        rightWalkFrames    : [Text];
        leftWalkFrames     : [Text];
        backWalkFrames     : [Text];
    };

    /// A color palette configuration.
    public type ColorPalette = {
        primary   : Text;
        secondary : Text;
        accent    : Text;
        background: Text;
        text      : Text;
    };

    /// Boss rush state for a player.
    public type BossRushState = {
        currentRoom   : Nat;
        totalRooms    : Nat;
        bestRoom      : Nat;
        completed     : Bool;
        rewardClaimed : Bool;
    };

    /// An advertisement box shown on the login page.
    /// imageUrl — URL of the uploaded banner image.
    /// linkUrl  — destination URL opened in a new tab when clicked.
    /// isActive — false means the slot is empty (no ad shown).
    public type AdBox = {
        imageUrl : Text;
        linkUrl  : Text;
        isActive : Bool;
    };

    /// Append-only admin change record. Never store secrets, payment PII, or tokens.
    public type AdminAuditEntry = {
        adminPrincipal  : Text;
        timestampNs     : Int;
        action          : Text;
        objectId        : Text;
        previousSummary : Text;
        newSummary      : Text;
    };
};
