/**
 * SPR Note — Print Engine Store
 * ================================
 * Centralized store for print studio configurations, paper geometry,
 * typography density, watermark templates, signature presets, and persistence.
 */

import { readJSON, writeJSON } from './coreStore';

// ─── Preset Constants ─────────────────────────────────────────────────────────

export const DEFAULT_WATERMARK_TEMPLATES = [
  'OFFICIAL',
  'CONFIDENTIAL',
  'ORIGINAL',
  'DRAFT',
  'SAMPLE',
  'COPY',
  'PROVISIONAL',
  'INTERNAL USE ONLY',
  'ACADEMIC RECORD',
  'FINAL TABULATION',
];

export const DEFAULT_WATERMARK_PILLS = [
  'OFFICIAL',
  'CONFIDENTIAL',
  'ORIGINAL',
  'DRAFT',
  'SAMPLE',
  'COPY',
];

export const PRINT_ORIENTATION_OPTIONS = [
  { value: 'PORTRAIT', label: 'Portrait' },
  { value: 'LANDSCAPE', label: 'Landscape' },
];

export const PRINT_PAPER_SIZE_OPTIONS = [
  { value: 'A4', label: 'A4 (210 × 297 mm)' },
  { value: 'LEGAL', label: 'Legal (216 × 356 mm)' },
  { value: 'LETTER', label: 'Letter (216 × 279 mm)' },
];

export const PRINT_MARGIN_OPTIONS = [
  { value: 'NORMAL', label: 'Normal (15 mm)' },
  { value: 'NARROW', label: 'Narrow (8 mm)' },
  { value: 'WIDE', label: 'Wide (25 mm)' },
  { value: 'NONE', label: 'Zero Margin' },
];

export const PRINT_DENSITY_OPTIONS = [
  { value: 'ULTRA_COMPACT', label: 'Ultra Compact (40+ Rows)' },
  { value: 'COMPACT', label: 'Compact (30-35 Rows)' },
  { value: 'NORMAL', label: 'Standard Balanced (Default)' },
  { value: 'RELAXED', label: 'Relaxed (Spacious)' },
  { value: 'SPACIOUS', label: 'Comfortable (Large Text)' },
];

export const PRINT_BLANK_ROWS_OPTIONS = [
  { value: '0', label: 'None (0 Rows)' },
  { value: '3', label: '+3 Blank Rows' },
  { value: '5', label: '+5 Blank Rows' },
  { value: '10', label: '+10 Blank Rows' },
  { value: '15', label: '+15 Blank Rows' },
  { value: '20', label: '+20 Blank Rows' },
];

export const PRINT_COLOR_MODE_OPTIONS = [
  { value: 'FULL_COLOR', label: 'Full Color (High Fidelity)' },
  { value: 'INK_SAVER', label: 'Economy Ink-Saver' },
  { value: 'MONOCHROME', label: 'Monochrome (Photocopy)' },
];

export const PRINT_SIGNATURE_STYLE_OPTIONS = [
  { value: 'SOLID', label: 'Solid Underline (Standard)' },
  { value: 'DASHED', label: 'Dashed Underline (Modern)' },
  { value: 'DOTTED', label: 'Dotted Underline (Minimal)' },
];

export const PRINT_SIGNATURE_PRESETS = [
  {
    id: 'academic-3',
    name: 'Academic Standard (3 Lines)',
    lines: [
      { id: 'prepared', label: 'Prepared By', sub: 'Course Teacher', enabled: true },
      { id: 'verified', label: 'Verified By', sub: 'Department Head', enabled: true },
      { id: 'approved', label: 'Approved By', sub: 'Controller of Examinations', enabled: true },
    ],
  },
  {
    id: 'simple-2',
    name: 'Standard (2 Lines)',
    lines: [
      { id: 'prepared', label: 'Prepared By', sub: 'Subject Teacher', enabled: true },
      { id: 'approved', label: 'Approved By', sub: 'Principal / Head', enabled: true },
    ],
  },
  {
    id: 'board-4',
    name: 'Exam Board (4 Lines)',
    lines: [
      { id: 'examiner', label: 'Course Examiner', sub: 'Tabulator', enabled: true },
      { id: 'scrutinizer', label: 'Scrutinizer', sub: 'Exam Committee', enabled: true },
      { id: 'dept_head', label: 'Head of Department', sub: 'Departmental Head', enabled: true },
      { id: 'controller', label: 'Controller of Exams', sub: 'Authorized Signatory', enabled: true },
    ],
  },
];

export const DEFAULT_PRINT_OPTIONS = {
  orientation: 'PORTRAIT',
  pageSize: 'A4',
  margin: 'NORMAL',
  density: 'NORMAL',
  colorMode: 'FULL_COLOR',
  showHeader: true,
  showLogo: true,
  showMeta: true,
  showSummary: true,
  showFooter: true,
  showWatermark: false,
  watermarkText: 'OFFICIAL',
  showSignatures: true,
  signatureStyle: 'SOLID',
  signatureLines: [
    { id: 'prepared', label: 'Prepared By', sub: 'Course Teacher', enabled: true },
    { id: 'verified', label: 'Verified By', sub: 'Department Head', enabled: true },
    { id: 'approved', label: 'Approved By', sub: 'Controller of Examinations', enabled: true },
  ],
};

// ─── Store API ────────────────────────────────────────────────────────────────

export const printStore = {
  /** Get all stored print preferences with fallback to system defaults */
  getPreferences: (tenantId = 'default') => {
    const key = `spr_print_preferences_${tenantId}`;
    return readJSON(key, DEFAULT_PRINT_OPTIONS);
  },

  /** Save print preferences to persistent storage and notify listeners */
  savePreferences: (tenantId = 'default', preferences) => {
    const key = `spr_print_preferences_${tenantId}`;
    writeJSON(key, preferences);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('spr_print_preferences_updated', { detail: preferences })
      );
    }
    return preferences;
  },

  /** Get watermark template texts list */
  getWatermarkTemplates: (tenantId = 'default') => {
    const key = `spr_print_watermark_templates_${tenantId}`;
    const raw = readJSON(key, null);
    if (!raw || !Array.isArray(raw) || raw.length === 0) {
      writeJSON(key, DEFAULT_WATERMARK_TEMPLATES);
      return DEFAULT_WATERMARK_TEMPLATES;
    }
    return raw;
  },

  /** Save customized watermark template list */
  saveWatermarkTemplates: (tenantId = 'default', templates) => {
    const key = `spr_print_watermark_templates_${tenantId}`;
    writeJSON(key, templates);
    return templates;
  },

  /** Get signature presets list */
  getSignaturePresets: (tenantId = 'default') => {
    const key = `spr_print_signature_presets_${tenantId}`;
    return readJSON(key, PRINT_SIGNATURE_PRESETS);
  },

  /** Reset all print settings back to default */
  resetToDefaults: (tenantId = 'default') => {
    const key = `spr_print_preferences_${tenantId}`;
    writeJSON(key, DEFAULT_PRINT_OPTIONS);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('spr_print_preferences_updated', { detail: DEFAULT_PRINT_OPTIONS })
      );
    }
    return DEFAULT_PRINT_OPTIONS;
  },
};
