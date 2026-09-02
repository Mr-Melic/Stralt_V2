import { Principal } from "@dfinity/principal";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  adoptPersistedResumeRoom,
  parseBossRushStateTuple,
  persistBossRushRoomAdvance,
  persistBossRushRoomClear,
  resolveBossRushQueryPrincipalText,
  resumeRoomFromPersisted,
} from "./bossRushProgress";
import { useInternetIdentity } from "./useInternetIdentity";

export interface BossRushRoom {
  roomIndex: number;
  boss1Id: string;
  boss2Id: string;
  boss1Name: string;
  boss2Name: string;
  combinedMechanic: string;
  dokaReward: number;
  xpReward: number;
}

export const BOSS_RUSH_ROOMS: BossRushRoom[] = [
  {
    roomIndex: 0,
    boss1Id: "pale_archbishop",
    boss2Id: "weeping_pawn",
    boss1Name: "Pale Archbishop",
    boss2Name: "Weeping Pawn",
    combinedMechanic:
      "Archbishop heals Pawn every 2 turns. Kill Archbishop first or Pawn resurges to 50% HP on death.",
    dokaReward: 500,
    xpReward: 200,
  },
  {
    roomIndex: 1,
    boss1Id: "crimson_countess",
    boss2Id: "fetid_rook",
    boss1Name: "Crimson Countess",
    boss2Name: "Fetid Rook",
    combinedMechanic:
      "Countess lava trails deal poison (not burn) while Rook lives. Both enrage at 50% HP simultaneously.",
    dokaReward: 750,
    xpReward: 300,
  },
  {
    roomIndex: 2,
    boss1Id: "bone_cavalier",
    boss2Id: "lord_of_static",
    boss1Name: "Bone Cavalier",
    boss2Name: "Lord of Static",
    combinedMechanic:
      "Cavalier charge gains chain lightning from Static. Static channels through Cavalier granting temporary physical immunity.",
    dokaReward: 1000,
    xpReward: 400,
  },
  {
    roomIndex: 3,
    boss1Id: "starborn_queen",
    boss2Id: "enthroned_void",
    boss1Name: "Starborn Queen",
    boss2Name: "Enthroned Void",
    combinedMechanic:
      "Queen void tiles feed the Void's mist. Void phase 2 coalesces faster based on Queen's void tile count.",
    dokaReward: 1250,
    xpReward: 500,
  },
  {
    roomIndex: 4,
    boss1Id: "void_grandmaster",
    boss2Id: "mirror_sovereign",
    boss1Name: "Void Grandmaster",
    boss2Name: "Mirror Sovereign",
    combinedMechanic:
      "Grandmaster ghost copies are reflected by Sovereign. Player must identify the real one. Sovereign mirrors 30% of all damage.",
    dokaReward: 1500,
    xpReward: 600,
  },
  {
    roomIndex: 5,
    boss1Id: "chessboard_lich",
    boss2Id: "pale_archivist",
    boss1Name: "Chessboard Lich",
    boss2Name: "Pale Archivist",
    combinedMechanic:
      "Lich curse zones are marked by Archivist scrolls. Stepping on a marked zone triggers both curse and scroll attack simultaneously.",
    dokaReward: 2000,
    xpReward: 800,
  },
  {
    roomIndex: 6,
    boss1Id: "eternal_pawn_king",
    boss2Id: "final_pawn",
    boss1Name: "Eternal Pawn King",
    boss2Name: "Final Pawn",
    combinedMechanic:
      "Final Pawn death reveals it was the real Pawn King. The visible Pawn King was the decoy all along.",
    dokaReward: 2500,
    xpReward: 1000,
  },
  {
    roomIndex: 7,
    boss1Id: "midnight_bishop",
    boss2Id: "twin_monarchs",
    boss1Name: "Midnight Bishop",
    boss2Name: "Twin Monarchs",
    combinedMechanic:
      "White Bishop syncs with Dawn Monarch, Black Bishop with Dusk. Killing one half of either pair triggers a rage burst from the survivor.",
    dokaReward: 3000,
    xpReward: 1200,
  },
  {
    roomIndex: 8,
    boss1Id: "alabaster_fortress",
    boss2Id: "broodmother_rook",
    boss1Name: "Alabaster Fortress",
    boss2Name: "Broodmother Rook",
    combinedMechanic:
      "Fortress walls spawn on larva positions. Larvae use walls as cover. Destroying a wall releases a burst of larvae.",
    dokaReward: 3500,
    xpReward: 1500,
  },
  {
    roomIndex: 9,
    boss1Id: "starved_vampire_pawn",
    boss2Id: "weeping_pawn_2",
    boss1Name: "Starved Vampire Pawn",
    boss2Name: "Weeping Pawn",
    combinedMechanic:
      "Starved Pawn feeds on HP that Weeping Pawn regenerates. Both grow stronger as the other takes damage. JACKPOT ROOM.",
    dokaReward: 5000,
    xpReward: 2000,
  },
];

