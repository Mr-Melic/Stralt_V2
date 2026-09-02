import assert from "node:assert/strict";
import { persistBossRushRewardsThroughLock } from "../hooks/bossRushProgress.ts";
import { committedDokaAfterAchievementCredit } from "./achievementReward.ts";
import {
  applyUnpaidDeathPenaltyToWrite,
  clearPendingDeathPenalty,
  clearPendingDeathPenaltyAnywhere,
  computeDeathPenalty,
  confirmPendingDeathPenalty,
  experienceFromCharacterRecord,
  flushPendingDeathPenalty,
  mergeVictoryRewardLiveStats,
  persistDeathPenalty,
  persistWithRetry,
  raiseUiAfterDeathPersist,
  readDeathReplayBackendSnapshot,
  readPendingDeathPenalty,
  readPendingDeathPenaltyAnywhere,
  resolvePendingDeathReplay,
  respawnHpAfterDeath,
  shouldApplyVictoryLiveHydrate,
  victoryResourceFloor,
  writePendingDeathPenalty,
  xpAfterDeathPersist,
} from "./deathPenalty.ts";
import {
  createProgressPersist,
  resolveCommittedDokaForAbsoluteWrite,
} from "./progressPersist.ts";

assert.deepEqual(computeDeathPenalty(100, 100), {
  xpLost: 20,
  dokaLost: 40,
  newXp: 80,
  newDoka: 60,
});
assert.deepEqual(computeDeathPenalty(0, 0), {
  xpLost: 0,
  dokaLost: 0,
  newXp: 0,
  newDoka: 0,
});
assert.deepEqual(computeDeathPenalty(1, 1), {
  xpLost: 0,
  dokaLost: 0,
  newXp: 1,
  newDoka: 1,
});
assert.deepEqual(computeDeathPenalty(-10, -50), {
  xpLost: 0,
  dokaLost: 0,
  newXp: 0,
  newDoka: 0,
});

assert.equal(respawnHpAfterDeath(1), 50);
assert.equal(respawnHpAfterDeath(10), 72);
assert.notEqual(
  respawnHpAfterDeath(1),
  Math.floor((50 + 1) * 10 * 0.5),
  "old persistDeathPenalty formula must not be reused (255 HP at level 1)",
);
assert.deepEqual(computeDeathPenalty(5, 9), {
  xpLost: 1,
  dokaLost: 3,
  newXp: 4,
  newDoka: 6,
});

let persistArgs: unknown[] | null = null;
await persistDeathPenalty(
  {
    saveBattleStats: async (...args) => {
      persistArgs = args;
      return { __kind__: "ok", ok: null };
    },
  },
  {
    slot: 1,
    level: 4,
    hp: 0,
    maxHp: 100,
    ap: 4,
    maxAp: 4,
    mp: 3,
    maxMp: 3,
    attack: 15,
    defense: 2,
    initiative: 10,
    newXp: 80,
    newDoka: 60,
    spellLevels: { fireball: 2 },
  },
);

assert.ok(persistArgs);
assert.equal(persistArgs[0], 1n);
assert.equal(persistArgs[2], 80n);
assert.equal(persistArgs[9], 15n);
assert.equal(persistArgs[12], 60n);
assert.deepEqual(persistArgs[13], ["fireball"]);
assert.deepEqual(persistArgs[14], [2n]);

let threw = false;
try {
  await persistDeathPenalty(
    {
      saveBattleStats: async () => ({ __kind__: "err", err: "banned" }),
    },
    {
      slot: 1,
      level: 1,
      hp: 0,
      maxHp: 1,
      ap: 1,
      maxAp: 1,
      mp: 1,
      maxMp: 1,
      attack: 0,
      defense: 0,
      initiative: 0,
      newXp: 0,
      newDoka: 0,
      spellLevels: {},
    },
  );
} catch (e) {
  threw = String((e as Error).message).includes("banned");
}
assert.equal(threw, true);

assert.equal(raiseUiAfterDeathPersist(600, 900), 900);
assert.equal(raiseUiAfterDeathPersist(900, 900), 900);
assert.equal(raiseUiAfterDeathPersist(610, 582), 610);

