import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DUNGEON_CHAIN_COMPLETE_CREDIT_ID,
  type DokaCreditActor,
  SHRINE_ALTAR_CREDIT_ID,
  beginOneShotCredit,
  findGroundDokaOnTile,
  markGroundDokaCollected,
  persistDokaCredit,
  persistDokaCreditResult,
  settleOneShotAfterCredit,
  shouldReleaseOneShotDokaCredit,
} from "./dokaPersist.ts";

describe("persistDokaCredit", () => {
  it("credits world Doka through applyRewards(slot, doka, 0)", async () => {
    const calls: Array<{ slot: bigint; doka: bigint; xp: bigint }> = [];
    const actor: DokaCreditActor = {
      applyRewards: async (slot, doka, xp) => {
        calls.push({ slot, doka, xp });
        return { ok: { newDoka: 140n, newXp: 0n, newLevel: 1n } };
      },
    };

    const newDoka = await persistDokaCredit(actor, 2, 40);
    assert.equal(newDoka, 140);
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.slot, 2n);
    assert.equal(calls[0]?.doka, 40n);
    assert.equal(calls[0]?.xp, 0n);
  });

  it("returns 0 on backend err instead of throwing", async () => {
    const failing: DokaCreditActor = {
      applyRewards: async () => ({ err: "Account banned" }),
    };
    const failed = await persistDokaCredit(failing, 1, 10);
    assert.equal(failed, 0);
  });

  it("does not release a one-shot claim after a transport miss", async () => {
    const transport: DokaCreditActor = {
      applyRewards: async () => {
        throw new Error("replica reject after add");
      },
    };
    const transportResult = await persistDokaCreditResult(transport, 1, 30);
    assert.equal(shouldReleaseOneShotDokaCredit(transportResult), false);
    assert.equal(settleOneShotAfterCredit(transportResult), "keep");
  });

  it("reads __kind__/ _ok applyRewards payloads so a credit is not dropped", async () => {
    const kindOk = {
      applyRewards: async () => ({
        __kind__: "ok" as const,
        ok: { newDoka: 430n, newXp: 0n, newLevel: 4n },
      }),
    };
    assert.equal(
      await persistDokaCredit(kindOk as unknown as DokaCreditActor, 1, 30),
      430,
    );

    const underscored = {
      applyRewards: async () => ({
        _ok: { newDoka: 340n, newXp: 0n, newLevel: 4n },
      }),
    };
    assert.equal(
      await persistDokaCredit(underscored as unknown as DokaCreditActor, 1, 40),
      340,
    );
  });
});

describe("one-shot world credits", () => {
  it("credits a ground coin once even if the setState updater re-runs", () => {
    const claimed = new Set<string>();
    const loot = [
      {
        id: "doka-1",
        tileX: 3,
        tileY: 4,
        collected: false,
        value: 12,
      },
    ];
    const hit = findGroundDokaOnTile(loot, 3, 4);
    assert.ok(hit);
    assert.equal(beginOneShotCredit(claimed, hit.id), true);
    assert.equal(beginOneShotCredit(claimed, hit.id), false);
    const after = markGroundDokaCollected(loot, hit.id);
    assert.equal(findGroundDokaOnTile(after, 3, 4), undefined);
    let applyRewards = 0;
    if (beginOneShotCredit(claimed, hit.id)) applyRewards += hit.value;
    assert.equal(applyRewards, 0);
  });

  it("credits the shrine altar and dungeon-chain bonus once per room/run", () => {
    const claimed = new Set<string>();
    assert.equal(beginOneShotCredit(claimed, SHRINE_ALTAR_CREDIT_ID), true);
    assert.equal(beginOneShotCredit(claimed, SHRINE_ALTAR_CREDIT_ID), false);
    assert.equal(
      beginOneShotCredit(claimed, DUNGEON_CHAIN_COMPLETE_CREDIT_ID),
      true,
    );
    assert.equal(
      beginOneShotCredit(claimed, DUNGEON_CHAIN_COMPLETE_CREDIT_ID),
      false,
    );
  });
});
