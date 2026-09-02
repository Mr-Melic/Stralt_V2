import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Crown, LogOut, ShoppingCart, Trophy } from "lucide-react";
import React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useGetCallerDokaBalance } from "../hooks/useAdminQueries";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useGetLeaderboard } from "../hooks/useLeaderboardQueries";
import type {
  ActiveEffect,
  BattleLogEntry,
  Character,
  UserProfile,
} from "../types/gameTypes";
import { logDebugInfo } from "../utils/debugLogger";
import {
  shouldApplyCallerDokaHydrate,
  shouldMarkCallerDokaWalletReady,
} from "../utils/dokaBalanceQuery";
import BossGuideModal from "./BossGuideModal";
import CharacterCreation from "./CharacterCreation";
import CharacterSelection from "./CharacterSelection";
import ChatPanel from "./ChatPanel";
import type { DebugContext } from "./ChatPanel";
import { TOP_BAR_PANEL_ID, panelRegistry } from "./DraggablePanel";
import type { BattleRecapData } from "./PostBattleRecap";
import WorldExploration from "./WorldExploration";

type GameStage = "selection" | "character" | "world";

interface GameFlowProps {
  userProfile: UserProfile;
  isAdmin?: boolean;
  onOpenAdmin?: () => void;
  onShowBattleSummary?: (data: BattleRecapData) => void;
  /** True while App.tsx is showing the root PostBattleRecap overlay. */
  battleRecapOpen?: boolean;
  boostMode?: "xp" | "rewards";
  onBoostToggle?: () => void;
  // onShopToggle removed — shop is now handled internally via showShop state
}

