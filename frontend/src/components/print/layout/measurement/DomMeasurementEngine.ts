/**
 * DomMeasurementEngine
 * Offscreen measurement sandbox orchestrating real DOM geometry calculations.
 *
 * Provides pixel-accurate bounding rects, margins, paddings, text line boxes,
 * and table structures using the browser's native layout engine.
 */

import { Rect } from '../types/layoutTypes';
import { SourceNodeType } from '../types/documentTypes';
import { DocumentLayoutEngine } from '../DocumentLayoutEngine';
import { TextMeasurement } from './TextMeasurement';
import { TableMeasurement } from './TableMeasurement';
import {
  NodeMeasurementResult,
  MeasurementContext,
  BreakOpportunity,
} from './measurementTypes';

const SANDBOX_CONTAINER_ID = 'spr-doclab-measurement-sandbox';

export class DomMeasurementEngine {
  private static sandboxEl: HTMLDivElement | null = null;
  private static measurementCache = new WeakMap<HTMLElement, NodeMeasurementResult>();

  /**
   * Returns or creates a persistent hidden sandbox in DOM
   */
  public static getOrCreateSandbox(context: MeasurementContext): HTMLDivElement {
    if (typeof document === 'undefined') {
      throw new Error('DomMeasurementEngine requires a browser DOM environment');
    }

    let sandbox = document.getElementById(SANDBOX_CONTAINER_ID) as HTMLDivElement | null;
    if (!sandbox) {
      sandbox = document.createElement('div');
      sandbox.id = SANDBOX_CONTAINER_ID;
      sandbox.setAttribute('aria-hidden', 'true');
      sandbox.style.position = 'fixed';
      sandbox.style.top = '-99999px';
      sandbox.style.left = '-99999px';
      sandbox.style.visibility = 'hidden';
      sandbox.style.pointerEvents = 'none';
      sandbox.style.zIndex = '-9999';
      sandbox.style.overflow = 'hidden';
      document.body.appendChild(sandbox);
    }

    sandbox.style.width = `${Math.max(100, context.containerWidth)}px`;
    sandbox.style.maxWidth = `${Math.max(100, context.containerWidth)}px`;
    sandbox.style.boxSizing = 'border-box';
    sandbox.style.fontFamily = context.fontFamily || 'sans-serif';
    if (context.fontSizePx) {
      sandbox.style.fontSize = `${context.fontSizePx}px`;
    }
    if (context.lineHeight) {
      sandbox.style.lineHeight = String(context.lineHeight);
    }

    this.sandboxEl = sandbox;
    return sandbox;
  }

