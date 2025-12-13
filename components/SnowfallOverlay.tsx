
import React, { useMemo } from 'react';

export const SnowfallOverlay: React.FC<{ intensity?: 'normal' | 'storm' }> = ({ intensity = 'normal' }) => {
  const count = intensity === 'storm' ? 400 : 150;
  
  // Create fixed number of snowflakes with random properties for performance
  const snowflakes = useMemo(() => Array.from({ length: count }).map((_, i) => ({
    left: Math.random() * 100,
    animationDuration: (intensity === 'storm' ? 1 : 3) + Math.random() * (intensity === 'storm' ? 2 : 7), // Faster in storm
    animationDelay: -(Math.random() * 10), // Start instantly at different cycles
    size: (intensity === 'storm' ? 1 : 2) + Math.random() * (intensity === 'storm' ? 4 : 3),
    opacity: (intensity === 'storm' ? 0.6 : 0.4) + Math.random() * 0.4
  })), [intensity, count]);

  return (
    <div className={`absolute inset-0 z-[1500] pointer-events-none overflow-hidden ${intensity === 'storm' ? 'backdrop-blur-[2px]' : ''}`}>
      {snowflakes.map((flake, i) => (
        <div
          key={i}
          className="absolute bg-white rounded-full"
          style={{
            left: `${flake.left}%`,
            top: `-10px`,
            width: `${flake.size}px`,
            height: `${flake.size}px`,
            opacity: flake.opacity,
            animation: `snowfall ${flake.animationDuration}s linear infinite`,
            animationDelay: `${flake.animationDelay}s`,
            filter: intensity === 'storm' ? 'blur(1px)' : 'blur(0.5px)'
          }}
        />
      ))}
    </div>
  );
};
