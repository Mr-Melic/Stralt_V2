import { useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useMemo, useRef } from "react";
import { shouldRunDecorativeCanvasLoop } from "../engine/canvasLoopActivity";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { safeExternalHref, unsafeUrl } from "../utils/adminSafety";

// ─── Animated skate-style title ──────────────────────────────────────────────
const SkateStyleTitle: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // ── Measure the full title width dynamically ─────────────────────────
    const title = "ÆSTRALTØ";
    const fontSize = 140;
    const letterSpacing = 12;
    const paddingH = 40; // 40px each side

    // Use a temporary canvas just for measurement
    const measureCtx = document.createElement("canvas").getContext("2d")!;
    measureCtx.font = `bold ${fontSize}px Arial`;
    let measuredWidth = paddingH; // start with left padding
    for (const char of title.split("")) {
      if (char === " ") {
        measuredWidth += 40;
      } else {
        measuredWidth += measureCtx.measureText(char).width + letterSpacing;
      }
    }
    measuredWidth += paddingH; // right padding

    canvas.width = Math.ceil(measuredWidth);
    canvas.height = 190; // snug: 140px font + top offset 30 + bottom margin 20

    const letters: Array<{
      char: string;
      x: number;
      cubes: Array<{
        x: number;
        y: number;
        size: number;
        brightness: number;
        targetBrightness: number;
      }>;
    }> = [];

    let currentX = paddingH;

    for (const char of title.split("")) {
      if (char === " ") {
        currentX += 40;
        continue;
      }

      ctx.font = `bold ${fontSize}px Arial`;
      const letterWidth = ctx.measureText(char).width;

      const tempCanvas = document.createElement("canvas");
      const tempCtx = tempCanvas.getContext("2d");
      if (!tempCtx) continue;

      tempCanvas.width = Math.ceil(letterWidth) + 20;
      tempCanvas.height = fontSize + 20;

      tempCtx.font = `bold ${fontSize}px Arial`;
      tempCtx.fillStyle = "white";
      tempCtx.textBaseline = "top";
      tempCtx.fillText(char, 10, 10);

      const imageData = tempCtx.getImageData(
        0,
        0,
        tempCanvas.width,
        tempCanvas.height,
      );
      const data = imageData.data;

      const cubes: Array<{
        x: number;
        y: number;
        size: number;
        brightness: number;
        targetBrightness: number;
      }> = [];

      const sampleStep = 3;
      for (let y = 0; y < tempCanvas.height; y += sampleStep) {
        for (let x = 0; x < tempCanvas.width; x += sampleStep) {
          const index = (y * tempCanvas.width + x) * 4;
          const alpha = data[index + 3];

          if (alpha > 50) {
            let isInside = true;
            const checkRadius = 4;
            for (
              let dy = -checkRadius;
              dy <= checkRadius && isInside;
              dy += 2
            ) {
              for (
                let dx = -checkRadius;
                dx <= checkRadius && isInside;
                dx += 2
              ) {
                const checkX = x + dx;
                const checkY = y + dy;
                if (
                  checkX >= 0 &&
                  checkX < tempCanvas.width &&
                  checkY >= 0 &&
                  checkY < tempCanvas.height
                ) {
                  const checkIndex = (checkY * tempCanvas.width + checkX) * 4;
                  if (data[checkIndex + 3] < 50) isInside = false;
                }
              }
            }

            if (isInside && Math.random() > 0.4) {
              const cubeSize =
                Math.random() > 0.7 ? 4 : Math.random() > 0.4 ? 3 : 2;
              cubes.push({
                x: currentX + x - 10,
                y: 30 + y - 10,
                size: cubeSize,
                brightness: Math.random() * 0.5 + 0.3,
                targetBrightness: Math.random() * 0.5 + 0.3,
              });
            }
          }
        }
      }

      letters.push({ char, x: currentX, cubes });
      currentX += letterWidth + letterSpacing;
    }

    let animationId = 0;
    let stopped = false;

    const animate = () => {
      if (stopped) return;
      // PERF-2026-09-02-058: stop the logo RAF while the tab is hidden.
      // Does not replace shadowBlur (see PERF-054).
      if (!shouldRunDecorativeCanvasLoop(document.hidden)) {
        animationId = 0;
        return;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const letter of letters) {
        ctx.strokeStyle = "#87CEEB";
        ctx.lineWidth = 3;
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textBaseline = "top";
        ctx.strokeText(letter.char, letter.x, 30);

        for (const cube of letter.cubes) {
          // Faster update: higher probability each frame
          if (Math.random() < 0.06) {
            cube.targetBrightness = Math.random() * 0.8 + 0.2;
          }
          cube.brightness += (cube.targetBrightness - cube.brightness) * 0.18;

          const pinkIntensity = Math.floor(255 * cube.brightness);
          const pink = `rgb(${Math.min(255, pinkIntensity + 120)}, ${Math.floor(pinkIntensity * 0.6)}, ${Math.floor(pinkIntensity * 0.8)})`;

          ctx.fillStyle = pink;
          ctx.fillRect(cube.x, cube.y, cube.size, cube.size);

          if (cube.brightness > 0.5) {
            ctx.shadowColor = pink;
            ctx.shadowBlur = cube.size * 1.5;
            ctx.fillRect(cube.x, cube.y, cube.size, cube.size);
            ctx.shadowBlur = 0;
          }
        }
      }

      animationId = requestAnimationFrame(animate);
    };

    const startLoop = () => {
      if (stopped) return;
      if (!shouldRunDecorativeCanvasLoop(document.hidden)) return;
      if (animationId) return;
      animationId = requestAnimationFrame(animate);
    };

    const onVisibility = () => {
      if (!shouldRunDecorativeCanvasLoop(document.hidden)) {
        if (animationId) cancelAnimationFrame(animationId);
        animationId = 0;
        return;
      }
      startLoop();
    };

    document.addEventListener("visibilitychange", onVisibility);
    startLoop();

    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", onVisibility);
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div className="flex justify-center mb-8">
      <canvas
        ref={canvasRef}
        className="max-w-full h-auto"
        style={{ imageRendering: "pixelated" }}
      />
    </div>
  );
};

