import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CombatantEntry } from "../components/InitiativeStrip";
import type { Enemy } from "../types/gameTypes";
import { summonControlIdAfterAdvance } from "../utils/summonControlCast.ts";
import { isActiveHostile } from "./battleSetup.ts";
import {
  addCombatant,
  combatantTurnEntryType,
  initCombatantStore,
} from "./combatantStore.ts";
import { spawnSummonUnit } from "./summonSpawn.ts";

function baseEnemy(id: string, extra: Partial<Enemy> = {}): Enemy {
  return {
    id,
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
    ...extra,
  };
}

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

describe("combatantTurnEntryType", () => {
  it("keeps player-side summons on the control route", () => {
    assert.equal(
      combatantTurnEntryType({ isSummon: true, side: "player" }),
      "summon",
    );
    assert.equal(combatantTurnEntryType({ side: "player" }), "player");
  });

  it("routes enemy-side summons through the hostile AI gate", () => {
    assert.equal(
      combatantTurnEntryType({ isSummon: true, side: "enemy" }),
      "enemy",
    );
    assert.equal(
      combatantTurnEntryType({ isSummon: true }),
      "enemy",
      "absent side on a summon defaults hostile — spawn must pass side",
    );
    assert.equal(combatantTurnEntryType({ side: "enemy" }), "enemy");
  });
});

describe("enemy summon spawn must not hand control to the player", () => {
  it("stores side/type so control id stays null and the unit is hostile", () => {
    const { ctx, turnOrderRef } = emptyStore();
    addCombatant(
      ctx,
      baseEnemy("enemy-wolf", {
        isSummon: true,
        side: "enemy",
        ownerId: "enemy",
      }),
      { battleParticipant: true },
    );

    const entry = turnOrderRef.current[0];
    assert.equal(entry.side, "enemy");
    assert.equal(entry.isSummon, true);
    assert.equal(entry.type, "enemy");
    assert.equal(summonControlIdAfterAdvance(entry), null);
    assert.equal(
      isActiveHostile(ctx.combatantsRef.current[0]),
      true,
      "enemy minions must be killed for victory",
    );
  });

  it("spawnSummonUnit side:enemy is what addCombatant reads", () => {
    const { summon, turnOrderEntry } = spawnSummonUnit(
      { x: 3, y: 3 },
      {
        id: "enemy-summon-wolf",
        name: "Enemy Summon wolf",
        summonUnitDef: { pieceType: "pawn", level: 1 },
        summonAI: "hunter",
      },
      "enemy",
      4,
      () => {},
      () => ({ init: 5 }),
      0,
      undefined,
      "enemy",
    );
    assert.equal(summon.side, "enemy");
    assert.equal(summon.isSummon, true);
    assert.equal(turnOrderEntry.type, "enemy");
    assert.equal(summonControlIdAfterAdvance(turnOrderEntry), null);
  });

  it("still binds control for a real player-side summon", () => {
    const { ctx, turnOrderRef } = emptyStore();
    addCombatant(
      ctx,
      baseEnemy("summon-archer", {
        isSummon: true,
        side: "player",
        ownerId: "player",
      }),
      { battleParticipant: true },
    );

    const entry = turnOrderRef.current[0];
    assert.equal(entry.type, "summon");
    assert.equal(summonControlIdAfterAdvance(entry), "summon-archer");
    assert.equal(isActiveHostile(ctx.combatantsRef.current[0]), false);
  });
});
