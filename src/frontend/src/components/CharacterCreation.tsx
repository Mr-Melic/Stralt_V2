import { RotateCw, Save, Shuffle, X } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  type ChessPieceType,
  type ViewDirection,
  chessPiecePatterns,
} from "../data/pieceArt";
import { useCreateCharacter, useUpdateCharacter } from "../hooks/useQueries";
import type { Character } from "../types/gameTypes";
import {
  championForgeVitalsFromStats,
  startingChampionStats,
} from "../utils/startingChampionStats";

interface CharacterCreationProps {
  /** Called with the saved Character on success, or null on cancel */
  onComplete: (character: Character | null) => void;
  editingSlot?: number | null;
  existingCharacter?: Character | null;
}

interface CharacterColors {
  primary: string;
  secondary: string;
  accent: string;
}

const CharacterCreation: React.FC<CharacterCreationProps> = ({
  onComplete,
  editingSlot,
  existingCharacter,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [characterName, setCharacterName] = useState(
    existingCharacter?.name || "",
  );
  const [currentView, setCurrentView] = useState<ViewDirection>("front");
  const [selectedPiece, setSelectedPiece] = useState<ChessPieceType>(
    (existingCharacter?.pieceType as ChessPieceType) || "king",
  );
  const [pixelPattern, setPixelPattern] = useState<number[][]>([]);
  const [colors, setColors] = useState<CharacterColors>({
    primary:
      (existingCharacter?.colors as string[] | undefined)?.[0] || "#F5F5F5",
    secondary:
      (existingCharacter?.colors as string[] | undefined)?.[1] || "#D3D3D3",
    accent:
      (existingCharacter?.colors as string[] | undefined)?.[2] || "#000000",
  });

  const createCharacterMutation = useCreateCharacter();
  const updateCharacterMutation = useUpdateCharacter();

  const isEditing = !!existingCharacter;
  const forgeVitals = championForgeVitalsFromStats(existingCharacter?.stats);

  // chessPiecePatterns is imported from ../data/pieceArt (single source of truth).

  // Generate random colors for the character
  const generateRandomColors = (): CharacterColors => {
    const colorPalette = [
      "#FF6B6B",
      "#4ECDC4",
      "#45B7D1",
      "#96CEB4",
      "#FFEAA7",
      "#DDA0DD",
      "#98D8C8",
      "#F7DC6F",
      "#BB8FCE",
      "#85C1E9",
      "#F8C471",
      "#82E0AA",
      "#F1948A",
      "#85C1E9",
      "#D7BDE2",
      "#A3E4D7",
      "#F9E79F",
      "#D5A6BD",
      "#AED6F1",
      "#A9DFBF",
      "#FAD7A0",
      "#E8DAEF",
      "#D1F2EB",
      "#FCF3CF",
      "#FADBD8",
    ];

    const shuffled = [...colorPalette].sort(() => Math.random() - 0.5);

    return {
      primary: shuffled[0],
      secondary: shuffled[1],
      accent: shuffled[2],
    };
  };

  // Generate random pixel pattern variation
  const generateRandomPattern = (basePiece: ChessPieceType): number[][] => {
    const basePattern = chessPiecePatterns[basePiece][currentView];
    const newPattern = basePattern.map((row) =>
      row.map((pixel) => {
        if (pixel === 0) return 0; // Keep transparent pixels
        // Add some randomization to non-transparent pixels
        const variation = Math.random();
        if (variation < 0.1) return 0; // 10% chance to make transparent
        if (variation < 0.3) return 1; // 20% chance for secondary color
        return 2; // 70% chance for primary color
      }),
    );
    return newPattern;
  };

  // Initialize with existing character data or random colors and pattern
  // biome-ignore lint/correctness/useExhaustiveDependencies: generateRandom* are stable functions, currentView handled by separate effect
  useEffect(() => {
    if (!existingCharacter) {
      setColors(generateRandomColors());
      setPixelPattern(generateRandomPattern(selectedPiece));
    } else {
      // Parse existing character's pixel pattern if available
      try {
        const parsedPattern = JSON.parse(
          existingCharacter.pixelPattern ?? "{}",
        );
        if (parsedPattern?.[currentView]) {
          setPixelPattern(parsedPattern[currentView]);
        } else {
          setPixelPattern(chessPiecePatterns[selectedPiece][currentView]);
        }
      } catch {
        setPixelPattern(chessPiecePatterns[selectedPiece][currentView]);
      }
    } // end existingCharacter block
  }, [selectedPiece, existingCharacter]);

  // Update pattern when view changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: pixelPattern.length is checked only to guard empty state
  useEffect(() => {
    if (pixelPattern.length > 0) {
      setPixelPattern(chessPiecePatterns[selectedPiece][currentView]);
    }
  }, [currentView, selectedPiece]);

  // Draw pixel character
  const drawPixelCharacter = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      const scale = 10; // Scale factor for pixel art (upscaled for crispness)
      const offsetX = (ctx.canvas.width - 8 * scale) / 2; // Center horizontally
      const offsetY = (ctx.canvas.height - 8 * scale) / 2; // Center vertically

      const pattern =
        pixelPattern.length > 0
          ? pixelPattern
          : chessPiecePatterns[selectedPiece][currentView];

      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          const pixel = pattern[y][x];
          if (pixel === 0) continue; // Skip transparent pixels

          let color: string;
          switch (pixel) {
            case 1:
              color = colors.secondary;
              break;
            case 2:
              color = colors.primary;
              break;
            default:
              color = colors.accent;
          }

          ctx.fillStyle = color;
          ctx.fillRect(offsetX + x * scale, offsetY + y * scale, scale, scale);

          // Add pixel border for definition
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 0.5;
          ctx.strokeRect(
            offsetX + x * scale,
            offsetY + y * scale,
            scale,
            scale,
          );
        }
      }
    },
    [pixelPattern, selectedPiece, currentView, colors],
  );

  // Character rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const renderCharacter = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw pixel character
      drawPixelCharacter(ctx);
    };

    renderCharacter();
    setIsReady(true);
  }, [drawPixelCharacter]);

  const rotateView = () => {
    const views: ViewDirection[] = ["front", "right", "back", "left"];
    const currentIndex = views.indexOf(currentView);
    const nextIndex = (currentIndex + 1) % views.length;
    setCurrentView(views[nextIndex]);
  };

  const randomizePattern = () => {
    setColors(generateRandomColors());
    setPixelPattern(generateRandomPattern(selectedPiece));
  };

  const viewLabels = {
    front: "Front View",
    back: "Back View",
    left: "Left View",
    right: "Right View",
  };

  const pieceLabels = {
    king: "King",
    queen: "Queen",
    pawn: "Pawn",
    rook: "Rook",
    bishop: "Bishop",
    knight: "Knight",
  };

  const isSaving =
    createCharacterMutation.isPending || updateCharacterMutation.isPending;
  // Saving state message for retry feedback
  const [saveAttempt, setSaveAttempt] = useState(0);
  // Guard: prevent cancel while saving from inadvertently loading the game
  const isSavingRef = useRef(false);

  const handleSave = async () => {
    if (!characterName.trim()) {
      toast.error("Please enter a character name");
      return;
    }

    if (!editingSlot) {
      toast.error("No slot selected");
      return;
    }

    isSavingRef.current = true;
    const maxAttempts = 3;
    let lastError: unknown;

    // Build a complete Character payload matching the backend interface
    const characterData: Character = {
      name: characterName.trim(),
      pieceType: selectedPiece,
      level: existingCharacter?.level ?? BigInt(1),
      experience: existingCharacter?.experience ?? BigInt(0),
      dokaBalance: existingCharacter?.dokaBalance ?? BigInt(0),
      stats: existingCharacter?.stats ?? startingChampionStats(),
      pixelPattern: JSON.stringify(chessPiecePatterns[selectedPiece]),
      colors: [colors.primary, colors.secondary, colors.accent],
      rotation: BigInt(0),
      spellLevelKeys:
        (existingCharacter?.spellLevelKeys as string[] | undefined) ?? [],
      spellLevelValues:
        (existingCharacter?.spellLevelValues as bigint[] | undefined) ?? [],
    };

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      setSaveAttempt(attempt);
      try {
        type BackendResult =
          | { __kind__: "ok"; ok: null }
          | { __kind__: "err"; err: string };
        let result: BackendResult;

        if (isEditing) {
          result = (await updateCharacterMutation.mutateAsync({
            slot: BigInt(editingSlot),
            character: characterData,
          })) as BackendResult;
        } else {
          result = (await createCharacterMutation.mutateAsync({
            slot: BigInt(editingSlot),
            character: characterData,
          })) as BackendResult;
        }

        // Check for backend-level error in the Result type
        if (result?.__kind__ === "err") {
          throw new Error(result.err || "Backend returned an error");
        }

        toast.success(
          isEditing
            ? "Champion updated. Choose Play on a slot to return to the realm."
            : "Champion forged. Choose Play on a slot to enter the realm.",
        );
        isSavingRef.current = false;
        setSaveAttempt(0);
        // Return to selection screen — pass back the saved character data
        onComplete(characterData);
        return;
      } catch (error) {
        lastError = error;
        const msg = error instanceof Error ? error.message : String(error);
        console.error(
          `Error saving character (attempt ${attempt}/${maxAttempts}): ${msg}`,
          error,
        );
        if (attempt < maxAttempts) {
          // Wait 1s before retry
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    }

    // All attempts failed
    isSavingRef.current = false;
    setSaveAttempt(0);
    const errMsg =
      lastError instanceof Error ? lastError.message : "Unknown error";
    console.error("All save attempts failed:", lastError);
    toast.error(`Failed to save character: ${errMsg}`);
  };
  const panel: React.CSSProperties = {
    background: "linear-gradient(160deg,#141726 0%,#0d0f1a 100%)",
    border: "1px solid #7a1a1a",
    borderRadius: 10,
    boxShadow:
      "0 0 18px rgba(192,57,43,0.12), inset 0 1px 0 rgba(192,57,43,0.08)",
    overflow: "hidden",
  };
  const panelHeader: React.CSSProperties = {
    background: "linear-gradient(90deg,#1a0e0e 0%,#0d0f1a 100%)",
    borderBottom: "1px solid #2a1a1a",
    padding: "10px 16px",
  };
  const _sectionTitle: React.CSSProperties = {
    color: "#e74c3c",
    fontSize: 11,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    margin: 0,
  };

  return (
    <div
      style={{
        background: "#0d0f1a",
        minHeight: "100%",
        padding: "28px 20px 36px",
        boxSizing: "border-box",
        position: "relative",
        zIndex: 20,
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              width: 160,
              height: 1,
              background:
                "linear-gradient(90deg,transparent,#c0392b,transparent)",
              margin: "0 auto 16px",
            }}
          />
          <h1
            style={{
              fontSize: 24,
              fontWeight: 900,
              fontFamily: "serif",
              background: "linear-gradient(90deg,#c0392b,#e74c3c,#c0392b)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              letterSpacing: "0.08em",
              margin: "0 0 6px",
            }}
          >
            {isEditing ? "\u2657 Edit Champion" : "\u2657 Forge a Champion"}
          </h1>
          <p style={{ color: "#6a7a8a", fontSize: 13, margin: 0 }}>
            {isEditing
              ? "Modify your champion's appearance and name"
              : "Choose your chess piece and customize the pixel art design"}
          </p>
        </div>

        {/* Main 2-col layout: preview left, controls right */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.6fr",
            gap: 20,
            alignItems: "start",
          }}
          className="creation-layout"
        >
          {/* LEFT — Preview showcase */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Canvas frame */}
            <div style={panel}>
              <div style={panelHeader}>
                <p className="dofus-section-header" style={{ margin: 0 }}>
                  ◆ Preview
                </p>
              </div>
              <div
                style={{
                  padding: "20px 16px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                {/* Gold-framed canvas */}
                <div
                  style={{
                    position: "relative",
                    display: "inline-block",
                  }}
                >
                  {/* Outer glow frame */}
                  <div
                    style={{
                      border: "2px solid #c0392b",
                      borderRadius: 12,
                      padding: 3,
                      background: "linear-gradient(135deg,#1a1e30,#0a0c14)",
                      boxShadow:
                        "0 0 24px rgba(192,57,43,0.3), 0 0 60px rgba(192,57,43,0.08)",
                    }}
                  >
                    <canvas
                      ref={canvasRef}
                      width={320}
                      height={280}
                      data-ocid="character_creation.canvas_target"
                      style={{
                        imageRendering: "pixelated",
                        display: "block",
                        borderRadius: 8,
                        background: "#0a0c14",
                        width: 240,
                        height: 210,
                      }}
                    />
                  </div>
                  {/* View label badge */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: -10,
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: "#141726",
                      border: "1px solid #c0392b",
                      borderRadius: 4,
                      padding: "2px 10px",
                      color: "#e74c3c",
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {viewLabels[currentView]}
                  </div>
                </div>

                {/* View tabs */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4,1fr)",
                    gap: 6,
                    width: "100%",
                    marginTop: 8,
                  }}
                >
                  {(["front", "right", "back", "left"] as ViewDirection[]).map(
                    (view) => (
                      <button
                        type="button"
                        key={view}
                        onClick={() => setCurrentView(view)}
                        data-ocid={`character_creation.view_${view}`}
                        style={{
                          padding: "7px 4px",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: "capitalize",
                          cursor: "pointer",
                          border:
                            currentView === view
                              ? "1px solid #c0392b"
                              : "1px solid #2a3040",
                          background:
                            currentView === view
                              ? "linear-gradient(135deg,rgba(192,57,43,0.2),rgba(192,57,43,0.08))"
                              : "#141726",
                          color: currentView === view ? "#e74c3c" : "#6a7a8a",
                          boxShadow:
                            currentView === view
                              ? "0 0 8px rgba(192,57,43,0.2)"
                              : "none",
                          transition: "all 0.15s",
                        }}
                      >
                        {view}
                      </button>
                    ),
                  )}
                </div>

                {/* Rotate + Randomize */}
                <div style={{ display: "flex", gap: 8, width: "100%" }}>
                  <button
                    type="button"
                    onClick={rotateView}
                    data-ocid="character_creation.rotate_button"
                    style={{
                      flex: 1,
                      padding: "9px",
                      borderRadius: 7,
                      cursor: "pointer",
                      background: "#141726",
                      border: "1px solid #7a1a1a",
                      color: "#c0392b",
                      fontWeight: 700,
                      fontSize: 12,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      transition: "border-color 0.15s, box-shadow 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#c0392b";
                      e.currentTarget.style.boxShadow =
                        "0 0 8px rgba(192,57,43,0.25)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#7a1a1a";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <RotateCw style={{ width: 13, height: 13 }} />
                    Rotate
                  </button>
                  <button
                    type="button"
                    onClick={randomizePattern}
                    data-ocid="character_creation.randomize_button"
                    style={{
                      flex: 1,
                      padding: "9px",
                      borderRadius: 7,
                      cursor: "pointer",
                      background: "#141726",
                      border: "1px solid #1a5c2a",
                      color: "#27ae60",
                      fontWeight: 700,
                      fontSize: 12,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      transition: "border-color 0.15s, box-shadow 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#27ae60";
                      e.currentTarget.style.boxShadow =
                        "0 0 8px rgba(39,174,96,0.25)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#1a5c2a";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <Shuffle style={{ width: 13, height: 13 }} />
                    Randomize
                  </button>
                </div>
              </div>
            </div>

            {/* Color scheme panel */}
            <div style={panel}>
              <div style={panelHeader}>
                <p className="dofus-section-header" style={{ margin: 0 }}>
                  ◆ Color Scheme
                </p>
              </div>
              <div
                style={{
                  padding: "14px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                {(
                  [
                    { key: "primary" as const, label: "Primary" },
                    { key: "secondary" as const, label: "Secondary" },
                    { key: "accent" as const, label: "Accent" },
                  ] as { key: keyof CharacterColors; label: string }[]
                ).map(({ key, label }) => (
                  <div
                    key={key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background:
                        "linear-gradient(90deg,rgba(192,57,43,0.06),rgba(0,0,0,0.25))",
                      borderRadius: 6,
                      padding: "9px 12px",
                      border: "1px solid rgba(192,57,43,0.12)",
                    }}
                  >
                    <span
                      style={{
                        color: "#e74c3c",
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: "uppercase" as const,
                        letterSpacing: "0.08em",
                        minWidth: 70,
                      }}
                    >
                      {label}
                    </span>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 5,
                          background: colors[key],
                          border: "1px solid rgba(192,57,43,0.3)",
                          boxShadow: `0 0 6px ${colors[key]}66`,
                        }}
                      />
                      <span
                        style={{
                          color: "#6a7a8a",
                          fontSize: 11,
                          fontFamily: "monospace",
                        }}
                      >
                        {colors[key]}
                      </span>
                      <input
                        type="color"
                        value={colors[key]}
                        onChange={(e) =>
                          setColors((prev) => ({
                            ...prev,
                            [key]: e.target.value,
                          }))
                        }
                        data-ocid={`character_creation.${key}_color`}
                        style={{
                          width: 28,
                          height: 28,
                          border: "1px solid #7a1a1a",
                          borderRadius: 5,
                          background: "#141726",
                          cursor: "pointer",
                          padding: 1,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT — Controls */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Name input */}
            <div style={panel}>
              <div style={panelHeader}>
                <p className="dofus-section-header" style={{ margin: 0 }}>
                  ◆ Champion Name
                </p>
              </div>
              <div style={{ padding: "14px 16px" }}>
                <input
                  id="characterName"
                  value={characterName}
                  onChange={(e) => setCharacterName(e.target.value)}
                  placeholder="Enter a name for your champion\u2026"
                  maxLength={20}
                  data-ocid="character_creation.name_input"
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    background: "#0a0c14",
                    border: "1px solid #2a3040",
                    borderRadius: 8,
                    color: "#c0ccd8",
                    fontSize: 16,
                    fontFamily: "serif",
                    outline: "none",
                    boxSizing: "border-box",
                    transition: "border-color 0.2s, box-shadow 0.2s",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#c0392b";
                    e.currentTarget.style.boxShadow =
                      "0 0 0 3px rgba(192,57,43,0.15)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#2a3040";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>
            </div>

            {/* Piece selector */}
            <div style={panel}>
              <div style={panelHeader}>
                <p className="dofus-section-header" style={{ margin: 0 }}>
                  ◆ Choose Your Piece
                </p>
              </div>
              <div
                style={{
                  padding: "14px 16px",
                  display: "grid",
                  gridTemplateColumns: "repeat(3,1fr)",
                  gap: 8,
                }}
              >
                {(Object.keys(chessPiecePatterns) as ChessPieceType[]).map(
                  (piece) => {
                    const isSelected = selectedPiece === piece;
                    return (
                      <button
                        type="button"
                        key={piece}
                        onClick={() => setSelectedPiece(piece)}
                        data-ocid={`character_creation.piece_${piece}`}
                        style={{
                          padding: "12px 8px",
                          borderRadius: 8,
                          cursor: "pointer",
                          border: isSelected
                            ? "1px solid #c0392b"
                            : "1px solid #2a3040",
                          background: isSelected
                            ? "linear-gradient(135deg,rgba(192,57,43,0.18),rgba(192,57,43,0.06))"
                            : "rgba(255,255,255,0.02)",
                          boxShadow: isSelected
                            ? "0 0 12px rgba(192,57,43,0.25)"
                            : "none",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 4,
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.borderColor = "#7a1a1a";
                            e.currentTarget.style.background =
                              "rgba(192,57,43,0.06)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.borderColor = "#2a3040";
                            e.currentTarget.style.background =
                              "rgba(255,255,255,0.02)";
                          }
                        }}
                      >
                        <span
                          style={{
                            fontSize: 24,
                            lineHeight: 1,
                            color: isSelected ? "#e74c3c" : "#c0ccd8",
                            textShadow: isSelected
                              ? "0 0 10px rgba(240,192,96,0.5)"
                              : "none",
                          }}
                        >
                          {piece === "king" && "\u2654"}
                          {piece === "queen" && "\u2655"}
                          {piece === "pawn" && "\u2659"}
                          {piece === "rook" && "\u2656"}
                          {piece === "bishop" && "\u2657"}
                          {piece === "knight" && "\u2658"}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            color: isSelected ? "#e74c3c" : "#6a7a8a",
                          }}
                        >
                          {pieceLabels[piece]}
                        </span>
                      </button>
                    );
                  },
                )}
              </div>
            </div>

            {/* Piece details */}
            <div style={panel}>
              <div style={panelHeader}>
                <p className="dofus-section-header" style={{ margin: 0 }}>
                  ◆ Piece Details
                </p>
              </div>
              <div
                style={{
                  padding: "12px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {[
                  {
                    label: "Type",
                    value: pieceLabels[selectedPiece],
                    color: "#e74c3c",
                  },
                  { label: "Style", value: "Pixel Art", color: "#3498db" },
                  { label: "Views", value: "4 Directions", color: "#27ae60" },
                ].map(({ label, value, color }) => (
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderBottom: "1px solid #1e2436",
                      paddingBottom: 8,
                    }}
                  >
                    <span style={{ color: "#6a7a8a", fontSize: 12 }}>
                      {label}
                    </span>
                    <span style={{ color, fontSize: 12, fontWeight: 700 }}>
                      {value}
                    </span>
                  </div>
                ))}
                <div
                  data-ocid="character_creation.starting_vitals"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                    paddingTop: 2,
                  }}
                  title={
                    isEditing
                      ? "Persisted combat vitals for this champion"
                      : "Starting combat vitals applied on save"
                  }
                >
                  {(
                    [
                      ["HP", forgeVitals.hp, "#e74c3c"],
                      ["AP", forgeVitals.ap, "#c9a227"],
                      ["MP", forgeVitals.mp, "#27ae60"],
                      ["INIT", forgeVitals.init, "#d4a84b"],
                    ] as const
                  ).map(([label, value, color]) => (
                    <div
                      key={label}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 2,
                        flex: 1,
                      }}
                    >
                      <span
                        style={{
                          color: "#6a7a8a",
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                        }}
                      >
                        {label}
                      </span>
                      <span
                        style={{
                          color,
                          fontSize: 13,
                          fontWeight: 800,
                          fontFamily: "JetBrains Mono, ui-monospace, monospace",
                        }}
                      >
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={() => {
                  // Block cancel while actively saving to prevent accidental game load
                  if (isSavingRef.current) return;
                  onComplete(null);
                }}
                disabled={isSaving}
                data-ocid="character_creation.cancel_button"
                style={{
                  flex: 1,
                  padding: "13px",
                  borderRadius: 8,
                  cursor: isSaving ? "not-allowed" : "pointer",
                  background: "#141726",
                  border: "1px solid #2a3040",
                  color: isSaving ? "#3a4050" : "#6a7a8a",
                  fontWeight: 700,
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  transition: "border-color 0.15s, color 0.15s",
                }}
                onMouseEnter={(e) => {
                  if (!isSaving) {
                    e.currentTarget.style.borderColor = "#4a5060";
                    e.currentTarget.style.color = "#c0ccd8";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#2a3040";
                  e.currentTarget.style.color = isSaving
                    ? "#3a4050"
                    : "#6a7a8a";
                }}
              >
                <X style={{ width: 14, height: 14 }} />
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!isReady || !characterName.trim() || isSaving}
                title={
                  isSaving
                    ? "Saving champion…"
                    : !characterName.trim()
                      ? "Enter a champion name to continue"
                      : !isReady
                        ? "Preview is still drawing"
                        : isEditing
                          ? "Save appearance and name, then Play from your slots"
                          : "Save this champion, then Play from your slots"
                }
                data-ocid="character_creation.save_button"
                style={{
                  flex: 2,
                  padding: "13px",
                  borderRadius: 8,
                  cursor:
                    !isReady || !characterName.trim() || isSaving
                      ? "not-allowed"
                      : "pointer",
                  background:
                    !isReady || !characterName.trim() || isSaving
                      ? "rgba(192,57,43,0.2)"
                      : "linear-gradient(135deg,#6a0e0e,#c0392b,#e74c3c)",
                  border: "1px solid #c0392b",
                  color:
                    !isReady || !characterName.trim() || isSaving
                      ? "rgba(231,76,60,0.5)"
                      : "#fff",
                  fontWeight: 800,
                  fontSize: 13,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  boxShadow:
                    !isReady || !characterName.trim() || isSaving
                      ? "none"
                      : "0 0 16px rgba(192,57,43,0.4)",
                  transition: "box-shadow 0.2s, transform 0.1s",
                }}
                onMouseEnter={(e) => {
                  if (isReady && characterName.trim() && !isSaving) {
                    e.currentTarget.style.boxShadow =
                      "0 0 26px rgba(192,57,43,0.6)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow =
                    "0 0 16px rgba(192,57,43,0.4)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {isSaving ? (
                  <>
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        border: "2px solid #0d0f1a",
                        borderTopColor: "transparent",
                        borderRadius: "50%",
                        animation: "spin 0.8s linear infinite",
                      }}
                    />
                    {saveAttempt > 1
                      ? `Saving\u2026 (${saveAttempt}/3)`
                      : isEditing
                        ? "Updating\u2026"
                        : "Creating\u2026"}
                  </>
                ) : (
                  <>
                    <Save style={{ width: 14, height: 14 }} />
                    {isEditing ? "Update Champion" : "Create Champion"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Responsive: stack on small screens */}
      <style>{`
        @media (max-width: 768px) {
          .creation-layout {
            grid-template-columns: 1fr !important;
          }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default CharacterCreation;
