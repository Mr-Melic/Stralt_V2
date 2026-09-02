import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import type {
  AchievementConfig,
  AchievementProgress,
  AdminGameConfig,
  MapModifierConfig,
} from "../types/gameTypes";
import { assertAdminCmdOk } from "../utils/adminContract";
import {
  validateAchievementConfig,
  validateAssignRole,
  validateEnemyName,
  validateMapModifierChance,
} from "../utils/adminSafety";
import { normalizeCallerDokaBalance } from "../utils/dokaBalanceQuery";
import { fetchPlayerAchievements } from "../utils/playerAchievements";
import { useActor } from "./useActor";
import { useInternetIdentity } from "./useInternetIdentity";

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

// ── User role / admin auth (II-principal based) ──────────────────────────────

export function useGetUserRole() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<string>({
    queryKey: ["userRole"],
    queryFn: async () => {
      if (!actor) return "user";
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw = (await withTimeout<unknown>(
          (actor as ActorAny).getUserRole(),
        )) as unknown;
        // Normalize: backend may return {__kind__: "admin"} or "admin" string
        if (typeof raw === "string") return raw;
        if (raw !== null && typeof raw === "object") {
          const keys = Object.keys(raw as object);
          if (keys.length > 0) return keys[0]; // "admin" or "user"
        }
        return "user";
      } catch {
        return "user";
      }
    },
    enabled: !!actor && !actorFetching,
    staleTime: 60000,
    gcTime: 300000,
  });
}

export function useIsCallerAdmin() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ["isCallerAdmin"],
    queryFn: async () => {
      if (!actor) return false;
      try {
        return await withTimeout<boolean>((actor as ActorAny).isCallerAdmin());
      } catch {
        return false;
      }
    },
    enabled: !!actor && !actorFetching,
    staleTime: 60000,
    gcTime: 300000,
  });
}

export function useAssignUserRole() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      principalId,
      role,
    }: { principalId: string; role: string }) => {
      if (!actor) throw new Error("Actor not available");
      const { Principal } = await import("@icp-sdk/core/principal");
      const roleErr = validateAssignRole(role);
      if (roleErr) throw new Error(roleErr);
      // Canonical canister method is assignUserRole(target, role: Text).
      // assignCallerUserRole exists only on stale Candid / the mock.
      const result = await (actor as ActorAny).assignUserRole(
        Principal.fromText(principalId),
        role,
      );
      assertAdminCmdOk(result, "assignUserRole");
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userRole"] });
      queryClient.invalidateQueries({ queryKey: ["isCallerAdmin"] });
    },
  });
}

// ── Doka balance ─────────────────────────────────────────────────────────────

export function useGetCallerDokaBalance() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<number>({
    queryKey: ["callerDokaBalance"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      // Do not catch timeouts / replica errors here. Returning 0 on failure
      // made React Query treat the miss as a successful empty wallet, and
      // GameFlow then overwrote the session cache. A later death persist
      // would write dokaBalances = 0.
      const raw = await withTimeout((actor as ActorAny).getCallerDokaBalance());
      return normalizeCallerDokaBalance(raw);
    },
    enabled: !!actor && !actorFetching,
    staleTime: 0,
    gcTime: 60000,
  });
}

// ── Map modifiers ────────────────────────────────────────────────────────────

export function useGetMapModifiers() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<MapModifierConfig[]>({
    queryKey: ["mapModifiers"],
    queryFn: async () => {
      if (!actor) return [];
      try {
        const raw: MapModifierConfig[] = await withTimeout(
          (actor as ActorAny).getMapModifiers(),
        );
        return deepNormalizeBigInts(raw);
      } catch {
        return [];
      }
    },
    enabled: !!actor && !actorFetching,
    staleTime: 30000,
    gcTime: 120000,
  });
}

