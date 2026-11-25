export type PlanetSurfaceStyle =
  | 'rose'
  | 'ocean'
  | 'amethyst'
  | 'emerald'
  | 'amber'
  | 'crystal'
  | 'dream'
  | 'nebula';

export interface UniverseThemePalette3D {
  isDark: boolean;
  bgApp: string;
  bgSurface: string;
  accent: string;
  info: string;
  purple: string;
  success: string;
  warning: string;
  textPrimary: string;
  textSecondary: string;
}

export interface PlanetNodeSpec {
  moduleKey: string;
  iconName: string;
  title: string;
  tagline: string;
  routePath: string;
  badgeText: string;
  isEnabled: boolean;
  isLocked: boolean;
  isVisited: boolean;
  canEnter: boolean;
  position: [number, number, number];
  radius: number;
  hasRing?: boolean;
  surfaceStyle: PlanetSurfaceStyle;
  starsLevel: number;
}

export interface UniverseSceneCallbacks {
  onHoverPlanet?: (moduleKey: string | null) => void;
  onSelectPlanet?: (moduleKey: string) => void;
  onEnterPlanet?: (moduleKey: string) => void;
}
