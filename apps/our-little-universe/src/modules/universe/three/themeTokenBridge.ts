import * as THREE from 'three';
import type { UniverseThemePalette3D } from './types';

function readCssVar(styles: CSSStyleDeclaration, name: string, fallback: string): string {
  const val = styles.getPropertyValue(name).trim();
  return val || fallback;
}

/**
 * Safely parses any CSS color string (hex, rgb, rgba, modern color-mix) into a THREE.Color
 * via a tiny detached canvas 2D normalizer when needed.
 */
let colorCtx: CanvasRenderingContext2D | null = null;

export function cssColorToThree(cssColor: string, fallbackHex = '#f43f5e'): THREE.Color {
  if (!cssColor) return new THREE.Color(fallbackHex);
  const trimmed = cssColor.trim();
  if (trimmed.startsWith('#') && (trimmed.length === 4 || trimmed.length === 7)) {
    return new THREE.Color(trimmed);
  }
  if (typeof document !== 'undefined') {
    try {
      if (!colorCtx) {
        const c = document.createElement('canvas');
        c.width = 1;
        c.height = 1;
        colorCtx = c.getContext('2d');
      }
      if (colorCtx) {
        colorCtx.clearRect(0, 0, 1, 1);
        colorCtx.fillStyle = fallbackHex;
        colorCtx.fillStyle = trimmed;
        colorCtx.fillRect(0, 0, 1, 1);
        const [r, g, b] = colorCtx.getImageData(0, 0, 1, 1).data;
        return new THREE.Color(r / 255, g / 255, b / 255);
      }
    } catch {
      // ignore canvas parse issues
    }
  }
  return new THREE.Color(fallbackHex);
}

/**
 * Reads live semantic design tokens from `@repo/theme` on `:root` so WebGL
 * adapts dynamically to every Love Theme palette & Dark/Light mode without hardcoded colors.
 */
export function readThemeTokensFor3D(): UniverseThemePalette3D {
  if (typeof document === 'undefined') {
    return {
      isDark: true,
      bgApp: '#12070d',
      bgSurface: '#1e0e18',
      accent: '#f43f5e',
      info: '#38bdf8',
      purple: '#a855f7',
      success: '#10b981',
      warning: '#f59e0b',
      textPrimary: '#fff1f5',
      textSecondary: '#d4a5b8',
    };
  }

  const root = document.documentElement;
  const styles = getComputedStyle(root);
  const modeAttr = root.getAttribute('data-mode');
  const isDark = modeAttr === 'dark' || root.classList.contains('dark');

  return {
    isDark,
    bgApp: readCssVar(styles, '--bg-app', isDark ? '#12070d' : '#fff5f7'),
    bgSurface: readCssVar(styles, '--bg-surface', isDark ? '#1e0e18' : '#ffffff'),
    accent: readCssVar(styles, '--accent-main', '#f43f5e'),
    info: readCssVar(styles, '--color-info', '#38bdf8'),
    purple: readCssVar(styles, '--color-purple', '#a855f7'),
    success: readCssVar(styles, '--color-success', '#10b981'),
    warning: readCssVar(styles, '--color-warning', '#f59e0b'),
    textPrimary: readCssVar(styles, '--text-primary', isDark ? '#fff1f5' : '#3b0a1e'),
    textSecondary: readCssVar(styles, '--text-secondary', isDark ? '#d4a5b8' : '#884d64'),
  };
}
