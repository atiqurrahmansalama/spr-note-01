/**
 * FragmentCache
 * Two-tier memory-safe LRU cache for computed LayoutFragments.
 *
 * Prevents redundant re-slicing and text line fragmentations for static
 * blocks across incremental reflow passes.
 */

import { LayoutFragment } from '../types/fragmentTypes';
import { SourceNode } from '../types/documentTypes';
import { BlockNode } from '../../model/types';

export interface FragmentCacheEntry {
  fitsCurrentPage: boolean;
  pushedToNextPage: boolean;
  firstFragment?: LayoutFragment;
  remainingNode?: HTMLElement | SourceNode | null;
  firstBlockNode?: BlockNode;
  remainingBlockNode?: BlockNode | null;
  usedHeight: number;
  cachedAt?: number;
}

export class FragmentCache {
  private static instance: FragmentCache | null = null;
  private cache = new Map<string, FragmentCacheEntry>();
  private maxEntries = 2000;
  private hitCount = 0;
  private missCount = 0;

  public static getInstance(): FragmentCache {
    if (!this.instance) {
      this.instance = new FragmentCache();
    }
    return this.instance;
  }

  /**
   * Generates a deterministic cache key for a fragment slice operation
   */
  public generateKey(
    nodeId: string,
    content: string,
    availableHeight: number,
    containerWidth: number,
    density: string = 'NORMAL'
  ): string {
    const w = Math.round(containerWidth);
    const h = Math.round(availableHeight);
    const len = content.length;
    let hash = 5381;
    const step = len > 150 ? Math.floor(len / 80) : 1;
    for (let i = 0; i < len; i += step) {
      hash = (hash * 33) ^ content.charCodeAt(i);
    }
    return `${nodeId}:${hash >>> 0}:${len}:${w}:${h}:${density}`;
  }

  public get(key: string): FragmentCacheEntry | undefined {
    const entry = this.cache.get(key);
    if (entry) {
      this.hitCount++;
      // Refresh LRU position
      this.cache.delete(key);
      this.cache.set(key, entry);
      return entry;
    }
    this.missCount++;
    return undefined;
  }

  public set(key: string, entry: Omit<FragmentCacheEntry, 'cachedAt'>): void {
    if (this.cache.size >= this.maxEntries) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(key, { ...entry, cachedAt: Date.now() });
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
    return {
      size: this.cache.size,
      maxEntries: this.maxEntries,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: this.hitCount + this.missCount > 0 ? (this.hitCount / (this.hitCount + this.missCount)) * 100 : 0,
    };
  }
}
