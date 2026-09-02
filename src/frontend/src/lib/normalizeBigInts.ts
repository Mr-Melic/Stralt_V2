/**
 * Recursively walks objects/arrays and converts every BigInt to Number.
 * Use this on backend responses BEFORE they reach components, so no
 * component ever mixes BigInt with plain numbers in arithmetic.
 */
export function deepNormalizeBigInts<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (typeof value === "bigint") return Number(value) as unknown as T;
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.map((item) => deepNormalizeBigInts(item)) as unknown as T;
  }
  const obj = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    result[key] = deepNormalizeBigInts(obj[key]);
  }
  return result as T;
}
