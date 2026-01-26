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
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Configuration for "World Class" Feel
    const config = {
      gridSpacing: 50, // Space between points
      noiseScale: 0.0015, // How "zoomed in" the noise is (lower = smoother flow)
      timeSpeed: 0.0003, // Speed of animation
      distortionStrength: 30, // How far points drift
      connectionDistance: 110, // Max distance to draw lines
      baseColor: { h: 38, s: 90, l: 50 }, // Gold/Amber base
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

      // Clear with very subtle trail effect for "liquid" feel? No, clean abstract looks slicker.
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      const points = pointsRef.current;

      // Update Points
      points.forEach(p => {
        const noiseX = noise3D(p.originX * config.noiseScale, p.originY * config.noiseScale, time);
        const noiseY = noise3D(p.originX * config.noiseScale, p.originY * config.noiseScale + 100, time);

        // Circular organic drift
        p.x = p.originX + noiseX * config.distortionStrength;
        p.y = p.originY + noiseY * config.distortionStrength;
      });

      // Draw Connections (Triangulation / Mesh feel)
      // Optimized: Only check neighbors in grid would be faster, but for < 1000 points O(N^2) with distance check is acceptable on modern GPUs/CPUs.
      // Actually, standard N^2 is too heavy for 1000+ points on 60fps.
      // Let's rely on the grid structure for implicit connections to keep it performant and "slick".
      // Connecting primarily to immediate grid neighbors creates a nice mesh.

      const cols = Math.ceil(width / config.gridSpacing) + 2;
      const rows = Math.ceil(height / config.gridSpacing) + 2;

      ctx.lineWidth = 0.5; // Very thin lines

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const idx = i * rows + j;
          const p = points[idx];
          if (!p) continue;

          // Connect to right
          if (i < cols - 1) {
            const rightIdx = (i + 1) * rows + j;
            const neighbor = points[rightIdx];
            drawConnection(ctx, p, neighbor);
          }

          // Connect to bottom
          if (j < rows - 1) {
            const bottomIdx = i * rows + (j + 1);
            const neighbor = points[bottomIdx];
            drawConnection(ctx, p, neighbor);
          }

          // Connect diagonal (optional, adds structural density)
          if (i < cols - 1 && j < rows - 1) {
            const diagIdx = (i + 1) * rows + (j + 1);
            const neighbor = points[diagIdx];
            drawConnection(ctx, p, neighbor, 0.5); // Fainter diagonal
          }
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    const drawConnection = (ctx: CanvasRenderingContext2D, p1: Point, p2: Point, opacityMultiplier = 1) => {
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const maxDist = config.connectionDistance * 1.5; // Allow some stretch

      // Alpha taking distance into account - stretch leads to break
      let alpha = 1 - (dist / maxDist);
      alpha = Math.max(0, alpha);
      alpha = Math.pow(alpha, 2); // Non-linear fade

      if (alpha <= 0.01) return;

      // Gradient Stroke - Wealthy Gold
      const gradient = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
      const colorStops = [
        `rgba(250, 200, 20, ${alpha * 0.15 * opacityMultiplier})`, // Amber/Gold low opacity
        `rgba(255, 240, 200, ${alpha * 0.08 * opacityMultiplier})`, // Cream highlight
        `rgba(250, 200, 20, ${alpha * 0.15 * opacityMultiplier})`
      ];

      gradient.addColorStop(0, colorStops[0]);
      gradient.addColorStop(0.5, colorStops[1]);
      gradient.addColorStop(1, colorStops[2]);

      ctx.strokeStyle = gradient;
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

      {/* Cinematic Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_70%,#000000_100%)]" />

      {/* Noise Texture */}
      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
        }}
      />

      {/* Ambient Gold Glows (Subtler) */}
      <div className="absolute top-[-10%] left-[20%] w-[40vw] h-[40vw] bg-yellow-600/[0.04] blur-[150px] rounded-full animate-pulse-glow" />
      <div className="absolute bottom-[-10%] right-[20%] w-[30vw] h-[30vw] bg-amber-700/[0.03] blur-[120px] rounded-full animate-pulse-glow" style={{ animationDelay: '2s' }} />
    </div>
  );
};
