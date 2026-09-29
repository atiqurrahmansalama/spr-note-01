import { SourceNode } from '../types/documentTypes';
import { CanonicalDocument, BlockNode } from '../../model/types';
import { HtmlExporter } from '../../model/serialization/htmlExporter';
import { DomMeasurementEngine } from './DomMeasurementEngine';
import { MeasurementCache } from './MeasurementCache';
import {
  NodeMeasurementResult,
  MeasurementContext,
} from './measurementTypes';

const ELEMENT_NODE_TYPE = typeof Node !== 'undefined' ? Node.ELEMENT_NODE : 1;

export class MeasurementEngine {
  /**
   * Primary entrypoint: measures any DOM element, BlockNode, SourceNode, or HTML snippet with optional caching
   */
  public static measure(
    target: HTMLElement | BlockNode | SourceNode | string,
    context: MeasurementContext,
    useCache: boolean = true
  ): NodeMeasurementResult {
    const cache = MeasurementCache.getInstance();

    // 1. Direct HTMLElement input
    if (typeof target === 'object' && target !== null && 'nodeType' in target && target.nodeType === ELEMENT_NODE_TYPE) {
      return DomMeasurementEngine.measureElement(target as HTMLElement, context);
    }

    // 2. Canonical Model BlockNode input
    if (typeof target === 'object' && target !== null && 'type' in target && !('rawHtml' in target) && !('nodeType' in target)) {
      const block = target as BlockNode;
      if (block.type === 'manual-page-break') {
        return {
          nodeId: block.id,
          type: 'manual-page-break',
          width: context.containerWidth || 700,
          height: 1,
          boundingRect: { x: 0, y: 0, width: context.containerWidth || 700, height: 1 },
          marginTop: 0,
          marginBottom: 0,
          paddingTop: 0,
          paddingBottom: 0,
          totalOuterHeight: 1,
          breakOpportunities: [],
          isAtomic: false,
          isManualBreak: true,
          keepTogether: false,
          keepWithNext: false,
        };
      }

      // Serialize canonical block (table, paragraph, heading, list, image, svg, signature) to HTML
      const html = HtmlExporter.serializeBlock(block, { tokenFormat: 'mustache' });
      const cacheKey = useCache ? cache.generateKey(block.id, html, context) : null;
      if (cacheKey) {
        const cached = cache.get(cacheKey);
        if (cached) return cached;
      }

      const results = DomMeasurementEngine.measureHtmlNodes(html, context);
      const measured = results.length > 0
        ? {
            ...results[0],
            nodeId: block.id,
            type: block.type as any,
            isAtomic: block.type === 'image' || block.type === 'svg' || block.type === 'signature',
            isManualBreak: false,
            keepTogether: block.type === 'image' || block.type === 'svg' || block.type === 'signature',
            keepWithNext: block.type === 'heading',
          }
        : this.createFallbackMeasurement(block.id, block.type, context);

      if (cacheKey) cache.set(cacheKey, measured);
      return measured;
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
    nodes: Array<HTMLElement | BlockNode | SourceNode | string>,
    context: MeasurementContext,
    useCache: boolean = true
  ): NodeMeasurementResult[] {
    return nodes.map((node) => this.measure(node, context, useCache));
  }

  /**
   * Measures an entire CanonicalDocument AST in an optimized layout pass
   */
  public static measureDocument(
    doc: CanonicalDocument,
    context: MeasurementContext,
    useCache: boolean = true
  ): NodeMeasurementResult[] {
    if (!doc || !doc.body) return [];
    return this.measureBatch(doc.body, context, useCache);
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
      isAtomic: type === 'image' || type === 'svg' || type === 'signature',
      isManualBreak: type === 'manual-page-break',
      keepTogether: type === 'image' || type === 'svg' || type === 'signature',
      keepWithNext: type === 'heading',
    };
  }
}
