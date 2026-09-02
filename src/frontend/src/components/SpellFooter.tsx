import { BookOpen, Swords } from "lucide-react";
import type React from "react";
import { playSound } from "../hooks/useSoundHooks";
import type { SpellConfig } from "../types/gameTypes";
import DraggablePanel from "./DraggablePanel";

interface SpellFooterProps {
  activeSpells: SpellConfig[];
  selectedSpellIdRef: React.MutableRefObject<string | null>;
  spellSelectionVersion: number;
  onSelectSpell: (id: string) => void;
  onOpenSpellbook: () => void;
  onAttackNearest?: () => void;
  inBattle: boolean;
  isMobile?: boolean;
  canAttackNearest?: boolean;
  userId?: string;
  /** Map of spellId -> cooldown turns remaining */
  spellCooldowns?: Record<string, number>;
}

function getSpellGlowClass(spell: SpellConfig): string {
  const effect = (spell.effectType ?? "").toLowerCase();
  if (spell.isPhysical) return "spell-glow-physical";
  if (effect === "heal") return "spell-glow-heal";
  if (effect === "drain") return "spell-glow-drain";
  if (effect === "damage") return "spell-glow-fire";
  if (effect === "dot") return "spell-glow-fire";
  if (effect === "buff") return "spell-glow-holy";
  if (effect === "debuff") return "spell-glow-poison";
  if (effect === "pushback" || effect === "attract")
    return "spell-glow-lightning";
  if (effect === "teleport") return "spell-glow-cyan";
  return "spell-glow-default";
}