{
  // Optimistic death UI called onDokaBalanceChange(cut) and left the live
  // ref uncut. raiseUi(uncut, persisted) then refunds the 40% penalty.
  const uncutRef = 1000;
  const optimistic = computeDeathPenalty(100, uncutRef);
  assert.equal(optimistic.newDoka, 600);
  const persistedAfterCredit = 900;
  assert.equal(
    raiseUiAfterDeathPersist(uncutRef, persistedAfterCredit),
    1000,
    "uncut ref + raiseUi restores the pre-penalty wallet",
  );
  assert.equal(
    raiseUiAfterDeathPersist(optimistic.newDoka, persistedAfterCredit),
    900,
    "optimistic cut on the live ref lets raiseUi keep the persisted penalty",
  );
}
assert.equal(
  xpAfterDeathPersist({
    uiXp: 64,
    uiLevel: 4,
    persistedXp: 24,
    persistedLevel: 5,
  }),
  24,
);
assert.equal(
  xpAfterDeathPersist({
    uiXp: 64,
    uiLevel: 5,
    persistedXp: 24,
    persistedLevel: 5,
  }),
  64,
);
assert.equal(shouldApplyVictoryLiveHydrate(true), false);
assert.equal(shouldApplyVictoryLiveHydrate(false), true);
assert.equal(shouldApplyVictoryLiveHydrate(false, 0, 1), false);
assert.equal(shouldApplyVictoryLiveHydrate(false, 1, 1), true);
assert.equal(shouldApplyVictoryLiveHydrate(true, 0, 0), false);

assert.deepEqual(victoryResourceFloor(1), { hp: 60, mp: 5, ap: 6 });
assert.deepEqual(victoryResourceFloor(10), { hp: 150, mp: 6, ap: 6 });

{
  const recapHeal = mergeVictoryRewardLiveStats(
    { exp: 40, level: 1, hp: 100, mp: 5, ap: 6, expToNext: 100 },
    { newXp: 80, currentLevel: 1 },
  );
  assert.equal(recapHeal.hp, 100);
  assert.equal(recapHeal.exp, 80);
  assert.equal(recapHeal.expToNext, 100);

  const combatLow = mergeVictoryRewardLiveStats(
    { exp: 40, level: 1, hp: 20, mp: 2, ap: 3, expToNext: 100 },
    { newXp: 80, currentLevel: 1 },
  );
  assert.equal(combatLow.hp, 60);
  assert.equal(combatLow.mp, 5);
  assert.equal(combatLow.ap, 6);

  const leftoverHigh = mergeVictoryRewardLiveStats(
    { exp: 40, level: 1, hp: 80, mp: 8, ap: 7, expToNext: 100 },
    { newXp: 80, currentLevel: 2 },
  );
  assert.equal(leftoverHigh.hp, 80);
  assert.equal(leftoverHigh.mp, 8);
  assert.equal(leftoverHigh.ap, 7);
  assert.equal(leftoverHigh.level, 2);
  assert.equal(leftoverHigh.expToNext, 200);
}

// Win/claim persist is still on the lock. Recap overlay does not block the
// map, so lava death applies 40% to the pre-credit UI. The queued write
// penalizes the post-credit committed wallet. Raising UI prevents
// hydrateWhenIdle from copying the under-count over committed.
{
  const lock = createProgressPersist({ doka: 1000, xp: 100, level: 4 });
  let uiDoka = 1000;
  let uiXp = 100;

  const credit = lock.enqueue(async () => {
    lock.commit({
      doka: committedDokaAfterAchievementCredit(lock.snapshot().doka, 500),
      xp: lock.snapshot().xp + 80,
    });
  });

  const optimistic = computeDeathPenalty(uiXp, uiDoka);
  uiDoka = optimistic.newDoka;
  uiXp = optimistic.newXp;
  assert.equal(uiDoka, 600);
  assert.equal(uiXp, 80);

  const death = lock.enqueue(async () => {
    const after = computeDeathPenalty(lock.snapshot().xp, lock.snapshot().doka);
    lock.commit({ doka: after.newDoka, xp: after.newXp });
    uiDoka = raiseUiAfterDeathPersist(uiDoka, after.newDoka);
    uiXp = raiseUiAfterDeathPersist(uiXp, after.newXp);
  });

  await Promise.all([credit, death]);
  assert.equal(uiDoka, 900);
  assert.equal(uiXp, 144);
  assert.equal(lock.snapshot().doka, 900);
  assert.equal(lock.snapshot().xp, 144);

  lock.hydrateWhenIdle({ doka: uiDoka, xp: uiXp, level: 4 });
  assert.equal(lock.snapshot().doka, 900);
  assert.equal(lock.snapshot().xp, 144);
}

