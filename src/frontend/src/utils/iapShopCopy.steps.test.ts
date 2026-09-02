import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { IAP_SHOP_HOW_TO_HEADING, IAP_SHOP_STEPS } from "./iapShopCopy.ts";

const shopSource = readFileSync(
  fileURLToPath(new URL("../components/DokaGameKeyShop.tsx", import.meta.url)),
  "utf8",
);

function markerIndex(marker: string): number {
  const at = shopSource.indexOf(marker);
  assert.notEqual(at, -1, `missing ${marker}`);
  return at;
}

describe("iapShopCopy how-to steps", () => {
  it("lists buy steps in request → pay → wait → redeem order", () => {
    assert.equal(IAP_SHOP_HOW_TO_HEADING, "How to buy");
    assert.equal(IAP_SHOP_STEPS.length, 4);
    assert.match(IAP_SHOP_STEPS[0], /email/i);
    assert.match(IAP_SHOP_STEPS[1], /Mollie/i);
    assert.match(IAP_SHOP_STEPS[2], /Approved/i);
    assert.match(IAP_SHOP_STEPS[3], /120-character GameKey/i);
  });

  it("Buy Doka renders those steps and puts email before the Mollie QR", () => {
    assert.match(shopSource, /IAP_SHOP_HOW_TO_HEADING/);
    assert.match(shopSource, /IAP_SHOP_STEPS/);
    assert.match(shopSource, /data-ocid="shop\.how_to_steps"/);
    const howTo = markerIndex('data-ocid="shop.how_to_steps"');
    const email = markerIndex('data-ocid="shop.form.email_input"');
    const pay = markerIndex('data-ocid="shop.mollie_link"');
    const redeem = markerIndex('data-ocid="shop.form.gamekey_input"');
    assert.equal(howTo < email, true);
    assert.equal(email < pay, true);
    assert.equal(pay < redeem, true);
  });
});