// ─── Corner ornament SVG ──────────────────────────────────────────────────────
const CornerOrnament: React.FC<{ rotate?: number }> = ({ rotate = 0 }) => (
  <svg
    aria-hidden="true"
    width="36"
    height="36"
    viewBox="0 0 36 36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ transform: `rotate(${rotate}deg)`, opacity: 0.7 }}
  >
    <path d="M2 2 L14 2 L2 14" stroke="#c0392b" strokeWidth="1.5" fill="none" />
    <path d="M2 2 L8 2 L2 8" stroke="#e74c3c" strokeWidth="1" fill="none" />
    <circle cx="4" cy="4" r="1.5" fill="#e74c3c" />
    <path d="M14 2 L14 6" stroke="#c0392b" strokeWidth="1" />
    <path d="M2 14 L6 14" stroke="#c0392b" strokeWidth="1" />
  </svg>
);

// ─── Floating chess piece particle ───────────────────────────────────────────
const FloatingPiece: React.FC<{
  symbol: string;
  style: React.CSSProperties;
}> = ({ symbol, style }) => (
  <div
    aria-hidden="true"
    style={{
      position: "absolute",
      fontFamily: "serif",
      fontSize: "22px",
      color: "rgba(192,57,43,0.18)",
      userSelect: "none",
      pointerEvents: "none",
      ...style,
    }}
  >
    {symbol}
  </div>
);

