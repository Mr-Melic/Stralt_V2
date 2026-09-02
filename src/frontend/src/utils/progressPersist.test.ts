import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyShopCreditDeltaToUi,
  applySpendToCommitted,
  clampAbsoluteProgressWrite,
  committedDokaAfterShopCredit,
  createProgressPersist,
  floorHydratedLevel,
  resolveCommittedDokaForAbsoluteWrite,
  resolveHydratedXp,
  shouldCopyIdleWalletDoka,
  spendFromUiBalance,
} from "./progressPersist.ts";

describe("spend math", () => {
  it("treats a UI heal/shop deduct as a non-negative spend", () => {
    assert.equal(spendFromUiBalance(200, 170), 30);
    assert.equal(spendFromUiBalance(0, 0), 0);
    assert.equal(spendFromUiBalance(10, 50), 0);
  });

  it("second click spends from the live wallet, not the render snapshot", () => {
    const live = { current: 200 };
    const firstNext = 150;
    const firstSpend = spendFromUiBalance(live.current, firstNext);
    live.current = firstNext;
    const secondNext = 100;
    const secondSpend = spendFromUiBalance(live.current, secondNext);
    live.current = secondNext;
    assert.equal(firstSpend, 50);
    assert.equal(secondSpend, 50);
    assert.equal(live.current, 100);
  });

  it("applies the spend to the last committed wallet", () => {
    assert.equal(applySpendToCommitted(250, 30), 220);
    assert.equal(applySpendToCommitted(10, 30), 0);
  });

  it("refuses absolute snapshot mints above the canister wallet/XP", () => {
    assert.equal(clampAbsoluteProgressWrite(50, 200), 50);
    assert.equal(clampAbsoluteProgressWrite(250, 200), 200);
    assert.equal(clampAbsoluteProgressWrite(0, 0), 0);
    assert.equal(clampAbsoluteProgressWrite(80, 100), 80);
  });
});

