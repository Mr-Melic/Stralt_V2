import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { backendInterface } from "../backend";
import { useActor } from "../hooks/useActor";
import {
  BACKEND_SAVE_DEBOUNCE_MS,
  type UiLayoutActor,
} from "../hooks/usePanelLayout";

export interface DraggablePanelProps {
  panelId: string;
  title: string;
  userId?: string;
  defaultPosition: { x: number; y: number };
  defaultFolded?: boolean;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  zIndex?: number;
  onFoldChange?: (folded: boolean) => void;
}

const STORAGE_PREFIX = "pbv_panel_layout_";
const SNAP_THRESHOLD = 140; // px: distance within which panels snap

const SNAP_GAP = 10; // px: gap between snapped panels

// Registry of all mounted panel bounding boxes, keyed by panelId.
// Exported so non-panel UI chrome (e.g. the GameFlow top bar) can register
// itself and participate in the same mutual edge-snap computation, instead of
// being special-cased by a hardcoded constant that drifts from the real CSS.
export const panelRegistry: Record<
  string,
  { x: number; y: number; w: number; h: number }
> = {};

// Reserved id for the GameFlow top bar so it can register like any panel.
export const TOP_BAR_PANEL_ID = "__topbar__";

// Fallback top-bar geometry used only until the top bar registers itself.
// The actual top bar is h-12 (48px) in GameFlow.tsx; we keep a conservative
// fallback so snapping still works on the very first frame before registration.
const TOP_BAR_FALLBACK_BOTTOM = 48;

function loadLayout(
  userId: string,
): Record<string, { x: number; y: number; folded: boolean }> {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + userId);
    if (!raw) return {};
    return JSON.parse(raw) as Record<
      string,
      { x: number; y: number; folded: boolean }
    >;
  } catch {
    return {};
  }
}

function saveLayout(
  userId: string,
  panelId: string,
  state: { x: number; y: number; folded: boolean },
): void {
  try {
    const existing = loadLayout(userId);
    existing[panelId] = state;
    localStorage.setItem(STORAGE_PREFIX + userId, JSON.stringify(existing));
  } catch {
    // ignore storage errors
  }
}

/**
 * Save the FULL panel layout (all panel ids) to the backend as one compact JSON
 * Text field. Debounced by the caller (~1.5s after the last drag). Logs a
 * warning on failure but does NOT throw — the localStorage cache is still
 * valid. No-op when the actor is null (not signed in).
 */
function saveLayoutToBackend(
  actor: backendInterface | null,
  userId: string,
): void {
  if (!actor) return;
  const layout = loadLayout(userId);
  const blob = JSON.stringify(layout);
  void (actor as UiLayoutActor)
    .saveUserUiLayout(blob)
    .then((result) => {
      if (result.__kind__ === "err") {
        console.warn("DraggablePanel: saveUserUiLayout rejected:", result.err);
      }
    })
    .catch((err: unknown) => {
      console.warn(
        "DraggablePanel: saveUserUiLayout failed (localStorage cache still valid)",
        err,
      );
    });
}

