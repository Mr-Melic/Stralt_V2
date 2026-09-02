import assert from "node:assert/strict";
import {
  applySpendToCommitted,
  createProgressPersist,
  spendFromUiBalance,
} from "./progressPersist.ts";
import {
  buildInitiatePurchaseArgs,
  committedDokaAfterShopCreditOnLock,
  creditPendingPurchases,
  creditPendingPurchasesThroughPersist,
  creditedDokaDelta,
  readCallerDokaBalance,
  readInitiatePurchaseResult,
  shopCreditUsesBattleTimeoutSet,
  shouldCommitShopCredit,
  shouldStartShopPurchase,
} from "./shopPurchase.ts";

const args = buildInitiatePurchaseArgs(
  "pkg_500",
  {
    firstName: "  Ada  ",
    lastName: "Lovelace",
    email: "ada@example.com",
    address: "12 Analytical Engine Rd",
    city: "London",
    country: "UK",
    postalCode: "SW1A 1AA",
  },
  "data:image/png;base64,abc",
);

assert.deepEqual(args, [
  "pkg_500",
  "Ada",
  "Lovelace",
  "ada@example.com",
  "12 Analytical Engine Rd",
  "London",
  "UK",
  "SW1A 1AA",
  "data:image/png;base64,abc",
]);
assert.equal(args.length, 9, "canister expects nine positional Text args");
assert.equal(
  typeof args[1],
  "string",
  "customerName must be a string, not an object",
);

assert.deepEqual(buildInitiatePurchaseArgs("pkg_1", {}, ""), [
  "pkg_1",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
]);

assert.deepEqual(readInitiatePurchaseResult({ __kind__: "ok", ok: "pur_1" }), {
  ok: "pur_1",
});
assert.deepEqual(readInitiatePurchaseResult({ ok: "pur_2" }), { ok: "pur_2" });
assert.deepEqual(
  readInitiatePurchaseResult({ __kind__: "err", err: "Account banned" }),
  { err: "Account banned" },
);
assert.equal(readInitiatePurchaseResult(undefined).err != null, true);
assert.equal(readInitiatePurchaseResult({ __kind__: "ok" }).err != null, true);

assert.equal(readCallerDokaBalance(1500n), 1500);
assert.equal(readCallerDokaBalance(42), 42);
assert.equal(readCallerDokaBalance(undefined), null);
assert.equal(readCallerDokaBalance(Number.NaN), null);

assert.equal(
  shopCreditUsesBattleTimeoutSet(),
  false,
  "cleanupBattle wipes pendingTimeoutsRef; shop credit must not live there",
);
assert.equal(shouldStartShopPurchase(false), true);
assert.equal(
  shouldStartShopPurchase(true),
  false,
  "double-click must not enqueue a second initiatePurchase",
);
assert.equal(creditedDokaDelta(100, 600), 500);
assert.equal(creditedDokaDelta(600, 600), 0);
assert.equal(creditedDokaDelta(null, 600), 0);
assert.equal(shouldCommitShopCredit(500), true);
assert.equal(shouldCommitShopCredit(0), false);
assert.equal(committedDokaAfterShopCreditOnLock(250, 750), 750);
assert.equal(
  committedDokaAfterShopCreditOnLock(750, 200),
  750,
  "stale pre-heal query must not cut a seeded lock",
);

void (async () => {
  let processed = 0;
  const actor = {
    processPendingPurchases: async () => {
      processed += 1;
      return 1n;
    },
    getCallerDokaBalance: async () => (processed === 0 ? 100n : 600n),
  };
  const result = await creditPendingPurchases(actor);
  assert.equal(processed, 1);
  assert.deepEqual(result, { previous: 100, credited: 600 });
  assert.equal(creditedDokaDelta(result.previous, result.credited), 500);

  const emptyActor = {
    processPendingPurchases: async () => 0n,
    getCallerDokaBalance: async () => undefined,
  };
  assert.deepEqual(await creditPendingPurchases(emptyActor), {
    previous: null,
    credited: null,
  });
  assert.deepEqual(await creditPendingPurchases({}), {
    previous: null,
    credited: null,
  });

  // Paid credit must serialize with saveBattleStats. If the 60s credit lands
  // while a heal is already queued, a lock-less write leaves committed at
  // 200 and persistAbsoluteProgress then overwrites the canister with 170.
  let backendDoka = 200;
  const lock = createProgressPersist({ doka: 200, xp: 50, level: 4 });
  const creditActor = {
    processPendingPurchases: async () => {
      backendDoka += 500;
      return 1n;
    },
    getCallerDokaBalance: async () => backendDoka,
  };
  const spend = spendFromUiBalance(200, 170);
  let wroteDoka = 0;
  const heal = lock.enqueue(async () => {
    wroteDoka = applySpendToCommitted(lock.snapshot().doka, spend);
    backendDoka = wroteDoka;
    lock.commit({ doka: wroteDoka });
  });
  const credit = creditPendingPurchasesThroughPersist(creditActor, lock);
  await Promise.all([heal, credit]);
  assert.equal(wroteDoka, 170);
  assert.equal(backendDoka, 670);
  assert.equal(lock.snapshot().doka, 670);

  backendDoka = 200;
  const lock2 = createProgressPersist({ doka: 200, xp: 50, level: 4 });
  const creditFirst = creditPendingPurchasesThroughPersist(
    {
      processPendingPurchases: async () => {
        backendDoka += 500;
        return 1n;
      },
      getCallerDokaBalance: async () => backendDoka,
    },
    lock2,
  );
  const healAfter = lock2.enqueue(async () => {
    wroteDoka = applySpendToCommitted(lock2.snapshot().doka, spend);
    backendDoka = wroteDoka;
    lock2.commit({ doka: wroteDoka });
  });
  await Promise.all([creditFirst, healAfter]);
  assert.equal(wroteDoka, 670);
  assert.equal(backendDoka, 670);
  assert.equal(lock2.snapshot().doka, 670);

  const persist = createProgressPersist({ doka: 100, xp: 0, level: 1 });
  let releaseReward!: () => void;
  const rewardGate = new Promise<void>((resolve) => {
    releaseReward = resolve;
  });
  const reward = persist.enqueue(async () => {
    await rewardGate;
    persist.commit({ doka: 150 });
  });
  let processedThroughPersist = 0;
  const queuedActor = {
    processPendingPurchases: async () => {
      processedThroughPersist += 1;
      return 1n;
    },
    getCallerDokaBalance: async () =>
      processedThroughPersist === 0 ? 150n : 650n,
  };
  const queued = creditPendingPurchasesThroughPersist(queuedActor, persist);
  releaseReward();
  await reward;
  assert.deepEqual(await queued, { previous: 150, credited: 650 });
  assert.equal(persist.snapshot().doka, 650);

  // 60s remount retry / no-op processPendingPurchases used to commit the
  // absolute query. A stale pre-heal 200 overwrites committed 170; the
  // next saveBattleStats refunds the spend.
  {
    const lock = createProgressPersist({ doka: 200, xp: 50, level: 4 });
    lock.commit({ doka: 170 });
    let reads = 0;
    await creditPendingPurchasesThroughPersist(
      {
        processPendingPurchases: async () => 0n,
        getCallerDokaBalance: async () => {
          reads += 1;
          return 200n;
        },
      },
      lock,
    );
    assert.equal(reads, 2);
    assert.equal(lock.snapshot().doka, 170);
  }

  console.log("shopPurchase.test: ok");
})();