describe("progress persist lock", () => {
  it("does not hydrate while a write is in flight", () => {
    const lock = createProgressPersist({ doka: 200, xp: 50, level: 4 });
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    const pending = lock.enqueue(async () => {
      await gate;
    });

    assert.equal(lock.pendingCount(), 1);
    assert.equal(lock.hydrateWhenIdle({ doka: 1, xp: 1, level: 1 }), false);
    assert.deepEqual(lock.snapshot(), { doka: 200, xp: 50, level: 4 });

    release();
    return pending.then(() => {
      assert.equal(lock.pendingCount(), 0);
      // Seeded wallets ignore idle Doka. A higher HUD must not mint.
      assert.equal(lock.hydrateWhenIdle({ doka: 500, xp: 80, level: 5 }), true);
      assert.deepEqual(lock.snapshot(), { doka: 200, xp: 80, level: 5 });
    });
  });

  it("lets a post-victory heal persist against rewarded Doka/XP, not the click-time snapshot", async () => {
    const lock = createProgressPersist({ doka: 200, xp: 50, level: 4 });
    let backendDoka = 200;
    let backendXp = 50;
    let backendLevel = 4;

    let releaseReward!: () => void;
    const rewardGate = new Promise<void>((resolve) => {
      releaseReward = resolve;
    });

    const reward = lock.enqueue(async () => {
      await rewardGate;
      backendDoka += 50;
      backendXp += 80;
      backendLevel = 5;
      lock.commit({ doka: backendDoka, xp: backendXp, level: backendLevel });
    });

    // Player heals during the recap: local UI still shows 200, spend is 30.
    const spend = spendFromUiBalance(200, 170);
    let wroteDoka = 0;
    let wroteXp = 0;
    let wroteLevel = 0;
    const heal = lock.enqueue(async () => {
      const committed = lock.snapshot();
      wroteDoka = applySpendToCommitted(committed.doka, spend);
      wroteXp = committed.xp;
      wroteLevel = committed.level;
      backendDoka = wroteDoka;
      backendXp = wroteXp;
      backendLevel = wroteLevel;
      lock.commit({ doka: wroteDoka });
    });

    releaseReward();
    await Promise.all([reward, heal]);

    assert.equal(wroteDoka, 220);
    assert.equal(wroteXp, 130);
    assert.equal(wroteLevel, 5);
    assert.equal(backendDoka, 220);
    assert.equal(backendXp, 130);
    assert.equal(backendLevel, 5);
  });

  it("keeps a shop credit that lands through the lock ahead of a queued heal", async () => {
    const lock = createProgressPersist({ doka: 200, xp: 50, level: 4 });
    let backendDoka = 200;

    const credit = lock.enqueue(async () => {
      backendDoka += 500;
      lock.commit({ doka: backendDoka });
    });

    const spend = spendFromUiBalance(200, 170);
    let wroteDoka = 0;
    const heal = lock.enqueue(async () => {
      wroteDoka = applySpendToCommitted(lock.snapshot().doka, spend);
      backendDoka = wroteDoka;
      lock.commit({ doka: wroteDoka });
    });

    await Promise.all([credit, heal]);

    assert.equal(wroteDoka, 670);
    assert.equal(backendDoka, 670);
    assert.deepEqual(lock.snapshot(), { doka: 670, xp: 50, level: 4 });
  });

  it("keeps a shop credit that lands while applyRewards is in flight", async () => {
    const lock = createProgressPersist({ doka: 200, xp: 50, level: 4 });
    let backendDoka = 200;

    let releaseReward!: () => void;
    const rewardGate = new Promise<void>((resolve) => {
      releaseReward = resolve;
    });

    const reward = lock.enqueue(async () => {
      await rewardGate;
      backendDoka += 50;
      lock.commit({ doka: backendDoka });
    });

    // processPendingPurchases is additive on the canister. Serialized on the
    // same lock it sees the rewarded wallet; a later heal then spends from
    // that total instead of persisting the pre-purchase snapshot.
    const credit = lock.enqueue(async () => {
      backendDoka += 500;
      lock.commit({ doka: backendDoka });
    });

    let wroteDoka = 0;
    const heal = lock.enqueue(async () => {
      const committed = lock.snapshot().doka;
      wroteDoka = applySpendToCommitted(committed, 1);
      backendDoka = wroteDoka;
      lock.commit({ doka: wroteDoka });
    });

    releaseReward();
    await Promise.all([reward, credit, heal]);

    assert.equal(wroteDoka, 749);
    assert.equal(lock.snapshot().doka, 749);
    assert.equal(backendDoka, 749);
  });

  it("does not treat a pre-query 0 as a seeded wallet", () => {
    const lock = createProgressPersist({ doka: 0, xp: 80, level: 4 });
    assert.equal(lock.isWalletSeeded(), false);
    assert.equal(lock.hydrateWhenIdle({ doka: 0, xp: 80, level: 4 }), true);
    assert.equal(lock.isWalletSeeded(), false);
    assert.equal(lock.snapshot().doka, 0);

    assert.equal(
      lock.hydrateWhenIdle(
        { doka: 0, xp: 80, level: 4 },
        { walletReady: true },
      ),
      true,
    );
    assert.equal(lock.isWalletSeeded(), true);
    assert.equal(lock.snapshot().doka, 0);
  });

  it("does not seed from a positive UI delta before the session cache is applied", () => {
    const lock = createProgressPersist({ doka: 0, xp: 80, level: 4 });
    lock.hydrateWhenIdle({ doka: 100, xp: 80, level: 4 });
    assert.equal(lock.isWalletSeeded(), false);
    assert.equal(lock.snapshot().doka, 0);
    assert.equal(
      shouldCopyIdleWalletDoka({
        walletSeeded: false,
        walletReady: false,
        incomingDoka: 100,
        committedDoka: 0,
      }),
      false,
    );
  });

  it("does not let a placeholder 0 overwrite a shop-credit seed when ready is early", () => {
    const lock = createProgressPersist({ doka: 0, xp: 80, level: 4 });
    lock.commit({ doka: 500 });
    assert.equal(lock.isWalletSeeded(), true);

    assert.equal(
      shouldCopyIdleWalletDoka({
        walletSeeded: true,
        walletReady: true,
        incomingDoka: 0,
        committedDoka: 500,
      }),
      false,
    );
    lock.hydrateWhenIdle({ doka: 0, xp: 80, level: 4 }, { walletReady: true });
    assert.equal(lock.snapshot().doka, 500);

    const after = applySpendToCommitted(lock.snapshot().doka, 0);
    assert.equal(after, 500);
  });

  it("does not let a stale positive query overwrite a shop-credit seed", () => {
    const lock = createProgressPersist({ doka: 0, xp: 80, level: 4 });
    // Mount processPendingPurchases credited 500 while getCallerDokaBalance
    // was still in flight. GameFlow then applies the stale pre-credit 50.
    lock.commit({ doka: 550 });
    assert.equal(lock.isWalletSeeded(), true);

    assert.equal(
      shouldCopyIdleWalletDoka({
        walletSeeded: true,
        walletReady: true,
        incomingDoka: 50,
        committedDoka: 550,
      }),
      false,
    );
    assert.equal(
      shouldCopyIdleWalletDoka({
        walletSeeded: true,
        walletReady: true,
        incomingDoka: 900,
        committedDoka: 200,
      }),
      false,
      "ghost high HUD must not seed a mint onto committed",
    );
    lock.hydrateWhenIdle({ doka: 50, xp: 80, level: 4 }, { walletReady: true });
    assert.equal(lock.snapshot().doka, 550);

    const after = applySpendToCommitted(lock.snapshot().doka, 0);
    assert.equal(after, 550);
  });

  it("does not let idle hydrate downgrade a committed level-up", () => {
    assert.equal(floorHydratedLevel(5, 4), 5);
    assert.equal(floorHydratedLevel(4, 5), 5);
    assert.equal(floorHydratedLevel(4, 4), 4);

    const lock = createProgressPersist({ doka: 200, xp: 50, level: 4 });
    lock.commit({ doka: 250, xp: 24, level: 5 });
    // Victory leveled up, lava death skipped the live UI hydrate, then
    // death persist wrote the post-level leftover. The hydrate effect
    // still sees the old-level leftover — do not copy it over committed.
    assert.equal(lock.hydrateWhenIdle({ doka: 150, xp: 64, level: 4 }), true);
    assert.deepEqual(lock.snapshot(), { doka: 250, xp: 24, level: 5 });
  });

  it("does not copy a pre-level leftover over a committed level-up", () => {
    assert.equal(resolveHydratedXp(30, 5, 80, 4), 30);
    assert.equal(resolveHydratedXp(24, 5, 64, 4), 24);
    assert.equal(resolveHydratedXp(80, 4, 80, 4), 80);
    assert.equal(
      resolveHydratedXp(90, 4, 100, 4),
      90,
      "ghost HUD must not mint unpaid portal XP onto committed",
    );

    const lock = createProgressPersist({ doka: 1000, xp: 80, level: 4 });
    lock.commit({ doka: 720, xp: 24, level: 5 });
    // Optimistic death UI still holds the old leftover after raiseUi max().
    assert.equal(lock.hydrateWhenIdle({ doka: 720, xp: 64, level: 4 }), true);
    assert.deepEqual(lock.snapshot(), { doka: 720, xp: 24, level: 5 });
  });

  it("adds the shop-credit delta onto the live UI wallet instead of replacing it", () => {
    assert.equal(committedDokaAfterShopCredit(350), 350);
    assert.equal(committedDokaAfterShopCredit(null), null);
    // Heal already deducted 30 locally while the credit was queued.
    assert.equal(applyShopCreditDeltaToUi(170, 100), 270);
    assert.equal(applyShopCreditDeltaToUi(200, 100), 300);
  });

  it("does not mint unpaid portal XP when applyRewards rejects", async () => {
    const lock = createProgressPersist({ doka: 200, xp: 90, level: 4 });
    const ghostUiXp = 100;
    await assert.rejects(
      lock.enqueue(async () => {
        throw new Error("applyRewards failed");
      }),
      /applyRewards failed/,
    );
    assert.equal(lock.pendingCount(), 0);
    assert.equal(
      lock.hydrateWhenIdle({ doka: 200, xp: ghostUiXp, level: 4 }),
      true,
    );
    assert.equal(
      lock.snapshot().xp,
      90,
      "ghost HUD must not mint unpaid portal XP onto committed",
    );

    const safe = createProgressPersist({ doka: 200, xp: 90, level: 4 });
    const safeXp = 90;
    await assert.rejects(
      safe.enqueue(async () => {
        throw new Error("applyRewards failed");
      }),
      /applyRewards failed/,
    );
    assert.equal(
      safe.hydrateWhenIdle({ doka: 200, xp: safeXp, level: 4 }),
      true,
    );
    assert.equal(safe.snapshot().xp, 90);

    safe.commit({ xp: 100, level: 4 });
    assert.equal(safe.hydrateWhenIdle({ doka: 200, xp: 100, level: 4 }), true);
    assert.equal(safe.snapshot().xp, 100);
  });

  it("does not mint ghost Boss Rush Doka when applyRewards rejects", async () => {
    const lock = createProgressPersist({ doka: 200, xp: 50, level: 4 });
    const gained = 500;
    // Old room-clear path credited the HUD before the lock write.
    const ghostUi = applyShopCreditDeltaToUi(200, gained);
    await assert.rejects(
      lock.enqueue(async () => {
        throw new Error("applyRewards failed");
      }),
      /applyRewards failed/,
    );
    assert.equal(lock.pendingCount(), 0);
    assert.equal(
      lock.hydrateWhenIdle({ doka: ghostUi, xp: 50, level: 4 }),
      true,
    );
    assert.equal(
      lock.snapshot().doka,
      200,
      "ghost HUD must not mint unpaid Doka onto committed",
    );
    assert.equal(
      applySpendToCommitted(200, spendFromUiBalance(ghostUi, ghostUi - 200)),
      0,
      "shop spend from the ghost wallet zeros the real canister balance",
    );

    // Credit only after persist succeeds (handleBattleEnd / room-clear).
    const safe = createProgressPersist({ doka: 200, xp: 50, level: 4 });
    let safeUi = 200;
    await assert.rejects(
      safe.enqueue(async () => {
        throw new Error("applyRewards failed");
      }),
      /applyRewards failed/,
    );
    assert.equal(
      safe.hydrateWhenIdle({ doka: safeUi, xp: 50, level: 4 }),
      true,
    );
    assert.equal(safe.snapshot().doka, 200);

    safe.commit({ doka: 700 });
    safeUi = applyShopCreditDeltaToUi(safeUi, gained);
    assert.equal(safeUi, 700);
    assert.equal(
      safe.hydrateWhenIdle({ doka: safeUi, xp: 50, level: 4 }),
      true,
    );
    assert.equal(safe.snapshot().doka, 700);
  });

  it("releases the lock when a queued write rejects so hydrate is not stuck", async () => {
    const lock = createProgressPersist({ doka: 200, xp: 50, level: 4 });
    await assert.rejects(
      lock.enqueue(async () => {
        throw new Error("applyRewards failed");
      }),
      /applyRewards failed/,
    );
    assert.equal(lock.pendingCount(), 0);
    // Seeded wallets ignore idle Doka (ghost HUD must not mint). XP/level
    // can still advance so the lock is not stuck after a reject.
    assert.equal(lock.hydrateWhenIdle({ doka: 250, xp: 80, level: 5 }), true);
    assert.deepEqual(lock.snapshot(), { doka: 200, xp: 80, level: 5 });

    lock.commit({ doka: Number.NaN });
    assert.equal(
      lock.snapshot().doka,
      200,
      "NaN commit must keep the last wallet",
    );
  });

  it("does not re-inflate committed when a credit is applied as a UI delta after a heal", () => {
    // Reward committed 250, heal wrote 220. Replacing the UI with the
    // absolute 250 and hydrating copies the refund into committed.
    const replaced = createProgressPersist({ doka: 220, xp: 50, level: 4 });
    replaced.hydrateWhenIdle({ doka: 250, xp: 50, level: 4 });
    assert.equal(replaced.snapshot().doka, 220);

    // Adding the +50 reward onto the already-healed 170 keeps 220, so
    // hydrateWhenIdle cannot restore the spent Doka.
    const delta = createProgressPersist({ doka: 220, xp: 50, level: 4 });
    const uiAfterDelta = applyShopCreditDeltaToUi(170, 50);
    assert.equal(uiAfterDelta, 220);
    delta.hydrateWhenIdle({ doka: uiAfterDelta, xp: 50, level: 4 });
    assert.equal(delta.snapshot().doka, 220);
  });

  it("fetches the canister wallet when death persist runs before the query hydrates", async () => {
    const lock = createProgressPersist({ doka: 0, xp: 100, level: 4 });
    assert.equal(lock.isWalletSeeded(), false);

    const fetched = await resolveCommittedDokaForAbsoluteWrite(
      lock,
      async () => 500,
    );
    assert.equal(fetched, 500);
    assert.equal(lock.isWalletSeeded(), true);
    assert.equal(lock.snapshot().doka, 500);

    const alreadySeeded = await resolveCommittedDokaForAbsoluteWrite(
      lock,
      async () => {
        throw new Error("must not refetch after seed");
      },
    );
    assert.equal(alreadySeeded, 500);
  });

  it("skips the absolute write when the unseeded wallet read fails", async () => {
    const lock = createProgressPersist({ doka: 0, xp: 100, level: 4 });
    const missed = await resolveCommittedDokaForAbsoluteWrite(
      lock,
      async () => {
        throw new Error("replica timeout");
      },
    );
    assert.equal(missed, null);
    assert.equal(lock.isWalletSeeded(), false);
    assert.equal(lock.snapshot().doka, 0);
  });
});
