import type React from "react";
import { useMemo, useState } from "react";

export interface EnemyRegisterProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Monster {
  name: string;
  type: string;
  mechanics: string;
}

interface Boss {
  name: string;
  phase1: string;
  phase2: string;
  tip: string;
}

const MONSTERS: Monster[] = [
  {
    name: "Wraith Bishop",
    type: "Undead",
    mechanics:
      "Phase through walls periodically. Drains MP on hit. Weak to physical attacks, resistant to spell damage. Uses shadow teleport at low HP.",
  },
  {
    name: "Iron Golem",
    type: "Construct",
    mechanics:
      "Extremely high HP and RES. Slow movement. Massive physical damage. Immune to poison and burn. Can be staggered by AP-intensive spells.",
  },
  {
    name: "Plague Rat",
    type: "Beast",
    mechanics:
      "Applies poison stacks on every hit. Deadly in packs. Fast movement. Weak individually but overwhelms in groups. Prioritize these first.",
  },
  {
    name: "Ember Knight",
    type: "Fire",
    mechanics:
      "Leaves burning tiles on movement path. AoE fire attacks. Weak to ice effects. Avoid standing on tiles it walked across.",
  },
  {
    name: "Tide Shade",
    type: "Water",
    mechanics:
      "Slows your movement when adjacent. Regenerates HP each turn. Weak to lightning. Burst it down before it stacks too much HP recovery.",
  },
  {
    name: "Bone Scribe",
    type: "Undead",
    mechanics:
      "Applies Weakened status reducing your stats. Low HP but casts debuffs from range. Kill it early before debuffs stack.",
  },
  {
    name: "Void Mirror",
    type: "Dimensional",
    mechanics:
      "Copies your spells back at you. Immune to magic until hit by a physical attack first. Always open with melee or physical spells.",
  },
  {
    name: "Crimson Spawn",
    type: "Vampire",
    mechanics:
      "Heals equal to 30% of damage dealt. Grows more powerful at low HP (berserker threshold). Use burst damage to skip the berserker window.",
  },
  {
    name: "Shadow Lurker",
    type: "Shadow",
    mechanics:
      "Deals 2x damage when attacking from behind. Has evasion passive. Reposition to face it directly and remove evasion bonus.",
  },
  {
    name: "Storm Caller",
    type: "Lightning",
    mechanics:
      "Chain lightning hits multiple adjacent targets. Keep party spread apart. Weak to earth-type spells. Kill before it summons storm clouds.",
  },
];

