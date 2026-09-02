import { Crown, X } from "lucide-react";
import type React from "react";
import { useMemo } from "react";
import {
  BOSS_LEVEL_DIFF_OFFSETS,
  getBossScalingRows,
} from "../engine/progression";
import { DEFAULT_BOSS_CONFIGS } from "../types/bossDefaults";
import { BossAbility, type BossConfig } from "../types/bossTypes";
import type { BossBaseStats } from "../types/bossTypes";

// ── Defensive kit import ─────────────────────────────────────────────────────
// The parallel "boss kit" task may produce either:
//   (a) src/frontend/src/data/bossKits.ts  — a standalone kit catalogue, OR
//   (b) a `kit` field added to BossConfig in bossDefaults.ts.
// This defensive import works either way: we attempt to import a typed kit
// catalogue from data/bossKits.ts; if that module does not exist yet (the
// parallel task hasn't shipped it), we fall back to deriving the kit from
// the boss config's phase1 + phase2 specialAbilities (which the modal
// already renders). The kit is a UI-only aggregation — it does not change
// any battle wiring.
type BossKitEntry = { ability: BossAbility; icon: string; description: string };
type BossKit = { bossId: string; entries: BossKitEntry[] };

let externalKits: Record<string, BossKit> | null = null;
let kitsLoaded = false;
try {
  // Dynamic require guarded so the build never hard-fails if the file is
  // absent. The parallel task is expected to ship this module; if it does
  // not, the fallback below produces an equivalent kit from the config.
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
  const mod = require("../data/bossKits");
  externalKits = (mod?.BOSS_KITS ?? mod?.default ?? null) as Record<
    string,
    BossKit
  > | null;
  kitsLoaded = true;
} catch {
  kitsLoaded = false;
}

/**
 * Resolve the kit for a boss. Defensive: prefers an external kit catalogue
 * (data/bossKits.ts) when present; otherwise derives the kit from the
 * boss config's phase1 + phase2 specialAbilities, de-duplicated and
 * paired with the existing BOSS_ABILITY_DESCRIPTIONS lookup.
 */
function resolveBossKit(boss: BossConfig): BossKitEntry[] {
  if (kitsLoaded && externalKits && externalKits[boss.id]) {
    return externalKits[boss.id].entries;
  }
  const seen = new Set<BossAbility>();
  const entries: BossKitEntry[] = [];
  for (const ab of [
    ...boss.phase1.specialAbilities,
    ...boss.phase2.specialAbilities,
  ]) {
    if (seen.has(ab)) continue;
    seen.add(ab);
    entries.push({
      ability: ab,
      icon: abilityIcon(ab),
      description: BOSS_ABILITY_DESCRIPTIONS[ab] ?? "No description available.",
    });
  }
  return entries;
}

