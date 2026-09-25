/**
 * svgShapeTemplates.ts
 * Enterprise SVG Vector Shape Templates and Generator Utilities for DocLab Studio.
 * 
 * Provides customizable, high-precision SVG vector snippets:
 * - Lines & Dividers (Solid, Dashed, Dotted, Double, Signature Blocks)
 * - Geometric Shapes (Rectangles, Rounded Cards, Callout Panels)
 * - Circular Stamps & Institutional Seals (Official Seal, Verified Badge)
 * - Dynamic SVG placeholder key integration
 */

export type SvgLineStyle = 'solid' | 'dashed' | 'dotted' | 'double';
export type SvgBoxVariant = 'rectangle' | 'rounded' | 'callout' | 'banner';
export type SvgStampVariant = 'seal' | 'circle' | 'badge' | 'verified';

export interface SvgDividerOptions {
  style?: SvgLineStyle;
  thickness?: number;
  color?: string;
  widthPercent?: number;
  marginVertical?: number;
}

export interface SvgSignatureBlockOptions {
  title?: string;
  dateLabel?: string;
  color?: string;
  widthPx?: number;
  showDate?: boolean;
}

export interface SvgBoxOptions {
  variant?: SvgBoxVariant;
  width?: number | string;
  height?: number;
  strokeColor?: string;
  fillColor?: string;
  strokeWidth?: number;
  title?: string;
  text?: string;
}

export interface SvgStampOptions {
  variant?: SvgStampVariant;
  size?: number;
  strokeColor?: string;
  fillColor?: string;
  strokeWidth?: number;
  topText?: string;
  centerText?: string;
  bottomText?: string;
}

/**
 * Generates high-precision SVG Divider Line HTML
 */
export function generateSvgDividerHtml({
  style = 'solid',
  thickness = 2,
  color = '#cbd5e1',
  widthPercent = 100,
  marginVertical = 14,
}: SvgDividerOptions = {}): string {
  const h = style === 'double' ? Math.max(thickness * 3 + 2, 8) : Math.max(thickness + 2, 4);

  let dashArray = 'none';
  if (style === 'dashed') dashArray = `${thickness * 3},${thickness * 2}`;
  if (style === 'dotted') dashArray = `${thickness},${thickness * 2}`;

  let innerSvg = '';
  if (style === 'double') {
    const y1 = Math.floor(h / 3);
    const y2 = Math.floor((h * 2) / 3);
    innerSvg = `
      <line x1="0" y1="${y1}" x2="100%" y2="${y1}" stroke="${color}" stroke-width="${thickness}" />
      <line x1="0" y1="${y2}" x2="100%" y2="${y2}" stroke="${color}" stroke-width="${thickness}" />
    `;
  } else {
    const y = Math.floor(h / 2);
    innerSvg = `
      <line x1="0" y1="${y}" x2="100%" y2="${y}" stroke="${color}" stroke-width="${thickness}" stroke-dasharray="${dashArray}" stroke-linecap="round" />
    `;
  }

  return `<div class="spr-svg-shape-container spr-svg-divider" style="margin: ${marginVertical}px auto; width: ${widthPercent}%; display: block; clear: both; user-select: none;">
    <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="${h}px" style="display: block; overflow: visible;">
      ${innerSvg}
    </svg>
  </div><p><br></p>`;
}

/**
 * Generates an Institutional Signature & Date Line Block
 */
