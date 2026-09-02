import type React from "react";
import { useEffect, useRef } from "react";
import {
  isStarfieldPaused,
  planStarfieldLoop,
  subscribeStarfieldPaused,
} from "../engine/starfieldActivity";

interface Star {
  x: number;
  y: number;
  size: number;
  baseSize: number;
  opacity: number;
  baseOpacity: number;
  fadeDirection: number;
  fadeSpeed: number;
  color: string;
  nextFadeTime: number;
  fadeDuration: number;
  pulsePhase: number;
  pulseSpeed: number;
  pulseAmplitude: number;
}

const StarfieldBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  // LEAK-17: Generation counter prevents double RAF loops when the parent
  // re-mounts rapidly. The cleanup increments it so the old loop self-terminates.
  const starGenRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const createStars = () => {
      const stars: Star[] = [];
      const densityStars = Math.floor(
        (window.innerWidth * window.innerHeight) / 8000,
      );
      const numStars = Math.max(250, densityStars); // At least 250 stars

      // Create regular stars
      for (let i = 0; i < numStars; i++) {
        const fadeDuration = Math.random() * 59000 + 1000; // Random duration between 1 and 60 seconds
        const baseSize = Math.random() * 2 + 0.5;
        const baseOpacity = Math.random() * 0.8 + 0.2;
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: baseSize,
          baseSize: baseSize,
          opacity: baseOpacity,
          baseOpacity: baseOpacity,
          fadeDirection: Math.random() > 0.5 ? 1 : -1,
          fadeSpeed: 1 / fadeDuration, // Speed based on duration for consistent fade timing
          color: "white",
          nextFadeTime: Date.now() + Math.random() * fadeDuration,
          fadeDuration: fadeDuration,
          pulsePhase: Math.random() * Math.PI * 2, // Random starting phase
          pulseSpeed: 0.001 + Math.random() * 0.003, // Random pulse speed (0.001 to 0.004)
          pulseAmplitude: 0.2 + Math.random() * 0.3, // Random pulse amplitude (0.2 to 0.5)
        });
      }

      // Create milky way clusters
      const numClusters = 3 + Math.floor(Math.random() * 3);
      for (let cluster = 0; cluster < numClusters; cluster++) {
        const clusterX = Math.random() * canvas.width;
        const clusterY = Math.random() * canvas.height;
        const clusterRadius = 100 + Math.random() * 200;
        const clusterStars = 20 + Math.floor(Math.random() * 30);

        // Occasionally tint clusters with blue or red (uncommon)
        const hasColorTint = Math.random() < 0.3; // 30% chance
        const tintColor = hasColorTint
          ? Math.random() > 0.5
            ? "#4A90E2"
            : "#E24A4A"
          : "white";

        for (let i = 0; i < clusterStars; i++) {
          const angle = Math.random() * Math.PI * 2;
          const distance = Math.random() * clusterRadius;
          const x = clusterX + Math.cos(angle) * distance;
          const y = clusterY + Math.sin(angle) * distance;

          if (x >= 0 && x <= canvas.width && y >= 0 && y <= canvas.height) {
            const fadeDuration = Math.random() * 59000 + 1000; // Random duration between 1 and 60 seconds
            const baseSize = Math.random() * 1.5 + 0.3;
            const baseOpacity = Math.random() * 0.6 + 0.4;
            stars.push({
              x,
              y,
              size: baseSize,
              baseSize: baseSize,
              opacity: baseOpacity,
              baseOpacity: baseOpacity,
              fadeDirection: Math.random() > 0.5 ? 1 : -1,
              fadeSpeed: 1 / fadeDuration, // Speed based on duration for consistent fade timing
              color: tintColor,
              nextFadeTime: Date.now() + Math.random() * fadeDuration,
              fadeDuration: fadeDuration,
              pulsePhase: Math.random() * Math.PI * 2, // Random starting phase
              pulseSpeed: 0.001 + Math.random() * 0.003, // Random pulse speed (0.001 to 0.004)
              pulseAmplitude: 0.2 + Math.random() * 0.3, // Random pulse amplitude (0.2 to 0.5)
            });
          }
        }
      }

      starsRef.current = stars;
    };

    const myGen = ++starGenRef.current;

    const currentPlan = () =>
      planStarfieldLoop({
        worldPaused: isStarfieldPaused(),
        documentHidden: document.hidden,
      });

    const releaseGpuBuffer = () => {
      canvas.width = 1;
      canvas.height = 1;
      starsRef.current = [];
    };

    const animate = () => {
      if (starGenRef.current !== myGen) return;
      if (currentPlan() !== "run") {
        animationFrameRef.current = null;
        return;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const currentTime = Date.now();

      for (const star of starsRef.current) {
        // Check if it's time to start a new fade cycle
        if (currentTime >= star.nextFadeTime) {
          star.fadeDirection = Math.random() > 0.5 ? 1 : -1;
          // Set next fade time with random duration between 1 and 60 seconds
          star.fadeDuration = Math.random() * 59000 + 1000;
          star.fadeSpeed = 1 / star.fadeDuration;
          star.nextFadeTime = currentTime + star.fadeDuration;
        }

        // Update opacity with time-based fade speed
        const deltaTime = 16; // Approximate frame time in milliseconds (60fps)
        star.baseOpacity += star.fadeDirection * star.fadeSpeed * deltaTime;

        // Reverse direction if we hit limits
        if (star.baseOpacity <= 0.1) {
          star.baseOpacity = 0.1;
          star.fadeDirection = 1;
        } else if (star.baseOpacity >= 1) {
          star.baseOpacity = 1;
          star.fadeDirection = -1;
        }

        // Update pulse phase
        star.pulsePhase += star.pulseSpeed * deltaTime;

        // Calculate pulse effects
        const pulseValue = Math.sin(star.pulsePhase);
        const pulseSizeMultiplier = 1 + pulseValue * star.pulseAmplitude * 0.5; // Size pulsing
        const pulseOpacityMultiplier =
          1 + pulseValue * star.pulseAmplitude * 0.3; // Brightness pulsing

        // Apply pulse effects to current values
        star.size = star.baseSize * pulseSizeMultiplier;
        star.opacity = Math.min(
          1,
          Math.max(0.1, star.baseOpacity * pulseOpacityMultiplier),
        );

        // Draw star
        ctx.save();
        ctx.globalAlpha = star.opacity;
        ctx.fillStyle = star.color;
        ctx.shadowBlur = star.size * 2;
        ctx.shadowColor = star.color;

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    resizeCanvas();
    createStars();

    // M-6: while the starfield is visible, keep the backing store in sync
    // with CSS size. While WorldExploration covers it, skip this poke so a
    // mobile rotate does not allocate a second full-size 2D buffer.
    const starfieldCanvas = canvasRef.current;
    const resizeObserver = new ResizeObserver(() => {
      if (!canvasRef.current) return;
      if (currentPlan() !== "run") return;
      const { clientWidth, clientHeight } = canvasRef.current;
      if (clientWidth > 0 && clientHeight > 0) {
        canvasRef.current.width = clientWidth;
        canvasRef.current.height = clientHeight;
      }
    });
    resizeObserver.observe(starfieldCanvas!);

    // LEAK-17: myGen is captured above so this loop self-terminates if
    // the component unmounts and remounts before the loop finishes.

    const stopLoop = () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };

    const startLoop = () => {
      if (starGenRef.current !== myGen) return;
      if (currentPlan() !== "run") return;
      if (animationFrameRef.current !== null) return;
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    // PERF-2026-09-02-049: while WorldExploration covers this canvas, drop the
    // full-size backing store and skip createStars on resize. Tab-hidden on
    // landing only stops RAF and keeps the star list for a cheap resume.
    const syncLoop = () => {
      const plan = currentPlan();
      if (plan === "pause_release_gpu") {
        stopLoop();
        releaseGpuBuffer();
        return;
      }
      if (plan === "pause_keep_buffer") {
        stopLoop();
        return;
      }
      resizeCanvas();
      if (starsRef.current.length === 0) createStars();
      startLoop();
    };

    const handleResize = () => {
      if (currentPlan() !== "run") return;
      resizeCanvas();
      createStars();
    };

    window.addEventListener("resize", handleResize);
    document.addEventListener("visibilitychange", syncLoop);
    const unsubPause = subscribeStarfieldPaused(syncLoop);
    syncLoop();

    return () => {
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", syncLoop);
      unsubPause();
      // M-6: Disconnect ResizeObserver on unmount
      resizeObserver.disconnect();
      // LEAK-17: Increment generation so any in-flight RAF frame self-terminates
      starGenRef.current += 1;
      stopLoop();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 1, background: "transparent" }}
    />
  );
};

export default StarfieldBackground;
