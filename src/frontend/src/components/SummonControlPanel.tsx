import { Footprints, Heart, Hourglass, Square, Sword } from "lucide-react";

/**
 * Props for the SummonControlPanel.
 *
 * The panel renders the controls for a player-side summon whose turn has come
 * up on the turn wheel. It is positioned at the bottom of the battle screen
 * and is responsible only for the summon's own controls (portrait, lifespan,
 * AP/MP, kit spells, end turn). The parent (WorldExploration) handles dimming
 * the player's own spell bar while this panel is visible.
 */
export interface SummonControlPanelProps {
  /** Display name of the summon (typically the pieceType). */
  summonName: string;
  /** The summon's pieceType, used for the portrait placeholder label. */
  summonPieceType: string;
  /** Remaining lifespan of the summon (in turns). */
  lifespan: number;
  /** Maximum lifespan of the summon (for rendering empty pips). */
  maxLifespan: number;
  /** Current action points available to the summon. */
  currentAp: number;
  /** Maximum action points for the summon. */
  maxAp: number;
  /** Current movement points available to the summon. */
  currentMp: number;
  /** Maximum movement points for the summon. */
  maxMp: number;
  /** Current HP of the summon (for the HP bar). */
  currentHp: number;
  /** Maximum HP of the summon (for the HP bar). */
  maxHp: number;
  /** The summon's kit spells rendered as clickable slots. */
  kitSpells: Array<{
    id: string;
    name: string;
    apCost: number;
    /** Optional accent color for the spell icon placeholder. */
    iconColor?: string;
  }>;
  /** Called when a kit spell slot is clicked with the spell's id. */
  onSpellSelect: (spellId: string) => void;
  /** Called when the END TURN button is pressed. */
  onEndTurn: () => void;
}

/**
 * Lifespan pips — small carved-stone dots showing remaining lifespan.
 * Filled pips use the crimson accent; empty pips are dim slate.
 */
function LifespanPips({
  lifespan,
  maxLifespan,
}: {
  lifespan: number;
  maxLifespan: number;
}) {
  const total = Math.max(maxLifespan, lifespan, 0);
  const filled = Math.max(lifespan, 0);
  const pips = Array.from({ length: total }, (_, i) => i < filled);
  return (
    <div
      className="flex items-center gap-1.5"
      data-ocid="summon_panel.lifespan_pips"
      aria-label={`Lifespan ${lifespan} of ${total}`}
    >
      <Hourglass className="h-4 w-4 text-primary/80" aria-hidden="true" />
      <div className="flex items-center gap-1">
        {pips.map((isFilled, i) => (
          <span
            key={isFilled ? `pip-filled-${i}` : `pip-empty-${i}`}
            data-ocid={`summon_panel.lifespan_pip.${i + 1}`}
            className={`h-2 w-2 rounded-full border border-border shadow-inner transition-colors ${
              isFilled
                ? "bg-primary shadow-[inset_0_0_2px_rgba(0,0,0,0.6)]"
                : "bg-muted/40"
            }`}
            aria-hidden="true"
          />
        ))}
      </div>
    </div>
  );
}

/**
 * AP/MP orb display. Renders a circular orb with the current/max value and
 * a colored glow matching the resource type (AP blue, MP green).
 */
