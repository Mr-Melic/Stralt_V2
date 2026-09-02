import type React from "react";
import { useEffect, useRef } from "react";
import type { AchievementConfig } from "../types/gameTypes";
import { recapUnlocksFromData } from "../utils/recapUnlocks";

export interface BattleRecapData {
  mapTitle: string;
  xpEarned: number;
  hitsDealt: number;
  enemiesDefeated: Array<{ name: string; level: number }>;
  currentXP: number;
  xpForNextLevel: number;
  currentLevel: number;
  dokaEarned: number;
  dokaBreakdown: Array<{ enemyName: string; level: number; doka: number }>;
  dokaFromVictory?: number;
  dokaFromChallenges?: number;
  completedChallenges?: string[];
  /** EXP8: Dungeon chain info — undefined when not in a chain */
  dungeonMultiplier?: number;
  dungeonDepth?: number;
  dungeonMaxDepth?: number;
  /** BOSS: name of defeated boss, if this was a boss battle */
  bossDefeated?: string;
  /** Absolute new balances returned by backend applyRewards */
  newDoka?: number;
  newXp?: number;
  /** DEFEAT: penalty recap fields */
  isDefeat?: boolean;
  xpLost?: number;
  dokaLost?: number;
  /** Feats unlocked this fight — collected in-world, shown at app-root recap */
  newlyUnlockedAchievements?: AchievementConfig[];
}

interface PostBattleRecapProps {
  data: BattleRecapData;
  onClose: () => void;
  newlyUnlockedAchievements?: AchievementConfig[];
}