export function useAdminSetMapModifier() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: MapModifierConfig) => {
      if (!actor) throw new Error("Actor not available");
      const result = await (actor as ActorAny).adminSetMapModifier(config);
      assertAdminCmdOk(result, "adminSetMapModifier");
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mapModifiers"] });
    },
  });
}

export function useAdminDeleteMapModifier() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error("Actor not available");
      const result = await (actor as ActorAny).adminDeleteMapModifier(id);
      assertAdminCmdOk(result, "adminDeleteMapModifier");
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mapModifiers"] });
    },
  });
}

export function useAdminSetMapModifierChance() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, chance }: { id: string; chance: number }) => {
      if (!actor) throw new Error("Actor not available");
      const chanceErr = validateMapModifierChance(id, chance);
      if (chanceErr) throw new Error(chanceErr);
      const result = await (actor as ActorAny).adminSetMapModifierChance(
        id,
        BigInt(Math.round(chance)),
      );
      assertAdminCmdOk(result, "adminSetMapModifierChance");
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mapModifiers"] });
    },
  });
}

// ── Game config ──────────────────────────────────────────────────────────────

export function useGetGameConfig() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<AdminGameConfig>({
    queryKey: ["gameConfig"],
    queryFn: async () => {
      if (!actor)
        return {
          leaderBoostPercent: 10,
          dokaSpawnChance: 40,
          dokaSpawnBaseValue: 5,
        };
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw = (await withTimeout(
          (actor as ActorAny).getGameConfig(),
        )) as any;
        return {
          leaderBoostPercent: Number(raw.leaderBoostPercent ?? 10),
          dokaSpawnChance: Number(raw.dokaSpawnChance ?? 40),
          dokaSpawnBaseValue: Number(raw.dokaSpawnBaseValue ?? 5),
        };
      } catch {
        return {
          leaderBoostPercent: 10,
          dokaSpawnChance: 40,
          dokaSpawnBaseValue: 5,
        };
      }
    },
    enabled: !!actor && !actorFetching,
    staleTime: 30000,
    gcTime: 120000,
  });
}

export function useAdminSetGameConfig() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: AdminGameConfig) => {
      if (!actor) throw new Error("Actor not available");
      const result = await (actor as ActorAny).adminSetGameConfig({
        leaderBoostPercent: BigInt(Math.round(config.leaderBoostPercent)),
        dokaSpawnChance: BigInt(Math.round(config.dokaSpawnChance)),
        dokaSpawnBaseValue: BigInt(Math.round(config.dokaSpawnBaseValue)),
      });
      assertAdminCmdOk(result, "adminSetGameConfig");
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gameConfig"] });
    },
  });
}

// ── Achievements ─────────────────────────────────────────────────────────────

export function useGetAchievementConfigs() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<AchievementConfig[]>({
    queryKey: ["achievementConfigs"],
    queryFn: async () => {
      if (!actor) return [];
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw = (await withTimeout(
          (actor as ActorAny).getAchievementConfigs(),
        )) as any;
        return deepNormalizeBigInts(
          (raw as AchievementConfig[]).map((a) => ({
            ...a,
            dokaReward: Number(a.dokaReward),
          })),
        );
      } catch {
        return [];
      }
    },
    enabled: !!actor && !actorFetching,
    staleTime: 30000,
    gcTime: 120000,
  });
}

export function useGetPlayerAchievements() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();
  const player = identity?.getPrincipal?.() ?? null;

  return useQuery<AchievementProgress[]>({
    queryKey: ["playerAchievements"],
    queryFn: async () => {
      if (!actor || !player) return [];
      try {
        const mapped = await withTimeout(
          fetchPlayerAchievements(actor, player),
        );
        // [FEATS] LIST — log the refetched claimed flag per achievement so
        // the chain shows the post-claim/unlock state from the backend.
        // PERF-2026-09-02-050: keep this off the production hot path. The
        // hook is subscribed inside WorldExploration; a focus refetch with
        // staleTime 0 re-rendered the whole world tree and allocated a
        // claimed[] map on every tab focus.
        if (import.meta.env.DEV) {
          console.log("[FEATS] LIST", {
            count: mapped.length,
            claimed: mapped.map((p) => ({
              achievementId: p.achievementId,
              claimed: p.claimed,
            })),
          });
        }
        return mapped;
      } catch {
        return [];
      }
    },
    enabled: !!actor && !actorFetching && !!player,
    // PERF-2026-09-02-050: unlock/claim mutations already invalidate this key.
    // Do not refetch on every window focus while the world canvas is mounted.
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    gcTime: 60000,
  });
}