export function generateSvgSignatureBlockHtml({
  title = 'Authorized Signature',
  dateLabel = 'Date: ____________',
  color = '#475569',
  widthPx = 220,
  showDate = true,
}: SvgSignatureBlockOptions = {}): string {
  return `<div class="spr-svg-shape-container spr-signature-block" style="display: inline-block; width: ${widthPx}px; margin: 24px 12px 12px 0; vertical-align: top; text-align: center; font-family: inherit;">
    <svg xmlns="http://www.w3.org/2000/svg" width="${widthPx}" height="24" viewBox="0 0 ${widthPx} 24" style="display: block; margin: 0 auto;">
      <line x1="10" y1="18" x2="${widthPx - 10}" y2="18" stroke="${color}" stroke-width="1.5" stroke-dasharray="4,2" />
    </svg>
    <div style="font-size: 11px; font-weight: 700; color: ${color}; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px;">
      ${title}
    </div>
    ${
      showDate
        ? `<div style="font-size: 10px; color: ${color}; opacity: 0.85; margin-top: 3px;">${dateLabel}</div>`
        : ''
    }
  </div>`;
}

/**
 * Generates a Geometric Box / Notice Panel SVG HTML
 */
export function generateSvgBoxHtml({
  variant = 'rounded',
  width = '100%',
  height = 90,
  strokeColor = '#3b82f6',
  fillColor = '#eff6ff',
  strokeWidth = 1.5,
  title = 'Important Notice',
  text = 'Please verify your information before official submission.',
}: SvgBoxOptions = {}): string {
  const rx = variant === 'rounded' || variant === 'callout' ? 8 : 0;

  return `<div class="spr-svg-shape-container spr-svg-box" style="margin: 14px 0; width: ${typeof width === 'number' ? width + 'px' : width}; display: block; position: relative;">
    <div style="background-color: ${fillColor}; border: ${strokeWidth}px ${variant === 'callout' ? 'dashed' : 'solid'} ${strokeColor}; border-radius: ${rx}px; padding: 12px 16px; font-family: inherit;">
      <div style="font-weight: 700; font-size: 12px; color: ${strokeColor}; margin-bottom: 4px; display: flex; items-center; gap: 6px;">
        ${title}
      </div>
      <div style="font-size: 11px; color: #334155; line-height: 1.5;">
        ${text}
      </div>
    </div>
  </div><p><br></p>`;
}

/**
 * Generates an Institutional Circular Seal / Verification Stamp SVG
 */
export function generateSvgSealHtml({
  variant = 'seal',
  size = 120,
  strokeColor = '#047857',
  fillColor = 'transparent',
  strokeWidth = 2,
  topText = 'OFFICIAL SEAL',
  centerText = 'APPROVED',
  bottomText = 'ACADEMIC BOARD',
}: SvgStampOptions = {}): string {
  const r = size / 2 - strokeWidth - 2;
  const innerR = r - 10;
  const cx = size / 2;
  const cy = size / 2;

  return `<div class="spr-svg-shape-container spr-svg-seal" style="display: inline-block; margin: 12px 16px 12px 0; vertical-align: middle; user-select: none;">
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="display: block;">
      <!-- Outer Ring -->
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />
      <!-- Inner Ring -->
      <circle cx="${cx}" cy="${cy}" r="${innerR}" fill="none" stroke="${strokeColor}" stroke-width="1" stroke-dasharray="3,2" />
      
      <!-- Center Text Badge -->
      <text x="${cx}" y="${cy - 8}" text-anchor="middle" font-size="8" font-weight="700" fill="${strokeColor}" font-family="Arial, sans-serif" letter-spacing="1">
        ${topText}
      </text>
      <text x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="12" font-weight="900" fill="${strokeColor}" font-family="Arial, sans-serif" letter-spacing="1.5">
        ${centerText}
      </text>
      <text x="${cx}" y="${cy + 17}" text-anchor="middle" font-size="7" font-weight="700" fill="${strokeColor}" font-family="Arial, sans-serif" letter-spacing="0.5">
        ${bottomText}
      </text>
    </svg>
  </div>`;
}

/**
 * Cleans and wraps user-provided raw SVG code into a responsive container
 */
export function wrapRawSvgCode(rawSvg: string, maxWidth: number = 300): string {
  let clean = rawSvg.trim();
  if (!clean.startsWith('<svg')) {
    clean = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">${clean}</svg>`;
  }
  return `<div class="spr-svg-shape-container spr-custom-svg" style="display: inline-block; max-width: ${maxWidth}px; margin: 8px 8px 8px 0; vertical-align: middle;">
    ${clean}
  </div><p><br></p>`;
}

