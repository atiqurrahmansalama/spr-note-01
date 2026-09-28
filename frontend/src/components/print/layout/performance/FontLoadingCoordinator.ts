/**
 * FontLoadingCoordinator
 * Synchronizes web font readiness with spatial measurement engines.
 *
 * Prevents FOUT (Flash of Unstyled Text) and erroneous text-line measurements
 * by ensuring required document fonts (Inter, Nirmala UI, Noto Sans Bengali, Kalpurush, Amiri)
 * are fully loaded before computing subpixel bounding boxes.
 */

export class FontLoadingCoordinator {
  private static readyPromise: Promise<boolean> | null = null;

  /**
   * Ensures document fonts are loaded and ready for pixel-accurate measurement
   */
  public static async waitForFontsReady(): Promise<boolean> {
    if (typeof document === 'undefined' || !('fonts' in document)) {
      return true;
    }

    if (!this.readyPromise) {
      this.readyPromise = document.fonts.ready
        .then(() => true)
        .catch(() => true);
    }

    return this.readyPromise;
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
