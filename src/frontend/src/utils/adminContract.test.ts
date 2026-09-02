import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertAdminCmdOk,
  fromBackendPlayerSpriteConfig,
  fromBackendSpellConfig,
  mapPurchaseRecordFromBackend,
  purchaseTimestampMs,
  readAdminCmdResult,
  readPurchasesResult,
  toBackendEnemySpriteUrl,
  toBackendPlayerSpriteConfig,
  toBackendSpellConfig,
} from "./adminContract.ts";

describe("readAdminCmdResult", () => {
  it("accepts ok / _ok / __kind__ payloads", () => {
    assert.deepEqual(readAdminCmdResult({ __kind__: "ok", ok: null }, "m"), {
      ok: true,
    });
    assert.deepEqual(readAdminCmdResult({ ok: null }, "m"), { ok: true });
    assert.deepEqual(readAdminCmdResult({ _ok: null }, "m"), { ok: true });
  });

  it("rejects canister errors so Save cannot toast success", () => {
    assert.deepEqual(
      readAdminCmdResult(
        { __kind__: "err", err: "Unauthorized: admin only" },
        "m",
      ),
      { err: "Unauthorized: admin only" },
    );
    assert.throws(
      () =>
        assertAdminCmdOk({ __kind__: "err", err: "nope" }, "assignUserRole"),
      /nope/,
    );
  });
});

describe("purchase mapping", () => {
  it("maps flat canister fields onto the purchases tab customerData", () => {
    const rec = mapPurchaseRecordFromBackend({
      id: "p1",
      packageId: "pkg_10",
      dokaAmount: 500n,
      customerName: "Ada",
      customerSurname: "Lovelace",
      customerEmail: "ada@example.com",
      customerAddress: "1 Engine St",
      customerCity: "London",
      customerPostal: "SW1A",
      customerCountry: "UK",
      proofFileUrl: "https://assets.example/proof.jpg",
      timestamp: 1_700_000_000_000_000_000n,
      status: "completed",
      userPrincipal: { toText: () => "aaaaa-aa" },
    });
    assert.equal(rec.id, "p1");
    assert.equal(rec.dokaAmount, 500);
    assert.equal(rec.status, "paid");
    assert.equal(rec.customerData.firstName, "Ada");
    assert.equal(rec.customerData.lastName, "Lovelace");
    assert.equal(rec.customerData.email, "ada@example.com");
    assert.equal(rec.customerData.postalCode, "SW1A");
    assert.equal(rec.proofFileUrl, "https://assets.example/proof.jpg");
    assert.equal(rec.userId, "aaaaa-aa");
    assert.ok(rec.timestamp.length > 0);
  });

  it("unwraps getPurchases #ok and throws on #err", () => {
    const rows = readPurchasesResult({
      __kind__: "ok",
      ok: [{ id: "a", customerName: "Ada", status: "pending", dokaAmount: 10 }],
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].customerData.firstName, "Ada");
    assert.throws(
      () =>
        readPurchasesResult({
          __kind__: "err",
          err: "Unauthorized: admin only",
        }),
      /Unauthorized/,
    );
  });

  it("converts Motoko ns timestamps to ms", () => {
    assert.equal(
      purchaseTimestampMs(1_700_000_000_000_000_000n),
      1_700_000_000_000,
    );
    assert.equal(purchaseTimestampMs(1_700_000_000_000), 1_700_000_000_000);
  });
});

describe("sprite / spell / enemy field bridges", () => {
  it("maps walkFrames* onto the bindgen frontWalkFrames names", () => {
    const wire = toBackendPlayerSpriteConfig({
      id: "s1",
      name: "Pawn",
      walkFramesFront: ["a.png"],
      walkFramesRight: ["b.png"],
      walkFramesLeft: ["c.png"],
      walkFramesBack: ["d.png"],
      frontUrl: ["front.png"] as [string],
    });
    assert.deepEqual(wire.frontWalkFrames, ["a.png"]);
    assert.equal(wire.frontUrl, "front.png");
    const ui = fromBackendPlayerSpriteConfig({
      id: "s1",
      name: "Pawn",
      frontWalkFrames: ["a.png"],
      rightWalkFrames: ["b.png"],
      leftWalkFrames: ["c.png"],
      backWalkFrames: ["d.png"],
      frontUrl: "front.png",
    });
    assert.deepEqual(ui.walkFramesFront, ["a.png"]);
    assert.deepEqual(ui.frontUrl, ["front.png"]);
  });

  it("maps hitsMultiple onto multiTarget and defaults cooldown", () => {
    const wire = toBackendSpellConfig({
      id: "bolt",
      hitsMultiple: true,
    });
    assert.equal(wire.multiTarget, true);
    assert.equal(wire.cooldown, 0n);
    const ui = fromBackendSpellConfig({
      id: "bolt",
      multiTarget: true,
      cooldown: 3n,
    });
    assert.equal(ui.hitsMultiple, true);
    assert.equal(ui.cooldown, 3);
  });

  it("does not treat an empty spriteUrl tuple as a custom asset", () => {
    assert.equal(toBackendEnemySpriteUrl([]), undefined);
    assert.equal(
      toBackendEnemySpriteUrl(["https://x/e.png"]),
      "https://x/e.png",
    );
  });
});
