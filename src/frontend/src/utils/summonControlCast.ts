/**
 * Player-controlled summon casts.
 *
 * SummonControlPanel lists kit spells from starterSpells via
 * summonUnitDef.summonKit. spawnSummonUnit never copies that kit onto
 * summon.spells, so looking up selectedSummonSpellId on summon.spells
 * silently no-ops — the panel buttons do nothing.
 *
 * Resolve the kit the same way the panel does, then gate on AP and
 * Chebyshev range before resolveSpellCast. When a live world snapshot is
 * supplied, the same isTileCastableLive gate as player clicks also runs
 * so LoS / walls / target-type cannot drift. Debit AP after the attempt
 * (including fizzle) so a 2-AP Archer cannot wipe the room in one turn.
 * Optional `liveGate` applies the same highlight/live geometry as the
 * player (LoS, barriers, minRange) without changing the AP debit.
 */

import { isActiveHostile } from "../engine/battleSetup.ts";
import {
  type TileCastableResult,
  type TileType,
  chebyshevOnBoard,
  isCasterTile,
  isTileCastableLive,
  shouldExecuteLiveCast,
} from "../engine/targeting.ts";
import type { Enemy, SpellConfig } from "../types/gameTypes.ts";

export interface SummonKitCatalogSpell {
  id: string;
  name?: string;
  apCost?: unknown;
  range?: unknown;
  maxRange?: number;
  targetType?: string;
  areaRadius?: number;
  summonUnitDef?: {
    pieceType?: string;
    summonKit?: string[];
  };
}

/**
 * Chebyshev fast-fail used before the live gate. Area expansion tiles
 * sit beyond caster range (range + areaRadius); `all` has no cap.
 * Must never reject a tile `isTileCastableLive` would accept.
 */
export function summonControlRangeCap(
  spell: Pick<SummonKitCatalogSpell, "targetType" | "areaRadius">,
  range: number,
): number {
  const t = (spell.targetType ?? "enemy") as string;
  if (t === "all") return Number.POSITIVE_INFINITY;
  if (t === "area") {
    return range + Math.max(0, Math.floor(Number(spell.areaRadius) || 0));
  }
  return range;
}

export type SummonControlCastFail =
  | "no_spell"
  | "no_ap"
  | "out_of_range"
  | "illegal_target";

/**
 * One kit-button selection produces one cast. setSelectedSummonSpellId(null)
 * is async, so a synthetic click (or a double-click before re-render) still
 * sees the old id and can spend leftover AP a second time.
 */
export function canStartSummonControlCast(
  selectedSpellId: string | null | undefined,
  alreadyCommitted: boolean,
): boolean {
  return Boolean(selectedSpellId) && alreadyCommitted !== true;
}

/**
 * Prefer the live combatant-store AP. A captured summon object from the
 * first click of a double-tap is stale after updateCombatant.
 */
export function resolveLiveSummonAp(
  liveSummon: unknown,
  fallback: unknown,
): number {
  const readAp = (row: unknown): unknown =>
    row && typeof row === "object" && "currentAp" in row
      ? (row as { currentAp?: unknown }).currentAp
      : undefined;
  const raw = readAp(liveSummon) ?? readAp(fallback);
  return Math.max(0, Math.floor(Number(raw) || 0));
}

export type SummonControlCastPlan<T extends SummonKitCatalogSpell> =
  | { ok: false; reason: SummonControlCastFail }
  | {
      ok: true;
      spell: T;
      remainingAp: number;
      breaksStriker: boolean;
    };

export function resolveSummonControlSpell<T extends SummonKitCatalogSpell>(
  pieceType: string,
  spellId: string,
  catalog: T[],
  fallbackSpells: T[] = [],
): T | undefined {
  const unitDef = catalog.find(
    (sp) => sp.summonUnitDef?.pieceType === pieceType,
  )?.summonUnitDef;
  const kitIds = Array.isArray(unitDef?.summonKit) ? unitDef.summonKit : [];
  if (kitIds.includes(spellId)) {
    const fromCatalog = catalog.find((sp) => sp.id === spellId);
    if (fromCatalog) return fromCatalog;
  }
  return fallbackSpells.find((sp) => sp.id === spellId);
}

type SummonClickUnit = {
  id: string;
  x: number;
  y: number;
  hp?: number;
  side?: string;
  isSummon?: boolean;
};

/**
 * Occupant the kit click should pass to resolveSpellCast.
 *
 * Enemy / area / line / chain still require a living hostile — that is
 * the historic canvas router. Self / ally use the live gate so a Wisp
 * Blood Mend (or Sentinel Shield on self) is not silently dropped
 * because the caster tile is not `isActiveHostile`.
 */
export function resolveSummonControlClickTarget<T extends SummonClickUnit>(
  spell: Pick<SummonKitCatalogSpell, "targetType">,
  caster: T,
  tile: { x: number; y: number },
  occupant: T | undefined,
  live: TileCastableResult,
): T | null {
  if (!shouldExecuteLiveCast(live)) return null;
  const t = (spell.targetType ?? "enemy") as string;
  if (t === "self") {
    return isCasterTile(caster, tile) ? caster : null;
  }
  if (t === "ally") {
    if (isCasterTile(caster, tile)) return caster;
    if (
      occupant &&
      occupant.isSummon === true &&
      occupant.side === "player" &&
      (occupant.hp ?? 0) > 0
    ) {
      return occupant;
    }
    return null;
  }
  if (
    occupant &&
    isActiveHostile({
      hp: occupant.hp ?? 0,
      isSummon: occupant.isSummon,
      side:
        occupant.side === "player" || occupant.side === "enemy"
          ? occupant.side
          : undefined,
    })
  ) {
    return occupant;
  }
  return null;
}