export interface BossRushState {
  active: boolean;
  currentRoom: number;
  complete: boolean;
  totalDokaEarned: number;
  totalXpEarned: number;
}

const INITIAL_STATE: BossRushState = {
  active: false,
  currentRoom: 0,
  complete: false,
  totalDokaEarned: 0,
  totalXpEarned: 0,
};

export function useBossRush(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actor?: any,
  characterSlot?: number,
  principal?: Principal | string,
) {
  const { identity } = useInternetIdentity();
  const passedPrincipalText =
    typeof principal === "string" ? principal : (principal?.toText() ?? null);
  const queryPrincipalText = resolveBossRushQueryPrincipalText(
    identity?.getPrincipal?.()?.toText() ?? null,
    passedPrincipalText,
  );
  const [bossRushState, setBossRushState] =
    useState<BossRushState>(INITIAL_STATE);
  const currentRoomRef = useRef(0);
  currentRoomRef.current = bossRushState.currentRoom;
  // Bumped on abort so an in-flight persistRoomClear cannot write currentRoom
  // after death/flee already reset the run.
  const persistEpochRef = useRef(0);

  // Cache mid-run currentRoom on mount so startBossRush can resume if the
  // live getBossRushState call fails. Do not set active here — the world
  // overlay must not appear until the player actually enters the portal.
  useEffect(() => {
    if (!actor || !queryPrincipalText) return;
    const slot = BigInt(characterSlot ?? 0);
    let resolvedPrincipal: Principal | null = null;
    try {
      resolvedPrincipal = Principal.fromText(queryPrincipalText);
    } catch {
      return; // not a valid IC principal — skip backend load gracefully
    }
    if (!resolvedPrincipal) return;
    (async () => {
      try {
        const result = await actor.getBossRushState?.(resolvedPrincipal, slot);
        const parsed = parseBossRushStateTuple(result);
        if (!parsed) return;
        setBossRushState((prev) => {
          const room = adoptPersistedResumeRoom(
            prev.active,
            parsed.currentRoom,
          );
          if (room == null) return prev;
          return {
            ...prev,
            currentRoom: room,
          };
        });
      } catch (e) {
        console.error("[BossRush] Failed to load state from backend:", e);
      }
    })();
  }, [actor, characterSlot, queryPrincipalText]);

  const [_rewardMultiplier, setRewardMultiplier] = useState(1.0);

  // ── Run-complete consumer wiring ────────────────────────────────────────
  // External consumers (e.g. WorldExploration) register a callback via
  // `subscribeRunComplete`. When `bossRushState.complete` flips to true, the
  // hook fires the registered callback exactly once so the consumer can spawn
  // the white sanctuary portal, announce the run completion, and call
  // completeRun. The ref holds the latest handler so registration order does
  // not matter; the effect below is the single source of truth for firing.
  const runCompleteHandlerRef = useRef<(() => void) | null>(null);
  const subscribeRunComplete = useCallback((handler: (() => void) | null) => {
    runCompleteHandlerRef.current = handler;
  }, []);
  const runCompleteFiredRef = useRef(false);
  useEffect(() => {
    if (bossRushState.complete && !runCompleteFiredRef.current) {
      runCompleteFiredRef.current = true;
      runCompleteHandlerRef.current?.();
    }
    if (!bossRushState.complete) {
      runCompleteFiredRef.current = false;
    }
  }, [bossRushState.complete]);

  // Load admin-configured reward multiplier
  useEffect(() => {
    if (!actor) return;
    (async () => {
      try {
        const result = await actor.getBossRushConfig?.();
        const cfg = result && Array.isArray(result) ? result[0] : result;
        if (cfg) {
          const parsed = JSON.parse(cfg as string);
          if (parsed.rewardMultiplier)
            setRewardMultiplier(parsed.rewardMultiplier);
        }
      } catch (_) {
        // use default multiplier of 1.0
      }
    })();
  }, [actor]);

  const startBossRush = useCallback(async (): Promise<number> => {
    let resumeRoom = 0;
    if (actor && queryPrincipalText) {
      let resolvedPrincipal: Principal | null = null;
      try {
        resolvedPrincipal = Principal.fromText(queryPrincipalText);
      } catch {
        resolvedPrincipal = null;
      }
      if (resolvedPrincipal) {
        try {
          const result = await actor.getBossRushState?.(
            resolvedPrincipal,
            BigInt(characterSlot ?? 0),
          );
          const parsed = parseBossRushStateTuple(result);
          if (parsed) {
            resumeRoom = resumeRoomFromPersisted(parsed.currentRoom);
          }
        } catch (e) {
          console.error("[BossRush] Failed to read resume room:", e);
        }
      }
    }
    if (resumeRoom <= 0) {
      resumeRoom = resumeRoomFromPersisted(currentRoomRef.current);
    }
    setBossRushState({
      ...INITIAL_STATE,
      active: true,
      currentRoom: resumeRoom,
    });
    return resumeRoom;
  }, [actor, characterSlot, queryPrincipalText]);

  const persistRoomClear = useCallback(
    async (clearedRoomIndex: number) => {
      if (!actor) {
        throw new Error("[BossRush] persistRoomClear requires an actor");
      }
      const epoch = persistEpochRef.current;
      try {
        await persistBossRushRoomClear(
          actor,
          characterSlot ?? 0,
          clearedRoomIndex,
          { wasSuperseded: () => persistEpochRef.current !== epoch },
        );
      } catch (e) {
        console.error("[BossRush] Failed to persist room clear:", e);
        throw e;
      }
    },
    [actor, characterSlot],
  );

  const advanceBossRushRoom = useCallback(async () => {
    const epoch = persistEpochRef.current;
    let nextRoomSnapshot = 0;

    setBossRushState((prev) => {
      const nextRoom = prev.currentRoom + 1;
      const complete = nextRoom >= BOSS_RUSH_ROOMS.length;
      nextRoomSnapshot = complete ? prev.currentRoom : nextRoom;
      return {
        ...prev,
        currentRoom: nextRoomSnapshot,
        complete,
        // Room state only — rewards are handled by resolveBattleRewards
      };
    });

    if (actor) {
      try {
        // persistRoomClear already recorded the cleared room. This write is
        // the portal-step currentRoom so a tab close mid-walk can resume.
        // abortBossRush bumps persistEpoch; a late setBossRushProgress
        // after resetBossRush used to restore the next room on reload.
        await persistBossRushRoomAdvance(
          actor,
          characterSlot ?? 0,
          nextRoomSnapshot,
          { wasSuperseded: () => persistEpochRef.current !== epoch },
        );
      } catch (e) {
        console.error("[BossRush] Failed to save room progress:", e);
      }
    }
  }, [actor, characterSlot]);

  const abortBossRush = useCallback(async () => {
    persistEpochRef.current += 1;
    setBossRushState(INITIAL_STATE);
    if (actor) {
      try {
        await actor.resetBossRush?.(BigInt(characterSlot ?? 0));
      } catch (e) {
        console.error("[BossRush] Failed to reset backend state:", e);
      }
    }
  }, [actor, characterSlot]);

  const getCurrentRoom = useCallback((): BossRushRoom | null => {
    if (!bossRushState.active) return null;
    return BOSS_RUSH_ROOMS[bossRushState.currentRoom] ?? null;
  }, [bossRushState]);

  return {
    bossRushState,
    startBossRush,
    advanceBossRushRoom,
    abortBossRush,
    persistRoomClear,
    getCurrentRoom,
    BOSS_RUSH_ROOMS,
    /** True when the final boss-rush room has been cleared (run complete). */
    runComplete: bossRushState.complete,
    /** Register a one-shot callback fired when the run completes. */
    subscribeRunComplete,
  };
}
