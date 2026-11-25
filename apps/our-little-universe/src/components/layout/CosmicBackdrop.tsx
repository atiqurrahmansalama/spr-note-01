import React, { useMemo } from 'react';
import { HeartIcon } from '../icons/UniverseIcons';

/**
 * CosmicBackdrop
 * Theme-driven romantic starlit and floating-heart atmosphere.
 * Consumes 100% semantic CSS variables (--olu-glow, --olu-glow-secondary, --olu-heart-tint).
 */
export const CosmicBackdrop: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const stars = useMemo(
    () =>
      Array.from({ length: 38 }).map((_, i) => ({
        id: i,
        top: `${(i * 19.3) % 100}%`,
        left: `${(i * 29.7) % 100}%`,
        size: `${(i % 3) + 1.5}px`,
        delay: `${(i % 5) * 0.7}s`,
        duration: `${3 + (i % 4)}s`,
        opacity: 0.16 + (i % 5) * 0.1,
      })),
    []
  );

  const floatingHearts = useMemo(
    () =>
      Array.from({ length: 10 }).map((_, i) => ({
        id: i,
        top: `${10 + ((i * 23) % 80)}%`,
        left: `${6 + ((i * 31) % 88)}%`,
        sizeClass: i % 3 === 0 ? 'w-5 h-5' : i % 2 === 0 ? 'w-4 h-4' : 'w-3 h-3',
        delay: `${(i % 4) * 1.1}s`,
        duration: `${5.5 + (i % 4) * 1.2}s`,
      })),
    []
  );

  return (
    <div className="relative h-screen w-full overflow-hidden theme-bg-app theme-text-primary flex flex-col">
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Romantic Ambient Nebula Aura */}
        <div
          className="absolute -top-36 -left-28 w-[28rem] h-[28rem] rounded-full blur-3xl opacity-75"
          style={{ backgroundColor: 'var(--olu-glow)' }}
        />
        <div
          className="absolute top-1/3 -right-32 w-[26rem] h-[26rem] rounded-full blur-3xl opacity-65"
          style={{ backgroundColor: 'var(--olu-glow-secondary)' }}
        />
        <div
          className="absolute -bottom-36 left-1/4 w-[28rem] h-[28rem] rounded-full blur-3xl opacity-55"
          style={{ backgroundColor: 'var(--olu-glow)' }}
        />

        {/* Twinkling Starlight */}
        {stars.map((s) => (
          <div
            key={s.id}
            className="absolute rounded-full bg-[var(--text-primary)] transition-opacity"
            style={{
              top: s.top,
              left: s.left,
              width: s.size,
              height: s.size,
              opacity: s.opacity,
              animation: `cosmicTwinkle ${s.duration} ease-in-out infinite`,
              animationDelay: s.delay,
            }}
          />
        ))}

        {/* Drifting Ambient Heart Silhouettes */}
        {floatingHearts.map((h) => (
          <div
            key={h.id}
            className="absolute"
            style={{
              top: h.top,
              left: h.left,
              color: 'var(--olu-heart-tint)',
              animation: `loveDrift ${h.duration} ease-in-out infinite`,
              animationDelay: h.delay,
            }}
          >
            <HeartIcon className={h.sizeClass} />
          </div>
        ))}
      </div>

      <div className="relative z-10 flex-1 flex flex-col min-h-0">{children}</div>
    </div>
  );
};

export default CosmicBackdrop;
