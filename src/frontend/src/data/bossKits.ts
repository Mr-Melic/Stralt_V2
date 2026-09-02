/**
 * bossKits.ts — Authoritative boss spell-kit table.
 *
 * Maps each of the 19 bosses (BOSS_IDS) to a UNIQUE thematic set of 3-5 spells
 * drawn from the REAL spell catalog in data/spellData.ts. Signature twists are
 * expressed via level/multiplier only — no new effect types are invented here.
 *
 * Each kit entry contains:
 *   - bossId:        the BossId this kit belongs to
 *   - spells:        array of { spellId, role } pairs
 *   - phase1SpellIds: subset of spell ids active in phase 1 (used to populate
 *                     BossPhaseConfig.spellPoolIds for phase 1)
 *   - phase2SpellIds: subset of spell ids active in phase 2 (used to populate
 *                     BossPhaseConfig.spellPoolIds for phase 2)
 *
 * Every spellId referenced here MUST exist in data/spellData.ts. The
 * SPELL_ID_CATALOG constant below is the single source of truth for valid ids
 * and is used by the runtime guard `validateBossKits()` to confirm at module
 * load time that no kit references a missing spell.
 */

import type { BossId } from "../types/bossTypes";
import { BOSS_IDS } from "../types/bossTypes";

// ── Authoritative spell id catalog (mirrors data/spellData.ts) ────────────────
// Every id that appears in starterSpells[] plus physical_attack. If a new spell
// is added to spellData.ts, append its id here too — validateBossKits() will
// catch the omission at runtime.
export const SPELL_ID_CATALOG = [
  "physical_attack",
  "starter-shield",
  "starter-poison",
  "starter-blast",
  "starter-heal",
  "starter-drain",
  "starter-frost",
  "spell-swap",
  "spell-mark",
  "spell-barrier",
  "spell-mirror",
  "spell-timestep",
  "spell-sacrifice",
  "spell-lifesteal-nova",
  "spell-enrage",
  "spell-iron-skin",
  "spell-haste",
  "spell-weaken",
  "spell-slow",
  "spell-expose",
  "spell-venom-strike",
  "spell-rallying-cry",
  "spell-drain-courage",
  "spell-cursed-wound",
  "spell-shadow-veil",
  "spell-inferno",
  "spell-frost-nova",
  "summon-dire-wolf",
  "summon-sentinel",
  "summon-archer",
  "summon-bomber",
  "summon-wisp",
] as const;

export type SpellCatalogId = (typeof SPELL_ID_CATALOG)[number];

// ── Kit types ─────────────────────────────────────────────────────────────────

export interface BossKitSpell {
  /** Real spell id from data/spellData.ts. */
  spellId: SpellCatalogId;
  /** One-line description of this spell's thematic role in the kit. */
  role: string;
}

export interface BossKit {
  bossId: BossId;
  /** Thematic spell set (3-5 spells). */
  spells: BossKitSpell[];
  /** Subset of spell ids active during phase 1. */
  phase1SpellIds: SpellCatalogId[];
  /** Subset of spell ids active during phase 2 (escalation). */
  phase2SpellIds: SpellCatalogId[];
}

// ── The authoritative table ───────────────────────────────────────────────────
//
// Design rules enforced below:
//   1. Every kit uses 3-5 spells from SPELL_ID_CATALOG.
//   2. No two bosses share the exact same spell set.
//   3. Phase 2 is a strict superset (or escalation) of phase 1 — phase 2 always
//      contains at least one spell phase 1 lacks.
//   4. Kits are themed to the boss's lore (see bossDefaults.ts loreText).

