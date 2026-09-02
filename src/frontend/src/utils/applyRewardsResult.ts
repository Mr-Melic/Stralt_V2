export interface ApplyRewardsOk {
  newDoka: number;
  newXp: number;
  newLevel: number;
}

/**
 * Normalize applyRewards variant payloads from the Candid / Caffeine bindings.
 * Accepts `{ ok }`, `{ _ok }`, `{ __kind__: "ok", ok }`, and the matching err
 * shapes. Throws when the canister rejected the write.
 */
export function readApplyRewardsOk(result: unknown): ApplyRewardsOk {
  if (result == null || typeof result !== "object") {
    throw new Error("applyRewards returned an empty result");
  }
  const r = result as Record<string, unknown>;
  const errMsg = r.__kind__ === "err" ? r.err : (r.err ?? r._err ?? r.Err);
  if (errMsg != null && r.ok == null && r._ok == null) {
    throw new Error(`applyRewards failed: ${String(errMsg)}`);
  }
  const ok = (r.ok ?? r._ok) as
    | { newDoka?: unknown; newXp?: unknown; newLevel?: unknown }
    | undefined;
  if (!ok) {
    throw new Error("applyRewards missing ok payload");
  }
  return {
    newDoka: Number(ok.newDoka),
    newXp: Number(ok.newXp),
    newLevel: Number(ok.newLevel),
  };
}

/** Portal step XP. Must not land in the HUD until applyRewards commits. */
export const PORTAL_TRANSITION_XP = 10;

/** Persist a non-battle XP/Doka delta through the single applyRewards funnel. */
export async function persistIncrementalRewards(
  // Same loose actor type as resolveBattleRewards — Caffeine bindings vary.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actor: any,
  selectedSlot: number,
  dokaDelta: number,
  xpDelta: number,
): Promise<ApplyRewardsOk> {
  const result = await actor.applyRewards(
    BigInt(selectedSlot),
    BigInt(Math.max(0, Math.floor(dokaDelta))),
    BigInt(Math.max(0, Math.floor(xpDelta))),
  );
  return readApplyRewardsOk(result);
}
