import assert from "node:assert/strict";
import {
  applySpendToCommitted,
  createProgressPersist,
  resolveCommittedDokaForAbsoluteWrite,
  spendFromUiBalance,
} from "./progressPersist.ts";
import {
  buildInitiatePurchaseArgs,
  committedDokaAfterGameKeyRedeem,
  committedDokaAfterShopCreditOnLock,
  creditPendingPurchases,
  creditPendingPurchasesThroughPersist,
  creditedDokaDelta,
  dokaGainedFromGameKeyRedeem,
  readCallerDokaBalance,
  readInitiatePurchaseResult,
  readRedeemGameKeyResult,
  redeemGameKeyThroughPersist,
  shopCreditUsesBattleTimeoutSet,
  shouldCommitGameKeyRedeem,
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

  assert.deepEqual(readRedeemGameKeyResult({ __kind__: "ok", ok: 1000n }), {
    ok: 1000,
  });
  assert.deepEqual(
    readRedeemGameKeyResult({ __kind__: "err", err: "GameKey already used" }),
    { err: "GameKey already used" },
  );
  assert.equal(readRedeemGameKeyResult({ __kind__: "ok" }).err != null, true);
  assert.equal(committedDokaAfterGameKeyRedeem(200, 1000), 1200);
  assert.equal(shouldCommitGameKeyRedeem(true, 1000), true);
  assert.equal(
    shouldCommitGameKeyRedeem(false, 1000),
    false,
    "unseeded placeholder must not seed at grant-only",
  );
  assert.equal(shouldCommitGameKeyRedeem(true, 0), false);
  assert.equal(dokaGainedFromGameKeyRedeem({ ok: 1000 }), 1000);
  assert.equal(dokaGainedFromGameKeyRedeem({ err: "GameKey already used" }), 0);

  {
    let backendDoka = 200;
    const used = new Set<string>();
    const actor = {
      redeemGameKey: async (code: string) => {
        if (code.length !== 120) {
          return { __kind__: "err" as const, err: "GameKey is too short" };
        }
        if (used.has(code)) {
          return { __kind__: "err" as const, err: "GameKey already used" };
        }
        used.add(code);
        backendDoka += 1000;
        return { __kind__: "ok" as const, ok: 1000n };
      },
      getCallerDokaBalance: async () => backendDoka,
    };
    const valid = "A".repeat(120);
    const lock = createProgressPersist({ doka: 200, xp: 50, level: 4 });
    const first = await redeemGameKeyThroughPersist(actor, lock, valid);
    assert.deepEqual(first.result, { ok: 1000 });
    assert.equal(lock.snapshot().doka, 1200);
    const second = await redeemGameKeyThroughPersist(actor, lock, valid);
    assert.deepEqual(second.result, { err: "GameKey already used" });
    assert.equal(lock.snapshot().doka, 1200);
    const invalid = await redeemGameKeyThroughPersist(actor, lock, "short");
    assert.equal("err" in invalid.result, true);
    assert.equal(lock.snapshot().doka, 1200);
    const notApproved = await redeemGameKeyThroughPersist(
      {
        redeemGameKey: async () => ({
          __kind__: "err" as const,
          err: "GameKey is not yet approved",
        }),
        getCallerDokaBalance: async () => backendDoka,
      },
      lock,
      valid,
    );
    assert.deepEqual(notApproved.result, {
      err: "GameKey is not yet approved",
    });
    assert.equal(lock.snapshot().doka, 1200);
  }

  {
    const lock = createProgressPersist({ doka: 200, xp: 50, level: 4 });
    lock.commit({ doka: 170 });
    await redeemGameKeyThroughPersist(
      {
        redeemGameKey: async () => ({
          __kind__: "err",
          err: "Invalid GameKey",
        }),
        getCallerDokaBalance: async () => 200n,
      },
      lock,
      "A".repeat(120),
    );
    assert.equal(
      lock.snapshot().doka,
      170,
      "failed redeem must not commit a stale wallet snapshot",
    );
  }

  {
    // Chronology: redeem #ok(1000), then a recap heal saveBattleStats.
    // A stale getCallerDokaBalance (always the pre-redeem 200) used to skip
    // the persist-lock commit. The heal then wrote 170 and wiped the paid
    // 1000. Commit from #ok so the spend applies to 1200.
    let backendDoka = 200;
    const staleActor = {
      redeemGameKey: async () => {
        backendDoka += 1000;
        return { __kind__: "ok" as const, ok: 1000n };
      },
      getCallerDokaBalance: async () => 200n,
    };
    const lock = createProgressPersist({ doka: 200, xp: 50, level: 4 });
    const redeemed = await redeemGameKeyThroughPersist(
      staleActor,
      lock,
      "A".repeat(120),
    );
    assert.deepEqual(redeemed.result, { ok: 1000 });
    assert.equal(dokaGainedFromGameKeyRedeem(redeemed.result), 1000);
    assert.equal(
      lock.snapshot().doka,
      1200,
      "stale wallet query must not skip the #ok credit",
    );
    const spend = spendFromUiBalance(200, 170);
    const wroteDoka = applySpendToCommitted(lock.snapshot().doka, spend);
    backendDoka = wroteDoka;
    lock.commit({ doka: wroteDoka });
    assert.equal(wroteDoka, 1170);
    assert.equal(backendDoka, 1170);
    assert.equal(lock.snapshot().doka, 1170);
  }

  {
    const throwingActor = {
      redeemGameKey: async () => ({ __kind__: "ok" as const, ok: 1000n }),
      getCallerDokaBalance: async () => {
        throw new Error("query replica unavailable");
      },
    };
    const lock = createProgressPersist({ doka: 200, xp: 50, level: 4 });
    const redeemed = await redeemGameKeyThroughPersist(
      throwingActor,
      lock,
      "A".repeat(120),
    );
    assert.deepEqual(redeemed.result, { ok: 1000 });
    assert.equal(
      lock.snapshot().doka,
      1200,
      "a throwing wallet query after #ok must not abort the lock commit",
    );
  }

  {
    const unseeded = createProgressPersist({ doka: 0, xp: 0, level: 1 });
    assert.equal(unseeded.isWalletSeeded(), false);
    await redeemGameKeyThroughPersist(
      {
        redeemGameKey: async () => ({ __kind__: "ok" as const, ok: 1000n }),
      },
      unseeded,
      "A".repeat(120),
    );
    assert.equal(unseeded.isWalletSeeded(), false);
    assert.equal(
      unseeded.snapshot().doka,
      0,
      "grant-only must not seed the placeholder lock",
    );
    // Query that started before redeem returns the pre-credit wallet.
    // Seeding from it used to skip resolveCommittedDokaForAbsoluteWrite
    // so the recap heal wrote 200 and wiped the paid 1000.
    unseeded.hydrateWhenIdle(
      { doka: 200, xp: 0, level: 1 },
      { walletReady: true },
    );
    assert.equal(unseeded.isWalletSeeded(), false);
    assert.equal(unseeded.snapshot().doka, 0);
    const fetched = await resolveCommittedDokaForAbsoluteWrite(
      unseeded,
      async () => 1200,
    );
    assert.equal(fetched, 1200);
    const spend = spendFromUiBalance(1200, 1170);
    const wroteDoka = applySpendToCommitted(unseeded.snapshot().doka, spend);
    assert.equal(wroteDoka, 1170);
  }

  console.log("shopPurchase.test: ok");
})();
