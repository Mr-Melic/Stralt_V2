import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Enemy, SpellConfig } from "../types/gameTypes.ts";
import {
  planPlayerCastAttempt,
  planPlayerCastResources,
  playerCastAttemptResult,
  shouldRejectCastForMissingAp,
} from "./playerCastPlan.ts";
import {
  canAffordCastAp,
  collectHighlightLiveMismatches,
  computeTargetableTiles,
  resolveCastApCost,
  shouldExecuteLiveCast,
} from "./targeting.ts";

function floorGrid(size: number): Array<Array<"floor" | "wall" | "portal">> {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => "floor" as const),
  );
}

function unit(
  id: string,
  x: number,
  y: number,
  extras: Partial<Enemy> = {},
): Enemy {
  return {
    id,
    x,
    y,
    hp: 20,
    maxHp: 20,
    name: id,
    pieceType: "pawn",
    ...extras,
  } as Enemy;
}

function strike(): SpellConfig {
  return {
    id: "physical_attack",
    name: "Strike",
    description: "",
    iconEmoji: "",
    apCost: 2n,
    mpCost: 0n,
    damage: 10n,
    range: 1n,
    effectType: "damage",
    targetType: "enemy",
    isPhysical: true,
    maxRange: 1,
    minRange: 1,
  } as SpellConfig;
}

describe("planPlayerCastResources", () => {
  it("uses the same modified AP cost for preview and execute", () => {
    const apply = (base: number) => Math.max(1, base - 1);
    assert.equal(resolveCastApCost(4, apply), 3);
    assert.deepEqual(
      planPlayerCastResources({
        currentAp: 3,
        baseApCost: 4,
        cooldownTurnsRemaining: 0,
        applyApCost: apply,
      }),
      { ok: true, apCost: 3 },
    );
    assert.equal(canAffordCastAp(3, 4, apply), true);
    const short = planPlayerCastResources({
      currentAp: 2,
      baseApCost: 4,
      cooldownTurnsRemaining: 0,
      applyApCost: apply,
    });
    assert.equal(short.ok, false);
    if (!short.ok) assert.equal(short.reason, "no_ap");
    assert.equal(canAffordCastAp(2, 4, apply), false);
  });

  it("blocks cooldown before AP so a highlighted spell cannot recast", () => {
    const blocked = planPlayerCastResources({
      currentAp: 6,
      baseApCost: 2,
      cooldownTurnsRemaining: 3,
    });
    assert.equal(blocked.ok, false);
    assert.equal(blocked.reason, "on_cooldown");
    assert.equal(blocked.apCost, 2);
  });

  it("lets a 0-AP spell execute when the wallet is empty", () => {
    assert.equal(
      shouldRejectCastForMissingAp({ currentAp: 0, baseApCost: 0 }),
      false,
    );
    assert.equal(
      shouldRejectCastForMissingAp({ currentAp: 0, baseApCost: 2 }),
      true,
    );
    assert.equal(
      shouldRejectCastForMissingAp({
        currentAp: 0,
        baseApCost: 2,
        applyApCost: () => 0,
      }),
      false,
      "Arcane Surge (or any modifier) reducing cost to 0 must match execute",
    );
    const timestep = planPlayerCastAttempt({
      spell: {
        ...strike(),
        id: "spell-timestep",
        apCost: 0n,
        damage: 0n,
        range: 0n,
        effectType: "buff",
        targetType: "self",
        isTimestep: true,
        maxRange: 0,
        minRange: 0,
      },
      caster: { x: 4, y: 4 },
      tile: { x: 4, y: 4 },
      liveCombatants: [],
      mapTiles: floorGrid(9),
      effectiveRange: 0,
      currentAp: 0,
      baseApCost: 0,
      cooldownTurnsRemaining: 0,
    });
    assert.equal(timestep.ok, true);
    assert.equal(playerCastAttemptResult(timestep), "ok");
  });
});

describe("planPlayerCastAttempt highlight vs execute", () => {
  const caster = { x: 4, y: 4 };
  const tiles = floorGrid(9);
  tiles[4][5] = "wall";
  const open = unit("open", 4, 5, { side: "enemy" });
  const blocked = unit("blocked", 6, 4, { side: "enemy" });
  const enemies = [open, blocked];
  const barriers = new Map<string, number>([["5,4", 2]]);
  const spell: SpellConfig = {
    ...strike(),
    id: "starter-poison",
    isPhysical: false,
    range: 3n,
    maxRange: 3,
    lineOfSight: true,
  };

  it("executes a highlighted legal hostile and refuses an illegal LoS tile", () => {
    const grid = {
      tiles,
      enemies,
      worldGridSize: 9,
      effectiveRange: 3,
      barrierTiles: barriers,
    };
    assert.deepEqual(collectHighlightLiveMismatches(spell, caster, grid), {
      highlightOnly: [],
      liveOnly: [],
    });
    const highlighted = computeTargetableTiles(spell, caster, grid);
    assert.equal(highlighted.has("4,5"), true);
    assert.equal(highlighted.has("6,4"), false);

    const legal = planPlayerCastAttempt({
      spell,
      caster,
      tile: { x: 4, y: 5 },
      liveCombatants: enemies,
      mapTiles: tiles,
      effectiveRange: 3,
      barrierTiles: barriers,
      currentAp: 4,
      baseApCost: 2,
      cooldownTurnsRemaining: 0,
    });
    assert.equal(legal.ok, true);
    assert.equal(playerCastAttemptResult(legal), "ok");
    assert.equal(shouldExecuteLiveCast(legal.live), true);

    const illegal = planPlayerCastAttempt({
      spell,
      caster,
      tile: { x: 6, y: 4 },
      liveCombatants: enemies,
      mapTiles: tiles,
      effectiveRange: 3,
      barrierTiles: barriers,
      currentAp: 4,
      baseApCost: 2,
      cooldownTurnsRemaining: 0,
    });
    assert.equal(illegal.ok, false);
    assert.equal(playerCastAttemptResult(illegal), "abort");
    assert.equal(shouldExecuteLiveCast(illegal.live), false);
  });

  it("does not spend AP when cooldown or range fails", () => {
    const onCd = planPlayerCastAttempt({
      spell,
      caster,
      tile: { x: 4, y: 5 },
      liveCombatants: enemies,
      mapTiles: tiles,
      effectiveRange: 3,
      barrierTiles: barriers,
      currentAp: 4,
      baseApCost: 2,
      cooldownTurnsRemaining: 1,
    });
    assert.equal(onCd.ok, false);
    assert.equal(playerCastAttemptResult(onCd), "on_cooldown");
    assert.equal(onCd.apCost, 2);

    const noAp = planPlayerCastAttempt({
      spell,
      caster,
      tile: { x: 4, y: 5 },
      liveCombatants: enemies,
      mapTiles: tiles,
      effectiveRange: 3,
      barrierTiles: barriers,
      currentAp: 1,
      baseApCost: 2,
      cooldownTurnsRemaining: 0,
    });
    assert.equal(noAp.ok, false);
    assert.equal(playerCastAttemptResult(noAp), "no_ap");
  });
});
