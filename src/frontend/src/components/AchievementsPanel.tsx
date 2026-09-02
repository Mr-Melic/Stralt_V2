import { useQueryClient } from "@tanstack/react-query";
import { Trophy, X } from "lucide-react";
import type React from "react";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  useClaimAchievementReward,
  useGetAchievementConfigs,
  useGetPlayerAchievements,
} from "../hooks/useQueries";
import type {
  AchievementConfig,
  AchievementProgress,
} from "../types/gameTypes";
import {
  beginAchievementClaim,
  shouldInvalidateCallerDokaAfterClaim,
  shouldRollbackClaimFailure,
} from "../utils/achievementReward";

interface AchievementsPanelProps {
  userId?: string;
  dokaBalance: number;
  onDokaBalanceChange: (newBalance: number) => void;
  isOpen?: boolean;
  onClose?: () => void;
  /**
   * When provided, the claim runs on the WorldExploration persist lock so a
   * later saveBattleStats heal/death cannot persist the pre-claim wallet.
   */
  persistClaim?: (
    achievementId: string,
  ) => Promise<{ ok: number } | { err: string }>;
}

const AchievementsPanel: React.FC<AchievementsPanelProps> = ({
  userId: _userId,
  dokaBalance,
  onDokaBalanceChange,
  isOpen,
  onClose,
  persistClaim,
}) => {
  const queryClient = useQueryClient();
  const { data: configs = [], isLoading: configsLoading } =
    useGetAchievementConfigs();
  const { data: progress = [], isLoading: progressLoading } =
    useGetPlayerAchievements();
  const claimMut = useClaimAchievementReward();
  const [persistClaimPending, setPersistClaimPending] = useState(false);
  const claimingIdsRef = useRef<Set<string>>(new Set());
  const claimedOkIdsRef = useRef<Set<string>>(new Set());

  const progressMap = useMemo(() => {
    const map = new Map<string, { unlocked: boolean; claimed: boolean }>();
    for (const p of progress) {
      map.set(p.achievementId, { unlocked: p.unlocked, claimed: p.claimed });
    }
    return map;
  }, [progress]);

  const getProgress = useCallback(
    (id: string) => progressMap.get(id),
    [progressMap],
  );

  // Rollback helper: undo any stale optimistic claimed=true flip for the given
  // achievement id and force a refetch of the authoritative backend state.
  // Used both when the backend returns #err (e.g. "not yet unlocked") and when
  // the mutation fails at the transport layer (onError). Without this, a stale
  // cache entry could keep the row showing "Claimed" even though the backend
  // rejected the claim, so the UI would lie about persisted state.
  const rollbackClaimed = useCallback(
    (achievementId: string) => {
      queryClient.setQueryData(
        ["playerAchievements"],
        (old: AchievementProgress[] | undefined) =>
          old?.map((p) =>
            p.achievementId === achievementId ? { ...p, claimed: false } : p,
          ),
      );
      queryClient.invalidateQueries({ queryKey: ["playerAchievements"] });
      queryClient.invalidateQueries({ queryKey: ["callerDokaBalance"] });
    },
    [queryClient],
  );

  const applyClaimResult = useCallback(
    (
      achievement: AchievementConfig,
      result: { ok?: unknown; err?: unknown },
    ) => {
      if ("ok" in result && result.ok != null && result.err == null) {
        const granted = Number(result.ok);
        claimedOkIdsRef.current.add(achievement.id);
        // Optimistic update: flip claimed=true immediately so the UI
        // reflects the claim without waiting for the refetch to propagate.
        queryClient.setQueryData(
          ["playerAchievements"],
          (old: AchievementProgress[] | undefined) =>
            old?.map((p) =>
              p.achievementId === achievement.id ? { ...p, claimed: true } : p,
            ),
        );
        queryClient.invalidateQueries({ queryKey: ["playerAchievements"] });
        if (shouldInvalidateCallerDokaAfterClaim(Boolean(persistClaim))) {
          queryClient.invalidateQueries({ queryKey: ["callerDokaBalance"] });
        }
        // persistClaim already added the grant onto the live UI wallet.
        if (!persistClaim) {
          onDokaBalanceChange(dokaBalance + granted);
        }
        toast.success(`🏆 Claimed ${granted.toLocaleString()} Doka!`);
        return;
      }
      const err = String(result.err ?? "unknown error");
      if (
        shouldRollbackClaimFailure(
          err,
          claimedOkIdsRef.current.has(achievement.id),
        )
      ) {
        rollbackClaimed(achievement.id);
        toast.error(`Failed to claim reward: ${err}`);
        return;
      }
      queryClient.setQueryData(
        ["playerAchievements"],
        (old: AchievementProgress[] | undefined) =>
          old?.map((p) =>
            p.achievementId === achievement.id ? { ...p, claimed: true } : p,
          ),
      );
    },
    [
      dokaBalance,
      onDokaBalanceChange,
      persistClaim,
      queryClient,
      rollbackClaimed,
    ],
  );

  const handleClaim = useCallback(
    (achievement: AchievementConfig) => {
      // #107 referenced claimInFlightRef without declaring it. Use
      // beginAchievementClaim so persist and mutate share one in-flight set.
      if (!beginAchievementClaim(claimingIdsRef.current, achievement.id)) {
        return;
      }
      if (persistClaim) {
        setPersistClaimPending(true);
        void persistClaim(achievement.id)
          .then(
            (result) => applyClaimResult(achievement, result),
            (error: unknown) => {
              const msg =
                error instanceof Error ? error.message : "Network error";
              if (
                shouldRollbackClaimFailure(
                  msg,
                  claimedOkIdsRef.current.has(achievement.id),
                )
              ) {
                rollbackClaimed(achievement.id);
                toast.error(`Failed to claim reward: ${msg}`);
              }
            },
          )
          .finally(() => {
            claimingIdsRef.current.delete(achievement.id);
            setPersistClaimPending(false);
          });
        return;
      }
      claimMut.mutate(achievement.id, {
        onSuccess: (result) => applyClaimResult(achievement, result),
        onError: (error) => {
          rollbackClaimed(achievement.id);
          const msg = error instanceof Error ? error.message : "Network error";
          toast.error(`Failed to claim reward: ${msg}`);
        },
        onSettled: () => {
          claimingIdsRef.current.delete(achievement.id);
        },
      });
    },
    [applyClaimResult, claimMut, persistClaim, rollbackClaimed],
  );

  const activeConfigs = useMemo(
    () => configs.filter((cfg) => cfg.active),
    [configs],
  );

  if (!isOpen) return null;

  return (
    <div
      data-ocid="achievements.dialog"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9500,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose?.();
      }}
      aria-modal="true"
      aria-label="Achievements"
    >
      <div
        className="stone-frame"
        style={{
          width: "min(520px, 94vw)",
          maxHeight: "min(80vh, 80dvh)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div className="stone-header flex items-center justify-between px-5 py-3 shrink-0">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Trophy size={18} style={{ color: "#f0c44a" }} />
            <span className="stone-header-title" style={{ fontSize: 16 }}>
              Feats
            </span>
          </div>
          <button
            type="button"
            data-ocid="achievements.close_button"
            onClick={onClose}
            aria-label="Close achievements"
            className="stone-btn-slate stone-modal-close"
            style={{
              width: 30,
              height: 30,
              padding: 0,
              fontSize: 18,
              lineHeight: 1,
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div
          className="stone-well"
          style={{ overflowY: "auto", flex: 1, padding: 2 }}
        >
          {(configsLoading || progressLoading) && (
            <div
              data-ocid="achievements.loading_state"
              className="stone-well"
              style={{
                padding: 32,
                textAlign: "center",
                color: "#8a8090",
                fontSize: 13,
              }}
            >
              Loading achievements…
            </div>
          )}

          {!configsLoading &&
            !progressLoading &&
            activeConfigs.length === 0 && (
              <div
                data-ocid="achievements.empty_state"
                className="stone-well"
                style={{
                  padding: 32,
                  textAlign: "center",
                  color: "#8a8090",
                  fontSize: 13,
                }}
              >
                No achievements configured yet
              </div>
            )}

          {!configsLoading &&
            !progressLoading &&
            activeConfigs.map((cfg, i) => {
              const p = getProgress(cfg.id);
              const unlocked = p?.unlocked ?? false;
              const claimed = p?.claimed ?? false;

              return (
                <div
                  key={cfg.id}
                  data-ocid={`achievements.item.${i + 1}`}
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                    padding: "10px 14px",
                    borderBottom: "1px solid rgba(139,0,0,0.15)",
                    opacity: unlocked ? 1 : 0.5,
                  }}
                >
                  {/* Icon */}
                  <div
                    style={{
                      fontSize: 22,
                      flexShrink: 0,
                      filter: unlocked
                        ? "drop-shadow(0 0 6px rgba(240,192,64,0.6))"
                        : "grayscale(1)",
                    }}
                  >
                    {claimed ? "✅" : unlocked ? "🏆" : "🔒"}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        color: unlocked ? "#f0c44a" : "#8a8090",
                        fontWeight: 700,
                        fontSize: 12,
                        marginBottom: 2,
                        fontFamily: "var(--font-display)",
                      }}
                    >
                      {cfg.name}
                    </div>
                    <div
                      style={{
                        color: "#6a7a8a",
                        fontSize: 11,
                        lineHeight: 1.4,
                        marginBottom: 4,
                        fontFamily: "var(--font-body)",
                      }}
                    >
                      {cfg.description}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "#f0c44a",
                        fontWeight: 700,
                        fontFamily: "var(--font-display)",
                      }}
                    >
                      🪙 {cfg.dokaReward.toLocaleString()} Doka
                    </div>
                  </div>

                  {/* Claim button */}
                  {unlocked && !claimed && (
                    <button
                      type="button"
                      data-ocid={`achievements.claim_button.${i + 1}`}
                      onClick={() => handleClaim(cfg)}
                      disabled={claimMut.isPending || persistClaimPending}
                      className="stone-btn-crimson"
                      style={{
                        fontSize: 10,
                        padding: "4px 10px",
                        borderRadius: 6,
                        flexShrink: 0,
                        whiteSpace: "nowrap",
                      }}
                    >
                      Claim{" "}
                      {cfg.dokaReward > 0n
                        ? `+${cfg.dokaReward.toLocaleString()}🪙`
                        : ""}
                    </button>
                  )}

                  {claimed && (
                    <span
                      data-ocid={`achievements.claimed_badge.${i + 1}`}
                      className="stone-pill stone-pill-green"
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      Claimed
                    </span>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};

export default AchievementsPanel;
