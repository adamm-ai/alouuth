import React, { useEffect, useRef, useCallback } from 'react';

/**
 * Premium Landing Background
 * - Luxurious animated grid with pulsing nodes
 * - Mouse illumination effect with radiant glow
 * - Optimized for smooth 60fps performance
 */
export const LandingBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const mousePos = useRef({ x: -9999, y: -9999 });
  const targetMousePos = useRef({ x: -9999, y: -9999 });
  const isMouseActive = useRef(false);
  const timeRef = useRef(0);
  const lastFrameTime = useRef(0);

  // Pre-computed values for performance
  const gridDataRef = useRef<{ phases: number[] } | null>(null);

  const animate = useCallback((currentTime: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Throttle to ~60fps for consistent performance
    const deltaTime = currentTime - lastFrameTime.current;
    if (deltaTime < 16) {
      animationRef.current = requestAnimationFrame(animate);
      return;
    }
    lastFrameTime.current = currentTime;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    // Time for animations (slower increment for smoother animation)
    timeRef.current += 0.006;
    const time = timeRef.current;

    // Smooth mouse tracking
    mousePos.current.x += (targetMousePos.current.x - mousePos.current.x) * 0.1;
    mousePos.current.y += (targetMousePos.current.y - mousePos.current.y) * 0.1;

    // Clear with black
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Config
    const gridSize = 50;
    const baseAlpha = 0.12;
    const maxAlpha = 0.85;
    const mouseRadius = 280;
    const mouseRadiusSq = mouseRadius * mouseRadius;

    ctx.globalCompositeOperation = 'lighter';

    // Calculate grid dimensions
    const cols = Math.ceil(width / gridSize) + 1;
    const rows = Math.ceil(height / gridSize) + 1;

    // Pre-calculate sin values for this frame (optimization)
    const sinTime08 = Math.sin(time * 0.8);
    const sinTime15 = Math.sin(time * 1.5);

    // Batch draw operations - collect all nodes first
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const x = i * gridSize;
        const y = j * gridSize;

        // Simplified phase calculation
        const phase = (i * 0.3 + j * 0.5);
        const pulse = 0.5 + 0.5 * Math.sin(phase + time * 1.5);
        const breathe = 0.7 + 0.3 * Math.sin(phase + time * 0.8);

        // Calculate distance to mouse
        const dx = x - mousePos.current.x;
        const dy = y - mousePos.current.y;
        const distSq = dx * dx + dy * dy;

        let alpha = baseAlpha * breathe;
        let nodeSize = 2;
        let glowSize = 6;

        if (isMouseActive.current && distSq < mouseRadiusSq) {
          const t = 1 - (Math.sqrt(distSq) / mouseRadius);
          const smoothT = t * t * (3 - 2 * t);
          alpha = baseAlpha + (maxAlpha - baseAlpha) * smoothT;
          nodeSize = 2 + 2 * smoothT;
          glowSize = 6 + 8 * smoothT;
        }

        // Skip nearly invisible nodes
        if (alpha < 0.02) continue;

        // Draw outer glow (simplified - no gradient creation per frame)
        const glowRadius = glowSize * (1 + pulse * 0.2);
        ctx.fillStyle = `rgba(212, 175, 55, ${alpha * 0.15})`;
        ctx.beginPath();
        ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // Draw mid glow
        ctx.fillStyle = `rgba(245, 215, 110, ${alpha * 0.3})`;
        ctx.beginPath();
        ctx.arc(x, y, glowRadius * 0.6, 0, Math.PI * 2);
        ctx.fill();

        // Draw inner ring
        ctx.fillStyle = `rgba(255, 230, 150, ${alpha * 0.4 * pulse})`;
        ctx.beginPath();
        ctx.arc(x, y, nodeSize + 1, 0, Math.PI * 2);
        ctx.fill();

        // Draw bright core
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, nodeSize * 0.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(255, 245, 200, ${alpha * 0.9})`;
        ctx.beginPath();
        ctx.arc(x, y, nodeSize, 0, Math.PI * 2);
        ctx.fill();

        // Draw lines (simplified - solid color instead of gradients)
        ctx.lineWidth = 0.8;

        // Right line
        if (i < cols - 1) {
          const nx = (i + 1) * gridSize;
          const ndx = nx - mousePos.current.x;
          const nDistSq = ndx * ndx + dy * dy;

          let lineAlpha = baseAlpha * 0.5 * breathe;
          if (isMouseActive.current) {
            const avgDistSq = (distSq + nDistSq) / 2;
            if (avgDistSq < mouseRadiusSq) {
              const t = 1 - (Math.sqrt(avgDistSq) / mouseRadius);
              lineAlpha = baseAlpha + (maxAlpha - baseAlpha) * t * t * 0.4;
            }
          }

          if (lineAlpha > 0.02) {
            ctx.strokeStyle = `rgba(212, 175, 55, ${lineAlpha})`;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(nx, y);
            ctx.stroke();
          }
        }

        // Bottom line
        if (j < rows - 1) {
          const ny = (j + 1) * gridSize;
          const ndy = ny - mousePos.current.y;
          const nDistSq = dx * dx + ndy * ndy;

          let lineAlpha = baseAlpha * 0.5 * breathe;
          if (isMouseActive.current) {
            const avgDistSq = (distSq + nDistSq) / 2;
            if (avgDistSq < mouseRadiusSq) {
              const t = 1 - (Math.sqrt(avgDistSq) / mouseRadius);
              lineAlpha = baseAlpha + (maxAlpha - baseAlpha) * t * t * 0.4;
            }
          }

          if (lineAlpha > 0.02) {
            ctx.strokeStyle = `rgba(212, 175, 55, ${lineAlpha})`;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x, ny);
            ctx.stroke();
          }
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
