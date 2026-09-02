import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skull } from "lucide-react";
import type React from "react";

interface GameOverModalProps {
  isOpen: boolean;
  onRespawn: () => void;
  xpLost?: number;
  dokaLost?: number;
}

const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  onRespawn,
  xpLost,
  dokaLost,
}) => {
  return (
    <AlertDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onRespawn();
      }}
    >
      <AlertDialogContent className="stone-frame border-[oklch(var(--dofus-border-gold))] p-0 sm:max-w-md">
        <div className="stone-well p-6">
          <AlertDialogHeader>
            <div className="flex items-center justify-center mb-3">
              <Skull
                className="w-14 h-14"
                style={{ color: "oklch(var(--dofus-hp-color))" }}
              />
            </div>
            <AlertDialogTitle
              className="text-center text-2xl font-display"
              style={{ color: "oklch(var(--dofus-text-gold))" }}
            >
              You Have Fallen
            </AlertDialogTitle>
            <AlertDialogDescription
              className="text-center space-y-2"
              style={{ color: "oklch(var(--dofus-text-silver))" }}
            >
              <span className="block">
                Your champion is sent to the Death Realm — a quiet map with no
                enemies. Walk onto a portal to return to the world.
              </span>
              {(xpLost !== undefined && xpLost > 0) ||
              (dokaLost !== undefined && dokaLost > 0) ? (
                <span
                  className="block mt-2 rounded px-3 py-2 text-sm font-bold"
                  style={{
                    background: "oklch(0.18 0.08 25 / 0.55)",
                    border: "1px solid oklch(var(--dofus-border-gold-dim))",
                    color: "oklch(0.78 0.16 25)",
                  }}
                >
                  {xpLost !== undefined && xpLost > 0 && (
                    <span className="block">−{xpLost} XP (20% penalty)</span>
                  )}
                  {dokaLost !== undefined && dokaLost > 0 && (
                    <span className="block">
                      −{dokaLost} Doka (40% penalty)
                    </span>
                  )}
                </span>
              ) : null}
              <span
                className="block text-xs mt-1"
                style={{ color: "oklch(var(--dofus-text-dim))" }}
              >
                Your level is kept. You revive at half health.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex justify-center mt-4">
            <AlertDialogAction
              onClick={onRespawn}
              className="stone-btn-crimson stone-touch-target px-8 py-2"
              style={{ minHeight: 44 }}
            >
              Enter the Death Realm
            </AlertDialogAction>
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default GameOverModal;
