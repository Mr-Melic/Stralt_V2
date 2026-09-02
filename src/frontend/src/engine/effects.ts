// effects.ts — Presentation-only JUICE effects manager.
// Renders damage numbers, doka pickup text, death fragments, screen shake,
// hit-flash, and hit-stop. Does NOT touch turn logic, damage math, or state flow.

import { JUICE } from "@/data/gameConstants";

export type DamageKind = "damage" | "heal" | "drain" | "crit";

export interface Fragment {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vr: number;
  size: number;
}

export interface DokaEffect {
  type: "doka";
  id: number;
  x: number;
  y: number;
  value: number;
  born: number;
  ttl: number;
}

export interface FloatTextEffect {
  type: "floattext";
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  born: number;
  ttl: number;
}

export interface DamageEffect {
  type: "damage";
  x: number;
  y: number;
  value: number;
  kind: DamageKind;
  born: number;
  ttl: number;
  offsetX: number;
  offsetY: number;
}

export interface DeathEffect {
  type: "death";
  entityId: string;
  x: number;
  y: number;
  fragments: Fragment[];
  born: number;
  ttl: number;
}

export type Effect = DokaEffect | DamageEffect | DeathEffect | FloatTextEffect;

interface ShakeState {
  intensity: number;
  decay: number;
}

const DAMAGE_TTL_MS = 900;
const DOKA_TTL_MS = 1000;
const FLOATTEXT_TTL_MS = 1200;
const HITSTOP_RESTORE_MS = 75;
// Default color for rejection / status float text — carved-stone crimson accent.
const FLOATTEXT_DEFAULT_COLOR = "#e0664a";
// Safety net: hard cap on combined live effects to prevent runaway growth.
const MAX_LIVE_EFFECTS = 100;
// DEV-only perf log cadence.
const PERF_LOG_INTERVAL_MS = 5000;

export class EffectsManager {
  activeEffects: Effect[] = [];
  shakeState: ShakeState = { intensity: 0, decay: 0.85 };
  hitFlashUntil: Map<string, number> = new Map();
  timeScaleRef: { current: number } = { current: 1.0 };
  dyingEntities: DeathEffect[] = [];
  damageNumbers: DamageEffect[] = [];
  dokaFloatTexts: DokaEffect[] = [];
  floatTexts: FloatTextEffect[] = [];

  private hitStopUntil = 0;
  private nextId = 1;
  // Accumulated frame time for the DEV perf log cadence.
  private perfLogAccumMs = 0;

  spawn(effect: Effect): void {
    this.activeEffects.push(effect);
  }

