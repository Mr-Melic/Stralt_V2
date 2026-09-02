import { purchaseTimestampMs } from "./adminContract.ts";

export const MOLLIE_PAYMENT_LINK =
  "https://payment-links.mollie.com/payment/4pwC2KpwP2yxKoXYtWiFK";

export const DOKA_PER_EURO = 100;
export const GAME_KEY_LENGTH = 120;
export const GAME_KEY_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*_+-=";
export const GAME_KEY_MAX_HINT_EURO_CENTS = 10_000_000;
export const GAME_KEY_MAX_EMAIL = 200;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function suggestedDokaFromEuroCents(euroCents: number): number {
  const n = Math.max(0, Math.floor(Number(euroCents) || 0));
  return n;
}

export function suggestedDokaFromEuros(euros: number): number {
  if (!Number.isFinite(euros) || euros <= 0) return 0;
  return suggestedDokaFromEuroCents(Math.round(euros * 100));
}

/** Parse an optional euro hint ("10", "10.5") into euro-cents. Empty → 0. */
export function euroTextToCents(raw: string): { ok: number } | { err: string } {
  const t = raw.trim();
  if (t.length === 0) return { ok: 0 };
  if (!/^\d+(\.\d{1,2})?$/.test(t)) {
    return { err: "Enter euros as a number, for example 10 or 10.50" };
  }
  const euros = Number(t);
  if (!Number.isFinite(euros) || euros < 0) {
    return { err: "Enter a valid euro amount" };
  }
  const cents = Math.round(euros * 100);
  if (cents > GAME_KEY_MAX_HINT_EURO_CENTS) {
    return { err: "Intended amount exceeds the maximum hint" };
  }
  return { ok: cents };
}

const EMAIL_MAILTO_META = /[?#&:/\\<>"',;%]/;

export function validateGameKeyEmail(email: string): string | null {
  const t = email.trim();
  if (t.length < 6 || t.length > GAME_KEY_MAX_EMAIL) {
    return "Email must be between 6 and 200 characters";
  }
  if (!EMAIL_RE.test(t)) return "Enter a valid email address";
  if (EMAIL_MAILTO_META.test(t)) {
    return "Email contains characters that cannot be used in mailto";
  }
  return null;
}

/**
 * Admin Approve must use the Mollie-confirmed amount the operator typed.
 * Falling back to `hintedEuroCents` let a raw client pre-fill 10M Doka.
 */
export function resolveAdminApproveDokaAmount(
  draft: string | undefined,
): { ok: number } | { err: string } {
  if (draft == null || draft.trim() === "") {
    return {
      err: "Enter the Doka amount confirmed on Mollie; the player's hint is not a grant",
    };
  }
  const n = Math.floor(Number(draft.trim()));
  if (!Number.isFinite(n) || n <= 0) {
    return { err: "Grant amount must be greater than 0" };
  }
  if (n > 10_000_000) {
    return { err: "Grant amount exceeds maximum of 10000000" };
  }
  return { ok: n };
}

export function validateGameKeyConsent(consent: boolean): string | null {
  return consent
    ? null
    : "Consent is required to use this email for the GameKey";
}

export function validateGameKeyFormat(code: string): string | null {
  if (code.length < GAME_KEY_LENGTH) return "GameKey is too short";
  if (code.length > GAME_KEY_LENGTH) return "GameKey is too long";
  for (const ch of code) {
    if (!GAME_KEY_ALPHABET.includes(ch)) {
      return "GameKey contains invalid characters";
    }
  }
  return null;
}

export function playerGameKeyStatusCopy(status: string): string {
  switch (status) {
    case "pending":
      return "Waiting for approval";
    case "approved":
      return "Approved — check email for your GameKey";
    case "redeemed":
      return "Redeemed";
    case "rejected":
      return "Request cancelled — you may submit again";
    default:
      return status;
  }
}

/** Owner-tool confirm: approve records Doka on the request; wallet credits on redeem. */
export function gameKeyApproveConfirmBody(
  amount: number,
  email: string,
): string {
  const who = email.trim() || "this request";
  return `This records ${amount} Doka for ${who} and mints a 120-character GameKey. The player wallet is not credited until they redeem. There is no undo.`;
}

export function gameKeyRejectConfirmBody(): string {
  return "This marks the request rejected. The player may submit again. No GameKey is minted. There is no undo.";
}

export function gameKeyEmailedConfirmBody(): string {
  return "This wipes the plaintext GameKey from admin view. Copy it first. The player still redeems the same code.";
}

export function hintedEurosLabel(euroCents: number): string {
  const n = Math.max(0, Math.floor(Number(euroCents) || 0));
  if (n <= 0) return "—";
  return `€${(n / 100).toFixed(2)}`;
}

export function gameKeyMailtoHref(email: string, code: string): string {
  if (validateGameKeyEmail(email) != null) return "#";
  const subject = encodeURIComponent("Your Doka GameKey");
  const body = encodeURIComponent(
    `Your 120-character GameKey is:\n\n${code}\n\nRedeem it in Buy Doka while logged in. The code is single-use.`,
  );
  return `mailto:${encodeURIComponent(email)}?subject=${subject}&body=${body}`;
}

export type GameKeyRequestView = {
  id: string;
  userPrincipal: string;
  email: string;
  emailConsent: boolean;
  hintedEuroCents: number;
  timestamp: string;
  status: string;
  dokaAmount: number;
  emailed: boolean;
  approvedAt: string;
  redeemedAt: string;
  redeemedBy: string;
};

function textOf(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && "toText" in value) {
    try {
      return String((value as { toText: () => string }).toText());
    } catch {
      return "";
    }
  }
  return String(value);
}