{
  // Optimistic death used to call onDokaBalanceChange(120) and leave
  // dokaBalanceRef at 200. raiseUi(200, 180) then kept the pre-death ghost
  // and the next heal spent from 200. Snap the live wallet to the written
  // penalty instead of raising an uncut ref.
  const uncutRef = 200;
  const persisted = 180;
  assert.equal(raiseUiAfterDeathPersist(uncutRef, persisted), uncutRef);
  assert.equal(persisted, 180);
}

// Portal applyRewards hydrates absolute XP after await. Lava on the new
// map can land while that persist is in flight. Restoring the pre-penalty
// snapshot lets raiseUi keep the unpenalized UI; an idle hydrate then
// copies it over committed and refunds the death penalty.
{
  const lock = createProgressPersist({ doka: 1000, xp: 10000, level: 4 });
  let uiXp = 10010;
  let uiDoka = 1000;
  let deathTriggered = false;

  const portal = lock.enqueue(async () => {
    lock.commit({ xp: 10010 });
  });

  const optimistic = computeDeathPenalty(uiXp, uiDoka);
  uiXp = optimistic.newXp;
  uiDoka = optimistic.newDoka;
  deathTriggered = true;
  assert.equal(uiXp, 8008);

  const death = lock.enqueue(async () => {
    const after = computeDeathPenalty(lock.snapshot().xp, lock.snapshot().doka);
    lock.commit({ doka: after.newDoka, xp: after.newXp });
    uiDoka = raiseUiAfterDeathPersist(uiDoka, after.newDoka);
    uiXp = raiseUiAfterDeathPersist(uiXp, after.newXp);
  });

  await portal;
  if (shouldApplyVictoryLiveHydrate(deathTriggered)) {
    uiXp = 10010;
  }
  await death;

  assert.equal(uiXp, 8008);
  assert.equal(lock.snapshot().xp, 8008);

  lock.hydrateWhenIdle({ doka: uiDoka, xp: uiXp, level: 4 });
  assert.equal(lock.snapshot().xp, 8008);
}

// persistRoomClear + applyRewards share the lock. Death waits, penalizes
// the post-credit snapshot, and an idle hydrate cannot wipe the grant.
{
  const lock = createProgressPersist({ doka: 1000, xp: 10000, level: 4 });
  let uiDoka = 1200;
  let uiXp = 10080;
  let releaseClear!: () => void;
  const clearGate = new Promise<void>((resolve) => {
    releaseClear = resolve;
  });

  const roomClear = persistBossRushRewardsThroughLock(
    lock,
    async () => {
      await clearGate;
    },
    async () => {
      lock.commit({ doka: 1200, xp: 10080 });
      return { doka: 1200, xp: 10080 };
    },
  );

  const optimistic = computeDeathPenalty(uiXp, uiDoka);
  uiDoka = optimistic.newDoka;
  uiXp = optimistic.newXp;
  const death = lock.enqueue(async () => {
    const after = computeDeathPenalty(lock.snapshot().xp, lock.snapshot().doka);
    lock.commit({ doka: after.newDoka, xp: after.newXp });
    uiDoka = raiseUiAfterDeathPersist(uiDoka, after.newDoka);
    uiXp = raiseUiAfterDeathPersist(uiXp, after.newXp);
  });

  releaseClear();
  await Promise.all([roomClear, death]);
  assert.equal(uiDoka, 720);
  assert.equal(uiXp, 8064);
  assert.equal(lock.snapshot().doka, 720);
  assert.equal(lock.snapshot().xp, 8064);

  lock.hydrateWhenIdle({ doka: uiDoka, xp: uiXp, level: 4 });
  assert.equal(lock.snapshot().doka, 720);
  assert.equal(lock.snapshot().xp, 8064);
}