const SpellFooter: React.FC<SpellFooterProps> = ({
  activeSpells,
  selectedSpellIdRef,
  spellSelectionVersion,
  onSelectSpell,
  onOpenSpellbook,
  onAttackNearest,
  inBattle,
  isMobile = false,
  canAttackNearest = false,
  userId,
  spellCooldowns = {},
}) => {
  const forceUpdate = spellSelectionVersion;
  return (
    <DraggablePanel
      data-version={forceUpdate}
      panelId="spell-footer"
      title="Spells"
      userId={userId}
      defaultPosition={{ x: 80, y: Math.max(0, window.innerHeight - 120) }}
      defaultFolded={false}
      zIndex={120}
    >
      <div
        data-ocid="spellbar.panel"
        style={{
          height: "72px",
          background:
            "linear-gradient(180deg, rgba(10,8,20,0.97) 0%, rgba(20,10,28,0.99) 100%)",
          borderTop: "2px solid rgba(180,20,20,0.8)",
          boxShadow:
            "0 -4px 24px rgba(180,20,20,0.25), 0 -1px 0 rgba(180,20,20,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px",
          padding: "0 16px",
          pointerEvents: "auto",
        }}
      >
        {/* Spellbook Button */}
        <button
          type="button"
          data-ocid="spellbar.open_modal_button"
          onClick={onOpenSpellbook}
          title="Open Spellbook \u2014 swap spells"
          style={{
            width: 44,
            height: 44,
            borderRadius: 6,
            background: "rgba(140,20,20,0.18)",
            border: "2px solid rgba(180,20,20,0.55)",
            color: "#ff6b6b",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
            flexShrink: 0,
            transition: "all 0.2s",
            boxShadow: "0 2px 8px rgba(180,20,20,0.2)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "rgba(180,20,20,0.35)";
            (e.currentTarget as HTMLButtonElement).style.borderColor =
              "rgba(220,30,30,0.9)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow =
              "0 0 14px rgba(200,20,20,0.5)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "rgba(140,20,20,0.18)";
            (e.currentTarget as HTMLButtonElement).style.borderColor =
              "rgba(180,20,20,0.55)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow =
              "0 2px 8px rgba(180,20,20,0.2)";
          }}
        >
          <BookOpen size={18} />
          <span style={{ fontSize: 9, lineHeight: 1, opacity: 0.8 }}>Book</span>
        </button>

        {/* Separator */}
        <div
          style={{
            width: 1,
            height: 44,
            background: "rgba(180,20,20,0.3)",
            flexShrink: 0,
          }}
        />

        {/* 8 Active Spell Slots */}
        <div style={{ display: "flex", gap: 6, flexWrap: "nowrap" }}>
          {[0, 1, 2, 3, 4, 5, 6, 7].map((slotIndex) => {
            const spell = activeSpells[slotIndex] ?? null;
            const isSelected = spell?.id === selectedSpellIdRef.current;
            const isEmpty = !spell;
            const isPhysical = spell?.isPhysical ?? false;
            const isHeal =
              spell?.spellType === "heal" || spell?.spellType === "drain";
            const cooldownLeft = spell ? (spellCooldowns[spell.id] ?? 0) : 0;
            const isOnCooldown = cooldownLeft > 0;
            const glowClass =
              spell && !isEmpty
                ? `${getSpellGlowClass(spell)}${isOnCooldown ? " spell-glow-paused" : ""}`
                : "";

            const spellTitle = spell
              ? `${spell.name} \u2014 ${spell.description} | ${
                  isHeal
                    ? `Heals: ${spell.healAmount ?? 0} HP`
                    : `Damage: ${Number(spell.damage)}`
                } | ${Number(spell.apCost)} AP | Range: ${Number(spell.range)}`
              : `Empty spell slot ${slotIndex + 1}`;

            return (
              <button
                key={slotIndex}
                type="button"
                data-ocid={`spellbar.item.${slotIndex + 1}`}
                className={glowClass}
                onClick={() => {
                  if (spell && inBattle && !isOnCooldown) {
                    onSelectSpell(spell.id);
                    playSound("spell_cast", spell.name);
                  }
                }}
                disabled={isEmpty || !inBattle || isOnCooldown}
                title={
                  isOnCooldown
                    ? `${spell?.name} \u2014 ${cooldownLeft} turn${cooldownLeft !== 1 ? "s" : ""} cooldown`
                    : spellTitle
                }
                style={{
                  width: 46,
                  height: 54,
                  borderRadius: 6,
                  background: isEmpty
                    ? "rgba(255,255,255,0.03)"
                    : isSelected
                      ? isPhysical
                        ? "rgba(139,90,30,0.4)"
                        : isHeal
                          ? "rgba(30,140,80,0.4)"
                          : "rgba(220,30,30,0.35)"
                      : isPhysical
                        ? "rgba(100,60,10,0.45)"
                        : isHeal
                          ? "rgba(20,100,50,0.35)"
                          : "rgba(80,15,15,0.45)",
                  border: isEmpty
                    ? "2px dashed rgba(180,20,20,0.25)"
                    : isSelected
                      ? isPhysical
                        ? "2px solid rgba(200,140,40,0.9)"
                        : isHeal
                          ? "2px solid rgba(50,200,100,0.9)"
                          : "2px solid rgba(255,80,80,0.9)"
                      : isPhysical
                        ? "2px solid rgba(180,120,30,0.6)"
                        : isHeal
                          ? "2px solid rgba(40,160,80,0.6)"
                          : "2px solid rgba(180,20,20,0.55)",
                  cursor:
                    isEmpty || !inBattle
                      ? "default"
                      : isOnCooldown
                        ? "not-allowed"
                        : "pointer",
                  opacity: isOnCooldown ? 0.5 : 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 2,
                  position: "relative",
                  transition: "all 0.15s",
                  boxShadow: isSelected
                    ? isPhysical
                      ? "0 0 16px rgba(200,140,40,0.5), inset 0 0 8px rgba(200,140,40,0.12)"
                      : isHeal
                        ? "0 0 16px rgba(50,200,100,0.5), inset 0 0 8px rgba(50,200,100,0.12)"
                        : "0 0 16px rgba(255,60,60,0.5), inset 0 0 8px rgba(255,60,60,0.12)"
                    : "0 2px 6px rgba(0,0,0,0.4)",
                  flexShrink: 0,
                }}
              >
                {/* Slot number badge */}
                <span
                  style={{
                    position: "absolute",
                    top: 2,
                    left: 3,
                    fontSize: 7,
                    color: "rgba(255,255,255,0.35)",
                    fontWeight: 700,
                    lineHeight: 1,
                    pointerEvents: "none",
                  }}
                >
                  {slotIndex + 1}
                </span>

                {/* Physical indicator badge */}
                {isPhysical && !isEmpty && (
                  <span
                    style={{
                      position: "absolute",
                      top: 2,
                      right: 3,
                      fontSize: 6,
                      color: "rgba(200,140,40,0.8)",
                      fontWeight: 700,
                      lineHeight: 1,
                      pointerEvents: "none",
                    }}
                  >
                    PHY
                  </span>
                )}

                {isEmpty ? (
                  <span style={{ fontSize: 16, opacity: 0.2 }}>\u2726</span>
                ) : (
                  <>
                    {/* Icon */}
                    <span
                      style={{
                        fontSize: 18,
                        lineHeight: 1,
                        filter: isPhysical
                          ? "drop-shadow(0 1px 3px rgba(200,140,40,0.5))"
                          : isHeal
                            ? "drop-shadow(0 1px 3px rgba(50,200,100,0.4))"
                            : "drop-shadow(0 1px 3px rgba(255,60,60,0.4))",
                      }}
                    >
                      {spell.iconEmoji || "\uD83D\uDD2E"}
                    </span>
                    {/* Name */}
                    <span
                      style={{
                        fontSize: 6,
                        color: isSelected
                          ? isHeal
                            ? "#90ffcc"
                            : "#ff9999"
                          : "rgba(255,220,220,0.7)",
                        fontWeight: 700,
                        lineHeight: 1,
                        textAlign: "center",
                        maxWidth: 44,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {spell.name}
                    </span>
                    {/* Cooldown overlay */}
                    {isOnCooldown && (
                      <span
                        style={{
                          position: "absolute",
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%, -50%)",
                          fontSize: 14,
                          fontWeight: 900,
                          color: "#ff4444",
                          textShadow: "0 0 6px rgba(0,0,0,0.9)",
                          pointerEvents: "none",
                          zIndex: 5,
                        }}
                      >
                        {cooldownLeft}
                      </span>
                    )}
                    {/* AP cost badge */}
                    <span
                      style={{
                        position: "absolute",
                        bottom: 2,
                        right: 3,
                        fontSize: 6,
                        fontWeight: 800,
                        color: "#74b9ff",
                        background: "rgba(20,40,100,0.7)",
                        padding: "0 2px",
                        borderRadius: 2,
                        lineHeight: "11px",
                      }}
                    >
                      {Number(spell.apCost)}AP
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>

        {/* Attack Nearest button \u2014 visible during battle in attack mode */}
        {inBattle && (
          <>
            <div
              style={{
                width: 1,
                height: 44,
                background: "rgba(180,20,20,0.3)",
                flexShrink: 0,
              }}
            />
            <button
              type="button"
              data-ocid="spellbar.attack_nearest_button"
              onClick={onAttackNearest}
              disabled={!canAttackNearest}
              title={
                isMobile ? "Attack nearest enemy" : "Attack nearest enemy [S]"
              }
              style={{
                minWidth: isMobile ? 56 : 72,
                height: 54,
                borderRadius: 8,
                background: canAttackNearest
                  ? "rgba(200,30,30,0.32)"
                  : "rgba(60,10,10,0.35)",
                border: canAttackNearest
                  ? "2px solid rgba(255,70,70,0.9)"
                  : "2px solid rgba(140,20,20,0.35)",
                color: canAttackNearest ? "#ff7070" : "rgba(200,80,80,0.3)",
                cursor: canAttackNearest ? "pointer" : "not-allowed",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                flexShrink: 0,
                transition: "all 0.15s",
                boxShadow: canAttackNearest
                  ? "0 0 14px rgba(220,30,30,0.45), inset 0 0 6px rgba(255,60,60,0.1)"
                  : "none",
                position: "relative",
              }}
              onMouseEnter={(e) => {
                if (!canAttackNearest) return;
                (e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(220,40,40,0.5)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  "0 0 20px rgba(240,40,40,0.65)";
              }}
              onMouseLeave={(e) => {
                if (!canAttackNearest) return;
                (e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(200,30,30,0.32)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  "0 0 14px rgba(220,30,30,0.45), inset 0 0 6px rgba(255,60,60,0.1)";
              }}
            >
              <Swords size={16} />
              <span
                style={{
                  fontSize: 7,
                  fontWeight: 800,
                  letterSpacing: "0.04em",
                  lineHeight: 1,
                  textAlign: "center",
                }}
              >
                NEAREST
              </span>
              {!isMobile && (
                <span
                  style={{
                    position: "absolute",
                    top: 3,
                    right: 5,
                    fontSize: 7,
                    fontWeight: 700,
                    color: "rgba(255,120,120,0.55)",
                    letterSpacing: 0,
                    lineHeight: 1,
                  }}
                >
                  S
                </span>
              )}
            </button>
          </>
        )}

        {/* Battle status pill */}
        {inBattle && (
          <div
            data-ocid="spellbar.battle_status"
            className="animate-pulse"
            style={{
              marginLeft: 4,
              padding: "4px 10px",
              borderRadius: 20,
              background: "rgba(220,20,20,0.2)",
              border: "1px solid rgba(220,20,20,0.5)",
              color: "#ff6b6b",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.05em",
              whiteSpace: "nowrap",
            }}
          >
            \u2694\uFE0F BATTLE
          </div>
        )}
      </div>
    </DraggablePanel>
  );
};

export default SpellFooter;
