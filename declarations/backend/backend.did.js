export const idlFactory = ({ IDL }) => {
  const UserRole = IDL.Variant({
    'admin' : IDL.Null,
    'user' : IDL.Null,
    'guest' : IDL.Null,
  });
  const CharacterStats = IDL.Record({
    'ap' : IDL.Nat,
    'hp' : IDL.Nat,
    'mp' : IDL.Nat,
    'sp' : IDL.Nat,
    'sr' : IDL.Nat,
    'wp' : IDL.Nat,
    'wr' : IDL.Nat,
    'atk' : IDL.Nat,
    'chc' : IDL.Nat,
    'res' : IDL.Nat,
    'scp' : IDL.Nat,
    'init' : IDL.Nat,
    'resilience' : IDL.Nat,
    'evasion' : IDL.Nat,
  });
  const Character = IDL.Record({
    'rotation' : IDL.Nat,
    'pieceType' : IDL.Text,
    'name' : IDL.Text,
    'level' : IDL.Nat,
    'experience' : IDL.Nat,
    'stats' : CharacterStats,
    'colors' : IDL.Vec(IDL.Text),
    'pixelPattern' : IDL.Text,
  });
  const CharacterSlot = IDL.Opt(Character);
  const CharacterSlots = IDL.Record({
    'slot1' : CharacterSlot,
    'slot2' : CharacterSlot,
    'slot3' : CharacterSlot,
  });
  const UserProfile = IDL.Record({ 'name' : IDL.Text });
  return IDL.Service({
    'assignCallerUserRole' : IDL.Func([IDL.Principal, UserRole], [], []),
    'createCharacter' : IDL.Func([IDL.Nat, Character], [], []),
    'deleteCharacter' : IDL.Func([IDL.Nat], [], []),
    'getAllCharacters' : IDL.Func(
        [],
        [IDL.Vec(IDL.Tuple(IDL.Principal, CharacterSlots))],
        ['query'],
      ),
    'getCallerUserProfile' : IDL.Func([], [IDL.Opt(UserProfile)], ['query']),
    'getCallerUserRole' : IDL.Func([], [UserRole], ['query']),
    'getCharacter' : IDL.Func([IDL.Nat], [CharacterSlot], ['query']),
    'getCharacterSlots' : IDL.Func([], [CharacterSlots], ['query']),
    'getUserProfile' : IDL.Func(
        [IDL.Principal],
        [IDL.Opt(UserProfile)],
        ['query'],
      ),
    'initializeAccessControl' : IDL.Func([], [], []),
    'isCallerAdmin' : IDL.Func([], [IDL.Bool], ['query']),
    'saveCallerUserProfile' : IDL.Func([UserProfile], [], []),
    'updateCharacter' : IDL.Func([IDL.Nat, Character], [], []),
  });
};
export const init = ({ IDL }) => { return []; };