const BOSSES: Boss[] = [
  {
    name: "Pale Archbishop",
    phase1: "Blesses allies, healing them each turn",
    phase2: "Summons Weeping Pawns as shields",
    tip: "Kill all summoned pawns first — Archbishop is invulnerable while any pawn lives.",
  },
  {
    name: "Crimson Countess",
    phase1: "Leaves lava trails on movement",
    phase2: "Lava becomes rot-lava dealing poison + burn",
    tip: "Stay mobile and never walk over tiles she just crossed.",
  },
  {
    name: "Void Grandmaster",
    phase1: "Spawns ghost copies that mirror your moves",
    phase2: "Multiple phantoms make it nearly impossible to track",
    tip: "The real Grandmaster has a slightly brighter color — watch for the subtle difference.",
  },
  {
    name: "Bone Cavalier",
    phase1: "Charges in straight lines",
    phase2: "Charges gain chain lightning on impact",
    tip: "Always sidestep perpendicular to his facing direction when he charges.",
  },
  {
    name: "Weeping Pawn",
    phase1: "Regenerates HP each turn",
    phase2: "Surges back to 50% HP on death if Pale Archbishop not dead",
    tip: "If fighting alongside Pale Archbishop, kill the Archbishop first.",
  },
  {
    name: "Starborn Queen",
    phase1: "Galaxy swirl attack pulling you toward center",
    phase2: "Void tiles spawn around the swirl origin",
    tip: "Stay at maximum range and move diagonally to resist the pull.",
  },
  {
    name: "Fetid Rook",
    phase1: "Rot aura deals damage each turn to adjacent units",
    phase2: "Rot + poison combination",
    tip: "Keep maximum distance. High RES gear strongly recommended.",
  },
  {
    name: "Eternal Pawn King",
    phase1: "Sturdy fighter with deceptive movement",
    phase2: "Switches to decoy, real king revealed nearby",
    tip: "Watch which pawn takes normal damage — the decoy has reduced HP.",
  },
  {
    name: "Midnight Bishop",
    phase1: "Dark magic curses reducing your stats",
    phase2: "Syncs attacks with Twin Monarchs if paired",
    tip: "Break sync by positioning with obstacles between you and both bosses.",
  },
  {
    name: "Broodmother Rook",
    phase1: "Constantly spawns larvae every 2 turns",
    phase2: "Larvae use walls as cover",
    tip: "Enemy cap is 20 total — keep killing larvae to prevent Broodmother being shielded.",
  },
  {
    name: "Lord of Static",
    phase1: "Chain lightning bounces between all nearby targets",
    phase2: "Electric field damages all tiles adjacent to any enemy",
    tip: "Spread far apart from enemies. Never group up.",
  },
  {
    name: "Final Pawn",
    phase1: "Appears weak and vulnerable, encouraging attack",
    phase2:
      "Upon first death: reveals it was the decoy, real Final Pawn appears",
    tip: "When it first dies, don't celebrate — immediately locate the real one.",
  },
  {
    name: "Alabaster Fortress",
    phase1: "Summons indestructible walls to block movement",
    phase2: "Larvae spawn on wall positions",
    tip: "Never let it corner you. Keep an escape route open at all times.",
  },
  {
    name: "Chessboard Lich",
    phase1: "Curses checkerboard pattern tiles (dangerous to stand on)",
    phase2: "Marks cursed tiles with scroll attacks",
    tip: "Constantly reposition. Standing still on any tile is a death sentence.",
  },
  {
    name: "Mirror Sovereign",
    phase1: "Reflects 30% of spell damage back at caster",
    phase2: "Spawns ghost copies of itself",
    tip: "Use only physical attacks or low-damage rapid spells to minimize reflection damage.",
  },
  {
    name: "The Enthroned Void",
    phase1: "Surrounds itself in coalescing mist",
    phase2: "Full void manifestation — mist deals massive damage",
    tip: "Prevent void tile spread by killing void-spawning sources immediately.",
  },
  {
    name: "Starved Vampire Pawn",
    phase1: "Feeds on any HP recovery the Weeping Pawn has",
    phase2: "Both bosses empower each other as the other takes damage",
    tip: "Split your damage evenly between both — killing one first enrages the other.",
  },
  {
    name: "Pale Archivist",
    phase1: "Summons scroll constructs that activate after 2 turns",
    phase2: "Multiple scrolls flood the arena",
    tip: "Prioritize destroying scrolls immediately — each one that activates deals massive damage.",
  },
  {
    name: "Twin Monarchs of Dusk and Dawn",
    phase1: "White and Dawn Monarch sync attacks from opposite sides",
    phase2: "Rage burst when either dies",
    tip: "Deal equal damage to both simultaneously to kill them at the same time.",
  },
  {
    name: "Final Enthroned Void",
    phase1: "All previous void mechanics combined",
    phase2: "Complete void manifestation destroys all tile safety",
    tip: "The ultimate challenge. Maximum RES, maximum AP. No margin for error.",
  },
];

const TYPE_COLORS: Record<string, string> = {
  Undead: "#9966cc",
  Construct: "#8899aa",
  Beast: "#88bb44",
  Fire: "#ff6633",
  Water: "#4499ff",
  Dimensional: "#cc44ff",
  Vampire: "#cc2222",
  Shadow: "#667788",
  Lightning: "#ffdd22",
  default: "#888888",
};

function getTypeColor(type: string): string {
  return TYPE_COLORS[type] ?? TYPE_COLORS.default;
}

