import {
  Bug,
  Copy,
  Download,
  FileText,
  MessageSquare,
  Pause,
  PawPrint,
  Play,
  Send,
  Settings,
  Sparkles,
  Swords,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChatMessage } from "../backend.d";
import {
  type ClickTraceRecord,
  getClickTraceBuffer,
} from "../debug/clickTrace";
import {
  APP_BUILD,
  type ExportContext,
  buildDebugReportHtml,
  buildDebugReportText,
} from "../debug/debugExport";
import {
  getGeometryOverlayEnabled,
  setGeometryOverlayEnabled,
  subscribeGeometryOverlayEnabled,
} from "../debug/geometryOverlayState";
import { useActor } from "../hooks/useActor";
import type { ActiveEffect, BattleLogEntry } from "../types/gameTypes";
import {
  type DebugLogEntry,
  type LogCategory,
  type LogLevel,
  getDebugLogBuffer,
  subscribeDebugLogs,
  subscribeDebugPaused,
  toggleDebugPaused,
} from "../utils/debugLogger";
import DraggablePanel from "./DraggablePanel";

/**
 * SECTION 3 (build #325): the 14 category chips shown in the Debug tab. The
 * list includes all 13 LogCategory values plus a synthetic "CLICK" chip
 * (CLICK events are logged under the GENERAL category in this codebase, so the
 * chip filters GENERAL entries whose message contains "click"/"CLICK"). Order
 * is the canonical display order from the requirements.
 */
const DEBUG_CATEGORY_CHIPS: LogCategory[] = [
  "BATTLE",
  "SUMMON",
  "SPELLS",
  "TURN",
  "MAP",
  "RENDER",
  "BACKEND",
  "ERROR",
  "CHALLENGE",
  "BOSS",
  "UI",
  "GENERAL",
  "MODIFIER",
];

/**
 * SECTION 4 (build #329): optional debug context threaded in from the parent
 * (GameFlow/WorldExploration). Re-exported from debugExport so existing
 * ChatPanel callers keep the same prop name. The export builders consume an
 * ExportContext (extends DebugContext with getters); ChatPanel constructs that
 * richer object at export time from its props/state.
 */
export type DebugContext = ExportContext;

// Palette of 12 bright colors — excludes #7ec8e3 (self/light-blue)
const CHAT_COLORS = [
  "#e74c3c",
  "#e67e22",
  "#f1c40f",
  "#2ecc71",
  "#1abc9c",
  "#9b59b6",
  "#e91e63",
  "#ff5722",
  "#00bcd4",
  "#8bc34a",
  "#ff9800",
  "#673ab7",
] as const;

const SELF_COLOR = "#7ec8e3";

function randomColor(): string {
  return CHAT_COLORS[Math.floor(Math.random() * CHAT_COLORS.length)];
}

