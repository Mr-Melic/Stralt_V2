import assert from "node:assert/strict";
import { createProgressPersist } from "./progressPersist.ts";
import {
  applySpellLevel,
  committedDokaAfterSpellUpgrade,
  persistSpellUpgrade,
  readUpgradeSpellOk,
  shouldCommitSpellUpgradeDoka,
  spellUpgradeCanisterSpend,
  spellUpgradeUiSpend,
} from "./spellUpgrade.ts";

assert.deepEqual(applySpellLevel({ fireball: 1 }, "fireball", 2), {
  fireball: 2,
});
assert.deepEqual(applySpellLevel({}, "heal", 1), { heal: 1 });

assert.equal(readUpgradeSpellOk({ ok: 2n }), 2);
assert.equal(readUpgradeSpellOk({ _ok: 3 }), 3);
assert.equal(readUpgradeSpellOk({ __kind__: "ok", ok: 1n }), 1);

let threw = false;
try {
  readUpgradeSpellOk({ __kind__: "err", err: "Not enough Doka" });
} catch (e) {
  threw = String((e as Error).message).includes("Not enough Doka");
}
assert.equal(threw, true);

threw = false;
try {
  readUpgradeSpellOk({ err: "Spell not found: fireball" });
} catch (e) {
  threw = String((e as Error).message).includes("Spell not found");
}
assert.equal(threw, true);

const calls: Array<{ slot: bigint; spellId: string }> = [];
const actor = {
  upgradeSpell: async (slot: bigint, spellId: string) => {
    calls.push({ slot, spellId });
    return { ok: 2n };
  },
  getCallerDokaBalance: async () => 40n,
};

const ok = await persistSpellUpgrade(actor, 1, "fireball");
assert.equal(ok.newLevel, 2);
assert.equal(ok.newDoka, 40);
assert.equal(calls.length, 1);
assert.equal(calls[0].slot, 1n);
assert.equal(calls[0].spellId, "fireball");

let persistThrew = false;
try {
  await persistSpellUpgrade(
    {
      upgradeSpell: async () => ({ err: "Account banned" }),
    },
    1,
    "fireball",
  );
} catch (e) {
  persistThrew = String((e as Error).message).includes("Account banned");
}
assert.equal(persistThrew, true);

// A heal queued during upgradeSpell must persist the new level, not the
// click-time map. React setState for spellLevels runs after enqueue returns.
{
  const lock = createProgressPersist({ doka: 200, xp: 0, level: 1 });
  let levels: Record<string, number> = { fireball: 1 };
  let wroteLevels: Record<string, number> | null = null;
  let releaseUpgrade!: () => void;
  const upgradeGate = new Promise<void>((resolve) => {
    releaseUpgrade = resolve;
  });

  const upgrade = lock.enqueue(async () => {
    await upgradeGate;
    const next = applySpellLevel(levels, "fireball", 2);
    levels = next;
    return next;
  });

  const heal = lock.enqueue(async () => {
    wroteLevels = { ...levels };
  });

  releaseUpgrade();
  await Promise.all([upgrade, heal]);
  assert.deepEqual(wroteLevels, { fireball: 2 });
}

// Summon upgrades advertise 10× but upgradeSpell only deducts base*2^level.
// Debiting the advertised cost leaves the UI short; hydrateWhenIdle then
// copies that under-count over committed and the next heal persists it.
assert.equal(spellUpgradeUiSpend(100, 200, 190), 10);
assert.equal(spellUpgradeUiSpend(100, 200, undefined), 10);
assert.equal(spellUpgradeUiSpend(20, 200, undefined), 20);
assert.equal(spellUpgradeUiSpend(3200, 4000, 3680), 320);
assert.equal(spellUpgradeCanisterSpend(100), 10);
assert.equal(spellUpgradeCanisterSpend(200), 20);
assert.equal(spellUpgradeCanisterSpend(10), 10);
assert.equal(spellUpgradeCanisterSpend(80), 80);
assert.equal(committedDokaAfterSpellUpgrade(200, 190, 100), 190);
assert.equal(
  committedDokaAfterSpellUpgrade(200, 200, 100),
  190,
  "stale pre-upgrade query must not refund the canister spend",
);
assert.equal(committedDokaAfterSpellUpgrade(200, undefined, 20), 180);
assert.equal(
  committedDokaAfterSpellUpgrade(0, 190, 100),
  190,
  "unseeded lock must keep the post-upgrade query instead of seeding 0",
);
assert.equal(committedDokaAfterSpellUpgrade(0, undefined, 100), 0);
assert.equal(shouldCommitSpellUpgradeDoka(0, 0, false), false);
assert.equal(shouldCommitSpellUpgradeDoka(0, 190, false), true);
assert.equal(shouldCommitSpellUpgradeDoka(200, 190, true), true);
assert.equal(spellUpgradeUiSpend(100, 0, 190), 10);