// ─── Main LandingPage ─────────────────────────────────────────────────────────
interface LandingPageProps {
  /** Optional explicit login handler override; defaults to Internet Identity */
  onLogin?: () => void | Promise<void>;
  /** Called when admin successfully authenticates */
  onAdminLogin?: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onAdminLogin }) => {
  const { login, loginStatus } = useInternetIdentity();
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const [hovered, setHovered] = React.useState(false);
  const [loginError, setLoginError] = React.useState("");
  const [adBoxes, setAdBoxes] = React.useState<
    Array<[string, string, boolean]>
  >([]);

  // Triple-click detection for hidden admin trigger
  const adminClickRef = useRef<number>(0);
  const adminTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isLoggingIn = loginStatus === "logging-in";

  useEffect(() => {
    if (actor) {
      (
        actor as unknown as {
          getAdBoxes: () => Promise<Array<[string, string, boolean]>>;
        }
      )
        .getAdBoxes()
        .then((boxes) => setAdBoxes(boxes as Array<[string, string, boolean]>))
        .catch(() => {});
    }
  }, [actor]);

  const handleLogin = async () => {
    setLoginError("");
    if (onLogin) {
      await onLogin();
      return;
    }
    try {
      await login();
    } catch (error: unknown) {
      const err = error as Error;
      console.error("Login error:", err);
      if (err.message === "User is already authenticated") {
        queryClient.clear();
        setTimeout(() => login(), 300);
        return;
      }
      setLoginError(
        "Could not open Internet Identity. Allow the popup, then try Sign In again.",
      );
    }
  };

  const handleAdminTriggerClick = () => {
    adminClickRef.current += 1;
    if (adminTimerRef.current) clearTimeout(adminTimerRef.current);
    adminTimerRef.current = setTimeout(() => {
      adminClickRef.current = 0;
    }, 1500);
    if (adminClickRef.current >= 3) {
      adminClickRef.current = 0;
      // No password needed — backend enforces II-principal based admin access.
      onAdminLogin?.();
    }
  };

  // wrongPw/showAdminPrompt state removed — no password modal needed.

  const floatingPieces = useMemo(() => {
    const configs = [
      { symbol: "♔", left: "8%", dur: "18s", delay: "0s", size: 28 },
      { symbol: "♕", left: "18%", dur: "24s", delay: "-6s", size: 22 },
      { symbol: "♖", left: "30%", dur: "20s", delay: "-10s", size: 20 },
      { symbol: "♗", left: "45%", dur: "26s", delay: "-4s", size: 18 },
      { symbol: "♘", left: "58%", dur: "22s", delay: "-8s", size: 24 },
      { symbol: "♙", left: "70%", dur: "19s", delay: "-2s", size: 16 },
      { symbol: "♚", left: "80%", dur: "28s", delay: "-14s", size: 22 },
      { symbol: "♛", left: "90%", dur: "23s", delay: "-7s", size: 20 },
      { symbol: "♜", left: "5%", dur: "21s", delay: "-12s", size: 18 },
      { symbol: "♝", left: "38%", dur: "17s", delay: "-3s", size: 26 },
      { symbol: "♞", left: "62%", dur: "25s", delay: "-9s", size: 20 },
      { symbol: "♟", left: "85%", dur: "16s", delay: "-5s", size: 14 },
    ];
    return configs.map((c) => (
      <FloatingPiece
        key={c.left}
        symbol={c.symbol}
        style={{
          left: c.left,
          bottom: "-40px",
          fontSize: `${c.size}px`,
          animationName: "chessDrift",
          animationDuration: c.dur,
          animationDelay: c.delay,
          animationTimingFunction: "linear",
          animationIterationCount: "infinite",
        }}
      />
    ));
  }, []);

  return (
    <div
      className="min-h-app-viewport"
      style={{
        position: "relative",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 20,
        overflow: "hidden",
      }}
    >
      {/* Ambient radial glow */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "700px",
          height: "500px",
          background:
            "radial-gradient(ellipse at center, rgba(200,150,42,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Floating chess pieces */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          pointerEvents: "none",
          zIndex: 1,
        }}
      >
        {floatingPieces}
      </div>

      {/* ── Main panel ────────────────────────────────────────────────────── */}
      <div
        style={{
          position: "relative",
          zIndex: 21,
          width: "100%",
          maxWidth: "100%",
          padding: "0 16px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Title — unrestricted width so full name is visible; login card below is 420px */}
        <div
          style={{ margin: "0 auto", width: "fit-content", maxWidth: "100%" }}
        >
          {/* Animated title */}
          <div style={{ marginBottom: "40px", width: "100%" }}>
            <SkateStyleTitle />
          </div>

          {/* Login card */}
          <div
            style={{
              position: "relative",
              width: "100%",
              maxWidth: "420px",
              margin: "0 auto",
              borderRadius: "12px",
              background: "linear-gradient(160deg, #181c30 0%, #0d1020 100%)",
              border: "1.5px solid #c0392b",
              boxShadow:
                "0 0 40px rgba(192,57,43,0.18), 0 0 80px rgba(192,57,43,0.07), inset 0 1px 0 rgba(224,74,60,0.12)",
              padding: "40px 36px 32px",
            }}
          >
            {/* Corner ornaments */}
            <div style={{ position: "absolute", top: 10, left: 10 }}>
              <CornerOrnament rotate={0} />
            </div>
            <div style={{ position: "absolute", top: 10, right: 10 }}>
              <CornerOrnament rotate={90} />
            </div>
            <div style={{ position: "absolute", bottom: 10, left: 10 }}>
              <CornerOrnament rotate={270} />
            </div>
            <div style={{ position: "absolute", bottom: 10, right: 10 }}>
              <CornerOrnament rotate={180} />
            </div>

            {/* Gold top accent line */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: "15%",
                right: "15%",
                height: 2,
                background:
                  "linear-gradient(90deg, transparent, #e74c3c, transparent)",
                borderRadius: 2,
              }}
            />

            {/* Shield icon */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <svg
                aria-hidden="true"
                width="48"
                height="52"
                viewBox="0 0 48 52"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M24 2 L44 10 L44 26 C44 38 34 46 24 50 C14 46 4 38 4 26 L4 10 Z"
                  fill="url(#shieldGrad)"
                  stroke="#c0392b"
                  strokeWidth="1.5"
                />
                <path
                  d="M24 8 L38 14 L38 26 C38 35 31 41 24 44 C17 41 10 35 10 26 L10 14 Z"
                  fill="rgba(192,57,43,0.12)"
                />
                <text
                  x="24"
                  y="31"
                  textAnchor="middle"
                  fontSize="18"
                  fill="#e74c3c"
                  fontFamily="serif"
                >
                  ♛
                </text>
                <defs>
                  <linearGradient
                    id="shieldGrad"
                    x1="24"
                    y1="2"
                    x2="24"
                    y2="50"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop offset="0%" stopColor="#1e2640" />
                    <stop offset="100%" stopColor="#0d1020" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* Panel heading */}
            <h2
              style={{
                textAlign: "center",
                fontSize: 22,
                fontWeight: 700,
                color: "#e74c3c",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginBottom: 6,
                textShadow: "0 0 20px rgba(224,74,60,0.4)",
              }}
            >
              Enter the Realm
            </h2>
            <p
              style={{
                textAlign: "center",
                fontSize: 13,
                color: "#8a9aaa",
                marginBottom: 12,
                letterSpacing: "0.04em",
              }}
            >
              Connect with Internet Identity
            </p>
            <p
              style={{
                textAlign: "center",
                fontSize: 12,
                color: "#6a7a8a",
                marginBottom: 28,
                lineHeight: 1.45,
              }}
            >
              After you sign in, you will name your account, forge a chess-piece
              champion, then choose Play to enter the realm.
            </p>

            {/* Divider */}
            <div
              style={{
                height: 1,
                background:
                  "linear-gradient(90deg, transparent, rgba(200,150,42,0.4), transparent)",
                marginBottom: 28,
              }}
            />

            {/* Login button */}
            <button
              data-ocid="landing.login_button"
              type="button"
              onClick={handleLogin}
              disabled={isLoggingIn}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                width: "100%",
                padding: "14px 24px",
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                cursor: isLoggingIn ? "not-allowed" : "pointer",
                transition: "all 0.22s ease",
                background: isLoggingIn
                  ? "rgba(80,80,80,0.4)"
                  : hovered
                    ? "linear-gradient(135deg, #c0392b 0%, #e74c3c 50%, #c0392b 100%)"
                    : "linear-gradient(135deg, #1a1e30 0%, #242840 100%)",
                border: isLoggingIn
                  ? "1.5px solid #555"
                  : "1.5px solid #c0392b",
                color: isLoggingIn ? "#777" : hovered ? "#0d0f1a" : "#e74c3c",
                boxShadow:
                  hovered && !isLoggingIn
                    ? "0 0 24px rgba(192,57,43,0.55), 0 0 48px rgba(192,57,43,0.2), 0 -2px 0 0 rgba(224,74,60,0.3) inset"
                    : "0 2px 8px rgba(0,0,0,0.4)",
                marginBottom: 16,
                transform:
                  hovered && !isLoggingIn
                    ? "translateY(-2px)"
                    : "translateY(0)",
              }}
            >
              {isLoggingIn ? (
                <>
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      border: "2px solid #555",
                      borderTop: "2px solid #e74c3c",
                      borderRadius: "50%",
                      animation: "spin 0.8s linear infinite",
                      flexShrink: 0,
                    }}
                  />
                  Authenticating…
                </>
              ) : (
                <>
                  <svg
                    aria-hidden="true"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  Sign In with Internet Identity
                </>
              )}
            </button>
            {loginError && (
              <p
                data-ocid="landing.login_error"
                role="alert"
                style={{
                  margin: 0,
                  padding: "8px 10px",
                  borderRadius: 6,
                  border: "1px solid rgba(231,76,60,0.45)",
                  background: "rgba(231,76,60,0.12)",
                  color: "#e74c3c",
                  fontSize: 12,
                  lineHeight: 1.45,
                  textAlign: "center",
                }}
              >
                {loginError}
              </p>
            )}
          </div>
        </div>
        {/* end shared 420px column */}

        {/* Tagline strip */}
        <div
          style={{
            marginTop: 28,
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <p
            style={{
              fontSize: 12,
              color: "#4a5a6a",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            ÆSTRALTØ • Tactical Isometric RPG
          </p>
        </div>

        {/* Ad boxes — only rendered when admin has uploaded images */}
        {adBoxes.some(([imageUrl]) => imageUrl) && (
          <div
            data-ocid="landing.ad_boxes"
            style={{
              display: "flex",
              gap: "16px",
              justifyContent: "center",
              marginTop: "32px",
              flexWrap: "wrap",
              width: "100%",
              maxWidth: "680px",
            }}
          >
            {adBoxes.map(([imageUrl, linkUrl], index) =>
              imageUrl && !unsafeUrl(imageUrl) ? (
                <a
                  key={`ad-box-${index}-${imageUrl.slice(0, 10)}`}
                  href={safeExternalHref(linkUrl || "")}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-ocid={`landing.ad_box.${index + 1}`}
                  style={{
                    display: "block",
                    borderRadius: "8px",
                    overflow: "hidden",
                    border: "1px solid rgba(192,57,43,0.4)",
                    textDecoration: "none",
                    boxShadow: "0 0 12px rgba(192,57,43,0.12)",
                    transition: "box-shadow 0.2s, border-color 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.boxShadow =
                      "0 0 20px rgba(192,57,43,0.3)";
                    (e.currentTarget as HTMLAnchorElement).style.borderColor =
                      "rgba(192,57,43,0.8)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.boxShadow =
                      "0 0 12px rgba(192,57,43,0.12)";
                    (e.currentTarget as HTMLAnchorElement).style.borderColor =
                      "rgba(192,57,43,0.4)";
                  }}
                >
                  <img
                    src={imageUrl}
                    alt={`Advertisement ${index + 1}`}
                    style={{
                      width: "200px",
                      height: "150px",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                </a>
              ) : null,
            )}
          </div>
        )}
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer
        style={{
          position: "absolute",
          bottom: 16,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 12,
          color: "#364050",
          zIndex: 22,
          pointerEvents: "none",
        }}
      >
        {/* Barely-visible "v1.0" at bottom center — triple-click opens admin prompt */}
        <button
          data-ocid="landing.admin_trigger"
          onClick={handleAdminTriggerClick}
          style={{
            display: "inline-block",
            fontSize: 10,
            color: "rgba(255,255,255,0.06)",
            letterSpacing: "0.08em",
            cursor: "default",
            userSelect: "none",
            pointerEvents: "all",
            padding: "4px 12px",
          }}
          onKeyDown={(e) => e.key === "Enter" && handleAdminTriggerClick()}
          aria-label="v1.0"
          type="button"
        >
          v1.0
        </button>
        <br />
        <span style={{ pointerEvents: "all" }}>
          © 2026-{Math.max(new Date().getFullYear(), 2027)}. ÆSTRALTØ is built
          with love by Le Royalties Sergio Melicio
        </span>
      </footer>

      {/* Keyframe styles */}
      <style>{`
        @keyframes chessDrift {
          0%   { transform: translateY(0px) rotate(0deg); opacity: 0; }
          5%   { opacity: 1; }
          95%  { opacity: 0.7; }
          100% { transform: translateY(-110vh) rotate(20deg); opacity: 0; }
        }
        @keyframes spin {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
