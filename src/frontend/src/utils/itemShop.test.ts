import assert from "node:assert/strict";
import {
  JACKPOT_HEAL_DOKA_COST,
  applyHealHpToLiveStats,
  dokaHealAmounts,
  isBuffShopOpen,
  liveDokaForShopSpend,
  liveShopWallet,
  nextDokaAfterJackpotHeal,
  nextDokaAfterShopSpend,
  nextHpAfterDokaHeal,
  resolveAbsoluteWriteHp,
  resolveOverworldHealSpend,
  shouldAllowShopSpend,
  shouldRollbackFailedHeal,
  shouldStartDokaHeal,
  tryPurchaseBuffItem,
} from "./itemShop.ts";

assert.equal(
  isBuffShopOpen(undefined),
  false,
  "omitting isOpen must not mount the shop (WorldExploration used to do this)",
);
assert.equal(isBuffShopOpen(false), false);
assert.equal(isBuffShopOpen(true), true);

assert.equal(
  liveShopWallet(50, () => 47),
  47,
  "same-tick heal debit must win over the render snapshot",
);
assert.equal(liveShopWallet(50), 50);
assert.equal(
  shouldAllowShopSpend(
    liveShopWallet(50, () => 47),
    50,
  ),
  false,
  "shop Buy after a same-tick heal must not treat the stale 50 as affordable",
);

assert.equal(nextDokaAfterShopSpend(200, 50), 150);
assert.equal(nextDokaAfterShopSpend(30, 50), 0);
assert.equal(nextDokaAfterShopSpend(0, 50), 0);
// Jackpot heal is a 1-Doka spend off the live ref, not the render snapshot.
assert.equal(nextDokaAfterShopSpend(150, 1), 149);
assert.notEqual(nextDokaAfterShopSpend(150, 1), 199);

// Double-click before re-render must debit the live wallet, not the
// render snapshot (200 → 150 → 100, not 200 → 150 twice).
{
  let live = 200;
  live = nextDokaAfterShopSpend(live, 50);
  live = nextDokaAfterShopSpend(live, 50);
  assert.equal(live, 100);
}

// Jackpot used the render snapshot (200) after a same-tick shop debit
// left the live ref at 150. persist spend was 0; idle hydrate refunded 50.
{
  let live = 200;
  live = nextDokaAfterShopSpend(live, 50);
  live = nextDokaAfterJackpotHeal(live);
  assert.equal(JACKPOT_HEAL_DOKA_COST, 1);
  assert.equal(live, 149);
  assert.equal(nextDokaAfterJackpotHeal(200), 199);
}

// Persist HP from the pre-setState snapshot. After setCharacterStats the
// eager updater already added hpToAdd to the ref; adding it again writes
// 110 for a 30-HP / 10-Doka heal.
assert.equal(nextHpAfterDokaHeal(50, 200, 30), 80);
assert.equal(nextHpAfterDokaHeal(80, 200, 30), 110);
assert.notEqual(nextHpAfterDokaHeal(50, 200, 30), 110);
assert.equal(nextHpAfterDokaHeal(90, 100, 30), 100);

assert.deepEqual(dokaHealAmounts(50, 200, 10), { hpToAdd: 30, dokaCost: 10 });
assert.deepEqual(dokaHealAmounts(50, 80, 100), { hpToAdd: 30, dokaCost: 10 });
assert.deepEqual(dokaHealAmounts(100, 100, 50), { hpToAdd: 0, dokaCost: 0 });

assert.equal(
  shouldStartDokaHeal({ currentHp: 50, maxHp: 200, liveDoka: 10 }),
  true,
);
assert.equal(
  shouldStartDokaHeal({ currentHp: 80, maxHp: 200, liveDoka: 0 }),
  false,
  "second click after the first emptied the wallet must not persist a free heal",
);
assert.equal(
  shouldStartDokaHeal({ currentHp: 100, maxHp: 100, liveDoka: 50 }),
  false,
);

// Heal then buy before re-render: render still shows 55, potion costs 50.
assert.equal(shouldAllowShopSpend(55, 50), true);
assert.equal(shouldAllowShopSpend(45, 50), false);
assert.equal(shouldAllowShopSpend(50, 0), false);

{
  // Chronology: 50/200 HP, 10 Doka. Double-click heal.
  // Click 1 spends the wallet and heals +30. Click 2 must no-op.
  let hp = 50;
  let doka = 10;
  const first = shouldStartDokaHeal({
    currentHp: hp,
    maxHp: 200,
    liveDoka: doka,
  });
  assert.equal(first, true);
  const amounts = dokaHealAmounts(hp, 200, doka);
  const persistHp = nextHpAfterDokaHeal(hp, 200, amounts.hpToAdd);
  hp = persistHp;
  doka = nextDokaAfterShopSpend(doka, amounts.dokaCost);
  assert.equal(hp, 80);
  assert.equal(doka, 0);
  assert.equal(
    shouldStartDokaHeal({ currentHp: hp, maxHp: 200, liveDoka: doka }),
    false,
  );
}

