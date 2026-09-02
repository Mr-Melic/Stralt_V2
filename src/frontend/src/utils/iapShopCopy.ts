/**
 * IAP modal copy. Items (BuffShop potions, Doka spend) is a different store.
 * Display only.
 */

export const IAP_SHOP_TITLE = "Buy Doka";

export const IAP_SHOP_PACKAGES_LEAD =
  "Real-money EUR credit for Doka — not the Items potion shop.";

export const IAP_SHOP_PACKAGES_DETAIL =
  "Pay any euro amount on Mollie (1000 Doka = 10€). After we confirm the payment, a 120-character GameKey is emailed. Redeem it here while logged in.";

export const IAP_SHOP_KYC_PREAMBLE =
  "We only need the email that should receive your GameKey, and your consent to use it for this purchase. No proof of address.";

export const IAP_SHOP_CLOSE_LABEL = "Close Buy Doka";

export const IAP_SHOP_CONSENT_LABEL =
  "I agree that this email may be used to send the GameKey for this purchase.";

export const IAP_SHOP_WAIT_COPY =
  "After paying, wait here. Approval is usually within minutes; then check email and redeem the GameKey.";

export const IAP_SHOP_HOW_TO_HEADING = "How to buy";

export const IAP_SHOP_STEPS = [
  "Submit your email so we can send the GameKey.",
  "Pay any euro amount on Mollie (scan the QR or open the link).",
  "Wait until this panel says Approved, then check that email.",
  "Paste the 120-character GameKey below. It credits this login once.",
] as const;
