import React, { useEffect, useRef } from 'react';
import { createNoise3D } from 'simplex-noise';

interface Point {
  x: number;
  y: number;
  z: number; // Added Z for 3D depth
  originX: number;
  originY: number;
  originZ: number;
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
    // 8K/4K Optimization: Allow high DPI for ultra-crisp lines
    const dpr = Math.min(window.devicePixelRatio || 1, 4);

    const config = {
      gridSpacing: 35, // Tighter grid for more density
      noiseScale: 0.0008, // Smoother, larger flowing curves
      timeSpeed: 0.00025, // Elegant, majestic movement
      distortionStrength: 30, // More pronounced wave effect
      connectionDistance: 85,
      // Brilliant gold spectrum
      primaryGold: { r: 255, g: 215, b: 0 },   // Pure gold
      secondaryGold: { r: 212, g: 175, b: 55 }, // Rich gold
      accentGold: { r: 245, g: 215, b: 110 },   // Light gold
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
      const cols = Math.ceil(width / config.gridSpacing) + 3;
      const rows = Math.ceil(height / config.gridSpacing) + 3;

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = (i - 1) * config.gridSpacing;
          const y = (j - 1) * config.gridSpacing;
          points.push({
            x,
            y,
            z: 0,
            originX: x,
            originY: y,
            originZ: 0,
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

      // Deep black background
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      // Additive blending for brilliant glowing intersections
      ctx.globalCompositeOperation = 'lighter';

      const points = pointsRef.current;
      const cols = Math.ceil(width / config.gridSpacing) + 3;
      const rows = Math.ceil(height / config.gridSpacing) + 3;

      // Update Points with 3D wave effect
      points.forEach(p => {
        const noiseX = noise3D(p.originX * config.noiseScale, p.originY * config.noiseScale, time);
        const noiseY = noise3D(p.originX * config.noiseScale + 100, p.originY * config.noiseScale, time);
        const noiseZ = noise3D(p.originX * config.noiseScale, p.originY * config.noiseScale + 200, time * 1.5);

        p.x = p.originX + noiseX * config.distortionStrength;
        p.y = p.originY + noiseY * config.distortionStrength;
        p.z = noiseZ * 50; // Depth variation for 3D effect
      });

      // Draw multiple layers for depth and glow
      for (let layer = 0; layer < 3; layer++) {
        const layerAlpha = layer === 0 ? 0.15 : layer === 1 ? 0.25 : 0.5;
        const lineWidth = layer === 0 ? 0.8 : layer === 1 ? 0.4 : 0.15;

        ctx.lineWidth = lineWidth;

        for (let i = 0; i < cols; i++) {
          for (let j = 0; j < rows; j++) {
            const idx = i * rows + j;
            const p = points[idx];
            if (!p) continue;

            // Calculate depth-based brightness (3D effect)
            const depthFactor = (p.z + 50) / 100; // Normalize to 0-1
            const brightness = 0.5 + depthFactor * 0.5;

            // Right connection
            if (i < cols - 1) {
              const rightIdx = (i + 1) * rows + j;
              const neighbor = points[rightIdx];
              if (neighbor) {
                drawBrilliantLine(ctx, p, neighbor, brightness, layerAlpha, config);
              }
            }

            // Bottom connection
            if (j < rows - 1) {
              const bottomIdx = i * rows + (j + 1);
              const neighbor = points[bottomIdx];
              if (neighbor) {
                drawBrilliantLine(ctx, p, neighbor, brightness, layerAlpha, config);
              }
            }
          }
        }
      }

      // Draw glowing node points for extra brilliance
      ctx.globalCompositeOperation = 'lighter';
      points.forEach(p => {
        const depthFactor = (p.z + 50) / 100;
        const size = 0.5 + depthFactor * 1;
        const alpha = 0.1 + depthFactor * 0.2;

        // Warm gold glow at intersection points
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 3);
        gradient.addColorStop(0, `rgba(255, 220, 50, ${alpha})`);
        gradient.addColorStop(0.5, `rgba(212, 175, 55, ${alpha * 0.5})`);
        gradient.addColorStop(1, 'rgba(212, 175, 55, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size * 3, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.globalCompositeOperation = 'source-over';
      animationRef.current = requestAnimationFrame(animate);
    };

    const drawBrilliantLine = (
      ctx: CanvasRenderingContext2D,
      p1: Point,
      p2: Point,
      brightness: number,
      layerAlpha: number,
      config: any
    ) => {
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const maxDist = config.connectionDistance * 1.4;

      if (dist > maxDist) return;

      let alpha = 1 - (dist / maxDist);
      alpha = Math.pow(alpha, 2.5); // Sharp falloff for crisp edges

      if (alpha < 0.01) return;

      const finalAlpha = alpha * layerAlpha * brightness;

      // Calculate color based on position (creates subtle color variation across grid)
      const colorMix = (Math.sin(p1.x * 0.01 + p1.y * 0.01 + timeRef.current * 3) + 1) / 2;

      // Interpolate between gold shades for rich, dynamic coloring
      const r = Math.round(config.primaryGold.r * colorMix + config.secondaryGold.r * (1 - colorMix));
      const g = Math.round(config.primaryGold.g * colorMix + config.secondaryGold.g * (1 - colorMix));
      const b = Math.round(config.primaryGold.b * colorMix + config.secondaryGold.b * (1 - colorMix));

      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${finalAlpha})`;
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
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-black">
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* Premium radial glow from center */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(212,175,55,0.15),transparent_60%)]" />

      {/* Subtle gold accent at bottom */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_40%_at_50%_100%,rgba(212,175,55,0.08),transparent_50%)]" />

      {/* Cinematic Vignette - Smooth and elegant */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.5)_70%,rgba(0,0,0,0.85)_100%)]" />

      {/* Subtle film grain texture */}
      <div className="absolute inset-0 opacity-[0.015] pointer-events-none mix-blend-overlay"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
      />
    </div>
  );
};
