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
  private maxEntries = 500;
  private hitCount = 0;
  private missCount = 0;

  public static getInstance(): MeasurementCache {
    if (!this.instance) {
      this.instance = new MeasurementCache();
    }
    return this.instance;
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
    // Simple fast DJB2-like hash for content
    let hash = 5381;
    for (let i = 0; i < Math.min(content.length, 120); i++) {
      hash = (hash * 33) ^ content.charCodeAt(i);
    }
    return `${nodeId}:${hash >>> 0}:${width}:${density}:${scale}:${fontSize}:${lineHeight}:${font}`;
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
      if (key.startsWith(`${nodeId}:`)) {
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
    return {
      size: this.cache.size,
      maxEntries: this.maxEntries,
      hitCount: this.hitCount,
      missCount: this.missCount,
    };
  }
}
