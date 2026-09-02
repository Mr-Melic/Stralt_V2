import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isActiveHostile } from "../engine/battleSetup.ts";
import {
  canAttackNearestAgainstLive,
  liveHostilesForAttackNearest,
  pickNearestAttackableHostile,
} from "../engine/targeting.ts";
import type { Enemy, SpellConfig } from "../types/gameTypes.ts";

function floorGrid(size: number): Array<Array<"floor" | "wall" | "portal">> {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => "floor" as const),
  );
}

function unit(
  id: string,
  x: number,
  y: number,
  extra: Partial<Enemy> = {},
): Enemy {
  return {
    id,
    x,
    y,
    hp: 20,
    maxHp: 20,
    name: id,
    pieceType: "pawn",
    ...extra,
  } as Enemy;
}

function poison(range: number): SpellConfig {
  return {
    id: "starter-poison",
    name: "Poison",
    description: "",
    iconEmoji: "",
    apCost: 2n,
    mpCost: 0n,
    damage: 8n,
    range: BigInt(range),
    effectType: "damage",
    targetType: "enemy",
    maxRange: range,
    minRange: 1,
  } as SpellConfig;
}

describe("liveHostilesForAttackNearest", () => {
  it("keeps an enemy-side minion that exists only in the live store", () => {
    const live = [
      unit("wolf", 2, 2, { isSummon: true, side: "player" }),
      unit("larva", 3, 3, { isSummon: true, side: "enemy" }),
    ];
    assert.deepEqual(
      liveHostilesForAttackNearest(live).map((e) => e.id),
      ["larva"],
    );
    assert.equal(isActiveHostile(live[0]), false);
    assert.equal(isActiveHostile(live[1]), true);
  });

  it("drops corpses and player-side allies so Attack Nearest cannot snipe them", () => {
    const live = [
      unit("dead-rat", 2, 2, { hp: 0, side: "enemy" }),
      unit("wolf", 2, 3, { isSummon: true, side: "player", hp: 40 }),
    ];
    assert.deepEqual(liveHostilesForAttackNearest(live), []);
  });

  it("drops a leftover player summon that never received an explicit side", () => {
    const live = [unit("leftover-wolf", 2, 2, { isSummon: true, hp: 40 })];
    assert.deepEqual(liveHostilesForAttackNearest(live), []);
  });
});

describe("pickNearestAttackableHostile production path", () => {
  it("skips a closer corpse and a leftover wolf so the living hostile is chosen", () => {
    const tiles = floorGrid(20);
    const caster = { x: 10, y: 10 };
    const corpse = unit("corpse", 11, 10, { hp: 0, side: "enemy" });
    const wolf = unit("wolf", 11, 11, { isSummon: true, side: "player" });
    const rat = unit("rat", 13, 10, { side: "enemy" });
    const live = [corpse, wolf, rat];
    const picked = pickNearestAttackableHostile(
      poison(5),
      caster,
      live,
      tiles,
      5,
    );
    assert.deepEqual(picked, { x: 13, y: 10 });
    assert.equal(
      canAttackNearestAgainstLive(poison(5), caster, live, tiles, 5),
      true,
    );
  });

  it("disables Attack Nearest when only dead or allied units remain", () => {
    const tiles = floorGrid(20);
    const caster = { x: 10, y: 10 };
    const live = [
      unit("dead", 11, 10, { hp: 0, side: "enemy" }),
      unit("wolf", 12, 10, { isSummon: true, side: "player" }),
    ];
    assert.equal(
      pickNearestAttackableHostile(poison(5), caster, live, tiles, 5),
      null,
    );
    assert.equal(
      canAttackNearestAgainstLive(poison(5), caster, live, tiles, 5),
      false,
    );
  });

  it("still skips a nearer LoS-blocked hostile after the live-store filter", () => {
    const tiles = floorGrid(20);
    tiles[10][11] = "wall";
    const caster = { x: 10, y: 10 };
    const blocked = unit("blocked", 12, 10, { side: "enemy" });
    const open = unit("open", 10, 13, { side: "enemy" });
    const wolf = unit("wolf", 11, 10, { isSummon: true, side: "player" });
    const spell = { ...poison(5), lineOfSight: true } as SpellConfig;
    const picked = pickNearestAttackableHostile(
      spell,
      caster,
      [blocked, open, wolf],
      tiles,
      5,
    );
    assert.deepEqual(picked, { x: 10, y: 13 });
  });
});
