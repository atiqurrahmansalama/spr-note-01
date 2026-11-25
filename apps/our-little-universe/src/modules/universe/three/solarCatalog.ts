import type { PlanetSurfaceStyle } from './types';

export interface SolarPlanetAppearance {
  primaryHex: string;
  secondaryHex: string;
  detailHex: string;
  ringHex?: string;
  kind: 'terrestrial' | 'lunar' | 'swirl_giant' | 'rocky';
}

export const SOLAR_SUN_PALETTE = {
  coreHex: '#ffe48a',
  midHex: '#ff9e2c',
  flareHex: '#ff5e1a',
  lightHex: '#fff4dc',
};

export const SOLAR_PLANET_APPEARANCES: Record<PlanetSurfaceStyle, SolarPlanetAppearance> = {
  // Earth-like World (Our Story) — Luminous Azure Ocean + Fresh Emerald Continents
  rose: {
    primaryHex: '#2b82d4',
    secondaryHex: '#43ad6c',
    detailHex: '#f1f7fd',
    kind: 'terrestrial',
  },
  // Moon / Pearl Lunar World (Memories) — Silvery Pearl & Soft Lavender Slate
  ocean: {
    primaryHex: '#cfd8e6',
    secondaryHex: '#8d99b5',
    detailHex: '#f8fafc',
    kind: 'lunar',
  },
  // Mars Terracotta World (Letters) — Warm Coral Terracotta & Sunset Ochre
  amethyst: {
    primaryHex: '#e2724b',
    secondaryHex: '#ad4b33',
    detailHex: '#f8c39b',
    kind: 'rocky',
  },
  // Lush Biosphere World (Rose Garden) — Radiant Jade Lagoon & Mint Canopy
  emerald: {
    primaryHex: '#26a392',
    secondaryHex: '#4bc27f',
    detailHex: '#e2faef',
    kind: 'terrestrial',
  },
  // Golden-Amber Swirl World (Games) — Rich Honey-Amber & Warm Copper Swirls
  amber: {
    primaryHex: '#ebb163',
    secondaryHex: '#b96d3f',
    detailHex: '#fdf1d8',
    kind: 'swirl_giant',
  },
  // Cobalt-Periwinkle Ice World (Secrets) — Vibrant Royal Blue & Luminous Sky Swirls
  crystal: {
    primaryHex: '#3e73e6',
    secondaryHex: '#254ba3',
    detailHex: '#a5ccff',
    kind: 'swirl_giant',
  },
  // Saturn Champagne Ringed World (Dreams — ONLY ringed planet)
  dream: {
    primaryHex: '#e7c384',
    secondaryHex: '#b88552',
    detailHex: '#fef4d4',
    ringHex: '#d89f60',
    kind: 'swirl_giant',
  },
  // Cerulean-Sky Twilight World (Night Sky) — Crisp Cerulean & Soft Glacier Cyan
  nebula: {
    primaryHex: '#5cbbe0',
    secondaryHex: '#3b80ad',
    detailHex: '#e0f5ff',
    kind: 'swirl_giant',
  },
};
