/**
 * Pure Boss Rush progress helpers.
 *
 * Backend getBossRushState returns
 * (currentRoom, highestRoomCompleted, totalBossRushRuns) — not Doka/XP totals.
 * Room-clear rewards persist through applyRewards immediately, so currentRoom
 * must advance on clear (not on the later progression-portal step) or a reload
 * re-enters room 0 and farms the same wallet credit.
 */

export const BOSS_RUSH_ROOM_COUNT = 10;

/**
 * IC principal text is lowercase base32 groups separated by dashes
 * (`2vxsx-fae`, `aaaaa-aa`). Profile display names (`guest`, `VampireBob`)
 * never match, so getBossRushState is not called with a throwing fromText.
 */
export function isPrincipalText(value: string): boolean {
  if (typeof value !== "string" || value.length < 7) return false;
  if (value !== value.toLowerCase()) return false;
  return /^[a-z0-9]+(?:-[a-z0-9]+)+$/.test(value);
}

/**
 * getBossRushState requires userId == caller. GameFlow's `userId` is the
 * profile display name (`userProfile.id ?? name ?? "guest"`); UserProfile has
 * no id, so Principal.fromText throws and hydrate/resume skip. Writes still
 * persist via caller. Prefer the authenticated II principal text.
 */
export function resolveBossRushQueryPrincipalText(
  identityText?: string | null,
  passedText?: string | null,
): string | null {
  if (identityText && isPrincipalText(identityText)) return identityText;
  if (passedText && isPrincipalText(passedText)) return passedText;
  return null;
}

export interface ParsedBossRushState {
  currentRoom: number;
  highestRoomCompleted: number;
  totalBossRushRuns: number;
}

export function parseBossRushStateTuple(
  result: unknown,
): ParsedBossRushState | null {
  if (!Array.isArray(result) || result.length < 3) return null;
  const currentRoom = Number(result[0]);
  const highestRoomCompleted = Number(result[1]);
  const totalBossRushRuns = Number(result[2]);
  if (!Number.isFinite(currentRoom)) return null;
  return {
    currentRoom,
    highestRoomCompleted: Number.isFinite(highestRoomCompleted)
      ? highestRoomCompleted
      : 0,
    totalBossRushRuns: Number.isFinite(totalBossRushRuns)
      ? totalBossRushRuns
      : 0,
  };
}

/** Room to spawn when entering / resuming a run. 0 if no mid-run progress. */
export function resumeRoomFromPersisted(
  currentRoom: number,
  roomCount = BOSS_RUSH_ROOM_COUNT,
): number {
  if (!Number.isFinite(currentRoom) || currentRoom <= 0) return 0;
  return Math.min(Math.floor(currentRoom), roomCount - 1);
}

/**
 * Hydrate currentRoom from the canister only when no run is in progress.
 * After a room clear, persist writes nextCurrentRoom while local currentRoom
 * still names the room just cleared (the portal uses local+1). Adopting the
 * persisted value mid-run would make that portal skip a room.
 */
export function adoptPersistedResumeRoom(
  runActive: boolean,
  persistedCurrentRoom: number,
  roomCount = BOSS_RUSH_ROOM_COUNT,
): number | null {
  if (runActive) return null;
  const room = resumeRoomFromPersisted(persistedCurrentRoom, roomCount);
  return room > 0 ? room : null;
}

/** Drop slot-scoped progress so a new occupant cannot resume a prior run. */
export async function clearBossRushForSlot(
  actor: BossRushProgressActor,
  slot: number | bigint,
): Promise<void> {
  const slotId = typeof slot === "bigint" ? slot : BigInt(slot);
  await actor.resetBossRush?.(slotId);
}

export function progressAfterRoomClear(
  clearedRoomIndex: number,
  roomCount = BOSS_RUSH_ROOM_COUNT,
): { nextCurrentRoom: number; runComplete: boolean } {
  const runComplete = clearedRoomIndex >= roomCount - 1;
  return {
    nextCurrentRoom: runComplete ? 0 : clearedRoomIndex + 1,
    runComplete,
  };
}

export interface BossRushProgressActor {
  setBossRushProgress?: (slot: bigint, currentRoom: bigint) => Promise<unknown>;
  resetBossRush?: (slot: bigint) => Promise<unknown>;
  completeBossRushRoom?: (
    slot: bigint,
    roomIndex: bigint,
    dokaReward: bigint,
    xpReward: bigint,
  ) => Promise<unknown>;
}

