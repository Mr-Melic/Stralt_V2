import { Toaster } from "@/components/ui/sonner";
import React, { lazy, Suspense, useEffect, useRef, useState } from "react";
import GameFlow from "./components/GameFlow";
import LandingPage from "./components/LandingPage";
import type { BattleRecapData } from "./components/PostBattleRecap";
import PostBattleRecap from "./components/PostBattleRecap";
import ProfileSetup from "./components/ProfileSetup";
import StarfieldBackground from "./components/StarfieldBackground";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import { useGetCallerUserProfile, useGetUserRole } from "./hooks/useQueries";
import { collectPreservedLocalStorage } from "./utils/versionGate";

/** Current app version — bump this on every deploy to force re-login and show changelog. */
const APP_VERSION = "v163";

const CHANGELOG_ITEMS = [
  "💰 Buy Doka is real-money credit: pay on Mollie, then redeem a GameKey while logged in",
  "⚗️ Items (potions) spends Doka — it is not the same door as Buy Doka",
  "💀 Death costs 20% leftover XP and 40% Doka, then the Death Realm — walk to a portal",
  "✨ The XP bar is leftover experience in the current level, not a lifetime total",
];

const AdminDashboard = lazy(() => import("./components/AdminDashboard"));

const SMALL_SCREEN_CONTINUE_KEY = "pbv_small_screen_continue";

function readSmallScreenContinue(): boolean {
  try {
    return sessionStorage.getItem(SMALL_SCREEN_CONTINUE_KEY) === "1";
  } catch {
    return false;
  }
}

function persistSmallScreenContinue(): void {
  try {
    sessionStorage.setItem(SMALL_SCREEN_CONTINUE_KEY, "1");
  } catch {
    // ignore quota / private-mode failures
  }
}

/** Warns on small screens; Continue lets the player enter anyway. */
function SmallScreenGuard({ onContinue }: { onContinue: () => void }) {
  const continueRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    continueRef.current?.focus();
  }, []);

  return (
    <dialog
      open
      data-ocid="small_screen.overlay"
      aria-labelledby="small-screen-title"
      aria-describedby="small-screen-body"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        maxWidth: "none",
        maxHeight: "none",
        margin: 0,
        border: "none",
        background: "rgba(0,0,0,0.97)",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding:
          "max(16px, env(safe-area-inset-top, 0px)) max(16px, env(safe-area-inset-right, 0px)) max(16px, env(safe-area-inset-bottom, 0px)) max(16px, env(safe-area-inset-left, 0px))",
      }}
    >
      <div
        style={{
          background: "#0d0d1a",
          border: "2px solid #8b1a1a",
          borderRadius: 12,
          padding: "32px 24px",
          maxWidth: 320,
          width: "100%",
          textAlign: "center",
          boxShadow: "0 0 40px rgba(139,26,26,0.45)",
        }}
      >
        <div style={{ fontSize: 56, lineHeight: 1, marginBottom: 16 }}>♔</div>
        <h2
          id="small-screen-title"
          style={{
            color: "#ffffff",
            fontWeight: 800,
            fontSize: 20,
            marginBottom: 12,
            fontFamily: "serif",
            letterSpacing: "0.02em",
          }}
        >
          Best on Larger Screens
        </h2>
        <p
          id="small-screen-body"
          style={{
            color: "#aaaaaa",
            fontSize: 14,
            lineHeight: 1.6,
            marginBottom: 16,
          }}
        >
          ÆSTRALTØ is designed for desktop and tablet play. For the best
          experience, use a device with a larger screen (768px or wider).
        </p>
        <button
          ref={continueRef}
          type="button"
          data-ocid="small_screen.continue_button"
          onClick={onContinue}
          className="stone-btn-crimson"
          style={{
            width: "100%",
            minHeight: 44,
            marginBottom: 12,
          }}
        >
          Continue anyway
        </button>
        <p
          style={{
            color: "rgba(150,80,80,0.75)",
            fontSize: 12,
            lineHeight: 1.5,
            borderTop: "1px solid rgba(139,26,26,0.35)",
            paddingTop: 12,
          }}
        >
          Tablets (768px+) and desktops are fully supported.
        </p>
      </div>
    </dialog>
  );
}

