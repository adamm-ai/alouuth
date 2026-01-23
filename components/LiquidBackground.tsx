import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export const LiquidBackground: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = window.innerWidth;
    const height = window.innerHeight;

    svg.attr('width', width).attr('height', height);

    // Yellow / Gold / White Palette
    const colors = ['#FACC15', '#FEF08A', '#FFFFFF', '#404040', '#CA8A04'];

    // Create blobs
    const blobs = d3.range(5).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 100 + 50,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      color: colors[Math.floor(Math.random() * colors.length)]
    }));

    const circleGroup = svg.append('g').style('filter', 'blur(60px)');

    const circles = circleGroup.selectAll('circle')
      .data(blobs)
      .enter()
      .append('circle')
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('r', d => d.r)
      .attr('fill', d => d.color)
      .attr('opacity', 0.3); // Slightly lower opacity for yellow intensity

    const animate = () => {
      blobs.forEach(blob => {
        blob.x += blob.vx;
        blob.y += blob.vy;

        // Bounce off walls
        if (blob.x < -100 || blob.x > width + 100) blob.vx *= -1;
        if (blob.y < -100 || blob.y > height + 100) blob.vy *= -1;
      });

      circles
        .attr('cx', d => d.x)
        .attr('cy', d => d.y);

      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      svg.selectAll('*').remove();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-black">
      <svg ref={svgRef} className="w-full h-full opacity-50" />
      <div className="absolute inset-0 bg-black/60" /> {/* Overlay to darken */}
    </div>
  );
};