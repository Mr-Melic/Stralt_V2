/**
 * Persist a spell upgrade through the backend-authoritative upgradeSpell
 * funnel. updateCharacter cannot deduct from the per-principal dokaBalances
 * map (Character no longer carries dokaBalance), so a local-only spend is
 * restored the next time callerDokaBalance refetches.
 */

export interface SpellUpgradeOk {
  newLevel: number;
  newDoka?: number;
}

/**
 * Apply an upgradeSpell result to the local level map.
 * Must run inside the persist lock, before any queued saveBattleStats
 * snapshot, or a heal/death write will persist the pre-upgrade map.
 */
export function applySpellLevel(
  levels: Record<string, number>,
  spellId: string,
  newLevel: number,
): Record<string, number> {
  return { ...levels, [spellId]: newLevel };
}

export interface SpellUpgradeActor {
  upgradeSpell: (
    slot: bigint,
    spellId: string,
  ) => Promise<
    | { ok: bigint | number }
    | { _ok: bigint | number }
    | { __kind__: "ok"; ok: bigint | number }
    | { err: string }
    | { _err: string }
    | { __kind__: "err"; err: string }
  >;
  getCallerDokaBalance?: () => Promise<bigint | number | null | undefined>;
}

/**
 * Normalize upgradeSpell variant payloads from the Candid / Caffeine bindings.
 * Throws when the canister rejected the write so callers do not apply a local
 * upgrade that never landed.
 */
export function readUpgradeSpellOk(result: unknown): number {
  if (result == null || typeof result !== "object") {
    throw new Error("upgradeSpell returned an empty result");
  }
  const r = result as Record<string, unknown>;
  const errMsg = r.__kind__ === "err" ? r.err : (r.err ?? r._err ?? r.Err);
  if (errMsg != null && r.ok == null && r._ok == null) {
    throw new Error(`upgradeSpell failed: ${String(errMsg)}`);
  }
  const ok = r.ok ?? r._ok;
  if (ok == null) {
    throw new Error("upgradeSpell missing ok payload");
  }
  const newLevel = Number(ok);
  if (!Number.isFinite(newLevel) || newLevel < 1) {
    throw new Error(`upgradeSpell returned invalid level: ${String(ok)}`);
  }
  return newLevel;
}

/**
 * Upgrade a spell on the canister (deducts Doka + writes spellLevelKeys) and
 * optionally read back the new per-principal Doka balance.
 */
export async function persistSpellUpgrade(
  actor: SpellUpgradeActor,
  slot: number,
  spellId: string,
): Promise<SpellUpgradeOk> {
  const result = await actor.upgradeSpell(BigInt(slot), spellId);
  const newLevel = readUpgradeSpellOk(result);
  if (!actor.getCallerDokaBalance) {
    return { newLevel };
  }
  const raw = await actor.getCallerDokaBalance();
  if (raw == null) {
    return { newLevel };
  }
  const newDoka = Number(raw);
  return {
    newLevel,
    newDoka: Number.isFinite(newDoka) ? newDoka : undefined,
  };
}

/**
 * Debit the canister spend, not the spellbook's advertised cost.
 *
 * Summon upgrades show `SUMMON_UPGRADE_COST_MULTIPLIER * 10 * 2^level` (100
 * at level 0) but `upgradeSpell` only charges `spellLevelingBaseCost *
 * 2^level` (10). Subtracting the advertised amount leaves the live wallet
 * short. hydrateWhenIdle then copies that under-count over committed, and
 * the next saveBattleStats (heal/shop) permanently wipes the difference.
 */
export function spellUpgradeUiSpend(
  advertisedCost: number,
  committedDokaBefore: number,
  backendDokaAfter: number | undefined,
): number {
  const before = Math.max(0, Math.floor(Number(committedDokaBefore) || 0));
  const next = committedDokaAfterSpellUpgrade(
    committedDokaBefore,
    backendDokaAfter,
    advertisedCost,
  );
  if (before > 0) return Math.max(0, before - next);
  return spellUpgradeCanisterSpend(advertisedCost);
}

/**
 * Canister debit when getCallerDokaBalance is missing or stale-high.
 * Summon UI advertises 10× (`100 * 2^level`); normal spells advertise
 * `10 * 2^level`, which is never a multiple of the summon UI base (100).
 */
const SPELL_LEVELING_BASE_COST = 10;
const SUMMON_UI_COST_MULTIPLIER = 10;

export function spellUpgradeCanisterSpend(advertisedCost: number): number {
  const advertised = Math.max(0, Math.floor(Number(advertisedCost) || 0));
  const summonUiBase = SPELL_LEVELING_BASE_COST * SUMMON_UI_COST_MULTIPLIER;
  if (advertised > 0 && advertised % summonUiBase === 0) {
    return Math.floor(advertised / SUMMON_UI_COST_MULTIPLIER);
  }
  return advertised;
}

/**
 * upgradeSpell then getCallerDokaBalance is a query. A stale pre-upgrade
 * read is >= committedBefore. Committing that snapshot refunds the spend
 * on the lock; the next saveBattleStats writes it back to the canister.
 * Use the observed post-upgrade wallet only when it actually decreased.
 */
export function committedDokaAfterSpellUpgrade(
  committedDokaBefore: number,
  backendDokaAfter: number | undefined,
  advertisedCost: number,
): number {
  const before = Math.max(0, Math.floor(Number(committedDokaBefore) || 0));
  if (backendDokaAfter != null) {
    const after = Math.max(0, Math.floor(Number(backendDokaAfter) || 0));
    if (after < before) return after;
    // Placeholder 0 is not a live wallet. Keep the query so we do not
    // seed the lock at 0 and let the next saveBattleStats wipe Doka.
    if (before === 0) return after;
  }
  if (before === 0) return 0;
  return Math.max(0, before - spellUpgradeCanisterSpend(advertisedCost));
}

export function shouldCommitSpellUpgradeDoka(
  committedBefore: number,
  nextDoka: number,
  walletSeeded: boolean,
): boolean {
  if (nextDoka === 0 && committedBefore === 0 && !walletSeeded) {
    return false;
  }
  return true;
}
