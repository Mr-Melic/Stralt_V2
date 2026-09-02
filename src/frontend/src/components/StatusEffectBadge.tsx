import type { ActiveEffect } from "../types/gameTypes";

interface StatusEffectBadgeProps {
  effect: ActiveEffect;
  isPlayer?: boolean;
}

function formatEffectLabel(effect: ActiveEffect): string {
  const stat = effect.stat ?? "";
  const modifier = effect.modifier ?? 1;

  // DoT
  if (effect.type === "dot") {
    const dmg = effect.dotDamagePerTurn ?? 0;
    return `${effect.effectName} ${dmg}/turn`;
  }

  // MP / AP are additive (flat values like +2, -2)
  if (stat === "mp" || stat === "ap") {
    const sign = modifier >= 0 ? "+" : "";
    return `${stat.toUpperCase()} ${sign}${modifier}`;
  }

  // Multiplier stats: dmg, res, sp, chc, init, healRecv
  const pct = Math.round((modifier - 1) * 100);
  const sign = pct >= 0 ? "+" : "";
  return `${stat.toUpperCase()} ${sign}${pct}%`;
}

export default function StatusEffectBadge({ effect }: StatusEffectBadgeProps) {
  const label = formatEffectLabel(effect);
  const turns = effect.duration;

  const pillClass =
    effect.type === "buff"
      ? "stone-pill-green"
      : effect.type === "dot"
        ? "stone-pill-gold"
        : "stone-pill-crimson";

  return (
    <div
      data-ocid={`status_effect.${effect.targetId}.${effect.effectName}.badge`}
      title={`${effect.description} — ${turns} turn${turns !== 1 ? "s" : ""} remaining`}
      className={pillClass}
      style={{
        gap: 4,
        borderRadius: 4,
        whiteSpace: "nowrap",
        lineHeight: 1,
      }}
    >
      <span style={{ fontSize: 11 }}>{effect.iconEmoji}</span>
      <span>{label}</span>
      <span
        style={{
          fontSize: 9,
          opacity: 0.75,
          fontWeight: 600,
          marginLeft: 2,
        }}
      >
        {turns}t
      </span>
    </div>
  );
}
