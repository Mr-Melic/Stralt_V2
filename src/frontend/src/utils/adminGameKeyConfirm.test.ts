import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  gameKeyApproveConfirmBody,
  gameKeyEmailedConfirmBody,
  gameKeyRejectConfirmBody,
} from "./dokaGameKey.ts";

describe("admin GameKey confirm copy", () => {
  it("does not claim wallet mint on approve", () => {
    const body = gameKeyApproveConfirmBody(1000, "ada@example.com");
    assert.match(body, /1000 Doka/);
    assert.match(body, /ada@example.com/);
    assert.match(body, /not credited until they redeem/i);
    assert.equal(/credits the wallet/i.test(body), false);
    assert.match(gameKeyRejectConfirmBody(), /rejected/i);
    assert.match(gameKeyRejectConfirmBody(), /No GameKey/i);
    assert.match(gameKeyEmailedConfirmBody(), /wipes the plaintext GameKey/i);
  });
});