const PostBattleRecap: React.FC<PostBattleRecapProps> = ({
  data,
  onClose,
  newlyUnlockedAchievements = [],
}) => {
  const unlockedAchievements = recapUnlocksFromData(
    data.newlyUnlockedAchievements,
    newlyUnlockedAchievements,
  );
  const xpNeeded = data.xpForNextLevel > 0 ? data.xpForNextLevel : 1;
  const xpPercent = Math.min(
    100,
    Math.floor((data.currentXP / xpNeeded) * 100),
  );
  const xpUntilNext = xpNeeded - data.currentXP;

  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <dialog
      open
      data-ocid="post_battle_recap.dialog"
      aria-label={data.isDefeat ? "Defeat recap" : "Battle complete"}
      className="fixed inset-0 flex items-center justify-center"
      style={{
        width: "100%",
        height: "100%",
        maxWidth: "none",
        maxHeight: "none",
        margin: 0,
        border: "none",
        zIndex: 9600,
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(3px)",
        animation: "fadeIn 0.3s ease",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        const target = e.target;
        if (
          target instanceof HTMLElement &&
          (target.tagName === "BUTTON" ||
            target.tagName === "A" ||
            target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable)
        ) {
          return;
        }
        onClose();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative outline-none"
        style={{
          background:
            "linear-gradient(160deg, oklch(0.1 0.01 260) 0%, oklch(0.06 0.005 260) 100%)",
          border: "1.5px solid oklch(var(--dofus-border-gold))",
          borderRadius: 10,
          boxShadow:
            "0 0 40px oklch(var(--dofus-border-gold) / 0.35), inset 0 1px 0 oklch(var(--dofus-border-gold) / 0.15)",
          width: "min(480px, 94vw)",
          maxHeight: "min(90vh, 90dvh)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          overflowY: "auto",
          padding: 0,
          animation: "slideUpFadeIn 0.35s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: data.isDefeat
              ? "linear-gradient(90deg, oklch(0.08 0.02 25) 0%, oklch(0.06 0.015 20) 100%)"
              : "linear-gradient(90deg, oklch(var(--dofus-bg-primary)) 0%, oklch(0.09 0.015 40) 100%)",
            borderBottom: "1px solid oklch(var(--dofus-border-gold-dim))",
            padding: "14px 20px 10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderRadius: "8px 8px 0 0",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {data.bossDefeated && !data.isDefeat && (
              <div
                style={{
                  textAlign: "center",
                  padding: "10px 20px 6px",
                  background:
                    "linear-gradient(90deg, rgba(212,160,0,0.18), rgba(212,160,0,0.07), rgba(212,160,0,0.18))",
                  borderBottom: "1px solid rgba(255,215,0,0.35)",
                  borderRadius: "8px 8px 0 0",
                }}
              >
                <div style={{ fontSize: 20, marginBottom: 2 }}>☠️</div>
                <div
                  style={{
                    color: "#ffd700",
                    fontWeight: 800,
                    fontSize: 13,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  BOSS DEFEATED
                </div>
                <div
                  style={{ color: "#ffb300", fontSize: 12, fontWeight: 600 }}
                >
                  {data.bossDefeated}
                </div>
              </div>
            )}
            <span style={{ fontSize: 22 }}>{data.isDefeat ? "💀" : "⚔️"}</span>
            <div>
              <div
                style={{
                  color: data.isDefeat
                    ? "#ff4444"
                    : "oklch(var(--dofus-text-gold))",
                  fontWeight: 800,
                  fontSize: 16,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                {data.isDefeat ? "Defeated" : "Battle Complete!"}
              </div>
              <div
                style={{
                  color: "oklch(var(--dofus-text-dim))",
                  fontSize: 10,
                  marginTop: 1,
                }}
              >
                {data.mapTitle}
              </div>
            </div>
          </div>
          <button
            type="button"
            data-ocid="post_battle_recap.close_button"
            onClick={() => {
              onClose();
            }}
            aria-label="Close recap"
            style={{
              background: "rgba(192,57,43,0.08)",
              border: "1px solid oklch(var(--dofus-border-gold-dim))",
              color: "oklch(var(--dofus-text-gold))",
              borderRadius: 5,
              width: 44,
              height: 44,
              cursor: "pointer",
              fontSize: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "rgba(192,57,43,0.22)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "rgba(192,57,43,0.08)";
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: "16px 20px 20px" }}>
          {/* XP Section */}
          <RecapSection
            icon="✨"
            title={data.isDefeat ? "XP Lost" : "Experience Earned"}
          >
            {data.isDefeat ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: "#ff4444",
                  }}
                >
                  -{data.xpLost || 0} XP
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: "oklch(var(--dofus-text-dim))",
                  }}
                >
                  Level {data.currentLevel}
                </span>
              </div>
            ) : (
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      color: "oklch(0.75 0.22 310)",
                    }}
                  >
                    +{data.xpEarned} XP
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: "oklch(var(--dofus-text-dim))",
                    }}
                  >
                    Level {data.currentLevel}
                  </span>
                </div>
                {/* XP bar */}
                <div className="dofus-xp-bar" style={{ borderRadius: 4 }}>
                  <div
                    className="dofus-xp-bar-fill"
                    style={{
                      width: `${xpPercent}%`,
                      borderRadius: 4,
                      transition: "width 1s cubic-bezier(0.34,1.56,0.64,1)",
                    }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 4,
                  }}
                >
                  <span
                    style={{
                      fontSize: 9,
                      color: "oklch(var(--dofus-text-dim))",
                    }}
                  >
                    {data.currentXP} / {data.xpForNextLevel} XP
                  </span>
                  <span style={{ fontSize: 9, color: "oklch(0.75 0.22 310)" }}>
                    {xpUntilNext} XP until Level {data.currentLevel + 1}
                  </span>
                </div>
              </div>
            )}
          </RecapSection>

          {/* Battle Stats */}
          <RecapSection icon="🗡️" title="Battle Stats">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              <StatBox
                label="Hits Dealt"
                value={String(data.hitsDealt)}
                color="oklch(var(--dofus-hp-color))"
              />
              <StatBox
                label="Enemies Defeated"
                value={String(data.enemiesDefeated.length)}
                color="oklch(var(--dofus-text-gold))"
              />
            </div>
          </RecapSection>

          {/* Enemies Defeated */}
          {data.enemiesDefeated.length > 0 && (
            <RecapSection icon="☠️" title="Enemies Defeated">
              <div
                className="dofus-scrollbar"
                style={{ maxHeight: 120, overflowY: "auto" }}
              >
                {data.enemiesDefeated.map((e, i) => (
                  <div
                    key={`${e.name}-${i}`}
                    data-ocid={`post_battle_recap.enemy.${i + 1}`}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "4px 6px",
                      marginBottom: 2,
                      background: "rgba(255,118,117,0.06)",
                      border: "1px solid rgba(255,118,117,0.12)",
                      borderRadius: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        color: "oklch(var(--dofus-text-silver))",
                      }}
                    >
                      ♟ {e.name}
                    </span>
                    <span
                      className="dofus-badge"
                      style={{
                        background: "rgba(200,150,42,0.12)",
                        border: "1px solid oklch(var(--dofus-border-gold-dim))",
                        color: "oklch(var(--dofus-text-gold))",
                        fontSize: 9,
                        padding: "1px 6px",
                      }}
                    >
                      Lv.{e.level}
                    </span>
                  </div>
                ))}
              </div>
            </RecapSection>
          )}

          {/* Doka Earnings */}
          <RecapSection
            icon="🪙"
            title={data.isDefeat ? "Doka Lost" : "Doka Earned"}
          >
            {data.isDefeat ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    color: "#ff4444",
                  }}
                >
                  -{data.dokaLost || 0} Doka
                </span>
                <span style={{ fontSize: 13 }}>💰</span>
              </div>
            ) : (
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: data.dokaBreakdown.length > 0 ? 8 : 0,
                  }}
                >
                  <span
                    style={{
                      fontSize: 20,
                      fontWeight: 800,
                      color: "oklch(0.78 0.2 48)",
                    }}
                  >
                    +{data.dokaEarned.toLocaleString()} Doka
                  </span>
                  <span style={{ fontSize: 13 }}>💰</span>
                </div>
                {/* EXP8: Dungeon chain multiplier badge */}
                {data.dungeonMultiplier && data.dungeonMultiplier > 1 && (
                  <div
                    data-ocid="post_battle_recap.dungeon_bonus"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "5px 8px",
                      marginBottom: 8,
                      background: "rgba(139,0,0,0.18)",
                      border: "1px solid rgba(204,0,0,0.45)",
                      borderRadius: 5,
                    }}
                  >
                    <span style={{ fontSize: 14 }}>⚔️</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: "#ff6666",
                          letterSpacing: "0.05em",
                        }}
                      >
                        DUNGEON CHAIN BONUS
                      </div>
                      <div
                        style={{ fontSize: 9, color: "#aa5555", marginTop: 1 }}
                      >
                        Depth {data.dungeonDepth ?? 1}/
                        {data.dungeonMaxDepth ?? "?"} — {data.dungeonMultiplier}
                        × Doka multiplier applied
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        color: "#ff4444",
                        flexShrink: 0,
                      }}
                    >
                      ×{data.dungeonMultiplier}
                    </span>
                  </div>
                )}
                {data.dokaBreakdown.length > 0 && (
                  <div
                    className="dofus-scrollbar"
                    style={{ maxHeight: 90, overflowY: "auto" }}
                  >
                    {data.dokaBreakdown.map((d, i) => (
                      <div
                        key={`doka-${d.enemyName}-${d.level}-${i}`}
                        data-ocid={`post_battle_recap.doka.${i + 1}`}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "3px 5px",
                          marginBottom: 2,
                          background: "rgba(200,150,42,0.05)",
                          border: "1px solid rgba(200,150,42,0.1)",
                          borderRadius: 3,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 10,
                            color: "oklch(var(--dofus-text-dim))",
                          }}
                        >
                          {d.enemyName} (Lv.{d.level})
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: "oklch(0.78 0.2 48)",
                          }}
                        >
                          +{d.doka.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </RecapSection>

          {/* Newly Unlocked Achievements */}
          {unlockedAchievements.length > 0 && (
            <RecapSection icon="🏆" title="Achievements Unlocked">
              <div
                className="dofus-scrollbar"
                style={{ maxHeight: 120, overflowY: "auto" }}
              >
                {unlockedAchievements.map((ach, i) => (
                  <div
                    key={ach.id}
                    data-ocid={`post_battle_recap.achievement.${i + 1}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "5px 6px",
                      marginBottom: 4,
                      background: "rgba(240,192,64,0.06)",
                      border: "1px solid rgba(240,192,64,0.18)",
                      borderRadius: 5,
                    }}
                  >
                    <span style={{ fontSize: 14 }}>🏆</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#f0c040",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {ach.name}
                      </div>
                      <div
                        style={{
                          fontSize: 9,
                          color: "oklch(var(--dofus-text-dim))",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {ach.description}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#c8961a",
                        flexShrink: 0,
                        whiteSpace: "nowrap",
                      }}
                    >
                      +{ach.dokaReward.toLocaleString()} Doka
                    </span>
                  </div>
                ))}
              </div>
            </RecapSection>
          )}

          {/* Continue button */}
          <button
            type="button"
            data-ocid="post_battle_recap.confirm_button"
            onClick={() => {
              onClose();
            }}
            style={{
              width: "100%",
              marginTop: 4,
              padding: "10px 0",
              background:
                "linear-gradient(135deg, rgba(200,150,42,0.3) 0%, rgba(200,150,42,0.15) 100%)",
              border: "1px solid oklch(var(--dofus-border-gold))",
              borderRadius: 6,
              color: "oklch(var(--dofus-text-gold))",
              fontWeight: 800,
              fontSize: 13,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              cursor: "pointer",
              transition: "all 0.2s",
              minHeight: 44,
              boxShadow: "0 0 12px oklch(var(--dofus-border-gold) / 0.2)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "linear-gradient(135deg, rgba(200,150,42,0.45) 0%, rgba(200,150,42,0.25) 100%)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                "0 0 20px oklch(var(--dofus-border-gold) / 0.4)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "linear-gradient(135deg, rgba(200,150,42,0.3) 0%, rgba(200,150,42,0.15) 100%)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                "0 0 12px oklch(var(--dofus-border-gold) / 0.2)";
            }}
          >
            {data.isDefeat
              ? "Continue — next you enter the Death Realm →"
              : "Continue Exploring →"}
          </button>
        </div>
      </div>
    </dialog>
  );
};

// ── Sub-components ────────────────────────────────────────────────────────────

const RecapSection: React.FC<{
  icon: string;
  title: string;
  children: React.ReactNode;
}> = ({ icon, title, children }) => (
  <div
    style={{
      marginBottom: 14,
      background: "rgba(255,255,255,0.025)",
      border: "1px solid rgba(200,150,42,0.12)",
      borderRadius: 6,
      overflow: "hidden",
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 10px",
        background: "rgba(200,150,42,0.07)",
        borderBottom: "1px solid rgba(200,150,42,0.1)",
      }}
    >
      <span style={{ fontSize: 13 }}>{icon}</span>
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: "oklch(var(--dofus-text-gold))",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        {title}
      </span>
    </div>
    <div style={{ padding: "10px 12px" }}>{children}</div>
  </div>
);

const StatBox: React.FC<{
  label: string;
  value: string;
  color: string;
}> = ({ label, value, color }) => (
  <div
    style={{
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 5,
      padding: "8px 10px",
      textAlign: "center",
    }}
  >
    <div
      style={{
        fontSize: 18,
        fontWeight: 800,
        color,
        lineHeight: 1.1,
      }}
    >
      {value}
    </div>
    <div
      style={{
        fontSize: 9,
        color: "oklch(var(--dofus-text-dim))",
        marginTop: 2,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
      }}
    >
      {label}
    </div>
  </div>
);

export default PostBattleRecap;
