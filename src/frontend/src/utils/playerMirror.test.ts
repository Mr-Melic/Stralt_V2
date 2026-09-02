import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PLAYER_MIRROR_KEY,
  activatePlayerMirror,
  consumePlayerMirror,
} from "./playerMirror.ts";

describe("player Mirror token", () => {
  it("activate and consume share the player token, not a tile key", () => {
    const units = new Set<string>();
    activatePlayerMirror(units);
    assert.equal(units.has(PLAYER_MIRROR_KEY), true);
    assert.equal(units.has("3,4"), false);
    assert.equal(consumePlayerMirror(units), true);
    assert.equal(units.has(PLAYER_MIRROR_KEY), false);
    assert.equal(consumePlayerMirror(units), false);
  });

  it("does not consume a leftover tile key from the old activateMirror write", () => {
    const units = new Set<string>(["5,6"]);
    assert.equal(consumePlayerMirror(units), false);
    assert.equal(units.has("5,6"), true);
  });
});
