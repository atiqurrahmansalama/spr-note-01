import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { THEME_PALETTES, THEME_MODES, type ThemePalette, type ThemeMode } from '@repo/theme';

export type AppThemeMode = 'dark' | 'light' | 'system';

export interface AppThemeContextValue {
  paletteId: string;
  activePalette: ThemePalette;
  mode: AppThemeMode;
  resolvedMode: 'dark' | 'light';
  palettes: ThemePalette[];
  modes: ThemeMode[];
  setPaletteId: (id: string) => void;
  setMode: (mode: AppThemeMode) => void;
}

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

export const AppThemeProvider: React.FC<{
  children: React.ReactNode;
  palettes?: ThemePalette[];
  defaultPaletteId?: string;
  initialPaletteId?: string;
  paletteStorageKey?: string;
  modeStorageKey?: string;
}> = ({
  children,
  palettes = THEME_PALETTES,
  defaultPaletteId,
  initialPaletteId,
  paletteStorageKey = 'app_theme_palette',
  modeStorageKey = 'app_theme_mode',
}) => {
  const fallbackPaletteId = defaultPaletteId || palettes[0]?.id || 'slate';

  const [paletteId, setPaletteIdState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(paletteStorageKey);
      if (saved && palettes.some((p) => p.id === saved)) return saved;
    } catch {
      // ignore storage errors
    }
    if (initialPaletteId && palettes.some((p) => p.id === initialPaletteId)) {
      return initialPaletteId;
    }
    return fallbackPaletteId;
  });

  const [mode, setModeState] = useState<AppThemeMode>(() => {
    try {
      const saved = localStorage.getItem(modeStorageKey) as AppThemeMode | null;
      return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'dark';
    } catch {
      return 'dark';
    }
  });

  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const prevInitialPaletteRef = useRef<string | undefined>(initialPaletteId);

  useEffect(() => {
    const prev = prevInitialPaletteRef.current;
    prevInitialPaletteRef.current = initialPaletteId;

    if (!initialPaletteId || !palettes.some((p) => p.id === initialPaletteId)) {
      return;
    }

    let hasSavedLocal = false;
    try {
      hasSavedLocal = Boolean(localStorage.getItem(paletteStorageKey));
    } catch {
      // ignore storage errors
    }

    // Preserve explicit local selection across reloads; only apply server default if
    // nothing is saved locally OR the server default actively changed mid-session.
    if (!hasSavedLocal || (prev !== undefined && prev !== initialPaletteId)) {
      setPaletteIdState(initialPaletteId);
    }
  }, [initialPaletteId, palettes, paletteStorageKey]);

  const resolvedMode: 'dark' | 'light' =
    mode === 'system' ? (systemPrefersDark ? 'dark' : 'light') : mode;

  const activePalette = useMemo(
    () => palettes.find((p) => p.id === paletteId) || palettes[0] || THEME_PALETTES[0],
    [palettes, paletteId]
  );

  const appliedTokenKeysRef = useRef<string[]>([]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const html = document.documentElement;
    html.setAttribute('data-mode', resolvedMode);
    html.setAttribute('data-theme', activePalette.id);
    html.classList.toggle('dark', resolvedMode === 'dark');

    // Clear previously injected custom palette tokens cleanly before applying next set
    for (const key of appliedTokenKeysRef.current) {
      html.style.removeProperty(key);
    }
    appliedTokenKeysRef.current = [];

    const tokenMap =
      resolvedMode === 'dark' ? activePalette.darkTokens : activePalette.lightTokens;

    if (tokenMap) {
      const keys = Object.keys(tokenMap);
      for (const prop of keys) {
        html.style.setProperty(prop, tokenMap[prop]);
      }
      appliedTokenKeysRef.current = keys;
    }

    if (!tokenMap || !tokenMap['--accent-main']) {
      const accent =
        activePalette.id === 'mono'
          ? resolvedMode === 'dark'
            ? '#e2e8f0'
            : '#0f172a'
          : activePalette.accentColor;
      html.style.setProperty('--accent-main', accent);
      appliedTokenKeysRef.current.push('--accent-main');
    }

    if (!tokenMap || !tokenMap['--accent-soft']) {
      const softMix = resolvedMode === 'dark' ? '18%' : '12%';
      html.style.setProperty(
        '--accent-soft',
        `color-mix(in srgb, var(--accent-main) ${softMix}, transparent)`
      );
      appliedTokenKeysRef.current.push('--accent-soft');
    }

    if (!tokenMap || !tokenMap['--accent-text']) {
      html.style.setProperty(
        '--accent-text',
        activePalette.id === 'mono' && resolvedMode === 'dark' ? '#090b14' : '#ffffff'
      );
      appliedTokenKeysRef.current.push('--accent-text');
    }
  }, [activePalette, resolvedMode]);

  const setPaletteId = (id: string) => {
    if (!palettes.some((p) => p.id === id)) return;
    setPaletteIdState(id);
    try {
      localStorage.setItem(paletteStorageKey, id);
    } catch {
      // ignore storage errors
    }
  };

  const setMode = (nextMode: AppThemeMode) => {
    setModeState(nextMode);
    try {
      localStorage.setItem(modeStorageKey, nextMode);
    } catch {
      // ignore storage errors
    }
  };

  const value = useMemo<AppThemeContextValue>(
    () => ({
      paletteId: activePalette.id,
      activePalette,
      mode,
      resolvedMode,
      palettes,
      modes: THEME_MODES,
      setPaletteId,
      setMode,
    }),
    [activePalette, mode, resolvedMode, palettes]
  );

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
};

export function useAppTheme(): AppThemeContextValue {
  const ctx = useContext(AppThemeContext);
  if (!ctx) {
    throw new Error('useAppTheme must be used within AppThemeProvider');
  }
  return ctx;
}
