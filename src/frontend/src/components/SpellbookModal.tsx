import { ArrowLeftRight, Check, TrendingUp, X } from "lucide-react";
import type React from "react";
import { useCallback, useState } from "react";
import {
  SUMMON_AP_PER_LEVELS,
  SUMMON_BASE_HP,
  SUMMON_BASE_HP_DEFAULT,
  SUMMON_HP_PER_LEVEL_PCT,
  SUMMON_LIFESPAN_PER_HALF_LEVEL,
  SUMMON_MP_PER_LEVELS,
  SUMMON_UPGRADE_COST_MULTIPLIER,
} from "../data/gameConstants";
import {
  type TileType,
  computeTargetableTiles,
  spellHighlightRangeBase,
} from "../engine/targeting";
import type { Enemy, SpellConfig } from "../types/gameTypes";

interface SpellbookModalProps {
  allSpells: SpellConfig[];
  activeSpells: SpellConfig[];
  onClose: () => void;
  onSetActiveSpells: (spells: SpellConfig[]) => void;
  dokaBalance?: number;
  spellLevels?: Record<string, number>;
  onUpgradeSpell?: (spellId: string, cost: number) => void;
}

const EFFECT_COLORS: Record<string, string> = {
  damage: "#ff6b6b",
  heal: "#55efc4",
  buff: "#74b9ff",
  debuff: "#a29bfe",
  dot: "#fdcb6e",
  aoe: "#e17055",
  teleport: "#00cec9",
  fire: "#ff6b35",
  ice: "#6ec6e6",
  drain: "#ba55d3",
  poison: "#7cfc00",
  shadow: "#8b008b",
  holy: "#ffd700",
  earth: "#d2691e",
  water: "#1e90ff",
  obliterate: "#fffacd",
  plague_wave: "#3d6b00",
  void_collapse: "#4b0082",
  default: "#b2bec3",
};

const getEffectColor = (effectType: string) =>
  EFFECT_COLORS[effectType?.toLowerCase()] ?? EFFECT_COLORS.default;

/** Get color based on explicit effectType / spellType for range preview */
function getSpellPreviewColor(spell: SpellConfig): string {
  const et = (spell.effectType ?? "").toLowerCase();
  const st = (spell.spellType ?? "").toLowerCase();
  if (et === "damage" || st === "damage") return "#ef4444";
  if (et === "heal" || st === "heal") return "#22c55e";
  if (et === "buff") return "#f59e0b";
  if (et === "debuff") return "#a855f7";
  if (et === "drain") return "#991b1b";
  if (et === "dot") return "#16a34a";
  if (et === "pushback" || et === "attract") return "#3b82f6";
  if (et === "teleport") return "#06b6d4";
  return EFFECT_COLORS[et] ?? EFFECT_COLORS.default;
}

/**
 * Compute highlighted cells for the 9x9 preview grid.
 *
 * #296 unification: the preview now uses the SAME `computeTargetableTiles`
 * geometry that gates castability in WorldExploration, so "what the spellbook
 * shows" === "what the player can actually target". We build a synthetic 9x9
 * grid (all floor, no enemies, no barriers) with the caster at the center
 * (4,4) and `effectiveRange = spellHighlightRangeBase(spell)`. The pure function returns
 * `"x,y"` keys; the preview grid is indexed as `"row,col"` (row=y, col=x), so
 * we translate each key into the preview's row/col space.
 */
function computePreviewCells(spell: SpellConfig): Set<string> {
  const GRID = 9;
  const center = Math.floor(GRID / 2); // 4
  const effectiveRange = spellHighlightRangeBase(spell);

  // Synthetic 9x9 grid: every tile is floor, no enemies, no barriers.
  const tiles: TileType[][] = Array.from({ length: GRID }, () =>
    Array.from({ length: GRID }, () => "floor" as TileType),
  );
  const enemies: Enemy[] = [];
  const barrierTiles = new Map<string, number>();

  const targetable = computeTargetableTiles(
    spell,
    { x: center, y: center },
    {
      tiles,
      enemies,
      worldGridSize: GRID,
      effectiveRange,
      barrierTiles,
    },
  );

  // Translate "x,y" → "row,col" (row=y, col=x) for the preview grid.
  const cells = new Set<string>();
  for (const key of targetable) {
    const [xStr, yStr] = key.split(",");
    const x = Number(xStr);
    const y = Number(yStr);
    if (x >= 0 && x < GRID && y >= 0 && y < GRID) {
      cells.add(`${y},${x}`); // row=y, col=x
    }
  }
  return cells;
}

