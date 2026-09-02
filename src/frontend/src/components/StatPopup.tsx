import type React from "react";

interface StatPopupProps {
  combatant: any;
  unitStats: Record<string, any>;
  unitEffects: Record<string, any[]>;
  onClose: () => void;
  style?: React.CSSProperties;
  anchorRect?: DOMRect;
}

const STAT_COLORS: Record<string, string> = {
  SP: "violet",
  SR: "blue",
  RES: "green",
  INIT: "amber",
  CHC: "gold",
  FAIL: "crimson",
};

export default function StatPopup({
  combatant,
  unitStats,
  unitEffects,
  onClose,
  style,
  anchorRect,
}: StatPopupProps) {
  if (!combatant) return null;
  const stats = unitStats[combatant.id] || {};
  const effects = unitEffects[combatant.id] || [];
  const hp = stats.hp ?? combatant.hp ?? 0;
  const maxHp = stats.maxHp ?? combatant.maxHp ?? 1;
  const hpPct = maxHp > 0 ? (hp / maxHp) * 100 : 0;

  const statEntries = [
    { key: "SP", label: "SP", value: stats.sp ?? 0 },
    { key: "SR", label: "SR", value: stats.sr ?? 0 },
    { key: "RES", label: "RES", value: stats.res ?? 0 },
    { key: "INIT", label: "INIT", value: stats.init ?? 0 },
    { key: "CHC", label: "CHC", value: stats.chc ?? 0 },
  ];

  // Compute fixed position with viewport clamping
  const popupWidth = 248;
  const popupHeight = 320; // approximate max height
  const margin = 12;

  let left = 0;
  let top = 0;

  if (anchorRect) {
    // Center horizontally on the anchor
    left = anchorRect.left + anchorRect.width / 2 - popupWidth / 2;
    // Position above the anchor
    top = anchorRect.top - popupHeight - 10;

    // Clamp to viewport edges
    left = Math.max(
      margin,
      Math.min(left, window.innerWidth - popupWidth - margin),
    );
    top = Math.max(
      margin,
      Math.min(top, window.innerHeight - popupHeight - margin),
    );
  }

  return (
    <div
      className="stone-popup-portal stone-popup-portal-animate"
      style={{
        position: "fixed",
        left,
        top,
        zIndex: 9999,
        ...style,
      }}
      aria-label="Combatant stats"
      tabIndex={-1}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="stone-popup-arrow-portal" />
      <div className="stone-popup-inner">
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "10px",
          }}
        >
          <div
            className="stone-battle-portrait"
            style={{ width: 40, height: 40, fontSize: 20 }}
          >
            {combatant.pieceIcon}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  fontFamily: "Baloo 2",
                  fontWeight: 700,
                  color: "#e8e6ef",
                }}
              >
                {combatant.name}
              </span>
              <span
                className={`stone-pill-${combatant.id === "player" ? "crimson" : "slate"}`}
              >
                LVL {combatant.level}
              </span>
            </div>
            <div
              style={{ fontFamily: "Saira", fontSize: 11, color: "#8a8090" }}
            >
              {combatant.pieceType}{" "}
              {combatant.id === "player" ? "(You)" : "· Enemy"}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="stone-btn-slate"
            style={{ width: 28, height: 28, padding: 0, borderRadius: 6 }}
          >
            ✕
          </button>
        </div>

        {/* Health */}
        <div style={{ marginBottom: "10px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontFamily: "Saira",
              fontSize: 11,
              color: "#8a8090",
              marginBottom: 4,
            }}
          >
            <span>HEALTH</span>
            <span>
              {hp} / {maxHp}
            </span>
          </div>
          <div className="stone-battle-hp-bar">
            <div
              className="stone-battle-hp-bar-fill"
              style={{ width: `${hpPct}%` }}
            />
          </div>
        </div>

        {/* Stat Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "6px",
            marginBottom: "10px",
          }}
        >
          {statEntries.map(({ key, label, value }) => (
            <div
              key={key}
              className={`stone-stat-chip stone-stat-chip-${STAT_COLORS[key]}`}
            >
              <span className="stone-gem" style={{ width: 10, height: 10 }} />
              <span>{label}</span>
              <span style={{ marginLeft: "auto", fontWeight: 700 }}>
                {value}
              </span>
            </div>
          ))}
        </div>

        {/* FAIL */}
        <div
          className="stone-stat-chip stone-stat-chip-crimson"
          style={{ marginBottom: "10px" }}
        >
          <span className="stone-gem" style={{ width: 10, height: 10 }} />
          <span>FAIL</span>
          <span style={{ marginLeft: "auto", fontWeight: 700 }}>
            {stats.fail ?? 0}
          </span>
        </div>

        {/* Active Effects */}
        <div>
          <div
            style={{
              fontFamily: "Saira",
              fontSize: 11,
              color: "#8a8090",
              marginBottom: 6,
            }}
          >
            ACTIVE EFFECTS
          </div>
          {effects.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {effects.map((effect: any, idx: number) => (
                <div
                  key={`${effect.stat}-${effect.modifier}-${effect.turnsRemaining}-${idx}`}
                  className={
                    effect.type === "buff"
                      ? "stone-effect-chip-buff"
                      : "stone-effect-chip-debuff"
                  }
                >
                  <span>{effect.iconEmoji || "●"}</span>
                  <span>
                    {effect.stat}{" "}
                    {effect.modifier > 0
                      ? `+${effect.modifier}`
                      : effect.modifier}
                  </span>
                  <span
                    className="stone-pill-slate"
                    style={{ fontSize: 10, padding: "1px 4px" }}
                  >
                    {effect.turnsRemaining}T
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                fontFamily: "Saira",
                fontSize: 12,
                color: "#8a8090",
                fontStyle: "italic",
              }}
            >
              No active effects
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