/** Changelog popup — shown once after each update when the player re-logs in */
function ChangelogPopup({ onDismiss }: { onDismiss: () => void }) {
  const dismissRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    dismissRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDismiss]);

  return (
    <dialog
      open
      data-ocid="changelog.overlay"
      aria-labelledby="changelog-title"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        maxWidth: "none",
        maxHeight: "none",
        margin: 0,
        border: "none",
        zIndex: 99000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(2px)",
        pointerEvents: "all",
        padding:
          "max(16px, env(safe-area-inset-top, 0px)) max(16px, env(safe-area-inset-right, 0px)) max(16px, env(safe-area-inset-bottom, 0px)) max(16px, env(safe-area-inset-left, 0px))",
      }}
    >
      <div
        style={{
          background: "linear-gradient(160deg,#0d0f1a 0%,#0a0c14 100%)",
          border: "2px solid #8b1a1a",
          borderRadius: 12,
          padding: "28px 28px 22px",
          maxWidth: 400,
          width: "calc(100% - 40px)",
          maxHeight: "min(90vh, 90dvh)",
          overflowY: "auto",
          overscrollBehavior: "contain",
          boxShadow: "0 0 60px rgba(139,26,26,0.5), 0 0 20px rgba(0,0,0,0.8)",
          fontFamily: "'Space Grotesk', system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 4,
          }}
        >
          <span style={{ fontSize: 26 }}>🧛</span>
          <h2
            id="changelog-title"
            style={{
              color: "#e74c3c",
              fontWeight: 800,
              fontSize: 18,
              fontFamily: "serif",
              letterSpacing: "0.03em",
              margin: 0,
            }}
          >
            What changed in {APP_VERSION}
          </h2>
        </div>
        <p
          style={{
            color: "rgba(200,200,200,0.55)",
            fontSize: 11,
            marginBottom: 16,
            marginTop: 4,
          }}
        >
          Game updated — please review before playing.
        </p>
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: "0 0 20px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {CHANGELOG_ITEMS.map((item) => (
            <li
              key={item}
              style={{
                background: "rgba(139,26,26,0.12)",
                border: "1px solid rgba(139,26,26,0.3)",
                borderRadius: 6,
                padding: "7px 12px",
                color: "#ddd",
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              {item}
            </li>
          ))}
        </ul>
        <button
          ref={dismissRef}
          type="button"
          data-ocid="changelog.dismiss_button"
          onClick={onDismiss}
          style={{
            width: "100%",
            padding: "10px 16px",
            minHeight: 44,
            borderRadius: 7,
            border: "1px solid #c0392b",
            background: "linear-gradient(135deg,#6a0a0a,#c0392b)",
            color: "#ffeef0",
            fontWeight: 800,
            fontSize: 13,
            cursor: "pointer",
            letterSpacing: "0.04em",
            textTransform: "uppercase" as const,
            boxShadow: "0 0 14px rgba(192,57,43,0.4)",
          }}
        >
          Got it — let me play!
        </button>
      </div>
    </dialog>
  );
}

