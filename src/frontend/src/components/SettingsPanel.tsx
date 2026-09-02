// Minimal in-game settings panel — sound volume + mute toggle.
// Carved-stone / dark-slate / crimson theme matching the rest of the HUD.
// Uses the shared DraggablePanel so it docks with the other floating panels.

import type React from "react";
import { useState } from "react";
import { soundEngine } from "../engine/soundEngine";
import DraggablePanel from "./DraggablePanel";

interface SettingsPanelProps {
  userId?: string;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ userId }) => {
  const [volume, setVolume] = useState<number>(soundEngine.getVolume());
  const [muted, setMuted] = useState<boolean>(soundEngine.isMuted());

  const handleVolume = (v: number): void => {
    const rounded = Math.round(v * 100) / 100;
    setVolume(rounded);
    soundEngine.setVolume(rounded);
    // Unmute when the user raises volume above zero while muted.
    if (muted && rounded > 0) {
      setMuted(false);
      soundEngine.setMute(false);
    }
  };

  const handleMute = (): void => {
    const next = !muted;
    setMuted(next);
    soundEngine.setMute(next);
  };

  return (
    <DraggablePanel
      panelId="settings"
      title="Settings"
      userId={userId}
      defaultPosition={{ x: 24, y: 200 }}
      defaultFolded={true}
      zIndex={110}
      style={{ width: 220 }}
    >
      <div
        data-ocid="settings.panel"
        style={{
          width: 220,
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
            gap: 6,
            padding: "5px 8px",
            background: "rgba(192,57,43,0.18)",
            borderBottom: "1px solid rgba(192,57,43,0.35)",
            pointerEvents: "auto",
          }}
        >
          <span style={{ fontSize: 11 }}>⚙️</span>
          <span
            style={{
              color: "#ff7675",
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Settings
          </span>
        </div>

        {/* Sound section */}
        <div style={{ padding: "8px 10px 10px", pointerEvents: "auto" }}>
          <div
            style={{
              color: "rgba(192,57,43,0.8)",
              fontSize: 8,
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Sound
          </div>

          {/* Volume slider */}
          <label
            htmlFor="settings.volume_input"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              color: "rgba(255,255,255,0.6)",
              fontSize: 9,
              marginBottom: 4,
            }}
          >
            <span>Volume</span>
            <span style={{ color: "#f0c44a", fontWeight: 700 }}>
              {Math.round(volume * 100)}%
            </span>
          </label>
          <input
            id="settings.volume_input"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => handleVolume(Number(e.target.value))}
            data-ocid="settings.volume_input"
            disabled={muted}
            aria-label="Sound volume"
            style={{
              width: "100%",
              accentColor: "#c0392b",
              cursor: muted ? "not-allowed" : "pointer",
              opacity: muted ? 0.45 : 1,
            }}
          />

          {/* Mute toggle */}
          <button
            type="button"
            data-ocid="settings.mute_toggle"
            onClick={handleMute}
            aria-pressed={muted}
            aria-label={muted ? "Unmute sound" : "Mute sound"}
            style={{
              marginTop: 10,
              width: "100%",
              padding: "5px 0",
              borderRadius: 4,
              border: muted
                ? "1px solid rgba(192,57,43,0.7)"
                : "1px solid rgba(255,255,255,0.08)",
              background: muted
                ? "linear-gradient(135deg, rgba(192,57,43,0.45) 0%, rgba(120,30,20,0.3) 100%)"
                : "rgba(255,255,255,0.04)",
              color: muted ? "#ff7675" : "rgba(255,255,255,0.6)",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.04em",
              cursor: "pointer",
              transition: "all 0.2s",
              boxShadow: muted
                ? "0 0 8px rgba(192,57,43,0.3), inset 0 0 6px rgba(192,57,43,0.1)"
                : "none",
            }}
          >
            {muted ? "🔇 Muted" : "🔊 Sound On"}
          </button>
        </div>
      </div>
    </DraggablePanel>
  );
};

export default SettingsPanel;
