import { useMutation, useQuery } from "@tanstack/react-query";
import { useActor } from "./useActor";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ActorAny = Record<string, any>;

export interface LeaderboardEntry {
  principalId: string;
  playerName: string;
  level: number;
  killCount: number;
  achievementsCompleted: number;
}

export function useGetLeaderboard() {
  const { actor, isFetching: actorFetching } = useActor();
  return useQuery<LeaderboardEntry[]>({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      if (!actor) return [];
      const result = await (actor as ActorAny).getLeaderboard();
      return (
        result as Array<{
          principalId: string;
          playerName: string;
          level: bigint;
          killCount: bigint;
          achievementsCompleted: bigint;
        }>
      ).map((entry) => ({
        principalId: entry.principalId,
        playerName: entry.playerName,
        level: Number(entry.level),
        killCount: Number(entry.killCount),
        achievementsCompleted: Number(entry.achievementsCompleted),
      }));
    },
    enabled: !!actor && !actorFetching,
    staleTime: 30_000,
  });
}

export function useSaveKillCount() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async ({ slot, kills }: { slot: number; kills: number }) => {
      if (!actor) return;
      await (actor as ActorAny).saveKillCount(BigInt(slot), BigInt(kills));
    },
  });
}
