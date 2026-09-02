import Map "mo:core/Map";
import Principal "mo:core/Principal";

module {

  // Introduce the GameKey shop stables (PR #258 product) on top of the
  // 20260831 tail that Caffeine deployed on 2026-08-31 (no GameKey).
  //
  // OldActor = {} : this step requires nothing from the previous version, so
  // moc's compatibility check (`pre` in mo_types/type.ml) only demands the 42
  // fields the deployed signature really has, and the runtime merges the five
  // produced fields into the carried state. A canister whose latest applied
  // migration is already `20260901_000000` (fresh install of a #259..#309
  // build) is at the head of the chain and nothing runs.
  //
  // FROZEN once Caffeine has applied it. Do not add fields here — the next
  // stable goes in a new 20260902+ file with `OldActor = {}`.

  type GameKeyRequest = {
    id : Text;
    userPrincipal : Principal;
    email : Text;
    emailConsent : Bool;
    hintedEuroCents : Nat;
    timestamp : Int;
    status : Text;
    dokaAmount : Nat;
    emailed : Bool;
    approvedAt : Int;
    redeemedAt : Int;
    redeemedBy : Text;
  };

  type GameKeyLedgerEntry = {
    requestId : Text;
    dokaAmount : Nat;
    redeemed : Bool;
    redeemedBy : Text;
  };

  type OldActor = {};

  type NewActor = {
    gameKeyRequests : Map.Map<Text, GameKeyRequest>;
    gameKeyLedger : Map.Map<Text, GameKeyLedgerEntry>;
    gameKeyReveals : Map.Map<Text, Text>;
    lastGameKeyRequestAt : Map.Map<Principal, Int>;
    var nextGameKeyRequestId : Nat;
  };

  public func migration(_old : OldActor) : NewActor {
    {
      gameKeyRequests = Map.empty();
      gameKeyLedger = Map.empty();
      gameKeyReveals = Map.empty();
      lastGameKeyRequestAt = Map.empty();
      var nextGameKeyRequestId = 0;
    };
  };
};
