import React, { useEffect, useRef } from 'react';

interface Point {
  x: number;
  y: number;
  z: number;
  baseX: number;
  baseY: number;
  baseZ: number;
  vx: number;
  vy: number;
  vz: number;
}

interface Connection {
  from: number;
  to: number;
  strength: number;
  phase: number;
}

export const LiquidBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const pointsRef = useRef<Point[]>([]);
  const connectionsRef = useRef<Connection[]>([]);
  const timeRef = useRef(0);
  const mouseRef = useRef({ x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
      initGeometry();
    };

    const initGeometry = () => {
      const points: Point[] = [];
      const connections: Connection[] = [];

      // Create sacred geometry pattern - multiple layers
      const layers = 5;
      const pointsPerLayer = 12;
      const centerX = width / 2;
      const centerY = height / 2;

      // Central point
      points.push({
        x: centerX, y: centerY, z: 0,
        baseX: centerX, baseY: centerY, baseZ: 0,
        vx: 0, vy: 0, vz: 0
      });

      // Concentric rings with golden ratio spacing
      const phi = 1.618033988749;
      for (let layer = 1; layer <= layers; layer++) {
        const radius = (Math.min(width, height) * 0.08) * Math.pow(phi, layer - 1);
        const numPoints = pointsPerLayer + layer * 4;
        const zDepth = (layer - layers / 2) * 80;

        for (let i = 0; i < numPoints; i++) {
          const angle = (i / numPoints) * Math.PI * 2 + (layer * Math.PI / 6);
          const wobble = Math.sin(i * 3) * 15;
          const x = centerX + Math.cos(angle) * (radius + wobble);
          const y = centerY + Math.sin(angle) * (radius + wobble);

          points.push({
            x, y, z: zDepth,
            baseX: x, baseY: y, baseZ: zDepth,
            vx: 0, vy: 0, vz: 0
          });
        }
      }

      // Add floating geometric shapes in corners
      const corners = [
        { x: width * 0.15, y: height * 0.2 },
        { x: width * 0.85, y: height * 0.15 },
        { x: width * 0.1, y: height * 0.8 },
        { x: width * 0.9, y: height * 0.85 },
        { x: width * 0.5, y: height * 0.1 },
        { x: width * 0.5, y: height * 0.9 },
      ];

      corners.forEach((corner, ci) => {
        const shapePoints = 6;
        const shapeRadius = 60 + ci * 20;
        const zBase = (ci % 2 === 0 ? 1 : -1) * 100;

        for (let i = 0; i < shapePoints; i++) {
          const angle = (i / shapePoints) * Math.PI * 2;
          points.push({
            x: corner.x + Math.cos(angle) * shapeRadius,
            y: corner.y + Math.sin(angle) * shapeRadius,
            z: zBase,
            baseX: corner.x + Math.cos(angle) * shapeRadius,
            baseY: corner.y + Math.sin(angle) * shapeRadius,
            baseZ: zBase,
            vx: 0, vy: 0, vz: 0
          });
        }
      });

      // Create connections - sacred geometry style
      const numPoints = points.length;

      // Connect center to first ring
      const firstRingStart = 1;
      const firstRingEnd = pointsPerLayer + 5;
      for (let i = firstRingStart; i < firstRingEnd; i++) {
        connections.push({ from: 0, to: i, strength: 0.8, phase: i * 0.2 });
      }

      // Connect adjacent points in each ring
      let currentStart = 1;
      for (let layer = 1; layer <= layers; layer++) {
        const numInLayer = pointsPerLayer + layer * 4;
        for (let i = 0; i < numInLayer; i++) {
          const current = currentStart + i;
          const next = currentStart + ((i + 1) % numInLayer);
          connections.push({ from: current, to: next, strength: 0.6, phase: i * 0.1 + layer });
        }
        currentStart += numInLayer;
      }

      // Connect between layers (radial connections)
      currentStart = 1;
      for (let layer = 1; layer < layers; layer++) {
        const numInLayer = pointsPerLayer + layer * 4;
        const numInNextLayer = pointsPerLayer + (layer + 1) * 4;
        const nextStart = currentStart + numInLayer;

        for (let i = 0; i < numInLayer; i++) {
          const current = currentStart + i;
          const targetIndex = Math.floor((i / numInLayer) * numInNextLayer);
          const target = nextStart + targetIndex;
          if (target < numPoints) {
            connections.push({ from: current, to: target, strength: 0.4, phase: i * 0.15 });
          }
        }
        currentStart += numInLayer;
      }

      // Connect corner shapes
      const mainPatternEnd = currentStart;
      corners.forEach((_, ci) => {
        const shapeStart = mainPatternEnd + ci * 6;
        for (let i = 0; i < 6; i++) {
          const current = shapeStart + i;
          const next = shapeStart + ((i + 1) % 6);
          if (current < numPoints && next < numPoints) {
            connections.push({ from: current, to: next, strength: 0.5, phase: ci + i * 0.3 });
          }
          // Cross connections
          const opposite = shapeStart + ((i + 3) % 6);
          if (current < numPoints && opposite < numPoints) {
            connections.push({ from: current, to: opposite, strength: 0.25, phase: ci + i * 0.5 });
          }
        }
      });

      // Long-range elegant curves connecting distant points
      for (let i = 0; i < 20; i++) {
        const from = Math.floor(Math.random() * Math.min(numPoints, mainPatternEnd));
        const to = Math.floor(Math.random() * Math.min(numPoints, mainPatternEnd));
        if (from !== to) {
          connections.push({ from, to, strength: 0.15, phase: i * 0.7 });
        }
      }

      pointsRef.current = points;
      connectionsRef.current = connections;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.targetX = e.clientX / width;
      mouseRef.current.targetY = e.clientY / height;
    };

    const project = (x: number, y: number, z: number): { x: number; y: number; scale: number } => {
      const perspective = 1000;
      const scale = perspective / (perspective + z);
      const centerX = width / 2;
      const centerY = height / 2;
      return {
        x: centerX + (x - centerX) * scale,
        y: centerY + (y - centerY) * scale,
        scale
      };
    };

    const animate = () => {
      const points = pointsRef.current;
      const connections = connectionsRef.current;
      const time = timeRef.current;
      const mouse = mouseRef.current;

      // Smooth mouse interpolation
      mouse.x += (mouse.targetX - mouse.x) * 0.03;
      mouse.y += (mouse.targetY - mouse.y) * 0.03;

      // Clear with pure black
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      timeRef.current += 0.008;

      // Update points with fluid motion
      const mouseOffsetX = (mouse.x - 0.5) * 150;
      const mouseOffsetY = (mouse.y - 0.5) * 150;

      points.forEach((point, i) => {
        // Parallax based on z-depth
        const parallaxStrength = (point.baseZ + 200) / 400;
        const targetX = point.baseX + mouseOffsetX * parallaxStrength;
        const targetY = point.baseY + mouseOffsetY * parallaxStrength;

        // Organic floating motion
        const floatX = Math.sin(time * 0.5 + i * 0.1) * 8;
        const floatY = Math.cos(time * 0.4 + i * 0.15) * 8;
        const floatZ = Math.sin(time * 0.3 + i * 0.2) * 20;

        // Breathing effect
        const breathe = Math.sin(time * 0.2) * 0.02 + 1;
        const centerX = width / 2;
        const centerY = height / 2;
        const breatheX = centerX + (targetX - centerX) * breathe;
        const breatheY = centerY + (targetY - centerY) * breathe;

        // Smooth interpolation
        point.x += (breatheX + floatX - point.x) * 0.04;
        point.y += (breatheY + floatY - point.y) * 0.04;
        point.z += (point.baseZ + floatZ - point.z) * 0.04;
      });

      // Sort connections by z-depth for proper layering
      const sortedConnections = [...connections].sort((a, b) => {
        const zA = (points[a.from].z + points[a.to].z) / 2;
        const zB = (points[b.from].z + points[b.to].z) / 2;
        return zB - zA;
      });

      // Draw connections with premium quality
      sortedConnections.forEach(conn => {
        const p1 = points[conn.from];
        const p2 = points[conn.to];
        if (!p1 || !p2) return;

        const proj1 = project(p1.x, p1.y, p1.z);
        const proj2 = project(p2.x, p2.y, p2.z);

        // Calculate line properties
        const avgZ = (p1.z + p2.z) / 2;
        const depthFactor = (avgZ + 250) / 500;
        const avgScale = (proj1.scale + proj2.scale) / 2;

        // Distance from mouse (in normalized space)
        const midX = (proj1.x + proj2.x) / 2;
        const midY = (proj1.y + proj2.y) / 2;
        const mouseDist = Math.sqrt(
          Math.pow((midX / width) - mouse.x, 2) +
          Math.pow((midY / height) - mouse.y, 2)
        );

        // Glow intensity based on mouse proximity
        const maxDist = 0.35;
        const glowIntensity = Math.max(0, 1 - mouseDist / maxDist);
        const smoothGlow = Math.pow(glowIntensity, 2);

        // Animated pulse along line
        const pulse = (Math.sin(time * 2 + conn.phase) + 1) / 2;
        const flowPulse = (Math.sin(time * 3 + conn.phase * 2) + 1) / 2;

        // Base alpha with depth
        const baseAlpha = conn.strength * depthFactor * 0.4;
        const glowAlpha = smoothGlow * 0.7;
        const finalAlpha = Math.min(baseAlpha + glowAlpha + pulse * 0.05, 1);

        // Line width based on depth and glow
        const baseWidth = avgScale * (0.5 + conn.strength * 0.8);
        const glowWidth = smoothGlow * 2;
        const lineWidth = baseWidth + glowWidth;

        // Create bezier curve for smoother lines
        const dx = proj2.x - proj1.x;
        const dy = proj2.y - proj1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Control point offset for subtle curve
        const curveAmount = Math.sin(time + conn.phase) * Math.min(dist * 0.1, 20);
        const perpX = -dy / dist * curveAmount;
        const perpY = dx / dist * curveAmount;
        const cpX = (proj1.x + proj2.x) / 2 + perpX;
        const cpY = (proj1.y + proj2.y) / 2 + perpY;

        // Draw outer glow layers (when mouse is near)
        if (smoothGlow > 0.05) {
          // Outer glow
          ctx.beginPath();
          ctx.moveTo(proj1.x, proj1.y);
          ctx.quadraticCurveTo(cpX, cpY, proj2.x, proj2.y);
          ctx.strokeStyle = `rgba(250, 204, 21, ${smoothGlow * 0.08})`;
          ctx.lineWidth = lineWidth + 12;
          ctx.lineCap = 'round';
          ctx.stroke();

          // Mid glow
          ctx.beginPath();
          ctx.moveTo(proj1.x, proj1.y);
          ctx.quadraticCurveTo(cpX, cpY, proj2.x, proj2.y);
          ctx.strokeStyle = `rgba(250, 204, 21, ${smoothGlow * 0.15})`;
          ctx.lineWidth = lineWidth + 6;
          ctx.stroke();

          // Inner glow
          ctx.beginPath();
          ctx.moveTo(proj1.x, proj1.y);
          ctx.quadraticCurveTo(cpX, cpY, proj2.x, proj2.y);
          ctx.strokeStyle = `rgba(254, 240, 138, ${smoothGlow * 0.25})`;
          ctx.lineWidth = lineWidth + 3;
          ctx.stroke();
        }

        // Main line with gradient
        const gradient = ctx.createLinearGradient(proj1.x, proj1.y, proj2.x, proj2.y);

        if (smoothGlow > 0.1) {
          // Gold gradient for glowing lines
          const goldAlpha = finalAlpha;
          gradient.addColorStop(0, `rgba(250, 204, 21, ${goldAlpha * (0.4 + flowPulse * 0.2)})`);
          gradient.addColorStop(0.3 + flowPulse * 0.2, `rgba(254, 240, 138, ${goldAlpha * 0.9})`);
          gradient.addColorStop(0.5, `rgba(255, 251, 235, ${goldAlpha})`);
          gradient.addColorStop(0.7 - flowPulse * 0.2, `rgba(254, 240, 138, ${goldAlpha * 0.9})`);
          gradient.addColorStop(1, `rgba(250, 204, 21, ${goldAlpha * (0.4 + flowPulse * 0.2)})`);
        } else {
          // Subtle silver/white for ambient lines
          const silverAlpha = finalAlpha * 0.6;
          gradient.addColorStop(0, `rgba(255, 255, 255, ${silverAlpha * 0.3})`);
          gradient.addColorStop(0.5, `rgba(255, 255, 255, ${silverAlpha * 0.7})`);
          gradient.addColorStop(1, `rgba(255, 255, 255, ${silverAlpha * 0.3})`);
        }

        ctx.beginPath();
        ctx.moveTo(proj1.x, proj1.y);
        ctx.quadraticCurveTo(cpX, cpY, proj2.x, proj2.y);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = lineWidth;
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
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* Cinematic depth overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_50%,transparent_0%,rgba(0,0,0,0.15)_40%,rgba(0,0,0,0.5)_100%)]" />

      {/* Subtle film grain texture */}
      <div
        className="absolute inset-0 opacity-[0.015] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
        }}
      />

      {/* Premium ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1400px] h-[600px] bg-gradient-to-b from-yellow-400/[0.02] via-yellow-400/[0.01] to-transparent blur-[100px]" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1000px] h-[300px] bg-gradient-to-t from-yellow-400/[0.01] to-transparent blur-[80px]" />
    </div>
  );
};
