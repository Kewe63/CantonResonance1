import React, { useState, useRef, useEffect } from 'react';

interface Props {
  children: React.ReactNode;
  className?: string;
  intensity?: number;
}

export const DynamicLighting: React.FC<Props> = ({ children, className = '', intensity = 0.15 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ x: 50, y: 50, rx: 0, ry: 0 });
  const [isActive, setIsActive] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Calculate rotation (max 10 degrees)
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const dx = e.clientX - rect.left - centerX;
    const dy = e.clientY - rect.top - centerY;
    
    const ry = (dx / centerX) * 5; // Horizontal movement causes Y rotation
    const rx = -(dy / centerY) * 5; // Vertical movement causes X rotation

    setCoords({ x, y, rx, ry });
  };

  const handleMouseEnter = () => setIsActive(true);
  const handleMouseLeave = () => {
    setIsActive(false);
    setCoords(prev => ({ ...prev, rx: 0, ry: 0 }));
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative group perspective-1000 ${className}`}
      style={{
        '--lx': `${coords.x}%`,
        '--ly': `${coords.y}%`,
        '--rx': `${coords.rx}deg`,
        '--ry': `${coords.ry}deg`,
        '--light-opacity': isActive ? 1 : 0,
        '--intensity': intensity
      } as React.CSSProperties}
    >
      <div className="dynamic-lighting-surface transition-transform duration-200 ease-out preserve-3d" style={{ transform: 'rotateX(var(--rx)) rotateY(var(--ry))' }}>
        {children}
        <div 
          className="absolute inset-0 pointer-events-none rounded-[inherit] z-10 opacity-(--light-opacity) transition-opacity duration-500"
          style={{
            background: `radial-gradient(circle at var(--lx) var(--ly), rgba(200, 240, 90, var(--intensity)) 0%, transparent 80%)`
          }}
        />
        {/* Specular highlight (the 'sparkle') */}
        <div 
          className="absolute inset-0 pointer-events-none rounded-[inherit] z-20 opacity-(--light-opacity) transition-opacity duration-500 mix-blend-overlay"
          style={{
            background: `radial-gradient(circle at var(--lx) var(--ly), rgba(255, 255, 255, 0.6) 0%, transparent 15%)`
          }}
        />
        {/* Subtle shadow reaction */}
        <div 
          className="absolute inset-0 pointer-events-none rounded-[inherit] z-5 opacity-(--light-opacity) transition-opacity duration-500 mix-blend-multiply"
          style={{
            background: `radial-gradient(circle at calc(100% - var(--lx)) calc(100% - var(--ly)), transparent 0%, rgba(0,0,0,0.1) 100%)`
          }}
        />
      </div>
    </div>
  );
};
