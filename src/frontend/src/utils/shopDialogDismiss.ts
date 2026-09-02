/**
 * Buy Doka overlay dismiss. Same contract as Item Shop (`BuffShop`):
 * backdrop click and Escape close the modal; clicks on the panel do not.
 * Display / a11y only — does not start a purchase or redeem.
 */

export function shouldDismissShopDialogOnBackdrop(
  eventTarget: EventTarget | null,
  currentTarget: EventTarget | null,
): boolean {
  return eventTarget != null && eventTarget === currentTarget;
}

export function shouldDismissShopDialogOnKey(key: string): boolean {
  return key === "Escape";
}