{
  const lock = createProgressPersist({ doka: 200, xp: 0, level: 1 });
  const advertisedSummonCost = 100;
  const backendAfter = 190;
  const committedBefore = lock.snapshot().doka;
  lock.commit({ doka: backendAfter });
  const spent = spellUpgradeUiSpend(
    advertisedSummonCost,
    committedBefore,
    backendAfter,
  );
  const uiAfter = 200 - spent;
  assert.equal(spent, 10);
  assert.equal(uiAfter, 190);
  lock.hydrateWhenIdle({ doka: uiAfter, xp: 0, level: 1 });
  assert.equal(lock.snapshot().doka, 190);

  const wrongUi = 200 - advertisedSummonCost;
  const wrongLock = createProgressPersist({ doka: 190, xp: 0, level: 1 });
  wrongLock.hydrateWhenIdle({ doka: wrongUi, xp: 0, level: 1 });
  // Advertised-cost UI is short; idle hydrate must not copy that cut over
  // the seeded post-upgrade wallet.
  assert.equal(wrongLock.snapshot().doka, 190);
}

{
  // upgradeSpell deducted 10. getCallerDokaBalance returned the pre-upgrade
  // 200. Committing that snapshot refunds the spend; the next heal writes 200.
  const lock = createProgressPersist({ doka: 200, xp: 0, level: 1 });
  const next = committedDokaAfterSpellUpgrade(200, 200, 100);
  lock.commit({ doka: next });
  const spent = spellUpgradeUiSpend(100, 200, 200);
  const ui = 200 - spent;
  assert.equal(next, 190);
  assert.equal(spent, 10);
  assert.equal(ui, 190);
  lock.hydrateWhenIdle({ doka: ui, xp: 0, level: 1 });
  assert.equal(lock.snapshot().doka, 190);
}

{
  // Chronology: upgradeSpell #ok(2) deducts 20. getCallerDokaBalance throws.
  // The persist job used to reject, so spellLevelsRef / the lock never
  // updated and inFlight cleared. Retry called upgradeSpell again (level 3,
  // another 20). Recap heal saveBattleStats then wrote the pre-upgrade
  // wallet and wiped the first spend (saveBattleStats never mints).
  let upgrades = 0;
  const throwingActor = {
    upgradeSpell: async () => {
      upgrades += 1;
      return { ok: BigInt(1 + upgrades) };
    },
    getCallerDokaBalance: async () => {
      throw new Error("query replica unavailable");
    },
  };
  const lock = createProgressPersist({ doka: 200, xp: 0, level: 1 });
  const first = await lock.enqueue(async () => {
    const committedBefore = lock.snapshot().doka;
    const result = await persistSpellUpgrade(throwingActor, 1, "fireball");
    const nextDoka = committedDokaAfterSpellUpgrade(
      committedBefore,
      result.newDoka,
      20,
    );
    lock.commit({ doka: nextDoka });
    return result;
  });
  assert.equal(first.newLevel, 2);
  assert.equal(first.newDoka, undefined);
  assert.equal(lock.snapshot().doka, 180);
  assert.equal(upgrades, 1);

  const spend = 30;
  const wroteDoka = lock.snapshot().doka - spend;
  lock.commit({ doka: wroteDoka });
  assert.equal(lock.snapshot().doka, 150);
  assert.equal(
    upgrades,
    1,
    "a throwing wallet query after #ok must not look like a failed upgrade",
  );
}

console.log("spellUpgrade.test: ok");
