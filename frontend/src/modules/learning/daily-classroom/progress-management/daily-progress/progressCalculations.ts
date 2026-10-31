import type { DetailRowData, JuzRowData } from './types';

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * DAILY CLASSROOM PROGRESS CALCULATIONS (DOMAIN CORE)
 * ══════════════════════════════════════════════════════════════════════════════
 * Authoritative business rules for validating and calculating progress data:
 * - Ayah / Line counting
 * - Mistake and Stuck aggregations
 * - Juz and Page summary extractions
 *
 * This layer is independent of any document presentation, templating, or UI styles.
 */

/**
 * Counts valid detail items (Ayahs for Quran mode, or Lines for Book mode).
 * A row is counted if it specifies a page number and has non-empty ayah/line values.
 */
export function countValidDetailItems(data?: DetailRowData[]): number {
  if (!Array.isArray(data)) return 0;
  return data.reduce((total, row) => {
    if (!row.page || String(row.page).trim() === '') return total;
    const validAyahs = (row.ayahs || []).filter(
      (a) => a.value !== undefined && a.value !== null && String(a.value).trim() !== ''
    ).length;
    return total + (validAyahs > 0 ? validAyahs : 0);
  }, 0);
}

/**
 * Calculates total mistakes count from mistake detail rows.
 */
export function calculateTotalMistakes(data?: DetailRowData[]): number {
  return countValidDetailItems(data);
}

/**
 * Calculates total stuck count from stuck detail rows.
 */
export function calculateTotalStucks(data?: DetailRowData[]): number {
  return countValidDetailItems(data);
}

/**
 * Extracts and formats distinct Juz numbers from Juz/Page data rows (e.g. "30" or "22, 23").
 */
export function extractJuzNumberSummary(juzPageData?: JuzRowData[]): string {
  if (!Array.isArray(juzPageData)) return '';
  const juzSet = new Set<string>();
  juzPageData.forEach((row) => {
    if (row.juz !== undefined && row.juz !== null) {
      const jStr = String(row.juz).trim();
      if (jStr) juzSet.add(jStr);
    }
  });
  return Array.from(juzSet).join(', ');
}

/**
 * Extracts and formats page ranges grouped by Juz (e.g. "13–14" or "22: 13–14\n23: 1–5").
 */
export function extractJuzPageSummary(juzPageData?: JuzRowData[]): string {
  if (!Array.isArray(juzPageData) || juzPageData.length === 0) return '';

  const groupMap = new Map<string, string[]>();

  juzPageData.forEach((row) => {
    const jStr = (row.juz !== undefined && row.juz !== null) ? String(row.juz).trim() : '';
    if (!row.ranges || !Array.isArray(row.ranges)) return;

    const currentRanges: string[] = [];
    row.ranges.forEach((r) => {
      const s = (r.start || '').toString().trim();
      const e = (r.end || '').toString().trim();
      if (s) {
        if (e && e !== s) {
          currentRanges.push(`${s}–${e}`);
        } else {
          currentRanges.push(s);
        }
      }
    });

    if (currentRanges.length > 0) {
      if (!groupMap.has(jStr)) {
        groupMap.set(jStr, []);
      }
      groupMap.get(jStr)!.push(...currentRanges);
    }
  });

  if (groupMap.size === 0) return '';

  const distinctJuzs = Array.from(groupMap.keys()).filter((j) => j !== '');
  const isMultiJuz = distinctJuzs.length > 1;

  if (!isMultiJuz) {
    const allRanges: string[] = [];
    groupMap.forEach((ranges) => {
      allRanges.push(...ranges);
    });
    return allRanges.join(', ');
  }

  const lines: string[] = [];
  groupMap.forEach((ranges, juz) => {
    const rangesStr = ranges.join(', ');
    if (juz) {
      lines.push(`${juz}: ${rangesStr}`);
    } else {
      lines.push(rangesStr);
    }
  });

  return lines.join('\n');
}
