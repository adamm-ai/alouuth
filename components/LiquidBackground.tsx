import React, { useEffect, useRef } from 'react';

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  connections: number[];
  pulsePhase: number;
  type: 'primary' | 'secondary' | 'accent';
}

interface Particle {
  x: number;
  y: number;
  targetNode: number;
  sourceNode: number;
  progress: number;
  speed: number;
  size: number;
}

export const LiquidBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const nodesRef = useRef<Node[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const timeRef = useRef(0);
  const mouseRef = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle resize
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(dpr, dpr);
      initNodes();
    };

    // Initialize nodes
    const initNodes = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const nodeCount = Math.floor((width * height) / 25000); // Density based on screen size
      const nodes: Node[] = [];

      for (let i = 0; i < nodeCount; i++) {
        const type = i < nodeCount * 0.15 ? 'primary' : i < nodeCount * 0.4 ? 'secondary' : 'accent';
        nodes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          radius: type === 'primary' ? 3 : type === 'secondary' ? 2 : 1.5,
          connections: [],
          pulsePhase: Math.random() * Math.PI * 2,
          type
        });
      }

      // Pre-calculate connections (for performance)
      const connectionDistance = Math.min(width, height) * 0.15;
      nodes.forEach((node, i) => {
        nodes.forEach((other, j) => {
          if (i !== j) {
            const dx = node.x - other.x;
            const dy = node.y - other.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < connectionDistance && node.connections.length < 4) {
              node.connections.push(j);
            }
          }
        });
      });

      nodesRef.current = nodes;

      // Initialize particles
      const particles: Particle[] = [];
      const particleCount = Math.floor(nodeCount * 0.4);
      for (let i = 0; i < particleCount; i++) {
        const sourceIdx = Math.floor(Math.random() * nodes.length);
        const source = nodes[sourceIdx];
        if (source.connections.length > 0) {
          const targetIdx = source.connections[Math.floor(Math.random() * source.connections.length)];
          particles.push({
            x: source.x,
            y: source.y,
            sourceNode: sourceIdx,
            targetNode: targetIdx,
            progress: Math.random(),
            speed: 0.002 + Math.random() * 0.003,
            size: 1 + Math.random() * 1.5
          });
        }
      }
      particlesRef.current = particles;
    };

    // Mouse tracking for interactive glow
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    // Animation loop
    const animate = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const nodes = nodesRef.current;
      const particles = particlesRef.current;
      const time = timeRef.current;
      const mouse = mouseRef.current;

      // Clear with fade effect for trails
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.fillRect(0, 0, width, height);

      // Update time
      timeRef.current += 0.016;

      // Update and draw nodes
      nodes.forEach((node, i) => {
        // Update position with subtle drift
        node.x += node.vx;
        node.y += node.vy;

        // Boundary bounce with padding
        const padding = 50;
        if (node.x < -padding) node.x = width + padding;
        if (node.x > width + padding) node.x = -padding;
        if (node.y < -padding) node.y = height + padding;
        if (node.y > height + padding) node.y = -padding;

        // Mouse interaction - subtle attraction
        const dx = mouse.x - node.x;
        const dy = mouse.y - node.y;
        const mouseDistance = Math.sqrt(dx * dx + dy * dy);
        if (mouseDistance < 200 && mouseDistance > 0) {
          const force = (200 - mouseDistance) / 200 * 0.02;
          node.vx += (dx / mouseDistance) * force;
          node.vy += (dy / mouseDistance) * force;
        }

        // Damping
        node.vx *= 0.99;
        node.vy *= 0.99;

        // Draw connections
        node.connections.forEach(j => {
          if (j > i) { // Only draw once per pair
            const other = nodes[j];
            const connDx = other.x - node.x;
            const connDy = other.y - node.y;
            const dist = Math.sqrt(connDx * connDx + connDy * connDy);
            const maxDist = Math.min(width, height) * 0.18;

            if (dist < maxDist) {
              const alpha = (1 - dist / maxDist) * 0.4;

              // Animated gradient along line
              const gradient = ctx.createLinearGradient(node.x, node.y, other.x, other.y);
              const pulseOffset = (Math.sin(time * 2 + node.pulsePhase) + 1) * 0.5;

              gradient.addColorStop(0, `rgba(250, 204, 21, ${alpha * 0.3})`);
              gradient.addColorStop(pulseOffset * 0.5, `rgba(250, 204, 21, ${alpha * 0.8})`);
              gradient.addColorStop(0.5, `rgba(254, 240, 138, ${alpha * 0.6})`);
              gradient.addColorStop(0.5 + pulseOffset * 0.5, `rgba(250, 204, 21, ${alpha * 0.8})`);
              gradient.addColorStop(1, `rgba(250, 204, 21, ${alpha * 0.3})`);

              ctx.beginPath();
              ctx.moveTo(node.x, node.y);
              ctx.lineTo(other.x, other.y);
              ctx.strokeStyle = gradient;
              ctx.lineWidth = node.type === 'primary' ? 1.2 : 0.8;
              ctx.stroke();
            }
          }
        });
      });

      // Draw nodes with glow
      nodes.forEach((node) => {
        const pulse = Math.sin(time * 3 + node.pulsePhase) * 0.3 + 0.7;
        const glowRadius = node.radius * (2 + pulse);

        // Outer glow
        const glowGradient = ctx.createRadialGradient(
          node.x, node.y, 0,
          node.x, node.y, glowRadius * 4
        );

        if (node.type === 'primary') {
          glowGradient.addColorStop(0, `rgba(250, 204, 21, ${0.6 * pulse})`);
          glowGradient.addColorStop(0.5, `rgba(250, 204, 21, ${0.2 * pulse})`);
          glowGradient.addColorStop(1, 'rgba(250, 204, 21, 0)');
        } else if (node.type === 'secondary') {
          glowGradient.addColorStop(0, `rgba(254, 240, 138, ${0.4 * pulse})`);
          glowGradient.addColorStop(0.5, `rgba(250, 204, 21, ${0.1 * pulse})`);
          glowGradient.addColorStop(1, 'rgba(250, 204, 21, 0)');
        } else {
          glowGradient.addColorStop(0, `rgba(255, 255, 255, ${0.3 * pulse})`);
          glowGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        }

        ctx.beginPath();
        ctx.arc(node.x, node.y, glowRadius * 4, 0, Math.PI * 2);
        ctx.fillStyle = glowGradient;
        ctx.fill();

        // Core node
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * pulse, 0, Math.PI * 2);

        if (node.type === 'primary') {
          ctx.fillStyle = `rgba(250, 204, 21, ${0.9 * pulse})`;
          ctx.shadowColor = 'rgba(250, 204, 21, 0.8)';
          ctx.shadowBlur = 10;
        } else if (node.type === 'secondary') {
          ctx.fillStyle = `rgba(254, 240, 138, ${0.7 * pulse})`;
          ctx.shadowColor = 'rgba(250, 204, 21, 0.5)';
          ctx.shadowBlur = 6;
        } else {
          ctx.fillStyle = `rgba(255, 255, 255, ${0.5 * pulse})`;
          ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
          ctx.shadowBlur = 4;
        }
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Update and draw particles flowing along connections
      particles.forEach(particle => {
        const source = nodes[particle.sourceNode];
        const target = nodes[particle.targetNode];

        if (!source || !target) return;

        // Update progress
        particle.progress += particle.speed;

        if (particle.progress >= 1) {
          // Move to next connection
          particle.progress = 0;
          particle.sourceNode = particle.targetNode;
          const newSource = nodes[particle.sourceNode];
          if (newSource.connections.length > 0) {
            particle.targetNode = newSource.connections[Math.floor(Math.random() * newSource.connections.length)];
          }
        }

        // Calculate position along line with easing
        const easeProgress = particle.progress;
        particle.x = source.x + (target.x - source.x) * easeProgress;
        particle.y = source.y + (target.y - source.y) * easeProgress;

        // Draw particle with trail
        const trailGradient = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, particle.size * 6
        );
        trailGradient.addColorStop(0, 'rgba(250, 204, 21, 0.9)');
        trailGradient.addColorStop(0.3, 'rgba(254, 240, 138, 0.4)');
        trailGradient.addColorStop(1, 'rgba(250, 204, 21, 0)');

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * 6, 0, Math.PI * 2);
        ctx.fillStyle = trailGradient;
        ctx.fill();

        // Bright core
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fill();
      });

      // Draw mouse interaction glow
      if (mouse.x > 0 && mouse.y > 0) {
        const mouseGlow = ctx.createRadialGradient(
          mouse.x, mouse.y, 0,
          mouse.x, mouse.y, 150
        );
        mouseGlow.addColorStop(0, 'rgba(250, 204, 21, 0.03)');
        mouseGlow.addColorStop(0.5, 'rgba(250, 204, 21, 0.01)');
        mouseGlow.addColorStop(1, 'rgba(250, 204, 21, 0)');

        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 150, 0, Math.PI * 2);
        ctx.fillStyle = mouseGlow;
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    // Initialize
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);

    // Start animation
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
      {/* Main canvas for network */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />

      {/* Radial gradient overlay for depth */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.3)_50%,rgba(0,0,0,0.7)_100%)]" />

      {/* Subtle vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.4)_100%)]" />

      {/* Top ambient light */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-yellow-400/[0.02] to-transparent blur-3xl" />

      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-gradient-to-br from-yellow-400/[0.03] to-transparent blur-3xl" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-gradient-to-tl from-yellow-400/[0.02] to-transparent blur-3xl" />
    </div>
  );
};
