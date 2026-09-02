import type React from "react";
import { useCallback, useEffect, useRef } from "react";

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

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      canvas.width = width;
      canvas.height = height;
    });
    ro.observe(canvas.parentElement || canvas);
    const parent = canvas.parentElement || canvas;
    canvas.width = parent.clientWidth || 100;
    canvas.height = parent.clientHeight || 100;

    const animate = () => {
      // LEAK-18: Self-terminate if our generation is stale
      const myGen = bpGenRef.current;
      animFrameRef.current = requestAnimationFrame(() => {
        if (bpGenRef.current !== myGen) return;
        animate();
      });
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
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
      for (let i = 0; i < spawnCount; i++) {
        if (particlesRef.current.length < maxParticles) {
          particlesRef.current.push(spawnParticle(w, h));
        }
      }

      // Update and draw
      particlesRef.current = particlesRef.current.filter((p) => {
        p.age++;
        p.x += p.vx;
        p.y += p.vy;
        // Slight horizontal drift
        p.vx += (Math.random() - 0.5) * 0.1;
        p.vy += 0.05; // gravity drip

        const lifeRatio = p.age / p.lifetime;
        p.alpha = 0.8 * (1 - lifeRatio);

        if (p.alpha <= 0 || p.y > h + 10) return false;

        ctx.save();
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
        ctx.restore();

        return true;
      });
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      // LEAK-18: Increment generation so any in-flight RAF frame self-terminates
      bpGenRef.current += 1;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
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
