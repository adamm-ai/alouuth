import React, { useEffect, useRef, useCallback } from 'react';

/**
 * Premium Landing Background - Neuromarketing Optimized
 *
 * Design principles:
 * - Golden ratio timing (φ = 1.618) for natural, satisfying rhythm
 * - Subtle luminosity - attention-catching without being overwhelming
 * - Organic breathing animation creates subconscious sense of life
 * - Refined mouse interaction with elegant easing
 * - Sober luxury aesthetic - Figma-quality refinement
 */
export const LandingBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const mousePos = useRef({ x: -9999, y: -9999 });
  const targetMousePos = useRef({ x: -9999, y: -9999 });
  const isMouseActive = useRef(false);
  const timeRef = useRef(0);
  const lastFrameTime = useRef(0);

  const animate = useCallback((currentTime: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Smooth 60fps throttle
    const deltaTime = currentTime - lastFrameTime.current;
    if (deltaTime < 16) {
      animationRef.current = requestAnimationFrame(animate);
      return;
    }
    lastFrameTime.current = currentTime;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    // Golden ratio based time progression for natural rhythm
    const PHI = 1.618;
    timeRef.current += 0.004;
    const time = timeRef.current;

    // Silky smooth mouse interpolation (luxury feel)
    const mouseSmoothing = 0.08;
    mousePos.current.x += (targetMousePos.current.x - mousePos.current.x) * mouseSmoothing;
    mousePos.current.y += (targetMousePos.current.y - mousePos.current.y) * mouseSmoothing;

    // Deep black canvas
    ctx.fillStyle = '#030303';
    ctx.fillRect(0, 0, width, height);

    // Refined configuration
    const gridSize = 48;
    const baseAlpha = 0.06;        // Subtle base presence
    const hoverAlpha = 0.45;       // Elegant hover intensity (not overwhelming)
    const mouseRadius = 220;       // Intimate interaction radius
    const mouseRadiusSq = mouseRadius * mouseRadius;

    // Calculate grid
    const cols = Math.ceil(width / gridSize) + 1;
    const rows = Math.ceil(height / gridSize) + 1;

    // Global wave for cohesive breathing (golden ratio frequency)
    const globalBreath = 0.5 + 0.5 * Math.sin(time * PHI * 0.5);

    ctx.globalCompositeOperation = 'lighter';

    // First pass: Draw connection lines (behind nodes)
    ctx.lineWidth = 0.5;
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const x = i * gridSize;
        const y = j * gridSize;

        // Unique phase per node (creates wave propagation effect)
        const nodePhase = (i * 0.618 + j * 0.382) * PHI;
        const localBreath = 0.6 + 0.4 * Math.sin(nodePhase + time * 0.8);

        const dx = x - mousePos.current.x;
        const dy = y - mousePos.current.y;
        const distSq = dx * dx + dy * dy;

        let lineAlpha = baseAlpha * 0.4 * localBreath * globalBreath;

        if (isMouseActive.current && distSq < mouseRadiusSq) {
          const dist = Math.sqrt(distSq);
          const t = 1 - (dist / mouseRadius);
          // Quintic ease-out for luxurious deceleration
          const easeT = 1 - Math.pow(1 - t, 5);
          lineAlpha = Math.max(lineAlpha, hoverAlpha * 0.3 * easeT);
        }

        if (lineAlpha < 0.008) continue;

        // Right connection
        if (i < cols - 1) {
          ctx.strokeStyle = `rgba(180, 155, 60, ${lineAlpha})`;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + gridSize, y);
          ctx.stroke();
        }

        // Bottom connection
        if (j < rows - 1) {
          ctx.strokeStyle = `rgba(180, 155, 60, ${lineAlpha})`;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + gridSize);
          ctx.stroke();
        }
      }
    }

    // Second pass: Draw nodes (on top of lines)
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const x = i * gridSize;
        const y = j * gridSize;

        // Unique phase creates cascading wave effect
        const nodePhase = (i * 0.618 + j * 0.382) * PHI;

        // Multi-frequency breathing for organic feel
        const breath1 = Math.sin(nodePhase + time * 0.7);
        const breath2 = Math.sin(nodePhase * 1.3 + time * 1.1);
        const combinedBreath = 0.5 + 0.3 * breath1 + 0.2 * breath2;

        const dx = x - mousePos.current.x;
        const dy = y - mousePos.current.y;
        const distSq = dx * dx + dy * dy;

        let alpha = baseAlpha * combinedBreath * globalBreath;
        let coreSize = 1.2;
        let haloSize = 3;

        if (isMouseActive.current && distSq < mouseRadiusSq) {
          const dist = Math.sqrt(distSq);
          const t = 1 - (dist / mouseRadius);
          // Smooth quintic ease for premium feel
          const easeT = 1 - Math.pow(1 - t, 5);
          alpha = baseAlpha + (hoverAlpha - baseAlpha) * easeT;
          coreSize = 1.2 + 1.0 * easeT;
          haloSize = 3 + 4 * easeT;
        }

        // Skip invisible nodes
        if (alpha < 0.01) continue;

        // Subtle outer halo (very soft, not glowy)
        const haloAlpha = alpha * 0.15 * combinedBreath;
        if (haloAlpha > 0.005) {
          ctx.fillStyle = `rgba(200, 170, 80, ${haloAlpha})`;
          ctx.beginPath();
          ctx.arc(x, y, haloSize, 0, Math.PI * 2);
          ctx.fill();
        }

        // Warm gold mid-layer
        ctx.fillStyle = `rgba(212, 180, 90, ${alpha * 0.5})`;
        ctx.beginPath();
        ctx.arc(x, y, coreSize + 0.8, 0, Math.PI * 2);
        ctx.fill();

        // Bright refined core (warm white, not pure white)
        ctx.fillStyle = `rgba(255, 248, 230, ${alpha * 0.9})`;
        ctx.beginPath();
        ctx.arc(x, y, coreSize, 0, Math.PI * 2);
        ctx.fill();

        // Tiny bright center point (the "jewel")
        if (alpha > 0.15) {
          ctx.fillStyle = `rgba(255, 255, 250, ${Math.min(alpha * 1.2, 0.8)})`;
          ctx.beginPath();
          ctx.arc(x, y, coreSize * 0.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ctx.globalCompositeOperation = 'source-over';
    animationRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = window.innerWidth;
      const height = window.innerHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const handleMouseMove = (e: MouseEvent) => {
      targetMousePos.current.x = e.clientX;
      targetMousePos.current.y = e.clientY;
      isMouseActive.current = true;
    };

    const handleMouseLeave = () => {
      isMouseActive.current = false;
      targetMousePos.current.x = -9999;
      targetMousePos.current.y = -9999;
    };

    resize();
    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave, { passive: true });

    // Start animation with timestamp
    animationRef.current = requestAnimationFrame((t) => animate(t));

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate]);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" style={{ contain: 'strict' }}>
      <div className="absolute inset-0 bg-black" />
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ willChange: 'transform' }}
      />

      {/* Subtle vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_80%,rgba(0,0,0,0.9)_100%)]" />
    </div>
  );
};
