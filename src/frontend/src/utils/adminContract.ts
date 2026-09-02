/**
 * Admin UI ↔ Candid adapters.
 *
 * The dashboard types (hitsMultiple, walkFramesFront, Motoko-style opt
 * tuples, nested purchase customerData) do not match the generated actor
 * or src/backend/main.mo. These helpers are the only place that mapping
 * is allowed so a failed draft cannot silently drop fields or treat
 * `{ __kind__: "err" }` as success.
 */

export type AdminCmdOk = { ok: true };
export type AdminCmdErr = { err: string };

export function readAdminCmdResult(
  result: unknown,
  method: string,
): AdminCmdOk | AdminCmdErr {
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
  if (r.__kind__ === "ok" || "ok" in r || "_ok" in r) {
    return { ok: true };
  }
  return { err: `${method} missing ok payload` };
}

export function assertAdminCmdOk(result: unknown, method: string): void {
  const parsed = readAdminCmdResult(result, method);
  if ("err" in parsed) throw new Error(parsed.err);
}

export type AdminPurchaseRecord = {
  id: string;
  packageId: string;
  dokaAmount: number;
  priceEur?: number;
  timestamp: string;
  status: string;
  customerData: Record<string, string>;
  proofFileUrl?: string;
  proofOfAddressBase64?: string;
  proofOfAddressName?: string;
  userId?: string;
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

/** Motoko Time.now() is nanoseconds. Date() wants milliseconds. */
export function purchaseTimestampMs(raw: unknown): number {
  if (typeof raw === "string" && raw.length > 0) {
    const parsed = Date.parse(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n > 1e15 ? Math.floor(n / 1_000_000) : Math.floor(n);
}

export function mapPurchaseRecordFromBackend(
  raw: unknown,
): AdminPurchaseRecord {
  const r = (raw ?? {}) as Record<string, unknown>;
  const nested =
    r.customerData && typeof r.customerData === "object"
      ? (r.customerData as Record<string, unknown>)
      : {};
  const firstName = textOf(nested.firstName ?? r.customerName);
  const lastName = textOf(nested.lastName ?? r.customerSurname);
  const email = textOf(nested.email ?? r.customerEmail);
  const address = textOf(nested.address ?? r.customerAddress);
  const city = textOf(nested.city ?? r.customerCity);
  const postalCode = textOf(nested.postalCode ?? r.customerPostal);
  const country = textOf(nested.country ?? r.customerCountry);
  const proofFileUrl = textOf(r.proofFileUrl || nested.proofFileUrl);
  const statusRaw = textOf(r.status) || "pending";
  const status = statusRaw === "completed" ? "paid" : statusRaw;
  const tsMs = purchaseTimestampMs(r.timestamp);
  return {
    id: textOf(r.id),
    packageId: textOf(r.packageId),
    dokaAmount: Number(r.dokaAmount ?? 0) || 0,
    priceEur:
      r.priceEur != null && Number.isFinite(Number(r.priceEur))
        ? Number(r.priceEur)
        : undefined,
    timestamp: tsMs > 0 ? new Date(tsMs).toISOString() : "",
    status,
    customerData: {
      firstName,
      lastName,
      email,
      address,
      city,
      postalCode,
      country,
    },
    proofFileUrl: proofFileUrl || undefined,
    proofOfAddressBase64: textOf(r.proofOfAddressBase64) || undefined,
    proofOfAddressName: textOf(r.proofOfAddressName) || undefined,
    userId: textOf(r.userId || r.userPrincipal) || undefined,
  };
}

export function readPurchasesResult(result: unknown): AdminPurchaseRecord[] {
  if (Array.isArray(result)) {
    return result.map(mapPurchaseRecordFromBackend);
  }
  if (result == null || typeof result !== "object") {
    throw new Error("getPurchases returned an empty result");
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
    throw new Error("getPurchases missing ok payload");
  }
  return ok.map(mapPurchaseRecordFromBackend);
}

export function optUrlToOptional(
  value: [] | [string] | string | undefined | null,
): string | undefined {
  if (Array.isArray(value)) {
    const first = value[0];
    return typeof first === "string" && first.length > 0 ? first : undefined;
  }
  if (typeof value === "string" && value.length > 0) return value;
  return undefined;
}

export function optionalToOptUrl(
  value: string | undefined | null | [] | [string],
): [] | [string] {
  if (Array.isArray(value)) {
    return value[0] ? [value[0]] : [];
  }
  if (typeof value === "string" && value.length > 0) return [value];
  return [];
}

type SpriteWalkFields = {
  walkFramesFront?: string[];
  walkFramesRight?: string[];
  walkFramesLeft?: string[];
  walkFramesBack?: string[];
  frontWalkFrames?: string[];
  rightWalkFrames?: string[];
  leftWalkFrames?: string[];
  backWalkFrames?: string[];
  frontUrl?: [] | [string] | string;
  rightUrl?: [] | [string] | string;
  leftUrl?: [] | [string] | string;
  backUrl?: [] | [string] | string;
};

export function toBackendPlayerSpriteConfig<T extends SpriteWalkFields>(
  config: T,
): T & {
  frontWalkFrames: string[];
  rightWalkFrames: string[];
  leftWalkFrames: string[];
  backWalkFrames: string[];
  frontUrl?: string;
  rightUrl?: string;
  leftUrl?: string;
  backUrl?: string;
} {
  return {
    ...config,
    frontWalkFrames: config.frontWalkFrames ?? config.walkFramesFront ?? [],
    rightWalkFrames: config.rightWalkFrames ?? config.walkFramesRight ?? [],
    leftWalkFrames: config.leftWalkFrames ?? config.walkFramesLeft ?? [],
    backWalkFrames: config.backWalkFrames ?? config.walkFramesBack ?? [],
    frontUrl: optUrlToOptional(config.frontUrl),
    rightUrl: optUrlToOptional(config.rightUrl),
    leftUrl: optUrlToOptional(config.leftUrl),
    backUrl: optUrlToOptional(config.backUrl),
  };
}

export function fromBackendPlayerSpriteConfig<T extends SpriteWalkFields>(
  raw: T,
): T & {
  walkFramesFront: string[];
  walkFramesRight: string[];
  walkFramesLeft: string[];
  walkFramesBack: string[];
  frontUrl: [] | [string];
  rightUrl: [] | [string];
  leftUrl: [] | [string];
  backUrl: [] | [string];
} {
  return {
    ...raw,
    walkFramesFront: raw.walkFramesFront ?? raw.frontWalkFrames ?? [],
    walkFramesRight: raw.walkFramesRight ?? raw.rightWalkFrames ?? [],
    walkFramesLeft: raw.walkFramesLeft ?? raw.leftWalkFrames ?? [],
    walkFramesBack: raw.walkFramesBack ?? raw.backWalkFrames ?? [],
    frontUrl: optionalToOptUrl(raw.frontUrl),
    rightUrl: optionalToOptUrl(raw.rightUrl),
    leftUrl: optionalToOptUrl(raw.leftUrl),
    backUrl: optionalToOptUrl(raw.backUrl),
  };
}

type SpellBridgeFields = {
  hitsMultiple?: boolean;
  multiTarget?: boolean;
  cooldown?: number | bigint;
};

export function toBackendSpellConfig<T extends SpellBridgeFields>(
  config: T,
): T & { multiTarget: boolean; cooldown: bigint } {
  const cooldownRaw = config.cooldown ?? 0;
  const cooldown =
    typeof cooldownRaw === "bigint"
      ? cooldownRaw
      : BigInt(Math.max(0, Math.round(Number(cooldownRaw) || 0)));
  return {
    ...config,
    multiTarget: config.multiTarget ?? config.hitsMultiple ?? false,
    cooldown,
  };
}

export function fromBackendSpellConfig<T extends SpellBridgeFields>(
  raw: T,
): T & { hitsMultiple: boolean; cooldown: number } {
  const cooldownRaw = raw.cooldown ?? 0;
  return {
    ...raw,
    hitsMultiple: raw.hitsMultiple ?? raw.multiTarget ?? false,
    cooldown: Number(cooldownRaw) || 0,
  };
}

export function toBackendEnemySpriteUrl(
  spriteUrl: [] | [string] | string | undefined | null,
): string | undefined {
  return optUrlToOptional(spriteUrl);
}