// Compute magnetic snap position: after a drag release, check all other registered
// panels (and the registered top bar) and snap the moved panel flush (with
// SNAP_GAP) if any edge is within SNAP_THRESHOLD. All four edges of every other
// registered rect are evaluated mutually: left↔right, right↔left, top↔bottom,
// bottom↔top, PLUS edge alignment (left/right/top/bottom/center align). The top
// bar registers itself with panelRegistry under TOP_BAR_PANEL_ID so it
// participates in the SAME mutual edge computation — no hardcoded special-case.
function computeSnapPosition(
  movedId: string,
  pos: { x: number; y: number },
  w: number,
  h: number,
): { x: number; y: number } {
  let { x, y } = pos;
  let bestSnapX: { val: number; dist: number } | null = null;
  let bestSnapY: { val: number; dist: number } | null = null;

  for (const [otherId, other] of Object.entries(panelRegistry)) {
    if (otherId === movedId) continue;
    // Skip zero-size rects (unmeasured panels) so they don't produce phantom
    // snaps at (0,0). This is the root guard for panel-to-panel snapping.
    if (other.w === 0 || other.h === 0) continue;

    // Right edge of moved vs left edge of other (snap moved to LEFT of other)
    const rToL = Math.abs(x + w - other.x);
    // Left edge of moved vs right edge of other (snap moved to RIGHT of other)
    const lToR = Math.abs(x - (other.x + other.w));
    // Bottom edge of moved vs top edge of other (snap moved ABOVE other)
    const bToT = Math.abs(y + h - other.y);
    // Top edge of moved vs bottom edge of other (snap moved BELOW other)
    const tToB = Math.abs(y - (other.y + other.h));

    // Horizontal: pick the closest edge pair within threshold
    if (rToL < SNAP_THRESHOLD && (!bestSnapX || rToL < bestSnapX.dist)) {
      bestSnapX = { val: other.x - w - SNAP_GAP, dist: rToL };
    }
    if (lToR < SNAP_THRESHOLD && (!bestSnapX || lToR < bestSnapX.dist)) {
      bestSnapX = { val: other.x + other.w + SNAP_GAP, dist: lToR };
    }

    // Vertical: pick the closest edge pair within threshold
    if (bToT < SNAP_THRESHOLD && (!bestSnapY || bToT < bestSnapY.dist)) {
      bestSnapY = { val: other.y - h - SNAP_GAP, dist: bToT };
    }
    if (tToB < SNAP_THRESHOLD && (!bestSnapY || tToB < bestSnapY.dist)) {
      bestSnapY = { val: other.y + other.h + SNAP_GAP, dist: tToB };
    }
  }

  if (bestSnapX) x = bestSnapX.val;
  if (bestSnapY) y = bestSnapY.val;

  // ── EDGE-ALIGNMENT SNAP ───────────────────────────────────────────────────
  // In addition to edge-adjacent snapping (with SNAP_GAP), align panel edges
  // so panels compose into tidy aligned clusters: when this panel's top edge is
  // within SNAP_THRESHOLD of another panel's top edge, snap the y so the tops
  // align; likewise left/right/bottom/center align. Only apply an alignment
  // when no stronger edge-adjacent snap already claimed that axis. The top bar
  // participates here too (its top edge = 0, bottom edge = its height), so
  // panels align flush with the bar without a hardcoded constant.
  if (!bestSnapY) {
    let bestAlign: { val: number; dist: number } | null = null;
    for (const [otherId, other] of Object.entries(panelRegistry)) {
      if (otherId === movedId) continue;
      if (other.w === 0 || other.h === 0) continue;
      // Top-align: moved.top ↔ other.top
      const topDiff = Math.abs(y - other.y);
      if (
        topDiff < SNAP_THRESHOLD &&
        (!bestAlign || topDiff < bestAlign.dist)
      ) {
        bestAlign = { val: other.y, dist: topDiff };
      }
      // Bottom-align: moved.bottom ↔ other.bottom  → y = other.y + other.h - h
      const botDiff = Math.abs(y + h - (other.y + other.h));
      if (
        botDiff < SNAP_THRESHOLD &&
        (!bestAlign || botDiff < bestAlign.dist)
      ) {
        bestAlign = { val: other.y + other.h - h, dist: botDiff };
      }
    }
    if (bestAlign) y = bestAlign.val;
  }
  if (!bestSnapX) {
    let bestAlign: { val: number; dist: number } | null = null;
    for (const [otherId, other] of Object.entries(panelRegistry)) {
      if (otherId === movedId) continue;
      if (other.w === 0 || other.h === 0) continue;
      // Left-align: moved.left ↔ other.left
      const leftDiff = Math.abs(x - other.x);
      if (
        leftDiff < SNAP_THRESHOLD &&
        (!bestAlign || leftDiff < bestAlign.dist)
      ) {
        bestAlign = { val: other.x, dist: leftDiff };
      }
      // Right-align: moved.right ↔ other.right → x = other.x + other.w - w
      const rightDiff = Math.abs(x + w - (other.x + other.w));
      if (
        rightDiff < SNAP_THRESHOLD &&
        (!bestAlign || rightDiff < bestAlign.dist)
      ) {
        bestAlign = { val: other.x + other.w - w, dist: rightDiff };
      }
      // Center-align (horizontal): moved.center ↔ other.center
      const centerDiff = Math.abs(x + w / 2 - (other.x + other.w / 2));
      if (
        centerDiff < SNAP_THRESHOLD &&
        (!bestAlign || centerDiff < bestAlign.dist)
      ) {
        bestAlign = { val: other.x + other.w / 2 - w / 2, dist: centerDiff };
      }
    }
    if (bestAlign) x = bestAlign.val;
  }

  // ── TOP BAR FLOOR (fallback) ──────────────────────────────────────────────
  // If the top bar has registered itself (TOP_BAR_PANEL_ID), the mutual edge
  // snap above already handles "snap below the bar" via tToB (moved.top ↔
  // bar.bottom). If it has NOT registered yet (first frame), fall back to a
  // conservative floor so panels don't slide under the bar. This replaces the
  // old hardcoded TOP_BAR_BOTTOM=44 special-case that overrode legitimate
  // panel-to-panel snaps near the top of the screen.
  const topBar = panelRegistry[TOP_BAR_PANEL_ID];
  const floorY =
    topBar && topBar.h > 0
      ? topBar.y + topBar.h + SNAP_GAP
      : TOP_BAR_FALLBACK_BOTTOM + SNAP_GAP;
  if (y < floorY) y = floorY;

  // ── OVERLAP PREVENTION ────────────────────────────────────────────────────
  // After snapping, push the panel away from any other panel it now overlaps.
  // We allow up to 5 resolution passes to handle chain reactions. The top bar
  // is included as a normal registry entry, so panels never overlap it either.
  const MAX_PASSES = 5;
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    let resolved = true;
    for (const [otherId, other] of Object.entries(panelRegistry)) {
      if (otherId === movedId) continue;
      if (other.w === 0 || other.h === 0) continue;
      // Axis-aligned bounding-box intersection test
      const overlapX = x < other.x + other.w && x + w > other.x;
      const overlapY = y < other.y + other.h && y + h > other.y;
      if (!overlapX || !overlapY) continue;

      // Compute penetration depth on each of the four push directions
      const pushRight = other.x + other.w - x + SNAP_GAP; // push moved panel right
      const pushLeft = x + w - other.x + SNAP_GAP; // push moved panel left
      const pushDown = other.y + other.h - y + SNAP_GAP; // push moved panel down
      const pushUp = y + h - other.y + SNAP_GAP; // push moved panel up

      // Choose smallest push
      const minPush = Math.min(pushRight, pushLeft, pushDown, pushUp);
      if (minPush === pushRight) {
        x = other.x + other.w + SNAP_GAP;
      } else if (minPush === pushLeft) {
        x = other.x - w - SNAP_GAP;
      } else if (minPush === pushDown) {
        y = other.y + other.h + SNAP_GAP;
      } else {
        y = other.y - h - SNAP_GAP;
      }

      // Re-apply top bar floor after any vertical push
      if (y < floorY) y = floorY;

      resolved = false; // another pass needed to check new position
    }
    if (resolved) break;
  }

  return { x, y };
}