// Victory applyRewards levels the character, then lava death skips the live
// UI hydrate. Death persist writes the committed (post-level) snapshot, but
// the hydrate effect still sees UI level 4. Idle hydrate must not let the
// next saveBattleStats downgrade the canister.
{
  const lock = createProgressPersist({ doka: 1000, xp: 80, level: 4 });
  let uiDoka = 1000;
  let uiXp = 80;
  let uiLevel = 4;

  const victory = lock.enqueue(async () => {
    lock.commit({ doka: 1200, xp: 30, level: 5 });
  });

  const optimistic = computeDeathPenalty(uiXp, uiDoka);
  uiDoka = optimistic.newDoka;
  uiXp = optimistic.newXp;
  const deathTriggered = true;
  const death = lock.enqueue(async () => {
    const committed = lock.snapshot();
    const after = computeDeathPenalty(committed.xp, committed.doka);
    lock.commit({
      doka: after.newDoka,
      xp: after.newXp,
      level: committed.level,
    });
    uiDoka = raiseUiAfterDeathPersist(uiDoka, after.newDoka);
    uiXp = xpAfterDeathPersist({
      uiXp,
      uiLevel,
      persistedXp: after.newXp,
      persistedLevel: committed.level,
    });
    uiLevel = raiseUiAfterDeathPersist(uiLevel, committed.level);
  });

  await victory;
  if (shouldApplyVictoryLiveHydrate(deathTriggered)) {
    uiLevel = 5;
    uiXp = 30;
  }
  await death;

  assert.equal(uiLevel, 5);
  assert.equal(uiXp, 24);
  assert.equal(lock.snapshot().level, 5);
  assert.equal(lock.snapshot().doka, 720);
  assert.equal(lock.snapshot().xp, 24);

  // Even if the hydrate effect still sees the pre-level leftover, committed
  // XP/level must stay at the post-level penalty so the next heal cannot
  // refund the death cut.
  lock.hydrateWhenIdle({ doka: uiDoka, xp: 64, level: 4 });
  assert.equal(lock.snapshot().level, 5);
  assert.equal(lock.snapshot().xp, 24);
}

// WorldExploration mounts with GameFlow's placeholder doka=0 while
// getCallerDokaBalance is still in flight. Idle hydrate used to copy that
// 0 into committed; lava death then persistAbsoluteStats(newDoka=0).
{
  const lock = createProgressPersist({ doka: 0, xp: 100, level: 4 });
  lock.hydrateWhenIdle({ doka: 0, xp: 100, level: 4 });
  assert.equal(lock.isWalletSeeded(), false);

  const wiped = computeDeathPenalty(lock.snapshot().xp, lock.snapshot().doka);
  assert.equal(wiped.newDoka, 0, "unseeded committed.doka=0 would wipe");

  const dokaBase = await resolveCommittedDokaForAbsoluteWrite(
    lock,
    async () => 500,
  );
  const after = computeDeathPenalty(lock.snapshot().xp, dokaBase ?? 0);
  assert.equal(dokaBase, 500);
  assert.equal(after.newDoka, 300);
  assert.equal(after.dokaLost, 200);
  lock.commit({ doka: after.newDoka, xp: after.newXp });
  assert.equal(lock.snapshot().doka, 300);
}

// Death Realm re-arms deathTriggered after 1.5s. A still-in-flight
// applyRewards must not hydrate just because the flag flipped back.
{
  const lock = createProgressPersist({ doka: 1000, xp: 10000, level: 4 });
  let uiXp = 10000;
  let uiDoka = 1000;
  let deathTriggered = false;
  let deathEpoch = 0;
  const epochAtStart = deathEpoch;

  const victory = lock.enqueue(async () => {
    lock.commit({ doka: 1500, xp: 10500 });
  });

  const optimistic = computeDeathPenalty(uiXp, uiDoka);
  uiXp = optimistic.newXp;
  uiDoka = optimistic.newDoka;
  deathTriggered = true;
  deathEpoch += 1;
  const death = lock.enqueue(async () => {
    const after = computeDeathPenalty(lock.snapshot().xp, lock.snapshot().doka);
    lock.commit({ doka: after.newDoka, xp: after.newXp });
    uiDoka = raiseUiAfterDeathPersist(uiDoka, after.newDoka);
    uiXp = raiseUiAfterDeathPersist(uiXp, after.newXp);
  });

  deathTriggered = false;
  await victory;
  if (shouldApplyVictoryLiveHydrate(deathTriggered, epochAtStart, deathEpoch)) {
    uiXp = 10500;
    uiDoka = 1500;
  }
  await death;

  assert.equal(uiXp, 8400);
  assert.equal(uiDoka, 900);
  assert.equal(lock.snapshot().xp, 8400);
  assert.equal(lock.snapshot().doka, 900);
}

{
  let attempts = 0;
  const result = await persistWithRetry(async () => {
    attempts += 1;
    if (attempts < 3) throw new Error("replica reject");
    return "ok";
  }, 3);
  assert.equal(result, "ok");
  assert.equal(attempts, 3);
}

