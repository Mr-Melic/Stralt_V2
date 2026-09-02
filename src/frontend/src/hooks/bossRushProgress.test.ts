import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyShopCreditDeltaToUi,
  createProgressPersist,
} from "../utils/progressPersist.ts";
import {
  adoptPersistedResumeRoom,
  clearBossRushForSlot,
  isPrincipalText,
  parseBossRushStateTuple,
  persistBossRushRewardsThroughLock,
  persistBossRushRoomAdvance,
  persistBossRushRoomClear,
  progressAfterRoomClear,
  resolveBossRushQueryPrincipalText,
  resumeRoomFromPersisted,
} from "./bossRushProgress.ts";

describe("resolveBossRushQueryPrincipalText", () => {
  const caller = "2vxsx-fae";

  it("rejects profile display names so resume does not skip the canister", () => {
    assert.equal(isPrincipalText("guest"), false);
    assert.equal(isPrincipalText("VampireBob"), false);
    assert.equal(resolveBossRushQueryPrincipalText(null, "guest"), null);
    assert.equal(resolveBossRushQueryPrincipalText(null, "VampireBob"), null);
  });

  it("prefers the authenticated II principal over a display-name userId", () => {
    assert.equal(resolveBossRushQueryPrincipalText(caller, "guest"), caller);
  });

  it("accepts a valid principal text when identity is missing", () => {
    assert.equal(isPrincipalText(caller), true);
    assert.equal(resolveBossRushQueryPrincipalText(null, caller), caller);
  });
});

describe("parseBossRushStateTuple", () => {
  it("reads (currentRoom, highestRoomCompleted, totalBossRushRuns)", () => {
    assert.deepEqual(parseBossRushStateTuple([1n, 1n, 0n]), {
      currentRoom: 1,
      highestRoomCompleted: 1,
      totalBossRushRuns: 0,
    });
  });

  it("rejects a non-tuple so Doka/XP cannot be read from the wrong slots", () => {
    assert.equal(parseBossRushStateTuple(null), null);
    assert.equal(parseBossRushStateTuple([1n, 2n]), null);
  });
});

describe("resumeRoomFromPersisted", () => {
  it("starts at room 0 when the backend has no mid-run progress", () => {
    assert.equal(resumeRoomFromPersisted(0), 0);
    assert.equal(resumeRoomFromPersisted(-1), 0);
  });

  it("resumes the persisted room instead of resetting to 0", () => {
    assert.equal(resumeRoomFromPersisted(1), 1);
    assert.equal(resumeRoomFromPersisted(9), 9);
    assert.equal(resumeRoomFromPersisted(12), 9);
  });
});

describe("adoptPersistedResumeRoom", () => {
  it("hydrates mid-run progress before the player enters", () => {
    assert.equal(adoptPersistedResumeRoom(false, 4), 4);
  });

  it("does not overwrite an active run after persist advanced currentRoom", () => {
    assert.equal(adoptPersistedResumeRoom(true, 1), null);
    assert.equal(adoptPersistedResumeRoom(true, 4), null);
  });

  it("leaves room 0 unset so startBossRush can begin a fresh run", () => {
    assert.equal(adoptPersistedResumeRoom(false, 0), null);
  });
});

describe("clearBossRushForSlot", () => {
  it("resets currentRoom so a new slot occupant cannot resume", async () => {
    const calls: string[] = [];
    await clearBossRushForSlot(
      {
        resetBossRush: async (slot) => {
          calls.push(`reset:${slot}`);
        },
      },
      2,
    );
    assert.deepEqual(calls, ["reset:2"]);
  });
});

describe("progressAfterRoomClear", () => {
  it("advances currentRoom on a non-final clear so reload cannot re-farm", () => {
    assert.deepEqual(progressAfterRoomClear(0), {
      nextCurrentRoom: 1,
      runComplete: false,
    });
  });

  it("resets currentRoom after the final room so the jackpot is not resumable", () => {
    assert.deepEqual(progressAfterRoomClear(9), {
      nextCurrentRoom: 0,
      runComplete: true,
    });
  });
});

