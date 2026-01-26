import React, { useEffect, useRef } from 'react';
import { createNoise3D } from 'simplex-noise';

interface Point {
  x: number;
  y: number;
  originX: number;
  originY: number;
  noiseOffsetX: number;
  noiseOffsetY: number;
}

export const LiquidBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const pointsRef = useRef<Point[]>([]);
  const noise3D = useRef(createNoise3D()).current;
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    // 8K Optimization: Uncap DPI, allow up to 4x for ultra-crisp lines
    const dpr = Math.min(window.devicePixelRatio || 1, 4);

    const config = {
      gridSpacing: 40, // Increased density (was 50)
      noiseScale: 0.001, // Smoother, larger curves
      timeSpeed: 0.0002, // Slower, more majestic movement
      distortionStrength: 25,
      connectionDistance: 90,
      // Gold/Amber shifted to a more "light beam" feel
      baseColor: '250, 200, 20',
    };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
      initPoints();
    };

    const initPoints = () => {
      const points: Point[] = [];
      const cols = Math.ceil(width / config.gridSpacing) + 2;
      const rows = Math.ceil(height / config.gridSpacing) + 2;

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = (i - 1) * config.gridSpacing;
          const y = (j - 1) * config.gridSpacing;
          points.push({
            x,
            y,
            originX: x,
            originY: y,
            noiseOffsetX: Math.random() * 1000,
            noiseOffsetY: Math.random() * 1000,
          });
        }
      }
      pointsRef.current = points;
    };

    const animate = () => {
      timeRef.current += config.timeSpeed;
      const time = timeRef.current;

      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      // Ultra-Slick Mode: Additive Blending
      // This makes overlapping lines add up in brightness, creating glowing intersections
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = 0.2; // Razor thin lines

      const points = pointsRef.current;

      // Update Points
      points.forEach(p => {
        const noiseX = noise3D(p.originX * config.noiseScale, p.originY * config.noiseScale, time);
        const noiseY = noise3D(p.originX * config.noiseScale, p.originY * config.noiseScale + 100, time);

        p.x = p.originX + noiseX * config.distortionStrength;
        p.y = p.originY + noiseY * config.distortionStrength;
      });

      // Draw Grid Connections
      const cols = Math.ceil(width / config.gridSpacing) + 2;
      const rows = Math.ceil(height / config.gridSpacing) + 2;

      const r = 250, g = 200, b = 20;

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const idx = i * rows + j;
          const p = points[idx];
          if (!p) continue;

          // Right connection
          if (i < cols - 1) {
            const rightIdx = (i + 1) * rows + j;
            const neighbor = points[rightIdx];
            drawLine(ctx, p, neighbor, r, g, b);
          }

          // Bottom connection
          if (j < rows - 1) {
            const bottomIdx = i * rows + (j + 1);
            const neighbor = points[bottomIdx];
            drawLine(ctx, p, neighbor, r, g, b);
          }

          // No diagonal connections = cleaner, wireframe look
        }
      }

      ctx.globalCompositeOperation = 'source-over'; // Reset for next frame clear
      animationRef.current = requestAnimationFrame(animate);
    };

    const drawLine = (ctx: CanvasRenderingContext2D, p1: Point, p2: Point, r: number, g: number, b: number) => {
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const maxDist = config.connectionDistance * 1.3;

      if (dist > maxDist) return;

      let alpha = 1 - (dist / maxDist);
      alpha = Math.pow(alpha, 3); // Stronger falloff for sharper start/end points

      if (alpha < 0.02) return;

      // Solid color with alpha is much faster than gradients
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.4})`; // Lower base opacity, reliant on 'lighter' blend to pop
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    };

    resize();
    window.addEventListener('resize', resize);
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-black/95">
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* Cinematic Vignette - Smoother */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_80%,#000000_100%)]" />

      {/* Subtle TextureOverlay */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none mix-blend-overlay"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
      />
    </div>
  );
};
