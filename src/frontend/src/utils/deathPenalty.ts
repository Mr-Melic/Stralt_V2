import { xpForNextLevel } from "./xpCurve.ts";

/**
 * Death penalty: 20% XP and 40% Doka, floored, never below 0.
 *
 * applyRewards only accepts Nat and only adds, so negative deltas throw at
 * the Candid boundary and the penalty never reaches the canister. Persist
 * the already-reduced absolute XP/Doka through saveBattleStats instead.
 */

export const DEATH_XP_PENALTY_RATE = 0.2;
export const DEATH_DOKA_PENALTY_RATE = 0.4;

/** Replica rejects used to leave deathPenaltyApplied=true and the canister uncut. */
export const DEATH_PENALTY_PERSIST_ATTEMPTS = 3;

export function shouldRetryDeathPenaltyPersist(
  attempt: number,
  maxAttempts = DEATH_PENALTY_PERSIST_ATTEMPTS,
): boolean {
  return attempt >= 1 && attempt < maxAttempts;
}

export async function persistWithRetry<T>(
  persistOnce: () => Promise<T>,
  maxAttempts = DEATH_PENALTY_PERSIST_ATTEMPTS,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await persistOnce();
    } catch (err) {
      lastError = err;
      if (!shouldRetryDeathPenaltyPersist(attempt, maxAttempts)) break;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export type DeathPenaltyAmounts = {
  xpLost: number;
  dokaLost: number;
  newXp: number;
  newDoka: number;
};

export function computeDeathPenalty(
  exp: number,
  doka: number,
): DeathPenaltyAmounts {
  const safeExp = Math.max(0, Math.floor(Number(exp) || 0));
  const safeDoka = Math.max(0, Math.floor(Number(doka) || 0));
  const xpLost = Math.floor(safeExp * DEATH_XP_PENALTY_RATE);
  const dokaLost = Math.floor(safeDoka * DEATH_DOKA_PENALTY_RATE);
  return {
    xpLost,
    dokaLost,
    newXp: Math.max(0, safeExp - xpLost),
    newDoka: Math.max(0, safeDoka - dokaLost),
  };
}

/**
 * Optimistic death UI uses the live wallet/XP. A claim or applyRewards still
 * on the persist lock is not in that snapshot, so the immediate 40%/20% cut
 * is short. The queued saveBattleStats write penalizes the post-credit
 * committed values. hydrateWhenIdle then copies the lower UI over committed
 * and the next heal persists the under-count.
 *
 * After that write, raise UI to the persisted amount when it lagged.
 * applyRewards can also bump committed.level while the live hydrate is
 * skipped; raise UI level the same way so idle hydrate cannot persist a
 * downgrade through the next saveBattleStats.
 */
export function raiseUiAfterDeathPersist(
  uiValue: number,
  persistedValue: number,
): number {
  const ui = Math.max(0, Math.floor(Number(uiValue) || 0));
  const persisted = Math.max(0, Math.floor(Number(persistedValue) || 0));
  return Math.max(ui, persisted);
}

/**
 * After a victory level-up, leftover XP is on a new scale. max(old leftover,
 * persisted leftover) keeps the larger pre-level bar; idle hydrate then
 * refunds the death XP penalty on the next saveBattleStats.
 */
export function xpAfterDeathPersist(args: {
  uiXp: number;
  uiLevel: number;
  persistedXp: number;
  persistedLevel: number;
}): number {
  const uiLevel = Math.max(1, Math.floor(Number(args.uiLevel) || 1));
  const persistedLevel = Math.max(
    1,
    Math.floor(Number(args.persistedLevel) || 1),
  );
  if (persistedLevel > uiLevel) {
    return Math.max(0, Math.floor(Number(args.persistedXp) || 0));
  }
  return raiseUiAfterDeathPersist(args.uiXp, args.persistedXp);
}

/**
 * handleBattleEnd and portal XP both await applyRewards after the player can
 * walk. The recap overlay uses pointer-events: none, and a portal swap has
 * no overlay at all, so lava/spike death can land while that persist is still
 * in flight. Applying the post-await live hydrate then restores HP / replaces
 * XP with the unpenalized applyRewards snapshot. raiseUiAfterDeathPersist
 * keeps the higher UI; a later idle hydrate copies it over committed and
 * refunds the death penalty.
 */
export function shouldApplyVictoryLiveHydrate(
  deathTriggered: boolean,
  deathEpochAtPersistStart?: number,
  deathEpochNow?: number,
): boolean {
  if (deathTriggered) return false;
  if (
    deathEpochAtPersistStart !== undefined &&
    deathEpochNow !== undefined &&
    deathEpochAtPersistStart !== deathEpochNow
  ) {
    return false;
  }
  return true;
}

/**
 * 50% of the level-scaled max HP (`100 * (1 + (level-1) * 0.05)`).
 *
 * Must match handleRespawn / Death Realm UI. persistDeathPenalty used to
 * write `(50 + level) * 10 * 0.5` (255 at level 1) — a reload then hydrated
 * the player far above max HP.
 */
export function respawnHpAfterDeath(level: number): number {
  const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
  return Math.max(1, Math.floor(100 * (1 + (safeLevel - 1) * 0.05) * 0.5));
}

/** Post-battle HP/AP/MP floor. Uses the pre-hydrate level, matching the live setState. */
export function victoryResourceFloor(level: number): {
  hp: number;
  mp: number;
  ap: number;
} {
  const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
  return {
    hp: 50 + safeLevel * 10,
    mp: 5 + Math.floor(safeLevel / 10),
    ap: 6 + Math.floor(safeLevel / 20),
  };
}

export type VictoryLiveHydratePrev = {
  exp: number;
  level: number;
  hp: number;
  mp: number;
  ap: number;
  expToNext: number;
};

export type VictoryLiveHydrateRecap = {
  newXp?: number | null;
  currentLevel: number;
};

/**
 * applyRewards hydrates XP/level only. The recap overlay's outer wrapper is
 * pointer-events: none, so a Doka heal is live once inBattle is false —
 * before this persist await returns. Replacing HP with the post-battle floor
 * undoes that paid heal; the player then heals again and is charged twice.
 *
 * Keep leftover combat HP (or a recap heal) when it is already above the
 * floor; still raise up to the floor when combat ended lower.
 */
export function mergeVictoryRewardLiveStats<T extends VictoryLiveHydratePrev>(
  prev: T,
  recap: VictoryLiveHydrateRecap,
): T {
  const level = recap.currentLevel || prev.level;
  const floor = victoryResourceFloor(prev.level);
  return {
    ...prev,
    exp: recap.newXp ?? prev.exp,
    level,
    hp: Math.max(prev.hp, floor.hp),
    mp: Math.max(prev.mp, floor.mp),
    ap: Math.max(prev.ap, floor.ap),
    expToNext: xpForNextLevel(level),
  };
}

function toNat(n: number): bigint {
  return BigInt(Math.max(0, Math.floor(Number(n) || 0)));
}

export type DeathPenaltyPersistActor = {
  saveBattleStats: (
    slot: bigint,
    level: bigint,
    xp: bigint,
    hp: bigint,
    maxHp: bigint,
    ap: bigint,
    maxAp: bigint,
    mp: bigint,
    maxMp: bigint,
    attack: bigint,
    defense: bigint,
    initiative: bigint,
    dokaBalance: bigint,
    spellLevelKeys: string[],
    spellLevelValues: bigint[],
  ) => Promise<
    | { __kind__: "ok"; ok: null }
    | { __kind__: "err"; err: string }
    | { ok?: unknown; err?: string }
    | undefined
  >;
};

export type DeathPenaltyPersistInput = {
  slot: number;
  level: number;
  hp: number;
  maxHp: number;
  ap: number;
  maxAp: number;
  mp: number;
  maxMp: number;
  /** Persisted as CharacterStats.atk. Must be the current stored value. */
  attack: number;
  defense: number;
  initiative: number;
  newXp: number;
  newDoka: number;
  spellLevels: Record<string, number>;
};

export async function persistDeathPenalty(
  // Actor is Record<string, any> at call sites; keep this loose so persist
  // stays callable from WorldExploration without a cast.
  actor:
    | {
        saveBattleStats?: DeathPenaltyPersistActor["saveBattleStats"];
        [key: string]: unknown;
      }
    | null
    | undefined,
  input: DeathPenaltyPersistInput,
): Promise<void> {
  if (!actor?.saveBattleStats) return;
  const keys = Object.keys(input.spellLevels);
  const result = await actor.saveBattleStats(
    toNat(input.slot),
    toNat(input.level),
    toNat(input.newXp),
    toNat(input.hp),
    toNat(input.maxHp),
    toNat(input.ap),
    toNat(input.maxAp),
    toNat(input.mp),
    toNat(input.maxMp),
    toNat(input.attack),
    toNat(input.defense),
    toNat(input.initiative),
    toNat(input.newDoka),
    keys,
    keys.map((k) => toNat(input.spellLevels[k] ?? 0)),
  );
  if (
    result &&
    typeof result === "object" &&
    (("__kind__" in result && result.__kind__ === "err") ||
      ("err" in result && result.err))
  ) {
    const err =
      "err" in result && result.err
        ? String(result.err)
        : "saveBattleStats failed";
    throw new Error(err);
  }
}

export type DeathPenaltyStorage = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;

export type PendingDeathPenalty = {
  slot: number;
  preXp: number;
  preDoka: number;
  afterXp: number;
  afterDoka: number;
  /**
   * Set after saveBattleStats accepts the 20/40 cut, before the marker is
   * removed. A crash in that window used to leave an unpaid-looking pending
   * record; the next portal / ground-Doka credit then looked like a "later
   * earn" and resolvePendingDeathReplay cleared without writing.
   */
  cutConfirmed?: boolean;
};

export function pendingDeathPenaltyStorageKey(slot: number): string {
  return `pbv_pending_death_penalty_slot${Math.max(1, Math.floor(Number(slot) || 1))}`;
}

export function writePendingDeathPenalty(
  storage: DeathPenaltyStorage,
  pending: PendingDeathPenalty,
): void {
  try {
    storage.setItem(
      pendingDeathPenaltyStorageKey(pending.slot),
      JSON.stringify(pending),
    );
  } catch {
    // sessionStorage can throw in private mode; skip the reload replay.
  }
}

export function readPendingDeathPenalty(
  storage: DeathPenaltyStorage,
  slot: number,
): PendingDeathPenalty | null {
  try {
    const raw = storage.getItem(pendingDeathPenaltyStorageKey(slot));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingDeathPenalty>;
    if (
      parsed.slot == null ||
      parsed.preXp == null ||
      parsed.preDoka == null ||
      parsed.afterXp == null ||
      parsed.afterDoka == null
    ) {
      return null;
    }
    const pending: PendingDeathPenalty = {
      slot: Math.floor(Number(parsed.slot)),
      preXp: Math.max(0, Math.floor(Number(parsed.preXp))),
      preDoka: Math.max(0, Math.floor(Number(parsed.preDoka))),
      afterXp: Math.max(0, Math.floor(Number(parsed.afterXp))),
      afterDoka: Math.max(0, Math.floor(Number(parsed.afterDoka))),
    };
    if (parsed.cutConfirmed === true) pending.cutConfirmed = true;
    return pending;
  } catch {
    return null;
  }
}

export function clearPendingDeathPenalty(
  storage: DeathPenaltyStorage,
  slot: number,
): void {
  try {
    storage.removeItem(pendingDeathPenaltyStorageKey(slot));
  } catch {
    // ignore
  }
}

export type PendingDeathReplay =
  | { action: "clear" }
  | { action: "write"; newXp: number; newDoka: number };

/**
 * Death-replay must compare the canister XP, not GameFlow's Play-entry
 * `character.experience`. That prop is never updated after applyRewards, so
 * a remount / actor reconnect after an in-session earn reads the stale
 * select-screen value and used to miss both pre/after matches.
 */
export function experienceFromCharacterRecord(
  record: { experience?: unknown } | null | undefined | unknown,
): number | null {
  if (record == null || typeof record !== "object") return null;
  const xp = Number((record as { experience?: unknown }).experience);
  if (!Number.isFinite(xp)) return null;
  return Math.max(0, Math.floor(xp));
}

export async function readDeathReplayBackendSnapshot(args: {
  fetchDoka: () => Promise<unknown>;
  fetchCharacter: () => Promise<unknown>;
}): Promise<{ xp: number; doka: number } | null> {
  const [rawDoka, rawChar] = await Promise.all([
    args.fetchDoka(),
    args.fetchCharacter(),
  ]);
  const doka = Number(rawDoka);
  const xp = experienceFromCharacterRecord(rawChar);
  if (!Number.isFinite(doka) || xp == null || !Number.isFinite(xp)) return null;
  return { xp, doka };
}

/**
 * Unpaid 20/40 cut still sitting in pending storage. A heal/shop
 * saveBattleStats after a failed death persist writes unpenalized XP and a
 * spent Doka — the pair no longer matches `pre`, so a naive replay cleared
 * the marker and the canister stayed whole.
 *
 * If the drop from `pre` is already at least the death loss, that axis
 * absorbed the cut (or a larger spend). Otherwise subtract the unpaid loss
 * from the live snapshot so a portal +10 or ground-Doka credit cannot
 * erase the pending marker.
 */
export function applyUnpaidDeathPenaltyToWrite(
  pending: PendingDeathPenalty,
  writeXp: number,
  writeDoka: number,
): { xp: number; doka: number } {
  const xpLost = Math.max(0, pending.preXp - pending.afterXp);
  const dokaLost = Math.max(0, pending.preDoka - pending.afterDoka);
  const xp = Math.max(0, Math.floor(Number(writeXp) || 0));
  const doka = Math.max(0, Math.floor(Number(writeDoka) || 0));
  const xpDrop = pending.preXp - xp;
  const dokaDrop = pending.preDoka - doka;
  return {
    xp: xpDrop >= xpLost ? xp : Math.max(0, xp - xpLost),
    doka: dokaDrop >= dokaLost ? doka : Math.max(0, doka - dokaLost),
  };
}

/**
 * Reload / flush before saveBattleStats lands leaves the canister uncut.
 *
 * Apply the original unpaid 20/40 to the live snapshot unless that cut
 * already landed or `cutConfirmed` is set. A later earn (portal +10,
 * ground Doka, or a dual-axis victory credit) must not clear the marker
 * and keep the uncut wallet. Recutting 20/40 of the credited snapshot
 * would tax the earn; subtract the pending loss instead.
 *
 * `cutConfirmed` means saveBattleStats already accepted the cut. A later
 * earn on that wallet must not be penalized again.
 */
export function resolvePendingDeathReplay(
  backendXp: number,
  backendDoka: number,
  pending: PendingDeathPenalty,
): PendingDeathReplay {
  const xp = Math.max(0, Math.floor(Number(backendXp) || 0));
  const doka = Math.max(0, Math.floor(Number(backendDoka) || 0));
  if (pending.cutConfirmed === true) {
    return { action: "clear" };
  }
  if (xp === pending.afterXp && doka === pending.afterDoka) {
    return { action: "clear" };
  }
  const next = applyUnpaidDeathPenaltyToWrite(pending, xp, doka);
  if (next.xp === xp && next.doka === doka) {
    return { action: "clear" };
  }
  return { action: "write", newXp: next.xp, newDoka: next.doka };
}

/**
 * sessionStorage dies with the tab. Closing after a lava death used to
 * drop the pending marker so reload never replayed the 20/40 cut.
 * Prefer localStorage; fall back to sessionStorage for an in-flight
 * same-tab marker from an older build.
 */
export function defaultDeathPenaltyStorage(): DeathPenaltyStorage {
  try {
    if (typeof localStorage !== "undefined") return localStorage;
  } catch {
    // private mode
  }
  try {
    if (typeof sessionStorage !== "undefined") return sessionStorage;
  } catch {
    // ignore
  }
  const mem = new Map<string, string>();
  return {
    getItem: (k) => mem.get(k) ?? null,
    setItem: (k, v) => {
      mem.set(k, v);
    },
    removeItem: (k) => {
      mem.delete(k);
    },
  };
}

export function readPendingDeathPenaltyAnywhere(
  slot: number,
  primary: DeathPenaltyStorage = defaultDeathPenaltyStorage(),
  fallback?: DeathPenaltyStorage,
): PendingDeathPenalty | null {
  const first = readPendingDeathPenalty(primary, slot);
  if (first) return first;
  if (!fallback) {
    try {
      if (typeof sessionStorage !== "undefined") {
        return readPendingDeathPenalty(sessionStorage, slot);
      }
    } catch {
      return null;
    }
    return null;
  }
  return readPendingDeathPenalty(fallback, slot);
}

export function clearPendingDeathPenaltyAnywhere(
  slot: number,
  primary: DeathPenaltyStorage = defaultDeathPenaltyStorage(),
  fallback?: DeathPenaltyStorage,
): void {
  clearPendingDeathPenalty(primary, slot);
  if (fallback) {
    clearPendingDeathPenalty(fallback, slot);
    return;
  }
  try {
    if (typeof sessionStorage !== "undefined") {
      clearPendingDeathPenalty(sessionStorage, slot);
    }
  } catch {
    // ignore
  }
}

/** Persist-success marker so a crash-before-clear cannot look unpaid. */
export function confirmPendingDeathPenalty(
  storage: DeathPenaltyStorage,
  pending: PendingDeathPenalty,
): void {
  writePendingDeathPenalty(storage, { ...pending, cutConfirmed: true });
}

export function confirmAndClearPendingDeathPenalty(
  storage: DeathPenaltyStorage,
  pending: PendingDeathPenalty,
): void {
  confirmPendingDeathPenalty(storage, pending);
  clearPendingDeathPenalty(storage, pending.slot);
}

export function confirmAndClearPendingDeathPenaltyAnywhere(
  slot: number,
  pending: PendingDeathPenalty,
  primary: DeathPenaltyStorage = defaultDeathPenaltyStorage(),
  fallback?: DeathPenaltyStorage,
): void {
  confirmPendingDeathPenalty(primary, { ...pending, slot });
  clearPendingDeathPenaltyAnywhere(slot, primary, fallback);
}

export type FlushPendingDeathArgs = {
  storage: DeathPenaltyStorage;
  slot: number;
  persist: {
    commit: (next: { doka?: number; xp?: number }) => void;
  };
  fetchSnapshot: () => Promise<{ xp: number; doka: number } | null>;
  writePenalty: (newXp: number, newDoka: number) => Promise<void>;
};

/**
 * Run ahead of heal / shop / applyRewards / upgrade. A failed death persist
 * leaves the canister uncut; the next absolute or additive write then
 * commits the unpenalized snapshot (or adds onto it) and the pending
 * marker no longer matches `pre`.
 */
export async function flushPendingDeathPenalty(
  args: FlushPendingDeathArgs,
): Promise<boolean> {
  const pending = readPendingDeathPenalty(args.storage, args.slot);
  if (!pending) return false;
  const snap = await args.fetchSnapshot();
  if (!snap) return false;
  const decision = resolvePendingDeathReplay(snap.xp, snap.doka, pending);
  if (decision.action !== "write") {
    clearPendingDeathPenalty(args.storage, args.slot);
    return false;
  }
  await persistWithRetry(() =>
    args.writePenalty(decision.newXp, decision.newDoka),
  );
  args.persist.commit({ doka: decision.newDoka, xp: decision.newXp });
  confirmAndClearPendingDeathPenalty(args.storage, pending);
  return true;
}

export const DEATH_PERSIST_RETRY_COUNT = DEATH_PENALTY_PERSIST_ATTEMPTS;

/**
 * A single replica reject used to leave deathPenaltyApplied true and the
 * canister uncut. Reload then hydrates the unpenalized wallet.
 */
