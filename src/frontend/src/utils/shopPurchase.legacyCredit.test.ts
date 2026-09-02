import assert from "node:assert/strict";
import { createProgressPersist } from "./progressPersist.ts";
import {
  creditPendingPurchasesThroughPersist,
  readProcessPendingPurchasesMinted,
  shouldCommitLegacyPurchaseCredit,
} from "./shopPurchase.ts";

assert.equal(readProcessPendingPurchasesMinted(500n), 500);
assert.equal(readProcessPendingPurchasesMinted(0n), 0);
assert.equal(shouldCommitLegacyPurchaseCredit(500, 500), true);
assert.equal(
  shouldCommitLegacyPurchaseCredit(0, 30),
  false,
  "no-op processPendingPurchases must not treat query jitter as a shop gain",
);

void (async () => {
  const lock = createProgressPersist({ doka: 200, xp: 50, level: 4 });
  lock.commit({ doka: 170 });
  let reads = 0;
  await creditPendingPurchasesThroughPersist(
    {
      processPendingPurchases: async () => 0n,
      getCallerDokaBalance: async () => {
        reads += 1;
        return reads === 1 ? 170n : 200n;
      },
    },
    lock,
  );
  assert.equal(reads, 2);
  assert.equal(
    lock.snapshot().doka,
    170,
    "no-op processPendingPurchases must not commit query jitter as a credit",
  );

  console.log("shopPurchase.legacyCredit.test: ok");
})();