// Compute the snap target the panel WOULD snap to on release, without applying
// it. Returns null when no snap target is within SNAP_THRESHOLD. Used to render
// a live ghost preview and to ease the panel toward its snap spot while still
// dragging. Mirrors the edge-snap + edge-alignment logic of computeSnapPosition
// (all four mutual edges + left/right/top/bottom/center alignment, top bar
// included via the registry) but skips overlap-prevention (release-only).
function computeLiveSnapPreview(
  movedId: string,
  pos: { x: number; y: number },
  w: number,
  h: number,
): { x: number; y: number } | null {
  let { x, y } = pos;
  let snappedX = false;
  let snappedY = false;
  let bestSnapX: { val: number; dist: number } | null = null;
  let bestSnapY: { val: number; dist: number } | null = null;

  for (const [otherId, other] of Object.entries(panelRegistry)) {
    if (otherId === movedId) continue;
    // Skip zero-size rects so unmeasured panels don't phantom-snap at (0,0).
    if (other.w === 0 || other.h === 0) continue;
    const rToL = Math.abs(x + w - other.x);
    const lToR = Math.abs(x - (other.x + other.w));
    const bToT = Math.abs(y + h - other.y);
    const tToB = Math.abs(y - (other.y + other.h));

    if (rToL < SNAP_THRESHOLD && (!bestSnapX || rToL < bestSnapX.dist)) {
      bestSnapX = { val: other.x - w - SNAP_GAP, dist: rToL };
    }
    if (lToR < SNAP_THRESHOLD && (!bestSnapX || lToR < bestSnapX.dist)) {
      bestSnapX = { val: other.x + other.w + SNAP_GAP, dist: lToR };
    }
    if (bToT < SNAP_THRESHOLD && (!bestSnapY || bToT < bestSnapY.dist)) {
      bestSnapY = { val: other.y - h - SNAP_GAP, dist: bToT };
    }
    if (tToB < SNAP_THRESHOLD && (!bestSnapY || tToB < bestSnapY.dist)) {
      bestSnapY = { val: other.y + other.h + SNAP_GAP, dist: tToB };
    }
  }

  if (bestSnapX) {
    x = bestSnapX.val;
    snappedX = true;
  } else {
    let bestAlign: { val: number; dist: number } | null = null;
    for (const [otherId, other] of Object.entries(panelRegistry)) {
      if (otherId === movedId) continue;
      if (other.w === 0 || other.h === 0) continue;
      const leftDiff = Math.abs(pos.x - other.x);
      if (
        leftDiff < SNAP_THRESHOLD &&
        (!bestAlign || leftDiff < bestAlign.dist)
      ) {
        bestAlign = { val: other.x, dist: leftDiff };
      }
      const rightDiff = Math.abs(pos.x + w - (other.x + other.w));
      if (
        rightDiff < SNAP_THRESHOLD &&
        (!bestAlign || rightDiff < bestAlign.dist)
      ) {
        bestAlign = { val: other.x + other.w - w, dist: rightDiff };
      }
      const centerDiff = Math.abs(pos.x + w / 2 - (other.x + other.w / 2));
      if (
        centerDiff < SNAP_THRESHOLD &&
        (!bestAlign || centerDiff < bestAlign.dist)
      ) {
        bestAlign = { val: other.x + other.w / 2 - w / 2, dist: centerDiff };
      }
    }
    if (bestAlign) {
      x = bestAlign.val;
      snappedX = true;
    }
  }

  if (bestSnapY) {
    y = bestSnapY.val;
    snappedY = true;
  } else {
    let bestAlign: { val: number; dist: number } | null = null;
    for (const [otherId, other] of Object.entries(panelRegistry)) {
      if (otherId === movedId) continue;
      if (other.w === 0 || other.h === 0) continue;
      const topDiff = Math.abs(pos.y - other.y);
      if (
        topDiff < SNAP_THRESHOLD &&
        (!bestAlign || topDiff < bestAlign.dist)
      ) {
        bestAlign = { val: other.y, dist: topDiff };
      }
      const botDiff = Math.abs(pos.y + h - (other.y + other.h));
      if (
        botDiff < SNAP_THRESHOLD &&
        (!bestAlign || botDiff < bestAlign.dist)
      ) {
        bestAlign = { val: other.y + other.h - h, dist: botDiff };
      }
    }
    if (bestAlign) {
      y = bestAlign.val;
      snappedY = true;
    }
  }

  if (!snappedX && !snappedY) return null;
  return { x, y };
}

