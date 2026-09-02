import Cycles "mo:base/ExperimentalCycles";
import Nat "mo:base/Nat";
import AccessControl "mo:caffeineai-authorization/access-control";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Migration "migration";

(with migration = Migration.run)
actor Main {

    let accessControlState = AccessControl.initState();
    include MixinAuthorization(accessControlState);

    public type UserProfile = {
        name : Text;
    };

    let userProfiles = Map.empty<Principal, UserProfile>();

    public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
        userProfiles.get(caller);
    };

    public query func getUserProfile(user : Principal) : async ?UserProfile {
        userProfiles.get(user);
    };

    public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
        userProfiles.add(caller, profile);
    };

    // Character management system
    type Character = {
        name : Text;
        pieceType : Text;
        level : Nat;
        experience : Nat;
        stats : CharacterStats;
        pixelPattern : Text;
        colors : [Text];
        rotation : Nat;
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
        wr : Nat;
        sr : Nat;
        scp : Nat;
        wp : Nat;
        resilience : Nat;
        chc : Nat;
    };

    type CharacterSlot = ?Character;

    type CharacterSlots = {
        slot1 : CharacterSlot;
        slot2 : CharacterSlot;
        slot3 : CharacterSlot;
    };

    let characterSlots = Map.empty<Principal, CharacterSlots>();

    public shared ({ caller }) func createCharacter(slot : Nat, character : Character) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Runtime.trap("Unauthorized: Only users can create characters");
        };

        if (slot < 1 or slot > 3) {
            Runtime.trap("Invalid slot number");
        };

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

        let updatedSlots = switch (slot) {
            case 1 {
                if (existingSlots.slot1 != null) {
                    Runtime.trap("Slot 1 already occupied");
                };
                { existingSlots with slot1 = ?character };
            };
            case 2 {
                if (existingSlots.slot2 != null) {
                    Runtime.trap("Slot 2 already occupied");
                };
                { existingSlots with slot2 = ?character };
            };
            case 3 {
                if (existingSlots.slot3 != null) {
                    Runtime.trap("Slot 3 already occupied");
                };
                { existingSlots with slot3 = ?character };
            };
            case _ { Runtime.trap("Invalid slot number") };
        };

        characterSlots.add(caller, updatedSlots);
    };

    public shared ({ caller }) func updateCharacter(slot : Nat, character : Character) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Runtime.trap("Unauthorized: Only users can update characters");
        };

        if (slot < 1 or slot > 3) {
            Runtime.trap("Invalid slot number");
        };

        let existingSlots = switch (characterSlots.get(caller)) {
            case null { Runtime.trap("No characters found for user") };
            case (?slots) { slots };
        };

        let updatedSlots = switch (slot) {
            case 1 {
                if (existingSlots.slot1 == null) {
                    Runtime.trap("Slot 1 is empty");
                };
                { existingSlots with slot1 = ?character };
            };
            case 2 {
                if (existingSlots.slot2 == null) {
                    Runtime.trap("Slot 2 is empty");
                };
                { existingSlots with slot2 = ?character };
            };
            case 3 {
                if (existingSlots.slot3 == null) {
                    Runtime.trap("Slot 3 is empty");
                };
                { existingSlots with slot3 = ?character };
            };
            case _ { Runtime.trap("Invalid slot number") };
        };

        characterSlots.add(caller, updatedSlots);
    };

    public shared ({ caller }) func deleteCharacter(slot : Nat) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Runtime.trap("Unauthorized: Only users can delete characters");
        };

        if (slot < 1 or slot > 3) {
            Runtime.trap("Invalid slot number");
        };

        let existingSlots = switch (characterSlots.get(caller)) {
            case null { Runtime.trap("No characters found for user") };
            case (?slots) { slots };
        };

        let updatedSlots = switch (slot) {
            case 1 {
                if (existingSlots.slot1 == null) {
                    Runtime.trap("Slot 1 is already empty");
                };
                { existingSlots with slot1 = null };
            };
            case 2 {
                if (existingSlots.slot2 == null) {
                    Runtime.trap("Slot 2 is already empty");
                };
                { existingSlots with slot2 = null };
            };
            case 3 {
                if (existingSlots.slot3 == null) {
                    Runtime.trap("Slot 3 is already empty");
                };
                { existingSlots with slot3 = null };
            };
            case _ { Runtime.trap("Invalid slot number") };
        };

        characterSlots.add(caller, updatedSlots);
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

    public query func getAllCharacters() : async [(Principal, CharacterSlots)] {
        characterSlots.entries().toArray();
    };

type __CAFFEINE_STORAGE_RefillInformation = {
    proposed_top_up_amount: ?Nat;
};

type __CAFFEINE_STORAGE_RefillResult = {
    success: ?Bool;
    topped_up_amount: ?Nat;
};

    public shared (msg) func __CAFFEINE_STORAGE_refillCashier(refill_information: ?__CAFFEINE_STORAGE_RefillInformation) : async __CAFFEINE_STORAGE_RefillResult {
    let cashier = Principal.fromText("72ch2-fiaaa-aaaar-qbsvq-cai");

    assert (cashier == msg.caller);

    let current_balance = Cycles.balance();
    let reserved_cycles : Nat = 400_000_000_000;

    let current_free_cycles_count : Nat = Nat.sub(current_balance, reserved_cycles);

    let cycles_to_send : Nat = switch (refill_information) {
        case null { current_free_cycles_count };
        case (?info) {
            switch (info.proposed_top_up_amount) {
                case null { current_free_cycles_count };
                case (?proposed) { Nat.min(proposed, current_free_cycles_count) };
            }
        };
    };

    let target_canister = actor(Principal.toText(cashier)) : actor {
        account_top_up_v1 : ({ account : Principal }) -> async ();
    };

    let current_principal = Principal.fromActor(Main);

    await (with cycles = cycles_to_send) target_canister.account_top_up_v1({ account = current_principal });

    return {
        success = ?true;
        topped_up_amount = ?cycles_to_send;
    };
};
};