{
  let attempts = 0;
  await assert.rejects(
    persistWithRetry(async () => {
      attempts += 1;
      throw new Error("still down");
    }, 2),
    /still down/,
  );
  assert.equal(attempts, 2);
}

{
  const storage = new Map<string, string>();
  const mem: import("./deathPenalty.ts").DeathPenaltyStorage = {
    getItem: (k) => storage.get(k) ?? null,
    setItem: (k, v) => {
      storage.set(k, v);
    },
    removeItem: (k) => {
      storage.delete(k);
    },
  };
  const pending = {
    slot: 1,
    preXp: 100,
    preDoka: 200,
    afterXp: 80,
    afterDoka: 120,
  };
  writePendingDeathPenalty(mem, pending);
  assert.deepEqual(readPendingDeathPenalty(mem, 1), pending);
  assert.deepEqual(
    resolvePendingDeathReplay(100, 200, pending),
    { action: "write", newXp: 80, newDoka: 120 },
    "reload before persist must replay the 20/40 cut",
  );
  assert.deepEqual(resolvePendingDeathReplay(80, 120, pending), {
    action: "clear",
  });
  assert.deepEqual(
    resolvePendingDeathReplay(110, 200, pending),
    { action: "write", newXp: 90, newDoka: 120 },
    "portal +10 after a failed persist must keep the 20/40 cut",
  );
  assert.deepEqual(
    resolvePendingDeathReplay(100, 250, pending),
    { action: "write", newXp: 80, newDoka: 170 },
    "ground Doka after a failed persist must keep the 20/40 cut",
  );
  assert.deepEqual(
    resolvePendingDeathReplay(150, 250, pending),
    { action: "write", newXp: 130, newDoka: 170 },
    "victory credit after a failed persist is unpaid, not a later earn",
  );
  assert.deepEqual(
    resolvePendingDeathReplay(150, 250, { ...pending, cutConfirmed: true }),
    { action: "clear" },
    "a later earn after the replica accepted the cut must not be penalized again",
  );
  assert.deepEqual(
    resolvePendingDeathReplay(110, 200, pending),
    { action: "write", newXp: 90, newDoka: 120 },
    "portal +10 landing before death persist must apply the original unpaid cut",
  );
  assert.deepEqual(
    resolvePendingDeathReplay(100, 250, pending),
    { action: "write", newXp: 80, newDoka: 170 },
    "Doka-only credit landing before death persist must apply the original unpaid cut",
  );
  const sessionPending = {
    slot: 1,
    preXp: 80,
    preDoka: 200,
    afterXp: 64,
    afterDoka: 120,
  };
  assert.equal(experienceFromCharacterRecord({ experience: 80n }), 80);
  assert.equal(experienceFromCharacterRecord({ experience: 80 }), 80);
  assert.equal(experienceFromCharacterRecord(null), null);
  assert.deepEqual(
    resolvePendingDeathReplay(50, 200, sessionPending),
    { action: "write", newXp: 50, newDoka: 120 },
    "XP already below the cut still owes the unpaid Doka 40%",
  );
  assert.deepEqual(
    resolvePendingDeathReplay(
      experienceFromCharacterRecord({ experience: 80n }) ?? -1,
      200,
      sessionPending,
    ),
    { action: "write", newXp: 64, newDoka: 120 },
    "getCharacter XP must replay the 20/40 cut",
  );
  clearPendingDeathPenalty(mem, 1);
  assert.equal(readPendingDeathPenalty(mem, 1), null);
}

{
  assert.equal(experienceFromCharacterRecord({ experience: 100 }), 100);
  assert.equal(experienceFromCharacterRecord({ experience: 80n }), 80);
  assert.equal(
    Number.isFinite(experienceFromCharacterRecord(null)),
    false,
    "missing character must not look like a persisted leftover",
  );
  assert.equal(Number.isFinite(experienceFromCharacterRecord({})), false);

  const pending = {
    slot: 1,
    preXp: 100,
    preDoka: 200,
    afterXp: 80,
    afterDoka: 120,
  };
  // Canister XP already shows the 20% cut; Doka is still pre-penalty.
  // Clearing here used to drop the unpaid 40% Doka cut.
  assert.deepEqual(
    resolvePendingDeathReplay(80, 200, pending),
    { action: "write", newXp: 80, newDoka: 120 },
    "asymmetric pre-Doka after an XP cut must still write the 40% Doka cut",
  );
  const snap = await readDeathReplayBackendSnapshot({
    fetchDoka: async () => 200,
    fetchCharacter: async () => ({ experience: 100 }),
  });
  assert.deepEqual(snap, { xp: 100, doka: 200 });
  assert.deepEqual(
    resolvePendingDeathReplay(snap!.xp, snap!.doka, pending),
    { action: "write", newXp: 80, newDoka: 120 },
    "canister XP+Doka still at the pre-penalty snapshot must replay",
  );
  const incomplete = await readDeathReplayBackendSnapshot({
    fetchDoka: async () => 200,
    fetchCharacter: async () => null,
  });
  assert.equal(incomplete, null, "do not clear pending when XP fetch misses");
}

