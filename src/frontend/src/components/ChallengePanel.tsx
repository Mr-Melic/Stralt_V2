import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type Challenge,
  type ChallengePanelProgress,
  type ChallengeTier,
  isChallengeCompleted,
  isChallengeFailed,
} from "../utils/challengeCompletion";
import { logDebugWarn } from "../utils/debugLogger";

export type {
  Challenge,
  ChallengeCondition,
  ChallengePanelProgress,
  ChallengeTier,
} from "../utils/challengeCompletion";
export {
  DEFAULT_CHALLENGES,
  isChallengeCompleted,
  isChallengeFailed,
} from "../utils/challengeCompletion";

const STORAGE_KEY_PREFIX = "pbv_panel_layout_challenge_";

interface ChallengePanelProps {
  visible: boolean;
  userId: string;
  currentChallenge: Challenge | null;
  accepted: boolean;
  onAccept: () => void;
  onDecline: () => void;
  progress?: ChallengePanelProgress;
}

const TIER_STYLES: Record<ChallengeTier, { bg: string; color: string }> = {
  easy: { bg: "#228b22", color: "#ffffff" },
  hard: { bg: "#ff8c00", color: "#ffffff" },
  legendary: { bg: "#ffd700", color: "#1a0000" },
};

export default function ChallengePanel({
  visible,
  userId,
  currentChallenge,
  accepted,
  onAccept,
  onDecline,
  progress,
}: ChallengePanelProps) {
  const [folded, setFolded] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PREFIX + userId);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved?.pos) return saved.pos;
      }
    } catch (e) {
      logDebugWarn("UI", "ChallengePanel layout load failed", String(e));
    }
    return {
      x: Math.max(
        0,
        (typeof window !== "undefined" ? window.innerWidth : 800) - 260,
      ),
      y: 300,
    };
  });

  const dragRef = useRef<{
    mx: number;
    my: number;
    px: number;
    py: number;
  } | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistLayout = useCallback(
    (p: { x: number; y: number }, f: boolean) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        try {
          localStorage.setItem(
            STORAGE_KEY_PREFIX + userId,
            JSON.stringify({ pos: p, folded: f }),
          );
        } catch (e) {
          logDebugWarn("UI", "ChallengePanel layout save failed", String(e));
        }
      }, 400);
    },
    [userId],
  );

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    },
    [],
  );

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest("button")) return;
      e.preventDefault();
      dragRef.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
      const onMove = (ev: MouseEvent) => {
        if (!dragRef.current) return;
        const nx = Math.max(
          0,
          Math.min(
            window.innerWidth - 240,
            dragRef.current.px + ev.clientX - dragRef.current.mx,
          ),
        );
        const ny = Math.max(
          0,
          Math.min(
            window.innerHeight - 60,
            dragRef.current.py + ev.clientY - dragRef.current.my,
          ),
        );
        setPos({ x: nx, y: ny });
      };
      const onUp = () => {
        dragRef.current = null;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        setPos((p) => {
          persistLayout(p, folded);
          return p;
        });
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [pos, folded, persistLayout],
  );

  const toggleFold = useCallback(() => {
    setFolded((f) => {
      persistLayout(pos, !f);
      return !f;
    });
  }, [pos, persistLayout]);

  if (!visible || !currentChallenge) return null;

  const tierStyle = TIER_STYLES[currentChallenge.tier];
  const failed =
    accepted && progress
      ? isChallengeFailed(currentChallenge, progress)
      : false;
  const onTrack =
    accepted && progress
      ? !failed && isChallengeCompleted(currentChallenge, progress)
      : false;

  return (
    <div
      onMouseDown={onMouseDown}
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        width: 240,
        background: "rgba(10,0,0,0.92)",
        border: "1px solid #8b0000",
        borderRadius: 6,
        boxShadow: "0 4px 16px rgba(139,0,0,0.5)",
        zIndex: 1200,
        userSelect: "none",
        cursor: "grab",
        fontFamily: "monospace",
      }}
    >
      <div
        style={{
          padding: "6px 10px",
          borderBottom: folded ? "none" : "1px solid #5a0000",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            color: "#cc0000",
            fontSize: 11,
            fontWeight: "bold",
            textShadow: "0 0 6px #8b0000",
            letterSpacing: 1,
          }}
        >
          BATTLE CHALLENGE
        </span>
        <button
          type="button"
          onClick={toggleFold}
          aria-label={folded ? "Expand challenge" : "Fold challenge"}
          className="stone-touch-target"
          style={{
            background: "none",
            border: "none",
            color: "#cc0000",
            fontSize: 12,
            cursor: "pointer",
            padding: "0 4px",
          }}
        >
          {folded ? "▼" : "▲"}
        </button>
      </div>
      {!folded && (
        <div style={{ padding: "8px 10px" }}>
          <span
            style={{
              background: tierStyle.bg,
              color: tierStyle.color,
              fontSize: 9,
              fontWeight: "bold",
              padding: "2px 6px",
              borderRadius: 3,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            {currentChallenge.tier}
          </span>
          <div
            style={{
              marginTop: 6,
              color: "#e8e0d0",
              fontSize: 11,
              lineHeight: 1.4,
            }}
          >
            {currentChallenge.description}
          </div>
          <div style={{ marginTop: 6, color: "#aaa", fontSize: 10 }}>
            Reward:{" "}
            {currentChallenge.rewards.doka && (
              <span style={{ color: "#ffd700" }}>
                {currentChallenge.rewards.doka} Doka{" "}
              </span>
            )}
            {currentChallenge.rewards.xp && (
              <span style={{ color: "#88ff88" }}>
                {currentChallenge.rewards.xp} XP{" "}
              </span>
            )}
            {currentChallenge.rewards.badge && (
              <span style={{ color: "#c084fc" }}>
                Badge: {currentChallenge.rewards.badge}
              </span>
            )}
          </div>
          {accepted && progress && (
            <div
              style={{
                marginTop: 6,
                padding: "4px 6px",
                background: "rgba(139,0,0,0.2)",
                borderRadius: 3,
                fontSize: 10,
                color: "#e8e0d0",
              }}
            >
              <div>
                Turns: {progress.turnCount} · Damage taken:{" "}
                {progress.totalDamage}
              </div>
              {currentChallenge.condition === "direct_hit" && (
                <div>Direct hit: {progress.directHit ? "Yes" : "No"}</div>
              )}
              <div
                style={{
                  marginTop: 3,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  color: failed ? "#ff4444" : onTrack ? "#88ff88" : "#cc4444",
                  fontWeight: "bold",
                }}
              >
                {failed ? (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 14,
                      height: 14,
                      background: "#ff4444",
                      color: "#1a0000",
                      borderRadius: 3,
                      fontSize: 10,
                      fontWeight: "bold",
                    }}
                  >
                    ✗
                  </span>
                ) : null}
                {failed ? "Failed!" : onTrack ? "On track!" : "Not met yet"}
              </div>
            </div>
          )}
          {!accepted ? (
            <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
              <button
                type="button"
                onClick={onAccept}
                style={{
                  flex: 1,
                  background: "#8b0000",
                  color: "#fff",
                  border: "none",
                  borderRadius: 3,
                  padding: "4px 0",
                  fontSize: 10,
                  cursor: "pointer",
                  fontWeight: "bold",
                  minHeight: 44,
                }}
              >
                Accept
              </button>
              <button
                type="button"
                onClick={onDecline}
                style={{
                  flex: 1,
                  background: "#333",
                  color: "#aaa",
                  border: "none",
                  borderRadius: 3,
                  padding: "4px 0",
                  fontSize: 10,
                  cursor: "pointer",
                  minHeight: 44,
                }}
              >
                Decline
              </button>
            </div>
          ) : (
            <div
              style={{
                marginTop: 6,
                color: "#cc0000",
                fontSize: 10,
                fontWeight: "bold",
                textAlign: "center",
              }}
            >
              Challenge Accepted!
            </div>
          )}
        </div>
      )}
    </div>
  );
}
