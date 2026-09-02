import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertAdminCmdOk,
  fromBackendPlayerSpriteConfig,
  fromBackendSpellConfig,
  mapPurchaseRecordFromBackend,
  purchaseTimestampMs,
  readAdminCmdResult,
  readPrincipalListResult,
  readPurchasesResult,
  toBackendEnemySpriteUrl,
  toBackendLevelUpConfig,
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

  it("unwraps getBannedPrincipals #ok into principal texts", () => {
    const list = readPrincipalListResult(
      {
        __kind__: "ok",
        ok: [{ toText: () => "aaaaa-aa" }, "bbbbb-bb"],
      },
      "getBannedPrincipals",
    );
    assert.deepEqual(list, ["aaaaa-aa", "bbbbb-bb"]);
    assert.throws(
      () =>
        readPrincipalListResult(
          { __kind__: "err", err: "Unauthorized: admin only" },
          "getBannedPrincipals",
        ),
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
    assert.equal(wire.isSummon, false);
    assert.equal(wire.summonAI, "");
    assert.equal(wire.summonLifespan, 0n);
    assert.deepEqual(wire.summonUnitDef, {
      pieceType: "",
      level: 0n,
      hpScale: 0,
      damageScale: 0,
    });
    const ui = fromBackendSpellConfig({
      id: "bolt",
      multiTarget: true,
      cooldown: 3n,
    });
    assert.equal(ui.hitsMultiple, true);
    assert.equal(ui.cooldown, 3);
    assert.equal(ui.isSummon, false);
    assert.equal(ui.summonLifespan, 0);
  });

  it("keeps explicit summon metadata and drops extra unit-def keys", () => {
    const wire = toBackendSpellConfig({
      id: "summon-wolf",
      isSummon: true,
      summonAI: "hunter",
      summonLifespan: 4,
      summonUnitDef: {
        pieceType: "pawn",
        level: 2,
        hpScale: 1.2,
        damageScale: 0.8,
        summonKit: ["bite"],
        ap: 3,
      },
    });
    assert.equal(wire.isSummon, true);
    assert.equal(wire.summonAI, "hunter");
    assert.equal(wire.summonLifespan, 4n);
    assert.deepEqual(wire.summonUnitDef, {
      pieceType: "pawn",
      level: 2n,
      hpScale: 1.2,
      damageScale: 0.8,
    });
    const ui = fromBackendSpellConfig({
      id: "summon-wolf",
      isSummon: true,
      summonAI: "hunter",
      summonLifespan: 4n,
      summonUnitDef: {
        pieceType: "pawn",
        level: 2n,
        hpScale: 1.2,
        damageScale: 0.8,
      },
    });
    assert.equal(ui.summonLifespan, 4);
    assert.equal(ui.summonUnitDef?.level, 2);
  });

  it("does not treat an empty spriteUrl tuple as a custom asset", () => {
    assert.equal(toBackendEnemySpriteUrl([]), undefined);
    assert.equal(
      toBackendEnemySpriteUrl(["https://x/e.png"]),
      "https://x/e.png",
    );
  });
});

describe("toBackendLevelUpConfig", () => {
  it("writes all nine canister fields and maps the frontend AP/MP alias", () => {
    const wire = toBackendLevelUpConfig({
      statGrowthPercent: 7,
      apMpGrowthEveryNLevels: 30,
      spellLevelingBaseCost: 15,
      spellLevelingCostMultiplier: 2.5,
      spellDmgGrowthPercent: 4,
      maxSpellRange: 6,
      spellRangeGrowthLevels: 12,
      spellFailBaseChance: 18,
      spellFailReductionPerLevel: 0.05,
    });
    assert.equal(wire.statGrowthPercent, 7n);
    assert.equal(wire.apMpLevelThreshold, 30n);
    assert.equal(wire.spellLevelingBaseCost, 15n);
    assert.equal(wire.spellLevelingCostMultiplier, 2.5);
    assert.equal(wire.spellDmgGrowthPercent, 4n);
    assert.equal(wire.maxSpellRange, 6n);
    assert.equal(wire.spellRangeGrowthLevels, 12n);
    assert.equal(wire.spellFailBaseChance, 18);
    assert.equal(wire.spellFailReductionPerLevel, 0.05);
  });

  it("does not clobber omitted growth/cost fields with a 4-field draft", () => {
    const wire = toBackendLevelUpConfig({
      maxSpellRange: 8,
      spellRangeGrowthLevels: 9,
      spellFailBaseChance: 10,
      spellFailReductionPerLevel: 0.2,
    });
    assert.equal(wire.maxSpellRange, 8n);
    assert.equal(wire.statGrowthPercent, 5n);
    assert.equal(wire.apMpLevelThreshold, 25n);
    assert.equal(wire.spellLevelingBaseCost, 10n);
    assert.equal(wire.spellLevelingCostMultiplier, 2);
    assert.equal(wire.spellDmgGrowthPercent, 3n);
  });
});