{
  const pending = {
    slot: 1,
    preXp: 100,
    preDoka: 200,
    afterXp: 80,
    afterDoka: 120,
  };
  assert.deepEqual(
    applyUnpaidDeathPenaltyToWrite(pending, 100, 200),
    { xp: 80, doka: 120 },
    "unpenalized snapshot still takes the 20/40 cut",
  );
  assert.deepEqual(
    applyUnpaidDeathPenaltyToWrite(pending, 100, 190),
    { xp: 80, doka: 110 },
    "heal spend after a failed persist must not wipe the unpaid cut",
  );
  assert.deepEqual(
    applyUnpaidDeathPenaltyToWrite(pending, 80, 120),
    { xp: 80, doka: 120 },
    "already-penalized write must not be cut twice",
  );
  assert.deepEqual(
    applyUnpaidDeathPenaltyToWrite(pending, 110, 200),
    { xp: 90, doka: 120 },
    "portal +10 on an uncut wallet is after + credit, not a waived cut",
  );
  assert.deepEqual(
    applyUnpaidDeathPenaltyToWrite(pending, 100, 250),
    { xp: 80, doka: 170 },
    "ground Doka on an uncut wallet is after + credit, not a waived cut",
  );
  assert.deepEqual(
    resolvePendingDeathReplay(100, 190, pending),
    { action: "write", newXp: 80, newDoka: 110 },
    "reload after a recap heal must still land the 20/40 cut",
  );
}

{
  const storage = new Map<string, string>();
  const mem: import("./deathPenalty.ts").DeathPenaltyStorage = {
    getItem: (k) => storage.get(k) ?? null,
    setItem: (k, v) => {
      storage.set(k, v);
    },
    removeItem: (k) => {
      storage.delete(k);
    },
  };
  const pending = {
    slot: 2,
    preXp: 100,
    preDoka: 200,
    afterXp: 80,
    afterDoka: 120,
  };
  writePendingDeathPenalty(mem, pending);
  const lock = createProgressPersist({ doka: 200, xp: 100, level: 4 });
  let backendXp = 100;
  let backendDoka = 200;
  const flushed = await flushPendingDeathPenalty({
    storage: mem,
    slot: 2,
    persist: lock,
    fetchSnapshot: async () => ({ xp: backendXp, doka: backendDoka }),
    writePenalty: async (newXp, newDoka) => {
      backendXp = newXp;
      backendDoka = newDoka;
    },
  });
  assert.equal(flushed, true);
  assert.equal(backendXp, 80);
  assert.equal(backendDoka, 120);
  assert.equal(lock.snapshot().xp, 80);
  assert.equal(lock.snapshot().doka, 120);
  assert.equal(readPendingDeathPenalty(mem, 2), null);

  // Next applyRewards must add onto the cut canister, not the pre-death wallet.
  backendDoka += 50;
  lock.commit({ doka: backendDoka, xp: backendXp + 40 });
  assert.equal(lock.snapshot().doka, 170);
  assert.equal(backendDoka, 170);
}

