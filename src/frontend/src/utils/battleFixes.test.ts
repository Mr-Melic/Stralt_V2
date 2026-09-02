import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateChallenges } from "./battleFixes.ts";

function refs(
  overrides: {
    healUsed?: boolean;
    totalDamage?: number;
    turnCount?: number;
    maxAp?: number;
    directHit?: boolean;
  } = {},
) {
  return {
    challengeHealUsedRef: { current: overrides.healUsed ?? false },
    challengeTotalDamageRef: { current: overrides.totalDamage ?? 0 },
    challengeTurnCountRef: { current: overrides.turnCount ?? 1 },
    challengeMaxApThisTurnRef: { current: overrides.maxAp ?? 4 },
    challengeDirectHitRef: { current: overrides.directHit ?? true },
  };
}

function status(results: { id: string; status: string }[], id: string): string {
  const row = results.find((r) => r.id === id);
  assert.ok(row, `missing ${id}`);
  return row.status;
}

describe("evaluateChallenges", () => {
  it("marks logger chips failed at the advertised mid-fight boundaries", () => {
    const clean = evaluateChallenges(refs(), 80, 100);
    assert.equal(status(clean, "no_healing"), "on_track");
    assert.equal(status(clean, "under_15_turns"), "on_track");
    assert.equal(status(clean, "direct_hit"), "on_track");
    assert.equal(status(clean, "survive_with_50_hp"), "on_track");
    assert.equal(status(clean, "deal_500_damage"), "on_track");

    const broken = evaluateChallenges(
      refs({
        healUsed: true,
        turnCount: 16,
        directHit: false,
        totalDamage: 499,
      }),
      49,
      100,
    );
    assert.equal(status(broken, "no_healing"), "failed");
    assert.equal(status(broken, "under_15_turns"), "failed");
    assert.equal(status(broken, "direct_hit"), "failed");
    assert.equal(status(broken, "survive_with_50_hp"), "failed");
    assert.equal(status(broken, "deal_500_damage"), "on_track");
  });

  it("treats 15 turns and exactly 50% HP as still on track, and 500 damage as completed", () => {
    const edge = evaluateChallenges(
      refs({ turnCount: 15, totalDamage: 500 }),
      50,
      100,
    );
    assert.equal(status(edge, "under_15_turns"), "on_track");
    assert.equal(status(edge, "survive_with_50_hp"), "on_track");
    assert.equal(status(edge, "deal_500_damage"), "completed");
  });
});