function formatTime(tsMs: bigint): string {
  const d = new Date(Number(tsMs));
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

function formatDebugTime(ts: number): string {
  const d = new Date(ts);
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  const ss = d.getSeconds().toString().padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function levelColor(level: LogLevel): string {
  switch (level) {
    case "error":
      return "#ef4444";
    case "warn":
      return "#f59e0b";
    case "info":
      return "#3b82f6";
    default:
      return "#8a8090";
  }
}

type Channel = "general" | "battlelog" | "status" | "debug" | "summons";

/**
 * Channel configuration — single source of truth for both the tab row and the
 * channel toggle menu. Order here is the canonical display order.
 */
interface ChannelConfigEntry {
  key: Channel;
  label: string;
  Icon: React.ComponentType<{ size?: number }>;
  /** Badge color override (defaults to crimson #d8463f). */
  badgeColor?: string;
}

const CHANNEL_CONFIG: ChannelConfigEntry[] = [
  { key: "general", label: "General", Icon: MessageSquare },
  { key: "battlelog", label: "Battle", Icon: Swords },
  { key: "summons", label: "Summons", Icon: PawPrint },
  { key: "status", label: "Status", Icon: Sparkles, badgeColor: "#c79cff" },
  { key: "debug", label: "Debug", Icon: Bug },
];

/**
 * localStorage key for the channel-visibility UI preference. This is a UI
 * preference only (not game state), so localStorage caching is permitted per
 * project rules.
 */
const CHANNEL_VISIBILITY_KEY = "aestralto-chat-channels";

/**
 * localStorage key for the chat panel width UI preference. UI preference only
 * (not game state), so localStorage caching is permitted per project rules.
 */
const CHAT_WIDTH_KEY = "aestralto-chat-width";

/** Default panel width (px) — matches the prior hardcoded value. */
const DEFAULT_CHAT_WIDTH = 300;

/** Maximum panel width (px) — caps both auto-expand and manual drag. */
const MAX_CHAT_WIDTH = 520;

/** Per-tab width budget (px) — icon + label + padding for auto-expand math. */
const TAB_WIDTH_BUDGET = 90;

/** Read persisted chat width, clamped to [DEFAULT_CHAT_WIDTH, MAX_CHAT_WIDTH]. */
function loadChatWidth(): number {
  try {
    const raw = localStorage.getItem(CHAT_WIDTH_KEY);
    if (!raw) return DEFAULT_CHAT_WIDTH;
    const parsed = Number.parseInt(raw, 10);
    if (Number.isNaN(parsed)) return DEFAULT_CHAT_WIDTH;
    return Math.min(MAX_CHAT_WIDTH, Math.max(DEFAULT_CHAT_WIDTH, parsed));
  } catch {
    return DEFAULT_CHAT_WIDTH;
  }
}

/**
 * Default channel visibility. General + Battle Log + Summons on; Status + Debug
 * off (still reachable via the channel toggle menu).
 */
const DEFAULT_CHANNEL_VISIBILITY: Record<Channel, boolean> = {
  general: true,
  battlelog: true,
  summons: true,
  status: false,
  debug: false,
};

/** Read persisted channel visibility, falling back to defaults. */
function loadChannelVisibility(): Record<Channel, boolean> {
  try {
    const raw = localStorage.getItem(CHANNEL_VISIBILITY_KEY);
    if (!raw) return { ...DEFAULT_CHANNEL_VISIBILITY };
    const parsed = JSON.parse(raw) as Partial<Record<Channel, boolean>>;
    return {
      ...DEFAULT_CHANNEL_VISIBILITY,
      ...parsed,
    };
  } catch {
    return { ...DEFAULT_CHANNEL_VISIBILITY };
  }
}

/** Persist channel visibility to localStorage (UI preference cache only). */
function saveChannelVisibility(vis: Record<Channel, boolean>): void {
  try {
    localStorage.setItem(CHANNEL_VISIBILITY_KEY, JSON.stringify(vis));
  } catch {
    // ignore quota / private-mode failures
  }
}

interface ChatPanelProps {
  playerName: string;
  battleLogEntries?: BattleLogEntry[];
  onClearBattleLog?: () => void;
  userId?: string;
  activeEffects?: ActiveEffect[];
  /** When true, suspends the message polling interval (e.g. during battle or map transition) */
  isPaused?: boolean;
  debugLogs?: string[];
  /**
   * SECTION 4 (build #325): optional context threaded from the parent
   * (GameFlow/WorldExploration) for the debug export report. When absent the
   * export degrades gracefully (reports "N/A"). Additive prop — does not break
   * existing callers.
   */
  debugContext?: DebugContext;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ActorAny = Record<string, any>;

/**
 * Renders a battle log line with inline resistance-breakdown tokens highlighted.
 * Tokens enclosed in |[...]| are rendered in muted blue/grey to show absorbed damage.
 * Remaining text is rendered in the entry's accent color.
 */
const BattleLogText: React.FC<{ text: string; color: string }> = ({
  text,
  color,
}) => {
  // Pattern: |[...]| marks resistance breakdown segments
  const TOKEN_RE = /\|\[([^\]]+)\]\|/g;
  const parts: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let idx = 0;
  TOKEN_RE.lastIndex = 0;
  match = TOKEN_RE.exec(text);
  while (match !== null) {
    if (match.index > last) {
      parts.push(
        <span key={idx++} style={{ color, fontWeight: 600 }}>
          {text.slice(last, match.index)}
        </span>,
      );
    }
    parts.push(
      <span
        key={idx++}
        style={{
          color: "#7fb3d3",
          fontWeight: 700,
          background: "rgba(100,160,200,0.12)",
          borderRadius: 3,
          padding: "0 3px",
          fontSize: 10,
          letterSpacing: "0.03em",
        }}
      >
        ↓{match[1]}
      </span>,
    );
    last = match.index + match[0].length;
    match = TOKEN_RE.exec(text);
  }
  if (last < text.length) {
    parts.push(
      <span key={idx++} style={{ color, fontWeight: 600 }}>
        {text.slice(last)}
      </span>,
    );
  }
  if (parts.length === 0) {
    return <span style={{ color, fontWeight: 600 }}>{text}</span>;
  }
  return <>{parts}</>;
};

/**
 * SECTION 6 (build #329): Clicks sub-view for the Debug tab. Renders the
 * click-trace ring buffer (newest-first). For each ClickTraceRecord shows:
 *   - timestamp (HH:MM:SS)
 *   - branchTaken (cast | move | select | reject | noop | unknown)
 *   - castResult (or "—" when null)
 *   - row-0 id (the first combatant row's id — the intended target) +
 *     deltaToClick.dist (px from sprite center to click)
 *   - compact I1-I4 invariant pass/fail indicators: green check for pass,
 *     red x for fail with the measured number appended.
 *
 * Styled to match the carved-stone dark slate + crimson accent toolbar.
 */
const ClicksSubView: React.FC<{
  entries: readonly ClickTraceRecord[];
}> = ({ entries }) => {
  if (entries.length === 0) {
    return (
      <div
        data-ocid="chat.debug.clicks.empty_state"
        className="text-muted-foreground"
        style={{
          textAlign: "center",
          marginTop: 20,
          opacity: 0.5,
        }}
      >
        No click traces recorded yet.
      </div>
    );
  }
  // Newest-first display (buffer is oldest-first).
  const ordered = [...entries].reverse();
  return (
    <div
      data-ocid="chat.debug.clicks.list"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      {ordered.map((rec, idx) => {
        const row0 = rec.layerC[0];
        const row0Id = row0?.id ?? "—";
        const dist = row0?.deltaToClick?.dist;
        const distStr = dist != null ? `${dist.toFixed(1)}px` : "—";
        const inv = rec.invariants;
        const renderInv = (label: string, pass: boolean, measured: string) => (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 2,
              fontSize: 9,
              fontFamily: "monospace",
              padding: "1px 4px",
              borderRadius: 2,
              background: pass
                ? "rgba(46,204,113,0.12)"
                : "rgba(231,76,60,0.15)",
              border: pass
                ? "1px solid rgba(46,204,113,0.4)"
                : "1px solid rgba(231,76,60,0.45)",
              color: pass ? "#6ee7b7" : "#ef4444",
            }}
            title={pass ? `${label} PASS` : `${label} FAIL — ${measured}`}
          >
            {pass ? "✓" : "✗"}
            {label}
            {!pass && (
              <span style={{ color: "#ec8a85", marginLeft: 2 }}>
                {measured}
              </span>
            )}
          </span>
        );
        return (
          <div
            key={rec.seq}
            data-ocid={`chat.debug.clicks.item.${idx + 1}`}
            style={{
              padding: "6px 8px",
              background: "#10131a",
              border: "1px solid #3a2a2a",
              borderRadius: 3,
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  color: "rgba(160,160,170,0.6)",
                  fontSize: 10,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {formatDebugTime(rec.ts)}
              </span>
              <span
                style={{
                  color: "#ff7a6e",
                  fontWeight: 700,
                  fontSize: 9,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {rec.layerD.branchTaken}
              </span>
              <span
                style={{
                  color: "rgba(200,190,200,0.7)",
                  fontSize: 9,
                }}
              >
                {rec.layerD.castResult ?? "—"}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                flexWrap: "wrap",
                fontSize: 10,
                fontFamily: "monospace",
                color: "#c0c0c0",
              }}
            >
              <span style={{ color: "rgba(200,190,200,0.5)" }}>row0:</span>
              <span style={{ color: "#e0e0e0", fontWeight: 600 }}>
                {row0Id}
              </span>
              <span style={{ color: "rgba(200,190,200,0.5)" }}>dist:</span>
              <span style={{ color: "#ec8a85" }}>{distStr}</span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                flexWrap: "wrap",
              }}
            >
              {renderInv(
                "I1",
                inv.i1_roundTrip.pass,
                `err=${inv.i1_roundTrip.roundTripError.toFixed(2)}px`,
              )}
              {renderInv(
                "I2",
                inv.i2_rectAnchor.pass,
                `mag=${inv.i2_rectAnchor.mag.toFixed(2)}px`,
              )}
              {renderInv(
                "I3",
                inv.i3_spaceNearMiss.pass,
                `d=${inv.i3_spaceNearMiss.dist.toFixed(2)}px`,
              )}
              {renderInv(
                "I4",
                inv.i4_entityTile.pass,
                `row=${inv.i4_entityTile.rowTile ? `(${inv.i4_entityTile.rowTile.x},${inv.i4_entityTile.rowTile.y})` : "null"}`,
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const ChatPanel: React.FC<ChatPanelProps> = ({
  playerName,
  battleLogEntries = [],
  onClearBattleLog,
  userId,
  activeEffects = [],
  isPaused = false,
  debugContext,
}) => {
  const [isFolded, setIsFolded] = useState(false);
  const [activeChannel, setActiveChannel] = useState<Channel>("general");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [unreadGeneral, setUnreadGeneral] = useState(0);
  const [unreadBattleLog, setUnreadBattleLog] = useState(0);
  const [unreadStatus, setUnreadStatus] = useState(0);
  const [unreadSummons, setUnreadSummons] = useState(0);
  const [myColor] = useState<string>(randomColor);
  const [isSending, setIsSending] = useState(false);
  const [debugEntries, setDebugEntries] = useState<DebugLogEntry[]>([]);
  const [expandedDebugIds, setExpandedDebugIds] = useState<Set<number>>(
    new Set(),
  );
  // SECTION 5 (build #325): Debug tab advanced controls state.
  // activeCategories — empty set means "no filter, show all". Non-empty means
  // entry.category must be a member (union semantics across selected chips).
  const [activeCategories, setActiveCategories] = useState<Set<LogCategory>>(
    new Set(),
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isDebugPaused, setIsDebugPaused] = useState(false);
  const [copyConfirm, setCopyConfirm] = useState(false);
  // SECTION 6 (build #329): Debug tab sub-view toggle — "log" (existing log
  // view) or "clicks" (new click-trace ring buffer view).
  const [debugSubView, setDebugSubView] = useState<"log" | "clicks">("log");
  // SECTION 6 (build #329): click-trace ring buffer mirror for the Clicks
  // sub-view. Refreshed on every render of the Debug tab; the buffer is a
  // readonly snapshot from getClickTraceBuffer().
  const [clickTraceEntries, setClickTraceEntries] = useState<
    readonly ClickTraceRecord[]
  >([]);
  // SECTION 6 (build #329): geometry overlay enabled flag, mirrored from the
  // shared geometryOverlayState module so the toolbar toggle reflects the
  // global flag consumed by the WX render loop.
  const [geometryOverlayOn, setGeometryOverlayOn] = useState(
    getGeometryOverlayEnabled(),
  );
  // Channel visibility (UI preference, persisted to localStorage).
  const [channelVisibility, setChannelVisibility] = useState<
    Record<Channel, boolean>
  >(() => loadChannelVisibility());
  // Channel toggle menu open state.
  const [channelMenuOpen, setChannelMenuOpen] = useState(false);
  const channelMenuRef = useRef<HTMLDivElement>(null);
  const channelMenuButtonRef = useRef<HTMLButtonElement>(null);

  // Manual chat width (px) — the floor for the effective width. Auto-expand can
  // push the panel wider than this when more channels are enabled, but never
  // narrower than the manually-set value. Persisted to localStorage.
  const [chatWidth, setChatWidth] = useState<number>(() => loadChatWidth());
  // Refs for the right-edge drag handle.
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const dragStartXRef = useRef(0);
  const dragStartWidthRef = useRef(0);

  const lastSeenIdRef = useRef<bigint>(0n);
  const lastSeenBattleLogCount = useRef<number>(0);
  const lastSeenStatusCountRef = useRef<number>(0);
  const lastSeenSummonsCount = useRef<number>(0);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeChannelRef = useRef(activeChannel);
  useEffect(() => {
    activeChannelRef.current = activeChannel;
  }, [activeChannel]);
  const { actor } = useActor();

  // Unread count lookup keyed by channel — drives the badge in the tab row.
  const unreadByChannel: Record<Channel, number> = {
    general: unreadGeneral,
    battlelog: unreadBattleLog,
    summons: unreadSummons,
    status: unreadStatus,
    debug: 0,
  };

  // Visible channels derived from the visibility map + canonical config order.
  const visibleChannels = useMemo(
    () => CHANNEL_CONFIG.filter((c) => channelVisibility[c.key]),
    [channelVisibility],
  );

  /**
   * Auto-expand computation. Each enabled tab needs roughly TAB_WIDTH_BUDGET px
   * (icon + label + padding). The required width is clamped to
   * [DEFAULT_CHAT_WIDTH, MAX_CHAT_WIDTH]. The effective width is the max of the
   * manual chatWidth (floor) and the auto-computed width — so enabling more
   * channels widens the panel, and disabling channels retracts it back down to
   * the manual floor when autoWidth drops below chatWidth.
   *
   * Verify (5 channels): requiredWidth = 5*90 = 450, autoWidth = 450,
   *   effectiveWidth = max(300, 450) = 450 → widens, all tabs visible.
   * Verify (3 channels): requiredWidth = 3*90 = 270, autoWidth = 300 (clamped
   *   to DEFAULT), effectiveWidth = max(300, 300) = 300 → retracts.
   */
  const requiredWidth = Math.max(
    DEFAULT_CHAT_WIDTH,
    visibleChannels.length * TAB_WIDTH_BUDGET,
  );
  const autoWidth = Math.min(MAX_CHAT_WIDTH, requiredWidth);
  const effectiveWidth = Math.max(chatWidth, autoWidth);

  /**
   * Toggle a channel's visibility. If the channel being hidden is currently
   * active, switch activeChannel to the first still-enabled channel (or fall
   * back to "general" if none enabled — guarantees a reachable view).
   * Persists the new visibility map to localStorage.
   */
  const toggleChannelVisibility = useCallback(
    (key: Channel) => {
      setChannelVisibility((prev) => {
        const next: Record<Channel, boolean> = {
          ...prev,
          [key]: !prev[key],
        };
        saveChannelVisibility(next);
        // If we just hid the active channel, switch to the first enabled one.
        if (!next[key] && activeChannel === key) {
          const stillEnabled = CHANNEL_CONFIG.filter((c) => next[c.key]);
          const fallback = stillEnabled[0]?.key ?? "general";
          setActiveChannel(fallback);
        }
        return next;
      });
    },
    [activeChannel],
  );

  // Persist the manual chat width preference to localStorage.
  useEffect(() => {
    try {
      localStorage.setItem(CHAT_WIDTH_KEY, String(chatWidth));
    } catch {
      // ignore quota / private-mode failures
    }
  }, [chatWidth]);

  /**
   * Right-edge drag handle: widens the panel beyond the auto-computed width
   * (up to MAX_CHAT_WIDTH). On drag end the new width is persisted via the
   * chatWidth state effect above. Pointer events are used so the drag works
   * with mouse and touch alike; capture prevents the drag from being lost when
   * the cursor leaves the handle.
   */
  const onDragHandlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      dragStartXRef.current = e.clientX;
      dragStartWidthRef.current = effectiveWidth;
      const handle = dragHandleRef.current;
      if (handle) {
        try {
          handle.setPointerCapture(e.pointerId);
        } catch {
          // ignore — capture is best-effort
        }
      }
      const onMove = (ev: PointerEvent) => {
        const delta = ev.clientX - dragStartXRef.current;
        const next = Math.min(
          MAX_CHAT_WIDTH,
          Math.max(DEFAULT_CHAT_WIDTH, dragStartWidthRef.current + delta),
        );
        setChatWidth(next);
      };
      const onUp = (ev: PointerEvent) => {
        const h = dragHandleRef.current;
        if (h) {
          try {
            h.releasePointerCapture(ev.pointerId);
          } catch {
            // ignore
          }
        }
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
      };
      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
    },
    [effectiveWidth],
  );

  // Close the channel toggle menu on outside click or Escape.
  useEffect(() => {
    if (!channelMenuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        channelMenuRef.current &&
        !channelMenuRef.current.contains(target) &&
        channelMenuButtonRef.current &&
        !channelMenuButtonRef.current.contains(target)
      ) {
        setChannelMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setChannelMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [channelMenuOpen]);

  // Subscribe to structured debug logs. Mirror into React only while the
  // Debug tab is open — battle/AI/spell logs otherwise re-rendered ChatPanel
  // on every line (array copy of up to 2000 entries).
  useEffect(() => {
    setDebugEntries([...getDebugLogBuffer()]);
    const unsub = subscribeDebugLogs((entry) => {
      if (activeChannelRef.current !== "debug") return;
      setDebugEntries((prev) => {
        const next = [...prev, entry];
        if (next.length > 2000) return next.slice(-2000);
        return next;
      });
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (activeChannel !== "debug") return;
    setDebugEntries([...getDebugLogBuffer()]);
  }, [activeChannel]);

  // SECTION 5 (build #325): subscribe to debug-pause state so the toolbar
  // toggle reflects the global pause flag maintained by debugLogger.
  useEffect(() => {
    const unsub = subscribeDebugPaused((paused) => {
      setIsDebugPaused(paused);
    });
    return unsub;
  }, []);

  // SECTION 6 (build #329): refresh the click-trace ring buffer mirror
  // whenever the Debug tab is active. The buffer is a readonly snapshot from
  // getClickTraceBuffer() (oldest-first); we reverse for newest-first display.
  // Re-snap on every debugEntries change as a cheap "something happened" tick
  // — click traces are recorded by the WX click handler, not by the debug
  // logger, so there is no dedicated subscription channel. Polling on the
  // debug-log tick is a low-cost way to keep the Clicks view fresh while the
  // Debug tab is open. debugEntries is intentionally a refresh trigger.
  // biome-ignore lint/correctness/useExhaustiveDependencies: debugEntries is a deliberate tick to re-pull the click trace buffer when new debug events arrive.
  useEffect(() => {
    if (activeChannel !== "debug") return;
    setClickTraceEntries(getClickTraceBuffer());
  }, [activeChannel, debugEntries]);

  // SECTION 6 (build #329): subscribe to geometry-overlay flag changes so the
  // toolbar toggle reflects the global flag consumed by the WX render loop.
  useEffect(() => {
    const unsub = subscribeGeometryOverlayEnabled((enabled) => {
      setGeometryOverlayOn(enabled);
    });
    return unsub;
  }, []);

  // SECTION 5 (build #325): filtered + reversed debug entries for display.
  // Filter rules: (a) if activeCategories is non-empty, entry.category must be
  // a member (union of selected chips); (b) if searchQuery is non-empty,
  // entry.message must contain the substring (case-insensitive). Result is
  // reversed so newest entries appear at the top.
  const filteredDebugEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return debugEntries
      .filter((entry) => {
        if (
          activeCategories.size > 0 &&
          !activeCategories.has(entry.category)
        ) {
          return false;
        }
        if (q.length > 0 && !entry.message.toLowerCase().includes(q)) {
          return false;
        }
        return true;
      })
      .slice()
      .reverse();
  }, [debugEntries, activeCategories, searchQuery]);

  // SECTION 4 (build #329): construct an ExportContext from the debugContext
  // prop plus live getters for the debug log buffer, click trace buffer, and
  // geometry snapshot. The getters are invoked at export time, so the snapshot
  // reflects state at the moment the user clicks Export.
  //
  // getGeometrySnapshot requires inputs (combatants, spriteRects, camera, dpr,
  // canvas sizes) that ChatPanel does not have. WorldExploration owns those
  // inputs, so it is responsible for providing a getGeometrySnapshot getter on
  // the debugContext prop (DebugContext = ExportContext already declares the
  // field as optional). We forward debugContext.getGeometrySnapshot when
  // present and fall back to () => undefined otherwise — debugExport handles
  // the null case gracefully (the GEOMETRY SNAPSHOT section degrades to
  // "(snapshot unavailable)").
  const exportContext = useMemo<ExportContext | undefined>(
    () =>
      debugContext
        ? {
            ...debugContext,
            getDebugLogBuffer: () => getDebugLogBuffer(),
            getClickTraceBuffer: () => getClickTraceBuffer(),
            getGeometrySnapshot:
              debugContext.getGeometrySnapshot ?? (() => undefined),
          }
        : undefined,
    [debugContext],
  );

  // Shift+D → open debug tab and unfold
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.shiftKey &&
        e.key === "d" &&
        !(
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement
        )
      ) {
        e.preventDefault();
        setActiveChannel("debug");
        if (isFolded) setIsFolded(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isFolded]);

  // Track unread status effects
  useEffect(() => {
    const newCount = activeEffects.length;
    if (newCount > lastSeenStatusCountRef.current) {
      if (isFolded || activeChannel !== "status") {
        setUnreadStatus(
          (prev) => prev + (newCount - lastSeenStatusCountRef.current),
        );
      } else {
        lastSeenStatusCountRef.current = newCount;
      }
    }
    if (newCount < lastSeenStatusCountRef.current) {
      lastSeenStatusCountRef.current = 0;
      setUnreadStatus(0);
    }
  }, [activeEffects.length, isFolded, activeChannel]);

  // Track unread battle log entries
  useEffect(() => {
    const newCount = battleLogEntries.length;
    if (newCount > lastSeenBattleLogCount.current) {
      if (isFolded || activeChannel !== "battlelog") {
        setUnreadBattleLog(
          (prev) => prev + (newCount - lastSeenBattleLogCount.current),
        );
      } else {
        lastSeenBattleLogCount.current = newCount;
      }
    }
    if (newCount < lastSeenBattleLogCount.current) {
      lastSeenBattleLogCount.current = 0;
      setUnreadBattleLog(0);
    }
  }, [battleLogEntries.length, isFolded, activeChannel]);

  // Track unread summon log entries
  useEffect(() => {
    const newCount = battleLogEntries.filter((e) => e.isSummon === true).length;
    if (newCount > lastSeenSummonsCount.current) {
      if (isFolded || activeChannel !== "summons") {
        setUnreadSummons(
          (prev) => prev + (newCount - lastSeenSummonsCount.current),
        );
      } else {
        lastSeenSummonsCount.current = newCount;
      }
    }
    if (newCount < lastSeenSummonsCount.current) {
      lastSeenSummonsCount.current = 0;
      setUnreadSummons(0);
    }
  }, [battleLogEntries, isFolded, activeChannel]);

  const fetchMessages = useCallback(async () => {
    if (!actor) return;
    // M4: 5-second timeout prevents slow responses from cascading into queued requests
    let didTimeout = false;
    const timeoutId = setTimeout(() => {
      didTimeout = true;
    }, 5000);
    try {
      const raw = await Promise.race([
        (actor as ActorAny).getMessages(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("chat poll timed out")), 5000),
        ),
      ]);
      clearTimeout(timeoutId);
      if (!Array.isArray(raw)) return;
      const next = raw as ChatMessage[];
      setMessages((prev) => {
        if (
          prev.length === next.length &&
          prev.length > 0 &&
          prev[prev.length - 1]?.id === next[next.length - 1]?.id
        ) {
          return prev;
        }
        if (prev.length === 0 && next.length === 0) return prev;
        return next;
      });
      if (isFolded || activeChannel !== "general") {
        const newMsgs = (raw as ChatMessage[]).filter(
          (m) => m.id > lastSeenIdRef.current,
        );
        if (newMsgs.length > 0) {
          setUnreadGeneral((prev) => prev + newMsgs.length);
        }
      }
      if (raw.length > 0) {
        lastSeenIdRef.current = (raw as ChatMessage[]).reduce(
          (max, m) => (m.id > max ? m.id : max),
          lastSeenIdRef.current,
        );
      }
    } catch {
      clearTimeout(timeoutId);
      if (didTimeout) return; // skip silently on timeout
      // Silently ignore other errors
    }
  }, [actor, isFolded, activeChannel]);

  const isPausedRef = useRef(isPaused);
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // C6: Track browser tab visibility so polling stops immediately when hidden.
  const tabVisibleRef = useRef(!document.hidden);
  useEffect(() => {
    const onVisibility = () => {
      tabVisibleRef.current = !document.hidden;
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    // LEAK-12: Only start polling when not paused. When isPaused flips true
    // the interval is cleared; when it flips false a new one is created.
    // This prevents the interval from running during map transitions or battles.
    // FIX C2: Also guard INSIDE the callback with isPausedRef to prevent a stale
    // closure from the previous interval firing once after the dependency changes.
    // C6: Also skip when tab is hidden to avoid stale request bursts on resume.
    if (isPaused) return;
    fetchMessages();
    const id = setInterval(() => {
      if (isPausedRef.current) return; // stale-closure guard
      if (!tabVisibleRef.current) return; // C6: skip while tab is backgrounded
      fetchMessages();
    }, 2000);
    return () => clearInterval(id);
  }, [fetchMessages, isPaused]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: length is the relevant trigger
  useEffect(() => {
    if (!isFolded && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [
    messages.length,
    battleLogEntries.length,
    activeEffects.length,
    isFolded,
    activeChannel,
  ]);

  useEffect(() => {
    if (!isFolded) {
      if (activeChannel === "general") {
        setUnreadGeneral(0);
        lastSeenIdRef.current = messages.reduce(
          (max, m) => (m.id > max ? m.id : max),
          lastSeenIdRef.current,
        );
      } else if (activeChannel === "battlelog") {
        setUnreadBattleLog(0);
        lastSeenBattleLogCount.current = battleLogEntries.length;
      } else if (activeChannel === "summons") {
        setUnreadSummons(0);
        lastSeenSummonsCount.current = battleLogEntries.filter(
          (e) => e.isSummon === true,
        ).length;
      } else if (activeChannel === "status") {
        setUnreadStatus(0);
        lastSeenStatusCountRef.current = activeEffects.length;
      }
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [
    isFolded,
    activeChannel,
    messages,
    battleLogEntries,
    activeEffects.length,
  ]);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || !actor || isSending) return;
    setIsSending(true);
    setInputText("");
    try {
      await (actor as ActorAny).sendMessage(playerName, text, myColor);
      await fetchMessages();
    } catch {
      // ignore
    } finally {
      setIsSending(false);
    }
  }, [inputText, actor, isSending, playerName, myColor, fetchMessages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSend();
  };

  const _totalUnread =
    unreadGeneral + unreadBattleLog + unreadStatus + unreadSummons;

  // Status tab content renderer
  const renderStatusContent = () => {
    if (activeEffects.length === 0) {
      return (
        <div
          data-ocid="chat.status.empty_state"
          style={{
            color: "rgba(200,140,140,0.4)",
            fontSize: 11,
            textAlign: "center",
            marginTop: 16,
          }}
        >
          No active battle effects.
        </div>
      );
    }
    const playerEffects = activeEffects.filter((e) => e.targetId === "player");
    const enemyMap: Record<string, ActiveEffect[]> = {};
    for (const eff of activeEffects) {
      if (eff.targetId !== "player") {
        if (!enemyMap[eff.targetId]) enemyMap[eff.targetId] = [];
        enemyMap[eff.targetId].push(eff);
      }
    }
    const effColor = (type: ActiveEffect["type"]) =>
      type === "buff" ? "#22c55e" : type === "dot" ? "#f97316" : "#ef4444";
    const renderEff = (eff: ActiveEffect) => (
      <div
        key={eff.id}
        data-ocid="chat.status.effect_entry"
        style={{
          fontSize: 11,
          lineHeight: 1.5,
          marginBottom: 3,
          paddingLeft: 8,
        }}
      >
        <span style={{ marginRight: 4 }}>{eff.iconEmoji}</span>
        <span style={{ color: effColor(eff.type), fontWeight: 700 }}>
          {eff.effectName}
        </span>
        <span style={{ color: "rgba(200,190,200,0.7)" }}>
          {" "}
          — {eff.description}
        </span>
        <span style={{ color: "rgba(160,160,170,0.6)", fontSize: 10 }}>
          {" "}
          ({eff.duration}t)
        </span>
      </div>
    );
    return (
      <>
        {playerEffects.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            <div
              style={{
                color: "#7ec8e3",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.06em",
                marginBottom: 4,
              }}
            >
              YOU
            </div>
            {playerEffects.map(renderEff)}
          </div>
        )}
        {Object.entries(enemyMap).map(([enemyId, effs]) => (
          <div key={enemyId} style={{ marginBottom: 8 }}>
            <div
              style={{
                color: "#ef4444",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.06em",
                marginBottom: 4,
              }}
            >
              ENEMY {enemyId.slice(-4).toUpperCase()}
            </div>
            {effs.map(renderEff)}
          </div>
        ))}
      </>
    );
  };

  return (
    <DraggablePanel
      panelId="chat-panel"
      title="Chat"
      userId={userId}
      defaultPosition={{
        x: Math.max(0, window.innerWidth - 330),
        y: Math.max(0, window.innerHeight - 420),
      }}
      defaultFolded={false}
      zIndex={9000}
      style={{ width: effectiveWidth }}
      onFoldChange={(folded) => setIsFolded(folded)}
    >
      <div
        data-ocid="chat.panel"
        className="stone-frame"
        style={{
          width: effectiveWidth,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          fontFamily: "var(--font-body)",
          position: "relative",
        }}
      >
        <div
          className="stone-well"
          style={{
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            flex: 1,
          }}
        >
          {/* Tab bar — always visible. Horizontally scrolls so every enabled
              channel is reachable regardless of count; a gear toggle on the
              right lets the player enable/disable which channels show as tabs. */}
          <div
            style={{
              display: "flex",
              alignItems: "stretch",
              gap: 2,
              padding: "6px 8px",
              borderBottom: "1px solid rgba(216,70,63,0.15)",
              background: "rgba(0,0,0,0.15)",
              position: "relative",
            }}
          >
            {/* Scrollable tab strip — never clips a tab. */}
            <div
              data-ocid="chat.tab_row"
              className="dofus-scrollbar"
              style={{
                display: "flex",
                gap: 2,
                overflowX: "auto",
                overflowY: "hidden",
                flex: 1,
                minWidth: 0,
                scrollbarWidth: "thin",
              }}
            >
              {visibleChannels.map(({ key, label, Icon, badgeColor }) => {
                const isActive = activeChannel === key;
                const unread = unreadByChannel[key];
                return (
                  <button
                    key={key}
                    type="button"
                    data-ocid={`chat.tab.${key}`}
                    onClick={() => setActiveChannel(key)}
                    className={`flex items-center justify-center gap-1 py-1 px-2 text-[9px] font-semibold uppercase tracking-wider border-0 rounded-md transition-colors duration-150 cursor-pointer whitespace-nowrap ${
                      isActive
                        ? "text-[#d8463f] font-bold"
                        : "text-[#8a8090] hover:text-[#cdbfd2]"
                    }`}
                    style={{ fontFamily: "var(--font-body)", flexShrink: 0 }}
                  >
                    <Icon size={12} />
                    <span>{label}</span>
                    {unread > 0 && !isActive && (
                      <span
                        className="inline-flex items-center justify-center rounded-full text-white text-[9px] font-bold min-w-[14px] h-[14px] px-[3px]"
                        style={{
                          background: badgeColor ?? "#d8463f",
                        }}
                      >
                        {unread > 99 ? "99+" : unread}
                      </span>
                    )}
                  </button>
                );
              })}
              {visibleChannels.length === 0 && (
                <span
                  data-ocid="chat.tab_row.empty_state"
                  style={{
                    fontSize: 10,
                    color: "rgba(200,190,200,0.5)",
                    padding: "4px 6px",
                  }}
                >
                  All channels hidden — use the gear to enable one.
                </span>
              )}
            </div>

            {/* Channel toggle (gear) — opens a menu to enable/disable channels. */}
            <button
              ref={channelMenuButtonRef}
              type="button"
              data-ocid="chat.channel_toggle_button"
              aria-label="Toggle chat channels"
              aria-haspopup="true"
              aria-expanded={channelMenuOpen}
              onClick={() => setChannelMenuOpen((v) => !v)}
              className="flex items-center justify-center border-0 rounded-md transition-colors duration-150 cursor-pointer"
              style={{
                flexShrink: 0,
                width: 24,
                height: 24,
                color: channelMenuOpen ? "#d8463f" : "#8a8090",
                background: channelMenuOpen
                  ? "rgba(216,70,63,0.12)"
                  : "transparent",
              }}
            >
              <Settings size={13} />
            </button>

            {/* Channel toggle menu — carved-stone popover listing all channels. */}
            {channelMenuOpen && (
              <div
                ref={channelMenuRef}
                data-ocid="chat.channel_toggle_menu"
                role="menu"
                className="stone-frame"
                style={{
                  position: "absolute",
                  top: "100%",
                  right: 6,
                  marginTop: 4,
                  zIndex: 50,
                  minWidth: 168,
                  padding: "6px 8px",
                  background: "rgba(20,18,24,0.98)",
                  border: "1px solid rgba(216,70,63,0.35)",
                  borderRadius: 6,
                  boxShadow: "0 6px 18px rgba(0,0,0,0.6)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "rgba(200,190,200,0.55)",
                    padding: "2px 6px 4px",
                    borderBottom: "1px solid rgba(216,70,63,0.15)",
                    marginBottom: 2,
                  }}
                >
                  Channels
                </div>
                {CHANNEL_CONFIG.map(({ key, label, Icon }) => {
                  const enabled = channelVisibility[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      role="menuitemcheckbox"
                      aria-checked={enabled}
                      data-ocid={`chat.channel_toggle.${key}`}
                      onClick={() => toggleChannelVisibility(key)}
                      className="flex items-center gap-2 border-0 rounded-md transition-colors duration-150 cursor-pointer"
                      style={{
                        padding: "5px 6px",
                        background: "transparent",
                        color: enabled ? "#cdbfd2" : "rgba(200,190,200,0.45)",
                        textAlign: "left",
                        width: "100%",
                      }}
                    >
                      <Icon size={12} />
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: enabled ? 600 : 400,
                          flex: 1,
                        }}
                      >
                        {label}
                      </span>
                      {/* On/off indicator — crimson when on, dim slate when off. */}
                      <span
                        aria-hidden="true"
                        style={{
                          width: 26,
                          height: 14,
                          borderRadius: 8,
                          background: enabled
                            ? "#d8463f"
                            : "rgba(120,110,120,0.35)",
                          border: enabled
                            ? "1px solid rgba(216,70,63,0.6)"
                            : "1px solid rgba(120,110,120,0.4)",
                          position: "relative",
                          flexShrink: 0,
                          transition: "background 150ms",
                        }}
                      >
                        <span
                          style={{
                            position: "absolute",
                            top: 1,
                            left: enabled ? 12 : 1,
                            width: 11,
                            height: 11,
                            borderRadius: "50%",
                            background: enabled
                              ? "rgba(255,235,235,0.95)"
                              : "rgba(200,190,200,0.6)",
                            transition: "left 150ms",
                          }}
                        />
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <>
            {/* Message list */}
            <div
              ref={listRef}
              data-ocid="chat.message_list"
              className="dofus-scrollbar"
              style={{
                height: 280,
                overflowY: "auto",
                padding: "8px 10px",
                display: "flex",
                flexDirection: "column",
                gap: 3,
              }}
            >
              {activeChannel === "general" &&
                (messages.length === 0 ? (
                  <div
                    data-ocid="chat.general.empty_state"
                    className="text-muted-foreground"
                    style={{
                      fontSize: 11,
                      textAlign: "center",
                      marginTop: 16,
                      opacity: 0.5,
                    }}
                  >
                    No messages yet. Say something!
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isSelf = msg.playerName === playerName;
                    return (
                      <div
                        key={String(msg.id)}
                        style={{
                          fontSize: 12,
                          lineHeight: 1.5,
                          wordBreak: "break-word",
                        }}
                      >
                        <span
                          style={{
                            color: "rgba(160,160,170,0.7)",
                            fontSize: 10,
                            marginRight: 5,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          [{formatTime(msg.timestampMs)}]
                        </span>
                        <span
                          style={{
                            color: isSelf ? SELF_COLOR : msg.colorHex,
                            fontWeight: 600,
                            marginRight: 4,
                          }}
                        >
                          {msg.playerName}:
                        </span>
                        <span
                          style={{
                            color: isSelf
                              ? "#d0f0ff"
                              : "rgba(235,235,245,0.88)",
                          }}
                        >
                          {msg.text}
                        </span>
                      </div>
                    );
                  })
                ))}
              {activeChannel === "battlelog" &&
                (battleLogEntries.length === 0 ? (
                  <div
                    data-ocid="chat.battlelog.empty_state"
                    className="text-muted-foreground"
                    style={{
                      fontSize: 11,
                      textAlign: "center",
                      marginTop: 16,
                      opacity: 0.5,
                    }}
                  >
                    No battle actions yet.
                  </div>
                ) : (
                  battleLogEntries.map((entry) => (
                    <div
                      key={entry.id}
                      data-ocid="chat.battlelog.entry"
                      style={{
                        fontSize: 11,
                        lineHeight: 1.5,
                        wordBreak: "break-word",
                      }}
                    >
                      <span
                        style={{
                          color: "rgba(160,160,170,0.6)",
                          fontSize: 10,
                          marginRight: 5,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        [{entry.timestamp}]
                      </span>
                      <BattleLogText text={entry.text} color={entry.color} />
                    </div>
                  ))
                ))}
              {activeChannel === "summons" &&
                (battleLogEntries.filter((e) => e.isSummon === true).length ===
                0 ? (
                  <div
                    data-ocid="chat.summons.empty_state"
                    className="text-muted-foreground"
                    style={{
                      fontSize: 11,
                      textAlign: "center",
                      marginTop: 16,
                      opacity: 0.5,
                    }}
                  >
                    No summon actions yet.
                  </div>
                ) : (
                  battleLogEntries
                    .filter((e) => e.isSummon === true)
                    .map((entry) => (
                      <div
                        key={entry.id}
                        data-ocid="chat.summons.entry"
                        style={{
                          fontSize: 11,
                          lineHeight: 1.5,
                          wordBreak: "break-word",
                        }}
                      >
                        <span
                          style={{
                            color: "rgba(160,160,170,0.6)",
                            fontSize: 10,
                            marginRight: 5,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          [{entry.timestamp}]
                        </span>
                        <BattleLogText text={entry.text} color={entry.color} />
                      </div>
                    ))
                ))}
              {activeChannel === "status" && renderStatusContent()}
              {activeChannel === "debug" && (
                <div
                  data-ocid="chat.debug.list"
                  style={{
                    padding: "8px",
                    color: "#aaa",
                    fontFamily: "monospace",
                    fontSize: "11px",
                    overflowY: "auto",
                    height: "100%",
                  }}
                >
                  {/* Debug tab controls toolbar — carved-stone dark slate with crimson accents */}
                  <div
                    data-ocid="chat.debug.toolbar"
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                      alignItems: "center",
                      padding: 8,
                      marginBottom: 8,
                      background: "#1a1d23",
                      border: "1px solid #3a2a2a",
                      borderRadius: 4,
                      boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,0.04), 0 2px 4px rgba(0,0,0,0.4)",
                    }}
                  >
                    {/* Filter chips: 'All' + per-category toggle */}
                    <button
                      type="button"
                      data-ocid="chat.debug.filter.all"
                      onClick={() => setActiveCategories(new Set())}
                      style={{
                        padding: "3px 8px",
                        fontSize: 10,
                        fontFamily: "monospace",
                        cursor: "pointer",
                        background:
                          activeCategories.size === 0 ? "#c0392b" : "#2a2d33",
                        color: activeCategories.size === 0 ? "#fff" : "#c0c0c0",
                        border: "1px solid #4a3a3a",
                        borderRadius: 3,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      All
                    </button>
                    {DEBUG_CATEGORY_CHIPS.map((cat) => {
                      const active = activeCategories.has(cat);
                      return (
                        <button
                          type="button"
                          key={cat}
                          data-ocid={`chat.debug.filter.${cat}`}
                          onClick={() => {
                            const next = new Set(activeCategories);
                            if (next.has(cat)) {
                              next.delete(cat);
                            } else {
                              next.add(cat);
                            }
                            setActiveCategories(next);
                          }}
                          style={{
                            padding: "3px 8px",
                            fontSize: 10,
                            fontFamily: "monospace",
                            cursor: "pointer",
                            background: active ? "#c0392b" : "#2a2d33",
                            color: active ? "#fff" : "#c0c0c0",
                            border: "1px solid #4a3a3a",
                            borderRadius: 3,
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                          }}
                        >
                          {cat}
                        </button>
                      );
                    })}
                    {/* Search box */}
                    <input
                      type="text"
                      data-ocid="chat.debug.search_input"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search logs..."
                      style={{
                        flex: 1,
                        minWidth: 120,
                        padding: "4px 8px",
                        fontSize: 11,
                        fontFamily: "monospace",
                        background: "#10131a",
                        color: "#e0e0e0",
                        border: "1px solid #4a3a3a",
                        borderRadius: 3,
                        outline: "none",
                      }}
                    />
                    {/* Pause/Resume toggle */}
                    <button
                      type="button"
                      data-ocid="chat.debug.pause_button"
                      onClick={() => {
                        toggleDebugPaused();
                      }}
                      title={
                        isDebugPaused
                          ? "Resume log capture"
                          : "Pause log capture"
                      }
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "4px 8px",
                        fontSize: 10,
                        fontFamily: "monospace",
                        cursor: "pointer",
                        background: isDebugPaused ? "#2a4a2a" : "#3a2a2a",
                        color: "#e0e0e0",
                        border: "1px solid #5a3a3a",
                        borderRadius: 3,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      {isDebugPaused ? <Play size={11} /> : <Pause size={11} />}
                      {isDebugPaused ? "Resume" : "Pause"}
                    </button>
                    {/* Copy all (filtered) buffer to clipboard */}
                    <button
                      type="button"
                      data-ocid="chat.debug.copy_button"
                      onClick={() => {
                        const text = filteredDebugEntries
                          .map(
                            (e) =>
                              (e as { message?: string; text?: string })
                                .message ||
                              (e as { text?: string }).text ||
                              String(e),
                          )
                          .join("\n");
                        navigator.clipboard.writeText(text).then(() => {
                          setCopyConfirm(true);
                          setTimeout(() => setCopyConfirm(false), 2000);
                        });
                      }}
                      title="Copy filtered buffer to clipboard"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "4px 8px",
                        fontSize: 10,
                        fontFamily: "monospace",
                        cursor: "pointer",
                        background: copyConfirm ? "#2a4a2a" : "#2a2d33",
                        color: "#e0e0e0",
                        border: "1px solid #4a3a3a",
                        borderRadius: 3,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      <Copy size={11} />
                      {copyConfirm ? "Copied!" : "Copy all"}
                    </button>
                    {/* Geometry overlay toggle — mirrors the pause/resume toggle
                        style. Reflects geometryOverlayOn; flips the shared
                        geometryOverlayState flag consumed by the WX render
                        loop. */}
                    <button
                      type="button"
                      data-ocid="chat.debug.geometry_overlay_toggle"
                      onClick={() =>
                        setGeometryOverlayEnabled(!geometryOverlayOn)
                      }
                      title={
                        geometryOverlayOn
                          ? "Hide geometry overlay"
                          : "Show geometry overlay"
                      }
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "4px 8px",
                        fontSize: 10,
                        fontFamily: "monospace",
                        cursor: "pointer",
                        background: geometryOverlayOn ? "#2a4a2a" : "#3a2a2a",
                        color: "#e0e0e0",
                        border: "1px solid #5a3a3a",
                        borderRadius: 3,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      <Bug size={11} />
                      {geometryOverlayOn ? "Geom on" : "Geom off"}
                    </button>
                    {/* PDF export approach: print-optimized window with auto window.print() — user picks Save as PDF */}
                    <button
                      type="button"
                      data-ocid="chat.debug.export_button"
                      onClick={() => {
                        const w = window.open("", "_blank");
                        if (w) {
                          w.document.write(buildDebugReportHtml(exportContext));
                          w.document.close();
                          setTimeout(() => w.print(), 250);
                        }
                      }}
                      title="Export debug report as PDF (print dialog)"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "4px 8px",
                        fontSize: 10,
                        fontFamily: "monospace",
                        cursor: "pointer",
                        background: "#3a2a2a",
                        color: "#e0e0e0",
                        border: "1px solid #5a3a3a",
                        borderRadius: 3,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      <Download size={11} />
                      Export
                    </button>
                    {/* Plain .txt download fallback */}
                    <button
                      type="button"
                      data-ocid="chat.debug.export_txt_button"
                      onClick={() => {
                        const blob = new Blob(
                          [buildDebugReportText(exportContext)],
                          { type: "text/plain" },
                        );
                        const a = document.createElement("a");
                        a.href = URL.createObjectURL(blob);
                        a.download = `debug-export-${Date.now()}.txt`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                      }}
                      title="Export debug report as plain text file"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "4px 8px",
                        fontSize: 10,
                        fontFamily: "monospace",
                        cursor: "pointer",
                        background: "#2a2d33",
                        color: "#e0e0e0",
                        border: "1px solid #4a3a3a",
                        borderRadius: 3,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      <FileText size={11} />
                      Export .txt
                    </button>
                  </div>
                  {/* Sub-view toggle: Log | Clicks. Carved-stone dark slate +
                      crimson accent matching the toolbar controls. */}
                  <div
                    data-ocid="chat.debug.subview_toggle"
                    style={{
                      display: "flex",
                      gap: 4,
                      marginBottom: 8,
                      padding: "4px 6px",
                      background: "#10131a",
                      border: "1px solid #3a2a2a",
                      borderRadius: 3,
                    }}
                  >
                    <button
                      type="button"
                      data-ocid="chat.debug.subview.log"
                      onClick={() => setDebugSubView("log")}
                      style={{
                        flex: 1,
                        padding: "3px 8px",
                        fontSize: 10,
                        fontFamily: "monospace",
                        cursor: "pointer",
                        background:
                          debugSubView === "log" ? "#c0392b" : "#2a2d33",
                        color: debugSubView === "log" ? "#fff" : "#c0c0c0",
                        border: "1px solid #4a3a3a",
                        borderRadius: 3,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      Log
                    </button>
                    <button
                      type="button"
                      data-ocid="chat.debug.subview.clicks"
                      onClick={() => setDebugSubView("clicks")}
                      style={{
                        flex: 1,
                        padding: "3px 8px",
                        fontSize: 10,
                        fontFamily: "monospace",
                        cursor: "pointer",
                        background:
                          debugSubView === "clicks" ? "#c0392b" : "#2a2d33",
                        color: debugSubView === "clicks" ? "#fff" : "#c0c0c0",
                        border: "1px solid #4a3a3a",
                        borderRadius: 3,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      Clicks
                    </button>
                  </div>
                  {debugSubView === "log" &&
                    (debugEntries.length === 0 ? (
                      <div
                        data-ocid="chat.debug.empty_state"
                        className="text-muted-foreground"
                        style={{
                          textAlign: "center",
                          marginTop: 20,
                          opacity: 0.5,
                        }}
                      >
                        No debug events yet.
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                        }}
                      >
                        {filteredDebugEntries.map((entry, idx) => {
                          const isExpanded = expandedDebugIds.has(idx);
                          return (
                            <button
                              type="button"
                              key={`${entry.ts}-${idx}`}
                              data-ocid="chat.debug.entry"
                              style={{
                                padding: "4px 6px",
                                borderBottom:
                                  "1px solid rgba(255,255,255,0.06)",
                                cursor:
                                  entry.data !== undefined
                                    ? "pointer"
                                    : "default",
                                background: "transparent",
                                border: "none",
                                textAlign: "left",
                                width: "100%",
                              }}
                              onClick={() => {
                                if (entry.data === undefined) return;
                                setExpandedDebugIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(idx)) next.delete(idx);
                                  else next.add(idx);
                                  return next;
                                });
                              }}
                              disabled={entry.data === undefined}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                  flexWrap: "wrap",
                                }}
                              >
                                <span
                                  style={{
                                    color: "rgba(160,160,170,0.6)",
                                    fontSize: 10,
                                    fontVariantNumeric: "tabular-nums",
                                  }}
                                >
                                  {formatDebugTime(entry.ts)}
                                </span>
                                <span
                                  style={{
                                    color: levelColor(entry.level),
                                    fontWeight: 700,
                                    fontSize: 9,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.04em",
                                  }}
                                >
                                  {entry.level}
                                </span>
                                <span
                                  style={{
                                    color: "rgba(200,190,200,0.5)",
                                    fontSize: 9,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.04em",
                                  }}
                                >
                                  {entry.category}
                                </span>
                                <span
                                  style={{
                                    color: "rgba(235,235,245,0.85)",
                                    fontSize: 11,
                                  }}
                                >
                                  {entry.message}
                                </span>
                              </div>
                              {isExpanded && entry.data !== undefined && (
                                <pre
                                  style={{
                                    marginTop: 4,
                                    padding: "4px 6px",
                                    background: "rgba(0,0,0,0.3)",
                                    borderRadius: 4,
                                    fontSize: 10,
                                    color: "rgba(200,200,210,0.7)",
                                    whiteSpace: "pre-wrap",
                                    wordBreak: "break-all",
                                    overflowX: "auto",
                                  }}
                                >
                                  {JSON.stringify(entry.data, null, 2)}
                                </pre>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  {debugSubView === "clicks" && (
                    <ClicksSubView entries={clickTraceEntries} />
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            {activeChannel === "general" ? (
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  padding: "8px 10px",
                  borderTop: "1px solid rgba(216,70,63,0.3)",
                  background: "rgba(0,0,0,0.3)",
                }}
              >
                <input
                  ref={inputRef}
                  data-ocid="chat.input"
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Say something..."
                  maxLength={200}
                  className="stone-inset"
                  style={{
                    flex: 1,
                    fontSize: 12,
                    padding: "5px 8px",
                    fontFamily: "var(--font-body)",
                  }}
                />
                <button
                  type="button"
                  data-ocid="chat.send_button"
                  onClick={handleSend}
                  disabled={!inputText.trim() || isSending}
                  className="stone-btn-crimson"
                  style={{
                    width: 32,
                    height: 32,
                    padding: 0,
                    flexShrink: 0,
                    opacity: inputText.trim() && !isSending ? 1 : 0.4,
                    cursor:
                      inputText.trim() && !isSending
                        ? "pointer"
                        : "not-allowed",
                  }}
                >
                  <Send size={14} />
                </button>
              </div>
            ) : activeChannel === "battlelog" ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "6px 10px",
                  borderTop: "1px solid rgba(216,70,63,0.3)",
                  background: "rgba(0,0,0,0.3)",
                }}
              >
                <span
                  className="text-muted-foreground"
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.04em",
                    opacity: 0.5,
                  }}
                >
                  {battleLogEntries.length} actions
                </span>
                <button
                  type="button"
                  data-ocid="chat.battlelog.clear_button"
                  onClick={() => onClearBattleLog?.()}
                  className="stone-btn-slate"
                  style={{
                    fontSize: 10,
                    padding: "3px 10px",
                    letterSpacing: "0.05em",
                  }}
                >
                  Clear log
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "6px 10px",
                  borderTop: "1px solid rgba(199,156,255,0.3)",
                  background: "rgba(0,0,0,0.3)",
                }}
              >
                <span
                  className="text-muted-foreground"
                  style={{ fontSize: 10, opacity: 0.5 }}
                >
                  {activeEffects.length} active effect
                  {activeEffects.length !== 1 ? "s" : ""}
                </span>
              </div>
            )}
          </>
        </div>

        {/* Right-edge drag handle — widens the panel beyond the auto-computed
            width (up to MAX_CHAT_WIDTH). Thin vertical strip styled with a
            subtle crimson gradient matching the carved-stone aesthetic. */}
        <div
          ref={dragHandleRef}
          data-ocid="chat.width_drag_handle"
          aria-label="Drag to resize chat width"
          onPointerDown={onDragHandlePointerDown}
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: 6,
            cursor: "ew-resize",
            background:
              "linear-gradient(to right, rgba(216,70,63,0.05), rgba(216,70,63,0.35))",
            borderLeft: "1px solid rgba(216,70,63,0.25)",
            transition: "background 150ms",
            zIndex: 5,
            touchAction: "none",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background =
              "linear-gradient(to right, rgba(216,70,63,0.2), rgba(216,70,63,0.6))";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background =
              "linear-gradient(to right, rgba(216,70,63,0.05), rgba(216,70,63,0.35))";
          }}
        />
      </div>
    </DraggablePanel>
  );
};

export default ChatPanel;
