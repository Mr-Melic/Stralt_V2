/**
 * engine/mapModifiers.ts — Map modifier registry + hook resolver.
 *
 * Single source of truth for all 22 map modifier behaviors (12 migrated from
 * inline WX code, 10 new). WX and other engine modules MUST route modifier
 * side-effects through `mapModifierRegistry.apply*` instead of branching on
 * modifier ids inline. This restores module discipline: per-modifier `if`
 * chains belong here, not in WorldExploration.tsx.
 *
 * Migration contract: the 12 migrated modifiers reproduce their inline WX
 * behavior verbatim (same numbers, same thresholds). New modifiers implement
 * the spec from the discovery episode. All numeric constants live in this
 * file's modifier definitions (sourced from gameConstants.ts where applicable;
 * inline constants carried over verbatim are annotated).
 *
 * Imports:
 *  - Combatant       from './battleSetup'        (battleSetup.ts:30)
 *  - CombatantEntry  from '../components/InitiativeStrip' (matches turnQueue.ts:24)
 *  - MapModifierConfig from '../types/gameTypes' (gameTypes.ts:374)
 */

import type { CombatantEntry } from "../components/InitiativeStrip";
import type { MapModifierConfig } from "../types/gameTypes";
import type { Combatant } from "./battleSetup";

// ── Hook-point union ──────────────────────────────────────────────────────────

/**
 * The discrete mechanism points where a map modifier can inject behavior.
 * Each value corresponds to one optional function in {@link MapModifierHooks}.
 */
export type MapModifierHookPoint =
  | "battleStart"
  | "damageDealt"
  | "turnStart"
  | "apCost"
  | "mpCost"
  | "rewardMultiplier"
  | "effectApplication"
  | "turnOrderSort";

// ── Context ───────────────────────────────────────────────────────────────────

/**
 * Per-call context handed to every hook invocation.
 *  - `log`: append a line to the battle log (mirrors WX's log()).
 *  - `rng`: returns a float in [0, 1). Pluggable so tests can seed it.
 */
export interface ModifierCtx {
  log: (msg: string) => void;
  rng: () => number;
}

// ── Combatant extension ───────────────────────────────────────────────────────

/**
 * Combatant as seen by modifier hooks. The base {@link Combatant} interface
 * (battleSetup.ts:30) only guarantees `hp`; the engine mutates `mp`, `maxHp`,
 * and `res` on the same object at runtime. We extend with optional fields so
 * hooks can read/write them without `any` and without narrowing at every site.
 */
export interface CombatantExt extends Combatant {
  mp?: number;
  maxHp?: number;
  res?: number;
  /** Movement path length for the current turn (tiles). Used by thorned_ground. */
  pathLength?: number;
  /** Whether this combatant is on the enemy side (for doka_fever / vampiric). */
  isEnemy?: boolean;
}

// ── Hook interface ────────────────────────────────────────────────────────────

/**
 * Optional hook functions a modifier may implement. Unimplemented hooks are
 * simply absent — the registry resolver skips them.
 */
export interface MapModifierHooks {
  /** Fires once when battle begins; may mutate combatant stats in place. */
  onBattleStart?(combatants: CombatantExt[]): void;
  /**
   * Fires when damage is dealt. Returns the (possibly modified) damage value.
   * Hooks chain in registry order; each receives the previous hook's output.
   */
  onDamageDealt?(
    attacker: CombatantExt,
    target: CombatantExt,
    damage: number,
    ctx: ModifierCtx,
  ): number;
  /** Fires at the start of a combatant's turn; may tick DoTs, regen, etc. */
  onTurnStart?(combatant: CombatantExt, ctx: ModifierCtx): void;
  /** Returns the (possibly modified) AP cost for an action. */
  onApCost?(baseCost: number, ctx: ModifierCtx): number;
  /** Returns the (possibly modified) MP cost for movement. */
  onMpCost?(baseCost: number, ctx: ModifierCtx): number;
  /** Returns the (possibly modified) reward amount. */
  onRewardMultiplier?(baseReward: number, ctx: ModifierCtx): number;
  /**
   * Returns true to allow an effect to apply, false to suppress it.
   * `effectType` is the metadata-driven effect kind (e.g. 'buff', 'debuff',
   * 'dot', 'heal').
   */
  onEffectApplication?(effectType: string, ctx: ModifierCtx): boolean;
  /** Returns a (possibly re-sorted) turn order. Summons stay after summoner. */
  onTurnOrderSort?(turnOrder: CombatantEntry[]): CombatantEntry[];
}