function natOf(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function mapGameKeyRequestFromBackend(raw: unknown): GameKeyRequestView {
  const r = (raw ?? {}) as Record<string, unknown>;
  const ts = purchaseTimestampMs(r.timestamp);
  const approved = purchaseTimestampMs(r.approvedAt);
  const redeemed = purchaseTimestampMs(r.redeemedAt);
  return {
    id: textOf(r.id),
    userPrincipal: textOf(r.userPrincipal ?? r.userId),
    email: textOf(r.email),
    emailConsent: r.emailConsent === true,
    hintedEuroCents: natOf(r.hintedEuroCents),
    timestamp: ts > 0 ? new Date(ts).toISOString() : "",
    status: textOf(r.status) || "pending",
    dokaAmount: natOf(r.dokaAmount),
    emailed: r.emailed === true,
    approvedAt: approved > 0 ? new Date(approved).toISOString() : "",
    redeemedAt: redeemed > 0 ? new Date(redeemed).toISOString() : "",
    redeemedBy: textOf(r.redeemedBy),
  };
}

export function unwrapOptRecord(value: unknown): unknown | null {
  if (value == null) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

/**
 * `getMyGameKeyPurchaseStatus` is Candid `opt record`. Bindgen may return
 * `[]` (none), `[row]`, or the row. Mapping `[]` as a record used to yield
 * `status: "pending"` with an empty id, so Buy Doka blocked a new request
 * and never showed the real queue.
 */
export function parseMyGameKeyPurchaseStatus(
  raw: unknown,
): GameKeyRequestView | null {
  const inner = unwrapOptRecord(raw);
  if (inner == null || typeof inner !== "object" || Array.isArray(inner)) {
    return null;
  }
  const mapped = mapGameKeyRequestFromBackend(inner);
  return mapped.id.length > 0 ? mapped : null;
}

export function readGameKeyCmdResult(
  result: unknown,
  method: string,
): { ok: string } | { err: string } {
  if (result == null || typeof result !== "object") {
    return { err: `${method} returned an empty result` };
  }
  const r = result as Record<string, unknown>;
  if (
    r.__kind__ === "err" ||
    (r.err != null && r.ok == null && r._ok == null)
  ) {
    return { err: String(r.err ?? r._err ?? `${method} failed`) };
  }
  const ok = r.ok ?? r._ok;
  if (typeof ok !== "string" || ok.length === 0) {
    return { err: `${method} missing payload` };
  }
  return { ok };
}

export function readGameKeyRequestList(result: unknown): GameKeyRequestView[] {
  if (Array.isArray(result)) {
    return result.map(mapGameKeyRequestFromBackend);
  }
  if (result == null || typeof result !== "object") {
    throw new Error("adminListGameKeyRequests returned an empty result");
  }
  const r = result as Record<string, unknown>;
  if (
    r.__kind__ === "err" ||
    (r.err != null && r.ok == null && r._ok == null)
  ) {
    throw new Error(String(r.err ?? r._err ?? "Unauthorized: admin only"));
  }
  const ok = r.ok ?? r._ok;
  if (!Array.isArray(ok)) {
    throw new Error("adminListGameKeyRequests missing ok payload");
  }
  return ok.map(mapGameKeyRequestFromBackend);
}
