import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toBackendEnemySpriteUrl } from "./adminContract.ts";
import {
  DEFAULT_PIXEL_VISUAL_CHIP,
  DEFAULT_PIXEL_VISUAL_STATUS,
  STORED_URL_NOT_RENDERED_CHIP,
  STORED_URL_NOT_RENDERED_STATUS,
  enemyVisualStatusCopy,
  spriteUrlIsStored,
} from "./adminVisualStatus.ts";

describe("spriteUrlIsStored", () => {
  it("treats empty tuple / blank / missing as not stored", () => {
    assert.equal(spriteUrlIsStored([]), false);
    assert.equal(spriteUrlIsStored(""), false);
    assert.equal(spriteUrlIsStored("   "), false);
    assert.equal(spriteUrlIsStored(undefined), false);
    assert.equal(spriteUrlIsStored(null), false);
    assert.equal(spriteUrlIsStored([""]), false);
  });

  it("treats a non-empty URL as stored catalog data", () => {
    assert.equal(spriteUrlIsStored(["https://x/e.png"]), true);
    assert.equal(spriteUrlIsStored("https://x/e.png"), true);
  });
});

describe("enemyVisualStatusCopy", () => {
  it("keeps empty = Default Pixel Visual (VAL-010)", () => {
    const copy = enemyVisualStatusCopy(false);
    assert.equal(copy.status, DEFAULT_PIXEL_VISUAL_STATUS);
    assert.equal(copy.chip, DEFAULT_PIXEL_VISUAL_CHIP);
    assert.equal(copy.storedNotRendered, false);
  });

  it("does not claim a filled URL is a live custom visual", () => {
    const copy = enemyVisualStatusCopy(true);
    assert.equal(copy.status, STORED_URL_NOT_RENDERED_STATUS);
    assert.equal(copy.chip, STORED_URL_NOT_RENDERED_CHIP);
    assert.equal(copy.storedNotRendered, true);
    assert.equal(/custom visual/i.test(copy.status), false);
    assert.equal(/override/i.test(copy.status), false);
    assert.equal(/custom visual/i.test(copy.chip), false);
  });

  it("does not treat an empty spriteUrl tuple as a custom asset", () => {
    assert.equal(toBackendEnemySpriteUrl([]), undefined);
    assert.equal(spriteUrlIsStored([]), false);
    assert.equal(
      enemyVisualStatusCopy(spriteUrlIsStored([])).storedNotRendered,
      false,
    );
  });
});
