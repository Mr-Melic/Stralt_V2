import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SELECT_SPELL_COPY,
  WAIT_FOR_TURN_COPY,
  playerFacingCastResult,
  playerFacingRejectReason,
} from "./rejectCopy.ts";

describe("playerFacingRejectReason", () => {
  it("maps engine tokens to short player copy", () => {
    assert.equal(
      playerFacingRejectReason("ground_los_blocked"),
      "No line of sight",
    );
    assert.equal(
      playerFacingRejectReason("ground_out_of_range"),
      "Out of range",
    );
    assert.equal(playerFacingRejectReason("ground_occupied"), "Occupied");
    assert.equal(playerFacingRejectReason("line_below_min_range"), "Too close");
    assert.equal(
      playerFacingRejectReason("diagonal_off_axis"),
      "Must be on a diagonal",
    );
    assert.equal(
      playerFacingRejectReason("ally_no_summon_at_tile"),
      "No ally there",
    );
    assert.equal(
      playerFacingRejectReason("caster_tile_hostile"),
      "Invalid target",
    );
    assert.equal(playerFacingRejectReason("barrier_tile"), "Blocked");
    assert.equal(playerFacingRejectReason("line_blocked_barrier"), "Blocked");
    assert.equal(playerFacingRejectReason("ground_barrier"), "Blocked");
    assert.equal(playerFacingRejectReason("out_of_range"), "Out of range");
    assert.equal(
      playerFacingRejectReason("line_los_blocked"),
      "No line of sight",
    );
  });

  it("passes through already-human phrases", () => {
    assert.equal(playerFacingRejectReason("Not enough AP"), "Not enough AP");
    assert.equal(playerFacingRejectReason("On cooldown"), "On cooldown");
  });

  it("falls back for empty or unknown snake_case tokens", () => {
    assert.equal(playerFacingRejectReason(""), "Invalid target");
    assert.equal(playerFacingRejectReason("future_gate_xyz"), "Invalid target");
  });
});

describe("attack-mode and off-turn canvas copy", () => {
  it("tells the player to pick a spell or wait", () => {
    assert.equal(SELECT_SPELL_COPY, "Select a spell");
    assert.equal(WAIT_FOR_TURN_COPY, "Wait for your turn");
  });
});

describe("playerFacingCastResult", () => {
  it("unifies sprite and tile no-AP / cooldown / abort copy", () => {
    assert.equal(playerFacingCastResult("no_ap"), "Not enough AP");
    assert.equal(playerFacingCastResult("on_cooldown"), "On cooldown");
    assert.equal(playerFacingCastResult("abort"), "Aborted");
    assert.equal(playerFacingCastResult("fizzled"), "Cast fizzled!");
  });
});