export function useMarkAchievementUnlocked() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (achievementId: string) => {
      if (!actor) throw new Error("Actor not available");
      // [FEATS] UNLOCK — log the persist write (achievementId) and the
      // verbatim backend response from markAchievementUnlocked.
      const res = await (actor as ActorAny).markAchievementUnlocked(
        achievementId,
      );
      console.log("[FEATS] UNLOCK", {
        achievementId,
        response: res,
      });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playerAchievements"] });
    },
  });
}

export function useClaimAchievementReward() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (achievementId: string) => {
      if (!actor) throw new Error("Actor not available");
      return (actor as ActorAny).claimAchievementReward(achievementId);
    },
    onSuccess: (result) => {
      if (result && typeof result === "object" && "__kind__" in result) {
        if (result.__kind__ === "ok") {
          console.log("[FEATS] CLAIM", { ok: result.ok });
          const oldBalance = queryClient.getQueryData(["callerDokaBalance"]);
          console.log("[FEATS] CREDIT", {
            old: oldBalance,
            new: Number(result.ok),
          });
          queryClient.invalidateQueries({ queryKey: ["callerDokaBalance"] });
          queryClient.invalidateQueries({ queryKey: ["playerAchievements"] });
        } else if (result.__kind__ === "err") {
          console.log("[FEATS] CLAIM", { err: result.err });
        }
      } else {
        queryClient.invalidateQueries({ queryKey: ["callerDokaBalance"] });
        queryClient.invalidateQueries({ queryKey: ["playerAchievements"] });
      }
    },
  });
}

export function useAdminSetAchievementConfig() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: AchievementConfig) => {
      if (!actor) throw new Error("Actor not available");
      const guardErr = validateAchievementConfig(config);
      if (guardErr) throw new Error(guardErr);
      const result = await (actor as ActorAny).adminSetAchievementConfig({
        ...config,
        dokaReward: BigInt(Math.round(config.dokaReward)),
      });
      assertAdminCmdOk(result, "adminSetAchievementConfig");
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["achievementConfigs"] });
    },
  });
}

export function useAdminDeleteAchievementConfig() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error("Actor not available");
      const result = await (actor as ActorAny).adminDeleteAchievementConfig(id);
      assertAdminCmdOk(result, "adminDeleteAchievementConfig");
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["achievementConfigs"] });
    },
  });
}

// ── Enemy Names ───────────────────────────────────────────────────────────────

export function useGetEnemyNames() {
  const { actor, isFetching: actorFetching } = useActor();
  return useQuery<string[]>({
    queryKey: ["enemyNames"],
    queryFn: async () => {
      if (!actor) return [];
      const result = await withTimeout((actor as ActorAny).getEnemyNames());
      return Array.isArray(result) ? (result as string[]) : [];
    },
    enabled: !!actor && !actorFetching,
    staleTime: 60000,
    gcTime: 300000,
  });
}

export function useInitDefaultNames() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return (actor as ActorAny).initDefaultNames();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enemyNames"] });
    },
  });
}

export function useAdminAddEnemyName() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      if (!actor) throw new Error("Actor not available");
      const nameErr = validateEnemyName(name);
      if (nameErr) throw new Error(nameErr);
      return (actor as ActorAny).addEnemyName(name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enemyNames"] });
    },
  });
}