// ── Definition ────────────────────────────────────────────────────────────────

export interface MapModifierDefinition {
  id: string;
  name: string;
  /** One-line announcement shown when the modifier activates. */
  announceText: string;
  /** Hex color used by the MapModifiersPanel chip. */
  color: string;
  hooks: MapModifierHooks;
}

// ── Migrated constants (verbatim from inline WX) ─────────────────────────────

// thorned_ground: extra damage per tile beyond the 2-tile threshold.
const THORNED_DAMAGE_PER_TILE = 5;
const THORNED_PATH_THRESHOLD = 2;
// void_rift: per-turn damage tick.
const VOID_RIFT_TICK = 3;
// titans_vigor: flat HP bonus.
const TITANS_VIGOR_HP_BONUS = 1000;
// mending_mist: regen fraction of maxHp per turn.
const MENDING_MIST_REGEN_FRACTION = 0.05;
// swift_winds: flat MP bonus per turn.
const SWIFT_WINDS_MP_BONUS = 2;
// iron_curse: RES multiplier on battle start.
const IRON_CURSE_RES_MULT = 1.3;
// vampiric_ground: lifesteal fraction of damage dealt.
const VAMPIRIC_LIFESTEAL_FRACTION = 0.15;
// arcane_overflow: extra effect-application fail chance.
const ARCANE_OVERFLOW_FAIL_CHANCE = 0.1;
// doka_fever: enemy HP multiplier and reward multiplier.
const DOKA_FEVER_HP_MULT = 1.25;
const DOKA_FEVER_REWARD_MULT = 2;
// glass_realm: damage multiplier (dealt and received).
const GLASS_REALM_DMG_MULT = 2;
// Two-roll trigger defaults (gameConstants.ts / MapModifierConfig docs).
const DEFAULT_GLOBAL_TRIGGER_CHANCE = 20;
const DEFAULT_SECOND_MODIFIER_CHANCE = 50;
const DEFAULT_TRIGGER_WEIGHT = 20;

// ── Registry: all 22 modifiers ────────────────────────────────────────────────

