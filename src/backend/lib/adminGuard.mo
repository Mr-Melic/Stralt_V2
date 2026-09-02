import Types "../types/admin";

/// Pure admin input / lifecycle guards.
/// Invalid payloads must return #err *before* any store write so the previous
/// valid configuration stays in place.
module {

    public let MAX_DOKA_GRANT : Nat = 10_000_000;
    public let MAX_JSON_BLOB : Nat = 32_768;
    public let MAX_URL : Nat = 2_048;
    public let MAX_ID : Nat = 64;
    public let MAX_NAME : Nat = 100;
    public let MAX_DUNGEON_DEPTH : Nat = 16;
    /// Matches frontend PLAYER_BASE_AP / PLAYER_BASE_MP. saveBattleStats
    /// used to accept maxAp=20 at level 1.
    public let PLAYER_BASE_AP : Nat = 8;
    public let PLAYER_BASE_MP : Nat = 4;
    public let MAX_PERSISTED_AP : Nat = 20;
    public let MAX_PERSISTED_MP : Nat = 20;

    public func isBuiltInSpellId(id : Text) : Bool {
        id == "shadow_strike" or id == "soul_rend" or id == "vampire_bite"
            or id == "reflect_barrier" or id == "thunder_clap" or id == "void_collapse"
    };

    func nan(x : Float) : Bool { x != x };

    func finiteInRange(lbl : Text, x : Float, lo : Float, hi : Float) : ?Text {
        if (nan(x)) {
            return ?(lbl # " must be a finite number");
        };
        if (x < lo or x > hi) {
            return ?(lbl # " is out of range");
        };
        null
    };

    func requireId(id : Text, lbl : Text) : ?Text {
        if (id == "") { return ?(lbl # " id cannot be empty") };
        if (id.size() > MAX_ID) { return ?(lbl # " id exceeds maximum length") };
        null
    };

    func requireName(name : Text, lbl : Text) : ?Text {
        if (name == "") { return ?(lbl # " name cannot be empty") };
        if (name.size() > MAX_NAME) { return ?(lbl # " name exceeds maximum length") };
        null
    };

    func asciiLowerPrefix(t : Text, maxChars : Nat) : Text {
        var out = "";
        var n = 0;
        label scan for (c in t.chars()) {
            if (n >= maxChars) { break scan };
            if (c >= 'A' and c <= 'Z') {
                out #= (c.toNat32() + (32 : Nat32)).toChar().toText();
            } else {
                out #= c.toText();
            };
            n += 1;
        };
        out
    };

    func isUrlPrefixWs(c : Char) : Bool {
        let n = c.toNat32();
        c <= ' '
            or n == (0xA0 : Nat32)
            or n == (0xFEFF : Nat32)
            or (n >= (0x2000 : Nat32) and n <= (0x200B : Nat32))
            or n == (0x2028 : Nat32)
            or n == (0x2029 : Nat32)
            or n == (0x202F : Nat32)
            or n == (0x205F : Nat32)
            or n == (0x3000 : Nat32)
    };

    func trimLeadingWs(url : Text) : Text {
        url.trimStart(#predicate(isUrlPrefixWs))
    };

    func schemePrefix(url : Text) : Text {
        asciiLowerPrefix(trimLeadingWs(url), 16)
    };

    /// Case-insensitive, leading-whitespace-tolerant scheme check.
    /// `JavaScript:`, ` javascript:`, NBSP/BOM prefixes, and `file:` must not
    /// reach player-facing hrefs.
    public func unsafeUrl(url : Text) : Bool {
        let lower = schemePrefix(url);
        lower.startsWith(#text "javascript:")
            or lower.startsWith(#text "data:")
            or lower.startsWith(#text "vbscript:")
            or lower.startsWith(#text "file:")
    };

    /// Landing ads are hosted PNG/WebP. http and non-URL schemes are rejected.
    public func requireHttpsUrl(lbl : Text, url : Text) : ?Text {
        let lower = schemePrefix(url);
        if (not lower.startsWith(#text "https:")) {
            return ?(lbl # " must be an https URL");
        };
        null
    };

    /// Official shop proof is `data:<image|pdf|octet-stream>;base64,...`.
    /// Empty / https / `data:text/html` let a raw client skip the file picker
    /// or store an admin-viewable XSS payload (`window.open` of the proof).
    public func proofDataMimeAllowed(url : Text) : Bool {
        let mime = asciiLowerPrefix(trimLeadingWs(url), 40);
        mime.startsWith(#text "data:image/jpeg")
            or mime.startsWith(#text "data:image/jpg")
            or mime.startsWith(#text "data:image/png")
            or mime.startsWith(#text "data:application/pdf")
            or mime.startsWith(#text "data:application/octet-stream")
    };

    public func validateProofFileUrl(url : Text) : ?Text {
        if (url == "") { return ?"proofFileUrl is required" };
        if (url.size() > 524_288) {
            return ?"proofFileUrl exceeds maximum size";
        };
        let lower = schemePrefix(url);
        if (lower.startsWith(#text "javascript:") or lower.startsWith(#text "vbscript:")) {
            return ?"proofFileUrl uses a forbidden URL scheme";
        };
        if (not proofDataMimeAllowed(url)) {
            return ?"proofFileUrl must be a data: image, PDF, or octet-stream";
        };
        null
    };

    /// Official checkout is one in-flight purchase. A second pending record
    /// is the double-click / raw-client path that auto-completes twice.
    public func rejectSecondPendingPurchase(alreadyPending : Bool) : ?Text {
        if (alreadyPending) { ?"A purchase is already pending" } else { null }
    };

    public func chatCooldownActive(lastSent : Int, now : Int, minNs : Int) : Bool {
        now - lastSent < minNs
    };

    public func validateOptionalUrl(lbl : Text, url : Text) : ?Text {
        if (url == "") { return null };
        if (url.size() > MAX_URL) { return ?(lbl # " exceeds maximum URL length") };
        if (unsafeUrl(url)) { return ?(lbl # " uses a forbidden URL scheme") };
        null
    };

    public func validateRequiredUrl(lbl : Text, url : Text) : ?Text {
        if (url == "") { return ?(lbl # " cannot be empty") };
        validateOptionalUrl(lbl, url)
    };

    public func validateJsonBlob(lbl : Text, blob : Text) : ?Text {
        if (blob.size() > MAX_JSON_BLOB) {
            return ?(lbl # " exceeds maximum size");
        };
        if (blob.size() == 0) { return null };
        if (not (blob.startsWith(#text "{") or blob.startsWith(#text "["))) {
            return ?(lbl # " must be empty or a JSON object/array");
        };
        null
    };

    public func validateDokaGrant(amount : Nat) : ?Text {
        if (amount == 0) { return ?"Grant amount must be greater than 0" };
        if (amount > MAX_DOKA_GRANT) {
            return ?"Grant amount exceeds maximum of 10000000";
        };
        null
    };

    public func validateAssignRole(role : Text) : ?Text {
        if (role != "admin" and role != "user") {
            return ?"role must be \"admin\" or \"user\"";
        };
        null
    };

    /// Failure: statGrowthPercent=0 is the fresh-install seed sentinel and would
    /// look uninitialized; apMpLevelThreshold=0 is used as a divisor on clients;
    /// spellLevelingBaseCost=0 makes every upgrade free.
    public func validateLevelUpConfig(config : Types.LevelUpConfig) : ?Text {
        if (config.statGrowthPercent < 1 or config.statGrowthPercent > 50) {
            return ?"statGrowthPercent must be between 1 and 50";
        };
        if (config.apMpLevelThreshold < 1 or config.apMpLevelThreshold > 100) {
            return ?"apMpLevelThreshold must be between 1 and 100";
        };
        if (config.spellLevelingBaseCost < 1 or config.spellLevelingBaseCost > 1_000_000) {
            return ?"spellLevelingBaseCost must be between 1 and 1000000";
        };
        switch (finiteInRange("spellLevelingCostMultiplier", config.spellLevelingCostMultiplier, 1.0, 10.0)) {
            case (?e) { return ?e };
            case null {};
        };
        if (config.spellDmgGrowthPercent > 50) {
            return ?"spellDmgGrowthPercent must be at most 50";
        };
        if (config.maxSpellRange < 1 or config.maxSpellRange > 20) {
            return ?"maxSpellRange must be between 1 and 20";
        };
        if (config.spellRangeGrowthLevels < 1 or config.spellRangeGrowthLevels > 100) {
            return ?"spellRangeGrowthLevels must be between 1 and 100";
        };
        switch (finiteInRange("spellFailBaseChance", config.spellFailBaseChance, 0.0, 100.0)) {
            case (?e) { return ?e };
            case null {};
        };
        switch (finiteInRange("spellFailReductionPerLevel", config.spellFailReductionPerLevel, 0.0, 10.0)) {
            case (?e) { return ?e };
            case null {};
        };
        null
    };

    public func validateGameConfig(config : Types.AdminGameConfig) : ?Text {
        if (config.dokaSpawnChance > 100) {
            return ?"dokaSpawnChance must be between 0 and 100";
        };
        if (config.leaderBoostPercent > 100) {
            return ?"leaderBoostPercent must be between 0 and 100";
        };
        if (config.dokaSpawnBaseValue < 1 or config.dokaSpawnBaseValue > 10_000) {
            return ?"dokaSpawnBaseValue must be between 1 and 10000";
        };
        null
    };

    /// Fresh-install seed. dokaSpawnChance=0 is a legal live value (no ground
    /// Doka). Using it as the sentinel rewrote a valid admin singleton to
    /// defaultGameConfig on the next actor init. dokaSpawnBaseValue cannot be
    /// 0 after validateGameConfig, so it is the uninitialized marker.
    public func gameConfigNeedsSeed(config : Types.AdminGameConfig) : Bool {
        config.dokaSpawnBaseValue == 0
    };

    /// Failure: tierSize=0 is the fresh-install seed sentinel and is used as a
    /// divisor when computing player tier. Negative percents invert spawn weights.
    public func validateTierSpawnConfig(config : Types.TierSpawnConfig) : ?Text {
        if (config.tierSize < 1 or config.tierSize > 100) {
            return ?"tierSize must be between 1 and 100";
        };
        switch (finiteInRange("sameTierPercent", config.sameTierPercent, 0.0, 100.0)) {
            case (?e) { return ?e };
            case null {};
        };
        switch (finiteInRange("adjacentTierPercent", config.adjacentTierPercent, 0.0, 100.0)) {
            case (?e) { return ?e };
            case null {};
        };
        switch (finiteInRange("twoAwayPercent", config.twoAwayPercent, 0.0, 100.0)) {
            case (?e) { return ?e };
            case null {};
        };
        switch (finiteInRange("threeOrMorePercent", config.threeOrMorePercent, 0.0, 100.0)) {
            case (?e) { return ?e };
            case null {};
        };
        null
    };

    public func validateEnemyConfig(config : Types.EnemyConfig) : ?Text {
        switch (requireId(config.id, "Enemy")) { case (?e) { return ?e }; case null {} };
        switch (requireName(config.name, "Enemy")) { case (?e) { return ?e }; case null {} };
        if (config.hp < 1 or config.hp > 100_000) {
            return ?"Enemy hp must be between 1 and 100000";
        };
        if (config.ap > 20) { return ?"Enemy ap cannot exceed 20" };
        if (config.mp > 20) { return ?"Enemy mp cannot exceed 20" };
        if (config.initStat > 100) { return ?"Enemy initStat cannot exceed 100" };
        if (config.levelMin < 1 or config.levelMax < 1) {
            return ?"Enemy levelMin and levelMax must be at least 1";
        };
        if (config.levelMin > config.levelMax) {
            return ?"Enemy levelMin cannot exceed levelMax";
        };
        if (config.regions.size() > 32) {
            return ?"Enemy regions list exceeds maximum of 32";
        };
        switch (config.spriteUrl) {
            case null {};
            case (?url) {
                switch (validateOptionalUrl("spriteUrl", url)) {
                    case (?e) { return ?e };
                    case null {};
                };
            };
        };
        null
    };

    public func validateRegionConfig(config : Types.RegionConfig) : ?Text {
        switch (requireId(config.id, "Region")) { case (?e) { return ?e }; case null {} };
        switch (requireName(config.name, "Region")) { case (?e) { return ?e }; case null {} };
        if (config.levelMin < 1 or config.levelMax < 1) {
            return ?"Region levelMin and levelMax must be at least 1";
        };
        if (config.levelMin > config.levelMax) {
            return ?"Region levelMin cannot exceed levelMax";
        };
        if (config.battleEffects.size() > 20) {
            return ?"Region battleEffects list exceeds maximum of 20";
        };
        if (config.backgroundColor.size() > 32) {
            return ?"backgroundColor exceeds maximum length";
        };
        null
    };

    public func validatePlayerSpriteConfig(config : Types.PlayerSpriteConfig) : ?Text {
        switch (requireId(config.id, "Sprite")) { case (?e) { return ?e }; case null {} };
        switch (requireName(config.name, "Sprite")) { case (?e) { return ?e }; case null {} };
        if (config.characterPieceType == "") {
            return ?"characterPieceType cannot be empty";
        };
        if (config.frontWalkFrames.size() > 16 or config.rightWalkFrames.size() > 16
            or config.leftWalkFrames.size() > 16 or config.backWalkFrames.size() > 16) {
            return ?"Walk-frame arrays cannot exceed 16 entries";
        };
        func checkOpt(lbl : Text, url : ?Text) : ?Text {
            switch (url) {
                case null { null };
                case (?u) { validateOptionalUrl(lbl, u) };
            }
        };
        switch (checkOpt("frontUrl", config.frontUrl)) { case (?e) { return ?e }; case null {} };
        switch (checkOpt("rightUrl", config.rightUrl)) { case (?e) { return ?e }; case null {} };
        switch (checkOpt("leftUrl", config.leftUrl)) { case (?e) { return ?e }; case null {} };
        switch (checkOpt("backUrl", config.backUrl)) { case (?e) { return ?e }; case null {} };
        func checkFrames(lbl : Text, frames : [Text]) : ?Text {
            for (u in frames.values()) {
                switch (validateOptionalUrl(lbl, u)) {
                    case (?e) { return ?e };
                    case null {};
                };
            };
            null
        };
        switch (checkFrames("frontWalkFrames", config.frontWalkFrames)) { case (?e) { return ?e }; case null {} };
        switch (checkFrames("rightWalkFrames", config.rightWalkFrames)) { case (?e) { return ?e }; case null {} };
        switch (checkFrames("leftWalkFrames", config.leftWalkFrames)) { case (?e) { return ?e }; case null {} };
        switch (checkFrames("backWalkFrames", config.backWalkFrames)) { case (?e) { return ?e }; case null {} };
        null
    };

    func knownSpellType(t : Text) : Bool {
        t == "damage" or t == "heal" or t == "drain" or t == "summon"
    };

    func knownEffectType(t : Text) : Bool {
        t == "damage" or t == "heal" or t == "drain" or t == "dot" or t == "aoe"
            or t == "debuff" or t == "buff" or t == "attract_multi" or t == "summon"
    };

    func knownEffectCategory(t : Text) : Bool {
        t == "damage" or t == "heal" or t == "drain" or t == "defense"
            or t == "pushback" or t == "attract" or t == "teleport"
            or t == "aoe" or t == "dot" or t == "debuff" or t == "buff" or t == "cc"
    };

    func knownSummonAI(t : Text) : Bool {
        t == "hunter" or t == "guardian" or t == "archer" or t == "kiter"
            or t == "bomber" or t == "kamikaze" or t == "healer"
    };

    func knownPieceType(t : Text) : Bool {
        t == "king" or t == "queen" or t == "pawn"
            or t == "rook" or t == "bishop" or t == "knight"
            or t == "wolf" or t == "golem" or t == "archer"
            or t == "bomber" or t == "wisp"
    };

    /// Extends the existing apCost/range/damage caps with enum and relationship checks.
    /// minRange > maxRange is a stale/malformed targeting payload.
    public func validateSpellConfig(config : Types.SpellConfig) : ?Text {
        switch (requireId(config.id, "Spell")) { case (?e) { return ?e }; case null {} };
        switch (requireName(config.name, "Spell")) { case (?e) { return ?e }; case null {} };
        if (config.apCost < 1 or config.apCost > 12) {
            return ?"apCost must be between 1 and 12";
        };
        if (config.mpCost > 20) { return ?"mpCost cannot exceed 20" };
        if (config.cooldown > 10) { return ?"cooldown must be between 0 and 10" };
        if (config.minRange > 20 or config.maxRange > 20) {
            return ?"minRange and maxRange must be at most 20";
        };
        if (config.minRange > config.maxRange) {
            return ?"minRange cannot exceed maxRange";
        };
        if (config.damage > 9999) { return ?"damage must be at most 9999" };
        if (config.healAmount > 1000) { return ?"healAmount must be at most 1000" };
        if (not knownSpellType(config.spellType)) {
            return ?"spellType must be damage, heal, drain, or summon";
        };
        if (not knownEffectType(config.effectType)) {
            return ?"effectType is not a recognized value";
        };
        if (not knownEffectCategory(config.effectCategory)) {
            return ?"effectCategory is not a recognized value";
        };
        if (config.spellType == "summon" and not config.isSummon) {
            return ?"spellType summon requires isSummon";
        };
        if (config.effectType == "summon" and not config.isSummon) {
            return ?"effectType summon requires isSummon";
        };
        if (config.hitTiles.size() > 64) {
            return ?"hitTiles exceeds maximum of 64";
        };
        if (config.minLevel > 999) { return ?"minLevel cannot exceed 999" };
        switch (config.effectParams) {
            case null {};
            case (?p) {
                if (p.size() > 2_048) {
                    return ?"effectParams exceeds maximum length";
                };
            };
        };
        // Summon metadata is optional on non-summons (empty AI, 0 scales).
        // isSummon=true with empty AI used to pass; spawnSummonUnit then does
        // `spell.summonAI || "hunter"` and silently rewrites the unit.
        if (config.isSummon) {
            if (not knownSummonAI(config.summonAI)) {
                return ?"summonAI must be a known archetype";
            };
            if (not knownPieceType(config.summonUnitDef.pieceType)) {
                return ?"summonUnitDef.pieceType is not a recognized value";
            };
        } else {
            if (config.summonAI != "") {
                return ?"summonAI must be empty when isSummon is false";
            };
            if (config.summonUnitDef.pieceType != "" and not knownPieceType(config.summonUnitDef.pieceType)) {
                return ?"summonUnitDef.pieceType is not a recognized piece type";
            };
        };
        if (config.summonLifespan > 20) {
            return ?"summonLifespan cannot exceed 20";
        };
        if (config.summonUnitDef.level > 99) {
            return ?"summonUnitDef.level cannot exceed 99";
        };
        switch (finiteInRange("summonUnitDef.hpScale", config.summonUnitDef.hpScale, 0.0, 10.0)) {
            case (?e) { return ?e };
            case null {};
        };
        switch (finiteInRange("summonUnitDef.damageScale", config.summonUnitDef.damageScale, 0.0, 10.0)) {
            case (?e) { return ?e };
            case null {};
        };
        null
    };

    public func validateBossPortalAssignment(portalId : Text, bossId : Text) : ?Text {
        switch (requireId(portalId, "Portal")) { case (?e) { return ?e }; case null {} };
        switch (requireId(bossId, "Boss")) { case (?e) { return ?e }; case null {} };
        null
    };

    public func validateMapModifier(config : Types.MapModifierConfig) : ?Text {
        switch (requireId(config.id, "Map modifier")) { case (?e) { return ?e }; case null {} };
        switch (requireName(config.name, "Map modifier")) { case (?e) { return ?e }; case null {} };
        if (config.modifierType == "" or config.modifierType.size() > MAX_ID) {
            return ?"modifierType is missing or too long";
        };
        if (config.triggerChance > 100) {
            return ?"Invalid chance value: triggerChance must be between 0 and 100";
        };
        null
    };

    public func validateMapModifierChance(id : Text, chance : Nat) : ?Text {
        switch (requireId(id, "Map modifier")) { case (?e) { return ?e }; case null {} };
        if (chance > 100) {
            return ?"chance must be between 0 and 100";
        };
        null
    };

    /// adminAddDokaToUser used to credit target A and mark any purchaseId
    /// completed, including a pending record owned by B.
    public func purchaseCreditRejected(
        recOwnerText : Text,
        creditedText : Text,
        status : Text,
    ) : ?Text {
        if (recOwnerText != creditedText) {
            return ?"purchaseId does not belong to the credited principal";
        };
        if (status != "pending") {
            return ?"purchase is not pending";
        };
        null
    };

    public func validateShopPackage(pkg : Types.ShopPackage) : ?Text {
        switch (requireId(pkg.id, "Shop package")) { case (?e) { return ?e }; case null {} };
        if (pkg.dokaAmount < 1 or pkg.dokaAmount > 2_000_000) {
            return ?"dokaAmount must be between 1 and 2000000";
        };
        if (pkg.priceEuroCents > 10_000_000) {
            return ?"priceEuroCents exceeds maximum";
        };
        if (pkg.displayOrder > 1_000) {
            return ?"displayOrder exceeds maximum";
        };
        switch (validateOptionalUrl("paymentLink", pkg.paymentLink)) {
            case (?e) { return ?e };
            case null {};
        };
        null
    };

    public func knownAchievementCondition(condition : Text) : Bool {
        condition == "first_battle_win"
            or condition == "survive_1hp"
            or condition == "spell_level_5"
            or condition == "doka_1000"
            or condition == "explore_25_maps"
            or condition == "betrayal_witness"
            or condition == "leader_slayer"
            or condition == "jackpot_heal"
            or condition == "loot_10_doka"
            or condition == "double_betrayal"
            or condition == "level_10"
            or condition == "spell_master_8"
            or condition == "critical_5_in_battle"
            or condition == "pacifist_run"
            or condition == "doka_10000"
    };

    public func validateAchievementConfig(config : Types.AchievementConfig) : ?Text {
        switch (requireId(config.id, "Achievement")) { case (?e) { return ?e }; case null {} };
        switch (requireName(config.name, "Achievement")) { case (?e) { return ?e }; case null {} };
        if (not knownAchievementCondition(config.condition)) {
            return ?"condition is not a recognized value";
        };
        if (config.dokaReward > 1_000_000) {
            return ?"dokaReward exceeds maximum of 1000000";
        };
        if (config.description.size() > 500) {
            return ?"description exceeds maximum length";
        };
        null
    };

    public func validateBossConfig(config : Types.BossConfig) : ?Text {
        switch (requireId(config.id, "Boss")) { case (?e) { return ?e }; case null {} };
        switch (requireName(config.name, "Boss")) { case (?e) { return ?e }; case null {} };
        if (config.baseStats.ap > 20) { return ?"baseStats.ap cannot exceed 20" };
        if (config.baseStats.mp > 20) { return ?"baseStats.mp cannot exceed 20" };
        if (config.baseStats.hp < 1 or config.baseStats.hp > 100_000) {
            return ?"baseStats.hp must be between 1 and 100000";
        };
        switch (finiteInRange("rewardDokaMultiplier", config.rewardDokaMultiplier, 0.0, 100.0)) {
            case (?e) { return ?e };
            case null {};
        };
        switch (finiteInRange("rewardXpMultiplier", config.rewardXpMultiplier, 0.0, 100.0)) {
            case (?e) { return ?e };
            case null {};
        };
        func phaseOk(lbl : Text, phase : Types.BossPhaseConfig) : ?Text {
            switch (finiteInRange(lbl # ".hpThreshold", phase.hpThreshold, 0.0, 1.0)) {
                case (?e) { return ?e };
                case null {};
            };
            switch (finiteInRange(lbl # ".statMultiplier", phase.statMultiplier, 0.0, 10.0)) {
                case (?e) { return ?e };
                case null {};
            };
            if (phase.summonCount > 20) {
                return ?(lbl # ".summonCount cannot exceed 20");
            };
            if (phase.spellPoolIds.size() > 16) {
                return ?(lbl # ".spellPoolIds exceeds maximum of 16");
            };
            for (sid in phase.spellPoolIds.values()) {
                if (sid == "") { return ?(lbl # " spell pool contains an empty id") };
            };
            null
        };
        switch (phaseOk("phase1", config.phase1)) { case (?e) { return ?e }; case null {} };
        switch (phaseOk("phase2", config.phase2)) { case (?e) { return ?e }; case null {} };
        if (config.adminNotes.size() > 2_048) {
            return ?"adminNotes exceeds maximum length";
        };
        null
    };

    public func validateAppVersion(version : Text) : ?Text {
        if (version == "") { return ?"version cannot be empty" };
        if (version.size() > 32) { return ?"version exceeds maximum length" };
        null
    };

    /// Ban reasons were previously written to the public changelog map under
    /// "ban#<principal>". getChangelog is an unauthenticated query.
    public func isBanReasonKey(version : Text) : Bool {
        version.startsWith(#text "ban#")
    };

    public func validateChangelog(version : Text, text : Text) : ?Text {
        switch (validateAppVersion(version)) {
            case (?e) { return ?e };
            case null {};
        };
        if (isBanReasonKey(version)) {
            return ?"version cannot use the ban-reason namespace";
        };
        if (text.size() > MAX_JSON_BLOB) {
            return ?"changelog exceeds maximum size";
        };
        null
    };

    public func validateEnemyName(name : Text) : ?Text {
        if (name == "") { return ?"Name cannot be empty" };
        if (name.size() > MAX_NAME) { return ?"Name exceeds maximum length" };
        null
    };

    public func clampDungeonDepth(depth : Nat) : Nat {
        if (depth > MAX_DUNGEON_DEPTH) { MAX_DUNGEON_DEPTH } else { depth }
    };

    /// Official overworld / heal max HP: floor(100 * (1 + (level-1) * growth/100)).
    /// For integer percents this is 100 + (level-1) * growthPercent.
    /// saveBattleStats used level*200+100, so a raw client persisted 300 HP at level 1.
    public func maxPersistedHp(level : Nat, growthPercent : Nat) : Nat {
        let lvl = if (level < 1) { 1 } else { level };
        let growth = if (growthPercent < 1) { 1 } else { growthPercent };
        100 + (lvl - 1) * growth
    };

    /// Absolute HP writes must not silently cut HP already stored under a
    /// wider historical cap (level*200+100) or after admin lowers
    /// statGrowthPercent. New rows still cannot exceed the official max.
    public func persistHpWriteCap(storedHp : Nat, level : Nat, growthPercent : Nat) : Nat {
        let allowed = maxPersistedHp(level, growthPercent);
        if (storedHp > allowed) { storedHp } else { allowed }
    };

    /// Official battle AP: PLAYER_BASE_AP + floor(level / apMpLevelThreshold).
    /// saveBattleStats used a flat 20 cap, so a raw client persisted 20 AP at
    /// level 1. Starter create still allows 10; persistApWriteCap grandfathers
    /// that stored value the same way persistHpWriteCap does.
    public func maxPersistedAp(level : Nat, threshold : Nat) : Nat {
        let lvl = if (level < 1) { 1 } else { level };
        let every = if (threshold < 1) { 1 } else { threshold };
        let grown = PLAYER_BASE_AP + (lvl / every);
        if (grown > MAX_PERSISTED_AP) { MAX_PERSISTED_AP } else { grown }
    };

    public func persistApWriteCap(storedAp : Nat, level : Nat, threshold : Nat) : Nat {
        let allowed = maxPersistedAp(level, threshold);
        if (storedAp > allowed) { storedAp } else { allowed }
    };

    public func maxPersistedMp(level : Nat, threshold : Nat) : Nat {
        let lvl = if (level < 1) { 1 } else { level };
        let every = if (threshold < 1) { 1 } else { threshold };
        let grown = PLAYER_BASE_MP + (lvl / every);
        if (grown > MAX_PERSISTED_MP) { MAX_PERSISTED_MP } else { grown }
    };

    public func persistMpWriteCap(storedMp : Nat, level : Nat, threshold : Nat) : Nat {
        let allowed = maxPersistedMp(level, threshold);
        if (storedMp > allowed) { storedMp } else { allowed }
    };

    /// Server-checkable achievement conditions. Combat feats stay client-trusted
    /// only when the condition is in the known catalog. An unknown string used
    /// to pass, so adminSetAchievementConfig(condition="instant", dokaReward=1e6)
    /// let any player markAchievementUnlocked + claim.
    public func achievementUnlockRejected(
        condition : Text,
        bestLevel : Nat,
        doka : Nat,
        bestSpellLevel : Nat,
    ) : ?Text {
        if (not knownAchievementCondition(condition)) {
            ?"condition is not a recognized value"
        } else if (condition == "level_10" and bestLevel < 10) {
            ?"Level below 10"
        } else if (condition == "doka_1000" and doka < 1000) {
            ?"Doka balance below 1000"
        } else if (condition == "doka_10000" and doka < 10000) {
            ?"Doka balance below 10000"
        } else if (condition == "spell_level_5" and bestSpellLevel < 5) {
            ?"No spell at level 5"
        } else { null }
    };

    /// completeBossRushRoom used to increment totalBossRushRuns on every
    /// roomIndex=9 while currentRoom stayed 9. Official final-room persist
    /// resets currentRoom first, then complete(9) (already a no-op).
    public func shouldCountBossRushRun(currentRoom : Nat, roomIndex : Nat) : Bool {
        roomIndex == 9 and currentRoom == 9
    };

    public func validateAdBox(index : Nat, imageUrl : Text, linkUrl : Text) : ?Text {
        if (index >= 3) { return ?"index out of range: must be 0, 1, or 2" };
        switch (validateRequiredUrl("imageUrl", imageUrl)) { case (?e) { return ?e }; case null {} };
        switch (requireHttpsUrl("imageUrl", imageUrl)) { case (?e) { return ?e }; case null {} };
        switch (validateRequiredUrl("linkUrl", linkUrl)) { case (?e) { return ?e }; case null {} };
        switch (requireHttpsUrl("linkUrl", linkUrl)) { case (?e) { return ?e }; case null {} };
        null
    };

    public func truncateSummary(text : Text) : Text {
        if (text.size() <= 200) { text } else { "(truncated)" }
    };
};