export function useAdminDeleteEnemyName() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      if (!actor) throw new Error("Actor not available");
      return (actor as ActorAny).deleteEnemyName(name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enemyNames"] });
    },
  });
}

// ── Achievement tracker hook (M2/M4/M11) ─────────────────────────────────────
// ── Boss config hooks (localStorage; canister endpoints exist, schemas differ) ─

import { deepNormalizeBigInts } from "../lib/normalizeBigInts";
import { DEFAULT_BOSS_CONFIGS } from "../types/bossDefaults";
import type { BossConfig } from "../types/bossTypes";

const BOSS_CONFIG_KEY = "pbv_boss_configs";

function loadBossConfigsFromStorage(): BossConfig[] {
  try {
    const raw = localStorage.getItem(BOSS_CONFIG_KEY);
    if (raw) return JSON.parse(raw) as BossConfig[];
  } catch {
    /* ignore */
  }
  return DEFAULT_BOSS_CONFIGS;
}

function saveBossConfigsToStorage(configs: BossConfig[]): void {
  try {
    localStorage.setItem(BOSS_CONFIG_KEY, JSON.stringify(configs));
  } catch {
    /* ignore */
  }
}

export function useSetBossConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (config: BossConfig) => {
      const all = loadBossConfigsFromStorage();
      const idx = all.findIndex((b) => b.id === config.id);
      if (idx >= 0) all[idx] = config;
      else all.push(config);
      saveBossConfigsToStorage(all);
      return config;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bossConfigs"] });
    },
  });
}

export function useDeleteBossConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const all = loadBossConfigsFromStorage();
      saveBossConfigsToStorage(all.filter((b) => b.id !== id));
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bossConfigs"] });
    },
  });
}

export function useSetBossPortalAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      bossId,
      _mapId,
    }: { bossId: string; _mapId?: string }) => {
      // Portal assignments are resolved at map generation time;
      // this mutation simply invalidates so the map generator re-reads fresh configs.
      queryClient.invalidateQueries({ queryKey: ["bossConfigs"] });
      return bossId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bossConfigs"] });
    },
  });
}

export type CheckAchievementFn = (condition: string, inBattle: boolean) => void;

export function useDokaAchievementTracker(
  checkAndFireAchievement: CheckAchievementFn,
): (balance: number, inBattle: boolean) => void {
  const { data: achievementConfigs } = useGetAchievementConfigs();
  const { data: playerAchievements } = useGetPlayerAchievements();

  const configsRef = useRef<AchievementConfig[]>([]);
  const progressRef = useRef<AchievementProgress[]>([]);
  useEffect(() => {
    if (achievementConfigs && achievementConfigs.length > 0)
      configsRef.current = achievementConfigs;
  }, [achievementConfigs]);
  useEffect(() => {
    if (playerAchievements) progressRef.current = playerAchievements;
  }, [playerAchievements]);

  const hasInitializedRef = useRef(false);
  const prevDokaRef = useRef<number>(-1);

  return useCallback(
    (dokaBalance: number, inBattle: boolean) => {
      if (configsRef.current.length === 0) return;
      if (!hasInitializedRef.current) {
        prevDokaRef.current = dokaBalance;
        hasInitializedRef.current = true;
        return;
      }
      if (dokaBalance === prevDokaRef.current) return;
      prevDokaRef.current = dokaBalance;

      const dokaThresholds = configsRef.current
        .filter(
          (a) =>
            a.active &&
            (a.condition === "doka_1000" || a.condition === "doka_10000"),
        )
        .map((a) => (a.condition === "doka_1000" ? 1000 : 10000));

      if (dokaThresholds.length === 0) return;
      const minThreshold = Math.min(...dokaThresholds);
      if (dokaBalance < minThreshold) return;

      if (dokaBalance >= 1000) checkAndFireAchievement("doka_1000", inBattle);
      if (dokaBalance >= 10000) checkAndFireAchievement("doka_10000", inBattle);
    },
    [checkAndFireAchievement],
  );
}
