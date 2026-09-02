import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ActiveEffect } from "../types/gameTypes";
import {
  applyOrRefreshNonDotEffect,
  formatBattleEffectMagnitude,
  getStatModifier,
  isAdditiveResourceStat,
  mergeIncomingEffect,
  tickNonDotEffects,
} from "./statusEffects.ts";

function fx(
  partial: Partial<ActiveEffect> &
    Pick<ActiveEffect, "effectName" | "type" | "targetId">,
): ActiveEffect {
  return {
    id: partial.id ?? `id-${partial.effectName}-${partial.targetId}`,
    iconEmoji: "✨",
    description: "",
    duration: 3,
    ...partial,
  };
}

describe("isAdditiveResourceStat", () => {
  it("treats only ap and mp as additive", () => {
    assert.equal(isAdditiveResourceStat("ap"), true);
    assert.equal(isAdditiveResourceStat("mp"), true);
    assert.equal(isAdditiveResourceStat("dmg"), false);
    assert.equal(isAdditiveResourceStat("res"), false);
    assert.equal(isAdditiveResourceStat("maxAp"), false);
    assert.equal(isAdditiveResourceStat("maxMp"), false);
  });
});

describe("getStatModifier", () => {
  it("returns 0 for AP/MP and 1 for other stats when nothing matches", () => {
    const effects = [
      fx({
        effectName: "Rage",
        type: "buff",
        targetId: "enemy-1",
        stat: "dmg",
        modifier: 1.5,
      }),
    ];
    assert.equal(getStatModifier("player", "ap", effects), 0);
    assert.equal(getStatModifier("player", "mp", effects), 0);
    assert.equal(getStatModifier("player", "dmg", effects), 1);
  });

  it("multiplies matching buff/debuff modifiers for non-resource stats", () => {
    const effects = [
      fx({
        effectName: "Rage",
        type: "buff",
        targetId: "player",
        stat: "dmg",
        modifier: 1.2,
      }),
      fx({
        effectName: "Hex",
        type: "debuff",
        targetId: "player",
        stat: "dmg",
        modifier: 0.5,
      }),
      fx({
        effectName: "Ward",
        type: "buff",
        targetId: "player",
        stat: "res",
        modifier: 1.3,
      }),
    ];
    assert.equal(getStatModifier("player", "dmg", effects), 0.6);
    assert.equal(getStatModifier("player", "res", effects), 1.3);
  });

  it("sums matching AP/MP modifiers", () => {
    const effects = [
      fx({
        effectName: "Haste",
        type: "buff",
        targetId: "player",
        stat: "ap",
        modifier: 2,
      }),
      fx({
        effectName: "Slow",
        type: "debuff",
        targetId: "player",
        stat: "ap",
        modifier: -1,
      }),
      fx({
        effectName: "Focus",
        type: "buff",
        targetId: "player",
        stat: "mp",
        modifier: 3,
      }),
    ];
    assert.equal(getStatModifier("player", "ap", effects), 1);
    assert.equal(getStatModifier("player", "mp", effects), 3);
  });

  it("ignores other targets, other stats, DoT rows, and missing modifiers", () => {
    const effects = [
      fx({
        effectName: "Other",
        type: "buff",
        targetId: "e1",
        stat: "dmg",
        modifier: 2,
      }),
      fx({
        effectName: "WrongStat",
        type: "buff",
        targetId: "player",
        stat: "res",
        modifier: 2,
      }),
      fx({
        effectName: "Burn",
        type: "dot",
        targetId: "player",
        stat: "dmg",
        modifier: 9,
        dotDamagePerTurn: 4,
      }),
      fx({
        effectName: "EmptyDmg",
        type: "buff",
        targetId: "player",
        stat: "dmg",
      }),
      fx({
        effectName: "EmptyAp",
        type: "buff",
        targetId: "player",
        stat: "ap",
      }),
    ];
    assert.equal(getStatModifier("player", "dmg", effects), 1);
    assert.equal(getStatModifier("player", "ap", effects), 0);
  });
});

describe("applyOrRefreshNonDotEffect", () => {
  it("appends when no same-name+target row exists", () => {
    const haste = fx({
      effectName: "Haste",
      type: "buff",
      targetId: "player",
      stat: "ap",
      modifier: 1,
    });
    const ward = fx({
      effectName: "Ward",
      type: "buff",
      targetId: "player",
      stat: "res",
      modifier: 1.2,
    });
    const next = applyOrRefreshNonDotEffect([haste], ward);
    assert.equal(next.length, 2);
    assert.equal(next[0], haste);
    assert.equal(next[1], ward);
  });

  it("replaces the first same-name+target row and leaves other rows", () => {
    const oldHaste = fx({
      id: "old",
      effectName: "Haste",
      type: "buff",
      targetId: "player",
      stat: "ap",
      modifier: 1,
      duration: 1,
    });
    const enemyHaste = fx({
      effectName: "Haste",
      type: "buff",
      targetId: "e1",
      stat: "ap",
      modifier: 2,
    });
    const ward = fx({
      effectName: "Ward",
      type: "buff",
      targetId: "player",
      stat: "res",
      modifier: 1.2,
    });
    const refreshed = fx({
      id: "new",
      effectName: "Haste",
      type: "buff",
      targetId: "player",
      stat: "ap",
      modifier: 3,
      duration: 4,
    });
    const next = applyOrRefreshNonDotEffect(
      [oldHaste, enemyHaste, ward],
      refreshed,
    );
    assert.deepEqual(
      next.map((e) => e.id),
      ["new", enemyHaste.id, ward.id],
    );
    assert.equal(next[0].duration, 4);
    assert.equal(next[0].modifier, 3);
    assert.equal(next[1], enemyHaste);
    assert.equal(next[2], ward);
  });

  it("does not mutate the input array", () => {
    const haste = fx({
      effectName: "Haste",
      type: "buff",
      targetId: "player",
    });
    const prev = [haste];
    applyOrRefreshNonDotEffect(
      prev,
      fx({ effectName: "Ward", type: "buff", targetId: "player" }),
    );
    assert.equal(prev.length, 1);
    assert.equal(prev[0], haste);
  });
});