export interface PersistBossRushRoomClearOptions {
  /**
   * When true after the progress write, the run was aborted (death/flee)
   * while this persist was in flight. Re-reset currentRoom so the late
   * write cannot resume the next occupant mid-tree.
   */
  wasSuperseded?: () => boolean;
}

/**
 * persistRoomClear used to run outside the persist lock. Lava after a room
 * clear (recap is pointer-events: none) could enqueue the death write first;
 * applyRewards then credited AFTER the penalty. An idle hydrate copied the
 * short UI over that late credit and the next persist wrote the under-count.
 *
 * Enqueue the progress write and applyRewards together so death waits and
 * penalizes the post-credit snapshot — the same order as victory persist.
 *
 * persistRoomClear must throw when currentRoom did not advance. A swallowed
 * progress error still ran applyAndCommit, so a reload re-entered the same
 * room and farmed the wallet/XP credit.
 */
export async function persistBossRushRewardsThroughLock<T>(
  lock: {
    enqueue: <U>(fn: () => Promise<U>) => Promise<U>;
  },
  persistRoomClear: () => Promise<void>,
  applyAndCommit: () => Promise<T>,
): Promise<T> {
  return lock.enqueue(async () => {
    await persistRoomClear();
    return applyAndCommit();
  });
}

/**
 * Writes currentRoom before the room-clear applyRewards so a reload cannot
 * re-enter the room that just paid out. Final-room clear resets currentRoom
 * so the jackpot room is not resumable.
 *
 * The currentRoom write is required. Optional-chaining a missing method (or
 * swallowing a replica reject) used to return successfully and let
 * applyRewards pay an unadvanced room.
 *
 * completeBossRushRoom is progress-only (0, 0). A failure there after
 * currentRoom already advanced must not skip the wallet credit — reload
 * cannot re-farm that room.
 */
export async function persistBossRushRoomClear(
  actor: BossRushProgressActor,
  slot: number,
  clearedRoomIndex: number,
  options?: PersistBossRushRoomClearOptions,
): Promise<void> {
  const { nextCurrentRoom, runComplete } =
    progressAfterRoomClear(clearedRoomIndex);
  const slotId = BigInt(slot);
  if (runComplete) {
    if (typeof actor.resetBossRush !== "function") {
      throw new Error(
        "resetBossRush is required to persist a final-room clear",
      );
    }
    await actor.resetBossRush(slotId);
  } else {
    if (typeof actor.setBossRushProgress !== "function") {
      throw new Error(
        "setBossRushProgress is required to persist a room clear",
      );
    }
    await actor.setBossRushProgress(slotId, BigInt(nextCurrentRoom));
  }
  try {
    await actor.completeBossRushRoom?.(
      slotId,
      BigInt(clearedRoomIndex),
      BigInt(0),
      BigInt(0),
    );
  } catch {
    // currentRoom already advanced; do not block applyRewards.
  }
  if (options?.wasSuperseded?.()) {
    try {
      await actor.resetBossRush?.(slotId);
    } catch {
      // Death/flee already reset locally. A late reset failure must not
      // skip the room-clear credit that already landed on the lock.
    }
  }
}

/**
 * Portal-step currentRoom write. persistRoomClear already advanced
 * currentRoom on the canister; this re-writes the room the player just
 * entered so a tab close mid-walk still resumes.
 *
 * abortBossRush bumps persistEpoch and resetBossRush. A late
 * setBossRushProgress from this call used to restore currentRoom after
 * that reset so the next portal entry resumed mid-tree.
 */
export async function persistBossRushRoomAdvance(
  actor: BossRushProgressActor,
  slot: number,
  nextCurrentRoom: number,
  options?: PersistBossRushRoomClearOptions,
): Promise<void> {
  const slotId = BigInt(slot);
  if (options?.wasSuperseded?.()) {
    try {
      await actor.resetBossRush?.(slotId);
    } catch {
      // Death/flee already reset locally.
    }
    return;
  }
  if (typeof actor.setBossRushProgress !== "function") {
    throw new Error(
      "setBossRushProgress is required to persist a room advance",
    );
  }
  await actor.setBossRushProgress(slotId, BigInt(nextCurrentRoom));
  if (options?.wasSuperseded?.()) {
    try {
      await actor.resetBossRush?.(slotId);
    } catch {
      // Death/flee already reset locally. A late reset must win.
    }
  }
}
