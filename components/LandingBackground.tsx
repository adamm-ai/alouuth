import React, { useEffect, useRef, useCallback } from 'react';

/**
 * Premium 4K Landing Background - Intelligence Network
 *
 * Neuromarketing Design Principles:
 * - Precision dots convey accuracy and intelligence
 * - Subtle luminance suggests active thinking
 * - Network connections imply knowledge interconnection
 * - Smooth animations create subconscious trust
 * - High-quality rendering signals premium brand
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

    // High quality 4K rendering context
    const ctx = canvas.getContext('2d', {
      alpha: false,
      desynchronized: true
    });
    if (!ctx) return;

    // 60fps lock
    const deltaTime = currentTime - lastFrameTime.current;
    if (deltaTime < 16.67) {
      animationRef.current = requestAnimationFrame(animate);
      return;
    }
    lastFrameTime.current = currentTime;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    // Slow, intelligent time flow
    timeRef.current += 0.002;
    const time = timeRef.current;

    // Silky mouse interpolation (intelligence feels smooth)
    mousePos.current.x += (targetMousePos.current.x - mousePos.current.x) * 0.05;
    mousePos.current.y += (targetMousePos.current.y - mousePos.current.y) * 0.05;

    // Deep intelligent black
    ctx.fillStyle = '#020202';
    ctx.fillRect(0, 0, width, height);

    // High quality anti-aliasing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const gridSize = 52;
    const mouseRadius = 200;
    const mouseRadiusSq = mouseRadius * mouseRadius;

    const cols = Math.ceil(width / gridSize) + 1;
    const rows = Math.ceil(height / gridSize) + 1;

    // Subtle global intelligence pulse (like a thinking brain)
    const intelligencePulse = 0.5 + 0.5 * Math.sin(time * 0.3);

    ctx.globalCompositeOperation = 'lighter';

    // PASS 1: Draw precise connection lines (neural network feel)
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const x = i * gridSize;
        const y = j * gridSize;

        const dx = x - mousePos.current.x;
        const dy = y - mousePos.current.y;
        const distSq = dx * dx + dy * dy;

        // Intelligent wave propagation (like thought patterns)
        const phase = (i * 0.3 + j * 0.4) * Math.PI;
        const thoughtWave = Math.sin(phase + time * 0.4) * 0.5 + 0.5;

        // Base: barely visible, suggests latent intelligence
        let lineAlpha = 0.025 + 0.015 * thoughtWave * intelligencePulse;

        // Mouse proximity: awakened intelligence
        if (isMouseActive.current && distSq < mouseRadiusSq) {
          const dist = Math.sqrt(distSq);
          const t = 1 - dist / mouseRadius;
          // Smooth quartic ease - feels intelligent, not mechanical
          const ease = t * t * t * t;
          lineAlpha = Math.max(lineAlpha, 0.08 * ease);
        }

        if (lineAlpha < 0.01) continue;

        // Crisp, precise lines (intelligence = precision)
        ctx.strokeStyle = `rgba(140, 115, 55, ${lineAlpha})`;
        ctx.lineWidth = 0.6;
        ctx.lineCap = 'round';

        // Horizontal connection
        if (i < cols - 1) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + gridSize, y);
          ctx.stroke();
        }

        // Vertical connection
        if (j < rows - 1) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + gridSize);
          ctx.stroke();
        }
      }
    }

    // PASS 2: Draw high-quality precision dots (nodes of intelligence)
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const x = i * gridSize;
        const y = j * gridSize;

        const dx = x - mousePos.current.x;
        const dy = y - mousePos.current.y;
        const distSq = dx * dx + dy * dy;

        // Multi-layer thought patterns (complex intelligence)
        const phase1 = (i * 0.4 + j * 0.3) * Math.PI;
        const phase2 = (i * 0.2 + j * 0.5) * Math.PI * 1.3;

        const thought1 = Math.sin(phase1 + time * 0.35) * 0.5 + 0.5;
        const thought2 = Math.sin(phase2 + time * 0.55) * 0.3 + 0.7;
        const combinedThought = thought1 * thought2;

        // Base luminance: subtle presence, latent intelligence
        let luminance = 0.06 + 0.04 * combinedThought * intelligencePulse;
        let dotRadius = 1.1;

        // Mouse proximity: activated intelligence node
        if (isMouseActive.current && distSq < mouseRadiusSq) {
          const dist = Math.sqrt(distSq);
          const t = 1 - dist / mouseRadius;
          // Quintic ease for premium, intelligent feel
          const ease = t * t * t * (t * (t * 6 - 15) + 10);
          luminance = 0.06 + 0.45 * ease;
          dotRadius = 1.1 + 0.9 * ease;
        }

        if (luminance < 0.02) continue;

        // LAYER 1: Subtle ambient luminance (intelligence aura)
        // Not a glow - a refined luminance field
        const ambientRadius = dotRadius * 3;
        const ambientAlpha = luminance * 0.12;
        ctx.fillStyle = `rgba(160, 135, 70, ${ambientAlpha})`;
        ctx.beginPath();
        ctx.arc(x, y, ambientRadius, 0, Math.PI * 2);
        ctx.fill();

        // LAYER 2: Inner luminance (focused intelligence)
        const innerRadius = dotRadius * 1.8;
        const innerAlpha = luminance * 0.25;
        ctx.fillStyle = `rgba(185, 160, 90, ${innerAlpha})`;
        ctx.beginPath();
        ctx.arc(x, y, innerRadius, 0, Math.PI * 2);
        ctx.fill();

        // LAYER 3: Precision core (the intelligence itself)
        // Warm gold-white: inviting yet sophisticated
        const coreAlpha = luminance * 0.9;
        ctx.fillStyle = `rgba(235, 215, 160, ${coreAlpha})`;
        ctx.beginPath();
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
        ctx.fill();

        // LAYER 4: Crisp center point (peak intelligence)
        // Only visible on brighter nodes - creates hierarchy
        if (luminance > 0.2) {
          const peakAlpha = Math.min((luminance - 0.2) * 2, 0.7);
          const peakRadius = dotRadius * 0.5;
          ctx.fillStyle = `rgba(255, 250, 235, ${peakAlpha})`;
          ctx.beginPath();
          ctx.arc(x, y, peakRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ctx.globalCompositeOperation = 'source-over';
    animationRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', {
      alpha: false,
      desynchronized: true
    });
    if (!ctx) return;

    const resize = () => {
      // Support up to 3x DPI for 4K+ displays
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const width = window.innerWidth;
      const height = window.innerHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Enable high-quality rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
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

    // Start animation
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
      <div className="absolute inset-0 bg-[#020202]" />
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