/** Compact range pattern grid (9x9 flat top-down view) */
const RangePatternGrid: React.FC<{ spell: SpellConfig }> = ({ spell }) => {
  const GRID = 9;
  const CELL = 18;
  const center = Math.floor(GRID / 2); // 4
  const hitSet = computePreviewCells(spell);
  const previewColor = getSpellPreviewColor(spell);
  const targetType = spell.targetType ?? "enemy";
  const range = Number(spell.range ?? 0);

  const subtitle =
    targetType === "self"
      ? "Self target"
      : targetType === "all"
        ? "All targets"
        : targetType === "line"
          ? `Line — ${range} tiles`
          : targetType === "area"
            ? `Area — radius ${spell.areaRadius ?? range}`
            : `Range — ${range} tiles`;

  return (
    <div style={{ marginTop: 8, marginBottom: 6 }}>
      <div
        style={{
          fontSize: 8,
          color: "rgba(255,220,180,0.55)",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.09em",
          marginBottom: 5,
        }}
      >
        Range Preview
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${GRID}, ${CELL}px)`,
          gap: 1,
          background: "rgba(0,0,0,0.4)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 5,
          padding: 4,
          width: "fit-content",
        }}
      >
        {Array.from({ length: GRID }, (_, row) =>
          Array.from({ length: GRID }, (_, col) => {
            const isCenter = row === center && col === center;
            const isHit = hitSet.has(`${row},${col}`);
            const key = `${row}-${col}`;
            return (
              <div
                key={key}
                style={{
                  width: CELL,
                  height: CELL,
                  borderRadius: 2,
                  background: isCenter
                    ? "rgba(255,200,100,0.85)"
                    : isHit
                      ? `${previewColor}cc`
                      : "rgba(255,255,255,0.04)",
                  border: isCenter
                    ? "1.5px solid rgba(255,220,100,0.9)"
                    : isHit
                      ? `1px solid ${previewColor}80`
                      : "1px solid rgba(255,255,255,0.05)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 7,
                  lineHeight: 1,
                  boxShadow:
                    isHit && !isCenter ? `0 0 4px ${previewColor}60` : "none",
                }}
              >
                {isCenter ? "⚔" : ""}
              </div>
            );
          }),
        )}
      </div>
      <div
        style={{
          fontSize: 7,
          color: "rgba(255,200,200,0.3)",
          marginTop: 3,
        }}
      >
        {subtitle}
      </div>
    </div>
  );
};

/**
 * Defensive shape for the optional `summonKit` field on SummonUnitDef.
 * The field is being added to the data layer in a parallel task; this task
 * must compile whether or not that has landed, so we read it via a cast
 * rather than relying on the SummonUnitDef interface declaring it.
 */
type SummonUnitDefWithKit = {
  pieceType?: string;
  level?: number;
  hpScale?: number;
  damageScale?: number;
  ap?: number;
  mp?: number;
  summonKit?: string[];
};

/** Stone-themed compact block showing a summon's kit spells + HP/AP/MP/lifespan.
 * HP/AP/MP chips are always rendered (no `> 0` gating) and reflect spell-level
 * scaling, mirroring the formulas in engine/summonSpawn.ts so the spellbook
 * preview matches the actual spawned unit. */
const SummonAbilitiesBlock: React.FC<{
  spell: SpellConfig;
  allSpells: SpellConfig[];
  spellLevels: Record<string, number>;
}> = ({ spell, allSpells, spellLevels }) => {
  // Defensive read: summonKit may be absent on the type and/or the data.
  const unitDef = spell.summonUnitDef as SummonUnitDefWithKit | undefined;
  const kitIds: string[] = Array.isArray(unitDef?.summonKit)
    ? (unitDef?.summonKit as string[])
    : [];

  // Leveled stats — mirror engine/summonSpawn.ts formulas exactly so the
  // spellbook preview matches the spawned unit. spellLevel defaults to 0.
  const spellLevel = spellLevels[spell.id] ?? 0;
  const lifespan =
    Number(spell.summonLifespan ?? 0) +
    Math.floor(spellLevel / SUMMON_LIFESPAN_PER_HALF_LEVEL);
  const summonAI = spell.summonAI ?? "";
  const baseHp = SUMMON_BASE_HP[summonAI] ?? SUMMON_BASE_HP_DEFAULT;
  const hpScale = unitDef?.hpScale ?? 1;
  const hp = Math.round(
    baseHp * hpScale * (1 + (spellLevel * SUMMON_HP_PER_LEVEL_PCT) / 100),
  );
  const ap = (unitDef?.ap ?? 0) + Math.floor(spellLevel / SUMMON_AP_PER_LEVELS);
  const mp = (unitDef?.mp ?? 0) + Math.floor(spellLevel / SUMMON_MP_PER_LEVELS);

  // Look up each kit spell by id; skip any that aren't in the spellbook.
  const kitSpells = kitIds
    .map((id) => allSpells.find((s) => s.id === id))
    .filter((s): s is SpellConfig => Boolean(s));

  return (
    <div
      data-ocid="spellbook.summon_abilities.panel"
      style={{
        marginTop: 6,
        padding: "7px 8px 8px",
        borderRadius: 6,
        // Stone theme: layered rocky browns/grays, distinct from red spellbook chrome
        background:
          "linear-gradient(180deg, rgba(60,46,36,0.55) 0%, rgba(40,30,24,0.65) 100%)",
        border: "1px solid rgba(140,110,80,0.45)",
        boxShadow:
          "inset 0 1px 0 rgba(200,170,130,0.12), inset 0 0 0 1px rgba(0,0,0,0.25)",
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            fontSize: 9,
            fontWeight: 800,
            color: "rgba(220,200,170,0.85)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          <span style={{ fontSize: 11 }}>🪨</span>
          <span>Summon abilities</span>
        </div>
        {/* Summon stat chips: HP / AP / MP / lifespan — all unconditional */}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: 8,
              fontWeight: 800,
              color: "rgba(230,170,170,0.9)",
              background: "rgba(90,40,40,0.55)",
              border: "1px solid rgba(190,110,110,0.4)",
              padding: "1px 5px",
              borderRadius: 3,
            }}
            title={`Base ${baseHp} × hpScale ${hpScale} × (1 + ${spellLevel}×${SUMMON_HP_PER_LEVEL_PCT}%)`}
          >
            {hp} HP
          </span>
          <span
            style={{
              fontSize: 8,
              fontWeight: 800,
              color: "rgba(180,210,240,0.9)",
              background: "rgba(40,60,90,0.55)",
              border: "1px solid rgba(120,150,190,0.35)",
              padding: "1px 5px",
              borderRadius: 3,
            }}
            title={`Base AP +1 every ${SUMMON_AP_PER_LEVELS} levels`}
          >
            {ap} AP
          </span>
          <span
            style={{
              fontSize: 8,
              fontWeight: 800,
              color: "rgba(170,230,200,0.9)",
              background: "rgba(30,70,55,0.55)",
              border: "1px solid rgba(110,180,150,0.35)",
              padding: "1px 5px",
              borderRadius: 3,
            }}
            title={`Base MP +1 every ${SUMMON_MP_PER_LEVELS} levels`}
          >
            {mp} MP
          </span>
          <span
            style={{
              fontSize: 8,
              fontWeight: 800,
              color: "rgba(230,210,160,0.9)",
              background: "rgba(80,65,40,0.55)",
              border: "1px solid rgba(160,140,90,0.4)",
              padding: "1px 5px",
              borderRadius: 3,
            }}
            title={`Base ${Number(spell.summonLifespan ?? 0)} + floor(level/${SUMMON_LIFESPAN_PER_HALF_LEVEL}) extra turns per spell level`}
          >
            ⏳ {lifespan} turns
          </span>
        </div>
      </div>

      {/* Kit spell list — or empty hint */}
      {kitSpells.length === 0 ? (
        <div
          style={{
            fontSize: 9,
            color: "rgba(200,180,150,0.45)",
            fontStyle: "italic",
            padding: "2px 0",
          }}
        >
          This summon has no specialized kit — it relies on its base attack.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {kitSpells.map((kitSpell, i) => (
            <div
              key={kitSpell.id}
              data-ocid={`spellbook.summon_abilities.item.${i + 1}`}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 6,
                padding: "4px 5px",
                borderRadius: 4,
                background: "rgba(20,16,12,0.45)",
                border: "1px solid rgba(120,95,65,0.3)",
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  lineHeight: 1,
                  flexShrink: 0,
                  width: 18,
                  textAlign: "center",
                }}
              >
                {kitSpell.iconEmoji || "🔮"}
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "rgba(230,215,185,0.95)",
                    lineHeight: 1.2,
                  }}
                >
                  {kitSpell.name}
                </div>
                <div
                  style={{
                    fontSize: 8,
                    color: "rgba(200,180,150,0.6)",
                    lineHeight: 1.3,
                    marginTop: 1,
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitBoxOrient: "vertical",
                    WebkitLineClamp: 1,
                  }}
                >
                  {kitSpell.description}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/** Doka cost to upgrade from currentLevel → currentLevel+1.
 * Summon spells (isSummon && summonUnitDef) cost 10× the normal base, then
 * double per level: SUMMON_UPGRADE_COST_MULTIPLIER * 10 * 2^currentLevel.
 * Non-summon spells keep the original 10 * 2^currentLevel. */
function upgradeCost(currentLevel: number, spell?: SpellConfig): number {
  if (spell?.isSummon && spell.summonUnitDef) {
    return SUMMON_UPGRADE_COST_MULTIPLIER * 10 * 2 ** currentLevel;
  }
  return 10 * 2 ** currentLevel;
}

/** Damage multiplier at a given spell level */
function leveledDamage(baseDamage: number, spellLevel: number): number {
  return Math.round(baseDamage * 1.03 ** spellLevel);
}

const MAX_ACTIVE_SLOTS = 8;

const SpellbookModal: React.FC<SpellbookModalProps> = ({
  allSpells,
  activeSpells,
  onClose,
  onSetActiveSpells,
  dokaBalance = 0,
  spellLevels = {},
  onUpgradeSpell,
}) => {
  // Local copy of active slots we're editing (up to 8)
  const [draft, setDraft] = useState<(SpellConfig | null)[]>(() => {
    const slots: (SpellConfig | null)[] = Array(MAX_ACTIVE_SLOTS).fill(null);
    activeSpells.slice(0, MAX_ACTIVE_SLOTS).forEach((s, i) => {
      slots[i] = s;
    });
    return slots;
  });
  // Which slot is being targeted for replacement (-1 = none)
  const [targetSlot, setTargetSlot] = useState<number>(-1);
  // Which spell is highlighted for placement
  const [selectedSpellId, setSelectedSpellId] = useState<string | null>(null);
  // Confirm swap modal
  const [pendingSwap, setPendingSwap] = useState<{
    slotIndex: number;
    spell: SpellConfig;
  } | null>(null);
  // Which spell card is expanded for upgrade view
  const [expandedSpellId, setExpandedSpellId] = useState<string | null>(null);
  // Which spell card is showing range preview
  const [previewSpellId, setPreviewSpellId] = useState<string | null>(null);

  const handleSpellClick = (spell: SpellConfig) => {
    if (targetSlot >= 0) {
      setPendingSwap({ slotIndex: targetSlot, spell });
    } else {
      const wasSelected = spell.id === selectedSpellId;
      setSelectedSpellId(wasSelected ? null : spell.id);
      setPreviewSpellId(wasSelected ? null : spell.id);
    }
  };

  // suppress unused warning — useCallback stabilizes the reference
  const _togglePreview = useCallback(
    (spellId: string) =>
      setPreviewSpellId((p) => (p === spellId ? null : spellId)),
    [],
  );
  void _togglePreview;

  const handleSlotClick = (slotIndex: number) => {
    if (selectedSpellId) {
      const spell = allSpells.find((s) => s.id === selectedSpellId);
      if (spell) {
        setPendingSwap({ slotIndex, spell });
      }
    } else {
      setTargetSlot(targetSlot === slotIndex ? -1 : slotIndex);
    }
  };

  const confirmSwap = () => {
    if (!pendingSwap) return;
    const newDraft = [...draft];
    newDraft[pendingSwap.slotIndex] = pendingSwap.spell;
    setDraft(newDraft);
    setPendingSwap(null);
    setTargetSlot(-1);
    setSelectedSpellId(null);
  };

  const cancelSwap = () => {
    setPendingSwap(null);
  };

  const handleConfirmAll = () => {
    const padded = Array.from(
      { length: 8 },
      (_, i) => draft[i] ?? null,
    ) as (SpellConfig | null)[];
    onSetActiveSpells(padded.filter((s): s is SpellConfig => s !== null));
    onClose();
  };

  const isInActive = (spellId: string) => draft.some((s) => s?.id === spellId);

  return (
    <div
      data-ocid="spellbook.dialog"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9600,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(5,3,15,0.85)",
        backdropFilter: "blur(4px)",
        pointerEvents: "auto",
      }}
      tabIndex={-1}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        style={{
          width: "min(780px, 97vw)",
          maxHeight: "min(90vh, 90dvh)",
          background: "linear-gradient(180deg, #120810 0%, #0d060e 100%)",
          border: "2px solid rgba(180,20,20,0.7)",
          borderRadius: 10,
          boxShadow:
            "0 0 60px rgba(180,20,20,0.3), 0 24px 80px rgba(0,0,0,0.8)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            borderBottom: "1px solid rgba(180,20,20,0.4)",
            background: "rgba(180,20,20,0.08)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>📖</span>
            <span
              style={{
                color: "#ff8a8a",
                fontWeight: 800,
                fontSize: 15,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Spellbook
            </span>
            <span
              style={{
                fontSize: 10,
                color: "rgba(255,180,180,0.5)",
                fontWeight: 500,
              }}
            >
              — {allSpells.length} spells available
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Doka balance display */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                background: "rgba(241,196,15,0.1)",
                border: "1px solid rgba(241,196,15,0.3)",
                borderRadius: 5,
                padding: "3px 8px",
              }}
            >
              <span style={{ fontSize: 10 }}>💰</span>
              <span
                style={{
                  color: "#f1c40f",
                  fontWeight: 800,
                  fontSize: 11,
                  fontFamily: "monospace",
                }}
              >
                {dokaBalance.toLocaleString()} Doka
              </span>
            </div>
            <button
              type="button"
              data-ocid="spellbook.close_button"
              onClick={onClose}
              aria-label="Close spellbook"
              className="stone-modal-close"
              style={{
                background: "rgba(180,20,20,0.15)",
                border: "1px solid rgba(180,20,20,0.4)",
                color: "#ff6b6b",
                width: 28,
                height: 28,
                borderRadius: 6,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Active slots row — 8 slots */}
        <div
          style={{
            padding: "10px 16px",
            borderBottom: "1px solid rgba(180,20,20,0.25)",
            background: "rgba(180,20,20,0.04)",
          }}
        >
          <div
            style={{
              fontSize: 9,
              color: "rgba(255,180,180,0.5)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              fontWeight: 700,
              marginBottom: 8,
            }}
          >
            ⚔️ Active Spells — click a slot to replace (max 8)
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {Array.from({ length: MAX_ACTIVE_SLOTS }, (_, slotIndex) => {
              const spell = draft[slotIndex];
              const isTargeted = targetSlot === slotIndex;
              return (
                <button
                  type="button"
                  data-ocid={`spellbook.slot.${slotIndex + 1}`}
                  // biome-ignore lint/suspicious/noArrayIndexKey: static fixed-size list
                  key={slotIndex}
                  onClick={() => handleSlotClick(slotIndex)}
                  title={
                    spell
                      ? `Slot ${slotIndex + 1}: ${spell.name} — click to replace`
                      : `Empty slot ${slotIndex + 1} — click a spell below to add`
                  }
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 8,
                    background: isTargeted
                      ? "rgba(220,30,30,0.25)"
                      : spell
                        ? "rgba(80,15,15,0.5)"
                        : "rgba(255,255,255,0.03)",
                    border: isTargeted
                      ? "2px solid rgba(255,80,80,0.9)"
                      : spell
                        ? "2px solid rgba(180,20,20,0.55)"
                        : "2px dashed rgba(180,20,20,0.25)",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 3,
                    position: "relative",
                    transition: "all 0.15s",
                    boxShadow: isTargeted
                      ? "0 0 18px rgba(255,60,60,0.45)"
                      : "none",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: 3,
                      left: 5,
                      fontSize: 8,
                      color: "rgba(255,255,255,0.4)",
                      fontWeight: 700,
                    }}
                  >
                    {slotIndex + 1}
                  </span>
                  {isTargeted && (
                    <span style={{ fontSize: 16 }}>
                      <ArrowLeftRight size={14} color="#ff6b6b" />
                    </span>
                  )}
                  {!isTargeted && spell && (
                    <>
                      <span style={{ fontSize: 20 }}>
                        {spell.iconEmoji || "🔮"}
                      </span>
                      <span
                        style={{
                          fontSize: 6,
                          color: "rgba(255,220,220,0.75)",
                          textAlign: "center",
                          maxWidth: 52,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontWeight: 700,
                        }}
                      >
                        {spell.name}
                      </span>
                    </>
                  )}
                  {!isTargeted && !spell && (
                    <span style={{ fontSize: 20, opacity: 0.15 }}>✦</span>
                  )}
                </button>
              );
            })}
          </div>
          {(targetSlot >= 0 || selectedSpellId) && (
            <div
              style={{
                marginTop: 8,
                fontSize: 10,
                color: "#fdcb6e",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <ArrowLeftRight size={10} />
              {targetSlot >= 0
                ? `Slot ${targetSlot + 1} selected — click a spell below to place it`
                : "Spell selected — click a slot above to place it"}
            </div>
          )}
        </div>

        {/* All spells grid */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "12px 16px",
          }}
          className="dofus-scrollbar"
        >
          {allSpells.length === 0 ? (
            <div
              data-ocid="spellbook.empty_state"
              style={{
                textAlign: "center",
                padding: "40px 20px",
                color: "rgba(255,180,180,0.4)",
                fontSize: 13,
              }}
            >
              <div style={{ fontSize: 36, marginBottom: 12 }}>📖</div>
              <div style={{ fontWeight: 700 }}>No spells available</div>
              <div style={{ fontSize: 11, marginTop: 6, opacity: 0.7 }}>
                The admin has not added any spells yet
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                gap: 8,
              }}
            >
              {allSpells.map((spell, idx) => {
                const active = isInActive(spell.id);
                const isHighlighted = spell.id === selectedSpellId;
                const effectColor = getEffectColor(spell.effectType);
                const spellLevel = spellLevels[spell.id] ?? 0;
                const cost = upgradeCost(spellLevel, spell);
                const baseDmg = Number(spell.damage);
                const currentDmg = leveledDamage(baseDmg, spellLevel);
                const nextDmg = leveledDamage(baseDmg, spellLevel + 1);
                const canAfford = dokaBalance >= cost;
                const isExpanded = expandedSpellId === spell.id;

                return (
                  <div
                    key={spell.id}
                    data-ocid={`spellbook.spell.${idx + 1}`}
                    style={{
                      background: isHighlighted
                        ? "rgba(220,30,30,0.2)"
                        : active
                          ? "rgba(180,20,20,0.12)"
                          : "rgba(255,255,255,0.025)",
                      border: isHighlighted
                        ? "2px solid rgba(255,80,80,0.8)"
                        : active
                          ? "1px solid rgba(180,20,20,0.5)"
                          : "1px solid rgba(255,255,255,0.07)",
                      borderRadius: 8,
                      overflow: "hidden",
                      transition: "all 0.15s",
                      boxShadow: isHighlighted
                        ? "0 0 14px rgba(255,60,60,0.35)"
                        : "none",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleSpellClick(spell)}
                      title={`${spell.name}: ${spell.description}`}
                      style={{
                        width: "100%",
                        padding: "10px 8px 8px",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        gap: 4,
                        textAlign: "left",
                        background: "transparent",
                        border: "none",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          width: "100%",
                        }}
                      >
                        <span style={{ fontSize: 22 }}>
                          {spell.iconEmoji || "🔮"}
                        </span>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          {spellLevel > 0 && (
                            <span
                              style={{
                                fontSize: 8,
                                color: "#f1c40f",
                                fontWeight: 800,
                                background: "rgba(241,196,15,0.15)",
                                border: "1px solid rgba(241,196,15,0.35)",
                                padding: "1px 4px",
                                borderRadius: 3,
                              }}
                            >
                              Lv{spellLevel}
                            </span>
                          )}
                          {active && (
                            <span
                              style={{
                                fontSize: 8,
                                color: "#ff8a8a",
                                fontWeight: 700,
                                background: "rgba(180,20,20,0.3)",
                                border: "1px solid rgba(180,20,20,0.5)",
                                padding: "1px 5px",
                                borderRadius: 3,
                              }}
                            >
                              ACTIVE
                            </span>
                          )}
                        </div>
                      </div>
                      <div
                        style={{
                          color: "rgba(255,230,230,0.9)",
                          fontWeight: 700,
                          fontSize: 11,
                          lineHeight: 1.2,
                        }}
                      >
                        {spell.name}
                      </div>
                      <div
                        style={{
                          color: "rgba(255,200,200,0.45)",
                          fontSize: 9,
                          lineHeight: 1.3,
                          overflow: "hidden",
                          display: "-webkit-box",
                          WebkitBoxOrient: "vertical",
                          WebkitLineClamp: 2,
                        }}
                      >
                        {spell.description}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: 5,
                          flexWrap: "wrap",
                          marginTop: 2,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 8,
                            fontWeight: 800,
                            color: "#74b9ff",
                            background: "rgba(20,40,100,0.6)",
                            padding: "1px 5px",
                            borderRadius: 3,
                          }}
                        >
                          {Number(spell.apCost)} AP
                        </span>
                        {Number(spell.mpCost) > 0 && (
                          <span
                            style={{
                              fontSize: 8,
                              fontWeight: 800,
                              color: "#55efc4",
                              background: "rgba(20,80,50,0.6)",
                              padding: "1px 5px",
                              borderRadius: 3,
                            }}
                          >
                            {Number(spell.mpCost)} MP
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: 8,
                            fontWeight: 700,
                            color: effectColor,
                            background: `${effectColor}18`,
                            border: `1px solid ${effectColor}40`,
                            padding: "1px 5px",
                            borderRadius: 3,
                            textTransform: "capitalize",
                          }}
                        >
                          {spell.effectType}
                        </span>
                        <span
                          style={{
                            fontSize: 8,
                            color: "rgba(255,200,200,0.45)",
                            padding: "1px 4px",
                          }}
                        >
                          🗡 {currentDmg} dmg · 📡 {Number(spell.range)}
                        </span>
                        {(spell.hitTiles ?? []).length > 0 && (
                          <span
                            style={{
                              fontSize: 8,
                              color: "#e17055",
                              background: "rgba(225,112,85,0.12)",
                              border: "1px solid rgba(225,112,85,0.35)",
                              padding: "1px 4px",
                              borderRadius: 3,
                            }}
                          >
                            AoE
                          </span>
                        )}
                      </div>
                    </button>

                    {/* Range pattern preview — shown when spell is selected */}
                    {previewSpellId === spell.id && (
                      <div
                        style={{
                          padding: "0 8px 8px",
                          borderTop: "1px solid rgba(255,200,100,0.12)",
                          background: "rgba(0,0,0,0.2)",
                        }}
                      >
                        <RangePatternGrid spell={spell} />
                      </div>
                    )}

                    {/* Summon abilities — kit spells + HP/AP/MP/lifespan (stone-themed) */}
                    {spell.isSummon && spell.summonUnitDef && (
                      <div style={{ padding: "0 8px 8px" }}>
                        <SummonAbilitiesBlock
                          spell={spell}
                          allSpells={allSpells}
                          spellLevels={spellLevels}
                        />
                      </div>
                    )}

                    {/* Spell upgrade section */}
                    {onUpgradeSpell && (
                      <div
                        style={{
                          borderTop: "1px solid rgba(180,20,20,0.2)",
                          background: "rgba(0,0,0,0.25)",
                        }}
                      >
                        <button
                          type="button"
                          data-ocid={`spellbook.upgrade_toggle.${idx + 1}`}
                          onClick={() =>
                            setExpandedSpellId(isExpanded ? null : spell.id)
                          }
                          style={{
                            width: "100%",
                            padding: "5px 8px",
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            color: "rgba(241,196,15,0.7)",
                            fontSize: 9,
                            fontWeight: 700,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <TrendingUp size={10} />
                            <span>Upgrade</span>
                          </div>
                          <span
                            style={{
                              fontSize: 9,
                              color: "rgba(241,196,15,0.5)",
                            }}
                          >
                            {cost.toLocaleString()} 💰
                          </span>
                        </button>

                        {isExpanded && (
                          <div
                            style={{
                              padding: "6px 8px 8px",
                              borderTop: "1px solid rgba(180,20,20,0.15)",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginBottom: 6,
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 9,
                                  color: "rgba(255,200,200,0.6)",
                                }}
                              >
                                <div>
                                  Current Lv:{" "}
                                  <strong style={{ color: "#f1c40f" }}>
                                    {spellLevel}
                                  </strong>
                                </div>
                                <div>
                                  DMG:{" "}
                                  <strong style={{ color: "#ff6b6b" }}>
                                    {currentDmg}
                                  </strong>{" "}
                                  →{" "}
                                  <strong style={{ color: "#55efc4" }}>
                                    {nextDmg}
                                  </strong>
                                </div>
                              </div>
                              <div
                                style={{
                                  textAlign: "right",
                                  fontSize: 9,
                                  color: "rgba(255,200,200,0.6)",
                                }}
                              >
                                <div>
                                  Your Doka:{" "}
                                  <strong style={{ color: "#f1c40f" }}>
                                    {dokaBalance.toLocaleString()}
                                  </strong>
                                </div>
                                <div>
                                  Cost:{" "}
                                  <strong
                                    style={{
                                      color: canAfford ? "#55efc4" : "#ff6b6b",
                                    }}
                                  >
                                    {cost.toLocaleString()}
                                  </strong>
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              data-ocid={`spellbook.upgrade_button.${idx + 1}`}
                              disabled={!canAfford}
                              onClick={() => {
                                if (canAfford && onUpgradeSpell) {
                                  onUpgradeSpell(spell.id, cost);
                                }
                              }}
                              style={{
                                width: "100%",
                                padding: "5px 8px",
                                borderRadius: 5,
                                background: canAfford
                                  ? "rgba(241,196,15,0.2)"
                                  : "rgba(60,60,60,0.3)",
                                border: canAfford
                                  ? "1px solid rgba(241,196,15,0.6)"
                                  : "1px solid rgba(100,100,100,0.3)",
                                color: canAfford
                                  ? "#f1c40f"
                                  : "rgba(255,200,200,0.3)",
                                cursor: canAfford ? "pointer" : "not-allowed",
                                fontSize: 10,
                                fontWeight: 800,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 5,
                                letterSpacing: "0.04em",
                              }}
                            >
                              <TrendingUp size={11} />
                              {canAfford
                                ? `Upgrade for ${cost.toLocaleString()} Doka`
                                : "Not enough Doka"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div
          style={{
            padding: "12px 16px",
            borderTop: "1px solid rgba(180,20,20,0.3)",
            background: "rgba(180,20,20,0.04)",
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
          }}
        >
          <button
            type="button"
            data-ocid="spellbook.cancel_button"
            onClick={onClose}
            style={{
              padding: "8px 18px",
              borderRadius: 6,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,200,200,0.55)",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            data-ocid="spellbook.confirm_button"
            onClick={handleConfirmAll}
            style={{
              padding: "8px 22px",
              borderRadius: 6,
              background: "rgba(180,20,20,0.3)",
              border: "2px solid rgba(180,20,20,0.7)",
              color: "#ff8a8a",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 6,
              boxShadow: "0 0 12px rgba(180,20,20,0.2)",
            }}
          >
            <Check size={13} />
            Save Spells
          </button>
        </div>
      </div>

      {/* Confirm swap overlay */}
      {pendingSwap && (
        <div
          data-ocid="spellbook.confirm_swap.dialog"
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(5,3,15,0.7)",
          }}
        >
          <div
            style={{
              background: "linear-gradient(180deg, #150a0a 0%, #0d0608 100%)",
              border: "2px solid rgba(180,20,20,0.8)",
              borderRadius: 10,
              padding: "24px 28px",
              maxWidth: 360,
              width: "90%",
              textAlign: "center",
              boxShadow: "0 0 40px rgba(180,20,20,0.3)",
            }}
          >
            <div style={{ fontSize: 30, marginBottom: 8 }}>
              {pendingSwap.spell.iconEmoji || "🔮"}
            </div>
            <div
              style={{
                color: "#ff8a8a",
                fontWeight: 800,
                fontSize: 14,
                marginBottom: 4,
              }}
            >
              Replace spell?
            </div>
            <div
              style={{
                color: "rgba(255,200,200,0.6)",
                fontSize: 11,
                marginBottom: 20,
                lineHeight: 1.5,
              }}
            >
              Replace slot {pendingSwap.slotIndex + 1} with{" "}
              <strong style={{ color: "#ff8a8a" }}>
                {pendingSwap.spell.name}
              </strong>
              ?
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button
                type="button"
                data-ocid="spellbook.confirm_swap.cancel_button"
                onClick={cancelSwap}
                style={{
                  padding: "7px 18px",
                  borderRadius: 6,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,200,200,0.55)",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                data-ocid="spellbook.confirm_swap.confirm_button"
                onClick={confirmSwap}
                style={{
                  padding: "7px 18px",
                  borderRadius: 6,
                  background: "rgba(180,20,20,0.35)",
                  border: "2px solid rgba(180,20,20,0.8)",
                  color: "#ff8a8a",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                Yes, replace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpellbookModal;