const GameFlow: React.FC<GameFlowProps> = ({
  userProfile,
  isAdmin,
  onOpenAdmin,
  onShowBattleSummary,
  battleRecapOpen = false,
  boostMode: _boostMode = "xp",
  onBoostToggle: _onBoostToggle,
  // onShopToggle removed — shop is now handled internally via showShop state
}) => {
  const [currentStage, setCurrentStage] = useState<GameStage>("selection");
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(
    null,
  );
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [activeSlot, setActiveSlot] = useState<number>(1);
  const [dungeonData, setDungeonData] = useState<Record<
    string,
    unknown
  > | null>(null);

  // Battle log state — lifted here so both WorldExploration and ChatPanel share it
  const [battleLogEntries, setBattleLogEntries] = useState<BattleLogEntry[]>(
    [],
  );
  const [activeEffects, setActiveEffects] = useState<ActiveEffect[]>([]);
  const [isInBattle, setIsInBattle] = useState(false);
  const prevIsInBattleRef = useRef(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showBossGuide, setShowBossGuide] = useState(false);
  const [showShop, setShowShop] = useState(false);
  // Doka balance: backend-authoritative via useGetCallerDokaBalance (query key
  // ['callerDokaBalance']). Local state is a session cache that WorldExploration
  // mutates synchronously (pickups, rewards, shop, healing) for immediate UI
  // feedback. Hydrate from the query on mount / character select, and once
  // when entering the world — never again while WorldExploration owns the
  // wallet. Persist-lock feat claims must not invalidate this key, and a
  // window-focus refetch is the same class of absolute snapshot: either one
  // can restore a pre-heal balance and refund spent Doka.
  const [dokaBalance, setDokaBalance] = useState(0);
  // Must flip in the same update as setDokaBalance(query). Passing
  // backendDokaBalance !== undefined is one render too early: the session
  // cache is still 0 and idle hydrate would treat that placeholder as live.
  const [dokaSessionApplied, setDokaSessionApplied] = useState(false);
  // SECTION 4 (build #325): debug context threaded up from WorldExploration so
  // ChatPanel's export-report builder can include live character/map/battle state.
  const [debugContext, setDebugContext] = useState<DebugContext | undefined>(
    undefined,
  );
  const { data: backendDokaBalance } = useGetCallerDokaBalance();
  // actor removed — not used in this component

  // Ref to the in-game top bar element so it can register itself with the
  // DraggablePanel panelRegistry. This lets panels snap to the bar via the
  // SAME mutual edge computation instead of a hardcoded constant.
  const topBarRef = useRef<HTMLDivElement>(null);

  const addBattleLogEntry = useCallback((entry: BattleLogEntry) => {
    // E3: Cap battle log at 500 entries to prevent unbounded growth and lag.
    // .slice(-500) keeps only the newest 500 entries after adding the new one.
    setBattleLogEntries((prev) => {
      const next = [...prev, entry];
      return next.length > 500 ? next.slice(-500) : next;
    });
  }, []);

  const clearBattleLog = useCallback(() => {
    setBattleLogEntries([]);
    setActiveEffects([]);
  }, []);

  // Battle-entry clear: wipe battle log when entering a new battle (false→true)
  useEffect(() => {
    if (!prevIsInBattleRef.current && isInBattle) {
      clearBattleLog();
    }
    prevIsInBattleRef.current = isInBattle;
  }, [isInBattle, clearBattleLog]);

  // addDebugLog removed — debug events now route through logDebugInfo directly

  const { clear } = useInternetIdentity();
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    await clear();
    queryClient.clear();
  };

  // Seed the session cache from the backend query. On mount this fixes the
  // previous "always 0" bug. Do not keep replacing it after WorldExploration
  // is hydrated: persistClaim / applyRewards already add their deltas onto
  // the live wallet, persist-lock claims skip this key's invalidate, and a
  // later absolute refetch (claim or window focus) refunds a recap heal.
  const worldDokaHydratedRef = useRef(false);
  useEffect(() => {
    if (currentStage !== "world") {
      worldDokaHydratedRef.current = false;
    }
    if (backendDokaBalance === undefined) return;
    if (
      !shouldApplyCallerDokaHydrate({
        backendDoka: backendDokaBalance,
        inWorld: currentStage === "world",
        alreadyHydratedInWorld: worldDokaHydratedRef.current,
      })
    ) {
      return;
    }
    setDokaBalance(backendDokaBalance);
    setDokaSessionApplied(true);
    if (currentStage === "world") {
      worldDokaHydratedRef.current = true;
    }
  }, [backendDokaBalance, currentStage]);

  // Register the in-game top bar with panelRegistry so it participates in the
  // same mutual edge-snap computation as DraggablePanels. The bar is full
  // width (left=0, right=window.innerWidth), height 48px (h-12), at y=0. We
  // re-measure on resize so the width stays live. Only registers in game mode
  // (topBarRef is null otherwise). Cleanup deletes the entry on unmount/leave
  // so it doesn't linger and phantom-snap panels in non-game stages.
  // NOTE: `isGameMode` is declared later in this component, so we depend on
  // `currentStage` directly and re-derive the game-mode check inside the effect
  // to avoid a use-before-declaration (TS2448/2454) error.
  useEffect(() => {
    const isGameMode = currentStage === "world";
    const el = topBarRef.current;
    if (!isGameMode || !el) return;
    const update = () => {
      panelRegistry[TOP_BAR_PANEL_ID] = {
        x: 0,
        y: 0,
        w: window.innerWidth,
        h: el.offsetHeight || 48,
      };
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
      delete panelRegistry[TOP_BAR_PANEL_ID];
    };
  }, [currentStage]);

  const handleCreateCharacter = (slot: number) => {
    setEditingSlot(slot);
    setSelectedCharacter(null);
    setCurrentStage("character");
  };

  const handleEditCharacter = (slot: number, character: Character) => {
    setEditingSlot(slot);
    setSelectedCharacter(character);
    setCurrentStage("character");
  };

  const handlePlayCharacter = (character: Character, slot: number) => {
    setSelectedCharacter(character);
    setActiveSlot(slot);
    setCurrentStage("world");
  };

  const handleCharacterComplete = (character: Character | null) => {
    if (!character) {
      // Cancel pressed — go back to character selection without entering game
      handleBackToSelection();
      return;
    }
    // Save finished — go back to selection so the refreshed slot list is shown
    // The player selects "Play" from there to enter the world
    handleBackToSelection();
  };

  const handleBackToSelection = () => {
    setCurrentStage("selection");
    setSelectedCharacter(null);
    setEditingSlot(null);
    setDungeonData(null);
  };

  const handleDebugLog = useCallback((event: string, detail: string) => {
    logDebugInfo("GENERAL", event, detail);
  }, []);
  const handleItemShopClose = useCallback(() => setShowShop(false), []);
  const handleAchievementsClose = useCallback(
    () => setShowAchievements(false),
    [],
  );

  const showBackButton =
    currentStage !== "selection" && currentStage !== "world";
  const isGameMode = currentStage === "world";

  // Game mode: pass through to WorldExploration directly (it handles its own layout)
  if (isGameMode && selectedCharacter !== null) {
    return (
      <>
        <WorldExploration
          character={selectedCharacter}
          dungeon={dungeonData}
          characterSlot={activeSlot}
          addBattleLogEntry={addBattleLogEntry}
          // onBattleEnd removed — battle log is cleared on battle ENTRY (false→true)
          onActiveEffectsChange={setActiveEffects}
          onInBattleChange={setIsInBattle}
          onTransitionChange={setIsTransitioning}
          userId={String(userProfile.id ?? userProfile.name ?? "guest")}
          onDebugLog={handleDebugLog}
          onShowBattleSummary={onShowBattleSummary}
          battleRecapOpen={battleRecapOpen}
          dokaBalance={dokaBalance}
          dokaWalletReady={shouldMarkCallerDokaWalletReady({
            queryResolved: backendDokaBalance !== undefined,
            sessionCacheApplied: dokaSessionApplied,
          })}
          onDokaBalanceChange={setDokaBalance}
          onDebugContextChange={setDebugContext}
          itemShopOpen={showShop}
          onItemShopClose={handleItemShopClose}
          achievementsOpen={showAchievements}
          onAchievementsClose={handleAchievementsClose}
        />
        <ChatPanel
          playerName={userProfile.name}
          battleLogEntries={battleLogEntries}
          onClearBattleLog={clearBattleLog}
          activeEffects={activeEffects}
          isPaused={isInBattle || isTransitioning}
          userId={String(userProfile.id ?? userProfile.name ?? "guest")}
          debugContext={debugContext}
          // debugLogs removed — ChatPanel now sources from structured debugLogger buffer
        />
        {/* Snap spacer only — the live XP / zone / Doka HUD lives in
            WorldExploration. A second opaque bar here used to cover that HUD
            and show 0/100 XP from an unused App.tsx prop. */}
        <div
          ref={topBarRef}
          className="fixed top-0 left-0 right-0 z-[9000] pointer-events-none"
          style={{ height: "calc(44px + env(safe-area-inset-top, 0px))" }}
          aria-hidden
        />
        {/* Realm tools sit just under the world HUD so they stay reachable
            without hiding map name, leftover XP, or the Doka chip. 44px
            min height + safe-area insets keep phone chrome tappable. */}
        <div
          className="fixed z-[9001] pointer-events-auto flex items-center gap-2 px-2 py-1"
          style={{
            top: "calc(46px + env(safe-area-inset-top, 0px))",
            right: "max(8px, env(safe-area-inset-right, 0px))",
            minHeight: 44,
            background:
              "linear-gradient(180deg, oklch(0.10 0.01 260 / 0.92), oklch(0.07 0.01 260 / 0.88))",
            border: "1px solid oklch(var(--dofus-border-gold-dim))",
            borderRadius: 6,
            boxShadow: "0 0 12px oklch(var(--dofus-border-gold) / 0.18)",
          }}
        >
          <button
            type="button"
            data-ocid="game.shop_button"
            onClick={() => setShowShop((v) => !v)}
            title="Open the item shop (buffs and potions)"
            className={`${showShop ? "stone-btn-crimson" : "stone-btn-slate"} stone-nav-btn`}
          >
            <ShoppingCart size={13} />
            <span>Items</span>
          </button>
          <button
            type="button"
            data-ocid="game.leaderboard_button"
            onClick={() => setShowLeaderboard((v) => !v)}
            title="Leaderboard"
            className={`${showLeaderboard ? "stone-btn-crimson" : "stone-btn-slate"} stone-nav-btn`}
          >
            <Trophy size={13} />
            <span>Board</span>
          </button>
          <button
            type="button"
            data-ocid="game.achievements_button"
            onClick={() => setShowAchievements((v) => !v)}
            title="Achievements"
            className={`${showAchievements ? "stone-btn-crimson" : "stone-btn-slate"} stone-nav-btn`}
          >
            <span className="text-[13px]">🏆</span>
            <span>Feats</span>
          </button>
          <button
            type="button"
            data-ocid="game.boss_guide_button"
            onClick={() => setShowBossGuide((v) => !v)}
            title="Boss guide"
            className={`${showBossGuide ? "stone-btn-crimson" : "stone-btn-slate"} stone-nav-btn`}
          >
            <Crown size={13} />
            <span>Bosses</span>
          </button>
          {isAdmin && onOpenAdmin && (
            <button
              type="button"
              data-ocid="game.admin_button"
              onClick={onOpenAdmin}
              title="Admin dashboard"
              className="stone-btn-crimson stone-nav-btn"
            >
              <span className="text-[13px]">🛡️</span>
              <span>Admin</span>
            </button>
          )}
        </div>

        {/* Boss Guide modal */}
        {showBossGuide && (
          <BossGuideModal onClose={() => setShowBossGuide(false)} open />
        )}

        {/* Leaderboard modal */}
        {showLeaderboard && (
          <LeaderboardModal onClose={() => setShowLeaderboard(false)} />
        )}

        {/* Achievements panel is hosted in WorldExploration so claims serialize
            with applyRewards / saveBattleStats. */}
      </>
    );
  }

  // Non-game stages: show header with navigation
  const renderCurrentStage = () => {
    switch (currentStage) {
      case "selection":
        return (
          <CharacterSelection
            userProfile={userProfile}
            onCreateCharacter={handleCreateCharacter}
            onEditCharacter={handleEditCharacter}
            onPlayCharacter={handlePlayCharacter}
          />
        );
      case "character":
        return (
          <CharacterCreation
            onComplete={handleCharacterComplete}
            editingSlot={editingSlot}
            existingCharacter={selectedCharacter}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden"
      style={{ zIndex: 10, background: "#0d0f1a" }}
    >
      {/* Carved-stone top bar */}
      <header
        className="stone-top-bar flex items-center justify-between gap-2 px-4 shrink-0 z-30"
        style={{
          minHeight: 48,
          height: "calc(48px + env(safe-area-inset-top, 0px))",
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingLeft: "max(16px, env(safe-area-inset-left, 0px))",
          paddingRight: "max(16px, env(safe-area-inset-right, 0px))",
        }}
      >
        <div className="flex items-center gap-3">
          {showBackButton && (
            <button
              type="button"
              onClick={handleBackToSelection}
              className="stone-btn-slate stone-nav-btn"
            >
              <ArrowLeft size={14} />
              <span className="hidden sm:inline">Back</span>
            </button>
          )}
          <div>
            <h1
              className="text-sm font-bold"
              style={{
                color: "#f0c44a",
                fontFamily: "var(--font-display)",
                letterSpacing: "0.05em",
              }}
            >
              Paper Baby Vampires
            </h1>
            <p className="text-xs" style={{ color: "#8a8090" }}>
              Welcome,{" "}
              <span style={{ color: "#d8463f" }}>{userProfile.name}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2 text-xs">
            {(["character"] as const).map((stage, i) => (
              <React.Fragment key={stage}>
                {i > 0 && (
                  <div
                    className="w-3 h-px"
                    style={{ background: "rgba(216,70,63,.3)" }}
                  />
                )}
                <span
                  className={`px-2 py-1 rounded text-xs ${currentStage === stage ? "stone-pill-gold" : "stone-pill text-[#8a8090]"}`}
                >
                  {stage === "character" ? "Character" : "Dungeon"}
                </span>
              </React.Fragment>
            ))}
          </div>
          {isAdmin && onOpenAdmin && (
            <button
              type="button"
              data-ocid="game.admin_button"
              onClick={onOpenAdmin}
              className="stone-btn-crimson stone-nav-btn"
            >
              <span className="text-[12px]">🛡️</span>
              <span>Admin</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="stone-btn-slate stone-nav-btn"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Log Out</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto stone-well">
        {renderCurrentStage()}
      </main>
    </div>
  );
};

// ─── Helpers ────────────────────────────────────────────────────────────────

// ─── Leaderboard Modal ───────────────────────────────────────────────────────

const LeaderboardModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { data: entries = [], isLoading } = useGetLeaderboard();

  return (
    <div
      data-ocid="leaderboard.dialog"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9500,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => {
        if (
          (e.key === "Enter" || e.key === " ") &&
          e.target === e.currentTarget
        )
          onClose();
      }}
      role="presentation"
    >
      <div
        className="stone-frame"
        style={{
          width: "min(640px, 94vw)",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div className="stone-header flex items-center justify-between px-5 py-3 shrink-0">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Trophy size={18} style={{ color: "#d8463f" }} />
            <span className="stone-header-title" style={{ fontSize: 16 }}>
              Leaderboard
            </span>
          </div>
          <button
            type="button"
            data-ocid="leaderboard.close_button"
            onClick={onClose}
            aria-label="Close leaderboard"
            className="stone-btn-slate"
            style={{
              width: 30,
              height: 30,
              padding: 0,
              fontSize: 18,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div
          className="stone-well"
          style={{ overflowY: "auto", flex: 1, padding: 2 }}
        >
          {isLoading && (
            <div
              data-ocid="leaderboard.loading_state"
              className="stone-well"
              style={{
                padding: 32,
                textAlign: "center",
                color: "#8a8090",
                fontSize: 13,
              }}
            >
              Loading rankings…
            </div>
          )}

          {!isLoading && entries.length === 0 && (
            <div
              data-ocid="leaderboard.empty_state"
              className="stone-well"
              style={{
                padding: 32,
                textAlign: "center",
                color: "#8a8090",
                fontSize: 13,
              }}
            >
              No players on the board yet — defeat some enemies to appear here!
            </div>
          )}

          {!isLoading && entries.length > 0 && (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 12,
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "rgba(139,0,0,0.25)",
                    position: "sticky",
                    top: 0,
                  }}
                >
                  {(
                    ["Rank", "Name", "Level", "Kills", "Achievements"] as const
                  ).map((col) => (
                    <th
                      key={col}
                      style={{
                        padding: "9px 14px",
                        color: "#dc2626",
                        fontWeight: 700,
                        textAlign:
                          col === "Rank" ||
                          col === "Level" ||
                          col === "Kills" ||
                          col === "Achievements"
                            ? "right"
                            : "left",
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        fontSize: 10,
                        borderBottom: "1px solid rgba(139,0,0,0.3)",
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.slice(0, 50).map((entry, i) => (
                  <tr
                    key={entry.principalId}
                    data-ocid={`leaderboard.item.${i + 1}`}
                    style={{
                      borderBottom: "1px solid rgba(139,0,0,0.12)",
                      background:
                        i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent",
                    }}
                  >
                    <td
                      style={{
                        padding: "8px 14px",
                        color: rankColor(i),
                        fontWeight: 700,
                        textAlign: "right",
                        minWidth: 48,
                      }}
                    >
                      {rankLabel(i)}
                    </td>
                    <td
                      style={{
                        padding: "8px 14px",
                        color: "#f5c6c6",
                        maxWidth: 180,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {entry.playerName || "Unknown"}
                    </td>
                    <td
                      style={{
                        padding: "8px 14px",
                        color: "#a8d4f0",
                        fontWeight: 600,
                        textAlign: "right",
                      }}
                    >
                      {entry.level.toLocaleString()}
                    </td>
                    <td
                      style={{
                        padding: "8px 14px",
                        color: "#dc2626",
                        fontWeight: 600,
                        textAlign: "right",
                      }}
                    >
                      {entry.killCount.toLocaleString()}
                    </td>
                    <td
                      style={{
                        padding: "8px 14px",
                        color: "#f0c040",
                        fontWeight: 600,
                        textAlign: "right",
                      }}
                    >
                      {entry.achievementsCompleted.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div
          className="stone-well"
          style={{
            padding: "8px 20px",
            color: "#8a8090",
            fontSize: 10,
            textAlign: "center",
            flexShrink: 0,
          }}
        >
          Showing top {Math.min(entries.length, 50)} players · Refreshes every
          30s
        </div>
      </div>
    </div>
  );
};

function rankColor(i: number): string {
  if (i === 0) return "#ffd700";
  if (i === 1) return "#c0c0c0";
  if (i === 2) return "#cd7f32";
  return "#5a3a3a";
}

function rankLabel(i: number): string {
  if (i === 0) return "🥇";
  if (i === 1) return "🥈";
  if (i === 2) return "🥉";
  return `#${i + 1}`;
}
export default GameFlow;