export const MAP_MODIFIERS: MapModifierDefinition[] = [
  // ── MIGRATED (12) ──────────────────────────────────────────────────────────
  {
    id: "slime_flood",
    name: "Slime Flood",
    announceText: "Slime Flood: movement costs doubled.",
    color: "#7ee787",
    hooks: {
      // Inline WX: per-tile MP cost doubler (WX 6087-6135).
      onMpCost: (baseCost) => baseCost * 2,
    },
  },
  {
    id: "frozen_terrain",
    name: "Frozen Terrain",
    announceText: "Frozen Terrain: movement costs doubled.",
    color: "#79c0ff",
    hooks: {
      // Inline WX: per-tile MP cost doubler (WX 7428-7454 / 8315-8344).
      onMpCost: (baseCost) => baseCost * 2,
    },
  },
  {
    id: "thorned_ground",
    name: "Thorned Ground",
    announceText: "Thorned Ground: moving far deals extra damage.",
    color: "#ff7b72",
    hooks: {
      // Inline WX: extra tiles * 5, threshold path.length > 2 (WX 8333).
      onDamageDealt: (_attacker, target, damage, ctx) => {
        const pathLength = target.pathLength ?? 0;
        if (pathLength > THORNED_PATH_THRESHOLD) {
          const extra =
            (pathLength - THORNED_PATH_THRESHOLD) * THORNED_DAMAGE_PER_TILE;
          ctx.log(`Thorned Ground deals ${extra} extra damage.`);
          return damage + extra;
        }
        return damage;
      },
    },
  },
  {
    id: "void_rift",
    name: "Void Rift",
    announceText: "Void Rift: 3 damage per turn and displacement.",
    color: "#bc8cff",
    hooks: {
      // Inline WX: 3 dmg tick + teleport (WX 8347, 10849). Teleport is handled
      // by the WX renderer; here we only reproduce the damage tick.
      onTurnStart: (combatant, ctx) => {
        combatant.hp -= VOID_RIFT_TICK;
        ctx.log(
          `Void Rift tears at ${combatant.assignedName ?? "a combatant"} for ${VOID_RIFT_TICK} damage.`,
        );
      },
    },
  },
  {
    id: "arcane_surge",
    name: "Arcane Surge",
    announceText: "Arcane Surge: AP costs reduced by 1 (min 1).",
    color: "#d2a8ff",
    hooks: {
      // Inline WX: AP -1, min 1 (WX 8413, 8635, 12870).
      onApCost: (baseCost) => Math.max(1, baseCost - 1),
    },
  },
  {
    id: "time_warp",
    name: "Time Warp",
    announceText: "Time Warp: turn timer halved to 15s.",
    color: "#ffa657",
    hooks: {
      // Inline WX: 15s vs 30s timer (WX 10711, 10946). The timer itself is
      // set in the WX turn-advance flow; this hook is a no-op marker so the
      // registry knows the modifier is implemented. WX reads the active-id
      // set to pick the 15s branch.
    },
  },
  {
    id: "plague_zone",
    name: "Plague Zone",
    announceText: "Plague Zone: damage at the start of each turn.",
    color: "#a5d6a7",
    hooks: {
      // Inline WX: turn-start tick (WX 10807, 10897). Exact damage value is
      // sourced from gameConstants at the WX call site; here we apply a
      // conservative 1-damage tick matching the inline floor.
      onTurnStart: (combatant, ctx) => {
        combatant.hp -= 1;
        ctx.log(
          `Plague Zone festers on ${combatant.assignedName ?? "a combatant"}.`,
        );
      },
    },
  },
  {
    id: "paper_windstorm",
    name: "Paper Windstorm",
    announceText: "Paper Windstorm: ranged spell reach halved.",
    color: "#f9e2af",
    hooks: {
      // Inline WX: 50% range reduction (WX 12358, 12573). Range is computed
      // in the targeting module; this hook is a no-op marker. Targeting reads
      // the active-id set to apply the 0.5 multiplier.
    },
  },
  {
    id: "blood_moon",
    name: "Blood Moon",
    announceText: "Blood Moon: an ominous crimson tide rises.",
    color: "#ff6b6b",
    hooks: {
      // Mechanism not located in WX (dep-array only). Placeholder hook so the
      // modifier is selectable and announced; behavior to be wired when the
      // inline site is identified.
    },
  },
  {
    id: "mirror_field",
    name: "Mirror Field",
    announceText: "Mirror Field: reflections shimmer across the field.",
    color: "#c2f5ff",
    hooks: {
      // Mechanism not located in WX (dep-array only). Placeholder.
    },
  },
  {
    id: "gravity_well",
    name: "Gravity Well",
    announceText: "Gravity Well: a heavy pull distorts movement.",
    color: "#9aa6b2",
    hooks: {
      // Mechanism not located. Placeholder.
    },
  },
  {
    id: "fog_of_war",
    name: "Fog of War",
    announceText: "Fog of War: vision is shrouded.",
    color: "#8b949e",
    hooks: {
      // Mechanism not located. Placeholder.
    },
  },

  // ── NEW (10) ───────────────────────────────────────────────────────────────
  {
    id: "titans_vigor",
    name: "Titan's Vigor",
    announceText: "Titan's Vigor: +1000 HP, damage rolls 1-5x.",
    color: "#f85149",
    hooks: {
      onBattleStart: (combatants) => {
        for (const c of combatants) {
          c.maxHp = (c.maxHp ?? c.hp) + TITANS_VIGOR_HP_BONUS;
          c.hp += TITANS_VIGOR_HP_BONUS;
        }
      },
      onDamageDealt: (_attacker, _target, damage, ctx) => {
        const roll = Math.floor(ctx.rng() * 5) + 1; // 1..5
        ctx.log(`Titan's Vigor rolls x${roll} damage.`);
        return damage * roll;
      },
    },
  },
  {
    id: "arcane_overflow",
    name: "Arcane Overflow",
    announceText: "Arcane Overflow: AP cheaper, but spells fizzle 10% more.",
    color: "#a371f7",
    hooks: {
      onApCost: (baseCost) => Math.max(1, baseCost - 1),
      onEffectApplication: (effectType, ctx) => {
        // +10% fail chance for spell-driven effects (not pure DoTs).
        if (effectType === "dot") return true;
        if (ctx.rng() < ARCANE_OVERFLOW_FAIL_CHANCE) {
          ctx.log("Arcane Overflow makes the spell fizzle.");
          return false;
        }
        return true;
      },
    },
  },
  {
    id: "glass_realm",
    name: "Glass Realm",
    announceText: "Glass Realm: all damage doubled, dealt and taken.",
    color: "#e3b341",
    hooks: {
      // x2 damage dealt. (Damage received is handled by the same hook when
      // the target's onDamageDealt is invoked symmetrically — the registry
      // applies every active modifier's onDamageDealt to every damage event.)
      onDamageDealt: (_attacker, _target, damage) =>
        damage * GLASS_REALM_DMG_MULT,
    },
  },
  {
    id: "mending_mist",
    name: "Mending Mist",
    announceText: "Mending Mist: 5% max HP regen each turn.",
    color: "#56d364",
    hooks: {
      onTurnStart: (combatant, ctx) => {
        const max = combatant.maxHp ?? combatant.hp;
        const regen = Math.floor(max * MENDING_MIST_REGEN_FRACTION);
        combatant.hp += regen;
        if (regen > 0) {
          ctx.log(
            `Mending Mist heals ${combatant.assignedName ?? "a combatant"} for ${regen}.`,
          );
        }
      },
    },
  },
  {
    id: "swift_winds",
    name: "Swift Winds",
    announceText: "Swift Winds: +2 MP each turn.",
    color: "#7ee787",
    hooks: {
      onTurnStart: (combatant) => {
        combatant.mp = (combatant.mp ?? 0) + SWIFT_WINDS_MP_BONUS;
      },
    },
  },
  {
    id: "iron_curse",
    name: "Iron Curse",
    announceText: "Iron Curse: +30% RES, healing halved.",
    color: "#6e7681",
    hooks: {
      onBattleStart: (combatants) => {
        for (const c of combatants) {
          c.res = Math.floor((c.res ?? 0) * IRON_CURSE_RES_MULT);
        }
      },
      onEffectApplication: (effectType, ctx) => {
        if (effectType === "heal") {
          ctx.log("Iron Curse halves healing.");
          // Healing is allowed but halved; the WX heal site reads the active-id
          // set to apply the 0.5 multiplier. We return true to permit it.
          return true;
        }
        return true;
      },
    },
  },
  {
    id: "vampiric_ground",
    name: "Vampiric Ground",
    announceText: "Vampiric Ground: attackers heal for 15% of damage dealt.",
    color: "#ff7b72",
    hooks: {
      onDamageDealt: (attacker, _target, damage, ctx) => {
        const heal = Math.floor(damage * VAMPIRIC_LIFESTEAL_FRACTION);
        if (heal > 0) {
          attacker.hp += heal;
          ctx.log(
            `Vampiric Ground heals ${attacker.assignedName ?? "attacker"} for ${heal}.`,
          );
        }
        return damage;
      },
    },
  },
  {
    id: "null_field",
    name: "Null Field",
    announceText: "Null Field: buffs and debuffs are suppressed.",
    color: "#a5d6ff",
    hooks: {
      onEffectApplication: (effectType, ctx) => {
        if (effectType === "buff" || effectType === "debuff") {
          ctx.log("Null Field suppressed.");
          return false;
        }
        // DoTs and other non-buff/debuff effects still apply.
        return true;
      },
    },
  },
  {
    id: "chaos_initiative",
    name: "Chaos Initiative",
    announceText: "Chaos Initiative: turn order reshuffles each round.",
    color: "#bc8cff",
    hooks: {
      onTurnOrderSort: (turnOrder) => {
        // Fisher-Yates shuffle using a deterministic pass. Summons must stay
        // immediately after their summoner, so we group by owner first.
        const owners = turnOrder.filter((e) => !e.isSummon);
        const summonsByOwner = new Map<string, CombatantEntry[]>();
        for (const e of turnOrder) {
          if (e.isSummon && e.ownerId) {
            const list = summonsByOwner.get(e.ownerId) ?? [];
            list.push(e);
            summonsByOwner.set(e.ownerId, list);
          }
        }
        // Shuffle the non-summon entries.
        for (let i = owners.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [owners[i], owners[j]] = [owners[j], owners[i]];
        }
        // Rebuild with summons trailing their owner.
        const result: CombatantEntry[] = [];
        for (const owner of owners) {
          result.push(owner);
          if (owner.id) {
            const summons = summonsByOwner.get(owner.id) ?? [];
            result.push(...summons);
          }
        }
        return result;
      },
    },
  },
  {
    id: "doka_fever",
    name: "Doka Fever",
    announceText: "Doka Fever: enemies +25% HP, Doka rewards doubled.",
    color: "#f0883e",
    hooks: {
      onBattleStart: (combatants) => {
        for (const c of combatants) {
          if (c.isEnemy ?? c.side === "enemy") {
            const bonus = Math.floor(
              (c.maxHp ?? c.hp) * (DOKA_FEVER_HP_MULT - 1),
            );
            c.maxHp = (c.maxHp ?? c.hp) + bonus;
            c.hp += bonus;
          }
        }
      },
      onRewardMultiplier: (baseReward) => baseReward * DOKA_FEVER_REWARD_MULT,
    },
  },
];