export function pickSummonControlClickTarget<T extends SummonClickUnit>(args: {
  spell: Pick<SummonKitCatalogSpell, "targetType"> & Partial<SpellConfig>;
  caster: T;
  tile: { x: number; y: number };
  combatants: T[];
  tiles: TileType[][];
  effectiveRange?: number;
  barrierTiles?: Map<string, number>;
}): T | null {
  const occupant = args.combatants.find(
    (e) => e.x === args.tile.x && e.y === args.tile.y,
  );
  const live = isTileCastableLive(
    args.spell as SpellConfig,
    args.caster,
    args.tile,
    args.combatants as unknown as Enemy[],
    args.tiles,
    args.effectiveRange,
    args.barrierTiles ?? new Map(),
  );
  return resolveSummonControlClickTarget(
    args.spell,
    args.caster,
    args.tile,
    occupant,
    live,
  );
}

export function chebyshevDistance(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  const ax = Number(a.x);
  const ay = Number(a.y);
  const bx = Number(b.x);
  const by = Number(b.y);
  if (![ax, ay, bx, by].every(Number.isFinite)) {
    return Number.POSITIVE_INFINITY;
  }
  return chebyshevOnBoard({ x: ax, y: ay }, { x: bx, y: by });
}

export function planSummonControlCast<T extends SummonKitCatalogSpell>(args: {
  pieceType: string;
  spellId: string;
  catalog: T[];
  fallbackSpells?: T[];
  currentAp: number;
  caster: { x: number; y: number };
  target: { x: number; y: number };
  liveGate?: {
    tiles: TileType[][];
    combatants: Enemy[];
    effectiveRange?: number;
    barrierTiles?: Map<string, number>;
  };
}): SummonControlCastPlan<T> {
  const spell = resolveSummonControlSpell(
    args.pieceType,
    args.spellId,
    args.catalog,
    args.fallbackSpells,
  );
  if (!spell) return { ok: false, reason: "no_spell" };

  const cost = Math.max(0, Math.floor(Number(spell.apCost) || 0));
  const ap = Math.max(0, Math.floor(Number(args.currentAp) || 0));
  if (ap < cost) return { ok: false, reason: "no_ap" };

  const range = Math.max(
    1,
    Math.floor(
      Number(args.liveGate?.effectiveRange ?? spell.maxRange ?? spell.range) ||
        0,
    ),
  );
  const dist = chebyshevDistance(args.caster, args.target);
  if (dist > summonControlRangeCap(spell, range)) {
    return { ok: false, reason: "out_of_range" };
  }

  if (args.liveGate) {
    const live = isTileCastableLive(
      spell as unknown as SpellConfig,
      args.caster,
      args.target,
      args.liveGate.combatants,
      args.liveGate.tiles,
      args.liveGate.effectiveRange ?? range,
      args.liveGate.barrierTiles ?? new Map(),
    );
    if (!shouldExecuteLiveCast(live)) {
      return { ok: false, reason: "illegal_target" };
    }
  }

  return {
    ok: true,
    spell,
    remainingAp: ap - cost,
    // legendary_3 Striker: every spent attempt must land within 2 tiles
    // of the caster (the summon tile, not the player).
    breaksStriker: dist > 2,
  };
}

export function summonControlCastFailMessage(
  reason: SummonControlCastFail,
): string {
  switch (reason) {
    case "no_ap":
      return "Not enough AP";
    case "out_of_range":
      return "Out of range";
    case "illegal_target":
      return "Invalid target";
    default:
      return "Unknown spell";
  }
}

/**
 * Canvas mouse/touch routing into summon-control walks and kit casts.
 *
 * handleBossRushRoomClear used to leave the wolf on the map AND keep
 * activeControlledSummonId set. After recap dismiss, every click then
 * walked the summon (and returned) so the player could not step the
 * progression portal. Regular victory already despawned, so `if (summon)`
 * failed and clicks fell through. Gate on inBattle so leftover control
 * cannot capture overworld input even if despawn is skipped.
 */
export function shouldRouteCanvasToSummonControl(opts: {
  inBattle: boolean;
  controlledSummonId: string | null | undefined;
  summonStillLive: boolean;
}): boolean {
  return (
    opts.inBattle === true &&
    Boolean(opts.controlledSummonId) &&
    opts.summonStillLive === true
  );
}

/**
 * Summon-control id after a turn advance.
 *
 * Previous control is never carried forward. The 30s turn timer (and any
 * other advanceTurn caller) used to leave activeControlledSummonId set, so
 * canvas clicks and BattleUIPanel End Turn stayed locked to the summon
 * through later player and enemy turns.
 */
export function summonControlIdAfterAdvance(
  nextCombatant:
    | { id?: string; isSummon?: boolean; side?: string }
    | null
    | undefined,
): string | null {
  if (
    nextCombatant &&
    nextCombatant.isSummon === true &&
    nextCombatant.side === "player" &&
    typeof nextCombatant.id === "string" &&
    nextCombatant.id.length > 0
  ) {
    return nextCombatant.id;
  }
  return null;
}

/**
 * Per-turn AP/MP budget when a player-controlled summon's turn starts.
 *
 * spawnSummonUnit seeds currentAp/currentMp once. The enemy-AI path
 * resets them at the start of handleSummonTurn, but player-side control
 * never calls that — leftover 0 AP after Poison Arrow (2) from a 2-AP
 * Archer then auto-ends the remaining lifespan-4 turns.
 */
export function summonTurnBudget(summon: {
  maxAp?: unknown;
  maxMp?: unknown;
}): { currentAp: number; currentMp: number } {
  return {
    currentAp: Math.max(0, Math.floor(Number(summon.maxAp) || 0)),
    currentMp: Math.max(0, Math.floor(Number(summon.maxMp) || 0)),
  };
}