const EnemyRegister: React.FC<EnemyRegisterProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<"monsters" | "bosses">("monsters");
  const [search, setSearch] = useState("");

  const filteredMonsters = useMemo(() => {
    const q = search.toLowerCase();
    return MONSTERS.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.type.toLowerCase().includes(q) ||
        m.mechanics.toLowerCase().includes(q),
    );
  }, [search]);

  const filteredBosses = useMemo(() => {
    const q = search.toLowerCase();
    return BOSSES.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.phase1.toLowerCase().includes(q) ||
        b.phase2.toLowerCase().includes(q) ||
        b.tip.toLowerCase().includes(q),
    );
  }, [search]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      data-ocid="enemy_register.modal"
      onClick={handleOverlayClick}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.88)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 800,
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          background: "#120808",
          border: "1px solid #cc2222",
          borderRadius: 8,
          boxShadow: "0 0 40px rgba(204,34,34,0.4), 0 8px 32px rgba(0,0,0,0.8)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 20px 10px",
            background: "#1a0505",
            borderBottom: "1px solid #7a1111",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>📖</span>
            <h2
              style={{
                margin: 0,
                color: "#cc2222",
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: "3px",
                textTransform: "uppercase",
              }}
            >
              ENEMY REGISTER
            </h2>
            <span
              style={{
                color: "#660000",
                fontSize: 11,
                letterSpacing: "1px",
                marginLeft: 4,
              }}
            >
              BESTIARY
            </span>
          </div>
          <button
            type="button"
            data-ocid="enemy_register.close_button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "1px solid #7a1111",
              borderRadius: 4,
              color: "#cc4444",
              fontSize: 16,
              lineHeight: 1,
              cursor: "pointer",
              padding: "4px 10px",
              transition: "background 0.15s",
            }}
            aria-label="Close enemy register"
          >
            ✕
          </button>
        </div>

        {/* Search */}
        <div
          style={{
            padding: "10px 20px",
            background: "#140606",
            borderBottom: "1px solid #3a0a0a",
            flexShrink: 0,
          }}
        >
          <input
            data-ocid="enemy_register.search_input"
            type="text"
            placeholder="Search enemies, types, mechanics…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: "#1e0808",
              border: "1px solid #551111",
              borderRadius: 4,
              color: "#ffcccc",
              fontSize: 13,
              padding: "7px 12px",
              outline: "none",
            }}
          />
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            flexShrink: 0,
            background: "#140606",
            borderBottom: "1px solid #3a0a0a",
          }}
        >
          {(["monsters", "bosses"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              data-ocid={`enemy_register.${tab}_tab`}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: "9px 0",
                background: activeTab === tab ? "#200a0a" : "transparent",
                border: "none",
                borderBottom:
                  activeTab === tab
                    ? "2px solid #cc2222"
                    : "2px solid transparent",
                color: activeTab === tab ? "#ff6666" : "#884444",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "2px",
                textTransform: "uppercase",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {tab === "monsters"
                ? `⚔ Monsters (${filteredMonsters.length})`
                : `💀 Bosses (${filteredBosses.length})`}
            </button>
          ))}
        </div>

        {/* Scrollable content */}
        <div
          style={{
            overflowY: "auto",
            flex: 1,
            padding: "14px 16px",
          }}
        >
          {activeTab === "monsters" && (
            <>
              {filteredMonsters.length === 0 && (
                <p
                  data-ocid="enemy_register.monsters.empty_state"
                  style={{
                    color: "#664444",
                    textAlign: "center",
                    marginTop: 40,
                    fontSize: 13,
                  }}
                >
                  No monsters match your search.
                </p>
              )}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                  gap: 10,
                }}
              >
                {filteredMonsters.map((m, i) => (
                  <div
                    key={m.name}
                    data-ocid={`enemy_register.monster.item.${i + 1}`}
                    style={{
                      background: "#1a0808",
                      border: "1px solid #3a1010",
                      borderRadius: 6,
                      padding: "12px 14px",
                      transition: "border-color 0.15s",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 8,
                      }}
                    >
                      <span
                        style={{
                          color: "#d4a840",
                          fontSize: 15,
                          fontWeight: 700,
                          flex: 1,
                        }}
                      >
                        {m.name}
                      </span>
                      <span
                        style={{
                          background: `${getTypeColor(m.type)}22`,
                          border: `1px solid ${getTypeColor(m.type)}66`,
                          color: getTypeColor(m.type),
                          borderRadius: 3,
                          padding: "2px 7px",
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "1px",
                          textTransform: "uppercase",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {m.type}
                      </span>
                    </div>
                    <p
                      style={{
                        margin: 0,
                        color: "#ccaaaa",
                        fontSize: 12,
                        lineHeight: 1.55,
                      }}
                    >
                      {m.mechanics}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === "bosses" && (
            <>
              {filteredBosses.length === 0 && (
                <p
                  data-ocid="enemy_register.bosses.empty_state"
                  style={{
                    color: "#664444",
                    textAlign: "center",
                    marginTop: 40,
                    fontSize: 13,
                  }}
                >
                  No bosses match your search.
                </p>
              )}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
                  gap: 12,
                }}
              >
                {filteredBosses.map((b, i) => (
                  <div
                    key={b.name}
                    data-ocid={`enemy_register.boss.item.${i + 1}`}
                    style={{
                      background: "#1a0808",
                      border: "1px solid #5a1818",
                      borderRadius: 6,
                      padding: "14px 14px 12px",
                      position: "relative",
                    }}
                  >
                    {/* Boss number badge */}
                    <span
                      style={{
                        position: "absolute",
                        top: 10,
                        right: 12,
                        color: "#550000",
                        fontSize: 18,
                        fontWeight: 900,
                        lineHeight: 1,
                        userSelect: "none",
                      }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>

                    {/* Boss name */}
                    <div
                      style={{
                        color: "#d4a840",
                        fontSize: 15,
                        fontWeight: 700,
                        marginBottom: 10,
                        paddingRight: 32,
                      }}
                    >
                      {b.name}
                    </div>

                    {/* Phase rows */}
                    <div style={{ marginBottom: 4 }}>
                      <div
                        style={{
                          display: "flex",
                          gap: 6,
                          alignItems: "flex-start",
                          marginBottom: 5,
                        }}
                      >
                        <span
                          style={{
                            background: "#cc222222",
                            border: "1px solid #cc222266",
                            color: "#ff6666",
                            borderRadius: 3,
                            padding: "2px 6px",
                            fontSize: 9,
                            fontWeight: 700,
                            letterSpacing: "1px",
                            whiteSpace: "nowrap",
                            marginTop: 1,
                          }}
                        >
                          PHASE 1
                        </span>
                        <span
                          style={{
                            color: "#ccaaaa",
                            fontSize: 12,
                            lineHeight: 1.5,
                          }}
                        >
                          {b.phase1}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: 6,
                          alignItems: "flex-start",
                        }}
                      >
                        <span
                          style={{
                            background: "#88004422",
                            border: "1px solid #88004466",
                            color: "#ff88aa",
                            borderRadius: 3,
                            padding: "2px 6px",
                            fontSize: 9,
                            fontWeight: 700,
                            letterSpacing: "1px",
                            whiteSpace: "nowrap",
                            marginTop: 1,
                          }}
                        >
                          PHASE 2
                        </span>
                        <span
                          style={{
                            color: "#ccaaaa",
                            fontSize: 12,
                            lineHeight: 1.5,
                          }}
                        >
                          {b.phase2}
                        </span>
                      </div>
                    </div>

                    {/* Tip */}
                    <div
                      style={{
                        marginTop: 9,
                        paddingTop: 9,
                        borderTop: "1px solid #3a1010",
                      }}
                    >
                      <span
                        style={{
                          color: "#d4a840",
                          fontStyle: "italic",
                          fontSize: 11,
                          lineHeight: 1.5,
                        }}
                      >
                        <strong
                          style={{
                            fontStyle: "normal",
                            color: "#d4a840",
                            letterSpacing: "1px",
                            fontSize: 9,
                            marginRight: 4,
                          }}
                        >
                          TIP:
                        </strong>
                        {b.tip}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            flexShrink: 0,
            padding: "8px 20px",
            background: "#1a0505",
            borderTop: "1px solid #3a0a0a",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span
            style={{ color: "#553333", fontSize: 10, letterSpacing: "1px" }}
          >
            {MONSTERS.length} MONSTERS · {BOSSES.length} BOSSES
          </span>
          <span
            style={{ color: "#553333", fontSize: 10, letterSpacing: "1px" }}
          >
            ÆSTRALTØ ENEMY REGISTER
          </span>
        </div>
      </div>
    </div>
  );
};

export default EnemyRegister;
