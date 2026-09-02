import Map "mo:core/Map";
import AccessControl "mo:caffeineai-authorization/access-control";
import AdminLib "../lib/admin";
import Types "../types/admin";

/// Public API mixin for the admin domain.
/// Receives the four config stores and the shared access-control state as injected parameters.
mixin (
    enemyStore        : Map.Map<Text, Types.EnemyConfig>,
    regionStore       : Map.Map<Text, Types.RegionConfig>,
    spriteStore       : Map.Map<Text, Types.PlayerSpriteConfig>,
    spellStore        : Map.Map<Text, Types.SpellConfig>,
    accessControlState : AccessControl.State,
) {

    // ── Enemy configs ────────────────────────────────────────────────────────

    public shared ({ caller }) func adminSetEnemyConfig(
        config : Types.EnemyConfig,
    ) : async Types.CmdResult {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            return #err("Unauthorized: admin only");
        };
        AdminLib.setEnemyConfig(enemyStore, config);
    };

    public shared ({ caller }) func adminDeleteEnemyConfig(
        id : Text,
    ) : async Types.CmdResult {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            return #err("Unauthorized: admin only");
        };
        AdminLib.deleteEnemyConfig(enemyStore, id);
    };

    public query func getEnemyConfigs() : async [Types.EnemyConfig] {
        AdminLib.getEnemyConfigs(enemyStore);
    };

    // ── Region configs ───────────────────────────────────────────────────────

    public shared ({ caller }) func adminSetRegionConfig(
        config : Types.RegionConfig,
    ) : async Types.CmdResult {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            return #err("Unauthorized: admin only");
        };
        AdminLib.setRegionConfig(regionStore, config);
    };

    public shared ({ caller }) func adminDeleteRegionConfig(
        id : Text,
    ) : async Types.CmdResult {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            return #err("Unauthorized: admin only");
        };
        AdminLib.deleteRegionConfig(regionStore, id);
    };

    public query func getRegionConfigs() : async [Types.RegionConfig] {
        AdminLib.getRegionConfigs(regionStore);
    };

    // ── Player sprite configs ────────────────────────────────────────────────

    public shared ({ caller }) func adminSetPlayerSpriteConfig(
        config : Types.PlayerSpriteConfig,
    ) : async Types.CmdResult {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            return #err("Unauthorized: admin only");
        };
        AdminLib.setPlayerSpriteConfig(spriteStore, config);
    };

    public query func getPlayerSpriteConfigs() : async [Types.PlayerSpriteConfig] {
        AdminLib.getPlayerSpriteConfigs(spriteStore);
    };

    // ── Admin password verification ──────────────────────────────────────────

    // adminVerifyPassword is implemented directly in main.mo using the stable
    // adminSecret variable. The mixin does not expose a duplicate endpoint.

    // ── Spell config API ─────────────────────────────────────────────────────

    public shared ({ caller }) func adminSetSpellConfig(
        config : Types.SpellConfig,
    ) : async Types.CmdResult {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            return #err("Unauthorized: admin only");
        };
        AdminLib.setSpellConfig(spellStore, config);
    };

    public shared ({ caller }) func adminDeleteSpellConfig(
        id : Text,
    ) : async Types.CmdResult {
        if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
            return #err("Unauthorized: admin only");
        };
        AdminLib.deleteSpellConfig(spellStore, id);
    };

    public query func getSpellConfigs() : async [Types.SpellConfig] {
        AdminLib.getSpellConfigs(spellStore);
    };
};