function ResourceOrb({
  label,
  current,
  max,
  color,
  icon: Icon,
  testId,
}: {
  label: string;
  current: number;
  max: number;
  color: "ap" | "mp";
  icon: typeof Sword;
  testId: string;
}) {
  const glow =
    color === "ap"
      ? "shadow-[0_0_10px_rgba(59,130,246,0.45)] border-blue-500/60"
      : "shadow-[0_0_10px_rgba(34,197,94,0.45)] border-green-500/60";
  const text = color === "ap" ? "text-blue-300" : "text-green-300";
  const ring =
    color === "ap"
      ? "from-blue-500/30 to-blue-900/40"
      : "from-green-500/30 to-green-900/40";
  return (
    <div
      className="flex flex-col items-center gap-1"
      data-ocid={testId}
      aria-label={`${label} ${current} of ${max}`}
    >
      <div
        className={`relative flex h-12 w-12 items-center justify-center rounded-full border-2 bg-gradient-to-br ${glow} ${ring}`}
      >
        <Icon
          className={`absolute h-4 w-4 opacity-40 ${text}`}
          aria-hidden="true"
        />
        <span className={`font-mono text-sm font-bold leading-none ${text}`}>
          {current}
          <span className="text-[10px] opacity-60">/{max}</span>
        </span>
      </div>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

/**
 * HP bar — carved-stone styled vertical bar showing current/max HP.
 * Crimson fill on a dark slate track, matching the Ankama/Dofus aesthetic
 * of the AP/MP orbs. Sits next to the orbs in the resource cluster.
 */
function HpBar({
  current,
  max,
  testId,
}: {
  current: number;
  max: number;
  testId: string;
}) {
  const safeMax = Math.max(max, 1);
  const pct = Math.max(0, Math.min(100, (current / safeMax) * 100));
  const low = pct <= 25;
  return (
    <div
      className="flex flex-col items-center gap-1"
      data-ocid={testId}
      aria-label={`HP ${current} of ${max}`}
    >
      <div
        className={`relative flex h-12 w-12 items-center justify-center rounded-full border-2 ${
          low
            ? "border-red-500/70 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
            : "border-primary/60 shadow-[0_0_10px_rgba(220,38,38,0.4)]"
        } bg-gradient-to-br from-red-500/25 to-red-900/40`}
      >
        <Heart
          className={`absolute h-4 w-4 opacity-40 ${
            low ? "text-red-300" : "text-red-300"
          }`}
          aria-hidden="true"
        />
        <span className="font-mono text-sm font-bold leading-none text-red-200">
          {current}
          <span className="text-[10px] opacity-60">/{max}</span>
        </span>
      </div>
      {/* Mini bar under the orb — carved-stone track + crimson fill */}
      <div
        className="h-1.5 w-12 overflow-hidden rounded-full border border-border/60 bg-muted/40 shadow-inner"
        aria-hidden="true"
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            low
              ? "bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.7)]"
              : "bg-primary shadow-[0_0_4px_rgba(220,38,38,0.6)]"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
        HP
      </span>
    </div>
  );
}

/**
 * A single kit spell slot. Disabled (greyed, non-clickable) when the summon's
 * current AP is less than the spell's AP cost.
 */
function SpellSlot({
  spell,
  disabled,
  onSelect,
  index,
}: {
  spell: {
    id: string;
    name: string;
    apCost: number;
    iconColor?: string;
  };
  disabled: boolean;
  onSelect: (spellId: string) => void;
  index: number;
}) {
  const iconBg = spell.iconColor ?? "#7c2d12";
  return (
    <button
      type="button"
      data-ocid={`summon_panel.spell_slot.${index + 1}`}
      disabled={disabled}
      onClick={() => !disabled && onSelect(spell.id)}
      aria-label={`${spell.name}, AP cost ${spell.apCost}${
        disabled ? ", insufficient AP" : ""
      }`}
      className={`group flex w-20 flex-col items-center gap-1 rounded-md border p-1.5 transition-all ${
        disabled
          ? "cursor-not-allowed border-border/50 bg-muted/30 opacity-40"
          : "cursor-pointer border-primary/50 bg-card hover:border-primary hover:bg-primary/10 hover:shadow-[0_0_8px_rgba(220,38,38,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background"
      }`}
    >
      <span
        className="h-10 w-10 rounded border border-border/60 shadow-inner"
        style={{ backgroundColor: iconBg }}
        aria-hidden="true"
      />
      <span className="line-clamp-1 w-full text-center text-[10px] font-medium text-foreground">
        {spell.name}
      </span>
      <span className="rounded bg-blue-500/20 px-1 text-[10px] font-bold text-blue-300">
        {spell.apCost} AP
      </span>
    </button>
  );
}

/**
 * SummonControlPanel — battle-bar-styled panel for a player-controlled summon.
 *
 * Ankama/Dofus-inspired carved-stone dark slate with crimson accents. Fixed to
 * the bottom of the battle screen. Renders the summon's portrait + name,
 * lifespan pips, AP/MP orbs, kit spell slots (with disabled state when AP is
 * insufficient), and an END TURN button.
 */
export default function SummonControlPanel({
  summonName,
  summonPieceType,
  lifespan,
  maxLifespan,
  currentAp,
  maxAp,
  currentMp,
  maxMp,
  currentHp,
  maxHp,
  kitSpells,
  onSpellSelect,
  onEndTurn,
}: SummonControlPanelProps) {
  return (
    <section
      data-ocid="summon_panel.panel"
      className="flex w-full items-stretch gap-3 border-t-2 border-primary/60 bg-card/95 px-3 py-2 shadow-[0_-4px_14px_rgba(0,0,0,0.55)]"
      aria-label={`${summonName} control panel`}
    >
      {/* Carved-stone left edge accent */}
      <div className="w-1 self-stretch flex-shrink-0 rounded-full bg-gradient-to-b from-transparent via-primary to-transparent" />

      <div className="flex w-full flex-wrap items-center gap-3">
        {/* Portrait + name + lifespan */}
        <div className="flex items-center gap-2 border-r border-border/60 pr-3">
          <div
            data-ocid="summon_panel.portrait"
            className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary/70 bg-gradient-to-br from-slate-700 to-slate-900 shadow-[inset_0_0_8px_rgba(0,0,0,0.7),0_0_8px_rgba(220,38,38,0.3)]"
            aria-hidden="true"
          >
            <span className="font-display text-[10px] font-bold uppercase tracking-wider text-primary">
              {summonPieceType.slice(0, 3)}
            </span>
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <span
              data-ocid="summon_panel.name"
              className="truncate font-display text-sm font-bold uppercase tracking-wide text-foreground"
            >
              {summonName}
            </span>
            <LifespanPips lifespan={lifespan} maxLifespan={maxLifespan} />
          </div>
        </div>

        {/* AP / MP / HP orbs */}
        <div className="flex items-center gap-3 border-r border-border/60 pr-3">
          <ResourceOrb
            label="AP"
            current={currentAp}
            max={maxAp}
            color="ap"
            icon={Sword}
            testId="summon_panel.ap_orb"
          />
          <ResourceOrb
            label="MP"
            current={currentMp}
            max={maxMp}
            color="mp"
            icon={Footprints}
            testId="summon_panel.mp_orb"
          />
          <HpBar current={currentHp} max={maxHp} testId="summon_panel.hp_bar" />
        </div>

        {/* Kit spell slots */}
        <div
          className="flex flex-1 items-center gap-2 overflow-x-auto"
          data-ocid="summon_panel.spell_slots"
        >
          {kitSpells.length === 0 ? (
            <span className="text-sm italic text-muted-foreground">
              No kit spells available
            </span>
          ) : (
            kitSpells.map((spell, i) => (
              <SpellSlot
                key={spell.id}
                spell={spell}
                index={i}
                disabled={currentAp < spell.apCost}
                onSelect={onSpellSelect}
              />
            ))
          )}
        </div>

        {/* End turn */}
        <div className="flex items-center">
          <button
            type="button"
            data-ocid="summon_panel.end_turn_button"
            onClick={onEndTurn}
            aria-label="End the summon's turn"
            className="flex items-center gap-1.5 rounded-md border-2 border-primary bg-gradient-to-b from-primary to-red-900 px-3 py-2 font-display text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-[0_0_10px_rgba(220,38,38,0.5)] transition-all hover:from-red-500 hover:to-red-900 hover:shadow-[0_0_14px_rgba(220,38,38,0.7)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-px"
          >
            <Square className="h-3.5 w-3.5" aria-hidden="true" />
            End Turn
          </button>
        </div>
      </div>
    </section>
  );
}
