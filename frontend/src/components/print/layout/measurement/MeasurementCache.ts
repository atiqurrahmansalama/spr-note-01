/**
 * MeasurementCache
 * Memory-safe LRU measurement cache for spatial node metrics.
 *
 * Prevents repetitive DOM layout thrashing and Range.getClientRects() calculations
 * for unchanged paragraphs and table rows across keystrokes.
 */

import { NodeMeasurementResult, MeasurementContext } from './measurementTypes';

export class MeasurementCache {
  private static instance: MeasurementCache | null = null;
  private cache = new Map<string, NodeMeasurementResult>();
  private maxEntries = 2500;
  private hitCount = 0;
  private missCount = 0;

  public static getInstance(): MeasurementCache {
    if (!this.instance) {
      this.instance = new MeasurementCache();
    }
    return this.instance;
  }

  /**
   * Estimates complex script vertical metrics (Bengali / Arabic / Urdu)
   */
  public static estimateScriptAdjustment(text: string): { heightMultiplier: number; charWidthMultiplier: number } {
    let bengaliCount = 0;
    let arabicCount = 0;
    const len = text.length;

    for (let i = 0; i < len; i++) {
      const code = text.charCodeAt(i);
      if (code >= 0x0980 && code <= 0x09ff) {
        bengaliCount++;
      } else if (code >= 0x0600 && code <= 0x06ff) {
        arabicCount++;
      }
    }

    if (bengaliCount > len * 0.2) {
      // Bengali conjuncts and matras require slightly taller line box
      return { heightMultiplier: 1.12, charWidthMultiplier: 1.05 };
    }
    if (arabicCount > len * 0.2) {
      // Arabic cursive nastaliq vertical flow
      return { heightMultiplier: 1.15, charWidthMultiplier: 1.08 };
    }

    return { heightMultiplier: 1.0, charWidthMultiplier: 1.0 };
  }

  /**
   * Generates a stable deterministic cache key
   */
  public generateKey(
    nodeId: string,
    content: string,
    context: MeasurementContext
  ): string {
    const width = Math.round(context.containerWidth);
    const density = context.density || 'NORMAL';
    const scale = context.scale || 1;
    const fontSize = context.fontSizePx || 16;
    const lineHeight = context.lineHeight || 1.5;
    const font = context.fontFamily || 'default';
    // Robust fast hash for content
    let hash = 5381;
    const len = content.length;
    const step = len > 200 ? Math.floor(len / 100) : 1;
    for (let i = 0; i < len; i += step) {
      hash = (hash * 33) ^ content.charCodeAt(i);
    }
    return `${nodeId}:${len}:${hash >>> 0}:${width}:${density}:${scale}:${fontSize}:${lineHeight}:${font}`;
  }

  public get(key: string): NodeMeasurementResult | undefined {
    const result = this.cache.get(key);
    if (result) {
      this.hitCount++;
      // LRU refresh
      this.cache.delete(key);
      this.cache.set(key, result);
      return result;
    }
    this.missCount++;
    return undefined;
  }

  public set(key: string, result: NodeMeasurementResult): void {
    if (this.cache.size >= this.maxEntries) {
      // Remove oldest entry
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(key, result);
  }

  public invalidate(nodeId: string): void {
    for (const key of this.cache.keys()) {
      if (key === nodeId || key.startsWith(`${nodeId}:`)) {
        this.cache.delete(key);
      }
    }
  }

  public clear(): void {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }

  public getStats() {
    const total = this.hitCount + this.missCount;
    return {
      size: this.cache.size,
      maxEntries: this.maxEntries,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: total > 0 ? (this.hitCount / total) * 100 : 0,
    };
  }
}
