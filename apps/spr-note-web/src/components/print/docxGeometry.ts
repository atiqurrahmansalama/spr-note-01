import type {
  PrintPageSize,
  PrintOrientation,
  PrintMargin,
  DocxPageProperties,
} from './types';
import { PageGeometryCalculator } from './layout/geometry/PageGeometry';

export interface DocxPaperDimensions {
  width: string;
  minHeight: string;
  height: string;
  maxWidth: string;
}

/**
 * Single source of truth for physical paper simulation dimensions across Modal Preview and Live Canvas.
 */
export function getDocxPaperDimensions(
  pageSize: PrintPageSize = 'A4',
  orientation: PrintOrientation = 'PORTRAIT'
): DocxPaperDimensions {
  const { px } = PageGeometryCalculator.resolveDimensions(pageSize, orientation);
  return {
    width: `${px.width}px`,
    minHeight: `${px.height}px`,
    height: `${px.height}px`,
    maxWidth: `${px.width}px`,
  };
}

/**
 * Single source of truth for exact document margins / padding across Modal Preview and Live Canvas.
 */
export function getDocxPaperPadding(
  pageProperties?: Partial<DocxPageProperties> | null,
  marginPreset: PrintMargin = 'NORMAL'
): string {
  const { css } = PageGeometryCalculator.resolveMargins(marginPreset, undefined, pageProperties);
  return css;
}

/**
 * Converts any CSS length measurement (mm, cm, in, pt, px, dxa) into standard millimeters (mm).
 */
export function convertCssLengthToMm(valStr: string | null | undefined): number | null {
  if (!valStr || typeof valStr !== 'string') return null;
  const trimmed = valStr.trim().toLowerCase();
  const num = parseFloat(trimmed);
  if (isNaN(num)) return null;

  if (trimmed.endsWith('mm')) return num;
  if (trimmed.endsWith('cm')) return num * 10;
  if (trimmed.endsWith('in')) return num * 25.4;
  if (trimmed.endsWith('pt')) return num * 0.352778;
  if (trimmed.endsWith('px')) return num * 0.264583; // standard 96dpi web ratio
  if (trimmed.endsWith('pc')) return num * 4.23333;
  if (trimmed.endsWith('dxa') || trimmed.endsWith('twip')) return num * 0.0176389; // 1 dxa = 1/20 pt
  return num;
}

/**
 * Helper to parse 1, 2, or 4 CSS padding measurements into millimeter values.
 */
function parsePaddingParts(padStr: string): { top?: number; right?: number; bottom?: number; left?: number } | null {
  if (!padStr) return null;
  const parts = padStr.trim().split(/\s+/).map(convertCssLengthToMm).filter((v): v is number => v !== null);
  if (parts.length === 1 && parts[0] > 0) {
    return { top: parts[0], right: parts[0], bottom: parts[0], left: parts[0] };
  }
  if (parts.length === 2 && (parts[0] > 0 || parts[1] > 0)) {
    return { top: parts[0], bottom: parts[0], right: parts[1], left: parts[1] };
  }
  if (parts.length === 4) {
    return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[3] };
  }
  return null;
}

/**
 * Robustly extracts exact Page Size (A4, LEGAL, LETTER), Orientation (PORTRAIT, LANDSCAPE),
 * and Margin Presets (NORMAL, NARROW, WIDE, NONE) from parsed OpenXML sandbox elements, styles, or raw XML.
 */
