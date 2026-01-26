import React, { useEffect, useRef } from 'react';

interface Line {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  angle: number;
  length: number;
  baseAlpha: number;
  glowIntensity: number;
  targetGlow: number;
  speed: number;
  offset: number;
}

export const LiquidBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const linesRef = useRef<Line[]>([]);
  const timeRef = useRef(0);
  const mouseRef = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(dpr, dpr);
      initLines();
    };

    const initLines = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const lines: Line[] = [];

      // Create elegant grid of intersecting lines
      const gridSize = 80;
      const cols = Math.ceil(width / gridSize) + 2;
      const rows = Math.ceil(height / gridSize) + 2;

      // Horizontal flowing lines
      for (let i = 0; i < rows; i++) {
        const y = i * gridSize - gridSize;
        const segments = Math.floor(Math.random() * 3) + 2;

        for (let s = 0; s < segments; s++) {
          const segmentWidth = width / segments;
          const x1 = s * segmentWidth + Math.random() * 40 - 20;
          const x2 = (s + 1) * segmentWidth + Math.random() * 40 - 20;

          lines.push({
            x1,
            y1: y + Math.random() * 20 - 10,
            x2,
            y2: y + Math.random() * 20 - 10,
            angle: 0,
            length: Math.abs(x2 - x1),
            baseAlpha: 0.03 + Math.random() * 0.04,
            glowIntensity: 0,
            targetGlow: 0,
            speed: 0.01 + Math.random() * 0.02,
            offset: Math.random() * Math.PI * 2
          });
        }
      }

      // Vertical flowing lines
      for (let i = 0; i < cols; i++) {
        const x = i * gridSize - gridSize;
        const segments = Math.floor(Math.random() * 3) + 2;

        for (let s = 0; s < segments; s++) {
          const segmentHeight = height / segments;
          const y1 = s * segmentHeight + Math.random() * 40 - 20;
          const y2 = (s + 1) * segmentHeight + Math.random() * 40 - 20;

          lines.push({
            x1: x + Math.random() * 20 - 10,
            y1,
            x2: x + Math.random() * 20 - 10,
            y2,
            angle: Math.PI / 2,
            length: Math.abs(y2 - y1),
            baseAlpha: 0.03 + Math.random() * 0.04,
            glowIntensity: 0,
            targetGlow: 0,
            speed: 0.01 + Math.random() * 0.02,
            offset: Math.random() * Math.PI * 2
          });
        }
      }

      // Diagonal accent lines - sparse and elegant
      for (let i = 0; i < 15; i++) {
        const startX = Math.random() * width;
        const startY = Math.random() * height;
        const angle = (Math.random() * 0.5 + 0.25) * Math.PI; // 45-135 degrees
        const length = 150 + Math.random() * 300;

        lines.push({
          x1: startX,
          y1: startY,
          x2: startX + Math.cos(angle) * length,
          y2: startY + Math.sin(angle) * length,
          angle,
          length,
          baseAlpha: 0.02 + Math.random() * 0.03,
          glowIntensity: 0,
          targetGlow: 0,
          speed: 0.008 + Math.random() * 0.015,
          offset: Math.random() * Math.PI * 2
        });
      }

      // Long sweeping curves represented as line segments
      for (let i = 0; i < 8; i++) {
        const startX = Math.random() * width;
        const startY = Math.random() * height;
        const curveLength = 400 + Math.random() * 600;
        const segments = 20;
        const baseAngle = Math.random() * Math.PI * 2;
        const curvature = (Math.random() - 0.5) * 0.02;

        let currentX = startX;
        let currentY = startY;
        let currentAngle = baseAngle;

        for (let s = 0; s < segments; s++) {
          const segLen = curveLength / segments;
          const nextX = currentX + Math.cos(currentAngle) * segLen;
          const nextY = currentY + Math.sin(currentAngle) * segLen;

          lines.push({
            x1: currentX,
            y1: currentY,
            x2: nextX,
            y2: nextY,
            angle: currentAngle,
            length: segLen,
            baseAlpha: 0.015 + Math.random() * 0.025,
            glowIntensity: 0,
            targetGlow: 0,
            speed: 0.005 + Math.random() * 0.01,
            offset: Math.random() * Math.PI * 2 + s * 0.1
          });

          currentX = nextX;
          currentY = nextY;
          currentAngle += curvature;
        }
      }

      linesRef.current = lines;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const distanceToLine = (px: number, py: number, x1: number, y1: number, x2: number, y2: number): number => {
      const A = px - x1;
      const B = py - y1;
      const C = x2 - x1;
      const D = y2 - y1;

      const dot = A * C + B * D;
      const lenSq = C * C + D * D;
      let param = -1;

      if (lenSq !== 0) param = dot / lenSq;

      let xx, yy;

      if (param < 0) {
        xx = x1;
        yy = y1;
      } else if (param > 1) {
        xx = x2;
        yy = y2;
      } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
      }

      const dx = px - xx;
      const dy = py - yy;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const animate = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const lines = linesRef.current;
      const time = timeRef.current;
      const mouse = mouseRef.current;

      // Clear canvas
      ctx.fillStyle = 'rgba(0, 0, 0, 1)';
      ctx.fillRect(0, 0, width, height);

      timeRef.current += 0.016;

      // Update and draw lines
      lines.forEach(line => {
        // Calculate distance from mouse to line
        const dist = distanceToLine(mouse.x, mouse.y, line.x1, line.y1, line.x2, line.y2);
        const maxDist = 250;

        // Set target glow based on mouse proximity
        if (dist < maxDist) {
          line.targetGlow = Math.pow(1 - dist / maxDist, 2) * 0.8;
        } else {
          line.targetGlow = 0;
        }

        // Smooth interpolation - slow elegant transition
        const lerpSpeed = 0.03;
        line.glowIntensity += (line.targetGlow - line.glowIntensity) * lerpSpeed;

        // Ambient wave animation
        const wave = Math.sin(time * line.speed * 2 + line.offset) * 0.5 + 0.5;
        const ambientPulse = wave * 0.15;

        // Calculate final alpha
        const finalAlpha = line.baseAlpha + line.glowIntensity * 0.6 + ambientPulse * line.baseAlpha;

        // Draw line with gradient
        const gradient = ctx.createLinearGradient(line.x1, line.y1, line.x2, line.y2);

        // Animated gradient position
        const gradientOffset = (Math.sin(time * line.speed + line.offset) + 1) * 0.5;

        if (line.glowIntensity > 0.05) {
          // Glowing line - gold color
          const glowAlpha = finalAlpha * 1.5;
          gradient.addColorStop(0, `rgba(250, 204, 21, ${glowAlpha * 0.3})`);
          gradient.addColorStop(Math.max(0, gradientOffset - 0.2), `rgba(250, 204, 21, ${glowAlpha * 0.5})`);
          gradient.addColorStop(gradientOffset, `rgba(254, 240, 138, ${glowAlpha})`);
          gradient.addColorStop(Math.min(1, gradientOffset + 0.2), `rgba(250, 204, 21, ${glowAlpha * 0.5})`);
          gradient.addColorStop(1, `rgba(250, 204, 21, ${glowAlpha * 0.3})`);

          // Draw glow layer
          ctx.beginPath();
          ctx.moveTo(line.x1, line.y1);
          ctx.lineTo(line.x2, line.y2);
          ctx.strokeStyle = `rgba(250, 204, 21, ${line.glowIntensity * 0.15})`;
          ctx.lineWidth = 8;
          ctx.lineCap = 'round';
          ctx.stroke();

          // Second glow layer
          ctx.beginPath();
          ctx.moveTo(line.x1, line.y1);
          ctx.lineTo(line.x2, line.y2);
          ctx.strokeStyle = `rgba(250, 204, 21, ${line.glowIntensity * 0.25})`;
          ctx.lineWidth = 4;
          ctx.stroke();
        } else {
          // Subtle ambient line - white/gray
          gradient.addColorStop(0, `rgba(255, 255, 255, ${finalAlpha * 0.4})`);
          gradient.addColorStop(gradientOffset, `rgba(255, 255, 255, ${finalAlpha})`);
          gradient.addColorStop(1, `rgba(255, 255, 255, ${finalAlpha * 0.4})`);
        }

        // Main line
        ctx.beginPath();
        ctx.moveTo(line.x1, line.y1);
        ctx.lineTo(line.x2, line.y2);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = line.glowIntensity > 0.05 ? 1.5 : 1;
        ctx.lineCap = 'round';
        ctx.stroke();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-black">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />

      {/* Depth gradient overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.2)_50%,rgba(0,0,0,0.6)_100%)]" />

      {/* Subtle vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.3)_100%)]" />

      {/* Top ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[400px] bg-gradient-to-b from-yellow-400/[0.015] to-transparent blur-3xl" />
    </div>
  );
};