  /**
   * Measures an already-connected or offscreen HTMLElement
   */
  public static measureElement(
    el: HTMLElement,
    context: MeasurementContext
  ): NodeMeasurementResult {
    if (this.measurementCache.has(el)) {
      const cached = this.measurementCache.get(el)!;
      if (cached.width === el.offsetWidth && cached.height === el.offsetHeight) {
        return cached;
      }
    }

    const tag = el.tagName.toLowerCase();
    const style = window.getComputedStyle(el);

    const marginTop = parseFloat(style.marginTop) || 0;
    const marginBottom = parseFloat(style.marginBottom) || 0;
    const paddingTop = parseFloat(style.paddingTop) || 0;
    const paddingBottom = parseFloat(style.paddingBottom) || 0;

    const elRect = el.getBoundingClientRect();
    const width = Math.max(el.offsetWidth, elRect.width);
    const height = Math.max(el.offsetHeight, elRect.height, 1);
    const totalOuterHeight = height + marginTop + marginBottom;

    const boundingRect: Rect = {
      x: 0,
      y: 0,
      width,
      height,
    };

    const isAtomic =
      tag === 'img' ||
      tag === 'svg' ||
      tag === 'figure' ||
      el.classList.contains('print-image-container') ||
      el.classList.contains('print-signature-block') ||
      DocumentLayoutEngine.isKeepTogether(el);

    const isManualBreak = DocumentLayoutEngine.isManualBreak(el);
    const keepTogether = DocumentLayoutEngine.isKeepTogether(el);
    const keepWithNext = DocumentLayoutEngine.isKeepWithNext(el);

    let type: SourceNodeType = 'paragraph';
    if (/^h[1-6]$/.test(tag)) type = 'heading';
    else if (tag === 'table') type = 'table';
    else if (tag === 'ul' || tag === 'ol') type = 'list';
    else if (isAtomic) type = 'image';
    else if (isManualBreak) type = 'manual-page-break';

    let lines;
    let firstLineHeight = height;
    let lastLineHeight = height;
    let breakOpportunities: BreakOpportunity[] = [];
    let tableGeometry;

    // 1. Specialized measurement for tables
    if (tag === 'table') {
      tableGeometry = TableMeasurement.measureTable(el as HTMLTableElement, context);
      breakOpportunities = TableMeasurement.generateTableBreakOpportunities(tableGeometry);
    }
    // 2. Specialized measurement for multi-line text blocks
    else if (!isAtomic && (type === 'paragraph' || type === 'heading')) {
      const textMetrics = TextMeasurement.measureTextLines(el, context);
      lines = textMetrics.lines;
      firstLineHeight = textMetrics.firstLineHeight;
      lastLineHeight = textMetrics.lastLineHeight;
      breakOpportunities = textMetrics.breakOpportunities;
    }

    const result: NodeMeasurementResult = {
      nodeId: el.id || `node_${Math.random().toString(36).slice(2, 9)}`,
      type,
      width,
      height,
      boundingRect,
      marginTop,
      marginBottom,
      paddingTop,
      paddingBottom,
      totalOuterHeight,
      lines,
      firstLineHeight,
      lastLineHeight,
      breakOpportunities,
      tableGeometry,
      isAtomic,
      isManualBreak,
      keepTogether,
      keepWithNext,
      domElement: el,
    };

    this.measurementCache.set(el, result);
    return result;
  }

  /**
   * Mounts and measures arbitrary raw HTML inside the offscreen sandbox
   */
  public static measureHtmlNodes(
    html: string,
    context: MeasurementContext
  ): NodeMeasurementResult[] {
    if (!html || !html.trim()) return [];

    if (typeof document === 'undefined') {
      return this.measureHtmlNodesSSR(html, context);
    }

    const sandbox = this.getOrCreateSandbox(context);

    // Injected stylesheet
    let styleTag = sandbox.querySelector('style#spr-sandbox-injected-styles') as HTMLStyleElement | null;
    if (context.styles) {
      if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'spr-sandbox-injected-styles';
        sandbox.appendChild(styleTag);
      }
      styleTag.textContent = context.styles.replace(/<\/?style\b[^>]*>/gi, '');
    }

    // Mount content container
    const contentHost = document.createElement('div');
    contentHost.className = 'spr-measurement-content-host docx-parsed-body docx-preview-content';
    contentHost.style.width = '100%';
    contentHost.style.boxSizing = 'border-box';
    contentHost.innerHTML = html.trim();

    sandbox.appendChild(contentHost);

    // Measure each top-level child block
    const childElements = Array.from(contentHost.children) as HTMLElement[];
    const results: NodeMeasurementResult[] = childElements.map((child) =>
      this.measureElement(child, context)
    );

    // Cleanup sandbox host
    sandbox.removeChild(contentHost);

