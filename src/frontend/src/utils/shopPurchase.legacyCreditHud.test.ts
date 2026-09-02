import assert from "node:assert/strict";
import {
  legacyPurchaseCreditForHud,
  legacyPurchaseMintedAmount,
} from "./legacyPurchaseCredit.ts";
import {
  applySpendToCommitted,
  createProgressPersist,
  spendFromUiBalance,
} from "./progressPersist.ts";
import {
  creditPendingPurchases,
  creditPendingPurchasesThroughPersist,
  creditedDokaDelta,
} from "./shopPurchase.ts";

assert.equal(legacyPurchaseMintedAmount(500n), 500);
assert.equal(legacyPurchaseMintedAmount(0n), 0);
assert.deepEqual(
  legacyPurchaseCreditForHud(0, { previous: 170, credited: 200 }),
  { previous: 170, credited: 170 },
  "HUD must not see query jitter as a shop gain",
);
assert.equal(creditedDokaDelta(170, 170), 0);
assert.deepEqual(
  legacyPurchaseCreditForHud(500, { previous: 150, credited: 650 }),
  { previous: 150, credited: 650 },
);
assert.deepEqual(
  legacyPurchaseCreditForHud(0, { previous: null, credited: 200 }),
  { previous: null, credited: null },
);

void (async () => {
  const lock = createProgressPersist({ doka: 200, xp: 50, level: 4 });
  lock.commit({ doka: 170 });
  let reads = 0;
  const hud = await creditPendingPurchasesThroughPersist(
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
  assert.deepEqual(
    hud,
    { previous: 170, credited: 170 },
    "WorldExploration must not credit dokaBalanceRef from remount query jitter",
  );
  assert.equal(creditedDokaDelta(hud.previous, hud.credited), 0);

  const raw = await creditPendingPurchases({
    processPendingPurchases: async () => 0n,
    getCallerDokaBalance: async () => {
      return 200n;
    },
  });
  assert.deepEqual(raw, { previous: 200, credited: 200 });

  const ghostGain = creditedDokaDelta(170, 200);
  assert.equal(ghostGain, 30);
  const fromLock = applySpendToCommitted(lock.snapshot().doka, 30);
  const fromHud = spendFromUiBalance(200, 170);
  assert.equal(fromHud, 30);
  assert.equal(
    fromLock,
    140,
    "ghost HUD spend would drain the real lock below the post-heal wallet",
  );
  assert.equal(
    creditedDokaDelta(hud.previous, hud.credited),
    0,
    "sanitized pair must not produce that spend",
  );

  console.log("shopPurchase.legacyCreditHud.test: ok");
})();
