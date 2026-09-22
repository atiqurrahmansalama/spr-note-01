import { useState, useEffect } from "react";

/**
 * Quran Domain Constants & Rules
 */
export const QURAN_RULES = {
  MIN_JUZ: 1,
  MAX_JUZ: 30,
  MIN_PAGE: 1,
  MIN_AYAH: 1,
  MAX_AYAH: 286, // Surah Al-Baqarah maximum ayahs
} as const;

/**
 * Get maximum page allowed for a specific Juz:
 * - Juz 30: max 25 pages
 * - Juz 29: max 24 pages
 * - Other Juz (1-28): max 20 pages
 * - Unspecified / Fallback: max 25 pages (highest in Quran, prevents premature clamping)
 */
export function getMaxPageForJuz(juzNum?: string | number): number {
  if (!juzNum || String(juzNum).trim() === "") return 25;
  const j = parseInt(String(juzNum), 10);
  if (isNaN(j)) return 25;
  if (j === 30) return 25;
  if (j === 29) return 24;
  if (j >= 1 && j <= 28) return 20;
  return 25;
}

/**
 * Compute the valid Page Bounds [minPage, maxPage] for Mistake/Stuck rows
 * based on the user's defined ranges in JUZ / PAGE DETAILS.
 * 
 * Rule:
 * Page in MISTAKE DETAILS and STUCK DETAILS must stay within the bounds
 * for the corresponding Juz (max 24 for Juz 29, max 25 for Juz 30, max 20 for Juz 1-28).
 */
export function getJuzPageBounds(
  juzNum?: string | number,
  juzPageData?: any[]
): { minPage: number; maxPage: number } {
  // Infer effective Juz if juzNum is not explicitly provided or is empty
  let effectiveJuz = juzNum;
  if (
    (effectiveJuz === undefined || effectiveJuz === null || String(effectiveJuz).trim() === "") &&
    Array.isArray(juzPageData)
  ) {
    const activeRow = juzPageData.find((r) => r.juz && String(r.juz).trim() !== "");
    if (activeRow) {
      effectiveJuz = activeRow.juz;
    }
  }

  const defaultMax = getMaxPageForJuz(effectiveJuz);

  if (juzPageData && Array.isArray(juzPageData) && juzPageData.length > 0 && effectiveJuz) {
    const matchingRows = juzPageData.filter(
      (row) => row.juz && String(row.juz).trim() === String(effectiveJuz).trim()
    );

    if (matchingRows.length > 0) {
      let maxEnd = -Infinity;

      matchingRows.forEach((row) => {
        (row.ranges || []).forEach((r: any) => {
          const e = parseInt(String(r.end), 10);
          if (!isNaN(e) && e > 0 && e > maxEnd) maxEnd = e;
        });
      });

      const effectiveMax =
        maxEnd !== -Infinity && maxEnd >= 1
          ? Math.max(maxEnd, defaultMax)
          : defaultMax;

      return { minPage: 1, maxPage: effectiveMax };
    }
  }

  return { minPage: 1, maxPage: defaultMax };
}

/**
 * Shared Reactive Session Store for Last Written Page & Ayah across
 * both MISTAKE DETAILS and STUCK DETAILS.
 * 
 * Rule:
 * Empty Page and Ayah input boxes start scrolling/stepping from the most
 * recently written Page and Ayah, regardless of whether it was typed in
 * MISTAKE DETAILS or STUCK DETAILS.
 */
class QuranTrackingSessionStore {
  private lastPage: number | null = null;
  private lastAyah: number | null = null;
  private listeners: Set<() => void> = new Set();

  getLastPage(): number | null {
    return this.lastPage;
  }

  getLastAyah(): number | null {
    return this.lastAyah;
  }

  setLastPage(val: string | number | null | undefined) {
    if (val === "" || val === null || val === undefined) return;
    const num = Number(val);
    if (!isNaN(num) && num > 0) {
      if (this.lastPage !== num) {
        this.lastPage = num;
        this.notify();
      }
    }
  }

  setLastAyah(val: string | number | null | undefined) {
    if (val === "" || val === null || val === undefined) return;
    const num = Number(val);
    if (!isNaN(num) && num > 0) {
      if (this.lastAyah !== num) {
        this.lastAyah = num;
        this.notify();
      }
    }
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  reset() {
    this.lastPage = null;
    this.lastAyah = null;
    this.notify();
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error("Error in QuranTrackingSessionStore listener", err);
      }
    });
  }
}

export const quranTrackingSession = new QuranTrackingSessionStore();

/**
 * React Hook to subscribe to shared Quran tracking session values
 */
export function useQuranTrackingSession() {
  const [session, setSession] = useState<{
    lastPage: number | null;
    lastAyah: number | null;
  }>({
    lastPage: quranTrackingSession.getLastPage(),
    lastAyah: quranTrackingSession.getLastAyah(),
  });

  useEffect(() => {
    return quranTrackingSession.subscribe(() => {
      setSession({
        lastPage: quranTrackingSession.getLastPage(),
        lastAyah: quranTrackingSession.getLastAyah(),
      });
    });
  }, []);

  return session;
}
