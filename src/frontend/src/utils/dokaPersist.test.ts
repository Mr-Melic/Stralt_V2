import assert from "node:assert/strict";
import {
  persistDokaCredit,
  persistDokaCreditAmount,
  persistDokaCreditResult,
  releaseFlag,
  releasePickupId,
  resolveOneShotCreditSettle,
  settleOneShotAfterCredit,
  shouldReleaseOneShotAfterPersist,
  shouldReleaseOneShotDokaCredit,
  tryClaimDungeonChainBonus,
  tryClaimFlag,
  tryClaimPickupId,
} from "./dokaPersist.ts";
import {
  applySpendToCommitted,
  createProgressPersist,
  resolveCommittedDokaForAbsoluteWrite,
} from "./progressPersist.ts";

{
  const claimed = new Set<string>();
  assert.equal(tryClaimPickupId(claimed, "doka-1-2"), true);
  assert.equal(tryClaimPickupId(claimed, "doka-1-2"), false);
  assert.equal(tryClaimPickupId(claimed, ""), false);
  releasePickupId(claimed, "doka-1-2");
  assert.equal(tryClaimPickupId(claimed, "doka-1-2"), true);
}

{
  const flag = { current: false };
  assert.equal(tryClaimFlag(flag), true);
  assert.equal(tryClaimFlag(flag), false);
  releaseFlag(flag);
  assert.equal(tryClaimFlag(flag), true);
}

{
  const claimed = { current: false };
  assert.equal(tryClaimDungeonChainBonus(claimed), true);
  assert.equal(
    tryClaimDungeonChainBonus(claimed),
    false,
    "same portal must not pay the chain bonus twice",
  );
}

{
  let calls = 0;
  const actor = {
    applyRewards: async () => {
      calls += 1;
      return { ok: { newDoka: 130n, newXp: 0n, newLevel: 1n } };
    },
  };
  const claimed = new Set<string>();
  assert.equal(tryClaimPickupId(claimed, "coin"), true);
  const first = persistDokaCredit(actor, 1, 30);
  assert.equal(tryClaimPickupId(claimed, "coin"), false);
  await first;
  assert.equal(calls, 1);
}

assert.equal(shouldReleaseOneShotAfterPersist(false), true);
assert.equal(shouldReleaseOneShotAfterPersist(true), false);

{
  const rejected = await persistDokaCreditResult(
    {
      applyRewards: async () => {
        throw new Error("applyRewards failed: Account banned");
      },
    },
    1,
    30,
  );
  assert.equal(shouldReleaseOneShotDokaCredit(rejected), true);
  assert.equal(settleOneShotAfterCredit(rejected), "release");
  assert.equal(persistDokaCreditAmount(rejected), 0);

  const transport = await persistDokaCreditResult(
    {
      applyRewards: async () => {
        throw new Error("replica reject after add");
      },
    },
    1,
    30,
  );
  assert.equal(shouldReleaseOneShotDokaCredit(transport), false);
  assert.equal(settleOneShotAfterCredit(transport), "keep");
  assert.equal(persistDokaCreditAmount(transport), 0);
}

{
  // Fix A (no remint after invoke) kept the claim. A later heal then
  // saveBattleStats-wrote the pre-credit lock and wiped the canister grant.
  const lock = createProgressPersist({ doka: 500, xp: 0, level: 1 });
  let canister = 500;
  const claimed = new Set<string>();
  assert.equal(tryClaimPickupId(claimed, "coin"), true);
  const transportAfterAdd = await persistDokaCreditResult(
    {
      applyRewards: async (_slot, doka) => {
        canister += Number(doka);
        throw new Error("replica reject after add");
      },
    },
    1,
    50,
  );
  assert.equal(settleOneShotAfterCredit(transportAfterAdd), "keep");
  assert.equal(canister, 550);
  assert.equal(claimed.has("coin"), true);

  const settled = await resolveOneShotCreditSettle(transportAfterAdd, {
    committedDoka: lock.snapshot().doka,
    walletSeeded: true,
    readWallet: async () => canister,
  });
  assert.equal(settled.kind, "commit");
  if (settled.kind !== "commit") throw new Error("expected commit");
  assert.equal(settled.doka, 550);
  lock.commit({ doka: settled.doka });

  const dokaBase = await resolveCommittedDokaForAbsoluteWrite(
    lock,
    async () => {
      throw new Error("seeded lock must not re-fetch");
    },
  );
  assert.equal(dokaBase, 550);
  const afterHeal = applySpendToCommitted(dokaBase ?? lock.snapshot().doka, 10);
  assert.equal(afterHeal, 540);
  assert.equal(
    tryClaimPickupId(claimed, "coin"),
    false,
    "keep must not remint the same pickup",
  );

  const rejectedKeep = await resolveOneShotCreditSettle(
    await persistDokaCreditResult(
      {
        applyRewards: async () => {
          throw new Error("replica reject after add");
        },
      },
      1,
      50,
    ),
    {
      committedDoka: 550,
      walletSeeded: true,
      readWallet: async () => 550,
    },
  );
  assert.deepEqual(rejectedKeep, { kind: "keep" });

  // Union with #312: confirm path must accept bigint wallet reads.
  const fromNat = await resolveOneShotCreditSettle(transportAfterAdd, {
    committedDoka: 500,
    walletSeeded: true,
    readWallet: async () => 550n,
  });
  assert.equal(fromNat.kind, "commit");
  if (fromNat.kind === "commit") assert.equal(fromNat.doka, 550);
}

{
  // Unseeded lock snapshot is 0. Transport-keep must NOT confirm just because
  // live wallet > 0 — WorldExploration credits the pickup on commit and would
  // mint ghost HUD Doka, then shop/heal over-spend against the real lock.
  const lock = createProgressPersist({ doka: 0, xp: 0, level: 1 });
  assert.equal(lock.isWalletSeeded(), false);
  const transportMiss = await persistDokaCreditResult(
    {
      applyRewards: async () => {
        throw new Error("replica reject before add");
      },
    },
    1,
    300,
  );
  assert.equal(settleOneShotAfterCredit(transportMiss), "keep");
  const settled = await resolveOneShotCreditSettle(transportMiss, {
    committedDoka: lock.snapshot().doka,
    walletSeeded: lock.isWalletSeeded(),
    readWallet: async () => 5000,
  });
  assert.deepEqual(
    settled,
    { kind: "keep" },
    "unseeded transport-keep must not false-commit live>0",
  );
}

console.log("dokaPersist.test: ok");
