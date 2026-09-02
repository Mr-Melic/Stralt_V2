import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface Character {
  'rotation' : bigint,
  'pieceType' : string,
  'name' : string,
  'level' : bigint,
  'experience' : bigint,
  'stats' : CharacterStats,
  'colors' : Array<string>,
  'pixelPattern' : string,
}
export type CharacterSlot = [] | [Character];
export interface CharacterSlots {
  'slot1' : CharacterSlot,
  'slot2' : CharacterSlot,
  'slot3' : CharacterSlot,
}
export interface CharacterStats {
  'ap' : bigint,
  'hp' : bigint,
  'mp' : bigint,
  'sp' : bigint,
  'sr' : bigint,
  'wp' : bigint,
  'wr' : bigint,
  'atk' : bigint,
  'chc' : bigint,
  'res' : bigint,
  'scp' : bigint,
  'init' : bigint,
  'resilience' : bigint,
  'evasion' : bigint,
}
export interface UserProfile { 'name' : string }
export type UserRole = { 'admin' : null } |
  { 'user' : null } |
  { 'guest' : null };
export interface _SERVICE {
  'assignCallerUserRole' : ActorMethod<[Principal, UserRole], undefined>,
  'createCharacter' : ActorMethod<[bigint, Character], undefined>,
  'deleteCharacter' : ActorMethod<[bigint], undefined>,
  'getAllCharacters' : ActorMethod<[], Array<[Principal, CharacterSlots]>>,
  'getCallerUserProfile' : ActorMethod<[], [] | [UserProfile]>,
  'getCallerUserRole' : ActorMethod<[], UserRole>,
  'getCharacter' : ActorMethod<[bigint], CharacterSlot>,
  'getCharacterSlots' : ActorMethod<[], CharacterSlots>,
  'getUserProfile' : ActorMethod<[Principal], [] | [UserProfile]>,
  'initializeAccessControl' : ActorMethod<[], undefined>,
  'isCallerAdmin' : ActorMethod<[], boolean>,
  'saveCallerUserProfile' : ActorMethod<[UserProfile], undefined>,
  'updateCharacter' : ActorMethod<[bigint, Character], undefined>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