function App() {
  const { identity } = useInternetIdentity();
  const {
    data: userProfile,
    isLoading: _profileLoading,
    isFetched,
  } = useGetCallerUserProfile();

  const { data: userRole } = useGetUserRole();
  const isAdmin = userRole === "admin";

  const isAuthenticated = !!identity;

  // Version-based forced re-login + changelog
  const [showChangelog, setShowChangelog] = useState(false);
  useEffect(() => {
    const storedVersion = localStorage.getItem("pbv_app_version");
    if (storedVersion !== APP_VERSION) {
      // New version detected — clear auth-related keys and force re-login.
      // Buff inventory is paid Doka stored only in `${principal}_inventory`.
      const allKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) allKeys.push(key);
      }
      const savedValues = collectPreservedLocalStorage(allKeys, (key) =>
        localStorage.getItem(key),
      );
      localStorage.clear();
      for (const [key, value] of Object.entries(savedValues)) {
        localStorage.setItem(key, value);
      }
      localStorage.setItem("pbv_app_version", APP_VERSION);
      localStorage.setItem("pbv_show_changelog", "true");
      // Reload to start fresh from login screen
      window.location.reload();
      return;
    }
  }, []);

  // Show changelog popup once after the first login following an update
  useEffect(() => {
    if (
      isAuthenticated &&
      localStorage.getItem("pbv_show_changelog") === "true"
    ) {
      setShowChangelog(true);
    }
  }, [isAuthenticated]);

  const handleDismissChangelog = () => {
    setShowChangelog(false);
    localStorage.setItem("pbv_show_changelog", "false");
  };

  // Small screen guard state. Bypass once the player continues or the
  // session has already rendered at a supported width so a landscape→portrait
  // rotate cannot unmount the live game tree.
  const [isSmallScreen, setIsSmallScreen] = useState(
    () => window.innerWidth < 768,
  );
  const [smallScreenBypass, setSmallScreenBypass] = useState(
    readSmallScreenContinue,
  );
  useEffect(() => {
    const check = () => setIsSmallScreen(window.innerWidth < 768);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  useEffect(() => {
    if (isSmallScreen) return;
    persistSmallScreenContinue();
    setSmallScreenBypass(true);
  }, [isSmallScreen]);

  // Admin dashboard state
  const [showAdmin, setShowAdmin] = useState(false);

  // Boost toggle lives here so the GameFlow top-bar pill can flip it.
  // WorldExploration still owns its own boostMode for reward math.
  const [boostMode, setBoostMode] = useState<"xp" | "rewards">("xp");

  // Root-level battle summary popup state — survives battle→exploration transition
  const [battleSummary, setBattleSummary] = useState<BattleRecapData | null>(
    null,
  );

  // Timeout fallback: if still loading 8s after auth, treat as "no profile" and show ProfileSetup.
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isAuthenticated && !isFetched) {
      timerRef.current = setTimeout(() => setLoadingTimedOut(true), 8000);
    } else {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (isFetched) setLoadingTimedOut(false);
    }
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isAuthenticated, isFetched]);

  const profileResolved = isFetched || loadingTimedOut;
  const isStillLoading = isAuthenticated && !profileResolved;
  const showProfileSetup = isAuthenticated && profileResolved && !userProfile;
  const showGame = isAuthenticated && profileResolved && !!userProfile;

  if (isSmallScreen && !smallScreenBypass) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "#0d0f1a",
          overflow: "hidden",
        }}
      >
        <StarfieldBackground />
        <SmallScreenGuard
          onContinue={() => {
            persistSmallScreenContinue();
            setSmallScreenBypass(true);
          }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#0d0f1a",
        overflow: "hidden",
      }}
    >
      {/* Starfield: single root-level layer at z:1, behind all content */}
      <StarfieldBackground />

      {/* Content layer: z:20 — always above starfield */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 20,
          overflow: "visible",
        }}
      >
        {/* Landing page — not authenticated */}
        {!isAuthenticated && (
          <LandingPage onAdminLogin={() => setShowAdmin(true)} />
        )}

        {/* Admin dashboard — triggered from LandingPage hidden login or Admin button */}
        {showAdmin && (
          <Suspense fallback={null}>
            <AdminDashboard
              onBack={() => setShowAdmin(false)}
              isAdmin={isAdmin}
            />
          </Suspense>
        )}

        {/* Brief loading state */}
        {isStillLoading && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "transparent",
              zIndex: 5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div
                className="animate-spin"
                style={{
                  width: 64,
                  height: 64,
                  border: "3px solid #c0392b",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  margin: "0 auto 16px",
                }}
              />
              <p
                style={{
                  color: "#c0ccd8",
                  fontFamily: "serif",
                  letterSpacing: "0.05em",
                }}
              >
                Loading...
              </p>
            </div>
          </div>
        )}

        {/* Profile setup */}
        {showProfileSetup && <ProfileSetup />}

        {/* Main game flow */}
        {showGame && userProfile && (
          <>
            <GameFlow
              boostMode={boostMode}
              onBoostToggle={() =>
                setBoostMode((m) => (m === "xp" ? "rewards" : "xp"))
              }
              // Shop is now a modal inside GameFlow
              userProfile={userProfile}
              isAdmin={isAdmin}
              onOpenAdmin={() => setShowAdmin(true)}
              onShowBattleSummary={setBattleSummary}
              battleRecapOpen={battleSummary != null}
            />
            <Toaster />

            {/* Root-level post-battle summary popup — always mounted above everything */}
            {battleSummary && (
              <div
                data-ocid="battle_summary.overlay"
                style={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 9999,
                  pointerEvents: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div style={{ pointerEvents: "auto" }}>
                  <PostBattleRecap
                    data={battleSummary}
                    onClose={() => {
                      setBattleSummary(null);
                    }}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Changelog popup — shown once per update after login */}
      {showChangelog && <ChangelogPopup onDismiss={handleDismissChangelog} />}
    </div>
  );
}

export default App;