  tick(dt: number): void {
    // Shake decay each frame.
    this.shakeState.intensity *= this.shakeState.decay;
    if (this.shakeState.intensity < 0.01) this.shakeState.intensity = 0;

    // Hit-flash expiry.
    const now = performance.now();
    for (const [id, until] of this.hitFlashUntil) {
      if (now > until) this.hitFlashUntil.delete(id);
    }

    // Hit-stop restore after 75ms.
    if (this.timeScaleRef.current === 0.0 && now >= this.hitStopUntil) {
      this.timeScaleRef.current = 1.0;
    }

    // Update active effects.
    const survivors: Effect[] = [];
    for (const eff of this.activeEffects) {
      const age = now - eff.born;
      if (age >= eff.ttl) continue;

      if (eff.type === "damage") {
        const speed = 0.04;
        const drift = 0.01;
        eff.y -= speed * dt;
        eff.x += drift * dt;
      } else if (eff.type === "death") {
        for (const f of eff.fragments) {
          f.vy += 0.5 * dt;
          f.x += f.vx * dt;
          f.y += f.vy * dt;
          f.rotation += f.vr * dt;
        }
      } else if (eff.type === "doka") {
        eff.y -= 0.03 * dt;
      } else if (eff.type === "floattext") {
        // Rise slowly upward; ttl handled by the filter pass below.
        eff.y -= 0.025 * dt;
      }
      survivors.push(eff);
    }
    this.activeEffects = survivors;

    // Remove expired entries from the typed mirror arrays.
    // Each entry already carries `born` + `ttl`; drop when expired.
    // filter() rebuilds the array each tick — acceptable given small N and
    // the MAX_LIVE_EFFECTS cap below.
    this.damageNumbers = this.damageNumbers.filter((e) => now - e.born < e.ttl);
    this.dyingEntities = this.dyingEntities.filter((e) => now - e.born < e.ttl);
    this.dokaFloatTexts = this.dokaFloatTexts.filter(
      (e) => now - e.born < e.ttl,
    );
    this.floatTexts = this.floatTexts.filter((e) => now - e.born < e.ttl);

    // Safety net: cap combined live effects at MAX_LIVE_EFFECTS.
    // Drop oldest (lowest `born`) across all arrays until under cap.
    const total =
      this.activeEffects.length +
      this.damageNumbers.length +
      this.dyingEntities.length +
      this.dokaFloatTexts.length +
      this.floatTexts.length;
    if (total > MAX_LIVE_EFFECTS) {
      const overflow = total - MAX_LIVE_EFFECTS;
      // Collect [born, array, ref] tuples, sort ascending by born, drop oldest.
      type Entry = { born: number; drop: () => void };
      const entries: Entry[] = [];
      for (const e of this.activeEffects) {
        entries.push({ born: e.born, drop: () => this.removeActive(e) });
      }
      for (const e of this.damageNumbers) {
        entries.push({ born: e.born, drop: () => this.removeDamage(e) });
      }
      for (const e of this.dyingEntities) {
        entries.push({ born: e.born, drop: () => this.removeDeath(e) });
      }
      for (const e of this.dokaFloatTexts) {
        entries.push({ born: e.born, drop: () => this.removeDoka(e) });
      }
      for (const e of this.floatTexts) {
        entries.push({ born: e.born, drop: () => this.removeFloatText(e) });
      }
      entries.sort((a, b) => a.born - b.born);
      for (let i = 0; i < overflow && i < entries.length; i++) {
        entries[i].drop();
      }
    }

    // DEV-only perf log: live effect count every PERF_LOG_INTERVAL_MS.
    if (import.meta.env.DEV) {
      this.perfLogAccumMs += dt;
      if (this.perfLogAccumMs >= PERF_LOG_INTERVAL_MS) {
        this.perfLogAccumMs = 0;
        const liveCount =
          this.activeEffects.length +
          this.damageNumbers.length +
          this.dyingEntities.length +
          this.dokaFloatTexts.length +
          this.floatTexts.length;
        console.debug("[PERF] live effects:", liveCount);
      }
    }
  }

  private removeActive(e: Effect): void {
    const i = this.activeEffects.indexOf(e);
    if (i !== -1) {
      this.activeEffects.splice(i, 1);
    }
  }

  private removeDamage(e: DamageEffect): void {
    const i = this.damageNumbers.indexOf(e);
    if (i !== -1) {
      this.damageNumbers.splice(i, 1);
    }
  }

  private removeDeath(e: DeathEffect): void {
    const i = this.dyingEntities.indexOf(e);
    if (i !== -1) {
      this.dyingEntities.splice(i, 1);
    }
  }

  private removeDoka(e: DokaEffect): void {
    const i = this.dokaFloatTexts.indexOf(e);
    if (i !== -1) {
      this.dokaFloatTexts.splice(i, 1);
    }
  }

  private removeFloatText(e: FloatTextEffect): void {
    const i = this.floatTexts.indexOf(e);
    if (i !== -1) {
      this.floatTexts.splice(i, 1);
    }
  }

  draw(ctx: CanvasRenderingContext2D, _camera: { x: number; y: number }): void {
    const now = performance.now();
    for (const eff of this.activeEffects) {
      const age = now - eff.born;
      const alpha = Math.max(0, 1 - age / eff.ttl);

      if (eff.type === "doka") {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "#ffd24a";
        ctx.font = "bold 14px ui-sans-serif, system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`+${eff.value} Doka`, eff.x, eff.y);
        ctx.restore();
      } else if (eff.type === "damage") {
        const color =
          eff.kind === "heal"
            ? "#4ade80"
            : eff.kind === "drain"
              ? "#c084fc"
              : eff.kind === "crit"
                ? "#f87171"
                : "#ef4444";
        let scale = 1.0;
        if (eff.kind === "crit") {
          const punchAge = Math.min(age, 200);
          scale = 1.6 - (punchAge / 200) * 0.6;
        }
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.font = `bold ${Math.round(16 * scale)}px ui-sans-serif, system-ui, sans-serif`;
        ctx.textAlign = "center";
        const text =
          eff.kind === "heal"
            ? `+${eff.value}`
            : eff.kind === "drain"
              ? `${eff.value}↯`
              : eff.kind === "crit"
                ? `${eff.value}!`
                : `${eff.value}`;
        ctx.fillText(text, eff.x + eff.offsetX, eff.y + eff.offsetY);
        ctx.restore();
      } else if (eff.type === "death") {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "#9ca3af";
        for (const f of eff.fragments) {
          ctx.save();
          ctx.translate(f.x, f.y);
          ctx.rotate(f.rotation);
          ctx.fillRect(-f.size / 2, -f.size / 2, f.size, f.size);
          ctx.restore();
        }
        ctx.restore();
      } else if (eff.type === "floattext") {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = eff.color;
        ctx.font = "bold 13px ui-sans-serif, system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(eff.text, eff.x, eff.y);
        ctx.restore();
      }
    }
  }

