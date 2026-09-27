/**
 * MeasurementEngine
 * Unified high-level measurement facade for DocLab Layout Architecture.
 *
 * Core Concept:
 * measure(node, context) -> NodeMeasurementResult
 */

import { SourceNode } from '../types/documentTypes';
import { DomMeasurementEngine } from './DomMeasurementEngine';
import { MeasurementCache } from './MeasurementCache';
import {
  NodeMeasurementResult,
  MeasurementContext,
} from './measurementTypes';

const ELEMENT_NODE_TYPE = typeof Node !== 'undefined' ? Node.ELEMENT_NODE : 1;

export class MeasurementEngine {
  /**
   * Primary entrypoint: measures any DOM element, SourceNode, or HTML snippet with optional caching
   */
  public static measure(
    target: HTMLElement | SourceNode | string,
    context: MeasurementContext,
    useCache: boolean = true
  ): NodeMeasurementResult {
    const cache = MeasurementCache.getInstance();

    // 1. Direct HTMLElement input
    if (typeof target === 'object' && target !== null && 'nodeType' in target && (target as any).nodeType === ELEMENT_NODE_TYPE) {
      return DomMeasurementEngine.measureElement(target as HTMLElement, context);
    }

    // 2. Raw HTML string
    if (typeof target === 'string') {
      const cacheKey = useCache ? cache.generateKey('str', target, context) : null;
      if (cacheKey) {
        const cached = cache.get(cacheKey);
        if (cached) return cached;
      }

      const results = DomMeasurementEngine.measureHtmlNodes(target, context);
      const measured = results.length > 0 ? results[0] : this.createFallbackMeasurement('string_node', 'paragraph', context);
      if (cacheKey) cache.set(cacheKey, measured);
      return measured;
    }

    // 3. SourceNode object
    const src = target as SourceNode;
    const content = src.rawHtml || src.textContent || '';
    const cacheKey = useCache ? cache.generateKey(src.id || 'node', content, context) : null;
    if (cacheKey) {
      const cached = cache.get(cacheKey);
      if (cached) return cached;
    }

    if (src.rawHtml) {
      const results = DomMeasurementEngine.measureHtmlNodes(src.rawHtml, context);
      if (results.length > 0) {
        const measured = {
          ...results[0],
          nodeId: src.id || results[0].nodeId,
          type: src.type || results[0].type,
        };
        if (cacheKey) cache.set(cacheKey, measured);
        return measured;
      }
    }

    const fallback = this.createFallbackMeasurement(src.id || 'fallback_node', src.type || 'paragraph', context);
    if (cacheKey) cache.set(cacheKey, fallback);
    return fallback;
  }

  /**
   * Measures a batch of nodes in a single layout pass to prevent layout thrashing
   */
  public static measureBatch(
    nodes: Array<HTMLElement | SourceNode | string>,
    context: MeasurementContext
  ): NodeMeasurementResult[] {
    return nodes.map((node) => this.measure(node, context));
  }

  /**
   * Measures a continuous HTML string containing multiple top-level blocks
   */
  public static measureHtml(
    html: string,
    context: MeasurementContext
  ): NodeMeasurementResult[] {
    return DomMeasurementEngine.measureHtmlNodes(html, context);
  }

  /**
   * Fallback measurement for SSR or disconnected nodes
   */
  private static createFallbackMeasurement(
    nodeId: string,
    type: any,
    context: MeasurementContext
  ): NodeMeasurementResult {
    const width = context.containerWidth || 700;
    const height = type === 'table' ? 120 : type === 'heading' ? 44 : 32;

    return {
      nodeId,
      type: type || 'paragraph',
      width,
      height,
      boundingRect: { x: 0, y: 0, width, height },
      marginTop: 8,
      marginBottom: 8,
      paddingTop: 0,
      paddingBottom: 0,
      totalOuterHeight: height + 16,
      firstLineHeight: height,
      lastLineHeight: height,
      breakOpportunities: [],
      isAtomic: type === 'image' || type === 'signature',
      isManualBreak: type === 'manual-page-break',
      keepTogether: type === 'image' || type === 'signature',
      keepWithNext: type === 'heading',
    };
  }
}
