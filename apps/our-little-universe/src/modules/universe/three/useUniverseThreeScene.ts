import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppTheme } from '@repo/ui';
import type { UniverseModuleItem } from '../../../types';
import { UniverseSceneManager } from './UniverseSceneManager';
import type { PlanetNodeSpec, PlanetSurfaceStyle, UniverseSceneCallbacks } from './types';

interface PlanetOrbitPreset {
  position: [number, number, number];
  radius: number;
  hasRing?: boolean;
  surfaceStyle: PlanetSurfaceStyle;
}

/**
 * Widely spaced Solar System layout with ONLY `dreams` carrying a Saturn-style icy ring.
 */
const PLANET_3D_LAYOUT: Record<string, PlanetOrbitPreset> = {
  story: { position: [-7.4, 0.85, 5.2], radius: 1.0, surfaceStyle: 'rose' },
  memories: { position: [-4.0, 1.5, -6.6], radius: 0.88, surfaceStyle: 'ocean' },
  letters: { position: [5.0, 1.45, -5.8], radius: 0.84, surfaceStyle: 'amethyst' },
  garden: { position: [-10.4, 0.35, -2.0], radius: 0.82, surfaceStyle: 'emerald' },
  games: { position: [8.4, 1.05, 3.8], radius: 0.86, surfaceStyle: 'amber' },
  secrets: { position: [10.6, 0.55, -3.4], radius: 0.8, surfaceStyle: 'crystal' },
  dreams: { position: [-0.8, 1.15, 8.6], radius: 0.94, hasRing: true, surfaceStyle: 'dream' },
  'night-sky': { position: [1.0, 1.85, -9.8], radius: 0.88, surfaceStyle: 'nebula' },
  gifts: { position: [4.8, 0.45, 7.6], radius: 0.72, surfaceStyle: 'amber' },
};

export function checkWebGLSupport(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

export function buildPlanetSpecs(
  modules: UniverseModuleItem[],
  visitedKeys: string[],
  isOwner: boolean,
  translateName: (key: string, fallback: string) => string,
  translateTagline: (key: string, fallback: string) => string
): PlanetNodeSpec[] {
  const worlds = modules.filter(
    (m) => m.module_key !== 'welcome' && m.module_key !== 'dashboard'
  );

  return worlds.map((mod, idx) => {
    const fallbackAngle = (idx / Math.max(1, worlds.length)) * Math.PI * 2;
    const preset = PLANET_3D_LAYOUT[mod.module_key] || {
      position: [Math.cos(fallbackAngle) * 7.8, 0.9, Math.sin(fallbackAngle) * 7.8] as [number, number, number],
      radius: 0.78,
      surfaceStyle: 'nebula' as PlanetSurfaceStyle,
    };
    const isVisited = visitedKeys.includes(mod.module_key);
    const canEnter = Boolean(isOwner || (mod.is_enabled && !mod.is_locked));

    return {
      moduleKey: mod.module_key,
      iconName: mod.icon_name,
      title: translateName(mod.module_key, mod.title),
      tagline: translateTagline(mod.module_key, mod.subtitle),
      routePath: mod.route_path,
      badgeText: mod.badge_text,
      isEnabled: mod.is_enabled,
      isLocked: mod.is_locked,
      isVisited,
      canEnter,
      position: preset.position,
      radius: preset.radius,
      hasRing: preset.hasRing,
      surfaceStyle: preset.surfaceStyle,
      starsLevel: isVisited ? 3 : canEnter ? 1 : 0,
    };
  });
}

export function useUniverseThreeScene(
  specs: PlanetNodeSpec[],
  callbacks: UniverseSceneCallbacks,
  enabled: boolean
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const managerRef = useRef<UniverseSceneManager | null>(null);
  const callbacksRef = useRef<UniverseSceneCallbacks>(callbacks);
  callbacksRef.current = callbacks;

  const { paletteId, mode } = useAppTheme();
  const prevThemeRef = useRef<string>(`${paletteId}:${mode}`);
  const prevSpecsKeyRef = useRef<string>('');
  const [webglSupported] = useState<boolean>(() => checkWebGLSupport());
  const [webglFailed, setWebglFailed] = useState(false);

  const reducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    []
  );

  const specsSignature = useMemo(
    () => specs.map((s) => `${s.moduleKey}:${s.title}:${s.canEnter}`).join('|'),
    [specs]
  );

  useEffect(() => {
    if (!enabled || !webglSupported || !containerRef.current) return;

    try {
      const manager = new UniverseSceneManager(
        containerRef.current,
        specs,
        {
          onHoverPlanet: (k) => callbacksRef.current.onHoverPlanet?.(k),
          onSelectPlanet: (k) => callbacksRef.current.onSelectPlanet?.(k),
          onEnterPlanet: (k) => callbacksRef.current.onEnterPlanet?.(k),
        },
        reducedMotion
      );
      managerRef.current = manager;
      prevSpecsKeyRef.current = specsSignature;
      setWebglFailed(false);

      return () => {
        manager.dispose();
        managerRef.current = null;
      };
    } catch {
      setWebglFailed(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, webglSupported, reducedMotion]);

  // Only sync planet meshes when specs content actually changes (no redundant mount rebuild)
  useEffect(() => {
    if (!managerRef.current || prevSpecsKeyRef.current === specsSignature) return;
    prevSpecsKeyRef.current = specsSignature;
    managerRef.current.syncPlanets(specs);
  }, [specs, specsSignature]);

  // Keep Three.js palette synced across Light/Dark toggles, Love Theme palette switches, and OS 'system' mode
  useEffect(() => {
    const sig = `${paletteId}:${mode}`;
    if (prevThemeRef.current !== sig) {
      prevThemeRef.current = sig;
      const id = window.setTimeout(() => {
        managerRef.current?.refreshTheme();
      }, 30);
      return () => window.clearTimeout(id);
    }
  }, [paletteId, mode]);

  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return;
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      managerRef.current?.refreshTheme();
    });
    observer.observe(root, {
      attributes: true,
      attributeFilter: ['data-mode', 'data-palette', 'class'],
    });
    return () => observer.disconnect();
  }, [enabled]);

  return {
    containerRef,
    webglReady: enabled && webglSupported && !webglFailed,
    focusPlanet: (moduleKey: string) => managerRef.current?.focusPlanet(moduleKey),
    resetCamera: () => managerRef.current?.resetCamera(),
    zoomBy: (factor: number) => managerRef.current?.zoomBy(factor),
    setAutoRotate: (auto: boolean) => managerRef.current?.setAutoRotate(auto),
  };
}
