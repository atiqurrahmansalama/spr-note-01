import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CustomButton, useToast } from '@repo/ui';
import {
  ArrowRightIcon,
  ExpandScreenIcon,
  LockIcon,
  MinimizeScreenIcon,
} from '../../../components/icons/UniverseIcons';
import type { UniverseModuleItem } from '../../../types';
import { useUniverseTranslation } from '../locales';
import { buildPlanetSpecs, useUniverseThreeScene } from '../three/useUniverseThreeScene';
import { UniverseCameraRail } from './hud/UniverseCameraRail';
import { PlanetInspectorDock } from './hud/PlanetInspectorDock';

export interface HolographicUniverseStageProps {
  modules: UniverseModuleItem[];
  visitedKeys: string[];
  isOwner: boolean;
}

/**
 * Fullscreen-First WebGL 3D Holographic Planetary Universe Stage.
 * Opens directly in edge-to-edge viewport fullscreen without HUD boxes cluttering the cosmos;
 * users can minimize anytime (top-right button or Escape) to browse the cards and tools below.
 */
export const HolographicUniverseStage: React.FC<HolographicUniverseStageProps> = ({
  modules,
  visitedKeys,
  isOwner,
}) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { t } = useUniverseTranslation();

  const [isFullscreen, setIsFullscreen] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'3d' | 'cards'>('3d');
  const [autoRotate, setAutoRotate] = useState(true);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!isFullscreen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isFullscreen]);

  const planetSpecs = useMemo(
    () =>
      buildPlanetSpecs(
        modules,
        visitedKeys,
        isOwner,
        (key, fallback) => t(`map.planets.${key}.name`, fallback),
        (key, fallback) => t(`map.planets.${key}.tagline`, fallback)
      ),
    [modules, visitedKeys, isOwner, t]
  );

  const handleEnterPlanet = useCallback(
    (moduleKey: string) => {
      const target = planetSpecs.find((p) => p.moduleKey === moduleKey);
      if (!target) return;
      if (!target.isEnabled && !isOwner) {
        showToast(t('map.comingSoonToast', 'This world is coming soon in the next phase.'), 'info');
        return;
      }
      if (target.isLocked && !isOwner) {
        showToast(
          t('map.lockedToast', 'This planet is sealed for now. Ask the Universe Owner to unlock it.'),
          'warning'
        );
        return;
      }
      setIsFullscreen(false);
      navigate(target.routePath);
    },
    [planetSpecs, isOwner, showToast, t, navigate]
  );

  const { containerRef, webglReady, resetCamera, zoomBy, setAutoRotate: syncAutoRotate } =
    useUniverseThreeScene(
      planetSpecs,
      {
        onHoverPlanet: setHoveredKey,
        onSelectPlanet: setSelectedKey,
        onEnterPlanet: handleEnterPlanet,
      },
      viewMode === '3d'
    );

  const activeKey = hoveredKey || selectedKey;
  const activePlanet = useMemo(
    () => planetSpecs.find((p) => p.moduleKey === activeKey) || null,
    [planetSpecs, activeKey]
  );

  const handleToggleAutoRotate = () => {
    const next = !autoRotate;
    setAutoRotate(next);
    syncAutoRotate(next);
  };

  return (
    <section
      className={
        isFullscreen && viewMode === '3d'
          ? 'fixed inset-0 z-50 w-screen h-screen overflow-hidden theme-text-primary'
          : '@container relative w-full rounded-3xl overflow-hidden border-0 shadow-xl theme-text-primary'
      }
      style={{
        backgroundColor: 'var(--bg-app)',
        backgroundImage: [
          'radial-gradient(ellipse at 50% 48%, color-mix(in srgb, var(--color-warning) 15%, transparent) 0%, transparent 44%)',
          'radial-gradient(circle at 18% 22%, color-mix(in srgb, var(--color-info) 22%, transparent) 0%, transparent 52%)',
          'radial-gradient(circle at 84% 78%, color-mix(in srgb, var(--accent-main) 18%, transparent) 0%, transparent 50%)',
          'linear-gradient(180deg, color-mix(in srgb, var(--color-purple) 14%, var(--bg-app)) 0%, var(--bg-app) 56%, color-mix(in srgb, var(--color-info) 12%, var(--bg-app)) 100%)',
        ].join(', '),
      }}
    >
      {viewMode === '3d' ? (
        <div
          className={
            isFullscreen
              ? 'relative w-full h-full'
              : 'relative w-full h-[410px] @[640px]:h-[520px] @[960px]:h-[580px]'
          }
        >
          {/* Real-Time Three.js WebGL Canvas Mount */}
          <div ref={containerRef} className="absolute inset-0 w-full h-full" />

          {/* WebGL Unavailable Graceful Fallback Banner */}
          {!webglReady && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center gap-3 theme-bg-surface/85 backdrop-blur-md">
              <p className="text-sm font-bold theme-text-primary">
                {t('map.title', 'Interactive Love Map')}
              </p>
              <CustomButton
                size="sm"
                variant="primary"
                onClick={() => {
                  setIsFullscreen(false);
                  setViewMode('cards');
                }}
              >
                {t('map.viewModeGrid', 'All Worlds')}
              </CustomButton>
            </div>
          )}

          {/* Top-Right Minimal Fullscreen / Minimize Switch */}
          <div className="absolute top-4 end-4 sm:top-6 sm:end-6 z-20 flex items-center gap-2">
            <CustomButton
              size="sm"
              variant="soft"
              icon={isFullscreen ? MinimizeScreenIcon : ExpandScreenIcon}
              onClick={() => setIsFullscreen((prev) => !prev)}
              className="backdrop-blur-xl shadow-lg"
            >
              {isFullscreen
                ? t('map.hudExitFullscreen', 'Minimize & Explore Below')
                : t('map.hudExpandFullscreen', 'Fullscreen 3D')}
            </CustomButton>
          </div>

          {/* Bottom-Left Compact Camera Control Rail */}
          <div className="absolute bottom-4 start-4 sm:bottom-6 sm:start-6 z-20">
            <UniverseCameraRail
              viewMode={viewMode}
              autoRotate={autoRotate}
              onZoomIn={() => zoomBy(0.82)}
              onZoomOut={() => zoomBy(1.22)}
              onResetCamera={() => {
                setSelectedKey(null);
                resetCamera();
              }}
              onToggleAutoRotate={handleToggleAutoRotate}
              onToggleViewMode={(next) => {
                if (next === 'cards') setIsFullscreen(false);
                setViewMode(next);
              }}
            />
          </div>

          {/* Bottom-Center Subtle Planet Action Dock (Only highlights hovered/focused planet) */}
          <div className="hidden sm:flex absolute bottom-5 left-1/2 -translate-x-1/2 z-20 px-4 w-full justify-center pointer-events-none">
            <div className="pointer-events-auto w-full flex justify-center">
              <PlanetInspectorDock planet={activePlanet} onEnterPlanet={handleEnterPlanet} />
            </div>
          </div>
        </div>
      ) : (
        <div className="p-5 @[640px]:p-7 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold theme-text-primary">
                {t('map.title', 'Interactive Love Map')}
              </h2>
              <p className="text-xs theme-text-secondary">
                {t('map.subtitle', 'Select any luminous planet or portal to step into its world.')}
              </p>
            </div>
            <CustomButton
              size="xs"
              variant="soft"
              icon={ExpandScreenIcon}
              onClick={() => {
                setViewMode('3d');
                setIsFullscreen(true);
              }}
            >
              {t('map.hudExpandFullscreen', 'Fullscreen 3D')}
            </CustomButton>
          </div>

          <div className="grid grid-cols-1 @[500px]:grid-cols-2 @[880px]:grid-cols-4 gap-3.5">
            {planetSpecs.map((planet) => (
              <div
                key={planet.moduleKey}
                className="p-4 rounded-2xl theme-bg-surface/90 flex flex-col justify-between gap-3 border-0 shadow-xs"
              >
                <div className="space-y-1">
                  <div className="text-sm font-bold theme-text-primary">{planet.title}</div>
                  <p className="text-xs theme-text-secondary line-clamp-2">{planet.tagline}</p>
                </div>
                <CustomButton
                  size="xs"
                  fullWidth
                  variant={planet.canEnter ? 'soft' : 'app'}
                  icon={planet.canEnter ? undefined : LockIcon}
                  iconRight={planet.canEnter ? ArrowRightIcon : undefined}
                  onClick={() => handleEnterPlanet(planet.moduleKey)}
                >
                  {planet.canEnter
                    ? t('map.enterPlanet', 'Enter World')
                    : planet.isEnabled
                      ? t('map.lockedLabel', 'Locked')
                      : t('map.comingSoonLabel', 'Coming Soon')}
                </CustomButton>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default HolographicUniverseStage;
