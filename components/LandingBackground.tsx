import React, { useEffect, useRef } from 'react';
import { createNoise3D } from 'simplex-noise';

interface Point {
  x: number;
  y: number;
  originX: number;
  originY: number;
  brightness: number;
  targetBrightness: number;
}

export const LandingBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const pointsRef = useRef<Point[]>([]);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const noise3DRef = useRef<ReturnType<typeof createNoise3D> | null>(null);
  const timeRef = useRef(0);
  const configRef = useRef({
    gridSpacing: 45,
    noiseScale: 0.0008,
    timeSpeed: 0.00012,
    distortionStrength: 20,
    connectionDistance: 75,
    mouseRadius: 180,
    nodeSize: 1.8,
    baseBrightness: 0.15,
    maxBrightness: 1.0,
    transitionSpeed: 0.06,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Initialize noise only once
    if (!noise3DRef.current) {
      noise3DRef.current = createNoise3D();
    }
    const noise3D = noise3DRef.current;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let cols = 0;
    let rows = 0;
    const config = configRef.current;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      initPoints();
    };

    const initPoints = () => {
      cols = Math.ceil(width / config.gridSpacing) + 2;
      rows = Math.ceil(height / config.gridSpacing) + 2;
      const points: Point[] = [];

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = (i - 1) * config.gridSpacing;
          const y = (j - 1) * config.gridSpacing;
          points.push({
            x,
            y,
            originX: x,
            originY: y,
            brightness: config.baseBrightness,
            targetBrightness: config.baseBrightness,
          });
        }
      }
      pointsRef.current = points;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouseRef.current.x = -9999;
      mouseRef.current.y = -9999;
    };

    const animate = () => {
      timeRef.current += config.timeSpeed;
      const time = timeRef.current;
      const mouseX = mouseRef.current.x;
      const mouseY = mouseRef.current.y;
      const points = pointsRef.current;
      const pointCount = points.length;

      // Clear with black
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      // Update all points
      for (let i = 0; i < pointCount; i++) {
        const p = points[i];

        // Noise-based movement
        const noiseX = noise3D(p.originX * config.noiseScale, p.originY * config.noiseScale, time);
        const noiseY = noise3D(p.originX * config.noiseScale + 100, p.originY * config.noiseScale, time);
        p.x = p.originX + noiseX * config.distortionStrength;
        p.y = p.originY + noiseY * config.distortionStrength;

        // Calculate mouse distance and brightness
        const dx = p.x - mouseX;
        const dy = p.y - mouseY;
        const distSq = dx * dx + dy * dy;
        const radiusSq = config.mouseRadius * config.mouseRadius;

        if (distSq < radiusSq) {
          const dist = Math.sqrt(distSq);
          const proximity = 1 - (dist / config.mouseRadius);
          // Smooth cubic falloff for natural glow
          const boost = proximity * proximity * (3 - 2 * proximity);
          p.targetBrightness = config.baseBrightness + (config.maxBrightness - config.baseBrightness) * boost;
        } else {
          p.targetBrightness = config.baseBrightness;
        }

        // Smooth transition
        p.brightness += (p.targetBrightness - p.brightness) * config.transitionSpeed;
      }

      // Draw with additive blending
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = 0.4;

      // Draw grid lines
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const idx = i * rows + j;
          const p = points[idx];
          if (!p) continue;

          // Right connection
          if (i < cols - 1) {
            const neighbor = points[idx + rows];
            if (neighbor) {
              drawLine(ctx, p, neighbor, config);
            }
          }

          // Bottom connection
          if (j < rows - 1) {
            const neighbor = points[idx + 1];
            if (neighbor) {
              drawLine(ctx, p, neighbor, config);
            }
          }
        }
      }

      // Draw nodes
      for (let i = 0; i < pointCount; i++) {
        const p = points[i];
        const alpha = p.brightness * 0.7;

        if (alpha < 0.02) continue;

        // Simple glow - no gradient for performance
        const glowAlpha = alpha * 0.4;
        if (glowAlpha > 0.01) {
          ctx.fillStyle = `rgba(212, 175, 55, ${glowAlpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, config.nodeSize * 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Core dot
        ctx.fillStyle = `rgba(255, 215, 80, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, config.nodeSize * 0.7, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = 'source-over';
      animationRef.current = requestAnimationFrame(animate);
    };

    const drawLine = (
      ctx: CanvasRenderingContext2D,
      p1: Point,
      p2: Point,
      config: typeof configRef.current
    ) => {
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = config.connectionDistance * 1.3;

      if (dist > maxDist) return;

      const distFactor = 1 - (dist / maxDist);
      const combinedBrightness = (p1.brightness + p2.brightness) * 0.5;
      const alpha = distFactor * distFactor * combinedBrightness * 0.5;

      if (alpha < 0.008) return;

      ctx.strokeStyle = `rgba(212, 175, 55, ${alpha})`;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    };

    // Initialize
    resize();

    // Event listeners
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave);

    // Start animation
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <div className="absolute inset-0 bg-black" />
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* Subtle ambient glow - very reduced */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_40%_at_50%_-10%,rgba(212,175,55,0.05),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_50%_at_50%_110%,rgba(212,175,55,0.03),transparent_50%)]" />

      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.5)_70%,rgba(0,0,0,0.85)_100%)]" />
    </div>
  );
};