/** Small emoji glyph per ability — keeps the kit table visually scannable. */
function abilityIcon(ab: BossAbility): string {
  const map: Partial<Record<BossAbility, string>> = {
    [BossAbility.REFLECT_SHIELD]: "🛡️",
    [BossAbility.SPAWN_MINIONS]: "👹",
    [BossAbility.LAVA_TRAIL]: "🌋",
    [BossAbility.TELEPORT_ADJACENT]: "✨",
    [BossAbility.ILLUSION_SPLIT]: "👥",
    [BossAbility.KNIGHT_JUMP_IGNORE_WALLS]: "♞",
    [BossAbility.SPIKE_ON_LAND]: "🔺",
    [BossAbility.CURSE_ON_HIT]: "💀",
    [BossAbility.PROMOTE_QUEEN]: "👑",
    [BossAbility.ATTACK_ALL_LINES]: "⚔️",
    [BossAbility.VOID_TILES]: "🕳️",
    [BossAbility.COMPOUNDING_ROT]: "🦠",
    [BossAbility.SPLIT_ROOKS]: "🏰",
    [BossAbility.ADVANCE_PER_TURN]: "➡️",
    [BossAbility.AP_DRAIN]: "💧",
    [BossAbility.TWIN_FLANK]: "👯",
    [BossAbility.MERGE_BISHOPS]: "♝",
    [BossAbility.MAGIC_REFLECT]: "🔮",
    [BossAbility.LARVAE_SPAWN]: "🐛",
    [BossAbility.SHELL_ARMOR]: "🐢",
    [BossAbility.LARVAE_EXPLODE]: "💥",
    [BossAbility.SHOCK_TILES]: "⚡",
    [BossAbility.CHAIN_LIGHTNING]: "🌩️",
    [BossAbility.INVINCIBLE_PHASE]: "✨",
    [BossAbility.GHOST_SUMMON]: "👻",
    [BossAbility.RESONANCE_SHOCKWAVE]: "🌊",
    [BossAbility.BOARD_SHRINK]: "📐",
    [BossAbility.MAP_ROTATE]: "🔄",
    [BossAbility.MIRROR_INVERT]: "🪞",
    [BossAbility.BOARD_CLAIM]: "🚧",
    [BossAbility.SPELL_MIRROR]: "🪞",
    [BossAbility.COMBO_REPLAY]: "🔁",
    [BossAbility.LIFE_DRAIN]: "🩸",
    [BossAbility.VAMPIRIC_AOE]: "吸血",
    [BossAbility.EXSANGUINATED_DEBUFF]: "🩹",
    [BossAbility.INK_VEIL]: "🖋️",
    [BossAbility.SCROLL_SUMMON]: "📜",
    [BossAbility.GLYPH_TRAP]: "🪤",
    [BossAbility.PAGES_OF_DOOM]: "📖",
    [BossAbility.DAWN_BUFF]: "🌅",
    [BossAbility.DUSK_DOT]: "🌆",
    [BossAbility.MONARCH_ABSORB]: "👑",
    [BossAbility.ANCHOR_TILES]: "⚓",
    [BossAbility.PHANTOM_SPAWN]: "👤",
    [BossAbility.AP_DRAIN_PASSIVE]: "💧",
    [BossAbility.DAMAGE_IMMUNE]: "🛡️",
  };
  return map[ab] ?? "✦";
}