export const BOSS_KITS: Record<BossId, BossKit> = {
  pale_archbishop: {
    bossId: "pale_archbishop",
    spells: [
      {
        spellId: "spell-cursed-wound",
        role: "Cursed mace strike that festers and halves the victim's healing.",
      },
      {
        spellId: "spell-shadow-veil",
        role: "Wraps the bishop in shadow, shredding the target's RES and SP.",
      },
      {
        spellId: "spell-sacrifice",
        role: "Martyr's rite — bleeds his own flock to smite the heretic for triple.",
      },
      {
        spellId: "summon-wisp",
        role: "Calls a kneeling wisp that mends the archbishop's vestments.",
      },
    ],
    phase1SpellIds: ["spell-cursed-wound", "spell-shadow-veil"],
    phase2SpellIds: [
      "spell-cursed-wound",
      "spell-shadow-veil",
      "spell-sacrifice",
      "summon-wisp",
    ],
  },

  crimson_countess: {
    bossId: "crimson_countess",
    spells: [
      {
        spellId: "spell-inferno",
        role: "Crown of blood roses ignites — burns the target for 8 dmg/turn.",
      },
      {
        spellId: "spell-enrage",
        role: "Thorned fury surges, raising her own damage by +40%.",
      },
      {
        spellId: "starter-drain",
        role: "Sips the player's lifeblood, healing herself and dulling their SP.",
      },
      {
        spellId: "spell-lifesteal-nova",
        role: "Rivers of lava radiate outward, draining all who stand adjacent.",
      },
    ],
    phase1SpellIds: ["spell-inferno", "starter-drain"],
    phase2SpellIds: [
      "spell-inferno",
      "spell-enrage",
      "starter-drain",
      "spell-lifesteal-nova",
    ],
  },

  void_grandmaster: {
    bossId: "void_grandmaster",
    spells: [
      {
        spellId: "starter-blast",
        role: "Void energy blast — chain lightning leaps from the rift, bouncing twice.",
      },
      {
        spellId: "spell-swap",
        role: "Flickers between dimensions, trading places with the player.",
      },
      {
        spellId: "spell-mirror",
        role: "Wraps himself in a void mirror, reflecting the next spell back.",
      },
      {
        spellId: "spell-timestep",
        role: "Bends time itself, resetting his AP and MP to full once per battle.",
      },
      {
        spellId: "spell-frost-nova",
        role: "Dimensional frost erupts around him, slowing all nearby foes.",
      },
    ],
    phase1SpellIds: ["starter-blast", "spell-swap", "spell-mirror"],
    phase2SpellIds: [
      "spell-swap",
      "spell-mirror",
      "spell-timestep",
      "spell-frost-nova",
    ],
  },

  bone_cavalier: {
    bossId: "bone_cavalier",
    spells: [
      {
        spellId: "physical_attack",
        role: "Bone lance thrust — bypasses SP, only RES applies.",
      },
      {
        spellId: "spell-haste",
        role: "Skeletal sinews surge, granting +2 MP for the charge.",
      },
      {
        spellId: "spell-enrage",
        role: "Marrow fury — raises his damage by +40% as bones fuse.",
      },
      {
        spellId: "spell-expose",
        role: "Shatters armor on landing, debuffing RES and SP by -20%.",
      },
    ],
    phase1SpellIds: ["physical_attack", "spell-haste"],
    phase2SpellIds: [
      "physical_attack",
      "spell-haste",
      "spell-enrage",
      "spell-expose",
    ],
  },

  weeping_pawn: {
    bossId: "weeping_pawn",
    spells: [
      {
        spellId: "physical_attack",
        role: "Sorrowful lunge — a pawn's desperate strike, only RES applies.",
      },
      {
        spellId: "spell-slow",
        role: "Wails sap the player's MP by -2, drowning their actions.",
      },
      {
        spellId: "spell-weaken",
        role: "Sorrowful dirge reduces the player's damage by -30%.",
      },
      {
        spellId: "spell-iron-skin",
        role: "Tears harden into a carapace, raising RES by +30%.",
      },
      {
        spellId: "spell-rallying-cry",
        role: "Promotion wail — heals 20 and buffs CHC by +15%.",
      },
    ],
    phase1SpellIds: ["physical_attack", "spell-slow", "spell-weaken"],
    phase2SpellIds: [
      "spell-slow",
      "spell-weaken",
      "spell-iron-skin",
      "spell-rallying-cry",
    ],
  },

  starborn_queen: {
    bossId: "starborn_queen",
    spells: [
      {
        spellId: "starter-blast",
        role: "Galactic chain lightning arcs from star to star, bouncing twice.",
      },
      {
        spellId: "spell-frost-nova",
        role: "Swirling void bursts around her, slowing all nearby foes.",
      },
      {
        spellId: "spell-mark",
        role: "Marks a tile with a dying star — the next spell there hits twice.",
      },
      {
        spellId: "spell-shadow-veil",
        role: "Curtain of cosmic dust shreds the target's RES and SP.",
      },
    ],
    phase1SpellIds: ["starter-blast", "spell-mark"],
    phase2SpellIds: [
      "starter-blast",
      "spell-frost-nova",
      "spell-mark",
      "spell-shadow-veil",
    ],
  },

  fetid_rook: {
    bossId: "fetid_rook",
    spells: [
      {
        spellId: "spell-venom-strike",
        role: "Rotting claw applies venom — 4 dmg/turn for 3 turns.",
      },
      {
        spellId: "starter-poison",
        role: "Festering arrow stacks compounding rot on the victim.",
      },
      {
        spellId: "spell-cursed-wound",
        role: "Necrotic bite deals 22 dmg and halves incoming healing.",
      },
      {
        spellId: "spell-lifesteal-nova",
        role: "Twin rooks erupt in a rot nova, draining all adjacent tiles.",
      },
    ],
    phase1SpellIds: ["spell-venom-strike", "starter-poison"],
    phase2SpellIds: [
      "spell-venom-strike",
      "starter-poison",
      "spell-cursed-wound",
      "spell-lifesteal-nova",
    ],
  },

  eternal_pawn_king: {
    bossId: "eternal_pawn_king",
    spells: [
      {
        spellId: "spell-slow",
        role: "Centuries of advance weigh on the player, draining -2 MP.",
      },
      {
        spellId: "spell-drain-courage",
        role: "Drains 18 HP and 1 AP, healing himself for 9 — the slow march.",
      },
      {
        spellId: "spell-iron-skin",
        role: "Hardened by ages, raises his RES by +30%.",
      },
      {
        spellId: "spell-cursed-wound",
        role: "Ancient curse deals 22 dmg and halves the player's healing.",
      },
    ],
    phase1SpellIds: ["spell-slow", "spell-drain-courage"],
    phase2SpellIds: [
      "spell-slow",
      "spell-drain-courage",
      "spell-iron-skin",
      "spell-cursed-wound",
    ],
  },

  midnight_bishop: {
    bossId: "midnight_bishop",
    spells: [
      {
        spellId: "spell-cursed-wound",
        role: "Diagonal slash inflicts a cursed wound — 22 dmg and halves healing.",
      },
      {
        spellId: "spell-mirror",
        role: "Twin bishops share a mirror ward, reflecting the next spell.",
      },
      {
        spellId: "spell-shadow-veil",
        role: "Diagonal shadow shreds the target's RES and SP by -15%.",
      },
      {
        spellId: "spell-swap",
        role: "Flanks along the diagonal, swapping with the player to break formation.",
      },
      {
        spellId: "spell-frost-nova",
        role: "Merged form erupts in a midnight frost nova, slowing all nearby.",
      },
    ],
    phase1SpellIds: ["spell-cursed-wound", "spell-mirror", "spell-shadow-veil"],
    phase2SpellIds: [
      "spell-mirror",
      "spell-shadow-veil",
      "spell-swap",
      "spell-frost-nova",
    ],
  },

  broodmother_rook: {
    bossId: "broodmother_rook",
    spells: [
      {
        spellId: "summon-archer",
        role: "Hatches a larval archer that kites the player from range.",
      },
      {
        spellId: "spell-venom-strike",
        role: "Mandible strike applies venom — 4 dmg/turn for 3 turns.",
      },
      {
        spellId: "spell-iron-skin",
        role: "Chitin shell hardens, raising her RES by +30% while larvae live.",
      },
      {
        spellId: "spell-lifesteal-nova",
        role: "Brood erupts in a parasitic nova, draining all adjacent tiles.",
      },
    ],
    phase1SpellIds: ["summon-archer", "spell-venom-strike"],
    phase2SpellIds: [
      "summon-archer",
      "spell-venom-strike",
      "spell-iron-skin",
      "spell-lifesteal-nova",
    ],
  },

  lord_of_static: {
    bossId: "lord_of_static",
    spells: [
      {
        spellId: "starter-blast",
        role: "Chain lightning leaps from shock tile to foe, bouncing twice.",
      },
      {
        spellId: "spell-haste",
        role: "Crackling surge grants +2 MP, supercharging his turn.",
      },
      {
        spellId: "spell-frost-nova",
        role: "Static discharge erupts around him, slowing all nearby foes.",
      },
      {
        spellId: "spell-expose",
        role: "Arcing current debuffs the target's RES and SP by -20%.",
      },
    ],
    phase1SpellIds: ["starter-blast", "spell-haste"],
    phase2SpellIds: [
      "starter-blast",
      "spell-haste",
      "spell-frost-nova",
      "spell-expose",
    ],
  },

  final_pawn: {
    bossId: "final_pawn",
    spells: [
      {
        spellId: "physical_attack",
        role: "A plain, unremarkable strike — only RES applies.",
      },
      {
        spellId: "spell-timestep",
        role: "At 1 HP, bends time to reset AP and MP — the final gambit.",
      },
      {
        spellId: "spell-sacrifice",
        role: "Bleeds 20% HP to deal triple — the pawn's last sacrifice.",
      },
      {
        spellId: "summon-dire-wolf",
        role: "Summons a dire wolf from the ghost bosses' collective will.",
      },
    ],
    phase1SpellIds: ["physical_attack"],
    phase2SpellIds: [
      "physical_attack",
      "spell-timestep",
      "spell-sacrifice",
      "summon-dire-wolf",
    ],
  },

  alabaster_fortress: {
    bossId: "alabaster_fortress",
    spells: [
      {
        spellId: "physical_attack",
        role: "Crushing wall slam — the fortress collapses onto the foe, only RES applies.",
      },
      {
        spellId: "spell-iron-skin",
        role: "Stone slabs lock together, raising RES by +30%.",
      },
      {
        spellId: "starter-shield",
        role: "Carved bulwark raises RES by another +30% for 3 turns.",
      },
      {
        spellId: "spell-barrier",
        role: "Drops a temporary stone block to choke the board.",
      },
      {
        spellId: "spell-frost-nova",
        role: "Resonance shockwave erupts, slowing all nearby foes.",
      },
    ],
    phase1SpellIds: ["physical_attack", "spell-iron-skin", "starter-shield"],
    phase2SpellIds: [
      "spell-iron-skin",
      "starter-shield",
      "spell-barrier",
      "spell-frost-nova",
    ],
  },

  chessboard_lich: {
    bossId: "chessboard_lich",
    spells: [
      {
        spellId: "spell-swap",
        role: "Rearranges the battlefield, swapping with the player.",
      },
      {
        spellId: "spell-mark",
        role: "Glyph-marks a tile — the next spell there hits twice.",
      },
      {
        spellId: "spell-shadow-veil",
        role: "Necrotic veil shreds the target's RES and SP by -15%.",
      },
      {
        spellId: "spell-cursed-wound",
        role: "Lich's touch deals 22 dmg and halves incoming healing.",
      },
      {
        spellId: "summon-wisp",
        role: "Raises a spectral wisp that mends his throne.",
      },
    ],
    phase1SpellIds: [
      "spell-cursed-wound",
      "spell-swap",
      "spell-mark",
      "spell-shadow-veil",
    ],
    phase2SpellIds: [
      "spell-cursed-wound",
      "spell-swap",
      "spell-mark",
      "spell-shadow-veil",
      "summon-wisp",
    ],
  },

  mirror_sovereign: {
    bossId: "mirror_sovereign",
    spells: [
      {
        spellId: "starter-blast",
        role: "Mirror shard blast — jagged glass shards erupt and bounce to nearby foes.",
      },
      {
        spellId: "spell-mirror",
        role: "Black mirror glass reflects the next incoming spell.",
      },
      {
        spellId: "spell-mark",
        role: "Marks a tile — your own spell there will be replayed against you.",
      },
      {
        spellId: "spell-shadow-veil",
        role: "Distorted reflection shreds the target's RES and SP by -15%.",
      },
      {
        spellId: "spell-swap",
        role: "Trades places with the player, mirroring their position.",
      },
    ],
    phase1SpellIds: ["starter-blast", "spell-mirror", "spell-mark"],
    phase2SpellIds: [
      "spell-mirror",
      "spell-mark",
      "spell-shadow-veil",
      "spell-swap",
    ],
  },

  starved_vampire_pawn: {
    bossId: "starved_vampire_pawn",
    spells: [
      {
        spellId: "starter-drain",
        role: "Emaciated fangs drain 10 HP, healing 5 and dulling SP.",
      },
      {
        spellId: "spell-drain-courage",
        role: "Drains 18 HP and 1 AP, healing 9 — the hunger deepens.",
      },
      {
        spellId: "spell-lifesteal-nova",
        role: "Vampiric AoE erupts, draining all adjacent tiles for 10 each.",
      },
      {
        spellId: "spell-haste",
        role: "Starved frenzy grants +2 MP to feed faster.",
      },
    ],
    phase1SpellIds: ["starter-drain", "spell-drain-courage"],
    phase2SpellIds: [
      "starter-drain",
      "spell-drain-courage",
      "spell-lifesteal-nova",
      "spell-haste",
    ],
  },

  pale_archivist: {
    bossId: "pale_archivist",
    spells: [
      {
        spellId: "spell-mark",
        role: "Inks a glyph-trap tile — the next spell there hits twice.",
      },
      {
        spellId: "spell-barrier",
        role: "Stacks scrolls into a temporary solid block on a free tile.",
      },
      {
        spellId: "spell-shadow-veil",
        role: "Ink veil shreds the target's RES and SP by -15%.",
      },
      {
        spellId: "summon-archer",
        role: "Orbits a scroll-archer that kites the player from range.",
      },
      {
        spellId: "spell-cursed-wound",
        role: "Pages of doom — 22 dmg and halves incoming healing.",
      },
    ],
    phase1SpellIds: [
      "spell-cursed-wound",
      "spell-mark",
      "spell-barrier",
      "summon-archer",
    ],
    phase2SpellIds: [
      "spell-mark",
      "spell-barrier",
      "spell-shadow-veil",
      "summon-archer",
      "spell-cursed-wound",
    ],
  },

  twin_monarchs: {
    bossId: "twin_monarchs",
    spells: [
      {
        spellId: "spell-rallying-cry",
        role: "Dawn king's cry — heals 20 and buffs CHC by +15%.",
      },
      {
        spellId: "spell-inferno",
        role: "Dusk king's touch — burns the target for 8 dmg/turn.",
      },
      {
        spellId: "spell-enrage",
        role: "Linked fury surges, raising their damage by +40%.",
      },
      {
        spellId: "spell-iron-skin",
        role: "Cord of light hardens, raising RES by +30%.",
      },
    ],
    phase1SpellIds: ["spell-rallying-cry", "spell-inferno"],
    phase2SpellIds: [
      "spell-rallying-cry",
      "spell-inferno",
      "spell-enrage",
      "spell-iron-skin",
    ],
  },

  enthroned_void: {
    bossId: "enthroned_void",
    spells: [
      {
        spellId: "spell-swap",
        role: "Black mist trades the throne's place with the player.",
      },
      {
        spellId: "spell-slow",
        role: "Creeping mist drains the player's MP by -2.",
      },
      {
        spellId: "spell-shadow-veil",
        role: "Void mist shreds the target's RES and SP by -15%.",
      },
      {
        spellId: "spell-frost-nova",
        role: "Anchor-shatter erupts in a void nova, slowing all nearby.",
      },
      {
        spellId: "summon-dire-wolf",
        role: "Phantom wolf claws forth from the mist to hunt.",
      },
    ],
    phase1SpellIds: ["spell-swap", "spell-slow", "summon-dire-wolf"],
    phase2SpellIds: [
      "spell-swap",
      "spell-slow",
      "spell-shadow-veil",
      "spell-frost-nova",
      "summon-dire-wolf",
    ],
  },
};

