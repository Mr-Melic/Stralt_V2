// Procedural WebAudio sound engine — synthesizes all 12 SoundEvents with short
// oscillator + filtered-noise envelopes. No external audio assets required.
//
// AudioContext is created lazily on the FIRST user gesture (pointerdown/keydown)
// to comply with browser autoplay policies. Before that gesture, playEvent is a
// silent no-op (no throw, no warn).

import type { SoundEvent } from "../hooks/useSoundHooks";

const VOLUME_KEY = "pbv_sound_volume";
const MUTE_KEY = "pbv_sound_muted";
const DEFAULT_VOLUME = 0.5;
const VOICE_CAP = 8;

type ActiveVoice = {
  stop: () => void;
  ended: boolean;
};

function loadNumber(key: string, fallback: number): number {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    const v = Number(raw);
    return Number.isFinite(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

function loadBool(key: string, fallback: boolean): boolean {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return raw === "1" || raw === "true";
  } catch {
    return fallback;
  }
}

function savePref(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore storage errors (private mode, quota)
  }
}

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private volume: number;
  private muted: boolean;
  private voices: ActiveVoice[] = [];
  private gestureWired = false;

  constructor() {
    this.volume = Math.min(
      1,
      Math.max(0, loadNumber(VOLUME_KEY, DEFAULT_VOLUME)),
    );
    this.muted = loadBool(MUTE_KEY, false);
    this.wireFirstGesture();
  }

  // ── Lazy AudioContext: created + resumed on first user gesture ──────────────
  private wireFirstGesture(): void {
    if (this.gestureWired || typeof window === "undefined") return;
    this.gestureWired = true;
    const handler = (): void => {
      this.ensureContext();
      window.removeEventListener("pointerdown", handler);
      window.removeEventListener("keydown", handler);
    };
    window.addEventListener("pointerdown", handler, { once: false });
    window.addEventListener("keydown", handler, { once: false });
  }

  private ensureContext(): void {
    if (this.ctx) {
      if (this.ctx.state === "suspended") {
        void this.ctx.resume().catch(() => {
          // ignore resume failures
        });
      }
      return;
    }
    try {
      const Ctor: typeof AudioContext | undefined =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : this.volume;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
      this.master = null;
    }
  }

  // ── Public API ──────────────────────────────────────────────────────────────
  setVolume(v: number): void {
    const clamped = Math.min(1, Math.max(0, v));
    this.volume = clamped;
    savePref(VOLUME_KEY, String(clamped));
    if (this.master && !this.muted) {
      this.master.gain.value = clamped;
    }
  }

  getVolume(): number {
    return this.volume;
  }

  setMute(m: boolean): void {
    this.muted = m;
    savePref(MUTE_KEY, m ? "1" : "0");
    if (this.master) {
      this.master.gain.value = m ? 0 : this.volume;
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  // ── Voice cap: drop oldest when exceeding VOICE_CAP ─────────────────────────
  private registerVoice(voice: ActiveVoice): void {
    this.voices.push(voice);
    while (this.voices.length > VOICE_CAP) {
      const oldest = this.voices.shift();
      if (oldest && !oldest.ended) {
        try {
          oldest.stop();
        } catch {
          // already stopped
        }
      }
    }
  }

  private pruneEnded(): void {
    this.voices = this.voices.filter((v) => !v.ended);
  }

  // ── Core synthesis helpers ───────────────────────────────────────────────────
  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType,
    gain: number,
    opts?: {
      freqEnd?: number;
      delay?: number;
      attack?: number;
      release?: number;
    },
  ): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const now = ctx.currentTime + (opts?.delay ?? 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (opts?.freqEnd != null) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(0.0001, opts.freqEnd),
        now + duration,
      );
    }
    const attack = opts?.attack ?? 0.005;
    const release = opts?.release ?? Math.min(0.08, duration * 0.4);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(gain, now + attack);
    g.gain.setValueAtTime(gain, now + duration - release);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(g);
    g.connect(master);
    osc.start(now);
    osc.stop(now + duration + 0.02);

    const voice: ActiveVoice = {
      ended: false,
      stop: () => {
        try {
          osc.stop();
        } catch {
          // already stopped
        }
        voice.ended = true;
      },
    };
    osc.onended = () => {
      voice.ended = true;
      this.pruneEnded();
    };
    this.registerVoice(voice);
  }

  private playNoise(
    duration: number,
    filterType: BiquadFilterType,
    filterFreq: number,
    gain: number,
    opts?: {
      freqEnd?: number;
      delay?: number;
      q?: number;
    },
  ): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const now = ctx.currentTime + (opts?.delay ?? 0);
    const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFreq, now);
    filter.Q.value = opts?.q ?? 1;
    if (opts?.freqEnd != null) {
      filter.frequency.exponentialRampToValueAtTime(
        Math.max(0.0001, opts.freqEnd),
        now + duration,
      );
    }
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(gain, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    src.connect(filter);
    filter.connect(g);
    g.connect(master);
    src.start(now);
    src.stop(now + duration + 0.02);

    const voice: ActiveVoice = {
      ended: false,
      stop: () => {
        try {
          src.stop();
        } catch {
          // already stopped
        }
        voice.ended = true;
      },
    };
    src.onended = () => {
      voice.ended = true;
      this.pruneEnded();
    };
    this.registerVoice(voice);
  }

  // ── Event dispatch ───────────────────────────────────────────────────────────
  playEvent(event: SoundEvent): void {
    // Silent no-op until the AudioContext exists (no user gesture yet).
    if (!this.ctx || !this.master) return;
    this.pruneEnded();
    switch (event) {
      case "spell_cast":
        // Quick sine sweep up 220→660Hz over ~120ms
        this.playTone(220, 0.12, "sine", 0.22, { freqEnd: 660 });
        break;
      case "spell_hit":
        // Filtered-noise burst + low thump (~150ms)
        this.playNoise(0.15, "bandpass", 1800, 0.18, { q: 0.7 });
        this.playTone(110, 0.15, "sine", 0.28, { freqEnd: 60 });
        break;
      case "enemy_death":
        // Descending saw 400→80Hz over ~350ms
        this.playTone(400, 0.35, "sawtooth", 0.22, {
          freqEnd: 80,
          release: 0.12,
        });
        break;
      case "player_damage":
        // Dull low thud ~180ms, low sine ~80Hz fast decay
        this.playTone(80, 0.18, "sine", 0.32, { freqEnd: 50, release: 0.1 });
        break;
      case "doka_collected":
        // Bright two-tone coin blip ~180ms: 880 then 1320
        this.playTone(880, 0.08, "sine", 0.22);
        this.playTone(1320, 0.1, "sine", 0.22, { delay: 0.08 });
        break;
      case "map_transition":
        // Airy noise whoosh ~600ms, filtered noise sweep
        this.playNoise(0.6, "bandpass", 400, 0.16, { freqEnd: 4000, q: 0.6 });
        break;
      case "battle_start":
        // Low impact + short riser ~400ms: low thud then rising sine
        this.playTone(70, 0.18, "sine", 0.32, { freqEnd: 50 });
        this.playTone(220, 0.22, "sine", 0.2, { freqEnd: 440, delay: 0.18 });
        break;
      case "battle_end":
        // Small resolved arpeggio ~350ms (3-4 notes)
        this.playTone(523, 0.1, "triangle", 0.2);
        this.playTone(659, 0.1, "triangle", 0.2, { delay: 0.1 });
        this.playTone(784, 0.15, "triangle", 0.22, { delay: 0.2 });
        break;
      case "level_up":
        // Ascending major arpeggio ~700ms (4-5 notes rising)
        this.playTone(523, 0.12, "triangle", 0.22);
        this.playTone(659, 0.12, "triangle", 0.22, { delay: 0.12 });
        this.playTone(784, 0.12, "triangle", 0.22, { delay: 0.24 });
        this.playTone(1047, 0.18, "triangle", 0.24, { delay: 0.36 });
        this.playTone(1319, 0.22, "triangle", 0.24, { delay: 0.5 });
        break;
      case "critical_hit":
        // Accented double-hit ~200ms: two sharp hits
        this.playNoise(0.06, "highpass", 2500, 0.22);
        this.playTone(180, 0.08, "square", 0.18, { freqEnd: 90 });
        this.playNoise(0.06, "highpass", 2500, 0.22, { delay: 0.1 });
        this.playTone(180, 0.08, "square", 0.18, {
          freqEnd: 90,
          delay: 0.1,
        });
        break;
      case "combo":
        // Stacked rising blips ~250ms: 3 quick rising sines
        this.playTone(440, 0.08, "sine", 0.2, { freqEnd: 660 });
        this.playTone(660, 0.08, "sine", 0.2, { freqEnd: 880, delay: 0.08 });
        this.playTone(880, 0.1, "sine", 0.22, { freqEnd: 1100, delay: 0.16 });
        break;
      case "leader_boost":
        // Dark power-up swell ~500ms: low rising saw
        this.playTone(110, 0.5, "sawtooth", 0.24, {
          freqEnd: 330,
          release: 0.15,
        });
        this.playTone(55, 0.5, "sawtooth", 0.18, {
          freqEnd: 165,
          release: 0.15,
        });
        break;
      default:
        break;
    }
  }
}

export const soundEngine = new SoundEngine();
