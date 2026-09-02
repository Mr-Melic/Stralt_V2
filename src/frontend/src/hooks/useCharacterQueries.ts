import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deepNormalizeBigInts } from "../lib/normalizeBigInts";
import type {
  Character,
  CharacterSlots,
  UserProfile,
} from "../types/gameTypes";
import { clearBossRushForSlot } from "./bossRushProgress";
import { useActor } from "./useActor";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ActorAny = Record<string, any>;

/** Wraps a backend promise with a 10-second timeout so slow responses never hang UI */
function withTimeout<T>(promise: Promise<T>, ms = 10000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Query timed out after ${ms}ms`)), ms),
    ),
  ]);
}

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ["currentUserProfile"],
    queryFn: async () => {
      if (!actor) return null;
      try {
        const result = (await withTimeout(
          (actor as ActorAny).getCallerUserProfile(),
        )) as UserProfile | null | undefined;
        return result ?? null;
      } catch {
        return null;
      }
    },
    enabled: !!actor && !actorFetching,
    retry: 1,
    staleTime: 30000,
  });

  return {
    ...query,
    isLoading: actorFetching || (!!actor && query.isLoading),
    isFetched: !!actor && !actorFetching && (query.isFetched || query.isError),
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error("Actor not available");
      return (actor as ActorAny).saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
  });
}

export function useGetCharacterSlots() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<CharacterSlots>({
    queryKey: ["characterSlots"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      const result = await (actor as ActorAny).getCharacterSlots();
      const normalized = deepNormalizeBigInts(result as CharacterSlots);
      return {
        slot1: normalized.slot1 ?? null,
        slot2: normalized.slot2 ?? null,
        slot3: normalized.slot3 ?? null,
      };
    },
    enabled: !!actor && !actorFetching,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    staleTime: 0,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
  });
}

export function useGetCharacter(slot: number) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Character | null>({
    queryKey: ["character", slot],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      const result = await (actor as ActorAny).getCharacter(BigInt(slot));
      return deepNormalizeBigInts(result);
    },
    enabled: !!actor && !actorFetching,
    staleTime: 5000,
    gcTime: 30000,
  });
}

export function useCreateCharacter() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      slot,
      character,
    }: { slot: bigint; character: Character }) => {
      if (!actor) throw new Error("Actor not available");
      type BackendResult =
        | { __kind__: "ok"; ok: null }
        | { __kind__: "err"; err: string };
      const result: BackendResult = await (actor as ActorAny).createCharacter(
        slot,
        character,
      );
      if (result.__kind__ === "err")
        throw new Error(result.err || "Failed to create character");
      try {
        await clearBossRushForSlot(actor as ActorAny, slot);
      } catch {
        // Character exists; leftover currentRoom is also cleared on the canister
        // create/delete path after upgrade. Do not fail character creation.
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["characterSlots"] });
      queryClient.invalidateQueries({ queryKey: ["character"] });
    },
  });
}

export function useUpdateCharacter() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      slot,
      character,
    }: { slot: bigint; character: Character }) => {
      if (!actor) throw new Error("Actor not available");
      type BackendResult =
        | { __kind__: "ok"; ok: null }
        | { __kind__: "err"; err: string };
      const result: BackendResult = await (actor as ActorAny).updateCharacter(
        slot,
        character,
      );
      if (result.__kind__ === "err")
        throw new Error(result.err || "Failed to update character");
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["characterSlots"] });
      queryClient.invalidateQueries({ queryKey: ["character"] });
    },
  });
}

export function useDeleteCharacter() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (slot: bigint) => {
      if (!actor) throw new Error("Actor not available");
      type BackendResult =
        | { __kind__: "ok"; ok: null }
        | { __kind__: "err"; err: string };
      const result: BackendResult = await (actor as ActorAny).deleteCharacter(
        slot,
      );
      if (result.__kind__ === "err")
        throw new Error(result.err || "Failed to delete character");
      try {
        await clearBossRushForSlot(actor as ActorAny, slot);
      } catch {
        // Slot is already empty; leftover currentRoom must not block delete.
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["characterSlots"] });
      queryClient.invalidateQueries({ queryKey: ["character"] });
    },
  });
}

export function useRenameCharacter() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      slot,
      newName,
    }: { slot: bigint; newName: string }) => {
      if (!actor) throw new Error("Actor not available");
      return (actor as ActorAny).renameCharacter(slot, newName);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["characterSlots"] });
      queryClient.invalidateQueries({ queryKey: ["character"] });
    },
  });
}

export function useBackendStatus() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ["backend-status"],
    queryFn: async () => {
      if (!actor) return { status: "disconnected" };
      return { status: "connected" };
    },
    enabled: !!actor && !isFetching,
    staleTime: 60000,
  });
}
