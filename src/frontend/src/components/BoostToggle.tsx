import type React from "react";
import { useEffect, useRef, useState } from "react";
import DraggablePanel from "./DraggablePanel";

interface BoostToggleProps {
  boostMode: "xp" | "rewards";
  onToggle: (mode: "xp" | "rewards") => void;
  regionEffects: string[];
  inBattle?: boolean;
  userId?: string;
}

const BoostToggle: React.FC<BoostToggleProps> = ({
  boostMode,
  onToggle,
  regionEffects,
  inBattle = false,
  userId,
}) => {
  const [visible, setVisible] = useState(true);
  const onToggleRef = useRef(onToggle);
  useEffect(() => {
    onToggleRef.current = onToggle;
  });

  // Reset to XP on mount
  useEffect(() => {
    onToggleRef.current("xp");
  }, []);

  if (!visible) {
    return (
      <DraggablePanel
        panelId="boost-toggle"
        title="Boost"
        userId={userId}
        defaultPosition={{ x: Math.max(0, window.innerWidth - 230), y: 200 }}
        defaultFolded={true}
        zIndex={110}
        style={{ width: 200 }}
      >
        <button
          type="button"
          data-ocid="boost_toggle.open_modal_button"
          onClick={() => setVisible(true)}
          style={{
            background: "rgba(10,6,20,0.88)",
            border: "none",
            color: "#ff7675",
            fontSize: 11,
            padding: "4px 10px",
            cursor: "pointer",
            pointerEvents: "auto",
            fontWeight: 700,
            letterSpacing: "0.04em",
            width: "100%",
          }}
        >
          ⚡ BOOST
        </button>
      </DraggablePanel>
    );
  }

  return (
    <DraggablePanel
      panelId="boost-toggle"
      title="Boost"
      userId={userId}
      defaultPosition={{ x: Math.max(0, window.innerWidth - 230), y: 200 }}
      defaultFolded={false}
      zIndex={110}
      style={{ width: 200 }}
    >
      <div
        data-ocid="boost_toggle.panel"
        style={{
          width: 200,
          background: "linear-gradient(180deg, #0d0610 0%, #0a0414 100%)",
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "5px 8px",
            background: "rgba(192,57,43,0.18)",
            borderBottom: "1px solid rgba(192,57,43,0.35)",
            pointerEvents: "auto",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontSize: 11 }}>⚡</span>
            <span
              style={{
                color: "#ff7675",
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Battle Boost
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            {/* Current mode badge */}
            <span
              style={{
                background:
                  boostMode === "xp"
                    ? "rgba(142,68,173,0.3)"
                    : "rgba(241,196,15,0.2)",
                border:
                  boostMode === "xp"
                    ? "1px solid rgba(155,89,182,0.6)"
                    : "1px solid rgba(241,196,15,0.4)",
                color: boostMode === "xp" ? "#c39bd3" : "#f1c40f",
                fontSize: 8,
                fontWeight: 700,
                padding: "1px 5px",
                borderRadius: 3,
              }}
            >
              +50% {boostMode === "xp" ? "XP" : "DOKA"}
            </span>
            {/* Collapse button */}
            <button
              type="button"
              data-ocid="boost_toggle.close_button"
              onClick={() => setVisible(false)}
              style={{
                background: "transparent",
                border: "none",
                color: "rgba(192,57,43,0.7)",
                cursor: "pointer",
                fontSize: 12,
                lineHeight: 1,
                padding: 0,
                pointerEvents: "auto",
              }}
              aria-label="Hide boost toggle"
            >
              ×
            </button>
          </div>
        </div>

        {/* Locked-in-battle indicator */}
        {inBattle && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              padding: "4px 8px",
              background: "rgba(139,0,0,0.35)",
              borderBottom: "1px solid rgba(192,57,43,0.4)",
            }}
          >
            <span style={{ fontSize: 10 }}>🔒</span>
            <span
              style={{
                color: "rgba(255,100,100,0.85)",
                fontSize: 8,
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Locked during battle
            </span>
          </div>
        )}

        {/* Toggle pills */}
        <div
          style={{
            display: "flex",
            gap: 4,
            padding: "6px 8px",
            borderBottom: "1px solid rgba(192,57,43,0.2)",
            pointerEvents: "auto",
            opacity: inBattle ? 0.45 : 1,
            position: "relative",
          }}
        >
          {/* Overlay to block interaction during battle */}
          {inBattle && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 5,
                cursor: "not-allowed",
                pointerEvents: "auto",
              }}
            />
          )}
          <button
            type="button"
            data-ocid="boost_toggle.tab"
            onClick={() => !inBattle && onToggle("xp")}
            disabled={inBattle}
            style={{
              flex: 1,
              padding: "4px 0",
              borderRadius: 4,
              border:
                boostMode === "xp"
                  ? "1px solid rgba(155,89,182,0.7)"
                  : "1px solid rgba(255,255,255,0.08)",
              background:
                boostMode === "xp"
                  ? "linear-gradient(135deg, rgba(142,68,173,0.45) 0%, rgba(108,52,131,0.3) 100%)"
                  : "rgba(255,255,255,0.04)",
              color: boostMode === "xp" ? "#e056fd" : "rgba(255,255,255,0.35)",
              fontSize: 10,
              fontWeight: boostMode === "xp" ? 800 : 500,
              cursor: inBattle ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              boxShadow:
                boostMode === "xp"
                  ? "0 0 8px rgba(155,89,182,0.3), inset 0 0 6px rgba(155,89,182,0.1)"
                  : "none",
              letterSpacing: "0.04em",
            }}
          >
            🔮 XP Boost
          </button>
          <button
            type="button"
            data-ocid="boost_toggle.tab"
            onClick={() => !inBattle && onToggle("rewards")}
            disabled={inBattle}
            style={{
              flex: 1,
              padding: "4px 0",
              borderRadius: 4,
              border:
                boostMode === "rewards"
                  ? "1px solid rgba(241,196,15,0.6)"
                  : "1px solid rgba(255,255,255,0.08)",
              background:
                boostMode === "rewards"
                  ? "linear-gradient(135deg, rgba(241,196,15,0.3) 0%, rgba(230,126,34,0.2) 100%)"
                  : "rgba(255,255,255,0.04)",
              color:
                boostMode === "rewards" ? "#f9ca24" : "rgba(255,255,255,0.35)",
              fontSize: 10,
              fontWeight: boostMode === "rewards" ? 800 : 500,
              cursor: inBattle ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              boxShadow:
                boostMode === "rewards"
                  ? "0 0 8px rgba(241,196,15,0.25), inset 0 0 6px rgba(241,196,15,0.1)"
                  : "none",
              letterSpacing: "0.04em",
            }}
          >
            💰 Rewards
          </button>
        </div>

        {/* Map Effects section */}
        <div style={{ padding: "5px 8px 7px" }}>
          <div
            style={{
              color: "rgba(192,57,43,0.8)",
              fontSize: 8,
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            Map Effects
          </div>
          {regionEffects.length === 0 ? (
            <div
              style={{
                color: "rgba(255,255,255,0.25)",
                fontSize: 9,
                fontStyle: "italic",
              }}
            >
              No special effects
            </div>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {regionEffects.map((effect, i) => (
                <li
                  // biome-ignore lint/suspicious/noArrayIndexKey: static list
                  key={i}
                  style={{
                    color: "rgba(255,118,117,0.85)",
                    fontSize: 9,
                    paddingLeft: 6,
                    marginBottom: 2,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 4,
                  }}
                >
                  <span style={{ color: "#c0392b", flexShrink: 0 }}>▸</span>
                  <span>{effect}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </DraggablePanel>
  );
};

export default BoostToggle;