describe("mergeIncomingEffect", () => {
  it("stacks same-name DoTs instead of replacing", () => {
    const first = fx({
      effectName: "Burn",
      type: "dot",
      targetId: "e1",
      dotDamagePerTurn: 8,
      duration: 2,
    });
    const second = fx({
      effectName: "Burn",
      type: "dot",
      targetId: "e1",
      dotDamagePerTurn: 5,
      duration: 3,
    });
    const next = mergeIncomingEffect([first], second);
    assert.equal(next.length, 2);
    assert.equal(next[0].dotDamagePerTurn, 8);
    assert.equal(next[1].dotDamagePerTurn, 5);
    assert.ok(next[1].stackId);
  });

  it("still replace-or-refreshes non-DoT rows", () => {
    const old = fx({
      effectName: "Haste",
      type: "buff",
      targetId: "player",
      duration: 1,
    });
    const next = mergeIncomingEffect(
      [old],
      fx({
        id: "fresh",
        effectName: "Haste",
        type: "buff",
        targetId: "player",
        duration: 5,
      }),
    );
    assert.equal(next.length, 1);
    assert.equal(next[0].id, "fresh");
    assert.equal(next[0].duration, 5);
  });
});

describe("formatBattleEffectMagnitude", () => {
  it("matches WorldExploration battle-log signed magnitudes, not the badge", () => {
    assert.equal(formatBattleEffectMagnitude("dmg", 1.25), "+25%");
    assert.equal(formatBattleEffectMagnitude("res", 0.8), "-20%");
    assert.equal(formatBattleEffectMagnitude("chc", 1), "0%");
    assert.equal(formatBattleEffectMagnitude("ap", 2), "+2");
    assert.equal(formatBattleEffectMagnitude("mp", 0), "0");
    assert.equal(formatBattleEffectMagnitude("ap", -1), "-1");
  });
});

describe("tickNonDotEffects", () => {
  it("decrements non-DoT duration on the target and drops expired rows", () => {
    const haste = fx({
      effectName: "Haste",
      type: "buff",
      targetId: "player",
      stat: "ap",
      modifier: 1,
      duration: 2,
    });
    const lastWard = fx({
      effectName: "Ward",
      type: "buff",
      targetId: "player",
      stat: "res",
      modifier: 1.2,
      duration: 1,
    });
    const enemySlow = fx({
      effectName: "Slow",
      type: "debuff",
      targetId: "e1",
      stat: "ap",
      modifier: -1,
      duration: 2,
    });
    const burn = fx({
      effectName: "Burn",
      type: "dot",
      targetId: "player",
      dotDamagePerTurn: 4,
      duration: 2,
    });
    const { remaining, decremented } = tickNonDotEffects(
      [haste, lastWard, enemySlow, burn],
      "player",
    );

    assert.equal(remaining.length, 3);
    assert.equal(remaining[0].effectName, "Haste");
    assert.equal(remaining[0].duration, 1);
    assert.equal(remaining[1], enemySlow);
    assert.equal(remaining[1].duration, 2);
    assert.equal(remaining[2], burn);
    assert.equal(remaining[2].duration, 2);

    // Characterization: every decremented non-DoT is returned, including
    // Haste which is still active. WX logs "expired" for each of these.
    assert.deepEqual(
      decremented.map((e) => e.effectName),
      ["Haste", "Ward"],
    );
  });

  it("does not decrement type===dot rows even when they have no damage", () => {
    const ghostDot = fx({
      effectName: "GhostDot",
      type: "dot",
      targetId: "player",
      duration: 1,
    });
    const { remaining, decremented } = tickNonDotEffects([ghostDot], "player");
    assert.equal(remaining.length, 1);
    assert.equal(remaining[0].duration, 1);
    assert.deepEqual(decremented, []);
  });

  it("does not mutate the input array or surviving effect objects in place", () => {
    const haste = fx({
      effectName: "Haste",
      type: "buff",
      targetId: "player",
      duration: 3,
    });
    const prev = [haste];
    const { remaining } = tickNonDotEffects(prev, "player");
    assert.equal(prev[0].duration, 3);
    assert.equal(remaining[0].duration, 2);
    assert.notEqual(remaining[0], haste);
  });
});