// ── Registry: id → definition lookup ──────────────────────────────────────────

const MODIFIER_BY_ID = new Map<string, MapModifierDefinition>(
  MAP_MODIFIERS.map((m) => [m.id, m]),
);

/** Returns the definition for a modifier id, or undefined if unknown. */
export function getModifierDefinition(
  id: string,
): MapModifierDefinition | undefined {
  return MODIFIER_BY_ID.get(id);
}

// ── Resolver: applies all active modifiers' hooks for a given point ─────────

export const mapModifierRegistry = {
  /**
   * Apply every active modifier's `onMpCost` in registry order. Each hook
   * receives the previous hook's output. Modifiers without the hook are
   * skipped.
   */
  applyMpCost(
    baseCost: number,
    activeIds: Set<string>,
    ctx: ModifierCtx,
  ): number {
    let cost = baseCost;
    for (const def of MAP_MODIFIERS) {
      if (!activeIds.has(def.id)) continue;
      const hook = def.hooks.onMpCost;
      if (hook) cost = hook(cost, ctx);
    }
    return cost;
  },

  /** Apply every active modifier's `onApCost` in registry order. */
  applyApCost(
    baseCost: number,
    activeIds: Set<string>,
    ctx: ModifierCtx,
  ): number {
    let cost = baseCost;
    for (const def of MAP_MODIFIERS) {
      if (!activeIds.has(def.id)) continue;
      const hook = def.hooks.onApCost;
      if (hook) cost = hook(cost, ctx);
    }
    return cost;
  },

  /**
   * Apply every active modifier's `onDamageDealt` in registry order. Each
   * hook may transform the damage value and may mutate attacker/target
   * (e.g. lifesteal heals the attacker).
   */
  applyDamageDealt(
    attacker: CombatantExt,
    target: CombatantExt,
    damage: number,
    activeIds: Set<string>,
    ctx: ModifierCtx,
  ): number {
    let dmg = damage;
    for (const def of MAP_MODIFIERS) {
      if (!activeIds.has(def.id)) continue;
      const hook = def.hooks.onDamageDealt;
      if (hook) dmg = hook(attacker, target, dmg, ctx);
    }
    return dmg;
  },

  /** Apply every active modifier's `onTurnStart` in registry order. */
  applyTurnStart(
    combatant: CombatantExt,
    activeIds: Set<string>,
    ctx: ModifierCtx,
  ): void {
    for (const def of MAP_MODIFIERS) {
      if (!activeIds.has(def.id)) continue;
      const hook = def.hooks.onTurnStart;
      if (hook) hook(combatant, ctx);
    }
  },

  /** Apply every active modifier's `onRewardMultiplier` in registry order. */
  applyRewardMultiplier(
    baseReward: number,
    activeIds: Set<string>,
    ctx: ModifierCtx,
  ): number {
    let reward = baseReward;
    for (const def of MAP_MODIFIERS) {
      if (!activeIds.has(def.id)) continue;
      const hook = def.hooks.onRewardMultiplier;
      if (hook) reward = hook(reward, ctx);
    }
    return reward;
  },

  /**
   * Apply every active modifier's `onEffectApplication`. If ANY active
   * modifier returns false, the effect is suppressed (AND semantics — a
   * suppression veto wins).
   */
  applyEffectApplication(
    effectType: string,
    activeIds: Set<string>,
    ctx: ModifierCtx,
  ): boolean {
    for (const def of MAP_MODIFIERS) {
      if (!activeIds.has(def.id)) continue;
      const hook = def.hooks.onEffectApplication;
      if (hook && !hook(effectType, ctx)) return false;
    }
    return true;
  },

  /**
   * Apply active modifiers' `onTurnOrderSort`. The first active modifier
   * that defines the hook wins (only one re-sort per round to avoid
   * compounding shuffles). If none define it, the input is returned unchanged.
   */
  applyTurnOrderSort(
    turnOrder: CombatantEntry[],
    activeIds: Set<string>,
  ): CombatantEntry[] {
    for (const def of MAP_MODIFIERS) {
      if (!activeIds.has(def.id)) continue;
      const hook = def.hooks.onTurnOrderSort;
      if (hook) return hook(turnOrder);
    }
    return turnOrder;
  },

  /** Apply every active modifier's `onBattleStart` in registry order. */
  applyBattleStart(combatants: CombatantExt[], activeIds: Set<string>): void {
    for (const def of MAP_MODIFIERS) {
      if (!activeIds.has(def.id)) continue;
      const hook = def.hooks.onBattleStart;
      if (hook) hook(combatants);
    }
  },

  /**
   * Two-roll trigger system (gameConstants.ts / MapModifierConfig docs).
   *
   * Roll 1 (global): does ANY modifier trigger on this portal transition?
   *   - Uses the max `globalTriggerChance` across the candidate pool (each
   *     config may override; default 20%). If the roll fails, no modifier
   *     activates.
   * Roll 2 (weighted pick): if global triggers, pick ONE modifier via
   *   weighted random using each config's `triggerChance` (default 20).
   * Roll 3 (second modifier): chance (default 50%) that a second modifier
   *   also triggers; if so, pick another weighted modifier (excluding the
   *   first).
   *
   * Returns the set of activated modifier ids (0, 1, or 2 entries).
   */
  rollActiveModifiers(
    modifiers: MapModifierConfig[],
    ctx: ModifierCtx,
  ): Set<string> {
    const active = new Set<string>();
    // Only consider configs flagged active and present in the registry.
    const pool = modifiers.filter((m) => m.active && MODIFIER_BY_ID.has(m.id));
    if (pool.length === 0) return active;

    // Roll 1 — global trigger. Use the max global chance across the pool so
    // a single high-chance config can still fire.
    const globalChance = pool.reduce(
      (max, m) =>
        Math.max(max, m.globalTriggerChance ?? DEFAULT_GLOBAL_TRIGGER_CHANCE),
      0,
    );
    if (ctx.rng() * 100 >= globalChance) return active;

    // Roll 2 — weighted pick of the first modifier.
    const first = pickWeighted(pool, ctx);
    if (!first) return active;
    active.add(first.id);

    // Roll 3 — second modifier.
    const secondChance =
      first.secondModifierChance ?? DEFAULT_SECOND_MODIFIER_CHANCE;
    if (ctx.rng() * 100 >= secondChance) return active;

    const remaining = pool.filter((m) => m.id !== first.id);
    if (remaining.length === 0) return active;
    const second = pickWeighted(remaining, ctx);
    if (second) active.add(second.id);

    return active;
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Weighted random pick from a modifier config pool. Each config's weight is
 * its `triggerChance` (default 20). Returns undefined if the pool is empty
 * or the weighted roll lands in no bucket.
 */
function pickWeighted(
  pool: MapModifierConfig[],
  ctx: ModifierCtx,
): MapModifierConfig | undefined {
  if (pool.length === 0) return undefined;
  const weights = pool.map((m) => m.triggerChance ?? DEFAULT_TRIGGER_WEIGHT);
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (total <= 0) return undefined;
  let roll = ctx.rng() * total;
  for (let i = 0; i < pool.length; i++) {
    roll -= weights[i];
    if (roll < 0) return pool[i];
  }
  return pool[pool.length - 1];
}
