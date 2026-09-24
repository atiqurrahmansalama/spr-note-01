// ══════════════════════════════════════════════════════════════════════════════
// QURAN DOMAIN RULES & SESSION STORE
// ══════════════════════════════════════════════════════════════════════════════

export const QURAN_RULES = {
  MIN_JUZ: 1,
  MAX_JUZ: 30,
  MIN_PAGE: 1,
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

export function getJuzPageBounds(
  juzNum?: string | number,
  juzPageData?: any[]
): { minPage: number; maxPage: number } {
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
