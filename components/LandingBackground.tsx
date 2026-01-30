import React, { useEffect, useRef, useCallback } from 'react';

/**
 * Premium Landing Background
 * - Luxurious animated grid with pulsing nodes
 * - Mouse illumination effect with radiant glow
 * - Optimized for performance
 */
export const LandingBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const mousePos = useRef({ x: -9999, y: -9999 });
  const targetMousePos = useRef({ x: -9999, y: -9999 });
  const isMouseActive = useRef(false);
  const timeRef = useRef(0);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);

    // Time for animations
    timeRef.current += 0.008;
    const time = timeRef.current;

    // Smooth mouse tracking
    mousePos.current.x += (targetMousePos.current.x - mousePos.current.x) * 0.08;
    mousePos.current.y += (targetMousePos.current.y - mousePos.current.y) * 0.08;

    // Clear
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Config
    const gridSize = 50;
    const baseAlpha = 0.12;
    const maxAlpha = 0.85;
    const mouseRadius = 280;
    const mouseRadiusSq = mouseRadius * mouseRadius;

    ctx.globalCompositeOperation = 'lighter';

    // Draw grid
    const cols = Math.ceil(width / gridSize) + 1;
    const rows = Math.ceil(height / gridSize) + 1;

    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const x = i * gridSize;
        const y = j * gridSize;

        // Unique phase for each node
        const nodePhase = (i * 0.3 + j * 0.5) + time;
        const pulse = 0.5 + 0.5 * Math.sin(nodePhase * 1.5);
        const breathe = 0.7 + 0.3 * Math.sin(nodePhase * 0.8);

        // Calculate distance to mouse
        const dx = x - mousePos.current.x;
        const dy = y - mousePos.current.y;
        const distSq = dx * dx + dy * dy;

        let alpha = baseAlpha * breathe;
        let glowIntensity = 0.3;
        let nodeSize = 2;
        let outerGlowSize = 6;

        if (isMouseActive.current && distSq < mouseRadiusSq) {
          const dist = Math.sqrt(distSq);
          const t = 1 - (dist / mouseRadius);
          // Smooth hermite interpolation
          const smoothT = t * t * (3 - 2 * t);
          alpha = baseAlpha + (maxAlpha - baseAlpha) * smoothT;
          glowIntensity = 0.3 + 0.7 * smoothT;
          nodeSize = 2 + 2 * smoothT;
          outerGlowSize = 6 + 10 * smoothT;
        }

        // Draw node with luxurious glow
        if (alpha > 0.01) {
          // Outer soft glow
          const outerGradient = ctx.createRadialGradient(x, y, 0, x, y, outerGlowSize * (1 + pulse * 0.3));
          outerGradient.addColorStop(0, `rgba(245, 215, 110, ${alpha * glowIntensity * 0.5})`);
          outerGradient.addColorStop(0.4, `rgba(212, 175, 55, ${alpha * glowIntensity * 0.3})`);
          outerGradient.addColorStop(1, 'rgba(212, 175, 55, 0)');
          ctx.fillStyle = outerGradient;
          ctx.beginPath();
          ctx.arc(x, y, outerGlowSize * (1 + pulse * 0.3), 0, Math.PI * 2);
          ctx.fill();

          // Inner glow ring
          ctx.fillStyle = `rgba(255, 230, 150, ${alpha * 0.4 * pulse})`;
          ctx.beginPath();
          ctx.arc(x, y, nodeSize + 1.5, 0, Math.PI * 2);
          ctx.fill();

          // Bright core
          const coreGradient = ctx.createRadialGradient(x, y, 0, x, y, nodeSize);
          coreGradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
          coreGradient.addColorStop(0.5, `rgba(255, 235, 180, ${alpha * 0.9})`);
          coreGradient.addColorStop(1, `rgba(245, 215, 110, ${alpha * 0.6})`);
          ctx.fillStyle = coreGradient;
          ctx.beginPath();
          ctx.arc(x, y, nodeSize, 0, Math.PI * 2);
          ctx.fill();
        }

        // Draw lines to right and bottom neighbors
        ctx.lineWidth = 0.8;

        // Right line
        if (i < cols - 1) {
          const nx = (i + 1) * gridSize;
          const ndx = nx - mousePos.current.x;
          const nDistSq = ndx * ndx + dy * dy;

          let lineAlpha = baseAlpha * 0.6 * breathe;
          if (isMouseActive.current) {
            const avgDistSq = (distSq + nDistSq) / 2;
            if (avgDistSq < mouseRadiusSq) {
              const avgDist = Math.sqrt(avgDistSq);
              const t = 1 - (avgDist / mouseRadius);
              const smoothT = t * t * (3 - 2 * t);
              lineAlpha = baseAlpha + (maxAlpha - baseAlpha) * smoothT * 0.5;
            }
          }

          if (lineAlpha > 0.01) {
            const lineGradient = ctx.createLinearGradient(x, y, nx, y);
            lineGradient.addColorStop(0, `rgba(245, 215, 110, ${lineAlpha})`);
            lineGradient.addColorStop(0.5, `rgba(255, 255, 255, ${lineAlpha * 0.6})`);
            lineGradient.addColorStop(1, `rgba(245, 215, 110, ${lineAlpha})`);
            ctx.strokeStyle = lineGradient;
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

          let lineAlpha = baseAlpha * 0.6 * breathe;
          if (isMouseActive.current) {
            const avgDistSq = (distSq + nDistSq) / 2;
            if (avgDistSq < mouseRadiusSq) {
              const avgDist = Math.sqrt(avgDistSq);
              const t = 1 - (avgDist / mouseRadius);
              const smoothT = t * t * (3 - 2 * t);
              lineAlpha = baseAlpha + (maxAlpha - baseAlpha) * smoothT * 0.5;
            }
          }

          if (lineAlpha > 0.01) {
            const lineGradient = ctx.createLinearGradient(x, y, x, ny);
            lineGradient.addColorStop(0, `rgba(245, 215, 110, ${lineAlpha})`);
            lineGradient.addColorStop(0.5, `rgba(255, 255, 255, ${lineAlpha * 0.6})`);
            lineGradient.addColorStop(1, `rgba(245, 215, 110, ${lineAlpha})`);
            ctx.strokeStyle = lineGradient;
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