const BOSS_ABILITY_DESCRIPTIONS: Record<BossAbility, string> = {
  [BossAbility.REFLECT_SHIELD]:
    "Boss reflects a portion of incoming damage back to the attacker. Use low-damage, high-frequency attacks or wait for the shield to expire.",
  [BossAbility.SPAWN_MINIONS]:
    "Boss summons additional enemies. Focus fire on the boss or clear minions quickly to avoid being overwhelmed.",
  [BossAbility.LAVA_TRAIL]:
    "Boss leaves damaging lava tiles behind. Avoid standing on or moving through its path.",
  [BossAbility.TELEPORT_ADJACENT]:
    "Boss teleports next to the player unpredictably. Keep distance and use ranged attacks.",
  [BossAbility.ILLUSION_SPLIT]:
    "Boss creates illusions that mirror its attacks. Identify and target the real boss.",
  [BossAbility.KNIGHT_JUMP_IGNORE_WALLS]:
    "Boss can leap over walls and obstacles. Do not rely on terrain for cover.",
  [BossAbility.SPIKE_ON_LAND]:
    "Landing on tiles near the boss triggers spike damage. Stay mobile and avoid end-of-turn positioning on adjacent tiles.",
  [BossAbility.CURSE_ON_HIT]:
    "Boss applies a curse debuff on hit. Bring cleanse spells or high RES to resist.",
  [BossAbility.PROMOTE_QUEEN]:
    "At low HP the boss transforms into a queen with vastly increased range and power. Burst it down before the promotion.",
  [BossAbility.ATTACK_ALL_LINES]:
    "Boss attacks along every line (rank, file, diagonal) simultaneously. Position diagonally off-axis to minimize exposure.",
  [BossAbility.VOID_TILES]:
    "Boss turns tiles into void/gaps. Avoid standing on void tiles and plan movement carefully.",
  [BossAbility.COMPOUNDING_ROT]:
    "Each hit applies a stacking rot debuff that increases damage taken over time. End the fight quickly.",
  [BossAbility.SPLIT_ROOKS]:
    "Boss splits into two independent rooks. Focus one down before the other to reduce total damage output.",
  [BossAbility.ADVANCE_PER_TURN]:
    "Boss advances toward the player every turn. Kite and use ranged attacks; do not let it close the gap.",
  [BossAbility.AP_DRAIN]:
    "Boss drains Action Points. Bring AP-restoring buffs or plan shorter action chains.",
  [BossAbility.TWIN_FLANK]:
    "Two bosses flank from opposite diagonals. Position so you are not between them.",
  [BossAbility.MERGE_BISHOPS]:
    "Two bishops merge into one powerful form. Burst them before they merge.",
  [BossAbility.MAGIC_REFLECT]:
    "Reflected magic damage. Use physical attacks or spells with low base power.",
  [BossAbility.LARVAE_SPAWN]:
    "Boss spawns larvae that explode on contact. Kill larvae at range before they reach you.",
  [BossAbility.SHELL_ARMOR]:
    "Boss gains armor while larvae are alive. Clear larvae to remove the armor buff.",
  [BossAbility.LARVAE_EXPLODE]:
    "Larvae explode for area damage. Spread out and eliminate them before they close in.",
  [BossAbility.SHOCK_TILES]:
    "Boss leaves electrified tiles. Avoid stepping on them; they chain into larger effects later.",
  [BossAbility.CHAIN_LIGHTNING]:
    "Electrified tiles chain lightning across the board. Clear shock tiles or stay far from clusters.",
  [BossAbility.INVINCIBLE_PHASE]:
    "Boss becomes invincible at very low HP. Look for a mechanic to break the invincibility (e.g., destroy anchors).",
  [BossAbility.GHOST_SUMMON]:
    "Boss summons ghost versions of previous bosses. Focus the main boss if possible; ghosts are temporary.",
  [BossAbility.RESONANCE_SHOCKWAVE]:
    "Boss emits shockwaves at intervals. Move out of the blast radius before it fires.",
  [BossAbility.BOARD_SHRINK]:
    "The playable area shrinks over time. Stay near the center and plan escape routes.",
  [BossAbility.MAP_ROTATE]:
    "The map rotates, changing relative positions. Reorient quickly and avoid void tiles.",
  [BossAbility.MIRROR_INVERT]:
    "Map inversion swaps safe and dangerous zones. Watch for sudden terrain changes.",
  [BossAbility.BOARD_CLAIM]:
    "Boss claims tiles, restricting movement. Break the claim by dealing damage to the boss.",
  [BossAbility.SPELL_MIRROR]:
    "Boss mirrors your spells back at you. Use physical attacks or non-damaging utility spells.",
  [BossAbility.COMBO_REPLAY]:
    "Boss replays your last combo against you. Vary your attack pattern to avoid predictable counters.",
  [BossAbility.LIFE_DRAIN]:
    "Boss heals by draining your HP. Burst damage or anti-heal debuffs are effective.",
  [BossAbility.VAMPIRIC_AOE]:
    "Area life-drain attack. Spread out to reduce total healing the boss receives.",
  [BossAbility.EXSANGUINATED_DEBUFF]:
    "Applies a bleed debuff that stacks. Bring healing over time or cleanse effects.",
  [BossAbility.INK_VEIL]:
    "Boss obscures vision with ink. Use area attacks or rely on memory of tile positions.",
  [BossAbility.SCROLL_SUMMON]:
    "Summons scroll minions with ranged attacks. Prioritize scrolls if they block your path.",
  [BossAbility.GLYPH_TRAP]:
    "Places invisible glyph traps. Trigger them with summons or by luring enemies into them.",
  [BossAbility.PAGES_OF_DOOM]:
    "Boss unleashes a multi-page attack sequence. Learn the pattern and dodge between waves.",
  [BossAbility.DAWN_BUFF]:
    "One twin buffs the other. Focus the buffing twin first to reduce total damage.",
  [BossAbility.DUSK_DOT]:
    "One twin applies damage-over-time. Stack healing or kill the DoT twin quickly.",
  [BossAbility.MONARCH_ABSORB]:
    "When one twin dies, the other absorbs its power. Balance their HP and kill them near-simultaneously.",
  [BossAbility.ANCHOR_TILES]:
    "Boss is immune until anchor tiles are destroyed. Find and destroy all anchors first.",
  [BossAbility.PHANTOM_SPAWN]:
    "Spawns phantoms that distract and deal damage. Clear phantoms or ignore them and focus the boss.",
  [BossAbility.AP_DRAIN_PASSIVE]:
    "Passive AP drain every turn. Plan actions with lower AP costs.",
  [BossAbility.DAMAGE_IMMUNE]:
    "Boss is completely immune to damage. Find and interact with the environment to remove immunity.",
};

