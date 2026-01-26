import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export const LiquidBackground: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Noise texture for premium glass effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 200;
    const height = 200;
    canvas.width = width;
    canvas.height = height;

    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const value = Math.random() * 255;
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
      data[i + 3] = 15; // Very subtle opacity
    }

    ctx.putImageData(imageData, 0, 0);
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = window.innerWidth;
    const height = window.innerHeight;

    svg.attr('width', width).attr('height', height);

    // Premium gold/amber palette with subtle variations
    const colors = [
      '#FACC15', // Primary gold
      '#FEF08A', // Light gold
      '#F59E0B', // Amber
      '#FBBF24', // Warm gold
      '#FFFFFF', // Pure white accent
      '#1a1a1a', // Subtle dark for depth
      '#CA8A04', // Deep gold
      '#FDE68A', // Soft cream
    ];

    // Create more blobs for richer effect
    const blobs = d3.range(12).map((_, i) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 180 + 80, // Larger blobs
      vx: (Math.random() - 0.5) * 0.3, // Slower, more elegant movement
      vy: (Math.random() - 0.5) * 0.3,
      color: colors[i % colors.length],
      opacity: 0.15 + Math.random() * 0.15, // Varied opacity
      blur: 60 + Math.random() * 40, // Varied blur for depth
      phase: Math.random() * Math.PI * 2, // For subtle pulsing
    }));

    // Create filter for each blur level
    const defs = svg.append('defs');

    // Glow filter
    const glowFilter = defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');

    glowFilter.append('feGaussianBlur')
      .attr('stdDeviation', '20')
      .attr('result', 'coloredBlur');

    const glowMerge = glowFilter.append('feMerge');
    glowMerge.append('feMergeNode').attr('in', 'coloredBlur');
    glowMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Main blob group with heavy blur
    const circleGroup = svg.append('g')
      .style('filter', 'blur(80px)');

    const circles = circleGroup.selectAll('circle')
      .data(blobs)
      .enter()
      .append('circle')
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('r', d => d.r)
      .attr('fill', d => d.color)
      .attr('opacity', d => d.opacity);

    // Secondary layer for depth - smaller, faster blobs
    const secondaryBlobs = d3.range(8).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 60 + 30,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      color: colors[Math.floor(Math.random() * 3)], // Only gold tones
      opacity: 0.1 + Math.random() * 0.1,
    }));

    const secondaryGroup = svg.append('g')
      .style('filter', 'blur(40px)');

    const secondaryCircles = secondaryGroup.selectAll('circle')
      .data(secondaryBlobs)
      .enter()
      .append('circle')
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('r', d => d.r)
      .attr('fill', d => d.color)
      .attr('opacity', d => d.opacity);

    // Accent highlights - small, bright spots
    const highlights = d3.range(5).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 20 + 10,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2,
    }));

    const highlightGroup = svg.append('g')
      .style('filter', 'blur(20px)');

    const highlightCircles = highlightGroup.selectAll('circle')
      .data(highlights)
      .enter()
      .append('circle')
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('r', d => d.r)
      .attr('fill', '#FACC15')
      .attr('opacity', 0.3);

    let time = 0;
    const animate = () => {
      time += 0.005;

      // Animate main blobs with subtle pulsing
      blobs.forEach((blob, i) => {
        blob.x += blob.vx;
        blob.y += blob.vy;

        // Soft bounce with damping
        if (blob.x < -150 || blob.x > width + 150) blob.vx *= -0.98;
        if (blob.y < -150 || blob.y > height + 150) blob.vy *= -0.98;

        // Subtle radius pulsing for organic feel
        const pulseScale = 1 + Math.sin(time + blob.phase) * 0.05;
        circles.filter((_, j) => j === i)
          .attr('cx', blob.x)
          .attr('cy', blob.y)
          .attr('r', blob.r * pulseScale);
      });

      // Animate secondary blobs
      secondaryBlobs.forEach((blob, i) => {
        blob.x += blob.vx;
        blob.y += blob.vy;
        if (blob.x < -100 || blob.x > width + 100) blob.vx *= -1;
        if (blob.y < -100 || blob.y > height + 100) blob.vy *= -1;
      });

      secondaryCircles
        .attr('cx', d => d.x)
        .attr('cy', d => d.y);

      // Animate highlights with floating effect
      highlights.forEach((h, i) => {
        h.x += h.vx + Math.sin(time * 2 + i) * 0.3;
        h.y += h.vy + Math.cos(time * 2 + i) * 0.3;
        if (h.x < -50 || h.x > width + 50) h.vx *= -1;
        if (h.y < -50 || h.y > height + 50) h.vy *= -1;
      });

      highlightCircles
        .attr('cx', d => d.x)
        .attr('cy', d => d.y)
        .attr('opacity', d => 0.2 + Math.sin(time * 3) * 0.1);

      requestAnimationFrame(animate);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;
      svg.attr('width', newWidth).attr('height', newHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      svg.selectAll('*').remove();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-black">
      {/* Main animated blobs */}
      <svg ref={svgRef} className="w-full h-full opacity-60" />

      {/* Noise texture overlay for premium glass feel */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full opacity-[0.03] pointer-events-none mix-blend-overlay"
        style={{ imageRendering: 'pixelated' }}
      />

      {/* Radial gradient overlay for depth */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.4)_70%,rgba(0,0,0,0.8)_100%)]" />

      {/* Subtle vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,transparent_50%,rgba(0,0,0,0.5)_100%)]" />

      {/* Top light source accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-yellow-400/[0.03] to-transparent blur-3xl" />
    </div>
  );
};
