import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import molliePaymentQr from "../assets/mollie-payment-qr.png";
import { safeExternalHref } from "../utils/adminSafety";
import {
  type GameKeyRequestView,
  MOLLIE_PAYMENT_LINK,
  euroTextToCents,
  hintedEurosLabel,
  parseMyGameKeyPurchaseStatus,
  playerGameKeyStatusCopy,
  readGameKeyCmdResult,
  suggestedDokaFromEuroCents,
  validateGameKeyConsent,
  validateGameKeyEmail,
  validateGameKeyFormat,
} from "../utils/dokaGameKey";
import {
  IAP_SHOP_CLOSE_LABEL,
  IAP_SHOP_CONSENT_LABEL,
  IAP_SHOP_HOW_TO_HEADING,
  IAP_SHOP_KYC_PREAMBLE,
  IAP_SHOP_PACKAGES_DETAIL,
  IAP_SHOP_PACKAGES_LEAD,
  IAP_SHOP_STEPS,
  IAP_SHOP_TITLE,
  IAP_SHOP_WAIT_COPY,
} from "../utils/iapShopCopy";
import {
  shouldDismissShopDialogOnBackdrop,
  shouldDismissShopDialogOnKey,
} from "../utils/shopDialogDismiss";
import {
  type ShopCreditPersistLock,
  dokaGainedFromGameKeyRedeem,
  redeemGameKeyThroughPersist,
  shouldStartShopPurchase,
} from "../utils/shopPurchase";

type ActorAny = {
  requestGameKeyPurchase?: (
    email: string,
    consent: boolean,
    hintedEuroCents: bigint,
  ) => Promise<unknown>;
  getMyGameKeyPurchaseStatus?: () => Promise<unknown>;
  redeemGameKey?: (code: string) => Promise<unknown>;
  getCallerDokaBalance?: () => Promise<unknown>;
};

export type DokaGameKeyShopProps = {
  actor: ActorAny | null;
  persist: ShopCreditPersistLock;
  onClose: () => void;
  onDokaCredited: (gained: number) => void;
};

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  background: "#0d0f1a",
  border: "1px solid #8b1a1a",
  borderRadius: 5,
  color: "#e0e6f0",
  fontSize: 16,
  outline: "none",
  boxSizing: "border-box",
  minHeight: 44,
};

