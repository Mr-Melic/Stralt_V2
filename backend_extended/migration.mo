import BaseToCore "BaseToCore";
import OrderedMap "mo:base/OrderedMap";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Text "mo:core/Text";

module {

  // --- Duplicate type definitions from backend_extended/main.mo ---

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

  type CharacterSlot = ?Character;

  type CharacterSlots = {
    slot1 : CharacterSlot;
    slot2 : CharacterSlot;
    slot3 : CharacterSlot;
  };

  type UserProfile = {
    name : Text;
  };

  // --- Old actor state shape (mo:base OrderedMap) ---

  type OldActor = {
    accessControlState : BaseToCore.OldAccessControlState;
    var userProfiles : OrderedMap.Map<Principal, UserProfile>;
    var characterSlots : OrderedMap.Map<Principal, CharacterSlots>;
  };

  // --- New actor state shape (mo:core Map) ---

  type NewActor = {
    accessControlState : BaseToCore.NewAccessControlState;
    userProfiles : Map.Map<Principal, UserProfile>;
    characterSlots : Map.Map<Principal, CharacterSlots>;
  };

  public func run(old : OldActor) : NewActor {
    {
      accessControlState = BaseToCore.migrateAccessControlState(old.accessControlState);
      userProfiles = BaseToCore.migrateOrderedMap(old.userProfiles);
      characterSlots = BaseToCore.migrateOrderedMap(old.characterSlots);
    };
  };
};
