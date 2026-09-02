import type React from "react";
import { useEffect, useRef, useState } from "react";
import type { AchievementConfig } from "../types/gameTypes";

interface AchievementToastProps {
  achievement: AchievementConfig;
  onDismiss: () => void;
}

/** Non-intrusive achievement toast that slots in below the top bar (right side). */
const AchievementToast: React.FC<AchievementToastProps> = ({
  achievement,
  onDismiss,
}) => {
  const [phase, setPhase] = useState<"in" | "visible" | "out">("in");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // LEAK-13: Instance ID guard prevents callbacks from a previous mount firing
  // on a freshly remounted toast (rapid unlock scenario).
  const instanceIdRef = useRef<number>(0);

  useEffect(() => {
    // Capture this mount's instance ID
    const myInstance = ++instanceIdRef.current;
    // Slide in
    timerRef.current = setTimeout(() => {
      if (instanceIdRef.current !== myInstance) return;
      setPhase("visible");
    }, 50);
    // Start fade out after 3.5s
    const fadeTimer = setTimeout(() => {
      if (instanceIdRef.current !== myInstance) return;
      setPhase("out");
    }, 3500);
    // Dismiss after 4s
    const dismissTimer = setTimeout(() => {
      if (instanceIdRef.current !== myInstance) return;
      onDismiss();
    }, 4000);
    return () => {
      clearTimeout(timerRef.current ?? undefined);
      clearTimeout(fadeTimer);
      clearTimeout(dismissTimer);
    };
  }, [onDismiss]);

  const handleClick = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    onDismiss();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  // Slide down from just above the top bar, then settle below it
  const translateY =
    phase === "in" ? "-20px" : phase === "out" ? "-20px" : "0px";
  const opacity = phase === "visible" ? 1 : 0;

  return (
    <button
      type="button"
      data-ocid="achievement_toast"
      aria-live="polite"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      style={{
        position: "fixed",
        // sit just below the 44px top bar so it never overlaps the header
        top: 50,
        right: 20,
        transform: `translateY(${translateY})`,
        opacity,
        transition:
          "transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease",
        zIndex: 9500,
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: "rgba(8,5,18,0.97)",
        border: "1.5px solid #8b0000",
        borderTop: "3px solid #c0392b",
        borderRadius: 6,
        boxShadow:
          "0 6px 28px rgba(139,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)",
        padding: "9px 14px",
        minWidth: 220,
        maxWidth: 300,
        cursor: "pointer",
      }}
    >
      {/* Gold trophy icon */}
      <div
        style={{
          fontSize: 24,
          flexShrink: 0,
          filter: "drop-shadow(0 0 8px rgba(240,192,64,0.7))",
          animation: "achievementTrophyPulse 1.2s ease infinite",
        }}
      >
        🏆
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            color: "#c0392b",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            marginBottom: 2,
          }}
        >
          Achievement Unlocked!
        </div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "#f0c040",
            marginBottom: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {achievement.name}
        </div>
        <div
          style={{
            fontSize: 10,
            color: "#7a8a9a",
            lineHeight: 1.3,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {achievement.description}
        </div>
      </div>

      {/* Doka reward badge */}
      <div
        style={{
          flexShrink: 0,
          background: "rgba(180,140,20,0.15)",
          border: "1px solid rgba(240,192,64,0.35)",
          borderRadius: 6,
          padding: "3px 8px",
          fontSize: 11,
          fontWeight: 700,
          color: "#f0c040",
          textAlign: "center",
        }}
      >
        +{achievement.dokaReward.toLocaleString()}
        <div style={{ fontSize: 8, color: "#c8961a", fontWeight: 600 }}>
          Doka
        </div>
      </div>

      {/* CSS keyframe injected once */}
      <style>{`
        @keyframes achievementTrophyPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.18); }
        }
      `}</style>
    </button>
  );
};

export default AchievementToast;