describe("persistBossRushRoomClear", () => {
  it("writes progress before completeBossRushRoom (room 0 → currentRoom 1)", async () => {
    const calls: string[] = [];
    await persistBossRushRoomClear(
      {
        setBossRushProgress: async (slot, room) => {
          calls.push(`progress:${slot}:${room}`);
        },
        resetBossRush: async () => {
          calls.push("reset");
        },
        completeBossRushRoom: async (slot, room, doka, xp) => {
          calls.push(`complete:${slot}:${room}:${doka}:${xp}`);
        },
      },
      2,
      0,
    );
    assert.deepEqual(calls, ["progress:2:1", "complete:2:0:0:0"]);
  });

  it("resets currentRoom before recording the final-room complete", async () => {
    const calls: string[] = [];
    await persistBossRushRoomClear(
      {
        setBossRushProgress: async () => {
          calls.push("progress");
        },
        resetBossRush: async (slot) => {
          calls.push(`reset:${slot}`);
        },
        completeBossRushRoom: async (_slot, room) => {
          calls.push(`complete:${room}`);
        },
      },
      1,
      9,
    );
    assert.deepEqual(calls, ["reset:1", "complete:9"]);
  });

  it("re-resets currentRoom when death aborts the run during the persist", async () => {
    const calls: string[] = [];
    let aborted = false;
    await persistBossRushRoomClear(
      {
        setBossRushProgress: async (slot, room) => {
          calls.push(`progress:${slot}:${room}`);
          aborted = true;
        },
        resetBossRush: async (slot) => {
          calls.push(`reset:${slot}`);
        },
        completeBossRushRoom: async (slot, room) => {
          calls.push(`complete:${slot}:${room}`);
        },
      },
      2,
      0,
      { wasSuperseded: () => aborted },
    );
    assert.deepEqual(calls, ["progress:2:1", "complete:2:0", "reset:2"]);
  });

  it("throws when setBossRushProgress is missing so applyRewards cannot pay", async () => {
    await assert.rejects(
      () =>
        persistBossRushRoomClear(
          {
            completeBossRushRoom: async () => undefined,
          },
          2,
          0,
        ),
      /setBossRushProgress is required/,
    );
  });

  it("throws when the currentRoom write rejects so applyRewards cannot pay", async () => {
    await assert.rejects(
      () =>
        persistBossRushRoomClear(
          {
            setBossRushProgress: async () => {
              throw new Error("replica timeout");
            },
            completeBossRushRoom: async () => undefined,
          },
          2,
          0,
        ),
      /replica timeout/,
    );
  });

  it("throws when resetBossRush is missing on a final-room clear", async () => {
    await assert.rejects(
      () =>
        persistBossRushRoomClear(
          {
            completeBossRushRoom: async () => undefined,
          },
          1,
          9,
        ),
      /resetBossRush is required/,
    );
  });

  it("still resolves after completeBossRushRoom rejects once currentRoom advanced", async () => {
    const calls: string[] = [];
    await persistBossRushRoomClear(
      {
        setBossRushProgress: async (slot, room) => {
          calls.push(`progress:${slot}:${room}`);
        },
        completeBossRushRoom: async () => {
          throw new Error("complete failed");
        },
      },
      2,
      0,
    );
    assert.deepEqual(calls, ["progress:2:1"]);
  });

  it("keeps the advanced room when the run is still live", async () => {
    const calls: string[] = [];
    await persistBossRushRoomClear(
      {
        setBossRushProgress: async (slot, room) => {
          calls.push(`progress:${slot}:${room}`);
        },
        resetBossRush: async (slot) => {
          calls.push(`reset:${slot}`);
        },
        completeBossRushRoom: async (slot, room) => {
          calls.push(`complete:${slot}:${room}`);
        },
      },
      2,
      0,
      { wasSuperseded: () => false },
    );
    assert.deepEqual(calls, ["progress:2:1", "complete:2:0"]);
  });
});

