import React from "react";
import type { SpellConfig } from "../types/gameTypes";
import DraggablePanel from "./DraggablePanel";

export interface CombatantEntry {
  id: string;
  /** Turn-route discriminator: "player" for the human player, "enemy"
   * for AI-controlled hostiles (including enemy-side summons), "summon"
   * for player-side summons. The enemy-AI effect gates on type ===
   * "enemy". Player-side summons must not be "player" or they take the
   * player route. */
  type: "player" | "enemy" | "summon";
  initiative: number;
  name: string;
  pieceIcon: string;
  hp: number;
  maxHp: number;
  level: number;
  /** Chess piece type for enemy rendering */
  pieceType?: string;
  /** Enemy's assigned spells */
  spells?: SpellConfig[];
  /** True if this enemy is the designated group leader */
  isLeader?: boolean;
  /** Number of non-leader allies that have died (each stacks a stat boost on the leader) */
  leaderBoostCount?: number;
  /** True if this combatant is a boss */
  isBoss?: boolean;
  /** Boss ID (from BOSS_IDS) for boss combatants */
  bossId?: string;
  /** Current boss phase (1 or 2) */
  currentBossPhase?: 1 | 2;
  /** Side in combat: player or enemy. Summons belong to a side; the
   * `type` field (above) is what discriminates the turn route. */
  side?: "player" | "enemy";
  /** True if this unit is a summoned ally */
  isSummon?: boolean;
  /** AI behavior kind for summoned units */
  summonAI?: string;
  /** Owner combatant id for summons */
  ownerId?: string;
  /** Turns remaining before summon fades */
  turnsRemaining?: number;
}

interface InitiativeStripProps {
  turnOrder: CombatantEntry[];
  currentTurnIndex: number;
  battlePhase: "player" | "enemy";
  battleTurn: number;
  turnTimeLeft?: number;
  userId?: string;
}

const PIECE_SYMBOLS: Record<string, string> = {
  king: "\u265A",
  queen: "\u265B",
  rook: "\u265C",
  bishop: "\u265D",
  knight: "\u265E",
  pawn: "\u265F",
};

/** Map enemy name keywords (case-insensitive) to unique emoji icons */
const ENEMY_ICONS: Array<[RegExp, string]> = [
  [/goblin/i, "\uD83D\uDC7A"], // 👺
  [/vampire|vamp/i, "\uD83E\uDDDB"], // 🧛
  [/orc/i, "\uD83D\uDC79"], // 👹
  [/knight/i, "\u2694\uFE0F"], // ⚔️
  [/mage|wizard|witch/i, "\uD83D\uDD2E"], // 🔮
  [/skeleton|undead/i, "\uD83D\uDC80"], // 💀
  [/boss|lord|king/i, "\uD83D\uDC51"], // 👑
  [/dragon/i, "\uD83D\uDC09"], // 🐉
  [/wolf|werewolf/i, "\uD83D\uDC3A"], // 🐺
  [/spider|scorpion/i, "\uD83D\uDD77\uFE0F"], // 🕷️
  [/bat/i, "\uD83E\uDD87"], // 🦇
  [/ghost|spirit/i, "\uD83D\uDC7B"], // 👻
  [/demon|devil/i, "\uD83D\uDC7F"], // 👿
  [/robot|golem|construct/i, "\uD83E\uDD16"], // 🤖
  [/troll/i, "\uD83D\uDC79"], // 👹
];

function getEnemyIcon(name: string, pieceType?: string): string {
  for (const [pattern, icon] of ENEMY_ICONS) {
    if (pattern.test(name)) return icon;
  }
  // Fallback: use piece-based symbol if defined, else alien
  return pieceType
    ? (PIECE_SYMBOLS[pieceType] ?? "\uD83D\uDC7E")
    : "\uD83D\uDC7E"; // 👾
}

