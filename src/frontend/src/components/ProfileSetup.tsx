import type React from "react";
import { useState } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useSaveCallerUserProfile } from "../hooks/useQueries";

const ProfileSetup: React.FC = () => {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const saveProfileMutation = useSaveCallerUserProfile();
  const { clear: clearIdentity } = useInternetIdentity();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      // Drop the Internet Identity session — same clear() path GameFlow.tsx
      // handleLogout uses — which returns the user to the login screen.
      await clearIdentity();
    } catch (err) {
      console.error("Error clearing identity session:", err);
      setIsLoggingOut(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    if (name.trim().length < 2) {
      setError("Name must be at least 2 characters long");
      return;
    }

    if (name.trim().length > 50) {
      setError("Name cannot be longer than 50 characters");
      return;
    }

    try {
      // New-profile payload must include uiLayout — backend saveCallerUserProfile
      // does userProfiles.add(caller, profile) with NO field merging, so a missing
      // uiLayout key fails Candid validation. Empty string is the canonical default
      // for a brand-new account (the layout blob is set later via saveUserUiLayout).
      await saveProfileMutation.mutateAsync({
        name: name.trim(),
        uiLayout: "",
      });
    } catch (err) {
      // Surface the real backend/Candid error instead of a generic string so the
      // player can see what actually went wrong (e.g. missing-field rejection).
      const raw = err instanceof Error ? err.message : String(err);
      const message = raw.length > 160 ? `${raw.slice(0, 157)}...` : raw;
      console.error("[PROFILE] Error saving profile:", err);
      setError(message || "Failed to save profile.");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        zIndex: 20,
        padding: "24px",
      }}
    >
      {/* Decorative outer ring */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 440,
        }}
      >
        {/* Corner decorations — crimson red */}
        {[
          "top-0 left-0",
          "top-0 right-0",
          "bottom-0 left-0",
          "bottom-0 right-0",
        ].map((pos, i) => (
          <div
            key={pos}
            style={{
              position: "absolute",
              width: 20,
              height: 20,
              borderColor: "#c0392b",
              borderStyle: "solid",
              borderWidth: "2px",
              borderRight: i % 2 === 0 ? "none" : "2px solid #c0392b",
              borderLeft: i % 2 === 1 ? "none" : "2px solid #c0392b",
              borderBottom: i < 2 ? "none" : "2px solid #c0392b",
              borderTop: i >= 2 ? "none" : "2px solid #c0392b",
              top: i < 2 ? -4 : undefined,
              bottom: i >= 2 ? -4 : undefined,
              left: i % 2 === 0 ? -4 : undefined,
              right: i % 2 === 1 ? -4 : undefined,
              zIndex: 2,
            }}
          />
        ))}

        {/* Main panel */}
        <div
          style={{
            background:
              "linear-gradient(160deg,#141726 0%,#0d0f1a 60%,#0a0c14 100%)",
            border: "1px solid #7a1a1a",
            borderRadius: 12,
            boxShadow:
              "0 0 40px rgba(192,57,43,0.18), 0 0 80px rgba(192,57,43,0.06), inset 0 1px 0 rgba(192,57,43,0.12)",
            overflow: "hidden",
          }}
        >
          {/* Header band */}
          <div
            style={{
              background:
                "linear-gradient(90deg,#1a1e30 0%,#141726 50%,#0d0f1a 100%)",
              borderBottom: "1px solid #7a1a1a",
              padding: "28px 32px 24px",
              textAlign: "center",
              position: "relative",
            }}
          >
            {/* Crimson line accent top */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: "20%",
                right: "20%",
                height: 2,
                background:
                  "linear-gradient(90deg,transparent,#c0392b,transparent)",
              }}
            />
            {/* Icon */}
            <div
              style={{
                width: 72,
                height: 72,
                margin: "0 auto 16px",
                borderRadius: "50%",
                background:
                  "radial-gradient(circle at 40% 35%,#2a0a0a,#0d0f1a)",
                border: "2px solid #c0392b",
                boxShadow:
                  "0 0 20px rgba(192,57,43,0.35), inset 0 0 12px rgba(192,57,43,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 34,
                lineHeight: 1,
              }}
            >
              ♔
            </div>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 800,
                fontFamily: "serif",
                background: "linear-gradient(90deg,#c0392b,#e05545,#c0392b)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                letterSpacing: "0.06em",
                margin: 0,
                marginBottom: 6,
              }}
            >
              Create Your Identity
            </h1>
            <p style={{ color: "#6a7a8a", fontSize: 13, margin: 0 }}>
              Choose a name for your account to enter the realm
            </p>
          </div>

          {/* Form body */}
          <div style={{ padding: "28px 32px 32px" }}>
            <form
              onSubmit={handleSubmit}
              style={{ display: "flex", flexDirection: "column", gap: 20 }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label
                  htmlFor="name"
                  style={{
                    color: "#c0ccd8",
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                  }}
                >
                  Your Name
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name…"
                    disabled={saveProfileMutation.isPending}
                    data-ocid="profile_setup.input"
                    style={{
                      width: "100%",
                      padding: "13px 16px",
                      background: "#0a0c14",
                      border: "1px solid #2a3040",
                      borderRadius: 8,
                      color: "#c0ccd8",
                      fontSize: 15,
                      outline: "none",
                      boxSizing: "border-box",
                      transition: "border-color 0.2s, box-shadow 0.2s",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "#c0392b";
                      e.currentTarget.style.boxShadow =
                        "0 0 0 3px rgba(192,57,43,0.20)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "#2a3040";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  />
                </div>
              </div>

              {error && (
                <div
                  data-ocid="profile_setup.error_state"
                  style={{
                    background: "rgba(231,76,60,0.12)",
                    border: "1px solid rgba(231,76,60,0.4)",
                    borderRadius: 6,
                    padding: "8px 12px",
                    color: "#e74c3c",
                    fontSize: 13,
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                data-ocid="profile_setup.submit_button"
                disabled={saveProfileMutation.isPending}
                style={{
                  width: "100%",
                  padding: "14px",
                  background: saveProfileMutation.isPending
                    ? "rgba(192,57,43,0.4)"
                    : "linear-gradient(135deg,#8b1a14,#c0392b,#e04535)",
                  border: "1px solid #c0392b",
                  borderRadius: 8,
                  color: "#f0e0e0",
                  fontWeight: 800,
                  fontSize: 15,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  cursor: saveProfileMutation.isPending
                    ? "not-allowed"
                    : "pointer",
                  boxShadow: saveProfileMutation.isPending
                    ? "none"
                    : "0 0 18px rgba(192,57,43,0.45)",
                  transition: "box-shadow 0.2s, transform 0.1s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
                onMouseEnter={(e) => {
                  if (!saveProfileMutation.isPending) {
                    e.currentTarget.style.boxShadow =
                      "0 0 28px rgba(192,57,43,0.65)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!saveProfileMutation.isPending) {
                    e.currentTarget.style.boxShadow =
                      "0 0 18px rgba(192,57,43,0.45)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }
                }}
              >
                {saveProfileMutation.isPending ? (
                  <>
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        border: "2px solid #f0e0e0",
                        borderTopColor: "transparent",
                        borderRadius: "50%",
                        animation: "spin 0.8s linear infinite",
                      }}
                    />
                    Saving…
                  </>
                ) : (
                  <>♔ Enter the Realm</>
                )}
              </button>
            </form>

            {/* Escape hatch — subtle, muted, bottom of the card */}
            <div
              style={{
                marginTop: 20,
                paddingTop: 18,
                borderTop: "1px solid rgba(122,26,26,0.35)",
                display: "flex",
                justifyContent: "center",
              }}
            >
              <button
                type="button"
                data-ocid="profile_setup.logout_button"
                disabled={isLoggingOut || saveProfileMutation.isPending}
                onClick={handleLogout}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(122,26,26,0.5)",
                  borderRadius: 6,
                  color: "#6a7a8a",
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  padding: "8px 18px",
                  cursor:
                    isLoggingOut || saveProfileMutation.isPending
                      ? "not-allowed"
                      : "pointer",
                  opacity:
                    isLoggingOut || saveProfileMutation.isPending ? 0.6 : 1,
                  transition:
                    "color 0.2s, border-color 0.2s, box-shadow 0.2s, transform 0.1s",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
                onMouseEnter={(e) => {
                  if (!isLoggingOut && !saveProfileMutation.isPending) {
                    e.currentTarget.style.color = "#c0392b";
                    e.currentTarget.style.borderColor = "#c0392b";
                    e.currentTarget.style.boxShadow =
                      "0 0 12px rgba(192,57,43,0.25)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLoggingOut && !saveProfileMutation.isPending) {
                    e.currentTarget.style.color = "#6a7a8a";
                    e.currentTarget.style.borderColor = "rgba(122,26,26,0.5)";
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.transform = "translateY(0)";
                  }
                }}
              >
                {isLoggingOut ? "Leaving…" : "↩ Log out"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSetup;