interface BossGuideModalProps {
  open: boolean;
  onClose: () => void;
  /**
   * Player level used to compute the level-difference scaling table.
   * Defaults to 10 when not provided so the table always renders
   * meaningful numbers even outside a live battle context.
   */
  playerLevel?: number;
}

const DEFAULT_PLAYER_LEVEL = 10;

const BossGuideModal: React.FC<BossGuideModalProps> = ({
  open,
  onClose,
  playerLevel = DEFAULT_PLAYER_LEVEL,
}) => {
  const bosses = useMemo(() => DEFAULT_BOSS_CONFIGS, []);

  if (!open) return null;

  return (
    <div
      data-ocid="boss_guide.dialog"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9500,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      aria-modal="true"
      aria-label="Boss Guide"
    >
      <div
        style={{
          background: "#141726",
          border: "1px solid #c0392b",
          borderRadius: 10,
          width: "min(900px, 94vw)",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          boxShadow:
            "0 0 40px rgba(192,57,43,0.35), 0 8px 32px rgba(0,0,0,0.8)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 20px",
            borderBottom: "1px solid rgba(192,57,43,0.35)",
            background: "linear-gradient(135deg, #1a0506, #2a0810)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Crown size={18} style={{ color: "#f1c40f" }} />
            <span
              style={{
                color: "#e74c3c",
                fontWeight: 800,
                fontSize: 16,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                fontFamily: "'Space Grotesk', system-ui, sans-serif",
              }}
            >
              Boss Guide
            </span>
          </div>
          <button
            type="button"
            data-ocid="boss_guide.close_button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#aaa",
              cursor: "pointer",
              padding: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            aria-label="Close boss guide"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable content */}
        <div
          style={{
            overflowY: "auto",
            padding: "16px 20px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 14,
          }}
        >
          {bosses.map((boss) => (
            <div
              key={boss.id}
              data-ocid={`boss_guide.item.${boss.id}`}
              style={{
                background: "linear-gradient(135deg, #1a0d1a, #12060a)",
                border: "1px solid rgba(192,57,43,0.25)",
                borderRadius: 8,
                padding: 14,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {/* Name + icon */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  borderBottom: "1px solid rgba(192,57,43,0.2)",
                  paddingBottom: 8,
                }}
              >
                <span style={{ fontSize: 20 }}>{boss.iconEmoji}</span>
                <div>
                  <div
                    style={{
                      color: "#e74c3c",
                      fontWeight: 800,
                      fontSize: 13,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      fontFamily: "'Space Grotesk', system-ui, sans-serif",
                    }}
                  >
                    {boss.name}
                  </div>
                  <div
                    style={{
                      color: "#f1c40f",
                      fontSize: 10,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {boss.pieceType}
                  </div>
                </div>
              </div>

              {/* Lore */}
              <p
                style={{
                  color: "#aaa",
                  fontSize: 11,
                  lineHeight: 1.45,
                  margin: 0,
                  fontStyle: "italic",
                }}
              >
                {boss.loreText}
              </p>

              {/* Base stats */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: "4px 8px",
                  fontSize: 10,
                }}
              >
                {[
                  { label: "HP", value: boss.baseStats.hp },
                  { label: "AP", value: boss.baseStats.ap },
                  { label: "MP", value: boss.baseStats.mp },
                  { label: "ATK", value: boss.baseStats.atk },
                  { label: "RES", value: boss.baseStats.res },
                  { label: "SP", value: boss.baseStats.sp },
                  { label: "INIT", value: boss.baseStats.init },
                  { label: "CHC", value: boss.baseStats.chc },
                ].map((s) => (
                  <div key={s.label} style={{ display: "flex", gap: 4 }}>
                    <span style={{ color: "#f1c40f", fontWeight: 700 }}>
                      {s.label}
                    </span>
                    <span style={{ color: "#ddd" }}>{s.value}</span>
                  </div>
                ))}
              </div>

              {/* Kit */}
              <div
                data-ocid={`boss_guide.kit.${boss.id}`}
                style={{
                  background: "rgba(20,10,10,0.5)",
                  borderRadius: 6,
                  padding: "8px 10px",
                }}
              >
                <div
                  style={{
                    color: "#e74c3c",
                    fontWeight: 700,
                    fontSize: 10,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: 4,
                  }}
                >
                  Kit
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  {resolveBossKit(boss).map((entry) => (
                    <div
                      key={entry.ability}
                      data-ocid={`boss_guide.kit_item.${boss.id}.${entry.ability}`}
                      style={{
                        display: "flex",
                        gap: 6,
                        alignItems: "flex-start",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          lineHeight: "14px",
                          flexShrink: 0,
                          width: 16,
                          textAlign: "center",
                        }}
                        aria-hidden="true"
                      >
                        {entry.icon}
                      </span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <span
                          style={{
                            color: "#f1c40f",
                            fontSize: 10,
                            fontWeight: 700,
                          }}
                        >
                          {entry.ability.replace(/_/g, " ")}
                        </span>
                        <p
                          style={{
                            color: "#888",
                            fontSize: 9,
                            lineHeight: 1.35,
                            margin: "2px 0 0 0",
                          }}
                        >
                          {entry.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Phase 1 */}
              <div
                style={{
                  background: "rgba(20,10,10,0.5)",
                  borderRadius: 6,
                  padding: "8px 10px",
                }}
              >
                <div
                  style={{
                    color: "#e74c3c",
                    fontWeight: 700,
                    fontSize: 10,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: 4,
                  }}
                >
                  Phase 1 — HP &gt; {Math.round(boss.phase1.hpThreshold * 100)}%
                </div>
                <div
                  style={{
                    color: "#aaa",
                    fontSize: 10,
                    marginBottom: 2,
                  }}
                >
                  Stat Multiplier:{" "}
                  <span style={{ color: "#f1c40f" }}>
                    {boss.phase1.statMultiplier}x
                  </span>
                </div>
                {boss.phase1.specialAbilities.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      marginTop: 4,
                    }}
                  >
                    {boss.phase1.specialAbilities.map((ab) => (
                      <div key={ab}>
                        <span
                          style={{
                            color: "#f1c40f",
                            fontSize: 10,
                            fontWeight: 700,
                          }}
                        >
                          {ab.replace(/_/g, " ")}
                        </span>
                        <p
                          style={{
                            color: "#888",
                            fontSize: 9,
                            lineHeight: 1.35,
                            margin: "2px 0 0 0",
                          }}
                        >
                          {BOSS_ABILITY_DESCRIPTIONS[ab] ??
                            "No description available."}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                {boss.phase1.summonCount > 0 && (
                  <div style={{ color: "#888", fontSize: 10, marginTop: 4 }}>
                    Summons:{" "}
                    <span style={{ color: "#e74c3c" }}>
                      {boss.phase1.summonCount}
                    </span>{" "}
                    minion(s)
                  </div>
                )}
              </div>

              {/* Phase 2 */}
              <div
                style={{
                  background: "rgba(20,10,10,0.5)",
                  borderRadius: 6,
                  padding: "8px 10px",
                }}
              >
                <div
                  style={{
                    color: "#e74c3c",
                    fontWeight: 700,
                    fontSize: 10,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: 4,
                  }}
                >
                  Phase 2 — HP &le; {Math.round(boss.phase1.hpThreshold * 100)}%
                </div>
                <div
                  style={{
                    color: "#aaa",
                    fontSize: 10,
                    marginBottom: 2,
                  }}
                >
                  Stat Multiplier:{" "}
                  <span style={{ color: "#f1c40f" }}>
                    {boss.phase2.statMultiplier}x
                  </span>
                </div>
                {boss.phase2.specialAbilities.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      marginTop: 4,
                    }}
                  >
                    {boss.phase2.specialAbilities.map((ab) => (
                      <div key={ab}>
                        <span
                          style={{
                            color: "#f1c40f",
                            fontSize: 10,
                            fontWeight: 700,
                          }}
                        >
                          {ab.replace(/_/g, " ")}
                        </span>
                        <p
                          style={{
                            color: "#888",
                            fontSize: 9,
                            lineHeight: 1.35,
                            margin: "2px 0 0 0",
                          }}
                        >
                          {BOSS_ABILITY_DESCRIPTIONS[ab] ??
                            "No description available."}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                {boss.phase2.summonCount > 0 && (
                  <div style={{ color: "#888", fontSize: 10, marginTop: 4 }}>
                    Summons:{" "}
                    <span style={{ color: "#e74c3c" }}>
                      {boss.phase2.summonCount}
                    </span>{" "}
                    minion(s)
                  </div>
                )}
              </div>

              {/* Level-difference scaling table */}
              <div
                data-ocid={`boss_guide.scaling_table.${boss.id}`}
                style={{
                  background: "rgba(20,10,10,0.5)",
                  borderRadius: 6,
                  padding: "8px 10px",
                }}
              >
                <div
                  style={{
                    color: "#e74c3c",
                    fontWeight: 700,
                    fontSize: 10,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: 4,
                  }}
                >
                  Level-Difference Scaling
                </div>
                <div
                  style={{
                    color: "#aaa",
                    fontSize: 9,
                    marginBottom: 6,
                    fontStyle: "italic",
                  }}
                >
                  Effective stats vs. player level {playerLevel}
                </div>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 9,
                    tableLayout: "fixed",
                  }}
                >
                  <thead>
                    <tr>
                      <th
                        style={{
                          color: "#f1c40f",
                          fontWeight: 700,
                          textAlign: "left",
                          padding: "3px 4px",
                          borderBottom: "1px solid rgba(192,57,43,0.35)",
                          width: "20%",
                        }}
                      >
                        ΔLvl
                      </th>
                      {(
                        ["HP", "AP", "MP", "INIT", "SP", "SR", "RES"] as const
                      ).map((col) => (
                        <th
                          key={col}
                          style={{
                            color: "#f1c40f",
                            fontWeight: 700,
                            textAlign: "right",
                            padding: "3px 4px",
                            borderBottom: "1px solid rgba(192,57,43,0.35)",
                          }}
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {getBossScalingRows(boss.baseStats, playerLevel).map(
                      (row, idx) => (
                        <tr
                          key={row.offset}
                          data-ocid={`boss_guide.scaling_table.${boss.id}.row.${idx + 1}`}
                          style={{
                            borderBottom:
                              idx <
                              getBossScalingRows(boss.baseStats, playerLevel)
                                .length -
                                1
                                ? "1px solid rgba(192,57,43,0.15)"
                                : "none",
                          }}
                        >
                          <td
                            style={{
                              color: row.offset === 0 ? "#f1c40f" : "#e74c3c",
                              fontWeight: 700,
                              padding: "3px 4px",
                            }}
                          >
                            {row.offset > 0 ? `+${row.offset}` : row.offset}
                          </td>
                          <td
                            style={{
                              color: "#ddd",
                              textAlign: "right",
                              padding: "3px 4px",
                            }}
                          >
                            {row.stats.hp}
                          </td>
                          <td
                            style={{
                              color: "#ddd",
                              textAlign: "right",
                              padding: "3px 4px",
                            }}
                          >
                            {row.stats.ap}
                          </td>
                          <td
                            style={{
                              color: "#ddd",
                              textAlign: "right",
                              padding: "3px 4px",
                            }}
                          >
                            {row.stats.mp}
                          </td>
                          <td
                            style={{
                              color: "#ddd",
                              textAlign: "right",
                              padding: "3px 4px",
                            }}
                          >
                            {row.stats.init}
                          </td>
                          <td
                            style={{
                              color: "#ddd",
                              textAlign: "right",
                              padding: "3px 4px",
                            }}
                          >
                            {row.stats.sp}
                          </td>
                          <td
                            style={{
                              color: "#ddd",
                              textAlign: "right",
                              padding: "3px 4px",
                            }}
                          >
                            {row.stats.sr}
                          </td>
                          <td
                            style={{
                              color: "#ddd",
                              textAlign: "right",
                              padding: "3px 4px",
                            }}
                          >
                            {row.stats.res}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>

              {/* Rewards */}
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  fontSize: 10,
                  borderTop: "1px solid rgba(192,57,43,0.2)",
                  paddingTop: 6,
                }}
              >
                <div>
                  <span style={{ color: "#f1c40f", fontWeight: 700 }}>
                    Doka
                  </span>{" "}
                  <span style={{ color: "#ddd" }}>
                    {boss.rewardDokaMultiplier}x
                  </span>
                </div>
                <div>
                  <span style={{ color: "#f1c40f", fontWeight: 700 }}>XP</span>{" "}
                  <span style={{ color: "#ddd" }}>
                    {boss.rewardXpMultiplier}x
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BossGuideModal;
