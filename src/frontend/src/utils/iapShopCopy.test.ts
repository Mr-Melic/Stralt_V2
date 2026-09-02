import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DOKA_PER_EURO,
  GAME_KEY_ALPHABET,
  GAME_KEY_LENGTH,
  euroTextToCents,
  gameKeyMailtoHref,
  hintedEurosLabel,
  mapGameKeyRequestFromBackend,
  parseMyGameKeyPurchaseStatus,
  playerGameKeyStatusCopy,
  readGameKeyCmdResult,
  readGameKeyRequestList,
  suggestedDokaFromEuroCents,
  suggestedDokaFromEuros,
  unwrapOptRecord,
  validateGameKeyConsent,
  validateGameKeyEmail,
  validateGameKeyFormat,
} from "./dokaGameKey.ts";
import {
  IAP_SHOP_CLOSE_LABEL,
  IAP_SHOP_CONSENT_LABEL,
  IAP_SHOP_KYC_PREAMBLE,
  IAP_SHOP_PACKAGES_DETAIL,
  IAP_SHOP_PACKAGES_LEAD,
  IAP_SHOP_TITLE,
} from "./iapShopCopy.ts";

describe("iapShopCopy", () => {
  it("titles the IAP modal Buy Doka, not Doka Shop", () => {
    assert.equal(IAP_SHOP_TITLE, "Buy Doka");
    assert.equal(IAP_SHOP_TITLE.includes("Doka Shop"), false);
    assert.equal(IAP_SHOP_CLOSE_LABEL.includes("Buy Doka"), true);
  });

  it("says the shop is real-money credit, not Items", () => {
    assert.match(IAP_SHOP_PACKAGES_LEAD, /real-money/i);
    assert.match(IAP_SHOP_PACKAGES_LEAD, /EUR/i);
    assert.match(IAP_SHOP_PACKAGES_LEAD, /Items/i);
    assert.match(IAP_SHOP_PACKAGES_DETAIL, /GameKey/i);
    assert.match(IAP_SHOP_PACKAGES_DETAIL, /1000 Doka = 10/);
  });

  it("asks for email consent, not proof of address", () => {
    assert.match(IAP_SHOP_KYC_PREAMBLE, /email/i);
    assert.match(IAP_SHOP_KYC_PREAMBLE, /consent/i);
    assert.match(IAP_SHOP_KYC_PREAMBLE, /no proof of address/i);
    assert.equal(/proof-of-address/i.test(IAP_SHOP_KYC_PREAMBLE), false);
    assert.match(IAP_SHOP_CONSENT_LABEL, /email/i);
  });
});