  triggerShake(intensity: number): void {
    if (!JUICE.shake.enabled) return;
    this.shakeState.intensity = Math.max(
      this.shakeState.intensity,
      intensity * JUICE.shake.multiplier,
    );
  }

  getShakeOffset(): { x: number; y: number } {
    if (!JUICE.shake.enabled) return { x: 0, y: 0 };
    const i = this.shakeState.intensity;
    return {
      x: (Math.random() - 0.5) * i * 2,
      y: (Math.random() - 0.5) * i * 2,
    };
  }

  triggerHitFlash(entityId: string): void {
    if (!JUICE.hitFlash.enabled) return;
    this.hitFlashUntil.set(
      entityId,
      performance.now() + JUICE.hitFlash.durationMs,
    );
  }

  getHitFlashAlpha(entityId: string): number {
    if (!JUICE.hitFlash.enabled) return 0;
    const until = this.hitFlashUntil.get(entityId);
    if (until === undefined) return 0;
    const remaining = until - performance.now();
    if (remaining <= 0) return 0;
    return Math.max(0, Math.min(1, remaining / JUICE.hitFlash.durationMs));
  }

  triggerHitStop(): void {
    if (!JUICE.hitstop.enabled) return;
    this.timeScaleRef.current = 0.0;
    this.hitStopUntil = performance.now() + HITSTOP_RESTORE_MS;
  }

  spawnDamageNumber(
    x: number,
    y: number,
    value: number,
    kind: DamageKind,
  ): void {
    // Stack offset: nudge upward for each existing number near same x,y.
    let stack = 0;
    for (const d of this.damageNumbers) {
      if (Math.abs(d.x - x) < 12 && Math.abs(d.y - y) < 24) stack += 1;
    }
    const offsetX = (stack % 2 === 0 ? 1 : -1) * (stack * 4);
    const offsetY = -stack * 14;
    const eff: DamageEffect = {
      type: "damage",
      x,
      y,
      value,
      kind,
      born: performance.now(),
      ttl: DAMAGE_TTL_MS,
      offsetX,
      offsetY,
    };
    this.damageNumbers.push(eff);
    this.spawn(eff);
  }

  triggerDeath(entityId: string, x: number, y: number): void {
    if (!JUICE.death.enabled) return;
    const count = JUICE.death.fragments;
    const fragments: Fragment[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 1 + Math.random() * 2;
      fragments.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        rotation: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        size: 3 + Math.random() * 3,
      });
    }
    const eff: DeathEffect = {
      type: "death",
      entityId,
      x,
      y,
      fragments,
      born: performance.now(),
      ttl: JUICE.death.durationMs,
    };
    this.dyingEntities.push(eff);
    this.spawn(eff);
  }

  spawnDoka(x: number, y: number, value: number): void {
    const eff: DokaEffect = {
      type: "doka",
      id: this.nextId++,
      x,
      y,
      value,
      born: performance.now(),
      ttl: DOKA_TTL_MS,
    };
    this.dokaFloatTexts.push(eff);
    this.spawn(eff);
  }

  spawnFloatText(x: number, y: number, text: string, color?: string): void {
    const eff: FloatTextEffect = {
      type: "floattext",
      id: this.nextId++,
      x,
      y,
      text,
      color: color ?? FLOATTEXT_DEFAULT_COLOR,
      born: performance.now(),
      ttl: FLOATTEXT_TTL_MS,
    };
    this.floatTexts.push(eff);
    this.spawn(eff);
  }

  clear(): void {
    this.activeEffects = [];
    this.dyingEntities = [];
    this.damageNumbers = [];
    this.dokaFloatTexts = [];
    this.floatTexts = [];
    this.hitFlashUntil.clear();
    this.shakeState.intensity = 0;
    this.timeScaleRef.current = 1.0;
    this.hitStopUntil = 0;
  }
}
