import AccessControl "mo:caffeineai-authorization/access-control";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import List "mo:core/List";
import Time "mo:core/Time";
import AdminTypes "types/admin";
import AdminLib "lib/admin";
import AdminGuard "lib/adminGuard";
import Array "mo:core/Array";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Float "mo:core/Float";
import Blob "mo:core/Blob";
import { ic } "mo:ic";
import GameKey "lib/gameKey";

import OQL "mo:caffeineai-oql";
import Expose "mo:caffeineai-oql/Expose";
import Entity "mo:caffeineai-oql/Entity";
import TextValue "mo:caffeineai-oql/TextValue";
import NatValue "mo:caffeineai-oql/NatValue";
import BoolValue "mo:caffeineai-oql/BoolValue";
import IntValue "mo:caffeineai-oql/IntValue";
import FloatValue "mo:caffeineai-oql/FloatValue";
import Text "mo:core/Text";
















actor {
    let accessControlState : AccessControl.AccessControlState;
    include MixinAuthorization(accessControlState);

    public type UserProfile = {
        name : Text;
        /// Compact JSON blob holding the caller's full panel layout (per panel id:
        /// x, y, folded/width state). Empty string = no layout saved yet.
        /// Single field, single endpoint (saveUserUiLayout / getUserUiLayout).
        uiLayout : Text;
    };

    let userProfiles : Map.Map<Principal, UserProfile>;

    public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
        userProfiles.get(caller);
    };

    public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
        if (caller != user) {
            return null;
        };
        userProfiles.get(caller);
    };

    public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
        if (caller.isAnonymous()) {
            return;
        };
        if (bannedPrincipals.containsKey(caller.toText())) {
            return;
        };
        // ProfileSetup allows 2–50 chars; empty name is rejected there. Cap
        // here so a raw client cannot store an unbounded display name.
        if (profile.name.size() > 50) {
            return;
        };
        if (profile.uiLayout.size() > 65_536) {
            return;
        };
        userProfiles.add(caller, profile);
    };

    /// Save the caller's full panel-layout blob (one compact JSON Text field).
    /// Single save endpoint for the layout — no per-panel records.
    /// Validates the caller is not anonymous. Reads the existing UserProfile,
    /// updates only uiLayout, and writes it back to the userProfiles Map.
    public shared ({ caller }) func saveUserUiLayout(layout : Text) : async { #ok; #err : Text } {
        if (caller.isAnonymous()) {
            return #err("Unauthorized: anonymous caller");
        };
        if (bannedPrincipals.containsKey(caller.toText())) {
            return #err("Account banned for non-payment");
        };
        if (layout.size() > 65_536) {
            return #err("uiLayout exceeds maximum size");
        };
        switch (userProfiles.get(caller)) {
            case null {
                userProfiles.add(caller, { name = ""; uiLayout = layout });
            };
            case (?existing) {
                userProfiles.add(caller, { existing with uiLayout = layout });
            };
        };
        #ok;
    };

    /// Load the caller's panel-layout blob. Returns the empty string if the
    /// caller has no UserProfile yet or if uiLayout was never set.
    public query ({ caller }) func getUserUiLayout() : async Text {
        switch (userProfiles.get(caller)) {
            case null { "" };
            case (?profile) { profile.uiLayout };
        };
    };

    // Character management system
    type Character = {
        name        : Text;
        pieceType   : Text;
        level       : Nat;
        experience  : Nat;
        stats       : CharacterStats;
        pixelPattern : Text;
        /// Maximum 16 colors (enforced in createCharacter/updateCharacter).
        colors      : [Text];
        rotation    : Nat;
        /// Spell upgrade levels keyed by spell id.
        /// Stored as parallel arrays for shared-type compatibility.
        spellLevelKeys   : [Text];
        spellLevelValues : [Nat];
        /// Session state — optional so existing saved characters continue to load.
        bloodBalance  : ?Nat;    // 0-100 blood balance for the region
        covenantBuff  : ?Text;   // active covenant buff name, empty = none
        shrineCount   : ?Nat;    // shrines activated this session
        activeSpells  : ?[Nat];  // array of equipped spell IDs (max 8)
        /// Player-arranged spell bar order (spell ids; max 8). Empty/null = derive default once on load.
        spellBarOrder : ?[Text];
        /// Boss Rush master completion flag — optional for backwards compat.
        bossRushMasterComplete : ?Bool;
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

    type CharacterSlot = ?Character;

    type CharacterSlots = {
        slot1 : CharacterSlot;
        slot2 : CharacterSlot;
        slot3 : CharacterSlot;
    };

    let characterSlots : Map.Map<Principal, CharacterSlots>;

    func _isKnownPieceType(pieceType : Text) : Bool {
        pieceType == "king" or pieceType == "queen" or pieceType == "pawn"
            or pieceType == "rook" or pieceType == "bishop" or pieceType == "knight"
    };

    func _minNat(a : Nat, b : Nat) : Nat {
        if (a < b) { a } else { b }
    };

    /// Official CharacterCreation starter stats. createCharacter must not
    /// accept a god-rolled payload from a custom client.
    func _starterStatsRejected(stats : CharacterStats) : ?Text {
        if (stats.hp > 100) { ?"validation failed: starter hp exceeds 100" }
        else if (stats.ap > 10) { ?"validation failed: starter ap exceeds 10" }
        else if (stats.mp > 5) { ?"validation failed: starter mp exceeds 5" }
        else if (stats.atk > 15) { ?"validation failed: starter atk exceeds 15" }
        else if (stats.res > 10) { ?"validation failed: starter res exceeds 10" }
        else if (stats.evasion > 5) { ?"validation failed: starter evasion exceeds 5" }
        else if (stats.init > 10) { ?"validation failed: starter init exceeds 10" }
        else if (stats.sp > 8) { ?"validation failed: starter sp exceeds 8" }
        else if (stats.sr > 5) { ?"validation failed: starter sr exceeds 5" }
        else if (stats.resilience > 8) { ?"validation failed: starter resilience exceeds 8" }
        else if (stats.chc > 5) { ?"validation failed: starter chc exceeds 5" }
        else if (stats.killCount != 0) { ?"validation failed: starter killCount must be 0" }
        else { null }
    };

    func _anySpellLevelAboveZero(values : [Nat]) : Bool {
        var found = false;
        for (v in values.values()) {
            if (v > 0) { found := true };
        };
        found
    };

    func _colorsRejected(colors : [Text]) : ?Text {
        if (colors.size() > 16) {
            return ?"colors array exceeds maximum of 16 entries";
        };
        for (color in colors.values()) {
            if (color.size() > 32) {
                return ?"color value exceeds maximum length";
            };
        };
        null
    };

    /// Official CharacterCreation only writes cosmetics. Drop client-supplied
    /// progression / completion / session fields so a raw create cannot mint
    /// Boss Rush master-complete or a pre-filled spell bar.
    func _starterCharacter(character : Character) : Character {
        {
            character with
            spellLevelKeys = [];
            spellLevelValues = [];
            bloodBalance = null;
            covenantBuff = null;
            shrineCount = null;
            activeSpells = null;
            spellBarOrder = null;
            bossRushMasterComplete = null;
        }
    };

    func _isHexDigit(c : Char) : Bool {
        (c >= '0' and c <= '9') or (c >= 'a' and c <= 'f') or (c >= 'A' and c <= 'F')
    };

    func _isHexColor(colorHex : Text) : Bool {
        if (colorHex.size() != 7) { return false };
        let iter = colorHex.chars();
        switch (iter.next()) {
            case (?c) { if (c != '#') { return false } };
            case null { return false };
        };
        for (c in iter) {
            if (not _isHexDigit(c)) { return false };
        };
        true
    };

    func _characterHasSpell(slot : ?Character, spellId : Text) : Bool {
        switch (slot) {
            case null { false };
            case (?c) {
                for (k in c.spellLevelKeys.values()) {
                    if (k == spellId) { return true };
                };
                switch (c.spellBarOrder) {
                    case null {};
                    case (?bar) {
                        for (k in bar.values()) {
                            if (k == spellId) { return true };
                        };
                    };
                };
                false
            };
        };
    };

    func _spellReferencedByPlayers(spellId : Text) : Bool {
        for ((_, slots) in characterSlots.entries()) {
            if (
                _characterHasSpell(slots.slot1, spellId)
                or _characterHasSpell(slots.slot2, spellId)
                or _characterHasSpell(slots.slot3, spellId)
            ) {
                return true;
            };
        };
        false
    };

    /// Appearance edits used to union incoming spell arrays and take
    /// max(existing, incoming) per id. A custom client could then:
    ///   1. inject a retired catalog id the player never owned, after which
    ///      upgradeSpell treats `found=true` and skips the retirement check;
    ///   2. raise paid levels without going through upgradeSpell.
    /// Official CharacterCreation only rewrites cosmetics and already sends
    /// the stored keys (or []). Keep the store. upgradeSpell is the sole writer.

    public shared ({ caller }) func createCharacter(slot : Nat, character : Character) : async { #ok; #err : Text } {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            return #err("Unauthorized: Only users can create characters");
        };
        if (bannedPrincipals.containsKey(caller.toText())) {
            return #err("Account banned for non-payment");
        };

        if (slot < 1 or slot > 3) {
            return #err("Invalid slot number");
        };
        switch (_colorsRejected(character.colors)) {
            case (?msg) { return #err(msg) };
            case null {};
        };
        if (character.name.size() == 0 or character.name.size() > 20) {
            return #err("Name must be 1-20 characters");
        };
        if (not _isKnownPieceType(character.pieceType)) {
            return #err("Invalid pieceType");
        };
        if (character.pixelPattern.size() > 16_384) {
            return #err("pixelPattern exceeds maximum size");
        };
        if (character.level != 1 or character.experience != 0) {
            return #err("New characters must start at level 1 with 0 XP");
        };
        switch (_starterStatsRejected(character.stats)) {
            case (?msg) { return #err(msg) };
            case null {};
        };
        if (_anySpellLevelAboveZero(character.spellLevelValues)) {
            return #err("New characters cannot start with upgraded spells");
        };
        let storedCharacter = _starterCharacter(character);

        let existingSlots = switch (characterSlots.get(caller)) {
            case null {
                {
                    slot1 = null;
                    slot2 = null;
                    slot3 = null;
                };
            };
            case (?slots) { slots };
        };

        // Failure: a raw client could seed spellLevelKeys with a retired
        // catalog id at level 0. Frontend then treats that id as owned.
        // _starterCharacter already clears spell levels plus session/completion.

        let updatedSlots = switch (slot) {
            case 1 {
                if (existingSlots.slot1 != null) {
                    return #err("Slot 1 is already occupied");
                };
                { existingSlots with slot1 = ?storedCharacter };
            };
            case 2 {
                if (existingSlots.slot2 != null) {
                    return #err("Slot 2 is already occupied");
                };
                { existingSlots with slot2 = ?storedCharacter };
            };
            case 3 {
                if (existingSlots.slot3 != null) {
                    return #err("Slot 3 is already occupied");
                };
                { existingSlots with slot3 = ?storedCharacter };
            };
            case _ { return #err("Invalid slot number") };
        };

        characterSlots.add(caller, updatedSlots);
        // Boss rush progress is keyed by principal#slot, not character identity.
        // A new occupant must not resume the previous occupant's currentRoom.
        _clearBossRushForSlot(caller, slot);
        #ok;
    };

    public shared ({ caller }) func updateCharacter(slot : Nat, character : Character) : async { #ok; #err : Text } {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            return #err("Unauthorized: Only users can update characters");
        };
        if (bannedPrincipals.containsKey(caller.toText())) {
            return #err("Account banned for non-payment");
        };

        if (slot < 1 or slot > 3) {
            return #err("Invalid slot number");
        };
        switch (_colorsRejected(character.colors)) {
            case (?msg) { return #err(msg) };
            case null {};
        };
        if (character.name.size() == 0 or character.name.size() > 20) {
            return #err("Name must be 1-20 characters");
        };
        if (not _isKnownPieceType(character.pieceType)) {
            return #err("Invalid pieceType");
        };
        if (character.pixelPattern.size() > 16_384) {
            return #err("pixelPattern exceeds maximum size");
        };

        // Level, XP, combat stats, and spell levels are owned by applyRewards /
        // upgradeSpell / saveBattleStats. The official editor only changes
        // cosmetics (name, piece, colors, pattern). Keep stored progression so
        // a custom client cannot god-mode through this full-record replace.
        let existingSlots = switch (characterSlots.get(caller)) {
            case null { return #err("No characters found for user") };
            case (?slots) { slots };
        };
        let existingChar = switch (slot) {
            case 1 { existingSlots.slot1 };
            case 2 { existingSlots.slot2 };
            case 3 { existingSlots.slot3 };
            case _ { null };
        };
        let ec = switch (existingChar) {
            case null { return #err("Slot " # slot.toText() # " is empty") };
            case (?c) { c };
        };

        // Official editor only changes cosmetics (name, piece, colors, pattern).
        // Session / completion / loadout have dedicated writers. Do not accept
        // a client-supplied bossRushMasterComplete or shrineCount here.
        // Spell levels: upgradeSpell is the sole writer. Keep the store
        // verbatim — ignore incoming arrays so a stale or malicious appearance
        // payload cannot add ids, raise levels, or wipe paid upgrades.
        let mergedCharacter : Character = {
            character with
            level = ec.level;
            experience = ec.experience;
            stats = ec.stats;
            spellLevelKeys = ec.spellLevelKeys;
            spellLevelValues = ec.spellLevelValues;
            bloodBalance = ec.bloodBalance;
            covenantBuff = ec.covenantBuff;
            shrineCount = ec.shrineCount;
            activeSpells = ec.activeSpells;
            spellBarOrder = ec.spellBarOrder;
            bossRushMasterComplete = ec.bossRushMasterComplete;
        };

        let updatedSlots = switch (slot) {
            case 1 { { existingSlots with slot1 = ?mergedCharacter } };
            case 2 { { existingSlots with slot2 = ?mergedCharacter } };
            case 3 { { existingSlots with slot3 = ?mergedCharacter } };
            case _ { return #err("Invalid slot number") };
        };

        characterSlots.add(caller, updatedSlots);
        #ok;
    };

    public shared ({ caller }) func deleteCharacter(slot : Nat) : async { #ok; #err : Text } {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            return #err("Unauthorized: Only users can delete characters");
        };
        if (bannedPrincipals.containsKey(caller.toText())) {
            return #err("Account banned for non-payment");
        };

        if (slot < 1 or slot > 3) {
            return #err("Invalid slot number");
        };

        let existingSlots = switch (characterSlots.get(caller)) {
            case null { return #err("No characters found for user") };
            case (?slots) { slots };
        };

        let updatedSlots = switch (slot) {
            case 1 {
                if (existingSlots.slot1 == null) {
                    return #err("Slot 1 is already empty");
                };
                { existingSlots with slot1 = null };
            };
            case 2 {
                if (existingSlots.slot2 == null) {
                    return #err("Slot 2 is already empty");
                };
                { existingSlots with slot2 = null };
            };
            case 3 {
                if (existingSlots.slot3 == null) {
                    return #err("Slot 3 is already empty");
                };
                { existingSlots with slot3 = null };
            };
            case _ { return #err("Invalid slot number") };
        };

        characterSlots.add(caller, updatedSlots);
        // Drop mid-run currentRoom so a later create in this slot cannot skip rooms.
        _clearBossRushForSlot(caller, slot);
        #ok;
    };

    public query ({ caller }) func getCharacterSlots() : async CharacterSlots {
        switch (characterSlots.get(caller)) {
            case null {
                {
                    slot1 = null;
                    slot2 = null;
                    slot3 = null;
                };
            };
            case (?slots) { slots };
        };
    };

    public query ({ caller }) func getCharacter(slot : Nat) : async CharacterSlot {
        if (slot < 1 or slot > 3) {
            Runtime.trap("Invalid slot number");
        };

        let slots = switch (characterSlots.get(caller)) {
            case null {
                {
                    slot1 = null;
                    slot2 = null;
                    slot3 = null;
                };
            };
            case (?s) { s };
        };

        switch (slot) {
            case 1 { slots.slot1 };
            case 2 { slots.slot2 };
            case 3 { slots.slot3 };
            case _ { null };
        };
    };

    public query ({ caller }) func getAllCharacters() : async { #ok : [(Principal, CharacterSlots)]; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            return #err("Unauthorized: admin only");
        };
        #ok(characterSlots.entries().toArray());
    };

    // ─── Admin types ────────────────────────────────────────────────────

    type BattleEffect = {
        id          : Text;
        name        : Text;
        description : Text;
        effectType  : { #damage; #buff; #debuff };
        value       : Int;
    };

    type EnemyConfig = {
        id        : Text;
        name      : Text;
        hp        : Nat;
        ap        : Nat;
        mp        : Nat;
        initStat  : Nat;
        levelMin  : Nat;
        levelMax  : Nat;
        regions   : [Text];
        spriteUrl : ?Text;
    };

    type RegionConfig = {
        id              : Text;
        name            : Text;
        levelMin        : Nat;
        levelMax        : Nat;
        battleEffects   : [BattleEffect];
        backgroundColor : Text;
    };

    type PlayerSpriteConfig = {
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

    // ─── Admin stores ────────────────────────────────────────────────────

    let enemyConfigs        : Map.Map<Text, EnemyConfig>;
    let regionConfigs       : Map.Map<Text, RegionConfig>;
    let playerSpriteConfigs : Map.Map<Text, PlayerSpriteConfig>;

    // ─── Admin audit (no secrets / PII) + last-good singleton snapshots ─
    var adminAuditLog : List.List<AdminTypes.AdminAuditEntry>;

    func _recordAdminAudit(
        caller : Principal,
        action : Text,
        objectId : Text,
        previousSummary : Text,
        newSummary : Text,
    ) {
        adminAuditLog.add({
            adminPrincipal = caller.toText();
            timestampNs = Time.now();
            action;
            objectId;
            previousSummary = AdminGuard.truncateSummary(previousSummary);
            newSummary = AdminGuard.truncateSummary(newSummary);
        });
        let sz = adminAuditLog.size();
        if (sz > 100) {
            adminAuditLog := List.fromArray(adminAuditLog.sliceToArray(Nat.sub(sz, 100), sz));
        };
    };

    // ─── Level-up config (singleton, admin-editable) ────────────────────

    var levelUpConfig : AdminTypes.LevelUpConfig;

    // Seed the default level-up config on first run (fresh installs only).
    do {
        if (levelUpConfig.statGrowthPercent == 0) {
            levelUpConfig := {
                statGrowthPercent           = 5;
                apMpLevelThreshold          = 25;
                spellLevelingBaseCost       = 10;
                spellLevelingCostMultiplier = 2.0;
                spellDmgGrowthPercent       = 3;
                maxSpellRange               = 5;
                spellRangeGrowthLevels      = 10;
                spellFailBaseChance         = 20.0;
                spellFailReductionPerLevel  = 0.1;
            };
        };
    };

    var levelUpConfigPrev : AdminTypes.LevelUpConfig;
    var hasLevelUpConfigPrev : Bool;

    public shared ({ caller }) func adminSetLevelUpConfig(config : AdminTypes.LevelUpConfig) : async { #ok; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            return #err("Unauthorized: admin only");
        };
        switch (AdminGuard.validateLevelUpConfig(config)) {
            case (?e) { return #err(e) };
            case null {};
        };
        levelUpConfigPrev := levelUpConfig;
        hasLevelUpConfigPrev := true;
        levelUpConfig := config;
        _recordAdminAudit(caller, "setLevelUpConfig", "levelUpConfig", "previous", "updated");
        #ok;
    };

    public shared ({ caller }) func adminRollbackLevelUpConfig() : async { #ok; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            return #err("Unauthorized: admin only");
        };
        if (not hasLevelUpConfigPrev) {
            return #err("No previous level-up config to restore");
        };
        let current = levelUpConfig;
        levelUpConfig := levelUpConfigPrev;
        levelUpConfigPrev := current;
        _recordAdminAudit(caller, "rollbackLevelUpConfig", "levelUpConfig", "updated", "previous");
        #ok;
    };

    public query func getLevelUpConfig() : async AdminTypes.LevelUpConfig {
        levelUpConfig;
    };

    // ─── Spell configs ───────────────────────────────────────────────────
    let spellConfigs : Map.Map<Text, AdminTypes.SpellConfig>;

    // Seed defaults on first run (store is empty on a fresh canister)
    do {
        if (spellConfigs.size() == 0) {
            for (spell in AdminLib.defaultSpells().values()) {
                spellConfigs.add(spell.id, spell);
            };
        };
    };



    // Purge old spell IDs that are no longer part of the registry.
    // This runs on every canister start / upgrade so stale entries are always removed.
    do {
        let OLD_SPELL_IDS : [Text] = [
            "blood_nova", "crimson_heal", "cursed_gust", "drain_life",
            "entangle", "fireball", "frost_nova", "heal",
            "ice_shard", "inferno", "meteor_strike", "mist_form",
            "obliterate", "physical_attack", "plague_wave", "poison_dart",
        ];
        for (id in OLD_SPELL_IDS.values()) {
            spellConfigs.remove(id);
        };
    };

    // ─── Map modifier configs ────────────────────────────────────────────
    let mapModifierConfigs : Map.Map<Text, AdminTypes.MapModifierConfig>;

    // Seed default map modifiers on first run.
    do {
        if (mapModifierConfigs.size() == 0) {
            for (mod in AdminLib.defaultMapModifiers().values()) {
                mapModifierConfigs.add(mod.id, mod);
            };
        };
    };

    // ─── First-login-becomes-admin + rate-limited role assignment ───────
    //
    // The password-based admin system has been removed.
    // AccessControl.initialize() promotes the very first non-anonymous caller
    // to admin and registers all subsequent callers as #user.
    // We call it on every endpoint so the first real player who logs in via
    // Internet Identity automatically becomes admin.
    //
    // M1: role-change timestamps prevent rapid cycling via assignUserRole.
    let roleChangeTimestamps : Map.Map<Text, Int>;
    transient let ROLE_CHANGE_MIN_NS : Int = 30_000_000_000; // 30 seconds in nanoseconds

    /// Ensure the caller is registered in AccessControl.
    /// The first non-anonymous caller becomes admin; all others become #user.
    func _ensureRegistered(caller : Principal) {
        if (not caller.isAnonymous()) {
            AccessControl.initialize(accessControlState, caller);
        };
    };

    /// Package isAdmin traps when the caller is unregistered. Admin queries
    /// must not trap — the official client treats a miss as "not admin".
    func _isAdminPrincipal(caller : Principal) : Bool {
        if (caller.isAnonymous()) { return false };
        switch (accessControlState.userRoles.get(caller)) {
            case (?#admin) { true };
            case _ { false };
        };
    };

    /// Shared guards for assignUserRole and the Candid-compatible
    /// assignCallerUserRole replacement. Failure: MixinAuthorization.assignRole
    /// allowed self-demotion and #guest, which permanently locks out the
    /// last admin because adminAssigned stays true.
    func _roleAssignRejected(
        caller : Principal,
        target : Principal,
        role : AccessControl.UserRole,
    ) : ?Text {
        if (not _isAdminPrincipal(caller)) {
            return ?"Unauthorized: admin only";
        };
        if (target.isAnonymous()) {
            return ?"Cannot assign a role to the anonymous principal";
        };
        if (target == caller and role != #admin) {
            return ?"Refusing self-demotion: another admin must change your role";
        };
        switch (role) {
            case (#guest) { return ?"role must be \"admin\" or \"user\"" };
            case (#admin) {};
            case (#user) {};
        };
        let callerKey = caller.toText();
        let now = Time.now();
        switch (roleChangeTimestamps.get(callerKey)) {
            case (?last) {
                if (now - last < ROLE_CHANGE_MIN_NS) {
                    return ?"Rate limit: wait 30 seconds between role changes";
                };
            };
            case null {};
        };
        roleChangeTimestamps.add(callerKey, now);
        null
    };

    // ─── Enemy config API ────────────────────────────────────────────────

    public shared ({ caller }) func adminSetEnemyConfig(config : EnemyConfig) : async { #ok; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            return #err("Unauthorized: admin only");
        };
        switch (AdminGuard.validateEnemyConfig(config)) {
            case (?e) { return #err(e) };
            case null {};
        };
        let prev = switch (enemyConfigs.get(config.id)) {
            case null { "none" };
            case (?c) { c.name };
        };
        enemyConfigs.add(config.id, config);
        _recordAdminAudit(caller, "setEnemyConfig", config.id, prev, config.name);
        #ok;
    };

    public shared ({ caller }) func adminDeleteEnemyConfig(id : Text) : async { #ok; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            return #err("Unauthorized: admin only");
        };
        enemyConfigs.remove(id);
        _recordAdminAudit(caller, "deleteEnemyConfig", id, "present", "removed");
        #ok;
    };

    public query func getEnemyConfigs() : async [EnemyConfig] {
        enemyConfigs.values().toArray();
    };

    // ─── Region config API ───────────────────────────────────────────────

    public shared ({ caller }) func adminSetRegionConfig(config : RegionConfig) : async { #ok; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            return #err("Unauthorized: admin only");
        };
        switch (AdminGuard.validateRegionConfig(config)) {
            case (?e) { return #err(e) };
            case null {};
        };
        regionConfigs.add(config.id, config);
        _recordAdminAudit(caller, "setRegionConfig", config.id, "previous", config.name);
        #ok;
    };

    public shared ({ caller }) func adminDeleteRegionConfig(id : Text) : async { #ok; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            return #err("Unauthorized: admin only");
        };
        regionConfigs.remove(id);
        _recordAdminAudit(caller, "deleteRegionConfig", id, "present", "removed");
        #ok;
    };

    public query func getRegionConfigs() : async [RegionConfig] {
        regionConfigs.values().toArray();
    };

    // ─── Player sprite config API ────────────────────────────────────────

    public shared ({ caller }) func adminSetPlayerSpriteConfig(config : PlayerSpriteConfig) : async { #ok; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            return #err("Unauthorized: admin only");
        };
        switch (AdminGuard.validatePlayerSpriteConfig(config)) {
            case (?e) { return #err(e) };
            case null {};
        };
        playerSpriteConfigs.add(config.id, config);
        _recordAdminAudit(caller, "setPlayerSpriteConfig", config.id, "previous", config.name);
        #ok;
    };

    public shared ({ caller }) func adminDeletePlayerSpriteConfig(id : Text) : async { #ok; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            return #err("Unauthorized: admin only");
        };
        playerSpriteConfigs.remove(id);
        _recordAdminAudit(caller, "deletePlayerSpriteConfig", id, "custom", "pixel-fallback");
        #ok;
    };

    public query func getPlayerSpriteConfigs() : async [PlayerSpriteConfig] {
        playerSpriteConfigs.values().toArray();
    };

    // ─── Spell config API ────────────────────────────────────────────────

    public shared ({ caller }) func adminSetSpellConfig(config : AdminTypes.SpellConfig) : async { #ok; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            return #err("Unauthorized: admin only");
        };
        switch (AdminGuard.validateSpellConfig(config)) {
            case (?e) { return #err(e) };
            case null {};
        };
        spellConfigs.add(config.id, config);
        _recordAdminAudit(caller, "setSpellConfig", config.id, "previous", config.name);
        #ok;
    };

    public shared ({ caller }) func adminDeleteSpellConfig(id : Text) : async { #ok; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            return #err("Unauthorized: admin only");
        };
        if (AdminGuard.isBuiltInSpellId(id)) {
            return #err("Cannot delete a built-in spell; set usableByPlayer=false to retire it");
        };
        if (_spellReferencedByPlayers(id)) {
            switch (spellConfigs.get(id)) {
                case null { return #err("Spell not found: " # id) };
                case (?existing) {
                    spellConfigs.add(id, { existing with usableByPlayer = false });
                    _recordAdminAudit(caller, "retireSpellConfig", id, "active", "usableByPlayer=false");
                };
            };
            return #ok;
        };
        spellConfigs.remove(id);
        _recordAdminAudit(caller, "deleteSpellConfig", id, "present", "removed");
        #ok;
    };

    public query func getSpellConfigs() : async [AdminTypes.SpellConfig] {
        spellConfigs.values().toArray();
    };

    // ─── Map modifier config API ─────────────────────────────────────────

    public shared ({ caller }) func adminSetMapModifier(config : AdminTypes.MapModifierConfig) : async { #ok; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            return #err("Unauthorized: admin only");
        };
        switch (AdminGuard.validateMapModifier(config)) {
            case (?e) { return #err(e) };
            case null {};
        };
        mapModifierConfigs.add(config.id, config);
        _recordAdminAudit(caller, "setMapModifier", config.id, "previous", config.name);
        #ok;
    };

    public shared ({ caller }) func adminDeleteMapModifier(id : Text) : async { #ok; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            return #err("Unauthorized: admin only");
        };
        mapModifierConfigs.remove(id);
        _recordAdminAudit(caller, "deleteMapModifier", id, "present", "removed");
        #ok;
    };

    public query func getMapModifiers() : async [AdminTypes.MapModifierConfig] {
        mapModifierConfigs.values().toArray();
    };

    /// Convenience endpoint: update only the triggerChance of an existing map modifier.
    /// Validates that chance is in the range 0–100.
    public shared ({ caller }) func adminSetMapModifierChance(id : Text, chance : Nat) : async { #ok; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            return #err("Unauthorized: admin only");
        };
        switch (AdminGuard.validateMapModifierChance(id, chance)) {
            case (?e) { return #err(e) };
            case null {};
        };
        let prevChance = switch (mapModifierConfigs.get(id)) {
            case null { return #err("Map modifier '" # id # "' not found") };
            case (?existing) { existing.triggerChance.toText() };
        };
        switch (AdminLib.setMapModifierChance(mapModifierConfigs, id, chance)) {
            case (#err e) { #err(e) };
            case (#ok) {
                _recordAdminAudit(caller, "setMapModifierChance", id, prevChance, chance.toText());
                #ok
            };
        };
    };

    // ─── Spell upgrade (per character) ──────────────────────────────────

    /// Upgrade a spell for the character in the given slot.
    /// Cost = baseCost * 2^currentSpellLevel (all in Doka from character's dokaBalance).
    /// Returns the new spell level on success.
    public shared ({ caller }) func upgradeSpell(slot : Nat, spellId : Text) : async { #ok : Nat; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
            return #err("Unauthorized: must be logged in");
        };
        if (bannedPrincipals.containsKey(caller.toText())) {
            return #err("Account banned for non-payment");
        };
        if (spellId == "") {
            return #err("spellId cannot be empty");
        };
        // Validate spellId references an existing spell config.
        switch (spellConfigs.get(spellId)) {
            case null { return #err("Spell not found: " # spellId) };
            case (?_) {};
        };
        if (slot < 1 or slot > 3) {
            return #err("Invalid slot number");
        };

        let existingSlots = switch (characterSlots.get(caller)) {
            case null { return #err("No characters found") };
            case (?s) { s };
        };

        let character = switch (slot) {
            case 1 { switch (existingSlots.slot1) { case null { return #err("Slot 1 is empty") }; case (?c) { c } } };
            case 2 { switch (existingSlots.slot2) { case null { return #err("Slot 2 is empty") }; case (?c) { c } } };
            case 3 { switch (existingSlots.slot3) { case null { return #err("Slot 3 is empty") }; case (?c) { c } } };
            case _ { return #err("Invalid slot") };
        };

        var currentLevel : Nat = 0;
        var found = false;
        var idx : Nat = 0;
        for (k in character.spellLevelKeys.values()) {
            if (k == spellId) {
                currentLevel := character.spellLevelValues[idx];
                found := true;
            };
            idx += 1;
        };

        // Failure: upgradeSpell added any catalog id to spellLevelKeys.
        // A player who never owned a retired spell could acquire it by paying.
        switch (spellConfigs.get(spellId)) {
            case null { return #err("Spell not found: " # spellId) };
            case (?cfg) {
                if (not cfg.usableByPlayer and not found) {
                    return #err("Spell is retired");
                };
            };
        };

        let baseCost = levelUpConfig.spellLevelingBaseCost;
        var cost = baseCost;
        var expCount = currentLevel;
        while (expCount > 0) {
            cost := cost * 2;
            expCount -= 1;
        };

        // H10: Doka balance is per-principal, not per-character.
        let callerDokaUpgrade = switch (dokaBalances.get(caller)) {
            case null { 0 };
            case (?b) { b };
        };
        if (callerDokaUpgrade < cost) {
            return #err("Not enough Doka. Need " # debug_show(cost) # ", have " # debug_show(callerDokaUpgrade));
        };

        let newLevel = currentLevel + 1;

        let newKeys : [Text] = if (found) {
            character.spellLevelKeys
        } else {
            character.spellLevelKeys.concat([spellId])
        };
        let newValues : [Nat] = if (found) {
            var vi : Nat = 0;
            character.spellLevelValues.map(func(v : Nat) : Nat {
                let result = if (vi < character.spellLevelKeys.size() and character.spellLevelKeys[vi] == spellId) { newLevel } else { v };
                vi += 1;
                result
            })
        } else {
            character.spellLevelValues.concat([newLevel])
        };

        let updatedCharacter : Character = {
            character with
            spellLevelKeys   = newKeys;
            spellLevelValues = newValues;
        };

        let updatedSlots = switch (slot) {
            case 1 { { existingSlots with slot1 = ?updatedCharacter } };
            case 2 { { existingSlots with slot2 = ?updatedCharacter } };
            case 3 { { existingSlots with slot3 = ?updatedCharacter } };
            case _ { existingSlots };
        };
        characterSlots.add(caller, updatedSlots);
        // Deduct from per-principal Doka balance.
        dokaBalances.add(caller, Nat.sub(callerDokaUpgrade, cost));
        #ok(newLevel);
    };

    // ─── Shop packages ─────────────────────────────────────────────────
    let shopPackages : Map.Map<Text, AdminTypes.ShopPackage>;

    // Seed default packages on first run.
    do {
        if (shopPackages.size() == 0) {
            for (pkg in AdminLib.defaultShopPackages().values()) {
                shopPackages.add(pkg.id, pkg);
            };
        };
    };

    /// Admin: create or update a shop package (set payment link etc.).
    public shared ({ caller }) func adminSetShopPackage(pkg : AdminTypes.ShopPackage) : async { #ok; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            return #err("Unauthorized: admin only");
        };
        switch (AdminGuard.validateShopPackage(pkg)) {
            case (?e) { return #err(e) };
            case null {};
        };
        shopPackages.add(pkg.id, pkg);
        _recordAdminAudit(caller, "setShopPackage", pkg.id, "previous", pkg.dokaAmount.toText());
        #ok;
    };

    /// Admin: delete a shop package.
    public shared ({ caller }) func adminDeleteShopPackage(id : Text) : async { #ok; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            return #err("Unauthorized: admin only");
        };
        switch (shopPackages.get(id)) {
            case null { return #err("Shop package not found: " # id) };
            case (?_) {};
        };
        if (shopPackages.size() <= 1) {
            return #err("Cannot delete the last shop package");
        };
        shopPackages.remove(id);
        _recordAdminAudit(caller, "deleteShopPackage", id, "present", "removed");
        #ok;
    };

    /// Public: list all shop packages sorted by displayOrder.
    public query func getShopPackages() : async [AdminTypes.ShopPackage] {
        let arr = shopPackages.values().toArray();
        arr.sort(func(a : AdminTypes.ShopPackage, b : AdminTypes.ShopPackage) : { #less; #equal; #greater } {
            Nat.compare(a.displayOrder, b.displayOrder)
        })
    };

    // ─── Achievement configs ────────────────────────────────────────────
    let achievementConfigs : Map.Map<Text, AdminTypes.AchievementConfig>;

    // Seed default achievements on first run.
    do {
        if (achievementConfigs.size() == 0) {
            for (ach in AdminLib.defaultAchievements().values()) {
                achievementConfigs.add(ach.id, ach);
            };
        };
    };

    /// Per-player progress keyed by "principalText#achievementId".
    let achievementProgress : Map.Map<Text, AdminTypes.AchievementProgress>;

    // ─── Purchase records ──────────────────────────────────────────────
    // M7: purchaseRecords is a Map<Text, PurchaseRecord> — O(log n) lookup by id.
    // L3: nextPurchaseId is Nat (unbounded in Motoko); overflow is theoretical at
    //     2^128+ iterations; no practical cap needed but documented here.
    let purchaseRecords : Map.Map<Text, AdminTypes.PurchaseRecord>;
    var nextPurchaseId  : Nat;

    let gameKeyRequests : Map.Map<Text, AdminTypes.GameKeyRequest>;
    let gameKeyLedger : Map.Map<Text, AdminTypes.GameKeyLedgerEntry>;
    let gameKeyReveals : Map.Map<Text, Text>;
    let lastGameKeyRequestAt : Map.Map<Principal, Int>;
    var nextGameKeyRequestId : Nat;

    /// Banned principals cannot play until unbanned.
    let bannedPrincipals : Map.Map<Text, Bool>;

    /// Legacy nine-arg KYC checkout. Replaced by requestGameKeyPurchase.
    /// Signature kept so older clients fail with a clear #err instead of minting.
    public shared ({ caller }) func initiatePurchase(
        _packageId       : Text,
        _customerName    : Text,
        _customerSurname : Text,
        _customerEmail   : Text,
        _customerAddress : Text,
        _customerCity    : Text,
        _customerCountry : Text,
        _customerPostal  : Text,
        _proofFileUrl    : Text,
    ) : async { #ok : Text; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
            return #err("Unauthorized: must be logged in");
        };
        #err("Doka purchases now use GameKey requests. Call requestGameKeyPurchase after paying via Mollie.");
    };

    /// Returns the caller's purchase history.
    public query ({ caller }) func getMyPurchaseHistory() : async [AdminTypes.PurchaseRecord] {
        purchaseRecords.values().filter(func(r : AdminTypes.PurchaseRecord) : Bool {
            r.userPrincipal == caller
        }).toArray()
    };
    /// Public: returns all purchase records (admin-only; use adminGetPurchaseRecords for filtered access).
    public query ({ caller }) func getPurchases() : async { #ok : [AdminTypes.PurchaseRecord]; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            return #err("Unauthorized: admin only");
        };
        #ok(purchaseRecords.values().toArray());
    };


    /// Returns whether the caller's account is banned.
    public query ({ caller }) func checkAccountStatus() : async { isBanned : Bool } {
        { isBanned = bannedPrincipals.containsKey(caller.toText()) };
    };

    /// Admin: get all purchase records, optionally filtered by principal text.
    public shared ({ caller }) func adminGetPurchaseRecords(filterPrincipal : ?Text) : async { #ok : [AdminTypes.PurchaseRecord]; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            return #err("Unauthorized: admin only");
        };
        let records = switch (filterPrincipal) {
            case null { purchaseRecords.values().toArray() };
            case (?pt) {
                purchaseRecords.values().filter(func(r : AdminTypes.PurchaseRecord) : Bool {
                    r.userPrincipal.toText() == pt
                }).toArray()
            };
        };
        #ok(records);
    };

    /// Admin: manually credit Doka to a principal and optionally mark a purchase as completed.
    public shared ({ caller }) func adminAddDokaToUser(
        userPrincipal : Principal,
        dokaAmount    : Nat,
        purchaseId    : ?Text,
    ) : async { #ok; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            return #err("Unauthorized: admin only");
        };
        switch (AdminGuard.validateDokaGrant(dokaAmount)) {
            case (?e) { return #err(e) };
            case null {};
        };
        switch (purchaseId) {
            case null {};
            case (?pid) {
                switch (purchaseRecords.get(pid)) {
                    case null { return #err("Purchase record not found") };
                    case (?rec) {
                        switch (AdminGuard.purchaseCreditRejected(
                            rec.userPrincipal.toText(),
                            userPrincipal.toText(),
                            rec.status,
                        )) {
                            case (?e) { return #err(e) };
                            case null {};
                        };
                    };
                };
            };
        };
        let current = switch (dokaBalances.get(userPrincipal)) {
            case null { 0 };
            case (?b) { b };
        };
        dokaBalances.add(userPrincipal, current + dokaAmount);
        _recordAdminAudit(caller, "addDokaToUser", userPrincipal.toText(), current.toText(), (current + dokaAmount).toText());
        switch (purchaseId) {
            case null {};
            case (?pid) {
                switch (purchaseRecords.get(pid)) {
                    case null {};
                    case (?rec) {
                        purchaseRecords.add(pid, { rec with status = "completed" });
                    };
                };
            };
        };
        #ok;
    };

    /// Admin: ban a principal for non-payment.
    /// M2: also clears achievement progress so banned players cannot double-claim
    ///     Doka rewards after being unbanned.
    public shared ({ caller }) func adminBanAccount(userPrincipal : Principal) : async { #ok; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            return #err("Unauthorized: admin only");
        };
        // Keep achievement progress. Wiping claimed flags lets a player
        // re-unlock and claim the same Doka reward after unban.
        bannedPrincipals.add(userPrincipal.toText(), true);
        _recordAdminAudit(caller, "banAccount", userPrincipal.toText(), "active", "banned");
        #ok;
    };

    /// Admin: grant Doka to a principal by text ID (used by shop admin panel).
    /// Alias for adminAddDoka; named adminGrantDoka to match the frontend's expected method name.
    public shared ({ caller }) func adminGrantDoka(targetPrincipal : Principal, amount : Nat) : async { #ok; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            return #err("Unauthorized: admin only");
        };
        switch (AdminGuard.validateDokaGrant(amount)) {
            case (?e) { return #err(e) };
            case null {};
        };
        let current = switch (dokaBalances.get(targetPrincipal)) {
            case null { 0 };
            case (?b) { b };
        };
        dokaBalances.add(targetPrincipal, current + amount);
        _recordAdminAudit(caller, "grantDoka", targetPrincipal.toText(), current.toText(), (current + amount).toText());
        #ok;
    };

    /// Admin: ban a principal (simple alias matching the frontend's expected method name).
    public shared ({ caller }) func banPrincipal(targetPrincipal : Principal) : async { #ok; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            return #err("Unauthorized: admin only");
        };
        bannedPrincipals.add(targetPrincipal.toText(), true);
        _recordAdminAudit(caller, "banPrincipal", targetPrincipal.toText(), "active", "banned");
        #ok;
    };

    /// Admin: unban a principal (simple alias matching the frontend's expected method name).
    public shared ({ caller }) func unbanPrincipal(targetPrincipal : Principal) : async { #ok; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            return #err("Unauthorized: admin only");
        };
        bannedPrincipals.remove(targetPrincipal.toText());
        _recordAdminAudit(caller, "unbanPrincipal", targetPrincipal.toText(), "banned", "active");
        #ok;
    };

    /// Admin query: returns the list of all currently banned principals.
    public query ({ caller }) func getBannedPrincipals() : async { #ok : [Principal]; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            return #err("Unauthorized: admin only");
        };
        let texts = bannedPrincipals.keys().toArray();
        let principals = texts.map(func(t) {
            Principal.fromText(t)
        });
        #ok(principals);
    };

    /// Admin: unban a principal.
    public shared ({ caller }) func adminUnbanAccount(userPrincipal : Principal) : async { #ok; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            return #err("Unauthorized: admin only");
        };
        bannedPrincipals.remove(userPrincipal.toText());
        _recordAdminAudit(caller, "unbanAccount", userPrincipal.toText(), "banned", "active");
        #ok;
    };

    /// Legacy 60s auto-complete. Paid Doka now credits only via redeemGameKey.
    func _autoCompletePendingPurchases(_forPrincipal : Principal) {};

    /// Kept so shop remount still calls a no-op credit that honors
    /// shouldCommitShopCredit (commit only when the wallet actually gained).
    public shared ({ caller }) func processPendingPurchases() : async Nat {
        if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
            return 0;
        };
        if (bannedPrincipals.containsKey(caller.toText())) {
            return 0;
        };
        _autoCompletePendingPurchases(caller);
        ignore nextPurchaseId;
        0
    };

    func _hasOpenGameKeyRequest(who : Principal) : Bool {
        for (r in gameKeyRequests.values()) {
            if (r.userPrincipal == who and (r.status == "pending" or r.status == "approved")) {
                return true;
            };
        };
        false
    };

    func _latestGameKeyRequest(who : Principal) : ?AdminTypes.GameKeyRequest {
        var best : ?AdminTypes.GameKeyRequest = null;
        for (r in gameKeyRequests.values()) {
            if (r.userPrincipal == who) {
                switch (best) {
                    case null { best := ?r };
                    case (?b) {
                        if (r.timestamp > b.timestamp) { best := ?r };
                    };
                };
            };
        };
        best
    };

    func _generateGameKey() : async Text {
        var out = "";
        var guard = 0;
        while (out.size() < GameKey.CODE_LENGTH and guard < 32) {
            guard += 1;
            let entropy = await ic.raw_rand();
            out := GameKey.appendFromEntropy(out, entropy.toArray());
        };
        out
    };

    func _newUniqueGameKey() : async { #ok : Text; #err : Text } {
        var attempts = 0;
        while (attempts < 8) {
            attempts += 1;
            let code = await _generateGameKey();
            switch (GameKey.validateCodeFormat(code)) {
                case (?e) { return #err(e) };
                case null {};
            };
            if (not gameKeyLedger.containsKey(code)) {
                return #ok(code);
            };
        };
        #err("Could not generate a unique GameKey from IC randomness")
    };

    /// Player: submit a GameKey purchase request (email + consent, optional euro hint).
    public shared ({ caller }) func requestGameKeyPurchase(
        email : Text,
        emailConsent : Bool,
        hintedEuroCents : Nat,
    ) : async { #ok : Text; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
            return #err("Unauthorized: must be logged in");
        };
        if (bannedPrincipals.containsKey(caller.toText())) {
            return #err("Account banned for non-payment");
        };
        let trimmedEmail = email.trim(#char ' ');
        switch (GameKey.validateEmail(trimmedEmail)) {
            case (?e) { return #err(e) };
            case null {};
        };
        switch (GameKey.validateConsent(emailConsent)) {
            case (?e) { return #err(e) };
            case null {};
        };
        switch (GameKey.validateHintEuroCents(hintedEuroCents)) {
            case (?e) { return #err(e) };
            case null {};
        };
        switch (GameKey.rejectOpenRequest(_hasOpenGameKeyRequest(caller))) {
            case (?e) { return #err(e) };
            case null {};
        };
        let now = Time.now();
        switch (lastGameKeyRequestAt.get(caller)) {
            case (?last) {
                if (GameKey.requestCooldownActive(last, now)) {
                    return #err("Please wait before submitting another request");
                };
            };
            case null {};
        };
        nextGameKeyRequestId += 1;
        if (nextGameKeyRequestId > 999_999_999) {
            nextGameKeyRequestId := 1;
        };
        let id = "gk_" # nextGameKeyRequestId.toText();
        let record : AdminTypes.GameKeyRequest = {
            id;
            userPrincipal = caller;
            email = trimmedEmail;
            emailConsent;
            hintedEuroCents;
            timestamp = now;
            status = "pending";
            dokaAmount = 0;
            emailed = false;
            approvedAt = 0;
            redeemedAt = 0;
            redeemedBy = "";
        };
        gameKeyRequests.add(id, record);
        lastGameKeyRequestAt.add(caller, now);
        #ok(id);
    };

    /// Player-visible status for the latest request. Never includes a GameKey.
    public query ({ caller }) func getMyGameKeyPurchaseStatus() : async ?AdminTypes.GameKeyRequest {
        _latestGameKeyRequest(caller)
    };

    /// Player: redeem a 120-char GameKey. Credits the caller, not the requester.
    public shared ({ caller }) func redeemGameKey(code : Text) : async { #ok : Nat; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
            return #err("Unauthorized: must be logged in");
        };
        if (bannedPrincipals.containsKey(caller.toText())) {
            return #err("Account banned for non-payment");
        };
        let trimmed = code.trim(#char ' ');
        switch (GameKey.validateCodeFormat(trimmed)) {
            case (?e) { return #err(e) };
            case null {};
        };
        var ledgerHit : ?AdminTypes.GameKeyLedgerEntry = null;
        for ((stored, entry) in gameKeyLedger.entries()) {
            if (GameKey.constantTimeEqual(stored, trimmed)) {
                ledgerHit := ?entry;
            };
        };
        switch (ledgerHit) {
            case null { return #err("Invalid GameKey") };
            case (?entry) {
                if (entry.redeemed) {
                    return #err("GameKey already used");
                };
                switch (gameKeyRequests.get(entry.requestId)) {
                    case null { return #err("Invalid GameKey") };
                    case (?rec) {
                        if (rec.status == "pending") {
                            return #err("GameKey is not yet approved");
                        };
                        if (rec.status == "rejected") {
                            return #err("Invalid GameKey");
                        };
                        if (rec.status == "redeemed") {
                            return #err("GameKey already used");
                        };
                        if (rec.status != "approved") {
                            return #err("Invalid GameKey");
                        };
                        switch (AdminGuard.validateDokaGrant(entry.dokaAmount)) {
                            case (?e) { return #err(e) };
                            case null {};
                        };
                        let current = switch (dokaBalances.get(caller)) {
                            case null { 0 };
                            case (?b) { b };
                        };
                        dokaBalances.add(caller, current + entry.dokaAmount);
                        let now = Time.now();
                        let redeemedBy = caller.toText();
                        gameKeyLedger.add(trimmed, {
                            entry with
                            redeemed = true;
                            redeemedBy;
                        });
                        gameKeyRequests.add(rec.id, {
                            rec with
                            status = "redeemed";
                            redeemedAt = now;
                            redeemedBy;
                        });
                        gameKeyReveals.remove(rec.id);
                        #ok(entry.dokaAmount)
                    };
                };
            };
        };
    };

    /// Admin: incoming GameKey purchase requests. No plaintext codes.
    public query ({ caller }) func adminListGameKeyRequests() : async { #ok : [AdminTypes.GameKeyRequest]; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            return #err("Unauthorized: admin only");
        };
        let arr = gameKeyRequests.values().toArray();
        #ok(
            arr.sort(func(a : AdminTypes.GameKeyRequest, b : AdminTypes.GameKeyRequest) : { #less; #equal; #greater } {
                Int.compare(b.timestamp, a.timestamp)
            })
        )
    };

    /// Admin: after Mollie payment, set Doka worth and mint a 120-char GameKey
    /// from IC `raw_rand`. Returns the code once; store it only in the reveal map.
    public shared ({ caller }) func adminApproveGameKeyPurchase(
        requestId : Text,
        dokaAmount : Nat,
    ) : async { #ok : Text; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            return #err("Unauthorized: admin only");
        };
        switch (AdminGuard.validateDokaGrant(dokaAmount)) {
            case (?e) { return #err(e) };
            case null {};
        };
        switch (gameKeyRequests.get(requestId)) {
            case null { return #err("Purchase request not found") };
            case (?rec) {
                if (rec.status != "pending") {
                    return #err("Request is not pending");
                };
                switch (await _newUniqueGameKey()) {
                    case (#err e) { return #err(e) };
                    case (#ok code) {
                        // raw_rand yields. Re-read so a reject (or a second
                        // approve) that landed during the await cannot be
                        // overwritten into an extra redeemable GameKey.
                        switch (gameKeyRequests.get(requestId)) {
                            case null { return #err("Purchase request not found") };
                            case (?latest) {
                                if (latest.status != "pending") {
                                    return #err("Request is not pending");
                                };
                                let now = Time.now();
                                gameKeyLedger.add(code, {
                                    requestId = latest.id;
                                    dokaAmount;
                                    redeemed = false;
                                    redeemedBy = "";
                                });
                                gameKeyReveals.add(latest.id, code);
                                gameKeyRequests.add(latest.id, {
                                    latest with
                                    status = "approved";
                                    dokaAmount;
                                    approvedAt = now;
                                });
                                _recordAdminAudit(caller, "approveGameKey", latest.userPrincipal.toText(), "pending", dokaAmount.toText());
                                #ok(code)
                            };
                        };
                    };
                };
            };
        };
    };

    /// Admin: payment never arrived.
    public shared ({ caller }) func adminRejectGameKeyPurchase(requestId : Text) : async { #ok; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            return #err("Unauthorized: admin only");
        };
        switch (gameKeyRequests.get(requestId)) {
            case null { return #err("Purchase request not found") };
            case (?rec) {
                if (rec.status != "pending") {
                    return #err("Only pending requests can be rejected");
                };
                gameKeyRequests.add(rec.id, { rec with status = "rejected" });
                _recordAdminAudit(caller, "rejectGameKey", rec.userPrincipal.toText(), "pending", "rejected");
                #ok
            };
        };
    };

    /// Admin: one-time reveal until marked emailed. Empty #err if already wiped.
    public query ({ caller }) func adminGetGameKeyReveal(requestId : Text) : async { #ok : Text; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            return #err("Unauthorized: admin only");
        };
        switch (gameKeyReveals.get(requestId)) {
            case null { #err("GameKey is no longer available to copy") };
            case (?code) { #ok(code) };
        };
    };

    /// Admin: confirm the code was copied/mailed. Wipes the plaintext reveal.
    /// The canister cannot send email; this is the honest hand-off.
    public shared ({ caller }) func adminMarkGameKeyEmailed(requestId : Text) : async { #ok; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            return #err("Unauthorized: admin only");
        };
        switch (gameKeyRequests.get(requestId)) {
            case null { return #err("Purchase request not found") };
            case (?rec) {
                if (rec.status != "approved" and rec.status != "redeemed") {
                    return #err("Request has no GameKey to mark emailed");
                };
                gameKeyReveals.remove(rec.id);
                gameKeyRequests.add(rec.id, { rec with emailed = true });
                _recordAdminAudit(caller, "markGameKeyEmailed", rec.userPrincipal.toText(), "reveal", "wiped");
                #ok
            };
        };
    };


    // ─── Game config (singleton, admin-editable) ──────────────────────

    var gameConfig : AdminTypes.AdminGameConfig;

    // Seed the default game config on first run (fresh installs only).
    // Sentinel is dokaSpawnBaseValue==0 — dokaSpawnChance==0 is a legal
    // live value and must not wipe a valid admin singleton.
    do {
        if (AdminGuard.gameConfigNeedsSeed(gameConfig)) {
            gameConfig := AdminLib.defaultGameConfig();
        };
    };

    var gameConfigPrev : AdminTypes.AdminGameConfig;
    var hasGameConfigPrev : Bool;

    public shared ({ caller }) func adminSetGameConfig(config : AdminTypes.AdminGameConfig) : async { #ok; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            return #err("Unauthorized: admin only");
        };
        switch (AdminGuard.validateGameConfig(config)) {
            case (?e) { return #err(e) };
            case null {};
        };
        gameConfigPrev := gameConfig;
        hasGameConfigPrev := true;
        gameConfig := config;
        _recordAdminAudit(caller, "setGameConfig", "gameConfig", "previous", "updated");
        #ok;
    };

    public shared ({ caller }) func adminRollbackGameConfig() : async { #ok; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            return #err("Unauthorized: admin only");
        };
        if (not hasGameConfigPrev) {
            return #err("No previous game config to restore");
        };
        let current = gameConfig;
        gameConfig := gameConfigPrev;
        gameConfigPrev := current;
        _recordAdminAudit(caller, "rollbackGameConfig", "gameConfig", "updated", "previous");
        #ok;
    };

    public query func getGameConfig() : async AdminTypes.AdminGameConfig {
        gameConfig;
    };

    // ─── Tier spawn config (singleton, admin-editable) ──────────────────

    var tierSpawnConfig : AdminTypes.TierSpawnConfig;

    // Seed the default tier spawn config on first run (fresh installs only).
    do {
        if (tierSpawnConfig.tierSize == 0) {
            tierSpawnConfig := {
                tierSize            = 10;
                sameTierPercent     = 60.0;
                adjacentTierPercent = 20.0;
                twoAwayPercent      = 10.0;
                threeOrMorePercent  = 5.0;
            };
        };
    };

    var tierSpawnConfigPrev : AdminTypes.TierSpawnConfig;
    var hasTierSpawnConfigPrev : Bool;

    public shared ({ caller }) func adminSetTierSpawnConfig(config : AdminTypes.TierSpawnConfig) : async { #ok; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            return #err("Unauthorized: admin only");
        };
        switch (AdminGuard.validateTierSpawnConfig(config)) {
            case (?e) { return #err(e) };
            case null {};
        };
        tierSpawnConfigPrev := tierSpawnConfig;
        hasTierSpawnConfigPrev := true;
        tierSpawnConfig := config;
        _recordAdminAudit(caller, "setTierSpawnConfig", "tierSpawnConfig", "previous", "updated");
        #ok;
    };

    public shared ({ caller }) func adminRollbackTierSpawnConfig() : async { #ok; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            return #err("Unauthorized: admin only");
        };
        if (not hasTierSpawnConfigPrev) {
            return #err("No previous tier-spawn config to restore");
        };
        let current = tierSpawnConfig;
        tierSpawnConfig := tierSpawnConfigPrev;
        tierSpawnConfigPrev := current;
        _recordAdminAudit(caller, "rollbackTierSpawnConfig", "tierSpawnConfig", "updated", "previous");
        #ok;
    };

    public query func getTierSpawnConfig() : async AdminTypes.TierSpawnConfig {
        tierSpawnConfig;
    };

    // ─── Color palette config (singleton, admin-editable) ───────────────
    // Stored as a JSON string for full flexibility — frontend serialises/
    // deserialises the palette object. Empty string = no admin override.

    var colorPaletteStore : Text;
    var colorPalettePrev : Text;
    var hasColorPalettePrev : Bool;

    public shared ({ caller }) func adminSetColorPalette(palettes : Text) : async { #ok; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            return #err("Unauthorized: admin only");
        };
        switch (AdminGuard.validateJsonBlob("colorPalette", palettes)) {
            case (?e) { return #err(e) };
            case null {};
        };
        colorPalettePrev := colorPaletteStore;
        hasColorPalettePrev := true;
        colorPaletteStore := palettes;
        _recordAdminAudit(caller, "setColorPalette", "colorPalette", "previous", "updated");
        #ok;
    };

    public shared ({ caller }) func adminRollbackColorPalette() : async { #ok; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            return #err("Unauthorized: admin only");
        };
        if (not hasColorPalettePrev) {
            return #err("No previous color palette to restore");
        };
        let current = colorPaletteStore;
        colorPaletteStore := colorPalettePrev;
        colorPalettePrev := current;
        _recordAdminAudit(caller, "rollbackColorPalette", "colorPalette", "updated", "previous");
        #ok;
    };

    public query func getColorPalette() : async Text {
        colorPaletteStore;
    };

    // ─── Boss Rush admin config (singleton, admin-editable) ──────────────
    // Stored as a JSON string mirroring the frontend BossRushConfig shape.
    // Empty string = use frontend defaults.

    var bossRushConfigStore : Text;
    var bossRushConfigPrev : Text;
    var hasBossRushConfigPrev : Bool;

    public shared ({ caller }) func adminSetBossRushConfig(config : Text) : async { #ok; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            return #err("Unauthorized: admin only");
        };
        switch (AdminGuard.validateJsonBlob("bossRushConfig", config)) {
            case (?e) { return #err(e) };
            case null {};
        };
        bossRushConfigPrev := bossRushConfigStore;
        hasBossRushConfigPrev := true;
        bossRushConfigStore := config;
        _recordAdminAudit(caller, "setBossRushConfig", "bossRushConfig", "previous", "updated");
        #ok;
    };

    public shared ({ caller }) func adminRollbackBossRushConfig() : async { #ok; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            return #err("Unauthorized: admin only");
        };
        if (not hasBossRushConfigPrev) {
            return #err("No previous boss-rush config to restore");
        };
        let current = bossRushConfigStore;
        bossRushConfigStore := bossRushConfigPrev;
        bossRushConfigPrev := current;
        _recordAdminAudit(caller, "rollbackBossRushConfig", "bossRushConfig", "updated", "previous");
        #ok;
    };

    public query func getBossRushConfig() : async Text {
        bossRushConfigStore;
    };

    /// Rename a character in the given slot. Costs 100 Doka from the character's balance.
    public shared ({ caller }) func renameCharacter(slot : Nat, newName : Text) : async { #ok; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
            return #err("Unauthorized: must be logged in");
        };
        if (bannedPrincipals.containsKey(caller.toText())) {
            return #err("Account banned for non-payment");
        };
        if (slot < 1 or slot > 3) {
            return #err("Invalid slot number");
        };
        if (newName.size() == 0 or newName.size() > 20) {
            return #err("Name must be 1-20 characters");
        };

        let existingSlots = switch (characterSlots.get(caller)) {
            case null { return #err("No characters found") };
            case (?s) { s };
        };

        // B3: Duplicate name check — no two characters in the same account can share a name.
        let nameLower = newName;
        switch (existingSlots.slot1) {
            case (?c) { if (c.name == nameLower) { return #err("Name already in use") } };
            case null {};
        };
        switch (existingSlots.slot2) {
            case (?c) { if (c.name == nameLower) { return #err("Name already in use") } };
            case null {};
        };
        switch (existingSlots.slot3) {
            case (?c) { if (c.name == nameLower) { return #err("Name already in use") } };
            case null {};
        };

        let character = switch (slot) {
            case 1 { switch (existingSlots.slot1) { case null { return #err("Slot 1 is empty") }; case (?c) { c } } };
            case 2 { switch (existingSlots.slot2) { case null { return #err("Slot 2 is empty") }; case (?c) { c } } };
            case 3 { switch (existingSlots.slot3) { case null { return #err("Slot 3 is empty") }; case (?c) { c } } };
            case _ { return #err("Invalid slot") };
        };

        let renameCost : Nat = 100;
        // H10: Doka balance is per-principal, not per-character.
        let callerDokaRename = switch (dokaBalances.get(caller)) {
            case null { 0 };
            case (?b) { b };
        };
        if (callerDokaRename < renameCost) {
            return #err("Not enough Doka. Need 100, have " # callerDokaRename.toText());
        };

        let updatedCharacter : Character = { character with name = newName };

        let updatedSlots = switch (slot) {
            case 1 { { existingSlots with slot1 = ?updatedCharacter } };
            case 2 { { existingSlots with slot2 = ?updatedCharacter } };
            case 3 { { existingSlots with slot3 = ?updatedCharacter } };
            case _ { existingSlots };
        };
        characterSlots.add(caller, updatedSlots);
        // Deduct from per-principal Doka balance.
        dokaBalances.add(caller, Nat.sub(callerDokaRename, renameCost));
        #ok;
    };

    /// Set the player-arranged spell bar order for the character in the given slot.
    /// FILTERS out any id not owned by the character (not in spellLevelKeys) and
    /// persists the remaining ids into spellBarOrder. The spell bar is a UI
    /// preference, not an authorization surface, so unknown ids are dropped
    /// rather than rejecting the whole save. Keeps the slot 1-3 guard and the
    /// max-8 cap as structural validation.
    public shared ({ caller }) func setSpellBarOrder(slot : Nat, spellIds : [Text]) : async { #ok; #err : Text } {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            return #err("Unauthorized: must be logged in");
        };
        if (bannedPrincipals.containsKey(caller.toText())) {
            return #err("Account banned for non-payment");
        };
        if (slot < 1 or slot > 3) {
            return #err("Invalid slot number");
        };
        if (spellIds.size() > 8) {
            return #err("spellIds exceeds maximum of 8 entries");
        };

        let existingSlots = switch (characterSlots.get(caller)) {
            case null { return #err("No characters found") };
            case (?s) { s };
        };

        let character = switch (slot) {
            case 1 { switch (existingSlots.slot1) { case null { return #err("Slot 1 is empty") }; case (?c) { c } } };
            case 2 { switch (existingSlots.slot2) { case null { return #err("Slot 2 is empty") }; case (?c) { c } } };
            case 3 { switch (existingSlots.slot3) { case null { return #err("Slot 3 is empty") }; case (?c) { c } } };
            case _ { return #err("Invalid slot") };
        };

        // FILTER unknown ids and save the rest. The spell bar is a UI
        // preference, not an authorization surface — strict rejection belongs
        // to gameplay actions (casting/learning), not bar layout. spellLevelKeys
        // is only populated at upgradeSpell/createCharacter/saveBattleStats, so
        // for characters whose frontend never seeded the starter/spell catalog
        // ids, an unfiltered save would reject the whole bar. Filtering fixes
        // this for all existing characters without a migration.
        let filtered : [Text] = spellIds.filter(
            func(id : Text) : Bool { character.spellLevelKeys.contains(id) },
        );

        let updatedCharacter : Character = { character with spellBarOrder = ?filtered };

        let updatedSlots = switch (slot) {
            case 1 { { existingSlots with slot1 = ?updatedCharacter } };
            case 2 { { existingSlots with slot2 = ?updatedCharacter } };
            case 3 { { existingSlots with slot3 = ?updatedCharacter } };
            case _ { existingSlots };
        };
        characterSlots.add(caller, updatedSlots);
        #ok;
    };

    /// Debug query: returns raw slot data as text for diagnosing serialization issues.
    public query ({ caller }) func diagnoseCharacterSlots() : async Text {
        switch (characterSlots.get(caller)) {
            case null { "No slots found for caller" };
            case (?slots) {
                let s1 = switch (slots.slot1) {
                    case null { "slot1=empty" };
                    case (?c) { "slot1=" # c.name # " lvl:" # c.level.toText() # " colors:" # debug_show(c.colors) };
                };
                let s2 = switch (slots.slot2) {
                    case null { "slot2=empty" };
                    case (?c) { "slot2=" # c.name # " lvl:" # c.level.toText() # " colors:" # debug_show(c.colors) };
                };
                let s3 = switch (slots.slot3) {
                    case null { "slot3=empty" };
                    case (?c) { "slot3=" # c.name # " lvl:" # c.level.toText() # " colors:" # debug_show(c.colors) };
                };
                s1 # " | " # s2 # " | " # s3
            };
        };
    };

    // ─── Battle stats persistence ──────────────────────────────────────

    /// Save all battle-relevant stats back to a character slot after a battle.
    /// hp may arrive as negative (character was knocked out); it is clamped to 0 before storage.
    /// C1: dokaBalance is stored on the per-principal dokaBalances map (the
    ///     Character record no longer carries a wallet field). This write may
    ///     decrease Doka/XP (heal, shop, death) but must not mint — credits
    ///     go through applyRewards / claim / shop-complete / upgradeSpell.
    /// Incoming Doka/XP above the stored values are ignored. Level is owned
    /// by applyRewards — the client level argument is ignored.
    public shared ({ caller }) func saveBattleStats(
        slot             : Nat,
        _level           : Nat, // applyRewards is the sole level writer
        xp               : Nat,
        hp               : Int,
        _maxHp           : Nat,
        _ap              : Nat,
        maxAp            : Nat,
        _mp              : Nat,
        maxMp            : Nat,
        attack           : Nat,
        defense          : Nat,
        initiative       : Nat,
        dokaBalance      : Nat,   // kept in signature for frontend compat; stored in dokaBalances map
        _spellLevelKeys  : [Text], // upgradeSpell owns these; heal/death snapshots can be stale
        _spellLevelValues : [Nat],
    ) : async { #ok; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
            return #err("Unauthorized: must be logged in");
        };
        if (bannedPrincipals.containsKey(caller.toText())) {
            return #err("Account banned for non-payment");
        };
        if (slot < 1 or slot > 3) {
            return #err("Invalid slot number");
        };

        let existingSlots = switch (characterSlots.get(caller)) {
            case null { return #err("No characters found for user") };
            case (?s) { s };
        };

        let character = switch (slot) {
            case 1 { switch (existingSlots.slot1) { case null { return #err("Slot 1 is empty") }; case (?c) { c } } };
            case 2 { switch (existingSlots.slot2) { case null { return #err("Slot 2 is empty") }; case (?c) { c } } };
            case 3 { switch (existingSlots.slot3) { case null { return #err("Slot 3 is empty") }; case (?c) { c } } };
            case _ { return #err("Invalid slot") };
        };

        // Clamp hp to 0 — CharacterStats.hp is Nat. Cap at the official
        // overworld / heal formula, but never cut HP already stored under the
        // old level*200+100 cap or a previous growth percent (SDEG-2026-09-02-003).
        let maxHpAllowed : Nat = AdminGuard.persistHpWriteCap(
            character.stats.hp,
            character.level,
            levelUpConfig.statGrowthPercent,
        );
        let rawHp : Nat = if (hp <= 0) { 0 } else { hp.toNat() };
        let safeHp : Nat = _minNat(rawHp, maxHpAllowed);
        // Official battle AP/MP is PLAYER_BASE + floor(level / threshold).
        // A flat 20 cap let a raw client persist 20 AP/MP at level 1.
        let maxApAllowed : Nat = AdminGuard.persistApWriteCap(
            character.stats.ap,
            character.level,
            levelUpConfig.apMpLevelThreshold,
        );
        let maxMpAllowed : Nat = AdminGuard.persistMpWriteCap(
            character.stats.mp,
            character.level,
            levelUpConfig.apMpLevelThreshold,
        );
        let safeAp : Nat = _minNat(maxAp, maxApAllowed);
        let safeMp : Nat = _minNat(maxMp, maxMpAllowed);

        // Official heal/death/shop writes current stored atk/res/init. Do not
        // accept an inflated combat snapshot from a custom client.
        let updatedStats : CharacterStats = {
            character.stats with
            hp   = safeHp;
            ap   = safeAp;
            mp   = safeMp;
            atk  = _minNat(attack, character.stats.atk);
            res  = _minNat(defense, character.stats.res);
            init = _minNat(initiative, character.stats.init);
        };

        // Absolute snapshots may lower XP/Doka (death, spend) but must not
        // raise them — applyRewards is the only additive credit path.
        //

        // upgradeSpell is the sole writer of spell levels. Heal / death / shop
        // snapshots are often captured before an in-flight upgrade commits in
        // React, and replacing the arrays here would wipe a paid level.
        //
        // Credits (applyRewards / claim / shop-complete) are additive. An
        // absolute snapshot must never mint Doka, XP, or level — that is how
        // a stale optimistic UI survived reload as permanent progress.
        //
        // One currentDoka read — a second `let currentDoka` in this block
        // is a Motoko redefinition (#107 + #144 merge).
        let currentDoka : Nat = switch (dokaBalances.get(caller)) {
            case (?d) { d };
            case null { 0 };
        };
        let writeDoka : Nat = if (dokaBalance > currentDoka) { currentDoka } else { dokaBalance };
        let writeXp : Nat = if (xp > character.experience) { character.experience } else { xp };
        // applyRewards is the sole level writer. A lower client _level used
        // to demote the character (death/heal snapshots must not rewrite level).
        let updatedCharacter : Character = {
            character with
            level            = character.level;
            experience       = writeXp;
            stats            = updatedStats;
        };

        let updatedSlots = switch (slot) {
            case 1 { { existingSlots with slot1 = ?updatedCharacter } };
            case 2 { { existingSlots with slot2 = ?updatedCharacter } };
            case 3 { { existingSlots with slot3 = ?updatedCharacter } };
            case _ { existingSlots };
        };
        characterSlots.add(caller, updatedSlots);
        // C1: persist dokaBalance to per-principal store (single source of truth).
        // Never raise the wallet above the current store (heals/spends/death
        // only write the same or a lower balance).
        dokaBalances.add(caller, writeDoka);
        #ok;
    };

    public shared ({ caller }) func applyRewards(slot : Nat, dokaDelta : Nat, xpDelta : Nat) : async { #ok : { newDoka : Nat; newXp : Nat; newLevel : Nat }; #err : Text } {
      if (caller.isAnonymous()) { return #err "Anonymous caller" };
      if (not AccessControl.hasPermission(accessControlState, caller, #user)) { return #err "Unauthorized: must be logged in" };
      if (bannedPrincipals.containsKey(caller.toText())) { return #err "Account banned" };
      // Per-call ceiling above any official victory + dungeon 4× + Doka Fever
      // 2× + challenge + Boss Rush room grant. Stops a single raw-client mint
      // of Nat-max without changing intended payouts.
      if (dokaDelta > 100_000) { return #err "dokaDelta exceeds per-call maximum" };
      if (xpDelta > 500_000) { return #err "xpDelta exceeds per-call maximum" };
      let charSlots = switch (characterSlots.get(caller)) { case (?cs) { cs }; case null { return #err "No characters" } };
      let characterOpt = switch (slot) { case 1 { charSlots.slot1 }; case 2 { charSlots.slot2 }; case 3 { charSlots.slot3 }; case _ { return #err "Invalid slot" } };
      let character = switch (characterOpt) { case (?c) { c }; case null { return #err "Empty slot" } };
      var newXp = character.experience + xpDelta;
      var newLevel = character.level;
      // Canonical curve: level N→N+1 costs 100 * 2^(N-1).
      // Must match frontend xpForNextLevel; 100 * 2^N was off-by-one and
      // silently blocked intended level-ups after applyRewards persist.
      func pow2(n : Nat) : Nat { var r = 1; var i = 0; while (i < n) { r *= 2; i += 1 }; r };
      func xpToAdvance(level : Nat) : Nat {
        let exponent : Nat = if (level == 0) { 0 } else { level - 1 };
        100 * pow2(exponent)
      };
      label lvlLoop while (true) {
        let xpToNext = xpToAdvance(newLevel);
        if (newXp < xpToNext) { break lvlLoop };
        newXp -= xpToNext;
        newLevel += 1;
      };
      let updatedChar = { character with experience = newXp; level = newLevel };
      let newSlots = switch (slot) {
        case 1 { { charSlots with slot1 = ?updatedChar } };
        case 2 { { charSlots with slot2 = ?updatedChar } };
        case 3 { { charSlots with slot3 = ?updatedChar } };
        case _ { charSlots };
      };
      characterSlots.add(caller, newSlots);
      let currentDoka = switch (dokaBalances.get(caller)) { case (?d) { d }; case null { 0 } };
      let newDoka = currentDoka + dokaDelta;
      dokaBalances.add(caller, newDoka);
      #ok({ newDoka = newDoka; newXp = newXp; newLevel = newLevel })
    };

    /// Retrieve the full Character record for a given slot.
    public query ({ caller }) func getCharacterStats(slot : Nat) : async { #ok : Character; #err : Text } {
        if (slot < 1 or slot > 3) {
            return #err("Invalid slot number");
        };

        let slots = switch (characterSlots.get(caller)) {
            case null { return #err("No characters found for user") };
            case (?s) { s };
        };

        let character = switch (slot) {
            case 1 { slots.slot1 };
            case 2 { slots.slot2 };
            case 3 { slots.slot3 };
            case _ { null };
        };

        switch (character) {
            case null { #err("Slot " # debug_show(slot) # " is empty") };
            case (?c) { #ok(c) };
        };
    };

    // ─── App version tracking ──────────────────────────────────────────

    /// Current app version string, set by admin (e.g. "v161").
    var appVersion : Text;

    // Seed the default app version on first run (fresh installs only).
    do {
        if (appVersion == "") {
            appVersion := "v163";
        };
    };

    /// Changelog entries keyed by version string.
    let changelogs : Map.Map<Text, Text>;

    /// Per-user record of the last changelog version they have already seen.
    let changelogShownVersions : Map.Map<Principal, Text>;

    // Seed the initial changelog for v163.
    do {
        if (changelogs.size() == 0) {
            changelogs.add(
                "v163",
                "v163 - Security: Internet Identity first-login admin system (first principal to log in becomes admin); " #
                "Doka unified into single per-principal store; " #
                "shop purchases record proof-of-address URL; " #
                "setShopPaymentLink / getShopPaymentLinks endpoints; " #
                "isPlayerBanned query; adminAddDoka convenience function."
            );
        };
    };

    // ─── Payment link convenience endpoints ──────────────────────────────────

    /// Admin: set the payment URL for a specific shop package by dokaAmount.
    public shared ({ caller }) func setShopPaymentLink(dokaAmount : Nat, url : Text) : async { #ok; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            return #err("Unauthorized: admin only");
        };
        switch (AdminGuard.validateOptionalUrl("paymentLink", url)) {
            case (?e) { return #err(e) };
            case null {};
        };
        var found = false;
        for ((id, pkg) in shopPackages.entries()) {
            if (pkg.dokaAmount == dokaAmount) {
                shopPackages.add(id, { pkg with paymentLink = url });
                found := true;
            };
        };
        if (not found) {
            return #err("No package found with dokaAmount = " # dokaAmount.toText());
        };
        _recordAdminAudit(caller, "setShopPaymentLink", dokaAmount.toText(), "previous", "updated");
        #ok;
    };

    /// Public: returns all (dokaAmount, paymentLink) pairs.
    public query func getShopPaymentLinks() : async [(Nat, Text)] {
        shopPackages.values().map(func(pkg) {
            (pkg.dokaAmount, pkg.paymentLink)
        }).toArray()
    };

    // ─── Ban / unban player ───────────────────────────────────────────────────

    /// Admin: ban a player with a reason (convenience alias for adminBanAccount with reason).
    /// Achievement progress is preserved; claimed flags block a second payout.
    public shared ({ caller }) func banPlayer(userPrincipal : Principal, reason : Text) : async { #ok; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            return #err("Unauthorized: admin only");
        };
        bannedPrincipals.add(userPrincipal.toText(), true);
        // Do not write reasons into the public changelog map. getChangelog is
        // an unauthenticated query — "ban#<principal>" leaked admin notes.
        changelogs.remove("ban#" # userPrincipal.toText());
        // Do not wipe achievement progress — claimed flags are the anti-replay lock.
        _recordAdminAudit(caller, "banPlayer", userPrincipal.toText(), "active", AdminGuard.truncateSummary(reason));
        #ok;
    };

    /// Admin: unban a player account.
    public shared ({ caller }) func unbanPlayer(userPrincipal : Principal) : async { #ok; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            return #err("Unauthorized: admin only");
        };
        bannedPrincipals.remove(userPrincipal.toText());
        changelogs.remove("ban#" # userPrincipal.toText());
        _recordAdminAudit(caller, "unbanPlayer", userPrincipal.toText(), "banned", "active");
        #ok;
    };

    /// Public query: returns whether a given principal is banned.
    public query func isPlayerBanned(userPrincipal : Principal) : async Bool {
        bannedPrincipals.containsKey(userPrincipal.toText());
    };

    /// Admin: add Doka to any account (used by shop admin panel to manually credit Doka).
    public shared ({ caller }) func adminAddDoka(userPrincipal : Principal, amount : Nat) : async { #ok; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            return #err("Unauthorized: admin only");
        };
        switch (AdminGuard.validateDokaGrant(amount)) {
            case (?e) { return #err(e) };
            case null {};
        };
        let current = switch (dokaBalances.get(userPrincipal)) {
            case null { 0 };
            case (?b) { b };
        };
        dokaBalances.add(userPrincipal, current + amount);
        _recordAdminAudit(caller, "addDoka", userPrincipal.toText(), current.toText(), (current + amount).toText());
        #ok;
    };
    /// Admin: get the Doka balance of any account.
    public query ({ caller }) func adminGetDoka(userPrincipal : Principal) : async { #ok : Nat; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            return #err("Unauthorized: admin only");
        };
        let bal = switch (dokaBalances.get(userPrincipal)) {
            case null { 0 };
            case (?b) { b };
        };
        #ok(bal);
    };


    /// Returns the current app version string.
    public query func getAppVersion() : async Text {
        appVersion;
    };

    /// Admin-only: sets the current app version string.
    public shared ({ caller }) func setAppVersion(version : Text) : async { #ok; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            return #err("Unauthorized: admin only");
        };
        switch (AdminGuard.validateAppVersion(version)) {
            case (?e) { return #err(e) };
            case null {};
        };
        let previous = appVersion;
        appVersion := version;
        _recordAdminAudit(caller, "setAppVersion", version, previous, version);
        #ok;
    };

    /// Returns the changelog text for a given version (null if not set).
    public query func getChangelog(version : Text) : async ?Text {
        if (AdminGuard.isBanReasonKey(version)) {
            return null;
        };
        changelogs.get(version);
    };

    /// Admin-only: sets the changelog text for a given version.
    public shared ({ caller }) func setChangelog(version : Text, text : Text) : async { #ok; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            return #err("Unauthorized: admin only");
        };
        switch (AdminGuard.validateChangelog(version, text)) {
            case (?e) { return #err(e) };
            case null {};
        };
        let previous = switch (changelogs.get(version)) {
            case null { "none" };
            case (?_) { "present" };
        };
        changelogs.add(version, text);
        _recordAdminAudit(caller, "setChangelog", version, previous, "updated");
        #ok;
    };

    /// Returns the version string of the changelog the given user has already seen.
    /// Empty string means the user has not seen any changelog yet.
    public query ({ caller }) func getChangelogShownVersion(user : Principal) : async Text {
        if (caller != user) {
            return "";
        };
        switch (changelogShownVersions.get(user)) {
            case null { "" };
            case (?v) { v };
        };
    };

    /// Called by the frontend after the player dismisses the changelog popup.
    /// Records that the caller has seen the changelog for the given version.
    public shared ({ caller }) func markChangelogShown(version : Text) : async () {
        if (version.size() > 32) {
            return;
        };
        changelogShownVersions.add(caller, version);
    };

    // ─── Achievement API ─────────────────────────────────────────────────

    /// Admin: create or update an achievement configuration.
    public shared ({ caller }) func adminSetAchievementConfig(config : AdminTypes.AchievementConfig) : async { #ok; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            return #err("Unauthorized: admin only");
        };
        switch (AdminGuard.validateAchievementConfig(config)) {
            case (?e) { return #err(e) };
            case null {};
        };
        achievementConfigs.add(config.id, config);
        _recordAdminAudit(caller, "setAchievementConfig", config.id, "previous", config.name);
        #ok;
    };

    /// Admin: delete an achievement configuration.
    public shared ({ caller }) func adminDeleteAchievementConfig(id : Text) : async { #ok; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            return #err("Unauthorized: admin only");
        };
        var hasProgress = false;
        for (p in achievementProgress.values()) {
            if (p.achievementId == id) { hasProgress := true };
        };
        if (hasProgress) {
            switch (achievementConfigs.get(id)) {
                case null { return #err("Achievement not found: " # id) };
                case (?existing) {
                    achievementConfigs.add(id, { existing with active = false });
                    _recordAdminAudit(caller, "retireAchievementConfig", id, "active", "inactive");
                };
            };
            return #ok;
        };
        achievementConfigs.remove(id);
        _recordAdminAudit(caller, "deleteAchievementConfig", id, "present", "removed");
        #ok;
    };

    /// Public: list all achievement configs (used by frontend to render the achievements panel).
    public query func getAchievementConfigs() : async [AdminTypes.AchievementConfig] {
        achievementConfigs.values().toArray();
    };

    /// Public: return the achievement progress records for the given principal.
    public query ({ caller }) func getPlayerAchievements(player : Principal) : async [AdminTypes.AchievementProgress] {
        if (caller != player) {
            return [];
        };
        let principalText = player.toText();
        achievementProgress.values()
          .filter(func(v : AdminTypes.AchievementProgress) : Bool { v.principalId == principalText })
          .toArray();
    };

    func _slotBestLevel(slots : CharacterSlots) : Nat {
        var best : Nat = 0;
        let consider = func(cOpt : ?Character) {
            switch (cOpt) {
                case null {};
                case (?c) { if (c.level > best) { best := c.level } };
            };
        };
        consider(slots.slot1);
        consider(slots.slot2);
        consider(slots.slot3);
        best
    };

    func _slotBestSpellLevel(slots : CharacterSlots) : Nat {
        var best : Nat = 0;
        let consider = func(cOpt : ?Character) {
            switch (cOpt) {
                case null {};
                case (?c) {
                    for (v in c.spellLevelValues.values()) {
                        if (v > best) { best := v };
                    };
                };
            };
        };
        consider(slots.slot1);
        consider(slots.slot2);
        consider(slots.slot3);
        best
    };

    /// Player: mark an achievement as unlocked (called by the frontend when the condition is met).
    /// Idempotent — calling again on an already-unlocked achievement is a no-op.
    public shared ({ caller }) func markAchievementUnlocked(achievementId : Text) : async { #ok; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
            return #err("Unauthorized: must be logged in");
        };
        if (bannedPrincipals.containsKey(caller.toText())) {
            return #err("Account banned for non-payment");
        };
        let unlockCfg = switch (achievementConfigs.get(achievementId)) {
            case null { return #err("Unknown achievement: " # achievementId) };
            case (?cfg) {
                if (not cfg.active) {
                    return #err("Achievement is retired");
                };
                cfg
            };
        };
        let slotsForUnlock = characterSlots.get(caller);
        let bestLevel = switch (slotsForUnlock) {
            case null { 0 };
            case (?s) { _slotBestLevel(s) };
        };
        let bestSpellLevel = switch (slotsForUnlock) {
            case null { 0 };
            case (?s) { _slotBestSpellLevel(s) };
        };
        let unlockDoka = switch (dokaBalances.get(caller)) {
            case null { 0 };
            case (?b) { b };
        };
        switch (AdminGuard.achievementUnlockRejected(unlockCfg.condition, bestLevel, unlockDoka, bestSpellLevel)) {
            case (?e) { return #err(e) };
            case null {};
        };
        let key = caller.toText() # "#" # achievementId;
        switch (achievementProgress.get(key)) {
            case (?existing) {
                if (existing.unlocked) { return #ok }; // already unlocked, idempotent
                achievementProgress.add(key, { existing with unlocked = true; unlockedAt = Time.now() });
            };
            case null {
                achievementProgress.add(key, {
                    principalId   = caller.toText();
                    achievementId;
                    unlocked      = true;
                    unlockedAt    = Time.now();
                    claimed       = false;
                });
            };
        };
        #ok;
    };

    /// Player: claim the Doka reward for a completed achievement.
    /// Checks: achievement must be unlocked for this player AND not already claimed.
    /// On success, adds dokaReward to the caller's dokaBalances entry and marks as claimed.
    public shared ({ caller }) func claimAchievementReward(achievementId : Text) : async { #ok : Nat; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
            return #err("Unauthorized: must be logged in");
        };
        if (bannedPrincipals.containsKey(caller.toText())) {
            return #err("Account banned for non-payment");
        };
        let config = switch (achievementConfigs.get(achievementId)) {
            case null { return #err("Unknown achievement: " # achievementId) };
            case (?c) { c };
        };
        let key = caller.toText() # "#" # achievementId;
        let progress = switch (achievementProgress.get(key)) {
            case null { return #err("Achievement not yet unlocked") };
            case (?p) { p };
        };
        if (not progress.unlocked) {
            return #err("Achievement not yet unlocked");
        };
        if (progress.claimed) {
            return #err("Reward already claimed");
        };
        if (not AdminGuard.knownAchievementCondition(config.condition)) {
            return #err("condition is not a recognized value");
        };
        // Mark as claimed.
        achievementProgress.add(key, { progress with claimed = true });
        // Credit Doka to the principal-level balance.
        let current = switch (dokaBalances.get(caller)) {
            case null { 0 };
            case (?b) { b };
        };
        dokaBalances.add(caller, current + config.dokaReward);
        #ok(config.dokaReward);
    };

    // ─── Role check / first-login-becomes-admin ─────────────────────────

    /// Returns "admin" if the caller has admin permission, otherwise "user".
    /// Triggers first-login admin auto-assignment: the very first principal
    /// to call this becomes admin.
    public shared ({ caller }) func getUserRole() : async Text {
        _ensureRegistered(caller);
        if (AccessControl.isAdmin(accessControlState, caller)) {
            "admin"
        } else {
            "user"
        };
    };

    /// Admin-only: assign a role to another principal.
    /// M1: rate-limited — the same caller cannot change roles more than once per 30 s.
    public shared ({ caller }) func assignUserRole(target : Principal, role : Text) : async { #ok; #err : Text } {
        _ensureRegistered(caller);
        switch (AdminGuard.validateAssignRole(role)) {
            case (?e) { return #err(e) };
            case null {};
        };
        let resolvedRole : AccessControl.UserRole = if (role == "admin") { #admin } else { #user };
        switch (_roleAssignRejected(caller, target, resolvedRole)) {
            case (?e) { return #err(e) };
            case null {};
        };
        AccessControl.assignRole(accessControlState, caller, target, resolvedRole);
        _recordAdminAudit(caller, "assignUserRole", target.toText(), "previous", role);
        #ok;
    };

    /// Public query: returns the Doka balance for the caller (H1, H5).
    public query ({ caller }) func getCallerDokaBalance() : async Nat {
        switch (dokaBalances.get(caller)) {
            case null { 0 };
            case (?b) { b };
        };
    };



    type ChatMessage = {
        id          : Nat;
        playerName  : Text;
        text        : Text;
        timestampMs : Int;
        colorHex    : Text;
    };

    /// In-memory only — intentionally clears on canister upgrade.
    transient var chatMessages : List.List<ChatMessage> = List.empty();
    transient var nextChatId   : Nat = 0;
    transient let chatLastSent : Map.Map<Text, Int> = Map.empty();
    transient let CHAT_COOLDOWN_NS : Int = 2_000_000_000;

    /// Append a new message; trims list to at most 200 entries (oldest dropped).
    public shared ({ caller }) func sendMessage(_playerName : Text, text : Text, colorHex : Text) : async () {
        if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
            return;
        };
        if (bannedPrincipals.containsKey(caller.toText())) {
            return;
        };
        if (text.size() == 0 or text.size() > 200) {
            return;
        };
        let nowChat = Time.now();
        let chatKey = caller.toText();
        switch (chatLastSent.get(chatKey)) {
            case (?last) {
                if (AdminGuard.chatCooldownActive(last, nowChat, CHAT_COOLDOWN_NS)) {
                    return;
                };
            };
            case null {};
        };
        chatLastSent.add(chatKey, nowChat);
        // Official ChatPanel sends userProfile.name. Bind the displayed name
        // to the caller's stored profile so a raw client cannot impersonate.
        let displayName = switch (userProfiles.get(caller)) {
            case (?p) {
                if (p.name.size() == 0) { "Player" } else if (p.name.size() > 50) {
                    // Profile save already caps at 50; defensive slice via keep.
                    p.name
                } else { p.name }
            };
            case null { "Player" };
        };
        let safeColor = if (_isHexColor(colorHex)) { colorHex } else { "#cccccc" };
        let msg : ChatMessage = {
            id          = nextChatId;
            playerName  = displayName;
            text;
            timestampMs = Time.now() / 1_000_000;  // ns → ms
            colorHex    = safeColor;
        };
        nextChatId += 1;
        chatMessages.add(msg);
        // Trim to the newest 200 messages when over the cap.
        let sz = chatMessages.size();
        if (sz > 200) {
            let kept = chatMessages.sliceToArray(Nat.sub(sz, 200), sz);
            chatMessages := List.fromArray(kept);
        };
    };

    /// Returns all current chat messages (oldest first).
    public query func getMessages() : async [ChatMessage] {
        chatMessages.toArray();
    };

    // ─── Enemy names pool ─────────────────────────────────────────────────────

    /// Admin-managed pool of ancient names used for enemy naming.
    /// Each enemy on a map gets at most one unique name drawn from this list.
    var enemyNames : List.List<Text>;

    /// Pre-filled list of 90 ancient names from various cultures.
    transient let DEFAULT_ENEMY_NAMES : [Text] = [
        // Roman
        "Maximus", "Brutus", "Cassius", "Octavian", "Tiberius",
        "Caligula", "Nero", "Vespasian", "Hadrian", "Trajan",
        "Marcus", "Lucius", "Gaius", "Quintus", "Flavius",
        "Decimus", "Publius", "Aulus", "Gnaeus", "Servius",
        // Greek
        "Achilles", "Hector", "Ajax", "Odysseus", "Perseus",
        "Theseus", "Heracles", "Leonidas", "Pericles", "Themistocles",
        "Xenophon", "Lysander", "Agamemnon", "Priam", "Diomedes",
        "Patroclus", "Menelaus", "Ptolemy", "Pyrrhus", "Alcibiades",
        // Egyptian
        "Ramses", "Thutmose", "Amenhotep", "Akhenaten", "Seti",
        "Khafre", "Djoser", "Narmer", "Khufu", "Sneferu",
        "Mentuhotep", "Ahmose", "Horemheb", "Tutankhamun", "Nefertiti",
        // Mesopotamian
        "Gilgamesh", "Sargon", "Hammurabi", "Nebuchadnezzar", "Ashurbanipal",
        "Tiglath", "Nimrod", "Enkidu", "Shamshi", "Naram",
        // Norse / Germanic
        "Odin", "Thor", "Loki", "Freyr", "Tyr",
        "Baldur", "Fenrir", "Sigurd", "Ragnar", "Ivar",
        // Persian / Achaemenid
        "Cyrus", "Darius", "Xerxes", "Artaxerxes", "Cambyses",
        // Celtic
        "Vercingetorix", "Brennus", "Boudicca", "Caractacus", "Ambiorix",
        // Aztec / Mayan
        "Itzcoatl", "Tlacaelel", "Moctezuma", "Cuauhtemoc", "Chimalli"
    ];

    /// Seed the names list on first call if it is empty. Admin-only — same
    /// privilege as addEnemyName / deleteEnemyName so a non-admin client
    /// cannot mutate the pool by calling this directly.
    public shared ({ caller }) func initDefaultNames() : async () {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            Runtime.trap("Unauthorized: admin only");
        };
        // Upsert: add each default name only if not already present.
        // Does NOT use the flag guard so new names are always seeded on upgraded canisters.
        for (n in DEFAULT_ENEMY_NAMES.values()) {
            let alreadyExists = switch (enemyNames.find(func(existing : Text) : Bool { existing == n })) {
                case (?_) { true };
                case (null) { false };
            };
            if (not alreadyExists) {
                enemyNames.add(n);
            };
        };
    };

    /// Returns the current list of admin-managed enemy names.
    /// When the stored list is empty the canonical ancient names default list
    /// is returned so enemies are never named “AncientOne” by fallback.
    public query func getEnemyNames() : async [Text] {
        if (enemyNames.size() == 0) {
            // Return the curated ancient names default list.
            return [
                "Malachar", "Vorenth", "Aethys", "Zarvok", "Kethara",
                "Duskwyn", "Voraxis", "Nythera", "Valdrek", "Seramis",
                "Thornvex", "Golvak", "Draveth", "Sythion", "Kaelthar",
                "Norrax", "Veluun", "Drathis", "Xarveth", "Orvael",
                "Tyranos", "Belkoth", "Senvaris",
                "Dusk Warden", "Grim Noctis", "Pale Archon", "Shade Counsel",
                "Void Scion", "Ebon Rift", "Ashen Crown",
                "Mal Arath", "Vel Sharas", "Keth Dorn", "Nox Verath",
                "Drak Solun", "Vael Morn", "Sar Thax", "Zyth Vel",
                "Kor Nael", "Dusk Vareth",
            ];
        };
        enemyNames.toArray();
    };

    /// Adds a new name to the pool (admin only).
    public shared ({ caller }) func addEnemyName(name : Text) : async () {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            Runtime.trap("Unauthorized: admin only");
        };
        switch (AdminGuard.validateEnemyName(name)) {
            case (?e) { Runtime.trap(e) };
            case null {};
        };
        enemyNames.add(name);
    };

    /// Removes a name from the pool by value (admin only).
    public shared ({ caller }) func deleteEnemyName(name : Text) : async () {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            Runtime.trap("Unauthorized: admin only");
        };
        let filtered = enemyNames.toArray().filter(func(n) { n != name });
        enemyNames := List.fromArray(filtered);
    };

    // ─── Buff shop inventory ───────────────────────────────────────────────

    /// Per-principal buff inventories (keyed by principal, stores array of items per slot).
    /// Layout: principalText#slot → BuffInventory
    let buffInventories : Map.Map<Text, AdminTypes.BuffInventory>;

    /// Hardcoded buff item catalog.
    /// itemId → (name, dokaCost)
    transient let BUFF_CATALOG : [(Text, Text, Nat)] = [
        ("health_potion",   "Health Potion",   50),
        ("greater_potion",  "Greater Potion",  120),
        ("battle_elixir",   "Battle Elixir",   200),
        ("swift_boots",     "Swift Boots",     80),
        ("shield_charm",    "Shield Charm",    150),
        ("fury_potion",     "Fury Potion",     100),
    ];

    /// Returns the cost of a buff item, or null if unknown.
    func _buffItemCost(itemId : Text) : ?Nat {
        var found : ?Nat = null;
        for ((id, _name, cost) in BUFF_CATALOG.values()) {
            if (id == itemId) { found := ?cost };
        };
        found;
    };

    /// Returns the buff inventory key for a caller + slot.
    func _buffKey(caller : Principal, slot : Nat) : Text {
        caller.toText() # "#" # slot.toText()
    };

    /// Public: list all available buff items (itemId, name, dokaCost).
    public query func getBuffCatalog() : async [(Text, Text, Nat)] {
        BUFF_CATALOG;
    };

    /// Retrieve a character slot's buff inventory.
    public query ({ caller }) func getBuffInventory(slot : Nat) : async { #ok : AdminTypes.BuffInventory; #err : Text } {
        if (slot < 1 or slot > 3) { return #err("Invalid slot") };
        let inv = switch (buffInventories.get(_buffKey(caller, slot))) {
            case null { [] };
            case (?i) { i };
        };
        #ok(inv);
    };

    /// Purchase a buff item. Deducts Doka from caller's per-principal balance.
    public shared ({ caller }) func purchaseBuff(slot : Nat, itemId : Text) : async { #ok : AdminTypes.BuffInventory; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
            return #err("Unauthorized: must be logged in");
        };
        if (bannedPrincipals.containsKey(caller.toText())) {
            return #err("Account banned for non-payment");
        };
        if (slot < 1 or slot > 3) { return #err("Invalid slot") };

        let cost = switch (_buffItemCost(itemId)) {
            case null { return #err("Unknown item: " # itemId) };
            case (?c) { c };
        };

        let callerDoka = switch (dokaBalances.get(caller)) {
            case null { 0 };
            case (?b) { b };
        };
        if (callerDoka < cost) {
            return #err("Not enough Doka. Need " # cost.toText() # ", have " # callerDoka.toText());
        };

        // Deduct Doka.
        dokaBalances.add(caller, Nat.sub(callerDoka, cost));

        // Update inventory.
        let key = _buffKey(caller, slot);
        let existing : AdminTypes.BuffInventory = switch (buffInventories.get(key)) {
            case null { [] };
            case (?i) { i };
        };
        // Find existing entry for this itemId and increment quantity, or append a new entry.
        let existingEntry = existing.find(func(item : AdminTypes.BuffInventoryItem) : Bool {
            item.itemId == itemId
        });
        let newInv : AdminTypes.BuffInventory = switch (existingEntry) {
            case (?_) {
                existing.map(func(item) {
                    if (item.itemId == itemId) { { item with quantity = item.quantity + 1 } } else { item }
                })
            };
            case null {
                existing.concat([{ itemId; quantity = 1 }])
            };
        };
        buffInventories.add(key, newInv);
        #ok(newInv);
    };

    /// Use one of a buff item (removes one from inventory).
    public shared ({ caller }) func useBuffItem(slot : Nat, itemId : Text) : async { #ok : AdminTypes.BuffInventory; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
            return #err("Unauthorized: must be logged in");
        };
        if (bannedPrincipals.containsKey(caller.toText())) {
            return #err("Account banned for non-payment");
        };
        if (slot < 1 or slot > 3) { return #err("Invalid slot") };
        let key = _buffKey(caller, slot);
        let existing : AdminTypes.BuffInventory = switch (buffInventories.get(key)) {
            case null { return #err("Inventory empty") };
            case (?i) { i };
        };
        // Check that item exists before proceeding.
        let entry = existing.find(func(item : AdminTypes.BuffInventoryItem) : Bool {
            item.itemId == itemId
        });
        switch (entry) {
            case null { return #err("Item not in inventory: " # itemId) };
            case (?_) {};
        };
        // Decrement quantity; remove entry if it reaches 0.
        let newInv : AdminTypes.BuffInventory = existing.filterMap(func(item) {
            if (item.itemId == itemId) {
                if (item.quantity <= 1) { null } else { ?{ item with quantity = Nat.sub(item.quantity, 1) } }
            } else { ?item }
        });
        buffInventories.add(key, newInv);
        #ok(newInv);
    };

    // ─── Dungeon chain records ────────────────────────────────────────────────

    let dungeonRecords : Map.Map<Principal, AdminTypes.DungeonRecord>;

    /// Returns a player's current dungeon chain record (null if never entered a dungeon).
    public query ({ caller }) func getDungeonRecord(principal : Principal) : async ?AdminTypes.DungeonRecord {
        if (caller != principal) {
            return null;
        };
        dungeonRecords.get(principal);
    };

    /// Update a player's dungeon progress (called by the frontend on each map completion).
    public shared ({ caller }) func updateDungeonProgress(principal : Principal, depth : Nat) : async () {
        // Only the principal themselves or admin may update.
        if (caller != principal and not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            Runtime.trap("Unauthorized");
        };
        if (bannedPrincipals.containsKey(caller.toText())) {
            Runtime.trap("Account banned for non-payment");
        };
        let safeDepth = AdminGuard.clampDungeonDepth(depth);
        let existing = switch (dungeonRecords.get(principal)) {
            case null { { chainDepth = 0; totalMapsCompleted = 0; bestRewardMultiplier = 1.0 } };
            case (?r) { r };
        };
        let multiplier : Float = 1.0 + (safeDepth.toFloat() * 0.25);
        let best = if (multiplier > existing.bestRewardMultiplier) { multiplier } else { existing.bestRewardMultiplier };
        dungeonRecords.add(principal, {
            chainDepth           = safeDepth;
            totalMapsCompleted   = existing.totalMapsCompleted + 1;
            bestRewardMultiplier = best;
        });
    };

    /// Reset a player's dungeon chain (called on death or chain completion).
    public shared ({ caller }) func resetDungeonChain(principal : Principal) : async () {
        if (caller != principal and not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            Runtime.trap("Unauthorized");
        };
        switch (dungeonRecords.get(principal)) {
            case null {};
            case (?r) {
                dungeonRecords.add(principal, { r with chainDepth = 0 });
            };
        };
    };

    // ─── Enemy HP formula helper ───────────────────────────────────────────

    /// Compute the base HP for an enemy of the given tier at the given player level,
    /// using the admin-configurable stat growth percent as the scaling factor.
    /// Formula: baseHP * (1 + (level * scalingFactor))
    /// where scalingFactor = levelUpConfig.statGrowthPercent / 100.0
    /// and baseHP is determined by tier: tier 1 = 30, +20 per additional tier.
    public query func getEnemyHPForLevel(enemyTier : Nat, level : Nat) : async Nat {
        let baseTierHP : Nat = 30 + (if (enemyTier > 1) { (enemyTier - 1) * 20 } else { 0 });
        let scalingFactor : Float = levelUpConfig.statGrowthPercent.toFloat() / 100.0;
        let scaled : Float = baseTierHP.toFloat() * (1.0 + (level.toFloat() * scalingFactor));
        // Convert back to Nat, truncating fractional part.
        let result : Int = scaled.toInt();
        if (result < 0) { 0 } else { result.toNat() }
    };

    // ─── Boss config system ─────────────────────────────────────────────────────────

    /// Stable store of boss configurations, keyed by boss id.
    let bossConfigs : Map.Map<Text, AdminTypes.BossConfig>;

    // Seed all 12 default bosses on the first initialization.
    do {
        if (bossConfigs.size() == 0) {
            for (boss in AdminLib.defaultBossConfigs().values()) {
                bossConfigs.add(boss.id, boss);
            };
        };
    };

    /// Stable store for boss portal assignments, keyed by portalId.
    let bossPortalAssignments : Map.Map<Text, Text>;  // portalId → bossId

    /// Admin: create or update a boss configuration.
    public shared ({ caller }) func setBossConfig(config : AdminTypes.BossConfig) : async { #ok; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            return #err("Unauthorized: admin only");
        };
        switch (AdminGuard.validateBossConfig(config)) {
            case (?e) { return #err(e) };
            case null {};
        };
        bossConfigs.add(config.id, config);
        _recordAdminAudit(caller, "setBossConfig", config.id, "previous", config.name);
        #ok;
    };

    /// Admin: delete a boss configuration by id.
    public shared ({ caller }) func deleteBossConfig(id : Text) : async { #ok; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            return #err("Unauthorized: admin only");
        };
        for ((_, bid) in bossPortalAssignments.entries()) {
            if (bid == id) {
                return #err("Boss is assigned to a portal; remove the assignment first");
            };
        };
        switch (bossConfigs.get(id)) {
            case null { return #err("Boss not found: " # id) };
            case (?_) {};
        };
        bossConfigs.remove(id);
        _recordAdminAudit(caller, "deleteBossConfig", id, "present", "removed");
        #ok;
    };

    /// Public: returns all boss configs.
    public query func getAllBossConfigs() : async [AdminTypes.BossConfig] {
        bossConfigs.values().toArray();
    };

    /// Public: returns a single boss config by id (null if not found).
    public query func getBossConfig(id : Text) : async ?AdminTypes.BossConfig {
        bossConfigs.get(id);
    };

    /// Public: returns all (portalId, bossId) pairs for active boss portal assignments.
    public query func getBossPortalAssignments() : async [(Text, Text)] {
        bossPortalAssignments.entries().toArray();
    };

    /// Admin: assign a boss to a portal (or overwrite an existing assignment).
    public shared ({ caller }) func setBossPortalAssignment(portalId : Text, bossId : Text) : async { #ok; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            return #err("Unauthorized: admin only");
        };
        switch (AdminGuard.validateBossPortalAssignment(portalId, bossId)) {
            case (?e) { return #err(e) };
            case null {};
        };
        switch (bossConfigs.get(bossId)) {
            case null { return #err("Boss not found: " # bossId) };
            case (?_) {};
        };
        let prev = switch (bossPortalAssignments.get(portalId)) {
            case null { "none" };
            case (?bid) { bid };
        };
        bossPortalAssignments.add(portalId, bossId);
        _recordAdminAudit(caller, "setBossPortalAssignment", portalId, prev, bossId);
        #ok;
    };

    /// Admin: remove a boss portal assignment.
    public shared ({ caller }) func deleteBossPortalAssignment(portalId : Text) : async { #ok; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            return #err("Unauthorized: admin only");
        };
        let prev = switch (bossPortalAssignments.get(portalId)) {
            case null { "none" };
            case (?bid) { bid };
        };
        bossPortalAssignments.remove(portalId);
        _recordAdminAudit(caller, "deleteBossPortalAssignment", portalId, prev, "removed");
        #ok;
    };

    // ─── Doka (currency) drop system ────────────────────────────────────────────────────

    /// Separate stable storage for Doka balances, keyed by Principal.
    let dokaBalances : Map.Map<Principal, Nat>;

    /// Returns the caller's current Doka balance.
    public query ({ caller }) func getDokaBalance() : async Nat {
        switch (dokaBalances.get(caller)) {
            case null { 0 };
            case (?bal) { bal };
        };
    };

    /// Unused public mint. Official Doka credits go through applyRewards.
    /// Candid signature kept; the body does not award. A raw client previously
    /// could request 8×200×1e9 Doka per call via the jackpot tier.
    public shared ({ caller }) func calculateAndAwardDoka(enemies : [{ level : Nat }]) : async Nat {
        ignore (caller, enemies);
        0
    };

    public shared(msg) func saveKillCount(slot: Nat, kills: Nat) : async {#ok; #err: Text} {
      let caller = msg.caller;
      if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
        return #err("Unauthorized");
      };
      if (bannedPrincipals.containsKey(caller.toText())) {
        return #err("Account is banned");
      };
      if (kills > 64) {
        return #err("kills exceed single-battle bound");
      };
      switch (characterSlots.get(caller)) {
        case null { #err("no character slots found") };
        case (?slots) {
          let charOpt = switch(slot) {
            case 1 { slots.slot1 };
            case 2 { slots.slot2 };
            case 3 { slots.slot3 };
            case _ { null };
          };
          switch(charOpt) {
            case null { #err("slot not found") };
            case (?char) {
              let updatedChar = { char with stats = { char.stats with killCount = char.stats.killCount + kills } };
              let updatedSlots = switch(slot) {
                case 1 { { slots with slot1 = ?updatedChar } };
                case 2 { { slots with slot2 = ?updatedChar } };
                case 3 { { slots with slot3 = ?updatedChar } };
                case _ { slots };
              };
              characterSlots.add(caller, updatedSlots);
              #ok
            };
          };
        };
      };
    };

    // ─── Session state API ──────────────────────────────────────────────────

    /// Update the session state fields (bloodBalance, covenantBuff, shrineCount)
    /// for a character slot. Replaces localStorage for cross-device persistence.
    public shared ({ caller }) func updateSessionState(
        slot         : Nat,
        bloodBalance : Nat,
        covenantBuff : Text,
        shrineCount  : Nat,
    ) : async { #ok; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
            return #err("Unauthorized: must be logged in");
        };
        if (bannedPrincipals.containsKey(caller.toText())) {
            return #err("Account banned for non-payment");
        };
        if (slot < 1 or slot > 3) {
            return #err("Invalid slot number");
        };
        if (bloodBalance > 100) {
            return #err("bloodBalance must be 0-100");
        };
        if (covenantBuff.size() > 64) {
            return #err("covenantBuff exceeds maximum length");
        };
        if (shrineCount > 100) {
            return #err("shrineCount exceeds maximum");
        };
        let existingSlots = switch (characterSlots.get(caller)) {
            case null { return #err("No characters found for user") };
            case (?s) { s };
        };
        let character = switch (slot) {
            case 1 { switch (existingSlots.slot1) { case null { return #err("Slot 1 is empty") }; case (?c) { c } } };
            case 2 { switch (existingSlots.slot2) { case null { return #err("Slot 2 is empty") }; case (?c) { c } } };
            case 3 { switch (existingSlots.slot3) { case null { return #err("Slot 3 is empty") }; case (?c) { c } } };
            case _ { return #err("Invalid slot") };
        };
        let updatedCharacter : Character = {
            character with
            bloodBalance = ?bloodBalance;
            covenantBuff = ?covenantBuff;
            shrineCount  = ?shrineCount;
        };
        let updatedSlots = switch (slot) {
            case 1 { { existingSlots with slot1 = ?updatedCharacter } };
            case 2 { { existingSlots with slot2 = ?updatedCharacter } };
            case 3 { { existingSlots with slot3 = ?updatedCharacter } };
            case _ { existingSlots };
        };
        characterSlots.add(caller, updatedSlots);
        #ok;
    };

    /// Save the active spell loadout (up to 8 spell IDs) for a character slot.
    /// Replaces localStorage so spell loadouts persist across devices and browser clears.
    public shared ({ caller }) func saveActiveSpells(
        slot   : Nat,
        spells : [Nat],
    ) : async { #ok; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
            return #err("Unauthorized: must be logged in");
        };
        if (bannedPrincipals.containsKey(caller.toText())) {
            return #err("Account banned for non-payment");
        };
        if (slot < 1 or slot > 3) {
            return #err("Invalid slot number");
        };
        if (spells.size() > 8) {
            return #err("Cannot equip more than 8 spells");
        };
        let existingSlots = switch (characterSlots.get(caller)) {
            case null { return #err("No characters found for user") };
            case (?s) { s };
        };
        let character = switch (slot) {
            case 1 { switch (existingSlots.slot1) { case null { return #err("Slot 1 is empty") }; case (?c) { c } } };
            case 2 { switch (existingSlots.slot2) { case null { return #err("Slot 2 is empty") }; case (?c) { c } } };
            case 3 { switch (existingSlots.slot3) { case null { return #err("Slot 3 is empty") }; case (?c) { c } } };
            case _ { return #err("Invalid slot") };
        };
        let updatedCharacter : Character = { character with activeSpells = ?spells };
        let updatedSlots = switch (slot) {
            case 1 { { existingSlots with slot1 = ?updatedCharacter } };
            case 2 { { existingSlots with slot2 = ?updatedCharacter } };
            case 3 { { existingSlots with slot3 = ?updatedCharacter } };
            case _ { existingSlots };
        };
        characterSlots.add(caller, updatedSlots);
        #ok;
    };

    /// Query the persisted session state for a character slot.
    /// Returns null values for any field not yet set (legacy characters).
    public query ({ caller }) func getSessionState(slot : Nat) : async {
        #ok : { bloodBalance : Nat; covenantBuff : Text; shrineCount : Nat; activeSpells : [Nat] };
        #err : Text
    } {
        if (slot < 1 or slot > 3) {
            return #err("Invalid slot number");
        };
        let slots = switch (characterSlots.get(caller)) {
            case null { return #err("No characters found for user") };
            case (?s) { s };
        };
        let charOpt = switch (slot) {
            case 1 { slots.slot1 };
            case 2 { slots.slot2 };
            case 3 { slots.slot3 };
            case _ { null };
        };
        switch (charOpt) {
            case null { #err("Slot " # slot.toText() # " is empty") };
            case (?c) {
                #ok({
                    bloodBalance = switch (c.bloodBalance) { case (?v) v; case null 50 };
                    covenantBuff = switch (c.covenantBuff) { case (?v) v; case null "" };
                    shrineCount  = switch (c.shrineCount)  { case (?v) v; case null 0  };
                    activeSpells = switch (c.activeSpells) { case (?v) v; case null [] };
                });
            };
        };
    };

    // ─── Boss Rush state ────────────────────────────────────────────────────

    /// Per-player boss rush state keyed by "principalText#slot".
    /// Fields: (currentRoom, highestRoomCompleted, totalBossRushRuns)
    type BossRushState = {
        currentRoom            : Nat;   // 0-9, which room they are on
        highestRoomCompleted   : Nat;   // best room ever completed (0-10)
        totalBossRushRuns      : Nat;   // how many full 10-room runs completed
    };

    let bossRushStates : Map.Map<Text, BossRushState>;

    func _bossRushKey(caller : Principal, slot : Nat) : Text {
        caller.toText() # "#" # slot.toText()
    };

    /// Clears slot-scoped Boss Rush progress. create/delete must call this so a
    /// new character cannot resume another occupant's currentRoom.
    func _clearBossRushForSlot(caller : Principal, slot : Nat) {
        bossRushStates.remove(_bossRushKey(caller, slot));
    };

    /// Returns (currentRoom, highestRoomCompleted, totalBossRushRuns) for any player+slot.
    public query ({ caller }) func getBossRushState(userId : Principal, slot : Nat) : async (Nat, Nat, Nat) {
        if (caller != userId) {
            return (0, 0, 0);
        };
        switch (bossRushStates.get(_bossRushKey(userId, slot))) {
            case null { (0, 0, 0) };
            case (?s) { (s.currentRoom, s.highestRoomCompleted, s.totalBossRushRuns) };
        };
    };

    /// Called when the player enters a boss rush room. Records the current room index.
    public shared ({ caller }) func setBossRushProgress(slot : Nat, currentRoom : Nat) : async () {
        if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
            Runtime.trap("Unauthorized: must be logged in");
        };
        if (bannedPrincipals.containsKey(caller.toText())) {
            Runtime.trap("Account banned for non-payment");
        };
        if (slot < 1 or slot > 3) { Runtime.trap("Invalid slot number") };
        if (currentRoom > 9) { Runtime.trap("currentRoom must be 0-9") };
        let key = _bossRushKey(caller, slot);
        let existing = switch (bossRushStates.get(key)) {
            case null { { currentRoom = 0; highestRoomCompleted = 0; totalBossRushRuns = 0 } };
            case (?s) { s };
        };
        // Official persist advances one room at a time. Reject a skip so a
        // raw client cannot jump to room 9 for master-complete.
        if (currentRoom > existing.currentRoom + 1) {
            Runtime.trap("currentRoom can only advance by 1");
        };
        // Decreasing here skipped resetBossRush and let a client walk 9→0→9
        // to re-fire completeBossRushRoom without a real abort.
        if (currentRoom < existing.currentRoom) {
            Runtime.trap("currentRoom cannot decrease; use resetBossRush");
        };
        bossRushStates.add(key, { existing with currentRoom });
    };

    /// Called when a boss rush room is cleared. Awards Doka and XP to the character.
    /// Room 10 (roomIndex = 9 completed → highestRoomCompleted reaches 10) sets bossRushMasterComplete.
    public shared ({ caller }) func completeBossRushRoom(
        slot        : Nat,
        roomIndex   : Nat,
        _dokaReward  : Nat,
        _xpReward    : Nat,
    ) : async { #ok; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
            return #err("Unauthorized: must be logged in");
        };
        if (bannedPrincipals.containsKey(caller.toText())) {
            return #err("Account banned for non-payment");
        };
        if (slot < 1 or slot > 3) { return #err("Invalid slot number") };
        if (roomIndex > 9) { return #err("roomIndex must be 0-9") };

        // Character must exist before any mutation. Client-supplied
        // dokaReward/xpReward used to mint Doka and still return #err when
        // the slot was empty. Official frontend already credits via
        // applyRewards and passes 0, 0.
        let existingSlots = switch (characterSlots.get(caller)) {
            case null { return #err("No characters found for user") };
            case (?s) { s };
        };
        let character = switch (slot) {
            case 1 { switch (existingSlots.slot1) { case null { return #err("Slot 1 is empty") }; case (?c) { c } } };
            case 2 { switch (existingSlots.slot2) { case null { return #err("Slot 2 is empty") }; case (?c) { c } } };
            case 3 { switch (existingSlots.slot3) { case null { return #err("Slot 3 is empty") }; case (?c) { c } } };
            case _ { return #err("Invalid slot") };
        };

        // Update boss rush state.
        let key = _bossRushKey(caller, slot);
        let existing = switch (bossRushStates.get(key)) {
            case null { { currentRoom = 0; highestRoomCompleted = 0; totalBossRushRuns = 0 } };
            case (?s) { s };
        };
        // Official persist writes next currentRoom first, then complete(roomIdx).
        // Accept the room just left (currentRoom - 1) or the room still occupied.
        if (roomIndex != existing.currentRoom and roomIndex + 1 != existing.currentRoom) {
            return #err("roomIndex must match current Boss Rush room");
        };
        let completedRoom = roomIndex + 1; // 1-indexed room completed
        let newHighest = if (completedRoom > existing.highestRoomCompleted) { completedRoom } else { existing.highestRoomCompleted };
        // Count a master run only while still occupying room 9. Repeat
        // complete(9) after that used to increment totalBossRushRuns forever.
        let countRun = AdminGuard.shouldCountBossRushRun(existing.currentRoom, roomIndex);
        let newTotalRuns = if (countRun) { existing.totalBossRushRuns + 1 } else { existing.totalBossRushRuns };
        let newCurrent = if (countRun) { 0 } else { existing.currentRoom };
        bossRushStates.add(key, {
            currentRoom            = newCurrent;
            highestRoomCompleted   = newHighest;
            totalBossRushRuns      = newTotalRuns;
        });

        let updatedCharacter : Character = {
            character with
            bossRushMasterComplete = if (countRun) { ?true } else { character.bossRushMasterComplete };
        };
        let updatedSlots = switch (slot) {
            case 1 { { existingSlots with slot1 = ?updatedCharacter } };
            case 2 { { existingSlots with slot2 = ?updatedCharacter } };
            case 3 { { existingSlots with slot3 = ?updatedCharacter } };
            case _ { existingSlots };
        };
        characterSlots.add(caller, updatedSlots);
        #ok;
    };

    /// Called on player death or boss rush abort. Resets currentRoom to 0.
    public shared ({ caller }) func resetBossRush(slot : Nat) : async () {
        if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
            Runtime.trap("Unauthorized: must be logged in");
        };
        if (bannedPrincipals.containsKey(caller.toText())) {
            Runtime.trap("Account banned for non-payment");
        };
        if (slot < 1 or slot > 3) { Runtime.trap("Invalid slot number") };
        let key = _bossRushKey(caller, slot);
        switch (bossRushStates.get(key)) {
            case null {}; // nothing to reset
            case (?s) {
                bossRushStates.add(key, { s with currentRoom = 0 });
            };
        };
    };

    public query func getLeaderboard() : async [{principalId: Text; playerName: Text; level: Nat; killCount: Nat; achievementsCompleted: Nat}] {
      var entries : [{principalId: Text; playerName: Text; level: Nat; killCount: Nat; achievementsCompleted: Nat}] = [];
      for ((principal, slots) in characterSlots.entries()) {
        var bestLevel : Nat = 0;
        var bestName : Text = "Unknown";
        var bestKills : Nat = 0;
        let checkChar = func(cOpt: ?Character) {
          switch(cOpt) {
            case null {};
            case (?c) {
              if (c.level > bestLevel) {
                bestLevel := c.level;
                bestName := c.name;
                bestKills := c.stats.killCount;
              };
            };
          };
        };
        checkChar(slots.slot1);
        checkChar(slots.slot2);
        checkChar(slots.slot3);
        if (bestLevel > 0) {
          let principalText = principal.toText();
          var achCount : Nat = 0;
          for ((key, prog) in achievementProgress.entries()) {
            if (prog.principalId == principalText and prog.claimed) {
              achCount += 1;
            };
          };
          entries := entries.concat([{
            principalId = principalText;
            playerName = bestName;
            level = bestLevel;
            killCount = bestKills;
            achievementsCompleted = achCount;
          }]);
        };
      };
      let sorted = entries.sort(func(a, b) {
        if (a.level > b.level) { #less }
        else if (a.level < b.level) { #greater }
        else { #equal }
      });
      if (sorted.size() > 50) { sorted.sliceToArray(0, 50) } else { sorted }
    };

    // ─── Ad boxes (login page, admin-managed) ───────────────────────────────
    // Three fixed slots; stored as a plain array of tuples for shared-type
    // compatibility.  Each entry is (imageUrl, linkUrl, isActive).
    var adBoxes : [(Text, Text, Bool)];

    /// Returns all three ad box slots.  Empty/inactive slots have isActive=false.
    public query func getAdBoxes() : async [(Text, Text, Bool)] {
        adBoxes
    };

    /// Admin: set the image URL and link URL for a specific ad box slot.
    /// index must be 0, 1, or 2; the slot is immediately marked active.
    public shared ({ caller }) func adminSetAdBox(
        index    : Nat,
        imageUrl : Text,
        linkUrl  : Text,
    ) : async { #ok; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            return #err("Unauthorized: admin only");
        };
        switch (AdminGuard.validateAdBox(index, imageUrl, linkUrl)) {
            case (?e) { return #err(e) };
            case null {};
        };
        adBoxes := Array.tabulate(3, func i {
            if (i == index) { (imageUrl, linkUrl, true) }
            else { adBoxes[i] }
        });
        _recordAdminAudit(caller, "setAdBox", index.toText(), "previous", "active");
        #ok
    };

    /// Admin: clear a specific ad box slot (sets it back to empty/inactive).
    public shared ({ caller }) func adminClearAdBox(
        index : Nat,
    ) : async { #ok; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            return #err("Unauthorized: admin only");
        };
        if (index >= 3) {
            return #err("index out of range: must be 0, 1, or 2");
        };
        adBoxes := Array.tabulate(3, func i {
            if (i == index) { ("", "", false) }
            else { adBoxes[i] }
        });
        _recordAdminAudit(caller, "clearAdBox", index.toText(), "active", "cleared");
        #ok
    };

    public query ({ caller }) func getAdminAuditLog() : async { #ok : [AdminTypes.AdminAuditEntry]; #err : Text } {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            return #err("Unauthorized: admin only");
        };
        #ok(adminAuditLog.toArray())
    };

    // ─── OQL (Data Intelligence) ─────────────────────────────────────────
    // Expose persisted collections as queryable entities. The Expose mixin adds
    // only the OQL schema()/execute() query methods; existing state, types, and
    // shared methods are untouched. This block sits at the END of the actor so
    // every persisted `let` field it references is already declared above.
    include Expose({
        entities = [
            // ── Player-owned persisted collections (per-Principal) ───────────
            // characterSlots : Map<Principal, CharacterSlots> — row identity is the
            // Map key (Principal), so iterate .entries() in manual mode and promote
            // the key as the primary key column. Each slot is flattened into its own
            // row so the agent can query individual characters.
            OQL.Entity.manual<(Principal, CharacterSlots)>(
                "characterSlots",
                func () = characterSlots.entries(),
                "CharacterSlotRow",
                "rowId",
            )
                .payload("rowId", func ((p, _slots)) = p.toText() # "#" # "slots")
                .payload("owner", func ((p, _)) = p.toText())
                .payload("slot1Name", func ((_, s)) =
                    switch (s.slot1) { case null ""; case (?c) c.name })
                .payload("slot1PieceType", func ((_, s)) =
                    switch (s.slot1) { case null ""; case (?c) c.pieceType })
                .payload("slot1Level", func ((_, s)) =
                    switch (s.slot1) { case null 0; case (?c) c.level })
                .payload("slot1Experience", func ((_, s)) =
                    switch (s.slot1) { case null 0; case (?c) c.experience })
                .payload("slot1Hp", func ((_, s)) =
                    switch (s.slot1) { case null 0; case (?c) c.stats.hp })
                .payload("slot1KillCount", func ((_, s)) =
                    switch (s.slot1) { case null 0; case (?c) c.stats.killCount })
                .payload("slot2Name", func ((_, s)) =
                    switch (s.slot2) { case null ""; case (?c) c.name })
                .payload("slot2PieceType", func ((_, s)) =
                    switch (s.slot2) { case null ""; case (?c) c.pieceType })
                .payload("slot2Level", func ((_, s)) =
                    switch (s.slot2) { case null 0; case (?c) c.level })
                .payload("slot2Experience", func ((_, s)) =
                    switch (s.slot2) { case null 0; case (?c) c.experience })
                .payload("slot2Hp", func ((_, s)) =
                    switch (s.slot2) { case null 0; case (?c) c.stats.hp })
                .payload("slot2KillCount", func ((_, s)) =
                    switch (s.slot2) { case null 0; case (?c) c.stats.killCount })
                .payload("slot3Name", func ((_, s)) =
                    switch (s.slot3) { case null ""; case (?c) c.name })
                .payload("slot3PieceType", func ((_, s)) =
                    switch (s.slot3) { case null ""; case (?c) c.pieceType })
                .payload("slot3Level", func ((_, s)) =
                    switch (s.slot3) { case null 0; case (?c) c.level })
                .payload("slot3Experience", func ((_, s)) =
                    switch (s.slot3) { case null 0; case (?c) c.experience })
                .payload("slot3Hp", func ((_, s)) =
                    switch (s.slot3) { case null 0; case (?c) c.stats.hp })
                .payload("slot3KillCount", func ((_, s)) =
                    switch (s.slot3) { case null 0; case (?c) c.stats.killCount })
                .ownedBy("owner")
                .controllerOrScoped()
                .build(),
            // dokaBalances : Map<Principal, Nat> — per-player currency.
            OQL.Entity.manual<(Principal, Nat)>(
                "dokaBalances",
                func () = dokaBalances.entries(),
                "DokaBalance",
                "owner",
            )
                .payload("owner",   func ((p, _)) = p.toText())
                .payload("balance", func ((_, n)) = n)
                .ownedBy("owner")
                .controllerOrScoped()
                .build(),
            // userProfiles : Map<Principal, UserProfile> — per-player display name.
            OQL.Entity.manual<(Principal, UserProfile)>(
                "userProfiles",
                func () = userProfiles.entries(),
                "UserProfile",
                "owner",
            )
                .payload("owner", func ((p, _)) = p.toText())
                .payload("name",  func ((_, u)) = u.name)
                .ownedBy("owner")
                .controllerOrScoped()
                .build(),
            // changelogShownVersions : Map<Principal, Text> — per-player last-seen version.
            OQL.Entity.manual<(Principal, Text)>(
                "changelogShownVersions",
                func () = changelogShownVersions.entries(),
                "ChangelogShownVersion",
                "owner",
            )
                .payload("owner",   func ((p, _)) = p.toText())
                .payload("version", func ((_, v)) = v)
                .ownedBy("owner")
                .controllerOrScoped()
                .build(),
            // dungeonRecords : Map<Principal, AdminTypes.DungeonRecord> — per-player chain progress.
            OQL.Entity.manual<(Principal, AdminTypes.DungeonRecord)>(
                "dungeonRecords",
                func () = dungeonRecords.entries(),
                "DungeonRecord",
                "owner",
            )
                .payload("owner", func ((p, _)) = p.toText())
                .payload("chainDepth", func ((_, r)) = r.chainDepth)
                .payload("totalMapsCompleted", func ((_, r)) = r.totalMapsCompleted)
                .payload("bestRewardMultiplier", func ((_, r)) = r.bestRewardMultiplier)
                .ownedBy("owner")
                .controllerOrScoped()
                .build(),
            // ── Admin-managed config collections (controllerOnly) ─────────────
            // enemyConfigs : Map<Text, EnemyConfig> — admin enemy templates.
            OQL.Entity.manual<(Text, EnemyConfig)>(
                "enemyConfigs",
                func () = enemyConfigs.entries(),
                "EnemyConfig",
                "id",
            )
                .payload("id",       func ((k, _)) = k)
                .payload("name",      func ((_, c)) = c.name)
                .payload("hp",        func ((_, c)) = c.hp)
                .payload("ap",        func ((_, c)) = c.ap)
                .payload("mp",        func ((_, c)) = c.mp)
                .payload("initStat",  func ((_, c)) = c.initStat)
                .payload("levelMin",  func ((_, c)) = c.levelMin)
                .payload("levelMax",  func ((_, c)) = c.levelMax)
                .payload("regions",   func ((_, c)) = c.regions.vals().join(", "))
                .payload("spriteUrl", func ((_, c)) =
                    switch (c.spriteUrl) { case null ""; case (?u) u })
                .controllerOnly()
                .build(),
            // regionConfigs : Map<Text, RegionConfig> — admin region templates.
            OQL.Entity.manual<(Text, RegionConfig)>(
                "regionConfigs",
                func () = regionConfigs.entries(),
                "RegionConfig",
                "id",
            )
                .payload("id",              func ((k, _)) = k)
                .payload("name",            func ((_, c)) = c.name)
                .payload("levelMin",        func ((_, c)) = c.levelMin)
                .payload("levelMax",        func ((_, c)) = c.levelMax)
                .payload("backgroundColor",func ((_, c)) = c.backgroundColor)
                .payload("battleEffectCount", func ((_, c)) = c.battleEffects.size())
                .controllerOnly()
                .build(),
            // playerSpriteConfigs : Map<Text, PlayerSpriteConfig> — admin sprite templates.
            OQL.Entity.manual<(Text, PlayerSpriteConfig)>(
                "playerSpriteConfigs",
                func () = playerSpriteConfigs.entries(),
                "PlayerSpriteConfig",
                "id",
            )
                .payload("id",                 func ((k, _)) = k)
                .payload("name",               func ((_, c)) = c.name)
                .payload("characterPieceType", func ((_, c)) = c.characterPieceType)
                .payload("frontUrl", func ((_, c)) =
                    switch (c.frontUrl) { case null ""; case (?u) u })
                .payload("rightUrl", func ((_, c)) =
                    switch (c.rightUrl) { case null ""; case (?u) u })
                .payload("leftUrl", func ((_, c)) =
                    switch (c.leftUrl) { case null ""; case (?u) u })
                .payload("backUrl", func ((_, c)) =
                    switch (c.backUrl) { case null ""; case (?u) u })
                .controllerOnly()
                .build(),
            // spellConfigs : Map<Text, AdminTypes.SpellConfig> — admin spell definitions.
            OQL.Entity.manual<(Text, AdminTypes.SpellConfig)>(
                "spellConfigs",
                func () = spellConfigs.entries(),
                "SpellConfig",
                "id",
            )
                .payload("id",             func ((k, _)) = k)
                .payload("name",           func ((_, c)) = c.name)
                .payload("description",    func ((_, c)) = c.description)
                .payload("iconEmoji",      func ((_, c)) = c.iconEmoji)
                .payload("apCost",         func ((_, c)) = c.apCost)
                .payload("mpCost",         func ((_, c)) = c.mpCost)
                .payload("damage",         func ((_, c)) = c.damage)
                .payload("healAmount",     func ((_, c)) = c.healAmount)
                .payload("effectType",     func ((_, c)) = c.effectType)
                .payload("spellType",      func ((_, c)) = c.spellType)
                .payload("isPhysical",     func ((_, c)) = c.isPhysical)
                .payload("range",          func ((_, c)) = c.range)
                .payload("minRange",       func ((_, c)) = c.minRange)
                .payload("maxRange",       func ((_, c)) = c.maxRange)
                .payload("modifiableRange",func ((_, c)) = c.modifiableRange)
                .payload("lineOfSight",    func ((_, c)) = c.lineOfSight)
                .payload("linear",         func ((_, c)) = c.linear)
                .payload("diagonal",      func ((_, c)) = c.diagonal)
                .payload("freeCells",      func ((_, c)) = c.freeCells)
                .payload("aoe",            func ((_, c)) = c.aoe)
                .payload("multiTarget",    func ((_, c)) = c.multiTarget)
                .payload("hitsAllies",     func ((_, c)) = c.hitsAllies)
                .payload("effectCategory", func ((_, c)) = c.effectCategory)
                .payload("usableByPlayer", func ((_, c)) = c.usableByPlayer)
                .payload("usableByEnemy",  func ((_, c)) = c.usableByEnemy)
                .payload("minLevel",       func ((_, c)) = c.minLevel)
                .payload("effectParams", func ((_, c)) =
                    switch (c.effectParams) { case null ""; case (?p) p })
                .payload("cooldown",       func ((_, c)) = c.cooldown)
                .controllerOnly()
                .build(),
            // mapModifierConfigs : Map<Text, AdminTypes.MapModifierConfig>.
            OQL.Entity.manual<(Text, AdminTypes.MapModifierConfig)>(
                "mapModifierConfigs",
                func () = mapModifierConfigs.entries(),
                "MapModifierConfig",
                "id",
            )
                .payload("id",            func ((k, _)) = k)
                .payload("name",          func ((_, c)) = c.name)
                .payload("description",   func ((_, c)) = c.description)
                .payload("modifierType",  func ((_, c)) = c.modifierType)
                .payload("active",        func ((_, c)) = c.active)
                .payload("triggerChance", func ((_, c)) = c.triggerChance)
                .controllerOnly()
                .build(),
            // shopPackages : Map<Text, AdminTypes.ShopPackage>.
            OQL.Entity.manual<(Text, AdminTypes.ShopPackage)>(
                "shopPackages",
                func () = shopPackages.entries(),
                "ShopPackage",
                "id",
            )
                .payload("id",            func ((k, _)) = k)
                .payload("dokaAmount",    func ((_, c)) = c.dokaAmount)
                .payload("priceEuroCents",func ((_, c)) = c.priceEuroCents)
                .payload("paymentLink",   func ((_, c)) = c.paymentLink)
                .payload("displayOrder", func ((_, c)) = c.displayOrder)
                .controllerOnly()
                .build(),
            // achievementConfigs : Map<Text, AdminTypes.AchievementConfig>.
            OQL.Entity.manual<(Text, AdminTypes.AchievementConfig)>(
                "achievementConfigs",
                func () = achievementConfigs.entries(),
                "AchievementConfig",
                "id",
            )
                .payload("id",          func ((k, _)) = k)
                .payload("name",        func ((_, c)) = c.name)
                .payload("description", func ((_, c)) = c.description)
                .payload("dokaReward",  func ((_, c)) = c.dokaReward)
                .payload("condition",   func ((_, c)) = c.condition)
                .payload("active",      func ((_, c)) = c.active)
                .controllerOnly()
                .build(),
            // achievementProgress : Map<Text, AdminTypes.AchievementProgress> — keyed by
            // "principalText#achievementId". Per-player rows: each signed-in user reads
            // only their own progress; the controller (Data Intelligence agent) reads all.
            OQL.Entity.manual<(Text, AdminTypes.AchievementProgress)>(
                "achievementProgress",
                func () = achievementProgress.entries(),
                "AchievementProgress",
                "key",
            )
                .payload("key", func ((k, _)) = k)
                .payload("principalId",   func ((_, p)) = p.principalId)
                .payload("achievementId", func ((_, p)) = p.achievementId)
                .payload("unlocked",       func ((_, p)) = p.unlocked)
                .payload("unlockedAt",     func ((_, p)) = p.unlockedAt)
                .payload("claimed",        func ((_, p)) = p.claimed)
                .ownedBy("principalId")
                .controllerOrScoped()
                .build(),
            // purchaseRecords : Map<Text, AdminTypes.PurchaseRecord> — keyed by purchase id.
            // Per-player rows: each signed-in user reads only their own purchases.
            OQL.Entity.manual<(Text, AdminTypes.PurchaseRecord)>(
                "purchaseRecords",
                func () = purchaseRecords.entries(),
                "PurchaseRecord",
                "id",
            )
                .payload("id", func ((k, _)) = k)
                .payload("userPrincipal", func ((_, r)) = r.userPrincipal.toText())
                .payload("dokaAmount",     func ((_, r)) = r.dokaAmount)
                .payload("packageId",      func ((_, r)) = r.packageId)
                .payload("customerName",    func ((_, r)) = r.customerName)
                .payload("customerSurname", func ((_, r)) = r.customerSurname)
                .payload("customerEmail",   func ((_, r)) = r.customerEmail)
                .payload("customerCity",    func ((_, r)) = r.customerCity)
                .payload("customerCountry", func ((_, r)) = r.customerCountry)
                .payload("timestamp",       func ((_, r)) = r.timestamp)
                .payload("status",          func ((_, r)) = r.status)
                .ownedBy("userPrincipal")
                .controllerOrScoped()
                .build(),
            OQL.Entity.manual<(Text, AdminTypes.GameKeyRequest)>(
                "gameKeyRequests",
                func () = gameKeyRequests.entries(),
                "GameKeyRequest",
                "id",
            )
                .payload("id", func ((k, _)) = k)
                .payload("userPrincipal", func ((_, r)) = r.userPrincipal.toText())
                .payload("email", func ((_, r)) = r.email)
                .payload("hintedEuroCents", func ((_, r)) = r.hintedEuroCents)
                .payload("timestamp", func ((_, r)) = r.timestamp)
                .payload("status", func ((_, r)) = r.status)
                .payload("dokaAmount", func ((_, r)) = r.dokaAmount)
                .payload("emailed", func ((_, r)) = r.emailed)
                .ownedBy("userPrincipal")
                .controllerOrScoped()
                .build(),
            // bannedPrincipals : Map<Text, Bool> — admin-only ban registry.
            OQL.Entity.manual<(Text, Bool)>(
                "bannedPrincipals",
                func () = bannedPrincipals.entries(),
                "BannedPrincipal",
                "principalText",
            )
                .payload("principalText", func ((k, _)) = k)
                .payload("banned",         func ((_, b)) = b)
                .controllerOnly()
                .build(),
            // changelogs : Map<Text, Text> — admin-managed version changelog text.
            OQL.Entity.manual<(Text, Text)>(
                "changelogs",
                func () = changelogs.entries(),
                "Changelog",
                "version",
            )
                .payload("version", func ((k, _)) = k)
                .payload("text",    func ((_, v)) = v)
                .controllerOnly()
                .build(),
            // buffInventories : Map<Text, AdminTypes.BuffInventory> — keyed by
            // "principalText#slot". Per-player rows: each signed-in user reads only
            // their own inventories.
            OQL.Entity.manual<(Text, AdminTypes.BuffInventory)>(
                "buffInventories",
                func () = buffInventories.entries(),
                "BuffInventory",
                "key",
            )
                .payload("key", func ((k, _)) = k)
                .payload("owner", func ((k, _)) =
                    // Extract the principalText portion (before the first "#").
                    switch (k.split(#char '#').next()) {
                        case null "";
                        case (?s) s;
                    })
                .payload("itemCount", func ((_, inv)) = inv.size())
                .payload("totalQuantity", func ((_, inv)) {
                    var total : Nat = 0;
                    for (item in inv.vals()) { total += item.quantity };
                    total
                })
                .ownedBy("owner")
                .controllerOrScoped()
                .build(),
            // bossConfigs : Map<Text, AdminTypes.BossConfig> — admin boss templates.
            OQL.Entity.manual<(Text, AdminTypes.BossConfig)>(
                "bossConfigs",
                func () = bossConfigs.entries(),
                "BossConfig",
                "id",
            )
                .payload("id",   func ((k, _)) = k)
                .payload("name", func ((_, c)) = c.name)
                .payload("pieceType", func ((_, c)) = c.pieceType)
                .payload("baseHp",  func ((_, c)) = c.baseStats.hp)
                .payload("baseAp",  func ((_, c)) = c.baseStats.ap)
                .payload("baseMp",  func ((_, c)) = c.baseStats.mp)
                .payload("baseAtk", func ((_, c)) = c.baseStats.atk)
                .payload("baseRes", func ((_, c)) = c.baseStats.res)
                .payload("baseInit",func ((_, c)) = c.baseStats.init)
                .payload("baseSp",  func ((_, c)) = c.baseStats.sp)
                .payload("bossMapColor", func ((_, c)) = c.bossMapColor)
                .payload("portalColor",   func ((_, c)) = c.portalColor)
                .payload("rewardDokaMultiplier", func ((_, c)) = c.rewardDokaMultiplier)
                .payload("rewardXpMultiplier",   func ((_, c)) = c.rewardXpMultiplier)
                .payload("defeated",   func ((_, c)) = c.defeated)
                .payload("adminNotes", func ((_, c)) = c.adminNotes)
                .controllerOnly()
                .build(),
            // bossPortalAssignments : Map<Text, Text> — portalId → bossId.
            OQL.Entity.manual<(Text, Text)>(
                "bossPortalAssignments",
                func () = bossPortalAssignments.entries(),
                "BossPortalAssignment",
                "portalId",
            )
                .payload("portalId", func ((k, _)) = k)
                .payload("bossId",    func ((_, v)) = v)
                .controllerOnly()
                .build(),
            // bossRushStates : Map<Text, BossRushState> — keyed by "principalText#slot".
            // Per-player rows: each signed-in user reads only their own boss-rush state.
            OQL.Entity.manual<(Text, BossRushState)>(
                "bossRushStates",
                func () = bossRushStates.entries(),
                "BossRushState",
                "key",
            )
                .payload("key", func ((k, _)) = k)
                .payload("owner", func ((k, _)) =
                    switch (k.split(#char '#').next()) {
                        case null "";
                        case (?s) s;
                    })
                .payload("currentRoom",          func ((_, s)) = s.currentRoom)
                .payload("highestRoomCompleted",  func ((_, s)) = s.highestRoomCompleted)
                .payload("totalBossRushRuns",     func ((_, s)) = s.totalBossRushRuns)
                .ownedBy("owner")
                .controllerOrScoped()
                .build(),
        ];
    });

};