describe("dokaGameKey", () => {
  it("suggests 100 Doka per euro (1000 Doka / 10€)", () => {
    assert.equal(DOKA_PER_EURO, 100);
    assert.equal(suggestedDokaFromEuros(10), 1000);
    assert.equal(suggestedDokaFromEuroCents(1000), 1000);
    assert.equal(suggestedDokaFromEuroCents(100), 100);
    assert.equal(suggestedDokaFromEuroCents(0), 0);
    assert.deepEqual(euroTextToCents("10"), { ok: 1000 });
    assert.deepEqual(euroTextToCents("10.50"), { ok: 1050 });
    assert.deepEqual(euroTextToCents(""), { ok: 0 });
    assert.equal("err" in euroTextToCents("ten"), true);
  });

  it("requires a 120-char alphabet of letters, numbers, and symbols", () => {
    assert.equal(GAME_KEY_LENGTH, 120);
    assert.equal(/[A-Za-z]/.test(GAME_KEY_ALPHABET), true);
    assert.equal(/[0-9]/.test(GAME_KEY_ALPHABET), true);
    assert.equal(/[!@#$%^&*_\+\-=]/.test(GAME_KEY_ALPHABET), true);
    const valid = GAME_KEY_ALPHABET[0].repeat(GAME_KEY_LENGTH);
    assert.equal(validateGameKeyFormat(valid), null);
    assert.equal(validateGameKeyFormat("short"), "GameKey is too short");
    assert.equal(validateGameKeyFormat(`${valid}x`), "GameKey is too long");
    assert.equal(
      validateGameKeyFormat(`${"A".repeat(119)} `),
      "GameKey contains invalid characters",
    );
  });

  it("validates email and consent", () => {
    assert.equal(validateGameKeyEmail("ada@example.com"), null);
    assert.equal(validateGameKeyEmail("nope") != null, true);
    assert.equal(validateGameKeyConsent(true), null);
    assert.match(validateGameKeyConsent(false) ?? "", /consent/i);
  });

  it("maps player-facing request status copy", () => {
    assert.equal(playerGameKeyStatusCopy("pending"), "Waiting for approval");
    assert.match(playerGameKeyStatusCopy("approved"), /check email/i);
    assert.equal(playerGameKeyStatusCopy("redeemed"), "Redeemed");
    assert.match(playerGameKeyStatusCopy("rejected"), /cancelled/i);
  });
});

describe("parseMyGameKeyPurchaseStatus", () => {
  const row = {
    id: "gk_7",
    userPrincipal: { toText: () => "aaaaa-aa" },
    email: "ada@example.com",
    emailConsent: true,
    hintedEuroCents: 1000n,
    timestamp: 1_700_000_000_000_000_000n,
    status: "pending",
    dokaAmount: 0n,
    emailed: false,
    approvedAt: 0n,
    redeemedAt: 0n,
    redeemedBy: "",
    code: "MUST-NOT-LEAK",
  };

  it("treats Candid opt none as no request so Buy Doka can submit", () => {
    // Mapping [] as a record used to default status to "pending" with id "".
    const phantom = mapGameKeyRequestFromBackend([]);
    assert.equal(phantom.id, "");
    assert.equal(phantom.status, "pending");
    assert.equal(unwrapOptRecord([]), null);
    assert.equal(unwrapOptRecord(null), null);
    assert.equal(parseMyGameKeyPurchaseStatus([]), null);
    assert.equal(parseMyGameKeyPurchaseStatus(null), null);
    assert.equal(parseMyGameKeyPurchaseStatus(undefined), null);
  });

  it("unwraps Candid opt [row] and reads bigint Doka / Principal.toText", () => {
    const parsed = parseMyGameKeyPurchaseStatus([row]);
    assert.ok(parsed);
    assert.equal(parsed.id, "gk_7");
    assert.equal(parsed.userPrincipal, "aaaaa-aa");
    assert.equal(parsed.hintedEuroCents, 1000);
    assert.equal(parsed.dokaAmount, 0);
    assert.equal(parsed.status, "pending");
    assert.equal(parsed.timestamp.length > 0, true);
    assert.equal(parsed.approvedAt, "");
    assert.equal(
      "code" in parsed,
      false,
      "player status must never carry the GameKey",
    );
    assert.deepEqual(parseMyGameKeyPurchaseStatus(row), parsed);
  });

  it("does not treat an empty mapped id as an open pending request", () => {
    assert.equal(parseMyGameKeyPurchaseStatus({ status: "pending" }), null);
  });
});

describe("readGameKeyCmdResult / admin list", () => {
  it("returns the generated GameKey string, not a boolean ok", () => {
    const key = `${GAME_KEY_ALPHABET[0].repeat(GAME_KEY_LENGTH)}`;
    assert.deepEqual(
      readGameKeyCmdResult({ __kind__: "ok", ok: key }, "adminApprove"),
      { ok: key },
    );
    assert.deepEqual(readGameKeyCmdResult({ _ok: key }, "adminApprove"), {
      ok: key,
    });
    assert.deepEqual(
      readGameKeyCmdResult(
        { __kind__: "err", err: "Unauthorized: admin only" },
        "adminApprove",
      ),
      { err: "Unauthorized: admin only" },
    );
    assert.equal(
      "err" in readGameKeyCmdResult({ __kind__: "ok" }, "adminApprove"),
      true,
    );
  });

  it("maps adminListGameKeyRequests ok/_ok arrays and rejects unauthorized", () => {
    const listed = readGameKeyRequestList({
      __kind__: "ok",
      ok: [{ id: "gk_1", email: "ada@example.com", status: "pending" }],
    });
    assert.equal(listed.length, 1);
    assert.equal(listed[0].id, "gk_1");
    assert.equal(listed[0].email, "ada@example.com");
    const underscored = readGameKeyRequestList({
      _ok: [{ id: "gk_2", status: "approved", dokaAmount: 1000n }],
    });
    assert.equal(underscored[0].id, "gk_2");
    assert.equal(underscored[0].dokaAmount, 1000);
    assert.throws(
      () =>
        readGameKeyRequestList({
          __kind__: "err",
          err: "Unauthorized: admin only",
        }),
      /Unauthorized: admin only/,
    );
  });
});

describe("gameKeyMailtoHref", () => {
  it("encodes alphabet symbols so & in the key is not a second query param", () => {
    const code = `A${"&".repeat(1)}${"B".repeat(118)}`;
    assert.equal(code.length, GAME_KEY_LENGTH);
    const href = gameKeyMailtoHref("ada@example.com", code);
    assert.match(href, /^mailto:ada@example.com\?/);
    const body = new URL(href).searchParams.get("body") ?? "";
    assert.equal(body.includes(code), true);
    assert.equal(href.includes(`body=${code}`), false);
    assert.equal(hintedEurosLabel(1050), "€10.50");
    assert.equal(hintedEurosLabel(0), "—");
  });
});
