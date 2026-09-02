import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CombatantEntry } from "../components/InitiativeStrip";
import type { Enemy } from "../types/gameTypes";
import { summonControlIdAfterAdvance } from "../utils/summonControlCast.ts";
import { isActiveHostile } from "./battleSetup.ts";
import { addCombatant, initCombatantStore } from "./combatantStore.ts";
import {
  resolveEnemySummonUnitDef,
  spawnEnemySummonUnit,
} from "./summonSpawn.ts";

const wolfDef = { pieceType: "pawn", level: 1 };
const catalog = [
  { id: "summon-dire-wolf", summonUnitDef: wolfDef },
  { id: "no-summon" },
];

function emptyStore() {
  const turnOrderRef = { current: [] as CombatantEntry[] };
  const ctx = initCombatantStore(
    { current: [] },
    { current: [] },
    { current: [] },
    turnOrderRef,
    { current: 0 },
    () => {},
    () => {},
    () => {},
  );
  return { ctx, turnOrderRef };
}

describe("resolveEnemySummonUnitDef", () => {
  it("prefers the spell's own unit def", () => {
    const own = { pieceType: "knight", level: 2 };
    assert.equal(
      resolveEnemySummonUnitDef(
        { id: "summon-dire-wolf", summonUnitDef: own },
        catalog,
      ),
      own,
    );
  });

  it("falls back to the catalog by spell id", () => {
    assert.equal(
      resolveEnemySummonUnitDef({ id: "summon-dire-wolf" }, catalog),
      wolfDef,
    );
  });

  it("returns undefined when neither the spell nor the catalog has a def", () => {
    assert.equal(
      resolveEnemySummonUnitDef({ id: "no-summon" }, catalog),
      undefined,
    );
    assert.equal(resolveEnemySummonUnitDef(null, catalog), undefined);
    assert.equal(
      resolveEnemySummonUnitDef({ id: "missing" }, catalog),
      undefined,
    );
  });
});

describe("spawnEnemySummonUnit", () => {
  it("returns null instead of throwing when the spell has no unit def", () => {
    assert.equal(
      spawnEnemySummonUnit(
        { x: 1, y: 1 },
        { id: "no-summon" },
        catalog,
        3,
        () => {},
        () => ({ init: 4 }),
      ),
      null,
    );
  });

  it("always tags the minion hostile so control and victory treat it as an enemy", () => {
    const spawned = spawnEnemySummonUnit(
      { x: 3, y: 3 },
      { id: "summon-dire-wolf" },
      catalog,
      4,
      () => {},
      () => ({ init: 5 }),
    );
    assert.ok(spawned);
    assert.equal(spawned.summon.side, "enemy");
    assert.equal(spawned.summon.isSummon, true);
    assert.equal(spawned.turnOrderEntry.type, "enemy");
    assert.equal(summonControlIdAfterAdvance(spawned.turnOrderEntry), null);
  });

  it("commits through addCombatant the way the summoner short-circuit must", () => {
    const { ctx, turnOrderRef } = emptyStore();
    addCombatant(
      ctx,
      {
        id: "summoner-rat",
        x: 2,
        y: 2,
        level: 3,
        hp: 20,
        maxHp: 20,
        res: 0,
        sp: 0,
        chc: 0,
        init: 6,
        pieceType: "pawn",
        currentView: "front",
        isMoving: false,
        movementPath: [],
        scaleX: 1,
        scaleY: 1,
        nextMoveTime: 0,
        family: "plague_rat",
      } as Enemy,
      { battleParticipant: true },
    );

    // Mirrors WorldExploration: bind a commit callback, then invoke it
    // via optional chaining the way the summoner / boss short-circuits do.
    // A null ref (the pre-fix state) must not be the only wiring.
    let spawnRef:
      | ((cell: { x: number; y: number }, spell: any) => void)
      | null = null;
    const commit = (cell: { x: number; y: number }, spell: any) => {
      const spawned = spawnEnemySummonUnit(
        cell,
        spell,
        catalog,
        4,
        () => {},
        () => ({ init: 5 }),
      );
      if (!spawned) return;
      addCombatant(ctx, spawned.summon as unknown as Enemy, {
        battleParticipant: true,
        insertAfterId: "summoner-rat",
      });
    };
    spawnRef = commit;
    spawnRef?.({ x: 4, y: 4 }, { id: "summon-dire-wolf" });

    assert.equal(ctx.combatantsRef.current.length, 2);
    const minion = ctx.combatantsRef.current[1];
    assert.equal(minion.side, "enemy");
    assert.equal(minion.isSummon, true);
    assert.equal(isActiveHostile(minion), true);
    assert.equal(turnOrderRef.current[1].type, "enemy");
    assert.equal(summonControlIdAfterAdvance(turnOrderRef.current[1]), null);
    assert.equal(turnOrderRef.current[0].id, "summoner-rat");
    assert.equal(turnOrderRef.current[1].id, minion.id);
  });
});