{
  const first = tryPurchaseBuffItem({
    wallet: 50,
    cost: 50,
    owned: 0,
    maxStack: 5,
    inBattle: false,
  });
  assert.deepEqual(first, { nextWallet: 0, nextOwned: 1 });
  const second = tryPurchaseBuffItem({
    wallet: first!.nextWallet,
    cost: 50,
    owned: first!.nextOwned,
    maxStack: 5,
    inBattle: false,
  });
  assert.equal(second, null, "double-click after draining the live wallet");
}

assert.equal(
  tryPurchaseBuffItem({
    wallet: 200,
    cost: 50,
    owned: 0,
    maxStack: 5,
    inBattle: true,
  }),
  null,
);
assert.equal(
  tryPurchaseBuffItem({
    wallet: 200,
    cost: 50,
    owned: 5,
    maxStack: 5,
    inBattle: false,
  }),
  null,
);

{
  const first = resolveOverworldHealSpend({
    currentHp: 90,
    maxHp: 100,
    liveDoka: 1,
    jackpot: false,
  });
  assert.deepEqual(first, {
    nextHp: 93,
    nextDoka: 0,
    hpGained: 3,
    dokaCost: 1,
    jackpot: false,
  });
  const second = resolveOverworldHealSpend({
    currentHp: first!.nextHp,
    maxHp: 100,
    liveDoka: first!.nextDoka,
    jackpot: false,
  });
  assert.equal(second, null, "second heal click must not grant free HP");
}

{
  const jackpot = resolveOverworldHealSpend({
    currentHp: 10,
    maxHp: 100,
    liveDoka: 5,
    jackpot: true,
  });
  assert.deepEqual(jackpot, {
    nextHp: 100,
    nextDoka: 4,
    hpGained: 90,
    dokaCost: 1,
    jackpot: true,
  });
  const afterSpend = resolveOverworldHealSpend({
    currentHp: 10,
    maxHp: 100,
    liveDoka: 7,
    jackpot: true,
  });
  assert.equal(
    afterSpend!.nextDoka,
    6,
    "jackpot must debit the live ref, not a stale render balance",
  );
}

assert.equal(
  resolveOverworldHealSpend({
    currentHp: 100,
    maxHp: 100,
    liveDoka: 10,
    jackpot: false,
  }),
  null,
);

{
  // One heal click spends the wallet (or fills HP). A later persist reject
  // must not restore hpBefore/dokaBefore if a reward, potion, or shop
  // write already moved the live refs.
  const first = resolveOverworldHealSpend({
    currentHp: 50,
    maxHp: 200,
    liveDoka: 10,
    jackpot: false,
  });
  assert.deepEqual(first, {
    nextHp: 80,
    nextDoka: 0,
    hpGained: 30,
    dokaCost: 10,
    jackpot: false,
  });
  assert.equal(
    shouldRollbackFailedHeal({
      liveHp: 80,
      liveDoka: 50,
      expectedHp: first!.nextHp,
      expectedDoka: first!.nextDoka,
    }),
    false,
    "in-flight applyRewards credit must not be wiped by a failed heal persist",
  );
  assert.equal(
    shouldRollbackFailedHeal({
      liveHp: 110,
      liveDoka: 0,
      expectedHp: first!.nextHp,
      expectedDoka: first!.nextDoka,
    }),
    false,
    "a potion used while heal persist is in flight must keep its HP",
  );
  assert.equal(
    shouldRollbackFailedHeal({
      liveHp: first!.nextHp,
      liveDoka: first!.nextDoka,
      expectedHp: first!.nextHp,
      expectedDoka: first!.nextDoka,
    }),
    true,
    "same-click reject still rolls back when nothing superseded it",
  );
}

assert.equal(
  shouldStartDokaHeal({
    currentHp: 50,
    maxHp: 200,
    liveDoka: 10,
    inFlight: true,
  }),
  false,
  "a second click while the first saveBattleStats is in flight must no-op",
);

{
  // Chronology: paid heal writes ref to 80, then lava ticks to 65 before
  // saveBattleStats runs. Persisting the click snapshot (80) resurrects
  // the hazard on reload.
  const stats = { current: { hp: 50, maxHp: 200 } };
  applyHealHpToLiveStats(stats, 80);
  assert.equal(stats.current.hp, 80);
  stats.current = { ...stats.current, hp: 65 };
  assert.equal(resolveAbsoluteWriteHp(stats.current.hp, 80), 65);
  assert.equal(
    resolveAbsoluteWriteHp(110, 80),
    80,
    "a later heal must not ride this write's spend",
  );
  assert.equal(resolveAbsoluteWriteHp(80, 80), 80);
}

{
  let hostLive = 90;
  assert.equal(
    liveDokaForShopSpend(() => hostLive, 100),
    90,
  );
  assert.equal(
    liveDokaForShopSpend(undefined, 100),
    100,
    "no host getter falls back to the shop's own live ref",
  );
  hostLive = 40;
  const purchase = tryPurchaseBuffItem({
    wallet: liveDokaForShopSpend(() => hostLive, 100),
    cost: 50,
    owned: 0,
    maxStack: 5,
    inBattle: false,
  });
  assert.equal(
    purchase,
    null,
    "heal-then-buy must read the host ref, not the stale-high shop fallback",
  );
}

console.log("itemShop.test: ok");
