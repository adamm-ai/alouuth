import React, { useEffect, useRef, useCallback } from 'react';

/**
 * Premium Landing Background - Liquid Gold Dots
 * Small, refined, liquid-like animation
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

    const deltaTime = currentTime - lastFrameTime.current;
    if (deltaTime < 16) {
      animationRef.current = requestAnimationFrame(animate);
      return;
    }
    lastFrameTime.current = currentTime;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    // Slow liquid time flow
    timeRef.current += 0.003;
    const time = timeRef.current;

    // Ultra smooth mouse tracking (liquid feel)
    mousePos.current.x += (targetMousePos.current.x - mousePos.current.x) * 0.06;
    mousePos.current.y += (targetMousePos.current.y - mousePos.current.y) * 0.06;

    // Pure black
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    const gridSize = 50;
    const mouseRadius = 180;
    const mouseRadiusSq = mouseRadius * mouseRadius;

    const cols = Math.ceil(width / gridSize) + 1;
    const rows = Math.ceil(height / gridSize) + 1;

    // Draw lines first
    ctx.globalCompositeOperation = 'lighter';

    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const x = i * gridSize;
        const y = j * gridSize;

        const dx = x - mousePos.current.x;
        const dy = y - mousePos.current.y;
        const distSq = dx * dx + dy * dy;

        // Liquid wave phase
        const phase = i * 0.4 + j * 0.3;
        const wave = Math.sin(phase + time * 0.6) * 0.5 + 0.5;

        let lineAlpha = 0.03 + 0.02 * wave;

        if (isMouseActive.current && distSq < mouseRadiusSq) {
          const t = 1 - Math.sqrt(distSq) / mouseRadius;
          const smooth = t * t * t;
          lineAlpha = 0.03 + 0.12 * smooth;
        }

        ctx.strokeStyle = `rgba(160, 130, 50, ${lineAlpha})`;
        ctx.lineWidth = 0.5;

        if (i < cols - 1) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + gridSize, y);
          ctx.stroke();
        }
        if (j < rows - 1) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + gridSize);
          ctx.stroke();
        }
      }
    }

    // Draw small liquid dots
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const x = i * gridSize;
        const y = j * gridSize;

        const dx = x - mousePos.current.x;
        const dy = y - mousePos.current.y;
        const distSq = dx * dx + dy * dy;

        // Liquid breathing - slow, organic
        const phase = i * 0.5 + j * 0.4;
        const liquidBreath = Math.sin(phase + time * 0.5) * 0.5 + 0.5;
        const liquidPulse = Math.sin(phase * 1.7 + time * 0.8) * 0.3 + 0.7;

        let alpha = 0.08 + 0.06 * liquidBreath * liquidPulse;
        let dotSize = 1.5;

        if (isMouseActive.current && distSq < mouseRadiusSq) {
          const t = 1 - Math.sqrt(distSq) / mouseRadius;
          // Liquid ease - cubic for smooth pooling effect
          const liquid = t * t * (3 - 2 * t);
          alpha = 0.08 + 0.5 * liquid;
          dotSize = 1.5 + 1.2 * liquid;
        }

        if (alpha < 0.02) continue;

        // Single soft glow (not multiple rings)
        ctx.fillStyle = `rgba(180, 150, 70, ${alpha * 0.4})`;
        ctx.beginPath();
        ctx.arc(x, y, dotSize + 2, 0, Math.PI * 2);
        ctx.fill();

        // Small liquid gold core
        ctx.fillStyle = `rgba(220, 190, 100, ${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, dotSize, 0, Math.PI * 2);
        ctx.fill();
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
