/**
 * docxStyleUtils.ts
 * Lightweight CSS style sanitization and document body separation utilities for DocLab.
 *
 * Isolated from heavy OpenXML/mammoth binary dependencies to allow fast, lightweight
 * rendering in live visual editors and SSR environments.
 */

/**
 * Sanitizes and strips heavy GPU burdens from extracted Word (.docx) CSS.
 * Removes massive base64 font blobs, @font-face declarations, @keyframes, and GPU raster filters.
 */
export function sanitizeDocxStyles(rawStyles: string): string {
  if (!rawStyles) return '';
  let cleanStyles = rawStyles;

  // 1. Strip all @font-face declarations and base64 font blobs
  cleanStyles = cleanStyles.replace(/@font-face\s*\{[\s\S]*?\}/gi, '');

  // 2. Strip any base64 data URLs in styles
  cleanStyles = cleanStyles.replace(/url\s*\(['"]?data:[^'"\)]+['"]?\)/gi, 'none');

  // 3. Strip any @keyframes or infinite CSS animations
  cleanStyles = cleanStyles.replace(/@keyframes[\s\S]*?\}\s*\}/gi, '');

  // 4. Strip GPU raster filters, backdrop filters, will-change triggers
  cleanStyles = cleanStyles.replace(/(?:filter|backdrop-filter|will-change)\s*:\s*[^;\}]+;?/gi, '');

  // 5. Neutralize fixed section.docx / .docx-wrapper rules
  cleanStyles = cleanStyles
    .replace(
      /section\.docx\s*\{[^}]*\}/gi,
      'section.docx { width: 100% !important; max-width: 100% !important; min-height: auto !important; height: auto !important; padding: 0 !important; margin: 0 !important; box-shadow: none !important; border: none !important; background-color: #ffffff !important; color: #0f172a !important; }'
    )
    .replace(/\.docx-wrapper\s*\{[^}]*\}/gi, '.docx-wrapper { padding: 0 !important; background-color: transparent !important; }');

  return cleanStyles;
}

/**
 * Splits docx HTML into distinct <style> blocks and body HTML content to prevent
 * massive style tag duplication when rendering multiple student pages.
 */
export function separateDocxStylesAndBody(html: string): { styles: string; body: string } {
  if (!html) return { styles: '', body: '' };

  const styleRegex = /<style\b[^>]*>[\s\S]*?<\/style>/gi;
  const styles: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = styleRegex.exec(html)) !== null) {
    const cleaned = sanitizeDocxStyles(match[0]);
    if (cleaned) styles.push(cleaned);
  }

  const body = html.replace(styleRegex, '').trim();
  return {
    styles: styles.join('\n'),
    body,
  };
}