{
  const storage = new Map<string, string>();
  const mem: import("./deathPenalty.ts").DeathPenaltyStorage = {
    getItem: (k) => storage.get(k) ?? null,
    setItem: (k, v) => {
      storage.set(k, v);
    },
    removeItem: (k) => {
      storage.delete(k);
    },
  };
  const pending = {
    slot: 1,
    preXp: 100,
    preDoka: 200,
    afterXp: 80,
    afterDoka: 120,
  };
  writePendingDeathPenalty(mem, pending);
  const lock = createProgressPersist({ doka: 200, xp: 100, level: 4 });
  let backendXp = 110;
  let backendDoka = 200;
  const flushed = await flushPendingDeathPenalty({
    storage: mem,
    slot: 1,
    persist: lock,
    fetchSnapshot: async () => ({ xp: backendXp, doka: backendDoka }),
    writePenalty: async (newXp, newDoka) => {
      backendXp = newXp;
      backendDoka = newDoka;
    },
  });
  assert.equal(flushed, true, "portal +10 must not clear an unpaid death cut");
  assert.equal(backendXp, 90);
  assert.equal(backendDoka, 120);
  assert.equal(lock.snapshot().xp, 90);
  assert.equal(lock.snapshot().doka, 120);
  assert.equal(readPendingDeathPenalty(mem, 1), null);

  writePendingDeathPenalty(mem, pending);
  confirmPendingDeathPenalty(mem, pending);
  const confirmed = readPendingDeathPenalty(mem, 1);
  assert.equal(confirmed?.cutConfirmed, true);
  assert.deepEqual(
    resolvePendingDeathReplay(110, 200, confirmed!),
    { action: "clear" },
    "cutConfirmed + portal credit must not apply a second 20/40",
  );
}

{
  const storage = new Map<string, string>();
  const mem: import("./deathPenalty.ts").DeathPenaltyStorage = {
    getItem: (k) => storage.get(k) ?? null,
    setItem: (k, v) => {
      storage.set(k, v);
    },
    removeItem: (k) => {
      storage.delete(k);
    },
  };
  writePendingDeathPenalty(mem, {
    slot: 1,
    preXp: 100,
    preDoka: 200,
    afterXp: 80,
    afterDoka: 120,
  });
  const lock = createProgressPersist({ doka: 200, xp: 100, level: 4 });
  let backendXp = 100;
  let backendDoka = 200;

  // Death persist fails after 3 retries. Lock is still cut so a heal
  // cannot write the unpenalized snapshot.
  let writes = 0;
  await assert.rejects(
    persistWithRetry(async () => {
      writes += 1;
      throw new Error("replica reject");
    }, 3),
    /replica reject/,
  );
  assert.equal(writes, 3);
  const after = computeDeathPenalty(100, 200);
  lock.commit({ doka: after.newDoka, xp: after.newXp });
  const healSpend = 10;
  const honoured = applyUnpaidDeathPenaltyToWrite(
    readPendingDeathPenalty(mem, 1)!,
    lock.snapshot().xp,
    lock.snapshot().doka - healSpend,
  );
  backendXp = honoured.xp;
  backendDoka = honoured.doka;
  assert.equal(backendXp, 80);
  assert.equal(backendDoka, 110);
  assert.notEqual(
    backendDoka,
    190,
    "heal must not persist unpenalized 200-10 and drop the pending marker",
  );
}

function memStorage(): import("./deathPenalty.ts").DeathPenaltyStorage {
  const storage = new Map<string, string>();
  return {
    getItem: (k) => storage.get(k) ?? null,
    setItem: (k, v) => {
      storage.set(k, v);
    },
    removeItem: (k) => {
      storage.delete(k);
    },
  };
}

{
  // Tab close used to drop sessionStorage, so reload never replayed the
  // 20/40 cut. New writes go to localStorage (primary). An older same-tab
  // marker still sitting in sessionStorage must still be found.
  const local = memStorage();
  const session = memStorage();
  const pending = {
    slot: 1,
    preXp: 100,
    preDoka: 200,
    afterXp: 80,
    afterDoka: 120,
  };

  writePendingDeathPenalty(session, pending);
  assert.equal(
    readPendingDeathPenalty(local, 1),
    null,
    "tab close empties sessionStorage; primary localStorage starts empty",
  );
  assert.deepEqual(
    readPendingDeathPenaltyAnywhere(1, local, session),
    pending,
    "legacy sessionStorage marker must still replay after upgrade",
  );

  writePendingDeathPenalty(local, pending);
  assert.deepEqual(
    readPendingDeathPenaltyAnywhere(1, local, memStorage()),
    pending,
    "localStorage marker must survive a closed tab (empty session)",
  );

  clearPendingDeathPenaltyAnywhere(1, local, session);
  assert.equal(readPendingDeathPenalty(local, 1), null);
  assert.equal(readPendingDeathPenalty(session, 1), null);
  assert.equal(readPendingDeathPenaltyAnywhere(1, local, session), null);
}

console.log("deathPenalty.test: ok");
