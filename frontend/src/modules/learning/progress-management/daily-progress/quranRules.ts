// ══════════════════════════════════════════════════════════════════════════════
// QURAN DOMAIN RULES & SESSION STORE
// ══════════════════════════════════════════════════════════════════════════════

export const QURAN_RULES = {
  MIN_JUZ: 1,
  MAX_JUZ: 30,
  MIN_PAGE: 1,
  MAX_PAGE: 25,
  MIN_AYAH: 1,
  MAX_AYAH: 286,
} as const;

export function getMaxPageForJuz(juzNum?: string | number): number {
  if (!juzNum || String(juzNum).trim() === "") return 25;
  const j = parseInt(String(juzNum), 10);
  if (isNaN(j)) return 25;
  if (j === 30) return 25;
  if (j === 29) return 24;
  if (j >= 1 && j <= 28) return 20;
  return 25;
}

export interface JuzPageBounds {
  minPage: number;
  maxPage: number;
  allowedPages?: number[];
  hasExplicitBounds: boolean;
}

export function getJuzPageBounds(
  juzNum?: string | number,
  juzPageData?: any[]
): JuzPageBounds {
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

  if (
    juzPageData &&
    Array.isArray(juzPageData) &&
    juzPageData.length > 0 &&
    effectiveJuz !== undefined &&
    effectiveJuz !== null &&
    String(effectiveJuz).trim() !== ""
  ) {
    const matchingRows = juzPageData.filter(
      (row) => row.juz && String(row.juz).trim() === String(effectiveJuz).trim()
    );

    if (matchingRows.length > 0) {
      const allowedSet = new Set<number>();
      let minFound = Infinity;
      let maxFound = -Infinity;

      matchingRows.forEach((row) => {
        (row.ranges || []).forEach((r: any) => {
          const s = parseInt(String(r.start), 10);
          const e = parseInt(String(r.end), 10);
          const validStart = !isNaN(s) && s > 0;
          const validEnd = !isNaN(e) && e > 0;

          if (validStart && validEnd) {
            const rangeMin = Math.min(s, e);
            const rangeMax = Math.max(s, e);
            if (rangeMin < minFound) minFound = rangeMin;
            if (rangeMax > maxFound) maxFound = rangeMax;
            for (let p = rangeMin; p <= rangeMax; p++) {
              allowedSet.add(p);
            }
          } else if (validStart) {
            if (s < minFound) minFound = s;
            if (s > maxFound) maxFound = s;
            allowedSet.add(s);
          } else if (validEnd) {
            if (e < minFound) minFound = e;
            if (e > maxFound) maxFound = e;
            allowedSet.add(e);
          }
        });
      });

      if (minFound !== Infinity && maxFound !== -Infinity) {
        return {
          minPage: minFound,
          maxPage: maxFound,
          allowedPages: Array.from(allowedSet).sort((a, b) => a - b),
          hasExplicitBounds: true,
        };
      }
    }
  }

  return {
    minPage: QURAN_RULES.MIN_PAGE,
    maxPage: defaultMax,
    hasExplicitBounds: false,
  };
}

export class QuranTrackingSessionStore {
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
