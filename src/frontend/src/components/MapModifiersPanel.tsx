import type React from "react";
import type { MapModifierConfig } from "../types/gameTypes";
import DraggablePanel from "./DraggablePanel";

interface MapModifiersPanelProps {
  modifiers: MapModifierConfig[];
  userId?: string;
}

const MODIFIER_EMOJI: Record<string, string> = {
  slime_flood: "🟢",
  paper_windstorm: "🌪️",
  gravity_well: "⚫",
  blood_moon: "🌕",
  fog_of_war: "🌫️",
  thorned_ground: "🌵",
  arcane_surge: "✨",
  mirror_field: "🪞",
  frozen_terrain: "❄️",
  plague_zone: "☠️",
  time_warp: "⏱️",
  void_rift: "🌀",
  titans_vigor: "💪",
  arcane_overflow: "✨",
  glass_realm: "🔮",
  mending_mist: "💧",
  swift_winds: "🌪️",
  iron_curse: "⛓️",
  vampiric_ground: "🩸",
  null_field: "🚫",
  chaos_initiative: "🎲",
  doka_fever: "🤑",
};

const MapModifiersPanel: React.FC<MapModifiersPanelProps> = ({
  modifiers,
  userId,
}) => {
  const activeModifiers = modifiers.filter((m) => m.active);

  return (
    <DraggablePanel
      panelId="map-modifiers"
      title="Map Effects"
      userId={userId}
      defaultPosition={{ x: Math.max(0, window.innerWidth - 230), y: 360 }}
      defaultFolded={false}
      zIndex={110}
      style={{ width: 200 }}
    >
      <div
        data-ocid="map_modifiers.panel"
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
            gap: 5,
            padding: "5px 8px",
            background: "rgba(192,57,43,0.18)",
            borderBottom: "1px solid rgba(192,57,43,0.35)",
          }}
        >
          <span style={{ fontSize: 11 }}>🌀</span>
          <span
            style={{
              color: "#ff7675",
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Map Modifiers
          </span>
          {activeModifiers.length > 0 && (
            <span
              style={{
                marginLeft: "auto",
                background: "rgba(220,30,30,0.3)",
                border: "1px solid rgba(220,30,30,0.6)",
                color: "#ff7675",
                fontSize: 8,
                fontWeight: 700,
                padding: "1px 5px",
                borderRadius: 3,
              }}
            >
              {activeModifiers.length} active
            </span>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: "5px 8px 7px" }}>
          {activeModifiers.length === 0 ? (
            <div
              style={{
                color: "rgba(255,255,255,0.25)",
                fontSize: 9,
                fontStyle: "italic",
              }}
            >
              No active modifiers
            </div>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {activeModifiers.map((mod) => (
                <li
                  key={mod.id}
                  style={{
                    marginBottom: 4,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 4,
                    }}
                  >
                    <span style={{ flexShrink: 0, fontSize: 11 }}>
                      {MODIFIER_EMOJI[mod.modifierType] ?? "\uD83C\uDF00"}
                    </span>
                    <div>
                      <span
                        style={{
                          color: "rgba(255,118,117,0.95)",
                          fontSize: 9,
                          fontWeight: 700,
                          display: "block",
                        }}
                      >
                        {mod.name}
                      </span>
                      <span
                        style={{
                          color: "rgba(255,200,200,0.5)",
                          fontSize: 8,
                        }}
                      >
                        {mod.description}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </DraggablePanel>
  );
};

export default MapModifiersPanel;