const DokaGameKeyShop: React.FC<DokaGameKeyShopProps> = ({
  actor,
  persist,
  onClose,
  onDokaCredited,
}) => {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [euroHint, setEuroHint] = useState("");
  const [gameKey, setGameKey] = useState("");
  const [status, setStatus] = useState<GameKeyRequestView | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [copied, setCopied] = useState(false);
  const requestInFlight = useRef(false);
  const redeemInFlight = useRef(false);

  const loadStatus = useCallback(async () => {
    if (!actor?.getMyGameKeyPurchaseStatus) return;
    try {
      setStatus(
        parseMyGameKeyPurchaseStatus(await actor.getMyGameKeyPurchaseStatus()),
      );
    } catch {
      setStatus(null);
    }
  }, [actor]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const hintCents = euroTextToCents(euroHint);
  const suggested =
    "ok" in hintCents ? suggestedDokaFromEuroCents(hintCents.ok) : 0;
  const openPending = status?.status === "pending";
  const openApproved = status?.status === "approved";

  const paymentHref = safeExternalHref(MOLLIE_PAYMENT_LINK);

  const copyPaymentLink = async () => {
    try {
      await navigator.clipboard.writeText(MOLLIE_PAYMENT_LINK);
      setCopied(true);
      toast.success("Payment link copied");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy the payment link");
    }
  };

  const submitRequest = async () => {
    const emailErr = validateGameKeyEmail(email);
    if (emailErr) {
      toast.error(emailErr);
      return;
    }
    const consentErr = validateGameKeyConsent(consent);
    if (consentErr) {
      toast.error(consentErr);
      return;
    }
    if ("err" in hintCents) {
      toast.error(hintCents.err);
      return;
    }
    if (!shouldStartShopPurchase(requestInFlight.current)) return;
    if (!actor?.requestGameKeyPurchase) {
      toast.error("Not connected — please log in before purchasing");
      return;
    }
    requestInFlight.current = true;
    setSubmitting(true);
    try {
      const parsed = readGameKeyCmdResult(
        await actor.requestGameKeyPurchase(
          email.trim(),
          true,
          BigInt(hintCents.ok),
        ),
        "requestGameKeyPurchase",
      );
      if ("err" in parsed) {
        toast.error(parsed.err);
        return;
      }
      toast.success(
        "Request submitted. Pay on Mollie, then wait for approval.",
      );
      await loadStatus();
    } catch {
      toast.error("Request could not be recorded.");
    } finally {
      requestInFlight.current = false;
      setSubmitting(false);
    }
  };

  const redeem = async () => {
    const formatErr = validateGameKeyFormat(gameKey.trim());
    if (formatErr) {
      toast.error(formatErr);
      return;
    }
    if (!shouldStartShopPurchase(redeemInFlight.current)) return;
    if (!actor) {
      toast.error("Not connected — please log in to redeem");
      return;
    }
    redeemInFlight.current = true;
    setRedeeming(true);
    try {
      const { result } = await redeemGameKeyThroughPersist(
        actor,
        persist,
        gameKey.trim(),
      );
      if ("err" in result) {
        toast.error(result.err);
        return;
      }
      const gained = dokaGainedFromGameKeyRedeem(result);
      if (gained > 0) {
        onDokaCredited(gained);
        toast.success(`${gained.toLocaleString()} Doka credited!`);
        setGameKey("");
        await loadStatus();
      } else {
        toast.error("GameKey accepted, but Doka credit is still pending.");
      }
    } catch {
      toast.error("Redeem failed. Try again in a moment.");
    } finally {
      redeemInFlight.current = false;
      setRedeeming(false);
    }
  };

  return (
    <div
      data-ocid="shop.dialog"
      aria-modal="true"
      aria-labelledby="shop-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9600,
        background: "rgba(0,0,0,0.88)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "auto",
      }}
      onClick={(e) => {
        if (shouldDismissShopDialogOnBackdrop(e.target, e.currentTarget)) {
          onClose();
        }
      }}
      onKeyDown={(e) => {
        if (shouldDismissShopDialogOnKey(e.key)) onClose();
      }}
    >
      <div
        style={{
          background: "#141726",
          border: "2px solid #c0392b",
          borderRadius: 14,
          padding: 28,
          width: "min(560px, 95vw)",
          maxHeight: "min(90vh, 90dvh)",
          overflowY: "auto",
          boxShadow: "0 0 60px rgba(192,57,43,0.5)",
          position: "relative",
        }}
      >
        <button
          type="button"
          data-ocid="shop.close_button"
          onClick={onClose}
          aria-label={IAP_SHOP_CLOSE_LABEL}
          style={{
            position: "absolute",
            top: 12,
            right: 16,
            background: "transparent",
            border: "none",
            color: "#e74c3c",
            fontSize: 20,
            cursor: "pointer",
            minWidth: 44,
            minHeight: 44,
          }}
        >
          ×
        </button>

        <h2
          id="shop-title"
          style={{
            color: "#e74c3c",
            fontFamily: "serif",
            marginBottom: 4,
            fontSize: 20,
          }}
        >
          {IAP_SHOP_TITLE}
        </h2>
        <p style={{ color: "#e0d6c8", fontSize: 12, marginBottom: 6 }}>
          {IAP_SHOP_PACKAGES_LEAD}
        </p>
        <p style={{ color: "#6a7a8a", fontSize: 12, marginBottom: 16 }}>
          {IAP_SHOP_PACKAGES_DETAIL}
        </p>

        <h3
          style={{
            color: "#6a7a8a",
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            margin: "0 0 8px",
            fontWeight: 700,
          }}
        >
          {IAP_SHOP_HOW_TO_HEADING}
        </h3>
        <ol
          data-ocid="shop.how_to_steps"
          style={{
            margin: "0 0 16px",
            padding: "12px 14px 12px 32px",
            background: "#0d0f1a",
            border: "1px solid #8b1a1a",
            borderRadius: 8,
            color: "#e0d6c8",
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          {IAP_SHOP_STEPS.map((step, i) => (
            <li
              key={step}
              style={{
                marginBottom: i === IAP_SHOP_STEPS.length - 1 ? 0 : 8,
              }}
            >
              {step}
            </li>
          ))}
        </ol>

        {status && (
          <div
            data-ocid="shop.request_status"
            style={{
              background: "#0d0f1a",
              border: "1px solid #8b1a1a",
              borderRadius: 8,
              padding: "10px 12px",
              marginBottom: 16,
              color: "#e0d6c8",
              fontSize: 12,
            }}
          >
            <div style={{ color: "#f1c40f", fontWeight: 800, marginBottom: 4 }}>
              {playerGameKeyStatusCopy(status.status)}
            </div>
            <div style={{ color: "#6a7a8a" }}>
              {status.email}
              {status.hintedEuroCents > 0
                ? ` · hinted ${hintedEurosLabel(status.hintedEuroCents)} ≈ ${suggestedDokaFromEuroCents(status.hintedEuroCents).toLocaleString()} Doka`
                : ""}
              {status.dokaAmount > 0
                ? ` · ${status.dokaAmount.toLocaleString()} Doka on this key`
                : ""}
            </div>
          </div>
        )}

        <p
          data-ocid="shop.kyc_preamble"
          style={{
            color: "#e0d6c8",
            fontSize: 12,
            lineHeight: 1.45,
            margin: "0 0 16px",
          }}
        >
          {IAP_SHOP_KYC_PREAMBLE}
        </p>

        <label
          htmlFor="shop-email"
          style={{
            display: "block",
            color: "#6a7a8a",
            fontSize: 10,
            textTransform: "uppercase",
            marginBottom: 4,
          }}
        >
          Email (required)
        </label>
        <input
          id="shop-email"
          type="email"
          autoComplete="email"
          data-ocid="shop.form.email_input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ ...fieldStyle, marginBottom: 12 }}
        />

        <label
          htmlFor="shop-euro-hint"
          style={{
            display: "block",
            color: "#6a7a8a",
            fontSize: 10,
            textTransform: "uppercase",
            marginBottom: 4,
          }}
        >
          Euros you intend to pay (optional hint)
        </label>
        <input
          id="shop-euro-hint"
          type="text"
          inputMode="decimal"
          data-ocid="shop.form.euro_hint_input"
          value={euroHint}
          onChange={(e) => setEuroHint(e.target.value)}
          placeholder="e.g. 10"
          style={{ ...fieldStyle, marginBottom: 6 }}
        />
        <p style={{ color: "#6a7a8a", fontSize: 11, margin: "0 0 12px" }}>
          {suggested > 0
            ? `Hint ≈ ${suggested.toLocaleString()} Doka at 100 Doka/€. Admin credits the amount actually received.`
            : "Leave blank if you prefer. Admin still enters Doka from the payment received."}
        </p>

        <label
          htmlFor="shop-email-consent"
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            color: "#e0d6c8",
            fontSize: 12,
            lineHeight: 1.4,
            marginBottom: 14,
            cursor: "pointer",
            minHeight: 44,
          }}
        >
          <input
            id="shop-email-consent"
            type="checkbox"
            data-ocid="shop.form.consent_checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            style={{ width: 20, height: 20, marginTop: 2, flexShrink: 0 }}
          />
          <span>{IAP_SHOP_CONSENT_LABEL}</span>
        </label>

        <button
          type="button"
          data-ocid="shop.confirm_button"
          onClick={() => void submitRequest()}
          disabled={submitting || openPending || openApproved}
          style={{
            width: "100%",
            minHeight: 44,
            padding: "13px 0",
            background:
              submitting || openPending || openApproved
                ? "#2a1a1a"
                : "linear-gradient(135deg,#6a0a0a,#c0392b)",
            border: `1px solid ${submitting || openPending || openApproved ? "#5a2a2a" : "#c0392b"}`,
            borderRadius: 8,
            color:
              submitting || openPending || openApproved ? "#6a3a3a" : "#fff",
            fontWeight: 800,
            fontSize: 14,
            cursor:
              submitting || openPending || openApproved
                ? "not-allowed"
                : "pointer",
            letterSpacing: "0.04em",
          }}
        >
          {submitting
            ? "Recording…"
            : openPending
              ? "Waiting for approval"
              : openApproved
                ? "Check email, then redeem"
                : "Submit purchase request"}
        </button>

        <div
          data-ocid="shop.mollie_pay_panel"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            marginTop: 16,
            marginBottom: 8,
            background: "#0d0f1a",
            border: "1px solid #8b1a1a",
            borderRadius: 8,
            padding: 16,
          }}
        >
          <img
            src={molliePaymentQr}
            alt="Mollie payment QR code for Doka purchase"
            width={220}
            height={220}
            style={{
              width: 220,
              height: 220,
              borderRadius: 12,
              background: "#fff",
            }}
          />
          <a
            href={paymentHref}
            target="_blank"
            rel="noopener noreferrer"
            data-ocid="shop.mollie_link"
            style={{
              color: "#86c4ff",
              fontSize: 12,
              wordBreak: "break-all",
              textAlign: "center",
              minHeight: 44,
              display: "flex",
              alignItems: "center",
            }}
          >
            {MOLLIE_PAYMENT_LINK}
          </a>
          <button
            type="button"
            data-ocid="shop.copy_payment_link_button"
            onClick={() => void copyPaymentLink()}
            style={{
              minHeight: 44,
              minWidth: 160,
              padding: "8px 16px",
              background: "linear-gradient(135deg,#6a0a0a,#c0392b)",
              border: "1px solid #c0392b",
              borderRadius: 6,
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            {copied ? "Copied" : "Copy payment link"}
          </button>
          <p
            style={{
              color: "#6a7a8a",
              fontSize: 11,
              margin: 0,
              textAlign: "center",
            }}
          >
            Scan with your phone or open the link. Choose the euro amount on
            Mollie yourself (1000 Doka = 10€).
          </p>
        </div>
        <p
          style={{
            color: "#6a7a8a",
            fontSize: 10,
            textAlign: "center",
            marginTop: 8,
            lineHeight: 1.5,
          }}
        >
          {IAP_SHOP_WAIT_COPY}
        </p>

        <div
          style={{
            marginTop: 22,
            paddingTop: 16,
            borderTop: "1px solid #2a3040",
          }}
        >
          <label
            htmlFor="shop-gamekey"
            style={{
              display: "block",
              color: "#6a7a8a",
              fontSize: 10,
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            Redeem GameKey
          </label>
          <textarea
            id="shop-gamekey"
            data-ocid="shop.form.gamekey_input"
            value={gameKey}
            onChange={(e) => setGameKey(e.target.value)}
            rows={3}
            spellCheck={false}
            aria-describedby="shop-gamekey-help"
            style={{
              ...fieldStyle,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: 13,
              resize: "vertical",
              minHeight: 72,
              marginBottom: 8,
            }}
          />
          <p
            id="shop-gamekey-help"
            style={{ color: "#6a7a8a", fontSize: 11, margin: "0 0 10px" }}
          >
            Paste the 120-character code from your email. It credits this
            logged-in player and can be used once.
          </p>
          <button
            type="button"
            data-ocid="shop.redeem_button"
            onClick={() => void redeem()}
            disabled={redeeming}
            style={{
              width: "100%",
              minHeight: 44,
              padding: "13px 0",
              background: redeeming
                ? "#2a1a1a"
                : "linear-gradient(135deg,#6a0a0a,#c0392b)",
              border: `1px solid ${redeeming ? "#5a2a2a" : "#c0392b"}`,
              borderRadius: 8,
              color: redeeming ? "#6a3a3a" : "#fff",
              fontWeight: 800,
              fontSize: 14,
              cursor: redeeming ? "not-allowed" : "pointer",
            }}
          >
            {redeeming ? "Redeeming…" : "Redeem GameKey"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DokaGameKeyShop;