export function extractDocxPageProperties(
  sandbox: HTMLElement | null,
  htmlContent: string = ''
): DocxPageProperties {
  let detectedWidthMm: number | null = null;
  let detectedHeightMm: number | null = null;
  let detectedTopMm: number | null = null;
  let detectedRightMm: number | null = null;
  let detectedBottomMm: number | null = null;
  let detectedLeftMm: number | null = null;
  let explicitOrientation: PrintOrientation | null = null;

  // Combine style contents from sandbox <style> tags and htmlContent
  let fullStyleText = htmlContent || '';
  if (sandbox) {
    const sandboxStyles = Array.from(sandbox.querySelectorAll('style'))
      .map((s) => s.textContent || s.innerHTML || '')
      .join('\n');
    fullStyleText = `${sandboxStyles}\n${fullStyleText}`;
  }

  // 1. Extract from CSS rules in style text
  if (fullStyleText) {
    // Check @page rules
    const pageMatch = /@page\s*\{([^}]+)\}/i.exec(fullStyleText);
    if (pageMatch) {
      const pBody = pageMatch[1];
      if (/landscape/i.test(pBody)) explicitOrientation = 'LANDSCAPE';
      if (/portrait/i.test(pBody)) explicitOrientation = 'PORTRAIT';

      const sMatch = /size\s*:\s*([0-9\.]+(?:mm|cm|in|pt|px))\s+([0-9\.]+(?:mm|cm|in|pt|px))/i.exec(pBody);
      if (sMatch) {
        detectedWidthMm = convertCssLengthToMm(sMatch[1]);
        detectedHeightMm = convertCssLengthToMm(sMatch[2]);
      }

      const mMatch = /margin\s*:\s*([0-9\.]+(?:mm|cm|in|pt|px))/i.exec(pBody);
      if (mMatch) {
        const m = convertCssLengthToMm(mMatch[1]);
        if (m !== null && m > 0) {
          detectedTopMm = detectedRightMm = detectedBottomMm = detectedLeftMm = m;
        }
      }
    }

    // Check section.docx rules (where docx-preview outputs exact padding and width/height)
    const secMatch = /(?:section\.docx|\.docx-wrapper>section|\.docx)\s*\{([^}]+)\}/i.exec(fullStyleText);
    if (secMatch) {
      const secBody = secMatch[1];
      const wMatch = /width\s*:\s*([0-9\.]+(?:mm|cm|in|pt|px))/i.exec(secBody);
      if (wMatch && detectedWidthMm === null) detectedWidthMm = convertCssLengthToMm(wMatch[1]);

      const hMatch = /(?:min-height|height)\s*:\s*([0-9\.]+(?:mm|cm|in|pt|px))/i.exec(secBody);
      if (hMatch && detectedHeightMm === null) detectedHeightMm = convertCssLengthToMm(hMatch[1]);

      // Extract padding from section.docx
      const padMatch = /padding\s*:\s*([^;\}]+)/i.exec(secBody);
      if (padMatch && detectedTopMm === null) {
        const parsed = parsePaddingParts(padMatch[1]);
        if (parsed) {
          detectedTopMm = parsed.top ?? null;
          detectedRightMm = parsed.right ?? null;
          detectedBottomMm = parsed.bottom ?? null;
          detectedLeftMm = parsed.left ?? null;
        }
      }
    }
  }

  // 2. Inspect DOM section elements if CSS didn't have dimensions
  if (sandbox) {
    const sections = Array.from(sandbox.querySelectorAll('section, article, .docx, .docx-wrapper > section'));
    for (const sec of sections) {
      const sectionEl = sec as HTMLElement;
      if (sectionEl) {
        if (sectionEl.style.width && detectedWidthMm === null) {
          detectedWidthMm = convertCssLengthToMm(sectionEl.style.width);
        }
        if ((sectionEl.style.minHeight || sectionEl.style.height) && detectedHeightMm === null) {
          detectedHeightMm = convertCssLengthToMm(sectionEl.style.minHeight || sectionEl.style.height);
        }

        if (detectedTopMm === null) {
          if (sectionEl.style.paddingTop) detectedTopMm = convertCssLengthToMm(sectionEl.style.paddingTop);
          if (sectionEl.style.paddingRight) detectedRightMm = convertCssLengthToMm(sectionEl.style.paddingRight);
          if (sectionEl.style.paddingBottom) detectedBottomMm = convertCssLengthToMm(sectionEl.style.paddingBottom);
          if (sectionEl.style.paddingLeft) detectedLeftMm = convertCssLengthToMm(sectionEl.style.paddingLeft);

          if (detectedTopMm === null && sectionEl.style.padding) {
            const parsed = parsePaddingParts(sectionEl.style.padding);
            if (parsed) {
              detectedTopMm = parsed.top ?? null;
              detectedRightMm = parsed.right ?? null;
              detectedBottomMm = parsed.bottom ?? null;
              detectedLeftMm = parsed.left ?? null;
            }
          }

          // Check raw inline style attribute
          const inlineStyle = sectionEl.getAttribute('style') || '';
          if (detectedTopMm === null && inlineStyle) {
            const ptMatch = /padding-top\s*:\s*([^;]+)/i.exec(inlineStyle);
            if (ptMatch) detectedTopMm = convertCssLengthToMm(ptMatch[1]);
            const prMatch = /padding-right\s*:\s*([^;]+)/i.exec(inlineStyle);
            if (prMatch) detectedRightMm = convertCssLengthToMm(prMatch[1]);
            const pbMatch = /padding-bottom\s*:\s*([^;]+)/i.exec(inlineStyle);
            if (pbMatch) detectedBottomMm = convertCssLengthToMm(pbMatch[1]);
            const plMatch = /padding-left\s*:\s*([^;]+)/i.exec(inlineStyle);
            if (plMatch) detectedLeftMm = convertCssLengthToMm(plMatch[1]);
          }
        }
      }
    }
  }

  // 3. Fallback defaults if measurements are missing
  const width = detectedWidthMm || 210;
  const height = detectedHeightMm || 297;

  // 4. Resolve Orientation
  const orientation: PrintOrientation = explicitOrientation || (width > height ? 'LANDSCAPE' : 'PORTRAIT');

  // 5. Resolve Paper Size
  const minDim = Math.min(width, height);
  const maxDim = Math.max(width, height);

  let pageSize: PrintPageSize = 'A4';
  if (minDim >= 205 && minDim <= 226 && maxDim >= 340 && maxDim <= 370) {
    pageSize = 'LEGAL';
  } else if (minDim >= 205 && minDim <= 226 && maxDim >= 265 && maxDim <= 290) {
    pageSize = 'LETTER';
  } else if (minDim >= 195 && minDim <= 220 && maxDim >= 285 && maxDim <= 310) {
    pageSize = 'A4';
  } else if (minDim <= 65 && maxDim <= 100) {
    pageSize = 'ID_CARD';
  } else if (Math.abs(minDim - 210) > 20 || Math.abs(maxDim - 297) > 30) {
    if (maxDim > 320) pageSize = 'LEGAL';
    else if (minDim > 214) pageSize = 'LETTER';
    else pageSize = 'A4';
  }

  // 6. Resolve Margin Preset: Default is ALWAYS NORMAL (20-25.4mm) unless specifically narrow or wide
  const hasDetectedMargins = detectedTopMm !== null || detectedLeftMm !== null;
  const avgMargin = hasDetectedMargins
    ? ((detectedTopMm ?? 20) + (detectedRightMm ?? 20) + (detectedBottomMm ?? 20) + (detectedLeftMm ?? 20)) / 4
    : 20;

  let margin: PrintMargin = 'NORMAL';
  if (hasDetectedMargins && avgMargin <= 3) {
    margin = 'NONE';
  } else if (hasDetectedMargins && avgMargin <= 15) {
    margin = 'NARROW';
  } else if (hasDetectedMargins && avgMargin >= 32) {
    margin = 'WIDE';
  } else {
    margin = 'NORMAL';
  }

  return {
    pageSize,
    orientation,
    margin,
    pageWidthMm: detectedWidthMm ?? undefined,
    pageHeightMm: detectedHeightMm ?? undefined,
    marginTopMm: detectedTopMm ?? undefined,
    marginRightMm: detectedRightMm ?? undefined,
    marginBottomMm: detectedBottomMm ?? undefined,
    marginLeftMm: detectedLeftMm ?? undefined,
  };
}

