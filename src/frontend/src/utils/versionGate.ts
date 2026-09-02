/**
 * Version-bump localStorage wipe. APP_VERSION changes force a re-login, but
 * BuffShop inventory lives only in `${principal}_inventory` — a blanket
 * clear() drops paid potions while the canister Doka spend stays.
 */

export function shouldPreserveVersionGateKey(key: string): boolean {
  return (
    key === "pbv_tier_spawn_config" ||
    key === "pbv_levelup_config" ||
    key.endsWith("_inventory")
  );
}

export function collectPreservedLocalStorage(
  keys: readonly string[],
  getItem: (key: string) => string | null,
): Record<string, string> {
  const saved: Record<string, string> = {};
  for (const key of keys) {
    if (!shouldPreserveVersionGateKey(key)) continue;
    const value = getItem(key);
    if (value !== null) saved[key] = value;
  }
  return saved;
}