const InitiativeStrip: React.FC<InitiativeStripProps> = ({
  turnOrder,
  currentTurnIndex,
  battlePhase,
  battleTurn,
  turnTimeLeft = 30,
  userId,
}) => {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  // A4d: Local state for the countdown so timer re-renders don't ripple through memo
  const [localTimeLeft, setLocalTimeLeft] = React.useState(turnTimeLeft);
  React.useEffect(() => {
    setLocalTimeLeft(turnTimeLeft);
  }, [turnTimeLeft]);

  const handleCardClick = (id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  };

  if (turnOrder.length === 0) return null;

  // Row-wrap threshold: ~8 entries per row. When the entry count exceeds this,
  // the strip wraps into a second row (chronological order left→right, top row
  // first). As combatants die/expire the count drops and the strip re-flows
  // back to one row automatically via flex-wrap.
  const ROW_THRESHOLD = 8;
  const isCompact = turnOrder.length > ROW_THRESHOLD;

  return (
    <DraggablePanel
      panelId="initiative-strip"
      title="Turn Order"
      userId={userId}
      defaultPosition={{ x: 4, y: Math.max(80, window.innerHeight / 2 - 200) }}
      defaultFolded={false}
      zIndex={200}
      style={{ width: 70 }}
    >
      <div
        data-ocid="initiative.strip"
        className="stone-well"
        style={{
          width: 62,
          maxHeight: "70vh",
          overflowY: "auto",
          display: "flex",
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: isCompact ? 2 : 4,
          padding: "6px 4px",
          scrollbarWidth: "none",
        }}
      >
        {/* Phase indicator */}
        <div
          data-ocid="initiative.phase_indicator"
          className={
            battlePhase === "player" ? "stone-pill-crimson" : "stone-well"
          }
          style={{
            textAlign: "center",
            padding: "5px 3px",
            borderRadius: 6,
            marginBottom: 2,
            width: "100%",
            flexBasis: "100%",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              fontSize: 16,
              lineHeight: 1,
              marginBottom: 2,
              filter:
                battlePhase === "player"
                  ? "drop-shadow(0 0 4px rgba(255,80,80,0.8))"
                  : "none",
            }}
          >
            {battlePhase === "player" ? "\u2694\uFE0F" : "\uD83D\uDC80"}
          </div>
          <div
            style={{
              fontSize: 7,
              fontWeight: 900,
              letterSpacing: "0.1em",
              color:
                battlePhase === "player"
                  ? "rgba(255,140,140,0.95)"
                  : "rgba(200,80,80,0.8)",
              textTransform: "uppercase",
              lineHeight: 1,
            }}
          >
            {battlePhase === "player" ? "YOUR" : "ENEMY"}
          </div>
          <div
            style={{
              fontSize: 6,
              color:
                battlePhase === "player"
                  ? "rgba(255,160,160,0.7)"
                  : "rgba(160,60,60,0.7)",
              fontWeight: 700,
              marginTop: 1,
            }}
          >
            TURN
          </div>
          {/* Countdown timer */}
          <div
            data-ocid="initiative.timer"
            style={{
              marginTop: 3,
              padding: "2px 6px",
              borderRadius: 4,
              background:
                localTimeLeft <= 7
                  ? "rgba(180,10,10,0.5)"
                  : localTimeLeft <= 15
                    ? "rgba(180,120,0,0.45)"
                    : "rgba(0,100,40,0.4)",
              border:
                localTimeLeft <= 7
                  ? "1px solid rgba(255,60,60,0.7)"
                  : localTimeLeft <= 15
                    ? "1px solid rgba(241,196,15,0.5)"
                    : "1px solid rgba(39,174,96,0.5)",
              color:
                localTimeLeft <= 7
                  ? "#ff6b6b"
                  : localTimeLeft <= 15
                    ? "#f1c40f"
                    : "#2ecc71",
              fontSize: 13,
              fontWeight: 900,
              letterSpacing: "0.04em",
              textAlign: "center",
              minWidth: 34,
              fontVariantNumeric: "tabular-nums",
              animation:
                localTimeLeft <= 7 ? "pulse 0.6s ease-in-out infinite" : "none",
            }}
          >
            {localTimeLeft}s
          </div>
        </div>

        {/* Turn counter */}
        <div
          style={{
            textAlign: "center",
            fontSize: 7,
            fontWeight: 800,
            letterSpacing: "0.1em",
            color: "rgba(200,80,80,0.65)",
            textTransform: "uppercase",
            paddingBottom: 3,
            borderBottom: "1px solid rgba(139,0,0,0.4)",
            marginBottom: 2,
            width: "100%",
            flexBasis: "100%",
            boxSizing: "border-box",
          }}
        >
          TURN {battleTurn}
        </div>

        {turnOrder.map((combatant, index) => {
          const isActive = index === currentTurnIndex;
          const isPlayer = combatant.type === "player";
          const isLeader = !isPlayer && combatant.isLeader === true;
          const hpPct = Math.max(
            0,
            Math.min(100, (combatant.hp / combatant.maxHp) * 100),
          );
          const enemySymbol = getEnemyIcon(combatant.name, combatant.pieceType);
          const isSelected = selectedId === combatant.id;
          const extraStats = combatant as CombatantEntry & {
            ap?: number;
            mp?: number;
            atk?: number;
            res?: number;
            sp?: number;
            chc?: number;
            spells?: unknown[];
            enraged?: boolean;
          };

          return (
            <div
              key={combatant.id}
              data-ocid={`initiative.item.${index + 1}`}
              style={{
                position: "relative",
                cursor: !isPlayer ? "pointer" : "default",
              }}
              onClick={() => {
                if (!isPlayer) handleCardClick(combatant.id);
              }}
              onKeyDown={(e) => {
                if (!isPlayer && (e.key === "Enter" || e.key === " "))
                  handleCardClick(combatant.id);
              }}
              role={!isPlayer ? "button" : undefined}
              tabIndex={!isPlayer ? 0 : undefined}
            >
              <div
                className={
                  isActive
                    ? isLeader
                      ? "stone-pill-gold"
                      : "stone-pill-crimson"
                    : "stone-well"
                }
                style={{
                  width: isCompact ? 46 : 54,
                  height: isCompact ? 54 : 62,
                  borderRadius: 7,
                  transform: isActive
                    ? isCompact
                      ? "scale(1.06)"
                      : "scale(1.07)"
                    : isCompact
                      ? "scale(0.95)"
                      : "scale(0.96)",
                  opacity: isActive ? 1 : 0.6,
                  transition: "all 0.25s ease",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "4px 3px 4px",
                  cursor: "default",
                  overflow: "hidden",
                }}
              >
                {/* Active pulse dot */}
                {isActive && (
                  <div
                    style={{
                      position: "absolute",
                      top: 3,
                      right: 3,
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: isPlayer ? "#ff4444" : "#880000",
                      boxShadow: "0 0 6px rgba(255,50,50,0.8)",
                      border: "1px solid rgba(255,255,255,0.25)",
                      animation: "pulse 1s ease-in-out infinite",
                      zIndex: 1,
                    }}
                  />
                )}

                {/* Enraged badge */}
                {extraStats.enraged && (
                  <div
                    style={{
                      position: "absolute",
                      top: 1,
                      left: 1,
                      fontSize: 8,
                      background: "rgba(255,50,0,0.85)",
                      borderRadius: 3,
                      padding: "0px 2px",
                      fontWeight: 900,
                      color: "#fff",
                      letterSpacing: 0,
                      zIndex: 2,
                    }}
                  >
                    \uD83D\uDD25
                  </div>
                )}

                {/* Leader crown badge — top right */}
                {isLeader && (
                  <div
                    data-ocid="initiative.leader_crown"
                    style={{
                      position: "absolute",
                      top: 1,
                      right: isActive ? 14 : 3,
                      fontSize: 9,
                      lineHeight: 1,
                      zIndex: 3,
                      filter: "drop-shadow(0 0 3px rgba(255,210,0,0.9))",
                    }}
                    title="Leader — gains strength from ally deaths"
                  >
                    \uD83D\uDC51
                  </div>
                )}

                {/* Chess piece icon */}
                <div
                  style={{
                    fontSize: isCompact ? 18 : 22,
                    lineHeight: 1,
                    color: isPlayer
                      ? isActive
                        ? "#ffcccc"
                        : "rgba(220,160,160,0.75)"
                      : isLeader
                        ? isActive
                          ? "#ffd700"
                          : "rgba(255,200,0,0.7)"
                        : isActive
                          ? "#ff8888"
                          : "rgba(200,100,100,0.6)",
                    filter: isActive
                      ? isLeader
                        ? "drop-shadow(0 0 5px rgba(255,200,0,0.8))"
                        : "drop-shadow(0 0 5px rgba(255,100,100,0.75))"
                      : "none",
                  }}
                >
                  {isPlayer ? combatant.pieceIcon : enemySymbol}
                </div>

                {/* Name */}
                <div
                  style={{
                    fontSize: 7,
                    fontWeight: 700,
                    color: isPlayer
                      ? isActive
                        ? "#ffaaaa"
                        : "rgba(200,150,150,0.65)"
                      : isLeader
                        ? isActive
                          ? "#ffd700"
                          : "rgba(255,190,0,0.65)"
                        : isActive
                          ? "#ff7777"
                          : "rgba(180,80,80,0.55)",
                    letterSpacing: "0.04em",
                    textAlign: "center",
                    lineHeight: 1,
                    maxWidth: isCompact ? 42 : 50,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {isPlayer ? "YOU" : combatant.name.slice(0, 4).toUpperCase()}
                </div>

                {/* Initiative */}
                <div
                  style={{
                    fontSize: 7,
                    color: "rgba(255,180,80,0.75)",
                    fontWeight: 700,
                    lineHeight: 1,
                  }}
                >
                  \u26A1{combatant.initiative}
                </div>

                {/* HP bar for enemies */}
                {!isPlayer && (
                  <div
                    style={{
                      width: isCompact ? 38 : 46,
                      height: 3,
                      background: "rgba(255,255,255,0.1)",
                      borderRadius: 2,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${hpPct}%`,
                        background: isLeader
                          ? hpPct > 50
                            ? "#f1c40f"
                            : hpPct > 25
                              ? "#e67e22"
                              : "#e74c3c"
                          : hpPct > 50
                            ? "#27ae60"
                            : hpPct > 25
                              ? "#e67e22"
                              : "#e74c3c",
                        borderRadius: 2,
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>
                )}

                {/* Lifespan pip for summons — counts down as turnsRemaining
                    decreases (decrementSummonLifespan in summonIntegration.ts).
                    Stone-themed amber chip to match the spellbook lifespan chip. */}
                {combatant.isSummon && combatant.turnsRemaining != null && (
                  <div
                    data-ocid={`initiative.lifespan.${index + 1}`}
                    title={`Summon persists ${combatant.turnsRemaining} more turn${combatant.turnsRemaining === 1 ? "" : "s"}`}
                    style={{
                      marginTop: 2,
                      fontSize: 7,
                      fontWeight: 800,
                      lineHeight: 1,
                      color: "rgba(230,210,160,0.95)",
                      background: "rgba(80,65,40,0.7)",
                      border: "1px solid rgba(160,140,90,0.5)",
                      padding: "1px 4px",
                      borderRadius: 3,
                      textAlign: "center",
                      width: isCompact ? 38 : 46,
                      boxSizing: "border-box",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                    }}
                  >
                    {"\u23F3"}
                    {combatant.turnsRemaining}
                  </div>
                )}
              </div>

              {/* Click-to-toggle stats panel — slides in to the RIGHT of the card */}
              {isSelected && !isPlayer && (
                <div
                  data-ocid={`initiative.tooltip.${index + 1}`}
                  style={{
                    position: "absolute",
                    left: 66,
                    top: 0,
                    zIndex: 300,
                    minWidth: 170,
                    background: "#0a0a0f",
                    border: isLeader
                      ? "1.5px solid #c8a400"
                      : "1.5px solid #8b0000",
                    borderRadius: 8,
                    padding: "10px 12px",
                    boxShadow: isLeader
                      ? "0 0 18px rgba(200,164,0,0.5), 0 4px 16px rgba(0,0,0,0.8)"
                      : "0 0 18px rgba(139,0,0,0.5), 0 4px 16px rgba(0,0,0,0.8)",
                    pointerEvents: "none",
                  }}
                >
                  {/* Name + Level + Leader badge */}
                  <div style={{ marginBottom: 6 }}>
                    <span
                      style={{
                        color: isLeader ? "#ffd700" : "#ff7675",
                        fontWeight: 800,
                        fontSize: 11,
                        letterSpacing: "0.06em",
                      }}
                    >
                      {combatant.name.toUpperCase()}
                    </span>
                    {isLeader && (
                      <span
                        style={{
                          marginLeft: 4,
                          fontSize: 11,
                        }}
                        title="Leader"
                      >
                        \uD83D\uDC51
                      </span>
                    )}
                    {extraStats.enraged && (
                      <span
                        style={{
                          marginLeft: 6,
                          color: "#ff4500",
                          fontWeight: 900,
                          fontSize: 10,
                        }}
                      >
                        ENRAGED!
                      </span>
                    )}
                    <span
                      style={{
                        marginLeft: 6,
                        color: "rgba(255,180,80,0.8)",
                        fontSize: 10,
                      }}
                    >
                      Lv.{combatant.level}
                    </span>
                  </div>
                  {/* Stats grid */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {(
                      [
                        [
                          "\u2764",
                          "HP",
                          `${combatant.hp}/${combatant.maxHp}`,
                          "#e74c3c",
                        ],
                        ["\u26A1", "AP", extraStats.ap ?? "?", "#4a9adf"],
                        ["\uD83D\uDC63", "MP", extraStats.mp ?? "?", "#2ecc71"],
                        [
                          "\uD83D\uDDE1\uFE0F",
                          "ATK",
                          extraStats.atk ?? "?",
                          "#e67e22",
                        ],
                        [
                          "\uD83D\uDEE1\uFE0F",
                          "RES",
                          extraStats.res ?? 0,
                          "#9b59b6",
                        ],
                        ["\uD83D\uDC8E", "SP", extraStats.sp ?? 0, "#1abc9c"],
                        ["\u2728", "CHC", extraStats.chc ?? 0, "#f1c40f"],
                      ] as [string, string, string | number, string][]
                    ).map(([icon, label, val, color]) => (
                      <div
                        key={label}
                        style={{
                          background: `${color}18`,
                          border: `1px solid ${color}44`,
                          borderRadius: 4,
                          padding: "2px 6px",
                          fontSize: 9,
                          color,
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {icon} {label}: {val}
                      </div>
                    ))}
                    {Array.isArray(extraStats.spells) &&
                      extraStats.spells.length > 0 && (
                        <div
                          style={{
                            background: "rgba(139,0,0,0.2)",
                            border: "1px solid rgba(139,0,0,0.5)",
                            borderRadius: 4,
                            padding: "2px 6px",
                            fontSize: 9,
                            color: "#ff7675",
                            fontWeight: 700,
                          }}
                        >
                          \u26A1 {extraStats.spells.length} spells
                        </div>
                      )}
                    {isLeader && (
                      <div
                        style={{
                          background: "rgba(200,164,0,0.15)",
                          border: "1px solid rgba(200,164,0,0.4)",
                          borderRadius: 4,
                          padding: "2px 6px",
                          fontSize: 9,
                          color: "#ffd700",
                          fontWeight: 700,
                          width: "100%",
                        }}
                      >
                        \uD83D\uDC51 LEADER — gains +stats on ally death
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </DraggablePanel>
  );
};

export default React.memo(InitiativeStrip, (prev, next) => {
  return (
    prev.turnOrder === next.turnOrder &&
    prev.currentTurnIndex === next.currentTurnIndex &&
    prev.battlePhase === next.battlePhase &&
    prev.battleTurn === next.battleTurn
  );
});