const DraggablePanel: React.FC<DraggablePanelProps> = ({
  panelId,
  title,
  userId = "guest",
  defaultPosition,
  defaultFolded = false,
  children,
  className,
  style,
  zIndex = 100,
  onFoldChange,
}) => {
  const [position, setPosition] = useState<{ x: number; y: number }>(
    defaultPosition,
  );
  const [folded, setFolded] = useState(defaultFolded);
  const [isDragging, setIsDragging] = useState(false);
  const [loaded, setLoaded] = useState(false);
  // Live snap preview target while dragging (null when out of snap range).
  // Rendered as a ghost rectangle sibling to the panel content.
  const [snapPreview, setSnapPreview] = useState<{
    x: number;
    y: number;
  } | null>(null);
  // Panel dimensions captured during drag so the ghost can match the panel size.
  const [panelSize, setPanelSize] = useState<{ w: number; h: number }>({
    w: 0,
    h: 0,
  });

  const panelRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{
    startMouseX: number;
    startMouseY: number;
    startPanelX: number;
    startPanelY: number;
    active: boolean;
  }>({
    startMouseX: 0,
    startMouseY: 0,
    startPanelX: 0,
    startPanelY: 0,
    active: false,
  });
  // Track last snapped position so we only detach after SNAP_DETACH_THRESHOLD movement
  const lastSnappedPos = useRef<{ x: number; y: number } | null>(null);
  const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentPosRef = useRef(position);
  const currentFoldedRef = useRef(folded);
  // LEAK-15: Instance ID guards the save debounce so a stale timeout created
  // before an unmount cannot fire into the freshly remounted instance.
  const panelInstanceIdRef = useRef<number>(0);
  // Backend actor for the authoritative uiLayout blob. Null when not signed in
  // (mock mode returns the shared mockBackend singleton, which is non-null).
  const { actor } = useActor();
  // Second debounce timer for the BACKEND save (1500ms). The localStorage
  // saveDebounceRef stays at 500ms for instant cache paint; this one writes
  // the authoritative blob after the user stops dragging for ~1.5s.
  const backendSaveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // Load saved state on mount — bump instance ID on each mount.
  // localStorage paints FIRST (instant), then the backend blob reconciles if
  // the user is signed in and the backend has a valid layout for this panel.
  useEffect(() => {
    panelInstanceIdRef.current += 1;
    const myInstance = panelInstanceIdRef.current;
    const layout = loadLayout(userId);
    if (layout[panelId]) {
      const saved = layout[panelId];
      setPosition({ x: saved.x, y: saved.y });
      setFolded(saved.folded);
      currentPosRef.current = { x: saved.x, y: saved.y };
      currentFoldedRef.current = saved.folded;
    }
    setLoaded(true);

    // Non-blocking backend reconcile: only when signed in (actor non-null).
    // If the backend returns a valid layout containing this panelId, apply it
    // and write the full backend layout back to localStorage so the cache
    // stays in sync with the authoritative blob.
    if (actor) {
      void (actor as UiLayoutActor)
        .getUserUiLayout()
        .then((blob: string) => {
          // LEAK-15: stale unmount guard
          if (panelInstanceIdRef.current !== myInstance) return;
          if (!blob) return;
          let parsed: Record<
            string,
            { x: number; y: number; folded: boolean }
          > | null = null;
          try {
            const obj = JSON.parse(blob) as unknown;
            if (
              typeof obj === "object" &&
              obj !== null &&
              !Array.isArray(obj)
            ) {
              const result: Record<
                string,
                { x: number; y: number; folded: boolean }
              > = {};
              for (const [id, entry] of Object.entries(
                obj as Record<string, unknown>,
              )) {
                if (
                  typeof entry !== "object" ||
                  entry === null ||
                  Array.isArray(entry)
                )
                  continue;
                const e = entry as Record<string, unknown>;
                if (
                  typeof e.x !== "number" ||
                  typeof e.y !== "number" ||
                  typeof e.folded !== "boolean"
                )
                  continue;
                result[id] = { x: e.x, y: e.y, folded: e.folded };
              }
              if (Object.keys(result).length > 0) parsed = result;
            }
          } catch {
            parsed = null;
          }
          if (!parsed) return;
          // Write the full backend layout back to the localStorage cache.
          try {
            localStorage.setItem(
              STORAGE_PREFIX + userId,
              JSON.stringify(parsed),
            );
          } catch {
            // ignore storage errors — backend blob is still authoritative
          }
          // Apply this panel's entry if present.
          if (parsed[panelId]) {
            const saved = parsed[panelId];
            setPosition({ x: saved.x, y: saved.y });
            setFolded(saved.folded);
            currentPosRef.current = { x: saved.x, y: saved.y };
            currentFoldedRef.current = saved.folded;
          }
        })
        .catch((err: unknown) => {
          // Backend load failed — keep the localStorage layout. Never throw.
          console.warn(
            "DraggablePanel: getUserUiLayout failed, keeping localStorage layout",
            err,
          );
        });
    }

    return () => {
      // Clear the backend debounce timer on unmount so it cannot fire into a
      // stale instance (LEAK-15 also guards the timeout body itself).
      if (backendSaveDebounceRef.current) {
        clearTimeout(backendSaveDebounceRef.current);
        backendSaveDebounceRef.current = null;
      }
    };
  }, [panelId, userId, actor]);

  const scheduleSave = useCallback(
    (pos: { x: number; y: number }, fold: boolean) => {
      // Instant localStorage cache (500ms debounce).
      if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
      const myInstance = panelInstanceIdRef.current;
      saveDebounceRef.current = setTimeout(() => {
        // LEAK-15: Guard against stale timeout from a previous panel instance
        if (panelInstanceIdRef.current !== myInstance) return;
        saveLayout(userId, panelId, { x: pos.x, y: pos.y, folded: fold });
      }, 500);

      // Authoritative backend blob (1500ms debounce). Skipped when not signed
      // in (actor null) — localStorage-only path. Same LEAK-15 instance guard.
      if (!actor) return;
      if (backendSaveDebounceRef.current)
        clearTimeout(backendSaveDebounceRef.current);
      backendSaveDebounceRef.current = setTimeout(() => {
        if (panelInstanceIdRef.current !== myInstance) return;
        saveLayoutToBackend(actor, userId);
      }, BACKEND_SAVE_DEBOUNCE_MS);
    },
    [userId, panelId, actor],
  );

  const clampPosition = useCallback(
    (x: number, y: number): { x: number; y: number } => {
      const el = panelRef.current;
      if (!el) return { x, y };
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const maxX = Math.max(0, window.innerWidth - w);
      const maxY = Math.max(0, window.innerHeight - h);
      return {
        x: Math.min(Math.max(0, x), maxX),
        y: Math.min(Math.max(0, y), maxY),
      };
    },
    [],
  );

  useEffect(() => {
    const onResize = () => {
      const next = clampPosition(
        currentPosRef.current.x,
        currentPosRef.current.y,
      );
      if (
        next.x === currentPosRef.current.x &&
        next.y === currentPosRef.current.y
      ) {
        return;
      }
      currentPosRef.current = next;
      setPosition(next);
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, [clampPosition]);

  const clampPositionRef = useRef(clampPosition);
  clampPositionRef.current = clampPosition;
  const scheduleSaveRef = useRef(scheduleSave);
  scheduleSaveRef.current = scheduleSave;

  const dragRafRef = useRef<number | null>(null);
  const pendingDragRef = useRef<{
    pos: { x: number; y: number };
    preview: { x: number; y: number } | null;
    size: { w: number; h: number } | null;
  } | null>(null);
  const detachDragListenersRef = useRef<(() => void) | null>(null);

  const flushPendingDrag = useCallback(() => {
    dragRafRef.current = null;
    const pending = pendingDragRef.current;
    if (!pending) return;
    currentPosRef.current = pending.pos;
    setPosition(pending.pos);
    setSnapPreview(pending.preview);
    if (pending.size) setPanelSize(pending.size);
  }, []);

  const detachDragListeners = useCallback(() => {
    detachDragListenersRef.current?.();
    detachDragListenersRef.current = null;
  }, []);

  const attachDragListeners = useCallback(() => {
    if (detachDragListenersRef.current) return;

    const onMove = (clientX: number, clientY: number) => {
      if (!dragState.current.active) return;
      const clamp = clampPositionRef.current;
      const dx = clientX - dragState.current.startMouseX;
      const dy = clientY - dragState.current.startMouseY;
      const rawX = dragState.current.startPanelX + dx;
      const rawY = dragState.current.startPanelY + dy;
      const clamped = clamp(rawX, rawY);

      // Live snap preview: ease toward a nearby target while dragging.
      // Full snap still applies on release.
      const el = panelRef.current;
      let nextPos = clamped;
      let preview: { x: number; y: number } | null = null;
      let size: { w: number; h: number } | null = null;
      if (el) {
        const w = el.offsetWidth;
        const h = el.offsetHeight;
        size = { w, h };
        preview = computeLiveSnapPreview(panelId, clamped, w, h);
        if (preview) {
          const LERP = 0.4;
          const easedX = clamped.x + (preview.x - clamped.x) * LERP;
          const easedY = clamped.y + (preview.y - clamped.y) * LERP;
          nextPos = clamp(easedX, easedY);
        }
      }
      pendingDragRef.current = { pos: nextPos, preview, size };
      if (dragRafRef.current === null) {
        dragRafRef.current = requestAnimationFrame(flushPendingDrag);
      }
    };

    const onEnd = () => {
      if (!dragState.current.active) return;
      dragState.current.active = false;
      if (dragRafRef.current !== null) {
        cancelAnimationFrame(dragRafRef.current);
        dragRafRef.current = null;
      }
      flushPendingDrag();
      setIsDragging(false);
      setSnapPreview(null);
      const el = panelRef.current;
      if (el) {
        const w = el.offsetWidth;
        const h = el.offsetHeight;
        const snapped = computeSnapPosition(
          panelId,
          currentPosRef.current,
          w,
          h,
        );
        const maxX = Math.max(0, window.innerWidth - w);
        const maxY = Math.max(0, window.innerHeight - h);
        snapped.x = Math.min(Math.max(0, snapped.x), maxX);
        snapped.y = Math.min(Math.max(0, snapped.y), maxY);
        currentPosRef.current = snapped;
        lastSnappedPos.current = snapped;
        setPosition(snapped);
      }
      scheduleSaveRef.current(currentPosRef.current, currentFoldedRef.current);
      detachDragListeners();
    };

    const handleMouseMove = (e: MouseEvent) => onMove(e.clientX, e.clientY);
    const handleTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) onMove(t.clientX, t.clientY);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    detachDragListenersRef.current = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, [detachDragListeners, flushPendingDrag, panelId]);

  useEffect(() => {
    return () => {
      if (dragRafRef.current !== null) {
        cancelAnimationFrame(dragRafRef.current);
        dragRafRef.current = null;
      }
      detachDragListenersRef.current?.();
      detachDragListenersRef.current = null;
    };
  }, []);

  const beginDrag = useCallback(
    (clientX: number, clientY: number) => {
      dragState.current.startMouseX = clientX;
      dragState.current.startMouseY = clientY;
      dragState.current.startPanelX = currentPosRef.current.x;
      dragState.current.startPanelY = currentPosRef.current.y;
      dragState.current.active = true;
      setIsDragging(true);
      attachDragListeners();
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log(
          "[UI-SNAP] targets=",
          Object.keys(panelRegistry),
          "rects=",
          JSON.stringify(panelRegistry),
        );
      }
    },
    [attachDragListeners],
  );

  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      beginDrag(e.clientX, e.clientY);
    },
    [beginDrag],
  );

  const onTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      const touch = e.touches[0];
      if (!touch) return;
      beginDrag(touch.clientX, touch.clientY);
    },
    [beginDrag],
  );

  const handleFoldToggle = useCallback(() => {
    const next = !currentFoldedRef.current;
    currentFoldedRef.current = next;
    setFolded(next);
    scheduleSave(currentPosRef.current, next);
    onFoldChange?.(next);
  }, [scheduleSave, onFoldChange]);

  // Register/update this panel's bounding box whenever position or fold changes
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    // Ref to hold a pending requestAnimationFrame id for zero-size re-measure.
    // Declared BEFORE `update` (which references it) to avoid a temporal-dead-zone
    // hazard if `update` is ever invoked synchronously before the declaration ran.
    const pendingRafRef = { current: null as number | null };
    const update = () => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      // If the element hasn't laid out yet (0x0), schedule a re-measure on the
      // next frame instead of registering a zero-size rect — a zero-size rect
      // would make this panel invisible to mutual edge-snap from other panels
      // (the "panels don't snap to each other" symptom).
      if (w === 0 || h === 0) {
        const raf = requestAnimationFrame(update);
        // Stash the raf id on the cleanup via a closure so it can be cancelled.
        pendingRafRef.current = raf;
        return;
      }
      pendingRafRef.current = null;
      panelRegistry[panelId] = {
        x: currentPosRef.current.x,
        y: currentPosRef.current.y,
        w,
        h,
      };
    };
    update();
    // Observe size changes (fold/unfold)
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      ro.disconnect();
      if (pendingRafRef.current !== null)
        cancelAnimationFrame(pendingRafRef.current);
      delete panelRegistry[panelId];
      // LEAK-15: Cancel any pending save debounce on unmount
      if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    };
  }, [panelId]);

  // Keep registry x/y in sync with position state
  useEffect(() => {
    const existing = panelRegistry[panelId];
    if (existing) {
      panelRegistry[panelId] = { ...existing, x: position.x, y: position.y };
    }
  }, [panelId, position.x, position.y]);

  if (!loaded) return null;

  return (
    <div
      ref={panelRef}
      data-ocid={`draggable_panel.${panelId}`}
      className={className ? `${className} stone-frame` : "stone-frame"}
      style={{
        position: "fixed",
        left: position.x,
        top: position.y,
        zIndex,
        userSelect: "none",
        touchAction: "none",
        borderRadius: 14,
        minWidth: 60,
        ...style,
      }}
    >
      {/* Live snap-preview ghost: subtle outlined rectangle showing where the
          panel will snap. Visible only while dragging and within snap range.
          Carved-stone/dark-slate/crimson style — thin crimson outline, low
          opacity slate fill. Rendered as a fixed-position sibling so it does
          not affect the panel's own layout. */}
      {isDragging && snapPreview && panelSize.w > 0 && panelSize.h > 0 && (
        <div
          data-ocid={`draggable_panel.${panelId}.snap_preview`}
          aria-hidden="true"
          style={{
            position: "fixed",
            left: snapPreview.x,
            top: snapPreview.y,
            width: panelSize.w,
            height: panelSize.h,
            zIndex: zIndex - 1,
            borderRadius: 14,
            border: "1.5px dashed oklch(0.62 0.22 25)", // crimson outline
            background: "oklch(0.28 0.04 30 / 0.18)", // dark slate, low opacity
            boxShadow: "0 0 0 1px oklch(0.62 0.22 25 / 0.35)",
            pointerEvents: "none",
            transition: "left 80ms ease-out, top 80ms ease-out",
          }}
        />
      )}

      {/* Drag handle header */}
      <div
        data-ocid={`draggable_panel.${panelId}.header`}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        className="stone-header"
        style={{
          borderRadius: folded ? 12 : "12px 12px 0 0",
          padding: "4px 8px",
          cursor: isDragging ? "grabbing" : "grab",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
          pointerEvents: "auto",
        }}
      >
        <span
          className="stone-header-title"
          style={{
            fontSize: 10,
            flex: 1,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {title}
        </span>
        <button
          type="button"
          data-ocid={`draggable_panel.${panelId}.fold_button`}
          onClick={(e) => {
            e.stopPropagation();
            handleFoldToggle();
          }}
          className="stone-btn-slate stone-touch-target"
          style={{
            fontSize: 12,
            lineHeight: 1,
            padding: "0 4px",
            flexShrink: 0,
            pointerEvents: "auto",
          }}
          aria-label={folded ? "Expand panel" : "Fold panel"}
        >
          {folded ? "▲" : "▼"}
        </button>
      </div>

      {/* Content */}
      {!folded && (
        <div
          className="stone-well"
          style={{
            pointerEvents: "auto",
            borderRadius: "0 0 12px 12px",
            overflow: "visible",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
};

export default DraggablePanel;
