/**
 * FontLoadingCoordinator
 * Synchronizes web font readiness with spatial measurement engines and triggers repagination.
 *
 * Prevents FOUT (Flash of Unstyled Text) and erroneous text-line measurements
 * by ensuring required document fonts (Inter, Nirmala UI, Noto Sans Bengali, Kalpurush, Amiri)
 * are fully loaded, and guaranteeing that the layout engine performs another authoritative
 * repagination pass once fonts settle or whenever new web fonts load dynamically.
 */

import { MeasurementCache } from '../measurement/MeasurementCache';

export type FontLoadedListener = () => void;

export class FontLoadingCoordinator {
  private static readyPromise: Promise<boolean> | null = null;
  private static listeners: Set<FontLoadedListener> = new Set();
  private static isListeningToFonts: boolean = false;

  /**
   * Initializes global document font loading listeners
   */
  private static ensureGlobalFontListeners(): void {
    if (this.isListeningToFonts || typeof document === 'undefined' || !('fonts' in document)) {
      return;
    }

    this.isListeningToFonts = true;

    // Listen to later font loading events (e.g. Google Fonts / dynamic @font-face)
    document.fonts.addEventListener('loadingdone', () => {
      this.handleFontsSettled();
    });

    // Also wait for initial fonts ready
    document.fonts.ready
      .then(() => {
        this.handleFontsSettled();
      })
      .catch(() => {});
  }

  /**
   * Dispatches font settled events to all registered layout pipelines and clears stale measurement caches
   */
  private static handleFontsSettled(): void {
    // Purge stale font bounding boxes from measurement cache
    MeasurementCache.getInstance().clear();

    // Notify all active editor layout pipelines
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('[DocLab] Error in FontLoadingCoordinator listener:', err);
      }
    });
  }

  /**
   * Subscribes to font readiness and dynamic font loading events.
   * Guarantees that the editor repaginates whenever fonts become ready.
   * Returns an unsubscribe cleanup function.
   */
  public static onFontsLoaded(listener: FontLoadedListener): () => void {
    this.ensureGlobalFontListeners();
    this.listeners.add(listener);

    // If fonts are already loaded, trigger initial listener on next microtask
    if (typeof document !== 'undefined' && 'fonts' in document && document.fonts.status === 'loaded') {
      Promise.resolve().then(() => {
        if (this.listeners.has(listener)) {
          listener();
        }
      });
    }

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Ensures document fonts are loaded and ready for pixel-accurate measurement
   */
  public static async waitForFontsReady(fontFamily?: string, fontSizePx: number = 16): Promise<boolean> {
    if (typeof document === 'undefined' || !('fonts' in document)) {
      return true;
    }

    this.ensureGlobalFontListeners();

    try {
      if (fontFamily) {
        // Explicitly trigger loading for target font family
        await document.fonts.load(`${fontSizePx}px "${fontFamily}"`).catch(() => {});
      }

      await document.fonts.ready;
      return true;
    } catch {
      return true;
    }
  }

  /**
   * Checks if a specific font family and weight is already loaded in browser RAM
   */
  public static isFontLoaded(fontFamily: string, fontSizePx: number = 16): boolean {
    if (typeof document === 'undefined' || !('fonts' in document)) {
      return true;
    }

    try {
      return document.fonts.check(`${fontSizePx}px "${fontFamily}"`);
    } catch {
      return true;
    }
  }
}
