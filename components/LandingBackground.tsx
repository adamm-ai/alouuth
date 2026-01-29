import React, { useEffect, useRef } from 'react';
import { createNoise3D } from 'simplex-noise';

interface Point {
  x: number;
  y: number;
  originX: number;
  originY: number;
  opacity: number;
  targetOpacity: number;
}

export const LandingBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const pointsRef = useRef<Point[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
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

    const config = {
      gridSpacing: 40,
      noiseScale: 0.0008,
      timeSpeed: 0.00015,
      distortionStrength: 25,
      connectionDistance: 70,
      mouseRadius: 200, // Radius of mouse influence (increased for smoother effect)
      nodeSize: 2, // Size of the dots
      baseOpacity: 0.12, // Dim base opacity when mouse is away
      maxOpacity: 1, // Full brightness when mouse is near
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
            opacity: config.baseOpacity, // Start dim
            targetOpacity: config.baseOpacity,
          });
        }
      }
      pointsRef.current = points;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };

    const animate = () => {
      timeRef.current += config.timeSpeed;
      const time = timeRef.current;
      const mouse = mouseRef.current;

      // Deep black background
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      const points = pointsRef.current;
      const cols = Math.ceil(width / config.gridSpacing) + 2;
      const rows = Math.ceil(height / config.gridSpacing) + 2;

      // Update points position and opacity based on mouse
      for (let i = 0; i < points.length; i++) {
        const p = points[i];

        // Noise-based movement
        const noiseX = noise3D(p.originX * config.noiseScale, p.originY * config.noiseScale, time);
        const noiseY = noise3D(p.originX * config.noiseScale + 100, p.originY * config.noiseScale, time);
        p.x = p.originX + noiseX * config.distortionStrength;
        p.y = p.originY + noiseY * config.distortionStrength;

        // Calculate distance from mouse
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Light up near mouse - INVERTED: brighter when close, dim when far
        if (dist < config.mouseRadius) {
          // Smooth falloff - closer = brighter
          const proximity = 1 - (dist / config.mouseRadius);
          const brightnessBoost = proximity * proximity * proximity; // Cubic for smoother center glow
          p.targetOpacity = config.baseOpacity + (config.maxOpacity - config.baseOpacity) * brightnessBoost;
        } else {
          p.targetOpacity = config.baseOpacity; // Return to dim state
        }

        // Smooth opacity transition (slightly slower for elegant fade)
        p.opacity += (p.targetOpacity - p.opacity) * 0.08;
      }

      // Draw grid lines with additive blending
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = 0.5;

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const idx = i * rows + j;
          const p = points[idx];
          if (!p) continue;

          // Right connection
          if (i < cols - 1) {
            const rightIdx = (i + 1) * rows + j;
            const neighbor = points[rightIdx];
            if (neighbor) {
              drawLine(ctx, p, neighbor, config.connectionDistance);
            }
          }

          // Bottom connection
          if (j < rows - 1) {
            const bottomIdx = i * rows + (j + 1);
            const neighbor = points[bottomIdx];
            if (neighbor) {
              drawLine(ctx, p, neighbor, config.connectionDistance);
            }
          }
        }
      }

      // Draw nodes (dots) at intersections
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        if (p.opacity < 0.02) continue;

        const alpha = p.opacity;

        // Dynamic glow size based on brightness
        const glowSize = config.nodeSize * (2 + alpha * 2);

        // Outer glow - more visible when lit up
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowSize);
        gradient.addColorStop(0, `rgba(212, 175, 55, ${alpha * 0.7})`);
        gradient.addColorStop(0.4, `rgba(212, 175, 55, ${alpha * 0.25})`);
        gradient.addColorStop(1, 'rgba(212, 175, 55, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, glowSize, 0, Math.PI * 2);
        ctx.fill();

        // Core dot - brighter center
        ctx.fillStyle = `rgba(255, 220, 100, ${alpha * 0.9})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, config.nodeSize * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = 'source-over';
      animationRef.current = requestAnimationFrame(animate);
    };

    const drawLine = (ctx: CanvasRenderingContext2D, p1: Point, p2: Point, maxDist: number) => {
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      if (dist > maxDist * 1.4) return;

      let alpha = 1 - (dist / (maxDist * 1.4));
      alpha = alpha * alpha;

      // Combine both points' opacity for line visibility - use average for smoother gradients
      const combinedOpacity = (p1.opacity + p2.opacity) / 2;
      alpha *= combinedOpacity * 0.6;

      if (alpha < 0.008) return;

      ctx.strokeStyle = `rgba(212, 175, 55, ${alpha})`;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);
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
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {/* Base black */}
      <div className="absolute inset-0 bg-black" />

      {/* Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* Subtle ambient glow - top (reduced) */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_40%_at_50%_-10%,rgba(212,175,55,0.04),transparent_60%)]" />

      {/* Subtle ambient glow - bottom (reduced) */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_50%_at_50%_110%,rgba(212,175,55,0.03),transparent_50%)]" />

      {/* Soft vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.5)_70%,rgba(0,0,0,0.85)_100%)]" />
    </div>
  );
};
