import type React from "react";
import { useCallback, useEffect, useRef } from "react";
import { shouldRunDecorativeCanvasLoop } from "../engine/canvasLoopActivity";

interface BloodParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  lifetime: number;
  age: number;
}

interface BloodParticlesProps {
  intensity?: "subtle" | "burst";
  className?: string;
}

const COLORS = [
  "#8b0000",
  "#a00000",
  "#c0392b",
  "#e74c3c",
  "#6b0000",
  "#b22222",
];

const BloodParticles: React.FC<BloodParticlesProps> = ({
  intensity = "subtle",
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<BloodParticle[]>([]);
  const animFrameRef = useRef<number | undefined>(undefined);
  const burstFramesRef = useRef(0);
  const intensityRef = useRef(intensity);
  // LEAK-18: Generation counter prevents double RAF loops on rapid unmount/remount.
  const bpGenRef = useRef<number>(0);

  // Keep intensity ref in sync
  useEffect(() => {
    intensityRef.current = intensity;
    if (intensity === "burst") {
      burstFramesRef.current = 60;
    }
  }, [intensity]);

  const spawnParticle = useCallback((w: number, h: number): BloodParticle => {
    // Spawn from top edge (60%) or side edges (20% each)
    const rand = Math.random();
    let x: number;
    let y: number;
    let vx: number;
    let vy: number;

    if (rand < 0.6) {
      // Top edge
      x = Math.random() * w;
      y = 0;
      vx = (Math.random() - 0.5) * 1.2;
      vy = Math.random() * 2 + 0.8;
    } else if (rand < 0.8) {
      // Left edge
      x = 0;
      y = Math.random() * h * 0.6;
      vx = Math.random() * 1.5 + 0.3;
      vy = Math.random() * 2 + 0.5;
    } else {
      // Right edge
      x = w;
      y = Math.random() * h * 0.6;
      vx = -(Math.random() * 1.5 + 0.3);
      vy = Math.random() * 2 + 0.5;
    }

    return {
      x,
      y,
      vx,
      vy,
      size: Math.random() * 3 + 1,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      alpha: 0.8,
      lifetime: Math.floor(Math.random() * 41 + 40), // 40–80 frames
      age: 0,
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let ctx = canvas.getContext("2d");
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      canvas.width = width;
      canvas.height = height;
      ctx = canvas.getContext("2d");
    });
    ro.observe(canvas.parentElement || canvas);
    const parent = canvas.parentElement || canvas;
    canvas.width = parent.clientWidth || 100;
    canvas.height = parent.clientHeight || 100;
    ctx = canvas.getContext("2d");

    const myGen = ++bpGenRef.current;

    const stopLoop = () => {
      if (animFrameRef.current !== undefined) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = undefined;
      }
    };

    const animate = () => {
      if (bpGenRef.current !== myGen) return;
      // PERF-2026-09-02-059: actually stop the RAF chain while hidden
      // (053 only skipped draw). CharacterSelection can mount one instance
      // per filled slot under the root Starfield.
      if (
        typeof document !== "undefined" &&
        !shouldRunDecorativeCanvasLoop(document.hidden)
      ) {
        animFrameRef.current = undefined;
        return;
      }
      if (!ctx) {
        animFrameRef.current = requestAnimationFrame(animate);
        return;
      }
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // Determine spawn count this frame
      const isBursting = burstFramesRef.current > 0;
      if (isBursting) burstFramesRef.current--;

      const maxParticles = isBursting ? 80 : 30;
      const spawnCount = isBursting
        ? Math.floor(Math.random() * 5) + 8
        : Math.floor(Math.random() * 2) + 1;

      // Add new particles
      const particles = particlesRef.current;
      for (let i = 0; i < spawnCount; i++) {
        if (particles.length < maxParticles) {
          particles.push(spawnParticle(w, h));
        }
      }

      // Update and draw in place — no per-frame filter() allocation.
      let write = 0;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.age++;
        p.x += p.vx;
        p.y += p.vy;
        // Slight horizontal drift
        p.vx += (Math.random() - 0.5) * 0.1;
        p.vy += 0.05; // gravity drip

        const lifeRatio = p.age / p.lifetime;
        p.alpha = 0.8 * (1 - lifeRatio);

        if (p.alpha <= 0 || p.y > h + 10) continue;

        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        // Elongated teardrop shape
        ctx.ellipse(
          p.x,
          p.y,
          p.size * 0.5,
          p.size,
          Math.atan2(p.vy, p.vx) + Math.PI / 2,
          0,
          Math.PI * 2,
        );
        ctx.fill();

        particles[write++] = p;
      }
      particles.length = write;
      ctx.globalAlpha = 1;

      animFrameRef.current = requestAnimationFrame(animate);
    };

    const startLoop = () => {
      if (bpGenRef.current !== myGen) return;
      if (
        typeof document !== "undefined" &&
        !shouldRunDecorativeCanvasLoop(document.hidden)
      ) {
        return;
      }
      if (animFrameRef.current !== undefined) return;
      animFrameRef.current = requestAnimationFrame(animate);
    };

    const syncLoop = () => {
      if (
        typeof document !== "undefined" &&
        !shouldRunDecorativeCanvasLoop(document.hidden)
      ) {
        stopLoop();
        return;
      }
      startLoop();
    };

    document.addEventListener("visibilitychange", syncLoop);
    startLoop();
    return () => {
      document.removeEventListener("visibilitychange", syncLoop);
      // LEAK-18: Increment generation so any in-flight RAF frame self-terminates
      bpGenRef.current += 1;
      stopLoop();
      ro.disconnect();
    };
  }, [spawnParticle]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 10,
      }}
    />
  );
};

export default BloodParticles;
