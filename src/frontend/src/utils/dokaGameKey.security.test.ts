import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  gameKeyMailtoHref,
  resolveAdminApproveDokaAmount,
  suggestedDokaFromEuroCents,
  validateGameKeyEmail,
} from "./dokaGameKey.ts";

describe("GameKey admin approve amount", () => {
  it("does not treat the player's euro hint as the grant", () => {
    // Failure: AdminGameKeyPurchases pre-filled Approve from hintedEuroCents
    // (up to 10_000_000 Doka) so a rubber-stamp minted a player-chosen wallet.
    const hinted = suggestedDokaFromEuroCents(10_000_000);
    assert.equal(hinted, 10_000_000);
    const empty = resolveAdminApproveDokaAmount(undefined);
    assert.equal("err" in empty, true);
    if ("err" in empty) {
      assert.match(empty.err, /hint is not a grant/i);
    }
    const blank = resolveAdminApproveDokaAmount("");
    assert.equal("err" in blank, true);
    const typed = resolveAdminApproveDokaAmount("1000");
    assert.deepEqual(typed, { ok: 1000 });
  });

  it("rejects zero and oversize typed grants", () => {
    const zero = resolveAdminApproveDokaAmount("0");
    assert.equal("err" in zero, true);
    const huge = resolveAdminApproveDokaAmount("10000001");
    assert.equal("err" in huge, true);
  });
});

describe("GameKey email mailto metacharacters", () => {
  it("accepts a normal address", () => {
    assert.equal(validateGameKeyEmail("ada@example.com"), null);
  });

  it("rejects mailto query separators a raw client could store", () => {
    // Single-@ addresses still break `mailto:${email}?subject=` into extra
    // headers. Two-@ BCC forms are already rejected by the @ count.
    assert.equal(
      validateGameKeyEmail("ada@example.com?subject=x") != null,
      true,
    );
    assert.equal(validateGameKeyEmail("ada@example.com&bcc=x") != null, true);
    assert.equal(validateGameKeyEmail("ada@example.com#frag") != null, true);
  });
});

describe("GameKey admin mailto", () => {
  it("encodes the address and refuses stored mailto metacharacters", () => {
    const href = gameKeyMailtoHref("ada@example.com", "A".repeat(120));
    assert.equal(href.startsWith("mailto:ada%40example.com?"), true);
    assert.equal(
      gameKeyMailtoHref("ada@example.com?subject=x", "A".repeat(120)),
      "#",
    );
  });
});
