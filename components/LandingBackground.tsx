import React, { useEffect, useRef, useCallback } from 'react';

/**
 * Premium Landing Background
 * - Subtle, stable grid animation
 * - Mouse illumination effect (dims by default, lights up on hover)
 * - Optimized for performance (no jitter, no lag)
 */
export const LandingBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const mousePos = useRef({ x: -9999, y: -9999 });
  const targetMousePos = useRef({ x: -9999, y: -9999 });
  const isMouseActive = useRef(false);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);

    // Smooth mouse tracking
    mousePos.current.x += (targetMousePos.current.x - mousePos.current.x) * 0.08;
    mousePos.current.y += (targetMousePos.current.y - mousePos.current.y) * 0.08;

    // Clear
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Config
    const gridSize = 50;
    const baseAlpha = 0.08;
    const maxAlpha = 0.5;
    const mouseRadius = 200;
    const mouseRadiusSq = mouseRadius * mouseRadius;

    ctx.globalCompositeOperation = 'lighter';

    // Draw grid
    const cols = Math.ceil(width / gridSize) + 1;
    const rows = Math.ceil(height / gridSize) + 1;

    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const x = i * gridSize;
        const y = j * gridSize;

        // Calculate distance to mouse
        const dx = x - mousePos.current.x;
        const dy = y - mousePos.current.y;
        const distSq = dx * dx + dy * dy;

        let alpha = baseAlpha;

        if (isMouseActive.current && distSq < mouseRadiusSq) {
          const dist = Math.sqrt(distSq);
          const t = 1 - (dist / mouseRadius);
          // Smooth hermite interpolation
          const smoothT = t * t * (3 - 2 * t);
          alpha = baseAlpha + (maxAlpha - baseAlpha) * smoothT;
        }

        // Draw node
        if (alpha > 0.01) {
          // Glow
          ctx.fillStyle = `rgba(212, 175, 55, ${alpha * 0.3})`;
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fill();

          // Core
          ctx.fillStyle = `rgba(255, 215, 80, ${alpha})`;
          ctx.beginPath();
          ctx.arc(x, y, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Draw lines to right and bottom neighbors
        ctx.lineWidth = 0.5;

        // Right line
        if (i < cols - 1) {
          const nx = (i + 1) * gridSize;
          const ndx = nx - mousePos.current.x;
          const nDistSq = ndx * ndx + dy * dy;

          let lineAlpha = baseAlpha;
          if (isMouseActive.current) {
            const avgDistSq = (distSq + nDistSq) / 2;
            if (avgDistSq < mouseRadiusSq) {
              const avgDist = Math.sqrt(avgDistSq);
              const t = 1 - (avgDist / mouseRadius);
              const smoothT = t * t * (3 - 2 * t);
              lineAlpha = baseAlpha + (maxAlpha - baseAlpha) * smoothT * 0.6;
            }
          }

          if (lineAlpha > 0.01) {
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

          let lineAlpha = baseAlpha;
          if (isMouseActive.current) {
            const avgDistSq = (distSq + nDistSq) / 2;
            if (avgDistSq < mouseRadiusSq) {
              const avgDist = Math.sqrt(avgDistSq);
              const t = 1 - (avgDist / mouseRadius);
              const smoothT = t * t * (3 - 2 * t);
              lineAlpha = baseAlpha + (maxAlpha - baseAlpha) * smoothT * 0.6;
            }
          }

          if (lineAlpha > 0.01) {
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

    const ctx = canvas.getContext('2d');
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
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave);

    animationRef.current = requestAnimationFrame(animate);

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
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <div className="absolute inset-0 bg-black" />
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* Subtle vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_80%,rgba(0,0,0,0.9)_100%)]" />
    </div>
  );
};
