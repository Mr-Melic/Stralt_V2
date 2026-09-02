import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { playerFacingRejectReason } from "./rejectCopy.ts";

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