    return results;
  }

  /**
   * Fallback measurement simulation for SSR / Node.js test execution
   */
  private static measureHtmlNodesSSR(
    html: string,
    context: MeasurementContext
  ): NodeMeasurementResult[] {
    const blockRegex = /(<table[\s\S]*?<\/table>|<h[1-6][\s\S]*?<\/h[1-6]>|<p[\s\S]*?<\/p>|<div class="spr-page-break"[\s\S]*?<\/div>|<!--[\s\S]*?-->|<div[\s\S]*?<\/div>|<ul[\s\S]*?<\/ul>|<ol[\s\S]*?<\/ol>|<blockquote[\s\S]*?<\/blockquote>|<section[\s\S]*?<\/section>|<figure[\s\S]*?<\/figure>|<img[\s\S]*?>)/gi;
    const matches = html.match(blockRegex) || [html];

    return matches.map((block, idx) => {
      const isTable = /<table/i.test(block);
      const isHeading = /<h[1-6]/i.test(block);
      const isImg = /<img/i.test(block) || /<figure/i.test(block);
      const isManual = block.includes('data-manual-break="true"') || block.includes('spr-page-break');

      const width = context.containerWidth || 602;
      const fontSize = context.fontSizePx || 16;

      const inlineHeightMatch = block.match(/(?:min-)?height:\s*(\d+)px/i);
      const inlineMbMatch = block.match(/margin-bottom:\s*(\d+)px/i);
      const customHeight = inlineHeightMatch ? parseInt(inlineHeightMatch[1], 10) : undefined;
      const customMb = inlineMbMatch ? parseInt(inlineMbMatch[1], 10) : undefined;

      if (isManual) {
        return {
          nodeId: `ssr_node_${idx}`,
          type: 'manual-page-break' as SourceNodeType,
          width,
          height: 1,
          boundingRect: { x: 0, y: 0, width, height: 1 },
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

      if (isTable) {
        const rowCount = (block.match(/<tr/gi) || []).length || 5;
        const rowHeight = 36;
        const height = customHeight !== undefined ? customHeight : rowCount * rowHeight;
        const marginBottom = customMb !== undefined ? customMb : 8;
        return {
          nodeId: `ssr_table_${idx}`,
          type: 'table' as SourceNodeType,
          width,
          height,
          boundingRect: { x: 0, y: 0, width, height },
          marginTop: 8,
          marginBottom,
          paddingTop: 0,
          paddingBottom: 0,
          totalOuterHeight: height + 8 + marginBottom,
          breakOpportunities: [],
          isAtomic: false,
          isManualBreak: false,
          keepTogether: false,
          keepWithNext: false,
        };
      }

      if (isHeading) {
        const height = customHeight !== undefined ? customHeight : 40;
        const marginBottom = customMb !== undefined ? customMb : 8;
        return {
          nodeId: `ssr_heading_${idx}`,
          type: 'heading' as SourceNodeType,
          width,
          height,
          boundingRect: { x: 0, y: 0, width, height },
          marginTop: 12,
          marginBottom,
          paddingTop: 0,
          paddingBottom: 0,
          totalOuterHeight: height + 12 + marginBottom,
          breakOpportunities: [],
          isAtomic: false,
          isManualBreak: false,
          keepTogether: false,
          keepWithNext: true,
        };
      }

      if (isImg) {
        const height = customHeight !== undefined ? customHeight : 220;
        const marginBottom = customMb !== undefined ? customMb : 8;
        return {
          nodeId: `ssr_img_${idx}`,
          type: 'image' as SourceNodeType,
          width,
          height,
          boundingRect: { x: 0, y: 0, width, height },
          marginTop: 8,
          marginBottom,
          paddingTop: 0,
          paddingBottom: 0,
          totalOuterHeight: height + 8 + marginBottom,
          breakOpportunities: [],
          isAtomic: true,
          isManualBreak: false,
          keepTogether: true,
          keepWithNext: false,
        };
      }

      // Paragraph / Div / Blockquote
      const text = block.replace(/<[^>]+>/g, '').trim();
      const avgCharWidth = fontSize * 0.55;
      const charsPerLine = Math.max(20, Math.floor(width / avgCharWidth));
      const lineCount = Math.max(1, Math.ceil(text.length / charsPerLine));
      const lineHeight = fontSize * (context.lineHeight ? Number(context.lineHeight) : 1.5);
      const computedHeight = Math.max(lineHeight, lineCount * lineHeight);
      const height = customHeight !== undefined ? customHeight : computedHeight;
      const marginBottom = customMb !== undefined ? customMb : 6;

      return {
        nodeId: `ssr_p_${idx}`,
        type: 'paragraph' as SourceNodeType,
        width,
        height,
        boundingRect: { x: 0, y: 0, width, height },
        marginTop: 6,
        marginBottom,
        paddingTop: 0,
        paddingBottom: 0,
        totalOuterHeight: height + 6 + marginBottom,
        breakOpportunities: [],
        isAtomic: false,
        isManualBreak: false,
        keepTogether: false,
        keepWithNext: false,
      };
    });
  }
}
