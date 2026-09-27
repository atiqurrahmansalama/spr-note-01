/**
 * Geometry & Physical Dimension Types for DocLab Layout Architecture
 * Defines spatial coordinates, rectangles, margins, paper presets, and units.
 */

export interface Point {
  x: number;
  y: number;
}

export interface Dimensions {
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export type PageSizeId = 'A4' | 'LEGAL' | 'LETTER' | 'ID_CARD' | 'CUSTOM';
export type PageOrientation = 'PORTRAIT' | 'LANDSCAPE';
export type MarginPreset = 'NONE' | 'TIGHT' | 'NARROW' | 'NORMAL' | 'WIDE' | 'CUSTOM';
export type DensityPreset = 'ULTRA_COMPACT' | 'COMPACT' | 'NORMAL' | 'RELAXED' | 'SPACIOUS';
export type ColorMode = 'FULL_COLOR' | 'INK_SAVER' | 'GRAYSCALE' | 'MONOCHROME' | 'HIGH_CONTRAST';

/**
 * Physical paper size definitions in millimeters (mm)
 */
export interface PhysicalPaperMetrics {
  widthMm: number;
  heightMm: number;
  name: string;
}

export const PAPER_SIZE_METRICS_MM: Record<PageSizeId, PhysicalPaperMetrics> = {
  A4: { widthMm: 210, heightMm: 297, name: 'A4 Standard' },
  LETTER: { widthMm: 215.9, heightMm: 279.4, name: 'US Letter' },
  LEGAL: { widthMm: 215.9, heightMm: 355.6, name: 'US Legal' },
  ID_CARD: { widthMm: 85.6, heightMm: 53.98, name: 'Standard ID Card (CR80)' },
  CUSTOM: { widthMm: 210, heightMm: 297, name: 'Custom Dimensions' },
};

/**
 * Standard CSS/Screen DPI pixel conversions (96 CSS pixels per inch)
 * 1 inch = 25.4 mm => 1 mm ≈ 3.7795275591 px
 */
export const MM_TO_PX_RATIO = 96 / 25.4;

export function mmToPx(mm: number): number {
  return Math.round(mm * MM_TO_PX_RATIO * 100) / 100;
}

export function pxToMm(px: number): number {
  return Math.round((px / MM_TO_PX_RATIO) * 100) / 100;
}

/**
 * Standard margin insets in millimeters
 */
export const MARGIN_PRESET_METRICS_MM: Record<MarginPreset, Insets> = {
  NONE: { top: 0, right: 0, bottom: 0, left: 0 },
  TIGHT: { top: 6.35, right: 6.35, bottom: 6.35, left: 6.35 },
  NARROW: { top: 12.7, right: 12.7, bottom: 12.7, left: 12.7 },
  NORMAL: { top: 25.4, right: 25.4, bottom: 25.4, left: 25.4 },
  WIDE: { top: 31.75, right: 31.75, bottom: 31.75, left: 31.75 },
  CUSTOM: { top: 20, right: 20, bottom: 20, left: 20 },
};