describe("persistBossRushRoomAdvance", () => {
  it("writes currentRoom so a tab close mid-walk can resume", async () => {
    const calls: string[] = [];
    await persistBossRushRoomAdvance(
      {
        setBossRushProgress: async (slot, room) => {
          calls.push(`progress:${slot}:${room}`);
        },
        resetBossRush: async (slot) => {
          calls.push(`reset:${slot}`);
        },
      },
      2,
      1,
    );
    assert.deepEqual(calls, ["progress:2:1"]);
  });

  it("skips setBossRushProgress when death already aborted the run", async () => {
    const calls: string[] = [];
    await persistBossRushRoomAdvance(
      {
        setBossRushProgress: async (slot, room) => {
          calls.push(`progress:${slot}:${room}`);
        },
        resetBossRush: async (slot) => {
          calls.push(`reset:${slot}`);
        },
      },
      2,
      1,
      { wasSuperseded: () => true },
    );
    assert.deepEqual(calls, ["reset:2"]);
  });

  it("re-resets currentRoom when death aborts during the portal write", async () => {
    const calls: string[] = [];
    let aborted = false;
    await persistBossRushRoomAdvance(
      {
        setBossRushProgress: async (slot, room) => {
          calls.push(`progress:${slot}:${room}`);
          aborted = true;
        },
        resetBossRush: async (slot) => {
          calls.push(`reset:${slot}`);
        },
      },
      2,
      1,
      { wasSuperseded: () => aborted },
    );
    assert.deepEqual(calls, ["progress:2:1", "reset:2"]);
  });

  it("throws when setBossRushProgress is missing so a silent skip cannot look persisted", async () => {
    await assert.rejects(
      () =>
        persistBossRushRoomAdvance(
          { resetBossRush: async () => undefined },
          2,
          1,
        ),
      /setBossRushProgress is required/,
    );
  });
});

describe("persistBossRushRewardsThroughLock", () => {
  it("keeps persistRoomClear on the lock so death penalizes the post-credit wallet", async () => {
    const lock = createProgressPersist({ doka: 1000, xp: 10000, level: 4 });
    const order: string[] = [];
    let releaseClear!: () => void;
    const clearGate = new Promise<void>((resolve) => {
      releaseClear = resolve;
    });

    const roomClear = persistBossRushRewardsThroughLock(
      lock,
      async () => {
        await clearGate;
        order.push("progress");
      },
      async () => {
        lock.commit({ doka: 1200, xp: 10080 });
        order.push("rewards");
        return { doka: 1200, xp: 10080 };
      },
    );

    const death = lock.enqueue(async () => {
      order.push("death");
      const committed = lock.snapshot();
      lock.commit({
        doka: Math.floor(committed.doka * 0.6),
        xp: Math.floor(committed.xp * 0.8),
      });
    });

    releaseClear();
    await Promise.all([roomClear, death]);
    assert.deepEqual(order, ["progress", "rewards", "death"]);
    assert.equal(lock.snapshot().doka, 720);
    assert.equal(lock.snapshot().xp, 8064);
  });

  it("skips applyRewards when persistRoomClear throws so a reload cannot re-farm", async () => {
    const lock = createProgressPersist({ doka: 200, xp: 50, level: 4 });
    const order: string[] = [];
    await assert.rejects(
      persistBossRushRewardsThroughLock(
        lock,
        async () => {
          order.push("progress");
          throw new Error("replica timeout");
        },
        async () => {
          lock.commit({ doka: 700, xp: 130 });
          order.push("rewards");
          return { doka: 700, xp: 130 };
        },
      ),
      /replica timeout/,
    );
    assert.deepEqual(order, ["progress"]);
    assert.equal(lock.pendingCount(), 0);
    assert.equal(lock.snapshot().doka, 200);
    assert.equal(lock.snapshot().xp, 50);
  });

  it("does not mint ghost HUD Doka when persistRoomClear throws", async () => {
    const lock = createProgressPersist({ doka: 200, xp: 50, level: 4 });
    let uiDoka = 200;
    await assert.rejects(
      persistBossRushRewardsThroughLock(
        lock,
        async () => {
          throw new Error("replica timeout");
        },
        async () => {
          lock.commit({ doka: 700 });
          uiDoka = applyShopCreditDeltaToUi(uiDoka, 500);
          return { doka: 700 };
        },
      ),
      /replica timeout/,
    );
    assert.equal(uiDoka, 200, "HUD stays unpaid until applyRewards runs");
    assert.equal(
      lock.hydrateWhenIdle({ doka: uiDoka, xp: 50, level: 4 }),
      true,
    );
    assert.equal(lock.snapshot().doka, 200);
  });
});