/**
 * Standard Presets for Shape Dropdown
 */
export const SVG_PRESET_ITEMS = [
  {
    id: 'line_solid',
    category: 'lines',
    label: 'Solid Divider Line',
    description: 'Clean horizontal rule for section breaks',
    html: () => generateSvgDividerHtml({ style: 'solid', thickness: 1.5, color: '#94a3b8' }),
  },
  {
    id: 'line_dashed',
    category: 'lines',
    label: 'Dashed Divider Line',
    description: 'Dashed line for tear-offs or sub-sections',
    html: () => generateSvgDividerHtml({ style: 'dashed', thickness: 2, color: '#94a3b8' }),
  },
  {
    id: 'line_dotted',
    category: 'lines',
    label: 'Dotted Fill-in Line',
    description: 'Dotted leader line for handwriting fields',
    html: () => generateSvgDividerHtml({ style: 'dotted', thickness: 2, color: '#64748b' }),
  },
  {
    id: 'line_double',
    category: 'lines',
    label: 'Double Border Line',
    description: 'Classic double line for formal document headers',
    html: () => generateSvgDividerHtml({ style: 'double', thickness: 1.5, color: '#334155' }),
  },
  {
    id: 'sig_single',
    category: 'signatures',
    label: 'Authorized Signature Line',
    description: 'Signature block with title and date line',
    html: () => generateSvgSignatureBlockHtml({ title: 'Authorized Signature', dateLabel: 'Date: ____________' }),
  },
  {
    id: 'sig_dual',
    category: 'signatures',
    label: 'Dual Signature Block',
    description: 'Side-by-side signature lines (Examiner & Principal)',
    html: () => `
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin: 30px 0 10px 0; width: 100%;">
        ${generateSvgSignatureBlockHtml({ title: 'Subject Examiner', dateLabel: 'Date: ____________', widthPx: 200 })}
        ${generateSvgSignatureBlockHtml({ title: 'Principal / Controller', dateLabel: 'Date: ____________', widthPx: 200 })}
      </div><p><br></p>
    `,
  },
  {
    id: 'box_notice',
    category: 'boxes',
    label: 'Info / Notice Callout Box',
    description: 'Rounded highlight box for exam rules or notices',
    html: () => generateSvgBoxHtml({
      variant: 'rounded',
      strokeColor: '#2563eb',
      fillColor: '#eff6ff',
      title: 'Examination Instructions',
      text: 'Calculators, smart devices, and unauthorized books are strictly prohibited inside the hall.',
    }),
  },
  {
    id: 'box_warning',
    category: 'boxes',
    label: 'Warning Box',
    description: 'Amber alert panel for critical notices',
    html: () => generateSvgBoxHtml({
      variant: 'callout',
      strokeColor: '#d97706',
      fillColor: '#fffbeb',
      title: 'Important Warning',
      text: 'Examinees must report to their assigned desk at least 15 minutes before the exam begins.',
    }),
  },
  {
    id: 'seal_approved',
    category: 'stamps',
    label: 'Official Approval Seal',
    description: 'Green circular verification seal',
    html: () => generateSvgSealHtml({
      variant: 'seal',
      strokeColor: '#059669',
      topText: 'INSTITUTION SEAL',
      centerText: 'VERIFIED',
      bottomText: 'EXAMINATION DEPT',
    }),
  },
  {
    id: 'seal_passed',
    category: 'stamps',
    label: 'Academic Board Stamp',
    description: 'Blue circular academic certification stamp',
    html: () => generateSvgSealHtml({
      variant: 'seal',
      strokeColor: '#1d4ed8',
      topText: 'ACADEMIC BOARD',
      centerText: 'OFFICIAL',
      bottomText: 'RECOGNISED',
    }),
  },
];