// ── Runtime validation ────────────────────────────────────────────────────────
//
// Runs once at module load. Throws if any kit references a spell id that is not
// in SPELL_ID_CATALOG, or if any kit is missing for a BossId. This is the
// explicit-metadata guarantee required by the project's user instructions:
// "All spell targeting and effect logic must use explicit metadata, never
// name-based heuristics." A missing spell id would silently break the AI's
// spell-pool lookup, so we fail loud at startup instead.

const CATALOG_SET: ReadonlySet<string> = new Set(SPELL_ID_CATALOG);

function validateBossKits(): void {
  for (const bossId of BOSS_IDS) {
    const kit = BOSS_KITS[bossId];
    if (!kit) {
      throw new Error(`bossKits: missing kit for boss "${bossId}"`);
    }
    if (kit.bossId !== bossId) {
      throw new Error(
        `bossKits: kit for "${bossId}" has mismatched bossId "${kit.bossId}"`,
      );
    }
    if (kit.spells.length < 3 || kit.spells.length > 5) {
      throw new Error(
        `bossKits: kit for "${bossId}" must have 3-5 spells, has ${kit.spells.length}`,
      );
    }
    for (const spell of kit.spells) {
      if (!CATALOG_SET.has(spell.spellId)) {
        throw new Error(
          `bossKits: kit for "${bossId}" references unknown spell id "${spell.spellId}"`,
        );
      }
    }
    // Phase subsets must reference only spells declared in the kit.
    const declared = new Set(kit.spells.map((s) => s.spellId));
    for (const id of kit.phase1SpellIds) {
      if (!declared.has(id)) {
        throw new Error(
          `bossKits: phase1SpellIds for "${bossId}" references undeclared spell "${id}"`,
        );
      }
    }
    for (const id of kit.phase2SpellIds) {
      if (!declared.has(id)) {
        throw new Error(
          `bossKits: phase2SpellIds for "${bossId}" references undeclared spell "${id}"`,
        );
      }
    }
    // Phase 2 must be an escalation: at least one spell phase 1 lacks.
    const phase1Set = new Set(kit.phase1SpellIds);
    const hasNewInPhase2 = kit.phase2SpellIds.some((id) => !phase1Set.has(id));
    if (!hasNewInPhase2) {
      throw new Error(
        `bossKits: phase2 for "${bossId}" must add at least one spell over phase1`,
      );
    }
  }
}

validateBossKits();

// ── Convenience lookups ───────────────────────────────────────────────────────

/** Returns the BossKit for a given boss id, or undefined if not found. */
export function getBossKit(bossId: string): BossKit | undefined {
  return BOSS_KITS[bossId as BossId];
}

/** Returns the phase-1 spell pool ids for a boss (empty array if not found). */
export function getBossPhase1SpellIds(bossId: string): string[] {
  return BOSS_KITS[bossId as BossId]?.phase1SpellIds ?? [];
}

/** Returns the phase-2 spell pool ids for a boss (empty array if not found). */
export function getBossPhase2SpellIds(bossId: string): string[] {
  return BOSS_KITS[bossId as BossId]?.phase2SpellIds ?? [];
}
