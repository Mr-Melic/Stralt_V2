import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Castle,
  ChevronLeft,
  ChevronRight,
  Crown,
  Edit,
  Play,
  Plus,
  RotateCw,
  Shield,
  Swords,
  Trash2,
  Zap,
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDeleteCharacter, useGetCharacterSlots } from "../hooks/useQueries";
import type { Character, UserProfile } from "../types/gameTypes";
import { xpHudProgress } from "../utils/xpCurve";
import BloodParticles from "./BloodParticles";

/* ── Stone-style helpers removed — using .stone-* utility classes ───────── */

interface CharacterSelectionProps {
  userProfile: UserProfile;
  onCreateCharacter: (slot: number) => void;
  onEditCharacter: (slot: number, character: Character) => void;
  onPlayCharacter: (character: Character, slot: number) => void;
}

type ViewDirection = "front" | "back" | "left" | "right";
type ChessPieceType = "king" | "queen" | "pawn" | "rook" | "bishop" | "knight";

const CHESS_PIECE_PATTERNS: Record<
  ChessPieceType,
  Record<ViewDirection, number[][]>
> = {
  king: {
    front: [
      [0, 0, 1, 2, 2, 1, 0, 0],
      [0, 1, 2, 1, 1, 2, 1, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
    ],
    back: [
      [0, 0, 1, 2, 2, 1, 0, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
    ],
    left: [
      [0, 0, 1, 2, 2, 1, 0, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
    ],
    right: [
      [0, 0, 1, 2, 2, 1, 0, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
    ],
  },
  queen: {
    front: [
      [0, 1, 0, 1, 1, 0, 1, 0],
      [1, 2, 1, 2, 2, 1, 2, 1],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
    ],
    back: [
      [0, 1, 0, 1, 1, 0, 1, 0],
      [1, 2, 1, 2, 2, 1, 2, 1],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
    ],
    left: [
      [0, 1, 0, 1, 1, 0, 1, 0],
      [1, 2, 1, 2, 2, 1, 2, 1],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
    ],
    right: [
      [0, 1, 0, 1, 1, 0, 1, 0],
      [1, 2, 1, 2, 2, 1, 2, 1],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
    ],
  },
  pawn: {
    front: [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 1, 2, 2, 1, 0, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
    ],
    back: [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 1, 2, 2, 1, 0, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
    ],
    left: [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 1, 2, 2, 1, 0, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
    ],
    right: [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 1, 2, 2, 1, 0, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
    ],
  },
  rook: {
    front: [
      [1, 0, 1, 0, 0, 1, 0, 1],
      [2, 1, 2, 1, 1, 2, 1, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
    ],
    back: [
      [1, 0, 1, 0, 0, 1, 0, 1],
      [2, 1, 2, 1, 1, 2, 1, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
    ],
    left: [
      [1, 0, 1, 0, 0, 1, 0, 1],
      [2, 1, 2, 1, 1, 2, 1, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
    ],
    right: [
      [1, 0, 1, 0, 0, 1, 0, 1],
      [2, 1, 2, 1, 1, 2, 1, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
    ],
  },
  bishop: {
    front: [
      [0, 0, 0, 1, 1, 0, 0, 0],
      [0, 0, 1, 2, 2, 1, 0, 0],
      [0, 1, 2, 1, 1, 2, 1, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
    ],
    back: [
      [0, 0, 0, 1, 1, 0, 0, 0],
      [0, 0, 1, 2, 2, 1, 0, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
    ],
    left: [
      [0, 0, 0, 1, 1, 0, 0, 0],
      [0, 0, 1, 2, 2, 1, 0, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
    ],
    right: [
      [0, 0, 0, 1, 1, 0, 0, 0],
      [0, 0, 1, 2, 2, 1, 0, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [0, 1, 2, 2, 2, 2, 1, 0],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
    ],
  },
  knight: {
    front: [
      [0, 0, 1, 2, 1, 0, 0, 0],
      [0, 1, 2, 2, 2, 1, 0, 0],
      [1, 2, 2, 1, 2, 2, 1, 0],
      [1, 2, 2, 2, 2, 2, 1, 0],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
    ],
    back: [
      [0, 0, 0, 1, 2, 1, 0, 0],
      [0, 0, 1, 2, 2, 2, 1, 0],
      [0, 1, 2, 2, 1, 2, 2, 1],
      [0, 1, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
    ],
    left: [
      [0, 0, 1, 2, 1, 0, 0, 0],
      [0, 1, 2, 2, 2, 1, 0, 0],
      [1, 2, 2, 1, 2, 2, 1, 0],
      [1, 2, 2, 2, 2, 2, 1, 0],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
    ],
    right: [
      [0, 0, 0, 1, 2, 1, 0, 0],
      [0, 0, 1, 2, 2, 2, 1, 0],
      [0, 1, 2, 2, 1, 2, 2, 1],
      [0, 1, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [1, 2, 2, 2, 2, 2, 2, 1],
      [2, 2, 2, 2, 2, 2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2],
    ],
  },
};

const VIEWS: ViewDirection[] = ["front", "right", "back", "left"];

// ---- Sub-components ----

const CharacterPreview: React.FC<{
  character: Character;
  size?: number;
  view?: ViewDirection;
}> = ({ character, size = 120, view = "front" }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Render at 2x internal resolution for crispness, scale down with CSS
  const internalSize = size * 2;

  const drawPreview = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#1a1e30";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const pieceType = (character.pieceType || "king") as ChessPieceType;
    const pattern =
      CHESS_PIECE_PATTERNS[pieceType]?.[view] ??
      CHESS_PIECE_PATTERNS.king.front;
    const primary = (character.colors?.[0] as string) || "#F5F5F5";
    const secondary = (character.colors?.[1] as string) || "#D3D3D3";
    const accent = (character.colors?.[2] as string) || "#111111";

    const pixelSize = Math.floor(internalSize / 10);
    const patternW = pattern[0].length * pixelSize;
    const patternH = pattern.length * pixelSize;
    const startX = Math.floor((canvas.width - patternW) / 2);
    const startY = Math.floor((canvas.height - patternH) / 2);

    for (let row = 0; row < pattern.length; row++) {
      for (let col = 0; col < pattern[row].length; col++) {
        const v = pattern[row][col];
        if (v === 0) continue;
        ctx.fillStyle = v === 1 ? secondary : v === 2 ? primary : accent;
        ctx.fillRect(
          startX + col * pixelSize,
          startY + row * pixelSize,
          pixelSize,
          pixelSize,
        );
        ctx.strokeStyle = "rgba(0,0,0,0.55)";
        ctx.lineWidth = 0.5;
        ctx.strokeRect(
          startX + col * pixelSize,
          startY + row * pixelSize,
          pixelSize,
          pixelSize,
        );
      }
    }
  }, [character, view, internalSize]);

  useEffect(() => {
    drawPreview();
  }, [drawPreview]);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <canvas
        ref={canvasRef}
        width={internalSize}
        height={internalSize}
        style={{
          imageRendering: "pixelated",
          display: "block",
          width: size,
          height: size,
        }}
      />
    </div>
  );
};

const XpBar: React.FC<{ experience: bigint; level: bigint }> = ({
  experience,
  level,
}) => {
  const lvl = Number(level);
  const {
    leftover: progressXp,
    needed,
    percent: pct,
  } = xpHudProgress(Number(experience), lvl);

  return (
    <div className="py-1.5">
      <div className="flex justify-between items-center mb-1">
        <span className="stone-pill stone-pill-crimson text-[10px] font-extrabold tracking-widest uppercase">
          LV {lvl}
        </span>
        <span className="text-[10px] font-mono text-[#a55eea]">
          {progressXp.toLocaleString()} / {needed.toLocaleString()} XP
        </span>
      </div>
      <div className="dofus-xp-bar">
        <div className="dofus-xp-bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

const _getPieceIcon = (pieceType: string) => {
  switch (pieceType?.toLowerCase()) {
    case "king":
      return <Crown className="w-5 h-5" />;
    case "queen":
      return <Shield className="w-5 h-5" />;
    case "rook":
      return <Castle className="w-5 h-5" />;
    case "bishop":
      return <Zap className="w-5 h-5" />;
    case "knight":
      return <ChevronRight className="w-5 h-5" />;
    case "pawn":
      return <Swords className="w-5 h-5" />;
    default:
      return <Crown className="w-5 h-5" />;
  }
};

interface SlotCardProps {
  slotNumber: number;
  character: Character | null;
  viewIndex: number;
  onRotate: (direction: 1 | -1) => void;
  onPlay: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCreate: () => void;
  isDeleting: boolean;
}

const SlotCard: React.FC<SlotCardProps> = React.memo(
  ({
    slotNumber,
    character,
    viewIndex,
    onRotate,
    onPlay,
    onEdit,
    onDelete,
    onCreate,
    isDeleting,
  }) => {
    const view = VIEWS[viewIndex];
    const [hovered, setHovered] = useState(false);

    return (
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`stone-frame relative overflow-hidden transition-all duration-250 ${
          character
            ? hovered
              ? "border-[#c0392b] shadow-[0_0_36px_rgba(192,57,43,0.28),0_8px_24px_rgba(0,0,0,0.5)]"
              : "border-[rgba(200,150,42,0.38)] shadow-[0_0_18px_rgba(200,150,42,0.12),0_4px_16px_rgba(0,0,0,0.4)]"
            : hovered
              ? "border-dashed border-[#2a3040] shadow-[0_0_16px_rgba(200,150,42,0.06)]"
              : "border-dashed border-[#2a3040] shadow-[0_4px_12px_rgba(0,0,0,0.3)]"
        }`}
      >
        {/* Top gold accent line */}
        {character && (
          <div
            className="absolute top-0 left-[15%] right-[15%] h-0.5 transition-colors duration-250"
            style={{
              background: hovered
                ? "linear-gradient(90deg,transparent,#c0392b,transparent)"
                : "linear-gradient(90deg,transparent,#8b1a1a,transparent)",
            }}
          />
        )}

        {/* Slot header */}
        <div className="stone-header flex items-center justify-between px-4 py-2.5">
          <span className="stone-header-title text-[10px]">
            \u2694 Slot {slotNumber}
          </span>
          {character && (
            <span className="stone-pill stone-pill-crimson text-[10px]">
              LVL {character.level?.toString()}
            </span>
          )}
        </div>

        <div className="p-4 pb-5">
          {character ? (
            <FilledSlot
              character={character}
              view={view}
              onRotate={onRotate}
              onPlay={onPlay}
              onEdit={onEdit}
              onDelete={onDelete}
              isDeleting={isDeleting}
            />
          ) : (
            <EmptySlot onCreate={onCreate} />
          )}
        </div>
      </div>
    );
  },
  (prev, next) =>
    prev.slotNumber === next.slotNumber &&
    prev.character === next.character &&
    prev.viewIndex === next.viewIndex &&
    prev.isDeleting === next.isDeleting &&
    prev.onRotate === next.onRotate &&
    prev.onPlay === next.onPlay &&
    prev.onEdit === next.onEdit &&
    prev.onDelete === next.onDelete &&
    prev.onCreate === next.onCreate,
);

const FilledSlot: React.FC<{
  character: Character;
  view: ViewDirection;
  onRotate: (direction: 1 | -1) => void;
  onPlay: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}> = ({ character, view, onRotate, onPlay, onEdit, onDelete, isDeleting }) => (
  <div className="flex flex-col gap-3">
    {/* Preview row */}
    <div className="flex items-center gap-3.5">
      <div className="relative flex-shrink-0 flex flex-col items-center gap-1.5">
        {/* Arrow bulb — above the sprite */}
        <div
          className="flex items-center gap-2 px-3 py-1.5"
          style={{
            background: "linear-gradient(180deg,#2a2230,#160d14)",
            borderRadius: 12,
            boxShadow:
              "0 6px 14px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.12)",
          }}
        >
          <button
            type="button"
            data-ocid="character_selection.turn_left"
            onClick={() => onRotate(-1)}
            title="Turn left"
            aria-label="Turn left"
            className="stone-touch-target w-6 h-6 rounded flex items-center justify-center"
            style={{
              background: "rgba(192,57,43,.15)",
              border: "1px solid rgba(192,57,43,.3)",
            }}
          >
            <ChevronLeft className="w-3.5 h-3.5 text-[#e74c3c]" />
          </button>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8a8090]">
            {view}
          </span>
          <button
            type="button"
            data-ocid="character_selection.turn_right"
            onClick={() => onRotate(1)}
            title="Turn right"
            aria-label="Turn right"
            className="stone-touch-target w-6 h-6 rounded flex items-center justify-center"
            style={{
              background: "rgba(192,57,43,.15)",
              border: "1px solid rgba(192,57,43,.3)",
            }}
          >
            <ChevronRight className="w-3.5 h-3.5 text-[#e74c3c]" />
          </button>
        </div>

        {/* Gold glow frame */}
        <div className="stone-frame relative w-[112px] h-[112px] overflow-hidden">
          <div className="stone-well w-full h-full flex items-center justify-center">
            <CharacterPreview character={character} size={112} view={view} />
          </div>
          {/* Corner accents */}
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="absolute w-2 h-2 border-[1.5px] border-[#c0392b]"
              style={{
                borderRight: i % 2 === 0 ? "none" : "1.5px solid #c0392b",
                borderLeft: i % 2 === 1 ? "none" : "1.5px solid #c0392b",
                borderBottom: i < 2 ? "none" : "1.5px solid #c0392b",
                borderTop: i >= 2 ? "none" : "1.5px solid #c0392b",
                top: i < 2 ? 2 : undefined,
                bottom: i >= 2 ? 2 : undefined,
                left: i % 2 === 0 ? 2 : undefined,
                right: i % 2 === 1 ? 2 : undefined,
              }}
            />
          ))}
        </div>
        <div className="text-center">
          <span className="stone-pill stone-pill-crimson text-[9px] uppercase tracking-wider">
            {view}
          </span>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="text-[#c0392b] text-lg">
            {character.pieceType === "king" && "\u2654"}
            {character.pieceType === "queen" && "\u2655"}
            {character.pieceType === "pawn" && "\u2659"}
            {character.pieceType === "rook" && "\u2656"}
            {character.pieceType === "bishop" && "\u2657"}
            {character.pieceType === "knight" && "\u2658"}
          </span>
          <span
            className="text-[#e74c3c] font-extrabold text-base font-display truncate whitespace-nowrap"
            style={{ textShadow: "0 0 10px rgba(240,192,96,0.4)" }}
          >
            {character.name}
          </span>
        </div>
        <span className="stone-pill stone-pill-crimson text-[10px] mb-2 inline-flex">
          {character.pieceType}
        </span>
        <div className="flex gap-1 mt-1">
          {(character.colors as string[] | undefined)
            ?.slice(0, 3)
            .map((c: string, i: number) => (
              <div
                key={`color-${i}-${c}`}
                title={c}
                className="w-4 h-4 rounded border border-[rgba(192,57,43,0.3)]"
                style={{
                  background: c,
                  boxShadow: `0 0 4px ${c}55`,
                }}
              />
            ))}
        </div>
      </div>
    </div>

    {/* XP bar */}
    <XpBar
      experience={character.experience ?? BigInt(0)}
      level={character.level ?? BigInt(1)}
    />

    {/* Stats grid */}
    <div className="stone-well relative p-2 grid grid-cols-2 gap-x-2.5 gap-y-1 overflow-hidden">
      <BloodParticles intensity="subtle" />
      {[
        {
          label: "HP",
          value: character.stats?.hp?.toString() ?? "100",
          color: "#e74c3c",
          gemColor: "#e74c3c",
        },
        {
          label: "AP",
          value: character.stats?.ap?.toString() ?? "10",
          color: "#5b9cf0",
          gemColor: "#5b9cf0",
        },
        {
          label: "MP",
          value: character.stats?.mp?.toString() ?? "5",
          color: "#27ae60",
          gemColor: "#27ae60",
        },
        {
          label: "INIT",
          value:
            (character.stats?.init ?? character.stats?.atk)?.toString() ?? "10",
          color: "#f39c12",
          gemColor: "#f39c12",
        },
      ].map(({ label, value, color, gemColor }) => (
        <div
          key={label}
          className="stone-inset flex items-center gap-1.5 px-1.5 py-0.5"
        >
          <div
            className="stone-gem"
            style={{ color: gemColor, background: gemColor }}
          />
          <span className="text-[9px] font-bold uppercase tracking-wider text-[#6a7a8a] flex-1">
            {label}
          </span>
          <span
            className="text-xs font-extrabold"
            style={{ color, textShadow: `0 0 6px ${color}88` }}
          >
            {value}
          </span>
        </div>
      ))}
    </div>

    {/* Actions */}
    <div className="flex gap-2 mt-1">
      <button
        type="button"
        data-ocid="character_selection.play_button"
        onClick={onPlay}
        className="stone-btn-crimson flex-1 py-2.5"
        style={{
          background: "linear-gradient(135deg,#a0721a,#c0392b,#e8b840)",
          color: "#0d0f1a",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow =
            "0 0 28px rgba(200,150,42,0.55), inset 0 1px 0 rgba(255,255,255,0.2)";
          e.currentTarget.style.transform = "translateY(-1px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow =
            "0 0 16px rgba(192,57,43,0.3), inset 0 1px 0 rgba(255,255,255,0.15)";
          e.currentTarget.style.transform = "translateY(0)";
        }}
      >
        <Play className="w-3.5 h-3.5" />
        <span>Play</span>
      </button>
      <button
        type="button"
        data-ocid="character_selection.edit_button"
        onClick={onEdit}
        title="Edit character"
        aria-label="Edit character"
        className="stone-btn-slate w-11 h-11 p-0 flex items-center justify-center"
      >
        <Edit className="w-4 h-4" />
      </button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button
            type="button"
            data-ocid="character_selection.delete_button"
            disabled={isDeleting}
            title="Delete character"
            aria-label="Delete character"
            className="stone-btn-slate w-11 h-11 p-0 flex items-center justify-center disabled:opacity-50"
            style={{
              background: "rgba(231,76,60,0.08)",
              color: "#e74c3c",
            }}
            onMouseEnter={(e) => {
              if (!isDeleting) {
                e.currentTarget.style.background = "rgba(231,76,60,0.18)";
                e.currentTarget.style.borderColor = "#e74c3c";
                e.currentTarget.style.boxShadow = "0 0 8px rgba(231,76,60,0.3)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(231,76,60,0.08)";
              e.currentTarget.style.borderColor = "transparent";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            {isDeleting ? (
              <div className="animate-spin w-3.5 h-3.5 border-2 border-[#e74c3c] border-t-transparent rounded-full" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent className="stone-frame">
          <div className="stone-well p-6">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-[#e74c3c] font-display">
                Delete Character
              </AlertDialogTitle>
              <AlertDialogDescription className="text-[#c0ccd8]">
                Delete &ldquo;{character.name}&rdquo;? This action cannot be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel className="stone-btn-slate">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                data-ocid="character_selection.delete_confirm_button"
                onClick={onDelete}
                className="stone-btn-crimson"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  </div>
);

const EmptySlot: React.FC<{ onCreate: () => void }> = ({ onCreate }) => (
  <div className="flex flex-col items-center justify-center py-9 px-4 gap-4">
    <div className="stone-frame w-20 h-20 rounded-full flex items-center justify-center">
      <div className="stone-well w-full h-full rounded-full flex items-center justify-center">
        <Plus className="w-8 h-8 text-[#8b1a1a]" />
      </div>
    </div>
    <p className="text-[#6a7a8a] text-xs uppercase tracking-widest font-semibold m-0">
      Empty Slot
    </p>
    <button
      type="button"
      data-ocid="character_selection.create_button"
      onClick={onCreate}
      className="stone-btn-crimson w-full justify-center py-2.5"
      style={{
        background: "linear-gradient(135deg,#1a1e30,#141726)",
        color: "#e74c3c",
        boxShadow: "0 0 10px rgba(192,57,43,0.1)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 0 18px rgba(200,150,42,0.28)";
        e.currentTarget.style.borderColor = "#c0392b";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 0 10px rgba(192,57,43,0.1)";
        e.currentTarget.style.borderColor = "transparent";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <Plus className="w-4 h-4" />
      <span>Create Character</span>
    </button>
  </div>
);

// ---- Main component ----

const CharacterSelection: React.FC<CharacterSelectionProps> = ({
  userProfile,
  onCreateCharacter,
  onEditCharacter,
  onPlayCharacter,
}) => {
  const {
    data: characterSlots,
    isLoading,
    isError,
    refetch,
  } = useGetCharacterSlots();
  const deleteCharacterMutation = useDeleteCharacter();
  const [deletingSlot, setDeletingSlot] = useState<number | null>(null);
  const [previewViews, setPreviewViews] = useState<Record<number, number>>({
    1: 0,
    2: 0,
    3: 0,
  });

  const rotatePreview = useCallback(
    (slot: number, direction: 1 | -1 = 1) =>
      setPreviewViews((prev) => ({
        ...prev,
        [slot]: (prev[slot] + direction + VIEWS.length) % VIEWS.length,
      })),
    [],
  );

  const handleDeleteCharacter = useCallback(
    async (slot: number) => {
      setDeletingSlot(slot);
      try {
        await deleteCharacterMutation.mutateAsync(BigInt(slot));
      } finally {
        setDeletingSlot(null);
      }
    },
    [deleteCharacterMutation],
  );

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-[#0d0f1a] flex items-center justify-center z-20">
        <div className="text-center">
          <div className="stone-orb w-14 h-14 mx-auto mb-4 animate-spin border-[3px] border-[#c0392b] border-t-transparent" />
          <p className="text-[#c0ccd8] font-body tracking-wider">
            Loading character slots\u2026
          </p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="fixed inset-0 bg-[#0d0f1a] flex items-center justify-center z-20">
        <div className="text-center">
          <p className="text-[#e74c3c] font-display mb-4">
            Failed to load character slots.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="stone-btn-crimson"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const slots = [
    { number: 1, character: characterSlots?.slot1 ?? null },
    { number: 2, character: characterSlots?.slot2 ?? null },
    { number: 3, character: characterSlots?.slot3 ?? null },
  ];

  return (
    <div className="min-h-full w-full bg-[#0d0f1a] overflow-y-auto py-9 px-6 pb-10 relative z-20">
      {/* Page header */}
      <div className="text-center mb-10">
        {/* Decorative line */}
        <div
          className="h-px mx-auto mb-5"
          style={{
            width: 180,
            background:
              "linear-gradient(90deg,transparent,#c0392b,transparent)",
          }}
        />
        <div className="inline-flex items-center gap-2.5 mb-2.5">
          <h1
            className="text-[28px] font-black font-display tracking-widest m-0"
            style={{
              background:
                "linear-gradient(90deg,#c0392b,#e74c3c,#e8b840,#c0392b)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Choose your Paper Baby Vampire!
          </h1>
        </div>
        <p className="text-[#6a7a8a] text-sm m-0">
          Welcome,{" "}
          <span
            className="text-[#e74c3c] font-bold"
            style={{ textShadow: "0 0 10px rgba(240,192,96,0.3)" }}
          >
            {userProfile.name}
          </span>
          . Select a character or create a new one.
        </p>
        <div
          className="h-px mx-auto mt-5"
          style={{
            width: 180,
            background:
              "linear-gradient(90deg,transparent,#c0392b,transparent)",
          }}
        />
      </div>

      {/* 3-slot grid */}
      <div
        data-ocid="character_selection.list"
        className="grid gap-5 mx-auto"
        style={{
          gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))",
          maxWidth: 1040,
        }}
      >
        {slots.map(({ number, character }) => {
          // Stable refs per-slot so React.memo on SlotCard works
          const slotChar = character;
          return (
            <SlotCard
              key={number}
              slotNumber={number}
              character={slotChar}
              viewIndex={previewViews[number]}
              onRotate={(direction) => rotatePreview(number, direction)}
              onPlay={() => slotChar && onPlayCharacter(slotChar, number)}
              onEdit={() => slotChar && onEditCharacter(number, slotChar)}
              onDelete={() => handleDeleteCharacter(number)}
              onCreate={() => onCreateCharacter(number)}
              isDeleting={deletingSlot === number}
            />
          );
        })}
      </div>
    </div>
  );
};

export default CharacterSelection;
